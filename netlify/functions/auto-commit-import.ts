import { Handler } from '@netlify/functions';
import { admin } from './_shared/supabase.js';
import crypto from 'crypto';

const LOG = '[auto-commit-import]';
const POLL_INTERVAL_MS = 3000;
const MAX_POLLS = 30; // 30 * 3s = 90s max

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  let body: { docId?: string; userId?: string };
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  const { docId, userId } = body;
  if (!docId || !userId) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing docId or userId' }) };
  }

  console.log(`${LOG} started`, { docId, userId });

  const sb = admin();

  // Step 1: Find the import record for this document
  const { data: imp, error: impErr } = await sb
    .from('imports')
    .select('id')
    .eq('document_id', docId)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (impErr || !imp?.id) {
    console.warn(`${LOG} no import found for docId`, { docId, error: impErr?.message });
    return { statusCode: 404, body: JSON.stringify({ error: 'No import found for document' }) };
  }

  const importId = imp.id;
  console.log(`${LOG} found import`, { importId, docId });

  // Step 2: Poll transactions_staging for rows
  let stagedCount = 0;
  for (let attempt = 1; attempt <= MAX_POLLS; attempt++) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    const { count } = await sb
      .from('transactions_staging')
      .select('*', { count: 'exact', head: true })
      .eq('import_id', importId);
    stagedCount = count || 0;
    console.log(`${LOG} poll ${attempt}/${MAX_POLLS}: ${stagedCount} staged rows`);
    if (stagedCount > 0) break;
  }

  if (stagedCount === 0) {
    console.warn(`${LOG} no staged rows after ${MAX_POLLS * POLL_INTERVAL_MS / 1000}s, giving up`, { importId });
    return { statusCode: 200, body: JSON.stringify({ ok: false, reason: 'no_staged_rows', importId }) };
  }

  // Step 3: Read all staging rows
  const { data: stagingRows, error: fetchErr } = await sb
    .from('transactions_staging')
    .select('*')
    .eq('import_id', importId);

  if (fetchErr || !stagingRows?.length) {
    console.error(`${LOG} failed to fetch staging rows`, { importId, error: fetchErr?.message });
    return { statusCode: 500, body: JSON.stringify({ error: 'Failed to fetch staging rows' }) };
  }

  // Step 4: Map to transactions table format
  const txRows = stagingRows.map((row: any) => ({
    id: crypto.randomUUID(),
    user_id: row.user_id,
    merchant_name: row.data_json?.merchant || 'Unknown',
    amount: row.data_json?.amount || 0,
    date: row.data_json?.date || null,
    type: row.data_json?.type === 'Credit' ? 'income' : 'expense',
    category: row.tag_category || 'Other',
    import_id: row.import_id,
  }));

  // Step 5: Insert into transactions
  const { error: insertErr } = await sb.from('transactions').insert(txRows);
  if (insertErr) {
    console.error(`${LOG} insert failed`, { importId, error: insertErr.message });
    return { statusCode: 500, body: JSON.stringify({ error: 'Insert failed', details: insertErr.message }) };
  }

  // Step 6: Update import status
  await sb.from('imports').update({ status: 'committed' }).eq('id', importId);

  console.log(`${LOG} committed ${txRows.length} transactions`, { importId, docId });

  return {
    statusCode: 200,
    body: JSON.stringify({ ok: true, importId, transactionCount: txRows.length }),
  };
};
