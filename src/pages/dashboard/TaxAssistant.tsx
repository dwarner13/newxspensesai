import React, { useState, useRef, useEffect } from 'react';
import { 
  Upload, FileText, Calculator, Download, AlertTriangle, 
  CheckCircle, Clock, Receipt,
  TrendingUp, Send, Bot, FileSpreadsheet, HelpCircle,
  ExternalLink, ChevronRight, X, BarChart3
} from 'lucide-react';
import { motion } from 'framer-motion';

import DashboardHeader from '../../components/ui/DashboardHeader';

interface TaxTask {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  priority: 'high' | 'medium' | 'low';
  dueDate?: string;
}

interface ChatMessage {
  id: string;
  type: 'user' | 'ai';
  message: string;
  timestamp: string;
}

interface UploadedFile {
  id: string;
  name: string;
  type: 'receipt' | 'invoice' | 'statement';
  uploadedAt: string;
  matched: boolean;
  category?: string;
  amount?: number;
}

interface ExpenseCategory {
  name: string;
  amount: number;
  percentage: number;
  businessUse?: number;
}

const TaxAssistant = () => {
  const [taxProgress, setTaxProgress] = useState(65);
  const [nextDeadline, setNextDeadline] = useState('March 1 (CRA)');
  const [chatMessage, setChatMessage] = useState('');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([
    {
      id: '1',
      type: 'ai',
      message: "Hello! I'm your TaxBot assistant. I can help you with tax questions, deductions, and organizing your freelancer taxes. What would you like to know?",
      timestamp: new Date().toISOString()
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Ensure page starts at the top
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Mock data - replace with real data from your app
  const taxTasks: TaxTask[] = [
    {
      id: '1',
      title: 'Upload Q4 Income Documents',
      description: 'Upload all income statements from October to December',
      completed: true,
      priority: 'high',
      dueDate: '2024-01-15'
    },
    {
      id: '2',
      title: 'Categorize Business Expenses',
      description: 'Review and categorize all business-related expenses',
      completed: true,
      priority: 'high',
      dueDate: '2024-01-20'
    },
    {
      id: '3',
      title: 'Match Receipts to Transactions',
      description: 'Link receipts to corresponding bank transactions',
      completed: false,
      priority: 'medium',
      dueDate: '2024-01-25'
    },
    {
      id: '4',
      title: 'Calculate Home Office Deduction',
      description: 'Measure workspace and calculate business use percentage',
      completed: false,
      priority: 'medium',
      dueDate: '2024-01-30'
    },
    {
      id: '5',
      title: 'Review Vehicle Expenses',
      description: 'Separate personal and business vehicle usage',
      completed: false,
      priority: 'low',
      dueDate: '2024-02-05'
    }
  ];

  const expenseCategories: ExpenseCategory[] = [
    { name: 'Office Supplies', amount: 1250, percentage: 15, businessUse: 100 },
    { name: 'Software Subscriptions', amount: 890, percentage: 11, businessUse: 100 },
    { name: 'Travel & Meals', amount: 2100, percentage: 25, businessUse: 85 },
    { name: 'Vehicle Expenses', amount: 1800, percentage: 22, businessUse: 60 },
    { name: 'Home Office', amount: 1200, percentage: 14, businessUse: 25 },
    { name: 'Professional Development', amount: 950, percentage: 11, businessUse: 100 },
    { name: 'Other', amount: 200, percentage: 2, businessUse: 50 }
  ];

  const totalIncome = 45000;
  const totalExpenses = 8190;
  const netIncome = totalIncome - totalExpenses;

  const handleSendMessage = async () => {
    if (!chatMessage.trim()) return;

    const userMessage = chatMessage;
    setChatMessage('');
    setChatHistory(prev => [...prev, { 
      id: Date.now().toString(),
      type: 'user', 
      message: userMessage,
      timestamp: new Date().toISOString()
    }]);
    setIsLoading(true);

    // Simulate AI response
    setTimeout(() => {
      const aiResponse = generateTaxResponse(userMessage);
      setChatHistory(prev => [...prev, { 
        id: (Date.now() + 1).toString(),
        type: 'ai', 
        message: aiResponse,
        timestamp: new Date().toISOString()
      }]);
      setIsLoading(false);
    }, 1000);
  };

  const generateTaxResponse = (message: string): string => {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('phone') || lowerMessage.includes('bill')) {
      return "Yes, you can deduct your phone bill if you use it for business purposes. You'll need to determine the business use percentage. For example, if you use your phone 60% for business, you can deduct 60% of your phone bill. Keep detailed records of your business vs personal usage.";
    }
    
    if (lowerMessage.includes('stripe') || lowerMessage.includes('income')) {
      return "Stripe income should be reported as business income on your T2125 (Canada) or Schedule C (US). Make sure to include all Stripe fees as business expenses. You'll need to provide your Stripe 1099-K form to your accountant.";
    }
    
    if (lowerMessage.includes('home office') || lowerMessage.includes('deduction')) {
      return "Home office deductions require a dedicated workspace used exclusively for business. You can deduct a portion of rent/mortgage, utilities, and maintenance based on the square footage percentage. Keep photos and measurements of your workspace.";
    }
    
    if (lowerMessage.includes('vehicle') || lowerMessage.includes('car')) {
      return "Vehicle expenses can be deducted based on business use percentage. You can use either the standard mileage rate or actual expenses method. Keep a detailed log of all business trips including date, destination, and purpose.";
    }
    
    if (lowerMessage.includes('deadline') || lowerMessage.includes('due')) {
      return "For 2023 taxes: CRA deadline is April 30, 2024 (or June 15 if you're self-employed). IRS deadline is April 15, 2024. Make sure to file on time to avoid penalties and interest.";
    }
    
    return "I can help you with tax deductions, income reporting, deadlines, and organizing your freelancer taxes. What specific question do you have about your tax situation?";
  };

  const handleFileUpload = (files: FileList | null) => {
    if (!files) return;
    
    const newFiles: UploadedFile[] = Array.from(files).map((file, index) => ({
      id: Date.now().toString() + index,
      name: file.name,
      type: 'receipt',
      uploadedAt: new Date().toISOString(),
      matched: false
    }));
    
    setUploadedFiles(prev => [...prev, ...newFiles]);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFileUpload(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    // Only scroll to bottom if there are chat messages and it's not the initial load
    if (chatHistory.length > 1) {
      scrollToBottom();
    }
  }, [chatHistory]);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-400';
      case 'medium': return 'text-yellow-400';
      case 'low': return 'text-green-400';
      default: return 'text-gray-400';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high': return <AlertTriangle size={16} />;
      case 'medium': return <Clock size={16} />;
      case 'low': return <CheckCircle size={16} />;
      default: return <CheckCircle size={16} />;
    }
  };

  return (
    <div className="w-full">
      <DashboardHeader />

      <div className="max-w-7xl mx-auto space-y-8 px-6">
        <div className="flex items-center gap-4 mb-8">
          <div className="text-right">
            <p className="text-white/60 text-sm">Next Deadline</p>
            <p className="text-white font-semibold">{nextDeadline}</p>
          </div>
          <button className="bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 text-white px-6 py-3 rounded-xl flex items-center gap-2 transition-all">
            <Download size={20} />
            Export Summary
          </button>
        </div>

        <div className="space-y-8">
          
          {/* Progress Bar and Next Deadline */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold text-white">Tax Preparation Progress</h3>
                <p className="text-white/60 text-sm">Track your tax preparation status</p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-white">{taxProgress}%</div>
                <div className="text-white/60 text-sm">Complete</div>
              </div>
            </div>
            
            <div className="w-full bg-white/20 rounded-full h-3 mb-4">
              <div 
                className="bg-gradient-to-r from-green-500 to-blue-600 h-3 rounded-full transition-all duration-500"
                style={{ width: `${taxProgress}%` }}
              ></div>
            </div>
            
            <div className="flex items-center justify-between text-sm">
              <span className="text-white/60">Next Deadline: {nextDeadline}</span>
              <span className="text-white/60">{taxProgress}/100 tasks completed</span>
            </div>
          </div>

          {/* AI Tax Chatbot Panel */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <Bot size={24} className="text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Ask TaxBot</h3>
                <p className="text-white/60 text-sm">Get instant answers to your tax questions</p>
              </div>
            </div>
            
            <div className="space-y-4">
              {/* Chat History */}
              <div className="max-h-64 overflow-y-auto space-y-3 bg-black/20 rounded-lg p-4">
                {chatHistory.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-xs p-3 rounded-lg ${
                      msg.type === 'user' 
                        ? 'bg-blue-500 text-white' 
                        : 'bg-white/10 text-white'
                    }`}>
                      {msg.message}
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-white/10 text-white p-3 rounded-lg">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input */}
              <div className="flex space-x-3">
                <input
                  type="text"
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Ask about deductions, deadlines, or tax rules..."
                  className="flex-1 bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-white/40 focus:outline-none focus:border-blue-400"
                  />
                <button
                  onClick={handleSendMessage}
                  disabled={!chatMessage.trim() || isLoading}
                  className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg transition-all"
                >
                  <Send size={20} />
                </button>
              </div>
              
              {/* Quick Questions */}
              <div className="flex flex-wrap gap-2">
                <button 
                  onClick={() => setChatMessage("Can I deduct my phone bill?")}
                  className="bg-white/10 hover:bg-white/20 text-white px-3 py-1 rounded-full text-sm transition-all"
                >
                  Phone bill deduction
                </button>
                <button 
                  onClick={() => setChatMessage("How do I report Stripe income?")}
                  className="bg-white/10 hover:bg-white/20 text-white px-3 py-1 rounded-full text-sm transition-all"
                >
                  Stripe income
                </button>
                <button 
                  onClick={() => setChatMessage("What's the home office deduction?")}
                  className="bg-white/10 hover:bg-white/20 text-white px-3 py-1 rounded-full text-sm transition-all"
                >
                  Home office
                </button>
                <button 
                  onClick={() => setChatMessage("When are tax deadlines?")}
                  className="bg-white/10 hover:bg-white/20 text-white px-3 py-1 rounded-full text-sm transition-all"
                >
                  Tax deadlines
                </button>
              </div>
            </div>
          </div>

          {/* Alerts / To-Do List */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">Tax Tasks</h3>
              <span className="text-white/60 text-sm">{taxTasks.filter(t => !t.completed).length} remaining</span>
            </div>
            
            <div className="space-y-3">
              {taxTasks.map((task) => (
                <motion.div
                  key={task.id}
                  className={`flex items-center justify-between p-4 rounded-lg border transition-all ${
                    task.completed 
                      ? 'bg-green-500/10 border-green-500/20' 
                      : 'bg-white/5 border-white/10'
                  }`}
                  whileHover={{ scale: 1.02 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      task.completed 
                        ? 'bg-green-500 border-green-500' 
                        : 'border-white/30'
                    }`}>
                      {task.completed && <CheckCircle size={12} className="text-white" />}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h4 className={`font-semibold ${task.completed ? 'text-white/60 line-through' : 'text-white'}`}>
                          {task.title}
                        </h4>
                        <span className={getPriorityColor(task.priority)}>
                          {getPriorityIcon(task.priority)}
                        </span>
                      </div>
                      <p className={`text-sm ${task.completed ? 'text-white/40' : 'text-white/60'}`}>
                        {task.description}
                      </p>
                      {task.dueDate && (
                        <p className="text-xs text-white/40 mt-1">
                          Due: {new Date(task.dueDate).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                  <button className="text-white/60 hover:text-white transition-colors">
                    <ChevronRight size={20} />
                  </button>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Income & Expense Summary */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Income Summary */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center">
                  <TrendingUp size={24} className="text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Income Summary</h3>
                  <p className="text-white/60 text-sm">Year-to-date earnings</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-white/60">Total Income</span>
                  <span className="text-white font-semibold">${totalIncome.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-white/60">Total Expenses</span>
                  <span className="text-white font-semibold">${totalExpenses.toLocaleString()}</span>
                </div>
                <div className="border-t border-white/20 pt-4">
                  <div className="flex justify-between items-center">
                    <span className="text-white font-semibold">Net Income</span>
                    <span className="text-green-400 font-bold text-lg">${netIncome.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Expense Categories */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                  <BarChart3 size={24} className="text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Expense Categories</h3>
                  <p className="text-white/60 text-sm">Business expense breakdown</p>
                </div>
              </div>
              
              <div className="space-y-3">
                {expenseCategories.map((category) => (
                  <div key={category.name} className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-white text-sm">{category.name}</span>
                        <span className="text-white/60 text-xs">{category.percentage}%</span>
                      </div>
                      <div className="w-full bg-white/20 rounded-full h-2">
                        <div 
                          className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full"
                          style={{ width: `${category.percentage}%` }}
                        ></div>
                      </div>
                      <div className="flex justify-between text-xs text-white/60 mt-1">
                        <span>${category.amount.toLocaleString()}</span>
                        {category.businessUse && (
                          <span>{category.businessUse}% business use</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Receipt & Document Upload Section */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-red-600 rounded-full flex items-center justify-center">
                <Upload size={24} className="text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Document Upload</h3>
                <p className="text-white/60 text-sm">Upload receipts, invoices, and statements</p>
              </div>
            </div>
            
            <div className="space-y-6">
              {/* Upload Zone */}
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-all ${
                  dragOver 
                    ? 'border-blue-400 bg-blue-500/10' 
                    : 'border-white/20 hover:border-white/40'
                }`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
              >
                <Upload size={48} className="text-white/60 mx-auto mb-4" />
                <h4 className="text-white font-semibold mb-2">Drop files here or click to browse</h4>
                <p className="text-white/60 text-sm mb-4">
                  Supports PDF, JPG, PNG. Max 10MB per file.
                </p>
                <button className="bg-white/20 hover:bg-white/30 text-white px-6 py-2 rounded-lg transition-all">
                  Browse Files
                </button>
              </div>

              {/* Uploaded Files List */}
              {uploadedFiles.length > 0 && (
                <div>
                  <h4 className="text-white font-semibold mb-4">Uploaded Files</h4>
                  <div className="space-y-2">
                    {uploadedFiles.map((file) => (
                      <div key={file.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <FileText size={20} className="text-white/60" />
                          <div>
                            <p className="text-white font-medium">{file.name}</p>
                            <p className="text-white/60 text-sm">
                              {new Date(file.uploadedAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            file.matched 
                              ? 'bg-green-500/20 text-green-400' 
                              : 'bg-yellow-500/20 text-yellow-400'
                          }`}>
                            {file.matched ? 'Matched' : 'Unmatched'}
                          </span>
                          <button className="text-white/60 hover:text-white transition-colors">
                            <X size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Export Section */}
          <div className="bg-gradient-to-br from-green-600/20 to-blue-600/20 backdrop-blur-md rounded-2xl p-6 border border-white/20">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-blue-600 rounded-full flex items-center justify-center">
                  <FileSpreadsheet size={24} className="text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Export Tax Summary</h3>
                  <p className="text-white/60 text-sm">Generate reports for your accountant</p>
                </div>
              </div>
              <button className="bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 text-white px-6 py-3 rounded-lg flex items-center gap-2 transition-all">
                <Download size={20} />
                Download Tax Summary
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white/10 rounded-lg p-4">
                <h4 className="text-white font-semibold mb-2">T2125 (Canada)</h4>
                <p className="text-white/60 text-sm mb-3">Statement of Business Activities</p>
                <button className="bg-white/20 hover:bg-white/30 text-white px-3 py-1 rounded text-sm transition-all">
                  Export PDF
                </button>
              </div>
              
              <div className="bg-white/10 rounded-lg p-4">
                <h4 className="text-white font-semibold mb-2">Schedule C (US)</h4>
                <p className="text-white/60 text-sm mb-3">Profit or Loss From Business</p>
                <button className="bg-white/20 hover:bg-white/30 text-white px-3 py-1 rounded text-sm transition-all">
                  Export PDF
                </button>
              </div>
              
              <div className="bg-white/10 rounded-lg p-4">
                <h4 className="text-white font-semibold mb-2">CSV Export</h4>
                <p className="text-white/60 text-sm mb-3">Raw data for spreadsheet</p>
                <button className="bg-white/20 hover:bg-white/30 text-white px-3 py-1 rounded text-sm transition-all">
                  Export CSV
                </button>
              </div>
            </div>
          </div>

          {/* Extra Resources */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-600 rounded-full flex items-center justify-center">
                <HelpCircle size={24} className="text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Tax Resources</h3>
                <p className="text-white/60 text-sm">Helpful links and guides</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="text-white font-semibold">CRA Resources (Canada)</h4>
                <div className="space-y-2">
                  <a href="#" className="flex items-center space-x-2 text-blue-400 hover:text-blue-300 transition-colors">
                    <ExternalLink size={16} />
                    <span>Freelancer Tax Guide</span>
                  </a>
                  <a href="#" className="flex items-center space-x-2 text-blue-400 hover:text-blue-300 transition-colors">
                    <ExternalLink size={16} />
                    <span>T2125 Form Instructions</span>
                  </a>
                  <a href="#" className="flex items-center space-x-2 text-blue-400 hover:text-blue-300 transition-colors">
                    <ExternalLink size={16} />
                    <span>Tax Deadlines Calendar</span>
                  </a>
                </div>
              </div>
              
              <div className="space-y-4">
                <h4 className="text-white font-semibold">IRS Resources (US)</h4>
                <div className="space-y-2">
                  <a href="#" className="flex items-center space-x-2 text-blue-400 hover:text-blue-300 transition-colors">
                    <ExternalLink size={16} />
                    <span>Self-Employed Tax Guide</span>
                  </a>
                  <a href="#" className="flex items-center space-x-2 text-blue-400 hover:text-blue-300 transition-colors">
                    <ExternalLink size={16} />
                    <span>Schedule C Instructions</span>
                  </a>
                  <a href="#" className="flex items-center space-x-2 text-blue-400 hover:text-blue-300 transition-colors">
                    <ExternalLink size={16} />
                    <span>Audit Tips & Best Practices</span>
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Specialized Tax Assistant Chatbot */}
          <SpecializedChatBot
            name="TaxBot"
            expertise="CRA/IRS tax help for freelancers, small business, deduction optimization"
            avatar="🧮"
            welcomeMessage="Hi! I'm TaxBot, your tax preparation specialist. I can help you with CRA/IRS tax questions, identify deductions, organize your documents, and optimize your tax strategy for freelancers and small businesses. What tax-related questions do you have today?"
            color="green"
          />
        </div>
      </div>
    </div>
  );
};

export default TaxAssistant; 