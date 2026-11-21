import { getSupabase } from '@/lib/supabase';

type PrimeSummaryPayload = {
  importId?: string;
  importIds?: string[];
  docId?: string;
  userId?: string;
  limit?: number;
};

type PrimeSummaryResult = {
  ok: boolean;
  summary: string;
  state?: string | null;
  payload: any;
};

type CacheEntry = {
  expiresAt: number;
  result: PrimeSummaryResult;
};

const inFlight = new Map<string, Promise<PrimeSummaryResult>>();
const shortCache = new Map<string, CacheEntry>();
const SHORT_CACHE_TTL_MS = 3500;

function normalizePayload(payload: PrimeSummaryPayload): PrimeSummaryPayload {
  const importId = String(payload.importId || '').trim();
  const importIds = Array.isArray(payload.importIds)
    ? payload.importIds.map((v) => String(v || '').trim()).filter(Boolean).sort()
    : undefined;
  const docId = String(payload.docId || '').trim();
  const userId = String(payload.userId || '').trim();
  const limit = Number(payload.limit);
  return {
    ...(importId ? { importId } : {}),
    ...(importIds && importIds.length > 0 ? { importIds } : {}),
    ...(docId ? { docId } : {}),
    ...(userId ? { userId } : {}),
    ...(Number.isFinite(limit) ? { limit } : {}),
  };
}

/**
 * prime-summary requires a Supabase JWT. Use the caller's Authorization header when given,
 * otherwise attach the current session's access token.
 */
async function resolveAuthHeaders(provided?: Record<string, string>): Promise<Record<string, string>> {
  const headers = { ...(provided || {}) };
  const hasAuth = Object.keys(headers).some((k) => k.toLowerCase() === 'authorization');
  if (hasAuth) return headers;
  try {
    const { data } = (await getSupabase()?.auth.getSession()) ?? { data: null };
    const token = data?.session?.access_token;
    if (token) headers.Authorization = `Bearer ${token}`;
  } catch {
    // No session available; the server will answer 401.
  }
  return headers;
}

function buildRequestKey(payload: PrimeSummaryPayload): string {
  const normalized = normalizePayload(payload);
  return JSON.stringify(normalized);
}

export async function fetchPrimeSummarySingleFlight(
  payload: PrimeSummaryPayload,
  options?: { headers?: Record<string, string> }
): Promise<PrimeSummaryResult> {
  const normalizedPayload = normalizePayload(payload);
  const key = buildRequestKey(normalizedPayload);
  const now = Date.now();
  const cached = shortCache.get(key);
  if (cached && cached.expiresAt > now) {
    return cached.result;
  }
  if (cached) shortCache.delete(key);

  const existing = inFlight.get(key);
  if (existing) {
    return existing;
  }

  const request = (async (): Promise<PrimeSummaryResult> => {
    try {
      const authHeaders = await resolveAuthHeaders(options?.headers);
      const response = await fetch('/.netlify/functions/prime-summary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        body: JSON.stringify(normalizedPayload),
      });
      const payloadJson = await response.json().catch(() => ({} as any));
      const result: PrimeSummaryResult = {
        ok: response.ok && Boolean(payloadJson?.ok ?? true),
        summary: String(payloadJson?.summary || '').trim(),
        state: String(payloadJson?.state || '').trim() || null,
        payload: payloadJson,
      };
      shortCache.set(key, {
        expiresAt: Date.now() + SHORT_CACHE_TTL_MS,
        result,
      });
      return result;
    } catch {
      return { ok: false, summary: '', state: null, payload: {} };
    } finally {
      inFlight.delete(key);
    }
  })();

  inFlight.set(key, request);
  return request;
}
