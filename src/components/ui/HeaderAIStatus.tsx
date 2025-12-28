/**
 * HeaderAIStatus Component
 * 
 * Minimal premium AI status indicator for dashboard header
 * Shows colored dot (green/amber/blue) + state label
 * Click opens AI Pulse panel, hover shows tooltip
 */

import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { useJobsSystemStore } from '../../state/jobsSystemStore';
import { NotificationsPanel } from '../system/NotificationsPanel';
import { useAIStatus } from '../../hooks/useAIStatus';

export function HeaderAIStatus() {
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const location = useLocation();
  const status = useAIStatus();

  // Debug: Log when component mounts/updates to verify it's rendering on all pages
  useEffect(() => {
    console.log('[HeaderAIStatus] mounted/updated', location.pathname, 'status:', status);
  }, [location.pathname, status]);

  // Determine dot color, label, and animation based on state
  const dotColor = {
    idle: 'bg-green-400',
    processing: 'bg-amber-400',
    responding: 'bg-blue-400',
  }[status];

  const label = {
    idle: 'AI Active',
    processing: 'AI Working',
    responding: 'AI Responding',
  }[status];

  const shouldPulse = status !== 'idle'; // Pulse for processing and responding

  return (
    <>
      <button
        onClick={() => setIsPanelOpen(true)}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className={cn(
          "group relative flex items-center gap-2 px-2 py-1",
          "text-[11px] text-slate-400 hover:text-slate-300",
          "transition-all duration-200",
          "cursor-pointer",
          "whitespace-nowrap"
        )}
      >
        {/* Colored dot with optional subtle pulse */}
        <div className="relative">
          <div className={cn(
            "h-1.5 w-1.5 rounded-full",
            dotColor,
            shouldPulse && "animate-pulse"
          )} />
          {/* Very subtle glow when active (processing/responding) */}
          {shouldPulse && (
            <div className={cn(
              "absolute inset-0 h-1.5 w-1.5 rounded-full animate-ping opacity-20",
              dotColor
            )} />
          )}
        </div>

        {/* State label */}
        <span className="text-[11px] font-normal text-slate-400 group-hover:text-slate-300 whitespace-nowrap">
          {label}
        </span>

        {/* Tooltip */}
        {showTooltip && (
          <div className="absolute bottom-full right-0 mb-2 px-2 py-1 rounded-md bg-slate-900/95 text-[10px] text-slate-200 whitespace-nowrap shadow-lg border border-slate-700/80 z-50 pointer-events-none">
            Prime is online
            {/* Tooltip arrow */}
            <div className="absolute top-full right-4 -mt-1 w-2 h-2 bg-slate-900/95 border-r border-b border-slate-700/80 transform rotate-45" />
          </div>
        )}
      </button>

      {/* Notifications Panel */}
      <NotificationsPanel 
        isOpen={isPanelOpen} 
        onClose={() => setIsPanelOpen(false)} 
      />
    </>
  );
}





