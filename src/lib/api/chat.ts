export interface ChatAttachment { name: string; type: string; data: string }
export type ChatMessage = { role: 'user'|'assistant'|'system'; content: string; [k: string]: any };

export function toMessage(role: ChatMessage['role'], content: string): ChatMessage {
  return { role, content };
}

/**
 * DEPRECATED: Legacy chat function with messages array format.
 * Use CHAT_ENDPOINT directly with { userId, message, employeeSlug, sessionId, stream } format.
 * 
 * This function is kept for backward compatibility but will be removed.
 */
export async function chat({ agent = 'prime', messages, userId, attachments }: { agent?: 'prime'|'byte'|'tag'|'goalie'|'crystal'; userId?: string; messages: ChatMessage[]; attachments?: Array<File | ChatAttachment> }) {
  // Convert messages array to single message (use last user message)
  const lastUserMessage = messages.filter(m => m.role === 'user').pop();
  if (!lastUserMessage) {
    throw new Error('No user message found');
  }

  // Map agent to employeeSlug
  const employeeSlugMap: Record<string, string> = {
    'prime': 'prime-boss',
    'byte': 'byte-docs',
    'tag': 'tag-categorize',
    'goalie': 'goalie-goals',
    'crystal': 'crystal-ai',
  };
  const employeeSlug = employeeSlugMap[agent] || 'prime-boss';

  // Use canonical endpoint
  const res = await fetch('/.netlify/functions/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: userId || localStorage.getItem('anonymous_user_id') || 'demo',
      message: lastUserMessage.content,
      employeeSlug,
      stream: true,
    })
  });

  if (!res.ok) throw new Error(`Chat failed: ${res.status}`);

  const ct = res.headers.get('content-type') || '';
  if (ct.includes('text/event-stream') || ct.includes('application/x-ndjson')) {
    const reader = res.body?.getReader();
    if (!reader) return await res.json();
    const decoder = new TextDecoder();
    let content = '';
    let done = false;
    while (!done) {
      const chunk = await reader.read();
      done = !!chunk.done;
      if (chunk.value) {
        const text = decoder.decode(chunk.value, { stream: true });
        // Parse SSE format: data: {...}
        const lines = text.split(/\r?\n/);
        for (const line of lines) {
          if (line.startsWith('data:')) {
            const payload = line.slice(5).trim();
            try {
              const json = JSON.parse(payload);
              if (json.type === 'token' && json.token) {
                content += json.token;
              } else if (json.content) {
                content += String(json.content);
              }
            } catch {
              // Ignore parse errors
            }
          }
        }
      }
    }
    return { content };
  }

  return await res.json();
}

function trimHistory(list: ChatMessage[]): ChatMessage[] {
  if (!Array.isArray(list) || list.length === 0) return [];
  const system = list.find(m => m.role === 'system');
  const rest = list.filter((m, idx) => !(m.role === 'system' && idx !== list.indexOf(system as ChatMessage)));
  const tail = rest.filter(m => m.role !== 'system');
  const max = 20; // ~10 turns
  const trimmedTail = tail.slice(-max);
  return system ? [system, ...trimmedTail] : trimmedTail;
}

function getRollingSummaryId(list: ChatMessage[]): string | undefined {
  for (let i = list.length - 1; i >= 0; i--) {
    const m: any = list[i];
    if (m && typeof m === 'object' && typeof m.summaryId === 'string') return m.summaryId as string;
  }
  return undefined;
}

function isFile(x: any): x is File {
  return typeof File !== 'undefined' && x instanceof File;
}

async function fileToAttachment(file: File): Promise<ChatAttachment> {
  const buf = await file.arrayBuffer();
  const base64 = arrayBufferToBase64(buf);
  return { name: file.name, type: file.type, data: base64 };
}

function arrayBufferToBase64(buffer: ArrayBuffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * DEPRECATED: Legacy chat-v2 function.
 * Use CHAT_ENDPOINT directly with { userId, message, employeeSlug, sessionId, stream } format.
 * 
 * Canonical endpoint: /.netlify/functions/chat
 */
export interface ChatV2Request {
  message: string;
  convoId: string;
  preferredAgent?: string | null;
}

export interface ChatV2Response {
  agent: string;
  reply: string;
  meta?: {
    piiMasked?: boolean;
    moderationFlagged?: boolean;
    summaryUpdated?: boolean;
  };
}

export async function sendChatV2(params: ChatV2Request): Promise<ChatV2Response> {
  // Map to canonical endpoint format
  const userId = localStorage.getItem('anonymous_user_id') || `anon-${Date.now()}`;
  
  const res = await fetch('/.netlify/functions/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId,
      message: params.message,
      sessionId: params.convoId,
      employeeSlug: params.preferredAgent || 'prime-boss',
      stream: false, // v2 was non-streaming
    })
  });
  
  if (!res.ok) {
    const errorText = await res.text().catch(() => 'Unknown error');
    throw new Error(`Chat failed: ${res.status} - ${errorText}`);
  }
  
  const data = await res.json();
  
  // Convert response format
  return {
    agent: data.employee || 'prime-boss',
    reply: data.content || data.message || '',
    meta: {
      piiMasked: data.piiMasked || false,
      moderationFlagged: data.moderationFlagged || false,
    }
  };
}


