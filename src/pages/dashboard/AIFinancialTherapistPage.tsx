/**
 * AIFinancialTherapistPage Component
 * 
 * Complete workspace layout for AI Financial Therapist
 * 
 * Layout:
 * - Left column (33%): Therapist Workspace Panel
 * - Center column (42%): Therapist Unified Card
 * - Right column (25%): Activity Feed
 */

import React, { useState } from 'react';
import { TherapistWorkspacePanel } from '../../components/workspace/entertainment/TherapistWorkspacePanel';
import { TherapistUnifiedCard } from '../../components/workspace/entertainment/TherapistUnifiedCard';
import { DashboardSection } from '../../components/ui/DashboardSection';
import { ActivityPanel } from '../../components/dashboard/ActivityPanel';

export default function AIFinancialTherapistPage() {
  const [isTherapistWorkspaceOpen, setIsTherapistWorkspaceOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  const openTherapistWorkspace = () => {
    setIsTherapistWorkspaceOpen(true);
    setIsMinimized(false);
  };
  const closeTherapistWorkspace = () => {
    setIsTherapistWorkspaceOpen(false);
    setIsMinimized(false);
  };
  const minimizeTherapistWorkspace = () => {
    setIsTherapistWorkspaceOpen(false);
    setIsMinimized(true);
  };

  return (
    <>
      <DashboardSection className="flex flex-col">
        <div className="grid grid-cols-12 gap-0 items-stretch" style={{ minHeight: 'calc(100vh - 200px)' }}>
          {/* LEFT COLUMN (col-span-4 = 33%): Therapist Workspace */}
          <section className="col-span-12 lg:col-span-4 flex flex-col min-h-0">
            <TherapistWorkspacePanel />
          </section>

          {/* CENTER COLUMN (col-span-5 = 42%): Therapist Unified Card */}
          <section className="col-span-12 lg:col-span-5 flex flex-col min-h-0">
            <TherapistUnifiedCard onExpandClick={openTherapistWorkspace} onChatInputClick={openTherapistWorkspace} />
          </section>

          {/* RIGHT COLUMN (col-span-3 = 25%): Activity Feed */}
          <aside className="col-span-12 lg:col-span-3 flex flex-col min-h-0">
            <ActivityPanel />
          </aside>
        </div>
      </DashboardSection>
    </>
  );
}

