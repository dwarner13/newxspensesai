/**
 * Attachments E8 — per-user chat-document upload quota (SERVER-ONLY).
 *
 * Limits are resolved per user (today: configuration defaults; later: subscription entitlements,
 * by swapping resolveChatDocumentLimits without touching the upload pipeline) and enforced
 * atomically by the database function claim_chat_document_upload
 * (sql/migrations/20261124_chat_document_upload_quota.sql), called with the service role and the
 * VERIFIED user id only.
 *
 * Fail closed: if the function is missing (migration not applied) or errors, no chat document is
 * created. Logs carry status only.
 */

export const DEFAULT_CHAT_DOCUMENT_HOURLY_LIMIT = 10;
export const DEFAULT_CHAT_DOCUMENT_DAILY_LIMIT = 30;

export type ChatDocumentLimits = { hourly: number; daily: number };

export type QuotaDecision =
  | { allowed: true }
  | { allowed: false; scope: 'hourly' | 'daily'; retryAfterSeconds: number }
  | { allowed: false; unavailable: true };

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase service-role client (rpc)
type RpcClient = { rpc: (fn: string, args: Record<string, unknown>) => any };

function intFrom(raw: string | undefined, fallback: number): number {
  const n = Number(raw);
  return Number.isInteger(n) && n >= 0 && n <= 10_000 ? n : fallback;
}

/**
 * Limits for this user. Async on purpose: subscription entitlements can be looked up here later.
 */
export async function resolveChatDocumentLimits(
  _userId: string,
  env: Record<string, string | undefined> = process.env,
): Promise<ChatDocumentLimits> {
  return {
    hourly: intFrom(env.CHAT_DOCUMENT_HOURLY_LIMIT, DEFAULT_CHAT_DOCUMENT_HOURLY_LIMIT),
    daily: intFrom(env.CHAT_DOCUMENT_DAILY_LIMIT, DEFAULT_CHAT_DOCUMENT_DAILY_LIMIT),
  };
}

export async function claimChatDocumentUpload(sb: RpcClient, userId: string, limits: ChatDocumentLimits): Promise<QuotaDecision> {
  if (!userId) return { allowed: false, unavailable: true };
  try {
    const { data, error } = await sb.rpc('claim_chat_document_upload', {
      p_user_id: userId,
      p_hourly_limit: limits.hourly,
      p_daily_limit: limits.daily,
    });
    if (error || !data || typeof data !== 'object') return { allowed: false, unavailable: true };
    const d = data as { allowed?: unknown; scope?: unknown; retry_after_seconds?: unknown };
    if (d.allowed === true) return { allowed: true };
    if (d.allowed === false && (d.scope === 'hourly' || d.scope === 'daily')) {
      const s = Number(d.retry_after_seconds);
      return { allowed: false, scope: d.scope, retryAfterSeconds: Number.isFinite(s) && s > 0 ? Math.ceil(s) : 60 };
    }
    return { allowed: false, unavailable: true };
  } catch {
    return { allowed: false, unavailable: true };
  }
}
