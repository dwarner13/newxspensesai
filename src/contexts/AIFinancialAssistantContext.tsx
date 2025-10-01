import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';

// AI Assistant Types
export interface FinancialTransaction {
  id: string;
  merchantName: string;
  amount: number;
  date: Date;
  category: string;
  confidence: number;
  isProcessed: boolean;
  needsUserInput: boolean;
  userCorrection?: string;
}

export interface AIInsight {
  id: string;
  type: 'spending_trend' | 'budget_alert' | 'goal_progress' | 'optimization' | 'achievement';
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'success' | 'error';
  actionable: boolean;
  action?: string;
  audioSuggestion?: string;
  podcastRecommendation?: string;
}

export interface CategorizationPattern {
  merchantPattern: string;
  category: string;
  confidence: number;
  usageCount: number;
  lastUsed: Date;
}

export interface AIAssistantState {
  isProcessing: boolean;
  processingProgress: number;
  currentTask: string;
  transactions: FinancialTransaction[];
  insights: AIInsight[];
  categorizationPatterns: CategorizationPattern[];
  dailyBriefing: {
    yesterdaySpending: number;
    weeklyTotal: number;
    budgetStatus: Record<string, { spent: number; remaining: number; percentage: number }>;
    goalProgress: Record<string, { current: number; target: number; percentage: number }>;
  };
  conversationHistory: Array<{
    id: string;
    timestamp: Date;
    type: 'user' | 'ai';
    message: string;
    context?: any;
  }>;
  isListening: boolean;
  audioQueue: string[];
}

// AI Assistant Actions
export type AIAssistantAction =
  | { type: 'SET_PROCESSING'; payload: { isProcessing: boolean; task?: string } }
  | { type: 'SET_PROCESSING_PROGRESS'; payload: number }
  | { type: 'ADD_TRANSACTIONS'; payload: FinancialTransaction[] }
  | { type: 'UPDATE_TRANSACTION'; payload: { id: string; updates: Partial<FinancialTransaction> } }
  | { type: 'ADD_INSIGHT'; payload: AIInsight }
  | { type: 'UPDATE_CATEGORIZATION_PATTERN'; payload: CategorizationPattern }
  | { type: 'UPDATE_DAILY_BRIEFING'; payload: Partial<AIAssistantState['dailyBriefing']> }
  | { type: 'ADD_CONVERSATION_MESSAGE'; payload: { type: 'user' | 'ai'; message: string; context?: any } }
  | { type: 'SET_LISTENING'; payload: boolean }
  | { type: 'ADD_TO_AUDIO_QUEUE'; payload: string }
  | { type: 'REMOVE_FROM_AUDIO_QUEUE'; payload: string };

// Initial State
const initialState: AIAssistantState = {
  isProcessing: false,
  processingProgress: 0,
  currentTask: '',
  transactions: [],
  insights: [],
  categorizationPatterns: [],
  dailyBriefing: {
    yesterdaySpending: 0,
    weeklyTotal: 0,
    budgetStatus: {},
    goalProgress: {},
  },
  conversationHistory: [],
  isListening: false,
  audioQueue: [],
};

// AI Assistant Reducer
function aiAssistantReducer(state: AIAssistantState, action: AIAssistantAction): AIAssistantState {
  switch (action.type) {
    case 'SET_PROCESSING':
      return {
        ...state,
        isProcessing: action.payload.isProcessing,
        currentTask: action.payload.task || '',
        processingProgress: action.payload.isProcessing ? 0 : 100,
      };
    
    case 'SET_PROCESSING_PROGRESS':
      return { ...state, processingProgress: action.payload };
    
    case 'ADD_TRANSACTIONS':
      return {
        ...state,
        transactions: [...action.payload, ...state.transactions],
      };
    
    case 'UPDATE_TRANSACTION':
      return {
        ...state,
        transactions: state.transactions.map(transaction =>
          transaction.id === action.payload.id
            ? { ...transaction, ...action.payload.updates }
            : transaction
        ),
      };
    
    case 'ADD_INSIGHT':
      return {
        ...state,
        insights: [action.payload, ...state.insights],
      };
    
    case 'UPDATE_CATEGORIZATION_PATTERN':
      const existingPatternIndex = state.categorizationPatterns.findIndex(
        pattern => pattern.merchantPattern === action.payload.merchantPattern
      );
      
      if (existingPatternIndex >= 0) {
        const updatedPatterns = [...state.categorizationPatterns];
        updatedPatterns[existingPatternIndex] = {
          ...updatedPatterns[existingPatternIndex],
          ...action.payload,
          usageCount: updatedPatterns[existingPatternIndex].usageCount + 1,
          lastUsed: new Date(),
        };
        return { ...state, categorizationPatterns: updatedPatterns };
      } else {
        return {
          ...state,
          categorizationPatterns: [action.payload, ...state.categorizationPatterns],
        };
      }
    
    case 'UPDATE_DAILY_BRIEFING':
      return {
        ...state,
        dailyBriefing: { ...state.dailyBriefing, ...action.payload },
      };
    
    case 'ADD_CONVERSATION_MESSAGE':
      return {
        ...state,
        conversationHistory: [
          {
            id: `msg-${Date.now()}`,
            timestamp: new Date(),
            type: action.payload.type,
            message: action.payload.message,
            context: action.payload.context,
          },
          ...state.conversationHistory,
        ],
      };
    
    case 'SET_LISTENING':
      return { ...state, isListening: action.payload };
    
    case 'ADD_TO_AUDIO_QUEUE':
      return {
        ...state,
        audioQueue: [...state.audioQueue, action.payload],
      };
    
    case 'REMOVE_FROM_AUDIO_QUEUE':
      return {
        ...state,
        audioQueue: state.audioQueue.filter(item => item !== action.payload),
      };
    
    default:
      return state;
  }
}

// AI Assistant Context
interface AIFinancialAssistantContextType {
  state: AIAssistantState;
  dispatch: React.Dispatch<AIAssistantAction>;
  processStatement: (fileData: any) => Promise<void>;
  categorizeTransaction: (transaction: Partial<FinancialTransaction>) => Promise<FinancialTransaction>;
  generateDailyBriefing: () => Promise<void>;
  addUserMessage: (message: string) => void;
  generateAIResponse: (userMessage: string) => Promise<string>;
  suggestAudio: (context: string) => Promise<string>;
  suggestPodcast: (spendingPattern: any) => Promise<string>;
}

const AIFinancialAssistantContext = createContext<AIFinancialAssistantContextType | undefined>(undefined);

// AI Assistant Provider Component
export function AIFinancialAssistantProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(aiAssistantReducer, initialState);

  // Process uploaded bank statement
  const processStatement = async (fileData: any) => {
    dispatch({ type: 'SET_PROCESSING', payload: { isProcessing: true, task: 'Processing your statement...' } });
    
    try {
      // Simulate processing steps
      const steps = [
        'Reading your statement...',
        'Extracting transactions...',
        'Categorizing expenses...',
        'Generating insights...',
        'Updating your dashboard...'
      ];

      for (let i = 0; i < steps.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 800));
        dispatch({ type: 'SET_PROCESSING_PROGRESS', payload: ((i + 1) / steps.length) * 100});
        dispatch({ type: 'SET_PROCESSING', payload: { isProcessing: true, task: steps[i] } });
      }

      // Mock transaction data
      const mockTransactions: FinancialTransaction[] = [
        {
          id: 'txn-1',
          merchantName: 'Starbucks',
          amount: 4.75,
          date: new Date(),
          category: 'Coffee',
          confidence: 0.95,
          isProcessed: true,
          needsUserInput: false,
        },
        {
          id: 'txn-2',
          merchantName: 'Amazon.com',
          amount: 89.99,
          date: new Date(),
          category: 'Shopping',
          confidence: 0.75,
          isProcessed: true,
          needsUserInput: true,
        },
        {
          id: 'txn-3',
          merchantName: 'Shell Gas Station',
          amount: 45.67,
          date: new Date(),
          category: 'Gas',
          confidence: 0.98,
          isProcessed: true,
          needsUserInput: false,
        },
      ];

      dispatch({ type: 'ADD_TRANSACTIONS', payload: mockTransactions});

      // Generate insights
      const insights: AIInsight[] = [
        {
          id: 'insight-1',
          type: 'spending_trend',
          title: 'Coffee Spending Alert',
          message: 'Your coffee spending is up 25% this week. Want to explore some budget-friendly alternatives?',
          severity: 'warning',
          actionable: true,
          action: 'Review coffee budget',
          audioSuggestion: 'Lo-fi coffee shop vibes',
        },
        {
          id: 'insight-2',
          type: 'achievement',
          title: 'Great Job on Gas!',
          message: 'You\'re 15% under your gas budget this month. Keep up the excellent work!',
          severity: 'success',
          actionable: false,
          audioSuggestion: 'Celebration music',
        },
      ];

      insights.forEach(insight => dispatch({ type: 'ADD_INSIGHT', payload: insight }));

      // Add conversational response
      const response = `Perfect! I've processed your statement and found ${mockTransactions.length} transactions. I categorized most of them automatically, but I need your help with the Amazon purchase - is this shopping or business supplies? Your total spending for this period is $${mockTransactions.reduce((sum, t) => sum + t.amount, 0).toFixed(2)}.`;
      
      dispatch({ type: 'ADD_CONVERSATION_MESSAGE', payload: { type: 'ai', message: response } });

    } catch (error) {
      console.error('Failed to process statement:', error);
    } finally {
      dispatch({ type: 'SET_PROCESSING', payload: { isProcessing: false } });
    }
  };

  // Categorize a single transaction
  const categorizeTransaction = async (transaction: Partial<FinancialTransaction>): Promise<FinancialTransaction> => {
    // Mock AI categorization logic
    const mockCategories = {
      'Starbucks': { category: 'Coffee', confidence: 0.95 },
      'Amazon': { category: 'Shopping', confidence: 0.75 },
      'Shell': { category: 'Gas', confidence: 0.98 },
      'Walmart': { category: 'Groceries', confidence: 0.85 },
      'Uber': { category: 'Transportation', confidence: 0.90 },
    };

    const merchantName = transaction.merchantName || '';
    const pattern = Object.keys(mockCategories).find(key => 
      merchantName.toLowerCase().includes(key.toLowerCase())
    );

    const categorization = pattern ? mockCategories[pattern as keyof typeof mockCategories] : { category: 'Other', confidence: 0.5 };

    const categorizedTransaction: FinancialTransaction = {
      id: transaction.id || `txn-${Date.now()}`,
      merchantName: merchantName,
      amount: transaction.amount || 0,
      date: transaction.date || new Date(),
      category: categorization.category,
      confidence: categorization.confidence,
      isProcessed: true,
      needsUserInput: categorization.confidence < 0.8,
    };

    // Update categorization pattern
    if (pattern) {
      dispatch({
        type: 'UPDATE_CATEGORIZATION_PATTERN',
        payload: {
          merchantPattern: pattern,
          category: categorization.category,
          confidence: categorization.confidence,
          usageCount: 1,
          lastUsed: new Date(),
        },
      });
    }

    return categorizedTransaction;
  };

  // Generate daily briefing
  const generateDailyBriefing = async () => {
    const yesterdaySpending = 67.50;
    const weeklyTotal = 234.00;
    
    const budgetStatus = {
      'Groceries': { spent: 156, remaining: 244, percentage: 39 },
      'Dining': { spent: 89, remaining: 211, percentage: 30 },
      'Gas': { spent: 45, remaining: 155, percentage: 22 },
    };

    const goalProgress = {
      'Emergency Fund': { current: 3650, target: 5000, percentage: 73 },
      'Vacation Fund': { current: 1200, target: 3000, percentage: 40 },
    };

    dispatch({
      type: 'UPDATE_DAILY_BRIEFING',
      payload: { yesterdaySpending, weeklyTotal, budgetStatus, goalProgress },
    });

    const briefing = `Good morning! Quick financial check-in: You spent $${yesterdaySpending} yesterday, bringing your weekly total to $${weeklyTotal}. Your grocery budget still has $${budgetStatus.Groceries.remaining} remaining, and you're tracking beautifully toward your savings goals!`;
    
    dispatch({ type: 'ADD_CONVERSATION_MESSAGE', payload: { type: 'ai', message: briefing } });
  };

  // Add user message
  const addUserMessage = (message: string) => {
    dispatch({ type: 'ADD_CONVERSATION_MESSAGE', payload: { type: 'user', message } });
  };

  // Generate AI response
  const generateAIResponse = async (userMessage: string): Promise<string> => {
    // Mock AI response generation
    const responses = [
      "I understand! Let me help you with that.",
      "Great question! Here's what I found...",
      "I'm processing that for you right now.",
      "That's a smart financial decision!",
      "Let me analyze your spending patterns...",
    ];

    const randomResponse = responses[Math.floor(Math.random() * responses.length)];
    
    dispatch({ type: 'ADD_CONVERSATION_MESSAGE', payload: { type: 'ai', message: randomResponse } });
    
    return randomResponse;
  };

  // Suggest audio based on context
  const suggestAudio = async (context: string): Promise<string> => {
    const audioSuggestions: Record<string, string> = {
      'processing': 'Lo-fi beats for focus',
      'celebration': 'Upbeat celebration music',
      'relaxation': 'Calm ambient sounds',
      'motivation': 'Energetic workout playlist',
      'productivity': 'Classical focus music',
    };

    const suggestion = audioSuggestions[context] || 'Lo-fi beats for focus';
    dispatch({ type: 'ADD_TO_AUDIO_QUEUE', payload: suggestion});
    
    return suggestion;
  };

  // Suggest podcast based on spending patterns
  const suggestPodcast = async (spendingPattern: any): Promise<string> => {
    const podcastSuggestions = [
      'Personal Finance Podcast - Budgeting Basics',
      'Money Mindset - Building Wealth Habits',
      'Financial Freedom - Investment Strategies',
      'Smart Spending - Consumer Psychology',
    ];

    const suggestion = podcastSuggestions[Math.floor(Math.random() * podcastSuggestions.length)];
    return suggestion;
  };

  // Context value
  const value: AIFinancialAssistantContextType = {
    state,
    dispatch,
    processStatement,
    categorizeTransaction,
    generateDailyBriefing,
    addUserMessage,
    generateAIResponse,
    suggestAudio,
    suggestPodcast,
  };

  return (
    <AIFinancialAssistantContext.Provider value={value}>
      {children}
    </AIFinancialAssistantContext.Provider>
  );
}

// Custom hook to use AI Assistant context
export function useAIFinancialAssistant() {
  const context = useContext(AIFinancialAssistantContext);
  if (context === undefined) {
    throw new Error('useAIFinancialAssistant must be used within an AIFinancialAssistantProvider');
  }
  return context;
} 
