import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAIFinancialAssistant } from '../../contexts/AIFinancialAssistantContext';
import { usePersonalPodcast } from '../../contexts/PersonalPodcastContext';
import { useAudio } from '../../contexts/AudioContext';
import { 
  Bot, 
  Upload, 
  MessageCircle, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle, 
  Sparkles,
  Clock,
  DollarSign,
  Target,
  Music,
  Headphones,
  Mic,
  Play,
  Pause,
  FileText,
  BarChart3,
  Lightbulb,
  Zap,
  ArrowRight,
  Plus
} from 'lucide-react';

export function AIAssistantDashboard() {
  const { 
    state, 
    processStatement, 
    generateDailyBriefing,
    suggestAudio,
    suggestPodcast
  } = useAIFinancialAssistant();
  
  const { generateEpisode } = usePersonalPodcast();
  const { playTrack, pauseTrack, currentTrack } = useAudio();
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Generate demo data on first load
  useEffect(() => {
    if (state.conversationHistory.length === 0) {
      generateDailyBriefing();
    }
  }, []);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setIsProcessing(true);
      await processStatement({ fileName: file.name });
      setIsProcessing(false);
    }
  };

  const handleAudioSuggestion = async (context: string) => {
    const audioSuggestion = await suggestAudio(context);
    playTrack({
      id: 'ai-suggestion',
      title: audioSuggestion,
      artist: 'AI Recommendation',
      url: '#',
      duration: 180,
    });
  };

  const handlePodcastSuggestion = async () => {
    const podcastSuggestion = await suggestPodcast({});
    await generateEpisode('insight');
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'spending_trend': return <TrendingUp size={20} className="text-blue-500" />;
      case 'budget_alert': return <AlertCircle size={20} className="text-red-500" />;
      case 'goal_progress': return <CheckCircle size={20} className="text-green-500" />;
      case 'achievement': return <Sparkles size={20} className="text-yellow-500" />;
      default: return <Lightbulb size={20} className="text-purple-500" />;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-center space-x-3 mb-4"
        >
          <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
            <Bot size={32} className="text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
              AI Financial Assistant
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              Your intelligent financial companion with conversational AI
            </p>
          </div>
        </motion.div>
      </div>

      {/* Daily Briefing */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-2xl p-6 border border-blue-200 dark:border-blue-800"
      >
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
            <MessageCircle size={20} className="text-white" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Today's Financial Briefing
          </h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {formatCurrency(state.dailyBriefing.yesterdaySpending)}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Yesterday's Spending
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {formatCurrency(state.dailyBriefing.weeklyTotal)}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Weekly Total
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {Object.keys(state.dailyBriefing.budgetStatus).length}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Active Budgets
            </div>
          </div>
        </div>
      </motion.div>

      {/* AI Capabilities */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        {[
          {
            title: 'Smart Categorization',
            description: 'AI automatically categorizes expenses with 95% accuracy',
            icon: <FileText size={24} className="text-blue-500" />,
            color: 'from-blue-500 to-blue-600',
          },
          {
            title: 'Real-time Insights',
            description: 'Get instant financial insights and spending patterns',
            icon: <BarChart3 size={24} className="text-green-500" />,
            color: 'from-green-500 to-green-600',
          },
          {
            title: 'Audio Integration',
            description: 'Music and podcast suggestions based on your activities',
            icon: <Music size={24} className="text-purple-500" />,
            color: 'from-purple-500 to-purple-600',
          },
          {
            title: 'Conversational AI',
            description: 'Natural language processing for all financial queries',
            icon: <MessageCircle size={24} className="text-pink-500" />,
            color: 'from-pink-500 to-pink-600',
          },
        ].map((capability, index) => (
          <div
            key={index}
            className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-shadow"
          >
            <div className={`w-12 h-12 bg-gradient-to-r ${capability.color} rounded-lg flex items-center justify-center mb-4`}>
              {capability.icon}
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              {capability.title}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              {capability.description}
            </p>
          </div>
        ))}
      </motion.div>

      {/* Upload Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6"
      >
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-green-600 rounded-lg flex items-center justify-center">
            <Upload size={20} className="text-white" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Upload & Process Statements
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Upload Area */}
          <div className="space-y-4">
            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center hover:border-purple-400 transition-colors">
              <Upload size={48} className="mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Drop your bank statement here
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Supports PDF, CSV, QFX, and OFX formats
              </p>
              <label className="inline-flex items-center px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors cursor-pointer">
                <Upload size={16} className="mr-2" />
                Choose File
                <input
                  type="file"
                  accept=".pdf,.csv,.qfx,.ofx"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>

            {selectedFile && (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <CheckCircle size={16} className="text-green-500" />
                  <span className="text-green-700 dark:text-green-300 font-medium">
                    {selectedFile.name} selected
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Processing Status */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Processing Status
            </h3>
            
            {isProcessing ? (
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-500"></div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Processing your statement...
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <motion.div
                    className="bg-purple-500 h-2 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${state.processingProgress}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
              </div>
            ) : (
              <div className="text-gray-500 dark:text-gray-400 text-sm">
                Ready to process your financial statements
              </div>
            )}

            {/* Quick Actions */}
            <div className="space-y-2">
              <button
                onClick={() => handleAudioSuggestion('productivity')}
                className="w-full flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
              >
                <div className="flex items-center space-x-2">
                  <Music size={16} className="text-purple-500" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Get productivity music
                  </span>
                </div>
                <ArrowRight size={16} className="text-gray-400" />
              </button>

              <button
                onClick={handlePodcastSuggestion}
                className="w-full flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
              >
                <div className="flex items-center space-x-2">
                  <Headphones size={16} className="text-purple-500" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Generate personal podcast
                  </span>
                </div>
                <ArrowRight size={16} className="text-gray-400" />
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* AI Insights */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-lg flex items-center justify-center">
              <Lightbulb size={20} className="text-white" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              AI Insights
            </h2>
          </div>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {state.insights.length} insights
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {state.insights.map((insight) => (
            <div
              key={insight.id}
              className={`p-4 rounded-lg border ${
                insight.severity === 'warning' 
                  ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800' :
                insight.severity === 'success'
                  ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' :
                  'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
              }`}
            >
              <div className="flex items-start space-x-3">
                {getInsightIcon(insight.type)}
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900 dark:text-white mb-1">
                    {insight.title}
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    {insight.message}
                  </p>
                  {insight.actionable && (
                    <button className="text-xs text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 font-medium">
                      {insight.action} →
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {state.insights.length === 0 && (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <Lightbulb size={48} className="mx-auto mb-4 opacity-50" />
            <p>No insights yet. Upload a statement to get started!</p>
          </div>
        )}
      </motion.div>

      {/* Recent Transactions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-green-600 rounded-lg flex items-center justify-center">
              <DollarSign size={20} className="text-white" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Recent Transactions
            </h2>
          </div>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {state.transactions.length} transactions
          </span>
        </div>

        <div className="space-y-3">
          {state.transactions.map((transaction) => (
            <div
              key={transaction.id}
              className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
            >
              <div className="flex items-center space-x-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  transaction.needsUserInput ? 'bg-yellow-100 dark:bg-yellow-900/20' : 'bg-green-100 dark:bg-green-900/20'
                }`}>
                  {transaction.needsUserInput ? (
                    <AlertCircle size={16} className="text-yellow-600 dark:text-yellow-400" />
                  ) : (
                    <CheckCircle size={16} className="text-green-600 dark:text-green-400" />
                  )}
                </div>
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">
                    {transaction.merchantName}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {transaction.category} • {transaction.confidence * 100}% confidence
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-semibold text-gray-900 dark:text-white">
                  {formatCurrency(transaction.amount)}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {transaction.date.toLocaleDateString()}
                </div>
              </div>
            </div>
          ))}
        </div>

        {state.transactions.length === 0 && (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <FileText size={48} className="mx-auto mb-4 opacity-50" />
            <p>No transactions yet. Upload a statement to see your expenses!</p>
          </div>
        )}
      </motion.div>
    </div>
  );
} 