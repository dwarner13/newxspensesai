import React, { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import MobileSidebar from "./MobileSidebar";
import BottomNav from "./BottomNav";
import RouteScrollReset from '../util/RouteScrollReset';

export default function DashboardLayout() {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  // Close drawer + scroll to top on route change
  useEffect(() => {
    setOpen(false);
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [location.pathname]);

  return (
    <>
      <RouteScrollReset />
      <div className="dashboard-layout min-h-dvh bg-gradient-to-b from-[#0f172a] to-[#1a1e3a] text-white lg:flex">
        {/* Desktop sidebar - Fixed width, no margin */}
        <aside className="hidden lg:block w-72 shrink-0 border-r border-purple-500/10 bg-[#1e293b]">
          <Sidebar isMobileOpen={false} setIsMobileOpen={() => {}} />
        </aside>

        {/* Mobile top bar */}
        <header className="lg:hidden sticky top-0 z-40 bg-[#1e293b]/95 backdrop-blur border-b border-white/10">
          <div className="flex items-center gap-3 px-4 py-4">
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
            
            {/* Logo and title */}
            <div className="flex items-center gap-3 flex-1">
              <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-lg flex items-center justify-center">
                <span className="text-white text-sm font-bold">💰</span>
              </div>
              <span className="text-lg font-bold text-white">XspensesAI</span>
            </div>
          </div>
        </header>

        {/* Mobile drawer uses the same Sidebar */}
        <MobileSidebar open={open} onClose={() => setOpen(false)}>
          <Sidebar isMobileOpen={open} setIsMobileOpen={setOpen} />
        </MobileSidebar>

        {/* Main content - No margin, direct flex connection */}
        <div className="flex-1 flex flex-col lg:min-h-dvh">
          <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
            <Outlet />
          </main>
        </div>

        {/* Bottom tabs (mobile only) */}
        <BottomNav onMore={() => setOpen(true)} />
      </div>
    </>
  );
}
