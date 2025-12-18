/**
 * Unified Assistant Chat Component
 * 
 * Unified chat interface that can be used for any AI employee.
 * Renders as a slideout panel on the right side, keeping page content visible.
 * Styled to match Prime Tasks and Prime Team panels for visual consistency.
 */

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Send, User, ArrowRight, X, Upload, Eye, EyeOff, History, LayoutDashboard, Grid3X3, Tags, LineChart } from 'lucide-react';
// Migration: Using unified chat engine instead of useStreamChat
import { useUnifiedChatEngine } from '../../hooks/useUnifiedChatEngine';
import { getEmployeeDisplay } from '../../utils/employeeUtils';
import { EMPLOYEE_CHAT_CONFIG } from '../../config/employeeChatConfig';
import { getEmployeeDisplayConfig, EMPLOYEE_DISPLAY_CONFIG } from '../../config/employeeDisplayConfig';
import { InlineUploadCard } from './InlineUploadCard';
import { StatusIndicator, type StatusType } from './StatusIndicator';
import { useAuth } from '../../contexts/AuthContext';
import { useByteInlineUpload } from '../../hooks/useByteInlineUpload';
import { useSmartImport } from '../../hooks/useSmartImport';
import { ByteInlineUpload } from './ByteInlineUpload';
import { ByteUploadPanel } from './ByteUploadPanel';
import { useUnifiedChatLauncher } from '../../hooks/useUnifiedChatLauncher';
import type { QuickAction } from '../../config/employeeChatConfig';
import { PrimeLogoBadge } from '../branding/PrimeLogoBadge';
import { useChatSessions } from '../../hooks/useChatSessions';
import { ChatOverlayShell } from './ChatOverlayShell';
import { ChatInputBar } from './ChatInputBar';
import { PrimeSlideoutShell } from '../prime/PrimeSlideoutShell';
import DesktopChatSideBar from './DesktopChatSideBar';
import { Button } from '../ui/button';
import { useNavigate } from 'react-router-dom';
import { usePrimeOverlaySafe } from '../../context/PrimeOverlayContext';

// Quick prompts are now defined in EMPLOYEE_DISPLAY_CONFIG
// Access via: displayConfig.chatQuickPrompts

interface UnifiedAssistantChatProps {
  /** Whether chat is open (required for slideout/overlay mode, ignored in inline mode) */
  isOpen?: boolean;
  
  /** Close handler (required for slideout/overlay mode, optional in inline mode) */
  onClose?: () => void;
  
  /** Initial employee slug */
  initialEmployeeSlug?: string;
  
  /** Conversation ID */
  conversationId?: string;
  
  /** Context data */
  context?: any;
  
  /** Initial question */
  initialQuestion?: string;
  
  /** Rendering mode: 'slideout' (Prime slideout), 'overlay' (centered overlay), or 'inline' (for pages) */
  mode?: 'slideout' | 'overlay' | 'inline';
  
  /** Optional floating rail (only used in slideout mode) */
  floatingRail?: React.ReactNode;
  
  /** Compact mode - reduces padding and text sizes for tighter layout */
  compact?: boolean;
}

export default function UnifiedAssistantChat({
  isOpen = true,
  onClose,
  initialEmployeeSlug = 'prime-boss',
  conversationId,
  context,
  initialQuestion,
  mode = 'slideout', // Default to slideout for backward compatibility
  floatingRail,
  compact = false,
}: UnifiedAssistantChatProps) {
  const [inputMessage, setInputMessage] = useState('');
  const [isRailHidden, setIsRailHidden] = useState(false); // Rail is visible by default
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const userJustSentRef = useRef(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const byteUploadPanelRef = useRef<HTMLDivElement | null>(null);
  const [showUploadCard, setShowUploadCard] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<StatusType | null>(null);
  const [isUploadingAttachments, setIsUploadingAttachments] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { setPrimeToolsOpen } = usePrimeOverlaySafe();
  
  // Get userId and firstName for uploads and personalization
  const { userId, firstName } = useAuth();
  
  // Smart Import hook for Byte file uploads
  const smartImport = useSmartImport();
  
  // Get unified chat launcher for handoff support
  const { setActiveEmployee: setActiveEmployeeGlobal, activeEmployeeSlug: globalActiveEmployeeSlug, openChat, setIsWorking } = useUnifiedChatLauncher();

  // Use chat sessions hook to refresh history after messages
  const { loadSessions } = useChatSessions({ autoLoad: false });

  // Determine effective employee slug: prioritize prop, then global activeEmployeeSlug, then fallback
  // This ensures the chat engine always uses the correct worker when switching
  const effectiveEmployeeSlug = initialEmployeeSlug || globalActiveEmployeeSlug || 'prime-boss';

  // Use unified chat engine (wraps usePrimeChat for consistent API)
  const {
    messages,
    isStreaming,
    error,
    isToolExecuting,
    currentTool,
    activeEmployeeSlug: engineActiveEmployeeSlug,
    sendMessage,
    headers, // Guardrails headers for status chip
    pendingConfirmation,
    confirmToolExecution,
    cancelToolExecution,
    cancelStream, // Abort in-flight streaming requests
  } = useUnifiedChatEngine({
    employeeSlug: effectiveEmployeeSlug,
    conversationId,
  });
  
  // Sync engineActiveEmployeeSlug to global launcher when handoff occurs
  useEffect(() => {
    if (engineActiveEmployeeSlug && engineActiveEmployeeSlug !== globalActiveEmployeeSlug) {
      console.log(`[UnifiedAssistantChat] 🔄 Handoff detected: updating global activeEmployeeSlug from ${globalActiveEmployeeSlug} to ${engineActiveEmployeeSlug}`);
      setActiveEmployeeGlobal(engineActiveEmployeeSlug);
    }
  }, [engineActiveEmployeeSlug, globalActiveEmployeeSlug, setActiveEmployeeGlobal]);
  
  // Use effectiveEmployeeSlug for currentEmployeeSlug to ensure consistency
  // Priority: initialEmployeeSlug prop > globalActiveEmployeeSlug > engineActiveEmployeeSlug > default
  // This ensures the component always reflects the correct worker when switching
  const currentEmployeeSlug = effectiveEmployeeSlug;

  // Sync streaming state to global launcher for header indicator
  useEffect(() => {
    if (isOpen) {
      setIsWorking(isStreaming);
    } else {
      setIsWorking(false);
    }
  }, [isOpen, isStreaming, setIsWorking]);

  // Auto-send initial question if provided (only once when chat opens)
  const initialQuestionSentRef = useRef(false);
  useEffect(() => {
    if (isOpen && initialQuestion && !initialQuestionSentRef.current && messages.length === 0 && !isStreaming) {
      // Small delay to ensure component is fully mounted
      const timeoutId = setTimeout(() => {
        sendMessage(initialQuestion);
        initialQuestionSentRef.current = true;
      }, 300);
      return () => clearTimeout(timeoutId);
    }
    // Reset when chat closes
    if (!isOpen) {
      initialQuestionSentRef.current = false;
    }
  }, [isOpen, initialQuestion, messages.length, isStreaming, sendMessage]);
  const normalizedSlug = (currentEmployeeSlug?.toLowerCase().trim() || 'prime-boss') as keyof typeof EMPLOYEE_DISPLAY_CONFIG;
  
  // Use employeeDisplayConfig as the single source of truth for chat UI
  const displayConfig = getEmployeeDisplayConfig(normalizedSlug);
  
  // Legacy: Keep employeeChatConfig for backward compatibility (welcomeMessage, etc.)
  const chatConfig = EMPLOYEE_CHAT_CONFIG[normalizedSlug as keyof typeof EMPLOYEE_CHAT_CONFIG] ?? EMPLOYEE_CHAT_CONFIG['prime-boss'];
  
  // Debug: Log which employee is being used
  useEffect(() => {
    if (isOpen) {
      console.log('[UnifiedAssistantChat] Active employee:', {
        globalActiveEmployeeSlug,
        engineActiveEmployeeSlug,
        initialEmployeeSlug,
        currentEmployeeSlug,
        normalizedSlug,
        chatTitle: displayConfig.chatTitle
      });
    }
  }, [isOpen, globalActiveEmployeeSlug, engineActiveEmployeeSlug, initialEmployeeSlug, currentEmployeeSlug, normalizedSlug, displayConfig.chatTitle]);
  
  // Quick prompts removed - no suggestion chips in chat UI
  
  // Check if Byte is active
  const isByte = normalizedSlug === 'byte-docs';
  
  // Check if Tag is active
  const isTag = normalizedSlug === 'tag-ai';
  
  // Initialize Byte upload hook only when Byte is active
  const {
    isUploading: isByteUploading,
    progressLabel: byteProgressLabel,
    handleFilesSelected: handleByteFilesSelected,
    error: byteUploadError,
  } = useByteInlineUpload(isByte ? userId : undefined);
  
  // Tag typewriter greeting state
  const [showTagIntroTyping, setShowTagIntroTyping] = useState(false);
  const [tagIntroText, setTagIntroText] = useState('');
  const [typedTagIntro, setTypedTagIntro] = useState('');
  const [isTagTyping, setIsTagTyping] = useState(false);
  const tagIntroCompletedRef = useRef(false);
  const previousEmployeeSlugRef = useRef<string | null>(null);

  // Scroll-to-bottom helper that ensures the newest message is fully visible
  const scrollToBottom = (smooth = true) => {
    const end = messagesEndRef.current;
    if (!end) return;

    // Find the actual scroll container by traversing up from messagesEndRef
    let scrollContainer: HTMLElement | null = end.parentElement;
    while (scrollContainer && !scrollContainer.classList.contains('overflow-y-auto')) {
      scrollContainer = scrollContainer.parentElement;
    }
    
    // Fallback: use scrollContainerRef if we found it
    const container = scrollContainer || scrollContainerRef.current;
    if (!container || !end) return;

    const behavior: ScrollBehavior = smooth ? 'smooth' : 'auto';

    // Prefer scrolling the sentinel into view to guarantee the last bubble is fully visible
    requestAnimationFrame(() => {
      end.scrollIntoView({ behavior, block: 'end' });
    });
  };

  // Auto-scroll effect when messages change - only scrolls if user is near bottom OR just sent
  useEffect(() => {
    const end = messagesEndRef.current;
    if (!end) return;

    // Find the actual scroll container by traversing up from messagesEndRef
    let scrollContainer: HTMLElement | null = end.parentElement;
    while (scrollContainer && !scrollContainer.classList.contains('overflow-y-auto')) {
      scrollContainer = scrollContainer.parentElement;
    }
    
    // Fallback: use scrollContainerRef if we found it
    const container = scrollContainer || scrollContainerRef.current;
    if (!container) return;

    const threshold = 80; // px from bottom to still auto-scroll
    const distanceFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;

    const shouldStickToBottom =
      userJustSentRef.current || distanceFromBottom < threshold;

    if (shouldStickToBottom) {
      scrollToBottom(true);
    }

    // Reset the "just sent" flag after we've reacted once
    if (userJustSentRef.current) {
      userJustSentRef.current = false;
    }
  }, [messages.length, isStreaming]);

  // Scroll to bottom when chat opens
  useEffect(() => {
    if (isOpen) {
      // Delay to ensure panel is rendered
      const timeoutId = setTimeout(() => {
        scrollToBottom(false); // immediate snap on open
      }, 200);
      
      return () => clearTimeout(timeoutId);
    }
  }, [isOpen]);
  
  // Scroll ByteUploadPanel into view when Byte slideout opens
  useEffect(() => {
    if (isOpen && isByte && byteUploadPanelRef.current) {
      // Delay to ensure panel is rendered
      const timeoutId = setTimeout(() => {
        byteUploadPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 300);
      return () => clearTimeout(timeoutId);
    }
  }, [isOpen, isByte]);

  // Sync unified chat engine's activeEmployeeSlug with global state when it changes
  // This ensures frontend handoffs work correctly
  useEffect(() => {
    // When global active employee changes (via handoff), the engine will sync via backend handoff events
    // For immediate frontend handoffs, we rely on the global state being correct
    // The actual message sending will use currentEmployeeSlug which comes from global state
    // Note: useUnifiedChatEngine (via usePrimeChat) handles employee handoffs internally
  }, [globalActiveEmployeeSlug]);

  // Handle file attachments from ChatInputBar (for Byte, upload immediately via Smart Import)
  const handleAttachmentSelect = async (files: File[]) => {
    if (!isByte || !userId || files.length === 0) return;
    
    try {
      const uploadResults = await smartImport.uploadFiles(userId, files, 'chat');
      const successfulCount = uploadResults.filter(r => !r.rejected).length;
      const rejected = uploadResults.filter(r => r.rejected);
      
      if (rejected.length > 0) {
        rejected.forEach((r: any) => {
          console.error('[UnifiedAssistantChat] File rejected:', r.reason);
        });
      }
      
      if (successfulCount > 0) {
        // Files uploaded successfully - Smart Import will process them
        // No need to send a message, Byte will handle it via the upload pipeline
      }
    } catch (err: any) {
      console.error('[UnifiedAssistantChat] Attachment upload error:', err);
    }
  };

  // Handle send - use currentEmployeeSlug to ensure correct employee receives message
  const handleSend = async (options?: { attachments?: File[] }) => {
    const trimmedMessage = inputMessage.trim();
    const hasAttachments = options?.attachments && options.attachments.length > 0;
    
    if ((!trimmedMessage && !hasAttachments) || isStreaming || isUploadingAttachments) return;
    
    // Upload attachments first via Smart Import, then send message with documentIds
    let documentIds: string[] = [];
    if (hasAttachments && options.attachments && userId) {
      setIsUploadingAttachments(true);
      setUploadError(null);
      
      try {
        const uploadResults = await smartImport.uploadFiles(userId, options.attachments, 'chat');
        const successfulUploads = uploadResults.filter(r => !r.rejected && r.docId);
        const rejected = uploadResults.filter(r => r.rejected);
        
        if (rejected.length > 0) {
          rejected.forEach((r: any) => {
            console.error('[UnifiedAssistantChat] File rejected:', r.reason);
          });
          setUploadError(`${rejected.length} file(s) were rejected. Please try again.`);
        }
        
        if (successfulUploads.length > 0) {
          documentIds = successfulUploads.map(r => r.docId).filter(Boolean) as string[];
        } else if (rejected.length === uploadResults.length) {
          // All files rejected - don't send message
          setIsUploadingAttachments(false);
          return;
        }
      } catch (err: any) {
        console.error('[UnifiedAssistantChat] Attachment upload error:', err);
        setUploadError('Upload failed. Please try again.');
        setIsUploadingAttachments(false);
        return;
      } finally {
        setIsUploadingAttachments(false);
      }
    }
    
    // Clear input immediately for better UX (don't wait for send to complete)
    setInputMessage('');
    
    // Mark that user just sent a message and scroll immediately so their bubble is fully visible
    userJustSentRef.current = true;
    scrollToBottom(false); // immediate snap so their bubble is fully visible
    
    let finalMessage = trimmedMessage;
    
    // If no message but we have documentIds, add a default message
    if (!finalMessage && documentIds.length > 0) {
      finalMessage = 'I just uploaded some documents. Can you help me process them?';
    }
    
    // If the global active employee differs from engine's internal state,
    // we need to ensure the message goes to the correct employee
    // The unified chat engine (via usePrimeChat) handles employee switching internally
    // Backend handoff events will sync the active employee. For immediate handoffs,
    // the user will see the UI update and can send to the new employee.
    try {
      await sendMessage(finalMessage, { documentIds: documentIds.length > 0 ? documentIds : undefined });
      // Refresh chat history after sending a message so it appears in history sidebar
      // Use a small delay to allow backend to update chat_convo_summaries
      setTimeout(() => {
        loadSessions();
      }, 2000);
    } catch (err) {
      // Error is handled by useUnifiedChatEngine and displayed in UI
      // Input stays cleared even if send fails
      console.error('[UnifiedAssistantChat] Send failed:', err);
    }
  };

  // Handle key press - now handled by ChatInputBar, but kept for backward compatibility
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Handle prompt click - autofills and auto-sends
  const handlePromptClick = async (text: string) => {
    // Auto-send the prompt immediately for better UX
    setInputMessage('');
    userJustSentRef.current = true;
    scrollToBottom(false);
    try {
      await sendMessage(text);
      setTimeout(() => {
        loadSessions();
      }, 2000);
    } catch (err) {
      console.error('[UnifiedAssistantChat] Prompt send failed:', err);
    }
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
      
      // Note: useUnifiedChatEngine (via usePrimeChat) handles handoff messages internally
      // The handoff will be visually clear from the employee switch
    }

    // 2) If the quick action targets another employee, switch the active employee
    if (action.targetEmployeeSlug) {
      // Update global state
      setActiveEmployeeGlobal(action.targetEmployeeSlug);
      
      // Note: useUnifiedChatEngine (via usePrimeChat) will sync when backend sends handoff events
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

  // Handle Escape key to close (only for slideout/overlay mode)
  useEffect(() => {
    if (mode === 'inline' || !isOpen || !onClose) return;
    
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // Abort any in-flight requests before closing
        cancelStream();
        onClose();
      }
    };
    
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose, mode, cancelStream]);

  // Cleanup: Abort in-flight requests on unmount or close
  useEffect(() => {
    return () => {
      // Abort any in-flight requests when component unmounts
      cancelStream();
    };
  }, [cancelStream]);

  // Filter out system messages for display
  const displayMessages = messages.filter((m) => m.role !== 'system');
  
  // Check if user has sent/received any messages (not just system messages)
  const hasMessages = (displayMessages?.length ?? 0) > 0;
  
  // Detect handoff from Prime (must be called before early return)
  const isHandoffFromPrime = useMemo(() => {
    // Check if we just switched from Prime to Tag
    if (isTag && previousEmployeeSlugRef.current === 'prime-boss') {
      return true;
    }
    // Also check context for handoff indicators
    if (isTag && context) {
      const ctxStr = JSON.stringify(context).toLowerCase();
      return ctxStr.includes('handoff') || ctxStr.includes('prime') || ctxStr.includes('sourceemployee');
    }
    return false;
  }, [isTag, context]);
  
  // Track previous employee slug for handoff detection (must be called before early return)
  useEffect(() => {
    if (currentEmployeeSlug && currentEmployeeSlug !== previousEmployeeSlugRef.current) {
      previousEmployeeSlugRef.current = currentEmployeeSlug;
    }
  }, [currentEmployeeSlug]);
  
  // Tag typewriter greeting effect (must be called before early return)
  useEffect(() => {
    if (!isTag || !isOpen || tagIntroCompletedRef.current) return;
    
    // Determine greeting text
    let greetingText = '';
    if (isHandoffFromPrime) {
      greetingText = 'Prime handed this to me. How can I help with your categories?';
    } else if (hasMessages) {
      greetingText = `Welcome back, ${firstName || 'there'}! What would you like to work on?`;
    } else {
      greetingText = `Hey ${firstName || 'there'}! I'm Tag, your Smart Categories assistant. What can I help you categorize today?`;
    }
    
    setTagIntroText(greetingText);
    setShowTagIntroTyping(true);
    setIsTagTyping(true);
    setTypedTagIntro('');
    
    // Show typing indicator for 500-900ms
    const typingDelay = 500 + Math.random() * 400;
    let typeInterval: NodeJS.Timeout | null = null;
    
    const typingTimeout = setTimeout(() => {
      setIsTagTyping(false);
      
      // Type out greeting character by character
      let currentIndex = 0;
      typeInterval = setInterval(() => {
        if (currentIndex < greetingText.length) {
          setTypedTagIntro(greetingText.slice(0, currentIndex + 1));
          currentIndex++;
        } else {
          if (typeInterval) clearInterval(typeInterval);
          tagIntroCompletedRef.current = true;
        }
      }, 20 + Math.random() * 15); // 20-35ms per character
    }, typingDelay);
    
    return () => {
      clearTimeout(typingTimeout);
      if (typeInterval) clearInterval(typeInterval);
    };
  }, [isTag, isOpen, isHandoffFromPrime, hasMessages, firstName]);
  
  // Reset Tag intro when chat closes or employee changes (must be called before early return)
  useEffect(() => {
    if (!isOpen || !isTag) {
      setShowTagIntroTyping(false);
      setTypedTagIntro('');
      setIsTagTyping(false);
      tagIntroCompletedRef.current = false;
    }
  }, [isOpen, isTag]);

  // For inline mode, always render (isOpen is ignored)
  // For slideout/overlay mode, only render if isOpen is true
  // IMPORTANT: This early return must happen AFTER all hooks are declared
  if (mode !== 'inline' && !isOpen) return null;

  const employeeDisplay = getEmployeeDisplay(currentEmployeeSlug);

  // Determine send button gradient based on employee
  const isPrime = normalizedSlug === 'prime-boss';
  // Extract guardrails status from headers (from useUnifiedChatEngine)
  const guardrailsActive = headers?.guardrails === 'active';
  const piiProtectionActive = headers?.piiMask === 'enabled';
  const sendButtonGradient = displayConfig.gradient; // Use employee's gradient from displayConfig
  
  // Extract glow color from gradient (simplified - use employee accent color)
  const sendButtonGlow = isPrime 
    ? 'rgba(251,191,36,0.65)'
    : normalizedSlug === 'byte-docs' 
      ? 'rgba(56,189,248,0.65)'
      : normalizedSlug === 'tag-ai'
        ? 'rgba(251,191,36,0.65)'
        : normalizedSlug === 'crystal-analytics'
          ? 'rgba(168,85,247,0.65)'
          : 'rgba(251,191,36,0.65)';

  // Status badge
  const statusBadge = (
    <div className="flex items-center gap-2 text-xs text-emerald-300">
      <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.9)]" />
      <span>Online</span>
    </div>
  );

  // ============================================================================
  // CANONICAL CHAT LAYOUT STRUCTURE
  // ============================================================================
  // Structure: HEADER -> WELCOME REGION -> MESSAGES SCROLL AREA -> INPUT BAR
  // 
  // Layout breakdown:
  // 1. HEADER (shrink-0): Employee name, subtitle, status dot, close button
  // 2. WELCOME REGION (shrink-0, only when no messages):
  //    - Welcome card with employee intro
  //    - Quick actions row (suggested prompts)
  // 3. MESSAGES SCROLL AREA (flex-1 overflow-y-auto min-h-0):
  //    - Only contains messages (user + assistant)
  //    - System/info messages (tool confirmations, upload status, etc.)
  //    - NO welcome card or duplicate quick actions
  // 4. INPUT BAR (shrink-0, sticky bottom):
  //    - Text input + Send button
  //    - Guardrails status text (if applicable)
  //
  // Key principles:
  // - Only messages area scrolls (flex-1 overflow-y-auto min-h-0)
  // - Welcome region appears once, only when no messages
  // - Quick actions appear once, in welcome region (not duplicated in empty state)
  // - Consistent max-width for chat body (w-full max-w-full mx-0 min-w-0)
  // - Tight vertical spacing to maximize message visibility
  // ============================================================================

  // BYTE UPLOAD PANEL REGION - Single primary upload dropzone (always visible for Byte)
  // Fixed height to prevent layout shift when messages appear
  const byteUploadRegion = isByte ? (
    <div className="px-4 pt-3 pb-2 shrink-0 min-h-[140px]" ref={byteUploadPanelRef}>
      <ByteUploadPanel
        onUploadCompleted={() => {
          // Optional: could trigger a refresh or show a toast
          // The upload hook already shows toast notifications
        }}
      />
      {/* Visual separator between upload and messages */}
      <div className="mt-2 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
    </div>
  ) : null;

  // WELCOME REGION - Welcome card (only shown when no messages, NOT for Tag, NOT for Byte)
  // Tag uses typewriter greeting instead
  // Byte uses compact hint bar instead of big welcome card
  // Fixed height to prevent layout shift when messages appear
  const welcomeRegion = !hasMessages && !isStreaming && !isTag && !isByte && (
    <div className={compact ? "px-4 pt-3 pb-2 shrink-0 min-h-[120px]" : "px-4 pt-4 pb-3 shrink-0 min-h-[140px]"}>
      <div className="w-full max-w-full mx-0 min-w-0">
        {/* Welcome card - polished premium styling */}
        <div className={compact ? "rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 via-white/3 to-transparent p-4 shadow-lg shadow-black/20 backdrop-blur-sm" : "rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 via-white/3 to-transparent p-5 shadow-lg shadow-black/20 backdrop-blur-sm"}>
          <div className="flex items-start gap-3">
            <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center bg-gradient-to-br ${displayConfig.gradient} shadow-lg ring-2 ring-white/10`}>
              <span className="text-lg">{displayConfig.emoji}</span>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-white mb-1">
                {displayConfig.chatTitle}
              </h3>
              <p className="text-xs text-slate-400 mb-2">
                {displayConfig.chatSubtitle}
              </p>
              <p className={compact ? "text-xs text-slate-200 leading-6" : "text-xs text-slate-200 leading-relaxed"}>
                {chatConfig.welcomeMessage}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // BYTE QUIET HINT TEXT - Subtle one-liner below upload (no duplicate upload actions)
  const byteHintBar = isByte && !hasMessages && !isStreaming ? (
    <div className="px-4 pt-1 pb-2 shrink-0">
      <p className="text-[10px] text-slate-500 text-center">
        PDF, CSV, JPG/PNG • Max 25MB
      </p>
    </div>
  ) : null;

  // TAG TYPEWRITER GREETING - Compact bubble above messages (UI-only, not persisted)
  const tagGreetingRegion = isTag && showTagIntroTyping && (
    <div className="px-4 pt-4 pb-2 shrink-0">
      <div className="w-full max-w-full mx-0 min-w-0">
        {/* Handoff banner chip */}
        {isHandoffFromPrime && (
          <div className="mb-2 flex items-center justify-start">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-900/30 border border-purple-500/40 text-xs text-purple-300">
              <ArrowRight className="w-3 h-3" />
              <span className="font-medium">Handoff from Prime</span>
            </div>
          </div>
        )}
        
        {/* Typewriter greeting bubble */}
        <div className="inline-flex items-start gap-2 px-4 py-2.5 rounded-2xl bg-slate-800/80 text-slate-100 border border-slate-700/70 max-w-[85%]">
          {/* Tag avatar */}
          <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-gradient-to-br ${displayConfig.gradient}`}>
            <span className="text-sm">{displayConfig.emoji}</span>
          </div>
          
          {/* Greeting text */}
          <div className="flex-1 min-w-0">
            {isTagTyping ? (
              <div className="flex items-center gap-1.5">
                <div className="flex gap-1">
                  <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <span className="text-xs text-slate-400">Tag is typing...</span>
              </div>
            ) : (
              <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
                {typedTagIntro}
                {typedTagIntro.length < tagIntroText.length && (
                  <span className="inline-block w-0.5 h-4 bg-slate-400 ml-0.5 animate-pulse" />
                )}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
  
  // COMBINED REGION - ByteUploadPanel + Byte hint bar + Welcome card + Tag greeting (for PrimeSlideoutShell welcomeRegion prop)
  const combinedWelcomeRegion = (
    <>
      {byteUploadRegion}
      {byteHintBar}
      {tagGreetingRegion}
      {welcomeRegion}
    </>
  );

  // INPUT FOOTER - Canonical ChatInputBar with guardrails status
  // Format guardrails status text based on actual status from headers (for all employees)
  const getGuardrailsStatusText = (): string | undefined => {
    if (guardrailsActive && piiProtectionActive) {
      return 'Guardrails are active · Content filtering and data protection enabled.';
    } else if (guardrailsActive) {
      return 'Guardrails are active · Content moderation enabled.';
    } else if (headers?.guardrails === 'inactive' || headers?.piiMask === 'disabled') {
      return 'Guardrails status: inactive';
    } else {
      return 'Guardrails status: unknown';
    }
  };

  const guardrailsStatusText = getGuardrailsStatusText();

  const inputFooter = (
    <div className="w-full max-w-full mx-0 min-w-0">
      <ChatInputBar
        value={inputMessage}
        onChange={setInputMessage}
        onSubmit={handleSend}
        placeholder={`Ask ${displayConfig.chatTitle.split('—')[0].trim()} anything...`}
        isStreaming={isStreaming}
        disabled={isUploadingAttachments}
        sendButtonGradient={sendButtonGradient}
        sendButtonGlow={sendButtonGlow}
        guardrailsStatus={isUploadingAttachments ? 'Uploading attachments...' : uploadError || guardrailsStatusText}
        showPlusIcon={isByte}
        onAttachmentsChange={isByte ? handleAttachmentSelect : undefined}
        onStop={cancelStream}
      />
    </div>
  );

  // ============================================================================
  // INLINE MODE - Render chat directly without backdrop/positioning (for pages)
  // ============================================================================
  if (mode === 'inline') {
    return (
      <div className="flex h-full w-full min-w-0 flex-col min-h-0 rounded-3xl border border-slate-800/80 bg-gradient-to-b from-slate-900/80 via-slate-950 to-slate-950 overflow-hidden">
        {/* HEADER */}
        <header className={compact ? "sticky top-0 z-20 border-b border-slate-800/70 bg-gradient-to-r from-slate-950/95 via-slate-950/90 to-slate-950/95 px-5 pt-4 pb-3 backdrop-blur-sm shrink-0" : "sticky top-0 z-20 border-b border-slate-800/70 bg-gradient-to-r from-slate-950/95 via-slate-950/90 to-slate-950/95 px-6 pt-5 pb-4 backdrop-blur-sm shrink-0"}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <span className={`inline-flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br ${displayConfig.gradient} text-base shadow-lg`}>
                  <span className="text-lg">{displayConfig.emoji}</span>
                </span>
                <div>
                  <h2 className="text-sm font-semibold tracking-[0.24em] text-slate-200 uppercase">
                    {displayConfig.chatTitle}
                  </h2>
                  {displayConfig.chatSubtitle && (
                    <p className="mt-0.5 text-xs text-slate-400 leading-relaxed">
                      {displayConfig.chatSubtitle}
                    </p>
                  )}
                </div>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              {statusBadge}
            </div>
          </div>
        </header>
        
        {/* MESSAGES SCROLL AREA - Welcome block and messages, properly scrollable */}
        <div
          ref={scrollContainerRef}
          className="flex-1 min-h-0 overflow-y-auto hide-scrollbar"
          style={{ scrollbarGutter: 'stable' }}
        >
          <div className={compact ? "px-4 pt-3 pb-3" : "px-4 pt-4 pb-4"}>
            <div className="w-full max-w-full mx-0 min-w-0 space-y-3">
              {/* Welcome block - only shown when no messages */}
              {!hasMessages && !isStreaming && welcomeRegion && (
                <div className="space-y-3 min-h-0">
                  {welcomeRegion}
                </div>
              )}

              {/* Messages list */}
              <div className="space-y-3">
                {/* Status indicator */}
                {uploadStatus && (
                  <div className="shrink-0">
                    <StatusIndicator status={uploadStatus} />
                  </div>
                )}

                {/* Byte inline upload */}
                {isByte && (
                  <ByteInlineUpload
                    onFilesSelected={handleByteFilesSelected}
                    isUploading={isByteUploading}
                    progressLabel={byteProgressLabel}
                    error={byteUploadError}
                  />
                )}

                {/* Legacy upload card */}
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

                {/* Tool Confirmation Panel */}
                {pendingConfirmation && (
                  <div className="flex justify-center mb-4">
                    <div className="w-full max-w-2xl bg-amber-900/20 border border-amber-500/30 rounded-xl p-4 backdrop-blur-sm">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center bg-amber-500/20 border border-amber-500/40">
                          <span className="text-lg">⚠️</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-semibold text-amber-200 mb-1">
                            Confirmation Required
                          </h4>
                          <p className="text-sm text-amber-100/90 mb-4">
                            {pendingConfirmation.summary}
                          </p>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={async () => {
                                if (pendingConfirmation) {
                                  await confirmToolExecution(pendingConfirmation);
                                }
                              }}
                              disabled={isStreaming}
                              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Confirm
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                cancelToolExecution();
                              }}
                              disabled={isStreaming}
                              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Messages list */}
                {displayMessages.map((message) => {
                  const isHandoffMessage = message.role === 'assistant' && 
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
                        ) : normalizedSlug === 'prime-boss' ? (
                          <PrimeLogoBadge size={32} className="flex-shrink-0" />
                        ) : (
                          <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-gradient-to-br ${displayConfig.gradient}`}>
                            <span className="text-sm">{displayConfig.emoji}</span>
                          </div>
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
                          <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
                            {message.content}
                          </p>
                          {(() => {
                            let timeLabel: string | null = null;
                            if (message.timestamp) {
                              const d = new Date(message.timestamp);
                              if (!Number.isNaN(d.getTime())) {
                                timeLabel = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
                              }
                            }
                            return timeLabel ? (
                              <p className="text-[10px] mt-1.5 opacity-60">
                                {timeLabel}
                              </p>
                            ) : null;
                          })()}
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
                        {displayConfig.chatTitle.split('—')[0].trim()} is thinking{isToolExecuting && currentTool ? ` (using ${currentTool})` : ''}...
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
        </div>

        {/* INPUT BAR */}
        <div className="flex-none border-t border-white/10 bg-slate-950/95 px-6 py-4 backdrop-blur-sm shrink-0">
          {inputFooter}
        </div>
      </div>
    );
  }

  // ============================================================================

  // ============================================================================

  // ============================================================================
  // SLIDEOUT MODE - Use PrimeSlideoutShell for ALL employees (premium slide-out style)
  // ============================================================================
  // All employees now use the same premium slide-out style as Prime
  // Only branding/copy changes per employee via employeeDisplayConfig
  // Note: This should only render when isOpen is true (checked above with early return)
  // Using z-50 (below sidebar z-[100]) to ensure sidebar remains clickable
  // Check for reduced motion preference
  const prefersReducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  
  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop - animated separately for smooth transition */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.18, ease: 'easeOut' }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden="true"
            style={{ willChange: 'opacity' }}
          />
          
          {/* Panel with rail inside */}
          <div className="relative z-50 h-full w-full md:w-auto overflow-visible flex items-stretch">
            <PrimeSlideoutShell
            title={displayConfig.chatTitle}
            subtitle={displayConfig.chatSubtitle}
            statusBadge={statusBadge}
            icon={<span className="text-lg">{displayConfig.emoji}</span>}
            iconGradient={displayConfig.gradient}
            onClose={() => {
              // Abort any in-flight requests before closing
              cancelStream();
              onClose();
            }}
            showGuardrailsBanner={false}
            floatingRail={
              <div className={`hidden md:flex flex-col gap-3 transition-opacity duration-200 ${isRailHidden ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                {/* Byte - Smart Import */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveEmployeeGlobal('byte-docs');
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
                    setActiveEmployeeGlobal('tag-ai');
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
                    setActiveEmployeeGlobal('crystal-analytics');
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
              welcomeRegion={combinedWelcomeRegion}
              footer={inputFooter}
            >
              {/* MESSAGES AREA - PrimeSlideoutShell's scroll area handles scrolling, this is just content wrapper */}
              <div className="h-full">
                <div className="px-4 pt-4 pb-4" ref={scrollContainerRef}>
                  <div className="w-full max-w-full mx-0 min-w-0 space-y-3">

                    {/* Messages list */}
                    <div className="space-y-3">
                      {/* Status indicator - shown when processing */}
                      {uploadStatus && (
                        <div className="shrink-0">
                          <StatusIndicator status={uploadStatus} />
                        </div>
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

                      {/* Tool Confirmation Panel */}
                      {pendingConfirmation && (
                      <div className="flex justify-center mb-4">
                        <div className="w-full max-w-2xl bg-amber-900/20 border border-amber-500/30 rounded-xl p-4 backdrop-blur-sm">
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center bg-amber-500/20 border border-amber-500/40">
                              <span className="text-lg">⚠️</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="text-sm font-semibold text-amber-200 mb-1">
                                Confirmation Required
                              </h4>
                              <p className="text-sm text-amber-100/90 mb-4">
                                {pendingConfirmation.summary}
                              </p>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={async () => {
                                    if (pendingConfirmation) {
                                      await confirmToolExecution(pendingConfirmation);
                                    }
                                  }}
                                  disabled={isStreaming}
                                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  Confirm
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    cancelToolExecution();
                                  }}
                                  disabled={isStreaming}
                                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      )}

                      {/* Messages list */}
                      {displayMessages.map((message) => {
                    // Detect handoff messages
                    const isHandoffMessage = message.role === 'assistant' && 
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
                          ) : normalizedSlug === 'prime-boss' ? (
                            <PrimeLogoBadge size={32} className="flex-shrink-0" />
                          ) : (
                            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-gradient-to-br ${displayConfig.gradient}`}>
                              <span className="text-sm">{displayConfig.emoji}</span>
                            </div>
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
                            {(() => {
                              let timeLabel: string | null = null;
                              if (message.timestamp) {
                                const d = new Date(message.timestamp);
                                if (!Number.isNaN(d.getTime())) {
                                  timeLabel = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
                                }
                              }
                              return timeLabel ? (
                                <p className="text-[10px] mt-1.5 opacity-60">
                                  {timeLabel}
                                </p>
                              ) : null;
                            })()}
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
                      {displayConfig.chatTitle.split('—')[0].trim()} is thinking{isToolExecuting && currentTool ? ` (using ${currentTool})` : ''}...
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
              </div>
            </PrimeSlideoutShell>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}
