/**
 * P2-c — unsent Prime drafts in memory only, per user and per conversation.
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { draftKey, readDraft, writeDraft, keepOnlyUser } from '../primeDraft';

const root = path.resolve(__dirname, '../../..');
const read = (p: string) => fs.readFileSync(path.join(root, p), 'utf8');
const input = read('src/pages/PrimeChatV2/PrimeChatInput.tsx');
const store = read('src/lib/uiStore.ts');
const draftLib = read('src/lib/primeDraft.ts');
const prime = read('src/pages/PrimeChatV2/PrimeChatV2.tsx');

describe('draft helpers', () => {
  it('keys by user and conversation; none without both', () => {
    expect(draftKey('u1', 's1')).toBe('u1:s1');
    expect(draftKey(null, 's1')).toBeNull();
    expect(draftKey('u1', undefined)).toBeNull();
  });

  it('writes, reads and removes on empty text', () => {
    let d = writeDraft({}, 'u1:s1', 'hello');
    expect(readDraft(d, 'u1:s1')).toBe('hello');
    expect(readDraft(d, 'u1:s2')).toBe('');
    d = writeDraft(d, 'u1:s1', '');
    expect(d).toEqual({});
    expect(writeDraft(d, null, 'x')).toBe(d);
  });

  it('drops every other user\'s drafts, and all drafts on logout', () => {
    const d = { 'u1:s1': 'a', 'u2:s9': 'b' };
    expect(keepOnlyUser(d, 'u1')).toEqual({ 'u1:s1': 'a' });
    expect(keepOnlyUser(d, null)).toEqual({});
    const own = { 'u1:s1': 'a' };
    expect(keepOnlyUser(own, 'u1')).toBe(own);
  });
});

describe('never persisted, logged or sent', () => {
  it('lives in a plain in-memory atom', () => {
    expect(store).toMatch(/export const primeDraftsAtom = atom<Readonly<Record<string, string>>>\(\{\}\);/);
    for (const src of [store, draftLib, input]) {
      expect(src).not.toMatch(/localStorage|sessionStorage|atomWithStorage/);
    }
    expect(input).not.toMatch(/console\.(log|info|debug)\(/);
    expect(input).not.toMatch(/fetch\(/);
  });
});

describe('PrimeChatInput wiring', () => {
  it('restores the draft for this user and conversation, and clears it on send', () => {
    expect(input).toMatch(/const key = draftKey\(userId, sessionId\);/);
    expect(input).toMatch(/useState\(\(\) => readDraft\(drafts, key\) \|\| initialValue\)/);
    expect(input).toMatch(/setDrafts\(d => writeDraft\(d, key, text\)\);/);
    const send = input.slice(input.indexOf('const handleSend = () => {'), input.indexOf('const handleKey'));
    expect(send).toMatch(/onSend\(trimmed\);\s*setValue\(""\);/);
  });

  it('drops other users\' drafts when the user changes', () => {
    expect(input).toMatch(/useEffect\(\(\) => \{ setDrafts\(d => keepOnlyUser\(d, userId\)\); \}, \[userId, setDrafts\]\);/);
  });

  it('PrimeChatV2 passes the user and conversation', () => {
    expect(prime).toMatch(/<PrimeChatInput onSend=\{handleSend\} onFileSelected=\{handleFileSelected\} userId=\{userId\} sessionId=\{sessionId\} \/>/);
  });
});
