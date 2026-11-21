import type { Handler } from '@netlify/functions';
import { admin } from './_shared/upload.js';
import { verifyAuth } from './_shared/verifyAuth.js';

const BUCKET = 'docs';

/**
 * Development-only destructive endpoint. Fail closed: it is enabled ONLY under Netlify Dev
 * (NETLIFY_DEV=true) or when ALLOW_TEST_RESET=1 is explicitly set, and is always disabled
 * when Netlify reports the production context. ALLOW_TEST_RESET must never be set in production.
 */
export function isResetEndpointEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  if (String(env.CONTEXT || '').toLowerCase() === 'production') return false;
  if (String(env.NODE_ENV || '').toLowerCase() === 'production' && env.NETLIFY_DEV !== 'true') return false;
  return env.NETLIFY_DEV === 'true' || env.ALLOW_TEST_RESET === '1';
}

type FailedItem = {
  documentId: string;
  error: string;
};

export const handler: Handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-user-id, X-User-Id',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Cache-Control': 'no-store',
  };

  // Disabled environments behave as if the endpoint does not exist (no auth probing, no DB access).
  if (!isResetEndpointEnabled()) {
    return { statusCode: 404, headers, body: JSON.stringify({ ok: false, error: 'Not found' }) };
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ ok: false, error: 'Method not allowed. Use POST.' }),
    };
  }

  // Identity comes only from the verified Supabase JWT; the caller can only reset their own data.
  const auth = await verifyAuth(event);
  if (!auth.userId) {
    return { statusCode: 401, headers, body: JSON.stringify({ ok: false, error: 'Unauthorized' }) };
  }
  const claimedUserId = String(event.headers?.['x-user-id'] || event.headers?.['X-User-Id'] || '').trim();
  if (claimedUserId && claimedUserId !== auth.userId) {
    console.warn('[reset-test-uploads] stage=identity_mismatch');
    return { statusCode: 403, headers, body: JSON.stringify({ ok: false, error: 'Forbidden' }) };
  }
  const userId = auth.userId;

  try {

    const body = JSON.parse(event.body || '{}');
    const confirm = String(body?.confirm || '');
    const dryRun = Boolean(body?.dryRun);
    const rawDays = Number(body?.days ?? 30);
    const days = Number.isFinite(rawDays) && rawDays > 0 ? Math.min(Math.floor(rawDays), 3650) : 30;

    if (confirm !== 'RESET') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ ok: false, error: 'Invalid confirm token. Expected "RESET".' }),
      };
    }

    const sb = admin();
    const sinceIso = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    const { data: docs, error: docsError } = await sb
      .from('user_documents')
      .select('id, storage_path, created_at, status, upload_hash')
      .eq('user_id', userId)
      .gte('created_at', sinceIso)
      .order('created_at', { ascending: false });

    if (docsError) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ ok: false, error: 'Failed to load user documents' }),
      };
    }

    const failed: FailedItem[] = [];
    const deleted = {
      imports: 0,
      staging: 0,
      transactions: 0,
      storageObjects: 0,
    };
    let discardedDocs = 0;
    const scanned = Array.isArray(docs) ? docs.length : 0;

    for (const doc of docs || []) {
      const docId = String(doc?.id || '').trim();
      if (!docId) continue;

      try {
        const { data: imports, error: importsError } = await sb
          .from('imports')
          .select('id')
          .eq('user_id', userId)
          .eq('document_id', docId);
        if (importsError) throw importsError;

        const importIds = (imports || [])
          .map((row: any) => String(row?.id || '').trim())
          .filter(Boolean);

        if (dryRun) {
          deleted.imports += importIds.length;
          discardedDocs += 1;
          continue;
        }

        if (importIds.length > 0) {
          const { data: deletedStaging } = await sb
            .from('transactions_staging')
            .delete()
            .in('import_id', importIds)
            .eq('user_id', userId)
            .select('id');
          deleted.staging += Array.isArray(deletedStaging) ? deletedStaging.length : 0;
        }

        const deletedTransactionIds = new Set<string>();
        const { data: deletedByDoc } = await sb
          .from('transactions')
          .delete()
          .eq('document_id', docId)
          .eq('user_id', userId)
          .select('id');
        for (const row of deletedByDoc || []) {
          if (row?.id) deletedTransactionIds.add(String(row.id));
        }
        if (importIds.length > 0) {
          const { data: deletedByImport } = await sb
            .from('transactions')
            .delete()
            .in('import_id', importIds)
            .eq('user_id', userId)
            .select('id');
          for (const row of deletedByImport || []) {
            if (row?.id) deletedTransactionIds.add(String(row.id));
          }
        }
        deleted.transactions += deletedTransactionIds.size;

        if (importIds.length > 0) {
          const { data: deletedImports } = await sb
            .from('imports')
            .delete()
            .in('id', importIds)
            .eq('user_id', userId)
            .select('id');
          deleted.imports += Array.isArray(deletedImports) ? deletedImports.length : 0;
        }

        const storagePath = String(doc?.storage_path || '').trim();
        if (storagePath) {
          const storageCandidates = [storagePath, `${storagePath}.ocr.json`, `${storagePath}.txt`];
          const { data: removedFiles, error: storageError } = await sb.storage.from(BUCKET).remove(storageCandidates);
          if (!storageError) {
            deleted.storageObjects += Array.isArray(removedFiles) ? removedFiles.length : storageCandidates.length;
          }
        }

        const { error: updateError } = await sb
          .from('user_documents')
          .update({
            status: 'discarded',
            upload_hash: null,
            file_hash: null,
            content_hash: null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', docId)
          .eq('user_id', userId);
        if (updateError) throw updateError;

        discardedDocs += 1;
      } catch (err: any) {
        failed.push({
          documentId: docId,
          error: String(err?.message || 'reset_failed'),
        });
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        dryRun,
        days,
        scanned,
        discardedDocs,
        deleted,
        failed,
      }),
    };
  } catch (err: any) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        ok: false,
        error: 'Unexpected error',
      }),
    };
  }
};

