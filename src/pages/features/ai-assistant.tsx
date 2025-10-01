import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { 
  MessageCircle, Bot, Sparkles, Zap, Brain, Users, Award, Clock, 
  Star, TrendingUp, Lock, Target, BarChart3, PieChart, 
  ArrowRight, CheckCircle, Play, Pause, Volume2, VolumeX,
  ChevronRight, ChevronLeft, Plus, Minus, Settings, Bell,
  Crown, Flame, Rocket, Gem, Compass, Telescope, Lightbulb,
  Heart, ThumbsUp, ThumbsDown, Smile, Frown, Meh, 
  Coffee, Moon, Sun, Cloud, Rainbow, Shield
} from 'lucide-react';

const AIAssistantPage = () => {
  const [activeDemo, setActiveDemo] = useState('conversation');
  const [isTyping, setIsTyping] = useState(false);
  const [currentMessage, setCurrentMessage] = useState('');
  const [conversationStage, setConversationStage] = useState(0);

  // AI Personality Data
  const aiPersonalities = [
    {
      name: "FinComedy",
      role: "Financial Comedian",
      specialty: "Makes complex finance fun & memorable",
      superpower: "Turns boring numbers into hilarious stories",
      color: "from-yellow-400 to-orange-500",
      icon: "🎭",
      description: "Your AI that never lets finance be boring. Explains complex concepts through humor and relatable examples."
    },
    {
      name: "MoneyMentor",
      role: "Strategic Advisor",
      specialty: "Long-term financial planning & wisdom",
      superpower: "Sees patterns others miss",
      color: "from-blue-500 to-cyan-500",
      icon: "🧠",
      description: "The wise AI that helps you think strategically about money, not just react to today's problems."
    },
    {
      name: "BudgetBuddy",
      role: "Daily Finance Coach",
      specialty: "Everyday money management & motivation",
      superpower: "Keeps you accountable with charm",
      color: "from-green-500 to-emerald-500",
      icon: "💚",
      description: "Your daily companion that makes budgeting feel like hanging out with a supportive friend."
    }
  ];

  // Conversation Examples
  const conversationExamples = [
    {
      user: "I'm terrible with money, help!",
      ai: "Hey there, Money-Challenged Human! 😄 Don't worry, you're not terrible - you're just untrained! Think of me as your personal finance gym buddy. We'll start with baby steps and before you know it, you'll be doing financial push-ups like a pro! 💪 What's your biggest money struggle right now?",
      mood: "encouraging",
      personality: "FinComedy"
    },
    {
      user: "Should I invest in crypto?",
      ai: "Ah, the crypto question! 🚀 Look, I'm not here to tell you what to do, but let me ask you this: Would you bet your rent money on a coin flip? Because that's basically what crypto is right now - exciting, unpredictable, and potentially life-changing (in both directions!). Let's talk about your risk tolerance first...",
      mood: "cautious",
      personality: "MoneyMentor"
    },
    {
      user: "I keep overspending on coffee",
      ai: "Oh, the daily coffee addiction! ☕ I get it - that morning ritual is sacred. But here's a fun challenge: What if we made your coffee habit work FOR you instead of against you? We could set up a 'Coffee Investment Fund' where every $5 you save on coffee goes into a fun goal. Want to try it?",
      mood: "playful",
      personality: "BudgetBuddy"
    }
  ];

  // AI Capabilities
  const aiCapabilities = [
    {
      title: "24/7 Financial Comedy",
      description: "Your AI never sleeps and never runs out of jokes about money",
      icon: "😄",
      color: "from-yellow-400 to-orange-500"
    },
    {
      title: "Personalized Money Stories",
      description: "AI creates relatable financial narratives just for you",
      icon: "📚",
      color: "from-purple-400 to-pink-500"
    },
    {
      title: "Emotional Intelligence",
      description: "Understands your financial mood and adapts accordingly",
      icon: "❤️",
      color: "from-red-400 to-pink-500"
    },
    {
      title: "Strategic Humor",
      description: "Makes complex financial planning entertaining and memorable",
      icon: "🎯",
      color: "from-blue-400 to-cyan-500"
    }
  ];

  // Simulate typing effect
  useEffect(() => {
    if (isTyping) {
      const timer = setTimeout(() => {
        setIsTyping(false);
        setCurrentMessage(conversationExamples[conversationStage]?.ai || '');
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isTyping, conversationStage]);

  const startConversation = () => {
    setIsTyping(true);
    setCurrentMessage('');
    setConversationStage(0);
  };

  const nextConversation = () => {
    if (conversationStage < conversationExamples.length - 1) {
      setConversationStage(conversationStage + 1);
      setIsTyping(true);
      setCurrentMessage('');
    }
  };

  return (
    <>
      <Helmet>
        <title>AI Assistant - Your Financial Comedy Partner | XspensesAI</title>
        <meta name="description" content="Meet your AI financial comedian, strategic advisor, and daily money coach. Where finance meets entertainment - your AI never sleeps, never bores!" />
      </Helmet>

             {/* Hero Section - AI Conversation Theater */}
       <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center relative overflow-hidden pt-20">
         {/* Animated Background Elements */}
         <div className="absolute inset-0 overflow-hidden">
           <div className="absolute top-20 left-20 w-32 h-32 bg-purple-500/20 rounded-full blur-3xl animate-pulse"></div>
           <div className="absolute top-40 right-32 w-24 h-24 bg-pink-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
           <div className="absolute bottom-32 left-32 w-28 h-28 bg-blue-500/20 rounded-full blur-3xl animate-pulse delay-2000"></div>
         </div>

         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
           {/* Prime's Crown Badge */}
           <div
             className="inline-flex items-center bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400 text-white px-4 py-2 rounded-full mb-8 shadow-2xl"
           >
             <Crown size={20} className="mr-2" />
             <span className="font-bold">Prime's AI Entertainment Division</span>
           </div>

        <h1
              className="text-4xl md:text-7xl font-bold text-white mb-8"
        >
              Meet Your AI <span className="text-yellow-400 font-extrabold drop-shadow-lg">Financial Comedian</span>
        </h1>

          <h2
            className="text-2xl md:text-3xl font-bold text-white/90 mb-6"
          >
            Where Finance Meets Entertainment - Your AI Never Sleeps, Never Bores
          </h2>

        <p
             className="text-lg md:text-xl text-white/80 mb-12 max-w-4xl mx-auto leading-relaxed"
           >
             Step into the AI Conversation Theater where your AI assistant transforms boring financial advice into 
             <span className="text-yellow-300 font-bold"> hilarious conversations</span>, 
             <span className="text-cyan-300 font-bold"> strategic insights</span>, and 
             <span className="text-pink-300 font-bold"> daily motivation</span>. 
                           But don't let the fun fool you - our AI delivers <span className="text-green-300 font-bold">professional-grade financial expertise</span> that actually improves your money situation. Because managing money should be as entertaining as it is profitable!
        </p>

          {/* CTA Buttons */}
        <div
            className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16"
          >
            <button
              onClick={startConversation}
              className="bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400 text-white px-8 py-4 rounded-2xl font-bold text-lg hover:scale-105 transition-transform duration-200 shadow-2xl flex items-center"
            >
              <MessageCircle size={24} className="mr-2" />
              Start AI Conversation
            </button>
          <Link
              to="/ai-employees"
              className="bg-white/10 backdrop-blur-md text-white px-8 py-4 rounded-2xl font-bold text-lg hover:bg-white/20 transition-colors duration-200 border border-white/20 flex items-center"
          >
              <Users size={24} className="mr-2" />
              Meet the Full AI Team
          </Link>
        </div>

          {/* Performance Stats */}
        <div
            className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto"
        >
          <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-yellow-400 mb-2">24/7</div>
              <div className="text-white/70">Always Available</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-pink-400 mb-2">∞</div>
              <div className="text-white/70">Jokes & Stories</div>
          </div>
          <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-cyan-400 mb-2">100%</div>
              <div className="text-white/70">Entertainment</div>
          </div>
          <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-orange-400 mb-2">0%</div>
              <div className="text-white/70">Boring Finance</div>
          </div>
        </div>
                </div>
              </div>

      {/* AI Personalities Showcase */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
            Your AI <span className="text-yellow-400 font-extrabold drop-shadow-lg">Personality Squad</span>
          </h2>
          <p className="text-xl text-white/70 max-w-3xl mx-auto">
            Each AI personality brings a unique flavor to your financial journey - from comedy to strategy to daily motivation
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {aiPersonalities.map((personality, index) => (
            <div
              key={personality.name}
              className="bg-gradient-to-br from-white/5 to-white/10 backdrop-blur-md rounded-3xl p-8 border border-white/20 hover:border-white/40 transition-all duration-300 hover:scale-105"
            >
              <div className="text-center mb-6">
                <div className={`w-20 h-20 bg-gradient-to-r ${personality.color} rounded-full flex items-center justify-center mx-auto mb-4 shadow-2xl`}>
                  <span className="text-4xl">{personality.icon}</span>
            </div>
                <h3 className="text-2xl font-bold text-white mb-2">{personality.name}</h3>
                <p className="text-yellow-400 font-semibold">{personality.role}</p>
          </div>
              
            <div className="space-y-4">
                <div>
                  <h4 className="text-white font-semibold mb-2">Specialty</h4>
                  <p className="text-white/70">{personality.specialty}</p>
                </div>
                <div>
                  <h4 className="text-white font-semibold mb-2">Superpower</h4>
                  <p className="text-white/70">{personality.superpower}</p>
                </div>
                <p className="text-white/80 text-sm leading-relaxed">{personality.description}</p>
              </div>
            </div>
          ))}
                </div>
              </div>

      {/* Live AI Conversation Demo */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
            <span className="text-yellow-400 font-extrabold drop-shadow-lg">Live AI</span> Conversation Theater
          </h2>
          <p className="text-xl text-white/70 max-w-3xl mx-auto">
            Watch your AI personalities in action - see how they transform boring financial questions into entertaining conversations
          </p>
        </div>

        <div className="bg-gradient-to-br from-white/5 to-white/10 backdrop-blur-md rounded-3xl p-8 border border-white/20">
          {/* Conversation Display */}
          <div className="bg-slate-800 rounded-2xl p-6 mb-8 min-h-64">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              </div>
              <span className="text-white/50 text-sm">AI Conversation Demo</span>
                </div>
            
            <div className="space-y-4">
              {/* User Message */}
              <div className="flex justify-end">
                <div className="bg-blue-600 text-white px-4 py-2 rounded-2xl rounded-br-md max-w-xs">
                  {conversationExamples[conversationStage]?.user}
                </div>
              </div>
              
              {/* AI Response */}
              <div className="flex justify-start">
                <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-2 rounded-2xl rounded-bl-md max-w-md">
                  {isTyping ? (
                    <div className="flex items-center space-x-1">
                      <span>AI is typing</span>
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-white rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-white rounded-full animate-bounce delay-100"></div>
                        <div className="w-2 h-2 bg-white rounded-full animate-bounce delay-200"></div>
                </div>
              </div>
                  ) : (
                    <div>
                      <div className="text-xs text-white/70 mb-1">
                        {conversationExamples[conversationStage]?.personality} • {conversationExamples[conversationStage]?.mood}
                </div>
                      {currentMessage}
                </div>
                  )}
              </div>
            </div>
          </div>
        </div>

          {/* Controls */}
          <div className="flex justify-center space-x-4">
            <button
              onClick={startConversation}
              className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-6 py-3 rounded-xl font-semibold hover:scale-105 transition-transform duration-200 flex items-center"
            >
              <Play size={20} className="mr-2" />
              Start Demo
            </button>
            <button
              onClick={nextConversation}
              disabled={conversationStage >= conversationExamples.length - 1}
              className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-6 py-3 rounded-xl font-semibold hover:scale-105 transition-transform duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              <ChevronRight size={20} className="mr-2" />
              Next Conversation
            </button>
          </div>
        </div>
      </div>

      {/* AI Capabilities */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
            Why Your AI is <span className="text-yellow-400 font-extrabold drop-shadow-lg">Entertainment Gold</span>
        </h2>
          <p className="text-xl text-white/70 max-w-3xl mx-auto">
            Beyond just financial advice - your AI creates an experience that makes you actually want to talk about money
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {aiCapabilities.map((capability, index) => (
            <div
              key={capability.title}
              className="bg-gradient-to-br from-white/5 to-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 hover:border-white/40 transition-all duration-300"
            >
              <div className="flex items-start space-x-4">
                <div className={`w-16 h-16 bg-gradient-to-r ${capability.color} rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0`}>
                  <span className="text-3xl">{capability.icon}</span>
              </div>
                <div>
                  <h3 className="text-xl font-bold text-white mb-2">{capability.title}</h3>
                  <p className="text-white/70">{capability.description}</p>
              </div>
            </div>
            </div>
          ))}
          </div>
        </div>
        
             {/* Financial Assistance Capabilities */}
       <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
         <div
           className="text-center mb-16"
         >
           <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
             Serious <span className="text-blue-400 font-extrabold drop-shadow-lg">Financial Expertise</span> Behind the Fun
           </h2>
           <p className="text-xl text-white/70 max-w-3xl mx-auto">
             While we make finance entertaining, our AI delivers professional-grade financial assistance that actually improves your money situation
           </p>
         </div>

                   <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-12">
           <div
             className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 backdrop-blur-md rounded-2xl p-8 border border-blue-500/20 hover:border-blue-500/40 transition-all duration-300"
           >
             <div className="flex items-start space-x-6">
               <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0">
                 <BarChart3 size={32} className="text-white" />
            </div>
               <div>
                 <h3 className="text-xl font-bold text-white mb-3">Budget Analysis & Planning</h3>
                 <p className="text-white/70 leading-relaxed">AI analyzes your spending patterns and creates personalized budgets that actually work for your lifestyle</p>
            </div>
          </div>
           </div>

           <div
             className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 backdrop-blur-md rounded-2xl p-8 border border-green-500/20 hover:border-green-500/40 transition-all duration-300"
           >
             <div className="flex items-start space-x-6">
               <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0">
                 <TrendingUp size={32} className="text-white" />
          </div>
               <div>
                 <h3 className="text-xl font-bold text-white mb-3">Investment Guidance</h3>
                 <p className="text-white/70 leading-relaxed">Get personalized investment advice based on your risk tolerance, goals, and current financial situation</p>
          </div>
        </div>
           </div>

           <div
             className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 backdrop-blur-md rounded-2xl p-8 border border-purple-500/20 hover:border-purple-500/40 transition-all duration-300"
           >
             <div className="flex items-start space-x-6">
               <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0">
                 <Target size={32} className="text-white" />
          </div>
          <div>
                 <h3 className="text-xl font-bold text-white mb-3">Goal Setting & Tracking</h3>
                 <p className="text-white/70 leading-relaxed">Set realistic financial goals and track your progress with AI-powered insights and motivation</p>
                </div>
              </div>
           </div>

           <div
             className="bg-gradient-to-br from-orange-500/10 to-red-500/10 backdrop-blur-md rounded-2xl p-8 border border-orange-500/20 hover:border-orange-500/40 transition-all duration-300"
           >
             <div className="flex items-start space-x-6">
               <div className="w-16 h-16 bg-gradient-to-r from-orange-500 to-red-500 rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0">
                 <Shield size={32} className="text-white" />
                </div>
                <div>
                 <h3 className="text-xl font-bold text-white mb-3">Debt Management</h3>
                 <p className="text-white/70 leading-relaxed">AI helps you create effective debt payoff strategies and avoid common financial pitfalls</p>
                </div>
              </div>
           </div>

           <div
             className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 backdrop-blur-md rounded-2xl p-8 border border-yellow-500/20 hover:border-yellow-500/40 transition-all duration-300"
           >
             <div className="flex items-start space-x-6">
               <div className="w-16 h-16 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0">
                 <Zap size={32} className="text-white" />
                </div>
                <div>
                 <h3 className="text-xl font-bold text-white mb-3">Real-time Financial Monitoring</h3>
                 <p className="text-white/70 leading-relaxed">Get instant alerts and insights about your financial health, spending trends, and opportunities</p>
                </div>
              </div>
           </div>

           <div
             className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 backdrop-blur-md rounded-2xl p-8 border border-cyan-500/20 hover:border-cyan-500/40 transition-all duration-300"
           >
             <div className="flex items-start space-x-6">
               <div className="w-16 h-16 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0">
                 <Brain size={32} className="text-white" />
                </div>
                <div>
                 <h3 className="text-xl font-bold text-white mb-3">Tax Optimization</h3>
                 <p className="text-white/70 leading-relaxed">AI identifies tax-saving opportunities and helps you maximize deductions and credits</p>
                </div>
              </div>
           </div>
          </div>
        </div>

       {/* Call to Action */}
       <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div
          className="bg-gradient-to-r from-yellow-500/20 via-orange-500/20 to-red-500/20 backdrop-blur-md rounded-3xl p-12 border border-white/20 text-center"
        >
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
            Ready to Make Finance <span className="text-yellow-400 font-extrabold drop-shadow-lg">Entertaining</span>?
          </h2>
          <p className="text-xl text-white/80 mb-8 max-w-3xl mx-auto">
            Join thousands of users who've discovered that managing money can actually be fun, engaging, and profitable - 
            all thanks to their AI financial comedians!
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
              to="/pricing"
              className="bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400 text-white px-8 py-4 rounded-2xl font-bold text-lg hover:scale-105 transition-transform duration-200 shadow-2xl flex items-center justify-center"
          >
              <Sparkles size={24} className="mr-2" />
              Start Your AI Comedy Show
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

export default AIAssistantPage; 
