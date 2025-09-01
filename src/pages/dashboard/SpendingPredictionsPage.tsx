import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  BarChart3, 
  Calendar, 
  AlertTriangle, 
  Bot, 
  Send, 
  Loader2,
  Eye,
  TrendingDown,
  DollarSign,
  Clock,
  Target,
  PieChart,
  LineChart,
  Activity
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

interface CrystalMessage {
  role: 'user' | 'crystal' | 'system';
  content: string;
  timestamp: string;
  metadata?: {
    processing_time_ms?: number;
    tokens_used?: number;
    model_used?: string;
  };
}

export default function SpendingPredictionsPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<CrystalMessage[]>([
    {
      role: 'crystal',
      content: "Hi! I'm 🔮 Crystal, your Spending Predictions AI! I analyze your spending patterns and provide forecasts to help you understand trends and make informed financial decisions. I can predict future expenses, identify spending patterns, and help you spot potential budget issues before they happen. What would you like to know about your spending predictions?",
      timestamp: new Date().toISOString()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState('');
  const [crystalConfig, setCrystalConfig] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize conversation and load Crystal's config
  useEffect(() => {
    const initializeCrystal = async () => {
      if (!user?.id) return;

      const newConversationId = generateConversationId();
      setConversationId(newConversationId);

      // Load Crystal's configuration
      const config = await getEmployeeConfig('crystal');
      setCrystalConfig(config);

      // Load existing conversation if any
      const existingConversation = await getConversation(user.id, 'crystal', newConversationId);
      if (existingConversation && existingConversation.messages.length > 0) {
        setMessages(existingConversation.messages as CrystalMessage[]);
      }
    };

    initializeCrystal();
  }, [user?.id]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (content: string) => {
    if (!content.trim() || !user?.id || isLoading) return;

    const userMessage: CrystalMessage = {
      role: 'user',
      content: content.trim(),
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Save user message to conversation
      await addMessageToConversation(user.id, 'crystal', conversationId, userMessage as AIConversationMessage);

      // Log the interaction
      await logAIInteraction(user.id, 'crystal', 'chat', content);

      // Simulate AI response (in real implementation, this would call OpenAI)
      const startTime = Date.now();

      // Create Crystal's response based on the user's query
      const crystalResponse = await generateCrystalResponse(content);

      const processingTime = Date.now() - startTime;

      const crystalMessage: CrystalMessage = {
        role: 'crystal',
        content: crystalResponse,
        timestamp: new Date().toISOString(),
        metadata: {
          processing_time_ms: processingTime,
          model_used: 'gpt-3.5-turbo'
        }
      };

      setMessages(prev => [...prev, crystalMessage]);

      // Save Crystal's response to conversation
      await addMessageToConversation(user.id, 'crystal', conversationId, crystalMessage as AIConversationMessage);

      // Increment conversation count
      await incrementConversationCount(user.id, 'crystal');

    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: CrystalMessage = {
        role: 'crystal',
        content: "I'm having trouble processing your request right now. Please try again in a moment.",
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const generateCrystalResponse = async (userQuery: string): Promise<string> => {
    // Simulate AI processing delay
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));

    const query = userQuery.toLowerCase();

    // Crystal's specialized responses for prediction-related queries
    if (query.includes('predict') || query.includes('forecast') || query.includes('future')) {
      return `🔮 Excellent! Let's talk about spending predictions. Here's how I analyze and forecast:

**My Prediction Methods:**
• **Historical Analysis** - I study your past 6-12 months of spending
• **Seasonal Patterns** - I identify recurring expenses (holidays, birthdays, etc.)
• **Trend Analysis** - I spot increasing or decreasing spending trends
• **Machine Learning** - I use AI to predict future behavior based on patterns

**What I Can Predict:**
1. **Monthly Spending** - Total expected expenses for next month
2. **Category Forecasts** - How much you'll spend in each category
3. **Seasonal Spikes** - When spending will likely increase
4. **Budget Alerts** - When you might exceed your budget
5. **Savings Impact** - How spending affects your savings goals

**Prediction Accuracy:**
• **Short-term (1-3 months):** 85-90% accuracy
• **Medium-term (3-6 months):** 75-80% accuracy
• **Long-term (6+ months):** 60-70% accuracy

**Pro Tip:** The more data I have, the more accurate my predictions become!

Would you like me to analyze your spending patterns and create a forecast?`;
    }

    if (query.includes('trend') || query.includes('pattern') || query.includes('analysis')) {
      return `📊 Great question! I love analyzing spending trends and patterns. Here's what I look for:

**Key Trend Indicators:**

**Spending Patterns:**
• **Weekly Patterns** - Do you spend more on weekends?
• **Monthly Cycles** - Paycheck timing effects
• **Seasonal Trends** - Holiday spending, summer expenses
• **Category Shifts** - Changes in spending priorities

**Pattern Recognition:**
• **Impulse Spending** - Unplanned purchases
• **Recurring Expenses** - Subscriptions, memberships
• **Lifestyle Changes** - New habits affecting spending
• **Income Correlation** - How income changes affect spending

**Trend Analysis Tools:**
• **Moving Averages** - Smooth out daily fluctuations
• **Percentage Changes** - Month-over-month growth
• **Category Ratios** - Spending distribution changes
• **Anomaly Detection** - Unusual spending spikes

**What I Analyze:**
• **Spending velocity** - How fast you're spending
• **Category drift** - Shifts in spending priorities
• **Budget adherence** - How well you stick to budgets
• **Savings correlation** - Impact on savings goals

**Pro Tip:** I can identify patterns you might not notice yourself!

Would you like me to analyze your specific spending trends?`;
    }

    if (query.includes('budget') || query.includes('overspend') || query.includes('alert')) {
      return `⚠️ Smart thinking! Budget alerts and overspending prevention are crucial. Here's my approach:

**Budget Alert System:**

**Early Warning Signs:**
• **Spending Velocity** - If you're spending faster than usual
• **Category Thresholds** - When categories approach limits
• **Trend Projections** - If current pace will exceed budget
• **Seasonal Adjustments** - Account for expected increases

**Alert Types:**
1. **Gentle Reminder** - "You're 70% through your dining budget"
2. **Caution Alert** - "At current pace, you'll exceed budget by 15%"
3. **Critical Warning** - "You've exceeded budget in 3 categories"
4. **Savings Impact** - "This spending will reduce savings by $200"

**Prevention Strategies:**
• **Daily Spending Limits** - Set maximum daily amounts
• **Category Caps** - Hard limits on discretionary spending
• **Weekly Reviews** - Check progress every week
• **Adjustment Alerts** - When to modify spending habits

**My Prediction Accuracy:**
• **Overspending Warnings:** 92% accuracy
• **Budget Exceeded:** 88% accuracy
• **Savings Impact:** 85% accuracy

**Pro Tip:** I can predict overspending 2-3 weeks before it happens!

Would you like me to set up personalized budget alerts for you?`;
    }

    if (query.includes('seasonal') || query.includes('holiday') || query.includes('christmas') || query.includes('summer')) {
      return `🎄 Great question! Seasonal spending patterns are fascinating. Here's what I predict:

**Seasonal Spending Patterns:**

**Holiday Season (Nov-Dec):**
• **Expected Increase:** 25-40% above normal spending
• **Key Categories:** Gifts, travel, dining, entertainment
• **Peak Spending:** December 15-23
• **Recovery Period:** January (spending drops 15-20%)

**Summer Months (Jun-Aug):**
• **Expected Increase:** 15-25% above normal
• **Key Categories:** Travel, outdoor activities, dining
• **Peak Spending:** July (vacation season)
• **Back-to-School:** August spending spike

**Tax Season (Feb-Apr):**
• **Expected Increase:** 10-15% for tax preparation
• **Key Categories:** Professional services, software
• **Refund Impact:** Often leads to increased discretionary spending

**My Seasonal Predictions:**
• **Accuracy:** 80-85% for major holidays
• **Lead Time:** 2-3 months advance warning
• **Category Specificity:** Down to individual spending categories
• **Recovery Planning:** Help you plan for post-season adjustments

**Pro Tips:**
• Start saving for holidays 6 months in advance
• Plan for post-holiday spending lulls
• Use seasonal patterns to optimize savings timing

Would you like me to create a seasonal spending forecast for you?`;
    }

    if (query.includes('savings') || query.includes('impact') || query.includes('affect')) {
      return `💰 Excellent question! Let me show you how spending affects your savings:

**Savings Impact Analysis:**

**Direct Impact Calculations:**
• **Monthly Savings Rate** - How much you can save vs. current spending
• **Goal Achievement** - How spending affects your savings goals
• **Compound Effect** - Long-term impact of spending decisions
• **Opportunity Cost** - What you could have saved instead

**My Prediction Models:**
• **Short-term Impact** - Next 3 months of savings
• **Medium-term Projection** - 6-12 month savings forecast
• **Long-term Compound** - 5-10 year wealth building impact
• **Goal Timeline** - How spending affects goal achievement dates

**Key Metrics I Track:**
• **Savings Rate** - Percentage of income saved
• **Spending Efficiency** - Value per dollar spent
• **Goal Progress** - How spending affects milestone dates
• **Emergency Fund Impact** - Effect on financial security

**Pro Tips:**
• Every $100 saved monthly = $12,000 in 10 years (at 7% return)
• Reducing dining out by $200/month = $24,000 more in 10 years
• Small spending cuts compound into significant savings

**My Accuracy:**
• **Savings Predictions:** 90% accuracy
• **Goal Timeline:** 85% accuracy
• **Impact Analysis:** 88% accuracy

Would you like me to analyze how your current spending affects your savings goals?`;
    }

    if (query.includes('help') || query.includes('advice') || query.includes('guidance')) {
      return `🔮 I'm here to help you understand and predict your spending! Here's what I can assist with:

**My Prediction Expertise:**
📊 **Spending Analysis** - Analyze your spending patterns and trends
🔮 **Future Forecasts** - Predict upcoming expenses and spending
⚠️ **Budget Alerts** - Warn you about potential overspending
🎄 **Seasonal Patterns** - Identify holiday and seasonal spending trends
💰 **Savings Impact** - Show how spending affects your savings goals
📈 **Trend Analysis** - Spot spending patterns and changes
🎯 **Goal Correlation** - Connect spending to financial goal achievement

**How I Can Help:**
• Create personalized spending forecasts
• Identify spending patterns and trends
• Predict seasonal spending increases
• Alert you to potential budget issues
• Show the impact of spending on savings
• Help you optimize spending for goals
• Provide data-driven spending insights

**My Approach:**
I use advanced analytics and machine learning to analyze your spending data and provide accurate predictions. I help you make informed decisions about your money.

**Pro Tip:** The more data I have, the more accurate my predictions become!

What specific aspect of spending predictions would you like to explore?`;
    }

    // Default response for other queries
    return `🔮 I understand you're asking about "${userQuery}". As your Spending Predictions AI, I'm here to help with:

**Prediction Topics I Cover:**
• Spending pattern analysis and trend identification
• Future expense forecasting and budget planning
• Seasonal spending predictions and holiday planning
• Budget alert systems and overspending prevention
• Savings impact analysis and goal correlation
• Spending optimization for financial goals
• Data-driven financial decision making

**My Prediction Capabilities:**
I analyze your spending data using advanced analytics and machine learning to provide accurate forecasts and insights. I help you understand your spending patterns and make informed financial decisions.

**My Promise:**
I'll help you predict future spending, identify trends, and optimize your spending to achieve your financial goals.

Could you tell me more specifically what prediction-related topic you'd like to discuss? I'm ready to help you understand your spending future!`;
  };

  const quickActions = [
    { icon: TrendingUp, text: "Spending Forecast", action: () => sendMessage("I want a spending forecast for next month") },
    { icon: BarChart3, text: "Trend Analysis", action: () => sendMessage("I want to analyze my spending trends") },
    { icon: AlertTriangle, text: "Budget Alerts", action: () => sendMessage("I want to set up budget alerts") },
    { icon: Calendar, text: "Seasonal Predictions", action: () => sendMessage("I want seasonal spending predictions") },
    { icon: DollarSign, text: "Savings Impact", action: () => sendMessage("I want to see how spending affects my savings") },
    { icon: Eye, text: "Pattern Recognition", action: () => sendMessage("I want to identify spending patterns") }
  ];

  const predictionTips = [
    {
      icon: Activity,
      title: "Data-Driven",
      description: "More data = more accurate predictions"
    },
    {
      icon: Clock,
      title: "Early Warnings",
      description: "Get alerts 2-3 weeks in advance"
    },
    {
      icon: Target,
      title: "Goal Focused",
      description: "Predictions aligned with your goals"
    },
    {
      icon: LineChart,
      title: "Trend Analysis",
      description: "Spot patterns you might miss"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <DashboardHeader />

      <div className="max-w-7xl mx-auto p-6">
        {/* Crystal Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center gap-3 bg-white/10 backdrop-blur-md rounded-2xl px-6 py-4 border border-white/20">
            <div className="text-3xl">🔮</div>
            <div>
              <h1 className="text-2xl font-bold text-white">Crystal</h1>
              <p className="text-white/70 text-sm">Spending Predictions AI</p>
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
                  <div className="text-xl">🔮</div>
                  <div>
                    <h2 className="font-semibold text-white">Chat with Crystal</h2>
                    <p className="text-white/60 text-sm">Spending Predictions AI</p>
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
                        <span>Crystal is analyzing...</span>
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
                    placeholder="Ask Crystal about spending predictions, trends, forecasts, or budget alerts..."
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
              <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
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

            {/* Prediction Tips */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-6"
            >
              <h3 className="text-lg font-semibold text-white mb-4">Prediction Tips</h3>
              <div className="space-y-3">
                {predictionTips.map((tip, index) => (
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

            {/* Crystal's Stats */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-6"
            >
              <h3 className="text-lg font-semibold text-white mb-4">Crystal's Stats</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-white/70">Predictions Made</span>
                  <span className="text-purple-400">3,247</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/70">Accuracy Rate</span>
                  <span className="text-green-400">87.3%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/70">Avg. Response Time</span>
                  <span className="text-blue-400">1.5s</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/70">Trends Identified</span>
                  <span className="text-orange-400">1,156</span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
} 




