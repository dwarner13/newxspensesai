/**
 * Central Logger Utility
 * 
 * Controls console output in development to reduce spam.
 * 
 * QUIET MODE (VITE_CHAT_QUIET_MODE):
 * - When enabled, log() and warn() are muted in DEV
 * - console.error() ALWAYS prints (never muted)
 * - Re-enable: Remove VITE_CHAT_QUIET_MODE from .env.local or set to false
 * 
 * DEBUG LOGS (dev-only):
 * - By default, debug/info are NO-OP in development
 * - Enable verbose logs: localStorage.setItem('DEBUG_LOGS', '1')
 * - Disable verbose logs: localStorage.removeItem('DEBUG_LOGS')
 * - Or set: window.__DEBUG_LOGS__ = true
 * 
 * WARN/ERROR:
 * - Always print (never muted)
 */

// QUIET MODE: Intentional gate to suppress console spam during OCR/Smart Import debugging
// Supports both VITE_CHAT_QUIET_MODE and VITE_QUIET_MODE
// This is NOT a bug - it's a reversible feature flag
// Re-enable: Remove VITE_CHAT_QUIET_MODE or VITE_QUIET_MODE from .env.local or set to false
const QUIET_CHAT_RAW = import.meta.env.VITE_CHAT_QUIET_MODE;
const QUIET_GLOBAL_RAW = import.meta.env.VITE_QUIET_MODE;
const QUIET_CHAT = QUIET_CHAT_RAW === 'true' || QUIET_CHAT_RAW === '1' || QUIET_CHAT_RAW === 'yes' || QUIET_CHAT_RAW === 'on';
const QUIET_GLOBAL = QUIET_GLOBAL_RAW === 'true' || QUIET_GLOBAL_RAW === '1' || QUIET_GLOBAL_RAW === 'yes' || QUIET_GLOBAL_RAW === 'on';
const QUIET = QUIET_CHAT || QUIET_GLOBAL;

// Check if DEBUG_LOGS is enabled (dev-only)
const isDebugEnabled = (): boolean => {
  if (import.meta.env.PROD) return false; // Never enable in production
  if (typeof window === 'undefined') return false;
  return (
    localStorage.getItem('DEBUG_LOGS') === '1' ||
    (window as any).__DEBUG_LOGS__ === true
  );
};

// Standard log (respects QUIET mode)
export const log = (...args: any[]) => {
  if (!QUIET) console.log(...args);
};

// Debug log (NO-OP in dev by default, enabled only with DEBUG_LOGS)
// Also suppressed when QUIET_MODE is active
export const debug = (...args: any[]) => {
  if (QUIET) return; // Suppress in quiet mode
  if (isDebugEnabled()) {
    console.log(...args);
  }
};

// Info log (NO-OP in dev by default, enabled only with DEBUG_LOGS)
// Also suppressed when QUIET_MODE is active
export const info = (...args: any[]) => {
  if (QUIET) return; // Suppress in quiet mode
  if (isDebugEnabled()) {
    console.info(...args);
  }
};

// Warn (always prints, but respects QUIET mode)
export const warn = (...args: any[]) => {
  if (!QUIET) console.warn(...args);
};

// Error (ALWAYS prints, never muted)
export const error = (...args: any[]) => {
  console.error(...args);
};

