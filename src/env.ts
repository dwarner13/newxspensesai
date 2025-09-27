export function isPrimeEnabled(): boolean {
  // Always enable Prime Kernel for demo
  return true;
  
  // Original logic (commented out for demo):
  // Client-side check
  // if (typeof import.meta !== 'undefined' && import.meta.env) {
  //   return import.meta.env.VITE_ENABLE_PRIME_KERNEL === 'true';
  // }
  // Server-side check
  // if (typeof process !== 'undefined' && process.env) {
  //   return process.env.ENABLE_PRIME_KERNEL === 'true';
  // }
  // return false;
}

export function getSupabaseUrl(): string {
  return import.meta.env?.VITE_SUPABASE_URL || '';
}

export function getSupabaseAnonKey(): string {
  return import.meta.env?.VITE_SUPABASE_ANON_KEY || '';
}

// Browser-safe version - server-side functions removed
export function getSupabaseServiceRole(): string {
  throw new Error('Service role key only available server-side');
}
