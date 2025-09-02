import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  PieChart, 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Banknote, 
  Hash,
  Eye,
  EyeOff
} from 'lucide-react';

interface CategoryStats {
  category: string;
  count: number;
  total: number;
  percentage: number;
  avgAmount: number;
  trend: 'up' | 'down' | 'stable';
}

interface CategoryBreakdownChartProps {
  data: CategoryStats[];
  maxItems?: number;
}

const CategoryBreakdownChart: React.FC<CategoryBreakdownChartProps> = ({
  data,
  maxItems = 8
}) => {
  const [viewMode, setViewMode] = useState<'chart' | 'list'>('chart');
  const [showAll, setShowAll] = useState(false);

  const displayData = showAll ? data : data.slice(0, maxItems);
  const totalAmount = data.reduce((sum, item) => sum + item.total, 0);
  const totalCount = data.reduce((sum, item) => sum + item.count, 0);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getCategoryColor = (index: number) => {
    const colors = [
      'bg-blue-500',
      'bg-green-500',
      'bg-purple-500',
      'bg-orange-500',
      'bg-red-500',
      'bg-yellow-500',
      'bg-pink-500',
      'bg-indigo-500',
      'bg-teal-500',
      'bg-cyan-500'
    ];
    return colors[index % colors.length];
  };

  const getCategoryTextColor = (index: number) => {
    const colors = [
      'text-blue-400',
      'text-green-400',
      'text-purple-400',
      'text-orange-400',
      'text-red-400',
      'text-yellow-400',
      'text-pink-400',
      'text-indigo-400',
      'text-teal-400',
      'text-cyan-400'
    ];
    return colors[index % colors.length];
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-4 h-4 text-green-400" />;
      case 'down':
        return <TrendingDown className="w-4 h-4 text-red-400" />;
      default:
        return <div className="w-4 h-4 bg-slate-400 rounded-full" />;
    }
  };

  return (
    <div className="bg-slate-800 rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold text-white mb-2">Category Breakdown</h3>
          <p className="text-slate-400">
            {totalCount} transactions • {formatCurrency(totalAmount)} total
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode(viewMode === 'chart' ? 'list' : 'chart')}
            className="p-2 bg-slate-700 text-slate-400 rounded-lg hover:bg-slate-600 hover:text-white transition-colors"
          >
            {viewMode === 'chart' ? <BarChart3 className="w-5 h-5" /> : <PieChart className="w-5 h-5" />}
          </button>
          {data.length > maxItems && (
            <button
              onClick={() => setShowAll(!showAll)}
              className="p-2 bg-slate-700 text-slate-400 rounded-lg hover:bg-slate-600 hover:text-white transition-colors"
            >
              {showAll ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          )}
        </div>
      </div>

      {viewMode === 'chart' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pie Chart Visualization */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-white">Spending Distribution</h4>
            <div className="relative w-64 h-64 mx-auto">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                {displayData.map((item, index) => {
                  const startAngle = displayData.slice(0, index).reduce((sum, prev) => sum + (prev.percentage / 100) * 360, 0);
                  const endAngle = startAngle + (item.percentage / 100) * 360;
                  
                  const startAngleRad = (startAngle * Math.PI) / 180;
                  const endAngleRad = (endAngle * Math.PI) / 180;
                  
                  const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;
                  
                  const x1 = 50 + 40 * Math.cos(startAngleRad);
                  const y1 = 50 + 40 * Math.sin(startAngleRad);
                  const x2 = 50 + 40 * Math.cos(endAngleRad);
                  const y2 = 50 + 40 * Math.sin(endAngleRad);
                  
                  const pathData = [
                    `M 50 50`,
                    `L ${x1} ${y1}`,
                    `A 40 40 0 ${largeArcFlag} 1 ${x2} ${y2}`,
                    `Z`
                  ].join(' ');
                  
                  return (
                    <path
                      key={item.category}
                      d={pathData}
                      fill={`url(#gradient-${index})`}
                      className="hover:opacity-80 transition-opacity cursor-pointer"
                    />
                  );
                })}
                
                {/* Gradients */}
                {displayData.map((_, index) => (
                  <defs key={index}>
                    <linearGradient id={`gradient-${index}`} x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor={getCategoryColor(index).replace('bg-', '')} stopOpacity="0.8" />
                      <stop offset="100%" stopColor={getCategoryColor(index).replace('bg-', '')} stopOpacity="0.6" />
                    </linearGradient>
                  </defs>
                ))}
              </svg>
              
              {/* Center text */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">{formatCurrency(totalAmount)}</div>
                  <div className="text-sm text-slate-400">Total</div>
                </div>
              </div>
            </div>
          </div>

          {/* Legend and Stats */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-white">Category Details</h4>
            <div className="space-y-3">
              {displayData.map((item, index) => (
                <motion.div
                  key={item.category}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center justify-between p-3 bg-slate-700 rounded-lg hover:bg-slate-600 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-4 h-4 rounded-full ${getCategoryColor(index)}`} />
                    <div>
                      <div className="text-white font-medium">{item.category}</div>
                      <div className="text-sm text-slate-400">{item.count} transactions</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-white font-semibold">{formatCurrency(item.total)}</div>
                    <div className="text-sm text-slate-400">{item.percentage.toFixed(1)}%</div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <h4 className="text-lg font-semibold text-white">Detailed Breakdown</h4>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left py-3 px-4 text-slate-300 font-medium">Category</th>
                  <th className="text-right py-3 px-4 text-slate-300 font-medium">Transactions</th>
                  <th className="text-right py-3 px-4 text-slate-300 font-medium">Total Amount</th>
                  <th className="text-right py-3 px-4 text-slate-300 font-medium">Average</th>
                  <th className="text-right py-3 px-4 text-slate-300 font-medium">Percentage</th>
                  <th className="text-center py-3 px-4 text-slate-300 font-medium">Trend</th>
                </tr>
              </thead>
              <tbody>
                {displayData.map((item, index) => (
                  <motion.tr
                    key={item.category}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${getCategoryColor(index)}`} />
                        <span className="text-white font-medium">{item.category}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right text-slate-300">{item.count}</td>
                    <td className="py-3 px-4 text-right text-white font-semibold">{formatCurrency(item.total)}</td>
                    <td className="py-3 px-4 text-right text-slate-300">{formatCurrency(item.avgAmount)}</td>
                    <td className="py-3 px-4 text-right text-slate-300">{item.percentage.toFixed(1)}%</td>
                    <td className="py-3 px-4 text-center">
                      {getTrendIcon(item.trend)}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Summary Stats */}
      <div className="mt-6 pt-6 border-t border-slate-700">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-700 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-2">
              <Banknote className="w-5 h-5 text-green-400" />
              <span className="text-slate-300">Total Spent</span>
            </div>
            <div className="text-2xl font-bold text-white">{formatCurrency(totalAmount)}</div>
          </div>
          <div className="bg-slate-700 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-2">
              <Hash className="w-5 h-5 text-blue-400" />
              <span className="text-slate-300">Total Transactions</span>
            </div>
            <div className="text-2xl font-bold text-white">{totalCount}</div>
          </div>
          <div className="bg-slate-700 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-2">
              <BarChart3 className="w-5 h-5 text-purple-400" />
              <span className="text-slate-300">Average per Transaction</span>
            </div>
            <div className="text-2xl font-bold text-white">{formatCurrency(totalAmount / totalCount)}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CategoryBreakdownChart;
