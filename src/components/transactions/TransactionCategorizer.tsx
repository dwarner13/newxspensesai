import { useState } from 'react';
import { categorizeTransaction } from '../../utils/transactionCategorizer';
import { Brain, AlertTriangle, Check, Loader } from 'lucide-react';

interface TransactionCategorizerProps {
  vendor: string;
  amount: number;
  description: string;
  notes?: string;
  onCategorized: (category: string, flaggedForReview: boolean) => void;
  className?: string;
}

const TransactionCategorizer = ({
  vendor,
  amount,
  description,
  notes = '',
  onCategorized,
  className = ''
}: TransactionCategorizerProps) => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    category: string;
    reason: string;
    flag_for_review: boolean;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCategorize = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await categorizeTransaction({
        vendor,
        amount,
        description,
        notes});
      
      setResult(response);
      onCategorized(response.category, response.flag_for_review);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to categorize transaction');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`rounded-lg border border-gray-200 overflow-hidden ${className}`}>
      <div className="p-4 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-gray-900">AI Transaction Categorizer</h3>
          {!loading && !result && (
            <button
              onClick={handleCategorize}
              className="px-3 py-1 bg-primary-600 text-white text-sm rounded-md hover:bg-primary-700 transition-colors flex items-center"
            >
              <Brain size={16} className="mr-1" />
              Categorize
            </button>
          )}
        </div>
      </div>
      
      <div className="p-4">
        {loading && (
          <div className="flex items-center justify-center py-4">
            <Loader size={24} className="text-primary-600 animate-spin mr-2" />
            <span className="text-gray-600">Analyzing transaction...</span>
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
            
            <div className="mb-3">
              <div className="text-sm text-gray-600 mb-1">Category:</div>
              <div className="font-medium text-gray-900 bg-white px-3 py-2 rounded border border-gray-200">
                {result.category}
              </div>
            </div>
            
            <div>
              <div className="text-sm text-gray-600 mb-1">Reason:</div>
              <div className="text-sm bg-white px-3 py-2 rounded border border-gray-200">
                {result.reason}
              </div>
            </div>
            
            {result.flag_for_review && (
              <div className="mt-3 text-sm text-yellow-700">
                This transaction has been flagged for manual review. Please verify the category.
              </div>
            )}
          </div>
        )}
        
        {!loading && !result && !error && (
          <div className="flex items-center justify-center py-8 text-center text-gray-500">
            <div>
              <Brain size={32} className=" text-gray-300 mb-2" />
              <p>Click "Categorize" to analyze this transaction</p>
              <p className="text-xs mt-1">
                Our AI will suggest the most appropriate category based on the vendor and description
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TransactionCategorizer;
