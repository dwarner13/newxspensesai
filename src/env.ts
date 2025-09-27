export function isPrimeEnabled(): boolean {
  // Client-side check
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    return import.meta.env.VITE_ENABLE_PRIME_KERNEL === 'true';
  }
  // Server-side check
  if (typeof process !== 'undefined' && process.env) {
    return process.env.ENABLE_PRIME_KERNEL === 'true';
  }
  return false;
}

export function getSupabaseUrl(): string {
  return import.meta.env?.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
}

export function getSupabaseAnonKey(): string {
  return import.meta.env?.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';
}

export function getSupabaseServiceRole(): string {
  if (typeof process !== 'undefined' && process.env) {
    return process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  }
  throw new Error('Service role key only available server-side');
}
