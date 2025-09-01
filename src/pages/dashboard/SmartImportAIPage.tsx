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
    try {
      // Use OpenAI API for intelligent responses
      const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;
      
      if (!OPENAI_API_KEY) {
        // Fallback to basic responses if no API key
        return generateFallbackResponse(userQuery);
      }

      const systemPrompt = `You are Byte, an AI Smart Import Assistant for financial documents. You help users upload, process, and organize their financial data including receipts, bank statements, and invoices.

Your personality:
- Helpful and efficient
- Technical but friendly
- Focused on document processing and financial data organization
- Use emojis occasionally but not excessively
- Keep responses concise but informative

Your capabilities:
- Receipt scanning and processing
- Bank statement imports
- Transaction categorization
- Data extraction from financial documents
- Duplicate detection
- File format support (JPG, PNG, PDF, CSV, XLSX, HEIC)
- Smart categorization based on user patterns

Always provide actionable advice and be specific about how you can help with their financial document processing needs.`;

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userQuery }
          ],
          temperature: 0.7,
          max_tokens: 300
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      return data.choices[0]?.message?.content || generateFallbackResponse(userQuery);

    } catch (error) {
      console.error('Error generating Byte response:', error);
      return generateFallbackResponse(userQuery);
    }
  };

  const generateFallbackResponse = (userQuery: string): string => {
    const query = userQuery.toLowerCase();

    // Enhanced fallback responses
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

        {/* Smart Handoff Components */}
        <SmartHandoffBanner />
        {showWelcomeMessage && (
          <SmartWelcomeMessage 
            employeeName="Byte" 
            employeeEmoji="📄"
            defaultMessage="Hi! I'm 📄 Byte, your Smart Import AI. I'm ready to help you upload and process your financial documents. What would you like to import today?"
          />
        )}

                {/* Top Row: Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Processing Stats Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-4"
          >
            <h3 className="text-sm font-semibold text-white mb-3">Processing Stats</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-white/70 text-xs">Accuracy</span>
                <span className="text-green-400 font-semibold text-sm">95.2%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-white/70 text-xs">Avg. Time</span>
                <span className="text-blue-400 font-semibold text-sm">1.2s</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-white/70 text-xs">Files Today</span>
                <span className="text-purple-400 font-semibold text-sm">12</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-white/70 text-xs">Last Upload</span>
                <span className="text-orange-400 font-semibold text-sm">2m ago</span>
              </div>
            </div>
          </motion.div>

          {/* Quick Actions Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-4"
          >
            <h3 className="text-sm font-semibold text-white mb-3">Quick Actions</h3>
            <div className="space-y-2">
              {quickActions.map((action, index) => (
                <button
                  key={index}
                  onClick={action.action}
                  className="w-full flex items-center gap-2 p-2 bg-white/10 hover:bg-white/15 border border-white/20 rounded-lg text-white transition-colors"
                >
                  <action.icon className="w-3 h-3" />
                  <span className="text-xs">{action.text}</span>
                </button>
              ))}
            </div>
          </motion.div>

          {/* Upload History Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-4"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-white">Recent Uploads</h3>
              <History className="w-4 h-4 text-white/60" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-2 bg-white/5 rounded-lg">
                <div>
                  <p className="text-white text-xs font-medium">Bank Statement</p>
                  <p className="text-white/60 text-xs">Feb 26 • 14 receipts</p>
                </div>
                <div className="text-right">
                  <p className="text-green-400 text-xs font-semibold">97%</p>
                </div>
              </div>
              <div className="flex items-center justify-between p-2 bg-white/5 rounded-lg">
                <div>
                  <p className="text-white text-xs font-medium">Receipts Batch</p>
                  <p className="text-white/60 text-xs">Feb 25 • 8 receipts</p>
                </div>
                <div className="text-right">
                  <p className="text-green-400 text-xs font-semibold">94%</p>
                </div>
              </div>
              <div className="flex items-center justify-between p-2 bg-white/5 rounded-lg">
                <div>
                  <p className="text-white text-xs font-medium">CSV Import</p>
                  <p className="text-white/60 text-xs">Feb 24 • 23 transactions</p>
                </div>
                <div className="text-right">
                  <p className="text-green-400 text-xs font-semibold">99%</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Bottom Row: Upload and Chatbot (2 columns) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Upload Column */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-6"
          >
            <div className="text-center mb-6">
              <UploadCloud className="w-12 h-12 text-blue-400 mx-auto mb-3" />
              <h2 className="text-xl font-bold text-white mb-2">Upload Documents</h2>
              <p className="text-white/70 text-sm">Drag and drop or click to browse</p>
            </div>

            {/* Upload Area */}
            <div 
              className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 cursor-pointer ${
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
                  <UploadCloud className="w-8 h-8 text-blue-400 mx-auto mb-3" />
                  <p className="text-white/80 text-sm mb-3">Choose Files</p>
                  <p className="text-white/60 text-xs">JPG, PNG, PDF, CSV, XLSX</p>
                </>
              )}

              {(uploadStatus === 'uploading' || uploadStatus === 'processing') && (
                <>
                  <Loader2 className="w-8 h-8 text-orange-400 mx-auto mb-3 animate-spin" />
                  <p className="text-white/80 text-sm mb-2">
                    {uploadStatus === 'uploading' ? 'Uploading...' : 'Processing...'}
                  </p>
                  <div className="w-full bg-white/10 rounded-full h-1.5 mb-2">
                    <div 
                      className="bg-orange-400 h-1.5 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                  <p className="text-white/60 text-xs">{uploadProgress}%</p>
                </>
              )}

              {uploadStatus === 'complete' && (
                <>
                  <CheckCircle className="w-8 h-8 text-green-400 mx-auto mb-3" />
                  <p className="text-white/80 text-sm mb-3">Complete!</p>
                  <button 
                    onClick={resetUpload}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  >
                    Upload More
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
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 space-y-2"
              >
                <h4 className="text-sm font-semibold text-white">Results</h4>
                {uploadResults.map((result, index) => (
                  <div key={result.id} className="bg-white/5 rounded-lg p-3 border border-white/10">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white text-sm font-medium truncate">{result.name}</p>
                        <p className="text-white/60 text-xs">{result.transactions} transactions</p>
                      </div>
                      <div className="text-right">
                        <p className="text-green-400 text-sm font-semibold">{result.accuracy}%</p>
                      </div>
                    </div>
                  </div>
                ))}
              </motion.div>
            )}
          </motion.div>

          {/* Byte Chat Column */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 overflow-hidden"
          >
            {/* Chat Header */}
            <div className="bg-white/10 px-4 py-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <div className="text-lg">📄</div>
                <div>
                  <h3 className="font-semibold text-white text-sm">Byte AI</h3>
                  <p className="text-white/60 text-xs">Smart Import Assistant</p>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="h-64 overflow-y-auto p-4 space-y-3">
              {messages.map((message, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[85%] rounded-xl px-3 py-2 ${
                    message.role === 'user' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-white/10 text-white border border-white/20'
                  }`}>
                    <div className="whitespace-pre-wrap text-xs">{message.content}</div>
                  </div>
                </motion.div>
              ))}
              
              {isLoading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex justify-start"
                >
                  <div className="bg-white/10 text-white border border-white/20 rounded-xl px-3 py-2">
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span className="text-xs">Byte is thinking...</span>
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
                  placeholder="Ask Byte..."
                  className="flex-1 bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-white/50 focus:outline-none focus:border-blue-500 text-xs"
                  disabled={isLoading}
                />
                <button
                  onClick={handleFileUpload}
                  className="bg-green-600 hover:bg-green-700 text-white rounded-lg px-3 py-2 transition-colors"
                  title="Upload files"
                >
                  <UploadCloud className="w-3 h-3" />
                </button>
                <button
                  onClick={() => sendMessage(input)}
                  disabled={isLoading || !input.trim()}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg px-3 py-2 transition-colors"
                >
                  <Send className="w-3 h-3" />
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
} 