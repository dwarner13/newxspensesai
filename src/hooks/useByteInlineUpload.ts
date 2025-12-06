/**
 * Byte Inline Upload Hook
 * 
 * Wraps useSmartImport for Byte chat panel uploads.
 * Provides simplified API for inline upload UI components.
 */

import { useCallback } from 'react';
import { useSmartImport, type UploadSource } from './useSmartImport';

export type UseByteInlineUploadResult = {
  isUploading: boolean;
  progressLabel?: string;
  handleFilesSelected: (files: FileList | File[]) => void;
  resetUpload: () => void;
  error?: string | null;
};

/**
 * Hook for Byte inline upload functionality
 * 
 * @param userId - User ID (required for uploads)
 * @returns Upload state and handlers
 */
export function useByteInlineUpload(userId?: string): UseByteInlineUploadResult {
  const {
    uploadFiles,
    uploading,
    uploadStatus,
    error,
    completeUpload,
  } = useSmartImport();

  // Convert uploadStatus.step to user-friendly label
  const getProgressLabel = useCallback((): string | undefined => {
    if (!uploading && uploadStatus.step === 'idle') {
      return undefined;
    }

    switch (uploadStatus.step) {
      case 'uploading':
        return uploadStatus.fileName 
          ? `Uploading ${uploadStatus.fileName}...`
          : 'Uploading your file...';
      case 'processing':
        return 'Extracting transactions...';
      case 'completed':
        return 'Processing complete!';
      case 'error':
        return `Error: ${uploadStatus.error || 'Upload failed'}`;
      default:
        return 'Processing your documents...';
    }
  }, [uploading, uploadStatus]);

  // Handle file selection
  const handleFilesSelected = useCallback(async (files: FileList | File[]) => {
    if (!userId) {
      console.error('[useByteInlineUpload] userId required for uploads');
      return;
    }

    // Convert FileList to array if needed
    const fileArray = Array.isArray(files) ? files : Array.from(files);
    
    if (fileArray.length === 0) {
      return;
    }

    try {
      // Use 'chat' as source to indicate upload came from chat panel
      await uploadFiles(userId, fileArray, 'chat' as UploadSource);
    } catch (err) {
      console.error('[useByteInlineUpload] Upload failed:', err);
      // Error is already handled by useSmartImport
    }
  }, [userId, uploadFiles]);

  // Reset upload state
  const resetUpload = useCallback(() => {
    // Complete upload will reset state after a delay
    // For immediate reset, we could add a reset function to useSmartImport
    // For now, just call completeUpload which resets after 2 seconds
    completeUpload();
  }, [completeUpload]);

  return {
    isUploading: uploading,
    progressLabel: getProgressLabel(),
    handleFilesSelected,
    resetUpload,
    error: error || uploadStatus.error,
  };
}




