// LEGACY: Old activity panel component kept for reference.
// The dashboard now uses ActivityFeedSidebar + ActivityFeed components for all activity displays.
// This component used mock data and is not integrated with the real activity feed system.

/**
 * ActivityPanel Component
 * 
 * Right-side panel for activity feed
 * Updated styling: gray-900 bg, gray-800 border, rounded-xl, padding 24px
 */

import React from 'react';
import { useLocation } from 'react-router-dom';

interface ActivityItem {
  id: number;
  text: string;
  timestamp?: string;
}

const mockActivities: ActivityItem[] = [
  { id: 1, text: "Prime routed a question to Tag — Categories updated", timestamp: "5 min ago" },
  { id: 2, text: "Byte processed 24 new transactions", timestamp: "12 min ago" },
  { id: 3, text: "Liberty updated your debt payoff plan", timestamp: "1 hour ago" },
  { id: 4, text: "Crystal detected a spending pattern", timestamp: "2 hours ago" },
  { id: 5, text: "Tag auto-categorized 18 transactions", timestamp: "3 hours ago" },
  { id: 6, text: "Goalie reviewed your budget goals", timestamp: "4 hours ago" },
];

export const ActivityPanel: React.FC = () => {
  return (
    <div className="w-full rounded-xl bg-slate-900 border border-slate-800 p-6 h-full flex flex-col">
      
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold tracking-wide text-slate-100">
          ACTIVITY FEED
        </h3>
        <span className="text-xs text-slate-400">Recent AI team activity</span>
      </div>
      
      {/* Activity Items */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-3">
        {mockActivities.map((activity) => (
          <div
            key={activity.id}
            className="px-3 py-2 bg-slate-800 rounded-lg border border-slate-700"
          >
            <p className="text-xs text-slate-300 leading-snug">
              {activity.text}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              {activity.timestamp}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};




