/**
 * Tag HQ tag-inbox changes (424b7fe7): null badge when incomplete, out/back amounts, honest
 * "couldn't load" instead of "all caught up", 503 handling.
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const root = path.resolve(__dirname, '../../..');
const read = (f: string) => fs.readFileSync(path.join(root, f), 'utf8');

describe('tag-inbox consumers', () => {
  it('GlobalTopBar hides the badge when badge_count is null', () => {
    const bar = read('src/components/layout/GlobalTopBar.tsx');
    expect(bar).not.toMatch(/badge_count \?\? 0/);
    expect(bar).toMatch(/typeof d\.badge_count === 'number' \? d\.badge_count : null/);
    expect(bar).toMatch(/inboxCount !== null && inboxCount > 0/);
  });
  it('Transactions: out / back amounts, couldn\'t-load state, 503 handled', () => {
    const tx = read('src/pages/dashboard/TransactionsPageV2.tsx');
    expect(tx).toMatch(/\.toFixed\(2\)\} out\{Number\(item\.inflow_amount\) > 0/);
    expect(tx).toMatch(/Couldn't load everything that needs review/);
    expect(tx).toMatch(/tagInboxData\?\.unresolved_complete !== false && tagInboxData\?\.badge_count === 0/);
    expect(tx).toMatch(/if \(!inboxRes\.ok\) return;/);
    expect(tx).toMatch(/badge_count: null, unresolved_complete: false/);
  });
});
