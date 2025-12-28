/**
 * React Hook for Upload Queue
 * 
 * Wraps UploadQueue with React state management for UI components.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { UploadQueue, UploadQueueItem, UploadQueueProgress, UploadQueueEvent, generateUploadId } from '../lib/upload/uploadQueue';
import { uploadWithProgress } from '../lib/upload/uploadWithProgress';
import type { UploadResult } from './useSmartImport';

export interface UseUploadQueueOptions {
  userId: string;
  source?: 'upload' | 'chat';
  concurrency?: number; // Override default (2 desktop, 1 mobile)
}

export interface UseUploadQueueReturn {
  // Queue state
  items: UploadQueueItem[];
  progress: UploadQueueProgress;
  
  // Actions
  addFiles: (files: File[]) => string[];
  cancel: (uploadId: string) => void;
  retry: (uploadId: string) => void;
  clearCompleted: () => void;
  clear: () => void;
  
  // Status
  isUploading: boolean;
  hasErrors: boolean;
  
  // Results
  results: Map<string, UploadResult>;
}

export function useUploadQueue(options: UseUploadQueueOptions): UseUploadQueueReturn {
  const { userId, source = 'upload', concurrency } = options;
  
  const [items, setItems] = useState<UploadQueueItem[]>([]);
  const [progress, setProgress] = useState<UploadQueueProgress>({
    total: 0,
    completed: 0,
    failed: 0,
    cancelled: 0,
    uploading: 0,
    pending: 0,
    overallProgress: 0,
    overallSpeed: 0,
    overallEta: 0,
  });
  const [results, setResults] = useState<Map<string, UploadResult>>(new Map());
  
  const queueRef = useRef<UploadQueue | null>(null);
  const uploadIdPrefixRef = useRef<string | null>(null);

  // Initialize queue
  useEffect(() => {
    // Generate stable upload ID prefix for this session (prevents duplicates on refresh)
    if (!uploadIdPrefixRef.current) {
      uploadIdPrefixRef.current = `upload-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    }

    const queue = new UploadQueue(
      async (file: File, onProgress?: (progress: number) => void) => {
        return uploadWithProgress({
          userId,
          file,
          source,
          requestId: generateUploadId(file), // Use stable upload ID for idempotency
          onProgress,
        });
      },
      concurrency
    );

    queueRef.current = queue;

    // Subscribe to queue events
    const unsubscribe = queue.on((event: UploadQueueEvent) => {
      const state = queue.getState();
      setItems(state.items);
      setProgress(state.progress);

      if (event.type === 'item-completed') {
        setResults(prev => {
          const next = new Map(prev);
          next.set(event.item.id, event.item.result);
          return next;
        });
      }
    });

    return () => {
      unsubscribe();
      queue.clear();
    };
  }, [userId, source, concurrency]);

  const addFiles = useCallback((files: File[]): string[] => {
    if (!queueRef.current) return [];
    return queueRef.current.addFiles(files, uploadIdPrefixRef.current || undefined);
  }, []);

  const cancel = useCallback((uploadId: string) => {
    queueRef.current?.cancel(uploadId);
  }, []);

  const retry = useCallback((uploadId: string) => {
    queueRef.current?.retry(uploadId);
  }, []);

  const clearCompleted = useCallback(() => {
    queueRef.current?.clearCompleted();
    setResults(new Map());
  }, []);

  const clear = useCallback(() => {
    queueRef.current?.clear();
    setResults(new Map());
  }, []);

  const isUploading = progress.uploading > 0 || progress.pending > 0;
  const hasErrors = progress.failed > 0;

  return {
    items,
    progress,
    addFiles,
    cancel,
    retry,
    clearCompleted,
    clear,
    isUploading,
    hasErrors,
    results,
  };
}


