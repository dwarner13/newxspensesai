/**
 * ByteIntegratedChat Component
 * 
 * Integrated chat area for middle column workspace
 * Includes messages area and input footer
 */

import React, { useState } from 'react';
import { Paperclip, Upload, FileText, Send, Shield } from 'lucide-react';
import { EmployeeChatWorkspace } from '../chat/EmployeeChatWorkspace';

interface ByteIntegratedChatProps {
  onInputFocus?: () => void;
}

export function ByteIntegratedChat({ onInputFocus }: ByteIntegratedChatProps) {
  const [inputValue, setInputValue] = useState('');

  const handleInputFocus = () => {
    if (onInputFocus) {
      onInputFocus();
    }
  };

  const hasText = inputValue.trim().length > 0;

  return (
    <div className="flex-1 bg-slate-900 rounded-xl border border-slate-800 flex flex-col h-full">
      {/* Chat Messages Area */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3">
        <EmployeeChatWorkspace
          employeeSlug="byte-docs"
          className="h-full"
          showHeader={false}
        />
      </div>

      {/* Chat Input Area (Fixed at bottom) */}
      <div className="border-t border-slate-800 p-4 bg-slate-900/50 backdrop-blur-sm flex-shrink-0">
        {/* Guardrails Badge */}
        <div className="flex items-center justify-center gap-2 mb-3">
          <Shield className="w-3 h-3 text-blue-400" />
          <span className="text-xs font-medium text-blue-400">
            Secure • 99.7% Accurate
          </span>
        </div>

        {/* Input Container */}
        <div className="flex items-center gap-3 bg-slate-800 rounded-xl px-3 py-2.5 border border-slate-700 focus-within:border-blue-500 transition-all duration-200">
          {/* Action Icons */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button 
              className="p-1.5 rounded-full hover:bg-slate-700/50 text-slate-400 hover:text-blue-400 transition-all duration-200"
              aria-label="Attach file"
            >
              <Paperclip className="w-[18px] h-[18px]" />
            </button>
            <button 
              className="p-1.5 rounded-full hover:bg-slate-700/50 text-slate-400 hover:text-blue-400 transition-all duration-200"
              aria-label="Upload document"
            >
              <Upload className="w-[18px] h-[18px]" />
            </button>
            <button 
              className="hidden sm:block p-1.5 rounded-full hover:bg-slate-700/50 text-slate-400 hover:text-blue-400 transition-all duration-200"
              aria-label="Add document"
            >
              <FileText className="w-[18px] h-[18px]" />
            </button>
          </div>

          {/* Text Input */}
          <input
            type="text"
            placeholder="Message Byte..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onFocus={handleInputFocus}
            className="flex-1 bg-transparent text-white text-sm placeholder:text-slate-500 outline-none"
            aria-label="Chat with Byte AI assistant"
            autoComplete="off"
            spellCheck="true"
          />

          {/* Send Button */}
          <button
            className={`
              w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 
              rounded-full flex items-center justify-center 
              shadow-lg shadow-blue-500/30 
              hover:scale-105 transition-all duration-200
              disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
            `}
            aria-label="Send message"
            disabled={!hasText}
            aria-disabled={!hasText}
          >
            <Send className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}




