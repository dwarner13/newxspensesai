/**
 * Unified Assistant Chat Component
 * 
 * Single unified chat interface for all AI employees (Prime, Blitz, Tag, Crystal, Liberty, etc.)
 * - Shows which employee is currently responding
 * - Supports employee handoffs seamlessly
 * - Preserves conversation history
 * - Supports file uploads
 * - Shows guardrails status
 * - Displays user name
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { X, Paperclip, Image, Mic, Send, ChevronDown } from 'lucide-react';
import { usePrimeChat, type ChatMessage } from '../../hooks/usePrimeChat';
import { useAuth } from '../../contexts/AuthContext';
import { getEmployeeInfo, getEmployeeEmoji, getEmployeeName } from '../../utils/employeeUtils';
import { format } from 'date-fns';
import { useSmartImport } from '../../hooks/useSmartImport';
import { useUnifiedChatLauncher } from '../../hooks/useUnifiedChatLauncher';
import DesktopChatSideBar from './DesktopChatSideBar';
import { cn } from '../../lib/utils';

interface UnifiedAssistantChatProps {
  isOpen: boolean;
  onClose: () => void;
  initialEmployeeSlug?: string;
  conversationId?: string;
  context?: {
    page?: string;
    filters?: any;
    selectionIds?: string[];
    data?: any;
  };
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
  const { user, userId } = useAuth();
  const { setActiveEmployee, setIsWorking, setHasCompletedResponse, isWorking, hasCompletedResponse, activeEmployeeSlug: launcherActiveSlug } = useUnifiedChatLauncher();
  const [isMobile, setIsMobile] = useState(false);
  const [showEmployeeSwitcher, setShowEmployeeSwitcher] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadContext, setUploadContext] = useState<{ docId?: string; importId?: string } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  
  // Smart Import hook for file uploads
  const { uploadFile, uploading: smartImportUploading } = useSmartImport();

  // Get user's first name
  const userName = user?.user_metadata?.first_name || 
                   user?.user_metadata?.full_name?.split(' ')[0] || 
                   user?.email?.split('@')[0] || 
                   'User';

  // Use the existing usePrimeChat hook
  // Only initialize if we have a userId to prevent errors
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
    userId || 'temp-user', // Provide a fallback to prevent hook errors
    conversationId,
    initialEmployeeSlug as any,
    undefined,
    []
  );

  // Track active employee (from hook or initial)
  const [activeEmployeeSlug, setActiveEmployeeSlug] = useState<string>(initialEmployeeSlug);
  
  // Update active employee when hook reports it
  useEffect(() => {
    if (hookActiveEmployee) {
      setActiveEmployeeSlug(hookActiveEmployee);
      setActiveEmployee(hookActiveEmployee); // This will update display info in the hook
    }
  }, [hookActiveEmployee, setActiveEmployee]);

  // Track working state
  useEffect(() => {
    setIsWorking(isStreaming || uploadingFile);
  }, [isStreaming, uploadingFile, setIsWorking]);

  // Track completed responses when chat is closed
  useEffect(() => {
    if (!isOpen && messages.length > 0) {
      // Check if the last message is from assistant
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.role === 'assistant' && !isStreaming && !uploadingFile) {
        setHasCompletedResponse(true);
      }
    }
  }, [messages, isOpen, isStreaming, uploadingFile, setHasCompletedResponse]);

  // Get current employee info
  const currentEmployee = getEmployeeInfo(activeEmployeeSlug);

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    if (isOpen && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // Handle initial question
  useEffect(() => {
    if (isOpen && initialQuestion && messages.length === 0) {
      setTimeout(() => {
        send(initialQuestion);
      }, 100);
    }
  }, [isOpen, initialQuestion, messages.length, send]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Body scroll lock - prevent dashboard scrolling when chat popup is open (both mobile and desktop)
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [isOpen]);

  // Handle file upload - connect to Smart Import pipeline
  const handleFileUpload = useCallback(async (files: FileList | File[]) => {
    if (!userId || !files) return;
    
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;
    
    setUploadingFile(true);
    
    try {
      // Upload first file to Smart Import pipeline
      const file = fileArray[0];
      const result = await uploadFile(userId, file, 'chat');
      
      // Store upload context for chat
      setUploadContext({
        docId: result.docId,
        importId: result.docId, // docId can be used as importId
      });
      
      // Add to uploads list for UI display (usePrimeChat format)
      addUploadFiles(files);
      
      // Add system message about upload success
      // Note: We can't directly add to messages here since usePrimeChat manages that
      // Instead, we'll show a toast or inline message
      console.log('[UnifiedAssistantChat] File uploaded:', result.docId);
      
    } catch (error: any) {
      console.error('[UnifiedAssistantChat] Upload error:', error);
      // Could show toast here
    } finally {
      setUploadingFile(false);
    }
  }, [userId, uploadFile, addUploadFiles]);

  // Handle send - include upload context if available
  const handleSend = useCallback(async () => {
    if (!input.trim() && uploads.length === 0) return;
    
    // If we have upload context, prepend a message about the upload
    // This helps the AI understand what document we're talking about
    let messageToSend = input.trim();
    if (uploadContext?.docId && !messageToSend.toLowerCase().includes('upload') && !messageToSend.toLowerCase().includes('document')) {
      // Prepend context about uploaded document
      messageToSend = `I just uploaded a document (ID: ${uploadContext.docId}). ${messageToSend}`;
    }
    
    // Send message with enhanced context
    await send(messageToSend);
    
    // Clear upload context after sending
    setUploadContext(null);
  }, [input, uploads, send, uploadContext]);

  // Handle file select - trigger upload pipeline
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
    const newHeight = Math.min(e.target.scrollHeight, 96); // Max 4 lines
    e.target.style.height = `${newHeight}px`;
  }, [setInput]);

  // Handle key press
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  // Desktop slide-out
  if (!isMobile) {
    // Return null when closed to prevent blocking clicks
    if (!isOpen) return null;

    return (
      <>
        {/* Chat Panel - full height slide-out from right */}
        {/* Chat Panel - fixed overlay, prevents body scroll when open */}
        <div
          ref={panelRef}
          className={cn(
            "fixed inset-y-0 right-0 z-[999] h-screen w-[420px] max-w-full",
            "bg-[#0b1220] text-white shadow-2xl border-l border-white/10",
            "flex flex-col transform transition-transform duration-300 ease-out",
            "translate-x-0 opacity-100"
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-white/10">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {/* Employee Avatar */}
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500
                              flex items-center justify-center text-xl flex-shrink-0">
                {currentEmployee.emoji}
              </div>

              {/* Employee Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-semibold text-white truncate">
                    {currentEmployee.name}
                  </h3>
                  {isStreaming && (
                    <span className="text-xs text-amber-400 animate-pulse">Working...</span>
                  )}
                </div>
                <p className="text-xs text-white/70 truncate">
                  {currentEmployee.role}
                </p>
                <p className="text-xs text-white/50 truncate">
                  Chatting as {userName}
                </p>
              </div>
            </div>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors flex-shrink-0"
              aria-label="Close chat"
            >
              <X className="w-4 h-4 text-white/70" />
            </button>
          </div>

          {/* Messages - scroll only here, not the whole page */}
          <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3 space-y-3 hide-scrollbar">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center px-4">
                <div className="text-4xl mb-4">{currentEmployee.emoji}</div>
                <h3 className="text-lg font-semibold text-white mb-2">
                  Welcome to XspensesAI
                </h3>
                <p className="text-sm text-white/70 mb-4">
                  I'm {currentEmployee.name}, your AI financial assistant. How can I help you today?
                </p>
              </div>
            )}

            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}

            {uploadingFile && (
              <div className="flex items-center gap-2 text-sm text-white/70">
                <span>📤 Uploading document...</span>
              </div>
            )}
            {isStreaming && (
              <div className="flex items-center gap-2 text-sm text-white/70">
                <span>{currentEmployee.name} is typing</span>
                <span className="flex gap-1">
                  <span className="w-1.5 h-1.5 bg-white/50 rounded-full animate-bounce" style={{animationDelay:'0ms'}} />
                  <span className="w-1.5 h-1.5 bg-white/50 rounded-full animate-bounce" style={{animationDelay:'120ms'}} />
                  <span className="w-1.5 h-1.5 bg-white/50 rounded-full animate-bounce" style={{animationDelay:'240ms'}} />
                </span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Composer */}
          <div
            className={`
              border-t border-white/10 p-3
              ${isDragging ? 'bg-blue-500/10' : ''}
            `}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {/* Upload Previews */}
            {uploads.length > 0 && (
              <div className="flex gap-2 mb-2 overflow-x-auto">
                {uploads.map((upload) => (
                  <div
                    key={upload.id}
                    className="flex items-center gap-2 px-2 py-1 rounded bg-white/10 text-xs text-white/90 flex-shrink-0"
                  >
                    <span>📎</span>
                    <span className="truncate max-w-[100px]">{upload.name}</span>
                    <button
                      onClick={() => removeUpload(upload.id)}
                      className="text-white/50 hover:text-white"
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
                <label className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/15 flex items-center justify-center cursor-pointer transition-colors">
                  <Paperclip className="w-4 h-4 text-white/70" />
                  <input
                    type="file"
                    multiple
                    className="hidden"
                    onChange={(e) => handleFileSelect(e.target.files)}
                  />
                </label>
                <label className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/15 flex items-center justify-center cursor-pointer transition-colors">
                  <Image className="w-4 h-4 text-white/70" />
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
                  className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/15 flex items-center justify-center transition-colors"
                >
                  <Mic className="w-4 h-4 text-white/70" />
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
                           bg-white/10 text-white placeholder-white/50
                           resize-none focus:outline-none focus:ring-2 focus:ring-blue-500
                           disabled:opacity-50 disabled:cursor-not-allowed"
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
          <div className="px-4 py-2 border-t border-white/10 flex items-center justify-center gap-2 text-xs text-white/50 flex-shrink-0">
            <span>🔒</span>
            <span>Guardrails + PII Protection Active</span>
          </div>
        </div>
      </>
    );
  }

  // Mobile bottom sheet
  // Return null when closed to prevent blocking clicks
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-[999] pointer-events-auto"
        onClick={onClose}
      />

      {/* Bottom Sheet - fixed overlay, prevents body scroll when open */}
      <div
        ref={panelRef}
        className={`
          fixed bottom-0 left-0 right-0 z-[999]
          bg-[#0b1220] text-white
          rounded-t-3xl shadow-2xl
          flex flex-col
          transition-transform duration-300 ease-out
          translate-y-0
        `}
        style={{
          height: 'calc(100vh - env(safe-area-inset-bottom, 0px))',
          maxHeight: '100vh',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)'
        }}
      >
        {/* Drag Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-12 h-1 bg-white/20 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10 flex-shrink-0">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-xl flex-shrink-0">
              {currentEmployee.emoji}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-white truncate">
                  {currentEmployee.name}
                </h3>
                {isStreaming && (
                  <span className="text-xs text-amber-400 animate-pulse">Working...</span>
                )}
              </div>
              <p className="text-xs text-white/70 truncate">
                {currentEmployee.role}
              </p>
              <p className="text-xs text-white/50 truncate">
                Chatting as {userName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors flex-shrink-0"
            aria-label="Close chat"
          >
            <X className="w-5 h-5 text-white/70" />
          </button>
        </div>

        {/* Messages - scroll only here, not the whole page */}
        <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3 space-y-3 hide-scrollbar">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <div className="text-4xl mb-4">{currentEmployee.emoji}</div>
              <h3 className="text-lg font-semibold text-white mb-2">
                Welcome to XspensesAI
              </h3>
              <p className="text-sm text-white/70">
                I'm {currentEmployee.name}. How can I help you today?
              </p>
            </div>
          )}

          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}

          {uploadingFile && (
            <div className="flex items-center gap-2 text-sm text-white/70">
              <span>📤 Uploading document...</span>
            </div>
          )}
          {isStreaming && (
            <div className="flex items-center gap-2 text-sm text-white/70">
              <span>{currentEmployee.name} is typing</span>
              <span className="flex gap-1">
                <span className="w-1.5 h-1.5 bg-white/50 rounded-full animate-bounce" style={{animationDelay:'0ms'}} />
                <span className="w-1.5 h-1.5 bg-white/50 rounded-full animate-bounce" style={{animationDelay:'120ms'}} />
                <span className="w-1.5 h-1.5 bg-white/50 rounded-full animate-bounce" style={{animationDelay:'240ms'}} />
              </span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Composer */}
        <div
          className={`
            border-t border-white/10 p-3
            ${isDragging ? 'bg-blue-500/10' : ''}
          `}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          style={{ paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 0px))' }}
        >
          {/* Upload Previews */}
          {uploads.length > 0 && (
            <div className="flex gap-2 mb-2 overflow-x-auto">
              {uploads.map((upload) => (
                <div
                  key={upload.id}
                  className="flex items-center gap-2 px-2 py-1 rounded bg-white/10 text-xs text-white/90 flex-shrink-0"
                >
                  <span>📎</span>
                  <span className="truncate max-w-[100px]">{upload.name}</span>
                  <button
                    onClick={() => removeUpload(upload.id)}
                    className="text-white/50 hover:text-white"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Input Row */}
          <div className="flex items-end gap-2">
            <div className="flex gap-1">
              <label className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/15 flex items-center justify-center cursor-pointer">
                <Paperclip className="w-4 h-4 text-white/70" />
                <input type="file" multiple className="hidden" onChange={(e) => handleFileSelect(e.target.files)} />
              </label>
              <label className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/15 flex items-center justify-center cursor-pointer">
                <Image className="w-4 h-4 text-white/70" />
                <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => handleFileSelect(e.target.files)} />
              </label>
            </div>
            <textarea
              ref={inputRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Message..."
              disabled={isStreaming || uploadingFile}
              rows={1}
              className="flex-1 min-h-[40px] max-h-[96px] px-3 py-2 rounded-xl bg-white/10 text-white placeholder-white/50 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            />
            <button
              onClick={handleSend}
              disabled={(!input.trim() && uploads.length === 0) || isStreaming || uploadingFile}
              className="w-10 h-10 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center"
            >
              <Send className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>

        {/* Guardrails Indicator */}
        <div className="px-4 py-2 border-t border-white/10 flex items-center justify-center gap-2 text-xs text-white/50">
          <span>🔒</span>
          <span>Guardrails + PII Protection Active</span>
        </div>
      </div>
    </>
  );
}

// Message Bubble Component
function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';
  
  // Extract employee from system messages (handoff messages)
  const handoffMatch = message.content.match(/Transferred from (\w+) to (\w+)/);
  
  if (isSystem && handoffMatch) {
    const [, from, to] = handoffMatch;
    return (
      <div className="flex justify-center my-4">
        <div className="px-4 py-2 rounded-full bg-gradient-to-r from-purple-500/20 to-blue-500/20 border border-purple-500/30 flex items-center gap-2 text-sm text-white/90">
          <span className="animate-pulse">🔄</span>
          <span>{getEmployeeName(from)} → {getEmployeeName(to)}</span>
        </div>
      </div>
    );
  }

  if (isSystem) {
    return (
      <div className="flex justify-center">
        <div className="px-3 py-1.5 rounded-full bg-white/5 text-xs text-white/70">
          {String(message.content || '')}
        </div>
      </div>
    );
  }

  if (isUser) {
    return (
      <div className="flex justify-end">
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

  // Assistant message - extract employee from content or use default
  // In a real implementation, we'd track employee per message
  const employeeSlug = 'prime-boss'; // TODO: Track per message
  const employee = getEmployeeInfo(employeeSlug);

  return (
    <div className="flex justify-start">
      <div className="max-w-[85%] px-4 py-2 rounded-2xl bg-white/10 shadow-sm">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-lg">{employee.emoji}</span>
          <span className="text-xs font-medium text-white/90">
            {employee.name}
          </span>
        </div>
        <p className="text-sm text-white whitespace-pre-wrap break-words">
          {String(message.content || '')}
        </p>
        {message.createdAt && (
          <p className="text-xs text-white/50 mt-1">
            {format(new Date(message.createdAt), 'h:mm a')}
          </p>
        )}
      </div>
    </div>
  );
}

