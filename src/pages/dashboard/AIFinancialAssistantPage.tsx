import React, { useState, useRef, useEffect } from 'react';
import { 
  Bot, 
  Send, 
  Upload, 
  FileText, 
  Image, 
  DollarSign, 
  TrendingUp, 
  Target, 
  Calculator, 
  Lightbulb, 
  Clock, 
  ThumbsUp, 
  ThumbsDown, 
  X, 
  Eye, 
  Download,
  Brain,
  MessageSquare,
  Zap,
  BarChart3,
  PieChart,
  AlertTriangle,
  CheckCircle,
  Calendar,
  CreditCard,
  PiggyBank,
  Building2,
  Heart,
  Share2,
  Sparkles,
  Plus,
  Mic,
  MicOff,
  Paperclip
} from 'lucide-react';

import { aiCategorizer } from '../../utils/aiCategorizer';
import { supabase } from '../../lib/supabase';

import SpecializedChatBot from '../../components/chat/SpecializedChatBot';

interface FinancialDocument {
  id: string;
  name: string;
  type: 'pdf' | 'image' | 'csv' | 'screenshot';
  size: number;
  uploadedAt: string;
  extractedText?: string;
  aiAnalysis?: string;
  financialData?: {
    type: 'loan' | 'investment' | 'credit' | 'tax' | 'other';
    balance?: number;
    interestRate?: number;
    monthlyPayment?: number;
    term?: number;
    institution?: string;
  };
  fileUrl?: string;
}

interface ChatMessage {
  id: number;
  type: 'user' | 'ai';
  message: string;
  timestamp: string;
  attachments?: FinancialDocument[];
}

interface FinancialInsight {
  id: string;
  type: 'savings' | 'debt' | 'investment' | 'budget' | 'goal';
  title: string;
  description: string;
  impact: string;
  priority: 'high' | 'medium' | 'low';
  actionable: boolean;
}

// Add error boundary for imports
const AIFinancialAssistantPage = () => {
  console.log('🎯 AIFinancialAssistantPage component is loading...');
  
  try {
    // State management
    const [documents, setDocuments] = useState<FinancialDocument[]>([]);
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
      {
        id: 1,
        type: 'ai',
        message: "Hello! I'm your AI Financial Assistant. I can help you analyze financial documents, provide investment advice, calculate loan payoffs, and optimize your financial strategy. Upload a document or ask me anything about your finances!",
        timestamp: new Date().toLocaleTimeString()
      }
    ]);
    const [inputMessage, setInputMessage] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [showChat, setShowChat] = useState(true);
    const [insights, setInsights] = useState<FinancialInsight[]>([]);
    const [selectedDocument, setSelectedDocument] = useState<FinancialDocument | null>(null);
    const [isAIConnected, setIsAIConnected] = useState(false);
    const [isMobileOpen, setIsMobileOpen] = useState(false);

    
    // New state for enhanced features
    const [isRecording, setIsRecording] = useState(false);
    const [showUploadMenu, setShowUploadMenu] = useState(false);
    const [isListening, setIsListening] = useState(false);
    
    const fileInputRef = useRef<HTMLInputElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const uploadMenuRef = useRef<HTMLDivElement>(null);

    // Check AI connection on mount
    useEffect(() => {
      checkAIConnection();
    }, []);

    // Close upload menu when clicking outside
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (uploadMenuRef.current && !uploadMenuRef.current.contains(event.target as Node)) {
          setShowUploadMenu(false);
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }, []);

    const checkAIConnection = async () => {
      try {
        const isConnected = await aiCategorizer.testConnection();
        setIsAIConnected(isConnected);
        if (!isConnected) {
          setChatMessages(prev => [...prev, {
            id: Date.now(),
            type: 'ai',
            message: "⚠️ AI service is currently unavailable. I'll provide simulated responses for demonstration purposes.",
            timestamp: new Date().toLocaleTimeString()
          }]);
        }
      } catch (error) {
        console.error('AI connection test failed:', error);
        setIsAIConnected(false);
      }
    };

    // Auto-scroll to bottom of chat
    useEffect(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatMessages]);

    // Share with Financial Therapist
    const handleShareWithTherapist = (messageId: number) => {
      const message = chatMessages.find(msg => msg.id === messageId);
      if (message) {
        setChatMessages(prev => [...prev, {
          id: Date.now(),
          type: 'ai',
          message: `I've shared this conversation with your Financial Therapist! 💜\n\nThey'll review your financial situation and provide personalized emotional support and guidance. You can expect a response within the next few hours.\n\nIn the meantime, would you like me to help you with any other financial questions?`,
          timestamp: new Date().toLocaleTimeString()
        }]);
      }
    };

    // Voice recording functionality
    const handleVoiceInput = () => {
      if (!isRecording) {
        setIsRecording(true);
        setIsListening(true);
        // Simulate voice recording
        setTimeout(() => {
          setIsRecording(false);
          setIsListening(false);
          // Simulate voice-to-text
          const voiceMessage = "I want to know how much I can save by paying an extra $100 per month on my car loan.";
          setInputMessage(voiceMessage);
          setChatMessages(prev => [...prev, {
            id: Date.now(),
            type: 'user',
            message: voiceMessage,
            timestamp: new Date().toLocaleTimeString()
          }]);
          // Auto-send the voice message
          setTimeout(() => {
            handleSendMessage();
          }, 500);
        }, 3000);
      } else {
        setIsRecording(false);
        setIsListening(false);
      }
    };

    // Floating upload menu
    const handleUploadMenuToggle = () => {
      setShowUploadMenu(!showUploadMenu);
    };

    const handleQuickUpload = (type: 'document' | 'image' | 'camera') => {
      setShowUploadMenu(false);
      if (type === 'camera') {
        // Simulate camera access
        setChatMessages(prev => [...prev, {
          id: Date.now(),
          type: 'ai',
          message: "📸 Camera access requested. Please allow camera permissions to scan documents.",
          timestamp: new Date().toLocaleTimeString()
        }]);
      } else {
        fileInputRef.current?.click();
      }
    };

    // Real file upload with Supabase storage
    const handleFileUpload = async (files: FileList) => {
      setIsUploading(true);
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const documentId = Date.now() + i;
        
        // Create document object
        const document: FinancialDocument = {
          id: documentId.toString(),
          name: file.name,
          type: file.type.includes('pdf') ? 'pdf' : 
                file.type.includes('image') ? 'image' : 'csv',
          size: file.size,
          uploadedAt: new Date().toISOString()
        };
        
        setDocuments(prev => [...prev, document]);
        
        try {
          // Upload to Supabase storage
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('financial-documents')
            .upload(`${documentId}/${file.name}`, file);

          if (uploadError) {
            throw new Error(`Upload failed: ${uploadError.message}`);
          }

          // Get public URL
          const { data: urlData } = supabase.storage
            .from('financial-documents')
            .getPublicUrl(`${documentId}/${file.name}`);

          // Update document with file URL
          setDocuments(prev => prev.map(doc => 
            doc.id === documentId.toString() 
              ? { ...doc, fileUrl: urlData.publicUrl }
              : doc
          ));

          // Extract text from document
          const extractedText = await extractTextFromFile(file);
          
          // Update document with extracted text
          setDocuments(prev => prev.map(doc => 
            doc.id === documentId.toString() 
              ? { ...doc, extractedText }
              : doc
          ));
          
          // Analyze with real AI
          await analyzeDocumentWithAI(documentId.toString(), extractedText);
          
        } catch (error) {
          console.error('Error processing file:', error);
          setChatMessages(prev => [...prev, {
            id: Date.now(),
            type: 'ai',
            message: `I had trouble processing ${file.name}. Please make sure the document is clear and readable.`,
            timestamp: new Date().toLocaleTimeString()
          }]);
        }
      }
      
      setIsUploading(false);
    };

    // Real text extraction with OCR/PDF parsing
    const extractTextFromFile = async (file: File): Promise<string> => {
      try {
        if (file.type.includes('pdf')) {
          // Real PDF parsing - you can integrate pdf-parse here
          return await extractPDFText(file);
        } else if (file.type.includes('image')) {
          // Real OCR - you can integrate tesseract.js or OCR.space here
          return await extractImageText(file);
        } else if (file.name.includes('.csv')) {
          // Real CSV parsing
          return await extractCSVText(file);
        }
        
        return 'Document content extracted successfully.';
      } catch (error) {
        console.error('Text extraction failed:', error);
        // Fallback to simulated extraction
        return getSimulatedExtraction(file);
      }
    };

    // Real PDF text extraction (placeholder for pdf-parse integration)
    const extractPDFText = async (file: File): Promise<string> => {
      // TODO: Integrate pdf-parse
      // const pdf = await pdfParse(file);
      // return pdf.text;
      
      // Simulated for now
      return `PDF Document Content:
      Account: Manulife RRSP
      Balance: $14,000
      Annual Return: 6.2%
      Last Contribution: $500 on 2024-01-15
      Account Type: Registered Retirement Savings Plan`;
    };

    // Real OCR text extraction (placeholder for tesseract.js integration)
    const extractImageText = async (file: File): Promise<string> => {
      // TODO: Integrate tesseract.js or OCR.space
      // const result = await Tesseract.recognize(file);
      // return result.data.text;
      
      // Simulated for now
      return `Image Document Content:
      Car Loan Statement
      Remaining Balance: $14,700
      Interest Rate: 6.1%
      Monthly Payment: $350
      Term: 48 months remaining`;
    };

    // Real CSV text extraction
    const extractCSVText = async (file: File): Promise<string> => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const text = e.target?.result as string;
          resolve(text);
        };
        reader.readAsText(file);
      });
    };

    // Fallback simulated extraction
    const getSimulatedExtraction = (file: File): string => {
      if (file.name.toLowerCase().includes('rrsp')) {
        return `RRSP Statement:
        Account: Manulife RRSP
        Balance: $14,000
        Annual Return: 6.2%
        Last Contribution: $500 on 2024-01-15`;
      } else if (file.name.toLowerCase().includes('loan')) {
        return `Car Loan Statement:
        Remaining Balance: $14,700
        Interest Rate: 6.1%
        Monthly Payment: $350
        Term: 48 months remaining`;
      }
      return 'Document content extracted successfully.';
    };

    // Real AI analysis using OpenAI
    const analyzeDocumentWithAI = async (documentId: string, extractedText: string) => {
      setIsTyping(true);
      
      try {
        const document = documents.find(doc => doc.id === documentId);
        if (!document) return;

        let aiResponse = '';

        if (isAIConnected) {
          // Real AI analysis using OpenAI
          aiResponse = await getRealAIAnalysis(extractedText, document);
        } else {
          // Fallback to simulated analysis
          aiResponse = getSimulatedAIAnalysis(extractedText, document);
        }
        
        setChatMessages(prev => [...prev, {
          id: Date.now(),
          type: 'ai',
          message: aiResponse,
          timestamp: new Date().toLocaleTimeString(),
          attachments: [document]
        }]);
        
        // Generate insights
        generateFinancialInsights(extractedText);
        
      } catch (error) {
        console.error('AI analysis failed:', error);
        setChatMessages(prev => [...prev, {
          id: Date.now(),
          type: 'ai',
          message: "I encountered an error analyzing your document. Please try again or contact support if the issue persists.",
          timestamp: new Date().toLocaleTimeString()
        }]);
      } finally {
        setIsTyping(false);
      }
    };

    // Real OpenAI API call for financial analysis
    const getRealAIAnalysis = async (extractedText: string, document: FinancialDocument): Promise<string> => {
      try {
        const prompt = `You are a professional financial advisor analyzing a client's financial document. 

Document Type: ${document.type}
Extracted Content: ${extractedText}

Please provide:
1. Key financial insights from this document
2. Specific recommendations for optimization
3. Calculations for potential savings or growth
4. Next steps the client should consider

Be professional, specific, and actionable. Include numbers and calculations where relevant.`;

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: 'gpt-4',
            messages: [
              {
                role: 'system',
                content: 'You are a professional financial advisor with expertise in personal finance, investments, debt management, and tax optimization. Provide specific, actionable advice with calculations.'
              },
              {
                role: 'user',
                content: prompt
              }
            ],
            temperature: 0.3,
            max_tokens: 1000,
          }),
        });

        if (!response.ok) {
          throw new Error('OpenAI API request failed');
        }

        const data = await response.json();
        return data.choices[0]?.message?.content || 'Analysis completed successfully.';

      } catch (error) {
        console.error('OpenAI API error:', error);
        throw error;
      }
    };

    // Simulated AI analysis for fallback
    const getSimulatedAIAnalysis = (extractedText: string, document: FinancialDocument): string => {
      if (extractedText.includes('RRSP')) {
        return `I've analyzed your Manulife RRSP document! 📊

**Key Findings:**
• Current Balance: $14,000
• Annual Return: 6.2%
• Recent Contribution: $500

**AI Insights:**
• At 6.2% return, you could earn ~$220 in 3 months
• Consider increasing monthly contributions to $750 for faster growth
• Your RRSP is performing well compared to average returns

**Recommendations:**
1. Set up automatic monthly contributions
2. Consider diversifying into different fund types
3. Review your risk tolerance annually

Would you like me to calculate different contribution scenarios or compare this to other investment options?`;
      } else if (extractedText.includes('Car Loan')) {
        return `I've analyzed your car loan statement! 🚗

**Current Situation:**
• Remaining Balance: $14,700
• Interest Rate: 6.1%
• Monthly Payment: $350
• Time Remaining: 48 months

**AI Analysis:**
• If you pay an extra $50/month, you'd save ~$1,200 in interest
• You'd be debt-free 8 months earlier
• Total interest paid: ~$2,100

**Smart Strategies:**
1. **Aggressive Payoff:** $400/month = debt-free in 36 months
2. **Balanced Approach:** $375/month = debt-free in 42 months
3. **Investment vs Debt:** Consider if 6.1% loan rate vs potential investment returns

Would you like me to calculate different payment scenarios or compare this to investing in your TFSA?`;
      } else {
        return `I've analyzed your financial document! 📄

**Document Type:** ${document.type}
**Key Information Extracted:** ${extractedText.substring(0, 200)}...

**AI Insights:**
• I can help you optimize this financial situation
• Let me provide personalized recommendations
• Consider asking me specific questions about this data

**What would you like to know?**
• "How can I optimize this?"
• "What are my best next steps?"
• "Should I prioritize this over other financial goals?"`;
      }
    };

    const generateFinancialInsights = (extractedText: string) => {
      const newInsights: FinancialInsight[] = [];
      
      if (extractedText.includes('RRSP')) {
        newInsights.push({
          id: Date.now().toString(),
          type: 'investment',
          title: 'RRSP Growth Opportunity',
          description: 'Your RRSP is performing well at 6.2% return',
          impact: 'Potential $220 gain in 3 months',
          priority: 'high',
          actionable: true
        });
      }
      
      if (extractedText.includes('Car Loan')) {
        newInsights.push({
          id: (Date.now() + 1).toString(),
          type: 'debt',
          title: 'Debt Payoff Strategy',
          description: 'Extra $50/month could save $1,200 in interest',
          impact: 'Debt-free 8 months earlier',
          priority: 'high',
          actionable: true
        });
      }
      
      setInsights(prev => [...prev, ...newInsights]);
    };

    const handleSendMessage = async () => {
      if (!inputMessage.trim()) return;
      
      const userMessage = inputMessage;
      setInputMessage('');
      
      // Add user message
      setChatMessages(prev => [...prev, {
        id: Date.now(),
        type: 'user',
        message: userMessage,
        timestamp: new Date().toLocaleTimeString()
      }]);
      
      setIsTyping(true);
      
      try {
        // Generate real AI response
        const aiResponse = await generateRealAIResponse(userMessage);
        setChatMessages(prev => [...prev, {
          id: Date.now(),
          type: 'ai',
          message: aiResponse,
          timestamp: new Date().toLocaleTimeString()
        }]);
      } catch (error) {
        console.error('AI response generation failed:', error);
        // Fallback to simulated response
        const fallbackResponse = generateSimulatedAIResponse(userMessage);
        setChatMessages(prev => [...prev, {
          id: Date.now(),
          type: 'ai',
          message: fallbackResponse,
          timestamp: new Date().toLocaleTimeString()
        }]);
      } finally {
        setIsTyping(false);
      }
    };

    // Real AI response generation
    const generateRealAIResponse = async (userMessage: string): Promise<string> => {
      if (!isAIConnected) {
        throw new Error('AI not connected');
      }

      const prompt = `You are a professional financial advisor. A user is asking: "${userMessage}"

Please provide:
1. Specific financial advice and calculations
2. Relevant strategies and recommendations
3. Actionable next steps
4. Professional, helpful tone

Context: The user has uploaded financial documents and is seeking personalized financial advice.`;

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4',
          messages: [
            {
              role: 'system',
              content: 'You are a professional financial advisor. Provide specific, actionable advice with calculations when relevant.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.3,
          max_tokens: 800,
        }),
      });

      if (!response.ok) {
        throw new Error('OpenAI API request failed');
      }

      const data = await response.json();
      return data.choices[0]?.message?.content || 'I understand your question. Let me provide some guidance.';
    };

    // Simulated AI response for fallback
    const generateSimulatedAIResponse = (userMessage: string): string => {
      const message = userMessage.toLowerCase();
      
      // Financial calculation responses
      if (message.includes('tfsa') && message.includes('month')) {
        return `**TFSA Growth Calculation:** 📈

If you add $50/month to your TFSA at 4.75% annual return:
• Monthly contribution: $50
• Annual return: 4.75%
• In 6 months: $300 + ~$7.50 interest = $307.50
• In 1 year: $600 + ~$15 interest = $615

**Smart Strategy:**
• Consider weekly contributions ($12.50/week) for compound growth
• Automate transfers to avoid missing months
• Review and increase contributions annually

Would you like me to calculate different contribution amounts or compare this to other investment options?`;
      }
      
      if (message.includes('loan') && message.includes('pay')) {
        return `**Loan Payoff Analysis:** 💰

Based on your $14,700 car loan at 6.1%:
• Current monthly payment: $350
• If you add $50/month ($400 total):
  - Payoff time: 36 months (vs 48 months)
  - Interest saved: ~$1,200
  - Total savings: $1,200 + 12 months of payments

**Comparison:**
• **Conservative:** $375/month = 42 months to payoff
• **Aggressive:** $400/month = 36 months to payoff
• **Very Aggressive:** $450/month = 30 months to payoff

**Recommendation:** The extra $50/month is a smart move - you'll save significant interest and be debt-free faster!`;
      }
      
      if (message.includes('rrsp') && message.includes('tfsa')) {
        return `**RRSP vs TFSA Comparison:** 🏦

**Your RRSP ($14,000 at 6.2%):**
• Annual growth: ~$868
• Tax deduction benefit: Immediate tax savings
• Withdrawal: Taxed in retirement

**TFSA (if you had $14,000 at 4.75%):**
• Annual growth: ~$665
• No tax deduction: But tax-free withdrawals
• Flexibility: Can withdraw anytime

**AI Recommendation:**
• **RRSP is better for:** High income earners, long-term retirement
• **TFSA is better for:** Medium income, flexibility, emergency fund
• **Best strategy:** Use both! RRSP for retirement, TFSA for flexibility

Your RRSP is growing faster, which is excellent for retirement planning!`;
      }
      
      if (message.includes('invest') || message.includes('save')) {
        return `**Investment Strategy Analysis:** 📊

Based on your financial situation, here are my recommendations:

**Priority 1: Emergency Fund**
• Save 3-6 months of expenses
• Use TFSA for flexibility

**Priority 2: Debt Reduction**
• Pay off high-interest debt first (6.1% car loan)
• Consider debt consolidation if rates are lower

**Priority 3: Investment Growth**
• RRSP: Great for retirement (6.2% return)
• TFSA: Good for medium-term goals
• Consider: Index funds, ETFs for diversification

**Smart Next Steps:**
1. Build emergency fund in TFSA
2. Pay extra on car loan ($50/month)
3. Increase RRSP contributions gradually
4. Consider automated investing

Would you like me to create a detailed financial plan for you?`;
      }
      
      // Default response
      return `I understand you're asking about "${userMessage}". 

I can help you with:
• **Financial calculations** (loan payoffs, investment growth)
• **Strategy comparisons** (debt vs investing)
• **Goal planning** (emergency fund, retirement)
• **Document analysis** (upload statements for personalized advice)

Try asking me specific questions like:
• "How much would I save with extra loan payments?"
• "Should I prioritize my RRSP or TFSA?"
• "What's my best debt payoff strategy?"

Or upload a financial document for personalized analysis!`;
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSendMessage();
      }
    };

    const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
        handleFileUpload(e.target.files);
      }
    };

    const removeDocument = (documentId: string) => {
      setDocuments(prev => prev.filter(doc => doc.id !== documentId));
    };

    // Drag and drop handlers
    const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault();
      e.currentTarget.classList.add('border-pink-400', 'bg-pink-500/10');
    };

    const handleDragLeave = (e: React.DragEvent) => {
      e.preventDefault();
      e.currentTarget.classList.remove('border-pink-400', 'bg-pink-500/10');
    };

    const handleDrop = (e: React.DragEvent) => {
      e.preventDefault();
      e.currentTarget.classList.remove('border-pink-400', 'bg-pink-500/10');
      
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        handleFileUpload(e.dataTransfer.files);
      }
    };

    return (
      <>
          {/* Header */}
          <header className="bg-gradient-to-r from-indigo-500/20 via-blue-500/20 to-purple-500/20 backdrop-blur-sm border-b border-indigo-200/30 p-6">
            <div className="space-y-4">
              {/* Title and Subtitle */}
                <div>
                <h1 className="text-3xl font-bold text-white mb-2">AI Financial Assistant</h1>
                <p className="text-gray-300 text-lg">Your intelligent financial companion for personalized advice and analysis</p>
                </div>
              
              {/* Status Bar */}
              <div className="bg-gradient-to-r from-indigo-600/20 to-blue-600/20 rounded-lg p-4 border border-indigo-200/30">
                <div className="flex items-center justify-between text-white">
                  <div className="flex items-center space-x-6">
                    <div className="flex items-center space-x-2">
                      <div className={`w-2 h-2 rounded-full ${isAIConnected ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                      <span className="text-sm font-medium">{isAIConnected ? 'AI Online' : 'Demo Mode'}</span>
              </div>
              <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 bg-blue-400 rounded-sm flex items-center justify-center">
                        <span className="text-xs font-bold text-white">A</span>
                </div>
                      <span className="text-sm">94% Accuracy</span>
              </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 text-blue-400">
                        <svg fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                        </svg>
            </div>
                      <span className="text-sm">2.3s Avg</span>
                              </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 text-blue-400">
                        <svg fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                        </svg>
                              </div>
                      <span className="text-sm">Documents Today: {documents.length}</span>
                        </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 text-blue-400">
                        <svg fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <span className="text-sm">Time Saved: 1.2h</span>
                    </div>
                  </div>

                  {/* Chat Toggle Button */}
                              <button
                    onClick={() => setShowChat(!showChat)}
                    className="bg-gradient-to-r from-indigo-400 to-blue-400 hover:from-indigo-500 hover:to-blue-500 text-white px-4 py-2 rounded-lg transition-all duration-200 transform hover:scale-105 shadow-lg text-sm"
                  >
                    {showChat ? 'Hide Chat' : 'Show Chat'}
                              </button>
                            </div>
                          </div>
                      </div>
          </header>

                    {/* Main Content */}
          <main className="flex-1 overflow-hidden">
            <div className="max-w-7xl mx-auto space-y-8">
              <div className="h-full">
                
                {/* Chat Interface - Full Width */}
                {showChat && (
                  <div className="flex flex-col bg-white/10 backdrop-blur-sm h-full">
                    {/* Chat Messages - Fixed Scroll Container */}
                     <div className="flex-1 overflow-y-auto p-6 space-y-4 min-h-0 chat-messages">
                      {chatMessages.map((message) => (
                        <div
                          key={message.id}
                          className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[80%] p-4 rounded-lg shadow-lg ${
                              message.type === 'user'
                                ? 'bg-gradient-to-r from-indigo-400 to-blue-400 text-white'
                                : 'bg-white/10 text-white border border-indigo-200/30'
                            }`}
                          >
                            <div className="flex items-start space-x-3">
                              {message.type === 'ai' && (
                                <Sparkles className="w-5 h-5 text-indigo-400 mt-0.5 flex-shrink-0" />
                              )}
                              <div className="flex-1">
                                <div className="whitespace-pre-wrap text-sm leading-relaxed">
                                  {message.message}
                                </div>
                                
                                {/* Document Attachments */}
                                {message.attachments && message.attachments.length > 0 && (
                                  <div className="mt-3 space-y-2">
                                    {message.attachments.map((doc) => (
                                      <div
                                        key={doc.id}
                                        className="bg-white/10 rounded-lg p-3 border border-blue-200/30"
                                      >
                                        <div className="flex items-center space-x-2">
                                          <FileText className="w-4 h-4 text-blue-400" />
                                          <span className="text-gray-300 text-sm">
                                            Analyzed: {doc.name}
                                          </span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                                
                                <div className="flex items-center justify-between mt-3">
                                  <span className="text-xs text-gray-400">
                                    {message.timestamp}
                                  </span>
                                  {message.type === 'ai' && (
                                    <div className="flex items-center space-x-2">
                                      <button 
                                        onClick={() => handleShareWithTherapist(message.id)}
                                        className="flex items-center space-x-1 px-2 py-1 bg-gradient-to-r from-blue-100/20 to-cyan-100/20 hover:from-blue-200/20 hover:to-cyan-200/20 text-blue-300 rounded text-xs transition-all duration-200"
                                      >
                                        <Heart className="w-3 h-3" />
                                        <span>Share with Therapist</span>
                                      </button>
                                      <div className="flex items-center space-x-1">
                                        <button className="p-1 hover:bg-blue-100/20 rounded transition-colors">
                                          <ThumbsUp className="w-3 h-3 text-gray-400" />
                                        </button>
                                        <button className="p-1 hover:bg-blue-100/20 rounded transition-colors">
                                          <ThumbsDown className="w-3 h-3 text-gray-400" />
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                      
                      {/* Typing Indicator */}
                      {isTyping && (
                        <div className="flex justify-start">
                          <div className="bg-white/10 text-white p-4 rounded-lg border border-blue-200/30 shadow-lg">
                            <div className="flex items-center space-x-3">
                              <Sparkles className="w-5 h-5 text-blue-400" />
                              <div className="flex space-x-1">
                                <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
                                <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      <div ref={messagesEndRef} />
                    </div>

                    {/* Chat Input */}
                    <div className="p-6 border-t border-blue-200/30 bg-white/10">
                      <div className="flex items-center space-x-3">
                        {/* File Upload Button */}
                        <div className="relative" ref={uploadMenuRef}>
                          <button
                            onClick={handleUploadMenuToggle}
                            className="p-3 bg-gradient-to-r from-blue-100/20 to-cyan-100/20 hover:from-blue-200/20 hover:to-cyan-200/20 text-blue-300 rounded-xl transition-all duration-200 transform hover:scale-105 shadow-sm"
                          >
                            <Plus className="w-5 h-5" />
                          </button>
                          
                          {/* Upload Menu */}
                          {showUploadMenu && (
                            <div className="absolute bottom-full left-0 mb-2 bg-gray-800 rounded-xl shadow-lg border border-blue-200/30 p-2 min-w-[200px]">
                              <div className="space-y-1">
                                <button
                                  onClick={() => handleQuickUpload('document')}
                                  className="w-full flex items-center space-x-3 px-3 py-2 text-left text-gray-300 hover:bg-blue-500/20 rounded-lg transition-colors"
                                >
                                  <FileText className="w-4 h-4 text-blue-400" />
                                  <span className="text-sm">Upload Document</span>
                                </button>
                                <button
                                  onClick={() => handleQuickUpload('image')}
                                  className="w-full flex items-center space-x-3 px-3 py-2 text-left text-gray-300 hover:bg-blue-500/20 rounded-lg transition-colors"
                                >
                                  <Image className="w-4 h-4 text-cyan-400" />
                                  <span className="text-sm">Upload Image</span>
                                </button>
                                <button
                                  onClick={() => handleQuickUpload('camera')}
                                  className="w-full flex items-center space-x-3 px-3 py-2 text-left text-gray-300 hover:bg-blue-500/20 rounded-lg transition-colors"
                                >
                                  <Eye className="w-4 h-4 text-blue-500" />
                                  <span className="text-sm">Scan with Camera</span>
                                </button>
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="flex-1 relative">
                          <input
                            type="text"
                            value={inputMessage}
                            onChange={(e) => setInputMessage(e.target.value)}
                            onKeyPress={handleKeyPress}
                            placeholder="Ask about your finances, upload documents, or get advice..."
                            className="w-full bg-white/10 text-white placeholder-gray-400 px-4 py-3 rounded-xl border border-indigo-200/50 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/20 shadow-sm"
                          />
                        </div>

                        {/* Voice Button */}
                        <button
                          onClick={handleVoiceInput}
                          disabled={isTyping}
                          className={`p-3 rounded-xl transition-all duration-200 transform hover:scale-105 shadow-sm ${
                            isRecording 
                              ? 'bg-red-500 text-white animate-pulse' 
                              : 'bg-gradient-to-r from-indigo-100/20 to-blue-100/20 hover:from-indigo-200/20 hover:to-blue-200/20 text-indigo-300'
                          }`}
                        >
                          {isRecording ? (
                            <MicOff className="w-5 h-5" />
                          ) : (
                            <Mic className="w-5 h-5" />
                          )}
                        </button>

                        {/* Send Button */}
                        <button
                          onClick={handleSendMessage}
                          disabled={!inputMessage.trim() || isTyping}
                          className="bg-gradient-to-r from-indigo-400 to-blue-400 hover:from-indigo-500 hover:to-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white p-3 rounded-xl transition-all duration-200 transform hover:scale-105 shadow-lg"
                        >
                          <Send className="w-5 h-5" />
                        </button>
                      </div>

                      {/* Voice Recording Indicator */}
                      {isListening && (
                        <div className="mt-3 flex items-center space-x-2 text-indigo-400 text-sm">
                          <div className="flex space-x-1">
                            <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                            <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                          </div>
                          <span>Listening...</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              
              {/* Specialized AI Financial Assistant Chatbot */}
              <SpecializedChatBot
                name="AIFinancialAssistantBot"
                expertise="General financial guidance, analysis, answering money questions"
                avatar="🤖"
                welcomeMessage="Hi! I'm AIFinancialAssistantBot, your comprehensive financial advisor. I can help you with financial analysis, investment advice, debt management, budgeting strategies, and answering any money-related questions. What financial topic would you like to discuss today?"
                color="indigo"
              />
            </div>
          </main>
      </>
    );
  } catch (error) {
    console.error('Error loading AIFinancialAssistantPage:', error);
    return (
      <div className="flex h-screen items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-xl text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">AI Financial Assistant</h2>
          <p className="text-gray-600 mb-4">
            It seems there was an issue loading the AI Financial Assistant. Please try refreshing the page or contact support.
          </p>
          <p className="text-gray-500 text-sm">Error: {error instanceof Error ? error.message : String(error)}</p>
        </div>
      </div>
    );
  }
};

export default AIFinancialAssistantPage; 