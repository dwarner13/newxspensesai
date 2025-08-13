import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Heart, 
  Brain, 
  TrendingUp, 
  Calendar,
  Play,
  Settings,
  MessageSquare,
  Target,
  Award,
  Clock,
  Activity,
  Smile,
  Frown,
  Meh,
  Menu
} from 'lucide-react';

const WellnessStudioPage = () => {
  const [currentSession, setCurrentSession] = useState({
    isActive: false,
    duration: 0,
    type: 'meditation' as 'meditation' | 'therapy' | 'coaching'
  });

  const [wellnessMetrics] = useState({
    moneyMood: 'Positive',
    stressLevel: 'Low',
    confidence: 85,
    mindfulDays: 12,
    sessionsCompleted: 8,
    totalMinutes: 120
  });

  const [chatMessages] = useState([
    {
      id: 1,
      sender: 'Financial Therapist',
      message: "Hello! I'm here to support your financial wellness journey. How are you feeling about money today?",
      timestamp: '2:30 PM',
      icon: <Heart className="w-4 h-4 text-red-400" />
    }
  ]);

  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const handleStartSession = () => {
    setCurrentSession(prev => ({
      ...prev,
      isActive: true,
      duration: 600 // 10 minutes in seconds
    }));
  };

  const getMoodIcon = (mood: string) => {
    switch (mood.toLowerCase()) {
      case 'positive':
        return <Smile className="w-6 h-6 text-green-400" />;
      case 'negative':
        return <Frown className="w-6 h-6 text-red-400" />;
      default:
        return <Meh className="w-6 h-6 text-yellow-400" />;
    }
  };

  return (
    <div>
      <h1 className="text-4xl font-bold mb-4">AI Financial Therapist</h1>
      <p className="text-lg text-gray-300 mb-8">Heal your relationship with money through positive reinforcement and AI-powered encouragement</p>

      {/* Action Buttons */}
      <div className="flex items-center space-x-4 mb-8">
        <button
          onClick={handleStartSession}
          disabled={currentSession.isActive}
          className="bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 disabled:opacity-50 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-200 flex items-center space-x-2"
        >
          <Play className="w-5 h-5" />
          <span>Start Session</span>
        </button>
        <button className="p-3 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
          <Settings className="w-5 h-5" />
        </button>
      </div>

      <div className="space-y-6">
        {/* Wellness Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Money Mood</h3>
              {getMoodIcon(wellnessMetrics.moneyMood)}
            </div>
            <div className="text-2xl font-bold text-green-400">{wellnessMetrics.moneyMood}</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Stress Level</h3>
              <div className="w-6 h-6 bg-green-400 rounded-full flex items-center justify-center">
                <span className="text-xs font-bold text-white">😊</span>
              </div>
            </div>
            <div className="text-2xl font-bold text-green-400">{wellnessMetrics.stressLevel}</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Confidence</h3>
              <div className="w-6 h-6 bg-purple-400 rounded-full flex items-center justify-center">
                <TrendingUp className="w-3 h-3 text-white" />
              </div>
            </div>
            <div className="text-2xl font-bold text-purple-400">{wellnessMetrics.confidence}%</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Mindful Days</h3>
              <div className="w-6 h-6 bg-purple-400 rounded-full flex items-center justify-center">
                <Brain className="w-3 h-3 text-white" />
              </div>
            </div>
            <div className="text-2xl font-bold text-purple-400">{wellnessMetrics.mindfulDays}</div>
          </motion.div>
        </div>

        {/* Therapeutic Session */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white">Therapeutic Session</h2>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-400 rounded-full"></div>
              <span className="text-green-400 text-sm font-medium">Online</span>
            </div>
          </div>

          {/* Chat Messages */}
          <div className="space-y-4">
            {chatMessages.map((message) => (
              <div key={message.id} className="flex items-start space-x-3">
                <div className="flex items-center space-x-2">
                  {message.icon}
                  <span className="text-white font-medium">{message.sender}</span>
                </div>
                <div className="flex-1 bg-white/10 rounded-lg p-4">
                  <p className="text-white/90">{message.message}</p>
                  <p className="text-white/50 text-sm mt-2">{message.timestamp}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Input Area */}
          <div className="mt-6 flex items-center space-x-3">
            <input
              type="text"
              placeholder="Type your message..."
              className="flex-1 bg-white/10 text-white placeholder-white/50 px-4 py-3 rounded-lg border border-white/20 focus:border-purple-400 focus:outline-none"
            />
            <button className="bg-purple-600 hover:bg-purple-700 text-white p-3 rounded-lg transition-colors">
              <MessageSquare className="w-5 h-5" />
            </button>
          </div>
        </motion.div>

        {/* Wellness Activities */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center">
                <Target className="w-5 h-5 text-blue-400" />
              </div>
              <h3 className="text-lg font-semibold text-white">Goal Setting</h3>
            </div>
            <p className="text-white/70 text-sm">Set and track your financial wellness goals with AI guidance</p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center">
                <Activity className="w-5 h-5 text-green-400" />
              </div>
              <h3 className="text-lg font-semibold text-white">Progress Tracking</h3>
            </div>
            <p className="text-white/70 text-sm">Monitor your financial wellness journey with detailed insights</p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-purple-500/20 rounded-full flex items-center justify-center">
                <Award className="w-5 h-5 text-purple-400" />
              </div>
              <h3 className="text-lg font-semibold text-white">Achievements</h3>
            </div>
            <p className="text-white/70 text-sm">Celebrate your financial wellness milestones and achievements</p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default WellnessStudioPage; 