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

type ExtractedSummary = Record<string, any> | null;
type NormalizationResult = {
  ok: boolean;
  skipped?: boolean;
  error?: { code: string; message: string };
  stagedCount?: number;
  importId?: string;
};

function collapseWhitespace(input: string): string {
  return input.replace(/\s+/g, ' ').trim();
}

function previewText(input: string, length: number): string {
  return collapseWhitespace(input).slice(0, length);
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
  importRunId?: string
): Promise<NormalizationResult> {
  const sb = admin();
  const userIdText = String(userId);
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(userIdText);

  if (!userId || !documentId) {
    console.error('[normalize-transactions] Missing userId or documentId');
    return { ok: false, error: { code: 'missing_required_fields', message: 'Missing userId or documentId' } };
  }
  if (!isUuid) {
    console.error('[normalize-transactions] Invalid userId (expected UUID)', { userId: userIdText });
    return { ok: false, error: { code: 'invalid_user_id', message: 'Invalid userId (expected UUID)' } };
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
    const { data: doc, error: docError } = await sb
      .from('user_documents')
      .select('ocr_text, id, storage_path, mime_type, original_name')
      .eq('id', documentId)
      .single();

    if (docError || !doc) {
      console.error('[normalize-transactions] Error fetching document:', docError);
      return { ok: false, error: { code: 'doc_fetch_failed', message: docError?.message || 'Failed to fetch document' } };
    }

    // Check if this is an image that might need Vision parsing
    const isImage = doc.mime_type?.startsWith('image/') || false;
    const hasOcrText = doc.ocr_text && doc.ocr_text.trim().length > 0;

    // 2. Find or create imports record
    let { data: importRecord, error: importFetchError } = await sb
      .from('imports')
      .select('id, status')
      .eq('document_id', documentId)
      .maybeSingle();

    if (importFetchError) {
      console.error('[normalize-transactions] Error fetching import:', importFetchError);
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
        .select('id, status')
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
      console.log('[normalize-transactions] Normalization lock not acquired, skipping', {
        importId: importRecord.id,
      });
      return { ok: true, skipped: true, stagedCount: 0, importId: importRecord.id };
    }
    lockAcquired = true;

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

    // Try OCR text parsing first (if OCR text exists)
    if (hasOcrText) {
      normalizedTransactions = await normalizeOcrResult(doc.ocr_text, userIdText, openaiClient, {
        filename: doc.original_name || '',
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
      extractedTextLength: doc.ocr_text?.length || 0,
      normalizedTransactionsLength: normalizedTransactions.length,
      viaMethod,
    });

    if (!normalizedTransactions || normalizedTransactions.length === 0) {
      if (doc.ocr_text) {
        console.log('[normalize-transactions] OCR text preview (no transactions)', {
          preview: previewText(doc.ocr_text, 600),
        });
      }
      const extractedData = (() => {
        if (!doc.ocr_text) return null;
        const invoice = parseInvoiceLike(doc.ocr_text);
        if (invoice && (invoice.total || invoice.vendor || invoice.invoice_no)) {
          return {
            docType: 'invoice',
            vendor: invoice.vendor,
            invoice_no: invoice.invoice_no,
            date: invoice.date,
            subtotal: invoice.subtotal,
            tax: invoice.tax,
            total: invoice.total,
            currency: invoice.currency,
          };
        }
        const receipt = parseReceiptLike(doc.ocr_text);
        if (receipt && (receipt.total || receipt.merchant)) {
          return {
            docType: 'receipt',
            merchant: receipt.merchant,
            date: receipt.date,
            total: receipt.total,
            taxes: receipt.taxes,
            payment: receipt.payment,
          };
        }
        const statement = parseStatementSummary(doc.ocr_text);
        if (statement) {
          return statement;
        }
        return null;
      })();
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
          extracted_data: extractedData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', documentId);
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

      return {
        import_id: importRecord.id,
        user_id: userIdText,
        data_json: {
          date: tx.date,
          posted_at: tx.date ? new Date(tx.date).toISOString() : new Date().toISOString(),
          merchant: tx.merchant,
          description: description,
          amount: tx.amount || 0,
          type: tx.amount && tx.amount < 0 ? 'income' : 'expense',
          currency: tx.currency || 'CAD',
          category: null,
          confidence: null,
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

    const invoiceTx = normalizedTransactions.find(tx => tx.kind === 'invoice' && tx.amount);
    if (invoiceTx) {
      try {
        const { error: extractedError } = await sb
          .from('user_documents')
          .update({
            extracted_data: {
              docType: 'invoice',
              vendor: invoiceTx.merchant || null,
              invoiceNo: invoiceTx.invoiceNo || null,
              date: invoiceTx.date || null,
              total: invoiceTx.amount || null,
              currency: invoiceTx.currency || 'CAD',
            },
            updated_at: new Date().toISOString(),
          })
          .eq('id', documentId);
        if (extractedError) {
          console.warn('[normalize-transactions] extracted_data update skipped:', extractedError.message);
        } else {
          console.log('[normalize-transactions] extracted_data saved for invoice', { documentId });
        }
      } catch (err: any) {
        console.warn('[normalize-transactions] extracted_data update failed:', err?.message || err);
      }
    }

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
  
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

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

  try {
    const body = JSON.parse(event.body || '{}');
    const { userId, documentId, importRunId } = body;

    if (!userId || !documentId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ ok: false, error: 'Missing userId or documentId' }),
      };
    }

    const result = await processNormalizationInBackground(userId, documentId, importRunId);
    if (!result.ok && result.error?.code === 'staging_upsert_failed') {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          ok: false,
          error: 'staging_upsert_failed',
          message: result.error.message,
        }),
      };
    }
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ started: true, processing: true, importId: result.importId, stagedCount: result.stagedCount }),
    };
  } catch (error: any) {
    console.error('[normalize-transactions] Unexpected error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        ok: false, 
        error: 'Internal server error',
        message: error?.message || 'Unknown error',
      }),
    };
  }
};
