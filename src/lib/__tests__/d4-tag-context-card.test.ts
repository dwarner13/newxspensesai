/**
 * D-4 — Tag's focused-transaction context: compact expandable card, human-readable date,
 * classification, and "Back to transaction". The focusedTransaction object sent to Tag is
 * unchanged.
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const root = path.resolve(__dirname, '../../..');
const read = (p: string) => fs.readFileSync(path.join(root, p), 'utf8');
const tag = read('src/components/transactions/TagCopilotPanel.tsx');
const page = read('src/pages/dashboard/TransactionsPageV2.tsx');

describe('Tag context card', () => {
  it('is a collapsed-by-default disclosure that resets per transaction', () => {
    expect(tag).toMatch(/const \[contextOpen, setContextOpen\] = useState\(false\);/);
    expect(tag).toMatch(/useEffect\(\(\) => \{ setContextOpen\(false\); \}, \[focusedTransaction\?\.id\]\);/);
    expect(tag).toMatch(/aria-expanded=\{contextOpen\}/);
    expect(tag).toMatch(/minHeight: 52/);
  });

  it('shows merchant, signed amount, human date and classification', () => {
    expect(tag).toMatch(/Looking at/);
    expect(tag).toMatch(/const ftAmountText = /);
    expect(tag).toMatch(/formatCalendarDate\(focusedTransaction\.posted_at \|\| focusedTransaction\.date, 'long'\)/);
    expect(tag).toMatch(/\[focusedTransaction\.category \|\| 'Uncategorized', focusedTransaction\.subcategory\]/);
    expect(tag).not.toMatch(/>FOCUSED</);
  });

  it('offers Back to transaction only when the page provides it', () => {
    expect(tag).toMatch(/\{onBackToTransaction && \(/);
    expect(tag).toMatch(/Back to transaction/);
  });

  it('still sends the same focusedTransaction to the server', () => {
    expect(tag).toMatch(/focusedTransaction: focusedTransaction \|\| null,/);
  });
});

describe('Transactions page wiring', () => {
  it('Back to transaction closes Tag and reopens the same transaction drawer', () => {
    expect(page).toMatch(/onBackToTransaction=\{tagPanelTx \? \(\) => \{ const tx = tagPanelTx as CommittedTransaction; setTagPanelOpen\(false\);[^}]*setSelectedTx\(tx\);/);
  });

  it('Ask Tag hand-off message uses the calendar date, not the raw timestamp', () => {
    expect(page).toMatch(/const date = formatCalendarDate\(\(tx as any\)\.posted_at \|\| \(tx as any\)\.date, 'medium'\) \|\| '';/);
  });

  it('leaves the import_complete open, the sweep banner and notifications alone', () => {
    expect(page).toMatch(/if \(sweepNotif\.type === 'import_complete'\) \{\s*setTagPanelOpen\(true\);/);
    expect(page).toMatch(/\/\.netlify\/functions\/tag-notifications/);
  });
});
