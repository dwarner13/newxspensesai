import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  BarChart3, 
  PieChart, 
  TrendingUp, 
  TrendingDown, 
  Calendar,
  Download,
  Filter,
  DollarSign,
  Menu
} from 'lucide-react';
import { getTransactions, getCategories } from '../lib/supabase';
import { Transaction } from '../types/database.types';
import SpendingChart from '../components/dashboard/SpendingChart';
import MonthlyBreakdown from '../components/dashboard/MonthlyBreakdown';
import StatCard from '../components/dashboard/StatCard';
import DateRangePicker from '../components/filters/DateRangePicker';
import { exportToPDF, exportToCSV } from '../utils/exportUtils';
import toast from 'react-hot-toast';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';

const ReportsPage = () => {
  console.log("Reports page loaded");
  
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState({
    startDate: format(subMonths(new Date(), 5), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd')
  });
  const [selectedPeriod, setSelectedPeriod] = useState<'3m' | '6m' | '1y' | 'custom'>('6m');
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, [dateRange]);

  useEffect(() => {
    // Set date range based on selected period
    const now = new Date();
    let startDate: string;
    
    switch (selectedPeriod) {
      case '3m':
        startDate = format(subMonths(now, 2), 'yyyy-MM-dd');
        break;
      case '6m':
        startDate = format(subMonths(now, 5), 'yyyy-MM-dd');
        break;
      case '1y':
        startDate = format(subMonths(now, 11), 'yyyy-MM-dd');
        break;
      default:
        return; // Don't update for custom
    }
    
    setDateRange({
      startDate,
      endDate: format(now, 'yyyy-MM-dd')
    });
  }, [selectedPeriod]);

  const fetchData = async () => {
    try {
      setLoading(true);
      console.log("Fetching transactions with date range:", dateRange);
      
      const [transactionData, categoryData] = await Promise.all([
        getTransactions(dateRange),
        getCategories()
      ]);
      
      console.log("Fetched transactions:", transactionData.length);
      // Type assertion to handle the database return type
      setTransactions(transactionData as any);
      // Handle both string[] and object[] return types from getCategories
      const categoriesArray = Array.isArray(categoryData) 
        ? categoryData.map(cat => typeof cat === 'string' ? cat : cat.name)
        : [];
      setCategories(categoriesArray);
    } catch (error) {
      console.error('Error fetching report data:', error);
      toast.error('Failed to load report data');
    } finally {
      setLoading(false);
    }
  };

  // Calculate analytics
  const analytics = {
    totalIncome: transactions
      .filter(t => t.type === 'Credit')
      .reduce((sum, t) => sum + t.amount, 0),
    totalExpenses: transactions
      .filter(t => t.type === 'Debit')
      .reduce((sum, t) => sum + t.amount, 0),
    transactionCount: transactions.length,
    avgTransactionAmount: transactions.length > 0 
      ? transactions.reduce((sum, t) => sum + t.amount, 0) / transactions.length 
      : 0,
    topCategory: getTopCategory(),
    monthlyAverage: getMonthlyAverage()
  };

  function getTopCategory() {
    const categoryTotals = transactions
      .filter(t => t.type === 'Debit' && t.category !== 'Income')
      .reduce((acc, t) => {
        acc[t.category] = (acc[t.category] || 0) + t.amount;
        return acc;
      }, {} as Record<string, number>);
    
    const topEntry = Object.entries(categoryTotals)
      .sort(([, a], [, b]) => b - a)[0];
    
    return topEntry ? { category: topEntry[0], amount: topEntry[1] } : null;
  }

  function getMonthlyAverage() {
    const monthlyTotals = transactions
      .filter(t => t.type === 'Debit')
      .reduce((acc, t) => {
        const month = format(new Date(t.date), 'yyyy-MM');
        acc[month] = (acc[month] || 0) + t.amount;
        return acc;
      }, {} as Record<string, number>);
    
    const months = Object.keys(monthlyTotals);
    return months.length > 0 
      ? Object.values(monthlyTotals).reduce((sum, total) => sum + total, 0) / months.length
      : 0;
  }

  const handleExport = async (type: 'pdf' | 'csv') => {
    try {
      if (transactions.length === 0) {
        toast.error('No data to export');
        return;
      }

      const categoryTotals = transactions
        .filter(t => t.type === 'Debit' && t.category !== 'Income')
        .reduce((acc, t) => {
          acc[t.category] = (acc[t.category] || 0) + t.amount;
          return acc;
        }, {} as Record<string, number>);

      if (type === 'pdf') {
        exportToPDF(transactions, {
          income: analytics.totalIncome,
          expenses: analytics.totalExpenses,
          net: analytics.totalIncome - analytics.totalExpenses
        }, categoryTotals);
        toast.success('PDF report exported successfully');
      } else {
        exportToCSV(transactions);
        toast.success('CSV report exported successfully');
      }
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export report');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0f172a] to-[#1a1e3a] text-white">
      {/* Header */}
      <header className="p-6">
        <h1 className="text-2xl font-bold">Financial Reports</h1>
        <p className="text-lg text-gray-300 mt-2">View detailed financial reports and analytics</p>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-6">
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <motion.h1 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-2xl font-bold text-white"
            >
              Financial Reports
            </motion.h1>
            
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-wrap gap-3"
            >
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setSelectedPeriod('3m')}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                    selectedPeriod === '3m' 
                      ? 'bg-purple-600 text-white' 
                      : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
                >
                  3M
                </button>
                <button
                  onClick={() => setSelectedPeriod('6m')}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                    selectedPeriod === '6m' 
                      ? 'bg-purple-600 text-white' 
                      : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
                >
                  6M
                </button>
                <button
                  onClick={() => setSelectedPeriod('1y')}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                    selectedPeriod === '1y' 
                      ? 'bg-purple-600 text-white' 
                      : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
                >
                  1Y
                </button>
                <button
                  onClick={() => setSelectedPeriod('custom')}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                    selectedPeriod === 'custom' 
                      ? 'bg-purple-600 text-white' 
                      : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
                >
                  Custom
                </button>
              </div>
              
              <button 
                className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg flex items-center transition-all duration-200"
                onClick={() => handleExport('pdf')}
                disabled={transactions.length === 0}
              >
                <Download size={16} className="mr-2" />
                Export PDF
              </button>
            </motion.div>
          </div>

          {selectedPeriod === 'custom' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20"
            >
              <div className="flex items-center space-x-4">
                <Calendar size={20} className="text-purple-400" />
                <span className="font-medium text-white">Custom Date Range:</span>
                <DateRangePicker
                  startDate={dateRange.startDate}
                  endDate={dateRange.endDate}
                  onChange={(startDate, endDate) => {
                    setDateRange({
                      startDate: startDate || dateRange.startDate,
                      endDate: endDate || dateRange.endDate
                    });
                  }}
                />
              </div>
            </motion.div>
          )}

          {transactions.length > 0 ? (
            <>
              {/* Analytics Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                  title="Total Income"
                  value={formatCurrency(analytics.totalIncome)}
                  icon={<TrendingUp size={24} className="text-green-400" />}
                  className="bg-gradient-to-br from-green-500/20 to-green-600/20 border border-green-400/30"
                />
                <StatCard
                  title="Total Expenses"
                  value={formatCurrency(analytics.totalExpenses)}
                  icon={<TrendingDown size={24} className="text-red-400" />}
                  className="bg-gradient-to-br from-red-500/20 to-red-600/20 border border-red-400/30"
                />
                <StatCard
                  title="Net Cash Flow"
                  value={formatCurrency(analytics.totalIncome - analytics.totalExpenses)}
                  icon={<DollarSign size={24} className="text-blue-400" />}
                  className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 border border-blue-400/30"
                />
                <StatCard
                  title="Transactions"
                  value={analytics.transactionCount.toString()}
                  icon={<BarChart3 size={24} className="text-purple-400" />}
                  className="bg-gradient-to-br from-purple-500/20 to-purple-600/20 border border-purple-400/30"
                />
              </div>

              {/* Additional Analytics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
                  <h3 className="text-lg font-semibold mb-4 text-white">Monthly Average</h3>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-400 mb-2">
                      {formatCurrency(analytics.monthlyAverage)}
                    </div>
                    <div className="text-sm text-white/50">
                      Average monthly spending
                    </div>
                    <div className="text-xs text-white/40 mt-2">
                      {format(new Date(dateRange.startDate), 'MMM dd')} - {format(new Date(dateRange.endDate), 'MMM dd')}
                    </div>
                  </div>
                </div>

                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
                  <h3 className="text-lg font-semibold mb-4 text-white">Top Spending Category</h3>
                  {analytics.topCategory ? (
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-400 mb-2">
                        {analytics.topCategory.category}
                      </div>
                      <div className="text-lg text-white/70">
                        {formatCurrency(analytics.topCategory.amount)}
                      </div>
                      <div className="text-sm text-white/50 mt-2">
                        {((analytics.topCategory.amount / analytics.totalExpenses) * 100).toFixed(1)}% of total expenses
                      </div>
                    </div>
                  ) : (
                    <div className="text-center text-white/50">
                      No expense data available
                    </div>
                  )}
                </div>

                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
                  <h3 className="text-lg font-semibold mb-4 text-white">Savings Rate</h3>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-400 mb-2">
                      {analytics.totalIncome > 0 
                        ? (((analytics.totalIncome - analytics.totalExpenses) / analytics.totalIncome) * 100).toFixed(1)
                        : '0'
                      }%
                    </div>
                    <div className="text-sm text-white/50">
                      {analytics.totalIncome > analytics.totalExpenses ? 'Positive' : 'Negative'} savings rate
                    </div>
                  </div>
                </div>
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
                  <h2 className="text-xl font-bold mb-6 text-white">Spending by Category</h2>
                  <SpendingChart transactions={transactions} type="bar" />
                </div>
                
                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
                  <h2 className="text-xl font-bold mb-6 text-white">Category Distribution</h2>
                  <SpendingChart transactions={transactions} type="pie" />
                </div>
              </div>

              {/* Monthly Breakdown */}
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
                <h2 className="text-xl font-bold mb-6 text-white">Monthly Breakdown</h2>
                <MonthlyBreakdown 
                  transactions={transactions}
                  categories={categories.filter(c => c !== 'All')}
                />
              </div>
            </>
          ) : (
            <div className="text-center py-12">
              <div className="flex justify-center mb-4">
                <BarChart3 className="h-12 w-12 text-white/40" />
              </div>
              <h3 className="text-lg font-medium text-white mb-2">No data for selected period</h3>
              <p className="text-white/60 mb-6">
                Try selecting a different date range or upload some transactions to see your financial reports.
              </p>
              <div className="flex justify-center space-x-4">
                <button 
                  onClick={() => setSelectedPeriod('1y')}
                  className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg transition-all duration-200"
                >
                  View Last Year
                </button>
                <button 
                  onClick={() => window.location.href = '/upload'}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-all duration-200"
                >
                  Upload Transactions
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default ReportsPage;
