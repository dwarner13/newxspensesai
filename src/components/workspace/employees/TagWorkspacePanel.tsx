/**
 * TagWorkspacePanel Component
 * 
 * Left sidebar panel for Tag workspace showing category status
 * Updated to match ByteWorkspacePanel structure
 */

import React from 'react';
import { Tag, CheckCircle, TrendingUp, Sparkles } from 'lucide-react';

interface StatusCard {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  badge: 'overview' | 'recent' | 'uncategorized';
  icon: React.ReactNode;
}

const statusCards: StatusCard[] = [
  {
    id: '1',
    title: 'Category Overview',
    description: '45 active categories',
    timestamp: 'Updated 2m ago',
    badge: 'overview',
    icon: <Tag className="w-4 h-4" />,
  },
  {
    id: '2',
    title: 'Recent Auto-Tags',
    description: '24 items tagged today',
    timestamp: 'Last hour',
    badge: 'recent',
    icon: <CheckCircle className="w-4 h-4" />,
  },
];

const badgeStyles = {
  overview: 'bg-teal-400/10 text-teal-400 border-teal-400/30',
  recent: 'bg-green-400/10 text-green-400 border-green-400/30',
  uncategorized: 'bg-amber-400/10 text-amber-400 border-amber-400/30',
};

const badgeLabels = {
  overview: 'Overview',
  recent: 'Recent',
  uncategorized: 'Review',
};

export function TagWorkspacePanel() {
  const topCards = statusCards;
  
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-teal-600/20 rounded-lg flex items-center justify-center">
          <Tag className="w-5 h-5 text-teal-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">TAG WORKSPACE</h3>
          <p className="text-sm text-slate-400">Category management</p>
        </div>
      </div>

      {/* Card 1 - Category Overview */}
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

      {/* Card 2 - Recent Auto-Tags */}
      <div className="mb-4 flex-shrink-0">
        <div className="group p-4 rounded-lg bg-slate-800 border border-slate-700 hover:bg-slate-800/90 hover:border-slate-600 transition-all duration-200 cursor-pointer">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between mb-2">
                <h4 className="text-sm font-semibold text-white">
                  {topCards.find(c => c.id === '2')?.title}
                </h4>
                <div className={`px-2 py-1 rounded text-xs font-medium border flex-shrink-0 ml-2 ${badgeStyles.recent}`}>
                  {badgeLabels.recent}
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

      {/* Card 3 - Uncategorized Items & Category Rules (flex-1 to fill remaining height) */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="p-4 rounded-lg bg-slate-800 border border-slate-700 h-full flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between mb-3 flex-shrink-0">
            <div>
              <h3 className="text-sm font-semibold text-slate-100 tracking-wide">
                Uncategorized Items
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Needs review
              </p>
            </div>
            <span className="inline-flex items-center rounded-full bg-teal-500/10 px-2.5 py-1 text-[11px] font-medium text-teal-300 border border-teal-500/30">
              Review
            </span>
          </div>

          {/* Small metrics row */}
          <div className="grid grid-cols-2 gap-3 text-xs mb-3 flex-shrink-0">
            <div className="rounded-xl bg-slate-900/60 px-3 py-2 border border-slate-700/50">
              <p className="text-slate-400">Uncategorized</p>
              <p className="mt-1 text-sm font-semibold text-slate-50">12</p>
            </div>
            <div className="rounded-xl bg-slate-900/60 px-3 py-2 border border-slate-700/50">
              <p className="text-slate-400">Active rules</p>
              <p className="mt-1 text-sm font-semibold text-slate-50">8</p>
            </div>
          </div>

          {/* Short alerts list */}
          <div className="flex-1 min-h-0 overflow-y-auto hide-scrollbar space-y-2 text-[11px] text-slate-200">
            <div className="rounded-lg bg-slate-900/70 px-3 py-2 border border-slate-700/50">
              🏷️ <span className="font-medium">12 transactions</span> need categorization. Click to review.
            </div>
            <div className="rounded-lg bg-slate-900/70 px-3 py-2 border border-slate-700/50">
              ✨ <span className="font-medium">8 category rules</span> are active and learning.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
