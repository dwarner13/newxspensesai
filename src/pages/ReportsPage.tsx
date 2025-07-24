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
  DollarSign
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
import PageHeader from '../components/layout/PageHeader';

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
      setTransactions(transactionData);
      setCategories(categoryData);
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
    <>
      <PageHeader />
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <motion.h1 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-2xl font-bold"
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
                    ? 'bg-primary-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                3M
              </button>
              <button
                onClick={() => setSelectedPeriod('6m')}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                  selectedPeriod === '6m' 
                    ? 'bg-primary-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                6M
              </button>
              <button
                onClick={() => setSelectedPeriod('1y')}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                  selectedPeriod === '1y' 
                    ? 'bg-primary-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                1Y
              </button>
              <button
                onClick={() => setSelectedPeriod('custom')}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                  selectedPeriod === 'custom' 
                    ? 'bg-primary-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Custom
              </button>
            </div>
            
            <button 
              className="btn-outline flex items-center"
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
            className="card"
          >
            <div className="flex items-center space-x-4">
              <Calendar size={20} className="text-primary-600" />
              <span className="font-medium">Custom Date Range:</span>
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
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard
                title="Total Income"
                value={formatCurrency(analytics.totalIncome)}
                icon={<TrendingUp size={24} className="text-success-600" />}
                className="bg-gradient-to-br from-success-50 to-success-100"
              />
              
              <StatCard
                title="Total Expenses"
                value={formatCurrency(analytics.totalExpenses)}
                icon={<TrendingDown size={24} className="text-error-600" />}
                className="bg-gradient-to-br from-error-50 to-error-100"
              />
              
              <StatCard
                title="Net Difference"
                value={formatCurrency(analytics.totalIncome - analytics.totalExpenses)}
                icon={<DollarSign size={24} className="text-primary-600" />}
                className="bg-gradient-to-br from-primary-50 to-primary-100"
              />
              
              <StatCard
                title="Avg Monthly Spending"
                value={formatCurrency(analytics.monthlyAverage)}
                icon={<BarChart3 size={24} className="text-secondary-600" />}
                className="bg-gradient-to-br from-secondary-50 to-secondary-100"
              />
            </div>

            {/* Additional Analytics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="card">
                <h3 className="text-lg font-semibold mb-4">Transaction Summary</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Transactions:</span>
                    <span className="font-medium">{analytics.transactionCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Average Amount:</span>
                    <span className="font-medium">{formatCurrency(analytics.avgTransactionAmount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Date Range:</span>
                    <span className="font-medium text-sm">
                      {format(new Date(dateRange.startDate), 'MMM dd')} - {format(new Date(dateRange.endDate), 'MMM dd')}
                    </span>
                  </div>
                </div>
              </div>

              <div className="card">
                <h3 className="text-lg font-semibold mb-4">Top Spending Category</h3>
                {analytics.topCategory ? (
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary-600 mb-2">
                      {analytics.topCategory.category}
                    </div>
                    <div className="text-lg text-gray-600">
                      {formatCurrency(analytics.topCategory.amount)}
                    </div>
                    <div className="text-sm text-gray-500 mt-2">
                      {((analytics.topCategory.amount / analytics.totalExpenses) * 100).toFixed(1)}% of total expenses
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-gray-500">
                    No expense data available
                  </div>
                )}
              </div>

              <div className="card">
                <h3 className="text-lg font-semibold mb-4">Savings Rate</h3>
                <div className="text-center">
                  <div className="text-2xl font-bold text-success-600 mb-2">
                    {analytics.totalIncome > 0 
                      ? (((analytics.totalIncome - analytics.totalExpenses) / analytics.totalIncome) * 100).toFixed(1)
                      : '0'
                    }%
                  </div>
                  <div className="text-sm text-gray-500">
                    {analytics.totalIncome > analytics.totalExpenses ? 'Positive' : 'Negative'} savings rate
                  </div>
                </div>
              </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="card">
                <h2 className="text-xl font-bold mb-6">Spending by Category</h2>
                <SpendingChart transactions={transactions} type="bar" />
              </div>
              
              <div className="card">
                <h2 className="text-xl font-bold mb-6">Category Distribution</h2>
                <SpendingChart transactions={transactions} type="pie" />
              </div>
            </div>

            {/* Monthly Breakdown */}
            <div className="card">
              <h2 className="text-xl font-bold mb-6">Monthly Breakdown</h2>
              <MonthlyBreakdown 
                transactions={transactions}
                categories={categories.filter(c => c !== 'All')}
              />
            </div>
          </>
        ) : (
          <div className="text-center py-12">
            <div className="flex justify-center mb-4">
              <BarChart3 className="h-12 w-12 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No data for selected period</h3>
            <p className="text-gray-500 mb-6">
              Try selecting a different date range or upload some transactions to see your financial reports.
            </p>
            <div className="flex justify-center space-x-4">
              <button 
                onClick={() => setSelectedPeriod('1y')}
                className="btn-outline"
              >
                View Last Year
              </button>
              <button 
                onClick={() => window.location.href = '/upload'}
                className="btn-primary"
              >
                Upload Transactions
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default ReportsPage;
