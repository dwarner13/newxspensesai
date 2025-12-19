/**
 * PrimeTeamPanel Component
 * 
 * Slide-in panel showing AI Employee Directory & Status
 * Opens when "Team" button is clicked in PrimeUnifiedCard
 * Uses the new PrimeTeamSlideoutContent component for the floating card design
 */

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DesktopChatSideBar from '../chat/DesktopChatSideBar';
import { PrimeTeamSlideoutContent, type PrimeEmployee as SlideoutEmployee } from './PrimeTeamSlideoutContent';
import { PrimeSlideoutShell } from './PrimeSlideoutShell';
import { PrimeTeamContent } from './PrimeTeamContent';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export type PrimePanelBaseProps = {
  isOpen: boolean;
  onClose: () => void;
};

type PrimeEmployee = {
  id: string;
  name: string;
  slug: string;
  role: string;
  emoji: string;
  status: 'online' | 'idle' | 'busy';
  lastTask: string;
  lastUpdated: string;
};

const PRIME_EMPLOYEES: PrimeEmployee[] = [
  {
    id: 'byte',
    name: 'Byte',
    slug: 'byte-docs',
    role: 'Smart Import AI',
    emoji: '📄',
    status: 'online',
    lastTask: 'Processed 24 new transactions',
    lastUpdated: '12 min ago',
  },
  {
    id: 'finley',
    name: 'Finley',
    slug: 'finley-forecasts',
    role: 'AI Chat Assistant',
    emoji: '💬',
    status: 'online',
    lastTask: 'Finished a coaching chat',
    lastUpdated: '8 min ago',
  },
  {
    id: 'tag',
    name: 'Tag',
    slug: 'tag-ai',
    role: 'Smart Categories',
    emoji: '🏷️',
    status: 'online',
    lastTask: 'Auto-categorized 18 transactions',
    lastUpdated: '5 min ago',
  },
  {
    id: 'crystal',
    name: 'Crystal',
    slug: 'crystal-ai',
    role: 'Analytics AI',
    emoji: '📊',
    status: 'idle',
    lastTask: 'Detected a spending pattern',
    lastUpdated: '2 hours ago',
  },
  {
    id: 'liberty',
    name: 'Liberty',
    slug: 'liberty-ai',
    role: 'Debt & Freedom AI',
    emoji: '🗽',
    status: 'online',
    lastTask: 'Updated your debt payoff plan',
    lastUpdated: '1 hour ago',
  },
  {
    id: 'blitz',
    name: 'Spark',
    slug: 'blitz-debt',
    role: 'Debt Payoff & Savings',
    emoji: '🔥',
    status: 'busy',
    lastTask: 'Analyzing debt consolidation options',
    lastUpdated: '3 min ago',
  },
  {
    id: 'goalie',
    name: 'Goalie',
    slug: 'goalie-goals',
    role: 'Goals & Savings AI',
    emoji: '🥅',
    status: 'online',
    lastTask: 'Updated savings goal progress',
    lastUpdated: '1 hour ago',
  },
];

// Map existing employee data to the new format
const mapToSlideoutEmployees = (employees: PrimeEmployee[]): SlideoutEmployee[] => {
  return employees.map(emp => ({
    id: emp.id,
    name: emp.name,
    role: emp.role,
    status: emp.status === 'online' ? 'online' : emp.status === 'busy' ? 'busy' : emp.status === 'idle' ? 'idle' : 'offline',
    lastActive: emp.lastUpdated,
    // Extract task count from lastTask if it contains a number
    tasksToday: parseInt(emp.lastTask.match(/\d+/)?.[0] || '0') || undefined,
  }));
};

export const PrimeTeamPanel: React.FC<PrimePanelBaseProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<'all' | 'online' | 'idle' | 'busy'>('all');
  
  // Handle Escape key to close panel
  useEffect(() => {
    if (!isOpen) return;
    
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);
  
  if (!isOpen) return null;

  // Map employees to new format
  const slideoutEmployees = mapToSlideoutEmployees(PRIME_EMPLOYEES);

  // Handle filter change - map 'active' to 'online' for the new component
  const handleFilterChange = (newFilter: 'all' | 'online' | 'idle' | 'busy') => {
    setFilter(newFilter);
  };

  const handleOpenWorkspace = (employeeSlug: string) => {
    // Navigate to the employee's workspace page
    // Using a pattern that matches existing navigation
    if (employeeSlug === 'byte-docs') {
      navigate('/dashboard/smart-import-ai');
    } else if (employeeSlug === 'tag-ai') {
      navigate('/dashboard/smart-categories');
    } else {
      // Default: navigate to prime chat with employee parameter
      navigate(`/dashboard/prime-chat?employee=${employeeSlug}`);
    }
    onClose();
  };

  // Handle employee click - map back to original employee and navigate
  const handleEmployeeClick = (employee: SlideoutEmployee) => {
    const originalEmployee = PRIME_EMPLOYEES.find(emp => emp.id === employee.id);
    if (originalEmployee) {
      handleOpenWorkspace(originalEmployee.slug);
    }
  };

  // Filter employees
  const filtered =
    filter === 'all'
      ? slideoutEmployees
      : slideoutEmployees.filter((e) => e.status === filter);

  // Calculate stats for header badge
  const onlineCount = slideoutEmployees.filter((e) => e.status === 'online').length;
  const busyCount = slideoutEmployees.filter((e) => e.status === 'busy').length;
  const idleCount = slideoutEmployees.filter((e) => e.status === 'idle').length;
  const offlineCount = slideoutEmployees.filter((e) => e.status === 'offline').length;

  // Header actions (heatmap)
  const headerActions = (
    <div className="flex flex-col items-end gap-1">
      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
        Live Heatmap
      </p>
      <div className="flex items-center gap-1.5 text-[11px] text-slate-300">
        <span className="flex items-center gap-1">
          <span className="h-1.5 w-3 rounded-full bg-emerald-400/90 animate-pulse" />
          {onlineCount} online
        </span>
        <span className="flex items-center gap-1 text-amber-300/90">
          <span className="h-1.5 w-3 rounded-full bg-amber-400/80" />
          {busyCount} busy
        </span>
        <span className="flex items-center gap-1 text-slate-400">
          <span className="h-1.5 w-3 rounded-full bg-slate-500/90" />
          {idleCount} idle
        </span>
        <span className="flex items-center gap-1 text-slate-500">
          <span className="h-1.5 w-3 rounded-full bg-slate-700" />
          {offlineCount}
        </span>
      </div>
    </div>
  );

  // Footer (command bar)
  const footer = (
    <div className="flex items-center gap-3">
      <input
        placeholder="Search your AI team..."
        className="h-9 flex-1 rounded-full border border-slate-700 bg-slate-900/80 px-4 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-400/50"
      />
      <button className="h-9 rounded-full border border-slate-700 bg-slate-900/90 px-4 text-xs text-slate-200 hover:border-emerald-400/70 hover:text-emerald-300 transition">
        🔁 Refresh
      </button>
      <button className="h-9 rounded-full bg-gradient-to-r from-emerald-500 via-cyan-400 to-sky-500 px-4 text-xs font-semibold text-slate-950 shadow-[0_8px_25px_rgba(34,197,94,0.45)] hover:brightness-110">
        ✨ AI Team Actions
      </button>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Panel + docked rail */}
      <div className="relative z-50 h-full flex items-stretch">
        {/* Docked action rail - LEFT side */}
        <div className="hidden md:flex h-full items-center">
          <DesktopChatSideBar dockedToPanel />
        </div>
        
        {/* Shell wrapper */}
        <div className="relative h-full w-full">
          <PrimeSlideoutShell
            title="PRIME TEAM"
            subtitle="AI Employees · Live"
            icon={<span>👑</span>}
            headerActions={headerActions}
            onClose={onClose}
            footer={footer}
          >
            {/* Filters */}
            <div className="px-6 pt-4 pb-2 border-b border-slate-800/70">
              <div className="flex flex-wrap gap-2">
                {[
                  { id: 'all', label: 'All' },
                  { id: 'online', label: 'Active' },
                  { id: 'idle', label: 'Idle' },
                  { id: 'busy', label: 'Busy' },
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => handleFilterChange(f.id as 'all' | 'online' | 'idle' | 'busy')}
                    className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition ${
                      filter === f.id
                        ? 'border-emerald-400/70 bg-emerald-500/10 text-emerald-300'
                        : 'border-slate-700 bg-slate-900/60 text-slate-300 hover:border-slate-500 hover:bg-slate-900'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Employee cards */}
            <div className="px-6 py-4">
              {filtered.length > 0 ? (
                <PrimeTeamContent
                  employees={filtered}
                  onEmployeeClick={handleEmployeeClick}
                />
              ) : (
                <div className="mt-10 flex flex-col items-center justify-center text-center text-sm text-slate-400">
                  <p>No employees match this filter right now.</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Try switching to &quot;All&quot; or &quot;Active&quot;.
                  </p>
                </div>
              )}
            </div>
          </PrimeSlideoutShell>
        </div>
      </div>
    </div>
  );
};
