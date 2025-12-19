/**
 * First-Time User Flow
 * 
 * Detects first-time users and orchestrates:
 * 1. Prime welcome modal
 * 2. Custodian conversational setup
 * 3. Handoff back to Prime
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { isProfileComplete } from '../../lib/userIdentity';
import { PrimeWelcomeModal } from './PrimeWelcomeModal';
import { useControlCenterDrawer } from '../settings/ControlCenterDrawer';
import { useUnifiedChatLauncher } from '../../hooks/useUnifiedChatLauncher';

export function FirstTimeUserFlow() {
  const { userId, isDemoUser, loading, initialLoad } = useAuth();
  const [showPrimeModal, setShowPrimeModal] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);
  const { openDrawer } = useControlCenterDrawer();
  const { openChat } = useUnifiedChatLauncher();

  useEffect(() => {
    const checkFirstTime = async () => {
      if (loading || initialLoad || !userId || hasChecked) {
        return;
      }

      // Skip for demo users (they bypass onboarding)
      if (isDemoUser) {
        setHasChecked(true);
        return;
      }

      try {
        const complete = await isProfileComplete();
        if (!complete) {
          // First-time user - show Prime modal
          setShowPrimeModal(true);
        }
        setHasChecked(true);
      } catch (error) {
        console.error('[FirstTimeUserFlow] Error checking profile:', error);
        setHasChecked(true);
      }
    };

    checkFirstTime();
  }, [userId, loading, initialLoad, isDemoUser, hasChecked]);

  const handleContinue = () => {
    setShowPrimeModal(false);
    // Open Control Center drawer with Profile tab (Custodian setup)
    setTimeout(() => {
      openDrawer('profile');
    }, 300);
  };

  const handleSetupComplete = async () => {
    // After setup completes, show Prime handoff message
    // Get display name from profile
    let displayName = 'there';
    try {
      const { getUserIdentity } = await import('../../lib/userIdentity');
      const identity = await getUserIdentity();
      displayName = identity.displayName || 'there';
    } catch (e) {
      console.error('[FirstTimeUserFlow] Failed to get display name:', e);
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

    window.addEventListener('profileSetupComplete', handleProfileComplete);
    return () => {
      window.removeEventListener('profileSetupComplete', handleProfileComplete);
    };
  }, []);

  if (!hasChecked || loading || initialLoad) {
    return null;
  }

  return (
    <>
      <PrimeWelcomeModal
        isOpen={showPrimeModal}
        onContinue={handleContinue}
      />
    </>
  );
}

