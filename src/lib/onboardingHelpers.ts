/**
 * Onboarding Helpers
 * 
 * Centralized helpers for Custodian onboarding persistence and state management.
 * Provides safe merge updates to metadata.onboarding and profiles.settings.
 */

import { getSupabase } from './supabase';
import { updateProfileMetadata } from './profileMetadataHelpers';
import { updateProfileSettings } from './profileSettingsHelpers';
import type { Profile } from '../contexts/ProfileContext';

export type OnboardingStep = 'name' | 'level' | 'goal' | 'done';
export type ExperienceLevel = 'novice' | 'intermediate' | 'advanced';

export interface OnboardingAnswers {
  preferredName?: string;
  experienceLevel?: ExperienceLevel;
  primaryGoal?: string;
}

export interface OnboardingState {
  completed: boolean;
  currentStep: OnboardingStep;
  answers: OnboardingAnswers;
  version: number;
  startedAt: string | null;
  completedAt: string | null;
}

/**
 * Get onboarding state from profile
 * 
 * Reads profile.metadata?.onboarding and provides defaults if missing.
 * If onboarding is missing entirely, initializes default state.
 */
export function getOnboardingState(profile: Profile | null): OnboardingState {
  if (!profile) {
    return {
      completed: false,
      currentStep: 'name',
      answers: {},
      version: 1,
      startedAt: null,
      completedAt: null,
    };
  }

  const metadata = profile.metadata && typeof profile.metadata === 'object'
    ? profile.metadata as Record<string, any>
    : null;

  const onboarding = metadata?.onboarding && typeof metadata.onboarding === 'object'
    ? metadata.onboarding as Record<string, any>
    : null;

  // If onboarding exists, return it with defaults for missing fields
  if (onboarding) {
    return {
      completed: onboarding.completed === true,
      currentStep: (onboarding.currentStep || 'name') as OnboardingStep,
      answers: {
        preferredName: onboarding.answers?.preferredName,
        experienceLevel: onboarding.answers?.experienceLevel,
        primaryGoal: onboarding.answers?.primaryGoal,
      },
      version: onboarding.version || 1,
      startedAt: onboarding.startedAt || null,
      completedAt: onboarding.completedAt || null,
    };
  }

  // No onboarding data - return defaults
  return {
    completed: false,
    currentStep: 'name',
    answers: {},
    version: 1,
    startedAt: null,
    completedAt: null,
  };
}

/**
 * Save a single onboarding answer incrementally
 * 
 * Convenience wrapper around saveOnboardingProgress for single answers.
 * 
 * @param userId - User ID
 * @param stepId - Step identifier ('name', 'level', 'goal')
 * @param answer - Answer value
 */
export async function saveOnboardingAnswer(
  userId: string,
  stepId: 'name' | 'level' | 'goal',
  answer: string
): Promise<boolean> {
  const answerMap: Partial<OnboardingAnswers> = {};
  
  if (stepId === 'name') {
    answerMap.preferredName = answer;
  } else if (stepId === 'level') {
    answerMap.experienceLevel = answer as ExperienceLevel;
  } else if (stepId === 'goal') {
    answerMap.primaryGoal = answer;
  }
  
  return saveOnboardingProgress(userId, { answers: answerMap });
}

/**
 * Load onboarding state from profile
 * 
 * @param userId - User ID
 * @returns OnboardingState or null if error
 */
export async function loadOnboardingState(userId: string): Promise<OnboardingState | null> {
  const supabase = getSupabase();
  if (!supabase) {
    console.error('[loadOnboardingState] Supabase not available');
    return null;
  }
  
  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('metadata')
      .eq('id', userId)
      .maybeSingle();
    
    if (error) {
      console.error('[loadOnboardingState] Error loading profile:', error);
      return null;
    }
    
    if (!profile?.metadata || typeof profile.metadata !== 'object') {
      return {
        completed: false,
        currentStep: 'name',
        answers: {},
        version: 1,
        startedAt: null,
        completedAt: null,
      };
    }
    
    const metadata = profile.metadata as Record<string, any>;
    const onboarding = metadata.onboarding && typeof metadata.onboarding === 'object'
      ? metadata.onboarding as Record<string, any>
      : null;
    
    if (!onboarding) {
      return {
        completed: false,
        currentStep: 'name',
        answers: {},
        version: 1,
        startedAt: null,
        completedAt: null,
      };
    }
    
    return {
      completed: onboarding.completed === true,
      currentStep: (onboarding.currentStep || 'name') as OnboardingStep,
      answers: {
        preferredName: onboarding.answers?.preferredName,
        experienceLevel: onboarding.answers?.experienceLevel,
        primaryGoal: onboarding.answers?.primaryGoal,
      },
      version: onboarding.version || 1,
      startedAt: onboarding.startedAt || null,
      completedAt: onboarding.completedAt || null,
    };
  } catch (error: any) {
    console.error('[loadOnboardingState] Unexpected error:', error);
    return null;
  }
}

/**
 * Save onboarding progress incrementally
 * 
 * Safely merges updates to profile.metadata.onboarding.
 * Deep merges answers object (does not overwrite existing answers).
 * 
 * @param userId - User ID
 * @param patch - Partial onboarding state to update
 * @param existingMetadata - Optional existing metadata (if already fetched)
 */
export async function saveOnboardingProgress(
  userId: string,
  patch: Partial<{
    currentStep: OnboardingStep;
    answers: Partial<OnboardingAnswers>;
    completed: boolean;
    startedAt: string;
    completedAt: string;
  }>,
  existingMetadata?: Record<string, any> | null
): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) {
    console.error('[saveOnboardingProgress] Supabase not available');
    return false;
  }

  try {
    // Get existing metadata
    let currentMetadata: Record<string, any> = {};
    
    if (existingMetadata !== undefined) {
      currentMetadata = existingMetadata || {};
    } else {
      const { data: existingProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('metadata')
        .eq('id', userId)
        .maybeSingle();

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('[saveOnboardingProgress] Error fetching profile:', fetchError);
        return false;
      }

      if (existingProfile?.metadata && typeof existingProfile.metadata === 'object') {
        currentMetadata = { ...existingProfile.metadata };
      }
    }

    // Get existing onboarding state
    const existingOnboarding = currentMetadata.onboarding && typeof currentMetadata.onboarding === 'object'
      ? { ...currentMetadata.onboarding }
      : {};

    // Deep merge answers if provided
    let mergedAnswers = { ...existingOnboarding.answers };
    if (patch.answers) {
      mergedAnswers = {
        ...mergedAnswers,
        ...patch.answers,
      };
    }

    // Build updated onboarding object
    const updatedOnboarding: Record<string, any> = {
      ...existingOnboarding,
      version: 1, // Always ensure version is 1
      ...(patch.currentStep !== undefined && { currentStep: patch.currentStep }),
      ...(patch.completed !== undefined && { completed: patch.completed }),
      ...(patch.startedAt !== undefined && { startedAt: patch.startedAt }),
      ...(patch.completedAt !== undefined && { completedAt: patch.completedAt }),
      answers: mergedAnswers,
    };

    // Set startedAt if not present and we're starting
    if (!updatedOnboarding.startedAt && patch.currentStep && patch.currentStep !== 'done') {
      updatedOnboarding.startedAt = new Date().toISOString();
    }

    // Merge into metadata
    const updatedMetadata = {
      ...currentMetadata,
      onboarding: updatedOnboarding,
    };

    // Use safe merge helper
    const success = await updateProfileMetadata(userId, updatedMetadata, currentMetadata);

    if (import.meta.env.DEV && success) {
      console.log('[saveOnboardingProgress] ✅ Progress saved', {
        userId,
        currentStep: updatedOnboarding.currentStep,
        completed: updatedOnboarding.completed,
        answersKeys: Object.keys(mergedAnswers),
      });
    }

    return success;
  } catch (error: any) {
    console.error('[saveOnboardingProgress] Unexpected error:', error);
    return false;
  }
}

/**
 * Commit onboarding preferences to profiles.settings
 * 
 * Writes durable user preferences to profiles.settings (not metadata.settings).
 * Uses safe merge to preserve existing settings.
 * 
 * @param userId - User ID
 * @param answers - Onboarding answers to commit
 */
export async function commitOnboardingPreferencesToSettings(
  userId: string,
  answers: OnboardingAnswers
): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) {
    console.error('[commitOnboardingPreferencesToSettings] Supabase not available');
    return false;
  }

  try {
    // Build settings patch
    const settingsPatch: Record<string, any> = {};
    
    if (answers.preferredName) {
      settingsPatch.preferred_name = answers.preferredName;
    }
    
    if (answers.experienceLevel) {
      settingsPatch.experience_level = answers.experienceLevel;
    }
    
    if (answers.primaryGoal) {
      settingsPatch.primary_goal = answers.primaryGoal;
    }

    // Use safe merge helper for settings
    const success = await updateProfileSettings(userId, settingsPatch);

    if (import.meta.env.DEV && success) {
      console.log('[commitOnboardingPreferencesToSettings] ✅ Preferences committed', {
        userId,
        settingsKeys: Object.keys(settingsPatch),
      });
    }

    return success;
  } catch (error: any) {
    console.error('[commitOnboardingPreferencesToSettings] Unexpected error:', error);
    return false;
  }
}

/**
 * Get user preferences from profile (unified accessor)
 * 
 * Reads from profiles.settings first, falls back to metadata.onboarding.answers.
 * Provides a single accessor for Prime/Settings/AI employees.
 * 
 * @param profile - Profile object
 */
export function getUserPreferences(profile: Profile | null): {
  preferredName: string | null;
  experienceLevel: ExperienceLevel | null;
  primaryGoal: string | null;
} {
  if (!profile) {
    return {
      preferredName: null,
      experienceLevel: null,
      primaryGoal: null,
    };
  }

  // Read from profiles.settings first (durable preferences)
  const settings = profile.settings && typeof profile.settings === 'object'
    ? profile.settings as Record<string, any>
    : null;

  // Fallback to metadata.onboarding.answers (in-progress onboarding)
  const metadata = profile.metadata && typeof profile.metadata === 'object'
    ? profile.metadata as Record<string, any>
    : null;
  const onboardingAnswers = metadata?.onboarding?.answers && typeof metadata.onboarding.answers === 'object'
    ? metadata.onboarding.answers as OnboardingAnswers
    : null;

  return {
    preferredName: settings?.preferred_name || onboardingAnswers?.preferredName || null,
    experienceLevel: (settings?.experience_level || onboardingAnswers?.experienceLevel) as ExperienceLevel | null,
    primaryGoal: settings?.primary_goal || onboardingAnswers?.primaryGoal || null,
  };
}

