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
    slug: 'finley-ai',
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
    name: 'Blitz',
    slug: 'blitz-debt',
    role: 'Debt Payoff AI',
    emoji: '⚡',
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
          <PrimeTeamSlideoutContent
            employees={slideoutEmployees}
            activeFilter={filter}
            onFilterChange={handleFilterChange}
            onClose={onClose}
            onEmployeeClick={handleEmployeeClick}
          />
        </div>
      </div>
    </div>
  );
};
