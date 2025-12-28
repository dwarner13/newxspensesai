/**
 * User Display Name Resolution Helper
 * 
 * Single source of truth for resolving user's display name and first name.
 * Never returns email local-part as name.
 * Never returns template placeholders.
 * 
 * Priority:
 * 1. profiles.display_name
 * 2. profiles.first_name
 * 3. auth.user.user_metadata.full_name or name
 * 4. null (fallback to "there" in UI)
 */

import { getSupabase } from '../supabase';
import type { SupabaseClient } from '@supabase/supabase-js';

export interface ResolvedName {
  displayName: string | null;
  firstName: string | null;
}

/**
 * Extract first name from display name
 * Returns first token if displayName exists, else null
 */
function extractFirstName(displayName: string | null): string | null {
  if (!displayName || !displayName.trim()) return null;
  const tokens = displayName.trim().split(/\s+/);
  return tokens[0] || null;
}

/**
 * Resolve user's display name from database and auth
 * 
 * @param supabase - Supabase client (can be client-side or server-side)
 * @param userId - User ID
 * @returns ResolvedName with displayName and firstName
 */
export async function resolveDisplayName(
  supabase: SupabaseClient,
  userId: string
): Promise<ResolvedName> {
  try {
    // Get auth user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return { displayName: null, firstName: null };
    }

    // Query profiles table
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('display_name, first_name, full_name')
      .eq('id', userId)
      .maybeSingle();

    if (profileError && profileError.code !== 'PGRST116') {
      // PGRST116 = no rows found (expected if profile missing)
      console.warn('[resolveDisplayName] Error fetching profile:', profileError);
    }

    // Priority: display_name → first_name → full_name → user_metadata → null
    const displayName =
      profile?.display_name?.trim() ||
      profile?.first_name?.trim() ||
      profile?.full_name?.trim() ||
      user.user_metadata?.full_name?.trim() ||
      user.user_metadata?.name?.trim() ||
      null;

    // Never return email local-part as name
    // If displayName is null, return null (UI will use "there" fallback)
    
    const firstName = extractFirstName(displayName);

    return {
      displayName,
      firstName,
    };
  } catch (error) {
    console.error('[resolveDisplayName] Error resolving name:', error);
    return { displayName: null, firstName: null };
  }
}

/**
 * Resolve display name synchronously from existing profile/auth data
 * Use this when you already have profile and user objects
 * 
 * @param profile - Profile object (can be null)
 * @param user - Auth user object (can be null)
 * @returns ResolvedName with displayName and firstName
 */
export function resolveDisplayNameSync(
  profile: { display_name?: string | null; first_name?: string | null; full_name?: string | null } | null,
  user: { user_metadata?: { full_name?: string; name?: string } } | null
): ResolvedName {
  const displayName =
    profile?.display_name?.trim() ||
    profile?.first_name?.trim() ||
    profile?.full_name?.trim() ||
    user?.user_metadata?.full_name?.trim() ||
    user?.user_metadata?.name?.trim() ||
    null;

  const firstName = extractFirstName(displayName);

  return {
    displayName,
    firstName,
  };
}



