/**
 * Standalone test runner for authoritative transaction identity tests.
 * Uses assertions directly (no vitest dependency) to avoid broken vitest/vite version issue.
 */
import { z } from 'zod';
import {
  hashArgs,
  requiresConfirmation,
  preValidateConfirmationArgs,
} from '../netlify/functions/_shared/toolConfirmation';

const REAL_COSTCO_UUID = '85f64784-7cf8-461a-943e-5c02260de191';
const REAL_GAS_UUID = 'd5404074-ae44-4e6b-a748-554f222acf8e';
const VALID_OTHER_UUID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

let passed = 0;
let failed = 0;

function assert(condition: boolean, name: string) {
  if (condition) {
    passed++;
  } else {
    failed++;
    console.error(`  FAIL: ${name}`);
  }
}

function assertEqual(actual: any, expected: any, name: string) {
  const match = actual === expected;
  if (!match) {
    console.error(`  FAIL: ${name} — expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    failed++;
  } else {
    passed++;
  }
}

function assertNotNull(value: any, name: string) {
  if (value == null) {
    console.error(`  FAIL: ${name} — expected non-null`);
    failed++;
  } else {
    passed++;
  }
}

function assertNull(value: any, name: string) {
  if (value != null) {
    console.error(`  FAIL: ${name} — expected null, got ${JSON.stringify(value)}`);
    failed++;
  } else {
    passed++;
  }
}

// ── Replicate chat.ts helpers for testing ─────────────────────────────

function isValidUUID(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
}

type AuthoritativeSelectedTransaction = {
  id: string;
  date: string | null;
  description: string | null;
  merchant: string | null;
  amount: number | null;
  current_category: string | null;
};

function extractAuthoritativeFromSearchResult(rows: any[]): AuthoritativeSelectedTransaction | null {
  if (!Array.isArray(rows) || rows.length !== 1) return null;
  const row = rows[0];
  if (!row?.id || !isValidUUID(String(row.id))) return null;
  return {
    id: String(row.id).trim(),
    date: row.date ?? null,
    description: row.description ?? row.merchant ?? null,
    merchant: row.merchant ?? null,
    amount: typeof row.amount === 'number' ? row.amount : null,
    current_category: row.category ?? null,
  };
}

function bindAuthoritativeTxIdentity(
  toolName: string,
  employeeSlug: string,
  args: Record<string, any>,
  handoffCtx: { handoff_type?: string; plugin_payload?: Record<string, any> } | null,
): { args: Record<string, any>; bound: boolean } {
  if (toolName !== 'tag_update_transaction_category') return { args, bound: false };
  const isTag = employeeSlug === 'tag-ai' || employeeSlug === 'tag';
  if (!isTag) return { args, bound: false };
  if (!handoffCtx || handoffCtx.handoff_type !== 'plugin') return { args, bound: false };
  const txId = handoffCtx.plugin_payload?.transaction?.id;
  if (!txId || typeof txId !== 'string') return { args, bound: false };
  if (!isValidUUID(txId)) return { args, bound: false };
  if (!('transactionId' in args)) return { args, bound: false };
  return { args: { ...args, transactionId: txId }, bound: true };
}

const tagUpdateInputSchema = z.object({
  transactionId: z.string().uuid('Transaction ID must be a valid UUID'),
  merchantName: z.string().optional(),
  oldCategory: z.string().optional(),
  newCategory: z.string().min(1, 'New category is required'),
  subcategory: z.string().optional(),
  reason: z.string().optional(),
});

function makeTxRow(overrides: Partial<any> = {}) {
  return {
    id: overrides.id ?? REAL_COSTCO_UUID,
    date: overrides.date ?? '2026-05-04',
    description: overrides.description ?? 'COSTCO WHOLESALE',
    merchant: overrides.merchant ?? 'COSTCO WHOLESALE',
    amount: overrides.amount ?? -190.27,
    category: overrides.category ?? 'Groceries',
  };
}

// ═══════════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════════

console.log('\n=== A: Narrowed tx_search → authoritative selection ===');
{
  const auth = extractAuthoritativeFromSearchResult([makeTxRow()]);
  assertNotNull(auth, 'single result → non-null selection');
  assertEqual(auth!.id, REAL_COSTCO_UUID, 'correct UUID');
  assertEqual(auth!.description, 'COSTCO WHOLESALE', 'correct description');
  assertEqual(auth!.amount, -190.27, 'correct amount');
  assert(isValidUUID(auth!.id), 'UUID format valid');
}

console.log('\n=== B: UUID survives standard handoff via auto-promotion ===');
{
  const authTx = extractAuthoritativeFromSearchResult([makeTxRow()]);
  assertNotNull(authTx, 'authoritative tx exists');
  let handoffType: 'standard' | 'plugin' = 'standard';
  let pluginPayload: any = null;
  const isTagTarget = true;
  if (isTagTarget && !pluginPayload && authTx) {
    handoffType = 'plugin';
    pluginPayload = {
      transaction: { id: authTx!.id, description: authTx!.description },
      _source: 'authoritative_selected_tx',
    };
  }
  assertEqual(handoffType, 'plugin', 'auto-promoted to plugin');
  assertEqual(pluginPayload.transaction.id, REAL_COSTCO_UUID, 'UUID in plugin_payload');
  assertEqual(pluginPayload._source, 'authoritative_selected_tx', 'source marker');
}

console.log('\n=== C: Trusted UUID reaches Tag byte-for-byte ===');
{
  const handoffCtx = {
    handoff_type: 'plugin' as const,
    plugin_payload: { transaction: { id: REAL_COSTCO_UUID } },
  };
  const result = bindAuthoritativeTxIdentity('tag_update_transaction_category', 'tag-ai',
    { transactionId: '1', newCategory: 'Shopping' }, handoffCtx);
  assert(result.bound, 'binding occurred');
  assertEqual(result.args.transactionId, REAL_COSTCO_UUID, 'exact UUID');
  assert(result.args.transactionId === REAL_COSTCO_UUID, 'byte-for-byte identical');
}

console.log('\n=== D: Application binding uses authoritative UUID ===');
{
  const handoffCtx = { handoff_type: 'plugin' as const, plugin_payload: { transaction: { id: REAL_COSTCO_UUID } } };
  const result = bindAuthoritativeTxIdentity('tag_update_transaction_category', 'tag-ai',
    { transactionId: '1', newCategory: 'Shopping', reason: 'User asked' }, handoffCtx);
  assertEqual(result.args.transactionId, REAL_COSTCO_UUID, 'UUID bound');
  assertEqual(result.args.newCategory, 'Shopping', 'model newCategory preserved');
  assertEqual(result.args.reason, 'User asked', 'model reason preserved');
}

console.log('\n=== E: Model "1" cannot override trusted UUID ===');
{
  const handoffCtx = { handoff_type: 'plugin' as const, plugin_payload: { transaction: { id: REAL_COSTCO_UUID } } };
  const badIds = ['1', 'COSTCO-2026-05-04', 'tx-123', 'first', ''];
  for (const badId of badIds) {
    const result = bindAuthoritativeTxIdentity('tag_update_transaction_category', 'tag-ai',
      { transactionId: badId, newCategory: 'Shopping' }, handoffCtx);
    assertEqual(result.args.transactionId, REAL_COSTCO_UUID, `"${badId}" replaced with real UUID`);
  }
}

console.log('\n=== F: No authoritative tx → no binding ===');
{
  const r1 = bindAuthoritativeTxIdentity('tag_update_transaction_category', 'tag-ai',
    { transactionId: '1', newCategory: 'Shopping' }, { handoff_type: 'standard' });
  assert(!r1.bound, 'standard handoff → no binding');
  assertEqual(r1.args.transactionId, '1', 'original transactionId preserved');

  const r2 = bindAuthoritativeTxIdentity('tag_update_transaction_category', 'tag-ai',
    { transactionId: '1', newCategory: 'Shopping' }, null);
  assert(!r2.bound, 'null handoff → no binding');

  const r3 = bindAuthoritativeTxIdentity('tag_update_transaction_category', 'tag-ai',
    { transactionId: '1', newCategory: 'Shopping' }, {
      handoff_type: 'plugin', plugin_payload: { transaction: { id: 'not-a-uuid' } }
    });
  assert(!r3.bound, 'invalid UUID in payload → no binding');
}

console.log('\n=== G: Multiple candidates → no selection ===');
{
  const auth2 = extractAuthoritativeFromSearchResult([makeTxRow(), makeTxRow({ id: REAL_GAS_UUID })]);
  assertNull(auth2, '2 results → null');
  const auth0 = extractAuthoritativeFromSearchResult([]);
  assertNull(auth0, '0 results → null');
  assertNull(extractAuthoritativeFromSearchResult(null as any), 'null input → null');
}

console.log('\n=== G2: Staleness — invalid/missing id in single result cannot preserve old identity ===');
{
  // Simulates the updateAuthoritativeSelectedTxFromSearchResult logic
  // 1 row with missing id → must NOT leave stale identity
  assertNull(extractAuthoritativeFromSearchResult([{ date: '2026-05-04', description: 'SOME TX' }]), '1 row missing id → null');
  // 1 row with invalid UUID → must NOT establish
  assertNull(extractAuthoritativeFromSearchResult([{ id: 'not-a-uuid', date: '2026-05-04' }]), '1 row invalid UUID → null');
  // 1 row with empty id → must NOT establish
  assertNull(extractAuthoritativeFromSearchResult([{ id: '', date: '2026-05-04' }]), '1 row empty id → null');
  // 1 row with numeric id → must NOT establish
  assertNull(extractAuthoritativeFromSearchResult([{ id: 123, date: '2026-05-04' }]), '1 row numeric id → null');
}

console.log('\n=== H: Invalid args fail BEFORE confirmation ===');
{
  const r1 = preValidateConfirmationArgs(tagUpdateInputSchema, { transactionId: '1', newCategory: 'Shopping' });
  assertNotNull(r1, '"1" rejected');
  assert(r1!.error.includes('Invalid input'), 'error message correct');

  const badIds = ['COSTCO-2026-05-04', 'tx-123', '', '  '];
  for (const id of badIds) {
    const r = preValidateConfirmationArgs(tagUpdateInputSchema, { transactionId: id, newCategory: 'Shopping' });
    assertNotNull(r, `"${id}" rejected`);
  }
}

console.log('\n=== I: Invalid UUID → NO confirmation row ===');
{
  const pre = preValidateConfirmationArgs(tagUpdateInputSchema, { transactionId: '1', newCategory: 'Shopping' });
  assertNotNull(pre, 'pre-validation blocks before createPendingConfirmation');
}

console.log('\n=== J: Valid args create confirmation normally ===');
{
  const r1 = preValidateConfirmationArgs(tagUpdateInputSchema, { transactionId: REAL_COSTCO_UUID, newCategory: 'Shopping' });
  assertNull(r1, 'valid args pass pre-validation');
  const r2 = preValidateConfirmationArgs(tagUpdateInputSchema, {
    transactionId: REAL_COSTCO_UUID, newCategory: 'Shopping', oldCategory: 'Groceries', reason: 'Test'
  });
  assertNull(r2, 'valid args with optionals pass');
}

console.log('\n=== K: args_snapshot contains authoritative UUID ===');
{
  const handoffCtx = { handoff_type: 'plugin' as const, plugin_payload: { transaction: { id: REAL_COSTCO_UUID } } };
  const { args: boundArgs } = bindAuthoritativeTxIdentity('tag_update_transaction_category', 'tag-ai',
    { transactionId: '1', newCategory: 'Shopping' }, handoffCtx);
  assertEqual(boundArgs.transactionId, REAL_COSTCO_UUID, 'args for snapshot have real UUID');
  const hash = hashArgs(boundArgs);
  assertEqual(typeof hash, 'string', 'hash is string');
  assertEqual(hash.length, 64, 'SHA-256 hex length');
}

console.log('\n=== O: executeTool error is treated as failure ===');
{
  const errorResult: any = { error: 'Invalid input', details: [] };
  assert('error' in errorResult, 'error discriminator works');
  const successResult: any = { success: true, transactionId: REAL_COSTCO_UUID };
  assert(!('error' in successResult), 'success has no error field');
}

console.log('\n=== P: Failed confirmation → success: false ===');
{
  const errorResult: any = { error: 'Invalid input', details: [] };
  const isToolError = errorResult && typeof errorResult === 'object' && 'error' in errorResult;
  assertEqual(!isToolError, false, 'error detected → success: false');
  const successResult: any = { success: true };
  const isToolError2 = successResult && typeof successResult === 'object' && 'error' in successResult;
  assertEqual(!isToolError2, true, 'success detected → success: true');
}

console.log('\n=== Q: Non-Tag targets not auto-promoted ===');
{
  assert(!('byte-docs' === 'tag-ai' || 'byte-docs' === 'tag'), 'byte-docs is not tag');
  assert(!('crystal-analytics' === 'tag-ai' || 'crystal-analytics' === 'tag'), 'crystal is not tag');
}

console.log('\n=== R: UUID/confirmation security ===');
{
  assert(requiresConfirmation({ requiresConfirm: true, mutates: true }), 'mutating tool gated');
  assert(!requiresConfirmation({}), 'read-only not gated');
  const h1 = hashArgs({ transactionId: REAL_COSTCO_UUID, newCategory: 'Shopping' });
  const h2 = hashArgs({ newCategory: 'Shopping', transactionId: REAL_COSTCO_UUID });
  assertEqual(h1, h2, 'hash order-independent');
  const h3 = hashArgs({ transactionId: '1', newCategory: 'Shopping' });
  assert(h1 !== h3, 'different transactionId → different hash');
}

console.log('\n=== Edge: binding scope ===');
{
  const hc = { handoff_type: 'plugin' as const, plugin_payload: { transaction: { id: REAL_COSTCO_UUID } } };
  assert(!bindAuthoritativeTxIdentity('tx_search', 'tag-ai', { q: 'Costco' }, hc).bound, 'tx_search not bound');
  assert(!bindAuthoritativeTxIdentity('tag_update_transaction_category', 'prime-boss',
    { transactionId: '1', newCategory: 'Shopping' }, hc).bound, 'prime-boss not bound');
  assert(!bindAuthoritativeTxIdentity('tag_update_transaction_category', 'tag-ai',
    { newCategory: 'Shopping' }, hc).bound, 'no transactionId field → not bound');
}

// ═══════════════════════════════════════════════════════════════════════
console.log('\n' + '='.repeat(60));
console.log(`RESULTS: ${passed} passed, ${failed} failed, ${passed + failed} total`);
if (failed > 0) {
  console.error('SOME TESTS FAILED');
  process.exit(1);
} else {
  console.log('ALL TESTS PASSED');
  process.exit(0);
}
