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

export function useSmartImport() {
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
   * Upload multiple files sequentially with progress tracking
   */
  const uploadFiles = async (
    userId: string,
    files: File[],
    source: UploadSource = 'upload'
  ): Promise<UploadResult[]> => {
    if (!files || files.length === 0) return [];
    
    console.log('[useSmartImport] uploadFiles called', {
      fileCount: files.length,
      userId,
      source,
    });
    
    const firstFile = files[0];
    startUpload(firstFile);
    
    setUploading(true);
    setProgress(0);
    setUploadFileCount({ current: 1, total: files.length });
    setError(null);
    
    console.log('[useSmartImport] update - upload started', {
      uploading: true,
      progress: 0,
      uploadFileCount: { current: 1, total: files.length },
    });
    
    const results: UploadResult[] = [];
    
    try {
      // Upload sequentially to avoid rate limiting
      for (let i = 0; i < files.length; i++) {
        const currentFileNum = i + 1;
        setUploadFileCount({ current: currentFileNum, total: files.length });
        
        // Calculate progress based on file index
        const fileProgress = ((i + 1) / files.length) * 100;
        const newProgress = Math.min(fileProgress, 95); // Cap at 95% until all complete
        setProgress(newProgress);
        
        console.log('[useSmartImport] update during upload', {
          fileIndex: i,
          currentFile: currentFileNum,
          totalFiles: files.length,
          progress: newProgress,
          uploadFileCount: { current: currentFileNum, total: files.length },
        });
        
        const result = await uploadFile(userId, files[i], source);
        results.push(result);
      }
      
      // All files uploaded successfully
      setProgress(100);
      updateUploadProgress({ progress: 100, step: 'processing' });
      
      console.log('[useSmartImport] update - all files uploaded, setting progress to 100%');
      
      // Collect docIds from upload results
      const docIds = results.map(r => r.docId).filter(Boolean);
      
      // If we have docIds, call smart-import-sync to fetch real transactionCount
      let transactionCount = 0;
      
      if (docIds.length > 0) {
        try {
          console.log('[useSmartImport] Calling smart-import-sync', { docIds });
          
          const syncRes = await fetch('/.netlify/functions/smart-import-sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, docIds }),
          });
          
          if (syncRes.ok) {
            const syncData = await syncRes.json() as { docIds: string[]; transactionCount: number; };
            transactionCount = syncData.transactionCount ?? 0;
            console.log('[useSmartImport] smart-import-sync success', { transactionCount });
          } else {
            const errorText = await syncRes.text();
            console.error('[useSmartImport] smart-import-sync failed', errorText);
          }
        } catch (err: any) {
          console.error('[useSmartImport] smart-import-sync error', err);
        }
      }
      
      // Fallback to old behavior if transactionCount is still 0
      if (transactionCount === 0) {
        transactionCount = results.reduce((sum, r) => {
          return sum + (r.transactionCount || r.normalizedTransactionCount || r.stats?.transactionCount || 0);
        }, 0);
        console.log('[useSmartImport] Using fallback transactionCount', { transactionCount });
      }
      
      // Create upload summary for Activity Feed
      // transactionCount should now be accurate from sync step, but may still be 0 if jobs haven't finished yet
      const summary = {
        id: crypto.randomUUID(),
        finishedAt: new Date().toISOString(),
        fileCount: files.length,
        transactionCount: transactionCount > 0 ? transactionCount : undefined,
      };
      setLastUploadSummary(summary);
      
      // Mark upload as completed
      completeUpload();
      
      console.log('[useSmartImport] update - upload complete', {
        progress: 100,
        uploadFileCount: { current: files.length, total: files.length },
        lastUploadSummary: summary,
        transactionCount,
      });
      
      return results;
    } catch (err: any) {
      console.error('[useSmartImport] Upload failed', err);
      setError(err.message);
      failUpload(err.message);
      throw err;
    } finally {
      // Keep the 100% state visible briefly so users see it
      setTimeout(() => {
        setUploading(false);
        setProgress(0);
        setUploadFileCount({ current: 0, total: 0 });
      }, 800);
    }
  };

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
  };
}

