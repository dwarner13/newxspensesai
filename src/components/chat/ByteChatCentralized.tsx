/**
 * Byte Chat - Centralized Runtime Integration
 * ============================================
 * Document processing specialist powered by centralized chat runtime
 */

import React, { useState, useRef, useEffect } from 'react';
import { Send, X, Bot, User, Loader2, FileText, Sparkles } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useChat } from '../../hooks/useChat';

interface ByteChatCentralizedProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ByteChatCentralized: React.FC<ByteChatCentralizedProps> = ({
  isOpen,
  onClose,
}) => {
  const { user } = useAuth();
  const [inputMessage, setInputMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Use centralized chat hook
  const {
    messages,
    sessionId,
    isLoading,
    error,
    sendMessage,
    createOrUseSession,
  } = useChat({
    employeeSlug: 'byte-doc',
    apiEndpoint: '/.netlify/functions/chat',
  });

  // Initialize session on open
  useEffect(() => {
    if (isOpen) {
      createOrUseSession('byte-doc');
    }
  }, [isOpen, createOrUseSession]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Add welcome message if empty
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      // Welcome message will be added by the hook automatically
    }
  }, [isOpen, messages.length]);

  // Handle send
  const handleSend = async () => {
    if (!inputMessage.trim() || isLoading) return;

    await sendMessage(inputMessage);
    setInputMessage('');
  };

  // Handle key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl h-[600px] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              <span className="text-xl">📄</span>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Byte</h3>
              <p className="text-xs text-gray-500">Document Processing Specialist</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {sessionId && (
              <span className="text-xs text-gray-400 font-mono">
                Session: {sessionId.substring(0, 8)}...
              </span>
            )}
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && !isLoading && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mb-4">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Hello! I'm Byte 📄
              </h3>
              <p className="text-gray-600 max-w-md">
                I'm your document processing specialist! I love organizing data and turning
                chaotic documents into beautiful, structured information. What document can I
                help you with today?
              </p>
            </div>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`flex items-start space-x-2 max-w-[80%] ${
                  message.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                }`}
              >
                {/* Avatar */}
                <div
                  className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                    message.role === 'user'
                      ? 'bg-gray-200'
                      : 'bg-gradient-to-br from-blue-500 to-purple-600'
                  }`}
                >
                  {message.role === 'user' ? (
                    <User className="w-4 h-4 text-gray-600" />
                  ) : (
                    <span className="text-sm">{message.employee?.emoji || '📄'}</span>
                  )}
                </div>

                {/* Message bubble */}
                <div
                  className={`rounded-2xl px-4 py-2 ${
                    message.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  
                  {/* Tool calls indicator */}
                  {message.metadata?.tool_calls && message.metadata.tool_calls.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-gray-300/50">
                      <p className="text-xs text-gray-600 flex items-center gap-1">
                        <Brain className="w-3 h-3" />
                        Using tools: {message.metadata.tool_calls.map((tc: any) => tc.name).join(', ')}
                      </p>
                    </div>
                  )}
                  
                  <p className="text-[10px] mt-1 opacity-60">
                    {new Date(message.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            </div>
          ))}

          {/* Loading indicator */}
          {isLoading && (
            <div className="flex justify-start">
              <div className="flex items-center space-x-2 bg-gray-100 rounded-2xl px-4 py-3">
                <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                <span className="text-sm text-gray-600">Byte is thinking...</span>
              </div>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="flex justify-center">
              <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2 text-sm text-red-700">
                ⚠️ {error.message}
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t border-gray-200 p-4">
          <div className="flex items-end space-x-2">
            <div className="flex-1">
              <textarea
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Ask Byte anything about your documents..."
                className="w-full px-4 py-2 border border-gray-300 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={2}
                disabled={isLoading}
              />
            </div>
            <button
              onClick={handleSend}
              disabled={!inputMessage.trim() || isLoading}
              className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center space-x-2"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>

          {/* Footer info */}
          <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
            <span>💡 Powered by centralized chat runtime</span>
            {sessionId && (
              <span className="font-mono">Session: {sessionId.substring(0, 12)}...</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ByteChatCentralized;

