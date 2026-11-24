/**
 * LIVE-UI-01 (drawer stability) and LIVE-UI-04 (statement identification).
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { factsFromStatementMeta, formatStatementPeriod, accountText, statementText, STATEMENT_PERIOD_UNAVAILABLE } from '../statementFacts';

const root = path.resolve(__dirname, '../../..');
const drawer = fs.readFileSync(path.join(root, 'src/components/transactions/TransactionInsightDrawer.tsx'), 'utf8');
const id = (s: string) => s;

describe('LIVE-UI-04 statement facts', () => {
  it('uses the verified period; never repeats the issuer in the Statement cell', () => {
    const f = factsFromStatementMeta({ issuer: 'BMO', account_last4: '****1234', period_start: '2025-05-17', period_end: '2025-06-16' }, id);
    expect(accountText(f)).toBe('BMO •••• 1234');
    expect(statementText(f)).toBe('May 17 – Jun 16, 2025');
    const noPeriod = factsFromStatementMeta({ issuer: 'BMO' }, id);
    expect(accountText(noPeriod)).toBe('BMO');
    expect(statementText(noPeriod)).toBe(STATEMENT_PERIOD_UNAVAILABLE);
    expect(STATEMENT_PERIOD_UNAVAILABLE).toBe('Statement period unavailable');
  });

  it('needs both ends of the period', () => {
    expect(formatStatementPeriod('2025-05-17', null)).toBeNull();
    expect(formatStatementPeriod('2025-05-17T00:00:00.000Z', '2025-06-16T00:00:00.000Z')).toBe('May 17 – Jun 16, 2025');
  });

  it('drawer falls back to user_documents.period_start/end, never to filenames or transaction dates', () => {
    expect(drawer).toMatch(/from\('user_documents'\)\.select\('period_start, period_end'\)/);
    expect(drawer).not.toMatch(/statementLabel/);
    expect(drawer).not.toMatch(/original_name/);
    expect(drawer).toMatch(/statementText\(statementMeta\)/);
  });
});

describe('LIVE-UI-01 drawer stability', () => {
  it('statement lookup is keyed by the import, not the per-render row object', () => {
    expect(drawer).toMatch(/\}, \[isCommittedRow, committedImportId\]\);/);
    expect(drawer).not.toMatch(/\}, \[row\]\);\n\n  \/\/ Derived values/);
    expect(drawer).toMatch(/STATEMENT_FACTS_CACHE\.get\(committedImportId\)/);
  });

  it('Account and Statement cells keep their place while loading (no appear / disappear)', () => {
    expect(drawer).toMatch(/\{statementMeta !== null && \(\s*<div style=\{\{ minWidth: 0 \}\}>\s*<dt[^>]*>Account<\/dt>/);
    expect(drawer).toMatch(/\{statementMeta !== null && \(\s*<div style=\{\{ minWidth: 0 \}\}>\s*<dt[^>]*>Statement<\/dt>/);
  });

  it('Tag explanation reserves its space while loading', () => {
    expect(drawer).toMatch(/aria-busy=\{tagInsightLoading \|\| undefined\} style=\{\{[^}]*minHeight: 72/);
  });
});

describe('LIVE-UI-03 Workspace is discoverable', () => {
  const v2 = fs.readFileSync(path.join(root, 'src/pages/PrimeChatV2/PrimeChatV2.tsx'), 'utf8');
  it('desktop header has a labelled Full screen control that opens the Workspace route', () => {
    expect(v2).toMatch(/navigate\('\/dashboard\/chat\/prime'\)/);
    expect(v2).toMatch(/aria-label=\{chatMode === 'workspace' \? "Exit full screen" : "Open Prime full screen"\}/);
    expect(v2).toMatch(/<span>\{chatMode === 'workspace' \? "Exit full screen" : "Full screen"\}<\/span>/);
  });
  it('Workspace offers a way back to the previous page', () => {
    expect(v2).toMatch(/if \(window\.history\.length > 1\) navigate\(-1\); else navigate\('\/dashboard'\);/);
  });
});
