import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { UploadCloud, FileText, CheckCircle, AlertTriangle, Loader2, X, Bot } from 'lucide-react';
import MobilePageTitle from '../../components/ui/MobilePageTitle';
import { useAIMemory } from '../../hooks/useAIMemory';
// Legacy ByteDocumentChat removed - now using unified chat from DashboardLayout
// import { ByteDocumentChat } from '../../components/chat/_legacy/ByteDocumentChat';
import { PRIME_CHAT_V2 } from '../../lib/flags';
import type { SmartDocType, ProcessedDocument } from '../../types/smartImport';
import { getSectionName } from '../../types/smartImport';
import { DocList } from '../../components/smartImport/DocList';
import { useUnifiedChatLauncher } from '../../hooks/useUnifiedChatLauncher';
import { useAuth } from '../../contexts/AuthContext';

interface ProcessingFile {
  id: string;
  name: string;
  type: string;
  size: string;
  status: 'uploading' | 'processing' | 'completed' | 'error';
  progress: number;
  transactions?: number;
  accuracy?: string;
  error?: string;
  errorType?: 'format' | 'corrupted' | 'unsupported' | 'size' | 'security';
}

// Removed ChatMessage interface - chat is now only in workspace overlay popup

interface ProcessingModal {
  isOpen: boolean;
  file: ProcessingFile | null;
  processingSteps: string[];
  currentStep: number;
}

interface AIWorker {
  id: string;
  name: string;
  role: string;
  status: 'idle' | 'working' | 'completed';
  progress: number;
  currentTask: string;
  avatar: string;
  color: string;
}

interface WorkerMessage {
  id: string;
  worker: string;
  content: string;
  timestamp: string;
  type: 'status' | 'chat' | 'progress';
}

const SmartImportAIPage: React.FC = () => {
  const { userId } = useAuth();
  const { openChat } = useUnifiedChatLauncher();
  
  // AI Memory System Integration (for task management only, not chat UI)
  const { 
    createTask, 
    addMessage, 
    currentTask
    // conversation removed - chat UI only appears in workspace overlays, not inline
  } = useAIMemory('byte');

  const [files, setFiles] = useState<ProcessingFile[]>([]);
  const [dragOver, setDragOver] = useState(false);
  // Removed chatMessages state - chat is now only in workspace overlay popup
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [isEmployeePanelOpen, setIsEmployeePanelOpen] = useState(false);

  // Create task when files are uploaded
  const handleFileUpload = (newFiles: ProcessingFile[]) => {
    setFiles(prev => [...prev, ...newFiles]);
    
    // Create AI task for document processing
    if (newFiles.length > 0) {
      createTask({
        type: 'document_processing',
        title: `Processing ${newFiles.length} document(s)`,
        description: `Processing ${newFiles.map(f => f.name).join(', ')}`,
        data: { files: newFiles }
      });
      
      // Add message to conversation
      addMessage('user', `Uploaded ${newFiles.length} file(s) for processing: ${newFiles.map(f => f.name).join(', ')}`);
      
      // Simulate Byte's response
      setTimeout(() => {
        addMessage('ai', `Got it! I'm processing ${newFiles.length} document(s) right now. I'll extract all the financial data and categorize everything automatically. You can chat with me while I work! 📄✨`);
      }, 1000);
    }
  };

  // Handle opening chat with Byte - opens unified chat overlay
  const handleChatWithByte = (message?: string, source: string = 'quick-action') => {
    const currentImportId = files.length > 0 ? files[files.length - 1].id : undefined;
    openChat({
      initialEmployeeSlug: 'byte-docs',
      context: {
        page: 'smart-import',
        data: {
          source,
          importId: currentImportId,
        },
      },
      initialQuestion: message,
    });
  };
  const [processingModal, setProcessingModal] = useState<ProcessingModal>({
    isOpen: false,
    file: null,
    processingSteps: [],
    currentStep: 0});
  const [bytePopupOpen, setBytePopupOpen] = useState(false);
  const [watchMeWorkOpen, setWatchMeWorkOpen] = useState(false);
  // Legacy Byte chat state removed - now using unified chat from DashboardLayout
  // const [isByteChatOpen, setIsByteChatOpen] = useState(false);
  // openChat is already declared above at line 63
  const [selectedDocType, setSelectedDocType] = useState<SmartDocType | null>(null);
  const [processedDocs, setProcessedDocs] = useState<ProcessedDocument[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Legacy document processed callback removed - document processing now handled via unified chat
  // If needed, document processing results can be handled through the unified chat context

  // Derive section arrays - use useMemo to prevent unnecessary recalculations
  const bankStatements = useMemo(() => 
    (processedDocs || []).filter(d => d.docType === 'bank_statement'), 
    [processedDocs]
  );
  const receipts = useMemo(() => 
    (processedDocs || []).filter(d => d.docType === 'receipt'), 
    [processedDocs]
  );
  const csvImports = useMemo(() => 
    (processedDocs || []).filter(d => d.docType === 'csv'), 
    [processedDocs]
  );
  const otherDocs = useMemo(() => 
    (processedDocs || []).filter(d => d.docType === 'generic_document'), 
    [processedDocs]
  );

  // AI Workers state
  const [aiWorkers, setAiWorkers] = useState<AIWorker[]>([
    {
      id: 'byte',
      name: 'Byte',
      role: 'Document Processing Wizard',
      status: 'idle',
      progress: 0,
      currentTask: 'Ready to process documents',
      avatar: '🤖',
      color: 'from-blue-500 to-cyan-500'
    },
    {
      id: 'crystal',
      name: 'Crystal',
      role: 'Data Analysis Expert',
      status: 'idle',
      progress: 0,
      currentTask: 'Waiting for data to analyze',
      avatar: '💎',
      color: 'from-purple-500 to-pink-500'
    },
    {
      id: 'tag',
      name: 'Tag',
      role: 'Auto-Categorization Specialist',
      status: 'idle',
      progress: 0,
      currentTask: 'Ready to categorize transactions',
      avatar: '🏷️',
      color: 'from-green-500 to-emerald-500'
    },
    {
      id: 'prime',
      name: 'Prime',
      role: 'AI Team Coordinator',
      status: 'idle',
      progress: 0,
      currentTask: 'Coordinating team activities',
      avatar: '👑',
      color: 'from-orange-500 to-yellow-500'
    }
  ]);

  const [workerMessages, setWorkerMessages] = useState<WorkerMessage[]>([
    {
      id: '1',
      worker: 'Prime',
      content: 'Team assembled and ready for document processing!',
      timestamp: new Date().toISOString(),
      type: 'status'
    }
  ]);

  // Simulate AI worker activities
  const simulateWorkflow = () => {
    const tasks = [
      { worker: 'byte', task: 'Scanning uploaded document...', progress: 25 },
      { worker: 'byte', task: 'Extracting text and data...', progress: 50 },
      { worker: 'byte', task: 'Validating document format...', progress: 75 },
      { worker: 'byte', task: 'Document processed successfully!', progress: 100 },
      { worker: 'crystal', task: 'Analyzing transaction patterns...', progress: 30 },
      { worker: 'crystal', task: 'Identifying spending categories...', progress: 60 },
      { worker: 'crystal', task: 'Generating insights...', progress: 90 },
      { worker: 'crystal', task: 'Analysis complete!', progress: 100 },
      { worker: 'tag', task: 'Auto-categorizing transactions...', progress: 40 },
      { worker: 'tag', task: 'Applying smart tags...', progress: 80 },
      { worker: 'tag', task: 'Categorization finished!', progress: 100 },
      { worker: 'prime', task: 'Coordinating team workflow...', progress: 100 }
    ];

    let taskIndex = 0;
    const interval = setInterval(() => {
      if (taskIndex >= tasks.length) {
        clearInterval(interval);
        return;
      }

      const currentTask = tasks[taskIndex];
      
      // Update worker status
      setAiWorkers(prev => prev.map(worker => 
        worker.id === currentTask.worker 
          ? { 
              ...worker, 
              status: currentTask.progress === 100 ? 'completed' : 'working',
              progress: currentTask.progress,
              currentTask: currentTask.task
            }
          : worker
      ));

      // Add worker message
      const newMessage: WorkerMessage = {
        id: Date.now().toString(),
        worker: currentTask.worker,
        content: String(currentTask.task || ''),
        timestamp: new Date().toISOString(),
        type: currentTask.progress === 100 ? 'status' : 'progress'
      };

      setWorkerMessages(prev => [...prev, newMessage]);

      // Add chat messages between workers for activity feed (worker activity only, not inline chat UI)
      if (Math.random() > 0.7) {
        // Generate random chat message for worker activity feed
        const workerChatMessages = [
          { worker: 'Byte', content: 'Hey Crystal, I just finished processing that Chase statement!' },
          { worker: 'Crystal', content: 'Perfect! I can see the transaction patterns now. Let me analyze the spending trends.' },
          { worker: 'Tag', content: 'I\'m ready to categorize these transactions. Should I use the smart categories?' },
          { worker: 'Prime', content: 'Excellent work team! The document processing is going smoothly.' },
          { worker: 'Byte', content: 'The OCR accuracy is at 99.7% - this document is crystal clear!' },
          { worker: 'Crystal', content: 'I\'ve identified some interesting patterns in the dining expenses.' },
          { worker: 'Tag', content: 'Auto-categorization complete! All transactions are properly tagged.' }
        ];
        const randomChat = workerChatMessages[Math.floor(Math.random() * workerChatMessages.length)];
        const chatMessage: WorkerMessage = {
          id: (Date.now() + 1).toString(),
          worker: randomChat.worker,
          content: String(randomChat.content || ''),
          timestamp: new Date().toISOString(),
          type: 'chat'
        };

        setWorkerMessages(prev => [...prev, chatMessage]);
      }

      taskIndex++;
    }, 2000);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    handleFiles(droppedFiles);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (selectedFiles) {
      handleFiles(Array.from(selectedFiles));
    }
  };

  const handleAutoExport = async () => {
    // Generate financial story data for podcasters
    const totalTransactions = files.reduce((sum, file) => sum + (file.transactions || 0), 0);
    const processedFiles = files.filter(f => f.status === 'completed').length;
    
    // Create Byte's contribution to the financial story
    const byteContribution = {
      timestamp: new Date().toISOString(),
      employee: 'byte-docs',
      totalTransactions: totalTransactions,
      processedFiles: processedFiles,
      accuracy: "99.7%",
      categories: [
        { name: "Dining & Food", count: Math.floor(totalTransactions * 0.25), percentage: "25%" },
        { name: "Transportation", count: Math.floor(totalTransactions * 0.15), percentage: "15%" },
        { name: "Entertainment", count: Math.floor(totalTransactions * 0.10), percentage: "10%" },
        { name: "Shopping", count: Math.floor(totalTransactions * 0.20), percentage: "20%" },
        { name: "Utilities", count: Math.floor(totalTransactions * 0.12), percentage: "12%" },
        { name: "Other", count: Math.floor(totalTransactions * 0.18), percentage: "18%" }
      ],
      insights: [
        `Processed ${totalTransactions} transactions from ${processedFiles} documents`,
        `Top spending category: ${Math.floor(totalTransactions * 0.25)} transactions in Dining & Food`,
        `Average transaction accuracy: 99.7%`,
        `Financial data ready for content creation`
      ],
      storyHooks: [
        "User imported financial data showing strong spending patterns",
        "AI successfully categorized transactions with high accuracy",
        "Financial story foundation established for podcast content",
        "Data export ready for financial analysis and insights"
      ]
    };

    // Export Byte's contribution
    const dataStr = JSON.stringify(byteContribution, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `byte-contribution-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    // Show success message
    alert(`Byte's contribution exported! ${totalTransactions} transactions processed and ready for the complete financial story.`);
  };

  const handleFiles = (fileList: File[]) => {
    // Check limits
    const MAX_FILES = 10;
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    const SUPPORTED_TYPES = ['.pdf', '.csv', '.xlsx', '.xls', '.txt', '.jpg', '.jpeg', '.png'];
    
    // Check total file count
    if (files.length + fileList.length > MAX_FILES) {
      alert(`Maximum ${MAX_FILES} files allowed. You currently have ${files.length} files and are trying to add ${fileList.length} more.`);
      return;
    }
    
    // Filter and validate files
    const validFiles: File[] = [];
    const invalidFiles: string[] = [];
    
    fileList.forEach(file => {
      // Check file size
      if (file.size > MAX_FILE_SIZE) {
        invalidFiles.push(`${file.name} (too large - max 10MB)`);
        return;
      }
      
      // Check file type
      const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
      if (!SUPPORTED_TYPES.includes(fileExtension)) {
        invalidFiles.push(`${file.name} (unsupported format)`);
        return;
      }
      
      validFiles.push(file);
    });
    
    // Show validation errors
    if (invalidFiles.length > 0) {
      alert(`Some files were rejected:\n${invalidFiles.join('\n')}`);
    }
    
    if (validFiles.length === 0) return;
    
    const newFiles: ProcessingFile[] = validFiles.map((file, index) => ({
      id: `file-${Date.now()}-${index}`,
      name: file.name,
      type: file.type,
      size: formatFileSize(file.size),
      status: 'uploading',
      progress: 0
    }));

    // Use the new handleFileUpload function
    handleFileUpload(newFiles);

    // File upload success - chat messages now handled in workspace overlay only

    // Show processing modal for the first file
    if (newFiles.length > 0) {
      const firstFile = newFiles[0];
      const processingSteps = [
        'Analyzing document structure...',
        'Extracting text and data...',
        'Identifying transaction patterns...',
        'Categorizing transactions...',
        'Validating accuracy...',
        'Finalizing results...'
      ];

      setProcessingModal({
        isOpen: true,
        file: firstFile,
        processingSteps,
        currentStep: 0});

      // Simulate processing steps
      let currentStep = 0;
      const stepInterval = setInterval(() => {
        currentStep++;
        setProcessingModal(prev => ({
          ...prev,
          currentStep: Math.min(currentStep, processingSteps.length - 1)
        }));

        if (currentStep >= processingSteps.length) {
          clearInterval(stepInterval);
          // Close modal after completion
          setTimeout(() => {
            setProcessingModal(prev => ({ ...prev, isOpen: false }));
          }, 1000);
        }
      }, 800);
    }

    // Simulate processing for each file
    newFiles.forEach((file, index) => {
      setTimeout(() => {
        setFiles(prev => prev.map(f => 
          f.id === file.id 
            ? { ...f, status: 'processing', progress: 50 }
            : f
        ));
      }, 1000 + index * 500);

      setTimeout(() => {
        // Check for potential errors
        const errorCheck = simulateFileError(file);
        
        if (errorCheck.errorType) {
          // Handle error case
          setFiles(prev => prev.map(f => 
            f.id === file.id 
              ? { 
                  ...f, 
                  status: 'error', 
                  progress: 0,
                  error: errorCheck.errorMessage,
                  errorType: errorCheck.errorType as ProcessingFile['errorType']
                }
              : f
          ));

          // Error handling - chat messages now handled in workspace overlay only
        } else {
          // Handle success case
          const transactions = Math.floor(Math.random() * 200) + 50;
          setFiles(prev => prev.map(f => 
            f.id === file.id 
              ? { 
                  ...f, 
                  status: 'completed', 
                  progress: 100,
                  transactions,
                  accuracy: '99.7%'
                }
              : f
          ));

          // File processing complete - chat messages now handled in workspace overlay only
        }
      }, 3000 + index * 500);
    });
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };



  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'uploading':
      case 'processing':
        return <Loader2 className="w-4 h-4 animate-spin text-blue-500" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      default:
        return <FileText className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'uploading':
      case 'processing':
        return 'border-blue-500/30 bg-blue-500/5';
      case 'completed':
        return 'border-green-500/30 bg-green-500/5';
      case 'error':
        return 'border-red-500/30 bg-red-500/5';
      default:
        return 'border-gray-500/30 bg-gray-500/5';
    }
  };

  const getErrorMessage = (errorType?: string, fileName?: string) => {
    switch (errorType) {
      case 'format':
        return `❌ ${fileName} has an unsupported format. Please use PDF, CSV, Excel, or image files.`;
      case 'corrupted':
        return `❌ ${fileName} appears to be corrupted or damaged. Please try uploading a fresh copy.`;
      case 'unsupported':
        return `❌ ${fileName} file type is not supported. Supported formats: PDF, CSV, Excel, JPG, PNG.`;
      case 'size':
        return `❌ ${fileName} is too large. Please upload files smaller than 10MB.`;
      case 'security':
        return `❌ ${fileName} failed security scan. Please ensure the file is safe and try again.`;
      default:
        return `❌ ${fileName} could not be processed. Please check the file and try again.`;
    }
  };

  const simulateFileError = (file: ProcessingFile): { errorType: string; errorMessage: string } => {
    // Simulate different types of errors based on file characteristics
    const errorTypes = ['format', 'corrupted', 'unsupported', 'size', 'security'];
    const randomError = errorTypes[Math.floor(Math.random() * errorTypes.length)];
    
    // Some specific error conditions
    if (file.size.includes('MB') && parseInt(file.size) > 5) {
      return { errorType: 'size', errorMessage: getErrorMessage('size', file.name) };
    }
    
    if (file.type === 'application/zip' || file.type === 'application/x-rar') {
      return { errorType: 'unsupported', errorMessage: getErrorMessage('unsupported', file.name) };
    }
    
    // Random error for demonstration (10% chance)
    if (Math.random() < 0.1) {
      return { errorType: randomError, errorMessage: getErrorMessage(randomError, file.name) };
    }
    
    return { errorType: '', errorMessage: '' };
  };

  return (
    <>
      <div className="w-full pt-4 px-4 sm:px-6 lg:px-8 min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900">
        {/* Page title is handled by DashboardHeader - no duplicate title here */}
        <div>
          <button
            onClick={() => {
              const currentImportId = files.length > 0 ? files[files.length - 1].id : undefined;
              openChat({
                initialEmployeeSlug: 'byte-docs',
                context: {
                  page: 'smart-import',
                  data: {
                    source: 'upload-panel',
                    importId: currentImportId,
                  },
                },
                initialQuestion: 'Help me understand and process this statement.'
              });
            }}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2 transition-colors"
          >
            <span>📄</span>
            <span>Ask Byte</span>
          </button>
        </div>
        
        {/* Welcome Banner */}
        <div className="max-w-6xl mx-auto pr-4 lg:pr-20">
          <div
            className="text-center mb-6"
          >
            <h2 className="text-xl font-bold text-white mb-1">
              Welcome to Byte's Document Lab
            </h2>
            <p className="text-white/60 text-sm mb-4">
              Your intelligent document processing wizard for financial data
            </p>
          </div>
          

          {/* Feature Modules Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto pr-4 lg:pr-20">
            <button
              className="group flex flex-col items-center gap-3 p-6 bg-white/5 hover:bg-white/10 rounded-xl text-center transition-all duration-300 border border-white/10 hover:border-white/20 min-h-[140px] hover:shadow-lg hover:shadow-purple-500/20 hover:ring-2 hover:ring-purple-500/30 hover:ring-opacity-50"
              onClick={() => {
                setSelectedDocType('generic_document');
                if (PRIME_CHAT_V2) {
                  window.dispatchEvent(new CustomEvent('prime:open', { detail: { intent: 'insights' } }));
                } else {
                  // Legacy Byte chat removed - now using unified chat
                  // Open unified chat with Byte employee
                  openChat({ 
                    initialEmployeeSlug: 'byte-docs',
                    context: { 
                      page: 'smart-import', 
                      data: { source: 'document-upload', docType: 'generic_document' }
                    }
                  });
                }
              }}
            >
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <UploadCloud className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-white mb-1">Document Upload</h3>
                <p className="text-white/60 text-xs leading-tight">Upload and process files</p>
              </div>
            </button>

            <button
              className="group flex flex-col items-center gap-3 p-4 bg-white/5 hover:bg-white/10 rounded-xl text-center transition-all duration-300 border border-white/10 hover:border-white/20 min-h-[120px] hover:shadow-lg hover:shadow-green-500/10"
              onClick={() => {
                setSelectedDocType('receipt');
                if (PRIME_CHAT_V2) {
                  window.dispatchEvent(new CustomEvent('prime:open', { detail: { intent: 'insights' } }));
                } else {
                  // Legacy Byte chat removed - now using unified chat
                  // Open unified chat with Byte employee
                  openChat({ 
                    initialEmployeeSlug: 'byte-docs',
                    context: { 
                      page: 'smart-import', 
                      data: { source: 'receipt-scan', docType: 'receipt' }
                    }
                  });
                }
              }}
            >
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <span className="text-white text-xl">📸</span>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-white mb-1">Scan Receipt</h3>
                <p className="text-white/60 text-xs leading-tight">Camera-based scanning</p>
              </div>
            </button>

            <button
              className="group flex flex-col items-center gap-3 p-6 bg-white/5 hover:bg-white/10 rounded-xl text-center transition-all duration-300 border border-white/10 hover:border-white/20 min-h-[140px] hover:shadow-lg hover:shadow-purple-500/20 hover:ring-2 hover:ring-purple-500/30 hover:ring-opacity-50"
              onClick={() => {
                setSelectedDocType('bank_statement');
                if (PRIME_CHAT_V2) {
                  window.dispatchEvent(new CustomEvent('prime:open', { detail: { intent: 'insights' } }));
                } else {
                  // Legacy Byte chat removed - now using unified chat
                  // Open unified chat with Byte employee
                  openChat({ 
                    initialEmployeeSlug: 'byte-docs',
                    context: { 
                      page: 'smart-import', 
                      data: { source: 'bank-statement', docType: 'bank_statement' }
                    }
                  });
                }
              }}
            >
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <span className="text-white text-xl">🏦</span>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-white mb-1">Bank Statement</h3>
                <p className="text-white/60 text-xs leading-tight">Import bank data</p>
              </div>
            </button>

            <button
              className="group flex flex-col items-center gap-3 p-6 bg-white/5 hover:bg-white/10 rounded-xl text-center transition-all duration-300 border border-white/10 hover:border-white/20 min-h-[140px] hover:shadow-lg hover:shadow-purple-500/20 hover:ring-2 hover:ring-purple-500/30 hover:ring-opacity-50"
              onClick={() => {
                setSelectedDocType('csv');
                // Legacy Byte chat removed - now using unified chat
                openChat({ 
                  initialEmployeeSlug: 'byte-docs',
                  context: { 
                    page: 'smart-import', 
                    data: { source: 'csv-import', docType: 'csv' }
                  }
                });
              }}
            >
              <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <span className="text-white text-xl">📊</span>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-white mb-1">CSV Import</h3>
                <p className="text-white/60 text-xs leading-tight">Bulk data processing</p>
              </div>
            </button>

            <button
              className="group flex flex-col items-center gap-3 p-6 bg-white/5 hover:bg-white/10 rounded-xl text-center transition-all duration-300 border border-white/10 hover:border-white/20 min-h-[140px] hover:shadow-lg hover:shadow-purple-500/20 hover:ring-2 hover:ring-purple-500/30 hover:ring-opacity-50"
              onClick={() => {
                handleChatWithByte("Show me the processing speed and performance metrics", 'performance-metrics');
              }}
            >
              <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <span className="text-white text-xl">⚡</span>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-white mb-1">Fast Processing</h3>
                <p className="text-white/60 text-xs leading-tight">2.3s average speed</p>
              </div>
            </button>

            <button
              className="group flex flex-col items-center gap-3 p-4 bg-white/5 hover:bg-white/10 rounded-xl text-center transition-all duration-300 border border-white/10 hover:border-white/20 min-h-[120px] hover:shadow-lg hover:shadow-purple-500/10 relative"
              onClick={() => {
                setWatchMeWorkOpen(true);
                simulateWorkflow();
              }}
            >
              {/* Live Activity Indicator */}
              {currentTask && currentTask.status === 'in_progress' && (
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full animate-pulse"></div>
              )}
              
              <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <span className="text-white text-xl">🎯</span>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-white mb-1">
                  Watch Me Work
                </h3>
                <p className="text-white/60 text-xs leading-tight">
                  {currentTask ? `Processing ${Math.round(currentTask.progress)}%` : 'See AI team in action'}
                </p>
              </div>
            </button>
          </div>
        </div>

        {/* Processed Documents Sections */}
        {processedDocs && processedDocs.length > 0 && (bankStatements.length > 0 || receipts.length > 0 || csvImports.length > 0 || otherDocs.length > 0) && (
          <div className="mt-12 space-y-8 max-w-5xl mx-auto pr-4 lg:pr-20">
            {bankStatements.length > 0 && (
              <section>
                <h2 className="text-xl font-bold text-white mb-4">{getSectionName('bank_statement')}</h2>
                <DocList documents={bankStatements} />
              </section>
            )}
            
            {receipts.length > 0 && (
              <section>
                <h2 className="text-xl font-bold text-white mb-4">{getSectionName('receipt')}</h2>
                <DocList documents={receipts} />
              </section>
            )}
            
            {csvImports.length > 0 && (
              <section>
                <h2 className="text-xl font-bold text-white mb-4">{getSectionName('csv')}</h2>
                <DocList documents={csvImports} />
              </section>
            )}
            
            {otherDocs.length > 0 && (
              <section>
                <h2 className="text-xl font-bold text-white mb-4">{getSectionName('generic_document')}</h2>
                <DocList documents={otherDocs} />
              </section>
            )}
          </div>
        )}
        
        {/* Byte Popup Modal */}
      
        {bytePopupOpen && (
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          >
            <div
              className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl border border-white/20 w-full max-w-3xl max-h-[85vh] overflow-hidden"
            >
              {/* Byte Popup Header */}
              <div className="flex items-center justify-between p-4 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                    <span className="text-white text-lg">📄</span>
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-white">Byte's Document Processor</h3>
                    <p className="text-white/60 text-xs">Upload and process your financial documents</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {/* Document Counter */}
                  {files.length > 0 && (
                    <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-400/30 rounded-lg px-3 py-1.5">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                        <span className="text-xs font-medium text-white">
                          {files.length} document{files.length !== 1 ? 's' : ''} uploaded
                        </span>
                      </div>
                    </div>
                  )}
                  <button
                    onClick={() => setBytePopupOpen(false)}
                    className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4 text-white/60" />
                  </button>
                </div>
              </div>

              {/* Byte Popup Content */}
              <div className="p-4 overflow-y-auto max-h-[calc(85vh-100px)]">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  
                  {/* Left Side - Upload Area */}
                  <div className="space-y-3">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-semibold text-white">Upload Documents</h4>
                        {files.length > 0 && (
                          <div className="bg-white/10 border border-white/20 rounded-lg px-2 py-1">
                            <span className="text-xs font-medium text-white">
                              {files.length}/10 files
                            </span>
                          </div>
                        )}
                      </div>
                      <div
                        className={`relative border-2 border-dashed rounded-2xl p-6 text-center transition-all duration-300 bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-md ${
                          dragOver
                            ? 'border-blue-400 bg-gradient-to-br from-blue-500/20 to-purple-500/15 shadow-2xl shadow-blue-500/30 scale-105'
                            : 'border-white/20 hover:border-white/40 hover:bg-gradient-to-br hover:from-slate-700/50 hover:to-slate-800/50 hover:shadow-xl hover:shadow-white/10 hover:scale-102'
                        }`}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <input
                          ref={fileInputRef}
                          type="file"
                          multiple
                          accept=".pdf,.csv,.xlsx,.xls,.txt,.jpg,.jpeg,.png"
                          onChange={handleFileSelect}
                          className="hidden"
                        />
                        
                        {/* Upload Icon with Animation */}
                        <div className="relative mb-4">
                          <div className="w-16 h-16 bg-gradient-to-br from-blue-500/30 to-purple-500/30 rounded-2xl flex items-center justify-center mx-auto border border-white/30 shadow-lg">
                            <UploadCloud className="w-8 h-8 text-blue-300" />
                          </div>
                          {dragOver && (
                            <div className="absolute inset-0 w-16 h-16 bg-gradient-to-br from-blue-400/40 to-purple-400/40 rounded-2xl mx-auto animate-pulse"></div>
                          )}
                        </div>

                        {/* Title */}
                        <h3 className="text-lg font-bold text-white mb-2">
                          {files.length > 0 ? `${files.length} document${files.length !== 1 ? 's' : ''} uploaded` : 'Drop your documents here'}
                        </h3>

                        {/* Description */}
                        <p className="text-white/70 text-sm mb-4 leading-relaxed max-w-md mx-auto">
                          {files.length > 0 
                            ? `Continue adding more files or process the uploaded documents`
                            : 'Supports PDF, CSV, Excel, images, and more. Max 10 files, 10MB each.'
                          }
                        </p>

                        {/* Action Buttons */}
                        <div className="flex flex-col gap-2 justify-center items-center">
                          <button className="w-full px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl text-sm font-semibold hover:opacity-90 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/30 border border-blue-400/40 flex items-center justify-center gap-2">
                            <UploadCloud className="w-4 h-4" />
                            Choose Files
                          </button>
                          {files.length > 0 && (
                            <button
                              onClick={() => {
                                // Start processing all files
                                const unprocessedFiles = files.filter(f => f.status === 'uploading');
                                if (unprocessedFiles.length > 0) {
                                  // Trigger processing for unprocessed files
                                  unprocessedFiles.forEach((file, index) => {
                                    setTimeout(() => {
                                      setFiles(prev => prev.map(f => 
                                        f.id === file.id 
                                          ? { ...f, status: 'processing', progress: 0 }
                                          : f
                                      ));
                                    }, index * 500);
                                  });
                                  
                                  // Auto-export for podcasters after processing
                                  setTimeout(() => {
                                    handleAutoExport();
                                  }, unprocessedFiles.length * 2000 + 1000);
                                }
                              }}
                              className="w-full px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl text-sm font-semibold hover:opacity-90 transition-all duration-300 hover:shadow-lg hover:shadow-green-500/30 border border-green-400/40 flex items-center justify-center gap-2"
                            >
                              <span className="text-lg">🚀</span>
                              Process Files
                            </button>
                          )}
                        </div>

                        {/* Drag Indicator */}
                        {!files.length && (
                          <div className="mt-6 text-white/50 text-xs">
                            Or drag and drop files here
                          </div>
                        )}
                      </div>
                    </div>

                    {/* File List */}
                    {files.length > 0 && (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-sm font-semibold text-white">Processing Files</h4>
                          {files.some(f => f.status === 'uploading') && (
                            <button
                              onClick={() => {
                                // Start processing all unprocessed files
                                const unprocessedFiles = files.filter(f => f.status === 'uploading');
                                unprocessedFiles.forEach((file, index) => {
                                  setTimeout(() => {
                                    setFiles(prev => prev.map(f => 
                                      f.id === file.id 
                                        ? { ...f, status: 'processing', progress: 0 }
                                        : f
                                    ));
                                  }, index * 500);
                                });
                              }}
                              className="px-3 py-1.5 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg text-xs font-medium hover:opacity-90 transition-all duration-200 flex items-center gap-1"
                            >
                              <span>🚀</span>
                              Process All
                            </button>
                          )}
                        </div>
                        <div className="space-y-2">
                          {files.map((file) => (
                            <div
                              key={file.id}
                              className={`p-2 rounded-lg border ${getStatusColor(file.status)}`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  {getStatusIcon(file.status)}
                                  <div>
                                    <p className="text-white font-medium text-xs truncate max-w-32">{file.name}</p>
                                    <p className="text-white/60 text-xs">{file.size}</p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  {file.status === 'completed' && (
                                    <>
                                      <p className="text-green-500 text-xs font-medium">
                                        {file.transactions} transactions
                                      </p>
                                      <p className="text-white/60 text-xs">
                                        {file.accuracy} accuracy
                                      </p>
                                    </>
                                  )}
                                  {file.status === 'processing' && (
                                    <p className="text-blue-500 text-xs">
                                      {file.progress}%
                                    </p>
                                  )}
                                  {file.status === 'error' && (
                                    <div className="text-right">
                                      <p className="text-red-500 text-xs font-medium">
                                        Failed
                                      </p>
                                      <p className="text-white/60 text-xs">
                                        {file.errorType}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </div>
                              
                              {file.status === 'processing' && (
                                <div className="mt-1">
                                  <div className="w-full bg-white/10 rounded-full h-1.5">
                                    <div
                                      className="bg-blue-500 h-1.5 rounded-full"
                                      animate={{ width: `${file.progress}%` }}
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right Side - Byte Chat & Results */}
                  <div className="space-y-3">
                    <div>
                      <h4 className="text-sm font-semibold text-white mb-2">Byte's Status</h4>
                      <div className="bg-gradient-to-br from-white/8 to-white/4 rounded-xl p-4 border border-white/20 backdrop-blur-sm shadow-lg shadow-white/5">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-xl flex items-center justify-center border border-white/20">
                            <span className="text-lg">📄</span>
                          </div>
                          <div>
                            <span className="text-sm font-semibold text-white">Byte is ready!</span>
                            <p className="text-white/60 text-xs">Document Processing AI</p>
                          </div>
                        </div>
                        <p className="text-white/70 text-sm leading-relaxed mb-3">
                          Hey there! I'm Byte, your document processing wizard! I can handle PDFs, CSVs, receipts, and more with 99.7% accuracy. Upload your files and I'll process them in seconds!
                        </p>
                        {files.length > 0 && files.some(f => f.status === 'uploading') && (
                          <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-400/30 rounded-lg p-2">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                              <span className="text-xs font-medium text-white">
                                {files.filter(f => f.status === 'uploading').length} file{files.filter(f => f.status === 'uploading').length !== 1 ? 's' : ''} ready to process
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Results Summary */}
                    {files.some(file => file.status === 'completed') && (
                      <div
                        className="bg-gradient-to-br from-green-500/15 to-emerald-500/10 border border-green-400/30 rounded-xl p-4 backdrop-blur-sm shadow-lg shadow-green-500/10"
                      >
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-8 h-8 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-lg flex items-center justify-center border border-green-400/30">
                            <CheckCircle className="w-4 h-4 text-green-400" />
                          </div>
                          <div>
                            <span className="text-sm font-semibold text-white">Processing Complete!</span>
                            <p className="text-green-400/80 text-xs">Financial story exported for podcasters</p>
                          </div>
                        </div>
                        
                        <div className="space-y-1 mb-3">
                          {files.filter(f => f.status === 'completed').map((file) => (
                            <div key={file.id} className="flex items-center justify-between text-xs">
                              <span className="text-white/80 truncate max-w-28">{file.name}</span>
                              <div className="flex items-center gap-1">
                                <span className="text-green-400">{file.transactions} transactions</span>
                                <span className="text-white/60">•</span>
                                <span className="text-green-400">{file.accuracy}</span>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Financial Story Export Notification */}
                        <div className="mb-3 p-2 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-lg border border-blue-400/20">
                          <div className="flex items-center gap-2">
                            <span className="text-blue-400 text-sm">📊</span>
                            <div>
                              <p className="text-blue-300 text-xs font-medium">Financial Story Ready</p>
                              <p className="text-white/70 text-xs">Auto-exported for podcast content creation</p>
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={() => window.location.href = '/dashboard/transactions'}
                            className="flex-1 px-3 py-1.5 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg text-xs font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-1"
                          >
                            <span>📊</span>
                            View Transactions
                          </button>
                          <button
                            onClick={() => window.location.href = '/dashboard/smart-categories'}
                            className="flex-1 px-3 py-1.5 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg text-xs font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-1"
                          >
                            <span>🏷️</span>
                            View Categories
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Error Summary */}
                    {files.some(file => file.status === 'error') && (
                      <div
                        className="bg-gradient-to-br from-red-500/15 to-orange-500/10 border border-red-400/30 rounded-xl p-4 backdrop-blur-sm shadow-lg shadow-red-500/10"
                      >
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-8 h-8 bg-gradient-to-br from-red-500/20 to-orange-500/20 rounded-lg flex items-center justify-center border border-red-400/30">
                            <AlertTriangle className="w-4 h-4 text-red-400" />
                          </div>
                          <div>
                            <span className="text-sm font-semibold text-white">Processing Errors</span>
                            <p className="text-red-400/80 text-xs">Some files failed to process</p>
                          </div>
                        </div>
                        
                        <div className="space-y-1 mb-3">
                          {files.filter(f => f.status === 'error').map((file) => (
                            <div key={file.id} className="text-xs">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-white/80 truncate max-w-28">{file.name}</span>
                                <span className="text-red-400 capitalize">{file.errorType}</span>
                              </div>
                              <p className="text-white/60 text-xs leading-tight">{file.error}</p>
                            </div>
                          ))}
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={() => setFiles(prev => prev.filter(f => f.status !== 'error'))}
                            className="flex-1 px-3 py-1.5 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg text-xs font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-1"
                          >
                            <span>🔄</span>
                            Retry Failed Files
                          </button>
                          <button
                            onClick={() => setFiles([])}
                            className="flex-1 px-3 py-1.5 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-lg text-xs font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-1"
                          >
                            <span>🗑️</span>
                            Clear All
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      

      {/* Processing Modal */}
      
        {processingModal.isOpen && (
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          >
            <div
              className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl border border-white/20 p-4 w-full max-w-sm"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div
                    className="w-6 h-6 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center"
                  >
                    <span className="text-white text-sm">📄</span>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white">Byte is Processing</h3>
                    <p className="text-white/60 text-xs truncate max-w-48">{processingModal.file?.name}</p>
                  </div>
                </div>
                <button
                  onClick={() => setProcessingModal(prev => ({ ...prev, isOpen: false }))}
                  className="p-1 hover:bg-white/10 rounded transition-colors"
                >
                  <X className="w-4 h-4 text-white/60" />
                </button>
              </div>

              {/* Processing Steps */}
              <div className="space-y-2 mb-4">
                {processingModal.processingSteps.map((step, index) => (
                  <div
                    key={index}
                    className={`flex items-center gap-2 p-2 rounded transition-all duration-300 ${
                      index <= processingModal.currentStep
                        ? 'bg-green-500/10 border border-green-500/30'
                        : 'bg-white/5 border border-white/10'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full flex items-center justify-center ${
                      index < processingModal.currentStep
                        ? 'bg-green-500'
                        : index === processingModal.currentStep
                        ? 'bg-blue-500'
                        : 'bg-white/20'
                    }`}>
                      {index < processingModal.currentStep ? (
                        <CheckCircle className="w-3 h-3 text-white" />
                      ) : index === processingModal.currentStep ? (
                        <Loader2 className="w-3 h-3 text-white animate-spin" />
                      ) : (
                        <div className="w-1.5 h-1.5 bg-white/60 rounded-full" />
                      )}
                    </div>
                    <span className={`text-xs ${
                      index <= processingModal.currentStep ? 'text-white' : 'text-white/60'
                    }`}>
                      {step}
                    </span>
                  </div>
                ))}
              </div>

              {/* Progress Bar */}
              <div className="mb-3">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-white/60 text-xs">Progress</span>
                  <span className="text-white text-xs font-medium">
                    {Math.round((processingModal.currentStep + 1) / processingModal.processingSteps.length * 100)}%
                  </span>
                </div>
                <div className="w-full bg-white/10 rounded-full h-1.5">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-purple-500 h-1.5 rounded-full"
                    animate={{ 
                      width: `${(processingModal.currentStep + 1) / processingModal.processingSteps.length * 100}%` 
                    }}
                  />
                </div>
              </div>

              {/* Byte's Message */}
              <div className="bg-white/5 rounded p-2 border border-white/10">
                <div className="flex items-center gap-1 mb-1">
                  <span className="text-sm">📄</span>
                  <span className="text-white font-medium text-xs">Byte says:</span>
                </div>
                <p className="text-white/80 text-xs">
                  {processingModal.currentStep < processingModal.processingSteps.length - 1
                    ? "I'm working hard to extract every detail from your document! This is going to be amazing! ✨"
                    : "Almost done! I've found some really interesting patterns in your data. You're going to love the results! 🎉"
                  }
                </p>
              </div>
            </div>
          </div>
        )}
      

      {/* Team Modal */}
      
        {showTeamModal && (
          <div
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowTeamModal(false)}
          >
            <div
              className="bg-slate-900 rounded-2xl border border-white/10 w-full max-w-lg p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white">👥 Call AI Team</h3>
                <button
                  onClick={() => setShowTeamModal(false)}
                  className="p-1 hover:bg-white/10 rounded transition-colors"
                >
                  <X className="w-5 h-5 text-white/60" />
                </button>
              </div>
              
              <p className="text-white/70 text-sm mb-4">
                Hand off your current task to another AI employee or get help from the team.
              </p>
              
              <div className="space-y-3">
                {/* Tag - For categorization */}
                <button
                  onClick={() => {
                    handleChatWithByte("I'm handing this off to Tag for categorization", 'team-handoff');
                    setShowTeamModal(false);
                  }}
                  className="w-full flex items-center gap-3 p-3 bg-white/5 hover:bg-white/10 rounded-lg transition-all border border-white/10"
                >
                  <div className="w-10 h-10 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-lg">🏷️</span>
                  </div>
                  <div className="flex-1 text-left">
                    <h4 className="text-white font-medium">Tag</h4>
                    <p className="text-white/60 text-xs">Auto-categorizes transactions</p>
                  </div>
                  <span className="text-white/40 text-xs">→</span>
                </button>
                
                {/* Crystal - For analysis */}
                <button
                  onClick={() => {
                    handleChatWithByte("I'm handing this off to Crystal for trend analysis", 'team-handoff');
                    setShowTeamModal(false);
                  }}
                  className="w-full flex items-center gap-3 p-3 bg-white/5 hover:bg-white/10 rounded-lg transition-all border border-white/10"
                >
                  <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-lg">🔮</span>
                  </div>
                  <div className="flex-1 text-left">
                    <h4 className="text-white font-medium">Crystal</h4>
                    <p className="text-white/60 text-xs">Forecasts spending trends</p>
                  </div>
                  <span className="text-white/40 text-xs">→</span>
                </button>
                
                {/* Intelia - For business intelligence */}
                <button
                  onClick={() => {
                    handleChatWithByte("I'm handing this off to Intelia for business insights", 'team-handoff');
                    setShowTeamModal(false);
                  }}
                  className="w-full flex items-center gap-3 p-3 bg-white/5 hover:bg-white/10 rounded-lg transition-all border border-white/10"
                >
                  <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-lg">🧠</span>
                  </div>
                  <div className="flex-1 text-left">
                    <h4 className="text-white font-medium">Intelia</h4>
                    <p className="text-white/60 text-xs">Business intelligence & insights</p>
                  </div>
                  <span className="text-white/40 text-xs">→</span>
                </button>
                
                {/* Prime - For executive oversight */}
                <button
                  onClick={() => {
                    handleChatWithByte("I'm calling Prime for executive oversight", 'team-handoff');
                    setShowTeamModal(false);
                  }}
                  className="w-full flex items-center gap-3 p-3 bg-white/5 hover:bg-white/10 rounded-lg transition-all border border-white/10"
                >
                  <div className="w-10 h-10 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-lg">👑</span>
                  </div>
                  <div className="flex-1 text-left">
                    <h4 className="text-white font-medium">Prime</h4>
                    <p className="text-white/60 text-xs">Strategic AI CEO oversight</p>
                  </div>
                  <span className="text-white/40 text-xs">→</span>
                </button>
              </div>
            </div>
          </div>
        )}
      

      {/* Watch Me Work Modal */}
      
        {watchMeWorkOpen && (
          <div
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setWatchMeWorkOpen(false)}
          >
            <div
              className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl border border-white/20 w-full max-w-6xl max-h-[90vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-white/10">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-2">AI Team in Action</h2>
                  <p className="text-white/60">Watch Byte's team process documents in real-time</p>
                </div>
                <button
                  onClick={() => setWatchMeWorkOpen(false)}
                  className="text-white/60 hover:text-white transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Content */}
              <div className="flex h-[calc(90vh-120px)]">
                {/* Left Side - AI Workers */}
                <div className="w-1/2 p-6 border-r border-white/10 overflow-y-auto">
                  <h3 className="text-lg font-semibold text-white mb-4">AI Workers</h3>
                  <div className="space-y-4">
                    {aiWorkers.map((worker) => (
                      <div
                        key={worker.id}
                        className="bg-white/5 rounded-xl p-4 border border-white/10"
                      >
                        <div className="flex items-center gap-3 mb-3">
                          <div className={`w-12 h-12 bg-gradient-to-r ${worker.color} rounded-xl flex items-center justify-center text-white text-xl`}>
                            {worker.avatar}
                          </div>
                          <div className="flex-1">
                            <h4 className="text-white font-semibold">{worker.name}</h4>
                            <p className="text-white/60 text-sm">{worker.role}</p>
                          </div>
                          <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                            worker.status === 'working' ? 'bg-blue-500/20 text-blue-400' :
                            worker.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                            'bg-gray-500/20 text-gray-400'
                          }`}>
                            {worker.status}
                          </div>
                        </div>
                        
                        {/* Progress Bar */}
                        <div className="mb-3">
                          <div className="flex justify-between text-sm text-white/60 mb-1">
                            <span>{worker.currentTask}</span>
                            <span>{worker.progress}%</span>
                          </div>
                          <div className="w-full bg-white/10 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full bg-gradient-to-r ${worker.color}`}
                              animate={{ width: `${worker.progress}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right Side - Live Chat */}
                <div className="w-1/2 p-6 overflow-y-auto">
                  <h3 className="text-lg font-semibold text-white mb-4">Live Activity Feed</h3>
                  <div className="space-y-3 max-h-[calc(90vh-200px)] overflow-y-auto">
                    {workerMessages.map((message) => {
                      // Ensure content is always a string, even if a Promise somehow got in
                      let displayContent = '';
                      try {
                        if (message.content instanceof Promise) {
                          // If it's a Promise, don't render it (or show a placeholder)
                          displayContent = 'Processing...';
                        } else {
                          displayContent = String(message.content || '');
                        }
                      } catch {
                        displayContent = String(message.content || '');
                      }
                      
                      return (
                        <div
                          key={message.id}
                          className={`p-3 rounded-lg ${
                            message.type === 'chat' ? 'bg-blue-500/10 border border-blue-500/20' :
                            message.type === 'status' ? 'bg-green-500/10 border border-green-500/20' :
                            'bg-purple-500/10 border border-purple-500/20'
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-semibold text-white">{message.worker}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              message.type === 'chat' ? 'bg-blue-500/20 text-blue-400' :
                              message.type === 'status' ? 'bg-green-500/20 text-green-400' :
                              'bg-purple-500/20 text-purple-400'
                            }`}>
                              {message.type}
                            </span>
                            <span className="text-xs text-white/40">
                              {new Date(message.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                          <p className="text-white/80 text-sm">{displayContent}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      

      </div>

      {/* Legacy ByteDocumentChat removed - now using unified chat from DashboardLayout */}
      {/* All chat functionality is handled by the unified chat system */}

      {/* AI Employee Activity Panel */}
      <div className={`fixed top-0 right-0 h-full w-80 bg-gradient-to-b from-slate-900 to-slate-800 border-l border-white/10 shadow-2xl transform transition-transform duration-300 z-40 ${
        isEmployeePanelOpen ? 'translate-x-0' : 'translate-x-full'
      }`}>
        {/* Panel Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
              <span className="text-white text-sm">🤖</span>
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">AI Team Activity</h3>
              <p className="text-white/60 text-sm">Live employee status</p>
            </div>
          </div>
          <button onClick={() => setIsEmployeePanelOpen(false)} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
            <X className="w-4 h-4 text-white/60" />
          </button>
        </div>

        {/* Employee Status List */}
        <div className="p-4 space-y-4">
          {[
            { name: 'Byte', role: 'Document Processor', status: 'working', task: 'Processing receipts', progress: 75, avatar: '📄', color: 'from-blue-500 to-cyan-500' },
            { name: 'Tag', role: 'Categorization Expert', status: 'idle', task: 'Ready for new tasks', progress: 0, avatar: '🏷️', color: 'from-green-500 to-emerald-500' },
            { name: 'Crystal', role: 'Financial Analyst', status: 'working', task: 'Analyzing spending patterns', progress: 45, avatar: '💎', color: 'from-purple-500 to-pink-500' },
            { name: 'Finley', role: 'Financial Assistant', status: 'available', task: 'Ready to assist', progress: 0, avatar: '💰', color: 'from-yellow-500 to-orange-500' }
          ].map((employee, index) => (
            <div key={index} className="bg-white/5 border border-white/10 rounded-xl p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-10 h-10 bg-gradient-to-r ${employee.color} rounded-lg flex items-center justify-center`}>
                  <span className="text-white text-lg">{employee.avatar}</span>
                </div>
                <div className="flex-1">
                  <h4 className="text-white font-semibold">{employee.name}</h4>
                  <p className="text-white/60 text-sm">{employee.role}</p>
                </div>
                <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                  employee.status === 'working' ? 'bg-green-500/20 text-green-400' :
                  employee.status === 'available' ? 'bg-blue-500/20 text-blue-400' :
                  'bg-gray-500/20 text-gray-400'
                }`}>
                  {employee.status}
                </div>
              </div>
              <p className="text-white/80 text-sm mb-2">{employee.task}</p>
              {employee.progress > 0 && (
                <div className="w-full bg-white/10 rounded-full h-2">
                  <div 
                    className={`bg-gradient-to-r ${employee.color} h-2 rounded-full transition-all duration-300`}
                    style={{ width: `${employee.progress}%` }}
                  ></div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Activity Feed */}
        <div className="p-4 border-t border-white/10">
          <h4 className="text-white font-semibold mb-3">Recent Activity</h4>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {[
              { action: 'Byte processed 5 receipts', time: '2 min ago', icon: '📄' },
              { action: 'Tag categorized 12 transactions', time: '5 min ago', icon: '🏷️' },
              { action: 'Crystal generated spending report', time: '8 min ago', icon: '💎' },
              { action: 'Finley provided budget advice', time: '12 min ago', icon: '💰' }
            ].map((activity, index) => (
              <div key={index} className="flex items-center gap-3 text-sm">
                <span className="text-lg">{activity.icon}</span>
                <div className="flex-1">
                  <p className="text-white/80">{activity.action}</p>
                  <p className="text-white/50 text-xs">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* AI Team Toggle Button */}
      <button
        onClick={() => setIsEmployeePanelOpen(!isEmployeePanelOpen)}
        className={`fixed top-1/2 -translate-y-1/2 z-30 flex flex-col items-center gap-1 px-3 py-6 bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg hover:shadow-xl transition-all duration-300 ${
          isEmployeePanelOpen ? 'right-[320px] rounded-l-lg' : 'right-0 rounded-l-lg'
        }`}
        style={{
          writingMode: 'vertical-rl',
          textOrientation: 'mixed'
        }}
        title="View AI Team Activity"
      >
        <span className="text-xs font-semibold">AI TEAM</span>
      </button>

      {/* Legacy Floating Byte Chat Button removed - now using unified chat side tab (desktop) / bottom nav (mobile) */}
    </>
  );
};

export default SmartImportAIPage;
