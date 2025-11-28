/**
 * ByteChatPopUp Component
 * 
 * Centered modal pop-up for Byte chat
 * Responsive: max-w-4xl desktop, max-w-3xl tablet, full width mobile
 * Height: 600px desktop, 85vh mobile
 */

import React, { useState, useEffect, useRef } from 'react';
import { Paperclip, Upload, FileText, Send, Shield, ChevronDown } from 'lucide-react';
import { EmployeeChatWorkspace } from './EmployeeChatWorkspace';

interface ByteChatPopUpProps {
  isOpen: boolean;
  onMinimize: () => void;
  initialInput?: string;
}

export function ByteChatPopUp({ isOpen, onMinimize, initialInput = '' }: ByteChatPopUpProps) {
  const [inputValue, setInputValue] = useState(initialInput);
  const popupRef = useRef<HTMLDivElement>(null);

  // Close on backdrop click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
        onMinimize();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, onMinimize]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" 
        style={{ animation: 'fadeIn 0.2s ease-in' }}
        onClick={onMinimize}
      />

      {/* Centered Modal Container */}
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div
          ref={popupRef}
          className="w-full max-w-4xl md:max-w-3xl h-[85vh] md:h-[600px] bg-gradient-to-b from-slate-800 to-slate-900 border-2 border-blue-500 rounded-2xl shadow-2xl flex flex-col"
          style={{ animation: 'slideUp 0.3s ease-out' }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header Section */}
          <div className="flex items-center justify-between px-4 py-3 md:px-6 md:py-4 bg-slate-800/50 backdrop-blur-sm border-b border-slate-700 flex-shrink-0 rounded-t-2xl">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {/* Avatar */}
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0 shadow-lg">
                <span className="text-xl md:text-2xl">📄</span>
              </div>
              
              {/* Text */}
              <div className="flex-1 min-w-0">
                <h3 className="text-base md:text-lg font-bold text-white truncate">
                  Byte — Smart Import AI
                </h3>
                <p className="text-xs md:text-sm text-slate-400 truncate">
                  Data Processing Specialist
                </p>
              </div>
            </div>

            {/* Minimize Button */}
            <button
              onClick={onMinimize}
              className="p-2 hover:bg-slate-700 rounded-lg transition-colors flex-shrink-0"
              aria-label="Minimize"
            >
              <ChevronDown className="w-5 h-5 md:w-6 md:h-6 text-slate-400" />
            </button>
          </div>

          {/* Messages Area - Flex-1 (takes remaining space) */}
          <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 md:px-6 md:py-6 space-y-3 md:space-y-4">
            <EmployeeChatWorkspace
              employeeSlug="byte-docs"
              className="h-full"
              showHeader={false}
            />
          </div>

          {/* Input Footer */}
          <div className="bg-slate-800/50 backdrop-blur-sm border-t border-slate-700 px-4 py-4 md:px-5 md:py-5 flex-shrink-0 rounded-b-2xl">
            {/* Guardrails Badge */}
            <div className="flex items-center justify-center gap-2 mb-3">
              <div className="flex items-center gap-2 px-3 py-1 bg-blue-500/20 border border-blue-500/30 rounded-full">
                <Shield className="w-3.5 h-3.5 md:w-4 md:h-4 text-blue-400" />
                <span className="text-xs text-blue-400 font-medium">
                  Byte Processing • 99.7% Accuracy • Guardrails Active
                </span>
              </div>
            </div>

            {/* Input Container */}
            <div className="flex items-center gap-2 md:gap-2 bg-slate-800 rounded-xl border border-slate-700/60 p-2.5 md:p-3">
              {/* Left Icons */}
              <div className="flex items-center gap-1.5 md:gap-2 flex-shrink-0">
                <button className="p-1.5 hover:bg-slate-700 rounded-lg transition-colors">
                  <Paperclip className="w-[18px] h-[18px] md:w-5 md:h-5 text-slate-400 hover:text-blue-400 transition-colors" />
                </button>
                <button className="p-1.5 hover:bg-slate-700 rounded-lg transition-colors">
                  <Upload className="w-[18px] h-[18px] md:w-5 md:h-5 text-slate-400 hover:text-blue-400 transition-colors" />
                </button>
                <button className="hidden sm:block p-1.5 hover:bg-slate-700 rounded-lg transition-colors">
                  <FileText className="w-[18px] h-[18px] md:w-5 md:h-5 text-slate-400 hover:text-blue-400 transition-colors" />
                </button>
              </div>

              {/* Input Field */}
              <input
                type="text"
                placeholder="Ask Byte..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className="flex-1 bg-transparent outline-none text-sm text-white placeholder:text-slate-400 min-w-0"
              />

              {/* Send Button */}
              <button className="p-1.5 md:p-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-all hover:scale-105 flex-shrink-0 shadow-lg shadow-blue-500/30">
                <Send className="w-4 h-4 md:w-4.5 md:h-4.5 text-white" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
