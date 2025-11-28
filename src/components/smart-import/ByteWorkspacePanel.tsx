/**
 * ByteWorkspacePanel Component
 * 
 * Left sidebar panel for Byte workspace showing 6 workspace items with badges
 * Updated styling: gray-900 bg, gray-800 border, rounded-xl, padding 24px
 */

import React from 'react';
import { FileText, Clock, CheckCircle, BarChart3, Loader2, TrendingUp } from 'lucide-react';

interface StatusCard {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  badge: 'active' | 'queue' | 'done' | 'summary' | 'processing' | 'stats';
  icon: React.ReactNode;
  progress?: number; // For processing queue
  trend?: string; // For monthly stats
}

const statusCards: StatusCard[] = [
  {
    id: '1',
    title: 'Recent uploads',
    description: '5 documents processed',
    timestamp: '2m ago',
    badge: 'active',
    icon: <FileText className="w-4 h-4" />,
  },
  {
    id: '2',
    title: 'Pending documents',
    description: '2 files in queue',
    timestamp: '5m ago',
    badge: 'queue',
    icon: <Clock className="w-4 h-4" />,
  },
  {
    id: '3',
    title: 'Last processed file',
    description: 'receipt_2024_01.pdf',
    timestamp: '12m ago',
    badge: 'done',
    icon: <CheckCircle className="w-4 h-4" />,
  },
  {
    id: '4',
    title: 'Extraction summary',
    description: '24 transactions found',
    timestamp: '1h ago',
    badge: 'summary',
    icon: <BarChart3 className="w-4 h-4" />,
  },
  {
    id: '5',
    title: 'Processing Queue Status',
    description: '3 items in progress',
    timestamp: 'Just now',
    badge: 'processing',
    icon: <Loader2 className="w-4 h-4" />,
    progress: 60,
  },
  {
    id: '6',
    title: 'Monthly Statistics',
    description: '247 documents this month',
    timestamp: 'Updated daily',
    badge: 'stats',
    icon: <TrendingUp className="w-4 h-4" />,
    trend: '+15% vs last month',
  },
];

const badgeStyles = {
  active: 'bg-blue-400/10 text-blue-400 border-blue-400/30',
  queue: 'bg-yellow-400/10 text-yellow-400 border-yellow-400/30',
  done: 'bg-green-400/10 text-green-400 border-green-400/30',
  summary: 'bg-purple-400/10 text-purple-400 border-purple-400/30',
  processing: 'bg-orange-400/10 text-orange-400 border-orange-400/30',
  stats: 'bg-green-400/10 text-green-400 border-green-400/30',
};

const badgeLabels = {
  active: 'Active',
  queue: 'Queue',
  done: '✓ Done',
  summary: 'Summary',
  processing: 'Processing',
  stats: 'Stats',
};

export function ByteWorkspacePanel() {
  // Separate top cards from the new bottom card
  const topCards = statusCards.filter(card => card.id === '5' || card.id === '6'); // Processing Queue Status and Monthly Statistics
  
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 mb-3 flex-shrink-0">
        <span className="text-3xl">📄</span>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-bold text-white">BYTE WORKSPACE</h3>
          <p className="text-xs text-slate-500">Document processing status</p>
        </div>
      </div>
      
      {/* Card 1 - Processing Queue Status */}
      <div className="mb-4 flex-shrink-0">
        <div className="group p-4 rounded-lg bg-slate-800 border border-slate-700 hover:bg-slate-800/90 hover:border-slate-600 transition-all duration-200 cursor-pointer">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between mb-2">
                <h4 className="text-sm font-semibold text-white">
                  {topCards.find(c => c.id === '5')?.title}
                </h4>
                <div className={`px-2 py-1 rounded text-xs font-medium border flex-shrink-0 ml-2 ${badgeStyles.processing}`}>
                  {badgeLabels.processing}
                </div>
              </div>
              <p className="text-xs text-slate-400 mt-2">
                {topCards.find(c => c.id === '5')?.description}
              </p>
              <div className="w-full bg-slate-700 rounded-full h-1 mt-2 mb-1">
                <div 
                  className="bg-blue-500 h-1 rounded-full transition-all"
                  style={{ width: `${topCards.find(c => c.id === '5')?.progress || 0}%` }}
                />
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {topCards.find(c => c.id === '5')?.timestamp}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Card 2 - Monthly Statistics */}
      <div className="mb-4 flex-shrink-0">
        <div className="group p-4 rounded-lg bg-slate-800 border border-slate-700 hover:bg-slate-800/90 hover:border-slate-600 transition-all duration-200 cursor-pointer">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between mb-2">
                <h4 className="text-sm font-semibold text-white">
                  {topCards.find(c => c.id === '6')?.title}
                </h4>
                <div className={`px-2 py-1 rounded text-xs font-medium border flex-shrink-0 ml-2 ${badgeStyles.stats}`}>
                  {badgeLabels.stats}
                </div>
              </div>
              <p className="text-xs text-slate-400 mt-2">
                {topCards.find(c => c.id === '6')?.description}
              </p>
              <p className="text-xs text-green-400 flex items-center gap-1 mt-2">
                <span>📈</span>
                {topCards.find(c => c.id === '6')?.trend}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {topCards.find(c => c.id === '6')?.timestamp}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Card 3 - Import Health & Alerts (flex-1 to fill remaining height and align with other columns) */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="p-4 rounded-lg bg-slate-800 border border-slate-700 h-full flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between mb-3 flex-shrink-0">
            <div>
              <h3 className="text-sm font-semibold text-slate-100 tracking-wide">
                Import Health & Alerts
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Data quality snapshot
              </p>
            </div>
            <span className="inline-flex items-center rounded-full bg-sky-500/10 px-2.5 py-1 text-[11px] font-medium text-sky-300 border border-sky-500/30">
              Insights
            </span>
          </div>

          {/* Small metrics row */}
          <div className="grid grid-cols-3 gap-3 text-xs mb-3 flex-shrink-0">
            <div className="rounded-xl bg-slate-900/60 px-3 py-2 border border-slate-700/50">
              <p className="text-slate-400">Error rate</p>
              <p className="mt-1 text-sm font-semibold text-slate-50">0.8%</p>
            </div>
            <div className="rounded-xl bg-slate-900/60 px-3 py-2 border border-slate-700/50">
              <p className="text-slate-400">Failed docs</p>
              <p className="mt-1 text-sm font-semibold text-slate-50">5</p>
            </div>
            <div className="rounded-xl bg-slate-900/60 px-3 py-2 border border-slate-700/50">
              <p className="text-slate-400">Manual reviews</p>
              <p className="mt-1 text-sm font-semibold text-slate-50">3</p>
            </div>
          </div>

          {/* Short alerts list */}
          <div className="flex-1 min-h-0 overflow-y-auto hide-scrollbar space-y-2 text-[11px] text-slate-200">
            <div className="rounded-lg bg-slate-900/70 px-3 py-2 border border-slate-700/50">
              🔍 <span className="font-medium">3 bank statements</span> failed OCR.
              Click to re-run with enhanced parsing.
            </div>
            <div className="rounded-lg bg-slate-900/70 px-3 py-2 border border-slate-700/50">
              📄 <span className="font-medium">2 receipts</span> missing totals.
              Byte recommends manual confirmation.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
