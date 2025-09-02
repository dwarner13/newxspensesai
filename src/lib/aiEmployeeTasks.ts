/**
 * AI Employee Task Specialization Framework
 * 
 * Each AI employee has specialized tasks and data access patterns
 * while accessing the same shared financial data
 */

import { FinancialData, Transaction, Debt, Budget, Goal } from './sharedFinancialData';

// Base interface for all AI employee tasks
export interface EmployeeTask {
  id: string;
  name: string;
  description: string;
  dataQueries: string[];
  personalityResponse: string;
  priority: 'low' | 'medium' | 'high';
  estimatedTime: number; // in seconds
}

export interface EmployeeTaskResult {
  taskId: string;
  employeeName: string;
  success: boolean;
  result: any;
  insights: string[];
  actions: string[];
  personalityResponse: string;
  confidence: number; // 0-1
  executionTime: number; // in seconds
}

// 🏷️ Tag (Categorization AI) - Data Task
export const TagTasks = {
  dataFocus: "All transactions for organization and categorization",
  
  primaryTasks: [
    {
      id: 'categorize_uncategorized',
      name: 'Categorize Uncategorized Transactions',
      description: 'Find and categorize transactions that have no category assigned',
      dataQueries: [
        "SELECT * FROM transactions WHERE category IS NULL",
        "Find potential duplicate transactions",
        "Identify unusual merchants or amounts",
        "Group by merchant, category, amount ranges"
      ],
      personalityResponse: "I found 23 uncategorized transactions that are just begging to find their perfect category home!",
      priority: 'high' as const,
      estimatedTime: 30
    },
    {
      id: 'identify_patterns',
      name: 'Identify Spending Patterns',
      description: 'Analyze spending patterns by merchant and category',
      dataQueries: [
        "Group transactions by merchant name",
        "Calculate spending by category over time",
        "Find recurring transactions",
        "Identify seasonal spending patterns"
      ],
      personalityResponse: "Look at these beautiful spending patterns! I can see you love your morning coffee runs ☕",
      priority: 'medium' as const,
      estimatedTime: 45
    },
    {
      id: 'suggest_categories',
      name: 'Suggest New Categories',
      description: 'Recommend new categories based on spending patterns',
      dataQueries: [
        "Find merchants that don't fit existing categories",
        "Analyze spending distribution",
        "Identify category gaps"
      ],
      personalityResponse: "I'm thinking we need a 'Treat Yo Self' category for all those Target runs! 🛍️",
      priority: 'low' as const,
      estimatedTime: 20
    },
    {
      id: 'learn_corrections',
      name: 'Learn from User Corrections',
      description: 'Update categorization rules based on user feedback',
      dataQueries: [
        "Track user corrections to categories",
        "Update merchant-to-category mappings",
        "Improve categorization accuracy"
      ],
      personalityResponse: "Thanks for the correction! I'm getting smarter every day 🧠",
      priority: 'medium' as const,
      estimatedTime: 15
    }
  ],

  analyzeData: (data: FinancialData) => {
    const uncategorized = data.transactions.filter(t => !t.category);
    const merchants = [...new Set(data.transactions.map(t => t.merchant).filter(Boolean))];
    const categories = [...new Set(data.transactions.map(t => t.category).filter(Boolean))];
    
    return {
      uncategorizedCount: uncategorized.length,
      totalMerchants: merchants.length,
      totalCategories: categories.length,
      categorizationRate: ((data.transactions.length - uncategorized.length) / data.transactions.length) * 100
    };
  }
};

// ⚡ Blitz (Debt Payoff) - Data Task
export const BlitzTasks = {
  dataFocus: "Debt accounts, payment history, and available cash flow",
  
  primaryTasks: [
    {
      id: 'calculate_payoff_strategies',
      name: 'Calculate Debt Payoff Strategies',
      description: 'Calculate snowball and avalanche debt payoff strategies',
      dataQueries: [
        "SELECT * FROM debts ORDER BY interest_rate DESC",
        "Find all debt payments and calculate progress",
        "Analyze spending to find potential extra payments",
        "Calculate payoff dates and interest savings"
      ],
      personalityResponse: "SOLDIER! I've analyzed your financial battlefield and found $347 we can redirect toward crushing that credit card debt!",
      priority: 'high' as const,
      estimatedTime: 60
    },
    {
      id: 'find_extra_payments',
      name: 'Find Extra Payment Opportunities',
      description: 'Identify money in budget that could accelerate debt payoff',
      dataQueries: [
        "Analyze spending vs budget to find surplus",
        "Identify discretionary spending that could be redirected",
        "Calculate potential extra payment amounts"
      ],
      personalityResponse: "I found $200 in dining out that could be your debt's worst nightmare! 💪",
      priority: 'high' as const,
      estimatedTime: 40
    },
    {
      id: 'track_progress',
      name: 'Track Debt Reduction Progress',
      description: 'Monitor debt payoff progress and celebrate milestones',
      dataQueries: [
        "Calculate total debt reduction over time",
        "Track individual debt account progress",
        "Identify upcoming milestones"
      ],
      personalityResponse: "BOOM! You just knocked out another $500 of debt! We're on fire! 🔥",
      priority: 'medium' as const,
      estimatedTime: 25
    },
    {
      id: 'calculate_savings',
      name: 'Calculate Interest Savings',
      description: 'Show potential interest savings from different payoff strategies',
      dataQueries: [
        "Calculate total interest paid under current strategy",
        "Compare with alternative strategies",
        "Show time and money savings"
      ],
      personalityResponse: "The avalanche method could save you $2,400 in interest! That's a vacation! 🏖️",
      priority: 'medium' as const,
      estimatedTime: 35
    }
  ],

  analyzeData: (data: FinancialData) => {
    const totalDebt = data.debts.reduce((sum, debt) => sum + debt.balance, 0);
    const highInterestDebts = data.debts.filter(d => d.interest_rate > 15);
    const monthlyPayments = data.debts.reduce((sum, debt) => sum + debt.minimum_payment, 0);
    
    return {
      totalDebt,
      highInterestDebtCount: highInterestDebts.length,
      totalMonthlyPayments: monthlyPayments,
      averageInterestRate: data.debts.length > 0 ? 
        data.debts.reduce((sum, debt) => sum + debt.interest_rate, 0) / data.debts.length : 0
    };
  }
};

// 🔮 Crystal (Predictions) - Data Task
export const CrystalTasks = {
  dataFocus: "Historical spending patterns for future forecasting",
  
  primaryTasks: [
    {
      id: 'predict_spending',
      name: 'Predict Future Spending',
      description: 'Forecast spending based on historical patterns',
      dataQueries: [
        "Analyze spending by month, season, day of week",
        "Identify recurring transactions and predict next occurrence",
        "Calculate spending trend directions and velocities",
        "Find seasonal spending patterns (holidays, summer, etc.)"
      ],
      personalityResponse: "The data spirits whisper to me... I'm seeing a 73% chance of a major car expense in the next 6 weeks based on your maintenance patterns!",
      priority: 'high' as const,
      estimatedTime: 90
    },
    {
      id: 'forecast_expenses',
      name: 'Forecast Upcoming Large Expenses',
      description: 'Predict upcoming large expenses like annual subscriptions',
      dataQueries: [
        "Find annual and recurring large expenses",
        "Predict next occurrence dates",
        "Calculate total upcoming expenses"
      ],
      personalityResponse: "I see a $1,200 insurance payment coming up in 3 weeks! Time to start saving! 💰",
      priority: 'high' as const,
      estimatedTime: 50
    },
    {
      id: 'identify_trends',
      name: 'Identify Seasonal Spending Trends',
      description: 'Find seasonal patterns in spending behavior',
      dataQueries: [
        "Group spending by season and month",
        "Identify holiday spending patterns",
        "Find summer vs winter spending differences"
      ],
      personalityResponse: "Your summer spending is 40% higher than winter - all those beach trips! 🏖️",
      priority: 'medium' as const,
      estimatedTime: 60
    },
    {
      id: 'cash_flow_forecast',
      name: 'Predict Cash Flow Shortfalls',
      description: 'Forecast potential cash flow issues',
      dataQueries: [
        "Calculate projected income vs expenses",
        "Identify potential shortfall periods",
        "Suggest timing adjustments"
      ],
      personalityResponse: "Warning! I predict a $300 shortfall in March. Time to tighten the belt! ⚠️",
      priority: 'high' as const,
      estimatedTime: 45
    }
  ],

  analyzeData: (data: FinancialData) => {
    const monthlySpending = data.transactions
      .filter(t => t.type === 'Debit')
      .reduce((acc, t) => {
        const month = t.date.substring(0, 7);
        acc[month] = (acc[month] || 0) + t.amount;
        return acc;
      }, {} as Record<string, number>);

    const averageMonthlySpending = Object.values(monthlySpending).reduce((sum, amount) => sum + amount, 0) / Object.keys(monthlySpending).length;
    
    return {
      averageMonthlySpending,
      spendingVariability: Math.max(...Object.values(monthlySpending)) - Math.min(...Object.values(monthlySpending)),
      totalMonths: Object.keys(monthlySpending).length,
      trend: 'increasing' // This would be calculated from actual data
    };
  }
};

// 💰 Fortune (Budget Reality) - Data Task
export const FortuneTasks = {
  dataFocus: "Budget vs. actual spending analysis",
  
  primaryTasks: [
    {
      id: 'compare_budget_actual',
      name: 'Compare Budget vs Actual Spending',
      description: 'Analyze how actual spending compares to budgeted amounts',
      dataQueries: [
        "Find spending that exceeds budget categories",
        "Calculate budget adherence percentages",
        "Identify budgets that need reality-based updates",
        "Real-time budget overage monitoring"
      ],
      personalityResponse: "Let's cut to the chase - you're 34% over budget in dining this month and it's only the 15th. Time for some tough love.",
      priority: 'high' as const,
      estimatedTime: 40
    },
    {
      id: 'identify_violations',
      name: 'Identify Budget Violations',
      description: 'Flag budget categories that are consistently over/under',
      dataQueries: [
        "Find categories consistently over budget",
        "Identify categories with unused budget",
        "Calculate violation frequency and amounts"
      ],
      personalityResponse: "Honey, that 'miscellaneous' category is not a financial strategy. You're $500 over! 💸",
      priority: 'high' as const,
      estimatedTime: 30
    },
    {
      id: 'calculate_performance',
      name: 'Calculate Budget Performance Metrics',
      description: 'Generate budget performance statistics',
      dataQueries: [
        "Calculate overall budget adherence rate",
        "Find best and worst performing categories",
        "Track budget performance over time"
      ],
      personalityResponse: "Your budget performance is 67%. That's a D+ in my book. We can do better! 📊",
      priority: 'medium' as const,
      estimatedTime: 35
    },
    {
      id: 'recommend_adjustments',
      name: 'Recommend Budget Adjustments',
      description: 'Suggest realistic budget adjustments based on spending patterns',
      dataQueries: [
        "Analyze historical spending vs budget",
        "Identify unrealistic budget categories",
        "Suggest new budget amounts"
      ],
      personalityResponse: "Your dining budget needs to be $400, not $200. Let's be realistic here! 🍕",
      priority: 'medium' as const,
      estimatedTime: 45
    }
  ],

  analyzeData: (data: FinancialData) => {
    const budgetViolations = data.budgets.filter(budget => {
      const spent = data.transactions
        .filter(t => t.category === budget.category && t.type === 'Debit')
        .reduce((sum, t) => sum + t.amount, 0);
      return spent > budget.budgeted_amount;
    });

    const totalBudgeted = data.budgets.reduce((sum, b) => sum + b.budgeted_amount, 0);
    const totalSpent = data.transactions
      .filter(t => t.type === 'Debit')
      .reduce((sum, t) => sum + t.amount, 0);

    return {
      budgetViolations: budgetViolations.length,
      totalBudgeted,
      totalSpent,
      budgetAdherenceRate: totalBudgeted > 0 ? ((totalBudgeted - Math.max(0, totalSpent - totalBudgeted)) / totalBudgeted) * 100 : 100
    };
  }
};

// 🥅 Goalie (Goal Progress) - Data Task
export const GoalieTasks = {
  dataFocus: "Goal progress tracking and achievement strategies",
  
  primaryTasks: [
    {
      id: 'track_progress',
      name: 'Track Goal Progress',
      description: 'Monitor progress toward financial goals',
      dataQueries: [
        "Calculate current progress toward each goal",
        "Identify goals that are behind schedule",
        "Find goals that are ahead of schedule"
      ],
      personalityResponse: "You're 78% of the way to your emergency fund goal! Keep pushing! 🎯",
      priority: 'high' as const,
      estimatedTime: 30
    },
    {
      id: 'suggest_strategies',
      name: 'Suggest Goal Achievement Strategies',
      description: 'Recommend strategies to accelerate goal achievement',
      dataQueries: [
        "Analyze spending to find money for goals",
        "Calculate different contribution scenarios",
        "Identify goal conflicts and priorities"
      ],
      personalityResponse: "If you redirect that $200 monthly coffee budget, you'll reach your goal 6 months early! ☕➡️💰",
      priority: 'high' as const,
      estimatedTime: 50
    },
    {
      id: 'celebrate_milestones',
      name: 'Celebrate Goal Milestones',
      description: 'Identify and celebrate goal achievements',
      dataQueries: [
        "Find recently completed goals",
        "Identify upcoming milestones",
        "Calculate achievement rates"
      ],
      personalityResponse: "BOOM! You just hit your first $1,000 savings goal! Time to celebrate! 🎉",
      priority: 'medium' as const,
      estimatedTime: 20
    },
    {
      id: 'adjust_goals',
      name: 'Adjust Goal Timelines',
      description: 'Recommend timeline adjustments based on progress',
      dataQueries: [
        "Analyze goal progress vs timeline",
        "Calculate realistic completion dates",
        "Suggest timeline modifications"
      ],
      personalityResponse: "Your vacation fund goal needs 3 more months. Let's adjust that timeline! 📅",
      priority: 'medium' as const,
      estimatedTime: 35
    }
  ],

  analyzeData: (data: FinancialData) => {
    const activeGoals = data.goals.filter(g => g.status === 'active');
    const completedGoals = data.goals.filter(g => g.status === 'completed');
    const totalProgress = activeGoals.reduce((sum, goal) => {
      return sum + (goal.current_amount / goal.target_amount);
    }, 0);

    return {
      activeGoalsCount: activeGoals.length,
      completedGoalsCount: completedGoals.length,
      averageProgress: activeGoals.length > 0 ? (totalProgress / activeGoals.length) * 100 : 0,
      totalGoalValue: activeGoals.reduce((sum, goal) => sum + goal.target_amount, 0)
    };
  }
};

// 🧠 Wisdom (Strategic Analysis) - Data Task
export const WisdomTasks = {
  dataFocus: "Long-term patterns, investment opportunities, and strategic planning",
  
  primaryTasks: [
    {
      id: 'analyze_patterns',
      name: 'Analyze Long-term Financial Patterns',
      description: 'Identify long-term trends and patterns in financial behavior',
      dataQueries: [
        "Analyze spending trends over 12+ months",
        "Identify investment performance patterns",
        "Find correlation between income and spending"
      ],
      personalityResponse: "Based on decades of market patterns, here's what I observe... Your spending has increased 12% year-over-year, but your income has only grown 8%. We need to address this gap.",
      priority: 'high' as const,
      estimatedTime: 120
    },
    {
      id: 'investment_analysis',
      name: 'Investment Opportunity Analysis',
      description: 'Analyze investment performance and opportunities',
      dataQueries: [
        "Calculate investment returns and performance",
        "Compare portfolio allocation to recommendations",
        "Identify rebalancing opportunities"
      ],
      personalityResponse: "Your portfolio is 80% stocks, 20% bonds. For your age, I'd recommend 70/30. Time to rebalance! 📈",
      priority: 'medium' as const,
      estimatedTime: 90
    },
    {
      id: 'strategic_planning',
      name: 'Strategic Financial Planning',
      description: 'Provide long-term strategic financial advice',
      dataQueries: [
        "Analyze overall financial health",
        "Identify strategic opportunities",
        "Calculate long-term projections"
      ],
      personalityResponse: "At your current savings rate, you'll have $2.3M at retirement. But if you increase it by 5%, you'll have $3.1M. The choice is yours.",
      priority: 'high' as const,
      estimatedTime: 150
    }
  ],

  analyzeData: (data: FinancialData) => {
    const totalNetWorth = data.accounts.reduce((sum, acc) => sum + acc.balance, 0) +
      data.investments.reduce((sum, inv) => sum + inv.total_value, 0) -
      data.debts.reduce((sum, debt) => sum + debt.balance, 0);

    const monthlyIncome = data.income
      .filter(i => i.is_active)
      .reduce((sum, inc) => {
        const multiplier = inc.frequency === 'monthly' ? 1 : 
          inc.frequency === 'weekly' ? 4.33 : 
          inc.frequency === 'biweekly' ? 2.17 : 
          inc.frequency === 'yearly' ? 0.083 : 0;
        return sum + (inc.amount * multiplier);
      }, 0);

    return {
      totalNetWorth,
      monthlyIncome,
      debtToIncomeRatio: monthlyIncome > 0 ? 
        (data.debts.reduce((sum, debt) => sum + debt.minimum_payment, 0) / monthlyIncome) * 100 : 0,
      investmentDiversification: data.investments.length
    };
  }
};

// 💅 Savage Sally (Reality Checks) - Data Task
export const SavageSallyTasks = {
  dataFocus: "Luxury spending analysis and reality checks",
  
  primaryTasks: [
    {
      id: 'luxury_analysis',
      name: 'Analyze Luxury Spending',
      description: 'Call out excessive luxury spending with sass',
      dataQueries: [
        "Find luxury purchases and subscriptions",
        "Calculate luxury spending as percentage of income",
        "Identify questionable 'investment' purchases"
      ],
      personalityResponse: "Honey, that $200 face cream isn't a financial strategy. It's a face cream. Your skin will thank you, but your bank account won't! 💅",
      priority: 'high' as const,
      estimatedTime: 40
    },
    {
      id: 'reality_check',
      name: 'Deliver Reality Checks',
      description: 'Provide tough love on financial decisions',
      dataQueries: [
        "Find purchases that don't align with goals",
        "Calculate opportunity cost of luxury spending",
        "Identify spending that exceeds reasonable limits"
      ],
      personalityResponse: "You spent $500 on clothes this month but only saved $100. Priorities, darling! 👗",
      priority: 'high' as const,
      estimatedTime: 35
    },
    {
      id: 'suggest_alternatives',
      name: 'Suggest Luxury Alternatives',
      description: 'Recommend more affordable alternatives to luxury spending',
      dataQueries: [
        "Find expensive recurring purchases",
        "Identify cheaper alternatives",
        "Calculate potential savings"
      ],
      personalityResponse: "That $15 coffee every day? That's $5,475 a year! Get a French press and save $4,000! ☕",
      priority: 'medium' as const,
      estimatedTime: 45
    }
  ],

  analyzeData: (data: FinancialData) => {
    const luxuryCategories = ['Entertainment', 'Shopping', 'Dining', 'Travel'];
    const luxurySpending = data.transactions
      .filter(t => t.type === 'Debit' && luxuryCategories.includes(t.category || ''))
      .reduce((sum, t) => sum + t.amount, 0);

    const totalSpending = data.transactions
      .filter(t => t.type === 'Debit')
      .reduce((sum, t) => sum + t.amount, 0);

    return {
      luxurySpending,
      luxurySpendingPercentage: totalSpending > 0 ? (luxurySpending / totalSpending) * 100 : 0,
      averageLuxuryTransaction: luxurySpending / data.transactions.filter(t => luxuryCategories.includes(t.category || '')).length
    };
  }
};

// Export all task definitions
export const AllEmployeeTasks = {
  Tag: TagTasks,
  Blitz: BlitzTasks,
  Crystal: CrystalTasks,
  Fortune: FortuneTasks,
  Goalie: GoalieTasks,
  Wisdom: WisdomTasks,
  SavageSally: SavageSallyTasks
};
