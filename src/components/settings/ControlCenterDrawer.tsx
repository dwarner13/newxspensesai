/**
 * Control Center Drawer
 * 
 * Unified drawer for Profile, Preferences, and Security settings.
 * Opens from the right side with smooth animation.
 */

import React, { useEffect } from 'react';
import { useAtom } from 'jotai';
import { 
  controlCenterDrawerOpenAtom, 
  controlCenterActiveTabAtom,
  type ControlCenterTab 
} from '../../lib/uiStore';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '../ui/sheet';
import { User, Sliders, Shield, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { ProfileTab } from './tabs/ProfileTab';
import { PreferencesTab } from './tabs/PreferencesTab';
import { SecurityTab } from './tabs/SecurityTab';
import { useAuth } from '../../contexts/AuthContext';
import { isDemoMode } from '../../lib/demoAuth';

export function ControlCenterDrawer() {
  const [isOpen, setIsOpen] = useAtom(controlCenterDrawerOpenAtom);
  const [activeTab, setActiveTab] = useAtom(controlCenterActiveTabAtom);
  const { isDemoUser } = useAuth();
  const showGuestBadge = isDemoMode() && isDemoUser;

  // Close drawer handler
  const handleClose = () => {
    setIsOpen(false);
    // Reset tab after animation completes
    setTimeout(() => setActiveTab(null), 250);
  };

  // Handle ESC key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen]);

  // Tab configuration
  const tabs: Array<{
    id: ControlCenterTab;
    label: string;
    icon: React.ReactNode;
    description: string;
  }> = [
    {
      id: 'profile',
      label: 'Profile',
      icon: <User className="w-4 h-4" />,
      description: 'Manage your account information',
    },
    {
      id: 'preferences',
      label: 'Preferences',
      icon: <Sliders className="w-4 h-4" />,
      description: 'Customize your experience',
    },
    {
      id: 'security',
      label: 'Security',
      icon: <Shield className="w-4 h-4" />,
      description: 'Account security & privacy',
    },
  ];

  // Get current tab config
  const currentTab = tabs.find(t => t.id === activeTab) || tabs[0];

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetContent 
        side="right" 
        showCloseButton={false}
        className={cn(
          "w-full sm:w-[520px] p-0 bg-slate-950/95 backdrop-blur-xl",
          "border-l border-slate-800/80",
          "overflow-hidden flex flex-col"
        )}
        onInteractOutside={(e) => {
          // Allow closing on outside click
        }}
      >
        {/* Header */}
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-slate-800/80 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                {currentTab.icon}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <SheetTitle className="text-lg font-semibold text-white">
                    {currentTab.label}
                  </SheetTitle>
                  {showGuestBadge && (
                    <span className="inline-flex items-center rounded-full bg-blue-500/20 px-2 py-0.5 text-xs font-medium text-blue-300 ring-1 ring-inset ring-blue-500/30">
                      Guest Mode
                    </span>
                  )}
                </div>
                <SheetDescription className="text-sm text-slate-400 mt-0.5">
                  {currentTab.description}
                </SheetDescription>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
              aria-label="Close drawer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tab Navigation */}
          <div className="flex items-center gap-2 mt-4">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                  activeTab === tab.id
                    ? "bg-blue-600 text-white"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                )}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </SheetHeader>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-6 py-6">
            {activeTab === 'profile' && <ProfileTab />}
            {activeTab === 'preferences' && <PreferencesTab />}
            {activeTab === 'security' && <SecurityTab />}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

/**
 * Hook to open the control center drawer
 */
export function useControlCenterDrawer() {
  const [, setIsOpen] = useAtom(controlCenterDrawerOpenAtom);
  const [, setActiveTab] = useAtom(controlCenterActiveTabAtom);

  const openDrawer = (tab: ControlCenterTab = 'profile') => {
    setActiveTab(tab);
    setIsOpen(true);
  };

  const closeDrawer = () => {
    setIsOpen(false);
    setTimeout(() => setActiveTab(null), 250);
  };

  return { openDrawer, closeDrawer };
}

