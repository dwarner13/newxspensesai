/**
 * CategoryBreakdownList
 *
 * Shows a month chip strip + clickable category rows for Smart Categories page.
 * Each row surfaces Tag's AI intelligence: learning badge, trend delta, amount,
 * transaction count, confidence score, and an "Ask Tag" hover action.
 *
 * Clicking the "Uncategorized" row calls onUncategorizedClick (scroll to queue).
 * Clicking any other row navigates to /dashboard/transactions?category=<name>.
 * Clicking a month chip filters both the breakdown and the UncategorizedReviewQueue.
 */

import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Brain, ChevronRight, MessageCircle, Sparkles, Tag } from 'lucide-react';

export interface BreakdownEntry {
  category: string;
  amount: number;            // absolute value
  count: number;             // number of transactions
  learningDominance?: 'mostly-learned' | 'mostly-ai' | 'mixed' | 'unknown';
  avgConfidence?: number | null;  // 0–1
  trend?: 'up' | 'down' | 'flat';
  trendPct?: number;         // integer, e.g. 14 → "↑14%"
}

interface AvailableMonth {
  label: string;   // "Jan 2025"
  value: string;   // "2025-01"
}

interface CategoryBreakdownListProps {
  entries: BreakdownEntry[];
  incomeEntries?: BreakdownEntry[];
  availableMonths: AvailableMonth[];
  selectedMonth: string | null;
  onSelectMonth: (value: string | null) => void;
  isLoading?: boolean;
  /** Called when the "Uncategorized" row is clicked (scroll to queue) */
  onUncategorizedClick?: () => void;
  /** Called when the Ask Tag button is clicked on a row */
  onAskTag?: (category: string) => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatMoney(amount: number): string {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    maximumFractionDigits: 0,
  }).format(amount);
}

function getLearningBadge(dominance?: string) {
  if (dominance === 'mostly-learned') {
    return { shortText: 'Learned', className: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400', Icon: Brain };
  }
  if (dominance === 'mostly-ai') {
    return { shortText: 'AI', className: 'border-blue-500/30 bg-blue-500/10 text-blue-400', Icon: Sparkles };
  }
  if (dominance === 'mixed') {
    return { shortText: 'Mixed', className: 'border-purple-500/30 bg-purple-500/10 text-purple-400', Icon: Tag };
  }
  return null;
}

// ─── BreakdownRow ─────────────────────────────────────────────────────────────

interface RowProps {
  entry: BreakdownEntry;
  maxAmount: number;
  isIncome?: boolean;
  onRowClick: () => void;
  onAskTag?: () => void;
}

function BreakdownRow({ entry, maxAmount, isIncome, onRowClick, onAskTag }: RowProps) {
  const { category, amount, count, learningDominance, avgConfidence, trend, trendPct } = entry;
  const pct = Math.round((amount / maxAmount) * 100);
  const badge = getLearningBadge(learningDominance);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onRowClick}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onRowClick()}
      className="group flex w-full items-center gap-3 px-4 py-2.5 hover:bg-slate-800/40 transition-colors cursor-pointer"
    >
      <div className="flex-1 min-w-0">
        {/* Line 1: name + learning badge + right-side stats */}
        <div className="flex items-center justify-between gap-2 mb-1">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="truncate text-xs text-slate-300 group-hover:text-slate-100 transition-colors">
              {category}
            </span>
            {badge && (
              <span
                className={`shrink-0 flex items-center gap-0.5 rounded-full border px-1.5 py-0.5 text-[9px] font-medium ${badge.className}`}
                title={`Tag learning: ${badge.shortText}`}
              >
                <badge.Icon className="h-2 w-2" />
                {badge.shortText}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Trend delta — only shown when a month is selected */}
            {trend && trend !== 'flat' && trendPct !== undefined && (
              <span
                className={`text-[10px] font-semibold tabular-nums ${
                  trend === 'up' ? 'text-red-400' : 'text-emerald-400'
                }`}
                title={`${trend === 'up' ? 'Up' : 'Down'} ${trendPct}% vs previous month`}
              >
                {trend === 'up' ? '↑' : '↓'}{trendPct}%
              </span>
            )}
            <span className="text-[11px] font-medium text-slate-200">{formatMoney(amount)}</span>
            <span className="text-[10px] text-slate-500">({count})</span>
          </div>
        </div>

        {/* Line 2: progress bar + AI confidence */}
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1 rounded-full bg-slate-800">
            <div
              className={`h-1 rounded-full transition-all ${
                isIncome ? 'bg-emerald-500/60' : 'bg-violet-500/60'
              }`}
              style={{ width: `${pct}%` }}
            />
          </div>
          {avgConfidence != null && (
            <span
              className="shrink-0 text-[10px] text-slate-500 tabular-nums"
              title="Tag AI confidence score for this category"
            >
              {Math.round(avgConfidence * 100)}%
            </span>
          )}
        </div>
      </div>

      {/* Ask Tag — visible on hover */}
      {onAskTag && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onAskTag(); }}
          title={`Ask Tag about ${category}`}
          className="shrink-0 opacity-0 group-hover:opacity-100 p-1 rounded text-violet-400 hover:bg-violet-500/10 transition-all"
        >
          <MessageCircle className="h-3.5 w-3.5" />
        </button>
      )}

      <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-600 group-hover:text-slate-400 transition-colors" />
    </div>
  );
}

// ─── CategoryBreakdownList ────────────────────────────────────────────────────

export function CategoryBreakdownList({
  entries,
  incomeEntries,
  availableMonths,
  selectedMonth,
  onSelectMonth,
  isLoading,
  onUncategorizedClick,
  onAskTag,
}: CategoryBreakdownListProps) {
  const navigate = useNavigate();

  const maxExpenseAmount = useMemo(
    () => Math.max(...entries.map((e) => e.amount), 1),
    [entries]
  );

  const maxIncomeAmount = useMemo(
    () => Math.max(...(incomeEntries ?? []).map((e) => e.amount), 1),
    [incomeEntries]
  );

  const hasData = entries.length > 0 || (incomeEntries && incomeEntries.length > 0);

  function handleExportCSV() {
    const today = new Date().toISOString().slice(0, 10);
    const monthPart = selectedMonth || 'all-time';
    const filename = `category-breakdown-${monthPart}-${today}.csv`;

    const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;
    const header = 'Category,Type,Amount (CAD),Transactions,Learning,Confidence\n';
    const toRow = (e: BreakdownEntry, type: string) =>
      `${esc(e.category)},${type},${e.amount.toFixed(2)},${e.count},${e.learningDominance || ''},${
        e.avgConfidence != null ? Math.round(e.avgConfidence * 100) + '%' : ''
      }`;
    const rows = [
      ...entries.map((e) => toRow(e, 'Expense')),
      ...(incomeEntries ?? []).map((e) => toRow(e, 'Income')),
    ].join('\n');

    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          Spending Breakdown
        </span>
        <div className="flex items-center gap-3">
          {hasData && (
            <button
              onClick={handleExportCSV}
              className="text-[11px] text-slate-400 hover:text-slate-200 transition-colors"
            >
              Export CSV
            </button>
          )}
          {selectedMonth && (
            <button
              onClick={() => onSelectMonth(null)}
              className="text-[11px] text-violet-400 hover:text-violet-300 transition-colors"
            >
              Clear filter
            </button>
          )}
        </div>
      </div>

      {/* Month chips */}
      {availableMonths.length > 0 && (
        <div className="flex gap-1.5 overflow-x-auto px-4 py-2.5 border-b border-slate-800 scrollbar-none">
          <button
            onClick={() => onSelectMonth(null)}
            className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${
              selectedMonth === null
                ? 'border-violet-500/60 bg-violet-500/20 text-violet-200'
                : 'border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-300'
            }`}
          >
            All time
          </button>
          {availableMonths.map((m) => (
            <button
              key={m.value}
              onClick={() => onSelectMonth(m.value)}
              className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                selectedMonth === m.value
                  ? 'border-violet-500/60 bg-violet-500/20 text-violet-200'
                  : 'border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-300'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      <div className="divide-y divide-slate-800/60">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <p className="text-xs text-slate-500">Loading…</p>
          </div>
        ) : !hasData ? (
          <div className="py-6 px-4 text-center">
            <p className="text-xs text-slate-500">No expense data yet</p>
          </div>
        ) : (
          <>
            {/* ── Expenses ── */}
            {entries.length > 0 && (
              <>
                <div className="px-4 py-1.5 bg-slate-900/40">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                    Expenses
                  </span>
                </div>
                {entries.map((entry) => {
                  const isUncategorized = entry.category === 'Uncategorized';
                  const handleRowClick =
                    isUncategorized && onUncategorizedClick
                      ? onUncategorizedClick
                      : () =>
                          navigate(
                            `/dashboard/transactions?category=${encodeURIComponent(entry.category)}`
                          );
                  return (
                    <BreakdownRow
                      key={entry.category}
                      entry={entry}
                      maxAmount={maxExpenseAmount}
                      onRowClick={handleRowClick}
                      onAskTag={onAskTag ? () => onAskTag(entry.category) : undefined}
                    />
                  );
                })}
              </>
            )}

            {/* ── Income Sources ── */}
            {incomeEntries && incomeEntries.length > 0 && (
              <>
                <div className="px-4 py-1.5 bg-slate-900/40 border-t border-slate-800">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                    Income Sources
                  </span>
                </div>
                {incomeEntries.map((entry) => (
                  <BreakdownRow
                    key={entry.category}
                    entry={entry}
                    maxAmount={maxIncomeAmount}
                    isIncome
                    onRowClick={() =>
                      navigate(
                        `/dashboard/transactions?category=${encodeURIComponent(entry.category)}`
                      )
                    }
                    onAskTag={onAskTag ? () => onAskTag(entry.category) : undefined}
                  />
                ))}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
