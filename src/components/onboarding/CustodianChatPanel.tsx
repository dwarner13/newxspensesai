/**
 * Custodian Chat Panel
 * 
 * Chat-style UI for Custodian onboarding questions.
 * Features:
 * - Glass card styling with blurred background
 * - Header with avatar + name + status dot
 * - Chat bubbles (Custodian + User)
 * - Input area with text input / select dropdown
 * - "Send" button styled like chat
 * - Typing indicator
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Loader2 } from 'lucide-react';

interface ChatMessage {
  id: string;
  role: 'custodian' | 'user';
  content: string;
  timestamp: Date;
}

interface QuestionOption {
  value: string;
  label: string;
}

interface CustodianChatPanelProps {
  question: {
    id: string;
    question: string;
    key: string;
    type: 'text' | 'options';
    narration?: string;
    options?: QuestionOption[];
  };
  currentStep: number;
  totalSteps: number;
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  isMobile?: boolean;
  showTyping?: boolean;
}

export function CustodianChatPanel({
  question,
  currentStep,
  totalSteps,
  value,
  onChange,
  onSubmit,
  isMobile = false,
  showTyping = false,
}: CustodianChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState(value || '');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Initialize with Custodian's question - reset when question changes
  useEffect(() => {
    if (question) {
      setMessages([
        {
          id: `custodian-${question.id}`,
          role: 'custodian',
          content: question.question,
          timestamp: new Date(),
        },
      ]);
      setInputValue(value || '');
    }
  }, [question.id, question.question]);

  // Update input value when value prop changes
  useEffect(() => {
    setInputValue(value || '');
  }, [value]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, showTyping]);

  const handleSubmit = () => {
    if (!inputValue.trim() && question.type === 'text') return;
    if (!inputValue && question.type === 'options') return;

    // Add user message
    const userMessage: ChatMessage = {
      id: `user-${question.id}-${Date.now()}`,
      role: 'user',
      content: question.type === 'options'
        ? question.options?.find(opt => opt.value === inputValue)?.label || inputValue
        : inputValue,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    onChange(inputValue);
    
    // Clear input
    setInputValue('');
    
    // Call onSubmit after brief delay
    setTimeout(() => {
      onSubmit();
    }, 300);
  };

  const handleOptionClick = (optionValue: string) => {
    setInputValue(optionValue);
    onChange(optionValue);
    // Auto-submit for options
    setTimeout(() => {
      onSubmit();
    }, 200);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ 
        type: 'spring', 
        stiffness: 280, 
        damping: 28,
        mass: 0.8,
      }}
      className="h-full flex flex-col bg-gradient-to-br from-slate-900/95 via-slate-950/95 to-slate-900/95 border border-purple-500/20 rounded-2xl shadow-2xl overflow-hidden"
      style={{
        // Use transform/opacity only - no layout properties
        willChange: 'transform, opacity',
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 md:px-6 py-4 border-b border-purple-500/20 bg-gradient-to-r from-purple-500/10 to-blue-500/10 flex-shrink-0">
        <div className="relative">
          <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-blue-500/40 ring-2 ring-blue-500/30">
            <span className="text-lg md:text-xl">🛡️</span>
          </div>
          {/* Status dot */}
          <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 rounded-full border-2 border-slate-900 ring-1 ring-green-400/50" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm md:text-base font-semibold text-white">Custodian</h3>
          <p className="text-xs text-slate-400">Step {currentStep} of {totalSteps}</p>
        </div>
      </div>

      {/* Messages Area - ONLY scrollable area */}
      <div className="flex-1 overflow-y-auto px-4 md:px-6 py-4 min-h-0" style={{ scrollbarGutter: 'stable', WebkitOverflowScrolling: 'touch' }}>
        <div className="space-y-4">
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className={`flex ${msg.role === 'custodian' ? 'justify-start' : 'justify-end'}`}
            >
              <div
                className={`max-w-[80%] md:max-w-[70%] rounded-2xl px-4 py-3 ${
                  msg.role === 'custodian'
                    ? 'bg-gradient-to-br from-blue-500/20 via-indigo-500/20 to-purple-500/20 border border-blue-500/30 text-white'
                    : 'bg-gradient-to-br from-purple-500/30 via-blue-500/30 to-indigo-500/30 border border-purple-400/40 text-white'
                } backdrop-blur-sm`}
              >
                <p className="text-sm md:text-base leading-relaxed">{msg.content}</p>
              </div>
            </motion.div>
          ))}

          {/* Typing Indicator */}
          <AnimatePresence>
            {showTyping && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex justify-start"
              >
                <div className="bg-gradient-to-br from-blue-500/20 via-indigo-500/20 to-purple-500/20 border border-blue-500/30 rounded-2xl px-4 py-3 backdrop-blur-sm">
                  <div className="flex gap-1">
                    <motion.div
                      className="w-2 h-2 bg-blue-400 rounded-full"
                      animate={{ y: [0, -4, 0] }}
                      transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
                    />
                    <motion.div
                      className="w-2 h-2 bg-blue-400 rounded-full"
                      animate={{ y: [0, -4, 0] }}
                      transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
                    />
                    <motion.div
                      className="w-2 h-2 bg-blue-400 rounded-full"
                      animate={{ y: [0, -4, 0] }}
                      transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-purple-500/20 bg-slate-900/50 backdrop-blur-sm px-4 md:px-6 py-4 flex-shrink-0">
        {question.type === 'text' ? (
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value);
                onChange(e.target.value);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && inputValue.trim()) {
                  handleSubmit();
                }
              }}
              placeholder="Type your answer..."
              className="flex-1 px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-500/50 transition-colors"
            />
            <motion.button
              onClick={handleSubmit}
              disabled={!inputValue.trim()}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 border border-purple-400/30 hover:border-purple-400/50 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg shadow-purple-500/30 hover:shadow-xl hover:shadow-purple-500/40 transition-all duration-200"
            >
              <Send className="w-4 h-4" />
            </motion.button>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="grid grid-cols-1 gap-2">
              {question.options?.map((option) => (
                <motion.button
                  key={option.value}
                  onClick={() => handleOptionClick(option.value)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`px-4 py-3 rounded-xl text-left transition-all duration-200 font-medium ${
                    inputValue === option.value
                      ? 'bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 text-white border border-purple-400/50 shadow-lg shadow-purple-500/30 hover:shadow-xl hover:shadow-purple-500/40'
                      : 'bg-black/40 border border-white/10 text-white hover:border-purple-500/30 hover:bg-black/60'
                  }`}
                >
                  {option.label}
                </motion.button>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

