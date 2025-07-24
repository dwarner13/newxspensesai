import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Target,
  AlertTriangle,
  Lightbulb,
  Calendar,
  Award
} from 'lucide-react';
import { useMockData } from '../../hooks/useMockData';
import { useMonthSelection } from '../../hooks/useMonthSelection';
import StatCard from './StatCard';
import SpendingChart from './SpendingChart';
import MonthlyBreakdown from './MonthlyBreakdown';

const MockDashboard = () => {
  const { 
    user, 
    transactions, 
    aiInsights, 
    financialGoals, 
    upcomingBills, 
    gamification,
    formatMonthLabel 
  } = useMockData();
  
  const { selectedMonth, formatMonthLabel: formatSelectedMonth } = useMonthSelection();
  
  // Filter transactions for selected month
  const currentMonthTransactions = transactions.filter(transaction => {
    const transactionDate = new Date(transaction.date);
    const selectedDate = new Date(selectedMonth + '-01');
    return transactionDate.getMonth() === selectedDate.getMonth() && 
           transactionDate.getFullYear() === selectedDate.getFullYear();
  });

  // Calculate monthly totals
  const monthlyIncome = currentMonthTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);
    
  const monthlyExpenses = currentMonthTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);
    
  const monthlyNet = monthlyIncome - monthlyExpenses;

  return (
    <div className="dashboard-container">
      {/* Dashboard Header */}
      <motion.div 
        className="dashboard-header"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="header-content">
          <div className="welcome-section">
            <h1 className="welcome-title">
              Welcome back, {user.name.split(' ')[0]}! 👋
            </h1>
            <p className="welcome-subtitle">
              Here's your financial overview for {formatSelectedMonth(selectedMonth)}
            </p>
          </div>
          <div className="header-actions">
            <motion.button 
              className="header-action-btn"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Calendar size={16} />
              <span>View Calendar</span>
            </motion.button>
          </div>
        </div>
      </motion.div>

      {/* Financial Summary Cards */}
      <motion.div 
        className="stats-grid"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <StatCard
          title="Monthly Income"
          value={`$${monthlyIncome.toLocaleString()}`}
          change="+12.5%"
          changeType="positive"
          icon={<TrendingUp size={20} />}
          color="green"
        />
        <StatCard
          title="Monthly Expenses"
          value={`$${monthlyExpenses.toLocaleString()}`}
          change="-8.2%"
          changeType="negative"
          icon={<TrendingDown size={20} />}
          color="red"
        />
        <StatCard
          title="Net Savings"
          value={`$${monthlyNet.toLocaleString()}`}
          change="+23.1%"
          changeType="positive"
          icon={<DollarSign size={20} />}
          color="blue"
        />
        <StatCard
          title="Xspenses Score"
          value={user.xspensesScore.toString()}
          change="+15 pts"
          changeType="positive"
          icon={<Award size={20} />}
          color="purple"
        />
      </motion.div>

      {/* Main Content Grid */}
      <div className="dashboard-grid">
        {/* Recent Transactions */}
        <motion.div 
          className="dashboard-card transactions-card"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="card-header">
            <h3 className="card-title">Recent Transactions</h3>
            <span className="card-subtitle">Last 5 transactions</span>
          </div>
          <div className="transactions-list">
            {currentMonthTransactions.slice(0, 5).map((transaction, index) => (
              <motion.div 
                key={transaction.id}
                className={`transaction-item ${transaction.needsReview ? 'needs-review' : ''}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + index * 0.1 }}
              >
                <div className="transaction-info">
                  <div className="transaction-icon">
                    {transaction.category === 'Food & Dining' ? '🍕' :
                     transaction.category === 'Transportation' ? '🚗' :
                     transaction.category === 'Shopping' ? '🛍️' :
                     transaction.category === 'Entertainment' ? '🎬' :
                     transaction.category === 'Utilities' ? '⚡' : '💰'}
                  </div>
                  <div className="transaction-details">
                    <span className="transaction-merchant">{transaction.merchant}</span>
                    <span className="transaction-category">{transaction.category}</span>
                  </div>
                </div>
                <div className="transaction-amount">
                  <span className={`amount ${transaction.type}`}>
                    {transaction.type === 'expense' ? '-' : '+'}${transaction.amount.toLocaleString()}
                  </span>
                  {transaction.needsReview && (
                    <AlertTriangle size={14} className="review-icon" />
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* AI Insights */}
        <motion.div 
          className="dashboard-card insights-card"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div className="card-header">
            <h3 className="card-title">AI Insights</h3>
            <span className="card-subtitle">Smart recommendations</span>
          </div>
          <div className="insights-list">
            {aiInsights.map((insight, index) => (
              <motion.div 
                key={index}
                className={`insight-item ${insight.priority}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + index * 0.1 }}
              >
                <div className="insight-icon">
                  <Lightbulb size={16} />
                </div>
                <div className="insight-content">
                  <p className="insight-text">{insight.message}</p>
                  <span className="insight-priority">{insight.priority}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Financial Goals */}
        <motion.div 
          className="dashboard-card goals-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <div className="card-header">
            <h3 className="card-title">Financial Goals</h3>
            <span className="card-subtitle">Track your progress</span>
          </div>
          <div className="goals-list">
            {financialGoals.map((goal, index) => (
              <motion.div 
                key={goal.id}
                className="goal-item"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 + index * 0.1 }}
              >
                <div className="goal-header">
                  <div className="goal-icon">
                    <Target size={16} />
                  </div>
                  <div className="goal-info">
                    <span className="goal-name">{goal.name}</span>
                    <span className="goal-amount">${goal.targetAmount.toLocaleString()}</span>
                  </div>
                </div>
                <div className="goal-progress">
                  <div className="progress-bar">
                    <motion.div 
                      className="progress-fill"
                      initial={{ width: 0 }}
                      animate={{ width: `${goal.progress}%` }}
                      transition={{ delay: 0.8 + index * 0.1, duration: 1 }}
                    />
                  </div>
                  <span className="progress-text">{goal.progress}%</span>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Upcoming Bills */}
        <motion.div 
          className="dashboard-card bills-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <div className="card-header">
            <h3 className="card-title">Upcoming Bills</h3>
            <span className="card-subtitle">Next 7 days</span>
          </div>
          <div className="bills-list">
            {upcomingBills.map((bill, index) => (
              <motion.div 
                key={bill.id}
                className="bill-item"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.7 + index * 0.1 }}
              >
                <div className="bill-info">
                  <span className="bill-name">{bill.name}</span>
                  <span className="bill-date">{bill.dueDate}</span>
                </div>
                <span className="bill-amount">${bill.amount.toLocaleString()}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Charts Section */}
      <motion.div 
        className="charts-section"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
      >
        <div className="charts-grid">
          <SpendingChart transactions={currentMonthTransactions} />
          <MonthlyBreakdown transactions={currentMonthTransactions} />
        </div>
      </motion.div>

      {/* Gamification Stats */}
      <motion.div 
        className="gamification-section"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
      >
        <div className="gamification-card">
          <div className="gamification-header">
            <h3>Your Progress</h3>
            <span>Level {gamification.level} • {gamification.xp} XP</span>
          </div>
          <div className="gamification-stats">
            <div className="stat">
              <span className="stat-value">{gamification.streak}</span>
              <span className="stat-label">Day Streak</span>
            </div>
            <div className="stat">
              <span className="stat-value">{gamification.badgesEarned}</span>
              <span className="stat-label">Badges</span>
            </div>
            <div className="stat">
              <span className="stat-value">{gamification.goalsCompleted}</span>
              <span className="stat-label">Goals Completed</span>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default MockDashboard;
