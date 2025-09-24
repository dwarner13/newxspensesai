import React, { useState } from 'react';
import { motion } from 'framer-motion';
import MobilePageTitle from '../../components/ui/MobilePageTitle';
import AIEmployeeChatbot from '../../components/ai/AIEmployeeChatbot';
import { 
  Bot, 
  Zap, 
  TrendingUp, 
  Search,
  X,
  Download,
  FileText,
  Table,
  FileSpreadsheet
} from 'lucide-react';
// import { universalAIEmployeeManager } from '../../lib/universalAIEmployeeConnection';

const AICategorizationPage: React.FC = () => {
  console.log('AICategorizationPage loading...');
  const [categoryOverviewOpen, setCategoryOverviewOpen] = useState(false);
  const [quickCategorizeOpen, setQuickCategorizeOpen] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [chatOpen, setChatOpen] = useState(false);
  const [autoCategoryOpen, setAutoCategoryOpen] = useState(false);
  const [categoryManagementOpen, setCategoryManagementOpen] = useState(false);
  const [transactionsViewOpen, setTransactionsViewOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [rulesOpen, setRulesOpen] = useState(false);
  const [generatedRules, setGeneratedRules] = useState<any[]>([]);
  const [processOverviewOpen, setProcessOverviewOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState('');
  const [chatMessages, setChatMessages] = useState<Array<{
    id: number;
    type: 'user' | 'ai';
  content: string;
  timestamp: string;
    isLoading?: boolean;
  }>>([
    {
      id: 1,
      type: 'ai',
      content: '👋 Hello! I\'m Tag AI, your smart categorization assistant. I can help you view categories, create rules, analyze spending, export data, and process documents. What would you like to do?',
      timestamp: new Date().toLocaleTimeString(),
      isLoading: false
    }
  ]);

  // Simple test to see if component renders
  if (typeof window !== 'undefined') {
    console.log('AICategorizationPage rendering in browser...');
  }

  // Sample transaction data
  const sampleTransactions = {
    'Food & Dining': [
      { id: 1, merchant: 'Starbucks', amount: 4.50, date: '2024-01-15', description: 'Coffee' },
      { id: 2, merchant: 'McDonald\'s', amount: 12.30, date: '2024-01-14', description: 'Lunch' },
      { id: 3, merchant: 'Whole Foods', amount: 89.45, date: '2024-01-13', description: 'Groceries' },
      { id: 4, merchant: 'Pizza Hut', amount: 24.99, date: '2024-01-12', description: 'Dinner' },
      { id: 5, merchant: 'Subway', amount: 8.75, date: '2024-01-11', description: 'Sandwich' },
      { id: 6, merchant: 'Chipotle', amount: 15.20, date: '2024-01-10', description: 'Burrito Bowl' },
      { id: 7, merchant: 'Trader Joe\'s', amount: 67.80, date: '2024-01-09', description: 'Groceries' },
      { id: 8, merchant: 'Dunkin\'', amount: 6.25, date: '2024-01-08', description: 'Coffee & Donut' }
    ],
    'Transportation': [
      { id: 1, merchant: 'Uber', amount: 15.60, date: '2024-01-15', description: 'Ride to work' },
      { id: 2, merchant: 'Shell Gas Station', amount: 45.20, date: '2024-01-14', description: 'Gas' },
      { id: 3, merchant: 'Lyft', amount: 22.40, date: '2024-01-13', description: 'Airport ride' },
      { id: 4, merchant: 'Exxon', amount: 38.75, date: '2024-01-12', description: 'Gas' },
      { id: 5, merchant: 'Uber', amount: 18.90, date: '2024-01-11', description: 'Ride home' }
    ],
    'Entertainment': [
      { id: 1, merchant: 'Netflix', amount: 15.99, date: '2024-01-15', description: 'Monthly subscription' },
      { id: 2, merchant: 'AMC Theaters', amount: 24.50, date: '2024-01-14', description: 'Movie tickets' },
      { id: 3, merchant: 'Spotify', amount: 9.99, date: '2024-01-13', description: 'Premium subscription' },
      { id: 4, merchant: 'Steam', amount: 29.99, date: '2024-01-12', description: 'Game purchase' },
      { id: 5, merchant: 'Hulu', amount: 7.99, date: '2024-01-11', description: 'Monthly subscription' }
    ],
    'Uncategorized': [
      { id: 1, merchant: 'Amazon', amount: 45.99, date: '2024-01-15', description: 'Online purchase' },
      { id: 2, merchant: 'Walmart', amount: 23.45, date: '2024-01-14', description: 'Store purchase' },
      { id: 3, merchant: 'Target', amount: 67.80, date: '2024-01-13', description: 'Store purchase' }
    ]
  };

  const getCategoryTotal = (category: string) => {
    const transactions = sampleTransactions[category as keyof typeof sampleTransactions] || [];
    return transactions.reduce((sum, transaction) => sum + transaction.amount, 0);
  };

  const generateSmartRules = (category: string) => {
    const transactions = sampleTransactions[category as keyof typeof sampleTransactions] || [];
    
    // Analyze patterns and generate rules
    const rules = [];
    
    // Merchant-based rules
    const merchants = [...new Set(transactions.map(t => t.merchant.toLowerCase()))];
    merchants.forEach(merchant => {
      rules.push({
        id: `merchant_${merchant.replace(/\s+/g, '_')}`,
        type: 'merchant',
        condition: `merchant contains "${merchant}"`,
        action: `category = "${category}"`,
        confidence: 95,
        description: `Auto-categorize ${merchant} transactions as ${category}`
      });
    });
    
    // Keyword-based rules
    const keywords = {
      'Food & Dining': ['coffee', 'restaurant', 'food', 'dining', 'cafe', 'pizza', 'burger', 'lunch', 'dinner', 'breakfast'],
      'Transportation': ['gas', 'fuel', 'uber', 'lyft', 'taxi', 'ride', 'station', 'parking'],
      'Entertainment': ['netflix', 'spotify', 'movie', 'theater', 'game', 'subscription', 'streaming', 'music'],
      'Uncategorized': ['amazon', 'walmart', 'target', 'store', 'purchase', 'online']
    };
    
    const categoryKeywords = keywords[category as keyof typeof keywords] || [];
    categoryKeywords.forEach(keyword => {
      rules.push({
        id: `keyword_${keyword}`,
        type: 'keyword',
        condition: `description contains "${keyword}"`,
        action: `category = "${category}"`,
        confidence: 85,
        description: `Auto-categorize transactions with "${keyword}" as ${category}`
      });
    });
    
    // Amount-based rules
    if (category === 'Food & Dining') {
      rules.push({
        id: 'amount_small_food',
        type: 'amount',
        condition: 'amount < $15',
        action: `category = "${category}"`,
        confidence: 70,
        description: `Small amounts likely to be ${category}`
      });
    }
    
    if (category === 'Entertainment') {
      rules.push({
        id: 'amount_subscription',
        type: 'amount',
        condition: 'amount between $8-20 AND recurring',
        action: `category = "${category}"`,
        confidence: 80,
        description: `Subscription amounts likely to be ${category}`
      });
    }
    
    setGeneratedRules(rules);
    setRulesOpen(true);
    
    // Also send to Tag AI for analysis
    sendMessage(`I've generated ${rules.length} smart categorization rules for ${category}. Please review and suggest improvements.`);
  };

  const startLiveProcessing = () => {
    setIsProcessing(true);
    setCurrentStep(0);
    setProcessingStatus('Starting document processing...');
    
    const steps = [
      {
        step: 1,
        status: '📤 Uploading document...',
        duration: 2000,
        details: 'Smart Import AI (Byte) is processing your document'
      },
      {
        step: 2,
        status: '🔍 Extracting transaction data...',
        duration: 3000,
        details: 'Found 156 transactions, validating data integrity'
      },
      {
        step: 3,
        status: '🧠 Tag AI analyzing patterns...',
        duration: 4000,
        details: 'Creating smart categorization rules based on your spending patterns'
      },
      {
        step: 4,
        status: '📊 Applying categorization rules...',
        duration: 3000,
        details: 'Categorizing transactions: 142 auto-categorized, 14 need review'
      },
      {
        step: 5,
        status: '✅ Processing complete!',
        duration: 2000,
        details: '95% accuracy achieved. Ready for review and chat with Tag AI'
      }
    ];
    
    let currentStepIndex = 0;
    
    const processStep = () => {
      if (currentStepIndex < steps.length) {
        const step = steps[currentStepIndex];
        setCurrentStep(step.step);
        setProcessingStatus(step.status);
        
        setTimeout(() => {
          currentStepIndex++;
          processStep();
        }, step.duration);
      } else {
        setIsProcessing(false);
        setProcessingStatus('Processing complete! Ready for review.');
      }
    };
    
    processStep();
  };

  const sendMessage = async (message: string) => {
    console.log('Sending message to Tag AI:', message);
    
    // Add user message to chat
    const newMessage = {
      id: Date.now(),
      type: 'user' as const,
      content: message,
      timestamp: new Date().toLocaleTimeString()
    };
    setChatMessages(prev => [...prev, newMessage]);
    
    // Show loading state
    const loadingMessage = {
      id: Date.now() + 1,
      type: 'ai' as const,
      content: '🤖 Tag AI is thinking...',
      timestamp: new Date().toLocaleTimeString(),
      isLoading: true
    };
    setChatMessages(prev => [...prev, loadingMessage]);
    
    try {
      // Check if API key is available
      const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
      if (!apiKey || apiKey === 'your-api-key-here') {
        // Fallback response when API key is not configured
        const fallbackResponse = `🧠 **Tag AI Response** (Demo Mode)

I received your message: "${message}"

Since the OpenAI API key isn't configured yet, I'm running in demo mode. Here's what I would normally do:

**For categorization requests:**
- Analyze transaction patterns
- Suggest smart categories
- Create categorization rules
- Process spending data

**For analysis requests:**
- Review spending patterns
- Identify trends and insights
- Generate reports
- Provide recommendations

To enable full AI functionality, please configure your OpenAI API key in the environment variables.

What would you like to explore about your financial data?`;

        // Remove loading message and add fallback response
        setChatMessages(prev => {
          const filtered = prev.filter(msg => !msg.isLoading);
          return [...filtered, {
            id: Date.now() + 2,
            type: 'ai' as const,
            content: fallbackResponse,
            timestamp: new Date().toLocaleTimeString(),
            isLoading: false
          }];
        });
        return;
      }

      // Mock Tag AI response for now
      const response = `🧠 **Tag AI Response** (Demo Mode)

I received your message: "${message}"

Here's what I would normally do:

**For categorization requests:**
- Analyze transaction patterns
- Suggest smart categories
- Create categorization rules
- Process spending data

**For analysis requests:**
- Review spending patterns
- Identify trends and insights
- Generate reports
- Provide recommendations

What would you like to explore about your financial data?`;
      
      // Remove loading message and add AI response
      setChatMessages(prev => {
        const filtered = prev.filter(msg => !msg.isLoading);
        return [...filtered, {
          id: Date.now() + 2,
          type: 'ai' as const,
          content: response || 'I received your message but couldn\'t generate a response. Please try again.',
          timestamp: new Date().toLocaleTimeString(),
          isLoading: false
        }];
      });
      
    } catch (error) {
      console.error('Error sending message to Tag AI:', error);
      
      // Remove loading message and add error response
      setChatMessages(prev => {
        const filtered = prev.filter(msg => !msg.isLoading);
        return [...filtered, {
          id: Date.now() + 2,
          type: 'ai' as const,
          content: '❌ Sorry, I encountered an error. Please try again.',
          timestamp: new Date().toLocaleTimeString(),
          isLoading: false
        }];
      });
    }
  };

  // Export functionality
  const exportToCSV = () => {
    const categories = [
      { name: "Food & Dining", percentage: "23%", amount: "$2,847", transactions: 156 },
      { name: "Transportation", percentage: "12%", amount: "$1,456", transactions: 89 },
      { name: "Entertainment", percentage: "8%", amount: "$892", transactions: 45 },
      { name: "Shopping", percentage: "15%", amount: "$1,823", transactions: 134 },
      { name: "Utilities", percentage: "6%", amount: "$743", transactions: 23 },
      { name: "Uncategorized", percentage: "5%", amount: "$623", transactions: 23 }
    ];

    const csvContent = [
      ['Category', 'Percentage', 'Amount', 'Transactions'],
      ...categories.map(cat => [cat.name, cat.percentage, cat.amount, cat.transactions])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `smart-categories-report-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    
    showExportToast('CSV');
  };

  const exportToExcel = () => {
    // For Excel, we'll create a CSV that Excel can open
    const categories = [
      { name: "Food & Dining", percentage: "23%", amount: "$2,847", transactions: 156 },
      { name: "Transportation", percentage: "12%", amount: "$1,456", transactions: 89 },
      { name: "Entertainment", percentage: "8%", amount: "$892", transactions: 45 },
      { name: "Shopping", percentage: "15%", amount: "$1,823", transactions: 134 },
      { name: "Utilities", percentage: "6%", amount: "$743", transactions: 23 },
      { name: "Uncategorized", percentage: "5%", amount: "$623", transactions: 23 }
    ];

    const csvContent = [
      ['Category', 'Percentage', 'Amount', 'Transactions'],
      ...categories.map(cat => [cat.name, cat.percentage, cat.amount, cat.transactions])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `smart-categories-report-${new Date().toISOString().split('T')[0]}.xls`;
    link.click();
    
    showExportToast('Excel');
  };

  const exportToPDF = () => {
    // Create a simple PDF using browser's print functionality
    const printWindow = window.open('', '_blank');
    const categories = [
      { name: "Food & Dining", percentage: "23%", amount: "$2,847", transactions: 156 },
      { name: "Transportation", percentage: "12%", amount: "$1,456", transactions: 89 },
      { name: "Entertainment", percentage: "8%", amount: "$892", transactions: 45 },
      { name: "Shopping", percentage: "15%", amount: "$1,823", transactions: 134 },
      { name: "Utilities", percentage: "6%", amount: "$743", transactions: 23 },
      { name: "Uncategorized", percentage: "5%", amount: "$623", transactions: 23 }
    ];

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Smart Categories Report</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { text-align: center; margin-bottom: 30px; }
          .header h1 { color: #333; margin: 0; }
          .header p { color: #666; margin: 5px 0; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
          th { background-color: #f2f2f2; font-weight: bold; }
          .total { font-weight: bold; background-color: #f9f9f9; }
          .footer { margin-top: 30px; text-align: center; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Smart Categories Report</h1>
          <p>Generated on ${new Date().toLocaleDateString()}</p>
          <p>AI-Powered Transaction Categorization Analysis</p>
        </div>
        
        <table>
          <thead>
            <tr>
              <th>Category</th>
              <th>Percentage</th>
              <th>Amount</th>
              <th>Transactions</th>
            </tr>
          </thead>
          <tbody>
            ${categories.map(cat => `
              <tr>
                <td>${cat.name}</td>
                <td>${cat.percentage}</td>
                <td>${cat.amount}</td>
                <td>${cat.transactions}</td>
              </tr>
            `).join('')}
            <tr class="total">
              <td>Total</td>
              <td>100%</td>
              <td>$8,384</td>
              <td>472</td>
            </tr>
          </tbody>
        </table>
        
        <div class="footer">
          <p>Report generated by XspensesAI Smart Categories</p>
          <p>Accuracy: 96.2% | Categories: 12 | Total Transactions: 1,247</p>
        </div>
      </body>
      </html>
    `;

    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.print();
    }
    
    showExportToast('PDF');
  };

  const showExportToast = (format: string) => {
    const toast = document.createElement('div');
    toast.className = 'fixed top-4 right-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg z-50';
    toast.textContent = `📄 ${format} report exported successfully!`;
    document.body.appendChild(toast);
    
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 3000);
  };

  return (
    <div className="max-w-7xl mx-auto p-6 pt-4">
        {/* Page Title */}
        <MobilePageTitle 
          title="AI Categorization" 
          subtitle="Smart categorization of your transactions"
        />
        
        {/* Desktop Title */}
        <div className="hidden md:block text-center mb-8">
          <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 mb-2" style={{ WebkitBackgroundClip: 'text' }}>
            AI Categorization
          </h1>
          <p className="text-white/60 text-lg">
            Smart categorization of your transactions
          </p>
        </div>
        
        {/* Main Chat Interface */}
        <div className="flex-1 flex flex-col">
          <div className="flex-1 flex flex-col">
            {/* Chat Messages Area */}
            <div className="flex-1 overflow-y-auto p-2 space-y-2 min-h-[400px]">
              {!chatOpen ? (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center max-w-2xl">
                    <motion.h2
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                      className="text-xl font-bold text-white mb-1"
                    >
                      Welcome to Smart Categories
                    </motion.h2>
                    <motion.p
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                      className="text-white/60 text-sm mb-3"
                    >
                      AI-powered transaction categorization with 96% accuracy
                    </motion.p>
                    
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5 max-w-3xl mx-auto">
                      {[
                        { icon: TrendingUp, title: "Category Overview", desc: "Real-time spending breakdown", color: "from-green-500 to-emerald-500", view: "category_overview" },
                        { icon: Zap, title: "Quick Categorize", desc: "Bulk categorization tools", color: "from-purple-500 to-violet-500", view: "quick_categorize" },
                        { icon: Bot, title: "Tag AI Chat", desc: "Chat with Tag AI", color: "from-pink-500 to-rose-500", view: "chat" },
                        { icon: Search, title: "Category Rules", desc: "Manage categorization rules", color: "from-orange-500 to-yellow-500", view: "category_rules" },
                        { icon: Bot, title: "Auto Category", desc: "Automatic categorization", color: "from-blue-500 to-cyan-500", view: "auto_category" },
                        { icon: BarChart3, title: "Process Overview", desc: "See complete workflow", color: "from-indigo-500 to-purple-500", view: "process_overview" }
                      ].map((item, index) => (
                        <motion.button
                          key={item.title}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.5 + index * 0.1 }}
                          onClick={() => {
                            if (item.view === 'chat') {
                              setChatOpen(true);
                            } else {
                              // Handle other views
                              console.log('Opening view:', item.view);
                            }
                          }}
                          className="group flex flex-col items-center gap-2 p-3 bg-white/5 hover:bg-white/10 rounded-xl text-center transition-all duration-300 border border-white/10 hover:border-white/20 min-h-[80px] hover:shadow-lg hover:shadow-purple-500/10"
                        >
                          <div className={`w-10 h-10 bg-gradient-to-br ${item.color} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform`}>
                            <item.icon className="w-5 h-5 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-xs font-semibold text-white mb-0.5">{item.title}</h3>
                            <p className="text-white/60 text-xs leading-tight">{item.desc}</p>
                          </div>
                        </motion.button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-white">Chat with Tag AI</h2>
                    <button
                      onClick={() => setChatOpen(false)}
                      className="text-white/60 hover:text-white p-2 hover:bg-white/10 rounded-lg transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {chatMessages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-md px-3 py-2 rounded-lg ${
                            message.type === 'user'
                              ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                              : 'bg-white/10 text-white border border-white/20'
                          }`}
                        >
                          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                          <p className="text-xs opacity-70 mt-1">{message.timestamp}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            {/* Input Area */}
            <div className="px-2 pt-1 pb-0.5 border-t border-white/10 bg-gradient-to-r from-purple-500/5 to-pink-500/5">
              <div className="flex gap-1">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && chatMessage.trim() && sendMessage(chatMessage)}
                    placeholder="Ask about categorization, rules, or transaction analysis..."
                    className="w-full bg-white/5 border border-white/20 rounded-lg px-2 py-1.5 pr-10 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent transition-all text-sm"
                  />
                </div>
                <button
                  onClick={() => chatMessage.trim() && sendMessage(chatMessage)}
                  disabled={!chatMessage.trim()}
                  className="px-2 py-1.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-1.5 font-medium text-sm"
                >
                  <Bot className="w-4 h-4" />
                  <span>Send</span>
                </button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Content */}
        <div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {/* Box 1: Category Overview */}
          <motion.button
            onClick={() => setCategoryOverviewOpen(true)}
            className="group flex flex-col items-center gap-3 p-4 bg-white/5 hover:bg-white/10 rounded-xl text-center transition-all duration-300 border border-white/10 hover:border-white/20 min-h-[120px] hover:shadow-lg hover:shadow-purple-500/10"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-white mb-1">Category Overview</h3>
              <p className="text-white/60 text-xs leading-tight">Real-time spending breakdown</p>
            </div>
          </motion.button>

          {/* Box 2: Quick Categorization Panel */}
          <motion.button
            onClick={() => {
              console.log('Quick Categorize button clicked!');
              setQuickCategorizeOpen(true);
            }}
            className="group flex flex-col items-center gap-3 p-4 bg-white/5 hover:bg-white/10 rounded-xl text-center transition-all duration-300 border border-white/10 hover:border-white/20 min-h-[120px] hover:shadow-lg hover:shadow-purple-500/10"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-white mb-1">Quick Categorize</h3>
              <p className="text-white/60 text-xs leading-tight">Bulk categorization tools</p>
            </div>
          </motion.button>

          {/* Box 3: AI Chat Assistant */}
          <motion.button
            className="group flex flex-col items-center gap-3 p-4 bg-white/5 hover:bg-white/10 rounded-xl text-center transition-all duration-300 border border-white/10 hover:border-white/20 min-h-[120px] hover:shadow-lg hover:shadow-purple-500/10"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-white mb-1">Tag AI Chat</h3>
              <p className="text-white/60 text-xs leading-tight">Chat with Tag AI</p>
            </div>
          </motion.button>

          {/* Box 4: Category Rules */}
          <motion.button
            className="group flex flex-col items-center gap-3 p-4 bg-white/5 hover:bg-white/10 rounded-xl text-center transition-all duration-300 border border-white/10 hover:border-white/20 min-h-[120px] hover:shadow-lg hover:shadow-purple-500/10"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <Search className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-white mb-1">Category Rules</h3>
              <p className="text-white/60 text-xs leading-tight">Manage categorization rules</p>
            </div>
          </motion.button>

          {/* Box 5: Auto Category */}
          <motion.button
            onClick={() => setAutoCategoryOpen(true)}
            className="group flex flex-col items-center gap-3 p-4 bg-white/5 hover:bg-white/10 rounded-xl text-center transition-all duration-300 border border-white/10 hover:border-white/20 min-h-[120px] hover:shadow-lg hover:shadow-purple-500/10"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
          >
            <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-white mb-1">Auto Category</h3>
              <p className="text-white/60 text-xs leading-tight">Automatic categorization</p>
            </div>
          </motion.button>

          {/* Box 6: Process Overview */}
          <motion.button
            onClick={() => setProcessOverviewOpen(true)}
            className="group flex flex-col items-center gap-3 p-4 bg-white/5 hover:bg-white/10 rounded-xl text-center transition-all duration-300 border border-white/10 hover:border-white/20 min-h-[120px] hover:shadow-lg hover:shadow-purple-500/10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
          >
            <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-white mb-1">Process Overview</h3>
              <p className="text-white/60 text-xs leading-tight">See complete workflow</p>
            </div>
          </motion.button>

          {/* Box 7: Category Management */}
          <motion.button
            onClick={() => setCategoryManagementOpen(true)}
            className="group flex flex-col items-center gap-3 p-4 bg-white/5 hover:bg-white/10 rounded-xl text-center transition-all duration-300 border border-white/10 hover:border-white/20 min-h-[120px] hover:shadow-lg hover:shadow-purple-500/10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.7 }}
          >
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform flex-shrink-0">
              <Table className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-xs font-semibold text-white mb-0">Category Management</h3>
              <p className="text-white/60 text-xs leading-tight">View all categories & transactions</p>
            </div>
          </motion.button>
          </div>

        {/* Category Overview Modal */}
        {categoryOverviewOpen && (
          <motion.div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl border border-white/20 p-4 w-[65vw] max-w-2xl max-h-[65vh] overflow-y-auto"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">Category Overview</h2>
                    <p className="text-white/60 text-xs">Tag's comprehensive spending analysis</p>
                  </div>
                </div>
                <button
                  onClick={() => setCategoryOverviewOpen(false)}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4 text-white/60" />
                </button>
              </div>

              {/* Tag's Analysis */}
              <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/30 rounded-lg p-3 mb-4">
                <div className="flex items-start gap-2">
                  <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Bot className="w-3 h-3 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="text-blue-400 font-semibold text-xs mb-1">⚡ Tag's Analysis</div>
                    <p className="text-white/80 text-xs leading-relaxed mb-2">
                      "Food & Dining trending up 23% ($2,847). 23 uncategorized transactions need attention."
                    </p>
                    <div className="flex gap-1">
                      <button 
                        onClick={() => sendMessage("Auto-categorize all uncategorized transactions")}
                        className="bg-green-600 hover:bg-green-700 active:scale-95 text-white rounded px-2 py-1 text-xs transition-all duration-200 font-medium"
                      >
                        Auto-Categorize
                      </button>
                      <button 
                        onClick={() => sendMessage("Review uncategorized transactions together")}
                        className="bg-white/10 hover:bg-white/20 active:scale-95 text-white rounded px-2 py-1 text-xs transition-all duration-200 font-medium"
                      >
                        Review Together
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="bg-white/5 rounded-lg p-2 text-center border border-white/10">
                  <div className="text-white font-bold text-sm">12</div>
                  <div className="text-white/60 text-xs">Categories</div>
                </div>
                <div className="bg-white/5 rounded-lg p-2 text-center border border-white/10">
                  <div className="text-white font-bold text-sm">1,247</div>
                  <div className="text-white/60 text-xs">Transactions</div>
                </div>
                <div className="bg-white/5 rounded-lg p-2 text-center border border-white/10">
                  <div className="text-green-400 font-bold text-sm">96.2%</div>
                  <div className="text-white/60 text-xs">Accuracy</div>
                </div>
              </div>

              {/* Category Breakdown */}
              <div className="space-y-3 mb-6">
                <h3 className="text-white font-semibold text-sm mb-4">Spending by Category</h3>
                {[
                  { name: "Food & Dining", percentage: "23%", amount: "$2,847", transactions: "156 txns", color: "bg-green-500" },
                  { name: "Transportation", percentage: "12%", amount: "$1,456", transactions: "89 txns", color: "bg-blue-500" },
                  { name: "Entertainment", percentage: "8%", amount: "$892", transactions: "45 txns", color: "bg-purple-500" },
                  { name: "Shopping", percentage: "15%", amount: "$1,823", transactions: "134 txns", color: "bg-pink-500" },
                  { name: "Utilities", percentage: "6%", amount: "$743", transactions: "23 txns", color: "bg-yellow-500" }
                ].map((category, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors border border-white/10">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 ${category.color} rounded-full`}></div>
                      <div>
                        <div className="text-white text-sm font-medium">{category.name}</div>
                        <div className="text-white/60 text-xs">{category.percentage} • {category.transactions}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-white font-semibold text-sm">{category.amount}</div>
                      <div className="flex gap-1">
                        <button 
                          onClick={() => sendMessage(`Show details for ${category.name} category`)}
                          className="bg-blue-500/20 hover:bg-blue-500/30 active:scale-95 text-blue-400 rounded px-2 py-1 text-xs transition-all duration-200 font-medium"
                        >
                          Ask Tag
                        </button>
                        <button 
                          onClick={() => sendMessage(`View all ${category.name} transactions`)}
                          className="bg-white/10 hover:bg-white/20 active:scale-95 text-white rounded px-2 py-1 text-xs transition-all duration-200 font-medium"
                        >
                          View All
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Uncategorized Section */}
              <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg mb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-yellow-400 font-semibold text-sm">23 Uncategorized</div>
                    <div className="text-white/60 text-xs">Need attention</div>
                  </div>
                  <button 
                    onClick={() => sendMessage("Show uncategorized transactions")}
                    className="bg-yellow-500/20 hover:bg-yellow-500/30 active:scale-95 text-yellow-400 rounded-lg px-3 py-2 text-sm transition-all duration-200 font-medium"
                  >
                    Fix
                  </button>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 mt-4">
                <button 
                  onClick={() => {
                    // Show export options in a simple way
                    const choice = confirm('Choose export format:\nOK = PDF\nCancel = CSV\nOr use the dropdown for Excel');
                    if (choice === null) return; // User cancelled
                    if (choice) {
                      exportToPDF();
                    } else {
                      exportToCSV();
                    }
                  }}
                  className="flex-1 h-9 bg-gradient-to-r from-gray-500 to-gray-600 hover:opacity-90 active:scale-95 text-white rounded-lg transition-all duration-200 text-xs flex items-center justify-center gap-1 font-medium"
                >
                  <Download className="w-3 h-3" />
                  Export Report
                </button>
                
                <button 
                  onClick={() => setChatOpen(true)}
                  className="flex-1 h-9 bg-gradient-to-r from-green-500 to-emerald-500 hover:opacity-90 active:scale-95 text-white rounded-lg transition-all duration-200 text-xs font-medium"
                >
                  Create Category
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Quick Categorize Modal */}
        {quickCategorizeOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl border border-white/20 p-6 w-full max-w-4xl max-h-[80vh] overflow-y-auto">
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                    <Zap className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Quick Categorize</h2>
                    <p className="text-white/60 text-sm">Bulk categorize multiple transactions at once</p>
                  </div>
                </div>
                <button
                  onClick={() => setQuickCategorizeOpen(false)}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-white/60" />
                </button>
              </div>

              {/* Tag's Quick Analysis */}
              <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/30 rounded-lg p-4 mb-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="text-blue-400 font-semibold text-sm mb-2">⚡ Tag's Quick Analysis</div>
                    <p className="text-white/80 text-sm leading-relaxed mb-3">
                      "I found 47 uncategorized transactions that need attention! I can categorize them in bulk using smart patterns. 
                      Would you like me to auto-categorize them, or would you prefer to review them first?"
                    </p>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => sendMessage("Auto-categorize all uncategorized transactions using smart patterns")}
                        className="bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-lg px-3 py-2 text-sm transition-all duration-200"
                      >
                        Auto-Categorize All
                      </button>
                      <button 
                        onClick={() => sendMessage("Show me the uncategorized transactions to review")}
                        className="bg-white/10 hover:bg-white/20 active:scale-95 text-white rounded-lg px-3 py-2 text-sm transition-all duration-200"
                      >
                        Review First
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bulk Actions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                  <h3 className="text-white font-semibold text-sm mb-3">Smart Bulk Actions</h3>
                  <div className="space-y-2">
                    <button 
                      onClick={() => sendMessage("Categorize all transactions from the last 30 days")}
                      className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:opacity-90 text-white rounded-lg px-3 py-2 text-sm transition-opacity"
                    >
                      Last 30 Days
                    </button>
                    <button 
                      onClick={() => sendMessage("Categorize all transactions by merchant name")}
                      className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:opacity-90 text-white rounded-lg px-3 py-2 text-sm transition-opacity"
                    >
                      By Merchant
                    </button>
                    <button 
                      onClick={() => sendMessage("Categorize all transactions by amount range")}
                      className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:opacity-90 text-white rounded-lg px-3 py-2 text-sm transition-opacity"
                    >
                      By Amount
                    </button>
                  </div>
                </div>

                <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                  <h3 className="text-white font-semibold text-sm mb-3">Quick Filters</h3>
                  <div className="space-y-2">
                    <button 
                      onClick={() => sendMessage("Show only uncategorized transactions")}
                      className="w-full bg-white/10 hover:bg-white/20 text-white rounded-lg px-3 py-2 text-sm transition-colors"
                    >
                      Uncategorized Only
                    </button>
                    <button 
                      onClick={() => sendMessage("Show transactions from this month")}
                      className="w-full bg-white/10 hover:bg-white/20 text-white rounded-lg px-3 py-2 text-sm transition-colors"
                    >
                      This Month
                    </button>
                    <button 
                      onClick={() => sendMessage("Show transactions over $100")}
                      className="w-full bg-white/10 hover:bg-white/20 text-white rounded-lg px-3 py-2 text-sm transition-colors"
                    >
                      Over $100
                    </button>
                  </div>
                </div>
              </div>

              {/* Transaction List Preview */}
              <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                <h3 className="text-white font-semibold text-sm mb-3">Recent Uncategorized Transactions</h3>
                <div className="space-y-2">
                  {[
                    { merchant: "AMAZON.COM", amount: "$47.99", date: "Dec 15", suggested: "Shopping" },
                    { merchant: "STARBUCKS", amount: "$5.67", date: "Dec 14", suggested: "Food & Dining" },
                    { merchant: "SHELL", amount: "$32.45", date: "Dec 14", suggested: "Transportation" },
                    { merchant: "NETFLIX", amount: "$15.99", date: "Dec 13", suggested: "Entertainment" },
                    { merchant: "WALMART", amount: "$89.23", date: "Dec 13", suggested: "Shopping" }
                  ].map((transaction, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                        <div>
                          <div className="text-white text-sm font-medium">{transaction.merchant}</div>
                          <div className="text-white/60 text-xs">{transaction.date}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-white font-semibold text-sm">{transaction.amount}</div>
                        <button 
                          onClick={() => sendMessage(`Categorize ${transaction.merchant} as ${transaction.suggested}`)}
                          className="bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded px-2 py-1 text-xs transition-colors"
                        >
                          {transaction.suggested}
                        </button>
                      </div>
                </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 mt-6">
                <div className="flex-1 relative group">
                  <button 
                    className="w-full bg-gradient-to-r from-gray-500 to-gray-600 hover:opacity-90 text-white rounded-lg px-4 py-3 transition-opacity text-sm flex items-center justify-center gap-2 font-medium"
                  >
                    <Download className="w-4 h-4" />
                    Export List
                  </button>
                  
                  {/* Export Options Dropdown */}
                  <div className="absolute bottom-full left-0 mb-2 w-full bg-slate-800 border border-white/20 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
                    <div className="p-2 space-y-1">
                      <button 
                        onClick={exportToPDF}
                        className="w-full flex items-center gap-2 px-3 py-2 text-white hover:bg-white/10 rounded text-sm transition-colors"
                      >
                        <FileText className="w-4 h-4" />
                        Export as PDF
                      </button>
                      <button 
                        onClick={exportToCSV}
                        className="w-full flex items-center gap-2 px-3 py-2 text-white hover:bg-white/10 rounded text-sm transition-colors"
                      >
                        <Table className="w-4 h-4" />
                        Export as CSV
                      </button>
                      <button 
                        onClick={exportToExcel}
                        className="w-full flex items-center gap-2 px-3 py-2 text-white hover:bg-white/10 rounded text-sm transition-colors"
                      >
                        <FileSpreadsheet className="w-4 h-4" />
                        Export as Excel
                      </button>
                    </div>
                  </div>
                </div>
                
                <button 
                  onClick={() => sendMessage("Create custom categorization rules")}
                  className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:opacity-90 text-white rounded-lg px-4 py-3 transition-opacity text-sm font-medium"
                >
                  Create Rules
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tag AI Chat Interface */}
        {chatOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-slate-800 rounded-lg p-6 w-full max-w-4xl mx-4 max-h-[90vh] flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-xl font-semibold text-white">🧠 Smart Tag AI</h3>
                  <p className="text-sm text-gray-400">Your central hub for all categorization actions</p>
                </div>
                <button 
                  onClick={() => setChatOpen(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="flex-1 bg-slate-700 rounded-lg p-4 mb-4 overflow-y-auto">
                <div className="space-y-4">
                  {chatMessages.map((message) => (
                    <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`rounded-lg p-3 max-w-[80%] ${
                        message.type === 'user' 
                          ? 'bg-blue-500 text-white' 
                          : message.isLoading 
                            ? 'bg-slate-600 text-gray-300 animate-pulse' 
                            : 'bg-slate-600 text-white'
                      }`}>
                        <p className="text-sm whitespace-pre-line">{message.content}</p>
                        <p className="text-xs opacity-70 mt-1">{message.timestamp}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => sendMessage("Show me all my categories")}
                    className="bg-slate-600 hover:bg-slate-500 text-white text-xs px-3 py-2 rounded transition-colors"
                  >
                    View Categories
                  </button>
                  <button
                    onClick={() => sendMessage("Create smart categorization rules")}
                    className="bg-slate-600 hover:bg-slate-500 text-white text-xs px-3 py-2 rounded transition-colors"
                  >
                    Create Rules
                  </button>
                  <button
                    onClick={() => sendMessage("Analyze my spending patterns")}
                    className="bg-slate-600 hover:bg-slate-500 text-white text-xs px-3 py-2 rounded transition-colors"
                  >
                    Analyze Spending
                  </button>
                  <button
                    onClick={() => sendMessage("Export my data")}
                    className="bg-slate-600 hover:bg-slate-500 text-white text-xs px-3 py-2 rounded transition-colors"
                  >
                    Export Data
                  </button>
                  <button
                    onClick={() => sendMessage("Process new document")}
                    className="bg-slate-600 hover:bg-slate-500 text-white text-xs px-3 py-2 rounded transition-colors"
                  >
                    Upload Document
                  </button>
                  <button
                    onClick={() => sendMessage("Show uncategorized transactions")}
                    className="bg-slate-600 hover:bg-slate-500 text-white text-xs px-3 py-2 rounded transition-colors"
                  >
                    View Uncategorized
                  </button>
                </div>
                
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    placeholder="Ask Tag AI anything about your categories..."
                    className="flex-1 bg-slate-700 text-white rounded-lg px-4 py-3 border border-slate-600 focus:border-blue-500 focus:outline-none"
                    onKeyPress={(e) => e.key === 'Enter' && sendMessage(chatMessage)}
                  />
                  <button
                    onClick={() => {
                      if (chatMessage.trim()) {
                        sendMessage(chatMessage);
                        setChatMessage('');
                      }
                    }}
                    className="bg-gradient-to-r from-purple-500 to-pink-500 hover:opacity-90 text-white rounded-lg px-6 py-3 transition-opacity font-medium"
                  >
                    Send
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Auto Category Modal */}
        {autoCategoryOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-slate-800 rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-semibold text-white">🤖 Auto Category with Tag AI</h3>
                  <p className="text-sm text-gray-400">Let Tag AI automatically categorize your transactions</p>
                </div>
                <button 
                  onClick={() => setAutoCategoryOpen(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="space-y-6">
                {/* Auto Category Options */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  <div className="bg-slate-700 rounded-lg p-3 min-h-[140px] flex flex-col">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg flex items-center justify-center">
                        <Zap className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-white text-sm">Smart Auto-Categorize</h4>
                        <p className="text-xs text-gray-400">AI learns your patterns</p>
                      </div>
                    </div>
                    <p className="text-xs text-gray-300 mb-3 flex-grow">Tag AI analyzes your transaction history and automatically categorizes new transactions based on merchant names, amounts, and patterns.</p>
                    <button
                      onClick={() => {
                        sendMessage("Please auto-categorize all my uncategorized transactions using smart pattern recognition");
                        setAutoCategoryOpen(false);
                      }}
                      className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:opacity-90 text-white rounded-lg px-3 py-2 transition-opacity text-xs font-medium"
                    >
                      Start Auto-Categorization
                    </button>
                  </div>

                  <div className="bg-slate-700 rounded-lg p-3 min-h-[140px] flex flex-col">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
                        <Search className="w-4 h-4 text-white" />
                      </div>
            <div>
                        <h4 className="font-semibold text-white text-sm">Pattern Analysis</h4>
                        <p className="text-xs text-gray-400">Discover spending patterns</p>
            </div>
            </div>
                    <p className="text-xs text-gray-300 mb-3 flex-grow">Analyze your spending patterns and get suggestions for new categories and rules based on your transaction history.</p>
                    <button
                      onClick={() => {
                        sendMessage("Analyze my spending patterns and suggest new categories and categorization rules");
                        setAutoCategoryOpen(false);
                      }}
                      className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:opacity-90 text-white rounded-lg px-3 py-2 transition-opacity text-xs font-medium"
                    >
                      Analyze Patterns
                    </button>
          </div>

                  <div className="bg-slate-700 rounded-lg p-3 min-h-[140px] flex flex-col">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                        <Bot className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-white text-sm">Rule Creation</h4>
                        <p className="text-xs text-gray-400">Create smart rules</p>
                      </div>
                    </div>
                    <p className="text-xs text-gray-300 mb-3 flex-grow">Let Tag AI create intelligent categorization rules that will automatically categorize future transactions.</p>
                    <button
                      onClick={() => {
                        sendMessage("Create smart categorization rules for my most common merchants and transaction types");
                        setAutoCategoryOpen(false);
                      }}
                      className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:opacity-90 text-white rounded-lg px-3 py-2 transition-opacity text-xs font-medium"
                    >
                      Create Rules
                    </button>
              </div>

                  <div className="bg-slate-700 rounded-lg p-3 min-h-[140px] flex flex-col">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg flex items-center justify-center">
                        <TrendingUp className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-white text-sm">Bulk Processing</h4>
                        <p className="text-xs text-gray-400">Process many transactions</p>
                      </div>
                    </div>
                    <p className="text-xs text-gray-300 mb-3 flex-grow">Process large batches of transactions at once using Tag AI's intelligent categorization engine.</p>
                    <button
                      onClick={() => {
                        sendMessage("Help me bulk categorize all my transactions from the last 30 days");
                        setAutoCategoryOpen(false);
                      }}
                      className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:opacity-90 text-white rounded-lg px-3 py-2 transition-opacity text-xs font-medium"
                    >
                      Bulk Process
                    </button>
                </div>
                </div>

                {/* Quick Actions */}
                <div className="bg-slate-700 rounded-lg p-3">
                  <h4 className="font-semibold text-white mb-2 text-sm">Quick Actions</h4>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => {
                        sendMessage("Show me all uncategorized transactions and suggest categories for them");
                        setAutoCategoryOpen(false);
                      }}
                      className="bg-slate-600 hover:bg-slate-500 text-white text-sm px-3 py-2 rounded transition-colors"
                    >
                      Find Uncategorized
                    </button>
                    <button
                      onClick={() => {
                        sendMessage("Review my current categories and suggest improvements or new ones");
                        setAutoCategoryOpen(false);
                      }}
                      className="bg-slate-600 hover:bg-slate-500 text-white text-sm px-3 py-2 rounded transition-colors"
                    >
                      Review Categories
                    </button>
                    <button
                      onClick={() => {
                        sendMessage("Create a rule to automatically categorize transactions from [merchant name] as [category name]");
                        setAutoCategoryOpen(false);
                      }}
                      className="bg-slate-600 hover:bg-slate-500 text-white text-sm px-3 py-2 rounded transition-colors"
                    >
                      Create Custom Rule
                    </button>
                    <button
                      onClick={() => {
                        sendMessage("Help me optimize my expense categories for better budgeting and tax purposes");
                        setAutoCategoryOpen(false);
                      }}
                      className="bg-slate-600 hover:bg-slate-500 text-white text-sm px-3 py-2 rounded transition-colors"
                    >
                      Optimize Categories
                    </button>
                </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Category Management Modal */}
        {categoryManagementOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-slate-800 rounded-lg p-6 w-full max-w-6xl mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-semibold text-white">📊 Category Management</h3>
                  <p className="text-sm text-gray-400">View all categories, transactions, and manage with Tag AI</p>
                </div>
                <button 
                  onClick={() => setCategoryManagementOpen(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Categories List */}
          <div className="lg:col-span-2">
                  <h4 className="text-lg font-semibold text-white mb-4">All Categories</h4>
                  <div className="space-y-3">
                    {/* Sample Categories */}
                    <div className="bg-slate-700 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                          <h5 className="font-semibold text-white">Food & Dining</h5>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-300">$2,847</p>
                          <p className="text-xs text-gray-400">156 transactions</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setSelectedCategory('Food & Dining');
                            setTransactionsViewOpen(true);
                          }}
                          className="bg-blue-500 hover:bg-blue-600 text-white text-xs px-3 py-1 rounded transition-colors"
                        >
                          View Transactions
                        </button>
                        <button
                          onClick={() => {
                            generateSmartRules('Food & Dining');
                            setCategoryManagementOpen(false);
                          }}
                          className="bg-purple-500 hover:bg-purple-600 text-white text-xs px-3 py-1 rounded transition-colors"
                        >
                          Create Rules
                        </button>
                      </div>
                    </div>

                    <div className="bg-slate-700 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                          <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                          <h5 className="font-semibold text-white">Transportation</h5>
                  </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-300">$1,456</p>
                          <p className="text-xs text-gray-400">89 transactions</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setSelectedCategory('Transportation');
                            setTransactionsViewOpen(true);
                          }}
                          className="bg-blue-500 hover:bg-blue-600 text-white text-xs px-3 py-1 rounded transition-colors"
                        >
                          View Transactions
                        </button>
                        <button
                          onClick={() => {
                            generateSmartRules('Transportation');
                            setCategoryManagementOpen(false);
                          }}
                          className="bg-purple-500 hover:bg-purple-600 text-white text-xs px-3 py-1 rounded transition-colors"
                        >
                          Create Rules
                        </button>
                </div>
              </div>

                    <div className="bg-slate-700 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                          <h5 className="font-semibold text-white">Entertainment</h5>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-300">$892</p>
                          <p className="text-xs text-gray-400">45 transactions</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setSelectedCategory('Entertainment');
                            setTransactionsViewOpen(true);
                          }}
                          className="bg-blue-500 hover:bg-blue-600 text-white text-xs px-3 py-1 rounded transition-colors"
                        >
                          View Transactions
                        </button>
                        <button
                          onClick={() => {
                            generateSmartRules('Entertainment');
                            setCategoryManagementOpen(false);
                          }}
                          className="bg-purple-500 hover:bg-purple-600 text-white text-xs px-3 py-1 rounded transition-colors"
                        >
                          Create Rules
                        </button>
                      </div>
                    </div>

                    <div className="bg-slate-700 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                          <h5 className="font-semibold text-white">Uncategorized</h5>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-300">$623</p>
                          <p className="text-xs text-gray-400">23 transactions</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setSelectedCategory('Uncategorized');
                            setTransactionsViewOpen(true);
                          }}
                          className="bg-red-500 hover:bg-red-600 text-white text-xs px-3 py-1 rounded transition-colors"
                        >
                          View Transactions
                        </button>
                        <button
                          onClick={() => {
                            generateSmartRules('Uncategorized');
                            setCategoryManagementOpen(false);
                          }}
                          className="bg-purple-500 hover:bg-purple-600 text-white text-xs px-3 py-1 rounded transition-colors"
                        >
                          Create Rules
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tag AI Chat Panel */}
                <div className="lg:col-span-1">
                  <h4 className="text-lg font-semibold text-white mb-4">💬 Chat with Tag AI</h4>
                  <div className="bg-slate-700 rounded-lg p-4 h-full">
                    <div className="space-y-4">
                      <div className="bg-slate-600 rounded-lg p-3 text-sm text-gray-300">
                        <p className="font-semibold mb-2">🧠 Tag AI can help with:</p>
                        <ul className="space-y-1 text-xs">
                          <li>• Analyzing spending patterns</li>
                          <li>• Suggesting new categories</li>
                          <li>• Creating categorization rules</li>
                          <li>• Optimizing existing categories</li>
                          <li>• Finding uncategorized transactions</li>
                        </ul>
              </div>

                      <div className="space-y-2">
                  <input
                    type="text"
                          value={chatMessage}
                          onChange={(e) => setChatMessage(e.target.value)}
                          placeholder="Ask Tag AI about your categories..."
                          className="w-full bg-slate-600 text-white rounded-lg px-3 py-2 border border-slate-500 focus:border-purple-500 focus:outline-none text-sm"
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              sendMessage(chatMessage);
                              setChatMessage('');
                            }
                          }}
                  />
                  <button
                          onClick={() => {
                            sendMessage(chatMessage);
                            setChatMessage('');
                          }}
                          className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:opacity-90 text-white rounded-lg px-3 py-2 transition-opacity text-sm"
                        >
                          Send to Tag AI
                  </button>
                </div>

                      <div className="space-y-2">
                        <p className="text-xs text-gray-400">Quick Actions:</p>
                        <button
                          onClick={() => {
                            sendMessage("Give me a complete overview of all my spending categories and suggest improvements");
                            setCategoryManagementOpen(false);
                          }}
                          className="w-full bg-slate-600 hover:bg-slate-500 text-white text-xs px-3 py-2 rounded transition-colors"
                        >
                          Category Overview
                        </button>
                        <button
                          onClick={() => {
                            sendMessage("Help me create smart rules to automatically categorize future transactions");
                            setCategoryManagementOpen(false);
                          }}
                          className="w-full bg-slate-600 hover:bg-slate-500 text-white text-xs px-3 py-2 rounded transition-colors"
                        >
                          Create Rules
                        </button>
                        <button
                          onClick={() => {
                            sendMessage("Find all transactions that might be miscategorized and suggest corrections");
                            setCategoryManagementOpen(false);
                          }}
                          className="w-full bg-slate-600 hover:bg-slate-500 text-white text-xs px-3 py-2 rounded transition-colors"
                        >
                          Find Errors
                        </button>
              </div>
          </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Live Process Overview Modal */}
        {processOverviewOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-slate-800 rounded-lg p-6 w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-2xl font-semibold text-white">🔄 Live Processing Workflow</h3>
                  <p className="text-sm text-gray-400">Watch the complete process from upload to categorization in real-time</p>
                </div>
                <button 
                  onClick={() => setProcessOverviewOpen(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
          <div className="space-y-6">
                {/* Live Processing Status */}
                <div className="bg-slate-700 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-xl font-semibold text-white">Live Processing Status</h4>
                    {!isProcessing && (
                      <button
                        onClick={startLiveProcessing}
                        className="bg-gradient-to-r from-green-500 to-emerald-500 hover:opacity-90 text-white rounded-lg px-4 py-2 transition-opacity font-medium"
                      >
                        Start Live Demo
                      </button>
                    )}
                  </div>
                  
                  {isProcessing ? (
                    <div className="space-y-4">
                      {/* Progress Bar */}
                      <div className="w-full bg-slate-600 rounded-full h-3">
                        <div 
                          className="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full transition-all duration-1000"
                          style={{ width: `${(currentStep / 5) * 100}%` }}
                        ></div>
                      </div>
                      
                      {/* Current Status */}
                      <div className="text-center">
                        <div className="text-2xl font-bold text-white mb-2">{processingStatus}</div>
                        <div className="text-sm text-gray-300">Step {currentStep} of 5</div>
                      </div>
                      
                      {/* Live Activity Feed */}
                      <div className="bg-slate-600 rounded-lg p-4">
                        <h5 className="text-white font-medium mb-3">Live Activity Feed</h5>
                        <div className="space-y-2 text-sm">
                          {currentStep >= 1 && (
                            <div className="flex items-center gap-2 text-green-400">
                              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                              <span>Smart Import AI (Byte) processing document...</span>
                            </div>
                          )}
                          {currentStep >= 2 && (
                            <div className="flex items-center gap-2 text-green-400">
                              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                              <span>Extracted 156 transactions, validating data...</span>
                            </div>
                          )}
                          {currentStep >= 3 && (
                            <div className="flex items-center gap-2 text-green-400">
                              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                              <span>Tag AI analyzing patterns, creating rules...</span>
                            </div>
                          )}
                          {currentStep >= 4 && (
                            <div className="flex items-center gap-2 text-green-400">
                              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                              <span>Applying categorization: 142 auto-categorized, 14 need review</span>
                            </div>
                          )}
                          {currentStep >= 5 && (
                            <div className="flex items-center gap-2 text-green-400">
                              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                              <span>Processing complete! 95% accuracy achieved</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="text-6xl mb-4">🚀</div>
                      <h5 className="text-xl font-semibold text-white mb-2">Ready to Start Live Processing</h5>
                      <p className="text-gray-300 mb-6">Click "Start Live Demo" to see the complete workflow in action</p>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-300">
                        <div className="bg-slate-600 rounded-lg p-3">
                          <div className="text-blue-400 font-medium mb-1">Step 1-2</div>
                          <div>Document Upload & Data Extraction</div>
                        </div>
                        <div className="bg-slate-600 rounded-lg p-3">
                          <div className="text-purple-400 font-medium mb-1">Step 3-4</div>
                          <div>Tag AI Analysis & Categorization</div>
                        </div>
                        <div className="bg-slate-600 rounded-lg p-3">
                          <div className="text-green-400 font-medium mb-1">Step 5</div>
                          <div>Review & Chat with Tag AI</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Real-time Results */}
                {currentStep >= 4 && (
                  <div className="bg-slate-700 rounded-lg p-6">
                    <h4 className="text-xl font-semibold text-white mb-4">Real-time Categorization Results</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h5 className="text-white font-medium mb-3">Auto-categorized Transactions</h5>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-green-400">
                            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                            <span className="text-sm">Starbucks $4.50 → Food & Dining</span>
                          </div>
                          <div className="flex items-center gap-2 text-green-400">
                            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                            <span className="text-sm">Shell Gas $45.20 → Transportation</span>
                          </div>
                          <div className="flex items-center gap-2 text-green-400">
                            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                            <span className="text-sm">Netflix $15.99 → Entertainment</span>
                          </div>
                          <div className="flex items-center gap-2 text-green-400">
                            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                            <span className="text-sm">Uber $18.90 → Transportation</span>
                          </div>
                        </div>
                      </div>
                      <div>
                        <h5 className="text-white font-medium mb-3">Needs Review</h5>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-yellow-400">
                            <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                            <span className="text-sm">Amazon $67.80 → Needs review</span>
                          </div>
                          <div className="flex items-center gap-2 text-yellow-400">
                            <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                            <span className="text-sm">Walmart $23.45 → Needs review</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-4 justify-center">
                  <button
                    onClick={() => {
                      setProcessOverviewOpen(false);
                      setCategoryManagementOpen(true);
                    }}
                    className="bg-gradient-to-r from-purple-500 to-pink-500 hover:opacity-90 text-white rounded-lg px-6 py-3 transition-opacity font-medium"
                  >
                    View Category Management
                  </button>
                  <button
                    onClick={() => {
                      setProcessOverviewOpen(false);
                      setChatOpen(true);
                    }}
                    className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:opacity-90 text-white rounded-lg px-6 py-3 transition-opacity font-medium"
                  >
                    Chat with Tag AI
                  </button>
              </div>
              </div>
            </div>
          </div>
        )}

        {/* Transactions View Modal */}
        {transactionsViewOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-slate-800 rounded-lg p-6 w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-semibold text-white">📋 {selectedCategory} Transactions</h3>
                  <p className="text-sm text-gray-400">View all transactions in this category</p>
                </div>
                <button 
                  onClick={() => setTransactionsViewOpen(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="space-y-6">
                {/* Total Summary */}
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-2xl font-bold text-white">${getCategoryTotal(selectedCategory).toFixed(2)}</h4>
                      <p className="text-blue-100">Total Spent in {selectedCategory}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-bold text-white">{sampleTransactions[selectedCategory as keyof typeof sampleTransactions]?.length || 0}</p>
                      <p className="text-blue-100">Transactions</p>
                  </div>
              </div>
                </div>

                {/* Transactions List */}
                <div className="bg-slate-700 rounded-lg p-4">
                  <h5 className="text-lg font-semibold text-white mb-4">Transaction Details</h5>
              <div className="space-y-3">
                    {sampleTransactions[selectedCategory as keyof typeof sampleTransactions]?.map((transaction) => (
                      <div key={transaction.id} className="bg-slate-600 rounded-lg p-4 flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-1">
                            <h6 className="font-semibold text-white">{transaction.merchant}</h6>
                            <span className="text-xs bg-slate-500 text-gray-200 px-2 py-1 rounded">
                              {transaction.date}
                            </span>
                </div>
                          <p className="text-sm text-gray-300">{transaction.description}</p>
                </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-white">${transaction.amount.toFixed(2)}</p>
                </div>
                </div>
                    ))}
              </div>
          </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      sendMessage(`Analyze my ${selectedCategory} spending patterns and suggest optimizations`);
                      setTransactionsViewOpen(false);
                    }}
                    className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:opacity-90 text-white rounded-lg px-4 py-3 transition-opacity font-medium"
                  >
                    Ask Tag AI to Analyze
                  </button>
                  <button
                    onClick={() => {
                      sendMessage(`Help me create better categorization rules for ${selectedCategory} transactions`);
                      setTransactionsViewOpen(false);
                    }}
                    className="flex-1 bg-gradient-to-r from-blue-500 to-cyan-500 hover:opacity-90 text-white rounded-lg px-4 py-3 transition-opacity font-medium"
                  >
                    Create Rules
                  </button>
                  <button
                    onClick={() => {
                      // Export functionality would go here
                      console.log('Export transactions for', selectedCategory);
                    }}
                    className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 hover:opacity-90 text-white rounded-lg px-4 py-3 transition-opacity font-medium"
                  >
                    Export Data
                  </button>
        </div>
              </div>
            </div>
          </div>
        )}

        </div>
    </div>
  );
};

export default AICategorizationPage;