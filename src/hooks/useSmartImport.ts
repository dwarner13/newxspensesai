/**
 * Smart Import React Hook
 * 
 * Handles file uploads with automatic guardrails and routing:
 * - Images/PDFs → OCR with PII redaction
 * - CSV/OFX/QIF → Statement parser with PII redaction
 * 
 * All files run through STRICT guardrails before processing
 */

import { useState, useCallback, useEffect } from 'react';
import { useUploadQueue } from './useUploadQueue';
import { generateUploadId } from '../lib/upload/uploadQueue';

export type UploadSource = 'upload' | 'chat';

export type SmartImportStep = 'idle' | 'uploading' | 'processing' | 'completed' | 'error';

export interface SmartImportUploadStatus {
  isUploading: boolean;
  fileName?: string;
  progress: number; // 0–100
  step: SmartImportStep;
  error?: string | null;
}

export type UploadResult = {
  docId: string;
  queued: boolean;
  via: 'ocr' | 'statement-parse' | 'vision-parse' | 'unsupported';
  rejected?: boolean;
  reason?: string;
  pii_redacted?: boolean;
  pii_types?: string[];
  transactionCount?: number;
  normalizedTransactionCount?: number;
  stats?: {
    transactionCount?: number;
  };
};

export type SmartImportUploadSummary = {
  id: string;
  finishedAt: string; // ISO string
  fileCount: number;
  transactionCount?: number;
};

const defaultUploadStatus: SmartImportUploadStatus = {
  isUploading: false,
  fileName: undefined,
  progress: 0,
  step: 'idle',
  error: null,
};

export function useSmartImport(userId?: string, source: UploadSource = 'upload') {
  // Use upload queue for concurrent uploads
  const uploadQueue = useUploadQueue({
    userId: userId || '',
    source,
  });

  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [uploadFileCount, setUploadFileCount] = useState<{ current: number; total: number }>({
    current: 0,
    total: 0,
  });
  const [lastUploadSummary, setLastUploadSummary] = useState<SmartImportUploadSummary | null>(null);
  
  // Shared upload status with step tracking
  const [uploadStatus, setUploadStatus] = useState<SmartImportUploadStatus>(defaultUploadStatus);
  
  // Helper functions for upload status management
  const startUpload = useCallback((file: File) => {
    setUploadStatus({
      isUploading: true,
      fileName: file.name,
      progress: 5,
      step: 'uploading',
      error: null,
    });
  }, []);

  const updateUploadProgress = useCallback((partial: Partial<SmartImportUploadStatus>) => {
    setUploadStatus(prev => ({
      ...prev,
      ...partial,
    }));
  }, []);

  const completeUpload = useCallback(() => {
    setUploadStatus(prev => ({
      ...prev,
      isUploading: false,
      progress: 100,
      step: 'completed',
    }));
    // Reset after a brief delay
    setTimeout(() => {
      setUploadStatus(defaultUploadStatus);
    }, 2000);
  }, []);

  const failUpload = useCallback((error: string) => {
    setUploadStatus({
      isUploading: false,
      fileName: undefined,
      progress: 0,
      step: 'error',
      error,
    });
    // Reset after a delay
    setTimeout(() => {
      setUploadStatus(defaultUploadStatus);
    }, 5000);
  }, []);

  /**
   * Upload a file and process it through the smart import pipeline
   * 
   * @param userId User ID
   * @param file File object from input[type=file]
   * @param source 'upload' or 'chat'
   * @returns Upload result with processing status
   */
  const uploadFile = async (
    userId: string,
    file: File,
    source: UploadSource = 'upload'
  ): Promise<UploadResult> => {
    try {
      setUploading(true);
      setProgress(0);
      setError(null);

      // Step 1: Initialize upload (get signed URL)
      setProgress(10);
      updateUploadProgress({ progress: 10, step: 'uploading' });
      const initRes = await fetch('/.netlify/functions/smart-import-init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          filename: file.name,
          mime: file.type,
          source
        })
      });

      if (!initRes.ok) {
        const err = await initRes.text();
        throw new Error(`Init failed: ${err}`);
      }

      const init = await initRes.json();
      
      // Step 2: Upload file to signed URL
      setProgress(40);
      updateUploadProgress({ progress: 40, step: 'uploading' });
      const uploadRes = await fetch(init.url, {
        method: 'PUT',
        headers: {
          'x-upsert': 'true',
          'authorization': `Bearer ${init.token}`,
          'content-type': file.type
        },
        body: file
      });

      if (!uploadRes.ok) {
        throw new Error(`Upload failed: ${uploadRes.statusText}`);
      }

      // Step 3: Finalize (triggers guardrails + processing)
      setProgress(70);
      updateUploadProgress({ progress: 70, step: 'processing' });
      const finalizeRes = await fetch('/.netlify/functions/smart-import-finalize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userId,
          docId: init.docId
        })
      });

      if (!finalizeRes.ok) {
        const err = await finalizeRes.text();
        throw new Error(`Finalize failed: ${err}`);
      }

      const result = await finalizeRes.json();
      setProgress(100);
      updateUploadProgress({ progress: 100, step: 'processing' });

      // NOTE: transactionCount may be undefined at this point because:
      // - Finalize only queues OCR/parse (async)
      // - Normalization happens asynchronously after OCR/parse completes
      // - Transaction counts are only available after normalize-transactions completes
      // TODO: Implement polling or event-based updates to capture transaction counts when available
      return {
        docId: init.docId,
        ...result,
        // Extract transaction count from result if available (may be undefined if normalization hasn't completed)
        transactionCount: result?.normalizedTransactionCount ?? result?.transactionCount ?? result?.stats?.transactionCount,
      };

    } catch (err: any) {
      console.error('[useSmartImport] Error:', err);
      setError(err.message);
      failUpload(err.message);
      throw err;
    } finally {
      setUploading(false);
    }
  };

  /**
   * IMPORTANT: This is the canonical Smart Import upload pipeline.
   * All UI entry points (Byte card, workspace, chat) must call this function.
   * 
   * Pipeline flow:
   * 1. smart-import-init → Creates doc record, returns signed URL
   * 2. Client uploads file to signed URL → File stored in Supabase Storage
   * 3. smart-import-finalize → Routes by file type:
   *    - Images/PDFs → smart-import-ocr (async)
   *    - CSV/OFX/QIF → smart-import-parse-csv (async)
   * 4. OCR/Parse → Applies guardrails, extracts text
   * 5. normalize-transactions → Extracts transactions, categorizes (Tag), inserts to staging (async)
   * 6. commit-import → Manual step (not automatic) - moves transactions from staging to final table
   * 
   * Note: Transaction counts are not available immediately because normalization is async.
   * The transactionCount in UploadResult may be undefined until normalization completes.
   * 
   * Upload multiple files with concurrency control (2 desktop, 1 mobile)
   */
  const uploadFiles = useCallback(async (
    userIdParam: string,
    files: File[],
    sourceParam: UploadSource = 'upload'
  ): Promise<UploadResult[]> => {
    if (!files || files.length === 0) return [];
    if (!userIdParam) {
      throw new Error('userId is required');
    }
    
    console.log('[useSmartImport] uploadFiles called', {
      fileCount: files.length,
      userId: userIdParam,
      source: sourceParam,
    });
    
    setUploading(true);
    setProgress(0);
    setUploadFileCount({ current: 0, total: files.length });
    setError(null);
    
    // Add files to queue (with dedupe prevention)
    const uploadIds = uploadQueue.addFiles(files);
    
    if (uploadIds.length === 0) {
      console.warn('[useSmartImport] No files added to queue (all duplicates?)');
      setUploading(false);
      return [];
    }
    
    // Wait for all uploads to complete
    return new Promise((resolve, reject) => {
      const results: UploadResult[] = [];
      const completedIds = new Set<string>();
      
      // Subscribe to queue events (only if queue is initialized and has .on method)
      if (!uploadQueue || typeof uploadQueue.on !== 'function') {
        reject(new Error('Upload queue not initialized'));
        return;
      }
      
      const unsubscribe = uploadQueue.on((event) => {
        if (event.type === 'item-completed' && event.item.result) {
          completedIds.add(event.item.id);
          results.push(event.item.result as UploadResult);
          
          // Update progress
          const completed = completedIds.size;
          const total = uploadIds.length;
          setUploadFileCount({ current: completed, total });
          setProgress((completed / total) * 100);
          
          // Check if all done
          if (completed === total) {
            unsubscribe();
            
            // Collect docIds and sync transaction counts
            const docIds = results.map(r => r.docId).filter(Boolean);
            
            // Sync transaction counts
            if (docIds.length > 0 && userIdParam) {
              fetch('/.netlify/functions/smart-import-sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: userIdParam, docIds }),
              })
                .then(res => res.ok ? res.json() : null)
                .then(syncData => {
                  const transactionCount = syncData?.transactionCount ?? 0;
                  const summary = {
                    id: crypto.randomUUID(),
                    finishedAt: new Date().toISOString(),
                    fileCount: files.length,
                    transactionCount: transactionCount > 0 ? transactionCount : undefined,
                  };
                  setLastUploadSummary(summary);
                  completeUpload();
                  setUploading(false);
                  resolve(results);
                })
                .catch(err => {
                  console.error('[useSmartImport] Sync error:', err);
                  const summary = {
                    id: crypto.randomUUID(),
                    finishedAt: new Date().toISOString(),
                    fileCount: files.length,
                  };
                  setLastUploadSummary(summary);
                  completeUpload();
                  setUploading(false);
                  resolve(results);
                });
            } else {
              const summary = {
                id: crypto.randomUUID(),
                finishedAt: new Date().toISOString(),
                fileCount: files.length,
              };
              setLastUploadSummary(summary);
              completeUpload();
              setUploading(false);
              resolve(results);
            }
          }
        } else if (event.type === 'item-error') {
          setError(event.item.error || 'Upload failed');
          // Don't reject - let other files continue
        } else if (event.type === 'queue-progress') {
          setProgress(event.progress.overallProgress);
          setUploadFileCount({
            current: event.progress.completed,
            total: event.progress.total,
          });
        }
      });
      
      // Cleanup on timeout (30 seconds per file max)
      setTimeout(() => {
        if (completedIds.size < uploadIds.length) {
          unsubscribe();
          setUploading(false);
          reject(new Error('Upload timeout'));
        }
      }, uploadIds.length * 30000);
    });
  }, [uploadQueue]);

  /**
   * Upload file from base64 (for chat attachments)
   */
  const uploadBase64 = async (
    userId: string,
    filename: string,
    mime: string,
    base64: string,
    source: UploadSource = 'chat'
  ): Promise<UploadResult> => {
    try {
      setUploading(true);
      setProgress(0);
      setError(null);

      // Step 1: Initialize
      setProgress(10);
      const initRes = await fetch('/.netlify/functions/smart-import-init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, filename, mime, source })
      });

      if (!initRes.ok) throw new Error('Init failed');
      const init = await initRes.json();

      // Step 2: Upload base64 data
      setProgress(40);
      const buffer = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
      
      const uploadRes = await fetch(init.url, {
        method: 'PUT',
        headers: {
          'x-upsert': 'true',
          'authorization': `Bearer ${init.token}`
        },
        body: buffer
      });

      if (!uploadRes.ok) throw new Error('Upload failed');

      // Step 3: Finalize
      setProgress(70);
      const finalizeRes = await fetch('/.netlify/functions/smart-import-finalize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, docId: init.docId })
      });

      if (!finalizeRes.ok) throw new Error('Finalize failed');
      const result = await finalizeRes.json();
      
      setProgress(100);
      return { docId: init.docId, ...result };

    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setUploading(false);
    }
  };

  // Log hook instance creation and state changes
  useEffect(() => {
    console.log('[useSmartImport] hook instance - state changed', {
      uploading,
      progress,
      uploadFileCount,
      hasLastUploadSummary: !!lastUploadSummary,
      lastUploadSummaryId: lastUploadSummary?.id,
      uploadStatus,
    });
  }, [uploading, progress, uploadFileCount, lastUploadSummary, uploadStatus]);
  
  // Optional: Detect completion from stats polling
  // This can be enhanced to check latestImport status from queue stats
  // For now, completion is handled by completeUpload() after uploadFiles finishes
  
  return {
    uploadFile,
    uploadFiles,
    uploadBase64,
    uploading,
    progress,
    error,
    uploadFileCount,
    lastUploadSummary,
    // Shared upload status
    uploadStatus,
    startUpload,
    updateUploadProgress,
    completeUpload,
    failUpload,
    // Upload queue (for UI components)
    uploadQueue: {
      items: uploadQueue.items,
      progress: uploadQueue.progress,
      cancel: uploadQueue.cancel,
      retry: uploadQueue.retry,
      clearCompleted: uploadQueue.clearCompleted,
      clear: uploadQueue.clear,
      isUploading: uploadQueue.isUploading,
      hasErrors: uploadQueue.hasErrors,
    },
  };
}

