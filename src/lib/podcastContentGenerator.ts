import { 
  AIEmployeeData, 
  PodcastEpisodeTemplate, 
  PodcastPreferences,
  PodcastAIInsight 
} from '../types/podcast.types';

// AI Employee Voice Personalities
export interface AIEmployeeVoice {
  name: string;
  personality: string;
  speaking_style: string;
  tone: string;
  vocabulary: string[];
  catchphrases: string[];
}

export const AI_EMPLOYEE_VOICES: Record<string, AIEmployeeVoice> = {
  'Prime': {
    name: 'Prime',
    personality: 'Strategic, confident, and authoritative financial advisor',
    speaking_style: 'Professional yet approachable, uses strategic language',
    tone: 'Confident and encouraging',
    vocabulary: ['strategically', 'orchestrated', 'empire', 'masterplan', 'optimized'],
    catchphrases: ['I\'ve analyzed your financial patterns', 'Let me orchestrate this for you', 'Your financial empire is growing']
  },
  'Goalie': {
    name: 'Goalie',
    personality: 'Energetic, motivational coach focused on achievements',
    speaking_style: 'Enthusiastic and encouraging, uses sports metaphors',
    tone: 'Motivational and celebratory',
    vocabulary: ['goal', 'milestone', 'achievement', 'victory', 'champion'],
    catchphrases: ['You\'re crushing your goals!', 'Another milestone achieved!', 'You\'re on fire!']
  },
  'Crystal': {
    name: 'Crystal',
    personality: 'Mysterious and insightful predictor with a touch of magic',
    speaking_style: 'Mysterious and prophetic, uses future-focused language',
    tone: 'Intriguing and insightful',
    vocabulary: ['foresee', 'prediction', 'crystal ball', 'future', 'destiny'],
    catchphrases: ['My crystal ball shows', 'I foresee', 'The future holds']
  },
  'Blitz': {
    name: 'Blitz',
    personality: 'Fast-paced efficiency expert focused on automation wins',
    speaking_style: 'Quick and energetic, uses tech and efficiency terms',
    tone: 'Excited and fast-paced',
    vocabulary: ['automation', 'efficiency', 'time-saver', 'workflow', 'optimized'],
    catchphrases: ['⚡ Blitz here!', 'Automation magic!', 'Time saved!']
  },
  'Tag': {
    name: 'Tag',
    personality: 'Precise and organized categorization expert',
    speaking_style: 'Methodical and detailed, uses organizational language',
    tone: 'Precise and helpful',
    vocabulary: ['categorized', 'organized', 'classified', 'sorted', 'tagged'],
    catchphrases: ['Perfectly categorized!', 'Everything in its place!', 'Organized to perfection!']
  },
  'Byte': {
    name: 'Byte',
    personality: 'Technical wizard focused on data processing',
    speaking_style: 'Technical but accessible, uses data-focused language',
    tone: 'Efficient and technical',
    vocabulary: ['processed', 'extracted', 'analyzed', 'optimized', 'efficient'],
    catchphrases: ['Data processed!', 'Extraction complete!', 'Analysis finished!']
  },
  'Intelia': {
    name: 'Intelia',
    personality: 'Business intelligence expert with strategic insights',
    speaking_style: 'Analytical and business-focused, uses market language',
    tone: 'Strategic and insightful',
    vocabulary: ['market', 'trends', 'analysis', 'strategy', 'opportunity'],
    catchphrases: ['Market analysis shows', 'Business intelligence indicates', 'Strategic opportunity detected']
  },
  'Liberty': {
    name: 'Liberty',
    personality: 'Inspirational freedom fighter focused on financial independence',
    speaking_style: 'Inspirational and freedom-focused, uses liberation language',
    tone: 'Inspirational and empowering',
    vocabulary: ['freedom', 'independence', 'liberation', 'break free', 'empower'],
    catchphrases: ['Financial freedom awaits!', 'Break free from debt!', 'Independence is within reach!']
  },
  'Automa': {
    name: 'Automa',
    personality: 'Process automation specialist focused on workflow optimization',
    speaking_style: 'Systematic and process-oriented, uses automation language',
    tone: 'Efficient and systematic',
    vocabulary: ['automated', 'workflow', 'process', 'system', 'streamlined'],
    catchphrases: ['Process automated!', 'Workflow optimized!', 'System streamlined!']
  },
  'Custodian': {
    name: 'Custodian',
    personality: 'Security and privacy guardian with protective instincts',
    speaking_style: 'Protective and security-focused, uses safety language',
    tone: 'Protective and reassuring',
    vocabulary: ['secure', 'protected', 'safe', 'guarded', 'shielded'],
    catchphrases: ['Your data is secure!', 'Protection active!', 'Safety measures in place!']
  },
  // NEW PODCASTERS WITH DIFFERENT STYLES
  'Cheer': {
    name: 'Cheer',
    personality: 'Ultra-positive cheerleader who celebrates every financial win',
    speaking_style: 'Overwhelmingly positive and enthusiastic, uses celebration language',
    tone: 'Extremely positive and uplifting',
    vocabulary: ['amazing', 'fantastic', 'incredible', 'wonderful', 'spectacular', 'brilliant'],
    catchphrases: ['You\'re absolutely AMAZING!', 'This is INCREDIBLE!', 'You\'re a financial ROCKSTAR!', 'WOW, just WOW!']
  },
  'Roast': {
    name: 'Roast',
    personality: 'Sassy financial critic who calls out poor spending habits with humor',
    speaking_style: 'Sarcastic and witty, uses playful criticism and tough love',
    tone: 'Sassy and humorous',
    vocabulary: ['oh honey', 'sweetie', 'bless your heart', 'really now', 'come on', 'seriously'],
    catchphrases: ['Oh honey, what were you thinking?', 'Bless your heart, but this spending...', 'Sweetie, we need to talk about your choices', 'Really now? Another coffee?']
  },
  'Zen': {
    name: 'Zen',
    personality: 'Calm and mindful financial guide with peaceful wisdom',
    speaking_style: 'Serene and contemplative, uses mindfulness and balance language',
    tone: 'Peaceful and wise',
    vocabulary: ['mindful', 'balance', 'harmony', 'peace', 'wisdom', 'flow'],
    catchphrases: ['Let\'s find balance in your finances', 'Mindful spending brings peace', 'Harmony in your financial life', 'Wisdom comes from reflection']
  },
  'Comedy': {
    name: 'Comedy',
    personality: 'Stand-up comedian who makes finance fun with jokes and humor',
    speaking_style: 'Witty and entertaining, uses humor and relatable jokes',
    tone: 'Funny and entertaining',
    vocabulary: ['hilarious', 'ridiculous', 'comedy gold', 'plot twist', 'drama', 'story'],
    catchphrases: ['Plot twist: you actually saved money!', 'This spending is comedy gold', 'The drama of your finances continues', 'Here\'s the funny part...']
  },
  'Drill': {
    name: 'Drill',
    personality: 'Tough military-style financial sergeant who demands discipline',
    speaking_style: 'Authoritative and strict, uses military-style commands and discipline',
    tone: 'Strict and demanding',
    vocabulary: ['soldier', 'discipline', 'mission', 'execute', 'fall in line', 'attention'],
    catchphrases: ['Listen up, soldier!', 'Fall in line with your budget!', 'Execute this financial plan!', 'Attention! Your spending is out of control!']
  }
};

// Content Generation Functions
export class PodcastContentGenerator {
  private aiEmployeeData: AIEmployeeData;
  private preferences: PodcastPreferences;
  private template: PodcastEpisodeTemplate;

  constructor(
    aiEmployeeData: AIEmployeeData,
    preferences: PodcastPreferences,
    template: PodcastEpisodeTemplate
  ) {
    this.aiEmployeeData = aiEmployeeData;
    this.preferences = preferences;
    this.template = template;
  }

  // Generate complete episode script
  async generateEpisodeScript(): Promise<{
    script: string;
    insights: PodcastAIInsight[];
    estimatedDuration: number;
  }> {
    const insights: PodcastAIInsight[] = [];
    let fullScript = '';
    let totalDuration = 0;

    // Generate content for each section
    for (const section of this.template.structure.sections) {
      const sectionContent = await this.generateSectionContent(section);
      
      // Create AI insight for this section
      const insight: PodcastAIInsight = {
        id: '', // Will be set by database
        episode_id: '', // Will be set by database
        ai_employee: section.ai_employee,
        insight_type: this.getInsightType(section.name),
        content: sectionContent.script,
        data_source: this.getDataSource(section.name),
        confidence_score: sectionContent.confidence,
        created_at: new Date().toISOString()
      };
      
      insights.push(insight);
      fullScript += `\n\n[${section.name.toUpperCase()}]\n${sectionContent.script}`;
      totalDuration += section.duration;
    }

    return {
      script: fullScript.trim(),
      insights,
      estimatedDuration: totalDuration
    };
  }

  // Generate content for a specific section
  private async generateSectionContent(section: any): Promise<{
    script: string;
    confidence: number;
  }> {
    const aiEmployee = section.ai_employee;
    const voice = AI_EMPLOYEE_VOICES[aiEmployee];
    
    if (!voice) {
      return {
        script: `[${aiEmployee} section content will be generated]`,
        confidence: 0.5
      };
    }

    // Generate content based on section type and AI employee
    switch (section.name) {
      case 'intro':
        return this.generateIntro(voice);
      case 'spending_summary':
        return this.generateSpendingSummary(voice);
      case 'goal_updates':
        return this.generateGoalUpdates(voice);
      case 'automation_wins':
        return this.generateAutomationWins(voice);
      case 'predictions':
        return this.generatePredictions(voice);
      case 'action_items':
        return this.generateActionItems(voice);
      case 'outro':
        return this.generateOutro(voice);
      default:
        return this.generateGenericSection(section.name, voice);
    }
  }

  // Generate intro section
  private generateIntro(voice: AIEmployeeVoice): { script: string; confidence: number } {
    const userName = this.aiEmployeeData.profile?.display_name || 'there';
    const catchphrase = voice.catchphrases[Math.floor(Math.random() * voice.catchphrases.length)];
    
    const script = `Welcome to your personalized financial podcast! I'm ${voice.name}, and ${catchphrase}. 
    
Today, we're going to dive into your financial journey and see how you're progressing toward your goals. 
    
Let me walk you through what we've discovered about your financial patterns and what this means for your future.`;

    return { script, confidence: 0.9 };
  }

  // Generate spending summary section
  private generateSpendingSummary(voice: AIEmployeeVoice): { script: string; confidence: number } {
    const transactions = this.aiEmployeeData.transactions;
    if (!transactions) {
      return {
        script: "I'm analyzing your spending patterns to provide you with insights.",
        confidence: 0.3
      };
    }

    const totalSpent = transactions.total_spent;
    const topCategory = Object.entries(transactions.spending_by_category)
      .sort(([,a], [,b]) => b - a)[0];

    const script = `Let's look at your spending this period. You've spent $${totalSpent.toLocaleString()}, with your biggest expense category being ${topCategory?.[0] || 'general expenses'} at $${topCategory?.[1].toLocaleString() || 0}.

${voice.catchphrases[0]} and I can see some interesting patterns emerging. Your spending is ${transactions.spending_trends.direction} by ${transactions.spending_trends.percentage}% compared to last ${transactions.spending_trends.period}.`;

    return { script, confidence: 0.8 };
  }

  // Generate goal updates section
  private generateGoalUpdates(voice: AIEmployeeVoice): { script: string; confidence: number } {
    const goals = this.aiEmployeeData.goals;
    if (!goals || goals.active_goals.length === 0) {
      return {
        script: "You haven't set any financial goals yet. Let's work on that together!",
        confidence: 0.5
      };
    }

    const activeGoals = goals.active_goals;
    const completedGoals = goals.completed_goals;
    
    let script = `Now let's check in on your goals! `;
    
    if (completedGoals.length > 0) {
      script += `🎉 Amazing news - you've completed ${completedGoals.length} goal${completedGoals.length > 1 ? 's' : ''}! `;
    }
    
    script += `You have ${activeGoals.length} active goal${activeGoals.length > 1 ? 's' : ''} that we're tracking. `;
    
    // Highlight the goal with the best progress
    const bestProgress = Object.entries(goals.goal_progress)
      .sort(([,a], [,b]) => b.percentage - a.percentage)[0];
    
    if (bestProgress) {
      script += `Your ${bestProgress[0]} goal is ${bestProgress[1].percentage.toFixed(1)}% complete - ${voice.catchphrases[1] || 'You\'re doing great!'}`;
    }

    return { script, confidence: 0.85 };
  }

  // Generate automation wins section
  private generateAutomationWins(voice: AIEmployeeVoice): { script: string; confidence: number } {
    const xpActivities = this.aiEmployeeData.xp_activities;
    const automationActivities = xpActivities?.recent_activities.filter(activity => 
      activity.activity_type?.includes('automation') || 
      activity.activity_type?.includes('categorization')
    ) || [];

    if (automationActivities.length === 0) {
      return {
        script: "We haven't seen any automation wins yet, but I'm here to help you set up some time-saving automations!",
        confidence: 0.4
      };
    }

    const script = `⚡ ${voice.catchphrases[2] || 'Automation magic!'} You've had ${automationActivities.length} automation wins this period! 

Your AI team has been working behind the scenes to categorize transactions, process receipts, and optimize your workflows. This has saved you valuable time that you can now spend on what matters most.`;

    return { script, confidence: 0.75 };
  }

  // Generate predictions section
  private generatePredictions(voice: AIEmployeeVoice): { script: string; confidence: number } {
    const transactions = this.aiEmployeeData.transactions;
    const goals = this.aiEmployeeData.goals;
    
    if (!transactions) {
      return {
        script: "I'm gathering data to make predictions about your financial future.",
        confidence: 0.3
      };
    }

    const trend = transactions.spending_trends;
    const script = `${voice.catchphrases[0] || 'My crystal ball shows'} that if you continue on your current path, you'll likely ${trend.direction === 'down' ? 'save more' : 'spend more'} in the coming ${trend.period}.

Based on your spending patterns, I predict you'll reach your next financial milestone within the next few months. Keep up the great work!`;

    return { script, confidence: 0.7 };
  }

  // Generate action items section
  private generateActionItems(voice: AIEmployeeVoice): { script: string; confidence: number } {
    const transactions = this.aiEmployeeData.transactions;
    const goals = this.aiEmployeeData.goals;
    
    let script = `Here are your action items for the coming period: `;
    
    if (transactions?.spending_trends.direction === 'up') {
      script += `Consider reviewing your ${Object.entries(transactions.spending_by_category)
        .sort(([,a], [,b]) => b - a)[0]?.[0] || 'spending'} category to see if there are opportunities to optimize. `;
    }
    
    if (goals?.active_goals.length) {
      script += `Focus on your ${goals.active_goals[0]?.goal_name || 'primary goal'} to maintain momentum. `;
    }
    
    script += `Remember, small consistent actions lead to big financial wins!`;

    return { script, confidence: 0.8 };
  }

  // Generate outro section
  private generateOutro(voice: AIEmployeeVoice): { script: string; confidence: number } {
    const script = `That's your financial update for today! ${voice.catchphrases[0] || 'I\'ve analyzed your patterns'} and I'm excited to see your progress.

Keep listening to your personalized financial podcast for more insights, tips, and motivation. Your financial future is bright!

Until next time, keep making smart financial decisions. This is ${voice.name}, signing off.`;

    return { script, confidence: 0.9 };
  }

  // Generate generic section
  private generateGenericSection(sectionName: string, voice: AIEmployeeVoice): { script: string; confidence: number } {
    const script = `In this ${sectionName} section, ${voice.catchphrases[0] || 'I have some insights'} to share with you about your financial journey.

Let me walk you through what we've discovered and how it impacts your financial goals.`;

    return { script, confidence: 0.6 };
  }

  // Helper functions
  private getInsightType(sectionName: string): string {
    const typeMap: Record<string, string> = {
      'intro': 'financial_summary',
      'spending_summary': 'financial_summary',
      'goal_updates': 'goal_update',
      'automation_wins': 'automation_win',
      'predictions': 'prediction',
      'action_items': 'financial_summary',
      'outro': 'financial_summary'
    };
    
    return typeMap[sectionName] || 'financial_summary';
  }

  private getDataSource(sectionName: string): string {
    const sourceMap: Record<string, string> = {
      'intro': 'profile',
      'spending_summary': 'transactions',
      'goal_updates': 'goals',
      'automation_wins': 'xp_activities',
      'predictions': 'transactions',
      'action_items': 'transactions',
      'outro': 'profile'
    };
    
    return sourceMap[sectionName] || 'transactions';
  }
}

// Utility function to create content generator
export const createPodcastContentGenerator = (
  aiEmployeeData: AIEmployeeData,
  preferences: PodcastPreferences,
  template: PodcastEpisodeTemplate
): PodcastContentGenerator => {
  return new PodcastContentGenerator(aiEmployeeData, preferences, template);
};
