import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { 
  Heart, Crown, Zap, Play, RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import WebsiteLayout from '../../components/layout/WebsiteLayout';

interface AIEmployee {
  name: string;
  role: string;
  avatar: string;
  specialty: string;
  color: string;
  wellnessStyle: string;
}

interface WellnessSession {
  id: string;
  title: string;
  duration: string;
  type: string;
  description: string;
  aiGuide: string;
  benefits: string[];
}

interface WellnessStage {
  stage: string;
  description: string;
  icon: string;
}

const WellnessStudioFeaturePage = () => {
  const [showWellnessStudio, setShowWellnessStudio] = useState(false);
  const [isGeneratingSession, setIsGeneratingSession] = useState(false);
  const [sessionProgress, setSessionProgress] = useState(0);
  const [selectedWellnessType, setSelectedWellnessType] = useState<string>('meditation');
  const [currentSession, setCurrentSession] = useState<WellnessSession | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // AI Wellness Team
  const aiWellnessTeam: AIEmployee[] = [
    {
      name: 'Prime',
      role: 'AI Wellness Director',
      avatar: '👑',
      specialty: 'Strategic Wellness Planning',
      color: 'from-purple-500 to-pink-500',
      wellnessStyle: 'Orchestrates your complete wellness journey with precision and care'
    },
    {
      name: 'Serenity',
      role: 'AI Meditation Guide',
      avatar: '🧘‍♀️',
      specialty: 'Financial Stress Relief',
      color: 'from-blue-500 to-cyan-500',
      wellnessStyle: 'Guides you through personalized meditation sessions for money anxiety'
    },
    {
      name: 'Harmony',
      role: 'AI Sleep Therapist',
      avatar: '🌙',
      specialty: 'Financial Sleep Stories',
      color: 'from-indigo-500 to-purple-500',
      wellnessStyle: 'Creates calming bedtime stories to eliminate financial worries'
    },
    {
      name: 'Balance',
      role: 'AI Mindfulness Coach',
      avatar: '🍃',
      specialty: 'Money Mindfulness',
      color: 'from-green-500 to-emerald-500',
      wellnessStyle: 'Develops conscious spending habits and mindful money practices'
    }
  ];

  // Sample Wellness Sessions
  const wellnessSessions: WellnessSession[] = [
    {
      id: '1',
      title: 'Financial Anxiety Relief',
      duration: '10 minutes',
      type: 'meditation',
      description: 'A guided meditation specifically designed to release financial stress and build confidence',
      aiGuide: 'Serenity',
      benefits: ['Reduces anxiety', 'Builds confidence', 'Improves focus']
    },
    {
      id: '2',
      title: 'Money Mindfulness Practice',
      duration: '15 minutes',
      type: 'mindfulness',
      description: 'Develop awareness of your spending triggers and build conscious money habits',
      aiGuide: 'Balance',
      benefits: ['Increases awareness', 'Reduces impulse spending', 'Builds better habits']
    },
    {
      id: '3',
      title: 'Financial Sleep Story',
      duration: '20 minutes',
      type: 'sleep',
      description: 'A calming bedtime story about financial success and abundance',
      aiGuide: 'Harmony',
      benefits: ['Better sleep', 'Reduces night worry', 'Positive visualization']
    }
  ];

  // Wellness Generation Stages
  const wellnessStages: WellnessStage[] = [
    { stage: 'Analyzing your financial stress patterns...', description: 'AI is understanding your unique challenges', icon: '🧠' },
    { stage: 'Serenity is preparing your meditation...', description: 'Creating personalized stress relief techniques', icon: '🧘‍♀️' },
    { stage: 'Harmony is crafting your sleep story...', description: 'Designing calming financial narratives', icon: '🌙' },
    { stage: 'Balance is developing mindfulness practices...', description: 'Building conscious money awareness', icon: '🍃' },
    { stage: 'Prime is orchestrating your wellness journey...', description: 'Coordinating your complete healing experience', icon: '👑' },
    { stage: 'Your AI Wellness Experience is ready! 🌟', description: 'Personalized healing session prepared', icon: '✨' }
  ];

  // Demo Functions
  const handleWellnessConnect = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsConnected(true);
      setIsLoading(false);
    }, 2000);
  };

  const generateWellnessSession = () => {
    setIsGeneratingSession(true);
    setSessionProgress(0);
    
    const interval = setInterval(() => {
      setSessionProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsGeneratingSession(false);
          setCurrentSession(wellnessSessions[Math.floor(Math.random() * wellnessSessions.length)]);
          return 100;
        }
        return prev + 15;
      });
    }, 600);
  };

  return (
    <WebsiteLayout>
      <Helmet>
        <title>Financial Wellness Made Easy with AI | XspensesAI Platform</title>
        <meta name="description" content="Transform financial stress into confidence with XspensesAI's revolutionary AI-powered financial wellness platform. Get personalized insights, automated tracking, and entertaining money management." />
        <meta name="keywords" content="financial wellness, personal finance management, AI financial advisor, financial stress relief, money management tools, financial planning app, AI financial wellness platform, personalized financial therapy, automated expense tracking with AI, financial anxiety relief app, smart money management software, AI-powered budgeting assistant" />
        <meta property="og:title" content="Financial Wellness Made Easy with AI | XspensesAI Platform" />
        <meta property="og:description" content="Transform financial stress into confidence with XspensesAI's revolutionary AI-powered financial wellness platform. Get personalized insights, automated tracking, and entertaining money management." />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Financial Wellness Made Easy with AI | XspensesAI Platform" />
        <meta name="twitter:description" content="Transform financial stress into confidence with XspensesAI's revolutionary AI-powered financial wellness platform." />
      </Helmet>

      {/* Hero Section */}
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 pt-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center mb-16">
            {/* Prime Badge */}
            <div className="text-center mb-8">
              <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-500/20 to-pink-500/20 backdrop-blur-md border border-white/20 rounded-full px-6 py-3 mb-8"
              >
                <Crown size={20} className="text-yellow-400" />
                <span className="text-white font-semibold">Prime's AI Wellness Division</span>
              </motion.div>
            </div>

            {/* Urgency Banner */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="bg-gradient-to-r from-red-500/20 to-orange-500/20 border border-red-500/30 rounded-full px-6 py-2 mb-8 inline-block"
            >
              <span className="text-red-300 text-sm font-medium">
                🧘‍♀️ Limited Time: First month FREE for new users
              </span>
            </motion.div>

            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-4xl md:text-6xl font-bold text-white mb-6"
            >
              Finally, Financial Stress Relief That{' '}
              <span className="text-purple-400 drop-shadow-lg">
                Actually Works
              </span>
            </motion.h1>
            
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="text-xl md:text-2xl text-white/90 mb-8 max-w-4xl mx-auto leading-relaxed font-medium"
            >
              Stop losing sleep over money. Our AI analyzes your financial anxiety patterns and creates personalized meditation, sleep therapy, and mindfulness sessions that actually eliminate financial stress - not just mask it.
            </motion.p>

            {/* Social Proof Bar */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="flex flex-wrap justify-center items-center gap-8 mb-8 text-white/80"
            >
              <div className="flex items-center gap-2">
                <Heart className="w-5 h-5 text-red-400" />
                <span className="font-semibold">87% reduced financial anxiety</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-yellow-400" />
                <span className="font-semibold">94% AI prediction accuracy</span>
              </div>
              <div className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-purple-400" />
                <span className="font-semibold">8 hours saved monthly</span>
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              className="flex flex-col sm:flex-row gap-6 justify-center"
            >
              {!isConnected ? (
                <button 
                  onClick={handleWellnessConnect}
                  disabled={isLoading}
                  className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-pink-500 hover:to-purple-500 disabled:opacity-50 text-white px-10 py-5 rounded-xl font-bold text-xl transition-all duration-300 transform hover:scale-105 hover:shadow-2xl flex items-center justify-center gap-3 relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300"></div>
                  {isLoading ? (
                    <>
                      <RefreshCw size={28} className="animate-spin" />
                      <span>Connecting to Wellness...</span>
                    </>
                  ) : (
                    <>
                      <Heart size={28} />
                      <span>Get My Free AI Therapy Session</span>
                      <div className="bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full ml-2">
                        FREE
                      </div>
                    </>
                  )}
                </button>
              ) : (
                <>
                  <button 
                    onClick={() => setShowWellnessStudio(true)}
                    className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-pink-500 hover:to-purple-500 text-white px-10 py-5 rounded-xl font-bold text-xl transition-all duration-300 transform hover:scale-105 hover:shadow-2xl flex items-center justify-center gap-3 relative overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300"></div>
                    <Heart size={28} />
                    <span>Enter AI Wellness Studio</span>
                  </button>
                  <button 
                    onClick={generateWellnessSession}
                    className="border-2 border-cyan-400 text-cyan-400 hover:bg-cyan-400 hover:text-white px-10 py-5 rounded-xl font-bold text-xl transition-all duration-300 flex items-center justify-center gap-3 transform hover:scale-105"
                  >
                    <Zap size={28} />
                    <span>See It In Action</span>
                  </button>
                </>
              )}
            </motion.div>

            {/* Trust Indicators */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.7 }}
              className="flex flex-wrap justify-center items-center gap-6 mt-8 text-white/60 text-sm"
            >
              <div className="flex items-center gap-2">
                <Heart className="w-4 h-4" />
                <span>Bank-level security</span>
              </div>
              <div className="flex items-center gap-2">
                <Crown className="w-4 h-4" />
                <span>Your data stays private</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4" />
                <span>Setup in 2 minutes</span>
              </div>
            </motion.div>
          </div>

          {/* Testimonials Section */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="bg-white/5 backdrop-blur-md rounded-2xl p-8 border border-white/20 mb-16"
          >
            <h3 className="text-2xl font-bold text-white text-center mb-8">
              🧘‍♀️ What Users Are Saying About AI Financial Therapy
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white/10 rounded-xl p-6">
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Heart key={i} size={16} className="text-red-400 fill-current" />
                  ))}
                </div>
                <p className="text-white/90 mb-4 italic">
                  "I used to have panic attacks about money. The AI meditation sessions helped me understand my spending triggers. Now I sleep peacefully and have saved $1,200 this month!"
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold">S</span>
                  </div>
                  <div>
                    <p className="text-white font-semibold">Sarah M.</p>
                    <p className="text-white/60 text-sm">Marketing Manager</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white/10 rounded-xl p-6">
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Heart key={i} size={16} className="text-red-400 fill-current" />
                  ))}
                </div>
                <p className="text-white/90 mb-4 italic">
                  "The AI sleep stories are incredible. I used to lie awake worrying about bills. Now I fall asleep to calming stories about financial abundance. My anxiety is gone!"
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-blue-400 to-cyan-400 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold">M</span>
                  </div>
                  <div>
                    <p className="text-white font-semibold">Mike R.</p>
                    <p className="text-white/60 text-sm">Freelance Designer</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white/10 rounded-xl p-6">
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Heart key={i} size={16} className="text-red-400 fill-current" />
                  ))}
                </div>
                <p className="text-white/90 mb-4 italic">
                  "The AI mindfulness sessions taught me to pause before spending. I've reduced impulse purchases by 80% and built a $5,000 emergency fund in 3 months!"
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-green-400 to-emerald-400 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold">J</span>
                  </div>
                  <div>
                    <p className="text-white font-semibold">Jennifer L.</p>
                    <p className="text-white/60 text-sm">Teacher</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* AI Wellness Team Showcase */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-16"
          >
            <h2 className="text-3xl font-bold text-white text-center mb-6">Your Personal AI Financial Therapists</h2>
            <p className="text-white/80 text-center mb-12 max-w-3xl mx-auto">
              Meet the AI wellness experts who understand your financial anxiety and create personalized healing experiences. No generic meditation apps - just AI that actually knows your money story and helps you heal from financial stress.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {aiWellnessTeam.map((member, index) => (
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
                    <p className="text-white/60 text-xs mt-3">{member.wellnessStyle}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
            </div>
          </div>

      {/* Live AI Wellness Generation Theater */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 backdrop-blur-md rounded-2xl p-8 border border-white/20"
        >
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-white mb-4">See Your Financial Stress Disappear in Real-Time</h2>
            <p className="text-white/80">Watch as our AI analyzes your financial anxiety patterns and creates personalized therapy sessions that actually work. No more generic meditation apps - just AI that understands your unique money stress.</p>
          </div>

          {/* Generation Progress */}
          {isGeneratingSession && (
            <div className="bg-white/10 rounded-xl p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Generating Your Wellness Session</h3>
                <span className="text-cyan-400 font-bold">{sessionProgress}%</span>
              </div>
              <div className="w-full bg-white/20 rounded-full h-3 mb-4">
                <div 
                  className="bg-gradient-to-r from-purple-500 to-pink-500 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${sessionProgress}%` }}
                ></div>
              </div>
              <div className="text-center">
                <p className="text-white/70 text-sm">
                  {wellnessStages[Math.floor((sessionProgress / 100) * (wellnessStages.length - 1))]?.stage}
                </p>
                <p className="text-white/50 text-xs mt-1">
                  {wellnessStages[Math.floor((sessionProgress / 100) * (wellnessStages.length - 1))]?.description}
                </p>
                </div>
              </div>
          )}

          {/* Generated Session Display */}
          {currentSession && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="bg-white/10 rounded-xl p-6"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="text-4xl">🧘‍♀️</div>
                <div>
                  <h3 className="text-xl font-bold text-white">{currentSession.title}</h3>
                  <p className="text-cyan-400">Guided by {currentSession.aiGuide} • {currentSession.duration}</p>
            </div>
          </div>
              <p className="text-white/80 mb-4">{currentSession.description}</p>
              <div className="flex flex-wrap gap-2">
                {currentSession.benefits.map((benefit, index) => (
                  <span key={index} className="bg-cyan-500/20 text-cyan-300 px-3 py-1 rounded-full text-sm">
                    {benefit}
                  </span>
                ))}
              </div>
              <div className="mt-4 flex gap-3">
                <button className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-2 rounded-lg font-semibold flex items-center gap-2">
                  <Play size={16} />
                  Start Session
                </button>
                <button className="border border-white/30 text-white px-6 py-2 rounded-lg font-semibold">
                  Save for Later
                </button>
              </div>
            </motion.div>
          )}

          {/* Wellness Features */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
            {[
              {
                title: "AI Meditation Sessions",
                description: "Personalized guided meditations for financial stress relief",
                icon: "🧘‍♀️",
                color: "from-blue-500 to-cyan-500"
              },
              {
                title: "Financial Sleep Stories",
                description: "Calming bedtime narratives to eliminate money worries",
                icon: "🌙",
                color: "from-indigo-500 to-purple-500"
              },
              {
                title: "Money Mindfulness",
                description: "Conscious spending awareness and habit transformation",
                icon: "🍃",
                color: "from-green-500 to-emerald-500"
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

      {/* Financial Stress Reality Section */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="bg-gradient-to-r from-red-500/20 to-orange-500/20 backdrop-blur-md rounded-2xl p-8 border border-white/20"
        >
          <h2 className="text-3xl font-bold text-center text-white mb-12">
            Financial Stress Is Real - And We're Here to Help
          </h2>
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <div className="bg-red-500/20 rounded-xl p-6 mb-6 border border-red-400/30">
                <h3 className="text-xl font-bold text-red-300 mb-4">The Financial Stress Epidemic</h3>
                <div className="space-y-3 text-red-200">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">😰</span>
                    <span><strong>76%</strong> of Americans report money as their #1 stress source</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">⏰</span>
                    <span><strong>5+ hours</strong> monthly spent on financial tasks and worry</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">💸</span>
                    <span><strong>68%</strong> live paycheck to paycheck with no emergency fund</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">😴</span>
                    <span><strong>42%</strong> lose sleep due to financial anxiety</span>
                  </div>
                </div>
              </div>
              <p className="text-white/80 mb-4">
                Traditional financial management tools focus on numbers, but ignore the emotional and psychological aspects of money. They leave you feeling overwhelmed, anxious, and alone in your financial journey.
              </p>
              <p className="text-white/80">
                That's why we created the world's first AI-powered financial wellness platform that addresses both your financial data AND your financial wellbeing.
              </p>
            </div>
            <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl p-8 border border-white/20">
              <h3 className="text-xl font-bold text-white mb-4">How AI Transforms Financial Wellness</h3>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-purple-500/30 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-purple-300 font-bold">1</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-white">AI Analyzes Your Patterns</h4>
                    <p className="text-sm text-white/70">Advanced algorithms understand your spending triggers and emotional money patterns</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-blue-500/30 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-blue-300 font-bold">2</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-white">Creates Personalized Wellness Plan</h4>
                    <p className="text-sm text-white/70">Your AI therapist develops a custom approach to your unique financial challenges</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-green-500/30 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-green-300 font-bold">3</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-white">Provides Ongoing Support & Entertainment</h4>
                    <p className="text-sm text-white/70">Daily guidance, meditation sessions, and personalized audio content keep you motivated</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
        </div>

      {/* AI Wellness Capabilities Section */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl font-bold text-white mb-4">
            The World's First AI Financial Therapist
          </h2>
          <p className="text-white/80 text-lg">Advanced AI capabilities that understand both your finances and your emotions</p>
        </motion.div>
        
          <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              icon: "🧠",
              title: "Emotional Intelligence",
              description: "Our AI understands the psychology behind your spending decisions and provides compassionate, judgment-free support.",
              features: ["Recognizes spending triggers", "Addresses money anxiety", "Builds healthy money mindset", "Provides emotional support"],
              color: "from-purple-500 to-pink-500"
            },
            {
              icon: "🎯",
              title: "Personalized Therapy",
              description: "Every session is tailored to your unique financial situation, goals, and emotional relationship with money.",
              features: ["Custom meditation sessions", "Personalized breathing exercises", "Targeted stress relief", "Individual progress tracking"],
              color: "from-blue-500 to-purple-500"
            },
            {
              icon: "🎵",
              title: "Entertainment-First Approach",
              description: "Financial wellness doesn't have to be boring. Enjoy personalized podcasts, music, and engaging content.",
              features: ["AI-generated financial podcasts", "Calming money meditation music", "Engaging wellness content", "Gamified progress tracking"],
              color: "from-green-500 to-blue-500"
            }
          ].map((capability, index) => (
            <motion.div 
              key={capability.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 hover:scale-105 transition-all duration-300"
            >
              <div className={`w-16 h-16 bg-gradient-to-r ${capability.color} rounded-full flex items-center justify-center mx-auto mb-6`}>
                <span className="text-white text-2xl">{capability.icon}</span>
              </div>
              <h3 className="text-xl font-bold text-white mb-4 text-center">{capability.title}</h3>
              <p className="text-white/80 text-center mb-4">
                {capability.description}
              </p>
              <ul className="text-sm text-white/70 space-y-2">
                {capability.features.map((feature, idx) => (
                  <li key={idx}>• {feature}</li>
                ))}
              </ul>
            </motion.div>
          ))}
          </div>
        </div>

      {/* Wellness Programs Section */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Comprehensive Financial Wellness Programs</h2>
          <p className="text-xl text-white/80 max-w-3xl mx-auto">
            From quick stress relief to deep financial healing, our AI-powered programs address every aspect of your financial wellness journey.
          </p>
        </motion.div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {[
            {
              icon: "🧘",
              title: "Money Meditation Sessions",
              description: "Guided meditations specifically designed to address financial stress and money anxiety",
              features: ["5-30 minute sessions", "Reduces financial stress", "Improves money mindset", "Better financial decisions"]
            },
            {
              icon: "💨",
              title: "Financial Stress Breathing",
              description: "Quick breathing exercises to use when financial anxiety strikes or before making big money decisions",
              features: ["2-5 minute exercises", "Instant stress relief", "Use anywhere, anytime", "Guided breathing patterns"]
            },
            {
              icon: "💭",
              title: "Money Mindfulness Practice",
              description: "Develop awareness of your spending triggers and build conscious money habits",
              features: ["Daily mindfulness prompts", "Spending trigger awareness", "Conscious money decisions", "Habit transformation"]
            },
            {
              icon: "🌙",
              title: "Financial Sleep Stories",
              description: "Calming bedtime stories focused on financial success and abundance to reduce money worries at night",
              features: ["15-45 minute stories", "Reduces nighttime money worry", "Positive financial visualization", "Better sleep quality"]
            }
          ].map((program, index) => (
            <motion.div 
              key={program.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 hover:scale-105 transition-all duration-300"
            >
              <div className="text-3xl mb-4">{program.icon}</div>
              <h3 className="font-semibold text-lg mb-3 text-white">{program.title}</h3>
              <p className="text-white/80 mb-4 text-sm">{program.description}</p>
              <div className="text-white/70 text-sm space-y-1">
                {program.features.map((feature, idx) => (
                  <div key={idx}>• {feature}</div>
                ))}
              </div>
            </motion.div>
          ))}
          </div>
        </div>

      {/* Social Proof Section */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 backdrop-blur-md rounded-2xl p-8 border border-white/20"
        >
          <h2 className="text-3xl font-bold text-center text-white mb-12">
            Real Results from Real Users
          </h2>
          <div className="grid md:grid-cols-3 gap-8 mb-12">
            {[
              { stat: "94%", label: "AI Prediction Accuracy", description: "Our AI financial advisor provides insights with industry-leading accuracy", color: "text-purple-400" },
              { stat: "87%", label: "Reduced Financial Anxiety", description: "Users report significantly less stress about money after 30 days", color: "text-green-400" },
              { stat: "8 hrs", label: "Monthly Time Saved", description: "Automated tracking and AI insights save hours of manual work", color: "text-blue-400" }
            ].map((item, index) => (
              <div key={index} className="text-center">
                <div className={`text-4xl font-bold ${item.color} mb-2`}>{item.stat}</div>
                <div className="text-lg font-semibold text-white mb-2">{item.label}</div>
                <div className="text-white/70">{item.description}</div>
            </div>
            ))}
          </div>
          <div className="grid md:grid-cols-2 gap-8">
            {[
              {
                name: "Maria K.",
                role: "Marketing Manager",
                testimonial: "The AI financial therapist helped me understand why I was overspending on coffee when stressed. Now I have healthy coping mechanisms and save $200/month!",
                improvement: "Stress Level: 9/10 → 3/10",
                bg: "from-purple-500/20 to-pink-500/20",
                border: "border-purple-400/30"
              },
              {
                name: "James C.",
                role: "Freelance Designer",
                testimonial: "I used to lose sleep worrying about money. The financial sleep stories and meditation sessions have completely changed my relationship with finances.",
                improvement: "Sleep Quality: 4/10 → 8/10",
                bg: "from-blue-500/20 to-green-500/20",
                border: "border-blue-400/30"
              }
            ].map((testimonial, index) => (
              <div key={index} className={`bg-gradient-to-br ${testimonial.bg} rounded-xl p-6 border ${testimonial.border}`}>
              <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mr-3">
                    <span className="text-white font-bold">{testimonial.name.split(' ').map(n => n[0]).join('')}</span>
                </div>
                <div>
                    <div className="font-semibold text-white">{testimonial.name}</div>
                    <div className="text-sm text-white/70">{testimonial.role}</div>
                </div>
              </div>
                <p className="text-white/90 mb-3">
                  "{testimonial.testimonial}"
              </p>
                <div className="text-green-400 font-semibold">{testimonial.improvement}</div>
            </div>
            ))}
                </div>
        </motion.div>
        </div>

      {/* Benefits Section */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="bg-gradient-to-r from-green-500/20 to-blue-500/20 backdrop-blur-md rounded-2xl p-8 border border-white/20"
        >
          <h2 className="text-3xl font-bold text-center text-white mb-12">
            Transform Your Financial Life with AI-Powered Wellness
          </h2>
          <div className="grid md:grid-cols-2 gap-12">
            <div>
              <h3 className="text-2xl font-bold text-white mb-6">Immediate Benefits</h3>
              <div className="space-y-4">
                {[
                  { title: "Instant Stress Relief", description: "Quick breathing exercises and meditation sessions provide immediate financial anxiety relief" },
                  { title: "Better Sleep", description: "Financial sleep stories and relaxation techniques help you rest without money worries" },
                  { title: "Improved Decision Making", description: "Clear mind leads to better financial choices and reduced impulse spending" }
                ].map((benefit, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-green-500/30 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-green-300">✓</span>
                  </div>
                  <div>
                      <h4 className="font-semibold text-white">{benefit.title}</h4>
                      <p className="text-white/70">{benefit.description}</p>
                  </div>
                </div>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-2xl font-bold text-white mb-6">Long-Term Transformation</h3>
              <div className="space-y-4">
                {[
                  { title: "Healthy Money Mindset", description: "Develop a positive relationship with money through consistent mindfulness practice", icon: "🎯" },
                  { title: "Increased Savings", description: "Reduced stress and better habits lead to more money saved and invested", icon: "💰" },
                  { title: "Financial Confidence", description: "Build lasting confidence in your ability to manage money and achieve goals", icon: "🌟" }
                ].map((benefit, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-blue-500/30 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-blue-300">{benefit.icon}</span>
                  </div>
                  <div>
                      <h4 className="font-semibold text-white">{benefit.title}</h4>
                      <p className="text-white/70">{benefit.description}</p>
                  </div>
                </div>
                ))}
                  </div>
                </div>
              </div>
        </motion.div>
        </div>

      {/* Final CTA Section */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl p-8 text-center"
        >
          <h2 className="text-3xl font-bold text-white mb-6">
            Stop Losing Sleep Over Money - Get AI Financial Therapy Today
          </h2>
          <p className="text-xl text-purple-100 mb-8 max-w-2xl mx-auto">
            Join 15,000+ users who've eliminated financial anxiety with personalized AI therapy sessions. Get your first session free and discover what it feels like to have a financial therapist who actually understands your money stress.
          </p>
          <div className="mb-6">
            <div className="text-yellow-300 text-lg font-semibold">
              🌟 Limited Time: Complete Financial Wellness for $29/month
            </div>
            <div className="text-purple-200 text-sm">
              (Regular $49/month • AI Financial Therapist • Personalized Wellness Programs • Cancel anytime)
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <Link to="/signup" className="bg-white text-purple-600 px-10 py-5 rounded-xl font-bold text-xl hover:bg-gray-100 transition-all duration-300 transform hover:scale-105 flex items-center justify-center gap-3">
              <Heart size={24} />
              <span>Get My Free AI Therapy Session</span>
              <div className="bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full ml-2">
                FREE
              </div>
            </Link>
            <Link to="/ai-demo" className="border-2 border-white text-white px-10 py-5 rounded-xl font-bold text-xl hover:bg-white hover:text-purple-600 transition-all duration-300 flex items-center justify-center gap-3 transform hover:scale-105">
              <Zap size={24} />
              <span>See It In Action</span>
            </Link>
          </div>
          <div className="mt-6 text-purple-200 text-sm">
            ✓ 14-day free trial ✓ No credit card required ✓ Instant access to all wellness programs
          </div>
        </motion.div>
      </div>

      {/* AI Wellness Studio Modal */}
      <AnimatePresence>
        {showWellnessStudio && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowWellnessStudio(false)}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 rounded-2xl p-8 max-w-2xl w-full border border-white/20"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-white mb-4">AI Wellness Studio</h2>
                <p className="text-white/80">Choose your wellness experience and let our AI team guide you to financial peace</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                {[
                  { type: 'meditation', title: 'Meditation', icon: '🧘‍♀️', description: 'Guided financial stress relief' },
                  { type: 'mindfulness', title: 'Mindfulness', icon: '🍃', description: 'Conscious money awareness' },
                  { type: 'sleep', title: 'Sleep Therapy', icon: '🌙', description: 'Calming bedtime stories' },
                  { type: 'breathing', title: 'Breathing', icon: '💨', description: 'Quick anxiety relief' }
                ].map((option) => (
                  <button
                    key={option.type}
                    onClick={() => {
                      setSelectedWellnessType(option.type);
                      setShowWellnessStudio(false);
                      generateWellnessSession();
                    }}
                    className={`p-6 rounded-xl border-2 transition-all duration-300 ${
                      selectedWellnessType === option.type
                        ? 'border-purple-400 bg-purple-500/20'
                        : 'border-white/20 bg-white/5 hover:border-purple-300 hover:bg-purple-500/10'
                    }`}
                  >
                    <div className="text-4xl mb-3">{option.icon}</div>
                    <h3 className="text-lg font-semibold text-white mb-2">{option.title}</h3>
                    <p className="text-white/70 text-sm">{option.description}</p>
                  </button>
                ))}
              </div>

              <div className="flex gap-4 justify-center">
                <button 
                  onClick={() => setShowWellnessStudio(false)}
                  className="px-6 py-3 border border-white/30 text-white rounded-lg hover:bg-white/10 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => {
                    setShowWellnessStudio(false);
                    generateWellnessSession();
                  }}
                  className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-semibold hover:from-pink-500 hover:to-purple-500 transition-all duration-300"
                >
                  Generate Session
                </button>
        </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </WebsiteLayout>
  );
};

export default WellnessStudioFeaturePage; 
