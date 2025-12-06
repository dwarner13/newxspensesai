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
                   task.employeeSlug === 'blitz-debt' ? 'Debt Payoff AI' :
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
        
        {/* New floating card component */}
        <div className="relative h-full w-full">
          <PrimeTasksSlideoutContent
            tasks={slideoutTasks}
            activeFilter={filter}
            onFilterChange={handleFilterChange}
            onClose={onClose}
            onTaskClick={handleTaskClick}
            onClearCompleted={handleClearCompleted}
            onPauseQueue={() => {
              console.log('Pause queue - placeholder');
              // TODO: Implement pause queue functionality
            }}
          />
        </div>
      </div>
    </div>
  );
};
