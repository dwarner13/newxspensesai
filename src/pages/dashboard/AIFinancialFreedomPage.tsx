import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  Flag, 
  Send, 
  Loader2,
  Shield,
  Lightbulb,
  BarChart3,
  MessageCircle,
  Users,
  Clock,
  Play,
  Calculator
} from 'lucide-react';

// AI Financial Freedom Division Interfaces
interface AIFreedomSpecialist {
  id: string;
  name: string;
  title: string;
  emoji: string;
  specialty: string;
  description: string;
  bio: string;
  color: string;
  bgColor: string;
  borderColor: string;
  status: 'active' | 'working' | 'idle';
  currentTask?: string;
  performance: number;
}

interface FreedomMessage {
  role: 'user' | 'ai';
  content: string;
  timestamp: string;
  ai: string;
}

interface FreedomStats {
  freedomScore: number;
  stressReduction: number;
  timeToFreedom: number;
  hiddenOpportunities: number;
  teamPerformance: number;
  liberationProgress: number;
}

interface LiberationStage {
  id: string;
  title: string;
  description: string;
  emoji: string;
  status: 'completed' | 'current' | 'upcoming';
  progress: number;
  color: string;
}

export default function AIFinancialFreedomPage() {
  // View state
  const [activeView, setActiveView] = useState('overview');
  const [selectedAI, setSelectedAI] = useState('liberty');
  
  // Chat state
  const [messages, setMessages] = useState<FreedomMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Freedom stats
  const [freedomStats, setFreedomStats] = useState<FreedomStats>({
    freedomScore: 30,
    stressReduction: 87,
    timeToFreedom: 7.5,
    hiddenOpportunities: 4000,
    teamPerformance: 92,
    liberationProgress: 34
  });

  // AI Freedom Team
  const freedomTeam: AIFreedomSpecialist[] = [
    {
      id: 'liberty',
      name: 'Liberty',
      title: 'Financial Freedom & Liberation Specialist',
      emoji: '🗽',
      specialty: 'Freedom from Financial Chains',
      description: '87% Stress Reduction & Freedom Mapping',
      bio: 'Your AI liberation specialist who breaks the chains of financial stress and maps your path to complete financial freedom. Liberty transforms overwhelming financial situations into achievable freedom plans.',
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/20',
      borderColor: 'border-blue-500/30',
      status: 'active',
      currentTask: 'Analyzing your financial liberation path',
      performance: 95
    },
    {
      id: 'crystal',
      name: 'Crystal',
      title: 'Future Financial Prediction & Strategy',
      emoji: '🔮',
      specialty: 'Your Financial Crystal Ball',
      description: 'Predicts Your Freedom Timeline',
      bio: 'Uses advanced AI to predict your exact path to financial freedom. Crystal analyzes your situation and shows you exactly when and how you\'ll achieve complete financial independence.',
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/20',
      borderColor: 'border-purple-500/30',
      status: 'working',
      currentTask: 'Calculating your freedom timeline',
      performance: 88
    },
    {
      id: 'wisdom',
      name: 'Wisdom',
      title: 'Strategic Wealth Building & Optimization',
      emoji: '🧠',
      specialty: 'Maximizes Your Financial Potential',
      description: 'Interest Optimization & Wealth Acceleration',
      bio: 'The strategic mastermind who optimizes every aspect of your financial life. Wisdom ensures you\'re building wealth as efficiently as possible and accelerating your path to freedom.',
      color: 'text-green-400',
      bgColor: 'bg-green-500/20',
      borderColor: 'border-green-500/30',
      status: 'working',
      currentTask: 'Optimizing your wealth strategy',
      performance: 91
    },
    {
      id: 'nova',
      name: 'Nova',
      title: 'Innovation & Financial Breakthroughs',
      emoji: '⭐',
      specialty: 'Discovers Hidden Financial Opportunities',
      description: 'Finds Money You Didn\'t Know You Had',
      bio: 'The innovation specialist who discovers hidden financial opportunities and breakthrough strategies. Nova finds money and opportunities you never knew existed in your financial situation.',
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500/20',
      borderColor: 'border-yellow-500/30',
      status: 'active',
      currentTask: 'Scanning for hidden opportunities',
      performance: 89
    },
    {
      id: 'finley',
      name: 'Finley',
      title: 'Financial Education & Empowerment',
      emoji: '💰',
      specialty: 'Your Personal Financial Coach',
      description: 'Teaches You to Fish, Not Just Gives You Fish',
      bio: 'Your personal financial coach who educates and empowers you. Finley doesn\'t just give you solutions - they teach you the principles of financial freedom so you can stay free forever.',
      color: 'text-orange-400',
      bgColor: 'bg-orange-500/20',
      borderColor: 'border-orange-500/30',
      status: 'idle',
      currentTask: 'Ready to educate and empower',
      performance: 87
    }
  ];

  // Liberation stages
  const liberationStages: LiberationStage[] = [
    {
      id: 'assessment',
      title: 'Financial Assessment',
      description: 'Complete analysis of your current financial situation',
      emoji: '🔍',
      status: 'completed',
      progress: 100,
      color: 'text-green-400'
    },
    {
      id: 'strategy',
      title: 'Freedom Strategy',
      description: 'Personalized liberation plan creation',
      emoji: '🗺️',
      status: 'current',
      progress: 75,
      color: 'text-blue-400'
    },
    {
      id: 'execution',
      title: 'Liberation Execution',
      description: 'Implementing your freedom strategy',
      emoji: '⚡',
      status: 'upcoming',
      progress: 25,
      color: 'text-yellow-400'
    },
    {
      id: 'optimization',
      title: 'Wealth Optimization',
      description: 'Maximizing your financial potential',
      emoji: '🚀',
      status: 'upcoming',
      progress: 0,
      color: 'text-purple-400'
    },
    {
      id: 'freedom',
      title: 'Complete Freedom',
      description: 'Achieve financial independence',
      emoji: '🎉',
      status: 'upcoming',
      progress: 0,
      color: 'text-pink-400'
    }
  ];

  // Simulate live updates
  useEffect(() => {
    const interval = setInterval(() => {
      setFreedomStats(prev => ({
        ...prev,
        freedomScore: Math.min(100, prev.freedomScore + Math.floor(Math.random() * 2)),
        hiddenOpportunities: prev.hiddenOpportunities + Math.floor(Math.random() * 50),
        teamPerformance: Math.min(100, prev.teamPerformance + Math.floor(Math.random() * 3 - 1)),
        liberationProgress: Math.min(100, prev.liberationProgress + Math.floor(Math.random() * 2))
      }));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Auto-scroll chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Send message function
  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return;

    const userMessage: FreedomMessage = {
      role: 'user',
      content: content.trim(),
      timestamp: new Date().toISOString(),
      ai: selectedAI
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    setTimeout(() => {
      const query = content.toLowerCase();
      let aiResponse = '';

      if (selectedAI === 'liberty') {
        if (query.includes('freedom') || query.includes('stress') || query.includes('liberation')) {
          aiResponse = `🗽 **Liberty - Financial Freedom & Liberation Specialist**

Hello! I'm Liberty, your stress reduction specialist. I help eliminate the emotional burden of financial stress and envision your debt-free future with confidence.

**My Specialties:**
• **87% Stress Reduction** - Break free from financial anxiety
• **Freedom Mapping** - Visual roadmap to financial independence
• **Emotional Support** - Help you stay motivated during tough times
• **Liberation Planning** - Transform overwhelming situations into achievable plans

**Current Liberation Status:**
• Freedom Score: ${freedomStats.freedomScore}/100
• Stress Reduction: ${freedomStats.stressReduction}%
• Time to Freedom: ${freedomStats.timeToFreedom} years
• Hidden Opportunities: $${freedomStats.hiddenOpportunities.toLocaleString()}

**How I Can Help:**
• Create a stress-free financial freedom plan
• Provide daily motivation and encouragement
• Help you visualize your debt-free future
• Support you through financial challenges

**Remember:** Every step brings you closer to financial freedom! You've got this! 💪✨`;
        } else {
          aiResponse = `🗽 **Hey there! I'm Liberty, your Financial Freedom AI!**

I'm here to guide you on your path to financial independence, helping you break free from debt, build wealth, and achieve true financial freedom.

**My Team and I Can Help With:**
• **Financial Assessment** - Complete analysis of your situation
• **Freedom Strategy** - Personalized liberation plan
• **Stress Reduction** - 87% reduction in financial anxiety
• **Wealth Building** - Strategic wealth accumulation
• **Hidden Opportunities** - Find money you didn't know you had

**Current Status:**
• Freedom Score: ${freedomStats.freedomScore}/100
• Liberation Progress: ${freedomStats.liberationProgress}%
• Team Performance: ${freedomStats.teamPerformance}%

What aspect of your financial freedom journey would you like to explore?`;
        }
      } else if (selectedAI === 'crystal') {
        aiResponse = `🔮 **Crystal - Future Financial Prediction & Strategy**

Greetings! I'm Crystal, your predictive analysis specialist. I help predict the optimal path to financial freedom using advanced AI analysis.

**My Specialties:**
• **Future Freedom Prediction** - Anticipate your success
• **Timeline Analysis** - Show you exactly when you'll be free
• **Strategy Optimization** - Find the fastest path to freedom
• **Pattern Recognition** - Identify financial patterns and trends

**Current Analysis:**
• Predicted Freedom Timeline: ${freedomStats.timeToFreedom} years
• Freedom Probability: ${freedomStats.freedomScore}%
• Optimal Strategy: AI-Optimized Liberation Plan
• Risk Assessment: Low to Moderate

**How I Can Help:**
• Analyze your financial structure for optimization opportunities
• Predict the best freedom strategy for your situation
• Forecast your financial independence date with high accuracy
• Identify potential savings and investment opportunities

**Let me analyze your situation and create the perfect liberation strategy!** 🔮✨`;
      } else if (selectedAI === 'wisdom') {
        aiResponse = `🧠 **Wisdom - Strategic Wealth Building & Optimization**

Hello! I'm Wisdom, your strategic planning specialist. I provide strategic insights to maximize your financial potential and accelerate your path to freedom.

**My Specialties:**
• **Wealth Maximization** - Build wealth as efficiently as possible
• **Strategic Planning** - Create the most efficient freedom plan
• **Financial Optimization** - Make every dollar count
• **Long-term Strategy** - Plan for lasting financial freedom

**Current Optimization:**
• Wealth Building Efficiency: ${freedomStats.teamPerformance}%
• Investment Optimization: 3 strategies identified
• Savings Rate: Recommended 25%+ increase
• Debt-to-Income Ratio: Optimization opportunities found

**How I Can Help:**
• Calculate maximum wealth building strategies
• Optimize your investment allocation
• Identify refinancing and consolidation opportunities
• Create long-term financial plans

**Let me help you maximize your wealth and achieve freedom faster!** 🧠💰`;
      } else if (selectedAI === 'nova') {
        aiResponse = `⭐ **Nova - Innovation & Financial Breakthroughs**

Hello! I'm Nova, your innovation specialist. I discover hidden financial opportunities and breakthrough strategies that can transform your financial situation.

**My Specialties:**
• **Hidden Opportunity Discovery** - Find money you didn't know you had
• **Breakthrough Strategies** - Revolutionary financial approaches
• **Innovation Analysis** - Identify cutting-edge opportunities
• **Financial Creativity** - Think outside the box for solutions

**Recent Discoveries:**
• Hidden Opportunities Found: $${freedomStats.hiddenOpportunities.toLocaleString()}
• Breakthrough Strategies: 5 identified
• Innovation Score: 89/100
• Creative Solutions: 12 generated

**How I Can Help:**
• Scan your financial situation for hidden opportunities
• Identify breakthrough strategies and approaches
• Find creative ways to increase income and reduce expenses
• Discover innovative investment and savings opportunities

**Let me scan your situation for hidden financial gold!** ⭐💎`;
      } else if (selectedAI === 'finley') {
        aiResponse = `💰 **Finley - Financial Education & Empowerment**

Hello! I'm Finley, your personal financial coach. I educate and empower you with the knowledge and skills needed for lasting financial freedom.

**My Specialties:**
• **Financial Education** - Teach you the principles of wealth
• **Empowerment Coaching** - Build your financial confidence
• **Skill Development** - Master money management
• **Long-term Success** - Stay free forever

**Current Learning Path:**
• Financial Literacy Level: Intermediate
• Skills Mastered: 8/15
• Confidence Score: 85/100
• Knowledge Retention: 92%

**How I Can Help:**
• Teach you fundamental financial principles
• Build your money management skills
• Increase your financial confidence
• Prepare you for long-term success

**Let me educate and empower you for lasting financial freedom!** 💰🎓`;
      }

      const aiMessage: FreedomMessage = {
        role: 'ai',
        content: aiResponse,
        timestamp: new Date().toISOString(),
        ai: selectedAI
      };
      setMessages(prev => [...prev, aiMessage]);
      setIsLoading(false);
    }, 1500);
  };

  return (
    <>
      <div className="max-w-7xl mx-auto p-6 pt-32">
        {/* Main Chat Interface */}
        <div className="flex-1 flex flex-col">
          <div className="flex-1 flex flex-col">
            {/* Chat Messages Area */}
            <div className="flex-1 overflow-y-auto p-2 space-y-2 min-h-[400px]" ref={messagesEndRef}>
              {messages.length === 0 ? (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center max-w-2xl">
                    <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
                      className="text-xl font-bold text-white mb-1"
                    >
                      Welcome to the AI Financial Freedom Division
                    </motion.h2>
                    <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                      className="text-white/60 text-sm mb-3"
                    >
                      Your AI-powered team for complete financial liberation and stress-free wealth building
                    </motion.p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5 max-w-3xl mx-auto">
                      {[
                        { icon: Flag, title: "Freedom Assessment", desc: "Complete financial freedom analysis", color: "from-green-500 to-emerald-500" },
                        { icon: Shield, title: "Stress Liberation", desc: "87% stress reduction strategies", color: "from-blue-500 to-cyan-500" },
                        { icon: Users, title: "AI Freedom Team", desc: "Meet your liberation specialists", color: "from-purple-500 to-violet-500" },
                        { icon: Calculator, title: "Freedom Calculator", desc: "Calculate your liberation timeline", color: "from-orange-500 to-yellow-500" },
                        { icon: Play, title: "Liberation Theater", desc: "Live freedom strategy scenarios", color: "from-pink-500 to-rose-500" },
                        { icon: MessageCircle, title: "Freedom Chat", desc: "Chat with AI liberation experts", color: "from-indigo-500 to-purple-500" }
                      ].map((item, index) => (
                        <motion.button
                          key={item.title}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.5 + index * 0.1 }}
                          onClick={() => sendMessage(`Help me with ${item.title.toLowerCase()}`)}
                          className="group flex flex-col items-center gap-3 p-4 bg-white/5 hover:bg-white/10 rounded-xl text-center transition-all duration-300 border border-white/10 hover:border-white/20 min-h-[120px] hover:shadow-lg hover:shadow-green-500/10"
        >
                          <div className={`w-12 h-12 bg-gradient-to-br ${item.color} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform`}>
                            <item.icon className="w-6 h-6 text-white" />
          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-semibold text-white mb-1">{item.title}</h3>
                            <p className="text-white/60 text-xs leading-tight">{item.desc}</p>
                    </div>
                        </motion.button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                messages.map((message, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-md px-2 py-1.5 rounded text-left ${
                      message.role === 'user'
                          ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white'
                          : 'bg-white/10 text-white/90'
                      }`}
                    >
                      <div className="text-xs opacity-70 mb-1">
                        {message.role === 'user' ? 'You' : freedomTeam.find(ai => ai.id === message.ai)?.name} • {new Date(message.timestamp).toLocaleTimeString()}
                      </div>
                      <div className="text-sm">{message.content}</div>
                    </div>
                  </motion.div>
                ))
              )}
                {isLoading && (
                  <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                    className="flex justify-start"
                  >
                  <div className="bg-white/10 text-white/90 max-w-md px-2 py-1.5 rounded text-left">
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-sm">Liberty is thinking...</span>
                    </div>
                    </div>
                  </motion.div>
                )}
              </div>

            {/* High-Tech Input Area */}
            <div className="px-2 pt-1 pb-0.5 border-t border-white/10 bg-gradient-to-r from-green-500/5 to-emerald-500/5">
              <div className="flex gap-1">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && !isLoading && sendMessage(input)}
                    placeholder="Ask about financial freedom, stress reduction, liberation strategies..."
                    className="w-full bg-white/5 border border-white/20 rounded-lg px-2 py-1.5 pr-10 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-transparent transition-all text-sm"
                    disabled={isLoading}
                  />
                </div>
                  <button
                  onClick={() => !isLoading && sendMessage(input)}
                    disabled={isLoading || !input.trim()}
                  className="px-2 py-1.5 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-1.5 font-medium text-sm"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Send</span>
                    </>
                  )}
                  </button>
                </div>
              </div>
          </div>
        </div>

      </div>
    </>
  );
};
