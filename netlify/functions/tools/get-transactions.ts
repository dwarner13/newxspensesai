// netlify/functions/tools/get-transactions.ts
import type { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

export const handler: Handler = async (event) => {
  try {
    const body = JSON.parse(event.body || "{}");
    const { userId, from, to, vendor, category, limit = 50 } = body;

    if (!userId) return resp(400, { error: "userId required" });

    const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

    let q = supabase
      .from("transactions")
      .select("id, date, merchant, category, amount, review_status, description")
      .eq("user_id", userId)
      .order("date", { ascending: false })
      .limit(Math.min(200, Math.max(1, limit)));

    if (from) q = q.gte("date", from);
    if (to) q = q.lte("date", to);
    if (vendor) q = q.ilike("merchant", `%${vendor}%`);
    if (category) q = q.eq("category", category);

    const { data, error } = await q;
    if (error) return resp(500, { error: error.message });

    const total = (data || []).reduce((sum, t) => sum + (t.amount || 0), 0);

    return resp(200, { ok: true, count: data?.length || 0, items: data || [], total });
  } catch (e: any) {
    return resp(500, { error: e?.message || "unknown error" });
  }
};

function resp(statusCode: number, body: any) {
  return { statusCode, headers: { "content-type": "application/json" }, body: JSON.stringify(body) };
}
