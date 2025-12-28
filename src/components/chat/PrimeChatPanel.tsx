/**
 * PrimeChatPanel Component
 * 
 * ⚠️ LEGACY: Duplicate of UnifiedAssistantChat functionality.
 * 
 * All chat functionality now goes through UnifiedAssistantChat (slide-out) via useUnifiedChatLauncher().
 * This component is superseded by the unified chat system.
 * 
 * Prime chat slideout panel using PrimeSlideoutShell
 * Reuses UnifiedAssistantChat logic but renders in the Team/Tasks slideout style
 */

import React, { useState, useRef, useEffect } from 'react';
import { Loader2, Send, User, ArrowRight, Upload, Eye, EyeOff, History, LayoutDashboard, Grid3X3, Tags, LineChart } from 'lucide-react';
import { useStreamChat } from '../../ui/hooks/useStreamChat';
import { getEmployeeDisplay } from '../../utils/employeeUtils';
import { EMPLOYEE_CHAT_CONFIG } from '../../config/employeeChatConfig';
import { useAuth } from '../../contexts/AuthContext';
import { useUnifiedChatLauncher } from '../../hooks/useUnifiedChatLauncher';
import { PrimeLogoBadge } from '../branding/PrimeLogoBadge';
import { useChatSessions } from '../../hooks/useChatSessions';
import { PrimeSlideoutShell } from '../prime/PrimeSlideoutShell';
import { GuardrailNotice } from './GuardrailNotice';
import DesktopChatSideBar from './DesktopChatSideBar';
import { Button } from '../ui/button';
import { useNavigate } from 'react-router-dom';
import { usePrimeOverlaySafe } from '../../context/PrimeOverlayContext';

// Suggested prompts for Prime
const PRIME_SUGGESTED_PROMPTS = [
  { id: 'upload', label: 'Upload bank statements', text: 'Help me upload and process my bank statements.' },
  { id: 'spending', label: 'Explain my spending', text: 'Explain my recent spending patterns and any trends.' },
  { id: 'categories', label: 'Fix my categories', text: 'Review my categories and fix anything that looks wrong.' },
];

export interface PrimeChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  initialEmployeeSlug?: string;
  conversationId?: string;
}

export function PrimeChatPanel({
  isOpen,
  onClose,
  initialEmployeeSlug = 'prime-boss',
  conversationId,
}: PrimeChatPanelProps) {
  const [inputMessage, setInputMessage] = useState('');
  const [isRailHidden, setIsRailHidden] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const userJustSentRef = useRef(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const navigate = useNavigate();
  const { setPrimeToolsOpen } = usePrimeOverlaySafe();

  // Get unified chat launcher for handoff support
  const { setActiveEmployee: setActiveEmployeeGlobal, activeEmployeeSlug: globalActiveEmployeeSlug, openChat } = useUnifiedChatLauncher();

  // Use chat sessions hook to refresh history after messages
  const { loadSessions } = useChatSessions({ autoLoad: false });

  // Use streaming chat hook
  const {
    messages,
    isStreaming,
    error,
    isToolExecuting,
    currentTool,
    activeEmployeeSlug: streamActiveEmployeeSlug,
    sendMessage,
  } = useStreamChat({
    employeeSlug: initialEmployeeSlug,
    conversationId,
  });

  // Use global active employee slug as primary source
  const currentEmployeeSlug = globalActiveEmployeeSlug || streamActiveEmployeeSlug || initialEmployeeSlug || 'prime-boss';
  const normalizedSlug = (currentEmployeeSlug?.toLowerCase().trim() || 'prime-boss') as keyof typeof EMPLOYEE_CHAT_CONFIG;
  const config = EMPLOYEE_CHAT_CONFIG[normalizedSlug] ?? EMPLOYEE_CHAT_CONFIG['prime-boss'];
  // Guardrails status now comes from useGuardrailsHealth hook (real-time health check)
  // Removed hardcoded guardrailsActive - use health endpoint instead

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

  // Auto-scroll effect when messages change
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

  // Scroll to bottom when panel opens
  useEffect(() => {
    if (isOpen) {
      const timeoutId = setTimeout(() => {
        scrollToBottom(false);
      }, 200);
      return () => clearTimeout(timeoutId);
    }
  }, [isOpen]);

  // Handle Escape key to close
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Handle send
  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const trimmedMessage = inputMessage.trim();
    if (!trimmedMessage || isStreaming) return;

    setInputMessage('');
    userJustSentRef.current = true;
    scrollToBottom(false);

    try {
      await sendMessage(trimmedMessage);
      setTimeout(() => {
        loadSessions();
      }, 2000);
    } catch (err) {
      console.error('[PrimeChatPanel] Send failed:', err);
    }
  };

  // Handle key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Handle prompt click
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

  // Filter out system messages for display
  const displayMessages = messages.filter((m) => m.role !== 'system');

  // Status badge
  const statusBadge = (
    <div className="flex items-center gap-2 text-xs text-emerald-300">
      <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.9)]" />
      <span>Online</span>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Panel with rail inside */}
      <div className="relative z-50 h-full">
        <PrimeSlideoutShell
          title="PRIME — CHAT"
          subtitle="Your strategic AI CEO orchestrating 30+ specialized employees. I route tasks, coordinate workflows, and get you the right expert for every question."
          statusBadge={statusBadge}
          icon={<span>👑</span>}
          floatingRail={
            <div className={`hidden md:flex flex-col gap-3 transition-opacity duration-200 ${isRailHidden ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
              {/* PRIME crown */}
              <button
                type="button"
                onClick={() => {
                  openChat({
                    initialEmployeeSlug: 'prime-boss',
                    context: {
                      source: 'rail-prime',
                    },
                  });
                }}
                className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 via-orange-500 to-pink-500 shadow-lg shadow-amber-500/40 hover:shadow-amber-500/60 transition-shadow"
                aria-label="Prime"
              >
                <PrimeLogoBadge size={40} showGlow={true} />
              </button>

              {/* Byte - Smart Import */}
              <button
                type="button"
                onClick={() => {
                  openChat({
                    initialEmployeeSlug: 'byte-docs',
                    context: {
                      source: 'rail-byte',
                    },
                  });
                }}
                className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-900/90 border border-slate-700/80 hover:bg-slate-800/90 hover:border-slate-600/80 transition-colors"
                aria-label="Smart Import"
              >
                <Upload className="w-5 h-5 text-slate-300" />
              </button>

              {/* Tag - Smart Categories */}
              <button
                type="button"
                onClick={() => {
                  openChat({
                    initialEmployeeSlug: 'tag-ai',
                    context: {
                      source: 'rail-tag',
                    },
                  });
                }}
                className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-900/90 border border-slate-700/80 hover:bg-slate-800/90 hover:border-slate-600/80 transition-colors"
                aria-label="Smart Categories"
              >
                <Tags className="w-5 h-5 text-slate-300" />
              </button>

              {/* Crystal - Analytics */}
              <button
                type="button"
                onClick={() => {
                  openChat({
                    initialEmployeeSlug: 'crystal-analytics',
                    context: {
                      source: 'rail-analytics',
                    },
                  });
                }}
                className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-900/90 border border-slate-700/80 hover:bg-slate-800/90 hover:border-slate-600/80 transition-colors"
                aria-label="Analytics"
              >
                <LineChart className="w-5 h-5 text-slate-300" />
              </button>

              {/* Hide/Show rail */}
              <button
                type="button"
                onClick={() => setIsRailHidden(!isRailHidden)}
                className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-900/90 border border-slate-700/80 hover:bg-slate-800/90 hover:border-slate-600/80 transition-colors"
                aria-label={isRailHidden ? "Show rail" : "Hide rail"}
              >
                {isRailHidden ? (
                  <Eye className="w-5 h-5 text-slate-300" />
                ) : (
                  <EyeOff className="w-5 h-5 text-slate-300" />
                )}
              </button>

              {/* History */}
              <button
                type="button"
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('openChatHistory'));
                }}
                className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-900/90 border border-slate-700/80 hover:bg-slate-800/90 hover:border-slate-600/80 transition-colors"
                aria-label="Chat history"
              >
                <History className="w-5 h-5 text-slate-300" />
              </button>

              {/* Workspace */}
              <button
                type="button"
                onClick={() => {
                  navigate('/dashboard/prime-chat');
                }}
                className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-900/90 border border-slate-700/80 hover:bg-slate-800/90 hover:border-slate-600/80 transition-colors"
                aria-label="Prime Workspace"
              >
                <LayoutDashboard className="w-5 h-5 text-slate-300" />
              </button>

              {/* Prime Tools */}
              <button
                type="button"
                onClick={() => {
                  setPrimeToolsOpen(true);
                }}
                className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-900/90 border border-slate-700/80 hover:bg-slate-800/90 hover:border-slate-600/80 transition-colors"
                aria-label="Prime Tools"
              >
                <Grid3X3 className="w-5 h-5 text-slate-300" />
              </button>
            </div>
          }
            onClose={onClose}
            showGuardrailsBanner={false}
            footer={
              <footer className="border-t border-slate-800/80 bg-slate-950/90 px-4 py-3 backdrop-blur-md">
                <div className="mx-auto w-full max-w-2xl">
                  {/* Quick actions row */}
                  <div className="mb-2 flex flex-wrap justify-start gap-2">
                    {PRIME_SUGGESTED_PROMPTS.map((prompt) => (
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

                  {/* Input bar + guardrails */}
                  <form onSubmit={handleSend}>
                    <div className="flex items-center gap-2 rounded-2xl border border-slate-700/80 bg-slate-900/90 px-3 py-1.5">
                      <textarea
                        ref={inputRef}
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                        onKeyDown={handleKeyPress}
                        placeholder="Ask Prime anything..."
                        rows={1}
                        disabled={isStreaming}
                        className="max-h-24 flex-1 resize-none border-0 bg-transparent p-0 text-sm text-slate-50 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                      />

                    <Button
                      type="submit"
                      size="icon"
                      disabled={isStreaming || !inputMessage.trim()}
                      variant="ghost"
                      className="h-9 w-9 shrink-0 rounded-full bg-gradient-to-br from-amber-400 via-orange-500 to-pink-500 text-slate-950 shadow-lg shadow-amber-500/30 hover:from-amber-300 hover:via-orange-400 hover:to-pink-500 disabled:opacity-60"
                    >
                      {isStreaming ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                    </div>

                    {/* Guardrails status removed - shown in bottom pill via UnifiedAssistantChat */}
                    {/* This hardcoded message was replaced with real-time health check status */}
                  </form>
                </div>
              </footer>
            }
          >
            {/* Messages area */}
            <div className="flex h-full flex-col">
              <div
                ref={scrollContainerRef}
                className="flex-1 overflow-y-auto px-4 pt-3 pb-32 space-y-3 hide-scrollbar"
              >
                {/* Messages list */}
                <div className="space-y-3">
                  {displayMessages.map((message) => {
            const isHandoffMessage =
              message.role === 'assistant' &&
              (message.content.toLowerCase().includes('bring in') ||
                message.content.toLowerCase().includes('handoff') ||
                message.content.toLowerCase().includes('connect you with'));

            return (
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
                  {/* Avatar */}
                  {message.role === 'user' ? (
                    <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-slate-700">
                      <User className="w-4 h-4 text-slate-200" />
                    </div>
                  ) : (
                    <PrimeLogoBadge size={32} className="flex-shrink-0" />
                  )}

                  {/* Message bubble */}
                  <div
                    className={`px-4 py-2 text-sm rounded-2xl ${
                      message.role === 'user'
                        ? 'border border-amber-400/70 bg-slate-900/90 text-slate-50 shadow-[0_0_24px_rgba(251,191,36,0.60)]'
                        : isHandoffMessage
                        ? 'bg-purple-900/40 border border-purple-500/30 text-slate-100'
                        : 'bg-slate-800/80 text-slate-100 border border-slate-700/70'
                    }`}
                  >
                    {isHandoffMessage && (
                      <div className="flex items-center gap-1.5 mb-2 text-purple-300 text-xs">
                        <ArrowRight className="w-3 h-3" />
                        <span className="font-medium">Handoff</span>
                      </div>
                    )}
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">
                      {message.content}
                    </p>
                    <p className="text-[10px] mt-1.5 opacity-60">
                      {message.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}

                  {/* Loading indicator */}
                  {isStreaming && (
                    <div className="flex justify-start">
                      <div className="flex items-center gap-2 bg-slate-800/80 rounded-2xl px-4 py-2.5 border border-white/5">
                        <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                        <span className="text-sm text-slate-300">
                          Prime is thinking{isToolExecuting && currentTool ? ` (using ${currentTool})` : ''}...
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Error message */}
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
            </div>
        </PrimeSlideoutShell>
      </div>
    </div>
  );
}

