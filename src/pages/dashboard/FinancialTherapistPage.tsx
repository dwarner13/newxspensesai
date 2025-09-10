import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  Heart, 
  Send, 
  Loader2,
  BarChart3,
  MessageCircle,
  Users,
  Play,
  Shield,
  Target,
  Star,
  Coffee,
  BookOpen,
  Sparkles,
  CheckCircle,
  AlertTriangle,
  Smile,
  Frown,
  Meh
} from 'lucide-react';

// AI Financial Therapist Interfaces
interface AITherapist {
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

interface TherapyMessage {
  role: 'user' | 'ai';
  content: string;
  timestamp: string;
  therapist: string;
  emotion?: 'anxiety' | 'guilt' | 'shame' | 'celebration' | 'neutral';
}

interface WellnessJourney {
  stage: 'awareness' | 'acceptance' | 'understanding' | 'transformation' | 'integration';
  title: string;
  description: string;
  progress: number;
  completed: boolean;
}

interface CopingStrategy {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  color: string;
  practice: string;
}

export default function FinancialTherapistPage() {
  // View state
  const [activeView, setActiveView] = useState('overview');
  const [selectedTherapist, setSelectedTherapist] = useState('serenity');
  
  // Chat state
  const [messages, setMessages] = useState<TherapyMessage[]>([
    {
      role: 'ai',
      content: "💙 Welcome to your AI Emotional Healing Sanctuary! I'm Dr. Serenity, your compassionate listener. Here, money isn't just numbers - it's emotions, memories, and deep-seated beliefs. I'm here to create a safe space for your financial journey. How are you feeling about money today?",
      timestamp: new Date().toISOString(),
      therapist: 'serenity',
      emotion: 'neutral'
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Wellness stats
  const [wellnessStats] = useState({
    emotionalSupport: 24,
    judgmentFree: 100,
    compassion: 100,
    shame: 0,
    sessionsCompleted: 47,
    stressReduction: 89,
    confidenceBoost: 94,
    wellnessScore: 91
  });

  // AI Therapy Team
  const therapyTeam: AITherapist[] = [
    {
      id: 'serenity',
      name: 'Dr. Serenity',
      title: 'Compassionate Listener',
      emoji: '💙',
      specialty: 'Emotional validation & safe space creation',
      superpower: 'Creates instant emotional safety',
      description: 'Your gentle guide who listens without judgment and helps you feel heard and understood in your financial journey.',
      bio: 'Dr. Serenity specializes in creating emotional safety and validation. She helps you process difficult feelings about money with compassion and understanding, creating a judgment-free space for healing.',
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/20',
      borderColor: 'border-blue-500/30',
      status: 'active',
      currentTask: 'Providing emotional support and validation',
      performance: 95
    },
    {
      id: 'wisdom',
      name: 'Dr. Wisdom',
      title: 'Pattern Recognition Expert',
      emoji: '🧠',
      specialty: 'Identifying emotional spending triggers',
      superpower: 'Sees hidden money-emotion connections',
      description: 'The insightful therapist who helps you understand why you spend the way you do and how to break negative patterns.',
      bio: 'Dr. Wisdom uses advanced pattern recognition to identify the emotional triggers behind your spending habits. She helps you understand the deeper psychological connections between your feelings and financial behaviors.',
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/20',
      borderColor: 'border-purple-500/30',
      status: 'working',
      currentTask: 'Analyzing your spending patterns',
      performance: 92
    },
    {
      id: 'courage',
      name: 'Dr. Courage',
      title: 'Confidence Builder',
      emoji: '🦁',
      specialty: 'Building financial self-esteem',
      superpower: 'Transforms fear into empowerment',
      description: 'Your motivational coach who helps you overcome money fears and build unshakeable financial confidence.',
      bio: 'Dr. Courage specializes in building financial confidence and self-esteem. She helps you transform fear and anxiety into empowerment, building the courage to make positive financial decisions.',
      color: 'text-orange-400',
      bgColor: 'bg-orange-500/20',
      borderColor: 'border-orange-500/30',
      status: 'active',
      currentTask: 'Building your financial confidence',
      performance: 88
    },
    {
      id: 'harmony',
      name: 'Dr. Harmony',
      title: 'Balance Specialist',
      emoji: '🌿',
      specialty: 'Creating healthy money-life balance',
      superpower: 'Finds harmony between spending & saving',
      description: 'The holistic therapist who helps you create sustainable financial habits that support your overall wellbeing.',
      bio: 'Dr. Harmony takes a holistic approach to financial wellness, helping you create balance between your financial goals and overall life satisfaction. She focuses on sustainable habits that support your wellbeing.',
      color: 'text-green-400',
      bgColor: 'bg-green-500/20',
      borderColor: 'border-green-500/30',
      status: 'working',
      currentTask: 'Creating your wellness balance',
      performance: 90
    }
  ];

  // Wellness Journey
  const [wellnessJourney] = useState<WellnessJourney[]>([
    {
      stage: 'awareness',
      title: 'Awareness',
      description: 'Recognizing your emotional patterns with money',
      progress: 100,
      completed: true
    },
    {
      stage: 'acceptance',
      title: 'Acceptance',
      description: 'Embracing your feelings without judgment',
      progress: 85,
      completed: false
    },
    {
      stage: 'understanding',
      title: 'Understanding',
      description: 'Discovering why you feel the way you do',
      progress: 60,
      completed: false
    },
    {
      stage: 'transformation',
      title: 'Transformation',
      description: 'Creating new, healthy money relationships',
      progress: 30,
      completed: false
    },
    {
      stage: 'integration',
      title: 'Integration',
      description: 'Living with financial peace and confidence',
      progress: 10,
      completed: false
    }
  ]);

  // Coping Strategies
  const copingStrategies: CopingStrategy[] = [
    {
      id: 'mindful_moments',
      title: 'Mindful Money Moments',
      practice: 'Take 3 deep breaths before any financial decision',
      description: 'Create space between impulse and action',
      icon: Coffee,
      color: 'text-blue-400'
    },
    {
      id: 'gratitude_journaling',
      title: 'Gratitude Journaling',
      practice: 'Write 3 things you\'re grateful for about money daily',
      description: 'Shift focus from scarcity to abundance',
      icon: BookOpen,
      color: 'text-green-400'
    },
    {
      id: 'self_compassion',
      title: 'Self-Compassion Breaks',
      practice: 'Treat yourself with the kindness you\'d show a friend',
      description: 'Practice self-kindness during financial stress',
      icon: Heart,
      color: 'text-pink-400'
    },
    {
      id: 'progress_celebration',
      title: 'Progress Celebrations',
      practice: 'Acknowledge every small financial win',
      description: 'Build positive momentum through recognition',
      icon: Sparkles,
      color: 'text-yellow-400'
    }
  ];

  // Live therapy sessions
  const [liveSessions] = useState([
    {
      id: 'session1',
      emotion: 'anxiety',
      title: 'I\'m terrified to check my bank account. What if I\'m broke?',
      therapist: 'serenity',
      status: 'active',
      duration: '15 min'
    },
    {
      id: 'session2',
      emotion: 'guilt',
      title: 'I spent too much on shopping again. I feel so guilty.',
      therapist: 'wisdom',
      status: 'scheduled',
      duration: '20 min'
    },
    {
      id: 'session3',
      emotion: 'shame',
      title: 'I can\'t talk to my partner about money. I\'m so ashamed.',
      therapist: 'courage',
      status: 'completed',
      duration: '25 min'
    },
    {
      id: 'session4',
      emotion: 'celebration',
      title: 'I finally saved $1000! I want to celebrate this win.',
      therapist: 'harmony',
      status: 'completed',
      duration: '10 min'
    }
  ]);

  // Simulate live updates
  useEffect(() => {
    const interval = setInterval(() => {
      // Update therapist statuses randomly
      setSelectedTherapist(prev => {
        const activeTherapists = therapyTeam.filter(t => t.status === 'active');
        if (activeTherapists.length > 0) {
          const randomIndex = Math.floor(Math.random() * activeTherapists.length);
          return activeTherapists[randomIndex].id;
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

    const userMessage: TherapyMessage = {
      role: 'user',
      content: content.trim(),
      timestamp: new Date().toISOString(),
      therapist: selectedTherapist,
      emotion: 'neutral'
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    setTimeout(() => {
      const query = content.toLowerCase();
      let therapistResponse = '';

      if (selectedTherapist === 'serenity') {
        if (query.includes('anxiety') || query.includes('worried') || query.includes('scared')) {
          therapistResponse = `💙 **Dr. Serenity - Compassionate Listener**

I hear you, and it's completely normal to feel anxious about money. Your feelings are valid, and I'm here to create a safe space for you to process them.

**Creating Emotional Safety:**
• **Your feelings matter** - Anxiety about money is very common
• **You're not alone** - 72% of people experience financial anxiety
• **This is temporary** - These feelings will pass as you take action
• **You're safe here** - No judgment, just understanding and support

**Immediate Relief Techniques:**
1. **Breathe with me** - In for 4, hold for 4, out for 6
2. **Ground yourself** - Name 5 things you can see around you
3. **Separate facts from fears** - What's real vs. what you're worried about?
4. **Small steps** - What's one tiny action you can take today?

**Remember:** Your worth is not defined by your bank account. You're doing the right thing by seeking support.

What specific aspect of your financial situation is causing the most anxiety right now?`;
        } else {
          therapistResponse = `💙 **Dr. Serenity - Compassionate Listener**

I'm here to listen and provide emotional support for your financial journey. I create a safe, judgment-free space where you can explore your feelings about money.

**How I Can Help:**
• **Emotional validation** - Your feelings are valid and important
• **Safe space creation** - No judgment, just understanding
• **Compassionate listening** - I hear you and support you
• **Gentle guidance** - Practical steps with emotional support

**My Approach:**
I believe that healing your relationship with money starts with understanding and accepting your emotions. Together, we'll work through your feelings with compassion and create a path forward.

What would you like to share about your relationship with money today?`;
        }
      } else if (selectedTherapist === 'wisdom') {
        therapistResponse = `🧠 **Dr. Wisdom - Pattern Recognition Expert**

Hello! I'm Dr. Wisdom, your pattern recognition specialist. I help you understand the deeper psychological connections between your emotions and financial behaviors.

**My Specialties:**
• **Emotional spending triggers** - Identifying what drives your spending
• **Pattern recognition** - Seeing hidden money-emotion connections
• **Behavioral analysis** - Understanding why you spend the way you do
• **Breakthrough insights** - Helping you see patterns you might miss

**Current Analysis:**
• Spending patterns analyzed: 47 sessions
• Emotional triggers identified: 12 patterns
• Breakthrough moments: 8 major insights
• Progress rate: 85% improvement

**How I Can Help:**
• Analyze your spending patterns for emotional triggers
• Identify the root causes of financial behaviors
• Help you understand the psychology behind your money choices
• Provide insights that lead to lasting change

**Let me help you see the patterns that are holding you back!** 🧠✨`;
      } else if (selectedTherapist === 'courage') {
        therapistResponse = `🦁 **Dr. Courage - Confidence Builder**

Greetings! I'm Dr. Courage, your confidence-building specialist. I help you transform fear and anxiety into empowerment and financial confidence.

**My Specialties:**
• **Building financial self-esteem** - Transforming limiting beliefs
• **Fear transformation** - Turning anxiety into empowerment
• **Confidence building** - Developing unshakeable financial confidence
• **Motivational coaching** - Inspiring you to take action

**Current Confidence Building:**
• Confidence level: 75% (up from 45%)
• Fears overcome: 8 major financial fears
• Empowering moments: 23 breakthroughs
• Action steps taken: 15 courageous decisions

**How I Can Help:**
• Transform your money fears into empowerment
• Build your financial self-esteem and confidence
• Motivate you to take courageous financial actions
• Help you believe in your financial capabilities

**Let me help you build the courage to create the financial life you deserve!** 🦁💪`;
      } else if (selectedTherapist === 'harmony') {
        therapistResponse = `🌿 **Dr. Harmony - Balance Specialist**

Hello! I'm Dr. Harmony, your balance and wellness specialist. I help you create sustainable financial habits that support your overall wellbeing.

**My Specialties:**
• **Money-life balance** - Finding harmony between spending and saving
• **Holistic wellness** - Supporting your overall wellbeing
• **Sustainable habits** - Creating lasting positive changes
• **Wellness integration** - Balancing financial goals with life satisfaction

**Current Wellness Status:**
• Balance score: 82% (excellent progress)
• Sustainable habits: 6 active practices
• Wellness integration: 78% improvement
• Life satisfaction: 85% with financial choices

**How I Can Help:**
• Create healthy money-life balance
• Develop sustainable financial habits
• Support your overall wellness journey
• Find harmony between your goals and wellbeing

**Let me help you create a balanced, fulfilling relationship with money!** 🌿✨`;
      }

      const aiMessage: TherapyMessage = {
        role: 'ai',
        content: therapistResponse,
        timestamp: new Date().toISOString(),
        therapist: selectedTherapist,
        emotion: 'neutral'
      };
      setMessages(prev => [...prev, aiMessage]);
      setIsLoading(false);
    }, 1500);
  };

  const getEmotionIcon = (emotion: string) => {
    switch (emotion) {
      case 'anxiety': return <Frown className="w-5 h-5 text-red-400" />;
      case 'guilt': return <Meh className="w-5 h-5 text-yellow-400" />;
      case 'shame': return <Frown className="w-5 h-5 text-orange-400" />;
      case 'celebration': return <Smile className="w-5 h-5 text-green-400" />;
      default: return <Meh className="w-5 h-5 text-blue-400" />;
    }
  };

  const getEmotionColor = (emotion: string) => {
    switch (emotion) {
      case 'anxiety': return 'text-red-400 bg-red-500/20';
      case 'guilt': return 'text-yellow-400 bg-yellow-500/20';
      case 'shame': return 'text-orange-400 bg-orange-500/20';
      case 'celebration': return 'text-green-400 bg-green-500/20';
      default: return 'text-blue-400 bg-blue-500/20';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900 p-4 sm:p-6 pb-20">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">💙 AI Financial Therapist</h1>
            <p className="text-white/70 text-sm sm:text-base">Where Money Meets Mental Wellness - Your Emotional Healing Sanctuary</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-green-400 text-sm font-medium">AI Team Active</span>
            </div>
            <div className="text-2xl">💙</div>
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
          { key: 'overview', label: 'Therapy Overview', icon: BarChart3 },
          { key: 'team', label: 'AI Therapy Team', icon: Users },
          { key: 'sessions', label: 'Live Sessions', icon: Play },
          { key: 'journey', label: 'Wellness Journey', icon: Target },
          { key: 'strategies', label: 'Coping Strategies', icon: Heart },
          { key: 'chat', label: 'AI Chat', icon: MessageCircle }
        ].map(({ key, label, icon: Icon }) => (
          <motion.button
            key={key}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setActiveView(key)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              activeView === key
                ? 'bg-indigo-500 text-white'
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
                  <p className="text-white/70 text-sm">Emotional Support</p>
                  <p className="text-2xl font-bold text-blue-400">{wellnessStats.emotionalSupport}/7</p>
                </div>
                <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
                  <Heart className="w-6 h-6 text-blue-400" />
                </div>
              </div>
            </div>

            <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/70 text-sm">Judgment-Free</p>
                  <p className="text-2xl font-bold text-green-400">{wellnessStats.judgmentFree}%</p>
                </div>
                <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
                  <Shield className="w-6 h-6 text-green-400" />
                </div>
              </div>
            </div>

            <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/70 text-sm">Compassion</p>
                  <p className="text-2xl font-bold text-purple-400">∞</p>
                </div>
                <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center">
                  <Star className="w-6 h-6 text-purple-400" />
                </div>
              </div>
            </div>

            <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/70 text-sm">Shame</p>
                  <p className="text-2xl font-bold text-red-400">{wellnessStats.shame}%</p>
                </div>
                <div className="w-12 h-12 bg-red-500/20 rounded-lg flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-red-400" />
                </div>
              </div>
            </div>
          </div>

          {/* Wellness Journey Progress */}
          <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Your Emotional Wellness Journey</h3>
            <div className="space-y-4">
              {wellnessJourney.map((stage, index) => (
                <div key={stage.stage} className="flex items-center gap-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      stage.completed ? 'bg-green-500' : 'bg-white/10'
                    }`}>
                      {stage.completed ? (
                        <CheckCircle className="w-5 h-5 text-white" />
                      ) : (
                        <span className="text-white text-sm font-bold">{index + 1}</span>
                      )}
                    </div>
                    <div>
                      <h4 className="text-white font-medium">{stage.title}</h4>
                      <p className="text-white/70 text-sm">{stage.description}</p>
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="w-full bg-white/10 rounded-full h-2">
                      <div 
                        className="bg-indigo-400 h-2 rounded-full transition-all duration-500" 
                        style={{ width: `${stage.progress}%` }}
                      ></div>
                    </div>
                    <p className="text-white/60 text-xs mt-1">{stage.progress}% complete</p>
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
                onClick={() => setActiveView('team')}
                className="flex items-center gap-3 p-4 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 rounded-lg text-white transition-colors"
              >
                <Users className="w-5 h-5" />
                <span>Meet AI Team</span>
              </button>
              <button
                onClick={() => setActiveView('sessions')}
                className="flex items-center gap-3 p-4 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 rounded-lg text-white transition-colors"
              >
                <Play className="w-5 h-5" />
                <span>Live Sessions</span>
              </button>
              <button
                onClick={() => setActiveView('strategies')}
                className="flex items-center gap-3 p-4 bg-green-500/20 hover:bg-green-500/30 border border-green-500/30 rounded-lg text-white transition-colors"
              >
                <Heart className="w-5 h-5" />
                <span>Coping Strategies</span>
              </button>
              <button
                onClick={() => setActiveView('chat')}
                className="flex items-center gap-3 p-4 bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/30 rounded-lg text-white transition-colors"
              >
                <MessageCircle className="w-5 h-5" />
                <span>Start Therapy</span>
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* AI Therapy Team Section */}
      {activeView === 'team' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-8"
        >
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-white mb-2">Your AI Therapy Team</h2>
            <p className="text-white/70">Each AI therapist brings unique expertise to your emotional wellness journey - from compassionate listening to pattern recognition</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {therapyTeam.map((therapist) => (
              <div key={therapist.id} className={`p-6 rounded-xl border ${therapist.bgColor} ${therapist.borderColor}`}>
                <div className="flex items-start gap-4 mb-4">
                  <div className="text-4xl">{therapist.emoji}</div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-white mb-1">{therapist.name}</h3>
                    <p className={`text-sm font-medium ${therapist.color} mb-2`}>{therapist.title}</p>
                    <p className="text-white/70 text-sm">{therapist.specialty}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className={`w-2 h-2 rounded-full ${
                      therapist.status === 'active' ? 'bg-green-400' :
                      therapist.status === 'working' ? 'bg-yellow-400' : 'bg-gray-400'
                    }`}></div>
                    <span className="text-xs text-white/70 capitalize">{therapist.status}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-white/80 text-sm font-medium">Superpower: {therapist.superpower}</p>
                  <p className="text-white/70 text-sm">{therapist.description}</p>
                  <p className="text-white/60 text-sm">{therapist.bio}</p>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-white/70">Performance</span>
                    <span className={`${therapist.color} font-medium`}>{therapist.performance}%</span>
                  </div>
                  {therapist.currentTask && (
                    <div className="text-xs text-white/60 italic">
                      Currently: {therapist.currentTask}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Live Sessions Section */}
      {activeView === 'sessions' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-8"
        >
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-white mb-2">Live AI Therapy Sessions</h2>
            <p className="text-white/70">Experience real AI therapy in action - see how your AI therapists provide emotional support and practical guidance</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {liveSessions.map((session) => {
              const therapist = therapyTeam.find(t => t.id === session.therapist);
              return (
                <div key={session.id} className={`p-6 rounded-xl border ${therapist?.bgColor} ${therapist?.borderColor}`}>
                  <div className="flex items-start gap-4 mb-4">
                    <div className="text-3xl">{therapist?.emoji}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-lg font-bold text-white">{therapist?.name}</h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getEmotionColor(session.emotion)}`}>
                          {session.emotion}
                        </span>
                      </div>
                      <p className="text-white/70 text-sm">{session.title}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className={`w-2 h-2 rounded-full ${
                        session.status === 'active' ? 'bg-green-400' :
                        session.status === 'scheduled' ? 'bg-yellow-400' : 'bg-gray-400'
                      }`}></div>
                      <span className="text-xs text-white/70 capitalize">{session.status}</span>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-white/70">Duration</span>
                      <span className="text-white">{session.duration}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-white/70">Emotion</span>
                      <div className="flex items-center gap-1">
                        {getEmotionIcon(session.emotion)}
                        <span className="text-white capitalize">{session.emotion}</span>
                      </div>
                    </div>
                    <button className="w-full mt-4 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg transition-colors">
                      {session.status === 'active' ? 'Join Session' : 
                       session.status === 'scheduled' ? 'Schedule' : 'View Recording'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Wellness Journey Section */}
      {activeView === 'journey' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-8"
        >
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-white mb-2">Your Emotional Wellness Journey</h2>
            <p className="text-white/70">Transform your relationship with money through a structured healing process designed for lasting change</p>
          </div>

          <div className="space-y-6">
            {wellnessJourney.map((stage, index) => (
              <div key={stage.stage} className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    stage.completed ? 'bg-green-500' : 'bg-white/10'
                  }`}>
                    {stage.completed ? (
                      <CheckCircle className="w-6 h-6 text-white" />
                    ) : (
                      <span className="text-white text-lg font-bold">{index + 1}</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-white mb-2">{stage.title}</h3>
                    <p className="text-white/70 mb-4">{stage.description}</p>
                    <div className="w-full bg-white/10 rounded-full h-3">
                      <div 
                        className="bg-indigo-400 h-3 rounded-full transition-all duration-500" 
                        style={{ width: `${stage.progress}%` }}
                      ></div>
                    </div>
                    <p className="text-white/60 text-sm mt-2">{stage.progress}% complete</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Coping Strategies Section */}
      {activeView === 'strategies' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-8"
        >
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-white mb-2">Coping Strategies for Financial Wellness</h2>
            <p className="text-white/70">Practical techniques and daily practices to support your emotional healing journey</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {copingStrategies.map((strategy) => (
              <div key={strategy.id} className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${strategy.color.replace('text-', 'bg-').replace('-400', '-500/20')}`}>
                    <strategy.icon className={`w-6 h-6 ${strategy.color}`} />
                  </div>
                  <h3 className="text-lg font-bold text-white">{strategy.title}</h3>
                </div>
                <p className="text-white/70 text-sm mb-4">{strategy.description}</p>
                <div className="bg-white/10 rounded-lg p-3">
                  <p className="text-white text-sm font-medium mb-2">Practice:</p>
                  <p className="text-white/80 text-sm italic">"{strategy.practice}"</p>
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
            <h2 className="text-2xl font-bold text-white mb-2">AI Chat - Choose Your Therapist</h2>
            <p className="text-white/70">Chat with individual AI therapists who can help in their specific areas of expertise</p>
          </div>

          {/* AI Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {therapyTeam.map((therapist) => (
              <button
                key={therapist.id}
                onClick={() => setSelectedTherapist(therapist.id)}
                className={`p-4 rounded-xl border transition-all ${
                  selectedTherapist === therapist.id
                    ? `${therapist.bgColor} ${therapist.borderColor} scale-105`
                    : 'bg-white/5 border-white/10 hover:bg-white/10'
                }`}
              >
                <div className="text-center">
                  <div className="text-3xl mb-2">{therapist.emoji}</div>
                  <h3 className="text-lg font-bold text-white mb-1">{therapist.name}</h3>
                  <p className={`text-sm font-medium ${therapist.color} mb-2`}>{therapist.specialty}</p>
                  <p className="text-white/70 text-xs">{therapist.superpower}</p>
                </div>
              </button>
            ))}
          </div>

          {/* Chat Interface */}
          <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="text-3xl">{therapyTeam.find(t => t.id === selectedTherapist)?.emoji}</div>
              <div>
                <h3 className="text-xl font-semibold text-white">
                  Chat with {therapyTeam.find(t => t.id === selectedTherapist)?.name}
                </h3>
                <p className="text-white/70">
                  {therapyTeam.find(t => t.id === selectedTherapist)?.title}
                </p>
              </div>
            </div>

            <div className="h-96 overflow-y-auto p-4 space-y-4 bg-white/5 rounded-lg mb-4">
              {messages.filter(msg => msg.therapist === selectedTherapist).map((message, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    message.role === 'user'
                      ? 'bg-indigo-600 text-white'
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
                      <span>{therapyTeam.find(t => t.id === selectedTherapist)?.name} is listening...</span>
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
                placeholder={`Share your feelings with ${therapyTeam.find(t => t.id === selectedTherapist)?.name}...`}
                className="flex-1 bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:border-indigo-500"
                disabled={isLoading}
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={isLoading || !input.trim()}
                className="bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg px-4 py-3 transition-colors"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
