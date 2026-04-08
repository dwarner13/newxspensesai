/**
 * Upload File with Progress Tracking
 * 
 * Wraps the canonical upload pipeline (smart-import-init -> upload -> finalize)
 * with progress tracking for use with UploadQueue.
 */

import type { UploadResult } from '../../hooks/useSmartImport';
import { runSmartImportPipeline } from '../smartImport/runSmartImportPipeline';

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
  return runSmartImportPipeline({
    userId,
    source,
    file,
    fileName: file.name,
    mimeType: file.type,
    fileSize: file.size,
    lastModified: file.lastModified || 0,
    requestId,
    onProgress,
  });
}


