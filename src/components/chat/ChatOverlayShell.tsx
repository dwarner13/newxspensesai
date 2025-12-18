/**
 * ChatOverlayShell Component
 * 
 * Shared overlay shell for all chat interfaces (Prime, Byte, Tag, etc.)
 * Provides consistent layout: header, guardrails banner, scrollable messages, footer
 * Matches the Prime chat design with orange gradient border and wide layout
 */

import React from 'react';
import { X } from 'lucide-react';
import { GuardrailNotice } from './GuardrailNotice';

export interface ChatOverlayShellProps {
  /** Chat title (e.g., "PRIME — CHAT") */
  title: string;
  
  /** Optional subtitle/description */
  subtitle?: string;
  
  /** Status text (e.g., "Online") */
  statusText?: string;
  
  /** Optional icon/emoji for the header */
  icon?: React.ReactNode;
  
  /** Optional gradient classes for icon background */
  iconGradient?: string;
  
  /** Main content area (messages list) */
  children: React.ReactNode;
  
  /** Footer content (input bar) */
  footer: React.ReactNode;
  
  /** Whether to show guardrails banner */
  showGuardrailsBanner?: boolean;
  
  /** Close handler */
  onClose: () => void;
  
  /** Optional quick actions/suggested prompts (shown between header and messages, not in footer) */
  quickActions?: React.ReactNode;
  
  /** Optional welcome region (welcome card + quick actions, rendered between header and scroll area) */
  welcomeRegion?: React.ReactNode;
  
  /** @deprecated Use quickActions instead */
  suggestedPrompts?: React.ReactNode;
}

export function ChatOverlayShell({
  title,
  subtitle,
  statusText = 'Online',
  icon,
  iconGradient = 'from-amber-400 via-orange-500 to-pink-500',
  children,
  footer,
  showGuardrailsBanner = false,
  onClose,
  quickActions,
  welcomeRegion,
  suggestedPrompts, // Deprecated, kept for backward compatibility
}: ChatOverlayShellProps) {
  // Use quickActions if provided, fallback to suggestedPrompts for backward compatibility
  const actionsSection = quickActions || suggestedPrompts;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* Gradient border wrapper – ONLY wraps the card */}
      <div className="inline-flex rounded-[32px] bg-gradient-to-r from-amber-400/60 via-orange-500/50 to-pink-500/60 p-[2px] shadow-[0_0_40px_rgba(251,191,36,0.4)]">
        {/* Main chat card – controls all height */}
        <aside
          className="
            relative flex h-[min(620px,calc(100vh-5rem))] w-[min(1280px,100vw-3rem)] flex-col
            overflow-hidden rounded-[28px]
            bg-[#050816]/95 backdrop-blur-2xl
            shadow-[0_18px_80px_rgba(0,0,0,0.75)]
          "
          aria-label={`${title} chat`}
        >
          {/* Root container - flex column for proper scrolling */}
          <div className="flex h-full flex-col">
            {/* HEADER - Polished with gradient background and emoji */}
            <header className="sticky top-0 z-20 border-b border-white/10 bg-gradient-to-r from-slate-950/95 via-slate-950/90 to-slate-950/95 px-6 pt-5 pb-3 backdrop-blur-sm shrink-0">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  {icon && (
                    <span className={`inline-flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br ${iconGradient} text-base shadow-lg`}>
                      {icon}
                    </span>
                  )}
                  <div>
                    <div className="text-xs font-semibold tracking-[0.25em] uppercase text-slate-200">
                      {title}
                    </div>
                    {subtitle && (
                      <div className="mt-0.5 text-xs text-slate-400 leading-relaxed">
                        {subtitle}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 text-xs text-emerald-300">
                    <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.9)]" />
                    <span>{statusText}</span>
                  </div>
                  <button
                    onClick={onClose}
                    className="p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800/80 rounded-lg transition-colors"
                    aria-label="Close chat"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </header>

            {/* Guardrails banner - shown for Prime */}
            {showGuardrailsBanner && (
              <div className="shrink-0">
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
            {!welcomeRegion && actionsSection && (
              <div className="shrink-0 border-b border-white/10">
                {actionsSection}
              </div>
            )}

            {/* MIDDLE - Scrollable messages area (flex-1, never overlaps welcome/quick actions) */}
            <div className="flex-1 min-h-0 overflow-y-auto">
              {children}
            </div>

            {/* FOOTER - Fixed input at bottom */}
            <footer className="border-t border-white/5 px-8 pb-6 pt-4 shrink-0">
              {footer}
            </footer>
          </div>
        </aside>
      </div>
    </div>
  );
}


