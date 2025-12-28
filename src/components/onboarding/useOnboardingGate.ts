/**
 * Onboarding Gate Hook
 * 
 * Determines which onboarding flow to show:
 * - First-time setup: blocking overlay if onboarding not completed or required fields missing
 * - Welcome back: non-blocking card if onboarding completed and user has name
 */

import { useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';

export interface OnboardingGateResult {
  /** Show first-time setup overlay (blocking) */
  showFirstTimeSetup: boolean;
  /** Show welcome back card (non-blocking) */
  showWelcomeBack: boolean;
  /** Missing required fields for first-time setup */
  missingFields: string[];
}

export function useOnboardingGate(): OnboardingGateResult {
  const { profile, ready } = useAuth();

  return useMemo(() => {
    // Not ready yet - don't show anything
    if (!ready || !profile) {
      return {
        showFirstTimeSetup: false,
        showWelcomeBack: false,
        missingFields: [],
      };
    }

    // SINGLE SOURCE OF TRUTH: Check onboarding_status first, fallback to onboarding_completed
    // Prefer onboarding_status='completed' over onboarding_completed boolean
    const onboardingStatus = (profile as any).onboarding_status;
    const onboardingCompleted = onboardingStatus === 'completed' || profile.onboarding_completed === true;
    
    if (import.meta.env.DEV) {
      console.log('[useOnboardingGate] Onboarding status check:', {
        onboarding_status: onboardingStatus,
        onboarding_completed: profile.onboarding_completed,
        isCompleted: onboardingCompleted,
      });
    }
    
    // Check required fields (for missingFields array only, not for gate logic)
    const hasName = !!(profile.display_name?.trim());
    const hasCurrency = !!(profile.currency?.trim());
    const hasAccountType = !!(profile.account_type?.trim());
    
    // Check country in metadata
    const metadata = profile.metadata && typeof profile.metadata === 'object' 
      ? profile.metadata as Record<string, any>
      : null;
    const hasCountry = !!(metadata?.country?.trim());

    const missingFields: string[] = [];
    if (!hasName) missingFields.push('preferred_name');
    if (!hasCurrency) missingFields.push('currency');
    if (!hasAccountType) missingFields.push('account_type');
    if (!hasCountry) missingFields.push('country');

    // SINGLE SOURCE OF TRUTH: Only check onboarding_completed
    // If onboarding_completed === true, never show overlay (even if fields missing)
    // If onboarding_completed !== true, show overlay
    const showFirstTimeSetup = !onboardingCompleted;

    // Welcome back: show if onboarding completed AND has name
    const showWelcomeBack = onboardingCompleted && hasName && !showFirstTimeSetup;

    return {
      showFirstTimeSetup,
      showWelcomeBack,
      missingFields,
    };
  }, [ready, profile]);
}

