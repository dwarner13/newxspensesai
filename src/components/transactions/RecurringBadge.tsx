/**
 * RecurringBadge Component
 * 
 * Small badge indicating recurring vs non-recurring
 */

import React from 'react';
import { RefreshCw } from 'lucide-react';

interface RecurringBadgeProps {
  isRecurring: boolean;
  showOneTime?: boolean;
}

export function RecurringBadge({
  isRecurring,
  showOneTime = false,
}: RecurringBadgeProps) {
  if (!isRecurring && !showOneTime) {
    return null;
  }

  if (isRecurring) {
    return (
      <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-500/20 border border-purple-500/30 rounded-full">
        <RefreshCw className="w-3 h-3 text-purple-400" />
        <span className="text-xs font-medium text-purple-400">Recurring</span>
      </div>
    );
  }

  if (showOneTime) {
    return (
      <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-700/50 border border-slate-600/50 rounded-full">
        <span className="text-xs font-medium text-slate-400">One-time</span>
      </div>
    );
  }

  return null;
}









