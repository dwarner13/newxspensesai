import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
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
  Trash2
} from 'lucide-react';

interface Transaction {
  id: string;
  date: string;
  description: string;
  category: string;
  amount: number;
  type: 'income' | 'expense';
}

const DashboardTransactionsPage: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedType, setSelectedType] = useState('All Types');
  const [isLoading, setIsLoading] = useState(true);

  // Mock data - in real app this would come from API
  useEffect(() => {
    const mockTransactions: Transaction[] = [
      {
        id: '1',
        date: '2024-01-15',
        description: 'Spotify Premium',
        category: 'Entertainment',
        amount: 9.99,
        type: 'expense'
      },
      {
        id: '2',
        date: '2024-01-14',
        description: 'Uber Eats',
        category: 'Food & Drink',
        amount: 34.50,
        type: 'expense'
      },
      {
        id: '3',
        date: '2024-01-14',
        description: 'Salary Deposit',
        category: 'Income',
        amount: 3500.00,
        type: 'income'
      },
      {
        id: '4',
        date: '2024-01-13',
        description: 'Amazon Purchase',
        category: 'Shopping',
        amount: 89.99,
        type: 'expense'
      },
      {
        id: '5',
        date: '2024-01-12',
        description: 'Gas Station',
        category: 'Transportation',
        amount: 45.20,
        type: 'expense'
      },
      {
        id: '6',
        date: '2024-01-11',
        description: 'Freelance Payment',
        category: 'Income',
        amount: 750.00,
        type: 'income'
      },
      {
        id: '7',
        date: '2024-01-10',
        description: 'Netflix Subscription',
        category: 'Entertainment',
        amount: 15.99,
        type: 'expense'
      },
      {
        id: '8',
        date: '2024-01-09',
        description: 'Grocery Store',
        category: 'Food & Drink',
        amount: 125.30,
        type: 'expense'
      },
      {
        id: '9',
        date: '2024-01-08',
        description: 'Electric Bill',
        category: 'Utilities',
        amount: 89.45,
        type: 'expense'
      },
      {
        id: '10',
        date: '2024-01-07',
        description: 'Coffee Shop',
        category: 'Food & Drink',
        amount: 12.50,
        type: 'expense'
      }
    ];

    setTimeout(() => {
      setTransactions(mockTransactions);
      setIsLoading(false);
    }, 1000);
  }, []);

  const categories = ['All', 'Entertainment', 'Food & Drink', 'Income', 'Shopping', 'Transportation', 'Utilities'];
  const types = ['All Types', 'Income', 'Expense'];

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
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Summary Cards */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8"
        >
          {/* Total Transactions */}
          <div className="bg-gradient-to-br from-white/5 to-white/2 backdrop-blur-sm rounded-xl p-6 border border-white/10">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/70 text-sm">Total Transactions</p>
                <p className="text-2xl font-bold text-white">{transactions.length}</p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500/30 to-purple-500/30 rounded-xl flex items-center justify-center">
                <FileText className="w-6 h-6 text-blue-300" />
              </div>
            </div>
          </div>

          {/* Net Amount */}
          <div className="bg-gradient-to-br from-white/5 to-white/2 backdrop-blur-sm rounded-xl p-6 border border-white/10">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/70 text-sm">Net Amount</p>
                <p className={`text-2xl font-bold ${netAmount >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {formatCurrency(netAmount)}
                </p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-green-500/30 to-emerald-500/30 rounded-xl flex items-center justify-center">
                {netAmount >= 0 ? (
                  <TrendingUp className="w-6 h-6 text-green-300" />
                ) : (
                  <TrendingDown className="w-6 h-6 text-red-300" />
                )}
              </div>
            </div>
          </div>

          {/* Total Income */}
          <div className="bg-gradient-to-br from-white/5 to-white/2 backdrop-blur-sm rounded-xl p-6 border border-white/10">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/70 text-sm">Total Income</p>
                <p className="text-2xl font-bold text-green-400">{formatCurrency(totalIncome)}</p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-green-500/30 to-emerald-500/30 rounded-xl flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-green-300" />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Filters and Search */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-br from-white/5 to-white/2 backdrop-blur-sm rounded-xl p-6 border border-white/10 mb-6"
        >
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/50 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search transactions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-purple-400 transition-colors"
                />
              </div>
            </div>

            {/* Category Filter */}
            <div className="lg:w-48">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-purple-400 transition-colors"
              >
                {categories.map(category => (
                  <option key={category} value={category} className="bg-slate-800">
                    {category}
                  </option>
                ))}
              </select>
            </div>

            {/* Type Filter */}
            <div className="lg:w-48">
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-purple-400 transition-colors"
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
              <button className="px-4 py-3 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Analytics
              </button>
              <button className="px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2">
                <Download className="w-4 h-4" />
                Export
              </button>
            </div>
          </div>
        </motion.div>

        {/* Transactions Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gradient-to-br from-white/5 to-white/2 backdrop-blur-sm rounded-xl border border-white/10 overflow-hidden"
        >
          <div className="p-6 border-b border-white/10">
            <h3 className="text-xl font-bold text-white">Transaction History</h3>
            <p className="text-white/70 text-sm mt-1">
              {filteredTransactions.length} transactions • {formatCurrency(netAmount)} net
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-white/5">
                <tr>
                  <th className="px-6 py-4 text-left text-white/70 font-medium">DATE</th>
                  <th className="px-6 py-4 text-left text-white/70 font-medium">DESCRIPTION</th>
                  <th className="px-6 py-4 text-left text-white/70 font-medium">CATEGORY</th>
                  <th className="px-6 py-4 text-left text-white/70 font-medium">AMOUNT</th>
                  <th className="px-6 py-4 text-left text-white/70 font-medium">ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.map((transaction, index) => (
                  <motion.tr
                    key={transaction.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="border-b border-white/10 hover:bg-white/5 transition-colors"
                  >
                    <td className="px-6 py-4 text-white/80 text-sm">
                      {formatDate(transaction.date)}
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-white font-medium">{transaction.description}</div>
                        <div className="text-white/60 text-sm">{transaction.description}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-white font-medium">{transaction.category}</div>
                        <div className="text-white/60 text-sm">
                          {transaction.category === 'Entertainment' && 'Music'}
                          {transaction.category === 'Food & Drink' && 'Delivery'}
                          {transaction.category === 'Income' && 'Salary'}
                          {transaction.category === 'Shopping' && 'Online'}
                          {transaction.category === 'Transportation' && 'Fuel'}
                          {transaction.category === 'Utilities' && 'Electric'}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`font-bold ${
                        transaction.type === 'income' ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button className="p-2 text-white/60 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredTransactions.length === 0 && (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-blue-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">No transactions found</h3>
              <p className="text-white/70">Try adjusting your search or filter criteria</p>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default DashboardTransactionsPage;

