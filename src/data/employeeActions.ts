/**
 * Employee Actions Mapping
 * 
 * Defines quick actions available for each AI employee.
 * Actions trigger existing Netlify functions or open dashboard sections.
 */

export interface EmployeeAction {
  label: string;
  action: string;
  description?: string;
  icon?: string;
}

export type EmployeeActionsMap = Record<string, EmployeeAction[]>;

export const employeeActions: EmployeeActionsMap = {
  byte: [
    { 
      label: 'Upload Statement', 
      action: 'openSmartImport',
      description: 'Upload CSV or PDF files',
      icon: '📤'
    },
    { 
      label: 'View Parsed Documents', 
      action: 'openDocuments',
      description: 'Browse processed files',
      icon: '📄'
    },
    { 
      label: 'Scan for Missing Receipts', 
      action: 'scanReceipts',
      description: 'Find unlinked receipts',
      icon: '🔍'
    },
  ],
  'byte-docs': [
    { 
      label: 'Upload Statement', 
      action: 'openSmartImport',
      description: 'Upload CSV or PDF files',
      icon: '📤'
    },
    { 
      label: 'View Parsed Documents', 
      action: 'openDocuments',
      description: 'Browse processed files',
      icon: '📄'
    },
  ],
  tag: [
    { 
      label: 'Fix Unassigned Categories', 
      action: 'fixCategories',
      description: 'Review uncategorized transactions',
      icon: '🏷️'
    },
    { 
      label: 'Auto-Categorize Now', 
      action: 'autoCategorize',
      description: 'Run categorization on pending items',
      icon: '⚡'
    },
    { 
      label: 'Review Category Rules', 
      action: 'reviewRules',
      description: 'Manage categorization rules',
      icon: '📋'
    },
  ],
  'tag-ai': [
    { 
      label: 'Fix Unassigned Categories', 
      action: 'fixCategories',
      description: 'Review uncategorized transactions',
      icon: '🏷️'
    },
    { 
      label: 'Auto-Categorize Now', 
      action: 'autoCategorize',
      description: 'Run categorization on pending items',
      icon: '⚡'
    },
  ],
  blitz: [
    { 
      label: 'Generate New Payoff Plan', 
      action: 'generatePlan',
      description: 'Create optimized debt strategy',
      icon: '📊'
    },
    { 
      label: 'Optimize Interest Savings', 
      action: 'optimizeInterest',
      description: 'Find best payoff order',
      icon: '💰'
    },
    { 
      label: 'View Debt Summary', 
      action: 'viewDebtSummary',
      description: 'See all debts and balances',
      icon: '📈'
    },
  ],
  'blitz-debt': [
    { 
      label: 'Generate New Payoff Plan', 
      action: 'generatePlan',
      description: 'Create optimized debt strategy',
      icon: '📊'
    },
    { 
      label: 'Optimize Interest Savings', 
      action: 'optimizeInterest',
      description: 'Find best payoff order',
      icon: '💰'
    },
  ],
  crystal: [
    { 
      label: 'Show Spending Trends', 
      action: 'showTrends',
      description: 'View spending patterns',
      icon: '📊'
    },
    { 
      label: 'Detect Anomalies', 
      action: 'detectAnomalies',
      description: 'Find unusual spending',
      icon: '🔍'
    },
    { 
      label: 'Generate Insights', 
      action: 'generateInsights',
      description: 'Create financial insights report',
      icon: '💡'
    },
  ],
  'crystal-analytics': [
    { 
      label: 'Show Spending Trends', 
      action: 'showTrends',
      description: 'View spending patterns',
      icon: '📊'
    },
    { 
      label: 'Detect Anomalies', 
      action: 'detectAnomalies',
      description: 'Find unusual spending',
      icon: '🔍'
    },
  ],
  finley: [
    { 
      label: 'Generate Wealth Forecast', 
      action: 'generateForecast',
      description: 'Project future wealth',
      icon: '📈'
    },
    { 
      label: 'Analyze Investment Options', 
      action: 'analyzeInvestments',
      description: 'Compare investment strategies',
      icon: '💎'
    },
    { 
      label: 'Review Financial Goals', 
      action: 'reviewGoals',
      description: 'Check goal progress',
      icon: '🎯'
    },
  ],
  'finley-financial': [
    { 
      label: 'Generate Wealth Forecast', 
      action: 'generateForecast',
      description: 'Project future wealth',
      icon: '📈'
    },
    { 
      label: 'Review Financial Goals', 
      action: 'reviewGoals',
      description: 'Check goal progress',
      icon: '🎯'
    },
  ],
  chime: [
    { 
      label: 'View Upcoming Bills', 
      action: 'viewBills',
      description: 'See bills due soon',
      icon: '📅'
    },
    { 
      label: 'Set Reminder', 
      action: 'setReminder',
      description: 'Create payment reminder',
      icon: '⏰'
    },
    { 
      label: 'Review Debt Plan', 
      action: 'reviewDebtPlan',
      description: 'Check payoff schedule',
      icon: '📋'
    },
  ],
  'chime-reminders': [
    { 
      label: 'View Upcoming Bills', 
      action: 'viewBills',
      description: 'See bills due soon',
      icon: '📅'
    },
    { 
      label: 'Set Reminder', 
      action: 'setReminder',
      description: 'Create payment reminder',
      icon: '⏰'
    },
  ],
  liberty: [
    { 
      label: 'View Freedom Plan', 
      action: 'viewFreedomPlan',
      description: 'See debt-free roadmap',
      icon: '🗽'
    },
    { 
      label: 'Calculate Payoff Date', 
      action: 'calculatePayoff',
      description: 'Estimate debt-free date',
      icon: '📅'
    },
  ],
  'liberty-freedom': [
    { 
      label: 'View Freedom Plan', 
      action: 'viewFreedomPlan',
      description: 'See debt-free roadmap',
      icon: '🗽'
    },
  ],
  goalie: [
    { 
      label: 'Set New Goal', 
      action: 'setGoal',
      description: 'Create financial goal',
      icon: '🎯'
    },
    { 
      label: 'Review Progress', 
      action: 'reviewProgress',
      description: 'Check goal achievements',
      icon: '📊'
    },
  ],
  'goalie-goals': [
    { 
      label: 'Set New Goal', 
      action: 'setGoal',
      description: 'Create financial goal',
      icon: '🎯'
    },
    { 
      label: 'Review Progress', 
      action: 'reviewProgress',
      description: 'Check goal achievements',
      icon: '📊'
    },
  ],
  ledger: [
    { 
      label: 'Find Tax Deductions', 
      action: 'findDeductions',
      description: 'Identify deductible expenses',
      icon: '💰'
    },
    { 
      label: 'Generate Tax Report', 
      action: 'generateTaxReport',
      description: 'Create tax summary',
      icon: '📋'
    },
  ],
  'ledger-tax': [
    { 
      label: 'Find Tax Deductions', 
      action: 'findDeductions',
      description: 'Identify deductible expenses',
      icon: '💰'
    },
    { 
      label: 'Generate Tax Report', 
      action: 'generateTaxReport',
      description: 'Create tax summary',
      icon: '📋'
    },
  ],
};

/**
 * Get actions for an employee by slug
 */
export function getEmployeeActions(slug: string): EmployeeAction[] {
  const normalizedSlug = slug.toLowerCase().trim();
  return employeeActions[normalizedSlug] || employeeActions[normalizedSlug.split('-')[0]] || [];
}

/**
 * Employee route mapping for "Open Full Workspace" button
 */
export const employeeRoutes: Record<string, string> = {
  byte: '/dashboard/smart-import-ai',
  'byte-docs': '/dashboard/smart-import-ai',
  'byte-ai': '/dashboard/smart-import-ai',
  tag: '/dashboard/smart-categories',
  'tag-ai': '/dashboard/smart-categories',
  crystal: '/dashboard/analytics-ai',
  'crystal-analytics': '/dashboard/analytics-ai',
  'crystal-ai': '/dashboard/analytics-ai',
  blitz: '/dashboard/transactions',
  'blitz-debt': '/dashboard/transactions',
  'blitz-ai': '/dashboard/transactions',
  finley: '/dashboard/ai-chat-assistant',
  'finley-financial': '/dashboard/ai-chat-assistant',
  'finley-ai': '/dashboard/ai-chat-assistant',
  chime: '/dashboard/debt-ai',
  'chime-reminders': '/dashboard/debt-ai',
  'chime-ai': '/dashboard/debt-ai',
  liberty: '/dashboard/debt-ai',
  'liberty-freedom': '/dashboard/debt-ai',
  'liberty-ai': '/dashboard/debt-ai',
  goalie: '/dashboard/goals',
  'goalie-goals': '/dashboard/goals',
  'goalie-ai': '/dashboard/goals',
  ledger: '/dashboard/tax',
  'ledger-tax': '/dashboard/tax',
};

/**
 * Get route for an employee by slug
 */
export function getEmployeeRoute(slug: string): string {
  const normalizedSlug = slug.toLowerCase().trim();
  return employeeRoutes[normalizedSlug] || employeeRoutes[normalizedSlug.split('-')[0]] || '/dashboard';
}








