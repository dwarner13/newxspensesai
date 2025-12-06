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
import OpenAI from 'openai';
import { visionStatementParser } from './_shared/visionStatementParser.js';

/**
 * Byte Speed Mode v2: Background normalization processing
 * Processes transactions asynchronously without blocking the response
 */
async function processNormalizationInBackground(userId: string, documentId: string) {
  const sb = admin();

  if (!userId || !documentId) {
    console.error('[normalize-transactions] Missing userId or documentId');
    return;
  }

  try {
    // 1. Get document and OCR text
    const { data: doc, error: docError } = await sb
      .from('user_documents')
      .select('ocr_text, id, storage_path, mime_type, original_name')
      .eq('id', documentId)
      .single();

    if (docError || !doc) {
      console.error('[normalize-transactions] Error fetching document:', docError);
      return;
    }

    // Check if this is an image that might need Vision parsing
    const isImage = doc.mime_type?.startsWith('image/') || false;
    const hasOcrText = doc.ocr_text && doc.ocr_text.trim().length > 0;

    // 2. Find or create imports record
    let { data: importRecord, error: importFetchError } = await sb
      .from('imports')
      .select('id')
      .eq('document_id', documentId)
      .maybeSingle();

    if (importFetchError) {
      console.error('[normalize-transactions] Error fetching import:', importFetchError);
    }

    if (!importRecord) {
      const { data: newImport, error: importError } = await sb
        .from('imports')
        .insert({
          user_id: userId,
          document_id: documentId,
          file_url: doc.storage_path || '',
          file_type: doc.mime_type || 'application/pdf',
          status: 'parsing',
        })
        .select('id')
        .single();

      if (importError) {
        console.error('[normalize-transactions] Error creating import:', importError);
        return;
      }
      importRecord = newImport;
    }

    // 3. Parse OCR text to transactions using shared normalizer
    const openaiClient = process.env.OPENAI_API_KEY
      ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
      : null;

    let normalizedTransactions: any[] = [];
    let viaMethod: 'ocr' | 'vision-parse' = 'ocr';

    // Try OCR text parsing first (if OCR text exists)
    if (hasOcrText) {
      normalizedTransactions = await normalizeOcrResult(doc.ocr_text, userId, openaiClient);
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
            userId,
            documentId,
            publicUrlData.signedUrl,
            doc.mime_type || 'image/png'
          );

          if (visionResult.parsed.transactions && visionResult.parsed.transactions.length > 0) {
            normalizedTransactions = visionResult.parsed.transactions.map(tx => ({
              userId,
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

    if (!normalizedTransactions || normalizedTransactions.length === 0) {
      await sb
        .from('imports')
        .update({ 
          status: 'parsed', 
          updated_at: new Date().toISOString(),
          error: 'No transactions found'
        })
        .eq('id', importRecord.id);
      return;
    }

    // 4. Convert normalized transactions to staging format
    const stagingRows = normalizedTransactions.map(tx => {
      const hashInput = `${tx.date || ''}-${tx.amount || 0}-${tx.merchant || ''}`;
      const hash = createHash('sha256').update(hashInput).digest('hex').substring(0, 64);
      const description = (tx as any).description || tx.merchant || 'Transaction';

      return {
        import_id: importRecord.id,
        user_id: userId,
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
        },
        hash,
      };
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
        return;
      }
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
  } catch (error: any) {
    console.error('[normalize-transactions] Background processing error:', error);
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
    const { userId, documentId } = body;

    if (!userId || !documentId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ ok: false, error: 'Missing userId or documentId' }),
      };
    }

    // Byte Speed Mode v2: Return immediately, process in background
    // Fire normalization asynchronously - don't wait for completion
    processNormalizationInBackground(userId, documentId).catch((error) => {
      console.error('[normalize-transactions] Background processing error:', error);
    });
    
    // Return immediately - Byte can chat while normalization processes
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ started: true, processing: true }),
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
