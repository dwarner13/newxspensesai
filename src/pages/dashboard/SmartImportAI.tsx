import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { UploadCloud, FileText, Image, FileSpreadsheet, Bot, Send, Loader2 } from 'lucide-react';
import DashboardHeader from '../../components/ui/DashboardHeader';
import { useAuth } from '../../contexts/AuthContext';
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

export default function SmartImportAI() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ByteMessage[]>([
    {
      role: 'byte',
      content: "Hi! I'm 📄 Byte, your Smart Import AI. I can help you upload and process receipts, bank statements, and financial documents. I'll guide you through the import process and explain how AI categorization works. What would you like to import today?",
      timestamp: new Date().toISOString()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState('');
  const [byteConfig, setByteConfig] = useState<any>(null);
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
    const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'there';
    
    // Byte's specialized responses for import-related queries
    if (query.includes('hello') || query.includes('hi') || query.includes('hey') || query.includes('hi there')) {
      return `Hi ${userName}! 📄 I'm Byte, your Smart Import AI. Great to see you! I'm here to help you upload and process your financial documents, extract data from receipts and statements, and organize your financial information automatically. What would you like to import today?`;
    }
    
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

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      const fileNames = Array.from(files).map(f => f.name).join(', ');
      sendMessage(`I want to upload these files: ${fileNames}`);
    }
  };

  const quickActions = [
    { icon: UploadCloud, text: "Upload Receipt", action: () => sendMessage("I want to upload a receipt") },
    { icon: FileSpreadsheet, text: "Import Bank Statement", action: () => sendMessage("I want to import a bank statement") },
    { icon: FileText, text: "Batch Upload", action: () => sendMessage("I want to upload multiple files at once") },
    { icon: Image, text: "Scan Receipt", action: () => sendMessage("I want to scan a receipt with my camera") }
  ];

  return (
    <div className="max-w-7xl mx-auto p-6 mt-6 md:mt-8">
        {/* Byte Header */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center gap-3 bg-white/10 backdrop-blur-md rounded-2xl px-6 py-4 border border-white/20">
            <div className="text-3xl">📄</div>
            <div>
              <h1 className="text-2xl font-bold text-white">Byte</h1>
              <p className="text-white/70 text-sm">Smart Import AI</p>
            </div>
            <div className="flex items-center gap-2 ml-4">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-green-400 text-sm">AI Active</span>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Chat Interface */}
          <div className="lg:col-span-2">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 overflow-hidden"
            >
              {/* Chat Header */}
              <div className="bg-white/10 px-6 py-4 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="text-xl">📄</div>
                  <div>
                    <h2 className="font-semibold text-white">Chat with Byte</h2>
                    <p className="text-white/60 text-sm">Smart Import AI Assistant</p>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="h-96 overflow-y-auto p-4 space-y-4">
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
                      <div className="whitespace-pre-wrap">{message.content}</div>
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
                        <span>Byte is thinking...</span>
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
                    placeholder="Ask Byte about importing documents..."
                    className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:border-blue-500"
                    disabled={isLoading}
                  />
                  <button
                    onClick={() => sendMessage(input)}
                    disabled={isLoading || !input.trim()}
                    className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl px-4 py-3 transition-colors"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
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
                    <action.icon className="w-5 h-5" />
                    <span className="text-sm">{action.text}</span>
                  </button>
                ))}
              </div>
            </motion.div>

            {/* File Upload */}
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-6"
            >
              <h3 className="text-lg font-semibold text-white mb-4">Upload Files</h3>
              <button
                onClick={handleFileUpload}
                className="w-full flex items-center justify-center gap-2 p-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors"
              >
                <UploadCloud className="w-5 h-5" />
                <span>Choose Files</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".jpg,.jpeg,.png,.pdf,.csv,.xlsx,.heic"
                onChange={handleFileSelect}
                className="hidden"
              />
              <p className="text-white/60 text-sm mt-3">
                Supported: JPG, PNG, PDF, CSV, XLSX
              </p>
            </motion.div>

            {/* Byte's Stats */}
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-6"
            >
              <h3 className="text-lg font-semibold text-white mb-4">Byte's Stats</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-white/70">Processing Accuracy</span>
                  <span className="text-green-400">95.2%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/70">Avg. Response Time</span>
                  <span className="text-blue-400">1.2s</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/70">Files Processed</span>
                  <span className="text-purple-400">1,247</span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
