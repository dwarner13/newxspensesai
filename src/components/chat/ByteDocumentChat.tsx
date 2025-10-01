import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Upload, 
  FileText, 
  Image as ImageIcon, 
  X, 
  Bot, 
  User, 
  Loader2,
  Eye,
  Download,
  CheckCircle,
  AlertCircle,
  Brain,
  Sparkles
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { AIEmployeeOrchestrator } from '../../systems/AIEmployeeOrchestrator';
import { getEmployeePersonality, generateEmployeeResponse } from '../../systems/EmployeePersonalities';
import { processImageWithSmartOCR, SmartOCRResult } from '../../utils/smartOCRManager';
import { redactDocument, generateAIEmployeeNotification } from '../../utils/documentRedaction';
import { processLargeFile, getFileRecommendations, ProcessingProgress } from '../../utils/largeFileProcessor';
import { BYTE_KNOWLEDGE_BASE, BYTE_RESPONSES } from '../../ai-knowledge/byte-knowledge-base';
import { CRYSTAL_KNOWLEDGE_BASE, CRYSTAL_RESPONSES, CRYSTAL_PERSONALITY } from '../../ai-knowledge/crystal-knowledge-base';
import toast from 'react-hot-toast';

interface ChatMessage {
  id: string;
  type: 'user' | 'prime' | 'byte' | 'crystal' | 'tag' | 'ledger' | 'blitz' | 'goalie' | 'system';
  content: string;
  timestamp: string;
  attachments?: {
    type: 'image' | 'document';
    url: string;
    filename: string;
    extractedText?: string;
    redactedText?: string;
    analysis?: any;
  }[];
  hasAction?: boolean;
  actionType?: 'crystal_handoff';
}

interface ByteDocumentChatProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ByteDocumentChat: React.FC<ByteDocumentChatProps> = ({
  isOpen,
  onClose
}) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isUploadProcessing, setIsUploadProcessing] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [processingProgress, setProcessingProgress] = useState<ProcessingProgress | null>(null);
  const [activeAI, setActiveAI] = useState<'prime' | 'byte' | 'crystal' | 'tag' | 'ledger' | 'blitz' | 'goalie'>('prime');
  const [hasShownCrystalSummary, setHasShownCrystalSummary] = useState(false);
  const [uploadedFileCount, setUploadedFileCount] = useState(0);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const orchestrator = useRef(new AIEmployeeOrchestrator());

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Initialize with Prime greeting
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const welcomeMessage: ChatMessage = {
        id: '1',
        type: 'prime',
        content: "👑 Hello! I'm Prime, your AI CEO here at XSpensesAI. I coordinate our entire team of 30 financial experts to help you succeed. What can my team help you with today?",
        timestamp: new Date().toISOString()
      };
      setMessages([welcomeMessage]);
    }
  }, [isOpen, messages.length]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) {
      console.log('Message blocked: No message content');
      return;
    }

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: inputMessage,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsProcessing(true);

    try {
      // Use the AI Employee Orchestrator for proper routing
      console.log('Message routing debug:', {
        activeAI,
        inputMessage: inputMessage.substring(0, 50)
      });
      
      // Route the message through the orchestrator
      const response = await orchestrator.current.routeMessage(inputMessage, { messages, user});
      
      if (response.shouldHandoff && response.handoff) {
        // Execute handoff to another employee
        orchestrator.current.executeHandoff(response.handoff);
        setActiveAI(response.handoff.to as any);
        
        // Show handoff message
        const handoffMessage: ChatMessage = {
          id: `handoff-${Date.now()}`,
          type: response.handoff.to as any,
          content: response.message,
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, handoffMessage]);
        
        // Get the new employee's response
        const newEmployeeResponse = await getEmployeeResponse(response.handoff.to, inputMessage);
        const messageId = (Date.now() + 1).toString();
        await typewriterResponse(newEmployeeResponse, messageId);
      } else {
        // Handle response from current employee
        const employeeResponse = await getEmployeeResponse(activeAI, inputMessage);
        const messageId = (Date.now() + 1).toString();
        await typewriterResponse(employeeResponse, messageId);
      }
      
      setIsProcessing(false);
    } catch (error) {
      console.error('Message handling error:', error);
      
      // Fallback to current employee
      const fallbackResponse = await getEmployeeResponse(activeAI, inputMessage);
      const messageId = (Date.now() + 1).toString();
      await typewriterResponse(fallbackResponse, messageId);
      setIsProcessing(false);
    }
  };

  // Get employee-specific response
  const getEmployeeResponse = async (employeeId: string, userMessage: string): Promise<string> => {
    const personality = getEmployeePersonality(employeeId);
    if (!personality) return "I'm here to help!";

    // For now, use the personality-based response generation
    // This would integrate with the actual AI system
    return generateEmployeeResponse(employeeId, userMessage, { messages, user});
  };

  // Typewriter effect for AI responses
  const typewriterResponse = async (text: string, messageId: string) => {
    const words = text.split(' ');
    let currentText = '';
    
    const typingMessage: ChatMessage = {
      id: messageId,
      type: activeAI,
      content: `${getEmployeePersonality(activeAI)?.emoji || '🤖'} ${getEmployeePersonality(activeAI)?.name || 'AI'} is thinking...`,
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, typingMessage]);
    
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
    
    for (let i = 0; i < words.length; i++) {
      currentText += (i > 0 ? ' ' : '') + words[i];
      setMessages(prev => prev.map(msg => 
        msg.id === messageId 
          ? { ...msg, content: currentText + (i < words.length - 1 ? '|' : '') }
          : msg
      ));
      const delay = Math.random() * 150 + 50;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    setMessages(prev => prev.map(msg => 
      msg.id === messageId 
        ? { ...msg, content: currentText }
        : msg
    ));
  };

  const handleFileUpload = async (files: FileList) => {
    // Simplified file upload for now
    console.log('File upload:', files.length, 'files');
    toast.success(`Uploaded ${files.length} file(s)`);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-lg w-full max-w-4xl h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl flex items-center justify-center">
              <Sparkles size={20} className="text-white font-bold" />
            </div>
            <h2 className="text-xl font-bold text-white">AI Employee Team</h2>
          </div>
          
          {/* AI Employee Switcher */}
          <div className="flex items-center gap-2">
              <div 
                className="flex bg-gray-800 rounded-lg p-1 employee-tabs"
                style={{
                  overflowX: 'auto',
                  WebkitOverflowScrolling: 'touch',
                  scrollbarWidth: 'none',
                  msOverflowStyle: 'none'
                }}
              >
                <style>
                  {`
                    .employee-tabs::-webkit-scrollbar {
                      display: none;
                    }
                  `}
                </style>
                <button
                  onClick={() => setActiveAI('prime')}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${
                    activeAI === 'prime'
                      ? 'bg-yellow-500 text-white'
                      : 'text-gray-400 hover:text-white hover:bg-gray-700'
                  }`}
                >
                  <Sparkles className="w-4 h-4" />
                  Prime
                </button>
                <button
                  onClick={() => setActiveAI('byte')}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${
                    activeAI === 'byte'
                      ? 'bg-blue-500 text-white'
                      : 'text-gray-400 hover:text-white hover:bg-gray-700'
                  }`}
                >
                  <Bot className="w-4 h-4" />
                  Byte
                </button>
                <button
                  onClick={() => setActiveAI('crystal')}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${
                    activeAI === 'crystal'
                      ? 'bg-purple-500 text-white'
                      : 'text-gray-400 hover:text-white hover:bg-gray-700'
                  }`}
                >
                  <Brain className="w-4 h-4" />
                  Crystal
                </button>
                <button
                  onClick={() => setActiveAI('tag')}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${
                    activeAI === 'tag'
                      ? 'bg-green-500 text-white'
                      : 'text-gray-400 hover:text-white hover:bg-gray-700'
                  }`}
                >
                  <Sparkles className="w-4 h-4" />
                  Tag
                </button>
                <button
                  onClick={() => setActiveAI('ledger')}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${
                    activeAI === 'ledger'
                      ? 'bg-orange-500 text-white'
                      : 'text-gray-400 hover:text-white hover:bg-gray-700'
                  }`}
                >
                  <Sparkles className="w-4 h-4" />
                  Ledger
                </button>
                <button
                  onClick={() => setActiveAI('blitz')}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${
                    activeAI === 'blitz'
                      ? 'bg-red-500 text-white'
                      : 'text-gray-400 hover:text-white hover:bg-gray-700'
                  }`}
                >
                  <Sparkles className="w-4 h-4" />
                  Blitz
                </button>
                <button
                  onClick={() => setActiveAI('goalie')}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${
                    activeAI === 'goalie'
                      ? 'bg-indigo-500 text-white'
                      : 'text-gray-400 hover:text-white hover:bg-gray-700'
                  }`}
                >
                  <Sparkles className="w-4 h-4" />
                  Goalie
                </button>
              </div>
            
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg p-3 ${
                  message.type === 'user'
                    ? 'bg-blue-500 text-white'
                    : message.type === 'prime'
                    ? 'bg-yellow-500/20 text-yellow-100 border border-yellow-500/30'
                    : message.type === 'byte'
                    ? 'bg-blue-500/20 text-blue-100 border border-blue-500/30'
                    : message.type === 'crystal'
                    ? 'bg-purple-500/20 text-purple-100 border border-purple-500/30'
                    : message.type === 'tag'
                    ? 'bg-green-500/20 text-green-100 border border-green-500/30'
                    : message.type === 'ledger'
                    ? 'bg-orange-500/20 text-orange-100 border border-orange-500/30'
                    : message.type === 'blitz'
                    ? 'bg-red-500/20 text-red-100 border border-red-500/30'
                    : message.type === 'goalie'
                    ? 'bg-indigo-500/20 text-indigo-100 border border-indigo-500/30'
                    : 'bg-gray-700 text-gray-100'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  {message.type !== 'user' && (
                    <span className="text-sm font-medium">
                      {getEmployeePersonality(message.type)?.emoji || '🤖'} {getEmployeePersonality(message.type)?.name || 'AI'}
                    </span>
                  )}
                  <span className="text-xs opacity-70">
                    {new Date(message.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <div className="whitespace-pre-wrap">{message.content}</div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* File Upload Area for Byte */}
        {activeAI === 'byte' && (
          <div className="p-4 border-t border-gray-700">
            <div className="border-2 border-dashed border-blue-500/30 rounded-lg p-6 text-center bg-blue-500/5">
              <Upload className="w-8 h-8 text-blue-400 mx-auto mb-2" />
              <p className="text-blue-300 font-medium mb-1">Drop files here or click to upload</p>
              <p className="text-xs text-gray-400 mb-3">
                Max 5 files, 10MB each • Supports: PDF, JPG, PNG, CSV, XLSX
              </p>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.jpg,.jpeg,.png,.csv,.xlsx,.xls,.txt"
                onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors text-sm"
              >
                Choose Files
              </button>
              {uploadedFileCount > 0 && (
                <div className="mt-2">
                  <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-1 rounded-full">
                    {uploadedFileCount} files uploaded
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="p-4 border-t border-gray-700">
          <div className="flex gap-2">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && !isProcessing && handleSendMessage()}
              placeholder={`Ask ${getEmployeePersonality(activeAI)?.name || 'AI'} anything...`}
              className="flex-1 bg-gray-800 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isProcessing}
            />
            <button
              onClick={handleSendMessage}
              disabled={isProcessing || !inputMessage.trim()}
              className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
            >
              {isProcessing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
