import React, { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import { Crown } from "lucide-react";
import DesktopSidebar from "../navigation/DesktopSidebar";
import MobileNavInline from "../navigation/MobileNavInline";
import BossBubble from "../boss/BossBubble";
import DashboardHeader from "../ui/DashboardHeader";
import RightSidebar from "../ui/RightSidebar";



export default function DashboardLayout() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);


  // Dev-only guard to detect duplicate sidebars
  useEffect(() => {
    if (import.meta.env.DEV) {
      const sidebars = document.querySelectorAll('[data-testid="desktop-sidebar"]');
      if (sidebars.length > 1) {
        console.warn('[DesktopSidebar] duplicate sidebars detected:', sidebars.length);
      }
    }
  }, []);

  // Add dashboard-page class to body when this component mounts
  useEffect(() => {
    document.body.classList.add('dashboard-page');
    // Prevent body scrolling when dashboard is active
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.classList.remove('dashboard-page');
      // Restore body scrolling when leaving dashboard
      document.body.style.overflow = 'auto';
    };
  }, []);


  return (
    <>
      <div className="dashboard-layout h-screen bg-[#0f172a] text-white flex" data-page="dashboard" data-sidebar-collapsed={isSidebarCollapsed}>
        {/* Desktop sidebar - Hidden on mobile */}
        <div className="hidden lg:block">
          <DesktopSidebar 
            collapsed={isSidebarCollapsed}
            onToggleCollapse={setIsSidebarCollapsed}
          />
        </div>

        {/* Middle + Right rail */}
        <div className="flex flex-1 min-w-0">
          {/* Middle column */}
          <div className="flex-1 min-w-0 flex flex-col">
            {/* Mobile Header - Only visible on mobile */}
            <div className="lg:hidden w-full p-4 border-b border-purple-500/10 bg-gradient-to-r from-purple-500/5 to-cyan-500/2 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-yellow-500 rounded-xl flex items-center justify-center">
                  <div className="flex flex-col items-center">
                    <Crown className="h-4 w-4 text-white stroke-2" />
                    <div className="w-3 h-0.5 bg-white mt-0.5"></div>
                  </div>
                </div>
                <span className="text-xl font-bold text-white">XspensesAI</span>
              </div>
              <MobileNavInline />
            </div>

            {/* Shared Dashboard Header - Desktop only */}
            <div className="hidden lg:block">
              <DashboardHeader />
            </div>
            
            <main className="flex-1 w-full overflow-y-auto">
              <Outlet />
            </main>
          </div>

          {/* Right sidebar */}
          <RightSidebar />
        </div>

        {/* Prime Chatbot - Using the main BossBubble */}
        <BossBubble />
      </div>
  </>
);
}
