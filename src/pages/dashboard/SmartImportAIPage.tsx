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
  role: 'user' | 'byte' | 'system' | 'tag' | 'ledger' | 'goalie' | 'finley' | 'luna' | 'sage' | 'blitz' | 'automa' | 'intelia';
  content: string;
  timestamp: string;
  metadata?: {
    processing_time_ms?: number;
    tokens_used?: number;
    model_used?: string;
    ai_employee?: string;
    action_type?: string;
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
  const [showChatHistory, setShowChatHistory] = useState(false);
  const [chatHistory, setChatHistory] = useState<any[]>([]);
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
      } else {
        // Add personalized welcome message for new conversations
        const welcomeMessage: ByteMessage = {
          role: 'byte',
          content: `👋 Welcome back, ${user.user_metadata?.full_name || 'there'}! I'm Byte, your Smart Import AI assistant. I'm here to help you upload and process your financial documents with the help of our AI team. 

What would you like to work on today? I can help you:
📄 Upload receipts and documents
🏷️ Categorize your transactions  
📊 Process bank statements
🤖 Coordinate with our AI team

Just drag and drop your files or ask me anything!`,
          timestamp: new Date().toISOString(),
          metadata: {
            ai_employee: 'byte',
            action_type: 'welcome'
          }
        };
        setMessages([welcomeMessage]);
      }
    };

    initializeByte();
  }, [user?.id]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load chat history
  const loadChatHistory = async () => {
    if (!user?.id) return;
    
    try {
      // This would load from Supabase in a real implementation
      // For now, we'll create mock history
      const mockHistory = [
        {
          id: 'conv_1',
          title: 'Receipt Processing Session',
          lastMessage: 'All receipts processed successfully!',
          timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
          messageCount: 12
        },
        {
          id: 'conv_2', 
          title: 'Bank Statement Analysis',
          lastMessage: 'Found 3 duplicate transactions',
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
          messageCount: 8
        },
        {
          id: 'conv_3',
          title: 'Tax Preparation Help',
          lastMessage: 'Ready for your accountant!',
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
          messageCount: 15
        }
      ];
      
      setChatHistory(mockHistory);
    } catch (error) {
      console.error('Error loading chat history:', error);
    }
  };

  useEffect(() => {
    loadChatHistory();
  }, [user?.id]);

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

      // Determine which AI should respond based on the question
      const query = content.toLowerCase();
      let respondingAI = 'byte'; // Default to Byte
      
      if (query.includes('tag') || query.includes('categor') || query.includes('organize')) {
        respondingAI = 'tag';
      } else if (query.includes('ledger') || query.includes('transaction') || query.includes('statement')) {
        respondingAI = 'ledger';
      } else if (query.includes('finley') || query.includes('financial') || query.includes('analysis') || query.includes('insight')) {
        respondingAI = 'finley';
      }

      const startTime = Date.now();

      // Generate response from the appropriate AI
      const aiResponse = await generateAIEmployeeResponse(respondingAI, content);

      const processingTime = Date.now() - startTime;

      const aiMessage: ByteMessage = {
        role: respondingAI as any,
        content: aiResponse,
        timestamp: new Date().toISOString(),
        metadata: {
          processing_time_ms: processingTime,
          model_used: 'gpt-4o-mini',
          ai_employee: respondingAI
        }
      };

      setMessages(prev => [...prev, aiMessage]);

      // Save AI response to conversation
      await addMessageToConversation(user.id, 'byte', conversationId, aiMessage as AIConversationMessage);

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

  const generateAIEmployeeResponse = async (aiKey: string, userQuery: string): Promise<string> => {
    const ai = aiEmployees[aiKey as keyof typeof aiEmployees];
    if (!ai) return generateFallbackResponse(userQuery);

    try {
      const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;
      
      if (!OPENAI_API_KEY) {
        return generateFallbackResponse(userQuery);
      }

      // Get conversation context (last 5 messages for context)
      const recentMessages = messages.slice(-5);
      const conversationContext = recentMessages.map(msg => 
        `${msg.role === 'user' ? 'User' : aiEmployees[msg.role as keyof typeof aiEmployees]?.name || 'AI'}: ${msg.content}`
      ).join('\n');

      const systemPrompts = {
        tag: `You are Tag, an AI Categorization Specialist. You help users organize and categorize their financial transactions. You're friendly, detail-oriented, and love helping people stay organized.

You can hand off to other AI employees when needed:
- For financial analysis and insights → "Let me get Finley to help you with that analysis"
- For transaction processing → "Let me get Ledger to help you process that data"
- For business intelligence → "Let me get Intelia to help you with business insights"

Always maintain conversation context and reference previous messages when relevant.`,
        
        ledger: `You are Ledger, a Transaction Processing Expert. You handle bank statements, CSV imports, and transaction data. You're precise, analytical, and focused on data accuracy.

You can hand off to other AI employees when needed:
- For categorization help → "Let me get Tag to help you organize those transactions"
- For financial analysis → "Let me get Finley to help you analyze those trends"
- For business intelligence → "Let me get Intelia to help you with business insights"

Always maintain conversation context and reference previous messages when relevant.`,
        
        finley: `You are Finley, a Financial Analysis Assistant. You provide insights, trends, and recommendations based on financial data. You're knowledgeable, helpful, and focused on financial planning.

You can hand off to other AI employees when needed:
- For business intelligence and deeper analysis → "Let me get Intelia to help you with that business intelligence"
- For transaction processing → "Let me get Ledger to help you process that data"
- For categorization → "Let me get Tag to help you organize those transactions"

Always maintain conversation context and reference previous messages when relevant.`,
        
        byte: `You are Byte, a Smart Import Coordinator. You help users upload and process financial documents, coordinating with the AI team. You're efficient, helpful, and focused on document processing.

You can hand off to other AI employees when needed:
- For categorization → "Let me get Tag to help you organize those transactions"
- For transaction processing → "Let me get Ledger to help you process that data"
- For financial analysis → "Let me get Finley to help you analyze those insights"
- For business intelligence → "Let me get Intelia to help you with business insights"

Always maintain conversation context and reference previous messages when relevant.`
      };

      const systemPrompt = systemPrompts[aiKey as keyof typeof systemPrompts] || systemPrompts.byte;

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
            { role: 'system', content: `Recent conversation context:\n${conversationContext}` },
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
      console.error(`Error generating ${aiKey} response:`, error);
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



        // Trigger multi-AI conversation based on file types
        setTimeout(() => {
          triggerMultiAIConversation(files);
        }, 1000);
      }, 3000);
    }
  };

  const triggerMultiAIConversation = async (files: FileList) => {
    const fileTypes = Array.from(files).map(file => file.type);
    const fileNames = Array.from(files).map(file => file.name);
    
    // Determine which AI employees should join the conversation
    const relevantAIs = [];
    
    // Check for receipts/images
    if (fileTypes.some(type => type.startsWith('image/') || fileNames.some(name => name.toLowerCase().includes('receipt')))) {
      relevantAIs.push('tag'); // Tag handles categorization
    }
    
    // Check for bank statements/CSV
    if (fileTypes.some(type => type.includes('csv') || type.includes('pdf') || fileNames.some(name => name.toLowerCase().includes('statement')))) {
      relevantAIs.push('ledger'); // Ledger handles transaction processing
    }
    
    // Check for financial documents
    if (fileTypes.some(type => type.includes('pdf') || type.includes('xlsx')) || fileNames.some(name => name.toLowerCase().includes('financial'))) {
      relevantAIs.push('finley'); // Finley handles financial analysis
    }
    
    // Always include Byte for coordination
    relevantAIs.push('byte');
    
    // Remove duplicates
    const uniqueAIs = [...new Set(relevantAIs)];
    
    // Generate AI responses in sequence
    for (let i = 0; i < uniqueAIs.length; i++) {
      const aiKey = uniqueAIs[i];
      const delay = i * 2000; // 2 second delay between each AI response
      
      setTimeout(() => {
        generateAIResponse(aiKey, files, fileNames);
      }, delay);
    }
  };

  const generateAIResponse = async (aiKey: string, files: FileList, fileNames: string[]) => {
    const ai = aiEmployees[aiKey as keyof typeof aiEmployees];
    if (!ai) return;

    let response = '';
    
    switch (aiKey) {
      case 'tag':
        response = `🏷️ Hey there! I'm Tag, your AI Categorizer. I see you've uploaded ${files.length} file(s) - ${fileNames.join(', ')}. Let me analyze these and automatically categorize them for you. I'll make sure everything is properly tagged and organized!`;
        break;
      case 'ledger':
        response = `📊 Hi! I'm Ledger, your Transaction Processor. I've detected some financial documents in your upload. I'll extract all the transaction data, identify duplicates, and make sure everything is properly recorded in your financial ledger.`;
        break;
      case 'finley':
        response = `💼 Hello! I'm Finley, your Financial Assistant. I can see you've uploaded some financial documents. Let me analyze these for any insights, trends, or recommendations that could help with your financial planning.`;
        break;
      case 'byte':
        response = `📄 Perfect! I've coordinated with the team and we're all set to process your ${files.length} file(s). The AI team is now working on your documents - you'll see their updates in this chat as they complete their tasks!`;
        break;
      default:
        response = `🤖 Hi! I'm ${ai.name}, and I'm here to help with your document processing. I'll analyze your uploaded files and provide any relevant insights or actions.`;
    }

    const aiMessage: ByteMessage = {
      role: aiKey as any,
      content: response,
      timestamp: new Date().toISOString(),
      metadata: {
        ai_employee: aiKey,
        action_type: 'file_processing'
      }
    };

    setMessages(prev => [...prev, aiMessage]);
  };

  const resetUpload = () => {
    setUploadStatus('idle');
    setUploadProgress(0);
    setUploadResults([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // AI Employee configurations
  const aiEmployees = {
    tag: { name: "Tag", emoji: "🏷️", color: "text-purple-400", bgColor: "bg-purple-500/20", borderColor: "border-purple-400/30" },
    ledger: { name: "Ledger", emoji: "📊", color: "text-blue-400", bgColor: "bg-blue-500/20", borderColor: "border-blue-400/30" },
    goalie: { name: "Goalie", emoji: "🎯", color: "text-green-400", bgColor: "bg-green-500/20", borderColor: "border-green-400/30" },
    finley: { name: "Finley", emoji: "💼", color: "text-yellow-400", bgColor: "bg-yellow-500/20", borderColor: "border-yellow-400/30" },
    luna: { name: "Luna", emoji: "🌙", color: "text-indigo-400", bgColor: "bg-indigo-500/20", borderColor: "border-indigo-400/30" },
    sage: { name: "Sage", emoji: "🧠", color: "text-orange-400", bgColor: "bg-orange-500/20", borderColor: "border-orange-400/30" },
    blitz: { name: "Blitz", emoji: "⚡", color: "text-red-400", bgColor: "bg-red-500/20", borderColor: "border-red-400/30" },
    automa: { name: "Automa", emoji: "🤖", color: "text-cyan-400", bgColor: "bg-cyan-500/20", borderColor: "border-cyan-400/30" },
    intelia: { name: "Intelia", emoji: "📈", color: "text-pink-400", bgColor: "bg-pink-500/20", borderColor: "border-pink-400/30" }
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
      
      <div className="max-w-7xl mx-auto p-6 relative">
        {/* Chat History Sidebar */}
        <div className={`fixed right-6 top-24 z-40 transition-all duration-300 ${showChatHistory ? 'translate-x-0' : 'translate-x-full'}`}>
          <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-4 w-80 max-h-[calc(100vh-120px)] overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold">Chat History</h3>
              <button
                onClick={() => setShowChatHistory(false)}
                className="text-white/60 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="space-y-2 overflow-y-auto max-h-[calc(100vh-200px)]">
              {chatHistory.map((chat) => (
                <div
                  key={chat.id}
                  className="p-3 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="text-white text-sm font-medium">{chat.title}</h4>
                    <span className="text-white/60 text-xs">{chat.messageCount} msgs</span>
                  </div>
                  <p className="text-white/70 text-xs mb-2 line-clamp-2">{chat.lastMessage}</p>
                  <p className="text-white/50 text-xs">
                    {new Date(chat.timestamp).toLocaleDateString()} {new Date(chat.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Smart Handoff Components */}
        <SmartHandoffBanner />
        {showWelcomeMessage && (
          <SmartWelcomeMessage 
            employeeName="Byte" 
            employeeEmoji="📄"
            defaultMessage="Hi! I'm 📄 Byte, your Smart Import AI. I'm ready to help you upload and process your financial documents. What would you like to import today?"
          />
        )}

                        {/* Top Row: Upload Documents */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-6 mb-6"
        >
          <div className="text-center mb-6">
            <UploadCloud className="w-12 h-12 text-blue-400 mx-auto mb-3" />
            <h2 className="text-xl font-bold text-white mb-2">Upload Documents</h2>
            <p className="text-white/70 text-sm">Drag and drop or click to browse</p>
          </div>

          {/* Upload Area */}
          <div 
            className={`relative border-2 border-dashed rounded-xl p-12 text-center transition-all duration-300 cursor-pointer ${
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
                <p className="text-white/80 text-lg mb-3">Choose Files</p>
                <p className="text-white/60 text-sm">JPG, PNG, PDF, CSV, XLSX</p>
              </>
            )}

            {(uploadStatus === 'uploading' || uploadStatus === 'processing') && (
              <>
                <Loader2 className="w-16 h-16 text-orange-400 mx-auto mb-4 animate-spin" />
                <p className="text-white/80 text-lg mb-3">
                  {uploadStatus === 'uploading' ? 'Uploading...' : 'Processing...'}
                </p>
                <div className="w-full bg-white/10 rounded-full h-2 mb-3">
                  <div 
                    className="bg-orange-400 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
                <p className="text-white/60 text-sm">{uploadProgress}%</p>
              </>
            )}

            {uploadStatus === 'complete' && (
              <>
                <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
                <p className="text-white/80 text-lg mb-4">Complete!</p>
                <button 
                  onClick={resetUpload}
                  className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg text-sm font-medium transition-colors"
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
              className="mt-6 space-y-3"
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

                        {/* Middle Row: Chatbot */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 overflow-hidden mb-6"
        >
          {/* Chat Header */}
          <div className="bg-white/10 px-4 py-3 border-b border-white/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="text-lg">📄</div>
                <div>
                  <h3 className="font-semibold text-white text-sm">Byte AI</h3>
                  <p className="text-white/60 text-xs">Smart Import Assistant</p>
                </div>
              </div>
              <button
                onClick={() => setShowChatHistory(!showChatHistory)}
                className="text-white/60 hover:text-white transition-colors p-1"
                title="Chat History"
              >
                <History className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="h-64 overflow-y-auto p-4 space-y-3">
            {messages.map((message, index) => {
              const isUser = message.role === 'user';
              const isByte = message.role === 'byte';
              const aiEmployee = aiEmployees[message.role as keyof typeof aiEmployees];
              
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[85%] rounded-xl px-3 py-2 ${
                    isUser 
                      ? 'bg-blue-600 text-white' 
                      : isByte
                      ? 'bg-white/10 text-white border border-white/20'
                      : aiEmployee
                      ? `${aiEmployee.bgColor} text-white border ${aiEmployee.borderColor}`
                      : 'bg-white/10 text-white border border-white/20'
                  }`}>
                    {!isUser && aiEmployee && (
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm">{aiEmployee.emoji}</span>
                        <span className={`text-xs font-semibold ${aiEmployee.color}`}>
                          {aiEmployee.name}
                        </span>
                      </div>
                    )}
                    <div className="whitespace-pre-wrap text-xs">{message.content}</div>
                  </div>
                </motion.div>
              );
            })}
            
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
            <div className="flex gap-3">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !isLoading && sendMessage(input)}
                placeholder="Ask Byte anything about your documents..."
                className="flex-1 bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:border-blue-500 text-sm"
                disabled={isLoading}
              />
              <button
                onClick={handleFileUpload}
                className="bg-green-600 hover:bg-green-700 text-white rounded-lg px-4 py-3 transition-colors"
                title="Upload files"
              >
                <UploadCloud className="w-4 h-4" />
              </button>
              <button
                onClick={() => sendMessage(input)}
                disabled={isLoading || !input.trim()}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg px-4 py-3 transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.div>

        {/* Bottom Row: Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Processing Stats Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
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
            transition={{ delay: 0.4 }}
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
            transition={{ delay: 0.5 }}
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
      </div>
    </div>
  );
} 