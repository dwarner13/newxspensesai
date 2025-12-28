/**
 * EmployeeUnifiedCardBase Component
 * 
 * Shared base component for all employee hero cards with premium Byte-style design.
 * Provides consistent structure, styling, and layout while allowing customization
 * of stats, actions, and employee-specific content.
 * 
 * All employee hero cards should use this base to ensure visual consistency.
 */

import React from 'react';
import { useLocation } from 'react-router-dom';
import { getEmployeeDisplayConfig, type EmployeeStat } from '../../../config/employeeDisplayConfig';

/**
 * Map employee accent color names to RGB values for dynamic styling
 */
function getAccentColorRgb(accentColor: string): string {
  const colorMap: Record<string, string> = {
    'amber-500': '245, 158, 11', // amber-500
    'sky-500': '14, 165, 233', // sky-500
    'teal-500': '20, 184, 166', // teal-500
    'orange-500': '249, 115, 22', // orange-500
    'indigo-500': '99, 102, 241', // indigo-500
    'blue-500': '59, 130, 246', // blue-500 (for Ledger/Tax)
    'slate-500': '100, 116, 139', // slate-500 (fallback)
  };
  return colorMap[accentColor] || colorMap['slate-500'];
}

export interface SecondaryAction {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}

export interface EmployeeUnifiedCardBaseProps {
  /** Employee slug (e.g. 'byte-docs', 'tag-ai') */
  employeeSlug: string;
  
  /** Stats to display (overrides config defaults if provided) */
  stats?: EmployeeStat[];
  
  /** Primary action button label */
  primaryActionLabel: string;
  
  /** Primary action click handler */
  onPrimaryActionClick: () => void;
  
  /** Optional secondary action buttons (Upload, Queue, Stats, etc.) */
  secondaryActions?: SecondaryAction[];
  
  /** Footer status text (e.g. "Online 24/7") */
  footerStatusText?: string;
  
  /** Optional custom content to render in the middle section */
  children?: React.ReactNode;
  
  /** Optional className for the container */
  className?: string;
}

export function EmployeeUnifiedCardBase({
  employeeSlug,
  stats,
  primaryActionLabel,
  onPrimaryActionClick,
  secondaryActions,
  footerStatusText = 'Online 24/7',
  children,
  className = '',
}: EmployeeUnifiedCardBaseProps) {
  const location = useLocation();
  const isPrimeChatPage = location.pathname === '/dashboard/prime-chat';
  const config = getEmployeeDisplayConfig(employeeSlug);
  const displayStats = stats || config.stats || [];

  return (
    <div className={`relative overflow-hidden rounded-3xl border border-slate-700/60 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-950 shadow-[0_18px_60px_rgba(15,23,42,0.85)] p-6 flex flex-col ${isPrimeChatPage ? '' : 'h-full'} ${className}`}>
      {/* Subtle radial glow behind employee icon */}
      <div className={`pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full ${config.accentGlow} blur-3xl`} />
      
      {/* Top Section - Dark Premium Card Header */}
      <div className="relative flex-shrink-0 pb-6">
        {/* Header with Icon + Title + Description */}
        <div className="flex items-start gap-4 mb-3">
          {/* Avatar Circle - Glowing */}
          <div className={`flex h-12 w-12 items-center justify-center rounded-full ${config.accentGlow.replace('/10', '/20')} ${config.accentShadow} flex-shrink-0`}>
            <span className="text-2xl">{config.emoji}</span>
          </div>
          
          {/* Title and Description */}
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold text-slate-50 leading-tight truncate">
              {config.title}
            </h2>
            <p className="text-xs text-slate-300/80 mt-1 line-clamp-2">
              {config.subtitle}
            </p>
          </div>
        </div>

        {/* Three Stats Row - Soft labels */}
        {displayStats.length > 0 && (
          <div className="flex items-center gap-2 sm:gap-4 mb-3">
            {displayStats.map((stat, index) => (
              <div key={index} className="flex-1 flex flex-col items-center text-center">
                <div className={`text-2xl font-bold ${stat.colorClass}`}>{stat.value}</div>
                <p className="text-[11px] uppercase tracking-wide text-slate-400/80">{stat.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Secondary Action Buttons Row - Soft glass buttons */}
        {secondaryActions && secondaryActions.length > 0 && (
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
            {secondaryActions.map((action, index) => (
              <button
                key={index}
                onClick={action.onClick}
                disabled={action.disabled}
                className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-white/5 px-4 py-2 text-xs font-medium text-slate-100 hover:bg-white/10 transition-colors whitespace-nowrap disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {action.icon}
                <span>{action.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Middle Section - Custom content or default empty state */}
      {/* CRITICAL: On /dashboard/prime-chat, NO nested scroll - BODY is scroll owner */}
      {children && (
        <div 
          className={`flex-1 ${isPrimeChatPage ? 'overflow-visible' : 'min-h-0 overflow-y-auto'} -mx-6 px-6 py-4`}
        >
          {children}
        </div>
      )}

      {/* Chat trigger button - unified premium fintech style for all employees */}
      <div className="relative flex-shrink-0 -mx-6 px-6 pt-4 pb-4">
        {/* NOTE: This is the single canonical primary chat button style for all employees.
            Premium fintech-grade design with employee-specific accent colors.
            Matches the floating chat pills glow language but scaled for large CTA button.
            Do not override per employee – update here if we ever change the global brand look. */}
        <div className="group relative inline-block mt-4">
          {/* Perimeter glow aura - matches floating pills technique, scaled for large button */}
          <div
            className={`
              pointer-events-none absolute inset-[-3px] rounded-full opacity-0
              bg-gradient-to-br ${config.gradient}
              blur-xl
              transition-opacity duration-200
              group-hover:opacity-50
              group-has-[:active]:opacity-60
            `}
          />
          
          {/* Premium fintech button with dark rich gradient and employee accent ring */}
          <button
            type="button"
            onClick={onPrimaryActionClick}
            className="group/btn relative inline-flex items-center justify-center rounded-full px-8 py-3 text-sm font-semibold tracking-wide text-white bg-gradient-to-br from-slate-800 via-slate-900 to-black border border-slate-700/60 transition-all duration-200 hover:-translate-y-[1px] active:scale-[0.98] active:translate-y-0 focus-visible:outline-none"
            style={{
              // Employee accent color ring with shadow - using actual RGB values
              boxShadow: `0 0 0 1px rgba(${getAccentColorRgb(config.accentColor)}, 0.4), 0 10px 28px rgba(15,23,42,0.9)`,
            } as React.CSSProperties}
            onMouseEnter={(e) => {
              // Increase ring opacity and shadow on hover
              const rgb = getAccentColorRgb(config.accentColor);
              e.currentTarget.style.boxShadow = `0 0 0 1px rgba(${rgb}, 0.6), 0 12px 32px rgba(15,23,42,0.95)`;
            }}
            onMouseLeave={(e) => {
              // Reset ring opacity and shadow
              const rgb = getAccentColorRgb(config.accentColor);
              e.currentTarget.style.boxShadow = `0 0 0 1px rgba(${rgb}, 0.4), 0 10px 28px rgba(15,23,42,0.9)`;
            }}
            onFocus={(e) => {
              // Focus ring using employee accent color
              const rgb = getAccentColorRgb(config.accentColor);
              e.currentTarget.style.outline = `2px solid rgba(${rgb}, 0.6)`;
              e.currentTarget.style.outlineOffset = '2px';
            }}
            onBlur={(e) => {
              // Remove focus ring
              e.currentTarget.style.outline = 'none';
              e.currentTarget.style.outlineOffset = '0';
            }}
          >
            {/* Top-left reflective shine - subtle premium micro-shine */}
            <div
              className="absolute inset-0 rounded-full bg-gradient-to-br from-white/10 via-transparent to-transparent pointer-events-none"
            />
            
            {/* Button content */}
            <span className="relative mr-2 text-base">💬</span>
            <span className="relative">{primaryActionLabel}</span>
          </button>
        </div>

        {/* Status line with animated ping dots */}
        <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-slate-300/80">
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-900/60 px-3 py-1">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/60 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
            </span>
            {footerStatusText}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-900/60 px-3 py-1">
            <span>🛡️</span>
            Guardrails + PII protection active
          </span>
        </div>
      </div>
    </div>
  );
}

