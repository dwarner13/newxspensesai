/**
 * GoalieWorkspacePanel Component
 * 
 * Left sidebar panel for Goalie workspace
 * Matches ByteWorkspacePanel structure
 */

import React from 'react';
import { Target, TrendingUp, CheckCircle, Lightbulb } from 'lucide-react';

interface StatusCard {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  badge: 'active' | 'milestones' | 'completed' | 'suggestions';
  icon: React.ReactNode;
}

const statusCards: StatusCard[] = [
  {
    id: '1',
    title: 'Active Goals',
    description: '8 goals in progress',
    timestamp: 'Updated 2m ago',
    badge: 'active',
    icon: <Target className="w-4 h-4" />,
  },
  {
    id: '2',
    title: 'Upcoming Milestones',
    description: '3 milestones approaching',
    timestamp: 'Just now',
    badge: 'milestones',
    icon: <TrendingUp className="w-4 h-4" />,
  },
];

const badgeStyles = {
  active: 'bg-amber-400/10 text-amber-400 border-amber-400/30',
  milestones: 'bg-blue-400/10 text-blue-400 border-blue-400/30',
  completed: 'bg-green-400/10 text-green-400 border-green-400/30',
  suggestions: 'bg-purple-400/10 text-purple-400 border-purple-400/30',
};

const badgeLabels = {
  active: 'Active',
  milestones: 'Milestones',
  completed: 'Completed',
  suggestions: 'Suggestions',
};

export function GoalieWorkspacePanel() {
  const topCards = statusCards;
  
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 mb-3 flex-shrink-0">
        <span className="text-3xl">🥅</span>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-bold text-white">GOALIE WORKSPACE</h3>
          <p className="text-xs text-slate-500">Goal tracking & achievement</p>
        </div>
      </div>
      
      {/* Card 1 - Active Goals */}
      <div className="mb-4 flex-shrink-0">
        <div className="group p-4 rounded-lg bg-slate-800 border border-slate-700 hover:bg-slate-800/90 hover:border-slate-600 transition-all duration-200 cursor-pointer">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between mb-2">
                <h4 className="text-sm font-semibold text-white">
                  {topCards.find(c => c.id === '1')?.title}
                </h4>
                <div className={`px-2 py-1 rounded text-xs font-medium border flex-shrink-0 ml-2 ${badgeStyles.active}`}>
                  {badgeLabels.active}
                </div>
              </div>
              <p className="text-xs text-slate-400 mt-2">
                {topCards.find(c => c.id === '1')?.description}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {topCards.find(c => c.id === '1')?.timestamp}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Card 2 - Upcoming Milestones */}
      <div className="mb-4 flex-shrink-0">
        <div className="group p-4 rounded-lg bg-slate-800 border border-slate-700 hover:bg-slate-800/90 hover:border-slate-600 transition-all duration-200 cursor-pointer">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between mb-2">
                <h4 className="text-sm font-semibold text-white">
                  {topCards.find(c => c.id === '2')?.title}
                </h4>
                <div className={`px-2 py-1 rounded text-xs font-medium border flex-shrink-0 ml-2 ${badgeStyles.milestones}`}>
                  {badgeLabels.milestones}
                </div>
              </div>
              <p className="text-xs text-slate-400 mt-2">
                {topCards.find(c => c.id === '2')?.description}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {topCards.find(c => c.id === '2')?.timestamp}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Card 3 - Completed Goals & Goal Suggestions (flex-1 to fill remaining height) */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="p-4 rounded-lg bg-slate-800 border border-slate-700 h-full flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between mb-3 flex-shrink-0">
            <div>
              <h3 className="text-sm font-semibold text-slate-100 tracking-wide">
                Completed Goals
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Recent achievements
              </p>
            </div>
            <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2.5 py-1 text-[11px] font-medium text-amber-300 border border-amber-500/30">
              Achieved
            </span>
          </div>

          {/* Small metrics row */}
          <div className="grid grid-cols-2 gap-3 text-xs mb-3 flex-shrink-0">
            <div className="rounded-xl bg-slate-900/60 px-3 py-2 border border-slate-700/50">
              <p className="text-slate-400">Completed</p>
              <p className="mt-1 text-sm font-semibold text-slate-50">23</p>
            </div>
            <div className="rounded-xl bg-slate-900/60 px-3 py-2 border border-slate-700/50">
              <p className="text-slate-400">Suggestions</p>
              <p className="mt-1 text-sm font-semibold text-slate-50">5</p>
            </div>
          </div>

          {/* Short list */}
          <div className="flex-1 min-h-0 overflow-y-auto hide-scrollbar space-y-2 text-[11px] text-slate-200">
            <div className="rounded-lg bg-slate-900/70 px-3 py-2 border border-slate-700/50">
              ✅ <span className="font-medium">23 goals</span> completed successfully
            </div>
            <div className="rounded-lg bg-slate-900/70 px-3 py-2 border border-slate-700/50">
              💡 <span className="font-medium">5 goal suggestions</span> available
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
