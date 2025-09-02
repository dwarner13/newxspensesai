/**
 * AI Employee Processor
 * 
 * Main orchestrator that coordinates the shared data, specialized tasks,
 * and multi-employee collaboration system
 */

import { FinancialData, sharedFinancialData } from './sharedFinancialData';
import { AllEmployeeTasks, EmployeeTaskResult } from './aiEmployeeTasks';
import { taskRouter, UserRequest } from './taskRouter';
import { EmployeeDataAccess } from './employeeDataAccess';
import { multiEmployeeCollaboration, CollaborationResult } from './multiEmployeeCollaboration';

export interface AIEmployeeRequest {
  userInput: string;
  userId: string;
  context?: any;
  requestedEmployee?: string;
  includeFinancialData?: boolean;
}

export interface AIEmployeeResponse {
  success: boolean;
  employeeName: string;
  response: string;
  insights: string[];
  actions: string[];
  data: any;
  confidence: number;
  executionTime: number;
  collaboration?: CollaborationResult;
  error?: string;
}

/**
 * Main AI Employee Processor
 * Coordinates all AI employees and their specialized tasks
 */
export class AIEmployeeProcessor {
  private isInitialized = false;

  constructor() {
    this.initialize();
  }

  /**
   * Initialize the AI employee system
   */
  private async initialize(): Promise<void> {
    try {
      console.log('🚀 Initializing AI Employee Processor...');
      
      // Load initial data if available
      // This would typically load from Supabase
      
      this.isInitialized = true;
      console.log('✅ AI Employee Processor initialized successfully');
      
    } catch (error) {
      console.error('❌ Failed to initialize AI Employee Processor:', error);
      throw error;
    }
  }

  /**
   * Process user request with AI employees
   */
  async processRequest(request: AIEmployeeRequest): Promise<AIEmployeeResponse> {
    const startTime = Date.now();
    
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      console.log(`🎯 Processing request: "${request.userInput}"`);
      console.log(`👤 User: ${request.userId}`);
      console.log(`🤖 Requested Employee: ${request.requestedEmployee || 'Auto-route'}`);

      // Load financial data
      const financialData = await this.loadFinancialData(request.userId);
      
      // Route the request
      const routingResult = await this.routeRequest(request, financialData);
      
      // Execute the task
      const result = await this.executeTask(routingResult, financialData, request);
      
      const executionTime = Date.now() - startTime;
      
      return {
        success: true,
        employeeName: result.employeeName,
        response: result.personalityResponse,
        insights: result.insights,
        actions: result.actions,
        data: result.result,
        confidence: result.confidence,
        executionTime,
        collaboration: result.collaboration
      };
      
    } catch (error) {
      console.error('❌ Error processing AI employee request:', error);
      
      return {
        success: false,
        employeeName: 'System',
        response: 'I apologize, but I encountered an error while processing your request. Please try again.',
        insights: [],
        actions: [],
        data: null,
        confidence: 0,
        executionTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Load financial data for the user
   */
  private async loadFinancialData(userId: string): Promise<FinancialData> {
    try {
      // Try to load from Supabase
      await sharedFinancialData.loadFromSupabase(userId);
      return sharedFinancialData.getData();
      
    } catch (error) {
      console.warn('⚠️ Could not load data from Supabase, using empty data structure');
      return sharedFinancialData.getData();
    }
  }

  /**
   * Route the user request to appropriate employee(s)
   */
  private async routeRequest(
    request: AIEmployeeRequest, 
    financialData: FinancialData
  ): Promise<any> {
    const userRequest: UserRequest = {
      text: request.userInput,
      userId: request.userId,
      context: request.context,
      timestamp: new Date()
    };

    // If specific employee requested, route directly
    if (request.requestedEmployee) {
      return {
        routedTo: request.requestedEmployee,
        task: this.getDefaultTaskForEmployee(request.requestedEmployee),
        confidence: 0.9,
        reasoning: `Direct request for ${request.requestedEmployee}`,
        alternativeEmployees: []
      };
    }

    // Otherwise, use intelligent routing
    return await taskRouter.routeUserRequest(userRequest, financialData);
  }

  /**
   * Execute the routed task
   */
  private async executeTask(
    routingResult: any,
    financialData: FinancialData,
    request: AIEmployeeRequest
  ): Promise<EmployeeTaskResult & { collaboration?: CollaborationResult }> {
    
    // Handle multi-employee collaboration
    if (routingResult.routedTo === 'Multi-Employee' || routingResult.task.type === 'comprehensive_review') {
      const collaboration = await multiEmployeeCollaboration.executeComprehensiveReview(
        request.userInput,
        financialData,
        request.userId
      );
      
      return {
        taskId: 'comprehensive_review',
        employeeName: 'Prime',
        success: true,
        result: collaboration,
        insights: collaboration.insights,
        actions: collaboration.recommendations,
        personalityResponse: `I've brought in the full team for this comprehensive analysis! ${collaboration.summary}`,
        confidence: 0.9,
        executionTime: collaboration.executionTime,
        collaboration
      };
    }

    // Handle single employee tasks
    const employeeName = routingResult.routedTo;
    const task = routingResult.task;
    
    console.log(`🤖 Executing task with ${employeeName}: ${task.name}`);
    
    // Get employee-specific data access
    const dataAccess = new EmployeeDataAccess(financialData);
    const employeeData = this.getEmployeeData(employeeName, dataAccess);
    
    // Execute the specific task
    const result = await this.executeEmployeeTask(employeeName, task, employeeData, financialData);
    
    return result;
  }

  /**
   * Get employee-specific data
   */
  private getEmployeeData(employeeName: string, dataAccess: EmployeeDataAccess): any {
    switch (employeeName) {
      case 'Tag':
        return dataAccess.getCategorizationTasks();
      case 'Blitz':
        return dataAccess.getDebtOpportunities();
      case 'Crystal':
        return dataAccess.getPredictionData();
      case 'Fortune':
        return dataAccess.getBudgetReality();
      case 'Goalie':
        return dataAccess.getGoalProgress();
      case 'Wisdom':
        return dataAccess.getStrategicAnalysis();
      case 'SavageSally':
        return dataAccess.getRealityChecks();
      default:
        return {};
    }
  }

  /**
   * Execute a specific employee task
   */
  private async executeEmployeeTask(
    employeeName: string,
    task: any,
    employeeData: any,
    financialData: FinancialData
  ): Promise<EmployeeTaskResult> {
    
    const startTime = Date.now();
    
    try {
      // Get employee task definitions
      const employeeTasks = AllEmployeeTasks[employeeName as keyof typeof AllEmployeeTasks];
      
      if (!employeeTasks) {
        throw new Error(`Employee ${employeeName} not found`);
      }

      // Execute the task analysis
      const analysis = employeeTasks.analyzeData(financialData);
      
      // Generate insights based on the analysis
      const insights = this.generateInsightsForEmployee(employeeName, analysis, employeeData);
      
      // Generate actions
      const actions = this.generateActionsForEmployee(employeeName, analysis, employeeData);
      
      // Generate personality response
      const personalityResponse = this.generatePersonalityResponse(employeeName, analysis, employeeData);
      
      // Calculate confidence based on data quality
      const confidence = this.calculateConfidence(employeeName, analysis, employeeData);
      
      const executionTime = Date.now() - startTime;
      
      return {
        taskId: task.id,
        employeeName,
        success: true,
        result: {
          analysis,
          employeeData,
          task
        },
        insights,
        actions,
        personalityResponse,
        confidence,
        executionTime
      };
      
    } catch (error) {
      console.error(`❌ Error executing task for ${employeeName}:`, error);
      
      return {
        taskId: task.id,
        employeeName,
        success: false,
        result: null,
        insights: [`Error executing task: ${error instanceof Error ? error.message : 'Unknown error'}`],
        actions: [],
        personalityResponse: `I apologize, but I encountered an error while processing your request. Please try again.`,
        confidence: 0,
        executionTime: Date.now() - startTime
      };
    }
  }

  /**
   * Generate insights for a specific employee
   */
  private generateInsightsForEmployee(employeeName: string, analysis: any, employeeData: any): string[] {
    const insights: string[] = [];
    
    switch (employeeName) {
      case 'Tag':
        insights.push(`Found ${analysis.uncategorizedCount || 0} uncategorized transactions`);
        insights.push(`Identified ${analysis.totalMerchants || 0} unique merchants`);
        insights.push(`Categorization rate: ${analysis.categorizationRate?.toFixed(1) || 0}%`);
        break;
        
      case 'Blitz':
        insights.push(`Total debt: $${analysis.totalDebt || 0}`);
        insights.push(`High-interest debts: ${analysis.highInterestDebtCount || 0}`);
        insights.push(`Average interest rate: ${analysis.averageInterestRate?.toFixed(1) || 0}%`);
        break;
        
      case 'Crystal':
        insights.push(`Average monthly spending: $${analysis.averageMonthlySpending?.toFixed(2) || 0}`);
        insights.push(`Spending variability: $${analysis.spendingVariability?.toFixed(2) || 0}`);
        insights.push(`Spending trend: ${analysis.trend || 'stable'}`);
        break;
        
      case 'Fortune':
        insights.push(`Budget violations: ${analysis.budgetViolations || 0}`);
        insights.push(`Budget adherence rate: ${analysis.budgetAdherenceRate?.toFixed(1) || 0}%`);
        insights.push(`Total overage: $${analysis.totalSpent - analysis.totalBudgeted || 0}`);
        break;
        
      case 'Goalie':
        insights.push(`Active goals: ${analysis.activeGoalsCount || 0}`);
        insights.push(`Average progress: ${analysis.averageProgress?.toFixed(1) || 0}%`);
        insights.push(`Total goal value: $${analysis.totalGoalValue || 0}`);
        break;
        
      case 'Wisdom':
        insights.push(`Net worth: $${analysis.totalNetWorth || 0}`);
        insights.push(`Monthly income: $${analysis.monthlyIncome || 0}`);
        insights.push(`Debt-to-income ratio: ${analysis.debtToIncomeRatio?.toFixed(1) || 0}%`);
        break;
        
      case 'SavageSally':
        insights.push(`Luxury spending: $${analysis.luxurySpending || 0}`);
        insights.push(`Luxury percentage: ${analysis.luxurySpendingPercentage?.toFixed(1) || 0}%`);
        insights.push(`Average luxury transaction: $${analysis.averageLuxuryTransaction?.toFixed(2) || 0}`);
        break;
    }
    
    return insights;
  }

  /**
   * Generate actions for a specific employee
   */
  private generateActionsForEmployee(employeeName: string, analysis: any, employeeData: any): string[] {
    const actions: string[] = [];
    
    switch (employeeName) {
      case 'Tag':
        if (analysis.uncategorizedCount > 0) {
          actions.push('Categorize uncategorized transactions');
        }
        actions.push('Review spending patterns');
        actions.push('Update categorization rules');
        break;
        
      case 'Blitz':
        actions.push('Calculate debt payoff strategies');
        actions.push('Identify extra payment opportunities');
        actions.push('Set up debt payoff milestones');
        break;
        
      case 'Crystal':
        actions.push('Generate spending forecasts');
        actions.push('Identify upcoming expenses');
        actions.push('Analyze seasonal patterns');
        break;
        
      case 'Fortune':
        if (analysis.budgetViolations > 0) {
          actions.push('Address budget violations');
        }
        actions.push('Adjust unrealistic budgets');
        actions.push('Set up budget alerts');
        break;
        
      case 'Goalie':
        actions.push('Update goal progress');
        actions.push('Adjust goal timelines');
        actions.push('Celebrate achievements');
        break;
        
      case 'Wisdom':
        actions.push('Review investment strategy');
        actions.push('Analyze long-term trends');
        actions.push('Update financial plan');
        break;
        
      case 'SavageSally':
        actions.push('Call out luxury spending');
        actions.push('Suggest spending alternatives');
        actions.push('Provide reality checks');
        break;
    }
    
    return actions;
  }

  /**
   * Generate personality response for a specific employee
   */
  private generatePersonalityResponse(employeeName: string, analysis: any, employeeData: any): string {
    const responses: Record<string, string> = {
      Tag: `I found ${analysis.uncategorizedCount || 0} uncategorized transactions that are just begging to find their perfect category home! Let me organize this beautiful chaos for you! 🏷️`,
      
      Blitz: `SOLDIER! I've analyzed your financial battlefield and found $${analysis.totalDebt || 0} in debt to crush! Time to attack with precision! ⚡`,
      
      Crystal: `The data spirits whisper to me... I'm seeing some interesting patterns in your spending. Let me show you what's coming! 🔮`,
      
      Fortune: `Let's cut to the chase - you have ${analysis.budgetViolations || 0} budget violations. Time for some tough love about your spending reality! 💰`,
      
      Goalie: `I've been tracking your goals and you're making progress! ${analysis.activeGoalsCount || 0} active goals with ${analysis.averageProgress?.toFixed(1) || 0}% average progress. Keep pushing! 🥅`,
      
      Wisdom: `Based on my analysis, your net worth is $${analysis.totalNetWorth || 0} and your debt-to-income ratio is ${analysis.debtToIncomeRatio?.toFixed(1) || 0}%. Here's what I observe... 🧠`,
      
      SavageSally: `Honey, I've got some truth bombs for you! You're spending $${analysis.luxurySpending || 0} on luxury items (${analysis.luxurySpendingPercentage?.toFixed(1) || 0}% of your spending). Time to get real! 💅`
    };
    
    return responses[employeeName] || "I've analyzed your data and have some insights to share!";
  }

  /**
   * Calculate confidence based on data quality
   */
  private calculateConfidence(employeeName: string, analysis: any, employeeData: any): number {
    let confidence = 0.8; // Base confidence
    
    // Adjust based on data availability
    if (employeeName === 'Tag' && analysis.uncategorizedCount > 0) {
      confidence += 0.1; // More data to work with
    }
    
    if (employeeName === 'Blitz' && analysis.totalDebt > 0) {
      confidence += 0.1; // Debt data available
    }
    
    if (employeeName === 'Crystal' && analysis.averageMonthlySpending > 0) {
      confidence += 0.1; // Spending data available
    }
    
    // Cap at 1.0
    return Math.min(confidence, 1.0);
  }

  /**
   * Get default task for an employee
   */
  private getDefaultTaskForEmployee(employeeName: string): any {
    const employeeTasks = AllEmployeeTasks[employeeName as keyof typeof AllEmployeeTasks];
    
    if (!employeeTasks) {
      return {
        id: 'default',
        name: 'General Analysis',
        description: 'General financial analysis',
        priority: 'medium',
        estimatedTime: 30
      };
    }
    
    // Return the first high-priority task, or first task if none
    return employeeTasks.primaryTasks.find((task: any) => task.priority === 'high') || 
           employeeTasks.primaryTasks[0];
  }

  /**
   * Get available employees
   */
  getAvailableEmployees(): string[] {
    return Object.keys(AllEmployeeTasks);
  }

  /**
   * Get employee capabilities
   */
  getEmployeeCapabilities(employeeName: string): string[] {
    const employeeTasks = AllEmployeeTasks[employeeName as keyof typeof AllEmployeeTasks];
    
    if (!employeeTasks) {
      return [];
    }
    
    return employeeTasks.primaryTasks.map((task: any) => task.name);
  }

  /**
   * Get system status
   */
  getSystemStatus(): {
    initialized: boolean;
    dataLoaded: boolean;
    availableEmployees: string[];
    lastDataUpdate: Date | null;
  } {
    const dataInfo = sharedFinancialData.getDataInfo();
    
    return {
      initialized: this.isInitialized,
      dataLoaded: !dataInfo.isStale,
      availableEmployees: this.getAvailableEmployees(),
      lastDataUpdate: dataInfo.lastUpdated
    };
  }
}

// Global AI employee processor instance
export const aiEmployeeProcessor = new AIEmployeeProcessor();
