import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  Target, 
  TrendingUp, 
  Calendar, 
  Trophy, 
  Bot, 
  Send, 
  Loader2,
  Flag,
  CheckCircle,
  AlertCircle,
  Star,
  Award,
  BarChart3,
  Clock,
  DollarSign
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

interface GoalieMessage {
  role: 'user' | 'goalie' | 'system';
  content: string;
  timestamp: string;
  metadata?: {
    processing_time_ms?: number;
    tokens_used?: number;
    model_used?: string;
  };
}

export default function GoalConciergePage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<GoalieMessage[]>([
    {
      role: 'goalie',
      content: "Hi! I'm 🥅 Goalie, your Goal Concierge! I help you set, track, and achieve your financial goals. Whether you want to save for a vacation, pay off debt, build an emergency fund, or invest for retirement, I'll keep you motivated and on track. What financial goal would you like to work on today?",
      timestamp: new Date().toISOString()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState('');
  const [goalieConfig, setGoalieConfig] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize conversation and load Goalie's config
  useEffect(() => {
    const initializeGoalie = async () => {
      if (!user?.id) return;

      const newConversationId = generateConversationId();
      setConversationId(newConversationId);

      // Load Goalie's configuration
      const config = await getEmployeeConfig('goalie');
      setGoalieConfig(config);

      // Load existing conversation if any
      const existingConversation = await getConversation(user.id, 'goalie', newConversationId);
      if (existingConversation && existingConversation.messages.length > 0) {
        setMessages(existingConversation.messages as GoalieMessage[]);
      }
    };

    initializeGoalie();
  }, [user?.id]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (content: string) => {
    if (!content.trim() || !user?.id || isLoading) return;

    const userMessage: GoalieMessage = {
      role: 'user',
      content: content.trim(),
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Save user message to conversation
      await addMessageToConversation(user.id, 'goalie', conversationId, userMessage as AIConversationMessage);

      // Log the interaction
      await logAIInteraction(user.id, 'goalie', 'chat', content);

      // Simulate AI response (in real implementation, this would call OpenAI)
      const startTime = Date.now();

      // Create Goalie's response based on the user's query
      const goalieResponse = await generateGoalieResponse(content);

      const processingTime = Date.now() - startTime;

      const goalieMessage: GoalieMessage = {
        role: 'goalie',
        content: goalieResponse,
        timestamp: new Date().toISOString(),
        metadata: {
          processing_time_ms: processingTime,
          model_used: 'gpt-3.5-turbo'
        }
      };

      setMessages(prev => [...prev, goalieMessage]);

      // Save Goalie's response to conversation
      await addMessageToConversation(user.id, 'goalie', conversationId, goalieMessage as AIConversationMessage);

      // Increment conversation count
      await incrementConversationCount(user.id, 'goalie');

    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: GoalieMessage = {
        role: 'goalie',
        content: "I'm having trouble processing your request right now. Please try again in a moment.",
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const generateGoalieResponse = async (userQuery: string): Promise<string> => {
    // Simulate AI processing delay
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));

    const query = userQuery.toLowerCase();
    const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'there';

    // Goalie's specialized responses for goal-related queries
    if (query.includes('hello') || query.includes('hi') || query.includes('hey') || query.includes('hi there')) {
      return `Hi ${userName}! 🎯 I'm Goalie, your Goal Concierge. Great to see you! I'm here to help you set, track, and achieve your financial goals. Whether it's saving for a house, paying off debt, or building wealth, I'll be your personal goal-setting coach. What financial goal would you like to work on today?`;
    }
    
    if (query.includes('goal') || query.includes('target') || query.includes('objective')) {
      return `🎯 Fantastic! Let's talk about setting financial goals. Here's my approach:

**SMART Goal Framework:**
• **Specific** - "Save $5,000 for emergency fund" (not just "save money")
• **Measurable** - Track progress with numbers
• **Achievable** - Realistic for your income and timeline
• **Relevant** - Aligns with your values and priorities
• **Time-bound** - Set a deadline

**Popular Financial Goals:**
1. **Emergency Fund** - 3-6 months of expenses
2. **Debt Payoff** - Credit cards, loans, student debt
3. **Down Payment** - House, car, major purchase
4. **Vacation Fund** - Travel and experiences
5. **Retirement** - Long-term wealth building
6. **Investment Portfolio** - Building passive income

**My Strategy:**
• Start with 1-3 main goals
• Break big goals into smaller milestones
• Celebrate progress along the way
• Review and adjust monthly

What specific financial goal do you want to set? I'll help you make it SMART!`;
    }

    if (query.includes('save') || query.includes('saving') || query.includes('emergency fund')) {
      return `💰 Excellent choice! Saving goals are the foundation of financial security. Here's my strategy:

**Emergency Fund Goals:**
• **Starter Goal:** $1,000 (covers most unexpected expenses)
• **Full Goal:** 3-6 months of essential expenses
• **Ultimate Goal:** 6-12 months (for job security)

**Saving Strategies:**
1. **Pay Yourself First** - Automate savings before spending
2. **52-Week Challenge** - Start with $1, increase by $1 each week
3. **Percentage Method** - Save 10-20% of every paycheck
4. **Round-Up Apps** - Save spare change automatically
5. **Windfall Strategy** - Save bonuses, tax refunds, gifts

**Motivation Tips:**
• Visualize your goal (dream vacation, debt-free life)
• Track progress with charts and milestones
• Reward yourself at 25%, 50%, 75% completion
• Share goals with accountability partners

**Pro Tip:** Start small! Even $50/month adds up to $600/year.

What's your target amount and timeline? I'll help you create a personalized saving plan!`;
    }

    if (query.includes('debt') || query.includes('pay off') || query.includes('credit card')) {
      return `💳 Smart thinking! Debt payoff goals can transform your financial life. Here's my approach:

**Debt Payoff Strategies:**

**Avalanche Method (Save More Money):**
• Pay minimum on all debts
• Put extra money toward highest interest rate
• Saves the most money long-term

**Snowball Method (Build Momentum):**
• Pay minimum on all debts
• Put extra money toward smallest balance
• Builds motivation and confidence

**My Goal-Setting Framework:**
1. **List all debts** with balances and interest rates
2. **Choose your method** (Avalanche or Snowball)
3. **Set monthly payment goals** for each debt
4. **Track progress** with debt payoff charts
5. **Celebrate milestones** (25%, 50%, 75% paid off)

**Motivation Boosters:**
• Calculate total interest saved
• Visualize debt-free life
• Set up automatic payments
• Join debt-free communities

**Pro Tip:** Focus on one debt at a time while paying minimums on others.

What's your total debt and which method appeals to you? I'll help you create a payoff timeline!`;
    }

    if (query.includes('track') || query.includes('progress') || query.includes('milestone')) {
      return `📊 Great question! Tracking progress is crucial for goal achievement. Here's my system:

**Progress Tracking Methods:**

**Visual Trackers:**
• **Progress Bars** - See percentage completion
• **Goal Thermometers** - Visual representation
• **Milestone Charts** - Celebrate small wins
• **Countdown Timers** - Build urgency

**Measurement Tools:**
• **Monthly Reviews** - Assess progress and adjust
• **Weekly Check-ins** - Stay accountable
• **Daily Habits** - Small actions compound
• **Quarterly Goals** - Break annual goals into quarters

**Motivation Techniques:**
• **Streak Tracking** - Don't break the chain
• **Reward System** - Celebrate milestones
• **Accountability Partners** - Share progress
• **Progress Photos** - Visual before/after

**My Tracking Formula:**
(Current Amount / Target Amount) × 100 = Progress %

**Pro Tips:**
• Update progress weekly
• Adjust goals if needed (life happens!)
• Focus on consistency over perfection
• Celebrate every milestone, no matter how small

Would you like me to help you set up a tracking system for your specific goal?`;
    }

    if (query.includes('motivation') || query.includes('stuck') || query.includes('difficult')) {
      return `🔥 I hear you! Goal achievement can be challenging, but you've got this! Here's my motivation toolkit:

**Motivation Boosters:**

**Visual Motivation:**
• **Vision Board** - Pictures of your goal
• **Progress Photos** - See how far you've come
• **Goal Reminders** - Phone wallpaper, sticky notes
• **Success Stories** - Read about others who achieved similar goals

**Mental Motivation:**
• **Why Statement** - "I'm saving for X because Y"
• **Identity Shift** - "I am a saver/investor/debt-free person"
• **Future Self** - Imagine your future self thanking you
• **Reverse Motivation** - What happens if you don't reach your goal?

**Action-Based Motivation:**
• **Micro-Goals** - Break big goals into tiny steps
• **Habit Stacking** - Link goal actions to existing habits
• **Environment Design** - Make goal actions easier
• **Accountability** - Share goals with trusted friends

**When You're Stuck:**
1. **Revisit your why** - Why did you set this goal?
2. **Adjust if needed** - Maybe the goal needs tweaking
3. **Start small** - Even 5 minutes of progress counts
4. **Celebrate progress** - You're further than when you started

**Remember:** Progress, not perfection! Every step forward counts.

What's your biggest motivation challenge right now? I'm here to help you push through!`;
    }

    if (query.includes('timeline') || query.includes('deadline') || query.includes('how long')) {
      return `⏰ Great question! Timeline planning is crucial for goal achievement. Here's my approach:

**Goal Timeline Framework:**

**Short-Term Goals (1-12 months):**
• Emergency fund ($1,000-6,000)
• Credit card payoff
• Vacation savings
• Holiday fund

**Medium-Term Goals (1-5 years):**
• Down payment for house/car
• Student loan payoff
• Business startup fund
• Major home renovation

**Long-Term Goals (5+ years):**
• Retirement savings
• College fund for kids
• Financial independence
• Legacy planning

**Timeline Calculation:**
(Goal Amount - Current Amount) ÷ Monthly Savings = Months to Goal

**Realistic Timeline Tips:**
• Factor in unexpected expenses
• Account for income fluctuations
• Build in buffer time (add 10-20%)
• Review and adjust quarterly

**Milestone Planning:**
• 25% - Initial momentum
• 50% - Halfway celebration
• 75% - Final push
• 100% - Goal achieved!

**Pro Tip:** Set intermediate milestones to maintain motivation.

What's your goal amount and current savings rate? I'll help you calculate a realistic timeline!`;
    }

    if (query.includes('help') || query.includes('advice') || query.includes('guidance')) {
      return `🥅 I'm here to help you achieve your financial goals! Here's what I can assist with:

**My Goal-Setting Expertise:**
🎯 **Goal Creation** - Help you set SMART financial goals
💰 **Saving Goals** - Emergency funds, vacation, major purchases
💳 **Debt Payoff** - Credit cards, loans, student debt strategies
📊 **Progress Tracking** - Milestones, motivation, accountability
⏰ **Timeline Planning** - Realistic deadlines and milestones
🔥 **Motivation** - Keep you inspired and on track
🎉 **Celebration** - Recognize achievements and progress

**How I Can Help:**
• Create personalized goal plans
• Set up tracking systems
• Provide motivation and accountability
• Adjust goals as life changes
• Celebrate your progress
• Connect you with relevant resources

**My Approach:**
I believe every goal is achievable with the right plan, consistent action, and proper motivation. I'll help you break down big goals into manageable steps and keep you accountable.

**Pro Tip:** The more specific you are about your goal, the better I can help!

What financial goal would you like to work on? I'm ready to be your goal achievement partner!`;
    }

    // Default response for other queries
    return `Hi ${userName}! 🥅 I understand you're asking about "${userQuery}". As your Goal Concierge, I'm here to help with:

**Goal-Setting Topics I Cover:**
• Setting SMART financial goals
• Creating saving and debt payoff plans
• Tracking progress and milestones
• Staying motivated and accountable
• Timeline planning and deadlines
• Celebrating achievements
• Adjusting goals as life changes

**My Philosophy:**
Every financial goal is achievable with the right plan, consistent action, and proper motivation. I help you break down big goals into manageable steps and keep you accountable throughout your journey.

**My Promise:**
I'll be your goal achievement partner, celebrating every milestone and helping you push through challenges.

Could you tell me more specifically what goal-related topic you'd like to discuss? I'm ready to help you achieve your financial dreams!`;
  };

  const quickActions = [
    { icon: Target, text: "Set New Goal", action: () => sendMessage("I want to set a new financial goal") },
    { icon: BarChart3, text: "Track Progress", action: () => sendMessage("I want to track my goal progress") },
    { icon: Calendar, text: "Timeline Planning", action: () => sendMessage("I need help planning my goal timeline") },
    { icon: Trophy, text: "Celebrate Milestone", action: () => sendMessage("I want to celebrate a goal milestone") },
    { icon: AlertCircle, text: "Motivation Help", action: () => sendMessage("I need motivation to stay on track") },
    { icon: CheckCircle, text: "Goal Review", action: () => sendMessage("I want to review and adjust my goals") }
  ];

  const goalTips = [
    {
      icon: Star,
      title: "SMART Goals",
      description: "Specific, Measurable, Achievable, Relevant, Time-bound"
    },
    {
      icon: Award,
      title: "Celebrate Progress",
      description: "Every milestone deserves recognition"
    },
    {
      icon: Clock,
      title: "Consistency Over Speed",
      description: "Small daily actions compound over time"
    },
    {
      icon: DollarSign,
      title: "Pay Yourself First",
      description: "Automate savings before spending"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-orange-900 to-slate-900">
      <DashboardHeader />

      <div className="max-w-7xl mx-auto p-6">
        {/* Goalie Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center gap-3 bg-white/10 backdrop-blur-md rounded-2xl px-6 py-4 border border-white/20">
            <div className="text-3xl">🥅</div>
            <div>
              <h1 className="text-2xl font-bold text-white">Goalie</h1>
              <p className="text-white/70 text-sm">Goal Concierge</p>
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
                  <div className="text-xl">🥅</div>
                  <div>
                    <h2 className="font-semibold text-white">Chat with Goalie</h2>
                    <p className="text-white/60 text-sm">Goal Concierge</p>
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
                        ? 'bg-orange-600 text-white'
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
                        <span>Goalie is thinking...</span>
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
                    placeholder="Ask Goalie about goal setting, tracking, motivation, or timeline planning..."
                    className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:border-orange-500"
                    disabled={isLoading}
                  />
                  <button
                    onClick={() => sendMessage(input)}
                    disabled={isLoading || !input.trim()}
                    className="bg-orange-600 hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl px-4 py-3 transition-colors"
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

            {/* Goal Tips */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-6"
            >
              <h3 className="text-lg font-semibold text-white mb-4">Goal Achievement Tips</h3>
              <div className="space-y-3">
                {goalTips.map((tip, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 bg-white/10 rounded-lg">
                    <tip.icon className="w-5 h-5 text-orange-400 mt-0.5" />
                    <div>
                      <div className="text-white text-sm font-medium">{tip.title}</div>
                      <div className="text-white/60 text-xs">{tip.description}</div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Goalie's Stats */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-6"
            >
              <h3 className="text-lg font-semibold text-white mb-4">Goalie's Stats</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-white/70">Goals Set</span>
                  <span className="text-orange-400">1,847</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/70">Goals Achieved</span>
                  <span className="text-green-400">1,234</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/70">Success Rate</span>
                  <span className="text-blue-400">66.8%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/70">Avg. Goal Time</span>
                  <span className="text-purple-400">8.2 months</span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
} 