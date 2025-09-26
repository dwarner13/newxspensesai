import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Send, 
  Bot, 
  Loader2,
  Mic,
  MicOff,
  Volume2,
  VolumeX
} from 'lucide-react';
import { EMPLOYEES } from '../../data/aiEmployees';

interface MobileChatbotModalProps {
  isOpen: boolean;
  onClose: () => void;
  employeeKey: string;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

const MobileChatbotModal: React.FC<MobileChatbotModalProps> = ({ 
  isOpen, 
  onClose, 
  employeeKey 
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const employee = EMPLOYEES.find(emp => emp.key === employeeKey);

  // Initialize with welcome message
  useEffect(() => {
    if (isOpen && employee && messages.length === 0) {
      const welcomeMessage: ChatMessage = {
        role: 'assistant',
        content: `Hello! I'm ${employee.name} ${employee.emoji}. ${employee.description} How can I help you today?`,
        timestamp: new Date().toLocaleTimeString()
      };
      setMessages([welcomeMessage]);
    }
  }, [isOpen, employee, messages.length]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (message: string) => {
    if (!message.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: message,
      timestamp: new Date().toLocaleTimeString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // Simulate AI response
    setTimeout(() => {
      const responses = [
        `I understand you're asking about "${message}". Let me help you with that using my specialized knowledge.`,
        `That's a great question! Based on my analysis, here's what I recommend...`,
        `I can definitely assist you with that. Let me provide you with some insights...`,
        `Thanks for reaching out! I'm here to help you with ${employee?.name || 'this topic'}. Here's what I think...`,
        `Excellent question! As your AI ${employee?.name || 'assistant'}, I'd suggest...`
      ];

      const aiResponse: ChatMessage = {
        role: 'assistant',
        content: responses[Math.floor(Math.random() * responses.length)],
        timestamp: new Date().toLocaleTimeString()
      };

      setMessages(prev => [...prev, aiResponse]);
      setIsLoading(false);
    }, 1500);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const toggleRecording = () => {
    setIsRecording(!isRecording);
    // Voice recording logic would go here
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  if (!employee) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ 
              type: 'spring', 
              damping: 25, 
              stiffness: 200,
              mass: 0.8
            }}
            className="fixed bottom-0 left-0 right-0 bg-[#0f172a] border-t border-white/10 rounded-t-2xl max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                  <span className="text-2xl">{employee.emoji}</span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">{employee.name}</h3>
                  <p className="text-sm text-white/60">AI Assistant</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition-all duration-300"
              >
                <X size={20} />
              </button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    message.role === 'user' 
                      ? 'bg-purple-500 text-white' 
                      : 'bg-white/10 text-white'
                  }`}>
                    <p className="text-sm">{message.content}</p>
                    <p className="text-xs opacity-60 mt-1">{message.timestamp}</p>
                  </div>
                </motion.div>
              ))}
              
              {isLoading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex justify-start"
                >
                  <div className="bg-white/10 rounded-2xl px-4 py-3 flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-white/60" />
                    <span className="text-sm text-white/60">Thinking...</span>
                  </div>
                </motion.div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-white/10">
              <form onSubmit={handleSubmit} className="flex items-center gap-2">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={`Ask ${employee.name} anything...`}
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:border-purple-500"
                    disabled={isLoading}
                  />
                </div>
                
                <button
                  type="button"
                  onClick={toggleRecording}
                  className={`p-3 rounded-xl transition-all duration-200 ${
                    isRecording 
                      ? 'bg-red-500 text-white' 
                      : 'bg-white/10 text-white/70 hover:text-white hover:bg-white/20'
                  }`}
                >
                  {isRecording ? <MicOff size={20} /> : <Mic size={20} />}
                </button>
                
                <button
                  type="button"
                  onClick={toggleMute}
                  className={`p-3 rounded-xl transition-all duration-200 ${
                    isMuted 
                      ? 'bg-red-500 text-white' 
                      : 'bg-white/10 text-white/70 hover:text-white hover:bg-white/20'
                  }`}
                >
                  {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                </button>
                
                <button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className="p-3 bg-purple-500 hover:bg-purple-600 disabled:bg-white/10 disabled:text-white/30 text-white rounded-xl transition-all duration-200"
                >
                  <Send size={20} />
                </button>
              </form>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default MobileChatbotModal;




