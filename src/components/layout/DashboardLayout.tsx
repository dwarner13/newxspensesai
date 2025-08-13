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
      <div className="min-h-dvh bg-gradient-to-b from-[#0f172a] to-[#1a1e3a] text-white lg:flex">
        {/* Desktop sidebar */}
        <aside className="hidden lg:block w-72 shrink-0 border-r border-white/10 bg-[#0b0f2a]">
          <Sidebar isMobileOpen={false} setIsMobileOpen={() => {}} />
        </aside>

        {/* Mobile top bar */}
        <header className="lg:hidden sticky top-0 z-40 bg-[#0b0f2a]/80 backdrop-blur border-b border-white/10">
          <div className="flex items-center gap-3 px-4 py-3">
            <button
              aria-label="Open menu"
              onClick={() => setOpen(true)}
              className="rounded-xl p-2 hover:bg-white/5"
            >
              {/* simple hamburger */}
              <div className="space-y-1">
                <span className="block h-0.5 w-5 bg-white" />
                <span className="block h-0.5 w-5 bg-white" />
                <span className="block h-0.5 w-5 bg-white" />
              </div>
            </button>
            <span className="text-base font-semibold">XspensesAI</span>
          </div>
        </header>

        {/* Mobile drawer uses the same Sidebar */}
        <MobileSidebar open={open} onClose={() => setOpen(false)}>
          <Sidebar isMobileOpen={open} setIsMobileOpen={setOpen} />
        </MobileSidebar>

        {/* Main content */}
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
