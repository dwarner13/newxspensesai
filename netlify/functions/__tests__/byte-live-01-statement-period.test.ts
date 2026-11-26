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

const { extractPeriodRange } = await import('../commit-import');

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

describe('wiring (static)', () => {
  const src = fs.readFileSync(path.resolve(__dirname, '../commit-import.ts'), 'utf8');
  it('commit-import uses the shared resolver and passes the printed period from user_documents.metadata', () => {
    expect(src).toMatch(/import \{ resolveStatementPeriod \} from '\.\.\/\.\.\/src\/shared\/statement-period\.js';/);
    expect(src).toMatch(/printed_statement_period: docMetadata\?\.statement_summary\?\.statement_period \|\| null/);
    expect(src).toMatch(/extractPeriodRange\(docMeta, docMeta\?\.printed_statement_period\)/);
  });
});
