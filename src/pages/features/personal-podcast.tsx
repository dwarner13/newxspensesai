import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Mic, Play, Headphones, Brain, CheckCircle, Flame, Crown, 
  Sparkles, Zap, Heart, Target, TrendingUp, AlertTriangle, 
  MessageCircle, Bot, HeartHandshake, Leaf, Sun, Moon, 
  CloudRain, Wind, Eye, Coffee, Rocket, Gem, Compass, 
  Telescope, Lightbulb, ThumbsUp, ThumbsDown, Smile, Frown, 
  Meh, Rainbow, Star, Award, Clock, BarChart3, PieChart, 
  ArrowRight, Volume2, VolumeX, ChevronRight, ChevronLeft,
  Plus, Minus, Settings, Bell, Users, Shield, Lock, Key
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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
  aiEmployee: string;
  motivationalStyle: string;
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
  aiEmployee: string;
  roastIntensity: string;
}

interface PodcastEpisode {
  id: string;
  title: string;
  podcaster: string;
  content: string;
  duration: string;
  mood: string;
  category: string;
}

export default function PersonalPodcastFeaturePage() {
  const [activeDemo, setActiveDemo] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [currentEpisode, setCurrentEpisode] = useState<PodcastEpisode | null>(null);
  const [selectedMood, setSelectedMood] = useState<string>('motivational');
  const [showPodcastStudio, setShowPodcastStudio] = useState(false);

  // AI Podcast Generation Stages
  const generationStages = [
    'Analyzing your financial DNA...',
    'Matching AI personalities...',
    'Crafting personalized content...',
    'Adding motivational magic...',
    'Finalizing your episode...',
    'Ready to inspire! 🎉'
  ];

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
      fintechFocus: 'AI-powered debt tracking & celebration',
      aiEmployee: 'Blitz',
      motivationalStyle: 'High-energy celebrations & momentum building'
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
      fintechFocus: 'Predictive analytics & smart planning',
      aiEmployee: 'Wisdom',
      motivationalStyle: 'Strategic insights & long-term thinking'
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
      fintechFocus: 'Behavioral finance & habit tracking',
      aiEmployee: 'Crystal',
      motivationalStyle: 'Gentle guidance & emotional support'
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
      fintechFocus: 'Real-time budget monitoring & alerts',
      aiEmployee: 'Finley',
      motivationalStyle: 'Accountability & honest feedback'
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
      fintechFocus: 'Income optimization & opportunity spotting',
      aiEmployee: 'Nova',
      motivationalStyle: 'Creative solutions & opportunity spotting'
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
      fintechFocus: 'Wellness tracking & balance metrics',
      aiEmployee: 'Goalie',
      motivationalStyle: 'Balance & long-term wellness'
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
      fintechFocus: 'Spending pattern analysis & reality checks',
      aiEmployee: 'Tag',
      roastIntensity: 'Surgical precision roasting'
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
      fintechFocus: 'Luxury spending analysis & alternatives',
      aiEmployee: 'Crystal',
      roastIntensity: 'Sassy & stylish roasting'
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
      fintechFocus: 'Budget violation tracking & alerts',
      aiEmployee: 'Finley',
      roastIntensity: 'Explosive truth bombs'
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
      fintechFocus: 'Decision analysis & pattern recognition',
      aiEmployee: 'Byte',
      roastIntensity: 'Evidence-based roasting'
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
      fintechFocus: 'Investment performance analysis & lessons',
      aiEmployee: 'Wisdom',
      roastIntensity: 'Devilishly charming roasting'
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
      fintechFocus: 'Comprehensive financial health scoring',
      aiEmployee: 'Prime',
      roastIntensity: 'Royal authority roasting'
    }
  ];

  // Sample Podcast Episodes
  const sampleEpisodes: PodcastEpisode[] = [
    {
      id: '1',
      title: 'Your Debt-Free Journey Starts NOW!',
      podcaster: 'Spark',
      content: 'Listen up, financial warrior! Today we\'re going to turn your debt into dust and your savings into gold. I can feel your determination through the speakers!',
      duration: '12:34',
      mood: 'motivational',
      category: 'Debt Payoff'
    },
    {
      id: '2',
      title: 'The Brutal Truth About Your Coffee Habit',
      podcaster: 'Roast Master',
      content: 'Oh honey, you\'re spending $150 a month on coffee while complaining about being broke? Let me break down why your barista knows your name better than your bank account does.',
      duration: '8:47',
      mood: 'roasting',
      category: 'Spending Reality'
    },
    {
      id: '3',
      title: 'Building Wealth Like a Financial Ninja',
      podcaster: 'Wisdom',
      content: 'Today we\'ll explore the ancient art of compound interest and how to make your money work harder than you do. The secret? Start yesterday.',
      duration: '15:22',
      mood: 'motivational',
      category: 'Investment Strategy'
    }
  ];

  // AI Team Collaboration
  const aiTeam = [
    {
      name: 'Prime',
      role: 'AI Director & Content Orchestrator',
      avatar: '👑',
      specialty: 'Orchestrates all AI podcasters and ensures perfect content alignment',
      color: 'from-yellow-400 via-orange-400 to-red-400'
    },
    {
      name: 'Byte',
      role: 'Data Analysis & Pattern Recognition',
      avatar: '💾',
      specialty: 'Analyzes spending patterns and financial behavior for personalized content',
      color: 'from-blue-500 to-cyan-500'
    },
    {
      name: 'Tag',
      role: 'Content Categorization & Organization',
      avatar: '🏷️',
      specialty: 'Organizes financial topics and ensures content flows perfectly',
      color: 'from-green-500 to-emerald-500'
    },
    {
      name: 'Crystal',
      role: 'Emotional Intelligence & Behavioral Analysis',
      avatar: '💎',
      specialty: 'Understands your emotional relationship with money for better content',
      color: 'from-purple-500 to-pink-500'
    }
  ];

  // Podcast Generation Process
  const startPodcastGeneration = () => {
    setIsGenerating(true);
    setGenerationProgress(0);
    
    const interval = setInterval(() => {
      setGenerationProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsGenerating(false);
          setCurrentEpisode(sampleEpisodes[Math.floor(Math.random() * sampleEpisodes.length)]);
          return 100;
        }
        return prev + 20;
      });
    }, 800);
  };

  // AI Learning Journey
  const learningStages = [
    {
      stage: 'Data Analysis',
      description: 'AI analyzes your financial patterns, goals, and behavior',
      icon: '📊',
      color: 'from-blue-500 to-cyan-500'
    },
    {
      stage: 'Personality Matching',
      description: 'Matches you with the perfect AI podcasters for your style',
      icon: '🎭',
      color: 'from-purple-500 to-pink-500'
    },
    {
      stage: 'Content Creation',
      description: 'AI generates personalized episodes based on your data',
      icon: '✍️',
      color: 'from-green-500 to-emerald-500'
    },
    {
      stage: 'Emotional Intelligence',
      description: 'AI adapts tone and style based on your current mood',
      icon: '🧠',
      color: 'from-orange-500 to-red-500'
    },
    {
      stage: 'Continuous Learning',
      description: 'AI improves content based on your engagement and feedback',
      icon: '🚀',
      color: 'from-indigo-500 to-purple-500'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Hero Section */}
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 pt-20">
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
              <span className="font-bold">Prime's AI Podcast Division</span>
            </motion.div>
          </div>

          {/* Hero Content */}
          <div className="text-center mb-16">
        <motion.h1
              initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-4xl md:text-6xl font-bold text-white mb-8"
        >
              The World's First{' '}
              <span className="text-orange-400 drop-shadow-lg">
                AI Podcast Theater
              </span>
        </motion.h1>
        <motion.p
              initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-lg md:text-xl text-white/80 mb-12 max-w-4xl mx-auto leading-relaxed"
        >
              Experience the future of financial storytelling with 12 AI podcasters who know your money story better than anyone. From motivational cheerleaders to brutally honest roasters, get ready for the most engaging financial content ever created. This isn't just a podcast - it's a complete AI-powered financial transformation.
        </motion.p>
        <motion.div
              initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="flex flex-col sm:flex-row gap-6 justify-center"
            >
              <button 
                onClick={() => setShowPodcastStudio(true)}
                className="bg-gradient-to-r from-orange-500 to-pink-500 hover:from-pink-500 hover:to-orange-500 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-300 transform hover:scale-105 hover:shadow-lg flex items-center justify-center gap-2"
              >
                <Mic size={24} />
                Enter AI Podcast Studio
              </button>
              <button 
                onClick={startPodcastGeneration}
                className="border-2 border-cyan-400 text-cyan-400 hover:bg-cyan-400 hover:text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-300 flex items-center justify-center gap-2"
              >
                <Play size={24} />
                Generate Sample Episode
              </button>
        </motion.div>
          </div>

          {/* AI Team Showcase */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20 mb-16"
          >
            <h3 className="text-2xl font-bold text-white text-center mb-8">
              🤖 Prime's AI Podcast Team
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {aiTeam.map((member, index) => (
                <motion.div
                  key={member.name}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  className="text-center"
                >
                  <div className={`w-16 h-16 bg-gradient-to-r ${member.color} rounded-full flex items-center justify-center mx-auto mb-4`}>
                    <span className="text-2xl">{member.avatar}</span>
                  </div>
                  <h4 className="text-lg font-bold text-white mb-2">{member.name}</h4>
                  <p className="text-white/70 text-sm mb-2">{member.role}</p>
                  <p className="text-white/60 text-xs">{member.specialty}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Live AI Podcast Generation Demo */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="bg-gradient-to-r from-purple-500/20 to-blue-500/20 backdrop-blur-md rounded-2xl p-8 border border-white/20"
        >
          <div className="text-center mb-8">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              🎙️ Live AI Podcast Generation Theater
            </h2>
            <p className="text-lg text-white/80 max-w-3xl mx-auto">
              Watch as our AI creates a personalized podcast episode just for you. This is where the magic happens!
            </p>
          </div>

          {/* Generation Progress */}
          {isGenerating && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-8"
            >
              <div className="bg-white/10 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-white font-semibold">AI Generating Your Episode...</span>
                  <span className="text-cyan-400 font-bold">{generationProgress}%</span>
                </div>
                <div className="w-full bg-white/20 rounded-full h-3 mb-4">
                  <motion.div 
                    className="bg-gradient-to-r from-cyan-400 to-purple-400 h-3 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${generationProgress}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
                <div className="text-center">
                  <p className="text-white/80 text-sm">
                    {generationStages[Math.floor((generationProgress / 20))] || 'Finalizing...'}
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Generated Episode Display */}
          {currentEpisode && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/10 rounded-xl p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-white">{currentEpisode.title}</h3>
                <span className="text-cyan-400 text-sm">{currentEpisode.duration}</span>
              </div>
              <p className="text-white/80 mb-4">{currentEpisode.content}</p>
              <div className="flex items-center gap-4 text-sm">
                <span className="text-white/60">Hosted by: <span className="text-white font-semibold">{currentEpisode.podcaster}</span></span>
                <span className="text-white/60">Category: <span className="text-white font-semibold">{currentEpisode.category}</span></span>
                <span className="text-white/60">Mood: <span className="text-white font-semibold">{currentEpisode.mood}</span></span>
              </div>
            </motion.div>
          )}

          {/* Episode Generation Controls */}
          <div className="text-center">
            <button 
              onClick={startPodcastGeneration}
              disabled={isGenerating}
              className="bg-gradient-to-r from-green-500 to-blue-500 hover:from-blue-500 hover:to-green-500 disabled:opacity-50 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-300 hover:shadow-lg flex items-center gap-2 mx-auto"
            >
              <Zap size={20} />
              {isGenerating ? 'Generating...' : 'Generate New Episode'}
            </button>
          </div>
        </motion.div>
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
            Meet the AI hosts who celebrate your wins, motivate your journey, and turn every financial milestone into a victory lap. These positive podcasters are your personal hype squad for financial success, powered by our advanced AI ecosystem.
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
                <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-lg p-3 mb-3">
                  <p className="text-white/90 text-xs font-medium">🎯 {podcaster.fintechFocus}</p>
                </div>
                <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-lg p-3">
                  <p className="text-white/90 text-xs font-medium">🤖 AI Partner: {podcaster.aiEmployee}</p>
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
            Sometimes you need a reality check, and these AI hosts deliver it with style. The roasting podcasters keep you honest, call out bad decisions, and ensure you never get too comfortable with poor financial habits. They're brutally honest because they care about your financial future.
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
                <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-lg p-3 mb-3">
                  <p className="text-white/90 text-xs font-medium">🎯 {podcaster.fintechFocus}</p>
                </div>
                <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-lg p-3">
                  <p className="text-white/90 text-xs font-medium">🤖 AI Partner: {podcaster.aiEmployee}</p>
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

      {/* AI Learning Journey */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            🧠 AI Learning Journey - How Our Podcasters Get Smarter
          </h2>
          <p className="text-lg text-white/80 leading-relaxed max-w-3xl mx-auto">
            Our AI podcasters don't just create content - they learn, adapt, and improve with every interaction. Here's how they become your perfect financial companions.
          </p>
        </motion.div>

        <div className="space-y-8">
          {learningStages.map((stage, index) => (
            <motion.div 
              key={stage.stage}
              initial={{ opacity: 0, x: index % 2 === 0 ? -50 : 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="flex items-center gap-6"
            >
              <div className={`w-16 h-16 bg-gradient-to-r ${stage.color} rounded-full flex items-center justify-center flex-shrink-0`}>
                <span className="text-2xl">{stage.icon}</span>
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-white mb-2">{stage.stage}</h3>
                <p className="text-white/80">{stage.description}</p>
              </div>
              {index < learningStages.length - 1 && (
                <div className="hidden md:block">
                  <ArrowRight size={24} className="text-white/40" />
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>

      {/* Revolutionary Fintech Experience */}
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
              This isn't just another financial app - it's a complete transformation of how you interact with your money story. Our AI podcasters are the future of financial education and motivation.
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
            <button 
              onClick={() => setShowPodcastStudio(true)}
              className="bg-gradient-to-r from-orange-500 to-pink-500 hover:from-pink-500 hover:to-orange-500 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-300 transform hover:scale-105 hover:shadow-lg flex items-center justify-center gap-2"
            >
              <Mic size={24} />
              Enter AI Podcast Studio
            </button>
            <button 
              onClick={startPodcastGeneration}
              className="border-2 border-cyan-400 text-cyan-400 hover:bg-cyan-400 hover:text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-300 flex items-center justify-center gap-2"
            >
              <Headphones size={24} />
              Generate Sample Episode
            </button>
          </div>
        </motion.div>
      </div>

      {/* AI Podcast Studio Modal */}
      <AnimatePresence>
        {showPodcastStudio && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4"
            onClick={() => setShowPodcastStudio(false)}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-white mb-4">
                  🎙️ Welcome to Prime's AI Podcast Studio
                </h2>
                <p className="text-white/80">
                  This is where the magic happens. Choose your mood and let our AI create the perfect podcast episode for you.
                </p>
              </div>

              {/* Mood Selection */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div 
                  className={`p-6 rounded-xl border-2 cursor-pointer transition-all duration-300 ${
                    selectedMood === 'motivational' 
                      ? 'border-green-400 bg-green-500/20' 
                      : 'border-white/20 bg-white/10'
                  }`}
                  onClick={() => setSelectedMood('motivational')}
                >
                  <div className="text-center">
                    <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Heart size={32} className="text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Motivational Mode</h3>
                    <p className="text-white/80 text-sm">Get pumped up and motivated to achieve your financial goals!</p>
                  </div>
                </div>

                <div 
                  className={`p-6 rounded-xl border-2 cursor-pointer transition-all duration-300 ${
                    selectedMood === 'roasting' 
                      ? 'border-red-400 bg-red-500/20' 
                      : 'border-white/20 bg-white/10'
                  }`}
                  onClick={() => setSelectedMood('roasting')}
                >
                  <div className="text-center">
                    <div className="w-16 h-16 bg-gradient-to-r from-red-500 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Flame size={32} className="text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Roasting Mode</h3>
                    <p className="text-white/80 text-sm">Get the brutal truth and tough love you need to hear!</p>
                  </div>
                </div>
              </div>

              {/* Studio Actions */}
              <div className="text-center">
                <button 
                  onClick={() => {
                    setShowPodcastStudio(false);
                    startPodcastGeneration();
                  }}
                  className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-pink-500 hover:to-purple-500 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-300 transform hover:scale-105 hover:shadow-lg flex items-center gap-2 mx-auto"
                >
                  <Zap size={24} />
                  Generate {selectedMood === 'motivational' ? 'Motivational' : 'Roasting'} Episode
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
} 
