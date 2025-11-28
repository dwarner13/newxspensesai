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
import { ActivityPanel } from "../components/dashboard/ActivityPanel";
import DesktopChatSideBar from "../components/chat/DesktopChatSideBar";
import { StatusBadge } from "../components/ui/StatusBadge";

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

// DashboardContentGrid - adjusts column ratios based on route
function DashboardContentGrid({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  
  // Pages that handle their own 3-column layout (including ActivityPanel)
  // These should not be wrapped in the standard 2-column layout
  const isWorkspacePage = location.pathname.includes('/smart-import-ai') || 
                          location.pathname.includes('/ai-chat-assistant') ||
                          location.pathname.includes('/prime-chat') ||
                          location.pathname.includes('/smart-categories') ||
                          location.pathname.includes('/analytics-ai') ||
                          location.pathname.includes('/ai-financial-freedom') ||
                          location.pathname.includes('/transactions') ||
                          location.pathname.includes('/bank-accounts') ||
                          location.pathname.includes('/goal-concierge') ||
                          location.pathname.includes('/smart-automation') ||
                          location.pathname.includes('/spending-predictions') ||
                          location.pathname.includes('/debt-payoff-planner') ||
                          location.pathname.includes('/bill-reminders') ||
                          location.pathname.includes('/personal-podcast') ||
                          location.pathname.includes('/financial-story') ||
                          location.pathname.includes('/financial-therapist') ||
                          location.pathname.includes('/wellness-studio') ||
                          location.pathname.includes('/spotify') ||
                          location.pathname.includes('/tax-assistant') ||
                          location.pathname.includes('/business-intelligence') ||
                          location.pathname.includes('/analytics') ||
                          location.pathname.includes('/settings') ||
                          location.pathname.includes('/reports');
  
  if (isWorkspacePage) {
    // Workspace pages render their own 3-column layout including ActivityPanel
    return <>{children}</>;
  }
  
  // Standard 2-column layout for other pages
  const gridCols = 'xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,0.9fr)]';
  
  return (
    <div className={`grid gap-6 ${gridCols}`}>
      {/* MIDDLE COLUMN - Main Dashboard Content */}
      <div className="min-w-0">
        {children}
      </div>

      {/* RIGHT COLUMN - Activity Panel */}
      <div className="hidden xl:block shrink-0">
        <ActivityPanel />
      </div>
    </div>
  );
}


export default function DashboardLayout() {
  const location = useLocation();
  const [isMobile, setIsMobile] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const { isOpen: isChatOpen, options: chatOptions, openChat, closeChat } = useUnifiedChatLauncher();

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

  // Listen for global chat open events
  useEffect(() => {
    const handleOpen = (e: Event) => {
      const customEvent = e as CustomEvent;
      openChat(customEvent.detail);
    };
    const handleUnifiedOpen = (e: Event) => {
      const customEvent = e as CustomEvent;
      openChat(customEvent.detail);
    };
    
    window.addEventListener('prime:open', handleOpen as EventListener);
    window.addEventListener('unified-chat:open', handleUnifiedOpen as EventListener);
    
    return () => {
      window.removeEventListener('prime:open', handleOpen as EventListener);
      window.removeEventListener('unified-chat:open', handleUnifiedOpen as EventListener);
    };
  }, [openChat]);

  // Reset scroll position when route changes
  useEffect(() => {
    console.log('[DashboardLayout] Route changed to:', location.pathname);
    window.scrollTo(0, 0);
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
        
      </div>
    );
  }

  // Desktop Layout - 3-column structure
  // 
  // Z-INDEX LAYERING (bottom to top):
  // - ActivityPanel: default z-index (stays in document flow)
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
      <div className="fixed left-0 top-0 h-full z-30">
        <DesktopSidebar 
          collapsed={isSidebarCollapsed}
          onToggleCollapse={setIsSidebarCollapsed}
        />
      </div>
      
      {/* MAIN + ACTIVITY COLUMNS */}
      <div className={`flex-1 flex flex-col transition-all duration-300 ${isSidebarCollapsed ? 'ml-16' : 'ml-56'}`}>
        <DashboardHeaderWithBadges />
        
        {/* Main content: no nested overflow scroll */}
        <main className="flex-1 px-8 pb-10">
          <DashboardContentGrid>
            <Outlet />
          </DashboardContentGrid>
        </main>
      </div>
      
      {/* Prime Intro Modal */}
      <PrimeIntroModal open={showIntro} onComplete={complete} />

      {/* Unified Assistant Chat - Slide-out panel (z-999, overlays ActivityPanel) */}
      <UnifiedAssistantChat
        isOpen={isChatOpen}
        onClose={closeChat}
        initialEmployeeSlug={chatOptions.initialEmployeeSlug}
        conversationId={chatOptions.conversationId}
        context={chatOptions.context}
        initialQuestion={chatOptions.initialQuestion}
      />

      {/* Desktop Side Chat Tab - Right-edge vertical tab (z-998) */}
      <DesktopChatSideBar />

      {/* Prime Floating Action Button - Bottom-right (z-30, below header z-40) */}
      <PrimeFloatingButton />
      
    </div>
  );
}
