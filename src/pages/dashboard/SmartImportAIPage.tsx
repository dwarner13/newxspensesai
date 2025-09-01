import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  UploadCloud, FileText, Image, FileSpreadsheet, Bot, Send, Loader2,
  CheckCircle, AlertTriangle, Lightbulb, BarChart3, Clock, Download,
  Eye, X, ChevronDown, ChevronUp, History, TrendingUp, FileCheck
} from 'lucide-react';
import DashboardHeader from '../../components/ui/DashboardHeader';
import { useAuth } from '../../contexts/AuthContext';
import SmartHandoffBanner from '../../components/ai/SmartHandoffBanner';
import SmartWelcomeMessage from '../../components/ai/SmartWelcomeMessage';
import { 
  getEmployeeConfig, 
  getConversation, 
  saveConversation, 
  addMessageToConversation,
  incrementConversationCount,
  logAIInteraction,
  generateConversationId,
  createSystemMessage,
  createUserMessage,
  createAssistantMessage
} from '../../lib/ai-employees';
import { AIConversationMessage } from '../../types/ai-employees.types';

interface ByteMessage {
  role: 'user' | 'byte' | 'system';
  content: string;
  timestamp: string;
  metadata?: {
    processing_time_ms?: number;
    tokens_used?: number;
    model_used?: string;
  };
}

export default function SmartImportAIPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ByteMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState('');
  const [byteConfig, setByteConfig] = useState<any>(null);
  const [showWelcomeMessage, setShowWelcomeMessage] = useState(true);
  const [isChatCollapsed, setIsChatCollapsed] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'processing' | 'complete' | 'error'>('idle');
  const [uploadResults, setUploadResults] = useState<any[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize conversation and load Byte's config
  useEffect(() => {
    const initializeByte = async () => {
      if (!user?.id) return;
      
      const newConversationId = generateConversationId();
      setConversationId(newConversationId);
      
      // Load Byte's configuration
      const config = await getEmployeeConfig('byte');
      setByteConfig(config);
      
      // Load existing conversation if any
      const existingConversation = await getConversation(user.id, 'byte', newConversationId);
      if (existingConversation && existingConversation.messages.length > 0) {
        setMessages(existingConversation.messages as ByteMessage[]);
      }
    };

    initializeByte();
  }, [user?.id]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (content: string) => {
    if (!content.trim() || !user?.id || isLoading) return;

    // Hide welcome message when user starts chatting
    if (showWelcomeMessage) {
      setShowWelcomeMessage(false);
    }

    const userMessage: ByteMessage = {
      role: 'user',
      content: content.trim(),
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Save user message to conversation
      await addMessageToConversation(user.id, 'byte', conversationId, userMessage as AIConversationMessage);

      // Log the interaction
      await logAIInteraction(user.id, 'byte', 'chat', content);

      // Simulate AI response (in real implementation, this would call OpenAI)
      const startTime = Date.now();
      
      // Create Byte's response based on the user's query
      const byteResponse = await generateByteResponse(content);
      
      const processingTime = Date.now() - startTime;

      const byteMessage: ByteMessage = {
        role: 'byte',
        content: byteResponse,
        timestamp: new Date().toISOString(),
        metadata: {
          processing_time_ms: processingTime,
          model_used: 'gpt-3.5-turbo'
        }
      };

      setMessages(prev => [...prev, byteMessage]);
      
      // Save Byte's response to conversation
      await addMessageToConversation(user.id, 'byte', conversationId, byteMessage as AIConversationMessage);
      
      // Increment conversation count
      await incrementConversationCount(user.id, 'byte');

    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: ByteMessage = {
        role: 'byte',
        content: "I'm having trouble processing your request right now. Please try again in a moment.",
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const generateByteResponse = async (userQuery: string): Promise<string> => {
    // Simulate AI processing delay
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));

    const query = userQuery.toLowerCase();
    
    // Byte's specialized responses for import-related queries
    if (query.includes('receipt') || query.includes('upload') || query.includes('scan')) {
      return `📄 Great! I can help you upload receipts. Here's how it works:

1. **Supported formats:** JPG, PNG, PDF
2. **AI processing:** I'll automatically extract merchant, amount, date, and category
3. **Accuracy:** 95%+ accuracy with human review option

Would you like to upload a receipt now? I can guide you through the process step by step!`;
    }
    
    if (query.includes('bank statement') || query.includes('csv') || query.includes('statement')) {
      return `🏦 Perfect! Bank statement imports are my specialty. Here's what I can do:

1. **CSV/PDF support:** Most major banks supported
2. **Auto-categorization:** I'll categorize transactions based on your patterns
3. **Duplicate detection:** I'll identify and handle duplicates automatically
4. **Reconciliation:** I'll help you match transactions with your records

What bank do you use? I can provide specific instructions for your bank's format.`;
    }
    
    if (query.includes('categorize') || query.includes('category') || query.includes('organize')) {
      return `🏷️ I love helping with categorization! Here's how my AI works:

1. **Smart learning:** I learn from your previous categorizations
2. **Merchant matching:** I recognize merchants and apply consistent categories
3. **Pattern recognition:** I identify spending patterns and suggest categories
4. **Custom rules:** You can set up rules for specific merchants or amounts

Would you like me to show you your current categories or help set up custom rules?`;
    }
    
    if (query.includes('help') || query.includes('how') || query.includes('what')) {
      return `🤖 I'm Byte, your Smart Import AI! Here's what I can help you with:

📄 **Receipt Uploads:** Scan and process receipts automatically
🏦 **Bank Statements:** Import and categorize transactions
🏷️ **Smart Categorization:** Learn your patterns and organize spending
📊 **Data Processing:** Extract key information from documents
🔄 **Duplicate Detection:** Find and handle duplicate transactions

What would you like to work on today? I'm here to make your financial data import process smooth and efficient!`;
    }
    
    if (query.includes('format') || query.includes('supported') || query.includes('file type')) {
      return `📋 Here are the file formats I support:

**Images:** JPG, PNG, HEIC
**Documents:** PDF, CSV, XLSX
**Bank Files:** QFX, OFX, CSV (most banks)

**File size limits:**
- Images: Up to 10MB
- Documents: Up to 25MB
- Multiple files: Up to 50 files at once

I'll automatically detect the format and process accordingly. What type of file are you looking to upload?`;
    }

    // Default response for other queries
    return `📄 I understand you're asking about "${userQuery}". As your Smart Import AI, I'm here to help with:

• Uploading and processing financial documents
• Extracting data from receipts and statements  
• Organizing and categorizing transactions
• Setting up import workflows

Could you tell me more specifically what you'd like to import or process? I'm ready to guide you through the entire process!`;
  };

  const handleFileUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      setIsUploading(true);
      setUploadStatus('uploading');
      setUploadProgress(0);
      
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            setUploadStatus('processing');
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      // Simulate processing
      setTimeout(() => {
        setUploadProgress(100);
        setUploadStatus('complete');
        setIsUploading(false);
        
        // Generate mock results
        const results = Array.from(files).map((file, index) => ({
          id: `file_${index}`,
          name: file.name,
          type: file.type,
          size: file.size,
          status: 'processed',
          accuracy: Math.floor(Math.random() * 10) + 90,
          transactions: Math.floor(Math.random() * 20) + 5,
          amount: Math.floor(Math.random() * 1000) + 100
        }));
        
        setUploadResults(results);
        
        // Auto-send success message
        setTimeout(() => {
          sendMessage(`I've successfully processed ${files.length} file(s). All documents were categorized with high accuracy!`);
        }, 1000);
      }, 3000);
    }
  };

  const resetUpload = () => {
    setUploadStatus('idle');
    setUploadProgress(0);
    setUploadResults([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const quickActions = [
    { icon: UploadCloud, text: "Upload Receipt", action: () => sendMessage("I want to upload a receipt") },
    { icon: FileSpreadsheet, text: "Import Bank Statement", action: () => sendMessage("I want to import a bank statement") },
    { icon: FileText, text: "Batch Upload", action: () => sendMessage("I want to upload multiple files at once") },
    { icon: Image, text: "Scan Receipt", action: () => sendMessage("I want to scan a receipt with my camera") }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      <DashboardHeader />
      
      <div className="max-w-7xl mx-auto p-6">
        {/* Context Zone - Top Bar */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-8"
        >
          <div className="flex items-center gap-4">
            <div className="text-3xl">📄</div>
            <div>
              <h1 className="text-3xl font-bold text-white">Smart Import Workspace</h1>
              <p className="text-white/70 text-sm">Powered by Byte AI</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md rounded-xl px-4 py-2 border border-white/20">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-green-400 text-sm font-medium">Byte Active</span>
          </div>
        </motion.div>

        {/* Smart Handoff Components */}
        <SmartHandoffBanner />
        {showWelcomeMessage && (
          <SmartWelcomeMessage 
            employeeName="Byte" 
            employeeEmoji="📄"
            defaultMessage="Hi! I'm 📄 Byte, your Smart Import AI. I'm ready to help you upload and process your financial documents. What would you like to import today?"
          />
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Action Zone - Upload Panel (Left/Middle) */}
          <div className="lg:col-span-3 space-y-6">
            {/* Upload Hero Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-8"
            >
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-white mb-2">Upload Your Documents</h2>
                <p className="text-white/70">Drag and drop files or click to browse</p>
              </div>

              {/* Upload Area */}
              <div 
                className={`relative border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-300 ${
                  uploadStatus === 'idle' 
                    ? 'border-blue-400/50 bg-blue-500/5 hover:border-blue-400 hover:bg-blue-500/10' 
                    : uploadStatus === 'uploading' || uploadStatus === 'processing'
                    ? 'border-orange-400/50 bg-orange-500/5'
                    : uploadStatus === 'complete'
                    ? 'border-green-400/50 bg-green-500/5'
                    : 'border-red-400/50 bg-red-500/5'
                }`}
                onClick={uploadStatus === 'idle' ? handleFileUpload : undefined}
              >
                {uploadStatus === 'idle' && (
                  <>
                    <UploadCloud className="w-16 h-16 text-blue-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-white mb-2">Drop files here or click to upload</h3>
                    <p className="text-white/60 mb-4">Supports: JPG, PNG, PDF, CSV, XLSX, HEIC</p>
                    <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-medium transition-colors">
                      Choose Files
                    </button>
                  </>
                )}

                {(uploadStatus === 'uploading' || uploadStatus === 'processing') && (
                  <>
                    <Loader2 className="w-16 h-16 text-orange-400 mx-auto mb-4 animate-spin" />
                    <h3 className="text-xl font-semibold text-white mb-2">
                      {uploadStatus === 'uploading' ? 'Uploading files...' : 'Crunching your numbers with Byte...'}
                    </h3>
                    <div className="w-full bg-white/10 rounded-full h-2 mb-4">
                      <div 
                        className="bg-orange-400 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      ></div>
                    </div>
                    <p className="text-white/60">{uploadProgress}% complete</p>
                  </>
                )}

                {uploadStatus === 'complete' && (
                  <>
                    <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-white mb-2">Upload Complete!</h3>
                    <p className="text-white/60 mb-4">All files processed successfully</p>
                    <button 
                      onClick={resetUpload}
                      className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl font-medium transition-colors mr-3"
                    >
                      Upload More
                    </button>
                    <button className="bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-xl font-medium transition-colors">
                      View Results
                    </button>
                  </>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".jpg,.jpeg,.png,.pdf,.csv,.xlsx,.heic"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>

              {/* Upload Results */}
              {uploadResults.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-6 space-y-3"
                >
                  <h4 className="text-lg font-semibold text-white">Processing Results</h4>
                  {uploadResults.map((result, index) => (
                    <div key={result.id} className="bg-white/5 rounded-xl p-4 border border-white/10">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <FileCheck className="w-5 h-5 text-green-400" />
                          <div>
                            <p className="text-white font-medium">{result.name}</p>
                            <p className="text-white/60 text-sm">{result.transactions} transactions • ${result.amount}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-green-400 font-semibold">{result.accuracy}% accuracy</p>
                          <p className="text-white/60 text-sm">Processed</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </motion.div>
              )}
            </motion.div>

            {/* AI Chat/Guided Help (Collapsible) */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 overflow-hidden"
            >
              {/* Chat Header */}
              <div className="bg-white/10 px-6 py-4 border-b border-white/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="text-xl">📄</div>
                    <div>
                      <h3 className="font-semibold text-white">Byte's Guidance</h3>
                      <p className="text-white/60 text-sm">AI Assistant & Helper</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsChatCollapsed(!isChatCollapsed)}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    {isChatCollapsed ? <ChevronDown className="w-5 h-5 text-white" /> : <ChevronUp className="w-5 h-5 text-white" />}
                  </button>
                </div>
              </div>

              <AnimatePresence>
                {!isChatCollapsed && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    {/* Messages */}
                    <div className="h-64 overflow-y-auto p-4 space-y-4">
                      {messages.map((message, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                            message.role === 'user' 
                              ? 'bg-blue-600 text-white' 
                              : 'bg-white/10 text-white border border-white/20'
                          }`}>
                            <div className="whitespace-pre-wrap text-sm">{message.content}</div>
                            <div className="text-xs opacity-60 mt-2">
                              {new Date(message.timestamp).toLocaleTimeString()}
                            </div>
                          </div>
                        </motion.div>
                      ))}
                      
                      {isLoading && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="flex justify-start"
                        >
                          <div className="bg-white/10 text-white border border-white/20 rounded-2xl px-4 py-3">
                            <div className="flex items-center gap-2">
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span className="text-sm">Byte is thinking...</span>
                            </div>
                          </div>
                        </motion.div>
                      )}
                      
                      <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <div className="p-4 border-t border-white/10">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={input}
                          onChange={(e) => setInput(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && !isLoading && sendMessage(input)}
                          placeholder="Ask Byte for help..."
                          className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-2 text-white placeholder-white/50 focus:outline-none focus:border-blue-500 text-sm"
                          disabled={isLoading}
                        />
                        <button
                          onClick={() => sendMessage(input)}
                          disabled={isLoading || !input.trim()}
                          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl px-4 py-2 transition-colors"
                        >
                          <Send className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>

          {/* Support Zone - Stats + History (Right Sidebar) */}
          <div className="space-y-6">
            {/* Processing Stats */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-6"
            >
              <h3 className="text-lg font-semibold text-white mb-4">Processing Stats</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-white/70 text-sm">Accuracy Rate</span>
                  <span className="text-green-400 font-semibold">95.2%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-white/70 text-sm">Avg. Processing</span>
                  <span className="text-blue-400 font-semibold">1.2s</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-white/70 text-sm">Files Today</span>
                  <span className="text-purple-400 font-semibold">12</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-white/70 text-sm">Last Upload</span>
                  <span className="text-orange-400 font-semibold">2 min ago</span>
                </div>
              </div>
            </motion.div>

            {/* Quick Actions */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-6"
            >
              <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
              <div className="space-y-3">
                {quickActions.map((action, index) => (
                  <button
                    key={index}
                    onClick={action.action}
                    className="w-full flex items-center gap-3 p-3 bg-white/10 hover:bg-white/15 border border-white/20 rounded-xl text-white transition-colors"
                  >
                    <action.icon className="w-4 h-4" />
                    <span className="text-sm">{action.text}</span>
                  </button>
                ))}
              </div>
            </motion.div>

            {/* Upload History */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Recent Uploads</h3>
                <History className="w-5 h-5 text-white/60" />
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                  <div>
                    <p className="text-white text-sm font-medium">Bank Statement</p>
                    <p className="text-white/60 text-xs">Feb 26 • 14 receipts</p>
                  </div>
                  <div className="text-right">
                    <p className="text-green-400 text-sm font-semibold">97%</p>
                    <p className="text-white/60 text-xs">accuracy</p>
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                  <div>
                    <p className="text-white text-sm font-medium">Receipts Batch</p>
                    <p className="text-white/60 text-xs">Feb 25 • 8 receipts</p>
                  </div>
                  <div className="text-right">
                    <p className="text-green-400 text-sm font-semibold">94%</p>
                    <p className="text-white/60 text-xs">accuracy</p>
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                  <div>
                    <p className="text-white text-sm font-medium">CSV Import</p>
                    <p className="text-white/60 text-xs">Feb 24 • 23 transactions</p>
                  </div>
                  <div className="text-right">
                    <p className="text-green-400 text-sm font-semibold">99%</p>
                    <p className="text-white/60 text-xs">accuracy</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
} 