/**
 * Feature Key Mapping for Sidebar Navigation
 * 
 * Maps each sidebar route to a FeatureKey for Prime visibility control.
 * Used by DesktopSidebar and MobileSidebar to filter items based on Prime state.
 */

import type { FeatureKey } from '../types/prime-state';

/**
 * Map route path to FeatureKey
 * Used to look up visibility in primeState.featureVisibilityMap
 */
export const ROUTE_TO_FEATURE_KEY: Record<string, FeatureKey> = {
  '/dashboard': 'main_dashboard',
  '/dashboard/prime-chat': 'prime_chat',
  '/dashboard/smart-import-ai': 'smart_import_ai',
  '/dashboard/ai-chat-assistant': 'ai_chat_assistant',
  '/dashboard/smart-categories': 'smart_categories',
  '/dashboard/analytics-ai': 'analytics_ai',
  '/dashboard/transactions': 'transactions',
  '/dashboard/bank-accounts': 'bank_accounts',
  '/dashboard/goal-concierge': 'ai_goal_concierge',
  '/dashboard/smart-automation': 'smart_automation',
  '/dashboard/spending-predictions': 'spending_predictions',
  '/dashboard/debt-payoff-planner': 'debt_payoff_planner',
  '/dashboard/ai-financial-freedom': 'ai_financial_freedom',
  '/dashboard/bill-reminders': 'bill_reminder_system',
  '/dashboard/personal-podcast': 'personal_podcast',
  '/dashboard/financial-story': 'financial_story',
  '/dashboard/financial-therapist': 'ai_financial_therapist',
  '/dashboard/wellness-studio': 'wellness_studio',
  '/dashboard/spotify': 'spotify_integration',
  '/dashboard/tax-assistant': 'tax_assistant',
  '/dashboard/business-intelligence': 'business_intelligence',
  '/dashboard/analytics': 'analytics',
  '/dashboard/settings': 'settings',
  '/dashboard/reports': 'reports',
};

/**
 * Get FeatureKey for a route path
 * Returns undefined if route has no feature key mapping
 */
export function getFeatureKeyForRoute(route: string): FeatureKey | undefined {
  return ROUTE_TO_FEATURE_KEY[route];
}

