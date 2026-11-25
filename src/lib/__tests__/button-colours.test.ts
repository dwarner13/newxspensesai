/**
 * Owner decision (2026-11-25): Prime gold for primary customer Save / confirmation,
 * Tag teal for Tag AI categorization actions, neutral for secondary actions.
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const root = path.resolve(__dirname, '../../..');
const drawer = fs.readFileSync(path.join(root, 'src/components/transactions/TransactionInsightDrawer.tsx'), 'utf8');
const cats = fs.readFileSync(path.join(root, 'src/pages/CategoriesV2/CategoriesPageV2.tsx'), 'utf8');

describe('button colours', () => {
  it('drawer: Done after a saved correction is Prime gold; Keep editing stays neutral', () => {
    expect(drawer).toMatch(/onDone\(row\.transaction\.id\); else onClose\(\); \}\} style=\{\{[^}]*background: '#c8a64e', color: '#0b1220'/);
    expect(drawer).toMatch(/onClick=\{\(\) => setSavedNotice\(null\)\} style=\{\{[^}]*background: 'transparent'/);
  });
  it('drawer: Tag categorization chips stay Tag teal', () => {
    expect(drawer).toMatch(/color: localCategory === q\.category \? '#22d3ee'/);
  });
  it('Categories: the budget Save is Prime gold', () => {
    expect(cats).toMatch(/onClick=\{\(\) => void saveBudget\(\)\}[^>]*background: "#c8a64e"/);
  });
});
