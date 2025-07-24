import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  BarChart, 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Calendar,
  Filter,
  PieChart
} from 'lucide-react';
import { fetchMockDashboardData } from '../utils/mockDashboardData';
import TransactionCards from '../components/transactions/TransactionCards';

const DashboardDemo = () => {
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [timeframe, setTimeframe] = useState<'week' | 'month' | 'year'>('month');
  const [viewingReceipt, setViewingReceipt] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, [timeframe]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const data = await fetchMockDashboardData({ timeframe });
      setDashboardData(data);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
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

  const handleViewReceipt = (receiptUrl: string) => {
    setViewingReceipt(receiptUrl);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="  py-8 px-4">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-center space-x-3 mb-4">
          <Link to="/" className="text-gray-400 hover:text-gray-600 transition-colors">
            <ArrowLeft size={24} />
          </Link>
          <h1 className="text-3xl font-bold">Financial Dashboard</h1>
        </div>
        <p className="text-gray-600">
          Overview of your financial health and recent transactions.
        </p>
      </motion.div>

      <div className="mb-6 flex flex-wrap gap-3">
        <div className="flex items-center space-x-2 bg-white rounded-lg shadow-sm p-2 border border-gray-200">
          <Calendar size={16} className="text-gray-500" />
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setTimeframe('week')}
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                timeframe === 'week'
                  ? 'bg-primary-100 text-primary-800'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              This Week
            </button>
            <button
              onClick={() => setTimeframe('month')}
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                timeframe === 'month'
                  ? 'bg-primary-100 text-primary-800'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              This Month
            </button>
            <button
              onClick={() => setTimeframe('year')}
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                timeframe === 'year'
                  ? 'bg-primary-100 text-primary-800'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              This Year
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-xl p-6 shadow-sm border border-gray-200"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Income</p>
              <p className="text-2xl font-bold text-success-600">{formatCurrency(dashboardData.totalIncome)}</p>
            </div>
            <div className="w-10 h-10 bg-success-100 rounded-full flex items-center justify-center">
              <TrendingUp size={20} className="text-success-600" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-xl p-6 shadow-sm border border-gray-200"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Expenses</p>
              <p className="text-2xl font-bold text-error-600">{formatCurrency(dashboardData.totalExpenses)}</p>
            </div>
            <div className="w-10 h-10 bg-error-100 rounded-full flex items-center justify-center">
              <TrendingDown size={20} className="text-error-600" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-xl p-6 shadow-sm border border-gray-200"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Net Savings</p>
              <p className="text-2xl font-bold text-primary-600">{formatCurrency(dashboardData.netSavings)}</p>
            </div>
            <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
              <DollarSign size={20} className="text-primary-600" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-xl p-6 shadow-sm border border-gray-200"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Savings Rate</p>
              <p className="text-2xl font-bold text-secondary-600">{dashboardData.savingsRate.toFixed(1)}%</p>
            </div>
            <div className="w-10 h-10 bg-secondary-100 rounded-full flex items-center justify-center">
              <PieChart size={20} className="text-secondary-600" />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Recent Transactions with Receipts */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 mb-8"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Recent Transactions</h2>
          <Link to="/transactions" className="text-primary-600 hover:text-primary-700 text-sm font-medium">
            View All
          </Link>
        </div>

        <TransactionCards 
          transactions={dashboardData.transactions.filter((tx: any) => tx.receipt_url)} 
          onViewReceipt={handleViewReceipt}
        />
      </motion.div>

      {/* Financial Goals */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="bg-white rounded-xl p-6 shadow-sm border border-gray-200"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Financial Goals</h2>
          <button className="text-primary-600 hover:text-primary-700 text-sm font-medium">
            Add Goal
          </button>
        </div>

        <div className="space-y-6">
          {dashboardData.goals.map((goal: any, index: number) => (
            <div key={index} className="space-y-2">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-medium text-gray-900">{goal.name}</h3>
                  <p className="text-sm text-gray-500">{goal.category} • Due {new Date(goal.dueDate).toLocaleDateString()}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-gray-900">{formatCurrency(goal.current)} / {formatCurrency(goal.target)}</p>
                  <p className="text-sm text-gray-500">{Math.round((goal.current / goal.target) * 100)}% complete</p>
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div 
                  className="bg-primary-600 h-2.5 rounded-full" 
                  style={{ width: `${Math.min(100, (goal.current / goal.target) * 100)}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Receipt Viewer Modal */}
      {viewingReceipt && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setViewingReceipt(null)}
        >
          <div 
            className="bg-white rounded-lg max-w-3xl max-h-[90vh] overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-semibold">Receipt View</h3>
              <button 
                onClick={() => setViewingReceipt(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
            <div className="p-4 overflow-auto">
              <img 
                src={viewingReceipt} 
                alt="Receipt" 
                className="max-w-full h-auto "
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardDemo;
