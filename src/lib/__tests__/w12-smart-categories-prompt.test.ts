/**
 * TB-5 W12 (owner GO 2026-11-26): the browser never builds Tag's instructions. The unused
 * client-built system prompt in SmartCategoriesPage is retired; the page, its two routes and
 * Prime's mobile 'Categories' quick button stay.
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const root = path.resolve(__dirname, '../../..');
const read = (p: string) => fs.readFileSync(path.join(root, p), 'utf8');

describe('W12 — no browser-built Tag prompt', () => {
  const page = read('src/pages/dashboard/SmartCategoriesPage.tsx');
  it('the client-built prompt and its feeders are gone', () => {
    expect(page).not.toMatch(/const systemPrompt = useMemo/);
    expect(page).not.toMatch(/const chatContext = useMemo/);
    expect(page).not.toMatch(/selectedCategoryForChat/);
    expect(page).not.toContain('tag_category_brain');
  });
  it('both routes and Prime\'s mobile Categories button remain', () => {
    const app = read('src/App.tsx');
    expect(app).toMatch(/<Route path="smart-categories" element=\{<Suspense fallback=\{<LoadingSpinner \/>\}><SmartCategoriesPage \/>/);
    expect(app).toMatch(/<Route path="ai-categorization" element=\{<Suspense fallback=\{<LoadingSpinner \/>\}><SmartCategoriesPage \/>/);
    expect(read('src/pages/PrimeChatV2/PrimeChatV2.tsx')).toMatch(/label: "Categories", action: \(\) => \{ onClose\?\.\(\); navigate\("\/dashboard\/smart-categories"\); \}/);
  });
});
