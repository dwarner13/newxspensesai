import React from 'react';
import { motion } from 'framer-motion';
import { Bot, MessageCircle, Upload, Brain, Target, Music, Mic } from 'lucide-react';
import WebsiteLayout from '../components/layout/WebsiteLayout';

export default function AIAssistantPage() {
  return (
    <WebsiteLayout>
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 p-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <div className="flex items-center justify-center space-x-3 mb-4">
          <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center">
            <Bot size={32} className="text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-bold text-white">
              AI Financial Assistant
            </h1>
            <p className="text-lg text-gray-300">
              Your intelligent financial companion with conversational AI
            </p>
          </div>
        </div>
      </motion.div>

      {/* AI Capabilities Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
      >
        {[
          {
            title: 'Smart Categorization',
            description: 'AI automatically categorizes expenses with 95% accuracy',
            icon: <Brain size={24} className="text-white" />,
            color: 'from-blue-500 to-cyan-500',
          },
          {
            title: 'Real-time Insights',
            description: 'Get instant financial insights and spending patterns',
            icon: <Target size={24} className="text-white" />,
            color: 'from-green-500 to-emerald-500',
          },
          {
            title: 'Audio Integration',
            description: 'Music and podcast suggestions based on your activities',
            icon: <Music size={24} className="text-white" />,
            color: 'from-purple-500 to-pink-500',
          },
          {
            title: 'Conversational AI',
            description: 'Natural language processing for all financial queries',
            icon: <MessageCircle size={24} className="text-white" />,
            color: 'from-orange-500 to-red-500',
          },
        ].map((capability, index) => (
          <div
            key={index}
            className={`bg-gradient-to-br ${capability.color} rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105`}
          >
            <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mb-4">
              {capability.icon}
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">
              {capability.title}
            </h3>
            <p className="text-white/90 text-sm">
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
        className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl p-6 mb-8 shadow-lg"
      >
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
            <Upload size={20} className="text-white" />
          </div>
          <h2 className="text-xl font-semibold text-white">
            Upload & Process Statements
          </h2>
        </div>

        <div className="border-2 border-dashed border-white/30 rounded-lg p-8 text-center hover:border-white/50 transition-colors">
          <Upload size={48} className="mx-auto text-white/60 mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">
            Drop your bank statement here
          </h3>
          <p className="text-white/80 mb-4">
            Supports PDF, CSV, QFX, and OFX formats
          </p>
          <button className="inline-flex items-center px-4 py-2 bg-white/20 text-white rounded-lg hover:bg-white/30 transition-colors">
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
        className="bg-gradient-to-br from-green-600 to-emerald-700 rounded-xl p-6 mb-8 shadow-lg"
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <Brain size={20} className="text-white" />
            </div>
            <h2 className="text-xl font-semibold text-white">
              AI Insights
            </h2>
          </div>
          <span className="text-sm text-white/80">
            3 insights
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            {
              title: 'Coffee Spending Alert',
              message: 'Your coffee spending is up 25% this week. Want to explore some budget-friendly alternatives?',
              type: 'warning',
              color: 'border-yellow-400 bg-yellow-500/20',
            },
            {
              title: 'Great Job on Gas!',
              message: 'You\'re 15% under your gas budget this month. Keep up the excellent work!',
              type: 'success',
              color: 'border-green-400 bg-green-500/20',
            },
            {
              title: 'Budget Optimization',
              message: 'You could save $67/month by switching your streaming subscriptions.',
              type: 'info',
              color: 'border-blue-400 bg-blue-500/20',
            },
          ].map((insight, index) => (
            <div
              key={index}
              className={`p-4 rounded-lg border-l-4 ${insight.color} backdrop-blur-sm`}
            >
              <h4 className="font-medium text-white mb-1">
                {insight.title}
              </h4>
              <p className="text-sm text-white/90 mb-2">
                {insight.message}
              </p>
              <button className="text-xs text-white/80 hover:text-white font-medium">
                See AI in Action →
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
        className="bg-gradient-to-br from-purple-600 to-pink-700 rounded-xl p-6 mb-8 shadow-lg"
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <Target size={20} className="text-white" />
            </div>
            <h2 className="text-xl font-semibold text-white">
              Recent Transactions
            </h2>
          </div>
          <span className="text-sm text-white/80">
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
              className="flex items-center justify-between p-3 bg-white/10 rounded-lg backdrop-blur-sm"
            >
              <div className="flex items-center space-x-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  transaction.status === 'needs-input' ? 'bg-yellow-500/30' : 'bg-green-500/30'
                }`}>
                  {transaction.status === 'needs-input' ? (
                    <span className="text-yellow-300 text-xs">!</span>
                  ) : (
                    <span className="text-green-300 text-xs">✓</span>
                  )}
                </div>
                <div>
                  <div className="font-medium text-white">
                    {transaction.merchant}
                  </div>
                  <div className="text-sm text-white/70">
                    {transaction.category} • 95% confidence
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-semibold text-white">
                  ${transaction.amount}
                </div>
                <div className="text-xs text-white/70">
                  Today
                </div>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Floating Chat Button */}
      <button className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-110 flex items-center justify-center">
        <MessageCircle size={24} />
      </button>
      </div>
    </WebsiteLayout>
  );
} 
