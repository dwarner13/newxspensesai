/**
 * Unified Assistant Chat Component
 * 
 * Unified chat interface that can be used for any AI employee.
 * Renders as a slideout panel on the right side, keeping page content visible.
 * Styled to match Prime Tasks and Prime Team panels for visual consistency.
 */

// ====== PRIME CHAT UI ======

import React, { useState, useRef, useEffect, useMemo, useCallback, useLayoutEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Send, User, ArrowRight, X, Upload, TrendingUp, MessageCircle, UploadCloud } from 'lucide-react';
import { toast } from 'react-hot-toast';
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
import { useProfile } from '../../hooks/useProfile';
import { usePrimeState } from '../../contexts/usePrimeState';
import { buildUserContextFromProfile } from '../../lib/userContextHelpers';
import { resolveDisplayNameSync } from '../../lib/user/resolveDisplayName';
import { useByteInlineUpload } from '../../hooks/useByteInlineUpload';
import { useSmartImport } from '../../hooks/useSmartImport';
import { ByteInlineUpload } from './ByteInlineUpload';
import { ByteUploadPanel } from './ByteUploadPanel';
import { useUnifiedChatLauncher, getUnifiedChatUserInitiatedFlag, hasChatUserInitiated } from '../../hooks/useUnifiedChatLauncher';
import type { QuickAction } from '../../config/employeeChatConfig';
import { PrimeLogoBadge } from '../branding/PrimeLogoBadge';
import { useChatSessions } from '../../hooks/useChatSessions';
import { ChatOverlayShell } from './ChatOverlayShell';
import { ChatInputBar } from './ChatInputBar';
import { PrimeSlideoutShell } from '../prime/PrimeSlideoutShell';
import DesktopChatSideBar from './DesktopChatSideBar';
import { Button } from '../ui/button';
import { useNavigate, useLocation } from 'react-router-dom';
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
import { log, debug, warn, error as logError } from '../../lib/logger';
import { isPostImportTriggersDisabled } from '../../lib/featureFlags';
import type { ChatHandoffPayload } from '../../types/chatHandoff';

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

  /** Optional handoff payload */
  handoff?: ChatHandoffPayload;
  
  /** Rendering mode: 'slideout' (Prime slideout), 'overlay' (centered overlay), or 'inline' (for pages) */
  mode?: 'slideout' | 'overlay' | 'inline';

  /** Force open even if onboarding incomplete (explicit user action) */
  forceOpen?: boolean;
  
  
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
  handoff,
  mode = 'slideout', // Default to slideout for backward compatibility
  forceOpen = false,
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
    log('[UnifiedAssistantChat] 🔄 Render', {
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
  const { ready, userId, profile, isProfileLoading, firstName, user, refreshProfile, session } = useAuth();
  
  // Hook 3: Profile context - called unconditionally
  const { displayName } = useProfileContext();
  const { avatarUrl: userAvatarUrl, avatarInitials } = useProfile();
  
  // Hook 4: Prime state - called unconditionally (for greeting name resolution)
  const primeState = usePrimeState();
  
  // Hook 4: Prime overlay - called unconditionally
  
  // Hook 5: Chat launcher - called unconditionally
  const {
    setActiveEmployee: setActiveEmployeeGlobal,
    activeEmployeeSlug: globalActiveEmployeeSlug,
    activeEmployeeSlugOverride,
    setActiveEmployeeSlugOverride,
    openChat,
    clearInitialQuestion,
    clearHandoff,
    setIsWorking,
  } = useUnifiedChatLauncher();
  
  // PART 3: Route-aware auto-switch (Smart Import => Byte)
  useEffect(() => {
    if (location.pathname === '/dashboard/smart-import-ai') {
      // On Smart Import page, default chat to Byte unless user explicitly opened Prime
      if (globalActiveEmployeeSlug === 'prime-boss') {
        setActiveEmployeeSlugOverride(null);
      } else {
        setActiveEmployeeSlugOverride('byte-docs');
      }
      return;
    }

    // Preserve user-selected employee on other routes
    if (activeEmployeeSlugOverride || initialEmployeeSlug) {
      return;
    }

    // Clear override when leaving Byte-owned workspace
    setActiveEmployeeSlugOverride(null);
  }, [
    location.pathname,
    setActiveEmployeeSlugOverride,
    globalActiveEmployeeSlug,
    activeEmployeeSlugOverride,
    initialEmployeeSlug,
  ]);
  
  // Hook 6: Chat sessions - called unconditionally
  const { loadSessions } = useChatSessions({ autoLoad: false });
  
  // Hook 7: Smart import - called unconditionally
  const smartImport = useSmartImport(userId || undefined, 'chat');
  
  // Hook 8: State hooks - called unconditionally
  const [inputMessage, setInputMessage] = useState('');
  const scrollContainerRef = useRef<HTMLDivElement | null>(null); // Points to wrapper (for drag handlers)
  const scrollElementRef = useRef<HTMLDivElement | null>(null); // Points to actual scroll container
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const uploadedAttachmentKeysRef = useRef<Set<string>>(new Set());
  
  // CRITICAL: Track if user is near bottom for auto-scroll during streaming
  const [isNearBottomState, setIsNearBottomState] = useState(true);
  const scrollContainerElementRef = useRef<HTMLElement | null>(null); // Actual scroll container (found via DOM traversal)
  
  // Local state for UI-only injected messages
  const [injectedMessages, setInjectedMessages] = useState<ChatMessage[]>([]);
  const [summaryOverrides, setSummaryOverrides] = useState<Record<string, string>>({});
  const [categorizeStatusByImportId, setCategorizeStatusByImportId] = useState<Record<string, 'idle' | 'pending' | 'done' | 'error'>>({});
  const userJustSentRef = useRef(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
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
  const hasExplicitEmployeeSlug = Boolean(activeEmployeeSlugOverride || initialEmployeeSlug);
  const routeForcedEmployeeSlug = isPrimeChatPage && !hasExplicitEmployeeSlug ? 'prime-boss' : null;
  
  // Calculate initial effectiveEmployeeSlug: default to Prime on Prime Chat page, otherwise use override/prop/global
  const initialEffectiveEmployeeSlug = activeEmployeeSlugOverride || initialEmployeeSlug || routeForcedEmployeeSlug || globalActiveEmployeeSlug || 'prime-boss';

  console.log('[chat] effective slug', {
    routeForcedEmployeeSlug,
    activeEmployeeSlugOverride,
    initialEmployeeSlug,
    initialEffectiveEmployeeSlug,
  });
  
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
  const historyLoadCompleteRef = useRef(false);
  const loadedThreadRef = useRef<string | null>(null);
  const devHistoryClearRef = useRef(false);
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
  
  const resolveEmployeeKey = useCallback((slug: string) => {
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
    return employeeKeyMap[slug] || slug.split('-')[0] || 'prime';
  }, []);

  const getThreadStorageKey = useCallback((uid: string, empKey: string) => `chat_thread_${uid}_${empKey}`, []);
  const getLegacyThreadStorageKey = useCallback((uid: string, slug: string) => `chat_thread_${uid}_${slug}`, []);

  const readThreadIdFromStorage = useCallback((uid: string, empKey: string, slug: string) => {
    if (typeof window === 'undefined') return null;

    const newKey = getThreadStorageKey(uid, empKey);
    const legacyKey = getLegacyThreadStorageKey(uid, slug);

    try {
      const v = localStorage.getItem(newKey);
      if (v) return v;
    } catch {}

    // legacy fallback + migrate
    try {
      const legacy = localStorage.getItem(legacyKey);
      if (legacy) {
        try { localStorage.setItem(newKey, legacy); } catch {}
        try { localStorage.removeItem(legacyKey); } catch {}
        return legacy;
      }
    } catch {}

    return null;
  }, [getThreadStorageKey, getLegacyThreadStorageKey]);

  const writeThreadIdToStorage = useCallback((uid: string, empKey: string, slug: string, threadId: string) => {
    if (typeof window === 'undefined') return;

    const newKey = getThreadStorageKey(uid, empKey);
    const legacyKey = getLegacyThreadStorageKey(uid, slug);

    try { localStorage.setItem(newKey, threadId); } catch {}
    // best-effort cleanup of legacy key to prevent future mismatches
    try { localStorage.removeItem(legacyKey); } catch {}
  }, [getThreadStorageKey, getLegacyThreadStorageKey]);

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
      historyLoadCompleteRef.current = true;
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
        log(`[UnifiedAssistantChat] ✅ Skipping history load - already loaded (key: ${stableKey.substring(0, 20)}...)`);
      }
      historyLoadCompleteRef.current = true;
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
          historyLoadCompleteRef.current = true;
          setIsLoadingHistory(false);
          return;
        }
        
        // Map employee slug to employee_key
        const employeeKey = resolveEmployeeKey(effectiveEmployeeSlug);
        
        if (import.meta.env.DEV && !devHistoryClearRef.current) {
          devHistoryClearRef.current = true;
          try {
            const session = await supabase.auth.getSession();
            const accessToken = session?.data?.session?.access_token;
            await fetch('/.netlify/functions/clear-chat-history', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
              },
              body: JSON.stringify({ userId, employeeSlug: effectiveEmployeeSlug }),
            });
          } catch (clearErr: any) {
            warn('[UnifiedAssistantChat] Failed to clear dev chat history:', clearErr);
          }
          try {
            const storageKey = getThreadStorageKey(userId, employeeKey);
            const legacyKey = getLegacyThreadStorageKey(userId, effectiveEmployeeSlug);
            localStorage.removeItem(storageKey);
            localStorage.removeItem(legacyKey);
          } catch {}
        }

        // First, try to get thread_id from localStorage (faster, avoids DB call)
        let threadId: string | null = null;
        const storedThreadId = readThreadIdFromStorage(userId, employeeKey, effectiveEmployeeSlug);
        if (storedThreadId) {
          threadId = storedThreadId;
          setResolvedThreadId(storedThreadId); // Update state for identity key
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
              if (threadId) {
                writeThreadIdToStorage(userId, employeeKey, effectiveEmployeeSlug, threadId);
                setResolvedThreadId(threadId); // Update state for identity key
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
                  writeThreadIdToStorage(userId, employeeKey, effectiveEmployeeSlug, threadId);
                  setResolvedThreadId(threadId); // Update state for identity key
                }
              }
            }
          } catch (threadErr: any) {
            warn('[UnifiedAssistantChat] Failed to get/create thread:', threadErr);
          }
        }
        
        if (!threadId) {
          historyLoadCompleteRef.current = true;
          setIsLoadingHistory(false);
          return;
        }
        if (loadedThreadRef.current === threadId) {
          historyLoadCompleteRef.current = true;
          setIsLoadingHistory(false);
          return;
        }
        loadedThreadRef.current = threadId;

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
            log(`[UnifiedAssistantChat] 📥 Loading history by thread_id: ${threadId.substring(0, 8)}...`);
          }
        } else if (sessionId) {
          // Fallback 1: Query by session_id (if no thread_id)
          query = query.eq('session_id', sessionId);
          if (import.meta.env.DEV) {
            log(`[UnifiedAssistantChat] 📥 Loading history by session_id: ${sessionId.substring(0, 8)}...`);
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
                log(`[UnifiedAssistantChat] 📥 Fallback: loading messages from ${sessionIds.length} sessions (excluding thread_id messages)`);
              }
            } else {
              // Last resort: get recent messages by userId only (may include other employees)
              // CRITICAL: Exclude messages with thread_id to prevent overlap
              query = query.is('thread_id', null);
              if (import.meta.env.DEV) {
                log('[UnifiedAssistantChat] 📥 Fallback: loading recent messages by userId only (excluding thread_id messages)');
              }
            }
          } catch (fallbackErr: any) {
                warn('[UnifiedAssistantChat] Fallback query failed:', fallbackErr);
            // Continue with userId-only query (excluding thread_id)
            query = query.is('thread_id', null);
          }
        }
        
        const { data, error } = await query;
        
        if (error) {
          warn('[UnifiedAssistantChat] Failed to load message history:', error);
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
          
          // PART 3: Deduplicate messages by id, client_message_id (for user), request_id (for assistant),
          // and by content within a short window (handles DB echoes without metadata).
          const messageMap = new Map<string, ChatMessage>();
          const seenClientIds = new Set<string>();
          const seenRequestIds = new Set<string>();
          const contentKeyMap = new Map<string, ChatMessage>();
          const normalizeText = (s: string) => (s || '').replace(/\s+/g, ' ').trim().toLowerCase();
          const withinWindow = (a?: string, b?: string, role?: ChatMessage['role']) => {
            if (!a || !b) return true;
            const ta = Date.parse(a);
            const tb = Date.parse(b);
            if (Number.isNaN(ta) || Number.isNaN(tb)) return true;
            const windowMs = role === 'assistant' ? 2 * 60 * 1000 : 10000; // 2m for assistant, 10s otherwise
            return Math.abs(ta - tb) < windowMs;
          };
          
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
            
            // Content-level dedupe within short window (fallback when no metadata exists)
            const contentKey = `${msg.role}|${normalizeText(msg.content)}`;
            const existingByContent = contentKeyMap.get(contentKey);
            if (existingByContent && withinWindow(existingByContent.createdAt, msg.createdAt, msg.role)) {
              return;
            }
            contentKeyMap.set(contentKey, msg);
            
            messageMap.set(msg.id, msg);
          });
          const deduplicatedMessages = Array.from(messageMap.values());
          const collapsedMessages: ChatMessage[] = [];
          deduplicatedMessages.forEach(msg => {
            const last = collapsedMessages[collapsedMessages.length - 1];
            if (last && last.role === msg.role && normalizeText(last.content) === normalizeText(msg.content)) {
              return;
            }
            collapsedMessages.push(msg);
          });
          
          setLoadedHistoryMessages(collapsedMessages);
          historyLoadedRef.current = historyKey;
          historyLoadCompleteRef.current = true;
          
          // PART B: Mark session as loaded in sessionStorage
          if (typeof window !== 'undefined') {
            sessionStorage.setItem(sessionLoadKey, '1');
          }
          
          if (import.meta.env.DEV) {
            log(`[UnifiedAssistantChat] ✅ Loaded ${collapsedMessages.length} messages from history (${historyMessages.length - collapsedMessages.length} duplicates removed, key: ${stableKey.substring(0, 20)}...)`);
          }
        } else {
          setLoadedHistoryMessages([]);
          historyLoadedRef.current = historyKey;
          historyLoadCompleteRef.current = true;
          
          // PART B: Mark session as loaded even if no messages
          if (typeof window !== 'undefined') {
            sessionStorage.setItem(sessionLoadKey, '1');
          }
        }
      } catch (err: any) {
        logError('[UnifiedAssistantChat] Error loading chat history:', err);
        setLoadedHistoryMessages([]);
        historyLoadCompleteRef.current = true;
      } finally {
        setIsLoadingHistory(false);
        historyLoadCompleteRef.current = true;
      }
    };
    
    loadHistory();
  }, [isOpen, userId, effectiveEmployeeSlug, conversationId, disableRuntime]);
  
  // Reset history loaded ref and init key when employee changes
  useEffect(() => {
    historyLoadedRef.current = null;
    historyLoadCompleteRef.current = false;
    initKeyRef.current = ''; // Reset init key when employee changes
  }, [effectiveEmployeeSlug]);

  useEffect(() => {
    historyLoadCompleteRef.current = false;
  }, [conversationId]);

  useEffect(() => {
    if (!isOpen) {
      historyLoadCompleteRef.current = false;
    }
  }, [isOpen]);
  
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
          const employeeKey = resolveEmployeeKey(effectiveEmployeeSlug);
          const storedThreadId = readThreadIdFromStorage(userId, employeeKey, effectiveEmployeeSlug);
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
  }, [resolvedThreadId, conversationId, userId, effectiveEmployeeSlug, resolveEmployeeKey, readThreadIdFromStorage]);
  
  // Reset engine ready latch when conversation identity changes or runtime mode changes
  // CRITICAL: Reset latch when identity key changes (threadId resolved, sessionId changes, etc.)
  // Also reset when disableRuntime changes to ensure proper behavior when switching modes
  useEffect(() => {
    if (lastIdentityKeyRef.current !== chatIdentityKey) {
      const oldKey = lastIdentityKeyRef.current;
      setEngineReadyLatched(false);
      lastIdentityKeyRef.current = chatIdentityKey;
      if (import.meta.env.DEV) {
        log('[EngineReadyLatch] 🔄 Reset latch (identity changed)', {
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
      log('[EngineReadyLatch] 🔄 Reset latch (runtime mode changed)', {
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
    // Deduplicate by id, client_message_id (for user), request_id (for assistant),
    // and by content within a short window (fallback when metadata missing).
    const messageMap = new Map<string, ChatMessage>();
    const seenClientIds = new Set<string>();
    const seenRequestIds = new Set<string>();
    const contentKeyMap = new Map<string, ChatMessage>();
    const normalizeText = (s: string) => (s || '').replace(/\s+/g, ' ').trim().toLowerCase();
    const withinWindow = (a?: string, b?: string) => {
      if (!a || !b) return true;
      const ta = Date.parse(a);
      const tb = Date.parse(b);
      if (Number.isNaN(ta) || Number.isNaN(tb)) return true;
      return Math.abs(ta - tb) < 10000; // 10s window
    };
    
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
      
      // Content-level dedupe within short window (fallback)
      const contentKey = `${msg.role}|${normalizeText(msg.content)}`;
      const existingByContent = contentKeyMap.get(contentKey);
      if (existingByContent && withinWindow(existingByContent.createdAt, msg.createdAt)) {
        return;
      }
      contentKeyMap.set(contentKey, msg);
      
      messageMap.set(msg.id, msg);
    });
    return Array.from(messageMap.values());
  }, [loadedHistoryMessages]);
  
  const userLockedSlug = activeEmployeeSlugOverride || initialEmployeeSlug || null;

  // Determine initial employeeSlug for engine: default to Prime on Prime Chat page
  // After handoffs, engineActiveEmployeeSlug will be used (tracked via ref)
  const engineEmployeeSlugRef = useRef<string | undefined>(
    disableRuntime ? undefined : (
      userLockedSlug ||
      (isPrimeChatPage ? 'prime-boss' : null) || 
      globalActiveEmployeeSlug || 
      'prime-boss'
    )
  );
  if (userLockedSlug && engineEmployeeSlugRef.current !== userLockedSlug) {
    engineEmployeeSlugRef.current = userLockedSlug;
  }

  const engineEmployeeSlug = disableRuntime ? undefined : (userLockedSlug || engineEmployeeSlugRef.current);
  
  const engineResult = useUnifiedChatEngine({
    employeeSlug: engineEmployeeSlug,
    conversationId: disableRuntime ? undefined : conversationId,
    initialMessages: deduplicatedInitialMessages,
  });
  
  // Extract engineActiveEmployeeSlug and update refs for next render (handoffs update this)
  const engineActiveEmployeeSlug = disableRuntime ? undefined : engineResult.activeEmployeeSlug;
  if (engineActiveEmployeeSlug && !disableRuntime && !userLockedSlug) {
    engineEmployeeSlugRef.current = engineActiveEmployeeSlug;
  }
  useEffect(() => {
    if (userLockedSlug) {
      engineEmployeeSlugRef.current = userLockedSlug;
    }
  }, [userLockedSlug]);
  
  // Update effectiveEmployeeSlugState when engineActiveEmployeeSlug changes (handoffs)
  useEffect(() => {
    if (activeEmployeeSlugOverride) {
      setEffectiveEmployeeSlugState(activeEmployeeSlugOverride);
      return;
    }
    if (!disableRuntime && engineActiveEmployeeSlug) {
      setEffectiveEmployeeSlugState(engineActiveEmployeeSlug);
    } else if (!disableRuntime && !engineActiveEmployeeSlug && initialEffectiveEmployeeSlug) {
      // Reset to initial if engineActiveEmployeeSlug becomes undefined
      setEffectiveEmployeeSlugState(initialEffectiveEmployeeSlug);
    }
  }, [activeEmployeeSlugOverride, disableRuntime, engineActiveEmployeeSlug, initialEffectiveEmployeeSlug]);
  
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
      if (import.meta.env.DEV) warn('[UnifiedAssistantChat] sendMessage called but runtime is disabled');
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
  const [showGreetingTypingState, setShowGreetingTypingState] = useState(false);
  const [greetingText, setGreetingText] = useState('');
  const [typedGreeting, setTypedGreeting] = useState('');
  const [primeGreetingData, setPrimeGreetingData] = useState<PrimeGreetingData | null>(null);
  const greetingCompletedRef = useRef(false);
  const userClosedRef = useRef(false); // Only clear greeting on explicit user close
  const greetingContentRef = useRef<{ key: string; content: string } | null>(null);
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
  const lastStreamedMessageIdRef = useRef<string | null>(null);

  // Body scroll lock: Lock page scroll when chat is open
  useEffect(() => {
    if (!isOpen || mode === 'inline') return; // Don't lock for inline mode
    
    // Calculate scrollbar width to prevent layout shift
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    
    // Store original values
    const originalOverflow = document.body.style.overflow;
    const originalPaddingRight = document.body.style.paddingRight;
    
    // Lock scroll and add padding for scrollbar
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
      setShowGreetingTypingState(false);
      setTypedGreeting('');
      setPrimeGreetingData(null); // Reset Prime greeting data
      
      // Small delay to ensure profile state has fully updated
      const timer = setTimeout(() => {
        // Trigger greeting regeneration by resetting the ref
        // The greeting useEffect will pick this up and regenerate
        if (import.meta.env.DEV) {
          log('[UnifiedAssistantChat] Regenerating greeting after onboarding completion');
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
  // QUIET MODE GATE: VITE_DISABLE_AUTO_HANDOFFS prevents automatic employee handoffs
  // Purpose: Suppress handoff storms during OCR/Smart Import debugging
  // This is NOT a bug - manual employee switching still works, only auto-handoffs are gated
  // Re-enable: Remove VITE_DISABLE_AUTO_HANDOFFS from .env.local or set to false
  const DISABLE_HANDOFFS = import.meta.env.VITE_DISABLE_AUTO_HANDOFFS === 'true';
  useEffect(() => {
    if (DISABLE_HANDOFFS) {
      // Quiet mode: ignore auto-handoff to prevent storms
      warn('[UnifiedAssistantChat] 🚫 Auto-handoff disabled by env flag. Ignoring handoff to:', engineActiveEmployeeSlug);
      return;
    }
    if (userLockedSlug) {
      return;
    }
    if (!disableRuntime && engineActiveEmployeeSlug && engineActiveEmployeeSlug !== globalActiveEmployeeSlug) {
      log(`[UnifiedAssistantChat] 🔄 Handoff detected: updating global activeEmployeeSlug from ${globalActiveEmployeeSlug} to ${engineActiveEmployeeSlug}`);
      setActiveEmployeeGlobal(engineActiveEmployeeSlug);
    }
  }, [engineActiveEmployeeSlug, globalActiveEmployeeSlug, setActiveEmployeeGlobal, disableRuntime, DISABLE_HANDOFFS, userLockedSlug]);
  
  // currentEmployeeSlug is now defined above (before useMemo hooks that reference it)

  // Sync streaming state to global launcher for header indicator (only when runtime enabled)
  useEffect(() => {
    if (!disableRuntime && isOpen) {
      setIsWorking(isStreaming);
    } else if (!disableRuntime) {
      setIsWorking(false);
    }
  }, [isOpen, isStreaming, setIsWorking, disableRuntime]);

  // Hook: Compute normalized slug (needed for other hooks)
  const normalizedSlug = (currentEmployeeSlug?.toLowerCase().trim() || 'prime-boss') as keyof typeof EMPLOYEE_DISPLAY_CONFIG;
  
  // Hook: Compute display config (needed for other hooks)
  const displayConfig = getEmployeeDisplayConfig(normalizedSlug);
  
  // Hook: Compute chat config (needed for other hooks)
  const chatConfig = EMPLOYEE_CHAT_CONFIG[normalizedSlug as keyof typeof EMPLOYEE_CHAT_CONFIG] ?? EMPLOYEE_CHAT_CONFIG['prime-boss'];
  
  // Map page routes to employee IDs
  let employeeId = normalizedSlug;
  if (normalizedSlug === '/dashboard/smart-import-ai' || normalizedSlug === 'smart-import-ai') {
    employeeId = 'byte-docs';
  }

  const isByte = employeeId === 'byte-docs';

  useEffect(() => {
    if (!employeeId) return;
    // Keep global state aligned so send hooks don't default to prime-boss
    setActiveEmployeeGlobal?.(employeeId);
  }, [employeeId, setActiveEmployeeGlobal]);

  // DEBUG: Log the slug mapping
  log('[UnifiedAssistantChat] Slug Debug:', {
    normalizedSlug,
    employeeId,
    isByte,
    currentEmployeeSlug
  });
  
  // Hook: Check if Tag is active
  const isTag = normalizedSlug === 'tag-ai';
  
  // Hook: Byte upload hook - MUST be called unconditionally before early return
  const {
    isUploading: isByteUploading,
    progressLabel: byteProgressLabel,
    handleFilesSelected: handleByteFilesSelected,
    error: byteUploadError,
  } = useByteInlineUpload(isByte && userId ? userId : undefined);

  // Auto-send initial question if provided (only once when chat opens, only when runtime enabled)
  const initialQuestionSentRef = useRef(false);
  const initialQuestionRouteGuardRef = useRef(false);
  const initialQuestionOcrGuardRef = useRef(false);
  const didAutoSendInitialRef = useRef(false);
  const didAutoSendFinalRef = useRef(false);
  const didAutoSendInitialQuestionRef = useRef(false);
  const assistantWithoutIdWarningsRef = useRef<Set<string>>(new Set());
  const inFlightTurnRef = useRef(false);
  const streamStartedRef = useRef(false);
  const typingStallTimeoutRef = useRef<number | null>(null);
  const [handoffNoteMessage, setHandoffNoteMessage] = useState<ChatMessage | null>(null);
  const handoffConsumedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    initialQuestionRouteGuardRef.current = true;
    const timeoutId = setTimeout(() => {
      initialQuestionRouteGuardRef.current = false;
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [location.pathname]);

  useEffect(() => {
    if (!isOpen) return;
    if (!initialQuestion) return;
    if (didAutoSendInitialQuestionRef.current) return;
    if (!getUnifiedChatUserInitiatedFlag()) return;
    
    // IMPORTANT: behave like ChatGPT — never auto-send if any history exists
    if (!historyLoadCompleteRef.current) return;
    const authoritativeMessageCount = (engineReadyLatched ? messages : loadedHistoryMessages).length;
    if (authoritativeMessageCount > 0) return;
    if (didAutoSendInitialRef.current) return;
    if (
      !disableRuntime &&
      !initialQuestionSentRef.current &&
      !isStreaming &&
      !isUploadingAttachments &&
      !isByteUploading &&
      !initialQuestionRouteGuardRef.current &&
      !initialQuestionOcrGuardRef.current
    ) {
      // Small delay to ensure component is fully mounted
      didAutoSendInitialQuestionRef.current = true;
      didAutoSendInitialRef.current = true;
      setInputMessage((prev) => (prev?.trim() ? prev : initialQuestion));
      initialQuestionSentRef.current = true;
      clearInitialQuestion?.();
    }
    // Reset when chat closes
    if (!isOpen) {
      initialQuestionSentRef.current = false;
      initialQuestionOcrGuardRef.current = false;
    }
  }, [
    isOpen,
    initialQuestion,
    messages.length,
    loadedHistoryMessages.length,
    engineReadyLatched,
    isStreaming,
    sendMessage,
    disableRuntime,
    isUploadingAttachments,
    isByteUploading,
    clearInitialQuestion,
  ]);

  useEffect(() => {
    if (!isOpen) {
      didAutoSendInitialQuestionRef.current = false;
    }
  }, [isOpen]);
  
  // Hook: Post-import handoff (Tag + Crystal silent processing, Prime summary preparation)
  const {
    primeSummaryReady,
    getPrimeSummary,
    consumePrimeSummary,
  } = usePostImportHandoff(userId || undefined, { bypassQuietMode: true });
  const lastUploadFinishedAt = smartImport.lastUploadSummary?.finishedAt;
  const isRecentUpload =
    typeof lastUploadFinishedAt === 'string' &&
    Date.now() - Date.parse(lastUploadFinishedAt) < 5 * 60 * 1000;
  const recentImportId = isRecentUpload ? smartImport.lastUploadSummary?.importId : undefined;
  const summaryForByte =
    primeSummaryReady && recentImportId && recentImportId === primeSummaryReady
      ? getPrimeSummary(primeSummaryReady)
      : null;
  const fallbackSummaryImportId = isRecentUpload ? smartImport.lastUploadSummary?.importId : undefined;

  useEffect(() => {
    if (isRecentUpload) return;
    setInjectedMessages((prev) => prev.filter((msg) => !msg.meta?.isSummary));
  }, [isRecentUpload]);

  // Hook: Monitor import completion and emit BYTE_IMPORT_COMPLETED events
  // This monitors all recent imports and emits events when they complete
  useByteImportCompletion({
    userId: userId || '',
    importId: recentImportId,
  });
  
  // Hook: Unified typing controller - MUST be called unconditionally before early return
  const typingController = useUnifiedTypingController(conversationId || null, currentEmployeeSlug);
  const { isTyping, typingEmployeeSlug, beginTyping, endTyping, withTyping, isTypingFor } = typingController;
  
  // Hook: Dev-only mount/unmount logging with unique ID
  const mountIdRef = useRef<string>(`chat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
  const fallbackSummaryIdsRef = useRef<Set<string>>(new Set());
  const fallbackSummaryAttemptsRef = useRef<Map<string, number>>(new Map());
  const [fallbackSummaryTick, setFallbackSummaryTick] = useState(0);
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
      log('[MOUNT] UnifiedAssistantChat', mountInfo);
      
      // Verify single instance - check DOM for other UnifiedAssistantChat mounts
      const allChatMounts = document.querySelectorAll('[data-unified-chat-mount]');
      if (allChatMounts.length > 1) {
        logError('[UnifiedAssistantChat] ⚠️ MULTIPLE MOUNTS DETECTED:', {
          count: allChatMounts.length,
          currentMount: mountIdRef.current,
          pathname: mountInfo.pathname,
          mode: mountInfo.mode,
          renderMode: mountInfo.renderMode
        });
      }
      
      return () => {
        log('[UnifiedAssistantChat] 🔴 Unmounted', { 
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
        log('[UnifiedAssistantChat] 🚀 OPEN event', { 
          mountId: mountIdRef.current,
          employeeSlug: currentEmployeeSlug,
          conversationId,
          timestamp: new Date().toISOString()
        });
      } else if (!isOpen && openTimeRef.current) {
        // Slideout closing
        const duration = Date.now() - openTimeRef.current;
        log('[UnifiedAssistantChat] 🔒 CLOSE event', { 
          mountId: mountIdRef.current,
          duration: `${duration}ms`,
          timestamp: new Date().toISOString()
        });
        openTimeRef.current = null;
      }
      
      log('[UnifiedAssistantChat] 📊 isOpen changed', { 
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
            log('[UnifiedAssistantChat] ✅ Chat ready', { 
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
        debug('[UnifiedAssistantChat] 🎨 Render', {
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
  // NOTE: greetingCompletedRef, showGreetingTypingState, typedGreeting, previousEmployeeSlugRef, previousConversationIdRef
  // are now declared above (before useEffect that uses them)

  const getActiveScrollEl = useCallback((): HTMLElement | null => {
    if (typeof document !== 'undefined') {
      const selectorMatch = document.querySelector('[data-scroll-container="true"]') as HTMLElement | null;
      if (selectorMatch) {
        scrollContainerElementRef.current = selectorMatch;
        return selectorMatch;
      }
    }
    if (scrollElementRef.current) {
      scrollContainerElementRef.current = scrollElementRef.current;
      return scrollElementRef.current;
    }
    if (scrollContainerRef.current) {
      scrollContainerElementRef.current = scrollContainerRef.current;
      return scrollContainerRef.current;
    }
    if (scrollContainerElementRef.current) {
      return scrollContainerElementRef.current;
    }
    const end = messagesEndRef.current;
    if (!end) return null;
    let scrollContainer: HTMLElement | null = end.parentElement;
    while (scrollContainer &&
           !scrollContainer.hasAttribute('data-scroll-container') &&
           !scrollContainer.classList.contains('overflow-y-auto')) {
      scrollContainer = scrollContainer.parentElement;
    }
    if (scrollContainer) {
      scrollContainerElementRef.current = scrollContainer;
    }
    return scrollContainer;
  }, []);

  // Scroll-to-bottom helper (ChatGPT-style, uses scroll container + marker)
  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'auto') => {
    const end = messagesEndRef.current;
    const container = getActiveScrollEl();
    if (!end && !container) return;

    userScrolledUpRef.current = false;
    requestAnimationFrame(() => {
      if (container) {
        container.scrollTo({ top: container.scrollHeight, behavior });
      }
      if (end) {
        end.scrollIntoView({ behavior, block: 'end' });
      }
      setTimeout(() => {
        if (container) {
          container.scrollTo({ top: container.scrollHeight, behavior });
        }
        if (end) {
          end.scrollIntoView({ behavior, block: 'end' });
        }
        userIsNearBottomRef.current = true;
        setIsNearBottomState(true);
      }, 0);
    });
  }, [getActiveScrollEl, setIsNearBottomState]);

  useEffect(() => {
    if (!summaryForByte || !isByte) return;
    const summaryId = `byte-summary-${summaryForByte.importId}`;
    setInjectedMessages((prev) => {
      const transactionCount = smartImport.lastUploadSummary?.transactionCount;
      const header = typeof transactionCount === 'number'
        ? `I found ${transactionCount} transaction${transactionCount === 1 ? '' : 's'}.`
        : "Here's what I found:";
      const resolvedContent = summaryOverrides[summaryForByte.importId] || summaryForByte.content;
      const cleaned = prev.filter(
        (msg) =>
          !(msg.meta?.isSummaryFallback && msg.meta?.importId === summaryForByte.importId) &&
          !msg.meta?.isSummaryPending
      );
      const nextMessage = {
        id: summaryId,
        role: 'assistant' as const,
        content: `${header}\n\n${resolvedContent}`,
        createdAt: new Date().toISOString(),
        meta: {
          isSummary: true,
          importId: summaryForByte.importId,
          targetEmployeeSlug: 'byte-docs',
        },
      };
      const existingIndex = cleaned.findIndex((msg) => msg.id === summaryId);
      if (existingIndex >= 0) {
        if (cleaned[existingIndex].content === nextMessage.content) {
          return cleaned;
        }
        const updated = [...cleaned];
        updated[existingIndex] = nextMessage;
        return updated;
      }
      return [...cleaned, nextMessage];
    });
    setTimeout(() => {
      scrollToBottom('smooth');
    }, 100);
  }, [summaryForByte?.importId, summaryForByte?.content, summaryOverrides, isByte, smartImport.lastUploadSummary?.transactionCount, scrollToBottom]);

  useEffect(() => {
    if (!isByte || !summaryForByte?.importId) return;
    const importId = summaryForByte.importId;
    const content = summaryForByte.content || '';
    const isGeneric = content.includes('ready for your review') ||
      content.includes('categorized results and insights are available');
    if (!isGeneric || summaryOverrides[importId]) return;
    let cancelled = false;
    let attempts = 0;
    const poll = async () => {
      attempts += 1;
      try {
        const response = await fetch('/.netlify/functions/prime-summary', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            importId,
            docId: smartImport.lastUploadSummary?.docIds?.[0],
            userId,
          }),
        });
        if (response.ok) {
          const payload = await response.json();
          const summary = typeof payload?.summary === 'string' ? payload.summary : '';
          if (summary && !summary.includes('ready for your review')) {
            if (cancelled) return;
            setSummaryOverrides((prev) => ({ ...prev, [importId]: summary }));
            return;
          }
        }
      } catch {
        // no-op
      }
      if (!cancelled && attempts < 10) {
        setTimeout(poll, 2000);
      }
    };
    poll();
    return () => {
      cancelled = true;
    };
  }, [isByte, summaryForByte?.importId, summaryForByte?.content, summaryOverrides, userId]);

  useEffect(() => {
    if (!isByte || !isRecentUpload || summaryForByte) return;
    const importId = smartImport.lastUploadSummary?.importId || smartImport.lastUploadSummary?.id;
    const docIds = smartImport.lastUploadSummary?.docIds || [];
    if (!importId || docIds.length === 0) return;
    if (fallbackSummaryIdsRef.current.has(importId)) return;
    const attempts = fallbackSummaryAttemptsRef.current.get(importId) ?? 0;
    if (attempts >= 5) return;

    let cancelled = false;
    (async () => {
      try {
        const { getSupabase } = await import('../../lib/supabase');
        const supabase = getSupabase();
        if (!supabase) return;
        let docs: any[] | null = null;
        {
          const baseQuery = supabase
            .from('user_documents')
            .select('id, original_name, extracted_data, ocr_text, pii_types')
            .in('id', docIds);
          const { data, error } = await baseQuery;
          if (error && String(error.message || '').includes('extracted_data')) {
            const fallback = await supabase
              .from('user_documents')
              .select('id, original_name, ocr_text, pii_types')
              .in('id', docIds);
            docs = fallback.data as any[] | null;
          } else {
            docs = data as any[] | null;
          }
        }
        if (cancelled || !docs || docs.length === 0) {
          fallbackSummaryAttemptsRef.current.set(importId, attempts + 1);
          setTimeout(() => {
            setFallbackSummaryTick((tick) => tick + 1);
          }, 1500);
          return;
        }

        const docBlocks: string[] = [];
        docs.forEach((doc: any) => {
          const lines: string[] = [];
          const extracted = doc.extracted_data || null;
          if (extracted) {
            if (extracted.vendor) lines.push(`Vendor: ${extracted.vendor}`);
            if (extracted.merchant) lines.push(`Merchant: ${extracted.merchant}`);
            if (extracted.invoice_no) lines.push(`Invoice #: ${extracted.invoice_no}`);
            if (extracted.date) lines.push(`Date: ${extracted.date}`);
            if (extracted.statement_period) lines.push(`Statement period: ${extracted.statement_period}`);
            if (extracted.new_balance) lines.push(`New balance: $${extracted.new_balance}`);
            if (extracted.minimum_payment_due) lines.push(`Minimum payment due: $${extracted.minimum_payment_due}`);
            if (extracted.due_date) lines.push(`Payment due date: ${extracted.due_date}`);
            if (extracted.previous_balance) lines.push(`Previous balance: $${extracted.previous_balance}`);
            if (extracted.payments) lines.push(`Payments: -$${extracted.payments}`);
            if (extracted.transactions) lines.push(`Transactions: +$${extracted.transactions}`);
            if (extracted.interest_charged) lines.push(`Interest charged: +$${extracted.interest_charged}`);
            if (extracted.credit_limit) lines.push(`Credit limit: $${extracted.credit_limit}`);
            if (extracted.available_credit) lines.push(`Available credit: $${extracted.available_credit}`);
            if (extracted.total) lines.push(`Total: $${extracted.total}${extracted.currency ? ` ${extracted.currency}` : ''}`);
            if (Array.isArray(doc.pii_types) && doc.pii_types.length > 0) {
              lines.push(`PII redacted: ${doc.pii_types.join(', ')}`);
            }
          }
          if (lines.length === 0 && doc.ocr_text) {
            const trimmed = String(doc.ocr_text || '').trim();
            const preview = trimmed.length > 200 ? `${trimmed.slice(0, 200)}…` : trimmed;
            if (preview) {
              lines.push(`OCR: ${preview}`);
            }
          }
          if (lines.length > 0) {
            const title = doc.original_name ? `${doc.original_name}` : 'Upload';
            docBlocks.push(`${title}\n${lines.map((l) => `• ${l}`).join('\n')}`);
          }
        });

        if (docBlocks.length === 0) {
          fallbackSummaryAttemptsRef.current.set(importId, attempts + 1);
          setTimeout(() => {
            setFallbackSummaryTick((tick) => tick + 1);
          }, 1500);
          return;
        }
        const content = `I read your upload. Here’s what I found:\n\n${docBlocks.join('\n\n')}\n\nOpen Smart Categories to review.`;
        setInjectedMessages((prev) => {
          if (prev.some((msg) => msg.meta?.isSummary && msg.meta?.importId === importId)) {
            return prev;
          }
          fallbackSummaryIdsRef.current.add(importId);
          fallbackSummaryAttemptsRef.current.set(importId, 999);
          return [
            ...prev,
            {
              id: `byte-summary-doc-${importId}`,
              role: 'assistant',
              content,
              createdAt: new Date().toISOString(),
              meta: {
                isSummary: true,
                isSummaryFallback: true,
                importId,
                targetEmployeeSlug: 'byte-docs',
              },
            },
          ];
        });
        setTimeout(() => {
          scrollToBottom('smooth');
        }, 100);
      } catch {
        // no-op
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [fallbackSummaryTick, isByte, isRecentUpload, summaryForByte, smartImport.lastUploadSummary?.id, smartImport.lastUploadSummary?.importId, smartImport.lastUploadSummary?.docIds, scrollToBottom]);

  // Layout-level scroll to ensure we land at the bottom after summary updates.
  useLayoutEffect(() => {
    if (!isByte || !isOpen) return;
    if (!summaryForByte && injectedMessages.length === 0) return;
    scrollToBottom('auto');
    requestAnimationFrame(() => {
      scrollToBottom('auto');
    });
  }, [isByte, isOpen, summaryForByte?.content, summaryOverrides[summaryForByte?.importId || ''], injectedMessages.length, scrollToBottom]);

  useEffect(() => {
    if (!isByte || summaryForByte || !fallbackSummaryImportId) return;
    const fallbackId = `byte-summary-fallback-${fallbackSummaryImportId}`;
    setInjectedMessages((prev) => {
      if (prev.some((msg) => msg.id === fallbackId)) {
        return prev;
      }
      const transactionCount = smartImport.lastUploadSummary?.transactionCount;
      const header = typeof transactionCount === 'number'
        ? `I found ${transactionCount} transaction${transactionCount === 1 ? '' : 's'}.`
        : "I've finished processing your document.";
      const detail = typeof transactionCount === 'number' && transactionCount === 0
        ? "I didn't detect any transactions in this upload. If this was a statement image, try a clearer scan or a PDF export."
        : "Your import is ready for review.";
      return [
        ...prev.filter((msg) => !msg.meta?.isSummaryPending),
        {
          id: fallbackId,
          role: 'assistant',
          content: `${header}\n\n${detail}\n\nOpen Smart Categories to review.`,
          createdAt: new Date().toISOString(),
          meta: {
            isSummary: true,
            isSummaryFallback: true,
            importId: fallbackSummaryImportId,
            targetEmployeeSlug: 'byte-docs',
          },
        },
      ];
    });
    setTimeout(() => {
      scrollToBottom('smooth');
    }, 100);
  }, [fallbackSummaryImportId, summaryForByte, isByte, smartImport.lastUploadSummary?.transactionCount, scrollToBottom]);

  useEffect(() => {
    if (!isByte) return;
    const isProcessing =
      isUploadingAttachments ||
      smartImport.uploadStatus?.step === 'uploading' ||
      smartImport.uploadStatus?.step === 'processing';
    if (!isProcessing) return;
    setInjectedMessages((prev) => {
      if (prev.some((msg) => msg.meta?.isSummaryPending)) {
        return prev;
      }
      return [
        ...prev,
        {
          id: `byte-summary-pending-${Date.now()}`,
          role: 'assistant',
          content: "Reading your document now… I’ll summarize it as soon as it’s ready.",
          createdAt: new Date().toISOString(),
          meta: {
            isSummary: true,
            isSummaryPending: true,
            targetEmployeeSlug: 'byte-docs',
          },
        },
      ];
    });
    setTimeout(() => {
      scrollToBottom('smooth');
    }, 100);
  }, [isByte, isUploadingAttachments, smartImport.uploadStatus?.step, scrollToBottom]);

  // Force scroll to bottom when Byte injects summary/pending messages.
  useEffect(() => {
    if (!isByte || !isOpen) return;
    const hasInjectedSummary = injectedMessages.some(
      (msg) => msg.meta?.isSummary || msg.meta?.isSummaryPending
    );
    if (!hasInjectedSummary) return;
    const timeoutId = setTimeout(() => {
      scrollToBottom('smooth');
    }, 150);
    return () => clearTimeout(timeoutId);
  }, [isByte, isOpen, injectedMessages, scrollToBottom]);

  function isNearBottom(el: HTMLElement) {
    return (el.scrollHeight - el.scrollTop - el.clientHeight) < 120;
  }

  // CRITICAL: Track scroll position to detect if user is near bottom
  const userIsNearBottomRef = useRef(true);

  useEffect(() => {
    if (!isOpen) {
      // Clear cached scroll container when chat closes
      scrollContainerElementRef.current = null;
      return;
    }
    
    const container = getActiveScrollEl();
    if (!container) return;

    const handleScroll = () => {
      const nearBottom = isNearBottom(container);
      setIsNearBottomState(nearBottom);
      userIsNearBottomRef.current = nearBottom;
      userScrolledUpRef.current = !nearBottom;
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    // Initial check
    handleScroll();

    return () => {
      container.removeEventListener('scroll', handleScroll);
    };
  }, [getActiveScrollEl, isOpen, messages.length]);

  // CRITICAL: Auto-scroll during streaming when content updates (not just when messages.length changes)
  // Track last message content length to detect streaming updates
  // NOTE: Use 'messages' instead of 'displayMessages' here to avoid TDZ - displayMessages is computed later
  const lastMessageContentLengthRef = useRef<number>(0);
  const lastStreamingStateRef = useRef<boolean>(false);
  const lastMessagesLengthRef = useRef<number>(0);
  const scrollThrottleRef = useRef<number | null>(null);
  const userScrolledUpRef = useRef(false);
  const didInitialScrollRef = useRef(false);
  
  useEffect(() => {
    if (!isOpen) {
      didInitialScrollRef.current = false;
      return;
    }

    const container = getActiveScrollEl();
    if (!container) return;

    const hasAnyMessages = messages.length > 0 || loadedHistoryMessages.length > 0;
    const historyReady = historyLoadCompleteRef.current || !isLoadingHistory;
    if (historyReady && hasAnyMessages && !didInitialScrollRef.current) {
      didInitialScrollRef.current = true;
      scrollToBottom('auto');
      userIsNearBottomRef.current = true;
      setIsNearBottomState(true);
    }

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
    
    // Auto-scroll only if user is near bottom (ChatGPT-like).
    const shouldAutoScroll = userIsNearBottomRef.current === true || userJustSentRef.current;
    
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
  }, [messages, loadedHistoryMessages, isStreaming, scrollToBottom, getActiveScrollEl, isOpen, isLoadingHistory]);

  // No separate scrollIntoView effect — scroll is centralized in scrollToBottom()

  // Scroll to bottom when chat opens OR when history loads
  useEffect(() => {
    if (!isOpen) {
      didInitialScrollRef.current = false;
    }
  }, [isOpen]);
  
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
  

  // Sync unified chat engine's activeEmployeeSlug with global state when it changes
  // This ensures frontend handoffs work correctly
  useEffect(() => {
    // When global active employee changes (via handoff), the engine will sync via backend handoff events
    // For immediate frontend handoffs, we rely on the global state being correct
    // The actual message sending will use currentEmployeeSlug which comes from global state
    // Note: useUnifiedChatEngine (via usePrimeChat) handles employee handoffs internally
  }, [globalActiveEmployeeSlug]);

  // ====== CHAT SEND / RECEIVE ======
  
  // Handle send - use currentEmployeeSlug to ensure correct employee receives message
  // NOTE: Duplicate send prevention is handled by usePrimeChat hook (inFlightRef)
  const getAttachmentKey = useCallback((file: File) => `${file.name}-${file.size}`, []);

  const processByteUploads = useCallback(async (files: File[]) => {
    if (!files || files.length === 0) return false;
    if (!userId) {
      toast.error('Please log in to upload files');
      return false;
    }
    try {
      setIsUploadingAttachments(true);
      setUploadError(null);
      setUploadStatus('uploading');
      setShowUploadCard(true);
      await smartImport.uploadFiles(userId, files, 'chat');
      setUploadStatus('processing');
      setTimeout(() => {
        setUploadStatus(null);
        setShowUploadCard(false);
      }, 1200);
      return true;
    } catch (err: any) {
      setUploadError(err?.message || 'Upload failed');
      setUploadStatus(null);
      toast.error(err?.message || 'Upload failed');
      return false;
    } finally {
      setIsUploadingAttachments(false);
      uploadedAttachmentKeysRef.current.clear();
    }
  }, [smartImport, userId]);

  const handleAttachmentsChange = useCallback(async (files: File[]) => {
    if (!isByte || files.length === 0) return;
    const pendingFiles = files.filter((file) => !uploadedAttachmentKeysRef.current.has(getAttachmentKey(file)));
    if (pendingFiles.length === 0) return;
    const uploaded = await processByteUploads(pendingFiles);
    if (uploaded) {
      pendingFiles.forEach((file) => {
        uploadedAttachmentKeysRef.current.add(getAttachmentKey(file));
      });
    }
  }, [getAttachmentKey, isByte, processByteUploads]);

  const handleSend = async (options?: { attachments?: File[] }) => {
    const attachments = options?.attachments ?? [];
    const hasAttachments = attachments.length > 0;
    const trimmedMessage = inputMessage.trim();

    if (!trimmedMessage && !hasAttachments) return;

    if (inFlightTurnRef.current) {
      if (import.meta.env.DEV) {
        console.warn('[UnifiedAssistantChat] 🚫 Send blocked - inFlight');
      }
      return;
    }
    // Block if already streaming or loading (hook also checks this, but early return for UX)
    if (isStreaming || isUploadingAttachments) {
      if (import.meta.env.DEV) {
        console.warn('[UnifiedAssistantChat] 🚫 Send blocked - already streaming or uploading');
      }
      return;
    }
    
    if (hasAttachments) {
      if (!isByte) {
        toast.error('File uploads are only supported in Byte right now.');
        return;
      }
      const pendingFiles = attachments.filter((file) => !uploadedAttachmentKeysRef.current.has(getAttachmentKey(file)));
      if (pendingFiles.length > 0) {
        const uploaded = await processByteUploads(pendingFiles);
        if (!uploaded) return;
        pendingFiles.forEach((file) => {
          uploadedAttachmentKeysRef.current.add(getAttachmentKey(file));
        });
      }
      if (!trimmedMessage) return;
    }
    
    try {
      inFlightTurnRef.current = true;
      
      // CRITICAL: Mark that user has sent a message - this prevents greeting typing from ever showing again
      hasUserSentMessageRef.current = true;
      // Force-disable greeting typing immediately when user sends first message
      if (showGreetingTypingState) {
        setShowGreetingTypingState(false);
        endTyping(); // Stop any active greeting typing
      }
      
      // Send signature tracking removed - hook handles deduplication
      
      // Mark Prime as initialized on first message (first message wins)
      if (showPrimeOnboarding && !primeOnboardingCompleted && userId && profile?.id) {
        await markPrimeInitialized(profile.id);
        await refreshProfile();
        setPrimeOnboardingCompleted(true);
      }
      
      // Clear input immediately for better UX (don't wait for send to complete)
      setInputMessage('');
      
      // Mark that user just sent a message and scroll immediately so their bubble is fully visible
      userJustSentRef.current = true;
      // Scroll will happen automatically via the auto-scroll effect when message is added
      
      let finalMessage = trimmedMessage;
      
      // If the global active employee differs from engine's internal state,
      // we need to ensure the message goes to the correct employee
      // The unified chat engine (via usePrimeChat) handles employee switching internally
      // Backend handoff events will sync the active employee. For immediate handoffs,
      // the user will see the UI update and can send to the new employee.
      // NOTE: Hook creates placeholder BEFORE fetch, so typing indicator logic checks placeholder existence
      if (finalMessage) {
        const autoMessageParam = new URLSearchParams(location.search).get('autoMessage')?.trim();
        const shouldAutoSendFinal = Boolean(autoMessageParam && autoMessageParam === finalMessage);
        if (shouldAutoSendFinal) {
          if (didAutoSendFinalRef.current) return;
          didAutoSendFinalRef.current = true;
        }
        await sendMessage(finalMessage, { employeeSlug: currentEmployeeSlug });
      }
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
        debug('[UnifiedAssistantChat] Security message received:', { message, uploadId, timestamp });
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
    if (inFlightTurnRef.current) {
      if (import.meta.env.DEV) {
        console.warn('[UnifiedAssistantChat] 🚫 Prompt send blocked - inFlight');
      }
      return;
    }
    // Auto-send the prompt immediately for better UX
    setInputMessage('');
    userJustSentRef.current = true;
    scrollToBottom('auto');
    try {
      inFlightTurnRef.current = true;
      await sendMessage(text, { employeeSlug: currentEmployeeSlug });
      setTimeout(() => {
        loadSessions();
      }, 2000);
    } catch (err) {
      console.error('[UnifiedAssistantChat] Prompt send failed:', err);
    }
  };

  // Handle quick action click (legacy - for simple actions)
  const handleQuickAction = async (action: string) => {
    if (inFlightTurnRef.current) {
      if (import.meta.env.DEV) {
        console.warn('[UnifiedAssistantChat] 🚫 Quick action blocked - inFlight');
      }
      return;
    }
    try {
      inFlightTurnRef.current = true;
      await sendMessage(action, { employeeSlug: currentEmployeeSlug });
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
    if (import.meta.env.DEV) {
      debug('[UnifiedAssistantChat] Upload started', { fileCount: files.length });
    }
    console.debug('[UnifiedAssistantChat] Upload started', { fileCount: files.length });
    await processByteUploads(files);
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
      // QUIET MODE GATE: Skip post-import triggers if disabled
      const disabled = isPostImportTriggersDisabled();
      if (disabled) {
        // skip silently
        return;
      }
      
      log('[handleByteImportCompleted] 🎉 EVENT RECEIVED!', payload);
      initialQuestionOcrGuardRef.current = true;
      setTimeout(() => {
        initialQuestionOcrGuardRef.current = false;
      }, 2000);
      
      // Only handle if Byte is currently active
      if (!isByte || currentEmployeeSlug !== 'byte-docs') return;
      
      // Guard: Ensure we only send one message per import
      const key = `${userId}:${payload.importId}`;
      if (byteImportCloseoutSentRef.current.has(key)) {
        // Dev-only debug log
        if (import.meta.env.DEV) {
          log('[UnifiedAssistantChat] Byte closeout skipped (already sent)', { importId: payload.importId, key });
        }
        return;
      }
      byteImportCloseoutSentRef.current.add(key);

      // NOTE: Do not inject assistant closeout messages into chat history.
      if (import.meta.env.DEV) {
        log('[UnifiedAssistantChat] Byte closeout skipped (no UI injection)', { importId: payload.importId });
      }
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
        userClosedRef.current = true;
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

  const isValidHandoff = useCallback((payload?: ChatHandoffPayload | null) => {
    const note = payload?.note?.trim();
    const hasFromSlug = Boolean(payload?.fromEmployeeSlug?.trim());
    const hasFromName = Boolean(payload?.fromEmployeeName?.trim());
    return Boolean(note) && (hasFromSlug || hasFromName);
  }, []);
  const isHandoff = isValidHandoff(handoff);

  // Check if thread has any messages (greeting only shows when thread is empty)
  // CRITICAL: Use single authoritative message source (same logic as renderMessages)
  // Use latched engineReady to prevent flip-flop
  const hasAnyMessages = useMemo(() => {
    const authoritativeMessages = engineReadyLatched ? messages : loadedHistoryMessages;
    return authoritativeMessages.length > 0 || injectedMessages.length > 0;
  }, [engineReadyLatched, messages, loadedHistoryMessages, injectedMessages.length]);

  // Greeting message (UI-only) shown only on direct open (no handoff) and empty history.
  const greetingMessage: ChatMessage | null = useMemo(() => {
    if (isHandoff) return null;
    if (!isOpen) return null;
    if (isStreaming) return null;
    if (hasAnyMessages) return null;
    if (hasUserSentMessageRef.current) return null;
    const threadKey = `${currentEmployeeSlug}:${conversationId || 'default'}`;
    const shouldGreetAfterOnboarding = currentEmployeeSlug === 'prime-boss' && primeOnboardingCompleted && !hasAnyMessages;
    const shouldShowGreeting = !hasAnyMessages || shouldGreetAfterOnboarding;
    if (!shouldShowGreeting) return null;
    const resolvedName = resolveDisplayNameSync(profile, user);
    const userName = resolvedName.firstName ?? firstName ?? 'there';
    const primeMetadata = profile?.metadata && typeof profile.metadata === 'object' ? (profile.metadata as any) : null;
    const onboardingCompleted = primeState?.userProfileSummary?.onboardingCompleted;
    const isFirstRun = onboardingCompleted === false || primeMetadata?.prime_initialized !== true;
    const snapshot = primeState?.financialSnapshot;
    const formatCurrency = (amount: number) => {
      const currency = primeState?.userProfileSummary?.currency || profile?.currency || 'USD';
      try {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
      } catch {
        return `$${amount.toFixed(2)}`;
      }
    };
    let greetingText = '';
    if (currentEmployeeSlug === 'prime-boss') {
      if (isFirstRun) {
        greetingText = [
          `Hi, I'm Prime. 👋`,
          `I'm your AI financial guide inside XspensesAI.`,
          ``,
          `My job is simple:`,
          `I help you understand your money without stress, without judgment, and without complexity.`,
          ``,
          `You don't have to be an expert - I'll handle the hard parts.`,
          ``,
          `When you're ready, we can start by importing your first document, or I can show you around.`,
        ].join('\n');
      } else {
        const bullets: string[] = [];
        if (snapshot?.uncategorizedCount && snapshot.uncategorizedCount > 0) {
          bullets.push(`• ${snapshot.uncategorizedCount} transaction${snapshot.uncategorizedCount === 1 ? '' : 's'} ready for review`);
        }
        if (snapshot?.monthlySpend && snapshot.monthlySpend > 0) {
          bullets.push(`• This month's spend: ${formatCurrency(snapshot.monthlySpend)}`);
        }
        if (snapshot?.activeGoalCount !== null && snapshot?.activeGoalCount !== undefined) {
          bullets.push(`• ${snapshot.activeGoalCount} active goal${snapshot.activeGoalCount === 1 ? '' : 's'}`);
        }
        if (bullets.length === 0 && snapshot?.transactionCount) {
          bullets.push(`• ${snapshot.transactionCount} total transactions on file`);
        }
        greetingText = [
          `Welcome back, ${userName}. 👋`,
          `I've been keeping things organized while you were away.`,
          ...(bullets.length > 0 ? ['', `Here's where we left off:`, ...bullets] : ['', `I can pull a fresh snapshot whenever you're ready.`]),
          ``,
          `What would you like to focus on today - quick review, insights, or something new?`,
        ].join('\n');
      }
    } else if (currentEmployeeSlug === 'byte-docs') {
      greetingText = [
        `Hi ${userName}, I'm Byte. 📄`,
        `Upload a document and I'll extract everything automatically.`,
        `I support PDFs, images, and bank statements.`,
      ].join('\n');
    } else if (currentEmployeeSlug === 'tag-ai') {
      const uncategorizedLine = snapshot?.uncategorizedCount
        ? `You have ${snapshot.uncategorizedCount} uncategorized transaction${snapshot.uncategorizedCount === 1 ? '' : 's'} ready to clean up.`
        : null;
      greetingText = [
        `Hey ${userName} — I'll organize your transactions into the right categories so reports stay accurate.`,
        ...(uncategorizedLine ? [uncategorizedLine] : []),
        `Want me to review anything now?`,
      ].join('\n');
    } else if (currentEmployeeSlug === 'crystal-analytics') {
      const topCategory = snapshot?.topCategories?.[0];
      const topCategoryLine = topCategory
        ? `Top category right now: ${topCategory.category} (${formatCurrency(topCategory.totalAmount)}).`
        : null;
      greetingText = [
        `Ready to uncover trends in your spending, ${userName}.`,
        `I can show you patterns, forecasts, or opportunities to save.`,
        ...(topCategoryLine ? [topCategoryLine] : []),
      ].join('\n');
    } else {
      const chatConfig = EMPLOYEE_CHAT_CONFIG[currentEmployeeSlug as keyof typeof EMPLOYEE_CHAT_CONFIG];
      if (!chatConfig?.openGreeting) return null;
      greetingText = chatConfig.openGreeting.replace(/\{firstName\}/g, userName);
    }
    const stableGreetingText =
      greetingContentRef.current?.key === threadKey
        ? greetingContentRef.current.content
        : greetingText;
    return {
      id: `greeting-${threadKey}`,
      role: 'assistant',
      content: stableGreetingText,
      timestamp: new Date().toISOString(),
      meta: { isGreeting: true, hideTimestamp: true },
    };
  }, [isHandoff, isOpen, isLoadingHistory, isStreaming, hasAnyMessages, currentEmployeeSlug, resolvedThreadId, conversationId, profile, user, firstName, messages, loadedHistoryMessages, primeState, engineReadyLatched, primeOnboardingCompleted, userId]);

  useEffect(() => {
    if (!greetingMessage || !currentEmployeeSlug) return;
    greetedThisOpenRef.current = true;
    greetedThreadRef.current = `${currentEmployeeSlug}:${conversationId || 'default'}`;
  }, [greetingMessage, currentEmployeeSlug, conversationId]);

  useEffect(() => {
    if (!greetingMessage) return;
    const key = `${currentEmployeeSlug}:${conversationId || 'default'}`;
    if (!greetingContentRef.current || greetingContentRef.current.key !== key) {
      greetingContentRef.current = { key, content: greetingMessage.content };
    }
  }, [greetingMessage, currentEmployeeSlug, conversationId]);

  useEffect(() => {
    if (isOpen) {
      userClosedRef.current = false;
      return;
    }
    if (userClosedRef.current) {
      greetedThisOpenRef.current = false;
    }
  }, [isOpen]);

  const showHandoffPill = isHandoff;

  if (import.meta.env.DEV) {
    if (showHandoffPill && !isValidHandoff(handoff)) {
      console.error('[INVARIANT] Handoff pill visible without valid handoff payload', handoff);
    }
    if (isValidHandoff(handoff) && greetingMessage) {
      console.error('[INVARIANT] Greeting present while handoff is active (must be mutually exclusive).');
    }
    if (handoffNoteMessage && !isValidHandoff(handoff)) {
      console.error('[INVARIANT] Handoff note message present without valid handoff payload', {
        handoff,
        handoffNoteMessage,
      });
    }
  }
  
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
  const shouldShowWelcomeMessage = useMemo(() => false, []);
  
  // Reset welcome flag when chat closes
  useEffect(() => {
    if (!isOpen && userClosedRef.current) {
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
  // Hard-disabled: WelcomeBackOverlay is the sole source of Prime welcome.
  const welcomeBackNote: ChatMessage | null = null;

  // Calculate real messages count (user + assistant only, exclude system notes)
  const realMessagesCount = messages.filter(m => m.role === 'user' || m.role === 'assistant').length;

  // PART 5: Byte greeting removed to avoid multiple greetings

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
      if (userId && effectiveEmployeeSlug) {
        const employeeKey = resolveEmployeeKey(effectiveEmployeeSlug);
        const storedThreadId = readThreadIdFromStorage(userId, employeeKey, effectiveEmployeeSlug);
        if (storedThreadId) return storedThreadId;
      }
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
  }, [conversationId, userId, effectiveEmployeeSlug, resolveEmployeeKey, readThreadIdFromStorage]);

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
        debug('[EngineReadyLatch] Latched to true', { 
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
      debug('[EngineReadyLatch] State', { 
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
  const scopedInjectedMessages = injectedMessages.filter((msg) => {
    const target = msg.meta?.targetEmployeeSlug;
    return !target || target === currentEmployeeSlug;
  });

  const allMessages = [
    ...(handoffNoteMessage ? [handoffNoteMessage] : []), // Handoff note (explicit, first assistant message)
    ...(custodianHandoffNote ? [custodianHandoffNote] : []), // Custodian → Prime handoff note (Prime-only, session-only)
    ...(welcomeBackNote ? [welcomeBackNote] : []), // PART 4: Welcome back note (Prime-only)
    ...(welcomeMessage ? [welcomeMessage] : []), // Welcome back message (UI-only, instant) - DISABLED for Prime
    ...(greetingMessage ? [greetingMessage] : []), // Greeting (UI-only, no typing)
    ...authoritativeMessages, // CRITICAL: Single authoritative source - engine.messages OR loadedHistoryMessages (never both)
    ...scopedInjectedMessages // Include injected messages (Byte closeout, Prime recap) - these are UI-only additions
  ];
  const enforceMessageIdentity = (msg: (typeof allMessages)[0]) => {
    if (!msg) return false;
    const hasMessageId = typeof msg.id === 'string' && msg.id.trim().length > 0;
    const hasClientMessageId = Boolean(msg.meta?.client_message_id);
    if (msg.role === 'assistant' && !hasMessageId) {
      const key = `${msg.role}:${normalizeText(msg.content || '')}`.slice(0, 120);
      if (!assistantWithoutIdWarningsRef.current.has(key)) {
        assistantWithoutIdWarningsRef.current.add(key);
        warn('[UnifiedAssistantChat] Dropped assistant message without messageId', {
          role: msg.role,
          contentPreview: (msg.content || '').slice(0, 120),
          meta: msg.meta,
        });
      }
      return false;
    }
    if (msg.role === 'user' && !hasMessageId && !hasClientMessageId) {
      // Allow draft/system-less user messages to render, but they will not dedupe by id.
      return true;
    }
    return true;
  };
  const filteredMessages = allMessages.filter(enforceMessageIdentity);
  const getMessageSortTime = (msg: (typeof filteredMessages)[0]) => {
    if (!msg) return 0;
    if (msg.createdAt) {
      const ts = Date.parse(msg.createdAt);
      if (!Number.isNaN(ts)) return ts;
    }
    const timestampValue = (msg as { timestamp?: string | number }).timestamp;
    if (timestampValue) {
      const ts = typeof timestampValue === 'string' ? Date.parse(timestampValue) : new Date(timestampValue).getTime();
      if (!Number.isNaN(ts)) return ts;
    }
    return 0;
  };
  const orderedMessages = [...filteredMessages].sort((a, b) => {
    const aTime = getMessageSortTime(a);
    const bTime = getMessageSortTime(b);
    if (aTime && bTime) {
      return aTime - bTime;
    }
    if (aTime && !bTime) return 1;
    if (!aTime && bTime) return -1;
    return 0;
  });
  
  // CANONICAL DEDUPE: Stable key priority (id > client_message_id > hardKey)
  // This ensures idempotent rendering: each user message and each assistant reply appears exactly once
  const getStableKey = (msg: typeof filteredMessages[0]): string | null => {
    if (!msg) return null;
    
    if (msg.role === 'assistant') {
      return msg.id ? `id:${msg.id}` : null;
    }
    
    // Priority 1: Exact message.id match (most reliable)
    if (msg.id) {
      return `id:${msg.id}`;
    }
    
    // Priority 2: client_message_id from metadata (for optimistic messages)
    if (msg.role === 'user' && msg.meta?.client_message_id) {
      return `client:${msg.meta.client_message_id}`;
    }
    return null;
  };
  
  const recentMessages = orderedMessages.slice(-80); // Last 80 messages for window check
  const dedupeMap = new Map<string, typeof filteredMessages[0]>();
  const contentKeyMap = new Map<string, typeof filteredMessages[0]>();
  const dedupeStats = {
    byId: 0,
    byClientId: 0,
    byHardKey: 0,
    dropped: 0,
  };
  
  orderedMessages.forEach(msg => {
    if (!msg) return;
    
    // Content-level dedupe to prevent double-render of identical messages
    const contentKey = `${msg.role}|${normalizeText(msg.content || '')}`;
    const existingContent = contentKeyMap.get(contentKey);
    if (existingContent && isWithinDedupeWindow(existingContent, msg)) {
      dedupeStats.dropped++;
      return;
    }
    contentKeyMap.set(contentKey, msg);
    
    const stableKey = getStableKey(msg);
    if (!stableKey) {
      // No stable key - keep non-assistant message (system messages, etc.)
      if (msg.role !== 'assistant') {
        dedupeMap.set(`fallback-${Date.now()}-${Math.random()}`, msg);
      } else {
        dedupeStats.dropped++;
      }
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
          debug(`[UnifiedAssistantChat] ✅ Dropped optimistic message (client_message_id: ${msg.meta.client_message_id}) - DB echo matched`);
        }
      } else {
        // Outside safe window - keep both (legit repeat)
        // Use a variant key to allow both
        dedupeMap.set(`${stableKey}-variant-${Date.now()}`, msg);
      }
    }
  });
  
  const displayMessages = Array.from(dedupeMap.values());
  const normalizedMessageText = (value: string | undefined) => normalizeText(value || '');
  const getMessageTimeMs = (msg: (typeof displayMessages)[0]) => {
    if (!msg) return 0;
    if (msg.createdAt) {
      const ts = Date.parse(msg.createdAt);
      if (!Number.isNaN(ts)) return ts;
    }
    if (msg.timestamp) {
      const ts = typeof msg.timestamp === 'string' ? Date.parse(msg.timestamp) : new Date(msg.timestamp).getTime();
      if (!Number.isNaN(ts)) return ts;
    }
    return 0;
  };
  // Post-dedupe guard: prevent brief double-render of identical assistant responses.
  const renderMessages = displayMessages.filter((msg) => Boolean(msg));
  // Post-dedupe guard: remove any overlapping duplicate bubbles by content.
  const contentKeyToMessage = new Map<string, (typeof renderMessages)[0]>();
  const shouldPrefer = (current: (typeof renderMessages)[0], candidate: (typeof renderMessages)[0]) => {
    const currentStreaming = current?.meta?.is_streaming === true;
    const candidateStreaming = candidate?.meta?.is_streaming === true;
    if (currentStreaming !== candidateStreaming) {
      return !candidateStreaming; // Prefer non-streaming
    }
    const currentLen = (current?.content || '').length;
    const candidateLen = (candidate?.content || '').length;
    if (currentLen !== candidateLen) {
      return candidateLen > currentLen; // Prefer longer content
    }
    const currentTime = getMessageTimeMs(current);
    const candidateTime = getMessageTimeMs(candidate);
    if (currentTime !== candidateTime) {
      return candidateTime > currentTime; // Prefer newer
    }
    return false;
  };
  renderMessages.forEach((msg) => {
    if (!msg) return;
    const text = normalizedMessageText(msg.content);
    if (!text) return;
    const contentKey = `${msg.role}|${text}`;
    const existing = contentKeyToMessage.get(contentKey);
    if (!existing) {
      contentKeyToMessage.set(contentKey, msg);
      return;
    }
    if (shouldPrefer(existing, msg)) {
      contentKeyToMessage.set(contentKey, msg);
    }
  });
  const contentDedupedMessages = renderMessages.filter((msg) => {
    if (!msg) return false;
    const text = normalizedMessageText(msg.content);
    if (!text) return true;
    const contentKey = `${msg.role}|${text}`;
    return contentKeyToMessage.get(contentKey)?.id === msg.id;
  });
  // Prefix dedupe: collapse partial streaming echoes vs final response.
  const streamingCollapsedMessages: typeof contentDedupedMessages = [];
  let lastAssistantIndex = -1;
  contentDedupedMessages.forEach((msg) => {
    if (!msg) return;
    if (msg.role !== 'assistant') {
      streamingCollapsedMessages.push(msg);
      return;
    }
    const lastAssistant = lastAssistantIndex >= 0 ? streamingCollapsedMessages[lastAssistantIndex] : null;
    if (lastAssistant) {
      const lastTime = getMessageTimeMs(lastAssistant);
      const currentTime = getMessageTimeMs(msg);
      const withinWindow = !lastTime || !currentTime ? true : Math.abs(currentTime - lastTime) < 5000;
      const lastText = normalizedMessageText(lastAssistant.content);
      const currentText = normalizedMessageText(msg.content);
      const isPrefix = Boolean(lastText && currentText && (currentText.startsWith(lastText) || lastText.startsWith(currentText)));
      if (withinWindow && isPrefix) {
        // Prefer longer, non-streaming, newer message.
        const preferCandidate = shouldPrefer(lastAssistant, msg);
        streamingCollapsedMessages[lastAssistantIndex] = preferCandidate ? msg : lastAssistant;
        return;
      }
    }
    streamingCollapsedMessages.push(msg);
    lastAssistantIndex = streamingCollapsedMessages.length - 1;
  });
  // Burst dedupe: collapse rapid assistant duplicates in the same burst.
  const burstDedupedMessages: typeof streamingCollapsedMessages = [];
  streamingCollapsedMessages.forEach((msg) => {
    if (!msg) return;
    const last = burstDedupedMessages[burstDedupedMessages.length - 1];
    if (msg.role === 'assistant' && last?.role === 'assistant') {
      const lastTime = getMessageTimeMs(last);
      const currentTime = getMessageTimeMs(msg);
      const withinBurst = !lastTime || !currentTime ? true : Math.abs(currentTime - lastTime) < 1500;
      if (withinBurst) {
        // Replace previous assistant in the burst with the newer one.
        burstDedupedMessages[burstDedupedMessages.length - 1] = msg;
        return;
      }
    }
    burstDedupedMessages.push(msg);
  });
  
  // Dev log: dedupe stats
  if (import.meta.env.DEV && (dedupeStats.dropped > 0 || allMessages.length !== burstDedupedMessages.length)) {
    debug(`[UnifiedAssistantChat] 🔍 Dedupe stats:`, {
      totalBefore: allMessages.length,
      totalAfter: burstDedupedMessages.length,
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
      debug(`[UnifiedAssistantChat] Dedupe stats:`, {
        totalMessages: allMessages.length,
        uniqueHardKeys: dedupeMap.size,
        duplicatesRemoved: allMessages.length - dedupeMap.size,
        topDuplicates: duplicates.map(([hk, count]) => ({ hardKey: hk.substring(0, 60), count })),
      });
    }
  }
  
  // Dev log: Confirm chat render reached after dedupe merge
  if (import.meta.env.DEV && burstDedupedMessages.length > 0) {
    debug(`[UnifiedAssistantChat] ✅ Chat render complete after dedupe (${burstDedupedMessages.length} messages)`);
  }
  
  // Get the last message ID for streaming detection
  const lastMessageId = burstDedupedMessages.length > 0 ? burstDedupedMessages[burstDedupedMessages.length - 1]?.id : null;

  // Track last streamed message id (do not auto-mark typed)
  useEffect(() => {
    if (isStreaming && lastMessageId) {
      lastStreamedMessageIdRef.current = lastMessageId;
      return;
    }
    if (!isStreaming && lastStreamedMessageIdRef.current) {
      lastStreamedMessageIdRef.current = null;
    }
  }, [isStreaming, lastMessageId]);
  
  const handoffFromName = handoff?.fromEmployeeName?.trim()
    || (handoff?.fromEmployeeSlug ? getEmployeeDisplay(handoff.fromEmployeeSlug).name : 'Unknown');
  
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

  useEffect(() => {
    if (!isOpen) {
      setHandoffNoteMessage(null);
      return;
    }
    if (!isValidHandoff(handoff)) return;
    const note = handoff?.note?.trim();
    if (!note) return;
    const threadKey = `${currentEmployeeSlug}:${conversationId || 'default'}`;
    const handoffKey = `${threadKey}:${note}`;
    if (handoffConsumedRef.current.has(handoffKey)) return;

    const stableId = `handoff-${threadKey}`;
    setHandoffNoteMessage({
      id: stableId,
      role: 'assistant',
      content: note,
      timestamp: new Date().toISOString(),
      meta: {
        isHandoff: true,
        hideTimestamp: true,
        fromEmployeeSlug: handoff?.fromEmployeeSlug,
        fromEmployeeName: handoff?.fromEmployeeName,
      },
    });
    handoffConsumedRef.current.add(handoffKey);
    clearHandoff?.();
  }, [isOpen, isValidHandoff, handoff, currentEmployeeSlug, conversationId, clearHandoff]);

  // Greeting injection disabled for handoff; greeting shown only when no handoff exists.
  useEffect(() => {
    if (!isOpen && !userClosedRef.current) return;
    setShowGreetingTypingState(false);
    setTypedGreeting('');
    greetingCompletedRef.current = false;
  }, [isOpen, currentEmployeeSlug, conversationId, isHandoff]);
  
  // Reset greeting when chat closes or employee/conversation changes (must be called before early return)
  useEffect(() => {
    const threadKey = `${currentEmployeeSlug}:${conversationId || 'default'}`;
    if ((!isOpen && userClosedRef.current) || currentEmployeeSlug !== previousEmployeeSlugRef.current || conversationId !== previousConversationIdRef.current) {
      setShowGreetingTypingState(false);
      setTypedGreeting('');
      endTyping(); // Use unified controller
      greetingCompletedRef.current = false;
      greetingContentRef.current = null;
      // Only reset thread greeting and user message flag if employee or conversation actually changed (not just on close)
      if (currentEmployeeSlug !== previousEmployeeSlugRef.current || conversationId !== previousConversationIdRef.current) {
        greetedThisOpenRef.current = false; // Allow greeting for new employee/thread
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

  // Check if there's a streaming assistant bubble (placeholder)
  // CRITICAL: Use single authoritative message source (same logic as renderMessages)
  // Use latched engineReady to prevent flip-flop
  const hasStreamingAssistantBubble = useMemo(() => {
    const authoritativeMessages = engineReadyLatched ? messages : loadedHistoryMessages;
    return authoritativeMessages.some(
      (m) => m.role === 'assistant' && m.meta?.is_streaming === true
    );
  }, [engineReadyLatched, messages, loadedHistoryMessages]);

  // CRITICAL: Prevent double typing - ensure mutual exclusion
  // Greeting typing is ONLY allowed when: no assistant messages AND not streaming AND no in-flight turn
  const showGreetingTyping = useMemo(() => {
    return (
      false &&
      !isStreaming &&
      !inFlightTurnRef.current &&
      !hasStreamingAssistantBubble
    );
  }, [isStreaming, hasStreamingAssistantBubble]);

  // Normal typing (streaming/loading) is ONLY allowed when greeting typing is NOT active
  // CRITICAL: Hide typing indicator if streaming placeholder already exists (prevents double bubbles)
  // CRITICAL: Only show typing when isStreaming is true AND no placeholder exists
  const showNormalTyping = useMemo(() => {
    // Only show typing indicator if:
    // 1. Actually streaming (isStreaming === true)
    // 2. No greeting typing active
    // 3. No streaming placeholder bubble exists
    return (
      isStreaming &&
      inFlightTurnRef.current &&
      !showGreetingTyping &&
      !hasStreamingAssistantBubble
    );
  }, [isStreaming, hasStreamingAssistantBubble]);

  // DEV ASSERTION: Prevent double typing visuals and double avatars
  useEffect(() => {
    if (!import.meta.env.DEV || !chatReady) return;
    
    if (showGreetingTyping && showNormalTyping) {
      console.error('[UnifiedAssistantChat] ⚠️ DOUBLE TYPING DETECTED', {
        showGreetingTyping,
        showNormalTyping,
        isStreaming,
        inFlight: inFlightTurnRef.current,
        hasStreamingAssistantBubble,
        currentEmployeeSlug,
      });
    }
    
    // Check for multiple typing indicators in DOM
    const typingIndicators = document.querySelectorAll('[data-typing-indicator="true"], [class*="TypingIndicator"]');
    if (typingIndicators.length > 1) {
      console.warn('[UnifiedAssistantChat] ⚠️ Multiple typing indicators found in DOM:', typingIndicators.length);
    }
  }, [chatReady, showGreetingTyping, showNormalTyping, isStreaming, currentEmployeeSlug, hasStreamingAssistantBubble]);
  
  // End typing when streaming starts (response arrives)
  useEffect(() => {
    if (isStreaming && isTyping) {
      endTyping();
    }
  }, [isStreaming, isTyping, endTyping]);

  useEffect(() => {
    if (isStreaming) {
      streamStartedRef.current = true;
      if (typingStallTimeoutRef.current !== null) {
        clearTimeout(typingStallTimeoutRef.current);
        typingStallTimeoutRef.current = null;
      }
      return;
    }
    if (streamStartedRef.current) {
      inFlightTurnRef.current = false;
      streamStartedRef.current = false;
    }
  }, [isStreaming]);

  useEffect(() => {
    if (!inFlightTurnRef.current) return;
    if (isStreaming) return;
    if (typingStallTimeoutRef.current !== null) return;

    typingStallTimeoutRef.current = window.setTimeout(() => {
      if (inFlightTurnRef.current && !isStreaming) {
        cancelStream();
        inFlightTurnRef.current = false;
        streamStartedRef.current = false;
        toast.error('No response yet. Please try again.');
      }
      typingStallTimeoutRef.current = null;
    }, 10000);
  }, [isStreaming, cancelStream]);

  useEffect(() => {
    inFlightTurnRef.current = false;
    streamStartedRef.current = false;
    if (typingStallTimeoutRef.current !== null) {
      clearTimeout(typingStallTimeoutRef.current);
      typingStallTimeoutRef.current = null;
    }
  }, [currentEmployeeSlug, isOpen]);

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
    }, 420); // Wait for slide-out animation (matches PrimeSlideoutShell animation duration)
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
  const shouldMount = canMount || hasEverMountedRef.current || forceOpen || hasChatUserInitiated() || isOpen;
  
  // Track mount state (persists across route changes)
  useEffect(() => {
    if (canMount) {
      hasEverMountedRef.current = true;
    }
  }, [canMount]);
  
  // Hook: Derive onboarding blocked state (for CSS hiding) - MUST be called before early return
  // Use CSS hiding instead of unmounting to prevent remounts during navigation
  const onboardingBlocked = useMemo(() => {
    if (isOpen) return false;
    // Check if onboarding is not completed
    if (!onboardingCompleted && !forceOpen && !hasChatUserInitiated()) {
      return true;
    }
    // Otherwise, onboarding is not blocked
    return false;
  }, [onboardingCompleted, forceOpen, isOpen]);
  
  // Hook: Debug logging - Log mount decision once when conditions change
  useEffect(() => {
    if (import.meta.env.DEV && shouldMount && canMount) {
      debug('[UnifiedAssistantChat] ✅ Chat mount allowed', {
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

  // Guardrails health check hook (moved up so it's available for statusBadge)
  // Throttle guardrails health polling during streaming to reduce load
  const { health: guardrailsHealth, isLoading: guardrailsHealthLoading } = useGuardrailsHealth(isOpen, 30000, isStreaming);

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
  
  // TASK 3: Never return null - use CSS to hide instead of conditional rendering
  // For slideout/overlay mode, hide with CSS when closed (prevents remounting)
  // CRITICAL: Include shouldMount check here to hide when not ready (prevents hook count changes)
  // CRITICAL: Add data attribute to track mounts for duplicate detection
  const shouldHideSlideout = mode !== 'inline' && !isOpen;
  const shouldHideOnboarding = onboardingBlocked || !shouldMount; // Hide if not ready to mount
  const shouldHide = shouldHideSlideout || shouldHideOnboarding;

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
  const byteUploadRegion = null;

  // BYTE QUIET HINT TEXT - Subtle one-liner below upload (no duplicate upload actions)
  // Note: Removed welcomeRegion and universalGreetingRegion - greeting is now a message row
  const byteHintBar = isByte && !hasAnyMessages && !isStreaming ? (
    <div className="px-4 pt-1 pb-2 shrink-0">
      <p className="text-[10px] text-slate-500 text-center">
        PDF, CSV, JPG/PNG • Max 25MB
      </p>
    </div>
  ) : null;

  // COMBINED REGION - ByteUploadPanel + Byte hint bar only (no welcome/greeting regions - they're now messages)
  const combinedWelcomeRegion = byteHintBar;

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
        onAttachmentsChange={isByte ? handleAttachmentsChange : undefined}
        placeholder={`Ask ${displayConfig.chatTitle.split('—')[0].trim()} anything...`}
        isStreaming={isStreaming}
        disabled={isUploadingAttachments || isStreaming}
        sendButtonGradient={sendButtonGradient}
        sendButtonGlow={sendButtonGlow}
        guardrailsStatus={isUploadingAttachments ? 'Uploading attachments...' : uploadError || guardrailsStatusText}
        guardrailsLastChecked={guardrailsLastChecked || undefined}
        showPlusIcon={isByte}
        showAttachmentChips={!isByte}
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

                {/* Byte inline upload (inline mode only) */}
                {isByte && mode === 'inline' && (
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
                {showHandoffPill && (
                  <div className="flex items-center justify-start px-4 pb-2">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-900/30 border border-purple-500/40 text-xs text-purple-300">
                      <ArrowRight className="w-3 h-3" />
                      <span className="font-medium">Handoff from {handoffFromName}</span>
                    </div>
                  </div>
                )}

                {/* STEP 5: Summary Ready Strip - Prime only */}
                {!isByte && primeSummaryReady && !injectedMessages.some((msg) => msg.meta?.isSummary && msg.meta?.importId === primeSummaryReady) && (
                  <div className="px-4 pb-2">
                    <PrimeSummaryReadyStrip
                      summaryText={(getPrimeSummary(primeSummaryReady)?.content || 'Your categorized results and insights are available.').trim()}
                      onApprove={async () => {
                        // STEP 6: Controlled handoff to Smart Categories
                        const summary = getPrimeSummary(primeSummaryReady);
                        if (!summary) {
                          if (import.meta.env.DEV) {
                            debug('[UnifiedAssistantChat] Prime recap skipped (no summary)', { importId: primeSummaryReady });
                          }
                          return;
                        }

                        // Guard: Check if already consumed (prevents double-click, refresh duplicates)
                        if (summary.consumed) {
                          if (import.meta.env.DEV) {
                            debug('[UnifiedAssistantChat] Prime recap skipped (already consumed)', { importId: primeSummaryReady });
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
                            debug('[UnifiedAssistantChat] Prime recap skipped (already injected)', { importId: primeSummaryReady, stableRecapId });
                          }
                          return;
                        }

                        // Mark as consumed immediately (before async operations) to prevent double-click
                        consumePrimeSummary(primeSummaryReady);

                        // Switch active employee to Tag (Smart Categories)
                        setActiveEmployeeSlugOverride('tag-ai');
                        setActiveEmployeeGlobal('tag-ai');

                        // Navigate to Smart Categories page
                        setTimeout(() => {
                          navigate('/dashboard/smart-categories');
                        }, 120);

                        // Do not inject recap messages into chat history.
                        if (import.meta.env.DEV) {
                          debug('[UnifiedAssistantChat] Prime recap skipped (no UI injection)', { importId: primeSummaryReady, stableRecapId });
                        }
                      }}
                      onDismiss={() => {
                        consumePrimeSummary(primeSummaryReady);
                      }}
                    />
                  </div>
                )}

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
          transition: 'opacity 0.45s ease',
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
            transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.45, ease: 'easeOut' }}
            className={`absolute inset-0 ${showPrimeOnboarding && !primeOnboardingCompleted ? 'bg-black/80 backdrop-blur-xl' : 'bg-black/50 backdrop-blur-sm'}`}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              userClosedRef.current = true;
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
                userClosedRef.current = true;
                onClose?.();
              }}
              showGuardrailsBanner={false}
              welcomeRegion={combinedWelcomeRegion}
              footer={inputFooter}
            >
              {/* MESSAGES AREA - Message list container is the scroll owner */}
              {/* CRITICAL: This wrapper provides padding and flex structure - must have flex flex-col h-full min-h-0 */}
              {/* The message list container inside will be the actual scroll owner with capture handlers */}
                  <div 
                    className="relative px-4 pt-4 pb-4 min-w-0 flex flex-col h-full min-h-0 overflow-hidden" 
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
                    className="flex-1 min-h-0 h-full max-h-full overflow-y-auto hide-scrollbar scrollbar-hide overscroll-contain pointer-events-auto"
                    data-scroll-container="true"
                    style={{ WebkitOverflowScrolling: 'touch', paddingBottom: 96 }}
                    onWheel={(e) => {
                      // Keep wheel events scoped to the chat container.
                      e.stopPropagation();
                    }}
                    onTouchMoveCapture={(e) => {
                      // Stop propagation to prevent DashboardLayout from capturing touch events
                      e.stopPropagation();
                    }}
                  >
                    {/* Messages list wrapper with spacing */}
                    <div className="w-full max-w-full mx-0 min-w-0 space-y-3">
                      {/* Byte upload panel lives in the scroll area (ChatGPT-style) */}
                      {isByte && (
                        <div className="shrink-0">
                          <ByteUploadPanel
                            onUploadCompleted={() => {
                              // Optional: could trigger a refresh or show a toast
                            }}
                            compact={true}
                            onDragStateChange={(dragging) => setIsDraggingOverChat(dragging)}
                            smartImport={smartImport}
                          />
                        </div>
                      )}
                      {/* Status indicator - shown when processing (non-Byte) */}
                          {!isByte && uploadStatus && (
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
                      {showHandoffPill && (
                        <div className="flex items-center justify-start px-4 pb-2">
                          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-900/30 border border-purple-500/40 text-xs text-purple-300">
                            <ArrowRight className="w-3 h-3" />
                            <span className="font-medium">Handoff from {handoffFromName}</span>
                          </div>
                        </div>
                      )}

                      {/* Messages list - Hide greeting when showing Prime onboarding */}
                      {burstDedupedMessages.filter(m => !(showPrimeOnboarding && !primeOnboardingCompleted && m.id === 'greeting-message')).map((message) => {
                        const isGreetingMessage = message.id === 'greeting-message' || message.id?.startsWith('prime-greeting-');
                        // Detect handoff messages
                        const isHandoffMessage = message.role === 'assistant' && message.meta?.isHandoff === true;
                        const metaAny = message.meta as any;
                        
                        // When greeting is typing, TypingIndicatorRow renders its own avatar - don't render message row avatar
                        const isGreetingTyping = chatReady && isGreetingMessage && isTypingFor(currentEmployeeSlug);
                        
                        // Prime greeting card disabled to keep chats locked down
                        const isPrimeGreetingCard = false;
                        const primeGreetingSafe = primeGreetingData as PrimeGreetingData;
                        
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
                                    greeting={primeGreetingSafe}
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
                                {/* CRITICAL: Use showGreetingTyping to prevent double typing */}
                                {showGreetingTyping && inFlightTurnRef.current && showTypingIndicator && renderMode === 'slideout' ? (
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
                                      <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-slate-700 overflow-hidden">
                                        {userAvatarUrl ? (
                                          <img src={userAvatarUrl} alt="Profile" className="w-full h-full object-cover" />
                                        ) : (
                                          <span className="text-xs font-semibold text-slate-100">
                                            {avatarInitials}
                                          </span>
                                        )}
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
                                          message.meta?.is_streaming === true && isStreaming && message.content.trim() === '' ? (
                                            <div className="flex items-center gap-1 py-1">
                                              <span className="w-2 h-2 bg-slate-400 rounded-full animate-pulse" style={{ animationDelay: '0ms' }} />
                                              <span className="w-2 h-2 bg-slate-400 rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
                                              <span className="w-2 h-2 bg-slate-400 rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
                                            </div>
                                          ) : message.content.trim() === '' && !isStreaming ? (
                                            <span className="whitespace-pre-wrap break-words text-slate-300">
                                              Sorry — no response was returned. Please try again.
                                            </span>
                                          ) : (
                                            <TypingMessage
                                              content={message.content}
                                              messageId={message.id}
                                              isStreaming={isStreaming && message.id === lastMessageId}
                                              isTyped={typedMessageIdsRef.current.has(message.id)}
                                              onTyped={(id) => {
                                                typedMessageIdsRef.current.add(id);
                                              }}
                                              charDelay={isGreetingMessage ? 20 : 12} // Faster for responses, still premium for greeting
                                              maxDuration={isGreetingMessage ? 6000 : 2800} // Shorter cap for snappier replies
                                            />
                                          )
                                        ) : (
                                          <span className="whitespace-pre-wrap break-words">{message.content}</span>
                                        )}
                                      </div>
                                      {isByte && metaAny?.isSummary && metaAny?.importId && (
                                        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                                          {categorizeStatusByImportId[metaAny.importId] === 'done' ? (
                                            <span className="text-emerald-300">Categorization started.</span>
                                          ) : categorizeStatusByImportId[metaAny.importId] === 'error' ? (
                                            <span className="text-rose-300">Couldn’t start categorization. Try again.</span>
                                          ) : (
                                            <>
                                              <button
                                                type="button"
                                                className="px-3 py-1.5 rounded-md bg-emerald-600/80 hover:bg-emerald-600 text-white transition-colors"
                                                onClick={async () => {
                                                  const importId = metaAny?.importId as string;
                                                  if (!importId) return;
                                                  setCategorizeStatusByImportId((prev) => ({ ...prev, [importId]: 'pending' }));
                                                  try {
                                                    const res = await fetch('/.netlify/functions/categorize-transactions', {
                                                      method: 'POST',
                                                      headers: { 'Content-Type': 'application/json' },
                                                      body: JSON.stringify({ importId }),
                                                    });
                                                    if (!res.ok) {
                                                      throw new Error('categorize failed');
                                                    }
                                                    setCategorizeStatusByImportId((prev) => ({ ...prev, [importId]: 'done' }));
                                                  } catch {
                                                    setCategorizeStatusByImportId((prev) => ({ ...prev, [importId]: 'error' }));
                                                  }
                                                }}
                                                disabled={categorizeStatusByImportId[metaAny.importId] === 'pending'}
                                              >
                                                {categorizeStatusByImportId[metaAny.importId] === 'pending'
                                                  ? 'Starting…'
                                                  : 'Approve categorization'}
                                              </button>
                                              <span className="text-slate-400">Approval required to run Tag auto-categorize.</span>
                                            </>
                                          )}
                                        </div>
                                      )}
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
                       burstDedupedMessages.length === 0 && 
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
                       burstDedupedMessages.length === 0 &&
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
