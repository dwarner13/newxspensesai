/**
 * Security Self-Check (Dev Only)
 * 
 * Lightweight dev tool to verify:
 * - Current user ID
 * - Session token exists
 * - Profiles select returns exactly 1 row for current user
 * 
 * DO NOT expose secrets or sensitive data.
 */

import { getSupabase } from './supabase';

export interface SecurityCheckResult {
  userId: string | null;
  hasSessionToken: boolean;
  profileSelectWorks: boolean;
  profileRowCount: number;
  errors: string[];
  timestamp: string;
}

/**
 * Run security self-check (dev only)
 */
export async function runSecuritySelfCheck(userId: string | null): Promise<SecurityCheckResult> {
  const result: SecurityCheckResult = {
    userId: userId || null,
    hasSessionToken: false,
    profileSelectWorks: false,
    profileRowCount: 0,
    errors: [],
    timestamp: new Date().toISOString(),
  };

  // Only run in dev mode
  if (import.meta.env.PROD) {
    result.errors.push('Security self-check disabled in production');
    return result;
  }

  try {
    const supabase = getSupabase();
    if (!supabase) {
      result.errors.push('Supabase client not available');
      return result;
    }

    // Check session token
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      result.errors.push(`Session error: ${sessionError.message}`);
    } else if (session?.access_token) {
      result.hasSessionToken = true;
    } else {
      result.errors.push('No session token found');
    }

    // Check profile select (only if userId exists)
    if (userId) {
      try {
        const { data: profiles, error: profileError, count } = await supabase
          .from('profiles')
          .select('id', { count: 'exact', head: false })
          .eq('id', userId);

        if (profileError) {
          result.errors.push(`Profile select error: ${profileError.message}`);
        } else {
          result.profileSelectWorks = true;
          result.profileRowCount = count || (profiles ? profiles.length : 0);
          
          if (result.profileRowCount !== 1) {
            result.errors.push(`Expected 1 profile row, found ${result.profileRowCount}`);
          }
        }
      } catch (error: any) {
        result.errors.push(`Profile select exception: ${error.message}`);
      }
    } else {
      result.errors.push('No userId provided - skipping profile check');
    }
  } catch (error: any) {
    result.errors.push(`Unexpected error: ${error.message}`);
  }

  return result;
}

/**
 * Log security check results to console (dev only)
 */
export function logSecurityCheck(result: SecurityCheckResult): void {
  if (import.meta.env.PROD) {
    return;
  }

  console.group('[Security Self-Check]');
  console.log('User ID:', result.userId || 'null');
  console.log('Has Session Token:', result.hasSessionToken ? '✅' : '❌');
  console.log('Profile Select Works:', result.profileSelectWorks ? '✅' : '❌');
  console.log('Profile Row Count:', result.profileRowCount);
  
  if (result.errors.length > 0) {
    console.warn('Errors:', result.errors);
  } else {
    console.log('✅ All checks passed');
  }
  
  console.log('Timestamp:', result.timestamp);
  console.groupEnd();
}









