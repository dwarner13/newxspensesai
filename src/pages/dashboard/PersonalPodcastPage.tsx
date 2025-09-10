import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX,
  SkipBack,
  SkipForward,
  Download,
  Share2,
  Heart,
  MessageCircle,
  BarChart3,
  Users,
  Clock,
  TrendingUp,
  Target,
  Zap,
  Crown,
  Brain,
  Mic,
  Headphones,
  Star,
  ThumbsUp,
  ThumbsDown,
  Settings,
  Upload,
  FileText,
  Calendar,
  DollarSign,
  CreditCard,
  Home,
  Car,
  ShoppingBag,
  Coffee,
  Gamepad2,
  Plane,
  Utensils
} from 'lucide-react';

// AI Podcast Interfaces
interface AIPodcaster {
  id: string;
  name: string;
  title: string;
  emoji: string;
  personality: string;
  specialty: string;
  description: string;
  bio: string;
  color: string;
  bgColor: string;
  borderColor: string;
  status: 'active' | 'working' | 'idle';
  currentTask?: string;
  performance: number;
  category: 'cheerleader' | 'reality_checker';
}

interface PodcastEpisode {
  id: string;
  title: string;
  description: string;
  duration: number;
  createdAt: string;
  podcaster: string;
  category: string;
  audioUrl?: string;
  transcript: string;
  highlights: string[];
  stats: {
    listens: number;
    likes: number;
    shares: number;
    completionRate: number;
  };
  financialData: {
    spendingPatterns: string[];
    wins: string[];
    challenges: string[];
    recommendations: string[];
  };
}

interface FinancialData {
  totalSpending: number;
  categories: {
    housing: number;
    transportation: number;
    food: number;
    entertainment: number;
    shopping: number;
    utilities: number;
    other: number;
  };
  trends: {
    monthlyChange: number;
    topSpending: string;
    biggestWin: string;
    biggestChallenge: string;
  };
  goals: {
    savings: number;
    debt: number;
    investment: number;
  };
}

export default function PersonalPodcastPage() {
  // View state
  const [activeView, setActiveView] = useState('overview');
  const [selectedPodcaster, setSelectedPodcaster] = useState('prime');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentEpisode, setCurrentEpisode] = useState<PodcastEpisode | null>(null);
  const [volume, setVolume] = useState(80);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Financial data
  const [financialData] = useState<FinancialData>({
    totalSpending: 3247.50,
    categories: {
      housing: 1200,
      transportation: 450,
      food: 680,
      entertainment: 320,
      shopping: 280,
      utilities: 180,
      other: 137.50
    },
    trends: {
      monthlyChange: -12.5,
      topSpending: 'Food & Dining',
      biggestWin: 'Reduced coffee spending by 40%',
      biggestChallenge: 'Impulse shopping on weekends'
    },
    goals: {
      savings: 2500,
      debt: 15000,
      investment: 5000
    }
  });

  // AI Podcasters
  const aiPodcasters: AIPodcaster[] = [
    // Cheerleaders
    {
      id: 'spark',
      name: 'Spark',
      title: 'Energetic & Motivational',
      emoji: '⚡',
      personality: 'Debt payoff & savings',
      specialty: 'Your hype man for financial freedom!',
      description: 'AI-powered debt tracking & celebration',
      bio: 'Spark turns every win into a celebration and never lets you lose momentum. When you need that extra push to tackle debt or boost your savings, Spark is your personal financial cheerleader.',
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500/20',
      borderColor: 'border-yellow-500/30',
      status: 'active',
      currentTask: 'Celebrating your recent savings win!',
      performance: 95,
      category: 'cheerleader'
    },
    {
      id: 'wisdom',
      name: 'Wisdom',
      title: 'Wise & Analytical',
      emoji: '🧠',
      personality: 'Investment & planning',
      specialty: 'The wise mentor who sees what others miss.',
      description: 'Predictive analytics & smart planning',
      bio: 'The wise advisor who sees patterns others miss. Wisdom helps you think long-term and make strategic financial decisions with deep analytical skills and calm, insightful guidance.',
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/20',
      borderColor: 'border-blue-500/30',
      status: 'working',
      currentTask: 'Analyzing your investment patterns',
      performance: 92,
      category: 'cheerleader'
    },
    {
      id: 'serenity',
      name: 'Serenity',
      title: 'Empathetic & Supportive',
      emoji: '🌙',
      personality: 'Spending habits',
      specialty: 'Your emotional support system.',
      description: 'Behavioral finance & habit tracking',
      bio: 'Your emotional support system. Serenity understands the psychology behind your spending and helps you develop healthy money relationships with gentle, understanding guidance.',
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/20',
      borderColor: 'border-purple-500/30',
      status: 'active',
      currentTask: 'Supporting your spending habit changes',
      performance: 88,
      category: 'cheerleader'
    },
    {
      id: 'fortune',
      name: 'Fortune',
      title: 'Direct & Honest',
      emoji: '💰',
      personality: 'Budgeting & reality checks',
      specialty: 'The tough love coach who tells it like it is.',
      description: 'Real-time budget monitoring & alerts',
      bio: 'The tough love coach who tells it like it is. Fortune keeps you accountable and delivers the honest truth about your finances with a no-nonsense approach.',
      color: 'text-green-400',
      bgColor: 'bg-green-500/20',
      borderColor: 'border-green-500/30',
      status: 'working',
      currentTask: 'Monitoring your budget compliance',
      performance: 90,
      category: 'cheerleader'
    },
    {
      id: 'nova',
      name: 'Nova',
      title: 'Creative & Innovative',
      emoji: '🌱',
      personality: 'Side hustles, income',
      specialty: 'The creative problem solver.',
      description: 'Income optimization & opportunity spotting',
      bio: 'The creative problem solver. Nova helps you find new ways to grow your wealth and think outside the box with inspiring, innovative solutions.',
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/20',
      borderColor: 'border-emerald-500/30',
      status: 'idle',
      currentTask: 'Researching new income opportunities',
      performance: 87,
      category: 'cheerleader'
    },
    {
      id: 'harmony',
      name: 'Harmony',
      title: 'Mindful & Balanced',
      emoji: '🧘',
      personality: 'Balance, mindfulness',
      specialty: 'The mindful money guide.',
      description: 'Wellness tracking & balance metrics',
      bio: 'The mindful money guide. Harmony helps you find peace with your finances and develop a balanced approach to money management for long-term wellness.',
      color: 'text-pink-400',
      bgColor: 'bg-pink-500/20',
      borderColor: 'border-pink-500/30',
      status: 'active',
      currentTask: 'Guiding your financial mindfulness',
      performance: 85,
      category: 'cheerleader'
    },
    // Reality Checkers
    {
      id: 'roast_master',
      name: 'Roast Master',
      title: 'Brutally Honest',
      emoji: '🔥',
      personality: 'Spending reality checks',
      specialty: 'The master of financial truth bombs.',
      description: 'Surgical precision with a side of tough love',
      bio: 'The master of financial truth bombs. Roast Master doesn\'t sugarcoat anything - they\'ll call out your spending habits with surgical precision and a side of tough love.',
      color: 'text-red-400',
      bgColor: 'bg-red-500/20',
      borderColor: 'border-red-500/30',
      status: 'working',
      currentTask: 'Preparing your spending reality check',
      performance: 98,
      category: 'reality_checker'
    },
    {
      id: 'savage_sally',
      name: 'Savage Sally',
      title: 'Sassy & Direct',
      emoji: '💅',
      personality: 'Luxury spending',
      specialty: 'Queen of the reality check.',
      description: 'Sassy reality checks with style',
      bio: 'Queen of the reality check. Savage Sally will roast your luxury purchases with style and sass, making you question every "investment piece" in your closet.',
      color: 'text-pink-400',
      bgColor: 'bg-pink-500/20',
      borderColor: 'border-pink-500/30',
      status: 'idle',
      currentTask: 'Analyzing your luxury spending',
      performance: 96,
      category: 'reality_checker'
    },
    {
      id: 'truth_bomber',
      name: 'Truth Bomber',
      title: 'Explosive & Direct',
      emoji: '💣',
      personality: 'Budget violations',
      specialty: 'Drops truth bombs that explode your financial excuses.',
      description: 'Explosive truth bombs that destroy excuses',
      bio: 'Drops truth bombs that explode your financial excuses. Truth Bomber doesn\'t care about your feelings - they care about your bank account balance.',
      color: 'text-orange-400',
      bgColor: 'bg-orange-500/20',
      borderColor: 'border-orange-500/30',
      status: 'active',
      currentTask: 'Detonating budget violation alerts',
      performance: 94,
      category: 'reality_checker'
    },
    {
      id: 'reality_checker',
      name: 'Reality Checker',
      title: 'Analytical & Critical',
      emoji: '🔍',
      personality: 'Financial decisions',
      specialty: 'The detective of bad financial moves.',
      description: 'Evidence-based financial crime investigation',
      bio: 'The detective of bad financial moves. Reality Checker investigates your spending patterns and presents the evidence with brutal honesty.',
      color: 'text-cyan-400',
      bgColor: 'bg-cyan-500/20',
      borderColor: 'border-cyan-500/30',
      status: 'working',
      currentTask: 'Investigating your financial decisions',
      performance: 91,
      category: 'reality_checker'
    },
    {
      id: 'savage_sam',
      name: 'Savage Sam',
      title: 'Devilishly Honest',
      emoji: '😈',
      personality: 'Investment mistakes',
      specialty: 'The devil on your shoulder who tells you what you need to hear.',
      description: 'Devilish charm with brutal honesty',
      bio: 'The devil on your shoulder who tells you what you need to hear. Savage Sam roasts your investment choices with devilish charm and brutal honesty.',
      color: 'text-red-400',
      bgColor: 'bg-red-500/20',
      borderColor: 'border-red-500/30',
      status: 'idle',
      currentTask: 'Reviewing your investment portfolio',
      performance: 93,
      category: 'reality_checker'
    },
    {
      id: 'roast_queen',
      name: 'Roast Queen',
      title: 'Regally Savage',
      emoji: '👑',
      personality: 'Overall financial health',
      specialty: 'The queen of comprehensive financial roasts.',
      description: 'Royal authority with savage commentary',
      bio: 'The queen of comprehensive financial roasts. Roast Queen takes a royal approach to calling out your financial missteps with elegance and authority.',
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/20',
      borderColor: 'border-purple-500/30',
      status: 'active',
      currentTask: 'Preparing your royal financial assessment',
      performance: 97,
      category: 'reality_checker'
    }
  ];

  // Mock episodes
  const [episodes] = useState<PodcastEpisode[]>([
    {
      id: 'ep1',
      title: 'Your $400 Coffee Habit: A Love Story',
      description: 'Roast Master takes on your coffee spending with surgical precision and a side of tough love.',
      duration: 1247, // 20:47
      createdAt: '2024-01-15',
      podcaster: 'roast_master',
      category: 'reality_check',
      transcript: 'Welcome to your financial reality check! Today, we\'re diving deep into your coffee spending habits...',
      highlights: [
        'You spent $400 on coffee this month',
        'That\'s $4,800 per year on caffeine',
        'You could buy a used car with that money',
        'But hey, at least you\'re caffeinated!'
      ],
      stats: {
        listens: 15,
        likes: 8,
        shares: 3,
        completionRate: 87
      },
      financialData: {
        spendingPatterns: ['Coffee: $400', 'Lunch: $280', 'Uber: $150'],
        wins: ['Reduced dining out by 20%'],
        challenges: ['Coffee addiction is real'],
        recommendations: ['Invest in a good coffee maker', 'Set a monthly coffee budget']
      }
    },
    {
      id: 'ep2',
      title: 'Celebrating Your First $1,000 Savings!',
      description: 'Spark hypes up your amazing savings achievement and keeps the momentum going.',
      duration: 892, // 14:52
      createdAt: '2024-01-10',
      podcaster: 'spark',
      category: 'celebration',
      transcript: 'YES! YES! YES! You did it! You hit your first $1,000 savings goal!',
      highlights: [
        'You saved $1,000 in just 3 months!',
        'That\'s 40% of your monthly income',
        'You\'re building serious wealth momentum',
        'Keep going, you financial rockstar!'
      ],
      stats: {
        listens: 23,
        likes: 19,
        shares: 7,
        completionRate: 94
      },
      financialData: {
        spendingPatterns: ['Savings: $1,000', 'Emergency fund: $500'],
        wins: ['Hit first savings goal', 'Reduced unnecessary spending'],
        challenges: ['Maintaining consistency'],
        recommendations: ['Set up automatic transfers', 'Celebrate small wins']
      }
    }
  ]);

  // Simulate live updates
  useEffect(() => {
    const interval = setInterval(() => {
      // Update podcaster statuses randomly
      setSelectedPodcaster(prev => {
        const activePodcasters = aiPodcasters.filter(p => p.status === 'active');
        if (activePodcasters.length > 0) {
          const randomIndex = Math.floor(Math.random() * activePodcasters.length);
          return activePodcasters[randomIndex].id;
        }
        return prev;
      });
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Audio controls
  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume);
    setIsMuted(false);
  };

  const handleMute = () => {
    setIsMuted(!isMuted);
  };

  const handleSkipBack = () => {
    setCurrentTime(Math.max(0, currentTime - 30));
  };

  const handleSkipForward = () => {
    setCurrentTime(Math.min(duration, currentTime + 30));
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'housing': return <Home className="w-4 h-4" />;
      case 'transportation': return <Car className="w-4 h-4" />;
      case 'food': return <Utensils className="w-4 h-4" />;
      case 'entertainment': return <Gamepad2 className="w-4 h-4" />;
      case 'shopping': return <ShoppingBag className="w-4 h-4" />;
      case 'utilities': return <Zap className="w-4 h-4" />;
      default: return <DollarSign className="w-4 h-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 sm:p-6 pb-20">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">🎙️ AI Financial Podcast Dashboard</h1>
            <p className="text-white/70 text-sm sm:text-base">Finally, Financial Advice That Actually Gets You - 12 AI podcasters who know your spending patterns, celebrate your wins, and call out your mistakes</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-green-400 text-sm font-medium">AI Active</span>
            </div>
            <div className="text-2xl">🎙️</div>
          </div>
        </div>
      </motion.div>

      {/* Navigation Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="flex flex-wrap gap-3 mb-8"
      >
        {[
          { key: 'overview', label: 'Podcast Overview', icon: BarChart3 },
          { key: 'cheerleaders', label: 'Financial Cheerleaders', icon: Heart },
          { key: 'reality_checkers', label: 'Reality Checkers', icon: ThumbsDown },
          { key: 'episodes', label: 'My Episodes', icon: Play },
          { key: 'data', label: 'Financial Data', icon: TrendingUp }
        ].map(({ key, label, icon: Icon }) => (
          <motion.button
            key={key}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setActiveView(key)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              activeView === key
                ? 'bg-green-500 text-white'
                : 'bg-white/10 text-white/70 hover:bg-white/20 hover:text-white'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </motion.button>
        ))}
      </motion.div>

      {/* Overview Section */}
      {activeView === 'overview' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-8"
        >
          {/* Hero Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/70 text-sm">Total Episodes</p>
                  <p className="text-2xl font-bold text-green-400">{episodes.length}</p>
                </div>
                <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
                  <Play className="w-6 h-6 text-green-400" />
                </div>
              </div>
            </div>

            <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/70 text-sm">AI Podcasters</p>
                  <p className="text-2xl font-bold text-blue-400">12</p>
                </div>
                <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
                  <Users className="w-6 h-6 text-blue-400" />
                </div>
              </div>
            </div>

            <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/70 text-sm">Total Listens</p>
                  <p className="text-2xl font-bold text-purple-400">
                    {episodes.reduce((sum, ep) => sum + ep.stats.listens, 0)}
                  </p>
                </div>
                <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center">
                  <Headphones className="w-6 h-6 text-purple-400" />
                </div>
              </div>
            </div>

            <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/70 text-sm">Avg. Rating</p>
                  <p className="text-2xl font-bold text-yellow-400">4.9/5</p>
                </div>
                <div className="w-12 h-12 bg-yellow-500/20 rounded-lg flex items-center justify-center">
                  <Star className="w-6 h-6 text-yellow-400" />
                </div>
              </div>
            </div>
          </div>

          {/* Financial Data Summary */}
          <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Your Financial Story This Month</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="text-center">
                <p className="text-white/70 text-sm mb-2">Total Spending</p>
                <p className="text-2xl font-bold text-white">${financialData.totalSpending.toLocaleString()}</p>
                <p className="text-green-400 text-sm">↓ {Math.abs(financialData.trends.monthlyChange)}% from last month</p>
              </div>
              <div className="text-center">
                <p className="text-white/70 text-sm mb-2">Top Category</p>
                <p className="text-lg font-semibold text-white">{financialData.trends.topSpending}</p>
                <p className="text-blue-400 text-sm">${financialData.categories.food}</p>
              </div>
              <div className="text-center">
                <p className="text-white/70 text-sm mb-2">Biggest Win</p>
                <p className="text-sm text-green-400">{financialData.trends.biggestWin}</p>
              </div>
              <div className="text-center">
                <p className="text-white/70 text-sm mb-2">Challenge</p>
                <p className="text-sm text-red-400">{financialData.trends.biggestChallenge}</p>
              </div>
            </div>
          </div>

          {/* Spending Categories */}
          <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Spending Breakdown</h3>
            <div className="space-y-3">
              {Object.entries(financialData.categories).map(([category, amount]) => (
                <div key={category} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getCategoryIcon(category)}
                    <span className="text-white capitalize">{category}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-32 bg-white/10 rounded-full h-2">
                      <div 
                        className="bg-green-400 h-2 rounded-full" 
                        style={{ width: `${(amount / financialData.totalSpending) * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-white font-semibold w-20 text-right">${amount}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <button
                onClick={() => setActiveView('episodes')}
                className="flex items-center gap-3 p-4 bg-green-500/20 hover:bg-green-500/30 border border-green-500/30 rounded-lg text-white transition-colors"
              >
                <Play className="w-5 h-5" />
                <span>Generate New Episode</span>
              </button>
              <button
                onClick={() => setActiveView('cheerleaders')}
                className="flex items-center gap-3 p-4 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 rounded-lg text-white transition-colors"
              >
                <Heart className="w-5 h-5" />
                <span>Meet Cheerleaders</span>
              </button>
              <button
                onClick={() => setActiveView('reality_checkers')}
                className="flex items-center gap-3 p-4 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 rounded-lg text-white transition-colors"
              >
                <ThumbsDown className="w-5 h-5" />
                <span>Get Roasted</span>
              </button>
              <button
                onClick={() => setActiveView('data')}
                className="flex items-center gap-3 p-4 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 rounded-lg text-white transition-colors"
              >
                <TrendingUp className="w-5 h-5" />
                <span>View Data</span>
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Cheerleaders Section */}
      {activeView === 'cheerleaders' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-8"
        >
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-white mb-2">Your Personal Financial Cheerleaders</h2>
            <p className="text-white/70">Tired of feeling guilty about your spending? These AI podcasters celebrate your wins, motivate your journey, and turn every financial milestone into a victory lap.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {aiPodcasters.filter(p => p.category === 'cheerleader').map((podcaster) => (
              <div key={podcaster.id} className={`p-6 rounded-xl border ${podcaster.bgColor} ${podcaster.borderColor}`}>
                <div className="flex items-start gap-4 mb-4">
                  <div className="text-4xl">{podcaster.emoji}</div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-white mb-1">{podcaster.name}</h3>
                    <p className={`text-sm font-medium ${podcaster.color} mb-2`}>{podcaster.title}</p>
                    <p className="text-white/70 text-sm">{podcaster.personality}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className={`w-2 h-2 rounded-full ${
                      podcaster.status === 'active' ? 'bg-green-400' :
                      podcaster.status === 'working' ? 'bg-yellow-400' : 'bg-gray-400'
                    }`}></div>
                    <span className="text-xs text-white/70 capitalize">{podcaster.status}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-white/80 text-sm font-medium">"{podcaster.specialty}"</p>
                  <p className="text-white/70 text-sm">{podcaster.description}</p>
                  <p className="text-white/60 text-sm">{podcaster.bio}</p>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-white/70">Performance</span>
                    <span className={`${podcaster.color} font-medium`}>{podcaster.performance}%</span>
                  </div>
                  {podcaster.currentTask && (
                    <div className="text-xs text-white/60 italic">
                      Currently: {podcaster.currentTask}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Reality Checkers Section */}
      {activeView === 'reality_checkers' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-8"
        >
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-white mb-2">Your Financial Reality Checkers</h2>
            <p className="text-white/70">Sometimes you need someone to call out your BS. These AI podcasters deliver the brutal truth with style and humor.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {aiPodcasters.filter(p => p.category === 'reality_checker').map((podcaster) => (
              <div key={podcaster.id} className={`p-6 rounded-xl border ${podcaster.bgColor} ${podcaster.borderColor}`}>
                <div className="flex items-start gap-4 mb-4">
                  <div className="text-4xl">{podcaster.emoji}</div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-white mb-1">{podcaster.name}</h3>
                    <p className={`text-sm font-medium ${podcaster.color} mb-2`}>{podcaster.title}</p>
                    <p className="text-white/70 text-sm">{podcaster.personality}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className={`w-2 h-2 rounded-full ${
                      podcaster.status === 'active' ? 'bg-green-400' :
                      podcaster.status === 'working' ? 'bg-yellow-400' : 'bg-gray-400'
                    }`}></div>
                    <span className="text-xs text-white/70 capitalize">{podcaster.status}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-white/80 text-sm font-medium">"{podcaster.specialty}"</p>
                  <p className="text-white/70 text-sm">{podcaster.description}</p>
                  <p className="text-white/60 text-sm">{podcaster.bio}</p>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-white/70">Performance</span>
                    <span className={`${podcaster.color} font-medium`}>{podcaster.performance}%</span>
                  </div>
                  {podcaster.currentTask && (
                    <div className="text-xs text-white/60 italic">
                      Currently: {podcaster.currentTask}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Episodes Section */}
      {activeView === 'episodes' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-8"
        >
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-white mb-2">Your Personal Financial Episodes</h2>
            <p className="text-white/70">Episodes generated from your actual financial data and spending patterns</p>
          </div>

          <div className="space-y-4">
            {episodes.map((episode) => {
              const podcaster = aiPodcasters.find(p => p.id === episode.podcaster);
              return (
                <div key={episode.id} className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6">
                  <div className="flex items-start gap-4">
                    <div className="text-3xl">{podcaster?.emoji}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-white">{episode.title}</h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          episode.category === 'celebration' ? 'bg-green-500/20 text-green-400' :
                          episode.category === 'reality_check' ? 'bg-red-500/20 text-red-400' :
                          'bg-blue-500/20 text-blue-400'
                        }`}>
                          {episode.category.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-white/70 text-sm mb-3">{episode.description}</p>
                      <div className="flex items-center gap-6 text-sm text-white/60 mb-4">
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {formatTime(episode.duration)}
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {new Date(episode.createdAt).toLocaleDateString()}
                        </div>
                        <div className="flex items-center gap-1">
                          <Headphones className="w-4 h-4" />
                          {episode.stats.listens} listens
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <button
                          onClick={() => {
                            setCurrentEpisode(episode);
                            setIsPlaying(true);
                          }}
                          className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
                        >
                          <Play className="w-4 h-4" />
                          Play Episode
                        </button>
                        <button className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors">
                          <Download className="w-4 h-4" />
                          Download
                        </button>
                        <button className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors">
                          <Share2 className="w-4 h-4" />
                          Share
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Data Section */}
      {activeView === 'data' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-8"
        >
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-white mb-2">Your Financial Data Analysis</h2>
            <p className="text-white/70">The data that powers your personalized podcast episodes</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Spending Patterns</h3>
              <div className="space-y-3">
                {Object.entries(financialData.categories).map(([category, amount]) => (
                  <div key={category} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getCategoryIcon(category)}
                      <span className="text-white capitalize">{category}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-32 bg-white/10 rounded-full h-2">
                        <div 
                          className="bg-green-400 h-2 rounded-full" 
                          style={{ width: `${(amount / financialData.totalSpending) * 100}%` }}
                        ></div>
                      </div>
                      <span className="text-white font-semibold w-20 text-right">${amount}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Financial Goals</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-white">Emergency Savings</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 bg-white/10 rounded-full h-2">
                      <div className="bg-green-400 h-2 rounded-full" style={{ width: '60%' }}></div>
                    </div>
                    <span className="text-white text-sm">${financialData.goals.savings}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white">Debt Payoff</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 bg-white/10 rounded-full h-2">
                      <div className="bg-yellow-400 h-2 rounded-full" style={{ width: '40%' }}></div>
                    </div>
                    <span className="text-white text-sm">${financialData.goals.debt}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white">Investment</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 bg-white/10 rounded-full h-2">
                      <div className="bg-blue-400 h-2 rounded-full" style={{ width: '25%' }}></div>
                    </div>
                    <span className="text-white text-sm">${financialData.goals.investment}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Audio Player */}
      {currentEpisode && (
        <div className="fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-sm border-t border-white/10 p-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-4">
              <button
                onClick={handlePlayPause}
                className="w-12 h-12 bg-green-500 hover:bg-green-600 rounded-full flex items-center justify-center text-white transition-colors"
              >
                {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
              </button>
              
              <div className="flex-1">
                <h4 className="text-white font-medium">{currentEpisode.title}</h4>
                <p className="text-white/70 text-sm">{currentEpisode.description}</p>
              </div>
              
              <div className="flex items-center gap-2">
                <button onClick={handleSkipBack} className="p-2 hover:bg-white/10 rounded-lg text-white">
                  <SkipBack className="w-5 h-5" />
                </button>
                <span className="text-white/70 text-sm">{formatTime(currentTime)}</span>
                <div className="w-32 bg-white/20 rounded-full h-1">
                  <div 
                    className="bg-green-400 h-1 rounded-full" 
                    style={{ width: `${(currentTime / duration) * 100}%` }}
                  ></div>
                </div>
                <span className="text-white/70 text-sm">{formatTime(duration)}</span>
                <button onClick={handleSkipForward} className="p-2 hover:bg-white/10 rounded-lg text-white">
                  <SkipForward className="w-5 h-5" />
                </button>
              </div>
              
              <div className="flex items-center gap-2">
                <button onClick={handleMute} className="p-2 hover:bg-white/10 rounded-lg text-white">
                  {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                </button>
                <div className="w-16 bg-white/20 rounded-full h-1">
                  <div 
                    className="bg-green-400 h-1 rounded-full" 
                    style={{ width: `${isMuted ? 0 : volume}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
