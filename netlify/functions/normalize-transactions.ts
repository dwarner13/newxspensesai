/**
 * Normalize Transactions Netlify Function
 * 
 * Converts OCR text from user_documents into normalized transactions
 * and saves them to transactions_staging table
 * 
 * Byte Speed Mode v2: Non-blocking background processing
 */

import type { Handler } from '@netlify/functions';
import { createHash } from 'crypto';
import { admin } from './_shared/supabase.js';
import { normalizeOcrResult } from './_shared/ocr_normalize.js';
import { parseInvoiceLike, parseReceiptLike } from './_shared/ocr_parsers.js';
import { safeTextMetrics } from './_shared/textHash.js';

type ExtractedSummary = Record<string, any> | null;
type UserDocumentRow = {
  id: string;
  user_id?: string | null;
  storage_path?: string | null;
  mime_type?: string | null;
  original_name?: string | null;
  status?: string | null;
  ocr_text_hash?: string | null;
  ocr_text_length?: number | null;
  extracted_text_hash?: string | null;
  extracted_text_length?: number | null;
  extracted_data?: any;
  normalized_json?: any;
  metadata?: any;
  extraction_quality?: any;
  pages_detected?: number | null;
  ocr_completed_at?: string | null;
  ocr_engine?: string | null;
};
type NormalizationResult = {
  ok: boolean;
  skipped?: boolean;
  reason?: string;
  documentId?: string;
  error?: { code: string; message: string };
  stagedCount?: number;
  importId?: string;
};

const AUTO_PURGE_SOURCE = process.env.OCR_AUTO_PURGE_SOURCE === '1';
const AUTO_PURGE_TEXT = process.env.OCR_AUTO_PURGE_TEXT === '1';
const NORMALIZE_DEBUG_ENABLED =
  String(process.env.VITE_LOG_LEVEL || '').toLowerCase() === 'debug' ||
  String(process.env.PRIME_DEBUG || '').toLowerCase() === 'true';
const UUID_V4_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isMissingColumnError(error: any): boolean {
  const message = String(error?.message || '').toLowerCase();
  return message.includes('column') && message.includes('does not exist');
}

async function fetchDocumentWithCompatibility(sb: any, documentId: string): Promise<{ doc: UserDocumentRow | null; error: any }> {
  const selectAttempts = [
    'id, user_id, storage_path, mime_type, original_name, status, ocr_text_hash, ocr_text_length, extracted_text_hash, extracted_text_length, extracted_data, normalized_json, metadata, extraction_quality, pages_detected, ocr_completed_at, ocr_engine',
    'id, user_id, storage_path, mime_type, original_name, status, ocr_text_hash, ocr_text_length, extracted_text_hash, extracted_text_length, extracted_data, normalized_json, metadata',
    'id, user_id, storage_path, mime_type, original_name, status, ocr_text_hash, ocr_text_length, extracted_text_hash, extracted_text_length, metadata',
    'id, storage_path, mime_type, original_name, status',
  ];

  let lastError: any = null;
  for (const selectClause of selectAttempts) {
    const { data, error } = await sb
      .from('user_documents')
      .select(selectClause)
      .eq('id', documentId)
      .single();
    if (!error) {
      return { doc: data as UserDocumentRow, error: null };
    }
    lastError = error;
    if (!isMissingColumnError(error)) {
      return { doc: null, error };
    }
  }
  return { doc: null, error: lastError };
}

function parseStatementSummary(text: string): ExtractedSummary {
  const normalized = text || '';
  const periodMatch = normalized.match(/Statement Period:\s*([A-Za-z]{3}\s+\d{1,2},\s*\d{4})\s*-\s*([A-Za-z]{3}\s+\d{1,2},\s*\d{4})/i);
  const newBalanceMatch = normalized.match(/New Balance\s*\$?([0-9,]+\.\d{2})/i);
  const minPaymentMatch = normalized.match(/Minimum Payment Due\s*\$?([0-9,]+\.\d{2})/i);
  const dueDateMatch = normalized.match(/Payment Due Date\s*([A-Za-z]{3,9}\s+\d{1,2},\s*\d{4})/i);
  const prevBalanceMatch = normalized.match(/Previous Balance\s*\$?([0-9,]+\.\d{2})/i);
  const paymentsMatch = normalized.match(/Payments\s*-?\s*\$?([0-9,]+\.\d{2})/i);
  const transactionsMatch = normalized.match(/Transactions\s*\+?\s*\$?([0-9,]+\.\d{2})/i);
  const interestMatch = normalized.match(/Interest Charged\s*\+?\s*\$?([0-9,]+\.\d{2})/i);
  const creditLimitMatch = normalized.match(/Credit Limit\s*\$?([0-9,]+\.\d{2})/i);
  const availableCreditMatch = normalized.match(/Available Credit\s*\$?([0-9,]+\.\d{2})/i);

  if (!periodMatch && !newBalanceMatch && !minPaymentMatch) {
    return null;
  }

  return {
    docType: 'statement',
    statement_period: periodMatch ? `${periodMatch[1]} - ${periodMatch[2]}` : undefined,
    new_balance: newBalanceMatch ? newBalanceMatch[1] : undefined,
    minimum_payment_due: minPaymentMatch ? minPaymentMatch[1] : undefined,
    due_date: dueDateMatch ? dueDateMatch[1] : undefined,
    previous_balance: prevBalanceMatch ? prevBalanceMatch[1] : undefined,
    payments: paymentsMatch ? paymentsMatch[1] : undefined,
    transactions: transactionsMatch ? transactionsMatch[1] : undefined,
    interest_charged: interestMatch ? interestMatch[1] : undefined,
    credit_limit: creditLimitMatch ? creditLimitMatch[1] : undefined,
    available_credit: availableCreditMatch ? availableCreditMatch[1] : undefined,
  };
}
import OpenAI from 'openai';
import { visionStatementParser } from './_shared/visionStatementParser.js';

/**
 * Byte Speed Mode v2: Background normalization processing
 * Processes transactions asynchronously without blocking the response
 */
async function processNormalizationInBackground(
  userId: string,
  documentId: string,
  importRunId?: string,
  options?: { includeAllAccounts?: boolean; transientOcrText?: string; transientOcrTextHash?: string | null; transientOcrTextLength?: number }
): Promise<NormalizationResult> {
  const sb = admin();
  const userIdText = String(userId);

  if (!userId || !documentId) {
    console.error('[normalize-transactions] Missing userId or documentId');
    return { ok: false, error: { code: 'missing_required_fields', message: 'Missing userId or documentId' } };
  }

  let lockAcquired = false;
  const releaseNormalizationLock = async (): Promise<void> => {
    if (!lockAcquired) return;
    await sb
      .from('imports')
      .update({ status: 'ready', updated_at: new Date().toISOString() })
      .eq('document_id', documentId)
      .eq('status', 'normalizing');
  };

  try {
    // 1. Get document and OCR text
    const { doc, error: docError } = await fetchDocumentWithCompatibility(sb, documentId);

    if (docError || !doc) {
      console.error('[normalize-transactions] Error fetching document:', docError);
      return { ok: false, error: { code: 'doc_fetch_failed', message: docError?.message || 'Failed to fetch document' } };
    }

    // ---- Idempotency guard (NO migration safe) ----
    const metadata =
      doc?.metadata && typeof doc.metadata === 'object'
        ? (doc.metadata as Record<string, any>)
        : {};
    if (metadata.normalized_cached === true || doc?.normalized_json) {
      console.log('[normalize-transactions] Skip normalize - already normalized');
      return {
        ok: true,
        skipped: true,
        reason: 'already_normalized',
        documentId,
      };
    }

    // Check if this is an image that might need Vision parsing
    const isImage = doc.mime_type?.startsWith('image/') || false;
    const transientText = String(options?.transientOcrText || '');
    const ocrInputText = transientText;
    const hasOcrText = ocrInputText.trim().length > 0;
    const docTextLengthValue =
      doc?.ocr_text_length ??
      doc?.extracted_text_length ??
      doc?.extracted_data?.text_length ??
      null;
    const docTextLength = Number.isFinite(Number(docTextLengthValue)) ? Number(docTextLengthValue) : 0;
    const docTextHash =
      doc?.ocr_text_hash ||
      doc?.extracted_text_hash ||
      doc?.extracted_data?.text_hash ||
      null;
    const hasExtractedData = Boolean(doc?.extracted_data) || Boolean(doc?.normalized_json);
    const docMetadata = metadata;
    const hasMetadataMarkers = Boolean(
      docMetadata?.extraction ||
      docMetadata?.ocr ||
      docMetadata?.pipeline ||
      doc?.extraction_quality ||
      Number(doc?.pages_detected || 0) > 0 ||
      doc?.ocr_completed_at ||
      doc?.ocr_engine
    );
    console.log('[normalize-transactions] document fields', {
      documentId,
      hasTextHash: Boolean(docTextHash),
      ocrTextLength: docTextLength,
      hasExtractedData,
      hasMetadataMarkers,
    });
    if (NORMALIZE_DEBUG_ENABLED) {
      console.log('[normalize-transactions][debug] input source', {
        documentId,
        source: transientText ? 'transient_ocrText' : 'structured_only',
        textLength: ocrInputText.length,
        textHash: options?.transientOcrTextHash || docTextHash,
        structuredTextLength: docTextLength,
      });
    }

    // 2) Find existing import (if any) BEFORE creating one.
    let { data: importRecord, error: importFetchError } = await sb
      .from('imports')
      .select('id, status, updated_at')
      .eq('document_id', documentId)
      .maybeSingle();

    if (importFetchError) {
      console.error('[normalize-transactions] Error fetching import:', importFetchError);
    }

    // ---- Early "no input" guard (prevents creating empty imports) ----
    // We only proceed if we have:
    // - OCR text metrics (hash or length), OR
    // - structured payloads already saved (extracted_data / normalized_json), OR
    // - explicit metadata markers that indicate structured extraction exists.
    const ocrTextLength = Number((doc as any)?.ocr_text_length || 0);
    const textHash = ((doc as any)?.text_hash as string | null) || docTextHash || null;
    const transientTextLength = Number.isFinite(Number(options?.transientOcrTextLength))
      ? Number(options?.transientOcrTextLength)
      : ocrInputText.length;
    const transientTextHash =
      typeof options?.transientOcrTextHash === 'string' && options.transientOcrTextHash.length > 0
        ? options.transientOcrTextHash
        : null;
    const hasNormalizedJson = Boolean((doc as any)?.normalized_json);
    const hasMetadataReadyMarkers =
      Boolean(docMetadata?.ocr_cached) ||
      Boolean(docMetadata?.extraction_ready_marker) ||
      Boolean(docMetadata?.structured_ready) ||
      Boolean(docMetadata?.normalized_ready);

    const hasOcrSignals =
      Boolean(textHash) ||
      ocrTextLength > 0 ||
      Boolean(transientTextHash) ||
      transientTextLength > 0 ||
      hasOcrText;
    const hasStructuredSignals = hasExtractedData || hasNormalizedJson || hasMetadataMarkers || hasMetadataReadyMarkers;

    if (!hasOcrSignals && !hasStructuredSignals) {
      console.warn('[normalize-transactions] no input; skipping normalization', {
        documentId,
        importId: importRecord?.id || null,
        ocrTextLength,
        transientTextLength,
        hasTransientTextHash: Boolean(transientTextHash),
        hasExtractedData,
        hasNormalizedJson,
      });
      return {
        ok: false,
        skipped: true,
        reason: 'no_input',
        documentId,
        importId: importRecord?.id,
      };
    }

    if (!importRecord) {
      const { data: newImport, error: importError } = await sb
        .from('imports')
        .insert({
          user_id: userIdText,
          document_id: documentId,
          file_url: doc.storage_path || '',
          file_type: doc.mime_type || 'application/pdf',
          status: 'parsing',
        })
        .select('id, status, updated_at')
        .single();

      if (importError) {
        console.error('[normalize-transactions] Error creating import:', importError);
        return { ok: false, error: { code: 'import_create_failed', message: importError.message } };
      }
      importRecord = newImport;
    }

    const lockTimestamp = new Date().toISOString();
    const { data: lockRows, error: lockError } = await sb
      .from('imports')
      .update({ status: 'normalizing', updated_at: lockTimestamp })
      .eq('id', importRecord.id)
      .in('status', ['ready', 'parsing', 'ocr_processing', 'uploaded'])
      .select('id, status');

    if (lockError) {
      console.error('[normalize-transactions] Normalization lock update failed', {
        importId: importRecord.id,
        error: lockError.message,
      });
      return { ok: false, error: { code: 'normalization_lock_failed', message: lockError.message }, importId: importRecord.id };
    }

    if (!lockRows || lockRows.length === 0) {
      const { data: latestImport } = await sb
        .from('imports')
        .select('id, status, updated_at')
        .eq('id', importRecord.id)
        .maybeSingle();
      const latestStatus = String(latestImport?.status || importRecord.status || '').toLowerCase();
      const updatedAtMs = latestImport?.updated_at ? Date.parse(String(latestImport.updated_at)) : NaN;
      const staleMs = Number.isFinite(updatedAtMs) ? Date.now() - updatedAtMs : Number.POSITIVE_INFINITY;
      const STALE_NORMALIZING_MS = 120000;

      if (latestStatus === 'parsed' || latestStatus === 'committed') {
        const { count: parsedCount } = await sb
          .from('transactions_staging')
          .select('id', { count: 'exact', head: true })
          .eq('import_id', importRecord.id);
        const parsedCountValue = Number(parsedCount || 0);
        if (latestStatus === 'parsed' && parsedCountValue === 0) {
          console.warn('[normalize-transactions] Parsed import has zero staging rows; attempting normalize recovery', {
            importId: importRecord.id,
          });
          const { error: reopenError } = await sb
            .from('imports')
            .update({ status: 'parsing', updated_at: new Date().toISOString() })
            .eq('id', importRecord.id)
            .eq('status', 'parsed');
          if (!reopenError) {
            const { data: recoveryLockRows, error: recoveryLockError } = await sb
              .from('imports')
              .update({ status: 'normalizing', updated_at: new Date().toISOString() })
              .eq('id', importRecord.id)
              .eq('status', 'parsing')
              .select('id, status');
            if (!recoveryLockError && Array.isArray(recoveryLockRows) && recoveryLockRows.length > 0) {
              lockAcquired = true;
            }
          }
        }
        if (lockAcquired) {
          // Continue normalization flow below.
        } else {
        console.log('[normalize-transactions] Import already parsed/committed; skip normalize', {
          importId: importRecord.id,
          status: latestStatus,
          stagedCount: parsedCountValue,
        });
        return {
          ok: true,
          skipped: true,
          reason: 'already_parsed',
          stagedCount: parsedCountValue,
          importId: importRecord.id,
        };
        }
      }

      if (latestStatus === 'normalizing' && staleMs >= STALE_NORMALIZING_MS) {
        const takeoverTimestamp = new Date().toISOString();
        const { data: takeoverRows, error: takeoverError } = await sb
          .from('imports')
          .update({ status: 'normalizing', updated_at: takeoverTimestamp })
          .eq('id', importRecord.id)
          .eq('status', 'normalizing')
          .select('id, status');
        if (!takeoverError && Array.isArray(takeoverRows) && takeoverRows.length > 0) {
          console.warn('[normalize-transactions] Recovered stale normalization lock', {
            importId: importRecord.id,
            staleMs,
          });
          lockAcquired = true;
        }
      }

      if (!lockAcquired) {
        console.log('[normalize-transactions] Normalization lock not acquired, skipping', {
          importId: importRecord.id,
          status: latestStatus || null,
          staleMs: Number.isFinite(staleMs) ? staleMs : null,
        });
        return {
          ok: true,
          skipped: true,
          reason: latestStatus === 'normalizing' ? 'normalization_in_progress' : 'lock_not_acquired',
          stagedCount: 0,
          importId: importRecord.id,
        };
      }
    }
    if (!lockAcquired) {
      lockAcquired = true;
    }

    const { count: existingStagingCount } = await sb
      .from('transactions_staging')
      .select('id', { count: 'exact', head: true })
      .eq('import_id', importRecord.id);

    if ((existingStagingCount || 0) > 0) {
      console.log('[normalize-transactions] Staging already populated, skipping', {
        importId: importRecord.id,
        stagedCount: existingStagingCount,
      });
      return { ok: true, stagedCount: existingStagingCount || 0, importId: importRecord.id };
    }

    // 3. Parse OCR text to transactions using shared normalizer
    const openaiClient = process.env.OPENAI_API_KEY
      ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
      : null;

    let normalizedTransactions: any[] = [];
    let viaMethod: 'ocr' | 'vision-parse' = 'ocr';
    let usedStructuredArtifacts = false;

    // Structured fallback: if no OCR text is available, try OCR job normalized_json.
    if (!hasOcrText) {
      const docStructuredTx = Array.isArray((doc as any)?.normalized_json?.transactions)
        ? (doc as any).normalized_json.transactions
        : [];
      if (docStructuredTx.length > 0) {
        normalizedTransactions = docStructuredTx.map((tx: any) => ({
          userId: userIdText,
          kind: 'bank' as const,
          date: tx?.date || tx?.posting_date || undefined,
          merchant: tx?.merchant_normalized || tx?.merchant || undefined,
          amount: Number(tx?.amount || 0),
          currency: 'CAD',
          docId: documentId,
          description: tx?.description_raw || tx?.description || undefined,
        }));
        usedStructuredArtifacts = true;
      }
    }

    if (!hasOcrText && normalizedTransactions.length === 0) {
      try {
        const { data: ocrJob } = await sb
          .from('ocr_jobs')
          .select('normalized_json, status')
          .eq('document_id', documentId)
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        const txRows = Array.isArray((ocrJob as any)?.normalized_json?.transactions)
          ? (ocrJob as any).normalized_json.transactions
          : [];
        if (txRows.length > 0) {
          normalizedTransactions = txRows.map((tx: any) => ({
            userId: userIdText,
            kind: 'bank' as const,
            date: tx?.date || tx?.posting_date || undefined,
            merchant: tx?.merchant_normalized || tx?.merchant || undefined,
            amount: Number(tx?.amount || 0),
            currency: 'CAD',
            docId: documentId,
            description: tx?.description_raw || tx?.description || undefined,
          }));
          viaMethod = 'ocr';
          usedStructuredArtifacts = true;
        }
      } catch {
        // Non-fatal: continue with existing flow.
      }
    }

    // Try OCR text parsing first (if OCR text exists)
    if (hasOcrText) {
      normalizedTransactions = await normalizeOcrResult(ocrInputText, userIdText, openaiClient, {
        filename: doc.original_name || '',
        includeAllAccounts: options?.includeAllAccounts,
      });
    }

    // If OCR parsing found 0 transactions AND this is an image, try Vision parser as fallback
    const shouldTryVision = isImage && openaiClient && 
      (!hasOcrText || !normalizedTransactions || normalizedTransactions.length === 0);

    if (shouldTryVision) {
      console.log(`[normalize-transactions] OCR found 0 transactions for image ${documentId}, trying Vision parser`);
      
      try {
        const { data: publicUrlData, error: urlError } = await sb.storage
          .from('docs')
          .createSignedUrl(doc.storage_path, 600);

        if (!urlError && publicUrlData) {
          const visionResult = await visionStatementParser(
            userIdText,
            documentId,
            publicUrlData.signedUrl,
            doc.mime_type || 'image/png'
          );

          if (visionResult.parsed.transactions && visionResult.parsed.transactions.length > 0) {
            normalizedTransactions = visionResult.parsed.transactions.map(tx => ({
              userId: userIdText,
              kind: 'bank' as const,
              date: tx.transaction_date || tx.posting_date || undefined,
              merchant: tx.merchant_guess || undefined,
              amount: tx.amount,
              currency: tx.currency || 'CAD',
              docId: documentId,
              description: tx.description,
            }));

            viaMethod = 'vision-parse';
            console.log(`[normalize-transactions] Vision parser extracted ${normalizedTransactions.length} transactions`);
          }
        }
      } catch (visionError: any) {
        console.error('[normalize-transactions] Vision parser failed:', visionError);
      }
    }

    const resolvedImportRunId = importRunId || importRecord.id;

    console.log('[normalize-transactions] Parse summary', {
      importId: importRecord.id,
      documentId,
      userId: userIdText,
      extractedTextLength: Number(options?.transientOcrTextLength || ocrInputText.length || docTextLength || 0),
      extractedTextHash: options?.transientOcrTextHash || safeTextMetrics(ocrInputText).hash || docTextHash,
      normalizedTransactionsLength: normalizedTransactions.length,
      viaMethod,
      source: transientText ? 'transient_ocrText' : (usedStructuredArtifacts ? 'structured_artifacts' : 'none'),
    });

    if (!normalizedTransactions || normalizedTransactions.length === 0) {
      const hasStructuredSignals = Boolean(
        parseInvoiceLike(ocrInputText)?.total ||
        parseReceiptLike(ocrInputText)?.total ||
        parseStatementSummary(ocrInputText)
      );
      await sb
        .from('imports')
        .update({ 
          status: 'parsed', 
          updated_at: new Date().toISOString(),
          error: 'No transactions found'
        })
        .eq('id', importRecord.id);
      await sb
        .from('user_documents')
        .update({
          status: 'needs_review',
          updated_at: new Date().toISOString(),
        })
        .eq('id', documentId);
      if (NORMALIZE_DEBUG_ENABLED) {
        console.log('[normalize-transactions][debug] no transactions path', {
          documentId,
          hadInputText: hasOcrText,
          ocrTextHash: options?.transientOcrTextHash || docTextHash,
          ocrTextLength: Number(options?.transientOcrTextLength || docTextLength || 0),
          hasStructuredSignals,
        });
      }
      return { ok: true, stagedCount: 0, importId: importRecord.id };
    }

    // 4. Convert normalized transactions to staging format
    const stagingRows = normalizedTransactions.map(tx => {
      const isInvoice = tx.kind === 'invoice';
      const hashInput = isInvoice
        ? `${documentId || ''}-${tx.amount || 0}-${tx.date || ''}-${tx.merchant || ''}`
        : `${tx.date || ''}-${tx.amount || 0}-${tx.merchant || ''}`;
      const hash = createHash('sha256').update(hashInput).digest('hex').substring(0, 64);
      const fileName = doc.original_name || 'Invoice';
      const invoiceDescription = `Invoice${tx.invoiceNo ? ` ${tx.invoiceNo}` : ''} - ${fileName}`;
      const description = isInvoice ? invoiceDescription : ((tx as any).description || tx.merchant || 'Transaction');

      if (isInvoice) {
        console.log('[Byte OCR] Staged invoice transaction', { hash, docId: documentId });
      }

      const rawAmount = Number(tx.amount || 0);
      const normalizedAmount = Math.abs(rawAmount);
      const isCreditCardStatement = (tx as any).statementType === 'credit_card';
      const isCreditCardCredit = Boolean((tx as any).statementCredit);
      const type = tx.kind === 'bank'
        ? (isCreditCardStatement && isCreditCardCredit ? 'expense' : (rawAmount < 0 ? 'expense' : 'income'))
        : 'expense';

      return {
        import_id: importRecord.id,
        user_id: userIdText,
        data_json: {
          date: tx.date,
          posted_at: tx.date ? new Date(tx.date).toISOString() : new Date().toISOString(),
          merchant: tx.merchant,
          description: description,
          amount: normalizedAmount,
          type,
          currency: tx.currency || 'CAD',
          category: null,
          confidence: (tx as any).confidence ?? null,
          confidence_flags: (tx as any).confidenceFlags ?? null,
          account_name: (tx as any).accountName ?? null,
          category_source: null,
          importRunId: resolvedImportRunId,
          documentId,
        },
        hash,
      };
    });

    console.log('[normalize-transactions] Staging rows built', {
      count: stagingRows.length,
      sample: stagingRows[0] ? {
        import_id: stagingRows[0].import_id,
        user_id: stagingRows[0].user_id,
        doc_id: stagingRows[0].data_json?.documentId || null,
      } : null,
    });

    // 5. Save to transactions_staging
    if (stagingRows.length > 0) {
      const { error: stagingError } = await sb
        .from('transactions_staging')
        .upsert(stagingRows, { 
          onConflict: 'import_id,hash',
          ignoreDuplicates: false 
        });

      if (stagingError) {
        console.error('[normalize-transactions] Error inserting staging rows:', stagingError);
        await releaseNormalizationLock();
        return { ok: false, error: { code: 'staging_upsert_failed', message: stagingError.message } };
      }
      console.log('[normalize-transactions] staging upsert OK', {
        importId: importRecord.id,
        rowCount: stagingRows.length,
      });
    }

    // 6. Update import status
    await sb
      .from('imports')
      .update({ 
        status: 'parsed', 
        updated_at: new Date().toISOString() 
      })
      .eq('id', importRecord.id);

    // 7. Optional: purge source document + OCR text after normalization
    if (documentId && (AUTO_PURGE_SOURCE || AUTO_PURGE_TEXT)) {
      try {
        const { data: docRow } = await sb
          .from('user_documents')
          .select('id, storage_path')
          .eq('id', documentId)
          .maybeSingle();
        const storagePath = docRow?.storage_path || null;

        if (AUTO_PURGE_SOURCE && storagePath) {
          await sb.storage.from('docs').remove([storagePath]).catch(() => {
            // ignore storage errors
          });
          await sb.storage.from('docs').remove([`${storagePath}.ocr.json`]).catch(() => {
            // ignore missing OCR json
          });
          await sb.storage.from('docs').remove([`${storagePath}.txt`]).catch(() => {
            // ignore missing OCR txt
          });
        }

        const updatePayload: Record<string, any> = {
          updated_at: new Date().toISOString(),
        };
        if (AUTO_PURGE_SOURCE) {
          updatePayload.storage_path = null;
          updatePayload.status = 'purged';
        }
        if (AUTO_PURGE_TEXT) {
          updatePayload.ocr_text = null;
          updatePayload.redacted_text = null;
          updatePayload.redaction_summary = null;
          updatePayload.ocr_engine = null;
          updatePayload.ocr_completed_at = null;
        }

        await sb
          .from('user_documents')
          .update(updatePayload)
          .eq('id', documentId);
      } catch (err: any) {
        console.warn('[normalize-transactions] Auto purge skipped', {
          documentId,
          error: err?.message || String(err),
        });
      }
    }

    // Stamp normalization metadata (no migration safe)
    try {
      const { data: latestDoc } = await sb
        .from('user_documents')
        .select('metadata')
        .eq('id', documentId)
        .maybeSingle();
      const latestMetadata =
        latestDoc?.metadata && typeof latestDoc.metadata === 'object'
          ? (latestDoc.metadata as Record<string, any>)
          : (metadata || {});
      await sb
        .from('user_documents')
        .update({
          metadata: {
            ...latestMetadata,
            normalized_cached: true,
            normalized_at: new Date().toISOString(),
          },
          updated_at: new Date().toISOString(),
        })
        .eq('id', documentId);
    } catch (e) {
      console.warn('[normalize-transactions] metadata stamp failed', e);
    }

    console.log(`[normalize-transactions] Successfully normalized ${stagingRows.length} transactions for import ${importRecord.id}`);
    return { ok: true, stagedCount: stagingRows.length, importId: importRecord.id };
  } catch (error: any) {
    try {
      await releaseNormalizationLock();
    } catch (unlockError: any) {
      console.warn('[normalize-transactions] Failed to release normalization lock', {
        documentId,
        error: unlockError?.message || String(unlockError),
      });
    }
    console.error('[normalize-transactions] Background processing error:', error);
    return { ok: false, error: { code: 'unexpected_error', message: error?.message || 'Unknown error' } };
  }
}

export const handler: Handler = async (event, context) => {
  // Byte Speed Mode v2: Non-blocking background processing
  if (context && typeof context.callbackWaitsForEmptyEventLoop === 'boolean') {
    context.callbackWaitsForEmptyEventLoop = false;
  }
  const t0 = Date.now();
  const headersIn = event?.headers || {};
  const traceId =
    headersIn['x-trace-id'] ||
    headersIn['x-request-id'] ||
    headersIn['X-Trace-Id'] ||
    headersIn['X-Request-Id'] ||
    `trace_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
  const respond = (statusCode: number, payload: Record<string, any>) => {
    const duration_ms = Date.now() - t0;
    return {
      // Contract pinning: keep legacy behavior (HTTP 200) and encode errors in JSON.
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ...payload,
        http_status: statusCode,
        traceId,
        duration_ms,
      }),
    };
  };
  const respondError = (
    statusCode: number,
    code: string,
    message: string,
    extra: Record<string, any> = {}
  ) =>
    respond(statusCode, {
      ok: false,
      error: { code, message },
      ...extra,
    });
  const mergeMetadata = (existing: unknown, patch: Record<string, any>) => {
    const base = existing && typeof existing === 'object' ? (existing as Record<string, any>) : {};
    return { ...base, ...patch };
  };
  const stampNormalizeError = async (docId: string, code: string, message: string): Promise<void> => {
    if (!docId) return;
    try {
      const sb = admin();
      const { data: row } = await sb
        .from('user_documents')
        .select('metadata')
        .eq('id', docId)
        .maybeSingle();
      const metadata = mergeMetadata(row?.metadata, {
        normalize_error: {
          code,
          message: String(message || ''),
          at: new Date().toISOString(),
          traceId,
        },
      });
      await sb
        .from('user_documents')
        .update({ metadata, updated_at: new Date().toISOString() })
        .eq('id', docId);
    } catch {
      // Best effort only; never block API response.
    }
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return respondError(405, 'method_not_allowed', 'Method not allowed. Use POST.');
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { userId, documentId, importRunId, includeAllAccounts, ocrText, ocrTextHash, ocrTextLength } = body;

    if (!userId || !documentId) {
      if (documentId) {
        await stampNormalizeError(documentId, 'missing_required_fields', 'Missing userId or documentId');
      }
      return respondError(400, 'missing_required_fields', 'Missing userId or documentId');
    }
    if (!UUID_V4_RE.test(String(documentId))) {
      return respondError(400, 'invalid_document_id', 'documentId must be a valid UUID');
    }

    const result = await processNormalizationInBackground(userId, documentId, importRunId, {
      includeAllAccounts: Boolean(includeAllAccounts),
      transientOcrText: typeof ocrText === 'string' ? ocrText : '',
      transientOcrTextHash: typeof ocrTextHash === 'string' ? ocrTextHash : null,
      transientOcrTextLength: Number.isFinite(Number(ocrTextLength)) ? Number(ocrTextLength) : undefined,
    });
    if (result.skipped) {
      const duration_ms = Date.now() - t0;
      console.log('[normalize-transactions] done', {
        traceId,
        duration_ms,
        skipped: true,
        reason: result.reason || null,
        ok: Boolean(result.ok),
      });
      return respond(200, {
        ok: Boolean(result.ok),
        skipped: true,
        started: false,
        processing: false,
        completed: Boolean(result.ok),
        reason: result.reason || null,
        importId: result.importId,
        stagedCount: result.stagedCount,
        documentId: result.documentId || documentId,
      });
    }
    if (!result.ok && result.error) {
      const statusCode = result.error.code === 'doc_fetch_failed'
        ? 404
        : result.error.code === 'empty_input_text'
          ? 422
          : result.error.code === 'missing_required_fields'
            ? 400
            : 500;
      await stampNormalizeError(
        documentId,
        result.error.code,
        result.error.message || 'Normalization failed'
      );
      return respondError(
        statusCode,
        result.error.code,
        result.error.message || 'Normalization failed',
        { documentId }
      );
    }
    if (!result.ok) {
      await stampNormalizeError(documentId, 'normalization_failed', 'Normalization failed');
      return respondError(500, 'normalization_failed', 'Normalization failed', { documentId });
    }
    const duration_ms = Date.now() - t0;
    console.log('[normalize-transactions] done', {
      traceId,
      duration_ms,
      skipped: Boolean(result.skipped),
      reason: result.reason || null,
      ok: result.ok,
    });
    return respond(200, {
      ok: result.ok,
      skipped: Boolean(result.skipped),
      // "started" means we actually performed normalization work in this request
      started: Boolean(result.ok && !result.skipped),
      // This handler is synchronous: if we're responding, we are not still processing
      processing: false,
      // "completed" means the handler reached a terminal outcome (success or skip)
      completed: Boolean(result.ok),
      reason: result.reason || null,
      importId: result.importId,
      stagedCount: result.stagedCount,
      documentId: result.documentId || documentId,
    });
  } catch (error: any) {
    console.error('[normalize-transactions] Unexpected error:', error);
    try {
      const parsed = JSON.parse(event?.body || '{}');
      const failedDocumentId = parsed?.documentId;
      if (failedDocumentId) {
        await stampNormalizeError(
          failedDocumentId,
          'internal_server_error',
          error?.message || 'Unknown error'
        );
      }
    } catch {
      // ignore parse failures
    }
    return respondError(500, 'internal_server_error', error?.message || 'Unknown error');
  }
};
