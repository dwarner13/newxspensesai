/**
 * User Identity Resolver
 * 
 * Provides unified user identity resolution for both authenticated and guest users.
 * Guest mode uses localStorage; authenticated mode uses Supabase profiles table.
 */

import { getSupabase } from './supabase';
import { isDemoMode, isGuestSession, getGuestSession, DEMO_USER_ID, DEMO_USER_EMAIL, DEMO_USER_NAME } from './demoAuth';

export interface UserIdentity {
  userId: string;
  email: string;
  displayName: string;
  plan: string;
  isGuest: boolean;
}

export interface GuestProfile {
  displayName?: string;
  timezone?: string;
  goals?: string[];
  businessType?: string;
  preferences?: {
    currency?: string;
    primaryMode?: 'personal' | 'business' | 'both' | 'exploring';
    guidanceStyle?: 'explain_everything' | 'show_results_only' | 'mix';
  };
  consentConfirmed?: boolean;
}

const GUEST_PROFILE_KEY = 'xai_profile_guest';
const GUEST_PREFS_KEY = 'xai_prefs_guest';
const GUEST_PROFILE_COMPLETED_KEY = 'guest_profile_completed';

/**
 * Get user identity (authenticated or guest)
 */
export async function getUserIdentity(): Promise<UserIdentity> {
  // Check if guest mode
  if (isDemoMode() && isGuestSession()) {
    const guestSession = getGuestSession();
    const guestProfile = getGuestProfile();
    
    return {
      userId: guestSession?.demo_user_id || DEMO_USER_ID,
      email: guestSession?.demo_user_email || DEMO_USER_EMAIL,
      displayName: guestProfile?.displayName || guestSession?.demo_user_name || DEMO_USER_NAME,
      plan: 'Guest Mode',
      isGuest: true,
    };
  }
  
  // Authenticated user - get from Supabase
  try {
    const supabase = getSupabase();
    if (!supabase) {
      // No Supabase available - fallback to guest if demo mode
      if (isDemoMode()) {
        return {
          userId: DEMO_USER_ID,
          email: DEMO_USER_EMAIL,
          displayName: DEMO_USER_NAME,
          plan: 'Guest Mode',
          isGuest: true,
        };
      }
      throw new Error('Supabase not configured');
    }
    
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
      throw new Error('No authenticated user');
    }
    
    // Try to load profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name, role, plan')
      .eq('id', user.id)
      .maybeSingle();
    
    return {
      userId: user.id,
      email: user.email || '',
      displayName: profile?.display_name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
      plan: profile?.plan || profile?.role || 'Free',
      isGuest: false,
    };
  } catch (error) {
    console.error('[userIdentity] Failed to get user identity:', error);
    // Fallback to guest if demo mode
    if (isDemoMode()) {
      return {
        userId: DEMO_USER_ID,
        email: DEMO_USER_EMAIL,
        displayName: DEMO_USER_NAME,
        plan: 'Guest Mode',
        isGuest: true,
      };
    }
    throw error;
  }
}

/**
 * Get guest profile from localStorage
 */
export function getGuestProfile(): GuestProfile | null {
  if (!isDemoMode()) {
    return null;
  }
  
  try {
    const stored = localStorage.getItem(GUEST_PROFILE_KEY);
    if (!stored) {
      return null;
    }
    return JSON.parse(stored) as GuestProfile;
  } catch (error) {
    console.error('[userIdentity] Failed to get guest profile:', error);
    return null;
  }
}

/**
 * Save guest profile to localStorage
 */
export function saveGuestProfile(profile: GuestProfile): void {
  if (!isDemoMode()) {
    console.warn('[userIdentity] Cannot save guest profile - not in demo mode');
    return;
  }
  
  try {
    localStorage.setItem(GUEST_PROFILE_KEY, JSON.stringify(profile));
    console.log('[userIdentity] Guest profile saved:', profile);
  } catch (error) {
    console.error('[userIdentity] Failed to save guest profile:', error);
  }
}

/**
 * Get guest preferences from localStorage
 */
export function getGuestPreferences(): Record<string, any> {
  if (!isDemoMode()) {
    return {};
  }
  
  try {
    const stored = localStorage.getItem(GUEST_PREFS_KEY);
    if (!stored) {
      return {};
    }
    return JSON.parse(stored);
  } catch (error) {
    console.error('[userIdentity] Failed to get guest preferences:', error);
    return {};
  }
}

/**
 * Save guest preferences to localStorage
 */
export function saveGuestPreferences(prefs: Record<string, any>): void {
  if (!isDemoMode()) {
    console.warn('[userIdentity] Cannot save guest preferences - not in demo mode');
    return;
  }
  
  try {
    localStorage.setItem(GUEST_PREFS_KEY, JSON.stringify(prefs));
    console.log('[userIdentity] Guest preferences saved:', prefs);
  } catch (error) {
    console.error('[userIdentity] Failed to save guest preferences:', error);
  }
}

/**
 * Check if profile is complete
 */
export async function isProfileComplete(): Promise<boolean> {
  const identity = await getUserIdentity();
  
  if (identity.isGuest) {
    // Check guest_profile_completed flag first
    const completed = localStorage.getItem(GUEST_PROFILE_COMPLETED_KEY);
    if (completed === 'true') {
      return true;
    }
    // Fallback: check if profile has required fields
    const profile = getGuestProfile();
    return !!profile?.displayName;
  }
  
  // Authenticated user - check Supabase
  try {
    const supabase = getSupabase();
    if (!supabase) {
      return false;
    }
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('metadata')
      .eq('id', identity.userId)
      .maybeSingle();
    
    const metadata = profile?.metadata && typeof profile.metadata === 'object'
      ? profile.metadata as Record<string, any>
      : null;
    
    return metadata?.onboarding?.completed === true;
  } catch (error) {
    console.error('[userIdentity] Failed to check profile completion:', error);
    return false;
  }
}

/**
 * Set guest profile completion flag
 */
export function setGuestProfileCompleted(completed: boolean = true): void {
  try {
    localStorage.setItem(GUEST_PROFILE_COMPLETED_KEY, completed ? 'true' : 'false');
  } catch (error) {
    console.error('[userIdentity] Failed to set guest profile completed:', error);
  }
}

/**
 * Get guest profile completion flag
 */
export function getGuestProfileCompleted(): boolean {
  try {
    const completed = localStorage.getItem(GUEST_PROFILE_COMPLETED_KEY);
    return completed === 'true';
  } catch (error) {
    console.error('[userIdentity] Failed to get guest profile completed:', error);
    return false;
  }
}

