/**
 * Profile Helpers
 * 
 * Centralized profile loading and creation logic.
 * Used by AuthContext to ensure consistent profile handling.
 */

import { getSupabase } from './supabase';

export interface Profile {
  id: string;
  display_name: string | null;
  full_name: string | null;
  first_name: string | null;
  email: string | null;
  avatar_url: string | null;
  role: string | null;
  plan: string | null;
  plan_id: string | null;
  level: number | null;
  profile_completed: boolean | null;
  onboarding_completed: boolean | null;
  onboarding_completed_at: string | null;
  account_mode: string | null;
  metadata: Record<string, any> | null;
  [key: string]: any; // Allow other profile fields
}

/**
 * getOrCreateProfile(userId, userEmail)
 * 
 * Fetches profile from Supabase, creates if missing.
 * Returns profile object or null on error.
 * 
 * Behavior:
 * 1. Select * from profiles where id=userId
 * 2. If missing: insert minimal row (id, email, display_name, timestamps) then re-select
 * 3. Return typed profile result
 */
export async function getOrCreateProfile(
  userId: string,
  userEmail: string
): Promise<Profile | null> {
  const supabase = getSupabase();
  if (!supabase) {
    if (import.meta.env.DEV) {
      console.warn('[profileHelpers] ⚠️ Supabase not available, cannot load profile');
    }
    return null;
  }

  try {
    // Try to fetch existing profile
    const { data: existingProfile, error: selectError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (selectError && selectError.code !== 'PGRST116') {
      // PGRST116 = no rows found (expected if profile missing)
      // Other errors are real problems
      if (import.meta.env.DEV) {
        console.error('[profileHelpers] ❌ Error fetching profile:', selectError);
      }
      return null;
    }

    if (existingProfile) {
      // Profile exists, return it
      if (import.meta.env.DEV) {
        console.log('[profileHelpers] ✅ Profile loaded', {
          id: existingProfile.id,
          display_name: existingProfile.display_name,
          profile_completed: existingProfile.profile_completed,
        });
      }
      return existingProfile as Profile;
    }

    // Profile missing - create it
    if (import.meta.env.DEV) {
      console.log('[profileHelpers] ⚠️ Profile missing, creating new profile', { userId, email: userEmail });
    }

    // Compute display name from user metadata or email
    const displayName = userEmail.split('@')[0] || 'User';

    const { data: newProfile, error: insertError } = await supabase
      .from('profiles')
      .insert({
        id: userId,
        email: userEmail,
        display_name: displayName,
        role: 'free',
        plan: 'free',
        profile_completed: false,
      })
      .select()
      .single();

    if (insertError) {
      if (import.meta.env.DEV) {
        console.error('[profileHelpers] ❌ Failed to create profile:', insertError);
      }
      return null;
    }

    if (import.meta.env.DEV) {
      console.log('[profileHelpers] ✅ Profile created successfully', {
        id: newProfile.id,
        display_name: newProfile.display_name,
      });
    }

    return newProfile as Profile;
  } catch (error: any) {
    if (import.meta.env.DEV) {
      console.error('[profileHelpers] ❌ Unexpected error:', error);
    }
    return null;
  }
}



