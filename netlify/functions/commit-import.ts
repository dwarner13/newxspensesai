// netlify/functions/commit-import.ts
import { Handler } from "@netlify/functions";
import { z } from "zod";
import { serverSupabase } from "./_shared/supabase";
import { safeLog } from "./_shared/safeLog";

const Body = z.object({ importId: z.string().uuid() });

export const handler: Handler = async (event) => {
  try {
    const body = Body.parse(JSON.parse(event.body ?? "{}"));
    const { supabase } = serverSupabase();

    // 1) Read staged rows
    const { data: staged, error: e1 } = await supabase
      .from("transactions_staging")
      .select("*")
      .eq("import_id", body.importId);
    if (e1) throw new Error(e1.message);

    // 2) Upsert into final table with idempotency on hash
    const finalRows = staged.map((r) => ({
      import_id: r.import_id,
      occurred_at: r.occurred_at,
      description: r.description,
      amount: r.amount,
      currency: r.currency,
      memo: r.memo,
      vendor_raw: r.vendor_raw,
      vendor_normalized: null,
      category: r.category_suggested,
      hash: r.hash,
      source_line: r.source_line,
    }));
    const { error: e2 } = await supabase.from("transactions").upsert(finalRows, { onConflict: "hash" });
    if (e2) throw new Error(e2.message);

    // 3) Mark import committed
    await supabase.from("imports").update({ status: "committed" }).eq("id", body.importId);

    safeLog("commit-import.success", { importId: body.importId, transactionCount: finalRows.length });
    return ok({ transactionCount: finalRows.length });
  } catch (err: any) {
    safeLog("commit-import.error", { err: err?.message });
    return errResp(err);
  }
};

function ok(body: unknown) {
  return { statusCode: 200, body: JSON.stringify(body) };
}
function errResp(err: any) {
  return { statusCode: 400, body: JSON.stringify({ error: err?.message ?? "error" }) };
}






