/**
 * PendingReviewCard Component
 * 
 * Summary card for left column showing pending review transactions
 */

import React from 'react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

interface PendingReviewCardProps {
  pendingCount: number;
  lowConfidenceCount: number;
  onReviewClick: () => void;
}

export function PendingReviewCard({
  pendingCount,
  lowConfidenceCount,
  onReviewClick,
}: PendingReviewCardProps) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 mb-4">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold text-white mb-1">Pending Review</h3>
          <p className="text-xs text-slate-400">Transactions awaiting approval</p>
        </div>
        {pendingCount > 0 && (
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-500/20 text-amber-400 text-xs font-bold">
            {pendingCount}
          </div>
        )}
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-400">Total Pending</span>
          <span className="text-white font-medium">{pendingCount}</span>
        </div>
        {lowConfidenceCount > 0 && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 flex items-center gap-1">
              <AlertCircle className="w-3 h-3 text-red-400" />
              Low Confidence
            </span>
            <span className="text-red-400 font-medium">{lowConfidenceCount}</span>
          </div>
        )}
        {pendingCount > 0 && lowConfidenceCount === 0 && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              High Confidence
            </span>
            <span className="text-emerald-400 font-medium">{pendingCount - lowConfidenceCount}</span>
          </div>
        )}
      </div>

      <button
        onClick={onReviewClick}
        disabled={pendingCount === 0}
        className="w-full px-3 py-2 text-xs font-medium bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-amber-500/30 text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Review Now
      </button>
    </div>
  );
}









