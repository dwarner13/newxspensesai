/**
 * Owner P-2..P-5 and "no silent save failures": every chat_messages insert in chat.ts
 * (object literal or a prepared `messageData`) sets an explicit employee_key (live default 'user'),
 * uses an employee thread id (FK to chat_threads, never a session id), surfaces database errors
 * (.throwOnError(), so the surrounding catch runs) and marks the request as not persisted on failure.
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const chat = fs.readFileSync(path.resolve(__dirname, '../chat.ts'), 'utf8');
const lines = chat.split('\n');
const sites = lines.map((l, i) => (/from\('chat_messages'\)\.insert\(/.test(l) ? i : -1)).filter(i => i >= 0);

/** The row literal for an insert: the object passed inline, or the `messageData` built just before. */
function rowFor(i: number): string {
  if (/\.insert\(\{\s*$/.test(lines[i])) return lines.slice(i, i + 16).join('\n');
  const start = lines.slice(Math.max(0, i - 25), i).map((l, k) => ({ l, k: Math.max(0, i - 25) + k })).reverse().find(x => /const messageData: any = \{/.test(x.l));
  expect(start, `messageData literal before line ${i + 1}`).toBeDefined();
  return lines.slice(start!.k, i + 1).join('\n');
}

describe('chat.ts chat_messages inserts', () => {
  it('finds every insert site (object literal and messageData forms)', () => {
    // 22: O-7 (owner GO 2026-11-27) retired the unreachable Prime insight lane and its 2 inserts (was 24).
    expect(sites.length).toBeGreaterThanOrEqual(22);
    expect(sites.filter(i => /insert\(messageData\)/.test(lines[i]))).toHaveLength(2);
  });
  it('every insert sets employee_key explicitly', () => {
    for (const i of sites) expect(rowFor(i), `line ${i + 1}`).toMatch(/employee_key: (employeeKey|receiptEmployeeKey|completeEmployeeKey)/);
  });
  it('no insert writes a session id into thread_id', () => {
    for (const i of sites) {
      const m = rowFor(i).match(/thread_id: ([^,\n]+)/);
      expect(m, `line ${i + 1}`).not.toBeNull();
      expect(m![1]).not.toMatch(/sessionId|activeSessionId|finalSessionId/);
    }
  });
  it('every insert surfaces database errors (.throwOnError) instead of failing silently', () => {
    for (const i of sites) {
      // the insert statement up to its terminating ';' (nested metadata can be long)
      const end = lines.findIndex((l, k) => k >= i && /;\s*$/.test(l));
      expect(lines.slice(i, end + 1).join('\n'), `line ${i + 1}`).toMatch(/\.throwOnError\(\)/);
    }
  });
  it('save failures mark the request not persisted, and every reply payload reports it', () => {
    expect(chat).toContain('let conversationPersisted = true;');
    // 14 / 8: the retired O-7 insight lane carried one of each (was 15 / 9). Every remaining insert is
    // still checked one by one above (employee_key, thread_id, throwOnError).
    expect((chat.match(/conversationPersisted = false;/g) || []).length).toBeGreaterThanOrEqual(14);
    expect(chat).toContain("const donePayload = { type: 'done', guardrails: guardrailsMetadata, thread_id: threadId, persisted: conversationPersisted };");
    expect((chat.match(/content: assistantContent, persisted: conversationPersisted,/g) || []).length).toBe(8);
    expect(chat).toContain('persisted: conversationPersisted, // owner: save failures are reported, never silent');
  });
  it("streaming 'done' is sent after the reply save (so it can report persisted)", () => {
    expect(chat.indexOf("Send completion signal after the reply is saved")).toBeGreaterThan(chat.indexOf('Inserting assistant message with thread_id'));
  });
  it('receipt and specialist_complete rows resolve the employee thread via ensureThread', () => {
    expect(chat).toContain('const receiptThreadId = await ensureThread(sb, userId, receiptEmployeeKey, requestThreadId || undefined);');
    expect(chat).toContain('const completeThreadId = await ensureThread(sb, userId, completeEmployeeKey, requestThreadId || undefined);');
  });
});

describe('chat.ts universal conversation identity (owner): one conversation, one employee', () => {
  const block = chat.slice(chat.indexOf('if (sessionEmployeeSlug !== finalEmployeeSlug) {'), chat.indexOf("if (!finalSessionId) {\n        throw new Error('Failed to get session ID from ensureSession');"));
  it('aliases of the same employee continue the conversation without relabelling', () => {
    expect(block).toMatch(/const sameEmployee = sessionCanonical !== null && sessionCanonical === canonicalEmployeeSlug\(finalEmployeeSlug\);/);
  });
  it("another employee's conversation is never relabelled unless it is a genuine handoff conversation", () => {
    expect(block).toMatch(/\.from\('handoffs'\)[\s\S]{0,200}\.eq\('session_id', finalSessionId\)[\s\S]{0,80}\.eq\('user_id', userId\)/);
    expect(block).toMatch(/else if \(shouldRespectRequestedEmployee && !isHandoffConversation\) \{[\s\S]{0,400}const fresh = await ensureSession\(sb, userId, undefined, finalEmployeeSlug\);/);
    // the relabel branches come only after the no-handoff guard
    expect(block.indexOf('!isHandoffConversation')).toBeLessThan(block.indexOf(".update({ employee_slug: finalEmployeeSlug })"));
    expect(block.indexOf('!isHandoffConversation')).toBeLessThan(block.indexOf(".update({ employee_slug: 'prime-boss' })"));
  });
});
