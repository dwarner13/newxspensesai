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

import React from 'react';
import { BankAccountsWorkspacePanel } from '../../components/workspace/planning/BankAccountsWorkspacePanel';
import { BankAccountsUnifiedCard } from '../../components/workspace/planning/BankAccountsUnifiedCard';
import { DashboardPageShell } from '../../components/layout/DashboardPageShell';
import { ActivityFeedSidebar } from '../../components/dashboard/ActivityFeedSidebar';
import { useScrollToTop } from '../../hooks/useScrollToTop';
import { useUnifiedChatLauncher } from '../../hooks/useUnifiedChatLauncher';
// import { BankAccountsWorkspaceOverlay } from '../../components/chat/BankAccountsWorkspaceOverlay'; // Create if needed

export default function BankAccountsPage() {
  // Scroll to top when page loads
  useScrollToTop();
  const { openChat } = useUnifiedChatLauncher();

  return (
    <>
      {/* Page title and status badges are handled by DashboardHeader - no duplicate here */}
      <DashboardPageShell
        left={<BankAccountsWorkspacePanel />}
        center={
          <BankAccountsUnifiedCard 
            onExpandClick={() => {
              openChat({
                initialEmployeeSlug: 'bank-accounts',
                context: {
                  page: 'bank-accounts',
                  data: {
                    source: 'bank-accounts-page',
                  },
                },
              });
            }}
            onChatInputClick={() => {
              openChat({
                initialEmployeeSlug: 'bank-accounts',
                context: {
                  page: 'bank-accounts',
                  data: {
                    source: 'bank-accounts-page',
                  },
                },
              });
            }}
          />
        }
        right={<ActivityFeedSidebar scope="bank-accounts" />}
      />

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
