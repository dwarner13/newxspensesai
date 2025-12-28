/**
 * EmployeeSuggestionChips Component
 * 
 * Dynamic suggestion chips that route to different AI employees
 * Used in Prime Workspace Chat to guide users to specific employees
 */

import React from 'react';
import { useUnifiedChatLauncher } from '../../hooks/useUnifiedChatLauncher';
import { cn } from '../../lib/utils';

export type SuggestionChip = {
  label: string;
  employeeSlug: string;
  emoji: string;
  gradient: string;
  description?: string;
};

const SUGGESTION_CHIPS: SuggestionChip[] = [
  {
    label: 'Categorize my expenses',
    employeeSlug: 'tag-ai',
    emoji: '🏷️',
    gradient: 'from-yellow-300 via-amber-400 to-orange-500',
    description: 'Fix uncategorized transactions',
  },
  {
    label: 'Upload and scan a document',
    employeeSlug: 'byte-docs',
    emoji: '📄',
    gradient: 'from-sky-400 via-cyan-400 to-emerald-400',
    description: 'Process receipts and statements',
  },
  {
    label: 'Show analytics',
    employeeSlug: 'crystal-analytics',
    emoji: '📊',
    gradient: 'from-purple-400 via-indigo-400 to-sky-400',
    description: 'Spot patterns and trends',
  },
  {
    label: 'Help with debt payoff',
    employeeSlug: 'liberty-freedom',
    emoji: '🗽',
    gradient: 'from-green-400 via-emerald-400 to-teal-400',
    description: 'Debt strategy and planning',
  },
];

interface EmployeeSuggestionChipsProps {
  onChipClick?: (employeeSlug: string) => void;
  className?: string;
}

export function EmployeeSuggestionChips({ 
  onChipClick,
  className 
}: EmployeeSuggestionChipsProps) {
  const { openChat } = useUnifiedChatLauncher();

  const handleChipClick = (chip: SuggestionChip) => {
    // Open chat with the selected employee
    openChat({
      initialEmployeeSlug: chip.employeeSlug,
      context: {
        source: 'prime-workspace-suggestion',
        suggestion: chip.label,
      },
    });

    // Call optional callback
    if (onChipClick) {
      onChipClick(chip.employeeSlug);
    }
  };

  return (
    <div className={cn('flex flex-wrap gap-2 md:gap-3', className)}>
      {SUGGESTION_CHIPS.map((chip) => (
        <button
          key={chip.employeeSlug}
          type="button"
          onClick={() => handleChipClick(chip)}
          className={cn(
            'group relative inline-flex items-center gap-2 rounded-xl',
            'px-3 py-2 md:px-4 md:py-2.5',
            'border border-slate-700/50 bg-slate-900/60',
            'hover:border-slate-600/70 hover:bg-slate-900/80',
            'transition-all duration-200',
            'text-xs md:text-sm font-medium text-slate-200',
            'hover:scale-[1.02] active:scale-[0.98]'
          )}
        >
          {/* Gradient glow on hover */}
          <div
            className={cn(
              'absolute inset-0 rounded-xl bg-gradient-to-r opacity-0 group-hover:opacity-20',
              'transition-opacity duration-200',
              chip.gradient
            )}
          />
          
          {/* Content */}
          <span className="text-base md:text-lg relative z-10">{chip.emoji}</span>
          <span className="relative z-10">{chip.label}</span>
          
          {/* Arrow indicator */}
          <span className="text-slate-500 group-hover:text-slate-300 transition-colors relative z-10">
            →
          </span>
        </button>
      ))}
    </div>
  );
}








