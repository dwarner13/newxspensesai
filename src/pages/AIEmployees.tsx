import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Crown, Bot, Calculator, BarChart3, Brain, Headphones, 
  Users, Zap, Target, TrendingUp, ArrowRight, Star,
  CheckCircle, Play, Settings, MessageCircle, Sparkles, Clock, Shield,
  Mic, Music, TrendingDown, FileText, CreditCard, PiggyBank, Building2,
  Heart, Eye, Lightbulb, Shield as SecurityIcon, Volume2, Briefcase,
  PieChart, Download, Upload, Globe, Lock, Key, Wifi, Smartphone
} from 'lucide-react';
import { motion } from 'framer-motion';
import SimpleNavigation from '../components/layout/SimpleNavigation';

interface AIHost {
  id: string;
  name: string;
  avatar: string;
  personality: string;
  segment: string;
  bio: string;
  wowHook: string;
  color: string;
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
}

const AIEmployees = () => {
  // AI Podcast Hosts - Spotlight Team
  const aiHosts: AIHost[] = [
    {
      id: 'blitz',
      name: 'Blitz',
      avatar: '⚡',
      personality: 'Energetic & Motivational',
      segment: 'Debt payoff & savings',
      bio: 'Your hype man for financial freedom. Blitz turns every win into a celebration! High-energy, always encouraging, and never lets you lose momentum. When you need that extra push to tackle debt or boost your savings, Blitz is your personal financial cheerleader.',
      wowHook: 'Your hype man for financial freedom!',
      color: 'from-orange-500 to-red-500'
    },
    {
      id: 'sage',
      name: 'Sage',
      avatar: '🧠',
      personality: 'Wise & Analytical',
      segment: 'Investment & planning',
      bio: 'The wise advisor who sees patterns others miss. Sage helps you think long-term and make strategic financial decisions. With deep analytical skills and calm, insightful guidance, Sage transforms complex financial concepts into clear, actionable strategies.',
      wowHook: 'The wise mentor who sees what others miss.',
      color: 'from-blue-500 to-indigo-500'
    },
    {
      id: 'luna',
      name: 'Luna',
      avatar: '🌙',
      personality: 'Empathetic & Supportive',
      segment: 'Spending habits',
      bio: 'Your emotional support system. Luna understands the psychology behind your spending and helps you develop healthy money relationships. Gentle, understanding, and always there to guide you through the emotional side of financial decisions.',
      wowHook: 'Your emotional support system.',
      color: 'from-purple-500 to-pink-500'
    },
    {
      id: 'stacks',
      name: 'Stacks',
      avatar: '💰',
      personality: 'Direct & Honest',
      segment: 'Budgeting & reality checks',
      bio: 'The tough love coach who tells it like it is. Stacks keeps you accountable and delivers the honest truth about your finances. No-nonsense approach with a focus on discipline and real results.',
      wowHook: 'The tough love coach who tells it like it is.',
      color: 'from-green-500 to-emerald-500'
    },
    {
      id: 'ivy',
      name: 'Ivy',
      avatar: '🌱',
      personality: 'Creative & Innovative',
      segment: 'Side hustles, income',
      bio: 'The creative problem solver. Ivy helps you find new ways to grow your wealth and think outside the box. Inspiring, innovative, and always looking for creative solutions to financial challenges.',
      wowHook: 'The creative problem solver.',
      color: 'from-teal-500 to-cyan-500'
    },
    {
      id: 'zen',
      name: 'Zen',
      avatar: '🧘',
      personality: 'Mindful & Balanced',
      segment: 'Balance, mindfulness',
      bio: 'The mindful money guide. Zen helps you find peace with your finances and develop a balanced approach to money management. Peaceful, centered, and focused on long-term financial wellness.',
      wowHook: 'The mindful money guide.',
      color: 'from-indigo-500 to-purple-500'
    },
    {
      id: 'sofia',
      name: 'Sofia',
      avatar: '🔮',
      personality: 'Intuitive & Analytical',
      segment: 'Behavioral finance, decision-making',
      bio: 'Blending intuition and data, Sofia helps you master the psychology of money. Warm, data-driven, and expert at understanding the behavioral patterns that drive financial decisions.',
      wowHook: 'Blending intuition and data.',
      color: 'from-pink-500 to-rose-500'
    },
    {
      id: 'max',
      name: 'Max',
      avatar: '🎯',
      personality: 'Strategic & Results-Driven',
      segment: 'Investment, strategy',
      bio: 'Your personal wealth architect. Max\'s strategies drive results and long-term success. Driven, big-picture focused, and committed to building sustainable wealth through strategic planning.',
      wowHook: 'Your personal wealth architect.',
      color: 'from-yellow-500 to-orange-500'
    }
  ];

  // Feature-Specific AI Employees
  const aiEmployees: AIEmployee[] = [
    {
      id: 'finley',
      name: 'Finley',
      avatar: '💼',
      bio: 'Your always-on financial sidekick—ask Finley anything about your money life. He\'ll get you answers, fast.',
      expertise: 'Personal Finance AI',
      proTip: 'Ask me how to automate your finances!',
      feature: 'Personal Finance AI',
      color: 'from-blue-500 to-purple-600'
    },
    {
      id: 'byte',
      name: 'Byte',
      avatar: '📄',
      bio: 'The ultra-efficient data wizard. Byte organizes your receipts and transactions so you never miss a deduction or opportunity.',
      expertise: 'Smart Import AI',
      proTip: 'Ready to crush debt? I\'ve got you!',
      feature: 'Smart Import AI',
      color: 'from-green-500 to-emerald-600'
    },
    {
      id: 'goalie',
      name: 'Goalie',
      avatar: '🥅',
      bio: 'Your goals, achieved. Goalie is always in your corner, coaching you to every financial win.',
      expertise: 'AI Goal Concierge',
      proTip: 'Let\'s set some winning goals together!',
      feature: 'AI Goal Concierge',
      color: 'from-purple-500 to-pink-600'
    },
    {
      id: 'crystal',
      name: 'Crystal',
      avatar: '🔮',
      bio: 'See your financial future! Crystal forecasts spending trends and keeps you two steps ahead.',
      expertise: 'Spending Predictions',
      proTip: 'I can predict your next big expense!',
      feature: 'Spending Predictions',
      color: 'from-indigo-500 to-blue-600'
    },
    {
      id: 'tag',
      name: 'Tag',
      avatar: '🏷️',
      bio: 'No more messy transactions—Tag sorts, organizes, and learns your habits for effortless expense tracking.',
      expertise: 'AI Categorization',
      proTip: 'I learn from your corrections!',
      feature: 'AI Categorization',
      color: 'from-teal-500 to-cyan-600'
    },
    {
      id: 'liberty',
      name: 'Liberty',
      avatar: '🗽',
      bio: 'Liberty\'s mission: help you break free from financial stress. Independence is just a plan away!',
      expertise: 'AI Financial Freedom',
      proTip: 'Freedom from financial stress starts here!',
      feature: 'AI Financial Freedom',
      color: 'from-red-500 to-pink-600'
    },
    {
      id: 'chime',
      name: 'Chime',
      avatar: '🔔',
      bio: 'Never miss a bill again—Chime\'s reminders keep you on time and in control.',
      expertise: 'Bill Reminder System',
      proTip: 'I\'ll never let you miss a payment!',
      feature: 'Bill Reminder System',
      color: 'from-orange-500 to-red-600'
    },
    {
      id: 'blitz-employee',
      name: 'Blitz',
      avatar: '⚡',
      bio: 'Blitz will help you tackle debt, celebrate wins, and never lose momentum.',
      expertise: 'Debt Payoff Planner',
      proTip: 'Ready to crush your debt? Let\'s go!',
      feature: 'Debt Payoff Planner',
      color: 'from-yellow-500 to-orange-600'
    },
    {
      id: 'dj-zen',
      name: 'DJ Zen',
      avatar: '🎧',
      bio: 'Music, motivation, and finance news—DJ Zen keeps your financial journey upbeat.',
      expertise: 'Audio Entertainment',
      proTip: 'Let\'s make finance fun!',
      feature: 'Audio Entertainment',
      color: 'from-purple-500 to-pink-600'
    },
    {
      id: 'the-roundtable',
      name: 'The Roundtable',
      avatar: '🎙️',
      bio: 'The full AI team brings your financial story to life every week. Hear your highlights, learn, and level up!',
      expertise: 'Personal Podcast',
      proTip: 'Your financial story, narrated weekly!',
      feature: 'Personal Podcast',
      color: 'from-indigo-500 to-purple-600'
    },
    {
      id: 'ledger',
      name: 'Ledger',
      avatar: '📊',
      bio: 'Ledger has CRA and IRS expertise—ask any tax question and get guidance, instantly.',
      expertise: 'Tax Assistant',
      proTip: 'Tax season just got easier!',
      feature: 'Tax Assistant',
      color: 'from-green-500 to-emerald-600'
    },
    {
      id: 'intelia',
      name: 'Intelia',
      avatar: '🧠',
      bio: 'For data-driven businesses—Intelia analyzes your numbers, uncovers trends, and recommends smart moves.',
      expertise: 'Business Intelligence',
      proTip: 'Let\'s make your data work for you!',
      feature: 'Business Intelligence',
      color: 'from-blue-500 to-indigo-600'
    },
    {
      id: 'automa',
      name: 'Automa',
      avatar: '⚙️',
      bio: 'Why do it manually? Automa automates, optimizes, and connects your financial life.',
      expertise: 'Smart Automation',
      proTip: 'Automation saves hours every week!',
      feature: 'Smart Automation',
      color: 'from-gray-500 to-slate-600'
    },
    {
      id: 'dash',
      name: 'Dash',
      avatar: '📈',
      bio: 'Data visualized. Dash brings your finances to life with stunning charts and actionable insights.',
      expertise: 'Analytics',
      proTip: 'Your data, beautifully presented!',
      feature: 'Analytics',
      color: 'from-purple-500 to-pink-600'
    },
    {
      id: 'custodian',
      name: 'Custodian',
      avatar: '🔐',
      bio: 'Security, privacy, and preferences—Custodian keeps your account in perfect order.',
      expertise: 'Settings',
      proTip: 'Your account security is my priority!',
      feature: 'Settings',
      color: 'from-gray-500 to-slate-600'
    },
    {
      id: 'wave',
      name: 'Wave',
      avatar: '🌊',
      bio: 'Sync your soundtracks—Wave brings playlists and focus music right into your workflow.',
      expertise: 'Spotify Integration',
      proTip: 'Music makes everything better!',
      feature: 'Spotify Integration',
      color: 'from-green-500 to-emerald-600'
    },
    {
      id: 'harmony',
      name: 'Harmony',
      avatar: '🎵',
      bio: 'A holistic approach—Harmony balances financial fitness, education, and personal growth.',
      expertise: 'Financial Wellness Studio',
      proTip: 'Let\'s create financial harmony!',
      feature: 'Financial Wellness Studio',
      color: 'from-pink-500 to-rose-600'
    },
    {
      id: 'biztax-buddy',
      name: 'BizTax Buddy',
      avatar: '🤝',
      bio: 'The bridge between business and tax smarts—BizTax Buddy keeps you compliant and profitable.',
      expertise: 'Business & Tax',
      proTip: 'Compliance meets profitability!',
      feature: 'Business & Tax',
      color: 'from-blue-500 to-purple-600'
    },
    {
      id: 'max-employee',
      name: 'Max',
      avatar: '🎯',
      bio: 'Max helps businesses strategize, plan, and win—always with measurable results.',
      expertise: 'Business Intelligence Assistant',
      proTip: 'Let\'s build your business strategy!',
      feature: 'Business Intelligence Assistant',
      color: 'from-yellow-500 to-orange-600'
    },
    {
      id: 'kit',
      name: 'Kit',
      avatar: '🛠️',
      bio: 'Calculators, checklists, and more—Kit\'s got a solution for every money problem.',
      expertise: 'Tools',
      proTip: 'I have a tool for everything!',
      feature: 'Tools',
      color: 'from-gray-500 to-slate-600'
    },
    {
      id: 'prism',
      name: 'Prism',
      avatar: '💎',
      bio: 'Your numbers, crystal clear. Prism delivers beautiful, exportable reports on demand.',
      expertise: 'Reports',
      proTip: 'Crystal clear insights await!',
      feature: 'Reports',
      color: 'from-indigo-500 to-purple-600'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Main Navigation Header */}
      <SimpleNavigation />
      
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 to-blue-600/20"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32">
          <div className="text-center">
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-4xl md:text-6xl font-bold text-white mb-8"
            >
              Meet Your AI Experts & Podcast Hosts
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-lg md:text-xl text-white/80 mb-12 max-w-3xl mx-auto leading-relaxed"
            >
              Meet the AI Experts and Podcast Hosts behind your personalized financial journey—each with a unique skill, personality, and expertise. From motivational money coaches to data-driven strategists, discover the ultimate AI-powered team for financial wellness, business growth, and tax mastery.
            </motion.p>
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="flex flex-col sm:flex-row gap-6 justify-center"
            >
              <Link 
                to="/dashboard"
                className="bg-cyan-500 hover:bg-cyan-600 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-300 transform hover:scale-105 hover:shadow-cyan-500/25 flex items-center justify-center gap-2"
              >
                <Sparkles size={24} />
                Meet Your AI Team
              </Link>
              <button className="border-2 border-cyan-400 text-cyan-400 hover:bg-cyan-400 hover:text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-300 flex items-center justify-center gap-2">
                <Play size={24} />
                Watch AI Process 50 Receipts in 30 Seconds
              </button>
            </motion.div>
          </div>
        </div>
      </div>

      {/* AI Podcast Hosts - Spotlight Team */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            🎙️ AI Podcast Hosts - Your Financial Storytellers
          </h2>
          <p className="text-lg text-white/80 leading-relaxed max-w-4xl mx-auto">
            Meet the charismatic AI hosts who bring your financial journey to life through personalized podcasts, motivational content, and engaging storytelling.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {aiHosts.map((host, index) => (
            <motion.div 
              key={host.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 hover:scale-105 transition-all duration-300 flex flex-col"
            >
              <div className="text-center mb-4">
                <div className={`w-16 h-16 bg-gradient-to-r ${host.color} rounded-full flex items-center justify-center mx-auto mb-4`}>
                  <span className="text-2xl">{host.avatar}</span>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">{host.name}</h3>
                <p className="text-white/70 text-sm mb-2">{host.personality}</p>
                <p className="text-blue-400 text-xs font-medium">{host.segment}</p>
              </div>
              
              <div className="flex-1 mb-4">
                <p className="text-white/80 text-sm leading-relaxed mb-3">{host.bio}</p>
                <div className="bg-gradient-to-r from-purple-500/20 to-blue-500/20 rounded-lg p-3">
                  <p className="text-white font-semibold text-sm">"{host.wowHook}"</p>
                </div>
              </div>
              
              <button className="w-full bg-cyan-500 hover:bg-cyan-600 text-white py-2 rounded-xl font-semibold transition-all duration-300 hover:shadow-cyan-500/25 flex items-center justify-center gap-2 mt-auto">
                <Mic size={16} />
                Listen to {host.name}
              </button>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Feature-Specific AI Employees */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            🤖 Feature-Specific AI Employees
          </h2>
          <p className="text-lg text-white/80 leading-relaxed max-w-4xl mx-auto">
            Specialized AI experts ready to help with every aspect of your financial journey. Each employee brings unique skills and expertise to maximize your success.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {aiEmployees.map((employee, index) => (
            <motion.div 
              key={employee.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.05 }}
              className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 hover:scale-105 transition-all duration-300 flex flex-col"
            >
              <div className="flex items-start gap-4 mb-4">
                <div className={`w-12 h-12 bg-gradient-to-r ${employee.color} rounded-full flex items-center justify-center flex-shrink-0`}>
                  <span className="text-xl">{employee.avatar}</span>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-white mb-1">{employee.name}</h3>
                  <p className="text-blue-400 text-sm font-medium">{employee.expertise}</p>
                </div>
              </div>
              
              <div className="flex-1">
                <p className="text-white/80 text-sm leading-relaxed mb-4">{employee.bio}</p>
                
                <div className="bg-gradient-to-r from-green-500/20 to-blue-500/20 rounded-lg p-3 mb-4">
                  <p className="text-white font-semibold text-sm">💡 {employee.proTip}</p>
                </div>
              </div>
              
              <button className="w-full bg-cyan-500 hover:bg-cyan-600 text-white py-2 rounded-xl font-semibold transition-all duration-300 hover:shadow-cyan-500/25 flex items-center justify-center gap-2 mt-auto">
                <MessageCircle size={16} />
                Chat with {employee.name}
              </button>
            </motion.div>
          ))}
        </div>
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
            Ready to Meet Your AI Team?
          </h2>
          <p className="text-white/80 text-lg mb-6 max-w-2xl mx-auto">
            Ask our AI Experts anything. Your success is their mission. Explore every employee, try chatting with your favorites, and discover how AI can transform your financial journey.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              to="/dashboard"
              className="bg-cyan-500 hover:bg-cyan-600 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-300 transform hover:scale-105 hover:shadow-cyan-500/25 flex items-center justify-center gap-2"
            >
              <Sparkles size={24} />
              Experience Automation Magic
            </Link>
            <button className="border-2 border-cyan-400 text-cyan-400 hover:bg-cyan-400 hover:text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-300 flex items-center justify-center gap-2">
              <Users size={24} />
              Chat with Your AI Dream Team
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default AIEmployees; 