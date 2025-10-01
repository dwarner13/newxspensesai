import { useState } from 'react';
import { FileText, Upload, Clipboard, Check, RefreshCw } from 'lucide-react';
import ReceiptInterpreter from '../components/receipts/ReceiptInterpreter';

const ReceiptInterpreterDemo = () => {
  const [receiptText, setReceiptText] = useState('');
  const [interpretationResult, setInterpretationResult] = useState<{
    vendor: string;
    amount: number;
    category: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setReceiptText(e.target.value);
  };

  const handleInterpreted = (result: {
    vendor: string;
    amount: number;
    category: string;
  }) => {
    setInterpretationResult(result);
  };

  const handleReset = () => {
    setReceiptText('');
    setInterpretationResult(null);
  };

  const handlePasteExample = () => {
    const examples = [
      `Thank you for shopping at Walmart
Transaction #57487
Date: 06/15/2025
Cashier: John
Items:
1 x Bread $3.99
2 x Milk $4.50 ea
1 x Eggs $2.99
Subtotal: $15.98
Tax: $0.84
Total: $16.82`,

      `STARBUCKS COFFEE
123 Main Street
Seattle, WA 98101
Register: 2
Cashier: Emma
06/15/2025 09:15 AM
1 Grande Latte $4.95
1 Blueberry Muffin $3.25
Subtotal: $8.20
Tax: $0.82
Total: $9.02
Thank you for your visit!`,

      `SHELL GAS STATION
1234 Highway Drive
Transaction #: 987654
Date: 06/15/2025
Pump: 3
Gallons: 12.45
Price/Gal: $3.59
Fuel Total: $44.70
Thank you for choosing Shell!`,

      `CVS PHARMACY
456 Health Avenue
Store #1234
Date: 06/15/2025
Time: 2:30 PM
Rx #: 789456
Prescription: $15.00
Vitamins: $12.99
Bandages: $4.59
Subtotal: $32.58
Tax: $1.95
Total: $34.53
Your pharmacist today was: Lisa`
    ];

    const randomExample = examples[Math.floor(Math.random() * examples.length)];
    setReceiptText(randomExample);
  };

  const handleCopyToClipboard = () => {
    if (interpretationResult) {
      const text = `Vendor: ${interpretationResult.vendor}
Amount: $${interpretationResult.amount.toFixed(2)}
Category: ${interpretationResult.category}`;
      
      navigator.clipboard.writeText(text);
      setCopied(true);
      
      setTimeout(() => {
        setCopied(false);
      }, 2000);
    }
  };

  return (
    <div className="max-w-4xl  py-8 px-4">
      <div
        className="mb-8"
      >
        <div className="flex items-center space-x-3 mb-2">
          <FileText size={32} className="text-primary-600" />
          <h1 className="text-3xl font-bold">Receipt Interpreter</h1>
        </div>
        <p className="text-gray-600">
          Enter receipt text below to extract vendor, amount, and category information.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div
          className="card"
        >
          <h2 className="text-xl font-semibold mb-6 flex items-center">
            <Upload size={20} className="mr-2 text-primary-600" />
            Receipt Text
          </h2>

          <div className="space-y-4">
            <div>
              <label htmlFor="receiptText" className="block text-sm font-medium text-gray-700 mb-1">
                Paste or type receipt text
              </label>
              <textarea
                id="receiptText"
                value={receiptText}
                onChange={handleTextChange}
                className="input font-mono text-sm"
                placeholder="Thank you for shopping at Walmart&#10;Transaction #57487&#10;Total: $56.82&#10;Items: Bread, Milk, Eggs"
                rows={12}
              />
            </div>

            <div className="flex justify-between space-x-3 pt-4">
              <button
                onClick={handlePasteExample}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors flex items-center"
              >
                <Clipboard size={16} className="mr-2" />
                Paste Example
              </button>
              
              <button
                onClick={handleReset}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors flex items-center"
              >
                <RefreshCw size={16} className="mr-2" />
                Reset
              </button>
            </div>
          </div>
        </div>

        <div
        >
          <ReceiptInterpreter
            receiptText={receiptText}
            onInterpreted={handleInterpreted}
            className="h-full"
          />
        </div>
      </div>

      {interpretationResult && (
        <div
          className="mt-8 p-6 rounded-lg bg-green-50 border border-green-200"
        >
          <div className="flex items-start">
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mr-4">
              <Check size={24} className="text-green-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-medium mb-2">
                Receipt Interpretation Results
              </h3>
              <p className="text-gray-700 mb-4">
                Here's what we extracted from your receipt:
              </p>
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <div className="text-sm text-gray-600 mb-1">Vendor:</div>
                    <div className="font-medium text-gray-900 p-2 bg-gray-50 rounded border border-gray-200">
                      {interpretationResult.vendor}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600 mb-1">Amount:</div>
                    <div className="font-medium text-gray-900 p-2 bg-gray-50 rounded border border-gray-200">
                      ${interpretationResult.amount.toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600 mb-1">Category:</div>
                    <div className="font-medium text-gray-900 p-2 bg-gray-50 rounded border border-gray-200">
                      {interpretationResult.category}
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-4 flex justify-end">
                <button
                  onClick={handleCopyToClipboard}
                  className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors flex items-center"
                >
                  {copied ? (
                    <>
                      <Check size={16} className="mr-2" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Clipboard size={16} className="mr-2" />
                      Copy Results)}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div
        className="mt-8 bg-gray-50 rounded-lg p-6 border border-gray-200"
      >
        <h3 className="text-lg font-medium mb-4">How It Works</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center mb-3">
              <FileText size={20} className="text-primary-600" />
            </div>
            <h4 className="font-medium mb-2">Text Analysis</h4>
            <p className="text-sm text-gray-600">
              Our system analyzes the raw text from your receipt using pattern recognition to identify key information.
            </p>
          </div>
          
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center mb-3">
              <Store size={20} className="text-primary-600" />
            </div>
            <h4 className="font-medium mb-2">Vendor Recognition</h4>
            <p className="text-sm text-gray-600">
              We identify the merchant name and match it against our database of known vendors for accurate categorization.
            </p>
          </div>
          
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center mb-3">
              <Tag size={20} className="text-primary-600" />
            </div>
            <h4 className="font-medium mb-2">Smart Categorization</h4>
            <p className="text-sm text-gray-600">
              Based on the vendor and receipt contents, we suggest the most appropriate expense category for your records.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReceiptInterpreterDemo;
