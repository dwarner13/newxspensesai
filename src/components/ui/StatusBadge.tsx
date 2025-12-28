/**
 * StatusBadge Component
 * 
 * Reusable status badge for dashboard header
 * Used to display page-specific status information (e.g., "Byte Online • 24/7", "Uploads enabled")
 * Supports fixed-width pills for consistent layout
 */

import React from 'react';
import { cn } from '../../lib/utils';

interface StatusBadgeProps {
  variant?: 'online' | 'default';
  children: React.ReactNode;
  className?: string;
  fixedWidth?: boolean; // If true, uses fixed width for consistent layout
}

export function StatusBadge({ variant = 'default', children, className, fixedWidth = false }: StatusBadgeProps) {
  const baseClasses = 'inline-flex items-center justify-center rounded-full border text-sm font-medium whitespace-nowrap';
  
  const variantClasses = {
    online: 'bg-emerald-900/60 text-emerald-300 border-emerald-700',
    default: 'bg-slate-900/80 text-slate-200 border-slate-700',
  };
  
  const widthClasses = fixedWidth ? 'px-2.5 py-1.5 min-w-[120px] max-w-[140px] text-xs' : 'px-2.5 py-1.5 text-xs';
  
  return (
    <span className={cn(baseClasses, variantClasses[variant], widthClasses, className)}>
      {children}
    </span>
  );
}

