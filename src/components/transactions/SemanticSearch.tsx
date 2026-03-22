/**
 * SemanticSearch Component
 * 
 * Search bar that uses semanticSearchTransactions()
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Search, X } from 'lucide-react';
import { semanticSearchTransactions } from '../../lib/semanticSearch';
import type { CommittedTransaction, PendingTransaction } from '../../types/transactions';

type Transaction = CommittedTransaction | PendingTransaction;

interface SemanticSearchProps {
  allTransactions: Transaction[];
  onResults: (results: Transaction[]) => void;
  debounceMs?: number;
  sortOrder?: 'newest' | 'oldest';
  onSortOrderChange?: (order: 'newest' | 'oldest') => void;
  onOpenSmartCategories?: () => void;
}

export function SemanticSearch({
  allTransactions,
  onResults,
  debounceMs = 300,
  sortOrder = 'newest',
  onSortOrderChange,
  onOpenSmartCategories,
}: SemanticSearchProps) {
  const [query, setQuery] = useState('');

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.trim()) {
        const results = semanticSearchTransactions(allTransactions, query);
        onResults(results);
      } else {
        onResults(allTransactions);
      }
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [query, allTransactions, onResults, debounceMs]);

  const handleClear = useCallback(() => {
    setQuery('');
    onResults(allTransactions);
  }, [allTransactions, onResults]);

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch sm:gap-3">
      <div className="relative min-w-0 flex-1">
        <div className="relative flex items-center">
          <Search className="pointer-events-none absolute left-4 h-4 w-4 text-slate-500" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search merchants, categories, amounts, dates…"
            className="w-full rounded-2xl border border-white/[0.08] bg-white/[0.03] py-3.5 pl-11 pr-11 text-base text-white placeholder:text-slate-500 focus:border-white/20 focus:outline-none focus:ring-1 focus:ring-white/10 transition-colors"
          />
          {query ? (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-3 rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-white/5 hover:text-slate-300"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        {onSortOrderChange ? (
          <select
            aria-label="Sort transactions"
            value={sortOrder}
            onChange={(e) => onSortOrderChange(e.target.value as 'newest' | 'oldest')}
            className="h-12 min-w-[140px] cursor-pointer rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 text-sm text-slate-200 focus:border-white/20 focus:outline-none"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
        ) : null}
        {onOpenSmartCategories ? (
          <button
            type="button"
            onClick={onOpenSmartCategories}
            className="h-12 whitespace-nowrap rounded-xl border border-white/[0.08] bg-transparent px-4 text-sm font-medium text-slate-400 transition-colors hover:border-violet-500/40 hover:bg-violet-500/10 hover:text-violet-200"
          >
            Smart Categories
          </button>
        ) : null}
      </div>
    </div>
  );
}









