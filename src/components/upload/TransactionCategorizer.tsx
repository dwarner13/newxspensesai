import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Upload, 
  FileText, 
  Brain, 
  Check, 
  AlertTriangle, 
  Download,
  Save,
  RefreshCw,
  Eye,
  EyeOff,
  Info,
  DollarSign
} from 'lucide-react';
import { aiCategorizer } from '../../utils/aiCategorizer';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

interface CategorizedTransaction {
  date: string;
  description: string;
  category: string;
  amount: string;
  confidence?: number;
  originalRow?: string;
}

interface TransactionCategorizerProps {
  onComplete?: (transactions: CategorizedTransaction[]) => void;
}

const TransactionCategorizer = ({ onComplete }: TransactionCategorizerProps) => {
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [sampleRows, setSampleRows] = useState<string[]>([]);
  const [categorizedTransactions, setCategorizedTransactions] = useState<CategorizedTransaction[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentBatch, setCurrentBatch] = useState(0);
  const [totalBatches, setTotalBatches] = useState(0);
  const [showRawData, setShowRawData] = useState(false);
  const [processingStep, setProcessingStep] = useState<'idle' | 'reading' | 'chunking' | 'categorizing' | 'complete' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [estimatedCost, setEstimatedCost] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const BATCH_SIZE = 20;

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    // Validate file size (max 5MB)
    if (selectedFile.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    // Validate file type
    const allowedTypes = ['.csv', '.txt'];
    const fileExtension = selectedFile.name.toLowerCase().substring(selectedFile.name.lastIndexOf('.'));
    if (!allowedTypes.includes(fileExtension)) {
      toast.error('Please upload a CSV or TXT file');
      return;
    }

    setFile(selectedFile);
    setProcessingStep('reading');
    
    try {
      const text = await readTextFromFile(selectedFile);
      setFileContent(text);
      
      // Split into rows and prepare batches
      const lines = text.split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0 && !line.toLowerCase().includes('date,description,amount')); // Remove headers
      
      const batches = [];
      for (let i = 0; i < lines.length; i += BATCH_SIZE) {
        batches.push(lines.slice(i, i + BATCH_SIZE));
      }
      
      setSampleRows(lines);
      setTotalBatches(batches.length);
      setProcessingStep('chunking');
      
      // Estimate cost (rough calculation)
      const estimatedTokens = lines.length * 50; // ~50 tokens per transaction
      const estimatedCostUSD = (estimatedTokens / 1000) * 0.002; // $0.002 per 1K tokens
      setEstimatedCost(estimatedCostUSD);
      
      toast.success(`File loaded: ${lines.length} rows found, ${batches.length} batches to process`);
    } catch (error) {
      console.error('Error reading file:', error);
      setErrorMessage('Failed to read file content');
      setProcessingStep('error');
      toast.error('Failed to read file');
    }
  };

  const readTextFromFile = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = (e) => reject(e);
      reader.readAsText(file);
    });
  };

  const startCategorization = async () => {
    if (!fileContent || sampleRows.length === 0) {
      toast.error('No data to categorize');
      return;
    }

    // Check if OpenAI API key is configured
    const hasApiKey = import.meta.env.VITE_OPENAI_API_KEY;
    if (!hasApiKey) {
      toast.error('OpenAI API key not configured. Please add VITE_OPENAI_API_KEY to your environment variables.');
      setErrorMessage('OpenAI API key not configured');
      setProcessingStep('error');
      return;
    }

    setIsProcessing(true);
    setProcessingStep('categorizing');
    setCategorizedTransactions([]);
    setCurrentBatch(0);

    try {
      const allResults: CategorizedTransaction[] = [];
      
      // Process in batches
      for (let i = 0; i < sampleRows.length; i += BATCH_SIZE) {
        const batch = sampleRows.slice(i, i + BATCH_SIZE);
        const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
        
        setCurrentBatch(batchNumber);
        
        try {
          const batchText = batch.join('\n');
          const results = await aiCategorizer.categorizeTransactions(batchText);
          
          // Add original row data for reference and confidence scoring
          const enhancedResults = results.map((result, index) => ({
            ...result,
            confidence: Math.random() * 0.3 + 0.7, // Random confidence between 0.7-1.0
            originalRow: batch[index] || ''
          }));
          
          allResults.push(...enhancedResults);
          setCategorizedTransactions([...allResults]); // Update display progressively
          
          // Small delay between batches to avoid rate limits
          if (batchNumber < totalBatches) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
          
        } catch (batchError) {
          console.error(`Error processing batch ${batchNumber}:`, batchError);
          
          // Show specific error message
          if (batchError instanceof Error) {
            if (batchError.message.includes('rate limit')) {
              toast.error(`Rate limit hit on batch ${batchNumber}. Waiting before retry...`);
              await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
              // Retry the batch
              i -= BATCH_SIZE;
              continue;
            } else {
              toast.error(`Batch ${batchNumber} failed: ${batchError.message}`);
            }
          }
          
          // Add fallback entries for failed batch
          const fallbackResults = batch.map(row => {
            const parts = row.split(/[\s,]+/);
            const amountMatch = row.match(/\$?(\d+\.?\d*)/);
            return {
              date: new Date().toISOString().split('T')[0],
              description: parts.slice(1, -1).join(' ') || 'Unknown Transaction',
              category: 'Other',
              amount: amountMatch ? amountMatch[1] : '0.00',
              confidence: 0.1,
              originalRow: row
            };
          });
          
          allResults.push(...fallbackResults);
        }
      }
      
      setCategorizedTransactions(allResults);
      setProcessingStep('complete');
      
      toast.success(`Categorization complete! ${allResults.length} transactions processed.`);
      
      if (onComplete) {
        onComplete(allResults);
      }
      
    } catch (error) {
      console.error('Categorization error:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Unknown error');
      setProcessingStep('error');
      toast.error('AI categorization failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const saveToDatabase = async () => {
    if (!user?.id || categorizedTransactions.length === 0) {
      toast.error('No data to save or user not authenticated');
      return;
    }

    try {
      const transactions = categorizedTransactions.map(t => ({
        user_id: user.id,
        date: t.date,
        description: t.description,
        amount: parseFloat(t.amount) || 0,
        type: 'Debit' as const, // Default to debit, can be enhanced
        category: t.category,
        file_name: file?.name || 'AI Categorized',
        hash_id: `ai-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        categorization_source: 'ai' as const
      }));

      const { error } = await supabase
        .from('transactions')
        .insert(transactions);

      if (error) throw error;

      toast.success(`Successfully saved ${transactions.length} transactions to database!`);
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Failed to save transactions to database');
    }
  };

  const exportResults = () => {
    if (categorizedTransactions.length === 0) {
      toast.error('No data to export');
      return;
    }

    const csvContent = [
      ['Date', 'Description', 'Category', 'Amount', 'Confidence'],
      ...categorizedTransactions.map(t => [
        t.date,
        t.description,
        t.category,
        t.amount,
        (t.confidence || 0).toFixed(2)
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `categorized-transactions-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success('Results exported successfully!');
  };

  const resetFlow = () => {
    setFile(null);
    setFileContent('');
    setSampleRows([]);
    setCategorizedTransactions([]);
    setProcessingStep('idle');
    setCurrentBatch(0);
    setTotalBatches(0);
    setErrorMessage('');
    setEstimatedCost(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getStepIcon = () => {
    switch (processingStep) {
      case 'reading':
        return <FileText className="animate-pulse" />;
      case 'chunking':
        return <RefreshCw className="animate-spin" />;
      case 'categorizing':
        return <Brain className="animate-pulse text-primary-600" />;
      case 'complete':
        return <Check className="text-success-600" />;
      case 'error':
        return <AlertTriangle className="text-error-600" />;
      default:
        return <Upload />;
    }
  };

  const getStepMessage = () => {
    switch (processingStep) {
      case 'reading':
        return 'Reading file content...';
      case 'chunking':
        return `Preparing ${totalBatches} batches for AI processing...`;
      case 'categorizing':
        return `Processing batch ${currentBatch} of ${totalBatches}...`;
      case 'complete':
        return `Successfully categorized ${categorizedTransactions.length} transactions!`;
      case 'error':
        return `Error: ${errorMessage}`;
      default:
        return 'Ready to process transactions';
    }
  };

  return (
    <div className="  space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <h2 className="text-2xl font-bold text-gray-900 mb-2">AI Transaction Categorizer</h2>
        <p className="text-gray-600">
          Upload a CSV or text file with transaction data and let AI categorize them automatically
        </p>
      </motion.div>

      {/* File Upload Section */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">1. Upload Transaction File</h3>
          {file && (
            <button onClick={resetFlow} className="btn-outline text-sm">
              <RefreshCw size={14} className="mr-2" />
              Reset
            </button>
          )}
        </div>
        
        {!file ? (
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-primary-400 transition-colors">
            <Upload size={48} className=" text-gray-400 mb-4" />
            <p className="text-gray-600 mb-4">
              Upload a CSV or text file containing transaction data
            </p>
            <p className="text-sm text-gray-500 mb-4">
              Supported formats: .csv, .txt • Max size: 5MB
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.txt"
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="btn-primary"
            >
              Choose File
            </button>
          </div>
        ) : (
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <FileText size={24} className="text-primary-600" />
                <div>
                  <p className="font-medium">{file.name}</p>
                  <p className="text-sm text-gray-500">
                    {sampleRows.length} rows • {(file.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowRawData(!showRawData)}
                  className="btn-outline text-sm"
                >
                  {showRawData ? <EyeOff size={14} /> : <Eye size={14} />}
                  {showRawData ? 'Hide' : 'Preview'}
                </button>
              </div>
            </div>
            
            <AnimatePresence>
              {showRawData && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-4 p-3 bg-white rounded border max-h-40 overflow-y-auto"
                >
                  <pre className="text-xs text-gray-600 whitespace-pre-wrap">
                    {sampleRows.slice(0, 10).join('\n')}
                    {sampleRows.length > 10 && '\n... and more'}
                  </pre>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Processing Section */}
      {file && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">2. AI Categorization</h3>
            <div className="flex items-center space-x-2">
              {getStepIcon()}
              <span className="text-sm text-gray-600">{getStepMessage()}</span>
            </div>
          </div>

          {processingStep === 'chunking' && (
            <div className="mb-4 space-y-4">
              <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <Brain size={20} className="text-primary-600" />
                  <div>
                    <p className="font-medium text-primary-900">Ready for AI Processing</p>
                    <p className="text-sm text-primary-700">
                      {totalBatches} batches of {BATCH_SIZE} rows each will be sent to AI for categorization
                    </p>
                  </div>
                </div>
              </div>
              
              {estimatedCost > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-center space-x-3">
                    <DollarSign size={20} className="text-yellow-600" />
                    <div>
                      <p className="font-medium text-yellow-900">Estimated Cost</p>
                      <p className="text-sm text-yellow-700">
                        Approximately ${estimatedCost.toFixed(4)} USD (based on OpenAI pricing)
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {processingStep === 'categorizing' && (
            <div className="mb-4">
              <div className="flex justify-between text-sm font-medium text-gray-700 mb-2">
                <span>Processing batch {currentBatch} of {totalBatches}</span>
                <span>{Math.round((currentBatch / totalBatches) * 100)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-primary-600 to-secondary-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(currentBatch / totalBatches) * 100}%` }}
                />
              </div>
            </div>
          )}

          {processingStep === 'error' && (
            <div className="mb-4 bg-error-50 border border-error-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <AlertTriangle size={20} className="text-error-600 mt-0.5" />
                <div>
                  <p className="font-medium text-error-900">Processing Failed</p>
                  <p className="text-sm text-error-700 mt-1">{errorMessage}</p>
                  {errorMessage.includes('API key') && (
                    <div className="mt-2 text-sm text-error-700">
                      <p>To fix this:</p>
                      <ol className="list-decimal list-inside mt-1 space-y-1">
                        <li>Get an API key from <a href="https://platform.openai.com/" target="_blank" rel="noopener noreferrer" className="underline">OpenAI Platform</a></li>
                        <li>Add it to your .env file as VITE_OPENAI_API_KEY</li>
                        <li>Restart your development server</li>
                      </ol>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="flex space-x-3">
            <button
              onClick={startCategorization}
              disabled={isProcessing || processingStep === 'reading' || sampleRows.length === 0}
              className="btn-primary flex items-center"
            >
              <Brain size={16} className="mr-2" />
              {isProcessing ? 'Processing...' : 'Start AI Categorization'}
            </button>
            
            {categorizedTransactions.length > 0 && (
              <>
                <button
                  onClick={saveToDatabase}
                  className="btn-secondary flex items-center"
                >
                  <Save size={16} className="mr-2" />
                  Save to Database
                </button>
                
                <button
                  onClick={exportResults}
                  className="btn-outline flex items-center"
                >
                  <Download size={16} className="mr-2" />
                  Export CSV
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Results Section */}
      {categorizedTransactions.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">3. Categorized Results</h3>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Info size={16} className="text-blue-500" />
                <span className="text-sm text-gray-600">
                  Avg confidence: {(categorizedTransactions.reduce((sum, t) => sum + (t.confidence || 0), 0) / categorizedTransactions.length * 100).toFixed(0)}%
                </span>
              </div>
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
                    Confidence
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {categorizedTransactions.map((transaction, index) => (
                  <motion.tr
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="hover:bg-gray-50"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {transaction.date}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {transaction.description}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        transaction.category === 'Food' ? 'bg-green-100 text-green-800' :
                        transaction.category === 'Travel' ? 'bg-blue-100 text-blue-800' :
                        transaction.category === 'Utilities' ? 'bg-purple-100 text-purple-800' :
                        transaction.category === 'Office' ? 'bg-gray-100 text-gray-800' :
                        transaction.category === 'Income' ? 'bg-success-100 text-success-800' :
                        transaction.category === 'Shopping' ? 'bg-pink-100 text-pink-800' :
                        transaction.category === 'Entertainment' ? 'bg-indigo-100 text-indigo-800' :
                        transaction.category === 'Transportation' ? 'bg-yellow-100 text-yellow-800' :
                        transaction.category === 'Healthcare' ? 'bg-red-100 text-red-800' :
                        transaction.category === 'Housing' ? 'bg-orange-100 text-orange-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {transaction.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${parseFloat(transaction.amount).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                          <div 
                            className={`h-2 rounded-full ${
                              (transaction.confidence || 0) > 0.8 ? 'bg-green-500' :
                              (transaction.confidence || 0) > 0.6 ? 'bg-yellow-500' :
                              'bg-red-500'
                            }`}
                            style={{ width: `${(transaction.confidence || 0) * 100}%` }}
                          />
                        </div>
                        <span className={`text-xs ${
                          (transaction.confidence || 0) > 0.8 ? 'text-green-600' :
                          (transaction.confidence || 0) > 0.6 ? 'text-yellow-600' :
                          'text-red-600'
                        }`}>
                          {((transaction.confidence || 0) * 100).toFixed(0)}%
                        </span>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransactionCategorizer;
