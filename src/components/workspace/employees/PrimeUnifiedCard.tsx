/**
 * PrimeUnifiedCard Component
 * 
 * Unified employee card for Prime (AI Command Center)
 * Uses EmployeeUnifiedCardBase for consistent premium styling matching Byte hero card.
 * Contains action buttons (Open Chat, Assign Task, View Team) in the header section.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { MessageSquare, Briefcase, Users, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useUnifiedChatLauncher } from '../../../hooks/useUnifiedChatLauncher';
import { EmployeeUnifiedCardBase, type SecondaryAction } from './EmployeeUnifiedCardBase';
import { usePrimeOverlaySafe } from '../../../context/PrimeOverlayContext';
import { useActivityFeed } from '../../../hooks/useActivityFeed';

interface PrimeUnifiedCardProps {
  onExpandClick?: () => void;
  onChatInputClick?: () => void;
  primePanel?: 'none' | 'team' | 'tasks' | 'chat'; // Panel state from parent (kept for compatibility)
  onPrimePanelChange?: (panel: 'none' | 'team' | 'tasks' | 'chat') => void; // Callback to update parent state (kept for compatibility)
}

export function PrimeUnifiedCard({ 
  onChatInputClick,
  primePanel: externalPrimePanel,
  onPrimePanelChange,
}: PrimeUnifiedCardProps) {
  const { openChat } = useUnifiedChatLauncher();
  const navigate = useNavigate();
  const { setPrimeToolsOpen } = usePrimeOverlaySafe();
  const activityFeed = useActivityFeed({ limit: 25, pollMs: 60000 });
  const [commandText, setCommandText] = useState('');
  const [routeOverride, setRouteOverride] = useState<'auto' | 'prime-boss' | 'byte-docs' | 'tag-ai' | 'crystal-analytics' | 'ledger-tax' | 'goalie-goals' | 'liberty-freedom'>('auto');

  const primeInsight = useMemo(() => {
    const events = Array.isArray(activityFeed.events) ? activityFeed.events : [];
    const categories = ['Dining', 'Groceries', 'Transportation', 'Subscriptions', 'Shopping', 'Utilities', 'Housing'];
    const parseCategory = (text: string): string | null => {
      const hit = categories.find((c) => text.toLowerCase().includes(c.toLowerCase()));
      return hit || null;
    };
    const parseCount = (text: string): number | null => {
      const m = text.match(/(\d+)\s+(?:anomal|flag|review|item|transaction|charge)/i);
      if (!m) return null;
      const n = Number(m[1]);
      return Number.isFinite(n) ? n : null;
    };

    for (const event of events) {
      const actor = String(event.actorLabel || event.actorSlug || 'Prime').trim();
      const title = String(event.title || '').trim();
      const description = String(event.description || '').trim();
      const text = `${title} ${description}`.trim();
      if (!text) continue;
      if (/user sent message|typing|opened chat/i.test(text)) continue;

      const category = parseCategory(text);
      const count = parseCount(text);

      if (/(anomal|unusual|flagged|needs review|review required)/i.test(text)) {
        return {
          message: category
            ? `${actor} flagged ${count ?? 'several'} unusual items in ${category}. Want to review now?`
            : `${actor} flagged ${count ?? 'several'} unusual transactions. Want to review now?`,
          ctaLabel: 'Review anomalies',
          to: category
            ? `/dashboard/transactions?category=${encodeURIComponent(category)}&status=uncategorized`
            : '/dashboard/transactions?status=uncategorized',
          severity: 'warning' as const,
        };
      }

      if (/(import completed|processed your documents|parse complete|transactions extracted|imported)/i.test(text)) {
        return {
          message: `${actor} finished the latest import. I can fast-track anything uncategorized next.`,
          ctaLabel: 'Review imported transactions',
          to: '/dashboard/transactions?status=uncategorized',
          severity: 'info' as const,
        };
      }
    }

    return {
      message: 'System is optimized. No urgent anomalies detected right now.',
      ctaLabel: 'Open Transactions',
      to: '/dashboard/transactions',
      severity: 'healthy' as const,
    };
  }, [activityFeed.events]);

  // Handler to open unified chat with Prime
  const handleChatClick = useCallback(() => {
    console.log('[PrimeUnifiedCard] Opening chat with Prime...');
    openChat({
      initialEmployeeSlug: 'prime-boss',
      context: {
        page: 'prime-chat',
        data: {
          source: 'prime-unified-card',
        },
      },
    });
    if (onChatInputClick) {
      onChatInputClick();
    }
  }, [openChat, onChatInputClick]);

  // Handler for Assign Task action
  const handleAssignTask = useCallback(() => {
    // TODO: Open Prime Tools / command actions when implemented
    // For now, open Prime Tools panel if available
    try {
      setPrimeToolsOpen(true);
    } catch (err) {
      console.log('[PrimeUnifiedCard] Prime Tools not available');
    }
  }, [setPrimeToolsOpen]);

  // Handler for View Team action
  const handleViewTeam = useCallback(() => {
    try {
      setPrimeToolsOpen(true);
      onPrimePanelChange?.('team');
    } catch {
      // no-op fallback
    }
  }, [onPrimePanelChange, setPrimeToolsOpen]);

  const routeSuggestion = useMemo(() => {
    const text = commandText.toLowerCase().trim();
    if (!text) {
      return {
        slug: 'prime-boss' as const,
        label: 'Prime',
        confidence: 0,
        message: 'Type a task and Prime will suggest the best employee.',
      };
    }
    if (/(move|categor|category|merchant|uncategorized|sobeys|walmart|netflix|shell)/i.test(text)) {
      return {
        slug: 'tag-ai' as const,
        label: 'Tag-AI',
        confidence: 92,
        message: 'Assigning to Tag-AI for categorization workflow.',
      };
    }
    if (/(import|upload|pdf|receipt|parse|ocr|statement|extract)/i.test(text)) {
      return {
        slug: 'byte-docs' as const,
        label: 'Byte',
        confidence: 94,
        message: 'Assigning to Byte for document/import processing.',
      };
    }
    if (/(tax|write-?off|writeoff|deduct|ledger|filing)/i.test(text)) {
      return {
        slug: 'ledger-tax' as const,
        label: 'Ledger',
        confidence: 91,
        message: 'Assigning to Ledger for tax and write-off checks.',
      };
    }
    if (/(anomal|trend|forecast|predict|insight|spending pattern)/i.test(text)) {
      return {
        slug: 'crystal-analytics' as const,
        label: 'Crystal',
        confidence: 89,
        message: 'Assigning to Crystal for analytics and anomaly review.',
      };
    }
    if (/(goal|save|budget|target)/i.test(text)) {
      return {
        slug: 'goalie-goals' as const,
        label: 'Goalie',
        confidence: 88,
        message: 'Assigning to Goalie for planning and goals.',
      };
    }
    if (/(debt|payoff|interest|credit card)/i.test(text)) {
      return {
        slug: 'liberty-freedom' as const,
        label: 'Liberty',
        confidence: 87,
        message: 'Assigning to Liberty for debt and payoff strategy.',
      };
    }
    return {
      slug: 'prime-boss' as const,
      label: 'Prime',
      confidence: 70,
      message: 'Prime can route this after a quick review.',
    };
  }, [commandText]);

  const resolveOverrideLabel = (slug: string) => {
    switch (slug) {
      case 'tag-ai':
        return 'Tag-AI';
      case 'byte-docs':
        return 'Byte';
      case 'crystal-analytics':
        return 'Crystal';
      case 'ledger-tax':
        return 'Ledger';
      case 'goalie-goals':
        return 'Goalie';
      case 'liberty-freedom':
        return 'Liberty';
      default:
        return 'Prime';
    }
  };

  const handleCommandSend = useCallback(() => {
    const text = commandText.trim();
    if (!text) return;
    const targetSlug = routeOverride === 'auto' ? routeSuggestion.slug : routeOverride;
    openChat({
      initialEmployeeSlug: targetSlug,
      initialQuestion: text,
      context: {
        page: 'prime-chat',
        data: {
          source: 'prime-command-bar',
          routedByPrime: true,
          suggestedEmployee: routeSuggestion.slug,
        },
      },
      force: true,
      routeHint: '/dashboard/prime-chat',
    });
    onChatInputClick?.();
    setCommandText('');
  }, [commandText, onChatInputClick, openChat, routeOverride, routeSuggestion.slug]);

  // Secondary actions for Prime (3 action pills matching Byte pattern)
  const secondaryActions: SecondaryAction[] = [
    {
      label: 'Open Chat',
      icon: <MessageSquare className="h-4 w-4" />,
      onClick: handleChatClick,
    },
    {
      label: 'Assign Task',
      icon: <Briefcase className="h-4 w-4" />,
      onClick: handleAssignTask,
    },
    {
      label: 'View Team',
      icon: <Users className="h-4 w-4" />,
      onClick: handleViewTeam,
    },
  ];

  return (
    <EmployeeUnifiedCardBase
      employeeSlug="prime-boss"
      primaryActionLabel="Open Prime Chat"
      onPrimaryActionClick={handleChatClick}
      secondaryActions={secondaryActions}
      footerStatusText="Online"
    >
      <div className="rounded-2xl border border-slate-800/90 bg-slate-900/70 p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Prime Insight</div>
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
              primeInsight.severity === 'warning'
                ? 'border border-amber-500/35 bg-amber-500/10 text-amber-300'
                : primeInsight.severity === 'healthy'
                ? 'border border-emerald-500/35 bg-emerald-500/10 text-emerald-300'
                : 'border border-cyan-500/35 bg-cyan-500/10 text-cyan-300'
            }`}
          >
            {primeInsight.severity === 'warning' ? 'Needs attention' : primeInsight.severity === 'healthy' ? 'Healthy' : 'Update'}
          </span>
        </div>
        <p className="mt-2 text-sm text-slate-200">{primeInsight.message}</p>
        <div className="mt-3">
          <button
            type="button"
            onClick={() => navigate(primeInsight.to)}
            className="inline-flex items-center rounded-full border border-violet-500/35 bg-violet-500/15 px-3 py-1.5 text-xs font-medium text-violet-200 hover:bg-violet-500/25 transition-colors"
          >
            {primeInsight.ctaLabel}
          </button>
        </div>
      </div>

      <div className="mt-3 rounded-2xl border border-emerald-500/25 bg-slate-900/80 p-3 shadow-[0_0_0_1px_rgba(16,185,129,0.12)]">
        <div className="mb-2 flex items-center justify-between gap-2">
          <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-300">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/60 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </span>
            Command Bar
          </div>
          <div className="text-[10px] text-slate-400">
            {routeSuggestion.confidence > 0 ? `${routeSuggestion.confidence}% match` : 'Routing ready'}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="text"
            value={commandText}
            onChange={(e) => setCommandText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleCommandSend();
              }
            }}
            placeholder="Type a command… e.g. Move Sobeys to Groceries"
            className="flex-1 rounded-full border border-emerald-500/25 bg-slate-950/80 px-3 py-2 text-sm text-slate-100 outline-none transition-shadow focus:border-emerald-400/40 focus:shadow-[0_0_20px_rgba(16,185,129,0.25)]"
          />
          <select
            value={routeOverride}
            onChange={(e) => setRouteOverride(e.target.value as any)}
            className="rounded-full border border-slate-700 bg-slate-900 px-2.5 py-2 text-xs text-slate-200"
            title="Routing override"
          >
            <option value="auto">Auto</option>
            <option value="prime-boss">Prime</option>
            <option value="tag-ai">Tag-AI</option>
            <option value="byte-docs">Byte</option>
            <option value="crystal-analytics">Crystal</option>
            <option value="ledger-tax">Ledger</option>
            <option value="goalie-goals">Goalie</option>
            <option value="liberty-freedom">Liberty</option>
          </select>
          <button
            type="button"
            onClick={handleCommandSend}
            disabled={!commandText.trim()}
            className="inline-flex items-center gap-1 rounded-full border border-emerald-400/40 bg-emerald-500/15 px-3 py-2 text-xs font-semibold text-emerald-200 hover:bg-emerald-500/25 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Assign
          </button>
        </div>

        <p className="mt-2 text-[11px] text-slate-300">
          {routeOverride === 'auto'
            ? routeSuggestion.message
            : `Assigning to ${resolveOverrideLabel(routeOverride)} (manual override).`}
        </p>
      </div>
    </EmployeeUnifiedCardBase>
  );
}
