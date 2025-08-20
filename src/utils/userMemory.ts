// User Memory System - Makes AI remember you personally
export interface UserProfile {
  id: string;
  name: string;
  preferences: {
    communicationStyle: 'casual' | 'professional' | 'friendly' | 'motivational';
    favoriteEmojis: string[];
    financialGoals: string[];
    interests: string[];
    lastActive: Date;
  };
  conversationHistory: {
    [section: string]: Array<{
      timestamp: Date;
      userMessage: string;
      aiResponse: string;
      context: string;
    }>;
  };
  financialInsights: {
    favoriteCategories: string[];
    spendingPatterns: string[];
    goals: string[];
    achievements: string[];
    challenges: string[];
  };
  aiRelationships: {
    [section: string]: {
      trustLevel: number; // 0-100
      insideJokes: string[];
      nicknames: string[];
      sharedExperiences: string[];
      lastInteraction: Date;
    };
  };
}

// Default user profile
const createDefaultProfile = (name: string): UserProfile => ({
  id: `user_${Date.now()}`,
  name: name,
  preferences: {
    communicationStyle: 'friendly',
    favoriteEmojis: ['💰', '🚀', '💪', '🎯', '🔥'],
    financialGoals: [],
    interests: [],
    lastActive: new Date()
  },
  conversationHistory: {},
  financialInsights: {
    favoriteCategories: [],
    spendingPatterns: [],
    goals: [],
    achievements: [],
    challenges: []
  },
  aiRelationships: {
    analytics: { trustLevel: 50, insideJokes: [], nicknames: [], sharedExperiences: [], lastInteraction: new Date() },
    smartImport: { trustLevel: 50, insideJokes: [], nicknames: [], sharedExperiences: [], lastInteraction: new Date() },
    therapist: { trustLevel: 50, insideJokes: [], nicknames: [], sharedExperiences: [], lastInteraction: new Date() },
    goals: { trustLevel: 50, insideJokes: [], nicknames: [], sharedExperiences: [], lastInteraction: new Date() }
  }
});

// User Memory Manager
class UserMemoryManager {
  private static instance: UserMemoryManager;
  private currentUser: UserProfile | null = null;
  private readonly STORAGE_KEY = 'xspensesai_user_memory';

  private constructor() {
    this.loadUserFromStorage();
  }

  static getInstance(): UserMemoryManager {
    if (!UserMemoryManager.instance) {
      UserMemoryManager.instance = new UserMemoryManager();
    }
    return UserMemoryManager.instance;
  }

  // Initialize or get user profile
  getUserProfile(name?: string): UserProfile {
    if (!this.currentUser) {
      if (name) {
        this.currentUser = createDefaultProfile(name);
        this.saveUserToStorage();
      } else {
        // Try to load from storage
        this.loadUserFromStorage();
        if (!this.currentUser) {
          this.currentUser = createDefaultProfile('Friend');
        }
      }
    }
    return this.currentUser;
  }

  // Update user name and create profile if needed
  updateUserName(name: string): void {
    if (!this.currentUser) {
      this.currentUser = createDefaultProfile(name);
    } else {
      this.currentUser.name = name;
    }
    this.saveUserToStorage();
  }

  // Remember conversation
  rememberConversation(
    section: string,
    userMessage: string,
    aiResponse: string,
    context: string = ''
  ): void {
    if (!this.currentUser) return;

    if (!this.currentUser.conversationHistory[section]) {
      this.currentUser.conversationHistory[section] = [];
    }

    this.currentUser.conversationHistory[section].push({
      timestamp: new Date(),
      userMessage,
      aiResponse,
      context
    });

    // Keep only last 20 conversations per section
    if (this.currentUser.conversationHistory[section].length > 20) {
      this.currentUser.conversationHistory[section] = 
        this.currentUser.conversationHistory[section].slice(-20);
    }

    // Update last interaction
    if (this.currentUser.aiRelationships[section]) {
      this.currentUser.aiRelationships[section].lastInteraction = new Date();
      this.currentUser.aiRelationships[section].trustLevel = 
        Math.min(100, this.currentUser.aiRelationships[section].trustLevel + 1);
    }

    this.currentUser.preferences.lastActive = new Date();
    this.saveUserToStorage();
  }

  // Learn user preferences
  learnPreference(type: keyof UserProfile['preferences'], value: any): void {
    if (!this.currentUser) return;

    if (type === 'favoriteEmojis' && Array.isArray(this.currentUser.preferences[type])) {
      if (!this.currentUser.preferences[type].includes(value)) {
        this.currentUser.preferences[type].push(value);
      }
    } else if (type === 'financialGoals' && Array.isArray(this.currentUser.preferences[type])) {
      if (!this.currentUser.preferences[type].includes(value)) {
        this.currentUser.preferences[type].push(value);
      }
    } else {
      (this.currentUser.preferences as any)[type] = value;
    }

    this.saveUserToStorage();
  }

  // Learn financial insights
  learnFinancialInsight(type: keyof UserProfile['financialInsights'], value: string): void {
    if (!this.currentUser) return;

    if (Array.isArray(this.currentUser.financialInsights[type])) {
      if (!this.currentUser.financialInsights[type].includes(value)) {
        this.currentUser.financialInsights[type].push(value);
      }
    }

    this.saveUserToStorage();
  }

  // Build AI relationship
  buildAIRelationship(section: string, experience: string): void {
    if (!this.currentUser) return;

    if (this.currentUser.aiRelationships[section]) {
      if (!this.currentUser.aiRelationships[section].sharedExperiences.includes(experience)) {
        this.currentUser.aiRelationships[section].sharedExperiences.push(experience);
      }
      
      // Increase trust level
      this.currentUser.aiRelationships[section].trustLevel = 
        Math.min(100, this.currentUser.aiRelationships[section].trustLevel + 2);
    }

    this.saveUserToStorage();
  }

  // Get personalized context for AI
  getPersonalizedContext(section: string): string {
    if (!this.currentUser) return '';

    const user = this.currentUser;
    const relationship = user.aiRelationships[section];
    const recentConversations = user.conversationHistory[section] || [];

    let context = `\n\nPERSONAL CONTEXT FOR ${user.name.toUpperCase()}:\n`;
    context += `Communication Style: ${user.preferences.communicationStyle}\n`;
    context += `Favorite Emojis: ${user.preferences.favoriteEmojis.join(' ')}\n`;
    context += `Trust Level: ${relationship?.trustLevel || 50}/100\n`;
    context += `Last Interaction: ${relationship?.lastInteraction.toLocaleDateString()}\n`;

    if (relationship?.nicknames.length > 0) {
      context += `Nicknames: ${relationship.nicknames.join(', ')}\n`;
    }

    if (relationship?.insideJokes.length > 0) {
      context += `Inside Jokes: ${relationship.insideJokes.slice(-2).join(', ')}\n`;
    }

    if (user.financialInsights.goals.length > 0) {
      context += `Financial Goals: ${user.financialInsights.goals.join(', ')}\n`;
    }

    if (user.financialInsights.achievements.length > 0) {
      context += `Recent Achievements: ${user.financialInsights.achievements.slice(-3).join(', ')}\n`;
    }

    // Add recent conversation context
    if (recentConversations.length > 0) {
      const lastConversation = recentConversations[recentConversations.length - 1];
      context += `\nLast Conversation Context: ${lastConversation.context}\n`;
    }

    return context;
  }

  // Generate personalized greeting
  getPersonalizedGreeting(section: string): string {
    if (!this.currentUser) return 'Hello!';

    const user = this.currentUser;
    const relationship = user.aiRelationships[section];
    const trustLevel = relationship?.trustLevel || 50;

    let greeting = '';

    if (trustLevel > 80) {
      // High trust - very personal
      const nicknames = relationship?.nicknames || [];
      const nickname = nicknames.length > 0 ? nicknames[nicknames.length - 1] : user.name;
      greeting = `Hey ${nickname}! 👋 It's so great to see you again! I've been thinking about our last conversation about ${user.financialInsights.goals.slice(-1)[0] || 'your financial goals'}. How are things going?`;
    } else if (trustLevel > 60) {
      // Medium trust - friendly
      greeting = `Hi ${user.name}! 😊 Great to see you back! I remember we were working on ${user.financialInsights.goals.slice(-1)[0] || 'some financial goals'}. How can I help you today?`;
    } else if (trustLevel > 30) {
      // Low trust - building rapport
      greeting = `Hello ${user.name}! 👋 Welcome back! I'm excited to help you with your finances. What would you like to work on today?`;
    } else {
      // New relationship
      greeting = `Hi there! 👋 I'm your AI financial companion. What should I call you?`;
    }

    return greeting;
  }

  // Save to localStorage
  private saveUserToStorage(): void {
    if (this.currentUser) {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.currentUser));
    }
  }

  // Load from localStorage
  private loadUserFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Convert date strings back to Date objects
        parsed.preferences.lastActive = new Date(parsed.preferences.lastActive);
        Object.keys(parsed.aiRelationships).forEach(section => {
          parsed.aiRelationships[section].lastInteraction = 
            new Date(parsed.aiRelationships[section].lastInteraction);
        });
        Object.keys(parsed.conversationHistory).forEach(section => {
          parsed.conversationHistory[section].forEach((conv: any) => {
            conv.timestamp = new Date(conv.timestamp);
          });
        });
        this.currentUser = parsed;
      }
    } catch (error) {
      console.error('Failed to load user memory:', error);
    }
  }

  // Clear user memory (for testing or privacy)
  clearUserMemory(): void {
    this.currentUser = null;
    localStorage.removeItem(this.STORAGE_KEY);
  }
}

// Export singleton instance
export const userMemory = UserMemoryManager.getInstance();

// Helper functions
export const rememberUser = (name: string) => userMemory.updateUserName(name);
export const getPersonalizedContext = (section: string) => userMemory.getPersonalizedContext(section);
export const getPersonalizedGreeting = (section: string) => userMemory.getPersonalizedGreeting(section);
export const rememberConversation = (section: string, userMessage: string, aiResponse: string, context?: string) => 
  userMemory.rememberConversation(section, userMessage, aiResponse, context);
