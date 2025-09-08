import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
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
  Bell, AlertCircle, CheckCircle2, XCircle, CreditCard as CreditCardIcon,
  Home, Car, ShoppingCart, Heart as HeartIcon, Zap as ZapIcon2,
  Upload, Download, TrendingDown as TrendingDownIcon2, Target as TargetIcon2,
  Lock, Key, Wifi, Smartphone, Award, Globe
} from 'lucide-react';

const AIFinancialFreedomFeaturePage = () => {
  const [activeFreedom, setActiveFreedom] = useState('stress');
  const [isFreedomActive, setIsFreedomActive] = useState(false);
  const [currentResponse, setCurrentResponse] = useState('');
  const [freedomStage, setFreedomStage] = useState(0);
  const [showTransformation, setShowTransformation] = useState(false);
  const [currentIncome, setCurrentIncome] = useState(50000);
  const [currentSavings, setCurrentSavings] = useState(5000);
  const [financialStress, setFinancialStress] = useState(8);

  // AI Financial Freedom Team
  const freedomTeam = [
    {
      name: "Liberty",
      role: "Financial Freedom & Liberation Specialist",
      specialty: "Freedom from Financial Chains",
      superpower: "87% Stress Reduction & Freedom Mapping",
      color: "from-red-500 to-pink-600",
      icon: "🗽",
      description: "Your AI liberation specialist who breaks the chains of financial stress and maps your path to complete financial freedom. Liberty transforms overwhelming financial situations into achievable freedom plans.",
      avatar: "🗽"
    },
    {
      name: "Crystal",
      role: "Future Financial Prediction & Strategy",
      specialty: "Your Financial Crystal Ball",
      superpower: "Predicts Your Freedom Timeline",
      color: "from-indigo-500 to-purple-600",
      icon: "🔮",
      description: "Uses advanced AI to predict your exact path to financial freedom. Crystal analyzes your situation and shows you exactly when and how you'll achieve complete financial independence.",
      avatar: "🔮"
    },
    {
      name: "Wisdom",
      role: "Strategic Wealth Building & Optimization",
      specialty: "Maximizes Your Financial Potential",
      superpower: "Interest Optimization & Wealth Acceleration",
      color: "from-purple-500 to-pink-600",
      icon: "🧠",
      description: "The strategic mastermind who optimizes every aspect of your financial life. Wisdom ensures you're building wealth as efficiently as possible and accelerating your path to freedom.",
      avatar: "🧠"
    },
    {
      name: "Nova",
      role: "Innovation & Financial Breakthroughs",
      specialty: "Discovers Hidden Financial Opportunities",
      superpower: "Finds Money You Didn't Know You Had",
      color: "from-blue-500 to-cyan-500",
      icon: "⭐",
      description: "The innovation specialist who discovers hidden financial opportunities and breakthrough strategies. Nova finds money and opportunities you never knew existed in your financial situation.",
      avatar: "⭐"
    },
    {
      name: "Finley",
      role: "Financial Education & Empowerment",
      specialty: "Your Personal Financial Coach",
      superpower: "Teaches You to Fish, Not Just Gives You Fish",
      color: "from-green-500 to-emerald-600",
      icon: "💰",
      description: "Your personal financial coach who educates and empowers you. Finley doesn't just give you solutions - they teach you the principles of financial freedom so you can stay free forever.",
      avatar: "💰"
    }
  ];

  // Financial Freedom Scenarios
  const freedomScenarios = [
    {
      type: "stress",
      user: "I'm drowning in financial stress and don't see a way out",
      liberty: "Freedom from financial stress starts NOW! I'm analyzing your situation and creating a liberation strategy... This is your emancipation moment!",
      crystal: "Based on your current situation, I predict you can achieve financial freedom in 4.2 years instead of 15 years - that's 10.8 years faster to freedom!",
      wisdom: "With strategic optimization, you can accelerate your wealth building by 3x. I'm identifying every opportunity to maximize your financial potential!",
      nova: "I've discovered $2,400 in hidden financial opportunities you can access immediately. Let me show you how to unlock this hidden wealth!",
      finley: "I'm creating your personalized financial education plan. You'll learn the principles that will keep you financially free for life!",
      color: "from-red-500 to-pink-600",
      situation: "Financial Stress",
      currentState: "Overwhelmed & Stuck",
      freedomState: "Complete Financial Freedom",
      timeToFreedom: "4.2 years",
      hiddenOpportunities: "$2,400"
    },
    {
      type: "debt",
      user: "I have multiple debts and feel trapped",
      liberty: "Debt is the enemy of freedom! Let me create your liberation strategy... This is financial emancipation!",
      crystal: "With our strategy, you can eliminate all debt in 3.8 years instead of 12 years - that's 8.2 years faster to freedom!",
      wisdom: "I'm optimizing your debt payoff strategy to save $18,600 in interest. That's money back in your pocket!",
      nova: "I've found $3,200 in debt consolidation opportunities and hidden savings you can access immediately!",
      finley: "I'm teaching you the debt-free mindset that will prevent you from ever falling into debt again!",
      color: "from-purple-500 to-pink-600",
      situation: "Multiple Debts",
      currentState: "Trapped & Overwhelmed",
      freedomState: "Debt-Free & Free",
      timeToFreedom: "3.8 years",
      hiddenOpportunities: "$3,200"
    },
    {
      type: "savings",
      user: "I can't seem to save money no matter what I do",
      liberty: "The chains of poor saving habits are breaking today! I'm creating your liberation strategy... This is savings freedom!",
      crystal: "I predict you can build a $50,000 emergency fund in 2.1 years instead of 8 years - that's 5.9 years faster to security!",
      wisdom: "I'm optimizing your savings strategy to maximize compound growth. You'll be amazed at how quickly your money multiplies!",
      nova: "I've discovered $1,800 in automatic savings opportunities and spending optimizations you can implement today!",
      finley: "I'm teaching you the psychology of successful saving that will make saving money feel effortless and automatic!",
      color: "from-green-500 to-emerald-600",
      situation: "Poor Saving Habits",
      currentState: "Struggling to Save",
      freedomState: "Automatic Wealth Builder",
      timeToFreedom: "2.1 years",
      hiddenOpportunities: "$1,800"
    },
    {
      type: "income",
      user: "I need to increase my income but don't know how",
      liberty: "Income limitations are breaking today! I'm creating your liberation strategy... This is income freedom!",
      crystal: "I predict you can increase your income by 47% within 18 months. That's $23,500 more per year!",
      wisdom: "I'm optimizing your income strategy to maximize every opportunity. You'll be earning more than you ever thought possible!",
      nova: "I've discovered $4,200 in immediate income opportunities and side hustle potential you can start this week!",
      finley: "I'm teaching you the skills and mindset that will make you an income magnet for life!",
      color: "from-blue-500 to-indigo-600",
      situation: "Limited Income",
      currentState: "Income Stagnant",
      freedomState: "Income Magnet",
      timeToFreedom: "18 months",
      hiddenOpportunities: "$4,200"
    }
  ];

  // Freedom Transformation Stages
  const freedomStages = [
    {
      stage: 1,
      title: "Financial Analysis",
      description: "Liberty analyzes your current financial situation and identifies liberation opportunities",
      icon: "🔍",
      color: "from-red-500 to-pink-500"
    },
    {
      stage: 2,
      title: "Freedom Prediction",
      description: "Crystal predicts your exact path to financial freedom with timeline and milestones",
      icon: "🔮",
      color: "from-pink-500 to-purple-500"
    },
    {
      stage: 3,
      title: "Strategy Optimization",
      description: "Wisdom optimizes your wealth building strategy for maximum efficiency",
      icon: "🧠",
      color: "from-purple-500 to-indigo-500"
    },
    {
      stage: 4,
      title: "Opportunity Discovery",
      description: "Nova uncovers hidden financial opportunities and breakthrough strategies",
      icon: "⭐",
      color: "from-indigo-500 to-blue-500"
    },
    {
      stage: 5,
      title: "Education & Empowerment",
      description: "Finley creates your personalized financial education plan for lasting freedom",
      icon: "💰",
      color: "from-blue-500 to-green-500"
    }
  ];

  // Calculate financial freedom scenarios
  const calculateFreedom = () => {
    const income = currentIncome;
    const savings = currentSavings;
    const stress = financialStress;
    
    // Current financial health score (0-100)
    const currentScore = Math.max(0, 100 - (stress * 10) + (savings / income * 100));
    
    // Predicted improvement with AI strategies
    const predictedScore = Math.min(100, currentScore + 45);
    
    // Years to financial freedom
    const yearsToFreedom = Math.max(2, 15 - (predictedScore / 10));
    
    // Hidden opportunities discovered
    const hiddenOpportunities = Math.round(income * 0.08);
    
    return {
      currentScore: Math.round(currentScore),
      predictedScore: Math.round(predictedScore),
      yearsToFreedom: yearsToFreedom.toFixed(1),
      hiddenOpportunities: hiddenOpportunities
    };
  };

  const freedomResults = calculateFreedom();

  // Simulate AI response
  useEffect(() => {
    if (isFreedomActive) {
      const currentScenario = freedomScenarios.find(s => s.type === activeFreedom);
      if (currentScenario) {
        setCurrentResponse(currentScenario.liberty);
        setFreedomStage(0);
      }
    }
  }, [isFreedomActive, activeFreedom]);

  const startFreedomService = (freedomType: string) => {
    setActiveFreedom(freedomType);
    setIsFreedomActive(true);
    setShowTransformation(true);
    setTimeout(() => setShowTransformation(false), 2000);
  };

  const nextFreedomStage = () => {
    setFreedomStage(prev => prev + 1);
    const currentScenario = getCurrentScenario();
    if (freedomStage === 0) {
      setCurrentResponse(currentScenario.crystal);
    } else if (freedomStage === 1) {
      setCurrentResponse(currentScenario.wisdom);
    } else if (freedomStage === 2) {
      setCurrentResponse(currentScenario.nova);
    } else if (freedomStage === 3) {
      setCurrentResponse(currentScenario.finley);
    }
  };

  const getCurrentScenario = () => {
    return freedomScenarios.find(s => s.type === activeFreedom) || freedomScenarios[0];
  };

  return (
    <>
      <Helmet>
        <title>AI Financial Freedom Theater - Your AI Liberation Team for Complete Financial Freedom | XspensesAI</title>
        <meta name="description" content="Experience the AI Financial Freedom Theater where 5 AI specialists work together to transform your financial stress into complete freedom. 87% stress reduction with personalized liberation strategies." />
        <meta name="keywords" content="AI financial freedom, financial liberation, financial stress relief, wealth building, financial independence, AI financial advisors" />
        <style>
          {`
            @keyframes spin-slow {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
            .animate-spin-slow {
              animation: spin-slow 8s linear infinite;
            }
            @keyframes pulse-glow {
              0%, 100% { box-shadow: 0 0 20px rgba(236, 72, 153, 0.4); }
              50% { box-shadow: 0 0 40px rgba(236, 72, 153, 0.8); }
            }
            .animate-pulse-glow {
              animation: pulse-glow 2s ease-in-out infinite;
            }
          `}
        </style>
      </Helmet>

      {/* Hero Section */}
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-pink-900 to-slate-900 pt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          {/* Prime's Crown Badge */}
          <div className="text-center mb-8">
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400 text-white px-4 py-2 rounded-full shadow-2xl"
            >
              <Crown size={20} className="mr-2" />
              <span className="font-bold">Prime's AI Financial Freedom Division</span>
            </motion.div>
          </div>

          {/* Hero Content */}
          <div className="text-center mb-16">
                         <motion.h1 
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ duration: 0.8 }}
               className="text-5xl md:text-7xl font-extrabold text-white mb-6"
             >
               AI Financial Freedom Theater
             </motion.h1>
             <motion.p 
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ duration: 0.8, delay: 0.2 }}
               className="text-xl md:text-2xl text-white/80 max-w-4xl mx-auto mb-8"
             >
               Experience the AI Financial Freedom Division where 5 AI specialists collaborate to transform your financial stress into complete freedom with 87% stress reduction and personalized liberation strategies
             </motion.p>
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="flex flex-col sm:flex-row gap-4 justify-center"
            >
              <Link
                to="/signup"
                className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white px-8 py-4 rounded-xl font-bold text-lg transition-all duration-200 transform hover:scale-105 shadow-2xl"
              >
                Start Your Freedom Journey
              </Link>
              <button
                onClick={() => startFreedomService('stress')}
                className="bg-white/10 hover:bg-white/20 text-white px-8 py-4 rounded-xl font-bold text-lg transition-all duration-200 border border-white/20 backdrop-blur-md"
              >
                Watch AI Team in Action
              </button>
            </motion.div>
          </div>

          {/* Performance Stats */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16"
          >
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-pink-400 mb-2">87%</div>
              <div className="text-white/60">Stress Reduction</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-purple-400 mb-2">5</div>
              <div className="text-white/60">AI Specialists</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-pink-400 mb-2">3x</div>
              <div className="text-white/60">Faster to Freedom</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-purple-400 mb-2">24/7</div>
              <div className="text-white/60">AI Collaboration</div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Interactive Freedom Calculator */}
      <section className="py-20 bg-gradient-to-br from-slate-800 to-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Your Personal Financial Freedom Calculator
            </h2>
            <p className="text-xl text-white/60 max-w-3xl mx-auto">
              Input your financial situation and watch our AI team create your personalized freedom strategy
            </p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Input Interface */}
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              className="bg-gradient-to-br from-white/5 to-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20"
            >
              <h3 className="text-2xl font-bold text-white mb-6">Your Financial Situation</h3>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-white/80 text-sm font-semibold mb-2">Annual Income</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/60">$</span>
                    <input
                      type="number"
                      value={currentIncome}
                      onChange={(e) => setCurrentIncome(Number(e.target.value))}
                      className="w-full pl-8 pr-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-pink-500/50"
                      placeholder="50000"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-white/80 text-sm font-semibold mb-2">Current Savings</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/60">$</span>
                    <input
                      type="number"
                      value={currentSavings}
                      onChange={(e) => setCurrentSavings(Number(e.target.value))}
                      className="w-full pl-8 pr-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-pink-500/50"
                      placeholder="5000"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-white/80 text-sm font-semibold mb-2">Financial Stress Level (1-10)</label>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={financialStress}
                    onChange={(e) => setFinancialStress(Number(e.target.value))}
                    className="w-full h-3 bg-white/20 rounded-lg appearance-none cursor-pointer slider"
                  />
                  <div className="flex justify-between text-white/60 text-sm mt-1">
                    <span>Low Stress</span>
                    <span className="text-pink-400 font-semibold">{financialStress}/10</span>
                    <span>High Stress</span>
                  </div>
                </div>

                <button
                  onClick={() => startFreedomService('stress')}
                  className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white py-3 rounded-lg font-semibold transition-all duration-200 transform hover:scale-105"
                >
                  Calculate My Freedom Strategy
                </button>
              </div>
            </motion.div>

            {/* Results Display */}
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              className="space-y-6"
            >
              <div className="bg-gradient-to-br from-pink-500/20 to-purple-500/20 rounded-2xl p-6 border border-pink-400/30">
                <h4 className="text-xl font-bold text-white mb-4">Your Freedom Results</h4>
                
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="bg-white/20 rounded-lg p-3">
                    <div className="text-sm text-white/80">Current Score</div>
                    <div className="text-pink-300 font-bold text-lg">{freedomResults.currentScore}/100</div>
                  </div>
                  <div className="bg-white/20 rounded-lg p-3">
                    <div className="text-sm text-white/80">With AI Team</div>
                    <div className="text-purple-300 font-bold text-lg">{freedomResults.predictedScore}/100</div>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-lg p-4 mb-4">
                  <div className="text-sm text-white/80 mb-2">Time to Financial Freedom</div>
                  <div className="text-green-300 font-bold text-2xl">{freedomResults.yearsToFreedom} years</div>
                  <div className="text-white/60 text-sm">Instead of 15+ years!</div>
                </div>

                <div className="bg-gradient-to-r from-blue-500/20 to-indigo-500/20 rounded-lg p-4">
                  <div className="text-sm text-white/80 mb-2">Hidden Opportunities</div>
                  <div className="text-blue-300 font-bold text-2xl">${freedomResults.hiddenOpportunities.toLocaleString()}</div>
                  <div className="text-white/60 text-sm">Discovered by our AI team!</div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* AI Freedom Team Showcase */}
      <section className="py-20 bg-gradient-to-br from-slate-900 to-pink-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Meet Your AI Financial Freedom Team
            </h2>
            <p className="text-xl text-white/60 max-w-3xl mx-auto">
              Meet the 5 AI specialists who work together to transform your financial stress into complete freedom
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            {freedomTeam.map((member, index) => (
              <motion.div
                key={member.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: index * 0.1 }}
                className="bg-gradient-to-br from-white/5 to-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 hover:border-white/30 transition-all duration-300 hover:scale-105"
              >
                <div className="text-center">
                  <div className={`w-16 h-16 bg-gradient-to-r ${member.color} rounded-full flex items-center justify-center text-3xl mb-4 mx-auto`}>
                    {member.avatar}
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">{member.name}</h3>
                  <p className="text-pink-400 font-semibold text-xs mb-3">{member.role}</p>
                  <div className="bg-white/10 rounded-lg p-2 mb-3">
                    <p className="text-white/80 text-xs font-semibold">{member.specialty}</p>
                  </div>
                  <div className="bg-gradient-to-r from-pink-500/20 to-purple-500/20 rounded-lg p-2 mb-3">
                    <p className="text-pink-300 text-xs font-semibold">{member.superpower}</p>
                  </div>
                  <p className="text-white/70 text-xs leading-relaxed">{member.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Live Freedom Theater */}
      <section className="py-20 bg-gradient-to-br from-slate-800 to-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Live Financial Freedom Theater
            </h2>
            <p className="text-xl text-white/60 max-w-3xl mx-auto">
              Experience our AI team working together in real-time to create your personalized freedom strategy
            </p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Demo Interface */}
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              className="bg-gradient-to-br from-white/5 to-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20"
            >
              <h3 className="text-2xl font-bold text-white mb-6">Try Our Freedom Theater</h3>
              
              {/* Freedom Selection */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                {freedomScenarios.map((scenario) => (
                  <button
                    key={scenario.type}
                    onClick={() => startFreedomService(scenario.type)}
                    className={`p-4 rounded-xl text-left transition-all duration-200 ${
                      activeFreedom === scenario.type
                        ? 'bg-gradient-to-r from-pink-500/20 to-purple-500/20 border border-pink-400/50'
                        : 'bg-white/5 hover:bg-white/10 border border-white/10'
                    }`}
                  >
                    <div className="text-white font-semibold mb-1">
                      {scenario.type === 'stress' && '😰 Financial Stress'}
                      {scenario.type === 'debt' && '💳 Multiple Debts'}
                      {scenario.type === 'savings' && '💰 Poor Saving'}
                      {scenario.type === 'income' && '📈 Limited Income'}
                    </div>
                    <div className="text-white/60 text-sm">
                      {scenario.user.split(', ')[1]}
                    </div>
                  </button>
                ))}
              </div>

              {/* AI Response Display */}
              {isFreedomActive && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-gradient-to-br from-pink-500/10 to-purple-500/10 rounded-xl p-6 border border-pink-400/30"
                >
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-10 h-10 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full flex items-center justify-center">
                      <Sparkles size={20} className="text-white" />
                    </div>
                    <div className="text-white font-semibold">AI Team Response</div>
                  </div>
                  <p className="text-white/90 mb-4">{currentResponse}</p>
                  
                  {freedomStage < 4 && (
                    <button
                      onClick={nextFreedomStage}
                      className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white px-4 py-2 rounded-lg font-semibold transition-all duration-200"
                    >
                      Continue Freedom Journey
                    </button>
                  )}
                </motion.div>
              )}
            </motion.div>

            {/* Results Display */}
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              className="space-y-6"
            >
              {freedomScenarios.map((scenario) => (
                <div
                  key={scenario.type}
                  className={`bg-gradient-to-br ${scenario.color} rounded-2xl p-6 text-white ${
                    activeFreedom === scenario.type ? 'ring-4 ring-pink-400/50' : ''
                  }`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-xl font-bold">
                      {scenario.type === 'stress' && '😰 Financial Stress Liberation'}
                      {scenario.type === 'debt' && '💳 Debt Freedom Strategy'}
                      {scenario.type === 'savings' && '💰 Savings Transformation'}
                      {scenario.type === 'income' && '📈 Income Liberation'}
                    </h4>
                    <div className="text-right">
                      <div className="text-2xl font-bold">{scenario.hiddenOpportunities}</div>
                      <div className="text-sm opacity-80">Hidden Opportunities</div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="bg-white/20 rounded-lg p-3">
                      <div className="text-sm opacity-80">Current State</div>
                      <div className="font-semibold">{scenario.currentState}</div>
                    </div>
                    <div className="bg-white/20 rounded-lg p-3">
                      <div className="text-sm opacity-80">Freedom State</div>
                      <div className="font-semibold text-green-300">{scenario.freedomState}</div>
                    </div>
                  </div>
                  
                  <div className="bg-white/20 rounded-lg p-3">
                    <div className="text-sm opacity-80 mb-2">Time to Freedom</div>
                    <div className="font-semibold text-green-300">{scenario.timeToFreedom}</div>
                  </div>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* Freedom Transformation Journey */}
      <section className="py-20 bg-gradient-to-br from-slate-900 to-pink-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Your Freedom Transformation Journey
            </h2>
            <p className="text-xl text-white/60 max-w-3xl mx-auto">
              Watch our AI team transform your financial situation through 5 stages of liberation
            </p>
          </motion.div>

          <div className="relative">
            {/* Connection Line */}
            <div className="absolute left-1/2 top-0 bottom-0 w-1 bg-gradient-to-b from-pink-500 to-purple-500 transform -translate-x-1/2"></div>
            
            <div className="space-y-12">
              {freedomStages.map((stage, index) => (
                <motion.div
                  key={stage.stage}
                  initial={{ opacity: 0, x: index % 2 === 0 ? -20 : 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.8, delay: index * 0.1 }}
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
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-20 bg-gradient-to-br from-pink-900 to-purple-900">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Ready to Experience Financial Freedom?
            </h2>
            <p className="text-xl text-white/80 mb-8">
              Join thousands of users who've transformed their financial stress into complete freedom with our AI team. 
              Experience 87% stress reduction and start your journey to financial liberation today.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/signup"
                className="bg-white text-pink-900 hover:bg-gray-100 px-8 py-4 rounded-xl font-bold text-lg transition-all duration-200 transform hover:scale-105 shadow-2xl"
              >
                Start Your Freedom Journey
              </Link>
              <Link
                to="/ai-employees"
                className="bg-white/10 hover:bg-white/20 text-white px-8 py-4 rounded-xl font-bold text-lg transition-all duration-200 border border-white/20 backdrop-blur-md"
              >
                Meet the Full AI Team
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </>
  );
};

export default AIFinancialFreedomFeaturePage;
