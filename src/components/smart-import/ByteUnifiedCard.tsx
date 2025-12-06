/**
 * ByteUnifiedCard Component
 * 
 * Unified employee card for Byte (Smart Import AI)
 * Contains action buttons (Upload, Queue, Stats) in the header section
 * Stats display is in ByteWorkspacePanel (left column)
 * Upload functionality is handled here in the center card
 */

import React, { useRef, useCallback } from 'react';
import { Upload, List, BarChart3 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useByteQueueStats } from '../../hooks/useByteQueueStats';
import { useSmartImportUploadState } from '../../hooks/useSmartImportUploadState';
import toast from 'react-hot-toast';

interface ByteUnifiedCardProps {
  onExpandClick?: () => void;
  onChatInputClick?: () => void;
  onUploadClick?: () => void;
  onUploadStart?: () => void; // Callback when upload starts (for auto-opening console)
  // Upload props from parent hook instance
  onUploadFiles?: (userId: string, files: File[], source?: 'upload' | 'chat') => Promise<any[]>;
  uploadFileCount?: { current: number; total: number };
  uploadProgress?: number | null;
  isUploading?: boolean;
}

export function ByteUnifiedCard({ 
  onExpandClick, 
  onChatInputClick, 
  onUploadClick,
  onUploadStart,
  onUploadFiles,
  uploadFileCount,
  uploadProgress,
  isUploading = false,
}: ByteUnifiedCardProps) {
  const { userId } = useAuth();
  const { refetch: refetchStats } = useByteQueueStats();
  
  // Task B: Shared upload state hook (must be at component level)
  const { addUpload } = useSmartImportUploadState();
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle file upload - universal uploader (no validation, Smart Import handles everything)
  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;

      if (!files || files.length === 0) {
        return;
      }

      if (!userId) {
        toast.error('Please log in to upload files');
        return;
      }

      // IMPORTANT: build the array immediately from the FileList
      const fileArray = Array.from(files);

      // Clear input AFTER we build the array,
      // so the user can re-select the same file later
      e.target.value = '';

      if (fileArray.length === 0) {
        console.warn('[ByteUnifiedCard] fileArray is empty after conversion – aborting upload');
        toast.error('No files to upload');
        return;
      }

      if (!onUploadFiles) {
        console.error('[ByteUnifiedCard] onUploadFiles prop is missing!');
        toast.error('Upload function not available');
        return;
      }

      // Task B: Add to shared upload state immediately
      fileArray.forEach((file, index) => {
        addUpload({
          fileName: file.name,
          source: 'workspace',
          status: 'uploading',
          progress: 5,
        });
      });

      // Auto-open Byte console when upload starts
      if (onUploadStart) {
        onUploadStart();
      }

      const toastId = toast.loading(`Uploading ${fileArray.length} file(s)...`);

      try {
        const results = await onUploadFiles(userId, fileArray, 'upload');

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
          // Refresh queue stats after successful upload
          refetchStats();
        }

        if (successful.length === 0 && rejected.length === 0) {
          toast.dismiss(toastId);
        }
      } catch (err: any) {
        console.error('[ByteUnifiedCard] Upload error:', err);
        toast.error(`Upload failed: ${err?.message || 'Unknown error'}`, { id: toastId });
      }
    },
    [userId, onUploadFiles, refetchStats]
  );

  const handleUploadButtonClick = useCallback(() => {
    // Auto-open Byte console when upload button is clicked
    if (onUploadStart) {
      onUploadStart();
    }
    if (onUploadClick) {
      onUploadClick();
    } else {
      if (!userId) {
        toast.error('Please log in to upload files');
        return;
      }
      fileInputRef.current?.click();
    }
  }, [userId, onUploadClick, onUploadStart]);

  const handleQueueClick = useCallback(() => {
    // Scroll to workspace panel
    const workspacePanel = document.querySelector('[data-workspace-panel]');
    if (workspacePanel) {
      workspacePanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  const handleStatsClick = useCallback(() => {
    // Scroll to workspace panel stats section
    const workspacePanel = document.querySelector('[data-workspace-panel]');
    if (workspacePanel) {
      workspacePanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  return (
    <div className="relative overflow-hidden rounded-3xl border border-slate-700/60 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-950 shadow-[0_18px_60px_rgba(15,23,42,0.85)] p-6 flex flex-col h-full">
      {/* Subtle radial glow behind Byte icon */}
      <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-sky-500/10 blur-3xl" />
      
      {/* Top Section - Dark Premium Card Header */}
      <div className="relative flex-shrink-0 pb-6">
        {/* Header with Icon + Title + Description */}
        <div className="flex items-start gap-4 mb-3">
          {/* Avatar Circle - Glowing */}
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-sky-500/20 shadow-[0_0_40px_rgba(56,189,248,0.7)] flex-shrink-0">
            <span className="text-2xl">📄</span>
          </div>
          
          {/* Title and Description */}
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold text-slate-50 leading-tight truncate">
              Byte — Smart Import AI
            </h2>
            <p className="text-xs text-slate-300/80 mt-1 line-clamp-2">
              Smart Import specialist · Handles documents, OCR and clean transaction data.
            </p>
          </div>
        </div>

        {/* Three Stats Row - Soft labels */}
        <div className="flex items-center gap-2 sm:gap-4 mb-3">
          <div className="flex-1 flex flex-col items-center text-center">
            <div className="text-2xl font-bold text-cyan-400">99.7%</div>
            <p className="text-[11px] uppercase tracking-wide text-slate-400/80">Accuracy</p>
          </div>
          <div className="flex-1 flex flex-col items-center text-center">
            <div className="text-2xl font-bold text-green-400">2.3s</div>
            <p className="text-[11px] uppercase tracking-wide text-slate-400/80">Avg Speed</p>
          </div>
          <div className="flex-1 flex flex-col items-center text-center">
            <div className="text-2xl font-bold text-purple-400">24/7</div>
            <p className="text-[11px] uppercase tracking-wide text-slate-400/80">Available</p>
          </div>
        </div>

        {/* Three Action Buttons Row - Soft glass buttons */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.csv,.xlsx,.xls,.jpg,.jpeg,.png,.heic"
            onChange={handleFileSelect}
            className="hidden"
          />
          <button 
            onClick={handleUploadButtonClick}
            disabled={isUploading || !userId}
            className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-white/5 px-4 py-2 text-xs font-medium text-slate-100 hover:bg-white/10 transition-colors whitespace-nowrap disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <Upload className="h-4 w-4" />
            <span>{isUploading ? `Uploading... ${uploadProgress ?? 0}%` : 'Upload'}</span>
          </button>
          <button 
            onClick={handleQueueClick}
            className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-white/5 px-4 py-2 text-xs font-medium text-slate-100 hover:bg-white/10 transition-colors whitespace-nowrap"
          >
            <List className="h-4 w-4" />
            <span>Queue</span>
          </button>
          <button 
            onClick={handleStatsClick}
            className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-white/5 px-4 py-2 text-xs font-medium text-slate-100 hover:bg-white/10 transition-colors whitespace-nowrap"
          >
            <BarChart3 className="h-4 w-4" />
            <span>Stats</span>
          </button>
        </div>
      </div>

      {/* Chat trigger button - no blue bar, just a pill */}
      <div className="relative flex-shrink-0 -mx-6 px-6 pt-4 pb-4">
        <button
          type="button"
          onClick={onChatInputClick || onExpandClick}
          className="mt-4 inline-flex items-center justify-center rounded-full bg-gradient-to-r from-sky-400 via-blue-500 to-indigo-500 px-6 py-2.5 text-xs font-semibold text-white shadow-lg shadow-blue-900/60 transition-transform duration-200 hover:-translate-y-0.5 hover:scale-[1.02]"
        >
          <span className="mr-2 text-base">💬</span>
          Chat with Byte about your imports
        </button>

        {/* Status line with animated ping dots */}
        <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-slate-300/80">
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-900/60 px-3 py-1">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/60 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
            </span>
            Online 24/7
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-900/60 px-3 py-1">
            <span>🛡️</span>
            Guardrails + PII protection active
          </span>
        </div>
      </div>
    </div>
  );
}
