/**
 * Normalize Transactions Netlify Function
 * 
 * Converts OCR text from user_documents into normalized transactions
 * and saves them to transactions_staging table
 */

import type { Handler } from '@netlify/functions';
import { createHash } from 'crypto';
import { admin } from './_shared/supabase.js';
import { normalizeOcrResult } from './_shared/ocr_normalize.js';
import OpenAI from 'openai';
import { visionStatementParser } from './_shared/visionStatementParser.js';

export const handler: Handler = async (event) => {
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

    const sb = admin();

    // 1. Get document and OCR text
    const { data: doc, error: docError } = await sb
      .from('user_documents')
      .select('ocr_text, id, storage_path, mime_type, original_name')
      .eq('id', documentId)
      .single();

    if (docError) {
      console.error('[normalize-transactions] Error fetching document:', docError);
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ ok: false, error: 'Document not found', details: docError.message }),
      };
    }

    if (!doc) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ ok: false, error: 'Document not found' }),
      };
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
      // Continue to create new import record
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
        throw new Error(`Failed to create import record: ${importError.message}`);
      }
      importRecord = newImport;
    }

    // 3. Parse OCR text to transactions using shared normalizer
    // Initialize OpenAI client for AI fallback parser (if API key is available)
    const openaiClient = process.env.OPENAI_API_KEY
      ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
      : null;

    let normalizedTransactions: any[] = [];
    let viaMethod: 'ocr' | 'vision-parse' = 'ocr';

    // Try OCR text parsing first (if OCR text exists)
    if (hasOcrText) {
      // Normalize OCR text to transactions using shared parser
      // If primary parser returns 0 transactions, AI fallback will be used automatically
      normalizedTransactions = await normalizeOcrResult(doc.ocr_text, userId, openaiClient);
    }

    // If OCR parsing found 0 transactions AND this is an image, try Vision parser as fallback
    // Only use Vision parser if:
    // 1. OCR text exists but parsing returned 0 transactions, OR
    // 2. OCR text doesn't exist yet (OCR might have failed or not completed)
    const shouldTryVision = isImage && openaiClient && 
      (!hasOcrText || !normalizedTransactions || normalizedTransactions.length === 0);

    if (shouldTryVision) {
      console.log(`[normalize-transactions] OCR found 0 transactions for image ${documentId}, trying Vision parser`);
      
      try {
        // Get public URL for Vision API
        const { data: publicUrlData, error: urlError } = await sb.storage
          .from('docs')
          .createSignedUrl(doc.storage_path, 600); // 10 min expiry

        if (urlError || !publicUrlData) {
          console.error('[normalize-transactions] Failed to create signed URL for Vision parser:', urlError);
        } else {
          // Call Vision parser
          const visionResult = await visionStatementParser(
            userId,
            documentId,
            publicUrlData.signedUrl,
            doc.mime_type || 'image/png'
          );

          // Convert Vision output to NormalizedTransaction format
          if (visionResult.parsed.transactions && visionResult.parsed.transactions.length > 0) {
            normalizedTransactions = visionResult.parsed.transactions.map(tx => ({
              userId,
              kind: 'bank' as const,
              date: tx.transaction_date || tx.posting_date || undefined,
              merchant: tx.merchant_guess || undefined,
              amount: tx.amount, // Keep sign (positive for charges, negative for payments)
              currency: tx.currency || 'CAD',
              docId: documentId,
              // Store raw description for reference
              description: tx.description,
            }));

            viaMethod = 'vision-parse';
            console.log(`[normalize-transactions] Vision parser extracted ${normalizedTransactions.length} transactions`);
          }
        }
      } catch (visionError: any) {
        console.error('[normalize-transactions] Vision parser failed:', visionError);
        // Continue with empty transactions - don't fail the whole operation
      }
    }

    if (!normalizedTransactions || normalizedTransactions.length === 0) {
      // Update import status to indicate parsing completed but no transactions found
      await sb
        .from('imports')
        .update({ 
          status: 'parsed', 
          updated_at: new Date().toISOString(),
          error: 'No transactions found'
        })
        .eq('id', importRecord.id);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          ok: true, 
          transactionCount: 0, 
          importId: importRecord.id,
          via: viaMethod,
          message: 'No transactions found'
        }),
      };
    }

    // 4. Convert normalized transactions to staging format and compute hashes
    const stagingRows = normalizedTransactions.map(tx => {
      // Create a simple hash for deduplication: date-amount-merchant
      const hashInput = `${tx.date || ''}-${tx.amount || 0}-${tx.merchant || ''}`;
      const hash = createHash('sha256').update(hashInput).digest('hex').substring(0, 64);

      // Use description if available (from Vision parser), otherwise use merchant
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
          category: null, // Will be categorized during commit
          confidence: null,
          category_source: null,
        },
        hash,
      };
    });

    // 5. Save to transactions_staging (upsert to handle duplicates)
    if (stagingRows.length > 0) {
      const { error: stagingError } = await sb
        .from('transactions_staging')
        .upsert(stagingRows, { 
          onConflict: 'import_id,hash',
          ignoreDuplicates: false 
        });

      if (stagingError) {
        console.error('[normalize-transactions] Error inserting staging rows:', stagingError);
        throw new Error(`Failed to insert staging transactions: ${stagingError.message}`);
      }
    }

    // 6. Update import status to 'parsed'
    const { error: updateError } = await sb
      .from('imports')
      .update({ 
        status: 'parsed', 
        updated_at: new Date().toISOString() 
      })
      .eq('id', importRecord.id);

    if (updateError) {
      console.error('[normalize-transactions] Error updating import status:', updateError);
      // Don't fail the whole operation if status update fails
    }

    console.log(`[normalize-transactions] Successfully normalized ${stagingRows.length} transactions for import ${importRecord.id}`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        ok: true, 
        transactionCount: stagingRows.length, 
        importId: importRecord.id,
        via: viaMethod // Indicate which parsing method was used
      }),
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

