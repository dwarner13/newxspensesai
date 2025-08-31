import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { 
  TrendingUp, Crown, Zap, BarChart3, Target, Brain, 
  Play, RefreshCw, CheckCircle, DollarSign, Users,
  Calendar, PieChart, ArrowRight, Upload, Download, 
  Eye, Sparkles, Award, Building2, Car, Utensils, 
  Briefcase, ShoppingBag, Lightbulb, Rocket
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

            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-4xl md:text-6xl font-bold text-white mb-6"
            >
              The World's First AI Business Intelligence
            </motion.h1>
            
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="text-lg md:text-xl text-white/80 mb-12 max-w-4xl mx-auto leading-relaxed"
            >
              Revolutionary AI that analyzes your business, suggests growth strategies, and optimizes operations. Perfect for freelancers, Uber drivers, restaurants, and all small businesses. Get intelligent insights, revenue optimization, and strategic planning - all powered by advanced AI.
            </motion.p>

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
                  className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-300 transform hover:scale-105 hover:shadow-lg flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw size={24} className="animate-spin" />
                      Connecting to Business AI...
                    </>
                  ) : (
                    <>
                      <TrendingUp size={24} />
                      Connect Your Business Data
                    </>
                  )}
                </button>
              ) : (
                <>
                  <button 
                    onClick={() => setShowBusinessStudio(true)}
                    className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-purple-500 hover:to-indigo-500 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-300 transform hover:scale-105 hover:shadow-lg flex items-center justify-center gap-2"
                  >
                    <TrendingUp size={24} />
                    Enter AI Business Studio
                  </button>
                  <button 
                    onClick={analyzeBusiness}
                    className="border-2 border-green-400 text-green-400 hover:bg-green-400 hover:text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-300 flex items-center justify-center gap-2"
                  >
                    <Zap size={24} />
                    Analyze My Business
                  </button>
                </>
              )}
            </motion.div>
          </div>

          {/* AI Business Team Showcase */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-16"
          >
            <h2 className="text-3xl font-bold text-white text-center mb-12">Meet Your AI Business Team</h2>
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
            <h2 className="text-3xl font-bold text-white mb-4">Live AI Business Analysis Theater</h2>
            <p className="text-white/80">Watch our AI business team analyze your operations and suggest optimizations in real-time</p>
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
            Ready to Revolutionize Your Business Strategy?
          </h2>
          <p className="text-white/80 text-lg mb-6 max-w-2xl mx-auto">
            Connect your business data to unlock AI-powered insights, revenue optimization, and strategic growth planning. Transform your small business with intelligent analysis and actionable strategies.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button 
              onClick={() => setShowBusinessStudio(true)}
              className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-purple-500 hover:to-indigo-500 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-300 transform hover:scale-105 hover:shadow-lg flex items-center justify-center gap-2"
            >
              <TrendingUp size={24} />
              Start AI Business Analysis
            </button>
            <button 
              onClick={analyzeBusiness}
              className="border-2 border-green-400 text-green-400 hover:bg-green-400 hover:text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-300 flex items-center justify-center gap-2"
            >
              <Zap size={24} />
              Try Free Analysis
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
