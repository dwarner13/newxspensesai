/**
 * Prime Quick Actions Component
 * 
 * Floating rail style action cards:
 * - Glass surface with subtle gradient border
 * - Icon + label + short sublabel
 * - Consistent with dashboard/floating rail design system
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Upload, TrendingUp, AlertCircle, FileText, MessageCircle } from 'lucide-react';

export interface PrimeQuickAction {
  label: string;
  message: string;
  icon: React.ComponentType<{ className?: string }>;
  sublabel?: string;
}

const DEFAULT_ACTIONS: PrimeQuickAction[] = [
  {
    label: 'Review my latest imports',
    message: 'Show me my latest imports',
    icon: Upload,
    sublabel: 'View recent uploads',
  },
  {
    label: 'Open Smart Categories',
    message: 'Open Smart Categories',
    icon: TrendingUp,
    sublabel: 'View categories',
  },
  {
    label: 'Ask a question',
    message: 'Ask a question',
    icon: MessageCircle,
    sublabel: 'Get help',
  },
];

export interface PrimeQuickActionsProps {
  actions?: PrimeQuickAction[];
  onActionClick: (action: PrimeQuickAction) => void;
  className?: string;
}

export function PrimeQuickActions({ 
  actions = DEFAULT_ACTIONS, 
  onActionClick,
  className = '' 
}: PrimeQuickActionsProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.7 }}
      className={`relative ${className}`}
    >
      {/* Glass panel matching floating rail style */}
      <div className="relative bg-gradient-to-br from-slate-900/80 via-slate-800/70 to-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-xl p-4 shadow-[0_4px_16px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.05)]">
        {/* Subtle glow effect */}
        <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-cyan-500/3 via-transparent to-teal-500/3 pointer-events-none" />
        
        {/* Content */}
        <div className="relative z-10">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
            Quick Actions
          </h3>
          
          {/* Action cards - floating rail style */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {actions.map((action, index) => {
              const Icon = action.icon;
              return (
                <motion.button
                  key={action.label}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.2, delay: 0.75 + index * 0.05 }}
                  onClick={() => onActionClick(action)}
                  className="group relative px-3 py-2.5 rounded-lg bg-slate-800/60 hover:bg-slate-700/80 border border-slate-700/50 hover:border-cyan-500/30 text-left transition-all duration-200 hover:shadow-[0_0_8px_rgba(6,182,212,0.15)] hover:scale-[1.02] active:scale-[0.98]"
                >
                  {/* Subtle gradient edge on hover */}
                  <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-cyan-500/0 via-transparent to-teal-500/0 group-hover:from-cyan-500/5 group-hover:to-teal-500/5 transition-all duration-200 pointer-events-none" />
                  
                  {/* Content */}
                  <div className="relative flex items-start gap-2.5">
                    <div className="flex-shrink-0 mt-0.5">
                      <Icon className="w-4 h-4 text-slate-400 group-hover:text-cyan-400 transition-colors" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-slate-200 group-hover:text-white transition-colors">
                        {action.label}
                      </div>
                      {action.sublabel && (
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          {action.sublabel}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
