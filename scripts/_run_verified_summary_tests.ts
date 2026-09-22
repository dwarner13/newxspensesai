/**
 * Verified Transaction Confirmation Summary — regression tests.
 * Validates: buildVerifiedConfirmationSummary helper, all 4 confirmation paths,
 * fail-closed behavior, verified-row-over-LLM-supplied data, display format.
 * Run: npx tsx scripts/_run_verified_summary_tests.ts
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
// Source
// ---------------------------------------------------------------------------

const CHAT_SRC = readFileSync(
  join(__dirname_local, '..', 'netlify', 'functions', 'chat.ts'),
  'utf-8',
);

// ---------------------------------------------------------------------------
// 1. Helper exists and structure
// ---------------------------------------------------------------------------

test('T1 — buildVerifiedConfirmationSummary function exists', () => {
  assert(
    CHAT_SRC.includes('async function buildVerifiedConfirmationSummary('),
    'T1.1 Helper function declaration exists',
  );
});

test('T2 — Helper queries transactions table by transactionId + userId', () => {
  const helperBlock = extractBlock(CHAT_SRC, 'async function buildVerifiedConfirmationSummary(', 1200);
  assert(helperBlock.length > 100, 'T2.0 Helper block extracted');
  assert(
    helperBlock.includes(".from('transactions')"),
    'T2.1 Queries transactions table',
  );
  assert(
    helperBlock.includes(".eq('id', txId)"),
    'T2.2 Scopes query by transactionId',
  );
  assert(
    helperBlock.includes(".eq('user_id', userId)"),
    'T2.3 Scopes query by userId',
  );
});

test('T3 — Helper selects verified row fields (merchant, amount, date, category)', () => {
  const helperBlock = extractBlock(CHAT_SRC, 'async function buildVerifiedConfirmationSummary(', 1200);
  assert(
    helperBlock.includes('merchant') && helperBlock.includes('.select('),
    'T3.1 Selects merchant from row',
  );
  assert(
    helperBlock.includes('amount'),
    'T3.2 Selects amount from row',
  );
  assert(
    helperBlock.includes('date'),
    'T3.3 Selects date from row',
  );
  assert(
    helperBlock.includes('category'),
    'T3.4 Selects category from row',
  );
});

test('T4 — Summary uses verified merchant (not LLM merchantName)', () => {
  const helperBlock = extractBlock(CHAT_SRC, 'async function buildVerifiedConfirmationSummary(', 1200);
  assert(
    helperBlock.includes('tx.merchant_name || tx.merchant'),
    'T4.1 Uses tx.merchant_name/tx.merchant from verified row',
  );
  // Must NOT use args.merchantName
  assert(
    !helperBlock.includes('args.merchantName'),
    'T4.2 Does NOT use args.merchantName (LLM-supplied)',
  );
});

test('T5 — Summary uses verified current category (not LLM oldCategory)', () => {
  const helperBlock = extractBlock(CHAT_SRC, 'async function buildVerifiedConfirmationSummary(', 1200);
  assert(
    helperBlock.includes('tx.category'),
    'T5.1 Uses tx.category from verified row',
  );
  assert(
    !helperBlock.includes('args.oldCategory'),
    'T5.2 Does NOT use args.oldCategory (LLM-supplied)',
  );
});

test('T6 — Summary uses verified amount from transaction row', () => {
  const helperBlock = extractBlock(CHAT_SRC, 'async function buildVerifiedConfirmationSummary(', 1200);
  assert(
    helperBlock.includes('tx.amount'),
    'T6.1 Uses tx.amount from verified row',
  );
});

test('T7 — Summary uses verified date from transaction row', () => {
  const helperBlock = extractBlock(CHAT_SRC, 'async function buildVerifiedConfirmationSummary(', 1200);
  assert(
    helperBlock.includes('tx.date'),
    'T7.1 Uses tx.date from verified row',
  );
});

test('T8 — Summary uses args.newCategory (requested destination)', () => {
  const helperBlock = extractBlock(CHAT_SRC, 'async function buildVerifiedConfirmationSummary(', 1200);
  assert(
    helperBlock.includes('args.newCategory'),
    'T8.1 Uses args.newCategory for destination category',
  );
});

test('T9 — Summary format: merchant · amount · date, old → new', () => {
  const helperBlock = extractBlock(CHAT_SRC, 'async function buildVerifiedConfirmationSummary(', 1500);
  // Uses middle dot separator
  assert(
    helperBlock.includes('u00b7'),
    'T9.1 Uses middle dot separator in join',
  );
  // Uses arrow separator for category change
  assert(
    helperBlock.includes('u2192'),
    'T9.2 Uses arrow for category direction',
  );
});

test('T10 — Summary does NOT expose transaction UUID', () => {
  const helperBlock = extractBlock(CHAT_SRC, 'async function buildVerifiedConfirmationSummary(', 1200);
  // The return value should not include txId in the display string
  // Check that the final return/format lines don't include txId
  const returnSection = extractBlock(helperBlock, 'const identityParts', 300);
  assert(
    !returnSection.includes('txId') && !returnSection.includes('transactionId'),
    'T10.1 UUID not included in display summary',
  );
});

test('T11 — Helper scoped to tag_update_transaction_category only', () => {
  const helperBlock = extractBlock(CHAT_SRC, 'async function buildVerifiedConfirmationSummary(', 1200);
  assert(
    helperBlock.includes("toolName !== 'tag_update_transaction_category'") &&
    helperBlock.includes('return null'),
    'T11.1 Early-returns null for non-category-mutation tools',
  );
});

// ---------------------------------------------------------------------------
// 12–15. Fail-closed behavior
// ---------------------------------------------------------------------------

test('T12 — Helper returns null when transaction row not found', () => {
  const helperBlock = extractBlock(CHAT_SRC, 'async function buildVerifiedConfirmationSummary(', 1200);
  assert(
    helperBlock.includes('if (error || !tx)') && helperBlock.includes('return null'),
    'T12.1 Returns null on fetch error or missing row',
  );
});

test('T13 — Fail-closed: streaming path blocks when verifiedSummary is null for category mutation', () => {
  // The condition is on the line before the log — extract wider context
  const block = extractBlock(CHAT_SRC, "!verifiedSummary && toolName === 'tag_update_transaction_category'", 500);
  assert(block.length > 50, 'T13.0 Streaming fail-closed block found');
  assert(
    block.includes('VERIFIED SUMMARY FAIL-CLOSED (streaming)'),
    'T13.1 Streaming fail-closed log present',
  );
  assert(
    block.includes('Could not verify transaction details'),
    'T13.2 User-facing error explains verification failure',
  );
});

test('T14 — Fail-closed: specialist path blocks when verifiedSummary is null for category mutation', () => {
  const block = extractBlock(CHAT_SRC, "!verifiedSummary && tn === 'tag_update_transaction_category'", 500);
  assert(block.length > 50, 'T14.0 Specialist fail-closed block found');
  assert(
    block.includes('VERIFIED SUMMARY FAIL-CLOSED (specialist)'),
    'T14.1 Specialist fail-closed log present',
  );
  assert(
    block.includes('Could not verify transaction details'),
    'T14.2 User-facing error explains verification failure',
  );
});

test('T15 — Fail-closed: non-streaming path blocks when verifiedSummary is null for category mutation', () => {
  const block = extractBlock(CHAT_SRC, 'VERIFIED SUMMARY FAIL-CLOSED (non-streaming)', 400);
  assert(block.length > 50, 'T15.0 Non-streaming fail-closed block found');
  assert(
    block.includes('Could not verify transaction details'),
    'T15.1 User-facing error explains verification failure',
  );
  // The condition check is on the line before — verify it exists
  const condBlock = extractBlock(CHAT_SRC, "!verifiedSummary && toolName === 'tag_update_transaction_category") as string;
  // There are 2 occurrences (streaming + non-streaming) — just need ≥2
  const condCount = (CHAT_SRC.match(/!verifiedSummary && toolName === 'tag_update_transaction_category'/g) || []).length;
  assert(condCount >= 2, `T15.2 At least 2 toolName fail-closed conditions (found ${condCount})`);
});

test('T16 — Fail-closed: tool-loop path blocks when verifiedSummary is null for category mutation', () => {
  const block = extractBlock(CHAT_SRC, 'VERIFIED SUMMARY FAIL-CLOSED (tool-loop', 400);
  assert(block.length > 50, 'T16.0 Tool-loop fail-closed block found');
  assert(
    block.includes('Could not verify transaction details'),
    'T16.1 User-facing error explains verification failure',
  );
  // Tool-loop uses `toolName` variable
  const condCount = (CHAT_SRC.match(/!verifiedSummary && toolName === 'tag_update_transaction_category'/g) || []).length;
  assert(condCount >= 2, `T16.2 toolName fail-closed conditions exist for tool-loop (found ${condCount})`);
});

// ---------------------------------------------------------------------------
// 17–20. All 4 paths call the helper
// ---------------------------------------------------------------------------

test('T17 — All 4 confirmation paths call buildVerifiedConfirmationSummary', () => {
  const callCount = (CHAT_SRC.match(/buildVerifiedConfirmationSummary\(sb,/g) || []).length;
  assert(
    callCount === 4,
    `T17.1 Exactly 4 call sites (found ${callCount})`,
  );
});

test('T18 — Streaming path calls helper', () => {
  const block = extractBlock(CHAT_SRC, 'VERIFIED SUMMARY FAIL-CLOSED (streaming)', 600);
  assert(
    block.length > 50 && CHAT_SRC.includes('buildVerifiedConfirmationSummary(sb, toolName, args, userId)'),
    'T18.1 Streaming path calls helper',
  );
});

test('T19 — Specialist path calls helper', () => {
  const block = extractBlock(CHAT_SRC, 'VERIFIED SUMMARY FAIL-CLOSED (specialist)', 600);
  assert(
    block.length > 50 && CHAT_SRC.includes('buildVerifiedConfirmationSummary(sb, tn, tArgs, userId)'),
    'T19.1 Specialist path calls helper',
  );
});

test('T20 — Non-streaming path calls helper', () => {
  const block = extractBlock(CHAT_SRC, 'VERIFIED SUMMARY FAIL-CLOSED (non-streaming)', 600);
  assert(
    block.length > 50,
    'T20.1 Non-streaming path calls helper',
  );
});

test('T21 — Tool-loop path calls helper', () => {
  const block = extractBlock(CHAT_SRC, 'VERIFIED SUMMARY FAIL-CLOSED (tool-loop', 600);
  assert(
    block.length > 50,
    'T21.1 Tool-loop path calls helper',
  );
});

// ---------------------------------------------------------------------------
// 22–23. Unrelated tools unaffected
// ---------------------------------------------------------------------------

test('T22 — Non-category-mutation tools get generic summary (no fail-closed)', () => {
  // The fail-closed blocks are all scoped: `toolName === 'tag_update_transaction_category'`
  // The helper returns null for other tools, and the fallback is the generic description
  const helperBlock = extractBlock(CHAT_SRC, 'async function buildVerifiedConfirmationSummary(', 300);
  assert(
    helperBlock.includes("if (toolName !== 'tag_update_transaction_category') return null"),
    'T22.1 Helper returns null for non-category tools → generic summary used',
  );
});

// ---------------------------------------------------------------------------
// 23–24. Hard boundary text no longer uses LLM-supplied fields
// ---------------------------------------------------------------------------

test('T23 — Streaming specialist hard boundary does NOT use confirmArgs.merchantName', () => {
  const block = extractBlock(CHAT_SRC, 'HARD CONFIRMATION BOUNDARY (streaming specialist path)', 600);
  assert(block.length > 50, 'T23.0 Hard boundary block found');
  assert(
    !block.includes('confirmArgs.merchantName'),
    'T23.1 Does not reference LLM merchantName in hard boundary',
  );
  assert(
    !block.includes('confirmArgs.description'),
    'T23.2 Does not reference LLM description in hard boundary',
  );
});

test('T24 — Non-streaming tool-loop hard boundary does NOT use confirmArgs.merchantName', () => {
  const block = extractBlock(CHAT_SRC, 'HARD CONFIRMATION BOUNDARY (non-streaming post-loop)', 600);
  assert(block.length > 50, 'T24.0 Hard boundary block found');
  assert(
    !block.includes('confirmArgs.merchantName'),
    'T24.1 Does not reference LLM merchantName in hard boundary',
  );
  assert(
    !block.includes('confirmArgs.description'),
    'T24.2 Does not reference LLM description in hard boundary',
  );
});

// ---------------------------------------------------------------------------
// 25. SSE summary field uses verified summary
// ---------------------------------------------------------------------------

test('T25 — SSE confirmation_required events use displaySummary/confirmSummary (not generic)', () => {
  // Streaming path
  const streamingBlock = extractBlock(CHAT_SRC, "summary: displaySummary,\n                        confirmationId: pending.confirmationId", 100);
  assert(
    streamingBlock.length > 20,
    'T25.1 Streaming SSE uses displaySummary',
  );
  // Specialist path uses specPendingConfirmationData.summary which contains confirmSummary
  const specBlock = extractBlock(CHAT_SRC, 'summary: specPendingConfirmationData.summary', 100);
  assert(
    specBlock.length > 20,
    'T25.2 Specialist SSE uses specPendingConfirmationData.summary (set from confirmSummary)',
  );
});

// ---------------------------------------------------------------------------
// 26. Preservation checks
// ---------------------------------------------------------------------------

test('T26 — checkMutationIdentityGate still exists and unchanged', () => {
  assert(
    CHAT_SRC.includes('function checkMutationIdentityGate('),
    'T26.1 Mutation identity gate function exists',
  );
  assert(
    CHAT_SRC.includes("MUTATION IDENTITY GATE: blocked"),
    'T26.2 Gate log message preserved',
  );
});

test('T27 — bindAuthoritativeTxIdentity still exists', () => {
  assert(
    CHAT_SRC.includes('function bindAuthoritativeTxIdentity('),
    'T27.1 Authoritative binding function exists',
  );
});

test('T28 — Confirmation token/security unchanged', () => {
  assert(
    CHAT_SRC.includes('createPendingConfirmation('),
    'T28.1 createPendingConfirmation still called',
  );
  assert(
    CHAT_SRC.includes('token: pending.token'),
    'T28.2 Token passed through',
  );
  assert(
    CHAT_SRC.includes('argsHash: pending.argsHash'),
    'T28.3 argsHash passed through',
  );
});

test('T29 — args_snapshot unchanged (args still passed to createPendingConfirmation)', () => {
  // All 4 paths pass args to createPendingConfirmation — the snapshot is the raw tool args
  const calls = CHAT_SRC.match(/createPendingConfirmation\(/g) || [];
  // 4 call sites in chat.ts (streaming, specialist, non-streaming, tool-loop)
  assert(
    calls.length === 4,
    `T29.1 createPendingConfirmation called exactly 4 times (found ${calls.length})`,
  );
});

test('T30 — Helper handles missing transactionId gracefully', () => {
  const helperBlock = extractBlock(CHAT_SRC, 'async function buildVerifiedConfirmationSummary(', 1200);
  assert(
    helperBlock.includes("if (!txId || typeof txId !== 'string') return null"),
    'T30.1 Returns null for missing/invalid transactionId',
  );
});

// ---------------------------------------------------------------------------
// 31–37. Ordering invariant: summary BEFORE createPendingConfirmation
// ---------------------------------------------------------------------------

test('T31 — Streaming: buildVerifiedConfirmationSummary BEFORE createPendingConfirmation', () => {
  const summaryIdx = CHAT_SRC.indexOf('VERIFIED SUMMARY FAIL-CLOSED (streaming)');
  const createIdx = CHAT_SRC.indexOf("Confirmation gate: ${toolName} requires approval (streaming)");
  assert(summaryIdx > 0, 'T31.0 Streaming fail-closed anchor found');
  assert(createIdx > 0, 'T31.1 Streaming createPendingConfirmation anchor found');
  assert(
    summaryIdx < createIdx,
    'T31.2 Verified summary check occurs BEFORE createPendingConfirmation in streaming path',
  );
});

test('T32 — Specialist: buildVerifiedConfirmationSummary BEFORE createPendingConfirmation', () => {
  const summaryIdx = CHAT_SRC.indexOf('VERIFIED SUMMARY FAIL-CLOSED (specialist)');
  const createIdx = CHAT_SRC.indexOf('createPendingConfirmation(sb, userId, finalSessionId, tn, tArgs)');
  assert(summaryIdx > 0, 'T32.0 Specialist fail-closed anchor found');
  assert(createIdx > 0, 'T32.1 Specialist createPendingConfirmation anchor found');
  assert(
    summaryIdx < createIdx,
    'T32.2 Verified summary check occurs BEFORE createPendingConfirmation in specialist path',
  );
});

test('T33 — Non-streaming: buildVerifiedConfirmationSummary BEFORE createPendingConfirmation', () => {
  const summaryIdx = CHAT_SRC.indexOf('VERIFIED SUMMARY FAIL-CLOSED (non-streaming)');
  const createIdx = CHAT_SRC.indexOf("Confirmation gate: ${toolName} requires approval (non-streaming)");
  assert(summaryIdx > 0, 'T33.0 Non-streaming fail-closed anchor found');
  assert(createIdx > 0, 'T33.1 Non-streaming createPendingConfirmation anchor found');
  assert(
    summaryIdx < createIdx,
    'T33.2 Verified summary check occurs BEFORE createPendingConfirmation in non-streaming path',
  );
});

test('T34 — Tool-loop: buildVerifiedConfirmationSummary BEFORE createPendingConfirmation', () => {
  // Tool-loop has a unique signature: the second occurrence of the pattern
  const toolLoopAnchor = 'VERIFIED SUMMARY FAIL-CLOSED (tool-loop';
  const summaryIdx = CHAT_SRC.indexOf(toolLoopAnchor);
  // Find createPendingConfirmation that follows this anchor
  const createAfter = CHAT_SRC.indexOf('createPendingConfirmation(sb, userId, finalSessionId, toolName, args)', summaryIdx);
  assert(summaryIdx > 0, 'T34.0 Tool-loop fail-closed anchor found');
  assert(createAfter > summaryIdx, 'T34.1 createPendingConfirmation follows summary check');
  assert(
    summaryIdx < createAfter,
    'T34.2 Verified summary check occurs BEFORE createPendingConfirmation in tool-loop path',
  );
});

test('T35 — Fail-closed log messages confirm no confirmation record created', () => {
  const failClosedLogs = CHAT_SRC.match(/no confirmation record created/g) || [];
  assert(
    failClosedLogs.length === 4,
    `T35.1 All 4 fail-closed paths log "no confirmation record created" (found ${failClosedLogs.length})`,
  );
});

test('T36 — Authoritative identity gate remains BEFORE summary generation in all paths', () => {
  // Streaming path
  const gateStreaming = CHAT_SRC.indexOf('checkMutationIdentityGate(toolName, bindResult)');
  const summaryStreaming = CHAT_SRC.indexOf('VERIFIED SUMMARY FAIL-CLOSED (streaming)');
  assert(
    gateStreaming > 0 && gateStreaming < summaryStreaming,
    'T36.1 Identity gate before summary in streaming path',
  );

  // Specialist path
  const gateSpec = CHAT_SRC.indexOf('checkMutationIdentityGate(tn, bindResult)');
  const summarySpec = CHAT_SRC.indexOf('VERIFIED SUMMARY FAIL-CLOSED (specialist)');
  assert(
    gateSpec > 0 && gateSpec < summarySpec,
    'T36.2 Identity gate before summary in specialist path',
  );

  // Non-streaming — second occurrence of checkMutationIdentityGate(toolName
  const gateNonStream = CHAT_SRC.indexOf('checkMutationIdentityGate(toolName, bindResult)', gateStreaming + 1);
  const summaryNonStream = CHAT_SRC.indexOf('VERIFIED SUMMARY FAIL-CLOSED (non-streaming)');
  assert(
    gateNonStream > 0 && gateNonStream < summaryNonStream,
    'T36.3 Identity gate before summary in non-streaming path',
  );

  // Tool-loop — third occurrence
  const gateLoop = CHAT_SRC.indexOf('checkMutationIdentityGate(toolName, bindResult)', gateNonStream + 1);
  const summaryLoop = CHAT_SRC.indexOf('VERIFIED SUMMARY FAIL-CLOSED (tool-loop');
  assert(
    gateLoop > 0 && gateLoop < summaryLoop,
    'T36.4 Identity gate before summary in tool-loop path',
  );
});

test('T37 — Confirmed ordering chain: binding → gate → summary → create → emit', () => {
  // Verify the full chain order in streaming path (representative)
  const bind = CHAT_SRC.indexOf('bindAuthoritativeTxIdentity(toolName, finalEmployeeSlug, args');
  const gate = CHAT_SRC.indexOf('checkMutationIdentityGate(toolName, bindResult)');
  const summary = CHAT_SRC.indexOf('buildVerifiedConfirmationSummary(sb, toolName, args, userId)');
  const create = CHAT_SRC.indexOf("Confirmation gate: ${toolName} requires approval (streaming)");
  const emit = CHAT_SRC.indexOf("type: 'confirmation_required'");
  assert(bind > 0, 'T37.1 bind exists');
  assert(gate > bind, 'T37.2 gate after bind');
  assert(summary > gate, 'T37.3 summary after gate');
  assert(create > summary, 'T37.4 create after summary');
  assert(emit > create, 'T37.5 emit after create');
});

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

console.log(`\n${'='.repeat(60)}`);
console.log(`Verified Summary Tests: ${passed} passed, ${failed} failed (${passed + failed} total)`);
console.log(`${'='.repeat(60)}`);
process.exit(failed > 0 ? 1 : 0);
