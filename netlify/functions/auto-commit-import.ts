import { Handler } from '@netlify/functions';
import { admin } from './_shared/supabase.js';
import crypto from 'crypto';

const LOG = '[auto-commit-import]';
const POLL_INTERVAL_MS = 3000;
const OCR_MAX_POLLS = 20;     // 20 * 3s = 60s waiting for OCR text
const STAGING_MAX_POLLS = 30; // 30 * 3s = 90s waiting for staging rows

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
  const netlifyUrl = process.env.URL || process.env.NETLIFY_URL || 'http://localhost:8888';

  // ── Step 1: Poll user_documents for OCR text ──────────────────────────
  let ocrText: string | null = null;

  for (let attempt = 1; attempt <= OCR_MAX_POLLS; attempt++) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));

    const { data: doc } = await sb
      .from('user_documents')
      .select('ocr_text, ocr_text_length, metadata, extracted_data')
      .eq('id', docId)
      .maybeSingle();

    if (!doc) {
      console.warn(`${LOG} document not found`, { docId, attempt });
      continue;
    }

    // Try ocr_text column first
    if (doc.ocr_text && typeof doc.ocr_text === 'string' && doc.ocr_text.length > 10) {
      ocrText = doc.ocr_text;
      console.log(`${LOG} OCR text found in ocr_text column`, { docId, attempt, len: ocrText.length });
      break;
    }

    // Fallback: try metadata->ocr_text
    const metaOcr = doc.metadata?.ocr_text;
    if (metaOcr && typeof metaOcr === 'string' && metaOcr.length > 10) {
      ocrText = metaOcr;
      console.log(`${LOG} OCR text found in metadata.ocr_text`, { docId, attempt, len: ocrText.length });
      break;
    }

    // Fallback: try extracted_data->raw_text or extracted_data->text
    const extractedText = doc.extracted_data?.raw_text || doc.extracted_data?.text;
    if (extractedText && typeof extractedText === 'string' && extractedText.length > 10) {
      ocrText = extractedText;
      console.log(`${LOG} OCR text found in extracted_data`, { docId, attempt, len: ocrText.length });
      break;
    }

    // Check if OCR has finished but text just isn't stored anywhere we can find
    if (doc.ocr_text_length && doc.ocr_text_length > 0) {
      console.warn(`${LOG} ocr_text_length=${doc.ocr_text_length} but no text found yet`, { docId, attempt });
    }

    console.log(`${LOG} OCR poll ${attempt}/${OCR_MAX_POLLS}: no text yet`, { docId });
  }

  if (!ocrText) {
    console.error(`${LOG} no OCR text found after polling`, { docId });
    return { statusCode: 200, body: JSON.stringify({ ok: false, reason: 'no_ocr_text', docId }) };
  }

  // ── Step 2: Find import record ────────────────────────────────────────
  const { data: imp, error: impErr } = await sb
    .from('imports')
    .select('id, status')
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

  // If already committed, don't double-commit
  if (imp.status === 'committed') {
    console.log(`${LOG} import already committed, skipping`, { importId });
    return { statusCode: 200, body: JSON.stringify({ ok: true, reason: 'already_committed', importId }) };
  }

  console.log(`${LOG} found import`, { importId, docId, status: imp.status });

  // ── Step 3: Call normalize-transactions with the OCR text ─────────────
  console.log(`${LOG} calling normalize-transactions`, { importId, docId, textLen: ocrText.length });
  try {
    const normalizeResp = await fetch(`${netlifyUrl}/.netlify/functions/normalize-transactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        documentId: docId,
        ocrText,
        transientOcrText: ocrText,
      }),
    });
    console.log(`${LOG} normalize-transactions responded`, { status: normalizeResp.status });
  } catch (err: any) {
    console.error(`${LOG} normalize-transactions call failed`, { error: err?.message });
    // Continue anyway — normalization may have been triggered by OCR already
  }

  // ── Step 4: Poll transactions_staging for rows ────────────────────────
  let stagedCount = 0;
  for (let attempt = 1; attempt <= STAGING_MAX_POLLS; attempt++) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    const { count } = await sb
      .from('transactions_staging')
      .select('*', { count: 'exact', head: true })
      .eq('import_id', importId);
    stagedCount = count || 0;
    console.log(`${LOG} staging poll ${attempt}/${STAGING_MAX_POLLS}: ${stagedCount} rows`);
    if (stagedCount > 0) break;
  }

  if (stagedCount === 0) {
    console.warn(`${LOG} no staged rows after polling`, { importId });
    return { statusCode: 200, body: JSON.stringify({ ok: false, reason: 'no_staged_rows', importId }) };
  }

  // ── Step 5: Read staging rows and map to transactions ─────────────────
  const { data: stagingRows, error: fetchErr } = await sb
    .from('transactions_staging')
    .select('*')
    .eq('import_id', importId);

  if (fetchErr || !stagingRows?.length) {
    console.error(`${LOG} failed to fetch staging rows`, { importId, error: fetchErr?.message });
    return { statusCode: 500, body: JSON.stringify({ error: 'Failed to fetch staging rows' }) };
  }

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

  // ── Step 6: Insert into transactions ──────────────────────────────────
  const { error: insertErr } = await sb.from('transactions').insert(txRows);
  if (insertErr) {
    console.error(`${LOG} insert failed`, { importId, error: insertErr.message });
    return { statusCode: 500, body: JSON.stringify({ error: 'Insert failed', details: insertErr.message }) };
  }

  // ── Step 7: Mark import as committed ──────────────────────────────────
  await sb.from('imports').update({ status: 'committed' }).eq('id', importId);

  console.log(`${LOG} committed ${txRows.length} transactions`, { importId, docId });

  return {
    statusCode: 200,
    body: JSON.stringify({ ok: true, importId, transactionCount: txRows.length }),
  };
};
