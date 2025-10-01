import { useState } from 'react';
import { Camera, ArrowLeft, Receipt, Zap, FileImage, Brain, AlertTriangle, Info } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import ReceiptScanner from '../components/receipts/ReceiptScanner';
import ReceiptScannerDebug from '../components/receipts/ReceiptScannerDebug';
import toast from 'react-hot-toast';
import { useAdminAccess } from '../hooks/useAdminAccess';

const ReceiptScannerPage = () => {
  const navigate = useNavigate();
  const { userIsAdmin } = useAdminAccess();
  const [debugMode, setDebugMode] = useState(false);

  const handleReceiptProcessed = (receiptData: any) => {
    console.log('Receipt processed:', receiptData);
    toast.success('Receipt processed successfully!');
    
    // Navigate to transactions page after processing
    setTimeout(() => {
      navigate('/transactions');
    }, 1500);
  };

  return (
    <div className="max-w-4xl ">
      <div
        className="flex items-center space-x-3 mb-8"
      >
        <Link 
          to="/upload"
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <ArrowLeft size={24} />
        </Link>
        <Receipt size={32} className="text-primary-600" />
        <h1 className="text-2xl font-bold">Receipt Scanner</h1>
        
        {userIsAdmin && (
          <button
            onClick={() => setDebugMode(!debugMode)}
            className="ml-auto text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded-full flex items-center"
          >
            {debugMode ? 'Exit Debug Mode' : 'Debug Mode'}
          </button>
        )}
      </div>

      {userIsAdmin && debugMode ? (
        <div
          className="mb-8"
        >
          <div className="bg-purple-50 rounded-xl p-6 border border-purple-200 mb-6">
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <AlertTriangle size={24} className="text-purple-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  OCR Debug Mode Active
                </h3>
                <p className="text-gray-600 mb-3">
                  You're now in debug mode, which allows you to test OCR processing and diagnose issues with receipt scanning.
                  This mode shows raw OCR output and detailed error information.
                </p>
                <div className="flex flex-wrap gap-2">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                    <Info size={12} className="mr-1" />
                    Admin Only Feature
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          <ReceiptScannerDebug onClose={() => setDebugMode(false)} />
        </div>
      ) : (
        <>
          <div
            className="mb-8"
          >
            <div className="bg-gradient-to-r from-primary-50 to-secondary-50 rounded-xl p-6 border border-primary-100">
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
                  <Camera size={24} className="text-primary-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    OCR-Powered Receipt Processing
                  </h3>
                  <p className="text-gray-600 mb-3">
                    Take a photo of any receipt and let our OCR.space integration automatically extract the vendor, date, amount, 
                    and categorize the purchase. Perfect for quick expense tracking on the go!
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-700">
                      <Camera size={12} className="mr-1" />
                      Photo Capture
                    </span>
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-secondary-100 text-secondary-700">
                      <FileImage size={12} className="mr-1" />
                      OCR.space API
                    </span>
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-accent-100 text-accent-700">
                      <Brain size={12} className="mr-1" />
                      Smart Parsing
                    </span>
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-success-100 text-success-700">
                      <Zap size={12} className="mr-1" />
                      Auto Transactions
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div
          >
            <ReceiptScanner 
              onReceiptProcessed={handleReceiptProcessed}
              onClose={() => navigate('/upload')}
            />
          </div>

          {/* Tips Section */}
          <div
            className="mt-8 card"
          >
            <h3 className="text-lg font-semibold mb-4">📋 Tips for Best OCR Results</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <h4 className="font-medium text-gray-900">📷 Photo Quality</h4>
                <ul className="space-y-1 text-gray-600">
                  <li>• Ensure good lighting</li>
                  <li>• Keep receipt flat and straight</li>
                  <li>• Include the entire receipt</li>
                  <li>• Avoid shadows and glare</li>
                  <li>• Use high contrast backgrounds</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium text-gray-900">🎯 Supported Receipts</h4>
                <ul className="space-y-1 text-gray-600">
                  <li>• Grocery stores</li>
                  <li>• Restaurants and cafes</li>
                  <li>• Gas stations</li>
                  <li>• Retail purchases</li>
                  <li>• Service providers</li>
                </ul>
              </div>
            </div>
            
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <div className="flex items-start space-x-2">
                <FileImage size={16} className="text-blue-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-900">Powered by OCR.space</p>
                  <p className="text-xs text-blue-700">
                    Using OCR.space's free API for reliable text extraction. 
                    Get your own API key at <a href="https://ocr.space/ocrapi" target="_blank" rel="noopener noreferrer" className="underline">ocr.space/ocrapi</a>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ReceiptScannerPage;
