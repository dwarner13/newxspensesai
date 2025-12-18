import React, { useState, useEffect } from 'react';
import { ActivityFeed } from './ActivityFeed';
import type { SmartImportUploadSummary } from '../../hooks/useSmartImport';
import { cn } from '../../lib/utils';

export type ActivityFeedSidebarProps = {
  /**
   * Optional scope to filter activity feed by workspace/page context
   * Examples: "prime", "smart-import", "transactions", "analytics", etc.
   * If not provided, shows all activity
   */
  scope?: string;
  /**
   * Optional upload summary to add to activity feed when upload completes
   */
  lastUploadSummary?: SmartImportUploadSummary | null;
  /**
   * Optional className for styling
   */
  className?: string;
  /**
   * Variant: 'column' = standalone column styling, 'embedded' = integrated into parent grid
   */
  variant?: 'column' | 'embedded';
};

/**
 * ActivityFeedSidebar Component
 * 
 * Reusable sidebar component for displaying activity feed across all dashboard pages.
 * Wraps the ActivityFeed component and supports scope-based filtering.
 * Can also inject local upload events for Smart Import.
 */
export function ActivityFeedSidebar({ scope, lastUploadSummary, className, variant = 'column' }: ActivityFeedSidebarProps) {
  const [localEvents, setLocalEvents] = useState<Array<{
    id: string;
    type: 'upload';
    title: string;
    description: string;
    timestamp: string;
  }>>([]);

  // Add upload completion events to local feed
  useEffect(() => {
    if (!lastUploadSummary) return;

    setLocalEvents((prev) => {
      // Avoid duplicates by id
      if (prev.some((e) => e.id === lastUploadSummary.id)) return prev;

      const { fileCount, transactionCount, finishedAt, id } = lastUploadSummary;

      const title = 'Byte processed your documents';
      
      // Ensure transaction count is properly extracted and displayed
      const txCount = transactionCount ?? 0;
      const description =
        txCount > 0
          ? `Imported ${fileCount} document${fileCount > 1 ? 's' : ''} and created ${txCount} transaction${txCount > 1 ? 's' : ''}.`
          : `Imported ${fileCount} document${fileCount > 1 ? 's' : ''}.`;

      const newEvent = {
        id,
        type: 'upload' as const,
        title,
        description,
        timestamp: finishedAt,
      };

      return [newEvent, ...prev].slice(0, 10); // Keep last 10 local events
    });
  }, [lastUploadSummary]);

  return (
    <aside className={cn("w-full h-full flex flex-col overflow-hidden", className)}>
      <div className="relative w-full h-full overflow-hidden">
        {/* Activity Feed content - no extra padding needed, parent handles spacing */}
        <div className="h-full w-full overflow-hidden">
          <ActivityFeed 
            title="ACTIVITY FEED"
            limit={20}
            category={scope}
            localEvents={localEvents}
            variant={variant}
          />
        </div>
      </div>
    </aside>
  );
}

