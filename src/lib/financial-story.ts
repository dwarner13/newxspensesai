// Financial Story System - Central API for collecting data from all AI employees
// This system aggregates data from all AI employees to create comprehensive financial stories

export interface FinancialStoryData {
  timestamp: string;
  userId: string;
  storyId: string;
  period: {
    start: string;
    end: string;
  };
  employees: {
    byte: ByteData;
    tag: TagData;
    goalie: GoalieData;
    crystal: CrystalData;
    ledger: LedgerData;
    finley: FinleyData;
    prime: PrimeData;
  };
  insights: FinancialInsight[];
  storyHooks: StoryHook[];
  blogContent: string;
  status: 'collecting' | 'analyzing' | 'ready' | 'published';
}

export interface ByteData {
  totalTransactions: number;
  processedFiles: number;
  categories: CategoryBreakdown[];
  accuracy: string;
  recentImports: ImportSummary[];
  spendingPatterns: SpendingPattern[];
}

export interface TagData {
  totalCategories: number;
  categoryInsights: CategoryInsight[];
  autoCategorization: AutoCategorizationStats;
  categoryTrends: CategoryTrend[];
}

export interface GoalieData {
  activeGoals: number;
  completedGoals: number;
  goalProgress: GoalProgress[];
  financialMilestones: Milestone[];
  savingsRate: number;
}

export interface CrystalData {
  budgetStatus: BudgetStatus;
  spendingVsBudget: SpendingComparison[];
  budgetAlerts: BudgetAlert[];
  monthlyTrends: MonthlyTrend[];
}

export interface LedgerData {
  totalIncome: number;
  totalExpenses: number;
  netWorth: number;
  financialHealth: FinancialHealthScore;
  reports: ReportSummary[];
}

export interface FinleyData {
  overallScore: number;
  recommendations: Recommendation[];
  riskAssessment: RiskAssessment;
  financialAdvice: FinancialAdvice[];
}

export interface PrimeData {
  strategicDecisions: StrategicDecision[];
  executiveInsights: ExecutiveInsight[];
  longTermPlanning: LongTermPlan[];
  riskManagement: RiskManagement[];
}

export interface CategoryBreakdown {
  name: string;
  count: number;
  percentage: string;
  amount: number;
  trend: 'up' | 'down' | 'stable';
}

export interface ImportSummary {
  fileName: string;
  transactionCount: number;
  accuracy: string;
  date: string;
}

export interface SpendingPattern {
  category: string;
  pattern: string;
  insight: string;
  recommendation: string;
}

export interface CategoryInsight {
  category: string;
  insight: string;
  trend: string;
  recommendation: string;
}

export interface AutoCategorizationStats {
  accuracy: number;
  totalCategorized: number;
  manualOverrides: number;
  confidence: number;
}

export interface CategoryTrend {
  category: string;
  trend: 'increasing' | 'decreasing' | 'stable';
  percentage: number;
  period: string;
}

export interface GoalProgress {
  goalName: string;
  progress: number;
  target: number;
  status: 'on-track' | 'behind' | 'ahead';
  deadline: string;
}

export interface Milestone {
  name: string;
  achieved: boolean;
  date: string;
  impact: string;
}

export interface BudgetStatus {
  totalBudget: number;
  totalSpent: number;
  remaining: number;
  status: 'on-track' | 'over-budget' | 'under-budget';
}

export interface SpendingComparison {
  category: string;
  budgeted: number;
  actual: number;
  variance: number;
  status: 'over' | 'under' | 'on-track';
}

export interface BudgetAlert {
  type: 'overspend' | 'underspend' | 'milestone';
  category: string;
  message: string;
  severity: 'low' | 'medium' | 'high';
}

export interface MonthlyTrend {
  month: string;
  income: number;
  expenses: number;
  savings: number;
  trend: 'up' | 'down' | 'stable';
}

export interface FinancialHealthScore {
  overall: number;
  components: {
    spending: number;
    saving: number;
    debt: number;
    income: number;
  };
  recommendations: string[];
}

export interface ReportSummary {
  type: string;
  period: string;
  keyFindings: string[];
  recommendations: string[];
}

export interface Recommendation {
  type: 'spending' | 'saving' | 'investment' | 'debt';
  priority: 'high' | 'medium' | 'low';
  description: string;
  impact: string;
  action: string;
}

export interface RiskAssessment {
  level: 'low' | 'medium' | 'high';
  factors: string[];
  mitigation: string[];
  monitoring: string[];
}

export interface FinancialAdvice {
  category: string;
  advice: string;
  reasoning: string;
  priority: number;
}

export interface StrategicDecision {
  decision: string;
  rationale: string;
  impact: string;
  timeline: string;
}

export interface ExecutiveInsight {
  insight: string;
  context: string;
  recommendation: string;
  priority: 'high' | 'medium' | 'low';
}

export interface LongTermPlan {
  goal: string;
  timeline: string;
  steps: string[];
  progress: number;
}

export interface RiskManagement {
  risk: string;
  probability: number;
  impact: number;
  mitigation: string;
}

export interface FinancialInsight {
  type: 'spending' | 'saving' | 'investment' | 'debt' | 'income';
  insight: string;
  data: any;
  recommendation: string;
  priority: number;
}

export interface StoryHook {
  hook: string;
  context: string;
  data: any;
  podcastPotential: 'high' | 'medium' | 'low';
}

// Central Financial Story API
export class FinancialStoryAPI {
  private static instance: FinancialStoryAPI;
  private stories: Map<string, FinancialStoryData> = new Map();

  static getInstance(): FinancialStoryAPI {
    if (!FinancialStoryAPI.instance) {
      FinancialStoryAPI.instance = new FinancialStoryAPI();
    }
    return FinancialStoryAPI.instance;
  }

  // Collect data from all AI employees
  async collectEmployeeData(userId: string): Promise<FinancialStoryData> {
    const storyId = `story-${userId}-${Date.now()}`;
    
    const storyData: FinancialStoryData = {
      timestamp: new Date().toISOString(),
      userId,
      storyId,
      period: {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // Last 30 days
        end: new Date().toISOString()
      },
      employees: {
        byte: await this.collectByteData(userId),
        tag: await this.collectTagData(userId),
        goalie: await this.collectGoalieData(userId),
        crystal: await this.collectCrystalData(userId),
        ledger: await this.collectLedgerData(userId),
        finley: await this.collectFinleyData(userId),
        prime: await this.collectPrimeData(userId)
      },
      insights: [],
      storyHooks: [],
      blogContent: '',
      status: 'collecting'
    };

    // Store the story
    this.stories.set(storyId, storyData);
    
    // Generate insights and story hooks
    await this.generateInsights(storyData);
    await this.generateStoryHooks(storyData);
    
    // Generate blog content
    await this.generateBlogContent(storyData);
    
    storyData.status = 'ready';
    return storyData;
  }

  // Collect data from Byte (Smart Import)
  private async collectByteData(userId: string): Promise<ByteData> {
    // This would integrate with Byte's actual data
    return {
      totalTransactions: 0,
      processedFiles: 0,
      categories: [],
      accuracy: "0%",
      recentImports: [],
      spendingPatterns: []
    };
  }

  // Collect data from Tag (Smart Categories)
  private async collectTagData(userId: string): Promise<TagData> {
    return {
      totalCategories: 0,
      categoryInsights: [],
      autoCategorization: {
        accuracy: 0,
        totalCategorized: 0,
        manualOverrides: 0,
        confidence: 0
      },
      categoryTrends: []
    };
  }

  // Collect data from Goalie (Goals)
  private async collectGoalieData(userId: string): Promise<GoalieData> {
    return {
      activeGoals: 0,
      completedGoals: 0,
      goalProgress: [],
      financialMilestones: [],
      savingsRate: 0
    };
  }

  // Collect data from Crystal (Budgeting)
  private async collectCrystalData(userId: string): Promise<CrystalData> {
    return {
      budgetStatus: {
        totalBudget: 0,
        totalSpent: 0,
        remaining: 0,
        status: 'on-track'
      },
      spendingVsBudget: [],
      budgetAlerts: [],
      monthlyTrends: []
    };
  }

  // Collect data from Ledger (Reports)
  private async collectLedgerData(userId: string): Promise<LedgerData> {
    return {
      totalIncome: 0,
      totalExpenses: 0,
      netWorth: 0,
      financialHealth: {
        overall: 0,
        components: {
          spending: 0,
          saving: 0,
          debt: 0,
          income: 0
        },
        recommendations: []
      },
      reports: []
    };
  }

  // Collect data from Finley (Main Assistant)
  private async collectFinleyData(userId: string): Promise<FinleyData> {
    return {
      overallScore: 0,
      recommendations: [],
      riskAssessment: {
        level: 'low',
        factors: [],
        mitigation: [],
        monitoring: []
      },
      financialAdvice: []
    };
  }

  // Collect data from Prime (Executive)
  private async collectPrimeData(userId: string): Promise<PrimeData> {
    return {
      strategicDecisions: [],
      executiveInsights: [],
      longTermPlanning: [],
      riskManagement: []
    };
  }

  // Generate financial insights from all employee data
  private async generateInsights(storyData: FinancialStoryData): Promise<void> {
    const insights: FinancialInsight[] = [];
    
    // Analyze spending patterns
    if (storyData.employees.byte.totalTransactions > 0) {
      insights.push({
        type: 'spending',
        insight: `User processed ${storyData.employees.byte.totalTransactions} transactions with ${storyData.employees.byte.accuracy} accuracy`,
        data: storyData.employees.byte,
        recommendation: 'Continue using smart import for accurate categorization',
        priority: 1
      });
    }

    // Analyze goal progress
    if (storyData.employees.goalie.activeGoals > 0) {
      insights.push({
        type: 'saving',
        insight: `User has ${storyData.employees.goalie.activeGoals} active financial goals`,
        data: storyData.employees.goalie,
        recommendation: 'Monitor goal progress regularly',
        priority: 2
      });
    }

    storyData.insights = insights;
  }

  // Generate story hooks for podcasters
  private async generateStoryHooks(storyData: FinancialStoryData): Promise<void> {
    const hooks: StoryHook[] = [];
    
    if (storyData.employees.byte.totalTransactions > 0) {
      hooks.push({
        hook: "User successfully imported and categorized financial data",
        context: "Smart Import AI processed transactions with high accuracy",
        data: storyData.employees.byte,
        podcastPotential: 'high'
      });
    }

    if (storyData.employees.goalie.activeGoals > 0) {
      hooks.push({
        hook: "User is actively working toward financial goals",
        context: "Goal tracking shows commitment to financial improvement",
        data: storyData.employees.goalie,
        podcastPotential: 'medium'
      });
    }

    storyData.storyHooks = hooks;
  }

  // Generate blog content for podcasters
  private async generateBlogContent(storyData: FinancialStoryData): Promise<void> {
    let blogContent = `# Financial Story: ${storyData.userId}\n\n`;
    blogContent += `**Period:** ${storyData.period.start} to ${storyData.period.end}\n\n`;
    
    blogContent += `## Executive Summary\n\n`;
    blogContent += `This financial story provides a comprehensive overview of the user's financial journey, `;
    blogContent += `analyzed by our AI financial team. The data shows a user who is actively engaging with `;
    blogContent += `their financial data and working toward improvement.\n\n`;
    
    blogContent += `## Key Insights\n\n`;
    storyData.insights.forEach((insight, index) => {
      blogContent += `${index + 1}. **${insight.type.toUpperCase()}**: ${insight.insight}\n`;
      blogContent += `   - Recommendation: ${insight.recommendation}\n\n`;
    });
    
    blogContent += `## Story Hooks for Podcasters\n\n`;
    storyData.storyHooks.forEach((hook, index) => {
      blogContent += `${index + 1}. **${hook.hook}**\n`;
      blogContent += `   - Context: ${hook.context}\n`;
      blogContent += `   - Podcast Potential: ${hook.podcastPotential}\n\n`;
    });
    
    blogContent += `## AI Employee Contributions\n\n`;
    blogContent += `### Byte (Smart Import AI)\n`;
    blogContent += `- Processed ${storyData.employees.byte.totalTransactions} transactions\n`;
    blogContent += `- Accuracy: ${storyData.employees.byte.accuracy}\n\n`;
    
    blogContent += `### Goalie (Goals AI)\n`;
    blogContent += `- Active Goals: ${storyData.employees.goalie.activeGoals}\n`;
    blogContent += `- Completed Goals: ${storyData.employees.goalie.completedGoals}\n\n`;
    
    blogContent += `## Recommendations for Content Creation\n\n`;
    blogContent += `1. Focus on the user's commitment to financial data management\n`;
    blogContent += `2. Highlight the AI-powered insights and recommendations\n`;
    blogContent += `3. Discuss the comprehensive approach to financial health\n`;
    blogContent += `4. Emphasize the user's proactive goal-setting behavior\n\n`;
    
    blogContent += `---\n`;
    blogContent += `*Generated by Xpenses AI Financial Story System*\n`;
    blogContent += `*Timestamp: ${storyData.timestamp}*\n`;
    
    storyData.blogContent = blogContent;
  }

  // Get story by ID
  getStory(storyId: string): FinancialStoryData | undefined {
    return this.stories.get(storyId);
  }

  // Get all stories for a user
  getUserStories(userId: string): FinancialStoryData[] {
    return Array.from(this.stories.values()).filter(story => story.userId === userId);
  }

  // Export story as JSON
  exportStory(storyId: string): string | null {
    const story = this.stories.get(storyId);
    if (!story) return null;
    
    return JSON.stringify(story, null, 2);
  }

  // Export story as blog post
  exportBlogPost(storyId: string): string | null {
    const story = this.stories.get(storyId);
    if (!story) return null;
    
    return story.blogContent;
  }
}

// Export singleton instance
export const financialStoryAPI = FinancialStoryAPI.getInstance();

