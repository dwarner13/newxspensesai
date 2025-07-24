import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Receipt, 
  Camera, 
  Calendar, 
  DollarSign,
  Eye,
  Trash2,
  Download,
  Star,
  Zap,
  Filter
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import XPDisplay from '../components/gamification/XPDisplay';
import toast from 'react-hot-toast';
import PageHeader from '../components/layout/PageHeader';

interface ReceiptRecord {
  id: string;
  image_url: string;
  original_filename: string;
  upload_date: string;
  processing_status: 'pending' | 'processing' | 'completed' | 'failed';
  extracted_data: any;
  transaction_id: string | null;
  created_at: string;
}

const ReceiptsPage = () => {
  const { user } = useAuth();
  const [receipts, setReceipts] = useState<ReceiptRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReceipt, setSelectedReceipt] = useState<ReceiptRecord | null>(null);
  const [filter, setFilter] = useState<'all' | 'completed' | 'pending' | 'failed'>('all');

  useEffect(() => {
    if (user) {
      fetchReceipts();
    }
  }, [user, filter]);

  const fetchReceipts = async () => {
    try {
      setLoading(true);
      
      // Check if we're in development/mock mode
      if (user?.id === 'dev-user-123' || !user?.id) {
        // Return mock data for development
        setReceipts([]);
        setLoading(false);
        return;
      }
      
      let query = supabase
        .from('receipts')
        .select('*')
        .eq('user_id', user?.id as any)
        .order('upload_date', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('processing_status', filter as any);
      }

      const { data, error } = await query;
      
      if (error) {
        console.error('Supabase error:', error);
        // If table doesn't exist or other error, just return empty array
        setReceipts([]);
        return;
      }
      
      setReceipts((data as unknown as ReceiptRecord[]) || []);
    } catch (error) {
      console.error('Error fetching receipts:', error);
      // Don't show error toast for development/mock mode
      if (user?.id !== 'dev-user-123') {
        toast.error('Failed to load receipts');
      }
      setReceipts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteReceipt = async (receipt: ReceiptRecord) => {
    if (!confirm('Are you sure you want to delete this receipt?')) return;

    try {
      // Check if we're in development/mock mode
      if (user?.id === 'dev-user-123' || !user?.id) {
        // Mock delete for development
        setReceipts(receipts.filter(r => r.id !== receipt.id));
        toast.success('Receipt deleted successfully');
        return;
      }

      // Delete from database
      const { error: dbError } = await supabase
        .from('receipts')
        .delete()
        .eq('id', receipt.id as any);

      if (dbError) {
        console.error('Database error:', dbError);
        toast.error('Failed to delete receipt');
        return;
      }

      // Delete from storage
      const filePath = receipt.image_url.split('/').pop();
      if (filePath) {
        try {
          await supabase.storage
            .from('receipts')
            .remove([`${user?.id}/${filePath}`]);
        } catch (storageError) {
          console.error('Storage error:', storageError);
          // Don't fail the whole operation if storage delete fails
        }
      }

      setReceipts(receipts.filter(r => r.id !== receipt.id));
      toast.success('Receipt deleted successfully');
    } catch (error) {
      console.error('Error deleting receipt:', error);
      toast.error('Failed to delete receipt');
    }
  };

  const handleDownloadReceipt = async (receipt: ReceiptRecord) => {
    try {
      const response = await fetch(receipt.image_url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = receipt.original_filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      toast.success('Receipt downloaded');
    } catch (error) {
      console.error('Error downloading receipt:', error);
      toast.error('Failed to download receipt');
    }
  };

  const createTransactionFromReceipt = async (receipt: ReceiptRecord) => {
    if (!receipt.extracted_data) return;

    try {
      // Check if we're in development/mock mode
      if (user?.id === 'dev-user-123' || !user?.id) {
        // Mock transaction creation for development
        toast.success('Transaction created from receipt!');
        return;
      }

      const extractedData = receipt.extracted_data;
      
      const transaction = {
        user_id: user?.id,
        date: extractedData.date || new Date().toISOString().split('T')[0],
        description: extractedData.vendor || 'Receipt Purchase',
        amount: extractedData.total || 0,
        type: 'Debit' as const,
        category: extractedData.category || 'Uncategorized',
        subcategory: null,
        file_name: 'Receipt Scan',
        hash_id: `receipt-${receipt.id}`,
        categorization_source: 'ai' as const
      };

      const { error } = await supabase
        .from('transactions')
        .insert([transaction as any]);

      if (error) {
        console.error('Transaction insert error:', error);
        toast.error('Failed to create transaction from receipt');
        return;
      }

      // Update receipt with transaction reference
      try {
        await supabase
          .from('receipts')
          .update({ transaction_id: transaction.hash_id } as any)
          .eq('id', receipt.id as any);
      } catch (updateError) {
        console.error('Receipt update error:', updateError);
        // Don't fail the whole operation if receipt update fails
      }

      toast.success('Transaction created from receipt!');
      fetchReceipts(); // Refresh to show updated status
    } catch (error) {
      console.error('Error creating transaction:', error);
      toast.error('Failed to create transaction from receipt');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-success-100 text-success-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
        return 'bg-error-100 text-error-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const completedReceipts = receipts.filter(r => r.processing_status === 'completed');
  const totalXPEarned = completedReceipts.length * 10; // 10 XP per receipt

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <>
      <PageHeader />
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <motion.h1 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-2xl font-bold flex items-center"
          >
            <Receipt size={32} className="mr-3 text-primary-600" />
            Receipt History
          </motion.h1>
          
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-wrap gap-3"
          >
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="input max-w-xs"
            >
              <option value="all">All Receipts</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
            </select>
            
            <Link to="/scan-receipt" className="btn-primary flex items-center">
              <Camera size={16} className="mr-2" />
              Scan New Receipt
            </Link>
          </motion.div>
        </div>

        {/* XP Display */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <XPDisplay showDetails={false} />
        </motion.div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="card bg-gradient-to-br from-primary-50 to-primary-100"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-primary-700">Total Receipts</p>
                <p className="text-2xl font-bold text-primary-900">{receipts.length}</p>
              </div>
              <Receipt size={24} className="text-primary-600" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="card bg-gradient-to-br from-success-50 to-success-100"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-success-700">Processed</p>
                <p className="text-2xl font-bold text-success-900">{completedReceipts.length}</p>
              </div>
              <Zap size={24} className="text-success-600" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="card bg-gradient-to-br from-yellow-50 to-yellow-100"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-yellow-700">XP Earned</p>
                <p className="text-2xl font-bold text-yellow-900">{totalXPEarned}</p>
              </div>
              <Star size={24} className="text-yellow-600" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="card bg-gradient-to-br from-secondary-50 to-secondary-100"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-secondary-700">Total Value</p>
                <p className="text-2xl font-bold text-secondary-900">
                  {formatCurrency(
                    completedReceipts.reduce((sum, r) => 
                      sum + (r.extracted_data?.total || 0), 0
                    )
                  )}
                </p>
              </div>
              <DollarSign size={24} className="text-secondary-600" />
            </div>
          </motion.div>
        </div>

        {/* Receipts Grid */}
        {receipts.length > 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {receipts.map((receipt) => (
              <motion.div
                key={receipt.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ scale: 1.02 }}
                className="card overflow-hidden"
              >
                {/* Receipt Image */}
                <div className="relative">
                  <img
                    src={receipt.image_url}
                    alt={receipt.original_filename}
                    className="w-full h-48 object-cover cursor-pointer"
                    onClick={() => setSelectedReceipt(receipt)}
                  />
                  <div className="absolute top-2 right-2">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(receipt.processing_status)}`}>
                      {receipt.processing_status}
                    </span>
                  </div>
                  {receipt.processing_status === 'completed' && (
                    <div className="absolute top-2 left-2">
                      <div className="bg-success-500 text-white px-2 py-1 rounded-full text-xs font-medium flex items-center">
                        <Star size={12} className="mr-1" />
                        +10 XP
                      </div>
                    </div>
                  )}
                </div>

                {/* Receipt Details */}
                <div className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium text-gray-900 truncate">
                      {receipt.extracted_data?.vendor || receipt.original_filename}
                    </h3>
                    <div className="flex space-x-1">
                      <button
                        onClick={() => setSelectedReceipt(receipt)}
                        className="p-1 text-gray-400 hover:text-gray-600"
                        title="View details"
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        onClick={() => handleDownloadReceipt(receipt)}
                        className="p-1 text-gray-400 hover:text-gray-600"
                        title="Download"
                      >
                        <Download size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteReceipt(receipt)}
                        className="p-1 text-gray-400 hover:text-error-600"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex items-center justify-between">
                      <span>Date:</span>
                      <span>{new Date(receipt.upload_date).toLocaleDateString()}</span>
                    </div>
                    
                    {receipt.extracted_data?.total && (
                      <div className="flex items-center justify-between">
                        <span>Amount:</span>
                        <span className="font-medium text-gray-900">
                          {formatCurrency(receipt.extracted_data.total)}
                        </span>
                      </div>
                    )}
                    
                    {receipt.extracted_data?.category && (
                      <div className="flex items-center justify-between">
                        <span>Category:</span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-primary-100 text-primary-700">
                          {receipt.extracted_data.category}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  {receipt.processing_status === 'completed' && !receipt.transaction_id && (
                    <button
                      onClick={() => createTransactionFromReceipt(receipt)}
                      className="w-full mt-3 btn-primary text-sm flex items-center justify-center"
                    >
                      <Zap size={14} className="mr-1" />
                      Create Transaction
                    </button>
                  )}

                  {receipt.transaction_id && (
                    <div className="mt-3 text-xs text-success-600 bg-success-50 p-2 rounded">
                      ✅ Transaction created
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <div className="text-center py-12">
            <div className="flex justify-center mb-4">
              <Receipt className="h-12 w-12 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No receipts yet</h3>
            <p className="text-gray-500 mb-6">
              Start scanning receipts to earn XP and track your expenses automatically.
            </p>
            <Link to="/scan-receipt" className="btn-primary inline-flex items-center">
              <Camera size={16} className="mr-2" />
              Scan Your First Receipt
            </Link>
          </div>
        )}

        {/* Receipt Detail Modal */}
        {selectedReceipt && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Receipt Details</h3>
                  <button
                    onClick={() => setSelectedReceipt(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ×
                  </button>
                </div>

                <div className="space-y-4">
                  <img
                    src={selectedReceipt.image_url}
                    alt={selectedReceipt.original_filename}
                    className="w-full max-h-64 object-contain rounded-lg border"
                  />

                  {selectedReceipt.extracted_data && (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="font-medium mb-3">Extracted Data</h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Vendor:</span>
                          <p className="font-medium">{selectedReceipt.extracted_data.vendor}</p>
                        </div>
                        <div>
                          <span className="text-gray-600">Date:</span>
                          <p className="font-medium">{selectedReceipt.extracted_data.date}</p>
                        </div>
                        <div>
                          <span className="text-gray-600">Total:</span>
                          <p className="font-medium text-lg">
                            {formatCurrency(selectedReceipt.extracted_data.total)}
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-600">Category:</span>
                          <p className="font-medium">{selectedReceipt.extracted_data.category}</p>
                        </div>
                      </div>

                      {selectedReceipt.extracted_data.items && (
                        <div className="mt-4">
                          <h5 className="font-medium mb-2">Items</h5>
                          <div className="space-y-1 max-h-32 overflow-y-auto">
                            {selectedReceipt.extracted_data.items.map((item: any, index: number) => (
                              <div key={index} className="flex justify-between text-sm">
                                <span>{item.description}</span>
                                <span>{formatCurrency(item.amount)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex space-x-3">
                    <button
                      onClick={() => handleDownloadReceipt(selectedReceipt)}
                      className="btn-outline flex-1"
                    >
                      Download
                    </button>
                    {selectedReceipt.processing_status === 'completed' && !selectedReceipt.transaction_id && (
                      <button
                        onClick={() => {
                          createTransactionFromReceipt(selectedReceipt);
                          setSelectedReceipt(null);
                        }}
                        className="btn-primary flex-1"
                      >
                        Create Transaction
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </>
  );
};

export default ReceiptsPage;
