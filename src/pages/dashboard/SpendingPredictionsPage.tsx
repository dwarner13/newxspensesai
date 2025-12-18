/**
 * SpendingPredictionsPage Component
 * 
 * Complete workspace layout for Crystal (Spending Predictions AI)
 * 
 * Layout:
 * - Left column (33%): Crystal Workspace Panel
 * - Center column (42%): Crystal Unified Card
 * - Right column (25%): Activity Feed
 */

import { CrystalWorkspacePanel } from '../../components/workspace/employees/CrystalWorkspacePanel';
import { CrystalUnifiedCard } from '../../components/workspace/employees/CrystalUnifiedCard';
import { DashboardPageShell } from '../../components/layout/DashboardPageShell';
import { ActivityFeedSidebar } from '../../components/dashboard/ActivityFeedSidebar';
import { useScrollToTop } from '../../hooks/useScrollToTop';
import { useUnifiedChatLauncher } from '../../hooks/useUnifiedChatLauncher';
// import { CrystalWorkspaceOverlay } from '../../components/chat/CrystalWorkspaceOverlay'; // Create if needed

export default function SpendingPredictionsPage() {
  // Scroll to top when page loads
  useScrollToTop();
  const { openChat } = useUnifiedChatLauncher();
  // Unified chat is opened via CrystalUnifiedCard using useUnifiedChatLauncher
  // No local chat state needed - all chat goes through UnifiedAssistantChat

  return (
    <>
      {/* Page title and status badges are handled by DashboardHeader - no duplicate here */}
      <DashboardPageShell
        left={<CrystalWorkspacePanel />}
        center={
          <CrystalUnifiedCard 
            onExpandClick={() => {
              openChat({
                initialEmployeeSlug: 'crystal-spending',
                context: {
                  page: 'spending-predictions',
                  data: {
                    source: 'spending-predictions-page',
                  },
                },
              });
            }}
            onChatInputClick={() => {
              openChat({
                initialEmployeeSlug: 'crystal-spending',
                context: {
                  page: 'spending-predictions',
                  data: {
                    source: 'spending-predictions-page',
                  },
                },
              });
            }}
          />
        }
        right={<ActivityFeedSidebar scope="spending-predictions" />}
      />
    </>
  );
}
