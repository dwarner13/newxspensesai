/**
 * UX-C2 — Prime and Tag no longer open on a timer during ordinary navigation.
 * Explicit customer actions (Ask Prime, launcher, Tag bubble, Ask Tag, Review with Tag,
 * ?openTag handoff) are preserved, and the daily Tag cleanup trigger is untouched.
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const root = path.resolve(__dirname, '../../..');
const read = (p: string) => fs.readFileSync(path.join(root, p), 'utf8');
const layout = read('src/layouts/DashboardLayout.tsx');
const categories = read('src/pages/CategoriesV2/CategoriesPageV2.tsx');
const transactions = read('src/pages/dashboard/TransactionsPageV2.tsx');

describe('Prime (DashboardLayout)', () => {
  it('has no timer-based auto-open', () => {
    expect(layout).not.toMatch(/getItem\('prime_autopen_dismissed'\)/);
    expect(layout).not.toMatch(/setTimeout\(\(\) => \{\s*if \(!cancelled\) setIsPrimeBriefingOpen\(true\)/);
  });

  it('keeps explicit openers (launcher bridge + Ask Prime)', () => {
    expect(layout).toMatch(/if \(decision\.requestedSessionId\) setPrimeRequestedSessionId\(decision\.requestedSessionId\);\s*setIsPrimeBriefingOpen\(true\);/);
    expect(layout).toMatch(/<PrimeBriefingPanel \/>/);
  });

  it('leaves the daily Tag cleanup trigger untouched', () => {
    expect(layout).toMatch(/sessionStorage\.getItem\("xai_autofix_date"\) === today/);
    expect(layout).toMatch(/tag-categorize-committed/);
  });
});

describe('Tag on Categories', () => {
  it('has no timer-based auto-open', () => {
    expect(categories).not.toMatch(/getItem\('tag_autopen_dismissed'\)/);
    expect(categories).not.toMatch(/window\.setTimeout\(\(\) => \{\s*setCopilotOpen\(true\)/);
  });

  it('keeps the explicit openers', () => {
    expect(categories).toMatch(/onClick=\{\(\) => setCopilotOpen\(true\)\} label="Open Tag Copilot"/);
    expect(categories).toMatch(/onAskTag=\{\(question\) => \{ setCopilotInitialMessage\(question\); setCopilotOpen\(true\); \}\}/);
  });
});

describe('Tag on Transactions', () => {
  it('has no timer-based auto-open', () => {
    expect(transactions).not.toMatch(/getItem\('tag_autopen_dismissed'\)/);
    expect(transactions).not.toMatch(/window\.setTimeout\(\(\) => setTagPanelOpen\(true\), 400\)/);
  });

  it('keeps the ?openTag handoff, Review with Tag, Ask Tag and the bubble', () => {
    expect(transactions).toMatch(/openTag: sp\.get\('openTag'\) === '1'/);
    expect(transactions).toMatch(/return initialParams\.openTag;/);
    expect(transactions).toMatch(/const openTagWith = \(tx: CommittedTransaction \| null\) => \{[\s\S]*?setTagPanelOpen\(true\);/);
    expect(transactions).toMatch(/onClick=\{\(\) => setTagPanelOpen\(true\)\} label="Open Tag Copilot"/);
    expect(transactions).toMatch(/setTagInjectedMsg\(injected\);\s*setTagPanelOpen\(true\);/);
  });
});
