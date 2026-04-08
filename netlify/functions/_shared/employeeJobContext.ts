import type { SupabaseClient } from '@supabase/supabase-js';

type JobContextArgs = {
  employeeKey: string;
  finalEmployeeSlug?: string | null;
  userId: string;
  threadId?: string | null;
  documentIds?: string[] | null;
  importId?: string | null;
};

/**
 * Build a small “job context” system message for a specific employee.
 * This is NOT the brain pack; it's the “what's happening right now” snapshot.
 */
export async function buildEmployeeJobContextSystemMessage(
  sb: SupabaseClient,
  args: JobContextArgs
): Promise<string | null> {
  const employee = (args.employeeKey || '').toLowerCase();

  // Only Byte for now (we'll add Ledger/Custodian later)
  if (employee !== 'byte') return null;

  const docIds = (args.documentIds || []).filter(Boolean);
  const hasDocs = docIds.length > 0;

  // Try to fetch the most recent document rows for these IDs (best-effort)
  // NOTE: Table names may differ; we keep this safe and non-breaking.
  // If your table is different, we'll adjust after seeing your schema.
  let docsSummary = '';
  let hasOcrSignals = false;

  try {
    // Try common table name: user_documents
    const { data: docs, error } = await sb
      .from('user_documents')
      .select('*')
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
            const textLength = Number(d?.ocr_text_length ?? d?.extracted_data?.text_length ?? 0);
            const textHash = String(d?.ocr_text_hash || d?.extracted_data?.text_hash || '');
            const docType = d?.extracted_data?.docType || 'unknown';
            const pages = d?.extracted_data?.pages || d?.page_count || 0;
            const txns = d?.extracted_data?.summary?.count || d?.parsed_transactions_count || 0;
            const warnings = Array.isArray(d?.extracted_data?.warnings) ? d.extracted_data.warnings.length : 0;
            const missingFields = Array.isArray(d?.extracted_data?.missingFields) ? d.extracted_data.missingFields.length : 0;
            hasOcrSignals = hasOcrSignals || textLength > 0 || Boolean(textHash);
            return `- ${name} (${mime}) status=${st} text_length=${textLength} text_hash=${textHash || 'n/a'} doc_type=${docType} pages=${pages} txns=${txns} warnings=${warnings} missing_fields=${missingFields}`;
          })
          .join('\n');
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

  if (!hasDocs && !docsSummary && !hasOcrSignals) {
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

  if (hasOcrSignals) {
    parts.push('');
    parts.push('OCR Signals: text metrics and structured extraction data are available.');
    parts.push('');
    parts.push('Byte Instructions:');
    parts.push('- Summarize structured extraction signals (counts/date range/merchants/totals if available).');
    parts.push('- Flag missing/unclear fields.');
    parts.push('- Provide Confidence (high/medium/low).');
    parts.push('- Recommend the next step (normalize -> stage -> commit, or ask user for clarification).');
    parts.push('- If extraction is complete, suggest handoff to Ledger for categorization.');
  } else {
    parts.push('');
    parts.push('Byte Instructions:');
    parts.push('- Documents exist, but no OCR metrics are available yet.');
    parts.push('- Ask the user to run OCR or confirm the document is processed.');
    parts.push('- Offer to proceed if the system has extracted staging transactions.');
  }

  return parts.join('\n');
}
