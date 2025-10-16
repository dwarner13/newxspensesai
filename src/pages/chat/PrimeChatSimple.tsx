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
    const input = userInput.toLowerCase();
    
    if (input.includes('hello') || input.includes('hi')) {
      return "Hello! I'm Prime, your AI CEO. I can help you with financial analysis, document processing, transaction categorization, tax optimization, and much more. What would you like to accomplish today?";
    } else if (input.includes('help')) {
      return "I can help you with:\n\n• Financial analysis and insights\n• Transaction categorization\n• Document processing (receipts, statements)\n• Tax optimization\n• Business intelligence\n• Budget planning\n• Investment analysis\n• And much more!\n\nWhat specific task would you like me to handle?";
    } else if (input.includes('categorize') || input.includes('category')) {
      return "I can help you categorize transactions! I'll connect you with Tag, our AI specialist for transaction categorization. Tag can automatically sort your expenses, create custom rules, and learn from your patterns. Would you like me to set up a categorization session?";
    } else if (input.includes('receipt') || input.includes('document')) {
      return "Perfect! I'll connect you with Byte, our document processing specialist. Byte can extract data from receipts, bank statements, invoices, and more. Just upload your documents and Byte will process them instantly. Ready to get started?";
    } else if (input.includes('tax') || input.includes('taxes')) {
      return "I'll connect you with Ledger, our tax optimization specialist. Ledger can help with tax preparation, deductions, quarterly estimates, and year-end planning. Ledger stays up-to-date with the latest tax codes and can maximize your deductions. Shall we begin?";
    } else if (input.includes('budget') || input.includes('spending')) {
      return "I'll connect you with Crystal, our financial forecasting specialist. Crystal can analyze your spending patterns, predict future expenses, and help you create optimized budgets. Crystal uses advanced AI to identify trends and opportunities. Ready to analyze your finances?";
    } else {
      return `I understand you're asking about "${userInput}". As your AI CEO, I can help you with financial management, document processing, analysis, and more. I have 30 specialized AI employees ready to assist. What specific area would you like to explore?`;
    }
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
