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
  PieChart, Download, Upload, Globe, Lock, Key, Wifi, Smartphone,
  Flame, Rocket, Gem, Compass, Telescope, Crown as CrownIcon,
  Eye as EyeIcon, Sparkles as SparklesIcon, Zap as ZapIcon,
  TrendingUp as TrendingUpIcon, AlertTriangle, Calendar, DollarSign,
  Clock as ClockIcon, Target as TargetIcon, BarChart3 as BarChart3Icon,
  PieChart as PieChartIcon, TrendingDown as TrendingDownIcon,
  ArrowUpRight, ArrowDownRight, Minus, Plus, RotateCcw, Shuffle
} from 'lucide-react';

const PredictionsFeaturePage = () => {
  const [activePrediction, setActivePrediction] = useState('spending');
  const [isCrystalActive, setIsCrystalActive] = useState(false);
  const [currentPrediction, setCurrentPrediction] = useState('');
  const [predictionStage, setPredictionStage] = useState(0);
  const [crystalBallGlow, setCrystalBallGlow] = useState(false);
  const [showFortune, setShowFortune] = useState(false);

  // Crystal's AI Team for Predictions
  const crystalTeam = [
    {
      name: "Crystal",
      role: "AI Fortune Teller & Future Predictor",
      specialty: "94% Prediction Accuracy",
      superpower: "Sees Your Financial Future",
      color: "from-indigo-500 via-purple-500 to-pink-500",
      icon: "🔮",
      description: "Your personal AI Fortune Teller who can see into your financial future with 94% accuracy. Crystal reads patterns, predicts trends, and reveals opportunities before they happen.",
      avatar: "🔮"
    },
    {
      name: "Finley",
      role: "Financial Intelligence Partner",
      specialty: "Pattern Analysis & Data Intelligence",
      superpower: "Always-on Financial Intelligence",
      color: "from-blue-500 to-purple-600",
      icon: "💼",
      description: "Crystal's data partner who analyzes your spending patterns and provides the intelligence needed for accurate predictions. Finley ensures every prediction is based on solid financial data.",
      avatar: "💼"
    },
    {
      name: "Nova",
      role: "Opportunity Spotter & Innovation Expert",
      specialty: "Trend Detection & Opportunity Discovery",
      superpower: "Creative Problem Solving",
      color: "from-teal-500 to-cyan-500",
      icon: "🌱",
      description: "Works with Crystal to spot emerging trends and identify financial opportunities before they become obvious. Nova helps Crystal see beyond current patterns.",
      avatar: "🌱"
    },
    {
      name: "Wisdom",
      role: "Strategic Advisor & Long-term Planner",
      specialty: "Strategic Forecasting & Planning",
      superpower: "Sees Patterns Others Miss",
      color: "from-blue-500 to-indigo-500",
      icon: "🧠",
      description: "Provides strategic context to Crystal's predictions, helping interpret what the future means for your long-term financial goals and planning.",
      avatar: "🧠"
    }
  ];

  // Crystal's Prediction Scenarios
  const predictionScenarios = [
    {
      type: "spending",
      user: "Crystal, what will my spending look like next month?",
      crystal: "Let me gaze into my crystal ball and reveal your financial future... I'm seeing some interesting patterns emerging.",
      finley: "Based on your spending history, I've detected a 23% increase in discretionary spending over the next 30 days.",
      nova: "I'm spotting a new trend - you're likely to spend 15% more on entertainment and dining out next month.",
      wisdom: "This aligns with your seasonal pattern. I recommend increasing your entertainment budget by $150 to avoid stress.",
      color: "from-purple-500 to-pink-600",
      timeline: "Next Month",
      prediction: "$2,847",
      confidence: "94%",
      trend: "↗️ 23% Increase"
    },
    {
      type: "savings",
      user: "Crystal, will I be able to save my target amount this quarter?",
      crystal: "Let me consult the financial stars and reveal your savings destiny... This is a fascinating prediction!",
      finley: "Your current savings trajectory shows you'll reach 87% of your quarterly goal based on current patterns.",
      nova: "I've identified 3 new income opportunities that could boost your savings by an additional $800 this quarter.",
      wisdom: "With strategic adjustments, you can exceed your savings goal by 12%. The stars are aligned in your favor!",
      color: "from-green-500 to-emerald-600",
      timeline: "This Quarter",
      prediction: "$3,200",
      confidence: "96%",
      trend: "🎯 Exceed Goal by 12%"
    },
    {
      type: "investments",
      user: "Crystal, what does the future hold for my investment portfolio?",
      crystal: "Let me peer into the financial cosmos and reveal what the markets have in store for you...",
      finley: "Market analysis shows your current portfolio is positioned for a 12-18% return over the next 6 months.",
      nova: "I'm detecting an emerging opportunity in tech stocks that could accelerate your returns by 3-5%.",
      wisdom: "The timing is perfect for rebalancing. I see optimal entry points in the next 30 days for maximum impact.",
      color: "from-orange-500 to-red-600",
      timeline: "6 Months",
      prediction: "15-20% Return",
      confidence: "91%",
      trend: "📈 Strong Growth Expected"
    },
    {
      type: "emergencies",
      user: "Crystal, should I be worried about any financial emergencies coming up?",
      crystal: "Let me consult the financial spirits and reveal any hidden dangers in your future...",
      finley: "I've detected a potential 40% increase in home maintenance costs over the next 4 months.",
      nova: "Your car maintenance cycle suggests a $600 expense in the next 60 days that wasn't in your budget.",
      wisdom: "This is manageable with preparation. I recommend building a $1,000 emergency buffer within 30 days.",
      color: "from-yellow-500 to-orange-600",
      timeline: "Next 4 Months",
      prediction: "$1,400",
      confidence: "89%",
      trend: "⚠️ Prepare for Expenses"
    }
  ];

  // Crystal's Fortune Cards
  const fortuneCards = [
    {
      title: "Financial Abundance",
      message: "Your savings will grow faster than expected this quarter. The universe is aligning for your financial success!",
      icon: "💰",
      color: "from-green-400 to-emerald-500",
      confidence: "94%"
    },
    {
      title: "Opportunity Knocks",
      message: "A new income stream will reveal itself in the next 30 days. Keep your eyes open for unexpected opportunities!",
      icon: "🚪",
      color: "from-blue-400 to-cyan-500",
      confidence: "87%"
    },
    {
      title: "Smart Spending",
      message: "Your spending patterns are becoming more intelligent. You're developing financial wisdom that will serve you well!",
      icon: "🧠",
      color: "from-purple-400 to-pink-500",
      confidence: "92%"
    },
    {
      title: "Market Timing",
      message: "The stars align for investment decisions in the next 2 weeks. Trust your instincts and act decisively!",
      icon: "⭐",
      color: "from-yellow-400 to-orange-500",
      confidence: "89%"
    },
    {
      title: "Debt Freedom",
      message: "Your path to debt freedom is clearer than ever. Stay the course and you'll see remarkable progress!",
      icon: "🕊️",
      color: "from-indigo-400 to-blue-500",
      confidence: "91%"
    },
    {
      title: "Financial Harmony",
      message: "Your income and expenses are finding perfect balance. This harmony will bring you peace and prosperity!",
      icon: "🎵",
      color: "from-teal-400 to-green-500",
      confidence: "93%"
    }
  ];

  // Crystal's Learning Journey
  const crystalLearningStages = [
    {
      stage: "Pattern Recognition",
      description: "Crystal learns your basic spending patterns and financial rhythms",
      icon: "🔍",
      color: "from-blue-400 to-cyan-500",
      accuracy: "75%",
      aiTeam: ["Crystal", "Finley"]
    },
    {
      stage: "Seasonal Insights",
      description: "Crystal discovers recurring patterns and seasonal spending cycles",
      icon: "🌱",
      color: "from-green-400 to-emerald-500",
      accuracy: "85%",
      aiTeam: ["Crystal", "Finley", "Nova"]
    },
    {
      stage: "Predictive Power",
      description: "Crystal achieves 94% accuracy in predicting future expenses",
      icon: "🔮",
      color: "from-purple-400 to-pink-500",
      accuracy: "94%",
      aiTeam: ["Crystal", "Finley", "Nova", "Wisdom"]
    },
    {
      stage: "Future Vision",
      description: "Crystal can see opportunities and risks months in advance",
      icon: "👁️",
      color: "from-indigo-400 to-blue-500",
      accuracy: "96%",
      aiTeam: ["Crystal", "Entire AI Team"]
    },
    {
      stage: "Cosmic Wisdom",
      description: "Crystal becomes your personal financial oracle with divine accuracy",
      icon: "✨",
      color: "from-yellow-400 to-orange-500",
      accuracy: "98%",
      aiTeam: ["Crystal", "Prime's Full AI Orchestra"]
    }
  ];

  // Simulate crystal ball prediction
  useEffect(() => {
    if (isCrystalActive) {
      setCrystalBallGlow(true);
      const timer = setTimeout(() => {
        setIsCrystalActive(false);
        setCrystalBallGlow(false);
        setCurrentPrediction(predictionScenarios.find(s => s.type === activePrediction)?.crystal || '');
        setShowFortune(true);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [isCrystalActive, activePrediction]);

  const startCrystalPrediction = () => {
    setIsCrystalActive(true);
    setCurrentPrediction('');
    setPredictionStage(0);
    setShowFortune(false);
  };

  const nextPrediction = () => {
    const currentIndex = predictionScenarios.findIndex(s => s.type === activePrediction);
    if (currentIndex < predictionScenarios.length - 1) {
      const nextPrediction = predictionScenarios[currentIndex + 1];
      setActivePrediction(nextPrediction.type);
      setIsCrystalActive(true);
      setCurrentPrediction('');
      setShowFortune(false);
    }
  };

  const getCurrentPrediction = () => {
    return predictionScenarios.find(s => s.type === activePrediction) || predictionScenarios[0];
  };

  const shuffleFortuneCards = () => {
    setShowFortune(false);
    setTimeout(() => setShowFortune(true), 500);
  };

  return (
    <>
      <Helmet>
        <title>AI Crystal Ball Theater - Your AI Fortune Teller for Financial Predictions | XspensesAI</title>
        <meta name="description" content="Meet Crystal - Your AI Fortune Teller with 94% prediction accuracy! Experience the revolutionary AI Crystal Ball Theater where AI predicts your financial future with mystical precision." />
      </Helmet>

      {/* Hero Section - AI Crystal Ball Theater */}
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center relative overflow-hidden pt-20">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 left-20 w-32 h-32 bg-indigo-500/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute top-40 right-32 w-24 h-24 bg-purple-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
          <div className="absolute bottom-32 left-32 w-28 h-28 bg-pink-500/20 rounded-full blur-3xl animate-pulse delay-2000"></div>
          <div className="absolute top-1/2 left-1/2 w-40 h-40 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1500"></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          {/* Prime's Crown Badge */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400 text-white px-4 py-2 rounded-full mb-8 shadow-2xl"
          >
            <Crown size={20} className="mr-2" />
            <span className="font-bold">Prime's AI Prediction Division</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-4xl md:text-7xl font-bold text-white mb-8"
          >
            Welcome to <span className="text-purple-400 font-extrabold drop-shadow-lg">Crystal's</span> AI Crystal Ball Theater
          </motion.h1>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="text-2xl md:text-3xl font-bold text-white/90 mb-6"
          >
            Where AI Fortune Telling Meets Financial Predictions with 94% Accuracy
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="text-lg md:text-xl text-white/80 mb-12 max-w-4xl mx-auto leading-relaxed"
          >
            Step into the world's first AI Crystal Ball Theater where <span className="text-purple-300 font-bold">Crystal</span>, your AI Fortune Teller, 
            works with <span className="text-blue-300 font-bold">Finley</span>, <span className="text-teal-300 font-bold">Nova</span>, and <span className="text-cyan-300 font-bold">Wisdom</span> 
            to reveal your financial future with mystical precision. Experience AI predictions wrapped in magical entertainment!
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16"
          >
            <button
              onClick={startCrystalPrediction}
              className="bg-gradient-to-r from-purple-400 via-indigo-400 to-pink-400 text-white px-8 py-4 rounded-2xl font-bold text-lg hover:scale-105 transition-transform duration-200 shadow-2xl flex items-center"
            >
              <Gem size={24} className="mr-2" />
              Ask Crystal for a Prediction
            </button>
            <Link
              to="/ai-employees"
              className="bg-white/10 backdrop-blur-md text-white px-8 py-4 rounded-2xl font-bold text-lg hover:bg-white/20 transition-colors duration-200 border border-white/20 flex items-center"
            >
              <Users size={24} className="mr-2" />
              Meet the AI Fortune Team
            </Link>
          </motion.div>

          {/* Crystal's Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto"
          >
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-purple-400 mb-2">94%</div>
              <div className="text-white/70">Prediction Accuracy</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-indigo-400 mb-2">🔮</div>
              <div className="text-white/70">AI Fortune Teller</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-pink-400 mb-2">4 AI</div>
              <div className="text-white/70">Prediction Specialists</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-cyan-400 mb-2">∞</div>
              <div className="text-white/70">Future Visions</div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Crystal's AI Fortune Team */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
            Crystal's <span className="text-purple-400 font-extrabold drop-shadow-lg">AI Fortune Team</span>
          </h2>
          <p className="text-xl text-white/70 max-w-3xl mx-auto">
            Meet the AI specialists who make Crystal's predictions possible with their unique abilities and expertise
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {crystalTeam.map((member, index) => (
            <motion.div
              key={member.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.2 }}
              className="bg-gradient-to-br from-white/5 to-white/10 backdrop-blur-md rounded-3xl p-8 border border-white/20 hover:border-white/40 transition-all duration-300 hover:scale-105"
            >
              <div className="text-center mb-6">
                <div className={`w-20 h-20 bg-gradient-to-r ${member.color} rounded-full flex items-center justify-center mx-auto mb-4 shadow-2xl text-4xl`}>
                  {member.avatar}
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">{member.name}</h3>
                <p className="text-purple-400 font-semibold">{member.role}</p>
              </div>
              
              <div className="space-y-4">
                <div>
                  <h4 className="text-white font-semibold mb-2">Specialty</h4>
                  <p className="text-white/70 text-sm">{member.specialty}</p>
                </div>
                <div>
                  <h4 className="text-white font-semibold mb-2">Superpower</h4>
                  <p className="text-white/70 text-sm">{member.superpower}</p>
                </div>
                <p className="text-white/80 text-sm leading-relaxed">{member.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Live Crystal Ball Theater */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
            <span className="text-purple-400 font-extrabold drop-shadow-lg">Live AI</span> Crystal Ball Theater
          </h2>
          <p className="text-xl text-white/70 max-w-3xl mx-auto">
            Experience Crystal's mystical predictions in real-time as she consults with her AI team to reveal your financial future
          </p>
        </motion.div>

        <div className="bg-gradient-to-br from-white/5 to-white/10 backdrop-blur-md rounded-3xl p-8 border border-white/20">
          {/* Prediction Type Selector */}
          <div className="flex flex-wrap justify-center gap-4 mb-8">
            {predictionScenarios.map((prediction) => (
              <button
                key={prediction.type}
                onClick={() => setActivePrediction(prediction.type)}
                className={`px-6 py-3 rounded-xl font-semibold transition-all duration-200 ${
                  activePrediction === prediction.type
                    ? 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-lg'
                    : 'bg-white/10 text-white/70 hover:bg-white/20'
                }`}
              >
                {prediction.type.charAt(0).toUpperCase() + prediction.type.slice(1)}
              </button>
            ))}
          </div>

          {/* Crystal Ball Theater Display */}
          <div className="bg-slate-800 rounded-2xl p-6 mb-8 min-h-96">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              </div>
              <span className="text-white/50 text-sm">Crystal's AI Fortune Theater - 94% Accuracy</span>
            </div>
            
            <div className="space-y-4">
              {/* User Question */}
              <div className="flex justify-end">
                <div className="bg-blue-600 text-white px-4 py-2 rounded-2xl rounded-br-md max-w-xs">
                  {getCurrentPrediction().user}
                </div>
              </div>
              
              {/* Crystal's Crystal Ball Response */}
              <div className="flex justify-start">
                <div className={`bg-gradient-to-r ${getCurrentPrediction().color} text-white px-4 py-2 rounded-2xl rounded-bl-md max-w-md`}>
                  {isCrystalActive ? (
                    <div className="flex items-center space-x-1">
                      <span>Crystal is gazing into her crystal ball...</span>
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-white rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-white rounded-full animate-bounce delay-100"></div>
                        <div className="w-2 h-2 bg-white rounded-full animate-bounce delay-200"></div>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="text-xs text-white/70 mb-1">
                        Crystal • AI Fortune Teller
                      </div>
                      {currentPrediction}
                    </div>
                  )}
                </div>
              </div>

              {/* AI Team Fortune Revelations */}
              {!isCrystalActive && (
                <>
                  <div className="flex justify-start">
                    <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-2 rounded-2xl rounded-bl-md max-w-md">
                      <div className="text-xs text-white/70 mb-1">Finley • Financial Intelligence</div>
                      {getCurrentPrediction().finley}
                    </div>
                  </div>
                  
                  <div className="flex justify-start">
                    <div className="bg-gradient-to-r from-teal-500 to-cyan-500 text-white px-4 py-2 rounded-2xl rounded-bl-md max-w-md">
                      <div className="text-xs text-white/70 mb-1">Nova • Opportunity Spotter</div>
                      {getCurrentPrediction().nova}
                    </div>
                  </div>
                  
                  <div className="flex justify-start">
                    <div className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white px-4 py-2 rounded-2xl rounded-bl-md max-w-md">
                      <div className="text-xs text-white/70 mb-1">Wisdom • Strategic Advisor</div>
                      {getCurrentPrediction().wisdom}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Prediction Summary */}
          <div className="bg-gradient-to-br from-purple-500/10 to-indigo-500/10 rounded-2xl p-6 mb-8 border border-purple-500/20">
            <div className="grid md:grid-cols-5 gap-6 text-center">
              <div>
                <div className="text-2xl font-bold text-purple-400 mb-2">{getCurrentPrediction().timeline}</div>
                <div className="text-white/70">Timeline</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-indigo-400 mb-2">{getCurrentPrediction().prediction}</div>
                <div className="text-white/70">Prediction</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-400 mb-2">{getCurrentPrediction().confidence}</div>
                <div className="text-white/70">Confidence</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-cyan-400 mb-2">{getCurrentPrediction().trend}</div>
                <div className="text-white/70">Trend</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-pink-400 mb-2">🔮</div>
                <div className="text-white/70">Crystal's Vision</div>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex justify-center space-x-4">
            <button
              onClick={startCrystalPrediction}
              className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-6 py-3 rounded-xl font-semibold hover:scale-105 transition-transform duration-200 flex items-center"
            >
              <Gem size={20} className="mr-2" />
              Ask Crystal Again
            </button>
            <button
              onClick={nextPrediction}
              disabled={activePrediction === predictionScenarios[predictionScenarios.length - 1].type}
              className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-6 py-3 rounded-xl font-semibold hover:scale-105 transition-transform duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              <ArrowRight size={20} className="mr-2" />
              Next Prediction
            </button>
          </div>
        </div>
      </div>

      {/* Crystal's Fortune Cards */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
            <span className="text-purple-400 font-extrabold drop-shadow-lg">Crystal's</span> Fortune Cards
          </h2>
          <p className="text-xl text-white/70 max-w-3xl mx-auto">
            Let Crystal reveal your financial fortune with these mystical prediction cards
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          {fortuneCards.map((card, index) => (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="bg-gradient-to-br from-white/5 to-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 hover:border-white/40 transition-all duration-300 hover:scale-105"
            >
              <div className="text-center mb-4">
                <div className={`w-16 h-16 bg-gradient-to-r ${card.color} rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg text-3xl`}>
                  {card.icon}
                </div>
                <h3 className="text-xl font-bold text-white mb-2">{card.title}</h3>
                <p className="text-white/70 mb-3">{card.message}</p>
                <div className="text-sm text-purple-300 font-semibold">
                  Crystal's Confidence: {card.confidence}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="text-center">
          <button
            onClick={shuffleFortuneCards}
            className="bg-gradient-to-r from-purple-500 to-indigo-500 text-white px-8 py-4 rounded-2xl font-bold text-lg hover:scale-105 transition-transform duration-200 shadow-2xl flex items-center mx-auto"
          >
            <Shuffle size={24} className="mr-2" />
            Shuffle Fortune Cards
          </button>
        </div>
      </div>

      {/* Crystal's Learning Journey */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
            Crystal's <span className="text-purple-400 font-extrabold drop-shadow-lg">Learning Journey</span>
          </h2>
          <p className="text-xl text-white/70 max-w-3xl mx-auto">
            Watch how Crystal evolves from a novice fortune teller to your personal financial oracle
          </p>
        </motion.div>

        <div className="relative">
          {/* Connection Line */}
          <div className="absolute top-1/2 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 via-indigo-500 to-pink-500 transform -translate-y-1/2 hidden lg:block"></div>
          
          <div className="grid lg:grid-cols-5 gap-8">
            {crystalLearningStages.map((stage, index) => (
              <motion.div
                key={stage.stage}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="relative text-center"
              >
                <div className={`w-20 h-20 bg-gradient-to-r ${stage.color} rounded-full flex items-center justify-center mx-auto mb-4 shadow-2xl text-3xl`}>
                  {stage.icon}
                </div>
                <h3 className="text-xl font-bold text-white mb-2">{stage.stage}</h3>
                <p className="text-white/70 text-sm mb-3">{stage.description}</p>
                <div className="text-xs text-purple-300 mb-2">
                  <strong>Accuracy:</strong> {stage.accuracy}
                </div>
                <div className="text-xs text-purple-300">
                  <strong>AI Team:</strong> {stage.aiTeam.join(', ')}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Call to Action */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="bg-gradient-to-r from-purple-500/20 via-indigo-500/20 to-pink-500/20 backdrop-blur-md rounded-3xl p-12 border border-white/20 text-center"
        >
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
            Ready to Discover Your <span className="text-purple-400 font-extrabold drop-shadow-lg">Financial Future</span>?
          </h2>
          <p className="text-xl text-white/80 mb-8 max-w-3xl mx-auto">
            Join thousands of users who've experienced Crystal's mystical predictions with 94% accuracy. 
            Your financial fortune awaits in the AI Crystal Ball Theater!
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/pricing"
              className="bg-gradient-to-r from-purple-400 via-indigo-400 to-pink-400 text-white px-8 py-4 rounded-2xl font-bold text-lg hover:scale-105 transition-transform duration-200 shadow-2xl flex items-center justify-center"
            >
              <Gem size={24} className="mr-2" />
              Start Your Fortune Journey
            </Link>
            <Link
              to="/ai-employees"
              className="bg-white/10 backdrop-blur-md text-white px-8 py-4 rounded-2xl font-bold text-lg hover:bg-white/20 transition-colors duration-200 border border-white/20 flex items-center justify-center"
            >
              <Users size={24} className="mr-2" />
              Meet the Full AI Team
            </Link>
          </div>
        </motion.div>
      </div>
    </>
  );
};

export default PredictionsFeaturePage; 
