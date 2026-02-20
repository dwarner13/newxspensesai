import { createHash } from 'crypto';

export function hashTextSha256(text: string): string {
  return createHash('sha256').update(String(text || ''), 'utf8').digest('hex');
}

export function safeTextMetrics(text?: string): { hash?: string; length?: number } {
  const value = String(text || '');
  const length = value.length;
  if (length <= 0) return {};
  return {
    hash: hashTextSha256(value),
    length,
  };
}
