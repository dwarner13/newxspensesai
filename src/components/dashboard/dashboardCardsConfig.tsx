import React from 'react';
import { 
  Upload, 
  MessageCircle, 
  Heart, 
  Target, 
  TrendingUp, 
  Mic, 
  Music, 
  Zap,
  Banknote,
  FileText,
  BarChart3,
  Settings,
  Tag,
  BookOpen,
} from 'lucide-react';
import { DashboardStatCardProps } from './DashboardStatCard';

export interface DashboardStats {
  documentsProcessed: number;
  lastDocumentUpload: string | null;
  totalTransactions: number;
  categoriesLearned: number;
  aiAccuracy: number;
}

export interface CardConfigHelpers {
  navigate: (path: string) => void;
  handleSetGoals: () => void;
  handleViewPredictions: () => void;
  handleDebtElimination: () => void;
  handleInvestmentStrategy: () => void;
  handleBudgetReality: () => void;
  handleListenNow: () => void;
  handleStartSession: () => void;
  isProcessing: boolean;
  processingStatus: string;
}

/**
 * Central configuration for dashboard cards
 * Functions accept dynamic stats and helpers to generate card configs
 */

export const getCoreAIToolsCards = (
  dashboardStats: DashboardStats,
  isLoadingStats: boolean,
  helpers: CardConfigHelpers
): Omit<DashboardStatCardProps, 'icon'>[] => {
  return [
    {
      id: 'smart-import',
      title: 'Smart Import AI',
      description: 'Upload receipts and bank statements. Byte processes them instantly and you can chat about your data in real-time.',
      stats: { 
        lastUsed: dashboardStats.lastDocumentUpload || "Never", 
        documentsProcessed: isLoadingStats ? "..." : dashboardStats.documentsProcessed 
      },
      buttonText: 'Open Workspace',
      onClick: () => {}, // Fallback if navigateTo fails
      navigateTo: '/dashboard/smart-import-ai',
      color: 'from-blue-500 to-blue-600',
      isLoading: helpers.isProcessing && helpers.processingStatus.includes('Byte')
    },
    {
      id: 'financial-assistant',
      title: 'AI Chat Assistant',
      description: 'Chat with your AI financial assistant for insights, explanations, and planning. Get personalized advice anytime.',
      stats: { 
        available: "24/7", 
        // TODO: Replace hardcoded accuracy with real data from user feedback/corrections table
        accuracy: `${dashboardStats.aiAccuracy.toFixed(1)}%` 
      },
      buttonText: 'Open Workspace',
      onClick: () => {}, // Fallback if navigateTo fails
      navigateTo: '/dashboard/ai-chat-assistant',
      color: 'from-green-500 to-green-600'
    },
    {
      id: 'smart-categorization',
      title: 'Smart Categories',
      description: 'Automatically categorize your transactions with AI. Learn from your corrections and improve over time.',
      stats: { 
        accuracy: `${dashboardStats.aiAccuracy.toFixed(1)}%`, 
        categoriesLearned: isLoadingStats ? "..." : dashboardStats.categoriesLearned 
      },
      buttonText: 'Categorize Now',
      onClick: () => helpers.navigate('/dashboard/ai-categorization'),
      color: 'from-orange-500 to-orange-600'
    }
  ];
};

export const getPlanningAnalysisCards = (
  dashboardStats: DashboardStats,
  isLoadingStats: boolean,
  helpers: CardConfigHelpers
): Omit<DashboardStatCardProps, 'icon'>[] => {
  return [
    {
      id: 'transactions',
      title: 'Transactions',
      description: 'View and manage all your financial transactions with detailed insights.',
      stats: { 
        total: isLoadingStats ? "..." : dashboardStats.totalTransactions.toLocaleString(), 
        thisMonth: isLoadingStats ? "..." : Math.floor(dashboardStats.totalTransactions * 0.1)
      },
      buttonText: 'View All',
      onClick: () => helpers.navigate('/dashboard/transactions'),
      color: 'from-blue-500 to-blue-600',
      isLoading: false
    },
    {
      id: 'goal-concierge',
      title: 'AI Goal Concierge',
      description: 'Set and track your financial goals with personalized coaching.',
      // TODO: Replace hardcoded stats with real data from goals table
      stats: { activeGoals: 3, completionRate: "87%" },
      buttonText: 'Set Goals',
      onClick: helpers.handleSetGoals,
      color: 'from-purple-500 to-purple-600',
      isLoading: false
    },
    {
      id: 'smart-automation',
      title: 'Smart Automation',
      description: 'Automate repetitive financial tasks with AI-powered workflows.',
      // TODO: Replace hardcoded stats with real data from automations table
      stats: { automations: 12, timeSaved: "8h/week" },
      buttonText: 'Configure',
      onClick: () => helpers.navigate('/dashboard/smart-automation'),
      color: 'from-yellow-500 to-yellow-600',
      isLoading: false
    },
    {
      id: 'spending-predictions',
      title: 'Spending Predictions',
      description: 'AI-powered forecasts of your future spending patterns and trends.',
      // TODO: Replace hardcoded stats with real prediction data from analytics
      stats: { accuracy: "94%", predictions: 156 },
      buttonText: 'View Predictions',
      onClick: helpers.handleViewPredictions,
      color: 'from-indigo-500 to-indigo-600',
      isLoading: false
    },
    {
      id: 'debt-elimination',
      title: 'Debt Payoff Planner',
      description: 'Military-style debt destruction strategies and motivation.',
      // TODO: Replace hardcoded stats with real debt data from user accounts/liabilities
      stats: { debtReduced: "$12,847", monthsSaved: 18 },
      buttonText: 'Attack Debt',
      onClick: helpers.handleDebtElimination,
      color: 'from-red-500 to-red-600',
      isLoading: false
    },
    {
      id: 'investment-strategy',
      title: 'AI Financial Freedom',
      description: 'Wise investment advice and long-term wealth building strategies.',
      // TODO: Replace hardcoded stats with real portfolio data from investments table
      stats: { portfolioGrowth: "23%", riskLevel: "Moderate" },
      buttonText: 'Get Strategy',
      onClick: helpers.handleInvestmentStrategy,
      color: 'from-emerald-500 to-emerald-600',
      isLoading: false
    },
    {
      id: 'budget-reality',
      title: 'Bill Reminder System',
      description: 'Never miss a payment with smart reminders and automated tracking.',
      // TODO: Replace hardcoded stats with real reminder data from recurring_obligations table
      stats: { reminders: 5, saved: "$47" },
      buttonText: 'Set Reminders',
      onClick: helpers.handleBudgetReality,
      color: 'from-orange-500 to-orange-600',
      isLoading: false
    }
  ];
};

export const getEntertainmentWellnessCards = (
  helpers: CardConfigHelpers
): Omit<DashboardStatCardProps, 'icon'>[] => {
  return [
    {
      id: 'personal-podcast',
      title: 'Personal Podcast',
      description: 'AI-generated podcasts about your financial journey and money story.',
      // TODO: Replace hardcoded stats with real data from podcast episodes table
      stats: { lastEpisode: "2 days ago", totalEpisodes: 24 },
      buttonText: 'Listen Now',
      onClick: helpers.handleListenNow,
      color: 'from-violet-500 to-violet-600',
      isLoading: helpers.isProcessing && helpers.processingStatus.includes('podcast')
    },
    {
      id: 'financial-story',
      title: 'Financial Story',
      description: 'Transform your financial data into engaging stories with AI storytellers.',
      // TODO: Replace hardcoded stats with real data from stories table
      stats: { stories: 4, lastCreated: "1 hour ago" },
      buttonText: 'Create Story',
      onClick: () => helpers.navigate('/dashboard/financial-story'),
      color: 'from-purple-500 to-purple-600'
    },
    {
      id: 'financial-therapist',
      title: 'AI Financial Therapist',
      description: 'Emotional and behavioral coaching to improve your financial wellness. Chat about money stress and get support.',
      // TODO: Replace hardcoded stats with real session data from therapist sessions table
      stats: { lastSession: "3 days ago", stressLevel: "Low" },
      buttonText: 'Start Session',
      onClick: helpers.handleStartSession,
      color: 'from-pink-500 to-pink-600'
    },
    {
      id: 'wellness-studio',
      title: 'Wellness Studio',
      description: 'Educational content and guided sessions for financial health and wellness.',
      // TODO: Replace hardcoded stats with real wellness session data
      stats: { sessions: 12, wellnessScore: "85%" },
      buttonText: 'Start Session',
      onClick: () => helpers.navigate('/dashboard/wellness-studio'),
      color: 'from-pink-500 to-pink-600',
      isLoading: false
    },
    {
      id: 'spotify-integration',
      title: 'Spotify Integration',
      description: 'Curated playlists for focus, relaxation, and financial motivation.',
      // TODO: Replace hardcoded stats with real Spotify integration status
      stats: { status: "Connected", playlists: 8 },
      buttonText: 'Connect',
      onClick: () => window.open('/dashboard/spotify-integration', '_blank'),
      color: 'from-green-500 to-green-600',
      isLoading: false
    }
  ];
};

export const getBusinessTaxCards = (
  helpers: CardConfigHelpers
): Omit<DashboardStatCardProps, 'icon'>[] => {
  return [
    {
      id: 'tax-assistant',
      title: 'Tax Assistant',
      description: 'AI-powered tax preparation and optimization for maximum savings.',
      // TODO: Replace hardcoded stats with real tax savings calculated from deductions
      stats: { savings: "$2,400", accuracy: "99%" },
      buttonText: 'Get Started',
      onClick: () => helpers.navigate('/dashboard/tax-assistant'),
      color: 'from-blue-500 to-blue-600',
      isLoading: false
    },
    {
      id: 'business-intelligence',
      title: 'Business Intelligence',
      description: 'Advanced analytics and insights for business growth and optimization.',
      // TODO: Replace hardcoded stats with real report and insight counts
      stats: { reports: 8, insights: 156 },
      buttonText: 'View Reports',
      onClick: () => helpers.navigate('/dashboard/business-intelligence'),
      color: 'from-indigo-500 to-indigo-600',
      isLoading: false
    }
  ];
};

export const getToolsSettingsCards = (
  helpers: CardConfigHelpers
): Omit<DashboardStatCardProps, 'icon'>[] => {
  return [
    {
      id: 'analytics',
      title: 'Analytics',
      description: 'Comprehensive financial reports and detailed analytics dashboard.',
      // TODO: Replace hardcoded stats with real analytics metrics and last update timestamp
      stats: { metrics: 24, lastUpdate: "1 hour ago" },
      buttonText: 'View Analytics',
      onClick: () => helpers.navigate('/dashboard/analytics'),
      color: 'from-purple-500 to-purple-600',
      isLoading: false
    },
    {
      id: 'settings',
      title: 'Settings',
      description: 'Manage your account, preferences, and integrations.',
      // TODO: Replace hardcoded stats with real user settings last updated and integration count
      stats: { lastUpdated: "2 days ago", integrations: 5 },
      buttonText: 'Open Settings',
      onClick: () => helpers.navigate('/dashboard/settings'),
      color: 'from-gray-500 to-gray-600',
      isLoading: false
    },
    {
      id: 'reports',
      title: 'Reports',
      description: 'Generate and view comprehensive financial reports.',
      // TODO: Replace hardcoded stats with real report generation data
      stats: { generated: 12, lastReport: "1 week ago" },
      buttonText: 'View Reports',
      onClick: () => helpers.navigate('/dashboard/reports'),
      color: 'from-cyan-500 to-cyan-600',
      isLoading: false
    }
  ];
};

/**
 * Icon mapping for cards
 */
export const cardIcons: Record<string, React.ReactNode> = {
  'smart-import': <Upload className="w-6 h-6" />,
  'financial-assistant': <MessageCircle className="w-6 h-6" />,
  'smart-categorization': <Tag className="w-6 h-6" />,
  'transactions': <FileText className="w-6 h-6" />,
  'goal-concierge': <Target className="w-6 h-6" />,
  'smart-automation': <Zap className="w-6 h-6" />,
  'spending-predictions': <TrendingUp className="w-6 h-6" />,
  'debt-elimination': <Zap className="w-6 h-6" />,
  'investment-strategy': <BarChart3 className="w-6 h-6" />,
  'budget-reality': <Banknote className="w-6 h-6" />,
  'personal-podcast': <Mic className="w-6 h-6" />,
  'financial-story': <BookOpen className="w-6 h-6" />,
  'financial-therapist': <Heart className="w-6 h-6" />,
  'wellness-studio': <Heart className="w-6 h-6" />,
  'spotify-integration': <Music className="w-6 h-6" />,
  'tax-assistant': <FileText className="w-6 h-6" />,
  'business-intelligence': <BarChart3 className="w-6 h-6" />,
  'analytics': <BarChart3 className="w-6 h-6" />,
  'settings': <Settings className="w-6 h-6" />,
  'reports': <FileText className="w-6 h-6" />,
};


