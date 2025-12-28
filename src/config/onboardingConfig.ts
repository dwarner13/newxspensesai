/**
 * Onboarding Feature Flags
 * 
 * Central configuration for onboarding flows.
 * Set flags to false to freeze/hide onboarding without deleting code.
 */

export const ONBOARDING_MODE = {
  /**
   * Legacy onboarding flow (Prime + Custodian cinematic onboarding)
   * When false: All legacy onboarding components are frozen and hidden
   */
  legacyEnabled: false,
  
  /**
   * Cinematic onboarding flow (newer implementation)
   * When false: Cinematic onboarding components are frozen and hidden
   */
  cinematicEnabled: false,
} as const;








