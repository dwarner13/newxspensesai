/**
 * Desktop Sidebar Component
 * Uses NAV_ITEMS from nav-registry.tsx as single source of truth
 * Supports collapsed/expanded states with tooltips
 */

import React, { useEffect, useState } from 'react';
import { useLocation, NavLink } from 'react-router-dom';
import NAV_ITEMS from '../../navigation/nav-registry';
import { isActivePath } from '../../navigation/is-active';
import { EMPLOYEES } from '../../data/aiEmployees';

type NavItem = {
  label: string;
  to: string;
  icon: React.ReactElement;
  group: string;
  description?: string;
};
import { ScrollArea } from '../ui/scroll-area';
import { Separator } from '../ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Logo from '../common/Logo';
import { PrimeLogoBadge } from '../branding/PrimeLogoBadge';
import clsx from 'clsx';

interface DesktopSidebarProps {
  collapsed?: boolean;
  onToggleCollapse?: (collapsed: boolean) => void;
}

// Map routes to AI employees
const getAIEmployeeForRoute = (route: string) => {
  const routeToEmployee: Record<string, string> = {
    '/dashboard': 'prime',
    '/dashboard/prime-chat': 'prime',
    '/dashboard/smart-import-ai': 'byte',
    '/dashboard/ai-chat-assistant': 'finley',
    '/dashboard/ai-financial-assistant': 'finley',
    '/dashboard/smart-categories': 'tag',
    '/dashboard/analytics-ai': 'dash',
    '/dashboard/transactions': 'byte',
    '/dashboard/goal-concierge': 'goalie',
    '/dashboard/smart-automation': 'automa',
    '/dashboard/spending-predictions': 'crystal',
    '/dashboard/debt-payoff-planner': 'liberty',
    '/dashboard/ai-financial-freedom': 'liberty',
    '/dashboard/bill-reminders': 'chime',
    '/dashboard/personal-podcast': 'roundtable',
    '/dashboard/financial-story': 'roundtable',
    '/dashboard/financial-therapist': 'harmony',
    '/dashboard/wellness-studio': 'harmony',
    '/dashboard/spotify': 'wave',
    '/dashboard/tax-assistant': 'ledger',
    '/dashboard/business-intelligence': 'intelia',
    '/dashboard/analytics': 'dash',
    '/dashboard/settings': 'prime',
    '/dashboard/reports': 'prism'
  };
  
  return routeToEmployee[route] || 'prime';
};

export default function DesktopSidebar({ 
  collapsed = false, 
  onToggleCollapse 
}: DesktopSidebarProps) {
  const location = useLocation();
  const [internalCollapsed, setInternalCollapsed] = useState(collapsed);

  // Use external collapsed state if provided, otherwise use internal
  const isCollapsed = onToggleCollapse ? collapsed : internalCollapsed;
  const setCollapsed = onToggleCollapse ? onToggleCollapse : setInternalCollapsed;

  // Load collapsed state from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('sidebar:collapsed');
    if (saved !== null) {
      const collapsedState = saved === 'true';
      setCollapsed(collapsedState);
    }
  }, [setCollapsed]);

  // Save collapsed state to localStorage
  useEffect(() => {
    localStorage.setItem('sidebar:collapsed', isCollapsed.toString());
  }, [isCollapsed]);

  // Only show sidebar on dashboard routes
  if (!location.pathname.startsWith('/dashboard')) {
    return null;
  }

  // Group items by their group property
  const groups = Object.entries(
    NAV_ITEMS.reduce((acc, item) => {
      const group = item.group ?? 'GENERAL';
      if (!acc[group]) {
        acc[group] = [];
      }
      acc[group].push(item);
      return acc;
    }, {} as Record<string, NavItem[]>)
  );

  const handleToggleCollapse = () => {
    const newCollapsed = !isCollapsed;
    setCollapsed(newCollapsed);
  };

  return (
    <aside
      data-testid="desktop-sidebar"
      className={clsx(
        "hidden md:flex flex-col border-r border-zinc-800 bg-zinc-950/40 backdrop-blur transition-all duration-300 h-screen relative z-[100]",
        isCollapsed ? "w-[68px]" : "w-56"
      )}
      style={{ pointerEvents: 'auto', position: 'relative' }}
    >
      {/* Header with Logo and Toggle Button */}
      <div className="h-14 flex items-center justify-between px-3 border-b border-zinc-800">
        {isCollapsed ? (
          <div className="flex items-center justify-center flex-1">
            <PrimeLogoBadge size={32} showGlow={true} />
          </div>
        ) : (
          <div className="flex items-center gap-2 px-4 pt-4 pb-3 flex-1">
            <PrimeLogoBadge size={32} showGlow={true} />
            <span className="font-bold tracking-wide text-sm text-slate-50">
              XspensesAI
            </span>
          </div>
        )}
        
        <button
          onClick={handleToggleCollapse}
          className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-all duration-200"
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      <ScrollArea className="flex-1 overflow-y-auto" style={{ pointerEvents: 'auto' }}>
        <div className="py-2" style={{ pointerEvents: 'auto' }}>
          {groups.map(([groupName, groupItems], groupIndex) => (
            <div key={groupName}>
              {!isCollapsed && (
                <div className="px-3 pt-3 pb-1 text-[10px] uppercase tracking-wide text-zinc-500 font-semibold">
                  {groupName}
                </div>
              )}
              <div className="px-2 space-y-1">
                {groupItems.map((item) => {
                  const active = isActivePath(location.pathname, item.to);
                  const employeeKey = getAIEmployeeForRoute(item.to);
                  const employee = EMPLOYEES.find(emp => emp.key === employeeKey);
                  
                  const NavLinkContent = (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      className={({ isActive }) => clsx(
                        "w-full flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-all duration-200 hover:bg-zinc-900/60 active:scale-95 group relative cursor-pointer",
                        (isActive || active)
                          ? "bg-zinc-900 text-white" 
                          : "text-zinc-300 hover:text-white"
                      )}
                      style={{ pointerEvents: 'auto', zIndex: 101, position: 'relative' }}
                    >
                      <span className="w-5 h-5 shrink-0 relative pointer-events-none">
                        {item.icon}
                        {/* AI Employee Badge */}
                        {employee && (
                          <div className="absolute -top-1 -right-1 w-3 h-3 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-xs opacity-80 group-hover:opacity-100 transition-opacity pointer-events-none">
                            {employee.emoji}
                          </div>
                        )}
                      </span>
                      {!isCollapsed && (
                        <span className="truncate font-medium pointer-events-none">{item.label}</span>
                      )}
                    </NavLink>
                  );

                  return isCollapsed ? (
                    <TooltipProvider key={item.to}>
                      <Tooltip delayDuration={150}>
                        <TooltipTrigger asChild>
                          {NavLinkContent}
                        </TooltipTrigger>
                        <TooltipContent side="right" className="text-xs">
                          {item.label}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ) : (
                    NavLinkContent
                  );
                })}
              </div>
              {groupIndex < groups.length - 1 && (
                <div className="my-2">
                  <Separator className="bg-zinc-900/60" />
                </div>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Footer with user info */}
      <div className="border-t border-zinc-800 p-3">
        {isCollapsed ? (
          <div className="flex justify-center">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
              <span className="text-white text-xs font-bold">DW</span>
            </div>
          </div>
        ) : (
          <div className="p-3 bg-gradient-to-br from-purple-600 to-cyan-500 rounded-xl border border-purple-500/30">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs font-bold">DW</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-white text-sm truncate">Darrell Warner</div>
                <div className="text-xs text-white/80 truncate">Premium Member</div>
              </div>
            </div>
            <div className="mt-2 flex justify-center">
              <div className="bg-gradient-to-r from-purple-500/20 to-blue-500/20 border border-purple-500/30 text-white px-2 py-1 rounded text-xs font-medium backdrop-blur-sm text-center">
                Level 8 Money Master
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
