/**
 * Unified Onboarding Flow
 * 
 * Detects first-time users (guest or authenticated) and triggers
 * Prime → Custodian onboarding modal.
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { isProfileComplete, getGuestProfileCompleted } from '../../lib/userIdentity';
import { PrimeCustodianOnboardingModal } from './PrimeCustodianOnboardingModal';
import { useUnifiedChatLauncher } from '../../hooks/useUnifiedChatLauncher';
import { isDemoMode } from '../../lib/demoAuth';

export function UnifiedOnboardingFlow() {
  const { userId, isDemoUser, loading, initialLoad } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);
  const { openChat } = useUnifiedChatLauncher();

  useEffect(() => {
    const checkOnboarding = async () => {
      if (loading || initialLoad || hasChecked) {
        return;
      }

      try {
        let shouldShow = false;

        if (isDemoUser && isDemoMode()) {
          // Guest user - check localStorage flag
          const completed = getGuestProfileCompleted();
          shouldShow = !completed;
        } else if (userId) {
          // Authenticated user - check Supabase profile
          const complete = await isProfileComplete();
          shouldShow = !complete;
        }

        if (shouldShow) {
          setShowModal(true);
        }
        setHasChecked(true);
      } catch (error) {
        console.error('[UnifiedOnboardingFlow] Error checking onboarding:', error);
        setHasChecked(true);
      }
    };

    checkOnboarding();
  }, [userId, loading, initialLoad, isDemoUser, hasChecked]);

  const handleComplete = async () => {
    setShowModal(false);
    
    // Get display name for Prime handoff
    let displayName = 'there';
    try {
      const { getUserIdentity, getGuestProfile } = await import('../../lib/userIdentity');
      if (isDemoUser) {
        const profile = getGuestProfile();
        displayName = profile?.displayName || 'there';
      } else {
        const identity = await getUserIdentity();
        displayName = identity.displayName || 'there';
      }
    } catch (e) {
      console.error('[UnifiedOnboardingFlow] Failed to get display name:', e);
    }

    // Handoff to Prime
    setTimeout(() => {
      openChat({
        initialEmployeeSlug: 'prime-boss',
        initialQuestion: `All set, ${displayName}! I'm ready whenever you are.`,
      });
    }, 500);
  };

  if (!hasChecked || loading || initialLoad) {
    return null;
  }

  return (
    <PrimeCustodianOnboardingModal
      isOpen={showModal}
      onComplete={handleComplete}
    />
  );
}




