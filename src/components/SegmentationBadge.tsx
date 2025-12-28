/**
 * Segmentation Badge Component
 * 
 * Visual display of user segmentation status.
 * Used in debug panels, admin dashboards, and dev tools.
 * 
 * @module components/SegmentationBadge
 */

import React from "react";
import type { SegmentationDecision, UserStatus } from "@/types/prime";

interface SegmentationBadgeProps {
  decision: SegmentationDecision;
  showSignals?: boolean;
  className?: string;
}

/**
 * Color scheme for each user segment
 */
const STATUS_COLORS: Record<UserStatus, { bg: string; text: string; emoji: string }> = {
  first_time: {
    bg: "bg-blue-100",
    text: "text-blue-700",
    emoji: "🎯",
  },
  returning: {
    bg: "bg-slate-100",
    text: "text-slate-700",
    emoji: "👋",
  },
  inactive: {
    bg: "bg-amber-100",
    text: "text-amber-700",
    emoji: "⏸️",
  },
  power_user: {
    bg: "bg-green-100",
    text: "text-green-700",
    emoji: "⭐",
  },
};

/**
 * Badge component to display segmentation decision
 * 
 * @example
 * <SegmentationBadge decision={decision} showSignals={true} />
 * 
 * Renders:
 * ┌─────────────────────────────────────────┐
 * │ ⭐ power_user · high_usage_signals     │
 * │   300 tx | 15 rules | 5 goals          │
 * └─────────────────────────────────────────┘
 */
export function SegmentationBadge({
  decision,
  showSignals = false,
  className = "",
}: SegmentationBadgeProps) {
  const colors = STATUS_COLORS[decision.status];

  return (
    <div className={`inline-flex flex-col gap-1 ${className}`}>
      {/* Main badge */}
      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${colors.bg} ${colors.text}`}>
        <span>{colors.emoji}</span>
        <span className="capitalize">{decision.status.replace("_", " ")}</span>
        <span className="opacity-60 font-normal">·</span>
        <span className="opacity-70 font-normal">{decision.reason}</span>
      </div>

      {/* Optional signals breakdown */}
      {showSignals && (
        <div className={`text-xs ${colors.text} pl-1 space-y-0.5`}>
          <div className="flex gap-3 text-opacity-70">
            <span>📊 {decision.signals.transactions} tx</span>
            <span>📋 {decision.signals.rules} rules</span>
            <span>🎯 {decision.signals.goals} goals</span>
          </div>
          {decision.signals.lastLoginAt && (
            <div className="text-opacity-60">
              🕐 Last login: {formatRelativeTime(decision.signals.lastLoginAt)}
            </div>
          )}
          {!decision.signals.lastLoginAt && (
            <div className="text-opacity-60">🕐 Never logged in</div>
          )}
          <div className="text-opacity-60">
            ✓ Onboarding: {decision.signals.onboardingComplete ? "Complete" : "Incomplete"}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Status-only compact variant (for headers, pills, etc.)
 */
export function SegmentationStatusPill({ status }: { status: UserStatus }) {
  const colors = STATUS_COLORS[status];

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${colors.bg} ${colors.text}`}
    >
      <span>{colors.emoji}</span>
      <span className="capitalize">{status.replace("_", " ")}</span>
    </span>
  );
}

/**
 * Full-width card for detailed segmentation view (admin/debug)
 */
export function SegmentationCard({ decision }: { decision: SegmentationDecision }) {
  const colors = STATUS_COLORS[decision.status];

  return (
    <div className={`rounded-lg border-2 p-4 ${colors.bg} ${colors.text}`}>
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{STATUS_COLORS[decision.status].emoji}</span>
            <div>
              <div className="font-bold capitalize">{decision.status.replace("_", " ")}</div>
              <div className="text-sm opacity-75">{decision.reason}</div>
            </div>
          </div>
          <div className="text-right text-xs opacity-60">
            Evaluated {formatRelativeTime(decision.evaluatedAt)} ago
          </div>
        </div>

        {/* Signals grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-2 border-t border-current border-opacity-20">
          <div className="text-center">
            <div className="text-2xl">📊</div>
            <div className="font-semibold">{decision.signals.transactions}</div>
            <div className="text-xs opacity-75">Transactions</div>
          </div>
          <div className="text-center">
            <div className="text-2xl">📋</div>
            <div className="font-semibold">{decision.signals.rules}</div>
            <div className="text-xs opacity-75">Rules</div>
          </div>
          <div className="text-center">
            <div className="text-2xl">🎯</div>
            <div className="font-semibold">{decision.signals.goals}</div>
            <div className="text-xs opacity-75">Goals</div>
          </div>
          <div className="text-center">
            <div className="text-2xl">✓</div>
            <div className="font-semibold">{decision.signals.onboardingComplete ? "Yes" : "No"}</div>
            <div className="text-xs opacity-75">Onboarded</div>
          </div>
        </div>

        {/* Last login */}
        {decision.signals.lastLoginAt && (
          <div className="pt-2 border-t border-current border-opacity-20 text-sm">
            <span className="opacity-75">Last Login:</span>
            <span className="font-semibold ml-2">
              {new Date(decision.signals.lastLoginAt).toLocaleString()}
            </span>
            <span className="opacity-60 ml-2">({formatRelativeTime(decision.signals.lastLoginAt)} ago)</span>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Helper: Format relative time (e.g., "2 days ago")
 */
function formatRelativeTime(isoString: string): string {
  const now = new Date();
  const then = new Date(isoString);
  const diffMs = now.getTime() - then.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return `${diffSecs}s`;
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 30) return `${diffDays}d`;

  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) return `${diffMonths}mo`;

  const diffYears = Math.floor(diffDays / 365);
  return `${diffYears}y`;
}






