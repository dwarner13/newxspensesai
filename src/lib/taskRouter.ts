/**
 * Task Router System
 * 
 * Intelligently routes user requests to the appropriate AI employee
 * based on intent analysis and task specialization
 */

import { FinancialData } from './sharedFinancialData';
import { AllEmployeeTasks, EmployeeTaskResult } from './aiEmployeeTasks';

export interface UserRequest {
  text: string;
  userId: string;
  context?: any;
  timestamp?: Date;
}

export interface IntentAnalysis {
  type: string;
  confidence: number;
  entities: Record<string, any>;
  suggestedEmployee: string;
  reasoning: string;
}

export interface TaskRoutingResult {
  routedTo: string;
  task: any;
  confidence: number;
  reasoning: string;
  alternativeEmployees?: string[];
}

/**
 * Smart Task Assignment System
 */
export class TaskRouter {
  private intentPatterns: Map<string, RegExp[]> = new Map();
  private employeeCapabilities: Map<string, string[]> = new Map();

  constructor() {
    this.initializeIntentPatterns();
    this.initializeEmployeeCapabilities();
  }

  /**
   * Route user request to appropriate AI employee
   */
  async routeUserRequest(userRequest: UserRequest, financialData: FinancialData): Promise<TaskRoutingResult> {
    const intent = await this.analyzeIntent(userRequest);
    
    console.log(`🎯 Intent Analysis: ${intent.type} (${intent.confidence}% confidence)`);
    console.log(`🤖 Suggested Employee: ${intent.suggestedEmployee}`);
    console.log(`💭 Reasoning: ${intent.reasoning}`);

    switch (intent.type) {
      case 'categorize':
        return this.routeToEmployee('Tag', intent, financialData);
      
      case 'debt_help':
        return this.routeToEmployee('Blitz', intent, financialData);
      
      case 'predict_spending':
        return this.routeToEmployee('Crystal', intent, financialData);
      
      case 'budget_check':
        return this.routeToEmployee('Fortune', intent, financialData);
      
      case 'goal_progress':
        return this.routeToEmployee('Goalie', intent, financialData);
      
      case 'strategic_advice':
        return this.routeToEmployee('Wisdom', intent, financialData);
      
      case 'reality_check':
        return this.routeToEmployee('SavageSally', intent, financialData);
      
      case 'comprehensive_review':
        return this.routeToMultiEmployee(intent, financialData);
      
      default:
        return this.routeToEmployee('Tag', intent, financialData); // Default fallback
    }
  }

  /**
   * Analyze user intent from request text
   */
  private async analyzeIntent(userRequest: UserRequest): Promise<IntentAnalysis> {
    const text = userRequest.text.toLowerCase();
    
    // Intent scoring system
    const intentScores: Record<string, number> = {
      categorize: 0,
      debt_help: 0,
      predict_spending: 0,
      budget_check: 0,
      goal_progress: 0,
      strategic_advice: 0,
      reality_check: 0,
      comprehensive_review: 0
    };

    // Categorization intent
    if (this.matchesPatterns(text, ['categorize', 'organize', 'sort', 'label', 'tag', 'uncategorized', 'category'])) {
      intentScores.categorize += 0.8;
    }

    // Debt help intent
    if (this.matchesPatterns(text, ['debt', 'payoff', 'credit card', 'loan', 'pay off', 'snowball', 'avalanche', 'minimum payment'])) {
      intentScores.debt_help += 0.8;
    }

    // Prediction intent
    if (this.matchesPatterns(text, ['predict', 'forecast', 'future', 'next month', 'upcoming', 'trend', 'pattern', 'what will happen'])) {
      intentScores.predict_spending += 0.8;
    }

    // Budget intent
    if (this.matchesPatterns(text, ['budget', 'over budget', 'budget violation', 'spending limit', 'budget check', 'how much left'])) {
      intentScores.budget_check += 0.8;
    }

    // Goal intent
    if (this.matchesPatterns(text, ['goal', 'save', 'target', 'progress', 'milestone', 'achievement', 'how am i doing'])) {
      intentScores.goal_progress += 0.8;
    }

    // Strategic advice intent
    if (this.matchesPatterns(text, ['strategy', 'plan', 'long term', 'investment', 'retirement', 'financial plan', 'advice'])) {
      intentScores.strategic_advice += 0.8;
    }

    // Reality check intent
    if (this.matchesPatterns(text, ['reality check', 'tough love', 'honest', 'truth', 'roast', 'savage', 'wake up call'])) {
      intentScores.reality_check += 0.8;
    }

    // Comprehensive review intent
    if (this.matchesPatterns(text, ['overview', 'summary', 'how am i doing', 'financial health', 'complete picture', 'everything'])) {
      intentScores.comprehensive_review += 0.8;
    }

    // Find the highest scoring intent
    const bestIntent = Object.entries(intentScores).reduce((a, b) => 
      intentScores[a[0]] > intentScores[b[0]] ? a : b
    );

    const confidence = Math.min(bestIntent[1] * 100, 100);
    const suggestedEmployee = this.getEmployeeForIntent(bestIntent[0]);
    const reasoning = this.getReasoningForIntent(bestIntent[0], text);

    return {
      type: bestIntent[0],
      confidence,
      entities: this.extractEntities(text),
      suggestedEmployee,
      reasoning
    };
  }

  /**
   * Route to specific employee
   */
  private routeToEmployee(employeeName: string, intent: IntentAnalysis, financialData: FinancialData): TaskRoutingResult {
    const employeeTasks = AllEmployeeTasks[employeeName as keyof typeof AllEmployeeTasks];
    
    if (!employeeTasks) {
      throw new Error(`Employee ${employeeName} not found`);
    }

    // Find the most relevant task for this employee
    const relevantTask = this.findMostRelevantTask(employeeTasks.primaryTasks, intent);
    
    return {
      routedTo: employeeName,
      task: relevantTask,
      confidence: intent.confidence,
      reasoning: `Routed to ${employeeName} for ${intent.type} - ${intent.reasoning}`,
      alternativeEmployees: this.getAlternativeEmployees(intent.type)
    };
  }

  /**
   * Route to multiple employees for comprehensive tasks
   */
  private routeToMultiEmployee(intent: IntentAnalysis, financialData: FinancialData): TaskRoutingResult {
    const employees = ['Tag', 'Blitz', 'Crystal', 'Fortune', 'Goalie', 'Wisdom'];
    
    return {
      routedTo: 'Multi-Employee',
      task: {
        type: 'comprehensive_review',
        employees: employees,
        coordination: 'Prime will coordinate all employees for comprehensive analysis'
      },
      confidence: intent.confidence,
      reasoning: 'Comprehensive review requires multiple AI employees working together',
      alternativeEmployees: employees
    };
  }

  /**
   * Find most relevant task for an employee based on intent
   */
  private findMostRelevantTask(tasks: any[], intent: IntentAnalysis): any {
    // For now, return the first high-priority task
    // In a more sophisticated system, this would use NLP to match intent to specific tasks
    return tasks.find(task => task.priority === 'high') || tasks[0];
  }

  /**
   * Get employee for specific intent type
   */
  private getEmployeeForIntent(intentType: string): string {
    const employeeMap: Record<string, string> = {
      categorize: 'Tag',
      debt_help: 'Blitz',
      predict_spending: 'Crystal',
      budget_check: 'Fortune',
      goal_progress: 'Goalie',
      strategic_advice: 'Wisdom',
      reality_check: 'SavageSally',
      comprehensive_review: 'Prime'
    };

    return employeeMap[intentType] || 'Tag';
  }

  /**
   * Get reasoning for intent classification
   */
  private getReasoningForIntent(intentType: string, text: string): string {
    const reasoningMap: Record<string, string> = {
      categorize: 'User is asking about organizing or categorizing transactions',
      debt_help: 'User needs help with debt management or payoff strategies',
      predict_spending: 'User wants to know about future spending or trends',
      budget_check: 'User is asking about budget status or violations',
      goal_progress: 'User wants to check progress on financial goals',
      strategic_advice: 'User is seeking long-term financial strategy advice',
      reality_check: 'User wants honest feedback or tough love about finances',
      comprehensive_review: 'User wants an overall financial health assessment'
    };

    return reasoningMap[intentType] || 'General financial assistance request';
  }

  /**
   * Get alternative employees for an intent
   */
  private getAlternativeEmployees(intentType: string): string[] {
    const alternatives: Record<string, string[]> = {
      categorize: ['Tag', 'Byte'],
      debt_help: ['Blitz', 'Fortune'],
      predict_spending: ['Crystal', 'Wisdom'],
      budget_check: ['Fortune', 'SavageSally'],
      goal_progress: ['Goalie', 'Spark'],
      strategic_advice: ['Wisdom', 'Prime'],
      reality_check: ['SavageSally', 'Fortune'],
      comprehensive_review: ['Prime', 'Wisdom']
    };

    return alternatives[intentType] || ['Tag'];
  }

  /**
   * Check if text matches any patterns
   */
  private matchesPatterns(text: string, patterns: string[]): boolean {
    return patterns.some(pattern => text.includes(pattern));
  }

  /**
   * Extract entities from text
   */
  private extractEntities(text: string): Record<string, any> {
    const entities: Record<string, any> = {};
    
    // Extract amounts
    const amountMatch = text.match(/\$?(\d+(?:\.\d{2})?)/);
    if (amountMatch) {
      entities.amount = parseFloat(amountMatch[1]);
    }

    // Extract time periods
    const timeMatch = text.match(/(this month|next month|this year|next year|last month|last year)/);
    if (timeMatch) {
      entities.timePeriod = timeMatch[1];
    }

    // Extract categories
    const categoryMatch = text.match(/(food|dining|entertainment|shopping|travel|utilities|housing|transportation)/);
    if (categoryMatch) {
      entities.category = categoryMatch[1];
    }

    return entities;
  }

  /**
   * Initialize intent patterns for better matching
   */
  private initializeIntentPatterns(): void {
    this.intentPatterns.set('categorize', [
      /categorize/i,
      /organize/i,
      /sort/i,
      /label/i,
      /tag/i,
      /uncategorized/i
    ]);

    this.intentPatterns.set('debt_help', [
      /debt/i,
      /payoff/i,
      /credit card/i,
      /loan/i,
      /pay off/i,
      /snowball/i,
      /avalanche/i
    ]);

    this.intentPatterns.set('predict_spending', [
      /predict/i,
      /forecast/i,
      /future/i,
      /next month/i,
      /upcoming/i,
      /trend/i,
      /pattern/i
    ]);

    this.intentPatterns.set('budget_check', [
      /budget/i,
      /over budget/i,
      /budget violation/i,
      /spending limit/i,
      /budget check/i
    ]);

    this.intentPatterns.set('goal_progress', [
      /goal/i,
      /save/i,
      /target/i,
      /progress/i,
      /milestone/i,
      /achievement/i
    ]);

    this.intentPatterns.set('strategic_advice', [
      /strategy/i,
      /plan/i,
      /long term/i,
      /investment/i,
      /retirement/i,
      /financial plan/i
    ]);

    this.intentPatterns.set('reality_check', [
      /reality check/i,
      /tough love/i,
      /honest/i,
      /truth/i,
      /roast/i,
      /savage/i
    ]);

    this.intentPatterns.set('comprehensive_review', [
      /overview/i,
      /summary/i,
      /how am i doing/i,
      /financial health/i,
      /complete picture/i
    ]);
  }

  /**
   * Initialize employee capabilities mapping
   */
  private initializeEmployeeCapabilities(): void {
    this.employeeCapabilities.set('Tag', [
      'categorization',
      'organization',
      'pattern recognition',
      'data cleaning'
    ]);

    this.employeeCapabilities.set('Blitz', [
      'debt payoff',
      'payment optimization',
      'cash flow analysis',
      'debt strategy'
    ]);

    this.employeeCapabilities.set('Crystal', [
      'predictions',
      'forecasting',
      'trend analysis',
      'future planning'
    ]);

    this.employeeCapabilities.set('Fortune', [
      'budget analysis',
      'reality checks',
      'spending accountability',
      'budget optimization'
    ]);

    this.employeeCapabilities.set('Goalie', [
      'goal tracking',
      'progress monitoring',
      'achievement strategies',
      'milestone celebration'
    ]);

    this.employeeCapabilities.set('Wisdom', [
      'strategic planning',
      'long-term analysis',
      'investment advice',
      'financial strategy'
    ]);

    this.employeeCapabilities.set('SavageSally', [
      'reality checks',
      'tough love',
      'luxury spending analysis',
      'spending accountability'
    ]);
  }
}

// Global task router instance
export const taskRouter = new TaskRouter();
