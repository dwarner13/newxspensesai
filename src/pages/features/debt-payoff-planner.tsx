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
  Bell, AlertCircle, CheckCircle2, XCircle, CreditCard as CreditCardIcon,
  Home, Car, ShoppingCart, Heart as HeartIcon, Zap as ZapIcon2,
  Upload, Download, TrendingDown as TrendingDownIcon2, Target as TargetIcon2
} from 'lucide-react';

const DebtPayoffPlannerFeaturePage = () => {
  const [activeDebt, setActiveDebt] = useState('car');
  const [isLiberationActive, setIsLiberationActive] = useState(false);
  const [currentResponse, setCurrentResponse] = useState('');
  const [liberationStage, setLiberationStage] = useState(0);
  const [showFreedom, setShowFreedom] = useState(false);
  const [debtAmount, setDebtAmount] = useState(25000);
  const [interestRate, setInterestRate] = useState(6.5);
  const [monthlyPayment, setMonthlyPayment] = useState(450);

  // Blitz's AI Team for Debt Liberation
  const liberationTeam = [
    {
      name: "Blitz",
      role: "AI Debt Liberation Master & Freedom Strategist",
      specialty: "3x Faster Debt Payoff",
      superpower: "Debt Crushing Momentum",
      color: "from-yellow-500 via-orange-500 to-red-500",
      icon: "⚡",
      description: "Your personal AI debt liberation specialist who transforms overwhelming debt into achievable freedom plans. Blitz creates momentum and keeps you motivated until you're completely debt-free.",
      avatar: "⚡"
    },
    {
      name: "Liberty",
      role: "Financial Freedom & Stress Reduction",
      specialty: "87% Stress Reduction",
      superpower: "Freedom from Financial Anxiety",
      color: "from-red-500 to-pink-600",
      icon: "🗽",
      description: "Works with Blitz to eliminate the emotional burden of debt. Liberty helps you break free from financial stress and envision your debt-free future with confidence.",
      avatar: "🗽"
    },
    {
      name: "Crystal",
      role: "Predictive Debt Analysis & Strategy Optimization",
      specialty: "Future Freedom Prediction",
      superpower: "Anticipates Your Success",
      color: "from-indigo-500 to-purple-600",
      icon: "🔮",
      description: "Helps Blitz predict the optimal debt payoff strategy and timeline. Crystal uses AI to analyze your situation and suggest the fastest path to financial freedom.",
      avatar: "🔮"
    },
    {
      name: "Wisdom",
      role: "Strategic Debt Planning & Interest Optimization",
      specialty: "Interest Savings Maximization",
      superpower: "Maximizes Your Money",
      color: "from-purple-500 to-pink-600",
      icon: "🧠",
      description: "Provides strategic insights to Blitz's liberation system, ensuring you save maximum interest and achieve freedom with the most efficient strategy possible.",
      avatar: "🧠"
    }
  ];

  // Debt Liberation Scenarios
  const liberationScenarios = [
    {
      type: "car",
      user: "Blitz, help me pay off my $25,000 car loan faster!",
      blitz: "Let's crush this car debt together! I'm analyzing your loan details and creating a liberation strategy... This is freedom in motion!",
      liberty: "Freedom from car payments is within reach! I'm calculating how much faster you can be debt-free with our strategies.",
      crystal: "Based on your current payment, I predict you can be debt-free in 3.2 years instead of 5.5 years - that's 2.3 years faster!",
      wisdom: "Consider the debt avalanche method - pay extra on this high-interest loan first. You'll save $3,200 in interest!",
      color: "from-blue-500 to-indigo-600",
      debt: "Car Loan",
      amount: "$25,000",
      currentTime: "5.5 years",
      freedomTime: "3.2 years",
      interestSaved: "$3,200"
    },
    {
      type: "credit",
      user: "Blitz, I have $15,000 in credit card debt",
      blitz: "Credit card debt is the enemy of freedom! Let me create a liberation strategy that will set you free... This is financial emancipation!",
      liberty: "Freedom from credit card slavery starts now! I'm mapping your path to zero balances and financial independence.",
      crystal: "With our strategy, you can eliminate this debt in 18 months instead of 7 years - that's 5.5 years faster to freedom!",
      wisdom: "Use the debt snowball method - pay off smaller balances first for quick wins and momentum. You'll save $8,400 in interest!",
      color: "from-purple-500 to-pink-600",
      debt: "Credit Cards",
      amount: "$15,000",
      currentTime: "7 years",
      freedomTime: "18 months",
      interestSaved: "$8,400"
    },
    {
      type: "student",
      user: "Blitz, help me tackle my $35,000 student loans",
      blitz: "Student debt is holding back your future! Let me create a liberation strategy that will unlock your potential... This is educational freedom!",
      liberty: "Freedom from student debt means you can pursue your dreams without financial chains. Let's break these bonds together!",
      crystal: "With our optimized strategy, you can be debt-free in 4.8 years instead of 10 years - that's 5.2 years faster to freedom!",
      wisdom: "Consider income-based repayment optimization and extra payments during high-earning months. You'll save $12,600 in interest!",
      color: "from-green-500 to-emerald-600",
      debt: "Student Loans",
      amount: "$35,000",
      currentTime: "10 years",
      freedomTime: "4.8 years",
      interestSaved: "$12,600"
    },
    {
      type: "personal",
      user: "Blitz, I have a $20,000 personal loan to pay off",
      blitz: "Personal loan debt is personal business! Let me create a liberation strategy that's tailored just for you... This is personalized freedom!",
      liberty: "Freedom from personal loan debt means you can focus on what matters most. Let's create a plan that fits your life perfectly!",
      crystal: "With our personalized strategy, you can eliminate this debt in 2.9 years instead of 6 years - that's 3.1 years faster to freedom!",
      wisdom: "Use debt consolidation if rates are lower, and apply windfalls directly to principal. You'll save $4,800 in interest!",
      color: "from-orange-500 to-red-600",
      debt: "Personal Loan",
      amount: "$20,000",
      currentTime: "6 years",
      freedomTime: "2.9 years",
      interestSaved: "$4,800"
    }
  ];

  // Liberation Stages
  const liberationStages = [
    {
      stage: 1,
      title: "Debt Analysis",
      description: "Blitz analyzes your debt structure and identifies optimization opportunities",
      icon: "🔍",
      color: "from-blue-500 to-cyan-500"
    },
    {
      stage: 2,
      title: "Strategy Creation",
      description: "AI creates personalized debt payoff strategies for maximum efficiency",
      icon: "⚡",
      color: "from-cyan-500 to-teal-500"
    },
    {
      stage: 3,
      title: "Freedom Timeline",
      description: "Visual roadmap showing your journey from debt slavery to financial freedom",
      icon: "🗽",
      color: "from-teal-500 to-green-500"
    },
    {
      stage: 4,
      title: "Momentum Building",
      description: "Blitz keeps you motivated with progress tracking and milestone celebrations",
      icon: "🚀",
      color: "from-green-500 to-emerald-500"
    },
    {
      stage: 5,
      title: "Debt Freedom",
      description: "Complete liberation from debt with strategies to stay debt-free forever",
      icon: "🎉",
      color: "from-emerald-500 to-blue-500"
    }
  ];

  // Calculate debt payoff scenarios
  const calculatePayoff = () => {
    const principal = debtAmount;
    const rate = interestRate / 100 / 12;
    const payment = monthlyPayment;
    
    // Standard payoff time
    const standardMonths = Math.log(payment / (payment - principal * rate)) / Math.log(1 + rate);
    
    // Aggressive payoff with extra $200/month
    const aggressivePayment = payment + 200;
    const aggressiveMonths = Math.log(aggressivePayment / (aggressivePayment - principal * rate)) / Math.log(1 + rate);
    
    // Interest saved
    const standardInterest = (payment * standardMonths) - principal;
    const aggressiveInterest = (aggressivePayment * aggressiveMonths) - principal;
    const interestSaved = standardInterest - aggressiveInterest;
    
    return {
      standard: Math.ceil(standardMonths),
      aggressive: Math.ceil(aggressiveMonths),
      interestSaved: Math.round(interestSaved)
    };
  };

  const payoffResults = calculatePayoff();

  // Simulate AI response
  useEffect(() => {
    if (isLiberationActive) {
      const currentScenario = liberationScenarios.find(s => s.type === activeDebt);
      if (currentScenario) {
        setCurrentResponse(currentScenario.blitz);
        setLiberationStage(0);
      }
    }
  }, [isLiberationActive, activeDebt]);

  const startLiberationService = (debtType: string) => {
    setActiveDebt(debtType);
    setIsLiberationActive(true);
    setShowFreedom(true);
    setTimeout(() => setShowFreedom(false), 2000);
  };

  const nextLiberationStage = () => {
    setLiberationStage(prev => prev + 1);
    const currentScenario = getCurrentScenario();
    if (liberationStage === 0) {
      setCurrentResponse(currentScenario.liberty);
    } else if (liberationStage === 1) {
      setCurrentResponse(currentScenario.crystal);
    } else if (liberationStage === 2) {
      setCurrentResponse(currentScenario.wisdom);
    }
  };

  const getCurrentScenario = () => {
    return liberationScenarios.find(s => s.type === activeDebt) || liberationScenarios[0];
  };

  return (
    <>
      <Helmet>
        <title>AI Debt Liberation Theater - Your AI Freedom Master for 3x Faster Debt Payoff | XspensesAI</title>
        <meta name="description" content="Experience Blitz's AI Debt Liberation Theater where overwhelming debt becomes achievable freedom plans. 3x faster payoff with personalized strategies and momentum building." />
        <meta name="keywords" content="AI debt payoff, debt liberation, debt freedom, debt strategy, debt calculator, financial freedom, debt elimination" />
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
              0%, 100% { box-shadow: 0 0 20px rgba(245, 158, 11, 0.4); }
              50% { box-shadow: 0 0 40px rgba(245, 158, 11, 0.8); }
            }
            .animate-pulse-glow {
              animation: pulse-glow 2s ease-in-out infinite;
            }
          `}
        </style>
      </Helmet>

      {/* Hero Section */}
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-yellow-900 to-slate-900 pt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          {/* Prime's Crown Badge */}
          <div className="text-center mb-8">
            <div
              className="inline-flex items-center bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400 text-white px-4 py-2 rounded-full shadow-2xl"
            >
              <Crown size={20} className="mr-2" />
              <span className="font-bold">Prime's AI Debt Liberation Division</span>
            </div>
          </div>

          {/* Hero Content */}
          <div className="text-center mb-16">
            <h1
              className="text-5xl md:text-7xl font-extrabold text-white mb-6"
            >
              AI Debt Liberation Theater
            </h1>
            <p
              className="text-xl md:text-2xl text-white/80 max-w-4xl mx-auto mb-8"
            >
              Where Blitz and his AI team transform overwhelming debt into achievable freedom plans with 3x faster payoff strategies
            </p>
            <div
              className="flex flex-col sm:flex-row gap-4 justify-center"
            >
              <Link
                to="/signup"
                className="bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-600 hover:to-orange-700 text-white px-8 py-4 rounded-xl font-bold text-lg transition-all duration-200 transform hover:scale-105 shadow-2xl"
              >
                Start Your Liberation
              </Link>
              <button
                onClick={() => startLiberationService('car')}
                className="bg-white/10 hover:bg-white/20 text-white px-8 py-4 rounded-xl font-bold text-lg transition-all duration-200 border border-white/20 backdrop-blur-md"
              >
                Watch Blitz in Action
              </button>
            </div>
          </div>

          {/* Performance Stats */}
          <div
            className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16"
          >
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-yellow-400 mb-2">3x</div>
              <div className="text-white/60">Faster Payoff</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-orange-400 mb-2">$28,000</div>
              <div className="text-white/60">Avg. Interest Saved</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-red-400 mb-2">87%</div>
              <div className="text-white/60">Stress Reduction</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-yellow-400 mb-2">24/7</div>
              <div className="text-white/60">AI Motivation</div>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Debt Calculator */}
      <section className="py-20 bg-gradient-to-br from-slate-800 to-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Your Personal Debt Liberation Calculator
            </h2>
            <p className="text-xl text-white/60 max-w-3xl mx-auto">
              Upload your debt details and watch Blitz create your personalized freedom strategy
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Input Interface */}
            <div
              className="bg-gradient-to-br from-white/5 to-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20"
            >
              <h3 className="text-2xl font-bold text-white mb-6">Upload Your Debt Details</h3>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-white/80 text-sm font-semibold mb-2">Debt Amount</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/60">$</span>
                    <input
                      type="number"
                      value={debtAmount}
                      onChange={(e) => setDebtAmount(Number(e.target.value))}
                      className="w-full pl-8 pr-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-yellow-500/50"
                      placeholder="25000"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-white/80 text-sm font-semibold mb-2">Interest Rate (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={interestRate}
                    onChange={(e) => setInterestRate(Number(e.target.value))}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-yellow-500/50"
                    placeholder="6.5"
                  />
                </div>

                <div>
                  <label className="block text-white/80 text-sm font-semibold mb-2">Monthly Payment</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/60">$</span>
                    <input
                      type="number"
                      value={monthlyPayment}
                      onChange={(e) => setMonthlyPayment(Number(e.target.value))}
                      className="w-full pl-8 pr-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-yellow-500/50"
                      placeholder="450"
                    />
                  </div>
                </div>

                <button
                  onClick={() => startLiberationService('car')}
                  className="w-full bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-600 hover:to-orange-700 text-white py-3 rounded-lg font-semibold transition-all duration-200 transform hover:scale-105"
                >
                  Calculate My Liberation Strategy
                </button>
              </div>
            </div>

            {/* Results Display */}
            <div
              className="space-y-6"
            >
              <div className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 rounded-2xl p-6 border border-yellow-400/30">
                <h4 className="text-xl font-bold text-white mb-4">Your Liberation Results</h4>
                
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="bg-white/20 rounded-lg p-3">
                    <div className="text-sm text-white/80">Current Payoff Time</div>
                    <div className="text-yellow-300 font-bold text-lg">{Math.ceil(payoffResults.standard / 12)} years</div>
                  </div>
                  <div className="bg-white/20 rounded-lg p-3">
                    <div className="text-sm text-white/80">With Blitz's Strategy</div>
                    <div className="text-green-300 font-bold text-lg">{Math.ceil(payoffResults.aggressive / 12)} years</div>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-lg p-4">
                  <div className="text-sm text-white/80 mb-2">Interest Saved</div>
                  <div className="text-green-300 font-bold text-2xl">${payoffResults.interestSaved.toLocaleString()}</div>
                  <div className="text-white/60 text-sm">That's money back in your pocket!</div>
                </div>

                <div className="mt-4 text-center">
                  <div className="text-white/80 text-sm mb-2">Time to Freedom</div>
                  <div className="text-yellow-300 font-bold text-lg">
                    {Math.ceil(payoffResults.standard / 12) - Math.ceil(payoffResults.aggressive / 12)} years faster!
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Blitz's AI Team Showcase */}
      <section className="py-20 bg-gradient-to-br from-slate-900 to-yellow-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Meet Blitz's AI Liberation Team
            </h2>
            <p className="text-xl text-white/60 max-w-3xl mx-auto">
              Meet the AI specialists who make Blitz's debt liberation possible with their unique abilities and expertise
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {liberationTeam.map((member, index) => (
              <div
                key={member.name}
                className="bg-gradient-to-br from-white/5 to-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 hover:border-white/30 transition-all duration-300 hover:scale-105"
              >
                <div className="text-center">
                  <div className={`w-20 h-20 bg-gradient-to-r ${member.color} rounded-full flex items-center justify-center text-4xl mb-4 mx-auto`}>
                    {member.avatar}
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">{member.name}</h3>
                  <p className="text-yellow-400 font-semibold text-sm mb-3">{member.role}</p>
                  <div className="bg-white/10 rounded-lg p-3 mb-4">
                    <p className="text-white/80 text-sm font-semibold">{member.specialty}</p>
                  </div>
                  <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-lg p-3 mb-4">
                    <p className="text-yellow-300 text-sm font-semibold">{member.superpower}</p>
                  </div>
                  <p className="text-white/70 text-sm leading-relaxed">{member.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Live Liberation Demo */}
      <section className="py-20 bg-gradient-to-br from-slate-800 to-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Live Debt Liberation Theater
            </h2>
            <p className="text-xl text-white/60 max-w-3xl mx-auto">
              Experience Blitz's magical liberation in real-time as he consults with his AI team to create your freedom strategy
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Demo Interface */}
            <div
              className="bg-gradient-to-br from-white/5 to-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20"
            >
              <h3 className="text-2xl font-bold text-white mb-6">Try Blitz's Liberation</h3>
              
              {/* Debt Selection */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                {liberationScenarios.map((scenario) => (
                  <button
                    key={scenario.type}
                    onClick={() => startLiberationService(scenario.type)}
                    className={`p-4 rounded-xl text-left transition-all duration-200 ${
                      activeDebt === scenario.type
                        ? 'bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-400/50'
                        : 'bg-white/5 hover:bg-white/10 border border-white/10'
                    }`}
                  >
                    <div className="text-white font-semibold mb-1">
                      {scenario.type === 'car' && '🚗 Car Loan'}
                      {scenario.type === 'credit' && '💳 Credit Cards'}
                      {scenario.type === 'student' && '🎓 Student Loans'}
                      {scenario.type === 'personal' && '📋 Personal Loan'}
                    </div>
                    <div className="text-white/60 text-sm">
                      {scenario.user.split(', ')[1]}
                    </div>
                  </button>
                ))}
              </div>

              {/* AI Response Display */}
              {isLiberationActive && (
                <div
                  className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 rounded-xl p-6 border border-yellow-400/30"
                >
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-10 h-10 bg-gradient-to-r from-yellow-500 to-orange-600 rounded-full flex items-center justify-center">
                      <Zap size={20} className="text-white" />
                    </div>
                    <div className="text-white font-semibold">Blitz's Response</div>
                  </div>
                  <p className="text-white/90 mb-4">{currentResponse}</p>
                  
                  {liberationStage < 3 && (
                    <button
                      onClick={nextLiberationStage}
                      className="bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-600 hover:to-orange-700 text-white px-4 py-2 rounded-lg font-semibold transition-all duration-200"
                    >
                      Continue Liberation
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Results Display */}
            <div
              className="space-y-6"
            >
              {liberationScenarios.map((scenario) => (
                <div
                  key={scenario.type}
                  className={`bg-gradient-to-br ${scenario.color} rounded-2xl p-6 text-white ${
                    activeDebt === scenario.type ? 'ring-4 ring-yellow-400/50' : ''
                  }`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-xl font-bold">
                      {scenario.type === 'car' && '🚗 Car Loan Liberation'}
                      {scenario.type === 'credit' && '💳 Credit Card Liberation'}
                      {scenario.type === 'student' && '🎓 Student Loan Liberation'}
                      {scenario.type === 'personal' && '📋 Personal Loan Liberation'}
                    </h4>
                    <div className="text-right">
                      <div className="text-2xl font-bold">{scenario.amount}</div>
                      <div className="text-sm opacity-80">Debt Amount</div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="bg-white/20 rounded-lg p-3">
                      <div className="text-sm opacity-80">Current Time</div>
                      <div className="font-semibold">{scenario.currentTime}</div>
                    </div>
                    <div className="bg-white/20 rounded-lg p-3">
                      <div className="text-sm opacity-80">Freedom Time</div>
                      <div className="font-semibold text-green-300">{scenario.freedomTime}</div>
                    </div>
                  </div>
                  
                  <div className="bg-white/20 rounded-lg p-3">
                    <div className="text-sm opacity-80 mb-2">Interest Saved</div>
                    <div className="font-semibold text-green-300">{scenario.interestSaved}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Blitz's Liberation Journey */}
      <section className="py-20 bg-gradient-to-br from-slate-900 to-yellow-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Blitz's Liberation Journey
            </h2>
            <p className="text-xl text-white/60 max-w-3xl mx-auto">
              Watch Blitz evolve from basic debt advice to intelligent liberation strategies through continuous AI learning
            </p>
          </div>

          <div className="relative">
            {/* Connection Line */}
            <div className="absolute left-1/2 top-0 bottom-0 w-1 bg-gradient-to-b from-yellow-500 to-orange-500 transform -translate-x-1/2"></div>
            
            <div className="space-y-12">
              {liberationStages.map((stage, index) => (
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
      <section className="py-20 bg-gradient-to-br from-yellow-900 to-orange-900">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <div
          >
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Ready to Experience Blitz's Liberation?
            </h2>
            <p className="text-xl text-white/80 mb-8">
              Join thousands of users who've transformed their debt with Blitz's AI liberation strategies. 
              Experience 3x faster payoff and start your journey to financial freedom today.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/signup"
                className="bg-white text-yellow-900 hover:bg-gray-100 px-8 py-4 rounded-xl font-bold text-lg transition-all duration-200 transform hover:scale-105 shadow-2xl"
              >
                Start Your Liberation
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

export default DebtPayoffPlannerFeaturePage;
