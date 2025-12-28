/**
 * Byte Upload Panel Component
 * 
 * Compact upload UI for Byte chat that reuses Smart Import upload logic.
 * Shows drag-and-drop area and upload button, matching the Smart Import AI page behavior.
 */

// ====== BYTE UPLOAD PANEL ======

import React, { useRef, useCallback, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UploadCloud, Loader2, ExternalLink, Trash2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useSmartImport } from '../../hooks/useSmartImport';
import { GuardrailsActivePill } from '../upload/GuardrailsActivePill';
import { emitSecurityMessage } from '../../lib/primeSecurityMessages';
import { getSupabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

export interface ByteUploadPanelProps {
  /** Optional callback when upload completes */
  onUploadCompleted?: () => void;
  /** Compact mode - hide drag area, show only header */
  compact?: boolean;
  /** Callback when drag state changes (for overlay coordination) */
  onDragStateChange?: (isDragging: boolean) => void;
}

export function ByteUploadPanel({ onUploadCompleted, compact = false, onDragStateChange }: ByteUploadPanelProps) {
  const navigate = useNavigate();
  const { userId, user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [currentUploadIds, setCurrentUploadIds] = useState<string[]>([]);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [discardingUploadId, setDiscardingUploadId] = useState<string | null>(null);
  
  // Use the same Smart Import hook as the main page
  const {
    uploading: isUploading,
    progress: uploadProgress,
    uploadFileCount,
    uploadFiles,
    uploadStatus,
  } = useSmartImport();

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;

      if (!userId) {
        toast.error('Please log in to upload files');
        return;
      }

      const fileArray = Array.from(files);
      e.target.value = ''; // Reset input

      const toastId = toast.loading(`Uploading ${fileArray.length} file(s)...`);

      try {
        const results = await uploadFiles(userId, fileArray, 'chat');

        const rejected = results?.filter((r: any) => r?.rejected) ?? [];
        const successful = results?.filter((r: any) => !r?.rejected) ?? [];

        if (rejected.length > 0) {
          rejected.forEach((r: any) => {
            toast.error(`File was rejected: ${r.reason || 'Unknown error'}`, { id: toastId });
          });
        }

        if (successful.length > 0) {
          // Track upload IDs for discard functionality
          const docIds = successful.map((r: any) => r.docId).filter(Boolean);
          setCurrentUploadIds(docIds);
          
          // Emit security message (once per upload)
          if (userId && docIds.length > 0) {
            emitSecurityMessage(userId, 'upload_processing_started', docIds[0]);
          }
          
          toast.success(
            `${successful.length} file(s) uploaded successfully. Byte is processing them now.`,
            { id: toastId }
          );
          onUploadCompleted?.();
        }

        if (successful.length === 0 && rejected.length === 0) {
          toast.dismiss(toastId);
        }
      } catch (err: any) {
        console.error('[ByteUploadPanel] Upload error:', err);
        
        // Emit security message for failed/canceled upload
        if (userId) {
          emitSecurityMessage(userId, 'upload_failed_or_canceled');
        }
        
        toast.error(`Upload failed: ${err?.message || 'Unknown error'}`, { id: toastId });
      }
    },
    [userId, uploadFiles, onUploadCompleted]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) {
      setIsDragging(true);
      onDragStateChange?.(true);
    }
  }, [isDragging, onDragStateChange]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isDragging) {
      setIsDragging(false);
      onDragStateChange?.(false);
    }
  }, [isDragging, onDragStateChange]);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      onDragStateChange?.(false);

      const files = e.dataTransfer.files;
      if (!files || files.length === 0) return;

      if (!userId) {
        toast.error('Please log in to upload files');
        return;
      }

      const fileArray = Array.from(files);
      const toastId = toast.loading(`Uploading ${fileArray.length} file(s)...`);

      try {
        const results = await uploadFiles(userId, fileArray, 'chat');

        const rejected = results?.filter((r: any) => r?.rejected) ?? [];
        const successful = results?.filter((r: any) => !r?.rejected) ?? [];

        if (rejected.length > 0) {
          rejected.forEach((r: any) => {
            toast.error(`File was rejected: ${r.reason || 'Unknown error'}`, { id: toastId });
          });
        }

        if (successful.length > 0) {
          // Track upload IDs for discard functionality
          const docIds = successful.map((r: any) => r.docId).filter(Boolean);
          setCurrentUploadIds(docIds);
          
          // Emit security message (once per upload)
          if (userId && docIds.length > 0) {
            emitSecurityMessage(userId, 'upload_processing_started', docIds[0]);
          }
          
          toast.success(
            `${successful.length} file(s) uploaded successfully. Byte is processing them now.`,
            { id: toastId }
          );
          onUploadCompleted?.();
        }

        if (successful.length === 0 && rejected.length === 0) {
          toast.dismiss(toastId);
        }
      } catch (err: any) {
        console.error('[ByteUploadPanel] Upload error:', err);
        
        // Emit security message for failed/canceled upload
        if (userId) {
          emitSecurityMessage(userId, 'upload_failed_or_canceled');
        }
        
        toast.error(`Upload failed: ${err?.message || 'Unknown error'}`, { id: toastId });
      }
    },
    [userId, uploadFiles, onUploadCompleted, onDragStateChange]
  );

  const handleButtonClick = useCallback(() => {
    if (!userId) {
      toast.error('Please log in to upload files');
      return;
    }
    fileInputRef.current?.click();
  }, [userId]);

  const handleOpenFullConsole = useCallback(() => {
    navigate('/dashboard/smart-import-ai');
  }, [navigate]);

  const handleDiscard = useCallback(async (uploadId: string) => {
    if (!userId || !user) {
      toast.error('Please log in to discard uploads');
      return;
    }

    setDiscardingUploadId(uploadId);
    setShowDiscardConfirm(false);

    try {
      // Get Supabase session token
      const supabase = getSupabase();
      if (!supabase) {
        throw new Error('Supabase not available');
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Not authenticated');
      }

      // Call delete endpoint
      const response = await fetch('/.netlify/functions/delete-upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ uploadId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to discard upload');
      }

      const result = await response.json();

      // Remove from current upload IDs
      setCurrentUploadIds(prev => prev.filter(id => id !== uploadId));

      // Emit success message
      await emitSecurityMessage(userId, 'upload_discard_success', uploadId);

      toast.success('Upload discarded successfully');
    } catch (err: any) {
      console.error('[ByteUploadPanel] Discard error:', err);
      
      // Emit failure message
      if (userId) {
        await emitSecurityMessage(userId, 'upload_discard_failed', uploadId);
      }
      
      toast.error(`Failed to discard upload: ${err?.message || 'Unknown error'}`);
    } finally {
      setDiscardingUploadId(null);
    }
  }, [userId, user]);

  // Reset upload IDs when upload completes or fails
  useEffect(() => {
    if (uploadStatus.step === 'completed' || uploadStatus.step === 'error') {
      // Keep IDs for a bit to allow discard, then clear after delay
      const timeoutId = setTimeout(() => {
        setCurrentUploadIds([]);
      }, 30000); // Clear after 30 seconds
      return () => clearTimeout(timeoutId);
    }
  }, [uploadStatus.step]);

  const isProcessing = uploadStatus.step === 'uploading' || uploadStatus.step === 'processing';
  const canDiscard = currentUploadIds.length > 0 && (isProcessing || uploadStatus.step === 'error');

  return (
    <div className="rounded-xl bg-slate-900/40 border border-dashed border-sky-500/30 px-3 py-2.5 backdrop-blur-sm">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <div className="text-xs font-medium text-slate-200">
              Upload statements / receipts
            </div>
            {/* Guardrails Active Pill */}
            {isProcessing && (
              <GuardrailsActivePill isActive={true} />
            )}
          </div>
          <div className="text-[10px] text-slate-400 leading-tight">
            PDF, CSV, JPG/PNG • Max 25MB
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Discard Button */}
          {canDiscard && (
            <button
              type="button"
              onClick={() => {
                if (currentUploadIds.length === 1) {
                  setShowDiscardConfirm(true);
                } else {
                  // Multiple uploads - discard first one for now
                  setShowDiscardConfirm(true);
                }
              }}
              disabled={discardingUploadId !== null}
              className="shrink-0 text-[10px] px-2 py-1 rounded-md border border-red-500/40 text-red-300 hover:bg-red-500/10 transition-colors flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Trash2 className="w-3 h-3" />
              Discard
            </button>
          )}
          <button
            type="button"
            className="shrink-0 text-[10px] px-2 py-1 rounded-md border border-sky-500/40 text-sky-300 hover:bg-sky-500/10 transition-colors flex items-center gap-1"
            onClick={handleOpenFullConsole}
          >
            <ExternalLink className="w-3 h-3" />
            Console
          </button>
        </div>
      </div>

      {/* Drag and drop area - hidden in compact mode (overlay handles drag) */}
      {!compact && (
        <div
          className={`
            relative border border-dashed rounded-lg p-2.5 text-center transition-all duration-200
            ${
              isDragging
                ? 'border-sky-400 bg-sky-500/10 shadow-md shadow-sky-500/20'
                : 'border-sky-500/30 hover:border-sky-500/50 hover:bg-sky-500/5'
            }
            ${isUploading ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}
          `}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={!isUploading ? handleButtonClick : undefined}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.csv,.xlsx,.xls,.txt,.jpg,.jpeg,.png,.heic"
            onChange={handleFileSelect}
            className="hidden"
            disabled={isUploading}
          />

          {isUploading ? (
            <div className="flex flex-col items-center gap-1.5">
              <Loader2 className="w-4 h-4 text-sky-400 animate-spin" />
              <div className="text-[10px] text-slate-300">
                {uploadFileCount?.total && uploadFileCount.total > 1
                  ? `Uploading ${uploadFileCount.current}/${uploadFileCount.total}...`
                  : 'Uploading...'}
              </div>
              {uploadProgress !== null && uploadProgress > 0 && (
                <div className="w-full max-w-[200px] bg-slate-800/50 rounded-full h-1 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-sky-400 to-sky-500 h-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1.5">
              <UploadCloud className="w-4 h-4 text-sky-400" />
              <div className="text-[10px] font-medium text-slate-300">
                Click or drag files
              </div>
              <div className="text-[9px] text-slate-500">
                Max 25MB
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Hidden file input for compact mode */}
      {compact && (
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.csv,.xlsx,.xls,.txt,.jpg,.jpeg,.png,.heic"
          onChange={handleFileSelect}
          className="hidden"
          disabled={isUploading}
        />
      )}

      {/* Discard Confirmation Dialog */}
      {showDiscardConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 border border-slate-700/60 rounded-xl p-6 max-w-md mx-4 shadow-xl">
            <h3 className="text-lg font-semibold text-white mb-2">Discard this upload?</h3>
            <p className="text-sm text-slate-300 mb-6">
              Discarding removes this upload and any extracted data. Continue?
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setShowDiscardConfirm(false)}
                className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const uploadId = currentUploadIds[0];
                  if (uploadId) {
                    handleDiscard(uploadId);
                  }
                }}
                disabled={discardingUploadId !== null}
                className="px-4 py-2 text-sm font-medium bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {discardingUploadId ? 'Discarding...' : 'Discard'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}





