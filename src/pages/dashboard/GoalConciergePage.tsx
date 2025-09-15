import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, BarChart3, Trophy, Send, Loader2, X, Brain } from 'lucide-react';

interface GoalieMessage {
  role: 'user' | 'goalie';
  content: string;
  timestamp: string;
}

const GoalConciergePage: React.FC = () => {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [messages, setMessages] = useState<GoalieMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async (message: string) => {
    if (!message.trim() || isLoading) return;

    const userMessage: GoalieMessage = {
      role: 'user',
      content: message,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // Simulate AI response
    setTimeout(() => {
      const goalieResponse: GoalieMessage = {
        role: 'goalie',
        content: getGoalieResponse(message),
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, goalieResponse]);
      setIsLoading(false);
    }, 1500);
  };

  const getGoalieResponse = (message: string): string => {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('emergency fund') || lowerMessage.includes('emergency')) {
      return "Great question about emergency funds! I recommend building 3-6 months of expenses. Based on your current progress of $8,500, you're doing well! Consider increasing your monthly contribution to $750 to reach your goal 3 months earlier. Would you like me to help you create a savings strategy?";
    }
    
    if (lowerMessage.includes('vacation') || lowerMessage.includes('travel')) {
      return "Vacation planning is exciting! Your vacation fund is at 64% completion - excellent progress! To reach your $5,000 target by August, consider setting up automatic transfers of $200/month. I can also help you find ways to save on travel expenses. What's your dream destination?";
    }
    
    if (lowerMessage.includes('debt') || lowerMessage.includes('payoff')) {
      return "Debt payoff is a smart priority! Your credit card debt of $7,700 is manageable. I suggest the avalanche method - pay minimums on all cards, then put extra money toward the highest interest rate card. Would you like me to create a personalized debt payoff timeline?";
    }
    
    if (lowerMessage.includes('goal') || lowerMessage.includes('target')) {
      return "I love helping with goal setting! The key is making goals SMART - Specific, Measurable, Achievable, Relevant, and Time-bound. Based on your current goals, you're making great progress. What new goal would you like to work on?";
    }
    
    if (lowerMessage.includes('budget') || lowerMessage.includes('spending')) {
      return "Budgeting is the foundation of financial success! I recommend the 50/30/20 rule: 50% for needs, 30% for wants, 20% for savings and debt payoff. Would you like me to analyze your spending patterns and suggest budget optimizations?";
    }
    
    return "Thanks for reaching out! I'm here to help you achieve your financial goals. Whether it's building emergency funds, planning vacations, paying off debt, or creating budgets - I've got strategies for you! What specific goal would you like to work on today?";
  };

  return (
    <div className="w-full pt-32 px-4 sm:px-6 lg:px-8">
      {/* Welcome Section */}
      <div className="text-center mb-8">
        <h2 className="text-xl font-bold text-white mb-1">
          Welcome to Goalie's Goals Setting Session
        </h2>
        <p className="text-white/60 text-sm mb-3">
          Your intelligent guide to setting, tracking, and achieving your financial goals
        </p>
        <div className="flex items-center justify-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-green-400 text-sm font-medium">AI Ready</span>
          </div>
          <div className="text-2xl">🎯</div>
        </div>
      </div>

      {/* Professional Dashboard Layout */}
      <div className="space-y-6">
        {/* Goalie AI Assistant */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center">
                <Target className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Goalie AI</h3>
                <p className="text-white/60 text-sm">Your personal goal-setting coach</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-green-400 text-sm">AI Active</span>
            </div>
          </div>
          
          <div className="bg-white/10 rounded-lg p-4 mb-4">
            <p className="text-white/80 text-sm mb-3">
              "Hi! I'm Goalie, your AI goal-setting assistant. I can help you create smart financial goals, 
              track your progress, and provide personalized strategies to achieve them faster. What would you like to work on today?"
            </p>
            <div className="flex gap-2">
              <button 
                onClick={() => setIsChatOpen(true)}
                className="bg-purple-500 hover:bg-purple-600 text-white px-3 py-2 rounded-lg text-sm transition-colors"
              >
                Chat with Goalie
              </button>
              <button className="bg-white/10 hover:bg-white/20 text-white px-3 py-2 rounded-lg text-sm transition-colors">
                Get Goal Suggestions
              </button>
            </div>
          </div>
        </motion.div>

        {/* Goal Management Dashboard */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-white">AI-Powered Goal Management</h2>
              <p className="text-white/60 text-sm">Let Goalie help you set and achieve your financial goals</p>
            </div>
            <div className="flex gap-2">
              <button className="bg-gradient-to-r from-purple-500 to-pink-500 hover:opacity-90 text-white px-4 py-2 rounded-lg transition-all flex items-center space-x-2">
                <Target size={16} />
                <span>Create Goal</span>
              </button>
              <button className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2">
                <BarChart3 size={16} />
                <span>Analytics</span>
              </button>
            </div>
          </div>

          {/* Goalie's Insights */}
          <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/30 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <Target className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1">
                <div className="text-purple-400 font-semibold text-sm mb-1">🎯 Goalie's Analysis</div>
                <p className="text-white/80 text-sm leading-relaxed mb-2">
                  "Based on your financial profile, I recommend focusing on building an emergency fund first. 
                  You're currently saving $500/month - increasing this to $750 would help you reach your 6-month goal 3 months earlier."
                </p>
                <div className="flex gap-2">
                  <button className="bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded px-3 py-1 text-xs transition-colors">
                    Get Strategy
                  </button>
                  <button className="bg-white/10 hover:bg-white/20 text-white rounded px-3 py-1 text-xs transition-colors">
                    Adjust Goal
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Active Goals Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
            {/* Emergency Fund Goal */}
            <div className="bg-white/5 rounded-xl p-4 border border-white/10 hover:border-white/20 transition-all cursor-pointer group">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-white">Emergency Fund</h3>
                <div className="text-xs px-2 py-1 rounded-full text-green-400 bg-white/10">
                  Active
                </div>
              </div>
              
              <p className="text-white/70 text-sm mb-4">Build 6-month emergency fund</p>
              
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-white/60">Progress</span>
                    <span className="text-white">57%</span>
                  </div>
                  <div className="w-full bg-white/20 rounded-full h-2">
                    <div className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all" style={{ width: '57%' }} />
                  </div>
                </div>
                
                <div className="flex justify-between text-sm">
                  <span className="text-white/60">Current</span>
                  <span className="text-white">$8,500</span>
                </div>
                
                <div className="flex justify-between text-sm">
                  <span className="text-white/60">Target</span>
                  <span className="text-white">$15,000</span>
                </div>
                
                <div className="flex justify-between text-sm">
                  <span className="text-white/60">Deadline</span>
                  <span className="text-white">Dec 31, 2024</span>
                </div>
                
                <div className="flex gap-2 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button className="bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded px-2 py-1 text-xs transition-colors">
                    Ask Goalie
                  </button>
                  <button className="bg-white/10 hover:bg-white/20 text-white rounded px-2 py-1 text-xs transition-colors">
                    Update
                  </button>
                </div>
              </div>
            </div>

            {/* Vacation Fund Goal */}
            <div className="bg-white/5 rounded-xl p-4 border border-white/10 hover:border-white/20 transition-all cursor-pointer group">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-white">Vacation Fund</h3>
                <div className="text-xs px-2 py-1 rounded-full text-blue-400 bg-white/10">
                  Active
                </div>
              </div>
              
              <p className="text-white/70 text-sm mb-4">Save for dream vacation</p>
              
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-white/60">Progress</span>
                    <span className="text-white">64%</span>
                  </div>
                  <div className="w-full bg-white/20 rounded-full h-2">
                    <div className="bg-gradient-to-r from-blue-500 to-cyan-500 h-2 rounded-full transition-all" style={{ width: '64%' }} />
                  </div>
                </div>
                
                <div className="flex justify-between text-sm">
                  <span className="text-white/60">Current</span>
                  <span className="text-white">$3,200</span>
                </div>
                
                <div className="flex justify-between text-sm">
                  <span className="text-white/60">Target</span>
                  <span className="text-white">$5,000</span>
                </div>
                
                <div className="flex justify-between text-sm">
                  <span className="text-white/60">Deadline</span>
                  <span className="text-white">Aug 15, 2024</span>
                </div>
                
                <div className="flex gap-2 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button className="bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded px-2 py-1 text-xs transition-colors">
                    Ask Goalie
                  </button>
                  <button className="bg-white/10 hover:bg-white/20 text-white rounded px-2 py-1 text-xs transition-colors">
                    Update
                  </button>
                </div>
              </div>
            </div>

            {/* Debt Payoff Goal */}
            <div className="bg-white/5 rounded-xl p-4 border border-white/10 hover:border-white/20 transition-all cursor-pointer group">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-white">Debt Payoff</h3>
                <div className="text-xs px-2 py-1 rounded-full text-red-400 bg-white/10">
                  High Priority
                </div>
              </div>
              
              <p className="text-white/70 text-sm mb-4">Pay off credit card debt</p>
              
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-white/60">Progress</span>
                    <span className="text-white">23%</span>
                  </div>
                  <div className="w-full bg-white/20 rounded-full h-2">
                    <div className="bg-gradient-to-r from-red-500 to-orange-500 h-2 rounded-full transition-all" style={{ width: '23%' }} />
                  </div>
                </div>
                
                <div className="flex justify-between text-sm">
                  <span className="text-white/60">Remaining</span>
                  <span className="text-white">$7,700</span>
                </div>
                
                <div className="flex justify-between text-sm">
                  <span className="text-white/60">Target</span>
                  <span className="text-white">$0</span>
                </div>
                
                <div className="flex justify-between text-sm">
                  <span className="text-white/60">Deadline</span>
                  <span className="text-white">Mar 31, 2025</span>
                </div>
                
                <div className="flex gap-2 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button className="bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded px-2 py-1 text-xs transition-colors">
                    Ask Goalie
                  </button>
                  <button className="bg-white/10 hover:bg-white/20 text-white rounded px-2 py-1 text-xs transition-colors">
                    Update
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white/5 rounded-lg p-4 border border-white/10">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
                  <Target className="w-4 h-4 text-white" />
                </div>
                <h3 className="text-white font-semibold text-sm">Smart Goal Creation</h3>
              </div>
              <p className="text-white/60 text-xs mb-3">Let Goalie analyze your finances and suggest personalized goals</p>
              <button className="w-full bg-green-500 hover:bg-green-600 text-white rounded px-3 py-2 text-xs transition-colors">
                Create Smart Goal
              </button>
            </div>

            <div className="bg-white/5 rounded-lg p-4 border border-white/10">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-lg flex items-center justify-center">
                  <BarChart3 className="w-4 h-4 text-white" />
                </div>
                <h3 className="text-white font-semibold text-sm">Progress Analytics</h3>
              </div>
              <p className="text-white/60 text-xs mb-3">Get AI-powered insights on your goal progress and recommendations</p>
              <button className="w-full bg-blue-500 hover:bg-blue-600 text-white rounded px-3 py-2 text-xs transition-colors">
                View Analytics
              </button>
            </div>

            <div className="bg-white/5 rounded-lg p-4 border border-white/10">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center">
                  <Trophy className="w-4 h-4 text-white" />
                </div>
                <h3 className="text-white font-semibold text-sm">Achievement Rewards</h3>
              </div>
              <p className="text-white/60 text-xs mb-3">Celebrate milestones and unlock achievements with Goalie</p>
              <button className="w-full bg-purple-500 hover:bg-purple-600 text-white rounded px-3 py-2 text-xs transition-colors">
                View Achievements
              </button>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Chat Modal */}
      <AnimatePresence>
        {isChatOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setIsChatOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 w-full max-w-2xl h-[600px] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Chat Header */}
              <div className="flex items-center justify-between p-4 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center">
                    <Target className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">Goalie AI</h3>
                    <p className="text-white/60 text-sm">Your goal-setting coach</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsChatOpen(false)}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-white/60" />
                </button>
              </div>

              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 ? (
                  <div className="h-full flex items-center justify-center">
                    <div className="text-center">
                      <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <Target className="w-8 h-8 text-white" />
                      </div>
                      <h4 className="text-lg font-semibold text-white mb-2">Hi! I'm Goalie 🎯</h4>
                      <p className="text-white/60 text-sm mb-4">
                        I'm here to help you achieve your financial goals. Ask me about:
                      </p>
                      <div className="grid grid-cols-1 gap-2 max-w-sm mx-auto">
                        {[
                          "How to build an emergency fund",
                          "Strategies for debt payoff",
                          "Vacation savings tips",
                          "Budget optimization",
                          "Goal setting techniques"
                        ].map((suggestion, index) => (
                          <button
                            key={index}
                            onClick={() => sendMessage(suggestion)}
                            className="text-left p-3 bg-white/5 hover:bg-white/10 rounded-lg text-white/80 hover:text-white text-sm transition-colors"
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  messages.map((message, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] p-3 rounded-lg ${
                          message.role === 'user'
                            ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                            : 'bg-white/10 text-white border border-white/20'
                        }`}
                      >
                        {message.role === 'goalie' && (
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-6 h-6 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center">
                              <Target className="w-3 h-3 text-white" />
                            </div>
                            <span className="text-xs font-semibold text-purple-400">Goalie</span>
                          </div>
                        )}
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                        <p className="text-xs opacity-70 mt-1">
                          {new Date(message.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                    </motion.div>
                  ))
                )}
                
                {isLoading && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex justify-start"
                  >
                    <div className="bg-white/10 px-3 py-2 rounded-lg border border-white/20">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center">
                          <Target className="w-3 h-3 text-white" />
                        </div>
                        <div className="flex items-center gap-2">
                          <Loader2 className="w-3 h-3 animate-spin text-purple-400" />
                          <span className="text-xs text-white/70">Goalie is thinking...</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input */}
              <div className="p-4 border-t border-white/10">
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && !isLoading && sendMessage(input)}
                      placeholder="Ask Goalie about your financial goals..."
                      className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent transition-all text-sm"
                      disabled={isLoading}
                    />
                  </div>
                  <button
                    onClick={() => !isLoading && sendMessage(input)}
                    disabled={isLoading || !input.trim()}
                    className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:opacity-90 disabled:opacity-50 transition-all"
                  >
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default GoalConciergePage;
