import React from 'react';
import { Heart, Calendar, MessageCircle, TrendingUp } from 'lucide-react';

const WellnessCard = () => {
  const stressLevel = {
    current: 3,
    max: 10,
    status: "Low",
    color: "text-green-400"
  };

  const lastSession = {
    date: "Dec 10, 2024",
    duration: "45 min",
    topic: "Financial Anxiety Management"
  };

  const supportiveMessage = "You're doing great! Your consistent saving habits are building a strong financial foundation. Remember, progress over perfection.";

  return (
    <div className="bg-gradient-to-br from-purple-900/60 to-blue-900/60 backdrop-blur-sm rounded-2xl p-6 border border-white/10 shadow-xl hover:shadow-2xl transition-all duration-300">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-gradient-to-r from-pink-500 to-rose-500 rounded-lg flex items-center justify-center">
          <Heart size={20} className="text-white" />
        </div>
        <h3 className="text-lg font-semibold text-white">Wellness</h3>
      </div>

      {/* Stress Level */}
      <div className="bg-white/5 rounded-lg p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-white">Stress Level</span>
          <span className={`text-sm font-bold ${stressLevel.color}`}>{stressLevel.status}</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <div className="w-full bg-white/20 rounded-full h-2 mb-2">
              <div 
                className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(stressLevel.current / stressLevel.max) * 100}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-white/60">
              <span>Low</span>
              <span>High</span>
            </div>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-white">{stressLevel.current}</p>
            <p className="text-xs text-white/60">/ {stressLevel.max}</p>
          </div>
        </div>
      </div>

      {/* Last Session */}
      <div className="bg-white/5 rounded-lg p-4 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <Calendar size={16} className="text-blue-400" />
          <span className="text-sm font-medium text-white">Last Session</span>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-xs text-white/60">Date</span>
            <span className="text-xs text-white">{lastSession.date}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-xs text-white/60">Duration</span>
            <span className="text-xs text-white">{lastSession.duration}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-xs text-white/60">Topic</span>
            <span className="text-xs text-white">{lastSession.topic}</span>
          </div>
        </div>
      </div>

      {/* Supportive Message */}
      <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-lg p-4 border border-green-500/30">
        <div className="flex items-center gap-2 mb-2">
          <MessageCircle size={16} className="text-green-400" />
          <span className="text-sm font-medium text-white">Supportive Message</span>
        </div>
        <p className="text-sm text-white/90 leading-relaxed">{supportiveMessage}</p>
      </div>
    </div>
  );
};

export default WellnessCard; 
