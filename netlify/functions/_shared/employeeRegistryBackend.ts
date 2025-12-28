/**
 * Employee Registry Backend Helper
 * 
 * Backend-only helper for resolving employee slugs to employee_key.
 * Does NOT import frontend types to avoid coupling.
 * 
 * Usage:
 *   import { getEmployeeKeyFromSlug } from './employeeRegistryBackend';
 *   const employeeKey = await getEmployeeKeyFromSlug('prime-boss'); // Returns 'prime'
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { admin } from './supabase.js';

/**
 * Get employee_key from slug using registry
 * Falls back to extracting from slug if registry unavailable
 */
export async function getEmployeeKeyFromSlug(
  sb: SupabaseClient,
  slug: string
): Promise<string> {
  if (!slug) {
    return 'prime'; // Default
  }
  
  try {
    // Try to load from employee_profiles table
    const { data: profile, error } = await sb
      .from('employee_profiles')
      .select('employee_key, slug')
      .eq('slug', slug)
      .eq('is_enabled', true)
      .maybeSingle();
    
    // Also try is_active for backward compatibility
    if (!profile && !error) {
      const { data: profileActive } = await sb
        .from('employee_profiles')
        .select('employee_key, slug')
        .eq('slug', slug)
        .eq('is_active', true)
        .maybeSingle();
      
      if (profileActive?.employee_key) {
        return profileActive.employee_key;
      }
    }
    
    if (profile?.employee_key) {
      return profile.employee_key;
    }
    
    // Try alias resolution via database function
    try {
      const { data: resolvedSlug, error: resolveError } = await sb
        .rpc('resolve_employee_slug', { input_slug: slug });
      
      if (!resolveError && resolvedSlug && resolvedSlug !== slug) {
        // Recursively resolve canonical slug
        return await getEmployeeKeyFromSlug(sb, resolvedSlug);
      }
    } catch (rpcError) {
      // RPC function may not exist - continue to fallback
    }
  } catch (error) {
    console.warn('[employeeRegistryBackend] Failed to load employee_key from DB:', error);
  }
  
  // Fallback: extract employee_key from slug (first part before hyphen)
  return slug.split('-')[0] || 'prime';
}

/**
 * Get employee_key from slug (convenience wrapper using admin client)
 */
export async function getEmployeeKeyFromSlugAdmin(slug: string): Promise<string> {
  const sb = admin();
  return getEmployeeKeyFromSlug(sb, slug);
}


