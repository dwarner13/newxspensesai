import React from 'react';
import { Bot, Target, BarChart3, Settings, Shield } from 'lucide-react';

/**
 * SummaryCards component for analytics, goals, and settings cards
 * Displays AI Assistant, AI Goals, Analytics, and Settings cards
 */
const SummaryCards = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {/* AI Assistant Card */}
      <div className="bg-gradient-to-br from-purple-900/60 to-blue-900/60 backdrop-blur-sm rounded-2xl shadow-xl border border-white/10 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl flex items-center justify-center">
            <Bot size={24} className="text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">AI Assistant</h3>
            <p className="text-sm text-white/60">Your financial coach</p>
          </div>
        </div>
        <div className="space-y-3">
          <div className="bg-white/5 rounded-lg p-3 border border-white/10">
            <h4 className="text-white font-semibold text-sm mb-1">Next 2 Bills</h4>
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-white/80">Car Payment</span>
                <span className="text-white">$350</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/80">Insurance</span>
                <span className="text-white">$120</span>
              </div>
            </div>
          </div>
          <button className="w-full bg-gradient-to-r from-purple-500 to-blue-500 text-white py-2.5 rounded-lg font-medium hover:from-purple-600 hover:to-blue-600 transition-all">
            Chat with AI
          </button>
        </div>
      </div>

      {/* AI Goals Card */}
      <div className="bg-gradient-to-br from-purple-900/60 to-blue-900/60 backdrop-blur-sm rounded-2xl shadow-xl border border-white/10 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl flex items-center justify-center">
            <Target size={24} className="text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">AI Goals</h3>
            <p className="text-sm text-white/60">Track your progress</p>
          </div>
        </div>
        <div className="space-y-3">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-white/80">Emergency Fund</span>
              <span className="text-white">75%</span>
            </div>
            <div className="w-full bg-white/20 rounded-full h-2">
              <div className="bg-green-400 h-2 rounded-full" style={{ width: '75%' }}></div>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-white/80">Vacation Fund</span>
              <span className="text-white">45%</span>
            </div>
            <div className="w-full bg-white/20 rounded-full h-2">
              <div className="bg-blue-400 h-2 rounded-full" style={{ width: '45%' }}></div>
            </div>
          </div>
          <button className="w-full bg-gradient-to-r from-green-500 to-emerald-500 text-white py-2.5 rounded-lg font-medium hover:from-green-600 hover:to-emerald-600 transition-all">
            Add Goal
          </button>
        </div>
      </div>

      {/* Analytics Card */}
      <div className="bg-gradient-to-br from-purple-900/60 to-blue-900/60 backdrop-blur-sm rounded-2xl shadow-xl border border-white/10 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
            <BarChart3 size={24} className="text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Analytics</h3>
            <p className="text-sm text-white/60">This month's overview</p>
          </div>
        </div>
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-white/5 rounded-lg p-2">
              <div className="text-green-400 font-bold text-lg">$3,200</div>
              <div className="text-white/60 text-xs">Income</div>
            </div>
            <div className="bg-white/5 rounded-lg p-2">
              <div className="text-red-400 font-bold text-lg">$2,100</div>
              <div className="text-white/60 text-xs">Expenses</div>
            </div>
            <div className="bg-white/5 rounded-lg p-2">
              <div className="text-blue-400 font-bold text-lg">$1,100</div>
              <div className="text-white/60 text-xs">Saved</div>
            </div>
          </div>
          <button className="w-full bg-gradient-to-r from-blue-500 to-purple-500 text-white py-2.5 rounded-lg font-medium hover:from-blue-600 hover:to-purple-600 transition-all">
            View Details
          </button>
        </div>
      </div>

      {/* Settings Card */}
      <div className="bg-gradient-to-br from-purple-900/60 to-blue-900/60 backdrop-blur-sm rounded-2xl shadow-xl border border-white/10 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-gradient-to-r from-gray-500 to-gray-600 rounded-xl flex items-center justify-center">
            <Settings size={24} className="text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Settings</h3>
            <p className="text-sm text-white/60">Privacy & preferences</p>
          </div>
        </div>
        <div className="space-y-3">
          <div className="bg-white/5 rounded-lg p-3 border border-white/10">
            <div className="flex items-center gap-2 mb-2">
              <Shield size={16} className="text-green-400" />
              <span className="text-white font-medium text-sm">Zero Storage</span>
            </div>
            <p className="text-white/60 text-sm">Your data is never stored on our servers</p>
          </div>
          <button className="w-full bg-gradient-to-r from-gray-500 to-gray-600 text-white py-2.5 rounded-lg font-medium hover:from-gray-600 hover:to-gray-700 transition-all">
            Open Settings
          </button>
        </div>
      </div>
    </div>
  );
};

export default SummaryCards; 