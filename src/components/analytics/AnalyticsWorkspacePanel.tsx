/**
 * AnalyticsWorkspacePanel Component
 * 
 * Left sidebar panel for Analytics workspace
 * Matches ByteWorkspacePanel structure
 */

import React from 'react';
import { BarChart3, FileText, Bookmark, Download } from 'lucide-react';

interface StatusCard {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  badge: 'overview' | 'reports' | 'charts' | 'exports';
  icon: React.ReactNode;
}

const statusCards: StatusCard[] = [
  {
    id: '1',
    title: 'Analytics Overview',
    description: '2,456 data points analyzed',
    timestamp: 'Updated 2m ago',
    badge: 'overview',
    icon: <BarChart3 className="w-4 h-4" />,
  },
  {
    id: '2',
    title: 'Recent Reports',
    description: '34 reports this month',
    timestamp: 'Just now',
    badge: 'reports',
    icon: <FileText className="w-4 h-4" />,
  },
];

const badgeStyles = {
  overview: 'bg-cyan-400/10 text-cyan-400 border-cyan-400/30',
  reports: 'bg-blue-400/10 text-blue-400 border-blue-400/30',
  charts: 'bg-purple-400/10 text-purple-400 border-purple-400/30',
  exports: 'bg-green-400/10 text-green-400 border-green-400/30',
};

const badgeLabels = {
  overview: 'Overview',
  reports: 'Reports',
  charts: 'Charts',
  exports: 'Exports',
};

export function AnalyticsWorkspacePanel() {
  const topCards = statusCards;
  
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 mb-3 flex-shrink-0">
        <span className="text-3xl">📈</span>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-white truncate">ANALYTICS WORKSPACE</h3>
          <p className="text-xs text-slate-500">Data insights</p>
        </div>
      </div>
      
      {/* Card 1 - Analytics Overview */}
      <div className="mb-4 flex-shrink-0">
        <div className="group p-4 rounded-lg bg-slate-800 border border-slate-700 hover:bg-slate-800/90 hover:border-slate-600 transition-all duration-200 cursor-pointer">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between mb-2">
                <h4 className="text-sm font-semibold text-white">
                  {topCards.find(c => c.id === '1')?.title}
                </h4>
                <div className={`px-2 py-1 rounded text-xs font-medium border flex-shrink-0 ml-2 ${badgeStyles.overview}`}>
                  {badgeLabels.overview}
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

      {/* Card 2 - Recent Reports */}
      <div className="mb-4 flex-shrink-0">
        <div className="group p-4 rounded-lg bg-slate-800 border border-slate-700 hover:bg-slate-800/90 hover:border-slate-600 transition-all duration-200 cursor-pointer">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between mb-2">
                <h4 className="text-sm font-semibold text-white">
                  {topCards.find(c => c.id === '2')?.title}
                </h4>
                <div className={`px-2 py-1 rounded text-xs font-medium border flex-shrink-0 ml-2 ${badgeStyles.reports}`}>
                  {badgeLabels.reports}
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

      {/* Card 3 - Saved Charts & Export History (flex-1 to fill remaining height) */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="p-4 rounded-lg bg-slate-800 border border-slate-700 h-full flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between mb-3 flex-shrink-0">
            <div>
              <h3 className="text-sm font-semibold text-slate-100 tracking-wide">
                Saved Charts
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Bookmarked visualizations
              </p>
            </div>
            <span className="inline-flex items-center rounded-full bg-cyan-500/10 px-2.5 py-1 text-[11px] font-medium text-cyan-300 border border-cyan-500/30">
              Active
            </span>
          </div>

          {/* Small metrics row */}
          <div className="grid grid-cols-2 gap-3 text-xs mb-3 flex-shrink-0">
            <div className="rounded-xl bg-slate-900/60 px-3 py-2 border border-slate-700/50">
              <p className="text-slate-400">Charts</p>
              <p className="mt-1 text-sm font-semibold text-slate-50">12</p>
            </div>
            <div className="rounded-xl bg-slate-900/60 px-3 py-2 border border-slate-700/50">
              <p className="text-slate-400">Exports</p>
              <p className="mt-1 text-sm font-semibold text-slate-50">8</p>
            </div>
          </div>

          {/* Short list */}
          <div className="flex-1 min-h-0 overflow-y-auto hide-scrollbar space-y-2 text-[11px] text-slate-200">
            <div className="rounded-lg bg-slate-900/70 px-3 py-2 border border-slate-700/50">
              📊 <span className="font-medium">2,456 data points</span> analyzed across 34 reports
            </div>
            <div className="rounded-lg bg-slate-900/70 px-3 py-2 border border-slate-700/50">
              📈 <span className="font-medium">12 charts</span> created and saved
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}










