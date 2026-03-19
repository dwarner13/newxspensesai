import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, NavLink, useNavigate } from 'react-router-dom';
import NAV_ITEMS from '../../navigation/nav-registry';
import type { NavItem } from '../../navigation/nav-registry';
import { isActivePath } from '../../navigation/is-active';
import { ScrollArea } from '../ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { ChevronLeft, ChevronRight, Settings, Upload } from 'lucide-react';
import { PrimeLogoBadge } from '../branding/PrimeLogoBadge';
import clsx from 'clsx';
import { useAccountCenterPanel } from '../settings/AccountCenterPanel';
import { useProfile } from '../../hooks/useProfile';
import { usePrimeState } from '../../contexts/usePrimeState';
import { getFeatureKeyForRoute } from '../../navigation/feature-keys';
import { useSmartCategoriesStats } from '../../hooks/useSmartCategoriesStats';
import { useUnifiedChatLauncher } from '../../hooks/useUnifiedChatLauncher';

interface DesktopSidebarProps {
  collapsed?: boolean;
  onToggleCollapse?: (collapsed: boolean) => void;
}

export default function DesktopSidebar({
  collapsed = false,
  onToggleCollapse,
}: DesktopSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [internalCollapsed, setInternalCollapsed] = useState(collapsed);
  const [moreOpen, setMoreOpen] = useState(false);
  const { openPanel } = useAccountCenterPanel();
  const profile = useProfile();
  const primeState = usePrimeState();
  const tagStats = useSmartCategoriesStats();
  const { openChat } = useUnifiedChatLauncher();
  const warnedKeysRef = useRef<Set<string>>(new Set());

  const triggerPrimeUpload = (source: string) => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    window.dispatchEvent(
      new CustomEvent('prime:open-upload', {
        detail: { source },
      })
    );
    window.setTimeout(() => {
      const statementInputs = Array.from(
        document.querySelectorAll(
          'input[type="file"][accept*=".pdf"][accept*=".csv"][accept*=".xlsx"][accept*=".xls"]'
        )
      ) as HTMLInputElement[];
      const statementInput = statementInputs.find((input) => !input.disabled);
      statementInput?.click();
    }, 120);
  };

  const isCollapsed = onToggleCollapse ? collapsed : internalCollapsed;
  const setCollapsed = onToggleCollapse ? onToggleCollapse : setInternalCollapsed;

  useEffect(() => {
    const saved = localStorage.getItem('sidebar:collapsed');
    if (saved !== null) setCollapsed(saved === 'true');
  }, [setCollapsed]);

  useEffect(() => {
    localStorage.setItem('sidebar:collapsed', isCollapsed.toString());
  }, [isCollapsed]);

  if (!location.pathname.startsWith('/dashboard')) return null;

  // Feature-visibility filter (fail-open)
  const visibleItems = NAV_ITEMS.filter((item) => {
    const featureKey = getFeatureKeyForRoute(item.to);
    if (!featureKey) {
      if (import.meta.env.DEV && !warnedKeysRef.current.has(item.to)) {
        console.warn(`[DesktopSidebar] "${item.label}" (${item.to}) has no FeatureKey mapping.`);
        warnedKeysRef.current.add(item.to);
      }
      return true;
    }
    if (!primeState) return true;
    return primeState.featureVisibilityMap[featureKey]?.visible ?? true;
  });

  const visibleByRoute = useMemo(() => {
    const map = new Map<string, NavItem>();
    for (const item of visibleItems) map.set(item.to, item);
    return map;
  }, [visibleItems]);
  const primaryItems = [
    { to: '/dashboard/prime-chat', label: 'Prime' },
    { to: '/dashboard/transactions', label: 'Transactions' },
    { to: '/dashboard/smart-categories', label: 'Categories' },
    { to: '/dashboard/ai-results', label: 'My Story' },
  ]
    .map((entry) => {
      const base = visibleByRoute.get(entry.to);
      if (!base) return null;
      return { ...base, label: entry.label };
    })
    .filter(Boolean) as NavItem[];
  const moreItems = [
    '/dashboard/analytics-ai',
    '/dashboard/reports',
    '/dashboard/bank-accounts',
    '/dashboard/goal-concierge',
    '/dashboard/spending-predictions',
    '/dashboard/financial-therapist',
    '/dashboard/personal-podcast',
    '/dashboard/tax-assistant',
    '/dashboard/settings',
  ]
    .map((route) => visibleByRoute.get(route))
    .filter(Boolean) as NavItem[];

  const handleToggleCollapse = () => setCollapsed(!isCollapsed);
  const renderNavItem = (item: NavItem, dimmed = false) => {
    const active = isActivePath(location.pathname, item.to);
    const otherBadge = item.to === '/dashboard/smart-categories' ? (tagStats.uncategorizedCount || 0) : 0;
    return (
      <NavLink
        key={item.to}
        to={item.to}
        className={clsx(
          'flex items-center gap-2.5 px-3.5 py-2 text-[12px] cursor-pointer transition-all border-l-2 border-transparent rounded-r-lg mr-1.5',
          active
            ? 'text-violet-300 border-l-violet-500 bg-violet-500/10'
            : dimmed
            ? 'text-slate-600 hover:text-slate-400 hover:bg-white/[0.03]'
            : 'text-slate-500 hover:text-slate-300 hover:bg-white/[0.03]'
        )}
      >
        <span className="w-4 h-4 shrink-0">{item.icon}</span>
        {!isCollapsed && <span className="truncate">{item.label}</span>}
        {!isCollapsed && item.to === '/dashboard/ai-results' && (
          <span className="ml-auto rounded-full border border-violet-500/30 bg-violet-500/15 px-1.5 py-0.5 text-[8px] font-bold text-violet-300">
            New
          </span>
        )}
        {!isCollapsed && !!otherBadge && item.to === '/dashboard/smart-categories' && (
          <span className="ml-auto rounded-full border border-amber-500/30 bg-amber-500/12 px-1.5 py-0.5 text-[8px] font-bold text-amber-300">
            Other
          </span>
        )}
        {!isCollapsed && item.badge === 'soon' && (
          <span className="ml-auto rounded-full border border-slate-700 bg-slate-800/60 px-1.5 py-0.5 text-[8px] font-bold text-slate-500">
            Soon
          </span>
        )}
      </NavLink>
    );
  };

  return (
    <aside
      data-testid="desktop-sidebar"
      className={clsx(
        'hidden md:flex flex-col border-r border-zinc-800/80 bg-zinc-950/55 backdrop-blur-md transition-all duration-300 h-screen relative z-[100]',
        isCollapsed ? 'w-[68px]' : 'w-56'
      )}
    >
      <div className="h-14 flex items-center justify-between px-3 border-b border-zinc-800/80">
        {isCollapsed ? (
          <div className="flex items-center justify-center flex-1">
            <PrimeLogoBadge size={32} showGlow />
          </div>
        ) : (
          <div className="flex items-center gap-2 px-3 pt-3 pb-3 flex-1">
            <PrimeLogoBadge size={32} showGlow />
            <span className="font-bold tracking-wide text-sm text-slate-50">XspensesAI</span>
          </div>
        )}
        <button
          onClick={handleToggleCollapse}
          className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-all duration-200"
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      <ScrollArea className="flex-1 overflow-y-auto">
        <div className="py-2">
          <div className="mt-3 px-2 space-y-1">
            {primaryItems.map((item) =>
              isCollapsed ? (
                <TooltipProvider key={item.to}>
                  <Tooltip delayDuration={150}>
                    <TooltipTrigger asChild>{renderNavItem(item)}</TooltipTrigger>
                    <TooltipContent side="right" className="text-xs">{item.label}</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ) : (
                renderNavItem(item)
              )
            )}
            <button
              type="button"
              onClick={() => setMoreOpen((v) => !v)}
              className={clsx(
                'w-full flex items-center gap-2.5 px-3.5 py-2 text-[12px] cursor-pointer transition-all border-l-2 border-transparent rounded-r-lg mr-1.5',
                'text-slate-500 hover:text-slate-300 hover:bg-white/[0.03]'
              )}
            >
              <span className="w-4 h-4 shrink-0">…</span>
              {!isCollapsed && <span className="truncate">More</span>}
            </button>
            {!isCollapsed && (
              <div
                className={clsx(
                  'overflow-hidden transition-all duration-300',
                  moreOpen ? 'max-h-[320px] opacity-100' : 'max-h-0 opacity-0'
                )}
              >
                <div className="pt-1 space-y-1">
                  {moreItems.map((item) => renderNavItem(item, true))}
                </div>
              </div>
            )}
          </div>

          {isCollapsed ? (
            <div className="px-2 mt-3 space-y-1">
              {[
                { id: 'prime-boss', name: 'Prime', role: 'Advisor', initials: 'P', style: 'bg-amber-500/20 border-amber-500/30 text-amber-400', online: true },
                { id: 'tag-ai', name: 'Tag', role: 'Categorizer', initials: 'T', style: 'bg-violet-500/20 border-violet-500/30 text-violet-300', online: true },
                { id: 'crystal-ai', name: 'Crystal', role: 'Insights', initials: 'C', style: 'bg-sky-500/15 border-sky-500/20 text-sky-400', online: false },
                { id: 'byte-docs', name: 'Byte', role: 'Documents', initials: 'B', style: 'bg-orange-500/15 border-orange-500/20 text-orange-400', online: false },
              ].map((agent) => (
                <TooltipProvider key={`collapsed-team-${agent.id}`}>
                  <Tooltip delayDuration={120}>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={() => openChat({ initialEmployeeSlug: agent.id, force: true })}
                        className="w-full flex items-center justify-center rounded-lg py-1.5 hover:bg-white/[0.03]"
                        aria-label={`Open ${agent.name}`}
                      >
                        <span className={clsx('relative w-6 h-6 rounded-full text-[9px] font-bold border flex items-center justify-center', agent.style)}>
                          {agent.initials}
                          <span
                            className={clsx(
                              'absolute -right-0.5 -bottom-0.5 w-1.5 h-1.5 rounded-full border border-zinc-950',
                              agent.online ? 'bg-emerald-400' : 'bg-slate-700'
                            )}
                          />
                        </span>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="text-xs">
                      {agent.name} - {agent.role}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ))}
            </div>
          ) : (
            <>
              <div className="px-2 mt-3">
                <button
                  type="button"
                  onClick={() => {
                    openChat({
                      initialEmployeeSlug: 'prime-boss',
                      force: true,
                      context: {
                        data: { source: 'sidebar-upload', intent: 'upload' },
                      },
                      routeHint: '/dashboard/prime-chat',
                    });
                    triggerPrimeUpload('sidebar');
                  }}
                  className="w-full rounded-xl border border-violet-500/30 bg-gradient-to-br from-violet-500/20 to-indigo-500/15 p-3 text-left"
                >
                  <div className="flex items-center gap-2 text-violet-300 text-[11px] font-semibold">
                    <Upload className="w-3.5 h-3.5" />
                    Upload statement
                  </div>
                  <div className="mt-1 text-[9px] text-slate-600">Byte processes in seconds</div>
                </button>
              </div>

              <div className="px-3 mt-3 mb-1 text-[9px] uppercase text-slate-700 tracking-wide">AI Team</div>
              <div className="px-2 space-y-1">
                {[
                  { id: 'prime-boss', name: 'Prime', role: 'Advisor', initials: 'P', style: 'bg-amber-500/20 border-amber-500/30 text-amber-400', online: true },
                  { id: 'tag-ai', name: 'Tag', role: 'Categorizer', initials: 'T', style: 'bg-violet-500/20 border-violet-500/30 text-violet-300', online: true },
                  { id: 'crystal-ai', name: 'Crystal', role: 'Insights', initials: 'C', style: 'bg-sky-500/15 border-sky-500/20 text-sky-400', online: false },
                  { id: 'byte-docs', name: 'Byte', role: 'Documents', initials: 'B', style: 'bg-orange-500/15 border-orange-500/20 text-orange-400', online: false },
                ].map((agent) => (
                  <button
                    key={`team-${agent.id}`}
                    type="button"
                    onClick={() => openChat({ initialEmployeeSlug: agent.id, force: true })}
                    className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-white/[0.03] text-left"
                  >
                    <span className={clsx('w-6 h-6 rounded-full text-[9px] font-bold border flex items-center justify-center', agent.style)}>{agent.initials}</span>
                    <div className="min-w-0">
                      <div className="text-[11px] text-slate-500">{agent.name}</div>
                      <div className="text-[9px] text-slate-700">{agent.role}</div>
                    </div>
                    <span className={clsx('ml-auto w-1.5 h-1.5 rounded-full', agent.online ? 'bg-emerald-400' : 'bg-slate-700')} />
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </ScrollArea>

      <div className="border-t border-zinc-800 p-3">
        {isCollapsed ? (
          <button
            onClick={() => openPanel('account')}
            className="flex justify-center w-full p-2 rounded-lg hover:bg-zinc-800/50 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-purple-500/50"
            aria-label="Open Account Center"
          >
            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center ring-2 ring-white/10">
              <span className="text-white text-xs font-bold">{profile.avatarInitials}</span>
            </div>
          </button>
        ) : (
          <div className="flex items-center gap-2.5 px-1">
            <button
              onClick={() => openPanel('account')}
              className="w-7 h-7 rounded-full bg-violet-500/25 border border-violet-500/40 text-[10px] font-bold text-violet-300 flex items-center justify-center"
              aria-label="Open Account Center"
            >
              {profile.avatarInitials}
            </button>
            <div className="min-w-0">
              <div className="text-[11px] text-slate-500 truncate">{profile.fullName}</div>
              <div className="text-[9px] text-slate-700 truncate">{profile.plan}</div>
            </div>
            <button
              type="button"
              onClick={() => navigate('/dashboard/settings')}
              className="ml-auto text-slate-700 hover:text-slate-400"
              aria-label="Open settings"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
