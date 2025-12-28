/**
 * Account Center Panel
 * 
 * Premium slide-out panel for account management:
 * - Account (view/edit profile basics)
 * - Billing & Plan (plan status, upgrades)
 * - Custodian Support Console (help chat)
 * - Data & Privacy (download, delete, clear guest data)
 */

import React, { useEffect, useState, useRef } from 'react';
import { useAtom } from 'jotai';
import {
  accountCenterPanelOpenAtom,
  accountCenterActiveTabAtom,
  type AccountCenterTab
} from '../../lib/uiStore';
import {
  Sheet,
  SheetOverlay,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '../ui/sheet';
import { User, CreditCard, MessageCircle, Shield, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { AccountTab } from './tabs/AccountTab';
import { BillingTab } from './tabs/BillingTab';
import { CustodianSupportTab } from './tabs/CustodianSupportTab';
import { DataPrivacyTab } from './tabs/DataPrivacyTab';
import { CHAT_SHEET_HEIGHT, CHAT_SHEET_WIDTH } from '../../lib/chatSlideoutConstants';
import { motion } from 'framer-motion';

// Account Center Panel Tabs
import { useAuth } from '../../contexts/AuthContext';
import { isDemoMode } from '../../lib/demoAuth';
import { useBodyClass } from '../../hooks/useBodyClass';

export function AccountCenterPanel() {
  const [isOpen, setIsOpen] = useAtom(accountCenterPanelOpenAtom);
  const [activeTab, setActiveTab] = useAtom(accountCenterActiveTabAtom);
  const { isDemoUser } = useAuth();
  
  // Toggle body class for AI rail standby mode
  useBodyClass('right-drawer-open', isOpen);

  // Lock shell height to match chatbot slide-out behavior
  // Uses same frozen height mechanism as PrimeSlideoutShell
  const [lockedHeight, setLockedHeight] = useState<string | null>(null);
  const [lockedWidth, setLockedWidth] = useState<string | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (!isOpen) return;
    
    // Compute dimensions once on open: frozen at open time (matches PrimeSlideoutShell)
    const TOP_OFFSET = 48; // 3rem padding
    const MAX_H = 900;
    const frozenH = Math.floor(Math.min(window.innerHeight - TOP_OFFSET, MAX_H));
    const frozenW = 576; // CHAT_SHEET_WIDTH = max-w-xl = 576px
    
    setLockedHeight(`${frozenH}px`);
    setLockedWidth(`${frozenW}px`);
  }, [isOpen]);

  // Optional: Recompute on window resize (debounced, matches PrimeSlideoutShell)
  useEffect(() => {
    if (!isOpen || !lockedHeight) return;
    
    let resizeTimeout: NodeJS.Timeout;
    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        const TOP_OFFSET = 48;
        const MAX_H = 900;
        const frozenH = Math.floor(Math.min(window.innerHeight - TOP_OFFSET, MAX_H));
        setLockedHeight(`${frozenH}px`);
      }, 150); // 150ms debounce
    };
    
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(resizeTimeout);
    };
  }, [isOpen, lockedHeight]);

  const handleClose = () => {
    setIsOpen(false);
    setTimeout(() => setActiveTab('account'), 250);
  };

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen]);

  // Dev-only: Check if content fits without scrolling
  useEffect(() => {
    if (!isOpen || !import.meta.env.DEV || !contentRef.current || !lockedHeight) return;
    
    const checkHeight = () => {
      const contentEl = contentRef.current;
      if (!contentEl) return;
      
      const contentHeight = contentEl.scrollHeight;
      const availableHeight = contentEl.clientHeight;
      const headerHeight = contentEl.previousElementSibling?.clientHeight || 0;
      const panelHeight = parseInt(lockedHeight) || 0;
      
      if (contentHeight > availableHeight) {
        console.warn('[AccountCenterPanel] ⚠️ Content exceeds available height:', {
          contentHeight,
          availableHeight,
          headerHeight,
          panelHeight,
          overflow: contentHeight - availableHeight,
        });
      } else {
        console.log('[AccountCenterPanel] ✅ Content fits without scrolling:', {
          contentHeight,
          availableHeight,
          headerHeight,
          panelHeight,
        });
      }
    };
    
    // Check after a short delay to allow content to render
    const timeout = setTimeout(checkHeight, 100);
    return () => clearTimeout(timeout);
  }, [isOpen, activeTab, lockedHeight]);

  const tabs: Array<{
    id: AccountCenterTab;
    label: string;
    icon: React.ReactNode;
    description: string;
  }> = [
    {
      id: 'account',
      label: 'Account',
      icon: <User className="w-4 h-4" />,
      description: 'Manage your identity, access, and system health',
    },
    {
      id: 'billing',
      label: 'Billing & Plan',
      icon: <CreditCard className="w-4 h-4" />,
      description: 'Subscription & upgrades',
    },
    {
      id: 'support',
      label: 'Custodian Support',
      icon: <MessageCircle className="w-4 h-4" />,
      description: 'Manage your identity, access, and system health',
    },
    {
      id: 'privacy',
      label: 'Data & Privacy',
      icon: <Shield className="w-4 h-4" />,
      description: 'Data management & privacy',
    },
  ];

  const currentTab = tabs.find(t => t.id === activeTab) || tabs[0];

  // Check for reduced motion preference (matches PrimeSlideoutShell)
  const prefersReducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      {isOpen && (
        <>
          <SheetOverlay 
            className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm" 
            onClick={handleClose}
          />
          <div className="fixed inset-0 z-50 flex justify-end items-stretch py-6 pr-4 pointer-events-none">
        <motion.aside
          initial={{ opacity: 0, transform: 'translate3d(110%, 0, 0)' }}
          animate={isOpen ? { opacity: 1, transform: 'translate3d(0, 0, 0)' } : { opacity: 0, transform: 'translate3d(110%, 0, 0)' }}
          transition={prefersReducedMotion ? { duration: 0 } : { 
            transform: { duration: 0.26, ease: [0.2, 0.9, 0.2, 1] },
            opacity: { duration: 0.18, ease: 'easeOut' }
          }}
          style={{ 
            willChange: 'transform, opacity',
            // Match chatbot slide-out height exactly
            height: lockedHeight || CHAT_SHEET_HEIGHT,
            maxHeight: lockedHeight || CHAT_SHEET_HEIGHT,
            minHeight: 0,
            width: lockedWidth ? `${lockedWidth}px` : '100%',
            maxWidth: lockedWidth ? `${lockedWidth}px` : '576px', // CHAT_SHEET_WIDTH = max-w-xl = 576px
            transition: prefersReducedMotion ? 'none' : 'transform 0.26s cubic-bezier(0.2, 0.9, 0.2, 1), opacity 0.18s ease-out',
          }}
          className={cn(
            "flex flex-col",
            lockedWidth ? '' : `w-full ${CHAT_SHEET_WIDTH}`,
            "rounded-3xl border border-slate-800/80 bg-gradient-to-b",
            "from-slate-900/80 via-slate-950 to-slate-950",
            "shadow-[0_0_0_1px_rgba(15,23,42,0.9),-18px_0_40px_rgba(56,189,248,0.25)]",
            "overflow-hidden transform-gpu pointer-events-auto"
          )}
        >
          {/* Main content area - locked height, flex column (matches PrimeSlideoutShell structure) */}
          <div className="flex h-full flex-1 flex-col overflow-hidden min-h-0">
            {/* Fixed Header - Non-scrolling (compact, professional) */}
            <div className="sticky top-0 z-20 border-b border-slate-800/70 bg-gradient-to-r from-slate-950/95 via-slate-950/90 to-slate-950/95 px-6 pt-3 pb-2.5 backdrop-blur-sm flex-shrink-0 min-h-0">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center flex-shrink-0">
                      {React.cloneElement(currentTab.icon as React.ReactElement, { className: "w-3.5 h-3.5" })}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <SheetTitle className="text-base font-semibold tracking-[0.2em] text-slate-200 uppercase truncate">
                          Account Center
                        </SheetTitle>
                        {isDemoMode() && isDemoUser && (
                          <span className="inline-flex items-center rounded-full bg-blue-500/20 px-1.5 py-0.5 text-[10px] font-medium text-blue-300 ring-1 ring-inset ring-blue-500/30 flex-shrink-0">
                            Guest Mode
                          </span>
                        )}
                      </div>
                      {currentTab.description && (
                        <SheetDescription className="mt-0.5 text-xs text-slate-400 leading-snug line-clamp-1">
                          {currentTab.description}
                        </SheetDescription>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right side: Close button */}
                <div className="flex flex-col items-end">
                  <button
                    onClick={handleClose}
                    className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800/80 rounded-lg transition-colors"
                    aria-label="Close panel"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Tab Navigation - Single row, horizontal scroll if needed */}
              <div className="flex items-center gap-1.5 mt-2.5 overflow-x-auto scrollbar-none flex-nowrap">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "flex items-center gap-1.5 px-2.5 py-1.5 h-9 rounded-lg text-xs font-medium transition-colors flex-shrink-0 whitespace-nowrap",
                      activeTab === tab.id
                        ? "bg-blue-600 text-white"
                        : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                    )}
                  >
                    {React.cloneElement(tab.icon as React.ReactElement, { className: "w-3.5 h-3.5 flex-shrink-0" })}
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Content - Scrollable content area only */}
            <div ref={contentRef} className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
              <div className="px-6 py-4 min-w-0 flex flex-col">
                {activeTab === 'account' && <AccountTab />}
                {activeTab === 'billing' && <BillingTab />}
                {activeTab === 'support' && <CustodianSupportTab />}
                {activeTab === 'privacy' && <DataPrivacyTab />}
              </div>
            </div>
          </div>
        </motion.aside>
      </div>
      </>
      )}
    </Sheet>
  );
}

/**
 * Hook to open the Account Center panel
 */
export function useAccountCenterPanel() {
  const [, setIsOpen] = useAtom(accountCenterPanelOpenAtom);
  const [, setActiveTab] = useAtom(accountCenterActiveTabAtom);

  const openPanel = (tab: AccountCenterTab = 'account') => {
    setActiveTab(tab);
    setIsOpen(true);
  };

  const closePanel = () => {
    setIsOpen(false);
  };

  return { openPanel, closePanel };
}

