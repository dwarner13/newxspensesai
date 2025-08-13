import React, { useState, useRef, useEffect } from 'react';
import { 
  Zap, Bot, Play, Pause, Edit, Trash2, Plus, Settings, Clock, CheckCircle, 
  AlertTriangle, TrendingUp, Users, Trophy, Star, Copy, Share2, MessageCircle,
  Send, Brain, Workflow, Timer, Calendar, Target, Lightbulb,
  ChevronRight, ChevronDown, ChevronUp, ExternalLink, Download, Upload,
  BarChart3, Activity, Sparkles, Crown, Medal, Gift, Rocket, Shield,
  Target as GoalIcon, BookOpen, HelpCircle, ChevronLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import SpecializedChatBot from '../../components/chat/SpecializedChatBot';

interface Automation {
  id: string;
  name: string;
  description: string;
  category: 'expense' | 'receipt' | 'budget' | 'notification' | 'report' | 'custom';
  status: 'active' | 'paused' | 'error' | 'draft';
  lastRun: string;
  nextRun: string;
  runsThisMonth: number;
  timeSaved: number; // in minutes
  successRate: number;
  isEnabled: boolean;
  trigger: string;
  action: string;
  icon: string;
}

interface SuggestedAutomation {
  id: string;
  name: string;
  description: string;
  category: string;
  estimatedTimeSaved: number;
  difficulty: 'easy' | 'medium' | 'hard';
  popularity: number;
  icon: string;
  aiReason: string;
}

interface AutomationRecipe {
  id: string;
  name: string;
  description: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
  timeToSetup: number;
  estimatedSavings: number;
  popularity: number;
  tags: string[];
  icon: string;
  template: string;
}

interface ChatMessage {
  id: string;
  type: 'user' | 'ai';
  message: string;
  timestamp: string;
}

interface AutomationActivity {
  id: string;
  automationName: string;
  action: string;
  timestamp: string;
  status: 'success' | 'error' | 'warning';
  details: string;
  timeSaved: number;
}

interface LeaderboardEntry {
  id: string;
  name: string;
  automations: number;
  timeSaved: number;
  rank: number;
  badge: string;
  avatar: string;
}

const SmartAutomation = () => {
  const [chatMessage, setChatMessage] = useState('');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([
    {
      id: '1',
      type: 'ai',
      message: "Hello! I'm AutoBot, your AI automation coach. I can help you discover, build, and optimize automations to save time and money. What would you like to automate today?",
      timestamp: new Date().toISOString()
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [showBuilder, setShowBuilder] = useState(false);
  const [builderInput, setBuilderInput] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Mock active automations
  const activeAutomations: Automation[] = [
    {
      id: '1',
      name: 'Auto-Categorize Expenses',
      description: 'Automatically categorize new expenses based on merchant and amount patterns',
      category: 'expense',
      status: 'active',
      lastRun: '2 hours ago',
      nextRun: 'In 4 hours',
      runsThisMonth: 47,
      timeSaved: 180,
      successRate: 94,
      isEnabled: true,
      trigger: 'New expense added',
      action: 'Categorize based on AI patterns',
      icon: 'Zap'
    },
    {
      id: '2',
      name: 'Receipt Matching',
      description: 'Match uploaded receipts with existing transactions',
      category: 'receipt',
      status: 'active',
      lastRun: '1 hour ago',
      nextRun: 'In 2 hours',
      runsThisMonth: 23,
      timeSaved: 120,
      successRate: 89,
      isEnabled: true,
      trigger: 'Receipt uploaded',
      action: 'Match with transactions',
      icon: 'Upload'
    },
    {
      id: '3',
      name: 'Budget Alert System',
      description: 'Send notifications when spending approaches budget limits',
      category: 'budget',
      status: 'active',
      lastRun: '30 minutes ago',
      nextRun: 'In 1 hour',
      runsThisMonth: 156,
      timeSaved: 240,
      successRate: 98,
      isEnabled: true,
      trigger: 'Spending threshold reached',
      action: 'Send alert notification',
      icon: 'Bell'
    },
    {
      id: '4',
      name: 'Weekly Report Generator',
      description: 'Generate and email weekly spending reports',
      category: 'report',
      status: 'paused',
      lastRun: '1 week ago',
      nextRun: 'Paused',
      runsThisMonth: 4,
      timeSaved: 60,
      successRate: 100,
      isEnabled: false,
      trigger: 'Every Sunday at 9 AM',
      action: 'Generate and email report',
      icon: 'FileText'
    }
  ];

  // Mock suggested automations
  const suggestedAutomations: SuggestedAutomation[] = [
    {
      id: '1',
      name: 'Smart Tax Preparation',
      description: 'Automatically organize expenses for tax season',
      category: 'tax',
      estimatedTimeSaved: 300,
      difficulty: 'medium',
      popularity: 95,
      icon: 'Calculator',
      aiReason: 'Based on your tax-related expenses and upcoming deadlines'
    },
    {
      id: '2',
      name: 'Subscription Monitor',
      description: 'Track and alert on recurring subscription changes',
      category: 'monitoring',
      estimatedTimeSaved: 120,
      difficulty: 'easy',
      popularity: 87,
      icon: 'Clock',
      aiReason: 'You have 8 active subscriptions that could be optimized'
    },
    {
      id: '3',
      name: 'Investment Sync',
      description: 'Sync investment transactions with your portfolio',
      category: 'investment',
      estimatedTimeSaved: 180,
      difficulty: 'hard',
      popularity: 72,
      icon: 'TrendingUp',
      aiReason: 'Based on your investment account activity'
    }
  ];

  // Mock automation recipes
  const automationRecipes: AutomationRecipe[] = [
    {
      id: '1',
      name: 'Expense Categorization Pro',
      description: 'Advanced AI-powered expense categorization with learning',
      category: 'expense',
      difficulty: 'medium',
      timeToSetup: 5,
      estimatedSavings: 240,
      popularity: 98,
      tags: ['AI', 'Learning', 'Popular'],
      icon: 'Brain',
      template: 'if new_expense then categorize_with_ai'
    },
    {
      id: '2',
      name: 'Receipt Processor',
      description: 'Extract data from receipts and match transactions',
      category: 'receipt',
      difficulty: 'easy',
      timeToSetup: 3,
      estimatedSavings: 180,
      popularity: 94,
      tags: ['OCR', 'Quick Setup'],
      icon: 'Camera',
      template: 'if receipt_uploaded then extract_and_match'
    },
    {
      id: '3',
      name: 'Budget Guardian',
      description: 'Smart budget monitoring with predictive alerts',
      category: 'budget',
      difficulty: 'medium',
      timeToSetup: 7,
      estimatedSavings: 300,
      popularity: 89,
      tags: ['Predictive', 'Alerts'],
      icon: 'Shield',
      template: 'if spending_trend > threshold then alert_user'
    },
    {
      id: '4',
      name: 'Tax Time Saver',
      description: 'Automated tax preparation and organization',
      category: 'tax',
      difficulty: 'hard',
      timeToSetup: 10,
      estimatedSavings: 480,
      popularity: 85,
      tags: ['Tax', 'Seasonal'],
      icon: 'Calculator',
      template: 'if tax_season then organize_expenses'
    }
  ];

  // Mock activity feed
  const automationActivities: AutomationActivity[] = [
    {
      id: '1',
      automationName: 'Auto-Categorize Expenses',
      action: 'Categorized 12 new expenses',
      timestamp: '2 hours ago',
      status: 'success',
      details: 'Successfully categorized 12 expenses with 94% accuracy',
      timeSaved: 15
    },
    {
      id: '2',
      automationName: 'Receipt Matching',
      action: 'Matched 5 receipts',
      timestamp: '1 hour ago',
      status: 'success',
      details: 'Matched 5 receipts with existing transactions',
      timeSaved: 10
    },
    {
      id: '3',
      automationName: 'Budget Alert System',
      action: 'Sent budget warning',
      timestamp: '30 minutes ago',
      status: 'warning',
      details: 'Alert sent: Groceries category at 85% of monthly budget',
      timeSaved: 5
    }
  ];

  // Mock leaderboard
  const leaderboard: LeaderboardEntry[] = [
    {
      id: '1',
      name: 'Sarah Chen',
      automations: 12,
      timeSaved: 480,
      rank: 1,
      badge: 'Automation Master',
      avatar: '👑'
    },
    {
      id: '2',
      name: 'Mike Johnson',
      automations: 8,
      timeSaved: 360,
      rank: 2,
      badge: 'Efficiency Expert',
      avatar: '⭐'
    },
    {
      id: '3',
      name: 'Lisa Park',
      automations: 6,
      timeSaved: 240,
      rank: 3,
      badge: 'Time Saver',
      avatar: '🏆'
    }
  ];

  const handleSendMessage = async () => {
    if (!chatMessage.trim()) return;

    const userMessage = chatMessage;
    setChatMessage('');
    setChatHistory(prev => [...prev, { 
      id: Date.now().toString(),
      type: 'user', 
      message: userMessage,
      timestamp: new Date().toISOString()
    }]);
    setIsLoading(true);

    // Simulate AI response
    setTimeout(() => {
      const aiResponse = generateAutoBotResponse(userMessage);
      setChatHistory(prev => [...prev, { 
        id: (Date.now() + 1).toString(),
        type: 'ai', 
        message: aiResponse,
        timestamp: new Date().toISOString()
      }]);
      setIsLoading(false);
    }, 1000);
  };

  const generateAutoBotResponse = (message: string): string => {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('categorize') || lowerMessage.includes('expense')) {
      return "I can help you set up automatic expense categorization! Based on your spending patterns, I recommend the 'Auto-Categorize Expenses' automation. It uses AI to learn your spending habits and automatically categorizes new expenses with 94% accuracy. Would you like me to set this up for you?";
    }
    
    if (lowerMessage.includes('receipt') || lowerMessage.includes('match')) {
      return "Great choice! The 'Receipt Matching' automation can save you 2 hours per month. It automatically matches uploaded receipts with your transactions and extracts key data. I can set this up in under 3 minutes. Should I proceed?";
    }
    
    if (lowerMessage.includes('budget') || lowerMessage.includes('alert')) {
      return "The 'Budget Guardian' automation is perfect for you! It monitors your spending in real-time and sends smart alerts before you exceed budget limits. It's saved users an average of 5 hours per month. Want me to configure it?";
    }
    
    if (lowerMessage.includes('tax') || lowerMessage.includes('taxes')) {
      return "Tax season automation is a game-changer! I can set up a system that automatically organizes your expenses for tax preparation, tracks deductible items, and generates tax-ready reports. This typically saves 8 hours during tax season. Interested?";
    }
    
    if (lowerMessage.includes('build') || lowerMessage.includes('create')) {
      return "I can help you build custom automations! Just tell me what you want to automate in plain English. For example: 'When I spend over $100, send me an alert' or 'Categorize all coffee shop expenses as Food & Dining'. What would you like to automate?";
    }
    
    return "I can help you discover, build, and optimize automations! I can set up expense categorization, receipt matching, budget alerts, tax preparation, and custom workflows. What would you like to automate today?";
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatHistory]);

  const toggleAutomation = (id: string) => {
    // Toggle automation status
    console.log(`Toggling automation ${id}`);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-400';
      case 'paused': return 'text-yellow-400';
      case 'error': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <Play size={16} className="text-green-400" />;
      case 'paused': return <Pause size={16} className="text-yellow-400" />;
      case 'error': return <AlertTriangle size={16} className="text-red-400" />;
      default: return <Clock size={16} className="text-gray-400" />;
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-500/20 text-green-400';
      case 'medium': return 'bg-yellow-500/20 text-yellow-400';
      case 'hard': return 'bg-red-500/20 text-red-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  const totalTimeSaved = activeAutomations.reduce((sum, automation) => sum + automation.timeSaved, 0);
  const totalRuns = activeAutomations.reduce((sum, automation) => sum + automation.runsThisMonth, 0);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0f172a] to-[#1a1e3a] text-white">
      {/* Header */}
      <header className="p-6">
        <h1 className="text-2xl font-bold">Smart Automation</h1>
        <p className="text-lg text-gray-300 mt-2">Automate your financial workflows and save time</p>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-6">
        <div className="max-w-7xl mx-auto">
          <div className="space-y-8">
            {/* Header Section */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div>
                <h2 className="text-3xl font-bold text-white mb-2">Smart Automation</h2>
                <p className="text-white/70 text-lg">Automate repetitive tasks and workflows to save time and reduce errors</p>
              </div>
              <div className="flex items-center space-x-4">
                <button className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg transition-all flex items-center gap-2">
                  <Plus size={20} />
                  New Automation
                </button>
                <button className="bg-gradient-to-r from-purple-500 to-blue-600 text-white px-4 py-2 rounded-lg transition-all flex items-center gap-2">
                  <Zap size={20} />
                  Quick Setup
                </button>
              </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-blue-600 rounded-full flex items-center justify-center">
                    <Zap size={24} className="text-white" />
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-white">{activeAutomations.filter(a => a.isEnabled).length}</div>
                    <div className="text-white/60 text-sm">Active</div>
                  </div>
                </div>
                <div className="text-white/80 text-sm">Automations running</div>
              </div>

              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-yellow-500 to-orange-600 rounded-full flex items-center justify-center">
                    <Clock size={24} className="text-white" />
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-white">{Math.round(totalTimeSaved / 60)}h</div>
                    <div className="text-white/60 text-sm">Hours</div>
                  </div>
                </div>
                <div className="text-white/80 text-sm">Time saved this month</div>
              </div>

              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-600 rounded-full flex items-center justify-center">
                    <CheckCircle size={24} className="text-white" />
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-white">94%</div>
                    <div className="text-white/60 text-sm">Success</div>
                  </div>
                </div>
                <div className="text-white/80 text-sm">Automation success rate</div>
              </div>

              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-cyan-600 rounded-full flex items-center justify-center">
                    <TrendingUp size={24} className="text-white" />
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-white">{totalRuns}</div>
                    <div className="text-white/60 text-sm">New</div>
                  </div>
                </div>
                <div className="text-white/80 text-sm">Created this month</div>
              </div>
            </div>

            {/* Active Automations */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-blue-600 rounded-full flex items-center justify-center">
                    <Zap size={24} className="text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">Active Automations</h3>
                    <p className="text-white/60 text-sm">Your currently running automations</p>
                  </div>
                </div>
                <button className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg transition-all">
                  View All
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {activeAutomations.map((automation) => (
                  <motion.div
                    key={automation.id}
                    className="bg-white/5 rounded-lg p-4 border border-white/10"
                    whileHover={{ scale: 1.02 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                          <Zap size={20} className="text-white" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <h4 className="font-semibold text-white">{automation.name}</h4>
                            {getStatusIcon(automation.status)}
                            <span className={`text-sm ${getStatusColor(automation.status)}`}>
                              {automation.status}
                            </span>
                          </div>
                          <p className="text-white/60 text-sm mb-2">{automation.description}</p>
                          <div className="flex items-center space-x-4 text-xs text-white/60">
                            <span>Last run: {automation.lastRun}</span>
                            <span>Next run: {automation.nextRun}</span>
                            <span>{automation.runsThisMonth} runs this month</span>
                            <span>Saved {automation.timeSaved} min</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button 
                          onClick={() => toggleAutomation(automation.id)}
                          className={`px-3 py-1 rounded text-sm transition-all ${
                            automation.isEnabled 
                              ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30' 
                              : 'bg-gray-500/20 text-gray-400 hover:bg-gray-500/30'
                          }`}
                        >
                          {automation.isEnabled ? 'Active' : 'Inactive'}
                        </button>
                        <button className="bg-white/10 hover:bg-white/20 text-white p-2 rounded transition-all">
                          <Edit size={16} />
                        </button>
                        <button className="bg-white/10 hover:bg-white/20 text-white p-2 rounded transition-all">
                          <Settings size={16} />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Suggested Automations */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-12 h-12 bg-gradient-to-r from-yellow-500 to-orange-600 rounded-full flex items-center justify-center">
                  <Lightbulb size={24} className="text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Suggested Automations</h3>
                  <p className="text-white/60 text-sm">AI-powered suggestions based on your usage</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {suggestedAutomations.map((automation) => (
                  <motion.div
                    key={automation.id}
                    className="bg-white/5 rounded-lg p-4 border border-white/10"
                    whileHover={{ scale: 1.02 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="flex items-center space-x-3 mb-3">
                      <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-600 rounded-full flex items-center justify-center">
                        <Zap size={20} className="text-white" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-white">{automation.name}</h4>
                        <p className="text-white/60 text-sm">{automation.description}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between mb-3">
                      <span className={`px-2 py-1 rounded-full text-xs ${getDifficultyColor(automation.difficulty)}`}>
                        {automation.difficulty}
                      </span>
                      <span className="text-white/60 text-sm">
                        Saves {automation.estimatedTimeSaved} min/month
                      </span>
                    </div>
                    
                    <p className="text-blue-300 text-sm mb-3">{automation.aiReason}</p>
                    
                    <button className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-4 py-2 rounded-lg transition-all">
                      Set Up Automation
                    </button>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Automation Gallery/Recipes */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-600 rounded-full flex items-center justify-center">
                    <Workflow size={24} className="text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">Automation Gallery</h3>
                    <p className="text-white/60 text-sm">Popular automation recipes and templates</p>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <select 
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white"
                  >
                    <option value="all">All Categories</option>
                    <option value="expense">Expense</option>
                    <option value="receipt">Receipt</option>
                    <option value="budget">Budget</option>
                    <option value="tax">Tax</option>
                  </select>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {automationRecipes.map((recipe) => (
                  <motion.div
                    key={recipe.id}
                    className="bg-white/5 rounded-lg p-4 border border-white/10"
                    whileHover={{ scale: 1.02 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-blue-600 rounded-full flex items-center justify-center">
                          <Zap size={20} className="text-white" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-white">{recipe.name}</h4>
                          <p className="text-white/60 text-sm">{recipe.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Star size={16} className="text-yellow-400" />
                        <span className="text-white/60 text-sm">{recipe.popularity}%</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between mb-3">
                      <span className={`px-2 py-1 rounded-full text-xs ${getDifficultyColor(recipe.difficulty)}`}>
                        {recipe.difficulty}
                      </span>
                      <span className="text-white/60 text-sm">
                        {recipe.timeToSetup} min setup • Saves {recipe.estimatedSavings} min/month
                      </span>
                    </div>
                    
                    <div className="flex flex-wrap gap-1 mb-3">
                      {recipe.tags.map((tag) => (
                        <span key={tag} className="px-2 py-1 bg-white/10 rounded-full text-xs text-white/60">
                          {tag}
                        </span>
                      ))}
                    </div>
                    
                    <div className="flex space-x-2">
                      <button className="flex-1 bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 text-white px-4 py-2 rounded-lg transition-all">
                        Enable
                      </button>
                      <button className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg transition-all">
                        <Copy size={16} />
                      </button>
                      <button className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg transition-all">
                        <Share2 size={16} />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Build Your Own Automation */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center">
                    <Plus size={24} className="text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">Build Your Own Automation</h3>
                    <p className="text-white/60 text-sm">Create custom automations with plain English</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowBuilder(!showBuilder)}
                  className="bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 text-white px-4 py-2 rounded-lg transition-all flex items-center gap-2"
                >
                  {showBuilder ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  {showBuilder ? 'Hide Builder' : 'Show Builder'}
                </button>
              </div>
              
              {showBuilder && (
                <div className="space-y-4">
                  <div className="bg-white/5 rounded-lg p-4">
                    <label className="text-white font-medium mb-2 block">Describe your automation in plain English:</label>
                    <textarea
                      value={builderInput}
                      onChange={(e) => setBuilderInput(e.target.value)}
                      placeholder="Example: When I spend more than $100, send me an alert and categorize it as 'High Value'"
                      className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:border-blue-400 min-h-[100px]"
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white/5 rounded-lg p-4">
                      <h4 className="text-white font-semibold mb-2">Popular Templates</h4>
                      <div className="space-y-2">
                                                 <button className="w-full text-left text-white/80 hover:text-white text-sm p-2 rounded hover:bg-white/10 transition-all">
                           If spending &gt; $X, then alert
                         </button>
                        <button className="w-full text-left text-white/80 hover:text-white text-sm p-2 rounded hover:bg-white/10 transition-all">
                          When receipt uploaded, categorize
                        </button>
                        <button className="w-full text-left text-white/80 hover:text-white text-sm p-2 rounded hover:bg-white/10 transition-all">
                          Weekly budget report
                        </button>
                      </div>
                    </div>
                    
                    <div className="bg-white/5 rounded-lg p-4">
                      <h4 className="text-white font-semibold mb-2">Triggers</h4>
                      <div className="space-y-2">
                        <span className="block text-white/60 text-sm">New expense added</span>
                        <span className="block text-white/60 text-sm">Budget threshold reached</span>
                        <span className="block text-white/60 text-sm">Receipt uploaded</span>
                        <span className="block text-white/60 text-sm">Weekly/Monthly schedule</span>
                      </div>
                    </div>
                    
                    <div className="bg-white/5 rounded-lg p-4">
                      <h4 className="text-white font-semibold mb-2">Actions</h4>
                      <div className="space-y-2">
                        <span className="block text-white/60 text-sm">Send notification</span>
                        <span className="block text-white/60 text-sm">Categorize expense</span>
                        <span className="block text-white/60 text-sm">Generate report</span>
                        <span className="block text-white/60 text-sm">Update budget</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex space-x-3">
                    <button className="bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 text-white px-6 py-3 rounded-lg transition-all">
                      Create Automation
                    </button>
                    <button className="bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-lg transition-all">
                      Save as Template
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Leaderboard & Community */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Leaderboard */}
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="w-12 h-12 bg-gradient-to-r from-yellow-500 to-orange-600 rounded-full flex items-center justify-center">
                    <Trophy size={24} className="text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">Automation Leaderboard</h3>
                    <p className="text-white/60 text-sm">Top automation users this month</p>
                  </div>
                </div>
                
                <div className="space-y-3">
                  {leaderboard.map((entry, index) => (
                    <div key={entry.id} className="flex items-center space-x-3 p-3 bg-white/5 rounded-lg">
                      <div className="w-8 h-8 bg-gradient-to-r from-yellow-500 to-orange-600 rounded-full flex items-center justify-center text-white font-bold">
                        {entry.rank}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="text-2xl">{entry.avatar}</span>
                          <div>
                            <div className="font-semibold text-white">{entry.name}</div>
                            <div className="text-white/60 text-sm">{entry.badge}</div>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-white font-semibold">{entry.automations} automations</div>
                        <div className="text-white/60 text-sm">{entry.timeSaved} min saved</div>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="mt-4 p-4 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-lg border border-yellow-500/30">
                  <div className="flex items-center space-x-2 mb-2">
                    <Gift size={16} className="text-yellow-400" />
                    <span className="text-white font-semibold">Monthly Challenge</span>
                  </div>
                  <p className="text-white/80 text-sm">Create 5 new automations this month and win exclusive badges!</p>
                </div>
              </div>

              {/* Activity Feed */}
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-600 rounded-full flex items-center justify-center">
                    <Activity size={24} className="text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">Automation Activity</h3>
                    <p className="text-white/60 text-sm">Recent automation runs and insights</p>
                  </div>
                </div>
                
                <div className="space-y-3">
                  {automationActivities.map((activity) => (
                    <div key={activity.id} className="flex items-start space-x-3 p-3 bg-white/5 rounded-lg">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        activity.status === 'success' ? 'bg-green-500/20' :
                        activity.status === 'error' ? 'bg-red-500/20' :
                        'bg-yellow-500/20'
                      }`}>
                        {activity.status === 'success' ? <CheckCircle size={16} className="text-green-400" /> :
                         activity.status === 'error' ? <AlertTriangle size={16} className="text-red-400" /> :
                         <Clock size={16} className="text-yellow-400" />}
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold text-white">{activity.automationName}</div>
                        <div className="text-white/60 text-sm">{activity.action}</div>
                        <div className="text-white/40 text-xs">{activity.timestamp}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-green-400 text-sm">+{activity.timeSaved} min</div>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="mt-4 p-4 bg-gradient-to-r from-green-500/20 to-blue-500/20 rounded-lg border border-green-500/30">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-white font-semibold">Monthly Summary</div>
                      <div className="text-white/80 text-sm">You saved {Math.round(totalTimeSaved / 60)} hours this month!</div>
                    </div>
                    <div className="text-2xl">🎉</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default SmartAutomation; 