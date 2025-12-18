/**
 * ConfidenceBar Component
 * 
 * Visual confidence indicator
 */

import React from 'react';

interface ConfidenceBarProps {
  score: number; // 0.0 - 1.0
  label?: string;
  showPercentage?: boolean;
}

export function ConfidenceBar({ score, label, showPercentage = true }: ConfidenceBarProps) {
  const percentage = Math.round(score * 100);
  
  // Determine color based on score
  let colorClass = 'bg-red-500';
  let textColor = 'text-red-400';
  
  if (percentage >= 90) {
    colorClass = 'bg-emerald-500';
    textColor = 'text-emerald-400';
  } else if (percentage >= 70) {
    colorClass = 'bg-amber-500';
    textColor = 'text-amber-400';
  }

  return (
    <div className="flex items-center gap-2">
      {label && (
        <span className="text-xs text-slate-400">{label}</span>
      )}
      <div className="flex-1 flex items-center gap-2">
        <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
          <div
            className={`h-full ${colorClass} transition-all duration-300`}
            style={{ width: `${percentage}%` }}
          />
        </div>
        {showPercentage && (
          <span className={`text-[10px] font-medium ${textColor} min-w-[30px]`}>
            {percentage}%
          </span>
        )}
      </div>
    </div>
  );
}









