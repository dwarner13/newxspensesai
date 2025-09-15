import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  Upload, 
  FileText, 
  Calculator, 
  TrendingDown,
  DollarSign,
  BarChart3,
  Brain,
  Zap,
  CheckCircle,
  AlertTriangle,
  Edit,
  Trash2,
  Search,
  CreditCard,
  Home,
  Car,
  MessageCircle,
  Send,
  Loader2
} from 'lucide-react';

// Debt Data Interfaces
interface Debt {
  id: string;
  name: string;
  type: 'credit_card' | 'car_loan' | 'mortgage' | 'personal_loan' | 'student_loan' | 'other';
  balance: number;
  rate: number;
  minPayment: number;
  dueDate: string;
  originalAmount?: number;
  termMonths?: number;
  lastUpdated: string;
  source: 'manual' | 'uploaded';
}


interface UploadedDocument {
  id: string;
  name: string;
  type: string;
  size: number;
  status: 'processing' | 'completed' | 'error';
  extractedData?: Partial<Debt>;
  uploadedAt: string;
}

interface AIRecommendation {
  id: string;
  type: 'refinance' | 'balance_transfer' | 'payment_timing' | 'strategy_change';
  title: string;
  description: string;
  potentialSavings: number;
  confidence: number;
  actionRequired: string;
  priority: 'high' | 'medium' | 'low';
}

export default function DebtPayoffPlannerPage() {
  // View state
  const [activeView, setActiveView] = useState('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  
  // Chat state
  const [selectedAI, setSelectedAI] = useState('blitz');
  const [messages, setMessages] = useState<Array<{
    role: 'user' | 'ai';
    content: string;
    timestamp: string;
    ai: string;
  }>>([
    {
      role: 'ai',
      content: "⚡ Hey there! I'm Blitz, your AI Debt Liberation Master! I'm here to transform your overwhelming debt into an achievable freedom plan with 3x faster payoff strategies. My team and I work 24/7 to keep you motivated and on track. Upload your debt statements or ask me anything about debt liberation!",
      timestamp: new Date().toISOString(),
      ai: 'blitz'
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Debt management
  const [debts] = useState<Debt[]>([
    {
      id: 'cc1',
      name: 'Chase Credit Card',
      type: 'credit_card',
      balance: 3200,
      rate: 22.99,
      minPayment: 85,
      dueDate: '2024-02-15',
      lastUpdated: '2 hours ago',
      source: 'manual'
    },
    {
      id: 'car1',
      name: 'Toyota Car Loan',
      type: 'car_loan',
      balance: 7800,
      rate: 6.49,
      minPayment: 240,
      dueDate: '2024-02-20',
      originalAmount: 25000,
      termMonths: 60,
      lastUpdated: '1 hour ago',
      source: 'manual'
    },
    {
      id: 'mortgage1',
      name: 'Home Mortgage',
      type: 'mortgage',
      balance: 185000,
      rate: 4.25,
      minPayment: 1200,
      dueDate: '2024-02-01',
      originalAmount: 250000,
      termMonths: 360,
      lastUpdated: '30 minutes ago',
      source: 'manual'
    }
  ]);

  // Simulation state
  const [extraPayment, setExtraPayment] = useState(0);
  const [selectedStrategy, setSelectedStrategy] = useState('avalanche');
  const [showSimulation, setShowSimulation] = useState(false);

  // Document upload
  const [uploadedDocs, setUploadedDocs] = useState<UploadedDocument[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);


  // Live calculations
  const [liveStats, setLiveStats] = useState({
    totalDebt: 196000,
    totalInterest: 45000,
    payoffMonths: 84,
    monthlyPayment: 1525,
    interestSaved: 0
  });

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


  // Liberation Examples
  const liberationExamples = [
    {
      type: 'Car Loan',
      emoji: '🚗',
      debtAmount: 25000,
      currentTime: '5.5 years',
      freedomTime: '3.2 years',
      interestSaved: 3200,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/20'
    },
    {
      type: 'Credit Card',
      emoji: '💳',
      debtAmount: 15000,
      currentTime: '7 years',
      freedomTime: '18 months',
      interestSaved: 8400,
      color: 'text-red-400',
      bgColor: 'bg-red-500/20'
    },
    {
      type: 'Student Loan',
      emoji: '🎓',
      debtAmount: 35000,
      currentTime: '10 years',
      freedomTime: '4.8 years',
      interestSaved: 12600,
      color: 'text-green-400',
      bgColor: 'bg-green-500/20'
    },
    {
      type: 'Personal Loan',
      emoji: '📋',
      debtAmount: 20000,
      currentTime: '6 years',
      freedomTime: '2.9 years',
      interestSaved: 4800,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/20'
    }
  ];

  // Mock AI recommendations with Blitz team integration
  const aiRecommendations: AIRecommendation[] = [
    {
      id: 'blitz_refinance',
      type: 'refinance',
      title: 'Blitz Refinancing Strategy',
      description: 'Blitz recommends refinancing your 22.99% credit card with a personal loan at 8.5% APR',
      potentialSavings: 1200,
      confidence: 92,
      actionRequired: 'Apply for personal loan',
      priority: 'high'
    },
    {
      id: 'liberty_balance',
      type: 'balance_transfer',
      title: 'Liberty Balance Transfer',
      description: 'Liberty found a 0% APR balance transfer opportunity for 18 months',
      potentialSavings: 800,
      confidence: 88,
      actionRequired: 'Apply for balance transfer card',
      priority: 'high'
    },
    {
      id: 'crystal_timing',
      type: 'payment_timing',
      title: 'Crystal Payment Optimization',
      description: 'Crystal suggests making extra payments on the 15th for maximum impact',
      potentialSavings: 300,
      confidence: 85,
      actionRequired: 'Set up automatic payments',
      priority: 'medium'
    },
    {
      id: 'wisdom_strategy',
      type: 'strategy_change',
      title: 'Wisdom Strategy Enhancement',
      description: 'Wisdom recommends switching to avalanche method for maximum interest savings',
      potentialSavings: 500,
      confidence: 90,
      actionRequired: 'Update payoff strategy',
      priority: 'medium'
    }
  ];

  // Simulate live updates
  useEffect(() => {
    const interval = setInterval(() => {
      setLiveStats(prev => ({
        ...prev,
        totalDebt: prev.totalDebt + Math.floor(Math.random() * 10 - 5),
        interestSaved: prev.interestSaved + Math.floor(Math.random() * 5)
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

**Your Current Strategy:** ${selectedStrategy.charAt(0).toUpperCase() + selectedStrategy.slice(1)}
**Potential Savings:** $${liveStats.interestSaved.toLocaleString()} with extra payments

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

**Current Liberation Status:**
• Total Debt: $${liveStats.totalDebt.toLocaleString()}
• Monthly Payment: $${liveStats.monthlyPayment.toLocaleString()}
• Freedom Timeline: ${liveStats.payoffMonths} months

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

**Current Analysis:**
• Your optimal strategy: ${selectedStrategy.charAt(0).toUpperCase() + selectedStrategy.slice(1)}
• Predicted payoff time: ${liveStats.payoffMonths} months
• Potential savings: $${liveStats.interestSaved.toLocaleString()}

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

**Current Optimization:**
• Total potential savings: $${liveStats.interestSaved.toLocaleString()}
• Optimal monthly payment: $${liveStats.monthlyPayment.toLocaleString()}
• Interest rate optimization opportunities: 3 identified

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

    setIsUploading(true);
    
    Array.from(files).forEach((file, index) => {
      const doc: UploadedDocument = {
        id: `doc-${Date.now()}-${index}`,
        name: file.name,
        type: file.type,
        size: file.size,
        status: 'processing',
        uploadedAt: new Date().toISOString()
      };

      setUploadedDocs(prev => [...prev, doc]);

      // Simulate AI processing
      setTimeout(() => {
        setUploadedDocs(prev => prev.map(d => 
          d.id === doc.id 
            ? { 
                ...d, 
                status: 'completed',
                extractedData: {
                  name: file.name.includes('credit') ? 'Credit Card' : 
                        file.name.includes('car') ? 'Car Loan' : 'Personal Loan',
                  balance: Math.floor(Math.random() * 10000) + 1000,
                  rate: Math.random() * 20 + 5,
                  minPayment: Math.floor(Math.random() * 200) + 50
                }
              }
            : d
        ));
      }, 2000 + index * 1000);
    });

    setTimeout(() => setIsUploading(false), 3000);
  };


  const getDebtIcon = (type: string) => {
    switch (type) {
      case 'credit_card': return <CreditCard className="w-5 h-5" />;
      case 'car_loan': return <Car className="w-5 h-5" />;
      case 'mortgage': return <Home className="w-5 h-5" />;
      case 'student_loan': return <FileText className="w-5 h-5" />;
      default: return <DollarSign className="w-5 h-5" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-400 bg-red-500/20 border-red-500/30';
      case 'medium': return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30';
      default: return 'text-blue-400 bg-blue-500/20 border-blue-500/30';
    }
  };

  const filteredDebts = debts.filter(debt => 
    debt.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
    (filterType === 'all' || debt.type === filterType)
  );

  const debtTypes = ['all', 'credit_card', 'car_loan', 'mortgage', 'personal_loan', 'student_loan'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header Section */}
      <div className="bg-white/5 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <h1 className="text-3xl font-bold text-white mb-3">
              Welcome to Blitz's Debt Liberation Boardroom
            </h1>
            <p className="text-white/70 text-lg mb-6">
              Your strategic command center for debt elimination and financial freedom
            </p>
            <div className="flex items-center justify-center gap-6">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-400 rounded-full animate-pulse"></div>
                <span className="text-blue-400 font-medium">Blitz AI Active</span>
              </div>
              <button 
                onClick={() => setIsChatOpen(true)}
                className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white px-6 py-3 rounded-lg font-medium transition-all flex items-center gap-2 shadow-lg"
              >
                <MessageCircle className="w-5 h-5" />
                Chat with Blitz
              </button>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">

        {/* Navigation Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex justify-center mb-8"
        >
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-2 border border-white/10">
            {[
              { key: 'overview', label: 'Liberation Overview', icon: BarChart3 },
              { key: 'debts', label: 'Debt Analysis', icon: CreditCard },
              { key: 'upload', label: 'Smart Upload', icon: Upload },
              { key: 'simulate', label: 'AI Calculator', icon: Calculator },
              { key: 'chat', label: 'Chat with Blitz', icon: Brain }
            ].map(({ key, label, icon: Icon }) => (
              <motion.button
                key={key}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setActiveView(key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeView === key
                    ? 'bg-blue-500 text-white shadow-lg'
                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* Overview Section */}
        {activeView === 'overview' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="space-y-8"
          >
            {/* AI Performance Metrics */}
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-white mb-2">Blitz AI Performance</h2>
              <p className="text-white/60">Real-time debt liberation metrics and AI insights</p>
            </div>
            
            {/* Liberation Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6 hover:bg-white/10 transition-all">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white/60 text-sm font-medium">Payoff Acceleration</p>
                    <p className="text-3xl font-bold text-white mt-1">3x</p>
                    <p className="text-blue-400 text-xs mt-1">Faster than traditional</p>
                  </div>
                  <div className="w-14 h-14 bg-blue-500/20 rounded-xl flex items-center justify-center">
                    <Zap className="w-7 h-7 text-blue-400" />
                  </div>
                </div>
              </div>

              <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6 hover:bg-white/10 transition-all">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white/60 text-sm font-medium">Interest Saved</p>
                    <p className="text-3xl font-bold text-white mt-1">$28K</p>
                    <p className="text-green-400 text-xs mt-1">This year</p>
                  </div>
                  <div className="w-14 h-14 bg-green-500/20 rounded-xl flex items-center justify-center">
                    <TrendingDown className="w-7 h-7 text-green-400" />
                  </div>
                </div>
              </div>

              <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6 hover:bg-white/10 transition-all">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white/60 text-sm font-medium">Stress Reduction</p>
                    <p className="text-3xl font-bold text-white mt-1">87%</p>
                    <p className="text-purple-400 text-xs mt-1">AI-powered relief</p>
                  </div>
                  <div className="w-14 h-14 bg-purple-500/20 rounded-xl flex items-center justify-center">
                    <Brain className="w-7 h-7 text-purple-400" />
                  </div>
                </div>
              </div>

              <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6 hover:bg-white/10 transition-all">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white/60 text-sm font-medium">AI Availability</p>
                    <p className="text-3xl font-bold text-white mt-1">24/7</p>
                    <p className="text-yellow-400 text-xs mt-1">Always ready</p>
                  </div>
                  <div className="w-14 h-14 bg-yellow-500/20 rounded-xl flex items-center justify-center">
                    <MessageCircle className="w-7 h-7 text-yellow-400" />
                  </div>
                </div>
              </div>
          </div>

            {/* AI Chat Interface */}
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-white mb-2">Chat with Blitz AI</h2>
              <p className="text-white/60">Get instant debt liberation strategies and personalized advice</p>
            </div>
            
            <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
                  <Brain className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Blitz AI</h3>
                  <p className="text-white/60 text-sm">Your debt liberation strategist</p>
                </div>
              </div>
              
              <div className="bg-white/5 rounded-lg p-4 mb-4 min-h-[120px]">
                {messages.length === 0 ? (
                  <div className="text-center text-white/60">
                    <p>👋 Hi! I'm Blitz, your AI debt liberation strategist.</p>
                    <p className="mt-2">Ask me about payoff strategies, interest optimization, or debt consolidation!</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {messages.map((message, index) => (
                      <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] rounded-lg px-3 py-2 ${
                          message.role === 'user' 
                            ? 'bg-blue-500 text-white' 
                            : 'bg-white/10 text-white'
                        }`}>
                          <p className="text-sm">{message.content}</p>
                        </div>
                      </div>
                    ))}
                    {isLoading && (
                      <div className="flex justify-start">
                        <div className="bg-white/10 text-white rounded-lg px-3 py-2">
                          <div className="flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span className="text-sm">Blitz is thinking...</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
              
              <div className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !isLoading && sendMessage(input)}
                  placeholder="Ask Blitz about debt strategies..."
                  className="flex-1 bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-white/50 focus:outline-none focus:border-blue-500"
                  disabled={isLoading}
                />
                <button
                  onClick={() => sendMessage(input)}
                  disabled={isLoading || !input.trim()}
                  className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg px-3 py-2 transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-white mb-2">Quick Actions</h2>
              <p className="text-white/60">Essential tools for debt liberation</p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <button
                onClick={() => setActiveView('upload')}
                className="flex flex-col items-center gap-4 p-6 bg-green-500/20 hover:bg-green-500/30 border border-green-500/30 rounded-xl text-white transition-all hover:scale-105"
              >
                <div className="w-12 h-12 bg-green-500/30 rounded-xl flex items-center justify-center">
                  <Upload className="w-6 h-6" />
                </div>
                <span className="font-medium">Smart Upload</span>
              </button>
              <button
                onClick={() => setActiveView('simulate')}
                className="flex flex-col items-center gap-4 p-6 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 rounded-xl text-white transition-all hover:scale-105"
              >
                <div className="w-12 h-12 bg-blue-500/30 rounded-xl flex items-center justify-center">
                  <Calculator className="w-6 h-6" />
                </div>
                <span className="font-medium">AI Calculator</span>
              </button>
              <button
                onClick={() => setActiveView('chat')}
                className="flex flex-col items-center gap-4 p-6 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 rounded-xl text-white transition-all hover:scale-105"
              >
                <div className="w-12 h-12 bg-purple-500/30 rounded-xl flex items-center justify-center">
                  <Brain className="w-6 h-6" />
                </div>
                <span className="font-medium">AI Strategy</span>
              </button>
            </div>
          </motion.div>
        )}
      </div>

      {/* Debts Section */}
      {activeView === 'debts' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-8"
        >
          {/* Search and Filter */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/50" />
              <input
                type="text"
                placeholder="Search debts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-green-500"
              />
            </div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-green-500"
            >
              {debtTypes.map(type => (
                <option key={type} value={type} className="bg-slate-800">
                  {type === 'all' ? 'All Types' : type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </option>
              ))}
            </select>
          </div>

          {/* Debts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {filteredDebts.map((debt) => (
              <div key={debt.id} className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {getDebtIcon(debt.type)}
                    <div>
                      <h3 className="text-base font-semibold text-white">{debt.name}</h3>
                      <p className="text-white/70 text-xs">Updated {debt.lastUpdated}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button className="text-white/70 hover:text-white p-1">
                      <Edit className="w-3 h-3" />
                    </button>
                    <button className="text-red-400 hover:text-red-300 p-1">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <p className="text-white/70 text-xs">Balance</p>
                    <p className="text-white font-semibold text-sm">${debt.balance.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-white/70 text-xs">Interest Rate</p>
                    <p className="text-white font-semibold text-sm">{debt.rate}%</p>
                  </div>
                  <div>
                    <p className="text-white/70 text-xs">Min Payment</p>
                    <p className="text-white font-semibold text-sm">${debt.minPayment}</p>
                  </div>
                  <div>
                    <p className="text-white/70 text-xs">Due Date</p>
                    <p className="text-white font-semibold text-sm">{debt.dueDate}</p>
                  </div>
                </div>

                <div className="w-full bg-white/10 rounded-full h-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, (debt.balance / (debt.originalAmount || debt.balance * 2)) * 100)}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Upload Documents Section */}
      {activeView === 'upload' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-8"
        >
          {/* Upload Area */}
          <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Upload className="w-8 h-8 text-green-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Upload Debt Statements</h3>
              <p className="text-white/70 mb-6">Drag & drop your loan statements, or click to browse</p>
              
              <div
                className="border-2 border-dashed border-white/20 rounded-xl p-8 hover:border-green-500/50 transition-colors cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="text-4xl mb-4">📄</div>
                <p className="text-white/70 mb-2">Supported formats: PDF, PNG, JPG</p>
                <p className="text-white/50 text-sm">Credit cards, car loans, mortgages, personal loans</p>
              </div>
              
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={handleFileUpload}
                className="hidden"
              />
              
              <button
                onClick={() => fileInputRef.current?.click()}
                className="mt-4 px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
              >
                {isUploading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processing...
                  </div>
                ) : (
                  'Choose Files'
                )}
              </button>
            </div>
          </div>

          {/* Uploaded Documents */}
          {uploadedDocs.length > 0 && (
            <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Uploaded Documents</h3>
              <div className="space-y-3">
                {uploadedDocs.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-white/70" />
                      <div>
                        <p className="text-white font-medium">{doc.name}</p>
                        <p className="text-white/70 text-sm">
                          {doc.status === 'processing' ? 'Processing...' : 
                           doc.status === 'completed' ? 'Data extracted' : 'Error processing'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {doc.status === 'processing' && <Loader2 className="w-4 h-4 animate-spin text-blue-400" />}
                      {doc.status === 'completed' && <CheckCircle className="w-4 h-4 text-green-400" />}
                      {doc.status === 'error' && <AlertTriangle className="w-4 h-4 text-red-400" />}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* Payoff Simulator Section */}
      {activeView === 'simulate' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-8"
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Simulation Controls */}
            <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Simulation Controls</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-white/70 text-sm mb-2">Extra Monthly Payment</label>
                  <input
                    type="number"
                    value={extraPayment}
                    onChange={(e) => setExtraPayment(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-green-500"
                    placeholder="Enter extra amount"
                  />
                </div>

                <div>
                  <label className="block text-white/70 text-sm mb-2">Payoff Strategy</label>
                  <select
                    value={selectedStrategy}
                    onChange={(e) => setSelectedStrategy(e.target.value)}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-green-500"
                  >
                    <option value="avalanche" className="bg-slate-800">Avalanche (Highest Interest First)</option>
                    <option value="snowball" className="bg-slate-800">Snowball (Smallest Balance First)</option>
                    <option value="ai_optimized" className="bg-slate-800">AI Optimized</option>
                  </select>
                </div>

                <button
                  onClick={() => setShowSimulation(true)}
                  className="w-full px-4 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
                >
                  Run Simulation
                </button>
              </div>
            </div>

            {/* Simulation Results */}
            <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Simulation Results</h3>
              
              {showSimulation ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-white/5 rounded-lg">
                      <p className="text-white/70 text-sm">Payoff Time</p>
                      <p className="text-2xl font-bold text-white">{liveStats.payoffMonths - Math.floor(extraPayment / 100)} months</p>
                    </div>
                    <div className="text-center p-4 bg-white/5 rounded-lg">
                      <p className="text-white/70 text-sm">Interest Saved</p>
                      <p className="text-2xl font-bold text-green-400">${(liveStats.interestSaved + extraPayment * 2).toLocaleString()}</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-white/70">Total Payments</span>
                      <span className="text-white">${(liveStats.totalDebt + liveStats.interestSaved).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-white/70">Monthly Payment</span>
                      <span className="text-white">${(liveStats.monthlyPayment + extraPayment).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-white/70">Strategy</span>
                      <span className="text-white capitalize">{selectedStrategy.replace('_', ' ')}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Calculator className="w-12 h-12 text-white/30 mx-auto mb-4" />
                  <p className="text-white/70">Run a simulation to see your payoff results</p>
                </div>
              )}
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {blitzTeam.map((member) => (
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
              <div className="text-3xl">{blitzTeam.find(ai => ai.id === selectedAI)?.emoji}</div>
              <div>
                <h3 className="text-xl font-semibold text-white">
                  Chat with {blitzTeam.find(ai => ai.id === selectedAI)?.name}
                </h3>
                <p className="text-white/70">
                  {blitzTeam.find(ai => ai.id === selectedAI)?.title}
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
                      <span>{blitzTeam.find(ai => ai.id === selectedAI)?.name} is analyzing...</span>
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
                placeholder={`Ask ${blitzTeam.find(ai => ai.id === selectedAI)?.name} about debt liberation...`}
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

      {/* Live Liberation Theater Section */}
      {activeView === 'theater' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-8"
        >
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-white mb-2">Live Debt Liberation Theater</h2>
            <p className="text-white/70">Experience Blitz's magical liberation in real-time as he consults with his AI team to create your freedom strategy</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {liberationExamples.map((example) => (
              <div key={example.type} className={`p-4 rounded-xl border ${example.bgColor} hover:scale-105 transition-transform cursor-pointer`}>
                <div className="text-center">
                  <div className="text-3xl mb-2">{example.emoji}</div>
                  <h3 className={`font-bold text-lg ${example.color} mb-2`}>{example.type}</h3>
                  <p className="text-white/70 text-sm mb-4">help me pay off my ${example.debtAmount.toLocaleString()} {example.type.toLowerCase()} faster!</p>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-white/70">Debt Amount</span>
                      <span className="text-white font-semibold">${example.debtAmount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/70">Current Time</span>
                      <span className="text-white">{example.currentTime}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/70">Freedom Time</span>
                      <span className={`font-semibold ${example.color}`}>{example.freedomTime}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/70">Interest Saved</span>
                      <span className="text-green-400 font-semibold">${example.interestSaved.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}


      {/* AI Recommendations Section */}
      {activeView === 'recommendations' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-8"
        >
          <div className="space-y-4">
            {aiRecommendations.map((rec) => (
              <div key={rec.id} className={`p-4 rounded-xl border ${getPriorityColor(rec.priority)}`}>
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold">{rec.title}</h3>
                  <span className="text-xs opacity-70">Confidence: {rec.confidence}%</span>
                </div>
                <p className="text-sm opacity-80 mb-2">{rec.description}</p>
                <div className="flex items-center justify-between text-xs">
                  <span className="opacity-70">Potential Savings: ${rec.potentialSavings.toLocaleString()}</span>
                  <span className="opacity-70">Action: {rec.actionRequired}</span>
        </div>
      </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
} 