import { useState, useRef, useEffect } from 'react';
import { Send, X, MessageSquare, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const ChatBot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([
        {
          id: 'welcome',
          type: 'assistant',
          content: "Hi 👋 I'm your XspensesAI assistant. Ask me anything about your transactions and financial insights!",
          timestamp: new Date(),
        },
      ]);
    }
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Simulate AI response for now
      setTimeout(() => {
        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          type: 'assistant',
          content: "I'm here to help with your financial questions! This is a demo response. In the full version, I'll analyze your transactions and provide personalized insights.",
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, aiMessage]);
        setIsLoading(false);
      }, 1000);
    } catch (error) {
      toast.error('Failed to get AI response');
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as any);
    }
  };

  return (
    <>
      {/* Enhanced Chatbot Toggle Button - Right Side */}
      <div className="fixed top-1/2 right-8 transform -translate-y-1/2 z-40">
        {/* Glowing background effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 rounded-full blur-xl opacity-30 animate-pulse"></div>
        
        {/* Main button with enhanced styling */}
        <motion.button
          onClick={() => setIsOpen(true)}
          className="relative w-20 h-20 bg-gradient-to-br from-purple-500 via-pink-500 to-blue-600 text-white rounded-full shadow-2xl hover:shadow-purple-500/50 transition-all duration-300 flex items-center justify-center group"
          whileHover={{ 
            scale: 1.1,
            rotate: 5
          }}
          whileTap={{ scale: 0.95 }}
          animate={{
            boxShadow: [
              "0 0 20px rgba(147, 51, 234, 0.5)",
              "0 0 40px rgba(147, 51, 234, 0.8)",
              "0 0 20px rgba(147, 51, 234, 0.5)"
            ]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          {/* Sparkles icon */}
          <div className="absolute -top-2 -right-2 text-yellow-400 animate-bounce">
            <Sparkles size={16} />
          </div>
          
          {/* Main icon */}
          <MessageSquare size={32} className="group-hover:scale-110 transition-transform duration-200" />
          
          {/* Pulse ring effect */}
          <div className="absolute inset-0 border-2 border-purple-300 rounded-full animate-ping opacity-75"></div>
        </motion.button>
        
        {/* Floating label */}
        <div className="absolute -left-4 top-full mt-3 bg-white text-gray-800 px-3 py-1 rounded-lg shadow-lg text-sm font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          AI Assistant
          <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-white rotate-45"></div>
        </div>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, x: 100, scale: 0.8 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 100, scale: 0.8 }}
            className="fixed top-1/2 right-8 transform -translate-y-1/2 w-[420px] bg-white rounded-2xl shadow-2xl overflow-hidden z-50 border border-purple-200"
            style={{
              boxShadow: "0 25px 50px -12px rgba(147, 51, 234, 0.25), 0 0 0 1px rgba(147, 51, 234, 0.1)"
            }}
          >
            {/* Enhanced Header */}
            <div className="bg-gradient-to-r from-purple-500 via-pink-500 to-blue-600 text-white px-6 py-4 flex justify-between items-center relative overflow-hidden">
              {/* Background pattern */}
              <div className="absolute inset-0 opacity-10">
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-white/20 to-transparent"></div>
              </div>
              
              <div className="flex items-center gap-3 relative z-10">
                <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                  <MessageSquare size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-lg">XspensesAI Assistant</h3>
                  <p className="text-xs text-white/80">Your Financial AI Companion</p>
                </div>
              </div>
              
              <button
                onClick={() => setIsOpen(false)}
                className="text-white/80 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg relative z-10"
              >
                <X size={20} />
              </button>
            </div>

            {/* Enhanced Messages */}
            <div className="h-[500px] overflow-y-auto p-6 space-y-4 bg-gradient-to-b from-gray-50 to-white">
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs px-4 py-3 rounded-2xl shadow-sm ${
                      message.type === 'user'
                        ? 'bg-gradient-to-r from-purple-500 to-blue-600 text-white'
                        : 'bg-white text-gray-800 border border-gray-200 shadow-md'
                    }`}
                  >
                    <p className="text-sm leading-relaxed">{message.content}</p>
                    <p className="text-xs opacity-70 mt-2">
                      {message.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                </motion.div>
              ))}
              {isLoading && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex justify-start"
                >
                  <div className="bg-white text-gray-800 border border-gray-200 px-4 py-3 rounded-2xl shadow-md">
                    <div className="flex items-center space-x-3">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                      <span className="text-sm text-gray-600">AI is thinking...</span>
                    </div>
                  </div>
                </motion.div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Enhanced Input Form */}
            <form onSubmit={handleSubmit} className="border-t border-gray-200 p-6 bg-white">
              <div className="flex space-x-3">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask me about your finances, transactions, or goals..."
                  className="flex-1 resize-none rounded-xl border border-gray-300 p-3 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 placeholder-gray-400"
                  rows={1}
                  disabled={isLoading}
                />
                <motion.button
                  type="submit"
                  disabled={isLoading || !input.trim()}
                  className="bg-gradient-to-r from-purple-500 to-blue-600 text-white p-3 rounded-xl hover:opacity-90 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Send size={20} />
                </motion.button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default ChatBot;
