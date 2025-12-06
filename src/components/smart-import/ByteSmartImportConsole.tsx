/**
 * Byte Smart Import Console Component
 * 
 * Floating console overlay for Byte's Smart Import functionality.
 * Displays import status, queue health, and processing information.
 */

import React from 'react';
import { X } from 'lucide-react';

interface ByteSmartImportConsoleProps {
  /** Whether the console is open */
  isOpen: boolean;
  
  /** Close handler */
  onClose: () => void;
  
  /** Last import summary text */
  lastImportSummary?: string;
  
  /** Queue health label */
  queueHealthLabel?: string;
  
  /** Whether upload is in progress */
  isUploading?: boolean;
}

export function ByteSmartImportConsole({
  isOpen,
  onClose,
  lastImportSummary,
  queueHealthLabel,
  isUploading,
}: ByteSmartImportConsoleProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-slate-900 rounded-lg border border-slate-700 shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📄</span>
            <div>
              <h2 className="text-lg font-semibold text-white">Byte Smart Import Console</h2>
              {queueHealthLabel && (
                <p className="text-sm text-slate-400">{queueHealthLabel}</p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
            aria-label="Close console"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {isUploading && (
            <div className="mb-4 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <p className="text-sm text-blue-300">Processing your document...</p>
            </div>
          )}

          {lastImportSummary && (
            <div className="mb-4 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
              <p className="text-sm text-green-300">{lastImportSummary}</p>
            </div>
          )}

          <div className="text-center text-slate-400 py-8">
            <p>Smart Import Console</p>
            <p className="text-sm mt-2">Import status and processing information will appear here.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
