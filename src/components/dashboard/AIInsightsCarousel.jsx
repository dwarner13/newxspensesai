import React from 'react';
import { Sparkles, Target, AlertTriangle } from 'lucide-react';

/**
 * AIInsightsCarousel component for displaying AI-generated insights
 * Shows personalized tips, goals progress, and reminders
 */
const AIInsightsCarousel = () => {
  return (
    <div className="bg-gradient-to-br from-purple-900/60 to-blue-900/60 backdrop-blur-sm rounded-2xl shadow-xl border border-white/10 p-6">
      <h3 className="text-lg font-bold text-white mb-4">AI Insights for You</h3>
      <div className="space-y-4">
        <div className="bg-white/5 rounded-lg p-3 border border-white/10">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles size={16} className="text-yellow-400" />
            <span className="text-white font-medium text-sm">Smart Tip</span>
          </div>
          <p className="text-white/80 text-sm">You saved 15% more this month compared to last month!</p>
        </div>
        <div className="bg-white/5 rounded-lg p-3 border border-white/10">
          <div className="flex items-center gap-2 mb-2">
            <Target size={16} className="text-green-400" />
            <span className="text-white font-medium text-sm">Goal Progress</span>
          </div>
          <p className="text-white/80 text-sm">Emergency fund is 75% complete. Keep it up!</p>
        </div>
        <div className="bg-white/5 rounded-lg p-3 border border-white/10">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={16} className="text-orange-400" />
            <span className="text-white font-medium text-sm">Reminder</span>
          </div>
          <p className="text-white/80 text-sm">Car payment due in 2 days. Consider setting up auto-pay.</p>
        </div>
      </div>
    </div>
  );
};

export default AIInsightsCarousel; 