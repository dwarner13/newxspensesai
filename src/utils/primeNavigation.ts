/**
 * Prime Navigation Helper
 * ========================
 * Helper functions to navigate to Prime with prefilled messages
 */

/**
 * Navigate to Prime chat with a prefilled message
 * @param message - The message to auto-send to Prime
 * @param navigate - React Router navigate function
 */
export function askPrime(message: string, navigate: (path: string) => void) {
  const encodedMessage = encodeURIComponent(message);
  navigate(`/prime?m=${encodedMessage}`);
}

/**
 * Pre-defined Prime delegation messages for common tasks
 */
export const PRIME_MESSAGES = {
  // Document Processing
  IMPORT_DOCUMENTS: 'Prime, ask Byte (byte-docs) to import my latest statements and receipts. Then summarize what you found.',
  
  // Categorization
  CATEGORIZE_OCTOBER: 'Prime, ask Tag (tag-ai) to categorize October transactions and show the top categories.',
  CATEGORIZE_RECENT: 'Prime, ask Tag (tag-ai) to categorize my recent uncategorized transactions.',
  
  // Tax & Accounting
  TAX_REVIEW_OCTOBER: 'Prime, ask Ledger (ledger-tax) to flag potential October tax-deductible items and summarize safely.',
  TAX_YEAR_END: 'Prime, ask Ledger (ledger-tax) to prepare a year-end tax summary with all potential deductions.',
  
  // Forecasting
  FORECAST_NEXT_MONTH: 'Prime, ask Crystal (crystal-ai) to forecast next month\'s spending and explain the two biggest drivers.',
  FORECAST_TRENDS: 'Prime, ask Crystal (crystal-ai) to analyze my spending trends over the last 3 months.',
  
  // Goals
  REVIEW_GOALS: 'Prime, ask Goalie (goalie-coach) to review my financial goals and show progress.',
  SET_SAVINGS_GOAL: 'Prime, ask Goalie (goalie-coach) to help me set up a savings goal.',
  
  // Debt Management
  DEBT_PLAN: 'Prime, ask Blitz (blitz-debt) to create an optimized debt payoff plan.',
  DEBT_PROGRESS: 'Prime, ask Blitz (blitz-debt) to show my debt payoff progress.',
  
  // Complex Multi-Agent
  FULL_ANALYSIS: 'Prime, coordinate with Byte to import documents, Tag to categorize, Crystal to forecast, and Ledger to flag tax items. Then give me a comprehensive financial summary.',
  OCTOBER_SUMMARY: 'Prime, ask Byte to extract my October transactions and Tag to categorize them. Then summarize top categories.',
};

/**
 * Quick action presets for dashboard tiles
 */
export interface PrimeAction {
  title: string;
  description: string;
  message: string;
  icon?: string;
}

export const DASHBOARD_PRIME_ACTIONS: Record<string, PrimeAction> = {
  SMART_IMPORT: {
    title: 'Smart Import AI',
    description: 'Import and analyze documents',
    message: PRIME_MESSAGES.IMPORT_DOCUMENTS,
    icon: '📄',
  },
  SMART_CATEGORIES: {
    title: 'Smart Categories',
    description: 'Auto-categorize transactions',
    message: PRIME_MESSAGES.CATEGORIZE_OCTOBER,
    icon: '🏷️',
  },
  TAX_ACCOUNTING: {
    title: 'Tax & Accounting',
    description: 'Tax deduction analysis',
    message: PRIME_MESSAGES.TAX_REVIEW_OCTOBER,
    icon: '💰',
  },
  FORECASTS: {
    title: 'Spending Forecasts',
    description: 'Predict future spending',
    message: PRIME_MESSAGES.FORECAST_NEXT_MONTH,
    icon: '🔮',
  },
  GOALS: {
    title: 'Financial Goals',
    description: 'Track and achieve goals',
    message: PRIME_MESSAGES.REVIEW_GOALS,
    icon: '🎯',
  },
  DEBT: {
    title: 'Debt Management',
    description: 'Optimize debt payoff',
    message: PRIME_MESSAGES.DEBT_PLAN,
    icon: '⚡',
  },
};

