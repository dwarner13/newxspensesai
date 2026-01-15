/**
 * DEV Quiet Mode Utility
 * 
 * Controls background polling and console noise during testing/debugging.
 * 
 * When VITE_QUIET_MODE=1:
 * - Activity feed polling stops
 * - Byte queue stats polling stops
 * - Console info/debug logs are suppressed (errors always print)
 * 
 * Re-enable: Remove VITE_QUIET_MODE from .env.local or set to false
 */

const QUIET_MODE_RAW = import.meta.env.VITE_QUIET_MODE;

export const QUIET_MODE = QUIET_MODE_RAW === 'true' || 
                          QUIET_MODE_RAW === '1' || 
                          QUIET_MODE_RAW === 'yes' || 
                          QUIET_MODE_RAW === 'on';


