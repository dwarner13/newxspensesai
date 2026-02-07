export function getSupabaseUrl(): string {
  if (typeof process === 'undefined' || !process.env) {
    throw new Error('SUPABASE_URL is not available server-side');
  }
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  if (!url) {
    throw new Error('SUPABASE_URL is not set');
  }
  return url;
}

export function getSupabaseServiceRole(): string {
  if (typeof process === 'undefined' || !process.env) {
    throw new Error('Service role key only available server-side');
  }
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set');
  }
  return key;
}
