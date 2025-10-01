import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { 
  Crown, Bot, Calculator, BarChart3, Brain, Headphones, 
  Users, Zap, Target, TrendingUp, ArrowRight, Star,
  CheckCircle, Play, Settings, MessageCircle, Sparkles, Clock, Shield,
  Mic, Music, TrendingDown, FileText, CreditCard, PiggyBank, Building2,
  Heart, Eye, Lightbulb, Shield as SecurityIcon, Volume2, Briefcase,
  PieChart, Download, Upload, Globe, Lock, Key, Wifi, Smartphone,
  Flame, Rocket, Gem, Compass, Telescope, Crown as CrownIcon,
  Trophy, Award, Gift, Champagne, Diamond, Star as StarIcon,
  Map, Navigation, Compass as CompassIcon, Target as TargetIcon
} from 'lucide-react';

const GoalConciergePage = () => {
  const [activeGoal, setActiveGoal] = useState('house');
  const [isConciergeActive, setIsConciergeActive] = useState(false);
  const [currentResponse, setCurrentResponse] = useState('');
  const [goalStage, setGoalStage] = useState(0);
  const [aiTeamActive, setAiTeamActive] = useState([]);

  // AI Concierge Team (Integrating Our Existing AI Employees)
  const aiConciergeTeam = [
    {
      name: "Goalie",
      role: "Wealth Architect & Goal Master",
      specialty: "Orchestrating your entire wealth journey",
      superpower: "Goal Achievement Rate: 94%",
      color: "from-purple-500 to-pink-600",
      icon: "🥅",
      description: "Your dedicated AI concierge who coordinates the entire AI team to make your financial dreams a reality. Goalie is the master conductor of your wealth symphony.",
      avatar: "🥅"
    },
    {
      name: "Finley",
      role: "Financial Intelligence Partner",
      specialty: "24/7 Financial Intelligence & Analysis",
      superpower: "Always-on Financial Intelligence",
      color: "from-blue-500 to-purple-600",
      icon: "💼",
      description: "Your always-on financial sidekick who provides instant answers and deep financial insights. Finley works with Goalie to analyze your financial DNA.",
      avatar: "💼"
    },
    {
      name: "Crystal",
      role: "Future Predictor & Trend Analyst",
      specialty: "Spending predictions & market opportunities",
      superpower: "94% Prediction Accuracy",
      color: "from-indigo-500 to-blue-600",
      icon: "🔮",
      description: "The visionary who sees your financial future and identifies opportunities before they happen. Crystal helps Goalie create proactive wealth strategies.",
      avatar: "🔮"
    },
    {
      name: "Nova",
      role: "Opportunity Spotter & Innovation Expert",
      specialty: "Side hustles, income optimization & creative solutions",
      superpower: "Creative Problem Solving",
      color: "from-teal-500 to-cyan-500",
      icon: "🌱",
      description: "The creative problem solver who finds new ways to grow your wealth. Nova works with Goalie to discover innovative income opportunities.",
      avatar: "🌱"
    },
    {
      name: "Wisdom",
      role: "Strategic Advisor & Long-term Planner",
      specialty: "Investment strategy & long-term planning",
      superpower: "Sees Patterns Others Miss",
      color: "from-blue-500 to-indigo-500",
      icon: "🧠",
      description: "The wise mentor who helps you think strategically about your wealth. Wisdom collaborates with Goalie to build sustainable financial foundations.",
      avatar: "🧠"
    }
  ];

  // Luxury Goal Planning Scenarios
  const goalScenarios = [
    {
      type: "house",
      user: "I want to buy my dream house in 5 years. How do we make this happen?",
      goalie: "Excellent choice! Let me coordinate our AI team to create your personalized house-buying strategy. This is exactly what we excel at.",
      finley: "Based on your current financial profile, you'll need approximately $120,000 for a 20% down payment on a $600,000 home.",
      crystal: "I'm predicting a 15% increase in your income over the next 3 years, which will accelerate your savings timeline by 8 months.",
      nova: "I've identified 3 side hustle opportunities that could generate an additional $2,500 monthly, putting you 2 years ahead of schedule!",
      wisdom: "Let's diversify your savings strategy: 60% in high-yield savings, 30% in conservative investments, and 10% in emergency reserves.",
      color: "from-blue-500 to-purple-600",
      timeline: "5 years",
      target: "$120,000",
      teamEffort: "5 AI specialists working together"
    },
    {
      type: "retirement",
      user: "I want to retire at 55 with $3 million. What's our strategy?",
      goalie: "Ambitious and achievable! Let me assemble our retirement dream team to create your early retirement roadmap.",
      finley: "Your current retirement trajectory shows $2.1M at 65. We need to optimize your strategy to reach $3M by 55.",
      crystal: "Market analysis shows optimal investment windows in the next 18 months. I'm timing your contributions for maximum impact.",
      nova: "I've calculated that increasing your income by 25% through career advancement and side hustles will bridge the gap perfectly.",
      wisdom: "We'll use a 70/30 aggressive growth strategy for the next 15 years, then gradually shift to 40/60 for capital preservation.",
      color: "from-green-500 to-emerald-600",
      timeline: "15 years",
      target: "$3,000,000",
      teamEffort: "5 AI specialists working together"
    },
    {
      type: "business",
      user: "I want to start my own business with $100K in 3 years. How do we build this?",
      goalie: "Entrepreneurial spirit! Let me coordinate our business launch team to create your startup funding strategy.",
      finley: "Your current savings rate of $1,200 monthly needs to increase to $2,800 to reach $100K in 3 years.",
      crystal: "I'm detecting a market opportunity in your industry that could accelerate your timeline by 6 months if we act now.",
      nova: "I've identified 5 side business ideas that align with your skills and could generate $3,000 monthly while building your startup fund.",
      wisdom: "We'll use a 50/50 strategy: 50% in liquid savings for immediate access, 50% in growth investments for potential acceleration.",
      color: "from-orange-500 to-red-600",
      timeline: "3 years",
      target: "$100,000",
      teamEffort: "5 AI specialists working together"
    },
    {
      type: "legacy",
      user: "I want to leave a $5 million legacy for my family. How do we build generational wealth?",
      goalie: "Legacy building is our highest calling! Let me assemble our generational wealth team to create your family's financial future.",
      finley: "Your current wealth trajectory shows $2.8M at 65. We need to optimize for generational transfer and tax efficiency.",
      crystal: "I'm predicting significant market opportunities in the next decade that could accelerate your legacy building by 5-7 years.",
      nova: "I've identified estate planning strategies and investment vehicles that could multiply your legacy impact by 3x through smart structuring.",
      wisdom: "We'll use a 60/40 growth strategy with estate planning integration, ensuring your wealth continues growing for generations.",
      color: "from-purple-500 to-indigo-600",
      timeline: "20 years",
      target: "$5,000,000",
      teamEffort: "5 AI specialists working together"
    }
  ];

  // Luxury Service Features
  const luxuryServices = [
    {
      title: "24/7 Butler Service",
      description: "Goalie and the AI team never sleep - get instant financial guidance anytime",
      icon: "🕐",
      color: "from-blue-500 to-cyan-500"
    },
    {
      title: "AI Team Coordination",
      description: "5 specialized AI experts working together for your financial success",
      icon: "🤝",
      color: "from-purple-500 to-pink-500"
    },
    {
      title: "Personalized Celebrations",
      description: "Custom milestone recognition and champagne moments for every achievement",
      icon: "🍾",
      color: "from-yellow-500 to-orange-500"
    },
    {
      title: "Crisis Management",
      description: "Instant contingency planning and AI team response to financial emergencies",
      icon: "🛡️",
      color: "from-red-500 to-pink-500"
    },
    {
      title: "Opportunity Alerts",
      description: "Proactive notifications about market opportunities and wealth-building moments",
      icon: "🔔",
      color: "from-green-500 to-emerald-500"
    },
    {
      title: "Luxury Experience",
      description: "White-glove financial planning that feels like having a private wealth manager",
      icon: "👑",
      color: "from-indigo-500 to-purple-500"
    }
  ];

  // Wealth Building Journey Stages
  const wealthStages = [
    {
      stage: "Discovery",
      description: "AI team analyzes your financial DNA and dreams",
      icon: "🔍",
      color: "from-blue-400 to-cyan-500",
      aiTeam: ["Goalie", "Finley"]
    },
    {
      stage: "Strategy",
      description: "Goalie orchestrates the team to create your roadmap",
      icon: "🗺️",
      color: "from-purple-400 to-pink-500",
      aiTeam: ["Goalie", "Wisdom", "Crystal"]
    },
    {
      stage: "Execution",
      description: "AI team monitors progress and optimizes your path",
      icon: "⚡",
      color: "from-yellow-400 to-orange-500",
      aiTeam: ["Goalie", "Nova", "Finley"]
    },
    {
      stage: "Optimization",
      description: "Continuous improvement and opportunity spotting",
      icon: "🎯",
      color: "from-green-400 to-emerald-500",
      aiTeam: ["Goalie", "Crystal", "Wisdom"]
    },
    {
      stage: "Celebration",
      description: "Milestone achievements and champagne moments",
      icon: "🎉",
      color: "from-indigo-400 to-purple-500",
      aiTeam: ["Goalie", "Entire AI Team"]
    }
  ];

  // Simulate concierge response
  useEffect(() => {
    if (isConciergeActive) {
      const timer = setTimeout(() => {
        setIsConciergeActive(false);
        setCurrentResponse(goalScenarios.find(s => s.type === activeGoal)?.goalie || '');
        setAiTeamActive(goalScenarios.find(s => s.type === activeGoal)?.teamEffort || '');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isConciergeActive, activeGoal]);

  const startConciergeService = () => {
    setIsConciergeActive(true);
    setCurrentResponse('');
    setGoalStage(0);
  };

  const nextGoal = () => {
    const currentIndex = goalScenarios.findIndex(s => s.type === activeGoal);
    if (currentIndex < goalScenarios.length - 1) {
      const nextGoal = goalScenarios[currentIndex + 1];
      setActiveGoal(nextGoal.type);
      setIsConciergeActive(true);
      setCurrentResponse('');
    }
  };

  const getCurrentGoal = () => {
    return goalScenarios.find(s => s.type === activeGoal) || goalScenarios[0];
  };

  return (
    <>
      <Helmet>
        <title>AI Goal Concierge - Your Luxury Financial Planning Experience | XspensesAI</title>
        <meta name="description" content="Meet Goalie - Your AI Financial Concierge working with our AI team to provide luxury financial planning. Experience white-glove wealth building with 5 AI specialists coordinating your success." />
      </Helmet>

      {/* Hero Section - AI Luxury Financial Concierge */}
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 flex items-center justify-center relative overflow-hidden pt-20">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 left-20 w-32 h-32 bg-purple-500/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute top-40 right-32 w-24 h-24 bg-indigo-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
          <div className="absolute bottom-32 left-32 w-28 h-28 bg-blue-500/20 rounded-full blur-3xl animate-pulse delay-2000"></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          {/* Prime's Crown Badge */}
          <div
            className="inline-flex items-center bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400 text-white px-4 py-2 rounded-full mb-8 shadow-2xl"
          >
            <Crown size={20} className="mr-2" />
            <span className="font-bold">Prime's AI Luxury Services Division</span>
          </div>

        <h1
            className="text-4xl md:text-7xl font-bold text-white mb-8"
        >
            Meet <span className="text-purple-400 font-extrabold drop-shadow-lg">Goalie</span> - Your AI Financial Concierge
        </h1>

          <h2
            className="text-2xl md:text-3xl font-bold text-white/90 mb-6"
          >
            Where Luxury Meets Wealth Creation - Your Dedicated AI Butler for Financial Dreams
          </h2>

        <p
            className="text-lg md:text-xl text-white/80 mb-12 max-w-4xl mx-auto leading-relaxed"
        >
            Step into the world's first AI Luxury Financial Concierge experience where <span className="text-purple-300 font-bold">Goalie</span> orchestrates our entire AI team - 
            <span className="text-blue-300 font-bold"> Finley</span>, <span className="text-indigo-300 font-bold">Crystal</span>, <span className="text-teal-300 font-bold">Nova</span>, and <span className="text-cyan-300 font-bold">Wisdom</span> - 
            to create your personalized wealth-building journey. Experience white-glove financial planning that feels like having a private wealth manager.
        </p>

          {/* CTA Buttons */}
        <div
            className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16"
          >
            <button
              onClick={startConciergeService}
              className="bg-gradient-to-r from-purple-400 via-indigo-400 to-blue-400 text-white px-8 py-4 rounded-2xl font-bold text-lg hover:scale-105 transition-transform duration-200 shadow-2xl flex items-center"
            >
              <Crown size={24} className="mr-2" />
              Start Your Luxury Experience
            </button>
          <Link
              to="/ai-employees"
              className="bg-white/10 backdrop-blur-md text-white px-8 py-4 rounded-2xl font-bold text-lg hover:bg-white/20 transition-colors duration-200 border border-white/20 flex items-center"
          >
              <Users size={24} className="mr-2" />
              Meet the Full AI Team
          </Link>
        </div>

          {/* Luxury Stats */}
        <div
            className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto"
        >
          <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-purple-400 mb-2">24/7</div>
              <div className="text-white/70">Butler Service</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-indigo-400 mb-2">5 AI</div>
              <div className="text-white/70">Specialists</div>
          </div>
          <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-blue-400 mb-2">94%</div>
              <div className="text-white/70">Success Rate</div>
          </div>
          <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-cyan-400 mb-2">∞</div>
              <div className="text-white/70">Adaptation</div>
          </div>
        </div>
              </div>
            </div>
            
      {/* AI Concierge Team */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
            Your AI <span className="text-purple-400 font-extrabold drop-shadow-lg">Concierge Team</span>
          </h2>
          <p className="text-xl text-white/70 max-w-3xl mx-auto">
            Goalie orchestrates our specialized AI team to provide the ultimate luxury financial planning experience
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-8">
          {aiConciergeTeam.map((member, index) => (
            <div
              key={member.name}
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
            </div>
          ))}
          </div>
        </div>

      {/* Live Concierge Service Demo */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
            <span className="text-purple-400 font-extrabold drop-shadow-lg">Live AI</span> Concierge Service
        </h2>
          <p className="text-xl text-white/70 max-w-3xl mx-auto">
            Experience how Goalie coordinates our AI team to create your personalized wealth-building strategy
          </p>
        </div>

        <div className="bg-gradient-to-br from-white/5 to-white/10 backdrop-blur-md rounded-3xl p-8 border border-white/20">
          {/* Goal Type Selector */}
          <div className="flex flex-wrap justify-center gap-4 mb-8">
            {goalScenarios.map((goal) => (
              <button
                key={goal.type}
                onClick={() => setActiveGoal(goal.type)}
                className={`px-6 py-3 rounded-xl font-semibold transition-all duration-200 ${
                  activeGoal === goal.type
                    ? 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-lg'
                    : 'bg-white/10 text-white/70 hover:bg-white/20'
                }`}
              >
                {goal.type.charAt(0).toUpperCase() + goal.type.slice(1)}
              </button>
            ))}
          </div>
          
          {/* Concierge Service Display */}
          <div className="bg-slate-800 rounded-2xl p-6 mb-8 min-h-96">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          </div>
              <span className="text-white/50 text-sm">AI Concierge Service - {getCurrentGoal().teamEffort}</span>
          </div>
          
            <div className="space-y-4">
              {/* User Message */}
              <div className="flex justify-end">
                <div className="bg-blue-600 text-white px-4 py-2 rounded-2xl rounded-br-md max-w-xs">
                  {getCurrentGoal().user}
          </div>
          </div>
          
              {/* Goalie's Response */}
              <div className="flex justify-start">
                <div className={`bg-gradient-to-r ${getCurrentGoal().color} text-white px-4 py-2 rounded-2xl rounded-bl-md max-w-md`}>
                  {isConciergeActive ? (
                    <div className="flex items-center space-x-1">
                      <span>Goalie is coordinating the AI team...</span>
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-white rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-white rounded-full animate-bounce delay-100"></div>
                        <div className="w-2 h-2 bg-white rounded-full animate-bounce delay-200"></div>
          </div>
        </div>
                  ) : (
                    <div>
                      <div className="text-xs text-white/70 mb-1">
                        Goalie • Wealth Architect
                      </div>
                      {currentResponse}
                    </div>
                  )}
                </div>
          </div>
          
              {/* AI Team Responses */}
              {!isConciergeActive && (
                <>
                  <div className="flex justify-start">
                    <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-2 rounded-2xl rounded-bl-md max-w-md">
                      <div className="text-xs text-white/70 mb-1">Finley • Financial Intelligence</div>
                      {getCurrentGoal().finley}
          </div>
        </div>
        
                  <div className="flex justify-start">
                    <div className="bg-gradient-to-r from-indigo-500 to-blue-600 text-white px-4 py-2 rounded-2xl rounded-bl-md max-w-md">
                      <div className="text-xs text-white/70 mb-1">Crystal • Future Predictor</div>
                      {getCurrentGoal().crystal}
        </div>
          </div>
          
                  <div className="flex justify-start">
                    <div className="bg-gradient-to-r from-teal-500 to-cyan-500 text-white px-4 py-2 rounded-2xl rounded-bl-md max-w-md">
                      <div className="text-xs text-white/70 mb-1">Nova • Opportunity Spotter</div>
                      {getCurrentGoal().nova}
                    </div>
          </div>
          
                  <div className="flex justify-start">
                    <div className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white px-4 py-2 rounded-2xl rounded-bl-md max-w-md">
                      <div className="text-xs text-white/70 mb-1">Wisdom • Strategic Advisor</div>
                      {getCurrentGoal().wisdom}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
          
          {/* Goal Summary */}
          <div className="bg-gradient-to-br from-purple-500/10 to-indigo-500/10 rounded-2xl p-6 mb-8 border border-purple-500/20">
            <div className="grid md:grid-cols-3 gap-6 text-center">
              <div>
                <div className="text-2xl font-bold text-purple-400 mb-2">{getCurrentGoal().timeline}</div>
                <div className="text-white/70">Timeline</div>
          </div>
              <div>
                <div className="text-2xl font-bold text-indigo-400 mb-2">{getCurrentGoal().target}</div>
                <div className="text-white/70">Target</div>
          </div>
              <div>
                <div className="text-2xl font-bold text-blue-400 mb-2">{getCurrentGoal().teamEffort}</div>
                <div className="text-white/70">AI Team Effort</div>
          </div>
        </div>
          </div>
          
          {/* Controls */}
          <div className="flex justify-center space-x-4">
            <button
              onClick={startConciergeService}
              className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-6 py-3 rounded-xl font-semibold hover:scale-105 transition-transform duration-200 flex items-center"
            >
              <Play size={20} className="mr-2" />
              Start Service
            </button>
            <button
              onClick={nextGoal}
              disabled={activeGoal === goalScenarios[goalScenarios.length - 1].type}
              className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-6 py-3 rounded-xl font-semibold hover:scale-105 transition-transform duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              <ArrowRight size={20} className="mr-2" />
              Next Goal
            </button>
          </div>
          </div>
        </div>

      {/* Wealth Building Journey */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
            Your <span className="text-purple-400 font-extrabold drop-shadow-lg">Wealth Building</span> Journey
        </h2>
          <p className="text-xl text-white/70 max-w-3xl mx-auto">
            How Goalie orchestrates our AI team to create your personalized wealth-building experience
          </p>
        </div>

        <div className="relative">
          {/* Connection Line */}
          <div className="absolute top-1/2 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 via-indigo-500 to-blue-500 transform -translate-y-1/2 hidden lg:block"></div>
          
          <div className="grid lg:grid-cols-5 gap-8">
            {wealthStages.map((stage, index) => (
              <div
                key={stage.stage}
                className="relative text-center"
              >
                <div className={`w-20 h-20 bg-gradient-to-r ${stage.color} rounded-full flex items-center justify-center mx-auto mb-4 shadow-2xl text-3xl`}>
                  {stage.icon}
                </div>
                <h3 className="text-xl font-bold text-white mb-2">{stage.stage}</h3>
                <p className="text-white/70 text-sm mb-3">{stage.description}</p>
                <div className="text-xs text-purple-300">
                  <strong>AI Team:</strong> {stage.aiTeam.join(', ')}
                </div>
              </div>
            ))}
          </div>
        </div>
          </div>
          
      {/* Luxury Service Features */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
            <span className="text-purple-400 font-extrabold drop-shadow-lg">Luxury Service</span> Features
          </h2>
          <p className="text-xl text-white/70 max-w-3xl mx-auto">
            Experience white-glove financial planning with our AI concierge team
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {luxuryServices.map((service, index) => (
            <div
              key={service.title}
              className="bg-gradient-to-br from-white/5 to-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 hover:border-white/40 transition-all duration-300"
            >
              <div className="text-center mb-4">
                <div className={`w-16 h-16 bg-gradient-to-r ${service.color} rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg text-3xl`}>
                  {service.icon}
          </div>
                <h3 className="text-xl font-bold text-white mb-2">{service.title}</h3>
                <p className="text-white/70">{service.description}</p>
          </div>
            </div>
          ))}
          </div>
        </div>

      {/* Call to Action */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div
          className="bg-gradient-to-r from-purple-500/20 via-indigo-500/20 to-blue-500/20 backdrop-blur-md rounded-3xl p-12 border border-white/20 text-center"
        >
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
            Ready for Your <span className="text-purple-400 font-extrabold drop-shadow-lg">Luxury Concierge</span> Experience?
          </h2>
          <p className="text-xl text-white/80 mb-8 max-w-3xl mx-auto">
            Join thousands of users who've experienced luxury financial planning with Goalie and our AI team. 
            Your wealth-building journey starts with a concierge service that never sleeps.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
              to="/pricing"
              className="bg-gradient-to-r from-purple-400 via-indigo-400 to-blue-400 text-white px-8 py-4 rounded-2xl font-bold text-lg hover:scale-105 transition-transform duration-200 shadow-2xl flex items-center justify-center"
          >
              <Sparkles size={24} className="mr-2" />
              Start Your Luxury Experience
          </Link>
            <Link
              to="/ai-employees"
              className="bg-white/10 backdrop-blur-md text-white px-8 py-4 rounded-2xl font-bold text-lg hover:bg-white/20 transition-colors duration-200 border border-white/20 flex items-center justify-center"
            >
              <Users size={24} className="mr-2" />
              Meet the Full AI Team
            </Link>
        </div>
        </div>
        </div>
    </>
  );
};

export default GoalConciergePage; 
