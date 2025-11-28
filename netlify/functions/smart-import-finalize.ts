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

export const handler: Handler = async (event) => {
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
      const netlifyUrl = process.env.NETLIFY_URL || 'http://localhost:8888';
      try {
        const ocrResponse = await fetch(`${netlifyUrl}/.netlify/functions/smart-import-ocr`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, docId }),
        });
        
        if (!ocrResponse.ok) {
          const errorText = await ocrResponse.text();
          console.error('[smart-import-finalize] OCR function failed:', errorText);
          // Don't throw - return queued status anyway (async processing)
        }
      } catch (fetchError: any) {
        console.error('[smart-import-finalize] Error calling OCR function:', fetchError);
        // Don't throw - return queued status anyway (async processing)
      }
      
      return { statusCode: 200, body: JSON.stringify({ queued: true, via: 'ocr' }) };
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

      const netlifyUrl = process.env.NETLIFY_URL || 'http://localhost:8888';
      try {
        const parseResponse = await fetch(`${netlifyUrl}/.netlify/functions/smart-import-parse-csv`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, docId, key: safeKey }),
        });
        
        if (!parseResponse.ok) {
          const errorText = await parseResponse.text();
          console.error('[smart-import-finalize] Parse CSV function failed:', errorText);
          // Don't throw - return queued status anyway (async processing)
        }
      } catch (fetchError: any) {
        console.error('[smart-import-finalize] Error calling Parse CSV function:', fetchError);
        // Don't throw - return queued status anyway (async processing)
      }
      
      return { statusCode: 200, body: JSON.stringify({ queued: true, via: 'statement-parse', pii_redacted: result.signals?.pii }) };
    }

    // Unknown type
    await markDocStatus(docId, 'rejected', 'unsupported_type');
    return { statusCode: 200, body: JSON.stringify({ rejected: true, reason: 'unsupported_type' }) };
  } catch (e: any) {
    return { statusCode: 500, body: e.message };
  }
};
