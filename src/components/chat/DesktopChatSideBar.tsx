/**
 * Desktop Chat Side Bar Component (Vertical Icon Rail)
 * 
 * Cinematic glowing control wand on the right edge:
 * - Fixed vertical rail with stacked icon buttons for quick AI employee access
 * - Each chat button opens unified chat with specific employee
 * - Workspace button navigates to full Prime workspace page
 * - Glassy pill background with gradient glow effects
 * - Desktop-only (hidden on mobile)
 */

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Crown, Upload, Tags, LineChart, LayoutDashboard, History, Grid3X3, Activity } from 'lucide-react';
import { useUnifiedChatLauncher } from '../../hooks/useUnifiedChatLauncher';
import { usePrimeOverlaySafe } from '../../context/PrimeOverlayContext';
import { cn } from '../../lib/utils';
import { MiniWorkspacePanel, type MiniWorkspaceId, type MiniWorkspaceConfig } from './MiniWorkspacePanel';
import { PrimeLogoBadge } from '../branding/PrimeLogoBadge';
import { useJobsSystemStore } from '../../state/jobsSystemStore';
import { useRightPanel } from '../../context/RightPanelContext';

interface DesktopChatSideBarProps {
  onHistoryClick?: () => void; // Optional callback for History button click
  dockedToPanel?: boolean; // If true, dock to panel instead of floating over dashboard
  className?: string; // Additional className
}

// Feature flag: Use new Prime rail button style (PrimeLogoBadge) vs Byte-style (standard Icon)
const USE_NEW_PRIME_RAIL = false;

// Mini workspace configuration
const MINI_WORKSPACES: MiniWorkspaceConfig[] = [
  {
    id: 'prime',
    name: 'Prime — Command Center',
    role: 'AI CEO & router',
    slug: 'prime-boss',
    pagePath: '/dashboard/prime-chat',
    gradient: 'from-amber-400 via-orange-500 to-pink-500',
    accent: 'from-amber-400 via-orange-500 to-pink-500',
    icon: <span className="text-xl">👑</span>,
    description: 'Talk to Prime, see routed tasks, and jump into any employee.',
  },
  {
    id: 'byte',
    name: 'Byte — Smart Import AI',
    role: 'Document & receipt processing',
    slug: 'byte-docs',
    pagePath: '/dashboard/smart-import-ai',
    gradient: 'from-sky-400 via-cyan-400 to-emerald-400',
    accent: 'from-sky-400 via-cyan-400 to-emerald-400',
    icon: <span className="text-xl">📄</span>,
    description: 'Upload bank statements and receipts, track OCR and queue status.',
  },
  {
    id: 'tag',
    name: 'Tag — Smart Categories',
    role: 'Auto-categorization & rules',
    slug: 'tag-ai',
    pagePath: '/dashboard/smart-categories',
    gradient: 'from-yellow-300 via-amber-400 to-orange-500',
    accent: 'from-yellow-300 via-amber-400 to-orange-500',
    icon: <span className="text-xl">🏷️</span>,
    description: 'Review categories, tweak rules, and fix uncategorized transactions.',
  },
  {
    id: 'analytics',
    name: 'Crystal — Analytics AI',
    role: 'Spending insights & reports',
    slug: 'crystal-analytics',
    pagePath: '/dashboard/analytics-ai',
    gradient: 'from-purple-400 via-indigo-400 to-sky-400',
    accent: 'from-purple-400 via-indigo-400 to-sky-400',
    icon: <span className="text-xl">📊</span>,
    description: 'See trends, anomalies, and AI-generated insights about your money.',
  },
];

export default function DesktopChatSideBar({ 
  onHistoryClick,
  dockedToPanel = false,
  className,
}: DesktopChatSideBarProps = {}) {
  const { isOpen, activeEmployeeSlug, openChat } = useUnifiedChatLauncher();
  
  // Visual dimming when chat is open (but rail stays mounted for DOM stability)
  const isChatOpen = isOpen;
  const navigate = useNavigate();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeMiniWorkspace, setActiveMiniWorkspace] = useState<MiniWorkspaceId | null>(null);
  
  // Get Prime Tools overlay state (safe - defaults to false if not in provider)
  const { setPrimeToolsOpen } = usePrimeOverlaySafe();
  
  // Get jobs system state for AI Pulse button
  const { runningCount, needsUserCount, unreadAiCount, setDrawerOpen } = useJobsSystemStore();
  
  // Check if any right-side panel is open (for fade effect)
  const { isAnyPanelOpen } = useRightPanel();
  
  // Check if right drawer is open (for AI tools paused badge)
  const [isRightDrawerOpen, setIsRightDrawerOpen] = useState(false);
  
  useEffect(() => {
    if (typeof document === 'undefined') return;
    
    const checkDrawerState = () => {
      setIsRightDrawerOpen(document.body.classList.contains('right-drawer-open'));
    };
    
    // Check immediately
    checkDrawerState();
    
    // Watch for class changes (MutationObserver for bulletproof detection)
    const observer = new MutationObserver(checkDrawerState);
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['class'],
    });
    
    return () => observer.disconnect();
  }, []);

  const handleOpenMiniWorkspace = (id: MiniWorkspaceId) => {
    setActiveMiniWorkspace(id);
  };

  const handleCloseMiniWorkspace = () => {
    setActiveMiniWorkspace(null);
  };

  const activeConfig = MINI_WORKSPACES.find(
    (w) => w.id === activeMiniWorkspace
  );

  // Animation variants
  const buttonVariants = {
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
  };

  // Actions configuration with gradient accents
  const actions = [
    {
      id: 'ai-pulse',
      label: 'AI Pulse',
      slug: null,
      Icon: Activity,
      accent: 'from-sky-400 via-cyan-400 to-emerald-400',
      isAiPulse: true, // Special flag for AI Pulse button
      onClick: () => {
        setDrawerOpen(true);
      },
    },
    {
      id: 'prime' as MiniWorkspaceId,
      label: 'Prime',
      slug: 'prime-boss',
      Icon: Crown,
      accent: 'from-amber-400 via-orange-500 to-pink-500',
      onClick: () => {
        openChat({
          initialEmployeeSlug: 'prime-boss',
          context: {
            source: 'rail-prime',
          },
        });
      },
    },
    {
      id: 'byte' as MiniWorkspaceId,
      label: 'Smart Import',
      slug: 'byte-docs',
      Icon: Upload,
      accent: 'from-sky-400 via-cyan-400 to-emerald-400',
      onClick: () => {
        openChat({
          initialEmployeeSlug: 'byte-docs',
          context: {
            source: 'rail-byte',
          },
        });
      },
    },
    {
      id: 'tag' as MiniWorkspaceId,
      label: 'Smart Categories',
      slug: 'tag-ai',
      Icon: Tags,
      accent: 'from-yellow-300 via-amber-400 to-orange-500',
      onClick: () => {
        openChat({
          initialEmployeeSlug: 'tag-ai',
          context: {
            source: 'rail-tag',
          },
        });
      },
    },
    {
      id: 'analytics' as MiniWorkspaceId,
      label: 'Analytics',
      slug: 'crystal-analytics',
      Icon: LineChart,
      accent: 'from-purple-400 via-indigo-400 to-sky-400',
      onClick: () => {
        openChat({
          initialEmployeeSlug: 'crystal-analytics',
          context: {
            source: 'rail-analytics',
          },
        });
      },
    },
    {
      id: 'history',
      label: 'Recent Activity',
      slug: null,
      Icon: History,
      accent: 'from-purple-400 via-pink-400 to-rose-400',
      onClick: () => {
        if (onHistoryClick) {
          onHistoryClick();
        } else {
          window.dispatchEvent(new CustomEvent('openChatHistory'));
        }
        setActiveId('history');
      },
    },
    {
      id: 'workspace',
      label: 'Prime Workspace',
      slug: null,
      Icon: LayoutDashboard,
      accent: 'from-emerald-400 via-teal-400 to-cyan-400',
      onClick: () => {
        navigate('/dashboard/prime-chat');
        setActiveId('workspace');
      },
    },
    {
      id: 'tools',
      label: 'Prime Tools',
      slug: null,
      Icon: Grid3X3,
      accent: 'from-pink-400 via-orange-400 to-amber-300',
      onClick: () => {
        setPrimeToolsOpen(true);
        setActiveId('tools');
      },
    },
  ];

  // Determine active state based on chat state, activeId, or mini workspace
  const getIsActive = (action: typeof actions[0]) => {
    // Check if mini workspace is open
    if (activeMiniWorkspace === action.id) {
      return true;
    }
    // Check if chat is open with this employee
    if (action.slug) {
      return isOpen && activeEmployeeSlug === action.slug;
    }
    return activeId === action.id;
  };

  // If docked to panel, use simpler styling
  if (dockedToPanel) {
    return (
      <>
        <div className={cn('hidden md:flex h-full justify-center pl-4', className)}>
          <div className="flex flex-col items-center gap-2">
            {actions.map((action) => {
              const isActive = getIsActive(action);
              const Icon = action.Icon;
              return (
                <div key={action.id} className="group relative">
                  <button
                    type="button"
                    onClick={action.onClick}
                    aria-label={action.label}
                    className={`
                      w-10 h-10 rounded-full
                      flex items-center justify-center
                      transition-colors duration-200
                      ${
                        isActive
                          ? 'bg-sky-500/80 text-white shadow-[0_0_25px_rgba(56,189,248,0.8)] border border-sky-400/80'
                          : 'bg-slate-800/80 text-slate-200 hover:bg-slate-700/80 hover:text-white'
                      }
                    `}
                  >
                    {action.id === 'prime' && USE_NEW_PRIME_RAIL ? (
                      <PrimeLogoBadge size={36} showGlow={true} />
                    ) : (
                      <Icon className="w-5 h-5" />
                    )}
                  </button>
                  <div className="pointer-events-none absolute left-full ml-2 top-1/2 -translate-y-1/2 origin-center scale-95 opacity-0 group-hover:opacity-100 group-hover:scale-100 transition-all duration-150">
                    <div className="rounded-md bg-slate-900/95 px-2 py-1 text-xs text-slate-100 shadow-lg border border-slate-700/80 whitespace-nowrap">
                      {action.label}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        {activeConfig && (
          <MiniWorkspacePanel
            config={activeConfig}
            isOpen
            onClose={handleCloseMiniWorkspace}
          />
        )}
      </>
    );
  }

  // SSR guard: Don't render rail on server
  if (typeof document === 'undefined') {
    return null;
  }

  // Floating cinematic rail - rendered via Portal to escape overflow/stacking contexts
  const railContent = (
    <>
      {/* Optional "AI tools paused" badge - desktop only */}
      {isRightDrawerOpen && (
        <div className="hidden md:block fixed right-24 top-1/2 -translate-y-1/2 z-[9998] pointer-events-none">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/40 backdrop-blur-sm px-3 py-1.5 text-xs text-white/45 whitespace-nowrap">
            <span className="h-1.5 w-1.5 rounded-full bg-white/30" />
            AI tools paused
          </div>
        </div>
      )}
      
      <div
        data-floating-rail="true"
        data-ai-rail="true"
        className={cn(
          'pointer-events-auto fixed top-1/2 -translate-y-1/2 z-[60] hidden sm:flex flex-col',
          // Portal renders to document.body/#portal-root, immune to overflow-hidden and stacking contexts
          // right position uses CSS variable for rail gap
          // z-[60] ensures rail is above main content but below Prime Chat panel (z-[80])
          // data-floating-rail provides stable selector for debugging/verification
          // Changed from md:flex to sm:flex so rail shows when DevTools is docked (>=640px)
          // Visual dimming when chat is open, mini workspace is active, or right panel is open
          // When Prime Chat is open: fade out and disable clicks (smooth transition)
          (isChatOpen || activeMiniWorkspace) && 'opacity-0 pointer-events-none translate-x-2 transition-all duration-250',
          // When right panel is open: tuck behind drawer (lower z-index, non-interactive, de-emphasized)
          isAnyPanelOpen && !isChatOpen && !activeMiniWorkspace && 'z-[20] opacity-30 pointer-events-none translate-x-3',
          // Default state: fully visible and interactive
          !isChatOpen && !activeMiniWorkspace && !isAnyPanelOpen && 'opacity-100 pointer-events-auto translate-x-0 transition-all duration-250',
          className
        )}
        style={{
          position: 'fixed',
          right: 'var(--rail-gap, 24px)',
          pointerEvents: 'auto',
          contain: 'layout paint', // CRITICAL: Prevents floating rail from contributing to body scroll height
          // Transition handled by CSS classes above
        }}
      >
        <motion.div
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 22 }}
          className="
            flex flex-col items-center gap-2
            rounded-3xl border border-slate-800/80 bg-slate-950/90
            px-2.5 py-3
            shadow-xl shadow-black/40
            backdrop-blur-xl
            transition-all duration-150
            hover:scale-[1.06]
            hover:ring-2 hover:ring-amber-400/40
            pointer-events-auto
          "
          style={{ pointerEvents: 'auto' }}
        >
          {actions.map((action, index) => {
            const isActive = getIsActive(action);
            const Icon = action.Icon;
            // Get gradient from workspace config if available
            const workspaceConfig = MINI_WORKSPACES.find((w) => w.id === action.id);
            const accent = workspaceConfig?.accent || action.accent;
            
            // Special handling for AI Pulse button
            const isAiPulse = (action as any).isAiPulse === true;
            const hasActiveWork = runningCount > 0;
            const hasNeedsUser = needsUserCount > 0;
            const hasUnreadAi = unreadAiCount > 0;
            
            return (
              <motion.button
                key={action.id}
                type="button"
                variants={buttonVariants}
                initial="initial"
                animate="animate"
                transition={{ duration: 0.18, delay: index * 0.03 }}
                onClick={action.onClick}
                className={cn(
                  "group relative flex h-11 w-11 items-center justify-center",
                  "rounded-2xl border border-slate-800/80 bg-slate-900/80",
                  "shadow-[0_10px_28px_rgba(15,23,42,0.9)]",
                  "transition-all duration-200",
                  "hover:-translate-y-[2px] hover:border-slate-500",
                  "hover:bg-slate-900 hover:shadow-lg hover:shadow-amber-500/20",
                  isActive && "border-transparent bg-slate-900 ring-2 ring-amber-400/50",
                  // Amber highlight when needs user
                  isAiPulse && hasNeedsUser && "ring-2 ring-amber-500/60 ring-offset-1 ring-offset-slate-900"
                )}
              >
                {/* Pulse ring effect when work is running (confined to button bounds) */}
                {isAiPulse && hasActiveWork && (
                  <>
                    <div className="absolute inset-0 rounded-2xl bg-sky-500/20 animate-ping" />
                    <div className="absolute inset-0 rounded-2xl bg-sky-500/10 animate-pulse" />
                  </>
                )}
                
                {/* Glow ring for active/hover (only if not AI Pulse with active work) */}
                {/* pointer-events-none ensures glow doesn't block clicks */}
                {!isAiPulse && (
                  <span
                    className={cn(
                      "pointer-events-none absolute inset-[-2px] rounded-2xl opacity-0",
                      `bg-gradient-to-br ${accent}`,
                      "blur",
                      "transition-opacity duration-200",
                      "group-hover:opacity-70",
                      isActive && "opacity-80"
                    )}
                    style={{ pointerEvents: 'none' }}
                  />
                )}
                
                {action.id === 'prime' && USE_NEW_PRIME_RAIL ? (
                  <div className="group-hover:scale-105 transition-transform duration-200 relative z-10">
                    <PrimeLogoBadge size={36} showGlow={true} />
                  </div>
                ) : (
                  <span className={cn(
                    "relative flex h-8 w-8 items-center justify-center rounded-2xl bg-slate-950/80 text-slate-50 z-10",
                    // Color changes for AI Pulse based on state
                    isAiPulse && hasActiveWork && "text-sky-400",
                    isAiPulse && hasNeedsUser && "text-amber-400",
                    !isAiPulse && "text-slate-50"
                  )}>
                    <Icon className="w-5 h-5" />
                  </span>
                )}

                {/* Unread badge for AI Pulse (top-right, inside button) */}
                {isAiPulse && hasUnreadAi && (
                  <div className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-amber-500 border-2 border-slate-900 flex items-center justify-center z-20">
                    <span className="text-[9px] font-bold text-white leading-none">
                      {unreadAiCount > 99 ? '99+' : unreadAiCount}
                    </span>
                  </div>
                )}

                {/* Tooltip label */}
                <span
                  className="
                    pointer-events-none absolute left-[-0.5rem] top-1/2 z-50
                    -translate-x-full -translate-y-1/2
                    whitespace-nowrap rounded-full bg-slate-900/95 px-2.5 py-1
                    text-[10px] font-medium text-slate-100 opacity-0
                    shadow-[0_12px_30px_rgba(15,23,42,0.9)]
                    ring-1 ring-slate-700/80
                    transition-opacity duration-150
                    group-hover:opacity-100
                  "
                >
                  {action.label}
                  {isAiPulse && hasUnreadAi && ` (${unreadAiCount})`}
                </span>
              </motion.button>
            );
          })}
        </motion.div>
      </div>
      
      {/* Mini Workspace Panel */}
      {activeConfig && (
        <MiniWorkspacePanel
          config={activeConfig}
          isOpen
          onClose={handleCloseMiniWorkspace}
        />
      )}
    </>
  );

  // Render rail via Portal to document.body (or #portal-root if available) to escape overflow/stacking contexts
  // Portal ensures fixed positioning is viewport-relative, not relative to transformed ancestors
  const portalTarget = document.getElementById('portal-root') || document.body;
  return createPortal(railContent, portalTarget);
}
