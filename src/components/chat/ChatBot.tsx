import { useState, useRef, useEffect } from 'react';
import { Send, X, MessageSquare, Sparkles, Clock, MessageCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  personality?: string;
  catchphrase?: string;
}

const ChatBot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [currentPersonality, setCurrentPersonality] = useState<string>('XspensesAI Assistant');
  const [currentCatchphrase, setCurrentCatchphrase] = useState<string>('');
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [conversationContext, setConversationContext] = useState<string>('');
  const [userPreferences, setUserPreferences] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Load conversation history when chat opens
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      loadConversationHistory();
    }
  }, [isOpen]);

  // Load conversation history from enhanced backend
  const loadConversationHistory = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        addWelcomeMessage();
        return;
      }

      setIsLoadingHistory(true);

      // Try to find existing conversation
      const { data: existingConversation } = await supabase
        .from('conversations')
        .select('*')
        .eq('user_id', user.id)
        .eq('personality_type', 'XspensesAI Assistant')
        .order('last_message_at', { ascending: false })
        .limit(1);

      if (existingConversation && existingConversation.length > 0) {
        const conv = existingConversation[0];
        setConversationId(conv.id);
        
        // Load messages from the new messages table
        const { data: conversationMessages } = await supabase
          .from('messages')
          .select('*')
          .eq('conversation_id', conv.id)
          .order('created_at', { ascending: true });

        if (conversationMessages && conversationMessages.length > 0) {
          const loadedMessages = conversationMessages.map((msg: any) => ({
            id: msg.id,
            type: msg.role === 'user' ? 'user' : 'assistant',
            content: msg.content,
            timestamp: new Date(msg.created_at),
            personality: msg.metadata?.personality || 'XspensesAI Assistant',
            catchphrase: msg.metadata?.catchphrase || ''
          }));
          setMessages(loadedMessages);
          
          // Set conversation context
          if (loadedMessages.length > 2) {
            setConversationContext(`Continuing conversation with XspensesAI Assistant (${loadedMessages.length} messages)`);
          }
        } else {
          addWelcomeMessage();
        }
      } else {
        addWelcomeMessage();
      }

      // Load user preferences for this personality
      await loadUserPreferences(user.id);

    } catch (error) {
      console.error('Error loading conversation history:', error);
      addWelcomeMessage();
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // Load user preferences for personalization
  const loadUserPreferences = async (userId: string) => {
    try {
      const { data: preferences } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', userId)
        .eq('personality_type', 'XspensesAI Assistant')
        .single();

      if (preferences) {
        setUserPreferences(preferences);
      }
    } catch (error) {
      console.error('Error loading user preferences:', error);
    }
  };

  // Add welcome message
  const addWelcomeMessage = () => {
    const welcomeMsg: Message = {
      id: 'welcome',
      type: 'assistant',
      content: "Hi 👋 I'm your XspensesAI assistant. Ask me anything about your transactions and financial insights!",
      timestamp: new Date(),
      personality: 'XspensesAI Assistant',
      catchphrase: ''
    };
    setMessages([welcomeMsg]);
  };

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

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          'x-user-id': user.id,
        },
        body: JSON.stringify({ 
          question: input.trim(),
          botName: 'XspensesAI Assistant',
          expertise: 'Financial Analysis & Personal Finance',
          conversationId: conversationId // Include conversation ID for continuity
        }),
      });

      if (!response.ok) throw new Error('Failed to get response');

      const { answer, personality, catchphrase, conversationId: newConversationId } = await response.json();

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: answer,
        timestamp: new Date(),
        personality: personality,
        catchphrase: catchphrase
      };

      const updatedMessages = [...newMessages, aiMessage];
      setMessages(updatedMessages);
      setCurrentPersonality(personality);
      setCurrentCatchphrase(catchphrase);

      // Update conversation ID if new
      if (newConversationId && !conversationId) {
        setConversationId(newConversationId);
      }

      // Update conversation context
      if (updatedMessages.length > 2) {
        setConversationContext(`Active conversation with XspensesAI Assistant (${updatedMessages.length} messages)`);
      }

      // Reload user preferences to see updated learning data
      await loadUserPreferences(user.id);

    } catch (error) {
      console.error('Chat error:', error);
      toast.error('Failed to get AI response');
    } finally {
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
                  <h3 className="font-bold text-lg">{currentPersonality}</h3>
                  <p className="text-xs text-white/80">Your Financial AI Companion</p>
                  {currentCatchphrase && (
                    <p className="text-xs text-white/90 mt-1 font-medium">"{currentCatchphrase}"</p>
                  )}
                </div>
              </div>
              
              <button
                onClick={() => setIsOpen(false)}
                className="text-white/80 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg relative z-10"
              >
                <X size={20} />
              </button>
            </div>

            {/* Conversation Context Indicator */}
            {conversationContext && (
              <div className="bg-gradient-to-r from-purple-50 to-blue-50 border-b border-purple-200 px-4 py-2">
                <div className="flex items-center gap-2 text-xs text-purple-700">
                  <MessageCircle size={14} />
                  <span className="font-medium">{conversationContext}</span>
                </div>
              </div>
            )}

            {/* User Preferences Display */}
            {userPreferences && userPreferences.interaction_count > 0 && (
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-b border-green-200 px-4 py-2">
                <div className="flex items-center justify-between text-xs text-green-700">
                  <div className="flex items-center gap-2">
                    <Clock size={14} />
                    <span>Learning from {userPreferences.interaction_count} interactions</span>
                  </div>
                  <span className="text-xs opacity-70">
                    {userPreferences.learning_data?.preferred_response_length || 'medium'} responses
                  </span>
                </div>
              </div>
            )}

            {/* Loading History Indicator */}
            {isLoadingHistory && (
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-200 px-4 py-2">
                <div className="flex items-center gap-2 text-xs text-blue-700">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                  <span>Loading conversation history...</span>
                </div>
              </div>
            )}

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
