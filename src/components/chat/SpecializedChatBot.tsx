import { useState, useRef, useEffect } from 'react';
import { Send, X, MessageSquare, Sparkles, Clock, MessageCircle, Users, TrendingUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

interface Message {
  id: string;
  type: 'user' | 'assistant' | 'team';
  content: string;
  timestamp: Date;
  personality?: string;
  catchphrase?: string;
  financialInsights?: string[];
  consultations?: any[];
}

interface SpecializedChatBotProps {
  name: string;
  expertise: string;
  avatar: string;
  welcomeMessage: string;
  color?: string;
}

// Financial Insight Card Component
const FinancialInsightCard = ({ insights, personality }: { insights: string[], personality: string }) => {
  if (!insights || insights.length === 0) return null;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="financial-insights-card"
    >
      <div className="insight-header">
        <span className="insight-icon">📊</span>
        <h4>{personality} noticed:</h4>
      </div>
      <div className="insights-list">
        {insights.map((insight, index) => (
          <div key={index} className="insight-item">
            <span className="insight-bullet">•</span>
            <span className="insight-text">{insight}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

// Team Consultation Display Component
const TeamConsultationDisplay = ({ consultations }: { consultations: any[] }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    className="team-consultation"
  >
    <div className="team-header">
      <span className="team-icon">🤝</span>
      <h4>Team Consultation</h4>
    </div>
    <div className="consultations-grid">
      {consultations.map((consultation, index) => (
        <div key={index} className="consultation-card">
          <div className="consultant-header">
            <span className="consultant-emoji">{consultation.emoji}</span>
            <span className="consultant-name">{consultation.personality}</span>
          </div>
          <p className="consultation-advice">{consultation.advice}</p>
        </div>
      ))}
    </div>
  </motion.div>
);

const SpecializedChatBot: React.FC<SpecializedChatBotProps> = ({
  name,
  expertise,
  avatar,
  welcomeMessage,
  color = "indigo"
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [currentPersonality, setCurrentPersonality] = useState<string>('');
  const [currentCatchphrase, setCurrentCatchphrase] = useState<string>('');
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [conversationContext, setConversationContext] = useState<string>('');
  const [userPreferences, setUserPreferences] = useState<any>(null);
  const [includeFinancialData, setIncludeFinancialData] = useState(true);
  const [isRequestingTeam, setIsRequestingTeam] = useState(false);
  const [lastUserMessage, setLastUserMessage] = useState<string>('');
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
      // In development mode, use fake user; in production, get from Supabase
      let user;
      if (import.meta.env.DEV) {
        // Development mode - use fake user with valid UUID format
        user = { id: '00000000-0000-0000-0000-000000000000', email: 'dev@example.com' };
      } else {
        // Production mode - get from Supabase
        const { data: { user: supabaseUser } } = await supabase.auth.getUser();
        if (!supabaseUser) {
          addWelcomeMessage();
          return;
        }
        user = supabaseUser;
      }

      setIsLoadingHistory(true);

      // Try to find existing conversation
      const { data: existingConversation } = await supabase
        .from('conversations')
        .select('*')
        .eq('user_id', user.id)
        .eq('personality_type', name)
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
            personality: msg.metadata?.personality || name,
            catchphrase: msg.metadata?.catchphrase || '',
            financialInsights: msg.metadata?.financialInsights || []
          }));
          setMessages(loadedMessages);
          
          // Set conversation context
          if (loadedMessages.length > 2) {
            setConversationContext(`Continuing conversation with ${name} (${loadedMessages.length} messages)`);
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
        .eq('personality_type', name)
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
      content: welcomeMessage,
      timestamp: new Date(),
      personality: name,
      catchphrase: ''
    };
    setMessages([welcomeMsg]);
  };

  // Request team consultation
  const requestTeamConsultation = async (query: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Please log in to use team consultation');
        return;
      }

      setIsRequestingTeam(true);
      
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-team-consultation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userQuery: query,
          userId: user.id,
          primaryPersonality: name
        }),
      });
      
      if (!response.ok) throw new Error('Team consultation failed');
      
      const teamData = await response.json();
      
      // Add team consultation to chat
      const teamMessage: Message = {
        id: Date.now().toString(),
        type: 'team',
        content: `**Team Consultation Results**\n\n**Your Question:** ${teamData.userQuery}\n\n**Team Summary:** ${teamData.teamSummary}`,
        timestamp: new Date(),
        consultations: teamData.consultations
      };
      
      setMessages(prev => [...prev, teamMessage]);
      toast.success('Team consultation complete!');
      
    } catch (error) {
      console.error('Team consultation failed:', error);
      toast.error('Team consultation failed. Please try again.');
    } finally {
      setIsRequestingTeam(false);
    }
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
    setLastUserMessage(input.trim());
    setInput('');
    setIsLoading(true);

    try {
      // In development mode, use fake user; in production, get from Supabase
      let user;
      if (import.meta.env.DEV) {
        // Development mode - use fake user with valid UUID format
        user = { id: '00000000-0000-0000-0000-000000000000', email: 'dev@example.com' };
      } else {
        // Production mode - get from Supabase
        const { data: { user: supabaseUser } } = await supabase.auth.getUser();
        if (!supabaseUser) throw new Error('User not authenticated');
        user = supabaseUser;
      }

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          'x-user-id': user.id,
          'x-openai-key': import.meta.env.VITE_OPENAI_API_KEY,
        },
        body: JSON.stringify({ 
          question: input.trim(),
          botName: name,
          expertise: expertise,
          conversationId: conversationId, // Include conversation ID for continuity
          includeFinancialData: includeFinancialData, // Include financial data option
          userId: user.id // Include user ID for personalization
        }),
      });

      if (!response.ok) throw new Error('Failed to get response');

      const { answer, personality, catchphrase, conversationId: newConversationId, financialInsights } = await response.json();

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: answer,
        timestamp: new Date(),
        personality: personality,
        catchphrase: catchphrase,
        financialInsights: financialInsights
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
        setConversationContext(`Active conversation with ${name} (${updatedMessages.length} messages)`);
      }

      // Reload user preferences to see updated learning data
      await loadUserPreferences(user.id);

    } catch (error) {
      console.error('Chat error:', error);
      toast.error('Failed to get response. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const getColorClasses = () => {
    switch (color) {
      case 'blue': return 'bg-blue-600 hover:bg-blue-700';
      case 'green': return 'bg-green-600 hover:bg-green-700';
      case 'purple': return 'bg-purple-600 hover:bg-purple-700';
      case 'pink': return 'bg-pink-600 hover:bg-pink-700';
      case 'orange': return 'bg-orange-600 hover:bg-orange-700';
      case 'red': return 'bg-red-600 hover:bg-red-700';
      case 'indigo': return 'bg-indigo-600 hover:bg-indigo-700';
      case 'teal': return 'bg-teal-600 hover:bg-teal-700';
      case 'yellow': return 'bg-yellow-600 hover:bg-yellow-700';
      case 'gray': return 'bg-gray-600 hover:bg-gray-700';
      default: return 'bg-primary-600 hover:bg-primary-700';
    }
  };

  return (
    <>
      {/* Floating Chat Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-20 sm:bottom-6 right-6 z-50 p-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110"
          style={{ zIndex: 1000 }}
        >
          <div className="text-2xl">{avatar}</div>
        </button>
      )}

      {/* Chat Interface */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6" style={{ zIndex: 1000 }}>
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/20 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Chat Window */}
          <div className="relative w-full max-w-sm sm:max-w-md lg:max-w-lg xl:max-w-xl h-[450px] sm:h-[550px] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-4 rounded-t-2xl flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="text-2xl">{avatar}</div>
                  <div>
                    <h3 className="font-semibold text-lg">{name}</h3>
                    <p className="text-indigo-100 text-sm">{expertise}</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-white/80 hover:text-white transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Options */}
            <div className="p-4 border-b border-gray-100 bg-gray-50 flex-shrink-0">
              <div className="flex items-center justify-between">
                <label className="flex items-center space-x-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={includeFinancialData}
                    onChange={(e) => setIncludeFinancialData(e.target.checked)}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Financial insights</span>
                </label>
                <button
                  onClick={() => requestTeamConsultation(lastUserMessage)}
                  className="px-3 py-1.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-sm rounded-lg hover:shadow-lg transition-all duration-200 hover:scale-105"
                  disabled={isRequestingTeam || !lastUserMessage}
                >
                  {isRequestingTeam ? '🤝 Consulting team...' : '🤝 Ask the team'}
                </button>
              </div>
            </div>

            {/* Conversation Context Indicator */}
            {conversationContext && (
              <div className="bg-gradient-to-r from-purple-50 to-blue-50 border-b border-purple-200 px-4 py-2 flex-shrink-0">
                <div className="flex items-center gap-2 text-xs text-purple-700">
                  <MessageCircle size={14} />
                  <span className="font-medium">{conversationContext}</span>
                </div>
              </div>
            )}

            {/* User Preferences Display */}
            {userPreferences && userPreferences.interaction_count > 0 && (
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-b border-green-200 px-4 py-2 flex-shrink-0">
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
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-200 px-4 py-2 flex-shrink-0">
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
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-gray-50 to-white min-h-0">
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 shadow-sm ${
                      message.type === 'user'
                        ? `${getColorClasses()} text-white`
                        : 'bg-white border-2 border-gray-500 shadow-2xl'
                    }`}
                    style={message.type === 'assistant' ? { color: '#000000' } : {}}
                  >
                    <p className="text-sm leading-relaxed font-bold" style={message.type === 'assistant' ? { color: '#000000' } : {}}>{message.content}</p>
                    
                    {/* Add financial insights for AI messages */}
                    {message.type === 'assistant' && message.financialInsights && (
                      <FinancialInsightCard 
                        insights={message.financialInsights} 
                        personality={message.personality || name} 
                      />
                    )}
                    
                    {/* Add team consultation display */}
                    {message.type === 'team' && message.consultations && (
                      <TeamConsultationDisplay consultations={message.consultations} />
                    )}
                    
                    <p className="text-xs text-gray-900 mt-2 font-bold">
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
                  <div className="bg-white text-black border-2 border-gray-400 px-4 py-3 rounded-2xl shadow-xl">
                    <div className="flex items-center space-x-3">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                      <span className="text-sm text-gray-800 font-bold">{name} is thinking...</span>
                    </div>
                  </div>
                </motion.div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Enhanced Input Form */}
            <form onSubmit={handleSubmit} className="border-t border-gray-200 p-4 bg-white flex-shrink-0">
              <div className="flex space-x-3">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={`Ask ${name} anything...`}
                  className="flex-1 resize-none rounded-xl border border-gray-300 p-3 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 placeholder-gray-400"
                  rows={1}
                  disabled={isLoading}
                />
                <motion.button
                  type="submit"
                  disabled={isLoading || !input.trim()}
                  className={`${getColorClasses()} text-white p-3 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl`}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Send size={20} />
                </motion.button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add CSS for new components */}
      <style jsx>{`
        .chat-controls {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 16px;
          background: rgba(255, 255, 255, 0.05);
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .financial-toggle {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          color: #94a3b8;
        }

        .team-consultation-btn {
          background: linear-gradient(135deg, #22c55e, #3b82f6);
          color: white;
          border: none;
          border-radius: 6px;
          padding: 6px 12px;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .team-consultation-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(34, 197, 94, 0.3);
        }

        .team-consultation-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        .financial-insights-card {
          background: linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(6, 182, 212, 0.1));
          border: 1px solid rgba(139, 92, 246, 0.2);
          border-radius: 12px;
          padding: 16px;
          margin-top: 12px;
        }

        .insight-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 12px;
        }

        .insight-header h4 {
          color: #8b5cf6;
          margin: 0;
          font-size: 14px;
          font-weight: 600;
        }

        .insights-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .insight-item {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          font-size: 13px;
          color: #000000 !important;
          font-weight: 700 !important;
        }

        .team-consultation {
          background: linear-gradient(135deg, rgba(34, 197, 94, 0.1), rgba(59, 130, 246, 0.1));
          border: 1px solid rgba(34, 197, 94, 0.2);
          border-radius: 12px;
          padding: 16px;
          margin-top: 12px;
        }

        .team-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 12px;
        }

        .team-header h4 {
          color: #22c55e;
          margin: 0;
          font-size: 14px;
          font-weight: 600;
        }

        .consultations-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 12px;
          margin-top: 12px;
        }

        .consultation-card {
          background: rgba(255, 255, 255, 0.5);
          border-radius: 8px;
          padding: 12px;
        }

        .consultant-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
        }

        .consultant-name {
          font-weight: 600;
          font-size: 13px;
          color: #374151;
        }

        .consultation-advice {
          font-size: 13px;
          color: #6b7280;
          margin: 0;
          line-height: 1.4;
        }
        
        /* Force dark text for all AI messages */
        .financial-insights-card * {
          color: #000000 !important;
        }
        
        .financial-insights-card .insight-item {
          color: #000000 !important;
          font-weight: 700 !important;
        }
        
        .financial-insights-card .insight-text {
          color: #000000 !important;
          font-weight: 700 !important;
        }
        
        /* Additional specificity to override any remaining conflicts */
        .financial-insights-card .insight-item span {
          color: #000000 !important;
          font-weight: 700 !important;
        }
        
        .financial-insights-card .insight-bullet {
          color: #000000 !important;
          font-weight: 700 !important;
        }
      `}</style>
    </>
  );
};

export default SpecializedChatBot; 