/**
 * AIChatAssistantPage Component
 * 
 * Complete workspace layout for Finley (AI Financial Assistant)
 * 
 * Layout:
 * - Left column (33%): Finley Workspace Panel
 * - Center column (42%): Finley Unified Card
 * - Right column (25%): Activity Feed
 */

import React, { useState } from 'react';
import { FinleyWorkspacePanel } from '../../components/workspace/employees/FinleyWorkspacePanel';
import { FinleyUnifiedCard } from '../../components/workspace/employees/FinleyUnifiedCard';
import { DashboardSection } from '../../components/ui/DashboardSection';
import { ActivityPanel } from '../../components/dashboard/ActivityPanel';
import { FinleyWorkspace } from '../../components/workspace/employees/FinleyWorkspace';

export function AIChatAssistantPage() {
  const [isFinleyWorkspaceOpen, setIsFinleyWorkspaceOpen] = useState(false);

  const openFinleyWorkspace = () => setIsFinleyWorkspaceOpen(true);
  const closeFinleyWorkspace = () => setIsFinleyWorkspaceOpen(false);

  return (
    <>
      <DashboardSection className="flex flex-col">
        {/* 3-column grid: col-span-4 (33%), col-span-5 (42%), col-span-3 (25%) with equal heights */}
        <div className="grid grid-cols-12 gap-0 items-stretch" style={{ minHeight: 'calc(100vh - 200px)' }}>
          {/* LEFT COLUMN (col-span-4 = 33%): Finley Workspace */}
          <section className="col-span-12 lg:col-span-4 flex flex-col">
            <FinleyWorkspacePanel />
          </section>

          {/* CENTER COLUMN (col-span-5 = 42%): Finley Unified Card */}
          <section className="col-span-12 lg:col-span-5 flex flex-col">
            <FinleyUnifiedCard onExpandClick={openFinleyWorkspace} onChatInputClick={openFinleyWorkspace} />
          </section>

          {/* RIGHT COLUMN (col-span-3 = 25%): Activity Feed */}
          <aside className="col-span-12 lg:col-span-3 flex flex-col">
            <ActivityPanel />
          </aside>
        </div>
      </DashboardSection>

      {/* Finley Workspace Overlay - Floating centered chatbot */}
      <FinleyWorkspace 
        open={isFinleyWorkspaceOpen} 
        onClose={closeFinleyWorkspace} 
      />
    </>
  );
}

