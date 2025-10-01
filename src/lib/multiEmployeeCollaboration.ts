/**
 * Multi-Employee Collaboration System
 * 
 * Handles complex tasks that require multiple AI employees working together
 * with Prime coordinating the entire team
 */

import { FinancialData } from './sharedFinancialData';
import { AllEmployeeTasks, EmployeeTaskResult } from './aiEmployeeTasks';
import { EmployeeDataAccess } from './employeeDataAccess';
import { taskRouter } from './taskRouter';

export interface CollaborationTask {
  id: string;
  name: string;
  description: string;
  requiredEmployees: string[];
  coordinator: string;
  priority: 'low' | 'medium' | 'high';
  estimatedDuration: number; // in seconds
}

export interface CollaborationResult {
  taskId: string;
  coordinator: string;
  participants: string[];
  results: EmployeeTaskResult[];
  summary: string;
  insights: string[];
  recommendations: string[];
  executionTime: number;
  success: boolean;
}

export interface EmployeeContribution {
  employeeName: string;
  contribution: string;
  insights: string[];
  data: any;
  confidence: number;
}

/**
 * Multi-Employee Collaboration Manager
 * Prime coordinates all employees for complex tasks
 */
export class MultiEmployeeCollaboration {
  private collaborationTasks: Map<string, CollaborationTask> = new Map();

  constructor() {
    this.initializeCollaborationTasks();
  }

  /**
   * Execute a comprehensive financial review with multiple employees
   */
  async executeComprehensiveReview(
    userRequest: string, 
    financialData: FinancialData, 
    userId: string
  ): Promise<CollaborationResult> {
    const startTime = Date.now();
    
    console.log('🎯 Prime coordinating comprehensive financial review...');
    
    // Prime brings in the full team
    const participants = ['Tag', 'Blitz', 'Crystal', 'Fortune', 'Goalie', 'Wisdom'];
    const results: EmployeeTaskResult[] = [];
    const contributions: EmployeeContribution[] = [];

    // Each employee analyzes the same data from their perspective
    for (const employeeName of participants) {
      try {
        console.log(`🤖 ${employeeName} analyzing data...`);
        
        const contribution = await this.getEmployeeContribution(employeeName, financialData, userRequest);
        contributions.push(contribution);
        
        const result: EmployeeTaskResult = {
          taskId: `comprehensive_review_${employeeName.toLowerCase()}`,
          employeeName,
          success: true,
          result: contribution.data,
          insights: contribution.insights,
          actions: this.generateActionsForEmployee(employeeName, contribution.data),
          personalityResponse: this.generatePersonalityResponse(employeeName, contribution),
          confidence: contribution.confidence,
          executionTime: 30 // Placeholder
        };
        
        results.push(result);
        
      } catch (error) {
        console.error(`❌ Error with ${employeeName}:`, error);
        
        const errorResult: EmployeeTaskResult = {
          taskId: `comprehensive_review_${employeeName.toLowerCase()}`,
          employeeName,
          success: false,
          result: null,
          insights: [`${employeeName} encountered an error during analysis`],
          actions: [],
          personalityResponse: `Sorry, I had trouble analyzing your data. Let me try again!`,
          confidence: 0,
          executionTime: 0
        };
        
        results.push(errorResult);
      }
    }

    // Prime synthesizes all contributions
    const summary = this.synthesizeResults(contributions);
    const insights = this.extractKeyInsights(contributions);
    const recommendations = this.generateRecommendations(contributions);

    const executionTime = Date.now() - startTime;

    return {
      taskId: 'comprehensive_review',
      coordinator: 'Prime',
      participants,
      results,
      summary,
      insights,
      recommendations,
      executionTime,
      success: results.every(r => r.success)
    };
  }

  /**
   * Execute a debt optimization task with Blitz and Fortune
   */
  async executeDebtOptimization(
    userRequest: string,
    financialData: FinancialData,
    userId: string
  ): Promise<CollaborationResult> {
    const startTime = Date.now();
    
    console.log('🎯 Prime coordinating debt optimization...');
    
    const participants = ['Blitz', 'Fortune'];
    const results: EmployeeTaskResult[] = [];
    const contributions: EmployeeContribution[] = [];

    // Blitz analyzes debt payoff strategies
    const blitzContribution = await this.getEmployeeContribution('Blitz', financialData, userRequest);
    contributions.push(blitzContribution);

    // Fortune analyzes budget reality
    const fortuneContribution = await this.getEmployeeContribution('Fortune', financialData, userRequest);
    contributions.push(fortuneContribution);

    // Generate results
    for (const contribution of contributions) {
      const result: EmployeeTaskResult = {
        taskId: `debt_optimization_${contribution.employeeName.toLowerCase()}`,
        employeeName: contribution.employeeName,
        success: true,
        result: contribution.data,
        insights: contribution.insights,
        actions: this.generateActionsForEmployee(contribution.employeeName, contribution.data),
        personalityResponse: this.generatePersonalityResponse(contribution.employeeName, contribution),
        confidence: contribution.confidence,
        executionTime: 45
      };
      
      results.push(result);
    }

    const summary = this.synthesizeDebtOptimizationResults(contributions);
    const insights = this.extractDebtInsights(contributions);
    const recommendations = this.generateDebtRecommendations(contributions);

    const executionTime = Date.now() - startTime;

    return {
      taskId: 'debt_optimization',
      coordinator: 'Prime',
      participants,
      results,
      summary,
      insights,
      recommendations,
      executionTime,
      success: true
    };
  }

  /**
   * Execute a spending analysis with Tag, Crystal, and Savage Sally
   */
  async executeSpendingAnalysis(
    userRequest: string,
    financialData: FinancialData,
    userId: string
  ): Promise<CollaborationResult> {
    const startTime = Date.now();
    
    console.log('🎯 Prime coordinating spending analysis...');
    
    const participants = ['Tag', 'Crystal', 'SavageSally'];
    const results: EmployeeTaskResult[] = [];
    const contributions: EmployeeContribution[] = [];

    // Each employee analyzes spending from their perspective
    for (const employeeName of participants) {
      const contribution = await this.getEmployeeContribution(employeeName, financialData, userRequest);
      contributions.push(contribution);

      const result: EmployeeTaskResult = {
        taskId: `spending_analysis_${employeeName.toLowerCase()}`,
        employeeName,
        success: true,
        result: contribution.data,
        insights: contribution.insights,
        actions: this.generateActionsForEmployee(employeeName, contribution.data),
        personalityResponse: this.generatePersonalityResponse(employeeName, contribution),
        confidence: contribution.confidence,
        executionTime: 35
      };
      
      results.push(result);
    }

    const summary = this.synthesizeSpendingAnalysisResults(contributions);
    const insights = this.extractSpendingInsights(contributions);
    const recommendations = this.generateSpendingRecommendations(contributions);

    const executionTime = Date.now() - startTime;

    return {
      taskId: 'spending_analysis',
      coordinator: 'Prime',
      participants,
      results,
      summary,
      insights,
      recommendations,
      executionTime,
      success: true
    };
  }

  /**
   * Get employee contribution for a specific task
   */
  private async getEmployeeContribution(
    employeeName: string,
    financialData: FinancialData,
    userRequest: string
  ): Promise<EmployeeContribution> {
    const dataAccess = new EmployeeDataAccess(financialData);
    
    let data: any;
    let insights: string[] = [];
    let confidence = 0.8;

    switch (employeeName) {
      case 'Tag':
        data = dataAccess.getCategorizationTasks();
        insights = [
          `Found ${data.queries.uncategorized?.length || 0} uncategorized transactions`,
          `Identified ${data.queries.duplicates?.length || 0} potential duplicates`,
          `Spotted ${data.queries.outliers?.length || 0} unusual transactions`
        ];
        break;

      case 'Blitz':
        data = dataAccess.getDebtOpportunities();
        insights = [
          `Total debt: $${data.queries.debts?.reduce((sum: number, debt: any) => sum + debt.balance, 0) || 0}`,
          `Extra payment potential: $${data.queries.extraCash?.extraPaymentPotential || 0}`,
          `Found ${data.queries.strategies?.snowball?.length || 0} debt accounts to optimize`
        ];
        break;

      case 'Crystal':
        data = dataAccess.getPredictionData();
        insights = [
          `Average monthly spending: $${data.queries.historicalPatterns?.averageMonthlyExpenses || 0}`,
          `Spending trend: ${data.queries.historicalPatterns?.trend || 'stable'}`,
          `Found ${data.queries.recurringItems?.length || 0} recurring transactions`
        ];
        break;

      case 'Fortune':
        data = dataAccess.getBudgetReality();
        insights = [
          `Budget adherence rate: ${data.queries.performance?.adherenceRate || 0}%`,
          `Budget violations: ${data.queries.violations?.length || 0}`,
          `Total overage: $${data.queries.performance?.overage || 0}`
        ];
        break;

      case 'Goalie':
        data = dataAccess.getGoalProgress();
        insights = [
          `Active goals: ${data.queries.progress?.length || 0}`,
          `Average progress: ${data.queries.progress?.reduce((sum: number, goal: any) => sum + goal.progress, 0) / (data.queries.progress?.length || 1) || 0}%`,
          `Goals on track: ${data.queries.progress?.filter((goal: any) => goal.onTrack).length || 0}`
        ];
        break;

      case 'Wisdom':
        data = dataAccess.getStrategicAnalysis();
        insights = [
          `Net worth: $${data.queries.longTermPatterns?.netWorth || 0}`,
          `Savings rate: ${data.queries.longTermPatterns?.savingsRate || 0}%`,
          `Financial health: ${data.queries.strategicInsights?.financialHealth || 'Unknown'}`
        ];
        break;

      case 'SavageSally':
        data = dataAccess.getRealityChecks();
        insights = [
          `Luxury spending: $${data.queries.luxurySpending?.luxurySpending || 0}`,
          `Luxury percentage: ${data.queries.luxurySpending?.luxuryPercentage || 0}%`,
          `Reality checks: ${data.queries.realityChecks?.length || 0}`
        ];
        break;

      default:
        data = {};
        insights = ['No specific analysis available'];
        confidence = 0.5;
    }

    return {
      employeeName,
      contribution: this.generateContributionText(employeeName, data, insights),
      insights,
      data,
      confidence
    };
  }

  /**
   * Generate contribution text for an employee
   */
  private generateContributionText(employeeName: string, data: any, insights: string[]): string {
    const contributionMap: Record<string, string> = {
      Tag: `I've analyzed your transaction data and found ${insights[0]}. ${insights[1]} and ${insights[2]}. Let me help you get organized!`,
      Blitz: `I've reviewed your debt situation and found ${insights[0]}. ${insights[1]} and ${insights[2]}. Time to attack that debt!`,
      Crystal: `I've looked into your spending patterns and found ${insights[0]}. ${insights[1]} and ${insights[2]}. Let me show you what's coming!`,
      Fortune: `I've checked your budget reality and found ${insights[0]}. ${insights[1]} and ${insights[2]}. Time for some tough love!`,
      Goalie: `I've tracked your goal progress and found ${insights[0]}. ${insights[1]} and ${insights[2]}. Let's keep pushing forward!`,
      Wisdom: `I've analyzed your financial strategy and found ${insights[0]}. ${insights[1]} and ${insights[2]}. Let me share some wisdom!`,
      SavageSally: `I've given you a reality check and found ${insights[0]}. ${insights[1]} and ${insights[2]}. Time to get real!`
    };

    return contributionMap[employeeName] || 'I've analyzed your data and have some insights to share.';
  }

  /**
   * Generate actions for an employee based on their data
   */
  private generateActionsForEmployee(employeeName: string, data: any): string[] {
    const actionMap: Record<string, string[]> = {
      Tag: [
        'Categorize uncategorized transactions',
        'Review and merge duplicate transactions',
        'Investigate outlier transactions',
        'Update categorization rules'
      ],
      Blitz: [
        'Calculate debt payoff strategies',
        'Identify extra payment opportunities',
        'Set up debt payoff milestones',
        'Track progress toward debt freedom'
      ],
      Crystal: [
        'Generate spending forecasts',
        'Identify upcoming large expenses',
        'Analyze seasonal spending patterns',
        'Predict cash flow issues'
      ],
      Fortune: [
        'Review budget violations',
        'Adjust unrealistic budgets',
        'Set up budget alerts',
        'Improve budget adherence'
      ],
      Goalie: [
        'Update goal progress',
        'Adjust goal timelines',
        'Celebrate achievements',
        'Set new milestones'
      ],
      Wisdom: [
        'Review investment strategy',
        'Analyze long-term trends',
        'Identify strategic opportunities',
        'Update financial plan'
      ],
      SavageSally: [
        'Call out luxury spending',
        'Suggest spending alternatives',
        'Provide reality checks',
        'Encourage better decisions'
      ]
    };

    return actionMap[employeeName] || ['Analyze data and provide insights'];
  }

  /**
   * Generate personality response for an employee
   */
  private generatePersonalityResponse(employeeName: string, contribution: EmployeeContribution): string {
    const responseMap: Record<string, string> = {
      Tag: "I found some transactions that need my attention! Let me organize this beautiful chaos for you! 🏷️",
      Blitz: "SOLDIER! I've analyzed your financial battlefield and found opportunities to crush that debt! ⚡",
      Crystal: "The data spirits whisper to me... I can see what's coming in your financial future! 🔮",
      Fortune: "Let's cut to the chase - I've got some tough love for you about your budget reality! 💰",
      Goalie: "I've been tracking your goals and I'm excited to share your progress! Keep pushing! 🥅",
      Wisdom: "Based on my analysis, here's what I observe about your long-term financial strategy... 🧠",
      SavageSally: "Honey, I've got some truth bombs for you about your spending habits! 💅"
    };

    return responseMap[employeeName] || "I've analyzed your data and have some insights to share!";
  }

  /**
   * Synthesize results from all employees
   */
  private synthesizeResults(contributions: EmployeeContribution[]): string {
    const employeeNames = contributions.map(c => c.employeeName).join(', ');
    const totalInsights = contributions.reduce((sum, c) => sum + c.insights.length, 0);
    
    return `Prime coordinated a comprehensive analysis with ${employeeNames}. Together, we generated ${totalInsights} insights about your financial situation. Each employee brought their unique perspective to provide you with a complete picture of your financial health.`;
  }

  /**
   * Extract key insights from all contributions
   */
  private extractKeyInsights(contributions: EmployeeContribution[]): string[] {
    const insights: string[] = [];
    
    contributions.forEach(contribution => {
      insights.push(...contribution.insights.map(insight => `${contribution.employeeName}: ${insight}`));
    });
    
    return insights;
  }

  /**
   * Generate recommendations based on all contributions
   */
  private generateRecommendations(contributions: EmployeeContribution[]): string[] {
    const recommendations: string[] = [];
    
    // Tag recommendations
    const tagContribution = contributions.find(c => c.employeeName === 'Tag');
    if (tagContribution?.data.queries.uncategorized?.length > 0) {
      recommendations.push('Categorize uncategorized transactions to improve data quality');
    }
    
    // Blitz recommendations
    const blitzContribution = contributions.find(c => c.employeeName === 'Blitz');
    if (blitzContribution?.data.queries.extraCash?.extraPaymentPotential > 0) {
      recommendations.push(`Redirect $${blitzContribution.data.queries.extraCash.extraPaymentPotential} toward debt payoff`);
    }
    
    // Fortune recommendations
    const fortuneContribution = contributions.find(c => c.employeeName === 'Fortune');
    if (fortuneContribution?.data.queries.violations?.length > 0) {
      recommendations.push('Address budget violations to improve financial discipline');
    }
    
    // Goalie recommendations
    const goalieContribution = contributions.find(c => c.employeeName === 'Goalie');
    if (goalieContribution?.data.queries.progress?.some((goal: any) => !goal.onTrack)) {
      recommendations.push('Adjust goal timelines or increase contributions to stay on track');
    }
    
    return recommendations;
  }

  /**
   * Synthesize debt optimization results
   */
  private synthesizeDebtOptimizationResults(contributions: EmployeeContribution[]): string {
    const blitzContribution = contributions.find(c => c.employeeName === 'Blitz');
    const fortuneContribution = contributions.find(c => c.employeeName === 'Fortune');
    
    return `Prime coordinated Blitz and Fortune for a comprehensive debt optimization analysis. Blitz identified debt payoff strategies while Fortune provided budget reality checks. Together, they've created a plan to accelerate your debt freedom.`;
  }

  /**
   * Extract debt-specific insights
   */
  private extractDebtInsights(contributions: EmployeeContribution[]): string[] {
    const insights: string[] = [];
    
    contributions.forEach(contribution => {
      if (contribution.employeeName === 'Blitz') {
        insights.push('Blitz: Identified optimal debt payoff strategy');
        insights.push('Blitz: Found extra payment opportunities');
      } else if (contribution.employeeName === 'Fortune') {
        insights.push('Fortune: Analyzed budget capacity for debt payments');
        insights.push('Fortune: Identified spending that could be redirected');
      }
    });
    
    return insights;
  }

  /**
   * Generate debt-specific recommendations
   */
  private generateDebtRecommendations(contributions: EmployeeContribution[]): string[] {
    const recommendations: string[] = [
      'Implement the recommended debt payoff strategy',
      'Redirect identified extra funds toward debt payments',
      'Set up automatic payments to ensure consistency',
      'Track progress monthly and celebrate milestones'
    ];
    
    return recommendations;
  }

  /**
   * Synthesize spending analysis results
   */
  private synthesizeSpendingAnalysisResults(contributions: EmployeeContribution[]): string {
    return `Prime coordinated Tag, Crystal, and Savage Sally for a comprehensive spending analysis. Tag organized your transactions, Crystal predicted future spending, and Savage Sally provided reality checks. Together, they've given you a complete picture of your spending habits.`;
  }

  /**
   * Extract spending-specific insights
   */
  private extractSpendingInsights(contributions: EmployeeContribution[]): string[] {
    const insights: string[] = [];
    
    contributions.forEach(contribution => {
      if (contribution.employeeName === 'Tag') {
        insights.push('Tag: Organized and categorized spending patterns');
      } else if (contribution.employeeName === 'Crystal') {
        insights.push('Crystal: Predicted future spending trends');
      } else if (contribution.employeeName === 'SavageSally') {
        insights.push('Savage Sally: Provided honest spending reality checks');
      }
    });
    
    return insights;
  }

  /**
   * Generate spending-specific recommendations
   */
  private generateSpendingRecommendations(contributions: EmployeeContribution[]): string[] {
    const recommendations: string[] = [
      'Improve transaction categorization for better insights',
      'Adjust spending based on predicted trends',
      'Reduce luxury spending identified by reality checks',
      'Set up spending alerts for better control'
    ];
    
    return recommendations;
  }

  /**
   * Initialize collaboration tasks
   */
  private initializeCollaborationTasks(): void {
    this.collaborationTasks.set('comprehensive_review', {
      id: 'comprehensive_review',
      name: 'Comprehensive Financial Review',
      description: 'Full team analysis of financial health',
      requiredEmployees: ['Tag', 'Blitz', 'Crystal', 'Fortune', 'Goalie', 'Wisdom'],
      coordinator: 'Prime',
      priority: 'high',
      estimatedDuration: 120});

    this.collaborationTasks.set('debt_optimization', {
      id: 'debt_optimization',
      name: 'Debt Optimization Strategy',
      description: 'Blitz and Fortune collaborate on debt payoff',
      requiredEmployees: ['Blitz', 'Fortune'],
      coordinator: 'Prime',
      priority: 'high',
      estimatedDuration: 90});

    this.collaborationTasks.set('spending_analysis', {
      id: 'spending_analysis',
      name: 'Spending Pattern Analysis',
      description: 'Tag, Crystal, and Savage Sally analyze spending',
      requiredEmployees: ['Tag', 'Crystal', 'SavageSally'],
      coordinator: 'Prime',
      priority: 'medium',
      estimatedDuration: 75});
  }
}

// Global collaboration manager instance
export const multiEmployeeCollaboration = new MultiEmployeeCollaboration();
