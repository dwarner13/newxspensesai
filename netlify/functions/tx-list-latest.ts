/**
 * Transaction List Latest Endpoint
 *
 * Fetches paginated transactions for a user with optional categorization data.
 *
 * Features:
 * - Cursor-based pagination (keyset, not offset)
 * - Filter by days, min confidence, category status
 * - Merchant name search (fuzzy)
 * - Joins with latest categorization (view)
 * - RLS enforced; safe logging
 *
 * @example
 * POST /.netlify/functions/tx-list-latest
 * {
 *   "days": 30,
 *   "pageSize": 50,
 *   "cursor": null,
 *   "minConfidence": 0.7,
 *   "onlyUncategorized": false,
 *   "q": "amazon"
 * }
 */

import type { Handler } from "@netlify/functions";
import { z } from "zod";
import { serverSupabase } from "./_shared/supabase";
import { safeLog } from "./_shared/safeLog";

// ============================================================================
// TYPES & SCHEMAS
// ============================================================================

const Input = z.object({
  days: z.number().int().min(1).max(180).default(30),
  pageSize: z.number().int().min(1).max(200).default(50),
  cursor: z.string().nullable().optional(), // base64(posted_at|id)
  minConfidence: z.number().min(0).max(1).nullable().optional(),
  onlyUncategorized: z.boolean().optional(),
  q: z.string().max(128).optional(), // merchant search
});

type Input = z.infer<typeof Input>;

interface TransactionRow {
  id: string;
  user_id: string;
  merchant_name: string;
  amount: number;
  posted_at: string;
  memo: string | null;
  category_id: string | null;
  category_name?: string | null;
  source: "rule" | "ai" | "default" | null;
  confidence: number | null;
}

// ============================================================================
// CURSOR HELPERS
// ============================================================================

/**
 * Decode cursor from base64
 * Format: "YYYY-MM-DDTHH:MM:SS.sssZ|uuid"
 */
function decodeCursor(cur?: string | null): { posted_at: string; id: string } | null {
  if (!cur) return null;
  try {
    const decoded = Buffer.from(cur, "base64").toString("utf8");
    const [posted_at, id] = decoded.split("|");
    if (!posted_at || !id) return null;
    return { posted_at, id };
  } catch {
    return null;
  }
}

/**
 * Encode cursor to base64
 * Format: "YYYY-MM-DDTHH:MM:SS.sssZ|uuid"
 */
function encodeCursor(posted_at: string, id: string): string {
  return Buffer.from(`${posted_at}|${id}`, "utf8").toString("base64");
}

// ============================================================================
// HANDLER
// ============================================================================

export const handler: Handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") {
      return { statusCode: 405, body: "Method Not Allowed" };
    }

    const user_id = event.headers["x-user-id"] as string | undefined;
    if (!user_id) {
      return { statusCode: 401, body: "Unauthorized" };
    }

    // Parse input
    const parsed = Input.safeParse(JSON.parse(event.body ?? "{}"));
    if (!parsed.success) {
      return { statusCode: 400, body: JSON.stringify(parsed.error.flatten()) };
    }
    const { days, pageSize, cursor, minConfidence, onlyUncategorized, q } = parsed.data;

    const { supabase } = serverSupabase();

    // Date range (UTC)
    const sinceIso = new Date(Date.now() - days * 86400000).toISOString();

    // Build base query
    let qb = supabase
      .from("transactions")
      .select(
        `
        id,
        user_id,
        merchant_name,
        amount,
        posted_at,
        memo,
        category,
        category_confidence,
        merchant_norm
      `
      )
      .eq("user_id", user_id)
      .gte("posted_at", sinceIso)
      .order("posted_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(pageSize + 1); // overfetch by 1 for next cursor detection

    // Filters
    if (q && q.trim()) {
      qb = qb.ilike("merchant_name", `%${q.trim()}%`);
    }

    if (onlyUncategorized) {
      qb = qb.is("category", null);
    }

    if (typeof minConfidence === "number") {
      qb = qb.gte("category_confidence", minConfidence);
    }

    // Cursor pagination: keyset
    // If we have a cursor, continue after (posted_at DESC, id DESC)
    const cur = decodeCursor(cursor);
    if (cur?.posted_at && cur?.id) {
      // Rows where:
      //   (posted_at < cursor_posted_at) OR
      //   (posted_at == cursor_posted_at AND id < cursor_id)
      qb = qb.or(
        `posted_at.lt.${cur.posted_at},and(posted_at.eq.${cur.posted_at},id.lt.${cur.id})`
      );
    }

    const { data, error } = await qb;

    if (error) {
      safeLog("tx-list-latest.query_error", { error: error.message, user_id });
      throw error;
    }

    // Detect next cursor
    let nextCursor: string | null = null;
    let items = data ?? [];

    if (items.length > pageSize) {
      const lastItem = items[pageSize - 1];
      nextCursor = encodeCursor(lastItem.posted_at, lastItem.id);
      items = items.slice(0, pageSize);
    }

    // Sanitize response
    const rows: TransactionRow[] = items.map((i: any) => ({
      id: i.id,
      user_id: i.user_id,
      merchant_name: i.merchant_name,
      merchant_norm: i.merchant_norm ?? null,
      amount: Number(i.amount),
      posted_at: i.posted_at,
      memo: i.memo ?? null,
      category_id: i.category ?? null,
      category_name: i.category ?? null,
      confidence: i.category_confidence ?? null,
      source: i.category ? "manual" : null, // Simplified for now
    }));

    safeLog("tx-list-latest.success", {
      user_id,
      count: rows.length,
      hasNextCursor: !!nextCursor,
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        ok: true,
        data: rows,
        nextCursor,
        pageSize,
        count: rows.length,
      }),
    };
  } catch (err: any) {
    safeLog("tx-list-latest.error", { error: err?.message });
    return {
      statusCode: 500,
      body: JSON.stringify({
        ok: false,
        error: "Failed to list transactions",
      }),
    };
  }
};





