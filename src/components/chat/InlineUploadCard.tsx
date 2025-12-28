/**
 * Inline Upload Card Component
 * 
 * Displays an upload interface inside the chat panel for Byte
 */

import React, { useRef, useState } from 'react';
import { Upload, FileText, Image, FileSpreadsheet, X } from 'lucide-react';

interface InlineUploadCardProps {
  onUpload: (files: File[]) => void;
  onClose?: () => void;
  acceptedFormats?: string[];
  isProcessing?: boolean;
  processingMessage?: string;
}

export function InlineUploadCard({
  onUpload,
  onClose,
  acceptedFormats = ['.pdf', '.csv', '.png', '.jpg', '.jpeg'],
  isProcessing = false,
  processingMessage = 'Processing your file...',
}: InlineUploadCardProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileSelect = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    onUpload(Array.from(files));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  if (isProcessing) {
    return (
      <div className="rounded-2xl border border-sky-500/30 bg-sky-500/10 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-500/20">
            <Upload className="w-5 h-5 text-sky-400 animate-pulse" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-sky-300">{processingMessage}</p>
            <p className="text-xs text-sky-400/70 mt-0.5">Byte is working on it...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-800/80 p-4">
      {onClose && (
        <button
          onClick={onClose}
          className="float-right -mt-2 -mr-2 text-slate-400 hover:text-slate-200 transition-colors"
          aria-label="Close upload card"
        >
          <X className="w-4 h-4" />
        </button>
      )}
      
      <div className="flex items-start gap-3 mb-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-sky-400 via-cyan-400 to-emerald-400">
          <Upload className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1">
          <h4 className="text-sm font-semibold text-white">Upload Document</h4>
          <p className="text-xs text-slate-400 mt-0.5">
            Bank statements, receipts, invoices, or CSV files
          </p>
        </div>
      </div>

      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
        className={`
          border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors
          ${isDragging 
            ? 'border-sky-400 bg-sky-500/10' 
            : 'border-slate-600 hover:border-slate-500 bg-slate-900/50'
          }
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={acceptedFormats.join(',')}
          onChange={(e) => handleFileSelect(e.target.files)}
          className="hidden"
        />
        
        <div className="flex flex-col items-center gap-2">
          <div className="flex gap-2 text-slate-400">
            <FileText className="w-5 h-5" />
            <Image className="w-5 h-5" />
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <p className="text-sm text-slate-300">
            {isDragging ? 'Drop files here' : 'Click or drag files to upload'}
          </p>
          <p className="text-xs text-slate-500">
            {acceptedFormats.join(', ')}
          </p>
        </div>
      </div>
    </div>
  );
}






