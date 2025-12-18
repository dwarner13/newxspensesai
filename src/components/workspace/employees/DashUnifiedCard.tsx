/**
 * DashUnifiedCard Component
 */

import React, { useCallback } from 'react';
import { BarChart3, FileText, TrendingUp, MessageSquare } from 'lucide-react';
import { Button } from '../../ui/button';
import { useUnifiedChatLauncher } from '../../../hooks/useUnifiedChatLauncher';

interface DashUnifiedCardProps {
  onExpandClick?: () => void;
  onChatInputClick?: () => void;
}

export function DashUnifiedCard({ onExpandClick, onChatInputClick }: DashUnifiedCardProps) {
  const { openChat } = useUnifiedChatLauncher();

  // Handler to open unified chat with Dash
  const handleChatClick = useCallback(() => {
    openChat({
      initialEmployeeSlug: 'dash-analytics',
      context: {
        page: 'business-intelligence',
        data: {
          source: 'workspace-dash',
        },
      },
    });
    if (onChatInputClick) {
      onChatInputClick();
    }
  }, [openChat, onChatInputClick]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col h-full">
      <div className="bg-gradient-to-br from-blue-900/40 to-slate-900/10 border-b border-slate-800 pb-6 flex-shrink-0 -mx-6 -mt-6 px-6 pt-6">
        <div className="flex items-start gap-4 mb-3">
          <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center shadow-lg shadow-blue-500/50 flex-shrink-0">
            <span className="text-3xl">📈</span>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-white leading-tight">
              Dash — Analytics AI
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Analytics specialist · Advanced analytics, insights, and visualizations
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 mb-3">
          <div className="flex-1 flex flex-col items-center text-center">
            <div className="text-2xl font-bold text-blue-400">47</div>
            <div className="text-xs text-slate-500">Reports Generated</div>
          </div>
          <div className="flex-1 flex flex-col items-center text-center">
            <div className="text-2xl font-bold text-green-400">156</div>
            <div className="text-xs text-slate-500">Insights Found</div>
          </div>
          <div className="flex-1 flex flex-col items-center text-center">
            <div className="text-2xl font-bold text-purple-400">89</div>
            <div className="text-xs text-slate-500">Trends Identified</div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button 
            variant="secondary" 
            size="default"
            onClick={onExpandClick}
            className="flex-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-blue-500/30 text-white"
          >
            <BarChart3 className="w-4 h-4 mr-2 flex-shrink-0" />
            <span className="truncate">Dashboard</span>
          </Button>
          <Button 
            variant="secondary" 
            size="default"
            onClick={onExpandClick}
            className="flex-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-blue-500/30 text-white text-xs sm:text-sm"
          >
            <FileText className="w-4 h-4 mr-2 flex-shrink-0" />
            <span className="truncate">Report</span>
          </Button>
          <Button 
            variant="secondary" 
            size="default"
            onClick={onExpandClick}
            className="flex-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-blue-500/30 text-white text-xs sm:text-sm"
          >
            <TrendingUp className="w-4 h-4 mr-2 flex-shrink-0" />
            <span className="truncate">Compare</span>
          </Button>
        </div>
      </div>

      {/* Simplified middle section */}
      <div className="flex-1 min-h-0 overflow-y-auto -mx-6 px-6 py-4">
        <div className="flex flex-col items-center justify-center h-full text-center">
          <div className="w-24 h-24 bg-slate-800 rounded-full flex items-center justify-center text-5xl mb-4">
            📈
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Welcome to Dash</h3>
          <p className="text-slate-400 mb-4 max-w-md">
            I'm Dash, your analytics AI. Click the button below to chat with me and explore your business intelligence.
          </p>
          <Button
            onClick={handleChatClick}
            className="bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 text-white hover:from-blue-300 hover:via-indigo-300 hover:to-purple-300"
          >
            <MessageSquare className="w-4 h-4 mr-2" />
            Chat with Dash
          </Button>
        </div>
      </div>

      <div className="pt-3 pb-0 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-300/80 border-t border-slate-800/50 flex-shrink-0 -mx-6 px-6">
        <div className="inline-flex items-center gap-2">
          <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-3 py-1 text-[11px] font-medium text-emerald-300 border border-emerald-500/20">
            🔒 Guardrails + PII Protection Active
          </span>
        </div>
        <div className="text-[11px] text-slate-400">
          Secure • Always Analyzing
        </div>
      </div>
    </div>
  );
}




