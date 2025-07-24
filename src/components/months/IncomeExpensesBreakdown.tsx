import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Transaction } from '../../types/database.types';
import SpendingChart from '../dashboard/SpendingChart';

interface IncomeExpensesBreakdownProps {
  transactions: Transaction[];
  className?: string;
}

const IncomeExpensesBreakdown = ({ transactions, className = '' }: IncomeExpensesBreakdownProps) => {
  const hasData = useMemo(() => transactions.length > 0, [transactions]);

  return (
    <div className={`grid grid-cols-1 lg:grid-cols-2 gap-6 ${className}`}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="card"
      >
        <h2 className="text-xl font-bold mb-6">Spending by Category</h2>
        {hasData ? (
          <SpendingChart transactions={transactions} type="bar" />
        ) : (
          <div className="h-[400px] flex items-center justify-center bg-gray-50 rounded-lg">
            <p className="text-gray-500">No data available</p>
          </div>
        )}
      </motion.div>
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="card"
      >
        <h2 className="text-xl font-bold mb-6">Distribution</h2>
        {hasData ? (
          <SpendingChart transactions={transactions} type="pie" />
        ) : (
          <div className="h-[400px] flex items-center justify-center bg-gray-50 rounded-lg">
            <p className="text-gray-500">No data available</p>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default IncomeExpensesBreakdown;
