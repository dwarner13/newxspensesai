// netlify/functions/_shared/supabase.ts
import { createClient } from "@supabase/supabase-js";

export function serverSupabase() {
  const url = process.env.SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });
  return { supabase };
}

// Direct export for convenience
const url = process.env.SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
export const supabaseAdmin = createClient(url, serviceKey, { auth: { persistSession: false } });

