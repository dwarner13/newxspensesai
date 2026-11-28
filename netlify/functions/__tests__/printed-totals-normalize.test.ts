/**
 * Regression (owner GO 2026-11-26): independent printed totals SURVIVE Claude's extraction.
 *
 * Drives the real normalize-transactions handler with Vision-primary ON, an OCR text whose printed
 * totals the existing OCR-text reader recognises, and a Claude Vision extraction already stored on
 * the document. Before the fix, the Vision branch replaced statementTotals and the independent
 * OCR-text totals were lost. Synthetic data only; Supabase is an in-memory stand-in.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

vi.hoisted(() => {
  process.env.OCR_PREFER_VISION_EXTRACTION = '1';
  process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'http://localhost';
  process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-service-role-key-not-a-secret';
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- loose rows for an in-memory Supabase stand-in
type Row = Record<string, any>;
const USER = '11111111-1111-4111-8111-111111111111';
const TOKEN = 'user-jwt';
const DOC = 'dddddddd-0000-4000-8000-000000000001';

// Printed summary in the OCR text: opening 1,000.00 − 300.00 + 200.00 = closing 900.00.
const OCR_TEXT = [
  'Synthetic Bank chequing statement',
  'Opening balance',
  '1,000.00',
  'Closing balance',
  '900.00',
  'Closing totals 300.00 200.00',
  'Date Description Amount',
].join('\n');

function visionExtraction(totalDeducted: number, totalAdded: number) {
  return {
    period: { start: '2031-03-01', end: '2031-03-31' },
    institution: 'Synthetic Bank',
    accounts: [{ name: 'Chequing', isPrimary: true, statementSummary: { totalDeducted, totalAdded, openingBalance: 1000, closingBalance: 900 } }],
    transactions: [
      { date: '2031-03-05', merchant: 'Synthetic Grocer', amount: -300, type: 'debit', account: 'Chequing' },
      { date: '2031-03-15', merchant: 'Synthetic Payroll', amount: 200, type: 'credit', account: 'Chequing' },
    ],
  };
}

let db: Record<string, Row[]> = {};
let idSeq = 0;
function seed(vision: Row) {
  db = {
    user_documents: [{
      id: DOC, user_id: USER, mime_type: 'application/pdf', original_name: 'synthetic.pdf', storage_path: `${USER}/${DOC}/synthetic.pdf`,
      status: 'ready', ocr_status: 'ready', ocr_text: OCR_TEXT, metadata: {}, extracted_data: { claude_vision: vision },
    }],
    imports: [],
    transactions_staging: [],
  };
}

function query(table: string) {
  const filters: Array<[string, unknown]> = [];
  let op = 'select';
  let payload: Row | Row[] | null = null;
  const matches = () => (db[table] || []).filter((r) => filters.every(([k, v]) => (k.startsWith('in:') ? (v as unknown[]).includes(r[k.slice(3)]) : r[k] === v)));
  const run = () => {
    if (op === 'update') { const rows = matches(); rows.forEach((r) => Object.assign(r, payload)); return { data: rows, error: null }; }
    if (op === 'insert' || op === 'upsert') {
      const rows = (Array.isArray(payload) ? payload : [payload]).map((p) => ({ id: (p as Row)?.id ?? `${table}-${++idSeq}`, ...(p as Row) }));
      (db[table] ||= []).push(...rows);
      return { data: rows, error: null };
    }
    const rows = matches();
    return { data: rows, error: null, count: rows.length };
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- chainable query-builder stand-in
  const q: any = new Proxy({}, {
    get(_t, prop: string) {
      switch (prop) {
        case 'update': return (p: Row) => { op = 'update'; payload = p; return q; };
        case 'insert': return (p: Row) => { op = 'insert'; payload = p; return q; };
        case 'upsert': return (p: Row) => { op = 'upsert'; payload = p; return q; };
        case 'eq': return (k: string, v: unknown) => { filters.push([k, v]); return q; };
        case 'in': return (k: string, v: unknown[]) => { filters.push([`in:${k}`, v]); return q; };
        case 'single': return async () => { const r = run(); const row = (r.data as Row[])[0]; return row ? { data: row, error: null } : { data: null, error: { message: 'not found' } }; };
        case 'maybeSingle': return async () => { const r = run(); return { data: (r.data as Row[])[0] ?? null, error: null }; };
        case 'then': return (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) => Promise.resolve(run()).then(res, rej);
        default: return () => q;
      }
    },
  });
  return q;
}

const fakeClient = {
  auth: { getUser: async (t: string) => (t === TOKEN ? { data: { user: { id: USER } }, error: null } : { data: { user: null }, error: { message: 'invalid' } }) },
  from: (table: string) => query(table),
  rpc: async () => ({ data: null, error: null }),
  storage: { from: () => ({ download: async () => ({ data: null, error: { message: 'n/a' } }), remove: async () => ({ data: [], error: null }), list: async () => ({ data: [], error: null }) }) },
};

vi.mock('../_shared/supabase', () => ({ admin: () => fakeClient, serverSupabase: () => fakeClient }));
vi.mock('../_shared/upload', () => ({ admin: () => fakeClient, markDocStatus: async () => undefined }));
vi.mock('../_shared/guardrails-unified', () => ({ runGuardrailsForText: async (text: string) => ({ ok: true, text, signals: { pii: false } }) }));
vi.mock('openai', () => {
  class FakeOpenAI { chat = { completions: { create: async () => ({ choices: [{ message: { content: '{}' } }] }) } }; }
  return { default: FakeOpenAI, OpenAI: FakeOpenAI };
});
vi.mock('../../../src/lib/ai/userActivity', () => ({ logUserEvent: async () => undefined, recalcFluency: async () => undefined }));

const normalize = await import('../normalize-transactions');

let logSpies: Array<ReturnType<typeof vi.spyOn>> = [];
beforeEach(() => {
  idSeq = 0;
  logSpies = (['log', 'warn', 'error', 'info'] as const).map((m) => vi.spyOn(console, m).mockImplementation(() => undefined));
});
afterEach(() => logSpies.forEach((s) => s.mockRestore()));

async function runNormalize() {
  const res = await normalize.handler(
    { httpMethod: 'POST', headers: { authorization: `Bearer ${TOKEN}`, 'content-type': 'application/json' }, body: JSON.stringify({ documentId: DOC }) } as never,
    {} as never
  );
  const sbd = db.imports[0]?.statement_breakdown_json as Row | undefined;
  return { res: res as { statusCode: number; body: string }, sbd };
}

describe('normalize: independent printed totals survive Claude Vision', () => {
  it('Vision rows staged; statementTotals = Vision; the OCR-text totals are KEPT; rows channel recorded', async () => {
    seed(visionExtraction(300, 200));
    const { sbd } = await runNormalize();
    expect(db.transactions_staging.length).toBeGreaterThan(0);
    expect(sbd?.statementTotals).toMatchObject({ source: 'claude_vision', totalDeducted: 300, totalAdded: 200 });
    // The independent reading of the printed totals is preserved (was overwritten before the fix).
    expect(sbd?.flatTextTotals).toMatchObject({ source: 'closing_totals_inline', totalDeducted: 300, totalAdded: 200 });
    expect(sbd?.printedTotalsSources).toMatchObject({
      claude_vision: { source: 'claude_vision' },
      ocr_text: { source: 'closing_totals_inline' },
    });
    expect(sbd?.printedTotalsCheck).toMatchObject({ rowsSource: 'claude_vision', independentSources: ['ocr_text'], comparison: 'agree' });
  });

  it('when Claude and the OCR text disagree, both are kept and the disagreement is recorded (nothing hidden)', async () => {
    seed(visionExtraction(310, 200));
    const { sbd } = await runNormalize();
    expect(sbd?.statementTotals).toMatchObject({ source: 'claude_vision', totalDeducted: 310 });
    expect(sbd?.flatTextTotals).toMatchObject({ totalDeducted: 300 });
    expect(sbd?.printedTotalsCheck).toMatchObject({ comparison: 'disagree', independentSources: ['ocr_text'] });
  });
});
