// netlify/functions/tools/get-needs-review.ts
import type { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

export const handler: Handler = async (event) => {
  try {
    const body = JSON.parse(event.body || "{}");
    const { userId, limit = 50 } = body;

    if (!userId) return resp(400, { error: "userId required" });

    const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

    const { data, error } = await supabase
      .from("transactions")
      .select("id, date, merchant, amount, category, review_reason, description")
      .eq("user_id", userId)
      .eq("review_status", "needs_review")
      .order("date", { ascending: false })
      .limit(Math.min(200, Math.max(1, limit)));
    
    if (error) return resp(500, { error: error.message });

    return resp(200, { ok: true, count: data?.length || 0, items: data || [] });
  } catch (e: any) {
    return resp(500, { error: e?.message || "unknown error" });
  }
};

function resp(statusCode: number, body: any) {
  return { statusCode, headers: { "content-type": "application/json" }, body: JSON.stringify(body) };
}
