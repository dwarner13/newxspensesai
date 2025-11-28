/**
 * EmployeeChatWorkspace Component
 * 
 * Generic reusable chat workspace component for any AI employee
 * Reuses all chat logic from UnifiedAssistantChat but renders inline instead of slide-out
 * 
 * This component shares the same backend (/netlify/functions/chat) and state management
 * as UnifiedAssistantChat, ensuring consistency across all chat interfaces.
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Paperclip, Image, Mic, Send } from 'lucide-react';
import { usePrimeChat, type ChatMessage } from '../../hooks/usePrimeChat';
import { useAuth } from '../../contexts/AuthContext';
import { getEmployeeInfo, getEmployeeName } from '../../utils/employeeUtils';
import { useSmartImport } from '../../hooks/useSmartImport';
import { useUnifiedChatLauncher } from '../../hooks/useUnifiedChatLauncher';
import { format } from 'date-fns';
import { cn } from '../../lib/utils';

export interface EmployeeChatWorkspaceProps {
  employeeSlug: string;
  initialQuestion?: string;
  conversationId?: string;
  className?: string;
  showHeader?: boolean; // Control whether to show the internal header
  showComposer?: boolean; // Control whether to show the composer (input area)
  onSendFunctionReady?: (sendFn: (message: string) => Promise<void>) => void; // Callback to expose send function to parent
  onStreamingStateChange?: (isStreaming: boolean) => void; // Callback to expose streaming state
  onGuardrailsStateChange?: (guardrailsActive: boolean, piiProtectionActive: boolean) => void; // Callback to expose guardrails state
}

// MessageBubble component (reused from UnifiedAssistantChat)
function MessageBubble({ message, activeEmployeeSlug }: { message: ChatMessage; activeEmployeeSlug: string }) {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';
  
  // Extract employee from system messages (handoff messages)
  const handoffMatch = message.content.match(/Transferred from (\w+) to (\w+)/);
  
  if (isSystem && handoffMatch) {
    const [, from, to] = handoffMatch;
    return (
      <div className="flex justify-center my-4">
        <div className="px-4 py-2 rounded-full bg-gradient-to-r from-purple-500/20 to-blue-500/20 border border-purple-500/30 flex items-center gap-2 text-sm text-slate-300">
          <span className="animate-pulse">🔄</span>
          <span>{getEmployeeName(from)} → {getEmployeeName(to)}</span>
        </div>
      </div>
    );
  }

  if (isSystem) {
    return (
      <div className="flex justify-center">
        <div className="px-3 py-1.5 rounded-full bg-slate-800/50 text-xs text-slate-400">
          {String(message.content || '')}
        </div>
      </div>
    );
  }

  if (isUser) {
    return (
      <div className="flex justify-end mb-3">
        <div className="max-w-[85%] px-4 py-2 rounded-2xl bg-blue-600 shadow-sm">
          <p className="text-sm text-white whitespace-pre-wrap break-words">
            {String(message.content || '')}
          </p>
          {message.createdAt && (
            <p className="text-xs text-white/70 mt-1">
              {format(new Date(message.createdAt), 'h:mm a')}
            </p>
          )}
        </div>
      </div>
    );
  }

  // Assistant message - use activeEmployeeSlug from component state
  const employee = getEmployeeInfo(activeEmployeeSlug);

  return (
    <div className="flex justify-start mb-3">
      <div className="max-w-[85%] px-4 py-2 rounded-2xl bg-slate-800/70 text-slate-100 border border-slate-700/50 shadow-sm">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-lg">{employee.emoji}</span>
          <span className="text-xs font-medium text-slate-300">
            {employee.name}
          </span>
        </div>
        <p className="text-sm text-slate-100 whitespace-pre-wrap break-words">
          {String(message.content || '')}
        </p>
        {message.createdAt && (
          <p className="text-xs text-slate-400 mt-1">
            {format(new Date(message.createdAt), 'h:mm a')}
          </p>
        )}
      </div>
    </div>
  );
}

export function EmployeeChatWorkspace({
  employeeSlug,
  initialQuestion,
  conversationId,
  className,
  showHeader = true,
  showComposer = true,
  onSendFunctionReady,
  onStreamingStateChange,
  onGuardrailsStateChange,
}: EmployeeChatWorkspaceProps) {
  const { user, userId } = useAuth();
  const { setActiveEmployee, setIsWorking } = useUnifiedChatLauncher();
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadContext, setUploadContext] = useState<{ docId?: string; importId?: string } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const onSendFunctionReadyRef = useRef(onSendFunctionReady);
  
  // Smart Import hook for file uploads
  const { uploadFile } = useSmartImport();

  // Get user's first name
  const userName = user?.user_metadata?.first_name || 
                   user?.user_metadata?.full_name?.split(' ')[0] || 
                   user?.email?.split('@')[0] || 
                   'User';

  // Use the existing usePrimeChat hook (same as UnifiedAssistantChat)
  const {
    messages,
    input,
    setInput,
    isStreaming,
    send,
    uploads,
    addUploadFiles,
    removeUpload,
    activeEmployeeSlug: hookActiveEmployee,
    headers,
  } = usePrimeChat(
    userId || 'temp-user',
    conversationId,
    employeeSlug as any,
    undefined,
    []
  );

  // Track active employee
  const [activeEmployeeSlug, setActiveEmployeeSlug] = useState<string>(employeeSlug);
  
  useEffect(() => {
    if (hookActiveEmployee) {
      setActiveEmployeeSlug(hookActiveEmployee);
      setActiveEmployee(hookActiveEmployee);
    }
  }, [hookActiveEmployee, setActiveEmployee]);

  // Track working state
  useEffect(() => {
    setIsWorking(isStreaming || uploadingFile);
  }, [isStreaming, uploadingFile, setIsWorking]);

  // Get current employee info
  const currentEmployee = getEmployeeInfo(activeEmployeeSlug);

  // Auto-scroll to bottom
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Handle initial question
  useEffect(() => {
    if (initialQuestion && messages.length === 0) {
      setTimeout(() => {
        send(initialQuestion);
      }, 100);
    }
  }, [initialQuestion, messages.length, send]);

  // Handle file upload
  const handleFileUpload = useCallback(async (files: FileList | File[]) => {
    if (!userId || !files) return;
    
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;
    
    setUploadingFile(true);
    
    try {
      const file = fileArray[0];
      const result = await uploadFile(userId, file, 'chat');
      
      setUploadContext({
        docId: result.docId,
        importId: result.docId,
      });
      
      addUploadFiles(files);
      console.log('[EmployeeChatWorkspace] File uploaded:', result.docId);
      
    } catch (error: any) {
      console.error('[EmployeeChatWorkspace] Upload error:', error);
    } finally {
      setUploadingFile(false);
    }
  }, [userId, uploadFile, addUploadFiles]);

  // Handle send
  const handleSend = useCallback(async () => {
    if (!input.trim() && uploads.length === 0) return;
    
    let messageToSend = input.trim();
    if (uploadContext?.docId && !messageToSend.toLowerCase().includes('upload') && !messageToSend.toLowerCase().includes('document')) {
      messageToSend = `I just uploaded a document (ID: ${uploadContext.docId}). ${messageToSend}`;
    }
    
    await send(messageToSend);
    setUploadContext(null);
  }, [input, uploads, send, uploadContext]);

  // Update ref when callback changes (without causing re-renders)
  useEffect(() => {
    onSendFunctionReadyRef.current = onSendFunctionReady;
  }, [onSendFunctionReady]);

  // Expose send function to parent component
  // Memoize sendWrapper to prevent infinite re-renders
  const sendWrapper = useCallback(async (message: string) => {
    // Ensure message is a string, not a Promise
    const messageText = typeof message === 'string' ? message : String(message || '');
    await send(messageText);
  }, [send]);

  useEffect(() => {
    if (onSendFunctionReadyRef.current) {
      onSendFunctionReadyRef.current(sendWrapper);
    }
  }, [sendWrapper]);

  // Expose streaming state to parent component
  useEffect(() => {
    if (onStreamingStateChange) {
      onStreamingStateChange(isStreaming);
    }
  }, [isStreaming, onStreamingStateChange]);

  // Expose guardrails state to parent component
  useEffect(() => {
    if (onGuardrailsStateChange) {
      const guardrailsActive = headers.guardrails === 'active' || headers.guardrails === 'enabled';
      const piiProtectionActive = headers.piiMask === 'active' || headers.piiMask === 'enabled';
      onGuardrailsStateChange(guardrailsActive, piiProtectionActive);
    }
  }, [headers.guardrails, headers.piiMask, onGuardrailsStateChange]);

  // Handle file select
  const handleFileSelect = useCallback((files: FileList | null) => {
    if (!files) return;
    handleFileUpload(files);
  }, [handleFileUpload]);

  // Handle drag and drop
  const [isDragging, setIsDragging] = useState(false);
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files);
    }
  }, [handleFileSelect]);

  // Auto-resize textarea
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    const newHeight = Math.min(e.target.scrollHeight, 96);
    e.target.style.height = `${newHeight}px`;
  }, [setInput]);

  // Handle key press
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  return (
    <div
      className={cn(
        "flex flex-col h-full",
        isDragging && 'bg-blue-500/10',
        className
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Conversation Header - Hidden when used in card (header is in page card) */}
      {showHeader && (
        <div className="flex items-center justify-between p-4 border-b border-slate-800/80 flex-shrink-0">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {/* Employee Avatar */}
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-xl flex-shrink-0">
              {currentEmployee.emoji}
            </div>

            {/* Employee Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-lg sm:text-xl font-semibold text-slate-50 truncate">
                  {currentEmployee.name}
                </h3>
                {isStreaming && (
                  <span className="text-xs text-amber-400 animate-pulse">Working...</span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-slate-400 truncate">
                {currentEmployee.role}
              </p>
              <p className="text-xs text-slate-500 truncate">
                Chatting as {userName}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Messages Area */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3 space-y-3 no-scrollbar hide-scrollbar" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="text-4xl mb-4">{currentEmployee.emoji}</div>
            <h3 className="text-lg font-semibold text-slate-50 mb-2">
              Welcome to XspensesAI
            </h3>
            <p className="text-sm text-slate-400 mb-4">
              I'm {currentEmployee.name}, your AI financial assistant. How can I help you today?
            </p>
          </div>
        )}

        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} activeEmployeeSlug={activeEmployeeSlug} />
        ))}

        {uploadingFile && (
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <span>📤 Uploading document...</span>
          </div>
        )}
        {isStreaming && (
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <span>{currentEmployee.name} is typing</span>
            <span className="flex gap-1">
              <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{animationDelay:'0ms'}} />
              <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{animationDelay:'120ms'}} />
              <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{animationDelay:'240ms'}} />
            </span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Composer */}
      {showComposer && (
        <>
          <div className="border-t border-slate-800/80 px-4 py-3 flex-shrink-0">
            {/* Upload Previews */}
            {uploads.length > 0 && (
              <div className="flex gap-2 mb-2 overflow-x-auto">
                {uploads.map((upload) => (
                  <div
                    key={upload.id}
                    className="flex items-center gap-2 px-2 py-1 rounded bg-slate-800/70 text-xs text-slate-300 flex-shrink-0"
                  >
                    <span>📎</span>
                    <span className="truncate max-w-[100px]">{upload.name}</span>
                    <button
                      onClick={() => removeUpload(upload.id)}
                      className="text-slate-500 hover:text-slate-300"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Input Row */}
            <div className="flex items-end gap-2">
              {/* Action Buttons */}
              <div className="flex gap-1">
                <label className="w-10 h-10 rounded-full bg-slate-800/70 hover:bg-slate-800/90 flex items-center justify-center cursor-pointer transition-colors">
                  <Paperclip className="w-4 h-4 text-slate-400" />
                  <input
                    type="file"
                    multiple
                    className="hidden"
                    onChange={(e) => handleFileSelect(e.target.files)}
                  />
                </label>
                <label className="w-10 h-10 rounded-full bg-slate-800/70 hover:bg-slate-800/90 flex items-center justify-center cursor-pointer transition-colors">
                  <Image className="w-4 h-4 text-slate-400" />
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => handleFileSelect(e.target.files)}
                  />
                </label>
                <button
                  onClick={() => window.dispatchEvent(new CustomEvent('chat:voice'))}
                  className="w-10 h-10 rounded-full bg-slate-800/70 hover:bg-slate-800/90 flex items-center justify-center transition-colors"
                >
                  <Mic className="w-4 h-4 text-slate-400" />
                </button>
              </div>

              {/* Text Input */}
              <textarea
                ref={inputRef}
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="Message..."
                disabled={isStreaming || uploadingFile}
                rows={1}
                className="flex-1 min-h-[40px] max-h-[96px] px-3 py-2 rounded-xl
                           bg-slate-800/70 text-slate-100 placeholder-slate-500
                           resize-none focus:outline-none focus:ring-2 focus:ring-blue-500
                           disabled:opacity-50 disabled:cursor-not-allowed border border-slate-700/50"
              />

              {/* Send Button */}
              <button
                onClick={handleSend}
                disabled={(!input.trim() && uploads.length === 0) || isStreaming || uploadingFile}
                className="w-10 h-10 rounded-xl bg-blue-600 hover:bg-blue-700
                           disabled:opacity-50 disabled:cursor-not-allowed
                           flex items-center justify-center transition-colors"
              >
                <Send className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>

          {/* Guardrails Indicator */}
          <div className="px-4 py-2 border-t border-slate-800/80 flex items-center justify-center gap-2 text-xs text-slate-500 flex-shrink-0">
            <span>🔒</span>
            <span>Guardrails + PII Protection Active</span>
          </div>
        </>
      )}
    </div>
  );
}

