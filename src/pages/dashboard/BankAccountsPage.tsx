/**
 * BankAccountsPage Component
 * 
 * Complete workspace layout for Bank Accounts
 * 
 * Layout:
 * - Left column (33%): Bank Accounts Workspace Panel
 * - Center column (42%): Bank Accounts Unified Card
 * - Right column (25%): Activity Feed
 */

import React, { useState } from 'react';
import { BankAccountsWorkspacePanel } from '../../components/workspace/planning/BankAccountsWorkspacePanel';
import { BankAccountsUnifiedCard } from '../../components/workspace/planning/BankAccountsUnifiedCard';
import { DashboardSection } from '../../components/ui/DashboardSection';
import { ActivityPanel } from '../../components/dashboard/ActivityPanel';
// import { BankAccountsWorkspaceOverlay } from '../../components/chat/BankAccountsWorkspaceOverlay'; // Create if needed

export default function BankAccountsPage() {
  const [isBankAccountsWorkspaceOpen, setIsBankAccountsWorkspaceOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  const openBankAccountsWorkspace = () => {
    setIsBankAccountsWorkspaceOpen(true);
    setIsMinimized(false);
  };
  const closeBankAccountsWorkspace = () => {
    setIsBankAccountsWorkspaceOpen(false);
    setIsMinimized(false);
  };
  const minimizeBankAccountsWorkspace = () => {
    setIsBankAccountsWorkspaceOpen(false);
    setIsMinimized(true);
  };

  return (
    <>
      <DashboardSection className="flex flex-col">
        {/* Page title and status badges are handled by DashboardHeader - no duplicate here */}
        {/* 3-column grid: col-span-4 (33%), col-span-5 (42%), col-span-3 (25%) with equal heights */}
        <div className="grid grid-cols-12 gap-0 items-stretch" style={{ minHeight: 'calc(100vh - 200px)' }}>
          {/* LEFT COLUMN (col-span-4 = 33%): Bank Accounts Workspace */}
          <section className="col-span-12 lg:col-span-4 flex flex-col">
            <BankAccountsWorkspacePanel />
          </section>

          {/* CENTER COLUMN (col-span-5 = 42%): Bank Accounts Unified Card */}
          <section className="col-span-12 lg:col-span-5 flex flex-col">
            <BankAccountsUnifiedCard onExpandClick={openBankAccountsWorkspace} onChatInputClick={openBankAccountsWorkspace} />
          </section>

          {/* RIGHT COLUMN (col-span-3 = 25%): Activity Feed */}
          <aside className="col-span-12 lg:col-span-3 flex flex-col">
            <ActivityPanel />
          </aside>
        </div>
      </DashboardSection>

      {/* Bank Accounts Workspace Overlay - Floating centered chatbot */}
      {/* Uncomment when BankAccountsWorkspaceOverlay is created */}
      {/* <BankAccountsWorkspaceOverlay 
        open={isBankAccountsWorkspaceOpen} 
        onClose={closeBankAccountsWorkspace}
        minimized={isMinimized}
        onMinimize={minimizeBankAccountsWorkspace}
      /> */}
    </>
  );
}
