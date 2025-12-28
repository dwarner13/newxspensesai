/**
 * Profile Metadata Helpers
 * 
 * Helper functions to update profile metadata without overwriting existing data.
 * Uses merge strategy to preserve existing metadata fields.
 * 
 * CRITICAL: Metadata must ALWAYS be merged, never replaced.
 * All metadata updates MUST go through updateProfileMetadata() to prevent data loss.
 */

import { getSupabase } from './supabase';

/**
 * Update profile metadata by merging with existing metadata
 * 
 * CRITICAL: This function ALWAYS merges with existing metadata. Never replaces it.
 * 
 * @param userId - User ID
 * @param partialMetadata - Partial metadata object to merge
 * @param existingMetadata - Optional existing metadata to merge with (if already fetched)
 * @returns Promise<boolean> - true if successful, false otherwise
 */
export async function updateProfileMetadata(
  userId: string,
  partialMetadata: Record<string, any>,
  existingMetadata?: Record<string, any> | null
): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) {
    console.error('[updateProfileMetadata] Supabase not available');
    return false;
  }

  try {
    // Use provided existingMetadata or fetch it
    let currentMetadata: Record<string, any> = {};
    
    if (existingMetadata !== undefined) {
      // Use provided metadata (already fetched)
      currentMetadata = existingMetadata || {};
    } else {
      // Fetch existing profile to get current metadata
      const { data: existingProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('metadata')
        .eq('id', userId)
        .maybeSingle();

      if (fetchError && fetchError.code !== 'PGRST116') {
        // PGRST116 = no rows found (expected if profile missing)
        console.error('[updateProfileMetadata] Error fetching profile:', fetchError);
        return false;
      }

      // Extract existing metadata safely
      if (existingProfile?.metadata && typeof existingProfile.metadata === 'object') {
        currentMetadata = { ...existingProfile.metadata };
      }
    }

    // Merge existing metadata with new metadata (CRITICAL: preserve all existing keys)
    const mergedMetadata = {
      ...currentMetadata,
      ...partialMetadata,
    };

    // Regression guard: Warn in dev if we're overwriting keys that weren't in the patch
    if (import.meta.env.DEV) {
      const existingKeys = Object.keys(currentMetadata);
      const patchKeys = Object.keys(partialMetadata);
      const overwrittenKeys = existingKeys.filter(key => !patchKeys.includes(key) && currentMetadata[key] !== mergedMetadata[key]);
      
      if (overwrittenKeys.length > 0) {
        console.warn('[updateProfileMetadata] ⚠️ Warning: Existing metadata keys not in patch:', overwrittenKeys);
      }
      
      // Check if patch includes all existing keys (should not happen if merging correctly)
      const missingKeys = existingKeys.filter(key => !(key in mergedMetadata));
      if (missingKeys.length > 0) {
        console.error('[updateProfileMetadata] ❌ ERROR: Existing metadata keys missing after merge:', missingKeys);
        return false;
      }
    }

    // Update profile with merged metadata
    // CRITICAL: Use upsert with onConflict to ensure we're updating, not replacing the row
    // This preserves all other profile fields (display_name, currency, etc.)
    const { error: updateError } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        metadata: mergedMetadata,
      }, {
        onConflict: 'id'
      });

    if (updateError) {
      console.error('[updateProfileMetadata] Error updating profile:', updateError);
      return false;
    }

    if (import.meta.env.DEV) {
      console.log('[updateProfileMetadata] ✅ Metadata updated successfully', {
        userId,
        existingKeys: Object.keys(currentMetadata),
        patchKeys: Object.keys(partialMetadata),
        mergedKeys: Object.keys(mergedMetadata),
      });
    }

    return true;
  } catch (error: any) {
    console.error('[updateProfileMetadata] Unexpected error:', error);
    return false;
  }
}

/**
 * Mark Prime as initialized
 * 
 * @param userId - User ID
 * @returns Promise<boolean> - true if successful, false otherwise
 */
export async function markPrimeInitialized(userId: string): Promise<boolean> {
  return updateProfileMetadata(userId, {
    prime_initialized: true,
    prime_initialized_at: new Date().toISOString(),
  });
}

/**
 * Mark guardrails as acknowledged
 * 
 * @param userId - User ID
 * @returns Promise<boolean> - true if successful, false otherwise
 */
export async function markGuardrailsAcknowledged(userId: string): Promise<boolean> {
  return updateProfileMetadata(userId, {
    guardrails_acknowledged: true,
    guardrails_acknowledged_at: new Date().toISOString(),
  });
}

/**
 * Normalize phone number to E.164 format
 * 
 * Rules:
 * - Strip spaces, dashes, parentheses
 * - If 10 digits => prefix +1
 * - If starts with 1 and 11 digits => prefix +
 * - Store as phone_e164 in metadata
 * 
 * @param phoneInput - Raw phone input string
 * @returns Normalized E.164 format (e.g., "+15551234567") or null if invalid
 */
export function normalizePhoneToE164(phoneInput: string): string | null {
  if (!phoneInput || typeof phoneInput !== 'string') return null;
  
  // Strip all non-digit characters
  const digitsOnly = phoneInput.replace(/\D/g, '');
  
  if (digitsOnly.length === 0) return null;
  
  // If 10 digits, assume US/Canada and prefix +1
  if (digitsOnly.length === 10) {
    return `+1${digitsOnly}`;
  }
  
  // If 11 digits and starts with 1, prefix +
  if (digitsOnly.length === 11 && digitsOnly.startsWith('1')) {
    return `+${digitsOnly}`;
  }
  
  // If already starts with +, return as-is (assuming valid)
  if (phoneInput.trim().startsWith('+')) {
    const cleaned = phoneInput.replace(/\D/g, '');
    if (cleaned.length >= 10) {
      return `+${cleaned}`;
    }
  }
  
  // Invalid format
  return null;
}

/**
 * Save phone number to profile metadata (normalized to E.164)
 * 
 * @param userId - User ID
 * @param phoneInput - Raw phone input string
 * @param existingMetadata - Optional existing metadata to merge with
 * @returns Promise<boolean> - true if successful, false otherwise
 */
export async function savePhoneToMetadata(
  userId: string,
  phoneInput: string,
  existingMetadata?: Record<string, any> | null
): Promise<boolean> {
  const normalized = normalizePhoneToE164(phoneInput);
  if (!normalized) {
    console.warn('[savePhoneToMetadata] Invalid phone format:', phoneInput);
    return false;
  }
  
  return updateProfileMetadata(userId, {
    phone_e164: normalized,
  }, existingMetadata);
}

