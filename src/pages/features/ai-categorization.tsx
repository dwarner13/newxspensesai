import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { 
  Crown, Bot, Calculator, BarChart3, Brain, Headphones, 
  Users, Zap, Target, TrendingUp, ArrowRight, Star,
  CheckCircle, Play, Settings, MessageCircle, Sparkles, Clock, Shield,
  Mic, Music, TrendingDown, FileText, CreditCard, PiggyBank, Building2,
  Heart, Eye, Lightbulb, Shield as SecurityIcon, Volume2, Briefcase,
  Flame, Rocket, Gem, Compass, Telescope, Crown as CrownIcon,
  Eye as EyeIcon, Sparkles as SparklesIcon, Zap as ZapIcon,
  TrendingUp as TrendingUpIcon, AlertTriangle, Calendar, DollarSign,
  Clock as ClockIcon, Target as TargetIcon, BarChart3 as BarChart3Icon,
  PieChart as PieChartIcon, TrendingDown as TrendingDownIcon,
  ArrowUpRight, ArrowDownRight, Minus, Plus, RotateCcw, Shuffle,
  Tag as TagIcon, Filter, Download, RefreshCw, CheckCircle2, XCircle,
  TrendingUp as TrendingUpIcon2, PieChart, BarChart3 as BarChart3Icon2
} from 'lucide-react';

const AICategorizationFeaturePage = () => {
  const [activeTransaction, setActiveTransaction] = useState('coffee');
  const [isCategorizationActive, setIsCategorizationActive] = useState(false);
  const [currentResponse, setCurrentResponse] = useState('');
  const [categorizationStage, setCategorizationStage] = useState(0);
  const [showMagic, setShowMagic] = useState(false);

  // Tag's AI Team for Categorization
  const categorizationTeam = [
    {
      name: "Tag",
      role: "AI Categorization Master & Pattern Recognition Expert",
      specialty: "99.2% Categorization Accuracy",
      superpower: "Self-Learning Organization",
      color: "from-teal-500 via-cyan-500 to-blue-500",
      icon: "🏷️",
      description: "Your personal AI organization specialist who transforms messy transactions into perfectly categorized financial insights. Tag learns from every interaction to become more accurate over time.",
      avatar: "🏷️"
    },
    {
      name: "Byte",
      role: "Data Processing & Pattern Analysis",
      specialty: "Real-time Transaction Processing",
      superpower: "Lightning-Fast Analysis",
      color: "from-blue-500 to-indigo-600",
      icon: "💾",
      description: "Works with Tag to process thousands of transactions instantly, identifying patterns and similarities that humans might miss. Byte ensures every transaction gets analyzed in milliseconds.",
      avatar: "💾"
    },
    {
      name: "Crystal",
      role: "Predictive Categorization & Trend Detection",
      specialty: "Future Category Prediction",
      superpower: "Anticipates Your Needs",
      color: "from-indigo-500 to-purple-600",
      icon: "🔮",
      description: "Helps Tag predict what category a transaction should be before you even think about it. Crystal uses historical data to suggest the most likely category with high confidence.",
      avatar: "🔮"
    },
    {
      name: "Wisdom",
      role: "Strategic Organization & Learning",
      specialty: "Continuous Improvement",
      superpower: "Gets Smarter Every Day",
      color: "from-purple-500 to-pink-600",
      icon: "🧠",
      description: "Provides strategic insights to Tag's categorization system, ensuring continuous learning and improvement. Wisdom helps Tag understand context and make better decisions.",
      avatar: "🧠"
    }
  ];

  // Categorization Scenarios
  const categorizationScenarios = [
    {
      type: "coffee",
      user: "Tag, categorize this transaction: 'Starbucks Coffee'",
      tag: "Let me analyze this transaction and find the perfect category... I'm seeing some interesting patterns here!",
      byte: "Processing transaction data... I've identified 47 similar coffee purchases in your history.",
      crystal: "Based on your spending patterns, this is 99.7% likely to be 'Food & Dining' with a coffee subcategory.",
      wisdom: "This aligns with your morning routine. I recommend creating a 'Coffee & Beverages' subcategory for better tracking.",
      color: "from-green-500 to-emerald-600",
      category: "Food & Dining",
      confidence: "99.7%",
      subcategory: "Coffee & Beverages",
      learning: "Learned: Morning coffee pattern detected"
    },
    {
      type: "transport",
      user: "Tag, what category is 'Uber Ride'?",
      tag: "Let me examine this transportation transaction and categorize it perfectly... This is a clear pattern!",
      byte: "Analyzing location data and time patterns... I've found 23 similar ride-sharing transactions.",
      crystal: "This is 98.9% likely to be 'Transportation' based on your travel habits and the service provider.",
      wisdom: "Consider creating a 'Ride-Sharing' subcategory to distinguish from public transport and fuel costs.",
      color: "from-blue-500 to-indigo-600",
      category: "Transportation",
      confidence: "98.9%",
      subcategory: "Ride-Sharing",
      learning: "Learned: Evening transportation pattern identified"
    },
    {
      type: "shopping",
      user: "Tag, categorize 'Amazon Purchase' for me",
      tag: "Let me analyze this shopping transaction and find the right category... I'm detecting some shopping patterns!",
      byte: "Processing merchant data... I've identified 156 Amazon transactions with various product categories.",
      crystal: "This is 95.2% likely to be 'Shopping' based on the merchant and your purchase history.",
      wisdom: "I suggest creating product-specific subcategories like 'Electronics', 'Books', or 'Household' for better organization.",
      color: "from-purple-500 to-pink-600",
      category: "Shopping",
      confidence: "95.2%",
      subcategory: "Online Retail",
      learning: "Learned: Amazon shopping frequency pattern"
    },
    {
      type: "entertainment",
      user: "Tag, what's the category for 'Netflix Subscription'?",
      tag: "Let me categorize this entertainment transaction... I'm seeing a clear subscription pattern!",
      byte: "Analyzing recurring payment data... I've found 8 similar subscription transactions.",
      crystal: "This is 99.1% likely to be 'Entertainment' based on the service type and your subscription history.",
      wisdom: "Consider grouping all your streaming subscriptions under 'Digital Entertainment' for better budget tracking.",
      color: "from-orange-500 to-red-600",
      category: "Entertainment",
      confidence: "99.1%",
      subcategory: "Streaming Services",
      learning: "Learned: Monthly entertainment subscription pattern"
    }
  ];

  // Categorization Learning Stages
  const learningStages = [
    {
      stage: 1,
      title: "Pattern Recognition",
      description: "Tag analyzes thousands of transactions to identify spending patterns",
      icon: "🔍",
      color: "from-blue-500 to-cyan-500"
    },
    {
      stage: 2,
      title: "Machine Learning",
      description: "AI continuously improves accuracy based on your corrections and preferences",
      icon: "🧠",
      color: "from-cyan-500 to-teal-500"
    },
    {
      stage: 3,
      title: "Predictive Categorization",
      description: "Tag anticipates categories before you even think about them",
      icon: "🔮",
      color: "from-teal-500 to-green-500"
    },
    {
      stage: 4,
      title: "Smart Organization",
      description: "Creates intelligent subcategories and grouping for better insights",
      icon: "📊",
      color: "from-green-500 to-emerald-500"
    },
    {
      stage: 5,
      title: "Financial Intelligence",
      description: "Transforms raw data into actionable financial insights and trends",
      icon: "💡",
      color: "from-emerald-500 to-blue-500"
    }
  ];

  // Simulate AI response
  useEffect(() => {
    if (isCategorizationActive) {
      const currentScenario = categorizationScenarios.find(s => s.type === activeTransaction);
      if (currentScenario) {
        setCurrentResponse(currentScenario.tag);
        setCategorizationStage(0);
      }
    }
  }, [isCategorizationActive, activeTransaction]);

  const startCategorizationService = (transactionType: string) => {
    setActiveTransaction(transactionType);
    setIsCategorizationActive(true);
    setShowMagic(true);
    setTimeout(() => setShowMagic(false), 2000);
  };

  const nextCategorization = () => {
    setCategorizationStage(prev => prev + 1);
    const currentScenario = getCurrentScenario();
    if (categorizationStage === 0) {
      setCurrentResponse(currentScenario.byte);
    } else if (categorizationStage === 1) {
      setCurrentResponse(currentScenario.crystal);
    } else if (categorizationStage === 2) {
      setCurrentResponse(currentScenario.wisdom);
    }
  };

  const getCurrentScenario = () => {
    return categorizationScenarios.find(s => s.type === activeTransaction) || categorizationScenarios[0];
  };

  return (
    <>
      <Helmet>
        <title>AI Categorization Theater - Your AI Organization Master for Perfect Financial Categorization | XspensesAI</title>
        <meta name="description" content="Experience Tag's AI Categorization Theater where messy transactions become perfectly organized financial insights. 99.2% accuracy with self-learning AI that gets smarter every day." />
        <meta name="keywords" content="AI categorization, financial organization, transaction categorization, AI learning, financial insights, expense tracking" />
        <style>
          {`
            @keyframes spin-slow {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
            .animate-spin-slow {
              animation: spin-slow 8s linear infinite;
            }
          `}
        </style>
      </Helmet>

      {/* Hero Section */}
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 pt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          {/* Prime's Crown Badge */}
          <div className="text-center mb-8">
            <div
              className="inline-flex items-center bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400 text-white px-4 py-2 rounded-full shadow-2xl"
            >
              <Crown size={20} className="mr-2" />
              <span className="font-bold">Prime's AI Organization Division</span>
            </div>
          </div>

          {/* Hero Content */}
          <div className="text-center mb-16">
            <h1
              className="text-5xl md:text-7xl font-extrabold text-white mb-6"
            >
              AI Categorization Theater
            </h1>
            <p
              className="text-xl md:text-2xl text-white/80 max-w-4xl mx-auto mb-8"
            >
              Where Tag and his AI team transform messy transactions into perfectly organized financial insights with 99.2% accuracy
            </p>
            <div
              className="flex flex-col sm:flex-row gap-4 justify-center"
            >
              <Link
                to="/signup"
                className="bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white px-8 py-4 rounded-xl font-bold text-lg transition-all duration-200 transform hover:scale-105 shadow-2xl"
              >
                Start Organizing Today
              </Link>
              <button
                onClick={() => startCategorizationService('coffee')}
                className="bg-white/10 hover:bg-white/20 text-white px-8 py-4 rounded-xl font-bold text-lg transition-all duration-200 border border-white/20 backdrop-blur-md"
              >
                Watch Tag in Action
              </button>
            </div>
          </div>

          {/* Performance Stats */}
          <div
            className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16"
          >
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-teal-400 mb-2">99.2%</div>
              <div className="text-white/60">Accuracy Rate</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-cyan-400 mb-2">2.1s</div>
              <div className="text-white/60">Avg. Processing</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-blue-400 mb-2">1M+</div>
              <div className="text-white/60">Transactions Processed</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-purple-400 mb-2">24/7</div>
              <div className="text-white/60">AI Learning</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tag's AI Team Showcase */}
      <section className="py-20 bg-gradient-to-br from-slate-800 to-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Meet Tag's AI Organization Team
            </h2>
            <p className="text-xl text-white/60 max-w-3xl mx-auto">
              Meet the AI specialists who make Tag's categorization possible with their unique abilities and expertise
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {categorizationTeam.map((member, index) => (
              <div
                key={member.name}
                className="bg-gradient-to-br from-white/5 to-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 hover:border-white/30 transition-all duration-300 hover:scale-105"
              >
                <div className="text-center">
                  <div className={`w-20 h-20 bg-gradient-to-r ${member.color} rounded-full flex items-center justify-center text-4xl mb-4 mx-auto`}>
                    {member.avatar}
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">{member.name}</h3>
                  <p className="text-teal-400 font-semibold text-sm mb-3">{member.role}</p>
                  <div className="bg-white/10 rounded-lg p-3 mb-4">
                    <p className="text-white/80 text-sm font-semibold">{member.specialty}</p>
                  </div>
                  <div className="bg-gradient-to-r from-teal-500/20 to-cyan-500/20 rounded-lg p-3 mb-4">
                    <p className="text-teal-300 text-sm font-semibold">{member.superpower}</p>
                  </div>
                  <p className="text-white/70 text-sm leading-relaxed">{member.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Live Categorization Demo */}
      <section className="py-20 bg-gradient-to-br from-slate-900 to-blue-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Live Categorization Theater
            </h2>
            <p className="text-xl text-white/60 max-w-3xl mx-auto">
              Experience Tag's mystical categorization in real-time as he consults with his AI team to perfectly organize your transactions
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Demo Interface */}
            <div
              className="bg-gradient-to-br from-white/5 to-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20"
            >
              <h3 className="text-2xl font-bold text-white mb-6">Try Tag's Magic</h3>
              
              {/* Transaction Selection */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                {categorizationScenarios.map((scenario) => (
                  <button
                    key={scenario.type}
                    onClick={() => startCategorizationService(scenario.type)}
                    className={`p-4 rounded-xl text-left transition-all duration-200 ${
                      activeTransaction === scenario.type
                        ? 'bg-gradient-to-r from-teal-500/20 to-cyan-500/20 border border-teal-400/50'
                        : 'bg-white/5 hover:bg-white/10 border border-white/10'
                    }`}
                  >
                    <div className="text-white font-semibold mb-1">
                      {scenario.type === 'coffee' && '☕ Coffee'}
                      {scenario.type === 'transport' && '🚗 Transport'}
                      {scenario.type === 'shopping' && '🛒 Shopping'}
                      {scenario.type === 'entertainment' && '🎬 Entertainment'}
                    </div>
                    <div className="text-white/60 text-sm">
                      {scenario.user.split(': ')[1]}
                    </div>
                  </button>
                ))}
              </div>

              {/* AI Response Display */}
              {isCategorizationActive && (
                <div
                  className="bg-gradient-to-br from-teal-500/10 to-cyan-500/10 rounded-xl p-6 border border-teal-400/30"
                >
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-10 h-10 bg-gradient-to-r from-teal-500 to-cyan-600 rounded-full flex items-center justify-center">
                      <TagIcon size={20} className="text-white" />
                    </div>
                    <div className="text-white font-semibold">Tag's Response</div>
                  </div>
                  <p className="text-white/90 mb-4">{currentResponse}</p>
                  
                  {categorizationStage < 3 && (
                    <button
                      onClick={nextCategorization}
                      className="bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white px-4 py-2 rounded-lg font-semibold transition-all duration-200"
                    >
                      Continue Analysis
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Results Display */}
            <div
              className="space-y-6"
            >
              {categorizationScenarios.map((scenario) => (
                <div
                  key={scenario.type}
                  className={`bg-gradient-to-br ${scenario.color} rounded-2xl p-6 text-white ${
                    activeTransaction === scenario.type ? 'ring-4 ring-teal-400/50' : ''
                  }`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-xl font-bold">
                      {scenario.type === 'coffee' && '☕ Coffee Transaction'}
                      {scenario.type === 'transport' && '🚗 Transport Transaction'}
                      {scenario.type === 'shopping' && '🛒 Shopping Transaction'}
                      {scenario.type === 'entertainment' && '🎬 Entertainment Transaction'}
                    </h4>
                    <div className="text-right">
                      <div className="text-2xl font-bold">{scenario.confidence}</div>
                      <div className="text-sm opacity-80">Confidence</div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="bg-white/20 rounded-lg p-3">
                      <div className="text-sm opacity-80">Category</div>
                      <div className="font-semibold">{scenario.category}</div>
                    </div>
                    <div className="bg-white/20 rounded-lg p-3">
                      <div className="text-sm opacity-80">Subcategory</div>
                      <div className="font-semibold">{scenario.subcategory}</div>
                    </div>
                  </div>
                  
                  <div className="bg-white/20 rounded-lg p-3">
                    <div className="text-sm opacity-80 mb-2">AI Learning</div>
                    <div className="font-semibold">{scenario.learning}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Tag's Learning Journey */}
      <section className="py-20 bg-gradient-to-br from-slate-800 to-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Tag's Learning Journey
            </h2>
            <p className="text-xl text-white/60 max-w-3xl mx-auto">
              Watch Tag evolve from basic categorization to intelligent financial organization through continuous AI learning
            </p>
          </div>

          <div className="relative">
            {/* Connection Line */}
            <div className="absolute left-1/2 top-0 bottom-0 w-1 bg-gradient-to-b from-teal-500 to-cyan-500 transform -translate-x-1/2"></div>
            
            <div className="space-y-12">
              {learningStages.map((stage, index) => (
                <div
                  key={stage.stage}
                  className={`flex items-center ${index % 2 === 0 ? 'flex-row' : 'flex-row-reverse'}`}
                >
                  {/* Stage Content */}
                  <div className={`flex-1 ${index % 2 === 0 ? 'pr-8 text-right' : 'pl-8 text-left'}`}>
                    <div className={`inline-block bg-gradient-to-r ${stage.color} rounded-2xl p-6 text-white max-w-md`}>
                      <div className="text-3xl mb-3">{stage.icon}</div>
                      <h3 className="text-xl font-bold mb-2">Stage {stage.stage}: {stage.title}</h3>
                      <p className="text-white/90">{stage.description}</p>
                    </div>
                  </div>
                  
                  {/* Stage Number */}
                  <div className="relative z-10">
                    <div className={`w-16 h-16 bg-gradient-to-r ${stage.color} rounded-full flex items-center justify-center text-white font-bold text-xl border-4 border-slate-800`}>
                      {stage.stage}
                    </div>
                  </div>
                  
                  {/* Empty Space for Alignment */}
                  <div className="flex-1"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-20 bg-gradient-to-br from-teal-900 to-cyan-900">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <div
          >
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Ready to Experience Tag's Magic?
            </h2>
            <p className="text-xl text-white/80 mb-8">
              Join thousands of users who've transformed their financial organization with Tag's AI categorization. 
              Experience 99.2% accuracy and watch your finances become perfectly organized.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/signup"
                className="bg-white text-teal-900 hover:bg-gray-100 px-8 py-4 rounded-xl font-bold text-lg transition-all duration-200 transform hover:scale-105 shadow-2xl"
              >
                Start Organizing Today
              </Link>
              <Link
                to="/ai-employees"
                className="bg-white/10 hover:bg-white/20 text-white px-8 py-4 rounded-xl font-bold text-lg transition-all duration-200 border border-white/20 backdrop-blur-md"
              >
                Meet the Full AI Team
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default AICategorizationFeaturePage;
