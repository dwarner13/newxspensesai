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
import { DashboardThreeColumnLayout } from '../../components/layout/DashboardThreeColumnLayout';
import { ActivityFeedSidebar } from '../../components/dashboard/ActivityFeedSidebar';
import { useScrollToTop } from '../../hooks/useScrollToTop';
// import { BankAccountsWorkspaceOverlay } from '../../components/chat/BankAccountsWorkspaceOverlay'; // Create if needed

export default function BankAccountsPage() {
  // Scroll to top when page loads
  useScrollToTop();
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
        <section className="mt-6 min-h-[520px]">
          <DashboardThreeColumnLayout
            left={
              <div className="h-full flex flex-col">
                <BankAccountsWorkspacePanel />
              </div>
            }
            middle={
              <div className="h-full flex flex-col">
                <BankAccountsUnifiedCard onExpandClick={openBankAccountsWorkspace} onChatInputClick={openBankAccountsWorkspace} />
              </div>
            }
            right={
              <ActivityFeedSidebar scope="bank-accounts" />
            }
          />
        </section>
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
