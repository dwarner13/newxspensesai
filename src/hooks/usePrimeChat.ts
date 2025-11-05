import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

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

export function usePrimeChat(userId: string, sessionId?: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [headers, setHeaders] = useState<ChatHeaders>({});
  const abortRef = useRef<AbortController | null>(null);
  const retryCountRef = useRef<number>(0);
  const bufferRef = useRef<string>('');

  const endpoint = useMemo(() => '/.netlify/functions/chat', []);

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
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            sessionId,
            message: content,
            employeeSlug: 'prime-boss',
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
                  }
                } catch {
                  // Non-OpenAI format: skip (don't accumulate raw)
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
                  }
                } catch {
                  // Ignore parse errors
                }
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
    headers, // Day 7: Expose headers in hook state
    addUploadFiles,
    removeUpload,
    send,
    stop,
  };
}





