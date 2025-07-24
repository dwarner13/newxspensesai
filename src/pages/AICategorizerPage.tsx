import { motion } from 'framer-motion';
import { Brain, Zap, FileText, Target, Star, DollarSign, Info } from 'lucide-react';
import TransactionCategorizer from '../components/upload/TransactionCategorizer';
import { Link } from 'react-router-dom';

const AICategorizerPage = () => {
  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <div className="flex items-center justify-center space-x-3 mb-4">
          <Brain size={32} className="text-primary-600" />
          <h1 className="text-3xl font-bold">AI Transaction Categorizer</h1>
        </div>
        <p className="text-xl text-gray-600 max-w-3xl ">
          Upload your transaction data and let our AI automatically categorize each transaction 
          with intelligent pattern recognition and learning capabilities.
        </p>
      </motion.div>

      {/* Features Overview */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8"
      >
        <div className="card text-center">
          <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center  mb-4">
            <FileText size={24} className="text-primary-600" />
          </div>
          <h3 className="font-semibold text-gray-900 mb-2">Smart File Processing</h3>
          <p className="text-sm text-gray-600">
            Upload CSV or text files with transaction data. We'll automatically detect the format and extract relevant information.
          </p>
        </div>

        <div className="card text-center">
          <div className="w-12 h-12 bg-secondary-100 rounded-full flex items-center justify-center  mb-4">
            <Brain size={24} className="text-secondary-600" />
          </div>
          <h3 className="font-semibold text-gray-900 mb-2">AI-Powered Categorization</h3>
          <p className="text-sm text-gray-600">
            Our AI analyzes transaction descriptions and automatically assigns appropriate categories with high accuracy.
          </p>
        </div>

        <div className="card text-center">
          <div className="w-12 h-12 bg-accent-100 rounded-full flex items-center justify-center  mb-4">
            <Target size={24} className="text-accent-600" />
          </div>
          <h3 className="font-semibold text-gray-900 mb-2">Batch Processing</h3>
          <p className="text-sm text-gray-600">
            Process up to 20 transactions at a time with intelligent batching to ensure optimal performance and accuracy.
          </p>
        </div>
      </motion.div>

      {/* API Key Notice */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="card bg-blue-50 border border-blue-200 mb-8"
      >
        <div className="flex items-start space-x-4">
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
            <Info size={24} className="text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-blue-900 mb-2">
              OpenAI API Key Required
            </h3>
            <p className="text-blue-700 mb-4">
              This feature requires an OpenAI API key to function. The key is used to power the AI categorization capabilities.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="bg-white p-3 rounded-lg border border-blue-200">
                <h4 className="font-medium text-blue-900 mb-2">Setup Instructions</h4>
                <ol className="list-decimal list-inside space-y-1 text-blue-700">
                  <li>Get an API key from <a href="https://platform.openai.com/" target="_blank" rel="noopener noreferrer" className="underline">OpenAI Platform</a></li>
                  <li>Add it to your .env file as VITE_OPENAI_API_KEY</li>
                  <li>Restart your development server</li>
                </ol>
              </div>
              
              <div className="bg-white p-3 rounded-lg border border-blue-200">
                <h4 className="font-medium text-blue-900 mb-2">Cost Information</h4>
                <ul className="space-y-1 text-blue-700">
                  <li>• OpenAI charges ~$0.002 per 1K tokens</li>
                  <li>• Each transaction uses ~50 tokens</li>
                  <li>• 100 transactions ≈ $0.01 USD</li>
                  <li>• Set usage limits in OpenAI dashboard</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Main Categorizer Component */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <TransactionCategorizer 
          onComplete={(transactions) => {
            console.log('Categorization complete:', transactions);
          }}
        />
      </motion.div>

      {/* Tips Section */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="card bg-gradient-to-r from-primary-50 to-secondary-50 border-primary-200"
      >
        <div className="flex items-start space-x-4">
          <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
            <Zap size={24} className="text-primary-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              💡 Tips for Best Results
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700">
              <div>
                <h4 className="font-medium mb-2">File Format</h4>
                <ul className="space-y-1">
                  <li>• Use CSV files for best compatibility</li>
                  <li>• Include date, description, and amount columns</li>
                  <li>• One transaction per row</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-2">Data Quality</h4>
                <ul className="space-y-1">
                  <li>• Clear merchant/vendor names work best</li>
                  <li>• Remove header rows if present</li>
                  <li>• Ensure consistent date formats</li>
                </ul>
              </div>
            </div>
            <div className="mt-4 p-3 bg-white rounded-lg border border-primary-200">
              <p className="text-sm text-primary-800">
                <strong>Earn XP:</strong> Get 2 XP per transaction categorized + 25 XP bonus when you save to your database!
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Example Formats */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
        className="card"
      >
        <h3 className="text-lg font-semibold mb-4">Example File Formats</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="flex items-center space-x-2 mb-2">
              <FileText size={16} className="text-primary-600" />
              <h4 className="font-medium">CSV Format (Recommended)</h4>
            </div>
            <pre className="bg-gray-50 p-3 rounded-lg text-xs text-gray-700 overflow-x-auto">
{`Date,Description,Amount
2024-01-15,STARBUCKS COFFEE,5.50
2024-01-16,UBER RIDE,12.30
2024-01-17,ELECTRIC BILL,89.45`}
            </pre>
          </div>
          
          <div>
            <div className="flex items-center space-x-2 mb-2">
              <FileText size={16} className="text-secondary-600" />
              <h4 className="font-medium">Text Format</h4>
            </div>
            <pre className="bg-gray-50 p-3 rounded-lg text-xs text-gray-700 overflow-x-auto">
{`2024-01-15    STARBUCKS COFFEE    $5.50
2024-01-16    UBER RIDE          $12.30
2024-01-17    ELECTRIC BILL      $89.45`}
            </pre>
          </div>
        </div>
      </motion.div>

      {/* Navigation */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="text-center"
      >
        <div className="flex justify-center space-x-4">
          <Link to="/upload" className="btn-outline">
            ← Back to Upload
          </Link>
          <Link to="/transactions" className="btn-primary">
            View All Transactions →
          </Link>
        </div>
      </motion.div>
    </div>
  );
};

export default AICategorizerPage;
