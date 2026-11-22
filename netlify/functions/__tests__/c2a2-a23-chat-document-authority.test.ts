/**
 * C2-A2 / A2-3 — chat.ts document authority.
 *
 * - Client-supplied `ocrText` is ignored: it never reaches the prompt as document evidence.
 * - Document context comes only from server-resolved documentIds owned by the verified user
 *   (buildAttachmentContext), exactly as designed today: metadata + statement breakdown, no
 *   document text (chat-document mode is NOT enabled in this phase).
 *
 * buildAttachmentContext is driven directly with an in-memory stand-in for the service-role
 * client (no RLS — ownership must come from the code).
 */

import { describe, it, expect, vi, beforeAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

vi.hoisted(() => {
  process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || 'test-openai-key';
  process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'http://localhost';
  process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-service-key';
});
vi.mock('../_shared/supabase', () => ({ admin: () => ({}), serverSupabase: () => ({}), supabaseAdmin: {} }));

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- loose rows for an in-memory Supabase stand-in
type Row = Record<string, any>;
type Call = { table: string; filters: Array<[string, string, unknown]> };

const OWNER_ID = '11111111-1111-4111-8111-111111111111';
const OTHER_ID = '22222222-2222-4222-8222-222222222222';
const OWNER_DOC = 'dddddddd-0000-4000-8000-000000000001';
const OTHER_DOC = 'dddddddd-0000-4000-8000-000000000002';
const OWNER_DOC_TEXT = 'OWNER RAW OCR BODY 4111111111111111';
const OTHER_DOC_NAME = 'other-user-private-statement.pdf';

function makeDb(): Record<string, Row[]> {
  return {
    user_documents: [
      { id: OWNER_DOC, user_id: OWNER_ID, original_name: 'owner-statement.pdf', mime_type: 'application/pdf', status: 'ready', ocr_text_length: 1200, ocr_text_hash: 'h1', ocr_text: OWNER_DOC_TEXT, extracted_data: { docType: 'statement' } },
      { id: OTHER_DOC, user_id: OTHER_ID, original_name: OTHER_DOC_NAME, mime_type: 'application/pdf', status: 'ready', ocr_text_length: 900, ocr_text_hash: 'h2', ocr_text: 'OTHER USER SECRET TEXT' },
    ],
    imports: [
      { id: 'imp-owner', document_id: OWNER_DOC, user_id: OWNER_ID, status: 'completed', created_at: '2026-11-01', statement_breakdown_json: { statement_meta: { issuer: 'Owner Bank' }, totals: { total_debits: 100, total_credits: 50, net: -50, transaction_count: 3 } } },
      { id: 'imp-other', document_id: OTHER_DOC, user_id: OTHER_ID, status: 'completed', created_at: '2026-11-01', statement_breakdown_json: { statement_meta: { issuer: 'Other Bank' }, totals: { total_debits: 999 } } },
      // A forged row pointing the owner's doc at foreign data must not be used (it is the other user's).
      { id: 'imp-forged', document_id: OWNER_DOC, user_id: OTHER_ID, status: 'completed', created_at: '2026-12-01', statement_breakdown_json: { statement_meta: { issuer: 'Forged Bank' }, totals: { total_debits: 777777 } } },
    ],
  };
}

function makeSb(db: Record<string, Row[]>, calls: Call[]) {
  return {
    from(table: string) {
      const filters: Array<[string, string, unknown]> = [];
      let lim = Infinity;
      const exec = async () => {
        calls.push({ table, filters: [...filters] });
        const rows = (db[table] || []).filter((r) =>
          filters.every(([op, col, v]) => (op === 'eq' ? r[col] === v : op === 'in' ? (v as unknown[]).includes(r[col]) : true)),
        );
        return { data: rows.slice(0, lim), error: null };
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- chainable stand-in
      const b: any = {
        select: () => b,
        eq: (c: string, v: unknown) => (filters.push(['eq', c, v]), b),
        in: (c: string, v: unknown) => (filters.push(['in', c, v]), b),
        order: () => b,
        limit: (n: number) => ((lim = n), b),
        then: (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) => exec().then(res, rej),
      };
      return b;
    },
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- module loaded dynamically after env setup
let buildAttachmentContext: (sb: any, userId: string, ids: string[]) => Promise<string | null>;

beforeAll(async () => {
  const mod = await import('../chat');
  buildAttachmentContext = mod.buildAttachmentContext;
}, 120_000);

describe('A2-3: forged client ocrText never becomes document evidence', () => {
  const chat = fs.readFileSync(path.resolve(__dirname, '../chat.ts'), 'utf8');

  it('chat.ts has no path from body.ocrText into the model prompt', () => {
    expect(chat).not.toMatch(/FINANCIAL DOCUMENT \(OCR extracted text\)/);
    expect(chat).not.toMatch(/\bocrText\s*&&/);
    expect(chat).not.toMatch(/\$\{[^}]*[oO]crText/);
    // The only remaining reference is the ignore-and-log intake guard.
    const refs = chat.split('\n').filter((l) => /ocrText/i.test(l) && !l.trim().startsWith('//'));
    expect(refs.every((l) => /ignoredClientOcrText|client ocrText ignored|\{ ocrText\?: unknown \}/.test(l))).toBe(true);
  });

  it('COLLAB-1 intake protections are still in place', () => {
    expect(chat).toMatch(/documentIds = boundDocumentIds\(documentIds\)/);
    expect(chat).toMatch(/sanitizePrimeContext\(requestBody\?\.prime_context\)/);
    expect(chat).toMatch(/createToolCallBudget\(\)/);
    expect(chat).toMatch(/resolveSystemPromptOverride\(/);
  });
});

describe('A2-3: server-resolved, user-scoped document references (current design)', () => {
  it("an owned document id still produces the existing metadata + statement context", async () => {
    const calls: Call[] = [];
    const ctx = await buildAttachmentContext(makeSb(makeDb(), calls), OWNER_ID, [OWNER_DOC]);
    expect(ctx).toContain('owner-statement.pdf');
    expect(ctx).toContain('Owner Bank');
    expect(ctx).toContain('Money out (debits): $100.00');
    const docQuery = calls.find((c) => c.table === 'user_documents')!;
    expect(docQuery.filters).toContainEqual(['eq', 'user_id', OWNER_ID]);
    const importQuery = calls.find((c) => c.table === 'imports')!;
    expect(importQuery.filters).toContainEqual(['eq', 'user_id', OWNER_ID]);
  });

  it("another user's document id is rejected (no context, nothing of theirs leaks)", async () => {
    const ctx = await buildAttachmentContext(makeSb(makeDb(), []), OWNER_ID, [OTHER_DOC]);
    expect(ctx).toBeNull();
  });

  it("mixed ids: only the caller's documents contribute; foreign imports are never joined", async () => {
    const ctx = String(await buildAttachmentContext(makeSb(makeDb(), []), OWNER_ID, [OWNER_DOC, OTHER_DOC]));
    expect(ctx).toContain('owner-statement.pdf');
    expect(ctx).not.toContain(OTHER_DOC_NAME);
    expect(ctx).not.toContain('Other Bank');
    expect(ctx).not.toContain('Forged Bank');
    expect(ctx).not.toContain('777777');
  });

  it('stays metadata-only: stored OCR text is not expanded into the prompt in this phase', async () => {
    const ctx = String(await buildAttachmentContext(makeSb(makeDb(), []), OWNER_ID, [OWNER_DOC]));
    expect(ctx).not.toContain(OWNER_DOC_TEXT);
    expect(ctx).not.toContain('4111111111111111');
  });

  it('unknown / empty ids yield no context', async () => {
    expect(await buildAttachmentContext(makeSb(makeDb(), []), OWNER_ID, ['dddddddd-0000-4000-8000-0000000000ff'])).toBeNull();
    expect(await buildAttachmentContext(makeSb(makeDb(), []), OWNER_ID, [])).toBeNull();
  });
});
