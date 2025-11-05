// netlify/functions/prime-handoff.ts
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

    // Create a handoff record Prime can pick up
    const handoffId = uuid();
    const { error } = await supabase.from("handoffs").insert({
      id: handoffId,
      import_id: body.importId,
      from_agent: "byte-doc",
      to_agent: "prime-boss",
      status: "queued",
      payload: { type: "import_ready", importId: body.importId },
    });
    if (error) throw new Error(error.message);

    // Mark imports.status for observability
    await supabase.from("imports").update({ status: "handoff_prime" }).eq("id", body.importId);

    safeLog("prime-handoff.success", { handoffId, importId: body.importId });
    return ok({ handoffId });
  } catch (err: any) {
    safeLog("prime-handoff.error", { err: err?.message });
    return errResp(err);
  }
};

function ok(body: unknown) {
  return { statusCode: 200, body: JSON.stringify(body) };
}
function errResp(err: any) {
  return { statusCode: 400, body: JSON.stringify({ error: err?.message ?? "error" }) };
}






