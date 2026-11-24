/**
 * chat-attachments-status — Attachments Phase C3.
 *
 * POST { documentIds: string[] } (≤ 50) with the user's Supabase JWT.
 * Returns the CURRENT status of each attachment for the verified owner, used when a conversation
 * is reopened so chips show live state (never a stale snapshot):
 *   { ok: true, items: [{ document_id, status: 'processing'|'ready'|'unreadable'|'removed', pages }] }
 * Documents that are missing, purged, not chat documents, or belong to someone else are all
 * reported as 'removed' (no existence leak). No names or text are returned.
 */
import type { Handler } from '@netlify/functions';
import { admin } from './_shared/supabase.js';
import { authenticateUser } from './_shared/internalJobAuth.js';
import { resolveAttachmentStatuses } from './_shared/chatAttachments.js';

const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' };
const reply = (statusCode: number, body: unknown) => ({ statusCode, headers, body: JSON.stringify(body) });

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') return reply(405, { ok: false, error: 'Method not allowed' });

  // Identity only from the verified Supabase JWT (S0 pattern); every lookup is filtered by it.
  const authn = await authenticateUser(event);
  if (!authn.ok) return reply(401, { ok: false, error: 'Unauthorized' });
  const userId = authn.principal.userId;

  let body: { documentIds?: unknown } = {};
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return reply(400, { ok: false, error: 'Invalid JSON' });
  }
  if (!Array.isArray(body.documentIds) || body.documentIds.length === 0 || body.documentIds.length > 50) {
    return reply(400, { ok: false, error: 'documentIds must be a non-empty array (max 50)' });
  }

  try {
    const items = await resolveAttachmentStatuses(admin(), userId, body.documentIds);
    return reply(200, { ok: true, items });
  } catch {
    console.error('[chat-attachments-status] lookup failed');
    return reply(503, { ok: false, retryable: true, error: 'Status temporarily unavailable' });
  }
};
