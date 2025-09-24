import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import MobilePageTitle from '../../components/ui/MobilePageTitle';
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
  description: string;
}

const DashboardTransactionsPage: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [dateRange, setDateRange] = useState('all');
  const [viewMode, setViewMode] = useState<'table' | 'analytics' | 'insights'>('table');
  const [crystalOpen, setCrystalOpen] = useState(false);
  const [crystalInput, setCrystalInput] = useState('');
  const [crystalMessages, setCrystalMessages] = useState<Array<{type: 'user' | 'ai', text: string}>>([]);
  const [aiInsights, setAiInsights] = useState<AIInsight[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Mock data
  useEffect(() => {
    const mockTransactions: Transaction[] = [
      {
        id: '1',
        date: '2024-01-15',
        description: 'Coffee Shop',
        category: 'Food & Drink',
        amount: 4.50,
        type: 'expense',
        merchant: 'Starbucks',
        location: 'San Francisco, CA',
        confidence: 0.95,
        aiInsights: ['Frequent coffee purchases', 'Consider monthly coffee budget']
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
        description: 'Grocery Store',
        category: 'Food & Drink',
        amount: 89.45,
        type: 'expense',
        merchant: 'Whole Foods',
        location: 'San Francisco, CA',
        confidence: 0.92,
        aiInsights: ['Grocery spending within budget', 'Consider bulk buying for savings']
      },
      {
        id: '5',
        date: '2024-01-12',
        description: 'Gas Station',
        category: 'Transportation',
        amount: 45.20,
        type: 'expense',
        merchant: 'Shell',
        location: 'San Francisco, CA',
        confidence: 0.98,
        aiInsights: ['Regular fuel expense', 'Consider fuel-efficient vehicle']
      }
    ];

    const mockInsights: AIInsight[] = [
      {
        id: '1',
        type: 'warning',
        title: 'High Food Spending',
        description: 'Your food expenses are 40% above your monthly average. Consider meal planning to reduce costs.'
      },
      {
        id: '2',
        type: 'tip',
        title: 'Savings Opportunity',
        description: 'You could save $200/month by reducing delivery orders and cooking at home.'
      },
      {
        id: '3',
        type: 'pattern',
        title: 'Spending Pattern Detected',
        description: 'You tend to spend more on weekends. Consider setting a weekend budget.'
      }
    ];

      setTransactions(mockTransactions);
    setFilteredTransactions(mockTransactions);
      setAiInsights(mockInsights);
      setIsLoading(false);
  }, []);

  // Filter transactions
  useEffect(() => {
    let filtered = transactions;

    if (searchTerm) {
      filtered = filtered.filter(t => 
        t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.merchant && t.merchant.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    if (selectedCategory) {
      filtered = filtered.filter(t => t.category === selectedCategory);
    }

    setFilteredTransactions(filtered);
  }, [transactions, searchTerm, selectedCategory]);

  const handleTransactionClick = (transaction: Transaction) => {
    console.log('Transaction clicked:', transaction);
  };

  const handleCrystalQuestion = (question: string) => {
    setCrystalInput(question);
    handleCrystalSubmit();
  };

  const handleCrystalSubmit = () => {
    if (!crystalInput.trim()) return;
    
    const newMessage = { type: 'user' as const, text: crystalInput };
    setCrystalMessages(prev => [...prev, newMessage]);
    
    // Simulate AI response
    setTimeout(() => {
      const aiResponse = { type: 'ai' as const, text: `I can help you analyze your transaction: "${crystalInput}". Based on your spending patterns, I recommend...` };
      setCrystalMessages(prev => [...prev, aiResponse]);
    }, 1000);
    
    setCrystalInput('');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-24 p-4 sm:p-6">
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
    <div className="w-full pt-20 px-4 sm:px-6 lg:px-8">
          {/* Page Title */}
          <MobilePageTitle 
            title="Transactions" 
            subtitle="View and manage your financial transactions"
          />
          
          {/* Header with Crystal AI Assistant */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4"
          >
            <div>
              <h2 className="text-xl font-bold text-white mb-1">
                Welcome to Crystal's Transaction Lab
              </h2>
              <p className="text-white/60 text-sm mb-3">
                Your intelligent guide to mastering transaction analysis and financial insights
              </p>
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

        {/* Search and Filter Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6"
        >
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/50 w-4 h-4 sm:w-5 sm:h-5" />
            <input
              type="text"
              placeholder="Search transactions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
        </motion.div>

        {/* AI Insights Section */}
        {aiInsights.length > 0 && (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-6"
          >
            <h2 className="text-lg font-semibold text-white mb-3">AI Insights</h2>
            <div className="grid gap-3">
              {aiInsights.map((insight) => (
                <div
                  key={insight.id}
                  className={`p-4 rounded-lg border-l-4 ${
                    insight.type === 'warning'
                      ? 'bg-red-500/10 border-red-500 text-red-200'
                      : insight.type === 'tip'
                      ? 'bg-blue-500/10 border-blue-500 text-blue-200'
                      : insight.type === 'pattern'
                      ? 'bg-green-500/10 border-green-500 text-green-200'
                      : 'bg-purple-500/10 border-purple-500 text-purple-200'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-1">
                      {insight.type === 'warning' && <AlertTriangle className="w-5 h-5" />}
                      {insight.type === 'tip' && <CheckCircle className="w-5 h-5" />}
                      {insight.type === 'pattern' && <TrendingUp className="w-5 h-5" />}
                      {insight.type === 'prediction' && <Brain className="w-5 h-5" />}
          </div>
              <div>
                      <h3 className="font-semibold mb-1">{insight.title}</h3>
                      <p className="text-sm opacity-90">{insight.description}</p>
              </div>
            </div>
          </div>
              ))}
          </div>
        </motion.div>
        )}

        {/* Transactions List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-4"
        >
          {filteredTransactions.map((transaction, index) => (
            <motion.div
              key={transaction.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 * index }}
              className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-all duration-200 cursor-pointer"
              onClick={() => handleTransactionClick(transaction)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${
                    transaction.type === 'income' ? 'bg-green-500' : 'bg-red-500'
                  }`} />
                  <div>
                    <h3 className="font-semibold text-white">{transaction.description}</h3>
                    <p className="text-sm text-white/70">{transaction.category}</p>
                          {transaction.merchant && (
                      <p className="text-xs text-white/50">{transaction.merchant}</p>
                          )}
                        </div>
                            </div>
                <div className="text-right">
                  <p className={`font-semibold ${
                          transaction.type === 'income' ? 'text-green-400' : 'text-red-400'
                        }`}>
                    {transaction.type === 'income' ? '+' : '-'}${Math.abs(transaction.amount).toFixed(2)}
                  </p>
                  <p className="text-sm text-white/70">{transaction.date}</p>
                    </div>
              </div>

              {/* AI Insights for this transaction */}
              {transaction.aiInsights && transaction.aiInsights.length > 0 && (
                <div className="mt-3 pt-3 border-t border-white/10">
                  <div className="flex items-center gap-2 mb-2">
                    <Brain className="w-4 h-4 text-purple-400" />
                    <span className="text-sm font-medium text-purple-400">AI Insights</span>
                  </div>
                  <div className="space-y-1">
                    {transaction.aiInsights.map((insight, idx) => (
                      <p key={idx} className="text-xs text-white/70">{insight}</p>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Confidence Score */}
              {transaction.confidence && (
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex-1 bg-white/10 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${transaction.confidence * 100}%` }}
                            />
                          </div>
                  <span className="text-xs text-white/70">
                    {Math.round(transaction.confidence * 100)}% confidence
                          </span>
                </div>
              )}
                </motion.div>
              ))}
            </motion.div>

        {/* Crystal AI Assistant Modal */}
        <AnimatePresence>
          {crystalOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={() => setCrystalOpen(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-gradient-to-br from-purple-900 to-pink-900 rounded-2xl p-6 w-full max-w-md max-h-[80vh] overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                      <Brain className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">Crystal AI</h3>
                      <p className="text-sm text-white/70">Your financial assistant</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setCrystalOpen(false)}
                    className="text-white/70 hover:text-white transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="bg-white/10 rounded-lg p-4">
                    <h4 className="font-semibold text-white mb-2">Quick Questions</h4>
                    <div className="space-y-2">
                      <button
                        onClick={() => handleCrystalQuestion("What are my biggest expenses this month?")}
                        className="w-full text-left text-sm text-white/80 hover:text-white hover:bg-white/10 p-2 rounded transition-colors"
                      >
                        What are my biggest expenses this month?
                      </button>
                      <button
                        onClick={() => handleCrystalQuestion("Show me my spending patterns")}
                        className="w-full text-left text-sm text-white/80 hover:text-white hover:bg-white/10 p-2 rounded transition-colors"
                      >
                        Show me my spending patterns
                      </button>
                      <button
                        onClick={() => handleCrystalQuestion("How can I save more money?")}
                        className="w-full text-left text-sm text-white/80 hover:text-white hover:bg-white/10 p-2 rounded transition-colors"
                      >
                        How can I save more money?
                      </button>
                    </div>
                  </div>
                  
                  <div className="bg-white/5 rounded-lg p-4 max-h-48 overflow-y-auto">
                    <h4 className="font-semibold text-white mb-2">Conversation</h4>
                    {crystalMessages.length === 0 ? (
                      <p className="text-sm text-white/70">Ask me anything about your finances!</p>
                    ) : (
                      <div className="space-y-2">
                        {crystalMessages.map((message, index) => (
                          <div key={index} className={`p-2 rounded ${
                            message.type === 'user' 
                              ? 'bg-blue-500/20 text-blue-200' 
                              : 'bg-white/10 text-white'
                          }`}>
                            <p className="text-sm">{message.text}</p>
                          </div>
                        ))}
                      </div>
                    )}
                </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={crystalInput}
                      onChange={(e) => setCrystalInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleCrystalSubmit()}
                      placeholder="Ask Crystal anything..."
                      className="flex-1 bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <button
                      onClick={handleCrystalSubmit}
                      className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-4 py-2 rounded-lg transition-all duration-200"
                    >
                      <Mic className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
    </div>
  );
};

export default DashboardTransactionsPage;