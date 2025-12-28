/**
 * PrimeChatPage Component
 * 
 * Complete workspace layout for Prime (AI Command Center)
 * 
 * Layout:
 * - Left column: Prime Workspace Panel (Active Employees)
 * - Center column: Prime Command Center hero card (static, no chat UI)
 * - Right column: Activity Feed
 * - Floating rail: DesktopChatSideBar (right edge)
 * 
 * Chat is available ONLY via slideout (opened from floating rail or hero card button).
 * This page does NOT render any live chat UI (no messages, no input, no typing).
 */

import React, { useState } from 'react';
import { PrimeWorkspacePanel, type PrimeEmployee } from '../../components/workspace/employees/PrimeWorkspacePanel';
import { DashboardPageShell } from '../../components/layout/DashboardPageShell';
import { ActivityFeedSidebar } from '../../components/dashboard/ActivityFeedSidebar';
import { useScrollToTop } from '../../hooks/useScrollToTop';
import { ChatHistorySidebar } from '../../components/chat/ChatHistorySidebar';
import DesktopChatSideBar from '../../components/chat/DesktopChatSideBar';
import { EmployeeControlPanel } from '../../components/prime/EmployeeControlPanel';
import { useUnifiedChatLauncher } from '../../hooks/useUnifiedChatLauncher';
import { PrimeToolsCommandCenter } from '../../components/prime/PrimeToolsCommandCenter';
import { PrimeOverlayProvider } from '../../context/PrimeOverlayContext';
import { usePrimeLiveStats } from '../../hooks/usePrimeLiveStats';
import { useActivityFeed } from '../../hooks/useActivityFeed';
import { PrimeTeamStatusPanel, type PrimeStatusView } from '../../components/prime/panels/PrimeTeamStatusPanel';
import { PrimeUnifiedCard } from '../../components/workspace/employees/PrimeUnifiedCard';
import { PageCinematicFade } from '../../components/ui/PageCinematicFade';

export function PrimeChatPage() {
  // Scroll to top when page loads
  useScrollToTop();
  
  // Debug: Log component mount
  React.useEffect(() => {
    if (import.meta.env.DEV) {
      console.log('[PrimeChatPage] Component mounted', window.location.pathname);
    }
  }, []);
  
  // Panel state - controls which slide-in panel is open (Team, Tasks, or Chat)
  const [primePanel, setPrimePanel] = useState<'none' | 'team' | 'tasks' | 'chat'>('none'); // Default to none (chat now opens via unified launcher)
  
  // Prime Tools Command Center state
  const [isPrimeToolsOpen, setIsPrimeToolsOpen] = useState(false);
  
  // AI Team Status panel state
  const [isPrimeStatusOpen, setIsPrimeStatusOpen] = useState(false);
  const [primeStatusInitialView, setPrimeStatusInitialView] = useState<PrimeStatusView>("team");
  
  // Track whether Team slideout is open (derived from primePanel)
  const isPrimeTeamOpen = primePanel === 'team';
  
  // Track whether Tasks slideout is open (derived from primePanel)
  const isPrimeTasksOpen = primePanel === 'tasks';
  
  // Track whether Chat slideout is open (derived from primePanel)
  const isPrimeChatOpen = primePanel === 'chat';
  
  // Chat history sidebar state
  const [isChatHistoryOpen, setIsChatHistoryOpen] = useState(false);
  
  // Employee control panel state
  const [selectedEmployee, setSelectedEmployee] = useState<PrimeEmployee | null>(null);
  const [isEmployeePanelOpen, setIsEmployeePanelOpen] = useState(false);
  
  // Determine if any panel is open
  const hasOpenPanel = primePanel !== 'none' || isEmployeePanelOpen;
  
  // Hooks for Prime Tools stats
  const primeStats = usePrimeLiveStats();
  const activityFeed = useActivityFeed({ category: 'prime', pollMs: 60000 });
  
  // Live stats for Prime Tools Command Center
  const onlineAgents = primeStats.data?.onlineEmployees ?? 0;
  const totalAgents = primeStats.data?.totalEmployees ?? 11;
  const lastCheckLabel = primeStats.isLoading || activityFeed.isLoading ? "Checking..." : "Just now";
  const routingRulesCount = 4; // TODO: wire to real data
  const memoryCount = 0; // TODO: wire to real data
  const connectedApps = 0; // TODO: wire to real data
  const totalApps = 4; // TODO: wire to real data
  
  const handleOpenChatHistory = () => {
    setIsChatHistoryOpen(true);
  };
  
  const handleCloseChatHistory = () => {
    setIsChatHistoryOpen(false);
  };
  
  // Listen for global chat history open event
  React.useEffect(() => {
    const handleGlobalOpenHistory = () => {
      setIsChatHistoryOpen(true);
    };
    
    window.addEventListener('openChatHistory', handleGlobalOpenHistory);
    return () => {
      window.removeEventListener('openChatHistory', handleGlobalOpenHistory);
    };
  }, []);

  // Get unified chat launcher for opening chat with other employees
  const { openChat, isOpen: isChatOpen } = useUnifiedChatLauncher();

  return (
    <PrimeOverlayProvider>
      {/* Page title and status badges are handled by DashboardHeader - no duplicate here */}
      <PageCinematicFade>
        <DashboardPageShell
          left={
            <PrimeWorkspacePanel 
              onEmployeeClick={(employee) => {
                setSelectedEmployee(employee);
                setIsEmployeePanelOpen(true);
              }}
              className="min-w-0 w-full"
            />
          }
          center={
            <PrimeUnifiedCard 
              onChatInputClick={() => {
                openChat({
                  initialEmployeeSlug: 'prime-boss',
                  context: {
                    page: 'prime-chat',
                    data: {
                      source: 'prime-chat-page',
                    },
                  },
                });
              }}
              primePanel={primePanel}
              onPrimePanelChange={setPrimePanel}
            />
          }
          right={
            <ActivityFeedSidebar scope="prime" className="min-w-0 w-full" />
          }
        />
      </PageCinematicFade>

      {/* Floating Action Rail - Right edge (same as main dashboard) */}
      {!isChatOpen && (
        <DesktopChatSideBar 
          onHistoryClick={handleOpenChatHistory}
        />
      )}
      
      {/* Chat History Sidebar */}
      <ChatHistorySidebar
        isOpen={isChatHistoryOpen}
        onClose={handleCloseChatHistory}
      />
      
      {/* Employee Control Panel */}
      <EmployeeControlPanel
        employee={selectedEmployee}
        isOpen={isEmployeePanelOpen}
        onClose={() => {
          setIsEmployeePanelOpen(false);
          setSelectedEmployee(null);
        }}
      />

      {/* AI Team Status Panel */}
      {isPrimeStatusOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setIsPrimeStatusOpen(false)}
          />
          
          {/* Panel + docked rail */}
          <div className="relative z-50 h-full flex items-stretch">
            {/* Docked action rail - LEFT side */}
            <div className="hidden md:flex h-full items-center">
              <DesktopChatSideBar dockedToPanel />
            </div>
            
            {/* Status Panel - wrapper removed, PrimeTeamStatusPanel handles its own card styling */}
            <PrimeTeamStatusPanel
              initialView={primeStatusInitialView}
              onClose={() => setIsPrimeStatusOpen(false)}
            />
          </div>
        </div>
      )}

      {/* WOW Prime Tools Command Center */}
      {isPrimeToolsOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-40"
            onClick={() => setIsPrimeToolsOpen(false)}
          />
          
          {/* Command Center Panel */}
          <PrimeToolsCommandCenter
            stats={{
              agentsOnline: onlineAgents,
              agentsTotal: totalAgents,
              rulesCount: routingRulesCount,
              memoriesCount: memoryCount,
              connectorsConnected: connectedApps,
              connectorsTotal: totalApps,
              lastSystemCheck: lastCheckLabel,
            }}
            onViewTeam={() => {
              setIsPrimeToolsOpen(false);
              setPrimeStatusInitialView("team");
              setIsPrimeStatusOpen(true);
            }}
            onOpenTasks={() => {
              setIsPrimeToolsOpen(false);
              setPrimePanel('tasks');
            }}
            onOpenSystemStatus={() => {
              setIsPrimeToolsOpen(false);
              setPrimeStatusInitialView("system");
              setIsPrimeStatusOpen(true);
            }}
            onOpenPrimeSettings={() => {
              setIsPrimeToolsOpen(false);
              setPrimeStatusInitialView("settings");
              setIsPrimeStatusOpen(true);
            }}
            onOpenMemoryCenter={() => {
              setIsPrimeToolsOpen(false);
              setPrimeStatusInitialView("memory");
              setIsPrimeStatusOpen(true);
            }}
            onOpenIntegrations={() => {
              setIsPrimeToolsOpen(false);
              setPrimeStatusInitialView("tools");
              setIsPrimeStatusOpen(true);
            }}
          />
        </>
      )}
    </PrimeOverlayProvider>
  );
}
