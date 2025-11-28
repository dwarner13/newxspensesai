/**
 * DashUnifiedCard Component
 */

import React, { useState, useCallback } from 'react';
import { BarChart3, FileText, TrendingUp, Send } from 'lucide-react';
import { EmployeeChatWorkspace } from '../../chat/EmployeeChatWorkspace';
import { Button } from '../../ui/button';

interface DashUnifiedCardProps {
  onExpandClick?: () => void;
  onChatInputClick?: () => void;
}

export function DashUnifiedCard({ onExpandClick, onChatInputClick }: DashUnifiedCardProps) {
  const [inputValue, setInputValue] = useState('');
  const [sendFunction, setSendFunction] = useState<((message: string) => Promise<void>) | null>(null);

  const hasText = inputValue.trim().length > 0;

  // Stabilize the callback to prevent infinite re-renders
  const handleSendFunctionReady = useCallback((fn: (message: string) => Promise<void>) => {
    setSendFunction(() => fn);
  }, []);

  const handleSend = useCallback(async () => {
    if (!inputValue.trim() || !sendFunction) return;
    await sendFunction(inputValue.trim());
    setInputValue('');
  }, [inputValue, sendFunction]);

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

      <div className="flex-1 min-h-0 overflow-hidden -mx-6">
        <EmployeeChatWorkspace
          employeeSlug="dash"
          className="h-full px-6"
          showHeader={false}
          showComposer={false}
          onSendFunctionReady={handleSendFunctionReady}
        />
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

      <div className="flex-shrink-0 -mx-6 px-6">
        <div 
          className="flex items-center gap-3 bg-slate-800 rounded-xl px-3 py-2 border border-slate-700 focus-within:border-blue-500 transition-all duration-200 cursor-pointer"
          onClick={onChatInputClick}
        >
          <input
            type="text"
            placeholder="Ask Dash about analytics…"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && hasText) {
                e.preventDefault();
                handleSend();
              }
            }}
            className="flex-1 bg-transparent text-white text-sm placeholder:text-slate-500 outline-none cursor-pointer"
            readOnly={!!onChatInputClick}
          />
          <button
            onClick={handleSend}
            className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-lg shadow-blue-500/30 hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            disabled={!hasText || !sendFunction}
          >
            <Send className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}




