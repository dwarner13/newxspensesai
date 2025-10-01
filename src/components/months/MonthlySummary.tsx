import { useMemo } from 'react';
import { TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { Transaction } from '../../types/database.types';
import StatCard from '../dashboard/StatCard';

interface MonthlySummaryProps {
  transactions: Transaction[];
  month: string;
  className?: string;
}

const MonthlySummary = ({ transactions, month, className = '' }: MonthlySummaryProps) => {
  const stats = useMemo(() => {
    const income = transactions
      .filter(t => t.type === 'Credit')
      .reduce((sum, t) => sum + t.amount, 0);
      
    const expenses = transactions
      .filter(t => t.type === 'Debit')
      .reduce((sum, t) => sum + t.amount, 0);
      
    const net = income - expenses;
    
    // For simplicity, we'll use a random trend
    const trend = Math.floor(Math.random() * 20) - 10; // Random trend between -10 and 10
    
    return { income, expenses, net, trend };
  }, [transactions]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div
      className={`card ${className}`}
    >
      <h2 className="text-xl font-bold mb-6">{month} Summary</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="Total Income"
          value={formatCurrency(stats.income)}
          icon={<TrendingUp size={24} className="text-success-600" />}
          className="bg-gradient-to-br from-success-50 to-success-100"
        />
        
        <StatCard
          title="Total Expenses"
          value={formatCurrency(stats.expenses)}
          icon={<TrendingDown size={24} className="text-error-600" />}
          className="bg-gradient-to-br from-error-50 to-error-100"
        />
        
        <StatCard
          title="Net Difference"
          value={formatCurrency(stats.net)}
          icon={<DollarSign size={24} className="text-primary-600" />}
          className="bg-gradient-to-br from-primary-50 to-primary-100"
        />
      </div>
    </div>
  );
};

export default MonthlySummary;
