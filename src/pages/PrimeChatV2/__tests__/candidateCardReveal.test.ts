/**
 * Candidate card reveal + one-time scroll anchor (PrimeChatV2, presentation only).
 *
 * Behavioral tests run the production helpers in ../candidateCardReveal.ts.
 * Wiring tests assert PrimeChatV2 uses them (no React component test runner is
 * installed; @testing-library/react is intentionally not added).
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  shouldRevealCandidateCard,
  isCandidateCardRevealTransition,
  shouldAnchorCandidateMessage,
  messageStartScrollTop,
} from '../candidateCardReveal';

const SRC = fs.readFileSync(path.resolve(__dirname, '../PrimeChatV2.tsx'), 'utf8');
const FRAMING = 'Here are the 10 Costco-related transactions (excluding gas).';

describe('reveal rule', () => {
  it('A. still streaming → hidden', () => {
    expect(shouldRevealCandidateCard({ hasCandidates: true, isStreaming: true, isTyped: false, content: FRAMING })).toBe(false);
    expect(shouldRevealCandidateCard({ hasCandidates: true, isStreaming: true, isTyped: true, content: FRAMING })).toBe(false);
  });

  it('B. stream finished but typewriter replay still active → hidden', () => {
    expect(shouldRevealCandidateCard({ hasCandidates: true, isStreaming: false, isTyped: false, content: FRAMING })).toBe(false);
  });

  it('C. onTyped fired → visible', () => {
    expect(shouldRevealCandidateCard({ hasCandidates: true, isStreaming: false, isTyped: true, content: FRAMING })).toBe(true);
  });

  it('D. history message (pre-seeded as typed) → visible immediately', () => {
    expect(shouldRevealCandidateCard({ hasCandidates: true, isStreaming: false, isTyped: true, content: FRAMING })).toBe(true);
  });

  it('E. reduced motion: TypingMessage reports typed immediately → visible, never permanently hidden', () => {
    expect(shouldRevealCandidateCard({ hasCandidates: true, isStreaming: false, isTyped: true, content: FRAMING })).toBe(true);
  });

  it('F. empty completed content with candidates → visible (TypingMessage never types empty text)', () => {
    expect(shouldRevealCandidateCard({ hasCandidates: true, isStreaming: false, isTyped: false, content: '' })).toBe(true);
    expect(shouldRevealCandidateCard({ hasCandidates: true, isStreaming: false, isTyped: false, content: '   ' })).toBe(true);
    expect(shouldRevealCandidateCard({ hasCandidates: true, isStreaming: true, isTyped: false, content: '' })).toBe(false);
  });

  it('G. no candidates → no card', () => {
    expect(shouldRevealCandidateCard({ hasCandidates: false, isStreaming: false, isTyped: true, content: FRAMING })).toBe(false);
  });
});

describe('H. one-time anchor on hidden → visible', () => {
  it('anchors only on an observed hidden → visible transition', () => {
    expect(isCandidateCardRevealTransition(false, true)).toBe(true);
    expect(isCandidateCardRevealTransition(undefined, true)).toBe(false); // history: first seen visible
    expect(isCandidateCardRevealTransition(true, true)).toBe(false);      // already visible: no repeat
    expect(isCandidateCardRevealTransition(false, false)).toBe(false);
  });

  it('anchors only when the response is taller than the viewport and the user has not scrolled away', () => {
    expect(shouldAnchorCandidateMessage({ messageHeight: 900, viewportHeight: 600, userScrolledUp: false })).toBe(true);
    expect(shouldAnchorCandidateMessage({ messageHeight: 400, viewportHeight: 600, userScrolledUp: false })).toBe(false);
    expect(shouldAnchorCandidateMessage({ messageHeight: 900, viewportHeight: 600, userScrolledUp: true })).toBe(false);
  });

  it('target scrollTop puts the message start at the top of the container (small offset)', () => {
    expect(messageStartScrollTop({ messageTop: 300, containerTop: 100, currentScrollTop: 1000 })).toBe(1192);
    expect(messageStartScrollTop({ messageTop: 100, containerTop: 100, currentScrollTop: 0 })).toBe(0);
  });
});

describe('PrimeChatV2 wiring', () => {
  it('card renders only when the reveal rule says so', () => {
    expect(SRC).toContain('{txCandidates && candidateCardVisible.get(msg.id) === true && (');
    expect(SRC).not.toContain('{txCandidates && <TransactionCandidateListCard candidates={txCandidates} />}');
    expect(SRC).toContain('isTyped: typedIdsRef.current.has(m.id) || typedMessageIds.has(m.id),');
    expect(SRC).toContain('isStreaming: isStreaming && m.id === candidateLastMsgId,');
  });

  it('typing completion is mirrored into React state (re-render) and the ref', () => {
    expect(SRC).toMatch(/const handleMessageTyped = useCallback\(\(id: string\) => \{\s*typedIdsRef\.current\.add\(id\);\s*setTypedMessageIds\(prev => \(prev\.has\(id\) \? prev : new Set\(prev\)\.add\(id\)\)\);/);
    expect(SRC).toContain('onTyped={handleMessageTyped}');
  });

  it('anchor runs once on transition, after the mount-driven bottom scroll (double RAF)', () => {
    expect(SRC).toContain('if (isCandidateCardRevealTransition(previous, visible)) anchorCandidateMessage(id);');
    expect(SRC).toMatch(/const anchorCandidateMessage = useCallback\(\(id: string\) => \{[\s\S]{0,200}requestAnimationFrame\(\(\) => \{\s*requestAnimationFrame\(/);
    expect(SRC).toContain('const el = document.getElementById(`msg-${id}`);');
  });

  it('MutationObserver stands down only during an anchor hold; hold released by user scroll, send and new messages', () => {
    expect(SRC).toContain('if (candidateAnchorHoldRef.current) return; // candidate response anchored at its start');
    expect(SRC).toMatch(/useEffect\(\(\) => \{\s*candidateAnchorHoldRef\.current = false;\s*\}, \[chatMessages\.length, uploadMessages\.length\]\);/);
    expect(SRC).toMatch(/const forceScrollToBottom = useCallback\(\(\) => \{\s*userScrolledUpRef\.current = false;\s*candidateAnchorHoldRef\.current = false;/);
  });

  it('the anchor scroll is not read as the user scrolling up', () => {
    expect(SRC).toMatch(/if \(programmaticScrollRef\.current\) \{[\s\S]{0,120}programmaticScrollRef\.current = false;\s*return;\s*\}\s*candidateAnchorHoldRef\.current = false;\s*userScrolledUpRef\.current = \(el\.scrollHeight - el\.scrollTop - el\.clientHeight\) > 120;/);
  });

  it('I. normal auto-scroll is unchanged', () => {
    expect(SRC).toMatch(/useEffect\(\(\) => \{\s*if \(userScrolledUpRef\.current\) return;[\s\S]{0,400}bottomRef\.current\?\.scrollIntoView\(\{ behavior: 'auto', block: 'end' \}\);[\s\S]{0,60}\}, \[chatMessages\.length, uploadMessages\.length, lastAssistantLen\]\);/);
    expect(SRC).toMatch(/const nearBottom = el\.scrollHeight - el\.scrollTop - el\.clientHeight < 120;\s*if \(nearBottom \|\| !userScrolledUpRef\.current\) \{\s*el\.scrollTop = el\.scrollHeight;/);
  });

  it('J. candidate metadata is passed through untouched', () => {
    expect(SRC).toContain('const txCandidates = parseTxCandidates(metaAny);');
    expect(SRC).toContain('<TransactionCandidateListCard candidates={txCandidates} />');
  });
});
