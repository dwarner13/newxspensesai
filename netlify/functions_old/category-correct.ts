import { Handler } from "@netlify/functions";
import { z } from "zod";
import { serverSupabase } from "./_shared/supabase";
import { v4 as uuid } from "uuid";

const Body = z.object({
  transactionId: z.string().uuid(),
  newCategory: z.string().min(1),
});

export const handler: Handler = async (event) => {
  const { supabase } = serverSupabase();
  try {
    const body = Body.parse(JSON.parse(event.body ?? "{}"));

    // fetch txn + import to get user_id
    const { data: txn, error: eT } = await supabase
      .from("transactions")
      .select("id, category, vendor_raw, merchant_norm, import_id")
      .eq("id", body.transactionId)
      .single();
    if (eT || !txn) throw new Error(eT?.message ?? "transaction not found");

    const { data: imp, error: eI } = await supabase
      .from("imports").select("user_id").eq("id", txn.import_id).single();
    if (eI || !imp) throw new Error(eI?.message ?? "import not found");

    const userId = imp.user_id;

    // update category
    const { error: eU } = await supabase
      .from("transactions")
      .update({ category: body.newCategory, category_confidence: 100 })
      .eq("id", body.transactionId);
    if (eU) throw new Error(eU.message);

    // history
    const { error: eH } = await supabase.from("category_history").insert({
      id: uuid(),
      user_id: userId,
      transaction_id: body.transactionId,
      old_category: txn.category,
      new_category: body.newCategory,
      reason: "user_correction",
      confidence: 100,
    });
    if (eH) throw new Error(eH.message);

    // learn a lightweight rule (pattern = merchant_norm || vendor_raw)
    const pattern = (txn.merchant_norm || txn.vendor_raw || "").toUpperCase().slice(0, 64);
    if (pattern) {
      await supabase.from("category_rules").insert({
        user_id: userId,
        merchant_pattern: pattern,
        category: body.newCategory,
        priority: 50,       // prefer user rules over defaults
        match_type: "ilike"
      }).catch(() => {
        // ignore if rule already exists (upsert would be better but we keep it simple)
      });
    }

    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (err: any) {
    return { statusCode: 400, body: JSON.stringify({ error: err?.message || "error" }) };
  }
};






