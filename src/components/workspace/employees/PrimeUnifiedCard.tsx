/**
 * PrimeUnifiedCard Component
 * 
 * Unified card for Prime (AI Command Center) workspace
 * Matches ByteUnifiedCard structure exactly
 */

import React, { useState, useRef, useCallback } from 'react';
import { Send, MessageSquare, Users, Zap } from 'lucide-react';
import { PrimeTeamPanel } from '../../prime/PrimeTeamPanel';
import { PrimeTasksPanel } from '../../prime/PrimeTasksPanel';
import { usePrimeLiveStats } from '../../../hooks/usePrimeLiveStats';
import { useChatHistory } from '../../../hooks/useChatHistory';
import { PrimeLogoBadge } from '../../branding/PrimeLogoBadge';

interface PrimeUnifiedCardProps {
  onExpandClick?: () => void;
  onChatInputClick?: () => void;
  primePanel?: 'none' | 'team' | 'tasks'; // Panel state from parent
  onPrimePanelChange?: (panel: 'none' | 'team' | 'tasks') => void; // Callback to update parent state
}

export function PrimeUnifiedCard({ 
  onExpandClick, 
  onChatInputClick,
  primePanel: externalPrimePanel,
  onPrimePanelChange,
}: PrimeUnifiedCardProps) {
  const [inputValue, setInputValue] = useState('');
  
  // Panel state - use external if provided, otherwise manage internally
  const [internalPrimePanel, setInternalPrimePanel] = useState<'none' | 'team' | 'tasks'>('none');
  const primePanel = externalPrimePanel !== undefined ? externalPrimePanel : internalPrimePanel;
  
  const setPrimePanel = (panel: 'none' | 'team' | 'tasks') => {
    if (onPrimePanelChange) {
      onPrimePanelChange(panel);
    } else {
      setInternalPrimePanel(panel);
    }
  };
  
  // Load live stats for Prime Command Center
  const { data: liveStats, isLoading: statsLoading } = usePrimeLiveStats();
  
  // Load chat history for Prime
  const { messages: historyMessages, isLoading: historyLoading } = useChatHistory({
    employeeSlug: 'prime-boss',
    limit: 50,
    autoLoad: true,
  });
  
  // IMPORTANT: Use ref to store send function - avoids state updates that cause re-renders
  // This breaks the infinite loop because ref updates don't trigger re-renders
  const sendFunctionRef = useRef<((message: string) => Promise<void>) | null>(null);
  
  // Guardrails state from EmployeeChatWorkspace (updated via callback)
  // Default to true (active) - guardrails are always enabled by default
  const [guardrailsActive, setGuardrailsActive] = useState<boolean | null>(true);
  const [piiProtectionActive, setPiiProtectionActive] = useState<boolean | null>(true);
  
  // Panel event handlers
  const handleOpenTeam = useCallback(() => {
    setPrimePanel('team');
  }, []);
  
  const handleOpenTasks = useCallback(() => {
    setPrimePanel('tasks');
  }, []);
  
  const handleClosePanel = useCallback(() => {
    setPrimePanel('none');
  }, []);
  
  // IMPORTANT: Memoize callback to prevent infinite loop - stable reference prevents EmployeeChatWorkspace from re-running effects
  // Callback only assigns to ref (no state updates), so it's safe
  const handleSendFunctionReady = useCallback((fn: (message: string) => Promise<void>) => {
    sendFunctionRef.current = fn;
  }, []); // Empty deps - callback never changes

  // Handle guardrails state updates from EmployeeChatWorkspace
  const handleGuardrailsStateChange = useCallback((guardrails: boolean, pii: boolean) => {
    setGuardrailsActive(guardrails);
    setPiiProtectionActive(pii);
  }, []);

  const handleSend = async () => {
    if (inputValue.trim() && sendFunctionRef.current) {
      await sendFunctionRef.current(inputValue);
      setInputValue('');
    }
  };

  const hasText = inputValue.trim().length > 0;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col h-full w-full">
      {/* Top Section - Specialist Card Header - Match Goalie structure */}
      <div className="bg-gradient-to-br from-amber-900/40 to-slate-900/10 border-b border-slate-800 pb-6 flex-shrink-0 -mx-6 -mt-6 px-6 pt-6">
        {/* Header with Icon + Title + Description */}
        <div className="flex items-start gap-4 mb-3">
          {/* Avatar Circle - Match Goalie size */}
          <PrimeLogoBadge size={40} showGlow={false} />
          
          {/* Title and Description - Match Goalie typography */}
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-white leading-tight truncate">
              Prime — AI Command Center
            </h2>
            <p className="text-sm text-slate-400 mt-1 line-clamp-2">
              Your financial CEO · Routing tasks and coordinating your AI team
            </p>
          </div>
        </div>

        {/* Three Stats Row - Match Goalie KPI sizes */}
        <div className="flex items-center gap-2 sm:gap-4 mb-3">
          <div className="flex-1 flex flex-col items-center text-center">
            <div className="text-2xl font-bold text-blue-400">
              {statsLoading ? '—' : (liveStats?.onlineEmployees ?? 0)}
            </div>
            <div className="text-xs text-slate-500">
              AI Agents{liveStats && liveStats.totalEmployees > 0 ? ` (${liveStats.onlineEmployees}/${liveStats.totalEmployees})` : ''}
            </div>
          </div>
          <div className="flex-1 flex flex-col items-center text-center">
            <div className="text-2xl font-bold text-yellow-400">
              {statsLoading ? '—' : (liveStats?.liveTasks ?? 0)}
            </div>
            <div className="text-xs text-slate-500">Tasks Routed</div>
          </div>
          <div className="flex-1 flex flex-col items-center text-center">
            <div className="text-2xl font-bold text-green-400">
              {statsLoading ? '—' : Math.round((liveStats?.successRate ?? 0.99) * 100)}%
            </div>
            <div className="text-xs text-slate-500">Success Rate</div>
          </div>
        </div>

        {/* Three Action Buttons Row - Match Goalie button sizes */}
        <div className="flex items-center gap-2">
          <button 
            onClick={() => {
              console.log('[PrimeUnifiedCard] Chat button clicked, onExpandClick:', onExpandClick);
              if (onExpandClick) {
                onExpandClick();
              } else {
                console.warn('[PrimeUnifiedCard] onExpandClick is not defined!');
              }
            }}
            className="flex-1 min-w-0 flex items-center justify-center gap-1 sm:gap-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-amber-500/30 text-white text-xs sm:text-sm px-2 sm:px-4 py-2 transition-all"
          >
            <MessageSquare className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">Chat</span>
          </button>
          <button 
            onClick={handleOpenTeam}
            className="flex-1 min-w-0 flex items-center justify-center gap-1 sm:gap-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-amber-500/30 text-white text-xs sm:text-sm px-2 sm:px-4 py-2 transition-all"
          >
            <Users className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">Team</span>
          </button>
          <button 
            onClick={handleOpenTasks}
            className="flex-1 min-w-0 flex items-center justify-center gap-1 sm:gap-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-amber-500/30 text-white text-xs sm:text-sm px-2 sm:px-4 py-2 transition-all"
          >
            <Zap className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">Tasks</span>
          </button>
        </div>
      </div>

      {/* Content area - flex-1 to take available space */}
      <div className="flex-1 flex flex-col min-h-0 -mx-6 px-6">
        {/* Simplified middle section - Match Byte exactly */}
        <div className="flex-1 min-h-0 overflow-y-auto py-4">
          <div className="flex flex-col h-full">
            <div className="mb-4 flex justify-center">
              <PrimeLogoBadge size={80} showGlow={true} />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Welcome to Prime</h3>
            <p className="text-slate-400 mb-4">
              I'm Prime, your AI CEO. Click the chat button below to coordinate your AI team and manage your finances.
            </p>
          </div>
        </div>

        {/* Bottom sections - pinned to bottom */}
        <div className="pt-3 pb-0 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-300/80 border-t border-slate-800/50 flex-shrink-0">
          <div className="text-[11px] text-slate-500">
            Guardrails active · PII protection on
          </div>
          <div className="text-[11px] text-slate-400">
            Secure • Always Coordinating
          </div>
        </div>

        <div className="flex-shrink-0 pt-3">
        <div 
          className="flex items-center gap-3 bg-slate-800 rounded-xl px-3 py-2 border border-slate-700 focus-within:border-amber-500 transition-all duration-200 cursor-pointer"
          onClick={onChatInputClick || onExpandClick}
        >
          <input
            type="text"
            placeholder="Ask Prime, your AI CEO…"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && inputValue.trim()) {
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
            disabled={!inputValue.trim()}
          >
            <Send className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>
      </div>
      
      {/* Slide-in Panels */}
      <PrimeTeamPanel
        isOpen={primePanel === 'team'}
        onClose={handleClosePanel}
      />
      <PrimeTasksPanel
        isOpen={primePanel === 'tasks'}
        onClose={handleClosePanel}
      />
    </div>
  );
}


