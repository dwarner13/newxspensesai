/**
 * Prime Chat - Centralized Runtime Integration
 * ============================================
 * CEO/Orchestrator powered by centralized chat runtime
 */

import React, { useState, useRef, useEffect } from 'react';
import React from "react";
import { X } from "lucide-react";
import { useChat } from "@/hooks/useChat";

interface PrimeChatCentralizedProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PrimeChatCentralized: React.FC<PrimeChatCentralizedProps> = ({
  isOpen,
  onClose,
}) => {
  const { messages, send, pendingTool, handleToolResponse } = useChat("prime");

  // Use centralized chat hook
  if (!isOpen) return null;

  // Initialize session on open
  // Handle send
  const handleSend = async () => {
    if (!inputMessage.trim() || isLoading) return;
    await send(inputMessage);
    setInputMessage('');
  };

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl h-[700px] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-blue-50">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-blue-600 rounded-full flex items-center justify-center">
              <Crown className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-lg">Prime</h3>
              <p className="text-xs text-gray-600">CEO & Strategic Orchestrator</p>
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
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.length === 0 && !isLoading && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-purple-600 to-blue-600 rounded-full flex items-center justify-center mb-4">
                <Crown className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                👑 Welcome! I'm Prime
              </h3>
              <p className="text-gray-600 max-w-md mb-4">
                Your strategic AI CEO and orchestrator of 30+ specialized AI employees.
                I'm here to coordinate your entire financial team and help you achieve your goals.
              </p>
              <div className="grid grid-cols-2 gap-3 max-w-lg text-sm text-left">
                <div className="bg-purple-50 p-3 rounded-lg">
                  <div className="font-semibold text-purple-900">🎯 Strategy</div>
                  <div className="text-purple-700 text-xs">High-level planning</div>
                </div>
                <div className="bg-blue-50 p-3 rounded-lg">
                  <div className="font-semibold text-blue-900">🤝 Delegation</div>
                  <div className="text-blue-700 text-xs">Connect you with experts</div>
                </div>
                <div className="bg-green-50 p-3 rounded-lg">
                  <div className="font-semibold text-green-900">📊 Overview</div>
                  <div className="text-green-700 text-xs">Big-picture insights</div>
                </div>
                <div className="bg-amber-50 p-3 rounded-lg">
                  <div className="font-semibold text-amber-900">⚡ Coordination</div>
                  <div className="text-amber-700 text-xs">Multi-agent tasks</div>
                </div>
              </div>
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
                className={`flex items-start space-x-2 max-w-[85%] ${
                  message.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                }`}
              >
                {/* Avatar */}
                <div
                  className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center ${
                    message.role === 'user'
                      ? 'bg-gray-200'
                      : 'bg-gradient-to-br from-purple-600 to-blue-600'
                  }`}
                >
                  {message.role === 'user' ? (
                    <User className="w-5 h-5 text-gray-600" />
                  ) : (
                    <Crown className="w-5 h-5 text-white" />
                  )}
                </div>

                {/* Message bubble */}
                <div
                  className={`rounded-2xl px-5 py-3 ${
                    message.role === 'user'
                      ? 'bg-gradient-to-br from-purple-600 to-blue-600 text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
                  
                  {/* Tool calls indicator */}
                  {message.metadata?.tool_calls && message.metadata.tool_calls.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-300/50">
                      <p className="text-xs text-gray-600 flex items-center gap-1">
                        <Sparkles className="w-3 h-3" />
                        Using: {message.metadata.tool_calls.map((tc: any) => tc.name).join(', ')}
                      </p>
                    </div>
                  )}
                  
                  <p className="text-[10px] mt-2 opacity-60">
                    {new Date(message.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            </div>
          ))}

          {/* Loading indicator */}
          {isLoading && (
            <div className="flex justify-start">
              <div className="flex items-center space-x-2 bg-gradient-to-r from-purple-50 to-blue-50 rounded-2xl px-5 py-3 border border-purple-200">
                <Loader2 className="w-4 h-4 animate-spin text-purple-600" />
                <span className="text-sm text-purple-900 font-medium">Prime is thinking...</span>
              </div>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="flex justify-center">
              <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
                ⚠️ {error.message}
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t border-gray-200 p-4 bg-gray-50">
          <div className="flex items-end space-x-3">
            <div className="flex-1">
              <textarea
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Ask Prime anything about your finances..."
                className="w-full px-4 py-3 border border-gray-300 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                rows={2}
                disabled={isLoading}
              />
            </div>
            <button
              onClick={handleSend}
              disabled={!inputMessage.trim() || isLoading}
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center space-x-2 shadow-lg"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>

          {/* Footer info */}
          <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
            <span>👑 Powered by centralized chat runtime</span>
            {sessionId && (
              <span className="font-mono">Session: {sessionId.substring(0, 12)}...</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrimeChatCentralized;

