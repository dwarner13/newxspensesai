/**
 * Prime AI Orchestrator - Type Definitions
 * 
 * Defines all types for Prime's user segmentation, intro system,
 * and orchestration logic.
 * 
 * @module types/prime
 */

/**
 * User segmentation status for Prime personalization
 * 
 * - first_time: User hasn't completed onboarding or has no login history
 * - returning: User is active (logged in within last 14 days)
 * - inactive: User hasn't logged in for 14+ days
 * - power_user: User has high usage signals (200+ transactions, 10+ rules, 3+ goals)
 */
export type UserStatus = "first_time" | "returning" | "inactive" | "power_user";

/**
 * Quantitative signals about user's product usage
 * Used to determine segmentation status
 */
export interface UsageSignals {
  /** Total transaction count across user's account */
  transactions: number;
  
  /** Total categorization rules created by user */
  rules: number;
  
  /** Total goals created by user */
  goals: number;
  
  /** ISO 8601 timestamp of last login; null if never logged in */
  lastLoginAt: string | null;
  
  /** Whether user has completed Prime/Custodian onboarding */
  onboardingComplete: boolean;
}

/**
 * Result of segmentation analysis
 * Immutable record of how user was classified
 */
export interface SegmentationDecision {
  /** The computed status (first_time | returning | inactive | power_user) */
  status: UserStatus;
  
  /** Human-readable reason for decision (e.g., "onboarding_incomplete_or_no_last_login") */
  reason: string;
  
  /** The signals that drove this decision */
  signals: UsageSignals;
  
  /** ISO 8601 timestamp when decision was evaluated */
  evaluatedAt: string;
}

/**
 * Configuration options for segmentation algorithm
 */
export interface SegmentationOptions {
  /** Days of inactivity before marking user as "inactive" (default: 14) */
  inactiveDays?: number;
  
  /** Thresholds for "power_user" status */
  powerUserThresholds?: {
    /** Min transaction count */
    transactions?: number;
    /** Min categorization rules */
    rules?: number;
    /** Min goals created */
    goals?: number;
  };
}

/**
 * Intro message and actions for Prime greeting
 * Segment-specific and can vary based on user status
 */
export interface PrimeIntro {
  /** The segmentation decision that drove this intro */
  decision: SegmentationDecision;
  
  /** Prime's greeting message (generated in Phase 2) */
  message: string;
  
  /** Suggested quick-action chips for user to click */
  actions: Array<{
    label: string;
    intent: string;
    payload?: Record<string, unknown>;
  }>;
}

/**
 * Telemetry event logged when segmentation decision is made
 * Used for analytics, A/B testing, and observability
 */
export interface SegmentationTelemetry {
  userId: string;
  decidedAt: string;
  status: UserStatus;
  reason: string;
  signals: UsageSignals;
  
  /** Optional: which version of segmentation algorithm was used */
  algorithmVersion?: string;
  
  /** Optional: environment (development | staging | production) */
  environment?: string;
}





