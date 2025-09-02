import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Filter, 
  Download, 
  Upload, 
  Trash2, 
  Edit2, 
  X, 
  Check, 
  ChevronDown, 
  Calendar, 
  Tag, 
  Settings, 
  Eye, 
  Receipt, 
  Banknote,
  Search,
  SortAsc,
  SortDesc,
  BarChart3,
  PieChart,
  TrendingUp,
  TrendingDown,
  Brain,
  Zap,
  AlertCircle,
  CheckCircle,
  Clock,
  FileText,
  CreditCard,
  MapPin,
  Star,
  MoreHorizontal
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAtom } from 'jotai';
import { mockModeAtom } from '../utils/mockState';
import { mockDashboardData } from '../utils/mockDashboardData';
import { mockTransactions, mockCategories, MockTransaction } from '../data/mockTransactionData';
import PageHeader from '../components/layout/PageHeader';
import TransactionDetailModal from '../components/transactions/TransactionDetailModal';
import CategoryBreakdownChart from '../components/transactions/CategoryBreakdownChart';
import AIConfidenceIndicator from '../components/transactions/AIConfidenceIndicator';
import toast from 'react-hot-toast';

// Use MockTransaction interface from mockTransactionData
type Transaction = MockTransaction;

interface CategoryStats {
  category: string;
  count: number;
  total: number;
  percentage: number;
  avgAmount: number;
  trend: 'up' | 'down' | 'stable';
}

const ViewTransactionsPage: React.FC = () => {
  const [mockMode] = useAtom(mockModeAtom);
  const [transactions, setTransactions] = useState<Transaction[]>(mockTransactions);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>(mockTransactions);
  const [loading, setLoading] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'category'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedType, setSelectedType] = useState<string>('All');
  const [dateRange, setDateRange] = useState<{start: string, end: string}>({
    start: '',
    end: ''
  });
  const [categoryStats, setCategoryStats] = useState<CategoryStats[]>([]);
  const [viewMode, setViewMode] = useState<'list' | 'cards' | 'chart'>('list');

  // Load mock data
  useEffect(() => {
    const loadMockData = () => {
      setLoading(true);
      
      // Use existing mock data and enhance it
      const mockTransactions: Transaction[] = mockDashboardData.transactions.map(tx => ({
        ...tx,
        ai_confidence: Math.random() * 0.4 + 0.6, // 60-100% confidence
        payment_method: ['Visa', 'Mastercard', 'Debit', 'Cash'][Math.floor(Math.random() * 4)],
        vendor: tx.description,
        receipt_url: tx.receipt_url || (Math.random() > 0.7 ? `https://images.pexels.com/photos/${Math.floor(Math.random() * 1000000)}/pexels-photo-${Math.floor(Math.random() * 1000000)}.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1` : undefined)
      }));

      // Add more mock transactions for better demo
      const additionalTransactions: Transaction[] = [
        {
          id: 'tx008',
          date: '2025-06-12',
          description: 'Spotify Premium',
          amount: 9.99,
          type: 'Debit',
          category: 'Entertainment',
          subcategory: 'Music',
          file_name: 'June_Statement.csv',
          hash_id: 'mock-hash-008',
          created_at: '2025-06-12T00:01:00Z',
          categorization_source: 'ai',
          ai_confidence: 0.95,
          payment_method: 'Visa',
          vendor: 'Spotify'
        },
        {
          id: 'tx009',
          date: '2025-06-11',
          description: 'Uber Eats',
          amount: 34.50,
          type: 'Debit',
          category: 'Food & Drink',
          subcategory: 'Delivery',
          file_name: 'June_Statement.csv',
          hash_id: 'mock-hash-009',
          created_at: '2025-06-11T19:30:00Z',
          categorization_source: 'ai',
          ai_confidence: 0.88,
          payment_method: 'Mastercard',
          vendor: 'Uber Eats'
        },
        {
          id: 'tx010',
          date: '2025-06-09',
          description: 'Home Depot',
          amount: 156.78,
          type: 'Debit',
          category: 'Home & Garden',
          subcategory: 'Tools',
          file_name: 'June_Statement.csv',
          hash_id: 'mock-hash-010',
          created_at: '2025-06-09T14:22:00Z',
          categorization_source: 'manual',
          ai_confidence: 0.72,
          payment_method: 'Visa',
          vendor: 'Home Depot'
        }
      ];

      const allTransactions = [...mockTransactions, ...additionalTransactions];
      setTransactions(allTransactions);
      setFilteredTransactions(allTransactions);
      
      // Calculate category stats
      calculateCategoryStats(allTransactions);
      
      setLoading(false);
    };

    loadMockData();
  }, []);

  const calculateCategoryStats = (txns: Transaction[]) => {
    const categoryMap = new Map<string, {count: number, total: number, amounts: number[]}>();
    
    txns.forEach(tx => {
      if (tx.type === 'Debit') {
        const existing = categoryMap.get(tx.category) || {count: 0, total: 0, amounts: []};
        existing.count++;
        existing.total += tx.amount;
        existing.amounts.push(tx.amount);
        categoryMap.set(tx.category, existing);
      }
    });

    const stats: CategoryStats[] = Array.from(categoryMap.entries()).map(([category, data]) => ({
      category,
      count: data.count,
      total: data.total,
      percentage: (data.total / txns.filter(tx => tx.type === 'Debit').reduce((sum, tx) => sum + tx.amount, 0)) * 100,
      avgAmount: data.total / data.count,
      trend: Math.random() > 0.5 ? 'up' : 'down'
    })).sort((a, b) => b.total - a.total);

    setCategoryStats(stats);
  };

  // Filter and sort transactions
  useEffect(() => {
    let filtered = [...transactions];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(tx => 
        tx.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tx.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tx.vendor?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Category filter
    if (selectedCategory !== 'All') {
      filtered = filtered.filter(tx => tx.category === selectedCategory);
    }

    // Type filter
    if (selectedType !== 'All') {
      filtered = filtered.filter(tx => tx.type === selectedType);
    }

    // Date range filter
    if (dateRange.start && dateRange.end) {
      filtered = filtered.filter(tx => {
        const txDate = new Date(tx.date);
        const startDate = new Date(dateRange.start);
        const endDate = new Date(dateRange.end);
        return txDate >= startDate && txDate <= endDate;
      });
    }

    // Sort
    filtered.sort((a, b) => {
      let aVal, bVal;
      switch (sortBy) {
        case 'date':
          aVal = new Date(a.date).getTime();
          bVal = new Date(b.date).getTime();
          break;
        case 'amount':
          aVal = a.amount;
          bVal = b.amount;
          break;
        case 'category':
          aVal = a.category;
          bVal = b.category;
          break;
        default:
          aVal = new Date(a.date).getTime();
          bVal = new Date(b.date).getTime();
      }
      
      return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
    });

    setFilteredTransactions(filtered);
  }, [transactions, searchTerm, selectedCategory, selectedType, dateRange, sortBy, sortOrder]);

  const handleEditTransaction = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
  };

  const handleSaveTransaction = (updatedTransaction: Transaction) => {
    setTransactions(prev => prev.map(tx => 
      tx.id === updatedTransaction.id ? updatedTransaction : tx
    ));
    setSelectedTransaction(null);
    toast.success('Transaction updated successfully!');
  };

  const handleDeleteTransaction = (transactionId: string) => {
    setTransactions(prev => prev.filter(tx => tx.id !== transactionId));
    setSelectedTransaction(null);
    toast.success('Transaction deleted successfully!');
  };

  const getCategories = () => {
    const categories = mockCategories.map(c => c.name);
    return ['All', ...categories.sort()];
  };

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

  const getCategorizationIcon = (source: string) => {
    switch (source) {
      case 'ai':
        return <Brain className="w-4 h-4 text-blue-500" />;
      case 'manual':
        return <Edit2 className="w-4 h-4 text-green-500" />;
      case 'memory':
        return <Zap className="w-4 h-4 text-purple-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getCategorizationLabel = (source: string) => {
    switch (source) {
      case 'ai':
        return 'AI Categorized';
      case 'manual':
        return 'Manual';
      case 'memory':
        return 'Learned';
      default:
        return 'Unknown';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading transactions...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900">
      <PageHeader />
      
      <div className="max-w-7xl mx-auto p-6">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Transaction History</h1>
              <p className="text-slate-400">
                {filteredTransactions.length} transactions • {formatCurrency(filteredTransactions.reduce((sum, tx) => sum + (tx.type === 'Debit' ? tx.amount : -tx.amount), 0))} net
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setViewMode(viewMode === 'list' ? 'cards' : 'list')}
                className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors"
              >
                {viewMode === 'list' ? <BarChart3 className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
              </button>
              <button className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors">
                <Download className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="flex items-center gap-4 mb-6">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search transactions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-800 text-white rounded-lg border border-slate-700 focus:border-orange-500 focus:outline-none"
              />
            </div>
            
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-2 bg-slate-800 text-white rounded-lg border border-slate-700 focus:border-orange-500 focus:outline-none"
            >
              {getCategories().map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>

            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="px-4 py-2 bg-slate-800 text-white rounded-lg border border-slate-700 focus:border-orange-500 focus:outline-none"
            >
              <option value="All">All Types</option>
              <option value="Debit">Debits</option>
              <option value="Credit">Credits</option>
            </select>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors flex items-center gap-2"
            >
              <Filter className="w-5 h-5" />
              Filters
            </button>
          </div>

          {/* Advanced Filters */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-slate-800 rounded-lg p-4 mb-6"
              >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm text-slate-300 mb-2">Start Date</label>
                    <input
                      type="date"
                      value={dateRange.start}
                      onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                      className="w-full px-3 py-2 bg-slate-700 text-white rounded-lg border border-slate-600 focus:border-orange-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-300 mb-2">End Date</label>
                    <input
                      type="date"
                      value={dateRange.end}
                      onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                      className="w-full px-3 py-2 bg-slate-700 text-white rounded-lg border border-slate-600 focus:border-orange-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-300 mb-2">Sort By</label>
                    <div className="flex gap-2">
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as 'date' | 'amount' | 'category')}
                        className="flex-1 px-3 py-2 bg-slate-700 text-white rounded-lg border border-slate-600 focus:border-orange-500 focus:outline-none"
                      >
                        <option value="date">Date</option>
                        <option value="amount">Amount</option>
                        <option value="category">Category</option>
                      </select>
                      <button
                        onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                        className="px-3 py-2 bg-slate-700 text-white rounded-lg border border-slate-600 hover:bg-slate-600 transition-colors"
                      >
                        {sortOrder === 'asc' ? <SortAsc className="w-5 h-5" /> : <SortDesc className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Category Breakdown Chart */}
        {viewMode === 'chart' && (
          <div className="mb-8">
            <CategoryBreakdownChart data={categoryStats} />
          </div>
        )}

        {/* Transactions List */}
        <div className="bg-slate-800 rounded-lg overflow-hidden">
          {viewMode === 'list' ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Description</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Category</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">AI Confidence</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {filteredTransactions.map((transaction) => (
                    <tr key={transaction.id} className="hover:bg-slate-700/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                        {formatDate(transaction.date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div>
                            <div className="text-sm font-medium text-white">{transaction.description}</div>
                            <div className="text-xs text-slate-400">{transaction.vendor}</div>
                          </div>
                          {transaction.receipt_url && (
                            <Receipt className="w-4 h-4 text-slate-400" />
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-600 text-slate-200">
                            {transaction.category}
                          </span>
                          {transaction.subcategory && (
                            <span className="text-xs text-slate-400">{transaction.subcategory}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`text-sm font-medium ${transaction.type === 'Debit' ? 'text-red-400' : 'text-green-400'}`}>
                          {transaction.type === 'Debit' ? '-' : '+'}{formatCurrency(transaction.amount)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {getCategorizationIcon(transaction.categorization_source)}
                          <AIConfidenceIndicator 
                            confidence={transaction.ai_confidence || 0.8} 
                            source={transaction.categorization_source}
                          />
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEditTransaction(transaction)}
                            className="text-slate-400 hover:text-white transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setSelectedTransaction(transaction)}
                            className="text-slate-400 hover:text-white transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredTransactions.map((transaction) => (
                  <motion.div
                    key={transaction.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-slate-700 rounded-lg p-4 hover:bg-slate-600 transition-colors cursor-pointer"
                    onClick={() => setSelectedTransaction(transaction)}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        {getCategorizationIcon(transaction.categorization_source)}
                        <span className="text-xs text-slate-400">{formatDate(transaction.date)}</span>
                      </div>
                      <div className={`text-sm font-medium ${transaction.type === 'Debit' ? 'text-red-400' : 'text-green-400'}`}>
                        {transaction.type === 'Debit' ? '-' : '+'}{formatCurrency(transaction.amount)}
                      </div>
                    </div>
                    
                    <div className="mb-3">
                      <div className="text-white font-medium mb-1">{transaction.description}</div>
                      <div className="text-sm text-slate-400">{transaction.vendor}</div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-slate-600 text-slate-200">
                        {transaction.category}
                      </span>
                      <AIConfidenceIndicator 
                        confidence={transaction.ai_confidence || 0.8} 
                        source={transaction.categorization_source}
                      />
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Empty State */}
        {filteredTransactions.length === 0 && (
          <div className="text-center py-12">
            <FileText className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-slate-400 mb-2">No transactions found</h3>
            <p className="text-slate-500">Try adjusting your filters or search terms.</p>
          </div>
        )}
      </div>

      {/* Transaction Detail Modal */}
      {selectedTransaction && (
        <TransactionDetailModal
          transaction={selectedTransaction}
          onClose={() => setSelectedTransaction(null)}
          onSave={handleSaveTransaction}
          onDelete={handleDeleteTransaction}
        />
      )}
    </div>
  );
};

export default ViewTransactionsPage;
