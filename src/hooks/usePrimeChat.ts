import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useHeadersDebug } from './useHeadersDebug';
import { useEventTap } from './useEventTap';
import { CHAT_ENDPOINT } from '../lib/chatEndpoint';
import { usePrimeState } from '../contexts/PrimeContext';

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
}

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
  initialMessages?: ChatMessage[] // Optional initial messages to populate on mount
) {
  // Debug flag to control console logging
  const DEBUG_PRIME_CHAT = false;
  
  // Get PrimeState for context injection (read-only, fail-safe)
  const primeState = usePrimeState();
  
  // Ensure userId is a string (defensive check)
  const safeUserId = typeof userId === 'string' ? userId : String(userId || 'temp-user');
  
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
        console.warn('[usePrimeChat] Failed to retrieve sessionId from localStorage:', e);
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
        console.warn('[usePrimeChat] Failed to retrieve thread_id from localStorage:', e);
      }
    }
    return undefined;
  });
  
  // Ensure systemPrompt is a string or null (defensive check)
  let safeSystemPrompt: string | null | undefined = systemPrompt;
  if (systemPrompt && typeof systemPrompt === 'object' && 'then' in systemPrompt) {
    // Check for Promise-like object (defensive check)
    console.warn('[usePrimeChat] systemPrompt is a Promise, this should be resolved before passing to usePrimeChat');
    safeSystemPrompt = null; // Use null instead of awaiting to avoid blocking
  } else if (systemPrompt !== null && systemPrompt !== undefined && typeof systemPrompt !== 'string') {
    console.warn('[usePrimeChat] systemPrompt is not a string, converting:', typeof systemPrompt);
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
  
  // CRITICAL: Track streaming message by requestId for idempotent placeholder creation
  const streamingMsgByRequestRef = useRef<Map<string, string>>(new Map());
  
  // CRITICAL: Track accumulated text per requestId
  const textByRequestRef = useRef<Map<string, string>>(new Map());
  
  // CRITICAL: Streaming assistant ID guard - prevents duplicate assistant placeholder creation
  const streamingIdRef = useRef<string | null>(null);
  
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
            console.log(`[usePrimeChat] Merge dedupe stats:`, {
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
      console.log('[usePrimeChat] using chat endpoint:', endpoint);
    }
  }, [endpoint]);

  // Dev tools hooks (optional - will be no-ops if DevToolsProvider not mounted)
  const headersDebug = useHeadersDebug();
  const eventTap = useEventTap();

  const resetStream = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
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

  // Helper to parse SSE event and handle tool_executing
  // Track active employee for handoff handling
  const [activeEmployeeSlug, setActiveEmployeeSlug] = useState<string | undefined>(undefined);

  // Initialize activeEmployeeSlug from session on mount (canonical source: chat_sessions.employee_slug)
  // CRITICAL: On /dashboard/prime-chat, allow handoffs to stick (don't force Prime after handoff)
  useEffect(() => {
    if (!effectiveSessionId || !safeUserId) return;
    
    // Check if we're on /dashboard/prime-chat route
    const isPrimeChatPage = typeof window !== 'undefined' && window.location.pathname === '/dashboard/prime-chat';
    
    // If employeeOverride is provided and NOT on Prime Chat page, respect it (route-forced employee takes precedence)
    // On /dashboard/prime-chat, we allow handoffs to override the initial Prime default
    if (employeeOverride && employeeOverride !== 'prime' && !isPrimeChatPage) {
      // Only load from session if employeeOverride is not prime (allows other routes to use session)
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

  const parseSSEEvent = useCallback((event: string, aiText: string, aiId: string, requestId?: string) => {
    // CRITICAL: Short-circuit guards BEFORE parsing JSON (prevents duplicate processing)
    if (requestId) {
      // Ignore chunks for finalized requests (prevents duplicate bubbles)
      if (finalizedRequestIdsRef.current.has(requestId)) {
        if (import.meta.env.DEV) {
          console.warn(`[usePrimeChat] 🚫 Ignoring event for finalized request ${requestId}`);
        }
        return { aiText, hasContent: false };
      }
      
      // Ignore chunks for stale requests
      if (activeRequestIdRef.current !== requestId) {
        if (import.meta.env.DEV) {
          console.warn(`[usePrimeChat] 🚫 Ignoring event for stale request (active: ${activeRequestIdRef.current}, current: ${requestId})`);
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
              console.log('[usePrimeChat] Guardrails status from meta event:', j.guardrails);
            }
            currentEventType = null; // Reset event type
            continue; // Don't process further for guardrails meta events
          }
          
          // Handle employee handoff events
          // CRITICAL: Always respect handoff events - they indicate the backend has switched employees
          if (j.type === 'handoff' && j.from && j.to) {
            console.log(`[usePrimeChat] 🔄 Handoff event: ${j.from} → ${j.to}`, j.message || '');
            
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
            setActiveEmployeeSlug(j.employee);
            if (import.meta.env.DEV) {
              console.log(`[usePrimeChat] Active employee updated: ${j.employee}`);
            }
          }
          
          // Handle confirmation_required events
          if (j.type === 'confirmation_required' && j.tool && j.summary) {
            console.log(`[usePrimeChat] Confirmation required for tool: ${j.tool}`, j);
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
          
          // Handle tool_executing events (dev mode)
          if (j.type === 'tool_executing' && j.tool && import.meta.env.DEV) {
            const toolCallDebug: ToolCallDebug = {
              tool: j.tool,
              args: j.args || undefined,
              timestamp: Date.now(),
            };
            setToolCalls(prev => [...prev, toolCallDebug]);
            console.log(`[usePrimeChat] Tool executing: ${j.tool}`, j.args || '');
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
              // Update effectiveThreadId state
              setEffectiveThreadId(receivedThreadId);
              // Store thread_id in localStorage
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
                  // CRITICAL: Store thread_id keyed by employeeSlug so each employee has its own thread
                  const threadStorageKey = `chat_thread_${safeUserId}_${employeeSlug}`;
                  localStorage.setItem(threadStorageKey, receivedThreadId);
                  if (import.meta.env.DEV) {
                    console.log(`[ChatUI] Received thread_id=${receivedThreadId} for employeeSlug=${employeeSlug}`);
                  }
                } catch (e) {
                  console.warn('[usePrimeChat] Failed to store thread_id in localStorage:', e);
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
                console.warn(`[usePrimeChat] ⚠️ No messageId found for requestId ${requestId}, skipping chunk`);
              }
              continue;
            }
            
            // Accumulate text for this requestId
            const currentText = textByRequestRef.current.get(requestId) ?? '';
            const nextText = currentText + frag;
            textByRequestRef.current.set(requestId, nextText);
            
            // Dev log for assistant chunks (reduced frequency)
            if (import.meta.env.DEV && Math.random() < 0.1) { // Only log ~10% of chunks
              console.log('[usePrimeChat] assistant chunk', frag.slice(0, 20) + '...');
            }
            
            // Update the assistant message with accumulated text
            setMessages(prev => {
              // Check if message exists (should exist if created properly)
              const existingMessage = prev.find(m => m.id === mid);
              if (!existingMessage) {
                // Message doesn't exist - this shouldn't happen, but guard against it
                if (import.meta.env.DEV) {
                  console.warn(`[usePrimeChat] ⚠️ Chunk handler: message ${mid} not found in state, skipping update`);
                }
                return prev;
              }
              
              // Update existing message (do not append, do not create new)
              // Keep is_streaming flag true while streaming
              const updated = prev.map(m => {
                if (m.id === mid) {
                  return { 
                    ...m, 
                    content: nextText,
                    meta: {
                      ...m.meta,
                      is_streaming: true, // Keep streaming flag while updating
                    },
                  };
                }
                return m;
              });
              
              // Dev log: streaming update (reduced frequency)
              if (import.meta.env.DEV && Math.random() < 0.05) { // Log ~5% of updates
                console.log(`[usePrimeChat] 📝 Streaming update (id: ${mid}, length: ${nextText.length})`);
              }
              
              return updated;
            });
            
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
  }, [eventTap]);

  const send = useCallback(async (text?: string | Promise<string>, opts?: SendOptions) => {
    // CRITICAL: In-flight guard - prevent duplicate sends
    if (inFlightRef.current) {
      if (import.meta.env.DEV) {
        console.warn('[usePrimeChat] 🚫 Duplicate send blocked (inFlight)');
      }
      return;
    }
    inFlightRef.current = true;
    
    try {
      // Handle case where text might be a Promise (shouldn't happen, but defensive coding)
      let messageText: string;
      if (text instanceof Promise) {
        console.warn('[usePrimeChat] Received Promise instead of string in send(), awaiting... This should be resolved before calling send().');
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
    setMessages(prev => [...prev, localUserMsg]);
    
    // Dev log: optimistic message added
    if (import.meta.env.DEV) {
      console.log(`[usePrimeChat] ✅ Added optimistic user message (client_message_id: ${clientMessageId})`);
    }
    setInput('');

    const filesToSend = (opts?.files ?? uploads).map(f => ({
      name: f.name,
      type: f.type,
      data: f.data,
    }));

    // reset uploads after sending
    if (!opts?.files) setUploads([]);

    // CRITICAL: Generate request-scoped ID and abort any prior request
    const requestId = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    activeRequestIdRef.current = requestId;
    
    // Define finalEmployeeSlug ONCE at the top of send() to avoid ReferenceError
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
    const finalEmployeeSlug = activeEmployeeSlug || (employeeOverride ? employeeSlugMap[employeeOverride] || 'prime-boss' : 'prime-boss');
    
    // PART A: Create assistant placeholder BEFORE consuming SSE (idempotent)
    // Check if we already have a streaming message for this requestId
    let effectiveAiId: string;
    const existingStreamingId = streamingMsgByRequestRef.current.get(requestId);
    
    if (existingStreamingId) {
      // Already have a streaming message for this requestId - reuse it (DO NOT create new)
      if (import.meta.env.DEV) {
        console.log(`[usePrimeChat] 🔄 Reusing existing streaming assistant message (id: ${existingStreamingId}, requestId: ${requestId})`);
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
          employee_key: finalEmployeeSlug,
          is_streaming: true,
          request_id: requestId,
        },
      };
      
      setMessages(prev => {
        // Defensive check: ensure message doesn't already exist
        if (prev.some(m => m.id === aiId)) {
          if (import.meta.env.DEV) {
            console.warn(`[usePrimeChat] 🚫 Message ${aiId} already exists in state, skipping add`);
          }
          return prev;
        }
        
        // Dev log: streaming message created BEFORE fetch
        if (import.meta.env.DEV) {
          console.log(`[usePrimeChat] ✅ Created streaming assistant message BEFORE fetch (id: ${aiId}, employee: ${finalEmployeeSlug}, requestId: ${requestId})`);
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
      try {
        // Map outgoing employee slug back to employeeOverride format for header (only if Prime)
        // employeeOverride header should only be 'prime' when the active employee is actually Prime
        const outgoingEmployeeOverride = finalEmployeeSlug === 'prime-boss' ? 'prime' : undefined;

        // Debug log endpoint before fetch in development (guarded by flag)
        if (DEBUG_PRIME_CHAT && import.meta.env.DEV && !isRetry) {
          console.log('[usePrimeChat] calling chat endpoint:', endpoint);
        }

        // Ensure endpoint is valid before fetch
        if (!endpoint || typeof endpoint !== 'string' || !endpoint.trim()) {
          console.error('[usePrimeChat] Invalid endpoint value:', endpoint);
          setIsStreaming(false);
          streamingIdRef.current = null; // Clear streaming ID guard
          inFlightRef.current = false; // Clear in-flight guard
          return;
        }

        // Build prime_context snapshot (minimal, safe fields only)
        let primeContext: any = null;
        if (primeState && finalEmployeeSlug === 'prime-boss') {
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
            } : null
          };
          
          // Dev logging (redacted preview)
          if (import.meta.env.DEV && !isRetry) {
            console.log('[PrimeContext] attaching prime_context to chat request', {
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
          console.log('[Context Injection] 🧠 Employee Context Data', {
            employeeSlug: finalEmployeeSlug,
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
            }[finalEmployeeSlug] || 'Standard context (facts, history)',
          });
        }

        // Get Supabase session token for Authorization header
        const { getSupabase } = await import('../lib/supabase');
        const supabase = getSupabase();
        if (!supabase) {
          console.error('[usePrimeChat] Supabase client not available');
          setIsStreaming(false);
          streamingIdRef.current = null; // Clear streaming ID guard
          inFlightRef.current = false; // Clear in-flight guard
          return;
        }
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session?.access_token) {
          console.error('[usePrimeChat] No auth token available - cannot authenticate chat request');
          setIsStreaming(false);
          streamingIdRef.current = null; // Clear streaming ID guard
          inFlightRef.current = false; // Clear in-flight guard
          // Error is handled by adding error message to messages array (see catch block)
          return;
        }

        // Build request body
        const requestBody = {
          userId: safeUserId, // Use safe userId (always a string)
          sessionId: effectiveSessionId || sessionId, // Use effectiveSessionId (from localStorage or prop)
          threadId: effectiveThreadId, // Include thread_id if available
          message: content,
          employeeSlug: finalEmployeeSlug, // CRITICAL: Always send employeeSlug so backend routes correctly
          ...(safeSystemPrompt ? { systemPromptOverride: safeSystemPrompt } : {}), // Use safe systemPrompt
          ...(opts?.documentIds && opts.documentIds.length > 0 ? { documentIds: opts.documentIds } : {}), // Include document IDs if provided
          ...(primeContext ? { prime_context: primeContext } : {}), // Include PrimeState snapshot for Prime only
        };
        
        // Dev logging: Log employee routing once per request
        if (import.meta.env.DEV && !isRetry) {
          console.log(`[ChatUI] Sending to employeeSlug=${finalEmployeeSlug} thread_id=${effectiveThreadId || 'none'} employeeOverride=${outgoingEmployeeOverride || 'none'} activeEmployeeSlug=${activeEmployeeSlug || 'none'}`);
        }

        // DEBUG MODE: Log request/response details (DEV only)
        const DEBUG_MODE = import.meta.env.DEV || false;
        
        // Log complete request payload for context verification
        if (DEBUG_MODE && !isRetry) {
          console.group(`🤖 [AI Request] ${finalEmployeeSlug}`);
          console.log('📤 Request sent:', {
            endpoint,
            method: 'POST',
            employeeSlug: finalEmployeeSlug,
            messageLength: content.length,
            hasThreadId: !!effectiveThreadId,
            hasSessionId: !!effectiveSessionId,
          });
          console.log('📤 Request Payload:', {
            employeeSlug: finalEmployeeSlug,
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
            }[finalEmployeeSlug] || 'Facts + History (standard)',
          });
          
          // Log detailed context data
          if (requestBody.prime_context) {
            console.log('👑 Prime Context:', {
              displayName: requestBody.prime_context.displayName,
              currency: requestBody.prime_context.currency,
              stage: requestBody.prime_context.currentStage,
              financialSnapshot: requestBody.prime_context.financialSnapshot,
              memorySummary: requestBody.prime_context.memorySummary,
            });
          }
          
          if (requestBody.documentIds) {
            console.log('📄 Document IDs:', requestBody.documentIds);
          }
          
          if (requestBody.systemPromptOverride) {
            console.log('📝 Custom System Prompt:', requestBody.systemPromptOverride.substring(0, 200) + '...');
          }
          
          console.log('💬 User Message:', content);
          console.groupEnd();
        }

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
          setIsStreaming(false);
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
            console.warn('[usePrimeChat] Failed to store sessionId in localStorage:', e);
          }
        }

        // Report headers to dev tools
        if (headersDebug) {
          headersDebug(res.headers);
        }

        if (!res.body) {
          setIsStreaming(false);
          streamingIdRef.current = null; // Clear streaming ID guard
          inFlightRef.current = false; // Clear in-flight guard
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        
        // Get the messageId for this requestId (should already exist from PART A)
        const messageId = streamingMsgByRequestRef.current.get(requestId);
        if (!messageId) {
          console.error(`[usePrimeChat] ⚠️ No messageId found for requestId ${requestId} - placeholder should have been created before fetch`);
          setIsStreaming(false);
          inFlightRef.current = false;
          return;
        }
        
        // CRITICAL: Check if this requestId has already been finalized (prevents late chunks)
        if (finalizedRequestIdsRef.current.has(requestId)) {
          if (import.meta.env.DEV) {
            console.warn(`[usePrimeChat] 🚫 Request ${requestId} already finalized, ignoring`);
          }
          setIsStreaming(false);
          inFlightRef.current = false;
          return;
        }
        
        // Capture variables for fallback (if streaming fails) - must be outside try block
        const fallbackRequestBody = {
          userId: safeUserId,
          sessionId: effectiveSessionId || sessionId,
          threadId: effectiveThreadId,
          message: content,
          employeeSlug: finalEmployeeSlug,
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
            const { value, done } = await reader.read();
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
                console.log('[SSE]', event);
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
                parseSSEEvent(event, '', messageId, eventRequestId);
              } else {
                // Fallback: parse without requestId (won't update textByRequestRef)
                parseSSEEvent(event, '', messageId, requestId);
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
              console.log('[SSE] Final buffer:', bufferRef.current);
            }
            // Parse final buffer - need to pass requestId to update textByRequestRef
            parseSSEEvent(bufferRef.current, '', messageId, requestId);
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
                console.warn(`[usePrimeChat] 🚫 Message ${streamingAssistantId} already committed for this request, skipping`);
              }
            } else if (activeRequestIdRef.current !== requestId) {
              // Stale request - ignore
              if (import.meta.env.DEV) {
                console.warn(`[usePrimeChat] 🚫 Stale request on commit (active: ${activeRequestIdRef.current}, current: ${requestId}), ignoring`);
              }
            } else {
              // Commit ONCE - update existing streaming message, never append
              committedAssistantIdsRef.current.add(streamingAssistantId);
              
              // If no content received, show safe fallback message instead of removing placeholder
              const contentToCommit = finalContent.trim().length > 0 
                ? finalContent 
                : "Sorry — I didn't receive a response. Please try again.";
              
              setMessages(prev => {
                // Find existing message by ID and update it
                const existingIndex = prev.findIndex(m => m.id === streamingAssistantId);
                
                if (existingIndex !== -1) {
                  // Update existing message (same id, not append)
                  const updated = [...prev];
                  const existingMessage = updated[existingIndex];
                  updated[existingIndex] = { 
                    ...existingMessage, 
                    content: contentToCommit,
                    meta: {
                      ...existingMessage.meta,
                      is_streaming: false, // Remove streaming flag on completion
                    },
                  };
                  
                  // Dev log: final message committed (update, not append)
                  if (import.meta.env.DEV && !isRetry) {
                    console.log(`[usePrimeChat] ✅ Final message committed (update: true, appended: false, requestId: ${requestId}):`, {
                      messageId: streamingAssistantId,
                      contentLength: contentToCommit.length,
                      totalMessages: updated.length,
                      assistantMessages: updated.filter(m => m.role === 'assistant').length,
                    });
                  }
                  
                  return updated;
                } else {
                  // Fallback: message not found (shouldn't happen, but defensive)
                  if (import.meta.env.DEV) {
                    console.warn(`[usePrimeChat] ⚠️ Streaming message ${streamingAssistantId} not found, appending as fallback`);
                  }
                  return [...prev, {
                    id: streamingAssistantId,
                    role: 'assistant',
                    content: contentToCommit,
                    createdAt: new Date().toISOString(),
                  }];
                }
              });
            }
            
            // Trigger scroll after state update (use requestAnimationFrame to ensure DOM updated)
            requestAnimationFrame(() => {
              // Scroll will be handled by UnifiedAssistantChat's useEffect watching messages
              if (DEBUG_MODE && !isRetry) {
                console.log('[usePrimeChat] 📜 Scroll triggered after message commit');
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
              console.group(`✅ [AI Response] ${finalEmployeeSlug}`);
              console.log('📥 Response Headers:', {
                employee: extractedHeaders.employee,
                memoryHit: extractedHeaders.memoryHit,
                memoryCount: extractedHeaders.memoryCount,
                sessionSummary: extractedHeaders.sessionSummary ? 'present' : 'none',
                guardrails: extractedHeaders.guardrails,
                streamChunkCount: extractedHeaders.streamChunkCount,
              });
              console.log('💬 Assistant Response:', finalText);
              console.log('📊 Response Length:', finalText.length, 'characters');
              console.log('🔍 Response Preview:', finalText.substring(0, 200) + (finalText.length > 200 ? '...' : ''));
              
              // Check if response references context data
              const hasNumbers = /\d+/.test(finalText);
              const hasContextualData = 
                (finalEmployeeSlug === 'prime-boss' && (finalText.includes('uncategorized') || finalText.includes('spent') || finalText.includes('category'))) ||
                (finalEmployeeSlug === 'byte-docs' && (finalText.includes('document') || finalText.includes('upload'))) ||
                (finalEmployeeSlug === 'tag-ai' && (finalText.includes('uncategorized') || finalText.includes('categor') || /\d+.*transaction/i.test(finalText))) ||
                (finalEmployeeSlug === 'crystal-analytics' && (finalText.includes('spent') || finalText.includes('category') || finalText.includes('budget')));
              
              console.log('🧠 Intelligence Check:', {
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
        setIsStreaming(false);
        abortRef.current = null;
        } catch (err: any) {
          if (err.name === 'AbortError') {
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
          
          // Log error for debugging
          console.error('[usePrimeChat] Stream error:', err);
          
          // FALLBACK: If streaming fails, try non-streaming JSON response
          if (!isRetry && retryCountRef.current < 1) {
            console.log('[usePrimeChat] Streaming failed, falling back to non-streaming JSON...');
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
                setMessages(prev => {
                  const existingIndex = prev.findIndex(m => m.id === fallbackMessageId);
                  
                  if (existingIndex !== -1) {
                    // Update existing placeholder message
                    const updated = [...prev];
                    const existingMessage = updated[existingIndex];
                    updated[existingIndex] = {
                      ...existingMessage,
                      content: String(assistantContent),
                      meta: {
                        ...existingMessage.meta,
                        is_streaming: false, // Remove streaming flag on completion
                      },
                    };
                    
                    if (import.meta.env.DEV) {
                      console.log(`[usePrimeChat] ✅ Fallback: Updated existing placeholder (id: ${fallbackMessageId}, content length: ${assistantContent.length})`);
                    }
                    
                    return updated;
                  } else {
                    // Placeholder not found - create it first, then update (prevents duplicate)
                    if (import.meta.env.DEV) {
                      console.warn(`[usePrimeChat] ⚠️ Fallback: Placeholder ${fallbackMessageId} not found, creating placeholder first`);
                    }
                    
                    // Create placeholder message first
                    const fallbackPlaceholder: ChatMessage = {
                      id: fallbackMessageId,
                      role: 'assistant',
                      content: String(assistantContent),
                      createdAt: new Date().toISOString(),
                      meta: {
                        employee_key: finalEmployeeSlug,
                        is_streaming: false, // Already complete from fallback
                        request_id: requestId,
                      },
                    };
                    
                    // Update placeholder with content (same as if found)
                    return [...prev, fallbackPlaceholder];
                  }
                });
                
                // Store thread_id if received
                if (responseThreadId && safeUserId && employeeOverride) {
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
                    localStorage.setItem(threadStorageKey, String(responseThreadId));
                  } catch (e) {
                    console.warn('[usePrimeChat] Failed to store thread_id from fallback:', e);
                  }
                }
                
                if (import.meta.env.DEV) {
                  console.log(`[usePrimeChat] ✅ Fallback JSON response successful: ${assistantContent.length} chars`);
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
          setMessages(prev => {
            const existingIndex = prev.findIndex(m => m.id === errorMessageId);
            
            if (existingIndex !== -1) {
              // Update existing placeholder with error message
              const updated = [...prev];
              const existingMessage = updated[existingIndex];
              updated[existingIndex] = {
                ...existingMessage,
                content: "Sorry — I didn't receive a response. Please try again.",
                meta: {
                  ...existingMessage.meta,
                  is_streaming: false, // Remove streaming flag on error
                },
              };
              return updated;
            }
            
            // Placeholder not found, add error message
            return [...prev, {
              id: `error-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
              role: 'assistant',
              content: String(`Sorry, I encountered an error: ${err.message || 'Unknown error'}. Please try again.`),
              createdAt: new Date().toISOString(),
            }];
          });
        } finally {
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
  }, [endpoint, input, uploads, safeUserId, sessionId, safeSystemPrompt, employeeOverride, effectiveThreadId, parseSSEEvent]);

  const stop = useCallback(() => {
    resetStream();
  }, [resetStream]);

  // Confirm tool execution - sends "yes" message to backend
  // The backend LLM will re-execute the tool with confirm: true
  const confirmToolExecution = useCallback(async (confirmation: PendingConfirmation) => {
    if (!pendingConfirmation || pendingConfirmation.toolId !== confirmation.toolId) {
      console.warn('[usePrimeChat] Confirmation mismatch or no pending confirmation');
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
