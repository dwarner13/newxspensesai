/**
 * HeaderStatusPill Component
 * 
 * Canonical status pill for dashboard header
 * Always shows "Online • 24/7" with consistent styling
 * Used on the tabs row (Row 2) of DashboardHeader
 */

import React from 'react';
import { StatusBadge } from './StatusBadge';

export function HeaderStatusPill() {
  return (
    <StatusBadge variant="online" className="shrink-0 max-w-[240px]">
      <span className="w-1.5 h-1.5 bg-green-400 rounded-full inline-block mr-1.5 animate-pulse"></span>
      Online • 24/7
    </StatusBadge>
  );
}







