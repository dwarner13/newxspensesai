import React from 'react';
import { Briefcase, Zap, Cog } from 'lucide-react';

/**
 * FeatureCards component for the three main feature cards
 * Displays Freelancer Tax Assistant, Business Intelligence, and Smart Automation
 */
const FeatureCards = () => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Freelancer Tax Assistant */}
      <div className="bg-gradient-to-br from-purple-900/60 to-blue-900/60 backdrop-blur-sm rounded-2xl shadow-xl border border-white/10 p-8">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl flex items-center justify-center">
            <Briefcase size={28} className="text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Freelancer Tax Assistant</h3>
            <p className="text-sm text-white/60">Automated tax optimization</p>
          </div>
        </div>
        <div className="space-y-4 mb-6">
          <div className="flex items-center gap-3 text-sm text-white/80">
            <div className="w-2 h-2 bg-orange-400 rounded-full"></div>
            <span>Automatic expense categorization</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-white/80">
            <div className="w-2 h-2 bg-orange-400 rounded-full"></div>
            <span>Finds every possible tax deduction</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-white/80">
            <div className="w-2 h-2 bg-orange-400 rounded-full"></div>
            <span>Generates quarterly tax estimates</span>
          </div>
        </div>
        <button className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white py-4 rounded-lg font-medium hover:from-orange-600 hover:to-red-600 transition-all">
          Start Tax Optimization
        </button>
      </div>

      {/* Business Intelligence Assistant */}
      <div className="bg-gradient-to-br from-purple-900/60 to-blue-900/60 backdrop-blur-sm rounded-2xl shadow-xl border border-white/10 p-8">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-xl flex items-center justify-center">
            <Zap size={28} className="text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Business Intelligence Assistant</h3>
            <p className="text-sm text-white/60">AI-powered business insights</p>
          </div>
        </div>
        <div className="space-y-4 mb-6">
          <div className="flex items-center gap-3 text-sm text-white/80">
            <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
            <span>Analyzes business spending patterns</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-white/80">
            <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
            <span>Detects outliers and anomalies</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-white/80">
            <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
            <span>Predicts future expenses</span>
          </div>
        </div>
        <button className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 text-white py-4 rounded-lg font-medium hover:from-yellow-600 hover:to-orange-600 transition-all">
          View Business Insights
        </button>
      </div>

      {/* Smart Automation */}
      <div className="bg-gradient-to-br from-purple-900/60 to-blue-900/60 backdrop-blur-sm rounded-2xl shadow-xl border border-white/10 p-8 col-span-1 lg:col-span-2">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl flex items-center justify-center">
            <Cog size={28} className="text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Smart Automation</h3>
            <p className="text-sm text-white/60">Automate your finances</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="flex items-center gap-3 text-sm text-white/80">
            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
            <span>Hands-free bookkeeping</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-white/80">
            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
            <span>Smart reminders for bills</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-white/80">
            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
            <span>Automated recurring transactions</span>
          </div>
        </div>
        <button className="w-full bg-gradient-to-r from-green-500 to-emerald-500 text-white py-4 rounded-lg font-medium hover:from-green-600 hover:to-emerald-600 transition-all">
          Setup Automation
        </button>
      </div>
    </div>
  );
};

export default FeatureCards; 