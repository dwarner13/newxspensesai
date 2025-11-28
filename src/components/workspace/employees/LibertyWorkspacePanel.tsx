/**
 * LibertyWorkspacePanel Component
 * 
 * Left sidebar panel for Liberty workspace
 * Matches ByteWorkspacePanel structure
 */

import React from 'react';
import { CreditCard, Calendar, DollarSign, Target } from 'lucide-react';

interface StatusCard {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  badge: 'debt' | 'dates' | 'interest' | 'milestones';
  icon: React.ReactNode;
}

const statusCards: StatusCard[] = [
  {
    id: '1',
    title: 'Debt Balances',
    description: 'Total debt: $12,450',
    timestamp: 'Updated 2m ago',
    badge: 'debt',
    icon: <CreditCard className="w-4 h-4" />,
  },
  {
    id: '2',
    title: 'Payoff Dates',
    description: 'Estimated freedom: 18mo',
    timestamp: 'Just now',
    badge: 'dates',
    icon: <Calendar className="w-4 h-4" />,
  },
];

const badgeStyles = {
  debt: 'bg-rose-400/10 text-rose-400 border-rose-400/30',
  dates: 'bg-blue-400/10 text-blue-400 border-blue-400/30',
  interest: 'bg-green-400/10 text-green-400 border-green-400/30',
  milestones: 'bg-purple-400/10 text-purple-400 border-purple-400/30',
};

const badgeLabels = {
  debt: 'Debt',
  dates: 'Dates',
  interest: 'Interest',
  milestones: 'Milestones',
};

export function LibertyWorkspacePanel() {
  const topCards = statusCards;
  
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 mb-3 flex-shrink-0">
        <span className="text-3xl">🕊️</span>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-bold text-white">LIBERTY WORKSPACE</h3>
          <p className="text-xs text-slate-500">Financial freedom planning</p>
        </div>
      </div>
      
      {/* Card 1 - Debt Balances */}
      <div className="mb-4 flex-shrink-0">
        <div className="group p-4 rounded-lg bg-slate-800 border border-slate-700 hover:bg-slate-800/90 hover:border-slate-600 transition-all duration-200 cursor-pointer">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between mb-2">
                <h4 className="text-sm font-semibold text-white">
                  {topCards.find(c => c.id === '1')?.title}
                </h4>
                <div className={`px-2 py-1 rounded text-xs font-medium border flex-shrink-0 ml-2 ${badgeStyles.debt}`}>
                  {badgeLabels.debt}
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

      {/* Card 2 - Payoff Dates */}
      <div className="mb-4 flex-shrink-0">
        <div className="group p-4 rounded-lg bg-slate-800 border border-slate-700 hover:bg-slate-800/90 hover:border-slate-600 transition-all duration-200 cursor-pointer">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between mb-2">
                <h4 className="text-sm font-semibold text-white">
                  {topCards.find(c => c.id === '2')?.title}
                </h4>
                <div className={`px-2 py-1 rounded text-xs font-medium border flex-shrink-0 ml-2 ${badgeStyles.dates}`}>
                  {badgeLabels.dates}
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

      {/* Card 3 - Interest Saved & Freedom Milestones (flex-1 to fill remaining height) */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="p-4 rounded-lg bg-slate-800 border border-slate-700 h-full flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between mb-3 flex-shrink-0">
            <div>
              <h3 className="text-sm font-semibold text-slate-100 tracking-wide">
                Interest Saved
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Progress tracking
              </p>
            </div>
            <span className="inline-flex items-center rounded-full bg-rose-500/10 px-2.5 py-1 text-[11px] font-medium text-rose-300 border border-rose-500/30">
              Savings
            </span>
          </div>

          {/* Small metrics row */}
          <div className="grid grid-cols-2 gap-3 text-xs mb-3 flex-shrink-0">
            <div className="rounded-xl bg-slate-900/60 px-3 py-2 border border-slate-700/50">
              <p className="text-slate-400">Interest saved</p>
              <p className="mt-1 text-sm font-semibold text-slate-50">$1,247</p>
            </div>
            <div className="rounded-xl bg-slate-900/60 px-3 py-2 border border-slate-700/50">
              <p className="text-slate-400">To freedom</p>
              <p className="mt-1 text-sm font-semibold text-slate-50">18mo</p>
            </div>
          </div>

          {/* Short list */}
          <div className="flex-1 min-h-0 overflow-y-auto hide-scrollbar space-y-2 text-[11px] text-slate-200">
            <div className="rounded-lg bg-slate-900/70 px-3 py-2 border border-slate-700/50">
              💰 <span className="font-medium">$1,247 interest</span> saved with current plan
            </div>
            <div className="rounded-lg bg-slate-900/70 px-3 py-2 border border-slate-700/50">
              🎯 <span className="font-medium">Freedom milestones</span> — 3 achievements unlocked
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
