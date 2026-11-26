/**
 * P1-e — Prime conversation history drawer.
 * Presentational drawer replaces the 280px popover; selection still goes through the
 * ownership-verified switch; titles are plain text.
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { formatHistoryTime, groupHistoryItems } from '../historyDrawer';

const root = path.resolve(__dirname, '../../..');
const read = (p: string) => fs.readFileSync(path.join(root, p), 'utf8');
const drawer = read('src/components/chat/ConversationHistoryDrawer.tsx');

const NOW = new Date(2026, 10, 23, 15, 0, 0); // local time

describe('formatHistoryTime', () => {
  it('shows a time for today, "Yesterday", or a date', () => {
    expect(formatHistoryTime(new Date(2026, 10, 23, 9, 5).toISOString(), NOW)).toMatch(/9:05/);
    expect(formatHistoryTime(new Date(2026, 10, 22, 20, 0).toISOString(), NOW)).toBe('Yesterday');
    expect(formatHistoryTime(new Date(2026, 5, 16, 12, 0).toISOString(), NOW)).toBe('Jun 16, 2026');
    expect(formatHistoryTime(null, NOW)).toBe('');
    expect(formatHistoryTime('not a date', NOW)).toBe('');
  });
});

describe('groupHistoryItems', () => {
  const items = [
    { id: 'a', title: 'Groceries in June', lastActivity: new Date(2026, 10, 23, 10).toISOString() },
    { id: 'b', title: 'Tax questions', lastActivity: new Date(2026, 10, 23, 14).toISOString() },
    { id: 'c', title: 'Old chat', lastActivity: new Date(2026, 9, 1).toISOString() },
    { id: 'd', title: null, lastActivity: null },
  ];

  it('groups into Today and Earlier, newest first', () => {
    const g = groupHistoryItems(items, '', NOW);
    expect(g.today.map(i => i.id)).toEqual(['b', 'a']);
    expect(g.earlier.map(i => i.id)).toEqual(['c', 'd']);
    expect(g.total).toBe(4);
  });

  it('filters by title, case-insensitively', () => {
    const g = groupHistoryItems(items, 'TAX', NOW);
    expect(g.total).toBe(1);
    expect(g.today[0].id).toBe('b');
    expect(groupHistoryItems(items, 'zzz', NOW).total).toBe(0);
  });
});

describe('ConversationHistoryDrawer', () => {
  it('is an accessible full-height dialog with 44px controls and Escape to close', () => {
    // PW-1: the overlay is still a modal dialog; a "sidebar" variant serves the Workspace.
    expect(drawer).toMatch(/\{ role: "dialog", "aria-modal": true, "aria-label": "Conversations" \}/);
    expect(drawer).toMatch(/position: "absolute", inset: 0/);
    expect(drawer).toMatch(/aria-label=\{isSidebar \? "Hide conversations" : "Close conversations"\}/);
    expect(drawer).toMatch(/e\.key === "Escape"/);
    expect(drawer).toMatch(/minHeight: 56/);
    expect(drawer).toMatch(/aria-current=\{isCurrent \? "true" : undefined\}/);
  });

  it('renders titles as plain text (no HTML injection)', () => {
    expect(drawer).not.toMatch(/dangerouslySetInnerHTML/);
    expect(drawer).toMatch(/\{i\.title \|\| fallbackTitle\}/);
  });

  it('delegates selection and New chat to the caller', () => {
    expect(drawer).toMatch(/onClick=\{\(\) => onSelect\(i\.id\)\}/);
    expect(drawer).toMatch(/onClick=\{onNewChat\}/);
  });
});

describe('PrimeChatV2 wiring', () => {
  const prime = read('src/pages/PrimeChatV2/PrimeChatV2.tsx');

  it('replaces the 280px popover with the drawer', () => {
    expect(prime).not.toMatch(/aria-label="Prime conversations"/);
    expect(prime).not.toMatch(/width: 280, maxWidth: "80vw", maxHeight: 360/);
    expect(prime).toMatch(/<ConversationHistoryDrawer\s+open=\{sessionsOpen\}/);
  });

  it('keeps the ownership-verified selection and existing loading', () => {
    expect(prime).toMatch(/onSelect=\{handleOpenHistorySession\}/);
    expect(prime).toMatch(/onNewChat=\{handleNewChat\}/);
    expect(prime).toMatch(/items=\{primeHistory\.map\(h => \(\{ id: h\.id, title: h\.title, lastActivity: h\.last_message_at \|\| h\.created_at \}\)\)\}/);
    expect(prime).toMatch(/setRequestedSessionId\(id\);/);
  });

  it('header New chat and Close are 44px with names', () => {
    // TB-2: the universal ChatToolbar replaced Prime's individual header buttons.
    // Labels / sizes ("New conversation", "Close Prime", 44px on phones) are rendered and
    // asserted in tb1-chat-header.test.ts.
    expect(prime).toMatch(/onNew=\{handleNewChat\}/);
    expect(prime).toMatch(/onClose=\{onClose\}/);
    expect(prime).toMatch(/: \{ open: sessionsOpen, onToggle: toggleSessionsOpen \}\}/);
  });
});
