/**
 * Shared Typing Indicator Component
 * 
 * Tag-style typing bubble used for:
 * - Open greeting typing animation
 * - Normal message streaming typing indicator
 * 
 * Renders as a message bubble row, doesn't affect panel sizing.
 */

import React from 'react';
import { getEmployeeDisplayConfig } from '../../config/employeeDisplayConfig';

interface TypingIndicatorProps {
  /** Employee slug (e.g., 'prime-boss', 'tag-ai') */
  employeeSlug: string;
  
  /** Optional custom display name override */
  displayName?: string;
  
  /** Optional custom gradient override */
  gradient?: string;
  
  /** Optional custom emoji override */
  emoji?: string;
  
  /** Show compact version (smaller, less padding) */
  compact?: boolean;
}

export function TypingIndicator({
  employeeSlug,
  displayName,
  gradient,
  emoji,
  compact = false,
}: TypingIndicatorProps) {
  const normalizedSlug = (employeeSlug?.toLowerCase().trim() || 'prime-boss') as keyof typeof import('../../config/employeeDisplayConfig').EMPLOYEE_DISPLAY_CONFIG;
  const displayConfig = getEmployeeDisplayConfig(normalizedSlug);
  
  const finalDisplayName = displayName || displayConfig.displayName;

  return (
    <div className="flex justify-start">
      <div className="flex items-start gap-2 max-w-[85%]">
        {/* Typing bubble only - avatar is rendered separately by TypingIndicatorRow */}
        <div className={`inline-flex items-start gap-2 px-4 py-2.5 rounded-2xl bg-slate-800/80 text-slate-100 border border-slate-700/70 ${compact ? 'py-2 px-3' : ''}`}>
          <div className="flex items-center gap-1.5">
            <div className="flex gap-1">
              <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <span className={`text-slate-400 ${compact ? 'text-xs' : 'text-xs'}`}>
              {finalDisplayName} is typing...
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}




