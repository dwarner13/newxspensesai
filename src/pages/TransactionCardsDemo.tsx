import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Filter, SortAsc, SortDesc } from 'lucide-react';
import { Link } from 'react-router-dom';
import TransactionCards from '../components/transactions/TransactionCards';

// Sample transaction data
const mockTransactions = [
  {
    id: 1,
    merchant: "Walmart",
    amount: -52.40,
    category: "Groceries",
    date: "2025-06-01",
    receipt_url: "https://images.pexels.com/photos/3943882/pexels-photo-3943882.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1"
  },
  {
    id: 2,
    merchant: "Shell Gas Station",
    amount: -84.90,
    category: "Fuel",
    date: "2025-06-03",
    receipt_url: "https://images.pexels.com/photos/4386431/pexels-photo-4386431.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1"
  },
  {
    id: 3,
    merchant: "Starbucks",
    amount: -8.25,
    category: "Dining",
    date: "2025-06-04",
    receipt_url: "https://images.pexels.com/photos/1211329/pexels-photo-1211329.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1"
  },
  {
    id: 4,
    merchant: "Amazon",
    amount: -129.99,
    category: "Online Shopping",
    date: "2025-06-06",
    receipt_url: "https://images.pexels.com/photos/6770610/pexels-photo-6770610.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1"
  }
];

const TransactionCardsDemo = () => {
  const [transactions, setTransactions] = useState(mockTransactions);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [viewingReceipt, setViewingReceipt] = useState<string | null>(null);

  const categories = ['All', ...Array.from(new Set(transactions.map(tx => tx.category)))];

  const handleCategoryFilter = (category: string) => {
    setSelectedCategory(category === 'All' ? null : category);
  };

  const handleSortToggle = () => {
    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
  };

  const handleViewReceipt = (receiptUrl: string) => {
    setViewingReceipt(receiptUrl);
  };

  const filteredTransactions = transactions
    .filter(tx => !selectedCategory || tx.category === selectedCategory)
    .sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
    });

  return (
    <div className="max-w-4xl  py-8 px-4">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-center space-x-3 mb-4">
          <Link to="/" className="text-gray-400 hover:text-gray-600 transition-colors">
            <ArrowLeft size={24} />
          </Link>
          <h1 className="text-3xl font-bold">Transaction Cards</h1>
        </div>
        <p className="text-gray-600">
          View your transactions with receipt images in a card layout.
        </p>
      </motion.div>

      <div className="mb-6 flex flex-wrap gap-3">
        <div className="flex items-center space-x-2 bg-white rounded-lg shadow-sm p-2 border border-gray-200">
          <Filter size={16} className="text-gray-500" />
          <div className="flex flex-wrap gap-2">
            {categories.map(category => (
              <button
                key={category}
                onClick={() => handleCategoryFilter(category)}
                className={`px-3 py-1 rounded-full text-sm font-medium ${
                  (category === 'All' && !selectedCategory) || category === selectedCategory
                    ? 'bg-primary-100 text-primary-800'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleSortToggle}
          className="flex items-center space-x-2 bg-white rounded-lg shadow-sm p-2 border border-gray-200 hover:bg-gray-50 transition-colors"
        >
          {sortOrder === 'desc' ? (
            <>
              <SortDesc size={16} className="text-gray-500" />
              <span className="text-sm font-medium">Newest First</span>
            </>
          ) : (
            <>
              <SortAsc size={16} className="text-gray-500" />
              <span className="text-sm font-medium">Oldest First</span>
            </>
          )}
        </button>
      </div>

      <TransactionCards 
        transactions={filteredTransactions} 
        onViewReceipt={handleViewReceipt}
      />

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

      {filteredTransactions.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-500">No transactions found matching your filters.</p>
        </div>
      )}
    </div>
  );
};

export default TransactionCardsDemo;
