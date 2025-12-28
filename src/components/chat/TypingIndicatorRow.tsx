/**
 * Typing Indicator Row Component
 * 
 * Canonical typing indicator that renders as a normal message bubble row.
 * Always used inside the scrollable message list area.
 * 
 * This is the ONLY typing indicator component allowed across all employees.
 */

import React from 'react';
import { TypingIndicator } from './TypingIndicator';
import { PrimeLogoBadge } from '../branding/PrimeLogoBadge';
import { getEmployeeDisplayConfig } from '../../config/employeeDisplayConfig';

export interface TypingIndicatorRowProps {
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

/**
 * Typing Indicator Row
 * 
 * Renders as a normal message bubble row inside the scrollable message list.
 * Does not affect panel sizing or layout.
 */
export function TypingIndicatorRow({
  employeeSlug,
  displayName,
  gradient,
  emoji,
  compact = false,
}: TypingIndicatorRowProps) {
  const normalizedSlug = (employeeSlug?.toLowerCase().trim() || 'prime-boss') as keyof typeof import('../../config/employeeDisplayConfig').EMPLOYEE_DISPLAY_CONFIG;
  const displayConfig = getEmployeeDisplayConfig(normalizedSlug);
  
  const finalGradient = gradient || displayConfig.gradient;
  const finalEmoji = emoji || displayConfig.emoji;
  const isPrime = normalizedSlug === 'prime-boss';

  return (
    <div className="flex justify-start shrink-0" data-typing-indicator="true">
      <div className="flex items-start gap-2 max-w-[85%]">
        {/* Employee avatar - rendered here to avoid double avatar */}
        {isPrime ? (
          <PrimeLogoBadge size={32} className="flex-shrink-0" />
        ) : (
          <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-gradient-to-br ${finalGradient}`}>
            <span className="text-sm">{finalEmoji}</span>
          </div>
        )}
        
        {/* Typing bubble (no avatar inside) */}
        <TypingIndicator
          employeeSlug={employeeSlug}
          displayName={displayName}
          gradient={gradient}
          emoji={emoji}
          compact={compact}
        />
      </div>
    </div>
  );
}



