/**
 * DashboardHeroRow Component
 * 
 * 2-column layout for hero content + Activity Feed sidebar
 * Used on Main Dashboard to align Prime hero card with Activity Feed
 * 
 * Layout: 70/30 split (hero content on left, Activity Feed on right)
 * Both columns share the same height and align at top and bottom
 */

import React from 'react';
import { ActivityFeedSidebar } from './ActivityFeedSidebar';
import { cn } from '../../lib/utils';

interface DashboardHeroRowProps {
  /** Hero content (e.g., Prime welcome card) */
  hero: React.ReactNode;
  /** Activity Feed scope (e.g., 'dashboard', 'smart-import', etc.) */
  activityScope?: string;
  /** Optional className for the container */
  className?: string;
}

export function DashboardHeroRow({ 
  hero, 
  activityScope = 'dashboard',
  className,
}: DashboardHeroRowProps) {
  return (
    <div className={cn(
      "grid gap-6 lg:gap-8 xl:grid-cols-[minmax(0,1.9fr)_minmax(0,1fr)] max-xl:grid-cols-1 items-stretch",
      className
    )}>
      {/* LEFT COLUMN - Hero Content (70% on xl+) */}
      <div className="min-w-0 max-xl:order-1 h-full">
        {hero}
      </div>

      {/* RIGHT COLUMN - Activity Feed Sidebar (30% on xl+) */}
      <div className="hidden xl:flex max-xl:order-2 h-full">
        <ActivityFeedSidebar scope={activityScope} className="h-full" />
      </div>
    </div>
  );
}

