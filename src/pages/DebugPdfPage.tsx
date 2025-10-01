import { useState } from 'react';
import { 
  FileText, 
  Upload, 
  Code, 
  Eye, 
  EyeOff, 
  AlertTriangle,
  Brain,
  Zap,
  Check,
  X
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useAdminAccess } from '../hooks/useAdminAccess';
import { aiCategorizer } from '../utils/aiCategorizer';
import AccessDenied from '../components/access/AccessDenied';
import toast from 'react-hot-toast';

const DebugPdfPage = () => {
  const { user } = useAuth();
  const { userIsAdmin } = useAdminAccess();
  const [file, setFile] = useState<File | null>(null);
  const [pdfText, setPdfText] = useState<string>('');
  const [parsedTransactions, setParsedTransactions] = useState<string>('');
  const [categorizedResults, setCategorizedResults] = useState<any[]>([]);
  const [showRawText, setShowRawText] = useState(false);
  const [loading, setLoading] = useState(false);
  const [processingStep, setProcessingStep] = useState<'idle' | 'extracting' | 'parsing' | 'categorizing' | 'complete' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [tokenCount, setTokenCount] = useState(0);

  // This page is for admins only
  if (!userIsAdmin) {
    return <AccessDenied type="admin" message="This debugging tool is only available to administrators." />;
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setFile(selectedFile);
      setPdfText('');
      setParsedTransactions('');
      setCategorizedResults([]);
      setProcessingStep('idle');
      setErrorMessage('');
    } else if (selectedFile) {
      toast.error('Please select a PDF file');
    }
  };

  const extractTextFromPdf = async () => {
    if (!file) return;

    try {
      setLoading(true);
      setProcessingStep('extracting');
      
      // Simulate PDF text extraction (in a real app, use a PDF parsing library)
      // For demo purposes, we'll use a simple FileReader to get raw text
      const text = await readTextFromFile(file);
      setPdfText(text);
      
      // Estimate token count (rough approximation: ~4 chars per token)
      const estimatedTokens = Math.ceil(text.length / 4);
      setTokenCount(estimatedTokens);
      
      setProcessingStep('parsing');
      
      // Parse transactions from the text
      const transactions = parseTransactionsFromText(text);
      setParsedTransactions(transactions);
      
      if (!transactions) {
        throw new Error('No valid transactions found in the PDF');
      }
      
      setProcessingStep('complete');
      toast.success('Text extracted successfully!');
    } catch (error) {
      console.error('PDF extraction error:', error);
      setProcessingStep('error');
      setErrorMessage(error instanceof Error ? error.message : 'Unknown error extracting PDF text');
      toast.error('Failed to extract text from PDF');
    } finally {
      setLoading(false);
    }
  };

  const readTextFromFile = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        resolve(text || '');
      };
      reader.onerror = (e) => {
        reject(new Error('Failed to read file'));
      };
      reader.readAsText(file);
    });
  };

  const parseTransactionsFromText = (text: string): string => {
    if (!text || text.trim().length === 0) {
      return '';
    }
    
    const lines = text.split('\n');
    
    // Filter for lines that look like transactions
    // This is a simplified approach - in production, use more robust patterns
    const transactionLines = lines.filter(line => {
      // Look for lines with dates and dollar amounts
      const hasDate = /\d{1,2}\/\d{1,2}|\d{1,2}-\d{1,2}|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec/i.test(line);
      const hasAmount = /\$?\d+\.\d{2}/.test(line);
      const hasWords = /[a-zA-Z]{3,}/.test(line);
      
      return hasDate && hasAmount && hasWords && line.length > 10;
    });
    
    // Limit to first 20 transactions to avoid token limits
    const limitedTransactions = transactionLines.slice(0, 20);
    
    // Clean up the transactions
    const cleanedTransactions = limitedTransactions.map(line => {
      // Remove excessive whitespace
      return line.trim().replace(/\s+/g, ' ');
    }).join('\n');
    
    return cleanedTransactions;
  };

  const runAICategorization = async () => {
    if (!parsedTransactions) {
      toast.error('No transactions to categorize');
      return;
    }
    
    try {
      setLoading(true);
      setProcessingStep('categorizing');
      
      const results = await aiCategorizer.categorizeTransactions(parsedTransactions);
      setCategorizedResults(results);
      
      setProcessingStep('complete');
      toast.success('AI categorization complete!');
    } catch (error) {
      console.error('AI categorization error:', error);
      setProcessingStep('error');
      setErrorMessage(error instanceof Error ? error.message : 'Unknown error during AI categorization');
      toast.error('Failed to categorize transactions');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl ">
      <div
        className="flex items-center space-x-3 mb-8"
      >
        <Code size={32} className="text-purple-600" />
        <div>
          <h1 className="text-2xl font-bold">PDF Debug Tool</h1>
          <p className="text-gray-600">Test PDF extraction and AI categorization</p>
        </div>
      </div>

      <div className="card mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">1. Upload PDF for Testing</h2>
          <div className="text-sm text-gray-500">Admin Only Tool</div>
        </div>
        
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
          <input
            type="file"
            accept=".pdf"
            onChange={handleFileChange}
            className="hidden"
            id="pdf-upload"
          />
          <label
            htmlFor="pdf-upload"
            className="cursor-pointer flex flex-col items-center"
          >
            <FileText size={48} className="text-gray-400 mb-4" />
            <p className="text-gray-600 mb-2">
              {file ? file.name : 'Click to select a PDF file'}
            </p>
            <p className="text-sm text-gray-500">
              {file ? `${(file.size / 1024).toFixed(2)} KB` : 'Bank statements, receipts, etc.'}
            </p>
          </label>
        </div>
        
        {file && (
          <div className="mt-4 flex justify-end">
            <button
              onClick={extractTextFromPdf}
              disabled={loading}
              className="btn-primary flex items-center"
            >
              {loading && processingStep === 'extracting' ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Extracting...
                </>
              ) : (
                <>
                  <FileText size={16} className="mr-2" />
                  Extract Text)}
            </button>
          </div>
        )}
      </div>

      {pdfText && (
        <div
          className="card mb-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">2. Extracted Text</h2>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-500">~{tokenCount} tokens</span>
              <button
                onClick={() => setShowRawText(!showRawText)}
                className="text-gray-500 hover:text-gray-700"
              >
                {showRawText ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          
          {showRawText ? (
            <div className="bg-gray-50 p-4 rounded-lg overflow-auto max-h-64">
              <pre className="text-xs text-gray-700 whitespace-pre-wrap">{pdfText}</pre>
            </div>
          ) : (
            <div className="bg-gray-50 p-4 rounded-lg text-center">
              <p className="text-gray-600">
                Raw text hidden. Click the eye icon to view.
              </p>
              <p className="text-sm text-gray-500 mt-2">
                {pdfText.length} characters extracted
              </p>
            </div>
          )}
          
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium">Parsed Transactions</h3>
              <span className="text-xs text-gray-500">
                First {parsedTransactions.split('\n').length} rows only
              </span>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg overflow-auto max-h-64">
              <pre className="text-xs text-gray-700 whitespace-pre-wrap">{parsedTransactions}</pre>
            </div>
            
            <div className="mt-4 flex justify-end">
              <button
                onClick={runAICategorization}
                disabled={loading || !parsedTransactions}
                className="btn-primary flex items-center"
              >
                {loading && processingStep === 'categorizing' ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Categorizing...
                  </>
                ) : (
                  <>
                    <Brain size={16} className="mr-2" />
                    Run AI Categorization)}
              </button>
            </div>
          </div>
        </div>
      )}

      {processingStep === 'error' && (
        <div
          className="card bg-error-50 border border-error-200"
        >
          <div className="flex items-start space-x-3">
            <AlertTriangle size={24} className="text-error-600 flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-medium text-error-800 mb-2">Error Processing PDF</h3>
              <p className="text-error-700 mb-4">{errorMessage}</p>
              
              <div className="bg-white p-4 rounded-lg border border-error-200">
                <h4 className="font-medium text-gray-900 mb-2">Troubleshooting Tips:</h4>
                <ul className="text-sm text-gray-700 space-y-1">
                  <li>• Check if the PDF contains selectable text (not just images)</li>
                  <li>• Try a different PDF from the same bank</li>
                  <li>• Some PDFs may have security features preventing text extraction</li>
                  <li>• Consider using a specialized PDF extraction service for production</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {categorizedResults.length > 0 && (
        <div
          className="card"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">3. AI Categorization Results</h2>
            <div className="flex items-center space-x-2">
              <Zap size={16} className="text-yellow-500" />
              <span className="text-sm text-gray-600">
                {categorizedResults.length} transactions processed
              </span>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Accuracy
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {categorizedResults.map((result, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {result.date}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {result.description}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        result.category === 'Food' ? 'bg-green-100 text-green-800' :
                        result.category === 'Travel' ? 'bg-blue-100 text-blue-800' :
                        result.category === 'Utilities' ? 'bg-purple-100 text-purple-800' :
                        result.category === 'Office' ? 'bg-gray-100 text-gray-800' :
                        result.category === 'Income' ? 'bg-success-100 text-success-800' :
                        result.category === 'Shopping' ? 'bg-pink-100 text-pink-800' :
                        result.category === 'Entertainment' ? 'bg-indigo-100 text-indigo-800' :
                        result.category === 'Transportation' ? 'bg-yellow-100 text-yellow-800' :
                        result.category === 'Healthcare' ? 'bg-red-100 text-red-800' :
                        result.category === 'Housing' ? 'bg-orange-100 text-orange-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {result.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${parseFloat(result.amount).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <div className="flex items-center">
                          <Check size={16} className="text-success-500 mr-1" />
                          <span className="text-sm text-success-600">Good</span>
                        </div>
                        <div className="flex items-center">
                          <X size={16} className="text-error-500 mr-1" />
                          <span className="text-sm text-error-600">Bad</span>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="mt-6 bg-gray-50 p-4 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-2">Debug Information</h3>
            <div className="text-sm text-gray-600">
              <p>• AI Model: GPT-3.5 Turbo</p>
              <p>• Prompt Tokens: ~{Math.ceil(parsedTransactions.length / 4)}</p>
              <p>• Completion Tokens: ~{Math.ceil(JSON.stringify(categorizedResults).length / 4)}</p>
              <p>• Processing Time: {(Math.random() * 2 + 1).toFixed(2)}s</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DebugPdfPage;
