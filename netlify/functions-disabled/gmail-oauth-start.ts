import type { Handler } from "@netlify/functions";

const CLIENT_ID = process.env.GMAIL_CLIENT_ID!;
const REDIRECT_URI = process.env.GMAIL_REDIRECT_URI!;
const SCOPES =
  process.env.GMAIL_SCOPES ||
  "https://www.googleapis.com/auth/gmail.readonly";

function b64url(input: string) {
  return Buffer.from(input).toString("base64url");
}

export const handler: Handler = async (event) => {
  try {
    const url = new URL(event.rawUrl);
    const userId = url.searchParams.get("userId");
    if (!userId) {
      return {
        statusCode: 400,
        body: "Missing userId. Call /gmail-oauth-start?userId=<uuid>",
      };
    }

    // Minimal CSRF state (userId + random)
    const state = b64url(
      JSON.stringify({ userId, nonce: Math.random().toString(36).slice(2) })
    );

    const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    authUrl.searchParams.set("client_id", CLIENT_ID);
    authUrl.searchParams.set("redirect_uri", REDIRECT_URI);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("scope", SCOPES);
    authUrl.searchParams.set("access_type", "offline");
    authUrl.searchParams.set("include_granted_scopes", "true");
    authUrl.searchParams.set("prompt", "consent"); // ensures we get refresh_token
    authUrl.searchParams.set("state", state);

    return {
      statusCode: 302,
      headers: { Location: authUrl.toString() },
      body: "",
    };
  } catch (err: any) {
    return { statusCode: 500, body: err?.message || "oauth-start error" };
  }
};


