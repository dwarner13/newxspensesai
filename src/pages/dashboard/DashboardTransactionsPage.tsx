import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, 
  Download, 
  Search, 
  Filter, 
  Calendar,
  TrendingDown,
  TrendingUp,
  DollarSign,
  BarChart3,
  Eye,
  Edit2,
  Trash2,
  Brain,
  MessageCircle,
  X,
  Zap,
  Target,
  AlertTriangle,
  CheckCircle,
  PieChart,
  Activity,
  Smartphone,
  Mic,
  MicOff,
  Volume2,
  VolumeX
} from 'lucide-react';

interface Transaction {
  id: string;
  date: string;
  description: string;
  category: string;
  amount: number;
  type: 'income' | 'expense';
  merchant?: string;
  location?: string;
  tags?: string[];
  isRecurring?: boolean;
  confidence?: number;
  aiInsights?: string[];
}

interface AIInsight {
  id: string;
  type: 'warning' | 'tip' | 'pattern' | 'prediction';
  title: string;
  message: string;
  impact: 'high' | 'medium' | 'low';
  actionable: boolean;
  category?: string;
}

interface CrystalMessage {
  id: string;
  type: 'analysis' | 'insight' | 'question' | 'recommendation';
  message: string;
  timestamp: Date;
  isTyping?: boolean;
}

const DashboardTransactionsPage: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedType, setSelectedType] = useState('All Types');
  const [isLoading, setIsLoading] = useState(true);
  
  // AI Features State
  const [crystalOpen, setCrystalOpen] = useState(false);
  const [crystalMessages, setCrystalMessages] = useState<CrystalMessage[]>([]);
  const [aiInsights, setAiInsights] = useState<AIInsight[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'analytics' | 'insights'>('table');
  const [selectedInsight, setSelectedInsight] = useState<AIInsight | null>(null);
  
  const crystalRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  // Enhanced mock data with AI insights
  useEffect(() => {
    const mockTransactions: Transaction[] = [
      {
        id: '1',
        date: '2024-01-15',
        description: 'Spotify Premium',
        category: 'Entertainment',
        amount: 9.99,
        type: 'expense',
        merchant: 'Spotify',
        isRecurring: true,
        confidence: 0.95,
        aiInsights: ['Recurring subscription detected', 'Consider annual plan for savings']
      },
      {
        id: '2',
        date: '2024-01-14',
        description: 'Uber Eats',
        category: 'Food & Drink',
        amount: 34.50,
        type: 'expense',
        merchant: 'Uber Eats',
        location: 'San Francisco, CA',
        confidence: 0.88,
        aiInsights: ['High delivery cost - consider pickup', 'Food delivery frequency increasing']
      },
      {
        id: '3',
        date: '2024-01-14',
        description: 'Salary Deposit',
        category: 'Income',
        amount: 3500.00,
        type: 'income',
        merchant: 'Employer Corp',
        confidence: 1.0,
        aiInsights: ['Regular income source', 'Consider automatic savings allocation']
      },
      {
        id: '4',
        date: '2024-01-13',
        description: 'Amazon Purchase',
        category: 'Shopping',
        amount: 89.99,
        type: 'expense',
        merchant: 'Amazon',
        tags: ['electronics', 'impulse-buy'],
        confidence: 0.92,
        aiInsights: ['Impulse purchase detected', 'Consider 24-hour rule for future purchases']
      },
      {
        id: '5',
        date: '2024-01-12',
        description: 'Gas Station',
        category: 'Transportation',
        amount: 45.20,
        type: 'expense',
        merchant: 'Shell',
        location: 'Oakland, CA',
        confidence: 0.90,
        aiInsights: ['Fuel cost within normal range', 'Consider gas rewards program']
      },
      {
        id: '6',
        date: '2024-01-11',
        description: 'Freelance Payment',
        category: 'Income',
        amount: 750.00,
        type: 'income',
        merchant: 'Client ABC',
        confidence: 0.85,
        aiInsights: ['Freelance income - set aside for taxes', 'Consider quarterly tax payments']
      },
      {
        id: '7',
        date: '2024-01-10',
        description: 'Netflix Subscription',
        category: 'Entertainment',
        amount: 15.99,
        type: 'expense',
        merchant: 'Netflix',
        isRecurring: true,
        confidence: 0.98,
        aiInsights: ['Recurring subscription', 'Consider sharing plan with family']
      },
      {
        id: '8',
        date: '2024-01-09',
        description: 'Grocery Store',
        category: 'Food & Drink',
        amount: 125.30,
        type: 'expense',
        merchant: 'Whole Foods',
        location: 'Berkeley, CA',
        confidence: 0.87,
        aiInsights: ['Grocery spending above average', 'Consider generic brands for savings']
      },
      {
        id: '9',
        date: '2024-01-08',
        description: 'Electric Bill',
        category: 'Utilities',
        amount: 89.45,
        type: 'expense',
        merchant: 'PG&E',
        isRecurring: true,
        confidence: 0.99,
        aiInsights: ['Utility bill - consider energy efficiency', 'Set up auto-pay for convenience']
      },
      {
        id: '10',
        date: '2024-01-07',
        description: 'Coffee Shop',
        category: 'Food & Drink',
        amount: 12.50,
        type: 'expense',
        merchant: 'Blue Bottle Coffee',
        location: 'San Francisco, CA',
        confidence: 0.91,
        aiInsights: ['Coffee spending - consider brewing at home', 'Daily coffee habit detected']
      }
    ];

    const mockInsights: AIInsight[] = [
      {
        id: '1',
        type: 'warning',
        title: 'High Food Delivery Spending',
        message: 'You\'ve spent $47 on food delivery this week. Consider cooking at home to save $200+ monthly.',
        impact: 'high',
        actionable: true,
        category: 'Food & Drink'
      },
      {
        id: '2',
        type: 'pattern',
        title: 'Recurring Subscription Alert',
        message: 'You have 3 active subscriptions totaling $35.98/month. Review if all are necessary.',
        impact: 'medium',
        actionable: true,
        category: 'Entertainment'
      },
      {
        id: '3',
        type: 'tip',
        title: 'Tax Optimization Opportunity',
        message: 'Your freelance income of $750 could benefit from quarterly tax planning. Consider setting aside 25% for taxes.',
        impact: 'high',
        actionable: true,
        category: 'Income'
      },
      {
        id: '4',
        type: 'prediction',
        title: 'Monthly Spending Forecast',
        message: 'Based on current patterns, you\'re projected to spend $2,400 this month, which is 15% over your typical budget.',
        impact: 'medium',
        actionable: true
      }
    ];

    setTimeout(() => {
      setTransactions(mockTransactions);
      setAiInsights(mockInsights);
      setIsLoading(false);
      // Initialize Crystal with welcome message
      addCrystalMessage('analysis', 'Hello! I\'ve analyzed your recent transactions and found some interesting patterns. Would you like me to walk you through my findings?');
    }, 1000);
  }, []);

  const categories = ['All', 'Entertainment', 'Food & Drink', 'Income', 'Shopping', 'Transportation', 'Utilities'];
  const types = ['All Types', 'Income', 'Expense'];

  // AI Helper Functions
  const addCrystalMessage = (type: CrystalMessage['type'], message: string) => {
    const newMessage: CrystalMessage = {
      id: Date.now().toString(),
      type,
      message,
      timestamp: new Date(),
      isTyping: false
    };
    setCrystalMessages(prev => [...prev, newMessage]);
  };

  const simulateCrystalTyping = (message: string, delay: number = 1000) => {
    const typingMessage: CrystalMessage = {
      id: Date.now().toString(),
      type: 'analysis',
      message: '',
      timestamp: new Date(),
      isTyping: true
    };
    
    setCrystalMessages(prev => [...prev, typingMessage]);
    
    setTimeout(() => {
      setCrystalMessages(prev => 
        prev.map(msg => 
          msg.id === typingMessage.id 
            ? { ...msg, message, isTyping: false }
            : msg
        )
      );
    }, delay);
  };

  const analyzeTransactions = async () => {
    setIsAnalyzing(true);
    simulateCrystalTyping('Analyzing your spending patterns...', 2000);
    
    setTimeout(() => {
      simulateCrystalTyping('I found 4 key insights in your recent transactions. Your food delivery spending is 40% higher than last month, and you have 3 recurring subscriptions that might be optimized.', 3000);
      setIsAnalyzing(false);
    }, 2000);
  };

  const handleVoiceCommand = (command: string) => {
    const lowerCommand = command.toLowerCase();
    
    if (lowerCommand.includes('show') && lowerCommand.includes('income')) {
      setSelectedType('Income');
      addCrystalMessage('insight', 'Showing all income transactions for you.');
    } else if (lowerCommand.includes('show') && lowerCommand.includes('expense')) {
      setSelectedType('Expense');
      addCrystalMessage('insight', 'Showing all expense transactions for you.');
    } else if (lowerCommand.includes('subscription')) {
      setSearchTerm('subscription');
      addCrystalMessage('insight', 'Searching for subscription-related transactions.');
    } else if (lowerCommand.includes('analyze')) {
      analyzeTransactions();
    } else {
      addCrystalMessage('question', 'I didn\'t quite understand that. Try saying "show income", "show expenses", or "analyze transactions".');
    }
  };

  const startVoiceRecognition = () => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';
      
      recognitionRef.current.onstart = () => {
        setIsListening(true);
        addCrystalMessage('question', 'Listening... What would you like to know about your transactions?');
      };
      
      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        handleVoiceCommand(transcript);
        setIsListening(false);
      };
      
      recognitionRef.current.onerror = () => {
        setIsListening(false);
        addCrystalMessage('question', 'Sorry, I couldn\'t hear you clearly. Please try again.');
      };
      
      recognitionRef.current.start();
    } else {
      addCrystalMessage('question', 'Voice recognition is not supported in your browser. Please use text input instead.');
    }
  };

  const stopVoiceRecognition = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  const filteredTransactions = transactions.filter(transaction => {
    const matchesSearch = transaction.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || transaction.category === selectedCategory;
    const matchesType = selectedType === 'All Types' || transaction.type === selectedType;
    
    return matchesSearch && matchesCategory && matchesType;
  });

  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpenses = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const netAmount = totalIncome - totalExpenses;

  // Enhanced analytics
  const categoryBreakdown = transactions.reduce((acc, transaction) => {
    if (transaction.type === 'expense') {
      acc[transaction.category] = (acc[transaction.category] || 0) + transaction.amount;
    }
    return acc;
  }, {} as Record<string, number>);

  const recurringTransactions = transactions.filter(t => t.isRecurring);
  const recurringAmount = recurringTransactions.reduce((sum, t) => sum + t.amount, 0);

  const highConfidenceTransactions = transactions.filter(t => (t.confidence || 0) > 0.9);
  const lowConfidenceTransactions = transactions.filter(t => (t.confidence || 0) < 0.8);

  const topMerchants = transactions.reduce((acc, transaction) => {
    if (transaction.merchant) {
      acc[transaction.merchant] = (acc[transaction.merchant] || 0) + transaction.amount;
    }
    return acc;
  }, {} as Record<string, number>);

  const sortedMerchants = Object.entries(topMerchants)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 sm:p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
              <p className="text-white/70">Crystal is analyzing your transactions...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 sm:p-6 relative">
      <div className="max-w-7xl mx-auto">
        {/* Header with Crystal AI Assistant */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4"
        >
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Transaction Intelligence</h1>
            <p className="text-white/70 text-sm sm:text-base">AI-powered insights and analysis</p>
          </div>
          
          {/* Crystal AI Assistant Button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setCrystalOpen(!crystalOpen)}
            className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm sm:text-base transition-all duration-200"
          >
            <Brain className="w-4 h-4" />
            {crystalOpen ? 'Hide Crystal' : 'Ask Crystal'}
            {crystalMessages.length > 0 && (
              <div className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {crystalMessages.length}
              </div>
            )}
          </motion.button>
        </motion.div>

        {/* View Mode Toggle - Mobile Optimized */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex flex-wrap gap-2 mb-6"
        >
          {[
            { key: 'table', label: 'Transactions', icon: FileText },
            { key: 'analytics', label: 'Analytics', icon: BarChart3 },
            { key: 'insights', label: 'AI Insights', icon: Brain }
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setViewMode(key as any)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${
                viewMode === key
                  ? 'bg-purple-500 text-white'
                  : 'bg-white/10 text-white/70 hover:bg-white/20'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </motion.div>

        {/* Enhanced Summary Cards - Mobile Responsive */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6"
        >
          {/* Total Transactions */}
          <div className="bg-gradient-to-br from-white/5 to-white/2 backdrop-blur-sm rounded-xl p-4 border border-white/10">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/70 text-xs sm:text-sm">Total Transactions</p>
                <p className="text-xl sm:text-2xl font-bold text-white">{transactions.length}</p>
                <p className="text-green-400 text-xs">+12% this month</p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-500/30 to-purple-500/30 rounded-xl flex items-center justify-center">
                <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-blue-300" />
              </div>
            </div>
          </div>

          {/* Net Amount */}
          <div className="bg-gradient-to-br from-white/5 to-white/2 backdrop-blur-sm rounded-xl p-4 border border-white/10">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/70 text-xs sm:text-sm">Net Amount</p>
                <p className={`text-xl sm:text-2xl font-bold ${netAmount >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {formatCurrency(netAmount)}
                </p>
                <p className="text-white/60 text-xs">This month</p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-green-500/30 to-emerald-500/30 rounded-xl flex items-center justify-center">
                {netAmount >= 0 ? (
                  <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-green-300" />
                ) : (
                  <TrendingDown className="w-5 h-5 sm:w-6 sm:h-6 text-red-300" />
                )}
              </div>
            </div>
          </div>

          {/* Recurring Subscriptions */}
          <div className="bg-gradient-to-br from-white/5 to-white/2 backdrop-blur-sm rounded-xl p-4 border border-white/10">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/70 text-xs sm:text-sm">Recurring</p>
                <p className="text-xl sm:text-2xl font-bold text-orange-400">{formatCurrency(recurringAmount)}</p>
                <p className="text-white/60 text-xs">{recurringTransactions.length} subscriptions</p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-orange-500/30 to-red-500/30 rounded-xl flex items-center justify-center">
                <Activity className="w-5 h-5 sm:w-6 sm:h-6 text-orange-300" />
              </div>
            </div>
          </div>

          {/* AI Confidence */}
          <div className="bg-gradient-to-br from-white/5 to-white/2 backdrop-blur-sm rounded-xl p-4 border border-white/10">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/70 text-xs sm:text-sm">AI Confidence</p>
                <p className="text-xl sm:text-2xl font-bold text-purple-400">
                  {Math.round((highConfidenceTransactions.length / transactions.length) * 100)}%
                </p>
                <p className="text-white/60 text-xs">High accuracy</p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-purple-500/30 to-pink-500/30 rounded-xl flex items-center justify-center">
                <Target className="w-5 h-5 sm:w-6 sm:h-6 text-purple-300" />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Enhanced Filters and Search - Mobile Optimized */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-br from-white/5 to-white/2 backdrop-blur-sm rounded-xl p-4 sm:p-6 border border-white/10 mb-6"
        >
          <div className="flex flex-col gap-4">
            {/* Search and Voice Input */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/50 w-4 h-4 sm:w-5 sm:h-5" />
                <input
                  type="text"
                  placeholder="Search transactions or ask Crystal..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 sm:py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-purple-400 transition-colors text-sm sm:text-base"
                />
              </div>
              
              {/* Voice Input Button */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={isListening ? stopVoiceRecognition : startVoiceRecognition}
                className={`px-4 py-2 sm:py-3 rounded-lg flex items-center gap-2 text-sm sm:text-base transition-all ${
                  isListening 
                    ? 'bg-red-500 hover:bg-red-600 text-white' 
                    : 'bg-purple-500 hover:bg-purple-600 text-white'
                }`}
              >
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                {isListening ? 'Stop' : 'Voice'}
              </motion.button>
            </div>

            {/* Filters Row */}
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Category Filter */}
              <div className="sm:w-48">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-3 py-2 sm:py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-purple-400 transition-colors text-sm sm:text-base"
                >
                  {categories.map(category => (
                    <option key={category} value={category} className="bg-slate-800">
                      {category}
                    </option>
                  ))}
                </select>
              </div>

              {/* Type Filter */}
              <div className="sm:w-48">
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="w-full px-3 py-2 sm:py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-purple-400 transition-colors text-sm sm:text-base"
                >
                  {types.map(type => (
                    <option key={type} value={type} className="bg-slate-800">
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={analyzeTransactions}
                  disabled={isAnalyzing}
                  className="px-3 py-2 sm:py-3 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2 text-sm sm:text-base disabled:opacity-50"
                >
                  <Brain className="w-4 h-4" />
                  {isAnalyzing ? 'Analyzing...' : 'Analyze'}
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-3 py-2 sm:py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2 text-sm sm:text-base"
                >
                  <Download className="w-4 h-4" />
                  Export
                </motion.button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Dynamic Content Based on View Mode */}
        <AnimatePresence mode="wait">
          {viewMode === 'table' && (
            <motion.div
              key="table"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ delay: 0.2 }}
              className="bg-gradient-to-br from-white/5 to-white/2 backdrop-blur-sm rounded-xl border border-white/10 overflow-hidden"
            >
              <div className="p-4 sm:p-6 border-b border-white/10">
                <h3 className="text-lg sm:text-xl font-bold text-white">Transaction History</h3>
                <p className="text-white/70 text-sm mt-1">
                  {filteredTransactions.length} transactions • {formatCurrency(netAmount)} net
                </p>
              </div>

              {/* Mobile-Optimized Transaction List */}
              <div className="divide-y divide-white/10">
                {filteredTransactions.map((transaction, index) => (
                  <motion.div
                    key={transaction.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="p-4 sm:p-6 hover:bg-white/5 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="text-white font-medium truncate">{transaction.description}</h4>
                          {transaction.isRecurring && (
                            <span className="bg-orange-500/20 text-orange-300 text-xs px-2 py-1 rounded-full">
                              Recurring
                            </span>
                          )}
                          {transaction.confidence && transaction.confidence < 0.8 && (
                            <span className="bg-yellow-500/20 text-yellow-300 text-xs px-2 py-1 rounded-full">
                              Review
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-white/60 mb-2">
                          <span>{transaction.category}</span>
                          <span>•</span>
                          <span>{formatDate(transaction.date)}</span>
                          {transaction.merchant && (
                            <>
                              <span>•</span>
                              <span>{transaction.merchant}</span>
                            </>
                          )}
                        </div>
                        {transaction.aiInsights && transaction.aiInsights.length > 0 && (
                          <div className="mt-2">
                            <p className="text-xs text-purple-300 mb-1">AI Insights:</p>
                            <div className="space-y-1">
                              {transaction.aiInsights.slice(0, 2).map((insight, idx) => (
                                <p key={idx} className="text-xs text-white/70 bg-white/5 px-2 py-1 rounded">
                                  {insight}
                                </p>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="ml-4 text-right">
                        <div className={`text-lg font-bold ${
                          transaction.type === 'income' ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                        </div>
                        <div className="flex gap-1 mt-2">
                          <button className="p-1.5 text-white/60 hover:text-white hover:bg-white/10 rounded transition-colors">
                            <Eye className="w-4 h-4" />
                          </button>
                          <button className="p-1.5 text-white/60 hover:text-white hover:bg-white/10 rounded transition-colors">
                            <Edit2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {filteredTransactions.length === 0 && (
                <div className="p-8 sm:p-12 text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <FileText className="w-8 h-8 text-blue-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">No transactions found</h3>
                  <p className="text-white/70">Try adjusting your search or filter criteria</p>
                </div>
              )}
            </motion.div>
          )}

          {viewMode === 'analytics' && (
            <motion.div
              key="analytics"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ delay: 0.2 }}
              className="space-y-6"
            >
              {/* Category Breakdown */}
              <div className="bg-gradient-to-br from-white/5 to-white/2 backdrop-blur-sm rounded-xl p-4 sm:p-6 border border-white/10">
                <h3 className="text-lg sm:text-xl font-bold text-white mb-4">Spending by Category</h3>
                <div className="space-y-3">
                  {Object.entries(categoryBreakdown)
                    .sort(([,a], [,b]) => b - a)
                    .map(([category, amount]) => (
                      <div key={category} className="flex items-center justify-between">
                        <span className="text-white/80 text-sm sm:text-base">{category}</span>
                        <div className="flex items-center gap-3">
                          <div className="w-24 sm:w-32 bg-white/10 rounded-full h-2">
                            <div 
                              className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full"
                              style={{ width: `${(amount / Math.max(...Object.values(categoryBreakdown))) * 100}%` }}
                            />
                          </div>
                          <span className="text-white font-medium text-sm sm:text-base w-20 text-right">
                            {formatCurrency(amount)}
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              {/* Top Merchants */}
              <div className="bg-gradient-to-br from-white/5 to-white/2 backdrop-blur-sm rounded-xl p-4 sm:p-6 border border-white/10">
                <h3 className="text-lg sm:text-xl font-bold text-white mb-4">Top Merchants</h3>
                <div className="space-y-3">
                  {sortedMerchants.map(([merchant, amount], index) => (
                    <div key={merchant} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-white/60 text-sm w-6">#{index + 1}</span>
                        <span className="text-white/80 text-sm sm:text-base">{merchant}</span>
                      </div>
                      <span className="text-white font-medium text-sm sm:text-base">
                        {formatCurrency(amount)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {viewMode === 'insights' && (
            <motion.div
              key="insights"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ delay: 0.2 }}
              className="space-y-4"
            >
              {aiInsights.map((insight) => (
                <motion.div
                  key={insight.id}
                  whileHover={{ scale: 1.02 }}
                  onClick={() => setSelectedInsight(insight)}
                  className="bg-gradient-to-br from-white/5 to-white/2 backdrop-blur-sm rounded-xl p-4 sm:p-6 border border-white/10 cursor-pointer transition-all hover:border-purple-400/50"
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      insight.type === 'warning' ? 'bg-red-500/20' :
                      insight.type === 'tip' ? 'bg-green-500/20' :
                      insight.type === 'pattern' ? 'bg-blue-500/20' :
                      'bg-purple-500/20'
                    }`}>
                      {insight.type === 'warning' ? <AlertTriangle className="w-4 h-4 text-red-400" /> :
                       insight.type === 'tip' ? <CheckCircle className="w-4 h-4 text-green-400" /> :
                       insight.type === 'pattern' ? <PieChart className="w-4 h-4 text-blue-400" /> :
                       <Target className="w-4 h-4 text-purple-400" />}
                    </div>
                    <div className="flex-1">
                      <h4 className="text-white font-semibold text-sm sm:text-base mb-1">{insight.title}</h4>
                      <p className="text-white/70 text-xs sm:text-sm">{insight.message}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          insight.impact === 'high' ? 'bg-red-500/20 text-red-300' :
                          insight.impact === 'medium' ? 'bg-yellow-500/20 text-yellow-300' :
                          'bg-green-500/20 text-green-300'
                        }`}>
                          {insight.impact} impact
                        </span>
                        {insight.actionable && (
                          <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-1 rounded-full">
                            Actionable
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Crystal AI Assistant - Mobile Optimized */}
        <AnimatePresence>
          {crystalOpen && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="fixed bottom-4 right-4 left-4 sm:left-auto sm:w-96 z-50"
            >
              <div className="bg-gradient-to-br from-purple-900/95 to-pink-900/95 backdrop-blur-lg rounded-2xl border border-purple-400/20 shadow-2xl">
                {/* Crystal Header */}
                <div className="flex items-center justify-between p-4 border-b border-purple-400/20">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                      <Brain className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-white font-semibold">Crystal AI</h3>
                      <p className="text-purple-200 text-xs">Financial Intelligence Assistant</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setCrystalOpen(false)}
                    className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Crystal Messages */}
                <div className="max-h-64 overflow-y-auto p-4 space-y-3">
                  {crystalMessages.map((message) => (
                    <div key={message.id} className={`flex ${message.type === 'analysis' ? 'justify-start' : 'justify-end'}`}>
                      <div className={`max-w-[80%] p-3 rounded-lg ${
                        message.type === 'analysis' 
                          ? 'bg-purple-500/20 text-white' 
                          : 'bg-white/10 text-white/80'
                      }`}>
                        {message.isTyping ? (
                          <div className="flex items-center gap-1">
                            <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" />
                            <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                            <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                          </div>
                        ) : (
                          <p className="text-sm">{message.message}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Crystal Input */}
                <div className="p-4 border-t border-purple-400/20">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Ask Crystal about your transactions..."
                      className="flex-1 px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-purple-400 transition-colors text-sm"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          const input = e.target as HTMLInputElement;
                          if (input.value.trim()) {
                            addCrystalMessage('question', input.value);
                            handleVoiceCommand(input.value);
                            input.value = '';
                          }
                        }
                      }}
                    />
                    <button
                      onClick={() => analyzeTransactions()}
                      className="px-3 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors"
                    >
                      <Zap className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default DashboardTransactionsPage;

