/**
 * OnboardingUIContext
 * 
 * Single source of truth for onboarding UI state (modal open/closed).
 * Used to coordinate between onboarding modal and other UI components.
 */

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface OnboardingUIContextType {
  /** Whether the onboarding modal is currently open */
  isOnboardingOpen: boolean;
  /** Set onboarding modal open state */
  setIsOnboardingOpen: (open: boolean) => void;
}

const OnboardingUIContext = createContext<OnboardingUIContextType | undefined>(undefined);

export function OnboardingUIProvider({ children }: { children: ReactNode }) {
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);

  return (
    <OnboardingUIContext.Provider value={{ isOnboardingOpen, setIsOnboardingOpen }}>
      {children}
    </OnboardingUIContext.Provider>
  );
}

export function useOnboardingUI(): OnboardingUIContextType {
  const context = useContext(OnboardingUIContext);
  if (context === undefined) {
    throw new Error('useOnboardingUI must be used within OnboardingUIProvider');
  }
  return context;
}

/**
 * Helper hook to check if onboarding is active (incomplete OR modal open)
 * This is the single source of truth for blocking other UI during onboarding
 */
export function useOnboardingActive() {
  // Import ProfileContext dynamically to avoid circular dependencies
  let profile: any = null;
  let onboardingCompleted = false;
  
  try {
    const { useProfileContext } = require('./ProfileContext');
    const profileContext = useProfileContext();
    profile = profileContext.profile;
    
    // Check if onboarding is completed from profile metadata
    onboardingCompleted = profile?.metadata && typeof profile.metadata === 'object'
      ? (profile.metadata as any)?.onboarding?.completed === true
      : false;
  } catch (e) {
    // ProfileContext not available, assume incomplete
    onboardingCompleted = false;
  }
  
  const { isOnboardingOpen } = useOnboardingUI();
  
  // Onboarding is active if: modal is open OR onboarding is incomplete
  const onboardingActive = isOnboardingOpen || !onboardingCompleted;
  
  return {
    onboardingActive,
    onboardingCompleted,
    isOnboardingOpen,
  };
}

