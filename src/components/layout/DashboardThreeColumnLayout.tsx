/**
 * DashboardThreeColumnLayout Component
 * 
 * Shared 3-column layout for all dashboard workspaces
 * 
 * Layout proportions:
 * - Left (Workspace): ~1.1-1.15fr
 * - Middle: ~1.5-1.6fr
 * - Right (Activity Feed): ~0.9fr
 * 
 * All columns share the same height via items-stretch + h-full
 */

import React from 'react';
import { cn } from '../../lib/utils';

interface DashboardThreeColumnLayoutProps {
  className?: string;
  left: React.ReactNode;
  middle: React.ReactNode;
  right: React.ReactNode;
}

export function DashboardThreeColumnLayout({
  className,
  left,
  middle,
  right,
}: DashboardThreeColumnLayoutProps) {
  return (
    <div
      className={cn(
        'grid grid-cols-[300px_minmax(0,1fr)_300px] gap-6 items-stretch w-full',
        // Stack on smaller screens
        'max-lg:grid-cols-1',
        className
      )}
    >
      {/* Left Column - Workspace - Fixed 300px width */}
      <div className="h-full flex max-lg:w-full">
        {left}
      </div>

      {/* Middle Column - Main Content - Flexible */}
      <div className="h-full flex">
        {middle}
      </div>

      {/* Right Column - Activity Feed - Fixed 300px width */}
      <div className="h-full flex max-lg:w-full">
        {right}
      </div>
    </div>
  );
}

