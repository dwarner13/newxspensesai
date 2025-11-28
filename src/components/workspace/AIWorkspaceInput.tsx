/**
 * AIWorkspaceInput Component
 * 
 * Reusable input composer for AI workspace overlays
 * Contains action icons, text input, and send button
 */

import React, { useRef, useEffect } from 'react';
import { Send } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface AIWorkspaceInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  placeholder?: string;
  isStreaming: boolean;
  disabled?: boolean;
  actionIconsLeft?: React.ReactNode;
  sendButtonColorClass?: string;
  autoFocus?: boolean;
}

export function AIWorkspaceInput({
  value,
  onChange,
  onSend,
  placeholder = 'Message...',
  isStreaming,
  disabled = false,
  actionIconsLeft,
  sendButtonColorClass = 'bg-gradient-to-br from-blue-500 to-blue-600 shadow-blue-500/30',
  autoFocus = false,
}: AIWorkspaceInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const hasText = value.trim().length > 0;
  const isLoading = isStreaming || disabled;

  // Auto-focus input if requested
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [autoFocus]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && hasText && !isLoading) {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <div className="px-3 pb-3 md:px-6 md:pb-4">
      <div className={cn(
        'flex items-center gap-2 md:gap-3 bg-slate-800 rounded-xl border border-slate-700',
        'focus-within:border-blue-500 transition-all duration-200',
        'px-3 py-2 md:px-3 md:py-2'
      )}>
        {/* Action Icons */}
        {actionIconsLeft && (
          <div className="flex items-center gap-1.5 md:gap-2 flex-shrink-0">
            {actionIconsLeft}
          </div>
        )}

        {/* Text Input */}
        <input
          ref={inputRef}
          type="text"
          placeholder={isStreaming ? `${placeholder.split(' ')[0]} is typing...` : placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          className={cn(
            'flex-1 min-w-0 bg-transparent text-white outline-none',
            'text-sm md:text-sm placeholder:text-slate-500',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'h-9 md:h-auto'
          )}
          aria-label="Chat input"
          autoComplete="off"
          spellCheck="true"
          disabled={isLoading}
        />

        {/* Send Button */}
        <button
          onClick={onSend}
          className={cn(
            'w-9 h-9 md:w-10 md:h-10 rounded-full flex items-center justify-center',
            'shadow-lg hover:scale-105 transition-all duration-200 touch-manipulation',
            'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100',
            sendButtonColorClass
          )}
          aria-label={isStreaming ? "Sending message..." : "Send message"}
          disabled={!hasText || isLoading}
          aria-disabled={!hasText || isLoading}
        >
          {isStreaming ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Send className="w-4 h-4 text-white" />
          )}
        </button>
      </div>
    </div>
  );
}

