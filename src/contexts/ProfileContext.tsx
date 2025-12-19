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
  [key: string]: any; // Allow other profile fields
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
  
  /** Computed display name (prefer full_name, else first_name, else email prefix, else "Guest") */
  displayName: string;
  
  /** Plan label (from plan_id or plan, default "free") */
  planLabel: string;
  
  /** Avatar URL */
  avatarUrl: string | null;
  
  /** Whether user is in guest/demo mode */
  isGuest: boolean;
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

    const displayName = userEmail.split('@')[0] || 'User';
    
    const { data: newProfile, error: insertError } = await supabase
      .from('profiles')
      .insert({
        id: userId,
        email: userEmail,
        display_name: displayName,
        role: 'free',
        plan: 'free',
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
 */
function computeDisplayName(profile: Profile | null, userEmail: string | null, isGuest: boolean): string {
  if (isGuest) {
    const guestProfile = getGuestProfile();
    return guestProfile?.displayName || 'Guest';
  }

  if (!profile) {
    return userEmail?.split('@')[0] || 'User';
  }

  return (
    profile.full_name ||
    profile.first_name ||
    profile.display_name ||
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
        .select('*')
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

  // Fetch profile when user changes
  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

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

  const value: ProfileContextType = {
    profile,
    loading,
    error,
    refreshProfile,
    displayName,
    planLabel,
    avatarUrl,
    isGuest,
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



