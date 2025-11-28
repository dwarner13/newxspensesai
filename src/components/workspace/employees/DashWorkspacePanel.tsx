/**
 * DashWorkspacePanel Component
 */

import React from 'react';
import { BarChart3, FileText, TrendingUp, Eye } from 'lucide-react';

interface StatusCard {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  badge: 'dashboard' | 'metrics' | 'reports';
  icon: React.ReactNode;
  value?: string;
}

const statusCards: StatusCard[] = [
  {
    id: '1',
    title: 'Favorite Dashboards',
    description: '3 dashboards saved',
    timestamp: 'Last viewed 1h ago',
    badge: 'dashboard',
    icon: <BarChart3 className="w-4 h-4" />,
    value: '3',
  },
  {
    id: '2',
    title: 'Key Metrics Today',
    description: '12 metrics tracked',
    timestamp: 'Live updates',
    badge: 'metrics',
    icon: <TrendingUp className="w-4 h-4" />,
    value: '12',
  },
];

const badgeStyles = {
  dashboard: 'bg-blue-400/10 text-blue-400 border-blue-400/30',
  metrics: 'bg-purple-400/10 text-purple-400 border-purple-400/30',
  reports: 'bg-indigo-400/10 text-indigo-400 border-indigo-400/30',
};

const badgeLabels = {
  dashboard: 'Dashboard',
  metrics: 'Metrics',
  reports: 'Reports',
};

export function DashWorkspacePanel() {
  const topCards = statusCards;
  
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 h-full flex flex-col">
      <div className="flex items-center gap-3 mb-3 flex-shrink-0">
        <span className="text-3xl">📈</span>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-bold text-white">DASH WORKSPACE</h3>
          <p className="text-xs text-slate-500">Analytics & dashboards</p>
        </div>
      </div>

      {topCards.map((card) => (
        <div key={card.id} className="mb-4 flex-shrink-0">
          <div className="group p-4 rounded-lg bg-slate-800 border border-slate-700 hover:bg-slate-800/90 hover:border-slate-600 transition-all duration-200 cursor-pointer">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between mb-2">
                  <h4 className="text-sm font-semibold text-white">{card.title}</h4>
                  <div className={`px-2 py-1 rounded text-xs font-medium border flex-shrink-0 ml-2 ${badgeStyles[card.badge]}`}>
                    {badgeLabels[card.badge]}
                  </div>
                </div>
                <p className="text-xs text-slate-400 mt-2">{card.description}</p>
                <p className="text-xs text-slate-500 mt-1">{card.timestamp}</p>
              </div>
            </div>
          </div>
        </div>
      ))}

      <div className="flex-1 flex flex-col min-h-0">
        <div className="p-4 rounded-lg bg-slate-800 border border-slate-700 h-full flex flex-col">
          <div className="flex items-center justify-between mb-3 flex-shrink-0">
            <div>
              <h3 className="text-sm font-semibold text-slate-100 tracking-wide">
                Reports Queue
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Pending generation
              </p>
            </div>
            <span className="inline-flex items-center rounded-full bg-blue-500/10 px-2.5 py-1 text-[11px] font-medium text-blue-300 border border-blue-500/30">
              Active
            </span>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto hide-scrollbar space-y-2 text-[11px] text-slate-200">
            <div className="rounded-lg bg-slate-900/70 px-3 py-2 border border-slate-700/50">
              📊 <span className="font-medium">Monthly Summary</span> — Ready to generate
            </div>
            <div className="rounded-lg bg-slate-900/70 px-3 py-2 border border-slate-700/50">
              📈 <span className="font-medium">Spending Trends</span> — Processing
            </div>
            <div className="rounded-lg bg-slate-900/70 px-3 py-2 border border-slate-700/50">
              📋 <span className="font-medium">Category Analysis</span> — Queued
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}




