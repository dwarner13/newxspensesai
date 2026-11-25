/**
 * Pure helpers for useEmployeeChat (testable without React).
 */
import type { RestoredMessage } from '@/lib/conversationStore';

interface EngineMessageLike {
  id?: string;
  role?: string;
  content?: unknown;
  createdAt?: string;
  meta?: Record<string, unknown> | null;
}

/**
 * Messages worth caching: real user / assistant turns with text. Panel greetings and
 * other synthetic messages (meta.isGreeting, meta.hidden) are excluded.
 */
export function cacheableMessages(list: readonly EngineMessageLike[]): RestoredMessage[] {
  return list
    .filter(m => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim() !== '')
    .filter(m => m.meta?.isGreeting !== true && m.meta?.hidden !== true)
    .map((m, i) => ({
      id: typeof m.id === 'string' && m.id ? m.id : `c${i}`,
      role: m.role as 'user' | 'assistant',
      content: m.content as string,
      createdAt: m.createdAt ?? '',
    }));
}

/** True when an assistant reply was not saved (server persisted:false). */
export function isUnsavedReply(m: EngineMessageLike): boolean {
  return m.role === 'assistant' && m.meta?.persisted === false;
}
