/**
 * 📄 OCR Endpoint
 * 
 * POST /ocr
 * - Accepts: multipart/form-data (file) OR JSON { url }
 * - Pre-checks: file size (15MB max), MIME type (magic bytes)
 * - Post-OCR: guardrails moderation on extracted text
 * - Returns: OCRResult with parsed JSON
 */

import type { Handler } from '@netlify/functions';
import { admin } from './_shared/supabase';
import { maskPII } from './_shared/pii';
import { applyGuardrails } from './_shared/guardrails';
import { rateLimit, getRateLimitKey } from './_shared/rate_limit';
import crypto from 'crypto';

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
  transactionsSaved?: number;
  categorizer?: string;
  vendorMatched?: boolean;
  xpAwarded?: number;
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
    ocrParse,
    transactionsSaved,
    categorizer,
    vendorMatched,
    xpAwarded
  } = params;
  
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
    'X-Chat-Backend': 'v2',
    'X-Guardrails': guardrailsActive ? 'active' : 'blocked',
    'X-PII-Mask': piiMaskEnabled ? 'enabled' : 'disabled',
    'X-Memory-Hit': memoryHitTopScore?.toFixed(2) ?? '0',
    'X-Memory-Count': String(memoryHitCount),
    'X-Session-Summary': summaryPresent ? 'present' : 'absent',
    'X-Session-Summarized': summaryWritten === true ? 'yes' : summaryWritten === false ? 'no' : 'async',
    'X-Employee': employee,
    'X-Route-Confidence': routeConfidence.toFixed(2),
    ...(ocrProvider && { 'X-OCR-Provider': ocrProvider }),
    ...(ocrParse && { 'X-OCR-Parse': ocrParse }),
    ...(transactionsSaved !== undefined && { 'X-Transactions-Saved': String(transactionsSaved) }),
    ...(categorizer && { 'X-Categorizer': categorizer }),
    ...(vendorMatched !== undefined && { 'X-Vendor-Matched': vendorMatched ? 'yes' : 'no' }),
    ...(xpAwarded !== undefined && { 'X-XP-Awarded': String(xpAwarded) })
  };
}

// Constants
const MAX_SIZE = 15 * 1024 * 1024; // 15MB
const ALLOWED_MIMES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/tiff',
  'image/tif'
];

// Magic bytes for MIME detection
const MAGIC_BYTES: Record<string, number[][]> = {
  pdf: [[0x25, 0x50, 0x44, 0x46]], // %PDF
  png: [[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]], // PNG signature
  jpeg: [[0xFF, 0xD8, 0xFF]], // JPEG signature
  webp: [[0x52, 0x49, 0x46, 0x46], [0x57, 0x45, 0x42, 0x50]], // RIFF...WEBP
  tiff: [[0x49, 0x49, 0x2A, 0x00], [0x4D, 0x4D, 0x00, 0x2A]], // TIFF (little/big endian)
};

/**
 * Detect MIME type from magic bytes
 */
function detectMimeFromMagicBytes(bytes: Buffer): string | null {
  if (bytes.length < 4) return null;
  
  // PDF
  if (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) {
    return 'application/pdf';
  }
  
  // PNG
  if (bytes.length >= 8 && 
      bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47 &&
      bytes[4] === 0x0D && bytes[5] === 0x0A && bytes[6] === 0x1A && bytes[7] === 0x0A) {
    return 'image/png';
  }
  
  // JPEG
  if (bytes.length >= 3 && bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) {
    return 'image/jpeg';
  }
  
  // WebP (RIFF...WEBP)
  if (bytes.length >= 12 &&
      bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
      bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) {
    return 'image/webp';
  }
  
  // TIFF (little endian)
  if (bytes.length >= 4 && 
      bytes[0] === 0x49 && bytes[1] === 0x49 && bytes[2] === 0x2A && bytes[3] === 0x00) {
    return 'image/tiff';
  }
  
  // TIFF (big endian)
  if (bytes.length >= 4 && 
      bytes[0] === 0x4D && bytes[1] === 0x4D && bytes[2] === 0x00 && bytes[3] === 0x2A) {
    return 'image/tiff';
  }
  
  return null;
}

/**
 * Parse multipart/form-data
 */
async function parseMultipart(event: any): Promise<{ file: Buffer; filename: string; mime: string } | null> {
  if (!event.body) return null;
  
  const contentType = event.headers['content-type'] || event.headers['Content-Type'] || '';
  if (!contentType.includes('multipart/form-data')) {
    return null;
  }
  
  // Extract boundary
  const boundaryMatch = contentType.match(/boundary=([^;]+)/);
  if (!boundaryMatch) return null;
  
  const boundary = `--${boundaryMatch[1].trim()}`;
  const body = Buffer.from(event.body, event.isBase64Encoded ? 'base64' : 'utf8');
  
  // Split by boundary
  const parts = body.toString('binary').split(boundary);
  
  for (const part of parts) {
    if (!part.includes('Content-Disposition')) continue;
    
    // Extract filename
    const filenameMatch = part.match(/filename="([^"]+)"/);
    const filename = filenameMatch ? filenameMatch[1] : 'upload';
    
    // Extract content type from part headers
    const contentTypeMatch = part.match(/Content-Type:\s*([^\r\n]+)/i);
    const partMime = contentTypeMatch ? contentTypeMatch[1].trim() : 'application/octet-stream';
    
    // Extract file content (after headers, before next boundary)
    const headerEnd = part.indexOf('\r\n\r\n');
    if (headerEnd === -1) continue;
    
    const content = part.slice(headerEnd + 4);
    const fileBuffer = Buffer.from(content, 'binary');
    
    return { file: fileBuffer, filename, mime: partMime };
  }
  
  return null;
}

/**
 * Extract userId from headers or query
 */
function extractUserId(event: any): string {
  const headerUserId = event.headers?.['x-user-id'] || event.headers?.['X-User-Id'];
  if (headerUserId) return headerUserId;
  
  const queryUserId = event.queryStringParameters?.userId;
  if (queryUserId) return queryUserId;
  
  // Default for testing (should be replaced with actual auth)
  return 'test-user';
}

export const handler: Handler = async (event) => {
  // CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, X-User-Id',
      },
      body: '',
    };
  }

  // Only POST supported
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
        routeConfidence: 0.8,
      }),
      body: JSON.stringify({ ok: false, error: 'Method not allowed' }),
    };
  }

  // ========================================================================
  // RATE LIMITING (apply at top)
  // ========================================================================
  const userId = extractUserId(event);
  const rateLimitKey = getRateLimitKey(event, userId);
  const rateLimitResult = await rateLimit({ key: rateLimitKey, limit: 30, windowMs: 60000 });
  
  if (!rateLimitResult.ok) {
    return {
      statusCode: 429,
      headers: {
        'Content-Type': 'application/json',
        'X-RateLimit-Limit': '30',
        'X-RateLimit-Remaining': String(rateLimitResult.remaining),
        'X-RateLimit-Reset': new Date(rateLimitResult.resetAt).toISOString(),
      },
      body: JSON.stringify({ ok: false, error: 'rate_limited' }),
    };
  }
  let fileBytes: Buffer | null = null;
  let detectedMime: string | null = null;
  let provider = 'none';
  let ocrText = '';
  let parsed: any = null;

  try {
    // ========================================================================
    // PRE-CHECKS: File Size & MIME Type
    // ========================================================================
    
    // Parse multipart/form-data
    const multipart = await parseMultipart(event);
    
    if (!multipart) {
      // Try JSON body with URL
      try {
        const body = JSON.parse(event.body || '{}');
        if (body.url) {
          // TODO: Fetch from URL (future)
          return {
            statusCode: 400,
            headers: buildResponseHeaders({
              guardrailsActive: true,
              piiMaskEnabled: true,
              memoryHitTopScore: null,
              memoryHitCount: 0,
              summaryPresent: false,
              summaryWritten: false,
              employee: 'byte',
              routeConfidence: 0.8,
            }),
            body: JSON.stringify({ ok: false, error: 'URL-based OCR not yet implemented' }),
          };
        }
      } catch (e) {
        // Not JSON, continue
      }
      
      return {
        statusCode: 400,
        headers: buildResponseHeaders({
          guardrailsActive: true,
          piiMaskEnabled: true,
          memoryHitTopScore: null,
          memoryHitCount: 0,
          summaryPresent: false,
          summaryWritten: false,
          employee: 'byte',
          routeConfidence: 0.8,
        }),
        body: JSON.stringify({ ok: false, error: 'No file provided' }),
      };
    }
    
    fileBytes = multipart.file;
    const declaredMime = multipart.mime.toLowerCase();
    
    // Check file size
    if (fileBytes.length > MAX_SIZE) {
      return {
        statusCode: 413,
        headers: buildResponseHeaders({
          guardrailsActive: true,
          piiMaskEnabled: true,
          memoryHitTopScore: null,
          memoryHitCount: 0,
          summaryPresent: false,
          summaryWritten: false,
          employee: 'byte',
          routeConfidence: 0.8,
        }),
        body: JSON.stringify({ ok: false, error: `File too large (max ${MAX_SIZE / 1024 / 1024}MB)` }),
      };
    }
    
    // Detect MIME from magic bytes
    detectedMime = detectMimeFromMagicBytes(fileBytes);
    
    // Validate MIME
    const allowedMime = detectedMime || declaredMime;
    if (!ALLOWED_MIMES.includes(allowedMime)) {
      return {
        statusCode: 400,
        headers: buildResponseHeaders({
          guardrailsActive: true,
          piiMaskEnabled: true,
          memoryHitTopScore: null,
          memoryHitCount: 0,
          summaryPresent: false,
          summaryWritten: false,
          employee: 'byte',
          routeConfidence: 0.8,
        }),
        body: JSON.stringify({ 
          ok: false, 
          error: `Unsupported file type: ${allowedMime}. Allowed: ${ALLOWED_MIMES.join(', ')}` 
        }),
      };
    }
    
    // ========================================================================
    // OCR PROCESSING (Stub for now - will call providers)
    // ========================================================================
    
    // TODO: Call OCR providers (Day 8 implementation)
    // For now, return stub text
    ocrText = 'OCR text extraction stub - implement providers in Day 8';
    provider = 'local';
    
    // ========================================================================
    // POST-OCR: Guardrails Moderation
    // ========================================================================
    
    // Mask PII first (returns MaskResult with .masked property)
    const maskResult = maskPII(ocrText, 'full');
    const maskedText = maskResult.masked;
    
    // Apply guardrails with moderation (strict preset for OCR ingestion)
    const guardrailOutcome = await applyGuardrails(maskedText, {
      preset: 'strict',
      moderation: true,
      pii: true,
      strict: true, // Block on moderation failure
    }, userId);
    
    // Check if blocked
    if (!guardrailOutcome.ok) {
      // Log guardrail event (non-blocking)
      try {
        const contentHash = crypto
          .createHash('sha256')
          .update(maskedText.slice(0, 256))
          .digest('hex')
          .slice(0, 24);
        
        await admin()
          .from('guardrail_events')
          .insert({
            user_id: userId,
            stage: 'ocr',
            rule_type: 'moderation',
            action: 'blocked',
            severity: 3,
            content_hash: contentHash,
            provider: provider,
            blocked: true,
            meta: {
              reasons: guardrailOutcome.reasons || [],
            },
            created_at: new Date().toISOString(),
          });
      } catch (logErr) {
        console.warn('[OCR] Guardrail logging failed (non-blocking):', logErr);
      }
      
      return {
        statusCode: 422,
        headers: buildResponseHeaders({
          guardrailsActive: false, // Blocked
          piiMaskEnabled: true,
          memoryHitTopScore: null,
          memoryHitCount: 0,
          summaryPresent: false,
          summaryWritten: false,
          employee: 'byte',
          routeConfidence: 0.8,
          ocrProvider: provider,
        }),
        body: JSON.stringify({ ok: false, error: 'Guardrails: blocked' }),
      };
    }
    
    // Log successful guardrail check (non-blocking)
    try {
      const contentHash = crypto
        .createHash('sha256')
        .update(maskedText.slice(0, 256))
        .digest('hex')
        .slice(0, 24);
      
      await admin()
        .from('guardrail_events')
        .insert({
          user_id: userId,
          stage: 'ocr',
          rule_type: 'moderation',
          action: 'allowed',
          severity: 1,
          content_hash: contentHash,
          provider: provider,
          blocked: false,
          meta: {},
          created_at: new Date().toISOString(),
        });
    } catch (logErr) {
      console.warn('[OCR] Guardrail logging failed (non-blocking):', logErr);
    }
    
    // ========================================================================
    // PARSING (Stub for now - will parse in Day 8)
    // ========================================================================
    
    // TODO: Parse OCR text (Day 8 implementation)
    parsed = null;
    const ocrParse = parsed ? parsed.kind : 'none';
    
    // ========================================================================
    // RESPONSE
    // ========================================================================
    
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
        routeConfidence: 0.8,
        ocrProvider: provider,
        ocrParse: ocrParse,
      }),
      body: JSON.stringify({
        ok: true,
        source: 'upload',
        mime: allowedMime,
        bytes: fileBytes.length,
        text: maskedText, // Return masked text
        pages: [],
        meta: {
          ocr: provider,
          duration_ms: 0,
        },
        parsed: parsed,
        warnings: [],
      }),
    };
  } catch (err: any) {
    console.error('[OCR] Handler error:', err);
    
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
        routeConfidence: 0.8,
      }),
      body: JSON.stringify({ ok: false, error: 'Internal server error' }),
    };
  }
};
