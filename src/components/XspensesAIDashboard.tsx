import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Home, BarChart, Target, Heart, Music, Trophy, BookOpen, Users,
  Settings, Bell, User, Shield, ChevronLeft, CalendarIcon, TrendingDown,
  Eye, Download, Filter, Star, Bookmark, Share2, BarChart3, LineChart,
  PieChartIcon, TargetIcon, Brain, Sparkles, Crown, Gift, Clock,
  AlertCircle, CheckCircle, Info, PlusCircle, MinusCircle, ArrowUpDown,
  Headphones, Upload, Receipt, DollarSign, HelpCircle,
  LogOut, CreditCard, Briefcase, TrendingUp, Play, Pause, SkipBack,
  SkipForward, Volume2, Mic, Smile, Frown, Meh,
  Zap, Award, Coffee, ShoppingBag, Car, Plane, Utensils, PiggyBank,
  FileText, Camera, Mail, Edit3, Database, Cpu,
  CheckCircle2, XCircle, Activity, MessageCircle
} from 'lucide-react';
// @ts-ignore
import { AIService } from '../services/AIService';

// Type definitions
interface UploadedFile {
  id: number;
  name: string;
  size: number;
  type: string;
  uploadMethod: string;
  status: string;
  progress: number;
  uploadedAt: Date;
  processedAt?: Date;
  documentId?: number;
  transactions?: Transaction[];
  aiInsights?: string[];
}

interface Transaction {
  id: number;
  merchant: string;
  amount: number;
  category: string;
  date: Date;
  confidence: number;
  needsCorrection: boolean;
}

interface SystemStatus {
  aiStatus: 'online' | 'offline';
  processingSpeed: string;
  queueLength: number;
  privacyStatus: string;
}

interface AIQuestion {
  id: number;
  text: string;
}

interface Correction {
  category: string;
  subcategory: string;
}

interface AICommentary {
  id: string;
  message: string;
  type: 'thinking' | 'processing' | 'insight' | 'complete' | 'question';
  timestamp: Date;
  step?: string;
  emoji?: string;
}

interface ProcessingStep {
  id: string;
  name: string;
  status: 'pending' | 'active' | 'complete' | 'error';
  progress: number;
  message: string;
  emoji: string;
}

const XspensesAIDashboard = () => {
  // Functional state management
  const [activeTab, setActiveTab] = useState('smart-import');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [processingQueue, setProcessingQueue] = useState<UploadedFile[]>([]);
  const [processedDocuments, setProcessedDocuments] = useState<UploadedFile[]>([]);
  const [aiLearningQuestions, setAiLearningQuestions] = useState<AIQuestion[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [systemStatus, setSystemStatus] = useState<SystemStatus>({
    aiStatus: 'offline',
    processingSpeed: '0s avg',
    queueLength: 0,
    privacyStatus: 'processing-locally'
  });
  const [processingProgress, setProcessingProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentProcessingFile, setCurrentProcessingFile] = useState<UploadedFile | null>(null);
  const [aiCommentary, setAiCommentary] = useState('');
  const [correctionsNeeded, setCorrectionsNeeded] = useState<Transaction[]>([]);
  const [aiAccuracy, setAiAccuracy] = useState(0);
  const [documentsProcessedToday, setDocumentsProcessedToday] = useState(0);
  const [backendConnected, setBackendConnected] = useState(false);

  // New AI Commentary and Processing Features
  const [aiCommentaryLog, setAiCommentaryLog] = useState<AICommentary[]>([]);
  const [processingSteps, setProcessingSteps] = useState<ProcessingStep[]>([]);
  const [aiIsThinking, setAiIsThinking] = useState(false);
  const [userChatMessage, setUserChatMessage] = useState('');
  const [chatMessages, setChatMessages] = useState<Array<{type: 'user' | 'ai', message: string, timestamp: Date}>>([]);
  const [showChatInterface, setShowChatInterface] = useState(false);

  // Floating AI Chatbot State
  const [showFloatingChat, setShowFloatingChat] = useState(false);
  const [floatingChatMessages, setFloatingChatMessages] = useState<Array<{type: 'user' | 'ai', message: string, timestamp: Date}>>([]);
  const [floatingChatInput, setFloatingChatInput] = useState('');

  // File upload refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragDropRef = useRef<HTMLDivElement>(null);

  // Check backend connection on component mount
  useEffect(() => {
    checkBackendConnection();
    loadInitialData();
  }, []);

  const checkBackendConnection = async () => {
    try {
      const health = await AIService.healthCheck();
      setBackendConnected(true);
      setSystemStatus(prev => ({ ...prev, aiStatus: 'online' }));
      console.log('✅ Backend connected:', health);
    } catch (error) {
      setBackendConnected(false);
      setSystemStatus(prev => ({ ...prev, aiStatus: 'offline' }));
      console.log('❌ Backend offline:', (error as Error).message);
    }
  };

  const loadInitialData = async () => {
    try {
      // Load analytics data
      const analytics = await AIService.getAnalytics();
      if (analytics.learning_analytics) {
        setAiAccuracy(analytics.learning_analytics.accuracy || 0);
      }
      
      // Load document analytics
      if (analytics.document_analytics) {
        setDocumentsProcessedToday(analytics.document_analytics.documents_processed_today || 0);
      }
    } catch (error) {
      console.log('📊 Using mock data - backend not available');
      // Use mock data if backend is not available
      setAiAccuracy(94);
      setDocumentsProcessedToday(0);
    }
  };

  // Functional data structures
  const functionalData = {
    // Smart Import Workspace
    smartImport: {
      uploadMethods: [
        {
          id: 'bank-statement',
          name: 'Upload Bank Statement',
          icon: FileText,
          description: 'PDF, CSV, Excel files',
          color: 'from-blue-600 to-purple-600',
          acceptedTypes: '.pdf,.csv,.xlsx,.xls'
        },
        {
          id: 'receipt-scan',
          name: 'Scan Receipt',
          icon: Camera,
          description: 'Camera or image upload',
          color: 'from-green-600 to-emerald-600',
          acceptedTypes: '.jpg,.jpeg,.png'
        },
        {
          id: 'email-processing',
          name: 'Email Processing',
          icon: Mail,
          description: 'Forward emails to AI',
          color: 'from-orange-600 to-red-600',
          acceptedTypes: 'email'
        },
        {
          id: 'quick-add',
          name: 'Quick Add',
          icon: Edit3,
          description: 'Manual entry with AI assist',
          color: 'from-purple-600 to-pink-600',
          acceptedTypes: 'manual'
        }
      ],
      processingStats: {
        documentsProcessedToday: documentsProcessedToday,
        aiAccuracy: aiAccuracy,
        averageProcessingTime: '2.3s',
        totalDocumentsProcessed: 127
      }
    },
    // AI Learning Panel
    aiLearning: {
      questions: aiLearningQuestions,
      patterns: [
        { merchant: 'Starbucks Downtown', category: 'Business', confidence: 87, needsConfirmation: true },
        { merchant: 'Amazon.com', category: 'Shopping', confidence: 94, needsConfirmation: false },
        { merchant: 'Shell Gas Station', category: 'Transportation', confidence: 91, needsConfirmation: false }
      ],
      learningStatus: {
        userPatternsLearned: 23,
        merchantCategories: 156,
        accuracyImprovement: '+12% this month'
      }
    },
    // Quick Results Display
    results: {
      recentTransactions: recentTransactions,
      categorizationResults: {
        totalProcessed: 47,
        autoCategorized: 42,
        needsCorrection: 5,
        accuracy: '89%'
      },
      correctionsNeeded: correctionsNeeded
    },
    // Document History
    documentHistory: {
      processedDocuments: processedDocuments,
      processingStatus: {
        success: 45,
        failed: 2,
        pending: 0
      }
    }
  };

  // Functional handlers
  const handleFileUpload = async (files: FileList, uploadMethod: string) => {
    const newFiles: UploadedFile[] = Array.from(files).map(file => ({
      id: Date.now() + Math.random(),
      name: file.name,
      size: file.size,
      type: file.type,
      uploadMethod,
      status: 'queued',
      progress: 0,
      uploadedAt: new Date()
    }));

    setUploadedFiles(prev => [...prev, ...newFiles]);
    setProcessingQueue(prev => [...prev, ...newFiles]);
    setSystemStatus(prev => ({ ...prev, queueLength: prev.queueLength + files.length }));

    // Start AI processing simulation for each file
    for (const file of newFiles) {
      await simulateAIProcessing(file.name);
      
      // Update file status after processing
      const processedFile: UploadedFile = {
        ...file,
        status: 'completed',
        processedAt: new Date(),
        transactions: generateMockTransactions(),
        aiInsights: generateMockInsights()
      };

      setProcessedDocuments(prev => [processedFile, ...prev]);
      setRecentTransactions(prev => [...generateMockTransactions(), ...prev]);
      setDocumentsProcessedToday(prev => prev + 1);
      
      // Update system status
      setSystemStatus(prev => ({ 
        ...prev, 
        queueLength: Math.max(0, prev.queueLength - 1),
        processingSpeed: '2.3s avg'
      }));
    }
  };

  const processFilesWithBackend = async (fileObjects: UploadedFile[], actualFiles: FileList) => {
    for (let i = 0; i < fileObjects.length; i++) {
      const fileObj = fileObjects[i];
      const actualFile = actualFiles[i];
      
      setCurrentProcessingFile(fileObj);
      setIsProcessing(true);
      setProcessingProgress(0);
      setAiCommentary('Connecting to AI backend...');

      try {
        // Upload to backend
        setProcessingProgress(25);
        setAiCommentary('Uploading document to AI...');
        
        const uploadResult = await AIService.uploadDocument(actualFile);
        
        setProcessingProgress(50);
        setAiCommentary('AI is analyzing document structure...');
        
        // Get transactions from uploaded document
        if (uploadResult.document_id) {
          setProcessingProgress(75);
          setAiCommentary('Extracting and categorizing transactions...');
          
          const transactions = await AIService.getTransactions(uploadResult.document_id);
          
          setProcessingProgress(100);
          setAiCommentary('Processing complete! AI has categorized your transactions.');
          
          // Update processed documents
          const processedFile: UploadedFile = {
            ...fileObj,
            status: 'completed',
            processedAt: new Date(),
            documentId: uploadResult.document_id,
            transactions: transactions.transactions || [],
            aiInsights: uploadResult.insights || []
          };

          setProcessedDocuments(prev => [processedFile, ...prev]);
          setRecentTransactions(prev => [...(transactions.transactions || []), ...prev]);
          setDocumentsProcessedToday(prev => prev + 1);
          
          // Update system status
          setSystemStatus(prev => ({ 
            ...prev, 
            queueLength: Math.max(0, prev.queueLength - 1),
            processingSpeed: '2.3s avg'
          }));
        }
        
      } catch (error) {
        console.error('Backend processing error:', error);
        setAiCommentary('Processing failed. Using local processing...');
        
        // Fallback to mock processing
        await processFiles([fileObj]);
      }
    }

    setIsProcessing(false);
    setCurrentProcessingFile(null);
    setProcessingProgress(0);
    setAiCommentary('');
  };

  const processFiles = async (files: UploadedFile[]) => {
    for (const file of files) {
      setCurrentProcessingFile(file);
      setIsProcessing(true);
      setProcessingProgress(0);
      setAiCommentary('Initializing AI analysis...');

      // Simulate processing steps
      const steps = [
        'Reading document structure...',
        'Extracting transaction data...',
        'Applying AI categorization...',
        'Learning from patterns...',
        'Generating insights...',
        'Finalizing results...'
      ];

      for (let i = 0; i < steps.length; i++) {
        setAiCommentary(steps[i]);
        setProcessingProgress((i + 1) * (100 / steps.length));
        await new Promise(resolve => setTimeout(resolve, 800));
      }

      // Complete processing
      const processedFile: UploadedFile = {
        ...file,
        status: 'completed',
        processedAt: new Date(),
        transactions: generateMockTransactions(),
        aiInsights: generateMockInsights()
      };

      setProcessedDocuments(prev => [processedFile, ...prev]);
      setRecentTransactions(prev => [...processedFile.transactions, ...prev]);
      setDocumentsProcessedToday(prev => prev + 1);
      setSystemStatus(prev => ({ 
        ...prev, 
        queueLength: Math.max(0, prev.queueLength - 1) 
      }));
    }

    setIsProcessing(false);
    setCurrentProcessingFile(null);
    setProcessingProgress(0);
    setAiCommentary('');
  };

  const generateMockTransactions = (): Transaction[] => {
    const merchants = ['Starbucks', 'Amazon', 'Shell', 'Walmart', 'Netflix'];
    const categories = ['Food & Dining', 'Shopping', 'Transportation', 'Entertainment'];
    
    return Array.from({ length: Math.floor(Math.random() * 10) + 5 }, (_, i) => ({
      id: Date.now() + i,
      merchant: merchants[Math.floor(Math.random() * merchants.length)],
      amount: Math.floor(Math.random() * 100) + 5,
      category: categories[Math.floor(Math.random() * categories.length)],
      date: new Date(),
      confidence: Math.floor(Math.random() * 20) + 80,
      needsCorrection: Math.random() > 0.8
    }));
  };

  const generateMockInsights = (): string[] => {
    return [
      'Found 3 potential business deductions',
      'Spending pattern shows 15% increase in dining',
      'AI confidence improved by 2% on similar transactions'
    ];
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileUpload(files, 'drag-drop');
    }
  };

  const handleCorrection = async (transactionId: number, correction: Correction) => {
    try {
      if (backendConnected) {
        await AIService.correctCategory(transactionId, correction);
        setAiAccuracy(prev => Math.min(100, prev + 1));
      } else {
        // Mock correction
        setAiAccuracy(prev => Math.min(100, prev + 1));
      }
      setCorrectionsNeeded(prev => prev.filter(t => t.id !== transactionId));
    } catch (error) {
      console.error('Correction error:', error);
    }
  };

  const handleAiQuestion = (questionId: number, answer: string) => {
    setAiLearningQuestions(prev => prev.filter(q => q.id !== questionId));
    setAiAccuracy(prev => Math.min(100, prev + 2));
  };

  // AI Commentary and Processing Functions
  const addAICommentary = (message: string, type: AICommentary['type'], step?: string, emoji?: string) => {
    const commentary: AICommentary = {
      id: Date.now().toString(),
      message,
      type,
      timestamp: new Date(),
      step,
      emoji
    };
    setAiCommentaryLog(prev => [...prev, commentary]);
  };

  const initializeProcessingSteps = () => {
    const steps: ProcessingStep[] = [
      {
        id: 'reading',
        name: 'Reading document',
        status: 'pending',
        progress: 0,
        message: 'Analyzing file structure...',
        emoji: '⏳'
      },
      {
        id: 'extracting',
        name: 'Extracting transactions',
        status: 'pending',
        progress: 0,
        message: 'Identifying transaction data...',
        emoji: '📊'
      },
      {
        id: 'analyzing',
        name: 'Analyzing patterns',
        status: 'pending',
        progress: 0,
        message: 'Finding spending patterns...',
        emoji: '🧠'
      },
      {
        id: 'categorizing',
        name: 'Categorizing expenses',
        status: 'pending',
        progress: 0,
        message: 'Applying smart categories...',
        emoji: '🏷️'
      },
      {
        id: 'learning',
        name: 'Learning preferences',
        status: 'pending',
        progress: 0,
        message: 'Updating AI knowledge...',
        emoji: '📚'
      },
      {
        id: 'complete',
        name: 'Results ready',
        status: 'pending',
        progress: 0,
        message: 'Preparing your insights...',
        emoji: '✨'
      }
    ];
    setProcessingSteps(steps);
  };

  const updateProcessingStep = (stepId: string, status: ProcessingStep['status'], progress: number, message: string) => {
    setProcessingSteps(prev => prev.map(step => 
      step.id === stepId 
        ? { ...step, status, progress, message }
        : step
    ));
  };

  const simulateAIProcessing = async (fileName: string) => {
    setIsProcessing(true);
    setAiIsThinking(true);
    initializeProcessingSteps();
    setAiCommentaryLog([]);
    
    // Initial AI commentary
    addAICommentary(`I see a ${fileName} file! Let me take a look at what we're working with... 🧐`, 'thinking');
    
    // Step 1: Reading document
    await new Promise(resolve => setTimeout(resolve, 1000));
    updateProcessingStep('reading', 'active', 25, 'Reading document structure...');
    addAICommentary(`Interesting! This looks like a bank statement with multiple transactions. Let me scan through it... 📄`, 'processing', 'reading');
    
    await new Promise(resolve => setTimeout(resolve, 1500));
    updateProcessingStep('reading', 'complete', 100, 'Document read successfully');
    addAICommentary(`Found 247 transactions! That's quite a busy month. I can see transactions from Chase Bank, various merchants, and some interesting patterns emerging... 🏦`, 'insight', 'reading', '💡');
    
    // Step 2: Extracting transactions
    updateProcessingStep('extracting', 'active', 0, 'Extracting transaction data...');
    addAICommentary(`Now I'm pulling out all the transaction details - dates, amounts, merchants, and descriptions. This is where the magic happens! ✨`, 'processing', 'extracting');
    
    for (let i = 0; i <= 100; i += 10) {
      await new Promise(resolve => setTimeout(resolve, 100));
      updateProcessingStep('extracting', 'active', i, `Extracted ${i}% of transactions...`);
      if (i % 30 === 0) {
        addAICommentary(`Transaction ${i}: Found a Starbucks purchase at 8:30 AM - looks like your morning coffee routine! ☕`, 'insight', 'extracting');
      }
    }
    updateProcessingStep('extracting', 'complete', 100, 'All transactions extracted');
    
    // Step 3: Analyzing patterns
    updateProcessingStep('analyzing', 'active', 0, 'Analyzing spending patterns...');
    addAICommentary(`Now I'm looking for patterns in your spending. I can see lots of coffee shops, some business expenses, and interesting timing patterns... 🤔`, 'processing', 'analyzing');
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    updateProcessingStep('analyzing', 'complete', 100, 'Patterns analyzed');
    addAICommentary(`Fascinating! I found that you spend about $87/month on coffee, mostly in the mornings. Also spotted $347 in potential business deductions you might have missed! 💼`, 'insight', 'analyzing', '🎯');
    
    // Step 4: Categorizing expenses
    updateProcessingStep('categorizing', 'active', 0, 'Categorizing expenses...');
    addAICommentary(`Time to put everything in the right buckets! I'm using my AI knowledge to categorize each transaction intelligently... 🏷️`, 'processing', 'categorizing');
    
    for (let i = 0; i <= 100; i += 5) {
      await new Promise(resolve => setTimeout(resolve, 50));
      updateProcessingStep('categorizing', 'active', i, `Categorized ${i}% of transactions...`);
      if (i % 25 === 0) {
        const categories = ['Food & Drink', 'Transportation', 'Business', 'Entertainment'];
        const randomCategory = categories[Math.floor(Math.random() * categories.length)];
        addAICommentary(`Just categorized a ${randomCategory} transaction with 94% confidence! 🎯`, 'insight', 'categorizing');
      }
    }
    updateProcessingStep('categorizing', 'complete', 100, 'All transactions categorized');
    
    // Step 5: Learning preferences
    updateProcessingStep('learning', 'active', 0, 'Learning your preferences...');
    addAICommentary(`I'm learning from your spending patterns to get even better at categorizing your future transactions! 📚`, 'processing', 'learning');
    
    await new Promise(resolve => setTimeout(resolve, 1500));
    updateProcessingStep('learning', 'complete', 100, 'Preferences updated');
    addAICommentary(`Perfect! I've updated my knowledge base. I'm now 94% accurate for your spending patterns! 🧠`, 'insight', 'learning', '📈');
    
    // Step 6: Complete
    updateProcessingStep('complete', 'active', 0, 'Preparing results...');
    addAICommentary(`Almost done! Let me prepare your personalized insights and recommendations... 🎁`, 'processing', 'complete');
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    updateProcessingStep('complete', 'complete', 100, 'Results ready!');
    addAICommentary(`🎉 All done! I processed 247 transactions and found some great insights for you. Check out the results below!`, 'complete', 'complete', '🎊');
    
    setIsProcessing(false);
    setAiIsThinking(false);
  };

  const handleUserChatMessage = async (message: string) => {
    if (!message.trim()) return;
    
    // Add user message to chat
    const userMessage = { type: 'user' as const, message, timestamp: new Date() };
    setChatMessages(prev => [...prev, userMessage]);
    setUserChatMessage('');
    
    // Simulate AI response
    setTimeout(() => {
      const aiResponse = { 
        type: 'ai' as const, 
        message: `I'm analyzing your question about "${message}". Let me check your recent transactions and provide insights...`, 
        timestamp: new Date() 
      };
      setChatMessages(prev => [...prev, aiResponse]);
    }, 1000);
  };

  const handleFloatingChatMessage = async (message: string) => {
    if (!message.trim()) return;

    // Add user message to floating chat
    const userMessage = { type: 'user' as const, message, timestamp: new Date() };
    setFloatingChatMessages(prev => [...prev, userMessage]);
    setFloatingChatInput('');

    // Generate contextual AI response based on message content
    let aiResponse = '';
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('upload') || lowerMessage.includes('file')) {
      aiResponse = "I can help you upload documents! You can drag and drop files into the upload zone, or use the camera to scan receipts. What type of document are you looking to process? 📄";
    } else if (lowerMessage.includes('categorize') || lowerMessage.includes('category')) {
      aiResponse = "I automatically categorize your transactions using AI! I look at merchant names, amounts, and patterns to assign categories. You can always correct my categorizations if I make mistakes. 🏷️";
    } else if (lowerMessage.includes('insight') || lowerMessage.includes('analysis')) {
      aiResponse = "I analyze your spending patterns and provide insights like 'Your coffee spending increased 23% this month' or 'I found $347 in potential business deductions.' Would you like me to analyze your recent transactions? 📊";
    } else if (lowerMessage.includes('help') || lowerMessage.includes('how')) {
      aiResponse = "I'm here to help! I can process documents, categorize transactions, provide insights, and answer questions about your finances. Just ask me anything! 🤖";
    } else if (lowerMessage.includes('processing') || lowerMessage.includes('queue')) {
      aiResponse = "I process documents in real-time! You can watch me work through the AI Processing Theater. If something gets stuck, I'll let you know and provide retry options. ⚡";
    } else {
      aiResponse = "That's an interesting question! I'm your AI financial assistant, and I'm here to help with document processing, transaction categorization, and financial insights. What would you like to know more about? 💡";
    }

    // Add AI response with delay for realistic feel
    setTimeout(() => {
      const aiMessage = { type: 'ai' as const, message: aiResponse, timestamp: new Date() };
      setFloatingChatMessages(prev => [...prev, aiMessage]);
    }, 800);
  };

  // Navigation items - functional focus
  const navigationItems = [
    {
      id: 'smart-import',
      name: 'Smart Import AI',
      icon: Upload,
      description: 'Document processing & AI analysis',
      isPrimary: true
    },
    {
      id: 'analytics',
      name: 'Analytics',
      icon: BarChart3,
      description: 'Data visualization & insights'
    },
    {
      id: 'goals',
      name: 'Goals',
      icon: Target,
      description: 'Financial goal tracking'
    },
    {
      id: 'podcasts',
      name: 'Podcasts',
      icon: Headphones,
      description: 'Personal financial podcasts'
    },
    {
      id: 'ai-chat',
      name: 'AI Chat',
      icon: MessageCircle,
      description: 'Financial therapy & advice'
    },
    {
      id: 'business',
      name: 'Business',
      icon: Briefcase,
      description: 'Business expense tools'
    },
    {
      id: 'settings',
      name: 'Settings',
      icon: Settings,
      description: 'Account & AI preferences'
    }
  ];

  const renderSmartImportWorkspace = () => (
    <div className="smart-import-dashboard space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white mb-2">Smart Import AI</h1>
            <p className="text-gray-300">Ready to process your documents</p>
            {!backendConnected && (
              <div className="mt-2 flex items-center text-yellow-400 text-sm">
                <AlertCircle className="w-4 h-4 mr-2" />
                Backend offline - using local processing
              </div>
            )}
          </div>
          <div className="flex items-center space-x-4 text-sm">
            <div className="bg-green-900/50 text-green-400 px-3 py-1 rounded-full">
              Documents processed today: {documentsProcessedToday}
            </div>
            <div className="bg-blue-900/50 text-blue-400 px-3 py-1 rounded-full">
              AI Learning: {aiAccuracy}% accuracy
            </div>
          </div>
        </div>
      </div>

      {/* Upload Center (existing) */}
      <div className="bg-gray-900 rounded-xl p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Upload Center</h2>
        
        {/* Drag & Drop Zone */}
        <div
          ref={dragDropRef}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          className="border-2 border-dashed border-gray-600 rounded-xl p-8 text-center hover:border-blue-500 transition-colors cursor-pointer"
        >
          <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">Drop files here or click to upload</h3>
          <p className="text-gray-400 mb-4">Supports PDF, CSV, Excel, and image files</p>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
          >
            Choose Files
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.csv,.xlsx,.xls,.jpg,.jpeg,.png"
            onChange={(e) => e.target.files && handleFileUpload(e.target.files, 'file-input')}
            className="hidden"
          />
        </div>
      </div>

      {/* AI Theater (new position) */}
      <div className="ai-theater-main bg-gray-900 rounded-xl p-6">
        <div className="theater-header flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <span className="text-2xl">🎭</span>
            <span className="text-lg font-semibold text-white">AI Processing Theater</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
            <span className="ai-status text-green-400 text-sm font-medium">🤖 AI Ready</span>
          </div>
        </div>
        <div className="theater-content">
          <div className="ai-message bg-gradient-to-r from-blue-900/50 to-purple-900/50 rounded-lg p-4 border border-blue-700 text-center">
            <div className="ai-avatar text-4xl mb-3 animate-pulse">🤖</div>
            <p className="text-white text-sm font-medium mb-2">
              "Hi! I'm your AI assistant. Upload a document above and watch me work my magic!"
            </p>
            <div className="text-gray-300 text-xs">
              ✨ I can categorize expenses, find insights, and learn your preferences
            </div>
          </div>
        </div>
      </div>

      {/* Upload Options Grid (existing) */}
      <div className="bg-gray-900 rounded-xl p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Upload Options</h2>
        <div className="grid grid-cols-2 gap-4">
          {functionalData.smartImport.uploadMethods.map((method) => (
            <button
              key={method.id}
              className="bg-gray-800 hover:bg-gray-700 rounded-lg p-4 text-left transition-colors"
            >
              <method.icon className="w-6 h-6 text-blue-400 mb-2" />
              <h4 className="font-medium text-white mb-1">{method.name}</h4>
              <p className="text-sm text-gray-400">{method.description}</p>
            </button>
          ))}
        </div>

        {/* Demo Button */}
        <div className="mt-6 p-4 bg-gradient-to-r from-purple-900/50 to-blue-900/50 rounded-lg border border-purple-700">
          <h4 className="text-lg font-medium text-white mb-2">🎭 AI Processing Demo</h4>
          <p className="text-gray-300 text-sm mb-3">
            Experience the AI processing theater with real-time commentary and interactive chat!
          </p>
          <button
            onClick={() => simulateAIProcessing('demo-bank-statement.pdf')}
            disabled={isProcessing}
            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:from-gray-600 disabled:to-gray-700 text-white px-6 py-2 rounded-lg font-medium transition-all duration-200 transform hover:scale-105 disabled:transform-none"
          >
            {isProcessing ? 'Processing...' : '🚀 Start AI Demo'}
          </button>
        </div>
      </div>

      {/* AI Commentary Theater - Shows when processing */}
      {(isProcessing || aiCommentaryLog.length > 0) && (
        <div className="bg-gray-900 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold text-white">AI Processing Theater</h3>
            <div className="flex items-center space-x-2">
              {aiIsThinking && (
                <div className="flex items-center text-blue-400 text-sm">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400 mr-2"></div>
                  AI is thinking...
                </div>
              )}
              <button
                onClick={() => setShowChatInterface(!showChatInterface)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-lg text-sm"
              >
                {showChatInterface ? 'Hide Chat' : 'Chat with AI'}
              </button>
            </div>
          </div>

          {/* Processing Steps */}
          {processingSteps.length > 0 && (
            <div className="mb-6">
              <h4 className="text-lg font-medium text-white mb-3">Processing Steps</h4>
              <div className="space-y-3">
                {processingSteps.map((step) => (
                  <div key={step.id} className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      step.status === 'complete' ? 'bg-green-600 text-white' :
                      step.status === 'active' ? 'bg-blue-600 text-white' :
                      step.status === 'error' ? 'bg-red-600 text-white' :
                      'bg-gray-600 text-gray-300'
                    }`}>
                      {step.status === 'complete' ? '✓' : step.emoji}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-white font-medium">{step.name}</span>
                        <span className="text-gray-400 text-sm">{step.progress}%</span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2 mt-1">
                        <div 
                          className={`h-2 rounded-full transition-all duration-300 ${
                            step.status === 'complete' ? 'bg-green-500' :
                            step.status === 'active' ? 'bg-blue-500' :
                            step.status === 'error' ? 'bg-red-500' :
                            'bg-gray-600'
                          }`}
                          style={{ width: `${step.progress}%` }}
                        ></div>
                      </div>
                      <p className="text-gray-400 text-sm mt-1">{step.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI Commentary Log */}
          <div className="max-h-64 overflow-y-auto space-y-3">
            {aiCommentaryLog.map((commentary) => (
              <motion.div
                key={commentary.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-3 rounded-lg ${
                  commentary.type === 'thinking' ? 'bg-blue-900/50 border border-blue-700' :
                  commentary.type === 'processing' ? 'bg-gray-800 border border-gray-600' :
                  commentary.type === 'insight' ? 'bg-green-900/50 border border-green-700' :
                  commentary.type === 'complete' ? 'bg-purple-900/50 border border-purple-700' :
                  'bg-yellow-900/50 border border-yellow-700'
                }`}
              >
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold">
                    AI
                  </div>
                  <div className="flex-1">
                    <p className="text-white">{commentary.message}</p>
                    <p className="text-gray-400 text-xs mt-1">
                      {commentary.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Chat Interface */}
          {showChatInterface && (
            <div className="mt-6 border-t border-gray-700 pt-4">
              <h4 className="text-lg font-medium text-white mb-3">Chat with AI</h4>
              
              {/* Chat Messages */}
              <div className="max-h-48 overflow-y-auto space-y-3 mb-4">
                {chatMessages.map((msg, index) => (
                  <div key={index} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-xs p-3 rounded-lg ${
                      msg.type === 'user' 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-800 text-white'
                    }`}>
                      <p className="text-sm">{msg.message}</p>
                      <p className="text-xs opacity-70 mt-1">
                        {msg.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}
                {aiIsThinking && (
                  <div className="flex justify-start">
                    <div className="bg-gray-800 text-white p-3 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span className="text-sm">AI is thinking...</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Chat Input */}
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={userChatMessage}
                  onChange={(e) => setUserChatMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleUserChatMessage(userChatMessage)}
                  placeholder="Ask the AI about your transactions..."
                  className="flex-1 bg-gray-800 text-white px-3 py-2 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
                />
                <button
                  onClick={() => handleUserChatMessage(userChatMessage)}
                  disabled={!userChatMessage.trim()}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Send
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Processing Status */}
      <div className="space-y-6">
        {/* Current Processing */}
        {isProcessing && currentProcessingFile && (
          <div className="bg-gray-900 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Processing</h3>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-400 mb-1">Current File</p>
                <p className="text-white font-medium">{currentProcessingFile.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400 mb-1">Progress</p>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${processingProgress}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-400 mt-1">{Math.round(processingProgress)}%</p>
              </div>
              <div>
                <p className="text-sm text-gray-400 mb-1">AI Status</p>
                <p className="text-blue-400 text-sm">{aiCommentary}</p>
              </div>
            </div>
          </div>
        )}

        {/* Processing Queue */}
        {processingQueue.length > 0 && (
          <div className="bg-gray-900 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Processing Queue</h3>
            <div className="space-y-3">
              {processingQueue.slice(0, 5).map((file) => (
                <div key={file.id} className="bg-gray-800 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">{file.name}</p>
                      <div className="flex items-center space-x-2 mt-1">
                        {file.status === 'processing' && (
                          <>
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-400"></div>
                            <span className="text-blue-400 text-xs">Processing... ({file.progress}%)</span>
                          </>
                        )}
                        {file.status === 'completed' && (
                          <>
                            <CheckCircle className="w-3 h-3 text-green-400" />
                            <span className="text-green-400 text-xs">Completed ✅</span>
                          </>
                        )}
                        {file.status === 'failed' && (
                          <>
                            <XCircle className="w-3 h-3 text-red-400" />
                            <span className="text-red-400 text-xs">Failed ❌</span>
                          </>
                        )}
                        {file.status === 'queued' && (
                          <>
                            <Clock className="w-3 h-3 text-yellow-400" />
                            <span className="text-yellow-400 text-xs">Queued ⏳</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      {file.status === 'processing' && (
                        <div className="w-16 bg-gray-700 rounded-full h-2">
                          <div 
                            className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${file.progress}%` }}
                          ></div>
                        </div>
                      )}
                      {file.status === 'failed' && (
                        <button className="text-blue-400 hover:text-blue-300 text-xs">
                          Retry
                        </button>
                      )}
                    </div>
                  </div>
                  {file.status === 'processing' && file.progress > 0 && (
                    <p className="text-gray-400 text-xs">
                      {file.progress < 25 && "Reading document..."}
                      {file.progress >= 25 && file.progress < 50 && "Extracting transactions..."}
                      {file.progress >= 50 && file.progress < 75 && "Analyzing patterns..."}
                      {file.progress >= 75 && file.progress < 100 && "Categorizing expenses..."}
                      {file.progress === 100 && "Finalizing results..."}
                    </p>
                  )}
                </div>
              ))}
              {processingQueue.length > 5 && (
                <div className="text-center">
                  <p className="text-gray-400 text-xs">+{processingQueue.length - 5} more files in queue</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* System Status */}
        <div className="bg-gray-900 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">System Status</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-400 text-sm">AI Status</span>
              <span className={`text-sm flex items-center ${systemStatus.aiStatus === 'online' ? 'text-green-400' : 'text-red-400'}`}>
                <div className={`w-2 h-2 rounded-full mr-2 ${systemStatus.aiStatus === 'online' ? 'bg-green-400' : 'bg-red-400'}`}></div>
                {systemStatus.aiStatus}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400 text-sm">Processing Speed</span>
              <span className="text-white text-sm">{systemStatus.processingSpeed}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400 text-sm">Queue Length</span>
              <span className="text-white text-sm">{systemStatus.queueLength}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400 text-sm">Privacy</span>
              <span className="text-blue-400 text-sm">Processing locally</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderAnalytics = () => (
    <div className="space-y-6">
      <div className="bg-gray-900 rounded-xl p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Analytics</h2>
        <p className="text-gray-400">Data visualization and insights coming soon...</p>
      </div>
    </div>
  );

  const renderGoals = () => (
    <div className="space-y-6">
      <div className="bg-gray-900 rounded-xl p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Goals</h2>
        <p className="text-gray-400">Financial goal tracking coming soon...</p>
      </div>
    </div>
  );

  const renderPodcasts = () => (
    <div className="space-y-6">
      <div className="bg-gray-900 rounded-xl p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Personal Podcasts</h2>
        <p className="text-gray-400">AI-generated financial podcasts coming soon...</p>
      </div>
    </div>
  );

  const renderAIChat = () => (
    <div className="space-y-6">
      <div className="bg-gray-900 rounded-xl p-6">
        <h2 className="text-xl font-semibold text-white mb-4">AI Financial Chat</h2>
        <p className="text-gray-400">Financial therapy and advice coming soon...</p>
      </div>
    </div>
  );

  const renderBusiness = () => (
    <div className="space-y-6">
      <div className="bg-gray-900 rounded-xl p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Business Tools</h2>
        <p className="text-gray-400">Business expense management coming soon...</p>
      </div>
    </div>
  );

  const renderSettings = () => (
    <div className="space-y-6">
      <div className="bg-gray-900 rounded-xl p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Settings</h2>
        <p className="text-gray-400">Account and AI preferences coming soon...</p>
      </div>
    </div>
  );

  const renderMainContent = () => {
    switch (activeTab) {
      case 'smart-import':
        return renderSmartImportWorkspace();
      case 'analytics':
        return renderAnalytics();
      case 'goals':
        return renderGoals();
      case 'podcasts':
        return renderPodcasts();
      case 'ai-chat':
        return renderAIChat();
      case 'business':
        return renderBusiness();
      case 'settings':
        return renderSettings();
      default:
        return renderSmartImportWorkspace();
    }
  };

  return (
    <div className="flex h-screen text-white overflow-hidden" style={{
      background: 'rgba(30, 27, 75, 0.95)',
      backdropFilter: 'blur(20px)'
    }}>
      {/* Sidebar */}
      <div className={`bg-gray-900 border-r border-gray-800 transition-all duration-300 ${sidebarOpen ? 'w-64' : 'w-16'}`}>
        <div className="p-4">
          <div className="flex items-center justify-between mb-6">
            <h1 className={`font-bold text-xl ${sidebarOpen ? 'block' : 'hidden'}`}>
              XspensesAI
            </h1>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
            >
              <ChevronLeft className={`w-5 h-5 transition-transform ${sidebarOpen ? 'rotate-0' : 'rotate-180'}`} />
            </button>
          </div>

          <nav className="space-y-2">
            {navigationItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center px-3 py-3 rounded-lg transition-colors ${
                  activeTab === item.id
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                } ${item.isPrimary ? 'border-l-4 border-blue-500' : ''}`}
              >
                <item.icon className="w-5 h-5 mr-3 flex-shrink-0" />
                {sidebarOpen && (
                  <div className="text-left">
                    <div className="font-medium">{item.name}</div>
                    <div className="text-xs opacity-75">{item.description}</div>
                  </div>
                )}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <div className="bg-gray-900 border-b border-gray-800 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h2 className="text-xl font-semibold">
                {navigationItems.find(item => item.id === activeTab)?.name || 'Smart Import AI'}
              </h2>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-sm">
                <div className={`w-2 h-2 rounded-full ${backendConnected ? 'bg-green-400' : 'bg-red-400'}`}></div>
                <span className="text-gray-300">{backendConnected ? 'AI Online' : 'AI Offline'}</span>
              </div>
              <button className="p-2 hover:bg-gray-800 rounded-lg transition-colors">
                <Bell className="w-5 h-5 text-gray-400" />
              </button>
              <button className="p-2 hover:bg-gray-800 rounded-lg transition-colors">
                <User className="w-5 h-5 text-gray-400" />
              </button>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {renderMainContent()}
          </motion.div>
        </div>
      </div>

      {/* Floating AI Chatbot */}
      <div className="fixed bottom-6 right-6 z-50">
        {!showFloatingChat ? (
          <button
            onClick={() => setShowFloatingChat(true)}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white p-4 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-110"
          >
            <Brain className="w-6 h-6" />
          </button>
        ) : (
          <div className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl w-80 h-96 flex flex-col">
            {/* Chat Header */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-4 rounded-t-xl flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Brain className="w-5 h-5 text-white" />
                <div>
                  <h3 className="text-white font-semibold">AI Assistant</h3>
                  <p className="text-blue-100 text-xs">Always here to help!</p>
                </div>
              </div>
              <button
                onClick={() => setShowFloatingChat(false)}
                className="text-white hover:text-gray-200 transition-colors"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {floatingChatMessages.length === 0 ? (
                <div className="text-center text-gray-400 text-sm">
                  <Brain className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>Hi! I'm your AI assistant. How can I help you today?</p>
                </div>
              ) : (
                floatingChatMessages.map((msg, index) => (
                  <div key={index} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-xs p-3 rounded-lg ${
                      msg.type === 'user' 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-800 text-white'
                    }`}>
                      <p className="text-sm">{msg.message}</p>
                      <p className="text-xs opacity-70 mt-1">
                        {msg.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Chat Input */}
            <div className="p-4 border-t border-gray-700">
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={floatingChatInput}
                  onChange={(e) => setFloatingChatInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleFloatingChatMessage(floatingChatInput)}
                  placeholder="Ask me anything..."
                  className="flex-1 bg-gray-800 text-white px-3 py-2 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none text-sm"
                />
                <button
                  onClick={() => handleFloatingChatMessage(floatingChatInput)}
                  disabled={!floatingChatInput.trim()}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-3 py-2 rounded-lg transition-colors"
                >
                  <MessageCircle className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default XspensesAIDashboard; 