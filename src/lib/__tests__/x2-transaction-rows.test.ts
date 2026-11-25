/**
 * X-2 — readable transaction rows: desktop columns (Date, Merchant, Account, Category,
 * Amount), two-line phone rows grouped by date, account on every row, review status from
 * existing data only, no animated or invented indicators.
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const root = path.resolve(__dirname, '../../..');
const page = fs.readFileSync(path.join(root, 'src/pages/dashboard/TransactionsPageV2.tsx'), 'utf8');
const list = page.slice(page.indexOf('{/* X-2: desktop column header'), page.indexOf('{/* Load more */}'));

describe('X-2 rows', () => {
  it('desktop column header and matching row grid', () => {
    expect(list).toMatch(/<span>Date<\/span><span>Merchant<\/span><span>Account<\/span><span>Category<\/span><span className="text-right">Amount<\/span>/);
    expect(list.match(/md:grid-cols-\[108px_minmax\(0,1fr\)_150px_190px_120px_16px\]/g)?.length).toBe(1);
    expect(list).toMatch(/grid-cols-\[108px_minmax\(0,1fr\)_150px_190px_120px_16px\]/);
  });

  it('phones keep date groups and a two-line row (category · account)', () => {
    expect(list).toMatch(/className="md:hidden flex items-center gap-3 pt-5 pb-2 px-4"/);
    expect(list).toMatch(/\{categoryText\}\{accountName \? ` \\u00b7 \$\{accountName\}` : ''\}/);
    expect(list).toMatch(/min-h-\[64px\]/);
    expect(list).toMatch(/md:min-h-\[52px\]/);
  });

  it('account from the shared account grouping; calendar-day dates', () => {
    expect(page).toMatch(/for \(const a of accounts\) for \(const id of a\.importIds\) m\.set\(id, a\.name\);/);
    expect(list).toMatch(/formatCalendarDate\(calendarDayOfTx\(t\), 'medium'\)/);
    expect(list).not.toMatch(/\.slice\(0, 10\)\}/);
  });

  it('review status is the existing data only, with no pinging indicators', () => {
    expect(list).toMatch(/const isUncat = !t\.category \|\| t\.category === 'Uncategorized';/);
    expect(list).toMatch(/'Needs a category'/);
    expect(list).not.toMatch(/animate-ping/);
    expect(list).not.toMatch(/confidence/i);
  });

  it('one accessible row button; selection, highlight and reveal behaviour kept', () => {
    expect(list).toMatch(/<button key=\{t\.id\} data-tx-id=\{t\.id\} aria-current=\{highlightTxId === t\.id \? 'true' : undefined\}/);
    expect(list).toMatch(/aria-label=\{`\$\{t\.merchant_name \|\| 'Unknown'\}, \$\{amountText\}/);
    expect(list).toMatch(/onClick=\{\(\) => \{ setSelectedTx\(t\); setTagInsight\(null\); void fetchTagInsight\(t\); \}\}/);
    expect(list).toMatch(/lastEditedTxId === t\.id \? \{ background: 'rgba\(52,211,153,0\.10\)'/);
    expect(list).toMatch(/Selected for review with Tag\. /);
  });
});
