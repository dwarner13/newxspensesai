/**
 * BankAccountsWorkspacePanel Component
 * 
 * Left sidebar panel for Bank Accounts workspace
 * Matches ByteWorkspacePanel structure
 */

import React from 'react';
import { Building, RefreshCw, DollarSign, AlertCircle } from 'lucide-react';

interface StatusCard {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  badge: 'connected' | 'sync' | 'balance' | 'health';
  icon: React.ReactNode;
}

const statusCards: StatusCard[] = [
  {
    id: '1',
    title: 'Connected Accounts',
    description: '5 banks linked',
    timestamp: 'Updated 2m ago',
    badge: 'connected',
    icon: <Building className="w-4 h-4" />,
  },
  {
    id: '2',
    title: 'Sync Status',
    description: 'Last synced 2min ago',
    timestamp: 'Just now',
    badge: 'sync',
    icon: <RefreshCw className="w-4 h-4" />,
  },
];

const badgeStyles = {
  connected: 'bg-emerald-400/10 text-emerald-400 border-emerald-400/30',
  sync: 'bg-blue-400/10 text-blue-400 border-blue-400/30',
  balance: 'bg-green-400/10 text-green-400 border-green-400/30',
  health: 'bg-amber-400/10 text-amber-400 border-amber-400/30',
};

const badgeLabels = {
  connected: 'Connected',
  sync: 'Synced',
  balance: 'Balance',
  health: 'Health',
};

export function BankAccountsWorkspacePanel() {
  const topCards = statusCards;
  
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 mb-3 flex-shrink-0">
        <span className="text-3xl">🏦</span>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-bold text-white">BANK ACCOUNTS WORKSPACE</h3>
          <p className="text-xs text-slate-500">Account management</p>
        </div>
      </div>
      
      {/* Card 1 - Connected Accounts */}
      <div className="mb-4 flex-shrink-0">
        <div className="group p-4 rounded-lg bg-slate-800 border border-slate-700 hover:bg-slate-800/90 hover:border-slate-600 transition-all duration-200 cursor-pointer">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between mb-2">
                <h4 className="text-sm font-semibold text-white">
                  {topCards.find(c => c.id === '1')?.title}
                </h4>
                <div className={`px-2 py-1 rounded text-xs font-medium border flex-shrink-0 ml-2 ${badgeStyles.connected}`}>
                  {badgeLabels.connected}
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

      {/* Card 2 - Sync Status */}
      <div className="mb-4 flex-shrink-0">
        <div className="group p-4 rounded-lg bg-slate-800 border border-slate-700 hover:bg-slate-800/90 hover:border-slate-600 transition-all duration-200 cursor-pointer">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between mb-2">
                <h4 className="text-sm font-semibold text-white">
                  {topCards.find(c => c.id === '2')?.title}
                </h4>
                <div className={`px-2 py-1 rounded text-xs font-medium border flex-shrink-0 ml-2 ${badgeStyles.sync}`}>
                  {badgeLabels.sync}
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

      {/* Card 3 - Account Balances & Connection Health (flex-1 to fill remaining height) */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="p-4 rounded-lg bg-slate-800 border border-slate-700 h-full flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between mb-3 flex-shrink-0">
            <div>
              <h3 className="text-sm font-semibold text-slate-100 tracking-wide">
                Account Balances
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Quick summary
              </p>
            </div>
            <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-300 border border-emerald-500/30">
              Healthy
            </span>
          </div>

          {/* Small metrics row */}
          <div className="grid grid-cols-2 gap-3 text-xs mb-3 flex-shrink-0">
            <div className="rounded-xl bg-slate-900/60 px-3 py-2 border border-slate-700/50">
              <p className="text-slate-400">Total balance</p>
              <p className="mt-1 text-sm font-semibold text-slate-50">$24,580</p>
            </div>
            <div className="rounded-xl bg-slate-900/60 px-3 py-2 border border-slate-700/50">
              <p className="text-slate-400">Accounts</p>
              <p className="mt-1 text-sm font-semibold text-slate-50">5</p>
            </div>
          </div>

          {/* Short list */}
          <div className="flex-1 min-h-0 overflow-y-auto hide-scrollbar space-y-2 text-[11px] text-slate-200">
            <div className="rounded-lg bg-slate-900/70 px-3 py-2 border border-slate-700/50">
              ✅ <span className="font-medium">All accounts</span> connected and syncing
            </div>
            <div className="rounded-lg bg-slate-900/70 px-3 py-2 border border-slate-700/50">
              🔄 <span className="font-medium">Last sync</span> completed 2 minutes ago
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

