import type { Handler } from '@netlify/functions';
import { admin } from './_shared/supabase.js';
import { verifyAuth } from './_shared/verifyAuth.js';
import { claimedUserIdMatches, JOB_TOKEN_HEADER } from './_shared/internalJobAuth.js';

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function normalizeImportIds(body: any): string[] {
  const ids: string[] = [];
  const single = String(body?.importId || body?.import_id || '').trim();
  if (single) ids.push(single);
  if (Array.isArray(body?.importIds)) {
    for (const id of body.importIds) {
      const normalized = String(id || '').trim();
      if (normalized) ids.push(normalized);
    }
  }
  return Array.from(new Set(ids));
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ ok: false, error: 'Method not allowed. Use POST.' }) };
  }

  try {
    // Approval gates commits, so like commit-import it never accepts an internal job token.
    const hasJobToken = Object.entries(event.headers || {}).some(
      ([k, v]) => k.toLowerCase() === JOB_TOKEN_HEADER && Boolean(v)
    );
    if (hasJobToken) {
      return { statusCode: 401, headers, body: JSON.stringify({ ok: false, error: 'Unauthorized' }) };
    }
    const auth = await verifyAuth(event);
    if (auth.error || !auth.userId) {
      // P0-C2b: generic message; never echo the token verifier's error text.
      return { statusCode: 401, headers, body: JSON.stringify({ ok: false, error: 'Unauthorized' }) };
    }
    const userId = String(auth.userId);
    const body = JSON.parse(event.body || '{}');
    const claimedHeaderUserId = event.headers?.['x-user-id'] || event.headers?.['X-User-Id'];
    if (!claimedUserIdMatches(claimedHeaderUserId, userId) || !claimedUserIdMatches(body?.userId, userId)) {
      console.warn('[APPROVAL] stage=auth_denied', { code: 'identity_mismatch' });
      return { statusCode: 403, headers, body: JSON.stringify({ ok: false, error: 'Forbidden' }) };
    }
    const importIds = normalizeImportIds(body);
    if (importIds.length === 0) {
      return { statusCode: 400, headers, body: JSON.stringify({ ok: false, error: 'Missing importId/importIds' }) };
    }

    const sb = admin();
    const approvedImportIds: string[] = [];
    const skipped: Array<{ importId: string; reason: string }> = [];

    for (const importId of importIds) {
      const { data: importRow, error: importError } = await sb
        .from('imports')
        .select('id, status, approved_at')
        .eq('id', importId)
        .eq('user_id', userId)
        .maybeSingle();

      if (importError || !importRow) {
        // No database error text in responses.
        skipped.push({ importId, reason: importError ? 'lookup_failed' : 'not_found_or_not_owned' });
        continue;
      }

      // Only parsed imports are approvable.
      if (String(importRow.status || '') !== 'parsed') {
        skipped.push({ importId, reason: `status_${importRow.status}` });
        continue;
      }

      if (importRow.approved_at) {
        approvedImportIds.push(importId);
        continue;
      }

      const now = new Date().toISOString();
      const { error: updateError } = await sb
        .from('imports')
        .update({ approved_at: now, updated_at: now })
        .eq('id', importId)
        .eq('user_id', userId)
        .eq('status', 'parsed');

      if (updateError) {
        skipped.push({ importId, reason: 'approval_update_failed' });
        continue;
      }

      console.log('[APPROVAL] Import approved', { importId, uidPrefix: String(userId).slice(0, 8) + '...' });
      approvedImportIds.push(importId);
    }

    const ok = approvedImportIds.length > 0 && skipped.length === 0;
    return {
      statusCode: ok ? 200 : 207,
      headers,
      body: JSON.stringify({
        ok,
        approvedImportIds,
        skipped,
      }),
    };
  } catch (error: any) {
    console.error('[APPROVAL] approve-import unexpected error', error?.name || 'Error');
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ ok: false, error: 'internal_error' }),
    };
  }
};
