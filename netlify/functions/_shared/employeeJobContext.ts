import type { SupabaseClient } from '@supabase/supabase-js';

type JobContextArgs = {
  employeeKey: string;
  finalEmployeeSlug?: string | null;
  userId: string;
  threadId?: string | null;
  documentIds?: string[] | null;
  importId?: string | null;
};

function safeShorten(text: string, max = 800): string {
  const t = (text || '').trim();
  if (!t) return '';
  if (t.length <= max) return t;
  return t.slice(0, max) + '…';
}

function redactLikelySecrets(text: string): string {
  return (text || '').replace(/eyJ[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]{20,}/g, '[REDACTED_TOKEN]');
}

/**
 * Build a small “job context” system message for a specific employee.
 * This is NOT the brain pack; it’s the “what’s happening right now” snapshot.
 */
export async function buildEmployeeJobContextSystemMessage(
  sb: SupabaseClient,
  args: JobContextArgs
): Promise<string | null> {
  const employee = (args.employeeKey || '').toLowerCase();

  // Only Byte for now (we’ll add Ledger/Custodian later)
  if (employee !== 'byte') return null;

  const docIds = (args.documentIds || []).filter(Boolean);
  const hasDocs = docIds.length > 0;

  // Try to fetch the most recent document rows for these IDs (best-effort)
  // NOTE: Table names may differ; we keep this safe and non-breaking.
  // If your table is different, we’ll adjust after seeing your schema.
  let docsSummary = '';
  let ocrPreview = '';
  let ocrStatus = 'unknown';

  try {
    // Try common table name: user_documents
    const { data: docs, error } = await sb
      .from('user_documents')
      .select('id, original_name, mime_type, status, created_at, ocr_text, pii_types, ocr_completed_at')
      .in('id', docIds.length ? docIds : ['__none__'])
      .limit(5);

    if (!error && docs && docs.length) {
      docsSummary =
        'Documents:\n' +
        docs
          .map((d: any) => {
            const name = d.original_name || d.id;
            const mime = d.mime_type || 'unknown';
            const st = d.status || 'unknown';
            const hasText = !!(d.ocr_text && d.ocr_text.trim().length);
            return `- ${name} (${mime}) status=${st} ocr_text=${hasText ? 'yes' : 'no'}`;
          })
          .join('\n');

      // Pick first doc with OCR text for preview
      const withText = docs.find((d: any) => (d.ocr_text || '').trim().length > 0);
      if (withText) {
        ocrStatus = withText.status || 'unknown';
        const raw = redactLikelySecrets(withText.ocr_text || '');
        ocrPreview = safeShorten(raw, 900);
      }
    }
  } catch (e) {
    // swallow (no breaking)
  }

  // Try to fetch staging transaction counts if your pipeline wrote them
  // Common table: transactions_staging
  let stagingInfo = '';
  try {
    const { count, error } = await sb
      .from('transactions_staging')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', args.userId)
      .in('document_id', docIds);
    if (!error && typeof count === 'number') {
      stagingInfo = `Staging: ${count} rows linked to these documents\n`;
    }
  } catch (e) {
    // swallow
  }

  const header = `BYTE JOB CONTEXT (Upload + OCR + Import Snapshot)`;

  if (!hasDocs && !docsSummary && !ocrPreview) {
    return [
      header,
      '',
      'Inputs:',
      '- No documents were provided to Byte in this request.',
      '',
      'Byte Instructions:',
      '- Ask the user to upload a document (PDF/image/CSV) or paste OCR text.',
      '- Explain what Byte can extract (date, merchant, amount) and the next step.',
    ].join('\n');
  }

  const parts: string[] = [header, ''];

  parts.push('Inputs:');
  parts.push(`- documentIds: ${docIds.length ? docIds.join(', ') : 'none'}`);
  if (docsSummary) parts.push('', docsSummary);

  if (stagingInfo) parts.push('', stagingInfo.trim());

  if (ocrPreview) {
    parts.push('');
    parts.push(`OCR Preview (truncated):`);
    parts.push(ocrPreview);
    parts.push('');
    parts.push(`OCR Status: ${ocrStatus}`);
    parts.push('');
    parts.push('Byte Instructions:');
    parts.push('- Summarize what the OCR contains (count/date range/merchants/totals if visible).');
    parts.push('- Flag missing/unclear fields.');
    parts.push('- Provide Confidence (high/medium/low).');
    parts.push('- Recommend the next step (normalize → stage → commit, or ask user for clarification).');
    parts.push('- If extraction is complete, suggest handoff to Ledger for categorization.');
  } else {
    parts.push('');
    parts.push('Byte Instructions:');
    parts.push('- Documents exist, but no OCR text preview is available here.');
    parts.push('- Ask the user to run OCR or confirm the document is processed.');
    parts.push('- Offer to proceed if the system has extracted staging transactions.');
  }

  return parts.join('\n');
}
