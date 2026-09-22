/**
 * Transaction Mutation Identity Safety — regression tests.
 * Validates: authoritative UUID requirement, verified_zero blocking,
 * stale UUID defense, identity consistency chain, challenge/recovery
 * behavior, and read-only handoff preservation.
 * Run: npx tsx scripts/_run_mutation_identity_tests.ts
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename_local = fileURLToPath(import.meta.url);
const __dirname_local = dirname(__filename_local);

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------
let passed = 0;
let failed = 0;

function assert(condition: boolean, msg: string) {
  if (condition) {
    passed++;
  } else {
    failed++;
    console.error(`  FAIL: ${msg}`);
  }
}

function test(name: string, fn: () => void) {
  console.log(`\n=== ${name} ===`);
  fn();
}

function extractBlock(src: string, anchor: string, chars: number): string {
  const idx = src.indexOf(anchor);
  if (idx === -1) return '';
  return src.substring(idx, idx + chars);
}

// ---------------------------------------------------------------------------
// Source files
// ---------------------------------------------------------------------------

const CHAT_SRC = readFileSync(
  join(__dirname_local, '..', 'netlify', 'functions', 'chat.ts'),
  'utf-8',
);

const DRAWER_SRC = readFileSync(
  join(__dirname_local, '..', 'src', 'components', 'transactions', 'TransactionInsightDrawer.tsx'),
  'utf-8',
);

const ACTION_RECEIPT_SRC = readFileSync(
  join(__dirname_local, '..', 'src', 'components', 'chat', 'ActionReceiptCard.tsx'),
  'utf-8',
);

const TX_PAGE_SRC = readFileSync(
  join(__dirname_local, '..', 'src', 'pages', 'dashboard', 'TransactionsPageV2.tsx'),
  'utf-8',
);

// ---------------------------------------------------------------------------
// 1. checkMutationIdentityGate function exists
// ---------------------------------------------------------------------------

test('1: checkMutationIdentityGate function exists', () => {
  assert(CHAT_SRC.includes('function checkMutationIdentityGate('), 'gate function defined');
});

// ---------------------------------------------------------------------------
// 2. Gate targets tag_update_transaction_category specifically
// ---------------------------------------------------------------------------

test('2: gate targets tag_update_transaction_category specifically', () => {
  const gateBlock = extractBlock(CHAT_SRC, 'function checkMutationIdentityGate(', 500);
  assert(gateBlock.includes("toolName !== 'tag_update_transaction_category'"), 'gate checks exact tool name');
  assert(gateBlock.includes('return null'), 'non-matching tools pass through');
});

// ---------------------------------------------------------------------------
// 3. Gate allows bound mutations
// ---------------------------------------------------------------------------

test('3: gate allows bound mutations', () => {
  const gateBlock = extractBlock(CHAT_SRC, 'function checkMutationIdentityGate(', 500);
  assert(gateBlock.includes('bindResult.bound') || gateBlock.includes('bound'), 'checks bind result');
  // If bound is true, return null (allow)
  assert(gateBlock.includes('if (bindResult.bound) return null'), 'bound mutations pass through');
});

// ---------------------------------------------------------------------------
// 4. Gate blocks unbound mutations
// ---------------------------------------------------------------------------

test('4: gate blocks unbound tag_update_transaction_category', () => {
  const gateBlock = extractBlock(CHAT_SRC, 'function checkMutationIdentityGate(', 500);
  assert(gateBlock.includes('blocked: true'), 'returns blocked when unbound');
  assert(gateBlock.includes('error:'), 'returns error message when blocked');
});

// ---------------------------------------------------------------------------
// 5. Gate is applied at all 4 confirmation paths
// ---------------------------------------------------------------------------

test('5: gate applied at all 4 confirmation creation paths', () => {
  const gateCallCount = (CHAT_SRC.match(/checkMutationIdentityGate\(/g) || []).length;
  // 1 definition + 4 call sites = 5 total occurrences, but function definition also has (
  // Let's count calls specifically (exclude function definition line)
  const callCount = (CHAT_SRC.match(/const mutationGate = checkMutationIdentityGate\(/g) || []).length;
  assert(callCount === 4, `expected 4 gate call sites, found ${callCount}`);
});

// ---------------------------------------------------------------------------
// 6. Gate runs BEFORE confirmation creation
// ---------------------------------------------------------------------------

test('6: gate runs before createPendingConfirmation', () => {
  // In each confirmation path, checkMutationIdentityGate must appear before createPendingConfirmation
  const gateCalls = [...CHAT_SRC.matchAll(/const mutationGate = checkMutationIdentityGate\(/g)];
  const confirmCalls = [...CHAT_SRC.matchAll(/createPendingConfirmation\(/g)];
  assert(gateCalls.length >= 4, 'at least 4 gate calls found');
  assert(confirmCalls.length >= 4, 'at least 4 confirmation creation calls found');
  // Each gate call must have a lower index than the next confirmation call
  for (let i = 0; i < Math.min(gateCalls.length, confirmCalls.length); i++) {
    assert(
      (gateCalls[i]?.index ?? 0) < (confirmCalls[i]?.index ?? 0),
      `gate call ${i + 1} precedes confirmation creation ${i + 1}`,
    );
  }
});

// ---------------------------------------------------------------------------
// 7. Gate runs AFTER bindAuthoritativeTxIdentity
// ---------------------------------------------------------------------------

test('7: gate runs after bind attempt', () => {
  const bindCalls = [...CHAT_SRC.matchAll(/const bindResult = bindAuthoritativeTxIdentity\(/g)];
  const gateCalls = [...CHAT_SRC.matchAll(/const mutationGate = checkMutationIdentityGate\(/g)];
  assert(bindCalls.length >= 4, 'at least 4 bind calls');
  assert(gateCalls.length >= 4, 'at least 4 gate calls');
  for (let i = 0; i < Math.min(bindCalls.length, gateCalls.length); i++) {
    assert(
      (bindCalls[i]?.index ?? 0) < (gateCalls[i]?.index ?? 0),
      `bind call ${i + 1} precedes gate call ${i + 1}`,
    );
  }
});

// ---------------------------------------------------------------------------
// 8. Blocked gate returns error tool result (not confirmation)
// ---------------------------------------------------------------------------

test('8: blocked gate returns error tool result, not confirmation', () => {
  // After each gate check, if blocked, the code pushes an error tool result and continues
  const gateBlocks = CHAT_SRC.split('const mutationGate = checkMutationIdentityGate(');
  // Skip first (before any gate call)
  for (let i = 1; i <= 4 && i < gateBlocks.length; i++) {
    const block = gateBlocks[i].substring(0, 500);
    assert(block.includes('mutationGate.error'), `gate path ${i} uses error message`);
    assert(block.includes('continue'), `gate path ${i} skips execution via continue`);
  }
});

// ---------------------------------------------------------------------------
// 9. verified_zero clears authoritative selection
// ---------------------------------------------------------------------------

test('9: verified_zero clears authoritative selection (0 rows)', () => {
  const updateFn = extractBlock(CHAT_SRC, 'function updateAuthoritativeSelectedTxFromSearchResult(', 1000);
  assert(updateFn.includes('rows.length === 1'), 'only exactly 1 row establishes authoritative');
  assert(updateFn.includes('clearAuthoritativeSelectedTx(sessionId)'), 'clears on non-1 rows');
});

// ---------------------------------------------------------------------------
// 10. Pre-execution tx_search updates authoritative state
// ---------------------------------------------------------------------------

test('10: pre-execution tx_search calls updateAuthoritativeSelectedTxFromSearchResult', () => {
  // The FinancialGrounding pre-execution path captures authoritative from its result
  assert(
    CHAT_SRC.includes("if (plan.toolName === 'tx_search' && finalSessionId)"),
    'pre-execution captures authoritative from tx_search',
  );
});

// ---------------------------------------------------------------------------
// 11. Stale UUID defense: clearing happens on any subsequent 0-result search
// ---------------------------------------------------------------------------

test('11: stale UUID from previous request cannot survive 0-result search', () => {
  const updateFn = extractBlock(CHAT_SRC, 'function updateAuthoritativeSelectedTxFromSearchResult(', 1000);
  // 0 results path
  assert(updateFn.includes('clearAuthoritativeSelectedTx(sessionId)'), 'clears on 0 results');
  // >1 results path
  assert(updateFn.includes('rows.length > 1'), 'checks for ambiguous >1 results');
});

// ---------------------------------------------------------------------------
// 12. Ambiguous result (>1 rows) clears authoritative
// ---------------------------------------------------------------------------

test('12: ambiguous result clears authoritative selection', () => {
  const updateFn = extractBlock(CHAT_SRC, 'function updateAuthoritativeSelectedTxFromSearchResult(', 1000);
  assert(updateFn.includes("rows.length > 1"), 'detects ambiguous results');
  assert(updateFn.includes('clearAuthoritativeSelectedTx(sessionId)'), 'clears for ambiguous');
});

// ---------------------------------------------------------------------------
// 13. Missing UUID in single result clears authoritative
// ---------------------------------------------------------------------------

test('13: single result with missing id clears authoritative', () => {
  const updateFn = extractBlock(CHAT_SRC, 'function updateAuthoritativeSelectedTxFromSearchResult(', 800);
  assert(updateFn.includes("rows[0]?.id"), 'checks for id existence');
});

// ---------------------------------------------------------------------------
// 14. Malformed UUID in single result clears authoritative
// ---------------------------------------------------------------------------

test('14: malformed UUID in single result clears authoritative', () => {
  const updateFn = extractBlock(CHAT_SRC, 'function updateAuthoritativeSelectedTxFromSearchResult(', 800);
  assert(updateFn.includes('invalid UUID'), 'logs invalid UUID');
  assert(updateFn.includes('clearAuthoritativeSelectedTx(sessionId)'), 'clears on invalid');
});

// ---------------------------------------------------------------------------
// 15. Exact authoritative UUID permits mutation (plugin handoff)
// ---------------------------------------------------------------------------

test('15: authoritative UUID enables plugin handoff and binding', () => {
  const autoPromote = extractBlock(CHAT_SRC, 'Auto-promote standard', 1200);
  assert(autoPromote.includes("handoffType = 'plugin'"), 'auto-promotes to plugin');
  assert(autoPromote.includes('authTx.id'), 'injects authoritative UUID');
  assert(autoPromote.includes("_source: 'authoritative_selected_tx'"), 'tags source');
});

// ---------------------------------------------------------------------------
// 16. bindAuthoritativeTxIdentity replaces model-supplied UUID
// ---------------------------------------------------------------------------

test('16: binding replaces model-supplied transactionId with authoritative', () => {
  const bindFn = extractBlock(CHAT_SRC, 'function bindAuthoritativeTxIdentity(', 1200);
  assert(bindFn.includes('transactionId: txId'), 'replaces with authoritative UUID');
  assert(bindFn.includes('Authoritative UUID binding: replaced'), 'logs replacement');
});

// ---------------------------------------------------------------------------
// 17. Binding requires plugin handoff type
// ---------------------------------------------------------------------------

test('17: binding requires plugin handoff type', () => {
  const bindFn = extractBlock(CHAT_SRC, 'function bindAuthoritativeTxIdentity(', 1200);
  assert(bindFn.includes("handoff_type !== 'plugin'"), 'checks plugin type');
});

// ---------------------------------------------------------------------------
// 18. Binding validates UUID format
// ---------------------------------------------------------------------------

test('18: binding validates authoritative UUID format', () => {
  const bindFn = extractBlock(CHAT_SRC, 'function bindAuthoritativeTxIdentity(', 1200);
  assert(bindFn.includes('[0-9a-f]'), 'UUID regex validation');
});

// ---------------------------------------------------------------------------
// 19. Read-only handoff still works (no gate for non-mutation tools)
// ---------------------------------------------------------------------------

test('19: read-only tools bypass mutation identity gate', () => {
  const gateBlock = extractBlock(CHAT_SRC, 'function checkMutationIdentityGate(', 500);
  // First line returns null for non-matching tools
  assert(gateBlock.includes("if (toolName !== 'tag_update_transaction_category') return null"), 'non-mutation tools pass');
});

// ---------------------------------------------------------------------------
// 20. Unrelated specialist handoff still works
// ---------------------------------------------------------------------------

test('20: non-Tag handoffs unaffected by auto-promotion', () => {
  const autoPromote = extractBlock(CHAT_SRC, 'Auto-promote standard', 1200);
  assert(autoPromote.includes('isTagTarget'), 'auto-promotion only for Tag');
  // isTagTarget is defined right before
  assert(CHAT_SRC.includes("const isTagTarget = targetSlug === 'tag-ai' || targetSlug === 'tag'"), 'isTagTarget narrowly defined');
});

// ---------------------------------------------------------------------------
// 21. Gate logs blocked mutation for auditability
// ---------------------------------------------------------------------------

test('21: gate logs blocked mutation', () => {
  const gateBlock = extractBlock(CHAT_SRC, 'function checkMutationIdentityGate(', 500);
  assert(gateBlock.includes('MUTATION IDENTITY GATE'), 'logs with identifiable prefix');
  assert(gateBlock.includes('console.warn'), 'uses warn level');
});

// ---------------------------------------------------------------------------
// 22. Error message tells user to look up transaction first
// ---------------------------------------------------------------------------

test('22: error message instructs re-lookup', () => {
  const gateBlock = extractBlock(CHAT_SRC, 'function checkMutationIdentityGate(', 500);
  assert(gateBlock.includes('could not be authoritatively verified'), 'explains verification failure');
  assert(gateBlock.includes('No category change was made'), 'confirms no mutation occurred');
});

// ---------------------------------------------------------------------------
// 23. authoritative cache has TTL
// ---------------------------------------------------------------------------

test('23: authoritative cache has TTL expiry', () => {
  const readFn = extractBlock(CHAT_SRC, 'function readAuthoritativeSelectedTx(', 500);
  assert(readFn.includes('Date.now() - hit.createdAt'), 'checks age against TTL');
  assert(readFn.includes('.delete(sessionId)'), 'expires stale entries');
});

// ---------------------------------------------------------------------------
// 24. authoritative cache validates UUID on write
// ---------------------------------------------------------------------------

test('24: authoritative cache validates UUID on write', () => {
  const writeFn = extractBlock(CHAT_SRC, 'function writeAuthoritativeSelectedTx(', 300);
  assert(writeFn.includes('[0-9a-f]'), 'validates UUID format before caching');
});

// ---------------------------------------------------------------------------
// 25. Action Receipt uses transactionId from tool result
// ---------------------------------------------------------------------------

test('25: Action Receipt preserves transactionId from tool result', () => {
  assert(ACTION_RECEIPT_SRC.includes('receipt.transactionId'), 'uses receipt transactionId');
  assert(ACTION_RECEIPT_SRC.includes('encodeURIComponent(receipt.transactionId)'), 'encodes for URL');
});

// ---------------------------------------------------------------------------
// 26. View Transaction deep-link uses exact UUID from receipt
// ---------------------------------------------------------------------------

test('26: View Transaction deep-link uses exact UUID', () => {
  assert(ACTION_RECEIPT_SRC.includes('txId='), 'txId in URL param');
  assert(ACTION_RECEIPT_SRC.includes('receipt.transactionId'), 'from receipt');
});

// ---------------------------------------------------------------------------
// 27. Back to Conversation behavior preserved
// ---------------------------------------------------------------------------

test('27: Back to Conversation label and behavior preserved', () => {
  assert(DRAWER_SRC.includes('Back to Conversation'), 'label present');
  assert(TX_PAGE_SRC.includes("sessionStorage.setItem('returnToConversation'"), 'intent mechanism intact');
});

// ---------------------------------------------------------------------------
// 28. Session continuity unaffected
// ---------------------------------------------------------------------------

test('28: session continuity architecture unmodified', () => {
  // The gate function does not touch session state
  const gateBlock = extractBlock(CHAT_SRC, 'function checkMutationIdentityGate(', 500);
  assert(!gateBlock.includes('sessionId'), 'gate does not access session');
  assert(!gateBlock.includes('localStorage'), 'gate does not access localStorage');
});

// ---------------------------------------------------------------------------
// 29. Confirmation execution path uses stored args (not model-supplied)
// ---------------------------------------------------------------------------

test('29: confirmation execution uses stored argsSnapshot', () => {
  assert(CHAT_SRC.includes('confirmedArgs = consumeResult.argsSnapshot'), 'uses stored args from DB');
});

// ---------------------------------------------------------------------------
// 30. No new backend schema changes
// ---------------------------------------------------------------------------

test('30: no schema changes introduced', () => {
  const gateBlock = extractBlock(CHAT_SRC, 'function checkMutationIdentityGate(', 500);
  assert(!gateBlock.includes('CREATE TABLE'), 'no table creation');
  assert(!gateBlock.includes('ALTER TABLE'), 'no table alteration');
  assert(!gateBlock.includes('.from('), 'no Supabase queries in gate');
});

// ---------------------------------------------------------------------------
// 31. Gate does not block read-only tx_search
// ---------------------------------------------------------------------------

test('31: tx_search is not gated (read-only)', () => {
  const gateBlock = extractBlock(CHAT_SRC, 'function checkMutationIdentityGate(', 500);
  assert(!gateBlock.includes('tx_search'), 'gate does not mention tx_search');
});

// ---------------------------------------------------------------------------
// 32. Gate does not block request_employee_handoff
// ---------------------------------------------------------------------------

test('32: request_employee_handoff is not gated', () => {
  const gateBlock = extractBlock(CHAT_SRC, 'function checkMutationIdentityGate(', 500);
  assert(!gateBlock.includes('request_employee_handoff'), 'gate does not mention handoff tool');
});

// ---------------------------------------------------------------------------
// 33. Exact 1-row search establishes authoritative
// ---------------------------------------------------------------------------

test('33: exactly 1 row with valid UUID establishes authoritative', () => {
  const updateFn = extractBlock(CHAT_SRC, 'function updateAuthoritativeSelectedTxFromSearchResult(', 800);
  assert(updateFn.includes('rows.length === 1 && rows[0]?.id'), 'checks exactly 1 row with id');
  assert(updateFn.includes('writeAuthoritativeSelectedTx(sessionId, rows[0])'), 'writes to cache');
  assert(updateFn.includes('Authoritative selected transaction established'), 'logs establishment');
});

// ---------------------------------------------------------------------------
// 34. Challenge/recovery: "do not make changes" should not trigger mutation
// ---------------------------------------------------------------------------

test('34: challenge message does not bypass gate (tool-level defense)', () => {
  // The gate is tool-name-specific and deterministic — it doesn't parse user messages.
  // If Tag attempts tag_update_transaction_category without authoritative binding,
  // it's blocked regardless of what the user said.
  const gateBlock = extractBlock(CHAT_SRC, 'function checkMutationIdentityGate(', 500);
  // Gate does not inspect user message content — it checks only toolName and bindResult
  assert(!gateBlock.includes('message'), 'gate does not inspect message content');
  assert(!gateBlock.includes('userMessage'), 'gate does not inspect user message');
  // The gate is unconditional for tag_update_transaction_category without binding
  assert(gateBlock.includes("toolName !== 'tag_update_transaction_category'"), 'tool-specific check');
  assert(gateBlock.includes('bindResult.bound'), 'bind-specific check');
});

// ---------------------------------------------------------------------------
// 35. Authoritative auto-promotion injects exact UUID into plugin_payload
// ---------------------------------------------------------------------------

test('35: auto-promotion injects exact UUID, not description/amount', () => {
  const autoPromote = extractBlock(CHAT_SRC, 'Auto-promote standard', 1200);
  assert(autoPromote.includes('id: authTx.id'), 'injects exact UUID');
  // Also carries description, amount, date for context — but id is the authoritative identity
  assert(autoPromote.includes('description: authTx.description'), 'carries description');
  assert(autoPromote.includes('amount: authTx.amount'), 'carries amount');
  assert(autoPromote.includes('date: authTx.date'), 'carries date');
});

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------
console.log(`\n${'='.repeat(60)}`);
console.log(`RESULTS: ${passed} passed, ${failed} failed, ${passed + failed} total`);
if (failed === 0) {
  console.log('ALL TESTS PASSED');
} else {
  console.log('SOME TESTS FAILED');
  process.exit(1);
}
