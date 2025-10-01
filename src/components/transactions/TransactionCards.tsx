import React from 'react';
import { Receipt, Eye, Download } from 'lucide-react';

interface Transaction {
  id: number | string;
  merchant: string;
  amount: number;
  category: string;
  date: string;
  receipt_url: string;
}

interface TransactionCardsProps {
  transactions: Transaction[];
  onViewReceipt?: (receiptUrl: string) => void;
}

const TransactionCards: React.FC<TransactionCardsProps> = ({ 
  transactions,
  onViewReceipt
}) => {
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Math.abs(amount));
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  return (
    <div 
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-4"
    >
      {transactions.map(tx => (
        <div 
          key={tx.id} 
          variants={item}
          className="border rounded-lg overflow-hidden shadow-sm bg-white hover:shadow-md transition-shadow"
        >
          <div className="p-4">
            <div className="flex justify-between items-center mb-3">
              <div>
                <p className="text-lg font-semibold text-gray-900">{tx.merchant}</p>
                <div className="flex items-center text-sm text-gray-500">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 mr-2">
                    {tx.category}
                  </span>
                  <span>{formatDate(tx.date)}</span>
                </div>
              </div>
              <p className={`text-lg font-bold ${tx.amount < 0 ? "text-error-600" : "text-success-600"}`}>
                {formatCurrency(tx.amount)}
              </p>
            </div>
            
            <div className="relative mt-3 bg-gray-50 rounded-lg overflow-hidden">
              <img 
                src={tx.receipt_url} 
                alt={`Receipt for ${tx.merchant}`} 
                className="w-full h-48 object-cover object-center"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://placehold.co/400x600?text=Receipt+Not+Found';
                }}
              />
              
              {onViewReceipt && (
                <div className="absolute top-2 right-2 flex space-x-2">
                  <button 
                    onClick={() => onViewReceipt(tx.receipt_url)}
                    className="p-2 bg-white rounded-full shadow-md hover:bg-gray-100 transition-colors"
                    title="View receipt"
                  >
                    <Eye size={16} className="text-primary-600" />
                  </button>
                  <a 
                    href={tx.receipt_url}
                    download
                    className="p-2 bg-white rounded-full shadow-md hover:bg-gray-100 transition-colors"
                    title="Download receipt"
                  >
                    <Download size={16} className="text-primary-600" />
                  </a>
                </div>
              )}
              
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent p-3">
                <div className="flex items-center text-white">
                  <Receipt size={16} className="mr-2" />
                  <span className="text-sm font-medium">Receipt Available</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default TransactionCards;
