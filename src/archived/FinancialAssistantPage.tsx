import React from 'react';
import { Bot, MessageCircle, TrendingUp, TrendingDown, DollarSign, Target, Calendar, AlertTriangle, CheckCircle, Brain } from 'lucide-react';

const FinancialAssistantPage = () => {
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">AI Financial Assistant</h1>
        <p className="text-gray-600">Your personal AI that tracks expenses, provides insights, and helps you make smarter financial decisions</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Monthly Spending</p>
              <p className="text-2xl font-bold text-gray-900">$3,247</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Savings Rate</p>
              <p className="text-2xl font-bold text-gray-900">23%</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
              <Brain className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">AI Insights</p>
              <p className="text-2xl font-bold text-gray-900">47</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
              <Target className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Goals On Track</p>
              <p className="text-2xl font-bold text-gray-900">5/6</p>
            </div>
          </div>
        </div>
      </div>

      {/* AI Chat Interface */}
      <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-200 mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Chat with Your AI Assistant</h2>
        
        <div className="bg-gray-50 rounded-xl p-6 space-y-4 max-h-96 overflow-y-auto">
          <div className="flex gap-3">
            <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
              <Bot className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-600 mb-1">AI Assistant</p>
              <p className="text-gray-700">Hello! I've analyzed your spending this month. You're doing great with your budget! I noticed you spent 15% less on dining out compared to last month.</p>
            </div>
          </div>
          
          <div className="flex gap-3 justify-end">
            <div className="flex-1 max-w-xs">
              <p className="text-sm text-gray-600 mb-1 text-right">You</p>
              <p className="text-gray-700 bg-white p-3 rounded-lg">Can you help me save more money?</p>
            </div>
          </div>
          
          <div className="flex gap-3">
            <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
              <Bot className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-600 mb-1">AI Assistant</p>
              <p className="text-gray-700">Absolutely! I found 3 opportunities to save $247/month:</p>
              <ul className="mt-2 space-y-1 text-sm text-gray-700">
                <li>• Cancel unused subscription ($89/month)</li>
                <li>• Switch to cheaper grocery store ($98/month)</li>
                <li>• Reduce coffee shop visits ($60/month)</li>
              </ul>
            </div>
          </div>
        </div>
        
        <div className="mt-4 flex gap-2">
          <input 
            type="text" 
            placeholder="Ask your AI assistant anything..."
            className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition-colors">
            Send
          </button>
        </div>
      </div>

      {/* Recent Insights */}
      <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-200">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Recent AI Insights</h2>
        
        <div className="space-y-4">
          <div className="flex items-start gap-4 p-4 bg-green-50 rounded-lg">
            <CheckCircle className="w-5 h-5 text-green-600 mt-1" />
            <div>
              <h3 className="font-semibold text-gray-900">Great Savings Progress!</h3>
              <p className="text-sm text-gray-600">You've saved 23% of your income this month, which is 8% above your goal.</p>
            </div>
          </div>
          
          <div className="flex items-start gap-4 p-4 bg-yellow-50 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-yellow-600 mt-1" />
            <div>
              <h3 className="font-semibold text-gray-900">Subscription Alert</h3>
              <p className="text-sm text-gray-600">You have 3 subscriptions that haven't been used in 30+ days. Consider canceling to save $89/month.</p>
            </div>
          </div>
          
          <div className="flex items-start gap-4 p-4 bg-blue-50 rounded-lg">
            <TrendingUp className="w-5 h-5 text-blue-600 mt-1" />
            <div>
              <h3 className="font-semibold text-gray-900">Spending Trend</h3>
              <p className="text-sm text-gray-600">Your dining out expenses are 15% lower than last month. Great job sticking to your budget!</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FinancialAssistantPage; 