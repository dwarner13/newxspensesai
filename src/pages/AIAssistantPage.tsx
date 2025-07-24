import React from 'react';
import { motion } from 'framer-motion';
import { Bot, MessageCircle, Upload, Brain, Target, Music, Mic } from 'lucide-react';

export default function AIAssistantPage() {
  return (
    <div className="ai-assistant-container">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="ai-assistant-header"
      >
        <div className="flex items-center justify-center space-x-3 mb-4">
          <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
            <Bot size={32} className="text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-bold text-white">
              AI Financial Assistant
            </h1>
            <p className="text-lg text-gray-200">
              Your intelligent financial companion with conversational AI
            </p>
          </div>
        </div>
      </motion.div>

      {/* AI Capabilities */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="ai-capabilities-grid"
      >
        {[
          {
            title: 'Smart Categorization',
            description: 'AI automatically categorizes expenses with 95% accuracy',
            icon: <Brain size={24} className="text-blue-500" />,
            color: 'from-blue-500 to-blue-600',
          },
          {
            title: 'Real-time Insights',
            description: 'Get instant financial insights and spending patterns',
            icon: <Target size={24} className="text-green-500" />,
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
            className="ai-capability-card"
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
        transition={{ delay: 0.2 }}
        className="ai-insights-section"
      >
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-green-600 rounded-lg flex items-center justify-center">
            <Upload size={20} className="text-white" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Upload & Process Statements
          </h2>
        </div>

        <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center hover:border-purple-400 transition-colors">
          <Upload size={48} className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Drop your bank statement here
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Supports PDF, CSV, QFX, and OFX formats
          </p>
          <button className="inline-flex items-center px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors">
            <Upload size={16} className="mr-2" />
            Choose File
          </button>
        </div>
      </motion.div>

      {/* AI Insights */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="ai-insights-section"
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-lg flex items-center justify-center">
              <Brain size={20} className="text-white" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              AI Insights
            </h2>
          </div>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            3 insights
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            {
              title: 'Coffee Spending Alert',
              message: 'Your coffee spending is up 25% this week. Want to explore some budget-friendly alternatives?',
              type: 'warning',
              color: 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20',
            },
            {
              title: 'Great Job on Gas!',
              message: 'You\'re 15% under your gas budget this month. Keep up the excellent work!',
              type: 'success',
              color: 'border-green-500 bg-green-50 dark:bg-green-900/20',
            },
            {
              title: 'Budget Optimization',
              message: 'You could save $67/month by switching your streaming subscriptions.',
              type: 'info',
              color: 'border-blue-500 bg-blue-50 dark:bg-blue-900/20',
            },
          ].map((insight, index) => (
            <div
              key={index}
              className={`p-4 rounded-lg border-l-4 ${insight.color}`}
            >
              <h4 className="font-medium text-gray-900 dark:text-white mb-1">
                {insight.title}
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                {insight.message}
              </p>
              <button className="text-xs text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 font-medium">
                Learn more →
              </button>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Recent Transactions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="ai-transactions-section"
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-green-600 rounded-lg flex items-center justify-center">
              <Target size={20} className="text-white" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Recent Transactions
            </h2>
          </div>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            3 transactions
          </span>
        </div>

        <div className="space-y-3">
          {[
            { merchant: 'Starbucks', amount: 4.75, category: 'Coffee', status: 'processed' },
            { merchant: 'Amazon.com', amount: 89.99, category: 'Shopping', status: 'needs-input' },
            { merchant: 'Shell Gas Station', amount: 45.67, category: 'Gas', status: 'processed' },
          ].map((transaction, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
            >
              <div className="flex items-center space-x-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  transaction.status === 'needs-input' ? 'bg-yellow-100 dark:bg-yellow-900/20' : 'bg-green-100 dark:bg-green-900/20'
                }`}>
                  {transaction.status === 'needs-input' ? (
                    <span className="text-yellow-600 dark:text-yellow-400 text-xs">!</span>
                  ) : (
                    <span className="text-green-600 dark:text-green-400 text-xs">✓</span>
                  )}
                </div>
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">
                    {transaction.merchant}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {transaction.category} • 95% confidence
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-semibold text-gray-900 dark:text-white">
                  ${transaction.amount}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Today
                </div>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Floating Chat Button */}
      <button className="ai-chat-button">
        <MessageCircle size={24} />
      </button>
    </div>
  );
} 