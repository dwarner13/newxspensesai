import { Handler } from '@netlify/functions';
import { admin, markDocStatus } from './_shared/upload';
import { runGuardrails, getGuardrailConfig } from './_shared/guardrails-production';

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
      await sb.functions.invoke('smart-import-ocr', { body: { userId, docId } });
      return { statusCode: 200, body: JSON.stringify({ queued: true, via: 'ocr' }) };
    }

    // Route 2: CSV/OFX/QIF → Parser with guardrails
    if (isStatement(doc.original_name)) {
      const rawText = await file.text();

      // ✅ CORRECT API: Load config and run guardrails
      const cfg = await getGuardrailConfig(userId);
      const result = await runGuardrails(rawText, userId, 'ingestion_ocr', cfg);
      
      if (!result.ok) {
        await markDocStatus(docId, 'rejected', `Blocked: ${result.reasons?.join(', ')}`);
        return { statusCode: 200, body: JSON.stringify({ rejected: true, reasons: result.reasons }) };
      }

      // Store REDACTED text only
      const safeKey = `${doc.storage_path}.txt`;
      await sb.storage.from(BUCKET).upload(safeKey, new Blob([result.text], { type: 'text/plain' }), { upsert: true });

      await sb.functions.invoke('smart-import-parse-csv', { body: { userId, docId, key: safeKey } });
      return { statusCode: 200, body: JSON.stringify({ queued: true, via: 'statement-parse', pii_redacted: result.signals?.pii }) };
    }

    // Unknown type
    await markDocStatus(docId, 'rejected', 'unsupported_type');
    return { statusCode: 200, body: JSON.stringify({ rejected: true, reason: 'unsupported_type' }) };
  } catch (e: any) {
    return { statusCode: 500, body: e.message };
  }
};
