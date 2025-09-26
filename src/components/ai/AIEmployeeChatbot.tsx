import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, Send, X, Loader2 } from 'lucide-react';
import { useAIMemory } from '../../hooks/useAIMemory';
import { EMPLOYEES } from '../../data/aiEmployees';

interface ChatMessage {
  id: string;
  role: 'user' | 'ai';
  content: string;
  timestamp: string;
}

interface AIEmployeeChatbotProps {
  employeeKey: string;
  position?: 'floating' | 'inline';
  showProgress?: boolean;
  customTitle?: string;
  customDescription?: string;
}

const AIEmployeeChatbot: React.FC<AIEmployeeChatbotProps> = ({
  employeeKey,
  position = 'floating',
  showProgress = true,
  customTitle,
  customDescription
}) => {
  const { 
    createTask, 
    addMessage, 
    currentTask, 
    conversation
  } = useAIMemory(employeeKey);

  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const employee = EMPLOYEES.find(emp => emp.key === employeeKey);

  // Sync with AI memory system
  useEffect(() => {
    if (conversation && conversation.messages.length > 0) {
      const lastMessage = conversation.messages[conversation.messages.length - 1];
      if (lastMessage.role === 'ai' && !chatMessages.some(m => m.content === lastMessage.content)) {
        setChatMessages(prev => [...prev, {
          id: `memory-${Date.now()}`,
          role: 'ai',
          content: lastMessage.content,
          timestamp: lastMessage.timestamp
        }]);
      }
    }
  }, [conversation, chatMessages]);

  // Handle chat with AI employee
  const handleChatWithAI = async (message: string) => {
    if (!message.trim()) return;

    // Add user message
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: message,
      timestamp: new Date().toISOString()
    };
    setChatMessages(prev => [...prev, userMessage]);
    
    // Add to AI memory system
    addMessage('user', message);

    setIsLoading(true);

    // Simulate AI response based on employee and current task
    setTimeout(() => {
      let response = '';
      
      if (currentTask && currentTask.status === 'in_progress') {
        const progress = Math.round(currentTask.progress);
        response = generateTaskResponse(employeeKey, progress, message);
      } else {
        response = generateGeneralResponse(employeeKey, message);
      }

      const aiMessage: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: 'ai',
        content: response,
        timestamp: new Date().toISOString()
      };
      setChatMessages(prev => [...prev, aiMessage]);
      
      // Add to AI memory system
      addMessage('ai', response);
      setIsLoading(false);
    }, 1500);
  };

  const generateTaskResponse = (empKey: string, progress: number, userMessage: string): string => {
    const responses = {
      byte: `I'm currently processing your documents (${progress}% complete)! ${userMessage.toLowerCase().includes('progress') ? 
        `Here's what I'm doing: extracting transaction data, categorizing expenses, and validating amounts. I should be done in a few more minutes!` :
        `I can chat while I work! What would you like to know about the processing?`}`,
      
      tag: `I'm categorizing transactions (${progress}% complete)! ${userMessage.toLowerCase().includes('category') ? 
        `I'm analyzing patterns and applying smart rules to organize your expenses. Almost done!` :
        `I'm working on organizing your transactions. What would you like to know about categorization?`}`,
      
      crystal: `I'm analyzing trends (${progress}% complete)! ${userMessage.toLowerCase().includes('trend') ? 
        `I'm processing data patterns and forecasting future spending behaviors. The insights are coming together!` :
        `I'm deep in analysis mode. What trends are you curious about?`}`,
      
      intelia: `I'm generating business insights (${progress}% complete)! ${userMessage.toLowerCase().includes('insight') ? 
        `I'm synthesizing data into strategic recommendations and KPI analysis. Almost ready with the report!` :
        `I'm working on strategic analysis. What business questions can I help answer?`}`,
      
      ledger: `I'm processing tax data (${progress}% complete)! ${userMessage.toLowerCase().includes('tax') ? 
        `I'm organizing receipts, calculating deductions, and preparing tax documentation. Almost finished!` :
        `I'm working on tax optimization. What tax questions do you have?`}`,
      
      chime: `I'm managing bill reminders (${progress}% complete)! ${userMessage.toLowerCase().includes('bill') ? 
        `I'm tracking due dates, setting up alerts, and optimizing payment schedules. Almost done!` :
        `I'm working on bill management. What bills need attention?`}`,
      
      dash: `I'm analyzing performance metrics (${progress}% complete)! ${userMessage.toLowerCase().includes('metric') ? 
        `I'm processing KPIs, generating reports, and identifying optimization opportunities. Almost ready!` :
        `I'm working on analytics. What metrics are you interested in?`}`
    };

    return responses[empKey as keyof typeof responses] || `I'm working on your request (${progress}% complete)! What can I help you with?`;
  };

  const generateGeneralResponse = (empKey: string, userMessage: string): string => {
    const responses = {
      byte: `Hey! I'm Byte, your document processing wizard! 📄 I can handle PDFs, CSVs, receipts, and more with 99.7% accuracy. What would you like to upload today?`,
      
      tag: `Hi! I'm Tag, your categorization specialist! 🏷️ I automatically organize your transactions with smart rules and pattern recognition. What categories need attention?`,
      
      crystal: `Hello! I'm Crystal, your trend analysis expert! 🔮 I forecast spending patterns and predict future behaviors. What trends are you curious about?`,
      
      intelia: `Greetings! I'm Intelia, your business intelligence strategist! 🧠 I provide strategic insights and KPI analysis. What business questions can I help answer?`,
      
      ledger: `Hi there! I'm Ledger, your tax optimization specialist! 📊 I help organize receipts, calculate deductions, and prepare tax documentation. What tax needs do you have?`,
      
      chime: `Hello! I'm Chime, your bill management assistant! 🔔 I track due dates, set up reminders, and optimize payment schedules. What bills need attention?`,
      
      dash: `Hey! I'm Dash, your analytics expert! 📈 I analyze performance metrics, generate reports, and identify optimization opportunities. What metrics interest you?`
    };

    return responses[empKey as keyof typeof responses] || `Hello! I'm here to help. What can I assist you with today?`;
  };

  const getEmployeeEmoji = (empKey: string): string => {
    const emojis = {
      byte: '📄',
      tag: '🏷️',
      crystal: '🔮',
      intelia: '🧠',
      ledger: '📊',
      chime: '🔔',
      dash: '📈'
    };
    return emojis[empKey as keyof typeof emojis] || '🤖';
  };

  const getEmployeeColor = (empKey: string): string => {
    const colors = {
      byte: 'from-blue-500 to-purple-500',
      tag: 'from-yellow-500 to-orange-500',
      crystal: 'from-purple-500 to-pink-500',
      intelia: 'from-blue-500 to-cyan-500',
      ledger: 'from-green-500 to-emerald-500',
      chime: 'from-orange-500 to-red-500',
      dash: 'from-indigo-500 to-purple-500'
    };
    return colors[empKey as keyof typeof colors] || 'from-gray-500 to-gray-600';
  };

  if (position === 'inline') {
    return (
      <div className="bg-white/5 rounded-xl border border-white/10 p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className={`w-10 h-10 bg-gradient-to-r ${getEmployeeColor(employeeKey)} rounded-full flex items-center justify-center`}>
            <span className="text-white text-lg">{getEmployeeEmoji(employeeKey)}</span>
          </div>
          <div>
            <h3 className="text-white font-semibold">{customTitle || employee?.name}</h3>
            <p className="text-white/60 text-sm">{customDescription || employee?.short}</p>
          </div>
        </div>
        
        <button
          onClick={() => setShowChat(true)}
          className="w-full bg-gradient-to-r from-blue-500 to-purple-500 text-white py-2 rounded-lg font-medium hover:opacity-90 transition-all flex items-center justify-center gap-2"
        >
          <MessageCircle className="w-4 h-4" />
          Chat with {employee?.name}
        </button>
      </div>
    );
  }

  return (
    <>
      {/* Floating Chat Button */}
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setShowChat(true)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center group"
      >
        <MessageCircle className="w-6 h-6 text-white" />
        {currentTask && currentTask.status === 'in_progress' && (
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full animate-pulse"></div>
        )}
      </motion.button>

      {/* Chat Modal */}
      <AnimatePresence>
        {showChat && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowChat(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-slate-900 rounded-2xl border border-white/10 w-full max-w-md h-[500px] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Chat Header */}
              <div className="flex items-center justify-between p-4 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 bg-gradient-to-r ${getEmployeeColor(employeeKey)} rounded-full flex items-center justify-center`}>
                    <span className="text-white text-lg">{getEmployeeEmoji(employeeKey)}</span>
                  </div>
                  <div>
                    <h3 className="text-white font-semibold">{employee?.name}</h3>
                    <p className="text-white/60 text-sm">
                      {currentTask ? `Working (${Math.round(currentTask.progress)}%)` : 'Ready to help'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowChat(false)}
                  className="p-1 hover:bg-white/10 rounded transition-colors"
                >
                  <X className="w-5 h-5 text-white/60" />
                </button>
              </div>

              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {chatMessages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                        message.role === 'user'
                          ? 'bg-blue-500 text-white'
                          : 'bg-white/10 text-white border border-white/20'
                      }`}
                    >
                      <p className="text-sm">{message.content}</p>
                      <p className="text-xs opacity-60 mt-1">
                        {new Date(message.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Current Task Progress */}
              {showProgress && currentTask && currentTask.status === 'in_progress' && (
                <div className="px-4 py-3 border-t border-white/10 bg-gradient-to-r from-blue-500/5 to-purple-500/5">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                      <span className="text-white text-sm font-medium">{currentTask.title}</span>
                    </div>
                    <span className="text-blue-400 text-sm font-bold">{Math.round(currentTask.progress)}%</span>
                  </div>
                  
                  <div className="w-full bg-white/10 rounded-full h-2 mb-2">
                    <motion.div
                      className={`bg-gradient-to-r ${getEmployeeColor(employeeKey)} h-2 rounded-full`}
                      style={{ width: `${currentTask.progress}%` }}
                      initial={{ width: 0 }}
                      animate={{ width: `${currentTask.progress}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                  
                  <p className="text-white/60 text-xs">
                    {currentTask.description}
                  </p>
                </div>
              )}

              {/* Chat Input */}
              <div className="p-4 border-t border-white/10">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !isLoading) {
                        handleChatWithAI(chatInput);
                        setChatInput('');
                      }
                    }}
                    placeholder={currentTask ? "Ask about the work..." : `Ask ${employee?.name} anything...`}
                    className="flex-1 bg-white/5 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-sm"
                    disabled={isLoading}
                  />
                  <button
                    onClick={() => {
                      handleChatWithAI(chatInput);
                      setChatInput('');
                    }}
                    disabled={isLoading || !chatInput.trim()}
                    className="bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg px-3 py-2 transition-colors"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default AIEmployeeChatbot;




