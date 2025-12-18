/**
 * Mobile Sidebar Component
 * Uses NAV_ITEMS from nav-registry.tsx as single source of truth
 * Matches DesktopSidebar structure for consistency
 */

import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { X, User } from 'lucide-react';
import NAV_ITEMS from '../../navigation/nav-registry';
import { isActivePath } from '../../navigation/is-active';
import { EMPLOYEES } from '../../data/aiEmployees';
import { PrimeLogoBadge } from '../branding/PrimeLogoBadge';

interface MobileSidebarProps {
  open: boolean;
  onClose: () => void;
}

// Map routes to AI employees (matches DesktopSidebar)
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
    '/dashboard/bank-accounts': 'byte',
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

export default function MobileSidebar({ open, onClose }: MobileSidebarProps) {
  const location = useLocation();

  // Group items by their group property (matches DesktopSidebar)
  const groups = Object.entries(
    NAV_ITEMS.reduce((acc, item) => {
      const group = item.group ?? 'GENERAL';
      if (!acc[group]) {
        acc[group] = [];
      }
      acc[group].push(item);
      return acc;
    }, {} as Record<string, typeof NAV_ITEMS>)
  );

  return (
    <div
      className="h-full w-full bg-[rgba(15,23,42,0.95)] border-r border-purple-500/20 flex flex-col backdrop-blur-sm"
      onClick={(e) => e.stopPropagation()}
      style={{
        transform: 'translateX(0)',
        opacity: 1,
        transition: 'transform 0.2s ease-out, opacity 0.2s ease-out'
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <PrimeLogoBadge size={32} showGlow={true} />
          <span className="font-black text-xl text-white">XspensesAI</span>
        </div>
        <button
          onClick={onClose}
          className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition-colors duration-150"
        >
          <X size={24} />
        </button>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto px-4 py-4 pb-2">
        {groups.map(([groupName, groupItems], groupIndex) => (
          <div key={groupName}>
            {/* Group Header */}
            <div className="text-xs uppercase tracking-wider text-white/50 mt-4 mb-2 font-bold px-3">
              {groupName}
            </div>
            
            {/* Group Items */}
            <ul className="space-y-1 mb-4">
              {groupItems.map((item) => {
                const active = isActivePath(location.pathname, item.to);
                const employeeKey = getAIEmployeeForRoute(item.to);
                const employee = EMPLOYEES.find(emp => emp.key === employeeKey);
                
                return (
                  <li key={item.to}>
                    <NavLink 
                      to={item.to}
                      onClick={onClose}
                      className={({ isActive }) => 
                        `flex items-center gap-3 py-3 px-3 rounded-xl transition-colors duration-150 hover:bg-white/10 ${
                          (isActive || active) ? 'bg-purple-500/20 border-l-4 border-purple-400' : ''
                        }`
                      }
                    >
                      <span className="w-5 h-5 shrink-0 relative">
                        {item.icon}
                        {/* AI Employee Badge */}
                        {employee && (
                          <div className="absolute -top-1 -right-1 w-3 h-3 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-xs opacity-80">
                            {employee.emoji}
                          </div>
                        )}
                      </span>
                      <span className="font-medium text-white/90">{item.label}</span>
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="border-t border-white/10 px-4 py-4 pb-6">
        <div className="p-4 bg-gradient-to-br from-purple-600 to-cyan-500 rounded-xl border border-purple-500/30 shadow-lg">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
              <User size={20} className="text-white" />
            </div>
            <div className="flex-1">
              <div className="font-semibold text-white text-sm">John Doe</div>
              <div className="text-xs text-white/80">Premium Plan</div>
            </div>
          </div>
          <div className="bg-white/20 text-white px-2 py-1 rounded-md text-xs font-medium backdrop-blur-sm">
            Level 8 Money Master
          </div>
        </div>
      </div>
    </div>
  );
}
