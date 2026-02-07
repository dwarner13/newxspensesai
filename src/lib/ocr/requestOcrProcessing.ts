/**
 * Canonical OCR Processing Entrypoint
 * 
 * This is the SINGLE entrypoint for all OCR requests from the frontend.
 * All OCR processing MUST go through the backend smart-import-ocr pipeline
 * which applies guardrails and PII masking.
 * 
 * DO NOT use deprecated ocrService.ts functions - they bypass guardrails.
 */

import { getSupabase } from '../supabase';

export interface OCRProcessingRequest {
  file: File;
  userId: string;
  requestId?: string; // Optional idempotency key
  threadId?: string;
}

export interface OCRProcessingResult {
  ok: boolean;
  importRunId?: string;
  documentId?: string;
  status?: 'pending' | 'ready' | 'rejected' | 'error';
  ocrText?: string;
  piiTypes?: string[];
  error?: string;
}

/**
 * Request OCR processing via the canonical backend pipeline
 * 
 * Pipeline:
 * 1. smart-import-init → Creates doc record, returns signed URL
 * 2. Client uploads file to signed URL → File stored in Supabase Storage
 * 3. smart-import-finalize → Routes by file type:
 *    - Images/PDFs → smart-import-ocr (async, applies guardrails)
 *    - CSV/OFX/QIF → smart-import-parse-csv (async, applies guardrails)
 * 4. OCR/Parse → Applies guardrails, extracts text
 * 5. normalize-transactions → Extracts transactions (async)
 * 
 * @param request OCR processing request with file and userId
 * @returns Processing result with docId and status
 */
export async function requestOcrProcessing(
  request: OCRProcessingRequest
): Promise<OCRProcessingResult> {
  const { file, userId, requestId, threadId } = request;
  const traceId = `ocr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const importRunId = requestId || `import_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const shouldTrace = import.meta.env.VITE_OCR_TRACE === '1';

  if (shouldTrace) {
    console.log(`[OCR][${traceId}] start`, { importRunId });
  }

  try {
    // Step 1: Initialize upload (get signed URL)
    const initRes = await fetch('/.netlify/functions/smart-import-init', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        mime: file.type,
        source: 'ocr_request',
        requestId,
        importRunId,
      }),
    });

    if (!initRes.ok) {
      const errText = await initRes.text();
      let message = errText;
      try {
        const parsed = JSON.parse(errText);
        const missing = parsed?.missing;
        message = parsed?.error || errText;
        if (missing) {
          message = `${message} (missing: userId=${missing.userId}, fileName=${missing.fileName})`;
        }
      } catch {
        // Keep plain text error
      }
      throw new Error(`Init failed: ${message}`);
    }

    const init = await initRes.json();

    // Step 2: Upload file to signed URL (auth is embedded in the URL)
    const uploadRes = await fetch(init.uploadUrl, {
      method: 'PUT',
      headers: {
        'content-type': file.type,
      },
      body: file,
    });

    if (!uploadRes.ok) {
      throw new Error(`Upload failed: ${uploadRes.statusText}`);
    }

    // Step 3: Trigger OCR processing (canonical backend pipeline)
    const formData = new FormData();
    formData.append('userId', userId);
    formData.append('docId', init.docId);
    formData.append('expectedSize', String(file.size));
    formData.append('importRunId', importRunId);
    if (requestId) formData.append('requestId', requestId);
    if (threadId) formData.append('threadId', threadId);

    const ocrRes = await fetch('/.netlify/functions/smart-import-ocr', {
      method: 'POST',
      headers: { 'x-trace-id': traceId },
      body: formData,
    });

    const ocrBody = await ocrRes.json().catch(() => ({} as any));

    if (!ocrRes.ok) {
      const err = ocrBody?.error || 'OCR request failed';
      return {
        ok: false,
        importRunId,
        documentId: init.docId,
        status: 'error',
        error: err,
      };
    }

    if (ocrBody?.rejected) {
      return {
        ok: false,
        importRunId: ocrBody.importRunId || importRunId,
        documentId: init.docId,
        status: 'rejected',
        error: ocrBody?.reasons?.join(', ') || ocrBody?.error || 'Content blocked by guardrails',
      };
    }

    if (ocrBody?.pending && ocrBody?.status === 'PENDING_UPLOAD') {
      return {
        ok: true,
        importRunId: ocrBody.importRunId || importRunId,
        documentId: init.docId,
        status: 'pending',
      };
    }

    if (ocrBody?.inProgress) {
      return {
        ok: true,
        importRunId: ocrBody.importRunId || importRunId,
        documentId: ocrBody.docId || init.docId,
        status: 'pending',
      };
    }

    return {
      ok: true,
      importRunId: ocrBody.importRunId || importRunId,
      documentId: ocrBody.docId || init.docId,
      status: 'ready',
    };

  } catch (error: any) {
    console.error('[requestOcrProcessing] Error:', error);
    return {
      ok: false,
      importRunId,
      status: 'error',
      error: error?.message || 'OCR request failed',
    };
  } finally {
    if (shouldTrace) {
      console.log(`[OCR][${traceId}] end`, { importRunId });
    }
  }
}

/**
 * Poll for OCR completion
 * 
 * @param docId Document ID
 * @param userId User ID
 * @param maxAttempts Maximum polling attempts (default: 30)
 * @param intervalMs Polling interval in milliseconds (default: 2000)
 * @returns OCR result when ready
 */
export async function pollOcrCompletion(
  docId: string,
  userId: string,
  maxAttempts: number = 30,
  intervalMs: number = 2000
): Promise<OCRProcessingResult> {
  const sb = getSupabase();
  if (!sb) {
    throw new Error('Supabase client not available');
  }

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const { data: doc, error } = await sb
      .from('user_documents')
      .select('id, status, ocr_text, pii_types')
      .eq('id', docId)
      .eq('user_id', userId)
      .single();

    if (error) {
      throw new Error(`Failed to check OCR status: ${error.message}`);
    }

    if (doc.status === 'ready' && doc.ocr_text) {
      return {
        ok: true,
        documentId: doc.id,
        status: 'ready',
        ocrText: doc.ocr_text,
        piiTypes: doc.pii_types || [],
      };
    }

    if (doc.status === 'rejected') {
      return {
        ok: false,
        documentId: doc.id,
        status: 'rejected',
        error: 'Document processing was rejected',
      };
    }

    // Wait before next attempt
    await new Promise(resolve => setTimeout(resolve, intervalMs));
  }

  // Timeout
  return {
    ok: false,
    documentId: docId,
    status: 'pending',
    error: 'OCR processing timeout - document is still being processed',
  };
}

