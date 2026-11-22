/**
 * C2-D3 — consistent progressive reveal of assistant replies.
 *
 * The chat backend returns completed replies (chat.ts forces the JSON path for Prime and
 * all agents), so the shared TypingMessage reveals them progressively. C2-D3 makes that
 * reveal render formatting while typing, step by word, announce once to screen readers,
 * and brings the Custodian support chat onto the same component.
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { safePartialMarkdown, nextRevealIndex } from '../../components/chat/typingReveal';

const root = path.resolve(__dirname, '../../..');
const read = (p: string) => fs.readFileSync(path.join(root, p), 'utf8');
const typing = read('src/components/chat/TypingMessage.tsx');
const custodian = read('src/components/settings/tabs/CustodianSupportTab.tsx');
const chat = read('netlify/functions/chat.ts');

describe('safePartialMarkdown — formatting renders correctly mid-reveal', () => {
  it('hides an unmatched bold opener so "**" never flashes', () => {
    expect(safePartialMarkdown('Shopping took **$15')).toBe('Shopping took $15');
    expect(safePartialMarkdown('Shopping took **$15,057** in May')).toBe('Shopping took **$15,057** in May');
    expect(safePartialMarkdown('a **b** and **c')).toBe('a **b** and c');
  });

  it('holds back an unfinished markdown link until it is complete', () => {
    expect(safePartialMarkdown('See [Costco](/dashboard/trans')).toBe('See ');
    expect(safePartialMarkdown('See [Costco](/dashboard/transactions?focus=Costco) now')).toBe('See [Costco](/dashboard/transactions?focus=Costco) now');
  });

  it('leaves plain text and complete lists untouched', () => {
    expect(safePartialMarkdown('- one\n- two\n- thr')).toBe('- one\n- two\n- thr');
    expect(safePartialMarkdown('')).toBe('');
  });
});

describe('nextRevealIndex — word-sized steps, never stuck, never past the end', () => {
  const s = 'Found them! You have 419 visits.';
  it('advances to the end of the next word', () => {
    expect(s.slice(0, nextRevealIndex(s, 0))).toBe('Found');
    expect(s.slice(0, nextRevealIndex(s, 5))).toBe('Found them!');
  });
  it('always makes progress and is bounded for very long tokens', () => {
    const long = 'x'.repeat(100);
    expect(nextRevealIndex(long, 0)).toBe(12);
    expect(nextRevealIndex(long, 99)).toBe(100);
    expect(nextRevealIndex(s, s.length)).toBe(s.length);
  });
  it('reaches the complete message', () => {
    let i = 0; let steps = 0;
    while (i < s.length && steps < 1000) { const n = nextRevealIndex(s, i); expect(n).toBeGreaterThan(i); i = n; steps++; }
    expect(i).toBe(s.length);
    expect(steps).toBeLessThan(s.length); // fewer renders than one-per-character
  });
});

describe('TypingMessage wiring', () => {
  it('formats progressively instead of plain text then a jump', () => {
    expect(typing).toContain('const visibleText = settled ? displayedText : safePartialMarkdown(displayedText);');
    expect(typing).toContain('<FormattedMessageText text={visibleText} />');
    expect(typing).not.toContain('<span className="whitespace-pre-wrap">{displayedText}</span>');
  });

  it('screen readers get the complete reply once; reduced motion shows it immediately', () => {
    expect(typing).toContain('aria-busy={!settled}');
    expect(typing).toContain('{!settled && <span className="sr-only">{content}</span>}');
    expect(typing).toContain("window.matchMedia('(prefers-reduced-motion: reduce)').matches");
  });

  it('steps by word for completed replies; live-streamed text keeps its own path', () => {
    expect(typing).toContain('const nextIndex = isStreaming ? currentIndex + 1 : nextRevealIndex(content, currentIndex);');
    expect(typing).toMatch(/if \(isStreaming\) \{\s+setDisplayedText\(content\);/);
  });

  it('the max-duration safety still completes long replies (never stuck typing)', () => {
    expect(typing).toContain('if (elapsed >= scaledMax) {');
    expect(typing).toMatch(/setDisplayedText\(content\);\s+isTypingRef\.current = false;\s+onTyped\(messageId\);/);
  });
});

describe('Custodian support chat uses the shared reveal', () => {
  it('assistant replies render through TypingMessage; earlier history is not replayed', () => {
    expect(custodian).toContain("import { TypingMessage } from '../../chat/TypingMessage';");
    expect(custodian).toContain('<TypingMessage');
    expect(custodian).toContain('message.timestamp.getTime() < mountedAtRef.current - 5000');
    expect(custodian).toContain("new Set(['custodian-greeting'])");
  });

  it('content updates for an already-shown message are synced (no stale or empty bubble)', () => {
    expect(custodian).toContain('if (src && src.content !== m.content) { changed = true; return { ...m, content: src.content }; }');
  });
});

describe('no backend transport change in this phase', () => {
  it('chat.ts still forces the JSON path for Prime and all agents (evidence gates intact)', () => {
    expect(chat).toContain("if (employeeSlug === 'prime-boss' && process.env.PRIME_FORCE_NONSTREAM !== '0') {");
    expect(chat).toContain("if (process.env.AGENTS_FORCE_NONSTREAM !== '0') {");
  });
});
