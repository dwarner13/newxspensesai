/**
 * PrimeStatusBar Component
 * 
 * Displays live Prime Command Center stats:
 * - Prime online indicator
 * - Active employees count
 * - Tasks running
 * - Accuracy indicator
 */

import React from 'react';
import { usePrimeLiveStats } from '../../hooks/usePrimeLiveStats';
import { cn } from '../../lib/utils';

export function PrimeStatusBar() {
  const { data: stats, isLoading } = usePrimeLiveStats();

  return (
    <div className="border-b border-slate-800/60 bg-slate-950/50 px-4 py-2.5 md:px-6 md:py-3 flex-shrink-0">
      <div className="flex items-center justify-between gap-4 md:gap-6">
        {/* Prime Online Indicator */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <div className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse" />
            <div className="absolute inset-0 h-2 w-2 rounded-full bg-emerald-400/40 animate-ping" />
          </div>
          <span className="text-xs md:text-sm font-medium text-slate-300">
            Prime Online
          </span>
        </div>

        {/* Stats Grid */}
        <div className="flex items-center gap-3 md:gap-6 flex-1 justify-end">
          {/* Employees Active */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] md:text-xs text-slate-500 uppercase tracking-wide">
              Employees
            </span>
            <span className="text-sm md:text-base font-semibold text-blue-400">
              {isLoading ? '—' : (stats?.onlineEmployees ?? 0)}
            </span>
            {stats && stats.totalEmployees > 0 && (
              <span className="text-[10px] md:text-xs text-slate-500">
                /{stats.totalEmployees}
              </span>
            )}
          </div>

          {/* Tasks Running */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] md:text-xs text-slate-500 uppercase tracking-wide">
              Tasks
            </span>
            <span className="text-sm md:text-base font-semibold text-amber-400">
              {isLoading ? '—' : (stats?.liveTasks ?? 0)}
            </span>
          </div>

          {/* Accuracy */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] md:text-xs text-slate-500 uppercase tracking-wide">
              Accuracy
            </span>
            <span className="text-sm md:text-base font-semibold text-emerald-400">
              {isLoading ? '—' : `${Math.round((stats?.successRate ?? 0.99) * 100)}%`}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}








