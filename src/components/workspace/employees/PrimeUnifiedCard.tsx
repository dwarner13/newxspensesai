/**
 * PrimeUnifiedCard Component
 * 
 * Custom CEO-style hero card for Prime (AI Command Center)
 * Special design with big orange "Open Prime Chat" button
 * Does NOT use EmployeeUnifiedCardBase - this is Prime's unique premium card
 */

import { useState, useCallback } from 'react';
import { PrimeTeamPanel } from '../../prime/PrimeTeamPanel';
import { PrimeTasksPanel } from '../../prime/PrimeTasksPanel';
import { useUnifiedChatLauncher } from '../../../hooks/useUnifiedChatLauncher';

interface PrimeUnifiedCardProps {
  onExpandClick?: () => void;
  onChatInputClick?: () => void;
  primePanel?: 'none' | 'team' | 'tasks' | 'chat'; // Panel state from parent
  onPrimePanelChange?: (panel: 'none' | 'team' | 'tasks' | 'chat') => void; // Callback to update parent state
}

export function PrimeUnifiedCard({ 
  onChatInputClick,
  primePanel: externalPrimePanel,
  onPrimePanelChange,
}: PrimeUnifiedCardProps) {
  // Panel state - use external if provided, otherwise manage internally
  const [internalPrimePanel, setInternalPrimePanel] = useState<'none' | 'team' | 'tasks' | 'chat'>('none');
  const primePanel = externalPrimePanel !== undefined ? externalPrimePanel : internalPrimePanel;
  
  const setPrimePanel = (panel: 'none' | 'team' | 'tasks' | 'chat') => {
    if (onPrimePanelChange) {
      onPrimePanelChange(panel);
    } else {
      setInternalPrimePanel(panel);
    }
  };
  
  // Unified chat launcher
  const { openChat } = useUnifiedChatLauncher();
  
  // Panel close handler (panels are controlled by primePanel state prop)
  const handleClosePanel = useCallback(() => {
    setPrimePanel('none');
  }, [setPrimePanel]);

  // Handle opening Prime chat via unified launcher
  const handleOpenPrimeChat = useCallback(() => {
    openChat({
      initialEmployeeSlug: 'prime-boss',
      context: {
        page: 'prime-workspace',
        data: {
          source: 'prime-unified-card',
        },
      },
    });
    if (onChatInputClick) {
      onChatInputClick();
    }
  }, [openChat, onChatInputClick]);

  return (
    <>
      {/* Custom Prime CEO Card - Premium Design */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-800/70 bg-gradient-to-b from-slate-900/90 via-slate-900/80 to-slate-950/95 shadow-[0_22px_70px_rgba(15,23,42,0.9)] px-8 py-8 lg:px-10 lg:py-10 flex flex-col items-center justify-center text-center h-full">
        {/* Subtle radial glow behind crown */}
        <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-amber-500/10 blur-3xl" />
        
        {/* Crown Avatar with Strong Orange Glow */}
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-slate-900/80 shadow-[0_0_40px_rgba(248,180,80,0.55)] ring-2 ring-amber-400/60 relative z-10">
          <span className="text-3xl">👑</span>
        </div>

        {/* Title */}
        <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-slate-50 text-center mb-2 relative z-10">
          Prime — AI Command Center
        </h2>

        {/* Subtitle */}
        <p className="mt-2 text-sm text-slate-300/85 text-center max-w-xl mx-auto relative z-10">
          Your financial CEO. Routing tasks and coordinating your AI team.
        </p>

        {/* Primary Button - Big Orange "Open Prime Chat" */}
        <button
          type="button"
          onClick={handleOpenPrimeChat}
          className="mt-8 inline-flex items-center justify-center rounded-full bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 px-10 py-3.5 text-sm font-semibold tracking-wide text-slate-950 shadow-[0_18px_45px_rgba(248,180,80,0.65)] hover:brightness-110 hover:translate-y-[1px] active:translate-y-[2px] transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-amber-300 focus-visible:ring-offset-slate-950 relative z-10"
        >
          <span className="mr-2 text-base">💬</span>
          Open Prime Chat
        </button>

        {/* Status Row */}
        <div className="mt-4 flex items-center justify-center gap-3 text-xs text-slate-400 relative z-10">
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-3 py-1 text-[11px] font-medium text-emerald-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Online 24/7
          </span>
          <span className="hidden sm:inline text-slate-400/80">•</span>
          <span className="hidden sm:inline text-[11px] uppercase tracking-wide text-slate-400/80">
            AI team active
          </span>
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
    </>
  );
}


