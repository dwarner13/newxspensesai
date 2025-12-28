/**
 * RightPulseRail Component
 * 
 * Floating pulse orb button on the right side of the screen
 * Shows job progress and notification counts
 * Opens JobsDrawer on click
 */

import React from 'react';
import { Activity } from 'lucide-react';
import { useJobsSystemStore } from '../../state/jobsSystemStore';
import { cn } from '../../lib/utils';

export function RightPulseRail() {
  const { runningCount, unreadCount, setDrawerOpen } = useJobsSystemStore();
  const hasActiveWork = runningCount > 0;
  const hasNotifications = unreadCount > 0;
  
  return (
    <div className="fixed right-6 top-1/2 -translate-y-1/2 z-[60] pointer-events-none">
      <button
        onClick={() => setDrawerOpen(true)}
        className={cn(
          "relative w-14 h-14 rounded-full",
          "bg-slate-900/90 backdrop-blur-md border border-white/10",
          "shadow-lg shadow-slate-900/50",
          "flex items-center justify-center",
          "transition-all duration-300",
          "pointer-events-auto",
          "hover:scale-110 hover:shadow-xl hover:shadow-sky-500/30",
          "active:scale-95",
          hasActiveWork && "ring-2 ring-sky-500/50 ring-offset-2 ring-offset-slate-950",
          // Pulse animation when work is running
          hasActiveWork && "animate-pulse"
        )}
        aria-label={`Jobs & Updates${hasNotifications ? ` (${unreadCount} unread)` : ''}`}
        title="Jobs & Updates"
      >
        {/* Pulse ring effect when work is running */}
        {hasActiveWork && (
          <>
            <div className="absolute inset-0 rounded-full bg-sky-500/20 animate-ping" />
            <div className="absolute inset-0 rounded-full bg-sky-500/10 animate-pulse" />
          </>
        )}
        
        {/* Icon */}
        <Activity 
          className={cn(
            "w-6 h-6 relative z-10 transition-colors",
            hasActiveWork ? "text-sky-400" : "text-slate-400",
            hasNotifications && "text-amber-400"
          )} 
        />
        
        {/* Unread badge */}
        {hasNotifications && (
          <div className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1.5 rounded-full bg-amber-500 border-2 border-slate-950 flex items-center justify-center">
            <span className="text-[10px] font-bold text-white">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          </div>
        )}
        
        {/* Subtle glow when active */}
        {hasActiveWork && (
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-sky-500/20 to-transparent blur-xl" />
        )}
      </button>
    </div>
  );
}

















