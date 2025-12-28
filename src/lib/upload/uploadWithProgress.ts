/**
 * Upload File with Progress Tracking
 * 
 * Wraps the canonical upload pipeline (smart-import-init → upload → finalize)
 * with progress tracking for use with UploadQueue.
 */

import type { UploadResult } from '../../hooks/useSmartImport';

export interface UploadWithProgressOptions {
  userId: string;
  file: File;
  source?: 'upload' | 'chat';
  requestId?: string; // For idempotency
  onProgress?: (progress: number) => void;
}

/**
 * Upload file with progress tracking
 * 
 * Progress breakdown:
 * - 0-10%: Initialize (smart-import-init)
 * - 10-90%: Upload to signed URL (actual file transfer)
 * - 90-100%: Finalize (smart-import-finalize)
 */
export async function uploadWithProgress(
  options: UploadWithProgressOptions
): Promise<UploadResult> {
  const { userId, file, source = 'upload', requestId, onProgress } = options;

  // Step 1: Initialize (10%)
  onProgress?.(10);
  const initRes = await fetch('/.netlify/functions/smart-import-init', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId,
      filename: file.name,
      mime: file.type,
      source,
      requestId, // Pass idempotency key
    }),
  });

  if (!initRes.ok) {
    const err = await initRes.text();
    throw new Error(`Init failed: ${err}`);
  }

  const init = await initRes.json();

  // Step 2: Upload file to signed URL with progress tracking (10-90%)
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    // Track upload progress
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        // Map 0-100% upload progress to 10-90% overall progress
        const uploadProgress = (e.loaded / e.total) * 100;
        const overallProgress = 10 + (uploadProgress * 0.8); // 10% + (upload * 80%)
        onProgress?.(overallProgress);
      }
    });

    xhr.addEventListener('load', async () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        // Step 3: Finalize (90-100%)
        onProgress?.(90);
        try {
          const finalizeRes = await fetch('/.netlify/functions/smart-import-finalize', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId,
              docId: init.docId,
              requestId, // Pass idempotency key
              expectedSize: file.size, // Pass expected size for completeness check
            }),
          });

          if (!finalizeRes.ok) {
            const err = await finalizeRes.text();
            throw new Error(`Finalize failed: ${err}`);
          }

          const result = await finalizeRes.json();
          onProgress?.(100);
          resolve({
            docId: init.docId,
            ...result,
            transactionCount: result?.normalizedTransactionCount ?? result?.transactionCount ?? result?.stats?.transactionCount,
          });
        } catch (error: any) {
          reject(error);
        }
      } else {
        reject(new Error(`Upload failed: ${xhr.statusText}`));
      }
    });

    xhr.addEventListener('error', () => {
      reject(new Error('Upload failed: Network error'));
    });

    xhr.addEventListener('abort', () => {
      reject(new Error('Upload cancelled'));
    });

    // Start upload
    xhr.open('PUT', init.url);
    xhr.setRequestHeader('x-upsert', 'true');
    xhr.setRequestHeader('authorization', `Bearer ${init.token}`);
    xhr.setRequestHeader('content-type', file.type);
    xhr.send(file);
  });
}


