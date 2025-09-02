import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, 
  Brain, 
  Target, 
  Upload, 
  TrendingUp, 
  Eye, 
  CheckCircle, 
  Sparkles,
  Heart,
  Banknote,
  Calculator,
  Building2,
  Zap,
  Award,
  Camera,
  Mic,
  Headphones,
  Music,
  BarChart3,
  PieChart,
  Calendar,
  Clock,
  Star,
  Gift,
  Lightbulb,
  Shield,
  Users,
  Settings
} from 'lucide-react';

interface QuickAction {
  id: string;
  label: string;
  prompt: string;
  icon: React.ReactNode;
  category: string;
  description?: string;
  isPopular?: boolean;
}

interface QuickActionButtonsProps {
  actions: QuickAction[];
  onActionClick: (action: QuickAction) => void;
  employeeName: string;
  isVisible: boolean;
  isMobile?: boolean;
  className?: string;
}

const categoryColors = {
  documents: 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100',
  organization: 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100',
  categorization: 'bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100',
  analysis: 'bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100',
  planning: 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100',
  investing: 'bg-cyan-50 border-cyan-200 text-cyan-700 hover:bg-cyan-100',
  emotional: 'bg-pink-50 border-pink-200 text-pink-700 hover:bg-pink-100',
  mindset: 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100',
  balance: 'bg-teal-50 border-teal-200 text-teal-700 hover:bg-teal-100',
  goals: 'bg-violet-50 border-violet-200 text-violet-700 hover:bg-violet-100',
  tracking: 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100',
  celebration: 'bg-yellow-50 border-yellow-200 text-yellow-700 hover:bg-yellow-100',
  predictions: 'bg-sky-50 border-sky-200 text-sky-700 hover:bg-sky-100',
  forecasting: 'bg-lime-50 border-lime-200 text-lime-700 hover:bg-lime-100',
  review: 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100',
  correction: 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100',
  creation: 'bg-fuchsia-50 border-fuchsia-200 text-fuchsia-700 hover:bg-fuchsia-100'
};

const getCategoryColor = (category: string) => {
  return categoryColors[category as keyof typeof categoryColors] || 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100';
};

export function QuickActionButtons({ 
  actions, 
  onActionClick, 
  employeeName, 
  isVisible, 
  isMobile = false,
  className = ''
}: QuickActionButtonsProps) {
  const popularActions = actions.filter(action => action.isPopular);
  const regularActions = actions.filter(action => !action.isPopular);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -20, height: 0 }}
          animate={{ opacity: 1, y: 0, height: 'auto' }}
          exit={{ opacity: 0, y: -20, height: 0 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          className={`bg-gray-50 border-b border-gray-200 p-4 ${className}`}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-800">
                Quick Actions
              </h3>
              <p className="text-xs text-gray-600">
                {employeeName} is ready to help with these common tasks
              </p>
            </div>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2 }}
              className="flex items-center space-x-1"
            >
              <Sparkles className="w-4 h-4 text-orange-500" />
              <span className="text-xs text-orange-600 font-medium">AI Powered</span>
            </motion.div>
          </div>

          {/* Popular Actions */}
          {popularActions.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center space-x-2 mb-3">
                <Star className="w-4 h-4 text-yellow-500" />
                <span className="text-xs font-medium text-gray-700">Popular</span>
              </div>
              <div className={`grid gap-2 ${isMobile ? 'grid-cols-1' : 'grid-cols-2'}`}>
                {popularActions.map((action, index) => (
                  <motion.button
                    key={action.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => onActionClick(action)}
                    className={`flex items-center space-x-3 p-3 border rounded-lg transition-all duration-200 ${getCategoryColor(action.category)}`}
                  >
                    <div className="flex-shrink-0">
                      {action.icon}
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-sm font-medium">{action.label}</p>
                      {action.description && (
                        <p className="text-xs opacity-75 mt-1">{action.description}</p>
                      )}
                    </div>
                    <div className="flex-shrink-0">
                      <Star className="w-3 h-3 text-yellow-500" />
                    </div>
                  </motion.button>
                ))}
              </div>
            </div>
          )}

          {/* Regular Actions */}
          {regularActions.length > 0 && (
            <div>
              <div className="flex items-center space-x-2 mb-3">
                <Lightbulb className="w-4 h-4 text-blue-500" />
                <span className="text-xs font-medium text-gray-700">More Options</span>
              </div>
              <div className={`grid gap-2 ${isMobile ? 'grid-cols-1' : 'grid-cols-2'}`}>
                {regularActions.map((action, index) => (
                  <motion.button
                    key={action.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: (popularActions.length + index) * 0.1 }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => onActionClick(action)}
                    className={`flex items-center space-x-3 p-3 border rounded-lg transition-all duration-200 ${getCategoryColor(action.category)}`}
                  >
                    <div className="flex-shrink-0">
                      {action.icon}
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-sm font-medium">{action.label}</p>
                      {action.description && (
                        <p className="text-xs opacity-75 mt-1">{action.description}</p>
                      )}
                    </div>
                  </motion.button>
                ))}
              </div>
            </div>
          )}

          {/* Footer */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-4 pt-3 border-t border-gray-200"
          >
            <p className="text-xs text-gray-500 text-center">
              💡 Tip: Click any action to start a conversation with {employeeName}
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Predefined action sets for different employees
export const employeeActionSets: Record<string, QuickAction[]> = {
  'smart-import': [
    {
      id: 'process-bank',
      label: 'Process my bank statement',
      prompt: 'Help me process and organize my bank statement',
      icon: <FileText className="w-4 h-4" />,
      category: 'documents',
      description: 'Upload and categorize bank transactions',
      isPopular: true
    },
    {
      id: 'organize-data',
      label: 'Organize messy transaction data',
      prompt: 'I have messy transaction data that needs organizing',
      icon: <Brain className="w-4 h-4" />,
      category: 'organization',
      description: 'Clean up and structure your data',
      isPopular: true
    },
    {
      id: 'categorize-expenses',
      label: 'Help categorize my expenses',
      prompt: 'Help me categorize my recent expenses',
      icon: <Target className="w-4 h-4" />,
      category: 'categorization',
      description: 'AI-powered expense categorization'
    },
    {
      id: 'upload-multiple',
      label: 'Upload multiple documents',
      prompt: 'I want to upload multiple financial documents',
      icon: <Upload className="w-4 h-4" />,
      category: 'documents',
      description: 'Batch process multiple files'
    }
  ],
  'financial-assistant': [
    {
      id: 'review-spending',
      label: 'Review my spending patterns',
      prompt: 'Help me review and analyze my spending patterns',
      icon: <TrendingUp className="w-4 h-4" />,
      category: 'analysis',
      description: 'Get insights into your spending habits',
      isPopular: true
    },
    {
      id: 'create-budget',
      label: 'Create a budget plan',
      prompt: 'Help me create a comprehensive budget plan',
      icon: <Target className="w-4 h-4" />,
      category: 'planning',
      description: 'Build a personalized budget',
      isPopular: true
    },
    {
      id: 'analyze-health',
      label: 'Analyze my financial health',
      prompt: 'Give me an analysis of my overall financial health',
      icon: <Heart className="w-4 h-4" />,
      category: 'analysis',
      description: 'Comprehensive financial health check'
    },
    {
      id: 'investment-advice',
      label: 'Get investment advice',
      prompt: 'I need advice on investment strategies',
      icon: <TrendingUp className="w-4 h-4" />,
      category: 'investing',
      description: 'Personalized investment guidance'
    }
  ],
  'financial-therapist': [
    {
      id: 'money-stress',
      label: "I'm stressed about money",
      prompt: 'I need help dealing with financial stress and anxiety',
      icon: <Heart className="w-4 h-4" />,
      category: 'emotional',
      description: 'Get support for financial anxiety',
      isPopular: true
    },
    {
      id: 'emotional-spending',
      label: 'Help with emotional spending',
      prompt: 'I struggle with emotional spending and need guidance',
      icon: <Heart className="w-4 h-4" />,
      category: 'emotional',
      description: 'Address emotional spending patterns',
      isPopular: true
    },
    {
      id: 'money-mindset',
      label: 'Improve my money mindset',
      prompt: 'Help me develop a healthier relationship with money',
      icon: <Sparkles className="w-4 h-4" />,
      category: 'mindset',
      description: 'Transform your money relationship'
    },
    {
      id: 'financial-balance',
      label: 'Find financial balance',
      prompt: 'I need help finding balance in my financial life',
      icon: <Heart className="w-4 h-4" />,
      category: 'balance',
      description: 'Achieve financial wellness'
    }
  ],
  'goal-concierge': [
    {
      id: 'set-goals',
      label: 'Set new financial goals',
      prompt: 'Help me set and plan new financial goals',
      icon: <Target className="w-4 h-4" />,
      category: 'goals',
      description: 'Define and plan your financial objectives',
      isPopular: true
    },
    {
      id: 'track-progress',
      label: 'Track my progress',
      prompt: 'Show me my progress on current financial goals',
      icon: <TrendingUp className="w-4 h-4" />,
      category: 'tracking',
      description: 'Monitor your goal achievements',
      isPopular: true
    },
    {
      id: 'action-plan',
      label: 'Create an action plan',
      prompt: 'Create a detailed action plan for my financial goals',
      icon: <CheckCircle className="w-4 h-4" />,
      category: 'planning',
      description: 'Step-by-step goal execution plan'
    },
    {
      id: 'celebrate-wins',
      label: 'Celebrate recent wins',
      prompt: 'Help me celebrate my recent financial achievements',
      icon: <Award className="w-4 h-4" />,
      category: 'celebration',
      description: 'Acknowledge your financial victories'
    }
  ],
  'spending-predictions': [
    {
      id: 'predict-spending',
      label: "Predict my next month's spending",
      prompt: 'Predict my spending patterns for next month',
      icon: <TrendingUp className="w-4 h-4" />,
      category: 'predictions',
      description: 'AI-powered spending forecasts',
      isPopular: true
    },
    {
      id: 'show-patterns',
      label: 'Show me financial patterns',
      prompt: 'Analyze and show me my financial patterns',
      icon: <Eye className="w-4 h-4" />,
      category: 'analysis',
      description: 'Discover hidden spending patterns',
      isPopular: true
    },
    {
      id: 'forecast-expenses',
      label: 'Forecast upcoming expenses',
      prompt: 'Help me forecast my upcoming expenses',
      icon: <TrendingUp className="w-4 h-4" />,
      category: 'forecasting',
      description: 'Predict future financial needs'
    },
    {
      id: 'read-future',
      label: 'Read my money future',
      prompt: 'Give me insights about my financial future',
      icon: <Sparkles className="w-4 h-4" />,
      category: 'predictions',
      description: 'Long-term financial outlook'
    }
  ],
  'categorization': [
    {
      id: 'categorize-transactions',
      label: 'Categorize my transactions',
      prompt: 'Help me categorize my recent transactions',
      icon: <Target className="w-4 h-4" />,
      category: 'categorization',
      description: 'AI-powered transaction categorization',
      isPopular: true
    },
    {
      id: 'review-categories',
      label: 'Review my spending categories',
      prompt: 'Review and optimize my spending categories',
      icon: <Eye className="w-4 h-4" />,
      category: 'review',
      description: 'Optimize your category system',
      isPopular: true
    },
    {
      id: 'fix-miscategorized',
      label: 'Fix miscategorized items',
      prompt: 'Help me fix items that were miscategorized',
      icon: <CheckCircle className="w-4 h-4" />,
      category: 'correction',
      description: 'Correct categorization errors'
    },
    {
      id: 'create-categories',
      label: 'Create new categories',
      prompt: 'Help me create new spending categories',
      icon: <Sparkles className="w-4 h-4" />,
      category: 'creation',
      description: 'Build custom spending categories'
    }
  ]
};
