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
}

export function SemanticSearch({
  allTransactions,
  onResults,
  debounceMs = 300,
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
    <div className="relative">
      <div className="relative flex items-center">
        <Search className="absolute left-3 w-4 h-4 text-slate-500 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search transactions by merchant, category..."
          className="w-full pl-10 pr-10 py-2.5 bg-slate-900 border border-slate-800 rounded-lg text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none transition-colors"
        />
        {query && (
          <button
            onClick={handleClear}
            className="absolute right-3 p-1 hover:bg-slate-800 rounded transition-colors"
          >
            <X className="w-4 h-4 text-slate-500" />
          </button>
        )}
      </div>
    </div>
  );
}







