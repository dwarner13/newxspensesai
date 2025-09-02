import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Send, Loader2, Mic, Upload, Camera, FileText, 
  Paperclip, Image, FileSpreadsheet, File, AlertCircle,
  CheckCircle, Sparkles, Heart, Target, TrendingUp, 
  DollarSign, Zap, Brain, Award, Calculator, Building2,
  Music, Headphones, Eye, EyeOff, Volume2, VolumeX,
  ChevronLeft, MoreVertical, Settings
} from 'lucide-react';
import { UniversalAIController } from '../../services/UniversalAIController';
import { PersonalityHeader } from './PersonalityHeader';
import { QuickActionButtons, employeeActionSets } from './QuickActionButtons';
import { DocumentUploadZone } from './DocumentUploadZone';

interface ChatMessage {
  id: number;
  type: 'user' | 'ai' | 'system';
  content: string;
  employee?: string;
  actions?: any[];
  timestamp: Date;
  attachments?: FileAttachment[];
  processing?: boolean;
}

interface FileAttachment {
  id: string;
  name: string;
  type: string;
  size: number;
  status: 'uploading' | 'processing' | 'completed' | 'error';
  progress?: number;
  url?: string;
}

interface MobileChatInterfaceProps {
  employeeId: string;
  aiController: UniversalAIController;
  userId: string;
  onClose: () => void;
}

// Employee personality configurations for mobile
const employeePersonalities: Record<string, any> = {
  'smart-import': {
    id: 'smart-import',
    name: 'Byte',
    specialty: 'Smart Import AI',
    icon: <FileText className="w-5 h-5" />,
    color: 'from-green-500 to-emerald-600',
    greeting: "Ooh, what document treasure did you bring me today? I'm practically bouncing with excitement to organize this beautiful data!",
    uploadMessage: "YES! This is going to be such a beautiful data transformation!",
    placeholder: "Ask Byte about organizing your financial documents...",
    catchphrases: ["Data organization is my passion!", "I love turning chaos into order!", "This is going to be so satisfying!"],
    status: 'online'
  },
  'financial-assistant': {
    id: 'financial-assistant',
    name: 'Finley',
    specialty: 'AI Financial Assistant',
    icon: <DollarSign className="w-5 h-5" />,
    color: 'from-blue-500 to-indigo-600',
    greeting: "Hey there! I'm Finley, your always-on financial sidekick. What money questions can I help you tackle today?",
    uploadMessage: "Perfect! Let me analyze this and give you specific recommendations.",
    placeholder: "Ask Finley about budgeting, investing, debt, or any financial topic...",
    catchphrases: ["Let's make your money work smarter!", "I'm here to help you win financially!", "Smart money moves ahead!"],
    status: 'online'
  },
  'financial-therapist': {
    id: 'financial-therapist',
    name: 'Serenity',
    specialty: 'AI Financial Therapist',
    icon: <Heart className="w-5 h-5" />,
    color: 'from-pink-500 to-rose-600',
    greeting: "Hello, dear. I sense you might need some gentle support with your financial journey. I'm here to listen and help you find peace with your money relationship.",
    uploadMessage: "Thank you for trusting me with this. Let's explore what your spending patterns reveal about your emotional needs.",
    placeholder: "Share your feelings about money, ask for support, or explore your financial emotions...",
    catchphrases: ["You're not alone in this journey", "Financial peace is possible", "Let's heal your money relationship"],
    status: 'online'
  },
  'goal-concierge': {
    id: 'goal-concierge',
    name: 'Goalie',
    specialty: 'AI Goal Concierge',
    icon: <Target className="w-5 h-5" />,
    color: 'from-purple-500 to-violet-600',
    greeting: "Champion! Ready to tackle some financial goals? I love helping people turn their money dreams into victory stories!",
    uploadMessage: "Excellent! Let me analyze your current position and create a championship-level game plan!",
    placeholder: "Tell Goalie about your financial goals and dreams...",
    catchphrases: ["Victory is within reach!", "Every goal is achievable!", "Let's make it happen!"],
    status: 'online'
  },
  'spending-predictions': {
    id: 'spending-predictions',
    name: 'Crystal',
    specialty: 'Spending Predictions AI',
    icon: <TrendingUp className="w-5 h-5" />,
    color: 'from-cyan-500 to-blue-600',
    greeting: "Ahh, the financial spirits whisper interesting things about your future... I see patterns and possibilities swirling around your money story.",
    uploadMessage: "The data spirits are speaking... I see fascinating patterns in your financial timeline!",
    placeholder: "Ask Crystal about your financial future and spending patterns...",
    catchphrases: ["The future is written in your data", "Patterns reveal destiny", "I see what's coming"],
    status: 'online'
  },
  'categorization': {
    id: 'categorization',
    name: 'Tag',
    specialty: 'AI Categorization',
    icon: <Brain className="w-5 h-5" />,
    color: 'from-orange-500 to-red-600',
    greeting: "Perfect timing! I've been analyzing some fascinating spending patterns and I'm practically bouncing with excitement to share what I found!",
    uploadMessage: "OH YES! This is going to be such a satisfying categorization project!",
    placeholder: "Ask Tag about organizing and categorizing your expenses...",
    catchphrases: ["Organization is my superpower!", "I love perfect categorization!", "Let's make it beautiful!"],
    status: 'online'
  }
};

export function MobileChatInterface({ employeeId, aiController, userId, onClose }: MobileChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(true);
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false);
  const [showUploadZone, setShowUploadZone] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const employee = employeePersonalities[employeeId];
  const aiEmployee = aiController.getEmployee(employeeId);
  const quickActions = employeeActionSets[employeeId] || [];

  useEffect(() => {
    initializeChat();
  }, [employeeId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle mobile keyboard
  useEffect(() => {
    const handleResize = () => {
      const viewportHeight = window.visualViewport?.height || window.innerHeight;
      const windowHeight = window.innerHeight;
      const keyboardHeight = windowHeight - viewportHeight;
      setKeyboardHeight(keyboardHeight);
    };

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleResize);
      return () => window.visualViewport?.removeEventListener('resize', handleResize);
    }
  }, []);

  const initializeChat = async () => {
    if (!employee || !aiEmployee) return;
    
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
        content: greeting.response || employee.greeting,
        employee: employee.name,
        timestamp: new Date()
      }]);
    } catch (error) {
      console.error('Error initializing chat:', error);
      setMessages([{
        id: Date.now(),
        type: 'ai',
        content: employee.greeting,
        employee: employee.name,
        timestamp: new Date()
      }]);
    } finally {
      setIsInitializing(false);
    }
  };

  const sendMessage = async (messageText?: string) => {
    const textToSend = messageText || inputMessage;
    if (!textToSend.trim() || isTyping) return;

    const userMessage: ChatMessage = {
      id: Date.now(),
      type: 'user',
      content: textToSend,
      timestamp: new Date(),
      attachments: attachments.length > 0 ? attachments : undefined
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setAttachments([]);
    setShowQuickActions(false);
    setShowUploadZone(false);
    setIsTyping(true);

    try {
      const response = await aiController.chatWithEmployee(
        employeeId,
        textToSend,
        userId,
        messages.map(m => ({ role: m.type === 'user' ? 'user' : 'assistant', content: m.content }))
      );

      const aiMessage: ChatMessage = {
        id: Date.now() + 1,
        type: 'ai',
        content: response.response,
        employee: employee.name,
        actions: response.actions,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMessage]);
      
      if (response.actions && response.actions.length > 0) {
        handleAIActions(response.actions);
      }

    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: ChatMessage = {
        id: Date.now() + 1,
        type: 'ai',
        content: `Sorry, I'm having a moment! ${employee.name} will be back shortly. Try again?`,
        employee: employee.name,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    }

    setIsTyping(false);
  };

  const handleQuickAction = (action: any) => {
    sendMessage(action.prompt);
  };

  const handleFileUpload = async (files: FileList) => {
    if (!files.length) return;

    setIsUploading(true);
    const newAttachments: FileAttachment[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const attachment: FileAttachment = {
        id: `${Date.now()}-${i}`,
        name: file.name,
        type: file.type,
        size: file.size,
        status: 'uploading',
        progress: 0
      };

      newAttachments.push(attachment);
      setAttachments(prev => [...prev, attachment]);

      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setAttachments(prev => prev.map(att => 
          att.id === attachment.id 
            ? { ...att, progress: Math.min((att.progress || 0) + 10, 100) }
            : att
        ));
      }, 100);

      try {
        // Simulate file processing
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        clearInterval(progressInterval);
        setAttachments(prev => prev.map(att => 
          att.id === attachment.id 
            ? { ...att, status: 'completed', progress: 100 }
            : att
        ));

        // Add AI response about the upload
        const uploadMessage: ChatMessage = {
          id: Date.now() + i,
          type: 'ai',
          content: employee.uploadMessage,
          employee: employee.name,
          timestamp: new Date(),
          attachments: [attachment]
        };

        setMessages(prev => [...prev, uploadMessage]);

      } catch (error) {
        clearInterval(progressInterval);
        setAttachments(prev => prev.map(att => 
          att.id === attachment.id 
            ? { ...att, status: 'error' }
            : att
        ));
      }
    }

    setIsUploading(false);
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
    console.log('Processing document:', data);
  };

  const createCategory = async (data: any) => {
    console.log('Creating category:', data);
  };

  const setGoal = async (data: any) => {
    console.log('Setting goal:', data);
  };

  const generateReport = async (data: any) => {
    console.log('Generating report:', data);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const getFileIcon = (type: string) => {
    if (type.includes('image')) return <Image className="w-4 h-4" />;
    if (type.includes('spreadsheet') || type.includes('csv')) return <FileSpreadsheet className="w-4 h-4" />;
    if (type.includes('pdf')) return <FileText className="w-4 h-4" />;
    return <File className="w-4 h-4" />;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'uploading': return <Loader2 className="w-4 h-4 animate-spin" />;
      case 'processing': return <Loader2 className="w-4 h-4 animate-spin" />;
      case 'completed': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error': return <AlertCircle className="w-4 h-4 text-red-500" />;
      default: return null;
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
      initial={{ opacity: 0, y: '100%' }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="fixed inset-0 bg-white z-50 flex flex-col"
      style={{ paddingBottom: keyboardHeight }}
    >
      {/* Mobile Header */}
      <PersonalityHeader
        employee={employee}
        onClose={onClose}
        isVoiceEnabled={isVoiceEnabled}
        onVoiceToggle={() => setIsVoiceEnabled(!isVoiceEnabled)}
        isMobile={true}
      />

      {/* Quick Actions */}
      <QuickActionButtons
        actions={quickActions}
        onActionClick={handleQuickAction}
        employeeName={employee.name}
        isVisible={showQuickActions}
        isMobile={true}
      />

      {/* Upload Zone */}
      {showUploadZone && (
        <div className="p-4 bg-gray-50 border-b border-gray-200">
          <DocumentUploadZone
            onFilesUploaded={handleFileUpload}
            onFileRemoved={(fileId) => setAttachments(prev => prev.filter(att => att.id !== fileId))}
            attachments={attachments}
            isUploading={isUploading}
            employeeName={employee.name}
            employeeColor={employee.color}
            isMobile={true}
          />
        </div>
      )}

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
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
                <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                  message.type === 'user'
                    ? 'bg-orange-500 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}>
                  <div className="whitespace-pre-wrap text-sm">{message.content}</div>
                  
                  {/* Attachments */}
                  {message.attachments && message.attachments.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {message.attachments.map((attachment) => (
                        <div key={attachment.id} className="flex items-center space-x-2 p-2 bg-white/20 rounded-lg">
                          {getFileIcon(attachment.type)}
                          <span className="text-xs flex-1 truncate">{attachment.name}</span>
                          {getStatusIcon(attachment.status)}
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {message.actions && message.actions.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {message.actions.map((action, index) => (
                        <button
                          key={index}
                          className="block w-full text-left px-3 py-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors text-xs"
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
                <span className="text-sm">{employee.name} is typing</span>
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

      {/* Mobile Input Area */}
      <div className="border-t border-gray-200 p-4 bg-white">
        <div className="flex space-x-3">
          {/* Upload Button */}
          <button
            onClick={() => setShowUploadZone(!showUploadZone)}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            disabled={isUploading}
          >
            <Paperclip className="w-5 h-5" />
          </button>

          {/* Camera Button */}
          <button
            onClick={() => cameraInputRef.current?.click()}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            disabled={isUploading}
          >
            <Camera className="w-5 h-5" />
          </button>

          {/* Text Input */}
          <input
            ref={inputRef}
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={employee.placeholder}
            className="flex-1 border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-base"
            disabled={isTyping || isInitializing}
          />

          {/* Voice Button */}
          <button
            onClick={() => setIsVoiceEnabled(!isVoiceEnabled)}
            className={`p-2 rounded-lg transition-colors ${
              isVoiceEnabled 
                ? 'text-orange-500 bg-orange-50' 
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
            }`}
          >
            {isVoiceEnabled ? <Volume2 className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          {/* Send Button */}
          <button
            onClick={() => sendMessage()}
            disabled={!inputMessage.trim() || isTyping || isInitializing}
            className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl px-4 py-3 transition-colors flex items-center"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Hidden File Inputs */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf,.csv,.xlsx,.xls,.txt,.jpg,.jpeg,.png"
        onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
        className="hidden"
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
        className="hidden"
      />
    </motion.div>
  );
}
