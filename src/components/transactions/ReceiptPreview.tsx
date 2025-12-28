/**
 * ReceiptPreview Component
 * 
 * Show preview of attached receipt/document for a transaction
 */

import React from 'react';
import { FileText, Image as ImageIcon, ExternalLink } from 'lucide-react';

interface ReceiptPreviewProps {
  thumbnailUrl?: string;
  fileName?: string;
  onOpenFull?: () => void;
}

export function ReceiptPreview({
  thumbnailUrl,
  fileName,
  onOpenFull,
}: ReceiptPreviewProps) {
  return (
    <div className="relative rounded-lg border border-slate-800 bg-slate-900/50 overflow-hidden group">
      {thumbnailUrl ? (
        <div className="relative aspect-video bg-slate-900">
          <img
            src={thumbnailUrl}
            alt={fileName || 'Receipt preview'}
            className="w-full h-full object-cover"
          />
          {onOpenFull && (
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <button
                onClick={onOpenFull}
                className="flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-medium rounded-lg border border-white/20 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                View Full Receipt
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center p-8 aspect-video bg-slate-900">
          <FileText className="w-12 h-12 text-slate-600 mb-2" />
          <p className="text-xs text-slate-500 mb-1">
            {fileName || 'No receipt attached'}
          </p>
          {onOpenFull && (
            <button
              onClick={onOpenFull}
              className="mt-2 flex items-center gap-1.5 px-2 py-1 text-xs text-slate-400 hover:text-slate-300 transition-colors"
            >
              <ImageIcon className="w-3 h-3" />
              View Document
            </button>
          )}
        </div>
      )}
    </div>
  );
}









