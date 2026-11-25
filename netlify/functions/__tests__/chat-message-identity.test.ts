/**
 * Owner P-2..P-5: every chat_messages row written by chat.ts carries an explicit employee_key (the
 * live column defaults to 'user') and a thread_id from ensureThread (FK to chat_threads) — never a
 * session id.
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const chat = fs.readFileSync(path.resolve(__dirname, '../chat.ts'), 'utf8');
const inserts = (() => {
  const lines = chat.split('\n');
  const out: string[] = [];
  lines.forEach((l, i) => { if (/from\('chat_messages'\)\.insert\(\{/.test(l)) out.push(lines.slice(i, i + 15).join('\n')); });
  return out;
})();

describe('chat.ts chat_messages inserts', () => {
  it('there are inserts to check', () => expect(inserts.length).toBeGreaterThanOrEqual(20));
  it('every insert sets employee_key explicitly', () => {
    for (const block of inserts) expect(block).toMatch(/employee_key: (employeeKey|receiptEmployeeKey|completeEmployeeKey)/);
  });
  it('no insert writes a session id into thread_id', () => {
    for (const block of inserts) {
      const m = block.match(/thread_id: ([^,\n]+)/);
      expect(m).not.toBeNull();
      expect(m![1]).not.toMatch(/sessionId|activeSessionId/);
    }
  });
  it('the receipt and specialist_complete rows resolve the employee thread via ensureThread', () => {
    expect(chat).toContain('const receiptThreadId = await ensureThread(sb, userId, receiptEmployeeKey, requestThreadId || undefined);');
    expect(chat).toContain('const completeThreadId = await ensureThread(sb, userId, completeEmployeeKey, requestThreadId || undefined);');
  });
});
