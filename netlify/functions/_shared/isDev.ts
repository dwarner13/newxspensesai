/**
 * Server-safe DEV detection helper
 * 
 * Use this for DEV detection in Netlify Functions/server code.
 * Works in CJS and ESM environments.
 * Reads from process.env only (server-safe).
 * 
 * Returns true if:
 * - process.env.NETLIFY_DEV === 'true' (Netlify Dev local environment)
 * - process.env.NODE_ENV !== 'production' (development mode)
 * 
 * @returns {boolean} True if running in development mode
 */
export function isDev(): boolean {
  return (
    process.env.NETLIFY_DEV === 'true' ||
    process.env.NODE_ENV !== 'production'
  );
}

