import React from 'react';
import { BarChart3, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';

const AnalyticsCard = () => {
  const monthlyData = {
    income: 8200,
    expenses: 6450,
    savings: 1750,
    savingsRate: 21.3,
    change: 12.5
  };

  // Simple chart data for demo
  const chartData = [65, 72, 68, 75, 82, 78, 85, 79, 83, 87, 91, 88];

  return (
    <div className="bg-gradient-to-br from-purple-900/60 to-blue-900/60 backdrop-blur-sm rounded-2xl p-6 border border-white/10 shadow-xl hover:shadow-2xl transition-all duration-300">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
          <BarChart3 size={20} className="text-white" />
        </div>
        <h3 className="text-lg font-semibold text-white">Analytics</h3>
      </div>

      {/* Monthly Summary */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-white/5 rounded-lg p-3 text-center">
          <div className="flex items-center justify-center gap-1 text-green-400 mb-1">
            <TrendingUp size={12} />
            <span className="text-xs">Income</span>
          </div>
          <p className="text-lg font-bold text-white">${monthlyData.income.toLocaleString()}</p>
        </div>
        <div className="bg-white/5 rounded-lg p-3 text-center">
          <div className="flex items-center justify-center gap-1 text-red-400 mb-1">
            <TrendingDown size={12} />
            <span className="text-xs">Expenses</span>
          </div>
          <p className="text-lg font-bold text-white">${monthlyData.expenses.toLocaleString()}</p>
        </div>
        <div className="bg-white/5 rounded-lg p-3 text-center">
          <div className="flex items-center justify-center gap-1 text-blue-400 mb-1">
            <DollarSign size={12} />
            <span className="text-xs">Savings</span>
          </div>
          <p className="text-lg font-bold text-white">${monthlyData.savings.toLocaleString()}</p>
        </div>
      </div>

      {/* Savings Rate */}
      <div className="bg-white/5 rounded-lg p-3 mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-white">Savings Rate</span>
          <span className="text-sm font-bold text-green-400">{monthlyData.savingsRate}%</span>
        </div>
        <div className="w-full bg-white/20 rounded-full h-2">
          <div 
            className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${monthlyData.savingsRate}%` }}
          />
        </div>
      </div>

      {/* Mini Chart */}
      <div className="bg-white/5 rounded-lg p-3">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-white">Monthly Trend</span>
          <div className="flex items-center gap-1 text-green-400">
            <TrendingUp size={12} />
            <span className="text-xs">+{monthlyData.change}%</span>
          </div>
        </div>
        <div className="flex items-end justify-between h-16 gap-1">
          {chartData.map((value, index) => (
            <div
              key={index}
              className="flex-1 bg-gradient-to-t from-green-500 to-emerald-500 rounded-t"
              style={{ height: `${value}%` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default AnalyticsCard; 
