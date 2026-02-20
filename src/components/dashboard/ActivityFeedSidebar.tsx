import { useState, useEffect } from 'react';
import { ActivityFeed } from './ActivityFeed';
import type { SmartImportUploadSummary } from '../../hooks/useSmartImport';
import { cn } from '../../lib/utils';
import { isSmartImportOpsDashboardV1Enabled } from '../../lib/featureFlags';

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
   * Optional limit to show in feed
   */
  limit?: number;
  /**
   * Optional max height for scrollable feed
   */
  maxHeight?: number;
  /**
   * Enable scroll within feed body
   */
  scrollable?: boolean;
  /**
   * Hide scrollbar while keeping scroll
   */
  hideScrollbar?: boolean;
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
export function ActivityFeedSidebar({
  scope,
  lastUploadSummary,
  className,
  limit = 3,
  maxHeight = 240,
  scrollable = true,
  hideScrollbar = true,
  variant = 'column'
}: ActivityFeedSidebarProps) {
  const opsDashboardEnabled = isSmartImportOpsDashboardV1Enabled();
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

      const title = opsDashboardEnabled ? 'Import completed' : 'Byte processed your documents';
      
      // Ensure transaction count is properly extracted and displayed
      const txCount = transactionCount ?? 0;
      const description =
        txCount > 0
          ? (opsDashboardEnabled
            ? `${txCount} transaction${txCount > 1 ? 's' : ''} processed from ${fileCount} document${fileCount > 1 ? 's' : ''}.`
            : `Imported ${fileCount} document${fileCount > 1 ? 's' : ''} and created ${txCount} transaction${txCount > 1 ? 's' : ''}.`)
          : (opsDashboardEnabled
            ? `Import completed for ${fileCount} document${fileCount > 1 ? 's' : ''}.`
            : `Imported ${fileCount} document${fileCount > 1 ? 's' : ''}.`);

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
    <aside className={cn("w-full flex flex-col", className)}>
      <div className="relative w-full">
        {/* Activity Feed content - no extra padding needed, parent handles spacing */}
        {/* CRITICAL: No height constraints - part of main scroll flow */}
        <div className="w-full">
          <ActivityFeed 
            title="ACTIVITY FEED"
            limit={limit}
            category={scope}
            localEvents={localEvents}
            variant={variant}
            maxHeight={maxHeight}
            scrollable={scrollable}
            hideScrollbar={hideScrollbar}
          />
        </div>
      </div>
    </aside>
  );
}

