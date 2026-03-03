/**
 * CategoryBreakdownList
 *
 * Shows a month chip strip + clickable category rows for Smart Categories page.
 * Clicking a category navigates to /dashboard/transactions?category=<name>.
 * Clicking a month chip filters both the breakdown and the UncategorizedReviewQueue.
 */

import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

export interface BreakdownEntry {
  category: string;
  amount: number; // absolute value (expenses)
}

interface AvailableMonth {
  label: string;    // "Jan 2025"
  value: string;    // "2025-01" ISO year-month key
}

interface CategoryBreakdownListProps {
  entries: BreakdownEntry[];
  availableMonths: AvailableMonth[];
  selectedMonth: string | null; // "2025-01" or null for All
  onSelectMonth: (value: string | null) => void;
  isLoading?: boolean;
}

function formatMoney(amount: number): string {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function CategoryBreakdownList({
  entries,
  availableMonths,
  selectedMonth,
  onSelectMonth,
  isLoading,
}: CategoryBreakdownListProps) {
  const navigate = useNavigate();

  const maxAmount = useMemo(
    () => Math.max(...entries.map((e) => e.amount), 1),
    [entries]
  );

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          Spending Breakdown
        </span>
        {selectedMonth && (
          <button
            onClick={() => onSelectMonth(null)}
            className="text-[11px] text-violet-400 hover:text-violet-300 transition-colors"
          >
            Clear filter
          </button>
        )}
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

      {/* Category rows */}
      <div className="divide-y divide-slate-800/60">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <p className="text-xs text-slate-500">Loading…</p>
          </div>
        ) : entries.length === 0 ? (
          <div className="py-6 px-4 text-center">
            <p className="text-xs text-slate-500">No expense data yet</p>
          </div>
        ) : (
          entries.map(({ category, amount }) => {
            const pct = Math.round((amount / maxAmount) * 100);
            return (
              <button
                key={category}
                onClick={() => navigate(`/dashboard/transactions?category=${encodeURIComponent(category)}`)}
                className="group flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-slate-800/40 transition-colors"
              >
                {/* Bar */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="truncate text-xs text-slate-300 group-hover:text-slate-100 transition-colors">
                      {category}
                    </span>
                    <span className="shrink-0 text-[11px] font-medium text-slate-200">
                      {formatMoney(amount)}
                    </span>
                  </div>
                  <div className="h-1 w-full rounded-full bg-slate-800">
                    <div
                      className="h-1 rounded-full bg-violet-500/60 transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
                <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-600 group-hover:text-slate-400 transition-colors" />
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
