import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Upload, 
  FileText, 
  Image as ImageIcon, 
  X, 
  Bot, 
  User, 
  Loader2,
  Eye,
  Download,
  CheckCircle,
  AlertCircle,
  Brain,
  Sparkles,
  UploadCloud,
  FileCheck,
  DollarSign,
  Calendar,
  Tag,
  MessageCircle
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { AIEmployeeOrchestrator } from '../../systems/AIEmployeeOrchestrator';
import { getEmployeePersonality, generateEmployeeResponse } from '../../systems/EmployeePersonalities';
import { processImageWithSmartOCR, SmartOCRResult } from '../../utils/smartOCRManager';
import { redactDocument, generateAIEmployeeNotification } from '../../utils/documentRedaction';
import { processLargeFile, getFileRecommendations, ProcessingProgress } from '../../utils/largeFileProcessor';
import { BYTE_KNOWLEDGE_BASE, BYTE_RESPONSES } from '../../ai-knowledge/byte-knowledge-base';
import { CRYSTAL_KNOWLEDGE_BASE, CRYSTAL_RESPONSES, CRYSTAL_PERSONALITY } from '../../ai-knowledge/crystal-knowledge-base';
import toast from 'react-hot-toast';

interface ChatMessage {
  id: string;
  type: 'user' | 'prime' | 'byte' | 'crystal' | 'tag' | 'ledger' | 'blitz' | 'goalie' | 'system';
  content: string;
  timestamp: string;
  attachments?: {
    type: 'image' | 'document';
    url: string;
    filename: string;
    extractedText?: string;
    redactedText?: string;
    analysis?: any;
  }[];
  hasAction?: boolean;
  actionType?: 'crystal_handoff';
  transactions?: {
    id: string;
    date: string;
    description: string;
    amount: number;
    category: string;
  }[];
  processing?: boolean;
}

interface ByteDocumentChatProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ByteDocumentChat: React.FC<ByteDocumentChatProps> = ({
  isOpen,
  onClose
}) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isUploadProcessing, setIsUploadProcessing] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [processingProgress, setProcessingProgress] = useState<ProcessingProgress | null>(null);
  const [activeAI, setActiveAI] = useState<'prime' | 'byte' | 'crystal' | 'tag' | 'ledger' | 'blitz' | 'goalie'>('prime');
  const [hasShownCrystalSummary, setHasShownCrystalSummary] = useState(false);
  const [uploadedFileCount, setUploadedFileCount] = useState(0);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0});
  const [dragActive, setDragActive] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const orchestrator = useRef(new AIEmployeeOrchestrator());

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Check if mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Initialize with Prime greeting
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const welcomeMessage: ChatMessage = {
        id: '1',
        type: 'prime',
        content: "👑 Hello! I'm Prime, your AI CEO here at XSpensesAI. I coordinate our entire team of 30 financial experts to help you succeed. What can my team help you with today?",
        timestamp: new Date().toISOString()
      };
      setMessages([welcomeMessage]);
    }
  }, [isOpen, messages.length]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) {
      console.log('Message blocked: No message content');
      return;
    }

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: inputMessage,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsProcessing(true);

    try {
      // Use the AI Employee Orchestrator for proper routing
      console.log('Message routing debug:', {
        activeAI,
        inputMessage: inputMessage.substring(0, 50)
      });
      
      // Route the message through the orchestrator
      const response = await orchestrator.current.routeMessage(inputMessage, { messages, user});
      
      if (response.shouldHandoff && response.handoff) {
        // Execute handoff to another employee
        orchestrator.current.executeHandoff(response.handoff);
        setActiveAI(response.handoff.to as any);
        
        // Show handoff message
        const handoffMessage: ChatMessage = {
          id: `handoff-${Date.now()}`,
          type: response.handoff.to as any,
          content: response.message,
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, handoffMessage]);
        
        // Get the new employee's response
        const newEmployeeResponse = await getEmployeeResponse(response.handoff.to, inputMessage);
        const messageId = (Date.now() + 1).toString();
        await typewriterResponse(newEmployeeResponse, messageId);
      } else {
        // Handle response from current employee
        const employeeResponse = await getEmployeeResponse(activeAI, inputMessage);
        const messageId = (Date.now() + 1).toString();
        await typewriterResponse(employeeResponse, messageId);
      }
      
      setIsProcessing(false);
    } catch (error) {
      console.error('Message handling error:', error);
      
      // Fallback to current employee
      const fallbackResponse = await getEmployeeResponse(activeAI, inputMessage);
      const messageId = (Date.now() + 1).toString();
      await typewriterResponse(fallbackResponse, messageId);
      setIsProcessing(false);
    }
  };

  // Get employee-specific response
  const getEmployeeResponse = async (employeeId: string, userMessage: string): Promise<string> => {
    const personality = getEmployeePersonality(employeeId);
    if (!personality) return "I'm here to help!";

    // For now, use the personality-based response generation
    // This would integrate with the actual AI system
    return generateEmployeeResponse(employeeId, userMessage, { messages, user});
  };

  // Typewriter effect for AI responses
  const typewriterResponse = async (text: string, messageId: string) => {
    const words = text.split(' ');
    let currentText = '';
    
    const typingMessage: ChatMessage = {
      id: messageId,
      type: activeAI,
      content: `${getEmployeePersonality(activeAI)?.emoji || '🤖'} ${getEmployeePersonality(activeAI)?.name || 'AI'} is thinking...`,
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, typingMessage]);
    
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
    
    for (let i = 0; i < words.length; i++) {
      currentText += (i > 0 ? ' ' : '') + words[i];
      setMessages(prev => prev.map(msg => 
        msg.id === messageId 
          ? { ...msg, content: currentText + (i < words.length - 1 ? '|' : '') }
          : msg
      ));
      const delay = Math.random() * 150 + 50;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    setMessages(prev => prev.map(msg => 
      msg.id === messageId 
        ? { ...msg, content: currentText }
        : msg
    ));
  };

  // Drag and drop handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      await processFiles(files);
    }
  };

  // Process files with OCR
  const processFiles = async (files: File[]) => {
    const validFiles = files.filter(file => {
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
      return validTypes.includes(file.type) && file.size <= 10 * 1024 * 1024; // 10MB limit
    });

    if (validFiles.length === 0) {
      toast.error('Please upload valid image files (JPG, PNG) under 10MB');
      return;
    }

    // Add user message for each file
    validFiles.forEach(file => {
      const userMessage: ChatMessage = {
        id: `upload-${Date.now()}-${file.name}`,
        type: 'user',
        content: `📄 Uploaded: ${file.name}`,
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, userMessage]);
    });

    // Process each file with OCR
    for (const file of validFiles) {
      await processFileWithOCR(file);
    }
  };

  // Process single file with OCR using Local OCR Tester logic
  const processFileWithOCR = async (file: File) => {
    // Add processing message
    const processingMessage: ChatMessage = {
      id: `processing-${Date.now()}`,
      type: 'byte',
      content: `🔍 Analyzing ${file.name}...`,
      processing: true,
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, processingMessage]);

    try {
      // Simulate OCR processing (replace with actual Local OCR Tester logic)
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Generate mock transactions (replace with actual OCR results)
      const mockTransactions = [
        {
          id: `txn-${Date.now()}-1`,
          date: new Date().toLocaleDateString(),
          description: 'Coffee Shop Purchase',
          amount: 4.50,
          category: 'Dining'
        },
        {
          id: `txn-${Date.now()}-2`,
          date: new Date().toLocaleDateString(),
          description: 'Gas Station',
          amount: 32.15,
          category: 'Transportation'
        },
        {
          id: `txn-${Date.now()}-3`,
          date: new Date().toLocaleDateString(),
          description: 'Grocery Store',
          amount: 67.89,
          category: 'Food & Groceries'
        }
      ];

      // Update processing message with results
      const resultMessage: ChatMessage = {
        id: `result-${Date.now()}`,
        type: 'byte',
        content: `✅ Found ${mockTransactions.length} transactions in ${file.name}!`,
        transactions: mockTransactions,
        timestamp: new Date().toISOString()
      };

      setMessages(prev => prev.map(msg => 
        msg.id === processingMessage.id ? resultMessage : msg
      ));

      toast.success(`Processed ${file.name} - found ${mockTransactions.length} transactions`);
    } catch (error) {
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        type: 'byte',
        content: `❌ Failed to process ${file.name}. Please try again.`,
        timestamp: new Date().toISOString()
      };

      setMessages(prev => prev.map(msg => 
        msg.id === processingMessage.id ? errorMessage : msg
      ));

      toast.error(`Failed to process ${file.name}`);
    }
  };

  const handleFileUpload = async (files: FileList) => {
    const fileArray = Array.from(files);
    await processFiles(fileArray);
  };

  // Handle quick action button clicks
  const handleChatWithByte = async (message: string) => {
    if (!message.trim()) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      type: 'user',
      content: message,
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, userMessage]);
    
    setIsProcessing(true);
    
    // Simulate Byte's response
    setTimeout(() => {
      const byteMessage: ChatMessage = {
        id: `byte-${Date.now()}`,
        type: 'byte',
        content: `Got it! I'm ready to help with ${message.toLowerCase().includes('transaction') ? 'your transactions' : 'document processing'}. What would you like me to do?`,
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, byteMessage]);
      setIsProcessing(false);
    }, 1500);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-2 sm:p-4">
      <div className={`bg-gray-900 rounded-lg w-full flex flex-col ${
        isMobile ? 'h-[95vh] max-w-full' : 'h-[90vh] max-w-4xl'
      }`}>
        {/* Header */}
        <div className="flex items-center justify-between p-3 sm:p-4 border-b border-gray-700">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl flex items-center justify-center">
              <Sparkles size={isMobile ? 16 : 20} className="text-white font-bold" />
            </div>
            <h2 className={`font-bold text-white ${isMobile ? 'text-lg' : 'text-xl'}`}>AI Employee Team</h2>
          </div>
          
          {/* AI Employee Switcher */}
          <div className="flex items-center gap-1 sm:gap-2">
              <div 
                className={`flex bg-gray-800 rounded-lg p-1 employee-tabs ${
                  isMobile ? 'max-w-[200px]' : ''
                }`}
                style={{
                  overflowX: 'auto',
                  WebkitOverflowScrolling: 'touch',
                  scrollbarWidth: 'none',
                  msOverflowStyle: 'none'
                }}
              >
                <style>
                  {`
                    .employee-tabs::-webkit-scrollbar {
                      display: none;
                    }
                  `}
                </style>
                <button
                  onClick={() => setActiveAI('prime')}
                  className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-2 rounded-md text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
                    activeAI === 'prime'
                      ? 'bg-yellow-500 text-white'
                      : 'text-gray-400 hover:text-white hover:bg-gray-700'
                  }`}
                >
                  <Sparkles className="w-3 h-3 sm:w-4 sm:h-4" />
                  {isMobile ? 'P' : 'Prime'}
                </button>
                <button
                  onClick={() => setActiveAI('byte')}
                  className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-2 rounded-md text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
                    activeAI === 'byte'
                      ? 'bg-blue-500 text-white'
                      : 'text-gray-400 hover:text-white hover:bg-gray-700'
                  }`}
                >
                  <Bot className="w-3 h-3 sm:w-4 sm:h-4" />
                  {isMobile ? 'B' : 'Byte'}
                </button>
                <button
                  onClick={() => setActiveAI('crystal')}
                  className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-2 rounded-md text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
                    activeAI === 'crystal'
                      ? 'bg-purple-500 text-white'
                      : 'text-gray-400 hover:text-white hover:bg-gray-700'
                  }`}
                >
                  <Brain className="w-3 h-3 sm:w-4 sm:h-4" />
                  {isMobile ? 'C' : 'Crystal'}
                </button>
                <button
                  onClick={() => setActiveAI('tag')}
                  className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-2 rounded-md text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
                    activeAI === 'tag'
                      ? 'bg-green-500 text-white'
                      : 'text-gray-400 hover:text-white hover:bg-gray-700'
                  }`}
                >
                  <Tag className="w-3 h-3 sm:w-4 sm:h-4" />
                  {isMobile ? 'T' : 'Tag'}
                </button>
                {!isMobile && (
                  <>
                    <button
                      onClick={() => setActiveAI('ledger')}
                      className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${
                        activeAI === 'ledger'
                          ? 'bg-orange-500 text-white'
                          : 'text-gray-400 hover:text-white hover:bg-gray-700'
                      }`}
                    >
                      <Sparkles className="w-4 h-4" />
                      Ledger
                    </button>
                    <button
                      onClick={() => setActiveAI('blitz')}
                      className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${
                        activeAI === 'blitz'
                          ? 'bg-red-500 text-white'
                          : 'text-gray-400 hover:text-white hover:bg-gray-700'
                      }`}
                    >
                      <Sparkles className="w-4 h-4" />
                      Blitz
                    </button>
                    <button
                      onClick={() => setActiveAI('goalie')}
                      className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${
                        activeAI === 'goalie'
                          ? 'bg-indigo-500 text-white'
                          : 'text-gray-400 hover:text-white hover:bg-gray-700'
                      }`}
                    >
                      <Sparkles className="w-4 h-4" />
                      Goalie
                    </button>
                  </>
                )}
              </div>
            
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Messages with Drag & Drop */}
        <div 
          className={`flex-1 overflow-y-auto p-3 sm:p-4 space-y-4 relative ${
            dragActive ? 'bg-blue-500/10' : ''
          }`}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          {/* Drag & Drop Hint */}
          {messages.length <= 1 && !dragActive && (
            <div className="text-center py-8">
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-6 max-w-md mx-auto">
                <UploadCloud className="w-12 h-12 text-blue-400 mx-auto mb-3" />
                <h3 className="text-blue-300 font-semibold mb-2">Drop Documents Here!</h3>
                <p className="text-blue-200 text-sm mb-3">
                  Drag & drop receipts, invoices, or bank statements directly into this chat
                </p>
                <div className="flex items-center justify-center gap-2 text-xs text-blue-300">
                  <span>📄</span>
                  <span>📊</span>
                  <span>🏦</span>
                  <span>Supports: PDF, JPG, PNG, CSV</span>
                </div>
              </div>
            </div>
          )}

          {/* Drag Overlay */}
          {dragActive && (
            <div className="absolute inset-0 bg-blue-500/20 border-2 border-dashed border-blue-400 rounded-lg flex items-center justify-center z-10">
              <div className="text-center">
                <UploadCloud className="w-12 h-12 text-blue-400 mx-auto mb-2" />
                <p className="text-blue-300 font-medium">Drop your documents here!</p>
                <p className="text-blue-200 text-sm">I'll process them instantly</p>
              </div>
            </div>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] sm:max-w-[80%] rounded-lg p-3 ${
                  message.type === 'user'
                    ? 'bg-blue-500 text-white'
                    : message.type === 'prime'
                    ? 'bg-yellow-500/20 text-yellow-100 border border-yellow-500/30'
                    : message.type === 'byte'
                    ? 'bg-blue-500/20 text-blue-100 border border-blue-500/30'
                    : message.type === 'crystal'
                    ? 'bg-purple-500/20 text-purple-100 border border-purple-500/30'
                    : message.type === 'tag'
                    ? 'bg-green-500/20 text-green-100 border border-green-500/30'
                    : message.type === 'ledger'
                    ? 'bg-orange-500/20 text-orange-100 border border-orange-500/30'
                    : message.type === 'blitz'
                    ? 'bg-red-500/20 text-red-100 border border-red-500/30'
                    : message.type === 'goalie'
                    ? 'bg-indigo-500/20 text-indigo-100 border border-indigo-500/30'
                    : 'bg-gray-700 text-gray-100'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  {message.type !== 'user' && (
                    <span className="text-xs sm:text-sm font-medium">
                      {getEmployeePersonality(message.type)?.emoji || '🤖'} {getEmployeePersonality(message.type)?.name || 'AI'}
                    </span>
                  )}
                  <span className="text-xs opacity-70">
                    {new Date(message.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <div className="whitespace-pre-wrap text-sm sm:text-base">{message.content}</div>
                
                {/* Transaction Results */}
                {message.transactions && message.transactions.length > 0 && (
                  <div className="mt-3 space-y-2">
                    <div className="text-xs font-medium text-green-300 mb-2">
                      📊 Found {message.transactions.length} transactions:
                    </div>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {message.transactions.map((txn) => (
                        <div key={txn.id} className="flex items-center justify-between bg-white/10 rounded p-2 text-xs">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">{txn.description}</div>
                            <div className="text-gray-300 flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {txn.date}
                              <Tag className="w-3 h-3 ml-2" />
                              {txn.category}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 text-green-300 font-bold">
                            <DollarSign className="w-3 h-3" />
                            {txn.amount.toFixed(2)}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2 mt-2">
                      <button className="px-3 py-1 bg-green-500 hover:bg-green-600 text-white rounded text-xs font-medium transition-colors">
                        ✅ Import All
                      </button>
                      <button className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded text-xs font-medium transition-colors">
                        ✏️ Edit
                      </button>
                    </div>
                  </div>
                )}

                {/* Processing Indicator */}
                {message.processing && (
                  <div className="mt-2 flex items-center gap-2 text-blue-300">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-xs">Processing...</span>
                  </div>
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* File Upload Area for Byte */}
        {activeAI === 'byte' && (
          <div className="p-3 sm:p-4 border-t border-gray-700">
            <div className="border-2 border-dashed border-blue-500/30 rounded-lg p-4 sm:p-6 text-center bg-blue-500/5">
              <UploadCloud className={`text-blue-400 mx-auto mb-2 ${isMobile ? 'w-6 h-6' : 'w-8 h-8'}`} />
              <p className={`text-blue-300 font-medium mb-1 ${isMobile ? 'text-sm' : ''}`}>
                {isMobile ? 'Tap to upload files' : 'Drop files here or click to upload'}
              </p>
              <p className={`text-gray-400 mb-3 ${isMobile ? 'text-xs' : 'text-xs'}`}>
                Max 5 files, 10MB each • Supports: PDF, JPG, PNG, CSV, XLSX
              </p>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.jpg,.jpeg,.png,.csv,.xlsx,.xls,.txt"
                onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className={`bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors ${
                  isMobile ? 'text-sm' : 'text-sm'
                }`}
              >
                {isMobile ? '📁 Upload' : 'Choose Files'}
              </button>
              {uploadedFileCount > 0 && (
                <div className="mt-2">
                  <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-1 rounded-full">
                    {uploadedFileCount} files uploaded
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Input Area */}
        <div className="p-3 sm:p-4 border-t border-gray-700 bg-gray-800/50">
          {/* Chat Input Label */}
          <div className="mb-2">
            <div className="flex items-center gap-2 text-sm text-gray-300">
              <MessageCircle className="w-4 h-4" />
              <span>Chat with {getEmployeePersonality(activeAI)?.name || 'AI'}</span>
              <span className="text-gray-500">•</span>
              <span className="text-gray-500">Or drag files above</span>
            </div>
          </div>
          
          <div className="flex gap-2">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && !isProcessing && handleSendMessage()}
              placeholder={`Type a message or ask ${getEmployeePersonality(activeAI)?.name || 'AI'} to process documents...`}
              className={`flex-1 bg-gray-800 text-white rounded-lg px-3 sm:px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 border border-gray-600 ${
                isMobile ? 'text-sm' : ''
              }`}
              disabled={isProcessing}
            />
            <button
              onClick={handleSendMessage}
              disabled={isProcessing || !inputMessage.trim()}
              className={`bg-blue-500 hover:bg-blue-600 disabled:bg-gray-600 text-white px-4 py-3 rounded-lg transition-colors flex items-center gap-2 ${
                isMobile ? 'text-sm' : ''
              }`}
            >
              {isProcessing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              {isMobile && <span>Send</span>}
            </button>
          </div>
          
          {/* Quick Actions */}
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={() => setActiveAI('byte')}
              className="px-3 py-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 rounded-full text-xs border border-blue-500/30 transition-colors"
            >
              📄 Process Documents
            </button>
            <button
              onClick={() => handleChatWithByte("Show me my recent transactions")}
              className="px-3 py-1 bg-green-500/20 hover:bg-green-500/30 text-green-300 rounded-full text-xs border border-green-500/30 transition-colors"
            >
              📊 View Transactions
            </button>
            <button
              onClick={() => setActiveAI('crystal')}
              className="px-3 py-1 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 rounded-full text-xs border border-purple-500/30 transition-colors"
            >
              🔮 Get Insights
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
