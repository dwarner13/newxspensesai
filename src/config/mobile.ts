/**
 * Mobile Configuration
 * Centralized configuration for mobile detection and behavior
 */

export const MOBILE_CONFIG = {
  // Mobile breakpoint - matches Tailwind md breakpoint
  MOBILE_MAX: 768,
  
  // Routes that should NOT show mobile view (opt-in for mobile)
  excludedRoutes: [
    '/dashboard/three-column-demo',
    '/dashboard/therapist-demo',
    '/dashboard/analytics',
    '/dashboard/settings',
    '/dashboard/reports'
  ],
  
  // Debug flags
  DEBUG_ENABLED: import.meta.env.VITE_MOBILE_DEBUG === 'true',
  FORCE_ENABLED: false, // Force mobile for testing - DISABLED
} as const;

export type MobileConfig = typeof MOBILE_CONFIG;

