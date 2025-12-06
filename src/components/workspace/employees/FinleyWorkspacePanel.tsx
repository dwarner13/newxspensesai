/**
 * FinleyWorkspacePanel Component
 * 
 * Left sidebar panel for Finley workspace showing workspace items
 * Updated to match ByteWorkspacePanel structure
 */

import React from 'react';
import { MessageSquare, History, Lightbulb, TrendingUp } from 'lucide-react';

interface StatusCard {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  badge: 'recent' | 'quick' | 'advice';
  icon: React.ReactNode;
}

const statusCards: StatusCard[] = [
  {
    id: '1',
    title: 'Recent Conversations',
    description: '5 conversations this week',
    timestamp: 'Updated 2m ago',
    badge: 'recent',
    icon: <MessageSquare className="w-4 h-4" />,
  },
  {
    id: '2',
    title: 'Quick Questions',
    description: 'Common questions answered',
    timestamp: 'Just now',
    badge: 'quick',
    icon: <Lightbulb className="w-4 h-4" />,
  },
];

const badgeStyles = {
  recent: 'bg-blue-400/10 text-blue-400 border-blue-400/30',
  quick: 'bg-green-400/10 text-green-400 border-green-400/30',
  advice: 'bg-purple-400/10 text-purple-400 border-purple-400/30',
};

const badgeLabels = {
  recent: 'Recent',
  quick: 'Quick',
  advice: 'Advice',
};

export function FinleyWorkspacePanel() {
  const topCards = statusCards;
  
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-blue-600/20 rounded-lg flex items-center justify-center">
          <span className="text-2xl">💼</span>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">FINLEY WORKSPACE</h3>
          <p className="text-sm text-slate-400">Financial advice & planning</p>
        </div>
      </div>
      
      {/* Card 1 - Recent Conversations */}
      <div className="mb-4 flex-shrink-0">
        <div className="group p-4 rounded-lg bg-slate-800 border border-slate-700 hover:bg-slate-800/90 hover:border-slate-600 transition-all duration-200 cursor-pointer">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between mb-2">
                <h4 className="text-sm font-semibold text-white">
                  {topCards.find(c => c.id === '1')?.title}
                </h4>
                <div className={`px-2 py-1 rounded text-xs font-medium border flex-shrink-0 ml-2 ${badgeStyles.recent}`}>
                  {badgeLabels.recent}
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

      {/* Card 2 - Quick Questions */}
      <div className="mb-4 flex-shrink-0">
        <div className="group p-4 rounded-lg bg-slate-800 border border-slate-700 hover:bg-slate-800/90 hover:border-slate-600 transition-all duration-200 cursor-pointer">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between mb-2">
                <h4 className="text-sm font-semibold text-white">
                  {topCards.find(c => c.id === '2')?.title}
                </h4>
                <div className={`px-2 py-1 rounded text-xs font-medium border flex-shrink-0 ml-2 ${badgeStyles.quick}`}>
                  {badgeLabels.quick}
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

      {/* Card 3 - Advice Topics (flex-1 to fill remaining height) */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="p-4 rounded-lg bg-slate-800 border border-slate-700 h-full flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between mb-3 flex-shrink-0">
            <div>
              <h3 className="text-sm font-semibold text-slate-100 tracking-wide">
                Advice Topics
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Popular categories
              </p>
            </div>
            <span className="inline-flex items-center rounded-full bg-orange-500/10 px-2.5 py-1 text-[11px] font-medium text-orange-300 border border-orange-500/30">
              Topics
            </span>
          </div>

          {/* Small metrics row */}
          <div className="grid grid-cols-2 gap-3 text-xs mb-3 flex-shrink-0">
            <div className="rounded-xl bg-slate-900/60 px-3 py-2 border border-slate-700/50">
              <p className="text-slate-400">Budgeting</p>
              <p className="mt-1 text-sm font-semibold text-slate-50">45</p>
            </div>
            <div className="rounded-xl bg-slate-900/60 px-3 py-2 border border-slate-700/50">
              <p className="text-slate-400">Saving</p>
              <p className="mt-1 text-sm font-semibold text-slate-50">32</p>
            </div>
          </div>

          {/* Short topics list */}
          <div className="flex-1 min-h-0 overflow-y-auto hide-scrollbar space-y-2 text-[11px] text-slate-200">
            <div className="rounded-lg bg-slate-900/70 px-3 py-2 border border-slate-700/50">
              💰 <span className="font-medium">Budgeting</span> — 45 questions answered
            </div>
            <div className="rounded-lg bg-slate-900/70 px-3 py-2 border border-slate-700/50">
              📈 <span className="font-medium">Investing</span> — 28 questions answered
            </div>
            <div className="rounded-lg bg-slate-900/70 px-3 py-2 border border-slate-700/50">
              🎯 <span className="font-medium">Saving</span> — 32 questions answered
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
