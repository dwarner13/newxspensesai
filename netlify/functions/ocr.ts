/**
 * OCR Handler Endpoint
 * 
 * Day 8: OCR & Ingestion Phase 1
 * 
 * Accepts: multipart/form-data (field file) OR { url }
 * Returns: OCRResult with extracted text and parsed JSON
 */

import { Handler } from '@netlify/functions';
import { maskPII } from './_shared/pii';
import { bestEffortOCR } from './_shared/ocr_providers';
import { parseInvoiceLike, parseReceiptLike, parseBankStatementLike, normalizeParsed, ParsedDoc } from './_shared/ocr_parsers';
import { admin } from './_shared/supabase';

// Reuse buildResponseHeaders from chat.ts
function buildResponseHeaders(params: {
  guardrailsActive: boolean;
  piiMaskEnabled: boolean;
  memoryHitTopScore: number | null;
  memoryHitCount: number;
  summaryPresent: boolean;
  summaryWritten: boolean | 'async';
  employee: string;
  routeConfidence: number;
  ocrProvider?: string;
  ocrParse?: string;
}): Record<string, string> {
  const {
    guardrailsActive,
    piiMaskEnabled,
    memoryHitTopScore,
    memoryHitCount,
    summaryPresent,
    summaryWritten,
    employee,
    routeConfidence,
    ocrProvider,
    ocrParse
  } = params;
  
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
    'X-Chat-Backend': 'v2',
    'X-Guardrails': guardrailsActive ? 'active' : 'inactive',
    'X-PII-Mask': piiMaskEnabled ? 'enabled' : 'disabled',
    'X-Memory-Hit': memoryHitTopScore?.toFixed(2) ?? '0',
    'X-Memory-Count': String(memoryHitCount),
    'X-Session-Summary': summaryPresent ? 'present' : 'absent',
    'X-Session-Summarized': summaryWritten === true ? 'yes' : summaryWritten === false ? 'no' : 'async',
    'X-Employee': employee,
    'X-Route-Confidence': routeConfidence.toFixed(2),
    ...(ocrProvider && { 'X-OCR-Provider': ocrProvider }),
    ...(ocrParse && { 'X-OCR-Parse': ocrParse })
  };
}

export interface OCRResult {
  source: 'upload' | 'url';
  mime: string;
  bytes: number;
  text: string; // raw extracted text (masked for PII v1)
  pages?: Array<{ index: number; text: string }>;
  meta: {
    width?: number;
    height?: number;
    ocr: 'local' | 'ocrspace' | 'vision' | 'none';
    duration_ms: number;
  };
  parsed: ParsedDoc | null; // normalized JSON
  warnings?: string[];
}

export const handler: Handler = async (event, context) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: ''
    };
  }
  
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: buildResponseHeaders({
        guardrailsActive: true,
        piiMaskEnabled: true,
        memoryHitTopScore: null,
        memoryHitCount: 0,
        summaryPresent: false,
        summaryWritten: false,
        employee: 'byte',
        routeConfidence: 1.0
      }),
      body: JSON.stringify({ ok: false, error: 'Method not allowed' })
    };
  }
  
  try {
    const contentType = event.headers['content-type'] || '';
    let fileBytes: Buffer | undefined;
    let url: string | undefined;
    let mime = 'application/octet-stream';
    let userId = event.headers['x-user-id'] || 'anonymous';
    let convoId = event.headers['x-convo-id'] || `ocr-${Date.now()}`;
    
    // Parse input
    if (contentType.includes('multipart/form-data')) {
      // Parse multipart form data
      const boundary = contentType.split('boundary=')[1];
      if (!boundary) {
        throw new Error('Invalid multipart form data');
      }
      
      const parts = event.body?.split(`--${boundary}`) || [];
      for (const part of parts) {
        if (part.includes('Content-Disposition: form-data; name="file"')) {
          const filePart = part.split('\r\n\r\n')[1];
          if (filePart) {
            fileBytes = Buffer.from(filePart, 'base64');
            
            // Extract mime type from Content-Type header
            const contentTypeMatch = part.match(/Content-Type:\s*([^\r\n]+)/i);
            if (contentTypeMatch) {
              mime = contentTypeMatch[1].trim();
            }
          }
        }
      }
      
      if (!fileBytes) {
        throw new Error('No file provided in multipart form data');
      }
    } else if (contentType.includes('application/json')) {
      // Parse JSON body
      const body = JSON.parse(event.body || '{}');
      url = body.url;
      
      if (!url) {
        throw new Error('No url provided in JSON body');
      }
      
      userId = body.userId || userId;
      convoId = body.convoId || convoId;
      mime = body.mime || 'application/octet-stream';
    } else {
      throw new Error('Unsupported content type. Use multipart/form-data or application/json');
    }
    
    // Perform OCR
    const ocrStartTime = Date.now();
    const ocrResult = await bestEffortOCR({
      bytes: fileBytes,
      url: url
    });
    
    if (!ocrResult.result) {
      return {
        statusCode: 200,
        headers: buildResponseHeaders({
          guardrailsActive: true,
          piiMaskEnabled: true,
          memoryHitTopScore: null,
          memoryHitCount: 0,
          summaryPresent: false,
          summaryWritten: false,
          employee: 'byte',
          routeConfidence: 1.0,
          ocrProvider: 'none',
          ocrParse: 'none'
        }),
        body: JSON.stringify({
          ok: false,
          error: 'OCR failed',
          warnings: ocrResult.warnings
        } as OCRResult)
      };
    }
    
    // Mask PII in extracted text
    const rawText = ocrResult.result.text;
    const maskedText = maskPII(rawText, 'full').masked;
    
    // Parse text into structured JSON
    let parsed: ParsedDoc | null = null;
    let parseKind: string = 'none';
    
    try {
      // Try parsing as invoice
      const invoiceData = parseInvoiceLike(rawText);
      if (invoiceData.vendor || invoiceData.invoice_no || invoiceData.total) {
        parsed = normalizeParsed(invoiceData);
        parseKind = parsed.kind;
      } else {
        // Try parsing as receipt
        const receiptData = parseReceiptLike(rawText);
        if (receiptData.merchant || receiptData.items || receiptData.total) {
          parsed = normalizeParsed(receiptData);
          parseKind = parsed.kind;
        } else {
          // Try parsing as bank statement
          const bankData = parseBankStatementLike(rawText);
          parsed = normalizeParsed(bankData);
          parseKind = parsed.kind;
        }
      }
    } catch (parseErr) {
      console.warn('[OCR] Parse error:', parseErr);
      parseKind = 'none';
    }
    
    // Build result
    const result: OCRResult = {
      source: fileBytes ? 'upload' : 'url',
      mime,
      bytes: fileBytes?.length || 0,
      text: maskedText,
      pages: ocrResult.result.pages,
      meta: {
        ...ocrResult.result.meta,
        duration_ms: Date.now() - ocrStartTime
      },
      parsed,
      warnings: ocrResult.warnings.length > 0 ? ocrResult.warnings : undefined
    };
    
    // Store to Supabase storage (optional, non-blocking)
    if (fileBytes && process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const sb = admin();
        const storagePath = `ocr/${userId}/${convoId}/${Date.now()}.${mime.split('/')[1] || 'bin'}`;
        
        // Upload to storage bucket (if bucket exists)
        // Note: This is a stub - actual storage upload requires Supabase storage client
        // TODO: Implement actual storage upload
        
        // Log document row (idempotent)
        await sb.from('documents').insert({
          user_id: userId,
          convo_id: convoId,
          source: result.source,
          mime_type: mime,
          bytes: result.bytes,
          storage_path: storagePath,
          created_at: new Date().toISOString()
        }).catch(() => {
          // Non-blocking: ignore if table doesn't exist or insert fails
        });
      } catch (storageErr) {
        console.warn('[OCR] Storage failed (non-blocking):', storageErr);
      }
    }
    
    // Check if client wants SSE
    const acceptHeader = event.headers['accept'] || '';
    if (acceptHeader.includes('text/event-stream')) {
      // Return SSE response
      const encoder = new TextEncoder();
      const sseData = `data: ${JSON.stringify({ ok: true, ...result })}\n\n`;
      
      return {
        statusCode: 200,
        headers: {
          ...buildResponseHeaders({
            guardrailsActive: true,
            piiMaskEnabled: true,
            memoryHitTopScore: null,
            memoryHitCount: 0,
            summaryPresent: false,
            summaryWritten: false,
            employee: 'byte',
            routeConfidence: 1.0,
            ocrProvider: ocrResult.provider,
            ocrParse: parseKind
          }),
          'Content-Type': 'text/event-stream; charset=utf-8',
          'Cache-Control': 'no-cache, no-transform',
          Connection: 'keep-alive'
        },
        body: sseData
      };
    }
    
    // Return JSON response
    return {
      statusCode: 200,
      headers: buildResponseHeaders({
        guardrailsActive: true,
        piiMaskEnabled: true,
        memoryHitTopScore: null,
        memoryHitCount: 0,
        summaryPresent: false,
        summaryWritten: false,
        employee: 'byte',
        routeConfidence: 1.0,
        ocrProvider: ocrResult.provider,
        ocrParse: parseKind
      }),
      body: JSON.stringify({ ok: true, ...result })
    };
  } catch (error: any) {
    console.error('[OCR] Error:', error);
    return {
      statusCode: 500,
      headers: buildResponseHeaders({
        guardrailsActive: true,
        piiMaskEnabled: true,
        memoryHitTopScore: null,
        memoryHitCount: 0,
        summaryPresent: false,
        summaryWritten: false,
        employee: 'byte',
        routeConfidence: 1.0,
        ocrProvider: 'none',
        ocrParse: 'none'
      }),
      body: JSON.stringify({ ok: false, error: error.message || 'OCR processing failed' })
    };
  }
};

