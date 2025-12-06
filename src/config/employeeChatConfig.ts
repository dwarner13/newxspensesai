/**
 * Employee Chat Configuration
 * 
 * Provides welcome messages, titles, and styling for each AI employee's chat interface.
 * Used by UnifiedAssistantChat to render personalized welcome cards.
 */

export type EmployeeChatKey = 
  | 'prime-boss'
  | 'byte-docs'
  | 'tag-ai'
  | 'crystal-analytics'
  | 'finley-forecasts'
  | 'goalie-goals'
  | 'blitz-debt'
  | 'liberty-freedom'
  | 'chime-reminders'
  | 'ledger-tax';

export interface QuickAction {
  id: string;
  label: string;
  description?: string; // Optional description for handoff actions
  action: string; // Message to send when clicked (legacy, kept for backward compatibility)
  // Handoff support
  targetEmployeeSlug?: string; // Which employee to switch to when clicked; if omitted, stay on current
  suggestedPrompt?: string; // Optional default message to inject into the chat input for the new employee
}

export interface EmployeeChatConfig {
  emoji: string;
  title: string;
  subtitle?: string;
  welcomeMessage: string;
  gradient: string; // Tailwind gradient classes for avatar/accents
  // Optional fields for hero card
  cardTitle?: string; // Override title for hero card
  description?: string; // Description text for hero card
  badgeLabel?: string; // Badge text (e.g., "Prime-Level AI", "Smart Import AI")
  quickActions?: QuickAction[]; // Quick action buttons
}

export const EMPLOYEE_CHAT_CONFIG: Record<EmployeeChatKey, EmployeeChatConfig> = {
  'prime-boss': {
    emoji: '👑',
    title: 'Prime — Chat',
    subtitle: 'CEO & Strategic Orchestrator',
    welcomeMessage: 'Ask me about your spending, goals, and AI employees. I\'ll route you to the right specialist.',
    gradient: 'from-amber-400 via-orange-500 to-pink-500',
    cardTitle: 'Prime — Chat',
    description: 'Your strategic AI CEO orchestrating 30+ specialized employees. I route tasks, coordinate workflows, and ensure you get the right expert for every question.',
    badgeLabel: 'Prime-Level AI',
    quickActions: [
      {
        id: 'upload-documents',
        label: 'Upload bank statements',
        description: 'Send PDFs, CSVs, or receipts to Byte for processing.',
        targetEmployeeSlug: 'byte-docs',
        suggestedPrompt: 'I want to upload some bank statements and receipts. Please process them and add the transactions.',
        action: 'I want to upload my bank statement', // Legacy fallback
      },
      {
        id: 'fix-categories',
        label: 'Fix my categories',
        description: 'Ask Tag to clean up and organize your transactions.',
        targetEmployeeSlug: 'tag-ai',
        suggestedPrompt: 'Please review my recent transactions and fix any incorrect categories.',
        action: 'Show me uncategorized transactions', // Legacy fallback
      },
      {
        id: 'explain-spending',
        label: 'Explain my spending',
        description: 'Send me to Crystal to analyze trends and patterns.',
        targetEmployeeSlug: 'crystal-analytics',
        suggestedPrompt: 'Please explain my spending patterns over the last 3 months.',
        action: 'Show me my spending insights', // Legacy fallback
      },
      {
        id: 'ask-prime',
        label: 'Ask Prime anything',
        description: 'Stay with Prime and get high-level help or routing.',
        // no targetEmployeeSlug: stays on Prime
        suggestedPrompt: 'Prime, help me decide what to focus on next in my finances.',
        action: 'I want to set a financial goal', // Legacy fallback
      },
    ],
  },
  'byte-docs': {
    emoji: '📥',
    title: 'Byte — Chat',
    subtitle: 'Document & Receipt Processing',
    welcomeMessage: 'Upload bank statements, receipts, or invoices. I\'ll extract transactions and categorize them automatically.',
    gradient: 'from-sky-400 via-cyan-400 to-emerald-400',
    cardTitle: 'Byte — Smart Import AI',
    description: 'I process bank statements, receipts, invoices, and CSV files with 99.7% accuracy. Upload documents and I\'ll extract transactions automatically.',
    badgeLabel: 'Smart Import AI',
    quickActions: [
      { id: 'upload-another', label: 'Upload another document', action: 'I want to upload another file' },
      { id: 'formats', label: 'What formats do you support?', action: 'What file formats can I upload?' },
      { id: 'history', label: 'Show my import history', action: 'Show me my recent imports' },
    ],
  },
  'tag-ai': {
    emoji: '🏷️',
    title: 'Tag — Chat',
    subtitle: 'Smart Categories & Rules',
    welcomeMessage: 'I help organize your transactions with smart categories and custom rules. Ask me about categorization or create new rules.',
    gradient: 'from-yellow-300 via-amber-400 to-orange-500',
    cardTitle: 'Tag — Smart Categories',
    description: 'I automatically categorize transactions and learn from your patterns. Create custom rules, fix mis-categorized expenses, and keep your finances organized.',
    badgeLabel: 'Smart Categories',
    quickActions: [
      { id: 'uncategorized', label: 'See uncategorized expenses', action: 'Show me uncategorized transactions' },
      { id: 'create-rule', label: 'Create a new rule', action: 'I want to create a categorization rule' },
      { id: 'fix-category', label: 'Fix a category', action: 'Help me fix a wrong category' },
    ],
  },
  'crystal-analytics': {
    emoji: '📊',
    title: 'Crystal — Chat',
    subtitle: 'Analytics & Insights',
    welcomeMessage: 'I analyze your spending patterns and provide insights. Ask me about trends, anomalies, or financial forecasts.',
    gradient: 'from-purple-400 via-indigo-400 to-sky-400',
    cardTitle: 'Crystal — Analytics AI',
    description: 'I analyze your spending patterns, detect anomalies, and provide actionable insights. Get monthly trends, forecasts, and recommendations.',
    badgeLabel: 'Analytics AI',
    quickActions: [
      { id: 'monthly', label: 'Show monthly insights', action: 'Show me my monthly spending insights' },
      { id: 'anomalies', label: 'Detect anomalies', action: 'Find unusual spending patterns' },
      { id: 'forecast', label: 'Forecast next month', action: 'Predict my spending for next month' },
    ],
  },
  'finley-forecasts': {
    emoji: '🧮',
    title: 'Finley — Chat',
    subtitle: 'Financial Forecasting',
    welcomeMessage: 'I create financial forecasts and projections. Ask me about future cash flow, savings goals, or budget planning.',
    gradient: 'from-teal-400 via-green-400 to-emerald-400',
  },
  'goalie-goals': {
    emoji: '🎯',
    title: 'Goalie — Chat',
    subtitle: 'Goal Progress & Achievement',
    welcomeMessage: 'I track your financial goals and help you stay on track. Ask me about goal progress or create new goals.',
    gradient: 'from-purple-400 via-pink-400 to-rose-400',
  },
  'blitz-debt': {
    emoji: '⚡',
    title: 'Blitz — Chat',
    subtitle: 'Debt Payoff Strategy',
    welcomeMessage: 'I help you pay off debt faster with optimized strategies. Ask me about debt payoff plans or interest optimization.',
    gradient: 'from-yellow-400 via-orange-400 to-red-400',
  },
  'liberty-freedom': {
    emoji: '🗽',
    title: 'Liberty — Chat',
    subtitle: 'Financial Freedom Planning',
    welcomeMessage: 'I help you achieve financial freedom through strategic planning. Ask me about FIRE, savings rates, or investment strategies.',
    gradient: 'from-blue-400 via-indigo-400 to-purple-400',
  },
  'chime-reminders': {
    emoji: '🔔',
    title: 'Chime — Chat',
    subtitle: 'Reminders & Notifications',
    welcomeMessage: 'I keep you informed about important financial events. Ask me about upcoming bills, payment reminders, or alerts.',
    gradient: 'from-yellow-400 via-amber-400 to-orange-400',
  },
  'ledger-tax': {
    emoji: '📋',
    title: 'Ledger — Chat',
    subtitle: 'Tax & Accounting',
    welcomeMessage: 'I help with tax preparation and accounting questions. Ask me about deductions, tax strategies, or record keeping.',
    gradient: 'from-gray-400 via-slate-400 to-zinc-400',
  },
};

/**
 * Get employee chat config by slug
 */
export function getEmployeeChatConfig(slug?: string): EmployeeChatConfig {
  const normalizedSlug = slug?.toLowerCase().trim() || 'prime-boss';
  return EMPLOYEE_CHAT_CONFIG[normalizedSlug] ?? EMPLOYEE_CHAT_CONFIG['prime-boss'];
}
