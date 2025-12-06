import { useState, useEffect, useMemo } from "react";
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
import { StatusBadge } from "../components/ui/StatusBadge";
import { PrimeSidebarChat } from "../components/chat/PrimeSidebarChat";
import { ChatHistorySidebar } from "../components/chat/ChatHistorySidebar";

// DashboardHeaderWithBadges - Wrapper that adds status badges based on route
function DashboardHeaderWithBadges() {
  const location = useLocation();
  
  // Generate secondary status label based on route
  // Primary pill ("Prime Online • 24/7") is always rendered by DashboardHeader
  const secondaryStatusLabel = useMemo(() => {
    // Main dashboard
    if (location.pathname === '/dashboard' || location.pathname === '/dashboard/') {
      return 'AI team active';
    }
    
    // Smart Import AI - special case (uses Byte Online, handled separately)
    if (location.pathname.includes('/smart-import-ai')) {
      return 'Uploads enabled';
    }
    
    // AI Chat Assistant - special case
    if (location.pathname.includes('/ai-chat-assistant')) {
      return 'Model: gpt-4o / enterprise safe';
    }
    
    // Overview
    if (location.pathname.includes('/overview')) {
      return 'Insights updated';
    }
    
    // Planning
    if (location.pathname.includes('/planning')) {
      return 'Goals synced';
    }
    
    // Analytics
    if (location.pathname.includes('/analytics')) {
      return 'Metrics refreshed';
    }
    
    // Business
    if (location.pathname.includes('/business')) {
      return 'Reports ready';
    }
    
    // Entertainment
    if (location.pathname.includes('/entertainment')) {
      return 'New story available';
    }
    
    // Reports
    if (location.pathname.includes('/reports')) {
      return 'Last report • Dec 2024';
    }
    
    return 'AI team active'; // Default
  }, [location.pathname]);
  
  // For Smart Import AI and AI Chat Assistant, use statusBadges prop for backward compatibility
  // (they have custom primary pill text)
  const statusBadges = useMemo(() => {
    if (location.pathname.includes('/smart-import-ai')) {
      return (
        <>
          <StatusBadge variant="online" fixedWidth>
            <span className="w-1.5 h-1.5 bg-green-400 rounded-full inline-block mr-1.5 animate-pulse"></span>
            Byte Online • 24/7
          </StatusBadge>
          <StatusBadge fixedWidth>Uploads enabled</StatusBadge>
        </>
      );
    }
    
    if (location.pathname.includes('/ai-chat-assistant')) {
      return (
        <>
          <StatusBadge variant="online" fixedWidth>
            <span className="w-1.5 h-1.5 bg-green-400 rounded-full inline-block mr-1.5 animate-pulse"></span>
            Online • 24/7
          </StatusBadge>
          <StatusBadge fixedWidth>Model: gpt-4o / enterprise safe</StatusBadge>
        </>
      );
    }
    
    return undefined;
  }, [location.pathname]);
  
  return <DashboardHeader statusBadges={statusBadges} secondaryStatusLabel={secondaryStatusLabel} />;
}

// DashboardContentGrid - shows Activity Feed sidebar on the right for non-workspace pages
// Workspace pages (using DashboardThreeColumnLayout) handle their own Activity Feed
function DashboardContentGrid({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  
  // Pages that use DashboardThreeColumnLayout and manage their own Activity Feed
  const workspacePages = [
    '/prime-chat',
    '/smart-import-ai',
    '/smart-import-chat',
    '/transactions',
    '/smart-categories',
    '/analytics-ai',
    '/analytics',
    '/ai-chat-assistant',
    '/ai-financial-freedom',
    '/bank-accounts',
    '/goal-concierge',
    '/smart-automation',
    '/spending-predictions',
    '/debt-payoff-planner',
    '/bill-reminders',
    '/personal-podcast',
    '/financial-story',
    '/financial-therapist',
    '/wellness-studio',
    '/spotify',
    '/tax-assistant',
    '/business-intelligence',
  ];
  
  const isWorkspacePage = workspacePages.some(path => location.pathname.includes(path));
  
  // For workspace pages, don't add Activity Feed (they use DashboardThreeColumnLayout)
  if (isWorkspacePage) {
    return <>{children}</>;
  }
  
  // Determine activity scope based on route
  const getActivityScope = (): string | undefined => {
    if (location.pathname.includes('/prime-chat')) return 'prime';
    if (location.pathname.includes('/settings')) return 'settings';
    if (location.pathname.includes('/reports')) return 'reports';
    if (location.pathname === '/dashboard' || location.pathname === '/dashboard/') return 'dashboard';
    return undefined; // Show all activity
  };
  
  const activityScope = getActivityScope();
  
  // Check if this is Prime Chat page - use 3-column layout (33% | 34% | 33%)
  const isPrimeChatPage = location.pathname.includes('/prime-chat');
  
  // Standard 2-column layout for all pages with Activity Feed sidebar
  // For Prime Chat: 3 columns (33% | 34% | 33%) - middle is slightly larger
  const gridCols = isPrimeChatPage 
    ? 'xl:grid-cols-[1fr_1.03fr_1fr]' 
    : 'xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,0.9fr)]';
  
  return (
    <div className={`grid gap-6 ${gridCols}`}>
      {/* LEFT/MIDDLE COLUMN - Main Dashboard Content */}
      <div className={`min-w-0 ${isPrimeChatPage ? 'col-span-2' : ''}`}>
        {children}
      </div>

      {/* RIGHT COLUMN - Activity Feed Sidebar */}
      <div className="hidden xl:block shrink-0">
        <ActivityFeedSidebar scope={activityScope} />
      </div>
    </div>
  );
}


export default function DashboardLayout() {
  const location = useLocation();
  
  // Hide Prime Floating Button on Prime Chat page (PrimeChatPage has its own Prime Tools button)
  const isPrimeChatPage = location.pathname.includes('/prime-chat');
  const [isMobile, setIsMobile] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const { isOpen: isChatOpen, options: chatOptions, openChat, closeChat } = useUnifiedChatLauncher();
  const [isPrimeSidebarOpen, setIsPrimeSidebarOpen] = useState(false);
  const [isChatHistoryOpen, setIsChatHistoryOpen] = useState(false);

  // Close Prime sidebar when opening chat history (and vice versa)
  const handleOpenChatHistory = () => {
    setIsPrimeSidebarOpen(false);
    setIsChatHistoryOpen(true);
  };
  
  // Listen for global chat history open event (for docked rails in panels)
  useEffect(() => {
    const handleGlobalOpenHistory = () => {
      setIsPrimeSidebarOpen(false);
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

  const handleOpenPrimeSidebar = () => {
    setIsChatHistoryOpen(false);
    setIsPrimeSidebarOpen(true);
  };

  const handleClosePrimeSidebar = () => {
    setIsPrimeSidebarOpen(false);
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

        {/* Unified Assistant Chat */}
        <UnifiedAssistantChat
          isOpen={isChatOpen}
          onClose={closeChat}
          initialEmployeeSlug={chatOptions.initialEmployeeSlug}
          conversationId={chatOptions.conversationId}
          context={chatOptions.context}
          initialQuestion={chatOptions.initialQuestion}
        />
        
        {/* Prime Sidebar Chat - Right sidebar for Prime chat on all dashboard pages */}
        {isPrimeSidebarOpen && (
          <aside
            className="fixed right-0 top-0 h-full w-full md:w-[420px] border-l border-slate-800 bg-slate-950/95 backdrop-blur z-[999]"
            aria-label="Prime chat sidebar"
          >
            {/* Sidebar Header */}
            <div className="flex justify-between items-center px-4 py-3 border-b border-slate-800 bg-slate-900/50">
              <div className="flex items-center gap-2">
                <span className="text-lg">👑</span>
                <span className="text-sm font-medium text-slate-200">
                  Prime — Chat
                </span>
              </div>
            <button
              onClick={handleClosePrimeSidebar}
              className="text-slate-400 hover:text-slate-100 text-lg leading-none w-6 h-6 flex items-center justify-center rounded hover:bg-slate-800 transition-colors"
              aria-label="Close Prime chat"
            >
              ✕
            </button>
            </div>

            {/* Chat Content */}
            <div className="h-[calc(100%-48px)]">
              <PrimeSidebarChat />
            </div>
          </aside>
        )}
        
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
        <main className="flex-1 px-8 pb-10" data-dashboard-content>
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
        initialEmployeeSlug={chatOptions.initialEmployeeSlug}
        conversationId={chatOptions.conversationId}
        context={chatOptions.context}
        initialQuestion={chatOptions.initialQuestion}
      />
      
      {/* Prime Sidebar Chat - Right sidebar for Prime chat on all dashboard pages */}
      {isPrimeSidebarOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[998]"
            onClick={handleClosePrimeSidebar}
            aria-hidden="true"
          />
          
          {/* Slideout Panel */}
          <aside
            className="fixed top-4 bottom-4 right-4 w-full md:w-[420px] md:max-w-[420px] rounded-3xl bg-slate-950/90 backdrop-blur-xl border border-white/5 shadow-[0_0_60px_rgba(252,211,77,0.15)] z-[999] flex flex-col overflow-hidden"
            aria-label="Prime chat sidebar"
          >
            {/* Sidebar Header */}
            <div className="flex justify-between items-center px-4 py-3 border-b border-white/10 bg-slate-900/50">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-400 via-pink-500 to-purple-600 shadow-[0_0_20px_rgba(252,211,77,0.4)]">
                  <span className="text-lg">👑</span>
                </div>
                <div>
                  <div className="text-sm font-semibold text-white">Prime — AI Command Center</div>
                  <div className="text-xs text-slate-400">CEO & Strategic Orchestrator</div>
                </div>
              </div>
              <button
                onClick={handleClosePrimeSidebar}
                className="text-slate-400 hover:text-slate-100 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors"
                aria-label="Close Prime chat"
              >
                ✕
              </button>
            </div>

            {/* Chat Content */}
            <div className="flex-1 min-h-0 overflow-hidden">
              <PrimeSidebarChat />
            </div>
          </aside>
        </>
      )}

      {/* Chat History Sidebar */}
      <ChatHistorySidebar
        isOpen={isChatHistoryOpen}
        onClose={handleCloseChatHistory}
      />

      {/* Desktop Side Chat Tab - Right-edge vertical tab (z-998) */}
      {/* Prime button opens Prime sidebar, other buttons open UnifiedAssistantChat */}
      {/* Hide on Prime Chat page - PrimeChatPage manages its own rail visibility */}
      {!location.pathname.includes('/prime-chat') && (
        <DesktopChatSideBar 
          onPrimeClick={handleOpenPrimeSidebar}
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
