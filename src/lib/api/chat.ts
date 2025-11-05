export interface ChatAttachment { name: string; type: string; data: string }
export type ChatMessage = { role: 'user'|'assistant'|'system'; content: string; [k: string]: any };

export function toMessage(role: ChatMessage['role'], content: string): ChatMessage {
  return { role, content };
}

export async function chat({ agent = 'prime', messages, userId, attachments }: { agent?: 'prime'|'byte'|'tag'|'goalie'|'crystal'; userId?: string; messages: ChatMessage[]; attachments?: Array<File | ChatAttachment> }) {
  if (typeof window !== 'undefined') {
    try {
      if (!localStorage.getItem('anonymous_user_id')) {
        const id = (globalThis.crypto as any)?.randomUUID?.() || String(Date.now());
        localStorage.setItem('anonymous_user_id', id);
      }
    } catch {}
  }
  const trimmed = trimHistory(messages);
  const summaryId = getRollingSummaryId(messages);

  const encodedAttachments: ChatAttachment[] | undefined = attachments && attachments.length
    ? await Promise.all(attachments.map(async (a: any) => isFile(a) ? fileToAttachment(a as File) : (a as ChatAttachment)))
    : undefined;

  const body: any = { agent, userId: userId || localStorage.getItem('anonymous_user_id') || 'demo', messages: trimmed, attachments: encodedAttachments };
  if (summaryId) body.summaryId = summaryId;

  const res = await fetch('/.netlify/functions/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
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
        // Accept SSE (data: ...) or NDJSON lines
        const lines = text.split(/\r?\n/);
        for (const line of lines) {
          if (!line) continue;
          if (line.startsWith('data:')) {
            const payload = line.slice(5).trim();
            try {
              const json = JSON.parse(payload);
              if (json.content) content += String(json.content);
            } catch {
              content += payload;
            }
          } else {
            // NDJSON or plain text
            try {
              const json = JSON.parse(line);
              if (json.content) content += String(json.content);
            } catch {
              content += line;
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


