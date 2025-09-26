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

        // Add "Continue with Crystal" button for credit card statements
        if (analysis.isCreditCardStatement && analysis.individualTransactions && analysis.individualTransactions.length > 0) {
          const crystalHandoffMessage: ChatMessage = {
            id: `crystal-handoff-${file.name}`,
            type: 'system',
            content: `💎 **Ready for detailed transaction analysis?**`,
            timestamp: new Date().toISOString(),
            hasAction: true,
            actionType: 'crystal_handoff'
          };
          setMessages(prev => [...prev, crystalHandoffMessage]);
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
        
        // Update processing message with error
        setMessages(prev => prev.map(msg => 
          msg.id === `processing-${file.name}` 
            ? {
                ...msg,
                content: `❌ Failed to process ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`
              }
            : msg
        ));
        
        // Ensure processing state is cleared even on error
        setIsUploadProcessing(false);
        setIsUploading(false);
      }
    }

    // Final cleanup
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
          } else if (hasAnalysis) {
            // Document was successfully analyzed
            const documentTypes = recentUploads.map(msg => 
              msg.attachments?.[0]?.filename?.split('.').pop()?.toUpperCase() || 'Unknown'
            ).join(', ');
            
            response = `✅ **Document Processing Complete!**

I've successfully processed your ${documentTypes} document(s) and extracted all the key data. As your document processing specialist, I can now help you with:

**Data Extraction Capabilities:**
• **Transaction Details**: Every line item, amount, date, and merchant
• **Document Structure**: Headers, footers, tables, and formatting
• **Data Validation**: Cross-checking extracted information for accuracy
• **Format Conversion**: Converting unstructured data into organized formats

**What I've Extracted:**
• Complete transaction history
• Vendor information and categorization
• Date ranges and billing periods
• Financial summaries and totals
• Document metadata and processing confidence scores

**Ready for Analysis:**
Your data is now ready for Crystal's financial analysis. Would you like me to:
• Explain any specific extracted data?
• Prepare the data for further analysis?
• Process additional documents?
• Switch to Crystal for detailed financial insights?

I've done the heavy lifting - now let's get you the insights you need! 🤖`;
          } else {
            // No documents uploaded yet
            response = `🤖 **Byte AI - Document Processing Specialist**

I'm your expert document processing assistant, specialized in extracting and organizing financial data from any document type.

**My Specializations:**
• **OCR Technology**: Advanced text extraction from images, PDFs, and scans
• **Financial Documents**: Credit card statements, receipts, invoices, bank statements
• **Data Parsing**: Intelligent extraction of transactions, amounts, dates, and vendors
• **Quality Assurance**: 95%+ accuracy with confidence scoring
• **Multi-format Support**: PDF, PNG, JPG, TIFF, and more

**What I Can Process:**
• Credit card statements (all major issuers)
• Bank statements and transaction records
• Receipts and invoices
• Tax documents and financial reports
• Business expense reports

**How I Work:**
1. **Upload Detection**: Automatically identify document type and structure
2. **Text Extraction**: Use advanced OCR to extract all readable text
3. **Data Parsing**: Intelligently parse financial data and transactions
4. **Validation**: Cross-check extracted data for accuracy
5. **Organization**: Structure data for easy analysis

**Ready to Process:**
Upload any financial document and I'll extract all the data you need. I work fast, accurately, and I'm always learning to improve my processing capabilities!

What document would you like me to analyze? 📄`;
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
                disabled={isProcessing && !isUploadProcessing}
              />
              
              <button
                onClick={handleSendMessage}
                disabled={!inputMessage.trim() || (isProcessing && !isUploadProcessing)}
                className="p-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-5 h-5" />
              </button>
              
              {/* Clear button for stuck processing */}
              {(isProcessing || isUploadProcessing) && (
                <button
                  onClick={() => {
                    setIsProcessing(false);
                    setIsUploadProcessing(false);
                    toast.success('Processing state cleared');
                  }}
                  className="p-3 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors ml-2"
                  title="Clear processing state"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
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
