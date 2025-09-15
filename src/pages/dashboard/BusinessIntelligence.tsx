import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  Brain, 
  BarChart3, 
  TrendingUp, 
  Send, 
  Target,
  Eye,
  DollarSign,
  MessageCircle
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

interface InteliaMessage {
  role: 'user' | 'intelia' | 'system';
  content: string;
  timestamp: string;
  metadata?: {
    processing_time_ms?: number;
    tokens_used?: number;
    model_used?: string;
  };
}

export default function BusinessIntelligence() {
  console.log('🚀🚀🚀 LOADING NEW 6-BOX GRID LAYOUT - Business Intelligence Dashboard!');
  const { user } = useAuth();
  const [messages, setMessages] = useState<InteliaMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize conversation and load Intelia's config
  useEffect(() => {
    const initializeIntelia = async () => {
      if (!user?.id) return;

      try {
        const config = await getEmployeeConfig('intelia');
        if (config) {
          console.log('Intelia config loaded:', config);
        }

        // Generate or get existing conversation ID
        const newConversationId = generateConversationId();
        setConversationId(newConversationId);

        // Load existing conversation if available
        const existingConversation = await getConversation(newConversationId, 'intelia', user.id);
        if (existingConversation && existingConversation.messages.length > 0) {
          const inteliaMessages = existingConversation.messages.map(msg => ({
            role: msg.role as 'user' | 'intelia' | 'system',
            content: msg.content,
            timestamp: msg.timestamp,
            metadata: msg.metadata
          }));
          setMessages(inteliaMessages);
        }
      } catch (error) {
        console.error('Error initializing Intelia:', error);
      }
    };

    initializeIntelia();
  }, [user?.id]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return;

    const userMessage: InteliaMessage = {
      role: 'user',
      content: content.trim(),
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Add user message to conversation
      await addMessageToConversation(conversationId, content.trim(), 'intelia', user?.id || 'anonymous');

      // Generate AI response
      const aiResponse = generateBusinessResponse(content.trim());
      
      const inteliaMessage: InteliaMessage = {
        role: 'intelia',
        content: aiResponse,
        timestamp: new Date().toISOString(),
        metadata: {
          processing_time_ms: Math.random() * 1000 + 500,
          tokens_used: Math.floor(Math.random() * 100) + 50,
          model_used: 'intelia-business-intelligence'
        }
      };

      setMessages(prev => [...prev, inteliaMessage]);

      // Add AI response to conversation
      await addMessageToConversation(conversationId, aiResponse, 'intelia', user?.id || 'anonymous');

      // Log interaction
      await logAIInteraction('intelia', user?.id || 'anonymous', 'chat', 'Business Intelligence chat interaction');

      // Increment conversation count
      await incrementConversationCount('intelia', user?.id || 'anonymous');

    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: InteliaMessage = {
        role: 'intelia',
        content: "I apologize, but I'm experiencing some technical difficulties. Please try again in a moment.",
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const generateBusinessResponse = (query: string): string => {
    const lowerQuery = query.toLowerCase();

    if (lowerQuery.includes('analytics') || lowerQuery.includes('data') || lowerQuery.includes('insights')) {
      return `📊 Excellent! Let me help you unlock powerful business insights from your data:

**Key Analytics Areas:**
• **Revenue Analysis** - Track income trends, seasonal patterns, and growth metrics
• **Expense Optimization** - Identify cost-saving opportunities and budget variances
• **Customer Insights** - Analyze customer behavior, lifetime value, and retention
• **Operational Efficiency** - Monitor productivity, resource utilization, and bottlenecks
• **Market Trends** - Track industry benchmarks and competitive positioning
• **Financial Health** - Cash flow analysis, profitability ratios, and risk assessment

**Advanced Analytics Features:**
• **Predictive Modeling** - Forecast future trends and outcomes
• **Cohort Analysis** - Track customer groups over time
• **Funnel Analysis** - Optimize conversion rates and user journeys
• **A/B Testing** - Data-driven decision making for improvements
• **Real-time Dashboards** - Live monitoring of key performance indicators

**Pro Tips:**
• **Set Clear KPIs** - Define what success looks like for your business
• **Regular Reviews** - Schedule weekly/monthly data analysis sessions
• **Actionable Insights** - Focus on data that drives business decisions
• **Data Quality** - Ensure accurate, complete, and timely data collection

What specific aspect of business analytics would you like to explore?`;
    }

    if (lowerQuery.includes('strategy') || lowerQuery.includes('planning') || lowerQuery.includes('growth')) {
      return `🎯 Perfect! Let's develop a comprehensive business strategy to drive growth and success:

**Strategic Planning Framework:**
• **SWOT Analysis** - Strengths, Weaknesses, Opportunities, Threats
• **Market Research** - Industry trends, competitor analysis, customer needs
• **Goal Setting** - SMART objectives aligned with business vision
• **Resource Planning** - Budget, personnel, technology, and timeline allocation
• **Risk Assessment** - Identify potential challenges and mitigation strategies
• **Performance Metrics** - KPIs to track progress and success

**Growth Strategies:**
• **Market Expansion** - New geographic markets or customer segments
• **Product Development** - Innovation and diversification opportunities
• **Partnerships** - Strategic alliances and collaboration opportunities
• **Digital Transformation** - Technology adoption and process optimization
• **Customer Acquisition** - Marketing and sales strategy enhancement
• **Operational Excellence** - Efficiency improvements and cost reduction

**Implementation Roadmap:**
• **Phase 1** - Foundation building and quick wins (0-3 months)
• **Phase 2** - Core initiatives and capability development (3-12 months)
• **Phase 3** - Scale and optimization (12+ months)

**Pro Tips:**
• **Start Small** - Focus on high-impact, low-effort initiatives first
• **Measure Everything** - Track progress against defined metrics
• **Stay Flexible** - Adapt strategy based on market feedback and results
• **Team Alignment** - Ensure everyone understands and supports the strategy

What specific area of business strategy would you like to focus on?`;
    }

    if (lowerQuery.includes('performance') || lowerQuery.includes('kpi') || lowerQuery.includes('metrics')) {
      return `📈 Great! Let's establish a robust performance measurement system for your business:

**Essential KPIs by Category:**

**Financial Performance:**
• **Revenue Growth Rate** - Month-over-month and year-over-year growth
• **Gross Profit Margin** - Profitability after direct costs
• **Net Profit Margin** - Bottom-line profitability
• **Cash Flow** - Operating, investing, and financing cash flows
• **Return on Investment (ROI)** - Efficiency of capital utilization
• **Customer Acquisition Cost (CAC)** - Cost to acquire new customers

**Operational Performance:**
• **Customer Lifetime Value (CLV)** - Long-term customer value
• **Churn Rate** - Customer retention and loss
• **Inventory Turnover** - Asset utilization efficiency
• **Employee Productivity** - Revenue per employee
• **Project Completion Rate** - Delivery success metrics
• **Quality Metrics** - Defect rates, customer satisfaction scores

**Marketing Performance:**
• **Conversion Rate** - Lead to customer conversion
• **Cost Per Lead (CPL)** - Marketing efficiency
• **Website Traffic** - Digital presence and engagement
• **Social Media Engagement** - Brand awareness and reach
• **Email Open/Click Rates** - Communication effectiveness
• **Brand Awareness** - Market recognition and recall

**Pro Tips:**
• **Focus on Leading Indicators** - Metrics that predict future performance
• **Regular Monitoring** - Weekly/monthly KPI reviews
• **Benchmark Against Industry** - Compare with competitors and standards
• **Actionable Insights** - Use data to drive business decisions

What specific performance metrics are you most interested in tracking?`;
    }

    // Default response
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
              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center">
                <MessageCircle className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">Intelia AI Chat</h3>
                <p className="text-white/60 text-xs">Your intelligent business analyst</p>
              </div>
            </div>
          </div>

          {/* 6-Box Grid Inside Chat */}
          <div className="p-4 border-b border-white/10">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-2 mb-4">
              {/* Box 1: Data Analytics */}
              <motion.button
                onClick={() => console.log('Data Analytics clicked')}
                className="group flex flex-col items-center gap-3 p-4 bg-white/5 hover:bg-white/10 rounded-xl text-center transition-all duration-300 border border-white/10 hover:border-white/20 min-h-[120px] hover:shadow-lg hover:shadow-purple-500/10"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
              >
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <BarChart3 className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-white mb-1">Data Analytics</h3>
                  <p className="text-white/60 text-xs leading-tight">Insights & trends</p>
                </div>
              </motion.button>

              {/* Box 2: Strategic Planning */}
              <motion.button
                onClick={() => console.log('Strategic Planning clicked')}
                className="group flex flex-col items-center gap-3 p-4 bg-white/5 hover:bg-white/10 rounded-xl text-center transition-all duration-300 border border-white/10 hover:border-white/20 min-h-[120px] hover:shadow-lg hover:shadow-purple-500/10"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Target className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-white mb-1">Strategic Planning</h3>
                  <p className="text-white/60 text-xs leading-tight">Growth strategy</p>
                </div>
              </motion.button>

              {/* Box 3: Performance Metrics */}
              <motion.button
                onClick={() => console.log('Performance Metrics clicked')}
                className="group flex flex-col items-center gap-3 p-4 bg-white/5 hover:bg-white/10 rounded-xl text-center transition-all duration-300 border border-white/10 hover:border-white/20 min-h-[120px] hover:shadow-lg hover:shadow-purple-500/10"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-white mb-1">Performance</h3>
                  <p className="text-white/60 text-xs leading-tight">KPIs & metrics</p>
                </div>
              </motion.button>

              {/* Box 4: Market Research */}
              <motion.button
                onClick={() => console.log('Market Research clicked')}
                className="group flex flex-col items-center gap-3 p-4 bg-white/5 hover:bg-white/10 rounded-xl text-center transition-all duration-300 border border-white/10 hover:border-white/20 min-h-[120px] hover:shadow-lg hover:shadow-purple-500/10"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
              >
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Eye className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-white mb-1">Market Research</h3>
                  <p className="text-white/60 text-xs leading-tight">Industry insights</p>
                </div>
              </motion.button>

              {/* Box 5: Financial Analysis */}
              <motion.button
                onClick={() => console.log('Financial Analysis clicked')}
                className="group flex flex-col items-center gap-3 p-4 bg-white/5 hover:bg-white/10 rounded-xl text-center transition-all duration-300 border border-white/10 hover:border-white/20 min-h-[120px] hover:shadow-lg hover:shadow-purple-500/10"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.5 }}
              >
                <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <DollarSign className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-white mb-1">Financial Analysis</h3>
                  <p className="text-white/60 text-xs leading-tight">Revenue & costs</p>
                </div>
              </motion.button>

              {/* Box 6: Chat with AI */}
              <motion.button
                onClick={() => console.log('Chat with AI clicked')}
                className="group flex flex-col items-center gap-3 p-4 bg-white/5 hover:bg-white/10 rounded-xl text-center transition-all duration-300 border border-white/10 hover:border-white/20 min-h-[120px] hover:shadow-lg hover:shadow-purple-500/10"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.6 }}
              >
                <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <MessageCircle className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-white mb-1">Chat with AI</h3>
                  <p className="text-white/60 text-xs leading-tight">Ask questions</p>
                </div>
              </motion.button>
            </div>
          </div>

          {/* Messages Area - Empty for now */}
          <div className="h-80 overflow-y-auto p-4">
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Brain className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Ready to Analyze!</h3>
                <p className="text-white/60 text-sm">Click on any card above or type a message below to get started</p>
              </div>
            </div>
          </div>

          {/* Input Area */}
          <div className="p-4 border-t border-white/10">
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
    </div>
  );
}
