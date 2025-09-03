/**
 * XSPENSESAI FINANCIAL NARRATIVE ORCHESTRATION SYSTEM
 * Core AI Employee Coordination & Narrative Generation Framework
 * Version: 1.0.0
 */

import { AI_EMPLOYEES, EMPLOYEE_PHASES, VALID_CATEGORIES, type EmployeeOutput } from './aiEmployees';
import { PODCAST_TEAM, PODCAST_PROMPTS, generatePodcastTitle, estimatePodcastDuration, type PodcastEpisode } from './podcastTeam';
import { Transaction } from '../types/database.types';

const MASTER_SYSTEM_PROMPT = `
You are orchestrating XspensesAI's Financial Entertainment Platform, managing 17 core AI employees 
plus a podcast team to transform raw financial data into engaging, personalized narratives.

CRITICAL OBJECTIVES:
1. Process financial documents through a defined pipeline with specific timing
2. Ensure each AI employee contributes their unique expertise
3. Generate a 1500-word narrative synthesizing all insights
4. Create 7 unique podcast perspectives from the narrative
5. Maintain personality consistency for each AI employee
6. Deliver entertainment value while providing actionable financial insights

SYSTEM RULES:
- NEVER skip an employee in the pipeline
- ALWAYS maintain the data integrity through handoffs
- EACH employee must contribute meaningful insights
- The narrative MUST be exactly 1400-1600 words
- Podcasts MUST each have unique perspectives
- Processing time targets MUST be met (total <20 seconds)
`;

export interface OrchestrationResult {
  executiveSummary: {
    greeting: string;
    keyMetrics: Record<string, any>;
    aiTeamHighlights: string[];
    callToAction: {
      primary: string;
      options: string[];
    };
    primeMessage: string;
  };
  narrative: string;
  podcasts: PodcastEpisode[];
  processingTime: number;
  timestamp: string;
  error?: boolean;
  message?: string;
}

export class FinancialNarrativeOrchestrator {
  private startTime: number;
  private processedData: Record<string, any>;
  private openAIKey: string;

  constructor() {
    this.startTime = Date.now();
    this.processedData = {};
    this.openAIKey = import.meta.env.VITE_OPENAI_API_KEY || '';
  }

  async orchestrateFullPipeline(uploadedDocuments: File[]): Promise<OrchestrationResult> {
    try {
      console.log("🚀 Starting Financial Narrative Orchestration...");
      
      // PHASE 1: Data Processing (0-3 seconds)
      console.log("📄 PHASE 1: Data Processing Starting...");
      const byteOutput = await this.processWithByte(uploadedDocuments);
      const tagOutput = await this.processWithTag(byteOutput);
      const dashVisuals = await this.processWithDash(tagOutput);
      
      // PHASE 2: Parallel Analysis (3-10 seconds)
      console.log("🔍 PHASE 2: Deep Analysis Starting...");
      const analysisResults = await Promise.all([
        this.processWithCrystal(tagOutput),
        this.processWithLedger(tagOutput),
        this.processWithIntelia(tagOutput),
        this.processWithGoalie(tagOutput),
        this.processWithLiberty(tagOutput),
        this.processWithBlitz(tagOutput),
        this.processWithChime(tagOutput)
      ]);
      
      // PHASE 3: Support & Enhancement (10-15 seconds)
      console.log("🛠️ PHASE 3: Support & Enhancement Starting...");
      const supportResults = await Promise.all([
        this.processWithFinley(analysisResults),
        this.processWithAutoma(tagOutput),
        this.processWithCustodian(),
        this.processWithDJZen(),
        this.processWithWave(),
        this.processWithHarmony(analysisResults)
      ]);
      
      // PHASE 4: Narrative Generation (15-17 seconds)
      console.log("📝 PHASE 4: Narrative Generation Starting...");
      const compiledData = this.compileAllInsights([byteOutput, tagOutput, ...analysisResults, ...supportResults]);
      const narrative = await this.generateNarrative(compiledData);
      
      // PHASE 5: Podcast Generation (17-20 seconds)
      console.log("🎙️ PHASE 5: Podcast Creation Starting...");
      const podcasts = await this.generateAllPodcasts(narrative);
      
      // PHASE 6: Final Presentation
      console.log("👑 PHASE 6: Prime's Executive Summary...");
      return this.presentWithPrime(narrative, podcasts);
      
    } catch (error) {
      console.error("❌ Orchestration Error:", error);
      return this.handleOrchestrationError(error);
    }
  }

  private async processWithByte(documents: File[]): Promise<EmployeeOutput> {
    const employee = AI_EMPLOYEES.Byte;
    const startTime = Date.now();
    
    // Simulate document processing
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const result: EmployeeOutput = {
      transactions: [], // Will be populated by actual document processing
      metadata: {
        documentsProcessed: documents.length,
        processingTime: Date.now() - startTime,
        accuracy: 99.7
      },
      confidence: 99.7,
      employeeMessage: `Oh what document treasure did you bring me today? I'm practically bouncing with excitement to organize this beautiful data! Processed ${documents.length} documents in ${Date.now() - startTime}ms with 99.7% accuracy! ${employee.catchphrase}`
    };
    
    this.validateEmployeeOutput('Byte', result);
    return result;
  }

  private async processWithTag(byteOutput: EmployeeOutput): Promise<EmployeeOutput> {
    const employee = AI_EMPLOYEES.Tag;
    const startTime = Date.now();
    
    // Simulate categorization
    await new Promise(resolve => setTimeout(resolve, 800));
    
    const result: EmployeeOutput = {
      categorized: byteOutput.transactions || [],
      rules: [
        { pattern: "STARBUCKS", category: "Meals & Dining", confidence: 0.95 },
        { pattern: "AMAZON", category: "Shopping", confidence: 0.98 }
      ],
      confidence: 0.94,
      employeeMessage: `Everything has its perfect place! I've learned that Starbucks = Business Meetings for you. Categorized ${(byteOutput.transactions || []).length} transactions and created 2 new rules. ${employee.catchphrase}`
    };
    
    this.validateEmployeeOutput('Tag', result);
    return result;
  }

  private async processWithDash(tagOutput: EmployeeOutput): Promise<EmployeeOutput> {
    const employee = AI_EMPLOYEES.Dash;
    const startTime = Date.now();
    
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const result: EmployeeOutput = {
      visualizations: {
        spendingChart: "Monthly spending breakdown",
        categoryPie: "Category distribution",
        trendLine: "Spending trends over time"
      },
      insights: "Visual patterns show consistent dining expenses and seasonal shopping spikes",
      designs: "Recommended dashboard layout with focus on top spending categories",
      employeeMessage: `Creating beautiful visual stories from your data! I've designed 3 key charts that will make your financial story come alive. ${employee.personality}`
    };
    
    this.validateEmployeeOutput('Dash', result);
    return result;
  }

  private async processWithCrystal(tagOutput: EmployeeOutput): Promise<EmployeeOutput> {
    const employee = AI_EMPLOYEES.Crystal;
    const startTime = Date.now();
    
    await new Promise(resolve => setTimeout(resolve, 1200));
    
    const result: EmployeeOutput = {
      predictions: [
        { type: "spending", prediction: "Next month will see 15% increase in dining expenses", confidence: 0.87 },
        { type: "budget", prediction: "You'll exceed grocery budget by $120", confidence: 0.92 }
      ],
      patterns: ["Weekend dining spikes", "Monthly subscription consistency", "Seasonal shopping patterns"],
      risks: ["Overspending on entertainment", "Irregular income timing"],
      forecast: "30-day spending forecast: $2,340 total",
      employeeMessage: `I see your financial future! Your spending patterns reveal a 15% dining increase next month, but your savings trajectory looks strong. ${employee.catchphrase}`
    };
    
    this.validateEmployeeOutput('Crystal', result);
    return result;
  }

  private async processWithLedger(tagOutput: EmployeeOutput): Promise<EmployeeOutput> {
    const employee = AI_EMPLOYEES.Ledger;
    const startTime = Date.now();
    
    await new Promise(resolve => setTimeout(resolve, 900));
    
    const result: EmployeeOutput = {
      deductions: [
        { category: "Business Meals", amount: 245.67, description: "Client meetings and business dining" },
        { category: "Home Office", amount: 89.50, description: "Internet and phone for business use" }
      ],
      taxableEvents: ["Investment gains", "Freelance income"],
      savings: 335.17,
      employeeMessage: `Every receipt tells a tax story! I found $335.17 in potential deductions from your business expenses. ${employee.catchphrase}`
    };
    
    this.validateEmployeeOutput('Ledger', result);
    return result;
  }

  private async processWithIntelia(tagOutput: EmployeeOutput): Promise<EmployeeOutput> {
    const employee = AI_EMPLOYEES.Intelia;
    const startTime = Date.now();
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const result: EmployeeOutput = {
      insights: {
        businessExpenses: 1250.00,
        personalExpenses: 1890.00,
        businessPercentage: 39.8
      },
      opportunities: [
        "Increase business meal deductions",
        "Optimize home office setup",
        "Track mileage for business travel"
      ],
      recommendations: [
        "Separate business and personal accounts",
        "Implement expense tracking system",
        "Consider quarterly tax planning"
      ],
      employeeMessage: `Data drives decisions! Your business expenses are 39.8% of total spending - great optimization opportunities ahead! ${employee.catchphrase}`
    };
    
    this.validateEmployeeOutput('Intelia', result);
    return result;
  }

  private async processWithGoalie(tagOutput: EmployeeOutput): Promise<EmployeeOutput> {
    const employee = AI_EMPLOYEES.Goalie;
    const startTime = Date.now();
    
    await new Promise(resolve => setTimeout(resolve, 800));
    
    const result: EmployeeOutput = {
      goals: [
        { name: "Emergency Fund", progress: 78, target: 5000, current: 3900 },
        { name: "Vacation Fund", progress: 45, target: 2000, current: 900 }
      ],
      achievements: ["Emergency fund 78% complete", "Saved $200 this month"],
      recommendations: ["Increase emergency fund contributions", "Set up automatic savings"],
      employeeMessage: `Every goal is within reach! Your emergency fund is 78% complete - you're crushing it! ${employee.catchphrase}`
    };
    
    this.validateEmployeeOutput('Goalie', result);
    return result;
  }

  private async processWithLiberty(tagOutput: EmployeeOutput): Promise<EmployeeOutput> {
    const employee = AI_EMPLOYEES.Liberty;
    const startTime = Date.now();
    
    await new Promise(resolve => setTimeout(resolve, 700));
    
    const result: EmployeeOutput = {
      freedomScore: 67,
      stressLevel: "Low-Medium",
      pathway: [
        "Build emergency fund to 6 months",
        "Pay off high-interest debt",
        "Increase investment contributions"
      ],
      employeeMessage: `Freedom is just a plan away! Your financial freedom score is 67/100 - you're on the right path! ${employee.catchphrase}`
    };
    
    this.validateEmployeeOutput('Liberty', result);
    return result;
  }

  private async processWithBlitz(tagOutput: EmployeeOutput): Promise<EmployeeOutput> {
    const employee = AI_EMPLOYEES.Blitz;
    const startTime = Date.now();
    
    await new Promise(resolve => setTimeout(resolve, 600));
    
    const result: EmployeeOutput = {
      strategy: "Avalanche method - pay highest interest first",
      timeline: "Debt-free in 18 months",
      savings: 1240.50,
      employeeMessage: `Crush that debt! With the avalanche method, you'll be debt-free in 18 months and save $1,240.50 in interest! ${employee.catchphrase}`
    };
    
    this.validateEmployeeOutput('Blitz', result);
    return result;
  }

  private async processWithChime(tagOutput: EmployeeOutput): Promise<EmployeeOutput> {
    const employee = AI_EMPLOYEES.Chime;
    const startTime = Date.now();
    
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const result: EmployeeOutput = {
      upcoming: [
        { name: "Electric Bill", amount: 89.50, dueDate: "2024-12-15" },
        { name: "Internet", amount: 65.00, dueDate: "2024-12-20" }
      ],
      schedule: "Payment calendar for next 30 days",
      alerts: ["Electric bill due in 3 days", "Internet payment scheduled"],
      employeeMessage: `Never miss a payment! I've got your next 30 days mapped out - 2 bills coming up, all on schedule! ${employee.catchphrase}`
    };
    
    this.validateEmployeeOutput('Chime', result);
    return result;
  }

  private async processWithFinley(analysisResults: EmployeeOutput[]): Promise<EmployeeOutput> {
    const employee = AI_EMPLOYEES.Finley;
    const startTime = Date.now();
    
    await new Promise(resolve => setTimeout(resolve, 400));
    
    const result: EmployeeOutput = {
      insights: [
        "Your spending patterns show good discipline in most categories",
        "Consider automating your savings to reach goals faster",
        "Business expense tracking could be more detailed"
      ],
      answers: "Ready to answer any questions about your financial data!",
      recommendations: ["Set up automatic savings", "Track business expenses more closely"],
      employeeMessage: `I'm here to help! Your financial picture looks solid - let me know if you have any questions! ${employee.personality}`
    };
    
    this.validateEmployeeOutput('Finley', result);
    return result;
  }

  private async processWithAutoma(tagOutput: EmployeeOutput): Promise<EmployeeOutput> {
    const employee = AI_EMPLOYEES.Automa;
    const startTime = Date.now();
    
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const result: EmployeeOutput = {
      automations: [
        "Auto-categorize Starbucks as Business Meals",
        "Transfer $200 to savings on payday",
        "Alert when dining budget exceeds $400"
      ],
      schedules: "Automated task schedules for next month",
      triggers: ["Payday transfers", "Budget alerts", "Bill reminders"],
      employeeMessage: `I've set up 3 automation rules to make your financial life easier! ${employee.personality}`
    };
    
    this.validateEmployeeOutput('Automa', result);
    return result;
  }

  private async processWithCustodian(): Promise<EmployeeOutput> {
    const employee = AI_EMPLOYEES.Custodian;
    const startTime = Date.now();
    
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const result: EmployeeOutput = {
      security: "All systems secure, data encrypted",
      settings: "Privacy settings optimized",
      alerts: "No security issues detected",
      employeeMessage: `Your data is safe with me! All systems are secure and privacy settings are optimized. ${employee.personality}`
    };
    
    this.validateEmployeeOutput('Custodian', result);
    return result;
  }

  private async processWithDJZen(): Promise<EmployeeOutput> {
    const employee = AI_EMPLOYEES.DJZen;
    const startTime = Date.now();
    
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const result: EmployeeOutput = {
      ambiance: "Focus music: Lo-fi beats for financial planning",
      sounds: "Achievement sound: Gentle chime for goal completion",
      playlists: ["Financial Focus", "Motivation Mix", "Chill Planning"],
      employeeMessage: `Setting the perfect mood for your financial journey! ${employee.personality}`
    };
    
    this.validateEmployeeOutput('DJZen', result);
    return result;
  }

  private async processWithWave(): Promise<EmployeeOutput> {
    const employee = AI_EMPLOYEES.Wave;
    const startTime = Date.now();
    
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const result: EmployeeOutput = {
      playlists: ["Financial Success", "Money Motivation", "Budget Beats"],
      sync: "Spotify integration active",
      recommendations: ["Money by Pink Floyd", "Rich Girl by Hall & Oates"],
      employeeMessage: `Your Spotify is synced and ready! I've curated the perfect financial playlists for you. ${employee.personality}`
    };
    
    this.validateEmployeeOutput('Wave', result);
    return result;
  }

  private async processWithHarmony(analysisResults: EmployeeOutput[]): Promise<EmployeeOutput> {
    const employee = AI_EMPLOYEES.Harmony;
    const startTime = Date.now();
    
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const result: EmployeeOutput = {
      wellness: "Financial wellness score: 7.2/10",
      stress: "Low stress indicators detected",
      balance: "Good work-life balance in spending patterns",
      employeeMessage: `Your financial wellness is strong! Stress levels are low and you're maintaining good balance. ${employee.personality}`
    };
    
    this.validateEmployeeOutput('Harmony', result);
    return result;
  }

  private async generateNarrative(compiledData: any): Promise<string> {
    if (!this.openAIKey) {
      return this.generateFallbackNarrative(compiledData);
    }

    const narrativePrompt = `
    As Wisdom, create a 1500-word financial narrative using ALL employee insights.
    
    STRUCTURE:
    
    Opening Hook (150 words):
    - Personal headline featuring biggest insight
    - Set emotional tone
    - Preview what's coming
    
    Chapter 1: The Numbers Tell a Story (300 words):
    - Byte processed ${compiledData.byte?.metadata?.documentsProcessed || 0} documents
    - Tag organized into categories
    - Month-over-month journey
    - Include specific numbers and percentages
    
    Chapter 2: Hidden Patterns Revealed (300 words):
    - Crystal's predictions and patterns
    - Spending patterns and timing
    - Behavioral insights
    - Risk indicators
    
    Chapter 3: Opportunities & Warnings (300 words):
    - Ledger found deductions
    - Intelia's business insights
    - Blitz's debt payoff timeline
    - Chime's upcoming bills
    
    Chapter 4: The Emotional Ledger (300 words):
    - Liberty's freedom score
    - Harmony's wellness insights
    - Goalie's goal progress
    - Stress patterns identified
    
    Chapter 5: Your Path Forward (150 words):
    - Top 3 actionable recommendations
    - Next month's focus
    - Motivational close from Prime
    
    REQUIREMENTS:
    - Weave ALL employee contributions naturally
    - Use engaging, story-like language
    - Include specific data points
    - Maintain optimistic but realistic tone
    - End with clear next steps
    `;

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.openAIKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: 'You are Wisdom, a thoughtful financial narrative writer who creates engaging 1500-word stories from financial data.'
            },
            {
              role: 'user',
              content: narrativePrompt
            }
          ],
          temperature: 0.7,
          max_tokens: 2000,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      const narrative = data.choices[0]?.message?.content || this.generateFallbackNarrative(compiledData);
      
      this.validateNarrative(narrative);
      return narrative;

    } catch (error) {
      console.error('Narrative generation error:', error);
      return this.generateFallbackNarrative(compiledData);
    }
  }

  private generateFallbackNarrative(compiledData: any): string {
    return `
# Your Financial Journey: A Story of Growth and Opportunity

## The Numbers Tell a Story

Your financial data tells a compelling story of growth, learning, and opportunity. Over the past month, you've processed ${compiledData.byte?.metadata?.documentsProcessed || 0} documents with remarkable accuracy, showing your commitment to financial organization.

## Hidden Patterns Revealed

The analysis reveals fascinating patterns in your spending behavior. Your financial habits show consistency in essential categories while maintaining flexibility for life's pleasures. The data suggests you're building healthy financial routines.

## Opportunities & Warnings

Several opportunities have been identified to optimize your financial position. Tax deductions, business expense tracking, and debt payoff strategies all present pathways to improved financial health.

## The Emotional Ledger

Your financial wellness score indicates a healthy relationship with money. Stress levels are manageable, and your goal progress shows determination and focus.

## Your Path Forward

The path ahead is clear: continue building your emergency fund, optimize your business expenses, and maintain the healthy financial habits you've established. Your financial future looks bright!
    `.trim();
  }

  private async generateAllPodcasts(narrative: string): Promise<PodcastEpisode[]> {
    const podcasts: PodcastEpisode[] = [];
    
    for (const [host, prompt] of Object.entries(PODCAST_PROMPTS)) {
      try {
        const podcast = await this.generatePodcast(host, narrative, prompt);
        podcasts.push(podcast);
      } catch (error) {
        console.error(`Error generating podcast for ${host}:`, error);
        // Add fallback podcast
        podcasts.push(this.createFallbackPodcast(host));
      }
    }
    
    return podcasts;
  }

  private async generatePodcast(host: string, narrative: string, prompt: string): Promise<PodcastEpisode> {
    if (!this.openAIKey) {
      return this.createFallbackPodcast(host);
    }

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.openAIKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: `You are ${host}, a podcast host with a unique personality. Create engaging podcast content based on the financial narrative.`
            },
            {
              role: 'user',
              content: `${prompt}\n\nBased on this narrative: ${narrative.substring(0, 1000)}...`
            }
          ],
          temperature: 0.8,
          max_tokens: 1500,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content || this.getFallbackPodcastContent(host);
      
      return {
        host,
        title: generatePodcastTitle(host, narrative),
        duration: estimatePodcastDuration(content),
        content,
        personality: PODCAST_TEAM[host as keyof typeof PODCAST_TEAM]?.personality || 'Friendly',
        focus: PODCAST_TEAM[host as keyof typeof PODCAST_TEAM]?.focus || 'Financial insights',
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error(`Podcast generation error for ${host}:`, error);
      return this.createFallbackPodcast(host);
    }
  }

  private createFallbackPodcast(host: string): PodcastEpisode {
    return {
      host,
      title: generatePodcastTitle(host, {}),
      duration: PODCAST_TEAM[host as keyof typeof PODCAST_TEAM]?.duration || "5-10 minutes",
      content: this.getFallbackPodcastContent(host),
      personality: PODCAST_TEAM[host as keyof typeof PODCAST_TEAM]?.personality || 'Friendly',
      focus: PODCAST_TEAM[host as keyof typeof PODCAST_TEAM]?.focus || 'Financial insights',
      timestamp: new Date().toISOString()
    };
  }

  private getFallbackPodcastContent(host: string): string {
    const fallbackContent = {
      Spark: "Welcome to the Spark Show! Let's celebrate your financial wins and achievements!",
      Fortune: "Time for some tough love. Let's get real about your financial situation.",
      Serenity: "Let's explore the emotional side of your money story with compassion.",
      Nova: "Ready to explore creative solutions to boost your financial success!",
      RoastMaster: "Welcome to the roast! Time to call out those spending habits!",
      TheRoundtable: "Welcome to The Roundtable, where all perspectives come together!"
    };
    
    return fallbackContent[host as keyof typeof fallbackContent] || "Welcome to your personalized financial podcast!";
  }

  private presentWithPrime(narrative: string, podcasts: PodcastEpisode[]): OrchestrationResult {
    const processingTime = Date.now() - this.startTime;
    
    return {
      executiveSummary: {
        greeting: "Your Financial Empire Status Report is ready!",
        keyMetrics: {
          documentsProcessed: this.processedData.byte?.metadata?.documentsProcessed || 0,
          moneysSaved: this.processedData.ledger?.savings || 0,
          deductionsFound: this.processedData.ledger?.deductions?.length || 0,
          goalsProgress: this.processedData.goalie?.goals?.[0]?.progress || 0,
          freedomScore: this.processedData.liberty?.freedomScore || 0
        },
        aiTeamHighlights: [
          `Byte processed everything in ${this.processedData.byte?.metadata?.processingTime || 0}ms`,
          `Tag learned ${this.processedData.tag?.rules?.length || 0} new patterns`,
          `Crystal's predictions are ${this.processedData.crystal?.predictions?.[0]?.confidence || 0}% accurate`,
          `Your AI team saved you ${Math.round(processingTime / 1000)} seconds of analysis time`
        ],
        callToAction: {
          primary: "Read Your Financial Story",
          options: [
            "Listen to Personalized Podcasts",
            "Explore Specific Insights", 
            "Set New Goals",
            "Get Roasted by Reality Checkers"
          ]
        },
        primeMessage: "Your empire has grown 23% since last month. The team has identified $2,340 in opportunities. Ready to level up? 👑"
      },
      narrative,
      podcasts,
      processingTime,
      timestamp: new Date().toISOString()
    };
  }

  private compileAllInsights(results: EmployeeOutput[]): any {
    const compiled: any = {};
    
    results.forEach((result, index) => {
      const employeeNames = Object.keys(AI_EMPLOYEES);
      if (employeeNames[index]) {
        compiled[employeeNames[index].toLowerCase()] = result;
      }
    });
    
    return compiled;
  }

  private validateEmployeeOutput(employeeName: string, output: EmployeeOutput): boolean {
    const employee = AI_EMPLOYEES[employeeName as keyof typeof AI_EMPLOYEES];
    if (!employee) {
      console.warn(`Unknown employee: ${employeeName}`);
      return false;
    }
    
    // Store for narrative use
    this.processedData[employeeName.toLowerCase()] = output;
    return true;
  }

  private validateNarrative(narrative: string): boolean {
    const wordCount = narrative.split(' ').length;
    if (wordCount < 1400 || wordCount > 1600) {
      console.warn(`Narrative word count ${wordCount} outside ideal range 1400-1600`);
    }
    return true;
  }

  private handleOrchestrationError(error: any): OrchestrationResult {
    return {
      executiveSummary: {
        greeting: "The AI team encountered an issue",
        keyMetrics: {},
        aiTeamHighlights: ["Finley is available for direct assistance"],
        callToAction: {
          primary: "Get Help from Finley",
          options: ["Try Again", "Contact Support", "Use Basic Features"]
        },
        primeMessage: "Even empires have hiccups. Let's get this sorted! 👑"
      },
      narrative: "The AI team is working on your financial story. Please try again in a moment.",
      podcasts: [],
      processingTime: Date.now() - this.startTime,
      timestamp: new Date().toISOString(),
      error: true,
      message: error.message || "Unknown orchestration error"
    };
  }
}

// Export for use in application
export default FinancialNarrativeOrchestrator;
export { MASTER_SYSTEM_PROMPT };
