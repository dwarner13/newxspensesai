import { useState } from 'react';
import { interpretReceipt } from '../../utils/receiptInterpreter';
import { FileText, AlertTriangle, Check, Loader, DollarSign, Store, Tag } from 'lucide-react';

interface ReceiptInterpreterProps {
  receiptText: string;
  onInterpreted?: (result: {
    vendor: string;
    amount: number;
    category: string;
  }) => void;
  className?: string;
}

const ReceiptInterpreter = ({
  receiptText,
  onInterpreted,
  className = ''
}: ReceiptInterpreterProps) => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    vendor: string;
    amount: number;
    category: string;
    reason: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleInterpret = async () => {
    if (!receiptText.trim()) {
      setError('Receipt text is required');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await interpretReceipt({
        receiptText
      });
      
      setResult(response);
      
      if (onInterpreted) {
        onInterpreted({
          vendor: response.vendor,
          amount: response.amount,
          category: response.category
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to interpret receipt');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`rounded-lg border border-gray-200 overflow-hidden ${className}`}>
      <div className="p-4 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-gray-900">Receipt Interpreter</h3>
          {!loading && !result && (
            <button
              onClick={handleInterpret}
              className="px-3 py-1 bg-primary-600 text-white text-sm rounded-md hover:bg-primary-700 transition-colors flex items-center"
            >
              <FileText size={16} className="mr-1" />
              Interpret
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
              <p className="font-medium">Interpretation failed</p>
              <p className="text-sm">{error}</p>
            </div>
          </div>
        )}
        
        {result && (
          <div className="p-3 rounded-lg bg-green-50 border border-green-200">
            <div className="flex items-center mb-2">
              <Check size={18} className="text-green-600 mr-2" />
              <span className="font-medium">Receipt Interpreted</span>
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
            
            <div>
              <div className="text-sm text-gray-600 mb-1">Reason:</div>
              <div className="text-sm bg-white px-3 py-2 rounded border border-gray-200">
                {result.reason}
              </div>
            </div>
          </div>
        )}
        
        {!loading && !result && !error && (
          <div className="flex items-center justify-center py-8 text-center text-gray-500">
            <div>
              <FileText size={32} className=" text-gray-300 mb-2" />
              <p>Click "Interpret" to analyze this receipt</p>
              <p className="text-xs mt-1">
                Our AI will extract the vendor, amount, and suggest a category
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReceiptInterpreter;
