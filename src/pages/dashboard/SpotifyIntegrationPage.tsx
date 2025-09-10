import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  Music, 
  Play, 
  Pause, 
  Volume2, 
  Send, 
  Loader2,
  Headphones,
  Heart,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Clock,
  Users,
  Share2,
  Download,
  Edit3,
  Plus,
  Settings,
  Calendar,
  Star,
  MessageCircle,
  Bookmark,
  Zap,
  Target,
  BarChart3,
  Activity,
  Eye,
  Lightbulb,
  Crown,
  Sparkles,
  CheckCircle,
  AlertTriangle,
  Moon,
  Sun,
  Coffee,
  BookOpen,
  Shield,
  RefreshCw,
  ExternalLink,
  Spotify
} from 'lucide-react';

// AI Music Curator Interfaces
interface AIMusicCurator {
  id: string;
  name: string;
  title: string;
  emoji: string;
  specialty: string;
  superpower: string;
  description: string;
  bio: string;
  color: string;
  bgColor: string;
  borderColor: string;
  status: 'active' | 'working' | 'idle';
  currentTask?: string;
  performance: number;
}

interface Playlist {
  id: string;
  title: string;
  description: string;
  tracks: number;
  duration: string;
  mood: string;
  type: 'financial_focus' | 'budget_planning' | 'investment_confidence' | 'debt_freedom' | 'savings_motivation' | 'financial_education';
  status: 'active' | 'draft' | 'archived';
  spotifyUrl?: string;
  coverImage?: string;
  stats: {
    plays: number;
    likes: number;
    shares: number;
    completionRate: number;
  };
  aiInsights: {
    moodEnhancement: number;
    productivityBoost: number;
    focusImprovement: number;
    motivationLevel: number;
  };
}

interface MusicMetrics {
  playlistsCreated: number;
  totalPlays: number;
  userSatisfaction: number;
  productivityBoost: number;
  moodImprovement: number;
  focusEnhancement: number;
  timeSaved: number;
  spotifyConnected: boolean;
}

export default function SpotifyIntegrationPage() {
  // View state
  const [activeView, setActiveView] = useState('overview');
  const [selectedCurator, setSelectedCurator] = useState('prime');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentPlaylist, setCurrentPlaylist] = useState<Playlist | null>(null);
  const [volume, setVolume] = useState(80);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Chat state
  const [messages, setMessages] = useState([
    {
      role: 'ai',
      content: "🎵 Welcome to your AI Music Curator Studio! I'm Prime, your AI Music Director. I analyze your spending patterns and creates the perfect soundtrack for every financial moment - from budget planning to investment decisions. No more random playlists - just music that actually enhances your financial productivity! What financial moment would you like to soundtrack today?",
      timestamp: new Date().toISOString(),
      curator: 'prime'
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Music metrics
  const [musicMetrics] = useState<MusicMetrics>({
    playlistsCreated: 8,
    totalPlays: 1247,
    userSatisfaction: 94,
    productivityBoost: 3.2,
    moodImprovement: 87,
    focusEnhancement: 78,
    timeSaved: 12,
    spotifyConnected: true
  });

  // AI Music Curator Team
  const musicCurators: AIMusicCurator[] = [
    {
      id: 'prime',
      name: 'Prime',
      title: 'AI Music Director & Orchestrator',
      emoji: '👑',
      specialty: 'Orchestrates perfect music for every financial moment',
      superpower: 'Creates the perfect soundtrack for every financial task',
      description: 'Your AI music director who orchestrates perfect music for every financial moment.',
      bio: 'Prime uses advanced AI to analyze your financial tasks and creates the perfect soundtrack for every money moment. He coordinates all music curation and ensures maximum productivity enhancement.',
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/20',
      borderColor: 'border-purple-500/30',
      status: 'active',
      currentTask: 'Analyzing your financial mood',
      performance: 98
    },
    {
      id: 'crystal',
      name: 'Crystal',
      title: 'Emotional Music Intelligence',
      emoji: '💎',
      specialty: 'Matches music to your financial emotions and goals',
      superpower: 'Understands your emotional relationship with money and curates music that supports your financial wellness',
      description: 'Your emotional music intelligence specialist who matches music to your financial emotions and goals.',
      bio: 'Crystal specializes in understanding your emotional relationship with money and curating music that supports your financial wellness. She creates playlists that enhance your mood and decision-making.',
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/20',
      borderColor: 'border-blue-500/30',
      status: 'working',
      currentTask: 'Creating your mood playlist',
      performance: 95
    },
    {
      id: 'finley',
      name: 'Finley',
      title: 'Financial Focus Music Curator',
      emoji: '💰',
      specialty: 'Creates playlists that enhance financial productivity',
      superpower: 'Creates playlists scientifically designed to boost focus and concentration during financial tasks',
      description: 'Your financial focus music curator who creates playlists that enhance financial productivity.',
      bio: 'Finley creates playlists scientifically designed to boost focus and concentration during financial tasks. He understands how different music affects your financial decision-making and productivity.',
      color: 'text-green-400',
      bgColor: 'bg-green-500/20',
      borderColor: 'border-green-500/30',
      status: 'active',
      currentTask: 'Optimizing your focus playlist',
      performance: 92
    },
    {
      id: 'nova',
      name: 'Nova',
      title: 'Creative Music Innovation',
      emoji: '🌱',
      specialty: 'Discovers new music trends and innovative soundscapes',
      superpower: 'Discovers new music trends and innovative soundscapes to keep your financial soundtrack fresh',
      description: 'Your creative music innovation specialist who discovers new music trends and innovative soundscapes.',
      bio: 'Nova discovers new music trends and innovative soundscapes to keep your financial soundtrack fresh. She explores new genres and artists that can enhance your financial productivity.',
      color: 'text-orange-400',
      bgColor: 'bg-orange-500/20',
      borderColor: 'border-orange-500/30',
      status: 'working',
      currentTask: 'Discovering new trends',
      performance: 88
    }
  ];

  // Mock playlists
  const [playlists] = useState<Playlist[]>([
    {
      id: 'playlist1',
      title: 'Financial Focus Flow',
      description: 'High-energy tracks for budget planning and financial decision-making',
      tracks: 24,
      duration: '1h 32m',
      mood: 'Focused',
      type: 'financial_focus',
      status: 'active',
      spotifyUrl: 'https://open.spotify.com/playlist/example1',
      coverImage: '/api/placeholder/300/300',
      stats: {
        plays: 156,
        likes: 89,
        shares: 23,
        completionRate: 94
      },
      aiInsights: {
        moodEnhancement: 87,
        productivityBoost: 92,
        focusImprovement: 89,
        motivationLevel: 85
      }
    },
    {
      id: 'playlist2',
      title: 'Budget Planning Beats',
      description: 'Calm, focused music for thoughtful financial planning sessions',
      tracks: 18,
      duration: '1h 15m',
      mood: 'Calm',
      type: 'budget_planning',
      status: 'active',
      spotifyUrl: 'https://open.spotify.com/playlist/example2',
      coverImage: '/api/placeholder/300/300',
      stats: {
        plays: 98,
        likes: 67,
        shares: 15,
        completionRate: 91
      },
      aiInsights: {
        moodEnhancement: 78,
        productivityBoost: 85,
        focusImprovement: 92,
        motivationLevel: 72
      }
    },
    {
      id: 'playlist3',
      title: 'Investment Confidence',
      description: 'Empowering tracks for investment decisions and wealth building',
      tracks: 22,
      duration: '1h 45m',
      mood: 'Confident',
      type: 'investment_confidence',
      status: 'active',
      spotifyUrl: 'https://open.spotify.com/playlist/example3',
      coverImage: '/api/placeholder/300/300',
      stats: {
        plays: 134,
        likes: 78,
        shares: 19,
        completionRate: 88
      },
      aiInsights: {
        moodEnhancement: 92,
        productivityBoost: 78,
        focusImprovement: 85,
        motivationLevel: 94
      }
    },
    {
      id: 'playlist4',
      title: 'Debt Freedom Anthems',
      description: 'Motivational tracks for your debt-free journey',
      tracks: 31,
      duration: '2h 8m',
      mood: 'Empowered',
      type: 'debt_freedom',
      status: 'active',
      spotifyUrl: 'https://open.spotify.com/playlist/example4',
      coverImage: '/api/placeholder/300/300',
      stats: {
        plays: 89,
        likes: 56,
        shares: 12,
        completionRate: 86
      },
      aiInsights: {
        moodEnhancement: 95,
        productivityBoost: 82,
        focusImprovement: 78,
        motivationLevel: 97
      }
    }
  ]);

  // Simulate live updates
  useEffect(() => {
    const interval = setInterval(() => {
      // Update curator statuses randomly
      setSelectedCurator(prev => {
        const activeCurators = musicCurators.filter(c => c.status === 'active');
        if (activeCurators.length > 0) {
          const randomIndex = Math.floor(Math.random() * activeCurators.length);
          return activeCurators[randomIndex].id;
        }
        return prev;
      });
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Auto-scroll chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Send message function
  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return;

    const userMessage = {
      role: 'user',
      content: content.trim(),
      timestamp: new Date().toISOString(),
      curator: selectedCurator
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    setTimeout(() => {
      const query = content.toLowerCase();
      let curatorResponse = '';

      if (selectedCurator === 'prime') {
        if (query.includes('playlist') || query.includes('music') || query.includes('spotify')) {
          curatorResponse = `👑 **Prime - AI Music Director**

I'm excited to create the perfect soundtrack for your financial journey! Let me analyze your current mood and financial tasks to curate the ideal playlist.

**Current Analysis:**
• Playlists Created: ${musicMetrics.playlistsCreated}
• Total Plays: ${musicMetrics.totalPlays}
• User Satisfaction: ${musicMetrics.userSatisfaction}%
• Productivity Boost: ${musicMetrics.productivityBoost}x
• Mood Improvement: ${musicMetrics.moodImprovement}%

**Available Playlist Types:**
1. **Financial Focus Flow** - High-energy tracks for budget planning
2. **Budget Planning Beats** - Calm, focused music for financial planning
3. **Investment Confidence** - Empowering tracks for investment decisions
4. **Debt Freedom Anthems** - Motivational tracks for debt payoff
5. **Savings Motivation** - Inspiring music for building wealth
6. **Financial Education** - Thoughtful tracks for learning about money

**AI-Generated Recommendations:**
Based on your financial patterns, I recommend starting with "Financial Focus Flow" - it's designed to boost your productivity by 92% and enhance your focus by 89%.

**Let me create the perfect soundtrack for your financial success!** 👑🎵`;
        } else {
          curatorResponse = `👑 **Prime - AI Music Director**

I'm your AI Music Director, orchestrating the perfect soundtrack for every financial moment. I analyze your spending patterns and create music that actually enhances your financial productivity.

**My Specialties:**
• **Strategic Music Planning** - Perfect soundtrack for every financial task
• **AI Mood Analysis** - Understanding your emotional relationship with money
• **Productivity Enhancement** - Music that boosts focus and concentration
• **Progress Optimization** - Maximizing your financial productivity through music

**Current Music Status:**
• Playlists Created: ${musicMetrics.playlistsCreated}
• Total Plays: ${musicMetrics.totalPlays}
• User Satisfaction: ${musicMetrics.userSatisfaction}%
• Productivity Boost: ${musicMetrics.productivityBoost}x
• Time Saved: ${musicMetrics.timeSaved} hours

**How I Can Help:**
• Create personalized playlists for every financial task
• Analyze your mood-spending correlations through music
• Generate music-based productivity insights
• Set up seamless Spotify integration
• Track how music affects your financial decisions
• Optimize your financial soundtrack for maximum success

**Let me help you create the perfect soundtrack for your financial journey!** 👑🎵`;
        }
      } else if (selectedCurator === 'crystal') {
        curatorResponse = `💎 **Crystal - Emotional Music Intelligence**

Hello! I'm Crystal, your Emotional Music Intelligence specialist. I understand your emotional relationship with money and curate music that supports your financial wellness.

**My Specialties:**
• **Emotional Music Matching** - Music that matches your financial emotions
• **Mood Enhancement** - Playlists that improve your emotional state
• **Decision Support** - Music that helps you make better financial choices
• **Wellness Integration** - Music that supports your overall financial wellness

**Current Emotional Analysis:**
• Mood Improvement: ${musicMetrics.moodImprovement}%
• Focus Enhancement: ${musicMetrics.focusEnhancement}%
• Productivity Boost: ${musicMetrics.productivityBoost}x
• User Satisfaction: ${musicMetrics.userSatisfaction}%

**Available Mood Playlists:**
1. **Calm & Focused** - For thoughtful financial planning
2. **Motivated & Driven** - For working toward financial goals
3. **Confident & Successful** - For investment decisions
4. **Reflective & Planning** - For reviewing finances and setting goals
5. **Celebration** - For financial wins and milestones

**AI-Generated Mood Insights:**
I'm analyzing your current emotional state and will create a personalized playlist that enhances your mood and supports your financial decisions.

**Let me create music that understands your financial emotions!** 💎🎵`;
      } else if (selectedCurator === 'finley') {
        curatorResponse = `💰 **Finley - Financial Focus Music Curator**

Greetings! I'm Finley, your Financial Focus Music Curator. I create playlists scientifically designed to boost focus and concentration during financial tasks.

**My Specialties:**
• **Focus Enhancement** - Music that improves concentration during financial tasks
• **Productivity Optimization** - Playlists that boost financial productivity
• **Task-Specific Music** - Different music for different financial activities
• **Performance Tracking** - Monitor how music affects your financial performance

**Current Focus Analysis:**
• Focus Improvement: ${musicMetrics.focusEnhancement}%
• Productivity Boost: ${musicMetrics.productivityBoost}x
• Time Saved: ${musicMetrics.timeSaved} hours
• Completion Rate: 94%

**Available Focus Playlists:**
1. **Deep Focus** - For complex financial analysis and planning
2. **Quick Tasks** - For routine financial tasks and updates
3. **Learning Mode** - For financial education and research
4. **Decision Time** - For important financial decisions
5. **Review Session** - For monthly and quarterly financial reviews

**AI-Generated Focus Plan:**
I'm creating a personalized focus enhancement program that will boost your financial productivity by 3.2x and save you 12 hours monthly.

**Let me help you focus and excel at every financial task!** 💰🎵`;
      } else if (selectedCurator === 'nova') {
        curatorResponse = `🌱 **Nova - Creative Music Innovation**

Hello! I'm Nova, your Creative Music Innovation specialist. I discover new music trends and innovative soundscapes to keep your financial soundtrack fresh and exciting.

**My Specialties:**
• **Trend Discovery** - New music trends and innovative soundscapes
• **Genre Exploration** - Exploring new genres that enhance financial productivity
• **Creative Curation** - Unique playlists that stand out from the ordinary
• **Innovation Integration** - Incorporating cutting-edge music into your financial routine

**Current Innovation Analysis:**
• New Genres Discovered: 47
• Innovation Score: 88%
• Trend Accuracy: 92%
• User Engagement: 94%

**Available Innovation Playlists:**
1. **Future Sounds** - Cutting-edge music for forward-thinking financial planning
2. **Global Beats** - International music for diverse financial perspectives
3. **Underground Gems** - Hidden musical treasures for unique financial insights
4. **Experimental Vibes** - Avant-garde music for creative financial thinking
5. **Cultural Fusion** - Blended genres for holistic financial understanding

**AI-Generated Innovation Plan:**
I'm exploring new musical territories that will revolutionize how you experience financial productivity and bring fresh energy to your money management.

**Let me discover the next big sound for your financial success!** 🌱🎵`;
      }

      const aiMessage = {
        role: 'ai',
        content: curatorResponse,
        timestamp: new Date().toISOString(),
        curator: selectedCurator
      };
      setMessages(prev => [...prev, aiMessage]);
      setIsLoading(false);
    }, 1500);
  };

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

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getPlaylistIcon = (type: string) => {
    switch (type) {
      case 'financial_focus': return <Target className="w-5 h-5 text-purple-400" />;
      case 'budget_planning': return <BarChart3 className="w-5 h-5 text-blue-400" />;
      case 'investment_confidence': return <TrendingUp className="w-5 h-5 text-green-400" />;
      case 'debt_freedom': return <Zap className="w-5 h-5 text-orange-400" />;
      case 'savings_motivation': return <Heart className="w-5 h-5 text-pink-400" />;
      case 'financial_education': return <BookOpen className="w-5 h-5 text-indigo-400" />;
      default: return <Music className="w-5 h-5 text-purple-400" />;
    }
  };

  const getPlaylistColor = (type: string) => {
    switch (type) {
      case 'financial_focus': return 'text-purple-400 bg-purple-500/20';
      case 'budget_planning': return 'text-blue-400 bg-blue-500/20';
      case 'investment_confidence': return 'text-green-400 bg-green-500/20';
      case 'debt_freedom': return 'text-orange-400 bg-orange-500/20';
      case 'savings_motivation': return 'text-pink-400 bg-pink-500/20';
      case 'financial_education': return 'text-indigo-400 bg-indigo-500/20';
      default: return 'text-purple-400 bg-purple-500/20';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-green-900 to-slate-900 p-4 sm:p-6 pb-20">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">🎵 AI Spotify Integration</h1>
            <p className="text-white/70 text-sm sm:text-base">Finally, Music That Actually Gets Your Money - AI analyzes your spending patterns and creates the perfect soundtrack for every financial moment</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-green-400 text-sm font-medium">AI Active</span>
            </div>
            <div className="text-2xl">🎵</div>
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
          { key: 'overview', label: 'Music Overview', icon: BarChart3 },
          { key: 'team', label: 'AI Music Team', icon: Users },
          { key: 'playlists', label: 'My Playlists', icon: Music },
          { key: 'mood', label: 'Mood Analysis', icon: Heart },
          { key: 'focus', label: 'Focus Music', icon: Target },
          { key: 'trends', label: 'Music Trends', icon: TrendingUp },
          { key: 'chat', label: 'AI Chat', icon: MessageCircle }
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
          {/* Music Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/70 text-sm">Playlists Created</p>
                  <p className="text-2xl font-bold text-green-400">{musicMetrics.playlistsCreated}</p>
                </div>
                <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
                  <Music className="w-6 h-6 text-green-400" />
                </div>
              </div>
            </div>

            <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/70 text-sm">Total Plays</p>
                  <p className="text-2xl font-bold text-blue-400">{musicMetrics.totalPlays.toLocaleString()}</p>
                </div>
                <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
                  <Play className="w-6 h-6 text-blue-400" />
                </div>
              </div>
            </div>

            <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/70 text-sm">User Satisfaction</p>
                  <p className="text-2xl font-bold text-purple-400">{musicMetrics.userSatisfaction}%</p>
                </div>
                <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center">
                  <Star className="w-6 h-6 text-purple-400" />
                </div>
              </div>
            </div>

            <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/70 text-sm">Productivity Boost</p>
                  <p className="text-2xl font-bold text-orange-400">{musicMetrics.productivityBoost}x</p>
                </div>
                <div className="w-12 h-12 bg-orange-500/20 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-orange-400" />
                </div>
              </div>
            </div>
          </div>

          {/* AI Music Team Overview */}
          <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Your Personal AI Music Curators</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {musicCurators.map((curator) => (
                <div key={curator.id} className={`p-4 rounded-lg border ${curator.bgColor} ${curator.borderColor}`}>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="text-2xl">{curator.emoji}</div>
                    <div>
                      <h4 className="text-white font-medium">{curator.name}</h4>
                      <p className={`text-xs ${curator.color}`}>{curator.title}</p>
                    </div>
                  </div>
                  <p className="text-white/70 text-sm">{curator.specialty}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <button
                onClick={() => setActiveView('playlists')}
                className="flex items-center gap-3 p-4 bg-green-500/20 hover:bg-green-500/30 border border-green-500/30 rounded-lg text-white transition-colors"
              >
                <Music className="w-5 h-5" />
                <span>Create Playlist</span>
              </button>
              <button
                onClick={() => setActiveView('mood')}
                className="flex items-center gap-3 p-4 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 rounded-lg text-white transition-colors"
              >
                <Heart className="w-5 h-5" />
                <span>Mood Analysis</span>
              </button>
              <button
                onClick={() => setActiveView('focus')}
                className="flex items-center gap-3 p-4 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 rounded-lg text-white transition-colors"
              >
                <Target className="w-5 h-5" />
                <span>Focus Music</span>
              </button>
              <button
                onClick={() => setActiveView('chat')}
                className="flex items-center gap-3 p-4 bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/30 rounded-lg text-white transition-colors"
              >
                <MessageCircle className="w-5 h-5" />
                <span>AI Chat</span>
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* AI Music Team Section */}
      {activeView === 'team' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-8"
        >
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-white mb-2">Your Personal AI Music Curators</h2>
            <p className="text-white/70">Meet the AI music experts who understand your financial journey and create the perfect soundtrack for every money moment</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {musicCurators.map((curator) => (
              <div key={curator.id} className={`p-6 rounded-xl border ${curator.bgColor} ${curator.borderColor}`}>
                <div className="flex items-start gap-4 mb-4">
                  <div className="text-4xl">{curator.emoji}</div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-white mb-1">{curator.name}</h3>
                    <p className={`text-sm font-medium ${curator.color} mb-2`}>{curator.title}</p>
                    <p className="text-white/70 text-sm">{curator.specialty}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className={`w-2 h-2 rounded-full ${
                      curator.status === 'active' ? 'bg-green-400' :
                      curator.status === 'working' ? 'bg-yellow-400' : 'bg-gray-400'
                    }`}></div>
                    <span className="text-xs text-white/70 capitalize">{curator.status}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-white/80 text-sm font-medium">Superpower: {curator.superpower}</p>
                  <p className="text-white/70 text-sm">{curator.description}</p>
                  <p className="text-white/60 text-sm">{curator.bio}</p>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-white/70">Performance</span>
                    <span className={`${curator.color} font-medium`}>{curator.performance}%</span>
                  </div>
                  {curator.currentTask && (
                    <div className="text-xs text-white/60 italic">
                      Currently: {curator.currentTask}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Playlists Section */}
      {activeView === 'playlists' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-8"
        >
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-white mb-2">AI-Generated Financial Playlists</h2>
            <p className="text-white/70">Personalized playlists created by AI for your unique financial tasks and moods</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {playlists.map((playlist) => (
              <div key={playlist.id} className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-blue-500 rounded-lg flex items-center justify-center">
                    <Music className="w-8 h-8 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold text-white">{playlist.title}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPlaylistColor(playlist.type)}`}>
                        {playlist.type.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-white/70 text-sm mb-3">{playlist.description}</p>
                    <div className="flex items-center gap-4 text-sm text-white/60 mb-4">
                      <div className="flex items-center gap-1">
                        <Music className="w-4 h-4" />
                        {playlist.tracks} tracks
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {playlist.duration}
                      </div>
                      <div className="flex items-center gap-1">
                        <Heart className="w-4 h-4" />
                        {playlist.mood}
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-3 mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-white/70">Plays</span>
                    <span className="text-green-400 font-medium">{playlist.stats.plays}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-white/70">Likes</span>
                    <span className="text-blue-400 font-medium">{playlist.stats.likes}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-white/70">Completion Rate</span>
                    <span className="text-purple-400 font-medium">{playlist.stats.completionRate}%</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      setCurrentPlaylist(playlist);
                      setIsPlaying(true);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
                  >
                    <Play className="w-4 h-4" />
                    Play
                  </button>
                  <button className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors">
                    <Share2 className="w-4 h-4" />
                    Share
                  </button>
                  <button className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors">
                    <ExternalLink className="w-4 h-4" />
                    Spotify
                  </button>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* AI Chat Section */}
      {activeView === 'chat' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-8"
        >
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-white mb-2">AI Chat - Choose Your Curator</h2>
            <p className="text-white/70">Chat with individual AI music curators who can help in their specific areas of expertise</p>
          </div>

          {/* AI Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {musicCurators.map((curator) => (
              <button
                key={curator.id}
                onClick={() => setSelectedCurator(curator.id)}
                className={`p-4 rounded-xl border transition-all ${
                  selectedCurator === curator.id
                    ? `${curator.bgColor} ${curator.borderColor} scale-105`
                    : 'bg-white/5 border-white/10 hover:bg-white/10'
                }`}
              >
                <div className="text-center">
                  <div className="text-3xl mb-2">{curator.emoji}</div>
                  <h3 className="text-lg font-bold text-white mb-1">{curator.name}</h3>
                  <p className={`text-sm font-medium ${curator.color} mb-2`}>{curator.specialty}</p>
                  <p className="text-white/70 text-xs">{curator.superpower}</p>
                </div>
              </button>
            ))}
          </div>

          {/* Chat Interface */}
          <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="text-3xl">{musicCurators.find(c => c.id === selectedCurator)?.emoji}</div>
              <div>
                <h3 className="text-xl font-semibold text-white">
                  Chat with {musicCurators.find(c => c.id === selectedCurator)?.name}
                </h3>
                <p className="text-white/70">
                  {musicCurators.find(c => c.id === selectedCurator)?.title}
                </p>
              </div>
            </div>

            <div className="h-96 overflow-y-auto p-4 space-y-4 bg-white/5 rounded-lg mb-4">
              {messages.filter(msg => msg.curator === selectedCurator).map((message, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    message.role === 'user'
                      ? 'bg-green-600 text-white'
                      : 'bg-white/10 text-white border border-white/20'
                  }`}>
                    <div className="whitespace-pre-wrap">{message.content}</div>
                    <div className="text-xs opacity-60 mt-2">
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                </motion.div>
              ))}

              {isLoading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex justify-start"
                >
                  <div className="bg-white/10 text-white border border-white/20 rounded-2xl px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{musicCurators.find(c => c.id === selectedCurator)?.name} is curating...</span>
                    </div>
                  </div>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !isLoading && sendMessage(input)}
                placeholder={`Share your musical preferences with ${musicCurators.find(c => c.id === selectedCurator)?.name}...`}
                className="flex-1 bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:border-green-500"
                disabled={isLoading}
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={isLoading || !input.trim()}
                className="bg-green-500 hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg px-4 py-3 transition-colors"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Audio Player */}
      {currentPlaylist && (
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
                <h4 className="text-white font-medium">{currentPlaylist.title}</h4>
                <p className="text-white/70 text-sm">{currentPlaylist.description}</p>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-white/70 text-sm">{formatTime(currentTime)}</span>
                <div className="w-32 bg-white/20 rounded-full h-1">
                  <div 
                    className="bg-green-400 h-1 rounded-full" 
                    style={{ width: `${(currentTime / duration) * 100}%` }}
                  ></div>
                </div>
                <span className="text-white/70 text-sm">{formatTime(duration)}</span>
              </div>
              
              <div className="flex items-center gap-2">
                <button onClick={handleMute} className="p-2 hover:bg-white/10 rounded-lg text-white">
                  {isMuted ? <Volume2 className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
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
