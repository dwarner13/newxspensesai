import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  DollarSign, 
  TrendingUp, 
  PiggyBank, 
  CreditCard, 
  Bot, 
  Send, 
  Loader2,
  Calculator,
  Target,
  Shield,
  Lightbulb,
  BookOpen
} from 'lucide-react';
import DashboardHeader from '../../components/ui/DashboardHeader';
import { useAuth } from '../../contexts/AuthContext';
import SmartHandoffBanner from '../../components/ai/SmartHandoffBanner';
import SmartWelcomeMessage from '../../components/ai/SmartWelcomeMessage';
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

interface FinleyMessage {
  role: 'user' | 'finley' | 'system';
  content: string;
  timestamp: string;
  metadata?: {
    processing_time_ms?: number;
    tokens_used?: number;
    model_used?: string;
  };
}

export default function AIFinancialAssistantPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<FinleyMessage[]>([]);
  const [showWelcomeMessage, setShowWelcomeMessage] = useState(true);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState('');
  const [finleyConfig, setFinleyConfig] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize conversation and load Finley's config
  useEffect(() => {
    const initializeFinley = async () => {
      if (!user?.id) return;

      const newConversationId = generateConversationId();
      setConversationId(newConversationId);

      // Load Finley's configuration
      const config = await getEmployeeConfig('finley');
      setFinleyConfig(config);

      // Load existing conversation if any
      const existingConversation = await getConversation(user.id, 'finley', newConversationId);
      if (existingConversation && existingConversation.messages.length > 0) {
        setMessages(existingConversation.messages as FinleyMessage[]);
      }
    };

    initializeFinley();
  }, [user?.id]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (content: string) => {
    if (!content.trim() || !user?.id || isLoading) return;

    // Hide welcome message when user starts chatting
    if (showWelcomeMessage) {
      setShowWelcomeMessage(false);
    }

    const userMessage: FinleyMessage = {
      role: 'user',
      content: content.trim(),
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Save user message to conversation
      await addMessageToConversation(user.id, 'finley', conversationId, userMessage as AIConversationMessage);

      // Log the interaction
      await logAIInteraction(user.id, 'finley', 'chat', content);

      // Simulate AI response (in real implementation, this would call OpenAI)
      const startTime = Date.now();

      // Create Finley's response based on the user's query
      const finleyResponse = await generateFinleyResponse(content);

      const processingTime = Date.now() - startTime;

      const finleyMessage: FinleyMessage = {
        role: 'finley',
        content: finleyResponse,
        timestamp: new Date().toISOString(),
        metadata: {
          processing_time_ms: processingTime,
          model_used: 'gpt-3.5-turbo'
        }
      };

      setMessages(prev => [...prev, finleyMessage]);

      // Save Finley's response to conversation
      await addMessageToConversation(user.id, 'finley', conversationId, finleyMessage as AIConversationMessage);

      // Increment conversation count
      await incrementConversationCount(user.id, 'finley');

    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: FinleyMessage = {
        role: 'finley',
        content: "I'm having trouble processing your request right now. Please try again in a moment.",
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const generateFinleyResponse = async (userQuery: string): Promise<string> => {
    // Simulate AI processing delay
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));

    const query = userQuery.toLowerCase();
    const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'there';

    // Finley's specialized responses for financial advice
    if (query.includes('hello') || query.includes('hi') || query.includes('hey') || query.includes('hi there')) {
      return `Hi ${userName}! 👋 I'm Finley, your Financial Analysis Assistant. Great to see you! I'm here to help you with budgeting, investing, debt management, and all your financial planning needs. What would you like to work on today?`;
    }
    
    if (query.includes('budget') || query.includes('budgeting') || query.includes('spending')) {
      return `💰 Great question about budgeting! Here's my approach:

**The 50/30/20 Rule:**
• 50% for needs (housing, food, utilities)
• 30% for wants (entertainment, shopping)
• 20% for savings and debt payoff

**Pro Tips:**
1. **Track everything** - Use our app to categorize all spending
2. **Set realistic goals** - Start small and build up
3. **Review monthly** - Adjust categories based on your lifestyle
4. **Emergency fund first** - Aim for 3-6 months of expenses

Would you like me to help you create a personalized budget plan? I can analyze your spending patterns and suggest specific categories!`;
    }

    if (query.includes('invest') || query.includes('investment') || query.includes('stock') || query.includes('portfolio')) {
      return `📈 Excellent! Let's talk about investing. Here's my guidance:

**Investment Basics:**
• **Diversification** - Don't put all eggs in one basket
• **Time horizon** - Longer time = more risk tolerance
• **Dollar-cost averaging** - Invest regularly, regardless of market
• **Emergency fund first** - 3-6 months expenses before investing

**Popular Options:**
1. **Index funds** - Low-cost, diversified (S&P 500, etc.)
2. **ETFs** - Exchange-traded funds, easy to buy/sell
3. **401(k)/RRSP** - Tax-advantaged retirement accounts
4. **Robo-advisors** - Automated portfolio management

**My Advice:** Start with index funds or target-date funds. They're simple, diversified, and historically perform well.

What's your investment timeline and risk tolerance? I can suggest specific strategies!`;
    }

    if (query.includes('debt') || query.includes('credit card') || query.includes('loan') || query.includes('pay off')) {
      return `💳 Smart thinking about debt management! Here are my strategies:

**Debt Payoff Methods:**

**Avalanche Method (Recommended):**
• Pay minimum on all debts
• Put extra money toward highest interest rate
• Saves the most money long-term

**Snowball Method:**
• Pay minimum on all debts
• Put extra money toward smallest balance
• Builds momentum and motivation

**My Top Tips:**
1. **Stop using credit cards** while paying off
2. **Negotiate lower rates** - call your creditors
3. **Consider balance transfers** for high-interest cards
4. **Build emergency fund** to avoid new debt

**Priority Order:**
1. High-interest credit cards (15%+)
2. Personal loans
3. Student loans
4. Mortgage (usually lowest rate)

Would you like me to help you create a debt payoff plan? I can suggest the best strategy for your situation!`;
    }

    if (query.includes('save') || query.includes('saving') || query.includes('emergency fund')) {
      return `🏦 Fantastic! Saving is the foundation of financial health. Here's my approach:

**Emergency Fund Strategy:**
• **Goal:** 3-6 months of essential expenses
• **Where:** High-yield savings account (2-4% APY)
• **How:** Automate monthly transfers
• **Priority:** Before investing or extra debt payments

**Saving Methods:**
1. **50/30/20 Rule** - 20% of income to savings
2. **Pay yourself first** - Transfer savings before spending
3. **Round-up apps** - Save spare change automatically
4. **Side hustles** - Extra income goes straight to savings

**Pro Tips:**
• Start with $1,000 emergency fund
• Then build to 3-6 months expenses
• Keep it separate from checking account
• Only use for true emergencies

**Automation is key!** Set up automatic transfers so you don't have to think about it.

What's your current saving situation? I can help you create a personalized saving plan!`;
    }

    if (query.includes('retirement') || query.includes('401k') || query.includes('rrsp') || query.includes('pension')) {
      return `🎯 Excellent planning! Retirement is a marathon, not a sprint. Here's my guidance:

**Retirement Planning Basics:**
• **Start early** - Compound interest is your friend
• **Save 10-15%** of income for retirement
• **Take advantage** of employer matches
• **Diversify** your retirement accounts

**Account Types:**
1. **401(k)/RRSP** - Tax-advantaged, often with employer match
2. **IRA/TFSA** - Individual retirement accounts
3. **Roth options** - Tax-free withdrawals in retirement
4. **Pension plans** - If your employer offers them

**My Recommendations:**
1. **Contribute to get full employer match** (free money!)
2. **Max out tax-advantaged accounts** first
3. **Invest in low-cost index funds**
4. **Increase contributions** with raises

**Rule of Thumb:** Save 10-15% of income, including employer match.

**Compound Interest Example:** $500/month at 7% return = $1.2M after 40 years!

What's your current retirement situation? I can help you optimize your strategy!`;
    }

    if (query.includes('help') || query.includes('advice') || query.includes('guidance') || query.includes('what should')) {
      return `💼 I'm here to help with all your financial questions! Here's what I can assist with:

**My Expertise Areas:**
💰 **Budgeting & Spending** - Create budgets, track expenses, optimize spending
📈 **Investing** - Portfolio advice, investment strategies, retirement planning
💳 **Debt Management** - Payoff strategies, credit optimization, loan advice
🏦 **Saving** - Emergency funds, goal setting, saving strategies
🎯 **Financial Planning** - Goal setting, life planning, financial health
📊 **Financial Analysis** - Review your situation, identify opportunities

**How I Can Help:**
• Answer specific financial questions
• Provide personalized advice based on your situation
• Suggest strategies and tools
• Help you create financial plans
• Guide you to the right resources

**Pro Tip:** The more specific you are about your situation, the better advice I can give!

What specific financial topic would you like to discuss? I'm ready to help you achieve your financial goals!`;
    }

    if (query.includes('credit') || query.includes('credit score') || query.includes('fico')) {
      return `📊 Great question about credit! Your credit score is crucial for financial health. Here's what you need to know:

**Credit Score Factors:**
• **Payment History (35%)** - Pay on time, every time
• **Credit Utilization (30%)** - Keep under 30% of available credit
• **Length of Credit (15%)** - Don't close old accounts
• **Credit Mix (10%)** - Different types of credit
• **New Credit (10%)** - Limit new applications

**Building Good Credit:**
1. **Pay bills on time** - Set up autopay
2. **Keep utilization low** - Under 30% ideally
3. **Don't close old accounts** - Length matters
4. **Monitor regularly** - Check for errors
5. **Limit new applications** - Too many hurt your score

**Credit Score Ranges:**
• 800-850: Excellent
• 740-799: Very Good
• 670-739: Good
• 580-669: Fair
• 300-579: Poor

**Free Credit Monitoring:** Use apps like Credit Karma or your bank's tools.

Would you like me to help you create a credit improvement plan?`;
    }

    // Default response for other queries
    return `Hi ${userName}! 💼 I understand you're asking about "${userQuery}". As your AI Financial Assistant, I'm here to help with:

**Financial Topics I Cover:**
• Budgeting and spending optimization
• Investing and portfolio management
• Debt payoff strategies
• Saving and emergency funds
• Retirement planning
• Credit score improvement
• Financial goal setting
• General money advice

**My Approach:**
I provide personalized, practical advice based on proven financial principles. I focus on actionable steps you can take today to improve your financial situation.

Could you tell me more specifically what financial topic you'd like to discuss? I'm ready to help you make smart financial decisions!`;
  };

  const quickActions = [
    { icon: Calculator, text: "Budget Help", action: () => sendMessage("I need help creating a budget") },
    { icon: TrendingUp, text: "Investment Advice", action: () => sendMessage("I want investment advice") },
    { icon: CreditCard, text: "Debt Management", action: () => sendMessage("I need help with debt management") },
    { icon: PiggyBank, text: "Saving Strategies", action: () => sendMessage("I want to save more money") },
    { icon: Target, text: "Financial Goals", action: () => sendMessage("I need help setting financial goals") },
    { icon: Shield, text: "Emergency Fund", action: () => sendMessage("I want to build an emergency fund") }
  ];

  const financialTips = [
    {
      icon: Lightbulb,
      title: "50/30/20 Rule",
      description: "50% needs, 30% wants, 20% savings"
    },
    {
      icon: BookOpen,
      title: "Pay Yourself First",
      description: "Save before you spend"
    },
    {
      icon: Target,
      title: "Emergency Fund",
      description: "3-6 months of expenses"
    },
    {
      icon: TrendingUp,
      title: "Invest Early",
      description: "Time in market beats timing"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-green-900 to-slate-900">
      <DashboardHeader />

      <div className="max-w-7xl mx-auto p-6">
        {/* Finley Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center gap-3 bg-white/10 backdrop-blur-md rounded-2xl px-6 py-4 border border-white/20">
            <div className="text-3xl">💼</div>
            <div>
              <h1 className="text-2xl font-bold text-white">Finley</h1>
              <p className="text-white/70 text-sm">AI Financial Assistant</p>
            </div>
            <div className="flex items-center gap-2 ml-4">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-green-400 text-sm">AI Active</span>
            </div>
          </div>
        </motion.div>

        {/* Smart Handoff Components */}
        <SmartHandoffBanner />
        {showWelcomeMessage && (
          <SmartWelcomeMessage 
            employeeName="Finley" 
            employeeEmoji="💼"
            defaultMessage="Hi! I'm 💼 Finley, your AI Financial Assistant. I provide personalized financial advice, budgeting tips, and answer all your money questions. Whether you need help with budgeting, investing, debt management, or general financial guidance, I'm here to help! What financial topic would you like to discuss today?"
          />
        )}

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
                  <div className="text-xl">💼</div>
                  <div>
                    <h2 className="font-semibold text-white">Chat with Finley</h2>
                    <p className="text-white/60 text-sm">AI Financial Assistant</p>
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
                        ? 'bg-green-600 text-white'
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
                        <span>Finley is thinking...</span>
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
                    placeholder="Ask Finley about budgeting, investing, debt, or any financial topic..."
                    className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:border-green-500"
                    disabled={isLoading}
                  />
                  <button
                    onClick={() => sendMessage(input)}
                    disabled={isLoading || !input.trim()}
                    className="bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl px-4 py-3 transition-colors"
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

            {/* Financial Tips */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-6"
            >
              <h3 className="text-lg font-semibold text-white mb-4">Financial Tips</h3>
              <div className="space-y-3">
                {financialTips.map((tip, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 bg-white/10 rounded-lg">
                    <tip.icon className="w-5 h-5 text-green-400 mt-0.5" />
                    <div>
                      <div className="text-white text-sm font-medium">{tip.title}</div>
                      <div className="text-white/60 text-xs">{tip.description}</div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Finley's Stats */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-6"
            >
              <h3 className="text-lg font-semibold text-white mb-4">Finley's Stats</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-white/70">Advice Given</span>
                  <span className="text-green-400">2,847</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/70">Avg. Response Time</span>
                  <span className="text-blue-400">1.8s</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/70">User Satisfaction</span>
                  <span className="text-purple-400">96.2%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/70">Topics Covered</span>
                  <span className="text-orange-400">15+</span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
} 