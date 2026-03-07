/**
 * Canonical OCR Processing Entrypoint
 *
 * Routes all OCR requests to the process-statement backend endpoint,
 * which applies PII scrubbing and writes to staging tables.
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
 * Request OCR processing via the process-statement backend endpoint.
 *
 * Converts the file to base64 and POSTs to /.netlify/functions/process-statement,
 * which runs Google Vision / Claude Vision extraction, writes staging rows, and
 * triggers the Byte announcement to Prime.
 *
 * @param request OCR processing request with file and userId
 * @returns Processing result with importSummaryId and status
 */
export async function requestOcrProcessing(
  request: OCRProcessingRequest
): Promise<OCRProcessingResult> {
  const { file, userId, requestId } = request;
  const importRunId = requestId || `import_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  try {
    // Convert File → base64
    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64 = btoa(binary);

    const resp = await fetch('/.netlify/functions/process-statement', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        base64,
        fileName: file.name,
        mimeType: file.type,
        userId,
        importId: importRunId,
      }),
    });

    if (!resp.ok) {
      return {
        ok: false,
        importRunId,
        status: 'error',
        error: `process-statement returned ${resp.status}`,
      };
    }

    const result = await resp.json();
    return {
      ok: result.ok,
      importRunId,
      documentId: result.importSummaryId,
      status: result.ok ? 'ready' : 'error',
      error: result.error,
    };

  } catch (error: any) {
    console.error('[requestOcrProcessing] Error:', error);
    return {
      ok: false,
      importRunId,
      status: 'error',
      error: error?.message || 'OCR request failed',
    };
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

