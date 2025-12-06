import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useHeadersDebug } from './useHeadersDebug';
import { useEventTap } from './useEventTap';
import { CHAT_ENDPOINT } from '../lib/chatEndpoint';

type ChatRole = 'user' | 'assistant' | 'system';

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  createdAt?: string;
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
  
  // Ensure userId is a string (defensive check)
  const safeUserId = typeof userId === 'string' ? userId : String(userId || 'temp-user');
  
  // Ensure systemPrompt is a string or null (defensive check)
  let safeSystemPrompt: string | null | undefined = systemPrompt;
  if (systemPrompt instanceof Promise) {
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
  const abortRef = useRef<AbortController | null>(null);
  const retryCountRef = useRef<number>(0);
  const bufferRef = useRef<string>('');
  
  // Update messages when initialMessages changes (e.g., when history loads)
  // IMPORTANT: Only merge initialMessages if we don't already have messages from streaming
  // This prevents overwriting conversation history that's already been loaded
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
        
        // If we already have messages (from streaming), don't overwrite
        // But if initialMessages has more messages, merge them intelligently
        if (prev.length === 0) {
          return sanitizedInitial;
        }
        // If initialMessages has more messages than current, it means history just loaded
        // Merge them, avoiding duplicates by ID
        if (sanitizedInitial.length > prev.length) {
          const existingIds = new Set(prev.map(m => m.id));
          const newMessages = sanitizedInitial.filter(m => !existingIds.has(m.id));
          return [...prev, ...newMessages];
        }
        return prev;
      });
    }
  }, [initialMessages]);

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

  const parseSSEEvent = useCallback((event: string, aiText: string, aiId: string) => {
    const lines = event.split('\n');
    let hasContent = false;
    
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const payload = line.slice(6).trim();
        if (!payload || payload === '[DONE]') continue;
        
        try {
          const j = JSON.parse(payload);
          
          // Handle employee handoff events
          if (j.type === 'handoff' && j.from && j.to) {
            console.log(`[usePrimeChat] 🔄 Handoff event: ${j.from} → ${j.to}`, j.message || '');
            setActiveEmployeeSlug(j.to);
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
          
          // Handle token/content chunks
          // Support both OpenAI format and our custom SSE format
          const frag = j?.choices?.[0]?.delta?.content ?? j?.content ?? j?.token ?? '';
          if (frag) {
            // Dev log for assistant chunks (reduced frequency)
            if (import.meta.env.DEV && Math.random() < 0.1) { // Only log ~10% of chunks
              console.log('[usePrimeChat] assistant chunk', frag.slice(0, 20) + '...');
            }
            
            aiText += frag;
            hasContent = true;
            // Ensure content is always a string
            const safeContent = String(aiText || '');
            setMessages(prev => prev.map(m => m.id === aiId ? { ...m, content: safeContent } : m));
            
            // Report chunk to dev tools
            if (eventTap) {
              eventTap({ textChunk: frag });
            }
          }
        } catch {
          // Non-OpenAI format: skip (don't accumulate raw)
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
    if (!content && !(opts?.files?.length || uploads.length)) return;

    // Generate unique ID with timestamp + random suffix to prevent duplicate keys
    const localUserMsg: ChatMessage = {
      id: `m-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      role: 'user',
      content: String(content || ''), // Ensure content is always a string
      createdAt: new Date().toISOString(),
    };
    setMessages(prev => [...prev, localUserMsg]);
    setInput('');

    const filesToSend = (opts?.files ?? uploads).map(f => ({
      name: f.name,
      type: f.type,
      data: f.data,
    }));

    // reset uploads after sending
    if (!opts?.files) setUploads([]);

    const controller = new AbortController();
    abortRef.current = controller;
    setIsStreaming(true);
    bufferRef.current = ''; // Reset buffer
    retryCountRef.current = 0; // Reset retry count

    const attemptStream = async (isRetry = false): Promise<void> => {
      try {
        // Grade 4 explanation: We map the employee name (like "prime") to the slug format the server needs (like "prime-boss")
        const employeeSlugMap: Record<EmployeeOverride, string> = {
          prime: 'prime-boss',
          tag: 'tag-ai', // Match database slug from migration
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
        
        const employeeSlug = employeeOverride 
          ? employeeSlugMap[employeeOverride] || 'prime-boss'
          : 'prime-boss';

        // Debug log endpoint before fetch in development (guarded by flag)
        if (DEBUG_PRIME_CHAT && import.meta.env.DEV && !isRetry) {
          console.log('[usePrimeChat] calling chat endpoint:', endpoint);
        }

        // Ensure endpoint is valid before fetch
        if (!endpoint || typeof endpoint !== 'string' || !endpoint.trim()) {
          console.error('[usePrimeChat] Invalid endpoint value:', endpoint);
          setIsStreaming(false);
          return;
        }

        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            ...(employeeOverride ? { 'X-Employee-Override': employeeOverride } : {}),
            // NOTE: systemPrompt is sent in the JSON body, not headers, because HTTP headers
            // must be ISO-8859-1 compatible. System prompts contain markdown, fancy quotes,
            // emojis, and other Unicode characters that cause "non ISO-8859-1 code point" errors.
          },
          body: JSON.stringify({
            userId: safeUserId, // Use safe userId (always a string)
            sessionId,
            message: content,
            employeeSlug,
            ...(safeSystemPrompt ? { systemPromptOverride: safeSystemPrompt } : {}), // Use safe systemPrompt
          }),
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
        const responseSessionId = res.headers.get('X-Session-Id') || sessionId;
        
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
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        // Generate unique ID with timestamp + random suffix to prevent duplicate keys
        let aiId = `a-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
        let aiText = '';

        setMessages(prev => [...prev, { id: aiId, role: 'assistant', content: '' }]); // Empty string is fine, will be updated with streaming content

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
            const parsed = parseSSEEvent(event, aiText, aiId);
            aiText = parsed.aiText;
            
            lastIndex = eventEnd + 2;
            eventEnd = bufferRef.current.indexOf('\n\n', lastIndex);
          }

          // Keep incomplete event in buffer
          bufferRef.current = bufferRef.current.slice(lastIndex);
        }

        // Process any remaining buffer
        if (bufferRef.current.trim()) {
          const parsed = parseSSEEvent(bufferRef.current, aiText, aiId);
          aiText = parsed.aiText;
        }
        
        bufferRef.current = ''; // Clear buffer
      } catch (err: any) {
        if (err.name === 'AbortError') {
          // User aborted, don't retry
          return;
        }
        
        // Log error for debugging
        console.error('[usePrimeChat] Stream error:', err);
        
        // Add error message to UI
        setMessages(prev => [...prev, {
          id: `error-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          role: 'assistant',
          content: String(`Sorry, I encountered an error: ${err.message || 'Unknown error'}. Please try again.`),
          createdAt: new Date().toISOString(),
        }]);
        
        // Network error: retry once
        if (!isRetry && retryCountRef.current < 1) {
          retryCountRef.current++;
          await new Promise(resolve => setTimeout(resolve, 1000));
          return attemptStream(true);
        }
      } finally {
        setIsStreaming(false);
        abortRef.current = null;
      }
    };

    await attemptStream();
  }, [endpoint, input, uploads, safeUserId, sessionId, safeSystemPrompt, employeeOverride, parseSSEEvent]);

  const stop = useCallback(() => {
    resetStream();
  }, [resetStream]);

  return {
    messages,
    input,
    setInput,
    isStreaming,
    uploads,
    headers, // Grade 4: Expose headers so components can show them (like X-Employee, X-Memory-Hit)
    toolCalls: import.meta.env.DEV ? toolCalls : [], // Dev-only tool call tracking
    activeEmployeeSlug: activeEmployeeSlug || headers.employee, // Current active employee (from handoff or header)
    addUploadFiles,
    removeUpload,
    send,
    stop,
  };
}
