/**
 * AIWorkspaceHeader Component
 * 
 * Reusable header for AI workspace overlays
 * Contains avatar, title, subtitle, workspace pill, guardrails chip, and close button
 */

import React from 'react';
import { X, Minus } from 'lucide-react';
import { cn } from '../../lib/utils';
import { AIWorkspaceGuardrailsChip } from './AIWorkspaceGuardrailsChip';

export interface AIWorkspaceHeaderProps {
  title: string;
  subtitle: string;
  workspaceLabel?: string;
  avatarEmoji: string;
  avatarColorClass?: string;
  avatarShadowColorClass?: string;
  workspacePillColorClass?: string;
  guardrailsActive: boolean | null;
  piiProtectionActive: boolean | null;
  guardrailsText?: {
    active: string;
    unknown: string;
  };
  onClose: () => void;
  onMinimize?: () => void;
  showMinimize?: boolean;
  titleId?: string;
}

export function AIWorkspaceHeader({
  title,
  subtitle,
  workspaceLabel,
  avatarEmoji,
  avatarColorClass = 'bg-indigo-500/80',
  avatarShadowColorClass = 'shadow-indigo-500/30',
  workspacePillColorClass = 'border-indigo-500/40 bg-indigo-500/10 text-indigo-100/90',
  guardrailsActive,
  piiProtectionActive,
  guardrailsText,
  onClose,
  onMinimize,
  showMinimize = false,
  titleId,
}: AIWorkspaceHeaderProps) {
  return (
    <header className={cn(
      'flex items-center justify-between border-b border-slate-800/60 bg-slate-950/95 flex-shrink-0',
      'px-4 py-3 md:px-6 md:py-4'
    )}>
      <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
        {/* Avatar with Prime-specific gradient glow */}
        <div className="relative flex-shrink-0">
          {/* Gradient glow for Prime */}
          {avatarEmoji === '👑' && (
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-amber-400/30 via-orange-500/20 to-pink-500/30 blur-lg animate-pulse" />
          )}
          <div className={cn(
            'relative flex h-9 w-9 md:h-10 md:w-10 items-center justify-center rounded-full shadow-lg',
            avatarColorClass,
            avatarShadowColorClass
          )}>
            <span className="text-xl md:text-2xl relative z-10">{avatarEmoji}</span>
          </div>
        </div>

        {/* Title + Subtitle */}
        <div className="flex flex-col min-w-0 flex-1 gap-0.5 md:gap-0">
          <div className="flex items-center gap-1.5 md:gap-2 flex-wrap min-w-0">
            <h2 
              id={titleId}
              className="text-sm md:text-base font-semibold text-slate-50 min-w-0 whitespace-nowrap"
            >
              {title}
            </h2>
            {workspaceLabel && (
              <span className={cn(
                'inline-flex items-center rounded-full border flex-shrink-0',
                'px-2 py-0.5 text-[10px] md:text-[11px] font-medium uppercase tracking-wide whitespace-nowrap',
                workspacePillColorClass
              )}>
                {workspaceLabel}
              </span>
            )}
          </div>
          <p className="text-[11px] md:text-xs text-slate-400 min-w-0 truncate">
            {subtitle}
          </p>
        </div>
      </div>

      {/* Right side: Guardrails chip + Minimize + Close buttons */}
      <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
        <AIWorkspaceGuardrailsChip
          guardrailsActive={guardrailsActive}
          piiProtectionActive={piiProtectionActive}
          variant="header"
          textActive={guardrailsText?.active}
          textUnknown={guardrailsText?.unknown}
        />
        {showMinimize && onMinimize && (
          <button
            type="button"
            onClick={onMinimize}
            className="inline-flex h-8 w-8 md:h-8 md:w-8 items-center justify-center rounded-full border border-slate-700/70 bg-slate-900/80 text-slate-300 hover:bg-slate-800 hover:text-slate-50 transition-colors touch-manipulation"
            aria-label="Minimize workspace"
          >
            <Minus className="h-4 w-4" />
          </button>
        )}
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-8 w-8 md:h-8 md:w-8 items-center justify-center rounded-full border border-slate-700/70 bg-slate-900/80 text-slate-300 hover:bg-slate-800 hover:text-slate-50 transition-colors touch-manipulation"
          aria-label="Close workspace"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}

