/**
 * CrystalWorkspacePanel Component
 * 
 * Left sidebar panel for Crystal workspace
 * Matches ByteWorkspacePanel structure
 */

import React from 'react';
import { TrendingUp, AlertTriangle, BarChart3, Target } from 'lucide-react';

interface StatusCard {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  badge: 'forecast' | 'alerts' | 'accuracy' | 'history';
  icon: React.ReactNode;
}

const statusCards: StatusCard[] = [
  {
    id: '1',
    title: 'Prediction Summary',
    description: 'Next month forecast ready',
    timestamp: 'Updated 2m ago',
    badge: 'forecast',
    icon: <TrendingUp className="w-4 h-4" />,
  },
  {
    id: '2',
    title: 'Anomaly Alerts',
    description: '3 unusual spending warnings',
    timestamp: 'Just now',
    badge: 'alerts',
    icon: <AlertTriangle className="w-4 h-4" />,
  },
];

const badgeStyles = {
  forecast: 'bg-fuchsia-400/10 text-fuchsia-400 border-fuchsia-400/30',
  alerts: 'bg-amber-400/10 text-amber-400 border-amber-400/30',
  accuracy: 'bg-cyan-400/10 text-cyan-400 border-cyan-400/30',
  history: 'bg-purple-400/10 text-purple-400 border-purple-400/30',
};

const badgeLabels = {
  forecast: 'Forecast',
  alerts: 'Alerts',
  accuracy: 'Accuracy',
  history: 'History',
};

export function CrystalWorkspacePanel() {
  const topCards = statusCards;
  
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 mb-3 flex-shrink-0">
        <span className="text-3xl">🔮</span>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-bold text-white">CRYSTAL WORKSPACE</h3>
          <p className="text-xs text-slate-500">Spending predictions</p>
        </div>
      </div>
      
      {/* Card 1 - Prediction Summary */}
      <div className="mb-4 flex-shrink-0">
        <div className="group p-4 rounded-lg bg-slate-800 border border-slate-700 hover:bg-slate-800/90 hover:border-slate-600 transition-all duration-200 cursor-pointer">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between mb-2">
                <h4 className="text-sm font-semibold text-white">
                  {topCards.find(c => c.id === '1')?.title}
                </h4>
                <div className={`px-2 py-1 rounded text-xs font-medium border flex-shrink-0 ml-2 ${badgeStyles.forecast}`}>
                  {badgeLabels.forecast}
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

      {/* Card 2 - Anomaly Alerts */}
      <div className="mb-4 flex-shrink-0">
        <div className="group p-4 rounded-lg bg-slate-800 border border-slate-700 hover:bg-slate-800/90 hover:border-slate-600 transition-all duration-200 cursor-pointer">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between mb-2">
                <h4 className="text-sm font-semibold text-white">
                  {topCards.find(c => c.id === '2')?.title}
                </h4>
                <div className={`px-2 py-1 rounded text-xs font-medium border flex-shrink-0 ml-2 ${badgeStyles.alerts}`}>
                  {badgeLabels.alerts}
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

      {/* Card 3 - Category Forecasts & Historical Accuracy (flex-1 to fill remaining height) */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="p-4 rounded-lg bg-slate-800 border border-slate-700 h-full flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between mb-3 flex-shrink-0">
            <div>
              <h3 className="text-sm font-semibold text-slate-100 tracking-wide">
                Category Forecasts
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Per-category predictions
              </p>
            </div>
            <span className="inline-flex items-center rounded-full bg-fuchsia-500/10 px-2.5 py-1 text-[11px] font-medium text-fuchsia-300 border border-fuchsia-500/30">
              Forecast
            </span>
          </div>

          {/* Small metrics row */}
          <div className="grid grid-cols-2 gap-3 text-xs mb-3 flex-shrink-0">
            <div className="rounded-xl bg-slate-900/60 px-3 py-2 border border-slate-700/50">
              <p className="text-slate-400">Accuracy</p>
              <p className="mt-1 text-sm font-semibold text-slate-50">94.2%</p>
            </div>
            <div className="rounded-xl bg-slate-900/60 px-3 py-2 border border-slate-700/50">
              <p className="text-slate-400">Alerts</p>
              <p className="mt-1 text-sm font-semibold text-slate-50">3</p>
            </div>
          </div>

          {/* Short list */}
          <div className="flex-1 min-h-0 overflow-y-auto hide-scrollbar space-y-2 text-[11px] text-slate-200">
            <div className="rounded-lg bg-slate-900/70 px-3 py-2 border border-slate-700/50">
              🔮 <span className="font-medium">Next month forecast</span> — $3,420 predicted spending
            </div>
            <div className="rounded-lg bg-slate-900/70 px-3 py-2 border border-slate-700/50">
              ⚠️ <span className="font-medium">3 anomaly alerts</span> detected in spending patterns
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
