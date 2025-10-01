import React, { useState } from 'react';
import { 
  X, 
  Edit2, 
  Trash2, 
  Save, 
  Calendar, 
  Tag, 
  Banknote, 
  CreditCard, 
  FileText, 
  Brain, 
  Zap, 
  AlertCircle,
  CheckCircle,
  Clock,
  Receipt,
  Eye,
  Download,
  Star,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import AIConfidenceIndicator from './AIConfidenceIndicator';
import toast from 'react-hot-toast';

interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: 'Debit' | 'Credit';
  category: string;
  subcategory?: string;
  file_name: string;
  hash_id: string;
  created_at: string;
  categorization_source: 'ai' | 'manual' | 'memory';
  receipt_url?: string;
  ai_confidence?: number;
  payment_method?: string;
  vendor?: string;
}

interface TransactionDetailModalProps {
  transaction: Transaction;
  onClose: () => void;
  onSave: (transaction: Transaction) => void;
  onDelete: (transactionId: string) => void;
}

const TransactionDetailModal: React.FC<TransactionDetailModalProps> = ({
  transaction,
  onClose,
  onSave,
  onDelete
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedTransaction, setEditedTransaction] = useState<Transaction>(transaction);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const categories = [
    'Groceries', 'Transportation', 'Entertainment', 'Food & Drink', 
    'Shopping', 'Home & Garden', 'Business Expenses', 'Income', 
    'Healthcare', 'Education', 'Travel', 'Utilities', 'Other'
  ];

  const subcategories: Record<string, string[]> = {
    'Transportation': ['Fuel', 'Rideshare', 'Public Transit', 'Parking', 'Maintenance'],
    'Entertainment': ['Streaming', 'Music', 'Movies', 'Games', 'Events'],
    'Food & Drink': ['Restaurants', 'Coffee', 'Delivery', 'Groceries', 'Alcohol'],
    'Shopping': ['Online', 'Clothing', 'Electronics', 'Books', 'Gifts'],
    'Home & Garden': ['Tools', 'Furniture', 'Decor', 'Maintenance', 'Supplies'],
    'Business Expenses': ['Supplies', 'Software', 'Marketing', 'Travel', 'Equipment']
  };

  const handleSave = () => {
    onSave(editedTransaction);
    setIsEditing(false);
    toast.success('Transaction updated successfully!');
  };

  const handleDelete = () => {
    onDelete(transaction.id);
    setShowDeleteConfirm(false);
    toast.success('Transaction deleted successfully!');
  };

  const handleCancel = () => {
    setEditedTransaction(transaction);
    setIsEditing(false);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getCategorizationIcon = (source: string) => {
    switch (source) {
      case 'ai':
        return <Brain className="w-5 h-5 text-blue-500" />;
      case 'manual':
        return <Edit2 className="w-5 h-5 text-green-500" />;
      case 'memory':
        return <Zap className="w-5 h-5 text-purple-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-500" />;
    }
  };

  const getCategorizationLabel = (source: string) => {
    switch (source) {
      case 'ai':
        return 'AI Categorized';
      case 'manual':
        return 'Manual Entry';
      case 'memory':
        return 'Learned Pattern';
      default:
        return 'Unknown';
    }
  };

  const getCategorizationDescription = (source: string) => {
    switch (source) {
      case 'ai':
        return 'This transaction was automatically categorized by our AI system based on merchant patterns and transaction details.';
      case 'manual':
        return 'This transaction was manually categorized by you or another user.';
      case 'memory':
        return 'This transaction was categorized based on learned patterns from your previous categorizations.';
      default:
        return 'Unknown categorization source.';
    }
  };

  return (
    
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
        <div
          className="bg-slate-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-700 rounded-lg">
                <Banknote className="w-6 h-6 text-orange-500" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Transaction Details</h2>
                <p className="text-sm text-slate-400">{formatDate(transaction.date)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {!isEditing ? (
                <>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="p-2 text-slate-400 hover:text-white transition-colors"
                  >
                    <Edit2 className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="p-2 text-slate-400 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={handleSave}
                    className="p-2 text-green-400 hover:text-green-300 transition-colors"
                  >
                    <Save className="w-5 h-5" />
                  </button>
                  <button
                    onClick={handleCancel}
                    className="p-2 text-slate-400 hover:text-white transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </>
              )}
              <button
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Transaction Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Description</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editedTransaction.description}
                      onChange={(e) => setEditedTransaction(prev => ({ ...prev, description: e.target.value }))}
                      className="w-full px-3 py-2 bg-slate-700 text-white rounded-lg border border-slate-600 focus:border-orange-500 focus:outline-none"
                    />
                  ) : (
                    <div className="text-white font-medium">{transaction.description}</div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Vendor</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editedTransaction.vendor || ''}
                      onChange={(e) => setEditedTransaction(prev => ({ ...prev, vendor: e.target.value }))}
                      className="w-full px-3 py-2 bg-slate-700 text-white rounded-lg border border-slate-600 focus:border-orange-500 focus:outline-none"
                    />
                  ) : (
                    <div className="text-white">{transaction.vendor || 'N/A'}</div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Amount</label>
                  {isEditing ? (
                    <input
                      type="number"
                      step="0.01"
                      value={editedTransaction.amount}
                      onChange={(e) => setEditedTransaction(prev => ({ ...prev, amount: parseFloat(e.target.value) }))}
                      className="w-full px-3 py-2 bg-slate-700 text-white rounded-lg border border-slate-600 focus:border-orange-500 focus:outline-none"
                    />
                  ) : (
                    <div className={`text-2xl font-bold ${transaction.type === 'Debit' ? 'text-red-400' : 'text-green-400'}`}>
                      {transaction.type === 'Debit' ? '-' : '+'}{formatCurrency(transaction.amount)}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Date</label>
                  {isEditing ? (
                    <input
                      type="date"
                      value={editedTransaction.date}
                      onChange={(e) => setEditedTransaction(prev => ({ ...prev, date: e.target.value }))}
                      className="w-full px-3 py-2 bg-slate-700 text-white rounded-lg border border-slate-600 focus:border-orange-500 focus:outline-none"
                    />
                  ) : (
                    <div className="text-white">{formatDate(transaction.date)}</div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Type</label>
                  {isEditing ? (
                    <select
                      value={editedTransaction.type}
                      onChange={(e) => setEditedTransaction(prev => ({ ...prev, type: e.target.value as 'Debit' | 'Credit' }))}
                      className="w-full px-3 py-2 bg-slate-700 text-white rounded-lg border border-slate-600 focus:border-orange-500 focus:outline-none"
                    >
                      <option value="Debit">Debit</option>
                      <option value="Credit">Credit</option>
                    </select>
                  ) : (
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-slate-400" />
                      <span className="text-white">{transaction.type}</span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Payment Method</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editedTransaction.payment_method || ''}
                      onChange={(e) => setEditedTransaction(prev => ({ ...prev, payment_method: e.target.value }))}
                      className="w-full px-3 py-2 bg-slate-700 text-white rounded-lg border border-slate-600 focus:border-orange-500 focus:outline-none"
                    />
                  ) : (
                    <div className="text-white">{transaction.payment_method || 'N/A'}</div>
                  )}
                </div>
              </div>
            </div>

            {/* Category Section */}
            <div className="border-t border-slate-700 pt-6">
              <h3 className="text-lg font-semibold text-white mb-4">Categorization</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Category</label>
                  {isEditing ? (
                    <select
                      value={editedTransaction.category}
                      onChange={(e) => setEditedTransaction(prev => ({ ...prev, category: e.target.value, subcategory: '' }))}
                      className="w-full px-3 py-2 bg-slate-700 text-white rounded-lg border border-slate-600 focus:border-orange-500 focus:outline-none"
                    >
                      {categories.map(category => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                    </select>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Tag className="w-4 h-4 text-slate-400" />
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-slate-600 text-slate-200">
                        {transaction.category}
                      </span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Subcategory</label>
                  {isEditing ? (
                    <select
                      value={editedTransaction.subcategory || ''}
                      onChange={(e) => setEditedTransaction(prev => ({ ...prev, subcategory: e.target.value }))}
                      className="w-full px-3 py-2 bg-slate-700 text-white rounded-lg border border-slate-600 focus:border-orange-500 focus:outline-none"
                    >
                      <option value="">Select subcategory</option>
                      {subcategories[editedTransaction.category]?.map(subcategory => (
                        <option key={subcategory} value={subcategory}>{subcategory}</option>
                      ))}
                    </select>
                  ) : (
                    <div className="text-white">{transaction.subcategory || 'None'}</div>
                  )}
                </div>
              </div>
            </div>

            {/* AI Confidence Section */}
            <div className="border-t border-slate-700 pt-6">
              <h3 className="text-lg font-semibold text-white mb-4">AI Analysis</h3>
              <div className="bg-slate-700 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-3">
                  {getCategorizationIcon(transaction.categorization_source)}
                  <div>
                    <div className="text-white font-medium">{getCategorizationLabel(transaction.categorization_source)}</div>
                    <div className="text-sm text-slate-400">{getCategorizationDescription(transaction.categorization_source)}</div>
                  </div>
                </div>
                <AIConfidenceIndicator 
                  confidence={transaction.ai_confidence || 0.8} 
                  source={transaction.categorization_source}
                />
              </div>
            </div>

            {/* Receipt Section */}
            {transaction.receipt_url && (
              <div className="border-t border-slate-700 pt-6">
                <h3 className="text-lg font-semibold text-white mb-4">Receipt</h3>
                <div className="bg-slate-700 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <Receipt className="w-5 h-5 text-slate-400" />
                    <div>
                      <div className="text-white font-medium">Receipt Available</div>
                      <div className="text-sm text-slate-400">Original receipt image is available for this transaction</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="px-3 py-1 bg-slate-600 text-white rounded-lg hover:bg-slate-500 transition-colors flex items-center gap-2">
                      <Eye className="w-4 h-4" />
                      View Receipt
                    </button>
                    <button className="px-3 py-1 bg-slate-600 text-white rounded-lg hover:bg-slate-500 transition-colors flex items-center gap-2">
                      <Download className="w-4 h-4" />
                      Download
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* File Information */}
            <div className="border-t border-slate-700 pt-6">
              <h3 className="text-lg font-semibold text-white mb-4">File Information</h3>
              <div className="bg-slate-700 rounded-lg p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-slate-400 mb-1">Source File</div>
                    <div className="text-white font-medium">{transaction.file_name}</div>
                  </div>
                  <div>
                    <div className="text-sm text-slate-400 mb-1">Hash ID</div>
                    <div className="text-white font-mono text-sm">{transaction.hash_id}</div>
                  </div>
                  <div>
                    <div className="text-sm text-slate-400 mb-1">Created</div>
                    <div className="text-white">{new Date(transaction.created_at).toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-sm text-slate-400 mb-1">Transaction ID</div>
                    <div className="text-white font-mono text-sm">{transaction.id}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Delete Confirmation Modal */}
        
          {showDeleteConfirm && (
            <div
              className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-60"
            >
              <div
                className="bg-slate-800 rounded-lg p-6 max-w-md w-full"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-red-500/20 rounded-lg">
                    <Trash2 className="w-6 h-6 text-red-500" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">Delete Transaction</h3>
                    <p className="text-sm text-slate-400">This action cannot be undone</p>
                  </div>
                </div>
                <p className="text-slate-300 mb-6">
                  Are you sure you want to delete the transaction "{transaction.description}" for {formatCurrency(transaction.amount)}?
                </p>
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleDelete}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Delete
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-500 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        
      </div>
    
  );
};

export default TransactionDetailModal;
