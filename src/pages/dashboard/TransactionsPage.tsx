/**
 * TransactionsPage Component
 * 
 * Complete workspace layout for Transactions
 * 
 * Layout:
 * - Left column (33%): Transactions Workspace Panel
 * - Center column (42%): Transactions Unified Card
 * - Right column (25%): Activity Feed
 */

import React, { useState } from 'react';
import { TransactionsWorkspacePanel } from '../../components/workspace/planning/TransactionsWorkspacePanel';
import { TransactionsUnifiedCard } from '../../components/workspace/planning/TransactionsUnifiedCard';
import { DashboardSection } from '../../components/ui/DashboardSection';
import { ActivityPanel } from '../../components/dashboard/ActivityPanel';
// import { TransactionsWorkspaceOverlay } from '../../components/chat/TransactionsWorkspaceOverlay'; // Create if needed

export default function TransactionsPage() {
  const [isTransactionsWorkspaceOpen, setIsTransactionsWorkspaceOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  const openTransactionsWorkspace = () => {
    setIsTransactionsWorkspaceOpen(true);
    setIsMinimized(false);
  };
  const closeTransactionsWorkspace = () => {
    setIsTransactionsWorkspaceOpen(false);
    setIsMinimized(false);
  };
  const minimizeTransactionsWorkspace = () => {
    setIsTransactionsWorkspaceOpen(false);
    setIsMinimized(true);
  };

  return (
    <>
      <DashboardSection className="flex flex-col">
        {/* Page title and status badges are handled by DashboardHeader - no duplicate here */}
        {/* 3-column grid: col-span-4 (33%), col-span-5 (42%), col-span-3 (25%) with equal heights */}
        <div className="grid grid-cols-12 gap-0 items-stretch" style={{ minHeight: 'calc(100vh - 200px)' }}>
          {/* LEFT COLUMN (col-span-4 = 33%): Transactions Workspace */}
          <section className="col-span-12 lg:col-span-4 flex flex-col">
            <TransactionsWorkspacePanel />
          </section>

          {/* CENTER COLUMN (col-span-5 = 42%): Transactions Unified Card */}
          <section className="col-span-12 lg:col-span-5 flex flex-col">
            <TransactionsUnifiedCard onExpandClick={openTransactionsWorkspace} onChatInputClick={openTransactionsWorkspace} />
          </section>

          {/* RIGHT COLUMN (col-span-3 = 25%): Activity Feed */}
          <aside className="col-span-12 lg:col-span-3 flex flex-col">
            <ActivityPanel />
          </aside>
        </div>
      </DashboardSection>

      {/* Transactions Workspace Overlay - Floating centered chatbot */}
      {/* Uncomment when TransactionsWorkspaceOverlay is created */}
      {/* <TransactionsWorkspaceOverlay 
        open={isTransactionsWorkspaceOpen} 
        onClose={closeTransactionsWorkspace}
        minimized={isMinimized}
        onMinimize={minimizeTransactionsWorkspace}
      /> */}
    </>
  );
}

