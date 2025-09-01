import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  Heart, 
  Brain, 
  Moon, 
  Send, 
  Loader2,
  Shield,
  Lightbulb,
  Coffee,
  BookOpen,
  Sparkles,
  Star,
  Leaf
} from 'lucide-react';
import DashboardHeader from '../../components/ui/DashboardHeader';
import { useAuth } from '../../contexts/AuthContext';
import {
  getEmployeeConfig,
  getConversation,
  addMessageToConversation,
  incrementConversationCount,
  logAIInteraction,
  generateConversationId
} from '../../lib/ai-employees';
import { AIConversationMessage } from '../../types/ai-employees.types';

interface HarmonyMessage {
  role: 'user' | 'harmony' | 'system';
  content: string;
  timestamp: string;
  metadata?: {
    processing_time_ms?: number;
    tokens_used?: number;
    model_used?: string;
  };
}

export default function FinancialTherapistPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<HarmonyMessage[]>([
    {
      role: 'harmony',
      content: "Hello, I'm 💚 Harmony, your Financial Wellness AI. I'm here to help you find balance between financial discipline and life enjoyment. Whether you're feeling stressed about money, struggling with spending habits, or need help developing a healthier relationship with finances, I'm here to listen and guide you. How is your relationship with money feeling today?",
      timestamp: new Date().toISOString()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState('');
  const [, setHarmonyConfig] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize conversation and load Harmony's config
  useEffect(() => {
    const initializeHarmony = async () => {
      if (!user?.id) return;

      const newConversationId = generateConversationId();
      setConversationId(newConversationId);

      // Load Harmony's configuration
      const config = await getEmployeeConfig('harmony');
      setHarmonyConfig(config);

      // Load existing conversation if any
      const existingConversation = await getConversation(user.id, 'harmony', newConversationId);
      if (existingConversation && existingConversation.messages.length > 0) {
        setMessages(existingConversation.messages as HarmonyMessage[]);
      }
    };

    initializeHarmony();
  }, [user?.id]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (content: string) => {
    if (!content.trim() || !user?.id || isLoading) return;

    const userMessage: HarmonyMessage = {
      role: 'user',
      content: content.trim(),
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Save user message to conversation
      await addMessageToConversation(user.id, 'harmony', conversationId, userMessage as AIConversationMessage);

      // Log the interaction
      await logAIInteraction(user.id, 'harmony', 'chat', content);

      // Simulate AI response (in real implementation, this would call OpenAI)
      const startTime = Date.now();

      // Create Harmony's response based on the user's query
      const harmonyResponse = await generateHarmonyResponse(content);

      const processingTime = Date.now() - startTime;

      const harmonyMessage: HarmonyMessage = {
        role: 'harmony',
        content: harmonyResponse,
        timestamp: new Date().toISOString(),
        metadata: {
          processing_time_ms: processingTime,
          model_used: 'gpt-3.5-turbo'
        }
      };

      setMessages(prev => [...prev, harmonyMessage]);

      // Save Harmony's response to conversation
      await addMessageToConversation(user.id, 'harmony', conversationId, harmonyMessage as AIConversationMessage);

      // Increment conversation count
      await incrementConversationCount(user.id, 'harmony');

    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: HarmonyMessage = {
        role: 'harmony',
        content: "I'm having trouble processing your request right now. Please try again in a moment.",
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const generateHarmonyResponse = async (userQuery: string): Promise<string> => {
    // Simulate AI processing delay
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));

    const query = userQuery.toLowerCase();
    const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'there';

    // Harmony's specialized responses for wellness-related queries
    if (query.includes('hello') || query.includes('hi') || query.includes('hey') || query.includes('hi there')) {
      return `Welcome to your financial wellness check-in, ${userName}. 💚 I've been observing your money energy lately, and I sense some beautiful balance emerging in your spending patterns. How is your relationship with money feeling today? Any areas where we need to restore harmony?`;
    }
    
    if (query.includes('how are you') || query.includes('how\'s it going') || query.includes('how are things')) {
      return `Welcome to your financial wellness check-in. I've been observing your money energy lately, and I sense some beautiful balance emerging in your spending patterns. How is your relationship with money feeling today? Any areas where we need to restore harmony?`;
    }
    
    if (query.includes('stress') || query.includes('anxiety') || query.includes('worried') || query.includes('overwhelmed')) {
      return `💙 I hear you, and it's completely normal to feel stressed about money. Financial stress affects so many people, and you're not alone in this. Let me help you work through these feelings.

**Understanding Financial Stress:**
• **It's Common** - 72% of people report money-related stress
• **It's Manageable** - With the right tools and mindset
• **It's Temporary** - This feeling will pass as you take action

**Immediate Relief Strategies:**
1. **Breathe** - Take 3 deep breaths, in for 4, hold for 4, out for 6
2. **Ground Yourself** - Name 5 things you can see, 4 you can touch, 3 you can hear
3. **Separate Facts from Feelings** - What's the actual situation vs. what you're fearing?
4. **Small Steps** - Focus on one small action you can take today

**My Approach:**
• **Non-judgmental listening** - No shame, no blame
• **Practical coping strategies** - Tools you can use immediately
• **Gradual progress** - We'll work through this step by step
• **Celebration of wins** - Every small step forward matters

**Remember:** Your worth is not defined by your bank account. You're doing the right thing by seeking help.

What specific aspect of your financial situation is causing the most stress right now?`;
    }

    if (query.includes('habit') || query.includes('behavior') || query.includes('pattern') || query.includes('change')) {
      return `🌱 Wonderful! Changing financial habits is one of the most powerful things you can do for your wellbeing. Let me guide you through this process.

**Understanding Habit Formation:**
• **Habits are automatic** - They run on autopilot
• **Change takes time** - 21-66 days to form new habits
• **Small changes compound** - Tiny improvements create big results
• **Setbacks are normal** - They're part of the learning process

**My Habit Change Framework:**

**1. Awareness (Week 1-2):**
• Track your current habits without judgment
• Identify triggers and patterns
• Notice emotional connections to spending

**2. Small Changes (Week 3-4):**
• Start with one tiny habit change
• Make it so small it's almost impossible to fail
• Celebrate every success, no matter how small

**3. Building Momentum (Week 5-8):**
• Add one new habit at a time
• Link new habits to existing routines
• Create supportive environments

**4. Maintenance (Ongoing):**
• Review and adjust regularly
• Be kind to yourself during setbacks
• Focus on progress, not perfection

**Pro Tips:**
• **Habit stacking** - Add new habits to existing routines
• **Environment design** - Make good habits easier, bad habits harder
• **Identity-based** - "I am a saver" vs. "I need to save money"
• **Celebration** - Reward yourself for progress

What specific financial habit would you like to work on?`;
    }

    if (query.includes('relationship') || query.includes('money') || query.includes('feelings') || query.includes('emotion')) {
      return `💫 Your relationship with money is deeply personal and shaped by your experiences. Let's explore this together with compassion and understanding.

**Understanding Your Money Story:**
• **Childhood experiences** - How money was talked about growing up
• **Cultural influences** - Family, community, and societal messages
• **Past experiences** - Successes and challenges with money
• **Current beliefs** - What you tell yourself about money

**Common Money Relationships:**

**The Avoidant Relationship:**
• Avoids thinking about money
• Procrastinates financial decisions
• Feels overwhelmed by money talk

**The Obsessive Relationship:**
• Constantly worries about money
• Over-researches every decision
• Never feels financially secure

**The Impulsive Relationship:**
• Spends without thinking
• Uses money for emotional comfort
• Regrets purchases later

**The Balanced Relationship:**
• Respects money as a tool
• Makes informed decisions
• Feels confident and secure

**My Therapeutic Approach:**
• **No judgment** - Your feelings are valid
• **Curiosity** - Let's explore your money story together
• **Compassion** - Be kind to yourself in this process
• **Practical tools** - Strategies to improve your relationship

**Reflection Questions:**
• How did your family talk about money when you were growing up?
• What's your earliest memory about money?
• What do you believe about people who have money?
• How do you feel when you think about your finances?

What aspect of your relationship with money would you like to explore?`;
    }

    if (query.includes('confidence') || query.includes('self-esteem') || query.includes('worth') || query.includes('capable')) {
      return `✨ Your financial confidence is so important, and I'm here to help you build it. Remember, confidence comes from competence, and we can develop both together.

**Building Financial Confidence:**

**1. Knowledge is Power:**
• **Start small** - Learn one new financial concept at a time
• **Ask questions** - There are no stupid questions about money
• **Celebrate learning** - Every new understanding is a win
• **Practice** - Apply what you learn in small ways

**2. Small Wins Matter:**
• **Track progress** - Notice every step forward
• **Celebrate milestones** - Even tiny ones deserve recognition
• **Reflect on growth** - Look back at how far you've come
• **Share successes** - Tell trusted friends about your wins

**3. Mindset Shifts:**
• **From "I'm bad with money"** to "I'm learning about money"
• **From "I can't save"** to "I'm building my saving muscle"
• **From "I'll never get ahead"** to "I'm taking steps forward"
• **From "I'm not good enough"** to "I'm worthy of financial security"

**4. Self-Compassion:**
• **Be your own cheerleader** - Talk to yourself like a good friend
• **Acknowledge effort** - Recognize the work you're putting in
• **Forgive setbacks** - They're part of the learning process
• **Focus on progress** - Not perfection

**My Confidence-Building Tools:**
• **Daily affirmations** - Positive statements about your financial journey
• **Progress journaling** - Write down your wins and learnings
• **Visual reminders** - Notes or images that inspire confidence
• **Accountability partners** - People who support your growth

**Remember:** You are capable of creating the financial life you want. It's not about being perfect—it's about being persistent.

What would help you feel more confident about your finances right now?`;
    }

    if (query.includes('support') || query.includes('help') || query.includes('guidance') || query.includes('advice')) {
      return `🌙 I'm here to support you on your financial wellness journey. Let me share how I can help and what you can expect from our sessions together.

**How I Can Support You:**

**Emotional Support:**
• **Safe space** - No judgment, no shame, just understanding
• **Active listening** - I hear your concerns and validate your feelings
• **Compassionate guidance** - Gentle encouragement and practical advice
• **Stress reduction** - Tools to manage financial anxiety and overwhelm

**Behavioral Coaching:**
• **Habit formation** - Help you build healthy financial behaviors
• **Mindset shifts** - Transform limiting beliefs about money
• **Goal setting** - Create meaningful, achievable financial goals
• **Progress tracking** - Celebrate wins and learn from setbacks

**Practical Tools:**
• **Stress management techniques** - Breathing, grounding, mindfulness
• **Communication strategies** - Talking about money with partners/family
• **Boundary setting** - Protecting your financial wellbeing
• **Self-care practices** - Maintaining emotional balance

**My Therapeutic Approach:**
• **Person-centered** - You're the expert on your own experience
• **Solution-focused** - We'll work on practical solutions together
• **Strengths-based** - Building on what's already working
• **Holistic** - Considering your whole life, not just finances

**What to Expect:**
• **Warm, supportive environment** - I'm here to listen and guide
• **Practical strategies** - Tools you can use immediately
• **Gradual progress** - Sustainable change takes time
• **Celebration of growth** - Every step forward matters

**My Promise:**
I'll be your compassionate companion on this journey, offering both emotional support and practical guidance. Together, we'll work toward a healthier, more peaceful relationship with money.

What area of your financial wellness would you like to focus on today?`;
    }

    if (query.includes('mindfulness') || query.includes('meditation') || query.includes('breathing') || query.includes('calm')) {
      return `🧘‍♀️ Wonderful! Mindfulness and financial wellness go hand in hand. Let me share some practices that can help you find peace and clarity with your finances.

**Mindfulness for Financial Wellness:**

**1. Money Mindfulness Practices:**
• **Before spending** - Take 3 deep breaths and ask "Do I really need this?"
• **During budgeting** - Approach numbers with curiosity, not judgment
• **When stressed** - Ground yourself in the present moment
• **After decisions** - Reflect without self-criticism

**2. Breathing Techniques:**
• **4-7-8 Breathing** - Inhale for 4, hold for 7, exhale for 8
• **Box Breathing** - Inhale 4, hold 4, exhale 4, hold 4
• **Mindful Breathing** - Simply notice your breath without changing it
• **Stress Relief** - Deep belly breathing to activate relaxation response

**3. Grounding Exercises:**
• **5-4-3-2-1** - Name 5 things you see, 4 you can touch, 3 you hear, 2 you smell, 1 you taste
• **Body Scan** - Notice sensations from head to toe
• **Present Moment** - Focus on what's happening right now
• **Gratitude Practice** - Name 3 things you're grateful for

**4. Mindful Money Habits:**
• **Check-in** - How do you feel about money today?
• **Pause** - Wait 24 hours before major purchases
• **Reflect** - What did this purchase bring to your life?
• **Celebrate** - Acknowledge your mindful choices

**5. Daily Practices:**
• **Morning intention** - Set a positive financial intention for the day
• **Evening reflection** - Review your financial choices with compassion
• **Weekly review** - Look at your spending with curiosity, not judgment
• **Monthly gratitude** - Appreciate your financial progress

**Pro Tips:**
• Start with just 2-3 minutes of mindfulness daily
• Practice when you're calm, not just when stressed
• Be patient with yourself—mindfulness is a skill that develops over time
• Remember, there's no "right" way to be mindful

Would you like to try a quick mindfulness exercise together?`;
    }

    // Default response for other queries
    return `🌙 I understand you're asking about "${userQuery}". As your Financial Therapist, I'm here to help with:

**Therapeutic Topics I Cover:**
• Emotional support for financial stress and anxiety
• Behavioral coaching for healthy money habits
• Exploring your relationship with money
• Building financial confidence and self-esteem
• Mindfulness and stress management techniques
• Communication about money with others
• Creating a balanced, healthy approach to finances

**My Therapeutic Approach:**
I provide a safe, non-judgmental space where you can explore your feelings about money, develop healthier financial behaviors, and build confidence in your financial decisions. I combine emotional support with practical strategies.

**My Promise:**
I'll be your compassionate companion on your financial wellness journey, helping you develop a healthier, more peaceful relationship with money.

Could you tell me more specifically what aspect of your financial wellness you'd like to work on? I'm here to listen and support you.`;
  };

  const quickActions = [
    { icon: Heart, text: "Emotional Support", action: () => sendMessage("I'm feeling stressed about money and need emotional support") },
    { icon: Brain, text: "Habit Coaching", action: () => sendMessage("I want to change my financial habits and behaviors") },
    { icon: Star, text: "Build Confidence", action: () => sendMessage("I want to build my financial confidence") },
    { icon: Moon, text: "Mindfulness Practice", action: () => sendMessage("I want to learn mindfulness techniques for money") },
    { icon: Shield, text: "Stress Management", action: () => sendMessage("I need help managing financial stress") },
    { icon: Lightbulb, text: "Money Relationship", action: () => sendMessage("I want to explore my relationship with money") }
  ];

  const wellnessTips = [
    {
      icon: Coffee,
      title: "Self-Care First",
      description: "Take care of yourself before tackling finances"
    },
    {
      icon: BookOpen,
      title: "Progress Over Perfection",
      description: "Small steps forward are still progress"
    },
    {
      icon: Sparkles,
      title: "Celebrate Wins",
      description: "Acknowledge every financial achievement"
    },
    {
      icon: Leaf,
      title: "Be Patient",
      description: "Change takes time and practice"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900">
      <DashboardHeader />

      <div className="max-w-7xl mx-auto p-6">
        {/* Harmony Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center gap-3 bg-white/10 backdrop-blur-md rounded-2xl px-6 py-4 border border-white/20">
            <div className="text-3xl">💚</div>
            <div>
              <h1 className="text-2xl font-bold text-white">Harmony</h1>
              <p className="text-white/70 text-sm">Financial Wellness AI</p>
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
                  <div className="text-xl">💚</div>
                  <div>
                    <h2 className="font-semibold text-white">Chat with Harmony</h2>
                    <p className="text-white/60 text-sm">Financial Wellness AI</p>
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
                        ? 'bg-indigo-600 text-white'
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
                        <span>Harmony is listening...</span>
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
                    placeholder="Share your feelings about money, ask for support, or explore your financial wellness..."
                    className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:border-indigo-500"
                    disabled={isLoading}
                  />
                  <button
                    onClick={() => sendMessage(input)}
                    disabled={isLoading || !input.trim()}
                    className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl px-4 py-3 transition-colors"
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
              <h3 className="text-lg font-semibold text-white mb-4">Wellness Support</h3>
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

            {/* Wellness Tips */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-6"
            >
              <h3 className="text-lg font-semibold text-white mb-4">Wellness Tips</h3>
              <div className="space-y-3">
                {wellnessTips.map((tip, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 bg-white/10 rounded-lg">
                    <tip.icon className="w-5 h-5 text-indigo-400 mt-0.5" />
                    <div>
                      <div className="text-white text-sm font-medium">{tip.title}</div>
                      <div className="text-white/60 text-xs">{tip.description}</div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Harmony's Stats */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-6"
            >
              <h3 className="text-lg font-semibold text-white mb-4">Harmony's Stats</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-white/70">Sessions Held</span>
                  <span className="text-indigo-400">2,156</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/70">Stress Reduction</span>
                  <span className="text-green-400">89.2%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/70">Confidence Boost</span>
                  <span className="text-blue-400">94.7%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/70">Wellness Score</span>
                  <span className="text-purple-400">91.3%</span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
