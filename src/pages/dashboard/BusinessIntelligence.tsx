import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  Brain, 
  BarChart3, 
  TrendingUp, 
  Send, 
  Loader2,
  Target,
  PieChart,
  LineChart,
  Activity,
  Eye,
  Lightbulb,
  Zap,
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign,
  Users,
  ShoppingCart,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import DashboardHeader from '../../components/ui/DashboardHeader';
import { useAuth } from '../../contexts/AuthContext';
import {
  getEmployeeConfig,
  getConversation,
  saveConversation,
  addMessageToConversation,
  incrementConversationCount,
  logAIInteraction,
  generateConversationId,
  createSystemMessage,
  createUserMessage,
  createAssistantMessage
} from '../../lib/ai-employees';
import { AIConversationMessage } from '../../types/ai-employees.types';

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
  const { user } = useAuth();
  const [messages, setMessages] = useState<InteliaMessage[]>([
    {
      role: 'intelia',
      content: "Hello! I'm 🧠 Intelia, your Business Intelligence AI! I help you analyze business performance, track KPIs, and gain strategic insights from your financial data. I can help you understand trends, identify opportunities, optimize operations, and make data-driven decisions. What business intelligence insights would you like to explore today?",
      timestamp: new Date().toISOString()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState('');
  const [inteliaConfig, setInteliaConfig] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize conversation and load Intelia's config
  useEffect(() => {
    const initializeIntelia = async () => {
      if (!user?.id) return;

      const newConversationId = generateConversationId();
      setConversationId(newConversationId);

      // Load Intelia's configuration
      const config = await getEmployeeConfig('intelia');
      setInteliaConfig(config);

      // Load existing conversation if any
      const existingConversation = await getConversation(user.id, 'intelia', newConversationId);
      if (existingConversation && existingConversation.messages.length > 0) {
        setMessages(existingConversation.messages as InteliaMessage[]);
      }
    };

    initializeIntelia();
  }, [user?.id]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (content: string) => {
    if (!content.trim() || !user?.id || isLoading) return;

    const userMessage: InteliaMessage = {
      role: 'user',
      content: content.trim(),
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Save user message to conversation
      await addMessageToConversation(user.id, 'intelia', conversationId, userMessage as AIConversationMessage);

      // Log the interaction
      await logAIInteraction(user.id, 'intelia', 'chat', content);

      // Simulate AI response (in real implementation, this would call OpenAI)
      const startTime = Date.now();

      // Create Intelia's response based on the user's query
      const inteliaResponse = await generateInteliaResponse(content);

      const processingTime = Date.now() - startTime;

      const inteliaMessage: InteliaMessage = {
        role: 'intelia',
        content: inteliaResponse,
        timestamp: new Date().toISOString(),
        metadata: {
          processing_time_ms: processingTime,
          model_used: 'gpt-4'
        }
      };

      setMessages(prev => [...prev, inteliaMessage]);

      // Save Intelia's response to conversation
      await addMessageToConversation(user.id, 'intelia', conversationId, inteliaMessage as AIConversationMessage);

      // Increment conversation count
      await incrementConversationCount(user.id, 'intelia');

    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: InteliaMessage = {
        role: 'intelia',
        content: "I'm having trouble processing your request right now. Please try again in a moment.",
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const generateInteliaResponse = async (userQuery: string): Promise<string> => {
    // Simulate AI processing delay
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));

    const query = userQuery.toLowerCase();

    // Intelia's specialized responses for business intelligence queries
    if (query.includes('kpi') || query.includes('metric') || query.includes('performance') || query.includes('track')) {
      return `📊 Excellent! Let's talk about Key Performance Indicators (KPIs) and business metrics tracking. Here's my approach to measuring and optimizing business performance:

**Essential Business KPIs:**

**1. Financial KPIs:**
• **Revenue Growth Rate** - Month-over-month and year-over-year growth
• **Profit Margins** - Gross, operating, and net profit margins
• **Cash Flow** - Operating cash flow and cash conversion cycle
• **Customer Acquisition Cost (CAC)** - Cost to acquire new customers
• **Customer Lifetime Value (CLV)** - Total value of a customer over time
• **Return on Investment (ROI)** - Return on marketing and operational investments

**2. Operational KPIs:**
• **Inventory Turnover** - How quickly inventory is sold and replaced
• **Order Fulfillment Rate** - Percentage of orders delivered on time
• **Customer Satisfaction Score** - Net Promoter Score (NPS) and reviews
• **Employee Productivity** - Revenue per employee and efficiency metrics
• **Process Efficiency** - Time to complete key business processes

**3. Marketing KPIs:**
• **Conversion Rate** - Website visitors to customers
• **Customer Acquisition Rate** - New customers per month
• **Marketing ROI** - Return on marketing spend
• **Customer Retention Rate** - Percentage of customers who stay
• **Brand Awareness** - Social media engagement and reach

**4. Sales KPIs:**
• **Sales Growth** - Monthly and quarterly sales increases
• **Average Deal Size** - Revenue per transaction
• **Sales Cycle Length** - Time from lead to close
• **Win Rate** - Percentage of deals won
• **Sales Pipeline Value** - Total value of opportunities

**KPI Tracking Best Practices:**
• **Set SMART Goals** - Specific, Measurable, Achievable, Relevant, Time-bound
• **Choose Leading Indicators** - Metrics that predict future performance
• **Track Trends** - Monitor changes over time, not just current values
• **Set Benchmarks** - Compare against industry standards and competitors
• **Create Dashboards** - Visualize KPIs for easy monitoring
• **Review Regularly** - Weekly, monthly, and quarterly KPI reviews

**Pro Tips:**
• **Focus on actionable metrics** - KPIs that drive decision-making
• **Avoid vanity metrics** - Numbers that look good but don't impact business
• **Use relative metrics** - Percentages and ratios over absolute numbers
• **Segment your data** - Break down KPIs by customer type, product, region
• **Automate tracking** - Use tools to collect and report KPIs automatically

What specific KPIs would you like to track for your business?`;
    }

    if (query.includes('trend') || query.includes('analysis') || query.includes('pattern') || query.includes('insight')) {
      return `📈 Fantastic! Let's dive into trend analysis and pattern recognition to uncover valuable business insights. Here's my approach to data analysis:

**Business Trend Analysis Framework:**

**1. Revenue Trends:**
• **Seasonal Patterns** - Identify peak and slow periods throughout the year
• **Growth Trajectories** - Linear, exponential, or cyclical growth patterns
• **Product Performance** - Which products/services drive the most revenue
• **Customer Segments** - High-value vs. low-value customer trends
• **Geographic Trends** - Regional performance variations

**2. Customer Behavior Trends:**
• **Purchase Frequency** - How often customers buy from you
• **Average Order Value** - Changes in customer spending patterns
• **Customer Journey** - Path from awareness to purchase to retention
• **Churn Patterns** - When and why customers leave
• **Engagement Trends** - Website visits, email opens, social media interaction

**3. Operational Trends:**
• **Efficiency Metrics** - Time and cost trends for key processes
• **Quality Metrics** - Error rates, returns, customer complaints
• **Inventory Patterns** - Stock levels, turnover rates, seasonal demand
• **Employee Performance** - Productivity trends and skill development
• **Technology Adoption** - How new tools impact performance

**4. Market Trends:**
• **Competitive Analysis** - How your performance compares to competitors
• **Industry Benchmarks** - Your position relative to industry standards
• **Economic Factors** - Impact of economic conditions on your business
• **Technology Trends** - How new technologies affect your industry
• **Regulatory Changes** - Impact of new laws and regulations

**Pattern Recognition Techniques:**
• **Time Series Analysis** - Identify trends, seasonality, and cycles
• **Correlation Analysis** - Find relationships between different metrics
• **Segmentation Analysis** - Group customers by behavior patterns
• **Predictive Modeling** - Forecast future performance based on historical data
• **Anomaly Detection** - Identify unusual patterns that need attention

**Insight Generation Process:**
1. **Data Collection** - Gather comprehensive data from all sources
2. **Data Cleaning** - Remove errors and inconsistencies
3. **Exploratory Analysis** - Look for patterns and relationships
4. **Hypothesis Testing** - Test assumptions about what drives performance
5. **Action Planning** - Develop strategies based on insights
6. **Implementation** - Put insights into action
7. **Monitoring** - Track the impact of changes

**Pro Tips:**
• **Look for leading indicators** - Metrics that predict future performance
• **Consider multiple timeframes** - Daily, weekly, monthly, quarterly, yearly
• **Segment your analysis** - Break down trends by customer type, product, region
• **Validate your insights** - Test assumptions with additional data
• **Focus on actionable insights** - Information that drives decision-making

What specific trends or patterns would you like to analyze?`;
    }

    if (query.includes('optimize') || query.includes('improve') || query.includes('efficiency') || query.includes('performance')) {
      return `🚀 Excellent! Let's optimize your business performance and improve efficiency. Here's my strategic approach to business optimization:

**Business Performance Optimization Framework:**

**1. Revenue Optimization:**
• **Pricing Strategy** - Optimize pricing based on value and competition
• **Product Mix** - Focus on high-margin, high-demand products
• **Customer Segmentation** - Target high-value customer segments
• **Sales Process** - Streamline sales cycle and improve conversion rates
• **Upselling/Cross-selling** - Increase average order value

**2. Cost Optimization:**
• **Operational Efficiency** - Reduce waste and improve productivity
• **Supplier Management** - Negotiate better terms and find cost-effective suppliers
• **Inventory Management** - Optimize stock levels to reduce carrying costs
• **Technology Investment** - Automate processes to reduce labor costs
• **Energy and Utilities** - Reduce overhead costs through efficiency

**3. Customer Experience Optimization:**
• **Customer Journey Mapping** - Identify and fix pain points
• **Service Quality** - Improve customer satisfaction and retention
• **Response Times** - Speed up customer service and order fulfillment
• **Personalization** - Tailor experiences to individual customer preferences
• **Feedback Loops** - Continuously improve based on customer input

**4. Operational Optimization:**
• **Process Automation** - Automate repetitive tasks and workflows
• **Quality Control** - Reduce errors and improve consistency
• **Supply Chain** - Optimize logistics and reduce delivery times
• **Employee Training** - Improve skills and productivity
• **Technology Stack** - Use the right tools for maximum efficiency

**5. Marketing Optimization:**
• **Channel Performance** - Focus on high-ROI marketing channels
• **Content Strategy** - Create content that drives engagement and conversions
• **Customer Acquisition** - Reduce cost per acquisition
• **Retention Strategies** - Keep customers longer and increase lifetime value
• **Brand Positioning** - Differentiate from competitors

**Performance Improvement Process:**
1. **Baseline Assessment** - Measure current performance across all areas
2. **Gap Analysis** - Identify areas for improvement
3. **Priority Setting** - Focus on high-impact, low-effort improvements
4. **Implementation** - Execute improvement strategies
5. **Monitoring** - Track progress and measure results
6. **Iteration** - Continuously refine and improve

**Key Performance Indicators for Optimization:**
• **Revenue per employee** - Measure productivity and efficiency
• **Customer acquisition cost** - Track marketing efficiency
• **Customer lifetime value** - Measure long-term customer value
• **Inventory turnover** - Monitor operational efficiency
• **Profit margins** - Track overall business health

**Pro Tips:**
• **Start with quick wins** - Implement easy improvements first
• **Focus on bottlenecks** - Address the biggest constraints to growth
• **Measure everything** - Track the impact of all changes
• **Test and iterate** - Try different approaches and optimize based on results
• **Involve your team** - Get input from employees who know the processes

What specific area of your business would you like to optimize?`;
    }

    if (query.includes('report') || query.includes('dashboard') || query.includes('visualize') || query.includes('chart')) {
      return `📊 Perfect! Let's create powerful business reports and dashboards to visualize your data and track performance. Here's my approach to business reporting:

**Business Intelligence Dashboard Framework:**

**1. Executive Dashboard:**
• **Revenue Overview** - Monthly, quarterly, and yearly revenue trends
• **Profitability Metrics** - Gross margin, operating margin, net profit
• **Key Performance Indicators** - Top 10 most important business metrics
• **Cash Flow Status** - Current cash position and projections
• **Growth Metrics** - Customer growth, revenue growth, market share

**2. Sales Dashboard:**
• **Sales Performance** - Daily, weekly, monthly sales trends
• **Pipeline Analysis** - Sales funnel and conversion rates
• **Product Performance** - Top-selling products and categories
• **Sales Team Metrics** - Individual and team performance
• **Geographic Performance** - Sales by region and territory

**3. Marketing Dashboard:**
• **Campaign Performance** - ROI, conversion rates, cost per acquisition
• **Channel Analysis** - Performance by marketing channel
• **Customer Acquisition** - New customer trends and sources
• **Brand Metrics** - Social media engagement, website traffic
• **Content Performance** - Most effective content and messaging

**4. Operations Dashboard:**
• **Efficiency Metrics** - Process times, error rates, productivity
• **Inventory Status** - Stock levels, turnover rates, reorder points
• **Quality Control** - Defect rates, customer satisfaction scores
• **Resource Utilization** - Employee productivity, equipment usage
• **Cost Analysis** - Operational costs and efficiency trends

**5. Customer Dashboard:**
• **Customer Health** - Satisfaction scores, retention rates, churn
• **Customer Journey** - Touchpoints and conversion rates
• **Customer Segmentation** - Performance by customer type
• **Support Metrics** - Response times, resolution rates, satisfaction
• **Lifetime Value** - Customer value trends and predictions

**Visualization Best Practices:**
• **Choose the right chart type** - Bar charts for comparisons, line charts for trends
• **Use consistent colors** - Color-code by category or performance level
• **Include context** - Add benchmarks, targets, and historical data
• **Make it interactive** - Allow users to drill down and explore data
• **Keep it simple** - Focus on the most important information
• **Update regularly** - Ensure data is current and relevant

**Report Types:**
• **Real-time Dashboards** - Live data for immediate decision-making
• **Daily Reports** - Key metrics updated every day
• **Weekly Reports** - Detailed analysis and trends
• **Monthly Reports** - Comprehensive business review
• **Quarterly Reports** - Strategic analysis and planning
• **Annual Reports** - Year-end performance and planning

**Pro Tips:**
• **Start with the basics** - Focus on the most important metrics first
• **Make it actionable** - Include insights and recommendations
• **Automate reporting** - Set up automatic report generation and distribution
• **Customize for users** - Different dashboards for different roles
• **Include alerts** - Notifications for important changes or issues
• **Regular reviews** - Update dashboards based on user feedback

What specific reports or dashboards would you like to create?`;
    }

    if (query.includes('strategy') || query.includes('plan') || query.includes('decision') || query.includes('insight')) {
      return `🧠 Excellent! Let's develop strategic insights and data-driven decision-making frameworks. Here's my approach to strategic business intelligence:

**Strategic Business Intelligence Framework:**

**1. Market Intelligence:**
• **Competitive Analysis** - Monitor competitor performance and strategies
• **Market Trends** - Identify emerging opportunities and threats
• **Customer Insights** - Understand customer needs and preferences
• **Industry Benchmarks** - Compare performance to industry standards
• **Economic Indicators** - Monitor factors affecting your business

**2. Customer Intelligence:**
• **Customer Segmentation** - Group customers by behavior and value
• **Customer Journey Mapping** - Understand the path to purchase
• **Predictive Analytics** - Forecast customer behavior and needs
• **Churn Analysis** - Identify why customers leave and how to retain them
• **Lifetime Value Modeling** - Predict long-term customer value

**3. Product Intelligence:**
• **Product Performance** - Which products drive the most value
• **Feature Analysis** - What features customers use most
• **Pricing Optimization** - Optimal pricing based on value and competition
• **Product Roadmap** - Data-driven product development priorities
• **Inventory Optimization** - Stock levels based on demand patterns

**4. Operational Intelligence:**
• **Process Optimization** - Identify bottlenecks and inefficiencies
• **Resource Allocation** - Optimize staffing and equipment usage
• **Quality Management** - Monitor and improve product/service quality
• **Supply Chain Intelligence** - Optimize suppliers and logistics
• **Risk Management** - Identify and mitigate operational risks

**5. Financial Intelligence:**
• **Profitability Analysis** - Understand what drives profits
• **Cash Flow Forecasting** - Predict future cash needs
• **Investment ROI** - Measure return on marketing and operational investments
• **Cost Structure Analysis** - Identify cost drivers and optimization opportunities
• **Financial Risk Assessment** - Monitor financial health and stability

**Strategic Decision-Making Process:**
1. **Data Collection** - Gather relevant data from all sources
2. **Analysis** - Apply analytical techniques to understand patterns
3. **Insight Generation** - Identify key insights and opportunities
4. **Strategy Development** - Create actionable strategies
5. **Implementation Planning** - Develop execution plans
6. **Monitoring** - Track progress and adjust strategies
7. **Evaluation** - Measure results and learn from outcomes

**Key Strategic Questions:**
• **Where are we now?** - Current performance and market position
• **Where do we want to go?** - Strategic goals and objectives
• **How do we get there?** - Strategies and tactics
• **What could go wrong?** - Risks and mitigation strategies
• **How do we measure success?** - KPIs and success metrics

**Pro Tips:**
• **Focus on actionable insights** - Information that drives decisions
• **Consider multiple scenarios** - Plan for different possible futures
• **Involve stakeholders** - Get input from all relevant parties
• **Regular reviews** - Update strategies based on new data
• **Learn from failures** - Use setbacks as learning opportunities
• **Stay agile** - Be ready to adjust strategies quickly

What specific strategic insights would you like to explore?`;
    }

    if (query.includes('help') || query.includes('advice') || query.includes('guidance') || query.includes('support')) {
      return `🧠 I'm here to help you unlock the power of business intelligence and make data-driven decisions! Here's how I can support your business intelligence journey:

**My Business Intelligence Expertise:**
📊 **KPI Tracking** - Monitor and optimize key performance indicators
📈 **Trend Analysis** - Identify patterns and predict future performance
🚀 **Performance Optimization** - Improve efficiency and profitability
📋 **Reporting & Dashboards** - Create powerful visualizations and reports
🧠 **Strategic Insights** - Develop data-driven strategies and decisions
🔍 **Data Analysis** - Uncover hidden patterns and opportunities
📊 **Market Intelligence** - Understand competitors and market trends
🎯 **Predictive Analytics** - Forecast future performance and trends

**How I Can Help:**
• Create comprehensive KPI tracking systems
• Analyze business trends and patterns
• Optimize performance across all business areas
• Design powerful dashboards and reports
• Develop strategic insights and recommendations
• Conduct competitive and market analysis
• Build predictive models for forecasting
• Identify optimization opportunities

**My Approach:**
I believe every business decision should be backed by data and insights. I help you transform raw data into actionable intelligence that drives growth and profitability.

**My Promise:**
I'll help you build a comprehensive business intelligence system that gives you the insights you need to make better decisions, optimize performance, and achieve your business goals.

**Pro Tip:** The best business intelligence doesn't just tell you what happened—it tells you what to do next!

What specific aspect of business intelligence would you like to explore?`;
    }

    // Default response for other queries
    return `🧠 I understand you're asking about "${userQuery}". As your Business Intelligence AI, I'm here to help with:

**Business Intelligence Topics I Cover:**
• KPI tracking and performance monitoring
• Trend analysis and pattern recognition
• Business performance optimization
• Strategic insights and decision-making
• Data visualization and reporting
• Market intelligence and competitive analysis
• Predictive analytics and forecasting
• Operational efficiency analysis

**My Business Intelligence Philosophy:**
Data is only valuable when it leads to insights, and insights are only valuable when they lead to action. I help you transform data into strategic intelligence that drives business growth.

**My Promise:**
I'll help you build a comprehensive business intelligence system that gives you the insights you need to make better decisions, optimize performance, and achieve your business goals.

Could you tell me more specifically what business intelligence topic you'd like to discuss? I'm ready to help you unlock the power of your data!`;
  };

  const quickActions = [
    { icon: BarChart3, text: "Track KPIs", action: () => sendMessage("I want to track key performance indicators") },
    { icon: TrendingUp, text: "Analyze Trends", action: () => sendMessage("I want to analyze business trends") },
    { icon: Target, text: "Optimize Performance", action: () => sendMessage("I want to optimize business performance") },
    { icon: PieChart, text: "Create Reports", action: () => sendMessage("I want to create business reports and dashboards") },
    { icon: Brain, text: "Strategic Insights", action: () => sendMessage("I want strategic business insights") },
    { icon: Activity, text: "Data Analysis", action: () => sendMessage("I want to analyze business data") }
  ];

  const businessInsights = [
    {
      icon: TrendingUp,
      title: "Revenue Growth",
      value: "+23.5%",
      change: "+5.2%",
      trend: "up",
      description: "Year-over-year growth"
    },
    {
      icon: Users,
      title: "Customer Acquisition",
      value: "1,247",
      change: "+12.3%",
      trend: "up",
      description: "New customers this month"
    },
    {
      icon: DollarSign,
      title: "Average Order Value",
      value: "$156",
      change: "+8.7%",
      trend: "up",
      description: "Per transaction"
    },
    {
      icon: ShoppingCart,
      title: "Conversion Rate",
      value: "3.2%",
      change: "-0.5%",
      trend: "down",
      description: "Website visitors to customers"
    }
  ];

  const inteliaTips = [
    {
      icon: Eye,
      title: "Focus on Actionable Metrics",
      description: "Track KPIs that drive decisions"
    },
    {
      icon: Lightbulb,
      title: "Look for Patterns",
      description: "Identify trends and correlations"
    },
    {
      icon: Zap,
      title: "Automate Reporting",
      description: "Set up automatic data collection"
    },
    {
      icon: AlertTriangle,
      title: "Monitor Anomalies",
      description: "Watch for unusual patterns"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <DashboardHeader />

      <div className="max-w-7xl mx-auto p-6">
        {/* Intelia Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center gap-3 bg-white/10 backdrop-blur-md rounded-2xl px-6 py-4 border border-white/20">
            <div className="text-3xl">🧠</div>
            <div>
              <h1 className="text-2xl font-bold text-white">Intelia</h1>
              <p className="text-white/70 text-sm">Business Intelligence AI</p>
            </div>
            <div className="flex items-center gap-2 ml-4">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-green-400 text-sm">AI Active</span>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Chat Interface */}
          <div className="lg:col-span-2">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 overflow-hidden"
            >
              {/* Chat Header */}
              <div className="bg-white/10 px-6 py-4 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="text-xl">🧠</div>
                  <div>
                    <h2 className="font-semibold text-white">Chat with Intelia</h2>
                    <p className="text-white/60 text-sm">Business Intelligence Specialist</p>
                  </div>
                </div>
              </div>

              {/* Messages */}
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
                        ? 'bg-purple-600 text-white'
                        : 'bg-white/10 text-white border border-white/20'
                    }`}>
                      <div className="whitespace-pre-wrap">{message.content}</div>
                      <div className="text-xs opacity-60 mt-2">
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
                    <div className="bg-white/10 text-white border border-white/20 rounded-2xl px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Intelia is analyzing...</span>
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
                    placeholder="Ask Intelia about KPIs, trends, optimization, reports, or strategic insights..."
                    className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:border-purple-500"
                    disabled={isLoading}
                  />
                  <button
                    onClick={() => sendMessage(input)}
                    disabled={isLoading || !input.trim()}
                    className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl px-4 py-3 transition-colors"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-6"
            >
              <h3 className="text-lg font-semibold text-white mb-4">Business Intelligence Actions</h3>
              <div className="grid grid-cols-1 gap-3">
                {quickActions.map((action, index) => (
                  <button
                    key={index}
                    onClick={action.action}
                    className="w-full flex items-center gap-3 p-3 bg-white/10 hover:bg-white/15 border border-white/20 rounded-xl text-white transition-colors"
                  >
                    <action.icon className="w-5 h-5" />
                    <span className="text-sm">{action.text}</span>
                  </button>
                ))}
              </div>
            </motion.div>

            {/* Business Insights */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-6"
            >
              <h3 className="text-lg font-semibold text-white mb-4">Key Business Insights</h3>
              <div className="space-y-4">
                {businessInsights.map((insight, index) => (
                  <div key={index} className="p-3 bg-white/10 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <insight.icon className="w-4 h-4 text-purple-400" />
                        <span className="text-white text-sm font-medium">{insight.title}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        {insight.trend === 'up' ? (
                          <ArrowUpRight className="w-4 h-4 text-green-400" />
                        ) : (
                          <ArrowDownRight className="w-4 h-4 text-red-400" />
                        )}
                        <span className={`text-xs ${insight.trend === 'up' ? 'text-green-400' : 'text-red-400'}`}>
                          {insight.change}
                        </span>
                      </div>
                    </div>
                    <div className="text-white text-lg font-bold">{insight.value}</div>
                    <div className="text-white/60 text-xs">{insight.description}</div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Intelia's Tips */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-6"
            >
              <h3 className="text-lg font-semibold text-white mb-4">Intelia's Tips</h3>
              <div className="space-y-3">
                {inteliaTips.map((tip, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 bg-white/10 rounded-lg">
                    <tip.icon className="w-5 h-5 text-purple-400 mt-0.5" />
                    <div>
                      <div className="text-white text-sm font-medium">{tip.title}</div>
                      <div className="text-white/60 text-xs">{tip.description}</div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Intelia's Stats */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-6"
            >
              <h3 className="text-lg font-semibold text-white mb-4">Intelia's Stats</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-white/70">Insights Generated</span>
                  <span className="text-purple-400">2,847</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/70">KPIs Tracked</span>
                  <span className="text-green-400">156</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/70">Accuracy Rate</span>
                  <span className="text-blue-400">96.8%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/70">Reports Created</span>
                  <span className="text-yellow-400">892</span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
} 