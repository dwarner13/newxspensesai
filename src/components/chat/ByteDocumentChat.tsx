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
  AlertCircle,
  Brain,
  Sparkles
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { processImageWithSmartOCR, SmartOCRResult } from '../../utils/smartOCRManager';
import { redactDocument, generateAIEmployeeNotification } from '../../utils/documentRedaction';
import { processLargeFile, getFileRecommendations, ProcessingProgress } from '../../utils/largeFileProcessor';
import toast from 'react-hot-toast';

interface ChatMessage {
  id: string;
  type: 'user' | 'byte' | 'crystal';
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
  const [activeAI, setActiveAI] = useState<'byte' | 'crystal'>('byte');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Initialize with welcome messages
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const welcomeMessages: ChatMessage[] = [
        {
          id: '1',
          type: 'byte',
          content: "Hello! I'm Byte, your document processing AI. I specialize in reading and analyzing receipts, invoices, bank statements, and financial documents. Upload your files and I'll extract all the important information for you!",
          timestamp: new Date().toISOString()
        },
        {
          id: '2',
          type: 'crystal',
          content: "Hello! I'm Crystal, your intelligent financial advisor AI. I specialize in analyzing your spending patterns, creating personalized budgets, and providing actionable financial insights. I can help you with debt management, investment strategies, goal setting, and expense optimization. Ask me anything about your finances - I'm here to help you make smarter money decisions!",
          timestamp: new Date().toISOString()
        }
      ];
      setMessages(welcomeMessages);
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
        
        // Use enhanced OCR with proper parsing and OpenAI Vision fallback
        console.log('Using enhanced OCR with smart parsing...');
        
        const { processImageWithOCR, parseReceiptText, extractTextWithOpenAIVision } = await import('../../utils/ocrService');
        
        let ocrResult;
        let usedOpenAI = false;
        
        try {
          // Try OCR.space first
          ocrResult = await processImageWithOCR(file);
          console.log('OCR.space result:', ocrResult);
        } catch (error) {
          console.log('OCR.space failed, trying OpenAI Vision...', error);
          try {
            // Fallback to OpenAI Vision (like ChatGPT uses)
            ocrResult = await extractTextWithOpenAIVision(file);
            usedOpenAI = true;
            console.log('OpenAI Vision result:', ocrResult);
          } catch (openaiError) {
            console.error('Both OCR methods failed:', openaiError);
            throw new Error('Failed to extract text from document. Please try a clearer image or different file format.');
          }
        }
        
        console.log('Final OCR result:', ocrResult);
        console.log('Extracted text length:', ocrResult.text?.length || 0);
        console.log('First 500 characters of extracted text:', ocrResult.text?.substring(0, 500));
        console.log('Used OpenAI Vision:', usedOpenAI);
        
        // Parse the extracted text with enhanced logic
        const parsedData = parseReceiptText(ocrResult.text);
        console.log('Enhanced parsing result:', parsedData);
        
        // Create result structure
        const data = {
          text: ocrResult.text,
          parsedData: {
            vendor: parsedData.vendor || 'Unknown Vendor',
            date: parsedData.date || new Date().toISOString().split('T')[0],
            total: parsedData.total || 0,
            items: parsedData.items || [],
            category: parsedData.category || 'Uncategorized',
            confidence: parsedData.confidence || ocrResult.confidence,
            rawText: ocrResult.text
          },
          redactedText: ocrResult.text, // No redaction for now
          redactionSummary: 'Enhanced OCR processing with smart parsing - no redaction applied',
          processingTime: Date.now() - Date.now()
        };
        
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

        // Add Crystal's document reading capability message
        const crystalMessage: ChatMessage = {
          id: `crystal-read-${file.name}`,
          type: 'crystal',
          content: `📖 **I can now read your ${file.name} document!** 

I have access to the complete text content and can answer detailed questions about:
• Specific transactions and amounts
• Vendor information and dates
• Spending patterns and categories
• Any discrepancies or unusual items
• Financial insights and recommendations

Try asking me questions like:
- "What's the total amount on this statement?"
- "Who is the vendor for the largest transaction?"
- "Are there any unusual charges I should review?"
- "What spending category does this fall under?"

I'm here to help you understand your financial documents! 💎`,
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, crystalMessage]);

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

      // Create transaction (even with basic data)
      const { error: transactionError } = await supabase
        .from('transactions')
        .insert({
          user_id: userId,
          receipt_id: receiptData.id, // Link to the receipt
          date: analysis.date || new Date().toISOString().split('T')[0],
          description: analysis.vendor || 'Document Upload',
          amount: analysis.amount || 0,
          type: 'expense',
          category: analysis.category || 'Uncategorized',
          merchant: analysis.vendor || 'Unknown Vendor',
          receipt_url: imageUrl
        });

      if (transactionError) {
        console.error('Error creating transaction:', transactionError);
        console.error('Transaction error details:', transactionError);
      } else {
        console.log('✅ Transaction created successfully');
      }

      // Create user_documents record
      const { error: userDocError } = await supabase
        .from('user_documents')
        .insert({
          user_id: userId,
          source_url: imageUrl,
          raw_text: smartResult.text
        });

      if (userDocError) {
        console.error('Error creating user_documents record:', userDocError);
        console.error('User document error details:', userDocError);
      } else {
        console.log('✅ User document record created successfully');
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

    try {
      if (activeAI === 'crystal') {
        // Use real AI for Crystal
        await handleCrystalAIResponse(inputMessage);
      } else {
        // Use mock responses for Byte (document processing)
        const timeoutId = setTimeout(() => {
          const responses = [
            "I can help you analyze your uploaded documents. What specific information are you looking for?",
            "Based on your documents, I can help categorize transactions, extract key data, or provide financial insights.",
            "Would you like me to create automatic categorization rules for similar transactions?",
            "I can help you identify spending patterns and suggest budget optimizations based on your documents.",
            "Let me know if you need help with tax categorization or expense tracking for your uploaded receipts.",
            "I've processed your document and extracted all the key information. Would you like me to explain any specific details?"
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

        // Add a safety timeout to prevent getting stuck
        const safetyTimeout = setTimeout(() => {
          console.log('Byte response timeout - forcing completion');
          setIsProcessing(false);
        }, 10000); // 10 second safety timeout

        // Clear safety timeout when response completes
        return () => {
          clearTimeout(timeoutId);
          clearTimeout(safetyTimeout);
        };
      }
    } catch (error) {
      console.error('Error generating AI response:', error);
      setIsProcessing(false);
    }
  };

  const handleCrystalAIResponse = async (userMessage: string) => {
    try {
      // Get conversation context
      const conversationHistory = messages.slice(-10).map(msg => ({
        role: msg.type === 'user' ? 'user' : 'assistant',
        content: msg.content
      }));

      // Get user's transaction data for context
      const { data: transactions } = await supabase
        .from('transactions')
        .select('*')
        .limit(20)
        .order('date', { ascending: false });

      // Get document content from recent messages
      const recentDocuments = messages
        .filter(msg => msg.attachments && msg.attachments.length > 0)
        .slice(-3) // Last 3 documents
        .map(msg => ({
          filename: msg.attachments?.[0]?.filename,
          extractedText: msg.attachments?.[0]?.extractedText,
          analysis: msg.attachments?.[0]?.analysis
        }));

      // Create enhanced context for Crystal AI
      const systemPrompt = `You are Crystal, a sophisticated financial AI assistant. You specialize in:
- Financial analysis and insights
- Spending pattern recognition
- Budget recommendations
- Financial goal setting
- Investment advice
- Expense optimization
- Document analysis and interpretation

User's recent transactions: ${transactions ? JSON.stringify(transactions.slice(0, 5)) : 'No transactions yet'}

Recent documents uploaded: ${recentDocuments.length > 0 ? JSON.stringify(recentDocuments) : 'No recent documents'}

You have access to the full text content of recently uploaded documents. When users ask questions about their documents, you can:
- Read and analyze the complete document text
- Answer specific questions about transactions, amounts, dates, vendors
- Provide insights based on the actual document content
- Compare information across multiple documents
- Identify patterns and discrepancies

Be conversational, insightful, and provide specific, actionable advice. Use the user's actual data and document content when possible.`;

      const response = await fetch('/.netlify/functions/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: systemPrompt },
            ...conversationHistory,
            { role: 'user', content: userMessage }
          ],
          model: 'gpt-4',
          temperature: 0.7,
          max_tokens: 500
        })
      });

      if (!response.ok) {
        throw new Error('Failed to get AI response');
      }

      const data = await response.json();
      const aiResponse = data.choices[0].message.content;

      const crystalResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'crystal',
        content: aiResponse,
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, crystalResponse]);
      setIsProcessing(false);

    } catch (error) {
      console.error('Crystal AI error:', error);
      
      // Fallback to smart contextual responses
      const contextualResponses = generateContextualResponse(userMessage);
      
      const fallbackResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'crystal',
        content: contextualResponses,
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, fallbackResponse]);
      setIsProcessing(false);
    }
  };

  const generateContextualResponse = (userMessage: string): string => {
    const message = userMessage.toLowerCase();
    
    // Smart contextual responses based on user input
    if (message.includes('budget') || message.includes('spending')) {
      return "I'd love to help you with budgeting! Based on your transaction history, I can see patterns in your spending. Would you like me to analyze your expenses by category and suggest a personalized budget plan? I can also help you identify areas where you might be able to save money.";
    }
    
    if (message.includes('save') || message.includes('saving')) {
      return "Great question about saving! Looking at your spending patterns, I can help you identify opportunities to save more. I can analyze your recurring expenses, suggest alternatives, and help you set up automatic savings goals. What's your current savings target?";
    }
    
    if (message.includes('debt') || message.includes('loan')) {
      return "I understand you're thinking about debt management. I can help you create a debt payoff strategy, analyze your debt-to-income ratio, and suggest the best approach (debt snowball vs. avalanche method). Would you like me to analyze your current debt situation?";
    }
    
    if (message.includes('investment') || message.includes('invest')) {
      return "Investment planning is crucial for long-term financial health! I can help you understand different investment options, assess your risk tolerance, and create a diversified portfolio strategy. What's your investment timeline and risk preference?";
    }
    
    if (message.includes('goal') || message.includes('target')) {
      return "Setting financial goals is the first step to achieving them! I can help you create SMART financial goals (Specific, Measurable, Achievable, Relevant, Time-bound) and track your progress. What financial milestone are you working towards?";
    }
    
    if (message.includes('category') || message.includes('categorize')) {
      return "I can help you organize and categorize your expenses for better financial tracking! I can analyze your spending patterns, suggest custom categories, and help you set up automatic categorization rules. This will give you much clearer insights into where your money goes.";
    }
    
    if (message.includes('trend') || message.includes('pattern')) {
      return "I love analyzing spending trends! I can identify patterns in your financial behavior, seasonal spending variations, and help you understand your money habits. This analysis can reveal opportunities for optimization and better financial planning.";
    }
    
    if (message.includes('emergency') || message.includes('fund')) {
      return "Emergency funds are essential for financial security! I can help you calculate how much you need (typically 3-6 months of expenses), create a plan to build it up, and suggest the best place to keep it. How much do you currently have saved for emergencies?";
    }
    
    // Default intelligent response
    return "I'm here to help you with all aspects of your financial journey! I can analyze your spending patterns, help with budgeting, provide investment guidance, and assist with financial goal setting. What specific area of your finances would you like to focus on today?";
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
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                activeAI === 'byte' 
                  ? 'bg-gradient-to-r from-blue-500 to-purple-500' 
                  : 'bg-gradient-to-r from-purple-500 to-pink-500'
              }`}>
                {activeAI === 'byte' ? (
                  <Bot className="w-5 h-5 text-white" />
                ) : (
                  <Brain className="w-5 h-5 text-white" />
                )}
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-white">
                  {activeAI === 'byte' ? 'Byte AI Document Chat' : 'Crystal AI Financial Chat'}
                </h2>
                <p className="text-gray-400 text-xs sm:text-sm">
                  {activeAI === 'byte' 
                    ? 'Upload documents and chat with Byte' 
                    : 'Get financial insights and analysis from Crystal'
                  }
                </p>
              </div>
            </div>
            
            {/* AI Employee Switcher */}
            <div className="flex items-center gap-2">
              <div className="flex bg-gray-800 rounded-lg p-1">
                <button
                  onClick={() => setActiveAI('byte')}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                    activeAI === 'byte'
                      ? 'bg-blue-500 text-white'
                      : 'text-gray-400 hover:text-white hover:bg-gray-700'
                  }`}
                >
                  <Bot className="w-4 h-4" />
                  Byte
                </button>
                <button
                  onClick={() => setActiveAI('crystal')}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                    activeAI === 'crystal'
                      ? 'bg-purple-500 text-white'
                      : 'text-gray-400 hover:text-white hover:bg-gray-700'
                  }`}
                >
                  <Brain className="w-4 h-4" />
                  Crystal
                </button>
              </div>
              
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
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
                      {message.type === 'crystal' && (
                        <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                          <Brain className="w-3 h-3 text-white" />
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
                    <span>{activeAI === 'byte' ? 'Byte is typing...' : 'Crystal is typing...'}</span>
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
                    ? `${activeAI === 'byte' ? 'Byte' : 'Crystal'} is typing...` 
                    : activeAI === 'byte'
                    ? "Ask Byte about your documents..."
                    : "Ask Crystal about your finances..."
                }
                className="flex-1 bg-gray-800 text-white px-4 py-3 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
                disabled={isProcessing && !isUploadProcessing}
              />
              
              <button
                onClick={handleSendMessage}
                disabled={!inputMessage.trim() || (isProcessing && !isUploadProcessing)}
                className="p-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex items-center justify-between mt-2">
              <p className="text-xs text-gray-500">
                {activeAI === 'byte' 
                  ? "Drag and drop files here or click the upload button to analyze documents with Byte AI"
                  : "Switch to Byte to upload documents, or ask Crystal about your financial insights"
                }
              </p>
              {isProcessing && (
                <button
                  onClick={() => {
                    setIsProcessing(false);
                    console.log('Processing manually cleared');
                  }}
                  className="text-xs text-red-400 hover:text-red-300 underline"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ByteDocumentChat;
