import type { Handler } from "@netlify/functions";
import { supabaseAdmin } from "./_shared/supabase";

/**
 * Scheduled Cron Job: Batch Categorize
 * 
 * Runs periodically (e.g., hourly via Netlify scheduled function)
 * 
 * For each active user in the last 90 days:
 * - Find uncategorized transactions (no category_id)
 * - Find low-confidence transactions (confidence < 0.6)
 * - Batch categorize them via /tag-categorize
 * 
 * Netlify Config:
 * [[functions]]
 *   name = "tag-batch-categorize"
 *   schedule = "0 * * * *"  # Every hour
 */

async function categorizeBatch(user_id: string, txs: any[]) {
  if (txs.length === 0) return;

  const payload = {
    transaction_ids: txs.map(t => t.id),
    mode: "write" as const,
  };

  try {
    const resp = await fetch(`${process.env.URL}/.netlify/functions/tag-categorize`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": user_id,
      },
      body: JSON.stringify(payload),
    });

    if (!resp.ok) {
      console.warn(`[tag-batch-categorize] categorize failed for user ${user_id}:`, resp.status);
    }
  } catch (err) {
    console.error(`[tag-batch-categorize] Error categorizing batch for user ${user_id}:`, err);
  }
}

export const handler: Handler = async (_event) => {
  try {
    console.log("[tag-batch-categorize] Starting batch categorization...");

    // Find users with activity in last 90 days
    const since = new Date(Date.now() - 90 * 86400000).toISOString();

    const { data: users, error: e0 } = await supabaseAdmin
      .from("transactions")
      .select("user_id")
      .gte("posted_at", since)
      .neq("user_id", null);

    if (e0) throw e0;

    // De-duplicate users
    const uniqueUsers = Array.from(
      new Map((users ?? []).map(u => [u.user_id, u])).values()
    );

    let totalProcessed = 0;

    for (const u of uniqueUsers) {
      const user_id = u.user_id;

      // 1. Fetch uncategorized transactions (no category_id)
      const { data: uncategorized, error: e1 } = await supabaseAdmin
        .from("transactions")
        .select("id, merchant_name, amount, posted_at, memo")
        .eq("user_id", user_id)
        .gte("posted_at", since)
        .is("category_id", null);

      if (e1) {
        console.warn(`[tag-batch-categorize] Failed to fetch uncategorized for user ${user_id}:`, e1);
        continue;
      }

      // 2. Fetch low-confidence transactions (< 0.6)
      const { data: lowConfidence, error: e2 } = await supabaseAdmin
        .from("transaction_categorizations")
        .select(
          "transaction_id, transactions!inner(id, merchant_name, amount, posted_at, memo)"
        )
        .eq("transactions.user_id", user_id)
        .gte("transactions.posted_at", since)
        .lt("confidence", 0.6)
        .order("version", { ascending: false });

      if (e2) {
        console.warn(`[tag-batch-categorize] Failed to fetch low-confidence for user ${user_id}:`, e2);
        continue;
      }

      // Extract unique transactions (take latest version only)
      const lowConfTxs = lowConfidence
        ? Array.from(
            new Map(
              (lowConfidence as any[]).map(c => [
                c.transaction_id,
                c.transactions,
              ])
            ).values()
          )
        : [];

      // Combine and de-duplicate
      const allTxs = Array.from(
        new Map(
          [
            ...(uncategorized ?? []),
            ...lowConfTxs,
          ].map(t => [t.id, t])
        ).values()
      ).slice(0, 500); // Cap per user to avoid overload

      if (allTxs.length > 0) {
        console.log(
          `[tag-batch-categorize] Categorizing ${allTxs.length} transactions for user ${user_id}`
        );
        await categorizeBatch(user_id, allTxs);
        totalProcessed += allTxs.length;
      }
    }

    console.log(
      `[tag-batch-categorize] Completed: processed ${totalProcessed} transactions across ${uniqueUsers.length} users`
    );

    return {
      statusCode: 200,
      body: JSON.stringify({
        ok: true,
        users_processed: uniqueUsers.length,
        transactions_processed: totalProcessed,
      }),
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[tag-batch-categorize] Fatal error:", msg);
    return {
      statusCode: 500,
      body: JSON.stringify({ ok: false, error: msg }),
    };
  }
};
