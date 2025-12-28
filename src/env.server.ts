/**
 * Server-safe environment variable reader
 * 
 * This module contains ZERO import.meta references and is safe for use in:
 * - Netlify Functions
 * - Server-side Node.js code
 * - Any code that gets bundled into server bundles
 * 
 * All functions read exclusively from process.env.
 */

/**
 * Read environment variable from process.env
 * Server-safe: only reads from process.env, never uses import.meta
 */
function readEnv(key: string, fallbackKey?: string): string {
  if (typeof process === 'undefined' || !process.env) {
    return '';
  }
  
  if (process.env[key]) {
    return process.env[key] as string;
  }
  
  if (fallbackKey && process.env[fallbackKey]) {
    return process.env[fallbackKey] as string;
  }
  
  return '';
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

/**
 * Server-side only: Get Supabase service role key
 * This function must only ever be called from server-side code (Netlify functions / worker).
 */
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

