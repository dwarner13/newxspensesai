/**
 * Prime Intro Message Generator
 * 
 * Generates segment-specific intro messages for Prime's first greeting.
 * This is the wire-in point for user segmentation.
 * 
 * Phase 1: Returns decision + empty message/actions
 * Phase 2: Will add segment-specific greeting copy and action chips
 * 
 * @module ai/prime/intro/getPrimeIntroMessage
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { getUsageSignals } from "@/lib/user-usage";
import { decideUserStatus } from "@/lib/user-status";
import type { PrimeIntro, SegmentationTelemetry } from "@/types/prime";

/**
 * Main entry point: get Prime's intro message for a user
 * 
 * Process:
 * 1. Fetch user's usage signals from Supabase
 * 2. Compute segmentation decision
 * 3. Log telemetry for analytics
 * 4. Return intro with decision + placeholder message/actions
 * 
 * @param ctx Context with supabase client and userId
 * @returns PrimeIntro with decision, message (placeholder), and actions
 * 
 * @example
 * const intro = await getPrimeIntroMessage({ supabase, userId });
 * console.log(intro.decision.status); // "power_user"
 * console.log(intro.message); // "" (Phase 1)
 * console.log(intro.actions); // [] (Phase 1)
 */
export async function getPrimeIntroMessage(ctx: {
  supabase: SupabaseClient;
  userId: string;
}): Promise<PrimeIntro> {
  try {
    // 1. Fetch signals
    const signals = await getUsageSignals(ctx.supabase, ctx.userId);

    // 2. Compute decision
    const decision = decideUserStatus(signals);

    // 3. Log telemetry
    await logSegmentationTelemetry(ctx.supabase, ctx.userId, decision);

    // 4. Return intro (Phase 1: empty message/actions)
    return {
      decision,
      message: "", // Phase 2: Add greeting copy here
      actions: [], // Phase 2: Add action chips here
    };
  } catch (error) {
    console.error("[getPrimeIntroMessage] Failed:", error);

    // Fallback: return first_time status on error
    return {
      decision: {
        status: "first_time",
        reason: "error_fetching_signals",
        signals: {
          transactions: 0,
          rules: 0,
          goals: 0,
          lastLoginAt: null,
          onboardingComplete: false,
        },
        evaluatedAt: new Date().toISOString(),
      },
      message: "", // Fallback message
      actions: [],
    };
  }
}

/**
 * Log segmentation decision to telemetry table
 * Used for A/B testing, analytics, and observability
 * 
 * @param supabase Supabase client
 * @param userId User's UUID
 * @param decision Segmentation decision to log
 * @returns void (logs errors to console, doesn't throw)
 * 
 * @internal
 */
async function logSegmentationTelemetry(
  supabase: SupabaseClient,
  userId: string,
  decision: Awaited<ReturnType<typeof decideUserStatus>>
): Promise<void> {
  try {
    const telemetry: SegmentationTelemetry = {
      userId,
      decidedAt: decision.evaluatedAt,
      status: decision.status,
      reason: decision.reason,
      signals: decision.signals,
      algorithmVersion: "1.0",
      environment: import.meta.env.MODE,
    };

    const { error } = await supabase.from("metrics_segmentation_decisions").insert([
      {
        user_id: userId,
        decided_at: telemetry.decidedAt,
        status: telemetry.status,
        reason: telemetry.reason,
        signals: telemetry.signals,
      },
    ]);

    if (error) {
      console.warn("[getPrimeIntroMessage] Failed to log telemetry:", error);
    }
  } catch (err) {
    console.warn("[getPrimeIntroMessage] Telemetry logging error:", err);
  }
}

/**
 * Phase 2: Placeholder for segment-specific greeting copy
 * This will be implemented in the next phase
 * 
 * @internal
 */
function getSegmentSpecificMessage(): Record<string, string> {
  return {
    first_time:
      "", // Phase 2: "👑 Welcome! I'm Prime, your AI financial orchestrator..."
    returning: "", // Phase 2: "👑 Welcome back! Ready to continue where we left off?"
    inactive: "", // Phase 2: "👑 We've missed you! A lot has changed since you were last here..."
    power_user: "", // Phase 2: "👑 Welcome back, financial strategist!..."
  };
}

/**
 * Phase 2: Placeholder for segment-specific action chips
 * This will be implemented in the next phase
 * 
 * @internal
 */
function getSegmentSpecificActions(): Record<string, PrimeIntro["actions"]> {
  return {
    first_time: [], // Phase 2: [{ label: "Get Started", intent: "onboarding_start" }, ...]
    returning: [], // Phase 2: [{ label: "View Insights", intent: "navigate_insights" }, ...]
    inactive: [], // Phase 2: [{ label: "What's New?", intent: "feature_tour" }, ...]
    power_user: [], // Phase 2: [{ label: "Advanced Settings", intent: "open_settings" }, ...]
  };
}





