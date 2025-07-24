import { motion } from 'framer-motion';
import { Download, FileText, Mail, Printer } from 'lucide-react';
import { Transaction } from '../../types/database.types';
import { exportToPDF, exportToCSV } from '../../utils/exportUtils';
import toast from 'react-hot-toast';

interface ExportOptionsProps {
  transactions: Transaction[];
  month: string;
  stats: {
    income: number;
    expenses: number;
    net: number;
  };
  className?: string;
}

const ExportOptions = ({ transactions, month, stats, className = '' }: ExportOptionsProps) => {
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
        exportToPDF(transactions, stats, categoryTotals);
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

  const handleEmailReport = () => {
    toast.success('Email report feature coming soon!');
  };

  const handlePrintReport = () => {
    window.print();
    toast.success('Printing report...');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      className={`card ${className}`}
    >
      <h2 className="text-xl font-bold mb-6">Export Options</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          onClick={() => handleExport('pdf')}
          disabled={transactions.length === 0}
          className="p-4 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors flex flex-col items-center justify-center"
        >
          <FileText size={32} className="text-primary-600 mb-3" />
          <span className="font-medium text-gray-900">Export PDF</span>
          <span className="text-sm text-gray-500">Complete report</span>
        </button>
        
        <button
          onClick={() => handleExport('csv')}
          disabled={transactions.length === 0}
          className="p-4 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors flex flex-col items-center justify-center"
        >
          <Download size={32} className="text-secondary-600 mb-3" />
          <span className="font-medium text-gray-900">Export CSV</span>
          <span className="text-sm text-gray-500">Raw data export</span>
        </button>
        
        <button
          onClick={handleEmailReport}
          disabled={transactions.length === 0}
          className="p-4 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors flex flex-col items-center justify-center"
        >
          <Mail size={32} className="text-accent-600 mb-3" />
          <span className="font-medium text-gray-900">Email Report</span>
          <span className="text-sm text-gray-500">Send to your inbox</span>
        </button>
        
        <button
          onClick={handlePrintReport}
          disabled={transactions.length === 0}
          className="p-4 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors flex flex-col items-center justify-center"
        >
          <Printer size={32} className="text-gray-600 mb-3" />
          <span className="font-medium text-gray-900">Print Report</span>
          <span className="text-sm text-gray-500">Physical copy</span>
        </button>
      </div>
      
      {transactions.length === 0 && (
        <div className="mt-4 p-3 bg-gray-50 rounded-lg text-center text-sm text-gray-500">
          No data available for {month}. Upload transactions to enable export options.
        </div>
      )}
    </motion.div>
  );
};

export default ExportOptions;
