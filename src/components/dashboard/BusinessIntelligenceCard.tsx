import React from 'react';
import { Zap, BarChart3, TrendingUp, Eye, Target, TrendingDown } from 'lucide-react';

const BusinessIntelligenceCard = () => {
  return (
    <div className="bg-gradient-to-br from-purple-900/60 to-blue-900/60 backdrop-blur-sm rounded-2xl p-6 border border-white/10 shadow-xl hover:shadow-2xl transition-all duration-300 group h-full flex flex-col relative overflow-hidden">
      {/* Gradient border effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
      
      <div className="relative z-10 flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300">
            <Zap size={28} className="text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold text-white mb-1">Business Intelligence Assistant</h3>
            <p className="text-sm text-white/60">AI-powered business expense insights.</p>
          </div>
        </div>

        {/* Description */}
        <p className="text-white/80 text-sm leading-relaxed mb-6 flex-grow">
          Instantly spot trends, outliers, and insights in your business spending.
        </p>

        {/* Features */}
        <div className="space-y-3 mb-6 flex-grow">
          <div className="flex items-start gap-3 text-sm text-white/80">
            <div className="w-5 h-5 bg-yellow-500/20 rounded-full flex items-center justify-center mt-0.5 flex-shrink-0">
              <BarChart3 size={12} className="text-yellow-400" />
            </div>
            <span>Analyzes business spending patterns</span>
          </div>
          <div className="flex items-start gap-3 text-sm text-white/80">
            <div className="w-5 h-5 bg-yellow-500/20 rounded-full flex items-center justify-center mt-0.5 flex-shrink-0">
              <Eye size={12} className="text-yellow-400" />
            </div>
            <span>Detects outliers and anomalies instantly</span>
          </div>
          <div className="flex items-start gap-3 text-sm text-white/80">
            <div className="w-5 h-5 bg-yellow-500/20 rounded-full flex items-center justify-center mt-0.5 flex-shrink-0">
              <TrendingUp size={12} className="text-yellow-400" />
            </div>
            <span>Predicts future expenses and cash flow</span>
          </div>
          <div className="flex items-start gap-3 text-sm text-white/80">
            <div className="w-5 h-5 bg-yellow-500/20 rounded-full flex items-center justify-center mt-0.5 flex-shrink-0">
              <Target size={12} className="text-yellow-400" />
            </div>
            <span>Benchmarks vs. industry peers (where available)</span>
          </div>
        </div>

        {/* CTA Button */}
        <button className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white py-3 rounded-lg font-semibold transition-all duration-300 shadow-lg hover:shadow-xl group-hover:scale-105">
          View Business Insights
        </button>
      </div>
    </div>
  );
};

export default BusinessIntelligenceCard; 
