/**
 * Unified Assistant Chat Component
 * 
 * Unified chat interface that can be used for any AI employee.
 * Renders as a slideout panel on the right side, keeping page content visible.
 * Styled to match Prime Tasks and Prime Team panels for visual consistency.
 */

// ====== PRIME CHAT UI ======

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Send, User, ArrowRight, X, Upload, Eye, EyeOff, History, LayoutDashboard, Grid3X3, Tags, LineChart, TrendingUp, MessageCircle, UploadCloud } from 'lucide-react';
// Migration: Using unified chat engine instead of useStreamChat
import { useUnifiedChatEngine } from '../../hooks/useUnifiedChatEngine';
import { useGuardrailsHealth } from '../../hooks/useGuardrailsHealth';
import { getEmployeeDisplay } from '../../utils/employeeUtils';
import { EMPLOYEE_CHAT_CONFIG } from '../../config/employeeChatConfig';
import { getEmployeeDisplayConfig, EMPLOYEE_DISPLAY_CONFIG } from '../../config/employeeDisplayConfig';
import { InlineUploadCard } from './InlineUploadCard';
import { StatusIndicator, type StatusType } from './StatusIndicator';
import { useAuth } from '../../contexts/AuthContext';
import { useProfileContext } from '../../contexts/ProfileContext';
import { usePrimeState } from '../../contexts/PrimeContext';
import { buildUserContextFromProfile } from '../../lib/userContextHelpers';
import { resolveDisplayNameSync } from '../../lib/user/resolveDisplayName';
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
import { useNavigate, useLocation } from 'react-router-dom';
import { usePrimeOverlaySafe } from '../../context/PrimeOverlayContext';
import { TypingIndicator } from './TypingIndicator';
import { TypingIndicatorRow } from './TypingIndicatorRow';
import { useUnifiedTypingController } from '../../hooks/useUnifiedTypingController';
import { PrimeOnboardingWelcome } from './PrimeOnboardingWelcome';
import { PrimeTrustMessage } from './PrimeTrustMessage';
import { markPrimeInitialized, markGuardrailsAcknowledged } from '../../lib/profileMetadataHelpers';
import { classifyIntent, getNextBestAction, type UserIntent } from '../../lib/intentClassification';
import { buildPrimeGreeting, type PrimeGreetingData, type PrimeGreetingChip } from './greetings/primeGreeting';
import { PrimeGreetingCard } from './PrimeGreetingCard';
import { PrimeQuickActions } from './PrimeQuickActions';
import { TypingMessage } from './TypingMessage';
import type { ChatMessage } from '../../hooks/usePrimeChat';
import { CustodianStatusBadge } from '../badges/CustodianStatusBadge';
import { onBus, emitBus } from '../../lib/bus';
import { usePostImportHandoff } from '../../hooks/usePostImportHandoff';
import { PrimeSummaryReadyStrip } from './PrimeSummaryReadyStrip';
import { useByteImportCompletion } from '../../hooks/useByteImportCompletion';

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
  
  /** Show typing indicator (default: true for slideout, false for inline preview mode) */
  showTypingIndicator?: boolean;
  
  /** Render mode: 'slideout' (floating panel) or 'page' (embedded in page) */
  renderMode?: 'slideout' | 'page';
  
  /** Disable chat runtime (no engine, no streaming, static UI only) */
  disableRuntime?: boolean;
}

export default function UnifiedAssistantChat({
  isOpen = false, // Default to closed - chat should only open on explicit user action
  onClose,
  initialEmployeeSlug = 'prime-boss',
  conversationId,
  context,
  initialQuestion,
  mode = 'slideout', // Default to slideout for backward compatibility
  floatingRail,
  compact = false,
  showTypingIndicator = mode !== 'inline', // Default: show for slideout/overlay, hide for inline
  renderMode = mode === 'inline' ? 'page' : 'slideout', // Default: page for inline, slideout otherwise
  disableRuntime = renderMode === 'page', // Default: disable runtime for page mode (slideout = false, page = true)
}: UnifiedAssistantChatProps) {
  
  // ============================================================================
  // DEVELOPMENT GUARDS - Prevent accidental hook reordering
  // ============================================================================
  if (import.meta.env.DEV) {
    // Log render for debugging hook order issues
    console.log('[UnifiedAssistantChat] 🔄 Render', {
      pathname: typeof window !== 'undefined' ? window.location.pathname : 'SSR',
      isOpen,
      initialEmployeeSlug,
    });
  }
  
  // ============================================================================
  // CRITICAL: ALL HOOKS MUST BE CALLED UNCONDITIONALLY AT THE TOP
  // NO HOOKS AFTER ANY RETURN STATEMENTS
  // ============================================================================
  
  // Hook 1: Router hooks - called unconditionally
  const location = useLocation();
  const navigate = useNavigate();
  
  // Hook 2: Auth hooks - called unconditionally
  const { ready, userId, profile, isProfileLoading, firstName, user, refreshProfile } = useAuth();
  
  // Hook 3: Profile context - called unconditionally
  const { displayName } = useProfileContext();
  
  // Hook 4: Prime state - called unconditionally (for greeting name resolution)
  const primeState = usePrimeState();
  
  // Hook 4: Prime overlay - called unconditionally
  const { setPrimeToolsOpen } = usePrimeOverlaySafe();
  
  // Hook 5: Chat launcher - called unconditionally
  const { setActiveEmployee: setActiveEmployeeGlobal, activeEmployeeSlug: globalActiveEmployeeSlug, activeEmployeeSlugOverride, setActiveEmployeeSlugOverride, openChat, setIsWorking } = useUnifiedChatLauncher();
  
  // PART 3: Route-aware auto-switch (Smart Import => Byte)
  useEffect(() => {
    if (location.pathname === '/dashboard/smart-import-ai') {
      // On Smart Import page, switch chat to Byte
      setActiveEmployeeSlugOverride('byte-docs');
    } else {
      // Clear override when leaving Byte-owned workspace
      setActiveEmployeeSlugOverride(null);
    }
  }, [location.pathname, setActiveEmployeeSlugOverride]);
  
  // Hook 6: Chat sessions - called unconditionally
  const { loadSessions } = useChatSessions({ autoLoad: false });
  
  // Hook 7: Smart import - called unconditionally
  const smartImport = useSmartImport();
  
  // Hook 8: State hooks - called unconditionally
  const [inputMessage, setInputMessage] = useState('');
  const [isRailHidden, setIsRailHidden] = useState(false); // Rail is visible by default
  const scrollContainerRef = useRef<HTMLDivElement | null>(null); // Points to wrapper (for drag handlers)
  const scrollElementRef = useRef<HTMLDivElement | null>(null); // Points to actual scroll container
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // CRITICAL: Track if user is near bottom for auto-scroll during streaming
  const [isNearBottom, setIsNearBottom] = useState(true);
  const scrollContainerElementRef = useRef<HTMLElement | null>(null); // Actual scroll container (found via DOM traversal)
  
  // Local state for injected messages (e.g., Byte closeout, Prime recap)
  const [injectedMessages, setInjectedMessages] = useState<ChatMessage[]>([]);
  const userJustSentRef = useRef(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const byteUploadPanelRef = useRef<HTMLDivElement | null>(null);
  const [showUploadCard, setShowUploadCard] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<StatusType | null>(null);
  const [isUploadingAttachments, setIsUploadingAttachments] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDraggingOverChat, setIsDraggingOverChat] = useState(false);
  
  // Determine effective employee slug: prioritize override, then prop, then global activeEmployeeSlug, then fallback
  // PART 2: Route-aware override takes precedence (UI-only) - but only on initial mount
  // CRITICAL: /dashboard/prime-chat defaults to Prime, but respects handoffs after they occur
  // After a handoff, use the engine's activeEmployeeSlug (which reflects the handoff)
  const isPrimeChatPage = location.pathname === '/dashboard/prime-chat';
  const routeForcedEmployeeSlug = isPrimeChatPage ? 'prime-boss' : null;
  
  // Calculate initial effectiveEmployeeSlug: default to Prime on Prime Chat page, otherwise use override/prop/global
  const initialEffectiveEmployeeSlug = routeForcedEmployeeSlug || activeEmployeeSlugOverride || initialEmployeeSlug || globalActiveEmployeeSlug || 'prime-boss';
  
  // CRITICAL: Declare effectiveEmployeeSlug early so it's available for all useEffect hooks
  // Initially use initialEffectiveEmployeeSlug - it will be updated after engineResult is available
  // We'll use a state variable that gets updated when engineActiveEmployeeSlug changes
  const [effectiveEmployeeSlugState, setEffectiveEmployeeSlugState] = useState<string>(initialEffectiveEmployeeSlug);
  
  // effectiveEmployeeSlug: use state value (will be updated when engineActiveEmployeeSlug changes)
  // CRITICAL: Must be declared BEFORE any useEffect that uses it
  const effectiveEmployeeSlug = effectiveEmployeeSlugState;

  // Load chat history when chat opens and employee/session changes
  const [loadedHistoryMessages, setLoadedHistoryMessages] = useState<ChatMessage[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const historyLoadedRef = useRef<string | null>(null); // Track which session we've loaded
  const [resolvedThreadId, setResolvedThreadId] = useState<string | null>(null); // Track resolved thread_id for identity key
  
  // PART 1: Double-init guard (StrictMode-safe)
  const initKeyRef = useRef<string>('');
  
  // PART 2: Double-send idempotency guard
  const lastSendSigRef = useRef<string>('');
  const lastSendTimeRef = useRef<number>(0);
  
  // PART 3: Engine ready latch - prevents flip-flop between history and engine messages
  // Use state instead of ref to ensure UI re-renders when latch changes
  const [engineReadyLatched, setEngineReadyLatched] = useState<boolean>(false);
  const lastIdentityKeyRef = useRef<string | null>(null); // Track last identity key for latch reset
  
  // Load chat history from database when chat opens
  useEffect(() => {
    if (disableRuntime || !isOpen || !userId || !effectiveEmployeeSlug) {
      return;
    }
    
    // Get sessionId from localStorage (same format as usePrimeChat)
    const getSessionId = () => {
      try {
        const storageKey = `chat_session_${userId}_${effectiveEmployeeSlug}`;
        return localStorage.getItem(storageKey) || conversationId || undefined;
      } catch (e) {
        return conversationId || undefined;
      }
    };
    
    const sessionId = getSessionId();
    const historyKey = `${sessionId}_${effectiveEmployeeSlug}`;
    const initKey = `${userId}:${effectiveEmployeeSlug}:${sessionId || 'no-session'}`;
    
    // PART 1: Double-init guard (StrictMode-safe)
    if (initKeyRef.current === initKey) {
      return; // Already initialized for this user+employee+session combo
    }
    initKeyRef.current = initKey;
    
    // Skip if we've already loaded this session
    if (historyLoadedRef.current === historyKey) {
      return;
    }
    
    // PART B: Stop repeated session-cache merge on remount
    // CRITICAL: Use stable key based on threadId (preferred) or sessionId, not changing scope
    // This ensures idempotency even if threadId/sessionId resolution changes
    let stableKey = 'no-key';
    try {
      const threadStorageKey = `chat_thread_${userId}_${effectiveEmployeeSlug}`;
      const storedThreadId = localStorage.getItem(threadStorageKey);
      if (storedThreadId) {
        stableKey = `thread:${storedThreadId}`;
      } else if (sessionId) {
        stableKey = `session:${sessionId}`;
      } else {
        stableKey = `employee:${effectiveEmployeeSlug}`;
      }
    } catch (e) {
      // Ignore localStorage errors, fallback to sessionId
      stableKey = sessionId ? `session:${sessionId}` : `employee:${effectiveEmployeeSlug}`;
    }
    const sessionLoadKey = `prime_session_loaded::${userId}::${stableKey}`;
    if (typeof window !== 'undefined' && sessionStorage.getItem(sessionLoadKey) === '1') {
      if (import.meta.env.DEV) {
        console.log(`[UnifiedAssistantChat] ✅ Skipping history load - already loaded (key: ${stableKey.substring(0, 20)}...)`);
      }
      return;
    }
    
    // CRITICAL: Do NOT early return when sessionId is null
    // The fallback query logic (lines 412-443) handles null sessionId by:
    // 1. Querying by threadId if available
    // 2. Querying by recent sessions list if threadId is null
    // 3. Querying by userId only as last resort
    // All fallbacks use .is('thread_id', null) to prevent overlap with thread_id queries
    
    setIsLoadingHistory(true);
    
    const loadHistory = async () => {
      try {
        const { getSupabase } = await import('../../lib/supabase');
        const supabase = getSupabase();
        if (!supabase) {
          setIsLoadingHistory(false);
          return;
        }
        
        // Map employee slug to employee_key
        const employeeKeyMap: Record<string, string> = {
          'prime-boss': 'prime',
          'tag-ai': 'tag',
          'byte-docs': 'byte',
          'crystal-ai': 'crystal',
          'goalie-agent': 'goalie',
          'automa-automation': 'automa',
          'blitz-debt': 'blitz',
          'liberty-freedom': 'liberty',
          'chime-bills': 'chime',
          'roundtable-podcast': 'roundtable',
          'serenity-therapist': 'serenity',
          'harmony-wellness': 'harmony',
          'wave-spotify': 'wave',
          'ledger-tax': 'ledger',
          'intelia-bi': 'intelia',
          'dash-analytics': 'dash',
          'custodian-settings': 'custodian',
        };
        const employeeKey = employeeKeyMap[effectiveEmployeeSlug] || effectiveEmployeeSlug.split('-')[0] || 'prime';
        
        // First, try to get thread_id from localStorage (faster, avoids DB call)
        let threadId: string | null = null;
        try {
          const threadStorageKey = `chat_thread_${userId}_${effectiveEmployeeSlug}`;
          const storedThreadId = localStorage.getItem(threadStorageKey);
          if (storedThreadId) {
            threadId = storedThreadId;
            setResolvedThreadId(storedThreadId); // Update state for identity key
          }
        } catch (e) {
          console.warn('[UnifiedAssistantChat] Failed to read thread_id from localStorage:', e);
        }
        
        // Fallback: get or create thread from database
        if (!threadId) {
          try {
            const { data: threadData, error: threadError } = await supabase
              .from('chat_threads')
              .select('id')
              .eq('user_id', userId)
              .eq('employee_key', employeeKey)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle();
            
            if (threadData?.id && !threadError) {
              threadId = threadData.id;
              // Store in localStorage for next time
              try {
                const threadStorageKey = `chat_thread_${userId}_${effectiveEmployeeSlug}`;
                if (threadId) {
                  localStorage.setItem(threadStorageKey, threadId);
                  setResolvedThreadId(threadId); // Update state for identity key
                }
              } catch (e) {
                // Ignore localStorage errors
              }
            } else {
              // Create new thread
              const { data: newThread, error: createError } = await supabase
                .from('chat_threads')
                .insert({
                  user_id: userId,
                  employee_key: employeeKey,
                  assistant_key: employeeKey, // CRITICAL: assistant_key must never be null
                })
                .select('id')
                .single();
              
              if (newThread?.id && !createError) {
                threadId = newThread.id;
                // Store in localStorage for next time
                if (threadId) {
                  try {
                    const threadStorageKey = `chat_thread_${userId}_${effectiveEmployeeSlug}`;
                    localStorage.setItem(threadStorageKey, threadId);
                    setResolvedThreadId(threadId); // Update state for identity key
                  } catch (e) {
                    // Ignore localStorage errors
                  }
                }
              }
            }
          } catch (threadErr: any) {
            console.warn('[UnifiedAssistantChat] Failed to get/create thread:', threadErr);
          }
        }
        
        // Fetch messages from chat_messages table (prefer thread_id, fallback to session_id, then userId + employeeSlug)
        // CRITICAL: Ensure fallback queries don't overlap with thread_id results
        // CRITICAL: Include metadata column for deduplication by client_message_id and request_id
        let query = supabase
          .from('chat_messages')
          .select('id, role, content, created_at, session_id, thread_id, metadata')
          .eq('user_id', userId)
          .order('created_at', { ascending: true })
          .limit(50);
        
        if (threadId) {
          // Primary: Query by thread_id (most reliable)
          query = query.eq('thread_id', threadId);
          if (import.meta.env.DEV) {
            console.log(`[UnifiedAssistantChat] 📥 Loading history by thread_id: ${threadId.substring(0, 8)}...`);
          }
        } else if (sessionId) {
          // Fallback 1: Query by session_id (if no thread_id)
          query = query.eq('session_id', sessionId);
          if (import.meta.env.DEV) {
            console.log(`[UnifiedAssistantChat] 📥 Loading history by session_id: ${sessionId.substring(0, 8)}...`);
          }
        } else {
          // Fallback 2: Query by userId + employeeSlug for legacy messages with NULL thread_id
          // CRITICAL: Exclude messages that already have thread_id to prevent overlap
          try {
            const { data: sessionsData } = await supabase
              .from('chat_sessions')
              .select('id')
              .eq('user_id', userId)
              .eq('employee_slug', effectiveEmployeeSlug)
              .order('updated_at', { ascending: false })
              .limit(5);
            
            if (sessionsData && sessionsData.length > 0) {
              const sessionIds = sessionsData.map(s => s.id);
              // CRITICAL: Exclude messages with thread_id to prevent overlap with thread-based queries
              query = query.in('session_id', sessionIds).is('thread_id', null);
              if (import.meta.env.DEV) {
                console.log(`[UnifiedAssistantChat] 📥 Fallback: loading messages from ${sessionIds.length} sessions (excluding thread_id messages)`);
              }
            } else {
              // Last resort: get recent messages by userId only (may include other employees)
              // CRITICAL: Exclude messages with thread_id to prevent overlap
              query = query.is('thread_id', null);
              if (import.meta.env.DEV) {
                console.log('[UnifiedAssistantChat] 📥 Fallback: loading recent messages by userId only (excluding thread_id messages)');
              }
            }
          } catch (fallbackErr: any) {
            console.warn('[UnifiedAssistantChat] Fallback query failed:', fallbackErr);
            // Continue with userId-only query (excluding thread_id)
            query = query.is('thread_id', null);
          }
        }
        
        const { data, error } = await query;
        
        if (error) {
          console.warn('[UnifiedAssistantChat] Failed to load message history:', error);
          setIsLoadingHistory(false);
          return;
        }
        
        if (data && data.length > 0) {
          const historyMessages: ChatMessage[] = data
            .filter(m => m.role !== 'system')
            .map(m => ({
              id: m.id,
              role: m.role as 'user' | 'assistant',
              content: m.content || '',
              createdAt: m.created_at,
              meta: (m as any).meta ?? (m as any).metadata ?? undefined,
            }));
          
          // PART 3: Deduplicate messages by id, client_message_id (for user), or request_id (for assistant)
          const messageMap = new Map<string, ChatMessage>();
          const seenClientIds = new Set<string>();
          const seenRequestIds = new Set<string>();
          
          historyMessages.forEach(msg => {
            // Primary dedupe by message.id
            if (messageMap.has(msg.id)) {
              return;
            }
            
            // For user messages: dedupe by client_message_id
            if (msg.role === 'user' && msg.meta?.client_message_id) {
              const clientId = msg.meta.client_message_id;
              if (seenClientIds.has(clientId)) {
                return;
              }
              seenClientIds.add(clientId);
            }
            
            // For assistant messages: dedupe by request_id (streaming placeholders)
            if (msg.role === 'assistant' && msg.meta?.request_id) {
              const requestId = msg.meta.request_id;
              if (seenRequestIds.has(requestId)) {
                return;
              }
              seenRequestIds.add(requestId);
            }
            
            messageMap.set(msg.id, msg);
          });
          const deduplicatedMessages = Array.from(messageMap.values());
          
          setLoadedHistoryMessages(deduplicatedMessages);
          historyLoadedRef.current = historyKey;
          
          // PART B: Mark session as loaded in sessionStorage
          if (typeof window !== 'undefined') {
            sessionStorage.setItem(sessionLoadKey, '1');
          }
          
          if (import.meta.env.DEV) {
            console.log(`[UnifiedAssistantChat] ✅ Loaded ${deduplicatedMessages.length} messages from history (${historyMessages.length - deduplicatedMessages.length} duplicates removed, key: ${stableKey.substring(0, 20)}...)`);
          }
        } else {
          setLoadedHistoryMessages([]);
          historyLoadedRef.current = historyKey;
          
          // PART B: Mark session as loaded even if no messages
          if (typeof window !== 'undefined') {
            sessionStorage.setItem(sessionLoadKey, '1');
          }
        }
      } catch (err: any) {
        console.error('[UnifiedAssistantChat] Error loading chat history:', err);
        setLoadedHistoryMessages([]);
      } finally {
        setIsLoadingHistory(false);
      }
    };
    
    loadHistory();
  }, [isOpen, userId, effectiveEmployeeSlug, conversationId, disableRuntime]);
  
  // Reset history loaded ref and init key when employee changes
  useEffect(() => {
    historyLoadedRef.current = null;
    initKeyRef.current = ''; // Reset init key when employee changes
  }, [effectiveEmployeeSlug]);
  
  // Reset resolvedThreadId when employee or conversation changes (fresh start)
  useEffect(() => {
    setResolvedThreadId(null);
  }, [effectiveEmployeeSlug, conversationId, userId]);
  
  // Create stable chat identity key (prefer threadId, fallback to sessionId/employee)
  // CRITICAL: This key identifies the conversation/thread and is used to reset the latch
  const chatIdentityKey = useMemo(() => {
    // Prefer resolved threadId from state (set after loadHistory resolves it)
    if (resolvedThreadId) {
      return `thread:${resolvedThreadId}`;
    }
    // Fallback: try localStorage synchronously (may be available before loadHistory runs)
    // CRITICAL: Guard localStorage access with typeof window check for SSR safety
    if (typeof window !== 'undefined') {
      try {
        if (userId && effectiveEmployeeSlug) {
          const threadStorageKey = `chat_thread_${userId}_${effectiveEmployeeSlug}`;
          const storedThreadId = localStorage.getItem(threadStorageKey);
          if (storedThreadId) {
            return `thread:${storedThreadId}`;
          }
        }
      } catch (e) {
        // Ignore localStorage errors
      }
    }
    // Fallback to sessionId
    if (conversationId) {
      return `session:${conversationId}`;
    }
    // Last resort: employee + userId
    return `employee:${userId || 'anon'}:${effectiveEmployeeSlug || 'unknown'}`;
  }, [resolvedThreadId, conversationId, userId, effectiveEmployeeSlug]);
  
  // Reset engine ready latch when conversation identity changes or runtime mode changes
  // CRITICAL: Reset latch when identity key changes (threadId resolved, sessionId changes, etc.)
  // Also reset when disableRuntime changes to ensure proper behavior when switching modes
  useEffect(() => {
    if (lastIdentityKeyRef.current !== chatIdentityKey) {
      const oldKey = lastIdentityKeyRef.current;
      setEngineReadyLatched(false);
      lastIdentityKeyRef.current = chatIdentityKey;
      if (import.meta.env.DEV) {
        console.log('[EngineReadyLatch] 🔄 Reset latch (identity changed)', {
          from: oldKey,
          to: chatIdentityKey,
        });
      }
    }
  }, [chatIdentityKey]);
  
  // Reset latch when runtime mode changes
  useEffect(() => {
    setEngineReadyLatched(false);
    if (import.meta.env.DEV) {
      console.log('[EngineReadyLatch] 🔄 Reset latch (runtime mode changed)', {
        disableRuntime,
      });
    }
  }, [disableRuntime]);

  // Use unified chat engine (wraps usePrimeChat for consistent API)
  // Always call hook (React rules), but pass undefined employeeSlug when runtime disabled to prevent initialization
  // CRITICAL: Must be called BEFORE useMemo hooks that reference 'messages'
  // Pass loaded history as initialMessages so conversation persists
  // PART 3: Deduplicate initialMessages to prevent duplicates
  const deduplicatedInitialMessages = useMemo(() => {
    if (loadedHistoryMessages.length === 0) return undefined;
    // Deduplicate by id, client_message_id (for user), or request_id (for assistant placeholders)
    const messageMap = new Map<string, ChatMessage>();
    const seenClientIds = new Set<string>();
    const seenRequestIds = new Set<string>();
    
    loadedHistoryMessages.forEach(msg => {
      // Primary dedupe by message.id
      if (messageMap.has(msg.id)) {
        return;
      }
      
      // For user messages: dedupe by client_message_id
      if (msg.role === 'user' && msg.meta?.client_message_id) {
        const clientId = msg.meta.client_message_id;
        if (seenClientIds.has(clientId)) {
          return;
        }
        seenClientIds.add(clientId);
      }
      
      // For assistant messages: dedupe by request_id (streaming placeholders)
      if (msg.role === 'assistant' && msg.meta?.request_id) {
        const requestId = msg.meta.request_id;
        if (seenRequestIds.has(requestId)) {
          return;
        }
        seenRequestIds.add(requestId);
      }
      
      messageMap.set(msg.id, msg);
    });
    return Array.from(messageMap.values());
  }, [loadedHistoryMessages]);
  
  // Determine initial employeeSlug for engine: default to Prime on Prime Chat page
  // After handoffs, engineActiveEmployeeSlug will be used (tracked via ref)
  const engineEmployeeSlugRef = useRef<string | undefined>(
    disableRuntime ? undefined : (
      (isPrimeChatPage ? 'prime-boss' : null) || 
      activeEmployeeSlugOverride || 
      initialEmployeeSlug || 
      globalActiveEmployeeSlug || 
      'prime-boss'
    )
  );
  
  const engineResult = useUnifiedChatEngine({
    employeeSlug: disableRuntime ? undefined : engineEmployeeSlugRef.current,
    conversationId: disableRuntime ? undefined : conversationId,
    initialMessages: deduplicatedInitialMessages,
  });
  
  // Extract engineActiveEmployeeSlug and update refs for next render (handoffs update this)
  const engineActiveEmployeeSlug = disableRuntime ? undefined : engineResult.activeEmployeeSlug;
  if (engineActiveEmployeeSlug && !disableRuntime) {
    engineEmployeeSlugRef.current = engineActiveEmployeeSlug;
  }
  
  // Update effectiveEmployeeSlugState when engineActiveEmployeeSlug changes (handoffs)
  useEffect(() => {
    if (!disableRuntime && engineActiveEmployeeSlug) {
      setEffectiveEmployeeSlugState(engineActiveEmployeeSlug);
    } else if (!disableRuntime && !engineActiveEmployeeSlug && initialEffectiveEmployeeSlug) {
      // Reset to initial if engineActiveEmployeeSlug becomes undefined
      setEffectiveEmployeeSlugState(initialEffectiveEmployeeSlug);
    }
  }, [disableRuntime, engineActiveEmployeeSlug, initialEffectiveEmployeeSlug]);
  
  // Use empty/default values when runtime is disabled (hook will still initialize but with no employee)
  const {
    messages,
    isStreaming,
    error,
    isToolExecuting,
    currentTool,
    sendMessage,
    headers,
    guardrailsStatus: chatGuardrailsStatus, // Guardrails status from chat response (preferred)
    pendingConfirmation,
    confirmToolExecution,
    cancelToolExecution,
    cancelStream,
  } = disableRuntime ? {
    messages: [],
    isStreaming: false,
    error: null,
    isToolExecuting: false,
    currentTool: null,
    sendMessage: async () => {
      if (import.meta.env.DEV) console.warn('[UnifiedAssistantChat] sendMessage called but runtime is disabled');
    },
    headers: {},
    guardrailsStatus: {
      enabled: true,
      pii_masking: true,
      moderation: true,
      policy_version: 'balanced',
      checked_at: new Date().toISOString(),
      mode: 'streaming' as const,
      reason: undefined,
    },
    pendingConfirmation: null,
    confirmToolExecution: async () => {},
    cancelToolExecution: () => {},
    cancelStream: () => {},
  } : engineResult;
  
  // effectiveEmployeeSlug is already declared above and will update via useState when engineActiveEmployeeSlug changes
  // currentEmployeeSlug uses effectiveEmployeeSlug (which reflects handoffs via state)
  const currentEmployeeSlug = effectiveEmployeeSlug;
  
  // Check if Prime onboarding should be shown
  const showPrimeOnboarding = React.useMemo(() => {
    if (!userId || !profile || currentEmployeeSlug !== 'prime-boss' || !isOpen) return false;
    if (profile.metadata && typeof profile.metadata === 'object') {
      const metadata = profile.metadata as any;
      return metadata.prime_initialized !== true;
    }
    return true; // Show if no metadata
  }, [userId, profile, currentEmployeeSlug, isOpen]);
  
  const [primeOnboardingCompleted, setPrimeOnboardingCompleted] = useState(false);

  // CRITICAL: All state/refs used in useEffect below must be declared BEFORE the useEffect
  const [chatReady, setChatReady] = useState(false);
  const [showGreetingTyping, setShowGreetingTyping] = useState(false);
  const [greetingText, setGreetingText] = useState('');
  const [typedGreeting, setTypedGreeting] = useState('');
  const [primeGreetingData, setPrimeGreetingData] = useState<PrimeGreetingData | null>(null);
  const greetingCompletedRef = useRef(false);
  const previousEmployeeSlugRef = useRef<string | null>(null);
  const previousConversationIdRef = useRef<string | null>(null);
  const greetedThisOpenRef = useRef(false); // Track if greeting was shown for this open session
  const greetedThreadRef = useRef<string | null>(null); // Track which thread/conversation was greeted (prevents double-mount greetings)
  const didShowWelcomeThisOpenRef = useRef(false); // Track if welcome message was shown for this open session
  const hasUserSentMessageRef = useRef(false); // Track if user has sent a message (prevents greeting typing after first send)
  // REMOVED: greetingInjectedRef - greeting always types in, never injected instantly
  
  // Track which assistant messages have been typed (persisted across renders)
  // Use Set stored in ref to persist while chat shell stays mounted
  const typedMessageIdsRef = useRef<Set<string>>(new Set());

  // Body scroll lock: Lock page scroll when chat is open
  // CRITICAL: On /dashboard/prime-chat, do NOT lock body scroll to allow page scrolling to Activity Feed
  useEffect(() => {
    if (!isOpen || mode === 'inline') return; // Don't lock for inline mode
    
    // Route awareness: Don't lock body scroll on Prime Chat page
    const isPrimeChatPage = location.pathname === '/dashboard/prime-chat';
    if (isPrimeChatPage) return; // Allow page to scroll naturally on Prime Chat page

    // Calculate scrollbar width to prevent layout shift
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    
    // Store original values
    const originalOverflow = document.body.style.overflow;
    const originalPaddingRight = document.body.style.paddingRight;
    
    // Lock scroll and add padding for scrollbar (only on non-Prime Chat pages)
    document.body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
    
    // Restore on cleanup
    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.paddingRight = originalPaddingRight;
    };
  }, [isOpen, mode, location.pathname]);

  // Regenerate greeting when onboarding completes and profile updates
  useEffect(() => {
    if (primeOnboardingCompleted && currentEmployeeSlug === 'prime-boss' && profile && isOpen && chatReady) {
      // Reset greeting state so it regenerates with new metadata
      greetingCompletedRef.current = false;
      setShowGreetingTyping(false);
      setTypedGreeting('');
      setPrimeGreetingData(null); // Reset Prime greeting data
      
      // Small delay to ensure profile state has fully updated
      const timer = setTimeout(() => {
        // Trigger greeting regeneration by resetting the ref
        // The greeting useEffect will pick this up and regenerate
        if (import.meta.env.DEV) {
          console.log('[UnifiedAssistantChat] Regenerating greeting after onboarding completion');
        }
      }, 300);
      
      return () => clearTimeout(timer);
    }
  }, [primeOnboardingCompleted, profile, currentEmployeeSlug, isOpen, chatReady]);
  
  // Intent classification (local state only, not persisted)
  const [detectedIntent, setDetectedIntent] = useState<UserIntent | null>(null);
  const [hasShownTrustMessage, setHasShownTrustMessage] = useState(false);
  const [firstAssistantResponseId, setFirstAssistantResponseId] = useState<string | null>(null);
  
  // Check if trust message should be shown
  // CRITICAL: This useMemo must come AFTER messages is defined from useUnifiedChatEngine
  const shouldShowTrustMessage = React.useMemo(() => {
    if (!userId || !profile || currentEmployeeSlug !== 'prime-boss') return false;
    if (hasShownTrustMessage) return false;
    
    // Check if already acknowledged
    if (profile.metadata && typeof profile.metadata === 'object') {
      const metadata = profile.metadata as any;
      if (metadata.guardrails_acknowledged === true) {
        return false;
      }
    }
    
    // Show if we have at least one assistant message
    const assistantMessages = messages.filter(m => m.role === 'assistant');
    return assistantMessages.length > 0;
  }, [userId, profile, currentEmployeeSlug, hasShownTrustMessage, messages]);
  
  // Sync engineActiveEmployeeSlug to global launcher when handoff occurs (only when runtime enabled)
  useEffect(() => {
    if (!disableRuntime && engineActiveEmployeeSlug && engineActiveEmployeeSlug !== globalActiveEmployeeSlug) {
      console.log(`[UnifiedAssistantChat] 🔄 Handoff detected: updating global activeEmployeeSlug from ${globalActiveEmployeeSlug} to ${engineActiveEmployeeSlug}`);
      setActiveEmployeeGlobal(engineActiveEmployeeSlug);
    }
  }, [engineActiveEmployeeSlug, globalActiveEmployeeSlug, setActiveEmployeeGlobal, disableRuntime]);
  
  // currentEmployeeSlug is now defined above (before useMemo hooks that reference it)

  // Sync streaming state to global launcher for header indicator (only when runtime enabled)
  useEffect(() => {
    if (!disableRuntime && isOpen) {
      setIsWorking(isStreaming);
    } else if (!disableRuntime) {
      setIsWorking(false);
    }
  }, [isOpen, isStreaming, setIsWorking, disableRuntime]);

  // Auto-send initial question if provided (only once when chat opens, only when runtime enabled)
  const initialQuestionSentRef = useRef(false);
  useEffect(() => {
    if (!disableRuntime && isOpen && initialQuestion && !initialQuestionSentRef.current && messages.length === 0 && !isStreaming) {
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
  }, [isOpen, initialQuestion, messages.length, isStreaming, sendMessage, disableRuntime]);
  
  // Hook: Compute normalized slug (needed for other hooks)
  const normalizedSlug = (currentEmployeeSlug?.toLowerCase().trim() || 'prime-boss') as keyof typeof EMPLOYEE_DISPLAY_CONFIG;
  
  // Hook: Compute display config (needed for other hooks)
  const displayConfig = getEmployeeDisplayConfig(normalizedSlug);
  
  // Hook: Compute chat config (needed for other hooks)
  const chatConfig = EMPLOYEE_CHAT_CONFIG[normalizedSlug as keyof typeof EMPLOYEE_CHAT_CONFIG] ?? EMPLOYEE_CHAT_CONFIG['prime-boss'];
  
  // Hook: Check if Byte is active (needed for useByteInlineUpload)
  const isByte = normalizedSlug === 'byte-docs';
  
  // Hook: Check if Tag is active
  const isTag = normalizedSlug === 'tag-ai';
  
  // Hook: Byte upload hook - MUST be called unconditionally before early return
  const {
    isUploading: isByteUploading,
    progressLabel: byteProgressLabel,
    handleFilesSelected: handleByteFilesSelected,
    error: byteUploadError,
  } = useByteInlineUpload(isByte && userId ? userId : undefined);

  // Hook: Post-import handoff (Tag + Crystal silent processing, Prime summary preparation)
  const {
    primeSummaryReady,
    getPrimeSummary,
    consumePrimeSummary,
  } = usePostImportHandoff(userId || undefined);

  // Hook: Monitor import completion and emit BYTE_IMPORT_COMPLETED events
  // This monitors all recent imports and emits events when they complete
  useByteImportCompletion({
    userId: userId || '',
    // No specific importId - monitors all recent imports
  });
  
  // Hook: Unified typing controller - MUST be called unconditionally before early return
  const typingController = useUnifiedTypingController(conversationId || null, currentEmployeeSlug);
  const { isTyping, typingEmployeeSlug, beginTyping, endTyping, withTyping, isTypingFor } = typingController;
  
  // Hook: Dev-only mount/unmount logging with unique ID
  const mountIdRef = useRef<string>(`chat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
  useEffect(() => {
    if (import.meta.env.DEV) {
      const pathname = typeof window !== 'undefined' ? window.location.pathname : 'unknown';
      const mountInfo = { 
        mountId: mountIdRef.current,
        pathname,
        initialEmployeeSlug,
        isOpen,
        conversationId,
        mode,
        renderMode
      };
      console.log('[MOUNT] UnifiedAssistantChat', mountInfo);
      
      // Verify single instance - check DOM for other UnifiedAssistantChat mounts
      const allChatMounts = document.querySelectorAll('[data-unified-chat-mount]');
      if (allChatMounts.length > 1) {
        console.error('[UnifiedAssistantChat] ⚠️ MULTIPLE MOUNTS DETECTED:', {
          count: allChatMounts.length,
          currentMount: mountIdRef.current,
          pathname: mountInfo.pathname,
          mode: mountInfo.mode,
          renderMode: mountInfo.renderMode
        });
      }
      
      return () => {
        console.log('[UnifiedAssistantChat] 🔴 Unmounted', { 
          mountId: mountIdRef.current,
          initialEmployeeSlug,
          pathname,
          reason: 'Component unmounting'
        });
      };
    }
  }, []); // Empty deps - only log on mount/unmount, not on every prop change
  
  // Hook: Log when isOpen changes (but don't remount)
  const openTimeRef = useRef<number | null>(null);
  useEffect(() => {
    if (import.meta.env.DEV) {
      if (isOpen && !openTimeRef.current) {
        // Slideout opening
        openTimeRef.current = Date.now();
        console.log('[UnifiedAssistantChat] 🚀 OPEN event', { 
          mountId: mountIdRef.current,
          employeeSlug: currentEmployeeSlug,
          conversationId,
          timestamp: new Date().toISOString()
        });
      } else if (!isOpen && openTimeRef.current) {
        // Slideout closing
        const duration = Date.now() - openTimeRef.current;
        console.log('[UnifiedAssistantChat] 🔒 CLOSE event', { 
          mountId: mountIdRef.current,
          duration: `${duration}ms`,
          timestamp: new Date().toISOString()
        });
        openTimeRef.current = null;
      }
      
      console.log('[UnifiedAssistantChat] 📊 isOpen changed', { 
        mountId: mountIdRef.current,
        isOpen,
        previousEmployeeSlug: previousEmployeeSlugRef.current,
        currentEmployeeSlug,
        conversationId
      });
    }
  }, [isOpen, currentEmployeeSlug, conversationId]);
  
  // Hook: Set chatReady after open stabilizes (one frame after open)
  // CRITICAL: This must come AFTER chatReady is declared but BEFORE any useEffect that uses it
  useEffect(() => {
    if (isOpen && !chatReady) {
      // Wait for next frame to ensure layout is stable
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setChatReady(true);
          if (import.meta.env.DEV) {
            console.log('[UnifiedAssistantChat] ✅ Chat ready', { 
              mountId: mountIdRef.current,
              employeeSlug: currentEmployeeSlug,
              timeSinceOpen: openTimeRef.current ? `${Date.now() - openTimeRef.current}ms` : 'unknown'
            });
          }
        });
      });
    } else if (!isOpen && chatReady) {
      setChatReady(false);
    }
  }, [isOpen, chatReady, currentEmployeeSlug]);
  
  // Hook: Debug - Log which employee is being used + render tracking
  useEffect(() => {
    if (import.meta.env.DEV) {
      if (isOpen) {
        console.log('[UnifiedAssistantChat] 🎨 Render', {
          globalActiveEmployeeSlug,
          engineActiveEmployeeSlug,
          initialEmployeeSlug,
          currentEmployeeSlug,
          normalizedSlug,
          chatTitle: displayConfig.chatTitle,
          messageCount: messages.length,
          isStreaming,
        });
      }
    }
  }, [isOpen, globalActiveEmployeeSlug, engineActiveEmployeeSlug, initialEmployeeSlug, currentEmployeeSlug, normalizedSlug, displayConfig.chatTitle, messages.length, isStreaming]);
  
  // Universal on-open greeting state (Tag-style, works for all employees)
  // Uses unified typing controller for greeting typing indicator
  // NOTE: greetingCompletedRef, showGreetingTyping, typedGreeting, previousEmployeeSlugRef, previousConversationIdRef
  // are now declared above (before useEffect that uses them)

  // Helper to find and cache the scroll container
  const findScrollContainer = useCallback((): HTMLElement | null => {
    // Use scrollElementRef first (points directly to scroll container)
    if (scrollElementRef.current) {
      scrollContainerElementRef.current = scrollElementRef.current;
      return scrollElementRef.current;
    }
    
    // Use cached ref if available
    if (scrollContainerElementRef.current) {
      return scrollContainerElementRef.current;
    }
    
    const end = messagesEndRef.current;
    if (!end) return null;

    // Find the actual scroll container by traversing up from messagesEndRef
    // Look for element with data-scroll-container attribute (PrimeSlideoutShell's scroll div) or overflow-y-auto class
    let scrollContainer: HTMLElement | null = end.parentElement;
    while (scrollContainer && 
           !scrollContainer.hasAttribute('data-scroll-container') &&
           !scrollContainer.classList.contains('overflow-y-auto')) {
      scrollContainer = scrollContainer.parentElement;
    }
    
    // If not found, try scrollContainerRef's parent chain
    if (!scrollContainer && scrollContainerRef.current) {
      scrollContainer = scrollContainerRef.current.parentElement;
      while (scrollContainer && 
             !scrollContainer.hasAttribute('data-scroll-container') &&
             !scrollContainer.classList.contains('overflow-y-auto')) {
        scrollContainer = scrollContainer.parentElement;
      }
    }
    
    // Cache the found container
    if (scrollContainer) {
      scrollContainerElementRef.current = scrollContainer;
    }
    
    return scrollContainer;
  }, []);

  // Scroll-to-bottom helper that ensures the newest message is fully visible
  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'auto') => {
    const container = findScrollContainer();
    if (!container) return;

    // Scroll to bottom of container
    requestAnimationFrame(() => {
      container.scrollTo({ top: container.scrollHeight, behavior });
    });
  }, [findScrollContainer]);

  // CRITICAL: Track scroll position to detect if user is near bottom
  useEffect(() => {
    if (!isOpen) {
      // Clear cached scroll container when chat closes
      scrollContainerElementRef.current = null;
      return;
    }
    
    const container = findScrollContainer();
    if (!container) return;

    const handleScroll = () => {
      const threshold = 80; // px from bottom to still auto-scroll
      const distanceFromBottom =
        container.scrollHeight - container.scrollTop - container.clientHeight;
      setIsNearBottom(distanceFromBottom < threshold);
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    // Initial check
    handleScroll();

    return () => {
      container.removeEventListener('scroll', handleScroll);
    };
  }, [findScrollContainer, isOpen]);

  // CRITICAL: Auto-scroll during streaming when content updates (not just when messages.length changes)
  // Track last message content length to detect streaming updates
  // NOTE: Use 'messages' instead of 'displayMessages' here to avoid TDZ - displayMessages is computed later
  const lastMessageContentLengthRef = useRef<number>(0);
  const lastStreamingStateRef = useRef<boolean>(false);
  const lastMessagesLengthRef = useRef<number>(0);
  const scrollThrottleRef = useRef<number | null>(null);
  
  useEffect(() => {
    // Find last assistant message (streaming message) - use messages array directly
    const lastAssistantMessage = [...messages].reverse().find(m => m.role === 'assistant');
    const currentContentLength = lastAssistantMessage?.content?.length || 0;
    const contentChanged = currentContentLength !== lastMessageContentLengthRef.current;
    const messagesLengthChanged = messages.length !== lastMessagesLengthRef.current;
    const streamingStarted = isStreaming && !lastStreamingStateRef.current;
    const streamingStopped = !isStreaming && lastStreamingStateRef.current;
    
    // Update refs
    lastMessageContentLengthRef.current = currentContentLength;
    lastMessagesLengthRef.current = messages.length;
    lastStreamingStateRef.current = isStreaming;
    
    // Only auto-scroll if:
    // 1. User is near bottom OR just sent a message OR initial open
    // 2. AND (content changed during streaming OR streaming just started OR streaming just stopped OR messages length changed)
    // CRITICAL: Do NOT force scroll if user has scrolled up (respects user intent)
    const shouldAutoScroll = isNearBottom || userJustSentRef.current;
    
    if (shouldAutoScroll && (contentChanged || streamingStarted || streamingStopped || messagesLengthChanged)) {
      // Throttle streaming scroll updates to every ~200ms to avoid jank
      if (scrollThrottleRef.current !== null) {
        clearTimeout(scrollThrottleRef.current);
      }
      
      scrollThrottleRef.current = window.setTimeout(() => {
        // Use requestAnimationFrame to let DOM update first
        requestAnimationFrame(() => {
          scrollToBottom('auto');
        });
        scrollThrottleRef.current = null;
      }, isStreaming ? 200 : 0); // Throttle during streaming, immediate for non-streaming
    }

    // Reset the "just sent" flag after we've reacted once
    if (userJustSentRef.current) {
      userJustSentRef.current = false;
    }
    
    // Cleanup throttle on unmount
    return () => {
      if (scrollThrottleRef.current !== null) {
        clearTimeout(scrollThrottleRef.current);
        scrollThrottleRef.current = null;
      }
    };
  }, [messages, isStreaming, isNearBottom, scrollToBottom]);

  // Scroll to bottom when chat opens OR when history loads
  useEffect(() => {
    if (isOpen && !isLoadingHistory) {
      // Delay to ensure panel is rendered and history is loaded
      const timeoutId = setTimeout(() => {
        scrollToBottom('auto'); // immediate snap on open or after history loads
      }, 200);
      
      return () => clearTimeout(timeoutId);
    }
  }, [isOpen, isLoadingHistory, scrollToBottom]);
  
  // CRITICAL: Scroll to bottom when employee switches (Prime -> Byte, etc.)
  useEffect(() => {
    if (isOpen && currentEmployeeSlug) {
      // Clear cached scroll container (may have changed)
      scrollContainerElementRef.current = null;
      // Scroll to bottom after employee switch
      const timeoutId = setTimeout(() => {
        scrollToBottom('auto');
      }, 100);
      
      return () => clearTimeout(timeoutId);
    }
  }, [currentEmployeeSlug, isOpen, scrollToBottom]);
  
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

  // ====== CHAT SEND / RECEIVE ======
  
  // Handle send - use currentEmployeeSlug to ensure correct employee receives message
  // NOTE: Duplicate send prevention is handled by usePrimeChat hook (inFlightRef)
  const handleSend = async (options?: { attachments?: File[] }) => {
    // Block if already streaming or loading (hook also checks this, but early return for UX)
    if (isStreaming || isUploadingAttachments) {
      if (import.meta.env.DEV) {
        console.warn('[UnifiedAssistantChat] 🚫 Send blocked - already streaming or uploading');
      }
      return;
    }
    
    const trimmedMessage = inputMessage.trim();
    const hasAttachments = options?.attachments && options.attachments.length > 0;
    
    if (!trimmedMessage && !hasAttachments) return;
    
    try {
      
      // CRITICAL: Mark that user has sent a message - this prevents greeting typing from ever showing again
      hasUserSentMessageRef.current = true;
      // Force-disable greeting typing immediately when user sends first message
      if (showGreetingTyping) {
        setShowGreetingTyping(false);
        endTyping(); // Stop any active greeting typing
      }
      
      // Send signature tracking removed - hook handles deduplication
      
      // Mark Prime as initialized on first message (first message wins)
      if (showPrimeOnboarding && !primeOnboardingCompleted && userId && profile?.id) {
        await markPrimeInitialized(profile.id);
        await refreshProfile();
        setPrimeOnboardingCompleted(true);
      }
      
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
      // Scroll will happen automatically via the auto-scroll effect when message is added
      
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
      // NOTE: Hook creates placeholder BEFORE fetch, so typing indicator logic checks placeholder existence
      await sendMessage(finalMessage, { documentIds: documentIds.length > 0 ? documentIds : undefined });
      // Typing indicator is handled by hook state (isStreaming + placeholder existence)
      // Refresh chat history after sending a message so it appears in history sidebar
      // Use a small delay to allow backend to update chat_convo_summaries
      setTimeout(() => {
        loadSessions();
      }, 2000);
    } catch (err) {
      // Error is handled by useUnifiedChatEngine and displayed in UI
      console.error('[UnifiedAssistantChat] Send failed:', err);
    }
  };
  
  // Track first assistant response and show trust message
  useEffect(() => {
    if (currentEmployeeSlug !== 'prime-boss' || !shouldShowTrustMessage) return;
    
    const assistantMessages = messages.filter(m => m.role === 'assistant');
    if (assistantMessages.length > 0 && !firstAssistantResponseId) {
      const firstResponse = assistantMessages[0];
      setFirstAssistantResponseId(firstResponse.id);
      
      // Mark trust message as shown and persist
      if (userId && profile?.id) {
        markGuardrailsAcknowledged(profile.id).then(() => {
          refreshProfile();
        });
      }
      setHasShownTrustMessage(true);
    }
  }, [messages, currentEmployeeSlug, shouldShowTrustMessage, firstAssistantResponseId, userId, profile, refreshProfile]);

  // Listen for Prime security messages
  useEffect(() => {
    if (currentEmployeeSlug !== 'prime-boss' || !isOpen) return;

    const handleSecurityMessage = (event: CustomEvent) => {
      const { message, uploadId, timestamp } = event.detail;
      
      // Add security message as a system message in chat
      // Note: This would need to be integrated with the chat engine
      // For now, we'll show it as a toast and log it
      if (import.meta.env.DEV) {
        console.log('[UnifiedAssistantChat] Security message received:', { message, uploadId, timestamp });
      }
      
      // TODO: Integrate with chat engine to show message in chat feed
      // This requires access to sendMessage or a way to inject system messages
    };

    window.addEventListener('prime:security-message', handleSecurityMessage as EventListener);
    return () => {
      window.removeEventListener('prime:security-message', handleSecurityMessage as EventListener);
    };
  }, [currentEmployeeSlug, isOpen]);

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
    scrollToBottom('auto');
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

  // STEP 2: Lock Byte's final message - ensure only one closing message is sent
  const byteImportCloseoutSentRef = useRef<Set<string>>(new Set());
  
  useEffect(() => {
    if (disableRuntime || !userId) return;

    const handleByteImportCompleted = (payload: { importId: string; userId: string; timestamp: string }) => {
      // Only handle if Byte is currently active
      if (!isByte || currentEmployeeSlug !== 'byte-docs') return;
      
      // Guard: Ensure we only send one message per import
      const key = `${userId}:${payload.importId}`;
      if (byteImportCloseoutSentRef.current.has(key)) {
        // Dev-only debug log
        if (import.meta.env.DEV) {
          console.log('[UnifiedAssistantChat] Byte closeout skipped (already sent)', { importId: payload.importId, key });
        }
        return;
      }
      byteImportCloseoutSentRef.current.add(key);

      // Send Byte's final closing message (exactly one) - inject as assistant message
      const closeoutMessage = "All set — I finished importing your documents and sent them for categorization and analysis.";
      
      // Stable ID: Use importId only (no timestamp) for idempotency across refreshes
      const stableId = `byte-closeout-${payload.importId}`;
      
      // Inject as assistant message (not user message)
      const closeoutChatMessage: ChatMessage = {
        id: stableId,
        role: 'assistant',
        content: closeoutMessage,
        timestamp: new Date().toISOString(),
        meta: { 
          importId: payload.importId, 
          isCloseout: true,
          employee_key: 'byte-docs', // Ensure Byte authorship
        },
      };
      
      // Add message to injected messages (will be merged with engine messages)
      setInjectedMessages(prev => {
        // Guard: Don't add if already exists (check by stable ID or meta flag)
        if (prev.some(m => m.id === stableId || (m.meta?.isCloseout && m.meta?.importId === payload.importId))) {
          if (import.meta.env.DEV) {
            console.log('[UnifiedAssistantChat] Byte closeout skipped (duplicate in injectedMessages)', { importId: payload.importId, stableId });
          }
          return prev;
        }
        if (import.meta.env.DEV) {
          console.log('[UnifiedAssistantChat] Byte closeout injected', { importId: payload.importId, stableId });
        }
        return [...prev, closeoutChatMessage];
      });
    };

    const unsubscribe = onBus('BYTE_IMPORT_COMPLETED', handleByteImportCompleted);
    return unsubscribe;
  }, [isByte, currentEmployeeSlug, userId, disableRuntime, sendMessage]);

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

  // Add greeting as a virtual message when showing (converted from separate region to message row)
  // This ensures greeting appears as a normal assistant message, not a separate card with duplicate avatar
  // Note: Greeting messages don't show timestamp to feel more AI-like (hide timestamp for first greeting only)
  const greetingMessage: ChatMessage | null = showGreetingTyping && greetingText ? {
    id: 'greeting-message',
    role: 'assistant' as const,
    content: typedGreeting || greetingText,
    timestamp: new Date(),
    meta: { isGreeting: true, hideTimestamp: true }, // Hide timestamp for greeting to feel more AI-like
  } : null;
  
  // REMOVED: injectedGreetingMessage - greeting now ALWAYS types in using TypingMessage component
  // The typing greeting (greetingMessage) is the ONLY greeting mechanism
  // This ensures greeting always has typewriter effect, never appears instantly
  
  // Check if thread has any assistant messages (greeting only shows when thread is empty)
  // User messages don't count - greeting should show even if user sent a message but assistant hasn't responded
  // CRITICAL: Use single authoritative message source (same logic as renderMessages)
  // Use latched engineReady to prevent flip-flop
  const hasAssistantMessages = useMemo(() => {
    const authoritativeMessages = engineReadyLatched ? messages : loadedHistoryMessages;
    return authoritativeMessages.some(m => m.role === 'assistant');
  }, [engineReadyLatched, messages, loadedHistoryMessages]);
  
  // Helper function to format relative time (e.g., "2 hours ago", "yesterday")
  const formatRelativeTime = (isoString: string): string => {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins} ${diffMins === 1 ? 'minute' : 'minutes'} ago`;
    if (diffHours < 24) return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
    if (diffDays === 1) return 'yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7);
      return `${weeks} ${weeks === 1 ? 'week' : 'weeks'} ago`;
    }
    if (diffDays < 365) {
      const months = Math.floor(diffDays / 30);
      return `${months} ${months === 1 ? 'month' : 'months'} ago`;
    }
    const years = Math.floor(diffDays / 365);
    return `${years} ${years === 1 ? 'year' : 'years'} ago`;
  };
  
  // Welcome back message (UI-only, no API call, shows once per open)
  // PART 1: Disable welcomeMessage for Prime (keep only greetingMessage)
  const shouldShowWelcomeMessage = useMemo(() => {
    // Prime shows only greetingMessage (big card), not welcomeMessage (slim bubble)
    if (normalizedSlug === 'prime-boss') return false;
    
    if (!isOpen || disableRuntime || currentEmployeeSlug !== 'prime-boss') return false;
    if (didShowWelcomeThisOpenRef.current) return false; // Already shown this open
    
    // Show if no messages OR last message is older than 1 hour
    if (messages.length === 0) return true;
    
    const lastMessage = messages[messages.length - 1];
    if (lastMessage?.createdAt) {
      const lastMessageTime = new Date(lastMessage.createdAt).getTime();
      const oneHourAgo = Date.now() - (60 * 60 * 1000);
      return lastMessageTime < oneHourAgo;
    }
    
    return false;
  }, [isOpen, disableRuntime, currentEmployeeSlug, messages, normalizedSlug]);
  
  // Reset welcome flag when chat closes
  useEffect(() => {
    if (!isOpen) {
      didShowWelcomeThisOpenRef.current = false;
    }
  }, [isOpen]);
  
  // Mark welcome as shown when it should be displayed
  useEffect(() => {
    if (shouldShowWelcomeMessage) {
      didShowWelcomeThisOpenRef.current = true;
    }
  }, [shouldShowWelcomeMessage]);
  
  // Compute time-of-day greeting and welcome message content
  const welcomeMessageContent = useMemo(() => {
    if (!shouldShowWelcomeMessage) return null;
    
    // Get time-of-day greeting
    const hour = new Date().getHours();
    let timeGreeting: string;
    if (hour >= 5 && hour < 12) {
      timeGreeting = 'Good morning';
    } else if (hour >= 12 && hour < 17) {
      timeGreeting = 'Good afternoon';
    } else if (hour >= 17 && hour < 23) {
      timeGreeting = 'Good evening';
    } else {
      timeGreeting = 'Hello';
    }
    
    // Get user name (prefer displayName from context, fallback to profile fields)
    const userName = displayName || 
                     (profile?.display_name) || 
                     (profile?.full_name) || 
                     firstName || 
                     'there';
    
    // Primary line: different text based on whether there's history
    const hasHistory = messages.length > 0;
    const primaryLine = hasHistory
      ? `${timeGreeting}, ${userName} — welcome back.`
      : `${timeGreeting}, ${userName} — welcome to XspensesAI.`;
    
    // Optional "Last active" line if last message timestamp is available
    const lastMessage = messages[messages.length - 1];
    const lastMessageAt = lastMessage?.createdAt || 
                         (lastMessage?.timestamp ? (typeof lastMessage.timestamp === 'string' ? lastMessage.timestamp : new Date(lastMessage.timestamp).toISOString()) : null);
    const lastActiveLine = lastMessageAt 
      ? `\nLast active: ${formatRelativeTime(lastMessageAt)}`
      : '';
    
    return `${primaryLine}${lastActiveLine}`;
  }, [shouldShowWelcomeMessage, displayName, profile, firstName, messages]);
  
  // Create welcome message object (UI-only, not stored in DB)
  const welcomeMessage: ChatMessage | null = welcomeMessageContent ? {
    id: 'welcome-back-message',
    role: 'system',
    content: welcomeMessageContent,
    createdAt: new Date().toISOString(),
    meta: { hideTimestamp: true }, // Hide timestamp for welcome message
  } : null;

  // Custodian → Prime continuity system note (Prime-only, UI-only, session-only)
  const custodianHandoffNote = useMemo(() => {
    // Only show for Prime
    if (normalizedSlug !== 'prime-boss') return null;
    
    // Only show when profile is loaded
    if (isProfileLoading || !profile || !userId) return null;
    
    // Defensive: Check custodian_ready metadata safely
    const custodianReady = profile.metadata && typeof profile.metadata === 'object' 
      ? (profile.metadata as any).custodian_ready === true 
      : false;
    
    // Only show when custodian_ready is true
    if (!custodianReady) return null;
    
    // Check sessionStorage to ensure it only shows once per session
    const sessionKey = `prime_seen_custodian_handoff::${userId}`;
    if (typeof window !== 'undefined' && sessionStorage.getItem(sessionKey) === '1') {
      return null;
    }
    
    // Content: Title + Body
    const content = 'Custodian setup complete\nPrime is now managing your account.';
    
    return {
      id: 'prime-custodian-handoff-note',
      role: 'system' as const,
      content,
      createdAt: new Date().toISOString(),
      meta: { hideTimestamp: true },
    };
  }, [normalizedSlug, isProfileLoading, profile, userId]);

  // Mark custodian handoff note as shown in sessionStorage (side effect moved out of useMemo)
  useEffect(() => {
    if (custodianHandoffNote && userId && typeof window !== 'undefined') {
      const sessionKey = `prime_seen_custodian_handoff::${userId}`;
      sessionStorage.setItem(sessionKey, '1');
    }
  }, [custodianHandoffNote, userId]);

  // PART 4: Welcome back system note (Prime-only, UI-only)
  const welcomeBackNote = useMemo(() => {
    // Only show for Prime
    if (normalizedSlug !== 'prime-boss') return null;
    
    // Only show when profile is loaded
    if (isProfileLoading || !profile || !userId) return null;
    
    // Only show when messages are empty (first open this session)
    // CRITICAL: Use single authoritative message source (same logic as renderMessages)
    // Use latched engineReady to prevent flip-flop
    const authoritativeMessages = engineReadyLatched ? messages : loadedHistoryMessages;
    if (authoritativeMessages.length > 0) return null;
    
    // Check sessionStorage to ensure it only shows once per session
    const sessionKey = `prime_welcome_shown::${userId}`;
    if (typeof window !== 'undefined' && sessionStorage.getItem(sessionKey) === '1') {
      return null;
    }
    
    // Build welcome message
    const displayName = profile.display_name || profile.full_name || firstName || 'there';
    const custodianReady = profile.metadata && typeof profile.metadata === 'object' 
      ? (profile.metadata as any).custodian_ready === true 
      : false;
    
    let content = `Welcome back, ${displayName}.`;
    if (custodianReady) {
      content += ' Custodian is active — you\'re secured.';
    } else {
      content += ' Security setup is still needed.';
    }
    
    return {
      id: 'prime-welcome-back-note',
      role: 'system' as const,
      content,
      createdAt: new Date().toISOString(),
      meta: { hideTimestamp: true },
    };
  }, [normalizedSlug, isProfileLoading, profile, userId, disableRuntime, messages, isStreaming, isLoadingHistory, loadedHistoryMessages, firstName, engineReadyLatched]);

  // Mark welcome back note as shown in sessionStorage (side effect moved out of useMemo)
  useEffect(() => {
    if (welcomeBackNote && userId && typeof window !== 'undefined') {
      const sessionKey = `prime_welcome_shown::${userId}`;
      sessionStorage.setItem(sessionKey, '1');
    }
  }, [welcomeBackNote, userId]);

  // Calculate real messages count (user + assistant only, exclude system notes)
  // Must be defined before byteGreetingNote which uses it
  const realMessagesCount = messages.filter(m => m.role === 'user' || m.role === 'assistant').length;

  // PART 5: Byte greeting once per session (no spam)
  const byteGreetingNote = useMemo(() => {
    // Only show for Byte
    if (normalizedSlug !== 'byte-docs') return null;
    
    // Only show when profile is loaded
    if (isProfileLoading || !profile || !userId) return null;
    
    // Only show when messages are empty (first open this session)
    if (realMessagesCount > 0) return null;
    
    // Check sessionStorage to ensure it only shows once per session
    const sessionKey = `employee_greeting_shown::${userId}::byte-docs`;
    if (typeof window !== 'undefined' && sessionStorage.getItem(sessionKey) === '1') {
      return null;
    }
    
    // Build Byte greeting
    const displayName = profile.display_name || profile.full_name || firstName || 'there';
    const content = `Hi ${displayName}! I'm Byte, your Smart Import assistant. I can help you upload statements, receipts, and documents. Just drag and drop a file or click the upload button.`;
    
    return {
      id: 'byte-greeting-note',
      role: 'system' as const,
      content,
      createdAt: new Date().toISOString(),
      meta: { hideTimestamp: true },
    };
  }, [normalizedSlug, isProfileLoading, profile, userId, realMessagesCount, firstName]);

  // Mark Byte greeting as shown in sessionStorage (side effect moved out of useMemo)
  useEffect(() => {
    if (byteGreetingNote && userId && typeof window !== 'undefined') {
      const sessionKey = `employee_greeting_shown::${userId}::byte-docs`;
      sessionStorage.setItem(sessionKey, '1');
    }
  }, [byteGreetingNote, userId]);

  // PART A: Hard dedupe key (no time component)
  const normalizeText = (s: string) => {
    return (s || '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  };

  // Get scope for hardKey: threadId > sessionId > employeeSlug
  const getScope = () => {
    // Try to get threadId from conversationId or localStorage
    if (conversationId) return conversationId;
    try {
      const threadStorageKey = `chat_thread_${userId}_${effectiveEmployeeSlug}`;
      const storedThreadId = localStorage.getItem(threadStorageKey);
      if (storedThreadId) return storedThreadId;
    } catch (e) {
      // Ignore localStorage errors
    }
    // Fallback to sessionId
    try {
      const sessionStorageKey = `chat_session_${userId}_${effectiveEmployeeSlug}`;
      const storedSessionId = localStorage.getItem(sessionStorageKey);
      if (storedSessionId) return storedSessionId;
    } catch (e) {
      // Ignore localStorage errors
    }
    // Last resort: employeeSlug
    return effectiveEmployeeSlug || 'no-scope';
  };

  const hardKey = useCallback((m: typeof messages[0] | typeof custodianHandoffNote | typeof welcomeBackNote | typeof welcomeMessage | typeof greetingMessage) => {
    if (!m) return '';
    const currentScope = getScope();
    return `${currentScope}|${m.role}|${normalizeText(m.content || '')}`;
  }, [conversationId, userId, effectiveEmployeeSlug]);

  // Helper to choose better message when duplicates exist
  const chooseBetterMessage = (existing: typeof messages[0], candidate: typeof messages[0]) => {
    // Prefer message with thread_id (check if id looks like thread-based)
    const existingHasThread = existing.id && !existing.id.startsWith('m-') && !existing.id.startsWith('temp-') && !existing.id.startsWith('a-');
    const candidateHasThread = candidate.id && !candidate.id.startsWith('m-') && !candidate.id.startsWith('temp-') && !candidate.id.startsWith('a-');
    if (existingHasThread && !candidateHasThread) return existing;
    if (!existingHasThread && candidateHasThread) return candidate;
    
    // Prefer message with createdAt over missing createdAt
    if (existing.createdAt && !candidate.createdAt) return existing;
    if (!existing.createdAt && candidate.createdAt) return candidate;
    
    // Prefer message with server ID (not starting with 'm-' or 'temp-') over temporary ID
    const existingIsTemp = existing.id?.startsWith('m-') || existing.id?.startsWith('temp-') || existing.id?.startsWith('a-');
    const candidateIsTemp = candidate.id?.startsWith('m-') || candidate.id?.startsWith('temp-') || candidate.id?.startsWith('a-');
    if (!existingIsTemp && candidateIsTemp) return existing;
    if (existingIsTemp && !candidateIsTemp) return candidate;
    
    // Otherwise keep existing (first occurrence)
    return existing;
  };

  // Check if two messages are within safe dedupe window (30 seconds)
  const isWithinDedupeWindow = (msg1: typeof messages[0], msg2: typeof messages[0]) => {
    if (!msg1.createdAt || !msg2.createdAt) return true; // If missing timestamps, allow dedupe
    const ms1 = Date.parse(msg1.createdAt);
    const ms2 = Date.parse(msg2.createdAt);
    if (Number.isNaN(ms1) || Number.isNaN(ms2)) return true;
    return Math.abs(ms1 - ms2) < 30000; // 30 seconds
  };

  // Display all messages (user, assistant, system) - prepend welcome and greeting messages if showing
  // Greeting always uses typing animation (no instant injection)
  // CRITICAL: Do not filter out system messages - they may contain important info
  // CRITICAL: Single message authority - choose ONE authoritative source at render time
  // Engine is ready when: runtime enabled AND engine has actually initialized with messages
  // When engine is ready → use engine.messages (includes loadedHistoryMessages via initialMessages)
  // When engine not ready → use loadedHistoryMessages (hydration phase)
  // CRITICAL: Only consider engine ready if it has messages OR is actively streaming
  // Don't switch to engine.messages prematurely (before initialMessages are merged)
  const currentEngineReady = !disableRuntime && (messages.length > 0 || isStreaming);
  
  // Latch engineReady once it becomes true to prevent flip-flop during hydration
  // CRITICAL: Once engine is ready, keep using engine.messages until conversation changes
  useEffect(() => {
    if (currentEngineReady) {
      setEngineReadyLatched(true);
      if (import.meta.env.DEV) {
        console.log('[EngineReadyLatch] Latched to true', { 
          currentEngineReady, 
          engineReadyLatched: true,
          messagesLen: messages.length,
          historyLen: loadedHistoryMessages.length 
        });
      }
    }
  }, [currentEngineReady, messages.length, loadedHistoryMessages.length]);
  
  const authoritativeMessages = engineReadyLatched ? messages : loadedHistoryMessages;
  
  // DEV: Log latch state for debugging
  if (import.meta.env.DEV) {
    if (currentEngineReady !== engineReadyLatched) {
      console.log('[EngineReadyLatch] State', { 
        currentEngineReady, 
        engineReadyLatched, 
        messagesLen: messages.length, 
        historyLen: loadedHistoryMessages.length,
        using: engineReadyLatched ? 'engine.messages' : 'loadedHistoryMessages'
      });
    }
  }
  
  // CRITICAL: Do NOT concatenate multiple message sources at render time
  // UI-only messages (greeting, welcome, injected) are prepended/appended but authoritativeMessages is the single source
  const allMessages = [
    ...(custodianHandoffNote ? [custodianHandoffNote] : []), // Custodian → Prime handoff note (Prime-only, session-only)
    ...(welcomeBackNote ? [welcomeBackNote] : []), // PART 4: Welcome back note (Prime-only)
    ...(welcomeMessage ? [welcomeMessage] : []), // Welcome back message (UI-only, instant) - DISABLED for Prime
    ...(byteGreetingNote ? [byteGreetingNote] : []), // PART 5: Byte greeting (Byte-only, session-only)
    ...(greetingMessage ? [greetingMessage] : []), // Typing animation greeting (always types in)
    ...authoritativeMessages, // CRITICAL: Single authoritative source - engine.messages OR loadedHistoryMessages (never both)
    ...injectedMessages // Include injected messages (Byte closeout, Prime recap) - these are UI-only additions
  ];
  
  // CANONICAL DEDUPE: Stable key priority (id > client_message_id > hardKey)
  // This ensures idempotent rendering: each user message and each assistant reply appears exactly once
  const getStableKey = (msg: typeof allMessages[0]): string | null => {
    if (!msg) return null;
    
    // Priority 1: Exact message.id match (most reliable)
    if (msg.id) {
      return `id:${msg.id}`;
    }
    
    // Priority 2: client_message_id from metadata (for optimistic messages)
    if (msg.meta?.client_message_id) {
      return `client:${msg.meta.client_message_id}`;
    }
    
    // Priority 3: Fallback to hardKey for assistant messages only (last resort)
    // Only use hardKey for assistant messages to avoid false positives
    if (msg.role === 'assistant') {
      const hk = hardKey(msg);
      if (hk) {
        return `hardkey:${hk}`;
      }
    }
    
    return null;
  };
  
  const recentMessages = allMessages.slice(-80); // Last 80 messages for window check
  const dedupeMap = new Map<string, typeof allMessages[0]>();
  const dedupeStats = {
    byId: 0,
    byClientId: 0,
    byHardKey: 0,
    dropped: 0,
  };
  
  allMessages.forEach(msg => {
    if (!msg) return;
    
    const stableKey = getStableKey(msg);
    if (!stableKey) {
      // No stable key - keep message (system messages, etc.)
      dedupeMap.set(`fallback-${Date.now()}-${Math.random()}`, msg);
      return;
    }
    
    const existing = dedupeMap.get(stableKey);
    if (!existing) {
      // First occurrence - add to map
      dedupeMap.set(stableKey, msg);
      if (stableKey.startsWith('id:')) dedupeStats.byId++;
      else if (stableKey.startsWith('client:')) dedupeStats.byClientId++;
      else if (stableKey.startsWith('hardkey:')) dedupeStats.byHardKey++;
    } else {
      // Duplicate found - choose better message
      const isRecent = recentMessages.includes(msg) || recentMessages.includes(existing);
      const isWithinWindow = isWithinDedupeWindow(existing, msg);
      
      if (isRecent || isWithinWindow) {
        // Within safe window - dedupe
        const better = chooseBetterMessage(existing, msg);
        dedupeMap.set(stableKey, better);
        dedupeStats.dropped++;
        
        // Dev log: dropped optimistic message due to DB echo
        if (import.meta.env.DEV && msg.meta?.client_message_id && !existing.meta?.client_message_id) {
          console.log(`[UnifiedAssistantChat] ✅ Dropped optimistic message (client_message_id: ${msg.meta.client_message_id}) - DB echo matched`);
        }
      } else {
        // Outside safe window - keep both (legit repeat)
        // Use a variant key to allow both
        dedupeMap.set(`${stableKey}-variant-${Date.now()}`, msg);
      }
    }
  });
  
  const displayMessages = Array.from(dedupeMap.values());
  
  // Dev log: dedupe stats
  if (import.meta.env.DEV && (dedupeStats.dropped > 0 || allMessages.length !== displayMessages.length)) {
    console.log(`[UnifiedAssistantChat] 🔍 Dedupe stats:`, {
      totalBefore: allMessages.length,
      totalAfter: displayMessages.length,
      dropped: dedupeStats.dropped,
      byId: dedupeStats.byId,
      byClientId: dedupeStats.byClientId,
      byHardKey: dedupeStats.byHardKey,
    });
  }
  
  // PART C: Debug logs (temporary)
  if (import.meta.env.DEV && allMessages.length > 0) {
    const hardKeyCounts = new Map<string, number>();
    allMessages.forEach(msg => {
      const hk = hardKey(msg);
      if (hk) hardKeyCounts.set(hk, (hardKeyCounts.get(hk) || 0) + 1);
    });
    const duplicates = Array.from(hardKeyCounts.entries())
      .filter(([_, count]) => count > 1)
      .sort(([_, a], [__, b]) => b - a)
      .slice(0, 5);
    
    if (duplicates.length > 0 || allMessages.length !== dedupeMap.size) {
      console.log(`[UnifiedAssistantChat] Dedupe stats:`, {
        totalMessages: allMessages.length,
        uniqueHardKeys: dedupeMap.size,
        duplicatesRemoved: allMessages.length - dedupeMap.size,
        topDuplicates: duplicates.map(([hk, count]) => ({ hardKey: hk.substring(0, 60), count })),
      });
    }
  }
  
  // Dev log: Confirm chat render reached after dedupe merge
  if (import.meta.env.DEV && displayMessages.length > 0) {
    console.log(`[UnifiedAssistantChat] ✅ Chat render complete after dedupe (${displayMessages.length} messages)`);
  }
  
  // Get the last message ID for streaming detection
  const lastMessageId = displayMessages.length > 0 ? displayMessages[displayMessages.length - 1]?.id : null;
  
  // Detect handoff from Prime (works for all employees, not just Tag)
  const isHandoffFromPrime = useMemo(() => {
    // ONLY show handoff if we actually switched FROM Prime TO another employee
    // Never show for Prime itself
    if (currentEmployeeSlug === 'prime-boss') {
      return false; // Prime never shows "handed from Prime"
    }
    
    // Check if we just switched from Prime to current employee
    if (previousEmployeeSlugRef.current === 'prime-boss' && currentEmployeeSlug !== 'prime-boss') {
      return true;
    }
    
    // Also check context for explicit handoff indicators (but not for Prime)
    if (context) {
      const ctxStr = JSON.stringify(context).toLowerCase();
      return ctxStr.includes('handoff') && ctxStr.includes('sourceemployee');
    }
    
    return false;
  }, [currentEmployeeSlug, context]);
  
  // Track previous employee slug for handoff detection (must be called before early return)
  useEffect(() => {
    if (currentEmployeeSlug && currentEmployeeSlug !== previousEmployeeSlugRef.current) {
      previousEmployeeSlugRef.current = currentEmployeeSlug;
    }
  }, [currentEmployeeSlug]);

  // Detect if user is new or returning (before greeting generation)
  const isFirstTimeUser = useMemo(() => {
    if (!profile?.metadata || typeof profile.metadata !== 'object') return true;
    const metadata = profile.metadata as any;
    return metadata.prime_initialized !== true;
  }, [profile]);

  // Universal on-open greeting effect (Tag-style, works for all employees)
  // FRAME-0 LOCK: Only start greeting AFTER chat is ready (open stabilized)
  // CRITICAL: Wait for history to load before showing greeting
  // Skip greeting ONLY if Prime onboarding component is actually visible in DOM
  useEffect(() => {
    // Skip greeting ONLY if Prime onboarding component is actually visible in DOM
    // Note: Onboarding is now disabled (rendered as false), so this should never trigger
    if (showPrimeOnboarding && !primeOnboardingCompleted && currentEmployeeSlug === 'prime-boss') {
      // Double-check: only skip if onboarding div actually exists in DOM
      const onboardingElement = document.querySelector('[data-prime-onboarding]');
      if (onboardingElement && window.getComputedStyle(onboardingElement).display !== 'none') {
        return; // Skip greeting only if onboarding is truly visible
      }
    }
    
    // CRITICAL: Wait for history to finish loading before checking if greeting should show
    // This prevents greeting from showing when conversation history exists
    if (isLoadingHistory) {
      return; // Don't show greeting while history is still loading
    }
    
    // Only show greeting if:
    // 1. Chat is open
    // 2. Chat is ready (open stabilized - no typing until then)
    // 3. History has finished loading (isLoadingHistory === false)
    // 4. Thread is empty (no assistant messages in history OR current messages)
    // 5. Employee config has openGreeting defined
    // 6. Greeting hasn't been completed yet
    // 7. Greeting hasn't been shown for this open session (prevent double injection)
    // 8. Greeting hasn't been shown for this thread/conversation (prevent double-mount greetings)
    // 9. User hasn't sent a message yet (CRITICAL: greeting typing ONLY before first user message)
    const threadKey = `${currentEmployeeSlug}:${conversationId || 'default'}`;
    if (!isOpen || !chatReady || isLoadingHistory || hasAssistantMessages || greetingCompletedRef.current || greetedThisOpenRef.current || greetedThreadRef.current === threadKey || hasUserSentMessageRef.current) return;
    
    const chatConfig = EMPLOYEE_CHAT_CONFIG[currentEmployeeSlug as keyof typeof EMPLOYEE_CHAT_CONFIG];
    // Check if greeting is enabled (default: true if openGreeting exists)
    if (chatConfig?.openGreetingEnabled === false) return;
    if (!chatConfig?.openGreeting) return;
    
    // Reset greeting state when employee or conversation changes
    if (currentEmployeeSlug !== previousEmployeeSlugRef.current || conversationId !== previousConversationIdRef.current) {
      setShowGreetingTyping(false);
      setTypedGreeting('');
      endTyping(); // Use unified controller
      greetingCompletedRef.current = false;
      hasUserSentMessageRef.current = false; // Reset user message flag when switching threads
      previousEmployeeSlugRef.current = currentEmployeeSlug;
      previousConversationIdRef.current = conversationId || null;
    }
    
    // Determine greeting text (use config, with handoff detection)
    let finalGreetingText = chatConfig.openGreeting;
    if (isHandoffFromPrime && normalizedSlug === 'tag-ai') {
      // Tag-specific handoff greeting
      finalGreetingText = 'Prime handed this to me. How can I help with your categories?';
    } else if (isHandoffFromPrime) {
      // Generic handoff greeting for other employees
      finalGreetingText = `Prime handed this to me. ${chatConfig.openGreeting}`;
    } else {
      // Use configured greeting, personalize with profile data
      finalGreetingText = chatConfig.openGreeting;
      
      // For Prime specifically, use structured WOW greeting
      if (normalizedSlug === 'prime-boss') {
        // Read expense_mode and currency from metadata (single source of truth)
        const metadata = profile?.metadata && typeof profile.metadata === 'object' ? profile.metadata as any : null;
        const expenseMode = metadata?.expense_mode as 'business' | 'personal' | undefined;
        const currency = metadata?.currency || profile?.currency || 'CAD';
        
        // Get user's first name using resolveDisplayNameSync
        const resolvedName = resolveDisplayNameSync(profile, user);
        const userName = resolvedName.firstName || profile?.first_name || firstName || 'there';
        
        // Use different greeting for first-time vs returning users
        if (isFirstTimeUser) {
          // NEW USER: Simple welcome
          finalGreetingText = `Hey ${userName}! I'm Prime, your AI financial CEO. Ready to get your finances organized?`;
          setPrimeGreetingData(null); // No fancy card for first time
        } else {
          // RETURNING USER: Contextual greeting with data
          const greetingData = buildPrimeGreeting({
            profile,
            firstName: userName,
            userEmail: user?.email || null,
            expenseMode,
            currency,
            isFirstRun: false, // Not first run if they've initialized
            tone: metadata?.prime_tone || 'ceo',
            primeState,
          });
          
          // FALLBACK: If greeting data generation failed, use simple greeting
          if (!greetingData || !greetingData.titleLine) {
            finalGreetingText = `Hey ${userName}! I'm Prime, your AI Financial CEO. Ready to take control of your finances?`;
            setPrimeGreetingData(null); // Clear failed data
          } else {
            // Use structured greeting (existing code)
            setPrimeGreetingData(greetingData);
            
            // Build contextual greeting
            const greetingParts = [greetingData.titleLine];
            if (greetingData.subLine) {
              greetingParts.push(greetingData.subLine);
            }
            if (greetingData.bullets && greetingData.bullets.length > 0) {
              greetingParts.push('\n\n' + greetingData.bullets.map(b => `• ${b}`).join('\n'));
            }
            finalGreetingText = greetingParts.join('\n\n');
            
            // Dev debug logging (only for returning users with contextual greeting)
            if (import.meta.env.DEV) {
              console.log('[UnifiedAssistantChat] Prime contextual greeting generated:', {
                expense_mode: expenseMode,
                currency: currency,
                isFirstTimeUser,
                hasTransactions: primeState?.financialSnapshot?.hasTransactions,
                transactionCount: primeState?.financialSnapshot?.transactionCount,
                uncategorizedCount: primeState?.financialSnapshot?.uncategorizedCount,
                currentStage: primeState?.currentStage,
                greetingData,
              });
            }
          }
        }
        
        // FALLBACK: If greeting still has {firstName}, replace it manually
        if (finalGreetingText.includes('{firstName}')) {
          finalGreetingText = finalGreetingText.replace(/\{firstName\}/g, userName);
          
          if (import.meta.env.DEV) {
            console.warn('[Prime Greeting] Had to manually replace {firstName} with:', userName);
          }
        }
      } else {
        // For other employees, resolve user name
        const resolvedName = resolveDisplayNameSync(profile, user);
        const userName = resolvedName.firstName ?? 'there';
        
        // Use different greeting for first-time vs returning users
        if (isFirstTimeUser) {
          // NEW USER: Simple introduction
          if (normalizedSlug === 'byte-docs') {
            finalGreetingText = `Hi ${userName}! I'm Byte. Drop your receipts or bank statements here and I'll extract everything.`;
          } else if (normalizedSlug === 'tag-ai') {
            finalGreetingText = `Hey ${userName}! I'm Tag. I organize your spending automatically.`;
          } else if (normalizedSlug === 'crystal-analytics') {
            finalGreetingText = `Hi ${userName}! I'm Crystal. I analyze your spending patterns and give you insights.`;
          } else {
            // Fallback: use configured greeting with name replacement
            finalGreetingText = chatConfig.openGreeting?.replace(/\{firstName\}/g, userName) || `Hey ${userName}!`;
          }
        } else {
          // RETURNING USER: Use configured greeting (more contextual)
          finalGreetingText = chatConfig.openGreeting?.replace(/\{firstName\}/g, userName) || `Hey ${userName}!`;
        }
        
        // Debug log (dev only)
        if (import.meta.env.DEV) {
          console.log('[UnifiedAssistantChat] Using resolved name for employee greeting:', userName, {
            employee: normalizedSlug,
            resolvedName,
            source: 'resolveDisplayNameSync',
            isFirstTimeUser,
          });
        }
      }
    }
    
    setGreetingText(finalGreetingText);
    setShowGreetingTyping(true);
    
    // Show typing indicator if configured (using unified controller)
    const showTyping = chatConfig.showTypingOnOpen !== false; // Default to true
    const delayMs = chatConfig.openGreetingDelayMs ?? 700; // Default: 700ms (matches config default)
    
    if (showTyping) {
      beginTyping(currentEmployeeSlug, conversationId || null);
    }
    
    const typingTimeout = setTimeout(() => {
      endTyping(); // End typing before showing greeting
      
      // Set greeting text - TypingMessage component will handle the typing animation
      // Mark greeting as shown immediately so it renders, then TypingMessage will type it
      setTypedGreeting(finalGreetingText);
      greetingCompletedRef.current = true;
      greetedThisOpenRef.current = true; // Mark greeting as shown for this open session
      greetedThreadRef.current = threadKey; // Mark this thread as greeted (prevents double-mount)
    }, delayMs);
    
    return () => {
      clearTimeout(typingTimeout);
      endTyping(); // Cleanup typing on unmount
    };
  }, [isOpen, hasAssistantMessages, chatReady, isLoadingHistory, currentEmployeeSlug, isHandoffFromPrime, firstName, profile, user, normalizedSlug, conversationId, beginTyping, endTyping, isFirstTimeUser]);
  
  // Reset greeting when chat closes or employee/conversation changes (must be called before early return)
  useEffect(() => {
    const threadKey = `${currentEmployeeSlug}:${conversationId || 'default'}`;
    if (!isOpen || currentEmployeeSlug !== previousEmployeeSlugRef.current || conversationId !== previousConversationIdRef.current) {
      setShowGreetingTyping(false);
      setTypedGreeting('');
      endTyping(); // Use unified controller
      greetingCompletedRef.current = false;
      greetedThisOpenRef.current = false; // Reset greeting flag when closing or changing employee/conversation
      // Only reset thread greeting and user message flag if employee or conversation actually changed (not just on close)
      if (currentEmployeeSlug !== previousEmployeeSlugRef.current || conversationId !== previousConversationIdRef.current) {
        greetedThreadRef.current = null; // Reset thread greeting when switching threads
        hasUserSentMessageRef.current = false; // Reset user message flag when switching threads
      }
      if (currentEmployeeSlug !== previousEmployeeSlugRef.current) {
        previousEmployeeSlugRef.current = currentEmployeeSlug;
      }
      if (conversationId !== previousConversationIdRef.current) {
        previousConversationIdRef.current = conversationId || null;
      }
    }
  }, [isOpen, currentEmployeeSlug, conversationId, endTyping]);

  // CRITICAL: Prevent double typing - ensure mutual exclusion
  // Greeting typing is ONLY allowed when: no assistant messages AND not streaming AND not loading
  const greetingTypingAllowed = useMemo(() => {
    return showGreetingTyping && 
           !hasAssistantMessages && 
           !isStreaming && 
           !isLoadingHistory &&
           !hasUserSentMessageRef.current;
  }, [showGreetingTyping, hasAssistantMessages, isStreaming, isLoadingHistory]);
  
  // Check if there's a streaming assistant bubble (placeholder)
  // CRITICAL: Use single authoritative message source (same logic as renderMessages)
  // Use latched engineReady to prevent flip-flop
  const hasStreamingAssistantBubble = useMemo(() => {
    const authoritativeMessages = engineReadyLatched ? messages : loadedHistoryMessages;
    return authoritativeMessages.some(
      (m) => m.role === 'assistant' && m.meta?.is_streaming === true
    );
  }, [engineReadyLatched, messages, loadedHistoryMessages]);

  // Normal typing (streaming/loading) is ONLY allowed when greeting typing is NOT active
  // CRITICAL: Hide typing indicator if streaming placeholder already exists (prevents double bubbles)
  // CRITICAL: Only show typing when isStreaming is true AND no placeholder exists
  const showNormalTyping = useMemo(() => {
    // Only show typing indicator if:
    // 1. Actually streaming (isStreaming === true)
    // 2. No greeting typing active
    // 3. No streaming placeholder bubble exists
    return isStreaming && !greetingTypingAllowed && !hasStreamingAssistantBubble;
  }, [isStreaming, greetingTypingAllowed, hasStreamingAssistantBubble]);

  // DEV ASSERTION: Prevent double typing visuals and double avatars
  useEffect(() => {
    if (!import.meta.env.DEV || !chatReady) return;
    
    const greetingTyping = greetingTypingAllowed;
    const normalTyping = showNormalTyping;
    
    if (greetingTyping && normalTyping) {
      console.error('[UnifiedAssistantChat] ⚠️ DOUBLE TYPING DETECTED: Both greeting typing and normal typing are active!', {
        greetingTyping,
        normalTyping,
        showGreetingTyping,
        isTyping,
        isStreaming,
        greetingTypingAllowed,
        showNormalTyping,
        currentEmployeeSlug
      });
    }
    
    // Check for multiple typing indicators in DOM
    const typingIndicators = document.querySelectorAll('[data-typing-indicator="true"], [class*="TypingIndicator"]');
    if (typingIndicators.length > 1) {
      console.warn('[UnifiedAssistantChat] ⚠️ Multiple typing indicators found in DOM:', typingIndicators.length);
    }
  }, [chatReady, greetingTypingAllowed, showNormalTyping, showGreetingTyping, isTyping, isStreaming, currentEmployeeSlug]);
  
  // End typing when streaming starts (response arrives)
  useEffect(() => {
    if (isStreaming && isTyping) {
      endTyping();
    }
  }, [isStreaming, isTyping, endTyping]);

  // Handle inline Prime input click/focus - opens Prime slide-out
  // MUST be declared before early return to maintain hook order
  const isInlinePrime = mode === 'inline' && currentEmployeeSlug === 'prime-boss';
  
  // Shared function to open Prime slide-out and focus its input
  const openPrimeSlideoutAndFocus = useCallback(() => {
    // Open Prime slide-out
    openChat({
      initialEmployeeSlug: 'prime-boss',
      context: {
        page: 'prime-chat',
      },
    });
    
    // Focus slide-out input after animation completes
    setTimeout(() => {
      // Find the slide-out textarea and focus it
      const slideoutTextarea = document.querySelector('[data-slideout-chat-input]') as HTMLTextAreaElement;
      if (slideoutTextarea) {
        slideoutTextarea.focus();
      } else {
        // Fallback: find any textarea in the slide-out
        const slideoutPanel = document.querySelector('[data-prime-slideout-shell]');
        const textarea = slideoutPanel?.querySelector('textarea');
        if (textarea) {
          textarea.focus();
        }
      }
    }, 300); // Wait for slide-out animation (matches PrimeSlideoutShell animation duration)
  }, [openChat]);

  // ============================================================================
  // HOOK COUNT STABILITY CHECK (DEV ONLY)
  // ============================================================================
  // Hook count tracking removed - was causing false warnings
  // All hooks are called unconditionally before any early returns
  
  // ============================================================================
  // MOUNT CHECK LOGIC - AFTER ALL HOOKS
  // ============================================================================
  // CRITICAL: All hooks must be called before any conditional returns
  // This prevents "Rendered fewer hooks than expected" errors
  
  // STABLE GATING: Use AuthContext signals (same as RouteDecisionGate)
  // Only mount when route is ready AND profile is loaded AND onboarding is completed
  // CRITICAL: Once mounted, stay mounted (don't unmount on route changes)
  
  // Track if component has ever been allowed to mount (persists across route changes)
  const hasEverMountedRef = useRef(false);
  
  // 1. Check if route is ready (auth + profile loaded)
  const routeReady = ready && !isProfileLoading;
  
  // 2. Check if onboarding is completed (same logic as RouteDecisionGate)
  const onboardingCompleted = useMemo(() => {
    if (!profile) return false;
    const onboardingStatus = (profile as any).onboarding_status;
    return onboardingStatus === 'completed' || profile.onboarding_completed === true;
  }, [profile]);
  
  // 3. Determine if chat should mount
  // Mount when: routeReady AND onboardingCompleted
  // Once mounted, stay mounted (hasEverMountedRef persists)
  const canMount = routeReady && onboardingCompleted;
  const shouldMount = canMount || hasEverMountedRef.current;
  
  // Track mount state (persists across route changes)
  useEffect(() => {
    if (canMount) {
      hasEverMountedRef.current = true;
    }
  }, [canMount]);
  
  // Hook: Derive onboarding blocked state (for CSS hiding) - MUST be called before early return
  // Use CSS hiding instead of unmounting to prevent remounts during navigation
  const onboardingBlocked = useMemo(() => {
    // Check if onboarding is not completed
    if (!onboardingCompleted) {
      return true;
    }
    // Otherwise, onboarding is not blocked
    return false;
  }, [onboardingCompleted]);
  
  // Hook: Debug logging - Log mount decision once when conditions change
  useEffect(() => {
    if (import.meta.env.DEV && shouldMount && canMount) {
      console.log('[UnifiedAssistantChat] ✅ Chat mount allowed', {
        routeReady,
        onboardingCompleted,
        hasProfile: !!profile,
        profileId: profile?.id,
        onboardingStatus: (profile as any)?.onboarding_status,
        onboardingCompletedFlag: profile?.onboarding_completed,
        pathname: location.pathname,
        hasEverMounted: hasEverMountedRef.current,
      });
    }
  }, [shouldMount, canMount, routeReady, onboardingCompleted, profile, location.pathname]);
  
  // Early return: Don't mount until conditions are stable
  // CRITICAL: This happens AFTER all hooks are called
  // Use CSS hiding instead of unmounting to prevent remounts
  if (!shouldMount) {
    return (
      <div className="hidden" aria-hidden="true" />
    );
  }
  
  // ============================================================================
  // RENDERING LOGIC - AFTER MOUNT CHECK
  // ============================================================================
  
  // TASK 3: Never return null - use CSS to hide instead of conditional rendering
  // For slideout/overlay mode, hide with CSS when closed (prevents remounting)
  // CRITICAL: Include shouldMount check here to hide when not ready (prevents hook count changes)
  // CRITICAL: Add data attribute to track mounts for duplicate detection
  const shouldHideSlideout = mode !== 'inline' && !isOpen;
  const shouldHideOnboarding = onboardingBlocked || !shouldMount; // Hide if not ready to mount
  const shouldHide = shouldHideSlideout || shouldHideOnboarding;

  const employeeDisplay = getEmployeeDisplay(currentEmployeeSlug);

  // Guardrails health check hook (moved up so it's available for statusBadge)
  // Throttle guardrails health polling during streaming to reduce load
  const { health: guardrailsHealth, isLoading: guardrailsHealthLoading } = useGuardrailsHealth(isOpen, 30000, isStreaming);

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

  // Safely read custodian_ready from metadata
  const custodianReady = useMemo(() => {
    if (!profile?.metadata || typeof profile.metadata !== 'object') return false;
    const metadata = profile.metadata as any;
    return metadata.custodian_ready === true;
  }, [profile?.metadata]);

  const custodianSetupDate = useMemo(() => {
    if (!profile?.metadata || typeof profile.metadata !== 'object') return null;
    const metadata = profile.metadata as any;
    return metadata.custodian_setup_at || null;
  }, [profile?.metadata]);

  // Status badge - Online indicator + Custodian status badge
  const statusBadge = (
    <div className="flex items-center gap-3">
      {/* Online indicator */}
      <div className="flex items-center gap-2 text-xs text-emerald-300">
        <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.9)]" />
        <span>Online</span>
      </div>
      {/* Custodian status badge - only show for Prime */}
      {normalizedSlug === 'prime-boss' && (
        <CustodianStatusBadge
          ready={custodianReady}
          variant="pill"
          size="sm"
          isLoading={isProfileLoading}
          setupDate={custodianSetupDate}
          onClick={() => {
            if (!custodianReady) {
              navigate('/onboarding/setup');
            } else {
              // Ready state - could show popover or do nothing
              // Popover is handled internally by the badge
            }
          }}
        />
      )}
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

  // BYTE UPLOAD PANEL REGION - Compact header only (dropzone is now overlay)
  const byteUploadRegion = isByte ? (
    <div className="px-4 pt-3 pb-2 shrink-0" ref={byteUploadPanelRef}>
      <ByteUploadPanel
        onUploadCompleted={() => {
          // Optional: could trigger a refresh or show a toast
          // The upload hook already shows toast notifications
        }}
        compact={true}
        onDragStateChange={(dragging) => setIsDraggingOverChat(dragging)}
      />
    </div>
  ) : null;

  // BYTE QUIET HINT TEXT - Subtle one-liner below upload (no duplicate upload actions)
  // Note: Removed welcomeRegion and universalGreetingRegion - greeting is now a message row
  const byteHintBar = isByte && !hasAssistantMessages && !isStreaming ? (
    <div className="px-4 pt-1 pb-2 shrink-0">
      <p className="text-[10px] text-slate-500 text-center">
        PDF, CSV, JPG/PNG • Max 25MB
      </p>
    </div>
  ) : null;

  // COMBINED REGION - ByteUploadPanel + Byte hint bar only (no welcome/greeting regions - they're now messages)
  const combinedWelcomeRegion = (
    <>
      {byteUploadRegion}
      {byteHintBar}
    </>
  );

  // INPUT FOOTER - Canonical ChatInputBar with guardrails status
  // PREFER chat response status over health endpoint (more accurate, per-request)
  // Format guardrails status text based on chat response OR health endpoint fallback
  // RULE: Bottom pill is the ONLY guardrails indicator - never show guardrails in header
  const getGuardrailsStatusText = (): string | undefined => {
    // PREFER guardrails status from chat response (most accurate, per-request)
    // Use chatGuardrailsStatus from hook, with safe fallback
    const guardrailsStatus = chatGuardrailsStatus;
    if (guardrailsStatus && typeof guardrailsStatus === 'object') {
      if (guardrailsStatus.enabled) {
        return 'Secured • Guardrails + PII protection active';
      } else {
        return `Offline • Protection unavailable${guardrailsStatus.reason ? ` (${guardrailsStatus.reason})` : ''}`;
      }
    }

    // FALLBACK: Use health endpoint status (polling-based, less accurate)
    // During initial load (<2 seconds), show loading state briefly
    if (guardrailsHealthLoading && !guardrailsHealth) {
      return undefined; // Don't show status during initial load
    }

    // Use health endpoint status (fallback)
    if (guardrailsHealth) {
      // Map health endpoint format to status text
      if (guardrailsHealth.status === 'active' || (guardrailsHealth as any).enabled === true) {
        return 'Secured • Guardrails + PII protection active';
      } else if (guardrailsHealth.status === 'degraded') {
        return 'Degraded • Limited protection';
      } else if (guardrailsHealth.status === 'offline' || (guardrailsHealth as any).enabled === false) {
        return 'Offline • Protection unavailable';
      }
    }

    // If health check failed or returned null, show offline (never show "unknown")
    // This ensures users always see a clear status, never "unknown"
    return 'Offline • Protection unavailable';
  };

  const guardrailsStatusText = getGuardrailsStatusText();
  
  // Dev-only: Get last checked timestamp for tooltip
  const guardrailsLastChecked = guardrailsHealth?.last_check_at 
    ? new Date(guardrailsHealth.last_check_at).toLocaleTimeString()
    : null;

  // Handle inline Prime input click/focus handlers (use openPrimeSlideoutAndFocus from above)
  const handleInlinePrimeInputFocus = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    if (!isInlinePrime) return;
    
    // Blur the inline input immediately (it's read-only anyway)
    e.target.blur();
    
    // Open Prime slide-out
    openPrimeSlideoutAndFocus();
  };
  
  const handleInlinePrimeInputMouseDown = (e: React.MouseEvent<HTMLTextAreaElement>) => {
    if (!isInlinePrime) return;
    
    // Prevent default focus on inline input
    e.preventDefault();
    
    // Open Prime slide-out
    openPrimeSlideoutAndFocus();
  };

  // PART 2: Prime Launchpad (compact, non-blocking, above input)
  const showLaunchpad = normalizedSlug === 'prime-boss' && 
    !isProfileLoading && 
    profile && 
    userId && 
    realMessagesCount === 0 &&
    !isStreaming;

  const handleLaunchpadAction = (action: 'import' | 'categories' | 'ask') => {
    if (action === 'import') {
      // PART 4: Launchpad click does BOTH: switch to Byte + navigate
      setActiveEmployeeSlugOverride('byte-docs');
      // Optional: Add UI-only system note (handled by route-aware switch)
      // Navigate with short delay for WOW feel
      setTimeout(() => {
        navigate('/dashboard/smart-import-ai');
      }, 180);
    } else if (action === 'categories') {
      navigate('/dashboard/smart-categories');
    } else if (action === 'ask') {
      // Focus input and scroll to bottom
      inputRef.current?.focus();
      scrollToBottom('auto');
    }
  };

  const inputFooter = (
    <div className="w-full max-w-full mx-0 min-w-0 shrink-0 flex flex-col">
      {/* Prime Launchpad - compact row above input */}
      {showLaunchpad && (
        <div className="px-4 pb-3 shrink-0">
          <div className="flex flex-col gap-2">
            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Start here</p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleLaunchpadAction('import')}
                className="flex-1 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/8 border border-white/10 text-xs font-medium text-white/90 transition-all duration-200 hover:scale-[1.02] hover:border-white/20 hover:shadow-lg hover:shadow-cyan-500/10 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-slate-950"
              >
                Smart Import
              </button>
              <button
                onClick={() => handleLaunchpadAction('categories')}
                className="flex-1 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/8 border border-white/10 text-xs font-medium text-white/90 transition-all duration-200 hover:scale-[1.02] hover:border-white/20 hover:shadow-lg hover:shadow-cyan-500/10 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-slate-950"
              >
                Review Categories
              </button>
              <button
                onClick={() => handleLaunchpadAction('ask')}
                className="flex-1 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/8 border border-white/10 text-xs font-medium text-white/90 transition-all duration-200 hover:scale-[1.02] hover:border-white/20 hover:shadow-lg hover:shadow-cyan-500/10 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-slate-950"
              >
                Ask Prime
              </button>
            </div>
          </div>
        </div>
      )}
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
        guardrailsLastChecked={guardrailsLastChecked || undefined}
        showPlusIcon={isByte}
        onAttachmentsChange={isByte ? handleAttachmentSelect : undefined}
        onStop={cancelStream}
        onInputFocus={isInlinePrime ? handleInlinePrimeInputFocus : undefined}
        onInputMouseDown={isInlinePrime ? handleInlinePrimeInputMouseDown : undefined}
        readOnly={isInlinePrime}
      />
    </div>
  );

  // ============================================================================
  // INLINE MODE - Render chat directly without backdrop/positioning (for pages)
  // ============================================================================
  // CRITICAL: In inline/page mode, do NOT trap scroll - let dashboard page scroll naturally
  if (mode === 'inline') {
    return (
      <div 
        data-unified-chat-mount={mountIdRef.current}
        className="flex h-auto w-full min-w-0 flex-col min-h-0 rounded-3xl border border-slate-800/80 bg-gradient-to-b from-slate-900/80 via-slate-950 to-slate-950">
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
        
        {/* MESSAGES AREA - In inline mode, no nested scroll - flows with page scroll */}
        {/* CRITICAL: Remove overflow-y-auto in inline mode to prevent scroll trap */}
        <div
          ref={scrollContainerRef}
          className="flex-1 min-h-0"
        >
            <div className={compact ? "px-4 pt-3 pb-3" : "px-4 pt-4 pb-4"}>
            <div className="w-full max-w-full mx-0 min-w-0 space-y-3">
              {/* Messages list - greeting is now a message row, no separate welcome region */}
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

                {/* Handoff banner pill - shown above greeting message (but NOT for Prime itself) */}
                {greetingMessage && isHandoffFromPrime && currentEmployeeSlug !== 'prime-boss' && (
                  <div className="flex items-center justify-start px-4 pb-2">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-900/30 border border-purple-500/40 text-xs text-purple-300">
                      <ArrowRight className="w-3 h-3" />
                      <span className="font-medium">Handoff from Prime</span>
                    </div>
                  </div>
                )}

                {/* STEP 5: Prime Summary Ready Strip - shown when Byte is active and summary is ready */}
                {isByte && primeSummaryReady && (
                  <div className="px-4 pb-2">
                    <PrimeSummaryReadyStrip
                      importId={primeSummaryReady}
                      onViewSummary={async () => {
                        // STEP 6: Controlled handoff to Prime
                        const summary = getPrimeSummary(primeSummaryReady);
                        if (!summary) {
                          if (import.meta.env.DEV) {
                            console.log('[UnifiedAssistantChat] Prime recap skipped (no summary)', { importId: primeSummaryReady });
                          }
                          return;
                        }

                        // Guard: Check if already consumed (prevents double-click, refresh duplicates)
                        if (summary.consumed) {
                          if (import.meta.env.DEV) {
                            console.log('[UnifiedAssistantChat] Prime recap skipped (already consumed)', { importId: primeSummaryReady });
                          }
                          return;
                        }

                        // Guard: Check if recap already injected (double-click protection)
                        const stableRecapId = `prime-recap-${primeSummaryReady}`;
                        const recapAlreadyExists = injectedMessages.some(
                          m => m.id === stableRecapId || (m.meta?.isRecap && m.meta?.importId === primeSummaryReady)
                        );
                        if (recapAlreadyExists) {
                          if (import.meta.env.DEV) {
                            console.log('[UnifiedAssistantChat] Prime recap skipped (already injected)', { importId: primeSummaryReady, stableRecapId });
                          }
                          return;
                        }

                        // Mark as consumed immediately (before async operations) to prevent double-click
                        consumePrimeSummary(primeSummaryReady);

                        // Switch active employee to Prime
                        setActiveEmployeeSlugOverride('prime-boss');
                        setActiveEmployeeGlobal('prime-boss');

                        // Wait a moment for employee switch to complete
                        await new Promise(resolve => setTimeout(resolve, 100));

                        // Inject Prime's prepared recap message into chat as assistant message
                        // Check if Prime has already greeted in this session
                        const hasPrimeGreeted = messages.some(
                          m => m.role === 'assistant' && 
                          (m.id?.startsWith('prime-greeting-') || m.content.toLowerCase().includes('hello') || m.content.toLowerCase().includes('hi'))
                        );

                        const primeRecapContent = summary.content; // Calm, leader tone (no greeting)

                        // Inject as assistant message (not user message via sendMessage)
                        const primeRecapMessage: ChatMessage = {
                          id: stableRecapId,
                          role: 'assistant',
                          content: primeRecapContent,
                          timestamp: new Date().toISOString(),
                          meta: {
                            importId: primeSummaryReady,
                            isRecap: true,
                            employee_key: 'prime-boss', // Ensure Prime authorship
                          },
                        };

                        setInjectedMessages(prev => {
                          // Guard: Don't add if already exists (shouldn't happen due to earlier check, but defensive)
                          if (prev.some(m => m.id === stableRecapId || (m.meta?.isRecap && m.meta?.importId === primeSummaryReady))) {
                            return prev;
                          }
                          if (import.meta.env.DEV) {
                            console.log('[UnifiedAssistantChat] Prime recap injected', { importId: primeSummaryReady, stableRecapId });
                          }
                          return [...prev, primeRecapMessage];
                        });
                      }}
                    />
                  </div>
                )}

                {/* Messages list */}
                {displayMessages.map((message) => {
                  const isGreetingMessage = message.id === 'greeting-message' || message.id?.startsWith('prime-greeting-');
                  const isHandoffMessage = message.role === 'assistant' && 
                    (message.content.toLowerCase().includes('bring in') || 
                     message.content.toLowerCase().includes('handoff') ||
                     message.content.toLowerCase().includes('connect you with'));
                  
                  // When greeting is typing, TypingIndicatorRow renders its own avatar - don't render message row avatar
                  const isGreetingTyping = chatReady && isGreetingMessage && isTypingFor(currentEmployeeSlug);
                  
                  // Special handling for Prime greeting card (only show when greeting is complete and we have structured data)
                  const isPrimeGreetingCard = isGreetingMessage && 
                    normalizedSlug === 'prime-boss' && 
                    primeGreetingData && 
                    greetingCompletedRef.current &&
                    !isGreetingTyping;
                  
                  return (
                    <div
                      key={message.id}
                      className={`flex scroll-mt-10 ${
                        message.role === 'user' ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      {/* Prime WOW Greeting Card */}
                      {isPrimeGreetingCard ? (
                        <div className="space-y-4">
                          <div className="flex items-start gap-2 max-w-[90%]">
                            <PrimeLogoBadge size={32} className="flex-shrink-0" />
                            <PrimeGreetingCard
                              greeting={primeGreetingData}
                              onChipClick={(chip) => {
                                // Prefill input with chip message
                                setInputMessage(chip.message);
                                // Focus input
                                inputRef.current?.focus();
                                // Optionally auto-send (uncomment if preferred)
                                // sendMessage(chip.message);
                              }}
                            />
                          </div>
                          {/* Quick Actions - Appears below greeting card */}
                          {/* Use chips from greetingData if available, otherwise use default actions */}
                          {normalizedSlug === 'prime-boss' && (
                            <div className="px-4">
                              <PrimeQuickActions
                                actions={primeGreetingData?.chips?.map(chip => {
                                  // Map chip intent to icon
                                  let Icon = Upload; // Default
                                  if (chip.intent === 'spending' || chip.intent === 'snapshot') {
                                    Icon = TrendingUp;
                                  } else if (chip.intent === 'question') {
                                    Icon = MessageCircle;
                                  } else if (chip.intent === 'upload') {
                                    Icon = Upload;
                                  }
                                  return {
                                    label: chip.label,
                                    message: chip.message,
                                    icon: Icon,
                                    sublabel: undefined,
                                  };
                                })}
                                onActionClick={(action) => {
                                  // Prefill input with action message
                                  setInputMessage(action.message);
                                  // Focus input
                                  inputRef.current?.focus();
                                }}
                              />
                            </div>
                          )}
                        </div>
                      ) : (
                        <>
                          {/* When greeting is typing, TypingIndicatorRow handles the entire row (including avatar) */}
                          {/* CRITICAL: Use greetingTypingAllowed to prevent double typing */}
                          {greetingTypingAllowed && showTypingIndicator && renderMode === 'slideout' ? (
                            <TypingIndicatorRow 
                              employeeSlug={currentEmployeeSlug}
                              displayName={displayConfig.displayName}
                              compact={true}
                            />
                          ) : (
                            <div
                              className={`flex items-start gap-2 max-w-[85%] ${
                                message.role === 'user' ? 'flex-row-reverse' : ''
                              }`}
                            >
                              {/* Avatar - NOT rendered when greeting is typing (TypingIndicatorRow has its own) */}
                              {/* CRITICAL: Render avatar for all roles (user, assistant, system) */}
                              {message.role === 'user' ? (
                                <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-slate-700">
                                  <User className="w-4 h-4 text-slate-200" />
                                </div>
                              ) : message.role === 'system' ? (
                                <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-slate-700/50">
                                  <span className="text-xs">ℹ️</span>
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
                                    : message.role === 'system'
                                    ? 'bg-slate-800/60 border border-slate-700/50 text-slate-300 italic'
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
                                <div className="text-sm leading-relaxed">
                                  {message.role === 'assistant' ? (
                                    <TypingMessage
                                      content={message.content}
                                      messageId={message.id}
                                      isStreaming={isStreaming && message.id === lastMessageId}
                                      isTyped={typedMessageIdsRef.current.has(message.id)}
                                      onTyped={(id) => {
                                        typedMessageIdsRef.current.add(id);
                                      }}
                                      charDelay={isGreetingMessage ? 24 : 18} // Slower for greeting (more premium feel, ~24ms/char)
                                      maxDuration={isGreetingMessage ? 8000 : 5000} // Longer max duration for greeting
                                    />
                                  ) : (
                                    <span className="whitespace-pre-wrap break-words">{message.content}</span>
                                  )}
                                </div>
                                {(() => {
                                  // Hide timestamp for greeting messages to feel more AI-like
                                  if (isGreetingMessage || message.meta?.hideTimestamp) {
                                    return null;
                                  }
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
                          )}
                        </>
                      )}
                      {/* Confidence copy - Security checks status (shows after greeting for Prime) */}
                      {isGreetingMessage && normalizedSlug === 'prime-boss' && greetingCompletedRef.current && (
                        <div className="px-4 pt-1 pb-2">
                          <p className="text-[10px] text-slate-500 text-center">
                            {custodianReady ? 'Security checks: Custodian active' : 'Security checks: Setup needed'}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Typing indicator (unified, canonical component) - ONLY ONE typing indicator allowed */}
                {/* FRAME-0 LOCK: Only show typing after chat is ready (open stabilized) */}
                {/* CRITICAL: Normal typing indicator - only show when greeting typing is NOT active */}
                {/* Only show typing in slideout mode, never in page mode */}
                {showTypingIndicator && renderMode === 'slideout' && chatReady && showNormalTyping && (
                  <TypingIndicatorRow 
                    employeeSlug={currentEmployeeSlug}
                    displayName={displayConfig.displayName}
                  />
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
  
  // TASK 3: Always render but hide with CSS to prevent remounting
  // Combine both visibility conditions - hide if onboarding active OR slideout closed
  // shouldHide is computed above (includes shouldMount check to prevent hook count changes)
  
  // Always render container to prevent unmount/remount (preserves greeting state)
  // Use CSS visibility instead of conditional rendering for AnimatePresence
  return (
    <div 
      className={shouldHide ? 'hidden' : ''}
      style={shouldHide ? { display: 'none' } : undefined}
      aria-hidden={shouldHide}
    >
      {/* Always render panel container, toggle visibility via CSS to prevent remount */}
      {/* z-[80] ensures panel is above floating rail (z-[60]) */}
      <div 
        className={isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}
        style={{ 
          position: 'fixed',
          inset: 0,
          zIndex: 80, // Above floating rail (z-[60])
          display: 'flex',
          justifyContent: 'flex-end',
          transition: 'opacity 0.3s ease',
        }}
      >
      <AnimatePresence mode="wait">
        {isOpen && (
          <div 
            data-unified-chat-mount={mountIdRef.current}
            className="flex justify-end w-full md:w-auto">
          {/* Backdrop - animated separately for smooth transition */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: showPrimeOnboarding && !primeOnboardingCompleted ? 0.85 : 0.5 }}
            exit={{ opacity: 0 }}
            transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.3, ease: 'easeOut' }}
            className={`absolute inset-0 ${showPrimeOnboarding && !primeOnboardingCompleted ? 'bg-black/80 backdrop-blur-xl' : 'bg-black/50 backdrop-blur-sm'}`}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onClose?.();
            }}
            aria-hidden="true"
            style={{ willChange: 'opacity', pointerEvents: 'auto' }}
          >
            {/* Vignette effect for modal feel */}
            {showPrimeOnboarding && !primeOnboardingCompleted && (
              <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(circle at center, transparent 0%, transparent 40%, rgba(0,0,0,0.4) 100%)' }} />
            )}
          </motion.div>
          
          {/* Panel with rail inside - locked height, no auto-sizing */}
          {/* CRITICAL: This wrapper must not resize - use fixed height constraints */}
          {/* z-[80] ensures panel content is above floating rail (z-[60]) */}
          <div 
            className="relative z-[80] h-full w-full md:w-auto overflow-visible flex items-stretch min-h-0"
            onClick={(e) => e.stopPropagation()} // Prevent clicks inside panel from closing it
            style={{
              // Ensure wrapper doesn't cause resize
              height: '100%',
              maxHeight: '100%',
              pointerEvents: 'auto', // Ensure panel is clickable
            }}
          >
            <PrimeSlideoutShell
            title={displayConfig.chatTitle}
            subtitle={displayConfig.chatSubtitle}
            statusBadge={statusBadge}
            icon={<span className="text-lg">{displayConfig.emoji}</span>}
            iconGradient={displayConfig.gradient}
            onClose={() => {
              // Abort any in-flight requests before closing
              cancelStream();
              onClose?.();
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
              {/* MESSAGES AREA - Message list container is the scroll owner */}
              {/* CRITICAL: This wrapper provides padding and flex structure - must have flex flex-col h-full min-h-0 */}
              {/* The message list container inside will be the actual scroll owner with capture handlers */}
              <div 
                className="relative px-4 pt-4 pb-4 min-w-0 flex flex-col h-full min-h-0" 
                ref={scrollContainerRef}
                onDragOver={(e) => {
                  if (isByte && e.dataTransfer.types.includes('Files')) {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsDraggingOverChat(true);
                  }
                }}
                onDragLeave={(e) => {
                  if (isByte) {
                    // Only hide if we're leaving the container (not just moving to a child)
                    const rect = e.currentTarget.getBoundingClientRect();
                    const x = e.clientX;
                    const y = e.clientY;
                    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
                      setIsDraggingOverChat(false);
                    }
                  }
                }}
                onDrop={(e) => {
                  if (isByte) {
                    setIsDraggingOverChat(false);
                    // Let ByteUploadPanel handle the drop
                  }
                }}
              >
                  {/* Dropzone overlay - subtle background helper, never blocks scrolling */}
                  {isByte && (
                    <div
                      className={`absolute inset-0 z-0 pointer-events-none transition-all duration-200 ${
                        isDraggingOverChat
                          ? 'opacity-20'
                          : 'opacity-5'
                      }`}
                      style={{
                        background: isDraggingOverChat
                          ? 'radial-gradient(circle at center, rgba(56, 189, 248, 0.08) 0%, rgba(56, 189, 248, 0.02) 50%, transparent 100%)'
                          : 'radial-gradient(circle at center, rgba(56, 189, 248, 0.02) 0%, transparent 100%)',
                        border: isDraggingOverChat
                          ? '2px dashed rgba(56, 189, 248, 0.2)'
                          : 'none',
                        borderRadius: '0.5rem',
                      }}
                    >
                      {isDraggingOverChat && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <div className="text-center">
                            <UploadCloud className="w-12 h-12 text-sky-400 mx-auto mb-2 opacity-60" />
                            <div className="text-sm font-medium text-sky-300">Drop files here</div>
                            <div className="text-xs text-slate-400 mt-1">PDF, CSV, JPG/PNG • Max 25MB</div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  {/* CRITICAL: Message list container - must be the scroll owner with capture handlers */}
                  {/* This container wraps the messages and should have scroll capture to prevent DashboardLayout from capturing wheel events */}
                  <div 
                    ref={scrollElementRef}
                    className="flex-1 min-h-0 overflow-y-auto hide-scrollbar overscroll-contain pointer-events-auto"
                    data-scroll-container="true"
                    style={{ WebkitOverflowScrolling: 'touch' }}
                    onWheelCapture={(e) => {
                      // Stop propagation to prevent DashboardLayout from capturing wheel events
                      e.stopPropagation();
                    }}
                    onTouchMoveCapture={(e) => {
                      // Stop propagation to prevent DashboardLayout from capturing touch events
                      e.stopPropagation();
                    }}
                  >
                    {/* Messages list wrapper with spacing */}
                    <div className="w-full max-w-full mx-0 min-w-0 space-y-3">
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

                      {/* Prime Onboarding Welcome - DISABLED: Onboarding handled by cinematic overlay */}
                      {/* Keep component frozen but hidden - onboarding is handled outside chat */}
                      {false && showPrimeOnboarding && !primeOnboardingCompleted && (
                        <div className="px-4 pb-4">
                          <PrimeOnboardingWelcome
                            onChipClick={async (message) => {
                              // Metadata is already saved by PrimeOnboardingWelcome component
                              // Profile refresh happens inside PrimeOnboardingWelcome
                              // Just mark onboarding as complete
                              setPrimeOnboardingCompleted(true);
                              
                              // Force a small delay to ensure profile state has updated
                              // This ensures the greeting re-renders with new metadata
                              await new Promise(resolve => setTimeout(resolve, 200));
                              
                              // Send the message
                              setInputMessage(message);
                              // Focus input
                              setTimeout(() => {
                                inputRef.current?.focus();
                              }, 100);
                            }}
                            onComplete={() => {
                              setPrimeOnboardingCompleted(true);
                            }}
                          />
                        </div>
                      )}

                      {/* Handoff banner pill - shown above greeting message (but NOT for Prime itself) */}
                      {greetingMessage && isHandoffFromPrime && currentEmployeeSlug !== 'prime-boss' && (
                        <div className="flex items-center justify-start px-4 pb-2">
                          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-900/30 border border-purple-500/40 text-xs text-purple-300">
                            <ArrowRight className="w-3 h-3" />
                            <span className="font-medium">Handoff from Prime</span>
                          </div>
                        </div>
                      )}

                      {/* Messages list - Hide greeting when showing Prime onboarding */}
                      {displayMessages.filter(m => !(showPrimeOnboarding && !primeOnboardingCompleted && m.id === 'greeting-message')).map((message) => {
                        const isGreetingMessage = message.id === 'greeting-message' || message.id?.startsWith('prime-greeting-');
                        // Detect handoff messages
                        const isHandoffMessage = message.role === 'assistant' && 
                          (message.content.toLowerCase().includes('bring in') || 
                           message.content.toLowerCase().includes('handoff') ||
                           message.content.toLowerCase().includes('connect you with'));
                        
                        // When greeting is typing, TypingIndicatorRow renders its own avatar - don't render message row avatar
                        const isGreetingTyping = chatReady && isGreetingMessage && isTypingFor(currentEmployeeSlug);
                        
                        // Special handling for Prime greeting card (only show when greeting is complete and we have structured data)
                        const isPrimeGreetingCard = isGreetingMessage && 
                          normalizedSlug === 'prime-boss' && 
                          primeGreetingData && 
                          greetingCompletedRef.current &&
                          !isGreetingTyping;
                        
                        // Show trust message after first assistant response
                        const isFirstAssistantResponse = message.role === 'assistant' && 
                          message.id === firstAssistantResponseId &&
                          shouldShowTrustMessage &&
                          currentEmployeeSlug === 'prime-boss';
                        
                        // Show next best action after first assistant response (if intent detected)
                        const showNextBestAction = message.role === 'assistant' &&
                          message.id === firstAssistantResponseId &&
                          detectedIntent &&
                          currentEmployeeSlug === 'prime-boss' &&
                          !isStreaming;
                        
                        return (
                          <React.Fragment key={message.id}>
                            <div
                              className={`flex scroll-mt-10 ${
                                message.role === 'user' ? 'justify-end' : 'justify-start'
                              }`}
                            >
                            {/* Prime WOW Greeting Card */}
                            {isPrimeGreetingCard ? (
                              <div className="space-y-4">
                                <div className="flex items-start gap-2 max-w-[90%]">
                                  <PrimeLogoBadge size={32} className="flex-shrink-0" />
                                  <PrimeGreetingCard
                                    greeting={primeGreetingData}
                                    onChipClick={(chip) => {
                                      // Prefill input with chip message
                                      setInputMessage(chip.message);
                                      // Focus input
                                      inputRef.current?.focus();
                                    }}
                                  />
                                </div>
                                {/* Quick Actions - Appears below greeting card */}
                                {/* Use chips from greetingData if available, otherwise use default actions */}
                                {normalizedSlug === 'prime-boss' && (
                                  <div className="px-4">
                                    <PrimeQuickActions
                                      actions={primeGreetingData?.chips?.map(chip => ({
                                        label: chip.label,
                                        message: chip.message,
                                        icon: Upload, // Default icon, can be enhanced later
                                        sublabel: undefined,
                                      }))}
                                      onActionClick={(action) => {
                                        // Prefill input with action message
                                        setInputMessage(action.message);
                                        // Focus input
                                        inputRef.current?.focus();
                                      }}
                                    />
                                  </div>
                                )}
                              </div>
                            ) : (
                              <>
                                {/* When greeting is typing, TypingIndicatorRow handles the entire row (including avatar) */}
                                {/* CRITICAL: Use greetingTypingAllowed to prevent double typing */}
                                {greetingTypingAllowed && showTypingIndicator && renderMode === 'slideout' ? (
                                  <TypingIndicatorRow 
                                    employeeSlug={currentEmployeeSlug}
                                    displayName={displayConfig.displayName}
                                    compact={true}
                                  />
                                ) : (
                                  <div
                                    className={`flex items-start gap-2 max-w-[85%] ${
                                      message.role === 'user' ? 'flex-row-reverse' : ''
                                    }`}
                                  >
                                    {/* Avatar - NOT rendered when greeting is typing (TypingIndicatorRow has its own) */}
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
                                    : message.role === 'system'
                                    ? 'bg-slate-800/60 border border-slate-700/50 text-slate-300 italic'
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
                                      <div className="text-sm leading-relaxed">
                                        {message.role === 'assistant' ? (
                                          // Show typing dots if placeholder is empty and streaming
                                          message.meta?.is_streaming === true && message.content.trim() === '' ? (
                                            <div className="flex items-center gap-1 py-1">
                                              <span className="w-2 h-2 bg-slate-400 rounded-full animate-pulse" style={{ animationDelay: '0ms' }} />
                                              <span className="w-2 h-2 bg-slate-400 rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
                                              <span className="w-2 h-2 bg-slate-400 rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
                                            </div>
                                          ) : (
                                            <TypingMessage
                                              content={message.content}
                                              messageId={message.id}
                                              isStreaming={isStreaming && message.id === lastMessageId}
                                              isTyped={typedMessageIdsRef.current.has(message.id)}
                                              onTyped={(id) => {
                                                typedMessageIdsRef.current.add(id);
                                              }}
                                              charDelay={isGreetingMessage ? 24 : 18} // Slower for greeting (more premium feel, ~24ms/char)
                                              maxDuration={isGreetingMessage ? 8000 : 5000} // Longer max duration for greeting
                                            />
                                          )
                                        ) : (
                                          <span className="whitespace-pre-wrap break-words">{message.content}</span>
                                        )}
                                      </div>
                                      {(() => {
                                        // Hide timestamp for greeting messages to feel more AI-like
                                        if (isGreetingMessage || message.meta?.hideTimestamp) {
                                          return null;
                                        }
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
                                )}
                              </>
                            )}
                          </div>
                          
                          {/* Trust message after first assistant response */}
                          {isFirstAssistantResponse && (
                            <PrimeTrustMessage />
                          )}
                          
                          {/* Next best action chip after first assistant response */}
                          {showNextBestAction && (
                            <div className="flex justify-start px-4 pb-2">
                              <button
                                onClick={() => {
                                  const actionLabel = getNextBestAction(detectedIntent!);
                                  setInputMessage(actionLabel);
                                  setTimeout(() => {
                                    inputRef.current?.focus();
                                  }, 100);
                                }}
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800/60 border border-slate-700/50 hover:bg-slate-700/60 text-sm text-slate-300 hover:text-white transition-colors"
                              >
                                <span>{getNextBestAction(detectedIntent!)}</span>
                                <ArrowRight className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </React.Fragment>
                      );
                    })}

                      {/* Prime Quick Actions - Show in empty state (no messages, onboarding complete) */}
                      {normalizedSlug === 'prime-boss' && 
                       !showPrimeOnboarding && 
                       primeOnboardingCompleted && 
                       displayMessages.length === 0 && 
                       !isStreaming && (
                        <div className="px-4 pb-4">
                          <PrimeQuickActions
                            onActionClick={(action) => {
                              // Prefill input with action message
                              setInputMessage(action.message);
                              // Focus input
                              inputRef.current?.focus();
                            }}
                          />
                        </div>
                      )}

                      {/* Prime Quick Actions - Show in empty state (no messages, onboarding complete, no greeting) */}
                      {normalizedSlug === 'prime-boss' && 
                       !showPrimeOnboarding && 
                       primeOnboardingCompleted && 
                       displayMessages.length === 0 && 
                       !isStreaming && 
                       !greetingMessage && (
                        <div className="px-4 pb-4">
                          <PrimeQuickActions
                            onActionClick={(action) => {
                              // Prefill input with action message
                              setInputMessage(action.message);
                              // Focus input
                              inputRef.current?.focus();
                            }}
                          />
                        </div>
                      )}

                      {/* Typing indicator (unified, canonical component) - ONLY ONE typing indicator allowed */}
                      {/* FRAME-0 LOCK: Only show typing after chat is ready (open stabilized) */}
                      {/* Greeting typing shows INSIDE greeting message bubble, so suppress this one during greeting */}
                      {/* Only show typing in slideout mode, never in page mode */}
                      {/* CRITICAL: Normal typing indicator - only show when greeting typing is NOT active */}
                      {showTypingIndicator && renderMode === 'slideout' && chatReady && showNormalTyping && (
                        <TypingIndicatorRow 
                          employeeSlug={currentEmployeeSlug}
                          displayName={displayConfig.displayName}
                        />
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
        )}
      </AnimatePresence>
      </div>
    </div>
  );
}
