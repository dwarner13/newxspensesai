import React, { useState, useRef, useEffect } from 'react';
import { 
  Brain, TrendingUp, TrendingDown, Calendar, AlertTriangle, 
  CheckCircle, Zap, RefreshCw, Settings, Menu, BarChart3,
  DollarSign, Target, Clock, Star, ArrowRight, ArrowLeft,
  ChevronLeft, ChevronRight, Sparkles, Volume2, Pause, Play,
  MessageCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

import SpecializedChatBot from '../../components/chat/SpecializedChatBot';
import DashboardHeader from '../../components/ui/DashboardHeader';

interface Prediction {
  id: string;
  category: string;
  predicted: number;
  change: number;
  confidence: number;
  trend: 'up' | 'down' | 'stable';
  reason: string;
  suggestion: string;
}

interface Alert {
  id: string;
  type: 'subscription' | 'holiday' | 'cashflow' | 'bonus';
  title: string;
  message: string;
  confidence: number;
  predictedValue: number;
  severity: 'low' | 'medium' | 'high';
  action: string;
}

interface TimelineData {
  month: string;
  predicted: number;
  confidence: number;
  breakdown: Prediction[];
}

const SpendingPredictionsPage = () => {
  const [forecastPeriod, setForecastPeriod] = useState<'30' | '90' | '180'>('30');
  const [selectedMonth, setSelectedMonth] = useState<string>('February 2024');
  const [showPredictionDetails, setShowPredictionDetails] = useState(false);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [chatHistory, setChatHistory] = useState<Array<{type: 'user' | 'ai', message: string}>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Mock data - replace with real AI predictions
  const predictions: Prediction[] = [
    {
      id: '1',
      category: 'Dining Out',
      predicted: 420,
      change: 42,
      confidence: 89,
      trend: 'up',
      reason: 'Increased weekend dining pattern detected',
      suggestion: 'Consider setting a weekly dining budget'
    },
    {
      id: '2',
      category: 'Groceries',
      predicted: 510,
      change: -20,
      confidence: 92,
      trend: 'down',
      reason: 'Bulk buying pattern + inflation adjustment',
      suggestion: 'Continue bulk purchases to maintain savings'
    },
    {
      id: '3',
      category: 'Subscriptions',
      predicted: 120,
      change: 35,
      confidence: 78,
      trend: 'up',
      reason: '3 free trials converting next month',
      suggestion: 'Review and cancel unused subscriptions'
    },
    {
      id: '4',
      category: 'Travel',
      predicted: 300,
      change: 0,
      confidence: 85,
      trend: 'stable',
      reason: 'No travel patterns detected for next month',
      suggestion: 'Good time to save for future trips'
    },
    {
      id: '5',
      category: 'Other',
      predicted: 990,
      change: 58,
      confidence: 76,
      trend: 'up',
      reason: 'Seasonal spending patterns detected',
      suggestion: 'Review discretionary spending categories'
    }
  ];

  const alerts: Alert[] = [
    {
      id: '1',
      type: 'subscription',
      title: 'Netflix Trial Ending',
      message: 'Your Netflix free trial ends in 3 days. Expected charge: $15.99',
      confidence: 95,
      predictedValue: 15.99,
      severity: 'medium',
      action: 'Review Subscription'
    },
    {
      id: '2',
      type: 'holiday',
      title: 'Memorial Day Weekend',
      message: 'Historical data shows 40% spending increase on holiday weekends',
      confidence: 88,
      predictedValue: 200,
      severity: 'high',
      action: 'Set Budget Alert'
    },
    {
      id: '3',
      type: 'cashflow',
      title: 'Bonus Payment Expected',
      message: 'Based on company patterns, Q1 bonus likely in next 2 weeks',
      confidence: 72,
      predictedValue: 1500,
      severity: 'low',
      action: 'Plan Bonus Use'
    }
  ];

  const timelineData: TimelineData[] = [
    {
      month: 'March 2024',
      predicted: 2840,
      confidence: 89,
      breakdown: predictions
    },
    {
      month: 'April 2024',
      predicted: 2910,
      confidence: 85,
      breakdown: predictions
    },
    {
      month: 'May 2024',
      predicted: 2980,
      confidence: 82,
      breakdown: predictions
    }
  ];

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return <TrendingUp size={20} className="text-red-400" />;
      case 'down':
        return <TrendingDown size={20} className="text-green-400" />;
      case 'stable':
        return <BarChart3 size={20} className="text-blue-400" />;
      default:
        return <BarChart3 size={20} className="text-white" />;
    }
  };

  const handleSendMessage = async () => {
    if (!chatMessage.trim()) return;
    
    setIsLoading(true);
    const userMessage = chatMessage;
    setChatMessage('');
    
    // Add user message to chat
    setChatHistory(prev => [...prev, { type: 'user', message: userMessage }]);
    
    // Simulate AI response
    setTimeout(() => {
      const aiResponse = `I've analyzed your spending patterns and can help with "${userMessage}". Based on your data, I can provide personalized insights and predictions.`;
      setChatHistory(prev => [...prev, { type: 'ai', message: aiResponse }]);
      setIsLoading(false);
    }, 1000);
  };

  return (
    <div className="w-full">
      {/* Standardized Dashboard Header */}
      <DashboardHeader />

      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-7xl mx-auto space-y-8">
          
          {/* 🔮 1. Future Spending Forecast Block */}
          <div className="bg-gradient-to-br from-indigo-600/20 to-blue-600/20 backdrop-blur-md rounded-2xl p-6 border border-white/20">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gradient-to-r from-indigo-500 to-blue-600 rounded-full flex items-center justify-center">
                  <Brain size={24} className="text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white">Next Month's Predicted Spending</h3>
                  <p className="text-white/60 text-sm">AI-powered forecast based on your patterns</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button 
                  onClick={() => setForecastPeriod('30')}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${
                    forecastPeriod === '30' 
                      ? 'bg-white/20 text-white' 
                      : 'text-white/60 hover:text-white'
                  }`}
                >
                  30-day
                </button>
                <button 
                  onClick={() => setForecastPeriod('90')}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${
                    forecastPeriod === '90' 
                      ? 'bg-white/20 text-white' 
                      : 'text-white/60 hover:text-white'
                  }`}
                >
                  90-day
                </button>
                <button 
                  onClick={() => setForecastPeriod('180')}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${
                    forecastPeriod === '180' 
                      ? 'bg-white/20 text-white' 
                      : 'text-white/60 hover:text-white'
                  }`}
                >
                  6-month
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="text-center">
                  <div className="text-4xl font-bold text-white mb-2">$2,840</div>
                  <div className="text-white/60 text-sm">Predicted for March 2024</div>
                  <div className="flex items-center justify-center space-x-2 mt-2">
                    <TrendingUp size={16} className="text-green-400" />
                    <span className="text-green-400 text-sm">+$120 from February</span>
                  </div>
                </div>
                <div className="bg-white/10 rounded-lg p-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-white/60">Confidence Level</span>
                    <span className="text-white font-semibold">89%</span>
                  </div>
                  <div className="w-full bg-white/20 rounded-full h-2 mt-2">
                    <div 
                      className="bg-gradient-to-r from-green-400 to-blue-500 h-2 rounded-full"
                      style={{ width: '89%' }}
                    ></div>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <h4 className="text-white font-semibold text-lg">Top Spending Categories</h4>
                <div className="space-y-3">
                  {predictions.slice(0, 3).map((prediction) => (
                    <div key={prediction.id} className="flex items-center justify-between bg-white/5 rounded-lg p-3">
                      <div className="flex items-center space-x-3">
                        {getTrendIcon(prediction.trend)}
                        <span className="text-white text-sm">{prediction.category}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-white font-semibold">${prediction.predicted}</div>
                        <div className={`text-xs ${
                          prediction.change > 0 ? 'text-red-400' : 'text-green-400'
                        }`}>
                          {prediction.change > 0 ? '+' : ''}${Math.abs(prediction.change)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 🚨 2. Smart Alerts & Notifications */}
          <div className="bg-gradient-to-br from-red-600/20 to-orange-600/20 backdrop-blur-md rounded-2xl p-6 border border-white/20">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-12 h-12 bg-gradient-to-r from-red-500 to-orange-600 rounded-full flex items-center justify-center">
                <AlertTriangle size={24} className="text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Smart Alerts & Notifications</h3>
                <p className="text-white/60 text-sm">AI-powered warnings about upcoming expenses</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {alerts.map((alert) => (
                <motion.div
                  key={alert.id}
                  className="bg-white/10 rounded-lg p-4"
                  whileHover={{ scale: 1.02 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <AlertTriangle size={20} className="text-yellow-400" />
                      <span className="text-white font-semibold">{alert.title}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-white font-bold">${alert.predictedValue}</div>
                      <div className="text-xs text-white/60">{alert.confidence}% confidence</div>
                    </div>
                  </div>
                  <p className="text-white/80 text-sm mb-3">{alert.message}</p>
                  <button className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all">
                    {alert.action}
                  </button>
                </motion.div>
              ))}
            </div>
          </div>
          
          {/* 🎯 3. Category-Specific Prediction Cards */}
          <div className="space-y-6">
            <h3 className="text-xl font-bold text-white">Category Predictions</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {predictions.map((prediction) => (
                <motion.div
                  key={prediction.id}
                  className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20"
                  whileHover={{ scale: 1.02 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                      {getTrendIcon(prediction.trend)}
                      <span className="text-white font-semibold">{prediction.category}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-white font-bold">${prediction.predicted}</div>
                      <div className={`text-xs ${
                        prediction.change > 0 ? 'text-red-400' : 'text-green-400'
                      }`}>
                        {prediction.change > 0 ? '+' : ''}${Math.abs(prediction.change)}
                      </div>
                    </div>
                  </div>
                  <p className="text-white/60 text-sm mb-4">{prediction.reason}</p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-white/60">Confidence</span>
                      <span className="text-white">{prediction.confidence}%</span>
                    </div>
                    <div className="w-full bg-white/20 rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full"
                        style={{ width: `${prediction.confidence}%` }}
                      ></div>
                    </div>
                  </div>
                  <button className="w-full mt-4 bg-white/20 hover:bg-white/30 text-white py-2 rounded-lg text-sm font-medium transition-all">
                    {prediction.suggestion}
                  </button>
                </motion.div>
              ))}
            </div>
          </div>

          {/* 🧠 4. Personalized Prediction Feed */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <Sparkles size={20} className="text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">AI Prediction Feed</h3>
                <p className="text-white/60 text-sm">Real-time insights based on your patterns</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="bg-white/5 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <Clock size={16} className="text-blue-400 mt-1" />
                  <div>
                    <p className="text-white text-sm">Your spending spikes every 3-day weekend. Memorial Day is next.</p>
                    <p className="text-white/60 text-xs mt-1">Suggestion: Set aside $150 for weekend expenses</p>
                  </div>
                </div>
              </div>

              <div className="bg-white/5 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <Target size={16} className="text-green-400 mt-1" />
                  <div>
                    <p className="text-white text-sm">You save 23% more when motivation audio is enabled.</p>
                    <p className="text-white/60 text-xs mt-1">Suggestion: Enable audio nudge playlist</p>
                  </div>
                </div>
              </div>

              <div className="bg-white/5 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <TrendingUp size={16} className="text-yellow-400 mt-1" />
                  <div>
                    <p className="text-white text-sm">Subscription spending up 15% this quarter.</p>
                    <p className="text-white/60 text-xs mt-1">Suggestion: Review and cancel unused services</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 💬 5. AI Chat Interface */}
          <div className="bg-gradient-to-br from-blue-600/20 to-purple-600/20 backdrop-blur-md rounded-2xl p-6 border border-white/20">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <MessageCircle size={24} className="text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Ask Your AI Financial Advisor</h3>
                <p className="text-white/60 text-sm">Get personalized insights about your spending predictions</p>
              </div>
            </div>
            
            <div className="space-y-4">
              {/* Chat History */}
              <div className="bg-white/5 rounded-lg p-4 h-48 overflow-y-auto space-y-3">
                {chatHistory.length === 0 ? (
                  <div className="text-center text-white/40 text-sm">
                    Start a conversation about your spending predictions...
                  </div>
                ) : (
                  chatHistory.map((msg, index) => (
                    <div key={index} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-xs px-3 py-2 rounded-lg text-sm ${
                        msg.type === 'user' 
                          ? 'bg-blue-500 text-white' 
                          : 'bg-white/10 text-white'
                      }`}>
                        {msg.message}
                      </div>
                    </div>
                  ))
                )}
              </div>
              
              {/* Chat Input */}
              <div className="flex space-x-3">
                <input
                  type="text"
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  placeholder="Ask about your spending predictions..."
                  className="flex-1 bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-white/40 focus:outline-none focus:border-blue-400"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!chatMessage.trim() || isLoading}
                  className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg transition-all"
                >
                  Send
                </button>
              </div>
              
              {/* Quick Questions */}
              <div className="flex flex-wrap gap-2">
                <button 
                  onClick={() => setChatMessage("Why is my travel prediction so high?")}
                  className="bg-white/10 hover:bg-white/20 text-white px-3 py-1 rounded-full text-sm transition-all"
                >
                  Why is travel high?
                </button>
                <button 
                  onClick={() => setChatMessage("How can I reduce my grocery forecast?")}
                  className="bg-white/10 hover:bg-white/20 text-white px-3 py-1 rounded-full text-sm transition-all"
                >
                  Reduce grocery costs
                </button>
                <button 
                  onClick={() => setChatMessage("How accurate are these predictions?")}
                  className="bg-white/10 hover:bg-white/20 text-white px-3 py-1 rounded-full text-sm transition-all"
                >
                  Prediction accuracy
                </button>
              </div>
            </div>
          </div>
          
          {/* 🧠 6. AI Prediction Engine (How It Works) */}
          <div className="bg-gradient-to-br from-indigo-600/20 to-purple-600/20 backdrop-blur-md rounded-2xl p-6 border border-white/20">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-12 h-12 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full flex items-center justify-center">
                <Brain size={24} className="text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">How Smart is Your AI?</h3>
                <p className="text-white/60 text-sm">Understanding your prediction accuracy</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="bg-white/10 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-2">📊 Pattern Recognition</h4>
                  <p className="text-white/60 text-sm">Analyzes 12 months of your spending + public data</p>
                </div>
                <div className="bg-white/10 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-2">🧠 Machine Learning</h4>
                  <p className="text-white/60 text-sm">Trains on anonymized trends from 1M+ users</p>
                </div>
              </div>
              <div className="space-y-4">
                <div className="bg-white/10 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-2">⚡ Real-Time Updates</h4>
                  <p className="text-white/60 text-sm">Changes as you upload new transactions</p>
                </div>
                <div className="bg-white/10 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-2">🎯 Personalized Memory</h4>
                  <p className="text-white/60 text-sm">Knows your category tweaks, lifestyle changes</p>
                </div>
              </div>
            </div>

            <div className="mt-6 text-center">
              <div className="text-3xl font-bold text-white mb-2">88%</div>
              <div className="text-white/60 text-sm">Current Prediction Accuracy</div>
              <button className="mt-4 bg-white/20 hover:bg-white/30 text-white px-6 py-2 rounded-lg font-medium transition-all">
                View Detailed Analytics
              </button>
            </div>
          </div>
          
          {/* Specialized Spending Predictions Chatbot */}
          <SpecializedChatBot
            name="SpendingPredictionsBot"
            expertise="Forecasting expenses, trend analysis, and alerts"
            avatar="📊"
            welcomeMessage="Hi! I'm SpendingPredictionsBot, your spending forecast specialist. I can help you predict future expenses, analyze spending trends, identify potential budget issues, and provide early warnings about upcoming costs. What would you like to know about your spending patterns?"
            color="orange"
          />
        </div>
      </div>
    </div>
  );
};

export default SpendingPredictionsPage; 




