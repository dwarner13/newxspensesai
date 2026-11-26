/**
 * SC-1 Smart Categories employee navigation (owner 2026-11-26): supported employees only,
 * working surfaces only, Finley hidden, both routes preserved; Prime's line on the engine.
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const root = path.resolve(__dirname, '../../../..');
const read = (p: string) => fs.readFileSync(path.join(root, p), 'utf8');
const code = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
const page = code(read('src/pages/dashboard/SmartCategoriesPage.tsx'));

describe('SC-1 Smart Categories', () => {
  it('Ask buttons go to working surfaces, not the unmounted launcher', () => {
    expect(page).toMatch(/navigate\(`\/dashboard\/transactions\?openTag=1/);
    expect(page).toMatch(/const askPrime = \(\) => setIsPrimeBriefingOpen\(true\);/);
    expect(page).toMatch(/navigate\('\/dashboard\/my-story\?crystal=1'\)/);
    expect(page).toMatch(/const openTagWorkspace = askTag;/);
    expect(page).not.toMatch(/initialEmployeeSlug: 'tag-ai', force: true, context: \{ page: 'smart-categories', data: \{ importId/);
  });
  it('Finley is hidden (no button, no brief)', () => {
    expect(page).not.toMatch(/Finley|finley/);
    expect(page).toMatch(/>\s*Ask Crystal\s*</);
  });
  it("Prime's line uses the shared engine for the same scope", () => {
    expect(page).toMatch(/useFinancialSummary\(primeScope\)/);
    expect(page).toMatch(/FINANCIAL_LABELS\.netCashFlow/);
    expect(page).not.toMatch(/Net \$\{netTotal >= 0 \? 'positive' : 'negative'\}/);
  });
  it('SC-3: phone table shows expand · category · amount; other columns from md up', () => {
    expect(page.match(/grid-cols-\[28px_minmax\(0,1fr\)_auto\] md:grid-cols-\[36px_minmax\(170px,1fr\)/g)?.length).toBe(2);
    for (const h of ['Bar', '% Total', 'Trend', 'Conf', 'Txns']) {
      expect(page).toMatch(new RegExp(`<div className="hidden md:block[^"]*">${h.replace('%', '\\%')}</div>`));
    }
  });
  it('category trends come only from server insights (no browser month comparison)', () => {
    expect(page).not.toMatch(/entry\.trend\b|entry\.trendPct|vs last month\./);
    expect(page).toMatch(/categoryTrend\(primeSum\.insights, entry\.category\)/);
  });
  it('both routes preserved; My Story opens Crystal from ?crystal=1', () => {
    const app = read('src/App.tsx');
    expect(app).toMatch(/path="smart-categories" element=\{<Suspense fallback=\{<LoadingSpinner \/>\}><SmartCategoriesPage \/>/);
    expect(app).toMatch(/path="ai-categorization" element=\{<Suspense fallback=\{<LoadingSpinner \/>\}><SmartCategoriesPage \/>/);
    expect(read('src/pages/MyStoryV2/MyFinancialStoryV2.tsx')).toMatch(/get\('crystal'\) === '1'/);
  });
});
