/**
 * DashboardCardGrid Component
 * 
 * Shared card grid wrapper for consistent card layout across all dashboard pages.
 * Matches Main Dashboard card grid pattern exactly.
 * 
 * Usage:
 *   <DashboardCardGrid>
 *     {cards.map(card => <DashboardStatCard key={card.id} {...card} />)}
 *   </DashboardCardGrid>
 */

import React from 'react';
import { cn } from '../../lib/utils';

interface DashboardCardGridProps {
  children: React.ReactNode;
  className?: string;
}

export function DashboardCardGrid({ children, className }: DashboardCardGridProps) {
  return (
    <div className={cn(
      'grid gap-6 md:grid-cols-2 xl:grid-cols-3 items-stretch',
      className
    )}>
      {children}
    </div>
  );
}

