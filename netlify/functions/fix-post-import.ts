/**
 * fix-post-import - Post-import fixup function.
 * Called by frontend after upload pipeline completes.
 * Fixes: filename NULL, committed_at NULL, and triggers Tag sweep.
 *
 * POST body: { importId?: string }
 */

import type { Handler } from '@netlify/functions';
import { serverSupabase } from './_shared/supabase.js';
import { verifyAuth } from './_shared/verifyAuth.js';

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };

  const auth = await verifyAuth(event);
  if (auth.error || !auth.userId) return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized' }) };

  const userId = auth.userId;
  const sb = serverSupabase();
  const body = JSON.parse(event.body || '{}');
  const { importId } = body;

  const fixes: string[] = [];

  try {
    // Bug 1: Fix filename NULL on imports - backfill from user_documents
    const { data: importsNoFile } = await sb
      .from('imports')
      .select('id, document_id, filename')
      .eq('user_id', userId)
      .or('filename.is.null,filename.eq.');

    if (importsNoFile && importsNoFile.length > 0) {
      for (const imp of importsNoFile) {
        if (!imp.document_id) continue;
        const { data: doc } = await sb
          .from('user_documents')
          .select('original_name, storage_path')
          .eq('id', imp.document_id)
          .maybeSingle();
        if (doc) {
          const filename = doc.original_name || (doc.storage_path ? doc.storage_path.split('/').pop() : null);
          if (filename) {
            await sb.from('imports').update({ filename: filename, updated_at: new Date().toISOString() }).eq('id', imp.id).eq('user_id', userId);
            fixes.push(`filename fixed: ${imp.id} -> ${filename}`);
          }
        }
      }
    }

    // Bug 3: Fix committed_at NULL on committed imports
    const { data: commitNoDate } = await sb
      .from('imports')
      .select('id')
      .eq('user_id', userId)
      .eq('status', 'committed')
      .is('committed_at', null);

    if (commitNoDate && commitNoDate.length > 0) {
      for (const imp of commitNoDate) {
        await sb.from('imports').update({ committed_at: new Date().toISOString() }).eq('id', imp.id).eq('user_id', userId);
        fixes.push(`committed_at fixed: ${imp.id}`);
      }
    }

    // Bug 2: Auto-commit parsed imports that have staging rows ready
    const { data: parsedImports } = await sb
      .from('imports')
      .select('id')
      .eq('user_id', userId)
      .eq('status', 'parsed');

    if (parsedImports && parsedImports.length > 0) {
      for (const imp of parsedImports) {
        // Check if staging rows exist
        const { count } = await sb
          .from('transactions_staging')
          .select('id', { count: 'exact', head: true })
          .eq('import_id', imp.id);
        if (count && count > 0) {
          // Trigger commit via the commit-import function
          try {
            const baseUrl = process.env.URL || process.env.DEPLOY_PRIME_URL || 'http://localhost:8888';
            const authHeader = event.headers?.authorization || event.headers?.Authorization || '';
            // First approve
            await fetch(`${baseUrl}/.netlify/functions/approve-import`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: authHeader },
              body: JSON.stringify({ importIds: [imp.id] }),
            });
            // Then commit
            const commitRes = await fetch(`${baseUrl}/.netlify/functions/commit-import`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: authHeader },
              body: JSON.stringify({ importId: imp.id }),
            });
            if (commitRes.ok) fixes.push(`auto-committed: ${imp.id} (${count} staging rows)`);
            else fixes.push(`commit failed: ${imp.id} - ${commitRes.status}`);
          } catch (e: any) {
            fixes.push(`commit error: ${imp.id} - ${e.message}`);
          }
        }
      }
    }

    // Bug 4: Trigger Tag sweep for uncategorized transactions
    try {
      const baseUrl = process.env.URL || process.env.DEPLOY_PRIME_URL || 'http://localhost:8888';
      const authHeader = event.headers?.authorization || event.headers?.Authorization || '';
      const tagRes = await fetch(`${baseUrl}/.netlify/functions/tag-categorize-committed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: authHeader },
        body: JSON.stringify({ limit: 500 }),
      });
      if (tagRes.ok) {
        const tagData = await tagRes.json();
        fixes.push(`Tag sweep: ${tagData.updated || 0} categorized of ${tagData.total || 0}`);
      }
    } catch (e: any) {
      fixes.push(`Tag sweep error: ${e.message}`);
    }

    // Also trigger background sweep if importId provided
    if (importId) {
      try {
        const baseUrl = process.env.URL || process.env.DEPLOY_PRIME_URL || 'http://localhost:8888';
        const authHeader = event.headers?.authorization || event.headers?.Authorization || '';
        await fetch(`${baseUrl}/.netlify/functions/tag-background-sweep`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: authHeader },
          body: JSON.stringify({ importId }),
        });
        fixes.push(`background sweep triggered for ${importId}`);
      } catch { /* non-blocking */ }
    }

    // Bug 5: Trigger merchant sweep for unknown-merchant transactions
    try {
      const baseUrl = process.env.URL || process.env.DEPLOY_PRIME_URL || 'http://localhost:8888';
      const authHeader = event.headers?.authorization || event.headers?.Authorization || '';
      const sweepRes = await fetch(`${baseUrl}/.netlify/functions/tag-merchant-sweep`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: authHeader },
        body: '{}',
      });
      if (sweepRes.ok) {
        const sweepData = await sweepRes.json();
        fixes.push(`merchant sweep: ${sweepData.queued || 0} unknown-merchant txs flagged`);
      }
    } catch (e: any) {
      fixes.push(`merchant sweep error: ${e.message}`);
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ ok: true, fixes }),
    };
  } catch (err: any) {
    console.error('[fix-post-import] Error:', err.message);
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ ok: false, error: err.message, fixes }),
    };
  }
};
