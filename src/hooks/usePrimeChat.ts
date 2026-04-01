import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useHeadersDebug } from './useHeadersDebug';
import { useEventTap } from './useEventTap';
import { CHAT_ENDPOINT } from '../lib/chatEndpoint';
import { usePrimeState } from '../contexts/usePrimeState';
import { log, warn } from '../lib/logger';
import { getSupabase } from '../lib/supabase';

type ChatRole = 'user' | 'assistant' | 'system';

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  createdAt?: string;
  timestamp?: Date | string;
  meta?: {
    isGreeting?: boolean;
    hideTimestamp?: boolean;
    [key: string]: any;
  };
}

export interface UploadItem {
  id: string;
  name: string;
  type: string;
  size: number;
  data: string; // base64
  previewUrl?: string;
}

interface SendOptions {
  files?: UploadItem[];
  documentIds?: string[]; // Document IDs from Smart Import uploads
  employeeSlug?: string;
  hidden?: boolean;
}

interface AssistantUpsertParams {
  messageId: string;
  requestId?: string;
  content: string;
  isStreaming: boolean;
  employeeKey?: string;
}

const STREAM_IDLE_TIMEOUT_MS = 45_000;

export interface ChatHeaders {
  guardrails?: string;
  piiMask?: string;
  memoryHit?: string;
  memoryCount?: string;
  sessionSummary?: string;
  sessionSummarized?: string;
  employee?: string;
  routeConfidence?: string;
  streamChunkCount?: string;
}

export interface ToolCallDebug {
  tool: string;
  args?: any;
  result?: any;
  timestamp: number;
}

export interface PendingConfirmation {
  toolId: string;
  summary: string;
  originalInput: any;
}

// Grade 4 explanation: This type lists all the employees you can chat with
type EmployeeOverride = 'prime' | 'byte' | 'tag' | 'crystal' | 'goalie' | 'automa' | 'blitz' | 'liberty' | 'chime' | 'roundtable' | 'serenity' | 'harmony' | 'wave' | 'ledger' | 'intelia' | 'dash' | 'custodian';

export function usePrimeChat(
  userId: string,
  sessionId?: string,
  employeeOverride?: EmployeeOverride,
  systemPrompt?: string | null,
  initialMessages?: ChatMessage[], // Optional initial messages to populate on mount
  additionalPrimeContext?: Record<string, unknown> // Extra fields merged into prime_context per send
) {
  // Debug flag to control console logging
  const DEBUG_PRIME_CHAT = false;
  
  // Get PrimeState for context injection (read-only, fail-safe)
  const primeState = usePrimeState();
  
  // Ensure userId is a string (defensive check)
  const safeUserId = typeof userId === 'string' ? userId : String(userId || 'temp-user');
  const suppressByteThoughtsInPrime = employeeOverride === 'prime';
  
  // Retrieve sessionId from localStorage if not provided and we have userId + employeeOverride
  const [effectiveSessionId, setEffectiveSessionId] = useState<string | undefined>(() => {
    if (sessionId) return sessionId; // Use provided sessionId if available
    
    // Try to retrieve from localStorage
    if (safeUserId && employeeOverride) {
      try {
        const employeeSlugMap: Record<EmployeeOverride, string> = {
          prime: 'prime-boss',
          tag: 'tag-ai',
          byte: 'byte-docs',
          crystal: 'crystal-ai',
          goalie: 'goalie-agent',
          automa: 'automa-automation',
          blitz: 'blitz-debt',
          liberty: 'liberty-freedom',
          chime: 'chime-bills',
          roundtable: 'roundtable-podcast',
          serenity: 'serenity-therapist',
          harmony: 'harmony-wellness',
          wave: 'wave-spotify',
          ledger: 'ledger-tax',
          intelia: 'intelia-bi',
          dash: 'dash-analytics',
          custodian: 'custodian-settings'
        };
        const employeeSlug = employeeOverride ? employeeSlugMap[employeeOverride] || 'prime-boss' : 'prime-boss';
        const storageKey = `chat_session_${safeUserId}_${employeeSlug}`;
        const storedSessionId = localStorage.getItem(storageKey);
        if (storedSessionId) {
          return storedSessionId;
        }
      } catch (e) {
        warn('[usePrimeChat] Failed to retrieve sessionId from localStorage:', e);
      }
    }
    return undefined;
  });
  
  // Retrieve thread_id from localStorage if available
  const [effectiveThreadId, setEffectiveThreadId] = useState<string | undefined>(() => {
    if (safeUserId && employeeOverride) {
      try {
        const employeeSlugMap: Record<EmployeeOverride, string> = {
          prime: 'prime-boss',
          tag: 'tag-ai',
          byte: 'byte-docs',
          crystal: 'crystal-ai',
          goalie: 'goalie-agent',
          automa: 'automa-automation',
          blitz: 'blitz-debt',
          liberty: 'liberty-freedom',
          chime: 'chime-bills',
          roundtable: 'roundtable-podcast',
          serenity: 'serenity-therapist',
          harmony: 'harmony-wellness',
          wave: 'wave-spotify',
          ledger: 'ledger-tax',
          intelia: 'intelia-bi',
          dash: 'dash-analytics',
          custodian: 'custodian-settings'
        };
        const employeeSlug = employeeOverride ? employeeSlugMap[employeeOverride] || 'prime-boss' : 'prime-boss';
        const threadStorageKey = `chat_thread_${safeUserId}_${employeeSlug}`;
        const storedThreadId = localStorage.getItem(threadStorageKey);
        if (storedThreadId) {
          return storedThreadId;
        }
      } catch (e) {
        warn('[usePrimeChat] Failed to retrieve thread_id from localStorage:', e);
      }
    }
    return undefined;
  });
  const [threadByEmployee, setThreadByEmployee] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    if (safeUserId && employeeOverride) {
      try {
        const employeeSlugMap: Record<EmployeeOverride, string> = {
          prime: 'prime-boss',
          tag: 'tag-ai',
          byte: 'byte-docs',
          crystal: 'crystal-ai',
          goalie: 'goalie-agent',
          automa: 'automa-automation',
          blitz: 'blitz-debt',
          liberty: 'liberty-freedom',
          chime: 'chime-bills',
          roundtable: 'roundtable-podcast',
          serenity: 'serenity-therapist',
          harmony: 'harmony-wellness',
          wave: 'wave-spotify',
          ledger: 'ledger-tax',
          intelia: 'intelia-bi',
          dash: 'dash-analytics',
          custodian: 'custodian-settings'
        };
        const employeeSlug = employeeOverride ? employeeSlugMap[employeeOverride] || 'prime-boss' : 'prime-boss';
        const threadStorageKey = `chat_thread_${safeUserId}_${employeeSlug}`;
        const storedThreadId = localStorage.getItem(threadStorageKey);
        if (storedThreadId) {
          map[employeeSlug] = storedThreadId;
        }
      } catch (e) {
        warn('[usePrimeChat] Failed to seed thread_by_employee from localStorage:', e);
      }
    }
    return map;
  });
  const requestEmployeeSlugRef = useRef<Map<string, string>>(new Map());
  
  // Ensure systemPrompt is a string or null (defensive check)
  let safeSystemPrompt: string | null | undefined = systemPrompt;
  if (systemPrompt && typeof systemPrompt === 'object' && 'then' in systemPrompt) {
    // Check for Promise-like object (defensive check)
    warn('[usePrimeChat] systemPrompt is a Promise, this should be resolved before passing to usePrimeChat');
    safeSystemPrompt = null; // Use null instead of awaiting to avoid blocking
  } else if (systemPrompt !== null && systemPrompt !== undefined && typeof systemPrompt !== 'string') {
    warn('[usePrimeChat] systemPrompt is not a string, converting:', typeof systemPrompt);
    safeSystemPrompt = String(systemPrompt);
  }
  
  // Ensure initialMessages are valid (defensive check)
  const safeInitialMessages = initialMessages?.map(m => ({
    ...m,
    content: String(m.content || '') // Ensure content is always a string
  })) || [];
  
  const [messages, setMessages] = useState<ChatMessage[]>(safeInitialMessages);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [headers, setHeaders] = useState<ChatHeaders>({});
  const [toolCalls, setToolCalls] = useState<ToolCallDebug[]>([]);
  const [pendingConfirmation, setPendingConfirmation] = useState<PendingConfirmation | null>(null);
  const [guardrailsStatus, setGuardrailsStatus] = useState<{
    enabled: boolean;
    pii_masking: boolean;
    moderation: boolean;
    policy_version: string;
    checked_at: string;
    mode: 'streaming' | 'json';
    reason?: string;
  }>({
    enabled: true,
    pii_masking: true,
    moderation: true,
    policy_version: 'balanced',
    checked_at: new Date().toISOString(),
    mode: 'streaming',
  });
  const abortRef = useRef<AbortController | null>(null);
  const retryCountRef = useRef<number>(0);
  const bufferRef = useRef<string>('');
  
  // CRITICAL: In-flight guard - prevents sendMessage from running twice simultaneously
  const inFlightRef = useRef<boolean>(false);
  
  // CRITICAL: Request-scoped guards to prevent duplicate message creation/commit
  const activeRequestIdRef = useRef<string | null>(null);
  const createdAssistantIdsRef = useRef<Set<string>>(new Set());
  const committedAssistantIdsRef = useRef<Set<string>>(new Set());
  
  // CRITICAL: Track streaming assistant message ID per requestId to prevent duplicates
  const streamingAssistantIdByRequestIdRef = useRef<Map<string, string>>(new Map());
  
  // CRITICAL: Track finalized requestIds to prevent late chunks from creating duplicates
  const finalizedRequestIdsRef = useRef<Set<string>>(new Set());
  const recentBroadcastProgressRef = useRef<Map<string, number>>(new Map());
  
  // CRITICAL: Track streaming message by requestId for idempotent placeholder creation
  const streamingMsgByRequestRef = useRef<Map<string, string>>(new Map());
  
  // CRITICAL: Track accumulated text per requestId
  const textByRequestRef = useRef<Map<string, string>>(new Map());
  
  // CRITICAL: Streaming assistant ID guard - prevents duplicate assistant placeholder creation
  const streamingIdRef = useRef<string | null>(null);
  
  // Allows exactly ONE handoff when the user explicitly requests it,
  // even if VITE_DISABLE_AUTO_HANDOFFS is enabled (quiet mode).
  const allowNextHandoffRef = useRef(false);
  const allowNextHandoffTimeoutRef = useRef<number | null>(null);

  function armManualHandoffWindow() {
    allowNextHandoffRef.current = true;
    if (allowNextHandoffTimeoutRef.current) {
      window.clearTimeout(allowNextHandoffTimeoutRef.current);
    }
    // safety: only allow for a short window, prevents storms
    allowNextHandoffTimeoutRef.current = window.setTimeout(() => {
      allowNextHandoffRef.current = false;
      allowNextHandoffTimeoutRef.current = null;
    }, 12_000);
  }
  
  // Listen for broadcast progress events from OCR
  useEffect(() => {
    if (!safeUserId) return;
    
    let isSubscribed = true;
    
    const setupChannel = async () => {
      // Must dynamically import or wait for supabase init if not ready
      // usePrimeChat is a high-level hook so Supabase should be ready
      const supabase = getSupabase();
      if (!supabase) return;

      const channel = supabase
        .channel(`chat-progress-${safeUserId}`)
        .on('broadcast', { event: 'progress' }, (payload) => {
          if (!isSubscribed) return;
          if (suppressByteThoughtsInPrime) return;
          const message = payload.payload?.message;
          if (message) {
            const normalized = String(message || '').replace(/\s+/g, ' ').trim().toLowerCase();
            const now = Date.now();
            const lastSeen = recentBroadcastProgressRef.current.get(normalized) || 0;
            // Dedupe duplicate progress broadcasts emitted by overlapping OCR/sync calls.
            if (normalized && now - lastSeen < 8000) {
              return;
            }
            if (normalized) {
              recentBroadcastProgressRef.current.set(normalized, now);
            }
            log(`[usePrimeChat] Broadcast progress received: ${message}`);
            setMessages((prev) => {
              // Upate existing thought bubble if present
              const existingIdx = prev.findIndex(
                (m) =>
                  m.role === 'assistant' &&
                  m.meta?.employee_key === 'byte-docs' &&
                  m.meta?.is_thought === true
              );

              if (existingIdx !== -1) {
                const next = [...prev];
                next[existingIdx] = {
                  ...next[existingIdx],
                  content: `_${message}_ 🔍`,
                };
                return next;
              } else {
                return [
                  ...prev,
                  {
                    id: `thought-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
                    role: 'assistant',
                    content: `_${message}_ 🔍`,
                    createdAt: new Date().toISOString(),
                    meta: {
                      employee_key: 'byte-docs',
                      employee_slug: 'byte-docs',
                      is_thought: true,
                    },
                  },
                ];
              }
            });
          }
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    };

    let cleanupPromise = setupChannel();

    return () => {
      isSubscribed = false;
      cleanupPromise.then((cleanup) => {
        if (cleanup) cleanup();
      });
    };
  }, [safeUserId, suppressByteThoughtsInPrime]);
  
  // PART A: Hard dedupe key (no time component)
  const normalizeText = (s: string) => {
    return (s || '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  };

  // Get scope for hardKey: threadId > sessionId > employeeOverride
  const getScope = () => {
    if (effectiveThreadId) return effectiveThreadId;
    if (effectiveSessionId || sessionId) return effectiveSessionId || sessionId || 'no-session';
    if (employeeOverride) {
      const employeeSlugMap: Record<EmployeeOverride, string> = {
        prime: 'prime-boss', tag: 'tag-ai', byte: 'byte-docs', crystal: 'crystal-ai',
        goalie: 'goalie-agent', automa: 'automa-automation', blitz: 'blitz-debt',
        liberty: 'liberty-freedom', chime: 'chime-bills', roundtable: 'roundtable-podcast',
        serenity: 'serenity-therapist', harmony: 'harmony-wellness', wave: 'wave-spotify',
        ledger: 'ledger-tax', intelia: 'intelia-bi', dash: 'dash-analytics', custodian: 'custodian-settings'
      };
      return employeeSlugMap[employeeOverride] || employeeOverride;
    }
    return 'no-scope';
  };

  const hardKey = (m: ChatMessage) => {
    if (!m) return '';
    const scope = getScope();
    return `${scope}|${m.role}|${normalizeText(m.content || '')}`;
  };

  const chooseBetterMessage = (existing: ChatMessage, candidate: ChatMessage) => {
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
  const isWithinDedupeWindow = (msg1: ChatMessage, msg2: ChatMessage) => {
    if (!msg1.createdAt || !msg2.createdAt) return true; // If missing timestamps, allow dedupe
    const ms1 = Date.parse(msg1.createdAt);
    const ms2 = Date.parse(msg2.createdAt);
    if (Number.isNaN(ms1) || Number.isNaN(ms2)) return true;
    return Math.abs(ms1 - ms2) < 30000; // 30 seconds
  };

  // Update messages when initialMessages changes (e.g., when history loads)
  // IMPORTANT: Only merge initialMessages if we don't already have messages from streaming
  // This prevents overwriting conversation history that's already been loaded
  // PART A: Use hardKey-based deduplication (no time component)
  useEffect(() => {
    if (initialMessages && initialMessages.length > 0) {
      // Only set initial messages if we have none, or if initialMessages has more content
      // This handles the case where history loads after the component mounts
      setMessages(prev => {
        // Ensure all message content is strings (defensive coding)
        const sanitizedInitial = initialMessages.map(m => ({
          ...m,
          content: String(m.content || '')
        }));
        
        // PART A: Merge by hardKey, apply dedupe only within safe window
        const recentMessages = prev.slice(-80); // Last 80 messages
        const fpMap = new Map<string, ChatMessage>();
        
        // Add existing messages first
        prev.forEach(msg => {
          const hk = hardKey(msg);
          if (hk) fpMap.set(hk, msg);
        });
        
        // Merge initial messages, deduplicating by hardKey
        sanitizedInitial.forEach(msg => {
          const hk = hardKey(msg);
          if (!hk) return;
          
          if (!fpMap.has(hk)) {
            fpMap.set(hk, msg);
          } else {
            // Only dedupe if within safe window
            const existing = fpMap.get(hk)!;
            const isRecent = recentMessages.includes(msg) || recentMessages.includes(existing);
            const isWithinWindow = isWithinDedupeWindow(existing, msg);
            
            if (isRecent || isWithinWindow) {
              // Choose better message when duplicate found
              const better = chooseBetterMessage(existing, msg);
              fpMap.set(hk, better);
            } else {
              // Outside safe window - keep both (legit repeat)
              fpMap.set(hk, existing);
            }
          }
        });
        
        // Return deduplicated messages, sorted by createdAt if available
        const deduplicated = Array.from(fpMap.values());
        const sorted = deduplicated.sort((a, b) => {
          if (!a.createdAt && !b.createdAt) return 0;
          if (!a.createdAt) return 1;
          if (!b.createdAt) return -1;
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        });
        
        // PART C: Debug logs (temporary)
        if (import.meta.env.DEV && (sanitizedInitial.length > 0 || prev.length > 0)) {
          const allMsgs = [...prev, ...sanitizedInitial];
          const hardKeyCounts = new Map<string, number>();
          allMsgs.forEach(msg => {
            const hk = hardKey(msg);
            if (hk) hardKeyCounts.set(hk, (hardKeyCounts.get(hk) || 0) + 1);
          });
          const duplicates = Array.from(hardKeyCounts.entries())
            .filter(([_, count]) => count > 1)
            .sort(([_, a], [__, b]) => b - a)
            .slice(0, 5);
          
          if (duplicates.length > 0 || allMsgs.length !== fpMap.size) {
            log(`[usePrimeChat] Merge dedupe stats:`, {
              prevCount: prev.length,
              initialCount: sanitizedInitial.length,
              totalMessages: allMsgs.length,
              uniqueHardKeys: fpMap.size,
              duplicatesRemoved: allMsgs.length - fpMap.size,
              topDuplicates: duplicates.map(([hk, count]) => ({ hardKey: hk.substring(0, 60), count })),
            });
          }
        }
        
        return sorted;
      });
    }
  }, [initialMessages, effectiveThreadId, effectiveSessionId, sessionId, employeeOverride]);

  // Use canonical chat endpoint with fallback
  const endpoint = useMemo(() => {
    const defaultEndpoint = CHAT_ENDPOINT || '/.netlify/functions/chat';
    // Ensure endpoint is always a valid string
    if (typeof defaultEndpoint !== 'string' || !defaultEndpoint.trim()) {
      console.error('[usePrimeChat] Invalid endpoint, using fallback');
      return '/.netlify/functions/chat';
    }
    return defaultEndpoint;
  }, []);

  // Debug log endpoint in development (guarded by flag)
  useEffect(() => {
    if (DEBUG_PRIME_CHAT && import.meta.env.DEV) {
      log('[usePrimeChat] using chat endpoint:', endpoint);
    }
  }, [endpoint]);

  // Dev tools hooks (optional - will be no-ops if DevToolsProvider not mounted)
  const headersDebug = useHeadersDebug();
  const eventTap = useEventTap();

  const resetStream = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    inFlightRef.current = false;
    activeRequestIdRef.current = null;
    streamingIdRef.current = null;
    setIsStreaming(false);
  }, []);

  const addUploadFiles = useCallback(async (files: FileList | File[]) => {
    const list = Array.from(files);
    const items: UploadItem[] = [];
    for (const f of list) {
      const data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || '').split(',')[1] || '');
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(f);
      });
      const item: UploadItem = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        name: f.name,
        type: f.type,
        size: f.size,
        data,
        previewUrl: f.type.startsWith('image/') ? URL.createObjectURL(f) : undefined,
      };
      items.push(item);
    }
    setUploads(prev => [...prev, ...items]);
  }, []);

  const removeUpload = useCallback((id: string) => {
    setUploads(prev => prev.filter(u => u.id !== id));
  }, []);

  // One request => one assistant bubble.
  // Updates existing placeholder (id/request_id), and collapses accidental duplicates.
  const upsertAssistantMessage = useCallback((params: AssistantUpsertParams) => {
    const { messageId, requestId, content, isStreaming, employeeKey } = params;
    const normalizedContent = String(content || '');
    setMessages(prev => {
      let matched = false;
      const next: ChatMessage[] = [];

      for (const msg of prev) {
        const isAssistant = msg.role === 'assistant';
        const byId = msg.id === messageId;
        const byRequest =
          Boolean(requestId) &&
          isAssistant &&
          msg.meta?.request_id === requestId;

        if (!byId && !byRequest) {
          next.push(msg);
          continue;
        }

        if (matched) {
          // Drop extra assistant entries for the same request.
          continue;
        }

        matched = true;
        next.push({
          ...msg,
          id: messageId,
          role: 'assistant',
          content: normalizedContent,
          createdAt: msg.createdAt || new Date().toISOString(),
          meta: {
            ...(msg.meta || {}),
            ...(employeeKey ? { employee_key: employeeKey } : {}),
            ...(requestId ? { request_id: requestId } : {}),
            is_streaming: isStreaming,
          },
        });
      }

      if (!matched) {
        if (!isStreaming && normalizedContent.trim()) {
          const normalizedFinal = normalizedContent.replace(/\s+/g, ' ').trim().toLowerCase();
          const recentDuplicate = prev.find((msg) => {
            if (msg.role !== 'assistant') return false;
            if (msg.id === messageId) return false;
            if (msg.meta?.is_streaming) return false;
            if (employeeKey && msg.meta?.employee_key && msg.meta.employee_key !== employeeKey) return false;
            const msgNorm = String(msg.content || '').replace(/\s+/g, ' ').trim().toLowerCase();
            if (msgNorm !== normalizedFinal) return false;
            if (!msg.createdAt) return true;
            const age = Date.now() - Date.parse(msg.createdAt);
            return Number.isFinite(age) ? age < 20000 : true;
          });
          if (recentDuplicate) {
            return prev;
          }
        }
        next.push({
          id: messageId,
          role: 'assistant',
          content: normalizedContent,
          createdAt: new Date().toISOString(),
          meta: {
            ...(employeeKey ? { employee_key: employeeKey } : {}),
            ...(requestId ? { request_id: requestId } : {}),
            is_streaming: isStreaming,
          },
        });
      }

      return next;
    });
  }, []);

  // Helper to parse SSE event and handle tool_executing
  // Track active employee for handoff handling
  const [activeEmployeeSlug, setActiveEmployeeSlug] = useState<string | undefined>(undefined);

  // Initialize activeEmployeeSlug from session on mount (canonical source: chat_sessions.employee_slug)
  // CRITICAL: On /dashboard/prime-chat, allow handoffs to stick (don't force Prime after handoff)
  useEffect(() => {
    if (!effectiveSessionId || !safeUserId) return;
    
    // Check if we're on /dashboard/prime-chat route
    const isPrimeChatPage = typeof window !== 'undefined' && window.location.pathname === '/dashboard/prime-chat';
    
    // If employeeOverride is provided and NOT Prime, respect it everywhere (lock user selection)
    // This prevents session employee from overriding explicit user choice
    if (employeeOverride && employeeOverride !== 'prime') {
      return;
    }

    const loadEmployeeFromSession = async () => {
      try {
        const { getSupabase } = await import('../lib/supabase');
        const supabase = getSupabase();
        if (!supabase) return;

        const { data, error } = await supabase
          .from('chat_sessions')
          .select('employee_slug')
          .eq('id', effectiveSessionId)
          .single();

        if (!error && data?.employee_slug) {
          // CRITICAL: On /dashboard/prime-chat, allow handoffs to stick (don't force Prime)
          // On other routes, only set if it matches the requested employee
          if (isPrimeChatPage) {
            // On Prime Chat page, respect handoffs - use session employee if available
            setActiveEmployeeSlug(data.employee_slug);
          } else if (!employeeOverride || data.employee_slug === employeeOverride || (employeeOverride === 'prime' && data.employee_slug === 'prime-boss')) {
            // On other routes, respect employeeOverride
            setActiveEmployeeSlug(data.employee_slug);
          }
        }
      } catch (e) {
        // Fail silently - will use prop/SSE fallback
      }
    };

    loadEmployeeFromSession();
  }, [effectiveSessionId, safeUserId, employeeOverride]);

  const parseSSEEvent = useCallback((event: string, aiText: string, requestId?: string) => {
    // CRITICAL: Short-circuit guards BEFORE parsing JSON (prevents duplicate processing)
    if (requestId) {
      // Ignore chunks for finalized requests (prevents duplicate bubbles)
      if (finalizedRequestIdsRef.current.has(requestId)) {
        if (import.meta.env.DEV) {
          warn(`[usePrimeChat] 🚫 Ignoring event for finalized request ${requestId}`);
        }
        return { aiText, hasContent: false };
      }
      
      // Ignore chunks for stale requests
      if (activeRequestIdRef.current !== requestId) {
        if (import.meta.env.DEV) {
          warn(`[usePrimeChat] 🚫 Ignoring event for stale request (active: ${activeRequestIdRef.current}, current: ${requestId})`);
        }
        return { aiText, hasContent: false };
      }
    }
    
    const lines = event.split('\n');
    let hasContent = false;
    let currentEventType: string | null = null;
    
    for (const line of lines) {
      // Handle event type line (event: meta)
      if (line.startsWith('event: ')) {
        currentEventType = line.slice(7).trim();
        continue;
      }
      
      if (line.startsWith('data: ')) {
        const payload = line.slice(6).trim();
        if (!payload || payload === '[DONE]') continue;
        
        try {
          const j = JSON.parse(payload);
          
          // Handle guardrails status from meta events
          if (currentEventType === 'meta' && j.guardrails && typeof j.guardrails === 'object') {
            setGuardrailsStatus(j.guardrails);
            if (import.meta.env.DEV) {
              log('[usePrimeChat] Guardrails status from meta event:', j.guardrails);
            }
            currentEventType = null; // Reset event type
            continue; // Don't process further for guardrails meta events
          }
          
          // Handle employee handoff events
          // CRITICAL: Always respect handoff events - they indicate the backend has switched employees
          // QUIET MODE GATE: VITE_DISABLE_AUTO_HANDOFFS prevents automatic employee handoffs
          // Purpose: Suppress handoff storms during OCR/Smart Import debugging
          // This is NOT a bug - manual employee switching still works, only auto-handoffs are gated
          // Re-enable: Remove VITE_DISABLE_AUTO_HANDOFFS from .env.local or set to false
          if (j.type === 'handoff' && j.from && j.to) {
            const DISABLE_HANDOFFS = import.meta.env.VITE_DISABLE_AUTO_HANDOFFS === 'true';
            if (DISABLE_HANDOFFS && !allowNextHandoffRef.current) {
              // Quiet mode: ignore auto-handoff storms, but allow explicit user-requested handoffs
              warn(`[usePrimeChat] 🚫 Auto-handoff disabled. Ignoring handoff event: ${j.from} → ${j.to}`);
              return { aiText, hasContent };
            }

            // Consume the manual handoff window once it succeeds
            if (allowNextHandoffRef.current) {
              allowNextHandoffRef.current = false;
              if (allowNextHandoffTimeoutRef.current) {
                window.clearTimeout(allowNextHandoffTimeoutRef.current);
                allowNextHandoffTimeoutRef.current = null;
              }
            }
            log(`[usePrimeChat] 🔄 Handoff event: ${j.from} → ${j.to}`, j.message || '');
            
            // Always update activeEmployeeSlug to the target employee
            // Handoff events indicate the backend has already switched the session employee
            setActiveEmployeeSlug(j.to);
            
            // CRITICAL: Clear thread ID so next message binds to the correct employee thread
            // Each employee should have their own thread
            setEffectiveThreadId(undefined);
            
            // Update localStorage key to match new employee (for persistence across refresh)
            if (effectiveSessionId && safeUserId && j.from !== j.to) {
              try {
                const oldKey = `chat_session_${safeUserId}_${j.from}`;
                const newKey = `chat_session_${safeUserId}_${j.to}`;
                // Try to get sessionId from old key first, fallback to effectiveSessionId
                const sessionId = localStorage.getItem(oldKey) || effectiveSessionId;
                if (sessionId) {
                  localStorage.setItem(newKey, sessionId);
                  if (oldKey !== newKey) {
                    localStorage.removeItem(oldKey);
                  }
                }
              } catch (e) {
                // Fail silently - localStorage update is non-critical
              }
            }
            
            // Add a system message to indicate the handoff
        setMessages(prev => [...prev, {
          id: `handoff-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          role: 'system',
          content: String(j.message || `Transferred from ${j.from} to ${j.to}`),
          createdAt: new Date().toISOString(),
        }]);
            return { aiText, hasContent }; // Don't process further for handoff events
          }
          
          // Handle employee header updates
          if (j.type === 'employee' && j.employee) {
            const employeeSlugMap: Record<EmployeeOverride, string> = {
              prime: 'prime-boss',
              tag: 'tag-ai',
              byte: 'byte-docs',
              crystal: 'crystal-ai',
              goalie: 'goalie-agent',
              automa: 'automa-automation',
              blitz: 'blitz-debt',
              liberty: 'liberty-freedom',
              chime: 'chime-bills',
              roundtable: 'roundtable-podcast',
              serenity: 'serenity-therapist',
              harmony: 'harmony-wellness',
              wave: 'wave-spotify',
              ledger: 'ledger-tax',
              intelia: 'intelia-bi',
              dash: 'dash-analytics',
              custodian: 'custodian-settings'
            };
            const expectedSlug = employeeOverride ? employeeSlugMap[employeeOverride] : null;
            if (!employeeOverride || employeeOverride === 'prime' || j.employee === expectedSlug) {
              setActiveEmployeeSlug(j.employee);
              if (import.meta.env.DEV) {
                log(`[usePrimeChat] Active employee updated: ${j.employee}`);
              }
            }
          }
          
          // Handle confirmation_required events
          if (j.type === 'confirmation_required' && j.tool && j.summary) {
            log(`[usePrimeChat] Confirmation required for tool: ${j.tool}`, j);
            // Note: originalInput is stored in the tool result sent to LLM, not in SSE event
            // The LLM will have access to it when user confirms
            setPendingConfirmation({
              toolId: j.tool,
              summary: j.summary || `This will ${j.tool}`,
              originalInput: {}, // Not available in SSE event, but LLM has it in conversation history
            });
            // Stop streaming while waiting for confirmation
            setIsStreaming(false);
            return { aiText, hasContent };
          }
          
          // Handle specialist_thought events to display temporary progress bubbles
          if (j.type === 'specialist_thought' && j.employee && j.content) {
            if (suppressByteThoughtsInPrime && String(j.employee) === 'byte-docs') {
              return { aiText, hasContent };
            }
            log(`[usePrimeChat] Specialist thought from ${j.employee}: ${j.content}`);
            setMessages(prev => [...prev, {
              id: `thought-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
              role: 'assistant',
              content: `_${j.content}_ 🔍`,
              createdAt: new Date().toISOString(),
              meta: {
                employee_key: j.employee,
                employee_slug: j.employee,
                is_thought: true,
              }
            }]);
            return { aiText, hasContent: true };
          }
          
          // Handle tool_executing events (dev mode)
          // QUIET MODE GATE: VITE_DISABLE_AUTO_HANDOFFS prevents request_employee_handoff tool execution
          // Purpose: Suppress handoff storms during OCR/Smart Import debugging
          // This is NOT a bug - manual employee switching still works, only auto-handoffs are gated
          // Re-enable: Remove VITE_DISABLE_AUTO_HANDOFFS from .env.local or set to false
          if (j.type === 'tool_executing' && j.tool) {
            const DISABLE_HANDOFFS = import.meta.env.VITE_DISABLE_AUTO_HANDOFFS === 'true';
            if (DISABLE_HANDOFFS && j.tool === 'request_employee_handoff' && !allowNextHandoffRef.current) {
              // Quiet mode: ignore auto-handoff tool execution to prevent storms
              warn(`[usePrimeChat] 🚫 Auto-handoff tool disabled. Ignoring tool: ${j.tool}`);
              return { aiText, hasContent };
            }
            if (import.meta.env.DEV) {
              const toolCallDebug: ToolCallDebug = {
                tool: j.tool,
                args: j.args || undefined,
                timestamp: Date.now(),
              };
              setToolCalls(prev => [...prev, toolCallDebug]);
              log(`[usePrimeChat] Tool executing: ${j.tool}`, j.args || '');
            }
          }
          
          // PART C: Handle done event - finalize requestId and extract thread_id
          if (j.type === 'done') {
            // Mark request as finalized to prevent late chunks (if requestId provided)
            if (requestId) {
              finalizedRequestIdsRef.current.add(requestId);
            }
            
            // Extract thread_id if present
            if (j.thread_id) {
              const receivedThreadId = String(j.thread_id);
              const slugForRequest = requestId ? requestEmployeeSlugRef.current.get(requestId) : null;
              // Update effectiveThreadId state
              setEffectiveThreadId(receivedThreadId);
              if (slugForRequest) {
                setThreadByEmployee(prev => ({ ...prev, [slugForRequest]: receivedThreadId }));
              }
              // Store thread_id in localStorage
              if (safeUserId && slugForRequest) {
                try {
                  // CRITICAL: Store thread_id keyed by employeeSlug so each employee has its own thread
                  const threadStorageKey = `chat_thread_${safeUserId}_${slugForRequest}`;
                  localStorage.setItem(threadStorageKey, receivedThreadId);
                  if (import.meta.env.DEV) {
                    log(`[ChatUI] Received thread_id=${receivedThreadId} for employeeSlug=${slugForRequest}`);
                  }
                } catch (e) {
                  warn('[usePrimeChat] Failed to store thread_id in localStorage:', e);
                }
              }
            }
            // Continue processing - don't return early
          }
          
          // Handle token/content chunks
          // Support ALL common SSE formats:
          // - OpenAI format: { choices: [{ delta: { content: "..." } }] }
          // - Custom format: { type: 'text', content: "..." }
          // - Alternative: { role: 'assistant', content: "..." }
          // - Delta format: { type: 'delta', delta: "..." }
          // - Token format: { token: "..." }
          let frag = '';
          if (j.type === 'text' && typeof j.content === 'string') {
            frag = j.content;
          } else if (j.type === 'delta' && typeof j.delta === 'string') {
            frag = j.delta;
          } else if (j.role === 'assistant' && typeof j.content === 'string') {
            frag = j.content;
          } else {
            // Fallback to OpenAI format and other formats
            frag = j?.choices?.[0]?.delta?.content ?? j?.content ?? j?.token ?? '';
          }
          
          if (frag) {
            // CRITICAL: Only process if requestId is provided
            if (!requestId) {
              // If no requestId, skip processing (this shouldn't happen in normal flow)
              continue;
            }
            
            // Guards already checked at function entry - proceed with processing
            // PART B: Parse SSE "type":"text" and append to the mapped message
            const mid = streamingMsgByRequestRef.current.get(requestId);
            if (!mid) {
              if (import.meta.env.DEV) {
                warn(`[usePrimeChat] ⚠️ No messageId found for requestId ${requestId}, skipping chunk`);
              }
              continue;
            }
            
            // Accumulate text for this requestId
            const currentText = textByRequestRef.current.get(requestId) ?? '';
            const nextText = currentText + frag;
            textByRequestRef.current.set(requestId, nextText);
            
            // Dev log for assistant chunks (reduced frequency)
            if (import.meta.env.DEV && Math.random() < 0.1) { // Only log ~10% of chunks
              log('[usePrimeChat] assistant chunk', frag.slice(0, 20) + '...');
            }
            
            upsertAssistantMessage({
              messageId: mid,
              requestId,
              content: nextText,
              isStreaming: true,
            });
            
            // Dev log: streaming update (reduced frequency)
            if (import.meta.env.DEV && Math.random() < 0.05) { // Log ~5% of updates
              log(`[usePrimeChat] 📝 Streaming update (id: ${mid}, length: ${nextText.length})`);
            }
            
            // Report chunk to dev tools
            if (eventTap) {
              eventTap({ textChunk: frag });
            }
          }
        } catch (e) {
          // Non-OpenAI format: skip (don't accumulate raw)
          // JSON parse failed or other error - silently skip this event
        }
      } else if (line.startsWith(': chunk-count: ')) {
        // Handle chunk count comment
        const countText = line.slice(15).trim();
        if (eventTap) {
          eventTap({ event: 'chunk-count', data: countText });
        }
      }
    }
    
    return { aiText, hasContent };
  }, [eventTap, safeUserId]);

  const send = useCallback(async (text?: string | Promise<string>, opts?: SendOptions) => {
    // CRITICAL: In-flight guard - prevent duplicate sends
    if (inFlightRef.current) {
      if (import.meta.env.DEV) {
        warn('[usePrimeChat] 🚫 Duplicate send blocked (inFlight)');
      }
      return;
    }
    inFlightRef.current = true;
    
    try {
      // Handle case where text might be a Promise (shouldn't happen, but defensive coding)
      let messageText: string;
      if (text instanceof Promise) {
        warn('[usePrimeChat] Received Promise instead of string in send(), awaiting... This should be resolved before calling send().');
        messageText = await text;
      } else {
        messageText = text ?? input;
      }
      // Ensure messageText is always a string
      const content = String(messageText || '').trim();
      if (!content && !(opts?.files?.length || uploads.length)) {
        inFlightRef.current = false;
        return;
      }

      const lower = (content || '').toLowerCase();
      
      // Detect explicit user intent to hand off
      const looksLikeManualHandoff =
        lower.includes('handoff') ||
        lower.includes('hand off') ||
        lower.includes('transfer') ||
        lower.includes('switch me to') ||
        lower.includes('send me to') ||
        lower.includes('talk to byte') ||
        lower.includes('talk to tag') ||
        lower.includes('talk to crystal') ||
        (lower.includes('byte') && lower.includes('import')) ||
        (lower.includes('byte') && lower.includes('upload'));

      if (looksLikeManualHandoff) {
        armManualHandoffWindow();
      }

    // PART 3: Fix optimistic send echo - add client_message_id for deduplication
    // Generate stable client_message_id for optimistic message
    const clientMessageId = `c_${crypto.randomUUID()}`;
    const localUserMsg: ChatMessage = {
      id: `m-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      role: 'user',
      content: String(content || ''), // Ensure content is always a string
      createdAt: new Date().toISOString(),
      meta: {
        client_message_id: clientMessageId, // Stable ID for deduplication
      },
    };
    
    // Add optimistic message (deduplication happens at merge point in UnifiedAssistantChat)
    if (!opts?.hidden) {
      setMessages(prev => [...prev, localUserMsg]);
      
      // Dev log: optimistic message added
      if (import.meta.env.DEV) {
        log(`[usePrimeChat] ✅ Added optimistic user message (client_message_id: ${clientMessageId})`);
      }
    } else {
      // For hidden messages, we still need to track it for deduplication but don't show it
      if (import.meta.env.DEV) {
        log(`[usePrimeChat] 👻 Sent hidden user message (client_message_id: ${clientMessageId})`);
      }
    }
    setInput('');

    // reset uploads after sending
    if (!opts?.files) setUploads([]);

    // CRITICAL: Generate request-scoped ID and abort any prior request
    const requestId = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    activeRequestIdRef.current = requestId;
    
    // Define employeeSlugToSend ONCE at the top of send() to avoid ReferenceError
    const employeeSlugMap: Record<EmployeeOverride, string> = {
      prime: 'prime-boss',
      tag: 'tag-ai',
      byte: 'byte-docs',
      crystal: 'crystal-ai',
      goalie: 'goalie-agent',
      automa: 'automa-automation',
      blitz: 'blitz-debt',
      liberty: 'liberty-freedom',
      chime: 'chime-bills',
      roundtable: 'roundtable-podcast',
      serenity: 'serenity-therapist',
      harmony: 'harmony-wellness',
      wave: 'wave-spotify',
      ledger: 'ledger-tax',
      intelia: 'intelia-bi',
      dash: 'dash-analytics',
      custodian: 'custodian-settings'
    };
    const initialEmployeeSlug = employeeOverride ? employeeSlugMap[employeeOverride] : 'prime-boss';
    const employeeSlugToSend =
      opts?.employeeSlug ||
      activeEmployeeSlug ||
      initialEmployeeSlug ||
      'prime-boss';
    const threadIdForRequest = threadByEmployee[employeeSlugToSend] || null;
    requestEmployeeSlugRef.current.set(requestId, employeeSlugToSend);
    
    // PART A: Create assistant placeholder BEFORE consuming SSE (idempotent)
    // Check if we already have a streaming message for this requestId
    let effectiveAiId: string;
    const existingStreamingId = streamingMsgByRequestRef.current.get(requestId);
    
    if (existingStreamingId) {
      // Already have a streaming message for this requestId - reuse it (DO NOT create new)
      if (import.meta.env.DEV) {
        log(`[usePrimeChat] 🔄 Reusing existing streaming assistant message (id: ${existingStreamingId}, requestId: ${requestId})`);
      }
      effectiveAiId = existingStreamingId;
    } else {
      // Create new assistant placeholder ONCE per requestId
      const aiId = `a-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      effectiveAiId = aiId;
      
      // Store mapping: requestId -> messageId
      streamingMsgByRequestRef.current.set(requestId, aiId);
      streamingAssistantIdByRequestIdRef.current.set(requestId, aiId);
      
      // Initialize accumulated text for this requestId
      textByRequestRef.current.set(requestId, '');
      
      // Create assistant placeholder message
      const assistantPlaceholder: ChatMessage = {
        id: aiId,
        role: 'assistant',
        content: '',
        meta: {
          employee_key: employeeSlugToSend,
          is_streaming: true,
          request_id: requestId,
        },
      };
      
      setMessages(prev => {
        // Defensive check: ensure message doesn't already exist
        if (prev.some(m => m.id === aiId)) {
          if (import.meta.env.DEV) {
            warn(`[usePrimeChat] 🚫 Message ${aiId} already exists in state, skipping add`);
          }
          return prev;
        }
        
        // Dev log: streaming message created BEFORE fetch
        if (import.meta.env.DEV) {
          log(`[usePrimeChat] ✅ Created streaming assistant message BEFORE fetch (id: ${aiId}, employee: ${employeeSlugToSend}, requestId: ${requestId})`);
        }
        
        return [...prev, assistantPlaceholder];
      });
    }
    
    // Abort any prior request when a new one begins
    if (abortRef.current) {
      abortRef.current.abort();
    }
    
    const controller = new AbortController();
    abortRef.current = controller;
    setIsStreaming(true);
    bufferRef.current = ''; // Reset buffer
    retryCountRef.current = 0; // Reset retry count

    const attemptStream = async (isRetry = false): Promise<void> => {
      let streamTimedOut = false;
      let streamTimeoutHandle: number | null = null;
      const clearStreamTimeout = () => {
        if (streamTimeoutHandle !== null) {
          window.clearTimeout(streamTimeoutHandle);
          streamTimeoutHandle = null;
        }
      };
      const armStreamTimeout = () => {
        clearStreamTimeout();
        streamTimeoutHandle = window.setTimeout(() => {
          streamTimedOut = true;
          try {
            controller.abort();
          } catch {
            // no-op
          }
        }, STREAM_IDLE_TIMEOUT_MS);
      };
      try {
        // Map outgoing employee slug back to employeeOverride format for header (only if Prime)
        // employeeOverride header should only be 'prime' when the active employee is actually Prime
        const outgoingEmployeeOverride = employeeSlugToSend === 'prime-boss' ? 'prime' : undefined;

        // Debug log endpoint before fetch in development (guarded by flag)
        if (DEBUG_PRIME_CHAT && import.meta.env.DEV && !isRetry) {
          log('[usePrimeChat] calling chat endpoint:', endpoint);
        }
        if (import.meta.env.DEV) {
          log('[CHAT SEND]', {
            client_message_id: clientMessageId,
            request_id: requestId,
            employeeSlug: employeeSlugToSend,
            stream: true,
            endpoint,
          });
        }

        // Ensure endpoint is valid before fetch
        if (!endpoint || typeof endpoint !== 'string' || !endpoint.trim()) {
          console.error('[usePrimeChat] Invalid endpoint value:', endpoint);
          const errorMessageId = streamingMsgByRequestRef.current.get(requestId) || effectiveAiId;
          upsertAssistantMessage({
            messageId: errorMessageId,
            requestId,
            content: "Chat endpoint is not configured. Please restart the dev server and try again.",
            isStreaming: false,
            employeeKey: employeeSlugToSend,
          });
          setIsStreaming(false);
          streamingIdRef.current = null; // Clear streaming ID guard
          inFlightRef.current = false; // Clear in-flight guard
          finalizedRequestIdsRef.current.add(requestId);
          streamingMsgByRequestRef.current.delete(requestId);
          textByRequestRef.current.delete(requestId);
          return;
        }

        // Build prime_context snapshot (minimal, safe fields only)
        let primeContext: any = null;
        if (primeState && employeeSlugToSend === 'prime-boss') {
          // Extract safe fields from PrimeState
          const displayName = primeState.userProfileSummary?.displayName || null;
          const firstName = displayName ? displayName.split(' ')[0] : null;
          
          primeContext = {
            displayName: firstName || displayName || null, // Prefer firstName for personalization
            timezone: primeState.userProfileSummary?.timezone || null,
            currency: primeState.userProfileSummary?.currency || null,
            currentStage: primeState.currentStage || null,
            financialSnapshot: primeState.financialSnapshot ? {
              hasTransactions: primeState.financialSnapshot.hasTransactions,
              uncategorizedCount: primeState.financialSnapshot.uncategorizedCount,
              monthlySpend: primeState.financialSnapshot.monthlySpend || undefined,
              topCategories: primeState.financialSnapshot.topCategories?.slice(0, 5).map(c => ({
                name: c.category,
                amount: c.totalAmount
              })) || undefined,
              hasDebt: primeState.financialSnapshot.hasDebt === 'yes' ? true : primeState.financialSnapshot.hasDebt === 'no' ? false : undefined,
              hasGoals: primeState.financialSnapshot.hasGoals === 'yes' ? true : primeState.financialSnapshot.hasGoals === 'no' ? false : undefined
            } : null,
            memorySummary: primeState.memorySummary ? {
              factsCount: primeState.memorySummary.factCount || undefined,
              lastUpdatedAt: primeState.lastUpdated || undefined,
              recentFacts: primeState.memorySummary.highConfidenceFacts?.slice(0, 3).map(f => f.value || f.key) || undefined
            } : null,
            // Merge additional context (e.g. recent import summary for follow-up question support)
            ...(additionalPrimeContext || {}),
          };
          
          // Dev logging (redacted preview)
          if (import.meta.env.DEV && !isRetry) {
            log('[PrimeContext] attaching prime_context to chat request', {
              hasName: !!primeContext.displayName,
              stage: primeContext.currentStage,
              hasTransactions: primeContext.financialSnapshot?.hasTransactions,
              uncategorizedCount: primeContext.financialSnapshot?.uncategorizedCount,
              factsCount: primeContext.memorySummary?.factsCount
            });
          }
        }

        // Context Injection Verification Logging
        if (import.meta.env.DEV && !isRetry) {
          log('[Context Injection] 🧠 Employee Context Data', {
            employeeSlug: employeeSlugToSend,
            employeeOverride: outgoingEmployeeOverride,
            activeEmployeeSlug,
            hasPrimeContext: !!primeContext,
            primeContextKeys: primeContext ? Object.keys(primeContext) : [],
            hasSystemPrompt: !!safeSystemPrompt,
            systemPromptLength: safeSystemPrompt?.length || 0,
            hasDocumentIds: !!(opts?.documentIds && opts.documentIds.length > 0),
            documentIdsCount: opts?.documentIds?.length || 0,
            primeContextDetails: primeContext ? {
              hasDisplayName: !!primeContext.displayName,
              hasFinancialSnapshot: !!primeContext.financialSnapshot,
              hasMemorySummary: !!primeContext.memorySummary,
              currentStage: primeContext.currentStage,
              hasTransactions: primeContext.financialSnapshot?.hasTransactions,
              uncategorizedCount: primeContext.financialSnapshot?.uncategorizedCount,
              factsCount: primeContext.memorySummary?.factsCount,
            } : null,
            // Expected context per employee:
            expectedContext: {
              'prime-boss': 'Full PrimeState (financial snapshot, memory summary, user profile)',
              'byte-docs': 'Document upload context (via documentIds)',
              'tag-ai': 'Categorization context (facts, recent transactions)',
              'crystal-analytics': 'Analytics + budgets context (spending data, budgets)',
            }[employeeSlugToSend] || 'Standard context (facts, history)',
          });
        }

        // Get Supabase session token for Authorization header
        const { getSupabase } = await import('../lib/supabase');
        const supabase = getSupabase();
        if (!supabase) {
          console.error('[usePrimeChat] Supabase client not available');
          const errorMessageId = streamingMsgByRequestRef.current.get(requestId) || effectiveAiId;
          upsertAssistantMessage({
            messageId: errorMessageId,
            requestId,
            content: "I couldn't initialize authentication for chat. Please refresh and try again.",
            isStreaming: false,
            employeeKey: employeeSlugToSend,
          });
          setIsStreaming(false);
          streamingIdRef.current = null; // Clear streaming ID guard
          inFlightRef.current = false; // Clear in-flight guard
          finalizedRequestIdsRef.current.add(requestId);
          streamingMsgByRequestRef.current.delete(requestId);
          textByRequestRef.current.delete(requestId);
          return;
        }
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session?.access_token) {
          console.error('[usePrimeChat] No auth token available - cannot authenticate chat request');
          const errorMessageId = streamingMsgByRequestRef.current.get(requestId) || effectiveAiId;
          upsertAssistantMessage({
            messageId: errorMessageId,
            requestId,
            content: "Your session expired. Please sign in again, then retry your message.",
            isStreaming: false,
            employeeKey: employeeSlugToSend,
          });
          setIsStreaming(false);
          streamingIdRef.current = null; // Clear streaming ID guard
          inFlightRef.current = false; // Clear in-flight guard
          finalizedRequestIdsRef.current.add(requestId);
          streamingMsgByRequestRef.current.delete(requestId);
          textByRequestRef.current.delete(requestId);
          return;
        }

        // Build request body
        const requestBody = {
          userId: safeUserId, // Use safe userId (always a string)
          sessionId: effectiveSessionId || sessionId, // Use effectiveSessionId (from localStorage or prop)
          threadId: threadIdForRequest, // Include thread_id if available
          message: content,
          employeeSlug: employeeSlugToSend, // CRITICAL: Always send employeeSlug so backend routes correctly
          client_message_id: clientMessageId,
          request_id: requestId,
          stream: true,
          ...(safeSystemPrompt ? { systemPromptOverride: safeSystemPrompt } : {}), // Use safe systemPrompt
          ...(opts?.documentIds && opts.documentIds.length > 0 ? { documentIds: opts.documentIds } : {}), // Include document IDs if provided
          ...(opts?.hidden ? { hidden: true } : {}), // Add hidden flag so backend skips storing user prompt
          ...(primeContext ? { prime_context: primeContext } : {}), // Include PrimeState snapshot for Prime only
        };
        
        // Dev logging: Log employee routing once per request
        if (import.meta.env.DEV && !isRetry) {
          log(`[ChatUI] Sending to employeeSlug=${employeeSlugToSend} thread_id=${threadIdForRequest || 'none'} employeeOverride=${outgoingEmployeeOverride || 'none'} activeEmployeeSlug=${activeEmployeeSlug || 'none'}`);
        }

        // DEBUG MODE: Log request/response details (DEV only)
        const DEBUG_MODE = import.meta.env.DEV || false;
        
        // Log complete request payload for context verification
        if (DEBUG_MODE && !isRetry) {
          console.group(`🤖 [AI Request] ${employeeSlugToSend}`);
          log('📤 Request sent:', {
            endpoint,
            method: 'POST',
            employeeSlug: employeeSlugToSend,
            messageLength: content.length,
            hasThreadId: !!threadIdForRequest,
            hasSessionId: !!effectiveSessionId,
          });
          log('📤 Request Payload:', {
            employeeSlug: employeeSlugToSend,
            requestBodyKeys: Object.keys(requestBody),
            hasPrimeContext: !!requestBody.prime_context,
            hasSystemPrompt: !!requestBody.systemPromptOverride,
            hasDocumentIds: !!requestBody.documentIds,
            documentIdsCount: requestBody.documentIds?.length || 0,
            sessionId: requestBody.sessionId ? 'present' : 'missing',
            // Note: Backend will build full context (facts, history, analytics, budgets) based on employeeSlug
            backendWillBuild: {
              'prime-boss': 'PrimeState + Facts + History',
              'byte-docs': 'Document context + Facts + History',
              'tag-ai': 'Categorization context + Facts + History + Recent transactions',
              'crystal-analytics': 'Analytics (90d spending) + Budgets + Facts + History',
            }[employeeSlugToSend] || 'Facts + History (standard)',
          });
          
          // Log detailed context data
          if (requestBody.prime_context) {
            log('👑 Prime Context:', {
              displayName: requestBody.prime_context.displayName,
              currency: requestBody.prime_context.currency,
              stage: requestBody.prime_context.currentStage,
              financialSnapshot: requestBody.prime_context.financialSnapshot,
              memorySummary: requestBody.prime_context.memorySummary,
            });
          }
          
          if (requestBody.documentIds) {
            log('📄 Document IDs:', requestBody.documentIds);
          }
          
          if (requestBody.systemPromptOverride) {
            log('📝 Custom System Prompt:', requestBody.systemPromptOverride.substring(0, 200) + '...');
          }
          
          log('💬 User Message:', content);
          console.groupEnd();
        }

        // Guard against a stalled request/stream leaving the UI in a frozen state.
        armStreamTimeout();
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`, // CRITICAL: Send auth token for backend verification
            ...(outgoingEmployeeOverride ? { 'X-Employee-Override': outgoingEmployeeOverride } : {}),
            // NOTE: systemPrompt is sent in the JSON body, not headers, because HTTP headers
            // must be ISO-8859-1 compatible. System prompts contain markdown, fancy quotes,
            // emojis, and other Unicode characters that cause "non ISO-8859-1 code point" errors.
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal,
        });

        if (!res.ok) {
          if (!isRetry && retryCountRef.current < 1) {
            // Retry once on network error
            retryCountRef.current++;
            await new Promise(resolve => setTimeout(resolve, 1000));
            return attemptStream(true);
          }
          let statusDetail = `status ${res.status}`;
          try {
            const errorPayload = await res.json();
            statusDetail = errorPayload?.error || errorPayload?.message || statusDetail;
          } catch {
            // Ignore parse errors; use HTTP status detail.
          }
          const errorMessageId = streamingMsgByRequestRef.current.get(requestId) || effectiveAiId;
          upsertAssistantMessage({
            messageId: errorMessageId,
            requestId,
            content: `I couldn't complete that request (${statusDetail}). Please try again.`,
            isStreaming: false,
            employeeKey: employeeSlugToSend,
          });
          setIsStreaming(false);
          finalizedRequestIdsRef.current.add(requestId);
          streamingMsgByRequestRef.current.delete(requestId);
          textByRequestRef.current.delete(requestId);
          return;
        }

        // Extract headers (Day 7)
        const extractedHeaders: ChatHeaders = {
          guardrails: res.headers.get('X-Guardrails') || undefined,
          piiMask: res.headers.get('X-PII-Mask') || undefined,
          memoryHit: res.headers.get('X-Memory-Hit') || undefined,
          memoryCount: res.headers.get('X-Memory-Count') || undefined,
          sessionSummary: res.headers.get('X-Session-Summary') || undefined,
          sessionSummarized: res.headers.get('X-Session-Summarized') || undefined,
          employee: res.headers.get('X-Employee') || undefined,
          routeConfidence: res.headers.get('X-Route-Confidence') || undefined,
          streamChunkCount: res.headers.get('X-Stream-Chunk-Count') || undefined,
        };
        setHeaders(extractedHeaders);
        
        // Extract sessionId from response header (if backend returns it)
        const responseSessionId = res.headers.get('X-Session-Id') || effectiveSessionId || sessionId;
        
        // Update effectiveSessionId state if we got a new one from backend
        if (responseSessionId && responseSessionId !== effectiveSessionId) {
          setEffectiveSessionId(responseSessionId);
        }
        
        // Store sessionId in localStorage if we have userId and employeeOverride
        if (responseSessionId && safeUserId && employeeOverride) {
          try {
            // Map employeeOverride back to employeeSlug for storage key
            const employeeSlugMap: Record<EmployeeOverride, string> = {
              prime: 'prime-boss',
              tag: 'tag-ai',
              byte: 'byte-docs',
              crystal: 'crystal-ai',
              goalie: 'goalie-agent',
              automa: 'automa-automation',
              blitz: 'blitz-debt',
              liberty: 'liberty-freedom',
              chime: 'chime-bills',
              roundtable: 'roundtable-podcast',
              serenity: 'serenity-therapist',
              harmony: 'harmony-wellness',
              wave: 'wave-spotify',
              ledger: 'ledger-tax',
              intelia: 'intelia-bi',
              dash: 'dash-analytics',
              custodian: 'custodian-settings'
            };
            const employeeSlug = employeeOverride ? employeeSlugMap[employeeOverride] || 'prime-boss' : 'prime-boss';
            const storageKey = `chat_session_${safeUserId}_${employeeSlug}`;
            localStorage.setItem(storageKey, responseSessionId);
          } catch (e) {
            warn('[usePrimeChat] Failed to store sessionId in localStorage:', e);
          }
        }

        // Report headers to dev tools
        if (headersDebug) {
          headersDebug(res.headers);
        }

        // Get the messageId for this requestId (should already exist from PART A)
        const messageId = streamingMsgByRequestRef.current.get(requestId);
        if (!messageId) {
          console.error(`[usePrimeChat] ⚠️ No messageId found for requestId ${requestId} - placeholder should have been created before fetch`);
          upsertAssistantMessage({
            messageId: effectiveAiId,
            requestId,
            content: "I couldn't create a response bubble for this turn. Please send that again.",
            isStreaming: false,
            employeeKey: employeeSlugToSend,
          });
          setIsStreaming(false);
          inFlightRef.current = false;
          finalizedRequestIdsRef.current.add(requestId);
          streamingMsgByRequestRef.current.delete(requestId);
          textByRequestRef.current.delete(requestId);
          return;
        }

        const contentType = res.headers.get('content-type')?.toLowerCase() || '';
        if (!contentType.includes('text/event-stream')) {
          const payload = await res.json().catch(() => null);
          if (payload?.type === 'noop' || payload?.deduped === true) {
            setIsStreaming(false);
            streamingIdRef.current = null;
            inFlightRef.current = false;
            finalizedRequestIdsRef.current.add(requestId);
            return;
          }
          if (payload?.guardrails) {
            setGuardrailsStatus(payload.guardrails);
          }
          const contentText = typeof payload?.content === 'string' ? payload.content : '';
          if (contentText) {
            textByRequestRef.current.set(requestId, contentText);
            committedAssistantIdsRef.current.add(messageId);
            upsertAssistantMessage({
              messageId,
              requestId,
              content: contentText,
              isStreaming: false,
            });
          }
          setIsStreaming(false);
          streamingIdRef.current = null;
          inFlightRef.current = false;
          finalizedRequestIdsRef.current.add(requestId);
          streamingMsgByRequestRef.current.delete(requestId);
          textByRequestRef.current.delete(requestId);
          return;
        }

        if (!res.body) {
          upsertAssistantMessage({
            messageId,
            requestId,
            content: "The chat response stream was empty. Please try again.",
            isStreaming: false,
            employeeKey: employeeSlugToSend,
          });
          setIsStreaming(false);
          streamingIdRef.current = null; // Clear streaming ID guard
          inFlightRef.current = false; // Clear in-flight guard
          finalizedRequestIdsRef.current.add(requestId);
          streamingMsgByRequestRef.current.delete(requestId);
          textByRequestRef.current.delete(requestId);
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        
        // CRITICAL: Check if this requestId has already been finalized (prevents late chunks)
        if (finalizedRequestIdsRef.current.has(requestId)) {
          if (import.meta.env.DEV) {
            warn(`[usePrimeChat] 🚫 Request ${requestId} already finalized, ignoring`);
          }
          setIsStreaming(false);
          inFlightRef.current = false;
          return;
        }
        
        // Capture variables for fallback (if streaming fails) - must be outside try block
        const fallbackRequestBody = {
          userId: safeUserId,
          sessionId: effectiveSessionId || sessionId,
          threadId: threadIdForRequest,
          message: content,
          employeeSlug: employeeSlugToSend,
          client_message_id: clientMessageId,
          request_id: requestId,
          stream: false,
          ...(safeSystemPrompt ? { systemPromptOverride: safeSystemPrompt } : {}),
          ...(opts?.documentIds && opts.documentIds.length > 0 ? { documentIds: opts.documentIds } : {}),
          ...(primeContext ? { prime_context: primeContext } : {}),
        };
        const fallbackEndpoint = endpoint;
        const fallbackEmployeeOverride = employeeOverride;
        const fallbackSessionToken = session?.access_token;

        try {
          // Enhanced SSE parsing with buffering
          while (true) {
            armStreamTimeout();
            const { value, done } = await reader.read();
            clearStreamTimeout();
            if (done) break;
            
            // Decode chunk (handles partial UTF-8 sequences)
            const chunk = decoder.decode(value, { stream: true });
            bufferRef.current += chunk;

            // Process complete SSE events (ending with \n\n)
            let lastIndex = 0;
            let eventEnd = bufferRef.current.indexOf('\n\n', lastIndex);

            while (eventEnd !== -1) {
              const event = bufferRef.current.slice(lastIndex, eventEnd);
              
              // DEV: Log SSE events for debugging
              if (import.meta.env.DEV) {
                log('[SSE]', event);
              }
              
              // Parse SSE event - need to pass requestId to update textByRequestRef
              // Find requestId from messageId (reverse lookup)
              let eventRequestId: string | undefined;
              for (const [rid, mid] of streamingMsgByRequestRef.current.entries()) {
                if (mid === messageId) {
                  eventRequestId = rid;
                  break;
                }
              }
              if (eventRequestId) {
                parseSSEEvent(event, '', eventRequestId);
              } else {
                // Fallback: parse without requestId (won't update textByRequestRef)
                parseSSEEvent(event, '', requestId);
              }
              
              lastIndex = eventEnd + 2;
              eventEnd = bufferRef.current.indexOf('\n\n', lastIndex);
            }

            // Keep incomplete event in buffer
            bufferRef.current = bufferRef.current.slice(lastIndex);
          }

            // Process any remaining buffer
          if (bufferRef.current.trim()) {
            // DEV: Log final buffer for debugging
            if (import.meta.env.DEV) {
              log('[SSE] Final buffer:', bufferRef.current);
            }
            // Parse final buffer - need to pass requestId to update textByRequestRef
            parseSSEEvent(bufferRef.current, '', requestId);
          }
          
          bufferRef.current = ''; // Clear buffer
          
          // PART D: Final commit - use accumulated text from textByRequestRef
          // Get streaming assistant ID for this requestId
          const streamingAssistantId = streamingMsgByRequestRef.current.get(requestId);
          const finalContent = textByRequestRef.current.get(requestId) ?? '';
          
          if (streamingAssistantId) {
            // Check if already committed for this request
            if (committedAssistantIdsRef.current.has(streamingAssistantId)) {
              if (import.meta.env.DEV) {
                warn(`[usePrimeChat] 🚫 Message ${streamingAssistantId} already committed for this request, skipping`);
              }
            } else if (activeRequestIdRef.current !== requestId) {
              // Stale request - ignore
              if (import.meta.env.DEV) {
                warn(`[usePrimeChat] 🚫 Stale request on commit (active: ${activeRequestIdRef.current}, current: ${requestId}), ignoring`);
              }
            } else {
              // Commit ONCE - update existing streaming message, never append
              committedAssistantIdsRef.current.add(streamingAssistantId);
              
              // If no content received, show safe fallback message instead of removing placeholder
              const contentToCommit = finalContent.trim().length > 0 
                ? finalContent 
                : "Sorry — I didn't receive a response. Please try again.";
              
              upsertAssistantMessage({
                messageId: streamingAssistantId,
                requestId,
                content: contentToCommit,
                isStreaming: false,
                employeeKey: employeeSlugToSend,
              });
              
              // Dev log: final message committed (single-bubble upsert)
              if (import.meta.env.DEV && !isRetry) {
                log(`[usePrimeChat] ✅ Final message committed (single bubble, requestId: ${requestId})`, {
                  messageId: streamingAssistantId,
                  contentLength: contentToCommit.length,
                });
              }
            }
            
            // Trigger scroll after state update (use requestAnimationFrame to ensure DOM updated)
            requestAnimationFrame(() => {
              // Scroll will be handled by UnifiedAssistantChat's useEffect watching messages
              if (DEBUG_MODE && !isRetry) {
                log('[usePrimeChat] 📜 Scroll triggered after message commit');
              }
            });
          }
          
          // PART C: Clean up request-scoped state after a tick
          setTimeout(() => {
            streamingMsgByRequestRef.current.delete(requestId);
            textByRequestRef.current.delete(requestId);
          }, 100);
          
          // Log AI response after stream completes
          if (DEBUG_MODE && !isRetry) {
            const finalText = textByRequestRef.current.get(requestId) ?? '';
            if (finalText) {
              console.group(`✅ [AI Response] ${employeeSlugToSend}`);
              log('📥 Response Headers:', {
                employee: extractedHeaders.employee,
                memoryHit: extractedHeaders.memoryHit,
                memoryCount: extractedHeaders.memoryCount,
                sessionSummary: extractedHeaders.sessionSummary ? 'present' : 'none',
                guardrails: extractedHeaders.guardrails,
                streamChunkCount: extractedHeaders.streamChunkCount,
              });
              log('💬 Assistant Response:', finalText);
              log('📊 Response Length:', finalText.length, 'characters');
              log('🔍 Response Preview:', finalText.substring(0, 200) + (finalText.length > 200 ? '...' : ''));
              
              // Check if response references context data
              const hasNumbers = /\d+/.test(finalText);
              const hasContextualData = 
                (employeeSlugToSend === 'prime-boss' && (finalText.includes('uncategorized') || finalText.includes('spent') || finalText.includes('category'))) ||
                (employeeSlugToSend === 'byte-docs' && (finalText.includes('document') || finalText.includes('upload'))) ||
                (employeeSlugToSend === 'tag-ai' && (finalText.includes('uncategorized') || finalText.includes('categor') || /\d+.*transaction/i.test(finalText))) ||
                (employeeSlugToSend === 'crystal-analytics' && (finalText.includes('spent') || finalText.includes('category') || finalText.includes('budget')));
              
              log('🧠 Intelligence Check:', {
                hasNumbers: hasNumbers,
                referencesContextData: hasContextualData,
                seemsIntelligent: hasNumbers && hasContextualData,
              });
              
              console.groupEnd();
            }
          }
        
        // CRITICAL: Mark request as finalized to prevent late chunks from creating duplicates
        finalizedRequestIdsRef.current.add(requestId);
        
        // CRITICAL: Clean up request-scoped state
        if (activeRequestIdRef.current === requestId) {
          activeRequestIdRef.current = null;
        }
        streamingAssistantIdByRequestIdRef.current.delete(requestId);
        streamingMsgByRequestRef.current.delete(requestId);
        
        // CRITICAL: Clear streaming state after successful stream completion
        // Only if this is still the active request (prevents clobbering a newer request's streaming state)
        if (activeRequestIdRef.current === requestId || activeRequestIdRef.current === null) {
          setIsStreaming(false);
          abortRef.current = null;
        }
        } catch (err: any) {
          if (err.name === 'AbortError' && !streamTimedOut) {
            // User aborted, don't retry
            // Only clear if this is still the active request
            if (activeRequestIdRef.current === requestId) {
              setIsStreaming(false);
              abortRef.current = null;
              streamingIdRef.current = null; // Clear streaming ID guard
              inFlightRef.current = false; // Clear in-flight guard
              // Clear request-scoped state
              if (effectiveAiId) {
                createdAssistantIdsRef.current.delete(effectiveAiId);
                committedAssistantIdsRef.current.delete(effectiveAiId);
              }
              // Mark as finalized to prevent late chunks
              finalizedRequestIdsRef.current.add(requestId);
              streamingAssistantIdByRequestIdRef.current.delete(requestId);
              activeRequestIdRef.current = null;
            }
            return;
          }
          if (streamTimedOut && import.meta.env.DEV) {
            warn(`[usePrimeChat] stream timeout after ${STREAM_IDLE_TIMEOUT_MS}ms; switching to JSON fallback`);
          }
          
          // Log error for debugging
          console.error('[usePrimeChat] Stream error:', err);
          
          // FALLBACK: If streaming fails, try non-streaming JSON response
          if (!isRetry && retryCountRef.current < 1) {
            log('[usePrimeChat] Streaming failed, falling back to non-streaming JSON...');
            retryCountRef.current++;
            
            try {
              // Get the existing placeholder message ID from the requestId mapping
              const fallbackMessageId = streamingMsgByRequestRef.current.get(requestId) || effectiveAiId;
              
              // Get session again for fallback request (if not already captured)
              let fallbackToken: string | undefined = fallbackSessionToken;
              if (!fallbackToken) {
                const { getSupabase: getSupabaseFallback } = await import('../lib/supabase');
                const supabaseFallback = getSupabaseFallback();
                if (supabaseFallback) {
                  const { data: { session: fallbackSession } } = await supabaseFallback.auth.getSession();
                  fallbackToken = fallbackSession?.access_token;
                }
              }
              
              if (!fallbackToken) {
                throw new Error('No auth token for fallback request');
              }
              
              const fallbackRes = await fetch(fallbackEndpoint, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${fallbackToken}`,
                  ...(fallbackEmployeeOverride ? { 'X-Employee-Override': fallbackEmployeeOverride } : {}),
                },
                body: JSON.stringify(fallbackRequestBody),
              });
              
              if (!fallbackRes.ok) {
                throw new Error(`Fallback request failed: ${fallbackRes.status}`);
              }
              
              const fallbackData = await fallbackRes.json();
              
              // Extract assistant content from JSON response
              const assistantContent = fallbackData.content || fallbackData.message?.content || '';
              const responseThreadId = fallbackData.thread_id || fallbackData.threadId;
              
              if (assistantContent) {
                // CRITICAL: Update existing placeholder instead of creating new message
                // This prevents duplicate assistant bubbles
                upsertAssistantMessage({
                  messageId: fallbackMessageId,
                  requestId,
                  content: String(assistantContent),
                  isStreaming: false,
                  employeeKey: employeeSlugToSend,
                });
                
                if (import.meta.env.DEV) {
                  log(`[usePrimeChat] ✅ Fallback: single-bubble upsert complete (id: ${fallbackMessageId}, content length: ${assistantContent.length})`);
                }
                
                // Store thread_id if received
                if (responseThreadId && safeUserId) {
                  try {
                    const threadStorageKey = `chat_thread_${safeUserId}_${employeeSlugToSend}`;
                    localStorage.setItem(threadStorageKey, String(responseThreadId));
                    setThreadByEmployee(prev => ({
                      ...prev,
                      [employeeSlugToSend]: String(responseThreadId),
                    }));
                    setEffectiveThreadId(String(responseThreadId));
                  } catch (e) {
                    warn('[usePrimeChat] Failed to store thread_id from fallback:', e);
                  }
                }
                
                if (import.meta.env.DEV) {
                  log(`[usePrimeChat] ✅ Fallback JSON response successful: ${assistantContent.length} chars`);
                }
                
                // CRITICAL: Clear streaming state before returning
                // Only clear if this is still the active request
                if (activeRequestIdRef.current === requestId) {
                  setIsStreaming(false);
                  abortRef.current = null;
                  streamingIdRef.current = null; // Clear streaming ID guard
                  inFlightRef.current = false; // Clear in-flight guard
                  // Mark as finalized to prevent late chunks
                  finalizedRequestIdsRef.current.add(requestId);
                  streamingAssistantIdByRequestIdRef.current.delete(requestId);
                  streamingMsgByRequestRef.current.delete(requestId);
                  activeRequestIdRef.current = null;
                  // Clear request-scoped state
                  if (fallbackMessageId) {
                    createdAssistantIdsRef.current.delete(fallbackMessageId);
                    committedAssistantIdsRef.current.delete(fallbackMessageId);
                  }
                }
                return; // Success - exit early
              }
            } catch (fallbackErr: any) {
              console.error('[usePrimeChat] Fallback JSON request also failed:', fallbackErr);
              // Continue to error message below
            }
          }
          
          // If fallback failed or not attempted, update placeholder with error message
          const errorMessageId = streamingMsgByRequestRef.current.get(requestId) || effectiveAiId;
          upsertAssistantMessage({
            messageId: errorMessageId,
            requestId,
            content: "Sorry — I didn't receive a response. Please try again.",
            isStreaming: false,
            employeeKey: employeeSlugToSend,
          });
        } finally {
          clearStreamTimeout();
          // Only clear if this is still the active request
          // CRITICAL: Get assistant message ID from mapping (aiId is out of scope here)
          const assistantMsgId = streamingMsgByRequestRef.current.get(requestId) || streamingIdRef.current;
          if (activeRequestIdRef.current === requestId) {
            setIsStreaming(false);
            abortRef.current = null;
            streamingIdRef.current = null; // Clear streaming ID guard
            inFlightRef.current = false; // Clear in-flight guard
            // Mark as finalized to prevent late chunks
            finalizedRequestIdsRef.current.add(requestId);
            streamingAssistantIdByRequestIdRef.current.delete(requestId);
            activeRequestIdRef.current = null;
            // Clear request-scoped state
            if (assistantMsgId) {
              createdAssistantIdsRef.current.delete(assistantMsgId);
              committedAssistantIdsRef.current.delete(assistantMsgId);
            }
            // Clear streaming assistant ID mapping for this requestId
            streamingAssistantIdByRequestIdRef.current.delete(requestId);
          }
        }
      } catch (outerErr: any) {
        // Outer catch for any errors not caught by inner try-catch
        console.error('[usePrimeChat] Outer error:', outerErr);
        // Only clear if this is still the active request
        // CRITICAL: Get assistant message ID from mapping (aiId is out of scope here)
        const assistantMsgId = streamingMsgByRequestRef.current.get(requestId) || streamingIdRef.current;
        if (activeRequestIdRef.current === requestId) {
          setIsStreaming(false);
          abortRef.current = null;
          streamingIdRef.current = null; // Clear streaming ID guard
          inFlightRef.current = false; // Clear in-flight guard
          // Mark as finalized to prevent late chunks
          finalizedRequestIdsRef.current.add(requestId);
          streamingMsgByRequestRef.current.delete(requestId);
          textByRequestRef.current.delete(requestId);
          activeRequestIdRef.current = null;
          // Clear request-scoped state
          if (assistantMsgId) {
            createdAssistantIdsRef.current.delete(assistantMsgId);
            committedAssistantIdsRef.current.delete(assistantMsgId);
          }
        }
      } finally {
        clearStreamTimeout();
        // Ensure in-flight guard is always cleared, even if send fails early
        // Only clear if this is still the active request
        if (activeRequestIdRef.current === requestId) {
          inFlightRef.current = false;
          streamingIdRef.current = null; // Clear streaming ID guard
          // Clear request ID to allow next request
          activeRequestIdRef.current = null;
        }
      }
    };

    await attemptStream();
    } catch (sendErr: any) {
      // Catch any errors from the send function itself (e.g., attemptStream throws)
      console.error('[usePrimeChat] Send function error:', sendErr);
      setIsStreaming(false);
      abortRef.current = null;
      streamingIdRef.current = null; // Clear streaming ID guard
      inFlightRef.current = false; // Clear in-flight guard
    } finally {
      // Ensure in-flight guard is always cleared, even if send fails early
      inFlightRef.current = false;
      streamingIdRef.current = null; // Clear streaming ID guard
    }
  }, [
    endpoint,
    input,
    uploads,
    safeUserId,
    sessionId,
    safeSystemPrompt,
    employeeOverride,
    effectiveThreadId,
    activeEmployeeSlug,
    threadByEmployee,
    parseSSEEvent,
    upsertAssistantMessage,
    additionalPrimeContext
  ]);

  const stop = useCallback(() => {
    resetStream();
  }, [resetStream]);

  // Confirm tool execution - sends "yes" message to backend
  // The backend LLM will re-execute the tool with confirm: true
  const confirmToolExecution = useCallback(async (confirmation: PendingConfirmation) => {
    if (!pendingConfirmation || pendingConfirmation.toolId !== confirmation.toolId) {
      warn('[usePrimeChat] Confirmation mismatch or no pending confirmation');
      return;
    }

    // Clear pending confirmation
    setPendingConfirmation(null);

    // Send "yes" message - backend LLM will re-execute the tool with confirm: true
    await send('yes');
  }, [pendingConfirmation, send]);

  // Cancel tool execution
  const cancelToolExecution = useCallback(() => {
    if (!pendingConfirmation) return;

    // Clear pending confirmation
    setPendingConfirmation(null);

    // Add cancellation message
    setMessages(prev => [...prev, {
      id: `cancel-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      role: 'assistant',
      content: "Okay, I won't run that change.",
      createdAt: new Date().toISOString(),
    }]);
  }, [pendingConfirmation]);

  return {
    messages,
    input,
    setInput,
    isStreaming,
    uploads,
    headers, // Grade 4: Expose headers so components can show them (like X-Employee, X-Memory-Hit)
    toolCalls: import.meta.env.DEV ? toolCalls : [], // Dev-only tool call tracking
    activeEmployeeSlug: activeEmployeeSlug || headers.employee, // Current active employee (from handoff or header)
    pendingConfirmation, // Confirmation state for tool execution
    confirmToolExecution, // Method to confirm tool execution
    cancelToolExecution, // Method to cancel tool execution
    addUploadFiles,
    removeUpload,
    send,
    stop,
    guardrailsStatus, // Guardrails status from SSE meta events
  };
}
