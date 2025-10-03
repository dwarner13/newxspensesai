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
  MessageCircle,
  Plus
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
  const [showPlusMenu, setShowPlusMenu] = useState(false);
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

  // Close plus menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showPlusMenu) {
        const target = event.target as HTMLElement;
        if (!target.closest('.plus-menu-container')) {
          setShowPlusMenu(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showPlusMenu]);

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

  // Process single file with smart PDF handling
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
      let transactions = [];
      let processingMethod = '';

      if (file.type === 'application/pdf') {
        // Smart PDF processing
        const result = await processPDFSmart(file);
        transactions = result.transactions;
        processingMethod = result.method;
      } else if (file.type.startsWith('image/')) {
        // Direct image OCR
        transactions = await processImageOCR(file);
        processingMethod = 'Image OCR';
      } else {
        // CSV/Excel processing
        transactions = await processDataFile(file);
        processingMethod = 'Data Extraction';
      }

      // Update processing message with results
      const resultMessage: ChatMessage = {
        id: `result-${Date.now()}`,
        type: 'byte',
        content: `✅ Found ${transactions.length} transactions in ${file.name}! (${processingMethod})`,
        transactions: transactions,
        timestamp: new Date().toISOString()
      };

      setMessages(prev => prev.map(msg => 
        msg.id === processingMessage.id ? resultMessage : msg
      ));

      toast.success(`Processed ${file.name} - found ${transactions.length} transactions`);
    } catch (error) {
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        type: 'byte',
        content: `❌ Failed to process ${file.name}. ${error instanceof Error ? error.message : 'Please try again.'}`,
        timestamp: new Date().toISOString()
      };

      setMessages(prev => prev.map(msg => 
        msg.id === processingMessage.id ? errorMessage : msg
      ));

      toast.error(`Failed to process ${file.name}`);
    }
  };

  // Smart PDF processing: Text extraction first, then OCR if needed
  const processPDFSmart = async (file: File) => {
    try {
      // Step 1: Try to extract text directly from PDF
      const text = await extractTextFromPDF(file);
      
      if (text && text.length > 100) {
        // Text extraction successful
        const transactions = extractTransactionsFromText(text);
        return {
          transactions,
          method: 'PDF Text Extraction'
        };
      } else {
        // Step 2: Convert PDF to images and OCR
        const images = await convertPDFToImages(file);
        let allTransactions = [];
        
        for (const image of images) {
          const transactions = await processImageOCR(image);
          allTransactions = [...allTransactions, ...transactions];
        }
        
        return {
          transactions: allTransactions,
          method: 'PDF → Image → OCR'
        };
      }
    } catch (error) {
      throw new Error(`PDF processing failed: ${error.message}`);
    }
  };

  // Extract text from PDF using PDF.js
  const extractTextFromPDF = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          // Dynamic import PDF.js
          const pdfjsLib = await import('pdfjs-dist');
          pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;
          
          const typedArray = new Uint8Array(e.target?.result as ArrayBuffer);
          const pdf = await pdfjsLib.getDocument(typedArray).promise;
          
          let fullText = '';
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map((item: any) => item.str).join(' ');
            fullText += pageText + '\n';
          }
          
          resolve(fullText);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  };

  // Convert PDF to images using PDF.js
  const convertPDFToImages = async (file: File): Promise<File[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const pdfjsLib = await import('pdfjs-dist');
          pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;
          
          const typedArray = new Uint8Array(e.target?.result as ArrayBuffer);
          const pdf = await pdfjsLib.getDocument(typedArray).promise;
          
          const images: File[] = [];
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          for (let i = 1; i <= Math.min(pdf.numPages, 5); i++) { // Limit to 5 pages for memory
            const page = await pdf.getPage(i);
            const viewport = page.getViewport({ scale: 2.0 });
            
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            
            await page.render({
              canvasContext: ctx!,
              viewport: viewport
            }).promise;
            
            // Convert canvas to blob
            const blob = await new Promise<Blob>(resolve => canvas.toBlob(resolve!, 'image/png'));
            const imageFile = new File([blob!], `page-${i}.png`, { type: 'image/png' });
            images.push(imageFile);
          }
          
          resolve(images);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  };

  // Process image with Tesseract.js OCR
  const processImageOCR = async (file: File) => {
    try {
      const Tesseract = await import('tesseract.js');
      
      const { data: { text } } = await Tesseract.recognize(file, 'eng', {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
          }
        }
      });
      
      return extractTransactionsFromText(text);
    } catch (error) {
      throw new Error(`Image OCR failed: ${error.message}`);
    }
  };

  // Process CSV/Excel files
  const processDataFile = async (file: File) => {
    // This would parse CSV/Excel files
    // For now, return mock data
    return [
      {
        id: `txn-${Date.now()}-1`,
        date: new Date().toLocaleDateString(),
        description: 'CSV Transaction',
        amount: 25.00,
        category: 'Business'
      }
    ];
  };

  // Extract transactions from text (from Local OCR Tester)
  const extractTransactionsFromText = (text: string) => {
    const transactions = [];
    const seenAmounts = new Set();
    
    // Clean text
    const cleaned = text.replace(/\s+/g, ' ').trim().slice(0, 6000);
    
    // Find dollar amounts
    const dollarAmounts = cleaned.match(/\$(\d+[\d,]*\.?\d*)/g);
    
    if (dollarAmounts) {
      const sortedAmounts = dollarAmounts.sort((a, b) => {
        const amountA = parseFloat(a.replace(/[$,]/g, ''));
        const amountB = parseFloat(b.replace(/[$,]/g, ''));
        return amountB - amountA;
      });
      
      sortedAmounts.forEach((match) => {
        const amount = parseFloat(match.replace(/[$,]/g, ''));
        
        if (amount > 0.01 && amount < 10000 && !seenAmounts.has(amount)) {
          seenAmounts.add(amount);
          
          // Find context around this amount
          const amountIndex = cleaned.indexOf(match);
          const beforeText = cleaned.substring(Math.max(0, amountIndex - 80), amountIndex).trim();
          
          // Extract description
          const words = beforeText.split(/\s+/).filter(word => 
            word.length > 2 && 
            !word.match(/^[^\w]*$/) && 
            !word.match(/^\d+$/)
          );
          
          const description = words.length > 0 
            ? words.slice(-3).join(' ') 
            : `Transaction - $${amount}`;
          
          transactions.push({
            id: `txn-${Date.now()}-${transactions.length}`,
            date: new Date().toLocaleDateString(),
            description: description,
            amount: amount,
            category: 'Uncategorized'
          });
        }
      });
    }
    
    return transactions.slice(0, 20); // Limit to 20 transactions
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
          {/* Subtle Drag & Drop Hint */}
          {messages.length <= 1 && !dragActive && (
            <div className="text-center py-12">
              <div className="text-gray-500">
                <UploadCloud className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Drop documents here or use the + button below</p>
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

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.jpg,.jpeg,.png,.csv,.xlsx,.xls,.txt"
          onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
          className="hidden"
        />

        {/* ChatGPT-Style Input Area */}
        <div className="p-4 border-t border-gray-700 bg-gray-900">
          <div className="max-w-4xl mx-auto">
            <div className="relative plus-menu-container">
              {/* Main Input Container */}
              <div className="flex items-end gap-3 bg-gray-800 rounded-2xl border border-gray-600 hover:border-gray-500 transition-colors p-3">
                {/* Plus Button */}
                <button
                  onClick={() => setShowPlusMenu(!showPlusMenu)}
                  className="flex-shrink-0 w-8 h-8 bg-gray-700 hover:bg-gray-600 rounded-full flex items-center justify-center transition-colors"
                >
                  <Plus className="w-4 h-4 text-gray-300" />
                </button>

                {/* Text Input */}
                <div className="flex-1 min-w-0">
                  <textarea
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey && !isProcessing) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    placeholder={`Message ${getEmployeePersonality(activeAI)?.name || 'AI'}...`}
                    className="w-full bg-transparent text-white placeholder-gray-400 resize-none border-none outline-none text-sm leading-6 max-h-32"
                    rows={1}
                    disabled={isProcessing}
                    style={{
                      height: 'auto',
                      minHeight: '24px'
                    }}
                    onInput={(e) => {
                      const target = e.target as HTMLTextAreaElement;
                      target.style.height = 'auto';
                      target.style.height = target.scrollHeight + 'px';
                    }}
                  />
                </div>

                {/* Send Button */}
                <button
                  onClick={handleSendMessage}
                  disabled={isProcessing || !inputMessage.trim()}
                  className="flex-shrink-0 w-8 h-8 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-600 rounded-full flex items-center justify-center transition-colors"
                >
                  {isProcessing ? (
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                  ) : (
                    <Send className="w-4 h-4 text-white" />
                  )}
                </button>
              </div>

              {/* Plus Menu Dropdown */}
              {showPlusMenu && (
                <div className="absolute bottom-full left-0 mb-2 bg-gray-800 border border-gray-600 rounded-xl shadow-xl z-10 min-w-64">
                  <div className="p-2">
                    <div className="text-xs text-gray-400 mb-2 px-2">Upload & Actions</div>
                    
                    {/* Upload Options */}
                    <button
                      onClick={() => {
                        fileInputRef.current?.click();
                        setShowPlusMenu(false);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-700 rounded-lg transition-colors text-left"
                    >
                      <UploadCloud className="w-5 h-5 text-blue-400" />
                      <div>
                        <div className="text-white text-sm font-medium">Upload Documents</div>
                        <div className="text-gray-400 text-xs">PDF, JPG, PNG, CSV files</div>
                      </div>
                    </button>

                    <button
                      onClick={() => {
                        setActiveAI('byte');
                        setShowPlusMenu(false);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-700 rounded-lg transition-colors text-left"
                    >
                      <FileText className="w-5 h-5 text-green-400" />
                      <div>
                        <div className="text-white text-sm font-medium">Process Receipts</div>
                        <div className="text-gray-400 text-xs">OCR & extract transactions</div>
                      </div>
                    </button>

                    <button
                      onClick={() => {
                        setActiveAI('crystal');
                        setShowPlusMenu(false);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-700 rounded-lg transition-colors text-left"
                    >
                      <Brain className="w-5 h-5 text-purple-400" />
                      <div>
                        <div className="text-white text-sm font-medium">Get Insights</div>
                        <div className="text-gray-400 text-xs">Analyze spending patterns</div>
                      </div>
                    </button>

                    <button
                      onClick={() => {
                        setActiveAI('tag');
                        setShowPlusMenu(false);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-700 rounded-lg transition-colors text-left"
                    >
                      <Tag className="w-5 h-5 text-orange-400" />
                      <div>
                        <div className="text-white text-sm font-medium">Auto-Categorize</div>
                        <div className="text-gray-400 text-xs">Smart transaction tagging</div>
                      </div>
                    </button>

                    <div className="border-t border-gray-600 my-2"></div>

                    <button
                      onClick={() => {
                        handleChatWithByte("Show me my recent transactions");
                        setShowPlusMenu(false);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-700 rounded-lg transition-colors text-left"
                    >
                      <DollarSign className="w-5 h-5 text-green-400" />
                      <div>
                        <div className="text-white text-sm font-medium">View Transactions</div>
                        <div className="text-gray-400 text-xs">Browse your financial data</div>
                      </div>
                    </button>

                    <button
                      onClick={() => {
                        setActiveAI('prime');
                        setShowPlusMenu(false);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-700 rounded-lg transition-colors text-left"
                    >
                      <Sparkles className="w-5 h-5 text-yellow-400" />
                      <div>
                        <div className="text-white text-sm font-medium">AI Team Overview</div>
                        <div className="text-gray-400 text-xs">Meet all AI employees</div>
                      </div>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Subtle Hint */}
            <div className="text-center mt-2">
              <span className="text-xs text-gray-500">
                Drag files anywhere in the chat or use the + button
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
