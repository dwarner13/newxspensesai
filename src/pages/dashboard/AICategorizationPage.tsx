import React, { useState } from 'react';
import { 
  Tag, CheckCircle, X, RefreshCw, Filter, Download, 
  TrendingUp, BarChart3, Settings, AlertCircle, Clock
} from 'lucide-react';
import DashboardHeader from '../../components/ui/DashboardHeader';

const AICategorizationPage = () => {
  const [selectedCategory, setSelectedCategory] = useState('');
  // const [showFilters, setShowFilters] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const categories = [
    { id: 'food', name: 'Food & Dining', color: 'from-green-500 to-emerald-600', icon: '🍽️' },
    { id: 'transport', name: 'Transportation', color: 'from-blue-500 to-indigo-600', icon: '🚗' },
    { id: 'shopping', name: 'Shopping', color: 'from-purple-500 to-pink-600', icon: '🛍️' },
    { id: 'entertainment', name: 'Entertainment', color: 'from-orange-500 to-red-600', icon: '🎬' },
    { id: 'utilities', name: 'Utilities', color: 'from-gray-500 to-gray-600', icon: '⚡' },
    { id: 'health', name: 'Healthcare', color: 'from-red-500 to-pink-600', icon: '🏥' }
  ];

  const transactions = [
    { id: 1, description: 'Starbucks Coffee', amount: 4.50, category: 'food', confidence: 95 },
    { id: 2, description: 'Uber Ride', amount: 12.75, category: 'transport', confidence: 98 },
    { id: 3, description: 'Amazon Purchase', amount: 29.99, category: 'shopping', confidence: 92 },
    { id: 4, description: 'Netflix Subscription', amount: 15.99, category: 'entertainment', confidence: 97 },
    { id: 5, description: 'Electric Bill', amount: 89.50, category: 'utilities', confidence: 99 },
    { id: 6, description: 'CVS Pharmacy', amount: 23.45, category: 'health', confidence: 88 }
  ];

  // Removed unused handleCategoryChange to resolve implicit any linter errors

  const handleBulkCategorize = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      // Handle bulk categorization
    }, 2000);
  };

  return (
    <div className="w-full">
      {/* Standardized Dashboard Header */}
      <DashboardHeader />

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center">
                <CheckCircle size={24} className="text-green-400" />
              </div>
              <span className="text-2xl font-bold text-white">247</span>
            </div>
            <h3 className="text-white font-semibold mb-2">Categorized</h3>
            <p className="text-white/60 text-sm">This month</p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center">
                <Tag size={24} className="text-blue-400" />
              </div>
              <span className="text-2xl font-bold text-white">12</span>
            </div>
            <h3 className="text-white font-semibold mb-2">Pending Review</h3>
            <p className="text-white/60 text-sm">Needs attention</p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-indigo-500/20 rounded-full flex items-center justify-center">
                <TrendingUp size={24} className="text-indigo-400" />
              </div>
              <span className="text-2xl font-bold text-white">94.2%</span>
            </div>
            <h3 className="text-white font-semibold mb-2">Accuracy Rate</h3>
            <p className="text-white/60 text-sm">AI performance</p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-orange-500/20 rounded-full flex items-center justify-center">
                <Clock size={24} className="text-orange-400" />
              </div>
              <span className="text-2xl font-bold text-white">2.3s</span>
            </div>
            <h3 className="text-white font-semibold mb-2">Avg. Processing</h3>
            <p className="text-white/60 text-sm">Per transaction</p>
          </div>
        </div>

        {/* Action Bar */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                <Tag size={20} className="text-white" />
              </div>
              <div>
                <h3 className="text-white font-semibold">Bulk Categorization</h3>
                <p className="text-white/60 text-sm">Process multiple transactions at once</p>
              </div>
            </div>
            <button 
              onClick={handleBulkCategorize}
              disabled={isProcessing}
              className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-200 transform hover:scale-105 flex items-center space-x-2"
            >
              {isProcessing ? (
                <>
                  <RefreshCw size={20} className="animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <Tag size={20} />
                  <span>Categorize All</span>
                </>
              )}
            </button>
          </div>
          
          {/* Quick Actions */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button className="bg-white/10 hover:bg-white/20 text-white py-3 px-4 rounded-lg transition-all duration-200 text-sm font-medium flex items-center justify-center space-x-2">
              <Filter size={16} />
              <span>Filter</span>
            </button>
            <button className="bg-white/10 hover:bg-white/20 text-white py-3 px-4 rounded-lg transition-all duration-200 text-sm font-medium flex items-center justify-center space-x-2">
              <Download size={16} />
              <span>Export</span>
            </button>
            <button className="bg-white/10 hover:bg-white/20 text-white py-3 px-4 rounded-lg transition-all duration-200 text-sm font-medium flex items-center justify-center space-x-2">
              <BarChart3 size={16} />
              <span>Analytics</span>
            </button>
            <button className="bg-white/10 hover:bg-white/20 text-white py-3 px-4 rounded-lg transition-all duration-200 text-sm font-medium flex items-center justify-center space-x-2">
              <Settings size={16} />
              <span>Settings</span>
            </button>
          </div>
        </div>

        {/* Categories Grid */}
        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Categories</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {categories.map((category) => (
              <div
                key={category.id}
                className={`bg-gradient-to-br ${category.color} rounded-xl p-4 text-center cursor-pointer hover:scale-105 transition-all`}
                onClick={() => setSelectedCategory(category.id)}
              >
                <div className="text-2xl mb-2">{category.icon}</div>
                <h3 className="text-white font-semibold text-sm">{category.name}</h3>
              </div>
            ))}
          </div>
        </div>

        {/* Transactions List */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
          <h2 className="text-2xl font-semibold mb-6">Recent Transactions</h2>
          <div className="space-y-4">
            {transactions.map((transaction) => (
              <div key={transaction.id} className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                    <Tag size={20} className="text-white" />
                  </div>
                  <div>
                    <p className="text-white font-semibold">{transaction.description}</p>
                    <p className="text-white/60 text-sm">${transaction.amount.toFixed(2)}</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <p className="text-white font-semibold">
                      {categories.find(c => c.id === transaction.category)?.name}
                    </p>
                    <p className="text-white/60 text-sm">{transaction.confidence}% confidence</p>
                  </div>
                  
                  <div className="flex space-x-2">
                    <button className="p-2 bg-green-500/20 hover:bg-green-500/30 rounded-lg transition-colors">
                      <CheckCircle size={16} className="text-green-400" />
                    </button>
                    <button className="p-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg transition-colors">
                      <X size={16} className="text-red-400" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* AI Learning Section */}
        <div className="mt-8 bg-gradient-to-br from-indigo-500/10 to-blue-500/10 rounded-2xl p-6 border border-indigo-500/20">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-blue-600 rounded-full flex items-center justify-center">
              <AlertCircle size={20} className="text-white" />
            </div>
            <div>
              <h3 className="text-white font-semibold">AI Learning</h3>
              <p className="text-white/60 text-sm">The AI learns from your corrections to improve accuracy</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white/10 rounded-lg p-4">
              <p className="text-white/80 text-sm">When you approve a categorization, the AI learns to recognize similar patterns.</p>
            </div>
            <div className="bg-white/10 rounded-lg p-4">
              <p className="text-white/80 text-sm">When you change a category, the AI adjusts its understanding for future transactions.</p>
            </div>
            <div className="bg-white/10 rounded-lg p-4">
              <p className="text-white/80 text-sm">Over time, the AI becomes more accurate and requires fewer manual corrections.</p>
            </div>
          </div>
        </div>
    </div>
  );
};

export default AICategorizationPage; 