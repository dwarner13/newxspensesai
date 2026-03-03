/**
 * TagWorkspacePanel Component
 *
 * Left sidebar panel for Tag workspace showing real category stats and rules.
 * All counts come from hooks via props — nothing hardcoded.
 */

import React, { useState } from 'react';
import { Tag, CheckCircle, ChevronRight, Plus, Zap } from 'lucide-react';
import { CategoryRulesModal } from '../../transactions/CategoryRulesModal';
import type { CategoryRule } from '../../../lib/categoryRules';

interface TagWorkspacePanelProps {
  categoryCount: number | null;
  taggedToday: number | null;
  uncategorizedCount: number | null;
  activeRulesCount: number | null;
  isLoading?: boolean;
  /** Top rules for workspace preview — ordered by times_applied DESC */
  rules?: CategoryRule[];
  /** Sum of times_applied across all rules */
  totalTimesApplied?: number;
  /** User's existing category names (for new-rule form) */
  userCategories?: string[];
  /** Called when rules are created/toggled/deleted so parent can refresh counts */
  onRefreshRules?: () => void;
}

function fmt(value: number | null, isLoading?: boolean): string {
  if (isLoading) return '…';
  if (value === null) return '—';
  return value.toLocaleString();
}

const MATCH_TYPE_SYMBOL: Record<string, string> = {
  exact: '=',
  contains: '~',
  starts_with: '^',
  regex: '.*',
};

export function TagWorkspacePanel({
  categoryCount,
  taggedToday,
  uncategorizedCount,
  activeRulesCount,
  isLoading,
  rules = [],
  totalTimesApplied = 0,
  userCategories,
  onRefreshRules,
}: TagWorkspacePanelProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const activeCategories = fmt(categoryCount, isLoading);
  const taggedTodayStr = fmt(taggedToday, isLoading);
  const uncategorized = fmt(uncategorizedCount, isLoading);
  const activeRules = fmt(activeRulesCount, isLoading);

  const topRules = rules.filter((r) => r.is_active).slice(0, 4);

  return (
    <>
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

        {/* Card 3 - Uncategorized Items */}
        <div className="mb-4 flex-shrink-0">
          <div className="p-4 rounded-lg bg-slate-800 border border-slate-700">
            <div className="flex items-center justify-between mb-3">
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

            <div className="grid grid-cols-2 gap-3 text-xs mb-3">
              <div className="rounded-xl bg-slate-900/60 px-3 py-2 border border-slate-700/50">
                <p className="text-slate-400">Uncategorized</p>
                <p className="mt-1 text-sm font-semibold text-slate-50">{uncategorized}</p>
              </div>
              <div className="rounded-xl bg-slate-900/60 px-3 py-2 border border-slate-700/50">
                <p className="text-slate-400">Active rules</p>
                <p className="mt-1 text-sm font-semibold text-slate-50">{activeRules}</p>
              </div>
            </div>

            <div className="space-y-2 text-[11px] text-slate-200">
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

        {/* Card 4 - Category Rules */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="p-4 rounded-lg bg-slate-800 border border-slate-700 h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between mb-3 shrink-0">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-violet-400" />
                <h3 className="text-sm font-semibold text-slate-100">Category Rules</h3>
              </div>
              <button
                onClick={() => setIsModalOpen(true)}
                className="flex items-center gap-1 text-[11px] text-violet-400 hover:text-violet-300 transition-colors"
                title="Add new rule"
              >
                <Plus className="h-3 w-3" />
                New
              </button>
            </div>

            <p className="text-[11px] text-slate-500 mb-3 shrink-0">
              Smart rules that auto-categorize
            </p>

            {/* Top rules preview */}
            <div className="flex-1 min-h-0 overflow-y-auto hide-scrollbar space-y-1.5">
              {isLoading ? (
                <p className="text-[11px] text-slate-600">Loading…</p>
              ) : topRules.length === 0 ? (
                <div className="text-center py-3">
                  <p className="text-[11px] text-slate-600">No rules yet</p>
                  <button
                    onClick={() => setIsModalOpen(true)}
                    className="mt-1.5 text-[11px] text-violet-400 hover:text-violet-300 transition-colors"
                  >
                    + Create your first rule
                  </button>
                </div>
              ) : (
                topRules.map((rule) => (
                  <div
                    key={rule.id}
                    className="flex items-center gap-2 rounded-lg bg-slate-900/60 px-2.5 py-1.5 border border-slate-700/50"
                  >
                    <span className="text-emerald-400 shrink-0">✓</span>
                    <span
                      className="text-[10px] font-mono text-violet-300 shrink-0"
                      title={`${MATCH_TYPE_SYMBOL[rule.match_type] ?? '~'} ${rule.match_value}`}
                    >
                      {MATCH_TYPE_SYMBOL[rule.match_type] ?? '~'}
                    </span>
                    <span className="text-[11px] text-slate-300 font-medium truncate">
                      {rule.match_value}
                    </span>
                    <span className="text-[11px] text-slate-500 shrink-0">→</span>
                    <span className="text-[11px] text-slate-300 truncate">{rule.category}</span>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            {!isLoading && (
              <div className="mt-3 pt-3 border-t border-slate-700/50 shrink-0 flex items-center justify-between">
                <span className="text-[11px] text-slate-500">
                  {activeRules} active
                  {totalTimesApplied > 0 && ` · ${totalTimesApplied.toLocaleString()} auto-tagged`}
                </span>
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="flex items-center gap-1 text-[11px] text-violet-400 hover:text-violet-300 transition-colors"
                >
                  Manage Rules
                  <ChevronRight className="h-3 w-3" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Rules modal (portal) */}
      {isModalOpen && (
        <CategoryRulesModal
          rules={rules}
          userCategories={userCategories}
          onClose={() => setIsModalOpen(false)}
          onRefresh={() => {
            onRefreshRules?.();
          }}
        />
      )}
    </>
  );
}
