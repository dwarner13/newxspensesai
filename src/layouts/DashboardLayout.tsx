import { useState, useEffect } from "react";
import React from "react";
import { useLocation, Outlet, useNavigate } from "react-router-dom";
import { AnimatedOutlet } from "../components/ui/AnimatedOutlet";
import DesktopSidebar from "../components/navigation/DesktopSidebar";
import DashboardHeader from "../components/ui/DashboardHeader";
import MobileSidebar from "../components/layout/MobileSidebar";
import MobileBottomNav from "../components/layout/MobileBottomNav";
import MobileProfileModal from "../components/layout/MobileProfileModal";
import MobileMenuDrawer from "../components/ui/MobileMenuDrawer";
// Prime intro modal removed - Prime onboarding now handled in chat
// import { PrimeIntroModal } from "../components/prime/PrimeIntroModal";
// import { usePrimeIntro } from "../hooks/usePrimeIntro";
import { usePullToRefresh } from "../hooks/usePullToRefresh";
import PullToRefreshIndicator from "../components/ui/PullToRefreshIndicator";
import UnifiedAssistantChat from "../components/chat/UnifiedAssistantChat";
import { useUnifiedChatLauncher } from "../hooks/useUnifiedChatLauncher";
import { PrimeFloatingButton } from "../components/chat/PrimeFloatingButton";
import { ActivityFeedSidebar } from "../components/dashboard/ActivityFeedSidebar";
import DesktopChatSideBar from "../components/chat/DesktopChatSideBar";
import { ChatHistorySidebar } from "../components/chat/ChatHistorySidebar";
import { ControlCenterDrawer } from "../components/settings/ControlCenterDrawer";
import { AccountCenterPanel } from "../components/settings/AccountCenterPanel";
import { UnifiedOnboardingFlow } from "../components/onboarding/UnifiedOnboardingFlow";
import { PrimeToolsPanel } from "../components/prime/PrimeToolsPanel";
import { PrimeOverlayProvider } from "../context/PrimeOverlayContext";
// Legacy onboarding removed - UnifiedOnboardingFlow is the ONLY authority
import { useAuth } from "../contexts/AuthContext";
import { useOnboardingGate } from "../components/onboarding/useOnboardingGate";
import { CinematicOnboardingOverlay } from "../components/onboarding/CinematicOnboardingOverlay";
import { PrimeWelcomeOverlayCinematic } from "../components/onboarding/PrimeWelcomeOverlayCinematic";
import { ChatErrorBoundary } from "../components/chat/ChatErrorBoundary";
import { PostOnboardingChooser } from "../components/onboarding/PostOnboardingChooser";

// DashboardHeaderWithBadges - Wrapper (now simplified, no custom badges)
function DashboardHeaderWithBadges() {
  // All pages now use the minimal HeaderAIStatus indicator (rendered by DashboardHeader)
  // No custom status badges or secondary labels - consistent across all pages
  return <DashboardHeader />;
}

// DashboardContentGrid - shows Activity Feed sidebar on the right for non-workspace pages
// Workspace pages (using DashboardThreeColumnLayout) handle their own Activity Feed
function DashboardContentGrid({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  
  // Workspace pages that manage their own Activity Feed (3-column layout via DashboardPageShell)
  // Use strict prefix matching to avoid conflicts (do NOT include '/dashboard' as it matches everything)
  // ALL pages using DashboardPageShell must be listed here to bypass DashboardContentGrid wrapper
  const workspacePrefixes = [
    // AI Workspace pages
    '/dashboard/prime-chat',
    '/dashboard/smart-import-ai',
    '/dashboard/ai-chat-assistant',
    '/dashboard/smart-categories',
    '/dashboard/analytics-ai',
    '/dashboard/wellness-studio',
    '/dashboard/financial-therapist',
    '/dashboard/spending-predictions',
    '/dashboard/goal-concierge',
    '/dashboard/smart-automation',
    '/dashboard/business-intelligence',
    '/dashboard/tax-assistant',
    '/dashboard/debt-payoff-planner',
    '/dashboard/bank-accounts',
    '/dashboard/bill-reminders',
    '/dashboard/financial-freedom',
    '/dashboard/ai-financial-freedom',
    '/dashboard/personal-podcast',
    '/dashboard/spotify', // Spotify Integration page (matches route path)
    '/dashboard/spotify-integration', // Legacy redirect path
    '/dashboard/financial-story', // Financial Story page (The Roundtable)
    '/dashboard/transactions',
    '/dashboard/settings',
    // Main dashboard pages that now use DashboardPageShell with Activity Feed in right slot
    '/dashboard/overview',
    '/dashboard/planning',
    '/dashboard/business',
    '/dashboard/entertainment',
    '/dashboard/reports',
    '/dashboard/analytics',
  ];
  
  const isWorkspacePage = workspacePrefixes.some((p) =>
    location.pathname.startsWith(p)
  );
  
  // Main dashboard page also handles its own Activity Feed via DashboardHeroRow
  const isMainDashboard = location.pathname === '/dashboard' || location.pathname === '/dashboard/';

  // For workspace pages, return ONLY children - they handle their own Activity Feed and rail space
  if (isWorkspacePage) {
    return <>{children}</>;
  }

  // For main dashboard, return children directly (no extra rail padding wrapper)
  // Rail space is already handled at layout level via main element padding
  if (isMainDashboard) {
    return <>{children}</>;
  }
  
  // Determine activity scope based on route (for non-workspace pages)
  const getActivityScope = (): string | undefined => {
    if (location.pathname.includes('/settings')) return 'settings';
    if (location.pathname === '/dashboard' || location.pathname === '/dashboard/') return 'dashboard';
    return undefined; // Show all activity
  };
  
  const activityScope = getActivityScope();
  
  // Standard 2-column layout for non-workspace pages with Activity Feed sidebar
  // Compact Activity Feed: 280px on xl+ screens
  return (
    <div className="grid gap-6 lg:gap-8 xl:grid-cols-[minmax(0,1fr)_280px] max-xl:grid-cols-1 items-stretch min-h-[520px]">
      {/* LEFT/MIDDLE COLUMN - Main Dashboard Content */}
      <div className="min-w-0 max-xl:order-1 h-full">
        {children}
      </div>

      {/* RIGHT COLUMN - Activity Feed Sidebar - Compact */}
      <div className="hidden xl:flex max-xl:order-2 h-full">
        <ActivityFeedSidebar scope={activityScope} />
      </div>
    </div>
  );
}


export default function DashboardLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  
  // HARD BLOCK: Do not render dashboard shell elements on onboarding routes
  const isOnboardingRoute = location.pathname.startsWith('/onboarding');
  
  // If on onboarding route, render minimal layout (no sidebar, header, chat, rails)
  if (isOnboardingRoute) {
    return (
      <PrimeOverlayProvider>
        <div className="min-h-screen bg-slate-950">
          <main className="flex-1">
            <Outlet />
          </main>
        </div>
      </PrimeOverlayProvider>
    );
  }
  
  // Dev mode: Setup click debug helper to identify blocking overlays
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      // Dynamic import to avoid issues if file doesn't exist
      import('../utils/clickDebug').then(({ setupClickDebug }) => {
        const cleanup = setupClickDebug();
        return () => cleanup();
      }).catch(() => {
        // Silently fail if debug helper not available
      });
    }
  }, []);

  // Hardening: Prevent html from scrolling, prevent body/html horizontal scrolling while dashboard is mounted
  useEffect(() => {
    // Store original values for cleanup
    const originalHtmlOverflow = document.documentElement.style.overflow;
    const originalHtmlOverflowX = document.documentElement.style.overflowX;
    const originalBodyOverflowX = document.body.style.overflowX;
    const originalBodyOverscroll = document.body.style.overscrollBehavior;
    
    // CRITICAL: HTML must never scroll - prevent all scrolling on html
    document.documentElement.style.overflow = 'hidden';
    // Use 'clip' instead of 'hidden' to prevent phantom horizontal scrollbar
    document.documentElement.style.overflowX = 'clip';
    // Prevent horizontal scrolling on body - use 'clip' to prevent phantom scrollbar
    document.body.style.overflowX = 'clip';
    document.body.style.overscrollBehavior = 'none';
    
    return () => {
      // Restore original values on unmount
      document.documentElement.style.overflow = originalHtmlOverflow;
      document.documentElement.style.overflowX = originalHtmlOverflowX;
      document.body.style.overflowX = originalBodyOverflowX;
      document.body.style.overscrollBehavior = originalBodyOverscroll;
    };
  }, []);

  // Dev-only: Debug helper to find horizontal overflow elements (30-second check)
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && import.meta.env.DEV) {
      const checkOverflow = () => {
        const scrollWidth = document.documentElement.scrollWidth;
        const innerWidth = window.innerWidth;
        const hasOverflow = scrollWidth > innerWidth + 1;
        
        if (hasOverflow) {
          console.warn('[DashboardLayout] ⚠️ Horizontal overflow detected:', {
            scrollWidth,
            innerWidth,
            overflow: scrollWidth - innerWidth,
          });
          
          // Find offending elements
          const allElements = document.querySelectorAll('*');
          const offenders: Array<{ element: string; right: number; width: number }> = [];
          
          allElements.forEach((el) => {
            const rect = el.getBoundingClientRect();
            if (rect.right > innerWidth + 1) {
              const tagName = el.tagName.toLowerCase();
              const id = el.id ? `#${el.id}` : '';
              const cls = typeof el.className === 'string' ? el.className : (el.className?.baseVal ?? '');
              const classes = cls ? `.${cls.split(' ')[0]}` : '';
              offenders.push({
                element: `${tagName}${id}${classes}`,
                right: Math.round(rect.right),
                width: Math.round(rect.width),
              });
            }
          });
          
          if (offenders.length > 0) {
            console.warn('[DashboardLayout] Offending elements:', offenders.slice(0, 10));
          }
        }
      };
      
      // Run check after a short delay to ensure DOM is ready
      const timeoutId = setTimeout(checkOverflow, 1000);
      
      // Also check on resize
      window.addEventListener('resize', checkOverflow);
      
      // Auto-remove after 30 seconds
      const removeTimeoutId = setTimeout(() => {
        window.removeEventListener('resize', checkOverflow);
      }, 30000);
      
      return () => {
        clearTimeout(timeoutId);
        clearTimeout(removeTimeoutId);
        window.removeEventListener('resize', checkOverflow);
      };
    }
  }, [location.pathname]);

  // DEV-only: Rail visibility + clipping detection
  useEffect(() => {
    if (import.meta.env.DEV) {
      const diagnoseRail = () => {
        const rail = document.querySelector('[data-floating-rail]') as HTMLElement;
        if (!rail) {
          console.warn('[RailDiagnostics] Rail not found in DOM');
          return;
        }

        // 1. Prove rail portal location
        const parentChain: string[] = [];
        let current: HTMLElement | null = rail.parentElement;
        while (current && current !== document.body) {
          const cls = typeof current.className === 'string' ? current.className : (current.className?.baseVal ?? '');
          parentChain.push(`${current.tagName}${current.id ? `#${current.id}` : ''}${cls ? `.${cls.split(' ')[0]}` : ''}`);
          current = current.parentElement;
        }
        const isPortalToBody = rail.parentElement === document.body || rail.parentElement?.id === 'portal-root';

        // 2. Log computed styles + bounding rect
        const styles = window.getComputedStyle(rail);
        const rect = rail.getBoundingClientRect();
        const viewport = { width: window.innerWidth, height: window.innerHeight };

        // 3. Detect clipping ancestors
        const clippingAncestors: Array<{ element: string; property: string; value: string; file?: string }> = [];
        current = rail.parentElement;
        while (current && current !== document.body) {
          const ancestorStyles = window.getComputedStyle(current);
          const cls = typeof current.className === 'string' ? current.className : (current.className?.baseVal ?? '');
          const clsPrefix = cls ? `.${cls.split(' ')[0]}` : '';
          if (ancestorStyles.overflow !== 'visible' && ancestorStyles.overflow !== 'auto') {
            clippingAncestors.push({
              element: `${current.tagName}${current.id ? `#${current.id}` : ''}${clsPrefix}`,
              property: 'overflow',
              value: ancestorStyles.overflow,
            });
          }
          if (ancestorStyles.transform !== 'none' && ancestorStyles.transform !== 'matrix(1, 0, 0, 1, 0, 0)') {
            clippingAncestors.push({
              element: `${current.tagName}${current.id ? `#${current.id}` : ''}${clsPrefix}`,
              property: 'transform',
              value: ancestorStyles.transform,
            });
          }
          if (ancestorStyles.filter !== 'none') {
            clippingAncestors.push({
              element: `${current.tagName}${current.id ? `#${current.id}` : ''}${clsPrefix}`,
              property: 'filter',
              value: ancestorStyles.filter,
            });
          }
          if (ancestorStyles.backdropFilter !== 'none') {
            clippingAncestors.push({
              element: `${current.tagName}${current.id ? `#${current.id}` : ''}${clsPrefix}`,
              property: 'backdrop-filter',
              value: ancestorStyles.backdropFilter,
            });
          }
          if (ancestorStyles.contain !== 'none') {
            clippingAncestors.push({
              element: `${current.tagName}${current.id ? `#${current.id}` : ''}${clsPrefix}`,
              property: 'contain',
              value: ancestorStyles.contain,
            });
          }
          if (ancestorStyles.willChange.includes('transform')) {
            clippingAncestors.push({
              element: `${current.tagName}${current.id ? `#${current.id}` : ''}${clsPrefix}`,
              property: 'will-change',
              value: ancestorStyles.willChange,
            });
          }
          current = current.parentElement;
        }

        // 4. Detect "something on top" using elementsFromPoint
        const railCenterX = rect.left + rect.width / 2;
        const railCenterY = rect.top + rect.height / 2;
        const rightEdgeX = window.innerWidth - 10;
        const viewportCenterY = window.innerHeight / 2;
        
        const elementsAtRailCenter = document.elementsFromPoint(railCenterX, railCenterY);
        const elementsAtRightEdge = document.elementsFromPoint(rightEdgeX, viewportCenterY);
        
        const topElementAtRail = elementsAtRailCenter[0];
        const topElementAtRightEdge = elementsAtRightEdge[0];
        const railIsOnTop = topElementAtRail === rail || rail.contains(topElementAtRail as Node);
        const railIsOnTopAtEdge = topElementAtRightEdge === rail || rail.contains(topElementAtRightEdge as Node);

        console.debug('[RailDiagnostics]', {
          portal: {
            isPortalToBody,
            parentElement: rail.parentElement?.tagName + (rail.parentElement?.id ? `#${rail.parentElement.id}` : ''),
            parentChain,
          },
          computedStyles: {
            display: styles.display,
            visibility: styles.visibility,
            opacity: styles.opacity,
            position: styles.position,
            zIndex: styles.zIndex,
            pointerEvents: styles.pointerEvents,
          },
          boundingRect: {
            left: Math.round(rect.left),
            right: Math.round(rect.right),
            top: Math.round(rect.top),
            bottom: Math.round(rect.bottom),
            width: Math.round(rect.width),
            height: Math.round(rect.height),
          },
          viewport,
          clippingAncestors: clippingAncestors.length > 0 ? clippingAncestors : null,
          elementsOnTop: {
            atRailCenter: railIsOnTop ? 'rail' : (() => {
              const cls = topElementAtRail ? (typeof topElementAtRail.className === 'string' ? topElementAtRail.className : (topElementAtRail.className?.baseVal ?? '')) : '';
              return `${topElementAtRail?.tagName}${topElementAtRail?.id ? `#${topElementAtRail.id}` : ''}${cls ? `.${cls.split(' ')[0]}` : ''}`;
            })(),
            atRightEdge: railIsOnTopAtEdge ? 'rail' : (() => {
              const cls = topElementAtRightEdge ? (typeof topElementAtRightEdge.className === 'string' ? topElementAtRightEdge.className : (topElementAtRightEdge.className?.baseVal ?? '')) : '';
              return `${topElementAtRightEdge?.tagName}${topElementAtRightEdge?.id ? `#${topElementAtRightEdge.id}` : ''}${cls ? `.${cls.split(' ')[0]}` : ''}`;
            })(),
          },
        });

        if (clippingAncestors.length > 0) {
          console.warn('[RailDiagnostics] ⚠️ CLIPPING ANCESTORS DETECTED:', clippingAncestors);
        }
        if (!railIsOnTop || !railIsOnTopAtEdge) {
          console.warn('[RailDiagnostics] ⚠️ RAIL COVERED BY:', {
            atRailCenter: topElementAtRail,
            atRightEdge: topElementAtRightEdge,
          });
        }
      };

      // Also diagnose header overlap
      const diagnoseHeader = () => {
        const header = document.getElementById('dashboard-header');
        if (!header) return;

        const gridContainer = header.querySelector('.grid');
        if (!gridContainer) {
          console.warn('[HeaderDiagnostics] Grid container not found');
          return;
        }

        const gridChildren = Array.from(gridContainer.children);
        const titleEl = gridChildren[0]?.querySelector('h1') as HTMLElement;
        const searchEl = gridChildren[1]?.querySelector('input[type="text"]') as HTMLElement;
        const iconsEl = gridChildren[2] as HTMLElement;

        if (titleEl && searchEl) {
          const titleRect = titleEl.getBoundingClientRect();
          const searchRect = searchEl.getBoundingClientRect();
          const overlap = titleRect.right > searchRect.left;

          console.debug('[HeaderDiagnostics]', {
            gridStructure: {
              childrenCount: gridChildren.length,
              children: gridChildren.map((el, i) => ({
                index: i,
                tag: el.tagName,
                classes: el.className,
                isDirectChild: el.parentElement === gridContainer,
              })),
            },
            title: {
              text: titleEl.textContent?.substring(0, 30),
              rect: {
                left: Math.round(titleRect.left),
                right: Math.round(titleRect.right),
                width: Math.round(titleRect.width),
              },
              computedStyles: {
                display: window.getComputedStyle(titleEl).display,
                whiteSpace: window.getComputedStyle(titleEl).whiteSpace,
                overflow: window.getComputedStyle(titleEl).overflow,
                textOverflow: window.getComputedStyle(titleEl).textOverflow,
              },
            },
            search: {
              rect: {
                left: Math.round(searchRect.left),
                right: Math.round(searchRect.right),
                width: Math.round(searchRect.width),
              },
              computedStyles: {
                display: window.getComputedStyle(searchEl.parentElement?.parentElement as HTMLElement).display,
                position: window.getComputedStyle(searchEl.parentElement?.parentElement as HTMLElement).position,
              },
            },
            overlap: overlap ? {
              detected: true,
              overlapPx: Math.round(titleRect.right - searchRect.left),
            } : false,
          });

          if (overlap) {
            console.warn('[HeaderDiagnostics] ⚠️ OVERLAP DETECTED:', {
              titleRight: Math.round(titleRect.right),
              searchLeft: Math.round(searchRect.left),
              overlapPx: Math.round(titleRect.right - searchRect.left),
            });
          }
        }
      };

      const runDiagnostics = () => {
        diagnoseRail();
        diagnoseHeader();
      };

      runDiagnostics();
      const timeoutId = setTimeout(runDiagnostics, 1000);
      window.addEventListener('resize', runDiagnostics);
      
      return () => {
        clearTimeout(timeoutId);
        window.removeEventListener('resize', runDiagnostics);
      };
    }
  }, [location.pathname]);
  
  // Hide Prime Floating Button on Prime Chat page (PrimeChatPage has its own Prime Tools button)
  const isPrimeChatPage = location.pathname.includes('/prime-chat');
  
  // CRITICAL: ALL /dashboard/* routes use BODY scroll ownership
  const isDashboardRoute = location.pathname.startsWith('/dashboard');
  const [isMobile, setIsMobile] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const { isOpen: isChatOpen, options: chatOptions, activeEmployeeSlug, closeChat, openChat } = useUnifiedChatLauncher();
  
  // Debug: Log when chat state changes
  useEffect(() => {
    console.log('[DashboardLayout] Chat state changed:', { 
      isChatOpen, 
      activeEmployeeSlug,
      optionsEmployeeSlug: chatOptions.initialEmployeeSlug 
    });
  }, [isChatOpen, activeEmployeeSlug, chatOptions.initialEmployeeSlug]);
  const [isChatHistoryOpen, setIsChatHistoryOpen] = useState(false);
  const { ready, userId, profile, refreshProfile, isProfileLoading } = useAuth();
  
  // Post-onboarding chooser: show only immediately after onboarding completion (session-based)
  const [showPostOnboardingChooser, setShowPostOnboardingChooser] = useState(false);
  
  useEffect(() => {
    // Check for sessionStorage flag and custodian_ready status on mount
    // GUARD: Only check on /dashboard routes (not on /onboarding routes)
    if (!ready || !profile || !userId || !location.pathname.startsWith('/dashboard')) return;
    
    try {
      const justCompleted = typeof window !== 'undefined' && window.sessionStorage
        ? sessionStorage.getItem('just_completed_onboarding') === 'true'
        : false;
      
      if (justCompleted) {
        // Check custodian_ready from metadata
        const md = (profile.metadata && typeof profile.metadata === 'object') ? profile.metadata : {};
        const custodianReady = (md as any).custodian_ready === true;
        
        if (custodianReady) {
          // Show chooser and immediately consume flag (so refresh doesn't re-show)
          setShowPostOnboardingChooser(true);
          sessionStorage.removeItem('just_completed_onboarding');
          
          if (import.meta.env.DEV) {
            console.log('[DashboardLayout] Post-onboarding chooser: showing (flag consumed)');
          }
        } else {
          // Flag exists but custodian not ready - clean up flag
          sessionStorage.removeItem('just_completed_onboarding');
        }
      }
    } catch (error: any) {
      // Non-fatal: sessionStorage may not be available
      if (import.meta.env.DEV) {
        console.warn('[DashboardLayout] Failed to check post-onboarding chooser flag:', error?.message || error);
      }
    }
  }, [ready, profile, userId, location.pathname]);
  
  const handleChooserOption = (destination: 'dashboard' | 'prime' | 'settings') => {
    // Defensive: ensure flag is cleared
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        sessionStorage.removeItem('just_completed_onboarding');
      }
    } catch (e) {
      // Ignore
    }
    
    setShowPostOnboardingChooser(false);
    
    // Navigate to destination
    if (destination === 'dashboard') {
      navigate('/dashboard', { replace: true });
    } else if (destination === 'prime') {
      navigate('/dashboard/prime-chat', { replace: true });
    } else if (destination === 'settings') {
      navigate('/dashboard/settings', { replace: true });
    }
    
    if (import.meta.env.DEV) {
      console.log('[DashboardLayout] Post-onboarding chooser: navigating to', destination);
    }
  };
  
  // TASK D: Make dashboard resilient - ensure profile exists
  useEffect(() => {
    if (ready && userId && !profile && !isProfileLoading) {
      // Profile is missing, try to load/create it
      const loadProfile = async () => {
        try {
          const { getOrCreateProfile } = await import('../lib/profileHelpers');
          await getOrCreateProfile(userId, '');
          await refreshProfile?.();
        } catch (error) {
          console.error('[DashboardLayout] Failed to load/create profile:', error);
        }
      };
      loadProfile();
    }
  }, [ready, userId, profile, isProfileLoading, refreshProfile]);
  
  // Onboarding gate: determines first-time setup vs welcome back
  const { showFirstTimeSetup, showWelcomeBack, missingFields } = useOnboardingGate();
  const [firstTimeSetupCompleted, setFirstTimeSetupCompleted] = useState(false);
  
  // Legacy onboarding overlay logic REMOVED
  // UnifiedOnboardingFlow is the ONLY authority for onboarding UI
  
  // DISABLED: Auto-open Prime chat on dashboard load
  // Prime chat must ONLY open when explicitly triggered by user action:
  // - Floating Rail Prime button click
  // - Sidebar "Prime Chat" click
  // - Explicit button press (e.g., "Open Prime Chat")
  // 
  // Feature flag to re-enable auto-open if needed in future:
  // const ENABLE_PRIME_AUTO_OPEN = false;
  // 
  // Previous auto-open logic preserved below (commented out):
  /*
  React.useEffect(() => {
    if (!ready || !userId || !profile || isChatOpen) return;
    
    // Check if onboarding is completed FIRST
    const isOnboardingComplete = (() => {
      if (profile.metadata && typeof profile.metadata === 'object') {
        const metadata = profile.metadata as any;
        return metadata.onboarding?.completed === true;
      }
      return false; // If no metadata, onboarding is incomplete - DO NOT auto-open
    })();
    
    // Only auto-open if onboarding is complete AND Prime not initialized
    if (isOnboardingComplete) {
      const shouldShowPrimeOnboarding = (() => {
        if (profile.metadata && typeof profile.metadata === 'object') {
          const metadata = profile.metadata as any;
          return metadata.prime_initialized !== true;
        }
        return false; // Don't auto-open if no metadata
      })();
      
      if (shouldShowPrimeOnboarding) {
        // Small delay to ensure dashboard is fully loaded
        const timeoutId = setTimeout(() => {
          openChat({ initialEmployeeSlug: 'prime-boss' });
        }, 500);
        
        return () => clearTimeout(timeoutId);
      }
    }
  }, [ready, userId, profile, isChatOpen, openChat]);
  */

  // Open chat history
  const handleOpenChatHistory = () => {
    setIsChatHistoryOpen(true);
  };
  
  // Listen for global chat history open event (for docked rails in panels)
  useEffect(() => {
    const handleGlobalOpenHistory = () => {
      setIsChatHistoryOpen(true);
    };
    
    window.addEventListener('openChatHistory', handleGlobalOpenHistory);
    return () => {
      window.removeEventListener('openChatHistory', handleGlobalOpenHistory);
    };
  }, []);

  const handleCloseChatHistory = () => {
    setIsChatHistoryOpen(false);
  };

  // Prime intro hook - REMOVED: Prime onboarding now handled in chat
  // const { showIntro, complete } = usePrimeIntro();

  // Pull-to-refresh functionality for mobile
  const handleRefresh = async () => {
    try {
      // Simulate refresh delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Dispatch a custom event for components to listen to
      window.dispatchEvent(new CustomEvent('pullToRefresh', {
        detail: { timestamp: Date.now() }
      }));
      
      // Reload the page for a full refresh
      window.location.reload();
    } catch (error) {
      console.error('Refresh failed:', error);
    }
  };

  const pullToRefresh = usePullToRefresh({
    onRefresh: handleRefresh,
    threshold: 80,
    resistance: 0.5,
    disabled: !isMobile});

  // Check if mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      const isMobileWidth = window.innerWidth <= 768;
      setIsMobile(isMobileWidth);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Debug mobile detection
  useEffect(() => {
    console.log('Mobile detection:', { isMobile, windowWidth: window.innerWidth});
  }, [isMobile]);

  // Debug mobile menu state
  useEffect(() => {
    console.log('Mobile menu state changed:', { isMobileMenuOpen, isMobile});
  }, [isMobileMenuOpen, isMobile]);

  // Add pull-to-refresh touch event listeners for mobile
  useEffect(() => {
    if (!isMobile) return;

    const { onTouchStart, onTouchMove, onTouchEnd } = pullToRefresh.handlers;
    
    // Add touch events to the main content area instead of document
    const mainContent = document.querySelector('main');
    if (mainContent) {
      mainContent.addEventListener('touchstart', onTouchStart, { passive: false});
      mainContent.addEventListener('touchmove', onTouchMove, { passive: false});
      mainContent.addEventListener('touchend', onTouchEnd, { passive: false});

      return () => {
        mainContent.removeEventListener('touchstart', onTouchStart);
        mainContent.removeEventListener('touchmove', onTouchMove);
        mainContent.removeEventListener('touchend', onTouchEnd);
      };
    }
  }, [isMobile, pullToRefresh.handlers]);

  // Auto-close drawer when route changes
  useEffect(() => {
    if (isMobileMenuOpen) setIsMobileMenuOpen(false);
  }, [location.pathname]);

  // Lock body scroll when menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = 'auto';
      };
    }
  }, [isMobileMenuOpen]);

  // Note: Removed event listeners for 'prime:open' and 'unified-chat:open' to prevent infinite recursion
  // DashboardLayout already uses useUnifiedChatLauncher hook directly, so it automatically reacts to state changes
  // Components should call openChat() from the hook directly, not dispatch events that loop back

  // Reset scroll position when route changes
  useEffect(() => {
    console.log('[DashboardLayout] Route changed to:', location.pathname);
    // Scroll window to top
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    
    // Also scroll the main content container to top
    const mainContent = document.querySelector('main');
    if (mainContent) {
      mainContent.scrollTo?.({ top: 0, left: 0, behavior: 'instant' });
      if (mainContent.scrollTop !== undefined) {
        mainContent.scrollTop = 0;
      }
    }
  }, [location.pathname]);

  // Dev-only: Diagnostic helper to log scroll containers and overflow elements on ALL /dashboard/* routes
  // CRITICAL: This verifies the LOCKED INVARIANT - BODY is the ONLY scroll owner
  useEffect(() => {
    if (import.meta.env.DEV && isDashboardRoute) {
      const logScrollDiagnostics = () => {
        // 1. Verify documentElement does NOT scroll (LOCKED INVARIANT)
        const docEl = document.documentElement;
        const htmlHeightDiff = docEl.scrollHeight - docEl.clientHeight;
        const bodyHeightDiff = document.body.scrollHeight - document.body.clientHeight;
        const viewportHeight = window.innerHeight;
        
        // 2. Verify BODY is scroll owner
        const bodyOverflowY = window.getComputedStyle(document.body).overflowY;
        const htmlOverflow = window.getComputedStyle(document.documentElement).overflow;
        
        console.log(`[ScrollDiagnostics] 🔒 ${location.pathname} - LOCKED INVARIANT verification:`, {
          htmlScrollHeight: docEl.scrollHeight,
          htmlClientHeight: docEl.clientHeight,
          htmlHeightDiff,
          htmlOverflow,
          htmlShouldNotScroll: htmlHeightDiff === 0 || htmlOverflow === 'hidden',
          bodyScrollHeight: document.body.scrollHeight,
          bodyClientHeight: document.body.clientHeight,
          bodyHeightDiff,
          bodyOverflowY,
          bodyIsScrollOwner: bodyOverflowY === 'auto',
          viewportHeight,
          hasScrollbar: bodyHeightDiff > 1,
        });
        
        // 3. Find elements extending beyond viewport bottom
        const overflowElements: Array<{
          element: string;
          bottom: number;
          viewportHeight: number;
          overflow: number;
        }> = [];
        
        document.querySelectorAll('*').forEach((el) => {
          const rect = el.getBoundingClientRect();
          const bottom = rect.bottom;
          
          if (bottom > viewportHeight + 1) {
            const tagName = el.tagName.toLowerCase();
            const id = el.id ? `#${el.id}` : '';
            const cls = typeof el.className === 'string' ? el.className : (el.className?.baseVal ?? '');
            const className = cls ? `.${cls.split(' ').slice(0, 2).join('.')}` : '';
            
            overflowElements.push({
              element: `${tagName}${id}${className}`,
              bottom: Math.round(bottom),
              viewportHeight,
              overflow: Math.round(bottom - viewportHeight),
            });
          }
        });
        
        // Sort by overflow amount (largest first) and take top 10
        overflowElements.sort((a, b) => b.overflow - a.overflow);
        const topOverflowElements = overflowElements.slice(0, 10);
        
        if (topOverflowElements.length > 0) {
          console.log(`[ScrollDiagnostics] ${location.pathname} - Top 10 elements extending beyond viewport:`, topOverflowElements);
        }

        // 4. Log scroll containers AND overscroll behavior offenders
        const scrollContainers: Array<{
          element: string;
          overflowY: string;
          overflowX: string;
          scrollbarGutter: string;
          overscrollBehaviorY: string;
          overscrollBehaviorX: string;
          scrollHeight: number;
          clientHeight: number;
          scrollWidth: number;
          clientWidth: number;
          hasVerticalScrollbar: boolean;
          hasHorizontalScrollbar: boolean;
          blocksScrollChaining: boolean;
        }> = [];

        document.querySelectorAll('*').forEach((el) => {
          const styles = window.getComputedStyle(el);
          const overflowY = styles.overflowY;
          const overflowX = styles.overflowX;
          const scrollbarGutter = styles.scrollbarGutter;
          const overscrollBehaviorY = styles.overscrollBehaviorY;
          const overscrollBehaviorX = styles.overscrollBehaviorX;
          
          const hasVerticalScroll = (overflowY === 'auto' || overflowY === 'scroll') && 
            (el.scrollHeight > el.clientHeight + 2);
          const hasHorizontalScroll = (overflowX === 'auto' || overflowX === 'scroll') && 
            (el.scrollWidth > el.clientWidth + 2);
          
          // Check if element blocks scroll chaining
          const blocksScrollChaining = overscrollBehaviorY === 'contain' || 
            overscrollBehaviorY === 'none' ||
            overscrollBehaviorX === 'contain' ||
            overscrollBehaviorX === 'none';
          
          // Log if: has scroll OR blocks scroll chaining OR has stable gutter
          if (hasVerticalScroll || hasHorizontalScroll || blocksScrollChaining || scrollbarGutter === 'stable') {
            const tagName = el.tagName.toLowerCase();
            const id = el.id ? `#${el.id}` : '';
            const cls = typeof el.className === 'string' ? el.className : (el.className?.baseVal ?? '');
            const className = cls ? `.${cls.split(' ').slice(0, 2).join('.')}` : '';
            
            scrollContainers.push({
              element: `${tagName}${id}${className}`,
              overflowY,
              overflowX,
              scrollbarGutter,
              overscrollBehaviorY,
              overscrollBehaviorX,
              scrollHeight: el.scrollHeight,
              clientHeight: el.clientHeight,
              scrollWidth: el.scrollWidth,
              clientWidth: el.clientWidth,
              hasVerticalScrollbar: hasVerticalScroll,
              hasHorizontalScrollbar: hasHorizontalScroll,
              blocksScrollChaining,
            });
          }
        });

        // Sort by priority: blocks scroll chaining first, then scroll containers
        scrollContainers.sort((a, b) => {
          if (a.blocksScrollChaining && !b.blocksScrollChaining) return -1;
          if (!a.blocksScrollChaining && b.blocksScrollChaining) return 1;
          if (a.hasVerticalScrollbar && !b.hasVerticalScrollbar) return -1;
          if (!a.hasVerticalScrollbar && b.hasVerticalScrollbar) return 1;
          return 0;
        });

        if (scrollContainers.length > 0) {
          console.log(`[ScrollDiagnostics] ${location.pathname} - Scroll containers & overscroll offenders:`, scrollContainers);
          
          // Highlight top 5 offenders visually
          const topOffenders = scrollContainers.slice(0, 5);
          topOffenders.forEach((offender, idx) => {
            const el = document.querySelector(offender.element.split(' ')[0]);
            if (el) {
              (el as HTMLElement).style.outline = `3px solid ${idx === 0 ? 'red' : idx === 1 ? 'orange' : 'yellow'}`;
              (el as HTMLElement).style.outlineOffset = '2px';
            }
          });
          
          console.log(`[ScrollDiagnostics] ${location.pathname} - Top 5 offenders highlighted with colored outlines`);
        } else {
          console.log(`[ScrollDiagnostics] ${location.pathname} - ✅ No scroll containers or overscroll offenders found (BODY is scroll owner)`);
        }
      };

      // Run after a short delay to ensure DOM is ready
      const timeoutId = setTimeout(logScrollDiagnostics, 500);
      return () => clearTimeout(timeoutId);
    }
  }, [location.pathname, isDashboardRoute]);

  // Dev-only: Wheel event diagnostics for /dashboard/prime-chat to identify scroll capture
  useEffect(() => {
    if (import.meta.env.DEV && location.pathname === '/dashboard/prime-chat') {
      const handleWheel = (e: WheelEvent) => {
        const target = e.target as HTMLElement;
        
        // Check if target or any ancestor is a scroll container
        const scrollContainers: Array<{
          element: string;
          overflowY: string;
          scrollHeight: number;
          clientHeight: number;
          scrollTop: number;
          canScroll: boolean;
          isAtBoundary: boolean;
        }> = [];
        
        let current: HTMLElement | null = target;
        while (current && current !== document.body) {
          const currentStyles = window.getComputedStyle(current);
          const currentOverflowY = currentStyles.overflowY;
          const currentScrollHeight = current.scrollHeight;
          const currentClientHeight = current.clientHeight;
          const currentScrollTop = current.scrollTop;
          
          if (currentOverflowY === 'auto' || currentOverflowY === 'scroll') {
            const canScroll = currentScrollHeight > currentClientHeight + 2;
            const isAtTop = currentScrollTop <= 1;
            const isAtBottom = currentScrollTop >= currentScrollHeight - currentClientHeight - 1;
            const isAtBoundary = (isAtTop && e.deltaY < 0) || (isAtBottom && e.deltaY > 0);
            
            const cls = typeof current.className === 'string' ? current.className : (current.className?.baseVal ?? '');
            scrollContainers.push({
              element: `${current.tagName.toLowerCase()}${current.id ? `#${current.id}` : ''}${cls ? `.${cls.split(' ').slice(0, 2).join('.')}` : ''}`,
              overflowY: currentOverflowY,
              scrollHeight: currentScrollHeight,
              clientHeight: currentClientHeight,
              scrollTop: currentScrollTop,
              canScroll,
              isAtBoundary,
            });
          }
          
          current = current.parentElement;
        }
        
        // Log body/documentElement scroll state
        const bodyScrollTop = document.body.scrollTop || document.documentElement.scrollTop;
        const bodyScrollHeight = document.body.scrollHeight;
        const bodyClientHeight = window.innerHeight;
        const bodyCanScroll = bodyScrollHeight > bodyClientHeight + 2;
        const bodyIsAtBottom = bodyScrollTop >= bodyScrollHeight - bodyClientHeight - 1;
        
        if (scrollContainers.length > 0) {
          const targetCls = typeof target.className === 'string' ? target.className : (target.className?.baseVal ?? '');
          console.log(`[WheelDiagnostics] ${location.pathname} - Wheel event captured:`, {
            target: `${target.tagName.toLowerCase()}${target.id ? `#${target.id}` : ''}${targetCls ? `.${targetCls.split(' ').slice(0, 2).join('.')}` : ''}`,
            deltaY: e.deltaY,
            scrollContainers,
            bodyScroll: {
              scrollTop: bodyScrollTop,
              scrollHeight: bodyScrollHeight,
              clientHeight: bodyClientHeight,
              canScroll: bodyCanScroll,
              isAtBottom: bodyIsAtBottom,
            },
            warning: scrollContainers.some(c => c.isAtBoundary && c.canScroll) 
              ? '⚠️ Wheel may be blocked by nested scroll container at boundary' 
              : '✅ No blocking detected',
          });
        }
      };
      
      // Use capture phase to catch wheel events before they're handled
      document.addEventListener('wheel', handleWheel, { capture: true, passive: true });
      
      return () => {
        document.removeEventListener('wheel', handleWheel, { capture: true });
      };
    }
  }, [location.pathname]);

  if (isMobile) {
    return (
      <div className="flex flex-col h-screen bg-[#0b1220]">
        {/* Pull-to-refresh indicator */}
        <PullToRefreshIndicator
          isRefreshing={pullToRefresh.isRefreshing}
          pullDistance={pullToRefresh.pullDistance}
          threshold={80}
          isPulling={pullToRefresh.isPulling}
        />
        {/* Mobile Header */}
        <div className="fixed top-0 left-0 right-0 z-50 bg-[#0b1220] border-b border-white/10" style={{right: 'var(--scrollbar-width, 0px)'}}>
          {/* Top bar with menu, logo, and profile */}
          <div className="flex items-center justify-between px-3 py-2">
            <button
              onClick={() => {
                console.log('Mobile menu button clicked, setting isMobileMenuOpen to true');
                setIsMobileMenuOpen(true);
              }}
              className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-300"
              aria-label="Open menu"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            
            {/* Logo and Brand */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl flex items-center justify-center">
                <Crown size={20} className="text-white font-bold" />
              </div>
              <span className="font-black text-lg text-white">XspensesAI</span>
            </div>
            
            <button 
              onClick={() => setIsProfileModalOpen(true)}
              className="flex items-center gap-2 hover:bg-white/10 rounded-lg p-1 transition-all duration-200"
              aria-label="Profile menu"
            >
              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-teal-500 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                </svg>
              </div>
              <span className="text-sm font-medium text-white hidden sm:block">John</span>
            </button>
          </div>
        </div>

        {/* Mobile Menu Drawer – Now using reusable component */}
        <MobileMenuDrawer
          open={isMobileMenuOpen}
          onClose={() => setIsMobileMenuOpen(false)}
        >
          <MobileSidebar open={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />
        </MobileMenuDrawer>

        {/* Main Content - flex-1 min-h-0 allows proper scrolling */}
        <main className="flex-1 min-h-0 overflow-y-auto pt-16 pb-16 scrollbar-hide">
          <div className="px-1 py-0">
            <div className="h-full">
              <Outlet />
            </div>
          </div>
        </main>

        {/* Mobile Bottom Navigation */}
        <MobileBottomNav />
        
        {/* Mobile Profile Modal */}
        <MobileProfileModal 
          isOpen={isProfileModalOpen} 
          onClose={() => setIsProfileModalOpen(false)} 
        />
        
        {/* Prime Intro Modal - REMOVED: Prime onboarding now handled in chat */}
        {/* <PrimeIntroModal open={showIntro} onComplete={complete} /> */}
        
      </div>
    );
  }

  // Desktop Layout - 3-column structure
  // 
  // Z-INDEX LAYERING (bottom to top):
  // - ActivityFeed: default z-index (stays in document flow)
  // - PrimeFloatingButton: z-30 (floats above content, below header)
  // - DesktopChatSideBar: z-998 (right-edge tab)
  // - UnifiedAssistantChat: z-999 (slide-out panel, highest)
  // - DashboardHeader: z-40 (sticky header, highest UI element)
  //
  // CHAT BEHAVIOR:
  // - PrimeFloatingButton: Opens unified chat via useUnifiedChatLauncher
  // - DesktopChatSideBar: Right-edge vertical tab, also opens unified chat
  // - UnifiedAssistantChat: Slide-out panel from right, overlays ActivityPanel correctly
  //
  // SCROLL BEHAVIOR:
  // - For ALL /dashboard/* routes: Main element is scroll container (internal scrolling only, body locked)
  // - For other routes: Internal scrolling via main element (h-screen overflow-hidden)
  // - Header is sticky, content scrolls beneath it
  // CRITICAL: Body should never scroll - only internal components scroll within their containers
  const useBodyScroll = isDashboardRoute;
  
  // Prevent body scrolling for ALL /dashboard/* routes - lock page height
  // CRITICAL: This prevents page-level scrolling - only internal components scroll within their containers
  useEffect(() => {
    if (useBodyScroll) {
      // Save original values
      const originalBodyOverflowY = document.body.style.overflowY;
      const originalBodyOverflowX = document.body.style.overflowX;
      const originalHtmlOverflow = document.documentElement.style.overflow;
      
      // Lock BODY - prevent page-level scrolling, only allow internal component scrolling
      // CRITICAL: HTML must NEVER scroll - set overflow: hidden to prevent any scrolling
      // BODY should not scroll - internal components handle their own scrolling
      document.documentElement.style.overflow = 'hidden';
      // Use 'clip' instead of 'hidden' to prevent phantom horizontal scrollbar
      document.documentElement.style.overflowX = 'clip';
      // Lock body dimensions strictly - prevent content from forcing expansion
      document.body.style.overflow = 'hidden';
      document.body.style.height = '100vh';
      document.body.style.maxHeight = '100vh';
      document.body.style.minHeight = '100vh';
      // Use 'clip' instead of 'hidden' to prevent phantom horizontal scrollbar
      document.body.style.overflowX = 'clip';
      
      // CRITICAL: hide-scrollbar is ONLY for mobile overlays, NOT for desktop body scrolling
      // Desktop body scrollbar must remain visible for proper scroll behavior
      // Mobile overlays (modals, slideouts) can hide scrollbar via their own scoped CSS
      // Do NOT apply hide-scrollbar to body on desktop - it breaks scroll diagnosis
      
      // Dev-only: Verify scroll ownership
      if (import.meta.env.DEV) {
        const mainElement = document.querySelector('main[data-dashboard-content]');
        const mainClassName = mainElement?.className || 'not found';
        const mainOverflow = mainClassName.split(' ').filter(c => c.includes('overflow')).join(' ') || 'none';
        console.log('[DashboardLayout] 🔒 BODY scroll locked:', {
          pathname: location.pathname,
          useBodyScroll,
          bodyOverflowY: document.body.style.overflowY,
          htmlOverflow: document.documentElement.style.overflow,
          mainOverflow,
        });
      }
      
      // Cleanup: Restore original values
      return () => {
        document.body.style.overflow = '';
        document.body.style.height = '';
        document.body.style.maxHeight = '';
        document.body.style.minHeight = '';
        document.body.style.overflowY = originalBodyOverflowY;
        document.body.style.overflowX = originalBodyOverflowX;
        // CRITICAL: Restore html overflow to original value (should be 'hidden' from CSS)
        document.documentElement.style.overflow = originalHtmlOverflow || 'hidden';
      };
    }
  }, [useBodyScroll, location.pathname]);
  
  return (
    <PrimeOverlayProvider>
      <div className="flex h-screen overflow-hidden overflow-x-hidden bg-slate-950">
      {/* LEFT COLUMN - Desktop Sidebar */}
      {/* High z-index ensures sidebar is above chat overlays (z-50) and other content */}
      <div className="fixed left-0 top-0 h-full z-[100]" style={{ pointerEvents: 'auto' }}>
        <DesktopSidebar 
          collapsed={isSidebarCollapsed}
          onToggleCollapse={setIsSidebarCollapsed}
        />
      </div>
      
      {/* MAIN + ACTIVITY COLUMNS */}
      {/* pr-4 on mobile only - rail is portaled to body, fixed to viewport right, so no space reservation needed */}
      {/* Rail is position:fixed right-4, so it's independent of this container's padding */}
      {/* CRITICAL: min-h-0 is MANDATORY for flex children to prevent overflow forcing body height */}
      {/* CRITICAL: For body scroll routes (ALL /dashboard/*), allow normal flow */}
      {/* For internal scroll routes, overflow-hidden prevents wrapper from creating page scrollbar */}
      <div className={`flex-1 flex flex-col min-h-0 transition-all duration-300 ${isSidebarCollapsed ? 'ml-16' : 'ml-56'} pr-4 ${useBodyScroll ? '' : 'overflow-hidden'}`}>
        <DashboardHeaderWithBadges />
        
        {/* Main content */}
        {/* pl-8 = left padding (2rem), pr-[calc(2rem+104px)] = right padding (2rem base + 104px rail width) */}
        {/* pb-6 md:pb-8 provides responsive bottom padding - reduced to prevent phantom scrollbar */}
        {/* CRITICAL: h-full ensures main fills available viewport height, flex-1 makes it grow to fill space */}
        {/* SCROLL OWNERSHIP (LOCKED INVARIANT):
            - For ALL /dashboard/* routes: Main element is scroll container (internal scrolling only)
            - For other routes: Main element is scroll container (overflow-y-auto with scrollbar-hide) */}
        <main 
          className="flex-1 min-w-0 w-full max-w-full h-full overflow-y-auto scrollbar-hide overflow-x-hidden pl-8 pr-[calc(2rem+104px)] pb-6 md:pb-8"
          data-dashboard-content
        >
          <DashboardContentGrid>
            <AnimatedOutlet />
          </DashboardContentGrid>
        </main>
      </div>
      
      {/* Prime Intro Modal - REMOVED: Prime onboarding now handled in chat */}
      {/* <PrimeIntroModal open={showIntro} onComplete={complete} /> */}

      {/* Post-Onboarding Chooser - Shows once after onboarding completion */}
      {profile && (() => {
        const metadata = profile?.metadata && typeof profile.metadata === 'object' ? profile.metadata : {};
        const custodianReady = (metadata as any)?.custodian_ready === true;
        return <PostOnboardingChooser custodianReady={custodianReady} />;
      })()}

      {/* Unified Assistant Chat - Slide-out panel (z-999, overlays ActivityFeed) */}
      {/* CRITICAL: Do NOT render on /dashboard/prime-chat route - PrimeChatPage uses slideout via launcher */}
      {/* CRITICAL: Do NOT render on /dashboard/custodian route - CustodianPage renders its own fullscreen chat */}
      {/* Always render to prevent unmount/remount (preserves greeting state) */}
      {/* Wrapped in ChatErrorBoundary to prevent chat crashes from affecting dashboard */}
      {/* CRITICAL: Guard prevents double mount - only ONE UnifiedAssistantChat instance allowed */}
      {/* Use startsWith to catch any sub-routes (e.g., /dashboard/prime-chat/...) */}
      {!location.pathname.startsWith('/dashboard/prime-chat') && !location.pathname.startsWith('/dashboard/custodian') && (
        <ChatErrorBoundary>
          <UnifiedAssistantChat
            isOpen={isChatOpen}
            onClose={closeChat}
            initialEmployeeSlug={activeEmployeeSlug || chatOptions.initialEmployeeSlug}
            conversationId={chatOptions.conversationId}
            context={chatOptions.context}
            initialQuestion={chatOptions.initialQuestion}
            renderMode="slideout"
          />
        </ChatErrorBoundary>
      )}
      

      {/* Chat History Sidebar */}
      <ChatHistorySidebar
        isOpen={isChatHistoryOpen}
        onClose={handleCloseChatHistory}
      />

      {/* Desktop Side Chat Tab - Right-edge vertical tab (z-[999]) */}
      {/* All buttons (Prime, Byte, Tag, Crystal) open UnifiedAssistantChat */}
      {/* Rail always mounts on desktop (md+) but visually dims when chat is open */}
      {/* CRITICAL: Always render rail on all dashboard routes (including /dashboard/prime-chat) */}
      <DesktopChatSideBar 
        onHistoryClick={handleOpenChatHistory}
      />

      {/* Prime Floating Action Button - Bottom-right (z-30, below header z-40) */}
      {/* Opens unified chat slideout with Prime when clicked */}
      {/* Hide on Prime Chat page - PrimeChatPage has its own Prime Tools button */}
      {/* DISABLED: Legacy Prime bubble removed - use unified chat system only */}
      {/* <PrimeFloatingButton 
        hidden={location.pathname.includes('/prime-chat')} 
      /> */}

      {/* Control Center Drawer - Profile/Preferences/Security */}
      <ControlCenterDrawer />
      
      {/* Account Center Panel - Account/Billing/Custodian Support/Data & Privacy */}
      <AccountCenterPanel />

      {/* Prime Tools Panel - Opens from floating rail Prime Tools button */}
      <PrimeToolsPanel />

      {/* Unified Onboarding Flow - Prime → Custodian Modal (Guest + Auth) */}
      {/* UnifiedOnboardingFlow disabled when CinematicOnboardingOverlay is active */}
      {/* CinematicOnboardingOverlay is the SINGLE SOURCE OF TRUTH for onboarding UI */}
      {!(showFirstTimeSetup && !firstTimeSetupCompleted) && (
        <UnifiedOnboardingFlow />
      )}
      
      {/* First-Time Setup Overlay - Blocking overlay for new users */}
      {/* SINGLE SOURCE OF TRUTH: Only show if onboarding_completed !== true */}
      {showFirstTimeSetup && !firstTimeSetupCompleted && (
        <CinematicOnboardingOverlay
          missingFields={missingFields}
          onComplete={() => {
            setFirstTimeSetupCompleted(true);
            refreshProfile?.();
          }}
        />
      )}

      {/* Welcome Back Overlay - Premium cinematic overlay for returning users */}
      {/* GUARD: Only show on /dashboard routes, never on /onboarding routes */}
      {showWelcomeBack && !showFirstTimeSetup && !location.pathname.startsWith('/onboarding') && (
        <PrimeWelcomeOverlayCinematic />
      )}
      
      {/* Post-Onboarding Chooser - Show only immediately after onboarding completion */}
      {showPostOnboardingChooser && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-8 max-w-md w-full mx-4 shadow-2xl">
            <h2 className="text-2xl font-semibold text-white mb-2">Where would you like to go?</h2>
            <p className="text-slate-400 text-sm mb-6">Choose your next destination</p>
            
            <div className="flex flex-col gap-3">
              {/* Dashboard Option */}
              <button
                onClick={() => handleChooserOption('dashboard')}
                className="w-full flex items-center gap-3 px-4 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 rounded-lg text-white font-medium transition-all hover:-translate-y-[1px] active:translate-y-0"
              >
                <LayoutDashboard className="w-5 h-5" />
                <span>Dashboard</span>
              </button>
              
              {/* Prime Option */}
              <button
                onClick={() => handleChooserOption('prime')}
                className="w-full flex items-center gap-3 px-4 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 rounded-lg text-white font-medium transition-all hover:-translate-y-[1px] active:translate-y-0"
              >
                <Crown className="w-5 h-5" />
                <span>Prime</span>
              </button>
              
              {/* Settings Option */}
              <button
                onClick={() => handleChooserOption('settings')}
                className="w-full flex items-center gap-3 px-4 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 rounded-lg text-white font-medium transition-all hover:-translate-y-[1px] active:translate-y-0"
              >
                <Settings className="w-5 h-5" />
                <span>Settings</span>
              </button>
            </div>
          </div>
        </div>
      )}
      
      </div>
    </PrimeOverlayProvider>
  );
}
