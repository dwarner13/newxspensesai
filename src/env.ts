/**
 * Environment variable utilities
 * 
 * This file re-exports from server-safe and client-only modules.
 * For backward compatibility, existing imports continue to work.
 * 
 * For new code:
 * - Server/Netlify Functions: import from './env.server'
 * - Client code: import from './env.client'
 */

// Re-export server-safe functions (used by server/functions)
export {
  getSupabaseUrl,
  getSupabaseAnonKey,
  getSupabaseServiceRole,
  isPrimeV2Enabled,
} from './env.server';

// Re-export client-only functions (used by React components)
export {
  isPrimeEnabled,
} from './env.client';
