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

export function usePrimeChat(userId: string, sessionId?: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const abortRef = useRef<AbortController | null>(null);

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

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          sessionId,
          message: content,
          employeeSlug: 'prime-boss', // Explicitly set Prime for this hook
          attachments: filesToSend.length ? filesToSend : undefined,
        }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        setIsStreaming(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let aiId = `a-${Date.now()}`;
      let aiText = '';

      setMessages(prev => [...prev, { id: aiId, role: 'assistant', content: '' }]);

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });

        // Parse SSE lines
        const events = chunk.split('\n\n');
        for (const evt of events) {
          const line = evt.split('\n').find(l => l.startsWith('data: '));
          if (!line) continue;
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
            // Non-OpenAI format: fallback accumulate raw
            aiText += payload;
            setMessages(prev => prev.map(m => m.id === aiId ? { ...m, content: aiText } : m));
          }
        }
      }
    } catch {
      // aborted or network error
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
    }
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
    addUploadFiles,
    removeUpload,
    send,
    stop,
  };
}





