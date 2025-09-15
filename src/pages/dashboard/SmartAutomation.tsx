import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Settings, 
  RefreshCw,
  Target,
  BarChart3,
  Lightbulb,
  Cpu,
  Crown,
  Users,
  DollarSign,
  Timer,
  Activity,
  Edit,
  Trash2,
  Plus,
  Search,
  Download,
  Brain,
  Send,
  Loader2,
  X,
  MessageCircle
} from 'lucide-react';

// AI Team Members
const aiTeam = [
  {
    id: 'prime',
    name: 'Prime',
    title: 'AI Automation Director',
    icon: Crown,
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/20',
    borderColor: 'border-yellow-500/30',
    description: 'Strategic Automation Planning',
    status: 'active',
    decisions: 47,
    accuracy: 99.8,
    lastActive: '2 minutes ago'
  },
  {
    id: 'byte',
    name: 'Byte',
    title: 'AI Process Optimizer',
    icon: Cpu,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/20',
    borderColor: 'border-blue-500/30',
    description: 'Workflow Automation',
    status: 'active',
    decisions: 23,
    accuracy: 99.5,
    lastActive: '1 minute ago'
  },
  {
    id: 'tag',
    name: 'Tag',
    title: 'AI Rule Engine',
    icon: Settings,
    color: 'text-green-400',
    bgColor: 'bg-green-500/20',
    borderColor: 'border-green-500/30',
    description: 'Smart Rule Creation',
    status: 'active',
    decisions: 31,
    accuracy: 99.7,
    lastActive: '30 seconds ago'
  },
  {
    id: 'crystal',
    name: 'Crystal',
    title: 'AI Prediction Engine',
    icon: Brain,
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/20',
    borderColor: 'border-purple-500/30',
    description: 'Predictive Automation',
    status: 'active',
    decisions: 19,
    accuracy: 99.9,
    lastActive: '1 minute ago'
  }
];

// Automation Rules
const automationRules = [
  {
    id: 'bill-payments',
    name: 'Bill Payment Optimization',
    description: 'Automatically pay bills at optimal times',
    status: 'active',
    accuracy: 99.7,
    timeSaved: '2 hours',
    moneySaved: '$127',
    lastRun: '2 hours ago',
    nextRun: 'In 6 hours',
    category: 'Payments'
  },
  {
    id: 'expense-categorization',
    name: 'Smart Expense Categorization',
    description: 'Automatically categorize all transactions',
    status: 'active',
    accuracy: 99.5,
    timeSaved: '2 hours',
    moneySaved: '$89',
    lastRun: '1 hour ago',
    nextRun: 'Continuous',
    category: 'Categorization'
  },
  {
    id: 'investment-rebalancing',
    name: 'Investment Rebalancing',
    description: 'Automatically rebalance portfolio',
    status: 'active',
    accuracy: 99.8,
    timeSaved: '3 hours',
    moneySaved: '$234',
    lastRun: '4 hours ago',
    nextRun: 'Weekly',
    category: 'Investments'
  },
  {
    id: 'fraud-detection',
    name: 'Fraud Detection',
    description: 'Monitor and detect suspicious activity',
    status: 'active',
    accuracy: 99.9,
    timeSaved: '1 hour',
    moneySaved: '$1,200',
    lastRun: 'Continuous',
    nextRun: 'Continuous',
    category: 'Security'
  },
  {
    id: 'savings-goals',
    name: 'Savings Goal Tracking',
    description: 'Automatically track and optimize savings',
    status: 'active',
    accuracy: 99.6,
    timeSaved: '1 hour',
    moneySaved: '$156',
    lastRun: '2 hours ago',
    nextRun: 'Daily',
    category: 'Savings'
  },
  {
    id: 'budget-alerts',
    name: 'Budget Alert System',
    description: 'Smart alerts for budget limits',
    status: 'active',
    accuracy: 99.4,
    timeSaved: '1 hour',
    moneySaved: '$67',
    lastRun: '1 hour ago',
    nextRun: 'Real-time',
    category: 'Budgeting'
  }
];

// Recent Activity
const recentActivity = [
  {
    id: 1,
    action: 'Processed 47 transactions',
    ai: 'Prime',
    time: '2 minutes ago',
    status: 'success',
    impact: '+$127 saved'
  },
  {
    id: 2,
    action: 'Categorized 23 expenses',
    ai: 'Tag',
    time: '5 minutes ago',
    status: 'success',
    impact: '+$89 saved'
  },
  {
    id: 3,
    action: 'Rebalanced investment portfolio',
    ai: 'Byte',
    time: '1 hour ago',
    status: 'success',
    impact: '+$234 saved'
  },
  {
    id: 4,
    action: 'Detected suspicious activity',
    ai: 'Crystal',
    time: '2 hours ago',
    status: 'warning',
    impact: 'Prevented $1,200 loss'
  },
  {
    id: 5,
    action: 'Updated savings goal progress',
    ai: 'Prime',
    time: '3 hours ago',
    status: 'success',
    impact: '+$156 saved'
  }
];

export default function SmartAutomation() {
  const [activeView, setActiveView] = useState('overview');
  const [showCreateRule, setShowCreateRule] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');

  // Live counters (simulated)
  const [liveStats, setLiveStats] = useState({
    decisionsToday: 120,
    timeSaved: 3,
    moneySaved: 847,
    accuracy: 99.7,
    activeRules: 6,
    totalSavings: 3240
  });

  // Chat state
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [messages, setMessages] = useState<Array<{
    role: 'user' | 'prime';
    content: string;
    timestamp: string;
  }>>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async (message: string) => {
    if (!message.trim() || isLoading) return;

    const userMessage = {
      role: 'user' as const,
      content: message,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // Simulate AI response
    setTimeout(() => {
      const primeResponse = {
        role: 'prime' as const,
        content: getPrimeResponse(message),
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, primeResponse]);
      setIsLoading(false);
    }, 1500);
  };

  const getPrimeResponse = (message: string) => {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('automation') || lowerMessage.includes('rule')) {
      return "I can help you create powerful automation rules! Based on your current setup, I recommend setting up rules for transaction categorization, bill reminders, and spending alerts. Would you like me to create a custom automation rule for you?";
    }
    
    if (lowerMessage.includes('team') || lowerMessage.includes('ai')) {
      return "Our AI team is performing excellently! Prime (me) handles strategic decisions, Byte optimizes processes, Tag manages categorization, and Crystal provides predictions. All systems are running at 99%+ accuracy. How can I help optimize our team performance?";
    }
    
    if (lowerMessage.includes('performance') || lowerMessage.includes('stats')) {
      return "Great question! Today we've made 121 decisions, saved 3 hours of manual work, and $847 in costs. Our accuracy rate is 99.7%. I can help you analyze these metrics and suggest improvements. What specific performance area interests you?";
    }
    
    if (lowerMessage.includes('workflow') || lowerMessage.includes('process')) {
      return "Workflow optimization is my specialty! I can analyze your current processes and suggest automation opportunities. We've already automated transaction categorization, bill processing, and expense tracking. What workflow would you like to optimize next?";
    }
    
    return "Hello! I'm Prime, your AI Automation Director. I can help you with automation rules, team performance, workflow optimization, and strategic planning. What would you like to automate today?";
  };

  // Simulate live updates
  useEffect(() => {
    const interval = setInterval(() => {
      setLiveStats(prev => ({
        ...prev,
        decisionsToday: prev.decisionsToday + Math.floor(Math.random() * 3),
        timeSaved: Math.floor(prev.timeSaved + 0.1),
        moneySaved: prev.moneySaved + Math.floor(Math.random() * 5)
      }));
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const handleCreateRule = () => {
    setShowCreateRule(true);
  };

  const handleToggleRule = (ruleId: string) => {
    // Toggle rule status
    console.log('Toggling rule:', ruleId);
  };

  const handleEditRule = (ruleId: string) => {
    // Edit rule
    console.log('Editing rule:', ruleId);
  };

  const handleDeleteRule = (ruleId: string) => {
    // Delete rule
    console.log('Deleting rule:', ruleId);
  };

  const filteredRules = automationRules.filter(rule => {
    const matchesSearch = rule.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         rule.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'all' || rule.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = ['all', ...new Set(automationRules.map(rule => rule.category))];


  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header Section */}
      <div className="bg-white/5 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <h1 className="text-3xl font-bold text-white mb-3">
              Welcome to Automa's Command Center
            </h1>
            <p className="text-white/70 text-lg mb-6">
              Your intelligent automation assistant for financial workflows
            </p>
            <div className="flex items-center justify-center gap-6">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-green-400 font-medium">All Systems Active</span>
              </div>
              <button 
                onClick={() => setIsChatOpen(true)}
                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-6 py-3 rounded-lg font-medium transition-all flex items-center gap-2 shadow-lg"
              >
                <MessageCircle className="w-5 h-5" />
                Chat with Prime
              </button>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">

        {/* Navigation Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex justify-center mb-8"
        >
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-2 border border-white/10">
            {[
              { key: 'overview', label: 'Overview', icon: BarChart3 },
              { key: 'automation', label: 'Rules', icon: Settings },
              { key: 'team', label: 'AI Team', icon: Users },
              { key: 'activity', label: 'Activity', icon: Activity },
              { key: 'insights', label: 'Insights', icon: Lightbulb }
            ].map(({ key, label, icon: Icon }) => (
              <motion.button
                key={key}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setActiveView(key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeView === key
                    ? 'bg-purple-500 text-white shadow-lg'
                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* Overview Section */}
        {activeView === 'overview' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="space-y-8"
          >
            {/* Key Metrics */}
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-white mb-2">Performance Overview</h2>
              <p className="text-white/60">Real-time automation metrics and AI team performance</p>
            </div>
            
            {/* Live Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6 hover:bg-white/10 transition-all">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white/60 text-sm font-medium">Decisions Today</p>
                    <p className="text-3xl font-bold text-white mt-1">{liveStats.decisionsToday}</p>
                    <p className="text-green-400 text-xs mt-1">+12% from yesterday</p>
                  </div>
                  <div className="w-14 h-14 bg-blue-500/20 rounded-xl flex items-center justify-center">
                    <Brain className="w-7 h-7 text-blue-400" />
                  </div>
                </div>
              </div>

              <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6 hover:bg-white/10 transition-all">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white/60 text-sm font-medium">Time Saved</p>
                    <p className="text-3xl font-bold text-white mt-1">{liveStats.timeSaved}h</p>
                    <p className="text-green-400 text-xs mt-1">This week</p>
                  </div>
                  <div className="w-14 h-14 bg-green-500/20 rounded-xl flex items-center justify-center">
                    <Timer className="w-7 h-7 text-green-400" />
                  </div>
                </div>
              </div>

              <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6 hover:bg-white/10 transition-all">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white/60 text-sm font-medium">Money Saved</p>
                    <p className="text-3xl font-bold text-white mt-1">${liveStats.moneySaved}</p>
                    <p className="text-green-400 text-xs mt-1">This month</p>
                  </div>
                  <div className="w-14 h-14 bg-yellow-500/20 rounded-xl flex items-center justify-center">
                    <DollarSign className="w-7 h-7 text-yellow-400" />
                  </div>
                </div>
              </div>

              <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6 hover:bg-white/10 transition-all">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white/60 text-sm font-medium">Accuracy Rate</p>
                    <p className="text-3xl font-bold text-white mt-1">{liveStats.accuracy}%</p>
                    <p className="text-green-400 text-xs mt-1">Excellent</p>
                  </div>
                  <div className="w-14 h-14 bg-purple-500/20 rounded-xl flex items-center justify-center">
                    <Target className="w-7 h-7 text-purple-400" />
                  </div>
                </div>
              </div>
          </div>

            {/* AI Team Performance */}
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-white mb-2">AI Team Performance</h2>
              <p className="text-white/60">Meet your intelligent automation team</p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {aiTeam.map((member) => (
                <div key={member.id} className={`${member.bgColor} ${member.borderColor} border rounded-xl p-6 hover:scale-105 transition-all`}>
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center">
                      <member.icon className={`w-6 h-6 ${member.color}`} />
                    </div>
                    <div>
                      <h4 className="font-semibold text-white text-lg">{member.name}</h4>
                      <p className="text-sm text-white/70">{member.title}</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-white/60 text-sm">Decisions</span>
                      <span className="text-white font-semibold">{member.decisions}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-white/60 text-sm">Accuracy</span>
                      <span className="text-white font-semibold">{member.accuracy}%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-white/60 text-sm">Status</span>
                      <span className="text-green-400 font-medium">Active</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Quick Actions */}
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-white mb-2">Quick Actions</h2>
              <p className="text-white/60">Manage your automation workflows</p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <button
                onClick={handleCreateRule}
                className="flex flex-col items-center gap-4 p-6 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 rounded-xl text-white transition-all hover:scale-105"
              >
                <div className="w-12 h-12 bg-purple-500/30 rounded-xl flex items-center justify-center">
                  <Plus className="w-6 h-6" />
                </div>
                <span className="font-medium">Create New Rule</span>
              </button>
              <button className="flex flex-col items-center gap-4 p-6 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 rounded-xl text-white transition-all hover:scale-105">
                <div className="w-12 h-12 bg-blue-500/30 rounded-xl flex items-center justify-center">
                  <RefreshCw className="w-6 h-6" />
                </div>
                <span className="font-medium">Run Health Check</span>
              </button>
              <button className="flex flex-col items-center gap-4 p-6 bg-green-500/20 hover:bg-green-500/30 border border-green-500/30 rounded-xl text-white transition-all hover:scale-105">
                <div className="w-12 h-12 bg-green-500/30 rounded-xl flex items-center justify-center">
                  <Download className="w-6 h-6" />
                </div>
                <span className="font-medium">Export Reports</span>
              </button>
              <button className="flex flex-col items-center gap-4 p-6 bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-500/30 rounded-xl text-white transition-all hover:scale-105">
                <div className="w-12 h-12 bg-yellow-500/30 rounded-xl flex items-center justify-center">
                  <Settings className="w-6 h-6" />
                </div>
                <span className="font-medium">Settings</span>
              </button>
            </div>
          </motion.div>
        )}
      </div>

      {/* Automation Rules Section */}
      {activeView === 'automation' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-6"
        >
          {/* Search and Filter */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/50" />
              <input
                type="text"
                placeholder="Search automation rules..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-purple-500"
              />
            </div>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-purple-500"
            >
              {categories.map(category => (
                <option key={category} value={category} className="bg-slate-800">
                  {category === 'all' ? 'All Categories' : category}
                </option>
              ))}
            </select>
            <button
              onClick={handleCreateRule}
              className="flex items-center gap-2 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create Rule
            </button>
          </div>

          {/* Rules Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredRules.map((rule) => (
              <div key={rule.id} className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-white">{rule.name}</h3>
                    <p className="text-white/70 text-sm">{rule.description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleRule(rule.id)}
                      className={`w-12 h-6 rounded-full transition-colors ${
                        rule.status === 'active' ? 'bg-green-500' : 'bg-gray-500'
                      }`}
                    >
                      <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                        rule.status === 'active' ? 'translate-x-6' : 'translate-x-0.5'
                      }`} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-white/70 text-sm">Accuracy</p>
                    <p className="text-white font-semibold">{rule.accuracy}%</p>
                  </div>
                  <div>
                    <p className="text-white/70 text-sm">Time Saved</p>
                    <p className="text-white font-semibold">{rule.timeSaved}</p>
                  </div>
                  <div>
                    <p className="text-white/70 text-sm">Money Saved</p>
                    <p className="text-white font-semibold">{rule.moneySaved}</p>
                  </div>
                  <div>
                    <p className="text-white/70 text-sm">Category</p>
                    <p className="text-white font-semibold">{rule.category}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm text-white/70 mb-4">
                  <span>Last run: {rule.lastRun}</span>
                  <span>Next run: {rule.nextRun}</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleEditRule(rule.id)}
                    className="flex items-center gap-2 px-3 py-1 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 rounded text-blue-400 text-sm transition-colors"
                  >
                    <Edit className="w-3 h-3" />
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteRule(rule.id)}
                    className="flex items-center gap-2 px-3 py-1 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 rounded text-red-400 text-sm transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* AI Team Section */}
      {activeView === 'team' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-6"
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {aiTeam.map((member) => (
              <div key={member.id} className={`${member.bgColor} ${member.borderColor} border rounded-xl p-6`}>
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 bg-white/10 rounded-xl flex items-center justify-center">
                    <member.icon className={`w-8 h-8 ${member.color}`} />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-white">{member.name}</h3>
                    <p className="text-white/70">{member.title}</p>
                    <p className="text-white/60 text-sm">{member.description}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-white/70 text-sm">Decisions Made</p>
                    <p className="text-2xl font-bold text-white">{member.decisions}</p>
                  </div>
                  <div>
                    <p className="text-white/70 text-sm">Accuracy Rate</p>
                    <p className="text-2xl font-bold text-white">{member.accuracy}%</p>
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-white/70">Status: <span className="text-green-400">Active</span></span>
                  <span className="text-white/70">Last active: {member.lastActive}</span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Activity Log Section */}
      {activeView === 'activity' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-6"
        >
          <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Recent Activity</h3>
            <div className="space-y-4">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-center gap-4 p-4 bg-white/5 rounded-lg">
                  <div className={`w-3 h-3 rounded-full ${
                    activity.status === 'success' ? 'bg-green-400' : 
                    activity.status === 'warning' ? 'bg-yellow-400' : 'bg-red-400'
                  }`} />
                  <div className="flex-1">
                    <p className="text-white">{activity.action}</p>
                    <p className="text-white/70 text-sm">by {activity.ai} • {activity.time}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-green-400 font-semibold">{activity.impact}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* Insights Section */}
      {activeView === 'insights' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-6"
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Performance Insights</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-white/70">Overall Efficiency</span>
                  <span className="text-green-400 font-semibold">94%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/70">Time Saved This Month</span>
                  <span className="text-blue-400 font-semibold">47 hours</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/70">Money Saved This Month</span>
                  <span className="text-yellow-400 font-semibold">$3,240</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/70">Rules Accuracy</span>
                  <span className="text-purple-400 font-semibold">99.7%</span>
                </div>
              </div>
            </div>

            <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Recommendations</h3>
              <div className="space-y-3">
                <div className="p-3 bg-blue-500/20 border border-blue-500/30 rounded-lg">
                  <p className="text-blue-400 text-sm font-medium">Consider automating utility payments</p>
                  <p className="text-white/70 text-xs">Could save 2 hours monthly</p>
                </div>
                <div className="p-3 bg-green-500/20 border border-green-500/30 rounded-lg">
                  <p className="text-green-400 text-sm font-medium">Optimize grocery categorization</p>
                  <p className="text-white/70 text-xs">Improve accuracy by 3.2%</p>
                </div>
                <div className="p-3 bg-yellow-500/20 border border-yellow-500/30 rounded-lg">
                  <p className="text-yellow-400 text-sm font-medium">Set up investment rebalancing</p>
                  <p className="text-white/70 text-xs">Potential $500+ monthly savings</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Create Rule Modal */}
      <AnimatePresence>
        {showCreateRule && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            onClick={() => setShowCreateRule(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-slate-800 rounded-xl border border-white/20 p-6 w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-xl font-semibold text-white mb-4">Create New Automation Rule</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-white/70 text-sm mb-2">Rule Name</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-purple-500"
                    placeholder="Enter rule name"
                  />
                </div>
                <div>
                  <label className="block text-white/70 text-sm mb-2">Description</label>
                  <textarea
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-purple-500 h-20 resize-none"
                    placeholder="Describe what this rule does"
                  />
                </div>
                <div>
                  <label className="block text-white/70 text-sm mb-2">Category</label>
                  <select className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-purple-500">
                    <option value="payments" className="bg-slate-800">Payments</option>
                    <option value="categorization" className="bg-slate-800">Categorization</option>
                    <option value="investments" className="bg-slate-800">Investments</option>
                    <option value="security" className="bg-slate-800">Security</option>
                    <option value="savings" className="bg-slate-800">Savings</option>
                    <option value="budgeting" className="bg-slate-800">Budgeting</option>
                  </select>
                </div>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setShowCreateRule(false)}
                    className="flex-1 px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => setShowCreateRule(false)}
                    className="flex-1 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors"
                  >
                    Create Rule
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat Modal */}
      <AnimatePresence>
        {isChatOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setIsChatOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 w-full max-w-2xl h-[600px] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Chat Header */}
              <div className="flex items-center justify-between p-4 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-xl flex items-center justify-center">
                    <Crown className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">Prime AI</h3>
                    <p className="text-white/60 text-sm">Automation Director</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsChatOpen(false)}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-white/60" />
                </button>
              </div>

              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 ? (
                  <div className="h-full flex items-center justify-center">
                    <div className="text-center">
                      <div className="w-16 h-16 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <Crown className="w-8 h-8 text-white" />
                      </div>
                      <h4 className="text-lg font-semibold text-white mb-2">Hello! I'm Prime 👑</h4>
                      <p className="text-white/60 text-sm mb-4">
                        I'm your AI Automation Director. Ask me about:
                      </p>
                      <div className="grid grid-cols-1 gap-2 max-w-sm mx-auto">
                        {[
                          "Create automation rules",
                          "Optimize team performance",
                          "Analyze workflow efficiency",
                          "Set up smart alerts",
                          "Review automation metrics"
                        ].map((suggestion, index) => (
                          <button
                            key={index}
                            onClick={() => sendMessage(suggestion)}
                            className="text-left p-3 bg-white/5 hover:bg-white/10 rounded-lg text-white/80 hover:text-white text-sm transition-colors"
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  messages.map((message, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] p-3 rounded-lg ${
                          message.role === 'user'
                            ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                            : 'bg-white/10 text-white border border-white/20'
                        }`}
                      >
                        {message.role === 'prime' && (
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-6 h-6 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-lg flex items-center justify-center">
                              <Crown className="w-3 h-3 text-white" />
                            </div>
                            <span className="text-xs font-semibold text-yellow-400">Prime</span>
                          </div>
                        )}
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                        <p className="text-xs opacity-70 mt-1">
                          {new Date(message.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                    </motion.div>
                  ))
                )}
                
                {isLoading && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex justify-start"
                  >
                    <div className="bg-white/10 px-3 py-2 rounded-lg border border-white/20">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-lg flex items-center justify-center">
                          <Crown className="w-3 h-3 text-white" />
                        </div>
                        <div className="flex items-center gap-2">
                          <Loader2 className="w-3 h-3 animate-spin text-yellow-400" />
                          <span className="text-xs text-white/70">Prime is analyzing...</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input */}
              <div className="p-4 border-t border-white/10">
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && !isLoading && sendMessage(input)}
                      placeholder="Ask Prime about automation and workflows..."
                      className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent transition-all text-sm"
                      disabled={isLoading}
                    />
                  </div>
                  <button
                    onClick={() => !isLoading && sendMessage(input)}
                    disabled={isLoading || !input.trim()}
                    className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:opacity-90 disabled:opacity-50 transition-all"
                  >
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
