import React from 'react';
import { useActivityFeed, type ActivityEvent } from '../../hooks/useActivityFeed';

type LocalEvent = {
  id: string;
  type: 'upload';
  title: string;
  description: string;
  timestamp: string;
};

type ActivityFeedProps = {
  title?: string;
  limit?: number;
  category?: string;
  localEvents?: LocalEvent[];
};

/**
 * Format ISO timestamp to relative time (e.g., "5 min ago")
 */
function formatTimeAgo(isoString: string): string {
  const now = new Date();
  const then = new Date(isoString);
  const diffMs = now.getTime() - then.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return 'just now';
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  
  // For older events, show date
  return then.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Get emoji icon for actor slug
 */
function getActorIcon(actorSlug: string): string {
  const iconMap: Record<string, string> = {
    'prime': '👑',
    'prime-boss': '👑',
    'byte-ai': '📄',
    'byte': '📄',
    'tag-ai': '🏷️',
    'tag': '🏷️',
    'crystal-ai': '📊',
    'crystal': '📊',
    'liberty-ai': '🗽',
    'liberty': '🗽',
    'goalie': '🥅',
    'finley': '💰',
    'blitz': '⚡',
    'chime': '🔔',
    'ledger': '📚',
    'automa': '🤖',
  };
  return iconMap[actorSlug.toLowerCase()] || '✨';
}

/**
 * Get severity badge styles
 */
function getSeverityStyles(severity: ActivityEvent['severity']): string {
  switch (severity) {
    case 'success':
      return 'bg-emerald-500/15 text-emerald-200 border border-emerald-500/40';
    case 'warning':
      return 'bg-amber-500/15 text-amber-200 border border-amber-500/40';
    case 'error':
      return 'bg-rose-500/15 text-rose-200 border border-rose-500/40';
    case 'info':
    default:
      return 'bg-slate-500/15 text-slate-300 border border-slate-500/40';
  }
}

export const ActivityFeed: React.FC<ActivityFeedProps> = ({
  title = 'Activity Feed',
  limit = 20,
  category,
  localEvents = [],
}) => {
  const { events, isLoading, isError, errorMessage } = useActivityFeed({
    limit,
    category,
    pollMs: 60000, // Poll every 60 seconds
  });

  // Merge local events (upload completions) with server events
  // Convert local events to ActivityEvent format
  const mergedEvents: ActivityEvent[] = [
    ...localEvents.map((localEvent) => ({
      id: localEvent.id,
      createdAt: localEvent.timestamp,
      actorSlug: 'byte-docs',
      actorLabel: 'Byte',
      title: localEvent.title,
      description: localEvent.description,
      category: 'smart-import',
      severity: 'success' as const,
      metadata: { type: localEvent.type },
    })),
    ...events,
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <div className="w-full max-w-[320px] shrink-0 rounded-xl border border-slate-800 bg-slate-900 p-3 flex flex-col h-full overflow-hidden">
      {/* Header - Stacked layout for narrow column */}
      <div className="flex flex-col gap-0.5 mb-3 flex-shrink-0">
        <h3 className="text-xs font-semibold tracking-wider text-slate-100 uppercase">
          {title}
        </h3>
        <span className="text-[10px] text-slate-500 truncate">Recent AI team activity</span>
      </div>

      {/* Body */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-2 no-scrollbar">
        {isLoading ? (
          // Loading skeleton
          <>
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="flex items-start gap-3 rounded-xl px-3 py-2 animate-pulse"
              >
                <div className="w-8 h-8 rounded-full bg-slate-800 shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 bg-slate-800 rounded w-3/4" />
                  <div className="h-2 bg-slate-800/50 rounded w-1/2" />
                </div>
              </div>
            ))}
          </>
        ) : isError ? (
          // Error state
          <div className="px-3 py-4 text-center">
            <p className="text-sm text-slate-400">
              Activity temporarily unavailable
            </p>
            {errorMessage && (
              <p className="text-xs text-slate-500 mt-1">{errorMessage}</p>
            )}
          </div>
        ) : mergedEvents.length === 0 ? (
          // Empty State
          <div className="flex-1 flex flex-col items-center justify-center text-center p-2">
            <p className="text-[11px] text-slate-500 leading-relaxed">
              No recent activity yet.
            </p>
            <p className="text-[10px] text-slate-600 mt-1 leading-relaxed">
              Start by uploading or chatting.
            </p>
          </div>
        ) : (
          // Events list
          mergedEvents.map((event) => (
            <div
              key={event.id}
              className="flex items-start gap-3 rounded-xl px-3 py-2 hover:bg-slate-900/80 transition"
            >
              {/* Actor icon */}
              <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center shrink-0 text-lg">
                {getActorIcon(event.actorSlug)}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-0.5">
                  <p className="text-xs font-medium text-slate-200 leading-snug break-words">
                    {event.title}
                  </p>
                  {event.severity && event.severity !== 'info' && (
                    <span
                      className={`text-xs px-2.5 py-0.5 rounded-full shrink-0 ${getSeverityStyles(
                        event.severity
                      )}`}
                    >
                      {event.severity}
                    </span>
                  )}
                </div>
                {event.description && (
                  <p className="text-xs text-slate-400 leading-snug mb-1 break-words">
                    {event.description}
                  </p>
                )}
                <p className="text-[11px] text-slate-600">
                  {formatTimeAgo(event.createdAt)}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

