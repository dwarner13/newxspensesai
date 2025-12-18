import { useState, useEffect } from "react";
import React from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Crown } from "lucide-react";
import DesktopSidebar from "../components/navigation/DesktopSidebar";
import DashboardHeader from "../components/ui/DashboardHeader";
import MobileSidebar from "../components/layout/MobileSidebar";
import MobileBottomNav from "../components/layout/MobileBottomNav";
import MobileProfileModal from "../components/layout/MobileProfileModal";
import MobileMenuDrawer from "../components/ui/MobileMenuDrawer";
import { PrimeIntroModal } from "../components/prime/PrimeIntroModal";
import { usePrimeIntro } from "../hooks/usePrimeIntro";
import { usePullToRefresh } from "../hooks/usePullToRefresh";
import PullToRefreshIndicator from "../components/ui/PullToRefreshIndicator";
import UnifiedAssistantChat from "../components/chat/UnifiedAssistantChat";
import { useUnifiedChatLauncher } from "../hooks/useUnifiedChatLauncher";
import { PrimeFloatingButton } from "../components/chat/PrimeFloatingButton";
import { ActivityFeedSidebar } from "../components/dashboard/ActivityFeedSidebar";
import DesktopChatSideBar from "../components/chat/DesktopChatSideBar";
import { ChatHistorySidebar } from "../components/chat/ChatHistorySidebar";

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
    '/dashboard/spotify-integration',
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

  // For main dashboard, wrap with rail space reservation (desktop-only)
  // Rail space handled at layout-pattern level, not page-level
  if (isMainDashboard) {
    return (
      <div className="lg:pr-[var(--rail-space,96px)]">
        {children}
      </div>
    );
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
  
  // Hide Prime Floating Button on Prime Chat page (PrimeChatPage has its own Prime Tools button)
  const isPrimeChatPage = location.pathname.includes('/prime-chat');
  const [isMobile, setIsMobile] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const { isOpen: isChatOpen, options: chatOptions, activeEmployeeSlug, closeChat } = useUnifiedChatLauncher();
  
  // Debug: Log when chat state changes
  useEffect(() => {
    console.log('[DashboardLayout] Chat state changed:', { 
      isChatOpen, 
      activeEmployeeSlug,
      optionsEmployeeSlug: chatOptions.initialEmployeeSlug 
    });
  }, [isChatOpen, activeEmployeeSlug, chatOptions.initialEmployeeSlug]);
  const [isChatHistoryOpen, setIsChatHistoryOpen] = useState(false);

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

  // Prime intro hook
  const { showIntro, complete } = usePrimeIntro();

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

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto pt-16 pb-16">
          <div className="px-1 py-0 min-h-screen">
            <div
              key={location.pathname}
              className="h-full"
            >
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
        
        {/* Prime Intro Modal */}
        <PrimeIntroModal open={showIntro} onComplete={complete} />
        
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
  // - No nested scroll containers - browser window handles scrolling
  // - Header is sticky, content scrolls beneath it
  return (
    <div className="flex min-h-screen bg-slate-950">
      {/* LEFT COLUMN - Desktop Sidebar */}
      {/* High z-index ensures sidebar is above chat overlays (z-50) and other content */}
      <div className="fixed left-0 top-0 h-full z-[100]" style={{ pointerEvents: 'auto' }}>
        <DesktopSidebar 
          collapsed={isSidebarCollapsed}
          onToggleCollapse={setIsSidebarCollapsed}
        />
      </div>
      
      {/* MAIN + ACTIVITY COLUMNS */}
      <div className={`flex-1 flex flex-col transition-all duration-300 ${isSidebarCollapsed ? 'ml-16' : 'ml-56'}`}>
        <DashboardHeaderWithBadges />
        
        {/* Main content: no nested overflow scroll */}
        {/* px-8 provides symmetric horizontal padding */}
        {/* pb-10 provides bottom padding */}
        {/* Removed pr-24 md:pr-28 - rail space is handled by right column's lg:mr-[var(--rail-space)] */}
        {/* Task B: Ensure sidebar dashboard pages can expand fully - flex-1 min-w-0 w-full max-w-full */}
        <main className="flex-1 min-w-0 w-full max-w-full px-8 pb-10" data-dashboard-content>
          <DashboardContentGrid>
            <Outlet />
          </DashboardContentGrid>
        </main>
      </div>
      
      {/* Prime Intro Modal */}
      <PrimeIntroModal open={showIntro} onComplete={complete} />

      {/* Unified Assistant Chat - Slide-out panel (z-999, overlays ActivityFeed) */}
      <UnifiedAssistantChat
        isOpen={isChatOpen}
        onClose={closeChat}
        initialEmployeeSlug={activeEmployeeSlug || chatOptions.initialEmployeeSlug}
        conversationId={chatOptions.conversationId}
        context={chatOptions.context}
        initialQuestion={chatOptions.initialQuestion}
      />
      

      {/* Chat History Sidebar */}
      <ChatHistorySidebar
        isOpen={isChatHistoryOpen}
        onClose={handleCloseChatHistory}
      />

      {/* Desktop Side Chat Tab - Right-edge vertical tab (z-998) */}
      {/* All buttons (Prime, Byte, Tag, Crystal) open UnifiedAssistantChat */}
      {/* Hide global rail when unified chat slideout is open (chat has its own attached rail) */}
      {/* Also hide on Prime Chat page - PrimeChatPage uses UnifiedAssistantChat with attached rail */}
      {!isChatOpen && !isPrimeChatPage && (
        <DesktopChatSideBar 
          onHistoryClick={handleOpenChatHistory}
        />
      )}

      {/* Prime Floating Action Button - Bottom-right (z-30, below header z-40) */}
      {/* Opens unified chat slideout with Prime when clicked */}
      {/* Hide on Prime Chat page - PrimeChatPage has its own Prime Tools button */}
      <PrimeFloatingButton 
        hidden={location.pathname.includes('/prime-chat')} 
      />
      
    </div>
  );
}
