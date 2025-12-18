/**
 * DashboardPageShell Component
 * 
 * Unified layout shell for all dashboard pages that enforces:
 * - Identical top spacing under the header
 * - Identical 3-column grid structure
 * - No per-page spacing drift
 * 
 * This is the single source of truth for dashboard page layout.
 * All /dashboard/* pages should use this component.
 */

import React from 'react';
import { cn } from '../../lib/utils';
import { DashboardThreeColumnLayout } from './DashboardThreeColumnLayout';

interface DashboardPageShellProps {
  /** Left column content (workspace panel) */
  left?: React.ReactNode;
  /** Center column content (main content) */
  center: React.ReactNode;
  /** Right column content (activity feed) */
  right?: React.ReactNode;
  /** Optional additional className for the wrapper */
  className?: string;
  /** Optional className for the grid container */
  gridClassName?: string;
}

export function DashboardPageShell({
  left,
  center,
  right,
  className,
  gridClassName,
}: DashboardPageShellProps) {
  return (
    <div className={cn('flex-1 min-w-0 w-full max-w-full h-full min-h-0', className)}>
      {/* Fixed top spacing - this is the ONLY place top spacing should exist */}
      {/* This pt-6 ensures consistent spacing under the header across all pages */}
      {/* Scroll is handled by parent main element in DashboardLayout */}
      {/* 
        LAYOUT RULE: No dashboard page may add top spacing (mt-*, pt-*, py-*, space-y-*) 
        above the grid. The only allowed top spacing is this pt-6 in DashboardPageShell.
        See DASHBOARD_LAYOUT_RULES.md for details.
      */}
      <div className="w-full max-w-full pt-6 min-h-0">
        <DashboardThreeColumnLayout
          className={gridClassName}
          left={left}
          center={center}
          right={right}
        />
      </div>
    </div>
  );
}


