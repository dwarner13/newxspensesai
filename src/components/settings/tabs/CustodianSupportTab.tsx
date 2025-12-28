/**
 * Custodian Support Console Tab
 * 
 * Chat interface for getting help with settings, billing, and system issues.
 * Routes messages to Custodian employee.
 */

import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { MessageCircle, Send, Sparkles } from 'lucide-react';
import { Button } from '../../ui/button';
import { useUnifiedChatEngine } from '../../../hooks/useUnifiedChatEngine';
import { motion, AnimatePresence } from 'framer-motion';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const QUICK_ACTIONS = [
  'Performance issue',
  'OCR issue',
  'Access issue',
  'Settings assistance',
  'Billing question',
  'Report a bug',
];

export function CustodianSupportTab() {
  const { userId } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Use unified chat engine with Custodian
  const {
    messages: chatMessages,
    sendMessage,
    isStreaming: chatIsStreaming,
  } = useUnifiedChatEngine({
    employeeSlug: 'custodian',
    conversationId: userId ? `custodian-support-${userId}` : 'custodian-support-guest',
  });

  // Sync chat engine messages to local messages
  useEffect(() => {
    if (chatMessages.length > 0) {
      const newMessages = chatMessages
        .filter(msg => !messages.find(m => m.id === msg.id))
        .map(msg => ({
          id: msg.id,
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
          timestamp: new Date(msg.createdAt || Date.now()),
        }));
      
      if (newMessages.length > 0) {
        setMessages(prev => [...prev, ...newMessages]);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatMessages]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isStreaming || chatIsStreaming) return;

    const messageText = input.trim();
    setInput('');
    setIsStreaming(true);

    try {
      await sendMessage(messageText);
      // Messages will be synced via useEffect from chatMessages
    } catch (error) {
      console.error('[CustodianSupportTab] Failed to send message:', error);
      setMessages(prev => [...prev, {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date(),
      }]);
    } finally {
      setIsStreaming(false);
    }
  };

  const handleQuickAction = (action: string) => {
    setInput(action);
    inputRef.current?.focus();
  };

  // Show initial Custodian greeting if no messages
  useEffect(() => {
    if (messages.length === 0 && chatMessages.length === 0) {
      setMessages([{
        id: 'custodian-greeting',
        role: 'assistant',
        content: "I monitor your account, settings, and system state.\nTell me what's not working — I'll take care of it.",
        timestamp: new Date(),
      }]);
    }
  }, [chatMessages.length]);

  return (
    <div className="flex flex-col h-full">
      {/* Header Card */}
      <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-xl p-4 mb-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-white mb-1">
              Custodian Support Console
            </h3>
            <p className="text-xs text-blue-400/80">
              System health, access, and account resolution
            </p>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto custodian-messages-scroll space-y-4 mb-5 min-h-0">
        <AnimatePresence>
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg p-3 ${
                  message.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-800 text-slate-100'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {(isStreaming || chatIsStreaming) && (
          <div className="flex justify-start">
            <div className="bg-slate-800 text-slate-100 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-pulse" />
                <span className="text-sm text-slate-400">Custodian is thinking...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Actions */}
      <div className="mb-5">
        <p className="text-xs text-slate-500 mb-2.5">Common issues</p>
        <div className="flex flex-wrap gap-2">
          {QUICK_ACTIONS.map((action) => (
            <button
              key={action}
              onClick={() => handleQuickAction(action)}
              className="px-3 py-1.5 text-xs font-medium text-slate-400/70 bg-slate-800/60 hover:bg-slate-700 hover:text-slate-300 border border-slate-700/50 hover:border-slate-600 rounded-lg transition-colors"
            >
              {action}
            </button>
          ))}
        </div>
      </div>

      {/* Input Area */}
      <div className="space-y-2">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && input.trim()) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Describe what you need help with…"
            disabled={isStreaming || chatIsStreaming}
            className="flex-1 px-4 py-2 bg-slate-800 border border-slate-700/60 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isStreaming || chatIsStreaming}
            className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
        <p className="text-[10px] text-slate-500/60 text-center">
          Custodian is monitoring system health
        </p>
      </div>
    </div>
  );
}

