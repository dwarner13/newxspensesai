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
}

export interface OCRProcessingResult {
  docId: string;
  status: 'pending' | 'ready' | 'rejected';
  ocrText?: string; // Only available when status is 'ready'
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
  const { file, userId, requestId } = request;

  try {
    // Step 1: Initialize upload (get signed URL)
    const initRes = await fetch('/.netlify/functions/smart-import-init', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        filename: file.name,
        mime: file.type,
        source: 'ocr_request',
        requestId, // Pass idempotency key if provided
      }),
    });

    if (!initRes.ok) {
      const err = await initRes.text();
      throw new Error(`Init failed: ${err}`);
    }

    const init = await initRes.json();

    // Step 2: Upload file to signed URL
    const uploadRes = await fetch(init.url, {
      method: 'PUT',
      headers: {
        'x-upsert': 'true',
        'authorization': `Bearer ${init.token}`,
        'content-type': file.type,
      },
      body: file,
    });

    if (!uploadRes.ok) {
      throw new Error(`Upload failed: ${uploadRes.statusText}`);
    }

    // Step 3: Finalize (triggers guardrails + processing)
    const finalizeRes = await fetch('/.netlify/functions/smart-import-finalize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        docId: init.docId,
        requestId, // Pass idempotency key if provided
        expectedSize: file.size, // Pass expected size for completeness check
      }),
    });

    if (!finalizeRes.ok) {
      const err = await finalizeRes.text();
      throw new Error(`Finalize failed: ${err}`);
    }

    const result = await finalizeRes.json();

    // ⚡ Check for PENDING_UPLOAD status
    if (result.pending && result.status === 'PENDING_UPLOAD') {
      return {
        docId: init.docId,
        status: 'pending',
        error: 'PENDING_UPLOAD', // Special error code for retry logic
      };
    }

    // Check if rejected by guardrails
    if (result.rejected) {
      return {
        docId: init.docId,
        status: 'rejected',
        error: result.reasons?.join(', ') || 'Content blocked by guardrails',
        piiTypes: result.reasons?.filter((r: string) => r.startsWith('pii_')) || [],
      };
    }

    // For images/PDFs, OCR is async - return pending status
    if (result.queued && result.via === 'ocr') {
      return {
        docId: init.docId,
        status: 'pending',
      };
    }

    // For CSV/OFX/QIF, parsing is async - return pending status
    if (result.queued && result.via === 'statement-parse') {
      return {
        docId: init.docId,
        status: 'pending',
      };
    }

    // If OCR text is already available (shouldn't happen, but handle it)
    if (result.ocr_text) {
      return {
        docId: init.docId,
        status: 'ready',
        ocrText: result.ocr_text,
        piiTypes: result.pii_types || [],
      };
    }

    // Default: pending
    return {
      docId: init.docId,
      status: 'pending',
    };

  } catch (error: any) {
    console.error('[requestOcrProcessing] Error:', error);
    throw error;
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
        docId: doc.id,
        status: 'ready',
        ocrText: doc.ocr_text,
        piiTypes: doc.pii_types || [],
      };
    }

    if (doc.status === 'rejected') {
      return {
        docId: doc.id,
        status: 'rejected',
        error: 'Document processing was rejected',
      };
    }

    // Wait before next attempt
    await new Promise(resolve => setTimeout(resolve, intervalMs));
  }

  // Timeout
  return {
    docId,
    status: 'pending',
    error: 'OCR processing timeout - document is still being processed',
  };
}

