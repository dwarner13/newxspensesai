import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Mic, Play, Headphones, TrendingUp, TrendingDown, Star,
  Crown, Bot, Calculator, BarChart3, Brain, Zap,
  Users, Target, ArrowRight, CheckCircle, MessageCircle, Sparkles,
  Volume2, Briefcase, Heart, Eye, Lightbulb, Shield,
  Globe, Lock, Key, Wifi, Smartphone, Award, Flame
} from 'lucide-react';
import { motion } from 'framer-motion';

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

export default function PodcastPage() {
  // Positive Podcasters - Your Financial Cheerleaders
  const positivePodcasters: PositivePodcaster[] = [
    {
      id: 'blitz',
      name: 'Blitz',
      avatar: '⚡',
      personality: 'Energetic & Motivational',
      specialty: 'Debt payoff & savings',
      bio: 'Your hype man for financial freedom! Blitz turns every win into a celebration and never lets you lose momentum. When you need that extra push to tackle debt or boost your savings, Blitz is your personal financial cheerleader.',
      wowHook: 'Your hype man for financial freedom!',
      color: 'from-orange-500 to-red-500',
      fintechFocus: 'AI-powered debt tracking & celebration'
    },
    {
      id: 'sage',
      name: 'Sage',
      avatar: '🧠',
      personality: 'Wise & Analytical',
      specialty: 'Investment & planning',
      bio: 'The wise advisor who sees patterns others miss. Sage helps you think long-term and make strategic financial decisions with deep analytical skills and calm, insightful guidance.',
      wowHook: 'The wise mentor who sees what others miss.',
      color: 'from-blue-500 to-indigo-500',
      fintechFocus: 'Predictive analytics & smart planning'
    },
    {
      id: 'luna',
      name: 'Luna',
      avatar: '🌙',
      personality: 'Empathetic & Supportive',
      specialty: 'Spending habits',
      bio: 'Your emotional support system. Luna understands the psychology behind your spending and helps you develop healthy money relationships with gentle, understanding guidance.',
      wowHook: 'Your emotional support system.',
      color: 'from-purple-500 to-pink-500',
      fintechFocus: 'Behavioral finance & habit tracking'
    },
    {
      id: 'stacks',
      name: 'Stacks',
      avatar: '💰',
      personality: 'Direct & Honest',
      specialty: 'Budgeting & reality checks',
      bio: 'The tough love coach who tells it like it is. Stacks keeps you accountable and delivers the honest truth about your finances with a no-nonsense approach.',
      wowHook: 'The tough love coach who tells it like it is.',
      color: 'from-green-500 to-emerald-500',
      fintechFocus: 'Real-time budget monitoring & alerts'
    },
    {
      id: 'ivy',
      name: 'Ivy',
      avatar: '🌱',
      personality: 'Creative & Innovative',
      specialty: 'Side hustles, income',
      bio: 'The creative problem solver. Ivy helps you find new ways to grow your wealth and think outside the box with inspiring, innovative solutions.',
      wowHook: 'The creative problem solver.',
      color: 'from-teal-500 to-cyan-500',
      fintechFocus: 'Income optimization & opportunity spotting'
    },
    {
      id: 'zen',
      name: 'Zen',
      avatar: '🧘',
      personality: 'Mindful & Balanced',
      specialty: 'Balance, mindfulness',
      bio: 'The mindful money guide. Zen helps you find peace with your finances and develop a balanced approach to money management for long-term wellness.',
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
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
              Your Personal AI Podcast Experience
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-lg md:text-xl text-white/80 mb-12 max-w-4xl mx-auto leading-relaxed"
            >
              Experience the future of financial storytelling with 12 AI podcasters who know your money story better than anyone. From motivational cheerleaders to brutally honest roasters, get ready for the most engaging financial content ever created.
            </motion.p>
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="flex flex-col sm:flex-row gap-6 justify-center"
            >
              <Link 
                to="/dashboard/personal-podcast"
                className="bg-gradient-to-r from-orange-500 to-pink-500 hover:from-pink-500 hover:to-orange-500 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-300 transform hover:scale-105 hover:shadow-lg flex items-center justify-center gap-2"
              >
                <Mic size={24} />
                Generate My First Episode
              </Link>
              <button className="border-2 border-cyan-400 text-cyan-400 hover:bg-cyan-400 hover:text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-300 flex items-center justify-center gap-2">
                <Play size={24} />
                Listen to Sample Episodes
              </button>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Positive Podcasters - Your Financial Cheerleaders */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            🌟 Your Financial Cheerleaders - The Positive Podcasters
          </h2>
          <p className="text-lg text-white/80 leading-relaxed max-w-4xl mx-auto">
            Meet the AI hosts who celebrate your wins, motivate your journey, and turn every financial milestone into a victory lap. These positive podcasters are your personal hype squad for financial success.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
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

      {/* Roasting Podcasters - Your Financial Reality Checkers */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            🔥 Your Financial Reality Checkers - The Roasting Podcasters
          </h2>
          <p className="text-lg text-white/80 leading-relaxed max-w-4xl mx-auto">
            Sometimes you need a reality check, and these AI hosts deliver it with style. The roasting podcasters keep you honest, call out bad decisions, and ensure you never get too comfortable with poor financial habits.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
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
                <Fire size={16} />
                Get Roasted by {podcaster.name}
              </button>
            </motion.div>
          ))}
        </div>
      </div>

      {/* How It Works Section */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            🎙️ How Your AI Podcast Experience Works
          </h2>
          <p className="text-lg text-white/80 leading-relaxed max-w-3xl mx-auto">
            Experience the future of financial storytelling with AI that knows your money story better than anyone.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20 text-center"
          >
            <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <Brain size={32} className="text-white" />
            </div>
            <h3 className="text-xl font-bold text-white mb-4">AI Analysis</h3>
            <p className="text-white/80 text-sm leading-relaxed">
              Our AI analyzes your spending patterns, goals, and financial behavior to understand your unique money story.
            </p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20 text-center"
          >
            <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <Mic size={32} className="text-white" />
            </div>
            <h3 className="text-xl font-bold text-white mb-4">Personalized Content</h3>
            <p className="text-white/80 text-sm leading-relaxed">
              Each podcaster creates content specifically about your financial journey, celebrating wins and calling out areas for improvement.
            </p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20 text-center"
          >
            <div className="w-16 h-16 bg-gradient-to-r from-orange-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <Headphones size={32} className="text-white" />
            </div>
            <h3 className="text-xl font-bold text-white mb-4">Weekly Episodes</h3>
            <p className="text-white/80 text-sm leading-relaxed">
              Get fresh, personalized content every week that keeps you engaged, motivated, and accountable to your financial goals.
            </p>
          </motion.div>
        </div>
      </div>

      {/* Fintech Experience Highlights */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="bg-gradient-to-r from-purple-500/20 to-blue-500/20 backdrop-blur-md rounded-2xl p-8 border border-white/20"
        >
          <div className="text-center mb-8">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              🚀 Revolutionary Fintech Experience
            </h2>
            <p className="text-lg text-white/80 max-w-3xl mx-auto">
              This isn't just another financial app - it's a complete transformation of how you interact with your money story.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <CheckCircle size={20} className="text-green-400 flex-shrink-0" />
                <span className="text-white/90">AI-powered financial storytelling</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle size={20} className="text-green-400 flex-shrink-0" />
                <span className="text-white/90">Real-time spending analysis</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle size={20} className="text-green-400 flex-shrink-0" />
                <span className="text-white/90">Personalized motivation & accountability</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle size={20} className="text-green-400 flex-shrink-0" />
                <span className="text-white/90">Behavioral finance insights</span>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <CheckCircle size={20} className="text-green-400 flex-shrink-0" />
                <span className="text-white/90">12 unique AI personalities</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle size={20} className="text-green-400 flex-shrink-0" />
                <span className="text-white/90">Weekly personalized episodes</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle size={20} className="text-green-400 flex-shrink-0" />
                <span className="text-white/90">Interactive financial coaching</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle size={20} className="text-green-400 flex-shrink-0" />
                <span className="text-white/90">Gamified financial wellness</span>
              </div>
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
          className="bg-gradient-to-r from-orange-500/20 to-pink-500/20 backdrop-blur-md rounded-2xl p-8 border border-white/20 text-center"
        >
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
            Ready to Experience the Future of Financial Storytelling?
          </h2>
          <p className="text-white/80 text-lg mb-6 max-w-2xl mx-auto">
            Join thousands who've transformed their relationship with money through personalized AI podcasts. Get your first episode free and discover what it feels like to have 12 AI experts who truly understand your financial journey.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              to="/dashboard/personal-podcast"
              className="bg-gradient-to-r from-orange-500 to-pink-500 hover:from-pink-500 hover:to-orange-500 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-300 transform hover:scale-105 hover:shadow-lg flex items-center justify-center gap-2"
            >
              <Mic size={24} />
              Generate My First Episode Free
            </Link>
            <button className="border-2 border-cyan-400 text-cyan-400 hover:bg-cyan-400 hover:text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-300 flex items-center justify-center gap-2">
              <Headphones size={24} />
              Listen to Sample Episodes
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
