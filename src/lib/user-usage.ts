/**
 * User Usage Signals
 * 
 * Fetches quantitative signals about user activity from Supabase.
 * These signals drive the segmentation decision in user-status.ts.
 * 
 * @module lib/user-usage
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { UsageSignals } from "@/types/prime";

/**
 * Fetch usage signals for a user from Supabase
 * 
 * Queries:
 * - profiles.onboarding_complete
 * - profiles.last_login_at
 * - COUNT of transactions
 * - COUNT of category_rules
 * - COUNT of goals
 * 
 * @param supabase Supabase client (authenticated or service role)
 * @param userId User's UUID
 * @returns UsageSignals object with counts and flags
 * @throws Error if profile not found or queries fail
 * 
 * @example
 * const signals = await getUsageSignals(supabase, userId);
 * console.log(signals); // { transactions: 42, rules: 5, goals: 2, ... }
 */
export async function getUsageSignals(supabase: SupabaseClient, userId: string): Promise<UsageSignals> {
  // 1. Fetch profile data
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("onboarding_complete, last_login_at")
    .eq("id", userId)
    .single();

  if (profileError || !profile) {
    console.warn(`[user-usage] Profile not found for user ${userId}:`, profileError);
    // Return empty signals if profile doesn't exist
    return {
      transactions: 0,
      rules: 0,
      goals: 0,
      lastLoginAt: null,
      onboardingComplete: false,
    };
  }

  // 2. Count transactions
  const { count: transactionCount, error: txError } = await supabase
    .from("transactions")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);

  if (txError) {
    console.warn(`[user-usage] Failed to count transactions for ${userId}:`, txError);
  }

  // 3. Count category rules
  const { count: ruleCount, error: ruleError } = await supabase
    .from("category_rules")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);

  if (ruleError) {
    console.warn(`[user-usage] Failed to count rules for ${userId}:`, ruleError);
  }

  // 4. Count goals
  const { count: goalCount, error: goalError } = await supabase
    .from("goals")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);

  if (goalError) {
    console.warn(`[user-usage] Failed to count goals for ${userId}:`, goalError);
  }

  // 5. Assemble result
  const signals: UsageSignals = {
    transactions: transactionCount ?? 0,
    rules: ruleCount ?? 0,
    goals: goalCount ?? 0,
    lastLoginAt: profile.last_login_at || null,
    onboardingComplete: profile.onboarding_complete ?? false,
  };

  return signals;
}

/**
 * Update user's last_login_at timestamp
 * Call this when user successfully authenticates or opens dashboard
 * 
 * @param supabase Supabase client
 * @param userId User's UUID
 * @returns Updated profile row
 * 
 * @example
 * await recordUserLogin(supabase, userId);
 */
export async function recordUserLogin(supabase: SupabaseClient, userId: string): Promise<void> {
  const { error } = await supabase
    .from("profiles")
    .update({ last_login_at: new Date().toISOString() })
    .eq("id", userId);

  if (error) {
    console.warn(`[user-usage] Failed to record login for ${userId}:`, error);
  }
}

/**
 * Mark user as having completed onboarding
 * Call this after user finishes Prime/Custodian intro flow
 * 
 * @param supabase Supabase client
 * @param userId User's UUID
 * @returns void
 * 
 * @example
 * await markOnboardingComplete(supabase, userId);
 */
export async function markOnboardingComplete(supabase: SupabaseClient, userId: string): Promise<void> {
  const { error } = await supabase
    .from("profiles")
    .update({ onboarding_complete: true })
    .eq("id", userId);

  if (error) {
    console.warn(`[user-usage] Failed to mark onboarding complete for ${userId}:`, error);
  }
}

/**
 * Get a human-readable summary of user signals
 * Useful for debugging and logging
 * 
 * @param signals UsageSignals object
 * @returns String summary
 * 
 * @example
 * const summary = summarizeSignals(signals);
 * console.log(summary); // "42 transactions, 5 rules, 2 goals; last login 3 days ago"
 */
export function summarizeSignals(signals: UsageSignals): string {
  const parts: string[] = [];

  parts.push(`${signals.transactions} transaction${signals.transactions !== 1 ? "s" : ""}`);
  parts.push(`${signals.rules} rule${signals.rules !== 1 ? "s" : ""}`);
  parts.push(`${signals.goals} goal${signals.goals !== 1 ? "s" : ""}`);

  if (signals.lastLoginAt) {
    const daysSinceLogin = Math.floor((Date.now() - new Date(signals.lastLoginAt).getTime()) / 86400000);
    parts.push(`last login ${daysSinceLogin} day${daysSinceLogin !== 1 ? "s" : ""} ago`);
  } else {
    parts.push("never logged in");
  }

  if (signals.onboardingComplete) {
    parts.push("onboarding complete");
  } else {
    parts.push("onboarding incomplete");
  }

  return parts.join("; ");
}





