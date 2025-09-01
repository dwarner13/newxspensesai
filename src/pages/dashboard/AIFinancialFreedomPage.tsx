import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  Flag, 
  TrendingUp, 
  DollarSign, 
  Bot, 
  Send, 
  Loader2,
  Target,
  Zap,
  Shield,
  Rocket,
  Star,
  Crown,
  Compass,
  Map,
  Lightbulb,
  Award
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

interface LibertyMessage {
  role: 'user' | 'liberty' | 'system';
  content: string;
  timestamp: string;
  metadata?: {
    processing_time_ms?: number;
    tokens_used?: number;
    model_used?: string;
  };
}

export default function AIFinancialFreedomPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<LibertyMessage[]>([
    {
      role: 'liberty',
      content: "Hello! I'm 🗽 Liberty, your Financial Freedom AI! I guide you on your path to financial independence, helping you break free from debt, build wealth, and achieve true financial freedom. Whether you're just starting your journey or well on your way, I'll provide strategies for debt payoff, saving, investing, and building the life you want. What aspect of your financial freedom journey would you like to explore today?",
      timestamp: new Date().toISOString()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState('');
  const [libertyConfig, setLibertyConfig] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize conversation and load Liberty's config
  useEffect(() => {
    const initializeLiberty = async () => {
      if (!user?.id) return;

      const newConversationId = generateConversationId();
      setConversationId(newConversationId);

      // Load Liberty's configuration
      const config = await getEmployeeConfig('liberty');
      setLibertyConfig(config);

      // Load existing conversation if any
      const existingConversation = await getConversation(user.id, 'liberty', newConversationId);
      if (existingConversation && existingConversation.messages.length > 0) {
        setMessages(existingConversation.messages as LibertyMessage[]);
      }
    };

    initializeLiberty();
  }, [user?.id]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (content: string) => {
    if (!content.trim() || !user?.id || isLoading) return;

    const userMessage: LibertyMessage = {
      role: 'user',
      content: content.trim(),
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Save user message to conversation
      await addMessageToConversation(user.id, 'liberty', conversationId, userMessage as AIConversationMessage);

      // Log the interaction
      await logAIInteraction(user.id, 'liberty', 'chat', content);

      // Simulate AI response (in real implementation, this would call OpenAI)
      const startTime = Date.now();

      // Create Liberty's response based on the user's query
      const libertyResponse = await generateLibertyResponse(content);

      const processingTime = Date.now() - startTime;

      const libertyMessage: LibertyMessage = {
        role: 'liberty',
        content: libertyResponse,
        timestamp: new Date().toISOString(),
        metadata: {
          processing_time_ms: processingTime,
          model_used: 'gpt-3.5-turbo'
        }
      };

      setMessages(prev => [...prev, libertyMessage]);

      // Save Liberty's response to conversation
      await addMessageToConversation(user.id, 'liberty', conversationId, libertyMessage as AIConversationMessage);

      // Increment conversation count
      await incrementConversationCount(user.id, 'liberty');

    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: LibertyMessage = {
        role: 'liberty',
        content: "I'm having trouble processing your request right now. Please try again in a moment.",
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const generateLibertyResponse = async (userQuery: string): Promise<string> => {
    // Simulate AI processing delay
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));

    const query = userQuery.toLowerCase();
    const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'there';

    // Liberty's specialized responses for financial freedom queries
    if (query.includes('hello') || query.includes('hi') || query.includes('hey') || query.includes('hi there')) {
      return `Hi ${userName}! 🗽 I'm Liberty, your AI Financial Freedom Coach. Great to see you! I'm here to help you achieve complete financial independence, build wealth, and create the freedom to live life on your terms. What financial freedom goal would you like to work on today?`;
    }
    
    if (query.includes('freedom') || query.includes('independence') || query.includes('fire') || query.includes('retire')) {
      return `🗽 Financial freedom is the ultimate goal! Let me guide you on your path to independence. Here's my approach:

**What is Financial Freedom?**
• **Freedom from debt** - No more monthly payments to creditors
• **Freedom of choice** - Work because you want to, not because you have to
• **Freedom of time** - Spend your days doing what matters most to you
• **Freedom of location** - Live and work from anywhere
• **Freedom of purpose** - Pursue your passions without financial constraints

**The Path to Financial Freedom:**

**Phase 1: Foundation (0-2 years)**
• Build emergency fund (3-6 months expenses)
• Pay off high-interest debt
• Start saving 10-15% of income
• Learn about investing basics

**Phase 2: Growth (2-5 years)**
• Maximize retirement contributions
• Invest in diversified portfolio
• Increase income through side hustles
• Reduce expenses and lifestyle inflation

**Phase 3: Acceleration (5-10 years)**
• Achieve 50% savings rate
• Build multiple income streams
• Invest in real estate or business
• Reach 25x annual expenses saved

**Phase 4: Freedom (10+ years)**
• Financial independence achieved
• Work becomes optional
• Pursue passions and purpose
• Help others achieve freedom

**Key Principles:**
• **Live below your means** - Spend less than you earn
• **Invest the difference** - Make your money work for you
• **Increase your income** - More earning = faster freedom
• **Avoid lifestyle inflation** - Don't spend more as you earn more
• **Think long-term** - Freedom is a marathon, not a sprint

What's your current financial situation? I'll help you create a personalized freedom plan!`;
    }

    if (query.includes('debt') || query.includes('pay off') || query.includes('credit') || query.includes('loan')) {
      return `💪 Breaking free from debt is your first step to financial freedom! Let me show you proven strategies to eliminate debt and build wealth.

**Debt Freedom Strategies:**

**1. The Debt Avalanche Method (Recommended):**
• Pay minimum on all debts
• Put extra money toward highest interest rate
• Saves the most money long-term
• **Best for:** Mathematically optimal approach

**2. The Debt Snowball Method:**
• Pay minimum on all debts
• Put extra money toward smallest balance
• Builds momentum and motivation
• **Best for:** Psychological motivation and quick wins

**3. The Debt Tsunami Method:**
• Combine avalanche and snowball
• Focus on high-interest debts first
• Then tackle smallest balances for momentum
• **Best for:** Balance of math and motivation

**Debt Payoff Acceleration:**
• **Increase income** - Side hustles, overtime, career advancement
• **Reduce expenses** - Cut unnecessary spending, negotiate bills
• **Use windfalls** - Tax refunds, bonuses, gifts go to debt
• **Refinance** - Lower interest rates when possible
• **Consolidate** - Combine multiple debts into one payment

**My Freedom Formula:**
1. **Stop using credit cards** - Cut them up if needed
2. **Build emergency fund** - $1,000 minimum before debt payoff
3. **Choose your method** - Avalanche, Snowball, or Tsunami
4. **Track progress** - Celebrate every debt eliminated
5. **Stay motivated** - Remember why you want freedom

**Pro Tips:**
• **Debt payoff is a sprint** - Attack it aggressively
• **Saving is a marathon** - Start small but be consistent
• **Every dollar counts** - Small payments add up quickly
• **Don't give up** - Freedom is worth the effort

What's your total debt and which payoff method appeals to you?`;
    }

    if (query.includes('save') || query.includes('saving') || query.includes('invest') || query.includes('wealth')) {
      return `💰 Building wealth is the foundation of financial freedom! Let me show you how to save, invest, and grow your money effectively.

**Wealth Building Strategies:**

**1. The Freedom Savings Formula:**
• **50/30/20 Rule** - 50% needs, 30% wants, 20% savings
• **Pay yourself first** - Save before spending
• **Automate everything** - Make saving automatic
• **Increase over time** - Boost savings rate with raises

**2. Investment Strategy for Freedom:**
• **Index funds** - Low-cost, diversified, proven returns
• **Dollar-cost averaging** - Invest regularly regardless of market
• **Tax-advantaged accounts** - 401(k), IRA, HSA first
• **Diversification** - Don't put all eggs in one basket

**3. Multiple Income Streams:**
• **Primary job** - Maximize earnings and advancement
• **Side hustles** - Freelancing, consulting, online business
• **Passive income** - Dividends, rental income, royalties
• **Business ownership** - Start or invest in businesses

**4. Wealth Acceleration:**
• **Live below your means** - Save 50%+ of income
• **Invest aggressively** - Higher returns = faster freedom
• **Avoid lifestyle inflation** - Don't spend more as you earn more
• **Think long-term** - Compound interest is your friend

**My Wealth Building Framework:**
1. **Emergency fund** - 3-6 months expenses
2. **High-yield savings** - For short-term goals
3. **Retirement accounts** - 401(k), IRA, Roth IRA
4. **Taxable investments** - Index funds, ETFs
5. **Alternative investments** - Real estate, business, crypto

**Pro Tips:**
• **Start early** - Time in market beats timing market
• **Be consistent** - Regular investing beats perfect timing
• **Keep costs low** - Fees eat into returns
• **Stay the course** - Don't panic during market drops

What's your current savings rate and investment strategy?`;
    }

    if (query.includes('income') || query.includes('earn') || query.includes('salary') || query.includes('side hustle')) {
      return `🚀 Increasing your income is one of the fastest paths to financial freedom! Let me show you strategies to boost your earnings and accelerate your journey.

**Income Growth Strategies:**

**1. Career Advancement:**
• **Skill development** - Learn high-demand skills
• **Certifications** - Industry-recognized credentials
• **Networking** - Build professional relationships
• **Performance** - Exceed expectations consistently
• **Negotiation** - Ask for raises and promotions

**2. Side Hustles & Freelancing:**
• **Online freelancing** - Writing, design, programming, consulting
• **Gig economy** - Uber, DoorDash, TaskRabbit
• **E-commerce** - Dropshipping, Amazon FBA, Etsy
• **Content creation** - YouTube, podcasting, blogging
• **Teaching/tutoring** - Online or in-person

**3. Business Opportunities:**
• **Service business** - Lawn care, cleaning, handyman
• **Online business** - Digital products, courses, memberships
• **Real estate** - Rental properties, house flipping
• **Investments** - Dividend stocks, REITs, crowdfunding
• **Licensing** - Patents, trademarks, intellectual property

**4. Passive Income Streams:**
• **Dividend investing** - Regular income from stocks
• **Rental income** - Real estate properties
• **Royalties** - Books, music, software, patents
• **Affiliate marketing** - Commission from referrals
• **Digital products** - Courses, ebooks, software

**Income Acceleration Tips:**
• **Track your time** - Identify highest-value activities
• **Outsource low-value tasks** - Focus on high-impact work
• **Build systems** - Create repeatable income streams
• **Scale successful ventures** - Double down on what works
• **Diversify income** - Don't rely on one source

**My Income Formula:**
Primary Income + Side Hustles + Passive Income = Total Income
Focus on increasing each component systematically.

What skills or opportunities could you leverage to increase your income?`;
    }

    if (query.includes('plan') || query.includes('strategy') || query.includes('roadmap') || query.includes('timeline')) {
      return `🗺️ Creating a financial freedom roadmap is crucial for success! Let me help you build a personalized plan to achieve your independence goals.

**Financial Freedom Roadmap:**

**Step 1: Assess Your Current Situation**
• **Net worth calculation** - Assets minus liabilities
• **Income analysis** - Current earnings and growth potential
• **Expense tracking** - Where your money goes
• **Debt inventory** - All debts, interest rates, minimum payments
• **Savings rate** - Percentage of income saved

**Step 2: Set Freedom Goals**
• **Freedom number** - Annual expenses × 25 (4% rule)
• **Timeline** - When you want to achieve freedom
• **Lifestyle vision** - What freedom looks like for you
• **Milestone targets** - 25%, 50%, 75% of freedom number

**Step 3: Create Your Action Plan**
• **Debt elimination** - Choose payoff method and timeline
• **Savings strategy** - Target savings rate and accounts
• **Investment plan** - Asset allocation and contribution schedule
• **Income growth** - Career advancement and side hustles
• **Expense optimization** - Areas to reduce spending

**Step 4: Track and Adjust**
• **Monthly reviews** - Progress toward goals
• **Quarterly adjustments** - Update plan based on changes
• **Annual reassessment** - Major life changes and goal updates
• **Celebrate milestones** - Acknowledge progress and achievements

**My Planning Framework:**
1. **Current State** - Where you are now
2. **Desired State** - Where you want to be
3. **Gap Analysis** - What needs to change
4. **Action Plan** - Specific steps to take
5. **Progress Tracking** - How to measure success

**Pro Tips:**
• **Be realistic** - Set achievable but challenging goals
• **Be flexible** - Adjust plan as life changes
• **Be patient** - Freedom takes time and consistency
• **Be persistent** - Stay focused on your long-term vision

What's your freedom number and timeline? I'll help you create a detailed roadmap!`;
    }

    if (query.includes('help') || query.includes('advice') || query.includes('guidance') || query.includes('support')) {
      return `🗽 I'm here to guide you on your journey to financial freedom! Here's how I can help you achieve true independence:

**My Financial Freedom Expertise:**
🚀 **Freedom Planning** - Create personalized roadmaps to independence
💪 **Debt Elimination** - Proven strategies to break free from debt
💰 **Wealth Building** - Save, invest, and grow your money effectively
📈 **Income Growth** - Boost earnings through career and side hustles
🗺️ **Strategy Development** - Build comprehensive freedom plans
🎯 **Goal Setting** - Define and track your freedom milestones
📊 **Progress Tracking** - Monitor your journey to independence

**How I Can Help:**
• Create personalized financial freedom roadmaps
• Develop debt elimination strategies
• Design wealth building and investment plans
• Identify income growth opportunities
• Set realistic freedom goals and timelines
• Track progress toward independence
• Provide motivation and accountability

**My Approach:**
I believe everyone deserves financial freedom and can achieve it with the right plan, consistent action, and proper guidance. I help you create a personalized strategy that fits your unique situation and goals.

**My Promise:**
I'll be your guide on the path to financial independence, helping you break free from debt, build wealth, and create the life of freedom you deserve.

**Pro Tip:** Financial freedom is not about being rich—it's about having choices and living life on your terms.

What aspect of your financial freedom journey would you like to explore?`;
    }

    // Default response for other queries
    return `🗽 I understand you're asking about "${userQuery}". As your Financial Freedom AI, I'm here to help with:

**Freedom Topics I Cover:**
• Creating personalized financial freedom roadmaps
• Developing debt elimination strategies
• Building wealth through saving and investing
• Growing income through career and side hustles
• Setting and achieving freedom goals
• Tracking progress toward independence
• Overcoming obstacles on the freedom journey

**My Freedom Philosophy:**
Financial freedom is about having choices—the ability to work because you want to, not because you have to. It's about building wealth that provides security, flexibility, and the life you truly want.

**My Promise:**
I'll help you create a personalized path to financial independence, guiding you through debt elimination, wealth building, and income growth strategies.

Could you tell me more specifically what aspect of financial freedom you'd like to discuss? I'm ready to help you achieve true independence!`;
  };

  const quickActions = [
    { icon: Flag, text: "Freedom Planning", action: () => sendMessage("I want to create a financial freedom plan") },
    { icon: Zap, text: "Debt Elimination", action: () => sendMessage("I want to eliminate my debt and become free") },
    { icon: TrendingUp, text: "Wealth Building", action: () => sendMessage("I want to build wealth and invest for freedom") },
    { icon: Rocket, text: "Income Growth", action: () => sendMessage("I want to increase my income and earnings") },
    { icon: Target, text: "Goal Setting", action: () => sendMessage("I want to set financial freedom goals") },
    { icon: Compass, text: "Freedom Roadmap", action: () => sendMessage("I want a roadmap to financial independence") }
  ];

  const freedomTips = [
    {
      icon: Star,
      title: "Start Early",
      description: "Time is your greatest wealth-building asset"
    },
    {
      icon: Shield,
      title: "Live Below Means",
      description: "Spend less than you earn consistently"
    },
    {
      icon: Crown,
      title: "Invest Aggressively",
      description: "Make your money work for you"
    },
    {
      icon: Lightbulb,
      title: "Multiple Streams",
      description: "Diversify your income sources"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      <DashboardHeader />

      <div className="max-w-7xl mx-auto p-6">
        {/* Liberty Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center gap-3 bg-white/10 backdrop-blur-md rounded-2xl px-6 py-4 border border-white/20">
            <div className="text-3xl">🗽</div>
            <div>
              <h1 className="text-2xl font-bold text-white">Liberty</h1>
              <p className="text-white/70 text-sm">Financial Freedom AI</p>
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
                  <div className="text-xl">🗽</div>
                  <div>
                    <h2 className="font-semibold text-white">Chat with Liberty</h2>
                    <p className="text-white/60 text-sm">Financial Freedom AI</p>
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
                        ? 'bg-blue-600 text-white'
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
                        <span>Liberty is planning...</span>
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
                    placeholder="Ask Liberty about financial freedom, debt elimination, wealth building, or independence planning..."
                    className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:border-blue-500"
                    disabled={isLoading}
                  />
                  <button
                    onClick={() => sendMessage(input)}
                    disabled={isLoading || !input.trim()}
                    className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl px-4 py-3 transition-colors"
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
              <h3 className="text-lg font-semibold text-white mb-4">Freedom Actions</h3>
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

            {/* Freedom Tips */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-6"
            >
              <h3 className="text-lg font-semibold text-white mb-4">Freedom Principles</h3>
              <div className="space-y-3">
                {freedomTips.map((tip, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 bg-white/10 rounded-lg">
                    <tip.icon className="w-5 h-5 text-blue-400 mt-0.5" />
                    <div>
                      <div className="text-white text-sm font-medium">{tip.title}</div>
                      <div className="text-white/60 text-xs">{tip.description}</div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Liberty's Stats */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-6"
            >
              <h3 className="text-lg font-semibold text-white mb-4">Liberty's Stats</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-white/70">Freedom Plans Created</span>
                  <span className="text-blue-400">3,847</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/70">Debt Eliminated</span>
                  <span className="text-green-400">$12.4M</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/70">Freedom Achieved</span>
                  <span className="text-purple-400">1,234</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/70">Avg. Time to Freedom</span>
                  <span className="text-orange-400">8.2 years</span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
