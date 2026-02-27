/**
 * Smart Import React Hook
 * 
 * Handles file uploads with automatic guardrails and routing:
 * - Images/PDFs → OCR with PII redaction
 * - CSV/OFX/QIF → Statement parser with PII redaction
 * 
 * All files run through STRICT guardrails before processing
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { useUploadQueue } from './useUploadQueue';
import { debug } from '../lib/logger';
import { useAuth } from '../contexts/AuthContext';
import { runSmartImportPipeline } from '../lib/smartImport/runSmartImportPipeline';

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
  importId?: string;
  importIds?: string[];
  queued: boolean;
  via: 'ocr' | 'statement-parse' | 'vision-parse' | 'unsupported';
  reused?: boolean;
  reuseReason?: string;
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
  docIds?: string[];
  importId?: string;
  importIds?: string[];
  summary?: any;
  issues?: any;
};

export type SmartImportDebugItem = {
  docId: string;
  importId?: string;
  rawTextPreview: string;
  rawTextLength: number;
  cleanedText?: string | null;
  rawText?: string | null;
  parsedTransactions: any[];
  parseWarnings: string[];
  parseError?: string | null;
  ocrEngineUsed?: string | null;
};

const defaultUploadStatus: SmartImportUploadStatus = {
  isUploading: false,
  fileName: undefined,
  progress: 0,
  step: 'idle',
  error: null,
};

export function useSmartImport(userId?: string, source: UploadSource = 'upload') {
  const { session } = useAuth();
  // Use upload queue for concurrent uploads
  const [queueUserId, setQueueUserId] = useState(userId || '');
  const uploadQueue = useUploadQueue({
    userId: queueUserId,
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
  const [lastDebugPayload, setLastDebugPayload] = useState<SmartImportDebugItem[] | null>(null);
  
  // Shared upload status with step tracking
  const [uploadStatus, setUploadStatus] = useState<SmartImportUploadStatus>(defaultUploadStatus);
  const debugRefreshInFlightRef = useRef(false);
  const debugRefreshKeyRef = useRef<string>('');
  const debugRefreshAtRef = useRef<number>(0);
  const resetVersionRef = useRef(0);
  const completionTimerRef = useRef<number | null>(null);
  const debugTimerRef = useRef<number | null>(null);
  const statusResetTimerRef = useRef<number | null>(null);
  
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
    if (statusResetTimerRef.current) {
      window.clearTimeout(statusResetTimerRef.current);
      statusResetTimerRef.current = null;
    }
    setUploadStatus(prev => ({
      ...prev,
      isUploading: false,
      progress: 100,
      step: 'completed',
    }));
    // Keep completion state visible long enough for users to notice.
    statusResetTimerRef.current = window.setTimeout(() => {
      setUploadStatus(defaultUploadStatus);
      statusResetTimerRef.current = null;
    }, 15000);
  }, []);

  const resetUploadState = useCallback(() => {
    resetVersionRef.current += 1;
    if (completionTimerRef.current) {
      window.clearTimeout(completionTimerRef.current);
      completionTimerRef.current = null;
    }
    if (debugTimerRef.current) {
      window.clearTimeout(debugTimerRef.current);
      debugTimerRef.current = null;
    }
    if (statusResetTimerRef.current) {
      window.clearTimeout(statusResetTimerRef.current);
      statusResetTimerRef.current = null;
    }
    debugRefreshInFlightRef.current = false;
    debugRefreshKeyRef.current = '';
    debugRefreshAtRef.current = 0;
    setUploading(false);
    setProgress(0);
    setError(null);
    setUploadFileCount({ current: 0, total: 0 });
    setLastUploadSummary(null);
    setLastDebugPayload(null);
    setUploadStatus(defaultUploadStatus);
    uploadQueue.clear();
  }, [uploadQueue]);

  const refreshDebugPayload = useCallback(async (options?: { includeAllAccounts?: boolean }) => {
    const requestVersion = resetVersionRef.current;
    const effectiveUserId = userId || queueUserId;
    const docIds = lastUploadSummary?.docIds || [];
    if (!effectiveUserId || docIds.length === 0) return;
    const refreshKey = `${docIds.join(',')}|${options?.includeAllAccounts ? 'all' : 'primary'}`;
    const now = Date.now();
    if (debugRefreshInFlightRef.current) return;
    if (refreshKey === debugRefreshKeyRef.current && now - debugRefreshAtRef.current < 5000) {
      return;
    }
    debugRefreshInFlightRef.current = true;
    debugRefreshKeyRef.current = refreshKey;
    debugRefreshAtRef.current = now;
    try {
      const res = await fetch('/.netlify/functions/smart-import-sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({
          userId: effectiveUserId,
          docIds,
          includeAllAccounts: options?.includeAllAccounts,
          waitForOcrMs: 0,
          pollForOcrMs: 250,
        }),
      });
      const syncData = res.ok ? await res.json() : null;
      if (!syncData) return;
      if (requestVersion !== resetVersionRef.current) return;
      if (lastUploadSummary) {
        setLastUploadSummary({
          ...lastUploadSummary,
          transactionCount: syncData?.transactionCount ?? lastUploadSummary.transactionCount,
          importId: syncData?.importIds?.[0] || lastUploadSummary.importId,
          importIds: syncData?.importIds || lastUploadSummary.importIds,
          summary: syncData?.summary ?? lastUploadSummary.summary,
          issues: syncData?.issues ?? lastUploadSummary.issues,
        });
      }
      const debugItems = (() => {
        const fromItems = syncData?.debug?.items;
        if (Array.isArray(fromItems)) {
          return fromItems as SmartImportDebugItem[];
        }
        if (syncData?.rawTextPreview || syncData?.rawTextLength !== undefined) {
          return [{
            docId: syncData?.docId || docIds[0],
            importId: syncData?.importId,
            rawTextPreview: syncData?.rawTextPreview || '',
            rawTextLength: syncData?.rawTextLength || 0,
            cleanedText: syncData?.cleanedText ?? null,
            rawText: syncData?.rawText ?? null,
            parsedTransactions: Array.isArray(syncData?.parsedTransactions) ? syncData.parsedTransactions : [],
            parseWarnings: Array.isArray(syncData?.parseWarnings) ? syncData.parseWarnings : [],
            parseError: syncData?.parseError ?? null,
            ocrEngineUsed: syncData?.ocrEngineUsed ?? null,
          }];
        }
        return null;
      })();
      if (requestVersion !== resetVersionRef.current) return;
      setLastDebugPayload(debugItems);
    } catch (err) {
      console.error('[useSmartImport] Debug refresh error:', err);
    } finally {
      debugRefreshInFlightRef.current = false;
    }
  }, [userId, queueUserId, lastUploadSummary, session]);

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
    userIdParam: string,
    file: File,
    source: UploadSource = 'upload'
  ): Promise<UploadResult> => {
    if (!userIdParam) {
      throw new Error('Smart Import: missing userId (auth not ready)');
    }
    try {
      setUploading(true);
      setProgress(0);
      setError(null);

      const result = await runSmartImportPipeline({
        userId: userIdParam,
        source,
        file,
        fileName: file.name,
        mimeType: file.type,
        fileSize: file.size,
        lastModified: file.lastModified || 0,
        authToken: session?.access_token,
        onProgress: (p) => {
          setProgress(p);
          updateUploadProgress({ progress: p, step: p < 70 ? 'uploading' : 'processing' });
        },
      });
      return result;

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
      throw new Error('Smart Import: missing userId (auth not ready)');
    }

    console.log('[useSmartImport] queueUserId=', queueUserId, 'userIdParam=', userIdParam);
    if (userIdParam && userIdParam !== queueUserId) {
      setQueueUserId(userIdParam);
      await Promise.resolve();
    }

    if (!uploadQueue.isReady) {
      for (let i = 0; i < 10; i += 1) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        if (uploadQueue.isReady) break;
      }
    }
    if (!uploadQueue.isReady) {
      throw new Error('Upload queue not ready. Please try again.');
    }
    
    debug('[useSmartImport] uploadFiles called', {
      fileCount: files.length,
      userId: userIdParam,
      source: sourceParam,
    });
    const runVersion = resetVersionRef.current;
    
    setUploading(true);
    setProgress(0);
    setUploadFileCount({ current: 0, total: files.length });
    setError(null);
    
    // Keep prior queue rows visible in chat so users can see consecutive uploads.
    if (sourceParam !== 'chat' && !uploadQueue.isUploading && uploadQueue.items.length > 0) {
      uploadQueue.clear();
    }

    // Add files to queue (with dedupe prevention)
    let uploadIds = uploadQueue.addFiles(files);

    if (uploadIds.length === 0) {
      console.warn('[useSmartImport] No files added to queue (all duplicates?)');
      uploadQueue.clear();
      uploadIds = uploadQueue.addFiles(files);
    }
    
    if (uploadIds.length === 0) {
      setUploading(false);
      throw new Error('Upload queue is blocked. Please try Reset.');
    }
    
    // Wait for all uploads to complete
    return new Promise((resolve, reject) => {
      const results: UploadResult[] = [];
      const completedIds = new Set<string>();
      const timeoutMs = Math.max(uploadIds.length * 60000, 120000); // 1m per file, min 2m
      let lastActivityAt = Date.now();

      const touchActivity = () => {
        lastActivityAt = Date.now();
      };
      
      // Subscribe to queue events (only if queue is initialized and has .on method)
      if (!uploadQueue || !uploadQueue.isReady || typeof uploadQueue.on !== 'function') {
        reject(new Error('Upload queue not initialized'));
        return;
      }
      
      const unsubscribe = uploadQueue.on((event) => {
        if (runVersion !== resetVersionRef.current) {
          return;
        }
        touchActivity();
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
            window.clearInterval(watchdog);
            
            // Collect docIds and sync transaction counts
            const docIds = results.map(r => r.docId).filter(Boolean);
            const importIds = Array.from(
              new Set(
                results
                  .flatMap((r) => [
                    ...(Array.isArray(r.importIds) ? r.importIds : []),
                    ...(r.importId ? [r.importId] : []),
                  ])
                  .filter((id): id is string => typeof id === 'string' && id.length > 0)
              )
            );

            // Keep UI in processing mode until OCR jobs are done.
            const baseSummary = {
              id: crypto.randomUUID(),
              finishedAt: new Date().toISOString(),
              fileCount: files.length,
              docIds,
              importId: importIds[0],
              importIds,
            };
            setLastUploadSummary(baseSummary);
            setLastDebugPayload(null);
            updateUploadProgress({
              isUploading: true,
              progress: 95,
              step: 'processing',
              error: null,
            });
            if (sourceParam !== 'chat') {
              uploadQueue.clearCompleted();
            }
            resolve(results);
            const totalTx = results.reduce((sum, item) => sum + (item.transactionCount || 0), 0);
            setLastUploadSummary({
              ...baseSummary,
              transactionCount: totalTx > 0 ? totalTx : undefined,
            });
            const hasPendingProcessing = results.some((item) =>
              Boolean(item.queued) || (
                item.transactionCount === undefined &&
                item.normalizedTransactionCount === undefined &&
                item.stats?.transactionCount === undefined
              )
            );
            if (hasPendingProcessing) {
              // Keep panel in processing mode while backend catch-up completes.
              if (completionTimerRef.current) {
                window.clearTimeout(completionTimerRef.current);
              }
              completionTimerRef.current = window.setTimeout(() => {
                if (runVersion !== resetVersionRef.current) return;
                completeUpload();
                completionTimerRef.current = null;
              }, 45000);
            } else {
              completeUpload();
            }
            if (debugTimerRef.current) {
              window.clearTimeout(debugTimerRef.current);
            }
            debugTimerRef.current = window.setTimeout(() => {
              if (runVersion !== resetVersionRef.current) return;
              refreshDebugPayload({ includeAllAccounts: false });
              debugTimerRef.current = null;
            }, 1500);
            setUploading(false);
          }
        } else if (event.type === 'item-error') {
          if (runVersion !== resetVersionRef.current) return;
          setError(event.item.error || 'Upload failed');
          // Don't reject - let other files continue
        } else if (event.type === 'queue-progress') {
          if (runVersion !== resetVersionRef.current) return;
          setProgress(event.progress.overallProgress);
          setUploadFileCount({
            current: event.progress.completed,
            total: event.progress.total,
          });
        }
      });

      const watchdog = window.setInterval(() => {
        if (Date.now() - lastActivityAt > timeoutMs) {
          unsubscribe();
          window.clearInterval(watchdog);
          setUploading(false);
          reject(new Error('Upload timeout'));
        }
      }, 5000);
    });
  }, [queueUserId, uploadQueue, session, completeUpload, failUpload, updateUploadProgress, refreshDebugPayload]);

  /**
   * Upload file from base64 (for chat attachments)
   */
  const uploadBase64 = async (
    userIdParam: string,
    filename: string,
    mime: string,
    base64: string,
    source: UploadSource = 'chat'
  ): Promise<UploadResult> => {
    if (!userIdParam) {
      throw new Error('Smart Import: missing userId (auth not ready)');
    }
    try {
      setUploading(true);
      setProgress(0);
      setError(null);
      const estimatedSize = Math.floor((base64.length * 3) / 4);
      const result = await runSmartImportPipeline({
        userId: userIdParam,
        source,
        base64,
        fileName: filename,
        mimeType: mime,
        fileSize: estimatedSize,
        lastModified: 0,
        authToken: session?.access_token,
        onProgress: (p) => setProgress(p),
      });
      return result;

    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setUploading(false);
    }
  };

  // Log hook instance creation and state changes
  useEffect(() => {
    debug('[useSmartImport] hook instance - state changed', {
      uploading,
      progress,
      uploadFileCount,
      hasLastUploadSummary: !!lastUploadSummary,
      lastUploadSummaryId: lastUploadSummary?.id,
      hasLastDebugPayload: !!lastDebugPayload,
      uploadStatus,
    });
  }, [uploading, progress, uploadFileCount, lastUploadSummary, lastDebugPayload, uploadStatus]);
  
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
    lastDebugPayload,
    // Shared upload status
    uploadStatus,
    startUpload,
    updateUploadProgress,
    completeUpload,
    failUpload,
    resetUploadState,
    refreshDebugPayload,
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

