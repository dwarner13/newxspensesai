/**
 * useCustodianOnboarding Hook
 * 
 * State machine for Custodian onboarding flow with Supabase persistence.
 * Manages steps, answers, typing state, and advancement logic.
 * Auto-saves progress after each step and resumes from saved state.
 * StrictMode-safe: clears timeouts on unmount.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProfileContext } from '../contexts/ProfileContext';
import { useAuth } from '../contexts/AuthContext';
import { getSupabase } from '../lib/supabase';
import {
  getOnboardingState,
  saveOnboardingProgress,
  commitOnboardingPreferencesToSettings,
  type OnboardingStep,
  type ExperienceLevel,
  type OnboardingAnswers,
} from '../lib/onboardingHelpers';

export type CustodianStep = OnboardingStep;
export type { ExperienceLevel, OnboardingAnswers as CustodianAnswers };

interface UseCustodianOnboardingReturn {
  currentStep: CustodianStep;
  answers: OnboardingAnswers;
  isTyping: boolean;
  advance: () => void;
  setPreferredName: (name: string) => Promise<void>;
  setExperienceLevel: (level: ExperienceLevel) => Promise<void>;
  setPrimaryGoal: (goal: string) => Promise<void>;
  reset: () => void;
}

const STEP_ORDER: CustodianStep[] = ['name', 'level', 'goal', 'done'];

export function useCustodianOnboarding(onCompleteCallback?: () => void): UseCustodianOnboardingReturn {
  const { profile, refreshProfile } = useProfileContext();
  const { userId } = useAuth();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<CustodianStep>('name');
  const [answers, setAnswers] = useState<OnboardingAnswers>({});
  const [isTyping, setIsTyping] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  
  const typingTimeoutRef = useRef<number | null>(null);
  const mountKeyRef = useRef<string>(`${Date.now()}-${Math.random()}`);
  const savingRef = useRef<boolean>(false); // Guard against double-saves
  const inFlightRef = useRef<Set<string>>(new Set()); // Track in-flight saves by step

  // Load saved onboarding state on mount
  useEffect(() => {
    if (isInitialized || !profile) {
      return;
    }

    const savedState = getOnboardingState(profile);
    
    // If onboarding is already completed, call onComplete immediately
    if (savedState.completed) {
      if (onCompleteCallback) {
        onCompleteCallback();
      }
      setIsInitialized(true);
      return;
    }

    // Resume from saved state
    setCurrentStep(savedState.currentStep);
    setAnswers(savedState.answers || {});
    setIsInitialized(true);

    if (import.meta.env.DEV) {
      console.log('[useCustodianOnboarding] Resumed from saved state', {
        currentStep: savedState.currentStep,
        answersKeys: Object.keys(savedState.answers || {}),
        completed: savedState.completed,
      });
    }
  }, [profile, isInitialized, onCompleteCallback]);

  // Show typing indicator when step changes
  useEffect(() => {
    if (!isInitialized) {
      return; // Don't show typing until state is loaded
    }
    const currentMountKey = mountKeyRef.current;
    
    // Clear any existing timeout
    if (typingTimeoutRef.current !== null) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    setIsTyping(true);
    
    // Random typing duration between 600-900ms
    const typingDuration = 600 + Math.random() * 300;
    
    typingTimeoutRef.current = window.setTimeout(() => {
      // Only update if mount hasn't changed (StrictMode safety)
      if (mountKeyRef.current === currentMountKey) {
        setIsTyping(false);
      }
    }, typingDuration);

    return () => {
      if (typingTimeoutRef.current !== null) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
    };
  }, [currentStep]);

  // Auto-save helper with guard
  const autoSave = useCallback(async (
    step: CustodianStep,
    answerPatch: Partial<OnboardingAnswers>
  ) => {
    if (!userId || savingRef.current || inFlightRef.current.has(step)) {
      return;
    }

    savingRef.current = true;
    inFlightRef.current.add(step);

    try {
      const updatedAnswers = { ...answers, ...answerPatch };
      
      await saveOnboardingProgress(userId, {
        currentStep: step,
        answers: answerPatch,
      }, profile?.metadata as Record<string, any> | undefined);

      // Update local state after successful save
      setAnswers(updatedAnswers);
    } catch (error) {
      console.error('[useCustodianOnboarding] Auto-save failed:', error);
    } finally {
      savingRef.current = false;
      inFlightRef.current.delete(step);
    }
  }, [userId, answers, profile]);

  const advance = useCallback(() => {
    const currentIndex = STEP_ORDER.indexOf(currentStep);
    if (currentIndex < STEP_ORDER.length - 1) {
      setCurrentStep(STEP_ORDER[currentIndex + 1]);
    }
  }, [currentStep]);

  const setPreferredName = useCallback(async (name: string) => {
    if (!userId || !name.trim()) {
      return;
    }

    try {
      const supabase = getSupabase();
      if (!supabase) {
        console.error('[useCustodianOnboarding] Supabase not available');
        return;
      }

      // Extract first name (take first word only)
      const firstName = name.trim().split(' ')[0];

      // Save to database: display_name and onboarding_completed
      const { error } = await supabase
        .from('profiles')
        .update({
          display_name: firstName, // Save first name as display_name
          onboarding_completed: true, // Mark onboarding as complete
          onboarding_completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (error) {
        console.error('[useCustodianOnboarding] Failed to save name and complete onboarding:', error);
        throw error;
      }

      console.log('[useCustodianOnboarding] Saved name and completed onboarding:', {
        display_name: firstName,
        onboarding_completed: true,
      });

      // Update local state
      setAnswers(prev => ({ ...prev, preferredName: name }));

      // Refresh profile to get updated state
      await refreshProfile();

      // Navigate to dashboard
      navigate('/dashboard', { replace: true });

      // Call completion callback if provided
      if (onCompleteCallback) {
        setTimeout(() => {
          onCompleteCallback();
        }, 100);
      }
    } catch (error) {
      console.error('[useCustodianOnboarding] Error saving name:', error);
      // Still update local state even if save fails
      setAnswers(prev => ({ ...prev, preferredName: name }));
    }
  }, [userId, refreshProfile, navigate, onCompleteCallback]);

  const setExperienceLevel = useCallback(async (level: ExperienceLevel) => {
    setAnswers(prev => ({ ...prev, experienceLevel: level }));
    // Auto-save and advance to next step
    await autoSave('goal', { experienceLevel: level });
    advance();
  }, [autoSave, advance]);

  const setPrimaryGoal = useCallback(async (goal: string) => {
    setAnswers(prev => ({ ...prev, primaryGoal: goal }));
    
    if (!userId) {
      advance();
      return;
    }

    // Final step: commit preferences to settings, mark completed
    try {
      const finalAnswers = { ...answers, primaryGoal: goal };
      
      // Commit to profiles.settings
      await commitOnboardingPreferencesToSettings(userId, finalAnswers);
      
      // Mark onboarding as completed
      await saveOnboardingProgress(userId, {
        currentStep: 'done',
        answers: { primaryGoal: goal },
        completed: true,
        completedAt: new Date().toISOString(),
      }, profile?.metadata as Record<string, any> | undefined);

      // Refresh profile to get updated state
      await refreshProfile();

      // Advance to done
      advance();

      // Call completion callback
      if (onCompleteCallback) {
        setTimeout(() => {
          onCompleteCallback();
        }, 500);
      }
    } catch (error) {
      console.error('[useCustodianOnboarding] Failed to complete onboarding:', error);
      advance(); // Still advance even if save fails
    }
  }, [answers, userId, profile, refreshProfile, autoSave, advance, onCompleteCallback]);

  const reset = useCallback(() => {
    setCurrentStep('name');
    setAnswers({});
    setIsTyping(true);
    setIsInitialized(false);
    savingRef.current = false;
    inFlightRef.current.clear();
    // Generate new mount key for StrictMode remount
    mountKeyRef.current = `${Date.now()}-${Math.random()}`;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current !== null) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
    };
  }, []);

  return {
    currentStep,
    answers,
    isTyping,
    advance,
    setPreferredName,
    setExperienceLevel,
    setPrimaryGoal,
    reset,
  };
}

