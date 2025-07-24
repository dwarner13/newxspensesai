import { useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, Upload, Clipboard, Check, RefreshCw, Brain, Zap, Target } from 'lucide-react';
import SmartReceiptCategorizer from '../components/receipts/SmartReceiptCategorizer';

const ReceiptSmartCategorizerDemo = () => {
  const [receiptText, setReceiptText] = useState('');
  const [categorizationResult, setCategorizationResult] = useState<{
    vendor: string;
    amount: number;
    category: string;
    goal_alert?: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  
  // Sample user memory for demo purposes
  const [userMemory, setUserMemory] = useState([
    {
      vendor_name: "Starbucks",
      actual_category: "Dining"
    },
    {
      vendor_name: "Shell",
      actual_category: "Fuel"
    },
    {
      vendor_name: "Walmart",
      actual_category: "Groceries"
    }
  ]);
  
  // Sample user goals for demo purposes
  const [userGoals, setUserGoals] = useState([
    {
      category_tracked: "Dining",
      target_amount: 300,
      current_total: 250
    },
    {
      category_tracked: "Fuel",
      target_amount: 200,
      current_total: 190
    }
  ]);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setReceiptText(e.target.value);
  };

  const handleCategorized = (result: {
    vendor: string;
    amount: number;
    category: string;
    goal_alert?: string;
  }) => {
    setCategorizationResult(result);
    
    // Update user memory for demo purposes
    if (!userMemory.some(m => m.vendor_name.toLowerCase() === result.vendor.toLowerCase())) {
      setUserMemory([...userMemory, {
        vendor_name: result.vendor,
        actual_category: result.category
      }]);
    }
    
    // Update user goals for demo purposes
    setUserGoals(userGoals.map(goal => {
      if (goal.category_tracked === result.category) {
        return {
          ...goal,
          current_total: goal.current_total + result.amount
        };
      }
      return goal;
    }));
  };

  const handleReset = () => {
    setReceiptText('');
    setCategorizationResult(null);
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
    if (categorizationResult) {
      const text = `Vendor: ${categorizationResult.vendor}
Amount: $${categorizationResult.amount.toFixed(2)}
Category: ${categorizationResult.category}${categorizationResult.goal_alert ? '\nAlert: ' + categorizationResult.goal_alert : ''}`;
      
      navigator.clipboard.writeText(text);
      setCopied(true);
      
      setTimeout(() => {
        setCopied(false);
      }, 2000);
    }
  };

  return (
    <div className="max-w-4xl  py-8 px-4">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-center space-x-3 mb-2">
          <Brain size={32} className="text-primary-600" />
          <h1 className="text-3xl font-bold">Smart Receipt Categorizer</h1>
        </div>
        <p className="text-gray-600">
          Enter receipt text below to extract vendor, amount, and category with personalized insights.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
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
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <SmartReceiptCategorizer
            receiptText={receiptText}
            userMemory={userMemory}
            userGoals={userGoals}
            onCategorized={handleCategorized}
            className="h-full"
          />
        </motion.div>
      </div>

      {categorizationResult && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-8 p-6 rounded-lg bg-green-50 border border-green-200"
        >
          <div className="flex items-start">
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mr-4">
              <Check size={24} className="text-green-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-medium mb-2">
                Smart Categorization Results
              </h3>
              <p className="text-gray-700 mb-4">
                Here's what we extracted from your receipt with personalized insights:
              </p>
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <div className="text-sm text-gray-600 mb-1">Vendor:</div>
                    <div className="font-medium text-gray-900 p-2 bg-gray-50 rounded border border-gray-200">
                      {categorizationResult.vendor}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600 mb-1">Amount:</div>
                    <div className="font-medium text-gray-900 p-2 bg-gray-50 rounded border border-gray-200">
                      ${categorizationResult.amount.toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600 mb-1">Category:</div>
                    <div className="font-medium text-gray-900 p-2 bg-gray-50 rounded border border-gray-200">
                      {categorizationResult.category}
                    </div>
                  </div>
                </div>
                
                {categorizationResult.goal_alert && (
                  <div className="mt-4 bg-blue-50 p-3 rounded-lg border border-blue-200 flex items-center">
                    <Zap size={18} className="text-blue-500 mr-2 flex-shrink-0" />
                    <span className="text-blue-700">{categorizationResult.goal_alert}</span>
                  </div>
                )}
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
                      Copy Results
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="mt-8 bg-gray-50 rounded-lg p-6 border border-gray-200"
      >
        <h3 className="text-lg font-medium mb-4">How Smart Categorization Works</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center mb-3">
              <Brain size={20} className="text-primary-600" />
            </div>
            <h4 className="font-medium mb-2">Learning System</h4>
            <p className="text-sm text-gray-600">
              Our system remembers how you've categorized vendors before and applies that knowledge to new receipts.
            </p>
          </div>
          
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center mb-3">
              <Target size={20} className="text-primary-600" />
            </div>
            <h4 className="font-medium mb-2">Goal Tracking</h4>
            <p className="text-sm text-gray-600">
              The system knows your financial goals and alerts you when a purchase brings you close to or over your limits.
            </p>
          </div>
          
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center mb-3">
              <Zap size={20} className="text-primary-600" />
            </div>
            <h4 className="font-medium mb-2">Personalized Insights</h4>
            <p className="text-sm text-gray-600">
              Get personalized suggestions and alerts based on your spending patterns and financial goals.
            </p>
          </div>
        </div>
      </motion.div>
      
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-8 bg-blue-50 rounded-lg p-6 border border-blue-200"
      >
        <div className="flex items-start">
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mr-4">
            <Brain size={24} className="text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-medium mb-2">Demo Information</h3>
            <p className="text-blue-700 mb-4">
              This demo includes simulated user memory and goals to demonstrate the smart categorization features:
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="bg-white p-3 rounded-lg border border-blue-200">
                <h4 className="font-medium text-blue-800 mb-2">Remembered Vendors</h4>
                <ul className="text-sm space-y-1">
                  {userMemory.map((memory, index) => (
                    <li key={index} className="flex justify-between">
                      <span>{memory.vendor_name}</span>
                      <span className="font-medium">{memory.actual_category}</span>
                    </li>
                  ))}
                </ul>
              </div>
              
              <div className="bg-white p-3 rounded-lg border border-blue-200">
                <h4 className="font-medium text-blue-800 mb-2">Active Goals</h4>
                <ul className="text-sm space-y-1">
                  {userGoals.map((goal, index) => (
                    <li key={index}>
                      <div className="flex justify-between mb-1">
                        <span>{goal.category_tracked}</span>
                        <span className="font-medium">${goal.current_total} / ${goal.target_amount}</span>
                      </div>
                      <div className="w-full h-2 bg-blue-100 rounded-full">
                        <div 
                          className="h-2 bg-blue-500 rounded-full" 
                          style={{ width: `${Math.min(100, (goal.current_total / goal.target_amount) * 100)}%` }}
                        ></div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            
            <p className="text-sm text-blue-700">
              Try uploading receipts from vendors in the memory list or that would affect the goals to see how the system personalizes its responses!
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default ReceiptSmartCategorizerDemo;
