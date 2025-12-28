/**
 * User Context Helpers
 * 
 * Single source of truth for building user identity context from ProfileContext.
 * Used by all AI employees to consistently know and use user identity.
 */

import { useProfileContext } from '../contexts/ProfileContext';
import { useAuth } from '../contexts/AuthContext';

export interface UserContext {
  /** Preferred name (from display_name, fallback to first_name) */
  preferredName: string;
  
  /** Account scope/mode (personal/business/both/exploring) */
  scope: string;
  
  /** Primary financial goal */
  primaryGoal: string | null;
  
  /** Proactivity level (insights/alerts/proactive) */
  proactivityLevel: string | null;
  
  /** First name (fallback) */
  firstName: string | null;
  
  /** Display name (computed) */
  displayName: string;
  
  /** AI Fluency Level (Explorer, Builder, Operator, Strategist, Architect) */
  aiFluencyLevel?: string | null;
  
  /** AI Fluency Score (0-100) */
  aiFluencyScore?: number | null;
  
  /** Currency (for financial references) */
  currency?: string | null;
}

/**
 * Build user context from ProfileContext
 * Returns a stable object that can be used by AI employees
 * 
 * @returns UserContext object with user identity information
 */
export function buildUserContext(): UserContext {
  // This is a hook, so it must be called from a React component
  // For non-React contexts, use buildUserContextFromProfile() instead
  const { profile, displayName } = useProfileContext();
  const { firstName } = useAuth();
  
  // Preferred name: display_name → first_name → full_name
  const preferredName = profile?.display_name || profile?.first_name || profile?.full_name || firstName || displayName || 'there';
  
  // Account type (account_type column)
  const scope = profile?.account_type || 'exploring';
  
  // Primary goal from profiles.settings (not metadata.settings)
  const settings = profile?.settings && typeof profile.settings === 'object'
    ? profile.settings as Record<string, any>
    : null;
  const primaryGoal = settings?.primary_goal || null;
  
  // Proactivity level from profiles.settings
  const proactivityLevel = settings?.proactivity_level || null;
  
  return {
    preferredName,
    scope,
    primaryGoal,
    proactivityLevel,
    firstName: firstName || null,
    displayName: displayName || 'there',
  };
}

/**
 * Build user context from raw profile data (for non-React contexts)
 * 
 * @param profile - Profile object from ProfileContext
 * @param firstName - First name from AuthContext
 * @param displayName - Computed display name from ProfileContext
 * @returns UserContext object
 */
export function buildUserContextFromProfile(
  profile: any | null,
  firstName: string | null,
  displayName: string
): UserContext {
  // Preferred name: display_name → first_name → full_name
  const preferredName = profile?.display_name || profile?.first_name || profile?.full_name || firstName || displayName || 'there';
  
  // Account type (account_type column)
  const scope = profile?.account_type || 'exploring';
  
  // Primary goal from metadata.settings
  const metadata = profile?.metadata && typeof profile.metadata === 'object'
    ? profile.metadata as Record<string, any>
    : null;
  const settings = metadata?.settings && typeof metadata.settings === 'object'
    ? metadata.settings as Record<string, any>
    : null;
  const primaryGoal = settings?.primary_goal || null;
  
  // Proactivity level from metadata.settings
  const proactivityLevel = settings?.proactivity_level || null;
  
  // AI Fluency Level (for adaptive communication)
  const aiFluencyLevel = profile?.ai_fluency_level || 'Explorer';
  const aiFluencyScore = profile?.ai_fluency_score || 20;
  
  // Currency
  const currency = profile?.currency || null;
  
  return {
    preferredName,
    scope,
    primaryGoal,
    proactivityLevel,
    firstName: firstName || null,
    displayName: displayName || 'there',
    aiFluencyLevel,
    aiFluencyScore,
    currency,
  };
}

/**
 * Format user context as a string for injection into system prompts
 * 
 * @param context - UserContext object
 * @returns Formatted string for system prompt
 */
export function formatUserContextForPrompt(context: UserContext): string {
  const parts: string[] = [];
  
  parts.push(`**User Identity:**`);
  parts.push(`- Preferred name: ${context.preferredName}`);
  
  if (context.scope && context.scope !== 'exploring') {
    parts.push(`- Account scope: ${context.scope}`);
  }
  
  if (context.primaryGoal) {
    parts.push(`- Primary financial goal: ${context.primaryGoal}`);
  }
  
  if (context.proactivityLevel) {
    parts.push(`- Proactivity preference: ${context.proactivityLevel}`);
  }
  
  // Debug log (dev only)
  if (import.meta.env.DEV) {
    console.log('[buildUserContext] Using preferred name:', context.preferredName, {
      source: 'userContext',
      fullContext: context,
    });
  }
  
  return parts.join('\n');
}

