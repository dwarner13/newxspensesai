/**
 * OCR / CSV → normalize-transactions handoff (P0-C1b) — SERVER-ONLY.
 *
 * Re-checks ownership for the calling job's principal, issues a fresh `normalize.run` job token
 * bound to the same user + document, and posts to this deploy's normalize-transactions.
 *
 * - The request body never carries a userId: identity is the signed token only.
 * - Destination comes from buildInternalFunctionUrl (same deploy; fails closed).
 * - Nothing here approves or commits transactions. Normalization only stages rows; committing
 *   remains a user-authenticated action (smart-import-sync today, explicit approval in C3).
 * - Never logs the token or document text.
 */

import { issueJobToken, jobTokenHeaders, verifyOwnership, type JobPrincipal, type OwnershipClient } from './internalJobAuth.js';
import { buildInternalFunctionUrl } from './internalBaseUrl.js';

export type NormalizeHandoffPayload = {
  ocrText?: string;
  ocrTextHash?: string | null;
  ocrTextLength?: number;
  importRunId?: string;
};

export type NormalizeHandoffResult =
  | { ok: true; dispatched: Promise<Response> }
  | { ok: false; code: 'not_owned' | 'binding' | 'unauthenticated' | 'lookup_failed' | 'not_configured' };

/**
 * Authorise and dispatch. Ownership check and token issuance are awaited; the HTTP request is
 * returned as `dispatched` so callers choose whether to await it (background OCR) or fire and
 * forget (CSV parser, which has a short timeout).
 */
export async function dispatchNormalize(
  sb: OwnershipClient,
  principal: JobPrincipal,
  documentId: string,
  payload: NormalizeHandoffPayload,
  opts: { src: string; traceId?: string; env?: Record<string, string | undefined> }
): Promise<NormalizeHandoffResult> {
  const owned = await verifyOwnership(sb, principal, { documentId });
  if (!owned.ok) {
    return { ok: false, code: owned.code === 'lookup_failed' ? 'lookup_failed' : owned.code === 'binding' ? 'binding' : owned.code === 'unauthenticated' ? 'unauthenticated' : 'not_owned' };
  }

  let url: string;
  let token: string;
  try {
    token = issueJobToken(owned.proof, { scope: 'normalize.run', src: opts.src, env: opts.env });
    url = buildInternalFunctionUrl('normalize-transactions', opts.env);
  } catch {
    console.warn('[normalize-handoff] unavailable', { code: 'not_configured', src: opts.src });
    return { ok: false, code: 'not_configured' };
  }

  const dispatched = fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...jobTokenHeaders(token),
      ...(opts.traceId ? { 'x-trace-id': String(opts.traceId) } : {}),
    },
    body: JSON.stringify({
      documentId,
      ...(typeof payload.ocrText === 'string' ? { ocrText: payload.ocrText } : {}),
      ...(payload.ocrTextHash !== undefined ? { ocrTextHash: payload.ocrTextHash } : {}),
      ...(payload.ocrTextLength !== undefined ? { ocrTextLength: payload.ocrTextLength } : {}),
      ...(payload.importRunId ? { importRunId: payload.importRunId } : {}),
    }),
  });
  return { ok: true, dispatched };
}
