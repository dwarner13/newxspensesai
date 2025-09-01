import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { 
  TrendingUp, Crown, Zap, BarChart3, Target, Brain, 
  Play, RefreshCw, CheckCircle, DollarSign, Users,
  Calendar, PieChart, ArrowRight, Upload, Download, 
  Eye, Sparkles, Award, Building2, Car, Utensils, 
  Briefcase, ShoppingBag, Lightbulb, Rocket, Shield, Lock, Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';


interface AIEmployee {
  name: string;
  role: string;
  avatar: string;
  specialty: string;
  color: string;
  businessStyle: string;
}

interface BusinessStrategy {
  id: string;
  category: string;
  title: string;
  description: string;
  potentialImpact: string;
  confidence: number;
  aiReason: string;
  implementation: string[];
}

interface BusinessType {
  id: string;
  name: string;
  icon: string;
  description: string;
  challenges: string[];
  opportunities: string[];
  aiInsights: string[];
}

interface AnalysisStage {
  stage: string;
  description: string;
  icon: string;
}

const BusinessIntelligenceFeaturePage = () => {
  const [showBusinessStudio, setShowBusinessStudio] = useState(false);
  const [isAnalyzingBusiness, setIsAnalyzingBusiness] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [selectedBusinessType, setSelectedBusinessType] = useState<string>('freelancer');
  const [currentStrategies, setCurrentStrategies] = useState<BusinessStrategy[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // AI Business Team
  const aiBusinessTeam: AIEmployee[] = [
    {
      name: 'Prime',
      role: 'AI Business Director',
      avatar: '👑',
      specialty: 'Strategic Business Planning',
      color: 'from-purple-500 to-pink-500',
      businessStyle: 'Orchestrates your complete business strategy and growth plan'
    },
    {
      name: 'Byte',
      role: 'AI Data Analyst',
      avatar: '📊',
      specialty: 'Business Metrics & Trends',
      color: 'from-blue-500 to-cyan-500',
      businessStyle: 'Analyzes your business data to uncover hidden opportunities'
    },
    {
      name: 'Tag',
      role: 'AI Expense Optimizer',
      avatar: '🏷️',
      specialty: 'Cost Optimization',
      color: 'from-green-500 to-emerald-500',
      businessStyle: 'Maximizes deductions and minimizes unnecessary expenses'
    },
    {
      name: 'Crystal',
      role: 'AI Growth Predictor',
      avatar: '🔮',
      specialty: 'Market Intelligence',
      color: 'from-indigo-500 to-purple-500',
      businessStyle: 'Predicts market trends and identifies growth opportunities'
    }
  ];

  // Business Types
  const businessTypes: BusinessType[] = [
    {
      id: 'freelancer',
      name: 'Freelancer',
      icon: '💻',
      description: 'Independent professionals offering services',
      challenges: ['Irregular income', 'Client acquisition', 'Project pricing'],
      opportunities: ['Scalable services', 'Multiple revenue streams', 'Flexible schedule'],
      aiInsights: ['Optimal pricing strategies', 'Client retention tactics', 'Tax optimization']
    },
    {
      id: 'uber-driver',
      name: 'Uber Driver',
      icon: '🚗',
      description: 'Ride-sharing and delivery services',
      challenges: ['Fuel costs', 'Vehicle maintenance', 'Peak time optimization'],
      opportunities: ['Multiple platforms', 'Surge pricing', 'Delivery services'],
      aiInsights: ['Route optimization', 'Peak time analysis', 'Expense tracking']
    },
    {
      id: 'restaurant',
      name: 'Restaurant',
      icon: '🍽️',
      description: 'Food service and hospitality',
      challenges: ['Inventory management', 'Labor costs', 'Customer retention'],
      opportunities: ['Delivery expansion', 'Menu optimization', 'Loyalty programs'],
      aiInsights: ['Menu profitability', 'Customer analytics', 'Cost control']
    },
    {
      id: 'ecommerce',
      name: 'E-commerce',
      icon: '🛒',
      description: 'Online retail and digital products',
      challenges: ['Competition', 'Shipping costs', 'Customer acquisition'],
      opportunities: ['Global reach', 'Automation', 'Data insights'],
      aiInsights: ['Product recommendations', 'Pricing strategies', 'Market trends']
    },
    {
      id: 'consultant',
      name: 'Consultant',
      icon: '💼',
      description: 'Professional advisory services',
      challenges: ['Client acquisition', 'Service pricing', 'Market positioning'],
      opportunities: ['Recurring revenue', 'Scalable solutions', 'Expert positioning'],
      aiInsights: ['Client retention', 'Service optimization', 'Market analysis']
    },
    {
      id: 'retail',
      name: 'Retail Store',
      icon: '🏪',
      description: 'Physical retail and merchandise',
      challenges: ['Inventory turnover', 'Rent costs', 'Online competition'],
      opportunities: ['Omnichannel sales', 'Local marketing', 'Customer experience'],
      aiInsights: ['Inventory optimization', 'Customer behavior', 'Competitive analysis']
    }
  ];

  // Sample Business Strategies
  const businessStrategies: BusinessStrategy[] = [
    {
      id: '1',
      category: 'Revenue Optimization',
      title: 'Implement Dynamic Pricing Strategy',
      description: 'Adjust pricing based on demand, seasonality, and competition',
      potentialImpact: '+25% revenue',
      confidence: 92,
      aiReason: 'Market analysis shows pricing elasticity in your industry',
      implementation: ['Analyze competitor pricing', 'Test price points', 'Monitor demand patterns']
    },
    {
      id: '2',
      category: 'Cost Reduction',
      title: 'Optimize Tax Deductions',
      description: 'Maximize business expense deductions and tax savings',
      potentialImpact: '$3,200 savings',
      confidence: 95,
      aiReason: 'Analysis of your expenses reveals missed deduction opportunities',
      implementation: ['Categorize all expenses', 'Document business use', 'File quarterly estimates']
    },
    {
      id: '3',
      category: 'Growth Strategy',
      title: 'Expand Service Offerings',
      description: 'Add complementary services to increase customer value',
      potentialImpact: '+40% customer LTV',
      confidence: 88,
      aiReason: 'Customer data shows demand for additional services',
      implementation: ['Research market needs', 'Develop service packages', 'Train team members']
    }
  ];

  // Analysis Stages
  const analysisStages: AnalysisStage[] = [
    { stage: 'Analyzing your business model...', description: 'AI is understanding your business structure', icon: '🏢' },
    { stage: 'Byte is processing your data...', description: 'Extracting insights from your business metrics', icon: '📊' },
    { stage: 'Tag is optimizing expenses...', description: 'Identifying cost reduction opportunities', icon: '🏷️' },
    { stage: 'Crystal is analyzing market trends...', description: 'Predicting growth opportunities', icon: '🔮' },
    { stage: 'Prime is crafting your strategy...', description: 'Coordinating your complete business plan', icon: '👑' },
    { stage: 'Your AI Business Strategy is ready! 🚀', description: 'Personalized growth plan complete', icon: '✨' }
  ];

  // Demo Functions
  const handleBusinessConnect = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsConnected(true);
      setIsLoading(false);
    }, 2000);
  };

  const analyzeBusiness = () => {
    setIsAnalyzingBusiness(true);
    setAnalysisProgress(0);
    
    const interval = setInterval(() => {
      setAnalysisProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsAnalyzingBusiness(false);
          setCurrentStrategies(businessStrategies);
          return 100;
        }
        return prev + 15;
      });
    }, 600);
  };

  return (
    <>
      <Helmet>
        <title>AI Business Intelligence - Smart Business Strategy | XspensesAI Platform</title>
        <meta name="description" content="Revolutionary AI Business Intelligence that analyzes your business, suggests growth strategies, and optimizes operations. Perfect for freelancers, Uber drivers, restaurants, and all small businesses." />
        <meta name="keywords" content="AI business intelligence, business strategy, small business AI, freelancer tools, Uber driver optimization, restaurant analytics, business growth, AI business advisor" />
        <meta property="og:title" content="AI Business Intelligence - Smart Business Strategy | XspensesAI Platform" />
        <meta property="og:description" content="Revolutionary AI Business Intelligence that analyzes your business and suggests growth strategies." />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="AI Business Intelligence - Smart Business Strategy | XspensesAI Platform" />
        <meta name="twitter:description" content="Revolutionary AI Business Intelligence for small businesses." />
      </Helmet>

      {/* Hero Section */}
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900 pt-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center mb-16">
            {/* Prime Badge */}
            <div className="text-center mb-8">
              <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 backdrop-blur-md border border-white/20 rounded-full px-6 py-3 mb-8"
              >
                <Crown size={20} className="text-yellow-400" />
                <span className="text-white font-semibold">Prime's AI Business Division</span>
              </motion.div>
            </div>

            {/* Urgency Banner */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="bg-gradient-to-r from-orange-500/20 to-red-500/20 border border-orange-500/30 rounded-full px-6 py-2 mb-8 inline-block"
            >
              <span className="text-orange-300 text-sm font-medium">
                🚀 Limited Time: Intelia's first month FREE for small businesses
              </span>
            </motion.div>

            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-4xl md:text-6xl font-bold text-white mb-6"
            >
              Meet{' '}
              <span className="text-indigo-400 drop-shadow-lg">
                Intelia
              </span>
              {' '}Your AI Business CFO
            </motion.h1>
            
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="text-xl md:text-2xl text-white/90 mb-8 max-w-4xl mx-auto leading-relaxed font-medium"
            >
              Stop guessing about your business. Intelia is your AI CFO who gives you daily money snapshots, finds tax deductions automatically, predicts cash flow, and turns your business into a money-making machine. Perfect for freelancers, Uber drivers, and small business owners.
            </motion.p>

            {/* Social Proof Bar */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="flex flex-wrap justify-center items-center gap-8 mb-8 text-white/80"
            >
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-indigo-400" />
                <span className="font-semibold">$4,800 avg monthly increase</span>
              </div>
              <div className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-yellow-400" />
                <span className="font-semibold">97% accuracy rate</span>
              </div>
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-green-400" />
                <span className="font-semibold">$3,200 avg tax savings</span>
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              className="flex flex-col sm:flex-row gap-6 justify-center"
            >
              {!isConnected ? (
                <button 
                  onClick={handleBusinessConnect}
                  disabled={isLoading}
                  className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 text-white px-10 py-5 rounded-xl font-bold text-xl transition-all duration-300 transform hover:scale-105 hover:shadow-2xl flex items-center justify-center gap-3 relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300"></div>
                  {isLoading ? (
                    <>
                      <RefreshCw size={28} className="animate-spin" />
                      <span>Hiring Intelia...</span>
                    </>
                  ) : (
                    <>
                      <Brain size={28} />
                      <span>Hire Intelia - My AI CFO</span>
                      <div className="bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full ml-2">
                        FREE
                      </div>
                    </>
                  )}
                </button>
              ) : (
                <>
                  <button 
                    onClick={() => setShowBusinessStudio(true)}
                    className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-purple-500 hover:to-indigo-500 text-white px-10 py-5 rounded-xl font-bold text-xl transition-all duration-300 transform hover:scale-105 hover:shadow-2xl flex items-center justify-center gap-3 relative overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300"></div>
                    <Brain size={28} />
                    <span>Enter Intelia's Office</span>
                  </button>
                  <button 
                    onClick={analyzeBusiness}
                    className="border-2 border-green-400 text-green-400 hover:bg-green-400 hover:text-white px-10 py-5 rounded-xl font-bold text-xl transition-all duration-300 flex items-center justify-center gap-3 transform hover:scale-105"
                  >
                    <Zap size={28} />
                    <span>See Intelia In Action</span>
                  </button>
                </>
              )}
            </motion.div>

            {/* Trust Indicators */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.7 }}
              className="flex flex-wrap justify-center items-center gap-6 mt-8 text-white/60 text-sm"
            >
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4" />
                <span>Bank-level security</span>
              </div>
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4" />
                <span>Your data stays private</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>Setup in 2 minutes</span>
              </div>
            </motion.div>
          </div>

          {/* Testimonials Section */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="bg-white/5 backdrop-blur-md rounded-2xl p-8 border border-white/20 mb-16"
          >
            <h3 className="text-2xl font-bold text-white text-center mb-8">
              🧠 What Small Business Owners Are Saying About Intelia
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white/10 rounded-xl p-6">
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Award key={i} size={16} className="text-yellow-400 fill-current" />
                  ))}
                </div>
                <p className="text-white/90 mb-4 italic">
                  "Intelia's daily money snapshots are game-changing! I wake up to 'Good morning! Yesterday you earned $212, spent $54 on gas, and saved 3 hours of driving time.' It's like having a CFO in my pocket!"
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-indigo-400 to-purple-400 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold">M</span>
                  </div>
                  <div>
                    <p className="text-white font-semibold">Mike R.</p>
                    <p className="text-white/60 text-sm">Uber Driver</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white/10 rounded-xl p-6">
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Award key={i} size={16} className="text-yellow-400 fill-current" />
                  ))}
                </div>
                <p className="text-white/90 mb-4 italic">
                  "Intelia found $3,200 in tax deductions I never knew existed! The smart deduction finder caught my mileage, home office, and phone bill. My accountant was amazed at how organized everything was."
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-blue-400 to-cyan-400 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold">S</span>
                  </div>
                  <div>
                    <p className="text-white font-semibold">Sarah M.</p>
                    <p className="text-white/60 text-sm">Freelance Designer</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white/10 rounded-xl p-6">
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Award key={i} size={16} className="text-yellow-400 fill-current" />
                  ))}
                </div>
                <p className="text-white/90 mb-4 italic">
                  "The cash flow predictor saved my business! Intelia warned me I'd be $380 short of rent in 3 weeks, so I planned a catch-up strategy. No more surprise cash crunches!"
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-green-400 to-emerald-400 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold">J</span>
                  </div>
                  <div>
                    <p className="text-white font-semibold">Jennifer L.</p>
                    <p className="text-white/60 text-sm">Small Restaurant Owner</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* AI Business Team Showcase */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-16"
          >
            <h2 className="text-3xl font-bold text-white text-center mb-6">Meet Intelia's AI Business Team</h2>
            <p className="text-white/80 text-center mb-12 max-w-3xl mx-auto">
              Intelia leads a team of specialized AI employees who work together to turn your small business into a money-making machine. No more guessing, no more surprises - just AI that understands your business better than you do.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {aiBusinessTeam.map((member, index) => (
                <motion.div 
                  key={member.name}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 hover:scale-105 transition-all duration-300"
                >
                  <div className="text-center">
                    <div className="text-6xl mb-4">{member.avatar}</div>
                    <h3 className="text-xl font-bold text-white mb-2">{member.name}</h3>
                    <p className="text-cyan-400 font-semibold mb-3">{member.role}</p>
                    <p className="text-white/70 text-sm mb-4">{member.specialty}</p>
                    <div className={`w-full h-1 bg-gradient-to-r ${member.color} rounded-full`}></div>
                    <p className="text-white/60 text-xs mt-3">{member.businessStyle}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Intelia's Key Features Section */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="bg-gradient-to-r from-orange-500/20 to-red-500/20 backdrop-blur-md rounded-2xl p-8 border border-white/20"
        >
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-white mb-4">What Intelia Does For Your Business 24/7</h2>
            <p className="text-white/80">Intelia is your AI CFO who never sleeps, never takes breaks, and never misses a money-making opportunity. Here's what your AI business intelligence does while you focus on growing your business.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                title: "Daily Money Snapshot",
                description: "Morning briefing: 'Good morning! Yesterday you earned $212, spent $54 on gas, and saved 3 hours of driving time. Based on trends, you'll hit $4,800 this month.'",
                icon: "📊",
                features: ["Personalized morning briefings", "Trend analysis", "Goal tracking", "Voice/podcast delivery"]
              },
              {
                title: "Tax-Ready Earnings Tracker",
                description: "Auto-splits every income into take-home vs taxes owed. Example: Uber driver makes $1,000 → AI says 'Set aside $240 for taxes. Net safe cash: $760.'",
                icon: "💰",
                features: ["Automatic tax calculations", "Quarterly estimates", "Year-end reports", "Tax-ready documentation"]
              },
              {
                title: "Smart Deduction Finder",
                description: "Detects deductible expenses automatically: Gas, mileage, tolls, parking, phone bill, insurance, supplies, home office. Shows real-time tax savings.",
                icon: "🔍",
                features: ["Automatic expense detection", "Real-time deduction tracking", "Mileage logging", "Home office calculations"]
              },
              {
                title: "Cash Flow Predictor",
                description: "AI forecasts next 7/30 days based on patterns. Example: 'At current pace, you'll be $380 short of rent in 3 weeks. Want to plan a catch-up strategy?'",
                icon: "🔮",
                features: ["7-day cash flow forecasts", "30-day predictions", "Early warning alerts", "Catch-up strategies"]
              }
            ].map((feature, index) => (
              <motion.div 
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="bg-white/10 rounded-xl p-6 border border-white/20 hover:scale-105 transition-all duration-300"
              >
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-lg font-semibold text-white mb-3">{feature.title}</h3>
                <p className="text-white/80 mb-4 text-sm">{feature.description}</p>
                <div className="space-y-2">
                  {feature.features.map((item, idx) => (
                    <div key={idx} className="text-white/70 text-xs flex items-center gap-2">
                      <CheckCircle size={12} className="text-green-400" />
                      {item}
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Additional Intelia Features */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 backdrop-blur-md rounded-2xl p-8 border border-white/20"
        >
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-white mb-4">More Intelia Magic Features</h2>
            <p className="text-white/80">Intelia doesn't just track your money - she turns your business into a money-making machine with these game-changing features.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                title: "Where Did My Money Go?",
                description: "Natural language insights: '30% of your income went to fuel this week. That's 8% higher than average — consider fewer long trips.'",
                icon: "🤔",
                features: ["Natural language insights", "Peer comparisons", "Spending analysis", "Actionable recommendations"]
              },
              {
                title: "Income Optimizer",
                description: "What If scenarios: 'What if I worked 10 more hours this week?' AI simulates: 'That would add $450 income, increase gas by $60, net profit $390.'",
                icon: "⚡",
                features: ["What-if scenarios", "Project comparisons", "Profit simulations", "Decision support"]
              },
              {
                title: "Smart Alerts & Nudges",
                description: "Proactive coaching: '⚠️ You're $75 away from triggering a late fee on your credit card.' '🔥 You just hit $5,000 lifetime earnings!'",
                icon: "🔔",
                features: ["Late fee prevention", "Milestone celebrations", "Market alerts", "Proactive coaching"]
              },
              {
                title: "End-of-Week Mini Podcast",
                description: "AI creates a 5-min personalized podcast: 'This week you earned $1,350. Blitz celebrates your $200 savings! Luna noticed you overspent $50 on dining.'",
                icon: "🎧",
                features: ["Personalized podcasts", "Weekly recaps", "AI personality insights", "Motivational coaching"]
              }
            ].map((feature, index) => (
              <motion.div 
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="bg-white/10 rounded-xl p-6 border border-white/20 hover:scale-105 transition-all duration-300"
              >
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-lg font-semibold text-white mb-3">{feature.title}</h3>
                <p className="text-white/80 mb-4 text-sm">{feature.description}</p>
                <div className="space-y-2">
                  {feature.features.map((item, idx) => (
                    <div key={idx} className="text-white/70 text-xs flex items-center gap-2">
                      <CheckCircle size={12} className="text-green-400" />
                      {item}
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Business Types Section */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="bg-gradient-to-r from-indigo-500/20 to-purple-500/20 backdrop-blur-md rounded-2xl p-8 border border-white/20"
        >
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-white mb-4">AI-Powered Business Intelligence</h2>
            <p className="text-white/80">Specialized insights for every type of small business</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {businessTypes.map((business, index) => (
              <motion.div 
                key={business.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="bg-white/10 rounded-xl p-6 border border-white/20 hover:scale-105 transition-all duration-300"
              >
                <div className="text-center mb-4">
                  <div className="text-4xl mb-3">{business.icon}</div>
                  <h3 className="text-xl font-bold text-white mb-2">{business.name}</h3>
                  <p className="text-white/70 text-sm mb-4">{business.description}</p>
                </div>
                
                <div className="space-y-3">
                  <div>
                    <h4 className="text-red-400 font-semibold text-sm mb-2">Key Challenges:</h4>
                    <ul className="text-white/70 text-xs space-y-1">
                      {business.challenges.map((challenge, idx) => (
                        <li key={idx}>• {challenge}</li>
                      ))}
                    </ul>
                  </div>
                  
                  <div>
                    <h4 className="text-green-400 font-semibold text-sm mb-2">AI Opportunities:</h4>
                    <ul className="text-white/70 text-xs space-y-1">
                      {business.aiInsights.map((insight, idx) => (
                        <li key={idx}>• {insight}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Live AI Business Analysis Theater */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 backdrop-blur-md rounded-2xl p-8 border border-white/20"
        >
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-white mb-4">Watch Intelia Work Magic in Real-Time</h2>
            <p className="text-white/80">See Intelia analyze your business, predict cash flow, find tax deductions, and turn your small business into a money-making machine. This is the future of business intelligence - and it's happening right now.</p>
          </div>

          {/* Analysis Progress */}
          {isAnalyzingBusiness && (
            <div className="bg-white/10 rounded-xl p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Analyzing Your Business</h3>
                <span className="text-cyan-400 font-bold">{analysisProgress}%</span>
              </div>
              <div className="w-full bg-white/20 rounded-full h-3 mb-4">
                <div 
                  className="bg-gradient-to-r from-indigo-500 to-purple-500 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${analysisProgress}%` }}
                ></div>
              </div>
              <div className="text-center">
                <p className="text-white/70 text-sm">
                  {analysisStages[Math.floor((analysisProgress / 100) * (analysisStages.length - 1))]?.stage}
                </p>
                <p className="text-white/50 text-xs mt-1">
                  {analysisStages[Math.floor((analysisProgress / 100) * (analysisStages.length - 1))]?.description}
                </p>
              </div>
            </div>
          )}

          {/* Business Strategies Display */}
          {currentStrategies.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="bg-white/10 rounded-xl p-6 mb-6"
            >
              <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Sparkles size={20} className="text-yellow-400" />
                AI Business Strategy Recommendations
              </h3>
              <div className="space-y-4">
                {currentStrategies.map((strategy) => (
                  <div key={strategy.id} className="bg-white/5 rounded-lg p-4 border border-white/10">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="bg-indigo-500/20 text-indigo-300 px-2 py-1 rounded text-xs">
                            {strategy.category}
                          </span>
                        </div>
                        <h4 className="font-semibold text-white">{strategy.title}</h4>
                        <p className="text-white/80 text-sm">{strategy.description}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-green-400 font-bold text-lg">{strategy.potentialImpact}</div>
                        <div className="text-cyan-400 text-sm">{strategy.confidence}% confidence</div>
                      </div>
                    </div>
                    <p className="text-white/70 text-xs mb-3">{strategy.aiReason}</p>
                    <div className="space-y-1">
                      <h5 className="text-white font-semibold text-xs">Implementation Steps:</h5>
                      {strategy.implementation.map((step, idx) => (
                        <div key={idx} className="text-white/70 text-xs flex items-center gap-2">
                          <CheckCircle size={10} className="text-green-400" />
                          {step}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex gap-3">
                <button className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white px-6 py-2 rounded-lg font-semibold flex items-center gap-2">
                  <CheckCircle size={16} />
                  Implement Strategies
                </button>
                <button className="border border-white/30 text-white px-6 py-2 rounded-lg font-semibold">
                  Export Business Plan
                </button>
              </div>
            </motion.div>
          )}

          {/* Business Intelligence Features */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
            {[
              {
                title: "Revenue Optimization",
                description: "AI analyzes your pricing, sales patterns, and market opportunities",
                icon: "📈",
                color: "from-green-500 to-emerald-500"
              },
              {
                title: "Cost Reduction",
                description: "Smart expense analysis and tax optimization strategies",
                icon: "💰",
                color: "from-blue-500 to-cyan-500"
              },
              {
                title: "Growth Strategy",
                description: "Personalized expansion plans and market positioning",
                icon: "🚀",
                color: "from-purple-500 to-pink-500"
              }
            ].map((feature, index) => (
              <motion.div 
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 hover:scale-105 transition-all duration-300"
              >
                <div className={`w-16 h-16 bg-gradient-to-r ${feature.color} rounded-full flex items-center justify-center mx-auto mb-4`}>
                  <span className="text-2xl">{feature.icon}</span>
                </div>
                <h3 className="text-xl font-bold text-white mb-3 text-center">{feature.title}</h3>
                <p className="text-white/80 text-sm leading-relaxed text-center">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Call to Action */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="bg-gradient-to-r from-indigo-500/20 to-purple-500/20 backdrop-blur-md rounded-2xl p-8 border border-white/20 text-center"
        >
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
            Stop Guessing About Your Business - Hire Intelia Today
          </h2>
          <p className="text-white/80 text-lg mb-6 max-w-2xl mx-auto">
            Join 8,500+ small business owners who've hired Intelia as their AI CFO. Get daily money snapshots, automatic tax deductions, cash flow predictions, and turn your business into a money-making machine. Intelia never sleeps.
          </p>
          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <button 
              onClick={() => setShowBusinessStudio(true)}
              className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-purple-500 hover:to-indigo-500 text-white px-10 py-5 rounded-xl font-bold text-xl transition-all duration-300 transform hover:scale-105 hover:shadow-2xl flex items-center justify-center gap-3 relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300"></div>
              <Brain size={28} />
              <span>Hire Intelia - My AI CFO</span>
              <div className="bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full ml-2">
                FREE
              </div>
            </button>
            <button 
              onClick={analyzeBusiness}
              className="border-2 border-green-400 text-green-400 hover:bg-green-400 hover:text-white px-10 py-5 rounded-xl font-bold text-xl transition-all duration-300 flex items-center justify-center gap-3 transform hover:scale-105"
            >
              <Zap size={28} />
              <span>See Intelia In Action</span>
            </button>
          </div>
        </motion.div>
      </div>

      {/* AI Business Studio Modal */}
      <AnimatePresence>
        {showBusinessStudio && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowBusinessStudio(false)}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900 rounded-2xl p-8 max-w-2xl w-full border border-white/20"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-white mb-4">AI Business Studio</h2>
                <p className="text-white/80">Choose your business type and let our AI team create your strategic plan</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                {businessTypes.map((business) => (
                  <button
                    key={business.id}
                    onClick={() => {
                      setSelectedBusinessType(business.id);
                      setShowBusinessStudio(false);
                      analyzeBusiness();
                    }}
                    className={`p-4 rounded-xl border-2 transition-all duration-300 ${
                      selectedBusinessType === business.id
                        ? 'border-indigo-400 bg-indigo-500/20'
                        : 'border-white/20 bg-white/5 hover:border-indigo-300 hover:bg-indigo-500/10'
                    }`}
                  >
                    <div className="text-3xl mb-2">{business.icon}</div>
                    <h3 className="text-lg font-semibold text-white mb-1">{business.name}</h3>
                    <p className="text-white/70 text-sm">{business.description}</p>
                  </button>
                ))}
              </div>

              <div className="flex gap-4 justify-center">
                <button 
                  onClick={() => setShowBusinessStudio(false)}
                  className="px-6 py-3 border border-white/30 text-white rounded-lg hover:bg-white/10 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => {
                    setShowBusinessStudio(false);
                    analyzeBusiness();
                  }}
                  className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-lg font-semibold hover:from-purple-500 hover:to-indigo-500 transition-all duration-300"
                >
                  Start Analysis
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default BusinessIntelligenceFeaturePage;
