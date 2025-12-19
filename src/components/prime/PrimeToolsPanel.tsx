/**
 * Prime Tools Panel
 * 
 * Slide-out panel for Prime Tools quick actions.
 * Opens from the floating rail Prime Tools button.
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '../ui/sheet';
import { X, MessageSquare, Upload, Tags, LineChart, Receipt, Settings } from 'lucide-react';
import { cn } from '../../lib/utils';
import { usePrimeOverlaySafe } from '../../context/PrimeOverlayContext';

export function PrimeToolsPanel() {
  const { primeToolsOpen, setPrimeToolsOpen } = usePrimeOverlaySafe();
  const navigate = useNavigate();

  const handleClose = () => {
    setPrimeToolsOpen(false);
  };

  const quickActions = [
    {
      id: 'prime-chat',
      label: 'Prime Chat',
      description: 'Chat directly with Prime',
      icon: <MessageSquare className="w-5 h-5" />,
      route: '/dashboard/prime-chat',
      gradient: 'from-amber-400 via-orange-500 to-pink-500',
    },
    {
      id: 'smart-import',
      label: 'Smart Import AI',
      description: 'Upload and process documents',
      icon: <Upload className="w-5 h-5" />,
      route: '/dashboard/smart-import-ai',
      gradient: 'from-blue-400 via-indigo-500 to-purple-500',
    },
    {
      id: 'transactions',
      label: 'Transactions',
      description: 'View transaction history',
      icon: <Receipt className="w-5 h-5" />,
      route: '/dashboard/transactions',
      gradient: 'from-green-400 via-emerald-500 to-teal-500',
    },
    {
      id: 'smart-categories',
      label: 'Smart Categories',
      description: 'AI-powered categorization',
      icon: <Tags className="w-5 h-5" />,
      route: '/dashboard/smart-categories',
      gradient: 'from-purple-400 via-pink-500 to-rose-500',
    },
    {
      id: 'analytics-ai',
      label: 'Analytics AI',
      description: 'Advanced analytics insights',
      icon: <LineChart className="w-5 h-5" />,
      route: '/dashboard/analytics-ai',
      gradient: 'from-cyan-400 via-blue-500 to-indigo-500',
    },
    {
      id: 'settings',
      label: 'Settings',
      description: 'System preferences',
      icon: <Settings className="w-5 h-5" />,
      route: '/dashboard/settings',
      gradient: 'from-slate-400 via-slate-500 to-slate-600',
    },
  ];

  const handleActionClick = (route: string) => {
    navigate(route);
    handleClose();
  };

  return (
    <Sheet open={primeToolsOpen} onOpenChange={setPrimeToolsOpen}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className={cn(
          "w-full sm:w-[520px] p-0 bg-slate-950/95 backdrop-blur-xl",
          "border-l border-slate-800/80",
          "overflow-hidden flex flex-col"
        )}
      >
        {/* Header */}
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-slate-800/80 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 via-orange-500 to-pink-500 flex items-center justify-center">
                <span className="text-lg">👑</span>
              </div>
              <div>
                <SheetTitle className="text-lg font-semibold text-white">
                  Prime Tools
                </SheetTitle>
                <SheetDescription className="text-sm text-slate-400 mt-0.5">
                  Quick actions for Prime Command Center
                </SheetDescription>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
              aria-label="Close panel"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </SheetHeader>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-6 py-6">
            <div className="grid gap-3 sm:grid-cols-2">
              {quickActions.map((action) => (
                <button
                  key={action.id}
                  onClick={() => handleActionClick(action.route)}
                  className={cn(
                    "group flex flex-col items-start gap-3 rounded-xl border border-slate-800/90",
                    "bg-slate-900/80 p-4 text-left transition-all",
                    "hover:-translate-y-0.5 hover:border-slate-700 hover:bg-slate-800/80",
                    "hover:shadow-lg hover:shadow-slate-900/50"
                  )}
                >
                  <div className={cn(
                    "w-10 h-10 rounded-lg bg-gradient-to-br",
                    action.gradient,
                    "flex items-center justify-center text-white shadow-lg"
                  )}>
                    {action.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-white mb-1">
                      {action.label}
                    </h3>
                    <p className="text-xs text-slate-400 line-clamp-2">
                      {action.description}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}



