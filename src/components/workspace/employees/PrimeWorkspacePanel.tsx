/**
 * PrimeWorkspacePanel Component
 * 
 * Left sidebar panel for Prime workspace showing command center status
 */

import React from 'react';
import { Crown, AlertCircle, CheckCircle, Users, TrendingUp, Clock } from 'lucide-react';

interface StatusCard {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  badge: 'active' | 'alert' | 'done' | 'team';
  icon: React.ReactNode;
  value?: string;
  trend?: string;
}

const statusCards: StatusCard[] = [
  {
    id: '1',
    title: "Today's Highlights",
    description: '3 tasks completed, 2 pending',
    timestamp: 'Updated 5m ago',
    badge: 'active',
    icon: <Crown className="w-4 h-4" />,
    value: '5',
  },
  {
    id: '2',
    title: 'Important Alerts',
    description: '1 high-priority item needs attention',
    timestamp: 'Just now',
    badge: 'alert',
    icon: <AlertCircle className="w-4 h-4" />,
    value: '1',
  },
  {
    id: '3',
    title: 'Active Employees',
    description: '7 AI team members working',
    timestamp: 'Live',
    badge: 'team',
    icon: <Users className="w-4 h-4" />,
    value: '7',
  },
];

const badgeStyles = {
  active: 'bg-purple-400/10 text-purple-400 border-purple-400/30',
  alert: 'bg-amber-400/10 text-amber-400 border-amber-400/30',
  done: 'bg-green-400/10 text-green-400 border-green-400/30',
  team: 'bg-blue-400/10 text-blue-400 border-blue-400/30',
};

const badgeLabels = {
  active: 'Active',
  alert: 'Alert',
  done: 'Done',
  team: 'Team',
};

export function PrimeWorkspacePanel() {
  const topCards = statusCards.filter(card => card.id === '1' || card.id === '2');
  const bottomCard = statusCards.find(card => card.id === '3');

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 h-full flex flex-col min-w-0 overflow-visible">
      {/* Header */}
      <div className="flex items-center gap-3 mb-3 flex-shrink-0">
        <span className="text-3xl">👑</span>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-bold text-white">PRIME WORKSPACE</h3>
          <p className="text-xs text-slate-500">Command Center Status</p>
        </div>
      </div>

      {/* Card 1 - Today's Highlights */}
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

      {/* Card 2 - Important Alerts */}
      <div className="mb-4 flex-shrink-0">
        <div className="group p-4 rounded-lg bg-slate-800 border border-slate-700 hover:bg-slate-800/90 hover:border-slate-600 transition-all duration-200 cursor-pointer">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between mb-2">
                <h4 className="text-sm font-semibold text-white">
                  {topCards.find(c => c.id === '2')?.title}
                </h4>
                <div className={`px-2 py-1 rounded text-xs font-medium border flex-shrink-0 ml-2 ${badgeStyles.alert}`}>
                  {badgeLabels.alert}
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

      {/* Card 3 - Active Employees (flex-1 to fill remaining height) */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="p-4 rounded-lg bg-slate-800 border border-slate-700 h-full flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between mb-3 flex-shrink-0">
            <div>
              <h3 className="text-sm font-semibold text-slate-100 tracking-wide">
                Active Employees
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                AI team status
              </p>
            </div>
            <span className="inline-flex items-center rounded-full bg-purple-500/10 px-2.5 py-1 text-[11px] font-medium text-purple-300 border border-purple-500/30">
              Live
            </span>
          </div>

          {/* Employee count */}
          <div className="flex items-center justify-center mb-3 flex-shrink-0">
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-400">{bottomCard?.value}</div>
              <div className="text-xs text-slate-400 mt-1">AI Employees Active</div>
            </div>
          </div>

          {/* Employee list */}
          <div className="flex-1 min-h-0 overflow-y-auto hide-scrollbar space-y-2 text-[11px] text-slate-200">
            <div className="rounded-lg bg-slate-900/70 px-3 py-2 border border-slate-700/50">
              👑 <span className="font-medium">Prime</span> — Routing tasks
            </div>
            <div className="rounded-lg bg-slate-900/70 px-3 py-2 border border-slate-700/50">
              📄 <span className="font-medium">Byte</span> — Processing documents
            </div>
            <div className="rounded-lg bg-slate-900/70 px-3 py-2 border border-slate-700/50">
              🏷️ <span className="font-medium">Tag</span> — Categorizing transactions
            </div>
            <div className="rounded-lg bg-slate-900/70 px-3 py-2 border border-slate-700/50">
              💼 <span className="font-medium">Finley</span> — Financial planning
            </div>
            <div className="rounded-lg bg-slate-900/70 px-3 py-2 border border-slate-700/50">
              🔮 <span className="font-medium">Crystal</span> — Analyzing trends
            </div>
            <div className="rounded-lg bg-slate-900/70 px-3 py-2 border border-slate-700/50">
              🥅 <span className="font-medium">Goalie</span> — Tracking goals
            </div>
            <div className="rounded-lg bg-slate-900/70 px-3 py-2 border border-slate-700/50">
              🕊️ <span className="font-medium">Liberty</span> — Debt planning
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


