/**
 * ProfileContext
 * 
 * Single source of truth for user profile data from Supabase public.profiles table.
 * Provides loading, error states, and refreshProfile() function.
 * Handles guest/demo mode and profile hydration (auto-creates missing profiles).
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from './AuthContext';
import { getSupabase } from '../lib/supabase';
import { getGuestProfile } from '../lib/userIdentity';

export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  display_name: string | null;
  first_name: string | null;
  avatar_url: string | null;
  plan: string | null;
  plan_id: string | null;
  role: string | null;
  level: number | null;
  account_type: string | null;
  settings: Record<string, any> | null; // profiles.settings JSONB column
  metadata: Record<string, any> | null; // profiles.metadata JSONB column
  [key: string]: any; // Allow other profile fields
}

export interface UserIdentity {
  /** Preferred name (display_name → first_name → full_name) */
  preferredName: string;
  
  /** Account type (personal/business/both/exploring) */
  accountType: string;
  
  /** Primary financial goal */
  primaryGoal: string | null;
  
  /** Proactivity level (insights/alerts/proactive) */
  proactivityLevel: string | null;
  
  /** Whether onboarding is completed */
  onboardingCompleted: boolean;
  
  /** Unified preferences (from settings or onboarding.answers) */
  preferences: {
    preferredName: string | null;
    experienceLevel: string | null;
    primaryGoal: string | null;
  };
}

export interface ProfileContextType {
  /** Raw profile object from database (null if guest/missing) */
  profile: Profile | null;
  
  /** Loading state */
  loading: boolean;
  
  /** Error state */
  error: Error | null;
  
  /** Refresh profile from database */
  refreshProfile: () => Promise<void>;
  
  /** Computed display name (display_name → first_name → full_name) */
  displayName: string;
  
  /** Normalized user identity object */
  userIdentity: UserIdentity;
  
  /** Plan label (from plan_id or plan, default "free") */
  planLabel: string;
  
  /** Avatar URL */
  avatarUrl: string | null;
  
  /** Whether user is in guest/demo mode */
  isGuest: boolean;
  
  /** Unified preferences accessor (from settings or onboarding.answers) */
  preferences: {
    preferredName: string | null;
    experienceLevel: string | null;
    primaryGoal: string | null;
  };
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

/**
 * Profile hydration guard: Creates profile if missing
 */
async function hydrateProfile(userId: string, userEmail: string): Promise<Profile | null> {
  const supabase = getSupabase();
  if (!supabase) {
    if (import.meta.env.DEV) {
      console.warn('[ProfileContext] ⚠️ Supabase not available, cannot hydrate profile');
    }
    return null;
  }

  try {
    // Try to fetch existing profile
    const { data: existingProfile, error: fetchError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (existingProfile) {
      if (import.meta.env.DEV) {
        console.log('[ProfileContext] ✅ Profile found', { userId, display_name: existingProfile.display_name });
      }
      return existingProfile as Profile;
    }

    // Profile missing - create it
    if (import.meta.env.DEV) {
      console.log('[ProfileContext] ⚠️ Profile missing, creating...', { userId, email: userEmail });
    }

    // Don't derive display name from email - use empty string (will be set during onboarding)
    const displayName = '';
    
    const { data: newProfile, error: insertError } = await supabase
      .from('profiles')
      .insert({
        id: userId,
        email: userEmail,
        display_name: displayName, // Empty - will be set during onboarding
        first_name: null,
        last_name: null,
        full_name: null,
        role: 'free',
        plan: 'free',
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      if (import.meta.env.DEV) {
        console.error('[ProfileContext] ❌ Failed to create profile:', insertError);
      }
      throw insertError;
    }

    if (import.meta.env.DEV) {
      console.log('[ProfileContext] ✅ Profile created', { userId, display_name: newProfile.display_name });
    }

    return newProfile as Profile;
  } catch (error: any) {
    if (import.meta.env.DEV) {
      console.error('[ProfileContext] ❌ Profile hydration failed:', error);
    }
    return null;
  }
}

/**
 * Compute display name from profile
 * Name resolution order: display_name → first_name → full_name
 */
function computeDisplayName(profile: Profile | null, userEmail: string | null, isGuest: boolean): string {
  if (isGuest) {
    const guestProfile = getGuestProfile();
    return guestProfile?.displayName || 'Guest';
  }

  if (!profile) {
    return userEmail?.split('@')[0] || 'User';
  }

  // Name resolution order: display_name → first_name → full_name
  return (
    profile.display_name ||
    profile.first_name ||
    profile.full_name ||
    userEmail?.split('@')[0] ||
    'User'
  );
}

/**
 * Compute plan label from profile
 */
function computePlanLabel(profile: Profile | null, isGuest: boolean): string {
  if (isGuest) {
    return 'Guest';
  }

  if (!profile) {
    return 'Free';
  }

  const planId = profile.plan_id || profile.plan || profile.role || 'free';
  
  // Normalize plan labels
  if (planId === 'premium') return 'Premium';
  if (planId === 'starter') return 'Starter';
  if (planId === 'pro') return 'Pro';
  if (planId === 'enterprise') return 'Enterprise';
  return 'Free';
}

/**
 * Compute normalized user identity from profile
 */
function computeUserIdentity(profile: Profile | null, displayName: string, isGuest: boolean): UserIdentity {
  if (isGuest || !profile) {
    return {
      preferredName: displayName,
      accountType: 'exploring',
      primaryGoal: null,
      proactivityLevel: null,
      onboardingCompleted: false,
      preferences: {
        preferredName: null,
        experienceLevel: null,
        primaryGoal: null,
      },
    };
  }

  // Extract metadata safely (for onboarding completion check)
  const profileMetadata = profile.metadata && typeof profile.metadata === 'object'
    ? profile.metadata as Record<string, any>
    : null;

  // Preferred name: display_name → first_name → full_name
  const preferredName = profile.display_name || profile.first_name || profile.full_name || displayName;

  // Account type (account_type column)
  const accountType = profile.account_type || 'exploring';

  // Primary goal and proactivity level from profile.settings (NOT metadata.settings)
  const profileSettings = profile.settings && typeof profile.settings === 'object'
    ? profile.settings as Record<string, any>
    : null;
  const primaryGoal = profileSettings?.primary_goal || null;
  const proactivityLevel = profileSettings?.proactivity_level || null;

  // Onboarding completion from metadata.onboarding.completed
  const onboardingCompleted = profileMetadata?.onboarding?.completed === true;

  // Unified preferences accessor (reads from settings first, falls back to onboarding.answers)
  const onboardingAnswers = profileMetadata?.onboarding?.answers && typeof profileMetadata.onboarding.answers === 'object'
    ? profileMetadata.onboarding.answers as Record<string, any>
    : null;
  
  // Prefer settings (durable) over onboarding answers (in-progress)
  const preferredNameFromSettings = profileSettings?.preferred_name || onboardingAnswers?.preferredName;
  const experienceLevelFromSettings = profileSettings?.experience_level || onboardingAnswers?.experienceLevel;

  // Unified preferences (settings first, then onboarding.answers fallback)
  const preferences = {
    preferredName: preferredNameFromSettings || preferredName || null,
    experienceLevel: experienceLevelFromSettings || null,
    primaryGoal: primaryGoal || null,
  };

  return {
    preferredName,
    accountType,
    primaryGoal,
    proactivityLevel,
    onboardingCompleted,
    preferences,
  };
}

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const { user, userId, isDemoUser } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const userEmail = user?.email || null;
  const isGuest = isDemoUser || !userId;

  // Fetch profile from database
  const fetchProfile = useCallback(async () => {
    if (isGuest) {
      // Guest mode - no profile fetch needed
      setProfile(null);
      setLoading(false);
      setError(null);
      return;
    }

    if (!userId || !userEmail) {
      setProfile(null);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    if (import.meta.env.DEV) {
      console.log('[ProfileContext] 📊 Fetching profile', { userId, email: userEmail });
    }

    try {
      const supabase = getSupabase();
      if (!supabase) {
        throw new Error('Supabase not available');
      }

      const { data: profileData, error: fetchError } = await supabase
        .from('profiles')
        .select('*, settings')
        .eq('id', userId)
        .maybeSingle();

      if (fetchError && fetchError.code !== 'PGRST116') {
        // PGRST116 = no rows found (expected if profile missing)
        throw fetchError;
      }

      if (profileData) {
        if (import.meta.env.DEV) {
          console.log('[ProfileContext] ✅ Profile loaded', {
            id: profileData.id,
            display_name: profileData.display_name,
            plan: profileData.plan || profileData.plan_id,
          });
        }
        setProfile(profileData as Profile);
        setLoading(false);
      } else {
        // Profile missing - hydrate it
        if (import.meta.env.DEV) {
          console.log('[ProfileContext] ⚠️ Profile missing, hydrating...', { userId });
        }
        const hydratedProfile = await hydrateProfile(userId, userEmail);
        setProfile(hydratedProfile);
        setLoading(false);
      }
    } catch (err: any) {
      if (import.meta.env.DEV) {
        console.error('[ProfileContext] ❌ Profile fetch failed:', err);
      }
      setError(err);
      setLoading(false);
      // Try hydration as fallback
      try {
        const hydratedProfile = await hydrateProfile(userId, userEmail);
        setProfile(hydratedProfile);
        setError(null);
      } catch (hydrationError) {
        // Hydration also failed - keep error state
      }
    }
  }, [userId, userEmail, isGuest]);

  // Refresh profile (public API)
  const refreshProfile = useCallback(async () => {
    await fetchProfile();
  }, [fetchProfile]);

  // Fetch profile when user changes (NOT on route changes)
  // Use userId/userEmail directly in dependency array to avoid unnecessary re-fetches
  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log('[ProfileContext] 🔄 Effect triggered', { userId, userEmail, isGuest });
    }
    fetchProfile();
  }, [userId, userEmail, isGuest]); // Direct dependencies, not fetchProfile callback

  // Computed values
  const displayName = useMemo(
    () => computeDisplayName(profile, userEmail, isGuest),
    [profile, userEmail, isGuest]
  );

  const planLabel = useMemo(
    () => computePlanLabel(profile, isGuest),
    [profile, isGuest]
  );

  const avatarUrl = useMemo(
    () => (isGuest ? null : profile?.avatar_url || null),
    [profile, isGuest]
  );

  const userIdentity = useMemo(
    () => computeUserIdentity(profile, displayName, isGuest),
    [profile, displayName, isGuest]
  );

  // Extract preferences from userIdentity
  const preferences = useMemo(() => {
    return userIdentity.preferences || {
      preferredName: null,
      experienceLevel: null,
      primaryGoal: null,
    };
  }, [userIdentity]);

  const value: ProfileContextType = {
    profile,
    loading,
    error,
    refreshProfile,
    displayName,
    planLabel,
    avatarUrl,
    isGuest,
    userIdentity,
    preferences,
  };

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

/**
 * Hook to access profile context
 */
export function useProfileContext(): ProfileContextType {
  const context = useContext(ProfileContext);
  if (context === undefined) {
    throw new Error('useProfileContext must be used within ProfileProvider');
  }
  return context;
}






