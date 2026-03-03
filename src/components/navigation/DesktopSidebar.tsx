/**
 * Desktop Sidebar
 * Uses NAV_ITEMS from nav-registry.tsx as single source of truth.
 * Supports collapsed/expanded with tooltips.
 *
 * Special behaviours:
 * - PRIME group renders without a section label and uses violet accent styling
 * - "Upload statement" quick-action appears below Prime when expanded
 * - 'new' badge → violet chip    'soon' badge → grey chip
 */

import React, { useEffect, useState, useRef } from 'react';
import { useLocation, NavLink } from 'react-router-dom';
import NAV_ITEMS from '../../navigation/nav-registry';
import type { NavItem } from '../../navigation/nav-registry';
import { isActivePath } from '../../navigation/is-active';
import { EMPLOYEES } from '../../data/aiEmployees';
import { ScrollArea } from '../ui/scroll-area';
import { Separator } from '../ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { ChevronLeft, ChevronRight, Upload } from 'lucide-react';
import { PrimeLogoBadge } from '../branding/PrimeLogoBadge';
import clsx from 'clsx';
import { useAccountCenterPanel } from '../settings/AccountCenterPanel';
import { useProfile } from '../../hooks/useProfile';
import { usePrimeState } from '../../contexts/usePrimeState';
import { getFeatureKeyForRoute } from '../../navigation/feature-keys';

interface DesktopSidebarProps {
  collapsed?: boolean;
  onToggleCollapse?: (collapsed: boolean) => void;
}

// Route → AI employee key (for the micro-badge on each nav item)
const getAIEmployeeForRoute = (route: string): string => {
  const map: Record<string, string> = {
    '/dashboard':                    'prime',
    '/dashboard/prime-chat':         'prime',
    '/dashboard/transactions':       'byte',
    '/dashboard/bank-accounts':      'prime',
    '/dashboard/smart-categories':   'tag',
    '/dashboard/analytics-ai':       'dash',
    '/dashboard/analytics':          'dash',
    '/dashboard/reports':            'prism',
    '/dashboard/goal-concierge':     'goalie',
    '/dashboard/bill-reminders':     'chime',
    '/dashboard/personal-podcast':   'roundtable',
    '/dashboard/tax-assistant':      'ledger',
    '/dashboard/settings':           'prime',
  };
  return map[route] || 'prime';
};

export default function DesktopSidebar({
  collapsed = false,
  onToggleCollapse,
}: DesktopSidebarProps) {
  const location = useLocation();
  const [internalCollapsed, setInternalCollapsed] = useState(collapsed);
  const { openPanel } = useAccountCenterPanel();
  const profile = useProfile();
  const primeState = usePrimeState();
  const warnedKeysRef = useRef<Set<string>>(new Set());

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

  // Group items preserving insertion order
  const groups = Object.entries(
    visibleItems.reduce((acc, item) => {
      const g = item.group ?? 'GENERAL';
      if (!acc[g]) acc[g] = [];
      acc[g].push(item);
      return acc;
    }, {} as Record<string, NavItem[]>)
  );

  const handleToggleCollapse = () => setCollapsed(!isCollapsed);

  return (
    <aside
      data-testid="desktop-sidebar"
      className={clsx(
        'hidden md:flex flex-col border-r border-zinc-800 bg-zinc-950/40 backdrop-blur transition-all duration-300 h-screen relative z-[100]',
        isCollapsed ? 'w-[68px]' : 'w-56'
      )}
    >
      {/* ── Header ── */}
      <div className="h-14 flex items-center justify-between px-3 border-b border-zinc-800">
        {isCollapsed ? (
          <div className="flex items-center justify-center flex-1">
            <PrimeLogoBadge size={32} showGlow />
          </div>
        ) : (
          <div className="flex items-center gap-2 px-4 pt-4 pb-3 flex-1">
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

      {/* ── Nav items ── */}
      <ScrollArea className="flex-1 overflow-y-auto">
        <div className="py-2">
          {groups.map(([groupName, groupItems], groupIndex) => {
            const isPrimeGroup = groupName === 'PRIME';

            return (
              <div key={groupName}>
                {/* Section label — hidden for PRIME group */}
                {!isCollapsed && !isPrimeGroup && (
                  <div className="px-3 pt-3 pb-1 text-[10px] uppercase tracking-wide text-zinc-500 font-semibold">
                    {groupName}
                  </div>
                )}

                <div className="px-2 space-y-0.5">
                  {groupItems.map((item) => {
                    const active = isActivePath(location.pathname, item.to);
                    const employeeKey = getAIEmployeeForRoute(item.to);
                    const employee = EMPLOYEES.find((e) => e.key === employeeKey);
                    const featureKey = getFeatureKeyForRoute(item.to);
                    const visibility = featureKey && primeState?.featureVisibilityMap[featureKey];
                    const enabled = visibility?.enabled ?? true;

                    const navLinkContent = (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        onClick={(e) => {
                          if (!enabled) {
                            e.preventDefault();
                          }
                        }}
                        className={({ isActive }) => {
                          const isCurrentActive = isActive || active;
                          if (isPrimeGroup) {
                            return clsx(
                              'w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-200 group relative border',
                              isCurrentActive
                                ? 'bg-violet-500/15 border-violet-500/40 text-violet-200'
                                : 'border-violet-500/20 text-violet-300 hover:bg-violet-500/10 hover:border-violet-500/35 hover:text-violet-200',
                              !enabled && 'cursor-not-allowed opacity-50'
                            );
                          }
                          return clsx(
                            'w-full flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-all duration-200 group relative',
                            enabled
                              ? 'hover:bg-zinc-900/60 active:scale-95 cursor-pointer'
                              : 'cursor-not-allowed opacity-50',
                            isCurrentActive
                              ? 'bg-zinc-900 text-white'
                              : 'text-zinc-300 hover:text-white'
                          );
                        }}
                        style={{ pointerEvents: 'auto', position: 'relative', zIndex: 101 }}
                      >
                        {/* Icon + employee micro-badge */}
                        <span className="w-5 h-5 shrink-0 relative pointer-events-none">
                          {item.icon}
                          {employee && !isPrimeGroup && (
                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-xs opacity-80 group-hover:opacity-100 transition-opacity pointer-events-none">
                              {employee.emoji}
                            </div>
                          )}
                        </span>

                        {/* Label + badge */}
                        {!isCollapsed && (
                          <>
                            <span className="truncate font-medium pointer-events-none flex-1">
                              {item.label}
                            </span>
                            {item.badge === 'new' && (
                              <span className="shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30 tracking-wide uppercase">
                                New
                              </span>
                            )}
                            {item.badge === 'soon' && (
                              <span className="shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-zinc-800 text-zinc-500 border border-zinc-700 tracking-wide uppercase">
                                Soon
                              </span>
                            )}
                          </>
                        )}
                      </NavLink>
                    );

                    return isCollapsed ? (
                      <TooltipProvider key={item.to}>
                        <Tooltip delayDuration={150}>
                          <TooltipTrigger asChild>{navLinkContent}</TooltipTrigger>
                          <TooltipContent side="right" className="text-xs">
                            <span>{item.label}</span>
                            {item.badge && (
                              <span className="ml-1.5 opacity-60 capitalize">({item.badge})</span>
                            )}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ) : (
                      navLinkContent
                    );
                  })}
                </div>

                {/* Import quick-action — appears below Prime when expanded */}
                {isPrimeGroup && !isCollapsed && (
                  <div className="px-2 pt-1 pb-2">
                    <NavLink
                      to="/dashboard/smart-import-ai"
                      className={({ isActive }) =>
                        clsx(
                          'flex items-center gap-2 w-full px-3 py-1.5 rounded-lg text-xs font-medium transition-all border border-dashed',
                          isActive
                            ? 'border-violet-500/50 text-violet-300 bg-violet-500/5'
                            : 'border-zinc-700 text-zinc-500 hover:border-violet-500/30 hover:text-violet-400'
                        )
                      }
                    >
                      <Upload className="w-3.5 h-3.5 shrink-0" />
                      Upload statement
                    </NavLink>
                  </div>
                )}

                {groupIndex < groups.length - 1 && (
                  <div className="my-2">
                    <Separator className="bg-zinc-900/60" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>

      {/* ── Footer: identity card ── */}
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
          <button
            onClick={() => openPanel('account')}
            className="w-full p-3 rounded-xl border border-white/10 bg-gradient-to-br from-white/5 via-white/3 to-transparent backdrop-blur-sm hover:from-white/10 hover:via-white/5 hover:border-white/20 transition-all duration-200 hover:shadow-lg hover:shadow-purple-500/10 cursor-pointer focus:outline-none focus:ring-2 focus:ring-purple-500/50 group"
            aria-label="Open Account Center"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center ring-2 ring-white/10 group-hover:ring-white/20 transition-all">
                {profile.avatarUrl ? (
                  <img src={profile.avatarUrl} alt={profile.displayName} className="w-full h-full rounded-full object-cover" />
                ) : (
                  <span className="text-white text-sm font-bold">{profile.avatarInitials}</span>
                )}
              </div>
              <div className="flex-1 min-w-0 text-left">
                <div className="font-semibold text-white text-sm truncate">{profile.fullName}</div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    {profile.plan}
                  </span>
                  <span className="text-xs text-zinc-400 truncate">Level {profile.level}</span>
                </div>
              </div>
            </div>
            <div className="flex justify-center mt-2">
              <div className="bg-white/10 text-white px-2 py-0.5 rounded-md text-[10px] font-medium backdrop-blur-sm border border-white/10">
                {profile.levelTitle}
              </div>
            </div>
          </button>
        )}
      </div>
    </aside>
  );
}
