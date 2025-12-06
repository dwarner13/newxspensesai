import { Handler } from '@netlify/functions';
import { admin, markDocStatus } from './_shared/upload';
// Phase 2.2: Use unified guardrails API (single source of truth)
import { runGuardrailsForText } from './_shared/guardrails-unified';

const BUCKET = 'docs';

function isImageOrPdf(mime: string) {
  return /^image\//.test(mime) || mime === 'application/pdf';
}
function isStatement(name: string) {
  const ext = (name.split('.').pop() || '').toLowerCase();
  return ['csv', 'ofx', 'qif'].includes(ext);
}

export const handler: Handler = async (event, context) => {
  // Byte Speed Mode v2: Non-blocking background processing
  // Set callbackWaitsForEmptyEventLoop to false for async processing
  if (context && typeof context.callbackWaitsForEmptyEventLoop === 'boolean') {
    context.callbackWaitsForEmptyEventLoop = false;
  }
  
  try {
    if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };
    const { userId, docId } = JSON.parse(event.body || '{}');
    if (!userId || !docId) return { statusCode: 400, body: 'Missing userId/docId' };

    const sb = admin();

    const { data: doc, error } = await sb.from('user_documents').select('*').eq('id', docId).single();
    if (error || !doc) return { statusCode: 404, body: 'doc not found' };

    const { data: file, error: dErr } = await sb.storage.from(BUCKET).download(doc.storage_path);
    if (dErr || !file) return { statusCode: 404, body: 'file missing' };

    // Route 1: Images/PDFs → OCR (guardrails run in OCR function)
    if (isImageOrPdf(doc.mime_type)) {
      // Byte Speed Mode v2: Return immediately, process in background
      const netlifyUrl = process.env.NETLIFY_URL || 'http://localhost:8888';
      
      // Fire and forget - don't wait for OCR to complete
      fetch(`${netlifyUrl}/.netlify/functions/smart-import-ocr`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, docId }),
      }).catch((error) => {
        console.error('[smart-import-finalize] Background OCR call error:', error);
      });
      
      // Return immediately - Byte can chat while OCR processes
      return { statusCode: 200, body: JSON.stringify({ started: true, queued: true, via: 'ocr' }) };
    }

    // Route 2: CSV/OFX/QIF → Parser with guardrails
    if (isStatement(doc.original_name)) {
      const rawText = await file.text();

      // ✅ Phase 2.2: Use unified guardrails API (includes config loading)
      const result = await runGuardrailsForText(rawText, userId, 'ingestion_ocr');
      
      if (!result.ok) {
        await markDocStatus(docId, 'rejected', `Blocked: ${result.reasons?.join(', ')}`);
        return { statusCode: 200, body: JSON.stringify({ rejected: true, reasons: result.reasons }) };
      }

      // Store REDACTED text only
      const safeKey = `${doc.storage_path}.txt`;
      await sb.storage.from(BUCKET).upload(safeKey, new Blob([result.text], { type: 'text/plain' }), { upsert: true });

      // Byte Speed Mode v2: Return immediately, process in background
      const netlifyUrl = process.env.NETLIFY_URL || 'http://localhost:8888';
      
      // Fire and forget - don't wait for parsing to complete
      fetch(`${netlifyUrl}/.netlify/functions/smart-import-parse-csv`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, docId, key: safeKey }),
      }).catch((error) => {
        console.error('[smart-import-finalize] Background Parse CSV call error:', error);
      });
      
      // Return immediately - Byte can chat while parsing processes
      return { statusCode: 200, body: JSON.stringify({ started: true, queued: true, via: 'statement-parse', pii_redacted: result.signals?.pii }) };
    }

    // Unknown type
    await markDocStatus(docId, 'rejected', 'unsupported_type');
    return { statusCode: 200, body: JSON.stringify({ rejected: true, reason: 'unsupported_type' }) };
  } catch (e: any) {
    return { statusCode: 500, body: e.message };
  }
};
