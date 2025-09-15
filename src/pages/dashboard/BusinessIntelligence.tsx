import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Send, Loader2, BarChart3, TrendingUp, Target, DollarSign, Users, Zap } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { getConversation, saveConversation } from '../../lib/supabase';

interface Message {
  role: 'user' | 'intelia' | 'system';
  content: string;
  timestamp: string;
}

const BusinessIntelligence: React.FC = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Initialize conversation
  useEffect(() => {
    const initializeConversation = async () => {
      if (!user?.id) return;

      const newConversationId = `intelia-${Date.now()}`;
      
      try {
        // Load existing conversation if available
        const existingConversation = await getConversation(newConversationId, 'intelia', user.id);
        if (existingConversation && existingConversation.messages.length > 0) {
          const inteliaMessages = existingConversation.messages.map(msg => ({
            role: msg.role as 'user' | 'intelia' | 'system',
            content: msg.content,
            timestamp: msg.timestamp
          }));
          setMessages(inteliaMessages);
        } else {
          // Start with welcome message
          const welcomeMessage: Message = {
            role: 'intelia',
            content: getInteliaResponse(''),
            timestamp: new Date().toISOString()
          };
          setMessages([welcomeMessage]);
        }
      } catch (error) {
        console.error('Error initializing conversation:', error);
        // Fallback to welcome message
        const welcomeMessage: Message = {
          role: 'intelia',
          content: getInteliaResponse(''),
          timestamp: new Date().toISOString()
        };
        setMessages([welcomeMessage]);
      }
    };

    initializeConversation();
  }, [user?.id]);

  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return;

    const userMessage: Message = {
      role: 'user',
      content: content.trim(),
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // Simulate AI response
    setTimeout(() => {
      const inteliaResponse: Message = {
        role: 'intelia',
        content: getInteliaResponse(content),
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, inteliaResponse]);
      setIsLoading(false);
    }, 1500);
  };

  const getInteliaResponse = (message: string): string => {
    const query = message.toLowerCase();
    
    if (query.includes('analytics') || query.includes('data analysis')) {
      return `📊 Excellent! Let me help you unlock powerful business insights from your data:

**Key Analytics Areas:**
• **Performance Metrics** - Track KPIs and business growth
• **Customer Analytics** - Understand behavior and preferences  
• **Financial Analytics** - Revenue, costs, and profitability analysis
• **Operational Analytics** - Process efficiency and optimization

**What I Can Do:**
• Analyze your financial data for trends and patterns
• Create custom dashboards and reports
• Identify growth opportunities and risks
• Provide actionable insights for decision-making

What specific analytics challenge are you facing? I can help you dive deep into your data! 📈`;
    }
    
    if (query.includes('strategy') || query.includes('planning')) {
      return `🎯 Perfect! Let's develop a comprehensive business strategy to drive growth and success:

**Strategic Planning Areas:**
• **Market Analysis** - Competitive landscape and opportunities
• **Financial Planning** - Budgeting, forecasting, and resource allocation
• **Growth Strategy** - Expansion plans and scaling approaches
• **Risk Management** - Identifying and mitigating potential threats

**Strategic Tools I Offer:**
• SWOT analysis and competitive intelligence
• Financial modeling and scenario planning
• Market research and trend analysis
• Performance tracking and optimization

What strategic goals are you working towards? I'll help you create a roadmap to achieve them! 🚀`;
    }
    
    if (query.includes('performance') || query.includes('metrics') || query.includes('kpi')) {
      return `📈 Great! Let's establish a robust performance measurement system for your business:

**Key Performance Indicators:**
• **Financial KPIs** - Revenue, profit margins, cash flow
• **Customer KPIs** - Acquisition cost, lifetime value, satisfaction
• **Operational KPIs** - Efficiency, productivity, quality metrics
• **Growth KPIs** - Market share, expansion rate, innovation metrics

**Performance Optimization:**
• Real-time monitoring and alerting
• Benchmarking against industry standards
• Predictive analytics for future performance
• Automated reporting and insights

I can help you identify the most important metrics for your business and set up tracking systems. What performance areas are you most concerned about? 📊`;
    }
    
    return `I'm excited to help you unlock the full potential of your business intelligence! Whether you're looking to analyze performance data, develop strategic insights, or optimize your operations, I'm here to provide expert guidance.

What's on your mind when it comes to business intelligence? Are we talking about data analytics, strategic planning, performance metrics, or something else entirely? I'm ready to dive deep and help you make data-driven decisions that drive real business growth!`;
  };

  return (
    <div className="max-w-7xl mx-auto p-6 mt-6 md:mt-8">
      {/* Welcome Header */}
      <div className="text-center mb-8">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-xl font-bold text-white mb-1"
        >
          Business Intelligence
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-white/60 text-sm mb-3"
        >
          Your intelligent guide to data-driven insights, strategic planning, and business optimization
        </motion.p>
        <div className="flex items-center justify-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
            <span className="text-purple-400 text-sm font-medium">Intelia AI Active</span>
          </div>
          <div className="text-2xl">🧠</div>
        </div>
      </div>

      {/* Chat Interface with Integrated Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="bg-white/5 rounded-lg border border-white/10 overflow-hidden"
      >
        {/* Chat Header */}
        <div className="bg-white/10 px-4 py-3 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Intelia - Business Intelligence AI</h3>
              <p className="text-white/60 text-sm">Your strategic analytics partner</p>
            </div>
          </div>
        </div>

        {/* Chat Messages */}
        <div className="h-96 overflow-y-auto p-4 space-y-4">
          {messages.map((message, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                message.role === 'user'
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                  : 'bg-white/10 text-white border border-white/20'
              }`}>
                {message.role === 'intelia' && (
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                      <BarChart3 className="w-3 h-3 text-white" />
                    </div>
                    <span className="text-xs font-semibold text-purple-400">Intelia</span>
                  </div>
                )}
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                <p className="text-xs opacity-70 mt-1">
                  {new Date(message.timestamp).toLocaleTimeString()}
                </p>
              </div>
            </motion.div>
          ))}
          
          {isLoading && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-start"
            >
              <div className="bg-white/10 text-white border border-white/20 rounded-2xl px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                    <BarChart3 className="w-3 h-3 text-white" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-3 h-3 animate-spin text-purple-400" />
                    <span className="text-xs text-white/70">Intelia is analyzing...</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Chat Input */}
        <div className="bg-white/5 px-4 py-3 border-t border-white/10">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !isLoading && sendMessage(input)}
              placeholder="Ask Intelia about analytics, strategy, performance metrics..."
              className="flex-1 bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-white/50 focus:outline-none focus:border-purple-500 text-sm"
              disabled={isLoading}
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={isLoading || !input.trim()}
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg px-3 py-2 transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default BusinessIntelligence;
