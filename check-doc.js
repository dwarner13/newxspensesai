const { createClient } = require("@supabase/supabase-js");

const sb = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

(async () => {
  const docId = "b2ce03da-d05e-4b7d-8b17-eb7444d9fb56";

  const { data, error } = await sb
    .from("user_documents")
    .select("id,user_id,status,ocr_text,ocr_completed_at,pii_types,updated_at")
    .eq("id", docId)
    .maybeSingle();

  console.log(JSON.stringify({
    error,
    hasText: !!(data?.ocr_text && data.ocr_text.length),
    len: (data?.ocr_text || "").length,
    data
  }, null, 2));
})();
