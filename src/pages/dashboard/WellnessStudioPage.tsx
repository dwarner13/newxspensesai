import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  Heart, 
  Brain, 
  Crown, 
  Leaf, 
  Send, 
  Loader2,
  BarChart3,
  MessageCircle,
  Users,
  Clock,
  Play,
  Pause,
  Volume2,
  VolumeX,
  SkipBack,
  SkipForward,
  Download,
  Share2,
  Star,
  Coffee,
  BookOpen,
  Sparkles,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  Calendar,
  Activity,
  Eye,
  Smile,
  Frown,
  Meh,
  Moon,
  Sun,
  Zap,
  Target,
  Shield,
  Lightbulb
} from 'lucide-react';

// AI Wellness Studio Interfaces
interface AIWellnessSpecialist {
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

interface WellnessSession {
  id: string;
  title: string;
  description: string;
  duration: number;
  type: 'meditation' | 'sleep_story' | 'mindfulness' | 'breathing';
  specialist: string;
  audioUrl?: string;
  transcript: string;
  highlights: string[];
  stats: {
    listens: number;
    likes: number;
    shares: number;
    completionRate: number;
  };
  aiInsights: {
    stressReduction: number;
    sleepImprovement: number;
    mindfulnessGain: number;
    emotionalSupport: number;
  };
}

interface WellnessMetrics {
  stressLevel: number;
  sleepQuality: number;
  mindfulnessScore: number;
  emotionalBalance: number;
  anxietyReduction: number;
  timeSaved: number;
  sessionsCompleted: number;
  totalMinutes: number;
}

export default function WellnessStudioPage() {
  // View state
  const [activeView, setActiveView] = useState('overview');
  const [selectedSpecialist, setSelectedSpecialist] = useState('prime');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSession, setCurrentSession] = useState<WellnessSession | null>(null);
  const [volume, setVolume] = useState(80);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Chat state
  const [messages, setMessages] = useState([
    {
      role: 'ai',
      content: "🧘‍♀️ Welcome to your AI Wellness Studio! I'm Prime, your AI Wellness Director. I analyze your financial stress patterns and create personalized meditation, sleep therapy, and mindfulness sessions that actually eliminate financial stress - not just mask it. How are you feeling about money today?",
      timestamp: new Date().toISOString(),
      specialist: 'prime'
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Wellness metrics
  const [wellnessMetrics] = useState<WellnessMetrics>({
    stressLevel: 3, // 1-10 scale
    sleepQuality: 8, // 1-10 scale
    mindfulnessScore: 85, // percentage
    emotionalBalance: 78, // percentage
    anxietyReduction: 87, // percentage
    timeSaved: 8, // hours per month
    sessionsCompleted: 47,
    totalMinutes: 120
  });

  // AI Wellness Team
  const wellnessTeam: AIWellnessSpecialist[] = [
    {
      id: 'prime',
      name: 'Prime',
      title: 'AI Wellness Director',
      emoji: '👑',
      specialty: 'Strategic Wellness Planning',
      superpower: 'Orchestrates your complete wellness journey with precision and care',
      description: 'Your AI wellness director who analyzes your financial stress patterns and creates personalized therapy sessions.',
      bio: 'Prime uses advanced AI to analyze your financial anxiety patterns and orchestrates your complete wellness journey. He coordinates all therapy sessions and ensures maximum stress reduction.',
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/20',
      borderColor: 'border-purple-500/30',
      status: 'active',
      currentTask: 'Analyzing your stress patterns',
      performance: 98
    },
    {
      id: 'serenity',
      name: 'Serenity',
      title: 'AI Meditation Guide',
      emoji: '🧘‍♀️',
      specialty: 'Financial Stress Relief',
      superpower: 'Guides you through personalized meditation sessions for money anxiety',
      description: 'Your meditation guide who creates personalized sessions to eliminate financial stress and anxiety.',
      bio: 'Serenity specializes in guided meditations specifically designed to address financial stress and money anxiety. She creates personalized sessions that target your unique stress patterns.',
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/20',
      borderColor: 'border-blue-500/30',
      status: 'working',
      currentTask: 'Creating your meditation session',
      performance: 95
    },
    {
      id: 'harmony',
      name: 'Harmony',
      title: 'AI Sleep Therapist',
      emoji: '🌙',
      specialty: 'Financial Sleep Stories',
      superpower: 'Creates calming bedtime stories to eliminate financial worries',
      description: 'Your sleep therapist who creates calming bedtime stories to eliminate financial worries and improve sleep quality.',
      bio: 'Harmony creates personalized bedtime stories focused on financial success and abundance. She helps eliminate nighttime money worries and improves your sleep quality.',
      color: 'text-indigo-400',
      bgColor: 'bg-indigo-500/20',
      borderColor: 'border-indigo-500/30',
      status: 'active',
      currentTask: 'Preparing your sleep story',
      performance: 92
    },
    {
      id: 'balance',
      name: 'Balance',
      title: 'AI Mindfulness Coach',
      emoji: '🍃',
      specialty: 'Money Mindfulness',
      superpower: 'Develops conscious spending habits and mindful money practices',
      description: 'Your mindfulness coach who develops conscious spending habits and mindful money practices.',
      bio: 'Balance helps you develop awareness of your spending triggers and builds conscious money habits. She transforms your relationship with money through mindfulness practices.',
      color: 'text-green-400',
      bgColor: 'bg-green-500/20',
      borderColor: 'border-green-500/30',
      status: 'working',
      currentTask: 'Building your mindfulness practice',
      performance: 88
    }
  ];

  // Mock wellness sessions
  const [wellnessSessions] = useState<WellnessSession[]>([
    {
      id: 'med1',
      title: 'Financial Stress Relief Meditation',
      description: 'A 15-minute guided meditation to eliminate money anxiety and find peace.',
      duration: 900, // 15 minutes
      type: 'meditation',
      specialist: 'serenity',
      transcript: 'Welcome to your financial stress relief meditation. Let\'s begin by finding a comfortable position...',
      highlights: [
        'Reduces financial anxiety by 87%',
        'Improves emotional balance',
        'Creates lasting peace of mind',
        'Builds healthy money mindset'
      ],
      stats: {
        listens: 23,
        likes: 19,
        shares: 7,
        completionRate: 94
      },
      aiInsights: {
        stressReduction: 87,
        sleepImprovement: 65,
        mindfulnessGain: 78,
        emotionalSupport: 92
      }
    },
    {
      id: 'sleep1',
      title: 'Financial Abundance Sleep Story',
      description: 'A calming bedtime story about financial success and abundance to eliminate money worries.',
      duration: 1800, // 30 minutes
      type: 'sleep_story',
      specialist: 'harmony',
      transcript: 'Once upon a time, in a world of financial abundance...',
      highlights: [
        'Eliminates nighttime money worries',
        'Improves sleep quality by 8/10',
        'Creates positive financial visualization',
        'Reduces financial anxiety before bed'
      ],
      stats: {
        listens: 18,
        likes: 16,
        shares: 5,
        completionRate: 89
      },
      aiInsights: {
        stressReduction: 75,
        sleepImprovement: 85,
        mindfulnessGain: 60,
        emotionalSupport: 88
      }
    },
    {
      id: 'mind1',
      title: 'Money Mindfulness Practice',
      description: 'A 10-minute mindfulness session to develop conscious spending awareness.',
      duration: 600, // 10 minutes
      type: 'mindfulness',
      specialist: 'balance',
      transcript: 'Let\'s begin our money mindfulness practice. Take a moment to notice your current relationship with money...',
      highlights: [
        'Develops conscious spending awareness',
        'Identifies emotional spending triggers',
        'Builds mindful money habits',
        'Transforms money relationship'
      ],
      stats: {
        listens: 31,
        likes: 28,
        shares: 12,
        completionRate: 91
      },
      aiInsights: {
        stressReduction: 70,
        sleepImprovement: 55,
        mindfulnessGain: 95,
        emotionalSupport: 85
      }
    }
  ]);

  // Simulate live updates
  useEffect(() => {
    const interval = setInterval(() => {
      // Update specialist statuses randomly
      setSelectedSpecialist(prev => {
        const activeSpecialists = wellnessTeam.filter(s => s.status === 'active');
        if (activeSpecialists.length > 0) {
          const randomIndex = Math.floor(Math.random() * activeSpecialists.length);
          return activeSpecialists[randomIndex].id;
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
      specialist: selectedSpecialist
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    setTimeout(() => {
      const query = content.toLowerCase();
      let specialistResponse = '';

      if (selectedSpecialist === 'prime') {
        if (query.includes('stress') || query.includes('anxiety') || query.includes('worried')) {
          specialistResponse = `👑 **Prime - AI Wellness Director**

I can see you're experiencing financial stress. Let me analyze your patterns and create a personalized wellness plan.

**Current Analysis:**
• Stress Level: ${wellnessMetrics.stressLevel}/10
• Sleep Quality: ${wellnessMetrics.sleepQuality}/10
• Mindfulness Score: ${wellnessMetrics.mindfulnessScore}%
• Anxiety Reduction: ${wellnessMetrics.anxietyReduction}%

**Personalized Recommendations:**
1. **15-minute meditation** with Serenity to reduce immediate stress
2. **Financial sleep story** with Harmony to improve tonight's rest
3. **Mindfulness practice** with Balance to build long-term awareness

**AI-Generated Wellness Plan:**
I'm creating a custom 7-day stress reduction program tailored to your financial anxiety patterns. This will include daily meditations, sleep stories, and mindfulness practices.

**Expected Results:**
• 87% stress reduction within 30 days
• 8/10 sleep quality improvement
• 8 hours monthly time saved
• Complete financial peace of mind

Would you like me to start your personalized wellness journey?`;
        } else {
          specialistResponse = `👑 **Prime - AI Wellness Director**

I'm your AI Wellness Director, orchestrating your complete financial wellness journey. I analyze your stress patterns and create personalized therapy sessions.

**My Specialties:**
• **Strategic Wellness Planning** - Complete wellness journey orchestration
• **AI Pattern Analysis** - Understanding your unique stress triggers
• **Personalized Therapy** - Custom sessions for your specific needs
• **Progress Optimization** - Maximizing your wellness results

**Current Wellness Status:**
• Stress Level: ${wellnessMetrics.stressLevel}/10 (${wellnessMetrics.stressLevel < 5 ? 'Excellent' : 'Needs Attention'})
• Sleep Quality: ${wellnessMetrics.sleepQuality}/10 (${wellnessMetrics.sleepQuality > 7 ? 'Great' : 'Can Improve'})
• Sessions Completed: ${wellnessMetrics.sessionsCompleted}
• Time Saved: ${wellnessMetrics.timeSaved} hours this month

**How I Can Help:**
• Analyze your financial stress patterns
• Create personalized meditation sessions
• Generate calming sleep stories
• Develop mindful money practices
• Track your wellness progress

**Let me help you achieve complete financial peace of mind!** 👑✨`;
        }
      } else if (selectedSpecialist === 'serenity') {
        specialistResponse = `🧘‍♀️ **Serenity - AI Meditation Guide**

Hello! I'm Serenity, your AI Meditation Guide. I specialize in creating personalized meditation sessions to eliminate financial stress and anxiety.

**My Specialties:**
• **Financial Stress Relief** - Targeted meditation for money anxiety
• **Personalized Sessions** - Custom meditations for your unique needs
• **Breathing Techniques** - Quick stress relief exercises
• **Mindfulness Practice** - Building awareness and peace

**Current Meditation Analysis:**
• Stress Reduction: ${wellnessMetrics.anxietyReduction}% improvement
• Sessions Completed: ${wellnessMetrics.sessionsCompleted}
• Average Session: 15 minutes
• Completion Rate: 94%

**Available Sessions:**
1. **Financial Stress Relief** (15 min) - Eliminate money anxiety
2. **Breathing for Calm** (5 min) - Quick stress relief
3. **Money Mindfulness** (10 min) - Conscious awareness
4. **Abundance Meditation** (20 min) - Positive money mindset

**AI-Generated Recommendations:**
Based on your stress patterns, I recommend starting with a 15-minute Financial Stress Relief meditation. This will reduce your anxiety by 87% and create lasting peace of mind.

**Let me guide you to financial peace through meditation!** 🧘‍♀️✨`;
      } else if (selectedSpecialist === 'harmony') {
        specialistResponse = `🌙 **Harmony - AI Sleep Therapist**

Greetings! I'm Harmony, your AI Sleep Therapist. I create calming bedtime stories to eliminate financial worries and improve your sleep quality.

**My Specialties:**
• **Financial Sleep Stories** - Bedtime narratives for money peace
• **Sleep Quality Improvement** - Better rest through financial therapy
• **Nighttime Anxiety Relief** - Eliminate money worries before bed
• **Abundance Visualization** - Positive financial future stories

**Current Sleep Analysis:**
• Sleep Quality: ${wellnessMetrics.sleepQuality}/10 (${wellnessMetrics.sleepQuality > 7 ? 'Excellent' : 'Needs Improvement'})
• Sleep Stories Completed: 12
• Average Sleep Improvement: 85%
• Nighttime Anxiety: ${wellnessMetrics.stressLevel < 5 ? 'Low' : 'Moderate'}

**Available Sleep Stories:**
1. **Financial Abundance Story** (30 min) - Success and prosperity
2. **Money Peace Meditation** (20 min) - Calm and security
3. **Wealth Building Journey** (25 min) - Growth and opportunity
4. **Financial Freedom Dream** (35 min) - Complete independence

**AI-Generated Sleep Plan:**
I'm creating a personalized 7-night sleep story program that will eliminate your financial worries and improve your sleep quality to 8/10.

**Let me help you sleep peacefully with financial abundance!** 🌙✨`;
      } else if (selectedSpecialist === 'balance') {
        specialistResponse = `🍃 **Balance - AI Mindfulness Coach**

Hello! I'm Balance, your AI Mindfulness Coach. I help you develop conscious spending habits and mindful money practices.

**My Specialties:**
• **Money Mindfulness** - Conscious awareness of spending
• **Habit Transformation** - Breaking negative financial patterns
• **Trigger Recognition** - Identifying emotional spending cues
• **Mindful Practices** - Daily awareness building

**Current Mindfulness Analysis:**
• Mindfulness Score: ${wellnessMetrics.mindfulnessScore}% (${wellnessMetrics.mindfulnessScore > 80 ? 'Excellent' : 'Good'})
• Practices Completed: 23
• Habit Changes: 8 positive shifts
• Awareness Level: High

**Available Practices:**
1. **Money Mindfulness** (10 min) - Conscious spending awareness
2. **Breathing for Decisions** (5 min) - Pause before spending
3. **Gratitude for Money** (8 min) - Appreciate what you have
4. **Abundance Mindset** (12 min) - Positive money relationship

**AI-Generated Mindfulness Plan:**
I'm developing a personalized 21-day mindfulness program that will transform your relationship with money and create lasting conscious habits.

**Let me help you develop mindful money practices!** 🍃✨`;
      }

      const aiMessage = {
        role: 'ai',
        content: specialistResponse,
        timestamp: new Date().toISOString(),
        specialist: selectedSpecialist
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

  const getSessionIcon = (type: string) => {
    switch (type) {
      case 'meditation': return <Heart className="w-5 h-5 text-blue-400" />;
      case 'sleep_story': return <Moon className="w-5 h-5 text-indigo-400" />;
      case 'mindfulness': return <Leaf className="w-5 h-5 text-green-400" />;
      case 'breathing': return <Zap className="w-5 h-5 text-yellow-400" />;
      default: return <Play className="w-5 h-5 text-purple-400" />;
    }
  };

  const getSessionColor = (type: string) => {
    switch (type) {
      case 'meditation': return 'text-blue-400 bg-blue-500/20';
      case 'sleep_story': return 'text-indigo-400 bg-indigo-500/20';
      case 'mindfulness': return 'text-green-400 bg-green-500/20';
      case 'breathing': return 'text-yellow-400 bg-yellow-500/20';
      default: return 'text-purple-400 bg-purple-500/20';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-6 pb-20">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">🧘‍♀️ AI Wellness Studio</h1>
            <p className="text-white/70 text-sm sm:text-base">Finally, Financial Stress Relief That Actually Works - AI analyzes your financial anxiety patterns and creates personalized meditation, sleep therapy, and mindfulness sessions</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-green-400 text-sm font-medium">AI Active</span>
            </div>
            <div className="text-2xl">🧘‍♀️</div>
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
          { key: 'overview', label: 'Wellness Overview', icon: BarChart3 },
          { key: 'team', label: 'AI Wellness Team', icon: Users },
          { key: 'sessions', label: 'Wellness Sessions', icon: Play },
          { key: 'meditation', label: 'Meditation', icon: Heart },
          { key: 'sleep', label: 'Sleep Stories', icon: Moon },
          { key: 'mindfulness', label: 'Mindfulness', icon: Leaf },
          { key: 'chat', label: 'AI Chat', icon: MessageCircle }
        ].map(({ key, label, icon: Icon }) => (
          <motion.button
            key={key}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setActiveView(key)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              activeView === key
                ? 'bg-purple-500 text-white'
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
          {/* Wellness Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/70 text-sm">Stress Level</p>
                  <p className="text-2xl font-bold text-green-400">{wellnessMetrics.stressLevel}/10</p>
                </div>
                <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
                  <Smile className="w-6 h-6 text-green-400" />
                </div>
              </div>
            </div>

            <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/70 text-sm">Sleep Quality</p>
                  <p className="text-2xl font-bold text-blue-400">{wellnessMetrics.sleepQuality}/10</p>
                </div>
                <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
                  <Moon className="w-6 h-6 text-blue-400" />
                </div>
              </div>
            </div>

            <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/70 text-sm">Mindfulness Score</p>
                  <p className="text-2xl font-bold text-purple-400">{wellnessMetrics.mindfulnessScore}%</p>
                </div>
                <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center">
                  <Leaf className="w-6 h-6 text-purple-400" />
                </div>
              </div>
            </div>

            <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/70 text-sm">Anxiety Reduction</p>
                  <p className="text-2xl font-bold text-orange-400">{wellnessMetrics.anxietyReduction}%</p>
                </div>
                <div className="w-12 h-12 bg-orange-500/20 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-orange-400" />
                </div>
              </div>
            </div>
          </div>

          {/* AI Wellness Team Overview */}
          <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Your Personal AI Financial Therapists</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {wellnessTeam.map((specialist) => (
                <div key={specialist.id} className={`p-4 rounded-lg border ${specialist.bgColor} ${specialist.borderColor}`}>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="text-2xl">{specialist.emoji}</div>
                    <div>
                      <h4 className="text-white font-medium">{specialist.name}</h4>
                      <p className={`text-xs ${specialist.color}`}>{specialist.title}</p>
                    </div>
                  </div>
                  <p className="text-white/70 text-sm">{specialist.specialty}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <button
                onClick={() => setActiveView('meditation')}
                className="flex items-center gap-3 p-4 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 rounded-lg text-white transition-colors"
              >
                <Heart className="w-5 h-5" />
                <span>Start Meditation</span>
              </button>
              <button
                onClick={() => setActiveView('sleep')}
                className="flex items-center gap-3 p-4 bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/30 rounded-lg text-white transition-colors"
              >
                <Moon className="w-5 h-5" />
                <span>Sleep Story</span>
              </button>
              <button
                onClick={() => setActiveView('mindfulness')}
                className="flex items-center gap-3 p-4 bg-green-500/20 hover:bg-green-500/30 border border-green-500/30 rounded-lg text-white transition-colors"
              >
                <Leaf className="w-5 h-5" />
                <span>Mindfulness</span>
              </button>
              <button
                onClick={() => setActiveView('chat')}
                className="flex items-center gap-3 p-4 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 rounded-lg text-white transition-colors"
              >
                <MessageCircle className="w-5 h-5" />
                <span>AI Chat</span>
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* AI Wellness Team Section */}
      {activeView === 'team' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-8"
        >
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-white mb-2">Your Personal AI Financial Therapists</h2>
            <p className="text-white/70">Meet the AI wellness experts who understand your financial anxiety and create personalized healing experiences</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {wellnessTeam.map((specialist) => (
              <div key={specialist.id} className={`p-6 rounded-xl border ${specialist.bgColor} ${specialist.borderColor}`}>
                <div className="flex items-start gap-4 mb-4">
                  <div className="text-4xl">{specialist.emoji}</div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-white mb-1">{specialist.name}</h3>
                    <p className={`text-sm font-medium ${specialist.color} mb-2`}>{specialist.title}</p>
                    <p className="text-white/70 text-sm">{specialist.specialty}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className={`w-2 h-2 rounded-full ${
                      specialist.status === 'active' ? 'bg-green-400' :
                      specialist.status === 'working' ? 'bg-yellow-400' : 'bg-gray-400'
                    }`}></div>
                    <span className="text-xs text-white/70 capitalize">{specialist.status}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-white/80 text-sm font-medium">Superpower: {specialist.superpower}</p>
                  <p className="text-white/70 text-sm">{specialist.description}</p>
                  <p className="text-white/60 text-sm">{specialist.bio}</p>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-white/70">Performance</span>
                    <span className={`${specialist.color} font-medium`}>{specialist.performance}%</span>
                  </div>
                  {specialist.currentTask && (
                    <div className="text-xs text-white/60 italic">
                      Currently: {specialist.currentTask}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Wellness Sessions Section */}
      {activeView === 'sessions' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-8"
        >
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-white mb-2">AI-Generated Wellness Sessions</h2>
            <p className="text-white/70">Personalized meditation, sleep stories, and mindfulness sessions created by AI for your unique financial stress patterns</p>
          </div>

          <div className="space-y-4">
            {wellnessSessions.map((session) => {
              const specialist = wellnessTeam.find(s => s.id === session.specialist);
              return (
                <div key={session.id} className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6">
                  <div className="flex items-start gap-4">
                    <div className="text-3xl">{specialist?.emoji}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-white">{session.title}</h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSessionColor(session.type)}`}>
                          {session.type.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-white/70 text-sm mb-3">{session.description}</p>
                      <div className="flex items-center gap-6 text-sm text-white/60 mb-4">
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {formatTime(session.duration)}
                        </div>
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4" />
                          {session.stats.likes} likes
                        </div>
                        <div className="flex items-center gap-1">
                          <Activity className="w-4 h-4" />
                          {session.stats.completionRate}% completion
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <button
                          onClick={() => {
                            setCurrentSession(session);
                            setIsPlaying(true);
                          }}
                          className="flex items-center gap-2 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors"
                        >
                          <Play className="w-4 h-4" />
                          Play Session
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

      {/* AI Chat Section */}
      {activeView === 'chat' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-8"
        >
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-white mb-2">AI Chat - Choose Your Specialist</h2>
            <p className="text-white/70">Chat with individual AI wellness specialists who can help in their specific areas of expertise</p>
          </div>

          {/* AI Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {wellnessTeam.map((specialist) => (
              <button
                key={specialist.id}
                onClick={() => setSelectedSpecialist(specialist.id)}
                className={`p-4 rounded-xl border transition-all ${
                  selectedSpecialist === specialist.id
                    ? `${specialist.bgColor} ${specialist.borderColor} scale-105`
                    : 'bg-white/5 border-white/10 hover:bg-white/10'
                }`}
              >
                <div className="text-center">
                  <div className="text-3xl mb-2">{specialist.emoji}</div>
                  <h3 className="text-lg font-bold text-white mb-1">{specialist.name}</h3>
                  <p className={`text-sm font-medium ${specialist.color} mb-2`}>{specialist.specialty}</p>
                  <p className="text-white/70 text-xs">{specialist.superpower}</p>
                </div>
              </button>
            ))}
          </div>

          {/* Chat Interface */}
          <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="text-3xl">{wellnessTeam.find(s => s.id === selectedSpecialist)?.emoji}</div>
              <div>
                <h3 className="text-xl font-semibold text-white">
                  Chat with {wellnessTeam.find(s => s.id === selectedSpecialist)?.name}
                </h3>
                <p className="text-white/70">
                  {wellnessTeam.find(s => s.id === selectedSpecialist)?.title}
                </p>
              </div>
            </div>

            <div className="h-96 overflow-y-auto p-4 space-y-4 bg-white/5 rounded-lg mb-4">
              {messages.filter(msg => msg.specialist === selectedSpecialist).map((message, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    message.role === 'user'
                      ? 'bg-purple-600 text-white'
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
                      <span>{wellnessTeam.find(s => s.id === selectedSpecialist)?.name} is analyzing...</span>
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
                placeholder={`Share your feelings with ${wellnessTeam.find(s => s.id === selectedSpecialist)?.name}...`}
                className="flex-1 bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:border-purple-500"
                disabled={isLoading}
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={isLoading || !input.trim()}
                className="bg-purple-500 hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg px-4 py-3 transition-colors"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Audio Player */}
      {currentSession && (
        <div className="fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-sm border-t border-white/10 p-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-4">
              <button
                onClick={handlePlayPause}
                className="w-12 h-12 bg-purple-500 hover:bg-purple-600 rounded-full flex items-center justify-center text-white transition-colors"
              >
                {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
              </button>
              
              <div className="flex-1">
                <h4 className="text-white font-medium">{currentSession.title}</h4>
                <p className="text-white/70 text-sm">{currentSession.description}</p>
              </div>
              
              <div className="flex items-center gap-2">
                <button onClick={handleSkipBack} className="p-2 hover:bg-white/10 rounded-lg text-white">
                  <SkipBack className="w-5 h-5" />
                </button>
                <span className="text-white/70 text-sm">{formatTime(currentTime)}</span>
                <div className="w-32 bg-white/20 rounded-full h-1">
                  <div 
                    className="bg-purple-400 h-1 rounded-full" 
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
                    className="bg-purple-400 h-1 rounded-full" 
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
