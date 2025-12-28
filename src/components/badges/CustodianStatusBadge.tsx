/**
 * Custodian Status Badge Component
 * 
 * Shows custodian setup status with premium glass styling.
 * Displays "Custodian: Ready" when setup is complete, "Custodian: Setup" when needed.
 */

import React, { useState, useEffect, useRef } from 'react';
import { Shield, ShieldCheck, AlertCircle } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface CustodianStatusBadgeProps {
  /** Whether custodian setup is complete */
  ready: boolean;
  
  /** Variant: 'pill' (default) or 'dot' */
  variant?: 'pill' | 'dot';
  
  /** Size: 'sm' or 'md' (default) */
  size?: 'sm' | 'md';
  
  /** Click handler - routes to setup if not ready, shows info if ready */
  onClick?: () => void;
  
  /** Optional setup date for ready state */
  setupDate?: string | null;
  
  /** Whether profile is still loading */
  isLoading?: boolean;
  
  /** Additional className */
  className?: string;
}

export function CustodianStatusBadge({
  ready,
  variant = 'pill',
  size = 'md',
  onClick,
  setupDate,
  isLoading = false,
  className,
}: CustodianStatusBadgeProps) {
  const [showPopover, setShowPopover] = useState(false);
  const [shouldPulse, setShouldPulse] = useState(false);
  const prevReadyRef = useRef<boolean | undefined>(undefined);
  const SESSION_STORAGE_KEY = 'custodian_ready_pulsed';

  // One-time pulse animation when ready becomes true
  useEffect(() => {
    // Only pulse when ready transitions from false/undefined to true
    if (ready && prevReadyRef.current !== true) {
      // Check if we've already pulsed this session
      const hasPulsed = typeof window !== 'undefined' && sessionStorage.getItem(SESSION_STORAGE_KEY) === '1';
      
      if (!hasPulsed) {
        setShouldPulse(true);
        // Mark as pulsed in sessionStorage
        if (typeof window !== 'undefined') {
          sessionStorage.setItem(SESSION_STORAGE_KEY, '1');
        }
        // Reset pulse after animation completes (~1200ms)
        const timeout = setTimeout(() => {
          setShouldPulse(false);
        }, 1200);
        
        return () => clearTimeout(timeout);
      }
    }
    
    // Update previous ready value
    prevReadyRef.current = ready;
  }, [ready]);

  // Loading state - show neutral skeleton
  if (isLoading) {
    return (
      <div
        className={cn(
          'inline-flex items-center gap-1.5 px-3 py-1 rounded-full',
          'bg-slate-800/60 border border-slate-700/50',
          'text-xs text-slate-400',
          size === 'sm' && 'px-2 py-0.5 text-[10px]',
          className
        )}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-slate-500 animate-pulse" />
        <span>Checking...</span>
      </div>
    );
  }

  // Ready state
  if (ready) {
    const tooltipText = setupDate
      ? `Custodian setup complete • ${new Date(setupDate).toLocaleDateString()}`
      : 'Your account is secured. Custodian setup complete.';

    // If onClick is provided, use it; otherwise show tooltip on hover
    const handleClick = onClick || undefined;

    if (variant === 'dot') {
      return (
        <div className="relative inline-flex items-center">
          <button
            onClick={handleClick}
            className={cn(
              'inline-flex items-center justify-center',
              'h-2 w-2 rounded-full',
              'bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.6)]',
              'hover:shadow-[0_0_12px_rgba(16,185,129,0.8)]',
              'transition-all duration-300 ease-out',
              handleClick && 'cursor-pointer',
              shouldPulse && [
                'scale-[1.02]',
                'shadow-[0_0_20px_rgba(16,185,129,0.8)]',
                'ring-2 ring-emerald-400/50 ring-offset-2 ring-offset-slate-950',
              ],
              className
            )}
            title={tooltipText}
            aria-label="Custodian: Ready"
          />
        </div>
      );
    }

    // Pill variant (default)
    return (
      <div className="relative inline-flex items-center">
        <button
          onClick={handleClick}
          className={cn(
            'inline-flex items-center gap-1.5 px-3 py-1 rounded-full',
            'bg-emerald-900/70 border border-emerald-500/40',
            'text-xs font-medium text-emerald-300',
            'shadow-[0_0_12px_rgba(16,185,129,0.3)]',
            'hover:bg-emerald-900/80 hover:border-emerald-500/60',
            'hover:shadow-[0_0_16px_rgba(16,185,129,0.4)]',
            'transition-all duration-300 ease-out',
            handleClick && 'cursor-pointer',
            size === 'sm' && 'px-2 py-0.5 text-[10px] gap-1',
            shouldPulse && [
              'scale-[1.02]',
              'shadow-[0_0_24px_rgba(16,185,129,0.6)]',
              'ring-2 ring-emerald-400/50 ring-offset-2 ring-offset-slate-950',
              'border-emerald-400/60',
            ],
            className
          )}
          title={tooltipText}
          aria-label="Custodian: Ready"
        >
          <ShieldCheck className={cn('w-3 h-3', size === 'sm' && 'w-2.5 h-2.5')} />
          <span>Custodian: Ready</span>
        </button>
      </div>
    );
  }

  // Not ready state
  const handleClick = () => {
    if (onClick) {
      onClick();
    }
  };

  if (variant === 'dot') {
    return (
      <button
        onClick={handleClick}
        className={cn(
          'inline-flex items-center justify-center',
          'h-2 w-2 rounded-full',
          'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]',
          'hover:shadow-[0_0_12px_rgba(251,191,36,0.8)]',
          'transition-shadow cursor-pointer',
          className
        )}
        title="Finish setup to secure your account."
        aria-label="Custodian: Setup required"
      />
    );
  }

  // Pill variant (default)
  return (
    <button
      onClick={handleClick}
      className={cn(
        'inline-flex items-center gap-1.5 px-3 py-1 rounded-full',
        'bg-amber-900/70 border border-amber-500/40',
        'text-xs font-medium text-amber-300',
        'shadow-[0_0_12px_rgba(251,191,36,0.3)]',
        'hover:bg-amber-900/80 hover:border-amber-500/60',
        'hover:shadow-[0_0_16px_rgba(251,191,36,0.4)]',
        'transition-all cursor-pointer',
        size === 'sm' && 'px-2 py-0.5 text-[10px] gap-1',
        className
      )}
      title="Finish setup to secure your account."
      aria-label="Custodian: Setup required"
    >
      <AlertCircle className={cn('w-3 h-3', size === 'sm' && 'w-2.5 h-2.5')} />
      <span>Custodian: Setup</span>
    </button>
  );
}

