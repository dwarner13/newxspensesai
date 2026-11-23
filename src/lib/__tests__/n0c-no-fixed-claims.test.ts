/**
 * UX-N1 N0-c — no fixed "agents active" or estimated score-change claims.
 * useXspenseScore's previousScore is overallScore - 4 (an estimate), so any
 * "+N this month" / "improved/dropped" text built from it was always "+4".
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const root = path.resolve(__dirname, '../../..');
const read = (p: string) => fs.readFileSync(path.join(root, p), 'utf8');
const dashboard = read('src/pages/DashboardV2/DashboardHomeV2.tsx');
const scorePage = read('src/pages/XspenseScore/XspenseScorePage.tsx');

describe('Dashboard home', () => {
  it('has no static "Agents Active" claim', () => {
    expect(dashboard).not.toMatch(/Agents Active/);
  });

  it('shows no estimated month-over-month score change', () => {
    expect(dashboard).not.toMatch(/previousScore/);
    expect(dashboard).not.toMatch(/this mo<\/div>|this month<\/div>/);
  });

  it('keeps the score ring and its navigation', () => {
    expect(dashboard).toMatch(/<CompactScoreRing score=\{scoreData\.overallScore\}/);
    expect(dashboard).toMatch(/navigate\("\/dashboard\/xspense-score"\)/);
  });
});

describe('Xspense Score page', () => {
  it('makes no improved/dropped-this-month claim', () => {
    expect(scorePage).not.toMatch(/scoreDiff/);
    expect(scorePage).not.toMatch(/Your score (improved|dropped)/);
  });

  it('keeps the score ring', () => {
    expect(scorePage).toMatch(/<ScoreRing score=\{data\.overallScore\} \/>/);
  });
});
