/**
 * Auto-Retry OCR Processing with PENDING_UPLOAD Handling
 * 
 * Handles automatic retry when OCR returns PENDING_UPLOAD status.
 * Uses exponential backoff: 500ms, 1s, 2s, 4s, 8s (max 5 attempts).
 */

import { requestOcrProcessing, type OCRProcessingRequest, type OCRProcessingResult } from '../ocr/requestOcrProcessing';

export interface RetryOcrProcessingOptions {
  maxAttempts?: number; // Default: 5
  initialDelay?: number; // Default: 500ms
  onRetry?: (attempt: number, delay: number) => void;
  onStatusChange?: (status: 'uploading' | 'finalizing' | 'ready' | 'failed') => void;
}

/**
 * Request OCR processing with auto-retry on PENDING_UPLOAD
 * 
 * @param request OCR processing request
 * @param options Retry options
 * @returns OCR processing result
 */
export async function retryOcrProcessing(
  request: OCRProcessingRequest,
  options: RetryOcrProcessingOptions = {}
): Promise<OCRProcessingResult> {
  const {
    maxAttempts = 5,
    initialDelay = 500,
    onRetry,
    onStatusChange,
  } = options;

  // Step 1: Upload file (this is synchronous)
  onStatusChange?.('uploading');
  let result: OCRProcessingResult;
  
  try {
    result = await requestOcrProcessing(request);
  } catch (error: any) {
    onStatusChange?.('failed');
    throw error;
  }

  // Step 2: If status is pending, check for PENDING_UPLOAD and retry
  if (result.status === 'pending') {
    onStatusChange?.('finalizing');
    
        // Check if finalize returned PENDING_UPLOAD
        // We need to poll the document status and retry finalize if needed
        const { userId } = request;
        const docId = result.docId;
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const delay = initialDelay * Math.pow(2, attempt); // Exponential backoff: 500ms, 1s, 2s, 4s, 8s
      
      if (attempt > 0) {
        onRetry?.(attempt, delay);
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      // Retry finalize to check if upload is complete
      try {
        const retryRes = await fetch('/.netlify/functions/smart-import-finalize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            docId: result.docId,
            expectedSize: request.file.size,
            requestId: request.requestId, // Reuse requestId for idempotency
          }),
        });

        if (!retryRes.ok) {
          const err = await retryRes.text();
          console.warn(`[retryOcrProcessing] Finalize retry ${attempt + 1} failed: ${err}`);
          continue;
        }

        const retryResult = await retryRes.json();

        // Check if still pending upload
        if (retryResult.pending && retryResult.status === 'PENDING_UPLOAD') {
          console.log(`[retryOcrProcessing] Upload still incomplete (attempt ${attempt + 1}/${maxAttempts}), retrying in ${delay}ms...`);
          continue;
        }

        // Upload complete - OCR should proceed automatically
        // Check document status
        const { getSupabase } = await import('../supabase');
        const sb = getSupabase();
        if (!sb) {
          throw new Error('Supabase client not available');
        }

        const { data: doc } = await sb
          .from('user_documents')
          .select('id, status, ocr_text, pii_types')
          .eq('id', result.docId)
          .single();

        if (doc?.status === 'ready' && doc.ocr_text) {
          onStatusChange?.('ready');
          return {
            docId: doc.id,
            status: 'ready',
            ocrText: doc.ocr_text,
            piiTypes: doc.pii_types || [],
          };
        }

        if (doc?.status === 'rejected') {
          onStatusChange?.('failed');
          return {
            docId: doc.id,
            status: 'rejected',
            error: 'Document processing was rejected',
          };
        }

        // Still processing - continue polling
        continue;
      } catch (error: any) {
        console.error(`[retryOcrProcessing] Retry attempt ${attempt + 1} error:`, error);
        if (attempt === maxAttempts - 1) {
          onStatusChange?.('failed');
          throw error;
        }
        continue;
      }
    }

    // Max attempts reached - return pending status
    onStatusChange?.('failed');
    return {
      docId: result.docId,
      status: 'pending',
      error: 'Upload completion timeout - file may still be uploading',
    };
  }

  // Status is ready or rejected - return immediately
  if (result.status === 'ready') {
    onStatusChange?.('ready');
  } else if (result.status === 'rejected') {
    onStatusChange?.('failed');
  }

  return result;
}

