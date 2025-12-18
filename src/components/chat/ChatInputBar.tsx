/**
 * ChatInputBar Component
 * 
 * Reusable chat input bar with Prime-style gradient send button
 * Used across all chat interfaces for consistency
 * Supports file attachments (ChatGPT-style)
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { cn } from '../../lib/utils';
import { Paperclip, X, File, Plus, Camera, Image, FileText } from 'lucide-react';

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
  
  /** Whether to show "+" icon instead of paperclip (for Byte/ChatGPT-style) */
  showPlusIcon?: boolean;
  
  /** Optional callback when files are selected (for immediate processing) */
  onAttachmentsChange?: (files: File[]) => void;
  
  /** Optional cancel/stop handler (for stopping streaming) */
  onStop?: () => void;
}

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
  showPlusIcon = false,
  onAttachmentsChange,
  onStop,
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
  
  const MAX_ATTACHMENTS = 5;

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 96)}px`;
    }
  }, [value]);

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!disabled && (value.trim() || attachments.length > 0) && !isStreaming) {
        handleSubmit();
      }
    }
  };

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
      // Call onAttachmentsChange callback for immediate processing (e.g., Byte Smart Import)
      onAttachmentsChange?.(updatedAttachments);
    }
    
    // Reset input so same file can be selected again
    e.target.value = '';
  }, [attachments, onAttachmentsChange]);

  const handleRemoveAttachment = useCallback((index: number) => {
    setAttachments(prev => {
      const updated = prev.filter((_, i) => i !== index);
      // Call onAttachmentsChange callback to notify parent of removal
      onAttachmentsChange?.(updated);
      return updated;
    });
  }, [onAttachmentsChange]);

  const handleAttachClick = useCallback(() => {
    if (showPlusIcon) {
      // Open menu for "+" icon
      setIsMenuOpen(true);
    } else {
      // Direct file picker for paperclip icon
      fileInputRef.current?.click();
    }
  }, [showPlusIcon]);

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

  // Close menu on click outside
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
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isMenuOpen]);

  const handleMenuSelect = useCallback((inputRef: React.RefObject<HTMLInputElement>) => {
    setIsMenuOpen(false);
    inputRef.current?.click();
  }, []);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }
    if (!disabled && (value.trim() || attachments.length > 0) && !isStreaming) {
      onSubmit({ attachments: attachments.length > 0 ? attachments : undefined });
      // Clear attachments after submit
      setAttachments([]);
    }
  };

  return (
    <div className="w-full">
      <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-2">
        {/* Attachment chips - shown above input when files are attached */}
        {attachments.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {attachments.map((file, index) => (
              <div
                key={`${file.name}-${file.size}-${index}`}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-white/10 text-xs text-white/80 border border-white/10"
              >
                <File className="w-3 h-3 shrink-0" />
                <span className="max-w-[120px] truncate" title={file.name}>
                  {file.name}
                </span>
                <button
                  type="button"
                  onClick={() => handleRemoveAttachment(index)}
                  className="ml-0.5 p-0.5 hover:bg-white/20 rounded-full transition-colors shrink-0"
                  aria-label={`Remove ${file.name}`}
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-end gap-2 relative">
          {/* Attachment button */}
          <button
            ref={buttonRef}
            type="button"
            onClick={handleAttachClick}
            disabled={disabled || isStreaming || attachments.length >= MAX_ATTACHMENTS}
            className={cn(
              "h-9 w-9 rounded-full border border-white/10 flex items-center justify-center transition-all shrink-0",
              "hover:bg-white/10 active:bg-white/15",
              "disabled:opacity-40 disabled:cursor-not-allowed",
              "focus:outline-none focus:ring-2 focus:ring-white/20 focus:ring-offset-2 focus:ring-offset-slate-950",
              isMenuOpen && "bg-white/10"
            )}
            aria-label="Attach files"
            title={`Attach files (${attachments.length}/${MAX_ATTACHMENTS})`}
          >
            {showPlusIcon ? (
              <Plus className="w-4 h-4 text-white/70" />
            ) : (
              <Paperclip className="w-4 h-4 text-white/70" />
            )}
          </button>

          {/* Attachment menu (Concur-style) - shown when showPlusIcon is true */}
          {showPlusIcon && isMenuOpen && (
            <div
              ref={menuRef}
              className="absolute bottom-full left-0 mb-2 w-48 rounded-xl bg-black/90 backdrop-blur-md border border-white/20 shadow-xl z-50 overflow-hidden"
              style={{ animation: 'fadeIn 0.15s ease-out' }}
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
            </div>
          )}

          {/* Hidden file inputs - three separate inputs for different purposes */}
          {/* Camera input - single image with capture="environment" */}
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileSelect}
            className="hidden"
            disabled={disabled || isStreaming}
          />
          
          {/* Gallery input - multiple images */}
          <input
            ref={galleryInputRef}
            type="file"
            multiple
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
            disabled={disabled || isStreaming}
          />
          
          {/* Statement input - PDF/CSV/XLSX files */}
          <input
            ref={statementInputRef}
            type="file"
            multiple
            accept=".pdf,.csv,.xlsx,.xls,application/pdf,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
            onChange={handleFileSelect}
            className="hidden"
            disabled={disabled || isStreaming}
          />

          {/* Legacy file input - kept for backward compatibility (paperclip icon) */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,.pdf,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
            onChange={handleFileSelect}
            className="hidden"
            disabled={disabled || isStreaming}
          />

          {/* Text input */}
          <div className="flex-1 rounded-full bg-black/40 border border-white/10 px-4 py-2 flex items-center">
            <textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder={placeholder}
              rows={1}
              disabled={disabled}
              className="flex-1 bg-transparent text-sm text-white placeholder:text-white/40 resize-none outline-none border-none max-h-24 min-h-[22px]"
            />
          </div>

          {/* Stop button (shown during streaming) or Send button */}
          {isStreaming && onStop ? (
            <button
              type="button"
              onClick={onStop}
              className={cn(
                "h-9 w-9 rounded-full flex items-center justify-center transition-all shrink-0",
                "bg-red-500 hover:bg-red-400 active:bg-red-600",
                "shadow-lg shadow-red-500/50 hover:shadow-red-500/70",
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
              disabled={isStreaming || (!value.trim() && attachments.length === 0) || disabled}
              className={cn(
                "h-9 w-9 rounded-full flex items-center justify-center transition-all shrink-0",
                "bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600",
                "disabled:bg-slate-600/50 disabled:cursor-not-allowed",
                "shadow-lg shadow-emerald-500/50 hover:shadow-emerald-500/70",
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

        {/* Guardrails status pill - centered below input */}
        {guardrailsStatus && (
          <div className="flex justify-center mt-1">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-900/70 text-emerald-300 text-[11px] font-medium shadow shadow-emerald-500/30">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              <span>{guardrailsStatus}</span>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}

