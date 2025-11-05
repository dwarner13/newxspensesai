// netlify/functions/_shared/supabase.ts
import { createClient } from "@supabase/supabase-js";

const URL = process.env.SUPABASE_URL;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!URL || !SERVICE) {
  console.error('[env] Missing required Supabase env: SUPABASE_URL and SUPABASE_SERVICE_ROLE');
}

export function admin() {
  if (!URL || !SERVICE) throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE');
  return createClient(URL, SERVICE, { auth: { persistSession: false } });
}

// Backward compatibility aliases
export const serverSupabase = admin;
export const supabaseAdmin = (() => {
  if (!URL || !SERVICE) return null as any;
  return createClient(URL, SERVICE, { auth: { persistSession: false } });
})();

