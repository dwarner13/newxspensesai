/**
 * Prime's Canonical State Contract
 * 
 * This is the SINGLE SOURCE OF TRUTH for all Prime decisions.
 * All UI components read from this (read-only).
 * Only Prime backend updates this state.
 */

export interface PrimeState {
  /** User profile summary (identity, preferences) */
  userProfileSummary: UserProfileSummary;
  
  /** Financial snapshot (transactions, categories, spending) */
  financialSnapshot: FinancialSnapshot;
  
  /** Memory summary (facts, recent conversations) */
  memorySummary: MemorySummary;
  
  /** Current user stage (drives onboarding, feature visibility) */
  currentStage: UserStage;
  
  /** Single suggested next action (CTA) */
  suggestedNextAction: SuggestedNextAction | null;
  
  /** Feature visibility map (which features are visible/enabled) */
  featureVisibilityMap: FeatureVisibilityMap;
  
  /** Warnings/blockers (missing onboarding fields, errors) */
  warnings: PrimeWarning[];
  
  /** Last updated timestamp */
  lastUpdated: string; // ISO timestamp
}

export interface UserProfileSummary {
  userId: string;
  displayName: string | null;
  email: string | null;
  role: 'free' | 'premium' | 'admin';
  currency: string | null;
  timezone: string | null;
  onboardingCompleted: boolean;
  onboardingStatus: 'pending' | 'in_progress' | 'completed' | null;
  lastLoginAt: string | null;
  accountCreatedAt: string;
}

export interface FinancialSnapshot {
  /** Basic flags */
  hasTransactions: boolean;
  transactionCount: number;
  
  /** Categorization state */
  uncategorizedCount: number;
  categorizedCount: number;
  categoryCount: number; // Unique categories used
  
  /** Spending metrics */
  monthlySpend: number; // Current month expenses
  monthlyIncome: number; // Current month income
  netCashflow: number; // income - expenses
  
  /** Top categories (spending) */
  topCategories: Array<{
    category: string;
    totalAmount: number;
    transactionCount: number;
  }>;
  
  /** Top merchants */
  topMerchants: Array<{
    merchant: string;
    totalAmount: number;
    transactionCount: number;
  }>;
  
  /** Date ranges */
  firstTransactionDate: string | null; // ISO date
  lastTransactionDate: string | null; // ISO date
  
  /** Debt state (if available) */
  hasDebt: 'yes' | 'no' | 'unknown';
  debtTotal: number | null; // If known
  
  /** Goals state (if available) */
  hasGoals: 'yes' | 'no' | 'unknown';
  activeGoalCount: number | null; // If known
  
  /** Stress signals (simple heuristics) */
  stressSignals: StressSignal[];
}

export interface StressSignal {
  type: 'high_uncategorized' | 'negative_cashflow' | 'high_spending_velocity' | 'missing_categories';
  severity: 'low' | 'medium' | 'high';
  message: string;
  suggestedAction?: string;
}

export interface MemorySummary {
  factCount: number;
  highConfidenceFacts: Array<{
    key: string;
    value: string;
    confidence: number;
  }>;
  recentConversations: Array<{
    sessionId: string;
    employeeSlug: string;
    lastMessageAt: string;
    summary?: string;
  }>;
  pendingTasks: Array<{
    id: string;
    description: string;
    priority: 'low' | 'medium' | 'high';
  }>;
}

export type UserStage = 'novice' | 'guided' | 'power';

export interface SuggestedNextAction {
  id: string;
  type: 'onboarding' | 'import' | 'categorize' | 'analyze' | 'goal' | 'chat';
  title: string;
  description: string;
  ctaText: string;
  route: string; // e.g., '/dashboard/smart-import-ai'
  priority: 'low' | 'medium' | 'high';
  icon?: string;
}

export interface FeatureVisibilityMap {
  [featureKey: string]: {
    visible: boolean;
    enabled: boolean;
    reason?: string; // Why hidden/disabled
  };
}

// Feature keys (expanded for sidebar navigation)
export type FeatureKey =
  // Main
  | 'main_dashboard'
  | 'prime_chat'
  // AI Workspace
  | 'smart_import_ai'
  | 'ai_chat_assistant'
  | 'smart_categories'
  | 'analytics_ai'
  // Planning & Analysis
  | 'transactions'
  | 'bank_accounts'
  | 'ai_goal_concierge'
  | 'smart_automation'
  | 'spending_predictions'
  | 'debt_payoff_planner'
  | 'ai_financial_freedom'
  | 'bill_reminder_system'
  // Entertainment & Wellness
  | 'personal_podcast'
  | 'financial_story'
  | 'ai_financial_therapist'
  | 'wellness_studio'
  | 'spotify_integration'
  // Business & Tax
  | 'tax_assistant'
  | 'business_intelligence'
  // Tools & Settings
  | 'analytics'
  | 'settings'
  | 'reports';

export interface PrimeWarning {
  type: 'missing_onboarding_field' | 'subscription_expired' | 'data_quality' | 'system_error';
  severity: 'info' | 'warning' | 'error';
  message: string;
  actionRequired: boolean;
  actionRoute?: string;
}

