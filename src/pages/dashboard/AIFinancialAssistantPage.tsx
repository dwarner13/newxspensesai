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
import DashboardHeader from '../../components/ui/DashboardHeader';

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

const AIFinancialAssistantPage = () => {
  console.log('🎯 AIFinancialAssistantPage component is loading...');
  
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

  // Check AI connection on mount and ensure page starts at top
  useEffect(() => {
    checkAIConnection();
  }, []);

  // Separate effect for scroll-to-top to ensure it happens after component is fully rendered
  useEffect(() => {
    // Use setTimeout to ensure this runs after the component is fully rendered
    const timer = setTimeout(() => {
      window.scrollTo(0, 0);
    }, 100);
    return () => clearTimeout(timer);
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
      // Wrap the AI connection test in a try-catch to prevent component crash
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
      // Set AI as disconnected but don't crash the component
      setIsAIConnected(false);
      // Add a message to inform the user
      setChatMessages(prev => [...prev, {
        id: Date.now(),
        type: 'ai',
        message: "⚠️ AI service is currently unavailable. I'll provide simulated responses for demonstration purposes.",
        timestamp: new Date().toLocaleTimeString()
      }]);
    }
  };

  // Auto-scroll to bottom of chat - only when new messages are added (not on initial load)
  useEffect(() => {
    // Don't scroll on initial load, only when new messages are added
    if (chatMessages.length > 1 && chatMessages.length > 3) { // Ensure we have more than initial messages
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
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
        // Add a simulated voice message
        setChatMessages(prev => [...prev, {
          id: Date.now(),
          type: 'user',
          message: "I just recorded a voice message about my financial goals.",
          timestamp: new Date().toLocaleTimeString()
        }]);
      }, 3000);
    } else {
      setIsRecording(false);
      setIsListening(false);
    }
  };

  // Handle file upload
  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    setIsUploading(true);
    
    try {
      // Simulate file processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const newDocuments: FinancialDocument[] = Array.from(files).map((file, index) => ({
        id: `doc-${Date.now()}-${index}`,
        name: file.name,
        type: file.type.includes('pdf') ? 'pdf' : 
              file.type.includes('csv') ? 'csv' : 
              file.type.includes('image') ? 'image' : 'screenshot',
        size: file.size,
        uploadedAt: new Date().toISOString(),
        fileUrl: URL.createObjectURL(file)
      }));
      
      setDocuments(prev => [...prev, ...newDocuments]);
      
      // Add AI analysis message
      setChatMessages(prev => [...prev, {
        id: Date.now(),
        type: 'ai',
        message: `I've analyzed ${newDocuments.length} document(s). Here's what I found:\n\n${newDocuments.map(doc => `📄 ${doc.name} - ${doc.type.toUpperCase()}`).join('\n')}\n\nI can help you extract financial data, categorize transactions, or answer questions about these documents. What would you like to know?`,
        timestamp: new Date().toLocaleTimeString()
      }]);
      
    } catch (error) {
      console.error('File upload error:', error);
      setChatMessages(prev => [...prev, {
        id: Date.now(),
        type: 'ai',
        message: "Sorry, I encountered an error processing your documents. Please try again.",
        timestamp: new Date().toLocaleTimeString()
      }]);
    } finally {
      setIsUploading(false);
    }
  };

  // Handle quick upload
  const handleQuickUpload = (type: string) => {
    setShowUploadMenu(false);
    // Simulate different upload types
    const mockDocument: FinancialDocument = {
      id: `quick-${Date.now()}`,
      name: `Quick ${type} upload`,
      type: type === 'pdf' ? 'pdf' : 'image',
      size: 1024 * 1024,
      uploadedAt: new Date().toISOString()
    };
    
    setDocuments(prev => [...prev, mockDocument]);
    setChatMessages(prev => [...prev, {
      id: Date.now(),
      type: 'ai',
      message: `I've processed your ${type} upload. I can help analyze this document and extract financial insights. What would you like me to focus on?`,
      timestamp: new Date().toLocaleTimeString()
    }]);
  };

  // Handle send message
  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;
    
    const userMessage: ChatMessage = {
      id: Date.now(),
      type: 'user',
      message: inputMessage,
      timestamp: new Date().toLocaleTimeString()
    };
    
    setChatMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsTyping(true);
    
    try {
      // Simulate AI response
      await new Promise(resolve => setTimeout(resolve, 1000));
      
              const aiResponse: ChatMessage = {
          id: Date.now() + 1,
          type: 'ai',
          message: generateAIResponse(inputMessage),
          timestamp: new Date().toLocaleTimeString()
        };
      
      setChatMessages(prev => [...prev, aiResponse]);
    } catch (error) {
      console.error('Error generating AI response:', error);
      setChatMessages(prev => [...prev, {
        id: Date.now() + 1,
        type: 'ai',
        message: "I'm sorry, I encountered an error processing your request. Please try again.",
        timestamp: new Date().toLocaleTimeString()
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  // Handle key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Generate AI response
  const generateAIResponse = (userMessage: string): string => {
    const lowerMessage = userMessage.toLowerCase();
    
    if (lowerMessage.includes('budget') || lowerMessage.includes('spending')) {
      return "Great question about budgeting! I can help you create a budget, track spending, and identify areas to save. Would you like me to analyze your current spending patterns or help you set up a new budget?";
    } else if (lowerMessage.includes('invest') || lowerMessage.includes('savings')) {
      return "Investing and savings are key to building wealth! I can help you understand different investment options, calculate compound interest, and create a savings plan. What's your current financial situation?";
    } else if (lowerMessage.includes('debt') || lowerMessage.includes('loan')) {
      return "Managing debt effectively is crucial for financial health. I can help you create a debt payoff strategy, calculate interest, and explore consolidation options. What types of debt are you dealing with?";
    } else if (lowerMessage.includes('tax') || lowerMessage.includes('deduction')) {
      return "Tax planning can save you money! I can help you understand deductions, plan for tax season, and optimize your tax strategy. Are you looking for business deductions or personal tax advice?";
    } else {
      return "That's an interesting financial question! I'm here to help with budgeting, investing, debt management, tax planning, and more. Could you give me more details about what you'd like to know?";
    }
  };

  // Try to render the component, but catch any errors and show a fallback
  try {
    return (
      <div className="w-full">
        <DashboardHeader />
        
        {/* Content Area with Enhanced Styling */}
        <div className="max-w-7xl mx-auto space-y-8 px-4">
          
          {/* Status Bar */}
          <div className="mb-8 bg-gradient-to-r from-indigo-600/20 to-blue-600/20 rounded-lg p-4 border border-indigo-200/30">
            <div className="flex items-center justify-between text-white">
              <div className="flex items-center space-x-6">
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${isAIConnected ? 'bg-green-400' : 'bg-red-400'}`}></div>
                  <span className="text-sm">
                    {isAIConnected ? 'AI Connected' : 'AI Offline'}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-blue-400"></div>
                  <span className="text-sm">Ready to Help</span>
                </div>
              </div>
              <button
                onClick={() => checkAIConnection()}
                className="text-xs bg-white/10 hover:bg-white/20 px-3 py-1 rounded-lg transition-colors"
              >
                Refresh Status
              </button>
            </div>
          </div>

          {/* Main Content */}
          <main className="flex-1 overflow-y-auto">
            <div className="space-y-8">
              
              {/* Financial Overview Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-blue-500/20 rounded-xl">
                      <DollarSign className="w-6 h-6 text-blue-400" />
                    </div>
                    <span className="text-2xl font-bold text-white">$24,580</span>
                  </div>
                  <p className="text-gray-300 text-sm">Total Assets</p>
                  <div className="flex items-center mt-2 text-green-400 text-sm">
                    <TrendingUp className="w-4 h-4 mr-1" />
                    +12.5%
                  </div>
                </div>

                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-red-500/20 rounded-xl">
                      <CreditCard className="w-6 h-6 text-red-400" />
                    </div>
                    <span className="text-2xl font-bold text-white">$8,420</span>
                  </div>
                  <p className="text-gray-300 text-sm">Total Debt</p>
                  <div className="flex items-center mt-2 text-red-400 text-sm">
                    <TrendingUp className="w-4 h-4 mr-1" />
                    +2.1%
                  </div>
                </div>

                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-green-500/20 rounded-xl">
                      <PiggyBank className="w-6 h-6 text-green-400" />
                    </div>
                    <span className="text-2xl font-bold text-white">$3,250</span>
                  </div>
                  <p className="text-gray-300 text-sm">Monthly Savings</p>
                  <div className="flex items-center mt-2 text-green-400 text-sm">
                    <TrendingUp className="w-4 h-4 mr-1" />
                    +8.3%
                  </div>
                </div>

                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-purple-500/20 rounded-xl">
                      <Target className="w-6 h-6 text-purple-400" />
                    </div>
                    <span className="text-2xl font-bold text-white">85%</span>
                  </div>
                  <p className="text-gray-300 text-sm">Goal Progress</p>
                  <div className="flex items-center mt-2 text-purple-400 text-sm">
                    <Target className="w-4 h-4 mr-1" />
                    On Track
                  </div>
                </div>
              </div>

              {/* AI Chat Interface */}
              <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 overflow-hidden">
                <div className="p-6 border-b border-white/10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-blue-500 rounded-full flex items-center justify-center">
                        <Bot className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-white">AI Financial Assistant</h3>
                        <p className="text-sm text-gray-300">Ask me anything about your finances</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowChat(!showChat)}
                      className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    >
                      {showChat ? <X className="w-5 h-5 text-gray-400" /> : <MessageSquare className="w-5 h-5 text-gray-400" />}
                    </button>
                  </div>
                </div>

                {showChat && (
                  <div className="p-6">
                    {/* Chat Messages */}
                    <div className="space-y-4 mb-6 max-h-96 overflow-y-auto">
                      {chatMessages.map((message) => (
                        <div
                          key={message.id}
                          className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl ${
                              message.type === 'user'
                                ? 'bg-gradient-to-r from-indigo-500 to-blue-500 text-white'
                                : 'bg-white/10 text-gray-200 border border-white/20'
                            }`}
                          >
                            <p className="text-sm">{message.message}</p>
                            <div className="flex items-center justify-between mt-2">
                              <span className="text-xs opacity-70">{message.timestamp}</span>
                              {message.type === 'ai' && (
                                <div className="flex items-center space-x-2">
                                  <button
                                    onClick={() => handleShareWithTherapist(message.id)}
                                    className="text-xs bg-white/20 hover:bg-white/30 px-2 py-1 rounded transition-colors"
                                  >
                                    Share with Therapist
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                      {isTyping && (
                        <div className="flex justify-start">
                          <div className="bg-white/10 text-gray-200 border border-white/20 max-w-xs lg:max-w-md px-4 py-3 rounded-2xl">
                            <div className="flex space-x-1">
                              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                            </div>
                          </div>
                        </div>
                      )}
                      <div ref={messagesEndRef} />
                    </div>

                    {/* Chat Input */}
                    <div className="p-6 border-t border-blue-200/30 bg-white/10">
                      <div className="flex items-center space-x-3">
                        {/* Upload Button */}
                        <div className="relative" ref={uploadMenuRef}>
                          <button
                            onClick={() => setShowUploadMenu(!showUploadMenu)}
                            className="p-3 rounded-xl bg-gradient-to-r from-blue-100/20 to-cyan-100/20 hover:from-blue-200/20 hover:to-cyan-200/20 text-blue-300 transition-all duration-200"
                          >
                            <Paperclip className="w-5 h-5" />
                          </button>
                          
                          {showUploadMenu && (
                            <div className="absolute bottom-full left-0 mb-2 w-48 bg-gray-800 border border-gray-600 rounded-lg shadow-xl z-10">
                              <div className="p-2 space-y-1">
                                <button
                                  onClick={() => handleQuickUpload('pdf')}
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
            </div>
          </main>
          
          {/* Specialized AI Financial Assistant Chatbot */}
          <SpecializedChatBot
            name="AIFinancialAssistantBot"
            expertise="General financial guidance, analysis, answering money questions"
            avatar="🤖"
            welcomeMessage="Hey there! 👋 I'm your AI Financial Assistant. I can help you with money questions, budgeting, investing, and more. What would you like to know about your finances today?"
            color="indigo"
          />
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.csv,.jpg,.jpeg,.png,.txt,.xlsx,.xls"
          onChange={(e) => handleFileUpload(e.target.files)}
          className="hidden"
        />
      </div>
    );
  } catch (error) {
    // Fallback UI if the component crashes
    console.error('AIFinancialAssistantPage crashed:', error);
    return (
      <div className="w-full">
        <DashboardHeader />
        <div className="max-w-7xl mx-auto p-8">
          <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-8 text-center">
            <AlertTriangle className="w-16 h-16 text-red-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Something went wrong</h2>
            <p className="text-gray-300 mb-4">
              The AI Financial Assistant encountered an error. This might be due to a temporary issue with the AI service.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-xl transition-colors"
            >
              Reload Page
            </button>
          </div>
        </div>
      </div>
    );
  }
};

export default AIFinancialAssistantPage; 