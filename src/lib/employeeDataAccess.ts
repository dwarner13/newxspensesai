/**
 * Employee-Specific Data Access Patterns
 * 
 * Each AI employee gets the same data but asks different questions
 * and focuses on different aspects of the financial data
 */

import { FinancialData, Transaction, Debt, Budget, Goal, Account, Investment } from './sharedFinancialData';

export interface EmployeeDataQuery {
  employeeName: string;
  dataFocus: string;
  queries: {
    uncategorized?: Transaction[];
    duplicates?: Transaction[];
    outliers?: Transaction[];
    patterns?: any;
    debts?: Debt[];
    payments?: any;
    extraCash?: any;
    milestones?: any;
    violations?: any;
    performance?: any;
    adjustments?: any;
    historicalPatterns?: any;
    recurringItems?: any;
    seasonalData?: any;
    progress?: any;
    strategies?: any;
    achievements?: any;
    timeline?: any;
    longTermPatterns?: any;
    investmentOpportunities?: any;
    strategicInsights?: any;
    luxurySpending?: any;
    realityChecks?: any;
    alternatives?: any;
  };
}

/**
 * Employee Data Access Class
 * Each employee gets same data but asks different questions
 */
export class EmployeeDataAccess {
  private data: FinancialData;

  constructor(data: FinancialData) {
    this.data = data;
  }

  /**
   * Tag asks: "What needs organizing?"
   */
  getCategorizationTasks(): EmployeeDataQuery {
    const uncategorized = this.data.transactions.filter(t => !t.category);
    const duplicates = this.findDuplicateTransactions();
    const outliers = this.findOutlierTransactions();
    const patterns = this.analyzeSpendingPatterns();

    return {
      employeeName: 'Tag',
      dataFocus: 'All transactions for organization and categorization',
      queries: {
        uncategorized,
        duplicates,
        outliers,
        patterns
      }
    };
  }

  /**
   * Blitz asks: "Where's the money for debt attacks?"
   */
  getDebtOpportunities(): EmployeeDataQuery {
    const currentDebts = this.data.debts.filter(d => d.status === 'active');
    const extraCashFlow = this.findExtraCash();
    const payoffStrategies = this.calculatePayoffStrategies();
    const milestones = this.calculateDebtMilestones();

    return {
      employeeName: 'Blitz',
      dataFocus: 'Debt accounts, payment history, and available cash flow',
      queries: {
        debts: currentDebts,
        extraCash: extraCashFlow,
        strategies: payoffStrategies,
        milestones
      }
    };
  }

  /**
   * Crystal asks: "What will happen next?"
   */
  getPredictionData(): EmployeeDataQuery {
    const historicalPatterns = this.analyzeHistoricalTrends();
    const seasonalData = this.findSeasonalPatterns();
    const recurringItems = this.identifyRecurringTransactions();

    return {
      employeeName: 'Crystal',
      dataFocus: 'Historical spending patterns for future forecasting',
      queries: {
        historicalPatterns,
        seasonalData,
        recurringItems
      }
    };
  }

  /**
   * Fortune asks: "What's the budget reality?"
   */
  getBudgetReality(): EmployeeDataQuery {
    const violations = this.findBudgetViolations();
    const performance = this.calculateBudgetPerformance();
    const adjustments = this.identifyBudgetAdjustments();

    return {
      employeeName: 'Fortune',
      dataFocus: 'Budget vs. actual spending analysis',
      queries: {
        violations,
        performance,
        adjustments
      }
    };
  }

  /**
   * Goalie asks: "How are we doing on goals?"
   */
  getGoalProgress(): EmployeeDataQuery {
    const progress = this.calculateGoalProgress();
    const strategies = this.suggestGoalStrategies();
    const achievements = this.findRecentAchievements();
    const timeline = this.analyzeGoalTimelines();

    return {
      employeeName: 'Goalie',
      dataFocus: 'Goal progress tracking and achievement strategies',
      queries: {
        progress,
        strategies,
        achievements,
        timeline
      }
    };
  }

  /**
   * Wisdom asks: "What's the big picture?"
   */
  getStrategicAnalysis(): EmployeeDataQuery {
    const longTermPatterns = this.analyzeLongTermPatterns();
    const investmentOpportunities = this.analyzeInvestmentOpportunities();
    const strategicInsights = this.generateStrategicInsights();

    return {
      employeeName: 'Wisdom',
      dataFocus: 'Long-term patterns, investment opportunities, and strategic planning',
      queries: {
        longTermPatterns,
        investmentOpportunities,
        strategicInsights
      }
    };
  }

  /**
   * Savage Sally asks: "What's the real truth?"
   */
  getRealityChecks(): EmployeeDataQuery {
    const luxurySpending = this.analyzeLuxurySpending();
    const realityChecks = this.generateRealityChecks();
    const alternatives = this.suggestAlternatives();

    return {
      employeeName: 'SavageSally',
      dataFocus: 'Luxury spending analysis and reality checks',
      queries: {
        luxurySpending,
        realityChecks,
        alternatives
      }
    };
  }

  // Helper methods for data analysis

  private findDuplicateTransactions(): Transaction[] {
    const duplicates: Transaction[] = [];
    const seen = new Map<string, Transaction>();

    for (const transaction of this.data.transactions) {
      const key = `${transaction.amount}-${transaction.description}-${transaction.date}`;
      if (seen.has(key)) {
        duplicates.push(transaction);
        duplicates.push(seen.get(key)!);
      } else {
        seen.set(key, transaction);
      }
    }

    return duplicates;
  }

  private findOutlierTransactions(): Transaction[] {
    const amounts = this.data.transactions.map(t => Math.abs(t.amount));
    const mean = amounts.reduce((sum, amount) => sum + amount, 0) / amounts.length;
    const variance = amounts.reduce((sum, amount) => sum + Math.pow(amount - mean, 2), 0) / amounts.length;
    const standardDeviation = Math.sqrt(variance);

    return this.data.transactions.filter(t => 
      Math.abs(t.amount) > mean + (2 * standardDeviation)
    );
  }

  private analyzeSpendingPatterns(): any {
    const patterns = {
      byMerchant: {} as Record<string, number>,
      byCategory: {} as Record<string, number>,
      byDayOfWeek: {} as Record<string, number>,
      byMonth: {} as Record<string, number>
    };

    this.data.transactions.forEach(transaction => {
      if (transaction.type === 'Debit') {
        // By merchant
        if (transaction.merchant) {
          patterns.byMerchant[transaction.merchant] = 
            (patterns.byMerchant[transaction.merchant] || 0) + transaction.amount;
        }

        // By category
        if (transaction.category) {
          patterns.byCategory[transaction.category] = 
            (patterns.byCategory[transaction.category] || 0) + transaction.amount;
        }

        // By day of week
        const dayOfWeek = new Date(transaction.date).toLocaleDateString('en-US', { weekday: 'long' });
        patterns.byDayOfWeek[dayOfWeek] = 
          (patterns.byDayOfWeek[dayOfWeek] || 0) + transaction.amount;

        // By month
        const month = transaction.date.substring(0, 7);
        patterns.byMonth[month] = 
          (patterns.byMonth[month] || 0) + transaction.amount;
      }
    });

    return patterns;
  }

  private findExtraCash(): any {
    const totalIncome = this.data.income
      .filter(i => i.is_active)
      .reduce((sum, inc) => {
        const multiplier = inc.frequency === 'monthly' ? 1 : 
          inc.frequency === 'weekly' ? 4.33 : 
          inc.frequency === 'biweekly' ? 2.17 : 
          inc.frequency === 'yearly' ? 0.083 : 0;
        return sum + (inc.amount * multiplier);
      }, 0);

    const totalExpenses = this.data.transactions
      .filter(t => t.type === 'Debit')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalDebtPayments = this.data.debts
      .filter(d => d.status === 'active')
      .reduce((sum, debt) => sum + debt.minimum_payment, 0);

    return {
      totalIncome,
      totalExpenses,
      totalDebtPayments,
      availableForDebt: totalIncome - totalExpenses,
      extraPaymentPotential: Math.max(0, totalIncome - totalExpenses - totalDebtPayments)
    };
  }

  private calculatePayoffStrategies(): any {
    const debts = this.data.debts.filter(d => d.status === 'active');
    
    // Snowball method (smallest balance first)
    const snowballOrder = [...debts].sort((a, b) => a.balance - b.balance);
    
    // Avalanche method (highest interest first)
    const avalancheOrder = [...debts].sort((a, b) => b.interest_rate - a.interest_rate);

    return {
      snowball: snowballOrder,
      avalanche: avalancheOrder,
      totalDebt: debts.reduce((sum, debt) => sum + debt.balance, 0),
      totalInterest: debts.reduce((sum, debt) => sum + (debt.balance * debt.interest_rate / 100), 0)
    };
  }

  private calculateDebtMilestones(): any {
    const debts = this.data.debts.filter(d => d.status === 'active');
    const milestones = debts.map(debt => ({
      debtId: debt.id,
      debtName: debt.name,
      currentBalance: debt.balance,
      nextMilestone: Math.floor(debt.balance / 1000) * 1000,
      progressToMilestone: (debt.balance % 1000) / 1000
    }));

    return milestones;
  }

  private analyzeHistoricalTrends(): any {
    const monthlyData = this.data.transactions.reduce((acc, transaction) => {
      const month = transaction.date.substring(0, 7);
      if (!acc[month]) {
        acc[month] = { income: 0, expenses: 0 };
      }
      
      if (transaction.type === 'Credit') {
        acc[month].income += transaction.amount;
      } else {
        acc[month].expenses += transaction.amount;
      }
      
      return acc;
    }, {} as Record<string, { income: number; expenses: number }>);

    return {
      monthlyData,
      trend: this.calculateTrend(Object.values(monthlyData).map(m => m.expenses)),
      averageMonthlyExpenses: Object.values(monthlyData).reduce((sum, m) => sum + m.expenses, 0) / Object.keys(monthlyData).length
    };
  }

  private findSeasonalPatterns(): any {
    const seasonalData = this.data.transactions.reduce((acc, transaction) => {
      const month = parseInt(transaction.date.substring(5, 7));
      const season = this.getSeason(month);
      
      if (!acc[season]) {
        acc[season] = { income: 0, expenses: 0, count: 0 };
      }
      
      if (transaction.type === 'Credit') {
        acc[season].income += transaction.amount;
      } else {
        acc[season].expenses += transaction.amount;
      }
      
      acc[season].count++;
      
      return acc;
    }, {} as Record<string, { income: number; expenses: number; count: number }>);

    return seasonalData;
  }

  private identifyRecurringTransactions(): any {
    const recurring = this.data.transactions.reduce((acc, transaction) => {
      const key = `${transaction.description}-${transaction.amount}`;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(transaction);
      return acc;
    }, {} as Record<string, Transaction[]>);

    // Filter to only include transactions that appear multiple times
    const recurringTransactions = Object.entries(recurring)
      .filter(([_, transactions]) => transactions.length > 1)
      .map(([key, transactions]) => ({
        pattern: key,
        transactions,
        frequency: transactions.length,
        averageAmount: transactions.reduce((sum, t) => sum + t.amount, 0) / transactions.length
      }));

    return recurringTransactions;
  }

  private findBudgetViolations(): any {
    const violations = this.data.budgets.map(budget => {
      const spent = this.data.transactions
        .filter(t => t.category === budget.category && t.type === 'Debit')
        .reduce((sum, t) => sum + t.amount, 0);

      return {
        budgetId: budget.id,
        category: budget.category,
        budgeted: budget.budgeted_amount,
        spent,
        overage: Math.max(0, spent - budget.budgeted_amount),
        percentage: (spent / budget.budgeted_amount) * 100
      };
    }).filter(v => v.overage > 0);

    return violations;
  }

  private calculateBudgetPerformance(): any {
    const totalBudgeted = this.data.budgets.reduce((sum, b) => sum + b.budgeted_amount, 0);
    const totalSpent = this.data.transactions
      .filter(t => t.type === 'Debit')
      .reduce((sum, t) => sum + t.amount, 0);

    return {
      totalBudgeted,
      totalSpent,
      adherenceRate: totalBudgeted > 0 ? ((totalBudgeted - Math.max(0, totalSpent - totalBudgeted)) / totalBudgeted) * 100 : 100,
      overage: Math.max(0, totalSpent - totalBudgeted)
    };
  }

  private identifyBudgetAdjustments(): any {
    const adjustments = this.data.budgets.map(budget => {
      const spent = this.data.transactions
        .filter(t => t.category === budget.category && t.type === 'Debit')
        .reduce((sum, t) => sum + t.amount, 0);

      const averageSpent = spent; // This would be calculated over multiple periods
      const suggestedBudget = Math.max(budget.budgeted_amount, averageSpent * 1.1); // 10% buffer

      return {
        budgetId: budget.id,
        category: budget.category,
        currentBudget: budget.budgeted_amount,
        actualSpent: spent,
        suggestedBudget,
        adjustment: suggestedBudget - budget.budgeted_amount
      };
    });

    return adjustments;
  }

  private calculateGoalProgress(): any {
    const activeGoals = this.data.goals.filter(g => g.status === 'active');
    
    return activeGoals.map(goal => ({
      goalId: goal.id,
      name: goal.name,
      targetAmount: goal.target_amount,
      currentAmount: goal.current_amount,
      progress: (goal.current_amount / goal.target_amount) * 100,
      remaining: goal.target_amount - goal.current_amount,
      daysRemaining: this.calculateDaysRemaining(goal.target_date),
      onTrack: this.isGoalOnTrack(goal)
    }));
  }

  private suggestGoalStrategies(): any {
    const activeGoals = this.data.goals.filter(g => g.status === 'active');
    
    return activeGoals.map(goal => {
      const monthlyContribution = this.calculateMonthlyContribution(goal);
      const strategies = [
        {
          name: 'Current Rate',
          monthlyContribution,
          completionDate: this.calculateCompletionDate(goal, monthlyContribution)
        },
        {
          name: 'Accelerated',
          monthlyContribution: monthlyContribution * 1.5,
          completionDate: this.calculateCompletionDate(goal, monthlyContribution * 1.5)
        }
      ];

      return {
        goalId: goal.id,
        strategies
      };
    });
  }

  private findRecentAchievements(): any {
    const completedGoals = this.data.goals.filter(g => g.status === 'completed');
    
    return completedGoals.map(goal => ({
      goalId: goal.id,
      name: goal.name,
      completedDate: goal.updated_at,
      achievement: 'Goal completed!'
    }));
  }

  private analyzeGoalTimelines(): any {
    const activeGoals = this.data.goals.filter(g => g.status === 'active');
    
    return activeGoals.map(goal => {
      const currentRate = this.calculateMonthlyContribution(goal);
      const projectedCompletion = this.calculateCompletionDate(goal, currentRate);
      const isOnTrack = this.isGoalOnTrack(goal);

      return {
        goalId: goal.id,
        name: goal.name,
        targetDate: goal.target_date,
        projectedCompletion,
        isOnTrack,
        adjustmentNeeded: !isOnTrack
      };
    });
  }

  private analyzeLongTermPatterns(): any {
    const netWorth = this.calculateNetWorth();
    const incomeGrowth = this.calculateIncomeGrowth();
    const expenseGrowth = this.calculateExpenseGrowth();

    return {
      netWorth,
      incomeGrowth,
      expenseGrowth,
      savingsRate: this.calculateSavingsRate(),
      debtToIncomeRatio: this.calculateDebtToIncomeRatio()
    };
  }

  private analyzeInvestmentOpportunities(): any {
    const currentInvestments = this.data.investments;
    const totalInvestmentValue = currentInvestments.reduce((sum, inv) => sum + inv.total_value, 0);
    const totalDebt = this.data.debts.reduce((sum, debt) => sum + debt.balance, 0);

    return {
      currentInvestments,
      totalInvestmentValue,
      totalDebt,
      investmentToDebtRatio: totalDebt > 0 ? totalInvestmentValue / totalDebt : 0,
      recommendations: this.generateInvestmentRecommendations()
    };
  }

  private generateStrategicInsights(): any {
    return {
      financialHealth: this.calculateFinancialHealth(),
      riskAssessment: this.assessRisk(),
      opportunities: this.identifyOpportunities(),
      threats: this.identifyThreats()
    };
  }

  private analyzeLuxurySpending(): any {
    const luxuryCategories = ['Entertainment', 'Shopping', 'Dining', 'Travel'];
    const luxurySpending = this.data.transactions
      .filter(t => t.type === 'Debit' && luxuryCategories.includes(t.category || ''))
      .reduce((sum, t) => sum + t.amount, 0);

    const totalSpending = this.data.transactions
      .filter(t => t.type === 'Debit')
      .reduce((sum, t) => sum + t.amount, 0);

    return {
      luxurySpending,
      totalSpending,
      luxuryPercentage: totalSpending > 0 ? (luxurySpending / totalSpending) * 100 : 0,
      luxuryTransactions: this.data.transactions.filter(t => 
        t.type === 'Debit' && luxuryCategories.includes(t.category || '')
      )
    };
  }

  private generateRealityChecks(): any {
    const realityChecks = [];
    
    // Check luxury spending
    const luxurySpending = this.analyzeLuxurySpending();
    if (luxurySpending.luxuryPercentage > 30) {
      realityChecks.push({
        type: 'luxury_spending',
        message: `You're spending ${luxurySpending.luxuryPercentage.toFixed(1)}% on luxury items. That's ${luxurySpending.luxurySpending.toFixed(2)} that could go toward your goals.`,
        severity: 'high'
      });
    }

    // Check budget violations
    const violations = this.findBudgetViolations();
    if (violations.length > 0) {
      realityChecks.push({
        type: 'budget_violations',
        message: `You have ${violations.length} budget violations. Time to get real about your spending.`,
        severity: 'medium'
      });
    }

    return realityChecks;
  }

  private suggestAlternatives(): any {
    const alternatives = [];
    
    // Find expensive recurring purchases
    const recurring = this.identifyRecurringTransactions();
    const expensiveRecurring = recurring.filter(r => r.averageAmount > 50);
    
    expensiveRecurring.forEach(item => {
      alternatives.push({
        current: item.pattern,
        cost: item.averageAmount,
        frequency: item.frequency,
        annualCost: item.averageAmount * item.frequency,
        alternatives: this.findAlternatives(item.pattern)
      });
    });

    return alternatives;
  }

  // Utility methods

  private getSeason(month: number): string {
    if (month >= 3 && month <= 5) return 'Spring';
    if (month >= 6 && month <= 8) return 'Summer';
    if (month >= 9 && month <= 11) return 'Fall';
    return 'Winter';
  }

  private calculateTrend(values: number[]): string {
    if (values.length < 2) return 'stable';
    
    const firstHalf = values.slice(0, Math.floor(values.length / 2));
    const secondHalf = values.slice(Math.floor(values.length / 2));
    
    const firstAvg = firstHalf.reduce((sum, val) => sum + val, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, val) => sum + val, 0) / secondHalf.length;
    
    const change = ((secondAvg - firstAvg) / firstAvg) * 100;
    
    if (change > 5) return 'increasing';
    if (change < -5) return 'decreasing';
    return 'stable';
  }

  private calculateDaysRemaining(targetDate: string): number {
    const target = new Date(targetDate);
    const now = new Date();
    const diffTime = target.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  private isGoalOnTrack(goal: Goal): boolean {
    const daysRemaining = this.calculateDaysRemaining(goal.target_date);
    const remainingAmount = goal.target_amount - goal.current_amount;
    const requiredMonthlyContribution = remainingAmount / (daysRemaining / 30);
    const currentMonthlyContribution = this.calculateMonthlyContribution(goal);
    
    return currentMonthlyContribution >= requiredMonthlyContribution;
  }

  private calculateMonthlyContribution(goal: Goal): number {
    // This would be calculated based on actual contributions to the goal
    // For now, return a placeholder
    return 100;
  }

  private calculateCompletionDate(goal: Goal, monthlyContribution: number): string {
    const remainingAmount = goal.target_amount - goal.current_amount;
    const monthsRemaining = Math.ceil(remainingAmount / monthlyContribution);
    const completionDate = new Date();
    completionDate.setMonth(completionDate.getMonth() + monthsRemaining);
    return completionDate.toISOString().split('T')[0];
  }

  private calculateNetWorth(): number {
    const assets = this.data.accounts.reduce((sum, acc) => sum + acc.balance, 0) +
      this.data.investments.reduce((sum, inv) => sum + inv.total_value, 0);
    const liabilities = this.data.debts.reduce((sum, debt) => sum + debt.balance, 0);
    return assets - liabilities;
  }

  private calculateIncomeGrowth(): number {
    // This would be calculated from historical income data
    return 5; // 5% growth
  }

  private calculateExpenseGrowth(): number {
    // This would be calculated from historical expense data
    return 3; // 3% growth
  }

  private calculateSavingsRate(): number {
    const totalIncome = this.data.income
      .filter(i => i.is_active)
      .reduce((sum, inc) => {
        const multiplier = inc.frequency === 'monthly' ? 1 : 
          inc.frequency === 'weekly' ? 4.33 : 
          inc.frequency === 'biweekly' ? 2.17 : 
          inc.frequency === 'yearly' ? 0.083 : 0;
        return sum + (inc.amount * multiplier);
      }, 0);

    const totalExpenses = this.data.transactions
      .filter(t => t.type === 'Debit')
      .reduce((sum, t) => sum + t.amount, 0);

    return totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0;
  }

  private calculateDebtToIncomeRatio(): number {
    const monthlyIncome = this.data.income
      .filter(i => i.is_active)
      .reduce((sum, inc) => {
        const multiplier = inc.frequency === 'monthly' ? 1 : 
          inc.frequency === 'weekly' ? 4.33 : 
          inc.frequency === 'biweekly' ? 2.17 : 
          inc.frequency === 'yearly' ? 0.083 : 0;
        return sum + (inc.amount * multiplier);
      }, 0);

    const monthlyDebtPayments = this.data.debts
      .filter(d => d.status === 'active')
      .reduce((sum, debt) => sum + debt.minimum_payment, 0);

    return monthlyIncome > 0 ? (monthlyDebtPayments / monthlyIncome) * 100 : 0;
  }

  private generateInvestmentRecommendations(): string[] {
    const recommendations = [];
    
    if (this.data.investments.length === 0) {
      recommendations.push('Consider starting with a low-cost index fund');
    }
    
    if (this.data.debts.length > 0) {
      recommendations.push('Pay off high-interest debt before investing');
    }
    
    return recommendations;
  }

  private calculateFinancialHealth(): string {
    const netWorth = this.calculateNetWorth();
    const savingsRate = this.calculateSavingsRate();
    const debtToIncome = this.calculateDebtToIncomeRatio();
    
    if (netWorth > 0 && savingsRate > 20 && debtToIncome < 30) {
      return 'Excellent';
    } else if (netWorth > 0 && savingsRate > 10 && debtToIncome < 50) {
      return 'Good';
    } else if (savingsRate > 0 && debtToIncome < 70) {
      return 'Fair';
    } else {
      return 'Needs Improvement';
    }
  }

  private assessRisk(): string {
    const debtToIncome = this.calculateDebtToIncomeRatio();
    const savingsRate = this.calculateSavingsRate();
    
    if (debtToIncome > 50 || savingsRate < 0) {
      return 'High';
    } else if (debtToIncome > 30 || savingsRate < 10) {
      return 'Medium';
    } else {
      return 'Low';
    }
  }

  private identifyOpportunities(): string[] {
    const opportunities = [];
    
    if (this.data.debts.length > 0) {
      opportunities.push('Debt consolidation could reduce interest payments');
    }
    
    if (this.calculateSavingsRate() > 20) {
      opportunities.push('High savings rate - consider increasing investments');
    }
    
    return opportunities;
  }

  private identifyThreats(): string[] {
    const threats = [];
    
    if (this.calculateDebtToIncomeRatio() > 40) {
      threats.push('High debt-to-income ratio increases financial risk');
    }
    
    if (this.calculateSavingsRate() < 10) {
      threats.push('Low savings rate limits financial flexibility');
    }
    
    return threats;
  }

  private findAlternatives(pattern: string): string[] {
    // This would use AI to suggest alternatives
    return [
      'Consider a cheaper alternative',
      'Look for discounts or coupons',
      'Buy in bulk to save money',
      'Consider DIY options'
    ];
  }
}
