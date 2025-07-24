import { useState } from 'react';
import { motion } from 'framer-motion';
import { Brain, FileText, DollarSign, MessageSquare, Tag } from 'lucide-react';
import TransactionCategorizer from '../components/transactions/TransactionCategorizer';

const TransactionCategorizerDemo = () => {
  const [formData, setFormData] = useState({
    vendor: '',
    amount: '',
    description: '',
    notes: ''
  });
  const [category, setCategory] = useState<string | null>(null);
  const [flaggedForReview, setFlaggedForReview] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCategorized = (category: string, flaggedForReview: boolean) => {
    setCategory(category);
    setFlaggedForReview(flaggedForReview);
  };

  const handleReset = () => {
    setFormData({
      vendor: '',
      amount: '',
      description: '',
      notes: ''
    });
    setCategory(null);
    setFlaggedForReview(false);
  };

  const isFormValid = formData.vendor && formData.amount && formData.description;

  return (
    <div className="max-w-4xl  py-8 px-4">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-center space-x-3 mb-2">
          <Brain size={32} className="text-primary-600" />
          <h1 className="text-3xl font-bold">AI Transaction Categorizer</h1>
        </div>
        <p className="text-gray-600">
          Enter transaction details below to see how our AI categorizes financial transactions.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="card"
        >
          <h2 className="text-xl font-semibold mb-6 flex items-center">
            <FileText size={20} className="mr-2 text-primary-600" />
            Transaction Details
          </h2>

          <div className="space-y-4">
            <div>
              <label htmlFor="vendor" className="block text-sm font-medium text-gray-700 mb-1">
                Vendor/Merchant
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Tag size={16} className="text-gray-400" />
                </div>
                <input
                  type="text"
                  id="vendor"
                  name="vendor"
                  value={formData.vendor}
                  onChange={handleInputChange}
                  className="pl-10 input"
                  placeholder="e.g. Starbucks, Amazon, Shell"
                />
              </div>
            </div>

            <div>
              <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">
                Amount
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <DollarSign size={16} className="text-gray-400" />
                </div>
                <input
                  type="number"
                  id="amount"
                  name="amount"
                  value={formData.amount}
                  onChange={handleInputChange}
                  className="pl-10 input"
                  placeholder="e.g. 42.99"
                  step="0.01"
                  min="0"
                />
              </div>
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FileText size={16} className="text-gray-400" />
                </div>
                <input
                  type="text"
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  className="pl-10 input"
                  placeholder="e.g. Coffee and pastry, Office supplies"
                />
              </div>
            </div>

            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                Notes (Optional)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MessageSquare size={16} className="text-gray-400" />
                </div>
                <textarea
                  id="notes"
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  className="pl-10 input"
                  placeholder="Any additional context about this transaction"
                  rows={3}
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                onClick={handleReset}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Reset
              </button>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          {isFormValid ? (
            <TransactionCategorizer
              vendor={formData.vendor}
              amount={parseFloat(formData.amount) || 0}
              description={formData.description}
              notes={formData.notes}
              onCategorized={handleCategorized}
              className="h-full"
            />
          ) : (
            <div className="card h-full flex items-center justify-center">
              <div className="text-center p-8">
                <Brain size={48} className=" text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Enter Transaction Details
                </h3>
                <p className="text-gray-500 ">
                  Fill out the vendor, amount, and description fields to see how our AI categorizes your transaction.
                </p>
              </div>
            </div>
          )}
        </motion.div>
      </div>

      {category && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className={`mt-8 p-6 rounded-lg ${
            flaggedForReview ? 'bg-yellow-50 border border-yellow-200' : 'bg-green-50 border border-green-200'
          }`}
        >
          <div className="flex items-start">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center mr-4 ${
              flaggedForReview ? 'bg-yellow-100' : 'bg-green-100'
            }`}>
              {flaggedForReview ? (
                <AlertTriangle size={24} className="text-yellow-600" />
              ) : (
                <Check size={24} className="text-green-600" />
              )}
            </div>
            <div>
              <h3 className="text-lg font-medium mb-2">
                {flaggedForReview ? 'Transaction Needs Review' : 'Transaction Categorized'}
              </h3>
              <p className="text-gray-700 mb-4">
                {flaggedForReview
                  ? 'Our AI has flagged this transaction for manual review due to uncertainty.'
                  : 'Our AI has confidently categorized this transaction.'}
              </p>
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-600">Vendor:</span>
                  <span className="font-medium">{formData.vendor}</span>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-600">Amount:</span>
                  <span className="font-medium">${parseFloat(formData.amount).toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-600">Category:</span>
                  <span className="font-medium">{category}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Confidence:</span>
                  <span className={`font-medium ${flaggedForReview ? 'text-yellow-600' : 'text-green-600'}`}>
                    {flaggedForReview ? 'Low' : 'High'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="mt-8 bg-gray-50 rounded-lg p-6 border border-gray-200"
      >
        <h3 className="text-lg font-medium mb-4">How It Works</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center mb-3">
              <Brain size={20} className="text-primary-600" />
            </div>
            <h4 className="font-medium mb-2">AI Analysis</h4>
            <p className="text-sm text-gray-600">
              Our AI analyzes the vendor name, description, and transaction details to determine the most appropriate category.
            </p>
          </div>
          
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center mb-3">
              <Tag size={20} className="text-primary-600" />
            </div>
            <h4 className="font-medium mb-2">Learning System</h4>
            <p className="text-sm text-gray-600">
              The system learns from your previous categorizations to improve accuracy over time.
            </p>
          </div>
          
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center mb-3">
              <FileText size={20} className="text-primary-600" />
            </div>
            <h4 className="font-medium mb-2">Tax Ready</h4>
            <p className="text-sm text-gray-600">
              Categories are designed to align with common tax deduction categories for easy reporting.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default TransactionCategorizerDemo;
