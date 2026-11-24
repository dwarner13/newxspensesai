/**
 * LIVE-UI-02 — expandable transaction drawer (same editor, no duplicate).
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const root = path.resolve(__dirname, '../../..');
const d = fs.readFileSync(path.join(root, 'src/components/transactions/TransactionInsightDrawer.tsx'), 'utf8');

describe('expandable drawer', () => {
  it('desktop-only toggle with an accessible label; phones stay full screen', () => {
    expect(d).toMatch(/const expanded = expandedPref && !isMobile;/);
    expect(d).toMatch(/aria-pressed=\{expanded\} aria-label=\{expanded \? 'Collapse transaction details' : 'Expand transaction details'\}/);
    expect(d).toMatch(/width: isMobile \? '100%' : \(expanded \? 'min\(1120px, calc\(100vw - 32px\)\)' : 500\)/);
  });

  it('Tag card is rendered once: inline, or in the right column when expanded', () => {
    expect(d.match(/const tagVerdictCard = \(/g)?.length).toBe(1);
    expect(d).toMatch(/\{!expanded && tagVerdictCard\}/);
    expect(d).toMatch(/<aside aria-label="Tag's explanation"[^>]*>\s*\{tagVerdictCard\}/);
    // the Tag card markup itself appears exactly once
    expect(d.match(/radial-gradient\(circle at 35% 35%, rgba\(34,211,238,0\.35\)/g)?.length).toBe(1);
  });

  it('compact header and 4-column facts when expanded; footer actions unchanged', () => {
    expect(d).toMatch(/gridTemplateColumns: expanded \? 'repeat\(4, minmax\(0, 1fr\)\)' : 'repeat\(2, minmax\(0, 1fr\)\)'/);
    expect(d).toMatch(/\{\/\* FOOTER — transaction actions \(Split\/Close\) \*\/\}/);
  });

  it('preference is a per-viewer convenience, guarded', () => {
    expect(d).toMatch(/try \{ return window\.localStorage\.getItem\(DRAWER_EXPANDED_KEY\) === '1'; \} catch \{ return false; \}/);
  });
});
