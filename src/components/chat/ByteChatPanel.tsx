/**
 * ByteChatPanel Component
 * 
 * ⚠️ LEGACY: Not used by current dashboard – kept temporarily for reference.
 * 
 * All chat functionality now goes through UnifiedAssistantChat (slide-out) via useUnifiedChatLauncher().
 * This component is superseded by the unified chat system.
 * 
 * Byte (Smart Import AI) chat slideout panel using PrimeSlideoutShell
 * Scaffolded example for employee-specific chat panels
 */

import React, { useState, useRef, useEffect } from 'react';
import { Loader2, Send, User } from 'lucide-react';
import { useStreamChat } from '../../ui/hooks/useStreamChat';
import { EMPLOYEE_CHAT_CONFIG } from '../../config/employeeChatConfig';
import { useUnifiedChatLauncher } from '../../hooks/useUnifiedChatLauncher';
import { useChatSessions } from '../../hooks/useChatSessions';
import { PrimeSlideoutShell } from '../prime/PrimeSlideoutShell';
import { GuardrailNotice } from './GuardrailNotice';
import DesktopChatSideBar from './DesktopChatSideBar';

// Suggested prompts for Byte
const BYTE_SUGGESTED_PROMPTS = [
  { id: 'upload-doc', label: 'Upload a document', text: 'I want to upload a bank statement or receipt.' },
  { id: 'formats', label: 'What formats?', text: 'What file formats do you support for uploads?' },
  { id: 'history', label: 'Import history', text: 'Show me my recent imports and their status.' },
];

export interface ByteChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  conversationId?: string;
}

export function ByteChatPanel({
  isOpen,
  onClose,
  conversationId,
}: ByteChatPanelProps) {
  const [inputMessage, setInputMessage] = useState('');
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const userJustSentRef = useRef(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const { setActiveEmployee: setActiveEmployeeGlobal } = useUnifiedChatLauncher();
  const { loadSessions } = useChatSessions({ autoLoad: false });

  const {
    messages,
    isStreaming,
    error,
    sendMessage,
  } = useStreamChat({
    employeeSlug: 'byte-docs',
    conversationId,
  });

  const config = EMPLOYEE_CHAT_CONFIG['byte-docs'];

  // Scroll-to-bottom helper
  const scrollToBottom = (smooth = true) => {
    const container = scrollContainerRef.current;
    const end = messagesEndRef.current;
    if (!container || !end) return;
    const behavior: ScrollBehavior = smooth ? 'smooth' : 'auto';
    requestAnimationFrame(() => {
      end.scrollIntoView({ behavior, block: 'end' });
    });
  };

  // Auto-scroll effect
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const threshold = 80;
    const distanceFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;
    const shouldStickToBottom =
      userJustSentRef.current || distanceFromBottom < threshold;
    if (shouldStickToBottom) {
      scrollToBottom(true);
    }
    if (userJustSentRef.current) {
      userJustSentRef.current = false;
    }
  }, [messages.length, isStreaming]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => scrollToBottom(false), 200);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmedMessage = inputMessage.trim();
    if (!trimmedMessage || isStreaming) return;
    setInputMessage('');
    userJustSentRef.current = true;
    scrollToBottom(false);
    try {
      await sendMessage(trimmedMessage);
      setTimeout(() => loadSessions(), 2000);
    } catch (err) {
      console.error('[ByteChatPanel] Send failed:', err);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handlePromptClick = (text: string) => {
    setInputMessage(text);
    setTimeout(() => {
      inputRef.current?.focus();
      if (inputRef.current) {
        inputRef.current.setSelectionRange(text.length, text.length);
      }
    }, 0);
  };

  if (!isOpen) return null;

  const displayMessages = messages.filter((m) => m.role !== 'system');

  const statusBadge = (
    <div className="flex items-center gap-2 text-xs text-emerald-300">
      <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.9)]" />
      <span>Online</span>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative z-50 h-full flex items-stretch">
        <div className="hidden md:flex h-full items-center">
          <DesktopChatSideBar dockedToPanel />
        </div>
        <div className="relative h-full w-full">
          <PrimeSlideoutShell
            title={config.title}
            subtitle={config.subtitle || config.description}
            statusBadge={statusBadge}
            icon={<span>{config.emoji}</span>}
            onClose={onClose}
            footer={
              <div className="space-y-3">
                {BYTE_SUGGESTED_PROMPTS.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {BYTE_SUGGESTED_PROMPTS.map((prompt) => (
                      <button
                        key={prompt.id}
                        type="button"
                        onClick={() => handlePromptClick(prompt.text)}
                        className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-slate-50/90 hover:bg-white/10 hover:border-white/20 transition"
                      >
                        {prompt.label}
                      </button>
                    ))}
                  </div>
                )}
                <form onSubmit={handleSend} className="flex items-center gap-3">
                  <div className="flex-1">
                    <textarea
                      ref={inputRef}
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      onKeyDown={handleKeyPress}
                      placeholder={`Ask ${config.title.split('—')[0].trim()} anything...`}
                      className="h-12 w-full resize-none rounded-2xl border border-white/10 bg-[#050816]/80 px-4 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/60"
                      rows={1}
                      disabled={isStreaming}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={!inputMessage.trim() || isStreaming}
                    className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400 via-cyan-400 to-emerald-400 shadow-[0_0_22px_rgba(56,189,248,0.65)] transition-transform duration-150 hover:scale-[1.05] active:scale-[0.97] disabled:opacity-60 disabled:shadow-none"
                    aria-label="Send message"
                  >
                    {isStreaming ? (
                      <Loader2 className="h-5 w-5 text-slate-950 animate-spin" />
                    ) : (
                      <Send className="h-5 w-5 text-slate-950" />
                    )}
                  </button>
                </form>
              </div>
            }
          >
            <GuardrailNotice />
            <div
              ref={scrollContainerRef}
              className="flex-1 overflow-y-auto px-8 pt-2 pb-4 space-y-4 hide-scrollbar"
            >
              <div className="space-y-3">
                {displayMessages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex scroll-mt-10 ${
                      message.role === 'user' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <div
                      className={`flex items-start gap-2 max-w-[85%] ${
                        message.role === 'user' ? 'flex-row-reverse' : ''
                      }`}
                    >
                      {message.role === 'user' ? (
                        <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-slate-700">
                          <User className="w-4 h-4 text-slate-200" />
                        </div>
                      ) : (
                        <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-gradient-to-br from-sky-400 via-cyan-400 to-emerald-400 text-sm">
                          {config.emoji}
                        </div>
                      )}
                      <div
                        className={`px-4 py-2 text-sm rounded-2xl ${
                          message.role === 'user'
                            ? 'border border-sky-400/70 bg-slate-900/90 text-slate-50 shadow-[0_0_24px_rgba(56,189,248,0.60)]'
                            : 'bg-slate-800/80 text-slate-100 border border-slate-700/70'
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap leading-relaxed">
                          {message.content}
                        </p>
                        <p className="text-[10px] mt-1.5 opacity-60">
                          {message.timestamp.toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
                {isStreaming && (
                  <div className="flex justify-start">
                    <div className="flex items-center gap-2 bg-slate-800/80 rounded-2xl px-4 py-2.5 border border-white/5">
                      <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                      <span className="text-sm text-slate-300">
                        Byte is thinking...
                      </span>
                    </div>
                  </div>
                )}
                {error && (
                  <div className="flex justify-center">
                    <div className="bg-red-900/50 border border-red-500/30 rounded-lg px-4 py-3 text-sm text-red-300">
                      ⚠️ {error.message}
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>
          </PrimeSlideoutShell>
        </div>
      </div>
    </div>
  );
}


