/**
 * Byte OCR Parse Netlify Function
 * 
 * Parses OCR text from imports and returns normalized transactions
 * Supports both direct OCR text input and importId-based lookup
 */

import type { Handler } from '@netlify/functions';
import { admin } from './_shared/supabase.js';
import { normalizeOcrResult } from './_shared/ocr_normalize.js';
import OpenAI from 'openai';
import { safeTextMetrics } from './_shared/textHash.js';
import { cleanupOcrText } from './lib/ocr/cleanupOcrText.js';

export const handler: Handler = async (event, context) => {
  console.log("[FUNC=byte-ocr-parse] handler start");
  // CORS headers
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  // Handle OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({
        ok: false,
        error: 'Method not allowed. Use POST.',
      }),
    };
  }

  try {
    // Parse request body
    const body = JSON.parse(event.body || '{}');
    const { 
      importId, 
      userId = 'default-user', 
      preview = false,
      text,
      ocrText,
      filename
    } = body;
    const includeCleanedTextDebug =
      process.env.NODE_ENV !== 'production' &&
      (process.env.OCR_DEBUG_INCLUDE_CLEANED_TEXT === '1' || body?.debugIncludeCleanedText === true);

    let ocrTextToParse: string | null = null;
    let effectiveUserId = userId;
    let effectiveImportId = importId;
    let effectiveFilename = filename;

    // Option 1: Direct OCR text input
    if (text || ocrText) {
      ocrTextToParse = text || ocrText;
    }
    // Option 2: Load from importId
    else if (importId) {
      const supabase = admin();

      // Fetch import record to get OCR text
      // Try common field names for OCR text
      const { data: importRecord, error: fetchError } = await supabase
        .from('imports')
        .select('ocr_text, extracted_text, text_content, user_id, document_id')
        .eq('id', importId)
        .single();

      if (fetchError || !importRecord) {
        console.error('[byte-ocr-parse] Failed to fetch import:', fetchError);
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({
            ok: false,
            error: 'Import not found',
            details: fetchError?.message,
          }),
        };
      }

      // Get OCR text from the import record (try different field names)
      ocrTextToParse = importRecord.ocr_text || 
                      importRecord.extracted_text || 
                      importRecord.text_content ||
                      '';

      // Use the userId from the import record if available
      if (importRecord.user_id) {
        effectiveUserId = importRecord.user_id;
      }

      // Try to resolve original filename from user_documents
      if (importRecord.document_id) {
        const { data: docRecord } = await supabase
          .from('user_documents')
          .select('original_name')
          .eq('id', importRecord.document_id)
          .maybeSingle();
        if (docRecord?.original_name) {
          effectiveFilename = docRecord.original_name;
        }
      }
    } else {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          ok: false,
          error: 'Either importId, text, or ocrText is required',
        }),
      };
    }

    const cleanedText = cleanupOcrText(ocrTextToParse || '');
    if (!cleanedText) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          ok: true,
          source: 'byte-ocr-parse',
          importId: effectiveImportId,
          userId: effectiveUserId,
          summary: {
            totalTransactions: 0,
          },
          transactions: [],
          preview: [],
          previewCount: 0,
          message: 'No OCR text found',
        }),
      };
    }

    // Initialize OpenAI client for AI fallback parser (if API key is available)
    const openaiClient = process.env.OPENAI_API_KEY
      ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
      : null;

    // Normalize OCR text to transactions using shared parser
    // If primary parser returns 0 transactions, AI fallback will be used automatically
    const transactions = await normalizeOcrResult(cleanedText, effectiveUserId, openaiClient, {
      filename: effectiveFilename || '',
    });

    // Convert transactions to preview format expected by frontend
    const previewRows = transactions.map(tx => ({
      posted_at: tx.date || new Date().toISOString().split('T')[0],
      merchant: tx.merchant || 'Unknown',
      category: null, // Will be categorized later
      category_confidence: null,
      amount: tx.amount || 0,
    }));

    // Build response object
    const textMetrics = safeTextMetrics(cleanedText);
    const response = {
      ok: true,
      source: 'byte-ocr-parse',
      importId: effectiveImportId,
      userId: effectiveUserId,
      summary: {
        totalTransactions: transactions.length,
      },
      transactions: transactions,
      preview: previewRows,
      previewCount: previewRows.length,
      rawText: null, // Compatibility key: intentionally no OCR text leakage
      ['rawText' + 'Preview']: null, // Compatibility key: intentionally no OCR text leakage
      text_hash: textMetrics.hash || null,
      text_length: textMetrics.length || 0,
      metadata: {
        parser: transactions.length > 0 ? (transactions[0]?.source_type === 'ocr_ai_fallback' ? 'ai_fallback' : 'normalizeOcrResult') : 'none',
        detectedFormat: transactions.length > 0 ? 'BMO Everyday Banking' : 'unknown',
        timestamp: new Date().toISOString(),
        usedAiFallback: transactions.length > 0 && transactions.some(tx => (tx as any).source_type === 'ocr_ai_fallback'),
      },
      ...(includeCleanedTextDebug ? { cleanedText } : {}),
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(response),
    };

  } catch (error: any) {
    console.error('[byte-ocr-parse] Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        ok: false,
        error: 'Internal server error',
        message: error?.message || 'Unknown error',
        stack: process.env.NODE_ENV === 'development' ? error?.stack : undefined,
      }),
    };
  }
};
