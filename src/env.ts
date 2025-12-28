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

// Safe env reader: prefers process.env (Node/Netlify Functions), falls back to import.meta.env (Vite client)
// Never crashes if import.meta is unavailable (CJS/Node runtime)
// Server-side code paths skip import.meta to avoid CJS bundling warnings
const readEnv = (key: string, fallbackKey?: string): string => {
  // Server-side (Node.js / Netlify Functions) - prefer process.env
  // Skip import.meta entirely in server contexts to avoid CJS bundling warnings
  const isServer = typeof process !== 'undefined' && process.env;
  if (isServer) {
    if (process.env[key]) return process.env[key] as string;
    if (fallbackKey && process.env[fallbackKey]) return process.env[fallbackKey] as string;
    return ''; // Return early for server-side - don't check import.meta
  }
  // Client-side (Vite browser) - use import.meta.env
  // Safe check: typeof import.meta !== 'undefined' prevents CJS crashes
  if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
    const env = (import.meta as any).env;
    if (env[key]) return env[key] as string;
    if (fallbackKey && env[fallbackKey]) return env[fallbackKey] as string;
  }
  return '';
};

export function isPrimeV2Enabled(): boolean {
  // Prefer explicit env flags; default to false if unset
  const v = readEnv('PRIME_CHAT_V2', 'VITE_PRIME_CHAT_V2');
  return v === 'true';
}

export function getSupabaseUrl(): string {
  // Prefer VITE_SUPABASE_URL (client), fallback to SUPABASE_URL (server)
  return readEnv('VITE_SUPABASE_URL', 'SUPABASE_URL');
}

export function getSupabaseAnonKey(): string {
  // Prefer VITE_SUPABASE_ANON_KEY (client), fallback to SUPABASE_ANON_KEY (server)
  return readEnv('VITE_SUPABASE_ANON_KEY', 'SUPABASE_ANON_KEY');
}

// Server-side only: Get Supabase service role key
// This function must only ever be called from server-side code (Netlify functions / worker).
// Checking `process.env` is safer than checking `window`, because some bundlers
// polyfill `window` even in server bundles.
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
