/**
 * BYTE-LIVE-01 follow-up (owner GO 2026-11-26): commit-import records the statement period from the
 * statement itself (verified Claude Vision period, then unambiguous printed text), never from the
 * first/last transaction dates. Synthetic dates only.
 *
 * Live finding this reproduces (dates only): a BMO chequing statement printed only its ending date;
 * Claude Vision extracted the full printed period (start one day before the first transaction);
 * statement_meta.period_start/end were committed as null, so downstream screens fell back to
 * transaction dates and started one day late.
 */
import { describe, it, expect, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

vi.hoisted(() => {
  process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'http://localhost';
  process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-service-key';
  process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || 'test-openai-key';
});
vi.mock('../_shared/supabase', () => ({ admin: () => ({}) }));
vi.mock('../_shared/categorize', () => ({ categorizeTransactionWithLearning: async () => ({ category: 'Other', confidence: 0, source: 'rule' }) }));
vi.mock('../_shared/recurringDetection', () => ({ detectAndUpsertRecurringObligations: async () => ({ upserted: 0 }) }));
vi.mock('../_shared/chimeNotifications', () => ({ queueUpcomingPaymentNotifications: async () => undefined }));
vi.mock('openai', () => {
  class FakeOpenAI { chat = { completions: { create: async () => ({ choices: [] }) } }; }
  return { default: FakeOpenAI, OpenAI: FakeOpenAI };
});

const { extractPeriodRange, buildStatementBreakdown } = await import('../commit-import');

// Live user_documents columns (names only, from the live REST schema 2026-11-26). Selecting any
// other column returns PostgREST 42703, exactly as production does.
const LIVE_USER_DOCUMENTS = new Set([
  'content_hash', 'created_at', 'doc_type', 'error_message', 'extracted_data', 'extraction_quality', 'file_hash', 'file_size',
  'id', 'metadata', 'mime_type', 'normalized_json', 'ocr_completed_at', 'ocr_engine', 'ocr_error', 'ocr_last_run_at',
  'ocr_provider', 'ocr_status', 'ocr_text', 'ocr_text_hash', 'ocr_text_length', 'original_name', 'pages_detected',
  'period_end', 'period_start', 'pii_types', 'raw_text', 'redacted_url', 'rejection_reason', 'source', 'source_type',
  'source_url', 'status', 'storage_path', 'summary', 'total_credits', 'total_debits', 'transaction_count', 'updated_at',
  'upload_hash', 'user_id',
]);
const USER = '11111111-1111-4111-8111-111111111111';
const DOC = 'd0d0d0d0-0000-4000-8000-000000000001';

function liveSchemaClient(docRow: Record<string, unknown>) {
  const seen: Array<{ table: string; columns: string; error: boolean }> = [];
  return {
    seen,
    from(table: string) {
      let columns = '';
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- chainable stand-in
      const q: any = {
        select: (c: string) => { columns = c; return q; },
        eq: () => q, in: () => q, order: () => q, range: () => q, limit: () => q,
        maybeSingle: async () => {
          if (table === 'user_documents') {
            const unknown = columns.split(',').map(s => s.trim()).filter(c => c && !LIVE_USER_DOCUMENTS.has(c));
            seen.push({ table, columns, error: unknown.length > 0 });
            if (unknown.length) return { data: null, error: { code: '42703', message: `column user_documents.${unknown[0]} does not exist` } };
            return { data: docRow, error: null };
          }
          return { data: null, error: null };
        },
        then: (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) => Promise.resolve({ data: [], error: null }).then(res, rej),
      };
      return q;
    },
  };
}

describe('extractPeriodRange (statement period at commit)', () => {
  it('reproduction: printed "period ending" text + Vision full period → the Vision period (not null, not transaction dates)', () => {
    const meta = { claude_vision: { period: { start: '2031-03-17', end: '2031-04-16' } } };
    expect(extractPeriodRange(meta, 'April 16, 2031')).toEqual({ periodStart: '2031-03-17', periodEnd: '2031-04-16' });
  });

  it('explicit ISO period fields still win (unchanged behaviour)', () => {
    const meta = { period_start: '2031-01-01', period_end: '2031-01-31', claude_vision: { period: { start: '2031-02-01', end: '2031-02-28' } } };
    expect(extractPeriodRange(meta, 'March 1, 2031 - March 31, 2031')).toEqual({ periodStart: '2031-01-01', periodEnd: '2031-01-31' });
  });

  it('no Vision period: an unambiguous printed range is used', () => {
    expect(extractPeriodRange({}, 'Mar 17, 2031 to Apr 16, 2031')).toEqual({ periodStart: '2031-03-17', periodEnd: '2031-04-16' });
    expect(extractPeriodRange({ statement_period: '2031-03-17 - 2031-04-16' })).toEqual({ periodStart: '2031-03-17', periodEnd: '2031-04-16' });
  });

  it('a single printed "period ending" date is not a range → null (never a one-day or guessed period)', () => {
    expect(extractPeriodRange({}, 'April 16, 2031')).toEqual({ periodStart: null, periodEnd: null });
    expect(extractPeriodRange({}, 'April 16, 2031 - April 16, 2031')).toEqual({ periodStart: null, periodEnd: null });
  });

  it('ambiguous numeric printed dates are never guessed', () => {
    expect(extractPeriodRange({}, '03/04/2031 - 04/04/2031')).toEqual({ periodStart: null, periodEnd: null });
  });

  it('a malformed or reversed Vision period is ignored, falling through to the printed text', () => {
    const reversed = { claude_vision: { period: { start: '2031-04-16', end: '2031-03-17' } } };
    expect(extractPeriodRange(reversed, 'Mar 17, 2031 - Apr 16, 2031')).toEqual({ periodStart: '2031-03-17', periodEnd: '2031-04-16' });
    expect(extractPeriodRange({ claude_vision: { period: { start: 'yesterday', end: 'today' } } })).toEqual({ periodStart: null, periodEnd: null });
  });

  it('nothing recorded → null (transaction dates are never used as the statement period)', () => {
    expect(extractPeriodRange({})).toEqual({ periodStart: null, periodEnd: null });
  });
});

describe('buildStatementBreakdown against the live user_documents schema', () => {
  const docRow = {
    extracted_data: { claude_vision: { period: { start: '2031-03-17', end: '2031-04-16' } } },
    metadata: { statement_summary: { statement_period: 'April 16, 2031', institution: 'Synthetic Bank' } },
    mime_type: 'application/pdf',
  };

  it('the document read uses live columns only and succeeds; period and institution reach statement_meta', async () => {
    const sb = liveSchemaClient(docRow);
    const b = await buildStatementBreakdown({ sb, importId: 'a0a0a0a0-0000-4000-8000-000000000001', userIdText: USER, documentId: DOC });
    expect(sb.seen.filter(s => s.table === 'user_documents').every(s => !s.error)).toBe(true);
    expect(b.statement_meta).toMatchObject({ period_start: '2031-03-17', period_end: '2031-04-16' });
  });

  it('a failed document read is reported (code only), not silently ignored', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    try {
      const failing = {
        from: () => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- chainable stand-in
          const q: any = { select: () => q, eq: () => q, in: () => q, order: () => q, range: () => q, limit: () => q,
            maybeSingle: async () => ({ data: null, error: { code: '42703', message: 'synthetic' } }),
            then: (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) => Promise.resolve({ data: [], error: null }).then(res, rej) };
          return q;
        },
      };
      await buildStatementBreakdown({ sb: failing, importId: 'a0a0a0a0-0000-4000-8000-000000000001', userIdText: USER, documentId: DOC });
      const calls = warn.mock.calls.map(c => c.map(x => (typeof x === 'string' ? x : JSON.stringify(x))).join(' '));
      expect(calls.some(c => c.includes('statement breakdown document read failed') && c.includes('42703'))).toBe(true);
    } finally {
      warn.mockRestore();
    }
  });
});

describe('wiring (static)', () => {
  it('commit-import never selects the nonexistent user_documents.file_type column', () => {
    const src = fs.readFileSync(path.resolve(__dirname, '../commit-import.ts'), 'utf8');
    expect(src).not.toMatch(/\.from\('user_documents'\)\s*\n\s*\.select\('[^']*file_type/);
  });

  const src = fs.readFileSync(path.resolve(__dirname, '../commit-import.ts'), 'utf8');
  it('commit-import uses the shared resolver and passes the printed period from user_documents.metadata', () => {
    expect(src).toMatch(/import \{ resolveStatementPeriod \} from '\.\.\/\.\.\/src\/shared\/statement-period\.js';/);
    expect(src).toMatch(/printed_statement_period: docMetadata\?\.statement_summary\?\.statement_period \|\| null/);
    expect(src).toMatch(/extractPeriodRange\(docMeta, docMeta\?\.printed_statement_period\)/);
  });
});
