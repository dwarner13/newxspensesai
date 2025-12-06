/**
 * SuggestionChips Component
 * 
 * Show chips/pills for suggestions
 */

import React from 'react';
import type { Suggestion } from '../../lib/smartSuggestions';

interface SuggestionChipsProps {
  suggestions: Suggestion[];
  onSelect: (suggestion: Suggestion) => void;
  maxVisible?: number;
}

export function SuggestionChips({
  suggestions,
  onSelect,
  maxVisible = 8,
}: SuggestionChipsProps) {
  if (suggestions.length === 0) {
    return null;
  }

  const visible = suggestions.slice(0, maxVisible);
  const confidenceColor = (conf: number) => {
    if (conf >= 0.8) return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
    if (conf >= 0.6) return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
    return 'bg-slate-700/50 text-slate-300 border-slate-600/50';
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {visible.map((suggestion) => (
        <button
          key={suggestion.id}
          onClick={() => onSelect(suggestion)}
          className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg border transition-all hover:scale-105 ${confidenceColor(suggestion.confidence)}`}
        >
          <span>{suggestion.label}</span>
          <span className="text-[10px] opacity-70">
            {Math.round(suggestion.confidence * 100)}%
          </span>
        </button>
      ))}
      {suggestions.length > maxVisible && (
        <span className="text-xs text-slate-500">
          +{suggestions.length - maxVisible} more
        </span>
      )}
    </div>
  );
}







