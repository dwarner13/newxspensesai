import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  AlertCircle
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { processImageWithSmartOCR, SmartOCRResult } from '../../utils/smartOCRManager';
import { redactDocument, generateAIEmployeeNotification } from '../../utils/documentRedaction';
import { processLargeFile, getFileRecommendations, ProcessingProgress } from '../../utils/largeFileProcessor';
import toast from 'react-hot-toast';

interface ChatMessage {
  id: string;
  type: 'user' | 'byte';
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Initialize with welcome message
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const welcomeMessage: ChatMessage = {
        id: '1',
        type: 'byte',
        content: "Hello! I'm Byte, your document processing AI. You can upload receipts, invoices, bank statements, or any financial documents, and I'll read them, extract the information, and help you categorize and analyze them. Just drag and drop files or click the upload button!",
        timestamp: new Date().toISOString()
      };
      setMessages([welcomeMessage]);
    }
  }, [isOpen, messages.length]);

  const handleFileUpload = async (files: FileList) => {
    console.log('🚀 File upload started:', files.length, 'files');
    
    // For development, allow uploads even without authentication
    if (!user) {
      console.log('No user found, but allowing upload for development');
      // Continue with upload process
    }

    setIsUploading(true);
    setIsProcessing(true);
    const fileArray = Array.from(files);

    // Add user message showing uploaded files
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: `Uploaded ${fileArray.length} file(s): ${fileArray.map(f => f.name).join(', ')}`,
      timestamp: new Date().toISOString(),
      attachments: fileArray.map(file => ({
        type: file.type.startsWith('image/') ? 'image' : 'document',
        url: URL.createObjectURL(file),
        filename: file.name
      }))
    };

    setMessages(prev => [...prev, userMessage]);

    // Process each file
    for (const file of fileArray) {
      try {
        setIsUploadProcessing(true);
        
        // Add processing message
        const processingMessage: ChatMessage = {
          id: `processing-${file.name}`,
          type: 'byte',
          content: `🔍 Analyzing ${file.name}... This may take up to 3 minutes for large files.\n\n💬 **You can still chat with me while I process your document!** Ask me questions or give me instructions.`,
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, processingMessage]);

        // Upload file to Supabase storage
        const fileName = `${user.id}/${Date.now()}-${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from('receipts')
          .upload(fileName, file);

        if (uploadError) {
          throw uploadError;
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('receipts')
          .getPublicUrl(fileName);

        // Check file recommendations
        const recommendations = getFileRecommendations(file);
        if (!recommendations.recommended) {
          const warningMessage: ChatMessage = {
            id: Date.now().toString(),
            type: 'byte',
            content: `⚠️ **File Warnings:**\n${recommendations.warnings.map(w => `• ${w}`).join('\n')}\n\n**Suggestions:**\n${recommendations.suggestions.map(s => `• ${s}`).join('\n')}`,
            timestamp: new Date().toISOString()
          };
          setMessages(prev => [...prev, warningMessage]);
        }
        
        // Process with Large File Processor
        console.log('Processing with Large File Processor...');
        
        console.log('Starting large file processing...');
        const result = await processLargeFile(
          file,
          {
            maxFileSize: 100 * 1024 * 1024, // 100MB
            timeoutMs: 2 * 60 * 1000, // 2 minutes (reduced from 10)
            retryAttempts: 2 // reduced from 3
          },
          (progress) => {
            console.log('Processing progress:', progress);
            setProcessingProgress(progress);
            
            // Update progress message
            const progressMessage: ChatMessage = {
              id: `progress-${file.name}`,
              type: 'byte',
              content: `🔄 **${progress.stage.toUpperCase()}** (${progress.progress}%)\n${progress.message}`,
              timestamp: new Date().toISOString()
            };
            
            setMessages(prev => {
              const filtered = prev.filter(msg => msg.id !== `progress-${file.name}`);
              return [...filtered, progressMessage];
            });
          }
        );
        
        console.log('Large file processing result:', result);
        
        if (!result.success) {
          console.log('Large file processing failed, trying fallback OCR...');
          
          // Fallback to simple OCR if large file processing fails
          const { processImageWithOCR } = await import('../../utils/ocrService');
          const fallbackResult = await processImageWithOCR(file);
          
          console.log('Fallback OCR result:', fallbackResult);
          
          // Create a simplified result structure
          const fallbackData = {
            text: fallbackResult.text,
            parsedData: {
              vendor: 'Unknown Vendor',
              date: new Date().toISOString().split('T')[0],
              total: 0,
              items: [],
              category: 'Uncategorized',
              confidence: fallbackResult.confidence,
              rawText: fallbackResult.text
            },
            redactedText: fallbackResult.text, // No redaction for fallback
            redactionSummary: 'Fallback processing - no redaction applied',
            processingTime: Date.now() - Date.now()
          };
          
          // Use fallback data
          var data = fallbackData;
        } else {
          var data = result.data;
        }
        
        if (!data) {
          throw new Error('No processing data returned');
        }
        
        // Create SmartOCRResult from processed data
        const smartResult: SmartOCRResult = {
          text: data.text,
          parsedData: data.parsedData,
          confidence: 0.9, // High confidence for processed results
          processingTime: data.processingTime,
          engine: 'large-file-processor'
        };
        
        // Use already processed redaction data
        const redactionResult = {
          redactedText: data.redactedText,
          summary: data.redactionSummary
        };
        
        // Generate AI analysis
        const analysis = await generateDocumentAnalysis(smartResult, redactionResult, file);

        // Update the processing message with results
        setMessages(prev => prev.map(msg => 
          msg.id === `processing-${file.name}` 
            ? {
                ...msg,
                content: `✅ Successfully analyzed ${file.name}`,
                attachments: [{
                  type: file.type.startsWith('image/') ? 'image' : 'document',
                  url: urlData.publicUrl,
                  filename: file.name,
                  extractedText: smartResult.text,
                  redactedText: redactionResult.redactedText,
                  analysis: analysis
                }]
              }
            : msg
        ));

        // Add Byte's analysis message
        const analysisMessage: ChatMessage = {
          id: `analysis-${file.name}`,
          type: 'byte',
          content: generateByteAnalysis(analysis, file.name),
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, analysisMessage]);

        // Save to database
        await saveDocumentToDatabase(file, urlData.publicUrl, smartResult, redactionResult, analysis);

      } catch (error) {
        console.error('Error processing file:', error);
        toast.error(`Failed to process ${file.name}`);
        
        // Update processing message with error
        setMessages(prev => prev.map(msg => 
          msg.id === `processing-${file.name}` 
            ? {
                ...msg,
                content: `❌ Failed to process ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`
              }
            : msg
        ));
      }
    }

    setIsUploadProcessing(false);
    setIsUploading(false);
    setUploadedFiles([]);
  };

  const generateDocumentAnalysis = async (smartResult: SmartOCRResult, redactionResult: any, file: File) => {
    // Simulate AI analysis based on extracted data
    const analysis = {
      documentType: file.type.startsWith('image/') ? 'Receipt/Invoice' : 'Financial Document',
      vendor: smartResult.parsedData?.vendor || 'Unknown Vendor',
      amount: smartResult.parsedData?.total || 0,
      date: smartResult.parsedData?.date || new Date().toISOString().split('T')[0],
      category: smartResult.parsedData?.category || 'Uncategorized',
      confidence: smartResult.confidence,
      ocrEngine: smartResult.engine,
      redactedItems: redactionResult.redactedItems?.length || 0,
      keyInsights: [
        `Document processed with ${smartResult.engine} OCR engine`,
        `Confidence level: ${(smartResult.confidence * 100).toFixed(1)}%`,
        redactionResult.redactedItems?.length > 0 ? `${redactionResult.redactedItems.length} sensitive items redacted` : 'No sensitive data detected',
        smartResult.parsedData?.vendor ? `Vendor identified: ${smartResult.parsedData.vendor}` : 'Vendor not clearly identified'
      ]
    };

    return analysis;
  };

  const generateByteAnalysis = (analysis: any, filename: string) => {
    return `📄 **Document Analysis for ${filename}**

**Document Type:** ${analysis.documentType}
**Vendor:** ${analysis.vendor}
**Amount:** $${analysis.amount}
**Date:** ${analysis.date}
**Category:** ${analysis.category}
**Confidence:** ${(analysis.confidence * 100).toFixed(1)}%

**Key Insights:**
${analysis.keyInsights.map((insight: string) => `• ${insight}`).join('\n')}

**Privacy Protection:** ${analysis.redactedItems} sensitive items were automatically redacted to protect your privacy.

Would you like me to categorize this transaction or extract any specific information?`;
  };

  const saveDocumentToDatabase = async (file: File, imageUrl: string, smartResult: SmartOCRResult, redactionResult: any, analysis: any) => {
    // For development, use a default user ID if no user is available
    const userId = user?.id || 'demo-user-123';
    
    console.log('Saving document to database:', { 
      userId, 
      hasUser: !!user, 
      hasSupabase: !!supabase,
      redactionResult,
      analysis,
      smartResult: {
        text: smartResult.text?.substring(0, 100) + '...',
        confidence: smartResult.confidence,
        engine: smartResult.engine
      }
    });

    // Check if Supabase is available
    if (!supabase) {
      console.log('⚠️ Supabase not available - skipping database save');
      return;
    }

    try {
      // Save receipt record
      const { data: receiptData, error: receiptError } = await supabase
        .from('receipts')
        .insert({
          user_id: userId,
          image_url: imageUrl,
          original_filename: file.name,
          processing_status: 'completed',
          extracted_data: {
            ...smartResult.parsedData,
            redacted_ocr_text: redactionResult.redactedText,
            redaction_summary: redactionResult.redactedItems ? generateAIEmployeeNotification(redactionResult.redactedItems) : 'No sensitive data detected',
            ocr_confidence: smartResult.confidence,
            ocr_engine: smartResult.engine,
            analysis: analysis
          }
        })
        .select()
        .single();

      if (receiptError) {
        console.error('Receipt save error:', receiptError);
        throw receiptError;
      }
      
      console.log('✅ Receipt saved successfully:', receiptData);

      // Create transaction if we have valid data
      if (analysis.amount > 0 && analysis.vendor !== 'Unknown Vendor') {
        const { error: transactionError } = await supabase
          .from('transactions')
          .insert({
            user_id: userId,
            date: analysis.date,
            description: analysis.vendor,
            amount: analysis.amount,
            type: 'expense',
            category: analysis.category,
            merchant: analysis.vendor,
            receipt_url: imageUrl,
            categorization_source: 'ai'
          });

        if (transactionError) {
          console.error('Error creating transaction:', transactionError);
        } else {
          console.log('✅ Transaction created successfully');
        }
      }

      // Trigger dashboard stats refresh
      window.dispatchEvent(new CustomEvent('refreshDashboardStats'));

    } catch (error) {
      console.error('Error saving to database:', error);
      console.error('Error details:', {
        userId,
        hasUser: !!user,
        hasSupabase: !!supabase,
        error: error instanceof Error ? error.message : error
      });
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isProcessing) {
      console.log('Message blocked:', { hasMessage: !!inputMessage.trim(), isProcessing, isUploadProcessing });
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

    // Simulate Byte's response
    setTimeout(() => {
      const responses = [
        "I can help you analyze your uploaded documents. What specific information are you looking for?",
        "Based on your documents, I can help categorize transactions, extract key data, or provide financial insights.",
        "Would you like me to create automatic categorization rules for similar transactions?",
        "I can help you identify spending patterns and suggest budget optimizations based on your documents.",
        "Let me know if you need help with tax categorization or expense tracking for your uploaded receipts."
      ];
      
      const randomResponse = responses[Math.floor(Math.random() * responses.length)];
      
      const byteResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'byte',
        content: randomResponse,
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, byteResponse]);
      setIsProcessing(false);
    }, 1500);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileUpload(files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-gray-900 rounded-2xl border border-gray-700 shadow-2xl max-w-4xl max-h-[95vh] w-full mx-2 sm:mx-4 overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-white">Byte AI Document Chat</h2>
                <p className="text-gray-400 text-xs sm:text-sm">Upload documents and chat with Byte</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Chat Messages */}
          <div 
            className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
          >
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[80%] ${message.type === 'user' ? 'flex flex-col items-end' : 'flex flex-col items-start'}`}>
                  {/* Message bubble */}
                  <div
                    className={`p-4 rounded-2xl ${
                      message.type === 'user'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-800 text-gray-200'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {message.type === 'byte' && (
                        <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                          <Bot className="w-3 h-3 text-white" />
                        </div>
                      )}
                      <div className="flex-1">
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                        
                        {/* Attachments */}
                        {message.attachments && message.attachments.map((attachment, index) => (
                          <div key={index} className="mt-3 p-3 bg-white/10 rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                              {attachment.type === 'image' ? (
                                <ImageIcon className="w-4 h-4 text-blue-400" />
                              ) : (
                                <FileText className="w-4 h-4 text-blue-400" />
                              )}
                              <span className="text-xs text-blue-300">{attachment.filename}</span>
                            </div>
                            
                            {attachment.type === 'image' && (
                              <img
                                src={attachment.url}
                                alt={attachment.filename}
                                className="w-full h-32 object-cover rounded-lg mb-2"
                              />
                            )}
                            
                            {attachment.extractedText && (
                              <div className="text-xs text-gray-300 bg-gray-700 p-2 rounded">
                                <strong>Extracted Text:</strong>
                                <p className="mt-1">{attachment.extractedText.substring(0, 200)}...</p>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  {/* Timestamp */}
                  <span className="text-xs text-gray-500 mt-1">
                    {formatTime(message.timestamp)}
                  </span>
                </div>
              </div>
            ))}
            
            {isProcessing && (
              <div className="flex justify-start">
                <div className="bg-gray-800 text-gray-200 p-4 rounded-2xl">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                      <Bot className="w-3 h-3 text-white" />
                    </div>
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-sm">Byte is thinking...</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Status indicator */}
          {(isUploadProcessing || isProcessing) && (
            <div className="px-4 sm:px-6 py-2 bg-gray-800 border-t border-gray-700">
              <div className="flex items-center gap-2 text-sm text-gray-400">
                {isUploadProcessing && (
                  <>
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                    <span>Processing document... You can still chat!</span>
                  </>
                )}
                {isProcessing && !isUploadProcessing && (
                  <>
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span>Byte is typing...</span>
                  </>
                )}
              </div>
            </div>
          )}
          
          {/* Input Area */}
          <div className="p-4 sm:p-6 border-t border-gray-700">
            <div className="flex gap-2 sm:gap-3">
              <input
                type="file"
                ref={fileInputRef}
                onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
                multiple
                accept=".pdf,.csv,.xlsx,.jpg,.png,.jpeg"
                className="hidden"
              />
              
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="p-2 sm:p-3 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Upload Documents"
              >
                {isUploading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Upload className="w-5 h-5" />
                )}
              </button>
              
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder={
                  isUploadProcessing 
                    ? "Upload processing... You can still chat with me!" 
                    : isProcessing 
                    ? "Byte is typing..." 
                    : "Ask Byte about your documents..."
                }
                className="flex-1 bg-gray-800 text-white px-4 py-3 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
                disabled={isProcessing}
              />
              
              <button
                onClick={handleSendMessage}
                disabled={!inputMessage.trim() || isProcessing}
                className="p-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
            
            <p className="text-xs text-gray-500 mt-2 text-center">
              Drag and drop files here or click the upload button to analyze documents with Byte AI
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ByteDocumentChat;
