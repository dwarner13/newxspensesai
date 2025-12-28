/**
 * Custodian Onboarding Scene Wrapper
 * 
 * Wraps CustodianOnboardingPanel to handle scene-based flow
 * and integrate with Prime narrator messages.
 */

import React, { useEffect } from 'react';
import { CustodianOnboardingPanel } from './CustodianOnboardingPanel';
import { useCustodianOnboarding } from '../../hooks/useCustodianOnboarding';

interface CustodianOnboardingSceneWrapperProps {
  scene: 'prime_intro' | 'custodian_name' | 'custodian_level' | 'custodian_goal' | 'handoff_complete';
  onNameDone?: () => void;
  onLevelDone?: () => void;
  onGoalDone?: () => void;
  onComplete: () => void;
  isMobile?: boolean;
}

export function CustodianOnboardingSceneWrapper({
  scene,
  onNameDone,
  onLevelDone,
  onGoalDone,
  onComplete,
  isMobile = false,
}: CustodianOnboardingSceneWrapperProps) {
  const {
    currentStep,
    setPreferredName,
    setExperienceLevel,
    setPrimaryGoal,
  } = useCustodianOnboarding();

  // Track previous step to detect transitions
  const prevStepRef = React.useRef<string>(currentStep);
  const callbacksCalledRef = React.useRef<Set<string>>(new Set());

  useEffect(() => {
    // Detect step transitions and call appropriate callbacks (only once per transition)
    if (prevStepRef.current !== currentStep) {
      const transitionKey = `${prevStepRef.current}->${currentStep}`;
      
      if (!callbacksCalledRef.current.has(transitionKey)) {
        if (prevStepRef.current === 'name' && currentStep === 'level') {
          callbacksCalledRef.current.add(transitionKey);
          onNameDone?.();
        } else if (prevStepRef.current === 'level' && currentStep === 'goal') {
          callbacksCalledRef.current.add(transitionKey);
          onLevelDone?.();
        } else if (prevStepRef.current === 'goal' && currentStep === 'done') {
          callbacksCalledRef.current.add(transitionKey);
          onGoalDone?.();
        }
      }
      prevStepRef.current = currentStep;
    }
  }, [currentStep, onNameDone, onLevelDone, onGoalDone]);

  // Override the completion handler to call our callback
  const handleComplete = () => {
    onComplete();
  };

  return (
    <CustodianOnboardingPanel
      onComplete={handleComplete}
      isMobile={isMobile}
    />
  );
}

