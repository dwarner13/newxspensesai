/**
 * PrimeWelcomeCard Component
 * 
 * Enhanced welcome card for Prime Workspace Chat
 * Features gradient glow, dynamic intro, and suggestion chips
 */

import React from 'react';
import { EmployeeSuggestionChips } from './EmployeeSuggestionChips';
import { cn } from '../../lib/utils';

interface PrimeWelcomeCardProps {
  userName?: string;
  className?: string;
}

export function PrimeWelcomeCard({ userName: propUserName, className }: PrimeWelcomeCardProps) {
  // Simple fallback for now - use "there" if no userName prop provided
  // This prevents any undefined variable errors
  const name = propUserName || 'there';

  return (
    <div className={cn('flex flex-col items-center justify-center px-4 py-6 md:py-8', className)}>
      {/* Avatar with gradient glow */}
      <div className="relative mb-4 md:mb-6">
        {/* Outer glow */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-amber-400/40 via-orange-500/30 to-pink-500/40 blur-2xl animate-pulse" />
        
        {/* Avatar circle */}
        <div className="relative flex h-16 w-16 md:h-20 md:w-20 items-center justify-center rounded-full bg-gradient-to-br from-amber-400/90 via-orange-500 to-pink-500 shadow-[0_10px_40px_rgba(251,191,36,0.4)] border border-amber-300/30">
          <span className="text-3xl md:text-4xl">👑</span>
        </div>
      </div>

      {/* Welcome text */}
      <h2 className="text-xl md:text-2xl font-semibold text-slate-50 mb-2 text-center">
        Welcome to XspensesAI, {name}
      </h2>
      
      <p className="text-sm md:text-base text-slate-300 mb-1 text-center max-w-md">
        I'm Prime, your AI financial CEO.
      </p>
      
      <p className="text-xs md:text-sm text-slate-400 mb-6 md:mb-8 text-center max-w-lg leading-relaxed">
        I coordinate your AI team, route tasks, and help you manage your finances. 
        Choose an action below or ask me anything.
      </p>

      {/* Suggestion chips */}
      <EmployeeSuggestionChips className="justify-center" />
    </div>
  );
}

