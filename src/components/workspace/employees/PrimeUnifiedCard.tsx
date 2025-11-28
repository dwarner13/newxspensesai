/**
 * PrimeUnifiedCard Component
 * 
 * Unified card for Prime (AI Command Center) workspace
 * Matches ByteUnifiedCard structure exactly
 */

import React, { useState, useCallback } from 'react';
import { Send, MessageSquare, Users, Zap } from 'lucide-react';
import { Button } from '../ui/button';
import { EmployeeChatWorkspace } from '../../chat/EmployeeChatWorkspace';

interface PrimeUnifiedCardProps {
  onExpandClick?: () => void;
  onChatInputClick?: () => void;
}

export function PrimeUnifiedCard({ onExpandClick, onChatInputClick }: PrimeUnifiedCardProps) {
  const [inputValue, setInputValue] = useState('');
  const [sendFunction, setSendFunction] = useState<((message: string) => Promise<void>) | null>(null);

  const handleSendFunctionReady = useCallback((fn: (message: string) => Promise<void>) => {
    setSendFunction(() => fn);
  }, []);

  const handleSend = async () => {
    if (inputValue.trim() && sendFunction) {
      await sendFunction(inputValue);
      setInputValue('');
    }
  };

  const hasText = inputValue.trim().length > 0;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col h-full">
      
      {/* Header Section with Gradient */}
      <div className="bg-gradient-to-br from-amber-900/40 to-slate-900/10 border-b border-slate-800 pb-6 flex-shrink-0 -mx-6 -mt-6 px-6 pt-6">
        
        {/* Avatar and Title */}
        <div className="flex items-start gap-4 mb-3">
          <div className="w-16 h-16 bg-amber-500 rounded-full flex items-center justify-center shadow-lg shadow-amber-500/50 flex-shrink-0">
            <span className="text-3xl">👑</span>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-white leading-tight">
              Prime — AI Command Center
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Your financial CEO · Routing tasks and coordinating your AI team
            </p>
          </div>
        </div>

        {/* Stats Row */}
        <div className="flex items-center gap-4 mb-3">
          <div className="flex-1 flex flex-col items-center text-center">
            <div className="text-2xl font-bold text-amber-400">8</div>
            <div className="text-xs text-slate-500">AI Agents</div>
          </div>
          <div className="flex-1 flex flex-col items-center text-center">
            <div className="text-2xl font-bold text-green-400">24</div>
            <div className="text-xs text-slate-500">Tasks Routed</div>
          </div>
          <div className="flex-1 flex flex-col items-center text-center">
            <div className="text-2xl font-bold text-blue-400">99%</div>
            <div className="text-xs text-slate-500">Success Rate</div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <Button 
            variant="secondary" 
            size="default"
            onClick={onExpandClick}
            className="flex-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-amber-500/30 text-white text-xs sm:text-sm"
          >
            <MessageSquare className="w-4 h-4 mr-1 sm:mr-2 flex-shrink-0" />
            <span className="truncate">Chat</span>
          </Button>
          <Button 
            variant="secondary" 
            size="default"
            onClick={onExpandClick}
            className="flex-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-amber-500/30 text-white text-xs sm:text-sm"
          >
            <Users className="w-4 h-4 mr-1 sm:mr-2 flex-shrink-0" />
            <span className="truncate">Team</span>
          </Button>
          <Button 
            variant="secondary" 
            size="default"
            onClick={onExpandClick}
            className="flex-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-amber-500/30 text-white text-xs sm:text-sm"
          >
            <Zap className="w-4 h-4 mr-1 sm:mr-2 flex-shrink-0" />
            <span className="truncate">Tasks</span>
          </Button>
        </div>
      </div>

      {/* Chat Workspace */}
      <div className="flex-1 min-h-0 overflow-hidden -mx-6">
        <EmployeeChatWorkspace
          employeeSlug="prime-boss"
          className="h-full px-6"
          showHeader={false}
          showComposer={false}
          onSendFunctionReady={handleSendFunctionReady}
        />
      </div>

      {/* Footer - Guardrails Badge */}
      <div className="pt-3 pb-0 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-300/80 border-t border-slate-800/50 flex-shrink-0 -mx-6 px-6">
        <div className="inline-flex items-center gap-2">
          <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-3 py-1 text-[11px] font-medium text-emerald-300 border border-emerald-500/20">
            🔒 Guardrails + PII Protection Active
          </span>
        </div>
        <div className="text-[11px] text-slate-400">
          Secure • Always Supporting
        </div>
      </div>

      {/* Chat Input */}
      <div className="flex-shrink-0 -mx-6 px-6">
        <div 
          className="flex items-center gap-3 bg-slate-800 rounded-xl px-3 py-2 border border-slate-700 focus-within:border-amber-500 transition-all duration-200 cursor-pointer"
          onClick={onChatInputClick}
        >
          <input
            type="text"
            placeholder="Ask Prime to coordinate your AI team..."
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
            className="w-10 h-10 bg-gradient-to-br from-amber-500 to-amber-600 rounded-full flex items-center justify-center shadow-lg shadow-amber-500/30 hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            disabled={!hasText || !sendFunction}
          >
            <Send className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}


