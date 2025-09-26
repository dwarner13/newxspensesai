// Crystal AI - Financial Analysis Expert Knowledge Base

export const CRYSTAL_KNOWLEDGE_BASE = {
  // Financial Analysis Expertise
  spendingCategories: {
    essential: {
      housing: ['rent', 'mortgage', 'utilities', 'insurance', 'maintenance'],
      transportation: ['gas', 'car_payment', 'insurance', 'maintenance', 'public_transit'],
      food: ['groceries', 'dining_out', 'coffee', 'restaurants'],
      healthcare: ['medical', 'dental', 'pharmacy', 'insurance'],
      debt: ['credit_card_payments', 'loan_payments', 'student_loans']
    },
    discretionary: {
      entertainment: ['movies', 'streaming', 'games', 'concerts', 'sports'],
      shopping: ['clothing', 'electronics', 'home_goods', 'personal_care'],
      travel: ['flights', 'hotels', 'vacation', 'business_travel'],
      hobbies: ['fitness', 'crafts', 'sports_equipment', 'books'],
      dining: ['restaurants', 'bars', 'takeout', 'delivery']
    },
    business: {
      office: ['supplies', 'software', 'equipment', 'rent'],
      marketing: ['advertising', 'promotions', 'events'],
      professional: ['conferences', 'training', 'certifications'],
      travel: ['business_trips', 'client_meetings', 'conferences']
    }
  },

  // Financial Health Metrics
  financialHealthIndicators: {
    spendingRatio: {
      excellent: 'Essential expenses < 50% of income',
      good: 'Essential expenses 50-60% of income',
      fair: 'Essential expenses 60-70% of income',
      poor: 'Essential expenses > 70% of income'
    },
    savingsRate: {
      excellent: '> 20% of income saved',
      good: '15-20% of income saved',
      fair: '10-15% of income saved',
      poor: '< 10% of income saved'
    },
    debtToIncome: {
      excellent: '< 20%',
      good: '20-30%',
      fair: '30-40%',
      poor: '> 40%'
    }
  },

  // Spending Pattern Analysis
  patternRecognition: {
    seasonal: {
      holiday: ['November', 'December'],
      back_to_school: ['August', 'September'],
      summer: ['June', 'July', 'August'],
      tax_season: ['March', 'April']
    },
    behavioral: {
      impulse: 'Multiple small purchases in short timeframes',
      subscription: 'Recurring monthly/annual charges',
      lifestyle: 'Consistent spending patterns over time',
      emergency: 'Unusual large expenses'
    }
  },

  // Investment and Financial Planning
  investmentKnowledge: {
    assetClasses: ['stocks', 'bonds', 'real_estate', 'commodities', 'crypto'],
    riskLevels: {
      conservative: 'Bonds, CDs, money market accounts',
      moderate: 'Balanced portfolio of stocks and bonds',
      aggressive: 'Growth stocks, emerging markets, alternatives'
    },
    taxAdvantages: ['401k', 'IRA', 'Roth IRA', 'HSA', '529 plans']
  },

  // Market and Economic Insights
  economicIndicators: {
    inflation: 'Impact on purchasing power and savings',
    interestRates: 'Effect on loans, savings, and investments',
    employment: 'Income stability and spending confidence',
    gdp: 'Overall economic health and growth'
  },

  // Personalized Recommendations
  recommendationEngine: {
    budgetOptimization: {
      identify: 'Find areas of overspending or waste',
      suggest: 'Specific alternatives or reductions',
      implement: 'Actionable steps to improve spending'
    },
    savingsStrategies: {
      emergency: '3-6 months of expenses in liquid savings',
      short_term: 'High-yield savings for goals < 5 years',
      long_term: 'Investment accounts for retirement and major goals'
    },
    debtManagement: {
      avalanche: 'Pay highest interest debt first',
      snowball: 'Pay smallest debt first for motivation',
      consolidation: 'Combine debts for lower interest rates'
    }
  }
};

// Crystal's specialized analysis responses
export const CRYSTAL_RESPONSES = {
  spendingAnalysis: (totalSpent: number, categoryBreakdown: any) => 
    `💎 **Spending Analysis Complete**\n\nTotal Analyzed: $${totalSpent.toFixed(2)}\n\n**Category Breakdown:**\n${Object.entries(categoryBreakdown).map(([cat, amount]) => `• ${cat}: $${amount}`).join('\n')}\n\n**Key Insights:**\n• Your largest expense category is ${Object.keys(categoryBreakdown).reduce((a, b) => categoryBreakdown[a] > categoryBreakdown[b] ? a : b)}\n• Consider optimizing your spending in discretionary categories\n• Your essential expenses appear to be within healthy ranges`,

  financialHealth: (score: number, recommendations: string[]) => 
    `🏥 **Financial Health Assessment**\n\nOverall Score: ${score}/100\n\n**Recommendations:**\n${recommendations.map(rec => `• ${rec}`).join('\n')}\n\n**Next Steps:**\nI recommend focusing on the highest-impact improvements first. Would you like me to create a personalized action plan?`,

  trendAnalysis: (trends: any) => 
    `📈 **Spending Trend Analysis**\n\n**Monthly Trends:**\n${trends.monthly.map(trend => `• ${trend.month}: $${trend.amount} (${trend.change > 0 ? '+' : ''}${trend.change}%)`).join('\n')}\n\n**Seasonal Patterns:**\n${trends.seasonal.map(pattern => `• ${pattern.season}: Typically ${pattern.behavior}`).join('\n')}\n\n**Insights:**\nYour spending shows ${trends.overall_trend} trend over the analyzed period.`
};

// Crystal's personality and communication style
export const CRYSTAL_PERSONALITY = {
  communicationStyle: {
    tone: 'Professional yet empathetic, encouraging but honest',
    approach: 'Data-driven insights with human understanding',
    language: 'Clear, accessible financial terminology',
    structure: 'Organized analysis with actionable recommendations'
  },
  
  expertiseAreas: [
    'Personal Finance Analysis',
    'Spending Pattern Recognition', 
    'Budget Optimization',
    'Financial Goal Setting',
    'Investment Strategy',
    'Tax Planning',
    'Debt Management',
    'Risk Assessment'
  ],

  specialCapabilities: [
    'Real-time financial health scoring',
    'Predictive spending analysis',
    'Personalized budget recommendations',
    'Investment opportunity identification',
    'Tax optimization strategies',
    'Debt payoff planning',
    'Emergency fund assessment',
    'Retirement planning guidance'
  ]
};
