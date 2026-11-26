/**
 * XS-2 full Score hold (owner 2026-11-26): no hidden useXspenseScore runs while held; no mobile
 * menu entry; infrastructure kept.
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const root = path.resolve(__dirname, '../../../..');
const read = (p: string) => fs.readFileSync(path.join(root, p), 'utf8');
const code = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

describe('XS-2 Score hold', () => {
  it('only the wrapper and the Score page call useXspenseScore', () => {
    for (const f of ['src/components/navigation/DesktopSidebar.tsx', 'src/components/ui/DashboardHeader.tsx', 'src/pages/DashboardV2/DashboardHomeV2.tsx']) {
      expect(code(read(f))).not.toMatch(/useXspenseScore\(/);
    }
    const w = read('src/pages/XspenseScore/WithXspenseScore.tsx');
    expect(w).toMatch(/isXspenseScoreVisible\(\) \? <ScoreInner/);
  });
  it('mobile menu entry is gated; the hold and its infrastructure remain', () => {
    expect(read('src/components/layout/MobileSidebar.tsx')).toMatch(/\.\.\.\(isXspenseScoreVisible\(\) \? \[\{ label: "Xspense Score"/);
    expect(read('src/pages/XspenseScore/scoreDisplay.ts')).toMatch(/XSPENSE_SCORE_REVIEW_HOLD = true/);
    expect(fs.existsSync(path.join(root, 'src/pages/XspenseScore/useXspenseScore.ts'))).toBe(true);
  });
});
