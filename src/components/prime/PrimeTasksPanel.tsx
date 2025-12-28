/**
 * PrimeTasksPanel Component
 * 
 * Slide-in panel showing Prime Task Queue & History
 * Opens when "Tasks" button is clicked in PrimeUnifiedCard
 * Uses the new PrimeTasksSlideoutContent component for the floating card design
 */

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { PrimePanelBaseProps } from './PrimeTeamPanel';
import DesktopChatSideBar from '../chat/DesktopChatSideBar';
import { PrimeTasksSlideoutContent, type PrimeTask as SlideoutTask } from './PrimeTasksSlideoutContent';
import { PrimeSlideoutShell } from './PrimeSlideoutShell';
import { PrimeTasksContent } from './PrimeTasksContent';
import { Button } from '@/components/ui/button';

type PrimeTaskStatus = 'completed' | 'in-progress' | 'failed';

type PrimeTask = {
  id: string;
  employeeName: string;
  employeeSlug: string;
  employeeEmoji: string;
  title: string;
  detail: string;
  status: PrimeTaskStatus;
  createdAt: string;
};

const PRIME_TASKS: PrimeTask[] = [
  {
    id: 't1',
    employeeName: 'Tag',
    employeeSlug: 'tag-ai',
    employeeEmoji: '🏷️',
    title: 'Categorize 18 transactions',
    detail: 'Prime asked Tag to categorize new imports from Smart Import AI.',
    status: 'completed',
    createdAt: '5 min ago',
  },
  {
    id: 't2',
    employeeName: 'Byte',
    employeeSlug: 'byte-docs',
    employeeEmoji: '📄',
    title: 'OCR & extract from PDF',
    detail: 'Prime asked Byte to read your bank statement PDF and extract transactions.',
    status: 'completed',
    createdAt: '12 min ago',
  },
  {
    id: 't3',
    employeeName: 'Crystal',
    employeeSlug: 'crystal-ai',
    employeeEmoji: '📊',
    title: 'Detect spending anomaly',
    detail: 'Prime asked Crystal to scan for unusual spending patterns this month.',
    status: 'completed',
    createdAt: '2 hours ago',
  },
  {
    id: 't4',
    employeeName: 'Liberty',
    employeeSlug: 'liberty-ai',
    employeeEmoji: '🗽',
    title: 'Update debt payoff projection',
    detail: 'Prime asked Liberty to update your Easy Financial payoff plan.',
    status: 'in-progress',
    createdAt: '1 hour ago',
  },
  {
    id: 't5',
    employeeName: 'Blitz',
    employeeSlug: 'blitz-debt',
    employeeEmoji: '⚡',
    title: 'Analyze consolidation options',
    detail: 'Prime asked Blitz to compare debt consolidation strategies.',
    status: 'in-progress',
    createdAt: '30 min ago',
  },
  {
    id: 't6',
    employeeName: 'Tag',
    employeeSlug: 'tag-ai',
    employeeEmoji: '🏷️',
    title: 'Fix category mismatch',
    detail: 'Prime asked Tag to correct a mis-categorized transaction.',
    status: 'failed',
    createdAt: '3 hours ago',
  },
];

// Map existing task data to the new format
const mapToSlideoutTasks = (tasks: PrimeTask[]): SlideoutTask[] => {
  return tasks.map(task => ({
    id: task.id,
    title: task.title,
    description: task.detail,
    status: task.status === 'in-progress' ? 'in_progress' : task.status === 'completed' ? 'completed' : task.status === 'failed' ? 'failed' : 'queued',
    employeeName: task.employeeName,
    employeeRole: task.employeeSlug === 'byte-docs' ? 'Smart Import AI' : 
                   task.employeeSlug === 'tag-ai' ? 'Smart Categories' :
                   task.employeeSlug === 'crystal-ai' ? 'Analytics AI' :
                   task.employeeSlug === 'liberty-ai' ? 'Debt & Freedom AI' :
                   task.employeeSlug === 'blitz-debt' ? 'Debt Payoff & Savings' :
                   task.employeeSlug === 'goalie-goals' ? 'Goals & Savings AI' :
                   'AI Assistant',
    ago: task.createdAt,
  }));
};

export const PrimeTasksPanel: React.FC<PrimePanelBaseProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<'all' | 'completed' | 'in_progress' | 'failed' | 'queued'>('all');
  const [selectedTask, setSelectedTask] = useState<PrimeTask | null>(null);
  const [tasks, setTasks] = useState<PrimeTask[]>(PRIME_TASKS);
  
  // Handle Escape key to close panel
  useEffect(() => {
    if (!isOpen) return;
    
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (selectedTask) {
          setSelectedTask(null);
        } else {
          onClose();
        }
      }
    };
    
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose, selectedTask]);
  
  if (!isOpen) return null;

  // Map tasks to new format
  const slideoutTasks = mapToSlideoutTasks(tasks);

  // Filter tasks
  const filtered =
    filter === 'all'
      ? slideoutTasks
      : slideoutTasks.filter((t) => t.status === filter);

  // Calculate stats for header badge
  const completed = slideoutTasks.filter((t) => t.status === 'completed').length;
  const total = slideoutTasks.length || 1;
  const completionPct = Math.round((completed / total) * 100);

  // Handle filter change
  const handleFilterChange = (newFilter: 'all' | 'completed' | 'in_progress' | 'failed' | 'queued') => {
    setFilter(newFilter);
  };

  // Handle task click - map back to original task
  const handleTaskClick = (task: SlideoutTask) => {
    const originalTask = tasks.find(t => t.id === task.id);
    if (originalTask) {
      setSelectedTask(originalTask);
    }
  };

  const handleOpenWorkspace = (employeeSlug: string) => {
    if (employeeSlug === 'byte-docs') {
      navigate('/dashboard/smart-import-ai');
    } else if (employeeSlug === 'tag-ai') {
      navigate('/dashboard/smart-categories');
    } else {
      navigate(`/dashboard/prime-chat?employee=${employeeSlug}`);
    }
    onClose();
  };

  const handleClearCompleted = () => {
    setTasks(tasks.filter(task => task.status !== 'completed'));
  };

  // Task Details Modal
  if (selectedTask) {
    return (
      <div className="fixed inset-0 z-50 flex justify-end">
        <div
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={() => setSelectedTask(null)}
        />
        <aside className="relative h-full w-full max-w-md bg-slate-950 border-l border-slate-800 shadow-2xl flex flex-col">
          <div className="sticky top-0 z-10 bg-slate-950/95 backdrop-blur border-b border-slate-800 px-4 py-3 flex-shrink-0">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-100">Task Details</h2>
              <button
                onClick={() => setSelectedTask(null)}
                className="p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-colors"
              >
                ✕
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div>
              <h3 className="text-base font-semibold text-slate-100 mb-2">{selectedTask.title}</h3>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">{selectedTask.employeeEmoji}</span>
                <span className="text-sm text-slate-300">{selectedTask.employeeName}</span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
                  selectedTask.status === 'completed' ? 'bg-emerald-500/15 text-emerald-200 border-emerald-500/50' :
                  selectedTask.status === 'in-progress' ? 'bg-sky-500/15 text-sky-200 border-sky-500/50' :
                  'bg-rose-500/15 text-rose-200 border-rose-500/50'
                }`}>
                  {selectedTask.status === 'in-progress' ? 'In Progress' : selectedTask.status}
                </span>
              </div>
              <p className="text-sm text-slate-400 mb-4">{selectedTask.detail}</p>
              <p className="text-xs text-slate-500">Created {selectedTask.createdAt}</p>
            </div>
            <div className="flex flex-col gap-2 pt-4 border-t border-slate-800">
              <button
                onClick={() => {
                  console.log('Rerun task:', selectedTask.id);
                  setSelectedTask(null);
                }}
                className="text-xs rounded-full px-3 py-1.5 border border-slate-700 text-slate-200 hover:bg-slate-800 transition-colors text-left"
              >
                Rerun task
              </button>
              <button
                onClick={() => {
                  console.log('Ask follow-up in chat:', selectedTask.id);
                  setSelectedTask(null);
                }}
                className="text-xs rounded-full px-3 py-1.5 border border-slate-700 text-slate-200 hover:bg-slate-800 transition-colors text-left"
              >
                Ask follow-up in chat
              </button>
              <button
                onClick={() => handleOpenWorkspace(selectedTask.employeeSlug)}
                className="text-xs rounded-full px-3 py-1.5 border border-slate-700 text-slate-200 hover:bg-slate-800 transition-colors text-left"
              >
                Open employee workspace
              </button>
            </div>
          </div>
        </aside>
      </div>
    );
  }

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
            title="PRIME TASKS"
            subtitle="Command Queue"
            icon={<span>⚡</span>}
            headerActions={
              <div className="flex flex-col items-end gap-1">
                <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                  Queue Health
                </p>
                <div className="flex items-center gap-2 text-xs text-slate-200">
                  <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-emerald-300">
                    {completionPct}% complete
                  </span>
                </div>
                <div className="mt-1 flex w-40 overflow-hidden rounded-full bg-slate-800/80">
                  <div
                    className="h-1.5 bg-gradient-to-r from-emerald-400 via-sky-400 to-slate-500 transition-[width]"
                    style={{ width: `${completionPct}%` }}
                  />
                </div>
              </div>
            }
            onClose={onClose}
            footer={
              <div className="flex items-center justify-between gap-3 text-xs">
                <p className="text-slate-400">
                  Prime keeps a rolling log of your AI activity and automations.
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    className="h-8 rounded-full border-slate-700 bg-slate-900/90 text-xs text-slate-200 hover:border-amber-400 hover:text-amber-200"
                    onClick={handleClearCompleted}
                  >
                    🧹 Clear completed
                  </Button>
                  <Button
                    className="h-8 rounded-full bg-gradient-to-r from-sky-500 via-indigo-500 to-fuchsia-500 text-xs font-semibold text-slate-950 shadow-[0_10px_28px_rgba(59,130,246,0.6)] hover:brightness-110"
                    onClick={() => {
                      console.log('Pause queue - placeholder');
                    }}
                  >
                    ⚡ Pause queue
                  </Button>
                </div>
              </div>
            }
          >
            {/* Filters */}
            <div className="px-6 pt-4 pb-2 border-b border-slate-800/70">
              <div className="flex flex-wrap gap-2 text-xs">
                {[
                  { id: 'all', label: 'All', count: total },
                  { id: 'completed', label: 'Completed', count: completed },
                  { id: 'in_progress', label: 'In Progress', count: slideoutTasks.filter((t) => t.status === 'in_progress').length },
                  { id: 'failed', label: 'Failed', count: slideoutTasks.filter((t) => t.status === 'failed').length },
                  { id: 'queued', label: 'Queued', count: slideoutTasks.filter((t) => t.status === 'queued').length },
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() =>
                      handleFilterChange(
                        f.id as 'all' | 'completed' | 'failed' | 'queued' | 'in_progress'
                      )
                    }
                    className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 transition ${
                      filter === f.id
                        ? 'border-sky-400/80 bg-sky-500/10 text-sky-200'
                        : 'border-slate-700 bg-slate-900/70 text-slate-300 hover:border-slate-500 hover:bg-slate-900'
                    }`}
                  >
                    <span>{f.label}</span>
                    <span className="text-[10px] text-slate-400">({f.count})</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Task cards */}
            <PrimeTasksContent
              tasks={filtered}
              onTaskClick={handleTaskClick}
            />
          </PrimeSlideoutShell>
        </div>
      </div>
    </div>
  );
};
