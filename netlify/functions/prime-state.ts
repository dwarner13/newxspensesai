/**
 * Prime State Endpoint
 * 
 * Returns Prime's canonical state (read-only) for UI consumption.
 * Phase M0: Parallel implementation, no behavior changes.
 */

// ====== PRIME STATE / LIVE STATS ======

import type { Handler } from '@netlify/functions';
import { admin } from './_shared/supabase.js';
import { verifyAuth } from './_shared/verifyAuth.js';
import { buildFinancialSnapshot } from './_shared/financial-snapshot.js';
import { log, warn } from './_shared/log.js';
// Type imports (TypeScript types, no runtime import needed)
// Using inline type definitions to avoid ES module path issues
type PrimeState = import('../../src/types/prime-state').PrimeState;
type UserProfileSummary = import('../../src/types/prime-state').UserProfileSummary;
type MemorySummary = import('../../src/types/prime-state').MemorySummary;
type UserStage = import('../../src/types/prime-state').UserStage;
type SuggestedNextAction = import('../../src/types/prime-state').SuggestedNextAction;
type FeatureVisibilityMap = import('../../src/types/prime-state').FeatureVisibilityMap;
type PrimeWarning = import('../../src/types/prime-state').PrimeWarning;
type WorkspaceSummary = import('../../src/types/prime-state').WorkspaceSummary;

/**
 * Get user profile summary
 */
async function getUserProfileSummary(
  supabase: any,
  userId: string
): Promise<UserProfileSummary | null> {
  try {
    // Run profile query and auth lookup in parallel
    const [profileResult, authResult] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, display_name, role, onboarding_completed, onboarding_status, currency, time_zone')
        .eq('id', userId)
        .maybeSingle(),
      supabase.auth.admin.getUserById(userId).catch(() => ({ data: { user: null } })),
    ]);

    const { data: profile, error } = profileResult;

    if (error && error.code !== 'PGRST116') {
      warn('[prime-state] Error fetching profile:', error);
      return null;
    }

    if (!profile) {
      return null;
    }

    const email: string | null = (authResult as any)?.data?.user?.email || null;

    return {
      userId: profile.id,
      displayName: profile.display_name || null,
      email,
      role: (profile.role as 'free' | 'premium' | 'admin') || 'free',
      currency: profile.currency || null,
      timezone: profile.time_zone || null,
      onboardingCompleted: profile.onboarding_completed === true,
      onboardingStatus: profile.onboarding_status || null,
      lastLoginAt: null, // Column doesn't exist in profiles table - set to null
      accountCreatedAt: new Date().toISOString(), // Use current time as fallback (account_created_at column doesn't exist)
    };
  } catch (error: any) {
    console.error('[prime-state] Error in getUserProfileSummary:', error);
    return null;
  }
}

/**
 * Build memory summary
 */
async function buildMemorySummary(
  supabase: any,
  userId: string
): Promise<MemorySummary> {
  try {
    // Run all three queries in parallel
    const [factsResult, sessionsResult, tasksResult] = await Promise.all([
      supabase
        .from('user_memory_facts')
        .select('fact, confidence')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50),
      supabase
        .from('chat_sessions')
        .select('id, employee_slug, updated_at')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
        .limit(5),
      supabase
        .from('user_tasks')
        .select('id, priority')
        .eq('user_id', userId)
        .eq('completed', false)
        .limit(10)
        .then((r: any) => r)
        .catch(() => ({ data: null })),
    ]);

    const facts = factsResult.data || [];
    const highConfidenceFacts = facts
      .filter((f: any) => Number(f.confidence || 0) > 0.85)
      .map((f: any) => {
        const factStr = f.fact || '';
        const colonIndex = factStr.indexOf(':');
        if (colonIndex > 0) {
          return {
            key: factStr.substring(0, colonIndex).trim(),
            value: factStr.substring(colonIndex + 1).trim(),
            confidence: Number(f.confidence || 0),
          };
        }
        return { key: 'fact', value: factStr, confidence: Number(f.confidence || 0) };
      });

    const recentConversations = (sessionsResult.data || []).map((s: any) => ({
      sessionId: s.id,
      employeeSlug: s.employee_slug || 'prime-boss',
      lastMessageAt: s.updated_at || s.created_at || new Date().toISOString(),
      summary: undefined,
    }));

    const pendingTasks: Array<{ id: string; description: string; priority: 'low' | 'medium' | 'high' }> =
      (tasksResult.data || []).map((t: any) => ({
        id: t.id,
        description: 'Task',
        priority: (t.priority || 'medium') as 'low' | 'medium' | 'high',
      }));

    return {
      factCount: facts.length,
      highConfidenceFacts,
      recentConversations,
      pendingTasks,
    };
  } catch (error: any) {
    console.error('[prime-state] Error building memory summary:', error);
    return {
      factCount: 0,
      highConfidenceFacts: [],
      recentConversations: [],
      pendingTasks: [],
    };
  }
}

/**
 * Determine current stage (mirror existing behavior)
 * M0: Use simple logic matching current RouteDecisionGate behavior
 */
function determineCurrentStage(
  profileSummary: UserProfileSummary | null,
  financialSnapshot: any
): UserStage {
  // If onboarding not completed, user is novice
  if (!profileSummary?.onboardingCompleted) {
    return 'novice';
  }

  // If no transactions, still novice
  if (!financialSnapshot.hasTransactions) {
    return 'novice';
  }

  // If has transactions and onboarding complete, check usage level
  // Simple heuristic: power user if has many transactions and categories
  if (financialSnapshot.transactionCount > 200 && financialSnapshot.categoryCount > 10) {
    return 'power';
  }

  // Otherwise guided
  return 'guided';
}

/**
 * Build feature visibility map (M1: Includes all sidebar features)
 * Matches current sidebar behavior - all items visible by default
 * Premium features check role !== 'free'
 */
function buildFeatureVisibilityMap(
  profileSummary: UserProfileSummary | null
): FeatureVisibilityMap {
  const role = profileSummary?.role || 'free';
  
  // M1: All sidebar features included
  // Current behavior: All visible, premium features check role
  // TODO: Add stage-based visibility (novice/guided/power) in future phases
  return {
    // Main
    main_dashboard: { visible: true, enabled: true },
    prime_chat: { visible: true, enabled: true },
    chat_history: { visible: true, enabled: true },
    
    // AI Workspace
    smart_import_ai: { visible: true, enabled: true },
    ai_chat_assistant: { visible: true, enabled: true },
    smart_categories: { visible: true, enabled: true },
    analytics_ai: { visible: true, enabled: true },
    
    // Planning & Analysis
    transactions: { visible: true, enabled: true },
    bank_accounts: { visible: true, enabled: true },
    ai_goal_concierge: { visible: true, enabled: role !== 'free' },
    smart_automation: { visible: true, enabled: true },
    spending_predictions: { visible: true, enabled: true },
    debt_payoff_planner: { visible: true, enabled: true },
    ai_financial_freedom: { visible: true, enabled: true },
    bill_reminder_system: { visible: true, enabled: true },
    
    // Entertainment & Wellness
    personal_podcast: { visible: true, enabled: role !== 'free' },
    financial_story: { visible: true, enabled: true },
    ai_financial_therapist: { visible: true, enabled: true },
    wellness_studio: { visible: true, enabled: true },
    spotify_integration: { visible: true, enabled: true },
    
    // Business & Tax
    tax_assistant: { visible: true, enabled: true },
    business_intelligence: { visible: true, enabled: role !== 'free' },
    
    // Tools & Settings
    analytics: { visible: true, enabled: true },
    settings: { visible: true, enabled: true },
    reports: { visible: true, enabled: true },
  };
}

/**
 * Build suggested next action
 */
function buildSuggestedNextAction(
  financialSnapshot: any,
  currentStage: UserStage
): SuggestedNextAction | null {
  // Simple placeholder rules for M0
  if (!financialSnapshot.hasTransactions) {
    return {
      id: 'import-documents',
      type: 'import',
      title: 'Upload Receipt/Statement',
      description: 'Get started by uploading your first bank statement or receipt',
      ctaText: 'Upload Receipt/Statement',
      route: '/dashboard/smart-import-ai?auto=upload',
      priority: 'high',
      icon: '📤',
    };
  }

  if (financialSnapshot.uncategorizedCount > 0) {
    return {
      id: 'categorize-transactions',
      type: 'categorize',
      title: 'Categorize Transactions',
      description: `${financialSnapshot.uncategorizedCount} transactions need categorization`,
      ctaText: 'Categorize Now',
      route: '/dashboard/smart-categories',
      priority: 'medium',
      icon: '🏷️',
    };
  }

  return {
    id: 'view-analytics',
    type: 'analyze',
    title: 'View Analytics',
    description: 'Explore your spending patterns and insights',
    ctaText: 'Show my top insights',
    route: '/dashboard/analytics',
    priority: 'low',
    icon: '📊',
  };
}

/**
 * Build warnings
 */
function buildWarnings(
  profileSummary: UserProfileSummary | null,
  financialSnapshot: any
): PrimeWarning[] {
  const warnings: PrimeWarning[] = [];

  // Missing onboarding fields
  if (!profileSummary?.onboardingCompleted) {
    warnings.push({
      type: 'missing_onboarding_field',
      severity: 'info',
      message: 'Complete onboarding to unlock all features',
      actionRequired: true,
      actionRoute: '/onboarding/setup',
    });
  }

  // Data quality warnings from stress signals
  financialSnapshot.stressSignals.forEach((signal: any) => {
    if (signal.severity === 'high') {
      warnings.push({
        type: 'data_quality',
        severity: 'warning',
        message: signal.message,
        actionRequired: true,
        actionRoute: signal.suggestedAction ? '/dashboard/smart-categories' : undefined,
      });
    }
  });

  return warnings;
}

async function buildWorkspaceSummary(
  supabase: any,
  userId: string,
  memorySummary: MemorySummary
): Promise<WorkspaceSummary> {
  const fallback: WorkspaceSummary = {
    statementCount: 0,
    conversationCount: 0,
    newStatementsSinceLastConversation: 0,
    lastConversationAt: null,
  };

  try {
    const lastConversationAt = memorySummary?.recentConversations?.[0]?.lastMessageAt || null;

    const [importsCountResult, sessionsCountResult, newSinceLastResult] = await Promise.all([
      supabase
        .from('imports')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId),
      supabase
        .from('chat_sessions')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId),
      lastConversationAt
        ? supabase
            .from('imports')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', userId)
            .gt('created_at', lastConversationAt)
        : Promise.resolve({ count: 0, error: null }),
    ]);

    if (importsCountResult?.error) {
      warn('[prime-state] Failed to count imports', importsCountResult.error);
    }
    if (sessionsCountResult?.error) {
      warn('[prime-state] Failed to count chat sessions', sessionsCountResult.error);
    }
    if (newSinceLastResult?.error) {
      warn('[prime-state] Failed to count new imports since last conversation', newSinceLastResult.error);
    }

    return {
      statementCount: Number(importsCountResult?.count || 0),
      conversationCount: Number(sessionsCountResult?.count || 0),
      newStatementsSinceLastConversation: Number(newSinceLastResult?.count || 0),
      lastConversationAt,
    };
  } catch (error: any) {
    warn('[prime-state] Error building workspace summary', { message: error?.message || String(error) });
    return fallback;
  }
}

export const handler: Handler = async (event) => {
  // Health check log
  // Use process.env for server-safe DEV detection (no import.meta in functions runtime)
  if (process.env.NETLIFY_DEV === 'true' || process.env.NODE_ENV !== 'production') {
    log('[prime-state] ✅ Handler called', { method: event.httpMethod, path: event.path });
  }
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  // Handle OPTIONS
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    // Verify auth - get userId from JWT (do NOT trust client body)
    const { userId, error: authError } = await verifyAuth(event);
    if (authError || !userId) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: authError || 'Authentication required' }),
      };
    }

    const supabase = admin();

    // Build all components of PrimeState in parallel (all queries are independent)
    const [profileSummary, financialSnapshot, memorySummary] = await Promise.all([
      getUserProfileSummary(supabase, userId),
      buildFinancialSnapshot(supabase, userId),
      buildMemorySummary(supabase, userId),
    ]);
    const workspaceSummary = await buildWorkspaceSummary(supabase, userId, memorySummary);
    const currentStage = determineCurrentStage(profileSummary, financialSnapshot);
    const featureVisibilityMap = buildFeatureVisibilityMap(profileSummary);
    const suggestedNextAction = buildSuggestedNextAction(financialSnapshot, currentStage);
    const warnings = buildWarnings(profileSummary, financialSnapshot);

    // Build PrimeState
    const primeState: PrimeState = {
      userProfileSummary: profileSummary || {
        userId,
        displayName: null,
        email: null,
        role: 'free',
        currency: null,
        timezone: null,
        onboardingCompleted: false,
        onboardingStatus: null,
        lastLoginAt: null,
        accountCreatedAt: new Date().toISOString(),
      },
      financialSnapshot,
      memorySummary,
      currentStage,
      suggestedNextAction,
      featureVisibilityMap,
      warnings,
      lastUpdated: new Date().toISOString(),
      workspaceSummary,
    };

    // Dev logging
    if (process.env.NETLIFY_DEV === 'true' || process.env.NODE_ENV === 'development') {
      log('[prime-state] PrimeState built:', {
        userId,
        currentStage,
        hasTransactions: financialSnapshot.hasTransactions,
        transactionCount: financialSnapshot.transactionCount,
        statementCount: workspaceSummary.statementCount,
        conversationCount: workspaceSummary.conversationCount,
        suggestedAction: suggestedNextAction?.id,
        warningsCount: warnings.length,
      });
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(primeState),
    };
  } catch (error: any) {
    console.error('[prime-state] Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        message: process.env.NETLIFY_DEV === 'true' ? error.message : undefined,
      }),
    };
  }
};

