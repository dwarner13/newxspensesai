// Comprehensive Mock Data System for XspensesAI
// This provides realistic test data for all app functionality

// ============================================================================
// 1. MOCK USER DATA
// ============================================================================

export const mockUser = {
  id: 'user-123',
  name: 'Darrell Warner',
  email: 'darrell.warner13@gmail.com',
  plan: 'Personal Plan',
  joinDate: '2024-01-15',
  xspensesScore: 541,
  scoreRating: 'Fair',
  avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
  preferences: {
    currency: 'USD',
    timezone: 'America/New_York',
    notifications: {
      email: true,
      push: true,
      sms: false
    }
  }
};

// ============================================================================
// 2. MOCK TRANSACTION DATA
// ============================================================================

export const mockTransactions = [
  {
    id: 'txn-001',
    date: '2025-07-19',
    description: 'Whole Foods Market',
    amount: -112.34,
    category: 'Groceries',
    merchant: 'Whole Foods',
    source: 'Chase_Credit_Card',
    needsReview: false,
    tags: ['organic', 'health']
  },
  {
    id: 'txn-002', 
    date: '2025-07-18',
    description: 'Uber Trip',
    amount: -23.65,
    category: 'Transportation',
    merchant: 'Uber',
    source: 'Chase_Credit_Card',
    needsReview: false,
    tags: ['ride-share']
  },
  {
    id: 'txn-003',
    date: '2025-07-17',
    description: 'Netflix Subscription',
    amount: -18.99,
    category: 'Entertainment',
    merchant: 'Netflix',
    source: 'Bank_Account',
    needsReview: false,
    tags: ['subscription', 'streaming']
  },
  {
    id: 'txn-004',
    date: '2025-07-16',
    description: 'Starbucks Coffee',
    amount: -5.47,
    category: 'Coffee & Cafes',
    merchant: 'Starbucks',
    source: 'Chase_Credit_Card',
    needsReview: false,
    tags: ['coffee', 'daily']
  },
  {
    id: 'txn-005',
    date: '2025-07-15',
    description: 'REI Outdoor Gear',
    amount: -127.00,
    category: 'Shopping',
    merchant: 'REI',
    source: 'Chase_Credit_Card',
    needsReview: true,
    tags: ['outdoor', 'gear']
  },
  {
    id: 'txn-006',
    date: '2025-07-15',
    description: 'Salary Deposit',
    amount: 4250.00,
    category: 'Income',
    merchant: 'Tech Company Inc',
    source: 'Bank_Account',
    needsReview: false,
    tags: ['salary', 'income']
  },
  {
    id: 'txn-007',
    date: '2025-07-14',
    description: 'Shell Gas Station',
    amount: -45.23,
    category: 'Transportation',
    merchant: 'Shell',
    source: 'Chase_Credit_Card',
    needsReview: false,
    tags: ['gas', 'fuel']
  },
  {
    id: 'txn-008',
    date: '2025-07-13',
    description: 'Amazon Purchase',
    amount: -67.89,
    category: 'Shopping',
    merchant: 'Amazon',
    source: 'Chase_Credit_Card',
    needsReview: false,
    tags: ['online', 'shopping']
  },
  {
    id: 'txn-009',
    date: '2025-07-12',
    description: 'Chipotle Mexican Grill',
    amount: -12.50,
    category: 'Dining',
    merchant: 'Chipotle',
    source: 'Chase_Credit_Card',
    needsReview: false,
    tags: ['fast-food', 'lunch']
  },
  {
    id: 'txn-010',
    date: '2025-07-11',
    description: 'Spotify Premium',
    amount: -9.99,
    category: 'Entertainment',
    merchant: 'Spotify',
    source: 'Bank_Account',
    needsReview: false,
    tags: ['subscription', 'music']
  },
  {
    id: 'txn-011',
    date: '2025-07-10',
    description: 'CVS Pharmacy',
    amount: -34.67,
    category: 'Healthcare',
    merchant: 'CVS',
    source: 'Chase_Credit_Card',
    needsReview: false,
    tags: ['pharmacy', 'health']
  },
  {
    id: 'txn-012',
    date: '2025-07-09',
    description: 'Target',
    amount: -89.45,
    category: 'Shopping',
    merchant: 'Target',
    source: 'Chase_Credit_Card',
    needsReview: false,
    tags: ['retail', 'household']
  },
  {
    id: 'txn-013',
    date: '2025-07-08',
    description: 'Chevron Gas Station',
    amount: -38.90,
    category: 'Transportation',
    merchant: 'Chevron',
    source: 'Chase_Credit_Card',
    needsReview: false,
    tags: ['gas', 'fuel']
  },
  {
    id: 'txn-014',
    date: '2025-07-07',
    description: 'Panera Bread',
    amount: -15.75,
    category: 'Dining',
    merchant: 'Panera',
    source: 'Chase_Credit_Card',
    needsReview: false,
    tags: ['cafe', 'lunch']
  },
  {
    id: 'txn-015',
    date: '2025-07-06',
    description: 'Home Depot',
    amount: -156.78,
    category: 'Home & Garden',
    merchant: 'Home Depot',
    source: 'Chase_Credit_Card',
    needsReview: false,
    tags: ['home-improvement', 'tools']
  }
];

// ============================================================================
// 3. MOCK RECEIPTS DATA
// ============================================================================

export const mockReceipts = [
  {
    id: 'receipt-001',
    date: '2025-07-19',
    merchant: 'Whole Foods Market',
    amount: 112.34,
    category: 'Groceries',
    items: [
      { name: 'Organic Bananas', price: 3.99, quantity: 1 },
      { name: 'Almond Milk', price: 4.99, quantity: 2 },
      { name: 'Chicken Breast', price: 12.99, quantity: 1 },
      { name: 'Organic Spinach', price: 3.49, quantity: 1 },
      { name: 'Quinoa', price: 8.99, quantity: 1 },
      { name: 'Greek Yogurt', price: 5.99, quantity: 2 },
      { name: 'Avocados', price: 4.99, quantity: 3 },
      { name: 'Salmon Fillet', price: 18.99, quantity: 1 },
      { name: 'Sweet Potatoes', price: 3.99, quantity: 2 },
      { name: 'Coconut Oil', price: 9.99, quantity: 1 }
    ],
    tax: 8.95,
    tip: 0,
    imageUrl: 'https://images.unsplash.com/photo-1607082349566-187342175e2f?w=400&h=300&fit=crop',
    status: 'processed'
  },
  {
    id: 'receipt-002',
    date: '2025-07-18',
    merchant: 'Uber',
    amount: 23.65,
    category: 'Transportation',
    items: [
      { name: 'UberX Ride', price: 18.50, quantity: 1 },
      { name: 'Service Fee', price: 2.85, quantity: 1 },
      { name: 'Tip', price: 2.30, quantity: 1 }
    ],
    tax: 0,
    tip: 2.30,
    imageUrl: 'https://images.unsplash.com/photo-1549924231-f129b911e442?w=400&h=300&fit=crop',
    status: 'processed'
  },
  {
    id: 'receipt-003',
    date: '2025-07-15',
    merchant: 'REI',
    amount: 127.00,
    category: 'Shopping',
    items: [
      { name: 'Hiking Boots', price: 89.99, quantity: 1 },
      { name: 'Water Bottle', price: 24.99, quantity: 1 },
      { name: 'Hiking Socks', price: 12.02, quantity: 1 }
    ],
    tax: 10.16,
    tip: 0,
    imageUrl: 'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=400&h=300&fit=crop',
    status: 'needs_review'
  }
];

// ============================================================================
// 4. MOCK GOALS DATA
// ============================================================================

export const mockGoals = [
  {
    id: 'goal-001',
    name: 'Emergency Fund',
    targetAmount: 10000,
    currentAmount: 6500,
    category: 'Savings',
    deadline: '2025-12-31',
    status: 'active',
    priority: 'high',
    description: 'Build emergency fund to cover 6 months of expenses',
    progress: 65
  },
  {
    id: 'goal-002',
    name: 'Vacation Fund',
    targetAmount: 3000,
    currentAmount: 1200,
    category: 'Travel',
    deadline: '2025-08-15',
    status: 'active',
    priority: 'medium',
    description: 'Save for summer vacation to Europe',
    progress: 40
  },
  {
    id: 'goal-003',
    name: 'New Laptop',
    targetAmount: 1500,
    currentAmount: 800,
    category: 'Technology',
    deadline: '2025-10-01',
    status: 'active',
    priority: 'medium',
    description: 'Save for new MacBook Pro',
    progress: 53
  },
  {
    id: 'goal-004',
    name: 'Home Down Payment',
    targetAmount: 50000,
    currentAmount: 15000,
    category: 'Housing',
    deadline: '2026-06-30',
    status: 'active',
    priority: 'high',
    description: 'Save for 20% down payment on house',
    progress: 30
  }
];

// ============================================================================
// 5. MOCK INSIGHTS DATA
// ============================================================================

export const mockInsights = [
  {
    id: 'insight-001',
    type: 'spending_pattern',
    title: 'High Coffee Spending',
    description: 'You spent $45 on coffee this month, 20% more than last month',
    category: 'Coffee & Cafes',
    amount: 45.00,
    trend: 'increasing',
    priority: 'medium',
    date: '2025-07-19',
    actionable: true,
    action: 'Consider brewing coffee at home to save $30/month'
  },
  {
    id: 'insight-002',
    type: 'budget_alert',
    title: 'Entertainment Budget Exceeded',
    description: 'You\'ve spent 120% of your entertainment budget this month',
    category: 'Entertainment',
    amount: 180.00,
    trend: 'exceeding',
    priority: 'high',
    date: '2025-07-18',
    actionable: true,
    action: 'Review subscription services and consider canceling unused ones'
  },
  {
    id: 'insight-003',
    type: 'savings_opportunity',
    title: 'Potential Savings Found',
    description: 'You could save $150/month by switching to generic brands',
    category: 'Groceries',
    amount: 150.00,
    trend: 'opportunity',
    priority: 'medium',
    date: '2025-07-17',
    actionable: true,
    action: 'Try generic alternatives for non-essential items'
  },
  {
    id: 'insight-004',
    type: 'income_optimization',
    title: 'Side Hustle Opportunity',
    description: 'Based on your skills, you could earn $500/month freelancing',
    category: 'Income',
    amount: 500.00,
    trend: 'opportunity',
    priority: 'low',
    date: '2025-07-16',
    actionable: true,
    action: 'Consider starting a freelance business in your field'
  }
];

// ============================================================================
// 6. MOCK DASHBOARD DATA
// ============================================================================

export const mockDashboardData = {
  user: mockUser,
  summary: {
    totalIncome: 4250.00,
    totalExpenses: 2345.67,
    netSavings: 1904.33,
    savingsRate: 44.8,
    monthlyBudget: 3000,
    budgetUtilization: 78.2
  },
  spendingByCategory: [
    { category: 'Groceries', amount: 456.78, percentage: 19.5 },
    { category: 'Transportation', amount: 345.23, percentage: 14.7 },
    { category: 'Entertainment', amount: 234.56, percentage: 10.0 },
    { category: 'Shopping', amount: 567.89, percentage: 24.2 },
    { category: 'Dining', amount: 234.12, percentage: 10.0 },
    { category: 'Healthcare', amount: 123.45, percentage: 5.3 },
    { category: 'Coffee & Cafes', amount: 45.67, percentage: 1.9 },
    { category: 'Home & Garden', amount: 156.78, percentage: 6.7 },
    { category: 'Other', amount: 121.19, percentage: 5.2 }
  ],
  recentTransactions: mockTransactions.slice(0, 5),
  upcomingBills: [
    { name: 'Rent', amount: 1200, dueDate: '2025-08-01', category: 'Housing' },
    { name: 'Electric Bill', amount: 85, dueDate: '2025-08-05', category: 'Utilities' },
    { name: 'Internet', amount: 65, dueDate: '2025-08-10', category: 'Utilities' },
    { name: 'Phone Bill', amount: 45, dueDate: '2025-08-15', category: 'Utilities' }
  ],
  goals: mockGoals,
  insights: mockInsights.slice(0, 3)
};

// ============================================================================
// 7. MOCK CATEGORIES
// ============================================================================

export const mockCategories = [
  'Income',
  'Groceries',
  'Transportation',
  'Entertainment',
  'Shopping',
  'Dining',
  'Healthcare',
  'Coffee & Cafes',
  'Home & Garden',
  'Utilities',
  'Housing',
  'Insurance',
  'Education',
  'Travel',
  'Gifts',
  'Charity',
  'Business',
  'Other'
];

// ============================================================================
// 8. MOCK MERCHANTS
// ============================================================================

export const mockMerchants = [
  'Whole Foods Market',
  'Uber',
  'Netflix',
  'Starbucks',
  'REI',
  'Tech Company Inc',
  'Shell',
  'Amazon',
  'Chipotle',
  'Spotify',
  'CVS',
  'Target',
  'Chevron',
  'Panera',
  'Home Depot',
  'Walmart',
  'Costco',
  'Trader Joe\'s',
  'McDonald\'s',
  'Subway'
];

// ============================================================================
// 9. MOCK ACCOUNTS/SOURCES
// ============================================================================

export const mockAccounts = [
  {
    id: 'chase-cc',
    name: 'Chase Credit Card',
    type: 'credit',
    balance: -2345.67,
    limit: 10000,
    lastFour: '1234'
  },
  {
    id: 'bank-account',
    name: 'Bank Account',
    type: 'checking',
    balance: 8500.45,
    limit: null,
    lastFour: '5678'
  },
  {
    id: 'savings-account',
    name: 'Savings Account',
    type: 'savings',
    balance: 15000.00,
    limit: null,
    lastFour: '9012'
  }
];

// ============================================================================
// 10. MOCK AI INSIGHTS
// ============================================================================

export const mockAIInsights = [
  {
    id: 'ai-001',
    type: 'spending_analysis',
    title: 'Your Coffee Habit is Costing You',
    content: 'You spend an average of $45/month on coffee. If you invested this amount instead, you could have $5,400 in 10 years assuming a 7% return.',
    category: 'Coffee & Cafes',
    impact: 'medium',
    actionable: true,
    suggestions: [
      'Brew coffee at home to save $30/month',
      'Use a coffee subscription service for better rates',
      'Limit coffee shop visits to weekends only'
    ]
  },
  {
    id: 'ai-002',
    type: 'budget_optimization',
    title: 'Subscription Audit Recommended',
    content: 'You have 8 active subscriptions totaling $89/month. 3 of these haven\'t been used in the last 30 days.',
    category: 'Entertainment',
    impact: 'high',
    actionable: true,
    suggestions: [
      'Cancel unused streaming services',
      'Consider family plans for shared services',
      'Set calendar reminders to review subscriptions quarterly'
    ]
  },
  {
    id: 'ai-003',
    type: 'savings_opportunity',
    title: 'Emergency Fund Progress',
    content: 'Great job! You\'re 65% to your emergency fund goal. At this rate, you\'ll reach your target by December 2025.',
    category: 'Savings',
    impact: 'positive',
    actionable: false,
    suggestions: [
      'Consider increasing monthly contributions to reach goal faster',
      'Look for additional income sources to boost savings'
    ]
  }
];

// ============================================================================
// 11. MOCK GAMIFICATION DATA
// ============================================================================

export const mockGamificationData = {
  level: 8,
  xp: 2450,
  xpToNextLevel: 500,
  badges: [
    { id: 'badge-001', name: 'First Upload', description: 'Uploaded your first receipt', earned: true, date: '2024-01-15' },
    { id: 'badge-002', name: 'Budget Master', description: 'Stayed under budget for 3 months', earned: true, date: '2024-04-15' },
    { id: 'badge-003', name: 'Saver', description: 'Saved $1000 in a month', earned: true, date: '2024-06-01' },
    { id: 'badge-004', name: 'Goal Crusher', description: 'Achieved 5 financial goals', earned: false, progress: 4 },
    { id: 'badge-005', name: 'AI Explorer', description: 'Used AI features 10 times', earned: false, progress: 7 }
  ],
  streaks: {
    login: 15,
    budgetTracking: 8,
    goalProgress: 12
  },
  achievements: [
    { id: 'ach-001', name: 'Consistent Tracker', description: 'Track expenses for 30 days', earned: true },
    { id: 'ach-002', name: 'Smart Spender', description: 'Reduce spending by 20%', earned: false, progress: 15 }
  ]
};

// ============================================================================
// 12. MOCK REPORTS DATA
// ============================================================================

export const mockReportsData = {
  monthlySpending: {
    '2025-01': 2800,
    '2025-02': 2650,
    '2025-03': 2900,
    '2025-04': 2750,
    '2025-05': 3100,
    '2025-06': 2850,
    '2025-07': 2345
  },
  categoryTrends: {
    'Groceries': [400, 380, 420, 390, 450, 410, 456],
    'Transportation': [300, 280, 320, 290, 350, 310, 345],
    'Entertainment': [200, 180, 220, 190, 250, 210, 234]
  },
  savingsHistory: {
    '2025-01': 1450,
    '2025-02': 1600,
    '2025-03': 1350,
    '2025-04': 1500,
    '2025-05': 1150,
    '2025-06': 1300,
    '2025-07': 1904
  }
};

// ============================================================================
// 13. EXPORT ALL MOCK DATA
// ============================================================================

export const mockData = {
  user: mockUser,
  transactions: mockTransactions,
  receipts: mockReceipts,
  goals: mockGoals,
  insights: mockInsights,
  dashboard: mockDashboardData,
  categories: mockCategories,
  merchants: mockMerchants,
  accounts: mockAccounts,
  aiInsights: mockAIInsights,
  gamification: mockGamificationData,
  reports: mockReportsData
};

export default mockData; 