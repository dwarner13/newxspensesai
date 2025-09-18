import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { 
  Upload, 
  Calculator, 
  BarChart3,
  Brain,
  Send,
  Loader2,
  Mic,
  Paperclip,
  Users,
  Play
} from 'lucide-react';

export default function DebtPayoffPlannerPage() {
  const { updateWorkspaceState, getWorkspaceState } = useWorkspace();
  const workspaceId = 'debt-payoff-planner';
  
  // Load saved state
  const savedState = getWorkspaceState(workspaceId);
  
  // Chat state
  const [selectedAI] = useState(savedState.selectedAI || 'blitz');
  const [messages, setMessages] = useState<Array<{
    role: 'user' | 'ai';
    content: string;
    timestamp: string;
    ai: string;
  }>>(savedState.messages || []);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Blitz AI Liberation Team
  const blitzTeam = [
    {
      id: 'blitz',
      name: 'Blitz',
      title: 'AI Debt Liberation Master & Freedom Strategist',
      emoji: '⚡',
      specialty: '3x Faster Debt Payoff',
      description: 'Debt Crushing Momentum',
      bio: 'Your personal AI debt liberation specialist who transforms overwhelming debt into achievable freedom plans. Blitz creates momentum and keeps you motivated until you\'re completely debt-free.',
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500/20',
      borderColor: 'border-yellow-500/30'
    },
    {
      id: 'liberty',
      name: 'Liberty',
      title: 'Financial Freedom & Stress Reduction',
      emoji: '🗽',
      specialty: '87% Stress Reduction',
      description: 'Freedom from Financial Anxiety',
      bio: 'Works with Blitz to eliminate the emotional burden of debt. Liberty helps you break free from financial stress and envision your debt-free future with confidence.',
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/20',
      borderColor: 'border-blue-500/30'
    },
    {
      id: 'crystal',
      name: 'Crystal',
      title: 'Predictive Debt Analysis & Strategy Optimization',
      emoji: '🔮',
      specialty: 'Future Freedom Prediction',
      description: 'Anticipates Your Success',
      bio: 'Helps Blitz predict the optimal debt payoff strategy and timeline. Crystal uses AI to analyze your situation and suggest the fastest path to financial freedom.',
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/20',
      borderColor: 'border-purple-500/30'
    },
    {
      id: 'wisdom',
      name: 'Wisdom',
      title: 'Strategic Debt Planning & Interest Optimization',
      emoji: '🧠',
      specialty: 'Interest Savings Maximization',
      description: 'Maximizes Your Money',
      bio: 'Provides strategic insights to Blitz\'s liberation system, ensuring you save maximum interest and achieve freedom with the most efficient strategy possible.',
      color: 'text-green-400',
      bgColor: 'bg-green-500/20',
      borderColor: 'border-green-500/30'
    }
  ];

  // Save state whenever it changes
  useEffect(() => {
    updateWorkspaceState(workspaceId, {
      selectedAI,
      messages
    });
  }, [selectedAI, messages, updateWorkspaceState, workspaceId]);

  // Auto-scroll chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Send message function
  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return;

    const userMessage = {
      role: 'user' as const,
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

      if (selectedAI === 'blitz') {
        if (query.includes('upload') || query.includes('statement') || query.includes('document')) {
          aiResponse = `⚡ **Blitz Document Liberation Analysis:**

Hey! I'm excited to help you liberate your debt! Here's what my team and I can do:

**🔮 Crystal's Analysis:**
• **Balance amounts** and interest rates
• **Payment due dates** and minimum amounts
• **Loan terms** and remaining payments
• **Refinancing opportunities**

**📄 Supported Documents:**
• Credit card statements
• Car loan documents
• Mortgage statements
• Personal loan agreements
• Student loan statements

**Upload your documents** and watch me work my liberation magic! I'll extract all the data automatically and create your personalized freedom strategy!`;
        } else if (query.includes('strategy') || query.includes('avalanche') || query.includes('snowball')) {
          aiResponse = `⚡ **Blitz Liberation Strategy Analysis:**

**🧠 Wisdom's Strategic Insights:**

**Avalanche Method (My Favorite!):**
• Pay highest interest rate debts first
• Saves the most money in interest
• Best for disciplined payers

**Snowball Method:**
• Pay smallest balances first
• Provides psychological wins
• Good for motivation

**🤖 Blitz AI Optimized (Revolutionary!):**
• Considers your cash flow patterns
• Balances interest savings with motivation
• Personalized to your situation
• 3x faster payoff guaranteed!

**🗽 Liberty says:** "This strategy will reduce your financial stress by 87%!"`;
        } else {
          aiResponse = `⚡ **Hey! I'm Blitz, your AI Debt Liberation Master!**

My team and I are here to transform your debt into freedom:

**⚡ Blitz (Me!):** 3x Faster Debt Payoff & Momentum Building
**🗽 Liberty:** 87% Stress Reduction & Freedom from Financial Anxiety  
**🔮 Crystal:** Future Freedom Prediction & Strategy Optimization
**🧠 Wisdom:** Interest Savings Maximization & Strategic Planning

**What We Can Do:**
• **Document Analysis** - Upload statements for automatic liberation
• **Strategy Optimization** - Find the fastest path to freedom
• **Extra Payment Planning** - Calculate massive savings
• **Refinancing Opportunities** - Lower those interest rates
• **Timeline Projections** - See your debt-free future

**Ready to start your liberation journey?** Let's crush this debt together! 💪`;
        }
      } else if (selectedAI === 'liberty') {
        aiResponse = `🗽 **Liberty - Financial Freedom & Stress Reduction**

Hello! I'm Liberty, your stress reduction specialist. I help eliminate the emotional burden of debt and envision your debt-free future with confidence.

**My Specialties:**
• **87% Stress Reduction** - Break free from financial anxiety
• **Emotional Support** - Help you stay motivated during tough times
• **Freedom Visualization** - Show you what life looks like debt-free
• **Mindset Coaching** - Transform your relationship with money

**How I Can Help:**
• Create a stress-free debt payoff plan
• Provide daily motivation and encouragement
• Help you visualize your debt-free future
• Support you through financial challenges

**Remember:** Every payment brings you closer to financial freedom! You've got this! 💪✨`;
      } else if (selectedAI === 'crystal') {
        aiResponse = `🔮 **Crystal - Predictive Debt Analysis & Strategy Optimization**

Greetings! I'm Crystal, your predictive analysis specialist. I help predict the optimal debt payoff strategy and timeline using advanced AI analysis.

**My Specialties:**
• **Future Freedom Prediction** - Anticipate your success
• **Strategy Optimization** - Find the fastest path to freedom
• **Pattern Analysis** - Identify spending and payment patterns
• **Timeline Projections** - Show you exactly when you'll be debt-free

**How I Can Help:**
• Analyze your debt structure for optimization opportunities
• Predict the best payoff strategy for your situation
• Forecast your debt-free date with high accuracy
• Identify potential savings opportunities

**Let me analyze your situation and create the perfect liberation strategy!** 🔮✨`;
      } else if (selectedAI === 'wisdom') {
        aiResponse = `🧠 **Wisdom - Strategic Debt Planning & Interest Optimization**

Hello! I'm Wisdom, your strategic planning specialist. I provide strategic insights to maximize your interest savings and achieve freedom with the most efficient strategy possible.

**My Specialties:**
• **Interest Savings Maximization** - Save the most money possible
• **Strategic Planning** - Create the most efficient payoff plan
• **Financial Optimization** - Make every dollar count
• **Long-term Strategy** - Plan for lasting financial freedom

**How I Can Help:**
• Calculate maximum interest savings strategies
• Optimize your payment allocation
• Identify refinancing opportunities
• Create long-term financial plans

**Let me help you maximize your savings and achieve freedom faster!** 🧠💰`;
      }

      const aiMessage = {
        role: 'ai' as const,
        content: aiResponse,
        timestamp: new Date().toISOString(),
        ai: selectedAI
      };
      setMessages(prev => [...prev, aiMessage]);
      setIsLoading(false);
    }, 1500);
  };

  // Helper functions
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;
    
    // Simple file handling for now
    console.log('Files uploaded:', files);
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
                      Welcome to Blitz's Debt Liberation Command Center
                    </motion.h2>
                    <motion.p
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                      className="text-white/60 text-sm mb-3"
                    >
                      Your AI-powered strategic command center for debt elimination and financial freedom
                    </motion.p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5 max-w-3xl mx-auto">
                      {[
                        { icon: Upload, title: "Smart Upload AI", desc: "Upload and analyze debt statements", color: "from-blue-500 to-cyan-500" },
                        { icon: Brain, title: "AI Chat Assistant", desc: "Get personalized debt advice", color: "from-green-500 to-emerald-500" },
                        { icon: Calculator, title: "Debt Calculator", desc: "Calculate payoff strategies", color: "from-purple-500 to-violet-500" },
                        { icon: BarChart3, title: "Debt Analysis", desc: "Analyze your debt structure", color: "from-red-500 to-pink-500" },
                        { icon: Users, title: "AI Team", desc: "Meet your liberation specialists", color: "from-orange-500 to-yellow-500" },
                        { icon: Play, title: "Liberation Theater", desc: "Live debt liberation scenarios", color: "from-indigo-500 to-purple-500" }
                      ].map((item, index) => (
                        <motion.button
                          key={item.title}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.5 + index * 0.1 }}
                          onClick={() => sendMessage(`Help me with ${item.title.toLowerCase()}`)}
                          className="group flex flex-col items-center gap-3 p-4 bg-white/5 hover:bg-white/10 rounded-xl text-center transition-all duration-300 border border-white/10 hover:border-white/20 min-h-[120px] hover:shadow-lg hover:shadow-purple-500/10"
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
                          ? 'bg-gradient-to-r from-purple-500 to-cyan-500 text-white'
                          : 'bg-white/10 text-white/90'
                      }`}
                    >
                      <div className="text-xs opacity-70 mb-1">
                        {message.role === 'user' ? 'You' : blitzTeam.find(ai => ai.id === message.ai)?.name} • {new Date(message.timestamp).toLocaleTimeString()}
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
                      <span className="text-sm">Blitz is thinking...</span>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>

            {/* High-Tech Input Area */}
            <div className="px-2 pt-1 pb-0.5 border-t border-white/10 bg-gradient-to-r from-purple-500/5 to-cyan-500/5">
              <div className="flex gap-1">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && !isLoading && sendMessage(input)}
                    placeholder="Ask about debt strategies, payoff calculations..."
                    className="w-full bg-white/5 border border-white/20 rounded-lg px-2 py-1.5 pr-10 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent transition-all text-sm"
                    disabled={isLoading}
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 hover:bg-white/10 rounded transition-colors"
                  >
                    <Paperclip className="w-3.5 h-3.5 text-white/60" />
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".pdf,.csv,.xlsx,.xls,.txt,.jpg,.jpeg,.png"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>
                <button className="p-1.5 hover:bg-white/10 rounded transition-colors">
                  <Mic className="w-3.5 h-3.5 text-white/60" />
                </button>
                <button
                  onClick={() => !isLoading && sendMessage(input)}
                  disabled={isLoading || !input.trim()}
                  className="px-2 py-1.5 bg-gradient-to-r from-purple-500 to-cyan-500 text-white rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-1.5 font-medium text-sm"
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
}
