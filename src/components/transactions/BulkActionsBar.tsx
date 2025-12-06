/**
 * BulkActionsBar Component
 * 
 * Bar above transaction list for bulk actions
 */

import React from 'react';
import { CheckCircle2, X, RefreshCw, Archive, Tag } from 'lucide-react';
import type { BulkActionType } from '../../lib/bulkOperations';

interface BulkActionsBarProps {
  selectedCount: number;
  onAction: (action: BulkActionType) => void;
  onClearSelection: () => void;
}

export function BulkActionsBar({
  selectedCount,
  onAction,
  onClearSelection,
}: BulkActionsBarProps) {
  if (selectedCount === 0) {
    return null;
  }

  return (
    <div className="flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-slate-800">
      <div className="flex items-center gap-3">
        <span className="text-sm text-slate-300">
          <span className="font-semibold text-white">{selectedCount}</span> selected
        </span>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => onAction('approve')}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 rounded-lg transition-colors"
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          Approve
        </button>

        <button
          onClick={() => onAction('reject')}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 rounded-lg transition-colors"
        >
          <X className="w-3.5 h-3.5" />
          Reject
        </button>

        <button
          onClick={() => onAction('categorize')}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border border-blue-500/30 rounded-lg transition-colors"
        >
          <Tag className="w-3.5 h-3.5" />
          Categorize
        </button>

        <button
          onClick={() => onAction('mark-recurring')}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 border border-purple-500/30 rounded-lg transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Mark Recurring
        </button>

        <button
          onClick={() => onAction('archive')}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-700 hover:bg-slate-600 text-slate-300 border border-slate-600 rounded-lg transition-colors"
        >
          <Archive className="w-3.5 h-3.5" />
          Archive
        </button>

        <div className="w-px h-6 bg-slate-700 mx-1" />

        <button
          onClick={onClearSelection}
          className="px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-slate-300 transition-colors"
        >
          Clear
        </button>
      </div>
    </div>
  );
}







