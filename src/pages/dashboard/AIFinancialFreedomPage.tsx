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
  const [messages, setMessages] = useState<FreedomMessage[]>([
    {
      role: 'ai',
      content: "🗽 Welcome to the AI Financial Freedom Division! I'm Liberty, and together with my team (Crystal, Wisdom, Nova, and Finley), we're here to transform your financial stress into complete freedom with 87% stress reduction and personalized liberation strategies. What aspect of your financial freedom journey would you like to explore?",
      timestamp: new Date().toISOString(),
      ai: 'liberty'
    }
  ]);
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 sm:p-6 pb-20">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">AI Financial Freedom Division</h1>
            <p className="text-white/70 text-sm sm:text-base">Where 5 AI specialists collaborate to transform your financial stress into complete freedom with 87% stress reduction and personalized liberation strategies</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-green-400 text-sm font-medium">AI Team Active</span>
            </div>
            <div className="text-2xl">🗽</div>
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
          { key: 'overview', label: 'Freedom Overview', icon: BarChart3 },
          { key: 'team', label: 'AI Team', icon: Users },
          { key: 'theater', label: 'Freedom Theater', icon: Play },
          { key: 'calculator', label: 'Freedom Calculator', icon: Calculator },
          { key: 'chat', label: 'AI Chat', icon: MessageCircle }
        ].map(({ key, label, icon: Icon }) => (
          <motion.button
            key={key}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setActiveView(key)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              activeView === key
                ? 'bg-green-500 text-white'
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
          {/* Freedom Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/70 text-sm">Freedom Score</p>
                  <p className="text-2xl font-bold text-green-400">{freedomStats.freedomScore}/100</p>
                </div>
                <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
                  <Flag className="w-6 h-6 text-green-400" />
                </div>
              </div>
            </div>

            <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/70 text-sm">Stress Reduction</p>
                  <p className="text-2xl font-bold text-blue-400">{freedomStats.stressReduction}%</p>
                </div>
                <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
                  <Shield className="w-6 h-6 text-blue-400" />
                </div>
              </div>
            </div>

            <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/70 text-sm">Time to Freedom</p>
                  <p className="text-2xl font-bold text-purple-400">{freedomStats.timeToFreedom} years</p>
                </div>
                <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center">
                  <Clock className="w-6 h-6 text-purple-400" />
                </div>
              </div>
            </div>

            <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/70 text-sm">Hidden Opportunities</p>
                  <p className="text-2xl font-bold text-yellow-400">${freedomStats.hiddenOpportunities.toLocaleString()}</p>
                </div>
                <div className="w-12 h-12 bg-yellow-500/20 rounded-lg flex items-center justify-center">
                  <Lightbulb className="w-6 h-6 text-yellow-400" />
                </div>
              </div>
            </div>
          </div>

          {/* Liberation Progress */}
          <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Liberation Progress</h3>
            <div className="space-y-4">
              {liberationStages.map((stage, index) => (
                <div key={stage.id} className="flex items-center gap-4">
                  <div className={`text-2xl ${stage.color}`}>{stage.emoji}</div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-white font-medium">{stage.title}</h4>
                      <span className={`text-sm ${stage.color}`}>{stage.progress}%</span>
                    </div>
                    <p className="text-white/70 text-sm mb-2">{stage.description}</p>
                    <div className="w-full bg-white/10 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-500 ${
                          stage.status === 'completed' ? 'bg-green-500' :
                          stage.status === 'current' ? 'bg-blue-500' : 'bg-white/20'
                        }`}
                        style={{ width: `${stage.progress}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <button
                onClick={() => setActiveView('calculator')}
                className="flex items-center gap-3 p-4 bg-green-500/20 hover:bg-green-500/30 border border-green-500/30 rounded-lg text-white transition-colors"
              >
                <Calculator className="w-5 h-5" />
                <span>Freedom Calculator</span>
              </button>
              <button
                onClick={() => setActiveView('team')}
                className="flex items-center gap-3 p-4 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 rounded-lg text-white transition-colors"
              >
                <Users className="w-5 h-5" />
                <span>Meet AI Team</span>
              </button>
              <button
                onClick={() => setActiveView('theater')}
                className="flex items-center gap-3 p-4 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 rounded-lg text-white transition-colors"
              >
                <Play className="w-5 h-5" />
                <span>Freedom Theater</span>
              </button>
              <button
                onClick={() => setActiveView('chat')}
                className="flex items-center gap-3 p-4 bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/30 rounded-lg text-white transition-colors"
              >
                <MessageCircle className="w-5 h-5" />
                <span>Chat with AI</span>
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* AI Team Section */}
      {activeView === 'team' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-8"
        >
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-white mb-2">Meet Your AI Financial Freedom Team</h2>
            <p className="text-white/70">Meet the 5 AI specialists who work together to transform your financial stress into complete freedom</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {freedomTeam.map((member) => (
              <div key={member.id} className={`p-6 rounded-xl border ${member.bgColor} ${member.borderColor}`}>
                <div className="flex items-start gap-4 mb-4">
                  <div className="text-4xl">{member.emoji}</div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-white mb-1">{member.name}</h3>
                    <p className={`text-sm font-medium ${member.color} mb-2`}>{member.title}</p>
                    <p className="text-white/70 text-sm">{member.specialty}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className={`w-2 h-2 rounded-full ${
                      member.status === 'active' ? 'bg-green-400' :
                      member.status === 'working' ? 'bg-yellow-400' : 'bg-gray-400'
                    }`}></div>
                    <span className="text-xs text-white/70 capitalize">{member.status}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-white/80 text-sm font-medium">{member.description}</p>
                  <p className="text-white/70 text-sm">{member.bio}</p>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-white/70">Performance</span>
                    <span className={`${member.color} font-medium`}>{member.performance}%</span>
                  </div>
                  {member.currentTask && (
                    <div className="text-xs text-white/60 italic">
                      Currently: {member.currentTask}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Freedom Theater Section */}
      {activeView === 'theater' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-8"
        >
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-white mb-2">Live Financial Freedom Theater</h2>
            <p className="text-white/70">Experience our AI team working together in real-time to create your personalized freedom strategy</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                title: 'Financial Stress Liberation',
                emoji: '😰',
                opportunities: 2400,
                currentState: 'Overwhelmed & Stuck',
                freedomState: 'Complete Financial Freedom',
                timeToFreedom: '4.2 years',
                color: 'text-red-400',
                bgColor: 'bg-red-500/20'
              },
              {
                title: 'Debt Freedom Strategy',
                emoji: '💳',
                opportunities: 3200,
                currentState: 'Trapped & Overwhelmed',
                freedomState: 'Debt-Free & Free',
                timeToFreedom: '3.8 years',
                color: 'text-blue-400',
                bgColor: 'bg-blue-500/20'
              },
              {
                title: 'Savings Transformation',
                emoji: '💰',
                opportunities: 1800,
                currentState: 'Struggling to Save',
                freedomState: 'Automatic Wealth Builder',
                timeToFreedom: '2.1 years',
                color: 'text-green-400',
                bgColor: 'bg-green-500/20'
              },
              {
                title: 'Income Liberation',
                emoji: '📈',
                opportunities: 4200,
                currentState: 'Income Stagnant',
                freedomState: 'Income Magnet',
                timeToFreedom: '18 months',
                color: 'text-purple-400',
                bgColor: 'bg-purple-500/20'
              }
            ].map((scenario, index) => (
              <div key={`scenario-${index}`} className={`p-6 rounded-xl border ${scenario.bgColor} hover:scale-105 transition-transform cursor-pointer`}>
                <div className="text-center">
                  <div className="text-4xl mb-4">{scenario.emoji}</div>
                  <h3 className={`font-bold text-lg ${scenario.color} mb-4`}>{scenario.title}</h3>
                  
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-white/70">Hidden Opportunities</span>
                      <span className="text-white font-semibold">${scenario.opportunities.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/70">Current State</span>
                      <span className="text-white">{scenario.currentState}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/70">Freedom State</span>
                      <span className={`font-semibold ${scenario.color}`}>{scenario.freedomState}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/70">Time to Freedom</span>
                      <span className="text-green-400 font-semibold">{scenario.timeToFreedom}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Freedom Calculator Section */}
      {activeView === 'calculator' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-8"
        >
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-white mb-2">Your Personal Financial Freedom Calculator</h2>
            <p className="text-white/70">Input your financial situation and watch our AI team create your personalized freedom strategy</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Input Form */}
            <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6">
              <h3 className="text-lg font-semibold text-white mb-6">Your Financial Situation</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-white/70 text-sm mb-2">Annual Income</label>
                  <input
                    type="number"
                    placeholder="50000"
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-green-500"
                  />
                </div>

                <div>
                  <label className="block text-white/70 text-sm mb-2">Current Savings</label>
                  <input
                    type="number"
                    placeholder="5000"
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-green-500"
                  />
                </div>

            <div>
                  <label className="block text-white/70 text-sm mb-2">Financial Stress Level (1-10)</label>
                  <div className="flex items-center gap-2">
                    <span className="text-white/70 text-sm">Low Stress</span>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      defaultValue="8"
                      className="flex-1"
                    />
                    <span className="text-white/70 text-sm">High Stress</span>
                  </div>
                </div>

                <button className="w-full px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors font-medium">
                  Calculate My Freedom Strategy
                </button>
              </div>
            </div>

            {/* Results */}
            <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6">
              <h3 className="text-lg font-semibold text-white mb-6">Your Freedom Results</h3>
              
              <div className="space-y-6">
                <div className="text-center">
                  <div className="text-4xl font-bold text-green-400 mb-2">30/100</div>
                  <p className="text-white/70 text-sm">Current Score</p>
                </div>

                <div className="text-center">
                  <div className="text-4xl font-bold text-blue-400 mb-2">75/100</div>
                  <p className="text-white/70 text-sm">With AI Team</p>
                </div>

                <div className="text-center">
                  <div className="text-4xl font-bold text-purple-400 mb-2">7.5 years</div>
                  <p className="text-white/70 text-sm">Time to Financial Freedom</p>
                  <p className="text-green-400 text-sm">Instead of 15+ years!</p>
                </div>

                <div className="text-center">
                  <div className="text-4xl font-bold text-yellow-400 mb-2">$4,000</div>
                  <p className="text-white/70 text-sm">Hidden Opportunities</p>
                  <p className="text-green-400 text-sm">Discovered by our AI team!</p>
                </div>
            </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* AI Chat Section */}
      {activeView === 'chat' && (
            <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-8"
        >
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-white mb-2">AI Chat - Choose Your Specialist</h2>
            <p className="text-white/70">Chat with individual AI specialists who can help in their specific fields</p>
          </div>

          {/* AI Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
            {freedomTeam.map((member) => (
              <button
                key={member.id}
                onClick={() => setSelectedAI(member.id)}
                className={`p-4 rounded-xl border transition-all ${
                  selectedAI === member.id
                    ? `${member.bgColor} ${member.borderColor} scale-105`
                    : 'bg-white/5 border-white/10 hover:bg-white/10'
                }`}
              >
                <div className="text-center">
                  <div className="text-3xl mb-2">{member.emoji}</div>
                  <h3 className="text-lg font-bold text-white mb-1">{member.name}</h3>
                  <p className={`text-sm font-medium ${member.color} mb-2`}>{member.specialty}</p>
                  <p className="text-white/70 text-xs">{member.description}</p>
                </div>
              </button>
            ))}
          </div>

          {/* Chat Interface */}
          <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="text-3xl">{freedomTeam.find(ai => ai.id === selectedAI)?.emoji}</div>
                  <div>
                <h3 className="text-xl font-semibold text-white">
                  Chat with {freedomTeam.find(ai => ai.id === selectedAI)?.name}
                </h3>
                <p className="text-white/70">
                  {freedomTeam.find(ai => ai.id === selectedAI)?.title}
                </p>
                </div>
              </div>

            <div className="h-96 overflow-y-auto p-4 space-y-4 bg-white/5 rounded-lg mb-4">
              {messages.filter(msg => msg.ai === selectedAI).map((message, index) => (
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
                      <span>{freedomTeam.find(ai => ai.id === selectedAI)?.name} is analyzing...</span>
                      </div>
                    </div>
                  </motion.div>
                )}

                <div ref={messagesEndRef} />
              </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !isLoading && sendMessage(input)}
                placeholder={`Ask ${freedomTeam.find(ai => ai.id === selectedAI)?.name} about financial freedom...`}
                className="flex-1 bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:border-green-500"
                    disabled={isLoading}
                  />
                  <button
                    onClick={() => sendMessage(input)}
                    disabled={isLoading || !input.trim()}
                className="bg-green-500 hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg px-4 py-3 transition-colors"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </motion.div>
      )}
    </div>
  );
}
