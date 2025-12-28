/**
 * Client-side environment variable reader
 * 
 * This module is CLIENT-ONLY and uses import.meta.env (Vite).
 * 
 * DO NOT import this module in:
 * - Netlify Functions
 * - Server-side code
 * - Any code that gets bundled into server bundles
 */

/**
 * Read environment variable from import.meta.env (Vite client) or process.env fallback
 * Client-safe: uses import.meta.env for Vite client-side code
 */
function readEnv(key: string, fallbackKey?: string): string {
  // Client-side (Vite browser) - use import.meta.env
  if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
    const env = (import.meta as any).env;
    if (env[key]) return env[key] as string;
    if (fallbackKey && env[fallbackKey]) return env[fallbackKey] as string;
  }
  
  // Fallback to process.env (for SSR scenarios)
  if (typeof process !== 'undefined' && process.env) {
    if (process.env[key]) return process.env[key] as string;
    if (fallbackKey && process.env[fallbackKey]) return process.env[fallbackKey] as string;
  }
  
  return '';
}

export function isPrimeEnabled(): boolean {
  // Always enable Prime Kernel for demo
  return true;
  
  // Original logic (commented out for demo):
  // if (typeof import.meta !== 'undefined' && import.meta.env) {
  //   return import.meta.env.VITE_ENABLE_PRIME_KERNEL === 'true';
  // }
  // if (typeof process !== 'undefined' && process.env) {
  //   return process.env.ENABLE_PRIME_KERNEL === 'true';
  // }
  // return false;
}

export function isPrimeV2Enabled(): boolean {
  const v = readEnv('PRIME_CHAT_V2', 'VITE_PRIME_CHAT_V2');
  return v === 'true';
}

export function getSupabaseUrl(): string {
  return readEnv('VITE_SUPABASE_URL', 'SUPABASE_URL');
}

export function getSupabaseAnonKey(): string {
  return readEnv('VITE_SUPABASE_ANON_KEY', 'SUPABASE_ANON_KEY');
}

