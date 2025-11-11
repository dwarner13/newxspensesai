import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useHeadersDebug } from './useHeadersDebug';
import { useEventTap } from './useEventTap';

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

// Grade 4 explanation: This type lists all the employees you can chat with
type EmployeeOverride = 'prime' | 'byte' | 'tag' | 'crystal' | 'goalie' | 'automa' | 'blitz' | 'liberty' | 'chime' | 'roundtable' | 'serenity' | 'harmony' | 'wave' | 'ledger' | 'intelia' | 'dash' | 'custodian';

export function usePrimeChat(
  userId: string, 
  sessionId?: string,
  employeeOverride?: EmployeeOverride
) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [headers, setHeaders] = useState<ChatHeaders>({});
  const abortRef = useRef<AbortController | null>(null);
  const retryCountRef = useRef<number>(0);
  const bufferRef = useRef<string>('');

  const endpoint = useMemo(() => '/.netlify/functions/chat', []);

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

  const send = useCallback(async (text?: string, opts?: SendOptions) => {
    const content = (text ?? input).trim();
    if (!content && !(opts?.files?.length || uploads.length)) return;

    const localUserMsg: ChatMessage = {
      id: `m-${Date.now()}`,
      role: 'user',
      content,
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
          tag: 'tag-categorizer',
          byte: 'byte-docs',
          crystal: 'crystal-analytics',
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

        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            ...(employeeOverride ? { 'X-Employee-Override': employeeOverride } : {})
          },
          body: JSON.stringify({
            userId,
            sessionId,
            message: content,
            employeeSlug,
            attachments: filesToSend.length ? filesToSend : undefined,
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
        let aiId = `a-${Date.now()}`;
        let aiText = '';

        setMessages(prev => [...prev, { id: aiId, role: 'assistant', content: '' }]);

        // Day 7: Enhanced SSE parsing with buffering
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
            
            // Find data line
            const lines = event.split('\n');
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const payload = line.slice(6).trim();
                if (!payload || payload === '[DONE]') continue;
                
                try {
                  const j = JSON.parse(payload);
                  const frag = j?.choices?.[0]?.delta?.content ?? j?.content ?? '';
                  if (frag) {
                    aiText += frag;
                    setMessages(prev => prev.map(m => m.id === aiId ? { ...m, content: aiText } : m));
                    
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

            lastIndex = eventEnd + 2;
            eventEnd = bufferRef.current.indexOf('\n\n', lastIndex);
          }

          // Keep incomplete event in buffer
          bufferRef.current = bufferRef.current.slice(lastIndex);
        }

        // Process any remaining buffer
        if (bufferRef.current.trim()) {
          const lines = bufferRef.current.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const payload = line.slice(6).trim();
              if (payload && payload !== '[DONE]') {
                try {
                  const j = JSON.parse(payload);
                  const frag = j?.choices?.[0]?.delta?.content ?? j?.content ?? '';
                  if (frag) {
                    aiText += frag;
                    setMessages(prev => prev.map(m => m.id === aiId ? { ...m, content: aiText } : m));
                    
                    // Report chunk to dev tools
                    if (eventTap) {
                      eventTap({ textChunk: frag });
                    }
                  }
                } catch {
                  // Ignore parse errors
                }
              }
            } else if (line.startsWith(': chunk-count: ')) {
              // Handle chunk count comment
              const countText = line.slice(15).trim();
              if (eventTap) {
                eventTap({ event: 'chunk-count', data: countText });
              }
            }
          }
        }
        
        bufferRef.current = ''; // Clear buffer
      } catch (err: any) {
        if (err.name === 'AbortError') {
          // User aborted, don't retry
          return;
        }
        
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
  }, [endpoint, input, uploads, userId, sessionId]);

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
    addUploadFiles,
    removeUpload,
    send,
    stop,
  };
}





