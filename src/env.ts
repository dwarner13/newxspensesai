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
  // Client-side (browser)
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    return import.meta.env.VITE_SUPABASE_URL || '';
  }
  // Server-side (Node.js)
  if (typeof process !== 'undefined' && process.env) {
    return process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
  }
  return '';
}

export function getSupabaseAnonKey(): string {
  // Client-side (browser)
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    return import.meta.env.VITE_SUPABASE_ANON_KEY || '';
  }
  // Server-side (Node.js)
  if (typeof process !== 'undefined' && process.env) {
    return process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';
  }
  return '';
}

// Browser-safe version - server-side functions removed
export function getSupabaseServiceRole(): string {
  throw new Error('Service role key only available server-side');
}
