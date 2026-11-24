/**
 * P2-d — on phones, Prime and Tag fit the visible viewport so the composer stays above the
 * on-screen keyboard. Desktop is unchanged.
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { readVisibleViewport } from '../visibleViewport';

const root = path.resolve(__dirname, '../../..');
const read = (p: string) => fs.readFileSync(path.join(root, p), 'utf8');
const hook = read('src/hooks/useVisualViewport.ts');
const panel = read('src/pages/PrimeChatV2/PrimeBriefingPanel.tsx');
const tag = read('src/components/transactions/TagCopilotPanel.tsx');

describe('readVisibleViewport', () => {
  it('uses visualViewport when present (keyboard open shrinks it)', () => {
    expect(readVisibleViewport({ innerHeight: 844, visualViewport: { height: 508.6, offsetTop: 12.2 } })).toEqual({ height: 509, offsetTop: 12 });
  });

  it('falls back to innerHeight when visualViewport is missing or empty', () => {
    expect(readVisibleViewport({ innerHeight: 844 })).toEqual({ height: 844, offsetTop: 0 });
    expect(readVisibleViewport({ innerHeight: 844, visualViewport: null })).toEqual({ height: 844, offsetTop: 0 });
    expect(readVisibleViewport({ innerHeight: 700, visualViewport: { height: 0, offsetTop: 0 } })).toEqual({ height: 700, offsetTop: 0 });
  });

  it('never returns a negative offset', () => {
    expect(readVisibleViewport({ innerHeight: 844, visualViewport: { height: 600, offsetTop: -3 } }).offsetTop).toBe(0);
  });
});

describe('useVisualViewport', () => {
  it('guards SSR/tests and cleans up its listeners', () => {
    expect(hook).toMatch(/typeof window !== "undefined"/);
    expect(hook).toMatch(/typeof window === "undefined"/);
    expect(hook).toMatch(/vv\?\.removeEventListener\("resize", update\);/);
    expect(hook).toMatch(/window\.removeEventListener\("resize", update\);/);
  });
});

describe('panels', () => {
  it('Prime panel uses it on mobile only', () => {
    expect(panel).toMatch(/const visibleViewport = useVisualViewport\(isMobile && isOpen\);/);
    expect(panel).toMatch(/\.\.\.\(isMobile && visibleViewport \? \{ top: visibleViewport\.offsetTop, height: visibleViewport\.height \} : null\)/);
  });

  it('Tag panel changes only its fixed root container, on mobile only', () => {
    expect(tag).toMatch(/const visibleViewport = useVisualViewport\(isMobile\);/);
    expect(tag).toMatch(/\.\.\.\(isMobile && visibleViewport \? \{ top: visibleViewport\.offsetTop, bottom: "auto", height: visibleViewport\.height \} : null\)/);
    expect(tag.match(/visibleViewport/g)?.length).toBe(4);
  });
});
