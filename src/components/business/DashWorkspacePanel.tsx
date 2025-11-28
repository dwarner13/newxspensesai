/**
 * DashWorkspacePanel Component
 * 
 * Left sidebar panel for Business Intelligence workspace
 * Matches ByteWorkspacePanel structure
 */

import React from 'react';
import { BarChart3, FileText, TrendingUp, Database } from 'lucide-react';

interface StatusCard {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  badge: 'overview' | 'reports' | 'kpis' | 'sources';
  icon: React.ReactNode;
}

const statusCards: StatusCard[] = [
  {
    id: '1',
    title: 'Dashboard Overview',
    description: '$124K revenue this month',
    timestamp: 'Updated 2m ago',
    badge: 'overview',
    icon: <BarChart3 className="w-4 h-4" />,
  },
  {
    id: '2',
    title: 'Recent Reports',
    description: '48 reports generated',
    timestamp: 'Just now',
    badge: 'reports',
    icon: <FileText className="w-4 h-4" />,
  },
];

const badgeStyles = {
  overview: 'bg-indigo-400/10 text-indigo-400 border-indigo-400/30',
  reports: 'bg-purple-400/10 text-purple-400 border-purple-400/30',
  kpis: 'bg-blue-400/10 text-blue-400 border-blue-400/30',
  sources: 'bg-green-400/10 text-green-400 border-green-400/30',
};

const badgeLabels = {
  overview: 'Overview',
  reports: 'Reports',
  kpis: 'KPIs',
  sources: 'Sources',
};

export function DashWorkspacePanel() {
  const topCards = statusCards;
  
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 mb-3 flex-shrink-0">
        <span className="text-3xl">🧠</span>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-bold text-white">DASH WORKSPACE</h3>
          <p className="text-xs text-slate-500">Business intelligence</p>
        </div>
      </div>
      
      {/* Card 1 - Dashboard Overview */}
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
                Profit margin: 23.5%
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

      {/* Card 3 - KPI Tracking & Data Sources (flex-1 to fill remaining height) */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="p-4 rounded-lg bg-slate-800 border border-slate-700 h-full flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between mb-3 flex-shrink-0">
            <div>
              <h3 className="text-sm font-semibold text-slate-100 tracking-wide">
                KPI Tracking
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Key performance indicators
              </p>
            </div>
            <span className="inline-flex items-center rounded-full bg-indigo-500/10 px-2.5 py-1 text-[11px] font-medium text-indigo-300 border border-indigo-500/30">
              Active
            </span>
          </div>

          {/* Small metrics row */}
          <div className="grid grid-cols-2 gap-3 text-xs mb-3 flex-shrink-0">
            <div className="rounded-xl bg-slate-900/60 px-3 py-2 border border-slate-700/50">
              <p className="text-slate-400">KPIs</p>
              <p className="mt-1 text-sm font-semibold text-slate-50">12</p>
            </div>
            <div className="rounded-xl bg-slate-900/60 px-3 py-2 border border-slate-700/50">
              <p className="text-slate-400">Insights</p>
              <p className="mt-1 text-sm font-semibold text-slate-50">156</p>
            </div>
          </div>

          {/* Short list */}
          <div className="flex-1 min-h-0 overflow-y-auto hide-scrollbar space-y-2 text-[11px] text-slate-200">
            <div className="rounded-lg bg-slate-900/70 px-3 py-2 border border-slate-700/50">
              📊 <span className="font-medium">48 reports</span> generated with 156 insights found
            </div>
            <div className="rounded-lg bg-slate-900/70 px-3 py-2 border border-slate-700/50">
              📈 <span className="font-medium">12 KPIs</span> tracked with positive trends
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

