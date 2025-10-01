import { useState } from 'react';
import { categorizeReceipt } from '../../utils/receiptSmartCategorizer';
import { FileText, AlertTriangle, Check, Loader, DollarSign, Store, Tag, Zap } from 'lucide-react';

interface SmartReceiptCategorizerProps {
  receiptText: string;
  userMemory?: {
    vendor_name: string;
    actual_category: string;
  }[];
  userGoals?: {
    category_tracked: string;
    target_amount: number;
    current_total: number;
  }[];
  onCategorized?: (result: {
    vendor: string;
    amount: number;
    category: string;
    goal_alert?: string;
  }) => void;
  className?: string;
}

const SmartReceiptCategorizer = ({
  receiptText,
  userMemory,
  userGoals,
  onCategorized,
  className = ''
}: SmartReceiptCategorizerProps) => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    vendor: string;
    amount: number;
    category: string;
    reason: string;
    flag_for_review: boolean;
    goal_alert?: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCategorize = async () => {
    if (!receiptText.trim()) {
      setError('Receipt text is required');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await categorizeReceipt({
        receipt_text: receiptText,
        user_memory: userMemory,
        user_goals: userGoals});
      
      setResult(response);
      
      if (onCategorized) {
        onCategorized({
          vendor: response.vendor,
          amount: response.amount,
          category: response.category,
          goal_alert: response.goal_alert});
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to categorize receipt');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`rounded-lg border border-gray-200 overflow-hidden ${className}`}>
      <div className="p-4 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-gray-900">Smart Receipt Categorizer</h3>
          {!loading && !result && (
            <button
              onClick={handleCategorize}
              className="px-3 py-1 bg-primary-600 text-white text-sm rounded-md hover:bg-primary-700 transition-colors flex items-center"
            >
              <FileText size={16} className="mr-1" />
              Categorize
            </button>
          )}
        </div>
      </div>
      
      <div className="p-4">
        {loading && (
          <div className="flex items-center justify-center py-4">
            <Loader size={24} className="text-primary-600 animate-spin mr-2" />
            <span className="text-gray-600">Analyzing receipt...</span>
          </div>
        )}
        
        {error && (
          <div className="flex items-start bg-error-50 p-3 rounded-lg text-error-700">
            <AlertTriangle size={20} className="mr-2 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Categorization failed</p>
              <p className="text-sm">{error}</p>
            </div>
          </div>
        )}
        
        {result && (
          <div className={`p-3 rounded-lg ${
            result.flag_for_review ? 'bg-yellow-50 border border-yellow-200' : 'bg-green-50 border border-green-200'
          }`}>
            <div className="flex items-center mb-2">
              {result.flag_for_review ? (
                <AlertTriangle size={18} className="text-yellow-600 mr-2" />
              ) : (
                <Check size={18} className="text-green-600 mr-2" />
              )}
              <span className="font-medium">
                {result.flag_for_review ? 'Needs Review' : 'Categorized'}
              </span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
              <div>
                <div className="flex items-center text-sm text-gray-600 mb-1">
                  <Store size={14} className="mr-1" />
                  Vendor:
                </div>
                <div className="font-medium text-gray-900 bg-white px-3 py-2 rounded border border-gray-200">
                  {result.vendor}
                </div>
              </div>
              
              <div>
                <div className="flex items-center text-sm text-gray-600 mb-1">
                  <DollarSign size={14} className="mr-1" />
                  Amount:
                </div>
                <div className="font-medium text-gray-900 bg-white px-3 py-2 rounded border border-gray-200">
                  ${result.amount.toFixed(2)}
                </div>
              </div>
            </div>
            
            <div className="mb-3">
              <div className="flex items-center text-sm text-gray-600 mb-1">
                <Tag size={14} className="mr-1" />
                Category:
              </div>
              <div className="font-medium text-gray-900 bg-white px-3 py-2 rounded border border-gray-200">
                {result.category}
              </div>
            </div>
            
            <div className="mb-3">
              <div className="text-sm text-gray-600 mb-1">Reason:</div>
              <div className="text-sm bg-white px-3 py-2 rounded border border-gray-200">
                {result.reason}
              </div>
            </div>
            
            {result.goal_alert && (
              <div className="flex items-center bg-blue-50 p-3 rounded-lg text-blue-700 mt-3">
                <Zap size={18} className="text-blue-500 mr-2 flex-shrink-0" />
                <span>{result.goal_alert}</span>
              </div>
            )}
            
            {result.flag_for_review && (
              <div className="flex items-center bg-yellow-50 p-3 rounded-lg text-yellow-700 mt-3">
                <AlertTriangle size={18} className="text-yellow-500 mr-2 flex-shrink-0" />
                <span>This receipt has been flagged for manual review. Please verify the category.</span>
              </div>
            )}
          </div>
        )}
        
        {!loading && !result && !error && (
          <div className="flex items-center justify-center py-8 text-center text-gray-500">
            <div>
              <FileText size={32} className=" text-gray-300 mb-2" />
              <p>Click "Categorize" to analyze this receipt</p>
              <p className="text-xs mt-1">
                Our AI will extract the vendor, amount, and suggest a category based on your preferences
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SmartReceiptCategorizer;
