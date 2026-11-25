/**
 * Universal employee conversation history — the shared hook (useEmployeeChat), the shared
 * controls, and the first employee wired to them (Crystal). Owner GO 2026-11-25.
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { cacheableMessages, isUnsavedReply } from '../employeeChat';

const root = path.resolve(__dirname, '../../..');
const read = (p: string) => fs.readFileSync(path.join(root, p), 'utf8');
const hook = read('src/hooks/useEmployeeChat.ts');
const controls = read('src/components/chat/ConversationControls.tsx');
const crystal = read('src/pages/MyStoryV2/CrystalCopilotPanel.tsx');

describe('helpers', () => {
  it('caches real user / assistant turns only (no greetings, hidden or empty)', () => {
    const out = cacheableMessages([
      { id: 'a', role: 'user', content: 'hi' },
      { id: 'b', role: 'assistant', content: 'Hello', meta: { isGreeting: true } },
      { id: 'c', role: 'assistant', content: 'Your dining is up 12%.' },
      { id: 'd', role: 'system', content: 'x' },
      { id: 'e', role: 'assistant', content: '   ' },
      { id: 'f', role: 'assistant', content: 'hidden', meta: { hidden: true } },
    ]);
    expect(out.map(m => m.id)).toEqual(['a', 'c']);
  });
  it('unsaved replies are assistant messages with meta.persisted === false', () => {
    expect(isUnsavedReply({ role: 'assistant', meta: { persisted: false } })).toBe(true);
    expect(isUnsavedReply({ role: 'assistant', meta: { persisted: true } })).toBe(false);
    expect(isUnsavedReply({ role: 'user', meta: { persisted: false } })).toBe(false);
  });
});

describe('useEmployeeChat: one implementation for every employee', () => {
  it('only sends ids that were just generated or verified for THIS user AND THIS employee', () => {
    expect(hook).toMatch(/verifyOwnedSession\(sb, userId, cachedId, employee\)/);
    expect(hook).toMatch(/loadEmployeeSessions\(sb, userId, employee, 1\)/);
    expect(hook).toMatch(/if \(!\(await verifyOwnedSession\(sb, userId, id, employee\)\)\) return false;/);
    expect(hook).toMatch(/useUnifiedChatEngine\(\{ \.\.\.options, conversationId: sessionId, initialMessages \}\)/);
  });
  it('panel options (persona slug, context) pass through unchanged', () => {
    expect(hook).toMatch(/employeeSlug: string;/);
    expect(hook).toMatch(/\.\.\.options,/);
  });
  it('New conversation starts a fresh session; nothing is deleted', () => {
    expect(hook).toMatch(/const startNewConversation = useCallback\(\(\) => \{\s*switchTo\(freshSessionId\(\), \[\]\);/);
    expect(hook + controls).not.toMatch(/\.delete\(|removeItem|chat_threads/);
  });
  it('switching clears the engine before handing it the restored messages', () => {
    expect(hook).toMatch(/clearMessages\(\);\s*resetThread\(\);\s*setSessionId\(id\);\s*setInitialMessages\(rows\);/);
  });
  it('restore cannot cancel itself when engine callbacks change', () => {
    expect(hook).toMatch(/\}, \[userId, employee\]\);/);
    expect(hook).toMatch(/switchToRef\.current\(/);
  });
  it('account-scoped cache, per user and employee', () => {
    expect(hook).toMatch(/writeCachedConversation\(window\.localStorage, userId, employee, \{ sessionId, messages: cacheableMessages\(engine\.messages\) \}\)/);
  });
});

describe('ConversationControls', () => {
  it('44px History and New conversation, the shared drawer, honest unsaved notice', () => {
    // TB-4: rendered as the universal ChatToolbar (38px desktop / 44px phones; labels and
    // sizes are covered by tb1-chat-header.test.ts).
    expect(controls).toMatch(/<ChatToolbar/);
    expect(controls).toMatch(/onNew=\{onNew\}/);
    expect(controls).toMatch(/history=\{\{ open, onToggle:/);
    expect(controls).toMatch(/onClose=\{onClose\}/);
    expect(controls).toMatch(/<ConversationHistoryDrawer/);
    expect(controls).toMatch(/That conversation isn't available\./);
    expect(controls).toMatch(/This conversation couldn&apos;t be saved/);
  });
});

describe('Crystal (rollout 1)', () => {
  it('uses the shared hook with its canonical employee and its existing persona slug', () => {
    expect(crystal).toMatch(/useEmployeeChat\("crystal-analytics", \{\s*employeeSlug: "crystal-ai",/);
    expect(crystal).not.toMatch(/useUnifiedChatEngine\(/);
  });
  it('History / New conversation in the header and the unsaved notice under replies', () => {
    expect(crystal).toMatch(/<ConversationControls\s+employeeName="Crystal"/);
    expect(crystal).toMatch(/\{isUnsavedReply\(m\) && <div style=\{\{ maxWidth: "80%" \}\}><UnsavedReplyNotice \/><\/div>\}/);
  });
  it('Crystal context (additionalPrimeContext) is unchanged', () => {
    expect(crystal).toMatch(/additionalPrimeContext: data\.loading \? undefined : \{/);
  });
});
