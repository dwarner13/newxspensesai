import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  BarChart3, 
  TrendingUp, 
  Send, 
  Loader2,
  MessageCircle,
  Users,
  Play,
  Target,
  Brain,
  Zap,
  Activity,
  CheckCircle,
  Clock
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import {
  getEmployeeConfig,
  getConversation,
  addMessageToConversation,
  incrementConversationCount,
  logAIInteraction,
  generateConversationId
} from '../../lib/ai-employees';

// AI Analytics Interfaces
interface AIAnalyst {
  id: string;
  name: string;
  title: string;
  emoji: string;
  specialty: string;
  superpower: string;
  description: string;
  color: string;
  bgColor: string;
  borderColor: string;
  status: 'active' | 'working' | 'idle';
  currentTask?: string;
  performance: number;
}

interface AnalyticsMessage {
  role: 'user' | 'ai';
  content: string;
  timestamp: string;
  analyst: string;
  insight?: 'trend' | 'anomaly' | 'opportunity' | 'warning' | 'neutral';
}

interface KeyMetric {
  id: string;
  name: string;
  value: string | number;
  change: number;
  changeType: 'increase' | 'decrease' | 'neutral';
  unit?: string;
  trend?: 'up' | 'down' | 'stable';
  status?: 'good' | 'warning' | 'danger';
  aiInsight?: string;
}

export default function Analytics() {
  console.log('🚀🚀🚀 LOADING AI ANALYTICS DASHBOARD - Comprehensive Analysis Powerhouse!');
  const { user } = useAuth();
  const [messages, setMessages] = useState<AnalyticsMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState('');
  const [activeView, setActiveView] = useState('overview');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // AI Analytics Team
  const aiAnalysts: AIAnalyst[] = [
    {
      id: 'crystal',
      name: 'Crystal',
      title: 'Predictive Analytics AI',
      emoji: '🔮',
      specialty: 'Future Forecasting',
      superpower: 'Predicts trends 6 months ahead',
      description: 'Crystal specializes in predictive modeling and trend analysis',
      color: 'from-purple-500 to-pink-500',
      bgColor: 'bg-purple-500/10',
      borderColor: 'border-purple-500/30',
      status: 'active',
      currentTask: 'Analyzing spending patterns',
      performance: 94
    },
    {
      id: 'byte',
      name: 'Byte',
      title: 'Data Processing AI',
      emoji: '📊',
      specialty: 'Real-time Analysis',
      superpower: 'Processes 10,000+ data points/second',
      description: 'Byte handles massive data processing and real-time insights',
      color: 'from-blue-500 to-cyan-500',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/30',
      status: 'working',
      currentTask: 'Processing transaction data',
      performance: 98
    },
    {
      id: 'tag',
      name: 'Tag',
      title: 'Pattern Recognition AI',
      emoji: '🏷️',
      specialty: 'Smart Categorization',
      superpower: '99.7% accuracy in pattern detection',
      description: 'Tag identifies patterns and categorizes data with incredible precision',
      color: 'from-green-500 to-emerald-500',
      bgColor: 'bg-green-500/10',
      borderColor: 'border-green-500/30',
      status: 'active',
      currentTask: 'Categorizing expenses',
      performance: 97
    },
    {
      id: 'prime',
      name: 'Prime',
      title: 'Strategic Analysis AI',
      emoji: '👑',
      specialty: 'Strategic Insights',
      superpower: 'Orchestrates complete analysis strategy',
      description: 'Prime coordinates all AI analysts for comprehensive insights',
      color: 'from-orange-500 to-red-500',
      bgColor: 'bg-orange-500/10',
      borderColor: 'border-orange-500/30',
      status: 'active',
      currentTask: 'Coordinating analysis',
      performance: 96
    }
  ];

  // Key Metrics with AI Insights
  const keyMetrics: KeyMetric[] = [
    {
      id: 'revenue',
      name: 'Monthly Revenue',
      value: '$45,230',
      change: 12.5,
      changeType: 'increase',
      unit: 'USD',
      trend: 'up',
      status: 'good',
      aiInsight: 'Crystal predicts 15% growth next month based on current trends'
    },
    {
      id: 'expenses',
      name: 'Operating Expenses',
      value: '$28,450',
      change: -3.2,
      changeType: 'decrease',
      unit: 'USD',
      trend: 'down',
      status: 'good',
      aiInsight: 'Tag identified 3 cost-saving opportunities worth $2,100/month'
    },
    {
      id: 'profit',
      name: 'Net Profit',
      value: '$16,780',
      change: 28.7,
      changeType: 'increase',
      unit: 'USD',
      trend: 'up',
      status: 'good',
      aiInsight: 'Prime analysis shows 40% profit margin improvement this quarter'
    },
    {
      id: 'cashflow',
      name: 'Cash Flow',
      value: '$12,340',
      change: 8.9,
      changeType: 'increase',
      unit: 'USD',
      trend: 'up',
      status: 'good',
      aiInsight: 'Byte detected optimal cash flow timing for investments'
    }
  ];

  // Initialize conversation
  useEffect(() => {
    const initializeAnalytics = async () => {
      if (!user?.id) return;

      try {
        const config = await getEmployeeConfig('crystal');
        if (config) {
          console.log('Crystal config loaded:', config);
        }

        const newConversationId = generateConversationId();
        setConversationId(newConversationId);

        const existingConversation = await getConversation(newConversationId, 'crystal', user.id);
        if (existingConversation && existingConversation.messages.length > 0) {
          const analyticsMessages = existingConversation.messages.map(msg => ({
            role: msg.role as 'user' | 'ai',
            content: msg.content,
            timestamp: msg.timestamp,
            analyst: 'Crystal',
            insight: 'neutral' as const
          }));
          setMessages(analyticsMessages);
        }
      } catch (error) {
        console.error('Error initializing Analytics:', error);
      }
    };

    initializeAnalytics();
  }, [user?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return;

    const userMessage: AnalyticsMessage = {
      role: 'user',
      content: content.trim(),
      timestamp: new Date().toISOString(),
      analyst: 'Crystal'
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      await addMessageToConversation(conversationId, content.trim(), 'crystal', user?.id || 'anonymous');

      const aiResponse = generateAnalyticsResponse(content.trim());
      
      const aiMessage: AnalyticsMessage = {
        role: 'ai',
        content: aiResponse,
        timestamp: new Date().toISOString(),
        analyst: 'Crystal',
        insight: 'trend'
      };

      setMessages(prev => [...prev, aiMessage]);

      await addMessageToConversation(conversationId, aiResponse, 'crystal', user?.id || 'anonymous');
      await logAIInteraction('crystal', user?.id || 'anonymous', 'chat', 'Analytics chat interaction');
      await incrementConversationCount('crystal', user?.id || 'anonymous');

    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: AnalyticsMessage = {
        role: 'ai',
        content: "I apologize, but I'm experiencing some technical difficulties. Please try again in a moment.",
        timestamp: new Date().toISOString(),
        analyst: 'Crystal'
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const generateAnalyticsResponse = (query: string): string => {
    const lowerQuery = query.toLowerCase();

    if (lowerQuery.includes('trend') || lowerQuery.includes('pattern') || lowerQuery.includes('forecast')) {
      return `📈 **Trend Analysis Report** - Powered by Crystal AI

**Current Trends Identified:**
• **Revenue Growth**: 12.5% month-over-month increase
• **Expense Optimization**: 3.2% decrease in operating costs
• **Seasonal Patterns**: Peak spending in Q4, lowest in Q2
• **Customer Behavior**: 23% increase in repeat purchases

**Predictive Insights:**
• **Next Month Forecast**: Revenue expected to reach $51,200 (+15%)
• **Risk Factors**: Potential supply chain disruption in Q3
• **Opportunities**: Holiday season could boost sales by 40%

**AI Recommendations:**
• Increase inventory by 25% for Q4 preparation
• Implement dynamic pricing strategy
• Focus marketing on high-value customer segments

**Confidence Level**: 94% accuracy based on 2 years of historical data

Would you like me to dive deeper into any specific trend or create a detailed forecast model?`;
    }

    if (lowerQuery.includes('anomaly') || lowerQuery.includes('unusual') || lowerQuery.includes('outlier')) {
      return `🔍 **Anomaly Detection Report** - Powered by Byte AI

**Anomalies Detected:**
• **Unusual Expense Spike**: $2,400 office supply purchase (300% above average)
• **Revenue Anomaly**: $15,000 payment received 2 weeks early
• **Pattern Break**: Weekend sales increased 45% (unusual for your business)
• **Data Inconsistency**: 3 transactions missing category tags

**Analysis Results:**
• **Office Supplies**: Legitimate purchase, but consider bulk ordering
• **Early Payment**: Customer paid ahead due to holiday schedule
• **Weekend Sales**: New marketing campaign driving traffic
• **Missing Tags**: System glitch, now resolved

**Risk Assessment:**
• **Low Risk**: All anomalies have valid explanations
• **Opportunity**: Weekend sales pattern could be optimized
• **Action Required**: Implement better data validation

**Next Steps:**
• Monitor weekend sales trends
• Set up automated anomaly alerts
• Review bulk purchasing strategy

Would you like me to investigate any specific anomaly in more detail?`;
    }

    if (lowerQuery.includes('optimization') || lowerQuery.includes('improve') || lowerQuery.includes('efficiency')) {
      return `⚡ **Optimization Analysis** - Powered by Tag AI

**Optimization Opportunities Identified:**

**Cost Reduction (Potential Savings: $3,200/month)**
• **Office Supplies**: Switch to bulk ordering (-$800/month)
• **Software Subscriptions**: Consolidate unused tools (-$400/month)
• **Energy Usage**: Implement smart scheduling (-$200/month)
• **Marketing**: Focus on high-converting channels (-$1,800/month)

**Revenue Enhancement (Potential Increase: $8,500/month)**
• **Pricing Strategy**: Dynamic pricing for peak hours (+$2,100/month)
• **Upselling**: Bundle complementary services (+$1,800/month)
• **Customer Retention**: Loyalty program implementation (+$2,400/month)
• **Market Expansion**: Target new demographics (+$2,200/month)

**Process Improvements**
• **Automation**: Reduce manual tasks by 60%
• **Data Quality**: Improve accuracy to 99.9%
• **Response Time**: Cut customer inquiry time by 50%

**Implementation Priority:**
1. **High Impact, Low Effort**: Bulk ordering, software consolidation
2. **High Impact, High Effort**: Dynamic pricing, loyalty program
3. **Medium Impact**: Process automation, data quality

**ROI Projection**: 340% return on optimization investments

Which optimization area would you like me to analyze in detail?`;
    }

    // Default response
    return `🔮 **Welcome to AI Analytics Command Center!**

I'm Crystal, your Predictive Analytics AI, and I'm here to transform your data into powerful insights. My AI team and I analyze every aspect of your business to provide:

**📊 Real-Time Analysis**
• Live data processing and pattern recognition
• Instant anomaly detection and alerts
• Continuous performance monitoring

**🔮 Predictive Intelligence**
• 6-month revenue and expense forecasts
• Trend analysis and seasonal predictions
• Risk assessment and opportunity identification

**⚡ Optimization Engine**
• Cost reduction recommendations
• Revenue enhancement strategies
• Process improvement suggestions

**🎯 Strategic Insights**
• Market opportunity analysis
• Competitive intelligence
• Growth strategy recommendations

What would you like me to analyze? I can dive into trends, detect anomalies, optimize your operations, or provide strategic insights. Just ask!`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-4 sm:p-6 pb-20 pt-24">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">🔮 AI Analytics Command Center</h1>
            <p className="text-white/70 text-sm sm:text-base">Where Data Meets Intelligence - Your Comprehensive Analysis Powerhouse</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
              <span className="text-blue-400 text-sm font-medium">AI Team Active</span>
            </div>
            <div className="text-2xl">🔮</div>
          </div>
        </div>
      </motion.div>

      {/* Navigation Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="flex flex-wrap gap-3 mb-8"
      >
        {[
          { key: 'overview', label: 'Analytics Overview', icon: BarChart3 },
          { key: 'team', label: 'AI Analysis Team', icon: Users },
          { key: 'insights', label: 'Live Insights', icon: Play },
          { key: 'journey', label: 'Analysis Journey', icon: Target },
          { key: 'optimization', label: 'Optimization Engine', icon: Zap },
          { key: 'chat', label: 'AI Chat', icon: MessageCircle }
        ].map(({ key, label, icon: Icon }) => (
          <motion.button
            key={key}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setActiveView(key)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              activeView === key
                ? 'bg-blue-500 text-white'
                : 'bg-white/10 text-white/70 hover:bg-white/20 hover:text-white'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </motion.button>
        ))}
      </motion.div>

      {/* Overview Section */}
      {activeView === 'overview' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-8"
        >
          {/* Key Metrics with AI Insights */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {keyMetrics.map((metric) => (
              <motion.div
                key={metric.id}
                whileHover={{ scale: 1.02 }}
                className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-4"
              >
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-white/70 text-sm">{metric.name}</p>
                    <p className="text-2xl font-bold text-white">{metric.value}</p>
                    <div className="flex items-center gap-1 mt-1">
                      {metric.changeType === 'increase' ? (
                        <TrendingUp className="w-4 h-4 text-green-400" />
                      ) : metric.changeType === 'decrease' ? (
                        <TrendingUp className="w-4 h-4 text-red-400 rotate-180" />
                      ) : (
                        <Activity className="w-4 h-4 text-gray-400" />
                      )}
                      <span className={`text-sm font-medium ${
                        metric.changeType === 'increase' ? 'text-green-400' : 
                        metric.changeType === 'decrease' ? 'text-red-400' : 'text-gray-400'
                      }`}>
                        {metric.change > 0 ? '+' : ''}{metric.change}%
                      </span>
                    </div>
                  </div>
                  <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
                    <BarChart3 className="w-6 h-6 text-blue-400" />
                  </div>
                </div>
                <div className="bg-white/5 rounded-lg p-3 mt-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Brain className="w-3 h-3 text-purple-400" />
                    <span className="text-xs font-medium text-purple-400">AI Insight</span>
                  </div>
                  <p className="text-xs text-white/70">{metric.aiInsight}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* AI Team Section */}
      {activeView === 'team' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-6"
        >
          <h3 className="text-xl font-semibold text-white mb-6">AI Analysis Team</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {aiAnalysts.map((analyst) => (
              <motion.div
                key={analyst.id}
                whileHover={{ scale: 1.02 }}
                className={`${analyst.bgColor} backdrop-blur-sm rounded-xl border ${analyst.borderColor} p-6`}
              >
                <div className="flex items-start gap-4">
                  <div className="text-4xl">{analyst.emoji}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="text-lg font-semibold text-white">{analyst.name}</h4>
                      <div className={`w-2 h-2 rounded-full ${
                        analyst.status === 'active' ? 'bg-green-400' :
                        analyst.status === 'working' ? 'bg-yellow-400' : 'bg-gray-400'
                      }`}></div>
                    </div>
                    <p className="text-blue-400 text-sm font-medium mb-1">{analyst.title}</p>
                    <p className="text-white/70 text-sm mb-3">{analyst.description}</p>
                    <div className="bg-white/10 rounded-lg p-3 mb-3">
                      <p className="text-xs text-white/80 mb-1">Superpower:</p>
                      <p className="text-sm text-white font-medium">{analyst.superpower}</p>
                    </div>
                    {analyst.currentTask && (
                      <div className="bg-white/5 rounded-lg p-2">
                        <p className="text-xs text-white/60 mb-1">Current Task:</p>
                        <p className="text-sm text-white">{analyst.currentTask}</p>
                      </div>
                    )}
                    <div className="flex items-center justify-between mt-3">
                      <span className="text-xs text-white/60">Performance</span>
                      <span className="text-sm font-medium text-white">{analyst.performance}%</span>
                    </div>
                    <div className="w-full bg-white/10 rounded-full h-1 mt-1">
                      <div 
                        className="bg-blue-400 h-1 rounded-full"
                        style={{ width: `${analyst.performance}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Chat Section */}
      {activeView === 'chat' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 overflow-hidden"
        >
          {/* Chat Header */}
          <div className="bg-white/10 px-4 py-3 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center">
                <MessageCircle className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">Crystal AI Chat</h3>
                <p className="text-white/60 text-xs">Your predictive analytics specialist</p>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="h-80 overflow-y-auto p-4 space-y-3">
            {messages.map((message, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[80%] rounded-lg px-3 py-2 ${
                  message.role === 'user'
                    ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white'
                    : 'bg-white/10 text-white border border-white/20'
                }`}>
                  <div className="text-sm whitespace-pre-wrap">{message.content}</div>
                  <div className="text-xs opacity-60 mt-1">
                    {new Date(message.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              </motion.div>
            ))}

            {isLoading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex justify-start"
              >
                <div className="bg-white/10 text-white border border-white/20 rounded-lg px-3 py-2">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span className="text-sm">Crystal is analyzing...</span>
                  </div>
                </div>
              </motion.div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-4 border-t border-white/10">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !isLoading && sendMessage(input)}
                placeholder="Ask Crystal about trends, anomalies, optimization..."
                className="flex-1 bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-white/50 focus:outline-none focus:border-blue-500 text-sm"
                disabled={isLoading}
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={isLoading || !input.trim()}
                className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg px-3 py-2 transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Other sections would go here - insights, journey, optimization */}
      {activeView !== 'overview' && activeView !== 'team' && activeView !== 'chat' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-8 text-center"
        >
          <div className="text-6xl mb-4">🔮</div>
          <h3 className="text-xl font-semibold text-white mb-2">
            {activeView === 'insights' && 'Live Insights Coming Soon'}
            {activeView === 'journey' && 'Analysis Journey Coming Soon'}
            {activeView === 'optimization' && 'Optimization Engine Coming Soon'}
          </h3>
          <p className="text-white/70">
            This section is being enhanced with advanced AI capabilities. Stay tuned!
          </p>
        </motion.div>
      )}
    </div>
  );
}
