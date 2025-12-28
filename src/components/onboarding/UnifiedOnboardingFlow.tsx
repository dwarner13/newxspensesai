/**
 * Unified Onboarding Flow
 * 
 * Detects first-time users (guest or authenticated) and triggers
 * Prime → Custodian onboarding modal.
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useProfileContext } from '../../contexts/ProfileContext';
import { useOnboardingUI } from '../../contexts/OnboardingUIContext';
import { isProfileComplete, getGuestProfileCompleted } from '../../lib/userIdentity';
import { PrimeCustodianOnboardingModal } from './PrimeCustodianOnboardingModal';
import { useUnifiedChatLauncher } from '../../hooks/useUnifiedChatLauncher';
import { isDemoMode } from '../../lib/demoAuth';
import { ONBOARDING_MODE } from '../../config/onboardingConfig';

export function UnifiedOnboardingFlow() {
  const { userId, isDemoUser, loading, initialLoad } = useAuth();
  const { profile } = useProfileContext();
  const { setIsOnboardingOpen } = useOnboardingUI();
  const [showModal, setShowModal] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);
  const { openChat, closeChat } = useUnifiedChatLauncher();
  
  // CRITICAL: Initialize window state IMMEDIATELY on mount (before any effects run)
  // This prevents race conditions where auto-open effects run before onboarding state is set
  // Run synchronously on mount, not in useEffect
  // IMPORTANT: Always initialize window state, even when onboarding is disabled
  if (typeof window !== 'undefined' && !(window as any).__onboardingState) {
    const onboardingCompleted = profile?.metadata && typeof profile.metadata === 'object' 
      ? (profile.metadata as any)?.onboarding?.completed === true
      : true; // When onboarding disabled or no metadata, assume complete (don't block chat)
    
    (window as any).__onboardingState = {
      isOpen: false, // Never open when disabled
      isComplete: onboardingCompleted,
    };
    (window as any).__profileData = profile;
  }
  
  // Update window state when profile changes (even when onboarding disabled)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const onboardingCompleted = !ONBOARDING_MODE.legacyEnabled || 
        (profile?.metadata && typeof profile.metadata === 'object' 
          ? (profile.metadata as any)?.onboarding?.completed === true
          : true);
      
      (window as any).__onboardingState = {
        isOpen: false, // Never open when disabled
        isComplete: onboardingCompleted,
      };
      (window as any).__profileData = profile;
    }
  }, [profile]);
  
  // Hard-block: Prevent onboarding modal from rendering if legacy onboarding is disabled
  // Window state initialization above ensures chat is never blocked when disabled
  if (!ONBOARDING_MODE.legacyEnabled) {
    return null;
  }
  
  // Update OnboardingUIContext when modal state changes
  useEffect(() => {
    setIsOnboardingOpen(showModal);
    
    // Update window state for non-React code (useUnifiedChatLauncher)
    const onboardingCompleted = profile?.metadata && typeof profile.metadata === 'object' 
      ? (profile.metadata as any)?.onboarding?.completed === true
      : false;
    
    (window as any).__onboardingState = {
      isOpen: showModal,
      isComplete: onboardingCompleted,
    };
    (window as any).__profileData = profile;
    
    // During initial load, if profile is null/undefined, set onboarding as active
    if (!profile && userId) {
      (window as any).__onboardingState = {
        isOpen: showModal,
        isComplete: false, // Assume incomplete until profile loads
      };
    }
  }, [showModal, setIsOnboardingOpen, profile, userId]);
  
  // Close any open chat when onboarding opens
  useEffect(() => {
    if (showModal) {
      closeChat();
    }
  }, [showModal, closeChat]);

  // Safety assertion: Ensure no legacy welcome UI is rendering
  useEffect(() => {
    if (showModal) {
      // Check for legacy components in DOM
      const legacyWelcomeElements = document.querySelectorAll('[data-legacy-welcome], [data-legacy-onboarding]');
      const legacyWelcomeRendered = legacyWelcomeElements.length > 0;
      
      console.assert(
        !legacyWelcomeRendered,
        '[ONBOARDING] Legacy welcome UI must never render. UnifiedOnboardingFlow is the ONLY authority.'
      );
      
      if (legacyWelcomeRendered) {
        console.error('[ONBOARDING] ⚠️ Legacy welcome UI detected!', {
          elements: Array.from(legacyWelcomeElements).map(el => ({
            tag: el.tagName,
            className: el.className,
            id: el.id,
          })),
        });
      }
    }
  }, [showModal]);

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

  // CANONICAL AUTHORITY: PrimeCustodianOnboardingModal is the ONLY onboarding UI
  // No other component should render onboarding UI while this is active
  return (
    <PrimeCustodianOnboardingModal
      isOpen={showModal}
      onComplete={handleComplete}
    />
  );
}








