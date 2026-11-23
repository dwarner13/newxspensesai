/**
 * XS-1 — Xspense Score review hold (owner direction 2026-11-23).
 * The simulated history chart is removed, and the numerical score is hidden on UI/UX
 * surfaces until its accuracy is reviewed. The scoring algorithm itself is unchanged.
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { XSPENSE_SCORE_REVIEW_HOLD, isXspenseScoreVisible, XSPENSE_SCORE_REVIEW_MESSAGE } from '../../pages/XspenseScore/scoreDisplay';

const root = path.resolve(__dirname, '../../..');
const read = (p: string) => fs.readFileSync(path.join(root, p), 'utf8');
const page = read('src/pages/XspenseScore/XspenseScorePage.tsx');
const dashboard = read('src/pages/DashboardV2/DashboardHomeV2.tsx');
const hook = read('src/pages/XspenseScore/useXspenseScore.ts');

describe('score display hold', () => {
  it('is on, so the score is not visible', () => {
    expect(XSPENSE_SCORE_REVIEW_HOLD).toBe(true);
    expect(isXspenseScoreVisible()).toBe(false);
  });

  it('explains the hold without a number or placeholder score', () => {
    expect(XSPENSE_SCORE_REVIEW_MESSAGE).toMatch(/temporarily hidden/);
    expect(XSPENSE_SCORE_REVIEW_MESSAGE).not.toMatch(/\d/);
  });
});

describe('Xspense Score page', () => {
  it('returns the review notice before rendering any score content', () => {
    const holdIdx = page.indexOf('if (!isXspenseScoreVisible())');
    expect(holdIdx).toBeGreaterThan(-1);
    expect(holdIdx).toBeLessThan(page.indexOf('<ScoreRing'));
    expect(holdIdx).toBeLessThan(page.indexOf('Share Score'));
    expect(page).toMatch(/\{XSPENSE_SCORE_REVIEW_MESSAGE\}/);
  });

  it('has no simulated score-history chart', () => {
    expect(page).not.toMatch(/Score History/);
    expect(page).not.toMatch(/data\.history/);
    expect(page).not.toMatch(/histPts/);
  });
});

describe('Dashboard home', () => {
  it('gates both score surfaces on the hold', () => {
    expect(dashboard).toMatch(/\{isXspenseScoreVisible\(\) && !scoreData\.loading && !isMobile && \(/);
    expect(dashboard).toMatch(/\{isXspenseScoreVisible\(\) && isMobile && !scoreData\.loading && \(/);
  });
});

describe('scoring algorithm', () => {
  it('is unchanged (pillar weights and calculation still present)', () => {
    expect(hook).toMatch(/const overallScore = clamp\(pillars\.reduce\(\(s, p\) => s \+ p\.score \* p\.weight, 0\)\);/);
    expect(hook).toMatch(/weight: 0\.25/);
  });
});
