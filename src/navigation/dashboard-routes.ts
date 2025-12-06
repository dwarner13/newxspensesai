/**
 * Dashboard Route Constants
 * Single source of truth for all dashboard route paths
 */

export const DASHBOARD_ROUTES = {
  root: '/dashboard',
  overview: '/dashboard/overview',
  workspace: '/dashboard/workspace',
  planning: '/dashboard/planning',
  analytics: '/dashboard/analytics',
  business: '/dashboard/business',
  entertainment: '/dashboard/entertainment',
  reports: '/dashboard/reports',
  
  // AI Workspaces
  primeChat: '/dashboard/prime-chat',
  smartImportAI: '/dashboard/smart-import-ai',
  aiChatAssistant: '/dashboard/ai-chat-assistant',
  smartCategories: '/dashboard/smart-categories',
  analyticsAI: '/dashboard/analytics-ai',
  aiFinancialFreedom: '/dashboard/ai-financial-freedom',
  
  // Planning & Analysis
  transactions: '/dashboard/transactions',
  bankAccounts: '/dashboard/bank-accounts',
  goalConcierge: '/dashboard/goal-concierge',
  smartAutomation: '/dashboard/smart-automation',
  spendingPredictions: '/dashboard/spending-predictions',
  debtPayoffPlanner: '/dashboard/debt-payoff-planner',
  billReminders: '/dashboard/bill-reminders',
  
  // Entertainment & Wellness
  personalPodcast: '/dashboard/personal-podcast',
  financialStory: '/dashboard/financial-story',
  financialTherapist: '/dashboard/financial-therapist',
  wellnessStudio: '/dashboard/wellness-studio',
  spotify: '/dashboard/spotify',
  
  // Business & Tax
  taxAssistant: '/dashboard/tax-assistant',
  businessIntelligence: '/dashboard/business-intelligence',
  
  // Settings
  settings: '/dashboard/settings',
} as const;

export type DashboardRoute = typeof DASHBOARD_ROUTES[keyof typeof DASHBOARD_ROUTES];











