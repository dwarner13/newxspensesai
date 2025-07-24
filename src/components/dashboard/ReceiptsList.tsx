import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FileText, RefreshCw, Search, Camera, ChevronLeft, ChevronRight, Eye, Download, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { formatDate } from '../../utils/formatters';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';

interface Receipt {
  id: string;
  image_url: string;
  original_filename: string;
  upload_date: string;
  processing_status: 'pending' | 'processing' | 'completed' | 'failed';
  extracted_data: any;
  transaction_id: string | null;
  created_at: string;
}

const ReceiptsList = () => {
  const { user } = useAuth();
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);
  const receiptsPerPage = 10;

  useEffect(() => {
    if (user) {
      fetchReceipts();
    }
  }, [user]);

  const fetchReceipts = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('receipts')
        .select('*')
        .eq('user_id', user?.id)
        .order('upload_date', { ascending: false });
      
      if (error) {
        console.error('Error fetching receipts:', error);
        setReceipts([]);
      } else {
        setReceipts(data || []);
      }
    } catch (error) {
      console.error('Error fetching receipts:', error);
      setReceipts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchReceipts();
    toast.success('Receipts refreshed');
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1); // Reset to first page on search
  };

  const handleViewReceipt = (receipt: Receipt) => {
    setSelectedReceipt(receipt);
  };

  const handleDownloadReceipt = async (receipt: Receipt) => {
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

  const handleDeleteReceipt = async (receipt: Receipt) => {
    if (!confirm('Are you sure you want to delete this receipt?')) return;

    try {
      // Delete from database
      const { error: dbError } = await supabase
        .from('receipts')
        .delete()
        .eq('id', receipt.id);

      if (dbError) throw dbError;

      // Delete from storage
      const filePath = receipt.image_url.split('/').pop();
      if (filePath) {
        await supabase.storage
          .from('receipts')
          .remove([`${user?.id}/${filePath}`]);
      }

      setReceipts(receipts.filter(r => r.id !== receipt.id));
      toast.success('Receipt deleted successfully');
    } catch (error) {
      console.error('Error deleting receipt:', error);
      toast.error('Failed to delete receipt');
    }
  };

  const closeModal = () => {
    setSelectedReceipt(null);
  };

  // Filter receipts based on search term
  const filteredReceipts = receipts.filter(receipt => {
    const vendorName = receipt.extracted_data?.vendor?.toLowerCase() || '';
    const amount = receipt.extracted_data?.total?.toString() || '';
    const filename = receipt.original_filename.toLowerCase();
    const searchLower = searchTerm.toLowerCase();
    
    return vendorName.includes(searchLower) || 
           amount.includes(searchLower) || 
           filename.includes(searchLower);
  });

  // Pagination
  const indexOfLastReceipt = currentPage * receiptsPerPage;
  const indexOfFirstReceipt = indexOfLastReceipt - receiptsPerPage;
  const currentReceipts = filteredReceipts.slice(indexOfFirstReceipt, indexOfLastReceipt);
  const totalPages = Math.ceil(filteredReceipts.length / receiptsPerPage);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, index) => (
          <div key={index} className="animate-pulse bg-gray-100 dark:bg-gray-800 rounded-lg p-4">
            <div className="flex items-center space-x-4">
              <div className="rounded-md bg-gray-200 dark:bg-gray-700 h-10 w-10"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
              </div>
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (receipts.length === 0) {
    return (
      <div className="text-center py-6 text-gray-500">
        <FileText size={48} className=" text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No receipts found yet</h3>
        <p className="text-gray-500 mb-6">
          Start by uploading your first receipt to track your expenses automatically.
        </p>
        <Link to="/scan-receipt" className="btn-primary inline-flex items-center">
          <Camera size={16} className="mr-2" />
          Scan Your First Receipt
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
        <h2 className="text-xl font-semibold">Recent Receipts</h2>
        
        <div className="flex items-center space-x-2">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search receipts..."
              value={searchTerm}
              onChange={handleSearch}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 w-full sm:w-64"
            />
          </div>
          
          <button
            onClick={handleRefresh}
            className="p-2 text-gray-600 hover:text-primary-600 transition-colors"
            title="Refresh receipts"
          >
            <RefreshCw size={20} />
          </button>
          
          <Link
            to="/scan-receipt"
            className="btn-primary flex items-center"
          >
            <Camera size={16} className="mr-2" />
            Scan Receipt
          </Link>
        </div>
      </div>

      {receipts.length === 0 ? (
        <div className="bg-gray-50 rounded-lg p-8 text-center">
          <FileText size={48} className=" text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No receipts found yet</h3>
          <p className="text-gray-500 mb-6">
            Start by uploading your first receipt to track your expenses automatically.
          </p>
          <Link to="/scan-receipt" className="btn-primary inline-flex items-center">
            <Camera size={16} className="mr-2" />
            Scan Your First Receipt
          </Link>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Receipt
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Vendor
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {currentReceipts.map((receipt) => (
                  <tr key={receipt.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 flex-shrink-0 mr-3">
                          <img 
                            src={receipt.image_url} 
                            alt="Receipt thumbnail" 
                            className="h-10 w-10 rounded-md object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'https://via.placeholder.com/40?text=Receipt';
                            }}
                          />
                        </div>
                        <div className="text-sm font-medium text-gray-900 truncate max-w-xs">
                          {receipt.original_filename}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(receipt.upload_date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {receipt.extracted_data?.vendor || 'Unknown'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {receipt.extracted_data?.total 
                        ? formatCurrency(receipt.extracted_data.total) 
                        : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        receipt.processing_status === 'completed' ? 'bg-green-100 text-green-800' :
                        receipt.processing_status === 'processing' ? 'bg-blue-100 text-blue-800' :
                        receipt.processing_status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {receipt.processing_status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleViewReceipt(receipt)}
                        className="text-primary-600 hover:text-primary-900 mr-3"
                        title="View receipt"
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        onClick={() => handleDownloadReceipt(receipt)}
                        className="text-primary-600 hover:text-primary-900 mr-3"
                        title="Download receipt"
                      >
                        <Download size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteReceipt(receipt)}
                        className="text-red-600 hover:text-red-900"
                        title="Delete receipt"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3 sm:px-6">
              <div className="flex flex-1 justify-between sm:hidden">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Next
                </button>
              </div>
              <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    Showing <span className="font-medium">{indexOfFirstReceipt + 1}</span> to{' '}
                    <span className="font-medium">
                      {Math.min(indexOfLastReceipt, filteredReceipts.length)}
                    </span>{' '}
                    of <span className="font-medium">{filteredReceipts.length}</span> receipts
                  </p>
                </div>
                <div>
                  <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0"
                    >
                      <span className="sr-only">Previous</span>
                      <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                    </button>
                    {Array.from({ length: totalPages }).map((_, index) => (
                      <button
                        key={index}
                        onClick={() => setCurrentPage(index + 1)}
                        className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${
                          currentPage === index + 1
                            ? 'bg-primary-600 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600'
                            : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0'
                        }`}
                      >
                        {index + 1}
                      </button>
                    ))}
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0"
                    >
                      <span className="sr-only">Next</span>
                      <ChevronRight className="h-5 w-5" aria-hidden="true" />
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Receipt Viewer Modal */}
      {selectedReceipt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">Receipt Details</h3>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
            
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <img
                  src={selectedReceipt.image_url}
                  alt="Receipt"
                  className="w-full h-auto max-h-[60vh] object-contain border rounded"
                />
              </div>
              
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-500">File Name</h4>
                  <p className="text-gray-900">{selectedReceipt.original_filename}</p>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Upload Date</h4>
                  <p className="text-gray-900">{formatDate(selectedReceipt.upload_date)}</p>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Status</h4>
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    selectedReceipt.processing_status === 'completed' ? 'bg-green-100 text-green-800' :
                    selectedReceipt.processing_status === 'processing' ? 'bg-blue-100 text-blue-800' :
                    selectedReceipt.processing_status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {selectedReceipt.processing_status}
                  </span>
                </div>
                
                {selectedReceipt.extracted_data && (
                  <>
                    <div>
                      <h4 className="text-sm font-medium text-gray-500">Vendor</h4>
                      <p className="text-gray-900">{selectedReceipt.extracted_data.vendor || 'Unknown'}</p>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium text-gray-500">Date</h4>
                      <p className="text-gray-900">{selectedReceipt.extracted_data.date || 'Unknown'}</p>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium text-gray-500">Total</h4>
                      <p className="text-gray-900 text-lg font-semibold">
                        {selectedReceipt.extracted_data.total 
                          ? formatCurrency(selectedReceipt.extracted_data.total) 
                          : 'Unknown'}
                      </p>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium text-gray-500">Category</h4>
                      <p className="text-gray-900">{selectedReceipt.extracted_data.category || 'Uncategorized'}</p>
                    </div>
                    
                    {selectedReceipt.extracted_data.items && selectedReceipt.extracted_data.items.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-500">Items</h4>
                        <div className="mt-2 max-h-40 overflow-y-auto">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Item
                                </th>
                                <th scope="col" className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Amount
                                </th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {selectedReceipt.extracted_data.items.map((item: any, index: number) => (
                                <tr key={index}>
                                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                                    {item.description}
                                  </td>
                                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 text-right">
                                    {formatCurrency(item.amount)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </>
                )}
                
                <div className="flex space-x-3 pt-4">
                  <button
                    onClick={() => handleDownloadReceipt(selectedReceipt)}
                    className="btn-outline flex-1 flex items-center justify-center"
                  >
                    <Download size={16} className="mr-2" />
                    Download
                  </button>
                  <button
                    onClick={() => {
                      handleDeleteReceipt(selectedReceipt);
                      closeModal();
                    }}
                    className="btn-danger flex-1 flex items-center justify-center"
                  >
                    <Trash2 size={16} className="mr-2" />
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReceiptsList;
