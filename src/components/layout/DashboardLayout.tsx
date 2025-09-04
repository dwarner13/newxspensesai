import React, { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import MobileSidebar from "./MobileSidebar";
import BottomNav from "./BottomNav";
import Logo from "../common/Logo";
import AITeamSidebar from "./AITeamSidebar";
import DashboardHeader from "../ui/DashboardHeader";



export default function DashboardLayout() {
  const [open, setOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const location = useLocation();

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

  // Close drawer on route change (no page scrolling needed)
  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  return (
    <>
      <div className="dashboard-layout h-screen bg-[#0f172a] text-white lg:flex" data-page="dashboard">
        {/* Desktop sidebar - Dynamic width based on collapsed state */}
        <aside className={`hidden lg:block shrink-0 border-r border-purple-500/20 bg-[rgba(15,23,42,0.95)] transition-all duration-300 ${
          isSidebarCollapsed ? 'w-[80px]' : 'w-[300px]'
        }`}>
          <Sidebar 
            isMobileOpen={false} 
            setIsMobileOpen={() => {}} 
            isCollapsed={isSidebarCollapsed}
            setIsCollapsed={setIsSidebarCollapsed}
          />
        </aside>

        {/* Main content area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Mobile top bar */}
          <header className="lg:hidden sticky top-0 z-40 bg-[rgba(15,23,42,0.95)]/95 backdrop-blur border-b border-white/10">
            <div className="flex items-center gap-3 px-4 py-4">
              {/* Logo and title - Now on the LEFT */}
              <div className="flex items-center gap-3 flex-1">
                <Logo size="md" linkTo="/dashboard" />
              </div>
              
              {/* Hamburger menu - Now on the RIGHT */}
              <button
                aria-label="Open menu"
                onClick={() => setOpen(true)}
                className="rounded-xl p-3 hover:bg-white/10 transition-colors duration-200 text-white/90 hover:text-white"
              >
                {/* Enhanced hamburger menu */}
                <div className="space-y-1.5">
                  <span className="block h-0.5 w-6 bg-current transition-all duration-200" />
                  <span className="block h-0.5 w-6 bg-current transition-all duration-200" />
                  <span className="block h-0.5 w-6 bg-current transition-all duration-200" />
                </div>
              </button>
            </div>
          </header>

          {/* Full width header for all dashboard pages */}
          <div className="w-full">
            <DashboardHeader />
          </div>
          
          {/* Main content and AI Team Sidebar */}
          <div className="flex-1 flex overflow-hidden">
            <main className="flex-1 overflow-y-auto dashboard-main-content">
              <Outlet />
            </main>
            
            {/* AI Team Sidebar - Only show on main dashboard */}
            {location.pathname === '/dashboard' && (
              <aside className="hidden lg:block w-[280px] shrink-0 bg-[rgba(15,23,42,0.95)] border-l border-white/10">
                <AITeamSidebar />
              </aside>
            )}
          </div>
        </div>

        {/* Mobile drawer uses the same Sidebar */}
        <MobileSidebar open={open} onClose={() => setOpen(false)}>
          <Sidebar isMobileOpen={open} setIsMobileOpen={setOpen} />
        </MobileSidebar>

        {/* Bottom tabs (mobile only) */}
        <BottomNav onMore={() => setOpen(true)} />
      </div>
  </>
);
}
