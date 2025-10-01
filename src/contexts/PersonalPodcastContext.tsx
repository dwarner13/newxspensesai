import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';

// Podcast Episode Types
export interface PodcastEpisode {
  id: string;
  title: string;
  description: string;
  duration: number; // in seconds
  audioUrl?: string;
  script: string;
  episodeType: 'monthly' | 'weekly' | 'achievement' | 'goal' | 'insight' | 'celebration';
  createdAt: Date;
  financialData: {
    spendingTotal: number;
    topCategories: Array<{ name: string; amount: number; percentage: number }>;
    goalProgress: Array<{ name: string; current: number; target: number; percentage: number }>;
    achievements: string[];
    insights: string[];
    trends: {
      direction: 'up' | 'down' | 'stable';
      percentage: number;
      description: string;
    };
  };
  voiceType: 'friendly' | 'professional' | 'motivational' | 'analytical';
  isGenerated: boolean;
  isPlaying: boolean;
  playProgress: number;
}

// User Podcast Preferences
export interface PodcastPreferences {
  frequency: 'daily' | 'weekly' | 'monthly' | 'achievement';
  episodeLength: 5 | 10 | 15;
  voiceType: 'friendly' | 'professional' | 'motivational' | 'analytical';
  includeMusic: boolean;
  includeAchievements: boolean;
  includeInsights: boolean;
  includeGoals: boolean;
  autoGenerate: boolean;
}

// Podcast State
export interface PodcastState {
  episodes: PodcastEpisode[];
  currentEpisode: PodcastEpisode | null;
  preferences: PodcastPreferences;
  isGenerating: boolean;
  generationProgress: number;
  libraryStats: {
    totalEpisodes: number;
    totalListenTime: number;
    favoriteEpisodes: string[];
    completionRate: number;
  };
}

// Podcast Actions
export type PodcastAction =
  | { type: 'SET_EPISODES'; payload: PodcastEpisode[] }
  | { type: 'ADD_EPISODE'; payload: PodcastEpisode }
  | { type: 'UPDATE_EPISODE'; payload: { id: string; updates: Partial<PodcastEpisode> } }
  | { type: 'DELETE_EPISODE'; payload: string }
  | { type: 'SET_CURRENT_EPISODE'; payload: PodcastEpisode | null }
  | { type: 'SET_PREFERENCES'; payload: Partial<PodcastPreferences> }
  | { type: 'SET_GENERATING'; payload: boolean }
  | { type: 'SET_GENERATION_PROGRESS'; payload: number }
  | { type: 'UPDATE_LIBRARY_STATS'; payload: Partial<PodcastState['libraryStats']> }
  | { type: 'PLAY_EPISODE'; payload: string }
  | { type: 'PAUSE_EPISODE'; payload: string }
  | { type: 'UPDATE_PLAY_PROGRESS'; payload: { episodeId: string; progress: number } };

// Initial State
const initialState: PodcastState = {
  episodes: [],
  currentEpisode: null,
  preferences: {
    frequency: 'monthly',
    episodeLength: 10,
    voiceType: 'friendly',
    includeMusic: true,
    includeAchievements: true,
    includeInsights: true,
    includeGoals: true,
    autoGenerate: true,
  },
  isGenerating: false,
  generationProgress: 0,
  libraryStats: {
    totalEpisodes: 0,
    totalListenTime: 0,
    favoriteEpisodes: [],
    completionRate: 0,
  },
};

// Podcast Reducer
function podcastReducer(state: PodcastState, action: PodcastAction): PodcastState {
  switch (action.type) {
    case 'SET_EPISODES':
      return { ...state, episodes: action.payload };
    
    case 'ADD_EPISODE':
      return { 
        ...state, 
        episodes: [action.payload, ...state.episodes],
        libraryStats: {
          ...state.libraryStats,
          totalEpisodes: state.libraryStats.totalEpisodes + 1,
        }
      };
    
    case 'UPDATE_EPISODE':
      return {
        ...state,
        episodes: state.episodes.map(episode =>
          episode.id === action.payload.id
            ? { ...episode, ...action.payload.updates }
            : episode
        ),
        currentEpisode: state.currentEpisode?.id === action.payload.id
          ? { ...state.currentEpisode, ...action.payload.updates }
          : state.currentEpisode,
      };
    
    case 'DELETE_EPISODE':
      return {
        ...state,
        episodes: state.episodes.filter(episode => episode.id !== action.payload),
        libraryStats: {
          ...state.libraryStats,
          totalEpisodes: Math.max(0, state.libraryStats.totalEpisodes - 1),
        }
      };
    
    case 'SET_CURRENT_EPISODE':
      return { ...state, currentEpisode: action.payload };
    
    case 'SET_PREFERENCES':
      return { 
        ...state, 
        preferences: { ...state.preferences, ...action.payload }
      };
    
    case 'SET_GENERATING':
      return { ...state, isGenerating: action.payload };
    
    case 'SET_GENERATION_PROGRESS':
      return { ...state, generationProgress: action.payload };
    
    case 'UPDATE_LIBRARY_STATS':
      return {
        ...state,
        libraryStats: { ...state.libraryStats, ...action.payload }
      };
    
    case 'PLAY_EPISODE':
      return {
        ...state,
        episodes: state.episodes.map(episode => ({
          ...episode,
          isPlaying: episode.id === action.payload
        })),
        currentEpisode: state.episodes.find(ep => ep.id === action.payload) || null,
      };
    
    case 'PAUSE_EPISODE':
      return {
        ...state,
        episodes: state.episodes.map(episode => ({
          ...episode,
          isPlaying: false
        })),
      };
    
    case 'UPDATE_PLAY_PROGRESS':
      return {
        ...state,
        episodes: state.episodes.map(episode =>
          episode.id === action.payload.episodeId
            ? { ...episode, playProgress: action.payload.progress }
            : episode
        ),
        currentEpisode: state.currentEpisode?.id === action.payload.episodeId
          ? { ...state.currentEpisode, playProgress: action.payload.progress }
          : state.currentEpisode,
      };
    
    default:
      return state;
  }
}

// Podcast Context
interface PersonalPodcastContextType {
  state: PodcastState;
  dispatch: React.Dispatch<PodcastAction>;
  generateEpisode: (triggerType: string, financialData?: any) => Promise<PodcastEpisode>;
  playEpisode: (episodeId: string) => void;
  pauseEpisode: (episodeId: string) => void;
  updatePlayProgress: (episodeId: string, progress: number) => void;
  updatePreferences: (preferences: Partial<PodcastPreferences>) => void;
  deleteEpisode: (episodeId: string) => void;
  getEpisodeInsights: (episodeId: string) => any;
  shareEpisode: (episodeId: string, platform: string) => void;
}

const PersonalPodcastContext = createContext<PersonalPodcastContextType | undefined>(undefined);

// Podcast Provider Component
export function PersonalPodcastProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(podcastReducer, initialState);

  // Generate a new episode
  const generateEpisode = async (triggerType: string, financialData?: any): Promise<PodcastEpisode> => {
    dispatch({ type: 'SET_GENERATING', payload: true});
    dispatch({ type: 'SET_GENERATION_PROGRESS', payload: 0});

    try {
      // Simulate generation progress
      for (let i = 0; i <= 100; i += 20) {
        await new Promise(resolve => setTimeout(resolve, 200));
        dispatch({ type: 'SET_GENERATION_PROGRESS', payload: i});
      }

      // Mock financial data if not provided
      const mockFinancialData = financialData || {
        spendingTotal: 3247,
        topCategories: [
          { name: 'Groceries', amount: 847, percentage: 26 },
          { name: 'Dining Out', amount: 623, percentage: 19 },
          { name: 'Gas', amount: 234, percentage: 7 },
        ],
        goalProgress: [
          { name: 'Emergency Fund', current: 3650, target: 5000, percentage: 73 },
          { name: 'Vacation Fund', current: 1200, target: 3000, percentage: 40 },
        ],
        achievements: [
          'First month under $3,500 in 6 months',
          'Stayed under grocery budget for 3 weeks',
          'Increased emergency fund by $500',
        ],
        insights: [
          'Your coffee spending increased by 40% this month',
          'You\'re most efficient with groceries on Tuesdays',
          'Weekend spending is 25% higher than weekdays',
        ],
        trends: {
          direction: 'down' as const,
          percentage: 12,
          description: '12% less than last month',
        },
      };

      // Generate episode title and description
      const episodeTitle = generateEpisodeTitle(triggerType, mockFinancialData);
      const episodeDescription = generateEpisodeDescription(triggerType, mockFinancialData);

      // Generate AI script
      const script = await generateAIScript(triggerType, mockFinancialData, state.preferences);

      const newEpisode: PodcastEpisode = {
        id: `episode-${Date.now()}`,
        title: episodeTitle,
        description: episodeDescription,
        duration: state.preferences.episodeLength * 60, // Convert to seconds
        script,
        episodeType: triggerType as any,
        createdAt: new Date(),
        financialData: mockFinancialData,
        voiceType: state.preferences.voiceType,
        isGenerated: true,
        isPlaying: false,
        playProgress: 0,
      };

      dispatch({ type: 'ADD_EPISODE', payload: newEpisode});
      dispatch({ type: 'SET_GENERATING', payload: false});
      dispatch({ type: 'SET_GENERATION_PROGRESS', payload: 0});

      return newEpisode;
    } catch (error) {
      console.error('Failed to generate episode:', error);
      dispatch({ type: 'SET_GENERATING', payload: false});
      dispatch({ type: 'SET_GENERATION_PROGRESS', payload: 0});
      throw error;
    }
  };

  // Generate episode title
  const generateEpisodeTitle = (triggerType: string, financialData: any): string => {
    const userName = 'Sarah'; // TODO: Get from user context
    const currentMonth = new Date().toLocaleString('default', { month: 'long' });
    const currentYear = new Date().getFullYear();

    switch (triggerType) {
      case 'monthly':
        return `${userName}'s Money Story - ${currentMonth} ${currentYear}`;
      case 'weekly':
        return `${userName}'s Week in Review`;
      case 'achievement':
        return `${userName}'s Victory Lap - Goal Achieved!`;
      case 'goal':
        return `${userName}'s Goal Progress Update`;
      case 'insight':
        return `${userName}'s Financial Insights`;
      case 'celebration':
        return `${userName}'s Success Celebration`;
      default:
        return `${userName}'s Financial Journey`;
    }
  };

  // Generate episode description
  const generateEpisodeDescription = (triggerType: string, financialData: any): string => {
    switch (triggerType) {
      case 'monthly':
        return `Your complete financial story for this month. Discover insights about your spending patterns, celebrate your achievements, and get motivated for the month ahead.`;
      case 'weekly':
        return `A quick check-in on your financial week. See how you're doing with your goals and get insights into your spending habits.`;
      case 'achievement':
        return `A special celebration episode! You've reached an important financial milestone. Let's look back at your journey and celebrate this amazing achievement.`;
      case 'goal':
        return `An update on your financial goals. See your progress, get motivated, and discover strategies to reach your targets faster.`;
      case 'insight':
        return `Deep insights into your financial behavior. Discover patterns, opportunities, and strategies to optimize your money management.`;
      case 'celebration':
        return `Time to celebrate your financial wins! This episode highlights your achievements and keeps you motivated on your journey.`;
      default:
        return `Your personalized financial story and insights.`;
    }
  };

  // Generate AI script
  const generateAIScript = async (triggerType: string, financialData: any, preferences: PodcastPreferences): Promise<string> => {
    // TODO: Integrate with actual AI service
    // For now, return a mock script
    const userName = 'Sarah';
    const { spendingTotal, topCategories, goalProgress, achievements, insights, trends } = financialData;

    const script = `
Welcome back to YOUR financial journey, ${userName}. This month was quite the adventure! Let me tell you what I discovered about your spending.

You spent $${spendingTotal.toLocaleString()} this month, which is actually ${trends.percentage}% ${trends.direction === 'down' ? 'less' : 'more'} than last month - ${trends.direction === 'down' ? 'great job' : 'let\'s explore what happened'}!

Your biggest spending categories were ${topCategories.map(cat => `${cat.name} at $${cat.amount}`).join(', ')}, which tells me a lot about your priorities.

Let's celebrate your wins this month: ${achievements.join(', ')}. These achievements show real progress in your financial journey.

Here's what your spending tells me about your priorities: ${insights.join(' ')}. These insights can help you make even better financial decisions.

Your progress toward your goals is incredible! ${goalProgress.map(goal => `You're ${goal.percentage}% to your ${goal.name} goal`).join(', ')}.

I have some gentle suggestions for next month: focus on ${topCategories[0]?.name.toLowerCase()} spending and consider setting up automatic transfers to your savings goals.

You're on such an amazing financial journey, ${userName}. Every month you're building better habits and getting closer to your dreams.

I'm excited to see what next month brings for you! Keep up the fantastic work, and remember, every financial decision is a step toward your future.
    `;

    return script.trim();
  };

  // Play episode
  const playEpisode = (episodeId: string) => {
    dispatch({ type: 'PLAY_EPISODE', payload: episodeId});
  };

  // Pause episode
  const pauseEpisode = (episodeId: string) => {
    dispatch({ type: 'PAUSE_EPISODE', payload: episodeId});
  };

  // Update play progress
  const updatePlayProgress = (episodeId: string, progress: number) => {
    dispatch({ type: 'UPDATE_PLAY_PROGRESS', payload: { episodeId, progress } });
  };

  // Update preferences
  const updatePreferences = (preferences: Partial<PodcastPreferences>) => {
    dispatch({ type: 'SET_PREFERENCES', payload: preferences});
  };

  // Delete episode
  const deleteEpisode = (episodeId: string) => {
    dispatch({ type: 'DELETE_EPISODE', payload: episodeId});
  };

  // Get episode insights
  const getEpisodeInsights = (episodeId: string) => {
    const episode = state.episodes.find(ep => ep.id === episodeId);
    return episode?.financialData;
  };

  // Share episode
  const shareEpisode = (episodeId: string, platform: string) => {
    const episode = state.episodes.find(ep => ep.id === episodeId);
    if (episode) {
      // TODO: Implement actual sharing
      console.log(`Sharing episode "${episode.title}" to ${platform}`);
    }
  };

  // Context value
  const value: PersonalPodcastContextType = {
    state,
    dispatch,
    generateEpisode,
    playEpisode,
    pauseEpisode,
    updatePlayProgress,
    updatePreferences,
    deleteEpisode,
    getEpisodeInsights,
    shareEpisode,
  };

  return (
    <PersonalPodcastContext.Provider value={value}>
      {children}
    </PersonalPodcastContext.Provider>
  );
}

// Custom hook to use podcast context
export function usePersonalPodcast() {
  const context = useContext(PersonalPodcastContext);
  if (context === undefined) {
    throw new Error('usePersonalPodcast must be used within a PersonalPodcastProvider');
  }
  return context;
} 
