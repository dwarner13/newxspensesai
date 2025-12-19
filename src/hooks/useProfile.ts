/**
 * Unified Profile Hook
 * 
 * Single source of truth for user profile data across the entire app.
 * Uses ProfileContext (which loads from public.profiles table).
 * 
 * Fallback rules:
 * - No profile row → show email prefix / "Free" / level 1
 * - Guest mode → show "Guest" + local storage message
 */

import { useMemo } from 'react';
import { useProfileContext } from '../contexts/ProfileContext';
import { useAuth } from '../contexts/AuthContext';
import { getGuestProfile } from '../lib/userIdentity';

export interface ProfileData {
  /** User's full name (from profile.full_name or profile.display_name) */
  fullName: string;
  
  /** User's display name (for avatar initials) */
  displayName: string;
  
  /** Avatar initials (e.g., "DW" for "Darrell Warner") */
  avatarInitials: string;
  
  /** Avatar URL (if available) */
  avatarUrl: string | null;
  
  /** Plan name (e.g., "Premium", "Free", "Starter") */
  plan: string;
  
  /** Plan display name (e.g., "Premium Member", "Free Plan") */
  planDisplay: string;
  
  /** User level (gamification) */
  level: number;
  
  /** Level title (e.g., "Money Master", "Novice") */
  levelTitle: string;
  
  /** Whether user is in guest mode */
  isGuest: boolean;
  
  /** Email address */
  email: string | null;
}

/**
 * Get level title from level number
 */
function getLevelTitle(level: number): string {
  if (level >= 10) return 'Money Master';
  if (level >= 7) return 'Financial Expert';
  if (level >= 5) return 'Smart Saver';
  if (level >= 3) return 'Budget Builder';
  return 'Novice';
}

/**
 * Get avatar initials from name
 */
function getAvatarInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  if (parts.length === 1 && parts[0].length >= 2) {
    return parts[0].substring(0, 2).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase() || 'U';
}

/**
 * Unified profile hook - single source of truth
 * Uses ProfileContext for profile data
 */
export function useProfile(): ProfileData {
  const { profile, displayName: contextDisplayName, planLabel, avatarUrl: contextAvatarUrl, isGuest } = useProfileContext();
  const { user } = useAuth();
  
  return useMemo(() => {
    // Guest mode
    if (isGuest) {
      const guestProfile = getGuestProfile();
      const guestName = guestProfile?.displayName || 'Guest';
      
      return {
        fullName: guestName,
        firstName: guestName.split(' ')[0] || 'Guest',
        displayName: guestName,
        avatarInitials: getAvatarInitials(guestName),
        avatarUrl: null,
        plan: 'Guest',
        planDisplay: 'Guest Mode',
        level: 1,
        levelTitle: 'Novice',
        isGuest: true,
        email: null,
        rawProfile: null,
      };
    }
    
    // Authenticated user - use profile data with fallbacks
    const profileFullName = profile?.full_name || profile?.display_name || profile?.account_name;
    const userEmail = user?.email || profile?.email || null;
    const emailPrefix = userEmail?.split('@')[0] || 'User';
    
    const fullName = profileFullName || user?.user_metadata?.full_name || user?.user_metadata?.name || contextDisplayName || emailPrefix;
    const displayName = contextDisplayName || profile?.display_name || profileFullName || fullName;
    const firstName = fullName.split(' ')[0] || emailPrefix || 'there';
    const avatarInitials = getAvatarInitials(fullName);
    const avatarUrl = contextAvatarUrl || profile?.avatar_url || null;
    
    // Plan: use planLabel from context
    const plan = planLabel === 'Premium' ? 'Premium' : planLabel === 'Starter' ? 'Starter' : planLabel === 'Pro' ? 'Pro' : planLabel === 'Enterprise' ? 'Enterprise' : planLabel === 'Guest' ? 'Guest' : 'Free';
    const planDisplay = plan === 'Premium' ? 'Premium Member' : plan === 'Free' ? 'Free Plan' : plan === 'Guest' ? 'Guest Mode' : `${plan} Plan`;
    
    // Level: prefer profile.level, fallback to 1
    const level = profile?.level || 1;
    const levelTitle = getLevelTitle(level);
    
    return {
      fullName,
      firstName,
      displayName,
      avatarInitials,
      avatarUrl,
      plan,
      planDisplay,
      level,
      levelTitle,
      isGuest: false,
      email: userEmail,
      rawProfile: profile,
    };
  }, [profile, contextDisplayName, planLabel, contextAvatarUrl, isGuest, user]);
}

