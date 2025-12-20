/**
 * AIPulseChip Component
 * 
 * Premium AI Pulse indicator chip for the header
 * Shows unread AI notifications count and opens NotificationsPanel on click
 */

import { useState } from 'react';
import { Zap, Bell } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useJobsSystemStore } from '../../state/jobsSystemStore';
import { NotificationsPanel } from '../system/NotificationsPanel';

export function AIPulseChip() {
  const { unreadAiCount, runningCount } = useJobsSystemStore();
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  const hasUpdates = unreadAiCount > 0 || runningCount > 0;

  return (
    <>
      <button
        onClick={() => setIsPanelOpen(true)}
        className={cn(
          "group relative flex items-center gap-2 px-3 py-1.5 rounded-full",
          "bg-gradient-to-r from-purple-500/10 via-blue-500/10 to-cyan-500/10",
          "border border-purple-500/30",
          "hover:border-purple-400/50 hover:shadow-lg hover:shadow-purple-500/20",
          "transition-all duration-300",
          "cursor-pointer"
        )}
      >
        {/* Pulse ring animation when active */}
        {hasUpdates && (
          <div className="absolute inset-0 rounded-full bg-purple-400/20 animate-ping opacity-75" />
        )}

        {/* Icon */}
        <div className="relative z-10">
          {hasUpdates ? (
            <Zap className="w-3.5 h-3.5 text-purple-400" />
          ) : (
            <Bell className="w-3.5 h-3.5 text-slate-400" />
          )}
        </div>

        {/* Label + Count */}
        <div className="flex items-center gap-1.5 relative z-10">
          <span className="text-xs font-semibold text-purple-100">
            AI Pulse
          </span>
          {unreadAiCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-purple-500/30 text-[10px] font-bold text-purple-200 min-w-[18px] text-center">
              {unreadAiCount > 99 ? '99+' : unreadAiCount}
            </span>
          )}
        </div>

        {/* Active indicator dot */}
        {runningCount > 0 && (
          <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-cyan-400 rounded-full border-2 border-slate-950 animate-pulse" />
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







