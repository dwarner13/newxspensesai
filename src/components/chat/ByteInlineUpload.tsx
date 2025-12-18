/**
 * Byte Inline Upload Component
 * 
 * Compact upload UI for Byte chat panel.
 * Shows upload button and status indicator.
 */

import React, { useRef, useCallback } from 'react';
import { UploadCloud, Loader2 } from 'lucide-react';

export interface ByteInlineUploadProps {
  /** Handler for file selection */
  onFilesSelected: (files: FileList | File[]) => void;
  
  /** Whether upload is in progress */
  isUploading: boolean;
  
  /** Progress label to display */
  progressLabel?: string;
  
  /** Optional error message */
  error?: string | null;
}

export function ByteInlineUpload({
  onFilesSelected,
  isUploading,
  progressLabel,
  error,
}: ByteInlineUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      onFilesSelected(e.target.files);
      // Reset input so same file can be selected again
      e.target.value = '';
    }
  }, [onFilesSelected]);

  const handleButtonClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.dataTransfer.files?.length) {
      onFilesSelected(e.dataTransfer.files);
    }
  }, [onFilesSelected]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  return (
    <div
      className="shrink-0 mt-2 rounded-2xl border border-white/10 bg-slate-950/70 px-3 py-3 text-xs text-slate-200"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-col min-w-0 flex-1">
          <span className="font-medium text-slate-50">
            Upload bank statements or receipts
          </span>
          <span className="text-[11px] text-slate-400 mt-0.5">
            Byte will extract transactions and send results back into your account.
          </span>
        </div>
        <label
          className={`
            inline-flex cursor-pointer items-center rounded-xl px-3 py-1.5 text-[11px] font-semibold text-slate-950 shadow transition-all
            ${isUploading 
              ? 'bg-slate-600 cursor-not-allowed opacity-60' 
              : 'bg-gradient-to-r from-sky-500 to-emerald-400 hover:from-sky-400 hover:to-emerald-300'
            }
          `}
        >
          {isUploading ? (
            <>
              <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
              Processing
            </>
          ) : (
            <>
              <UploadCloud className="w-3 h-3 mr-1.5" />
              Choose files
            </>
          )}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleInputChange}
            accept=".pdf,.csv,image/*"
            disabled={isUploading}
          />
        </label>
      </div>

      {/* Status indicator */}
      {(isUploading || error) && (
        <div className={`
          mt-2 rounded-xl px-3 py-2 text-[11px] transition-colors
          ${error 
            ? 'bg-red-900/30 text-red-300 border border-red-500/20' 
            : 'bg-slate-900/80 text-slate-300'
          }
        `}>
          {error ? (
            <span className="flex items-center gap-1.5">
              <span>⚠️</span>
              <span>{error}</span>
            </span>
          ) : (
            <span className="flex items-center gap-1.5">
              {progressLabel ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>{progressLabel}</span>
                </>
              ) : (
                <span>Processing your documents…</span>
              )}
            </span>
          )}
        </div>
      )}
    </div>
  );
}






