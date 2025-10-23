import { Handler } from "@netlify/functions";
import { z } from "zod";
import { serverSupabase } from "./_shared/supabase";
import { safeLog } from "./_shared/safeLog";

const Body = z.object({ importId: z.string().uuid(), defaultConfidence: z.number().optional() });

export const handler: Handler = async (event) => {
  try {
    const body = Body.parse(JSON.parse(event.body ?? "{}"));
    const { supabase } = serverSupabase();

    // Pull transactions for this import
    const { data: txns, error: e1 } = await supabase
      .from("transactions")
      .select("id, import_id, description, vendor_raw, category, merchant_norm")
      .eq("import_id", body.importId);
    if (e1) throw new Error(e1.message);
    if (!txns?.length) return ok({ updated: 0 });

    // Get user_id from the import record to respect RLS relations
    const { data: imp, error: eImp } = await supabase
      .from("imports").select("user_id").eq("id", body.importId).single();
    if (eImp || !imp) throw new Error(eImp?.message ?? "import not found");
    const userId = imp.user_id;

    // Load rules + norms
    const [{ data: rules }, { data: norms }] = await Promise.all([
      supabase.from("category_rules").select("*").eq("user_id", userId).order("priority", { ascending: true }),
      supabase.from("normalized_merchants").select("*").eq("user_id", userId),
    ]);

    // Build normalization map
    const normMap = new Map<string, string>();
    (norms || []).forEach(n => normMap.set((n.vendor_raw || "").toUpperCase(), n.merchant_norm));

    // Categorize
    const updates: any[] = [];
    const historyRows: any[] = [];

    for (const t of txns) {
      const raw = (t.vendor_raw || t.description || "").toUpperCase().trim();
      const merchant_norm = normMap.get(raw) || guessMerchant(raw); // simple guess
      let applied: { category: string; confidence: number; reason: string } | null = null;

      // Try rules
      for (const r of (rules || [])) {
        const pat = (r.merchant_pattern || "").toUpperCase();
        if (r.match_type === "regex") {
          try {
            const re = new RegExp(pat, "i");
            if (re.test(raw) || re.test(merchant_norm.toUpperCase())) {
              applied = { category: r.category, confidence: 95, reason: "rule" };
              break;
            }
          } catch {}
        } else {
          // ILIKE style — substring match
          const hit = raw.includes(pat) || merchant_norm.toUpperCase().includes(pat);
          if (hit) { applied = { category: r.category, confidence: 90, reason: "rule" }; break; }
        }
      }

      // TODO: AI fallback (when no rules matched) — future:
      // if (!applied) { const {category,confidence}=await callTagAI(...); applied={category,confidence,reason:'ai'} }

      if (applied) {
        updates.push({
          id: t.id,
          category: applied.category,
          category_confidence: applied.confidence,
          merchant_norm,
        });
        historyRows.push({
          user_id: userId,
          transaction_id: t.id,
          old_category: t.category,
          new_category: applied.category,
          reason: applied.reason,
          confidence: applied.confidence,
        });
      } else if (merchant_norm && merchant_norm !== t.merchant_norm) {
        updates.push({ id: t.id, merchant_norm }); // save normalization even if no category yet
      }
    }

    if (updates.length) {
      const { error: eU } = await supabase.from("transactions").upsert(updates, { onConflict: "id" });
      if (eU) throw new Error(eU.message);
    }
    if (historyRows.length) {
      const { error: eH } = await supabase.from("category_history").insert(historyRows);
      if (eH) throw new Error(eH.message);
    }

    safeLog("categorize-transactions.success", { importId: body.importId, updated: updates.length });
    return ok({ updated: updates.length, history: historyRows.length });
  } catch (err: any) {
    safeLog("categorize-transactions.error", { err: err?.message });
    return { statusCode: 400, body: JSON.stringify({ error: err?.message || "error" }) };
  }
};

function guessMerchant(raw: string): string {
  // crude cleanup
  return raw.replace(/\s{2,}/g, " ").replace(/[#*\d-]/g, "").trim() || "UNKNOWN";
}
function ok(body: unknown) { return { statusCode: 200, body: JSON.stringify(body) }; }





