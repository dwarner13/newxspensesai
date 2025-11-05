/**
 * User Status Segmentation
 * 
 * Core logic to classify users into segments based on usage signals.
 * Drives personalization of Prime's greeting and behavior.
 * 
 * @module lib/user-status
 */

import type { UsageSignals, SegmentationDecision, UserStatus, SegmentationOptions } from "@/types/prime";

/**
 * Default segmentation options
 */
const DEFAULT_OPTIONS: Required<SegmentationOptions> = {
  inactiveDays: 14,
  powerUserThresholds: {
    transactions: 200,
    rules: 10,
    goals: 3,
  },
};

/**
 * Determine user's segment based on usage signals
 * 
 * Classification logic:
 * 1. If onboarding incomplete OR no last_login → "first_time"
 * 2. Else if inactive (last login > inactiveDays ago) → "inactive"
 * 3. Else if high usage (meets power_user thresholds) → "power_user"
 * 4. Else → "returning"
 * 
 * @param signals UsageSignals from user's profile/activity
 * @param opts Optional configuration (inactiveDays, thresholds)
 * @returns SegmentationDecision with status, reason, signals, timestamp
 * 
 * @example
 * const decision = decideUserStatus(signals, {
 *   inactiveDays: 21,
 *   powerUserThresholds: { transactions: 500, rules: 20, goals: 5 }
 * });
 * console.log(decision.status); // "power_user"
 */
export function decideUserStatus(
  signals: UsageSignals,
  opts?: Partial<SegmentationOptions>
): SegmentationDecision {
  const now = new Date().toISOString();
  const options = { ...DEFAULT_OPTIONS, ...opts };

  // 1. Check if first-time user (hasn't completed onboarding)
  if (!signals.onboardingComplete || !signals.lastLoginAt) {
    return {
      status: "first_time",
      reason: "onboarding_incomplete_or_no_last_login",
      signals,
      evaluatedAt: now,
    };
  }

  // 2. Check if inactive
  const inactiveDays = options.inactiveDays!;
  const daysSinceLastLogin = Math.floor(
    (Date.now() - new Date(signals.lastLoginAt).getTime()) / 86400000
  );

  if (daysSinceLastLogin >= inactiveDays) {
    return {
      status: "inactive",
      reason: `idle_${inactiveDays}_days_or_more`,
      signals,
      evaluatedAt: now,
    };
  }

  // 3. Check if power user (meets any threshold)
  const thresholds = options.powerUserThresholds!;
  const isPowerUser =
    signals.transactions >= thresholds.transactions ||
    signals.rules >= thresholds.rules ||
    signals.goals >= thresholds.goals;

  if (isPowerUser) {
    const reasons: string[] = [];
    if (signals.transactions >= thresholds.transactions) {
      reasons.push(`${signals.transactions} transactions`);
    }
    if (signals.rules >= thresholds.rules) {
      reasons.push(`${signals.rules} rules`);
    }
    if (signals.goals >= thresholds.goals) {
      reasons.push(`${signals.goals} goals`);
    }

    return {
      status: "power_user",
      reason: `high_usage: ${reasons.join(", ")}`,
      signals,
      evaluatedAt: now,
    };
  }

  // 4. Default: returning user
  return {
    status: "returning",
    reason: "active_user_below_power_threshold",
    signals,
    evaluatedAt: now,
  };
}

/**
 * Get human-readable description of segmentation decision
 * Useful for logging, debugging, UI display
 * 
 * @param decision SegmentationDecision
 * @returns String description
 * 
 * @example
 * const desc = describeSegmentationDecision(decision);
 * console.log(desc);
 * // "Power User (42 transactions, 5 rules, 2 goals; last login 3 days ago)"
 */
export function describeSegmentationDecision(decision: SegmentationDecision): string {
  const { status, signals } = decision;
  const statusLabel = status.charAt(0).toUpperCase() + status.slice(1).replace("_", " ");

  const parts: string[] = [];
  parts.push(`${signals.transactions} tx`);
  parts.push(`${signals.rules} rules`);
  parts.push(`${signals.goals} goals`);

  if (signals.lastLoginAt) {
    const daysSinceLogin = Math.floor((Date.now() - new Date(signals.lastLoginAt).getTime()) / 86400000);
    parts.push(`last login ${daysSinceLogin}d ago`);
  } else {
    parts.push("never logged in");
  }

  return `${statusLabel} (${parts.join(", ")})`;
}

/**
 * Boundary test helpers for unit testing
 * Verify segmentation logic at key thresholds
 */
export const SegmentationBoundaries = {
  /**
   * Create a test signal set for a specific boundary
   */
  forInactivity: (daysSinceLogin: number): UsageSignals => ({
    transactions: 50,
    rules: 2,
    goals: 1,
    lastLoginAt: new Date(Date.now() - daysSinceLogin * 86400000).toISOString(),
    onboardingComplete: true,
  }),

  forTransactions: (count: number): UsageSignals => ({
    transactions: count,
    rules: 0,
    goals: 0,
    lastLoginAt: new Date().toISOString(),
    onboardingComplete: true,
  }),

  forRules: (count: number): UsageSignals => ({
    transactions: 0,
    rules: count,
    goals: 0,
    lastLoginAt: new Date().toISOString(),
    onboardingComplete: true,
  }),

  forGoals: (count: number): UsageSignals => ({
    transactions: 0,
    rules: 0,
    goals: count,
    lastLoginAt: new Date().toISOString(),
    onboardingComplete: true,
  }),

  firstTime: (): UsageSignals => ({
    transactions: 0,
    rules: 0,
    goals: 0,
    lastLoginAt: null,
    onboardingComplete: false,
  }),

  returning: (): UsageSignals => ({
    transactions: 15,
    rules: 1,
    goals: 0,
    lastLoginAt: new Date(Date.now() - 3 * 86400000).toISOString(), // 3 days ago
    onboardingComplete: true,
  }),

  powerUser: (): UsageSignals => ({
    transactions: 300,
    rules: 15,
    goals: 5,
    lastLoginAt: new Date(Date.now() - 2 * 86400000).toISOString(), // 2 days ago
    onboardingComplete: true,
  }),

  inactive: (): UsageSignals => ({
    transactions: 50,
    rules: 2,
    goals: 1,
    lastLoginAt: new Date(Date.now() - 30 * 86400000).toISOString(), // 30 days ago
    onboardingComplete: true,
  }),
};






