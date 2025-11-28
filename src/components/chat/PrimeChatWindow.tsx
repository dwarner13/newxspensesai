/**
 * PrimeChatWindow Component
 * 
 * Floating window for Prime chat
 * Positioned above Prime button (bottom-32px right-32px)
 * 400px width × 550px height
 */

import React, { useRef, useEffect } from 'react';
import { Crown, Send, X } from 'lucide-react';
import { EmployeeChatWorkspace } from './EmployeeChatWorkspace';

interface PrimeChatWindowProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PrimeChatWindow({ isOpen, onClose }: PrimeChatWindowProps) {
  const windowRef = useRef<HTMLDivElement>(null);

  // Close on backdrop click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (windowRef.current && !windowRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50" 
        style={{ animation: 'fadeIn 0.2s ease-in' }}
        onClick={onClose}
      />

      {/* Prime Window */}
      <div
        ref={windowRef}
        className="fixed bottom-[96px] right-8 w-[400px] h-[550px] md:w-[400px] md:h-[550px] sm:w-[350px] sm:h-[500px] max-sm:w-[90vw] max-sm:h-[70vh] max-sm:bottom-4 max-sm:right-4 bg-gradient-to-br from-purple-900 to-slate-900 border-2 border-yellow-500 rounded-2xl shadow-2xl z-60 flex flex-col"
        style={{ animation: 'slideUp 0.3s ease-out' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-purple-800/50 border-b border-purple-700/50 flex-shrink-0 rounded-t-2xl">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {/* Avatar */}
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center flex-shrink-0">
              <Crown className="w-5 h-5 text-white" />
            </div>
            
            {/* Text */}
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-bold text-slate-50 truncate">
                Prime AI
              </h3>
              <p className="text-xs text-slate-300 truncate">
                CEO • Strategic Coordinator
              </p>
            </div>
          </div>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-purple-700/50 rounded-lg transition-colors flex-shrink-0"
            aria-label="Close"
          >
            <X className="w-4 h-4 text-slate-300" />
          </button>
        </div>

        {/* Messages Area */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4">
          <EmployeeChatWorkspace
            employeeSlug="prime-boss"
            className="h-full"
            showHeader={false}
          />
        </div>

        {/* Input Footer */}
        <div className="border-t border-purple-700/50 p-4 bg-slate-800/50 flex-shrink-0 rounded-b-2xl">
          <div className="flex items-center gap-2 bg-slate-900/80 rounded-xl border border-slate-700/60 p-3">
            {/* Input Field */}
            <input
              type="text"
              placeholder="Ask Prime anything..."
              className="flex-1 bg-transparent outline-none text-sm text-slate-100 placeholder:text-slate-500 min-w-0"
            />

            {/* Send Button */}
            <button className="p-2 bg-yellow-500 hover:bg-yellow-600 rounded-lg transition-colors flex-shrink-0">
              <Send className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

