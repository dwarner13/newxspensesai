/**
 * Unified Assistant Chat Component
 * 
 * Unified chat interface that can be used for any AI employee.
 * Renders as a slideout panel on the right side, keeping page content visible.
 * Styled to match Prime Tasks and Prime Team panels for visual consistency.
 */

import React, { useState, useRef, useEffect } from 'react';
import { Loader2, Send, User, ArrowRight, X } from 'lucide-react';
import { useStreamChat } from '../../ui/hooks/useStreamChat';
import { getEmployeeDisplay } from '../../utils/employeeUtils';
import { EMPLOYEE_CHAT_CONFIG } from '../../config/employeeChatConfig';
import { InlineUploadCard } from './InlineUploadCard';
import { StatusIndicator, type StatusType } from './StatusIndicator';
import { useAuth } from '../../contexts/AuthContext';
import { useByteInlineUpload } from '../../hooks/useByteInlineUpload';
import { ByteInlineUpload } from './ByteInlineUpload';
import { useUnifiedChatLauncher } from '../../hooks/useUnifiedChatLauncher';
import type { QuickAction } from '../../config/employeeChatConfig';
import { PrimeLogoBadge } from '../branding/PrimeLogoBadge';

// Suggested prompts for each employee - compact pills that prefill the input
const SUGGESTED_PROMPTS_BY_EMPLOYEE: Record<string, { id: string; label: string; text: string }[]> = {
  'prime-boss': [
    { id: 'upload', label: 'Upload bank statements', text: 'Help me upload and process my bank statements.' },
    { id: 'spending', label: 'Explain my spending', text: 'Explain my recent spending patterns and any trends.' },
    { id: 'categories', label: 'Fix my categories', text: 'Review my categories and fix anything that looks wrong.' },
  ],
  'byte-docs': [
    { id: 'upload-doc', label: 'Upload a document', text: 'I want to upload a bank statement or receipt.' },
    { id: 'formats', label: 'What formats?', text: 'What file formats do you support for uploads?' },
    { id: 'history', label: 'Import history', text: 'Show me my recent imports and their status.' },
  ],
  'tag-ai': [
    { id: 'clean-cats', label: 'Clean my categories', text: 'Go through my transactions and clean up the categories.' },
    { id: 'uncategorized', label: 'Show uncategorized', text: 'Show me all uncategorized transactions.' },
    { id: 'create-rule', label: 'Create a rule', text: 'Help me create a new categorization rule.' },
  ],
  'crystal-analytics': [
    { id: 'spending-insights', label: 'Spending insights', text: 'Give me insights about my spending patterns.' },
    { id: 'monthly-summary', label: 'Monthly summary', text: 'Show me a summary of my spending this month.' },
    { id: 'top-merchants', label: 'Top merchants', text: 'What are my top merchants by spending?' },
  ],
};

interface UnifiedAssistantChatProps {
  /** Whether chat is open */
  isOpen: boolean;
  
  /** Close handler */
  onClose: () => void;
  
  /** Initial employee slug */
  initialEmployeeSlug?: string;
  
  /** Conversation ID */
  conversationId?: string;
  
  /** Context data */
  context?: any;
  
  /** Initial question */
  initialQuestion?: string;
}

export default function UnifiedAssistantChat({
  isOpen,
  onClose,
  initialEmployeeSlug = 'prime-boss',
  conversationId,
  context,
  initialQuestion,
}: UnifiedAssistantChatProps) {
  const [inputMessage, setInputMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [showUploadCard, setShowUploadCard] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<StatusType | null>(null);
  
  // Get userId for uploads
  const { userId } = useAuth();
  
  // Get unified chat launcher for handoff support
  const { setActiveEmployee: setActiveEmployeeGlobal, activeEmployeeSlug: globalActiveEmployeeSlug } = useUnifiedChatLauncher();

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

  // Use global active employee slug as primary source (for handoff), fallback to stream's internal state
  // This allows frontend handoffs to work immediately while backend handoffs sync via stream events
  const currentEmployeeSlug = globalActiveEmployeeSlug || streamActiveEmployeeSlug || initialEmployeeSlug || 'prime-boss';
  const normalizedSlug = (currentEmployeeSlug?.toLowerCase().trim() || 'prime-boss') as keyof typeof EMPLOYEE_CHAT_CONFIG;
  const config = EMPLOYEE_CHAT_CONFIG[normalizedSlug] ?? EMPLOYEE_CHAT_CONFIG['prime-boss'];
  
  // Get suggested prompts for current employee
  const suggestedPrompts = SUGGESTED_PROMPTS_BY_EMPLOYEE[normalizedSlug] ?? [];
  
  // Check if Byte is active
  const isByte = normalizedSlug === 'byte-docs';
  
  // Initialize Byte upload hook only when Byte is active
  const {
    isUploading: isByteUploading,
    progressLabel: byteProgressLabel,
    handleFilesSelected: handleByteFilesSelected,
    error: byteUploadError,
  } = useByteInlineUpload(isByte ? userId : undefined);

  // Auto-scroll to bottom when messages change, streaming starts/stops, or errors appear
  useEffect(() => {
    // Small delay to ensure DOM has updated
    const timeoutId = setTimeout(() => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }
    }, 100);
    
    return () => clearTimeout(timeoutId);
  }, [messages, isStreaming, error]);

  // Scroll to bottom when chat opens
  useEffect(() => {
    if (isOpen) {
      // Delay to ensure panel is rendered
      const timeoutId = setTimeout(() => {
        if (messagesEndRef.current) {
          messagesEndRef.current.scrollIntoView({ behavior: 'auto', block: 'end' });
        }
      }, 200);
      
      return () => clearTimeout(timeoutId);
    }
  }, [isOpen]);

  // Sync useStreamChat's activeEmployeeSlug with global state when it changes
  // This ensures frontend handoffs work correctly
  useEffect(() => {
    // When global active employee changes (via handoff), we need to ensure
    // useStreamChat uses the correct employee slug for the next message
    // Note: useStreamChat will sync via backend handoff events, but for
    // immediate frontend handoffs, we rely on the global state being correct
    // The actual message sending will use currentEmployeeSlug which comes from global state
  }, [globalActiveEmployeeSlug]);

  // Handle send - use currentEmployeeSlug to ensure correct employee receives message
  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    const trimmedMessage = inputMessage.trim();
    if (!trimmedMessage || isStreaming) return;
    
    // Clear input immediately for better UX (don't wait for send to complete)
    setInputMessage('');
    
    // If the global active employee differs from stream's internal state,
    // we need to ensure the message goes to the correct employee
    // For now, useStreamChat will use its internal activeEmployeeSlug,
    // but backend handoff events will sync it. For immediate handoffs,
    // the user will see the UI update and can send to the new employee.
    try {
      await sendMessage(trimmedMessage);
    } catch (err) {
      // Error is handled by useStreamChat and displayed in UI
      // Input stays cleared even if send fails
      console.error('[UnifiedAssistantChat] Send failed:', err);
    }
  };

  // Handle key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Handle prompt click - prefills input
  const handlePromptClick = (text: string) => {
    setInputMessage(text);
    // Focus the input after a short delay to ensure it's rendered
    setTimeout(() => {
      inputRef.current?.focus();
      // Move cursor to end of text
      if (inputRef.current) {
        inputRef.current.setSelectionRange(text.length, text.length);
      }
    }, 0);
  };

  // Handle quick action click (legacy - for simple actions)
  const handleQuickAction = async (action: string) => {
    try {
      await sendMessage(action);
    } catch (err) {
      console.error('[UnifiedAssistantChat] Quick action send failed:', err);
    }
  };

  // Handle quick action click with handoff support (kept for backward compatibility, but not used in UI anymore)
  const handleQuickActionClick = (action: QuickAction) => {
    // 1) Optional: insert a friendly Prime system message in the current chat
    if (normalizedSlug === 'prime-boss' && action.targetEmployeeSlug) {
      const targetConfig = EMPLOYEE_CHAT_CONFIG[action.targetEmployeeSlug as keyof typeof EMPLOYEE_CHAT_CONFIG];
      const targetName = targetConfig?.title ?? action.targetEmployeeSlug;
      
      // Add a system-like message (we'll add it to messages state)
      const handoffMessage = {
        id: `handoff-${Date.now()}`,
        role: 'assistant' as const,
        content: `I'll connect you with ${targetName}. One moment…`,
        timestamp: new Date(),
      };
      
      // Note: We can't directly modify messages from useStreamChat, so we'll rely on visual feedback
      // The handoff will be visually clear from the employee switch
    }

    // 2) If the quick action targets another employee, switch the active employee
    if (action.targetEmployeeSlug) {
      // Update global state
      setActiveEmployeeGlobal(action.targetEmployeeSlug);
      
      // Note: useStreamChat will sync when backend sends handoff events
      // For immediate UI feedback, we rely on the global state update
      // The component will re-render and show the new employee's branding
    }

    // 3) Prefill the input with a suggested prompt
    if (action.suggestedPrompt) {
      setInputMessage(action.suggestedPrompt);
    } else if (action.action) {
      // Fallback to legacy action field
      setInputMessage(action.action);
    }
  };

  // Handle file upload
  const handleFileUpload = async (files: File[]) => {
    setUploadStatus('uploading');
    setShowUploadCard(true);
    
    // TODO: Integrate with actual upload API
    // For now, simulate upload
    setTimeout(() => {
      setUploadStatus('extracting');
      setTimeout(() => {
        setUploadStatus(null);
        setShowUploadCard(false);
        // Send message about upload completion
        sendMessage(`I've uploaded ${files.length} file(s): ${files.map(f => f.name).join(', ')}`);
      }, 2000);
    }, 1000);
  };

  // Detect handoff messages and upload intent
  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage && lastMessage.role === 'assistant') {
      const content = lastMessage.content.toLowerCase();
      
      // Detect upload intent for Byte
      if (currentEmployeeSlug === 'byte-docs' && (content.includes('upload') || content.includes('document'))) {
        setShowUploadCard(true);
      }
    }
  }, [messages, currentEmployeeSlug]);

  // Send system message when Byte upload starts/completes
  useEffect(() => {
    if (!isByte || !userId) return;

    if (isByteUploading && byteProgressLabel) {
      // Upload started - could send a system message here if desired
      // For now, the status indicator is sufficient
    }
  }, [isByte, isByteUploading, byteProgressLabel, userId]);

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

  if (!isOpen) return null;

  const employeeDisplay = getEmployeeDisplay(currentEmployeeSlug);

  // Filter out system messages for display
  const displayMessages = messages.filter((m) => m.role !== 'system');
  
  // Check if user has sent/received any messages (not just system messages)
  const hasMessages = displayMessages.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* Panel - Premium floating card */}
      {/* mr-28 ensures content doesn't overlap with floating rail on the right */}
      <aside
        className="
          relative z-50 my-6 mr-28 flex h-[calc(100vh-3rem)] w-full max-w-xl flex-col
          overflow-hidden rounded-[28px] border border-white/5
          bg-slate-950/90 backdrop-blur-2xl
          shadow-[0_18px_80px_rgba(0,0,0,0.75)]
          max-lg:mr-4
        "
        aria-label={`${employeeDisplay.shortName} chat sidebar`}
      >
        {/* Root container - flex column for proper scrolling */}
        <div className="flex h-full flex-col">
          {/* HEADER - sticky, matches Prime panels */}
          <header className="sticky top-0 z-20 border-b border-slate-800/70 bg-slate-950/90 px-6 pt-5 pb-4 backdrop-blur-sm">
            <div className="flex items-start justify-between gap-3">
              {/* Left side - Employee info */}
              <div className="flex items-center gap-3">
                {normalizedSlug === 'prime-boss' ? (
                  <PrimeLogoBadge size={40} showGlow={false} />
                ) : (
                  <div className={`flex h-11 w-11 items-center justify-center rounded-2xl text-xl bg-gradient-to-br ${config.gradient}`}>
                    <span>{config.emoji}</span>
                  </div>
                )}
                <div className="flex flex-col">
                  <span className="text-sm font-semibold tracking-wide text-slate-50 uppercase">
                    {config.title}
                  </span>
                  {config.subtitle && (
                    <span className="text-xs text-slate-400">
                      {config.subtitle}
                    </span>
                  )}
                </div>
              </div>

              {/* Right side - Status + Close */}
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  Online
                </span>
                <button
                  onClick={onClose}
                  className="p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800/80 rounded-lg transition-colors"
                  aria-label="Close chat"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </header>

          {/* AI Role Section - shows agent's purpose */}
          <div className="px-6 pt-3 pb-2 border-b border-white/5 shrink-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              AI Role
            </p>
            <p className="mt-1 text-sm text-slate-200/80 leading-relaxed">
              {config.description ?? config.subtitle ?? config.welcomeMessage}
            </p>
          </div>

          {/* MIDDLE - Scrollable content area (Quick Actions OR Messages) */}
          <div className="flex-1 min-h-0 overflow-y-auto px-6 pt-4 pb-4 space-y-4 hide-scrollbar">
            {/* Status indicator - shown when processing */}
            {uploadStatus && (
              <div className="shrink-0">
                <StatusIndicator status={uploadStatus} />
              </div>
            )}

            {/* Byte inline upload - shown only for Byte */}
            {isByte && (
              <ByteInlineUpload
                onFilesSelected={handleByteFilesSelected}
                isUploading={isByteUploading}
                progressLabel={byteProgressLabel}
                error={byteUploadError}
              />
            )}

            {/* Legacy upload card for Byte (kept for backward compatibility) */}
            {showUploadCard && currentEmployeeSlug === 'byte-docs' && !isByte && (
              <div className="shrink-0">
                <InlineUploadCard
                  onUpload={handleFileUpload}
                  onClose={() => setShowUploadCard(false)}
                  isProcessing={uploadStatus !== null}
                  processingMessage={uploadStatus === 'uploading' ? 'Uploading your file...' : 'Extracting transactions...'}
                />
              </div>
            )}

            {/* Messages list - always rendered, but only visible when hasMessages is true */}
            <div className="space-y-3">
              {displayMessages.map((message) => {
                // Detect handoff messages
                const isHandoffMessage = message.role === 'assistant' && 
                  (message.content.toLowerCase().includes('bring in') || 
                   message.content.toLowerCase().includes('handoff') ||
                   message.content.toLowerCase().includes('connect you with'));
                
                return (
                  <div
                    key={message.id}
                    className={`flex ${
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
                      ) : normalizedSlug === 'prime-boss' ? (
                        <PrimeLogoBadge size={32} className="flex-shrink-0" />
                      ) : (
                        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-gradient-to-br ${config.gradient}`}>
                          <span className="text-sm">{config.emoji}</span>
                        </div>
                      )}

                      {/* Message bubble */}
                      <div
                        className={`rounded-2xl px-4 py-2.5 ${
                          message.role === 'user'
                            ? `bg-gradient-to-br ${config.gradient} text-white`
                            : isHandoffMessage
                            ? 'bg-purple-900/40 border border-purple-500/30 text-slate-100'
                            : 'bg-slate-800/80 text-slate-100 border border-white/5'
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
                      {config.title.split('—')[0].trim()} is thinking{isToolExecuting && currentTool ? ` (using ${currentTool})` : ''}...
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

          {/* Suggested Prompts - Compact row above input */}
          {suggestedPrompts.length > 0 && (
            <div className="border-t border-white/5 px-6 pt-3 pb-2 shrink-0">
              <div className="flex flex-wrap gap-2">
                {suggestedPrompts.map((prompt) => (
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
            </div>
          )}

          {/* FOOTER - Fixed input at bottom */}
          <footer className="border-t border-white/5 px-6 py-4 shrink-0">
            <form onSubmit={handleSend} className="flex items-end gap-2">
              <div className="flex-1 rounded-2xl bg-slate-950/80 border border-white/10 px-3 py-2.5 flex items-center gap-2">
                <textarea
                  ref={inputRef}
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder={`Ask ${config.title.split('—')[0].trim()} anything...`}
                  className="max-h-24 min-h-[22px] flex-1 resize-none bg-transparent text-sm text-slate-50 placeholder:text-slate-500 focus:outline-none"
                  rows={1}
                  disabled={isStreaming}
                />
              </div>
              <button
                type="submit"
                disabled={!inputMessage.trim() || isStreaming}
                className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-fuchsia-500 via-amber-400 to-rose-500 text-slate-950 shadow-lg disabled:opacity-60 disabled:cursor-not-allowed transition-all hover:scale-105"
              >
                {isStreaming ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </button>
            </form>
          </footer>
        </div>
      </aside>
    </div>
  );
}
