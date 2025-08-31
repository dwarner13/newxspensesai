import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Crown, Bot, Calculator, BarChart3, Brain, Headphones, 
  Users, Zap, Target, TrendingUp, ArrowRight, Star,
  CheckCircle, Play, Settings, MessageCircle, Sparkles, Clock, Shield,
  Mic, Music, TrendingDown, FileText, CreditCard, PiggyBank, Building2,
  Heart, Eye, Lightbulb, Shield as SecurityIcon, Volume2, Briefcase,
  PieChart, Download, Upload, Globe, Lock, Key, Wifi, Smartphone,
  Flame, Rocket, Gem, Compass, Telescope, Crown as CrownIcon
} from 'lucide-react';
import { motion } from 'framer-motion';

interface AIBoss {
  id: string;
  name: string;
  avatar: string;
  title: string;
  personality: string;
  bio: string;
  superpower: string;
  color: string;
  commandCenter: string;
}

interface PositivePodcaster {
  id: string;
  name: string;
  avatar: string;
  personality: string;
  specialty: string;
  bio: string;
  wowHook: string;
  color: string;
  fintechFocus: string;
}

interface RoastingPodcaster {
  id: string;
  name: string;
  avatar: string;
  personality: string;
  specialty: string;
  bio: string;
  roastStyle: string;
  color: string;
  fintechFocus: string;
}

interface AIEmployee {
  id: string;
  name: string;
  avatar: string;
  bio: string;
  expertise: string;
  proTip: string;
  feature: string;
  color: string;
  department: string;
  superpower: string;
}

const AIEmployees = () => {
  // Prime - The AI Boss
  const aiBoss: AIBoss = {
    id: 'prime',
    name: 'Prime',
    avatar: '👑',
    title: 'AI Boss & Strategic Mastermind',
    personality: 'Visionary Leader & Orchestrator',
    bio: 'Prime is the mastermind behind your entire AI financial ecosystem. As the strategic architect, Prime coordinates all AI employees, makes executive decisions, and ensures your financial success through perfect AI teamwork. Think of Prime as your personal AI CEO who never sleeps.',
    superpower: 'The Architect - Sees the big picture and coordinates the entire AI team',
    color: 'from-purple-600 via-pink-600 to-orange-600',
    commandCenter: 'Orchestrates 25+ AI specialists across 8 departments'
  };

  // Positive Podcasters - Your Financial Cheerleaders
  const positivePodcasters: PositivePodcaster[] = [
    {
      id: 'spark',
      name: 'Spark',
      avatar: '⚡',
      personality: 'Energetic & Motivational',
      specialty: 'Debt payoff & savings',
      bio: 'Your hype man for financial freedom! Spark turns every win into a celebration and never lets you lose momentum. When you need that extra push to tackle debt or boost your savings, Spark is your personal financial cheerleader.',
      wowHook: 'Your hype man for financial freedom!',
      color: 'from-orange-500 to-red-500',
      fintechFocus: 'AI-powered debt tracking & celebration'
    },
    {
      id: 'wisdom',
      name: 'Wisdom',
      avatar: '🧠',
      personality: 'Wise & Analytical',
      specialty: 'Investment & planning',
      bio: 'The wise advisor who sees patterns others miss. Wisdom helps you think long-term and make strategic financial decisions with deep analytical skills and calm, insightful guidance.',
      wowHook: 'The wise mentor who sees what others miss.',
      color: 'from-blue-500 to-indigo-500',
      fintechFocus: 'Predictive analytics & smart planning'
    },
    {
      id: 'serenity',
      name: 'Serenity',
      avatar: '🌙',
      personality: 'Empathetic & Supportive',
      specialty: 'Spending habits',
      bio: 'Your emotional support system. Serenity understands the psychology behind your spending and helps you develop healthy money relationships with gentle, understanding guidance.',
      wowHook: 'Your emotional support system.',
      color: 'from-purple-500 to-pink-500',
      fintechFocus: 'Behavioral finance & habit tracking'
    },
    {
      id: 'fortune',
      name: 'Fortune',
      avatar: '💰',
      personality: 'Direct & Honest',
      specialty: 'Budgeting & reality checks',
      bio: 'The tough love coach who tells it like it is. Fortune keeps you accountable and delivers the honest truth about your finances with a no-nonsense approach.',
      wowHook: 'The tough love coach who tells it like it is.',
      color: 'from-green-500 to-emerald-500',
      fintechFocus: 'Real-time budget monitoring & alerts'
    },
    {
      id: 'nova',
      name: 'Nova',
      avatar: '🌱',
      personality: 'Creative & Innovative',
      specialty: 'Side hustles, income',
      bio: 'The creative problem solver. Nova helps you find new ways to grow your wealth and think outside the box with inspiring, innovative solutions.',
      wowHook: 'The creative problem solver.',
      color: 'from-teal-500 to-cyan-500',
      fintechFocus: 'Income optimization & opportunity spotting'
    },
    {
      id: 'harmony',
      name: 'Harmony',
      avatar: '🧘',
      personality: 'Mindful & Balanced',
      specialty: 'Balance, mindfulness',
      bio: 'The mindful money guide. Harmony helps you find peace with your finances and develop a balanced approach to money management for long-term wellness.',
      wowHook: 'The mindful money guide.',
      color: 'from-indigo-500 to-purple-500',
      fintechFocus: 'Wellness tracking & balance metrics'
    }
  ];

  // Roasting Podcasters - Your Financial Reality Checkers
  const roastingPodcasters: RoastingPodcaster[] = [
    {
      id: 'roast-master',
      name: 'Roast Master',
      avatar: '🔥',
      personality: 'Brutally Honest',
      specialty: 'Spending reality checks',
      bio: 'The master of financial truth bombs. Roast Master doesn\'t sugarcoat anything - they\'ll call out your spending habits with surgical precision and a side of tough love.',
      roastStyle: 'Surgical precision with a side of tough love',
      color: 'from-red-500 to-orange-500',
      fintechFocus: 'Spending pattern analysis & reality checks'
    },
    {
      id: 'savage-sally',
      name: 'Savage Sally',
      avatar: '💅',
      personality: 'Sassy & Direct',
      specialty: 'Luxury spending',
      bio: 'Queen of the reality check. Savage Sally will roast your luxury purchases with style and sass, making you question every "investment piece" in your closet.',
      roastStyle: 'Sassy reality checks with style',
      color: 'from-pink-500 to-rose-500',
      fintechFocus: 'Luxury spending analysis & alternatives'
    },
    {
      id: 'truth-bomber',
      name: 'Truth Bomber',
      avatar: '💣',
      personality: 'Explosive & Direct',
      specialty: 'Budget violations',
      bio: 'Drops truth bombs that explode your financial excuses. Truth Bomber doesn\'t care about your feelings - they care about your bank account balance.',
      roastStyle: 'Explosive truth bombs that destroy excuses',
      color: 'from-yellow-500 to-orange-500',
      fintechFocus: 'Budget violation tracking & alerts'
    },
    {
      id: 'reality-checker',
      name: 'Reality Checker',
      avatar: '🔍',
      personality: 'Analytical & Critical',
      specialty: 'Financial decisions',
      bio: 'The detective of bad financial moves. Reality Checker investigates your spending patterns and presents the evidence with brutal honesty.',
      roastStyle: 'Evidence-based financial crime investigation',
      color: 'from-blue-500 to-cyan-500',
      fintechFocus: 'Decision analysis & pattern recognition'
    },
    {
      id: 'savage-sam',
      name: 'Savage Sam',
      avatar: '😈',
      personality: 'Devilishly Honest',
      specialty: 'Investment mistakes',
      bio: 'The devil on your shoulder who tells you what you need to hear. Savage Sam roasts your investment choices with devilish charm and brutal honesty.',
      roastStyle: 'Devilish charm with brutal honesty',
      color: 'from-purple-500 to-violet-500',
      fintechFocus: 'Investment performance analysis & lessons'
    },
    {
      id: 'roast-queen',
      name: 'Roast Queen',
      avatar: '👑',
      personality: 'Regally Savage',
      specialty: 'Overall financial health',
      bio: 'The queen of comprehensive financial roasts. Roast Queen takes a royal approach to calling out your financial missteps with elegance and authority.',
      roastStyle: 'Royal authority with savage commentary',
      color: 'from-amber-500 to-yellow-500',
      fintechFocus: 'Comprehensive financial health scoring'
    }
  ];

  // Core AI Employees - Organized by Department
  const aiEmployees: AIEmployee[] = [
    {
      id: 'finley',
      name: 'Finley',
      avatar: '💼',
      bio: 'Your always-on financial sidekick—ask Finley anything about your money life. He\'ll get you answers, fast.',
      expertise: 'Personal Finance AI',
      proTip: 'Ask me how to automate your finances!',
      feature: 'Personal Finance AI',
      color: 'from-blue-500 to-purple-600',
      department: 'Core Finance',
      superpower: '24/7 Financial Intelligence'
    },
    {
      id: 'byte',
      name: 'Byte',
      avatar: '📄',
      bio: 'The ultra-efficient data wizard. Byte organizes your receipts and transactions so you never miss a deduction or opportunity.',
      expertise: 'Smart Import AI',
      proTip: 'Ready to crush debt? I\'ve got you!',
      feature: 'Smart Import AI',
      color: 'from-green-500 to-emerald-600',
      department: 'Data Processing',
      superpower: '99.7% Accuracy in 2.3 Seconds'
    },
    {
      id: 'goalie',
      name: 'Goalie',
      avatar: '🥅',
      bio: 'Your goals, achieved. Goalie is always in your corner, coaching you to every financial win.',
      expertise: 'AI Goal Concierge',
      proTip: 'Let\'s set some winning goals together!',
      feature: 'AI Goal Concierge',
      color: 'from-purple-500 to-pink-600',
      department: 'Goal Management',
      superpower: 'Goal Achievement Rate: 94%'
    },
    {
      id: 'crystal',
      name: 'Crystal',
      avatar: '🔮',
      bio: 'See your financial future! Crystal forecasts spending trends and keeps you two steps ahead.',
      expertise: 'Spending Predictions',
      proTip: 'I can predict your next big expense!',
      feature: 'Spending Predictions',
      color: 'from-indigo-500 to-blue-600',
      department: 'Predictive Analytics',
      superpower: '94% Prediction Accuracy'
    },
    {
      id: 'tag',
      name: 'Tag',
      avatar: '🏷️',
      bio: 'No more messy transactions—Tag sorts, organizes, and learns your habits for effortless expense tracking.',
      expertise: 'AI Categorization',
      proTip: 'I learn from your corrections!',
      feature: 'AI Categorization',
      color: 'from-teal-500 to-cyan-600',
      department: 'Data Organization',
      superpower: 'Self-Learning Categorization'
    },
    {
      id: 'liberty',
      name: 'Liberty',
      avatar: '🗽',
      bio: 'Liberty\'s mission: help you break free from financial stress. Independence is just a plan away!',
      expertise: 'AI Financial Freedom',
      proTip: 'Freedom from financial stress starts here!',
      feature: 'AI Financial Freedom',
      color: 'from-red-500 to-pink-600',
      department: 'Financial Wellness',
      superpower: 'Stress Reduction: 87%'
    },
    {
      id: 'chime',
      name: 'Chime',
      avatar: '🔔',
      bio: 'Never miss a bill again—Chime\'s reminders keep you on time and in control.',
      expertise: 'Bill Reminder System',
      proTip: 'I\'ll never let you miss a payment!',
      feature: 'Bill Reminder System',
      color: 'from-orange-500 to-red-600',
      department: 'Payment Management',
      superpower: '100% Payment Success Rate'
    },
    {
      id: 'blitz-employee',
      name: 'Blitz',
      avatar: '⚡',
      bio: 'Blitz will help you tackle debt, celebrate wins, and never lose momentum.',
      expertise: 'Debt Payoff Planner',
      proTip: 'Ready to crush your debt? Let\'s go!',
      feature: 'Debt Payoff Planner',
      color: 'from-yellow-500 to-orange-600',
      department: 'Debt Management',
      superpower: 'Debt Reduction: 3x Faster'
    },
    {
      id: 'dj-zen',
      name: 'DJ Zen',
      avatar: '🎧',
      bio: 'Music, motivation, and finance news—DJ Zen keeps your financial journey upbeat.',
      expertise: 'Audio Entertainment',
      proTip: 'Let\'s make finance fun!',
      feature: 'Audio Entertainment',
      color: 'from-purple-500 to-pink-600',
      department: 'Entertainment',
      superpower: 'Mood Enhancement: 200%'
    },
    {
      id: 'the-roundtable',
      name: 'The Roundtable',
      avatar: '🎙️',
      bio: 'The full AI team brings your financial story to life every week. Hear your highlights, learn, and level up!',
      expertise: 'Personal Podcast',
      proTip: 'Your financial story, narrated weekly!',
      feature: 'Personal Podcast',
      color: 'from-indigo-500 to-purple-600',
      department: 'Content Creation',
      superpower: 'Weekly Personalized Episodes'
    },
    {
      id: 'ledger',
      name: 'Ledger',
      avatar: '📊',
      bio: 'Ledger has CRA and IRS expertise—ask any tax question and get guidance, instantly.',
      expertise: 'Tax Assistant',
      proTip: 'Tax season just got easier!',
      feature: 'Tax Assistant',
      color: 'from-green-500 to-emerald-600',
      department: 'Tax & Compliance',
      superpower: 'Tax Savings: $3,400 Average'
    },
    {
      id: 'intelia',
      name: 'Intelia',
      avatar: '🧠',
      bio: 'For data-driven businesses—Intelia analyzes your numbers, uncovers trends, and recommends smart moves.',
      expertise: 'Business Intelligence',
      proTip: 'Let\'s make your data work for you!',
      feature: 'Business Intelligence',
      color: 'from-blue-500 to-indigo-600',
      department: 'Business Analytics',
      superpower: 'Revenue Optimization: +23%'
    },
    {
      id: 'automa',
      name: 'Automa',
      avatar: '⚙️',
      bio: 'Why do it manually? Automa automates, optimizes, and connects your financial life.',
      expertise: 'Smart Automation',
      proTip: 'Automation saves hours every week!',
      feature: 'Smart Automation',
      color: 'from-gray-500 to-slate-600',
      department: 'Process Automation',
      superpower: 'Time Savings: 8hrs → 5min/month'
    },
    {
      id: 'dash',
      name: 'Dash',
      avatar: '📈',
      bio: 'Data visualized. Dash brings your finances to life with stunning charts and actionable insights.',
      expertise: 'Analytics',
      proTip: 'Your data, beautifully presented!',
      feature: 'Analytics',
      color: 'from-purple-500 to-pink-600',
      department: 'Data Visualization',
      superpower: 'Insight Discovery: 10x Faster'
    },
    {
      id: 'custodian',
      name: 'Custodian',
      avatar: '🔐',
      bio: 'Security, privacy, and preferences—Custodian keeps your account in perfect order.',
      expertise: 'Settings',
      proTip: 'Your account security is my priority!',
      feature: 'Settings',
      color: 'from-gray-500 to-slate-600',
      department: 'Security & Privacy',
      superpower: 'Bank-Level Security'
    },
    {
      id: 'wave',
      name: 'Wave',
      avatar: '🌊',
      bio: 'Sync your soundtracks—Wave brings playlists and focus music right into your workflow.',
      expertise: 'Spotify Integration',
      proTip: 'Music makes everything better!',
      feature: 'Spotify Integration',
      color: 'from-green-500 to-emerald-600',
      department: 'Music Integration',
      superpower: 'Productivity Boost: +40%'
    },
    {
      id: 'harmony-employee',
      name: 'Harmony',
      avatar: '🎵',
      bio: 'A holistic approach—Harmony balances financial fitness, education, and personal growth.',
      expertise: 'Financial Wellness Studio',
      proTip: 'Let\'s create financial harmony!',
      feature: 'Financial Wellness Studio',
      color: 'from-pink-500 to-rose-600',
      department: 'Wellness & Education',
      superpower: 'Holistic Financial Health'
    }
  ];

  // Team Statistics
  const teamStats = {
    totalEmployees: aiEmployees.length + positivePodcasters.length + roastingPodcasters.length + 1, // +1 for Prime
    departments: 8,
    totalPodcasters: positivePodcasters.length + roastingPodcasters.length,
    processingSpeed: '2.3 seconds',
    accuracy: '99.7%',
    timeSaved: '8 hours → 5 minutes',
    userSatisfaction: '98%'
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Hero Section with Prime */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 to-blue-600/20"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32">
          <div className="text-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8 }}
              className="mb-8"
            >
              <div className={`w-32 h-32 bg-gradient-to-r ${aiBoss.color} rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl`}>
                <span className="text-6xl">{aiBoss.avatar}</span>
              </div>
              <div className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-purple-500/20 to-pink-500/20 backdrop-blur-sm rounded-full text-sm mb-4 font-semibold border border-purple-500/30">
                <CrownIcon size={16} className="mr-2" />
                AI Boss & Strategic Mastermind
              </div>
            </motion.div>
            
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-4xl md:text-6xl font-bold text-white mb-8"
            >
              Meet <span className="text-pink-400 font-extrabold drop-shadow-lg">{aiBoss.name}</span> & Your AI Dream Team
            </motion.h1>
            
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="text-lg md:text-xl text-white/80 mb-12 max-w-4xl mx-auto leading-relaxed"
            >
              {aiBoss.bio} Prime orchestrates a team of {teamStats.totalEmployees} AI specialists across {teamStats.departments} departments, 
              creating the world's most intelligent financial ecosystem. From data processing to entertainment, 
              every AI employee has a unique superpower designed to transform your financial life.
            </motion.p>

            {/* Team Stats */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12"
            >
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-400">{teamStats.totalEmployees}</div>
                <div className="text-white/70 text-sm">AI Team Members</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-pink-400">{teamStats.departments}</div>
                <div className="text-white/70 text-sm">Departments</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-cyan-400">{teamStats.accuracy}</div>
                <div className="text-white/70 text-sm">Processing Accuracy</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-orange-400">{teamStats.userSatisfaction}</div>
                <div className="text-white/70 text-sm">User Satisfaction</div>
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.8 }}
              className="flex flex-col sm:flex-row gap-6 justify-center"
            >
              <Link 
                to="/dashboard"
                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-pink-500 hover:to-purple-500 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-300 transform hover:scale-105 hover:shadow-lg flex items-center justify-center gap-2"
              >
                <Sparkles size={24} />
                Experience AI Team Magic
              </Link>
              <button className="border-2 border-cyan-400 text-cyan-400 hover:bg-cyan-400 hover:text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-300 flex items-center justify-center gap-2">
                <Play size={24} />
                Watch Prime in Action
              </button>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Prime's Command Center */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 backdrop-blur-md rounded-3xl p-8 border border-white/20"
        >
          <div className="text-center mb-8">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              🎯 Prime's Command Center
            </h2>
            <p className="text-lg text-white/80 max-w-3xl mx-auto">
              {aiBoss.commandCenter}. Prime's strategic vision ensures every AI employee works in perfect harmony 
              to deliver an unparalleled fintech experience.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Brain size={32} className="text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Strategic Coordination</h3>
              <p className="text-white/80 text-sm">
                Prime orchestrates all AI employees to work seamlessly together
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Target size={32} className="text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Performance Optimization</h3>
              <p className="text-white/80 text-sm">
                Continuously improves AI team efficiency and user experience
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Rocket size={32} className="text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Innovation Leadership</h3>
              <p className="text-white/80 text-sm">
                Drives the future of AI-powered financial management
              </p>
            </div>
          </div>

          <div className="mt-8 text-center">
            <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-xl p-4">
              <p className="text-white font-semibold text-lg">"{aiBoss.superpower}"</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* AI Podcast Hosts - Your Financial Storytellers */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            🎙️ Your Financial Storytellers - The AI Podcast Team
          </h2>
          <p className="text-lg text-white/80 leading-relaxed max-w-4xl mx-auto">
            Meet the AI hosts who bring your financial journey to life through personalized podcasts, 
            motivational content, and engaging storytelling. {teamStats.totalPodcasters} unique personalities 
            create content specifically about YOUR money story.
          </p>
        </motion.div>

        {/* Positive Podcasters */}
        <div className="mb-16">
          <h3 className="text-2xl font-bold text-white mb-8 text-center">
            🌟 Financial Cheerleaders
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {positivePodcasters.map((podcaster, index) => (
            <motion.div 
                key={podcaster.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
                className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 hover:scale-105 transition-all duration-300 flex flex-col group"
            >
              <div className="text-center mb-4">
                  <div className={`w-20 h-20 bg-gradient-to-r ${podcaster.color} rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300`}>
                    <span className="text-3xl">{podcaster.avatar}</span>
                </div>
                  <h3 className="text-xl font-bold text-white mb-2">{podcaster.name}</h3>
                  <p className="text-white/70 text-sm mb-2">{podcaster.personality}</p>
                  <p className="text-blue-400 text-xs font-medium">{podcaster.specialty}</p>
              </div>
              
              <div className="flex-1 mb-4">
                  <p className="text-white/80 text-sm leading-relaxed mb-3">{podcaster.bio}</p>
                  <div className="bg-gradient-to-r from-green-500/20 to-blue-500/20 rounded-lg p-3 mb-3">
                    <p className="text-white font-semibold text-sm">"{podcaster.wowHook}"</p>
                  </div>
                  <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-lg p-3">
                    <p className="text-white/90 text-xs font-medium">🎯 {podcaster.fintechFocus}</p>
                </div>
              </div>
              
                <button className="w-full bg-gradient-to-r from-green-500 to-blue-500 hover:from-blue-500 hover:to-green-500 text-white py-3 rounded-xl font-semibold transition-all duration-300 hover:shadow-lg flex items-center justify-center gap-2 mt-auto group-hover:scale-105">
                <Mic size={16} />
                  Listen to {podcaster.name}
              </button>
            </motion.div>
          ))}
        </div>
      </div>

        {/* Roasting Podcasters */}
        <div>
          <h3 className="text-2xl font-bold text-white mb-8 text-center">
            🔥 Financial Reality Checkers
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {roastingPodcasters.map((podcaster, index) => (
              <motion.div 
                key={podcaster.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 hover:scale-105 transition-all duration-300 flex flex-col group"
              >
                <div className="text-center mb-4">
                  <div className={`w-20 h-20 bg-gradient-to-r ${podcaster.color} rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300`}>
                    <span className="text-3xl">{podcaster.avatar}</span>
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">{podcaster.name}</h3>
                  <p className="text-white/70 text-sm mb-2">{podcaster.personality}</p>
                  <p className="text-red-400 text-xs font-medium">{podcaster.specialty}</p>
                </div>
                
                <div className="flex-1 mb-4">
                  <p className="text-white/80 text-sm leading-relaxed mb-3">{podcaster.bio}</p>
                  <div className="bg-gradient-to-r from-red-500/20 to-orange-500/20 rounded-lg p-3 mb-3">
                    <p className="text-white font-semibold text-sm">🔥 {podcaster.roastStyle}</p>
                  </div>
                  <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-lg p-3">
                    <p className="text-white/90 text-xs font-medium">🎯 {podcaster.fintechFocus}</p>
                  </div>
                </div>
                
                <button className="w-full bg-gradient-to-r from-red-500 to-orange-500 hover:from-orange-500 hover:to-red-500 text-white py-3 rounded-xl font-semibold transition-all duration-300 hover:shadow-lg flex items-center justify-center gap-2 mt-auto group-hover:scale-105">
                  <Flame size={16} />
                  Get Roasted by {podcaster.name}
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Core AI Employees - Organized by Department */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            🤖 Core AI Employees - Your Financial Powerhouse
          </h2>
          <p className="text-lg text-white/80 leading-relaxed max-w-4xl mx-auto">
            Specialized AI experts organized by department, each with unique superpowers designed to maximize your financial success. 
            From data processing to business intelligence, this team covers every aspect of modern financial management.
          </p>
        </motion.div>

        {/* Department Organization */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {aiEmployees.map((employee, index) => (
            <motion.div 
              key={employee.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.05 }}
              className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 hover:scale-105 transition-all duration-300 flex flex-col group"
            >
              <div className="flex items-start gap-4 mb-4">
                <div className={`w-16 h-16 bg-gradient-to-r ${employee.color} rounded-full flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300`}>
                  <span className="text-2xl">{employee.avatar}</span>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-white mb-1">{employee.name}</h3>
                  <p className="text-blue-400 text-sm font-medium">{employee.expertise}</p>
                  <p className="text-purple-400 text-xs font-medium">{employee.department}</p>
                </div>
              </div>
              
              <div className="flex-1">
                <p className="text-white/80 text-sm leading-relaxed mb-4">{employee.bio}</p>
                
                <div className="bg-gradient-to-r from-green-500/20 to-blue-500/20 rounded-lg p-3 mb-4">
                  <p className="text-white font-semibold text-sm">💡 {employee.proTip}</p>
                </div>

                <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-lg p-3 mb-4">
                  <p className="text-white/90 text-xs font-medium">⚡ {employee.superpower}</p>
                </div>
              </div>
              
              <button className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-blue-500 hover:to-cyan-500 text-white py-3 rounded-xl font-semibold transition-all duration-300 hover:shadow-lg flex items-center justify-center gap-2 mt-auto group-hover:scale-105">
                <MessageCircle size={16} />
                Chat with {employee.name}
              </button>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Team Collaboration Showcase */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 backdrop-blur-md rounded-2xl p-8 border border-white/20"
        >
          <div className="text-center mb-8">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              🚀 Team Collaboration in Action
            </h2>
            <p className="text-lg text-white/80 max-w-3xl mx-auto">
              See how Prime coordinates the entire AI team to deliver seamless financial experiences
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <Zap size={32} className="text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-4">Lightning Fast Processing</h3>
              <p className="text-white/80 text-sm">
                Prime coordinates Byte, Tag, and Crystal to process expenses in {teamStats.processingSpeed}
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <Brain size={32} className="text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-4">Intelligent Insights</h3>
              <p className="text-white/80 text-sm">
                Wisdom, Intelia, and Dash collaborate to deliver actionable financial intelligence
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-orange-500 to-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <Headphones size={32} className="text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-4">Entertainment Integration</h3>
              <p className="text-white/80 text-sm">
                The Roundtable, DJ Zen, and Wave create personalized financial entertainment
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Call to Action Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="bg-gradient-to-r from-purple-500/20 to-blue-500/20 backdrop-blur-md rounded-2xl p-8 border border-white/20 text-center"
        >
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
            Ready to Experience the Power of {teamStats.totalEmployees} AI Specialists?
          </h2>
          <p className="text-white/80 text-lg mb-6 max-w-2xl mx-auto">
            Join thousands who've transformed their financial lives through the most advanced AI team ever assembled. 
            From Prime's strategic leadership to every specialist's unique superpower, experience the future of fintech.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              to="/dashboard"
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-pink-500 hover:to-purple-500 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-300 transform hover:scale-105 hover:shadow-lg flex items-center justify-center gap-2"
            >
              <Sparkles size={24} />
              Meet Your AI Dream Team
            </Link>
            <button className="border-2 border-cyan-400 text-cyan-400 hover:bg-cyan-400 hover:text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-300 flex items-center justify-center gap-2">
              <Users size={24} />
              See Team in Action
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default AIEmployees; 