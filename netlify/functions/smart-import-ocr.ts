/**
 * Smart Import OCR - Extract text from images/PDFs
 * 
 * SECURITY: OCR output runs through STRICT guardrails before storage
 */

import { Handler } from '@netlify/functions';
import { admin, markDocStatus } from './_shared/upload.js';
// Phase 2.2: Use unified guardrails API (single source of truth)
import { runGuardrailsForText } from './_shared/guardrails-unified.js';
import { maskPII as maskPiiFallback } from './_shared/pii.js';
import { callGoogleVisionOnImage } from './_shared/vision/googleVisionClient.js';
// AI Fluency: Event logging
import { logUserEvent, recalcFluency } from '../../src/lib/ai/userActivity.js';
import { extractPdfTextWithPdfParse } from './_lib/pdfText.js';

const BUCKET = 'docs';

const DEFAULT_OCR_TIMEOUT_MS = 30000;
const MAX_OCR_TIMEOUT_MS = 60000;
const OCR_RETRY_ATTEMPTS = 3;
const OCR_RETRY_BASE_DELAY_MS = 500;

type RetryableError = Error & { status?: number };

function isRetryableError(error: unknown): boolean {
  const err = error as RetryableError;
  if (!err) return false;
  if (err.name === 'AbortError') return true;
  const status = err.status;
  if (typeof status === 'number') {
    return status === 408 || status === 429 || status >= 500;
  }
  const message = err.message?.toLowerCase?.() || '';
  return message.includes('timeout') || message.includes('rate limit');
}

async function sleep(ms: number): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function withRetries<T>(label: string, fn: () => Promise<T>): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= OCR_RETRY_ATTEMPTS; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (!isRetryableError(error) || attempt === OCR_RETRY_ATTEMPTS) {
        throw error;
      }
      const delay = OCR_RETRY_BASE_DELAY_MS * Math.pow(2, attempt - 1);
      console.warn(`[OCR] ${label} failed (attempt ${attempt}/${OCR_RETRY_ATTEMPTS}), retrying in ${delay}ms`);
      await sleep(delay);
    }
  }
  throw lastError;
}

type OCRProvider = 'vision' | 'ocrspace' | 'pdf-parse';

type OCRRunResult = {
  text: string;
  provider: OCRProvider;
  durationMs: number;
  pageLimitReached?: boolean;
};

/**
 * Run OCR on image/PDF using Google Vision (for images) or OCR.space (fallback)
 * @param signedUrl Signed URL to file
 * @param mimeType MIME type of the file (e.g., 'image/png', 'application/pdf')
 * @returns Extracted text + provider metadata
 */
function computeOcrTimeoutMs(expectedSize?: number, mimeType?: string): number {
  const normalizedMime = mimeType || 'application/pdf';
  const isPdf = normalizedMime === 'application/pdf';
  const sizeMb = expectedSize ? Math.max(1, expectedSize / (1024 * 1024)) : 1;
  const base = isPdf ? 25000 : 20000;
  const perMb = isPdf ? 4000 : 2500;
  const computed = base + sizeMb * perMb;
  return Math.min(MAX_OCR_TIMEOUT_MS, Math.max(15000, Math.round(computed)));
}

async function extractEmbeddedPdfText(signedUrl: string, timeoutMs: number): Promise<string> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), Math.max(1_000, timeoutMs));

  try {
    const res = await fetch(signedUrl, { signal: controller.signal });
    if (!res.ok) throw new Error(`PDF download failed: ${res.status} ${res.statusText}`);

    const ab = await res.arrayBuffer();
    const buf = Buffer.from(ab);

    const text = await extractPdfTextWithPdfParse(buf);
    console.log("[OCR] pdf-parse embedded text extracted", { textLength: text.trim().length });

    return text;
  } finally {
    clearTimeout(t);
  }
}

async function runOCR(
  signedUrl: string,
  mimeType: string,
  expectedSize?: number
): Promise<OCRRunResult> {
  const hasVision = !!process.env.GOOGLE_VISION_API_KEY;
  const hasOcrSpace = !!process.env.OCR_SPACE_API_KEY;
  const normalizedMime = mimeType || 'application/pdf';
  const isImage = normalizedMime.startsWith('image/') && !normalizedMime.includes('pdf');
  const isPdf = normalizedMime === 'application/pdf';
  const timeoutMs = computeOcrTimeoutMs(expectedSize, normalizedMime);
  const enableEmbeddedPdfText =
    process.env.ENABLE_PDF_EMBEDDED_TEXT === '1' ||
    process.env.ENABLE_PDF_EMBEDDED_TEXT === 'true';
  if (enableEmbeddedPdfText) {
    console.log('[OCR] Embedded PDF text extraction ENABLED (pdf-parse only)');
  }
  if (!hasVision && !hasOcrSpace) {
    throw new Error('No OCR provider configured. Set GOOGLE_VISION_API_KEY or OCR_SPACE_API_KEY.');
  }

  function buildOcrSpaceError(result: any): RetryableError {
    const errorMessage = Array.isArray(result?.ErrorMessage)
      ? result.ErrorMessage.join('; ')
      : result?.ErrorMessage || `OCR processing error (exit code: ${result?.OCRExitCode ?? 'unknown'})`;
    const err: RetryableError = new Error(`OCR.space processing failed: ${errorMessage}`);
    const lower = String(errorMessage).toLowerCase();
    if (lower.includes('limit') || lower.includes('rate')) {
      err.status = 429;
    } else if (lower.includes('timeout')) {
      err.status = 408;
    } else {
      err.status = 422;
    }
    return err;
  }

  function isOcrSpacePageLimitError(error: unknown): boolean {
    const message = (error as Error)?.message?.toLowerCase?.() || '';
    return message.includes('maximum page limit') || message.includes('page limit of 3');
  }

  async function runOcrSpace(enhanced: boolean): Promise<OCRRunResult> {
    const formData = new FormData();
    formData.append('url', signedUrl);
    const ocrSpaceKey = process.env.OCR_SPACE_API_KEY;
    if (ocrSpaceKey) {
      formData.append('apikey', ocrSpaceKey);
    }
    formData.append('language', 'eng');
    formData.append('detectOrientation', 'true');
    formData.append('isOverlayRequired', 'false');
    formData.append('filetype', isPdf ? 'pdf' : 'image');
    if (enhanced) {
      formData.append('scale', 'true');
      formData.append('isTable', 'true');
      formData.append('OCREngine', '2');
    }
    const ocrSpaceStart = Date.now();
    const response = await withRetries(enhanced ? 'OCR.space enhanced' : 'OCR.space', async () => {
      const res = await fetchWithTimeout('https://api.ocr.space/parse/image', {
        method: 'POST',
        body: formData,
      }, timeoutMs);
      if (!res.ok) {
        const error: RetryableError = new Error(`OCR.space API returned ${res.status}`);
        error.status = res.status;
        throw error;
      }
      return res;
    });
    const result = await response.json();
    if (result?.IsErroredOnProcessing || (result?.OCRExitCode && result?.OCRExitCode !== 1)) {
      throw buildOcrSpaceError(result);
    }
    const parsedResults = Array.isArray(result.ParsedResults) ? result.ParsedResults : [];
    const text = parsedResults
      .map((page: any) => (page?.ParsedText ? String(page.ParsedText) : ''))
      .filter((pageText) => pageText.trim().length > 0)
      .join('\n\n');
    return {
      text,
      provider: 'ocrspace',
      durationMs: Date.now() - ocrSpaceStart,
    };
  }

  // 1) For PDFs, attempt embedded text extraction first
  if (isPdf && enableEmbeddedPdfText) {
    try {
      const embeddedStart = Date.now();
      const embeddedText = await withRetries('PDF embedded text', () =>
        extractEmbeddedPdfText(signedUrl, timeoutMs)
      );
      if (embeddedText && embeddedText.trim().length > 50) {
        console.log('[OCR] Embedded PDF extraction success (pdf-parse)', { chars: embeddedText.trim().length });
        return {
          text: embeddedText,
          provider: 'pdf-parse',
          durationMs: Date.now() - embeddedStart,
        };
      }
      console.warn('[OCR] PDF embedded text extraction returned short text, falling back to OCR');
    } catch (error: any) {
      console.warn('[OCR] PDF embedded text extraction failed, falling back to OCR:', error.message || error);
    }
  } else if (isPdf) {
    console.log('[OCR] PDF embedded text extraction disabled; using OCR.space');
  }

  // 2) Prefer Google Vision for images when configured
  if (isImage && hasVision) {
    try {
      console.log('[OCR] Using Google Vision for image file');
      const visionStart = Date.now();
      const result = await withRetries('Google Vision', () =>
        callGoogleVisionOnImage({
          imageUrl: signedUrl,
          apiKey: process.env.GOOGLE_VISION_API_KEY as string,
          feature: 'DOCUMENT_TEXT_DETECTION',
          timeoutMs,
        })
      );

      if (result.fullText?.trim()) {
        return {
          text: result.fullText,
          provider: 'vision',
          durationMs: Date.now() - visionStart,
        };
      }

      console.warn('[OCR] Google Vision returned empty text, falling back to legacy OCR if available');
    } catch (error: any) {
      console.error('[OCR] Google Vision error, falling back to legacy OCR if available:', error.message || error);
    }
    // Fall through to legacy OCR / placeholder
  }

  // 3) Legacy OCR (OCR.space) for PDFs or as fallback
  if (hasOcrSpace) {
    console.log('[OCR] Using OCR.space backend');
    try {
      const baseResult = await runOcrSpace(false);
      if (baseResult.text?.trim()) {
        if (baseResult.text.trim().length < 200) {
          console.warn('[OCR] OCR.space returned short text, retrying with enhanced settings');
          const enhancedResult = await runOcrSpace(true);
          if (enhancedResult.text?.trim().length > baseResult.text.trim().length) {
            return enhancedResult;
          }
        }
        return baseResult;
      }
      const enhancedResult = await runOcrSpace(true);
      if (enhancedResult.text?.trim()) {
        return enhancedResult;
      }
    } catch (error: any) {
      if (isPdf && isOcrSpacePageLimitError(error)) {
        console.warn('[OCR] OCR.space page limit reached');
        if (enableEmbeddedPdfText) {
          console.log('[OCR] OCR.space limit -> pdf-parse fallback (pdf-parse only)');
          try {
            const embeddedStart = Date.now();
            const embeddedText = await withRetries('PDF embedded text fallback', () =>
              extractEmbeddedPdfText(signedUrl, timeoutMs)
            );
            if (embeddedText && embeddedText.trim().length > 50) {
              return {
                text: embeddedText,
                provider: 'pdf-parse',
                durationMs: Date.now() - embeddedStart,
              };
            }
          } catch (fallbackError: any) {
            console.warn('[OCR] Embedded PDF fallback failed after OCR.space limit:', fallbackError.message || fallbackError);
          }
        }
        return {
          text: '',
          provider: 'ocrspace',
          durationMs: 0,
          pageLimitReached: true,
        };
      }
      console.error('[OCR] OCR.space error:', error.message || error);
    }
  }

  // 4) Final fallback
  throw new Error('OCR failed: no provider returned text');
}

export const handler: Handler = async (event, context) => {
  console.log("[FUNC=smart-import-ocr] handler start");
  // Byte Speed Mode v2: Non-blocking background processing
  if (context && typeof context.callbackWaitsForEmptyEventLoop === 'boolean') {
    context.callbackWaitsForEmptyEventLoop = false;
  }
  
  let lockAcquired = false;
  let lockedDocId: string | null = null;

  try {
    const contentType = event.headers['content-type'] || event.headers['Content-Type'] || '';
    let body: any = {};
    if (contentType.includes('multipart/form-data')) {
      const rawBody = event.isBase64Encoded
        ? Buffer.from(event.body || '', 'base64')
        : event.body || '';
      const formData = await new Response(rawBody, { headers: { 'content-type': contentType } }).formData();
      body = Object.fromEntries(formData.entries());
    } else {
      body = JSON.parse(event.body || '{}');
    }

    const traceIdHeader = event.headers['x-trace-id'] || event.headers['X-Trace-Id'];
    const traceId = body.traceId || traceIdHeader || 'no-trace';
    const { userId, docId, threadId } = body;
    const expectedSize = body.expectedSize ? Number(body.expectedSize) : undefined;
    const importRunId = body.importRunId || body.requestId;
    const logPrefix = `[OCR][${traceId}]`;

    console.log(`${logPrefix} START`, { docId, importRunId });
    if (!userId || !docId) {
      console.error(`${logPrefix} ERROR`, { error: 'Missing userId/docId' });
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing userId/docId', traceId, importRunId }) };
    }

    const sb = admin();

    // Load document record
    const { data: doc, error } = await sb
      .from('user_documents')
      .select('*')
      .eq('id', docId)
      .single();
    
    if (error || !doc) {
      return { statusCode: 404, body: JSON.stringify({ error: 'Document not found' }) };
    }

    if (doc.ocr_text && doc.ocr_text.trim().length > 0) {
      console.log(`${logPrefix} SKIP`, { docId, reason: 'already_processed' });
      return {
        statusCode: 200,
        body: JSON.stringify({
          ok: true,
          docId,
          importRunId,
          textLength: doc.ocr_text.length,
          traceId,
          alreadyProcessed: true,
        }),
      };
    }

    if (doc.status === 'ocr_processing') {
      console.log('[OCR] IN_PROGRESS (lock held)', { docId, traceId });
      return {
        statusCode: 202,
        body: JSON.stringify({
          inProgress: true,
          docId,
          traceId,
          importRunId,
        }),
      };
    }

    // ⚡ UPLOAD COMPLETENESS CONTRACT: Verify file exists and size matches before OCR
    
    // Step 1: Verify file exists in bucket (HEAD request via list)
    const storageDir = doc.storage_path.split('/').slice(0, -1).join('/');
    const fileName = doc.storage_path.split('/').pop();
    const { data: fileList, error: listError } = await sb.storage
      .from(BUCKET)
      .list(storageDir, {
        limit: 1000,
        search: fileName,
      });
    
    if (listError || !fileList || fileList.length === 0) {
      console.warn(`${logPrefix} ERROR`, { error: 'File not found in bucket', storagePath: doc.storage_path });
      return { 
        statusCode: 200, 
        body: JSON.stringify({ 
          pending: true, 
          status: 'PENDING_UPLOAD',
          traceId,
          importRunId,
        }) 
      };
    }
    
    const storedFile = fileList.find(f => f.name === fileName);
    if (!storedFile) {
      console.warn(`${logPrefix} ERROR`, { error: 'File not found in bucket listing', storagePath: doc.storage_path });
      return { 
        statusCode: 200, 
        body: JSON.stringify({ 
          pending: true, 
          status: 'PENDING_UPLOAD',
          traceId,
          importRunId,
        }) 
      };
    }
    
    // Step 2: Verify file size matches expected (if provided)
    if (expectedSize !== undefined && storedFile.metadata?.size) {
      const storedSize = parseInt(storedFile.metadata.size, 10);
      const sizeDiff = Math.abs(storedSize - expectedSize);
      const tolerance = 1024; // 1KB tolerance for metadata differences
      
      if (sizeDiff > tolerance) {
        console.warn(`${logPrefix} ERROR`, { error: 'File size mismatch', expectedSize, storedSize });
        return { 
          statusCode: 200, 
          body: JSON.stringify({ 
            pending: true, 
            status: 'PENDING_UPLOAD',
            traceId,
            importRunId,
          }) 
        };
      }
    }

    // Step 3: Create signed URL for OCR service (only after completeness verified)
    const { data: signed, error: signedErr } = await sb.storage
      .from(BUCKET)
      .createSignedUrl(doc.storage_path, 600); // 10 min expiry
    
    if (signedErr || !signed) {
      console.warn(`${logPrefix} ERROR`, { error: 'Failed to create signed URL', storagePath: doc.storage_path });
      return { 
        statusCode: 200, 
        body: JSON.stringify({ 
          pending: true, 
          status: 'PENDING_UPLOAD',
          traceId,
          importRunId,
        }) 
      };
    }

    console.log(`${logPrefix} FILE`, {
      docId,
      mimeType: doc.mime_type || 'application/pdf',
      expectedSize,
      storedSize: storedFile.metadata?.size ? Number(storedFile.metadata.size) : undefined,
    });

    // Step 4: Acquire in-flight OCR lock (atomic)
    const lockPayload = {
      status: 'ocr_processing',
      updated_at: new Date().toISOString(),
    };
    let lockQuery = sb
      .from('user_documents')
      .update(lockPayload)
      .eq('id', docId)
      .eq('status', doc.status);
    if (!doc.status) {
      lockQuery = sb
        .from('user_documents')
        .update(lockPayload)
        .eq('id', docId)
        .is('status', null);
    }
    const { data: lockResult, error: lockError } = await lockQuery.select('id');
    if (lockError) {
      console.error(`${logPrefix} ERROR`, { error: 'Failed to acquire OCR lock', details: lockError.message });
      return { statusCode: 500, body: JSON.stringify({ error: 'Failed to acquire OCR lock', traceId, importRunId }) };
    }
    if (!lockResult || lockResult.length === 0) {
      console.log('[OCR] IN_PROGRESS (lock held)', { docId, traceId, status: doc.status });
      return {
        statusCode: 202,
        body: JSON.stringify({
          inProgress: true,
          docId,
          traceId,
          importRunId,
        }),
      };
    }
    lockAcquired = true;
    lockedDocId = docId;

    // Run OCR
    let ocrText: string;
    let ocrProvider: OCRProvider | null = null;
    let ocrDurationMs: number | null = null;
    let ocrPageLimitReached = false;
    try {
      const ocrResult = await runOCR(signed.signedUrl, doc.mime_type || 'application/pdf', expectedSize);
      ocrText = ocrResult.text;
      ocrProvider = ocrResult.provider;
      ocrDurationMs = ocrResult.durationMs;
      ocrPageLimitReached = !!ocrResult.pageLimitReached;
    } catch (ocrError: any) {
      console.error(`${logPrefix} ERROR`, { error: ocrError?.message || ocrError });
      await markDocStatus(docId, 'rejected', `OCR failed: ${ocrError.message}`);
      return { 
        statusCode: 200, 
        body: JSON.stringify({ 
          rejected: true, 
          reason: 'ocr_failed',
          traceId,
          importRunId,
        }) 
      };
    }

    if (ocrPageLimitReached && (doc.mime_type || 'application/pdf') === 'application/pdf') {
      console.warn('[OCR] OCR.space page limit reached', { docId });
      console.warn('[OCR] pdf too many pages; user must split', { docId });
      return {
        statusCode: 422,
        body: JSON.stringify({
          ok: false,
          code: 'PDF_SCANNED_OR_TOO_LONG',
          message: 'This PDF looks scanned or exceeds OCR limits. Please split into smaller PDFs or upload a CSV export from your bank/credit card.',
          traceId,
          importRunId,
        }),
      };
    }

    console.log(`${logPrefix} EXTRACTED`, { docId, textLength: ocrText.length, provider: ocrProvider, durationMs: ocrDurationMs });

    // ⚡ GUARDRAILS: Apply STRICT rules to OCR output
    // ✅ Phase 2.2: Use unified guardrails API (includes config loading)
    const guardrailResult = await runGuardrailsForText(
      ocrText, 
      userId, 
      'ingestion_ocr'  // OCR stage
    );

    // Fallback: guardrails can sometimes return empty text after masking
    if (!guardrailResult.text || guardrailResult.text.trim().length === 0) {
      const fallback = maskPiiFallback(ocrText, 'last4');
      if (fallback.masked && fallback.masked.trim().length > 0) {
        guardrailResult.text = fallback.masked;
        guardrailResult.signals = {
          ...(guardrailResult.signals || {}),
          pii: true,
          piiTypes: Array.from(new Set([...(guardrailResult.signals?.piiTypes || []), ...fallback.found.map(f => f.type)])),
        };
        console.warn(`${logPrefix} Guardrails returned empty text; applied fallback redaction`, {
          docId,
          fallbackTypes: fallback.found.map(f => f.type),
        });
      }
    }
    
    const guardrailReasons = Array.isArray(guardrailResult.reasons) ? guardrailResult.reasons : [];
    const allowRedactedPanOnly =
      !guardrailResult.ok &&
      guardrailReasons.length === 1 &&
      guardrailReasons[0].includes('pii_blocked:pan_generic');

    if (!guardrailResult.ok && !allowRedactedPanOnly) {
      console.warn(`${logPrefix} ERROR`, { error: 'Content blocked by guardrails', docId, reasons: guardrailResult.reasons });
      await markDocStatus(docId, 'rejected', `Blocked: ${guardrailResult.reasons.join(', ')}`);
      
      return { 
        statusCode: 200, 
        body: JSON.stringify({ 
          rejected: true, 
          reasons: guardrailResult.reasons,
          traceId,
          importRunId,
        }) 
      };
    }

    // Store REDACTED OCR output as JSON (never store raw)
    const ocrKey = `${doc.storage_path}.ocr.json`;
    const ocrData = {
      text: guardrailResult.text,  // Redacted text
      pii_found: guardrailResult.signals?.pii || false,
      pii_types: guardrailResult.signals?.piiTypes || [],
      processed_at: new Date().toISOString(),
      provider: ocrProvider,
      duration_ms: ocrDurationMs,
    };
    
    await sb.storage
      .from(BUCKET)
      .upload(
        ocrKey, 
        new Blob([JSON.stringify(ocrData)], { type: 'application/json' }), 
        { upsert: true }
      );

    // Update document with OCR metadata
    await sb.from('user_documents').update({
      ocr_text: guardrailResult.text,  // Redacted
      ocr_completed_at: new Date().toISOString(),
      pii_types: guardrailResult.signals?.piiTypes || [],
      status: allowRedactedPanOnly ? 'needs_review' : 'ready',
      updated_at: new Date().toISOString()
    }).eq('id', docId);

    console.log(`${logPrefix} SAVED`, { docId, textLength: guardrailResult.text.length });

    // Byte Speed Mode v2: Return immediately, queue normalization in background
    // Fire normalization asynchronously - don't wait
    const netlifyUrl = process.env.NETLIFY_URL || 'http://localhost:8888';
    fetch(`${netlifyUrl}/.netlify/functions/normalize-transactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, documentId: docId }),
    }).catch((err) => {
      console.error('[smart-import-ocr] Error calling normalize-transactions:', err);
    });
    
    // Update status in background (don't wait)
    markDocStatus(docId, 'ready', null).catch((err) => {
      console.error('[smart-import-ocr] Error updating doc status:', err);
    });

    // AI Fluency: Log document processed event (non-blocking)
    const isReceipt = doc.mime_type?.startsWith('image/') || false;
    const isStatement = ['csv', 'ofx', 'qif'].includes((doc.original_name || '').split('.').pop()?.toLowerCase() || '');
    
    Promise.all([
      logUserEvent({
        userId,
        eventType: 'doc_processed',
        eventValue: 1,
        meta: { docId, docType: doc.mime_type, isReceipt, isStatement }
      }),
      // Log receipt/statement upload separately for granularity
      isReceipt && logUserEvent({
        userId,
        eventType: 'receipt_uploaded',
        eventValue: 1,
        meta: { docId }
      }),
      isStatement && logUserEvent({
        userId,
        eventType: 'statement_uploaded',
        eventValue: 1,
        meta: { docId }
      })
    ]).then(() => {
      // Recalculate fluency after logging events (non-blocking)
      recalcFluency(userId).catch(err => {
        console.error('[smart-import-ocr] Error recalculating fluency:', err);
      });
    }).catch(err => {
      console.error('[smart-import-ocr] Error logging events:', err);
      // Don't block response - logging failures are non-fatal
    });

    // 🚫 Do NOT auto-send chat messages for upload status.
    const AUTO_CHAT_ON_UPLOAD_COMPLETE = false;
    if (AUTO_CHAT_ON_UPLOAD_COMPLETE) {
      fetch(`${netlifyUrl}/.netlify/functions/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
        },
        body: JSON.stringify({
          message: `✅ OCR complete for "${doc.original_name}"!\n\nExtracted ${guardrailResult.text.length.toLocaleString()} characters. ${guardrailResult.signals?.pii ? '🔒 PII detected and redacted. ' : ''}Ready to review?`,
          employeeSlug: 'byte-docs',
          userId: userId,
          threadId: threadId || null  // Use Prime's thread if available
        })
      }).catch(err => console.error('[OCR] Failed to announce to Byte:', err));
    }

    // Return immediately - Byte can chat while OCR processes
    return { 
      statusCode: 200, 
      body: JSON.stringify({ 
        ok: true,
        docId,
        importRunId,
        textLength: guardrailResult.text.length,
        piiDetected: guardrailResult.signals?.pii || false,
        provider: ocrProvider,
        durationMs: ocrDurationMs,
        traceId,
      }) 
    };
    
  } catch (e: any) {
    const traceIdHeader = event.headers['x-trace-id'] || event.headers['X-Trace-Id'];
    const traceId = traceIdHeader || 'no-trace';
    console.error(`[OCR][${traceId}] ERROR`, e);
    if (lockAcquired && lockedDocId) {
      try {
        await markDocStatus(lockedDocId, 'rejected', `OCR failed: ${e?.message || 'unknown error'}`);
      } catch (markError: any) {
        console.error(`[OCR][${traceId}] ERROR`, { error: 'Failed to release OCR lock', details: markError?.message || markError });
      }
    }
    return { 
      statusCode: 500, 
      body: JSON.stringify({ error: e.message, traceId }) 
    };
  }
};

