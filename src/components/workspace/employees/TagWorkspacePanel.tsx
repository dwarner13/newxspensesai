/**
 * TagWorkspacePanel Component
 *
 * Left sidebar panel for Tag workspace showing real category stats.
 * All counts come from the useSmartCategoriesStats hook via props —
 * nothing here is hardcoded.
 */

import React from 'react';
import { Tag, CheckCircle } from 'lucide-react';

interface TagWorkspacePanelProps {
  categoryCount: number | null;
  taggedToday: number | null;
  uncategorizedCount: number | null;
  activeRulesCount: number | null;
  isLoading?: boolean;
}

function fmt(value: number | null, isLoading?: boolean): string {
  if (isLoading) return '…';
  if (value === null) return '—';
  return value.toLocaleString();
}

export function TagWorkspacePanel({
  categoryCount,
  taggedToday,
  uncategorizedCount,
  activeRulesCount,
  isLoading,
}: TagWorkspacePanelProps) {
  const activeCategories = fmt(categoryCount, isLoading);
  const taggedTodayStr = fmt(taggedToday, isLoading);
  const uncategorized = fmt(uncategorizedCount, isLoading);
  const activeRules = fmt(activeRulesCount, isLoading);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-teal-600/20 rounded-lg flex items-center justify-center">
          <Tag className="w-5 h-5 text-teal-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">TAG WORKSPACE</h3>
          <p className="text-sm text-slate-400">Category management</p>
        </div>
      </div>

      {/* Card 1 - Category Overview */}
      <div className="mb-4 flex-shrink-0">
        <div className="group p-4 rounded-lg bg-slate-800 border border-slate-700 hover:bg-slate-800/90 hover:border-slate-600 transition-all duration-200 cursor-pointer">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between mb-2">
                <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Tag className="w-4 h-4 text-teal-400" />
                  Category Overview
                </h4>
                <div className="px-2 py-1 rounded text-xs font-medium border flex-shrink-0 ml-2 bg-teal-400/10 text-teal-400 border-teal-400/30">
                  Overview
                </div>
              </div>
              <p className="text-xs text-slate-400 mt-2">
                {activeCategories} active categories
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Card 2 - Recent Auto-Tags */}
      <div className="mb-4 flex-shrink-0">
        <div className="group p-4 rounded-lg bg-slate-800 border border-slate-700 hover:bg-slate-800/90 hover:border-slate-600 transition-all duration-200 cursor-pointer">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between mb-2">
                <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  Recent Auto-Tags
                </h4>
                <div className="px-2 py-1 rounded text-xs font-medium border flex-shrink-0 ml-2 bg-green-400/10 text-green-400 border-green-400/30">
                  Recent
                </div>
              </div>
              <p className="text-xs text-slate-400 mt-2">
                {taggedTodayStr} items tagged today
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Card 3 - Uncategorized Items & Rules (fills remaining height) */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="p-4 rounded-lg bg-slate-800 border border-slate-700 h-full flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between mb-3 flex-shrink-0">
            <div>
              <h3 className="text-sm font-semibold text-slate-100 tracking-wide">
                Uncategorized Items
              </h3>
              <p className="text-xs text-slate-400 mt-1">Needs review</p>
            </div>
            <span className="inline-flex items-center rounded-full bg-teal-500/10 px-2.5 py-1 text-[11px] font-medium text-teal-300 border border-teal-500/30">
              Review
            </span>
          </div>

          {/* Metrics row */}
          <div className="grid grid-cols-2 gap-3 text-xs mb-3 flex-shrink-0">
            <div className="rounded-xl bg-slate-900/60 px-3 py-2 border border-slate-700/50">
              <p className="text-slate-400">Uncategorized</p>
              <p className="mt-1 text-sm font-semibold text-slate-50">{uncategorized}</p>
            </div>
            <div className="rounded-xl bg-slate-900/60 px-3 py-2 border border-slate-700/50">
              <p className="text-slate-400">Active rules</p>
              <p className="mt-1 text-sm font-semibold text-slate-50">{activeRules}</p>
            </div>
          </div>

          {/* Alerts */}
          <div className="flex-1 min-h-0 overflow-y-auto hide-scrollbar space-y-2 text-[11px] text-slate-200">
            <div className="rounded-lg bg-slate-900/70 px-3 py-2 border border-slate-700/50">
              🏷️{' '}
              <span className="font-medium">
                {uncategorized} transaction{uncategorizedCount === 1 ? '' : 's'}
              </span>{' '}
              need categorization. Click to review.
            </div>
            <div className="rounded-lg bg-slate-900/70 px-3 py-2 border border-slate-700/50">
              ✨{' '}
              <span className="font-medium">
                {activeRules} category rule{activeRulesCount === 1 ? '' : 's'}
              </span>{' '}
              {activeRulesCount === 1 ? 'is' : 'are'} active and learning.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
