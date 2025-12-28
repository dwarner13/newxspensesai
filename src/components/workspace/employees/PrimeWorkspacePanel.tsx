/**
 * PrimeWorkspacePanel Component
 * 
 * Left sidebar panel for Prime workspace showing command center status
 * Now uses live data from usePrimeLiveStats hook
 */

import React, { useState, useRef, useEffect } from 'react';
import { Crown, Settings, Users, RefreshCw, Brain, PlugZap } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../ui/card';
import { usePrimeLiveStats } from '../../../hooks/usePrimeLiveStats';
import { getEmployeeInfo } from '../../../utils/employeeUtils';
import { PrimeRightPanel } from '../../prime/PrimeRightPanel';
import { PrimeTeamStatusPanel } from '../../prime/panels/PrimeTeamStatusPanel';
import { PrimeSettingsPanel } from '../../prime/panels/PrimeSettingsPanel';
import { PrimeMemoryCenterPanel } from '../../prime/panels/PrimeMemoryCenterPanel';
import { PrimeToolsIntegrationsPanel } from '../../prime/panels/PrimeToolsIntegrationsPanel';
import { useActivityFeed } from '../../../hooks/useActivityFeed';
import { cn } from '../../../lib/utils';
import { PrimeLogoBadge } from '../../branding/PrimeLogoBadge';

export interface PrimeEmployee {
  slug: string;
  name: string;
  role: string;
  icon?: string;
  status?: 'online' | 'idle' | 'offline';
  lastActivityAt?: string | null;
}

interface PrimeWorkspacePanelProps {
  onEmployeeClick?: (employee: PrimeEmployee) => void;
  className?: string;
}

type PrimePanelId = "team" | "settings" | "memory" | "integrations" | null;

// Number of employees to show before showing "View full AI team" button
const VISIBLE_EMPLOYEE_COUNT = 6;

export function PrimeWorkspacePanel({ onEmployeeClick, className }: PrimeWorkspacePanelProps = {}) {
  const location = useLocation();
  const isPrimeChatPage = location.pathname === '/dashboard/prime-chat';
  const { data: liveStats, isLoading, isError, refetch: refetchStats } = usePrimeLiveStats();
  const activityFeed = useActivityFeed({ category: 'prime', pollMs: 60000 });
  
  // Track if we're currently refreshing (only true during actual refetch)
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  
  // Prime Tools panel state
  const [currentPanel, setCurrentPanel] = useState<PrimePanelId>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  
  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    
    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [menuOpen]);
  
  const openPrimeTools = (panel: PrimePanelId) => {
    setCurrentPanel(panel);
    setMenuOpen(false);
  };
  
  const closePrimeTools = () => {
    setCurrentPanel(null);
  };
  
  // Actions for dropdown menu
  const actions = [
    {
      id: 'team-stats',
      label: 'View Team Stats',
      icon: Users,
      onClick: () => openPrimeTools("team"),
    },
    {
      id: 'refresh-status',
      label: isRefreshing || activityFeed.isLoading
        ? 'Refreshing...'
        : 'Refresh System Status',
      icon: RefreshCw,
      onClick: async () => {
        setIsRefreshing(true);
        try {
          await Promise.all([
            refetchStats(),
            activityFeed.refetch(),
          ]);
        } finally {
          setIsRefreshing(false);
          setMenuOpen(false);
        }
      },
    },
    {
      id: 'prime-settings',
      label: 'Prime Settings',
      icon: Settings,
      onClick: () => openPrimeTools("settings"),
    },
    {
      id: 'memory-center',
      label: 'Memory Center',
      icon: Brain,
      onClick: () => openPrimeTools("memory"),
    },
    {
      id: 'tools-integrations',
      label: 'Tools & Integrations',
      icon: PlugZap,
      onClick: () => openPrimeTools("integrations"),
    },
  ];

  // Map employee slugs to emojis/icons (fallback if not in liveStats)
  const getEmployeeEmoji = (slug: string): string => {
    const employeeInfo = getEmployeeInfo(slug);
    return employeeInfo.emoji || '🤖';
  };

  // Get status for an employee by slug
  const getEmployeeStatus = (slug: string): 'online' | 'idle' | 'offline' => {
    if (!liveStats) return 'offline';
    const employee = liveStats.employees.find(e => e.slug === slug);
    return employee?.status || 'offline';
  };

  // Get employee name and role from liveStats or fallback
  const getEmployeeDisplay = (slug: string): { name: string; role: string } => {
    if (liveStats) {
      const employee = liveStats.employees.find(e => e.slug === slug);
      if (employee) {
        return { name: employee.name, role: employee.role };
      }
    }
    // Fallback to employeeUtils
    const employeeInfo = getEmployeeInfo(slug);
    return { name: employeeInfo.name, role: employeeInfo.role };
  };

  // Build list of employees to display (use liveStats if available, otherwise fallback list)
  const aiAgents = React.useMemo(() => {
    if (liveStats && liveStats.employees.length > 0) {
      // Use live data from backend
      return liveStats.employees.map(emp => ({
        slug: emp.slug,
        name: emp.name,
        role: emp.role,
        icon: getEmployeeEmoji(emp.slug),
        status: emp.status,
      }));
    }

    // Fallback: show common employees with offline status while loading
    const fallbackAgents = [
      { slug: 'byte-docs', name: 'Byte', role: 'Smart Import AI', icon: '📄' },
      { slug: 'tag-ai', name: 'Tag', role: 'Smart Categories', icon: '🏷️' },
      { slug: 'crystal-analytics', name: 'Crystal', role: 'Analytics AI', icon: '🔮' },
      { slug: 'goalie-goals', name: 'Goalie', role: 'Goal Concierge', icon: '🥅' },
      { slug: 'liberty-freedom', name: 'Liberty', role: 'Financial Freedom', icon: '🕊️' },
    ];

    return fallbackAgents.map(agent => ({
      ...agent,
      status: 'offline' as const,
    }));
  }, [liveStats]);

  // Count online employees
  const onlineCount = liveStats?.onlineEmployees || 0;
  const totalCount = liveStats?.totalEmployees || aiAgents.length;

  // Limit visible employees
  const visibleEmployees = aiAgents.slice(0, VISIBLE_EMPLOYEE_COUNT);
  const hasMoreEmployees = aiAgents.length > VISIBLE_EMPLOYEE_COUNT;
  const remainingCount = Math.max(aiAgents.length - VISIBLE_EMPLOYEE_COUNT, 0);

  return (
    <Card className={cn(`${isPrimeChatPage ? '' : 'h-full'} w-full flex flex-col bg-slate-900 border-slate-800`, className)}>
      <CardHeader className="pb-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <PrimeLogoBadge size={40} showGlow={false} />
            <div>
              <CardTitle className="text-sm tracking-[0.18em] text-slate-400 uppercase">
                PRIME WORKSPACE
              </CardTitle>
              <CardDescription className="text-sm text-slate-300">
                Command Center Status
              </CardDescription>
            </div>
          </div>
          {/* Prime Tools Button - Opens dropdown menu */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium
                         bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-amber-500/30 
                         text-slate-300 hover:text-white transition-all"
              title="Prime Tools"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Tools</span>
            </button>
            
            {/* Dropdown Menu */}
            {menuOpen && (
              <div className="absolute right-0 top-full mt-2 w-64 rounded-xl bg-slate-900 border border-slate-700/70 shadow-xl shadow-slate-900/40 p-2 space-y-1 z-50">
                <div className="mb-2 flex items-center justify-between px-2">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Prime Tools
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                    Command Center
                  </span>
                </div>

                {actions.map((action) => {
                  const Icon = action.icon;

                  return (
                    <button
                      key={action.id}
                      type="button"
                      onClick={action.onClick}
                      disabled={action.id === 'refresh-status' && (isRefreshing || activityFeed.isLoading)}
                      className="w-full flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm text-slate-100 hover:bg-slate-800/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-800 border border-slate-700/70">
                        <Icon className={cn(
                          "h-3.5 w-3.5",
                          action.id === 'refresh-status' && (isRefreshing || activityFeed.isLoading) && "animate-spin"
                        )} />
                      </span>
                      <span className="flex-1 text-left">{action.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col pt-4 min-h-0">
        {/* Active Employees Section */}
        <div className="flex items-center justify-between mb-4 flex-shrink-0">
          <h4 className="text-sm font-medium text-white">Active Employees</h4>
          <span className="text-xs bg-green-500/20 text-green-300 px-2 py-1 rounded-full flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span>
            Live
          </span>
        </div>
        
        {/* AI Agents List - Takes available space */}
        {/* CRITICAL: On /dashboard/prime-chat, NO nested scroll container - BODY is scroll owner */}
        {/* Remove overflow-y-auto on /dashboard/prime-chat to prevent nested scroll lock */}
        <div 
          className={`flex-1 min-h-0 space-y-2 ${isPrimeChatPage ? 'overflow-visible' : 'overflow-y-auto'}`}
        >
          {isLoading && visibleEmployees.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-xs text-slate-400 animate-pulse">Loading status...</p>
            </div>
          ) : isError ? (
            <div className="text-center py-2">
              <p className="text-xs text-slate-500">Status temporarily unavailable</p>
            </div>
          ) : (
            <>
              {visibleEmployees.map((agent) => {
                const status = agent.status || 'offline';
                const isOnline = status === 'online';
                const isIdle = status === 'idle';
                
                const employee: PrimeEmployee = {
                  slug: agent.slug,
                  name: agent.name,
                  role: agent.role,
                  icon: agent.icon,
                  status: agent.status,
                  lastActivityAt: liveStats?.employees.find(e => e.slug === agent.slug)?.lastActivityAt || null,
                };

                return (
                  <div 
                    key={agent.slug || agent.name}
                    onClick={() => onEmployeeClick?.(employee)}
                    className="flex items-center gap-2 p-2 bg-slate-800/50 rounded-lg border border-slate-700/50 hover:border-slate-600 hover:bg-slate-800/70 hover:shadow-[0_0_12px_rgba(251,191,36,0.15)] transition-all duration-200 cursor-pointer"
                  >
                    {/* Icon - fixed size */}
                    <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm">{agent.icon}</span>
                    </div>
                    
                    {/* Name - truncate */}
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-medium text-white truncate">{agent.name}</p>
                      <p className="text-[9px] text-slate-400 truncate">{agent.role}</p>
                    </div>
                    
                    {/* Status - fixed width, short text */}
                    <div className="flex items-center gap-1 flex-shrink-0 w-12">
                      <span 
                        className={`w-1.5 h-1.5 rounded-full ${
                          isOnline 
                            ? 'bg-green-400' 
                            : isIdle 
                              ? 'bg-slate-500' 
                              : 'bg-slate-600'
                        }`}
                      />
                      <span 
                        className={`text-[9px] ${
                          isOnline 
                            ? 'text-green-400' 
                            : isIdle 
                              ? 'text-amber-400' 
                              : 'text-slate-500'
                        }`}
                      >
                        {isOnline ? 'On' : isIdle ? 'Idle' : 'Off'}
                      </span>
                    </div>
                  </div>
                );
              })}

              {/* View full AI team button */}
              {hasMoreEmployees && (
                <button
                  type="button"
                  onClick={() => {
                    // Open the team stats panel to show full team
                    openPrimeTools("team");
                  }}
                  className="mt-1 w-full inline-flex items-center justify-center text-xs text-slate-400 hover:text-slate-200 transition-colors py-2 px-2 rounded-lg hover:bg-slate-800/50 border border-slate-700/50 hover:border-slate-600"
                >
                  View full AI team · {remainingCount} more
                </button>
              )}
            </>
          )}
        </div>

        {/* AI Team Status - Pinned to bottom */}
        <div className="pt-3 mt-3 flex-shrink-0 border-t border-slate-800/60">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>AI Team Status</span>
            {isLoading ? (
              <span className="text-slate-500 animate-pulse">Loading...</span>
            ) : isError ? (
              <span className="text-slate-500">Unavailable</span>
            ) : (
              <span className={`${onlineCount > 0 ? 'text-green-400' : 'text-slate-500'}`}>
                {onlineCount}/{totalCount} Online
              </span>
            )}
          </div>
        </div>
      </CardContent>
      
      {/* Prime Tools Right-side Slideout Panels */}
      <PrimeRightPanel
        title={
          currentPanel === "team"
            ? "AI Team Status"
            : currentPanel === "settings"
            ? "Prime Settings"
            : currentPanel === "memory"
            ? "Prime Memory Center"
            : currentPanel === "integrations"
            ? "Tools & Integrations"
            : ""
        }
        description={
          currentPanel === "team"
            ? "See which employees are online and what they're working on."
            : currentPanel === "settings"
            ? "Tune how Prime behaves as your AI CEO."
            : currentPanel === "memory"
            ? "Review and manage what Prime remembers about you."
            : currentPanel === "integrations"
            ? "Manage the data sources and tools Prime can use."
            : undefined
        }
        open={currentPanel !== null}
        onClose={closePrimeTools}
      >
        {currentPanel === "team" && <PrimeTeamStatusPanel />}
        {currentPanel === "settings" && <PrimeSettingsPanel />}
        {currentPanel === "memory" && <PrimeMemoryCenterPanel />}
        {currentPanel === "integrations" && <PrimeToolsIntegrationsPanel />}
      </PrimeRightPanel>
    </Card>
  );
}
