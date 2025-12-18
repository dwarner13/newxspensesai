/**
 * Byte Upload Panel Component
 * 
 * Compact upload UI for Byte chat that reuses Smart Import upload logic.
 * Shows drag-and-drop area and upload button, matching the Smart Import AI page behavior.
 */

import React, { useRef, useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UploadCloud, Loader2, ExternalLink } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useSmartImport } from '../../hooks/useSmartImport';
import toast from 'react-hot-toast';

export interface ByteUploadPanelProps {
  /** Optional callback when upload completes */
  onUploadCompleted?: () => void;
}

export function ByteUploadPanel({ onUploadCompleted }: ByteUploadPanelProps) {
  const navigate = useNavigate();
  const { userId } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  // Use the same Smart Import hook as the main page
  const {
    uploading: isUploading,
    progress: uploadProgress,
    uploadFileCount,
    uploadFiles,
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
        toast.error(`Upload failed: ${err?.message || 'Unknown error'}`, { id: toastId });
      }
    },
    [userId, uploadFiles, onUploadCompleted]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

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
        toast.error(`Upload failed: ${err?.message || 'Unknown error'}`, { id: toastId });
      }
    },
    [userId, uploadFiles, onUploadCompleted]
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

  return (
    <div className="rounded-xl bg-slate-900/40 border border-dashed border-sky-500/30 px-3 py-2.5 backdrop-blur-sm">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <div className="text-xs font-medium text-slate-200 mb-0.5">
            Upload statements / receipts
          </div>
          <div className="text-[10px] text-slate-400 leading-tight">
            PDF, CSV, JPG/PNG • Max 25MB
          </div>
        </div>
        <button
          type="button"
          className="shrink-0 text-[10px] px-2 py-1 rounded-md border border-sky-500/40 text-sky-300 hover:bg-sky-500/10 transition-colors flex items-center gap-1"
          onClick={handleOpenFullConsole}
        >
          <ExternalLink className="w-3 h-3" />
          Console
        </button>
      </div>

      {/* Drag and drop area - more compact */}
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
    </div>
  );
}





