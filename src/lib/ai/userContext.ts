/**
 * AI User Context
 * ==============
 * Fetch and build AI user context for adaptive communication
 */

import { createClient } from "@supabase/supabase-js";
import { AI_FLUENCY_GLOBAL_SYSTEM_RULE, PRIME_ORCHESTRATION_RULE } from "./systemPrompts";

export type AiFluencyLevel =
  | "Explorer"
  | "Builder"
  | "Operator"
  | "Strategist"
  | "Architect";

export type AiUserContext = {
  user_id: string;
  display_name?: string | null;
  currency?: string | null;
  timezone?: string | null;
  memory_enabled?: boolean | null;
  ai_fluency_score: number;
  ai_fluency_level: AiFluencyLevel;
};

/**
 * Get service Supabase client
 * Uses existing admin() function from netlify/functions/_shared/supabase.ts
 * This ensures we don't duplicate Supabase client creation
 * 
 * NOTE: This file is server-only (used by Netlify functions), so admin() is always available
 */
async function getServiceSupabase() {
  // Use admin() from shared supabase module (server-only)
  // Dynamic import to avoid circular dependencies and ES module compatibility
  try {
    // Try relative path from src/lib/ai/ to netlify/functions/_shared/
    const { admin } = await import('../../../netlify/functions/_shared/supabase.js');
    return admin();
  } catch (e) {
    // Fallback if admin() not available (shouldn't happen in server context)
    const url = process.env.SUPABASE_URL!;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    return createClient(url, key, { auth: { persistSession: false } });
  }
}

/**
 * Fetch AI user context from profiles table
 * 
 * @param userId - User ID
 * @returns AI user context with safe defaults if profile doesn't exist
 */
export async function fetchAiUserContext(userId: string): Promise<AiUserContext> {
  const supabase = await getServiceSupabase();

  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, currency, time_zone, ai_fluency_score, ai_fluency_level")
    .eq("id", userId)
    .single();

  if (error || !data) {
    // Safe defaults (don't break chat)
    return {
      user_id: userId,
      ai_fluency_score: 20,
      ai_fluency_level: "Explorer",
      currency: "CAD",
      timezone: "America/Edmonton",
      memory_enabled: true,
    };
  }

  return {
    user_id: data.id,
    display_name: data.display_name,
    currency: data.currency ?? "CAD",
    timezone: data.time_zone ?? "America/Edmonton",
    memory_enabled: true, // Always enabled in current system
    ai_fluency_score: data.ai_fluency_score ?? 20,
    ai_fluency_level: (data.ai_fluency_level ?? "Explorer") as AiFluencyLevel,
  };
}

/**
 * Builds the user context system message (separate from fluency rules)
 * 
 * @param ctx - AI user context
 * @returns User context system message block
 */
export function buildAiContextSystemMessage(ctx: AiUserContext): string {
  return `XspensesAI User Context (do not reveal unless user asks):
- user_id: ${ctx.user_id}
- display_name: ${ctx.display_name ?? "Unknown"}
- currency: ${ctx.currency ?? "CAD"}
- timezone: ${ctx.timezone ?? "America/Edmonton"}
- memory_enabled: ${ctx.memory_enabled ? "true" : "false"}
- ai_fluency_level: ${ctx.ai_fluency_level}
- ai_fluency_score: ${ctx.ai_fluency_score} (internal only; never mention)

You MUST follow the AI FLUENCY ADAPTATION RULES provided in system policy.`;
}

/**
 * Build system messages array for OpenAI chat completion
 * 
 * @param ctx - AI user context
 * @param employeeSlug - Employee slug (optional, used to determine if Prime)
 * @returns Array of system messages in correct order
 */
export function buildSystemMessages(ctx: AiUserContext, employeeSlug?: string): Array<{ role: "system"; content: string }> {
  const systemMessages: Array<{ role: "system"; content: string }> = [
    { role: "system", content: AI_FLUENCY_GLOBAL_SYSTEM_RULE },
    { role: "system", content: buildAiContextSystemMessage(ctx) },
  ];

  // If this request is routed to Prime, add orchestration rule
  const isPrime = employeeSlug === 'prime-boss' || employeeSlug === 'prime';
  if (isPrime) {
    systemMessages.push({ role: "system", content: PRIME_ORCHESTRATION_RULE });
  }

  return systemMessages;
}

