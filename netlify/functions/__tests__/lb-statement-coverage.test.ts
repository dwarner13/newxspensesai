/**
 * L-B — statement inventory and coverage (owner live finding LIVE-02, GO 2026-11-24).
 * In-memory fakes only; no database.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  classifyImportStatus,
  loadStatementCoverage,
  summarizeStatementCoverage,
  toStatementRecord,
  coverageForPeriod,
  type CoverageDbClient,
} from '../../../src/shared/statement-coverage';
import {
  isStatementInventoryQuestion,
  formatStatementCoverageEvidence,
  buildPrimeRoutesRule,
  VERIFIED_APP_ROUTES,
} from '../../../src/shared/prime-statement-guidance';
import { buildPrimeAuthoritySystemMessage } from '../_shared/primePolicy';

const OWNER_Q = 'What is the last month I uploaded a bank statement and also tell me what was the bank?';
const U = 'user-a';

type Row = Record<string, unknown>;
type Call = { table: string; select: string; filters: Array<[string, string, unknown]> };

function fakeDb(imports: Row[], docs: Row[], opts: { purposeMissing?: boolean; failImports?: boolean } = {}) {
  const calls: Call[] = [];
  const client = {
    from(table: string) {
      const call: Call = { table, select: '', filters: [] };
      calls.push(call);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- minimal chain
      const chain: any = {
        select(c: string) { call.select = c; return chain; },
        eq(k: string, v: unknown) { call.filters.push(['eq', k, v]); return chain; },
        is(k: string, v: unknown) { call.filters.push(['is', k, v]); return chain; },
        in(k: string, v: unknown) { call.filters.push(['in', k, v]); return chain; },
        order() { return chain; },
        limit() {
          if (table === 'imports') {
            if (opts.failImports) return Promise.resolve({ data: null, error: { code: 'X', message: 'boom' } });
            return Promise.resolve({ data: imports.filter(r => r.user_id === U && !r.deleted_at), error: null });
          }
          if (opts.purposeMissing && call.select.includes('purpose')) return Promise.resolve({ data: null, error: { code: '42703', message: 'column user_documents.purpose does not exist' } });
          const ids = (call.filters.find(f => f[0] === 'in')?.[2] as string[]) ?? [];
          return Promise.resolve({ data: docs.filter(d => d.user_id === U && ids.includes(String(d.id))).map(d => { const c = { ...d }; if (opts.purposeMissing) delete c.purpose; return c; }), error: null });
        },
      };
      return chain;
    },
  };
  return { client: client as unknown as CoverageDbClient, calls };
}

const meta = (issuer: string, last4: string, ps: string, pe: string) => ({ statement_meta: { issuer, account_last4: last4, period_start: ps, period_end: pe, statement_type: 'bank' } });
const IMPORTS: Row[] = [
  { id: 'i1', user_id: U, document_id: 'd1', status: 'committed', created_at: '2026-07-02T10:00:00Z', committed_at: '2026-07-02T10:05:00Z', statement_breakdown_json: meta('BMO', '1234', '2026-05-17', '2026-06-16') },
  { id: 'i2', user_id: U, document_id: 'd2', status: 'committed', created_at: '2026-06-01T10:00:00Z', committed_at: '2026-06-01T10:05:00Z', statement_breakdown_json: meta('BMO', '1234', '2026-04-17', '2026-05-16') },
  { id: 'i3', user_id: U, document_id: 'd3', status: 'committed', created_at: '2026-04-01T10:00:00Z', committed_at: '2026-04-01T10:05:00Z', statement_breakdown_json: meta('BMO', '1234', '2026-02-17', '2026-03-16') },
  { id: 'i4', user_id: U, document_id: 'd4', status: 'committed', created_at: '2026-06-20T10:00:00Z', committed_at: '2026-06-20T10:05:00Z', statement_breakdown_json: meta('Canadian Tire Mastercard', '9876', '2026-05-01', '2026-05-31') },
  { id: 'i5', user_id: U, document_id: 'd5', status: 'parsed_unreconciled', created_at: '2026-11-20T10:00:00Z', committed_at: null, statement_breakdown_json: meta('BMO', '1234', '2026-10-17', '2026-11-16') },
  { id: 'i6', user_id: U, document_id: 'd6', status: 'failed', created_at: '2026-11-21T10:00:00Z', committed_at: null, statement_breakdown_json: null },
  { id: 'i7', user_id: U, document_id: 'd7', status: 'committed', created_at: '2026-11-22T10:00:00Z', committed_at: '2026-11-22T10:01:00Z', statement_breakdown_json: meta('Lease', '0000', '2026-01-01', '2026-12-31') },
  { id: 'i8', user_id: U, document_id: 'd8', status: 'committed', created_at: '2026-08-01T00:00:00Z', committed_at: '2026-08-01T00:00:00Z', deleted_at: '2026-08-02T00:00:00Z', statement_breakdown_json: meta('Deleted Bank', '5555', '2026-07-01', '2026-07-31') },
  { id: 'x1', user_id: 'user-b', document_id: 'db', status: 'committed', created_at: '2026-11-23T00:00:00Z', committed_at: '2026-11-23T00:00:00Z', statement_breakdown_json: meta('Other Customer Bank', '4444', '2026-10-01', '2026-10-31') },
];
const DOCS: Row[] = [
  ...['d1', 'd2', 'd3', 'd4', 'd5', 'd6'].map(id => ({ id, user_id: U, original_name: `${id}.pdf`, purpose: null, ocr_text: 'SECRET OCR', storage_path: 'u/secret.pdf' })),
  { id: 'd7', user_id: U, original_name: 'lease.pdf', purpose: 'chat_document' },
];

let logs: string[] = [];
let spies: Array<ReturnType<typeof vi.spyOn>> = [];
beforeEach(() => { logs = []; spies = (['log', 'warn', 'error', 'info'] as const).map(m => vi.spyOn(console, m).mockImplementation((...a: unknown[]) => { logs.push(a.map(String).join(' ')); })); });
afterEach(() => spies.forEach(s => s.mockRestore()));

describe('L-B classifier (owner live question)', () => {
  it.each([OWNER_Q, 'When did I last upload a statement?', 'Which statements have I uploaded?', 'What bank was my last statement from?', 'Are there any missing statements?', 'Which months do I have statements for?'])('statement question: %s', (q) => {
    expect(isStatementInventoryQuestion(q)).toBe(true);
  });
  it.each(['How much did I spend at Costco last month?', 'Are my transactions categorized correctly?', 'What is my name?', 'Show my last 10 transactions'])('not a statement question: %s', (q) => {
    expect(isStatementInventoryQuestion(q)).toBe(false);
  });
});

describe('L-B coverage over existing records', () => {
  it('owner-scoped; deleted imports excluded; chat documents excluded', async () => {
    const { client, calls } = fakeDb(IMPORTS, DOCS);
    const c = await loadStatementCoverage(client, U);
    for (const call of calls) expect(call.filters).toContainEqual(['eq', 'user_id', U]);
    expect(calls.find(x => x.table === 'imports')!.filters).toContainEqual(['is', 'deleted_at', null]);
    const json = JSON.stringify(c);
    expect(json).not.toContain('Other Customer Bank');
    expect(json).not.toContain('Deleted Bank');
    expect(json).not.toContain('Lease');          // chat document, even though its import says committed
  });

  it('last upload attempt ≠ last completed import; upload date ≠ statement period', async () => {
    const c = await loadStatementCoverage(fakeDb(IMPORTS, DOCS).client, U);
    expect(c.lastUploadAttempt).toMatchObject({ state: 'failed', uploadedAt: '2026-11-21T10:00:00Z' });
    expect(c.lastCompletedImport).toMatchObject({ institution: 'BMO', accountLast4: '1234', periodStart: '2026-05-17', periodEnd: '2026-06-16', uploadedAt: '2026-07-02T10:00:00Z', state: 'completed' });
    expect(c.statusCounts).toEqual({ completed: 4, awaiting_review: 1, in_progress: 0, failed: 1, unknown: 0 });
  });

  it('coverage by account from completed statement periods, with gaps; pending/failed never count', async () => {
    const c = await loadStatementCoverage(fakeDb(IMPORTS, DOCS).client, U);
    const bmo = c.accounts.find(a => a.label === 'BMO •••• 1234')!;
    expect(bmo).toMatchObject({ statementCount: 3, earliestPeriodStart: '2026-02-17', latestPeriodEnd: '2026-06-16' });
    expect(bmo.gaps).toEqual([{ from: '2026-03-17', to: '2026-04-16' }]);
    expect(bmo.latestPeriodEnd).not.toBe('2026-11-16'); // the pending Nov statement is not coverage
    expect(c.accounts.find(a => a.label === 'Canadian Tire Mastercard •••• 9876')).toBeDefined();
  });

  it('never returns OCR text, extracted contents or storage paths; logs counts only', async () => {
    const c = await loadStatementCoverage(fakeDb(IMPORTS, DOCS).client, U);
    const json = JSON.stringify(c);
    expect(json).not.toMatch(/SECRET OCR|secret\.pdf|storage_path|ocr_text/);
    const { calls } = fakeDb(IMPORTS, DOCS);
    await loadStatementCoverage(fakeDb(IMPORTS, DOCS).client, U);
    for (const call of calls) expect(call.select).not.toMatch(/ocr_text|extracted_data|storage_path|raw_text/);
  });

  it('works before the purpose migration (missing column → every row is an import)', async () => {
    const c = await loadStatementCoverage(fakeDb(IMPORTS, DOCS, { purposeMissing: true }).client, U);
    expect(c.status).toBe('ok');
    expect(c.statusCounts.completed).toBe(5); // the "Lease" row cannot be identified as chat without the column
  });

  it('query failure → query_error, never guessed', async () => {
    const c = await loadStatementCoverage(fakeDb(IMPORTS, DOCS, { failImports: true }).client, U);
    expect(c.status).toBe('query_error');
    expect(c.accounts).toEqual([]);
  });

  it('missing metadata is disclosed, not guessed', () => {
    const r = toStatementRecord({ status: 'committed', created_at: '2026-01-02T00:00:00Z', statement_breakdown_json: null }, undefined);
    expect(r).toMatchObject({ institution: null, accountLast4: null, periodStart: null, metadataMissing: true });
    const s = summarizeStatementCoverage([r]);
    expect(s.completedWithoutPeriod).toBe(1);
    expect(s.limitations.join(' ')).toMatch(/no statement period recorded, so their coverage is unknown/);
  });

  it('last 4 only, even if more digits are stored', () => {
    const r = toStatementRecord({ status: 'committed', statement_breakdown_json: { statement_meta: { issuer: 'Visa', account_last4: '4111111111111234', period_start: '2026-01-01', period_end: '2026-01-31' } } }, undefined);
    expect(r.accountLast4).toBe('1234');
  });

  it('status classes', () => {
    expect(classifyImportStatus('committed')).toBe('completed');
    expect(classifyImportStatus('parsed_unreconciled')).toBe('awaiting_review');
    expect(classifyImportStatus('normalizing')).toBe('in_progress');
    expect(classifyImportStatus('timed_out')).toBe('failed');
    expect(classifyImportStatus('weird')).toBe('unknown');
  });
});

describe('L-B coverageForPeriod (used by L-C)', () => {
  it('complete / incomplete / none', async () => {
    const c = await loadStatementCoverage(fakeDb(IMPORTS, DOCS).client, U);
    expect(coverageForPeriod(c, '2026-05-01', '2026-05-16').overall).toBe('complete'); // BMO 04-17..05-16 and CT 05-01..05-31 both cover it
    const feb = coverageForPeriod(c, '2026-02-20', '2026-03-10');                         // BMO covers; CT has no statement then
    expect(feb.overall).toBe('incomplete');
    expect(feb.byAccount).toEqual(expect.arrayContaining([{ label: 'BMO •••• 1234', coverage: 'covered' }, { label: 'Canadian Tire Mastercard •••• 9876', coverage: 'not_covered' }]));
    expect(coverageForPeriod(c, '2026-10-01', '2026-10-31')).toMatchObject({ overall: 'none' });
    const mar = coverageForPeriod(c, '2026-03-20', '2026-04-10');
    expect(mar.byAccount.find(b => b.label === 'BMO •••• 1234')!.coverage).toBe('partial'); // inside the gap
  });
});

describe('L-B evidence, routes and wiring', () => {
  it('evidence separates upload date from statement period and the attempt from the completed import', async () => {
    const c = await loadStatementCoverage(fakeDb(IMPORTS, DOCS).client, U);
    const ev = formatStatementCoverageEvidence(c);
    // L-D2: why the bank is missing, the file name, and a customer-friendly status.
    expect(ev).toContain('Most recent upload attempt: bank not identified — this import did not complete, and bank details are recorded only when an import completes; file "d6.pdf"; statement period not recorded; uploaded 2026-11-21; import status: did not complete');
    expect(ev).toContain('Most recent COMPLETED import: BMO •••• 1234; file "d1.pdf"; statement period 2026-05-17 to 2026-06-16; uploaded 2026-07-02; import status: imported');
    expect(ev).toMatch(/never mix them/);
  });
  it('Prime may only point to verified routes; no Documents/Statements page', () => {
    const rule = buildPrimeRoutesRule();
    expect(rule).toMatch(/There is no separate "Documents" or "Statements" page/);
    const app = fs.readFileSync(path.resolve(__dirname, '../../../src/App.tsx'), 'utf8');
    for (const r of VERIFIED_APP_ROUTES) expect(app).toContain(`<Route path="${r.path.replace('/dashboard/', '')}"`);
    expect(buildPrimeAuthoritySystemMessage({ lane: 'deep', intent: 'general', hasDocs: false, hasSnapshot: false })).toContain(rule);
  });
  it('chat.ts runs statement_coverage deterministically for statement questions; tool registered read-only', () => {
    const chat = fs.readFileSync(path.resolve(__dirname, '../chat.ts'), 'utf8');
    expect(chat).toMatch(/if \(isPrime && isStatementInventoryQuestion\(String\(masked \|\| ''\)\)\) \{/);
    expect(chat).toMatch(/await executeStatementCoverage\(\{\}, \{ userId \}\)/);
    const idx = fs.readFileSync(path.resolve(__dirname, '../../../src/agent/tools/index.ts'), 'utf8');
    const block = idx.slice(idx.indexOf("['statement_coverage', {"), idx.indexOf("['statement_coverage', {") + 1200);
    expect(block).toMatch(/mutates: false/);
    expect(block).toMatch(/requiresConfirm: false/);
  });
  it('no write calls in the module or tool', () => {
    for (const f of ['src/shared/statement-coverage.ts', 'src/agent/tools/impl/statement_coverage.ts']) {
      expect(fs.readFileSync(path.resolve(__dirname, '../../..', f), 'utf8')).not.toMatch(/\.(insert|update|upsert|delete|rpc)\(/);
    }
  });
});
