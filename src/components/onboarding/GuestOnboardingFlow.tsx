/**
 * Guest Onboarding Flow
 * 
 * Detects first-time guest users and orchestrates:
 * 1. Prime welcome modal
 * 2. Custodian conversational setup (saved to localStorage)
 * 3. Handoff back to Prime
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getGuestProfileCompleted, setGuestProfileCompleted } from '../../lib/userIdentity';
import { PrimeCustodianOnboardingModal } from './PrimeCustodianOnboardingModal';
import { useControlCenterDrawer } from '../settings/ControlCenterDrawer';
import { useUnifiedChatLauncher } from '../../hooks/useUnifiedChatLauncher';
import { isDemoMode } from '../../lib/demoAuth';
import { ONBOARDING_MODE } from '../../config/onboardingConfig';

export function GuestOnboardingFlow() {
  // Hard-block: Prevent mounting if legacy onboarding is disabled
  if (!ONBOARDING_MODE.legacyEnabled) {
    return null;
  }
  const { isDemoUser, loading, initialLoad } = useAuth();
  const [showPrimeModal, setShowPrimeModal] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);
  const { openDrawer } = useControlCenterDrawer();
  const { openChat } = useUnifiedChatLauncher();

  useEffect(() => {
    const checkGuestOnboarding = async () => {
      if (loading || initialLoad || hasChecked) {
        return;
      }

      // Only run for guest users in demo mode
      if (!isDemoMode() || !isDemoUser) {
        setHasChecked(true);
        return;
      }

      try {
        const completed = getGuestProfileCompleted();
        if (!completed) {
          // First-time guest user - show Prime modal
          setShowPrimeModal(true);
        }
        setHasChecked(true);
      } catch (error) {
        console.error('[GuestOnboardingFlow] Error checking guest profile:', error);
        setHasChecked(true);
      }
    };

    checkGuestOnboarding();
  }, [loading, initialLoad, isDemoUser, hasChecked]);

  const handleContinue = () => {
    setShowPrimeModal(false);
    // Open Control Center drawer with Profile tab (Custodian setup)
    setTimeout(() => {
      openDrawer('profile');
    }, 300);
  };

  const handleSetupComplete = async () => {
    // Mark guest profile as completed
    setGuestProfileCompleted(true);
    
    // After setup completes, show Prime handoff message
    // Get display name from guest profile
    let displayName = 'there';
    try {
      const { getGuestProfile } = await import('../../lib/userIdentity');
      const profile = getGuestProfile();
      displayName = profile?.displayName || 'there';
    } catch (e) {
      console.error('[GuestOnboardingFlow] Failed to get display name:', e);
    }
    
    setTimeout(() => {
      openChat({
        initialEmployeeSlug: 'prime-boss',
        initialQuestion: `All set, ${displayName}! I'm ready whenever you are.`,
      });
    }, 500);
  };

  // Listen for profile completion event
  useEffect(() => {
    const handleProfileComplete = () => {
      handleSetupComplete();
    };

    window.addEventListener('guestProfileSetupComplete', handleProfileComplete);
    return () => {
      window.removeEventListener('guestProfileSetupComplete', handleProfileComplete);
    };
  }, []);

  if (!hasChecked || loading || initialLoad) {
    return null;
  }

  return (
    <>
      <PrimeCustodianOnboardingModal
        isOpen={showPrimeModal}
        onComplete={handleSetupComplete}
      />
    </>
  );
}








