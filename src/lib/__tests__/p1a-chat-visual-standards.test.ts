/**
 * P1-a / P1-b / T-a — owner-approved chat visual standards for Prime and Tag:
 * 48px header logos, larger welcome logos, 17px desktop / 16px mobile conversation text,
 * ~10px thinking dots with a visible label, 44px touch targets. Presentation only.
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { CHAT_VISUALS, chatTextSize } from '../chatVisualStandards';

const root = path.resolve(__dirname, '../../..');
const read = (p: string) => fs.readFileSync(path.join(root, p), 'utf8');
const prime = read('src/pages/PrimeChatV2/PrimeChatV2.tsx');
const tag = read('src/components/transactions/TagCopilotPanel.tsx');
const thinking = read('src/components/chat/ThinkingIndicator.tsx');

describe('visual standard tokens', () => {
  it('match the owner-approved values', () => {
    expect(CHAT_VISUALS.headerLogo).toBe(48);
    expect(CHAT_VISUALS.welcomeLogo).toBeGreaterThan(CHAT_VISUALS.headerLogo);
    expect(CHAT_VISUALS.thinkingDot).toBeGreaterThanOrEqual(10);
    expect(CHAT_VISUALS.thinkingDot).toBeLessThanOrEqual(12);
    expect(CHAT_VISUALS.touchTarget).toBeGreaterThanOrEqual(44);
    expect(chatTextSize(false)).toBeGreaterThanOrEqual(17);
    expect(chatTextSize(false)).toBeLessThanOrEqual(18);
    expect(chatTextSize(true)).toBeGreaterThanOrEqual(16);
    expect(chatTextSize(true)).toBeLessThanOrEqual(17);
  });
});

describe('ThinkingIndicator', () => {
  it('has a visible label, a status role and reduced-motion handling', () => {
    expect(thinking).toMatch(/role="status"/);
    expect(thinking).toMatch(/\{label\}/);
    expect(thinking).toMatch(/prefers-reduced-motion/);
    expect(thinking).toMatch(/width: dot, height: dot/);
  });
});

describe('Prime presentation', () => {
  it('uses the header, welcome and message tokens', () => {
    expect(prime).toMatch(/width: CHAT_VISUALS\.headerLogo, height: CHAT_VISUALS\.headerLogo/);
    expect(prime).toMatch(/fontSize: CHAT_VISUALS\.headerName/);
    expect(prime).toMatch(/<AgentDot agent="Prime" size=\{CHAT_VISUALS\.welcomeLogo\} \/>/);
    expect(prime).toMatch(/<AgentDot agent=\{agentForMsg\} size=\{CHAT_VISUALS\.messageAvatar\} \/>/);
    expect(prime.match(/fontSize: chatTextSize\(isMobileWidth\)/g)?.length).toBe(2);
    expect(prime).not.toMatch(/<AgentDot agent="Prime" size=\{28\} \/>/);
  });

  it('History button meets the touch target', () => {
    expect(prime).toMatch(/height: CHAT_VISUALS\.touchTarget, padding: "0 12px"/);
  });

  it('shows the thinking indicator only for the existing empty-streaming condition', () => {
    expect(prime).toMatch(/\{isThisStreaming && isEmpty \? \(\s*\/\/[^\n]*\n\s*<ThinkingIndicator color=\{AGENT_COLORS\[agentForMsg\]\} label=\{`\$\{agentForMsg\} is thinking…`\} \/>/);
    expect(prime).not.toMatch(/width: 6, height: 6, borderRadius: "50%", background: THEME\.accent/);
  });
});

describe('Tag presentation', () => {
  it('uses the header and message tokens', () => {
    expect(tag).toMatch(/<TagAvatar size=\{CHAT_VISUALS\.headerLogo\} \/>/);
    expect(tag).toMatch(/fontSize: CHAT_VISUALS\.headerName/);
    expect(tag).not.toMatch(/<TagAvatar size=\{28\} \/>/);
    expect(tag).not.toMatch(/var\(--chat-text-size\)/);
    expect(tag.match(/fontSize: chatTextSize\(isMobile\)/g)?.length).toBe(3);
  });

  it('shows the thinking indicator under the existing isLoading condition', () => {
    expect(tag).toMatch(/\{isLoading && messages\[messages\.length - 1\]\?\.role === "user" && \(/);
    expect(tag).toMatch(/<ThinkingIndicator color=\{T\.cyan\} label="Tag is thinking…" \/>/);
  });

  it('keeps the C3b amount card', () => {
    expect(tag).toMatch(/AmountAnomalyCard/);
    expect(tag).toMatch(/anomalyAmountDisplay/);
  });
});
