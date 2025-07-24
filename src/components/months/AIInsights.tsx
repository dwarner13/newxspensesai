import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Brain, TrendingUp, Calendar } from 'lucide-react';
import { Transaction } from '../../types/database.types';

interface AIInsightsProps {
  transactions: Transaction[];
  month: string;
  className?: string;
}

const AIInsights = ({ transactions, month, className = '' }: AIInsightsProps) => {
  const insights = useMemo(() => {
    if (transactions.length === 0) {
      return {
        summary: `No transactions found for ${month}.`,
        topCategory: null,
        transactionCount: 0,
        trend: 0,
        hasData: false
      };
    }

    // Calculate top spending category
    const categoryTotals = transactions
      .filter(t => t.type === 'Debit')
      .reduce((acc, t) => {
        acc[t.category] = (acc[t.category] || 0) + t.amount;
        return acc;
      }, {} as Record<string, number>);
    
    const sortedCategories = Object.entries(categoryTotals)
      .sort(([, a], [, b]) => b - a);
    
    const topCategory = sortedCategories.length > 0 ? sortedCategories[0][0] : null;
    const topCategoryAmount = sortedCategories.length > 0 ? sortedCategories[0][1] : 0;
    
    // Calculate income and expenses
    const income = transactions
      .filter(t => t.type === 'Credit')
      .reduce((sum, t) => sum + t.amount, 0);
      
    const expenses = transactions
      .filter(t => t.type === 'Debit')
      .reduce((sum, t) => sum + t.amount, 0);
      
    const net = income - expenses;
    
    // Generate random trend for demo purposes
    const trend = Math.floor(Math.random() * 20) - 10; // Random trend between -10 and 10
    
    // Generate summary
    let summary = '';
    if (net >= 0) {
      summary = `Great job! You saved ${formatCurrency(net)} in ${month}. Your biggest expense category was ${topCategory || 'Uncategorized'} at ${formatCurrency(topCategoryAmount)}.`;
    } else {
      summary = `You spent ${formatCurrency(Math.abs(net))} more than you earned in ${month}. Consider reviewing your expenses in the ${topCategory || 'Uncategorized'} category.`;
    }
    
    return {
      summary,
      topCategory,
      transactionCount: transactions.length,
      trend,
      hasData: true
    };
  }, [transactions, month]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className={`card bg-gradient-to-r from-primary-50 to-secondary-50 border-primary-100 ${className}`}
    >
      <div className="flex items-start space-x-4">
        <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
          <Brain size={24} className="text-primary-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            AI Insights for {month}
          </h3>
          <p className="text-gray-600 mb-3">
            {insights.summary}
          </p>
          {insights.hasData && (
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-700">
                <TrendingUp size={12} className="mr-1" />
                {insights.trend >= 0 ? `${insights.trend}% improvement` : `${Math.abs(insights.trend)}% increase in spending`}
              </span>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-secondary-100 text-secondary-700">
                <Calendar size={12} className="mr-1" />
                {insights.transactionCount} transactions
              </span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default AIInsights;
