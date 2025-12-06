/**
 * Shared Smart Import Upload State Hook
 * 
 * Provides a shared source of truth for upload status across:
 * - Byte chat (EmployeeChatWorkspace)
 * - Byte workspace panel (ByteWorkspacePanel)
 * - Smart Import dashboard
 * 
 * This ensures uploads from chat and workspace are synchronized and visible in both places.
 */

import { useState, useCallback, useEffect, useRef } from 'react';

export type UploadSource = 'chat' | 'workspace';

export type UploadStatusType = 'uploading' | 'processing' | 'completed' | 'failed';

export interface UploadStatus {
  id: string;          // client-side ID or server import ID
  fileName: string;
  source: UploadSource;
  status: UploadStatusType;
  progress?: number;   // optional percentage if available
  error?: string;
  createdAt: number;  // timestamp for cleanup
}

// Global state (shared across all components using this hook)
let globalUploads: UploadStatus[] = [];
const listeners = new Set<() => void>();

function notifyListeners() {
  listeners.forEach(listener => listener());
}

export function useSmartImportUploadState() {
  const [uploads, setUploads] = useState<UploadStatus[]>(globalUploads);
  
  // Subscribe to global state changes
  useEffect(() => {
    const listener = () => {
      setUploads([...globalUploads]);
    };
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);
  
  const addUpload = useCallback((upload: Omit<UploadStatus, 'id' | 'createdAt'>) => {
    const newUpload: UploadStatus = {
      ...upload,
      id: `upload-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: Date.now(),
    };
    
    globalUploads = [...globalUploads, newUpload];
    notifyListeners();
  }, []);
  
  const updateUpload = useCallback((id: string, updates: Partial<UploadStatus>) => {
    globalUploads = globalUploads.map(upload =>
      upload.id === id ? { ...upload, ...updates } : upload
    );
    notifyListeners();
  }, []);
  
  const finishUpload = useCallback((id: string) => {
    updateUpload(id, { status: 'completed', progress: 100 });
    
    // Clean up after 5 seconds
    setTimeout(() => {
      globalUploads = globalUploads.filter(u => u.id !== id);
      notifyListeners();
    }, 5000);
  }, [updateUpload]);
  
  const failUpload = useCallback((id: string, error: string) => {
    updateUpload(id, { status: 'failed', error });
    
    // Clean up after 10 seconds
    setTimeout(() => {
      globalUploads = globalUploads.filter(u => u.id !== id);
      notifyListeners();
    }, 10000);
  }, [updateUpload]);
  
  // Clean up old completed/failed uploads (older than 30 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const before = globalUploads.length;
      globalUploads = globalUploads.filter(u => {
        if (u.status === 'completed' || u.status === 'failed') {
          return (now - u.createdAt) < 30000; // Keep for 30 seconds
        }
        return true; // Keep active uploads
      });
      if (globalUploads.length !== before) {
        notifyListeners();
      }
    }, 5000); // Check every 5 seconds
    
    return () => clearInterval(interval);
  }, []);
  
  return {
    uploads,
    addUpload,
    updateUpload,
    finishUpload,
    failUpload,
  };
}





