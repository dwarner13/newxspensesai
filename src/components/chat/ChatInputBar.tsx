/**
 * ChatInputBar Component
 * 
 * Reusable chat input bar with Prime-style gradient send button
 * Used across all chat interfaces for consistency
 * Supports file attachments (ChatGPT-style)
 */

// ====== CHAT SEND / RECEIVE ======

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'react-hot-toast';
import { cn } from '../../lib/utils';
import { Paperclip, X, File, Plus, Camera, Image, FileText } from 'lucide-react';
import { CHAT_INPUT_MAX_HEIGHT_PX } from '../../lib/chatSlideoutConstants';

export interface ChatInputBarProps {
  /** Input value */
  value: string;
  
  /** Input change handler */
  onChange: (value: string) => void;
  
  /** Submit handler - now accepts optional attachments */
  onSubmit: (options?: { attachments?: File[] }) => void;
  
  /** Placeholder text */
  placeholder?: string;
  
  /** Whether currently streaming */
  isStreaming?: boolean;
  
  /** Whether input is disabled */
  disabled?: boolean;
  
  /** Optional gradient classes for send button (defaults to Prime gradient) */
  sendButtonGradient?: string;
  
  /** Optional glow shadow for send button */
  sendButtonGlow?: string;
  
  /** Optional guardrails status text (shown below input) */
  guardrailsStatus?: string;
  
  /** Optional guardrails last checked timestamp (for dev tooltips) */
  guardrailsLastChecked?: string;

  /** Render guardrails status in a quieter visual style */
  guardrailsQuiet?: boolean;
  
  /** Whether to show "+" icon instead of paperclip (for Byte/ChatGPT-style) */
  showPlusIcon?: boolean;
  
  /** Optional callback when files are selected (for immediate processing) */
  onAttachmentsChange?: (files: File[]) => void;

  /** Whether attachment interactions are enabled */
  attachmentsEnabled?: boolean;
  
  /** Whether to show attachment chips */
  showAttachmentChips?: boolean;

  /** Whether attachment upload is currently in progress */
  isAttachmentUploading?: boolean;

  /** Upload progress percentage (0-100) for attachment tray */
  attachmentUploadProgress?: number;
  
  /** Optional cancel/stop handler (for stopping streaming) */
  onStop?: () => void;
  
  /** Optional focus handler for the input (for launcher behavior) */
  onInputFocus?: (e: React.FocusEvent<HTMLTextAreaElement>) => void;
  
  /** Optional mouse down handler for the input (for launcher behavior) */
  onInputMouseDown?: (e: React.MouseEvent<HTMLTextAreaElement>) => void;
  
  /** Whether input is read-only (for launcher-only mode) */
  readOnly?: boolean;

  /** Allow selecting attachments while streaming (uploads can be queued by parent). */
  allowAttachmentsWhileStreaming?: boolean;

  /** Immediately submit selected attachments (no send button click). */
  autoSubmitOnAttachmentSelect?: boolean;
}

const CHAT_INPUT_MAX_CHARS = 2000;
const CHAT_INPUT_COUNTER_THRESHOLD = 1600;
const COMPOSER_MAX_HEIGHT_PX = Math.min(CHAT_INPUT_MAX_HEIGHT_PX, 96);

export function ChatInputBar({
  value,
  onChange,
  onSubmit,
  placeholder = 'Ask anything...',
  isStreaming = false,
  disabled = false,
  sendButtonGradient = 'from-amber-400 via-orange-500 to-pink-500',
  sendButtonGlow = 'rgba(251,191,36,0.65)',
  guardrailsStatus,
  guardrailsLastChecked,
  guardrailsQuiet = false,
  showPlusIcon = false,
  onAttachmentsChange,
  attachmentsEnabled = true,
  showAttachmentChips = true,
  isAttachmentUploading = false,
  attachmentUploadProgress = 0,
  onStop,
  onInputFocus,
  onInputMouseDown,
  readOnly = false,
  allowAttachmentsWhileStreaming = false,
  autoSubmitOnAttachmentSelect = false,
}: ChatInputBarProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const statementInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
  
  const MAX_ATTACHMENTS = 5;

  // Auto-resize textarea (capped at max-height to prevent footer height changes)
  // CRITICAL: Footer container must remain shrink-0 and never grow beyond cap
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.transition = 'height 120ms ease';
      // Reset height to auto to get accurate scrollHeight
      textarea.style.height = 'auto';
      // Cap at CHAT_INPUT_MAX_HEIGHT_PX to prevent footer expansion
      const newHeight = Math.min(textarea.scrollHeight, COMPOSER_MAX_HEIGHT_PX);
      textarea.style.height = `${newHeight}px`;
      // Ensure overflow-y: auto when content exceeds max height
      if (textarea.scrollHeight > COMPOSER_MAX_HEIGHT_PX) {
        textarea.style.overflowY = 'auto';
      } else {
        textarea.style.overflowY = 'hidden';
      }
    }
  }, [value]);

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      // CRITICAL: Block submission if input is invalid (same checks as handleSubmit)
      const trimmedValue = typeof value === 'string' ? value.trim() : '';
      const isValidInput = trimmedValue.length > 0 && trimmedValue !== 'undefined';
      
      if (!disabled && (isValidInput || attachments.length > 0) && !isStreaming && value.length <= CHAT_INPUT_MAX_CHARS) {
        handleSubmit();
      }
    }
  };
  
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    // Enforce character limit
    if (newValue.length <= CHAT_INPUT_MAX_CHARS) {
      onChange(newValue);
    }
  };
  
  const charCount = value.length;
  const showCounter = charCount >= CHAT_INPUT_COUNTER_THRESHOLD;
  const isOverLimit = charCount > CHAT_INPUT_MAX_CHARS;
  const normalizedUploadProgress = Math.max(0, Math.min(100, Math.round(attachmentUploadProgress)));

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);
    const newAttachments: File[] = [];
    
    // Add files up to max, avoiding duplicates
    for (const file of fileArray) {
      if (attachments.length + newAttachments.length >= MAX_ATTACHMENTS) break;
      
      // Check for duplicates (same name + size)
      const isDuplicate = attachments.some(
        a => a.name === file.name && a.size === file.size
      ) || newAttachments.some(
        a => a.name === file.name && a.size === file.size
      );
      
      if (!isDuplicate) {
        newAttachments.push(file);
      }
    }
    
    if (newAttachments.length > 0) {
      const updatedAttachments = [...attachments, ...newAttachments];
      setAttachments(updatedAttachments);
      // In instant-upload mode, notify parent immediately.
      // In instruction-first mode, parent receives attachments on explicit submit.
      if (autoSubmitOnAttachmentSelect) {
        onAttachmentsChange?.(updatedAttachments);
      }
      if (autoSubmitOnAttachmentSelect && !disabled && !readOnly) {
        onSubmit({ attachments: updatedAttachments });
        setAttachments([]);
      }
    }
    
    // Reset input so same file can be selected again
    e.target.value = '';
  }, [attachments, onAttachmentsChange, autoSubmitOnAttachmentSelect, disabled, readOnly, onSubmit]);

  const handleRemoveAttachment = useCallback((index: number) => {
    setAttachments(prev => {
      const updated = prev.filter((_, i) => i !== index);
      if (autoSubmitOnAttachmentSelect) {
        // Keep parent in sync only for instant-upload mode.
        onAttachmentsChange?.(updated);
      }
      return updated;
    });
  }, [onAttachmentsChange, autoSubmitOnAttachmentSelect]);

  const handleAttachClick = useCallback(() => {
    if (!attachmentsEnabled) {
      toast('Uploads are not enabled in this chat yet.');
      return;
    }
    console.log('[ChatInputBar] ✅ Attach button clicked!', { showPlusIcon, isMenuOpen });
    
    if (showPlusIcon) {
      // Toggle menu for "+" icon
      setIsMenuOpen(prev => {
        const next = !prev;
        console.log('[ChatInputBar] 📋 Menu toggled:', { from: prev, to: next });
        return next;
      });
    } else {
      // Direct file picker for paperclip icon
      fileInputRef.current?.click();
    }
  }, [showPlusIcon, isMenuOpen, attachmentsEnabled]);

  // Close menu on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMenuOpen) {
        setIsMenuOpen(false);
      }
    };
    if (isMenuOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isMenuOpen]);

  // Close menu on click outside (use capture phase to handle button clicks properly)
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        isMenuOpen &&
        menuRef.current &&
        buttonRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setIsMenuOpen(false);
      }
    };
    if (isMenuOpen) {
      // Use capture phase to ensure we catch clicks before they bubble
      document.addEventListener('mousedown', handleClickOutside, true);
      return () => document.removeEventListener('mousedown', handleClickOutside, true);
    }
  }, [isMenuOpen]);

  // Calculate menu position when it opens (for portal rendering)
  const updateMenuPosition = useCallback(() => {
    if (buttonRef.current) {
      const buttonRect = buttonRef.current.getBoundingClientRect();
      // Menu height is approximately 144px (3 buttons × 48px each)
      const menuHeight = 144;
      const spacing = 8; // mb-2 = 8px
      setMenuPosition({
        top: buttonRect.top - menuHeight - spacing,
        left: buttonRect.left,
      });
    }
  }, []);

  useEffect(() => {
    if (isMenuOpen) {
      updateMenuPosition();
      // Update position on scroll/resize
      window.addEventListener('scroll', updateMenuPosition, true);
      window.addEventListener('resize', updateMenuPosition);
      return () => {
        window.removeEventListener('scroll', updateMenuPosition, true);
        window.removeEventListener('resize', updateMenuPosition);
      };
    } else {
      setMenuPosition(null);
    }
  }, [isMenuOpen, updateMenuPosition]);

  const handleMenuSelect = useCallback((inputRef: React.RefObject<HTMLInputElement>) => {
    setIsMenuOpen(false);
    inputRef.current?.click();
  }, []);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }
    // PART 2: Prevent double-submit - block if already streaming or disabled
    if (!disabled && (value.trim() || attachments.length > 0) && !isStreaming && value.length <= CHAT_INPUT_MAX_CHARS) {
      onSubmit({ attachments: attachments.length > 0 ? attachments : undefined });
      // Clear attachments after submit
      setAttachments([]);
    }
  };

  return (
    <div className="w-full shrink-0">
      <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-2">
        {/* Attachment chips - shown above input when files are attached */}
        {showAttachmentChips && attachments.length > 0 && (
          <div className="mb-2 w-full shrink-0">
            <div className="flex flex-wrap items-center gap-2">
              {attachments.map((file, index) => (
                <div
                  key={`${file.name}-${file.size}-${index}`}
                  className="inline-flex max-w-full items-center gap-2 rounded-xl border border-white/15 bg-white/8 px-2.5 py-1.5"
                >
                  <File className="w-3.5 h-3.5 text-white/75 shrink-0" />
                  <span className="max-w-[180px] truncate text-xs text-white/90" title={file.name}>
                    {file.name}
                  </span>
                  <span className="text-[10px] text-white/55 shrink-0">
                    {(file.size / (1024 * 1024)).toFixed(2)} MB
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveAttachment(index)}
                    className="p-0.5 hover:bg-white/20 rounded transition-colors shrink-0"
                    aria-label={`Remove ${file.name}`}
                    disabled={isAttachmentUploading}
                  >
                    <X className="w-3 h-3 text-white/70" />
                  </button>
                </div>
              ))}
            </div>
            {isAttachmentUploading && (
              <div className="mt-2">
                <div className="h-1 w-full rounded-full bg-white/15 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-cyan-400 transition-all duration-300"
                    style={{ width: `${normalizedUploadProgress}%` }}
                  />
                </div>
                <div className="mt-1 text-[10px] text-white/55 text-right">{normalizedUploadProgress}%</div>
              </div>
            )}
          </div>
        )}

        {/* Input container - fixed height to prevent footer layout shifts */}
        <div className="flex items-end gap-2 relative shrink-0" style={{ minHeight: '24px', maxHeight: '96px' }}>
          {/* Attachment button */}
          <button
            ref={buttonRef}
            type="button"
            onClick={handleAttachClick}
            disabled={disabled || (!allowAttachmentsWhileStreaming && isStreaming) || attachments.length >= MAX_ATTACHMENTS}
            className={cn(
              "h-10 w-10 rounded-xl border border-white/10 flex items-center justify-center transition-all shrink-0",
              "hover:bg-white/10 active:bg-white/15",
              "disabled:opacity-40 disabled:cursor-not-allowed",
              "focus:outline-none focus:ring-2 focus:ring-white/20 focus:ring-offset-2 focus:ring-offset-slate-950",
              isMenuOpen && "bg-white/10"
            )}
            aria-label="Attach files"
            title={`Attach files (${attachments.length}/${MAX_ATTACHMENTS})`}
          >
            {showPlusIcon ? (
              <Plus className="w-5 h-5 text-white/70" />
            ) : (
              <Paperclip className="w-5 h-5 text-white/70" />
            )}
          </button>

          {/* Attachment menu (Concur-style) - rendered in portal to escape parent constraints */}
          {showPlusIcon && isMenuOpen && menuPosition && typeof document !== 'undefined' && createPortal(
            <div
              ref={menuRef}
              className="fixed w-48 rounded-xl bg-black/90 backdrop-blur-md border border-white/20 shadow-xl overflow-hidden"
              style={{ 
                top: `${menuPosition.top}px`,
                left: `${menuPosition.left}px`,
                zIndex: 999999,
                animation: 'fadeIn 0.15s ease-out'
              }}
            >
              <button
                type="button"
                onClick={() => handleMenuSelect(cameraInputRef)}
                className="w-full px-4 py-3 flex items-center gap-3 text-sm text-white/90 hover:bg-white/10 transition-colors text-left"
              >
                <Camera className="w-4 h-4 text-white/70 shrink-0" />
                <span>Take photo</span>
              </button>
              <button
                type="button"
                onClick={() => handleMenuSelect(galleryInputRef)}
                className="w-full px-4 py-3 flex items-center gap-3 text-sm text-white/90 hover:bg-white/10 transition-colors text-left border-t border-white/10"
              >
                <Image className="w-4 h-4 text-white/70 shrink-0" />
                <span>Choose photo</span>
              </button>
              <button
                type="button"
                onClick={() => handleMenuSelect(statementInputRef)}
                className="w-full px-4 py-3 flex items-center gap-3 text-sm text-white/90 hover:bg-white/10 transition-colors text-left border-t border-white/10"
              >
                <FileText className="w-4 h-4 text-white/70 shrink-0" />
                <span>Upload statement</span>
              </button>
            </div>,
            document.body
          )}

          {/* Hidden file inputs - three separate inputs for different purposes */}
          {/* Camera input - single image with capture="environment" */}
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
            capture="environment"
            onChange={handleFileSelect}
            className="hidden"
            disabled={disabled || (!allowAttachmentsWhileStreaming && isStreaming)}
            aria-hidden={!attachmentsEnabled}
          />
          
          {/* Gallery input - multiple images */}
          <input
            ref={galleryInputRef}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
            onChange={handleFileSelect}
            className="hidden"
            disabled={disabled || (!allowAttachmentsWhileStreaming && isStreaming)}
            aria-hidden={!attachmentsEnabled}
          />
          
          {/* Statement input - accept any file type */}
          <input
            ref={statementInputRef}
            type="file"
            multiple
            accept=".pdf,.csv,.xls,.xlsx,.jpg,.jpeg,.png,.webp,application/pdf,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,image/jpeg,image/png,image/webp"
            onChange={handleFileSelect}
            className="hidden"
            disabled={disabled || (!allowAttachmentsWhileStreaming && isStreaming)}
            aria-hidden={!attachmentsEnabled}
          />

          {/* Legacy file input - kept for backward compatibility (paperclip icon) */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.csv,.xls,.xlsx,.jpg,.jpeg,.png,.webp,application/pdf,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,image/jpeg,image/png,image/webp"
            onChange={handleFileSelect}
            className="hidden"
            disabled={disabled || (!allowAttachmentsWhileStreaming && isStreaming)}
            aria-hidden={!attachmentsEnabled}
          />

          {/* Text input - fixed height container prevents layout shifts */}
          {/* CRITICAL: Container maxHeight matches CHAT_INPUT_MAX_HEIGHT_PX to prevent footer growth */}
          <div className="flex-1 rounded-2xl bg-black/25 border border-white/10 px-2.5 py-0 flex items-center shrink-0 relative transition-all duration-150" style={{ minHeight: '24px', maxHeight: `${COMPOSER_MAX_HEIGHT_PX}px` }}>
            <textarea
              ref={textareaRef}
              value={value}
              onChange={handleChange}
              onKeyDown={handleKeyPress}
              onFocus={onInputFocus}
              onMouseDown={onInputMouseDown}
              placeholder={placeholder}
              rows={1}
              disabled={disabled}
              readOnly={readOnly}
              maxLength={CHAT_INPUT_MAX_CHARS}
              data-slideout-chat-input={!readOnly ? 'true' : undefined}
              className={cn(
                "flex-1 bg-transparent text-[12px] leading-5 text-white placeholder:text-white/28 resize-none outline-none border-none min-h-[14px]",
                readOnly && "cursor-pointer"
              )}
              style={{ maxHeight: `${COMPOSER_MAX_HEIGHT_PX}px`, overflowY: 'auto' }}
            />
            
            {/* Character counter - shown when >= threshold, positioned absolutely to not affect layout */}
            {showCounter && (
              <div className="absolute bottom-full right-0 mb-1 px-2 py-0.5 rounded text-[10px] font-medium bg-black/80 backdrop-blur-sm border border-white/10 text-white/70 z-10">
                <span className={isOverLimit ? 'text-red-400' : ''}>
                  {charCount}/{CHAT_INPUT_MAX_CHARS}
                </span>
              </div>
            )}
          </div>

          {/* Stop button (shown during streaming) or Send button */}
          {isStreaming && onStop ? (
            <button
              type="button"
              onClick={onStop}
              className={cn(
                "h-7 w-7 rounded-xl flex items-center justify-center transition-all shrink-0",
                "bg-red-500 hover:bg-red-400 active:bg-red-600",
                "shadow-md shadow-red-500/35 hover:shadow-red-500/50",
                "focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2 focus:ring-offset-slate-950"
              )}
              aria-label="Stop generating"
              style={{ minWidth: '36px', minHeight: '36px' }}
            >
              <svg
                viewBox="0 0 24 24"
                width="16"
                height="16"
                fill="white"
                aria-hidden="true"
                style={{ display: 'block', flexShrink: 0 }}
              >
                <rect x="6" y="6" width="12" height="12" rx="1" />
              </svg>
              <span className="sr-only">Stop generating</span>
            </button>
          ) : (
            <button
              type="submit"
              disabled={isStreaming || (!value.trim() && attachments.length === 0) || disabled || isOverLimit}
              className={cn(
                "h-7 w-7 rounded-xl flex items-center justify-center transition-all shrink-0",
                "bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600",
                "disabled:bg-slate-600/50 disabled:cursor-not-allowed",
                "shadow-md shadow-emerald-500/35 hover:shadow-emerald-500/50",
                "relative",
                "focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 focus:ring-offset-slate-950"
              )}
              aria-label="Send message"
              style={{ minWidth: '36px', minHeight: '36px' }}
            >
              <svg
                viewBox="0 0 24 24"
                width="16"
                height="16"
                fill="none"
                stroke="white"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                style={{ display: 'block', flexShrink: 0 }}
              >
                <line x1="5" y1="12" x2="19" y2="12"/>
                <polyline points="12 5 19 12 12 19"/>
              </svg>
              <span className="sr-only">Send message</span>
            </button>
          )}
        </div>

        {/* Guardrails status pill - centered below input (shrink-0 to prevent layout shifts) */}
        {/* SINGLE SOURCE OF TRUTH: This is the ONLY guardrails indicator in chat */}
        {guardrailsStatus && (
          <div className="flex justify-center mt-1 shrink-0">
            <div 
              className={cn(
                guardrailsQuiet
                  ? "inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-medium border transition-colors bg-slate-900/55 border-white/10 text-slate-300 shadow-none"
                  : "inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[11px] font-medium shadow transition-colors",
                !guardrailsQuiet && guardrailsStatus.includes('Secured') 
                  ? "bg-emerald-900/70 text-emerald-300 shadow-emerald-500/30"
                  : !guardrailsQuiet && guardrailsStatus.includes('Degraded')
                  ? "bg-amber-900/70 text-amber-300 shadow-amber-500/30"
                  : !guardrailsQuiet
                  ? "bg-slate-800/70 text-slate-400 shadow-slate-500/20"
                  : ""
              )}
              title={import.meta.env.DEV && guardrailsLastChecked ? `Last checked: ${guardrailsLastChecked}` : undefined}
            >
              <span className={cn(
                "h-1.5 w-1.5 rounded-full",
                guardrailsStatus.includes('Secured') 
                  ? "bg-emerald-400"
                  : guardrailsStatus.includes('Degraded')
                  ? "bg-amber-400"
                  : "bg-slate-500"
              )} />
              <span>{guardrailsStatus}</span>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}

