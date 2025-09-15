import React from "react";
import { Outlet } from "react-router-dom";
import DesktopSidebar from "../components/navigation/DesktopSidebar";
import DashboardHeader from "../components/ui/DashboardHeader";
import RightSidebar from "../components/ui/RightSidebar";
import AITeamSidebar from "../components/layout/AITeamSidebar";

export default function DashboardLayout() {
  return (
    <div className="flex h-screen bg-[#0f172a]">
      {/* Left sidebar - fixed */}
      <div className="fixed left-0 top-0 h-full z-30">
        <DesktopSidebar />
      </div>
      
      {/* Middle + Right rail */}
      <div className="flex flex-1 min-w-0 ml-64">
        {/* Middle column */}
        <div className="flex-1 min-w-0 flex flex-col">
          <DashboardHeader />
          <main className="flex-1 overflow-y-auto">
            <div className="max-w-7xl mx-auto px-8 py-4 pr-72">
              <Outlet />
            </div>
          </main>
        </div>
        
        {/* Right sidebar */}
        <div className="hidden lg:block w-64 bg-zinc-900/90 backdrop-blur-sm border-l border-zinc-700 flex-shrink-0 fixed right-0 top-32 h-[calc(100vh-8rem)] z-10 overflow-y-auto ml-4">
          <div className="h-full">
            <AITeamSidebar />
          </div>
        </div>
      </div>
    </div>
  );
}
