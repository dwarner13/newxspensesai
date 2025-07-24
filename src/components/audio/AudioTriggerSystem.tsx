import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAudio, AudioTrack } from '../../contexts/AudioContext';
import { 
  Music, 
  Headphones, 
  Sparkles, 
  X, 
  Play, 
  Plus,
  Target,
  BookOpen,
  Heart,
  Zap,
  TrendingUp
} from 'lucide-react';

interface AudioTriggerSystemProps {
  currentPage?: string;
  userAction?: string;
  financialContext?: string;
  className?: string;
}

type TriggerType = 'suggestion' | 'celebration' | 'wellness' | 'focus' | 'learning';

interface TriggerConfig {
  message: string;
  type: TriggerType;
  context: string;
}

export function AudioTriggerSystem({ 
  currentPage, 
  userAction, 
  financialContext, 
  className = '' 
}: AudioTriggerSystemProps) {
  const { state, playTrack, addToQueue, getRecommendations } = useAudio();
  const [showTrigger, setShowTrigger] = useState(false);
  const [triggerMessage, setTriggerMessage] = useState('');
  const [suggestedTrack, setSuggestedTrack] = useState<AudioTrack | null>(null);
  const [triggerType, setTriggerType] = useState<TriggerType>('suggestion');

  // AI trigger logic based on context
  useEffect(() => {
    if (!currentPage || !userAction) return;

    const triggers: Record<string, Record<string, TriggerConfig>> = {
      // Page-based triggers
      'dashboard': {
        'expense_upload': {
          message: "Processing your expenses? Let's queue up some focus music to keep you productive!",
          type: 'focus',
          context: 'focus'
        },
        'budget_review': {
          message: "Reviewing your budget? I found a great podcast about smart spending habits!",
          type: 'learning',
          context: 'learning'
        },
        'goal_achievement': {
          message: "🎉 Goal achieved! Time to celebrate with some uplifting music!",
          type: 'celebration',
          context: 'celebrate'
        }
      },
      'transactions': {
        'categorization': {
          message: "Categorizing transactions? Here's some ambient music to help you focus!",
          type: 'focus',
          context: 'focus'
        },
        'high_spending': {
          message: "I notice some high spending patterns. Let's listen to mindful spending tips!",
          type: 'wellness',
          context: 'wellness'
        }
      },
      'goals': {
        'goal_creation': {
          message: "Setting new goals? I've got the perfect motivational podcast for you!",
          type: 'learning',
          context: 'learning'
        },
        'goal_progress': {
          message: "Great progress on your goals! Here's some inspiring content to keep you going!",
          type: 'celebration',
          context: 'celebrate'
        }
      },
      'reports': {
        'report_generation': {
          message: "Generating your financial report? This might take a moment - want some background music?",
          type: 'focus',
          context: 'focus'
        },
        'insight_discovery': {
          message: "Interesting insights! Let's dive deeper with some educational content!",
          type: 'learning',
          context: 'learning'
        }
      }
    };

    const pageTriggers = triggers[currentPage];
    if (!pageTriggers) return;

    const trigger = pageTriggers[userAction];
    if (!trigger) return;

    // Show trigger with delay for natural feel
    setTimeout(() => {
      setTriggerMessage(trigger.message);
      setTriggerType(trigger.type);
      setShowTrigger(true);
      
      // Get AI recommendations for this context
      getRecommendations(trigger.context).then((recommendations) => {
        if (recommendations.length > 0) {
          setSuggestedTrack(recommendations[0]);
        }
      });
    }, 2000);

  }, [currentPage, userAction, getRecommendations]);

  // Auto-hide trigger after some time
  useEffect(() => {
    if (showTrigger) {
      const timer = setTimeout(() => {
        setShowTrigger(false);
      }, 8000);
      return () => clearTimeout(timer);
    }
  }, [showTrigger]);

  // Handle play suggestion
  const handlePlaySuggestion = () => {
    if (suggestedTrack) {
      playTrack(suggestedTrack);
      setShowTrigger(false);
    }
  };

  // Handle add to queue
  const handleAddToQueue = () => {
    if (suggestedTrack) {
      addToQueue(suggestedTrack);
      setShowTrigger(false);
    }
  };

  // Handle dismiss
  const handleDismiss = () => {
    setShowTrigger(false);
  };

  // Get trigger icon
  const getTriggerIcon = () => {
    switch (triggerType) {
      case 'focus': return <Target size={20} className="text-blue-500" />;
      case 'learning': return <BookOpen size={20} className="text-green-500" />;
      case 'celebration': return <Sparkles size={20} className="text-yellow-500" />;
      case 'wellness': return <Heart size={20} className="text-purple-500" />;
      case 'suggestion': return <Music size={20} className="text-blue-500" />;
      default: return <Music size={20} className="text-blue-500" />;
    }
  };

  // Get trigger background
  const getTriggerBackground = () => {
    switch (triggerType) {
      case 'focus': return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800';
      case 'learning': return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800';
      case 'celebration': return 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800';
      case 'wellness': return 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800';
      case 'suggestion': return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800';
      default: return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800';
    }
  };

  return (
    <AnimatePresence>
      {showTrigger && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          className={`fixed top-4 right-4 z-50 max-w-sm ${className}`}
        >
          <div className={`
            ${getTriggerBackground()}
            border rounded-xl p-4 shadow-lg backdrop-blur-sm
          `}>
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center space-x-2">
                {getTriggerIcon()}
                <div className="flex items-center space-x-1">
                  <Sparkles size={14} className="text-blue-500" />
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">
                    AI Suggestion
                  </span>
                </div>
              </div>
              <button
                onClick={handleDismiss}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Message */}
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
              {triggerMessage}
            </p>

            {/* Suggested Track */}
            {suggestedTrack && (
              <div className="bg-white dark:bg-gray-800 rounded-lg p-3 mb-3">
                <div className="flex items-center space-x-3">
                  <img
                    src={suggestedTrack.albumArt || 'https://via.placeholder.com/40x40/6366f1/ffffff?text=🎵'}
                    alt={suggestedTrack.title}
                    className="w-10 h-10 rounded object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {suggestedTrack.title}
                    </h4>
                    <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                      {suggestedTrack.artist}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center space-x-2">
              <button
                onClick={handlePlaySuggestion}
                className="flex items-center space-x-1 bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                <Play size={14} />
                <span>Play Now</span>
              </button>
              
              <button
                onClick={handleAddToQueue}
                className="flex items-center space-x-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                <Plus size={14} />
                <span>Queue</span>
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Context-aware trigger hooks
export function useAudioTriggers() {
  const [currentContext, setCurrentContext] = useState<string>('');
  const [userAction, setUserAction] = useState<string>('');

  const triggerExpenseUpload = () => {
    setCurrentContext('dashboard');
    setUserAction('expense_upload');
  };

  const triggerBudgetReview = () => {
    setCurrentContext('dashboard');
    setUserAction('budget_review');
  };

  const triggerGoalAchievement = () => {
    setCurrentContext('dashboard');
    setUserAction('goal_achievement');
  };

  const triggerTransactionCategorization = () => {
    setCurrentContext('transactions');
    setUserAction('categorization');
  };

  const triggerHighSpending = () => {
    setCurrentContext('transactions');
    setUserAction('high_spending');
  };

  const triggerGoalCreation = () => {
    setCurrentContext('goals');
    setUserAction('goal_creation');
  };

  const triggerGoalProgress = () => {
    setCurrentContext('goals');
    setUserAction('goal_progress');
  };

  const triggerReportGeneration = () => {
    setCurrentContext('reports');
    setUserAction('report_generation');
  };

  const triggerInsightDiscovery = () => {
    setCurrentContext('reports');
    setUserAction('insight_discovery');
  };

  return {
    currentContext,
    userAction,
    triggerExpenseUpload,
    triggerBudgetReview,
    triggerGoalAchievement,
    triggerTransactionCategorization,
    triggerHighSpending,
    triggerGoalCreation,
    triggerGoalProgress,
    triggerReportGeneration,
    triggerInsightDiscovery,
  };
} 