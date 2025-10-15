import type { Handler } from "@netlify/functions";
import { supabaseAdmin } from "./supabase";

const CLIENT_ID = process.env.GMAIL_CLIENT_ID!;
const CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET!;
const REDIRECT_URI = process.env.GMAIL_REDIRECT_URI!;

type StatePayload = { userId: string; nonce: string };

export const handler: Handler = async (event) => {
  try {
    const url = new URL(event.rawUrl);
    const code = url.searchParams.get("code");
    const stateRaw = url.searchParams.get("state");

    if (!code || !stateRaw) {
      return { statusCode: 400, body: "Missing code/state" };
    }

    let state: StatePayload;
    try {
      state = JSON.parse(Buffer.from(stateRaw, "base64url").toString());
    } catch {
      return { statusCode: 400, body: "Bad state" };
    }

    // Exchange code for tokens
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenRes.ok) {
      const txt = await tokenRes.text();
      return { statusCode: 502, body: `Token exchange failed: ${txt}` };
    }

    const tokens = await tokenRes.json();
    // tokens: { access_token, expires_in, refresh_token?, scope, token_type }

    const expiry = new Date(Date.now() + (tokens.expires_in ?? 3600) * 1000);

    // Upsert into gmail_tokens
    const { error } = await supabaseAdmin
      .from("gmail_tokens")
      .upsert(
        {
          user_id: state.userId,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token || null,
          scope: tokens.scope,
          token_type: tokens.token_type,
          expiry: expiry.toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );

    if (error) {
      return { statusCode: 500, body: `DB upsert error: ${error.message}` };
    }

    // Initialize sync state if needed
    await supabaseAdmin
      .from("gmail_sync_state")
      .upsert({ user_id: state.userId, last_sync_at: new Date().toISOString() });

    // Redirect back to your app dashboard
    const baseUrl = process.env.URL || 'http://localhost:5173';
    return {
      statusCode: 302,
      headers: { Location: `${baseUrl}/dashboard?connected=gmail` },
      body: "",
    };
  } catch (err: any) {
    return { statusCode: 500, body: err?.message || "oauth-callback error" };
  }
};
