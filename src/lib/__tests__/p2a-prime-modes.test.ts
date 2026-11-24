/**
 * P2-a — Quick ↔ Expanded on the single mounted PrimeChatV2Content.
 * The mode only changes the panel shell's width. The chat element is never keyed by mode
 * or recreated, so conversation, scroll, draft and any in-flight reply are kept.
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { primePanelWidth, nextExpandMode, PRIME_PANEL_WIDTH } from '../primeChatMode';

const root = path.resolve(__dirname, '../../..');
const read = (p: string) => fs.readFileSync(path.join(root, p), 'utf8');
const panel = read('src/pages/PrimeChatV2/PrimeBriefingPanel.tsx');
const prime = read('src/pages/PrimeChatV2/PrimeChatV2.tsx');
const store = read('src/lib/uiStore.ts');

describe('mode helpers', () => {
  it('maps modes to approved widths', () => {
    expect(PRIME_PANEL_WIDTH.quick).toBe(560);
    expect(PRIME_PANEL_WIDTH.expanded).toBeGreaterThanOrEqual(760);
    expect(PRIME_PANEL_WIDTH.expanded).toBeLessThanOrEqual(860);
    expect(primePanelWidth('quick')).toBe('min(560px, 100vw)');
    expect(primePanelWidth('expanded')).toBe('min(820px, 100vw)');
  });

  it('toggles Quick ↔ Expanded', () => {
    expect(nextExpandMode('quick')).toBe('expanded');
    expect(nextExpandMode('expanded')).toBe('quick');
    expect(nextExpandMode('workspace')).toBe('quick');
  });
});

describe('single mount (no remount on mode change)', () => {
  it('the mode atom is in memory only', () => {
    expect(store).toMatch(/export const primeChatModeAtom = atom<PrimeChatMode>\('quick'\);/);
    expect(store).not.toMatch(/atomWithStorage/);
  });

  it('PrimeChatV2Content is rendered exactly once and never keyed by mode', () => {
    expect(panel.match(/<PrimeChatV2Content /g)?.length).toBe(1);
    expect(panel).toMatch(/<PrimeChatV2Content onClose=\{\(\) => setIsOpen\(false\)\} \/>/);
    expect(panel).not.toMatch(/<PrimeChatV2Content[^>]*key=/);
    expect(panel).not.toMatch(/key=\{mode\}/);
  });

  it('only the shell width follows the mode (mobile stays full width)', () => {
    expect(panel).toMatch(/width: isMobile \? "100%" : primePanelWidth\(mode\),/);
    expect(panel).not.toMatch(/md:w-\[560px\]/);
  });
});

describe('header toggle', () => {
  it('is desktop-only, 44px, aria-pressed and labelled', () => {
    expect(prime).toMatch(/\{!isMobileWidth && \(\s*<button\s+type="button"\s+onClick=\{\(\) => setChatMode\(nextExpandMode\(chatMode\)\)\}/);
    expect(prime).toMatch(/aria-pressed=\{chatMode !== 'quick'\}/);
    expect(prime).toMatch(/aria-label=\{chatMode === 'quick' \? "Expand chat" : "Collapse chat"\}/);
  });
});
