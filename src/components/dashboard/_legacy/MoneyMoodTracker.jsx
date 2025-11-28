import React from 'react';
import { TrendingUp, Sparkles } from 'lucide-react';

/**
 * MoneyMoodTracker component for tracking financial mood
 * Displays mood emoji buttons, history chart, and AI encouragement
 */
const MoneyMoodTracker = () => {
  return (
    <div className="lg:col-span-2 bg-gradient-to-br from-purple-900/60 to-blue-900/60 backdrop-blur-sm rounded-2xl shadow-xl border border-white/10 p-6">
      <h3 className="text-lg font-bold text-white mb-4">How do you feel about your money today?</h3>
      <div className="flex justify-center gap-4 mb-6">
        {['😃', '🙂', '😐', '🙁', '😫'].map((emoji, index) => (
          <button key={index} className="text-3xl hover:scale-110 transition-transform">
            {emoji}
          </button>
        ))}
      </div>
      
      {/* Mood History Chart */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp size={16} className="text-green-400" />
          <span className="text-white/80 text-sm font-medium">Mood History (7 days)</span>
        </div>
        <div className="flex items-center gap-2">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, index) => (
            <div key={day} className="flex flex-col items-center gap-1">
              <div className="w-3 h-3 bg-green-400 rounded-full"></div>
              <span className="text-white/60 text-xs">{day}</span>
            </div>
          ))}
        </div>
      </div>
      
      {/* AI Encouragement */}
      <div className="bg-white/5 rounded-lg p-4 border border-white/10">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles size={16} className="text-yellow-400" />
          <span className="text-white font-medium">AI Encouragement</span>
        </div>
        <p className="text-white/80 text-sm">Great job! Your financial mood is improving this week! 🎉</p>
      </div>
    </div>
  );
};

export default MoneyMoodTracker; 