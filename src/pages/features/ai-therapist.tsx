import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { 
  Heart, Brain, Shield, Sparkles, Users, Award, Clock, 
  Star, TrendingUp, Lock, Target, BarChart3, PieChart, 
  ArrowRight, CheckCircle, Play, Pause, Volume2, VolumeX,
  ChevronRight, ChevronLeft, Plus, Minus, Settings, Bell,
  Crown, Flame, Rocket, Gem, Compass, Telescope, Lightbulb,
  ThumbsUp, ThumbsDown, Smile, Frown, Meh, 
  Coffee, Moon, Sun, Cloud, Rainbow, Zap, 
  MessageCircle, Bot, HeartHandshake, Leaf, 
  Sun as SunIcon, Moon as MoonIcon, CloudRain, Wind
} from 'lucide-react';

const AITherapistFeaturePage = () => {
  const [activeSession, setActiveSession] = useState('anxiety');
  const [isTherapyActive, setIsTherapyActive] = useState(false);
  const [currentResponse, setCurrentResponse] = useState('');
  const [sessionStage, setSessionStage] = useState(0);
  const [emotionalState, setEmotionalState] = useState('neutral');

  // AI Therapist Personalities
  const aiTherapists = [
    {
      name: "Dr. Serenity",
      role: "Compassionate Listener",
      specialty: "Emotional validation & safe space creation",
      superpower: "Creates instant emotional safety",
      color: "from-blue-400 to-cyan-500",
      icon: "💙",
      description: "Your gentle guide who listens without judgment and helps you feel heard and understood in your financial journey."
    },
    {
      name: "Dr. Wisdom",
      role: "Pattern Recognition Expert",
      specialty: "Identifying emotional spending triggers",
      superpower: "Sees hidden money-emotion connections",
      color: "from-purple-400 to-pink-500",
      icon: "🧠",
      description: "The insightful therapist who helps you understand why you spend the way you do and how to break negative patterns."
    },
    {
      name: "Dr. Courage",
      role: "Confidence Builder",
      specialty: "Building financial self-esteem",
      superpower: "Transforms fear into empowerment",
      color: "from-yellow-400 to-orange-500",
      icon: "🦁",
      description: "Your motivational coach who helps you overcome money fears and build unshakeable financial confidence."
    },
    {
      name: "Dr. Harmony",
      role: "Balance Specialist",
      specialty: "Creating healthy money-life balance",
      superpower: "Finds harmony between spending & saving",
      color: "from-green-400 to-emerald-500",
      icon: "🌿",
      description: "The holistic therapist who helps you create sustainable financial habits that support your overall wellbeing."
    }
  ];

  // Therapy Session Examples
  const therapySessions = [
    {
      type: "anxiety",
      user: "I'm terrified to check my bank account. What if I'm broke?",
      ai: "I can feel the weight of that fear in your words. It's completely normal to feel anxious about money - it's one of our most primal fears. But here's what I want you to know: you're not alone in this, and avoiding it won't make it better. Let's take this step by step. Can you tell me what's the worst thing you think you'll see?",
      mood: "anxious",
      therapist: "Dr. Serenity",
      color: "from-blue-500 to-cyan-500"
    },
    {
      type: "guilt",
      user: "I feel so guilty about buying that coffee. I should have saved the money.",
      ai: "I hear that guilt loud and clear, and I want to acknowledge something important: you're allowed to enjoy things. That coffee isn't just caffeine - it's a moment of pleasure, a small act of self-care. The guilt you're feeling might be protecting you from something deeper. Let's explore: what would happen if you gave yourself permission to enjoy small pleasures?",
      mood: "guilty",
      therapist: "Dr. Wisdom",
      color: "from-purple-500 to-pink-500"
    },
    {
      type: "shame",
      user: "I'm embarrassed about my debt. I feel like a failure.",
      ai: "I want you to know something: debt doesn't define you. It's a financial situation, not a character flaw. Many successful people have been in debt. What I see is someone who's brave enough to face this head-on. That takes courage. Let's talk about what got you here without judgment, and then we'll create a plan that feels empowering, not shameful.",
      mood: "ashamed",
      therapist: "Dr. Courage",
      color: "from-yellow-500 to-orange-500"
    },
    {
      type: "celebration",
      user: "I just paid off my credit card! I'm so excited but also nervous about celebrating.",
      ai: "This is a HUGE achievement! 🎉 I can feel your excitement, and you absolutely deserve to celebrate this milestone. That nervousness about celebrating? That's your old money mindset trying to protect you. But here's the truth: celebrating wins reinforces positive behavior. You've proven you can do hard things. How would you like to honor this achievement in a way that feels meaningful to you?",
      mood: "excited",
      therapist: "Dr. Harmony",
      color: "from-green-500 to-emerald-500"
    }
  ];

  // Emotional Wellness Journey Stages
  const wellnessStages = [
    {
      stage: "Awareness",
      description: "Recognizing your emotional patterns with money",
      icon: "🔍",
      color: "from-blue-400 to-cyan-500"
    },
    {
      stage: "Acceptance",
      description: "Embracing your feelings without judgment",
      icon: "🤗",
      color: "from-purple-400 to-pink-500"
    },
    {
      stage: "Understanding",
      description: "Discovering why you feel the way you do",
      icon: "🧠",
      color: "from-yellow-400 to-orange-500"
    },
    {
      stage: "Transformation",
      description: "Creating new, healthy money relationships",
      icon: "🦋",
      color: "from-green-400 to-emerald-500"
    },
    {
      stage: "Integration",
      description: "Living with financial peace and confidence",
      icon: "✨",
      color: "from-indigo-400 to-purple-500"
    }
  ];

  // Coping Strategies
  const copingStrategies = [
    {
      title: "Mindful Money Moments",
      description: "Take 3 deep breaths before any financial decision",
      icon: "🧘",
      color: "from-blue-400 to-cyan-500"
    },
    {
      title: "Gratitude Journaling",
      description: "Write 3 things you're grateful for about money daily",
      icon: "📝",
      color: "from-purple-400 to-pink-500"
    },
    {
      title: "Self-Compassion Breaks",
      description: "Treat yourself with the kindness you'd show a friend",
      icon: "💝",
      color: "from-yellow-400 to-orange-500"
    },
    {
      title: "Progress Celebrations",
      description: "Acknowledge every small financial win",
      icon: "🎉",
      color: "from-green-400 to-emerald-500"
    }
  ];

  // Simulate therapy response
  useEffect(() => {
    if (isTherapyActive) {
      const timer = setTimeout(() => {
        setIsTherapyActive(false);
        setCurrentResponse(therapySessions.find(s => s.type === activeSession)?.ai || '');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isTherapyActive, activeSession]);

  const startTherapySession = () => {
    setIsTherapyActive(true);
    setCurrentResponse('');
    setSessionStage(0);
  };

  const nextSession = () => {
    const currentIndex = therapySessions.findIndex(s => s.type === activeSession);
    if (currentIndex < therapySessions.length - 1) {
      const nextSessionData = therapySessions[currentIndex + 1];
      setActiveSession(nextSessionData.type);
      setIsTherapyActive(true);
      setCurrentResponse('');
    }
  };

  const getCurrentSession = () => {
    return therapySessions.find(s => s.type === activeSession) || therapySessions[0];
  };

  return (
    <>
      <Helmet>
        <title>AI Financial Therapist - Your Emotional Healing Sanctuary | XspensesAI</title>
        <meta name="description" content="Meet your AI Financial Therapist - where money meets mental wellness. Heal your relationship with money through compassionate AI therapy, emotional support, and personalized healing journeys." />
      </Helmet>

      {/* Hero Section - AI Emotional Healing Sanctuary */}
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-blue-900 flex items-center justify-center relative overflow-hidden pt-20">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 left-20 w-32 h-32 bg-blue-500/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute top-40 right-32 w-24 h-24 bg-purple-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
          <div className="absolute bottom-32 left-32 w-28 h-28 bg-indigo-500/20 rounded-full blur-3xl animate-pulse delay-2000"></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          {/* Prime's Crown Badge */}
          <div
            className="inline-flex items-center bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400 text-white px-4 py-2 rounded-full mb-8 shadow-2xl"
          >
            <Crown size={20} className="mr-2" />
            <span className="font-bold">Prime's AI Mental Wellness Division</span>
          </div>

          <h1
            className="text-4xl md:text-7xl font-bold text-white mb-8"
          >
            Meet Your AI <span className="text-blue-400 font-extrabold drop-shadow-lg">Financial Therapist</span>
          </h1>

          <h2
            className="text-2xl md:text-3xl font-bold text-white/90 mb-6"
          >
            Where Money Meets Mental Wellness - Your Emotional Healing Sanctuary
          </h2>

          <p
            className="text-lg md:text-xl text-white/80 mb-12 max-w-4xl mx-auto leading-relaxed"
          >
            Step into the world's first AI Emotional Healing Sanctuary where your AI therapist understands that money isn't just numbers - 
            it's <span className="text-blue-300 font-bold">emotions</span>, <span className="text-purple-300 font-bold">memories</span>, and <span className="text-green-300 font-bold">deep-seated beliefs</span>. 
            Heal your relationship with money through compassionate AI therapy that creates a safe space for your financial journey.
          </p>

          {/* CTA Buttons */}
          <div
            className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16"
          >
            <button
              onClick={startTherapySession}
              className="bg-gradient-to-r from-blue-400 via-purple-400 to-indigo-400 text-white px-8 py-4 rounded-2xl font-bold text-lg hover:scale-105 transition-transform duration-200 shadow-2xl flex items-center"
            >
              <Heart size={24} className="mr-2" />
              Start Your Healing Journey
            </button>
            <Link
              to="/ai-employees"
              className="bg-white/10 backdrop-blur-md text-white px-8 py-4 rounded-2xl font-bold text-lg hover:bg-white/20 transition-colors duration-200 border border-white/20 flex items-center"
            >
              <Users size={24} className="mr-2" />
              Meet the Full AI Team
            </Link>
          </div>

          {/* Wellness Stats */}
          <div
            className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto"
          >
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-blue-400 mb-2">24/7</div>
              <div className="text-white/70">Emotional Support</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-purple-400 mb-2">100%</div>
              <div className="text-white/70">Judgment-Free</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-indigo-400 mb-2">∞</div>
              <div className="text-white/70">Compassion</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-cyan-400 mb-2">0%</div>
              <div className="text-white/70">Shame</div>
            </div>
          </div>
        </div>
      </div>

      {/* AI Therapist Personalities */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
            Your AI <span className="text-blue-400 font-extrabold drop-shadow-lg">Therapy Team</span>
          </h2>
          <p className="text-xl text-white/70 max-w-3xl mx-auto">
            Each AI therapist brings unique expertise to your emotional wellness journey - from compassionate listening to pattern recognition
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {aiTherapists.map((therapist, index) => (
            <div
              key={therapist.name}
              className="bg-gradient-to-br from-white/5 to-white/10 backdrop-blur-md rounded-3xl p-8 border border-white/20 hover:border-white/40 transition-all duration-300 hover:scale-105"
            >
              <div className="text-center mb-6">
                <div className={`w-20 h-20 bg-gradient-to-r ${therapist.color} rounded-full flex items-center justify-center mx-auto mb-4 shadow-2xl`}>
                  <span className="text-4xl">{therapist.icon}</span>
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">{therapist.name}</h3>
                <p className="text-blue-400 font-semibold">{therapist.role}</p>
              </div>
              
              <div className="space-y-4">
                <div>
                  <h4 className="text-white font-semibold mb-2">Specialty</h4>
                  <p className="text-white/70">{therapist.specialty}</p>
                </div>
                <div>
                  <h4 className="text-white font-semibold mb-2">Superpower</h4>
                  <p className="text-white/70">{therapist.superpower}</p>
                </div>
                <p className="text-white/80 text-sm leading-relaxed">{therapist.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Live Therapy Session Demo */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
            <span className="text-blue-400 font-extrabold drop-shadow-lg">Live AI</span> Therapy Sessions
          </h2>
          <p className="text-xl text-white/70 max-w-3xl mx-auto">
            Experience real AI therapy in action - see how your AI therapists provide emotional support and practical guidance
          </p>
        </div>

        <div className="bg-gradient-to-br from-white/5 to-white/10 backdrop-blur-md rounded-3xl p-8 border border-white/20">
          {/* Session Type Selector */}
          <div className="flex flex-wrap justify-center gap-4 mb-8">
            {therapySessions.map((session) => (
              <button
                key={session.type}
                onClick={() => setActiveSession(session.type)}
                className={`px-6 py-3 rounded-xl font-semibold transition-all duration-200 ${
                  activeSession === session.type
                    ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg'
                    : 'bg-white/10 text-white/70 hover:bg-white/20'
                }`}
              >
                {session.type.charAt(0).toUpperCase() + session.type.slice(1)}
              </button>
            ))}
          </div>

          {/* Therapy Display */}
          <div className="bg-slate-800 rounded-2xl p-6 mb-8 min-h-64">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              </div>
              <span className="text-white/50 text-sm">AI Therapy Session - {getCurrentSession().therapist}</span>
            </div>
            
            <div className="space-y-4">
              {/* User Message */}
              <div className="flex justify-end">
                <div className="bg-blue-600 text-white px-4 py-2 rounded-2xl rounded-br-md max-w-xs">
                  {getCurrentSession().user}
                </div>
            </div>
              
              {/* AI Response */}
              <div className="flex justify-start">
                <div className={`bg-gradient-to-r ${getCurrentSession().color} text-white px-4 py-2 rounded-2xl rounded-bl-md max-w-md`}>
                  {isTherapyActive ? (
                    <div className="flex items-center space-x-1">
                      <span>AI is responding with compassion...</span>
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-white rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-white rounded-full animate-bounce delay-100"></div>
                        <div className="w-2 h-2 bg-white rounded-full animate-bounce delay-200"></div>
          </div>
              </div>
                  ) : (
                    <div>
                      <div className="text-xs text-white/70 mb-1">
                        {getCurrentSession().therapist} • {getCurrentSession().mood}
                </div>
                      {currentResponse}
                </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex justify-center space-x-4">
            <button
              onClick={startTherapySession}
              className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-6 py-3 rounded-xl font-semibold hover:scale-105 transition-transform duration-200 flex items-center"
            >
              <Play size={20} className="mr-2" />
              Start Session
            </button>
            <button
              onClick={nextSession}
              disabled={activeSession === therapySessions[therapySessions.length - 1].type}
              className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-6 py-3 rounded-xl font-semibold hover:scale-105 transition-transform duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              <ChevronRight size={20} className="mr-2" />
              Next Session
            </button>
        </div>
            </div>
            </div>

      {/* Emotional Wellness Journey */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
            Your <span className="text-purple-400 font-extrabold drop-shadow-lg">Emotional Wellness</span> Journey
          </h2>
          <p className="text-xl text-white/70 max-w-3xl mx-auto">
            Transform your relationship with money through a structured healing process designed for lasting change
          </p>
        </div>

        <div className="relative">
          {/* Connection Line */}
          <div className="absolute top-1/2 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-indigo-500 transform -translate-y-1/2 hidden lg:block"></div>
          
          <div className="grid lg:grid-cols-5 gap-8">
            {wellnessStages.map((stage, index) => (
              <div
                key={stage.stage}
                className="relative text-center"
              >
                <div className={`w-20 h-20 bg-gradient-to-r ${stage.color} rounded-full flex items-center justify-center mx-auto mb-4 shadow-2xl text-3xl`}>
                  {stage.icon}
            </div>
                <h3 className="text-xl font-bold text-white mb-2">{stage.stage}</h3>
                <p className="text-white/70 text-sm">{stage.description}</p>
              </div>
            ))}
            </div>
          </div>
        </div>

      {/* Coping Strategies */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
            <span className="text-green-400 font-extrabold drop-shadow-lg">Coping Strategies</span> for Financial Wellness
          </h2>
          <p className="text-xl text-white/70 max-w-3xl mx-auto">
            Practical techniques and daily practices to support your emotional healing journey
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {copingStrategies.map((strategy, index) => (
            <div
              key={strategy.title}
              className="bg-gradient-to-br from-white/5 to-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 hover:border-white/40 transition-all duration-300"
            >
              <div className="flex items-start space-x-4">
                <div className={`w-16 h-16 bg-gradient-to-r ${strategy.color} rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0`}>
                  <span className="text-3xl">{strategy.icon}</span>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white mb-2">{strategy.title}</h3>
                  <p className="text-white/70">{strategy.description}</p>
                </div>
            </div>
            </div>
          ))}
            </div>
            </div>

      {/* Safe Space Features */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
            Your <span className="text-indigo-400 font-extrabold drop-shadow-lg">Safe Space</span> Guarantee
          </h2>
          <p className="text-xl text-white/70 max-w-3xl mx-auto">
            Complete privacy, judgment-free support, and professional AI therapy standards
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div
            className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 backdrop-blur-md rounded-2xl p-8 border border-blue-500/20 text-center"
          >
            <Lock size={48} className="text-blue-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-3">100% Confidential</h3>
            <p className="text-white/70">Your sessions are completely private and secure</p>
          </div>

          <div
            className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 backdrop-blur-md rounded-2xl p-8 border border-purple-500/20 text-center"
          >
            <Heart size={48} className="text-purple-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-3">Judgment-Free Zone</h3>
            <p className="text-white/70">Complete acceptance of your financial journey</p>
          </div>

          <div
            className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 backdrop-blur-md rounded-2xl p-8 border border-green-500/20 text-center"
          >
            <Clock size={48} className="text-green-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-3">24/7 Support</h3>
            <p className="text-white/70">Never alone with your money worries</p>
          </div>

          <div
            className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 backdrop-blur-md rounded-2xl p-8 border border-yellow-500/20 text-center"
          >
            <Award size={48} className="text-yellow-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-3">Professional Standards</h3>
            <p className="text-white/70">AI trained in therapeutic techniques</p>
          </div>
            </div>
          </div>

      {/* Call to Action */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div
          className="bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-indigo-500/20 backdrop-blur-md rounded-3xl p-12 border border-white/20 text-center"
        >
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
            Ready to Heal Your <span className="text-blue-400 font-extrabold drop-shadow-lg">Money Relationship</span>?
          </h2>
          <p className="text-xl text-white/80 mb-8 max-w-3xl mx-auto">
            Join thousands of users who've found emotional peace with money through compassionate AI therapy. 
            Your healing journey starts here.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/pricing"
              className="bg-gradient-to-r from-blue-400 via-purple-400 to-indigo-400 text-white px-8 py-4 rounded-2xl font-bold text-lg hover:scale-105 transition-transform duration-200 shadow-2xl flex items-center justify-center"
            >
              <Sparkles size={24} className="mr-2" />
              Start Your Healing Journey
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

export default AITherapistFeaturePage; 
