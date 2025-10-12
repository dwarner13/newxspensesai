import { useState, useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Crown } from "lucide-react";
import DesktopSidebar from "../components/navigation/DesktopSidebar";
import DashboardHeader from "../components/ui/DashboardHeader";
import AITeamSidebar from "../components/layout/AITeamSidebar";
import MobileSidebar from "../components/layout/MobileSidebar";
import MobileBottomNav from "../components/layout/MobileBottomNav";
import MobileProfileModal from "../components/layout/MobileProfileModal";
import { usePullToRefresh } from "../hooks/usePullToRefresh";
import PullToRefreshIndicator from "../components/ui/PullToRefreshIndicator";

export default function DashboardLayout() {
  const location = useLocation();
  const [isMobile, setIsMobile] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

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

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, []);

  if (isMobile) {
    return (
      <div className="flex flex-col h-screen bg-[#0f172a]">
        {/* Pull-to-refresh indicator */}
        <PullToRefreshIndicator
          isRefreshing={pullToRefresh.isRefreshing}
          pullDistance={pullToRefresh.pullDistance}
          threshold={80}
          isPulling={pullToRefresh.isPulling}
        />
        {/* Mobile Header */}
        <div className="fixed top-0 left-0 right-0 z-50 bg-[#0f172a] border-b border-white/10" style={{right: 'var(--scrollbar-width, 0px)'}}>
          {/* Top bar with menu, logo, and profile */}
          <div className="flex items-center justify-between px-3 py-2">
            <button
              onClick={() => {
                console.log('Mobile menu button clicked, setting isMobileMenuOpen to true');
                setIsMobileMenuOpen(true);
              }}
              className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-300"
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

        {/* Mobile Sidebar Overlay */}
        
          {isMobileMenuOpen && (
            <>
              {console.log('Rendering mobile sidebar overlay, isMobileMenuOpen:', isMobileMenuOpen)}
              <div
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" 
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <div 
                className="fixed left-0 top-0 h-full w-80 z-50"
                onClick={(e) => e.stopPropagation()}
              >
                <MobileSidebar open={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />
              </div>
            </div>
            </>
          )}
        

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
        
      </div>
    );
  }

  // Desktop Layout
  return (
    <div className="flex h-screen bg-[#0f172a]">
      {/* Left sidebar - fixed */}
      <div className="fixed left-0 top-0 h-full z-30">
        <DesktopSidebar 
          collapsed={isSidebarCollapsed}
          onToggleCollapse={setIsSidebarCollapsed}
        />
      </div>
      
      {/* Main content area */}
      <div className={`flex-1 min-w-0 transition-all duration-300 ${isSidebarCollapsed ? 'ml-16' : 'ml-56'}`}>
        <div className="flex h-full">
          {/* Main content column */}
          <div className="flex-1 min-w-0 flex flex-col">
            <DashboardHeader />
            <main className="flex-1 overflow-y-auto">
              <div className="w-full px-8 py-6">
                <Outlet />
              </div>
            </main>
          </div>
          
          {/* Right sidebar - only show on larger screens */}
          <div className="hidden xl:block w-80 bg-zinc-900/90 backdrop-blur-sm border-l border-zinc-700 flex-shrink-0 overflow-y-auto">
            <div className="h-full">
              <AITeamSidebar />
            </div>
          </div>
        </div>
      </div>
      
      
    </div>
  );
}
