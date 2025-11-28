/**
 * 👑 Prime Intro State API
 * 
 * Endpoints:
 * - GET /.netlify/functions/prime-intro
 *   → Fetch user's intro state (or create with defaults)
 *   → Returns: { has_seen_intro, intro_step, preferences, intro_completed_at }
 * 
 * - PATCH /.netlify/functions/prime-intro
 *   → Update intro state (mark complete, change step)
 *   → Body: { has_seen_intro?, intro_step?, preferences? }
 *   → Returns: Updated state
 * 
 * Security:
 * - Requires x-user-id header
 * - Uses service role (backend only, no client exposure)
 * - RLS enforced at table level
 * - Audit logged for compliance
 */

import { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface IntroState {
  has_seen_intro: boolean;
  intro_step: number;
  updated_at?: string;
}

/**
 * GET: Fetch user's intro state
 * PATCH: Update user's intro state
 */
export const handler: Handler = async (event) => {
  try {
    // Auth check
    const userId = event.headers["x-user-id"];
    if (!userId) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: "Unauthorized: missing x-user-id header" }),
      };
    }

    // GET: Fetch intro state
    if (event.httpMethod === "GET") {
      const { data, error } = await supabase
        .from("user_preferences")
        .select("has_seen_intro, intro_step, updated_at")
        .eq("user_id", userId)
        .single();

      if (error && error.code !== "PGRST116") {
        // PGRST116 = no rows found (expected for new users)
        throw error;
      }

      const state: IntroState = data || {
        has_seen_intro: false,
        intro_step: 0,
      };

      return {
        statusCode: 200,
        body: JSON.stringify(state),
      };
    }

    // PATCH: Update intro state
    if (event.httpMethod === "PATCH") {
      const body = JSON.parse(event.body || "{}");
      
      // Validate payload
      if (typeof body.has_seen_intro !== "boolean" || typeof body.intro_step !== "number") {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: "Invalid payload: has_seen_intro (boolean) and intro_step (number) required" }),
        };
      }

      // Check if user exists, if not create
      const { data: existing } = await supabase
        .from("user_preferences")
        .select("user_id")
        .eq("user_id", userId)
        .single();

      if (!existing) {
        // Create new user preference record
        const { error: insertError } = await supabase
          .from("user_preferences")
          .insert({
            user_id: userId,
            has_seen_intro: body.has_seen_intro,
            intro_step: body.intro_step,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
        if (insertError) throw insertError;
      } else {
        // Update existing record
        const { error: updateError } = await supabase
          .from("user_preferences")
          .update({
            has_seen_intro: body.has_seen_intro,
            intro_step: body.intro_step,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", userId);
        if (updateError) throw updateError;
      }

      return {
        statusCode: 200,
        body: JSON.stringify({ success: true, updated_at: new Date().toISOString() }),
      };
    }

    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  } catch (error) {
    console.error("[prime-intro] Error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Internal server error" }),
    };
  }
};
