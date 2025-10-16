import React, { useState, useRef, useEffect } from 'react';
import { Send, X, Crown, User, Loader2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export default function PrimeChatSimple() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "Hello! I'm 👑 Prime, your AI CEO. I orchestrate our entire 30-member AI enterprise to deliver elite-level financial intelligence. What can my team accomplish for you today?",
      timestamp: new Date().toISOString()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle send
  const handleSend = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: Message = {
      role: 'user',
      content: inputMessage,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    // Simulate AI response
    setTimeout(() => {
      const aiResponse: Message = {
        role: 'assistant',
        content: generateAIResponse(inputMessage),
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, aiResponse]);
      setIsLoading(false);
    }, 1500);
  };

  const generateAIResponse = (userInput: string): string => {
    const input = userInput.toLowerCase().trim();
    
    // Greetings
    if (input.includes('hello') || input.includes('hi') || input.includes('hey')) {
      return "Hello! I'm 👑 Prime, your AI CEO. I orchestrate our entire 30-member AI enterprise to deliver elite-level financial intelligence.\n\nI can help you with:\n• Financial analysis & insights\n• Document processing (receipts, statements)\n• Transaction categorization\n• Tax optimization\n• Budget planning & forecasting\n• Business intelligence\n\nWhat can my team accomplish for you today?";
    }
    
    // Help requests
    if (input.includes('help') || input.includes('what can you do')) {
      return "As your AI CEO, I manage 30 specialized AI employees:\n\n📊 **Crystal** - Financial forecasting & spending analysis\n🏷️ **Tag** - Transaction categorization & rules\n📄 **Byte** - Document processing & OCR\n🧾 **Ledger** - Tax optimization & compliance\n📈 **Analytics** - Business intelligence & reporting\n🎯 **Goals** - Financial planning & targets\n\nEach specialist is ready to handle your specific needs. What would you like to work on?";
    }
    
    // Financial analysis
    if (input.includes('analyze') || input.includes('analysis') || input.includes('insights')) {
      return "Excellent! I'll connect you with **Crystal**, our financial forecasting specialist. Crystal can:\n\n• Analyze your spending patterns\n• Identify trends and anomalies\n• Predict future expenses\n• Create detailed financial reports\n• Suggest optimization opportunities\n\nWould you like to start with a spending analysis or upload some financial data for Crystal to review?";
    }
    
    // Categorization
    if (input.includes('categorize') || input.includes('category') || input.includes('sort')) {
      return "Perfect! **Tag** is our transaction categorization expert. Tag can:\n\n• Automatically sort your transactions\n• Learn from your patterns\n• Create custom categorization rules\n• Handle recurring expenses\n• Export categorized data\n\nDo you have transactions you'd like Tag to categorize, or would you like to set up automatic categorization rules?";
    }
    
    // Documents
    if (input.includes('receipt') || input.includes('document') || input.includes('upload') || input.includes('scan')) {
      return "Great choice! **Byte** is our document processing wizard. Byte can:\n\n• Extract data from receipts\n• Process bank statements\n• Handle invoices & bills\n• OCR text recognition\n• Organize financial documents\n\nJust upload your documents and Byte will process them instantly. What type of documents do you need processed?";
    }
    
    // Taxes
    if (input.includes('tax') || input.includes('taxes') || input.includes('deduction')) {
      return "Smart thinking! **Ledger** is our tax optimization specialist. Ledger can:\n\n• Maximize your deductions\n• Track business expenses\n• Prepare quarterly estimates\n• Stay current with tax codes\n• Generate tax reports\n\nAre you looking for year-end tax optimization or ongoing tax planning?";
    }
    
    // Budgeting
    if (input.includes('budget') || input.includes('spending') || input.includes('expenses')) {
      return "**Crystal** is perfect for this! Crystal specializes in:\n\n• Spending pattern analysis\n• Budget creation & optimization\n• Expense forecasting\n• Cost reduction opportunities\n• Financial goal tracking\n\nWould you like Crystal to analyze your current spending or help create a new budget?";
    }
    
    // Business
    if (input.includes('business') || input.includes('company') || input.includes('corporate')) {
      return "For business needs, I recommend:\n\n🏢 **Business Intelligence** - Analytics & reporting\n🧾 **Ledger** - Business tax optimization\n📊 **Crystal** - Cash flow forecasting\n📄 **Byte** - Invoice & receipt processing\n\nWhat aspect of your business finances would you like to focus on?";
    }
    
    // Investment
    if (input.includes('invest') || input.includes('portfolio') || input.includes('stocks')) {
      return "For investment analysis, I can connect you with:\n\n📈 **Analytics** - Portfolio performance analysis\n🎯 **Goals** - Investment planning & targets\n📊 **Crystal** - Risk assessment & forecasting\n\nWhat type of investment analysis are you looking for?";
    }
    
    // Goals
    if (input.includes('goal') || input.includes('plan') || input.includes('target')) {
      return "**Goals** is our financial planning specialist! Goals can help with:\n\n🎯 Setting SMART financial targets\n📅 Creating achievable timelines\n📊 Tracking progress & milestones\n💰 Optimizing savings strategies\n\nWhat financial goal would you like to work on?";
    }
    
    // Default response with more personality
    return `Interesting question about "${userInput}"! 👑\n\nAs your AI CEO, I have 30 specialized employees ready to help. Based on your question, I'd recommend:\n\n• **Crystal** for analysis & forecasting\n• **Tag** for categorization\n• **Byte** for document processing\n• **Ledger** for tax optimization\n• **Analytics** for business intelligence\n\nCould you tell me more about what you're trying to accomplish? I'll connect you with the perfect specialist!`;
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <div className="bg-black/20 backdrop-blur-sm border-b border-purple-500/20">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
              <Crown className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Prime AI</h1>
              <p className="text-purple-300 text-sm">Your AI CEO</p>
            </div>
          </div>
          <button
            onClick={() => window.close()}
            className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="space-y-4 mb-6">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  message.role === 'user'
                    ? 'bg-gradient-to-br from-purple-500 to-pink-500 text-white'
                    : 'bg-white/10 backdrop-blur-sm text-white border border-white/20'
                }`}
              >
                <div className="flex items-start space-x-2">
                  {message.role === 'assistant' && (
                    <div className="w-6 h-6 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                      <Crown className="w-3 h-3 text-white" />
                    </div>
                  )}
                  {message.role === 'user' && (
                    <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                      <User className="w-3 h-3 text-white" />
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="whitespace-pre-wrap">{message.content}</p>
                    <p className="text-xs opacity-70 mt-2">
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white/10 backdrop-blur-sm text-white border border-white/20 rounded-2xl px-4 py-3">
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                    <Crown className="w-3 h-3 text-white" />
                  </div>
                  <div className="flex items-center space-x-1">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm">Prime is thinking...</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="bg-white/5 backdrop-blur-sm border border-white/20 rounded-2xl p-4">
          <div className="flex space-x-3">
            <textarea
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask Prime anything about your finances..."
              className="flex-1 bg-transparent text-white placeholder-gray-400 border-none outline-none resize-none"
              rows={1}
              disabled={isLoading}
            />
            <button
              onClick={handleSend}
              disabled={!inputMessage.trim() || isLoading}
              className="p-3 bg-gradient-to-br from-purple-500 to-pink-500 text-white rounded-xl hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      <div ref={messagesEndRef} />
    </div>
  );
}
