import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trash2, 
  Undo2, 
  FileText, 
  Receipt, 
  Calendar, 
  DollarSign, 
  Tag, 
  Eye,
  Brain,
  AlertTriangle,
  Check,
  X,
  RotateCcw,
  Clock
} from 'lucide-react';
import PageHeader from '../components/layout/PageHeader';
import { useAtom } from 'jotai';
import { mockModeAtom } from '../utils/mockState';
import { mockDashboardData } from '../utils/mockDashboardData';
import toast from 'react-hot-toast';

interface TrashItem {
  id: string;
  type: 'transaction' | 'receipt' | 'document';
  title: string;
  description: string;
  amount?: number;
  date: string;
  category?: string;
  deletedAt: string;
  originalId: string;
  fileUrl?: string;
}

const TrashPage: React.FC = () => {
  const [mockMode] = useAtom(mockModeAtom);
  const [trashItems, setTrashItems] = useState<TrashItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [showAIConfirmation, setShowAIConfirmation] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<TrashItem | null>(null);
  const [aiResponse, setAiResponse] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    fetchTrashItems();
  }, [mockMode]);

  const fetchTrashItems = async () => {
    setLoading(true);
    try {
      if (mockMode) {
        // Generate mock trash items
        const mockTrashItems: TrashItem[] = [
          {
            id: '1',
            type: 'transaction',
            title: 'Coffee Purchase',
            description: 'Starbucks coffee purchase',
            amount: 4.50,
            date: '2024-01-15',
            category: 'Food & Drink',
            deletedAt: '2024-01-20',
            originalId: 'trans_001'
          },
          {
            id: '2',
            type: 'receipt',
            title: 'Grocery Receipt',
            description: 'Walmart grocery shopping receipt',
            amount: 89.99,
            date: '2024-01-18',
            category: 'Groceries',
            deletedAt: '2024-01-22',
            originalId: 'receipt_001',
            fileUrl: '/mock-receipt.jpg'
          },
          {
            id: '3',
            type: 'document',
            title: 'Bank Statement',
            description: 'January 2024 bank statement',
            date: '2024-01-01',
            deletedAt: '2024-01-25',
            originalId: 'doc_001'
          },
          {
            id: '4',
            type: 'transaction',
            title: 'Gas Station',
            description: 'Shell gas station fuel purchase',
            amount: 45.00,
            date: '2024-01-12',
            category: 'Transportation',
            deletedAt: '2024-01-21',
            originalId: 'trans_002'
          },
          {
            id: '5',
            type: 'receipt',
            title: 'Restaurant Receipt',
            description: 'Dinner at Italian restaurant',
            amount: 67.50,
            date: '2024-01-16',
            category: 'Food & Drink',
            deletedAt: '2024-01-23',
            originalId: 'receipt_002',
            fileUrl: '/mock-restaurant-receipt.jpg'
          }
        ];
        
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 500));
        setTrashItems(mockTrashItems);
      } else {
        // TODO: Implement real API call
        setTrashItems([]);
      }
    } catch (error) {
      console.error('Error fetching trash items:', error);
      toast.error('Failed to load trash items');
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (itemId: string) => {
    try {
      // Remove from trash
      setTrashItems(prev => prev.filter(item => item.id !== itemId));
      toast.success('Item restored successfully');
    } catch (error) {
      console.error('Error restoring item:', error);
      toast.error('Failed to restore item');
    }
  };

  const handlePermanentDelete = async (item: TrashItem) => {
    setItemToDelete(item);
    setShowAIConfirmation(true);
    setAiLoading(true);
    
    // Simulate AI analysis
    setTimeout(() => {
      setAiResponse(`I've analyzed this ${item.type} item. It appears to be a legitimate ${item.type} that was deleted on ${new Date(item.deletedAt).toLocaleDateString()}. The item contains ${item.amount ? `an amount of $${item.amount}` : 'no monetary value'} and was categorized as ${item.category || 'uncategorized'}. Are you absolutely sure you want to permanently delete this item? This action cannot be undone.`);
      setAiLoading(false);
    }, 2000);
  };

  const confirmPermanentDelete = async () => {
    if (!itemToDelete) return;
    
    try {
      setTrashItems(prev => prev.filter(item => item.id !== itemToDelete.id));
      setShowAIConfirmation(false);
      setItemToDelete(null);
      setAiResponse('');
      toast.success('Item permanently deleted');
    } catch (error) {
      console.error('Error deleting item:', error);
      toast.error('Failed to delete item');
    }
  };

  const handleBulkRestore = async () => {
    try {
      setTrashItems(prev => prev.filter(item => !selectedItems.includes(item.id)));
      setSelectedItems([]);
      toast.success(`${selectedItems.length} items restored successfully`);
    } catch (error) {
      console.error('Error restoring items:', error);
      toast.error('Failed to restore items');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedItems.length === 0) return;
    
    setShowAIConfirmation(true);
    setAiLoading(true);
    
    // Simulate AI analysis for bulk deletion
    setTimeout(() => {
      setAiResponse(`I've analyzed ${selectedItems.length} items in your selection. These items were deleted between ${new Date(Math.min(...trashItems.filter(item => selectedItems.includes(item.id)).map(item => new Date(item.deletedAt).getTime()))).toLocaleDateString()} and ${new Date(Math.max(...trashItems.filter(item => selectedItems.includes(item.id)).map(item => new Date(item.deletedAt).getTime()))).toLocaleDateString()}. The total value of monetary items is $${trashItems.filter(item => selectedItems.includes(item.id) && item.amount).reduce((sum, item) => sum + (item.amount || 0), 0).toFixed(2)}. Are you absolutely sure you want to permanently delete all ${selectedItems.length} items? This action cannot be undone.`);
      setAiLoading(false);
    }, 2000);
  };

  const handleSelectAll = () => {
    if (selectedItems.length === trashItems.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(trashItems.map(item => item.id));
    }
  };

  const handleSelectItem = (itemId: string) => {
    setSelectedItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getItemIcon = (type: string) => {
    switch (type) {
      case 'transaction':
        return <DollarSign size={16} className="text-green-600" />;
      case 'receipt':
        return <Receipt size={16} className="text-blue-600" />;
      case 'document':
        return <FileText size={16} className="text-purple-600" />;
      default:
        return <FileText size={16} className="text-gray-600" />;
    }
  };

  const getDaysInTrash = (deletedAt: string) => {
    const deleted = new Date(deletedAt);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - deleted.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <div className="space-y-6">
      <PageHeader />
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <Trash2 className="mr-3 text-red-500" size={28} />
            Trash Bin
          </h1>
          <p className="text-gray-600 mt-1">
            Manage your deleted items. Items are automatically removed after 30 days.
          </p>
        </div>
        
        {selectedItems.length > 0 && (
          <div className="flex items-center space-x-3">
            <span className="text-sm text-gray-600">
              {selectedItems.length} item{selectedItems.length !== 1 ? 's' : ''} selected
            </span>
            <button
              onClick={handleBulkRestore}
              className="btn-outline flex items-center"
            >
              <Undo2 size={16} className="mr-2" />
              Restore Selected
            </button>
            <button
              onClick={handleBulkDelete}
              className="btn-danger flex items-center"
            >
              <Trash2 size={16} className="mr-2" />
              Delete Permanently
            </button>
          </div>
        )}
      </div>

      {/* Trash Items */}
      <div className="bg-white rounded-lg shadow-sm border">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading trash items...</p>
          </div>
        ) : trashItems.length === 0 ? (
          <div className="p-8 text-center">
            <Trash2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No items in trash</h3>
            <p className="text-gray-600">Deleted items will appear here for 30 days before being permanently removed.</p>
          </div>
        ) : (
          <div className="overflow-hidden">
            {/* Header */}
            <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
              <div className="flex items-center space-x-4">
                <input
                  type="checkbox"
                  checked={selectedItems.length === trashItems.length && trashItems.length > 0}
                  onChange={handleSelectAll}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm font-medium text-gray-700">Select All</span>
              </div>
            </div>
            
            {/* Items List */}
            <div className="divide-y divide-gray-200">
              {trashItems.map((item) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-6 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <input
                      type="checkbox"
                      checked={selectedItems.includes(item.id)}
                      onChange={() => handleSelectItem(item.id)}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    
                    <div className="flex-shrink-0">
                      {getItemIcon(item.type)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-sm font-medium text-gray-900 truncate">
                            {item.title}
                          </h3>
                          <p className="text-sm text-gray-500 truncate">
                            {item.description}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2 ml-4">
                          {item.amount && (
                            <span className="text-sm font-medium text-gray-900">
                              ${item.amount.toFixed(2)}
                            </span>
                          )}
                          <span className="text-xs text-gray-500">
                            {getDaysInTrash(item.deletedAt)} days ago
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-4 mt-2">
                        <div className="flex items-center space-x-2">
                          <Calendar size={14} className="text-gray-400" />
                          <span className="text-xs text-gray-500">
                            {formatDate(item.date)}
                          </span>
                        </div>
                        {item.category && (
                          <div className="flex items-center space-x-2">
                            <Tag size={14} className="text-gray-400" />
                            <span className="text-xs text-gray-500">
                              {item.category}
                            </span>
                          </div>
                        )}
                        {item.fileUrl && (
                          <button className="flex items-center space-x-1 text-xs text-blue-600 hover:text-blue-800">
                            <Eye size={14} />
                            <span>View</span>
                          </button>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleRestore(item.id)}
                        className="p-2 text-green-600 hover:text-green-800 hover:bg-green-50 rounded-lg transition-colors"
                        title="Restore item"
                      >
                        <Undo2 size={16} />
                      </button>
                      <button
                        onClick={() => handlePermanentDelete(item)}
                        className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete permanently"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* AI Confirmation Modal */}
      <AnimatePresence>
        {showAIConfirmation && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm"
            onClick={() => setShowAIConfirmation(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="bg-white rounded-lg shadow-2xl w-full max-w-md mx-4 overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-red-500 to-red-600 px-6 py-4 flex items-center">
                <Brain size={20} className="text-white mr-3" />
                <h2 className="text-lg font-semibold text-white">AI Confirmation</h2>
              </div>

              {/* Body */}
              <div className="p-6">
                <div className="flex items-start space-x-3 mb-4">
                  <AlertTriangle size={20} className="text-red-500 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-gray-900 mb-1">
                      Are you sure you want to permanently delete this item?
                    </h3>
                    <p className="text-sm text-gray-600">
                      This action cannot be undone and the item will be lost forever.
                    </p>
                  </div>
                </div>

                {aiLoading ? (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                      <div>
                        <p className="text-sm font-medium text-blue-900">AI Analysis in Progress</p>
                        <p className="text-xs text-blue-700">Analyzing item details...</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                    <div className="flex items-start space-x-3">
                      <Brain size={16} className="text-blue-600 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-blue-900 mb-1">AI Analysis</p>
                        <p className="text-xs text-blue-700 leading-relaxed">
                          {aiResponse}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-end space-x-3">
                  <button
                    onClick={() => setShowAIConfirmation(false)}
                    className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmPermanentDelete}
                    disabled={aiLoading}
                    className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center space-x-2"
                  >
                    <Trash2 size={16} />
                    <span>Delete Permanently</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TrashPage; 
