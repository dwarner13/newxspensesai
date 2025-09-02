import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Loader2, Mic, Headphones, Zap, Target, TrendingUp, Heart, DollarSign } from 'lucide-react';
import { UniversalAIController } from '../../services/UniversalAIController';

interface ChatMessage {
  id: number;
  type: 'user' | 'ai';
  content: string;
  employee?: string;
  actions?: any[];
  timestamp: Date;
}

interface UniversalChatInterfaceProps {
  employeeId: string;
  aiController: UniversalAIController;
  userId: string;
  onClose: () => void;
}

const employeeIcons: Record<string, React.ReactNode> = {
  'Byte': <Mic className="w-5 h-5" />,
  'Serenity': <Heart className="w-5 h-5" />,
  'Finley': <DollarSign className="w-5 h-5" />,
  'Goalie': <Target className="w-5 h-5" />,
  'Crystal': <TrendingUp className="w-5 h-5" />,
  'Tag': <Zap className="w-5 h-5" />,
  'Blitz': <Zap className="w-5 h-5" />,
  'Wisdom': <TrendingUp className="w-5 h-5" />,
  'Fortune': <DollarSign className="w-5 h-5" />,
  'Savage Sally': <Heart className="w-5 h-5" />,
  'Harmony': <Heart className="w-5 h-5" />,
  'Automa': <Zap className="w-5 h-5" />,
  'Spark': <Zap className="w-5 h-5" />,
  'Intelia': <TrendingUp className="w-5 h-5" />,
  'Ledger': <DollarSign className="w-5 h-5" />,
  'Dash': <TrendingUp className="w-5 h-5" />,
  'Nova': <Zap className="w-5 h-5" />,
  'DJ Zen': <Headphones className="w-5 h-5" />
};

export function UniversalChatInterface({ employeeId, aiController, userId, onClose }: UniversalChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const employee = aiController.getEmployee(employeeId);

  useEffect(() => {
    initializeChat();
  }, [employeeId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const initializeChat = async () => {
    if (!employee) return;
    
    setIsInitializing(true);
    
    try {
      const greeting = await aiController.chatWithEmployee(
        employeeId,
        "Hi! I'd like to start our conversation.",
        userId
      );

      setMessages([{
        id: Date.now(),
        type: 'ai',
        content: greeting.response,
        employee: greeting.employee,
        timestamp: new Date()
      }]);
    } catch (error) {
      console.error('Error initializing chat:', error);
      setMessages([{
        id: Date.now(),
        type: 'ai',
        content: `Hello! I'm ${employee.name}, your ${employee.specialty} specialist. How can I help you today?`,
        employee: employee.name,
        timestamp: new Date()
      }]);
    } finally {
      setIsInitializing(false);
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || isTyping) return;

    const userMessage: ChatMessage = {
      id: Date.now(),
      type: 'user',
      content: inputMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsTyping(true);

    try {
      const response = await aiController.chatWithEmployee(
        employeeId,
        inputMessage,
        userId,
        messages.map(m => ({ role: m.type === 'user' ? 'user' : 'assistant', content: m.content }))
      );

      const aiMessage: ChatMessage = {
        id: Date.now() + 1,
        type: 'ai',
        content: response.response,
        employee: response.employee,
        actions: response.actions,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMessage]);
      
      // Handle any actions the AI wants to take
      if (response.actions && response.actions.length > 0) {
        handleAIActions(response.actions);
      }

    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: ChatMessage = {
        id: Date.now() + 1,
        type: 'ai',
        content: `Sorry, I'm having a moment! ${employee?.name} will be back shortly. Try again?`,
        employee: employee?.name,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    }

    setIsTyping(false);
  };

  const handleAIActions = async (actions: any[]) => {
    for (const action of actions) {
      switch (action.type) {
        case 'process_document':
          await processDocument(action.data);
          break;
        case 'create_category':
          await createCategory(action.data);
          break;
        case 'set_goal':
          await setGoal(action.data);
          break;
        case 'generate_report':
          await generateReport(action.data);
          break;
      }
    }
  };

  const processDocument = async (data: any) => {
    // Handle document processing action
    console.log('Processing document:', data);
  };

  const createCategory = async (data: any) => {
    // Handle category creation action
    console.log('Creating category:', data);
  };

  const setGoal = async (data: any) => {
    // Handle goal setting action
    console.log('Setting goal:', data);
  };

  const generateReport = async (data: any) => {
    // Handle report generation action
    console.log('Generating report:', data);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!employee) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6">
          <p>Employee not found</p>
          <button onClick={onClose} className="mt-4 px-4 py-2 bg-gray-500 text-white rounded">
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col overflow-hidden">
        {/* Chat Header */}
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-white">
              {employeeIcons[employee.name] || <Mic className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-white font-semibold text-lg">{employee.name}</h3>
              <span className="text-orange-100 text-sm">{employee.specialty}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {isInitializing ? (
            <div className="flex items-center justify-center h-full">
              <div className="flex items-center space-x-3 text-gray-500">
                <Loader2 className="w-6 h-6 animate-spin" />
                <span>Connecting to {employee.name}...</span>
              </div>
            </div>
          ) : (
            <AnimatePresence>
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    message.type === 'user'
                      ? 'bg-orange-500 text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}>
                    <div className="whitespace-pre-wrap">{message.content}</div>
                    
                    {message.actions && message.actions.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {message.actions.map((action, index) => (
                          <button
                            key={index}
                            className="block w-full text-left px-3 py-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors text-sm"
                            onClick={() => handleAIActions([action])}
                          >
                            {action.label || `Execute ${action.type}`}
                          </button>
                        ))}
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between mt-2 text-xs opacity-70">
                      {message.employee && (
                        <span className="font-medium">{message.employee}</span>
                      )}
                      <span>{message.timestamp.toLocaleTimeString()}</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
          
          {isTyping && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-start"
            >
              <div className="bg-gray-100 text-gray-900 rounded-2xl px-4 py-3">
                <div className="flex items-center space-x-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{employee.name} is typing</span>
                  <div className="flex space-x-1">
                    <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Chat Input */}
        <div className="border-t border-gray-200 p-4">
          <div className="flex space-x-3">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={`Chat with ${employee.name}...`}
              className="flex-1 border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              disabled={isTyping || isInitializing}
            />
            <button
              onClick={sendMessage}
              disabled={!inputMessage.trim() || isTyping || isInitializing}
              className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl px-6 py-3 transition-colors flex items-center space-x-2"
            >
              <Send className="w-5 h-5" />
              <span>Send</span>
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
