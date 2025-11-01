/**
 * Prime Segmentation Test Endpoint
 * 
 * Optional HTTP endpoint for testing and debugging segmentation decisions.
 * 
 * Endpoint: GET /.netlify/functions/prime/segmentation?userId=...
 * 
 * Response: SegmentationDecision JSON
 * 
 * @module netlify/functions/prime/segmentation
 */

import type { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";
import { getUsageSignals } from "../../_shared/supabase";
import type { SegmentationDecision } from "../../../src/types/prime";

interface SegmentationResponse {
  ok: boolean;
  decision?: SegmentationDecision;
  error?: string;
}

/**
 * Netlify function handler for segmentation endpoint
 * 
 * Query Parameters:
 * - userId (required): User's UUID to segment
 * 
 * Example:
 * GET /.netlify/functions/prime/segmentation?userId=550e8400-e29b-41d4-a716-446655440000
 * 
 * Response:
 * {
 *   "ok": true,
 *   "decision": {
 *     "status": "power_user",
 *     "reason": "high_usage: 300 transactions, 15 rules, 5 goals",
 *     "signals": { "transactions": 300, "rules": 15, "goals": 5, ... },
 *     "evaluatedAt": "2025-10-19T12:34:56.789Z"
 *   }
 * }
 */
export const handler: Handler = async (event) => {
  try {
    // Validate method
    if (event.httpMethod !== "GET") {
      return {
        statusCode: 405,
        body: JSON.stringify({
          ok: false,
          error: "Method Not Allowed. Use GET.",
        } as SegmentationResponse),
      };
    }

    // Extract userId from query params
    const userId = event.queryStringParameters?.userId;
    if (!userId) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          ok: false,
          error: "Missing required parameter: userId",
        } as SegmentationResponse),
      };
    }

    // Validate UUID format (basic check)
    if (!isValidUUID(userId)) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          ok: false,
          error: "Invalid userId format. Must be a valid UUID.",
        } as SegmentationResponse),
      };
    }

    // Initialize Supabase
    const supabase = createClient(
      process.env.VITE_SUPABASE_URL || "",
      process.env.SUPABASE_SERVICE_ROLE_KEY || ""
    );

    // Import segmentation logic
    const { getUsageSignals: fetchSignals } = await import("../../../src/lib/user-usage");
    const { decideUserStatus } = await import("../../../src/lib/user-status");

    // Fetch signals and compute decision
    const signals = await fetchSignals(supabase, userId);
    const decision = decideUserStatus(signals);

    // Return success
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ok: true,
        decision,
      } as SegmentationResponse),
    };
  } catch (error: any) {
    console.error("[prime/segmentation] Error:", error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        ok: false,
        error: `Internal server error: ${error?.message || "Unknown"}`,
      } as SegmentationResponse),
    };
  }
};

/**
 * Basic UUID validation
 * @param uuid String to validate
 * @returns true if valid UUID format
 */
function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}






