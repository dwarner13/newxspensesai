/**
 * AIWorkspaceGuardrailsChip Component
 * 
 * Reusable guardrails status chip with dynamic colors
 * Used in both header and middle strip
 */

import React from 'react';
import { Lock } from 'lucide-react';

export interface AIWorkspaceGuardrailsChipProps {
  guardrailsActive: boolean | null;
  piiProtectionActive: boolean | null;
  variant?: 'header' | 'strip';
  textActive?: string;
  textUnknown?: string;
}

export function AIWorkspaceGuardrailsChip({
  guardrailsActive,
  piiProtectionActive,
  variant = 'header',
  textActive,
  textUnknown,
}: AIWorkspaceGuardrailsChipProps) {
  // CRITICAL: Never show "Unknown" - guardrails status should come from useGuardrailsHealth hook
  // If guardrailsActive is null/false, default to showing "Offline" instead of "Unknown"
  // This component is legacy and should be phased out in favor of UnifiedAssistantChat's bottom pill
  const isActive = (guardrailsActive === true && piiProtectionActive === true);

  // Default text based on variant
  const defaultTextActive = variant === 'header'
    ? 'Guardrails + PII Protection Active'
    : 'Guardrails Active · PII protection on';
  
  // Never show "Unknown" - show "Offline" instead
  const defaultTextOffline = 'Guardrails: Offline · Protection unavailable';

  const displayText = isActive
    ? (textActive || defaultTextActive)
    : (textUnknown || defaultTextOffline); // Use provided textUnknown if available, otherwise show Offline

  // Header variant styling
  if (variant === 'header') {
    return (
      <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border ${
        isActive
          ? 'bg-emerald-500/10 text-emerald-200 border-emerald-500/40'
          : 'bg-amber-500/10 text-amber-200 border-amber-500/40'
      }`}>
        <span className={`h-1.5 w-1.5 rounded-full ${
          isActive ? 'bg-emerald-400' : 'bg-amber-400'
        } ${isActive ? 'animate-pulse' : ''}`} />
        {displayText}
      </span>
    );
  }

  // Strip variant styling
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-medium border ${
      isActive
        ? 'bg-slate-900/90 text-slate-300 border-slate-700/60'
        : 'bg-amber-900/90 text-amber-300 border-amber-700/60'
    }`}>
      <Lock className="h-3 w-3" />
      {displayText}
    </span>
  );
}

