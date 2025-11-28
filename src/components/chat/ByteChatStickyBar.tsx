/**
 * ByteChatStickyBar Component
 * 
 * Enhanced floating input design
 * Fixed bottom bar that respects sidebar width
 * Height: 140px desktop, 110px mobile
 */

import React, { useState } from 'react';
import { Paperclip, Upload, FileText, Send, Shield } from 'lucide-react';
import { ByteChatPopUp } from './ByteChatPopUp';

export function ByteChatStickyBar() {
  const [isPopUpOpen, setIsPopUpOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');

  const handleInputFocus = () => {
    setIsPopUpOpen(true);
  };

  const handleInputClick = () => {
    setIsPopUpOpen(true);
  };

  const handleMinimize = () => {
    setIsPopUpOpen(false);
  };

  const hasText = inputValue.trim().length > 0;

  return (
    <>
      {/* Sticky Bottom Bar - respects sidebar, doesn't overlay */}
      {/* Left offset matches sidebar: 264px on desktop */}
      <div className="fixed bottom-0 left-0 lg:left-[264px] h-[110px] md:h-[140px] bg-gradient-to-b from-transparent to-slate-950/50 flex-shrink-0 z-10 flex items-center justify-center px-4 md:px-6">
        {/* Main input wrapper */}
        <div className="max-w-5xl w-full relative">
          {/* Floating input container */}
          <div 
            className={`
              bg-gradient-to-br from-slate-800/95 to-slate-900/95 backdrop-blur-md 
              border border-slate-700 rounded-2xl px-3 py-3 
              h-[52px] md:h-16 flex items-center gap-4 
              shadow-2xl transition-all duration-300
              ${hasText ? 'border-blue-500/30' : 'hover:border-blue-500/30'}
            `}
            style={{
              boxShadow: hasText 
                ? '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 40px rgba(59, 130, 246, 0.2)'
                : '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 40px rgba(59, 130, 246, 0.15)'
            }}
          >
            {/* Action Icons (Left Side) */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <button 
                className="p-2 rounded-full hover:bg-slate-700/50 text-slate-400 hover:text-blue-400 transition-all duration-200 cursor-pointer active:scale-95"
                aria-label="Attach file"
                role="button"
                tabIndex={0}
              >
                <Paperclip className="w-5 h-5 md:w-[22px] md:h-[22px]" style={{ width: '22px', height: '22px' }} />
              </button>
              <button 
                className="p-2 rounded-full hover:bg-slate-700/50 text-slate-400 hover:text-blue-400 transition-all duration-200 cursor-pointer active:scale-95"
                aria-label="Upload document"
                role="button"
                tabIndex={0}
              >
                <Upload className="w-5 h-5 md:w-[22px] md:h-[22px]" style={{ width: '22px', height: '22px' }} />
              </button>
              <button 
                className="hidden sm:block p-2 rounded-full hover:bg-slate-700/50 text-slate-400 hover:text-blue-400 transition-all duration-200 cursor-pointer active:scale-95"
                aria-label="Add document"
                role="button"
                tabIndex={0}
              >
                <FileText className="w-5 h-5 md:w-[22px] md:h-[22px]" style={{ width: '22px', height: '22px' }} />
              </button>
            </div>

            {/* Input Field (Center) */}
            <input
              type="text"
              placeholder="Message Byte..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onFocus={handleInputFocus}
              onClick={handleInputClick}
              className="flex-1 bg-transparent text-white text-sm md:text-base placeholder:text-slate-500 outline-none border-none px-0"
              aria-label="Chat with Byte AI assistant"
              autoComplete="off"
              spellCheck="true"
            />

            {/* Send Button (Right Side) */}
            <button 
              className={`
                w-11 h-11 md:w-12 md:h-12
                bg-gradient-to-br from-blue-500 to-blue-600 
                rounded-full flex items-center justify-center 
                shadow-lg shadow-blue-500/50 
                hover:scale-110 hover:shadow-xl hover:shadow-blue-500/60
                transition-all duration-200 
                relative translate-x-1 md:translate-x-2
                cursor-pointer z-30
                ${hasText ? 'animate-pulse' : ''}
                disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-lg
              `}
              style={{
                background: hasText 
                  ? 'linear-gradient(to bottom right, rgb(59, 130, 246), rgb(37, 99, 235))'
                  : undefined
              }}
              aria-label="Send message"
              role="button"
              disabled={!hasText}
              aria-disabled={!hasText}
              onMouseEnter={(e) => {
                if (hasText) {
                  e.currentTarget.style.background = 'linear-gradient(to bottom right, rgb(96, 165, 250), rgb(59, 130, 246))';
                }
              }}
              onMouseLeave={(e) => {
                if (hasText) {
                  e.currentTarget.style.background = 'linear-gradient(to bottom right, rgb(59, 130, 246), rgb(37, 99, 235))';
                }
              }}
            >
              <Send className="w-5 h-5 md:w-6 md:h-6 text-white" />
            </button>
          </div>

          {/* Guardrails Badge (Below Input) */}
          <div className="flex items-center justify-center gap-2 mt-3">
            <Shield className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-xs font-medium text-slate-500">
              Secure • 99.7% Accurate
            </span>
          </div>
        </div>
      </div>

      {/* Pop-up Modal */}
      {isPopUpOpen && (
        <ByteChatPopUp
          isOpen={isPopUpOpen}
          onMinimize={handleMinimize}
          initialInput={inputValue}
        />
      )}
    </>
  );
}
