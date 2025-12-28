/**
 * Employee Chat Workspace Component
 * 
 * Reusable chat workspace component that accepts chat state and renders a chat UI.
 * Used by PrimeSidebarChat and PrimeChatWorkspace to provide a consistent chat interface.
 */

import React, { useRef, useEffect } from 'react';
import { Send, User, Loader2, Paperclip, X } from 'lucide-react';
import type { ChatMessage, UploadItem, ChatHeaders } from '../../hooks/usePrimeChat';
import { PrimeLogoBadge } from '../branding/PrimeLogoBadge';

export interface EmployeeChatWorkspaceProps {
  /** Employee slug (e.g., 'prime-boss', 'byte-docs') */
  employeeSlug: string;
  
  /** Chat messages */
  messages?: ChatMessage[];
  
  /** Input value */
  input?: string;
  
  /** Set input handler */
  setInput?: (value: string) => void;
  
  /** Whether streaming is in progress */
  isStreaming?: boolean;
  
  /** Send message handler */
  send?: (message: string) => void;
  
  /** Upload items */
  uploads?: UploadItem[];
  
  /** Add upload files handler */
  addUploadFiles?: (files: FileList | File[]) => void;
  
  /** Remove upload handler */
  removeUpload?: (id: string) => void;
  
  /** Active employee slug (may differ from employeeSlug after handoff) */
  activeEmployeeSlug?: string;
  
  /** Response headers */
  headers?: ChatHeaders;
  
  /** Optional className for container */
  className?: string;
  
  /** Whether to show header */
  showHeader?: boolean;
  
  /** Whether to show composer */
  showComposer?: boolean;
  
  /** Optional initial question (for PrimeChatWorkspace usage) */
  initialQuestion?: string;
  
  /** Optional conversation ID (for PrimeChatWorkspace usage) */
  conversationId?: string;
  
  /** Optional list of allowed employee slugs for handoffs */
  allowedEmployees?: string[];
}

export function EmployeeChatWorkspace({
  employeeSlug,
  messages = [],
  input = '',
  setInput = () => {},
  isStreaming = false,
  send = async () => {},
  uploads = [],
  addUploadFiles,
  removeUpload,
  activeEmployeeSlug,
  headers,
  className = '',
  showHeader = true,
  showComposer = true,
  initialQuestion,
  conversationId,
  allowedEmployees,
}: EmployeeChatWorkspaceProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input on mount if no messages
  useEffect(() => {
    if (messages.length === 0 && !isStreaming) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 150);
    }
  }, []);

  // Handle send
  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || isStreaming) return;
    send(input);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  };

  // Handle key press
  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0 && addUploadFiles) {
      addUploadFiles(files);
    }
    // Reset input so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Filter out system messages for display
  // Safely handle undefined messages array (default to empty array)
  const safeMessages = messages ?? [];
  const displayMessages = safeMessages.filter((m) => m.role !== 'system');
  
  // Safely handle allowedEmployees filter if needed
  const safeAllowedEmployees = allowedEmployees ?? [];
  const visibleEmployees = safeAllowedEmployees.filter((emp) => emp && emp.length > 0);

  // Get employee display name
  const employeeName = activeEmployeeSlug || employeeSlug;
  const displayName = employeeName
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Optional Header */}
      {showHeader && (
        <div className="flex-shrink-0 px-4 py-3 border-b border-white/10">
          <h2 className="text-lg font-semibold text-white">{displayName}</h2>
        </div>
      )}

      {/* Messages Area */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3 space-y-3 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {displayMessages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center py-8">
            <div className="flex justify-center mb-6">
              <PrimeLogoBadge size={52} showGlow={true} />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">
              Welcome! I'm Prime, your AI financial CEO.
            </h3>
            <p className="text-sm text-slate-400 max-w-sm">
              I can review your latest imports, explain your spending, and help you plan debt payoff and savings goals.
            </p>
          </div>
        )}

        {displayMessages.map((message, index) => (
          <div
            key={message.id || index}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-xl px-4 py-2.5 ${
                message.role === 'user'
                  ? 'bg-gradient-to-r from-amber-400 via-amber-300 to-amber-400 text-slate-900 shadow-lg shadow-amber-400/20'
                  : 'bg-white/5 text-white border border-white/10 backdrop-blur-sm'
              }`}
            >
              <div className="flex items-start gap-2">
                {message.role === 'assistant' && (
                  <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-amber-400 via-pink-500 to-purple-600 flex items-center justify-center flex-shrink-0 mt-0.5 shadow-[0_0_15px_rgba(252,211,77,0.3)]">
                    <span className="text-xs">👑</span>
                  </div>
                )}
                <div className="flex-1">
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</p>
                  {message.createdAt && (
                    <p className="text-xs opacity-60 mt-1.5">
                      {new Date(message.createdAt).toLocaleTimeString()}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* Streaming Indicator */}
        {isStreaming && (
          <div className="flex justify-start">
            <div className="bg-white/5 text-white border border-white/10 rounded-xl px-4 py-2.5 backdrop-blur-sm">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                <span className="text-sm">{displayName} is thinking...</span>
              </div>
            </div>
          </div>
        )}

        {/* Upload Items Display */}
        {uploads && uploads.length > 0 && (
          <div className="space-y-2">
            {uploads.map((upload) => (
              <div
                key={upload.id}
                className="flex items-center gap-2 px-3 py-2 bg-white/5 rounded-lg border border-white/10"
              >
                <Paperclip className="w-4 h-4 text-white/60" />
                <span className="text-sm text-white/80 flex-1 truncate">{upload.name}</span>
                {removeUpload && (
                  <button
                    onClick={() => removeUpload(upload.id)}
                    className="text-white/60 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Composer */}
      {showComposer && (
        <div className="flex-shrink-0 px-4 py-3 border-t border-white/10 bg-slate-900/50">
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".pdf,.png,.jpg,.jpeg,.csv"
            onChange={handleFileSelect}
            disabled={isStreaming}
          />

          <form onSubmit={handleSend} className="flex items-end gap-2">
            {/* File Upload Button */}
            {addUploadFiles && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isStreaming}
                className="p-2 rounded-lg bg-white/10 hover:bg-white/15 border border-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Upload file"
              >
                <Paperclip className="w-4 h-4 text-white/80" />
              </button>
            )}

            {/* Text Input */}
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={`Message ${displayName}...`}
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-white/50 resize-none focus:outline-none focus:border-amber-400/50 focus:ring-1 focus:ring-amber-400/20 transition-all"
              rows={1}
              disabled={isStreaming}
            />

            {/* Send Button */}
            <button
              type="submit"
              disabled={!input.trim() || isStreaming}
              className="p-2.5 bg-gradient-to-r from-amber-400 via-amber-300 to-amber-400 text-slate-900 rounded-xl hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
