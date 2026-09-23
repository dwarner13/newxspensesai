#!/usr/bin/env tsx
/**
 * Layer 2 Phase 1 + 1B — TransactionResolutionContext regression tests.
 *
 * Tests verify code structure (AST-level grep) for:
 *   - candidate persistence from tx_search
 *   - select_transaction tool behavior
 *   - session/user isolation
 *   - TTL enforcement
 *   - existing context preservation
 *   - cold-start recovery
 *   - Phase 1B: selection protocol, do-not-re-search, false-zero isolation
 *
 * Run: npx tsx scripts/_run_tx_resolution_tests.ts
 */
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { classifyFinancialQuery } from '../src/shared/financial-query-classifier';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CHAT_PATH = path.resolve(__dirname, '../netlify/functions/chat.ts');
const TOOL_INDEX_PATH = path.resolve(__dirname, '../src/agent/tools/index.ts');
const SELECT_TX_PATH = path.resolve(__dirname, '../src/agent/tools/impl/select_transaction.ts');
const GROUNDING_PATH = path.resolve(__dirname, '../src/shared/financial-grounding.ts');

const chat = fs.readFileSync(CHAT_PATH, 'utf8');
const toolIndex = fs.readFileSync(TOOL_INDEX_PATH, 'utf8');
const grounding = fs.readFileSync(GROUNDING_PATH, 'utf8');

let passed = 0;
let failed = 0;

function test(name: string, fn: () => boolean) {
  const ok = fn();
  console.log(`=== ${name} ===`);
  if (ok) { passed++; } else { failed++; console.error(`  ✗ FAILED`); }
  console.log();
}

// ── Type definitions ──

test('T1 — TxResolutionCandidate type defined', () =>
  chat.includes('type TxResolutionCandidate'));

test('T2 — TxResolutionCandidate has id, merchant, amount, date, category', () => {
  const m = chat.match(/type TxResolutionCandidate = \{([^}]+)\}/s);
  if (!m) return false;
  const body = m[1];
  return ['id: string', 'merchant:', 'amount:', 'date:', 'category:'].every(f => body.includes(f));
});

test('T3 — TxResolutionContext type defined', () =>
  chat.includes('type TxResolutionContext'));

test('T4 — TxResolutionContext has candidates, selectedId, selectedIndex, updatedAt', () => {
  const m = chat.match(/type TxResolutionContext = \{([^}]+)\}/s);
  if (!m) return false;
  const body = m[1];
  return ['candidates:', 'selectedId:', 'selectedIndex:', 'updatedAt:'].every(f => body.includes(f));
});

test('T5 — TX_RESOLUTION_TTL_MS = 30 minutes', () =>
  chat.includes('TX_RESOLUTION_TTL_MS = 30 * 60 * 1000'));

// ── Persistence helpers ──

test('T6 — readTxResolution exists and requires sessionId + userId', () => {
  const m = chat.match(/async function readTxResolution\(\s*sb:\s*any,\s*sessionId:\s*string,\s*userId:\s*string/);
  return !!m;
});

test('T7 — readTxResolution scopes query to both session id and user_id', () => {
  const fnMatch = chat.match(/async function readTxResolution[\s\S]*?^}/m);
  if (!fnMatch) return false;
  const fn = fnMatch[0];
  return fn.includes(".eq('id', sessionId)") && fn.includes(".eq('user_id', userId)");
});

test('T8 — readTxResolution enforces TTL', () => {
  const fnMatch = chat.match(/async function readTxResolution[\s\S]*?^}/m);
  if (!fnMatch) return false;
  return fnMatch[0].includes('TX_RESOLUTION_TTL_MS');
});

test('T9 — writeTxResolution exists and requires sessionId + userId', () => {
  const m = chat.match(/async function writeTxResolution\(\s*sb:\s*any,\s*sessionId:\s*string,\s*userId:\s*string/);
  return !!m;
});

test('T10 — writeTxResolution reads existing context before merge', () => {
  const fnStart = chat.indexOf('async function writeTxResolution');
  if (fnStart < 0) return false;
  const fnBody = chat.substring(fnStart, fnStart + 800);
  return fnBody.includes("select('context')") && fnBody.includes('...existing.context') || fnBody.includes('{ ...existing.context }') || fnBody.includes('...existing?.context');
});

test('T11 — writeTxResolution uses update (not insert/replace)', () => {
  const fnStart = chat.indexOf('async function writeTxResolution');
  if (fnStart < 0) return false;
  const fnBody = chat.substring(fnStart, fnStart + 800);
  return fnBody.includes('.update(') && !fnBody.includes('.insert(') && !fnBody.includes('.upsert(');
});

test('T12 — writeTxResolution sets ctx.tx_resolution (merge, not replace)', () => {
  const fnStart = chat.indexOf('async function writeTxResolution');
  if (fnStart < 0) return false;
  const fnBody = chat.substring(fnStart, fnStart + 800);
  return fnBody.includes('ctx.tx_resolution = txr') || fnBody.includes("ctx.tx_resolution");
});

test('T13 — writeTxResolution scopes update to sessionId + userId', () => {
  const fnStart = chat.indexOf('async function writeTxResolution');
  if (fnStart < 0) return false;
  const fnBody = chat.substring(fnStart, fnStart + 800);
  return fnBody.includes(".eq('id', sessionId)") && fnBody.includes(".eq('user_id', userId)");
});

// ── persistTxResolutionFromSearchResult ──

test('T14 — persistTxResolutionFromSearchResult exists', () =>
  chat.includes('async function persistTxResolutionFromSearchResult'));

test('T15 — persist extracts candidates from result.rows', () => {
  const fnStart = chat.indexOf('async function persistTxResolutionFromSearchResult');
  if (fnStart < 0) return false;
  const fnBody = chat.substring(fnStart, fnStart + 1200);
  return fnBody.includes('result.rows') || fnBody.includes("result?.rows");
});

test('T16 — persist validates UUID format before including candidate', () => {
  const fnStart = chat.indexOf('async function persistTxResolutionFromSearchResult');
  if (fnStart < 0) return false;
  const fnBody = chat.substring(fnStart, fnStart + 1200);
  return fnBody.includes('UUID_RE.test');
});

test('T17 — persist caps candidates at tx_search max (200)', () => {
  const fnStart = chat.indexOf('async function persistTxResolutionFromSearchResult');
  if (fnStart < 0) return false;
  const fnBody = chat.substring(fnStart, fnStart + 1500);
  return fnBody.includes('TX_SEARCH_MAX_RESULTS') && fnBody.includes('.slice(0, TX_SEARCH_MAX_RESULTS)');
});

test('T18 — persist stores only id, merchant, amount, date, category per candidate', () => {
  const fnStart = chat.indexOf('async function persistTxResolutionFromSearchResult');
  if (fnStart < 0) return false;
  const fnBody = chat.substring(fnStart, fnStart + 1200);
  return fnBody.includes('id:') && fnBody.includes('merchant:') && fnBody.includes('amount:')
    && fnBody.includes('date:') && fnBody.includes('category:');
});

test('T19 — persist auto-selects when exactly 1 candidate', () => {
  const fnStart = chat.indexOf('async function persistTxResolutionFromSearchResult');
  if (fnStart < 0) return false;
  const fnBody = chat.substring(fnStart, fnStart + 1200);
  return fnBody.includes('candidates.length === 1') && fnBody.includes('selectedId = candidates[0].id');
});

test('T20 — persist does NOT auto-select when multiple candidates', () => {
  const fnStart = chat.indexOf('async function persistTxResolutionFromSearchResult');
  if (fnStart < 0) return false;
  const fnBody = chat.substring(fnStart, fnStart + 1500);
  return fnBody.includes('candidates.length > 1') && fnBody.includes('no auto-selection');
});

test('T21 — persist clears selectedId for 0 candidates', () => {
  const fnStart = chat.indexOf('async function persistTxResolutionFromSearchResult');
  if (fnStart < 0) return false;
  const fnBody = chat.substring(fnStart, fnStart + 1200);
  // selectedId starts as null, which means 0 candidates = cleared
  return fnBody.includes('let selectedId: string | null = null');
});

test('T22 — new search always replaces candidates (no merge)', () => {
  const fnStart = chat.indexOf('async function persistTxResolutionFromSearchResult');
  if (fnStart < 0) return false;
  const fnBody = chat.substring(fnStart, fnStart + 2500);
  // writeTxResolution is called with fresh txr object, not merged with previous
  return fnBody.includes('const txr: TxResolutionContext') && fnBody.includes('await writeTxResolution');
});

// ── Persistence call sites (Phase 1C: all go through guardedPersistTxResolution) ──

test('T23 — guardedPersistTxResolution called at streaming tx_search site', () =>
  chat.includes("guardedPersistTxResolution(sb, finalSessionId, userId, result, 'streaming')"));

test('T24 — guardedPersistTxResolution called at specialist tx_search site', () =>
  chat.includes("guardedPersistTxResolution(sb, finalSessionId, userId, tResult, 'specialist')"));

test('T25 — guardedPersistTxResolution called at FinancialGrounding pre-execution site', () =>
  chat.includes("guardedPersistTxResolution(sb, finalSessionId, userId, preResult, 'grounding')"));

test('T26 — guardedPersistTxResolution called at non-streaming tx_search site', () =>
  chat.includes("guardedPersistTxResolution(sb, finalSessionId, userId, result, 'non-streaming')"));

test('T27 — guardedPersistTxResolution called at tool-loop tx_search site', () =>
  chat.includes("guardedPersistTxResolution(sb, finalSessionId, userId, result, 'tool-loop')"));

test('T28 — false-zero retry does NOT call persistTxResolutionFromSearchResult (Phase 1B)', () =>
  !chat.includes("persistTxResolutionFromSearchResult(sb, finalSessionId, userId, retryResult)"));

test('T29 — all guarded persist calls are fire-and-forget (.catch) — 5 sites', () => {
  const calls = chat.match(/guardedPersistTxResolution\([^)]+\)\.catch/g) || [];
  return calls.length === 5;
});

// ── select_transaction tool ──

test('T30 — select_transaction tool module file exists', () =>
  fs.existsSync(SELECT_TX_PATH));

test('T31 — select_transaction registered in tool index', () =>
  toolIndex.includes("['select_transaction',"));

test('T32 — select_transaction schema has candidateNumber (not index, not transactionId)', () => {
  const selectTx = fs.readFileSync(SELECT_TX_PATH, 'utf8');
  return selectTx.includes('candidateNumber') && !selectTx.includes('transactionId') && !selectTx.includes('uuid');
});

test('T33 — select_transaction candidateNumber is integer with min 1', () => {
  const selectTx = fs.readFileSync(SELECT_TX_PATH, 'utf8');
  return selectTx.includes('.int()') && selectTx.includes('.min(1)');
});

test('T34 — select_transaction candidateNumber has max 200 (matches tx_search)', () => {
  const selectTx = fs.readFileSync(SELECT_TX_PATH, 'utf8');
  return selectTx.includes('.max(200)');
});

test('T35 — select_transaction has no UUID/transactionId in inputSchema', () => {
  const selectTx = fs.readFileSync(SELECT_TX_PATH, 'utf8');
  const schemaMatch = selectTx.match(/inputSchema = z\.object\(\{([^}]+)\}/s);
  if (!schemaMatch) return false;
  const schema = schemaMatch[1];
  return !schema.includes('transactionId') && !schema.includes('uuid') && !schema.includes('id:');
});

test('T36 — select_transaction stub execute returns error (handled by chat.ts)', () => {
  const selectTx = fs.readFileSync(SELECT_TX_PATH, 'utf8');
  return selectTx.includes('must be handled by the chat orchestrator');
});

// ── handleSelectTransaction ──

test('T37 — handleSelectTransaction exists', () =>
  chat.includes('async function handleSelectTransaction'));

test('T38 — handleSelectTransaction reads from readTxResolution', () => {
  const fnStart = chat.indexOf('async function handleSelectTransaction');
  if (fnStart < 0) return false;
  const fnBody = chat.substring(fnStart, fnStart + 1500);
  return fnBody.includes('readTxResolution(sb, sessionId, userId)');
});

test('T39 — handleSelectTransaction converts candidateNumber - 1 to index', () => {
  const fnStart = chat.indexOf('async function handleSelectTransaction');
  if (fnStart < 0) return false;
  const fnBody = chat.substring(fnStart, fnStart + 1500);
  return fnBody.includes('candidateNumber - 1');
});

test('T40 — handleSelectTransaction rejects candidateNumber < 1', () => {
  const fnStart = chat.indexOf('async function handleSelectTransaction');
  if (fnStart < 0) return false;
  const fnBody = chat.substring(fnStart, fnStart + 1500);
  return fnBody.includes('candidateNumber < 1');
});

test('T41 — handleSelectTransaction rejects out-of-range candidateNumber', () => {
  const fnStart = chat.indexOf('async function handleSelectTransaction');
  if (fnStart < 0) return false;
  const fnBody = chat.substring(fnStart, fnStart + 1500);
  return fnBody.includes('idx >= txr.candidates.length');
});

test('T42 — handleSelectTransaction rejects when no candidates', () => {
  const fnStart = chat.indexOf('async function handleSelectTransaction');
  if (fnStart < 0) return false;
  const fnBody = chat.substring(fnStart, fnStart + 1500);
  return fnBody.includes('No transaction search results available');
});

test('T43 — handleSelectTransaction derives UUID from candidates array (not args)', () => {
  const fnStart = chat.indexOf('async function handleSelectTransaction');
  if (fnStart < 0) return false;
  const fnBody = chat.substring(fnStart, fnStart + 1500);
  return fnBody.includes('txr.candidates[idx]') && !fnBody.includes('args.transactionId') && !fnBody.includes('args.id');
});

test('T44 — handleSelectTransaction validates UUID of selected candidate', () => {
  const fnStart = chat.indexOf('async function handleSelectTransaction');
  if (fnStart < 0) return false;
  const fnBody = chat.substring(fnStart, fnStart + 1500);
  return fnBody.includes('UUID_RE.test(candidate.id)');
});

test('T45 — handleSelectTransaction persists via writeTxResolution', () => {
  const fnStart = chat.indexOf('async function handleSelectTransaction');
  if (fnStart < 0) return false;
  const fnBody = chat.substring(fnStart, fnStart + 1500);
  return fnBody.includes('writeTxResolution(sb, sessionId, userId, txr)');
});

test('T46 — handleSelectTransaction sets selectedId and selectedIndex', () => {
  const fnStart = chat.indexOf('async function handleSelectTransaction');
  if (fnStart < 0) return false;
  const fnBody = chat.substring(fnStart, fnStart + 1500);
  return fnBody.includes('txr.selectedId = candidate.id') && fnBody.includes('txr.selectedIndex = idx');
});

// ── Tool interception in chat.ts ──

test('T47 — select_transaction intercepted in streaming path', () =>
  chat.includes("// ── select_transaction interception (streaming) ──"));

test('T48 — select_transaction intercepted in specialist path', () =>
  chat.includes("// ── select_transaction interception (specialist) ──"));

test('T49 — select_transaction intercepted in non-streaming path', () =>
  chat.includes("// ── select_transaction interception (non-streaming) ──"));

test('T50 — select_transaction intercepted in tool-loop path', () =>
  chat.includes("// ── select_transaction interception (tool-loop) ──"));

test('T51 — all interceptions use handleSelectTransaction', () => {
  const intercepts = chat.match(/handleSelectTransaction\(sb, finalSessionId, userId/g) || [];
  return intercepts.length === 4;
});

test('T52 — all interceptions continue after handling (skip executeTool)', () => {
  // Each interception block should have 'continue;' after pushing the result
  const blocks = chat.match(/select_transaction interception[^]*?continue;/g) || [];
  return blocks.length === 4;
});

// ── Prime tool registration ──

test('T53 — select_transaction added to Prime runtime fallback', () =>
  chat.includes("employeeTools.includes('select_transaction')"));

// ── No mutation binding changes (Phase 1 scope) ──

test('T54 — bindAuthoritativeTxIdentity does NOT reference TxResolutionContext', () => {
  const fnStart = chat.indexOf('function bindAuthoritativeTxIdentity');
  if (fnStart < 0) return false;
  const fnBody = chat.substring(fnStart, fnStart + 1500);
  return !fnBody.includes('TxResolution') && !fnBody.includes('readTxResolution') && !fnBody.includes('tx_resolution');
});

test('T55 — checkMutationIdentityGate unchanged', () => {
  const fnStart = chat.indexOf('function checkMutationIdentityGate');
  if (fnStart < 0) return false;
  const fnBody = chat.substring(fnStart, fnStart + 500);
  return !fnBody.includes('TxResolution') && !fnBody.includes('tx_resolution');
});

test('T56 — request_employee_handoff auto-promote unchanged (no tx_resolution reference)', () => {
  // The auto-promote section should still reference authoritativeSelectedTxCache, not tx_resolution
  const autoPromoteIdx = chat.indexOf('Auto-promoted standard');
  if (autoPromoteIdx < 0) return false;
  const nearby = chat.substring(autoPromoteIdx - 600, autoPromoteIdx + 200);
  return nearby.includes('readAuthoritativeSelectedTx') && !nearby.includes('readTxResolution');
});

// ── UUID regex shared constant ──

test('T57 — UUID_RE constant defined once and shared', () =>
  chat.includes('const UUID_RE'));

// ── Cold-start safety ──

test('T58 — readTxResolution queries DB (not in-memory cache)', () => {
  const fnStart = chat.indexOf('async function readTxResolution');
  if (fnStart < 0) return false;
  const fnBody = chat.substring(fnStart, fnStart + 600);
  return fnBody.includes("from('chat_sessions')") && !fnBody.includes('Map') && !fnBody.includes('cache');
});

test('T59 — writeTxResolution writes to DB (not in-memory cache)', () => {
  const fnStart = chat.indexOf('async function writeTxResolution');
  if (fnStart < 0) return false;
  const fnBody = chat.substring(fnStart, fnStart + 800);
  return fnBody.includes("from('chat_sessions')") && !fnBody.includes('Map') && !fnBody.includes('cache');
});

test('T60 — handleSelectTransaction uses readTxResolution (DB) not in-memory', () => {
  const fnStart = chat.indexOf('async function handleSelectTransaction');
  if (fnStart < 0) return false;
  const fnBody = chat.substring(fnStart, fnStart + 1500);
  return fnBody.includes('readTxResolution') && !fnBody.includes('authoritativeSelectedTxCache');
});

// ── Existing context safety ──

test('T61 — writeTxResolution preserves existing context keys', () => {
  const fnStart = chat.indexOf('async function writeTxResolution');
  if (fnStart < 0) return false;
  const fnBody = chat.substring(fnStart, fnStart + 800);
  // Must spread existing context, not replace
  return fnBody.includes('...existing') || fnBody.includes('{ ...existing.context }') || fnBody.includes('...existing?.context');
});

test('T62 — writeTxResolution only sets tx_resolution key', () => {
  const fnStart = chat.indexOf('async function writeTxResolution');
  if (fnStart < 0) return false;
  const fnBody = chat.substring(fnStart, fnStart + 800);
  // Should assign ctx.tx_resolution, not overwrite workspace or other keys
  return fnBody.includes('ctx.tx_resolution') && !fnBody.includes('ctx.workspace');
});

// ── Existing authoritative cache untouched ──

test('T63 — authoritativeSelectedTxCache still exists', () =>
  chat.includes('const authoritativeSelectedTxCache = new Map'));

test('T64 — updateAuthoritativeSelectedTxFromSearchResult still called at all original sites', () => {
  const calls = chat.match(/updateAuthoritativeSelectedTxFromSearchResult\(/g) || [];
  return calls.length >= 7; // 1 definition + 6 call sites
});

// ── Error handling ──

test('T65 — readTxResolution has try/catch', () => {
  const fnStart = chat.indexOf('async function readTxResolution');
  if (fnStart < 0) return false;
  const fnBody = chat.substring(fnStart, fnStart + 900);
  return fnBody.includes('try {') && fnBody.includes('catch');
});

test('T66 — writeTxResolution has try/catch', () => {
  const fnStart = chat.indexOf('async function writeTxResolution');
  if (fnStart < 0) return false;
  const fnBody = chat.substring(fnStart, fnStart + 1200);
  return fnBody.includes('try {') && fnBody.includes('catch');
});

test('T67 — handleSelectTransaction validates non-integer candidateNumber', () => {
  const fnStart = chat.indexOf('async function handleSelectTransaction');
  if (fnStart < 0) return false;
  const fnBody = chat.substring(fnStart, fnStart + 1500);
  return fnBody.includes('Number.isInteger(candidateNumber)');
});

// ── select_transaction description ──

test('T68 — select_transaction description mentions candidateNumber not index', () =>
  toolIndex.includes('candidateNumber') && toolIndex.includes('1-based'));

test('T69 — select_transaction description says do NOT pass a transaction ID', () =>
  toolIndex.includes('do NOT pass a transaction ID'));

// ── updatedAt always set ──

test('T70 — persistTxResolutionFromSearchResult sets updatedAt', () => {
  const fnStart = chat.indexOf('async function persistTxResolutionFromSearchResult');
  if (fnStart < 0) return false;
  const fnBody = chat.substring(fnStart, fnStart + 2500);
  return fnBody.includes('updatedAt: Date.now()');
});

test('T71 — handleSelectTransaction updates updatedAt on selection', () => {
  const fnStart = chat.indexOf('async function handleSelectTransaction');
  if (fnStart < 0) return false;
  const fnBody = chat.substring(fnStart, fnStart + 1500);
  return fnBody.includes('txr.updatedAt = Date.now()');
});

// ── Fix 1: Failed persistence must fail closed ──

test('T72 — handleSelectTransaction checks writeTxResolution return value', () => {
  const fnStart = chat.indexOf('async function handleSelectTransaction');
  if (fnStart < 0) return false;
  const fnBody = chat.substring(fnStart, fnStart + 1800);
  return fnBody.includes('const persisted = await writeTxResolution') || fnBody.includes('const persisted=await writeTxResolution');
});

test('T73 — handleSelectTransaction returns selected:false when persistence fails', () => {
  const fnStart = chat.indexOf('async function handleSelectTransaction');
  if (fnStart < 0) return false;
  const fnBody = chat.substring(fnStart, fnStart + 1800);
  return fnBody.includes('if (!persisted)') && fnBody.includes("selected: false, error: 'Could not persist transaction selection");
});

test('T74 — handleSelectTransaction only returns selected:true after persistence succeeds', () => {
  const fnStart = chat.indexOf('async function handleSelectTransaction');
  if (fnStart < 0) return false;
  const fnBody = chat.substring(fnStart, fnStart + 1800);
  // The selected:true return must come AFTER the persisted check
  const persistedCheckIdx = fnBody.indexOf('if (!persisted)');
  const selectedTrueIdx = fnBody.indexOf('selected: true');
  return persistedCheckIdx > 0 && selectedTrueIdx > persistedCheckIdx;
});

test('T75 — failed persistence logs warning', () => {
  const fnStart = chat.indexOf('async function handleSelectTransaction');
  if (fnStart < 0) return false;
  const fnBody = chat.substring(fnStart, fnStart + 1800);
  return fnBody.includes('selection persistence FAILED') && fnBody.includes('failing closed');
});

// ── Fix 2: Candidate cap matches tx_search max ──

test('T76 — TX_SEARCH_MAX_RESULTS = 200 in persist function', () => {
  const fnStart = chat.indexOf('async function persistTxResolutionFromSearchResult');
  if (fnStart < 0) return false;
  const fnBody = chat.substring(fnStart, fnStart + 1500);
  return fnBody.includes('TX_SEARCH_MAX_RESULTS = 200');
});

test('T77 — select_transaction schema max matches tx_search max (200)', () => {
  const selectTx = fs.readFileSync(SELECT_TX_PATH, 'utf8');
  return selectTx.includes('.max(200)');
});

test('T78 — candidateNumber 30 would select candidates[29] (1-based)', () => {
  // Structural: handleSelectTransaction uses candidateNumber - 1 as index
  const fnStart = chat.indexOf('async function handleSelectTransaction');
  if (fnStart < 0) return false;
  const fnBody = chat.substring(fnStart, fnStart + 1800);
  return fnBody.includes('const idx = candidateNumber - 1');
});

test('T79 — candidateNumber at max (200) would select candidates[199]', () => {
  // Schema allows max 200, and idx = 200 - 1 = 199 — within array bounds if 200 candidates exist
  const selectTx = fs.readFileSync(SELECT_TX_PATH, 'utf8');
  return selectTx.includes('.max(200)') && chat.includes('const idx = candidateNumber - 1');
});

test('T80 — candidateNumber above max (201) rejected by schema validation', () => {
  const selectTx = fs.readFileSync(SELECT_TX_PATH, 'utf8');
  // .max(200) means 201 fails zod validation before reaching handleSelectTransaction
  return selectTx.includes('.max(200)');
});

test('T81 — UUID is derived server-side from persisted candidates (not args)', () => {
  // Re-verify: handleSelectTransaction reads from txr.candidates[idx], not from args
  const fnStart = chat.indexOf('async function handleSelectTransaction');
  if (fnStart < 0) return false;
  const fnBody = chat.substring(fnStart, fnStart + 1800);
  return fnBody.includes('const candidate = txr.candidates[idx]')
    && fnBody.includes('txr.selectedId = candidate.id')
    && !fnBody.includes('args.id')
    && !fnBody.includes('args.transactionId');
});

test('T82 — candidate cap and schema max are aligned (both 200)', () => {
  const selectTx = fs.readFileSync(SELECT_TX_PATH, 'utf8');
  const schemaMax200 = selectTx.includes('.max(200)');
  const fnStart = chat.indexOf('async function persistTxResolutionFromSearchResult');
  if (fnStart < 0) return false;
  const fnBody = chat.substring(fnStart, fnStart + 1500);
  const capMax200 = fnBody.includes('TX_SEARCH_MAX_RESULTS = 200');
  return schemaMax200 && capMax200;
});

// ── Phase 1B: select_transaction tool description covers all reference types ──

test('T83 — tool description requires selection for ordinal reference', () =>
  toolIndex.includes('by ordinal ("the second one")'));

test('T84 — tool description requires selection for name reference', () =>
  toolIndex.includes('by name ("the Costco gas one")'));

test('T85 — tool description requires selection for attribute reference', () =>
  toolIndex.includes('by attribute ("the largest one")'));

test('T86 — tool description requires selection for context reference', () =>
  toolIndex.includes('by conversational context ("the one we just talked about")'));

test('T87 — tool description requires selection for elimination/correction reference', () =>
  toolIndex.includes('by elimination/correction ("no, the other one")'));

test('T88 — tool description says MUST call (not optional)', () =>
  toolIndex.includes('You MUST call this tool whenever'));

test('T89 — tool description says call BEFORE answering', () =>
  toolIndex.includes('Call select_transaction BEFORE providing your detailed answer'));

test('T90 — select_transaction remains 1-based in description', () =>
  toolIndex.includes('position number (1-based)'));

// ── Phase 1B: TRANSACTION SELECTION PROTOCOL in Prime system messages ──

test('T91 — TRANSACTION SELECTION PROTOCOL injected for Prime', () =>
  chat.includes('TRANSACTION SELECTION PROTOCOL:'));

test('T92 — protocol requires MUST call select_transaction', () => {
  const protocolIdx = chat.indexOf('TRANSACTION SELECTION PROTOCOL:');
  if (protocolIdx < 0) return false;
  const block = chat.substring(protocolIdx, protocolIdx + 800);
  return block.includes('you MUST call select_transaction({ candidateNumber })');
});

test('T93 — protocol covers ordinal, name, attribute, context, elimination', () => {
  const protocolIdx = chat.indexOf('TRANSACTION SELECTION PROTOCOL:');
  if (protocolIdx < 0) return false;
  const block = chat.substring(protocolIdx, protocolIdx + 800);
  return block.includes('by ordinal') && block.includes('by name')
    && block.includes('by attribute') && block.includes('by conversational context')
    && block.includes('by elimination');
});

test('T94 — protocol requires selection even when answer known from history', () => {
  const protocolIdx = chat.indexOf('TRANSACTION SELECTION PROTOCOL:');
  if (protocolIdx < 0) return false;
  const block = chat.substring(protocolIdx, protocolIdx + 800);
  return block.includes('even if you already know which transaction the user means');
});

test('T95 — protocol requires selection BEFORE answering', () => {
  const protocolIdx = chat.indexOf('TRANSACTION SELECTION PROTOCOL:');
  if (protocolIdx < 0) return false;
  const block = chat.substring(protocolIdx, protocolIdx + 800);
  return block.includes('BEFORE you answer about that transaction');
});

// ── Phase 1B: Do-not-re-search directive in evidence message ──

test('T96 — financial-grounding adds do-not-re-search directive for tx_search evidence', () =>
  grounding.includes("Do NOT call tx_search for this query"));

test('T97 — do-not-re-search is unconditional (not gated on resolvedCategory)', () => {
  // The directive must be inside a `if (toolName === 'tx_search')` block,
  // NOT inside the `if (classification.resolvedCategory)` block.
  const resolvedCatIdx = grounding.indexOf("if (classification.resolvedCategory)");
  const doNotResearchIdx = grounding.indexOf("Do NOT call tx_search for this query");
  if (resolvedCatIdx < 0 || doNotResearchIdx < 0) return false;
  // The do-not-re-search must appear AFTER the resolvedCategory block closes
  return doNotResearchIdx > resolvedCatIdx;
});

test('T98 — do-not-re-search allows different queries', () =>
  grounding.includes('You may call tx_search only if the user asks a DIFFERENT question'));

test('T99 — do-not-re-search says data is authoritative', () =>
  grounding.includes('the data is authoritative'));

// ── Phase 1B: False-zero retry does not replace candidates ──

test('T100 — false-zero retry still updates Layer 1 in-memory cache', () => {
  // updateAuthoritativeSelectedTxFromSearchResult should still be called at retry
  const retryComment = chat.indexOf('false-zero retry tx_search');
  if (retryComment < 0) return false;
  const nearby = chat.substring(retryComment, retryComment + 500);
  return nearby.includes('updateAuthoritativeSelectedTxFromSearchResult');
});

test('T101 — false-zero retry does NOT persist to Layer 2 DB candidates', () => {
  const retryComment = chat.indexOf('false-zero retry tx_search');
  if (retryComment < 0) return false;
  const nearby = chat.substring(retryComment, retryComment + 300);
  return !nearby.includes('persistTxResolutionFromSearchResult');
});

test('T102 — false-zero retry comment explains why candidates are not replaced', () => {
  const retryComment = chat.indexOf('false-zero retry is a re-verification');
  return retryComment >= 0;
});

// ── Phase 1B: Layer 1 mutation safety unchanged ──

test('T103 — buildVerifiedConfirmationSummary not modified (still references transaction)', () =>
  chat.includes('function buildVerifiedConfirmationSummary'));

test('T104 — createPendingConfirmation still imported and used', () =>
  chat.includes('createPendingConfirmation') && chat.includes('confirmation_required'));

// ── Phase 1C: Deterministic request-scoped candidate ownership ──

test('T105 — txResolutionLockedThisTurn declared at request scope', () =>
  chat.includes('let txResolutionLockedThisTurn = false'));

test('T106 — guardedPersistTxResolution function defined', () =>
  chat.includes('async function guardedPersistTxResolution'));

test('T107 — guardedPersistTxResolution checks lock before persisting', () => {
  const fnStart = chat.indexOf('async function guardedPersistTxResolution');
  if (fnStart < 0) return false;
  const fnBody = chat.substring(fnStart, fnStart + 600);
  return fnBody.includes('if (txResolutionLockedThisTurn)') && fnBody.includes('skipping candidate replacement');
});

test('T108 — guardedPersistTxResolution sets lock after successful persist', () => {
  const fnStart = chat.indexOf('async function guardedPersistTxResolution');
  if (fnStart < 0) return false;
  const fnBody = chat.substring(fnStart, fnStart + 600);
  return fnBody.includes('txResolutionLockedThisTurn = true');
});

test('T109 — guardedPersistTxResolution delegates to persistTxResolutionFromSearchResult', () => {
  const fnStart = chat.indexOf('async function guardedPersistTxResolution');
  if (fnStart < 0) return false;
  const fnBody = chat.substring(fnStart, fnStart + 600);
  return fnBody.includes('await persistTxResolutionFromSearchResult(');
});

test('T110 — guardedPersistTxResolution accepts source parameter for logging', () => {
  const fnStart = chat.indexOf('async function guardedPersistTxResolution');
  if (fnStart < 0) return false;
  const fnBody = chat.substring(fnStart, fnStart + 200);
  return fnBody.includes('source: string');
});

test('T111 — all 5 call sites use guardedPersistTxResolution (not direct)', () => {
  const guardedCalls = chat.match(/guardedPersistTxResolution\(/g) || [];
  // 1 definition + 5 call sites = 6 total occurrences
  return guardedCalls.length === 6;
});

test('T112 — no direct persistTxResolutionFromSearchResult calls remain at call sites', () => {
  // The only direct calls should be: 1 function definition + 1 call inside guardedPersistTxResolution
  const directCalls = chat.match(/persistTxResolutionFromSearchResult\(/g) || [];
  return directCalls.length === 2; // definition + one call inside guarded wrapper
});

test('T113 — streaming select_transaction sets lock on success', () => {
  const idx = chat.indexOf('select_transaction interception (streaming)');
  if (idx < 0) return false;
  const block = chat.substring(idx, idx + 400);
  return block.includes('if (selResult.selected) txResolutionLockedThisTurn = true');
});

test('T114 — specialist select_transaction sets lock on success', () => {
  const idx = chat.indexOf('select_transaction interception (specialist)');
  if (idx < 0) return false;
  const block = chat.substring(idx, idx + 400);
  return block.includes('if (selResult.selected) txResolutionLockedThisTurn = true');
});

test('T115 — non-streaming select_transaction sets lock on success', () => {
  const idx = chat.indexOf('select_transaction interception (non-streaming)');
  if (idx < 0) return false;
  const block = chat.substring(idx, idx + 400);
  return block.includes('if (selResult.selected) txResolutionLockedThisTurn = true');
});

test('T116 — tool-loop select_transaction sets lock on success', () => {
  const idx = chat.indexOf('select_transaction interception (tool-loop)');
  if (idx < 0) return false;
  const block = chat.substring(idx, idx + 400);
  return block.includes('if (selResult.selected) txResolutionLockedThisTurn = true');
});

test('T117 — lock only set on selResult.selected (failed selection does not lock)', () => {
  // All 4 sites use `if (selResult.selected)` — not unconditional
  const lockSites = chat.match(/if \(selResult\.selected\) txResolutionLockedThisTurn = true/g) || [];
  return lockSites.length === 4;
});

test('T118 — guardedPersistTxResolution lock only set AFTER persist call (not before)', () => {
  const fnStart = chat.indexOf('async function guardedPersistTxResolution');
  if (fnStart < 0) return false;
  const fnBody = chat.substring(fnStart, fnStart + 600);
  const persistIdx = fnBody.indexOf('await persistTxResolutionFromSearchResult(');
  const lockIdx = fnBody.indexOf('txResolutionLockedThisTurn = true');
  return persistIdx > 0 && lockIdx > persistIdx;
});

test('T119 — supplemental tx_search still executes (only Layer 2 persist skipped)', () => {
  // updateAuthoritativeSelectedTxFromSearchResult is NOT guarded — still called at all sites
  const layer1Calls = chat.match(/updateAuthoritativeSelectedTxFromSearchResult\(/g) || [];
  // 1 definition + 6 call sites (streaming, specialist, grounding, non-streaming, tool-loop, retry)
  return layer1Calls.length >= 7;
});

test('T120 — false-zero retry still excluded from Layer 2 (Phase 1B preserved)', () =>
  !chat.includes("guardedPersistTxResolution") || // if we renamed, check retry doesn't use it
  !chat.includes("persistTxResolutionFromSearchResult(sb, finalSessionId, userId, retryResult)"));

test('T121 — lock is request-scoped (declared inside handler, not module-level)', () => {
  // The lock declaration must appear AFTER the streaming/non-streaming fork area,
  // not at the top of the file near module-level constants
  const lockIdx = chat.indexOf('let txResolutionLockedThisTurn = false');
  const guardedIdx = chat.indexOf('async function guardedPersistTxResolution');
  // Both must exist and the guarded function must follow the lock declaration
  return lockIdx > 0 && guardedIdx > lockIdx && (guardedIdx - lockIdx) < 500;
});

test('T122 — existing select_transaction 1-based behavior preserved', () => {
  const selectTx = fs.readFileSync(SELECT_TX_PATH, 'utf8');
  return selectTx.includes('.min(1)') && selectTx.includes('.max(200)');
});

// ── Phase 1D: Preserve candidate frame across follow-up references ──

test('T123 — existingTxResolution read at request start', () =>
  chat.includes('existingTxResolution = await readTxResolution(sb, finalSessionId, userId)'));

test('T124 — hasExistingCandidates derived from existingTxResolution', () =>
  chat.includes('const hasExistingCandidates = !!(existingTxResolution?.candidates?.length)'));

test('T125 — existing candidates injected into system prompt', () =>
  chat.includes('ACTIVE TRANSACTION CANDIDATES (from your previous search)'));

test('T126 — candidate prompt includes candidateNumber guidance', () =>
  chat.includes('call select_transaction with the correct candidateNumber'));

test('T127 — candidate prompt tells model NOT to re-fetch existing candidates', () =>
  chat.includes('Do NOT call tx_search to re-fetch these same transactions'));

test('T128 — candidate prompt tells model tx_search allowed for genuinely different queries', () =>
  chat.includes('Only call tx_search if the user asks for a genuinely DIFFERENT search'));

test('T129 — grounding pre-exec tx_search gated by Phase 1D', () =>
  chat.includes("phase1dSuppressed = shouldPreserveCandidates && plan.toolName === 'tx_search'"));

test('T130 — grounding pre-exec condition includes !phase1dSuppressed', () =>
  chat.includes('!phase1dSuppressed'));

test('T131 — tax_summary pre-exec NOT gated by Phase 1D', () => {
  // phase1dSuppressed is only true for tx_search, not tax_summary
  return chat.includes("plan.toolName === 'tx_search'") &&
         !chat.includes("plan.toolName === 'tax_summary'") ||
         // Alternative: check that the suppression variable only mentions tx_search
         chat.includes("shouldPreserveCandidates && plan.toolName === 'tx_search'");
});

test('T132 — forced tx_search (streaming) gated by !shouldPreserveCandidates', () => {
  // Find the streaming forced tx_search block and verify shouldPreserveCandidates gate
  const streamingBlock = chat.substring(
    chat.indexOf('// Guardrail: enforce tx_search for transaction intents when model skips tools.'),
    chat.indexOf('// Guardrail: enforce tx_search for transaction intents when model skips tools.') + 1000,
  );
  return streamingBlock.includes('!shouldPreserveCandidates');
});

test('T133 — forced tx_search (non-streaming) gated by !shouldPreserveCandidates', () => {
  // Find the non-streaming forced tx_search block (second occurrence)
  const firstIdx = chat.indexOf('// Guardrail: enforce tx_search for transaction intents when model skips tools.');
  const secondIdx = chat.indexOf('// Guardrail: enforce tx_search for transaction intents when model skips tools.', firstIdx + 1);
  if (secondIdx < 0) return false;
  const nsBlock = chat.substring(secondIdx, secondIdx + 1500);
  return nsBlock.includes('!shouldPreserveCandidates');
});

test('T134 — Phase 1D suppression log for grounding pre-exec', () =>
  chat.includes('Phase1D: skipping tx_search pre-exec'));

test('T135 — Phase 1D suppression log for forced tx_search', () =>
  chat.includes('Phase1D: skipping forced tx_search'));

test('T136 — existing candidate injection gated on hasExistingCandidates', () =>
  chat.includes('if (hasExistingCandidates && existingTxResolution)'));

test('T137 — selectedId shown in candidate prompt when present', () =>
  chat.includes('existingTxResolution.selectedId'));

test('T138 — Phase 1D read happens BEFORE streaming/non-streaming fork', () => {
  const readIdx = chat.indexOf('existingTxResolution = await readTxResolution');
  const streamForkIdx = chat.indexOf('if (stream) {', readIdx > 0 ? readIdx : 0);
  return readIdx > 0 && streamForkIdx > readIdx;
});

test('T139 — Phase 1D read is scoped to isPrime', () => {
  // The readTxResolution call should be inside an isPrime check
  const blockStart = chat.lastIndexOf('if (isPrime', chat.indexOf('existingTxResolution = await readTxResolution'));
  const readIdx = chat.indexOf('existingTxResolution = await readTxResolution');
  return blockStart > 0 && (readIdx - blockStart) < 200;
});

test('T140 — TTL still enforced via readTxResolution (expired candidates = null)', () => {
  // readTxResolution returns null when TTL expired, so hasExistingCandidates = false
  return chat.includes('TX_RESOLUTION_TTL_MS') && chat.includes('return null');
});

// ── Phase 1D: Regression test for exact live Costco failure ──

test('T141 — REGRESSION: candidate frame preserved across follow-up reference (Costco scenario)', () => {
  // Simulate the exact live failure:
  // Turn 1: tx_search → 2 Costco candidates persisted
  // Turn 2: "Tell me more about the second one" → existing candidates must be preserved
  //
  // The fix ensures:
  // 1. existingTxResolution is read at request start
  // 2. hasExistingCandidates = true (2 candidates)
  // 3. Grounding pre-exec tx_search SKIPPED (phase1dSuppressed = true)
  // 4. Forced tx_search SKIPPED (!hasExistingCandidates fails)
  // 5. Model gets existing candidates in prompt
  // 6. Model calls select_transaction(2) against original frame
  // 7. Selected candidate = original COSTCO GAS, NOT new COSTCO $18.34
  //
  // Verify the code path exists:
  // a. existingTxResolution read + hasExistingCandidates flag
  const hasRead = chat.includes('existingTxResolution = await readTxResolution');
  const hasFlag = chat.includes('const hasExistingCandidates');
  // b. pre-exec gate (uses shouldPreserveCandidates since Phase 1D new-search fix)
  const hasPreExecGate = chat.includes("shouldPreserveCandidates && plan.toolName === 'tx_search'");
  // c. forced tx_search gate (uses shouldPreserveCandidates since Phase 1D new-search fix)
  const hasForcedGate = chat.includes('!shouldPreserveCandidates');
  // d. candidate injection
  const hasInjection = chat.includes('ACTIVE TRANSACTION CANDIDATES');
  // e. select_transaction still works (uses readTxResolution from DB, not new search)
  const selectReadsDB = chat.includes('readTxResolution(sb, sessionId, userId)');
  return hasRead && hasFlag && hasPreExecGate && hasForcedGate && hasInjection && selectReadsDB;
});

test('T142 — "Which transaction are we talking about?" preserves selectedId', () => {
  // When selectedId exists and user asks about it, the candidate frame
  // is preserved (hasExistingCandidates = true suppresses re-search).
  // The model answers from injected context without new tx_search.
  return chat.includes('Currently selected:') && chat.includes('existingTxResolution.selectedId');
});

test('T143 — "the largest one" resolves against existing candidates', () => {
  // Same mechanism: existing candidates in prompt, model calls select_transaction.
  // No regex needed — the prompt tells the model to use select_transaction.
  return chat.includes('call select_transaction with the correct candidateNumber');
});

test('T144 — "Now show me Walmart transactions" allows new search', () => {
  // When model calls tx_search (not select_transaction), the tool loop
  // executes normally — guardedPersistTxResolution replaces candidates.
  // The prompt says: "Only call tx_search if the user asks for a genuinely
  // DIFFERENT search". Model-initiated tx_search is NOT blocked.
  // Verify: guardedPersistTxResolution still called for tool-loop tx_search
  const streamingPersist = chat.includes("guardedPersistTxResolution(sb, finalSessionId, userId, result, 'streaming')");
  const nonStreamingPersist = chat.includes("guardedPersistTxResolution(sb, finalSessionId, userId, result, 'non-streaming')");
  return streamingPersist || nonStreamingPersist;
});

test('T145 — Phase 1C intra-request ownership still works', () => {
  // txResolutionLockedThisTurn still declared and used
  return chat.includes('let txResolutionLockedThisTurn = false') &&
         chat.includes('txResolutionLockedThisTurn = true');
});

test('T146 — missing tx_resolution falls back to normal search', () => {
  // readTxResolution returns null when no candidates → hasExistingCandidates = false
  // → all gates pass through → normal forced/pre-exec tx_search runs
  return chat.includes('const hasExistingCandidates = !!(existingTxResolution?.candidates?.length)');
});

test('T147 — select_transaction still accepts candidateNumber only', () => {
  const selectTx = fs.readFileSync(SELECT_TX_PATH, 'utf8');
  return selectTx.includes('candidateNumber') && !selectTx.includes('transactionId');
});

test('T148 — model cannot provide UUID via select_transaction', () => {
  const selectTx = fs.readFileSync(SELECT_TX_PATH, 'utf8');
  // inputSchema only has candidateNumber — no transactionId, uuid, or id fields
  const m = selectTx.match(/inputSchema = z\.object\(\{([^}]+)\}/s);
  if (!m) return false;
  const body = m[1];
  // Count property definitions: only candidateNumber should appear as a z.* schema key
  const propMatches = body.match(/\w+:\s+z\b/g) || [];
  return propMatches.length === 1 && propMatches[0].startsWith('candidateNumber');
});

test('T149 — failed selection remains fail-closed', () =>
  chat.includes("'Could not persist transaction selection. Please try again.'"));

// ── Phase 1D: Scope & TDZ regression tests ──────────────────────────────────
// These tests verify that hasExistingCandidates and existingTxResolution are
// declared BEFORE every reference in the source, and at a scope level that
// encloses both streaming and non-streaming paths.

test('T150 — hasExistingCandidates declared before first reference (TDZ safety)', () => {
  const lines = chat.split('\n');
  let declLine = -1;
  let firstRefLine = -1;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (declLine === -1 && /const\s+hasExistingCandidates\s*=/.test(line)) {
      declLine = i + 1;
    }
    if (declLine === -1 && firstRefLine === -1 && /hasExistingCandidates/.test(line) && !/const\s+hasExistingCandidates/.test(line) && !/\/\//.test(line.split('hasExistingCandidates')[0])) {
      firstRefLine = i + 1;
    }
  }
  if (declLine === -1) { console.error('  declaration not found'); return false; }
  if (firstRefLine !== -1 && firstRefLine < declLine) {
    console.error(`  TDZ: first reference at line ${firstRefLine}, declaration at line ${declLine}`);
    return false;
  }
  return true;
});

test('T151 — existingTxResolution declared before first reference (TDZ safety)', () => {
  const lines = chat.split('\n');
  let declLine = -1;
  let firstRefLine = -1;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (declLine === -1 && /let\s+existingTxResolution\s*[:=]/.test(line)) {
      declLine = i + 1;
    }
    if (declLine === -1 && firstRefLine === -1 && /existingTxResolution/.test(line) && !/let\s+existingTxResolution/.test(line) && !/\/\//.test(line.split('existingTxResolution')[0]) && !/import/.test(line)) {
      firstRefLine = i + 1;
    }
  }
  if (declLine === -1) { console.error('  declaration not found'); return false; }
  if (firstRefLine !== -1 && firstRefLine < declLine) {
    console.error(`  TDZ: first reference at line ${firstRefLine}, declaration at line ${declLine}`);
    return false;
  }
  return true;
});

test('T152 — Phase 1D declarations outside bare block that precedes stream fork (scope safety)', () => {
  // The system-message construction code is wrapped in a bare block `{` (a block
  // with no if/for/while/try). If hasExistingCandidates is declared INSIDE that
  // bare block, esbuild will scope-isolate it and later references outside the
  // block become orphaned ReferenceErrors.
  //
  // This test finds the bare block `{` (a line matching /^\s+\{$/) that appears
  // between the declaration and the `if (stream)` fork, and verifies the
  // declaration is BEFORE that bare block opens.
  const lines = chat.split('\n');
  let declLine = -1;
  let bareBlockLine = -1;
  let streamForkLine = -1;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (declLine === -1 && /const\s+hasExistingCandidates\s*=/.test(line)) {
      declLine = i + 1;
    }
    // Bare block: a line that is ONLY whitespace + `{` (no if/for/while/try/catch/else)
    if (bareBlockLine === -1 && declLine !== -1 && /^\s+\{$/.test(line)) {
      bareBlockLine = i + 1;
    }
    if (streamForkLine === -1 && /if\s*\(stream\)\s*\{/.test(line)) {
      streamForkLine = i + 1;
    }
  }
  if (declLine === -1) { console.error('  declaration not found'); return false; }
  if (streamForkLine === -1) { console.error('  stream fork not found'); return false; }
  // If there's a bare block between decl and stream fork, the declaration must be BEFORE it
  if (bareBlockLine !== -1 && bareBlockLine > declLine && bareBlockLine < streamForkLine) {
    // Declaration is before the bare block — correct
    return true;
  }
  if (bareBlockLine !== -1 && bareBlockLine <= declLine) {
    console.error(`  declaration (line ${declLine}) is INSIDE bare block (opens line ${bareBlockLine})`);
    return false;
  }
  // No bare block found between decl and stream fork — also fine
  return true;
});

test('T153 — declaration indent level matches or is shallower than all reference indent levels', () => {
  // Verify the declaration's indent level is <= every reference's indent level.
  // This is a reliable proxy for scope containment that isn't affected by
  // braces inside string literals.
  const lines = chat.split('\n');
  let declIndent = -1;
  let declLine = -1;
  const violations: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (declIndent === -1 && /const\s+hasExistingCandidates\s*=/.test(line)) {
      declIndent = line.match(/^(\s*)/)?.[1].length || 0;
      declLine = i + 1;
      continue;
    }
    if (/^\s*\/\//.test(line)) continue;
    if (declLine !== -1 && /hasExistingCandidates/.test(line)) {
      const refIndent = line.match(/^(\s*)/)?.[1].length || 0;
      if (refIndent < declIndent) {
        violations.push(`line ${i + 1}: indent=${refIndent} < declIndent=${declIndent}`);
      }
    }
  }
  if (declLine === -1) { console.error('  declaration not found'); return false; }
  if (violations.length > 0) {
    for (const v of violations) console.error(`  scope violation: ${v}`);
    return false;
  }
  return true;
});

// ============================================================
// PHASE 1D NEW-SEARCH VS FOLLOW-UP TESTS (T154–T164)
// ============================================================

// T154 — shouldPreserveCandidates is derived in chat.ts
test('T154: shouldPreserveCandidates derived from hasExistingCandidates && !isNewGroundedSearch', () => {
  return /const\s+shouldPreserveCandidates\s*=\s*hasExistingCandidates\s*&&\s*!isNewGroundedSearch/.test(chat);
});

// T155 — isNewGroundedSearch uses classifyFinancialQuery
test('T155: isNewGroundedSearch uses classifyFinancialQuery for early classification', () => {
  return /isNewGroundedSearch/.test(chat) &&
    /classifyFinancialQuery\(masked\)/.test(chat) &&
    /earlyClassification\.requiresGrounding\s*===\s*true/.test(chat);
});

// T156 — streaming forced tx_search gate uses shouldPreserveCandidates (not hasExistingCandidates)
test('T156: streaming forced tx_search gate uses !shouldPreserveCandidates', () => {
  // Find the streaming forced tx_search block — it has forced_tx_search_ and no "as any"
  const streamingBlock = chat.match(/!shouldPreserveCandidates\s*\)\s*\{[\s\S]*?forced_tx_search_[\s\S]*?\}\s*\} else if \(shouldPreserveCandidates && toolCalls\.length === 0/);
  if (!streamingBlock) { console.error('  streaming forced tx_search block not found with shouldPreserveCandidates'); return false; }
  return true;
});

// T157 — non-streaming forced tx_search gate uses shouldPreserveCandidates
test('T157: non-streaming forced tx_search gate uses !shouldPreserveCandidates', () => {
  // The non-streaming block has "as any" cast on toolCalls
  const nonStreamBlock = chat.match(/!shouldPreserveCandidates\s*\)\s*\{[\s\S]*?forced_tx_search_[\s\S]*?as any[\s\S]*?\} else if \(shouldPreserveCandidates && toolCalls\.length === 0/);
  if (!nonStreamBlock) { console.error('  non-streaming forced tx_search block not found with shouldPreserveCandidates'); return false; }
  return true;
});

// T158 — grounding pre-exec gate uses shouldPreserveCandidates
test('T158: phase1dSuppressed uses shouldPreserveCandidates (not hasExistingCandidates)', () => {
  return /const\s+phase1dSuppressed\s*=\s*shouldPreserveCandidates\s*&&\s*plan\.toolName\s*===\s*'tx_search'/.test(chat);
});

// T159 — candidate injection still uses hasExistingCandidates (not shouldPreserveCandidates)
test('T159: candidate injection uses hasExistingCandidates (always inject, even for new searches)', () => {
  // The candidate injection block: if (hasExistingCandidates && existingTxResolution)
  return /if\s*\(hasExistingCandidates\s*&&\s*existingTxResolution\)/.test(chat);
});

// T160 — no gate uses bare hasExistingCandidates where shouldPreserveCandidates should be used
test('T160: no forced-tx or pre-exec gate uses bare hasExistingCandidates', () => {
  // After declarations, hasExistingCandidates should only appear in:
  //   1. the declaration itself
  //   2. isNewGroundedSearch derivation block
  //   3. shouldPreserveCandidates derivation
  //   4. candidate injection (line with existingTxResolution)
  // It should NOT appear in forced_tx_search or phase1dSuppressed contexts
  const violations: string[] = [];
  const lines = chat.split('\n');
  let pastDeclarations = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/const\s+shouldPreserveCandidates/.test(line)) { pastDeclarations = true; continue; }
    if (!pastDeclarations) continue;
    if (/hasExistingCandidates/.test(line)) {
      // Allow: candidate injection (with existingTxResolution on same line)
      if (/existingTxResolution/.test(line)) continue;
      // Allow: comments
      if (/^\s*\/\//.test(line)) continue;
      violations.push(`line ${i + 1}: ${line.trim().slice(0, 80)}`);
    }
  }
  if (violations.length > 0) {
    for (const v of violations) console.error(`  bare hasExistingCandidates: ${v}`);
    return false;
  }
  return true;
});

// ── Classifier behavior tests ──

// T161 — "find my Starbucks purchases" requires grounding (merchant + plural noun)
test('T161: classifier: "find my Starbucks purchases" requires grounding', () => {
  const r = classifyFinancialQuery('find my Starbucks purchases');
  if (!r.requiresGrounding) { console.error(`  requiresGrounding=${r.requiresGrounding}, expected true`); return false; }
  if (r.queryType !== 'merchant') { console.error(`  queryType=${r.queryType}, expected merchant`); return false; }
  return true;
});

// T162 — "show me my Walmart transactions" requires grounding (new search)
test('T162: classifier: "show me my Walmart transactions" requires grounding', () => {
  const r = classifyFinancialQuery('show me my Walmart transactions');
  if (!r.requiresGrounding) { console.error(`  requiresGrounding=${r.requiresGrounding}`); return false; }
  return true;
});

// T163 — "Now show me my Walmart transactions" requires grounding (new search)
test('T163: classifier: "Now show me my Walmart transactions" requires grounding', () => {
  const r = classifyFinancialQuery('Now show me my Walmart transactions');
  if (!r.requiresGrounding) { console.error(`  requiresGrounding=${r.requiresGrounding}`); return false; }
  return true;
});

// T164 — follow-up references do NOT require grounding
test('T164: classifier: follow-up phrases do not require grounding', () => {
  const followUps = [
    'tell me more about that one',
    'what about the second one',
    'which one was the largest',
    'can you select number 3',
  ];
  const failures: string[] = [];
  for (const phrase of followUps) {
    const r = classifyFinancialQuery(phrase);
    if (r.requiresGrounding) {
      failures.push(`"${phrase}" → requiresGrounding=true (expected false)`);
    }
  }
  if (failures.length > 0) {
    for (const f of failures) console.error(`  ${f}`);
    return false;
  }
  return true;
});

// ============================================================
console.log(`============================================================`);
console.log(`TransactionResolutionContext Tests: ${passed} passed, ${failed} failed (${passed + failed} total)`);
console.log(`============================================================`);

if (failed > 0) process.exit(1);
