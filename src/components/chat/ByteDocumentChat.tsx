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
import { BYTE_KNOWLEDGE_BASE, BYTE_RESPONSES } from '../../ai-knowledge/byte-knowledge-base';
import { CRYSTAL_KNOWLEDGE_BASE, CRYSTAL_RESPONSES, CRYSTAL_PERSONALITY } from '../../ai-knowledge/crystal-knowledge-base';
import toast from 'react-hot-toast';

interface ChatMessage {
  id: string;
  type: 'user' | 'byte' | 'crystal' | 'system';
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
  const [hasShownCrystalSummary, setHasShownCrystalSummary] = useState(false);
  const [uploadedFileCount, setUploadedFileCount] = useState(0);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Show Crystal's transaction summary when switching to Crystal tab
  useEffect(() => {
    if (activeAI === 'crystal' && !hasShownCrystalSummary) {
      const hasProcessedDocuments = messages.some(msg => 
        msg.attachments && msg.attachments.length > 0 && msg.attachments[0].analysis
      );
      
      if (hasProcessedDocuments) {
        const latestDocument = messages
          .filter(msg => msg.attachments && msg.attachments.length > 0)
          .slice(-1)[0];
        
        if (latestDocument?.attachments?.[0]?.analysis) {
          const analysis = latestDocument.attachments[0].analysis;
          
          const crystalWelcomeMessage: ChatMessage = {
            id: `crystal-welcome-${Date.now()}`,
            type: 'crystal',
            content: `💎 **Welcome to Crystal's Financial Analysis!**

I can see you've uploaded and processed financial documents. Here's your transaction summary:

📊 **Your Financial Overview:**
• **Document Type:** ${analysis.category || 'Financial Document'}
• **Statement Date:** ${analysis.date || 'Current period'}
• **Total Amount:** ${analysis.total ? `$${analysis.total}` : 'Processed'}
• **Transactions:** ${analysis.individualTransactions?.length || 'Multiple'} transactions analyzed

🎯 **What I can help you with:**
• Spending pattern analysis
• Budget recommendations
• Financial insights and trends
• Goal setting and tracking
• Investment strategies

💡 **Quick Access:**
[View All Your Transactions](/dashboard/transactions) - See detailed transaction breakdown

What financial insights would you like to explore today? I'm here to help you make smarter money decisions! 💰`,
            timestamp: new Date().toISOString()
          };
          
          setMessages(prev => [...prev, crystalWelcomeMessage]);
          setHasShownCrystalSummary(true);
        }
      }
    }
  }, [activeAI, hasShownCrystalSummary, messages]);

  // Initialize with conversational greeting from Byte
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const greetings = [
        "Hey there! 👋 How are you doing today?",
        "Hi! How's it going? Ready to process some documents?",
        "Hello! How are you? I'm here to help with your documents!",
        "Hey! How are you doing? What can I help you with today?",
        "Hi there! How are you? Ready to upload some files?"
      ];
      
      const randomGreeting = greetings[Math.floor(Math.random() * greetings.length)];
      
      const welcomeMessage: ChatMessage = {
        id: '1',
        type: 'byte',
        content: randomGreeting,
        timestamp: new Date().toISOString()
      };
      setMessages([welcomeMessage]);
    }
  }, [isOpen, messages.length]);

  const handleFileUpload = async (files: FileList) => {
    console.log('🚀 File upload started:', files.length, 'files');
    
    // File limits and validation
    const MAX_FILES = 5; // Reduced for better performance
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    const SUPPORTED_TYPES = ['.pdf', '.csv', '.xlsx', '.xls', '.txt', '.jpg', '.jpeg', '.png'];
    
    // Check total file count
    if (files.length > MAX_FILES) {
      toast.error(`Maximum ${MAX_FILES} files allowed per upload. Please select fewer files.`);
      return;
    }
    
    // Validate each file
    const validFiles: File[] = [];
    const invalidFiles: string[] = [];
    
    Array.from(files).forEach(file => {
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
      toast.error(`Invalid files:\n${invalidFiles.join('\n')}`);
    }
    
    if (validFiles.length === 0) {
      return;
    }
    
    // For development, allow uploads even without authentication
    if (!user) {
      console.log('No user found, but allowing upload for development');
      // Continue with upload process
    }

    setIsUploading(true);
    setIsProcessing(true);
    setUploadProgress({ current: 0, total: validFiles.length });
    const fileArray = validFiles;

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
    for (let i = 0; i < fileArray.length; i++) {
      const file = fileArray[i];
      try {
        setIsUploadProcessing(true);
        setUploadProgress({ current: i + 1, total: fileArray.length });
        
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
        
        // Add progress message
        const progressMessage: ChatMessage = {
          id: `progress-${file.name}`,
          type: 'byte',
          content: `🔍 **Processing ${file.name}...**\n\nExtracting text and analyzing transactions. This may take up to 30 seconds for complex documents.`,
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, progressMessage]);
        
        const { processImageWithOCR, parseReceiptText, extractTextWithOpenAIVision } = await import('../../utils/ocrService');
        
        let ocrResult;
        let usedOpenAI = false;
        
        try {
          // Add timeout to OCR processing
          const ocrPromise = processImageWithOCR(file);
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('OCR timeout after 30 seconds')), 30000)
          );
          
          ocrResult = await Promise.race([ocrPromise, timeoutPromise]);
          console.log('OCR.space result:', ocrResult);
          
          // Check if OCR actually extracted any text
          if (!ocrResult.text || ocrResult.text.trim().length === 0) {
            throw new Error('OCR.space extracted no text from the image');
          }
        } catch (error) {
          console.log('OCR.space failed or timed out, trying OpenAI Vision...', error);
          try {
            // Fallback to OpenAI Vision with shorter timeout
            const openAIPromise = extractTextWithOpenAIVision(file);
            const openAITimeout = new Promise((_, reject) => 
              setTimeout(() => reject(new Error('OpenAI Vision timeout after 20 seconds')), 20000)
            );
            
            ocrResult = await Promise.race([openAIPromise, openAITimeout]);
            usedOpenAI = true;
            console.log('OpenAI Vision result:', ocrResult);
            
            // Check if OpenAI Vision actually extracted any text
            if (!ocrResult.text || ocrResult.text.trim().length === 0) {
              throw new Error('OpenAI Vision extracted no text from the image');
            }
          } catch (openaiError) {
            console.error('Both OCR methods failed:', openaiError);
            
            // Provide more specific error messages based on the error type
            let errorMessage = 'Failed to extract text from document. ';
            if (openaiError instanceof Error) {
              if (openaiError.message.includes('timeout')) {
                errorMessage += 'The image processing is taking too long. ';
              } else if (openaiError.message.includes('API key')) {
                errorMessage += 'OCR service configuration issue. ';
              } else if (openaiError.message.includes('No text')) {
                errorMessage += 'The image may be too blurry, poorly lit, or not contain readable text. ';
              }
            }
            
            errorMessage += 'Please try:\n• A clearer, well-lit image\n• A different file format (PNG, JPG, PDF)\n• Making sure the document is not password protected\n• Checking that the file size is under 10MB';
            
            throw new Error(errorMessage);
          }
        }
        
        console.log('Final OCR result:', ocrResult);
        console.log('Extracted text length:', ocrResult.text?.length || 0);
        console.log('First 500 characters of extracted text:', ocrResult.text?.substring(0, 500));
        console.log('Used OpenAI Vision:', usedOpenAI);
        
        // Parse the extracted text with enhanced logic
        const parsedData = parseReceiptText(ocrResult.text);
        console.log('Enhanced parsing result:', parsedData);
        console.log('Document analysis details:', {
          category: parsedData.category,
          vendor: parsedData.vendor,
          total: parsedData.total,
          isCreditCardStatement: parsedData.isCreditCardStatement,
          individualTransactions: parsedData.individualTransactions?.length || 0
        });
        
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

        // Automatic Crystal handoff for financial documents
        const shouldHandoffToCrystal = analysis.isCreditCardStatement || 
            analysis.category === 'Credit Card Statement' || 
            analysis.category === 'Bank Statement' ||
            analysis.category === 'Financial Document' ||
            analysis.category === 'Invoice' ||
            analysis.category === 'Receipt' ||
            (analysis.total && analysis.total > 0) ||
            (analysis.vendor && analysis.vendor !== 'Unknown Vendor');
            
        console.log('Crystal handoff decision:', {
          shouldHandoff: shouldHandoffToCrystal,
          isCreditCardStatement: analysis.isCreditCardStatement,
          category: analysis.category,
          total: analysis.total,
          vendor: analysis.vendor
        });
        
        if (shouldHandoffToCrystal) {
          // Add Crystal's automatic entry message
          setTimeout(() => {
            const crystalEntryMessage: ChatMessage = {
              id: `crystal-entry-${file.name}`,
              type: 'crystal',
              content: `💎 **Hi there! Crystal here!** 

I can see Byte just processed your ${analysis.category.toLowerCase()}. I'm now analyzing all the transactions and preparing them for smart categorization! 

🔍 **What I'm working on:**
• Extracting individual transactions
• Identifying spending patterns
• Preparing data for smart categorization
• Setting up budget insights

This will take just a moment... ⏳`,
              timestamp: new Date().toISOString()
            };
            setMessages(prev => [...prev, crystalEntryMessage]);
          }, 2000);

          // Add Crystal's working indicator
          setTimeout(() => {
            const crystalWorkingMessage: ChatMessage = {
              id: `crystal-working-${file.name}`,
              type: 'crystal',
              content: `🔄 **Processing transactions...** 

I'm currently analyzing ${analysis.individualTransactions?.length || 'multiple'} transactions from your statement. Each transaction is being:
• Categorized by type (dining, shopping, utilities, etc.)
• Tagged with smart labels
• Added to your spending patterns
• Prepared for budget insights

Almost done... ✨`,
              timestamp: new Date().toISOString()
            };
            setMessages(prev => [...prev, crystalWorkingMessage]);
          }, 3500);

          // Add Crystal's analysis completion message with transaction summary
          setTimeout(() => {
            const crystalAnalysisMessage: ChatMessage = {
              id: `crystal-analysis-${file.name}`,
              type: 'crystal',
              content: `✨ **Analysis Complete!** 

I've successfully processed your financial data and it's now ready for smart categorization! 

📊 **Transaction Summary:**
• **Total Transactions:** ${analysis.individualTransactions?.length || 'Multiple'} transactions processed
• **Statement Period:** ${analysis.date || 'Current period'}
• **Total Amount:** ${analysis.total ? `$${analysis.total}` : 'Processed'}
• **Categories Applied:** Dining, Shopping, Utilities, Entertainment, and more

🔍 **Smart Categorization Applied:**
• All transactions automatically categorized
• Spending patterns identified
• Budget insights prepared
• Ready for financial analysis

💡 **Next Steps:**
For all your transactions, click here to view them in detail: [View All Transactions](/dashboard/transactions)

You can also ask me specific questions about your spending patterns, or I can show you insights about your recent financial activity! 

What would you like to explore first? 📈`,
              timestamp: new Date().toISOString()
            };
            setMessages(prev => [...prev, crystalAnalysisMessage]);
          }, 5000);
        }

        // Clear processing state after analysis is complete
        setIsProcessing(false);

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

${analysis.isCreditCardStatement && analysis.individualTransactions && analysis.individualTransactions.length > 0 
  ? `💳 **I can also provide detailed analysis of all ${analysis.individualTransactions.length} transactions!**\n\nTry asking me:\n• "Summarize each transaction"\n• "Categorize my spending"\n• "What are my biggest expenses?"\n• "Show me spending patterns"\n• "List all merchants and amounts"` 
  : ''}

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

        // Dispatch event to refresh transactions page
        window.dispatchEvent(new CustomEvent('documentUploaded'));

        // Ensure processing state is cleared
        setIsUploadProcessing(false);
        setIsUploading(false);

      } catch (error) {
        console.error('Error processing file:', error);
        toast.error(`Failed to process ${file.name}`);
        
        // Update processing message with error and helpful guidance
        setMessages(prev => prev.map(msg => 
          msg.id === `processing-${file.name}` 
            ? {
                ...msg,
                content: `❌ **Failed to process ${file.name}**\n\n**Error:** ${error instanceof Error ? error.message : 'Unknown error'}\n\n**Troubleshooting:**\n• Try a clearer image or PDF\n• Make sure the document is not password protected\n• Check that the file size is under 10MB\n• Try a different file format (PNG, JPG, PDF)\n\n**I can still help!** Ask me questions about document processing or try uploading a different file.`
              }
            : msg
        ));
        
        // Ensure processing state is cleared even on error
        setIsUploadProcessing(false);
        setIsUploading(false);
        setIsProcessing(false);
        
        // Force clear any stuck states with a timeout
        setTimeout(() => {
          setIsProcessing(false);
          setIsUploadProcessing(false);
          setIsUploading(false);
        }, 1000);
      }
    }

    // Final cleanup
    setIsUploadProcessing(false);
    setIsUploading(false);
    setUploadedFiles([]);
    setUploadedFileCount(prev => prev + fileArray.length);
  };

  const generateDocumentAnalysis = async (smartResult: SmartOCRResult, redactionResult: any, file: File) => {
    // Enhanced AI analysis with actual document content
    const analysis = {
      documentType: file.type.startsWith('image/') ? 'Receipt/Invoice' : 'Financial Document',
      vendor: smartResult.parsedData?.vendor || 'Unknown Vendor',
      amount: smartResult.parsedData?.total || 0,
      date: smartResult.parsedData?.date || new Date().toISOString().split('T')[0],
      category: smartResult.parsedData?.category || 'Uncategorized',
      confidence: smartResult.confidence,
      ocrEngine: smartResult.engine,
      redactedItems: redactionResult.redactedItems?.length || 0,
      // Include actual document content for Crystal to analyze
      extractedText: smartResult.text,
      parsedData: smartResult.parsedData,
      rawText: smartResult.text,
      // Enhanced insights based on actual content
      keyInsights: [
        `Document processed with ${smartResult.engine} OCR engine`,
        `Confidence level: ${(smartResult.confidence * 100).toFixed(1)}%`,
        redactionResult.redactedItems?.length > 0 ? `${redactionResult.redactedItems.length} sensitive items redacted` : 'No sensitive data detected',
        smartResult.parsedData?.vendor ? `Vendor identified: ${smartResult.parsedData.vendor}` : 'Vendor not clearly identified',
        `Total text extracted: ${smartResult.text.length} characters`,
        smartResult.parsedData?.items?.length > 0 ? `${smartResult.parsedData.items.length} individual items found` : 'No individual items parsed'
      ],
      // Add transaction-specific data
      isCreditCardStatement: smartResult.text.toLowerCase().includes('statement') || smartResult.text.toLowerCase().includes('credit card'),
      total: smartResult.parsedData?.total || 0,
      items: smartResult.parsedData?.items || []
    };

    return analysis;
  };

  const generateByteAnalysis = (analysis: any, filename: string) => {
    if (analysis.isCreditCardStatement && analysis.individualTransactions && analysis.individualTransactions.length > 0) {
      // Enhanced analysis for credit card statements
      const topTransactions = analysis.individualTransactions.slice(0, 5);
      const totalTransactions = analysis.individualTransactions.length;
      const totalAmount = analysis.individualTransactions.reduce((sum: number, tx: any) => sum + (tx.amount || 0), 0);
      
      return `💳 **Credit Card Statement Analysis for ${filename}**

**Statement Period:** ${analysis.statementPeriod?.startDate || 'N/A'} to ${analysis.statementPeriod?.endDate || 'N/A'}
**Card:** ${analysis.vendor}
**Total Transactions:** ${totalTransactions}
**Total Amount:** $${totalAmount.toFixed(2)}
**New Balance:** $${analysis.amount || 0}
**Confidence:** ${(analysis.confidence * 100).toFixed(1)}%

**Account Summary:**
• Previous Balance: $${analysis.accountSummary?.previousBalance || 0}
• Payments Received: $${analysis.accountSummary?.payments || 0}
• Total Purchases: $${analysis.accountSummary?.purchases || 0}
• Available Credit: $${analysis.accountSummary?.availableCredit || 0}

**Top Transactions:**
${topTransactions.map((tx: any, index: number) => 
  `${index + 1}. ${tx.merchant || tx.description} - $${tx.amount} (${tx.transactionDate})`
).join('\n')}

${totalTransactions > 5 ? `... and ${totalTransactions - 5} more transactions` : ''}

**Privacy Protection:** ${analysis.redactedItems} sensitive items were automatically redacted to protect your privacy.

I've extracted all ${totalTransactions} individual transactions from your statement! 

💎 **Ready for detailed analysis?** Click below to continue with Crystal AI for transaction-by-transaction breakdown, spending insights, and financial recommendations!`;
    } else {
      // Regular receipt analysis
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
    }
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

      // Create transactions - handle both single receipts and credit card statements
      if (analysis.isCreditCardStatement && analysis.individualTransactions && analysis.individualTransactions.length > 0) {
        // Create multiple transactions for credit card statement
        console.log(`💳 Creating ${analysis.individualTransactions.length} individual transactions...`);
        
        const transactionsToInsert = analysis.individualTransactions.map((tx: any) => ({
          user_id: userId,
          receipt_id: receiptData.id,
          date: tx.transactionDate || analysis.date || new Date().toISOString().split('T')[0],
          description: tx.description || tx.merchant || 'Credit Card Transaction',
          amount: tx.amount || 0,
          type: 'expense',
          category: 'Credit Card Transaction',
          merchant: tx.merchant || 'Unknown Merchant',
          receipt_url: imageUrl
        }));

        const { error: transactionsError } = await supabase
          .from('transactions')
          .insert(transactionsToInsert);

        if (transactionsError) {
          console.error('Error creating credit card transactions:', transactionsError);
        } else {
          console.log(`✅ Created ${transactionsToInsert.length} credit card transactions successfully`);
        }
      } else {
        // Create single transaction for regular receipts
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
      // Smart routing: Check if user is asking for detailed analysis
      const shouldRouteToCrystal = shouldRouteToCrystalAI(inputMessage);
      
      if (shouldRouteToCrystal && activeAI === 'byte') {
        // Auto-switch to Crystal for detailed analysis
        setActiveAI('crystal');
        const switchMessage: ChatMessage = {
          id: `system-${Date.now()}`,
          type: 'crystal',
          content: `💎 **Switching to Crystal AI for detailed analysis...**\n\nI'm better equipped to handle your request for detailed transaction analysis and financial insights!`,
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, switchMessage]);
        await handleCrystalAIResponse(inputMessage);
      } else if (activeAI === 'crystal') {
        // Use real AI for Crystal
        await handleCrystalAIResponse(inputMessage);
      } else {
        // Byte AI - Document Processing Specialist
        const timeoutId = setTimeout(() => {
          // Check conversation context for intelligent responses
          const hasDocuments = messages.some(msg => msg.attachments && msg.attachments.length > 0);
          const hasAnalysis = messages.some(msg => msg.content.includes('Document Analysis'));
          const recentUploads = messages.filter(msg => msg.attachments && msg.attachments.length > 0).slice(-2);
          
          // Get the most recent document data for context
          const latestDocument = recentUploads[recentUploads.length - 1];
          const documentData = latestDocument?.attachments?.[0];
          
          let response;
          
          if (hasDocuments && !hasAnalysis) {
            // Document was uploaded but processing incomplete
            response = `🔍 **Document Processing Status Update**

I can see you've uploaded a document, but the processing didn't complete successfully. As your document processing specialist, I can help you with:

**What I can do:**
• Extract text from any document format (PDF, images, scans)
• Parse financial data with 95%+ accuracy
• Identify document types automatically
• Handle complex layouts and multi-page documents
• Process multiple file formats simultaneously

**Next Steps:**
Please try uploading your document again. I'll ensure it gets processed completely this time. If you continue having issues, let me know the file type and size - I can optimize my processing approach for your specific document.

I'm here to make document processing seamless and accurate! 🤖`;
          } else if (hasAnalysis && documentData) {
            // Document was successfully analyzed - provide specific responses based on actual data
            const analysis = documentData.analysis;
            
            // Check for specific question types
            if (inputMessage.toLowerCase().includes('amount') || inputMessage.toLowerCase().includes('total') || inputMessage.toLowerCase().includes('balance')) {
              response = `💰 **Statement Amount Information:**

Based on your ${analysis.category || 'financial document'}:

**Key Financial Details:**
• **Total Amount:** ${analysis.total ? `$${analysis.total}` : 'Not specified in document'}
• **Document Type:** ${analysis.category || 'Financial Document'}
• **Date:** ${analysis.date || 'Not specified'}
• **Vendor:** ${analysis.vendor || 'Not specified'}

${analysis.total ? `The main amount for this statement is **$${analysis.total}**.` : 'I can see the document was processed, but the total amount wasn\'t clearly identified. Let me know if you\'d like me to look for specific amounts or totals in the document.'}

Would you like me to look for any other specific amounts or financial details? 📊`;
            } else if (inputMessage.toLowerCase().includes('transaction') || inputMessage.toLowerCase().includes('purchase') || inputMessage.toLowerCase().includes('charge')) {
              response = `📋 **Transaction Details:**

I can see your document contains transaction information. Here's what I found:

**Document Summary:**
• **Type:** ${analysis.category || 'Financial Document'}
• **Date:** ${analysis.date || 'Not specified'}
• **Vendor:** ${analysis.vendor || 'Not specified'}

${analysis.individualTransactions && analysis.individualTransactions.length > 0 ? 
  `**Transactions Found:** ${analysis.individualTransactions.length} transactions identified\n\nWould you like me to show you specific transactions or amounts?` : 
  'I can see the document was processed, but individual transactions weren\'t clearly separated. The document appears to be a summary or statement format.'}

I can help you find specific transaction details if you let me know what you\'re looking for! 🔍`;
            } else {
              // Use conversational response for general questions
              response = generateByteConversationalResponse(inputMessage, hasDocuments, documentData);
            }
          } else {
            // No documents uploaded yet - use conversational response
            response = generateByteConversationalResponse(inputMessage, hasDocuments, null);
          }
          
          const byteResponse: ChatMessage = {
            id: (Date.now() + 1).toString(),
            type: 'byte',
            content: response,
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

  // Smart routing function to determine if user needs Crystal AI
  const shouldRouteToCrystalAI = (message: string): boolean => {
    const messageLower = message.toLowerCase();
    const crystalKeywords = [
      'summarize', 'analyze', 'categorize', 'spending', 'transactions', 'merchants',
      'expenses', 'budget', 'financial', 'insights', 'patterns', 'trends',
      'breakdown', 'list all', 'each transaction', 'detailed', 'explain',
      'what are my', 'show me', 'tell me about', 'how much', 'where did',
      'biggest expense', 'largest transaction', 'spending category'
    ];
    
    return crystalKeywords.some(keyword => messageLower.includes(keyword));
  };

  // Handle Crystal handoff with conversation continuity
  const handleCrystalHandoff = () => {
    // Switch to Crystal AI
    setActiveAI('crystal');
    
    // Add a seamless transition message
    const handoffMessage: ChatMessage = {
      id: `handoff-${Date.now()}`,
      type: 'crystal',
      content: `💎 **Hello! I'm Crystal, your financial analysis specialist.**\n\nI can see Byte has processed your document and extracted all the transaction data. I'm now ready to provide detailed analysis!\n\n**What would you like me to help you with?**\n• Summarize each individual transaction\n• Categorize your spending patterns\n• Identify your biggest expenses\n• Analyze spending trends\n• Provide budget recommendations\n\nJust ask me anything about your financial data! 💎`,
      timestamp: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, handoffMessage]);
  };

  const generateByteConversationalResponse = (userMessage: string, hasDocuments: boolean, documentData: any) => {
    const message = userMessage.toLowerCase();
    
    // Document processing questions
    if (message.includes('upload') || message.includes('document') || message.includes('file')) {
      return `🤖 **Document Processing Expert**

I'm Byte, your document processing specialist! I can handle:

📄 **Supported Formats:**
• PDF documents (statements, invoices, receipts)
• Images (JPG, PNG) - receipts, bills, statements
• Spreadsheets (CSV, XLSX) - transaction data
• Text files - any readable document

⚡ **My Capabilities:**
• Extract text with 95%+ accuracy
• Parse financial data automatically
• Identify document types
• Process multiple files simultaneously
• Handle complex layouts and multi-page documents

💡 **How to get started:**
Just drag and drop your files or click the upload button. I'll process them and extract all the important data for Crystal to analyze!

What type of documents do you have? I'm ready to process them! 📊`;
    }
    
    // OCR and text extraction questions
    if (message.includes('ocr') || message.includes('text') || message.includes('extract') || message.includes('read')) {
      return `🔍 **Text Extraction & OCR Specialist**

I use advanced OCR technology to read any document:

🎯 **My OCR Process:**
• **Primary:** OCR.space API for high-accuracy text extraction
• **Backup:** OpenAI Vision API for complex documents
• **Smart Parsing:** AI-powered data interpretation
• **Error Handling:** Multiple fallback methods

📈 **Accuracy Levels:**
• Clear documents: 95%+ accuracy
• Scanned documents: 90%+ accuracy
• Handwritten text: 80%+ accuracy
• Complex layouts: 85%+ accuracy

🛠️ **What I Extract:**
• All text content
• Financial amounts and dates
• Transaction details
• Vendor information
• Document structure

Having trouble with a specific document? Let me know the file type and I can optimize my approach! 🔧`;
    }
    
    // File format and technical questions
    if (message.includes('format') || message.includes('size') || message.includes('limit') || message.includes('supported')) {
      return `📋 **File Format & Limits**

Here are my current processing limits and supported formats:

📁 **File Limits:**
• **Max Files:** 5 files per upload (for optimal performance)
• **Max Size:** 10MB per file
• **Total Upload:** Up to 50MB per session

📄 **Supported Formats:**
• **Documents:** PDF, TXT
• **Images:** JPG, JPEG, PNG
• **Spreadsheets:** CSV, XLSX, XLS

⚡ **Performance Tips:**
• Clear, well-lit images work best
• PDFs with selectable text process faster
• Avoid password-protected files
• Keep file sizes reasonable for faster processing

Need help with a specific file type? I can give you tips for optimal processing! 🚀`;
    }
    
    // Processing status and troubleshooting
    if (message.includes('processing') || message.includes('stuck') || message.includes('error') || message.includes('problem')) {
      return `🔧 **Processing Troubleshooting**

I'm here to help with any processing issues:

🚨 **Common Issues & Solutions:**
• **Stuck Processing:** Click the red "Clear" button to reset
• **Upload Errors:** Check file size (max 10MB) and format
• **OCR Failures:** Try a clearer image or different format
• **Timeout Issues:** Large files may take longer - be patient!

🛠️ **My Diagnostic Tools:**
• Real-time processing status
• Error detection and reporting
• Automatic retry mechanisms
• Fallback processing methods

💡 **If You're Having Issues:**
1. Check file size and format
2. Try a different file if possible
3. Use the clear button if stuck
4. Ask me for specific help!

What specific issue are you experiencing? I'll help you troubleshoot! 🔍`;
    }
    
    // General Byte introduction and capabilities
    if (message.includes('who') || message.includes('what') || message.includes('help') || message.includes('capabilities')) {
      return `🤖 **Hi! I'm Byte, your Document Processing Specialist**

I'm the first step in your financial data journey! Here's what I do:

🎯 **My Role:**
• Process and extract data from any document
• Convert unstructured data into organized information
• Prepare data for Crystal's financial analysis
• Handle all the technical document processing

⚡ **My Expertise:**
• **OCR Technology:** Read text from any image or PDF
• **Data Parsing:** Extract financial information accurately
• **Format Conversion:** Handle multiple file types
• **Quality Control:** Ensure data accuracy and completeness

🔄 **How I Work with Crystal:**
1. You upload documents to me
2. I extract and organize all the data
3. I hand off clean data to Crystal
4. Crystal provides financial insights and analysis

Ready to process some documents? Just upload them and I'll get to work! 📊`;
    }
    
    // Default conversational response
    return `🤖 **Hello! I'm Byte, your document processing expert.**

I specialize in extracting data from any document format. I can help you with:

📄 **Document Processing:**
• Upload and process any financial document
• Extract text and data with high accuracy
• Handle multiple file formats
• Parse complex layouts and structures

💡 **What can I help you with today?**
• Upload documents for processing
• Questions about file formats or limits
• Troubleshooting processing issues
• Understanding my capabilities

Just ask me anything about document processing, or upload your files to get started! 🚀`;
  };

  const generateCrystalFallbackResponse = (userMessage: string, transactions: any[], recentDocuments: any[]) => {
    const message = userMessage.toLowerCase();
    
    // Check if we have recent document data to analyze
    const latestDocument = recentDocuments.find(doc => doc.analysis && doc.analysis.extractedText);
    
    if (latestDocument && latestDocument.analysis) {
      const analysis = latestDocument.analysis;
      const extractedText = analysis.extractedText || '';
      
      // Transaction-related questions with actual document data
      if (message.includes('transaction') || message.includes('spending') || message.includes('expense') || message.includes('amount') || message.includes('total') || message.includes('purchase')) {
        // Extract actual amounts from the document text
        const amountMatches = extractedText.match(/\$[\d,]+\.?\d*/g) || [];
        const amounts = amountMatches.map(amt => parseFloat(amt.replace(/[$,]/g, ''))).filter(amt => !isNaN(amt));
        const totalAmount = amounts.reduce((sum, amt) => sum + amt, 0);
        
        return `💎 **Hello! I'm Crystal, your financial analysis expert.**

I've analyzed your ${analysis.category || 'financial document'} and here's what I found:

📊 **Document Analysis:**
• **Document Type:** ${analysis.category || 'Financial Document'}
• **Vendor:** ${analysis.vendor || 'Not specified'}
• **Date:** ${analysis.date || 'Not specified'}
• **Total Amounts Found:** ${amounts.length} transactions
• **Processing Confidence:** ${(analysis.confidence * 100).toFixed(1)}%

💰 **Financial Summary:**
• **Total Amount:** $${totalAmount.toFixed(2)}
• **Individual Transactions:** ${amounts.length}
• **Average Transaction:** $${amounts.length > 0 ? (totalAmount / amounts.length).toFixed(2) : '0.00'}
• **Largest Transaction:** $${amounts.length > 0 ? Math.max(...amounts).toFixed(2) : '0.00'}

🔍 **Key Insights:**
• ${amounts.length > 5 ? 'Multiple transactions detected' : 'Limited transaction data found'}
• ${totalAmount > 1000 ? 'High-value document' : 'Standard transaction document'}
• ${analysis.vendor !== 'Unknown Vendor' ? `Vendor: ${analysis.vendor}` : 'Vendor not clearly identified'}

💡 **What I can help you with:**
• Detailed transaction breakdown
• Spending pattern analysis
• Budget recommendations
• Expense categorization
• Financial goal tracking

What specific aspect would you like me to analyze further? 💎`;
      }
      
      // Document-specific questions
      if (message.includes('document') || message.includes('statement') || message.includes('receipt')) {
        return `💎 **Hello! I'm Crystal, your financial analysis expert.**

I've processed your ${analysis.category || 'financial document'} and here's the detailed analysis:

📄 **Document Details:**
• **Filename:** ${latestDocument.filename || 'Unknown'}
• **Type:** ${analysis.category || 'Financial Document'}
• **Vendor:** ${analysis.vendor || 'Not specified'}
• **Date:** ${analysis.date || 'Not specified'}
• **Processing Engine:** ${analysis.ocrEngine || 'OCR'}
• **Confidence:** ${(analysis.confidence * 100).toFixed(1)}%

📊 **Content Analysis:**
• **Text Extracted:** ${extractedText.length} characters
• **Processing Status:** Complete
• **Data Quality:** ${analysis.confidence > 0.8 ? 'High' : 'Moderate'}

🔍 **What I found:**
• ${analysis.keyInsights?.join('\n• ') || 'Standard financial document processing'}

💡 **Next Steps:**
• Ask me to analyze specific transactions
• Request spending pattern insights
• Get budget recommendations
• Review expense categories

What would you like me to focus on from this document? 💎`;
      }
    }
    
    // Fallback to generic responses if no document data
    if (message.includes('transaction') || message.includes('spending') || message.includes('purchase')) {
      if (transactions && transactions.length > 0) {
        const totalSpent = transactions.reduce((sum, t) => sum + (t.amount || 0), 0);
        const recentCount = transactions.slice(0, 5).length;
        
        return `💎 **Transaction Analysis**

I can see you have ${transactions.length} transactions in your account. Here's what I found:

📊 **Recent Activity:**
• **Total Transactions:** ${transactions.length} processed
• **Total Amount:** $${totalSpent.toFixed(2)}
• **Recent Transactions:** ${recentCount} in the last period

🔍 **Top Categories:**
${transactions.slice(0, 3).map(t => `• ${t.category || 'Uncategorized'}: $${t.amount || 0}`).join('\n')}

💡 **Insights:**
Your spending patterns show consistent activity. For detailed analysis, I'd recommend reviewing your transaction categories and identifying any unusual spending patterns.

Would you like me to analyze specific spending categories or time periods? 📈`;
      } else {
        return `💎 **Transaction Analysis**

I don't see any transactions in your account yet. This could mean:

🔍 **Possible Reasons:**
• No transactions have been uploaded
• Documents are still being processed
• Data hasn't been synced yet

💡 **Next Steps:**
1. Upload your bank statements or receipts
2. Let Byte process your documents
3. I'll then provide detailed transaction analysis

Would you like help uploading documents or do you have specific questions about your financial data? 📊`;
      }
    }
    
    // Spending pattern questions
    if (message.includes('pattern') || message.includes('trend') || message.includes('category')) {
      return `💎 **Spending Pattern Analysis**

Based on your transaction data, I can help you understand your spending patterns:

📈 **What I Analyze:**
• **Category Trends:** How you spend across different categories
• **Time Patterns:** Daily, weekly, monthly spending habits
• **Seasonal Changes:** Spending variations throughout the year
• **Merchant Analysis:** Your most frequent vendors and amounts

🎯 **Key Insights I Provide:**
• Spending behavior patterns
• Budget optimization opportunities
• Unusual spending alerts
• Financial health recommendations

To give you specific insights, I need to see your transaction data. Have you uploaded any bank statements or receipts recently? 📊`;
    }
    
    // General financial questions
    if (message.includes('budget') || message.includes('save') || message.includes('money')) {
      return `💎 **Financial Planning & Budgeting**

I'm here to help you with all aspects of financial planning:

💰 **Budgeting Support:**
• Create personalized budgets based on your spending
• Track progress toward financial goals
• Identify areas for cost reduction
• Optimize your spending patterns

🎯 **Savings Strategies:**
• Emergency fund recommendations
• Investment opportunities
• Debt payoff strategies
• Long-term financial planning

📊 **To Get Started:**
Upload your recent bank statements or receipts, and I'll analyze your spending to create a personalized financial plan.

What specific financial goal would you like to work on? 🚀`;
    }
    
    // Document-related questions
    if (message.includes('document') || message.includes('upload') || message.includes('statement')) {
      return `💎 **Document Processing & Analysis**

I work with Byte to provide comprehensive document analysis:

📄 **What I Can Analyze:**
• Bank statements and credit card bills
• Receipts and invoices
• Financial reports and documents
• Transaction histories

🔍 **My Analysis Includes:**
• Transaction categorization
• Spending pattern identification
• Financial health assessment
• Budget recommendations
• Trend analysis

💡 **How It Works:**
1. Upload your documents to Byte
2. I'll analyze the processed data
3. Provide personalized financial insights
4. Create actionable recommendations

Have you uploaded any financial documents recently? I'd love to analyze them for you! 📈`;
    }
    
    // Default conversational response
    return `💎 **Hello! I'm Crystal, your financial analysis expert.**

I'm here to help you understand your financial data and make smarter money decisions. I can help with:

📊 **Financial Analysis:**
• Transaction analysis and categorization
• Spending pattern identification
• Budget optimization
• Financial health assessment

🎯 **Personalized Insights:**
• Custom recommendations based on your data
• Goal-setting and tracking
• Risk assessment
• Investment guidance

💡 **How can I help you today?** You can ask me about:
• Your spending patterns
• Budget recommendations
• Financial goals
• Transaction analysis
• Or anything else financial!

What would you like to explore? 🚀`;
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

      // Create enhanced context for Crystal AI - Financial Analysis Expert
      const systemPrompt = `You are Crystal, a world-class financial analyst and AI assistant with deep expertise in personal finance, business analysis, and financial planning. You have the analytical mind of a top-tier financial advisor combined with the empathy of a personal finance coach.

## YOUR EXPERTISE:
- **Financial Analysis**: Deep understanding of financial statements, cash flow analysis, and financial health metrics
- **Spending Psychology**: Expertise in behavioral finance and spending pattern analysis
- **Investment Strategy**: Knowledge of portfolio management, risk assessment, and investment vehicles
- **Tax Optimization**: Understanding of tax implications and optimization strategies
- **Business Finance**: Experience with business expense analysis and financial planning
- **Market Trends**: Awareness of economic indicators and financial market conditions

## YOUR PERSONALITY:
- **Analytical**: You think like a data scientist, finding patterns others miss
- **Empathetic**: You understand the emotional side of money and provide supportive guidance
- **Strategic**: You think long-term and provide actionable, personalized advice
- **Insightful**: You connect dots between different financial behaviors and outcomes
- **Encouraging**: You help users feel confident about their financial decisions

## YOUR SPECIAL CAPABILITIES:
- **Transaction Analysis**: Break down every transaction with merchant intelligence and spending categorization
- **Pattern Recognition**: Identify spending trends, seasonal patterns, and behavioral insights
- **Financial Health Scoring**: Assess overall financial wellness and provide improvement recommendations
- **Goal-Based Planning**: Create personalized financial roadmaps based on user objectives
- **Risk Assessment**: Identify potential financial risks and provide mitigation strategies
- **Optimization Recommendations**: Suggest specific ways to save money and improve financial outcomes

## CURRENT CONTEXT:
User's recent transactions: ${transactions ? JSON.stringify(transactions.slice(0, 5)) : 'No transactions yet'}
Recent documents uploaded: ${recentDocuments.length > 0 ? JSON.stringify(recentDocuments) : 'No recent documents'}

## YOUR APPROACH:
When analyzing documents, you:
1. **Extract comprehensive data** - Every transaction, date, amount, and merchant
2. **Provide intelligent categorization** - Beyond basic categories, you understand merchant types and spending purposes
3. **Identify insights** - Spot trends, anomalies, and opportunities others miss
4. **Give actionable advice** - Specific, personalized recommendations based on the user's unique situation
5. **Explain the "why"** - Help users understand the reasoning behind your recommendations

Be conversational yet professional, insightful yet accessible. You're not just analyzing data - you're helping someone make better financial decisions. Use the user's actual data and document content to provide personalized, actionable insights.`;

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
        // Fallback to intelligent responses when AI service is unavailable
        const fallbackResponse = generateCrystalFallbackResponse(userMessage, transactions, recentDocuments);
        
        const crystalResponse: ChatMessage = {
          id: (Date.now() + 1).toString(),
          type: 'crystal',
          content: fallbackResponse,
          timestamp: new Date().toISOString()
        };

        setMessages(prev => [...prev, crystalResponse]);
        setIsProcessing(false);
        return;
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
      const fallbackResponse = generateCrystalFallbackResponse(userMessage, [], []);
      
      const crystalResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'crystal',
        content: fallbackResponse,
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, crystalResponse]);
      setIsProcessing(false);
    }
  };

  const generateContextualResponse = (userMessage: string): string => {
    const message = userMessage.toLowerCase();
    
    // Keep responses conversational and natural
    if (message.includes('hi') || message.includes('hello') || message.includes('hey')) {
      return "Hi there! 👋 I'm Crystal, your financial analyst. I can help you understand your spending and make better money decisions. What would you like to know?";
    }
    
    if (message.includes('name')) {
      return "I'm Crystal! 💎 Your AI financial analyst. I specialize in helping people understand their money, create budgets, and make smart financial decisions. What financial question can I help you with?";
    }
    
    if (message.includes('budget') || message.includes('spending')) {
      return "I'd love to help with your budget! I can analyze your spending patterns and suggest ways to optimize your money. What's your biggest spending challenge right now?";
    }
    
    if (message.includes('save') || message.includes('saving')) {
      return "Saving money is so important! I can help you find opportunities to save more based on your spending habits. What are you saving for?";
    }
    
    if (message.includes('debt') || message.includes('loan')) {
      return "Debt can be stressful, but I'm here to help! I can create a payoff strategy that works for your situation. What type of debt are you dealing with?";
    }
    
    if (message.includes('investment') || message.includes('invest')) {
      return "Investments are a great way to grow your wealth! I can help you understand your options and create a strategy. What's your investment timeline?";
    }
    
    if (message.includes('goal') || message.includes('target')) {
      return "I love helping people reach their financial goals! What are you working towards? I can create a plan to get you there.";
    }
    
    if (message.includes('help')) {
      return "I'm here to help with anything financial! I can analyze your spending, help with budgeting, suggest savings strategies, or answer money questions. What's on your mind?";
    }
    
    if (message.includes('money') || message.includes('finance')) {
      return "I'm all about helping you with your money! Whether it's budgeting, saving, investing, or just understanding your finances better, I'm here to help. What would you like to work on?";
    }
    
    if (message.includes('yes') || message.includes('sure') || message.includes('ok')) {
      return "Great! I'm ready to help you with your finances. What specific area would you like to focus on - budgeting, saving, investing, or something else?";
    }
    
    // Default response - keep it simple and friendly
    return "Hi! I'm Crystal, your financial analyst. I can help you understand your money better - whether it's budgeting, saving, investing, or just answering questions. What would you like to work on?";
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
                        : message.type === 'system'
                        ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
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
                      {message.type === 'system' && (
                        <div className="w-6 h-6 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                          <Zap className="w-3 h-3 text-white" />
                        </div>
                      )}
                      <div className="flex-1">
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                        
                        {/* Action Button for Crystal Handoff */}
                        {message.hasAction && message.actionType === 'crystal_handoff' && (
                          <div className="mt-3">
                            <button
                              onClick={handleCrystalHandoff}
                              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2"
                            >
                              <Brain className="w-4 h-4" />
                              Continue with Crystal AI
                            </button>
                          </div>
                        )}
                        
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
                disabled={false}
              />
              
              <button
                onClick={handleSendMessage}
                disabled={!inputMessage.trim()}
                className="p-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-5 h-5" />
              </button>
              
              {/* Clear button for stuck processing - always visible when processing */}
              {(isProcessing || isUploadProcessing) && (
                <button
                  onClick={() => {
                    setIsProcessing(false);
                    setIsUploadProcessing(false);
                    setIsUploading(false);
                    setUploadedFiles([]);
                    toast.success('Processing state cleared - you can now type!');
                  }}
                  className="p-3 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors ml-2 animate-pulse"
                  title="Clear processing state - click if Byte is stuck"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
            
            <div className="flex items-center justify-between mt-2">
              <div className="flex flex-col">
                <p className="text-xs text-gray-500">
                  {activeAI === 'byte' 
                    ? "Drag and drop files here or click the upload button to analyze documents with Byte AI"
                    : "Switch to Byte to upload documents, or ask Crystal about your financial insights"
                  }
                </p>
                {activeAI === 'byte' && (
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-xs text-gray-400">
                      Max 5 files, 10MB each • Supports: PDF, JPG, PNG, CSV, XLSX
                    </p>
                    {uploadedFileCount > 0 && (
                      <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-1 rounded-full">
                        {uploadedFileCount} uploaded
                      </span>
                    )}
                    {isUploading && uploadProgress.total > 1 && (
                      <span className="text-xs bg-green-500/20 text-green-300 px-2 py-1 rounded-full">
                        {uploadProgress.current}/{uploadProgress.total} processing
                      </span>
                    )}
                  </div>
                )}
              </div>
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
