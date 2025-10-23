import type { Handler } from "@netlify/functions";
import { supabaseAdmin } from "./_shared/supabase";

/**
 * GET /.netlify/functions/tag-export-corrections?windowDays=30
 * 
 * Exports categorization corrections and low-confidence events as CSV.
 * Useful for:
 * - Auditing Tag AI performance
 * - Analyzing user corrections over time
 * - Training data export
 * - Analytics in external tools
 * 
 * Query Parameters:
 *   windowDays: 1-90 (default: 30)
 * 
 * Headers:
 *   x-user-id: required (user UUID)
 * 
 * Returns:
 *   CSV file with columns:
 *   - transaction_id
 *   - created_at
 *   - from_category_id
 *   - to_category_id
 */

function toCsv(rows: any[], headers: string[]): string {
  const escape = (v: any): string => {
    const s = v == null ? "" : String(v);
    return `"${s.replace(/"/g, '""')}"`;
  };

  const headerRow = headers.join(",");
  const dataRows = rows.map(r => headers.map(h => escape(r[h])).join(","));

  return [headerRow, ...dataRows].join("\n");
}

export const handler: Handler = async (event) => {
  try {
    // Only GET allowed
    if (event.httpMethod !== "GET") {
      return {
        statusCode: 405,
        body: "Method Not Allowed",
      };
    }

    // Authenticate
    const user_id = event.headers["x-user-id"] as string | undefined;
    if (!user_id) {
      return {
        statusCode: 401,
        body: "Unauthorized",
      };
    }

    // Parse and validate time window (1-90 days)
    const windowDays = Math.max(
      1,
      Math.min(90, parseInt(event.queryStringParameters?.windowDays ?? "30", 10))
    );

    // Calculate start date
    const startDate = new Date(Date.now() - windowDays * 86400000).toISOString();

    // Fetch correction events
    const { data: corrections, error: corrError } = await supabaseAdmin
      .from("correction_events")
      .select("transaction_id, created_at, from_category_id, to_category_id")
      .eq("user_id", user_id)
      .gte("created_at", startDate)
      .order("created_at", { ascending: false });

    if (corrError) throw corrError;

    // Build CSV
    const headers = [
      "transaction_id",
      "created_at",
      "from_category_id",
      "to_category_id",
    ];
    const csv = toCsv(corrections ?? [], headers);

    // Return as downloadable CSV
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="categorization_corrections_${windowDays}d_${new Date().toISOString().split('T')[0]}.csv"`,
      },
      body: csv,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[tag-export-corrections] Error:", msg);
    return {
      statusCode: 500,
      body: "Export failed",
    };
  }
};
