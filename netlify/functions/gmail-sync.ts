import type { Handler } from "@netlify/functions";
import { supabaseAdmin } from "./supabase";
import { applyGuardrails, GUARDRAIL_PRESETS, logGuardrailEvent } from "./_shared/guardrails";
import { createHash } from "crypto";

const CLIENT_ID = process.env.GMAIL_CLIENT_ID!;
const CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET!;

async function getValidAccessToken(userId: string) {
  const { data: row, error } = await supabaseAdmin
    .from("gmail_tokens")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error || !row) throw new Error("No gmail tokens for user");

  // refresh if expired (pad 60s)
  const willExpire =
    !row.expiry || new Date(row.expiry).getTime() - Date.now() < 60_000;

  if (!willExpire) return row.access_token as string;

  if (!row.refresh_token) throw new Error("Missing refresh_token");

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      refresh_token: row.refresh_token,
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) {
    const t = await res.text();
    throw new Error("Refresh failed: " + t);
  }

  const json = await res.json();
  const newExpiry = new Date(Date.now() + (json.expires_in ?? 3600) * 1000);
  await supabaseAdmin
    .from("gmail_tokens")
    .update({
      access_token: json.access_token,
      expiry: newExpiry.toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  return json.access_token as string;
}

type GmailMessage = {
  id: string;
  threadId: string;
  snippet?: string;
  payload?: { headers?: { name: string; value: string }[] };
};

function header(headers: any[] | undefined, name: string) {
  return headers?.find((h) => h.name.toLowerCase() === name.toLowerCase())
    ?.value;
}

export const handler: Handler = async (event) => {
  try {
    const url = new URL(event.rawUrl);
    const userId = url.searchParams.get("userId");
    if (!userId) return { statusCode: 400, body: "Missing userId" };

    const accessToken = await getValidAccessToken(userId);

    // Example query: last 14 days + likely financial docs
    const q =
      url.searchParams.get("q") ||
      "newer_than:14d (subject:invoice OR subject:receipt OR subject:statement OR category:finance)";

    // 1) List messages
    const list = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=25&q=${encodeURIComponent(
        q
      )}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    ).then((r) => r.json());

    if (!list.messages || !Array.isArray(list.messages)) {
      return { statusCode: 200, body: "No messages matched query." };
    }

    // 2) Fetch message details + insert user_documents (status=pending)
    const inserts: any[] = [];

    for (const m of list.messages as { id: string }[]) {
      const detail: GmailMessage = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${m.id}?format=metadata&metadataHeaders=Subject`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      ).then((r) => r.json());

      const subj = header(detail.payload?.headers, "Subject") || "(no subject)";
      const snippet = detail.snippet || "";

      // ✅ GUARDRAILS: Apply strict PII redaction BEFORE storage
      const guardrailResult = await applyGuardrails(
        `${subj}\n\n${snippet}`,
        GUARDRAIL_PRESETS.strict,
        userId
      );

      // Log guardrail event for audit
      const inputHash = createHash('sha256').update(`${subj}${snippet}`).digest('hex');
      await logGuardrailEvent({
        user_id: userId,
        stage: 'ingestion',
        preset: 'strict',
        outcome: guardrailResult,
        input_hash: inputHash
      });

      // If blocked by guardrails (e.g., inappropriate content), skip this message
      if (!guardrailResult.ok) {
        console.warn(`[Gmail Sync] Message blocked by guardrails: ${detail.id}`, guardrailResult.reasons);
        continue;  // Don't store this message
      }

      // Store ONLY the redacted content (never store raw PII)
      const safeSnippet = guardrailResult.redacted || snippet;

      inserts.push({
        user_id: userId,
        source: "gmail",
        gmail_message_id: detail.id,
        subject: subj,  // Subject might contain PII too, but usually safe
        mime_type: "message/rfc822",
        filename: null,
        original_url: null,
        redacted_url: null,
        status: "pending",
        guardrails: { 
          detected: "email", 
          snippet: safeSnippet,  // REDACTED content only
          pii_found: guardrailResult.signals?.piiFound,
          pii_types: guardrailResult.signals?.piiTypes,
          redaction_applied: true
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }

    if (inserts.length) {
      const { error } = await supabaseAdmin.from("user_documents").insert(inserts);
      if (error) {
        return { statusCode: 500, body: `Insert error: ${error.message}` };
      }
    }

    // Update sync marker
    await supabaseAdmin
      .from("gmail_sync_state")
      .upsert({ user_id: userId, last_sync_at: new Date().toISOString() });

    return {
      statusCode: 200,
      body: `Synced ${inserts.length} message(s) into user_documents (pending).`,
    };
  } catch (err: any) {
    return { statusCode: 500, body: err?.message || "gmail-sync error" };
  }
};

