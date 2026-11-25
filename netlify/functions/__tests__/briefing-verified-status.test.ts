/* eslint-disable @typescript-eslint/no-explicit-any -- test doubles */
/**
 * Prime import briefing (owner GO 2026-11-25, FINAL RELIABILITY CORRECTIONS item 2):
 * suggestions are never reported as saved; saved/learned only with verified server evidence;
 * failed or incomplete processing is reported honestly. Synthetic data only.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { makeCappedClient, syntheticTransactions } from '../../../src/shared/__tests__/fixtures/capped-supabase';

const state: { client: any } = { client: null };
vi.mock('../_shared/supabase.js', () => ({ serverSupabase: () => state.client, admin: () => state.client }));
vi.mock('../_shared/verifyAuth.js', () => ({ verifyAuth: async () => ({ userId: 'u-brief', error: null }) }));

const IMP = '44444444-0000-4000-8000-000000000001';
const OTHER_IMP = '44444444-0000-4000-8000-000000000002';
let prompts: string[] = [];

beforeEach(() => {
  prompts = [];
  vi.stubGlobal('fetch', vi.fn(async (_u: string, init: any) => {
    const b = JSON.parse(init.body);
    prompts.push(b.system + '\n' + b.messages[0].content);
    return { json: async () => ({ content: [{ text: 'ok' }] }) } as any;
  }));
});

function client(notifications: any[], opts: any = {}) {
  const tx = syntheticTransactions(120, 'u-brief', { importId: IMP });
  return makeCappedClient({
    transactions: tx,
    imports: [{ id: IMP, user_id: 'u-brief', file_url: 'x/statement.pdf', created_at: '2026-01-15T00:00:00Z' }],
    user_notifications: notifications.map((n, i) => ({ id: `n${i}`, user_id: 'u-brief', employee_slug: 'tag-ai', created_at: `2026-01-15T00:00:${String(10 + i).padStart(2, '0')}Z`, ...n })),
    profiles: [{ id: 'u-brief', first_name: 'Sam' }],
  }, opts);
}
async function brief(c: any) {
  state.client = c;
  const { handler } = await import('../prime-briefing');
  await (handler as any)({ httpMethod: 'POST', body: JSON.stringify({ importId: IMP }), headers: {} }, {});
  return prompts[0] ?? '';
}

describe('import briefing reports only verified Tag results', () => {
  it('suggestions are shown as suggestions; nothing claimed as saved without a verified apply', async () => {
    const p = await brief(client([{ type: 'import_complete', payload: { import_id: IMP, suggested_count: 37, applied_count: 0, auto_count: 0, needs_input_count: 5 } }]));
    expect(p).toContain('Tag SUGGESTED categories for: 37 transactions (proposals — NOT applied until the customer confirms)');
    expect(p).toContain("Category changes SAVED after the customer's confirmation (verified): 0");
    expect(p).toContain('Still needs the customer\'s input: 5');
    expect(p).not.toMatch(/auto-categorized/i);
    expect(p).toContain('Never say transactions were categorized, fixed, saved or learned unless the data below shows a SAVED (verified) count');
  });

  it('saved count comes only from verified tag_suggestions_applied for THIS import', async () => {
    const p = await brief(client([
      { type: 'import_complete', payload: { import_id: IMP, suggested_count: 37, needs_input_count: 5 } },
      { type: 'tag_suggestions_applied', payload: { import_id: IMP, applied_count: 30, verified: true } },
      { type: 'tag_suggestions_applied', payload: { import_id: IMP, applied_count: 99, verified: false } }, // not verified → ignored
      { type: 'tag_suggestions_applied', payload: { import_id: OTHER_IMP, applied_count: 500, verified: true } }, // other import
    ]));
    expect(p).toContain("Category changes SAVED after the customer's confirmation (verified): 30");
  });

  it("another import's notification is never used for this briefing (was: latest of ANY import)", async () => {
    const p = await brief(client([{ type: 'import_complete', payload: { import_id: OTHER_IMP, suggested_count: 999, auto_count: 999 } }]));
    expect(p).not.toContain('999');
    expect(p).toContain('Tag has not reported on this import yet (categorization incomplete');
  });

  it('notifications cannot be read → reported honestly, nothing claimed', async () => {
    const p = await brief(client([], { failOnRequest: 1, failTable: 'user_notifications' }));
    expect(p).toContain("Tag's categorization status for this import could not be loaded");
  });

  it('imported count is counted in the database for this import', async () => {
    const p = await brief(client([]));
    expect(p).toContain('Transactions imported (counted in the database): 120');
  });
});
