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
      const response = await fetch('/.netlify/functions/prime-summary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(options?.headers || {}),
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
