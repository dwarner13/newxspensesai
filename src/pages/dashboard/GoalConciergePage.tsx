import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Target, 
  Trophy, 
  Send, 
  Loader2,
  BarChart3,
  Crown,
  Users,
  MessageCircle,
  Home,
  Shield,
  CreditCard,
  CheckCircle
} from 'lucide-react';

import { useAuth } from '../../contexts/AuthContext';
import {
  getConversation,
  addMessageToConversation,
  incrementConversationCount,
  logAIInteraction,
  generateConversationId
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
      content: "Welcome to your Luxury AI Financial Concierge! I'm 🥅 Goalie, orchestrating our elite AI team to create your personalized wealth-building journey. Where luxury meets wealth creation - let's make your financial dreams a reality!",
      timestamp: new Date().toISOString()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Luxury AI Concierge State
  const [activeView, setActiveView] = useState<'overview' | 'team' | 'conversation' | 'goals'>('overview');
  const [conversationMode, setConversationMode] = useState<'goalie' | 'team'>('goalie');
  const [teamConversation, setTeamConversation] = useState<any[]>([]);

  // Clear AI Functionality
  const aiFeatures = [
    {
      id: 'goal-setting',
      title: 'Smart Goal Setting',
      description: 'Set and track financial goals with AI-powered recommendations',
      icon: Target,
      examples: ['Save $10,000 emergency fund', 'Pay off $5,000 credit card debt', 'Buy house in 3 years']
    },
    {
      id: 'budget-analysis',
      title: 'Budget Analysis',
      description: 'Get insights on your spending patterns and optimization suggestions',
      icon: BarChart3,
      examples: ['Track monthly expenses', 'Find savings opportunities', 'Optimize spending categories']
    },
    {
      id: 'financial-advice',
      title: 'Personalized Advice',
      description: 'Get tailored financial advice based on your specific situation',
      icon: MessageCircle,
      examples: ['Investment strategies', 'Debt payoff plans', 'Retirement planning']
    },
    {
      id: 'progress-tracking',
      title: 'Progress Tracking',
      description: 'Monitor your financial progress with visual charts and milestones',
      icon: Trophy,
      examples: ['Goal completion rates', 'Monthly progress reports', 'Achievement celebrations']
    }
  ];

  // Common Financial Goals
  const commonGoals = [
    {
      id: 'emergency-fund',
      name: 'Emergency Fund',
      icon: Shield,
      description: 'Build 3-6 months of expenses saved',
      timeline: '6-12 months',
      targetAmount: '$5,000 - $15,000',
      priority: 'High'
    },
    {
      id: 'debt-payoff',
      name: 'Debt Payoff',
      icon: CreditCard,
      description: 'Pay off credit cards and loans',
      timeline: '1-3 years',
      targetAmount: 'Varies by debt amount',
      priority: 'High'
    },
    {
      id: 'home-purchase',
      name: 'Home Purchase',
      icon: Home,
      description: 'Save for down payment on a house',
      timeline: '2-5 years',
      targetAmount: '$20,000 - $100,000',
      priority: 'Medium'
    },
    {
      id: 'retirement',
      name: 'Retirement Savings',
      icon: Crown,
      description: 'Build long-term retirement fund',
      timeline: '10-30 years',
      targetAmount: '$500,000 - $2,000,000',
      priority: 'High'
    }
  ];

  // Initialize conversation and load Goalie's config
  useEffect(() => {
    const initializeGoalie = async () => {
      if (!user?.id) return;

      const newConversationId = generateConversationId();
      setConversationId(newConversationId);

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

  // Luxury AI Team Conversation Functions
  const startTeamConversation = async (goal: string) => {
    setConversationMode('team');
    
    // Simulate team conversation
    const teamResponses = [
      {
        member: 'goalie',
        message: `I want to buy my dream ${goal} in 5 years. How do we make this happen?`,
        timestamp: new Date().toISOString(),
        isUser: true
      },
      {
        member: 'finley',
        message: `Based on your current financial profile, you'll need approximately $120,000 for a 20% down payment on a $600,000 home.`,
        timestamp: new Date().toISOString(),
        isUser: false
      },
      {
        member: 'crystal',
        message: `I'm predicting a 15% increase in your income over the next 3 years, which will accelerate your savings timeline by 8 months.`,
        timestamp: new Date().toISOString(),
        isUser: false
      },
      {
        member: 'nova',
        message: `I've identified 3 side hustle opportunities that could generate an additional $2,500 monthly, putting you 2 years ahead of schedule!`,
        timestamp: new Date().toISOString(),
        isUser: false
      },
      {
        member: 'wisdom',
        message: `Let's diversify your savings strategy: 60% in high-yield savings, 30% in conservative investments, and 10% in emergency reserves.`,
        timestamp: new Date().toISOString(),
        isUser: false
      }
    ];

    setTeamConversation(teamResponses);
  };

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
      return `Champion, ${userName}! 🥅 Perfect timing - I was just reviewing your goal strategy and I spotted three quick wins we can knock out this week. Your emergency fund game is getting stronger every day! What victory are we targeting next?`;
    }
    
    if (query.includes('how are you') || query.includes('how\'s it going') || query.includes('how are things')) {
      return `Champion! Perfect timing - I was just reviewing your goal strategy and I spotted three quick wins we can knock out this week. Your emergency fund game is getting stronger every day! What victory are we targeting next?`;
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


  // Scroll to top when component mounts
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Clear Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Financial Goal Assistant</h1>
              <p className="text-white/70 text-sm sm:text-base">Set, track, and achieve your financial goals with AI-powered guidance</p>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-green-400 text-sm font-medium">AI Ready</span>
              </div>
              <div className="text-2xl">🎯</div>
            </div>
          </div>
        </motion.div>

        {/* Navigation Tabs */}
            <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex flex-wrap gap-2 mb-6"
        >
          {[
            { key: 'overview', label: 'How It Works', icon: BarChart3 },
            { key: 'team', label: 'AI Features', icon: Users },
            { key: 'conversation', label: 'Chat with AI', icon: MessageCircle },
            { key: 'goals', label: 'Set Goals', icon: Target }
          ].map(({ key, label, icon: Icon }) => (
            <motion.button
              key={key}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setActiveView(key as any)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                activeView === key
                  ? 'bg-purple-500 text-white'
                  : 'bg-white/10 text-white/70 hover:bg-white/20 hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </motion.button>
          ))}
        </motion.div>

          {/* Dynamic Content Based on Active View */}
          <AnimatePresence mode="wait">
            {activeView === 'overview' && (
              <motion.div
                key="overview"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                {/* How It Works Section */}
                <div className="bg-gradient-to-br from-white/5 to-white/2 backdrop-blur-sm rounded-xl p-6 border border-white/10">
                  <h3 className="text-xl font-bold text-white mb-4">How It Works</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="text-center">
                      <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Target className="w-6 h-6 text-purple-400" />
                      </div>
                      <h4 className="font-semibold text-white mb-2">1. Set Your Goals</h4>
                      <p className="text-white/70 text-sm">Choose from common financial goals or create your own</p>
                    </div>
                    <div className="text-center">
                      <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                        <MessageCircle className="w-6 h-6 text-blue-400" />
                      </div>
                      <h4 className="font-semibold text-white mb-2">2. Get AI Advice</h4>
                      <p className="text-white/70 text-sm">Chat with AI to get personalized strategies and tips</p>
                    </div>
                    <div className="text-center">
                      <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Trophy className="w-6 h-6 text-green-400" />
                      </div>
                      <h4 className="font-semibold text-white mb-2">3. Track Progress</h4>
                      <p className="text-white/70 text-sm">Monitor your progress and celebrate milestones</p>
                    </div>
                  </div>
                </div>

                {/* Common Goals */}
                <div className="bg-gradient-to-br from-white/5 to-white/2 backdrop-blur-sm rounded-xl p-6 border border-white/10">
                  <h3 className="text-xl font-bold text-white mb-4">Common Financial Goals</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {commonGoals.map((goal) => (
                      <motion.div
                        key={goal.id}
                        whileHover={{ scale: 1.02 }}
                        className="bg-white/5 p-4 rounded-lg border border-white/10 hover:bg-white/10 transition-all cursor-pointer"
                        onClick={() => startTeamConversation(goal.id)}
                      >
                        <div className="flex items-start gap-3">
                          <goal.icon className="w-8 h-8 text-purple-400 mt-1" />
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-semibold text-white">{goal.name}</h4>
                              <span className={`text-xs px-2 py-1 rounded-full ${
                                goal.priority === 'High' ? 'bg-red-500/20 text-red-300' : 'bg-yellow-500/20 text-yellow-300'
                              }`}>
                                {goal.priority}
                              </span>
                            </div>
                            <p className="text-white/70 text-sm mb-2">{goal.description}</p>
                            <div className="flex justify-between text-xs text-white/60">
                              <span>Timeline: {goal.timeline}</span>
                              <span>Target: {goal.targetAmount}</span>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Quick Start */}
                <div className="bg-gradient-to-br from-purple-500/10 to-blue-500/10 backdrop-blur-sm rounded-xl p-6 border border-purple-500/20">
                  <h3 className="text-xl font-bold text-white mb-4">Ready to Get Started?</h3>
                  <p className="text-white/80 mb-4">Click on any goal above or start a conversation with our AI assistant to begin your financial journey.</p>
                  <div className="flex gap-3">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setActiveView('conversation')}
                      className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg transition-colors"
                    >
                      Start Chatting
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setActiveView('goals')}
                      className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg transition-colors"
                    >
                      Set Custom Goal
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            )}

            {activeView === 'team' && (
              <motion.div
                key="team"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                {/* AI Features */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {aiFeatures.map((feature, index) => (
                    <motion.div
                      key={feature.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="bg-gradient-to-br from-white/5 to-white/2 backdrop-blur-sm rounded-xl p-6 border border-white/10"
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center">
                          <feature.icon className="w-6 h-6 text-purple-400" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-bold text-white mb-2">{feature.title}</h3>
                          <p className="text-white/70 text-sm mb-4">{feature.description}</p>
                          <div>
                            <p className="text-white/60 text-xs font-medium mb-2">Examples:</p>
                            <div className="space-y-1">
                              {feature.examples.map((example, idx) => (
                                <div key={idx} className="text-white/60 text-xs flex items-center gap-2">
                                  <CheckCircle className="w-3 h-3 text-green-400" />
                                  {example}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* How AI Helps */}
                <div className="bg-gradient-to-br from-purple-500/10 to-blue-500/10 backdrop-blur-sm rounded-xl p-6 border border-purple-500/20">
                  <h3 className="text-xl font-bold text-white mb-4">How AI Helps You Succeed</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-semibold text-white mb-2">Personalized Guidance</h4>
                      <p className="text-white/70 text-sm">Get advice tailored to your specific financial situation, income, and goals.</p>
                    </div>
                    <div>
                      <h4 className="font-semibold text-white mb-2">24/7 Availability</h4>
                      <p className="text-white/70 text-sm">Access financial guidance whenever you need it, day or night.</p>
                    </div>
                    <div>
                      <h4 className="font-semibold text-white mb-2">Data-Driven Insights</h4>
                      <p className="text-white/70 text-sm">Make decisions based on your actual spending patterns and financial data.</p>
                    </div>
                  <div>
                      <h4 className="font-semibold text-white mb-2">Motivation & Accountability</h4>
                      <p className="text-white/70 text-sm">Stay motivated with regular check-ins and progress celebrations.</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeView === 'conversation' && (
              <motion.div
                key="conversation"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                {/* Conversation Mode Toggle */}
                <div className="flex justify-center">
                  <div className="bg-white/10 rounded-xl p-1">
                    <button
                      onClick={() => setConversationMode('goalie')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        conversationMode === 'goalie'
                          ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                          : 'text-white/70 hover:text-white'
                      }`}
                    >
                      Chat with Goalie
                    </button>
                    <button
                      onClick={() => setConversationMode('team')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        conversationMode === 'team'
                          ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                          : 'text-white/70 hover:text-white'
                      }`}
                    >
                      Team Discussion
                    </button>
                  </div>
                </div>

                {/* Chat Interface */}
                <div className="bg-gradient-to-br from-white/5 to-white/2 backdrop-blur-xl rounded-2xl border border-white/20 overflow-hidden">
                  <div className="p-4 border-b border-white/10">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <MessageCircle className="w-5 h-5" />
                      {conversationMode === 'goalie' ? 'Goalie Chat' : 'AI Team Discussion'}
                    </h3>
              </div>

              <div className="h-96 overflow-y-auto p-4 space-y-4">
                    {conversationMode === 'goalie' ? (
                      messages.map((message, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                          <div className={`max-w-[80%] p-3 rounded-lg ${
                      message.role === 'user'
                              ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                              : 'bg-white/10 text-white'
                    }`}>
                            <p className="text-sm">{message.content}</p>
                    </div>
                  </motion.div>
                      ))
                    ) : (
                      teamConversation.map((msg, index) => (
                  <motion.div
                          key={index}
                          initial={{ opacity: 0, x: msg.isUser ? 20 : -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.2 }}
                          className={`flex ${msg.isUser ? 'justify-end' : 'justify-start'}`}
                        >
                          <div className={`max-w-[80%] p-4 rounded-lg ${
                            msg.isUser 
                              ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                              : 'bg-white/10 text-white'
                          }`}>
                            {!msg.isUser && (
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-lg">🤖</span>
                                <span className="font-bold text-sm">AI Assistant</span>
                      </div>
                            )}
                            <p className="text-sm">{msg.message}</p>
                    </div>
                  </motion.div>
                      ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="p-4 border-t border-white/10">
                <div className="flex gap-2">
                      <div className="flex-1 relative">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && !isLoading && sendMessage(input)}
                          placeholder={conversationMode === 'goalie' ? "Ask Goalie anything..." : "Start a team discussion..."}
                          className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500/50 text-sm"
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
              </div>
            </motion.div>
            )}

            {activeView === 'goals' && (
            <motion.div
                key="goals"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                {/* Set Custom Goal */}
                <div className="bg-gradient-to-br from-purple-500/10 to-blue-500/10 backdrop-blur-sm rounded-xl p-6 border border-purple-500/20">
                  <h3 className="text-xl font-bold text-white mb-4">Set Your Financial Goal</h3>
                  <p className="text-white/80 mb-4">Tell us what you want to achieve and we'll help you create a plan to get there.</p>
                  <div className="flex gap-3">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setActiveView('conversation')}
                      className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg transition-colors"
                    >
                      Start Goal Planning
                    </motion.button>
                  </div>
              </div>

                {/* Common Goals */}
                <div className="bg-gradient-to-br from-white/5 to-white/2 backdrop-blur-sm rounded-xl p-6 border border-white/10">
                  <h3 className="text-xl font-bold text-white mb-4">Popular Financial Goals</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {commonGoals.map((goal) => (
            <motion.div
                        key={goal.id}
                        whileHover={{ scale: 1.02 }}
                        className="bg-white/5 p-4 rounded-lg border border-white/10 hover:bg-white/10 transition-all cursor-pointer"
                        onClick={() => startTeamConversation(goal.id)}
                      >
                        <div className="flex items-start gap-3">
                          <goal.icon className="w-8 h-8 text-purple-400 mt-1" />
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-semibold text-white">{goal.name}</h4>
                              <span className={`text-xs px-2 py-1 rounded-full ${
                                goal.priority === 'High' ? 'bg-red-500/20 text-red-300' : 'bg-yellow-500/20 text-yellow-300'
                              }`}>
                                {goal.priority}
                              </span>
                            </div>
                            <p className="text-white/70 text-sm mb-2">{goal.description}</p>
                            <div className="flex justify-between text-xs text-white/60">
                              <span>Timeline: {goal.timeline}</span>
                              <span>Target: {goal.targetAmount}</span>
                            </div>
                    </div>
                  </div>
                      </motion.div>
                ))}
              </div>
                </div>

                {/* Goal Setting Tips */}
                <div className="bg-gradient-to-br from-white/5 to-white/2 backdrop-blur-sm rounded-xl p-6 border border-white/10">
                  <h3 className="text-xl font-bold text-white mb-4">Goal Setting Tips</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-green-400 mt-1" />
                      <div>
                        <h4 className="font-semibold text-white text-sm">Be Specific</h4>
                        <p className="text-white/70 text-xs">Instead of "save money," say "save $5,000 for emergency fund"</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-green-400 mt-1" />
                      <div>
                        <h4 className="font-semibold text-white text-sm">Set Deadlines</h4>
                        <p className="text-white/70 text-xs">Give yourself a realistic timeline to stay motivated</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-green-400 mt-1" />
                      <div>
                        <h4 className="font-semibold text-white text-sm">Track Progress</h4>
                        <p className="text-white/70 text-xs">Monitor your progress regularly and celebrate milestones</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-green-400 mt-1" />
                      <div>
                        <h4 className="font-semibold text-white text-sm">Start Small</h4>
                        <p className="text-white/70 text-xs">Begin with achievable goals to build confidence</p>
                      </div>
                </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};