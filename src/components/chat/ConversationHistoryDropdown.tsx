/**
 * ConversationHistoryDropdown — employee stop timeline navigation.
 *
 * Shows ordered employee stops inside the current conversation.
 * Clicking a stop scrolls to that section of the conversation (read-only).
 * Does NOT modify active employee, session, handoff, or backend state.
 */

import { useEffect, useRef, useCallback } from 'react';
import { ChevronDown } from 'lucide-react';
import type { EmployeeStop } from './deriveEmployeeStops';

interface ConversationHistoryDropdownProps {
  stops: EmployeeStop[];
  isOpen: boolean;
  onToggle: () => void;
  onSelectStop: (stopIndex: number) => void;
  conversationTitle?: string | null;
  isMobile?: boolean;
}

function formatTime(timestamp: string | null): string {
  if (!timestamp) return '';
  const d = new Date(timestamp);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export function ConversationHistoryDropdown({
  stops,
  isOpen,
  onToggle,
  onSelectStop,
  conversationTitle,
  isMobile = false,
}: ConversationHistoryDropdownProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on outside click (desktop only)
  useEffect(() => {
    if (!isOpen || isMobile) return;
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onToggle();
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen, isMobile, onToggle]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onToggle();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, onToggle]);

  const handleStopClick = useCallback((index: number) => {
    onSelectStop(index);
    onToggle();
  }, [onSelectStop, onToggle]);

  if (!isOpen) return null;

  const title = conversationTitle || 'Current Conversation';

  // Mobile: full-width collapsible panel
  if (isMobile) {
    return (
      <div className="border-b border-slate-800/70 bg-slate-950/98 backdrop-blur-md shrink-0 overflow-hidden">
        <div className="px-4 pt-3 pb-1">
          <p className="text-[10px] font-medium tracking-widest text-slate-500 uppercase">
            {title}
          </p>
        </div>
        <div className="px-3 pb-3 space-y-1">
          {stops.map((stop, idx) => (
            <button
              key={`${stop.employeeSlug}-${idx}`}
              type="button"
              onClick={() => handleStopClick(idx)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors min-h-[44px] ${
                stop.isCurrent
                  ? 'bg-white/[0.06] border border-white/10'
                  : 'hover:bg-white/[0.04]'
              }`}
            >
              <span className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-sm shrink-0 ${
                stop.isCurrent ? 'bg-white/10' : 'bg-white/[0.05]'
              }`}>
                {stop.emoji}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-semibold truncate ${
                    stop.isCurrent ? 'text-slate-100' : 'text-slate-400'
                  }`}>
                    {stop.displayName}
                  </span>
                  {stop.isCurrent && (
                    <span className="inline-flex items-center rounded-full bg-emerald-500/15 border border-emerald-500/30 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-300 uppercase tracking-wide">
                      Current
                    </span>
                  )}
                </div>
                <p className={`text-[11px] truncate ${
                  stop.isCurrent ? 'text-slate-400' : 'text-slate-500'
                }`}>
                  {stop.label}
                </p>
              </div>
              <span className="text-[10px] text-slate-600 tabular-nums shrink-0">
                {formatTime(stop.timestamp)}
              </span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Desktop: positioned dropdown
  return (
    <div ref={panelRef} className="absolute left-0 top-full z-30 mt-1 w-[320px] rounded-xl border border-slate-700/60 bg-slate-950/98 shadow-2xl backdrop-blur-md overflow-hidden">
      <div className="px-4 pt-3 pb-1">
        <p className="text-[10px] font-medium tracking-widest text-slate-500 uppercase">
          {title}
        </p>
      </div>
      <div className="px-2 pb-2 space-y-0.5 max-h-[320px] overflow-y-auto">
        {stops.map((stop, idx) => (
          <button
            key={`${stop.employeeSlug}-${idx}`}
            type="button"
            onClick={() => handleStopClick(idx)}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
              stop.isCurrent
                ? 'bg-white/[0.06] border border-white/10'
                : 'hover:bg-white/[0.04]'
            }`}
          >
            <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-sm shrink-0 ${
              stop.isCurrent ? 'bg-white/10' : 'bg-white/[0.05]'
            }`}>
              {stop.emoji}
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className={`text-xs font-semibold truncate ${
                  stop.isCurrent ? 'text-slate-100' : 'text-slate-400'
                }`}>
                  {stop.displayName}
                </span>
                {stop.isCurrent && (
                  <span className="inline-flex items-center rounded-full bg-emerald-500/15 border border-emerald-500/30 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-300 uppercase tracking-wide">
                    Current
                  </span>
                )}
              </div>
              <p className={`text-[11px] truncate ${
                stop.isCurrent ? 'text-slate-400' : 'text-slate-500'
              }`}>
                {stop.label}
              </p>
            </div>
            <span className="text-[10px] text-slate-600 tabular-nums shrink-0">
              {formatTime(stop.timestamp)}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * DropdownTrigger — chevron button rendered next to employee name.
 */
export function HistoryDropdownTrigger({
  onClick,
  isOpen,
}: {
  onClick: () => void;
  isOpen: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={isOpen ? 'Close conversation history' : 'Open conversation history'}
      className="inline-flex items-center justify-center w-5 h-5 rounded text-slate-500 hover:text-slate-300 transition-colors"
    >
      <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
    </button>
  );
}
