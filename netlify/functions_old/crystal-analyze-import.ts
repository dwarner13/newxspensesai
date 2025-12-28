// netlify/functions/crystal-analyze-import.ts
import { Handler } from "@netlify/functions";
import { z } from "zod";
import { serverSupabase } from "./_shared/supabase";
import { safeLog } from "./_shared/safeLog";
import { v4 as uuid } from "uuid";

const Body = z.object({ importId: z.string().uuid() });

export const handler: Handler = async (event) => {
  try {
    const body = Body.parse(JSON.parse(event.body ?? "{}"));
    const { supabase } = serverSupabase();

    // Pull transactions for import
    const { data: txns, error: e1 } = await supabase
      .from("transactions")
      .select("amount, occurred_at, description, category, vendor_raw")
      .eq("import_id", body.importId);
    if (e1) throw new Error(e1.message);

    // TODO: call Crystal 2.0 analysis (OpenAI) — placeholder summary now
    const adviceId = uuid();
    const total = (txns ?? []).reduce((s, t) => s + Number(t.amount || 0), 0);
    const summary = `Crystal preview: ${txns?.length ?? 0} transactions imported. Net total ${total.toFixed(2)}.`;

    const { error: e2 } = await supabase.from("advice_messages").insert({
      id: adviceId,
      import_id: body.importId,
      role: "crystal-analytics",
      message: summary,
      meta: { kind: "import_analysis" },
    });
    if (e2) throw new Error(e2.message);

    await supabase.from("imports").update({ status: "analyzed_crystal" }).eq("id", body.importId);
    
    safeLog("crystal-analyze-import.success", { adviceId, importId: body.importId, transactionCount: txns?.length || 0 });
    return ok({ adviceId, summary });
  } catch (err: any) {
    safeLog("crystal-analyze-import.error", { err: err?.message });
    return errResp(err);
  }
};

function ok(body: unknown) {
  return { statusCode: 200, body: JSON.stringify(body) };
}
function errResp(err: any) {
  return { statusCode: 400, body: JSON.stringify({ error: err?.message ?? "error" }) };
}






