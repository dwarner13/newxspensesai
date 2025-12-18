/**
 * PrimeSlideoutShell Component
 * 
 * Shared layout shell for Prime slideout panels (Team, Tasks, Chat, etc.)
 * Provides consistent positioning, styling, header, and close button integration
 */

import React from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { GuardrailNotice } from '../chat/GuardrailNotice';

export interface PrimeSlideoutShellProps {
  /** Panel title (e.g., "PRIME — CHAT") */
  title: string;
  
  /** Optional subtitle/description */
  subtitle?: string;
  
  /** Optional status badge (e.g., Online indicator) */
  statusBadge?: React.ReactNode;
  
  /** Optional icon/emoji for the header */
  icon?: React.ReactNode;
  
  /** Optional gradient classes for icon background */
  iconGradient?: string;
  
  /** Optional header actions (right side of header) */
  headerActions?: React.ReactNode;
  
  /** Main content area */
  children: React.ReactNode;
  
  /** Close handler */
  onClose?: () => void;
  
  /** Optional footer content */
  footer?: React.ReactNode;
  
  /** Optional quick actions section (rendered between header and scroll area) */
  quickActions?: React.ReactNode;
  
  /** Optional welcome region (welcome card + quick actions, rendered between header and scroll area) */
  welcomeRegion?: React.ReactNode;
  
  /** Whether to show guardrails banner */
  showGuardrailsBanner?: boolean;
  
  /** Custom className for the aside element */
  className?: string;
  
  /** Optional floating rail component to render inside the slideout */
  floatingRail?: React.ReactNode;
}

export function PrimeSlideoutShell({
  title,
  subtitle,
  statusBadge,
  icon,
  iconGradient = 'from-amber-400 via-orange-500 to-pink-500',
  headerActions,
  children,
  onClose,
  footer,
  quickActions,
  welcomeRegion,
  showGuardrailsBanner = false,
  className = '',
  floatingRail,
}: PrimeSlideoutShellProps) {
  // Check for reduced motion preference
  const prefersReducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  
  return (
    <div className="flex h-full justify-end items-stretch py-6 pr-4">
      <motion.aside
        initial={{ opacity: 0, transform: 'translate3d(110%, 0, 0)' }}
        animate={{ opacity: 1, transform: 'translate3d(0, 0, 0)' }}
        exit={{ opacity: 0, transform: 'translate3d(110%, 0, 0)' }}
        transition={prefersReducedMotion ? { duration: 0 } : { 
          transform: { duration: 0.26, ease: [0.2, 0.9, 0.2, 1] },
          opacity: { duration: 0.18, ease: 'easeOut' }
        }}
        style={{ willChange: 'transform, opacity', height: 'calc(100vh - 3rem)' }}
        className={`
          flex w-full max-w-xl flex-col
          rounded-3xl border border-slate-800/80 bg-gradient-to-b
          from-slate-900/80 via-slate-950 to-slate-950
          shadow-[0_0_0_1px_rgba(15,23,42,0.9),-18px_0_40px_rgba(56,189,248,0.25)]
          overflow-hidden transform-gpu
          ${className}
        `}
      >
        {/* Relative wrapper for rail + content */}
        <div className="relative flex h-full overflow-visible">
          {/* Floating rail - absolutely positioned inside */}
          {floatingRail && (
            <div className="absolute -left-12 top-1/2 z-40 flex -translate-y-1/2 flex-col gap-3 pointer-events-auto">
              {floatingRail}
            </div>
          )}
          
          {/* Main content area */}
          <div className="flex h-full flex-1 flex-col overflow-hidden">
        {/* HEADER – sticky with gradient background */}
        <div className="sticky top-0 z-20 border-b border-slate-800/70 bg-gradient-to-r from-slate-950/95 via-slate-950/90 to-slate-950/95 px-6 pt-5 pb-4 backdrop-blur-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-3">
                {icon && (
                  <span className={`inline-flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br ${iconGradient} text-base shadow-lg`}>
                    {icon}
                  </span>
                )}
                <div>
                  <h2 className="text-sm font-semibold tracking-[0.24em] text-slate-200 uppercase">
                    {title}
                  </h2>
                  {subtitle && (
                    <p className="mt-0.5 text-xs text-slate-400 leading-relaxed">
                      {subtitle}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Right side: Status badge + Close button */}
            <div className="flex flex-col items-end gap-2">
              {statusBadge && (
                <div className="flex items-center gap-2">
                  {statusBadge}
                </div>
              )}
              {headerActions && (
                <div className="flex items-center gap-2">
                  {headerActions}
                </div>
              )}
              {onClose && (
                <button
                  onClick={onClose}
                  className="p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800/80 rounded-lg transition-colors"
                  aria-label="Close panel"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Guardrails banner - shown when enabled */}
        {showGuardrailsBanner && (
          <div className="px-6 pt-3 pb-2 shrink-0">
            <GuardrailNotice />
          </div>
        )}

        {/* WELCOME REGION - Welcome card + quick actions (shrink-0, never overlaps messages) */}
        {welcomeRegion && (
          <div className="shrink-0">
            {welcomeRegion}
          </div>
        )}

        {/* QUICK ACTIONS - Fallback if welcomeRegion not provided (shrink-0, never overlaps) */}
        {!welcomeRegion && quickActions && (
          <div className="shrink-0">
            {quickActions}
          </div>
        )}

        {/* SCROLL AREA - Messages only (flex-1, scrollable, never overlaps welcome/quick actions) */}
        <div className="flex-1 min-h-0 overflow-y-auto hide-scrollbar" style={{ scrollbarGutter: 'stable' }}>
          {children}
        </div>

            {/* FOOTER – sticky */}
            {footer && (
              <div className="sticky bottom-0 z-20 border-t border-white/10 bg-slate-950/95 px-4 pt-3 pb-4 backdrop-blur-sm">
                {footer}
              </div>
            )}
          </div>
        </div>
      </motion.aside>
    </div>
  );
}

