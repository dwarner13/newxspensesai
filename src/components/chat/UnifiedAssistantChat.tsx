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
import { Loader2, Send, User, ArrowRight, X, Upload, TrendingUp, MessageCircle, UploadCloud, Maximize2, Minimize2 } from 'lucide-react';
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
// Reserved (post-MVP): structured Prime greeting card system consolidation.
// Keep import for now; do not activate in MVP path.
import { PrimeGreetingCard } from './PrimeGreetingCard';
import { PrimeQuickActions } from './PrimeQuickActions';
import { TypingMessage, FormattedMessageText } from './TypingMessage';
import type { ChatMessage } from '../../hooks/usePrimeChat';
import { onBus, emitBus } from '../../lib/bus';
import { usePostImportHandoff } from '../../hooks/usePostImportHandoff';
import { PrimeSummaryReadyStrip } from './PrimeSummaryReadyStrip';
import { useByteImportCompletion } from '../../hooks/useByteImportCompletion';
import { log, debug, warn, error as logError } from '../../lib/logger';
import { isPostImportTriggersDisabled, isPrimeUploadNarrationEnabled } from '../../lib/featureFlags';
import {
  buildProgressStagesFromTruth,
  buildUnifiedRecapFromTruth,
  getUploadActorLabels,
  shouldShowEmployeeNames,
} from './upload/progressTruth';
import type { ChatHandoffPayload } from '../../types/chatHandoff';

// Quick prompts are now defined in EMPLOYEE_DISPLAY_CONFIG
// Access via: displayConfig.chatQuickPrompts
// Reserved (post-MVP): keep usePrimeAutoGreet detached from this runtime.
const MAX_CHAT_UPLOAD_FILES = 5;
const PRIME_CHAT_WIDE_STORAGE_KEY = 'xspenses:prime_chat_wide';
const PRIME_UPLOAD_NARRATION_STARTED_PREFIX = 'xspenses:prime_upload_narration_started:';
const PRIME_UPLOAD_ACTIVE_BATCH_PREFIX = 'xspenses:prime_upload_active_batch:';
const PRIME_UPLOAD_CLOSED_BATCHES_PREFIX = 'xspenses:prime_upload_closed_batches:';
const SHOW_EMPLOYEE_NAMES_IN_UPLOAD = shouldShowEmployeeNames();
const PRIME_MINIMAL_UPLOAD_CHAT = true;

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

  /** Optional controlled expanded state for slideout width */
  isExpanded?: boolean;

  /** Optional expanded state change callback */
  onExpandedChange?: (expanded: boolean) => void;

  /** Optional viewport inset from left (for fixed sidebar layouts) */
  viewportInsetLeftPx?: number;

  /** Optional viewport inset from right (for rail/padding reservation) */
  viewportInsetRightPx?: number;

  /** Horizontal placement mode for slideout shell */
  panelPlacement?: 'right' | 'center';
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
  isExpanded: controlledExpanded,
  onExpandedChange,
  viewportInsetLeftPx = 0,
  viewportInsetRightPx = 0,
  panelPlacement = 'right',
}: UnifiedAssistantChatProps) {
  
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
  const messageListContentRef = useRef<HTMLDivElement | null>(null); // Inner content that grows during typing/markdown layout
  const inputFooterRef = useRef<HTMLDivElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const uploadedAttachmentKeysRef = useRef<Set<string>>(new Set());
  
  // CRITICAL: Track if user is near bottom for auto-scroll during streaming
  const [isNearBottomState, setIsNearBottomState] = useState(true);
  const [chatBottomPaddingPx, setChatBottomPaddingPx] = useState(96);
  const scrollContainerElementRef = useRef<HTMLElement | null>(null); // Actual scroll container (found via DOM traversal)
  
  // Local state for UI-only injected messages
  const [injectedMessages, setInjectedMessages] = useState<ChatMessage[]>([]);
  const [summaryOverrides, setSummaryOverrides] = useState<Record<string, string>>({});
  const [categorizeStatusByImportId, setCategorizeStatusByImportId] = useState<Record<string, 'idle' | 'pending' | 'done' | 'error'>>({});
  const userJustSentRef = useRef(false);
  const autoPinToBottomRef = useRef(true);
  const forceAutoPinUntilRef = useRef(0);
  const scrollDebugEnabled = String(import.meta.env.VITE_LOG_LEVEL || '').toLowerCase() === 'debug';
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const isPrimeChatRevampEnabled = import.meta.env.VITE_PRIME_CHAT_REVAMP === '1';
  const isPrimeChatUiRefinementsEnabled = import.meta.env.VITE_PRIME_CHAT_UI_REFINEMENTS === '1';
  const [internalExpanded, setInternalExpanded] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    if (import.meta.env.VITE_PRIME_CHAT_REVAMP !== '1') return false;
    try {
      return window.localStorage.getItem(PRIME_CHAT_WIDE_STORAGE_KEY) === '1';
    } catch {
      return false;
    }
  });
  const isExpanded = controlledExpanded ?? internalExpanded;

  const setExpandedState = useCallback((next: boolean) => {
    if (controlledExpanded === undefined) {
      setInternalExpanded(next);
    }
    if (import.meta.env.DEV) {
      log('[PrimeChatRevamp] Wide mode toggled', { enabled: next });
    }
    onExpandedChange?.(next);
  }, [controlledExpanded, onExpandedChange]);
  const [showUploadCard, setShowUploadCard] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<StatusType | null>(null);
  const [uploadStatusMessage, setUploadStatusMessage] = useState<string | null>(null);
  const [primeNarrationText, setPrimeNarrationText] = useState<string | null>(null);
  const [isUploadingAttachments, setIsUploadingAttachments] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDraggingOverChat, setIsDraggingOverChat] = useState(false);
  const [queuedUploadCount, setQueuedUploadCount] = useState(0);
  const [isAssistantReplyPending, setIsAssistantReplyPending] = useState(false);
  const [approvingBatchKey, setApprovingBatchKey] = useState<string | null>(null);
  const [primeSelectedUploadFileNames, setPrimeSelectedUploadFileNames] = useState<string[]>([]);
  const [isClearingChat, setIsClearingChat] = useState(false);
  const [isResettingUploads, setIsResettingUploads] = useState(false);
  const pendingUploadFilesRef = useRef<File[]>([]);
  const inFlightUploadKeysRef = useRef<Set<string>>(new Set());
  const primeNarrationStageRef = useRef<{ importKey: string; stage: string }>({ importKey: '', stage: '' });
  const primeNarrationClearTimerRef = useRef<number | null>(null);
  const activePrimeUploadBatchKeyRef = useRef<string | null>(null);
  const closedPrimeUploadBatchKeysRef = useRef<Set<string>>(new Set());
  const uploadImportIdToBatchKeyRef = useRef<Map<string, string>>(new Map());
  const primeBatchInstructionRef = useRef<Map<string, string>>(new Map());
  const primeFinalStreamTimersRef = useRef<Map<string, number>>(new Map());
  const primeNarrationFinalizedImportIdsRef = useRef<Set<string>>(new Set());
  const primeFinalSummaryTextByImportRef = useRef<Record<string, string>>({});
  const byteParseStatusSentRef = useRef<Set<string>>(new Set());
  const tagCompleteStatusSentRef = useRef<Set<string>>(new Set());
  const primeProcessingTimeoutRef = useRef<number | null>(null);
  const primeProcessingTimeoutBatchKeyRef = useRef<string | null>(null);
  const primeTimedOutBatchKeysRef = useRef<Set<string>>(new Set());
  const clarificationCandidatesByImportIdRef = useRef<Record<string, Array<{
    transactionId: string;
    vendor: string;
    amount: string;
    date: string;
  }>>>({});
  
  // Determine effective employee slug: prioritize override, then prop, then global activeEmployeeSlug, then fallback
  // PART 2: Route-aware override takes precedence (UI-only) - but only on initial mount
  // CRITICAL: /dashboard/prime-chat defaults to Prime, but respects handoffs after they occur
  // After a handoff, use the engine's activeEmployeeSlug (which reflects the handoff)
  const isPrimeChatPage = location.pathname === '/dashboard/prime-chat';
  const hasExplicitEmployeeSlug = Boolean(activeEmployeeSlugOverride || initialEmployeeSlug);
  const routeForcedEmployeeSlug = isPrimeChatPage && !hasExplicitEmployeeSlug ? 'prime-boss' : null;
  
  // Calculate initial effectiveEmployeeSlug: default to Prime on Prime Chat page, otherwise use override/prop/global
  const initialEffectiveEmployeeSlug = activeEmployeeSlugOverride || initialEmployeeSlug || routeForcedEmployeeSlug || globalActiveEmployeeSlug || 'prime-boss';

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
    clearMessages,
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
    clearMessages: () => {},
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
  const primeGreetingVariantRef = useRef(0); // Rotate Prime opener variants each open
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
  } else if (normalizedSlug === '/dashboard/prime-chat' || normalizedSlug === 'prime-chat') {
    employeeId = 'prime-boss';
  }

  const primeUploadInChatEnabled = import.meta.env.VITE_PRIME_UPLOAD_IN_CHAT === '1';
  const primeNarrationFlowEnabled = isPrimeUploadNarrationEnabled();
  const isByte = employeeId === 'byte-docs';
  const isPrimeUploadAssistant = employeeId === 'prime-boss' && primeUploadInChatEnabled;
  // Keep narration resilient even if narration flag is stale in a running dev session.
  // As long as Prime in-chat upload is enabled, show Prime's stage narration.
  const isPrimeNarrationEnabled = employeeId === 'prime-boss' && primeUploadInChatEnabled;
  const supportsChatUploads = isByte || isPrimeUploadAssistant;
  const uploadStep = smartImport.uploadStatus?.step;
  const showCenteredUploadIndicator =
    isByte &&
    (
      queuedUploadCount > 0 ||
      isUploadingAttachments ||
      uploadStep === 'uploading' ||
      uploadStep === 'processing'
    );
  const uploadProgressValue = (() => {
    const raw = Number(smartImport.uploadStatus?.progress ?? 0);
    if (Number.isFinite(raw) && raw > 0) return Math.max(0, Math.min(100, Math.round(raw)));
    if (queuedUploadCount > 0 && !isUploadingAttachments) return 8;
    if (uploadStep === 'uploading') return 28;
    if (uploadStep === 'processing') return 72;
    return 0;
  })();
  const uploadCircleLabel =
    uploadStatusMessage ||
    (queuedUploadCount > 0 && !isUploadingAttachments
      ? `Upload queued (${queuedUploadCount})`
      : uploadStep === 'uploading'
        ? 'Upload received. Starting processing...'
        : uploadStep === 'processing'
          ? 'Processing documents...'
          : 'Preparing your summary...');
  const primeQueueItemsForDisplay = useMemo(() => {
    const items = Array.isArray(smartImport.uploadQueue?.items) ? smartImport.uploadQueue.items : [];
    return items
      .filter((item) =>
        item &&
        item.file &&
        ['pending', 'uploading', 'processing', 'summarized', 'ready_for_approval'].includes(String(item.status))
      )
      .slice(-6);
  }, [smartImport.uploadQueue?.items]);
  const primeUploadTotalCount = Number(smartImport.uploadFileCount?.total || 0);
  const primeUploadCurrentCount = Number(smartImport.uploadFileCount?.current || 0);
  const isPrimeUploadFlowActive =
    isUploadingAttachments ||
    uploadStep === 'uploading' ||
    uploadStep === 'processing' ||
    queuedUploadCount > 0 ||
    Boolean(smartImport.uploadQueue?.isUploading);
  const primeUploadDisplayCount = Math.max(
    primeUploadTotalCount,
    primeQueueItemsForDisplay.length,
    primeSelectedUploadFileNames.length,
    queuedUploadCount || 0,
    isPrimeUploadFlowActive ? 1 : 0
  );
  const showPrimeUploadQueueCard =
    !isByte &&
    supportsChatUploads &&
    isPrimeUploadFlowActive;
  const primeUploadNamesForCard = primeQueueItemsForDisplay.length > 0
    ? primeQueueItemsForDisplay.map((item) => String(item.file?.name || '')).filter(Boolean)
    : primeSelectedUploadFileNames;

  useEffect(() => {
    if (!employeeId) return;
    // Keep global state aligned so send hooks don't default to prime-boss
    setActiveEmployeeGlobal?.(employeeId);
  }, [employeeId, setActiveEmployeeGlobal]);

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
    if (!isPrimeNarrationEnabled) {
      if (primeNarrationText) setPrimeNarrationText(null);
      if (primeNarrationClearTimerRef.current !== null) {
        window.clearTimeout(primeNarrationClearTimerRef.current);
        primeNarrationClearTimerRef.current = null;
      }
      primeNarrationStageRef.current = { importKey: '', stage: '' };
      return;
    }
    if (isStreaming || inFlightTurnRef.current) return;

    const rawMessage = (uploadStatusMessage || '').toLowerCase();
    const importId = String(smartImport.lastUploadSummary?.importId || '').trim();
    const fallbackKey = `${smartImport.uploadStatus?.fileName || 'prime-upload'}:${smartImport.uploadStatus?.progress || 0}`;
    const importKey = importId || fallbackKey;

    let nextStage = '';
    let nextText: string | null = null;
    if (uploadStep === 'error' || uploadError || smartImport.uploadStatus?.error) {
      nextStage = 'error';
      nextText = "I couldn't read that file. Try a clearer PDF or image.";
    } else if (uploadStep === 'completed') {
      nextStage = 'complete';
      nextText = 'Your document is ready.';
    } else if (rawMessage.includes('categoriz')) {
      nextStage = 'categorizing';
      nextText = 'Categorizing expenses...';
    } else if (rawMessage.includes('summary') || rawMessage.includes('summariz')) {
      nextStage = 'summarizing';
      nextText = 'Preparing your summary...';
    } else if (uploadStep === 'processing' || rawMessage.includes('analyz') || rawMessage.includes('extract')) {
      nextStage = 'extracting';
      nextText = 'Extracting transactions...';
    } else if (uploadStep === 'uploading' || isUploadingAttachments) {
      nextStage = 'uploading';
      nextText = 'Upload received. Starting processing...';
    }

    if (!nextText) {
      if (primeNarrationText) setPrimeNarrationText(null);
      return;
    }

    const prev = primeNarrationStageRef.current;
    if (prev.importKey === importKey && prev.stage === nextStage) return;
    primeNarrationStageRef.current = { importKey, stage: nextStage };
    setPrimeNarrationText(nextText);

    if (primeNarrationClearTimerRef.current !== null) {
      window.clearTimeout(primeNarrationClearTimerRef.current);
      primeNarrationClearTimerRef.current = null;
    }

    if (nextStage === 'complete' || nextStage === 'error') {
      primeNarrationClearTimerRef.current = window.setTimeout(() => {
        const current = primeNarrationStageRef.current;
        if (current.importKey === importKey && current.stage === nextStage) {
          setPrimeNarrationText(null);
        }
        primeNarrationClearTimerRef.current = null;
      }, 2400);
    }
  }, [
    isPrimeNarrationEnabled,
    isStreaming,
    uploadStatusMessage,
    uploadStep,
    uploadError,
    isUploadingAttachments,
    primeNarrationText,
    smartImport.lastUploadSummary?.importId,
    smartImport.uploadStatus?.error,
    smartImport.uploadStatus?.fileName,
    smartImport.uploadStatus?.progress,
  ]);

  useEffect(() => {
    return () => {
      if (primeNarrationClearTimerRef.current !== null) {
        window.clearTimeout(primeNarrationClearTimerRef.current);
        primeNarrationClearTimerRef.current = null;
      }
    };
  }, []);

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
    getPrimeSummaryMeta,
    getImportTimeline,
    consumePrimeSummary,
  } = usePostImportHandoff(userId || undefined, {
    bypassQuietMode: true,
    getBatchImportIds: () => {
      const finishedAt = smartImport.lastUploadSummary?.finishedAt;
      const isRecent =
        typeof finishedAt === 'string' &&
        Date.now() - Date.parse(finishedAt) < 5 * 60 * 1000;
      if (!isRecent) return [];
      return (smartImport.lastUploadSummary?.importIds || [])
        .map((id) => String(id || '').trim())
        .filter(Boolean);
    },
  });
  const lastUploadFinishedAt = smartImport.lastUploadSummary?.finishedAt;
  const isRecentUpload =
    typeof lastUploadFinishedAt === 'string' &&
    Date.now() - Date.parse(lastUploadFinishedAt) < 5 * 60 * 1000;
  const recentImportIds = isRecentUpload
    ? (smartImport.lastUploadSummary?.importIds || [])
        .map((id) => String(id || '').trim())
        .filter(Boolean)
    : [];
  const recentImportId = isRecentUpload ? smartImport.lastUploadSummary?.importId : undefined;
  const recentPrimeSummariesReady =
    recentImportIds.length > 0 &&
    recentImportIds.every((id) => Boolean(getPrimeSummary(id)));
  const hasUnfinalizedRecentImports =
    recentImportIds.length > 0 &&
    recentImportIds.some((id) => !primeNarrationFinalizedImportIdsRef.current.has(id));
  const primeReadyIsRecent = recentImportIds.includes(String(primeSummaryReady || '').trim());
  const isPrimeSummaryPending =
    Boolean(isPrimeNarrationEnabled) &&
    recentImportIds.length > 0 &&
    !recentPrimeSummariesReady;
  const summaryForByte =
    primeSummaryReady && primeReadyIsRecent
      ? getPrimeSummary(primeSummaryReady)
      : null;
  const fallbackSummaryImportId = primeReadyIsRecent
    ? primeSummaryReady || undefined
    : (isRecentUpload ? smartImport.lastUploadSummary?.importId : undefined);
  const uploadActorLabels = useMemo(
    () => getUploadActorLabels(SHOW_EMPLOYEE_NAMES_IN_UPLOAD),
    []
  );

  useEffect(() => {
    if (isRecentUpload) return;
    setInjectedMessages((prev) => prev.filter((msg) => !msg.meta?.isSummary));
  }, [isRecentUpload]);

  // Hook: Monitor import completion and emit BYTE_IMPORT_COMPLETED events
  // Only monitor the active upload importId to avoid false recaps from older imports.
  useByteImportCompletion({
    userId: userId || '',
    importId: recentImportId,
    importIds: recentImportIds,
    runId: smartImport.lastUploadSummary?.id,
    enabled: Boolean(recentImportId),
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
    const isUsable = (el: HTMLElement | null): el is HTMLElement => {
      return !!el && el.isConnected;
    };

    if (isUsable(scrollElementRef.current)) {
      scrollContainerElementRef.current = scrollElementRef.current;
      return scrollElementRef.current;
    }

    // If wrapper exists, prefer the real nested message scroller.
    if (scrollContainerRef.current && scrollContainerRef.current.isConnected) {
      const nested = scrollContainerRef.current.querySelector('[data-scroll-container="true"]') as HTMLElement | null;
      if (isUsable(nested)) {
        scrollContainerElementRef.current = nested;
        return nested;
      }
    }

    if (isUsable(scrollContainerRef.current)) {
      scrollContainerElementRef.current = scrollContainerRef.current;
      return scrollContainerRef.current;
    }

    if (isUsable(scrollContainerElementRef.current)) {
      return scrollContainerElementRef.current;
    }

    const end = messagesEndRef.current;
    if (!end) return null;
    let scrollContainer: HTMLElement | null = end.parentElement;
    while (
      scrollContainer &&
      !scrollContainer.hasAttribute('data-scroll-container') &&
      !scrollContainer.classList.contains('overflow-y-auto')
    ) {
      scrollContainer = scrollContainer.parentElement;
    }
    if (isUsable(scrollContainer)) {
      scrollContainerElementRef.current = scrollContainer;
      return scrollContainer;
    }
    return null;
  }, []);

  const NEAR_BOTTOM_PX = 220;

  // Scroll-to-bottom helper (ChatGPT-style, uses scroll container + marker)
  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'auto') => {
    const shouldFollowActiveTurn =
      (isStreaming || isAssistantReplyPending || isUploadingAttachments || isPrimeSummaryPending) &&
      (userIsNearBottomRef.current || autoPinToBottomRef.current);
    const shouldAutoScrollNow =
      userJustSentRef.current ||
      shouldFollowActiveTurn ||
      Date.now() < forceAutoPinUntilRef.current;
    if (!shouldAutoScrollNow || userScrolledUpRef.current) return;
    const scroller = getActiveScrollEl?.() || scrollElementRef.current;
    const end = messagesEndRef.current;
    if (!scroller && !end) return;

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (scroller) {
          scroller.scrollTo({ top: scroller.scrollHeight, behavior });
        } else if (end) {
          end.scrollIntoView({ behavior, block: 'end' });
        }
        userIsNearBottomRef.current = true;
        setIsNearBottomState(true);
      });
    });
  }, [
    getActiveScrollEl,
    isStreaming,
    isAssistantReplyPending,
    isUploadingAttachments,
    isPrimeSummaryPending,
    setIsNearBottomState,
  ]);

  // Keep message list bottom padding in sync with the sticky footer height.
  // This prevents the newest message from getting visually stuck behind the input bar.
  useLayoutEffect(() => {
    if (!isOpen) return;
    const footer = inputFooterRef.current;
    if (!footer) return;

    const recomputePadding = () => {
      const footerHeight = Math.ceil(footer.getBoundingClientRect().height || 0);
      const next = Math.max(96, Math.min(300, footerHeight + 20));
      setChatBottomPaddingPx(next);
    };

    recomputePadding();

    let footerResizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      footerResizeObserver = new ResizeObserver(() => recomputePadding());
      footerResizeObserver.observe(footer);
    }

    window.addEventListener('resize', recomputePadding);
    return () => {
      footerResizeObserver?.disconnect();
      window.removeEventListener('resize', recomputePadding);
    };
  }, [isOpen]);

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
            .select('id, original_name, extracted_data, ocr_text_hash, ocr_text_length, pii_types')
            .in('id', docIds);
          const { data, error } = await baseQuery;
          if (error && String(error.message || '').includes('extracted_data')) {
            const fallback = await supabase
              .from('user_documents')
              .select('id, original_name, ocr_text_hash, ocr_text_length, pii_types')
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
          if (lines.length === 0 && (doc.ocr_text_hash || doc.ocr_text_length)) {
            if (doc.ocr_text_length) lines.push(`Extracted text length: ${doc.ocr_text_length}`);
            if (doc.ocr_text_hash) lines.push(`Extracted text hash: ${doc.ocr_text_hash}`);
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
      const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
      const nearBottom = distanceFromBottom < NEAR_BOTTOM_PX;
      const shouldHardPinToBottom =
        isUploadingAttachments || isPrimeSummaryPending || isAssistantReplyPending || isStreaming;
      if (shouldHardPinToBottom && !nearBottom) {
        autoPinToBottomRef.current = true;
        userScrolledUpRef.current = false;
        requestAnimationFrame(() => {
          container.scrollTo({ top: container.scrollHeight, behavior: 'auto' });
        });
        return;
      }
      setIsNearBottomState(nearBottom);
      userIsNearBottomRef.current = nearBottom;
      userScrolledUpRef.current = !nearBottom;
      if (scrollDebugEnabled) {
        debug('[ChatScroll] onScroll', {
          scrollTop: Math.round(container.scrollTop),
          scrollHeight: Math.round(container.scrollHeight),
          clientHeight: Math.round(container.clientHeight),
          distanceFromBottom: Math.round(distanceFromBottom),
          nearBottom,
          scroller: container.getAttribute('data-scroll-container') ? 'data-scroll-container' : container.className,
        });
      }
      // Keep chat pinned while actively sending/processing unless the user intentionally
      // scrolls far away from the bottom.
      if (nearBottom) {
        autoPinToBottomRef.current = true;
      } else {
        // Respect manual scroll-up immediately; do not force pin during long processing states.
        autoPinToBottomRef.current = false;
      }
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    // Initial check
    handleScroll();

    return () => {
      container.removeEventListener('scroll', handleScroll);
    };
  }, [getActiveScrollEl, isOpen, messages.length, isStreaming, isUploadingAttachments, isPrimeSummaryPending, isAssistantReplyPending]);

  // Keep the chat anchored only when user just sent OR streaming while near-bottom.
  useEffect(() => {
    if (!isOpen) return;
    if (userScrolledUpRef.current) return;
    const shouldLockBottom =
      userJustSentRef.current ||
      (isStreaming && userIsNearBottomRef.current);
    if (!shouldLockBottom) return;
    autoPinToBottomRef.current = true;

    const container = getActiveScrollEl();
    scrollToBottom('auto');

    let resizeObserver: ResizeObserver | null = null;
    if (container && typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        if (autoPinToBottomRef.current && !userScrolledUpRef.current) {
          scrollToBottom('auto');
        }
      });
      resizeObserver.observe(container);
    }

    const lockTimer = window.setInterval(() => {
      if (autoPinToBottomRef.current && !userScrolledUpRef.current) {
        scrollToBottom('auto');
      }
    }, 250);

    return () => {
      window.clearInterval(lockTimer);
      resizeObserver?.disconnect();
    };
  }, [isOpen, isStreaming, getActiveScrollEl, scrollToBottom]);

  // Keep anchored when rendered content expands after parent render
  // (e.g., progressive TypingMessage reveal, markdown/code layout growth).
  useEffect(() => {
    if (!isOpen) return;
    const contentEl = messageListContentRef.current;
    if (!contentEl || typeof ResizeObserver === 'undefined') return;
    const lastChild = contentEl.lastElementChild as Element | null;

    const observer = new ResizeObserver(() => {
      const shouldStick =
        userJustSentRef.current ||
        (isStreaming && userIsNearBottomRef.current);

      if (!shouldStick) return;
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          scrollToBottom('auto');
          if (scrollDebugEnabled) {
            const container = getActiveScrollEl();
            if (container) {
              const distanceFromBottom =
                container.scrollHeight - container.scrollTop - container.clientHeight;
              debug('[ChatScroll] content resize -> pinned', {
                scrollTop: Math.round(container.scrollTop),
                scrollHeight: Math.round(container.scrollHeight),
                clientHeight: Math.round(container.clientHeight),
                distanceFromBottom: Math.round(distanceFromBottom),
              });
            }
          }
        });
      });
    });

    observer.observe(contentEl);
    if (lastChild) {
      observer.observe(lastChild);
    }
    return () => observer.disconnect();
  }, [isOpen, getActiveScrollEl, isStreaming, scrollToBottom, scrollDebugEnabled]);

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
      // Do not auto-scroll on initial render. Respect current position.
      didInitialScrollRef.current = true;
    }

    // Find last assistant message (streaming message) - use messages array directly
    const lastAssistantMessage = [...messages].reverse().find(m => m.role === 'assistant');
    const currentContentLength = lastAssistantMessage?.content?.length || 0;
    const contentChanged = currentContentLength !== lastMessageContentLengthRef.current;
    const combinedMessageCount = messages.length + loadedHistoryMessages.length + injectedMessages.length;
    const messagesLengthChanged = combinedMessageCount !== lastMessagesLengthRef.current;
    const streamingStarted = isStreaming && !lastStreamingStateRef.current;
    const streamingStopped = !isStreaming && lastStreamingStateRef.current;
    
    // Update refs
    lastMessageContentLengthRef.current = currentContentLength;
    lastMessagesLengthRef.current = combinedMessageCount;
    lastStreamingStateRef.current = isStreaming;
    
    // Auto-scroll only if user is near bottom (ChatGPT-like).
    const shouldAutoScroll =
      userJustSentRef.current ||
      (isStreaming && userIsNearBottomRef.current === true);
    
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
  }, [messages, loadedHistoryMessages, injectedMessages.length, isStreaming, scrollToBottom, getActiveScrollEl, isOpen, isLoadingHistory]);

  // No separate scrollIntoView effect — scroll is centralized in scrollToBottom()

  // On open, land in a readable bottom-anchored position.
  useEffect(() => {
    if (!isOpen) {
      didInitialScrollRef.current = false;
      return;
    }

    const container = getActiveScrollEl();
    if (container) {
      requestAnimationFrame(() => {
        const hasAnyMessages =
          messages.length + loadedHistoryMessages.length + injectedMessages.length > 0;
        if (hasAnyMessages) {
          autoPinToBottomRef.current = true;
          userScrolledUpRef.current = false;
          userIsNearBottomRef.current = true;
          forceAutoPinUntilRef.current = Date.now() + 1600;
          setIsNearBottomState(true);
          container.scrollTo({ top: container.scrollHeight, behavior: 'auto' });
          window.setTimeout(() => {
            forceAutoPinUntilRef.current = Date.now() + 1200;
            container.scrollTo({ top: container.scrollHeight, behavior: 'auto' });
          }, 80);
          return;
        }
        // While history is hydrating, avoid snapping to top.
        if (isLoadingHistory) return;
        // Empty thread fallback
        container.scrollTop = 0;
        userIsNearBottomRef.current = true;
        userScrolledUpRef.current = false;
        setIsNearBottomState(true);
      });
    }
  }, [getActiveScrollEl, isOpen, messages.length, loadedHistoryMessages.length, injectedMessages.length, scrollToBottom, isLoadingHistory]);
  
  // Employee switch should not force scroll.
  useEffect(() => {
    if (isOpen && currentEmployeeSlug) {
      // Clear cached scroll container (may have changed)
      scrollContainerElementRef.current = null;
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
  const getAttachmentKey = useCallback(
    (file: File) => `${file.name}-${file.size}-${file.lastModified}`,
    []
  );

  const getPrimeBatchScope = useCallback(() => {
    return `${userId || 'anon'}:${conversationId || 'default'}:prime-boss`;
  }, [userId, conversationId]);

  const persistPrimeBatchState = useCallback((nextActiveBatchKey: string | null) => {
    if (typeof window === 'undefined') return;
    const scope = getPrimeBatchScope();
    const activeKey = `${PRIME_UPLOAD_ACTIVE_BATCH_PREFIX}${scope}`;
    const closedKey = `${PRIME_UPLOAD_CLOSED_BATCHES_PREFIX}${scope}`;
    try {
      if (nextActiveBatchKey) {
        window.sessionStorage.setItem(activeKey, nextActiveBatchKey);
      } else {
        window.sessionStorage.removeItem(activeKey);
      }
      window.sessionStorage.setItem(
        closedKey,
        JSON.stringify(Array.from(closedPrimeUploadBatchKeysRef.current))
      );
    } catch {
      // Ignore storage failures (private mode / quota), runtime can continue in memory.
    }
  }, [getPrimeBatchScope]);

  const mintPrimeBatchKey = useCallback(() => {
    return `batch-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }, []);

  const ensureActivePrimeBatchKey = useCallback(() => {
    const current = activePrimeUploadBatchKeyRef.current;
    if (current && !closedPrimeUploadBatchKeysRef.current.has(current)) {
      return current;
    }
    const next = mintPrimeBatchKey();
    activePrimeUploadBatchKeyRef.current = next;
    persistPrimeBatchState(next);
    return next;
  }, [mintPrimeBatchKey, persistPrimeBatchState]);

  const closeActivePrimeBatchKey = useCallback(() => {
    const current = activePrimeUploadBatchKeyRef.current;
    if (!current) return null;
    closedPrimeUploadBatchKeysRef.current.add(current);
    primeBatchInstructionRef.current.delete(current);
    activePrimeUploadBatchKeyRef.current = null;
    persistPrimeBatchState(null);
    return current;
  }, [persistPrimeBatchState]);

  const clearPrimeUploadLocalState = useCallback(() => {
    const staleBatchKeys = new Set<string>([
      activePrimeUploadBatchKeyRef.current || '',
      ...Array.from(closedPrimeUploadBatchKeysRef.current),
      ...Array.from(uploadImportIdToBatchKeyRef.current.values()),
    ].filter(Boolean));
    setInjectedMessages([]);
    setSummaryOverrides({});
    setCategorizeStatusByImportId({});
    setLoadedHistoryMessages([]);
    uploadImportIdToBatchKeyRef.current.clear();
    primeBatchInstructionRef.current.clear();
    primeNarrationFinalizedImportIdsRef.current.clear();
    primeFinalSummaryTextByImportRef.current = {};
    byteParseStatusSentRef.current.clear();
    tagCompleteStatusSentRef.current.clear();
    primeTimedOutBatchKeysRef.current.clear();
    clarificationCandidatesByImportIdRef.current = {};
    activePrimeUploadBatchKeyRef.current = null;
    closedPrimeUploadBatchKeysRef.current = new Set();
    if (primeNarrationClearTimerRef.current) {
      window.clearTimeout(primeNarrationClearTimerRef.current);
      primeNarrationClearTimerRef.current = null;
    }
    if (primeProcessingTimeoutRef.current) {
      window.clearTimeout(primeProcessingTimeoutRef.current);
      primeProcessingTimeoutRef.current = null;
    }
    primeProcessingTimeoutBatchKeyRef.current = null;
    primeFinalStreamTimersRef.current.forEach((timer) => window.clearInterval(timer));
    primeFinalStreamTimersRef.current.clear();
    setPrimeNarrationText(null);
    setUploadStatus(null);
    setUploadStatusMessage(null);
    setPrimeSelectedUploadFileNames([]);
    setUploadError(null);
    setApprovingBatchKey(null);
    persistPrimeBatchState(null);
    if (typeof window !== 'undefined') {
      staleBatchKeys.forEach((batchKey) => {
        if (!batchKey) return;
        window.sessionStorage.removeItem(`${PRIME_UPLOAD_NARRATION_STARTED_PREFIX}${batchKey}`);
      });
    }
    clearMessages?.();
  }, [clearMessages, persistPrimeBatchState]);

  const buildAuthHeaders = useCallback(async () => {
    const nextHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (userId) {
      nextHeaders['x-user-id'] = String(userId);
    }
    const authToken = session?.access_token;
    if (authToken) {
      nextHeaders.Authorization = `Bearer ${authToken}`;
      return nextHeaders;
    }
    try {
      const { getSupabase } = await import('../../lib/supabase');
      const supabase = getSupabase();
      const resolvedSession = supabase ? await supabase.auth.getSession() : null;
      const fallbackToken = resolvedSession?.data?.session?.access_token;
      if (fallbackToken) {
        nextHeaders.Authorization = `Bearer ${fallbackToken}`;
      }
    } catch {
      // Best effort only; x-user-id path still supports testing reset endpoint.
    }
    return nextHeaders;
  }, [session?.access_token, userId]);

  const handleClearChat = useCallback(async () => {
    if (!userId || isClearingChat) return;
    setIsClearingChat(true);
    try {
      const response = await fetch('/.netlify/functions/clear-chat-history', {
        method: 'POST',
        headers: await buildAuthHeaders(),
        body: JSON.stringify({ userId }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload?.ok === false) {
        throw new Error(String(payload?.error || payload?.message || 'Failed to clear chat'));
      }
      clearPrimeUploadLocalState();
      toast.success('Chat history cleared');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to clear chat history');
    } finally {
      setIsClearingChat(false);
    }
  }, [buildAuthHeaders, clearPrimeUploadLocalState, isClearingChat, userId]);

  const handleResetTestUploads = useCallback(async () => {
    if (!userId || isResettingUploads) return;
    const confirmation = window.prompt('Type RESET to discard recent test uploads:', '');
    if (confirmation !== 'RESET') {
      toast('Reset cancelled');
      return;
    }
    const daysRaw = window.prompt('Reset uploads from the last how many days?', '30');
    const parsedDays = Number(daysRaw || 30);
    const days = Number.isFinite(parsedDays) && parsedDays > 0 ? Math.min(Math.floor(parsedDays), 3650) : 30;
    setIsResettingUploads(true);
    try {
      const response = await fetch('/.netlify/functions/reset-test-uploads', {
        method: 'POST',
        headers: await buildAuthHeaders(),
        body: JSON.stringify({
          confirm: 'RESET',
          days,
          dryRun: false,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload?.ok === false) {
        throw new Error(String(payload?.error || payload?.message || 'Reset failed'));
      }
      smartImport.resetUploadState?.();
      clearPrimeUploadLocalState();
      const discarded = Number(payload?.discardedDocs || 0);
      toast.success(`Reset complete (${discarded} uploads discarded)`);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to reset test uploads');
    } finally {
      setIsResettingUploads(false);
    }
  }, [buildAuthHeaders, clearPrimeUploadLocalState, isResettingUploads, smartImport.resetUploadState, userId]);

  const isPrimeBatchCloseIntent = useCallback((value: string) => {
    const text = value.trim().toLowerCase();
    if (!text) return false;
    return /(that'?s it|thats it|no more (docs|documents|files)|done uploading|finished uploading|all done uploading|close (the )?batch|nope that'?s it)/i.test(text);
  }, []);

  const showTestingResetAction =
    import.meta.env.DEV ||
    import.meta.env.VITE_ENABLE_TEST_RESET_UPLOADS === '1' ||
    import.meta.env.VITE_TEST_MODE === '1';

  const utilityActions = normalizedSlug === 'prime-boss' ? (
    <div className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={() => void handleClearChat()}
        disabled={isClearingChat || isStreaming}
        className="inline-flex h-8 items-center rounded-lg border border-slate-700/80 bg-slate-900/70 px-2.5 text-xs text-slate-300 transition-colors hover:bg-slate-800 hover:text-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
        title="Clear chat history"
      >
        {isClearingChat ? 'Clearing…' : 'Clear Chat'}
      </button>
      {showTestingResetAction && (
        <button
          type="button"
          onClick={() => void handleResetTestUploads()}
          disabled={isResettingUploads}
          className="inline-flex h-8 items-center rounded-lg border border-amber-500/50 bg-amber-900/25 px-2.5 text-xs text-amber-100 transition-colors hover:bg-amber-800/35 disabled:cursor-not-allowed disabled:opacity-60"
          title="Advanced / Testing"
        >
          {isResettingUploads ? 'Resetting…' : 'Reset Test Uploads'}
        </button>
      )}
    </div>
  ) : null;

  const getImportIdsForBatch = useCallback((batchKey: string): string[] => {
    if (!batchKey) return [];
    return Array.from(uploadImportIdToBatchKeyRef.current.entries())
      .filter(([, key]) => key === batchKey)
      .map(([importId]) => importId)
      .filter(Boolean);
  }, []);

  const upsertPrimeApprovalCard = useCallback((params: { batchKey: string; importIds: string[] }) => {
    if (PRIME_MINIMAL_UPLOAD_CHAT) return;
    if (!params.batchKey || !params.importIds.length) return;
    const messageId = `prime-approval-${params.batchKey}`;
    const uniqueImportIds = Array.from(new Set(params.importIds.map((id) => String(id || '').trim()).filter(Boolean)));
    if (!uniqueImportIds.length) return;
    setInjectedMessages((prev) => {
      const existingIndex = prev.findIndex((msg) => msg.id === messageId);
      const nextMessage: ChatMessage = {
        id: messageId,
        role: 'assistant',
        content: `All ${uniqueImportIds.length} document summaries are ready.\n\nApprove & Import to commit these transactions now, or review/cancel this batch first.`,
        createdAt: existingIndex >= 0 ? prev[existingIndex].createdAt : new Date().toISOString(),
        meta: {
          type: 'prime_upload_approval',
          batchKey: params.batchKey,
          importIds: uniqueImportIds,
          targetEmployeeSlug: 'prime-boss',
          hideTimestamp: true,
        },
      };
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = nextMessage;
        return updated;
      }
      return [...prev, nextMessage];
    });
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const scope = getPrimeBatchScope();
    const activeKey = `${PRIME_UPLOAD_ACTIVE_BATCH_PREFIX}${scope}`;
    const closedKey = `${PRIME_UPLOAD_CLOSED_BATCHES_PREFIX}${scope}`;
    try {
      const active = window.sessionStorage.getItem(activeKey);
      const closedRaw = window.sessionStorage.getItem(closedKey);
      const closed = closedRaw ? JSON.parse(closedRaw) : [];
      closedPrimeUploadBatchKeysRef.current = new Set(
        Array.isArray(closed) ? closed.filter((item): item is string => typeof item === 'string') : []
      );
      if (active && !closedPrimeUploadBatchKeysRef.current.has(active)) {
        activePrimeUploadBatchKeyRef.current = active;
      } else {
        activePrimeUploadBatchKeyRef.current = null;
      }
    } catch {
      activePrimeUploadBatchKeyRef.current = null;
      closedPrimeUploadBatchKeysRef.current = new Set();
    }
  }, [getPrimeBatchScope]);

  const upsertPrimeUploadNarration = useCallback((params: {
    batchKey: string;
    text: string;
    stages: PrimeUploadProgressStages;
    importId?: string;
    failed?: boolean;
    done?: boolean;
  }) => {
    if (!isPrimeNarrationEnabled) return;
    const messageId = `prime-upload-progress-${params.batchKey}`;
    setInjectedMessages((prev) => {
      const existingIndex = prev.findIndex((msg) => msg.id === messageId);
      const existing = existingIndex >= 0 ? prev[existingIndex] : null;
      const shouldRefreshTimestamp = !Boolean(params.done);
      const nextMessage: ChatMessage = {
        id: messageId,
        role: 'assistant',
        content: params.text,
        createdAt: shouldRefreshTimestamp ? new Date().toISOString() : (existing?.createdAt || new Date().toISOString()),
        meta: {
          type: 'prime_upload_narration',
          targetEmployeeSlug: 'prime-boss',
          batchKey: params.batchKey,
          importId: params.importId,
          stages: params.stages,
          failed: Boolean(params.failed),
          done: Boolean(params.done),
          hideTimestamp: true,
        },
      };
      if (existingIndex === -1) {
        return [...prev, nextMessage];
      }
      const sameContent = existing?.content === nextMessage.content;
      const sameMeta = JSON.stringify(existing?.meta || {}) === JSON.stringify(nextMessage.meta || {});
      if (sameContent && sameMeta) {
        return prev;
      }
      const updated = [...prev];
      updated[existingIndex] = nextMessage;
      return updated;
    });
    if (!userScrolledUpRef.current) {
      forceAutoPinUntilRef.current = Date.now() + 7000;
      // Keep Prime narration visible as status advances (Step 1 -> Step 3).
      autoPinToBottomRef.current = true;
      requestAnimationFrame(() => {
        scrollToBottom('auto');
      });
      window.setTimeout(() => {
        scrollToBottom('auto');
      }, 80);
    }
  }, [isPrimeNarrationEnabled, scrollToBottom]);

  const upsertUploadActorStatus = useCallback((params: {
    actor: 'byte' | 'tag';
    importId: string;
    batchKey?: string;
    text: string;
  }) => {
    if (PRIME_MINIMAL_UPLOAD_CHAT) return;
    if (!isPrimeNarrationEnabled) return;
    if (!params.importId) return;
    const messageId = `upload-actor-status-${params.actor}-${params.importId}`;
    setInjectedMessages((prev) => {
      const existingIdx = prev.findIndex((msg) => msg.id === messageId);
      const targetEmployeeSlug = params.actor === 'byte' ? 'byte-docs' : 'tag-categorizer';
      const nextMsg: ChatMessage = {
        id: messageId,
        role: 'assistant',
        content: params.text,
        createdAt: existingIdx >= 0 ? prev[existingIdx].createdAt : new Date().toISOString(),
        meta: {
          type: 'upload_actor_status',
          actor: params.actor,
          importId: params.importId,
          batchKey: params.batchKey,
          targetEmployeeSlug,
          hideTimestamp: true,
        },
      };
      if (existingIdx >= 0) {
        const updated = [...prev];
        updated[existingIdx] = nextMsg;
        return updated;
      }
      return [...prev, nextMsg];
    });
  }, [isPrimeNarrationEnabled]);

  useEffect(() => {
    return () => {
      primeFinalStreamTimersRef.current.forEach((timerId) => {
        window.clearInterval(timerId);
      });
      primeFinalStreamTimersRef.current.clear();
    };
  }, []);

  const streamPrimeFinalMessage = useCallback((params: {
    messageId: string;
    content: string;
    importId: string;
    batchKey?: string;
  }) => {
    const fullLines = String(params.content || '').split('\n');
    const chunkSize = 3;
    const cadenceMs = 65;
    const applySlice = (lineCount: number, done: boolean) => {
      const nextContent = fullLines.slice(0, Math.max(1, lineCount)).join('\n');
      setInjectedMessages((prev) => {
        const existingIdx = prev.findIndex((msg) => msg.id === params.messageId);
        const nextMsg: ChatMessage = {
          id: params.messageId,
          role: 'assistant',
          content: nextContent,
          createdAt: existingIdx >= 0 ? prev[existingIdx].createdAt : new Date().toISOString(),
          meta: {
            type: 'prime_upload_final',
            importId: params.importId,
            batchKey: params.batchKey,
            targetEmployeeSlug: 'prime-boss',
            is_streaming: !done,
            ctas: [
              { label: 'Review Transactions', to: `/dashboard/transactions?importId=${encodeURIComponent(params.importId)}` },
              { label: 'Review Categories', to: '/dashboard/smart-categories' },
            ],
          },
        };
        if (existingIdx >= 0) {
          const updated = [...prev];
          updated[existingIdx] = nextMsg;
          return updated;
        }
        return [...prev, nextMsg];
      });
      if (!userScrolledUpRef.current) {
        autoPinToBottomRef.current = true;
        requestAnimationFrame(() => scrollToBottom('auto'));
      }
    };

    const existingTimer = primeFinalStreamTimersRef.current.get(params.messageId);
    if (existingTimer) {
      window.clearInterval(existingTimer);
      primeFinalStreamTimersRef.current.delete(params.messageId);
    }

    let shown = Math.min(chunkSize, fullLines.length);
    applySlice(shown, shown >= fullLines.length);
    if (shown >= fullLines.length) return;

    const timer = window.setInterval(() => {
      shown = Math.min(fullLines.length, shown + chunkSize);
      const done = shown >= fullLines.length;
      applySlice(shown, done);
      if (done) {
        window.clearInterval(timer);
        primeFinalStreamTimersRef.current.delete(params.messageId);
      }
    }, cadenceMs);
    primeFinalStreamTimersRef.current.set(params.messageId, timer);
  }, [scrollToBottom]);

  const loadClarificationCandidates = useCallback(async (importId: string) => {
    if (!importId) return [] as Array<{ transactionId: string; vendor: string; amount: string; date: string }>;
    try {
      const { getSupabase } = await import('../../lib/supabase');
      const supabase = getSupabase();
      if (!supabase) return [];
      const { data } = await supabase
        .from('transactions_staging')
        .select('id, data_json, tag_status')
        .eq('import_id', importId)
        .eq('tag_status', 'needs_review')
        .order('parsed_at', { ascending: false })
        .limit(5);
      const rows = Array.isArray(data) ? data : [];
      return rows.map((row: any) => {
        const payload = row?.data_json || {};
        const vendor = String(
          payload?.merchant ||
          payload?.vendor ||
          payload?.description ||
          'Unlabeled transaction'
        ).trim();
        const amountRaw = Number(payload?.amount || 0);
        const amount = Number.isFinite(amountRaw)
          ? amountRaw.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
          : '0.00';
        const date = String(payload?.date || payload?.posted_at || payload?.transaction_date || 'unknown date').trim();
        return {
          transactionId: String(row?.id || ''),
          vendor: vendor || 'Unlabeled transaction',
          amount: `$${amount}`,
          date: date || 'unknown date',
        };
      });
    } catch {
      return [];
    }
  }, []);

  const injectPrimeUploadFinalMessage = useCallback((params: {
    importId: string;
    summaryText: string;
    transactionCount: number | null;
    needsReviewCount: number | null;
    autoCount: number | null;
    aiCount: number | null;
    clarificationItems?: Array<{ transactionId: string; vendor: string; amount: string; date: string }>;
    batchKey?: string;
    customInstruction?: string;
  }) => {
    if (!isPrimeNarrationEnabled) return;
    const messageId = `prime-upload-final-${params.importId}`;
    const txText = params.transactionCount !== null ? `${params.transactionCount}` : 'your';
    const userLabel = (firstName || '').trim();
    const intro = params.transactionCount !== null
      ? `${userLabel ? `${userLabel}, ` : ''}all set. I imported ${txText} transaction${params.transactionCount === 1 ? '' : 's'} and categorized them.`
      : `${userLabel ? `${userLabel}, ` : ''}all set. I imported your transactions and categorized them.`;
    const cleanedSummary = (params.summaryText || '')
      .replace(/\t+/g, ' ')
      .replace(/[ \u00A0]{2,}/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
    const polishedSummary = cleanedSummary
      // Keep the statement recap in chat; tag status is already conveyed above.
      .replace(/\n+\s*Categorization status[\s\S]*$/i, '')
      .trim();
    const isStructuredOcrSummary =
      /##\s*Summary/i.test(polishedSummary) &&
      /##\s*Key details/i.test(polishedSummary) &&
      /##\s*Transactions \(cleaned\)/i.test(polishedSummary) &&
      /##\s*Issues \/ Uncertain lines/i.test(polishedSummary);
    const requestedInstruction = String(params.customInstruction || '').trim();
    const wantsCategoryBreakdown =
      /categor(y|ies)|break\s*down|by\s+category|group/i.test(requestedInstruction.toLowerCase());
    const extractCategoryBullets = (text: string): string[] => {
      const rawLines = text
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);
      const categoryLines = rawLines
        .filter((line) =>
          /top categor|category breakdown|categories:|software\/tools|subscription|merchant|retail|cash withdrawal|bank fee|transfers?/i.test(line)
        )
        .map((line) => `• ${line.replace(/^\-\s*/, '').trim()}`);
      return Array.from(new Set(categoryLines)).slice(0, 6);
    };
    const categoryBullets = wantsCategoryBreakdown ? extractCategoryBullets(polishedSummary) : [];
    const tagAuto = params.autoCount ?? null;
    const tagAi = params.aiCount ?? null;
    const needsReview = params.needsReviewCount ?? null;
    const tagNarrative = [
      typeof tagAuto === 'number' ? `${tagAuto} auto-categorized` : null,
      typeof tagAi === 'number' ? `${tagAi} AI-assisted` : null,
      typeof needsReview === 'number' && needsReview > 0 ? `${needsReview} need review` : null,
    ].filter(Boolean).join(', ');
    const tagSummary = tagNarrative
      ? `${uploadActorLabels.categorizer} results: ${tagNarrative}.`
      : needsReview === 0
      ? 'All transactions categorized — nothing needs review.'
      : `${uploadActorLabels.categorizer} finished categorization and your categories are ready to review.`;
    const unifiedRecap = buildUnifiedRecapFromTruth(
      {
        phase: 'summary_ready',
        summaryReady: true,
        needsReviewCount: params.needsReviewCount ?? null,
      },
      {
        showEmployeeNames: SHOW_EMPLOYEE_NAMES_IN_UPLOAD,
        summaryText: polishedSummary,
      }
    );
    const clarificationLines = unifiedRecap.showClarificationPack
      ? [
          '',
          'CLARIFICATION NEEDED',
          ...(Array.isArray(params.clarificationItems) && params.clarificationItems.length > 0
            ? [
                'Uncertain items:',
                ...params.clarificationItems.slice(0, 5).map((item) => `• ${item.vendor} — ${item.amount} on ${item.date}`),
              ]
            : unifiedRecap.uncertainVendors.length > 0
            ? [
                'Uncertain items:',
                ...unifiedRecap.uncertainVendors.slice(0, 5).map((vendor) => `• ${vendor}`),
              ]
            : []),
          ...unifiedRecap.questions.map((q) => `• ${q}`),
          '• You can reply here, or open Smart Categories to confirm each one.',
        ]
      : [];
    const personalClose = userLabel
      ? `${userLabel}, I can now walk you through spending habits, category trends, and what to clean up first.`
      : 'I can now walk you through spending habits, category trends, and what to clean up first.';
    const isMultiDocumentRecap =
      /what i see in your documents/i.test(polishedSummary) ||
      /i read \d+\s+file/i.test(polishedSummary);
    const clearLegacyImportRecap = () => {
      setInjectedMessages((prev) =>
        prev.filter((msg) => !(msg.meta?.type === 'import_recap' && msg.meta?.importId === params.importId))
      );
    };
    const upsertPrimeAutoInsights = () => {
      if (PRIME_MINIMAL_UPLOAD_CHAT) return;
      const insightsMessageId = `prime-upload-insights-${params.importId}`;
      const parsedCount =
        params.transactionCount ??
        Number(polishedSummary.match(/captured\s+(\d+)\s+transaction/i)?.[1] || polishedSummary.match(/Parsed transactions:\s*(\d+)/i)?.[1] || NaN);
      const reviewCount =
        params.needsReviewCount ??
        Number(polishedSummary.match(/(\d+)\s+need a quick review/i)?.[1] || polishedSummary.match(/Flagged for review:\s*(\d+)/i)?.[1] || NaN);
      const biggestSignalsLine = String(
        polishedSummary.match(/Biggest spend signals this period:\s*(.+)/i)?.[1] || ''
      ).trim();
      const firstSignal = biggestSignalsLine ? biggestSignalsLine.split(',')[0]?.trim() : '';
      const nextBestStep = String(polishedSummary.match(/Next best step:\s*(.+)/i)?.[1] || '').trim();
      const insightsLines = [
        'Insights now available',
        Number.isFinite(parsedCount) ? `- Transactions analyzed: ${parsedCount}` : null,
        Number.isFinite(reviewCount) ? `- Needs review: ${reviewCount}` : null,
        firstSignal ? `- Top spend signal: ${firstSignal}` : null,
        nextBestStep ? `- Suggested next action: ${nextBestStep}` : '- Suggested next action: ask for category trends, top merchants, or unusual charges.',
      ].filter(Boolean);
      setInjectedMessages((prev) => {
        const existingIdx = prev.findIndex((msg) => msg.id === insightsMessageId);
        const nextMsg: ChatMessage = {
          id: insightsMessageId,
          role: 'assistant',
          content: insightsLines.join('\n'),
          createdAt: existingIdx >= 0 ? prev[existingIdx].createdAt : new Date().toISOString(),
          meta: {
            type: 'prime_upload_insights_auto',
            importId: params.importId,
            batchKey: params.batchKey,
            targetEmployeeSlug: 'prime-boss',
            hideTimestamp: true,
          },
        };
        if (existingIdx >= 0) {
          const updated = [...prev];
          updated[existingIdx] = nextMsg;
          return updated;
        }
        return [...prev, nextMsg];
      });
    };
    const clearNarrationNoiseForImport = () => {
      setInjectedMessages((prev) =>
        prev.filter((msg) => {
          const metaAny = (msg.meta || {}) as any;
          const sameImport = metaAny?.importId === params.importId;
          const sameBatch = params.batchKey && metaAny?.batchKey === params.batchKey;
          if (metaAny?.type === 'upload_actor_status' && sameImport) return false;
          if (metaAny?.type === 'prime_upload_narration' && (sameImport || sameBatch)) return false;
          return true;
        })
      );
    };
    if (isStructuredOcrSummary) {
      clearLegacyImportRecap();
      clearNarrationNoiseForImport();
      setInjectedMessages((prev) => {
        const existingIdx = prev.findIndex((msg) => msg.id === messageId);
        const nextMsg: ChatMessage = {
          id: messageId,
          role: 'assistant',
          content: polishedSummary,
          createdAt: existingIdx >= 0 ? prev[existingIdx].createdAt : new Date().toISOString(),
          meta: {
            type: 'prime_upload_final',
            importId: params.importId,
            batchKey: params.batchKey,
            targetEmployeeSlug: 'prime-boss',
            is_streaming: false,
            ctas: [
              { label: 'Review Transactions', to: `/dashboard/transactions?importId=${encodeURIComponent(params.importId)}` },
              { label: 'Review Categories', to: '/dashboard/smart-categories' },
            ],
          },
        };
        if (existingIdx >= 0) {
          const updated = [...prev];
          updated[existingIdx] = nextMsg;
          return updated;
        }
        return [...prev, nextMsg];
      });
      upsertPrimeAutoInsights();
      forceAutoPinUntilRef.current = Date.now() + 10000;
      autoPinToBottomRef.current = true;
      requestAnimationFrame(() => {
        scrollToBottom('auto');
      });
      window.setTimeout(() => {
        scrollToBottom('auto');
      }, 120);
      return;
    }
    if (isMultiDocumentRecap) {
      const content = [
        'Summary Ready',
        intro,
        tagSummary,
        personalClose,
        ...(requestedInstruction
          ? ['', 'REQUEST APPLIED', `• ${requestedInstruction}`]
          : []),
        ...(wantsCategoryBreakdown
          ? ['', 'CATEGORY FOCUS', ...(categoryBullets.length > 0
            ? categoryBullets
            : ['• I prioritized a category-first breakdown across documents and in the combined view.'])]
          : []),
        '',
        polishedSummary,
        ...clarificationLines,
        '',
        'NEXT ACTIONS',
        '• Review transactions',
        '• Review categories',
        '• Upload another file',
        '• Reply "that\'s it" when this batch is complete',
      ].join('\n');
      clearLegacyImportRecap();
      streamPrimeFinalMessage({
        messageId,
        content,
        importId: params.importId,
        batchKey: params.batchKey,
      });
      forceAutoPinUntilRef.current = Date.now() + 10000;
      autoPinToBottomRef.current = true;
      requestAnimationFrame(() => {
        scrollToBottom('auto');
      });
      window.setTimeout(() => {
        scrollToBottom('auto');
      }, 120);
      return;
    }
    const summaryLines = polishedSummary
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
    const statementHeader = summaryLines[0] || 'Statement summary';
    const snapshotLines = summaryLines
      .filter((line) =>
        /^Account:/i.test(line) ||
        /^Statement period:/i.test(line) ||
        /^Opening balance:/i.test(line) ||
        /^Total withdrawals:/i.test(line) ||
        /^Total deposits:/i.test(line) ||
        /^Net change:/i.test(line),
      )
      .slice(0, 5);
    const toBullet = (line: string) => `• ${line.replace(/^\-\s*/, '').trim()}`;
    const plainTermBullets = summaryLines
      .filter((line) => line.startsWith('- '))
      .map(toBullet)
      .slice(0, 4);
    const quickInsightBullets = summaryLines
      .filter((line) => line.startsWith('- ') && /insight|drivers|balance|cash movement/i.test(line))
      .map(toBullet)
      .filter((line) => !plainTermBullets.includes(line))
      .slice(0, 2);
    const isSnapshotLine = (line: string) =>
      /^Account:/i.test(line) ||
      /^Statement period:/i.test(line) ||
      /^Opening balance:/i.test(line) ||
      /^Total withdrawals:/i.test(line) ||
      /^Total deposits:/i.test(line) ||
      /^Net change:/i.test(line);
    const nonSnapshotLines = summaryLines.filter(
      (line) =>
        !isSnapshotLine(line) &&
        line !== statementHeader &&
        !/^Categorization status/i.test(line) &&
        !/^What happened:?$/i.test(line) &&
        !/^Quick insight:?$/i.test(line),
    );
    const fallbackPlainBullets = nonSnapshotLines
      .filter((line) => line.length > 0)
      .slice(0, 4)
      .map((line) => `• ${line.replace(/^\-\s*/, '')}`);
    const fallbackQuickBullets = nonSnapshotLines
      .filter((line) => /insight|driver|pattern|trend|balance|cash movement|spend/i.test(line))
      .slice(0, 2)
      .map((line) => `• ${line.replace(/^\-\s*/, '')}`);
    const finalPlainBullets =
      plainTermBullets.length > 0
        ? plainTermBullets
        : fallbackPlainBullets.length > 0
          ? fallbackPlainBullets
          : ['• Transactions imported and categorized successfully.'];
    const finalQuickBullets =
      quickInsightBullets.length > 0
        ? quickInsightBullets
        : fallbackQuickBullets.length > 0
          ? fallbackQuickBullets
          : ['• Ask me for top merchants, unusual charges, and category trends for this period.'];
    const snapshotBullets =
      snapshotLines.length > 0
        ? snapshotLines.map((line) => `• ${line}`)
        : [`• ${statementHeader}`, '• Ask me for top merchants, spending trends, or category totals.'];
    const lines = [
      'Summary Ready',
      intro,
      tagSummary,
      personalClose,
      ...(requestedInstruction
        ? ['', 'REQUEST APPLIED', `• ${requestedInstruction}`]
        : []),
      ...(wantsCategoryBreakdown
        ? ['', 'CATEGORY BREAKDOWN', ...(categoryBullets.length > 0 ? categoryBullets : finalPlainBullets)]
        : []),
      '',
      'STATEMENT SNAPSHOT',
      ...snapshotBullets,
      '',
      'WHAT HAPPENED',
      ...finalPlainBullets,
      '',
      'QUICK INSIGHT',
      ...finalQuickBullets,
      ...clarificationLines,
      '',
      'NEXT ACTIONS',
      '• Review transactions',
      '• Review categories',
      '• Upload another file',
      '• Reply "that\'s it" when this batch is complete',
    ];
    clearLegacyImportRecap();
    streamPrimeFinalMessage({
      messageId,
      content: lines.join('\n'),
      importId: params.importId,
      batchKey: params.batchKey,
    });
    forceAutoPinUntilRef.current = Date.now() + 10000;
    // Force-follow the final Prime summary bubble so the user lands on newest output.
    autoPinToBottomRef.current = true;
    requestAnimationFrame(() => {
      scrollToBottom('auto');
    });
    window.setTimeout(() => {
      scrollToBottom('auto');
    }, 120);
    window.setTimeout(() => {
      scrollToBottom('auto');
    }, 320);
    window.setTimeout(() => {
      scrollToBottom('auto');
    }, 700);
  }, [isPrimeNarrationEnabled, firstName, scrollToBottom, streamPrimeFinalMessage]);

  const processByteUploads = useCallback(async (files: File[]) => {
    if (!files || files.length === 0) return false;
    if (!userId) {
      toast.error('Please log in to upload files');
      return false;
    }
    // Safety: clear stale in-flight keys when uploader is idle so a prior interrupted
    // batch cannot silently suppress new files.
    if (!isUploadingAttachments && inFlightUploadKeysRef.current.size > 0) {
      inFlightUploadKeysRef.current.clear();
    }
    const skippedFiles = files.filter((file) => inFlightUploadKeysRef.current.has(getAttachmentKey(file)));
    if (skippedFiles.length > 0) {
      const preview = skippedFiles.slice(0, 3).map((f) => f.name).join(', ');
      toast(
        `Skipped ${skippedFiles.length} file${skippedFiles.length === 1 ? '' : 's'} already processing: ${preview}${skippedFiles.length > 3 ? ', ...' : ''}`
      );
    }
    const eligibleFiles = files.filter((file) => !inFlightUploadKeysRef.current.has(getAttachmentKey(file)));
    if (eligibleFiles.length === 0) {
      toast('This file upload is already in progress.');
      return false;
    }
    eligibleFiles.forEach((file) => inFlightUploadKeysRef.current.add(getAttachmentKey(file)));
    try {
      const inferUploadKindHint = (list: File[]): string => {
        if (!Array.isArray(list) || list.length === 0) return 'document';
        const first = list[0];
        const name = String(first?.name || '').toLowerCase();
        const type = String(first?.type || '').toLowerCase();
        const hasCardSignals = /visa|mastercard|amex|capital one|statement|card/.test(name);
        const hasBankSignals = /bank|chequing|checking|account statement/.test(name);
        const isPdf = type.includes('pdf') || name.endsWith('.pdf');
        const isImage = type.startsWith('image/') || /\.(jpg|jpeg|png|webp|heic)$/i.test(name);
        const isCsvSheet = /\.(csv|xlsx|xls)$/i.test(name) || type.includes('csv') || type.includes('spreadsheet');
        if (isCsvSheet) return 'statement file';
        if (hasCardSignals) return 'credit card statement';
        if (hasBankSignals) return 'bank statement';
        if (isImage) return 'receipt image';
        if (isPdf) return 'statement PDF';
        return 'document';
      };
      const uploadKindHint = inferUploadKindHint(eligibleFiles);
      const batchKey = mintPrimeBatchKey();
      activePrimeUploadBatchKeyRef.current = batchKey;
      persistPrimeBatchState(batchKey);
      primeTimedOutBatchKeysRef.current.delete(batchKey);
      if (isPrimeNarrationEnabled && typeof window !== 'undefined') {
        const latchKey = `${PRIME_UPLOAD_NARRATION_STARTED_PREFIX}${batchKey}`;
        const alreadyStarted = window.sessionStorage.getItem(latchKey) === '1';
        if (!alreadyStarted) {
          // Intentionally skip the initial top narration bubble.
          // Keep latch semantics so later stage updates still work without duplicates.
          window.sessionStorage.setItem(latchKey, '1');
        }
      }
      setIsUploadingAttachments(true);
      // Upload start should follow the active conversation region.
      userScrolledUpRef.current = false;
      setIsNearBottomState(true);
      autoPinToBottomRef.current = true;
      setUploadError(null);
      setUploadStatus('uploading');
      setUploadStatusMessage('Upload received. Starting processing...');
      setPrimeSelectedUploadFileNames(eligibleFiles.map((file) => file.name).filter(Boolean));
      setShowUploadCard(true);
      requestAnimationFrame(() => {
        scrollToBottom('auto');
      });
      window.setTimeout(() => {
        scrollToBottom('auto');
      }, 80);
      const uploadResults = await smartImport.uploadFiles(userId, eligibleFiles, 'chat');
      const reusedCount = (Array.isArray(uploadResults) ? uploadResults : []).filter((r: any) => r?.reused === true).length;
      if (reusedCount > 0) {
        const total = Array.isArray(uploadResults) ? uploadResults.length : reusedCount;
        toast(
          reusedCount === total
            ? `Duplicate detected: reused ${reusedCount} existing file${reusedCount === 1 ? '' : 's'} (cached processing).`
            : `Duplicate detected: reused ${reusedCount} of ${total} file${total === 1 ? '' : 's'} (cached processing).`
        );
      }
      const importIdsForBatch = Array.from(
        new Set(
          (Array.isArray(uploadResults) ? uploadResults : [])
            .flatMap((result: any) => [
              ...(Array.isArray(result?.importIds) ? result.importIds : []),
              ...(result?.importId ? [result.importId] : []),
              ...(smartImport.lastUploadSummary?.importId ? [smartImport.lastUploadSummary.importId] : []),
            ])
            .map((id: any) => String(id || '').trim())
            .filter(Boolean)
        )
      );
      importIdsForBatch.forEach((importId) => {
        // Re-uploads can reuse the same importId. Reset per-import finalization latches so
        // final summary/insights are posted again for this run.
        primeNarrationFinalizedImportIdsRef.current.delete(importId);
        delete primeFinalSummaryTextByImportRef.current[importId];
        byteParseStatusSentRef.current.delete(importId);
        tagCompleteStatusSentRef.current.delete(importId);
        setInjectedMessages((prev) =>
          prev.filter((msg) => {
            const metaAny = (msg.meta || {}) as any;
            if (metaAny?.importId !== importId) return true;
            return ![
              'prime_upload_final',
              'prime_upload_insights_auto',
              'upload_actor_status',
              'prime_upload_approval',
            ].includes(String(metaAny?.type || ''));
          })
        );
        uploadImportIdToBatchKeyRef.current.set(importId, batchKey);
      });
      setUploadStatus('processing');
      setUploadStatusMessage(`${uploadActorLabels.reader} is extracting transactions...`);
      if (isPrimeNarrationEnabled && batchKey) {
        const totalDocs = Math.max(eligibleFiles.length, importIdsForBatch.length || 0);
        const completedDocs = importIdsForBatch.filter((id) => primeNarrationFinalizedImportIdsRef.current.has(id)).length;
        upsertPrimeUploadNarration({
          batchKey,
          importId: importIdsForBatch[0] || smartImport.lastUploadSummary?.importId,
          text: `Byte is processing ${totalDocs || 1} document${(totalDocs || 1) === 1 ? '' : 's'} (${completedDocs}/${totalDocs || 1} completed).`,
          stages: {
            byte: 'done',
            tag: 'active',
            saving: 'pending',
          },
        });
      }
      setTimeout(() => {
        setUploadStatusMessage(`${uploadActorLabels.categorizer} is categorizing expenses...`);
      }, 500);
      setTimeout(() => {
        setUploadStatusMessage('Saving transactions to your account...');
      }, 900);
      return true;
    } catch (err: any) {
      setUploadError(err?.message || 'Upload failed');
      setUploadStatus(null);
      setUploadStatusMessage(null);
      setPrimeSelectedUploadFileNames([]);
      if (isPrimeNarrationEnabled && activePrimeUploadBatchKeyRef.current) {
        upsertPrimeUploadNarration({
          batchKey: activePrimeUploadBatchKeyRef.current,
          importId: smartImport.lastUploadSummary?.importId,
          text: "I couldn't finish reading this file. Try uploading again with a clearer PDF.",
          stages: {
            byte: 'error',
            tag: 'pending',
            saving: 'pending',
          },
          failed: true,
        });
      }
      toast.error(err?.message || 'Upload failed');
      if (import.meta.env.DEV) {
        warn('[UnifiedAssistantChat] upload failed for batch', { batchKey: activePrimeUploadBatchKeyRef.current });
      }
      return false;
    } finally {
      setIsUploadingAttachments(false);
      eligibleFiles.forEach((file) => inFlightUploadKeysRef.current.delete(getAttachmentKey(file)));
      uploadedAttachmentKeysRef.current.clear();
    }
  }, [
    smartImport,
    userId,
    isUploadingAttachments,
    getAttachmentKey,
    mintPrimeBatchKey,
    persistPrimeBatchState,
    isPrimeNarrationEnabled,
    uploadActorLabels,
    upsertPrimeUploadNarration,
  ]);

  useEffect(() => {
    if (!isPrimeNarrationEnabled) return;

    const importId = String(smartImport.lastUploadSummary?.importId || '').trim();
    const batchKey =
      (importId ? uploadImportIdToBatchKeyRef.current.get(importId) : undefined) ||
      activePrimeUploadBatchKeyRef.current ||
      importId;
    if (!batchKey) return;

    const timeline = importId ? getImportTimeline(importId) : null;
    const timelineTruth = timeline?.truth || null;
    const summaryReadyFromTruth = timelineTruth?.phase === 'summary_ready';
    const summaryReady = Boolean(
      primeSummaryReady &&
      importId &&
      String(primeSummaryReady).trim() === importId
    ) || summaryReadyFromTruth;
    const hasError = Boolean(uploadError || smartImport.uploadStatus?.error) || uploadStep === 'error';
    const isProcessingLike =
      isUploadingAttachments ||
      uploadStep === 'uploading' ||
      uploadStep === 'processing' ||
      (uploadStep === 'completed' && !summaryReady);

    const clearTimer = () => {
      if (primeProcessingTimeoutRef.current !== null) {
        window.clearTimeout(primeProcessingTimeoutRef.current);
        primeProcessingTimeoutRef.current = null;
      }
      primeProcessingTimeoutBatchKeyRef.current = null;
    };

    // Authoritative path: when router timeline truth exists, avoid heuristic timer drift.
    if (timelineTruth) {
      clearTimer();
      return;
    }

    if (!isProcessingLike || hasError || summaryReady) {
      clearTimer();
      return;
    }

    if (primeTimedOutBatchKeysRef.current.has(batchKey)) {
      clearTimer();
      return;
    }

    if (
      primeProcessingTimeoutRef.current !== null &&
      primeProcessingTimeoutBatchKeyRef.current === batchKey
    ) {
      return;
    }

    clearTimer();
    primeProcessingTimeoutBatchKeyRef.current = batchKey;
    primeProcessingTimeoutRef.current = window.setTimeout(() => {
      primeProcessingTimeoutRef.current = null;
      primeProcessingTimeoutBatchKeyRef.current = null;
      if (primeTimedOutBatchKeysRef.current.has(batchKey)) return;
      primeTimedOutBatchKeysRef.current.add(batchKey);
      upsertPrimeUploadNarration({
        batchKey,
        importId: importId || undefined,
        text: "Step 2 of 3: Still processing in background. I’ll notify you automatically when Step 3 (summary ready) is complete.",
        stages: { byte: 'done', tag: 'active', saving: 'active' },
      });
    }, 60000);

    return clearTimer;
  }, [
    isPrimeNarrationEnabled,
    smartImport.lastUploadSummary?.importId,
    smartImport.uploadStatus?.error,
    uploadStep,
    uploadError,
    isUploadingAttachments,
    primeSummaryReady,
    getImportTimeline,
    upsertPrimeUploadNarration,
  ]);

  useEffect(() => {
    if (!isPrimeNarrationEnabled) return;
    const importId = String(smartImport.lastUploadSummary?.importId || '').trim();
    const batchKey =
      (importId ? uploadImportIdToBatchKeyRef.current.get(importId) : undefined) ||
      activePrimeUploadBatchKeyRef.current ||
      importId;
    if (!batchKey) return;
    const timeline = importId ? getImportTimeline(importId) : null;
    const timelineTruth = timeline?.truth || null;
    const hasError = uploadStep === 'error' || Boolean(uploadError || smartImport.uploadStatus?.error);

    let stages: PrimeUploadProgressStages | null = null;
    let text = `Step 1 of 3: Upload received. Step 2 of 3: ${uploadActorLabels.reader} is extracting transactions from your files.`;
    let done = false;
    let failed = false;

    if (hasError) {
      stages = { byte: 'error', tag: 'pending', saving: 'pending' };
      text = "I couldn't finish reading this file. Try uploading again with a clearer PDF.";
      failed = true;
    } else if (timelineTruth) {
      const txCountFromTruth =
        typeof timelineTruth.transactionCount === 'number'
          ? timelineTruth.transactionCount
          : null;
      const needsReviewFromTruth =
        typeof timelineTruth.needsReviewCount === 'number'
          ? timelineTruth.needsReviewCount
          : null;
      stages = buildProgressStagesFromTruth(timelineTruth);
      if (timelineTruth.phase === 'error') {
        const statusLower = String(timelineTruth.status || '').toLowerCase();
        if (statusLower.includes('needs_review_no_input')) {
          text = "No OCR text was detected from this file. I marked it for review so it doesn't keep processing.";
        } else {
          text = "I couldn't finish reading this file. Try uploading again with a clearer PDF.";
        }
        failed = true;
      }
      if (
        importId &&
        !byteParseStatusSentRef.current.has(importId) &&
        (timelineTruth.phase === 'categorizing' || timelineTruth.phase === 'saving' || timelineTruth.phase === 'summary_ready')
      ) {
        const byteText = txCountFromTruth !== null
          ? `${uploadActorLabels.reader} parse complete: ${txCountFromTruth} transaction${txCountFromTruth === 1 ? '' : 's'} extracted.`
          : `${uploadActorLabels.reader} parse complete.`;
        upsertUploadActorStatus({
          actor: 'byte',
          importId,
          batchKey,
          text: byteText,
        });
        byteParseStatusSentRef.current.add(importId);
      }
      if (
        importId &&
        !tagCompleteStatusSentRef.current.has(importId) &&
        (timelineTruth.phase === 'saving' || timelineTruth.phase === 'summary_ready')
      ) {
        const taggedCount = txCountFromTruth !== null
          ? Math.max(txCountFromTruth - Math.max(needsReviewFromTruth || 0, 0), 0)
          : null;
        const tagText = [
          `${uploadActorLabels.categorizer} categorization complete.`,
          taggedCount !== null ? `Tagged: ${taggedCount}.` : null,
          needsReviewFromTruth !== null ? `Flagged for review: ${needsReviewFromTruth}.` : null,
        ].filter(Boolean).join(' ');
        upsertUploadActorStatus({
          actor: 'tag',
          importId,
          batchKey,
          text: tagText,
        });
        tagCompleteStatusSentRef.current.add(importId);
      }
      if (timelineTruth.phase === 'summary_ready') {
        text = 'Prime finalizing: structured summary markdown is ready.';
        done = true;
      } else if (timelineTruth.phase === 'error') {
        // keep text set above
      } else if (timelineTruth.phase === 'saving' || timelineTruth.phase === 'normalizing') {
        text = `Prime update: ${uploadActorLabels.categorizer} finished categorization. Preparing final structured summary markdown.`;
      } else if (timelineTruth.phase === 'categorizing') {
        text = `Step 2 of 3: ${uploadActorLabels.categorizer} is categorizing transactions.`;
      } else {
        text = `Step 2 of 3: ${uploadActorLabels.reader} is reading documents and building your draft breakdown.`;
      }
    } else if (uploadStep === 'completed') {
      const summaryReady = Boolean(
        primeSummaryReady &&
        String(smartImport.lastUploadSummary?.importId || '').trim() === String(primeSummaryReady).trim()
      );
      if (summaryReady) {
        stages = { byte: 'done', tag: 'done', saving: 'done' };
        text = 'Step 3 of 3: Summary ready. I’m preparing your summary now.';
        done = true;
      } else {
        // Do not claim "finished" until the summary handshake is actually ready.
        stages = { byte: 'done', tag: 'active', saving: 'active' };
        text = `Step 2 of 3: Processing in background. ${uploadActorLabels.categorizer} is assigning categories and I will post your full breakdown when complete.`;
      }
    } else if (uploadStep === 'processing' || uploadStep === 'uploading' || isUploadingAttachments) {
      stages = { byte: 'active', tag: 'pending', saving: 'pending' };
      text = `Step 2 of 3: ${uploadActorLabels.reader} is reading documents and building your draft breakdown.`;
    }

    if (!stages) return;
    // Avoid duplicate "Summary ready." bubble: final structured summary message is posted separately.
    const shouldPostNarration = !(PRIME_MINIMAL_UPLOAD_CHAT && !done && !failed) && !done;
    if (PRIME_MINIMAL_UPLOAD_CHAT) {
      if (failed) {
        text = "I couldn't read that file. Try a clearer PDF.";
      } else if (done) {
        text = 'Summary ready.';
      }
    }
    if (shouldPostNarration) {
      upsertPrimeUploadNarration({
        batchKey,
        importId: importId || undefined,
        text,
        stages,
        done,
        failed,
      });
    }
    if ((done || failed) && typeof window !== 'undefined') {
      window.sessionStorage.removeItem(`${PRIME_UPLOAD_NARRATION_STARTED_PREFIX}${batchKey}`);
      setPrimeSelectedUploadFileNames([]);
      if (!failed) {
        setUploadStatus(null);
        setUploadStatusMessage(null);
        setShowUploadCard(false);
      }
    }
  }, [
    isPrimeNarrationEnabled,
    smartImport.lastUploadSummary?.importId,
    primeSummaryReady,
    smartImport.uploadStatus?.error,
    uploadStep,
    uploadError,
    isUploadingAttachments,
    getImportTimeline,
    uploadActorLabels,
    upsertUploadActorStatus,
    upsertPrimeUploadNarration,
    setPrimeSelectedUploadFileNames,
  ]);

  const hasVisiblePrimeFinalForImport = useCallback((importId: string): boolean => {
    const normalizedImportId = String(importId || '').trim();
    if (!normalizedImportId) return false;
    return [...messages, ...loadedHistoryMessages, ...injectedMessages].some((msg) => {
      const metaAny = (msg?.meta || {}) as any;
      return metaAny?.type === 'prime_upload_final' && String(metaAny?.importId || '').trim() === normalizedImportId;
    });
  }, [messages, loadedHistoryMessages, injectedMessages]);

  useEffect(() => {
    if (!isPrimeNarrationEnabled) return;
    if (currentEmployeeSlug !== 'prime-boss') return;
    if (!primeSummaryReady) return;
    let cancelled = false;
    void (async () => {
      const summary = getPrimeSummary(primeSummaryReady);
      const summaryMeta = getPrimeSummaryMeta(primeSummaryReady);
      const summaryText = String(summary?.content || 'Your categorized results and insights are available.').trim();
      const isGenericSummaryText =
        summaryText.includes('ready for your review') ||
        summaryText.includes('categorized results and insights are available');
      const previouslyFinalized = primeNarrationFinalizedImportIdsRef.current.has(primeSummaryReady);
      const previouslyPostedSummary = primeFinalSummaryTextByImportRef.current[primeSummaryReady] || '';
      const alreadyVisible = hasVisiblePrimeFinalForImport(primeSummaryReady);
      if (previouslyFinalized && previouslyPostedSummary === summaryText && alreadyVisible) return;
      if (previouslyFinalized && isGenericSummaryText && alreadyVisible) return;
      const clarificationItems = await loadClarificationCandidates(primeSummaryReady);
      clarificationCandidatesByImportIdRef.current[primeSummaryReady] = clarificationItems;
      if (cancelled) return;

      const parseCount = (pattern: RegExp): number | null => {
        const match = summaryText.match(pattern);
        if (!match?.[1]) return null;
        const value = Number(match[1]);
        return Number.isFinite(value) ? value : null;
      };

      const transactionCount = parseCount(/(\d+)\s+transactions?\s+processed/i) ??
        parseCount(/transactions:\s*(\d+)/i) ??
        null;
      const needsReviewCount = summaryMeta?.needsReviewCount ?? null;
      const autoCount = summaryMeta?.autoCount ?? summaryMeta?.taggedCount ?? null;
      if (!byteParseStatusSentRef.current.has(primeSummaryReady)) {
        const byteText = transactionCount !== null
          ? `${uploadActorLabels.reader} parse complete: ${transactionCount} transaction${transactionCount === 1 ? '' : 's'} extracted.`
          : `${uploadActorLabels.reader} parse complete.`;
        upsertUploadActorStatus({
          actor: 'byte',
          importId: primeSummaryReady,
          text: byteText,
        });
        byteParseStatusSentRef.current.add(primeSummaryReady);
      }
      if (!tagCompleteStatusSentRef.current.has(primeSummaryReady)) {
        const tagText = [
          `${uploadActorLabels.categorizer} categorization complete.`,
          typeof autoCount === 'number' ? `Tagged: ${autoCount}.` : null,
          typeof needsReviewCount === 'number' ? `Flagged for review: ${needsReviewCount}.` : null,
        ].filter(Boolean).join(' ');
        upsertUploadActorStatus({
          actor: 'tag',
          importId: primeSummaryReady,
          text: tagText,
        });
        tagCompleteStatusSentRef.current.add(primeSummaryReady);
      }
      const activeBatchKey =
        uploadImportIdToBatchKeyRef.current.get(primeSummaryReady) ||
        activePrimeUploadBatchKeyRef.current ||
        primeSummaryReady;
      const queuedInstruction =
        primeBatchInstructionRef.current.get(activeBatchKey) ||
        primeBatchInstructionRef.current.get(primeSummaryReady) ||
        primeBatchInstructionRef.current.get('pending') ||
        undefined;
      injectPrimeUploadFinalMessage({
        importId: primeSummaryReady,
        summaryText,
        transactionCount,
        needsReviewCount,
        autoCount,
        aiCount: summaryMeta?.aiCount ?? null,
        clarificationItems,
        batchKey: activeBatchKey,
        customInstruction: queuedInstruction,
      });

      const activeKey = activeBatchKey;
      // Replace in-flight workflow/status bubbles with the final summary bubble.
      setInjectedMessages((prev) =>
        prev.filter((msg) => {
          if (msg.id === `prime-upload-progress-${activeKey}`) return false;
          const metaAny = (msg.meta || {}) as any;
          if (metaAny?.type === 'upload_actor_status' && metaAny?.importId === primeSummaryReady) return false;
          if (metaAny?.type === 'prime_upload_narration' && (metaAny?.importId === primeSummaryReady || metaAny?.batchKey === activeKey)) return false;
          return true;
        })
      );
      if (typeof window !== 'undefined') {
        window.sessionStorage.removeItem(`${PRIME_UPLOAD_NARRATION_STARTED_PREFIX}${activeKey}`);
      }
      primeBatchInstructionRef.current.delete(activeKey);
      primeBatchInstructionRef.current.delete(primeSummaryReady);
      primeBatchInstructionRef.current.delete('pending');
      primeNarrationFinalizedImportIdsRef.current.add(primeSummaryReady);
      primeFinalSummaryTextByImportRef.current[primeSummaryReady] = summaryText;
      const batchImportIds = getImportIdsForBatch(activeKey);
      const batchTotal = batchImportIds.length > 0 ? batchImportIds.length : 1;
      const batchCompleted = batchImportIds.filter((id) => primeNarrationFinalizedImportIdsRef.current.has(id)).length;
      upsertPrimeUploadNarration({
        batchKey: activeKey,
        importId: primeSummaryReady,
        text: `Byte is processing ${batchTotal} document${batchTotal === 1 ? '' : 's'} (${batchCompleted}/${batchTotal} completed).`,
        stages: batchCompleted >= batchTotal
          ? { byte: 'done', tag: 'done', saving: 'done' }
          : { byte: 'done', tag: 'active', saving: 'pending' },
        done: batchCompleted >= batchTotal,
      });
      if (batchImportIds.length > 1 && batchCompleted >= batchImportIds.length) {
        upsertPrimeApprovalCard({
          batchKey: activeKey,
          importIds: batchImportIds,
        });
      }
      // After replacing/removing progress bubbles, force one more bottom lock.
      autoPinToBottomRef.current = true;
      requestAnimationFrame(() => scrollToBottom('auto'));
      window.setTimeout(() => scrollToBottom('auto'), 250);
    })();
    return () => {
      cancelled = true;
    };
  }, [
    isPrimeNarrationEnabled,
    currentEmployeeSlug,
    primeSummaryReady,
    getPrimeSummary,
    getPrimeSummaryMeta,
    loadClarificationCandidates,
    injectPrimeUploadFinalMessage,
    uploadActorLabels,
    upsertUploadActorStatus,
    upsertPrimeUploadNarration,
    getImportIdsForBatch,
    upsertPrimeApprovalCard,
    hasVisiblePrimeFinalForImport,
  ]);

  useEffect(() => {
    if (!isPrimeNarrationEnabled) return;
    if (currentEmployeeSlug !== 'prime-boss') return;
    if (!recentImportId) return;
    const timeline = getImportTimeline(recentImportId);
    if (!timeline?.truth || timeline.truth.phase !== 'summary_ready') return;
    const summary = getPrimeSummary(recentImportId);
    const summaryMeta = getPrimeSummaryMeta(recentImportId);
    const summaryText = String(summary?.content || 'Your categorized results and insights are available.').trim();
    const isGenericSummaryText =
      summaryText.includes('ready for your review') ||
      summaryText.includes('categorized results and insights are available');
    const previouslyFinalized = primeNarrationFinalizedImportIdsRef.current.has(recentImportId);
    const previouslyPostedSummary = primeFinalSummaryTextByImportRef.current[recentImportId] || '';
    const alreadyVisible = hasVisiblePrimeFinalForImport(recentImportId);
    if (previouslyFinalized && previouslyPostedSummary === summaryText && alreadyVisible) return;
    if (previouslyFinalized && isGenericSummaryText && alreadyVisible) return;
    const fallbackBatchKey =
      uploadImportIdToBatchKeyRef.current.get(recentImportId) ||
      activePrimeUploadBatchKeyRef.current ||
      recentImportId;
    injectPrimeUploadFinalMessage({
      importId: recentImportId,
      summaryText,
      transactionCount: null,
      needsReviewCount: summaryMeta?.needsReviewCount ?? timeline.truth.needsReviewCount ?? null,
      autoCount: summaryMeta?.autoCount ?? summaryMeta?.taggedCount ?? null,
      aiCount: summaryMeta?.aiCount ?? null,
      clarificationItems: clarificationCandidatesByImportIdRef.current[recentImportId] || [],
      batchKey: fallbackBatchKey,
    });
    primeNarrationFinalizedImportIdsRef.current.add(recentImportId);
    primeFinalSummaryTextByImportRef.current[recentImportId] = summaryText;
  }, [
    isPrimeNarrationEnabled,
    currentEmployeeSlug,
    recentImportId,
    getImportTimeline,
    getPrimeSummary,
    getPrimeSummaryMeta,
    injectPrimeUploadFinalMessage,
    hasVisiblePrimeFinalForImport,
  ]);

  // Fallback: if timeline reports summary_ready but primeSummaryReady signal is missed
  // (common with reused importIds), still inject the final summary breakdown.
  useEffect(() => {
    if (!isPrimeNarrationEnabled) return;
    if (currentEmployeeSlug !== 'prime-boss') return;
    const targetImportIds = Array.from(
      new Set(
        [
          ...(Array.isArray(recentImportIds) ? recentImportIds : []),
          String(recentImportId || '').trim(),
        ].filter(Boolean)
      )
    );
    if (targetImportIds.length === 0) return;
    let cancelled = false;
    void (async () => {
      for (const importId of targetImportIds) {
        if (!importId || cancelled) continue;
        const timeline = getImportTimeline(importId);
        if (!timeline?.truth || timeline.truth.phase !== 'summary_ready') continue;
        if (primeNarrationFinalizedImportIdsRef.current.has(importId) && hasVisiblePrimeFinalForImport(importId)) continue;
        let summaryText = String(getPrimeSummary(importId)?.content || '').trim();
        const summaryMeta = getPrimeSummaryMeta(importId);
        if (!summaryText) {
          try {
            const response = await fetch('/.netlify/functions/prime-summary', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ importId }),
            });
            if (response.ok) {
              const payload = await response.json().catch(() => ({} as any));
              summaryText = String(payload?.summary || '').trim();
            }
          } catch {
            // Best effort fallback only.
          }
        }
        if (!summaryText) {
          summaryText = 'Your categorized results and insights are available.';
        }
        injectPrimeUploadFinalMessage({
          importId,
          summaryText,
          transactionCount: null,
          needsReviewCount: summaryMeta?.needsReviewCount ?? timeline.truth.needsReviewCount ?? null,
          autoCount: summaryMeta?.autoCount ?? summaryMeta?.taggedCount ?? null,
          aiCount: summaryMeta?.aiCount ?? null,
          clarificationItems: clarificationCandidatesByImportIdRef.current[importId] || [],
          batchKey:
            uploadImportIdToBatchKeyRef.current.get(importId) ||
            activePrimeUploadBatchKeyRef.current ||
            importId,
        });
        primeNarrationFinalizedImportIdsRef.current.add(importId);
        primeFinalSummaryTextByImportRef.current[importId] = summaryText;
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    isPrimeNarrationEnabled,
    currentEmployeeSlug,
    recentImportIds,
    recentImportId,
    getImportTimeline,
    getPrimeSummary,
    getPrimeSummaryMeta,
    injectPrimeUploadFinalMessage,
    hasVisiblePrimeFinalForImport,
  ]);

  // Hard fallback: if summary-ready occurred but no final Prime bubble is visible,
  // fetch and inject once so the chat never appears blank.
  useEffect(() => {
    if (!isPrimeNarrationEnabled) return;
    if (currentEmployeeSlug !== 'prime-boss') return;
    const importId = String(primeSummaryReady || recentImportId || '').trim();
    if (!importId) return;
    if (hasVisiblePrimeFinalForImport(importId)) return;

    const timer = window.setTimeout(() => {
      if (hasVisiblePrimeFinalForImport(importId)) return;
      void (async () => {
        let summaryText = String(getPrimeSummary(importId)?.content || '').trim();
        const summaryMeta = getPrimeSummaryMeta(importId);
        const timeline = getImportTimeline(importId);
        if (!summaryText || summaryText.includes('categorized results and insights are available')) {
          try {
            const response = await fetch('/.netlify/functions/prime-summary', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ importId }),
            });
            if (response.ok) {
              const payload = await response.json().catch(() => ({} as any));
              summaryText = String(payload?.summary || '').trim();
            }
          } catch {
            // Best-effort safety path only.
          }
        }
        if (!summaryText) {
          summaryText = 'Your categorized results and insights are available.';
        }
        injectPrimeUploadFinalMessage({
          importId,
          summaryText,
          transactionCount: null,
          needsReviewCount: summaryMeta?.needsReviewCount ?? timeline?.truth?.needsReviewCount ?? null,
          autoCount: summaryMeta?.autoCount ?? summaryMeta?.taggedCount ?? null,
          aiCount: summaryMeta?.aiCount ?? null,
          clarificationItems: clarificationCandidatesByImportIdRef.current[importId] || [],
          batchKey:
            uploadImportIdToBatchKeyRef.current.get(importId) ||
            activePrimeUploadBatchKeyRef.current ||
            importId,
        });
        primeNarrationFinalizedImportIdsRef.current.add(importId);
        primeFinalSummaryTextByImportRef.current[importId] = summaryText;
      })();
    }, 2200);

    return () => window.clearTimeout(timer);
  }, [
    isPrimeNarrationEnabled,
    currentEmployeeSlug,
    primeSummaryReady,
    recentImportId,
    hasVisiblePrimeFinalForImport,
    getPrimeSummary,
    getPrimeSummaryMeta,
    getImportTimeline,
    injectPrimeUploadFinalMessage,
  ]);

  const routeClarificationFeedback = useCallback(async (messageText: string) => {
    if (!userId) return 0;
    const selectedImportId =
      (recentImportId && clarificationCandidatesByImportIdRef.current[recentImportId]?.length
        ? recentImportId
        : Object.keys(clarificationCandidatesByImportIdRef.current).find(
            (id) => clarificationCandidatesByImportIdRef.current[id]?.length
          )) || '';
    if (!selectedImportId) return 0;
    const candidates = clarificationCandidatesByImportIdRef.current[selectedImportId] || [];
    if (!candidates.length) return 0;

    const lines = String(messageText || '')
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
    const parsed = lines
      .map((line) => line.match(/^(.+?)\s*->\s*([a-zA-Z][a-zA-Z/&\-\s]{1,40})$/))
      .filter((m): m is RegExpMatchArray => Boolean(m));
    if (!parsed.length) return 0;

    let learned = 0;
    for (const match of parsed.slice(0, 5)) {
      const vendorHint = String(match[1] || '').trim().toLowerCase();
      const newCategory = String(match[2] || '').trim();
      if (!vendorHint || !newCategory) continue;
      const hit = candidates.find((item) => item.vendor.toLowerCase().includes(vendorHint));
      if (!hit?.transactionId) continue;
      try {
        const response = await fetch('/.netlify/functions/tag-learn', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': userId,
          },
          body: JSON.stringify({
            userId,
            transactionId: hit.transactionId,
            merchant: hit.vendor || null,
            description: hit.vendor || null,
            oldCategory: 'Uncategorized',
            newCategory,
          }),
        });
        if (response.ok) learned += 1;
      } catch {
        // Best effort only; keep main chat flow uninterrupted.
      }
    }
    return learned;
  }, [userId, recentImportId]);

  const normalizeUploadFiles = useCallback((files: File[]): File[] => {
    if (!files || files.length === 0) return [];
    const deduped: File[] = [];
    const seen = new Set<string>();
    for (const file of files) {
      const key = getAttachmentKey(file);
      if (seen.has(key)) continue;
      seen.add(key);
      deduped.push(file);
      if (deduped.length >= MAX_CHAT_UPLOAD_FILES) break;
    }
    return deduped;
  }, [getAttachmentKey]);

  const enqueueUploads = useCallback((files: File[]) => {
    const incoming = normalizeUploadFiles(files);
    if (incoming.length === 0) return;
    const merged = [...pendingUploadFilesRef.current];
    const seen = new Set(merged.map(getAttachmentKey));
    for (const file of incoming) {
      const key = getAttachmentKey(file);
      if (seen.has(key)) continue;
      if (merged.length >= MAX_CHAT_UPLOAD_FILES) break;
      seen.add(key);
      merged.push(file);
    }
    pendingUploadFilesRef.current = merged;
    setQueuedUploadCount(merged.length);
    setUploadStatus('processing');
    setUploadStatusMessage('Preparing your summary...');
  }, [getAttachmentKey, normalizeUploadFiles]);

  const approvePrimeBatchImport = useCallback(async (batchKey: string, importIds: string[]) => {
    const uniqueImportIds = Array.from(new Set((importIds || []).map((id) => String(id || '').trim()).filter(Boolean)));
    if (!userId || !batchKey || uniqueImportIds.length === 0) return;
    setApprovingBatchKey(batchKey);
    try {
      const authHeaders = await buildAuthHeaders();
      const approveResponse = await fetch('/.netlify/functions/approve-import', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ importIds: uniqueImportIds }),
      });
      const approvePayload = await approveResponse.json().catch(() => ({} as any));
      if (!approveResponse.ok || approvePayload?.ok === false) {
        throw new Error(String(approvePayload?.error || approvePayload?.message || 'Batch approval failed'));
      }

      const response = await fetch('/.netlify/functions/commit-import', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ importIds: uniqueImportIds }),
      });
      const payload = await response.json().catch(() => ({} as any));
      const committedRows = Array.isArray(payload?.committed) ? payload.committed : [];
      const committedCount = committedRows.reduce((sum: number, row: any) => sum + Number(row?.transactionCount || 0), 0);
      if (!response.ok || payload?.ok === false) {
        throw new Error(String(payload?.error || payload?.message || 'Batch commit failed'));
      }

      setInjectedMessages((prev) => [
        ...prev,
        {
          id: `prime-approval-committed-${batchKey}-${Date.now()}`,
          role: 'assistant',
          content: `Imported ${committedCount} transaction${committedCount === 1 ? '' : 's'} from ${uniqueImportIds.length} document${uniqueImportIds.length === 1 ? '' : 's'}.`,
          createdAt: new Date().toISOString(),
          meta: {
            type: 'prime_upload_final',
            batchKey,
            importId: uniqueImportIds[0],
            targetEmployeeSlug: 'prime-boss',
            ctas: [
              { label: 'Review Transactions', to: '/dashboard/transactions' },
              { label: 'Review Categories', to: '/dashboard/smart-categories' },
            ],
            hideTimestamp: true,
          },
        },
      ]);
      toast.success('Batch imported successfully');
    } catch (error: any) {
      toast.error(error?.message || 'Batch import failed');
    } finally {
      setApprovingBatchKey(null);
    }
  }, [buildAuthHeaders, userId]);

  const handlePrimeBatchReviewSummaries = useCallback(() => {
    autoPinToBottomRef.current = true;
    requestAnimationFrame(() => scrollToBottom('auto'));
  }, [scrollToBottom]);

  const cancelPrimeBatchApproval = useCallback((batchKey: string) => {
    if (!batchKey) return;
    if (activePrimeUploadBatchKeyRef.current === batchKey) {
      closeActivePrimeBatchKey();
    }
    setInjectedMessages((prev) => [
      ...prev,
      {
        id: `prime-approval-cancelled-${batchKey}-${Date.now()}`,
        role: 'assistant',
        content: 'Batch cancelled. Nothing was imported.',
        createdAt: new Date().toISOString(),
        meta: {
          type: 'prime_upload_narration',
          batchKey,
          done: true,
          failed: false,
          hideTimestamp: true,
        },
      },
    ]);
  }, [closeActivePrimeBatchKey]);

  const handleAttachmentsChange = useCallback(async (files: File[]) => {
    if (!supportsChatUploads || files.length === 0) return;
    const limitedFiles = normalizeUploadFiles(files);
    if (files.length > MAX_CHAT_UPLOAD_FILES) {
      toast.error(`Please upload up to ${MAX_CHAT_UPLOAD_FILES} files at a time.`);
    }
    const pendingFiles = limitedFiles.filter((file) => !uploadedAttachmentKeysRef.current.has(getAttachmentKey(file)));
    if (pendingFiles.length === 0) return;
    if (isStreaming || inFlightTurnRef.current) {
      enqueueUploads(pendingFiles);
      toast('Prime will start this upload after the current response.');
      return;
    }
    const uploaded = await processByteUploads(pendingFiles);
    if (uploaded) {
      pendingFiles.forEach((file) => {
        uploadedAttachmentKeysRef.current.add(getAttachmentKey(file));
      });
    }
  }, [supportsChatUploads, normalizeUploadFiles, getAttachmentKey, isStreaming, enqueueUploads, processByteUploads]);

  useEffect(() => {
    if (!supportsChatUploads) return;
    if (isStreaming || isUploadingAttachments) return;
    const queued = pendingUploadFilesRef.current;
    if (!queued.length) return;
    pendingUploadFilesRef.current = [];
    setQueuedUploadCount(0);
    void (async () => {
      const uploaded = await processByteUploads(queued);
      if (uploaded) {
        queued.forEach((file) => {
          uploadedAttachmentKeysRef.current.add(getAttachmentKey(file));
        });
      }
    })();
  }, [supportsChatUploads, isStreaming, isUploadingAttachments, processByteUploads, getAttachmentKey]);

  const handleSend = async (options?: { attachments?: File[] }) => {
    const attachments = options?.attachments ?? [];
    const hasAttachments = attachments.length > 0;
    const trimmedMessage = inputMessage.trim();
    const isPrimeUploadInstructionTurn =
      Boolean(trimmedMessage) &&
      hasAttachments &&
      isPrimeNarrationEnabled &&
      currentEmployeeSlug === 'prime-boss';
    if (!trimmedMessage && !hasAttachments) return;

    if (inFlightTurnRef.current) {
      if (import.meta.env.DEV) {
        console.warn('[UnifiedAssistantChat] 🚫 Send blocked - inFlight');
      }
      return;
    }
    // Block normal send if already streaming/loading (hook also checks this, but early return for UX)
    // Attachments can be queued safely while streaming.
    if (isStreaming && !hasAttachments) {
      if (import.meta.env.DEV) {
        console.warn('[UnifiedAssistantChat] 🚫 Send blocked - already streaming');
      }
      return;
    }

    if (!hasAttachments && isPrimeNarrationEnabled && currentEmployeeSlug === 'prime-boss' && isPrimeBatchCloseIntent(trimmedMessage)) {
      const closedBatchKey = closeActivePrimeBatchKey();
      if (closedBatchKey) {
        const closeMessageId = `prime-upload-batch-closed-${closedBatchKey}`;
        setInjectedMessages((prev) => {
          if (prev.some((msg) => msg.id === closeMessageId)) return prev;
          return [
            ...prev,
            {
              id: closeMessageId,
              role: 'assistant',
              content: 'Batch closed. If you upload more documents later, I will start a new batch and keep your previous batch summary unchanged.',
              createdAt: new Date().toISOString(),
              meta: {
                type: 'prime_upload_batch_closed',
                targetEmployeeSlug: 'prime-boss',
                batchKey: closedBatchKey,
                hideTimestamp: true,
              },
            },
          ];
        });
      }
    }
    
    if (hasAttachments) {
      let queuedInstructionAcked = false;
      if (isPrimeUploadInstructionTurn) {
        const pendingBatchKey = ensureActivePrimeBatchKey();
        primeBatchInstructionRef.current.set(pendingBatchKey, trimmedMessage);
        if (recentImportId) {
          primeBatchInstructionRef.current.set(recentImportId, trimmedMessage);
        } else {
          primeBatchInstructionRef.current.set('pending', trimmedMessage);
        }
        const instructionPreview =
          trimmedMessage.length > 160 ? `${trimmedMessage.slice(0, 157)}...` : trimmedMessage;
        const holdAckId = `prime-upload-queued-ack-${pendingBatchKey}-${Date.now()}`;
        setInjectedMessages((prev) => {
          if (prev.some((msg) => msg.id === holdAckId)) return prev;
          return [
            ...prev,
            {
              id: holdAckId,
              role: 'assistant',
              content: `Understood. You asked: "${instructionPreview}"\n\nUpload started. I will apply this request and return findings as soon as processing completes.`,
              createdAt: new Date().toISOString(),
              meta: {
                type: 'prime_upload_hold_ack',
                importId: recentImportId,
                batchKey: pendingBatchKey,
                targetEmployeeSlug: 'prime-boss',
                hideTimestamp: true,
              },
            },
          ];
        });
        setInputMessage('');
        queuedInstructionAcked = true;
        autoPinToBottomRef.current = true;
        requestAnimationFrame(() => scrollToBottom('auto'));
      }
      if (!supportsChatUploads) {
        toast.error('File uploads are not available in this chat.');
        return;
      }
      const limitedFiles = normalizeUploadFiles(attachments);
      if (attachments.length > MAX_CHAT_UPLOAD_FILES) {
        toast.error(`Please upload up to ${MAX_CHAT_UPLOAD_FILES} files at a time.`);
      }
      const pendingFiles = limitedFiles.filter((file) => !uploadedAttachmentKeysRef.current.has(getAttachmentKey(file)));
      if (pendingFiles.length > 0) {
        if (isStreaming || inFlightTurnRef.current) {
          enqueueUploads(pendingFiles);
          toast('Prime queued your upload and will start it right after this response.');
          if (!trimmedMessage || isPrimeUploadInstructionTurn) return;
        } else {
          const uploaded = await processByteUploads(pendingFiles);
          if (!uploaded) return;
          pendingFiles.forEach((file) => {
            uploadedAttachmentKeysRef.current.add(getAttachmentKey(file));
          });
        }
      }
      if (queuedInstructionAcked) {
        return;
      }
      if (!trimmedMessage) return;
    }

    try {
      inFlightTurnRef.current = true;
      setIsAssistantReplyPending(true);
      
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
      autoPinToBottomRef.current = true;
      // Scroll will happen automatically via the auto-scroll effect when message is added
      
      let finalMessage = trimmedMessage;
      if (finalMessage) {
        const routedCount = await routeClarificationFeedback(finalMessage);
        if (routedCount > 0) {
          const feedbackAckId = `prime-clarification-feedback-${Date.now()}`;
          setInjectedMessages((prev) => {
            if (prev.some((msg) => msg.id === feedbackAckId)) return prev;
            return [
              ...prev,
              {
                id: feedbackAckId,
                role: 'assistant',
                content: `Thanks - I recorded ${routedCount} clarification update${routedCount === 1 ? '' : 's'} and will use this to improve your categories.`,
                createdAt: new Date().toISOString(),
                meta: {
                  type: 'prime_clarification_ack',
                  importId: recentImportId || undefined,
                  targetEmployeeSlug: 'prime-boss',
                  hideTimestamp: true,
                },
              },
            ];
          });
        }
      }
      
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
    } finally {
      setIsAssistantReplyPending(false);
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
    if (!supportsChatUploads) return;
    if (import.meta.env.DEV) {
      debug('[UnifiedAssistantChat] Upload started', { fileCount: files.length });
    }
    const limitedFiles = normalizeUploadFiles(files);
    if (files.length > MAX_CHAT_UPLOAD_FILES) {
      toast.error(`Please upload up to ${MAX_CHAT_UPLOAD_FILES} files at a time.`);
    }
    console.debug('[UnifiedAssistantChat] Upload started', { fileCount: limitedFiles.length });
    if (isStreaming || inFlightTurnRef.current) {
      enqueueUploads(limitedFiles);
      toast('Prime queued your upload and will start it after the current response.');
      return;
    }
    await processByteUploads(limitedFiles);
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
  const postImportDisabledNoticeSentRef = useRef<Set<string>>(new Set());
  
  useEffect(() => {
    if (disableRuntime || !userId) return;

    const handleByteImportCompleted = (payload: { importId: string; userId: string; timestamp: string }) => {
      // QUIET MODE GATE: Skip post-import triggers if disabled
      const disabled = isPostImportTriggersDisabled();
      if (disabled) {
        const noticeKey = `${userId}:${payload.importId}:post-import-disabled`;
        if (postImportDisabledNoticeSentRef.current.has(noticeKey)) {
          return;
        }
        postImportDisabledNoticeSentRef.current.add(noticeKey);

        setInjectedMessages((prev) => {
          if (prev.some((msg) => msg.meta?.isPostImportDisabledNotice && msg.meta?.importId === payload.importId)) {
            return prev;
          }
          return [
            ...prev.filter((msg) => !msg.meta?.isSummaryPending),
            {
              id: `post-import-disabled-${payload.importId}`,
              role: 'assistant',
              content:
                "Upload complete. Auto follow-up is disabled in this environment (`VITE_DISABLE_POST_IMPORT_TRIGGERS=true`). Your file is uploaded, but Prime won't post the next summary step until that flag is turned off.",
              createdAt: new Date().toISOString(),
              meta: {
                isSummary: true,
                isPostImportDisabledNotice: true,
                importId: payload.importId,
                targetEmployeeSlug: currentEmployeeSlug,
              },
            },
          ];
        });

        setTimeout(() => {
          scrollToBottom('smooth');
        }, 100);
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
  }, [isByte, currentEmployeeSlug, userId, disableRuntime, sendMessage, scrollToBottom]);

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
    // Don't flash the greeting while history is still hydrating — it will disappear
    // the moment loadedHistoryMessages arrives, causing a visible "shoots up" glitch.
    if (isLoadingHistory) return null;
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
        if (isPrimeChatUiRefinementsEnabled) {
          greetingText = [
            'Welcome to Prime.',
            'Import a statement to begin, or ask a finance question anytime.',
          ].join('\n');
        } else {
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
        }
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
        if (isPrimeChatUiRefinementsEnabled) {
          // MVP refinement: keep Prime greeting to two lines max (calm, concise, trust-first).
          const variant = primeGreetingVariantRef.current;
          const welcomeLine = userName && userName !== 'there'
            ? `Welcome back, ${userName}.`
            : 'Welcome back.';
          const snapshotLine = bullets.length > 0
            ? `Snapshot: ${bullets[0].replace(/^•\s*/, '')}.`
            : 'Your latest snapshot is ready.';
          const secondLineOptions = [
            `${snapshotLine} Import a statement or ask a question.`,
            'Import a statement when you are ready, or ask me anything about your finances.',
            'Want a quick review, insights, or a fresh upload? I can start either.',
            'I am ready to help. Upload a file or ask for your next best money move.',
          ];
          greetingText = [
            welcomeLine,
            secondLineOptions[variant] || secondLineOptions[0],
          ].join('\n');
        } else if (isPrimeChatRevampEnabled) {
          const welcomeLine = userName && userName !== 'there'
            ? `Welcome back, ${userName}. Your latest snapshot is ready.`
            : 'Welcome back. Your latest snapshot is ready.';
          greetingText = [
            welcomeLine,
            ...(bullets.length > 0 ? ['', `Here's where we left off:`, ...bullets] : []),
            ``,
            'Want to import a statement, review categories, or ask a question?',
          ].join('\n');
        } else {
          greetingText = [
            `Welcome back, ${userName}. 👋`,
            `I've been keeping things organized while you were away.`,
            ...(bullets.length > 0 ? ['', `Here's where we left off:`, ...bullets] : ['', `I can pull a fresh snapshot whenever you're ready.`]),
            ``,
            `What would you like to focus on today - quick review, insights, or something new?`,
          ].join('\n');
        }
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
  }, [isHandoff, isOpen, isLoadingHistory, isStreaming, hasAnyMessages, currentEmployeeSlug, resolvedThreadId, conversationId, profile, user, firstName, messages, loadedHistoryMessages, primeState, engineReadyLatched, primeOnboardingCompleted, userId, isPrimeChatRevampEnabled, isPrimeChatUiRefinementsEnabled]);

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
      if (currentEmployeeSlug === 'prime-boss') {
        primeGreetingVariantRef.current = (primeGreetingVariantRef.current + 1) % 4;
      }
      return;
    }
    if (userClosedRef.current) {
      greetedThisOpenRef.current = false;
    }
  }, [isOpen, currentEmployeeSlug]);

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
    const aMeta: any = a?.meta || {};
    const bMeta: any = b?.meta || {};
    const activeBatchKey = activePrimeUploadBatchKeyRef.current;
    const isActivePrimeNarration = (meta: any) =>
      meta?.type === 'prime_upload_narration' &&
      meta?.done !== true &&
      (!activeBatchKey || String(meta?.batchKey || '') === String(activeBatchKey));
    const aActiveNarration = isActivePrimeNarration(aMeta);
    const bActiveNarration = isActivePrimeNarration(bMeta);
    if (aActiveNarration !== bActiveNarration) {
      // Keep active upload narration anchored near the newest messages.
      return aActiveNarration ? 1 : -1;
    }

    const aTime = getMessageSortTime(a);
    const bTime = getMessageSortTime(b);
    if (aTime && bTime) {
      return aTime - bTime;
    }
    // Keep untimed optimistic/placeholder messages at the end so
    // streaming/typing visuals appear below the existing conversation.
    if (aTime && !bTime) return -1;
    if (!aTime && bTime) return 1;
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
  const dedupeStats = {
    byId: 0,
    byClientId: 0,
    byHardKey: 0,
    dropped: 0,
  };
  
  orderedMessages.forEach(msg => {
    if (!msg) return;

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

  // During upload/summary lifecycle, always follow newest message updates.
  useEffect(() => {
    if (!isOpen) return;
    if (userScrolledUpRef.current) return;
    if (!(Date.now() < forceAutoPinUntilRef.current || autoPinToBottomRef.current || isStreaming || isUploadingAttachments || isPrimeSummaryPending || isAssistantReplyPending)) return;
    requestAnimationFrame(() => {
      scrollToBottom('auto');
    });
  }, [isOpen, renderMessages.length, isStreaming, isUploadingAttachments, isPrimeSummaryPending, isAssistantReplyPending, scrollToBottom]);
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
  // Keep all rendered messages from the primary dedupe pass.
  // A second global text-equality dedupe was hiding legitimate repeated replies.
  const contentDedupedMessages = renderMessages;
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

  const latestPrimeUploadHandoffText = useMemo(() => {
    if (normalizedSlug !== 'prime-boss') return '';
    const newestFirst = [...burstDedupedMessages].reverse();
    for (const msg of newestFirst) {
      if (!msg || msg.role !== 'assistant') continue;
      const content = String(msg.content || '').trim();
      if (!content) continue;
      const metaAny = msg.meta as any;
      const isUploadNarration = metaAny?.type === 'prime_upload_narration';
      const isHandoffMeta = metaAny?.isHandoff === true;
      const looksLikePrimeHandoff =
        content.toLowerCase().startsWith('prime handoff:') ||
        (content.toLowerCase().includes('upload received') && content.toLowerCase().includes('handing this'));
      if (isUploadNarration || isHandoffMeta || looksLikePrimeHandoff) {
        return content;
      }
    }
    return '';
  }, [normalizedSlug, burstDedupedMessages]);
  
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

  const PENDING_IMPORT_RECAP_KEY = 'xspenses:pending_import_recap';
  const getDeliveredRecapKey = (importId: string) => `xspenses:import_recap_delivered:${importId}`;
  const tryInjectImportRecap = useCallback(() => {
    if (typeof window === 'undefined') return;
    if (isPrimeNarrationEnabled) return;
    if (currentEmployeeSlug !== 'prime-boss') return;
    if (isStreaming || hasStreamingAssistantBubble) return;

    let pending: any = null;
    try {
      const raw = window.localStorage.getItem(PENDING_IMPORT_RECAP_KEY);
      if (!raw) return;
      pending = JSON.parse(raw);
    } catch {
      return;
    }

    const importId = String(pending?.importId || '').trim();
    const recapText = String(pending?.recapText || '').trim();
    if (!importId || !recapText) return;

    const deliveredKey = getDeliveredRecapKey(importId);
    if (window.localStorage.getItem(deliveredKey) === '1') {
      window.localStorage.removeItem(PENDING_IMPORT_RECAP_KEY);
      return;
    }

    const recapAlreadyInMessages =
      [...messages, ...loadedHistoryMessages, ...injectedMessages].some((msg) => (
        (
          msg?.meta?.type === 'import_recap' ||
          msg?.meta?.type === 'prime_upload_final'
        ) &&
        msg?.meta?.importId === importId
      ));
    if (recapAlreadyInMessages) {
      window.localStorage.setItem(deliveredKey, '1');
      window.localStorage.removeItem(PENDING_IMPORT_RECAP_KEY);
      return;
    }

    setInjectedMessages((prev) => {
      if (prev.some((msg) => msg.meta?.type === 'import_recap' && msg.meta?.importId === importId)) {
        return prev;
      }
      return [
        ...prev,
        {
          id: `import-recap-${importId}`,
          role: 'assistant',
          content: recapText,
          createdAt: new Date().toISOString(),
          meta: {
            type: 'import_recap',
            importId,
            source: 'prime-router',
          },
        },
      ];
    });

    window.localStorage.setItem(deliveredKey, '1');
    window.localStorage.removeItem(PENDING_IMPORT_RECAP_KEY);
    if (import.meta.env.DEV) {
      debug('[UnifiedAssistantChat] import recap injected', { importId });
    }
    setTimeout(() => {
      scrollToBottom('smooth');
    }, 120);
  }, [
    isPrimeNarrationEnabled,
    currentEmployeeSlug,
    isStreaming,
    hasStreamingAssistantBubble,
    messages,
    loadedHistoryMessages,
    injectedMessages,
    scrollToBottom,
  ]);

  useEffect(() => {
    tryInjectImportRecap();
    const onRecapReady = () => {
      tryInjectImportRecap();
    };
    window.addEventListener('xspenses:import_recap_ready', onRecapReady as EventListener);
    return () => {
      window.removeEventListener('xspenses:import_recap_ready', onRecapReady as EventListener);
    };
  }, [tryInjectImportRecap]);

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
      setIsAssistantReplyPending(true);
      if (typingStallTimeoutRef.current !== null) {
        clearTimeout(typingStallTimeoutRef.current);
        typingStallTimeoutRef.current = null;
      }
      return;
    }
    if (streamStartedRef.current) {
      inFlightTurnRef.current = false;
      streamStartedRef.current = false;
      setIsAssistantReplyPending(false);
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
        setIsAssistantReplyPending(false);
        toast.error('No response yet. Please try again.');
      }
      typingStallTimeoutRef.current = null;
    }, 10000);
  }, [isStreaming, cancelStream]);

  useEffect(() => {
    inFlightTurnRef.current = false;
    streamStartedRef.current = false;
    setIsAssistantReplyPending(false);
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
  const isPrimeWideToggleEnabled = isPrimeChatRevampEnabled && isPrime;
  const effectiveExpanded = isPrimeWideToggleEnabled ? isExpanded : false;
  useEffect(() => {
    if (!isPrimeWideToggleEnabled) return;
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(PRIME_CHAT_WIDE_STORAGE_KEY, isExpanded ? '1' : '0');
    } catch {
      // Ignore localStorage access failures.
    }
  }, [isPrimeWideToggleEnabled, isExpanded]);
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

  // Status badge - Prime uses a single "Protected" chip with details tooltip.
  const statusBadge = normalizedSlug === 'prime-boss' ? (
    <div className="relative group">
      <button
        type="button"
        className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/35 bg-emerald-500/10 px-3 py-1 text-[11px] font-medium text-emerald-200"
        title={`Online: Yes\nAI Ready: ${chatReady ? 'Yes' : 'No'}\nCustodian Ready: ${custodianReady ? 'Yes' : 'No'}`}
      >
        <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
        <span>{guardrailsActive || piiProtectionActive ? 'Protected' : 'Secured'}</span>
      </button>
      <div className="pointer-events-none absolute right-0 top-full z-30 mt-2 min-w-[170px] rounded-lg border border-white/10 bg-slate-950/95 px-3 py-2 text-[11px] text-slate-200 opacity-0 shadow-xl transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100">
        <p>Online: Yes</p>
        <p>AI Ready: {chatReady ? 'Yes' : 'No'}</p>
        <p>Custodian Ready: {custodianReady ? 'Yes' : 'No'}</p>
      </div>
    </div>
  ) : (
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
        return isPrimeChatRevampEnabled && normalizedSlug === 'prime-boss'
          ? 'Secure • Guardrails active'
          : 'Secured • Guardrails + PII protection active';
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
        return isPrimeChatRevampEnabled && normalizedSlug === 'prime-boss'
          ? 'Secure • Guardrails active'
          : 'Secured • Guardrails + PII protection active';
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
  const primeNarrationStatusText =
    isPrimeNarrationEnabled && !isStreaming && !inFlightTurnRef.current
      ? (primeNarrationText || uploadStatusMessage)
      : uploadStatusMessage;
  
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

  const inputFooter = (
    <div ref={inputFooterRef} className="w-full max-w-full mx-0 min-w-0 shrink-0 flex flex-col">
      {showPrimeUploadQueueCard && normalizedSlug === 'prime-boss' && (latestPrimeUploadHandoffText || primeNarrationStatusText) && (
        <div className="mb-2 rounded-lg border border-purple-500/35 bg-slate-900/80 px-3 py-2">
          <div className="text-[10px] uppercase tracking-wide text-purple-300/90">Latest update</div>
          <div className="mt-1 text-[11px] leading-relaxed text-slate-100 line-clamp-2">
            {latestPrimeUploadHandoffText || primeNarrationStatusText}
          </div>
        </div>
      )}
      {showPrimeUploadQueueCard && normalizedSlug === 'prime-boss' && (
        <div className="mb-2 rounded-lg border border-sky-500/35 bg-slate-900/75 px-3 py-2">
          <div className="flex items-center justify-between gap-2 text-[11px] text-slate-200">
            <span>
              Processing {primeUploadDisplayCount} document{primeUploadDisplayCount === 1 ? '' : 's'}
            </span>
            {primeUploadTotalCount > 0 && (
              <span className="text-slate-400">
                {Math.max(primeUploadCurrentCount, 0)}/{primeUploadTotalCount}
              </span>
            )}
          </div>
          <div className="mt-1 text-[10px] text-slate-400">
            Byte is extracting transactions. Prime will post the full summary when ready.
          </div>
          {primeUploadNamesForCard.length > 0 && (
            <div className="mt-1 max-h-20 overflow-y-auto space-y-1 pr-1">
              {primeUploadNamesForCard.map((fileName, idx) => (
                <div key={`${fileName}-footer-${idx}`} className="flex items-center justify-between gap-2 text-[10px]">
                  <span className="truncate text-slate-300">{fileName}</span>
                  <span className="uppercase tracking-wide text-slate-400">
                    {isPrimeUploadFlowActive ? 'in progress' : 'queued'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      <ChatInputBar
        value={inputMessage}
        onChange={setInputMessage}
        onSubmit={handleSend}
        onAttachmentsChange={isByte ? handleAttachmentsChange : undefined}
        placeholder={
          normalizedSlug === 'prime-boss'
            ? 'Ask Prime anything... Try: Import statement, Show insights, Review categories'
            : `Ask ${displayConfig.chatTitle.split('—')[0].trim()} anything...`
        }
        isStreaming={isStreaming}
        sendButtonGradient={sendButtonGradient}
        sendButtonGlow={sendButtonGlow}
        guardrailsStatus={uploadError || guardrailsStatusText}
        guardrailsLastChecked={guardrailsLastChecked || undefined}
        guardrailsQuiet={isPrimeChatRevampEnabled && normalizedSlug === 'prime-boss'}
        showPlusIcon={isByte || normalizedSlug === 'prime-boss'}
        attachmentsEnabled={supportsChatUploads}
        showAttachmentChips={!isByte}
        isAttachmentUploading={
          isUploadingAttachments ||
          smartImport.uploadStatus?.step === 'uploading' ||
          smartImport.uploadStatus?.step === 'processing'
        }
        attachmentUploadProgress={uploadProgressValue}
        allowAttachmentsWhileStreaming={supportsChatUploads}
        // Prime users expect statement uploads to begin immediately after file selection.
        autoSubmitOnAttachmentSelect={normalizedSlug === 'prime-boss'}
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
            <div className={(compact ? "px-4 pt-3 pb-3" : "px-4 pt-4 pb-4") + " relative"}>
            {showCenteredUploadIndicator && (
              <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
                <div className="rounded-2xl border border-white/15 bg-slate-950/80 px-5 py-4 backdrop-blur-md shadow-2xl shadow-black/40">
                  <div className="flex flex-col items-center gap-2">
                    <div className="relative h-16 w-16">
                      <svg viewBox="0 0 36 36" className="h-16 w-16 -rotate-90">
                        <path
                          d="M18 2.5a15.5 15.5 0 1 1 0 31a15.5 15.5 0 1 1 0-31"
                          fill="none"
                          stroke="rgba(148,163,184,0.25)"
                          strokeWidth="3"
                        />
                        <path
                          d="M18 2.5a15.5 15.5 0 1 1 0 31a15.5 15.5 0 1 1 0-31"
                          fill="none"
                          stroke="rgb(56,189,248)"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeDasharray={`${uploadProgressValue}, 100`}
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-sky-300">
                        {uploadProgressValue}%
                      </div>
                    </div>
                    <div className="text-xs text-slate-200">{uploadCircleLabel}</div>
                  </div>
                </div>
              </div>
            )}
            <div className="w-full max-w-full mx-0 min-w-0 space-y-3">
              {/* Messages list - greeting is now a message row, no separate welcome region */}
              <div className="space-y-3">
                {/* Status indicator */}
                {uploadStatus && !(normalizedSlug === 'prime-boss' && showPrimeUploadQueueCard) && (
                  <div className="shrink-0">
                    <StatusIndicator status={uploadStatus} message={primeNarrationStatusText || undefined} />
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
                {!isByte && !isPrimeNarrationEnabled && primeSummaryReady && !injectedMessages.some((msg) => msg.meta?.isSummary && msg.meta?.importId === primeSummaryReady) && (
                  <div className="px-4 pb-2">
                    <PrimeSummaryReadyStrip
                      summaryText={(getPrimeSummary(primeSummaryReady)?.content || 'Your categorized results and insights are available.').trim()}
                      needsReviewCount={getPrimeSummaryMeta(primeSummaryReady)?.needsReviewCount ?? null}
                      taggedCount={getPrimeSummaryMeta(primeSummaryReady)?.taggedCount ?? null}
                      autoCount={getPrimeSummaryMeta(primeSummaryReady)?.autoCount ?? null}
                      aiCount={getPrimeSummaryMeta(primeSummaryReady)?.aiCount ?? null}
                      tagRan={getPrimeSummaryMeta(primeSummaryReady)?.tagRan ?? null}
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
          top: 0,
          bottom: 0,
          left: viewportInsetLeftPx,
          right: viewportInsetRightPx,
          zIndex: 80, // Above floating rail (z-[60])
          display: 'flex',
          justifyContent: panelPlacement === 'center' ? 'center' : 'flex-end',
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
            animate={{ opacity: showPrimeOnboarding && !primeOnboardingCompleted ? 0.85 : (normalizedSlug === 'prime-boss' ? (effectiveExpanded ? 0.76 : 0.64) : (effectiveExpanded ? 0.62 : 0.5)) }}
            exit={{ opacity: 0 }}
            transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.45, ease: 'easeOut' }}
            className={`absolute inset-0 ${showPrimeOnboarding && !primeOnboardingCompleted ? 'bg-black/80 backdrop-blur-xl' : (normalizedSlug === 'prime-boss' ? 'bg-black/65 backdrop-blur-md' : 'bg-black/50 backdrop-blur-sm')}`}
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
              headerActions={
                <div className="inline-flex items-center gap-2">
                  {utilityActions}
                  {isPrimeWideToggleEnabled ? (
                    <button
                      type="button"
                      onClick={() => setExpandedState(!isExpanded)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700/80 bg-slate-900/70 text-slate-300 transition-colors hover:bg-slate-800 hover:text-slate-100"
                      aria-label={isExpanded ? 'Use standard width' : 'Expand chat'}
                      title={isExpanded ? 'Use standard width' : 'Expand chat'}
                    >
                      {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                    </button>
                  ) : null}
                </div>
              }
              onClose={() => {
                // Abort any in-flight requests before closing
                cancelStream();
                userClosedRef.current = true;
                onClose?.();
              }}
              showGuardrailsBanner={false}
              welcomeRegion={combinedWelcomeRegion}
              footer={inputFooter}
              isExpanded={effectiveExpanded}
              collapsedWidthPx={normalizedSlug === 'prime-boss' ? 760 : (isPrimeChatRevampEnabled ? 520 : 420)}
              expandedViewportRatio={normalizedSlug === 'prime-boss' ? 0.93 : 0.68}
              minExpandedWidthPx={normalizedSlug === 'prime-boss' ? 980 : 760}
              maxExpandedWidthPx={normalizedSlug === 'prime-boss' ? 1920 : 1180}
              freezeResizeRecompute={
                isStreaming ||
                isUploadingAttachments ||
                isPrimeSummaryPending ||
                isAssistantReplyPending ||
                Date.now() < forceAutoPinUntilRef.current
              }
              align={panelPlacement}
            >
              {/* MESSAGES AREA - Message list container is the scroll owner */}
              {/* CRITICAL: This wrapper provides padding and flex structure - must have flex flex-col h-full min-h-0 */}
              {/* The message list container inside will be the actual scroll owner with capture handlers */}
                  <div 
                    className={`relative px-4 ${normalizedSlug === 'prime-boss' ? 'pt-4 pb-3' : (isPrimeChatRevampEnabled ? 'pt-2 pb-3' : 'pt-4 pb-4')} min-w-0 flex flex-col h-full min-h-0`} 
                ref={scrollContainerRef}
                onDragOver={(e) => {
                  if (supportsChatUploads && e.dataTransfer.types.includes('Files')) {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsDraggingOverChat(true);
                  }
                }}
                onDragLeave={(e) => {
                  if (supportsChatUploads) {
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
                  if (!supportsChatUploads) return;
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDraggingOverChat(false);
                  const droppedFiles = Array.from(e.dataTransfer?.files || []);
                  if (droppedFiles.length === 0) return;
                  void handleFileUpload(droppedFiles);
                }}
              >
                  {/* Dropzone overlay - subtle background helper, never blocks scrolling */}
                  {supportsChatUploads && (
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
                            <div className="text-sm font-medium text-sky-300">Drop files to upload</div>
                            <div className="text-xs text-slate-400 mt-1">Up to 5 files • PDF, CSV, JPG/PNG</div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  {showCenteredUploadIndicator && (
                    <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
                      <div className="rounded-2xl border border-white/15 bg-slate-950/80 px-5 py-4 backdrop-blur-md shadow-2xl shadow-black/40">
                        <div className="flex flex-col items-center gap-2">
                          <div className="relative h-16 w-16">
                            <svg viewBox="0 0 36 36" className="h-16 w-16 -rotate-90">
                              <path
                                d="M18 2.5a15.5 15.5 0 1 1 0 31a15.5 15.5 0 1 1 0-31"
                                fill="none"
                                stroke="rgba(148,163,184,0.25)"
                                strokeWidth="3"
                              />
                              <path
                                d="M18 2.5a15.5 15.5 0 1 1 0 31a15.5 15.5 0 1 1 0-31"
                                fill="none"
                                stroke="rgb(56,189,248)"
                                strokeWidth="3"
                                strokeLinecap="round"
                                strokeDasharray={`${uploadProgressValue}, 100`}
                              />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-sky-300">
                              {uploadProgressValue}%
                            </div>
                          </div>
                          <div className="text-xs text-slate-200">{uploadCircleLabel}</div>
                        </div>
                      </div>
                    </div>
                  )}
                  {/* CRITICAL: Message list container - must be the scroll owner with capture handlers */}
                  {/* This container wraps the messages and should have scroll capture to prevent DashboardLayout from capturing wheel events */}
                  <div 
                    ref={scrollElementRef}
                    className="flex-1 min-h-0 overflow-y-auto hide-scrollbar scrollbar-hide overscroll-contain pointer-events-auto"
                    data-scroll-container="true"
                    style={{
                      WebkitOverflowScrolling: 'touch',
                      scrollBehavior: 'smooth',
                      paddingBottom: chatBottomPaddingPx,
                      scrollPaddingBottom: chatBottomPaddingPx + 32,
                    }}
                    onWheelCapture={(e) => {
                      if (e.deltaY < 0) {
                        // Respect explicit user scroll-up intent immediately.
                        userScrolledUpRef.current = true;
                        autoPinToBottomRef.current = false;
                        forceAutoPinUntilRef.current = 0;
                      }
                      // Prevent dashboard-level wheel handlers from hijacking chat scrolling.
                      e.stopPropagation();
                    }}
                    onWheel={(e) => {
                      if (e.deltaY < 0) {
                        userScrolledUpRef.current = true;
                        autoPinToBottomRef.current = false;
                        forceAutoPinUntilRef.current = 0;
                      }
                      // Keep wheel events scoped to the chat container.
                      e.stopPropagation();
                    }}
                    onTouchMoveCapture={(e) => {
                      // Stop propagation to prevent DashboardLayout from capturing touch events
                      e.stopPropagation();
                    }}
                  >
                    {/* Messages list wrapper with spacing */}
                    <div ref={messageListContentRef} className="w-full max-w-full mx-0 min-w-0 flex flex-col gap-3">
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
                          {!isByte && uploadStatus && !(normalizedSlug === 'prime-boss' && showPrimeUploadQueueCard) && (
                            <div className="shrink-0">
                              <StatusIndicator status={uploadStatus} message={primeNarrationStatusText || undefined} />
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
                      {burstDedupedMessages
                        .filter(m => !(showPrimeOnboarding && !primeOnboardingCompleted && m.id === 'greeting-message'))
                        .filter(m => !(normalizedSlug === 'prime-boss' && (m.id === 'greeting-message' || m.id?.startsWith('prime-greeting-'))))
                        .map((message) => {
                        const isGreetingMessage = message.id === 'greeting-message' || message.id?.startsWith('prime-greeting-');
                        // Detect handoff messages
                        const isHandoffMessage = message.role === 'assistant' && message.meta?.isHandoff === true;
                        const metaAny = message.meta as any;
                        const suppressNarrationBody =
                          !PRIME_MINIMAL_UPLOAD_CHAT &&
                          metaAny?.type === 'prime_upload_narration' &&
                          !metaAny?.done &&
                          !metaAny?.failed;
                        
                        // When greeting is typing, TypingIndicatorRow renders its own avatar - don't render message row avatar
                        const isGreetingTyping = chatReady && isGreetingMessage && isTypingFor(currentEmployeeSlug);
                        
                        // Reserved (post-MVP): PrimeGreetingCard pathway.
                        // Keep disabled for MVP to avoid branching/duplicate greeting surfaces.
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
                                    ? 'bg-slate-900/35 border border-white/10 text-slate-300 italic'
                                    : isHandoffMessage
                                    ? 'bg-purple-900/40 border border-purple-500/30 text-slate-100'
                                    : 'bg-slate-900/45 text-slate-100 border border-white/10'
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
                                          suppressNarrationBody ? null :
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
                                          <FormattedMessageText text={message.content} />
                                        )}
                                      </div>
                                      {(metaAny?.type === 'prime_upload_final' || metaAny?.type === 'import_recap') && (
                                        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                                          {(() => {
                                            const recapImportId = typeof metaAny?.importId === 'string' ? metaAny.importId : '';
                                            const reviewTransactionsTo = recapImportId
                                              ? `/dashboard/transactions?importId=${encodeURIComponent(recapImportId)}`
                                              : '/dashboard/transactions';
                                            const ctas = (Array.isArray(metaAny?.ctas)
                                              ? metaAny.ctas
                                              : [
                                                  { label: 'Review Transactions', to: reviewTransactionsTo },
                                                  { label: 'Review Categories', to: '/dashboard/smart-categories' },
                                                ]).map((cta: any) => {
                                              // Backfill old recap messages that still point to /dashboard/transactions
                                              // by injecting importId context at render-time.
                                              const rawLabel = typeof cta?.label === 'string' ? cta.label : '';
                                              const rawTo = typeof cta?.to === 'string' ? cta.to : '';
                                              const shouldRewriteReviewTransactions =
                                                !!recapImportId &&
                                                rawLabel.toLowerCase().includes('review transactions') &&
                                                rawTo.startsWith('/dashboard/transactions');
                                              return {
                                                ...cta,
                                                to: shouldRewriteReviewTransactions ? reviewTransactionsTo : rawTo,
                                              };
                                            });
                                            return ctas.map((cta: any) => (
                                              <button
                                                key={`${message.id}-${String(cta?.to || cta?.label || '')}`}
                                                type="button"
                                                className="px-3 py-1.5 rounded-md bg-emerald-600/80 hover:bg-emerald-600 text-white transition-colors"
                                                onClick={() => {
                                                  const to = typeof cta?.to === 'string' ? cta.to : '';
                                                  if (!to) return;
                                                  navigate(to);
                                                }}
                                              >
                                                {typeof cta?.label === 'string' ? cta.label : 'Open'}
                                              </button>
                                            ));
                                          })()}
                                        </div>
                                      )}
                                      {metaAny?.type === 'prime_upload_approval' && (
                                        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                                          <button
                                            type="button"
                                            className="px-3 py-1.5 rounded-md bg-emerald-600/80 hover:bg-emerald-600 text-white transition-colors disabled:opacity-60"
                                            disabled={approvingBatchKey === String(metaAny?.batchKey || '')}
                                            onClick={async () => {
                                              const batchKey = String(metaAny?.batchKey || '');
                                              const importIds = Array.isArray(metaAny?.importIds) ? metaAny.importIds : [];
                                              await approvePrimeBatchImport(batchKey, importIds);
                                            }}
                                          >
                                            {approvingBatchKey === String(metaAny?.batchKey || '') ? 'Importing…' : 'Approve & Import'}
                                          </button>
                                          <button
                                            type="button"
                                            className="px-3 py-1.5 rounded-md bg-slate-700/80 hover:bg-slate-700 text-white transition-colors"
                                            onClick={() => handlePrimeBatchReviewSummaries()}
                                          >
                                            Review Summaries
                                          </button>
                                          <button
                                            type="button"
                                            className="px-3 py-1.5 rounded-md bg-rose-700/80 hover:bg-rose-700 text-white transition-colors"
                                            onClick={() => cancelPrimeBatchApproval(String(metaAny?.batchKey || ''))}
                                          >
                                            Cancel
                                          </button>
                                        </div>
                                      )}
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
                            actions={primeGreetingData?.chips?.length
                              ? primeGreetingData.chips.map(chip => ({
                                  label: chip.label,
                                  message: chip.message,
                                  icon: Upload,
                                }))
                              : undefined}
                            onActionClick={(action) => {
                              setInputMessage(action.message);
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
