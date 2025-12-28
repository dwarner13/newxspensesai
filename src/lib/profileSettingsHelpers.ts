/**
 * Profile Settings Helpers
 * 
 * Helper functions to update profile settings (profiles.settings JSONB column) safely.
 * Uses merge strategy to preserve existing settings fields.
 * 
 * CRITICAL: Settings must ALWAYS be merged, never replaced.
 */

import { getSupabase } from './supabase';

/**
 * Update profile settings by merging with existing settings
 * 
 * CRITICAL: This function ALWAYS merges with existing settings. Never replaces it.
 * 
 * @param userId - User ID
 * @param partialSettings - Partial settings object to merge
 * @param existingSettings - Optional existing settings to merge with (if already fetched)
 * @returns Promise<boolean> - true if successful, false otherwise
 */
export async function updateProfileSettings(
  userId: string,
  partialSettings: Record<string, any>,
  existingSettings?: Record<string, any> | null
): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) {
    console.error('[updateProfileSettings] Supabase not available');
    return false;
  }

  try {
    // Use provided existingSettings or fetch it
    let currentSettings: Record<string, any> = {};
    
    if (existingSettings !== undefined) {
      // Use provided settings (already fetched)
      currentSettings = existingSettings || {};
    } else {
      // Fetch existing profile to get current settings
      const { data: existingProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('settings')
        .eq('id', userId)
        .maybeSingle();

      if (fetchError && fetchError.code !== 'PGRST116') {
        // PGRST116 = no rows found (expected if profile missing)
        console.error('[updateProfileSettings] Error fetching profile:', fetchError);
        return false;
      }

      // Extract existing settings safely
      if (existingProfile?.settings && typeof existingProfile.settings === 'object') {
        currentSettings = { ...existingProfile.settings };
      }
    }

    // Merge existing settings with new settings (CRITICAL: preserve all existing keys)
    const mergedSettings = {
      ...currentSettings,
      ...partialSettings,
    };

    // Update profile with merged settings
    // CRITICAL: Use upsert with onConflict to ensure we're updating, not replacing the row
    const { error: updateError } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        settings: mergedSettings,
      }, {
        onConflict: 'id'
      });

    if (updateError) {
      console.error('[updateProfileSettings] Error updating profile:', updateError);
      return false;
    }

    if (import.meta.env.DEV) {
      console.log('[updateProfileSettings] ✅ Settings updated successfully', {
        userId,
        existingKeys: Object.keys(currentSettings),
        patchKeys: Object.keys(partialSettings),
        mergedKeys: Object.keys(mergedSettings),
      });
    }

    return true;
  } catch (error: any) {
    console.error('[updateProfileSettings] Unexpected error:', error);
    return false;
  }
}

/**
 * Migrate settings from metadata.settings to profiles.settings
 * Non-destructive: only migrates if data exists in metadata.settings but not in settings
 * 
 * @param userId - User ID
 * @returns Promise<boolean> - true if migration occurred or not needed, false on error
 */
export async function migrateSettingsFromMetadata(userId: string): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) {
    return false;
  }

  try {
    // Fetch profile with both metadata and settings
    const { data: profile, error: fetchError } = await supabase
      .from('profiles')
      .select('metadata, settings')
      .eq('id', userId)
      .maybeSingle();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('[migrateSettingsFromMetadata] Error fetching profile:', fetchError);
      return false;
    }

    if (!profile) {
      return true; // No profile, nothing to migrate
    }

    const metadata = profile.metadata && typeof profile.metadata === 'object'
      ? profile.metadata as Record<string, any>
      : null;
    
    const metadataSettings = metadata?.settings && typeof metadata.settings === 'object'
      ? metadata.settings as Record<string, any>
      : null;

    const currentSettings = profile.settings && typeof profile.settings === 'object'
      ? profile.settings as Record<string, any>
      : {};

    // Check if migration is needed
    if (!metadataSettings || Object.keys(metadataSettings).length === 0) {
      return true; // No data to migrate
    }

    // Check if settings already exist (don't overwrite)
    const needsMigration = Object.keys(metadataSettings).some(key => !(key in currentSettings));

    if (!needsMigration) {
      return true; // Already migrated
    }

    // Merge metadata.settings into settings (don't overwrite existing)
    const migratedSettings = {
      ...metadataSettings,
      ...currentSettings, // Current settings take precedence
    };

    // Update settings
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        settings: migratedSettings,
      })
      .eq('id', userId);

    if (updateError) {
      console.error('[migrateSettingsFromMetadata] Error updating settings:', updateError);
      return false;
    }

    // Optionally remove metadata.settings (non-destructive - keep for now)
    // Users can clean this up later if needed

    if (import.meta.env.DEV) {
      console.log('[migrateSettingsFromMetadata] ✅ Migrated settings from metadata', {
        userId,
        migratedKeys: Object.keys(metadataSettings),
      });
    }

    return true;
  } catch (error: any) {
    console.error('[migrateSettingsFromMetadata] Unexpected error:', error);
    return false;
  }
}









