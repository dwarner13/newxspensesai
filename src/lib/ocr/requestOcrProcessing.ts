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
import { runSmartImportPipeline } from '../smartImport/runSmartImportPipeline';

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
 * Pipeline (canonical frontend wrapper):
 * runSmartImportPipeline() → init/upload/finalize/poll/sync
 * 
 * @param request OCR processing request with file and userId
 * @returns Processing result with docId and status
 */
export async function requestOcrProcessing(
  request: OCRProcessingRequest
): Promise<OCRProcessingResult> {
  const { file, userId, requestId } = request;
  const traceId = `ocr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const importRunId = requestId || `import_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const shouldTrace = import.meta.env.VITE_OCR_TRACE === '1';

  if (shouldTrace) {
    console.log(`[OCR][${traceId}] start`, { importRunId });
  }

  try {
    const result = await runSmartImportPipeline({
      userId,
      source: 'upload',
      file,
      fileName: file.name,
      mimeType: file.type,
      fileSize: file.size,
      lastModified: file.lastModified || 0,
      requestId,
      onProgress: undefined,
    });
    return {
      ok: !result.rejected,
      importRunId,
      documentId: result.docId,
      status: result.rejected ? 'rejected' : (result.queued ? 'pending' : 'ready'),
      error: result.rejected ? result.reason || 'Document rejected' : undefined,
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

