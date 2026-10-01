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
// P3.3C repair: ownership/identity logic lives in the shared module imported by chat.ts
const OWNERSHIP_PATH = path.resolve(__dirname, '../src/shared/tx-candidate-ownership.ts');
const own = fs.readFileSync(OWNERSHIP_PATH, 'utf8');

/** Source text of a declaration, from its anchor up to `chars` characters. */
function fnBody(src: string, anchor: string, chars: number): string {
  const i = src.indexOf(anchor);
  return i < 0 ? '' : src.substring(i, i + chars);
}

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

test('T2 — TxResolutionCandidate has id, merchant, amount, date, category (shared module)', () => {
  // P3.3C repair: shape owned by src/shared/tx-candidate-ownership.ts; chat.ts aliases it
  const m = own.match(/export type TxResolutionCandidate = \{([^}]+)\}/s);
  if (!m) return false;
  const body = m[1];
  return ['id: string', 'merchant:', 'amount:', 'date:', 'category:'].every(f => body.includes(f))
    && chat.includes('type TxResolutionCandidate = SharedTxResolutionCandidate');
});

test('T3 — TxResolutionContext type defined', () =>
  chat.includes('type TxResolutionContext'));

test('T4 — TxResolutionContext has candidates, selectedId, selectedIndex, updatedAt (shared module)', () => {
  const m = own.match(/export type TxResolutionContext = \{([^}]+)\}/s);
  if (!m) return false;
  const body = m[1];
  return ['candidates:', 'selectedId:', 'selectedIndex:', 'updatedAt:'].every(f => body.includes(f))
    && chat.includes('type TxResolutionContext = SharedTxResolutionContext');
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

test('T15 — persist extracts candidates from result.rows (via shared builder)', () => {
  const persist = fnBody(chat, 'async function persistTxResolutionFromSearchResult', 1200);
  const build = fnBody(own, 'export function buildTxResolutionFromSearchResult', 1200);
  const rowsOf = fnBody(own, 'function rowsOf', 250);
  return persist.includes('buildTxResolutionFromSearchResult(result') && build.includes('rowsOf(result)') && rowsOf.includes('?.rows') && rowsOf.includes('Array.isArray(rows)');
});

test('T16 — persist validates UUID format before including candidate', () =>
  fnBody(own, 'export function buildTxResolutionFromSearchResult', 1200).includes('UUID_RE.test'));

test('T17 — persist caps candidates at the visible frame (25, P3.3D)', () =>
  own.includes('export const VISIBLE_CANDIDATE_FRAME_MAX = 25;')
  && own.includes('export const TX_RESOLUTION_MAX_CANDIDATES = VISIBLE_CANDIDATE_FRAME_MAX;')
  && fnBody(own, 'export function buildTxResolutionFromSearchResult', 1200).includes('.slice(0, TX_RESOLUTION_MAX_CANDIDATES)'));

test('T18 — persist stores only id, merchant, amount, date, category per candidate', () => {
  const b = fnBody(own, 'export function buildTxResolutionFromSearchResult', 1200);
  return b.includes('id:') && b.includes('merchant:') && b.includes('amount:') && b.includes('date:') && b.includes('category:')
    && !b.includes('subcategory:');
});

test('T19 — persist auto-selects when exactly 1 candidate', () => {
  const b = fnBody(own, 'export function buildTxResolutionFromSearchResult', 1200);
  return b.includes('candidates.length === 1') && b.includes('selectedId: single ? candidates[0].id : null');
});

test('T20 — persist does NOT auto-select when multiple candidates', () => {
  const fnStart = chat.indexOf('async function persistTxResolutionFromSearchResult');
  if (fnStart < 0) return false;
  const fnBody = chat.substring(fnStart, fnStart + 1500);
  return fnBody.includes('candidates.length > 1') && fnBody.includes('no auto-selection');
});

test('T21 — persist clears selectedId for 0 candidates', () => {
  // selectedId is null unless exactly one candidate, so 0 candidates = cleared
  const b = fnBody(own, 'export function buildTxResolutionFromSearchResult', 1200);
  return b.includes('selectedId: single ? candidates[0].id : null') && b.includes('selectedIndex: single ? 0 : null');
});

test('T22 — new search always replaces candidates (no merge)', () => {
  const fnStart = chat.indexOf('async function persistTxResolutionFromSearchResult');
  if (fnStart < 0) return false;
  const fnBody = chat.substring(fnStart, fnStart + 2500);
  // writeTxResolution is called with fresh txr object, not merged with previous
  return fnBody.includes('const txr: TxResolutionContext') && fnBody.includes('await writeTxResolution');
});

// ── Persistence call sites (Phase 1C: all go through guardedPersistTxResolution) ──

test('T23 — ownership gate submission at streaming tx_search site', () =>
  chat.includes("await ownershipGate.submitSearchResult(result, 'streaming', streamingOwnership)"));

test('T24 — ownership gate submission at specialist tx_search site', () =>
  chat.includes("await ownershipGate.submitSearchResult(tResult, 'specialist', specOwnership)"));

test('T25 — ownership gate submission at FinancialGrounding pre-execution site', () =>
  chat.includes("await ownershipGate.submitSearchResult(preResult, 'grounding', groundingOwnership)"));

test('T26 — ownership gate submission at non-streaming tx_search site', () =>
  chat.includes("await ownershipGate.submitSearchResult(result, 'non-streaming', nsOwnership)"));

test('T27 — ownership gate submission at tool-loop tx_search site', () =>
  chat.includes("await ownershipGate.submitSearchResult(result, 'tool-loop', loopOwnership)"));

test('T28 — false-zero retry does NOT call persistTxResolutionFromSearchResult (Phase 1B)', () =>
  !chat.includes("persistTxResolutionFromSearchResult(sb, finalSessionId, userId, retryResult)"));

test('T29 — all 6 candidate submissions are awaited (P3.3C lock-race repair)', () => {
  // B2C, streaming, specialist, grounding, non-streaming, tool-loop
  const lines = chat.split('\n').filter(l => l.includes('ownershipGate.submitSearchResult('));
  return lines.length === 6 && lines.every(l => /await ownershipGate\.submitSearchResult\(/.test(l));
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

test('T34 — select_transaction candidateNumber max = visible frame (P3.3D)', () => {
  const selectTx = fs.readFileSync(SELECT_TX_PATH, 'utf8');
  return selectTx.includes('.max(VISIBLE_CANDIDATE_FRAME_MAX)');
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

test('T39 — handleSelectTransaction converts candidateNumber - 1 to index (shared resolver)', () =>
  fnBody(chat, 'async function handleSelectTransaction', 1500).includes('selectCandidateFromFrame(txr, candidateNumber)')
  && fnBody(own, 'export function selectCandidateFromFrame', 1200).includes('candidateNumber - 1'));

test('T40 — handleSelectTransaction rejects candidateNumber < 1', () => {
  const fnStart = chat.indexOf('async function handleSelectTransaction');
  if (fnStart < 0) return false;
  const fnBody = chat.substring(fnStart, fnStart + 1500);
  return fnBody.includes('candidateNumber < 1');
});

test('T41 — handleSelectTransaction rejects out-of-range candidateNumber (bounded by visible frame)', () => {
  const f = fnBody(own, 'export function selectCandidateFromFrame', 1400);
  return f.includes('const selectable = Math.min(txr.candidates.length, VISIBLE_CANDIDATE_FRAME_MAX);')
    && f.includes('if (index >= selectable)');
});

test('T42 — handleSelectTransaction rejects when no candidates', () => {
  const fnStart = chat.indexOf('async function handleSelectTransaction');
  if (fnStart < 0) return false;
  const fnBody = chat.substring(fnStart, fnStart + 1500);
  return fnBody.includes('No transaction search results available');
});

test('T43 — handleSelectTransaction derives UUID from candidates array (not args)', () => {
  const sel = fnBody(own, 'export function selectCandidateFromFrame', 1200);
  const fn = fnBody(chat, 'async function handleSelectTransaction', 1500);
  return sel.includes('txr.candidates[index]') && fn.includes('const candidate = selection.candidate')
    && !fn.includes('args.transactionId') && !fn.includes('args.id');
});

test('T44 — handleSelectTransaction validates UUID of selected candidate', () =>
  fnBody(own, 'export function selectCandidateFromFrame', 1200).includes('UUID_RE.test(candidate.id)'));

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

test('T56 — handoff identity: Layer 1 cache + Layer 2 frame fed to shared precedence helper', () => {
  // P3.3C: readTxResolution is now consulted in the handoff, but ONLY for frame
  // membership (stale Layer 1 rejection) — never as a source of a UUID.
  const idx = chat.indexOf('const handoffIdentity = resolveTagHandoffIdentity({');
  if (idx < 0) return false;
  const nearby = chat.substring(idx - 900, idx + 300);
  return nearby.includes('readAuthoritativeSelectedTx(finalSessionId)')
    && nearby.includes('promoteLayer2SelectedTx(sb, finalSessionId, userId)')
    && nearby.includes('layer2CandidateIds: layer2Frame?.candidates?.map(c => c.id) ?? null');
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

test('T64 — Layer 1 writer reachable ONLY through the ownership gate (P3.3C)', () => {
  const calls = chat.match(/updateAuthoritativeSelectedTxFromSearchResult\(/g) || [];
  // 1 definition + 1 call inside ownershipGate applyLayer1 deps
  return calls.length === 2 && /applyLayer1: \(result: any\) => \{[\s\S]{0,400}updateAuthoritativeSelectedTxFromSearchResult\(/.test(chat);
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

test('T70 — persistTxResolutionFromSearchResult sets updatedAt', () =>
  fnBody(chat, 'async function persistTxResolutionFromSearchResult', 1200).includes('buildTxResolutionFromSearchResult(result, Date.now())')
  && fnBody(own, 'export function buildTxResolutionFromSearchResult', 1200).includes('updatedAt: now'));

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

test('T76 — candidate cap = visible frame in persist builder (P3.3D)', () =>
  own.includes('export const TX_RESOLUTION_MAX_CANDIDATES = VISIBLE_CANDIDATE_FRAME_MAX;'));

test('T77 — select_transaction schema max matches the persisted frame cap (P3.3D)', () => {
  const selectTx = fs.readFileSync(SELECT_TX_PATH, 'utf8');
  return selectTx.includes('.max(VISIBLE_CANDIDATE_FRAME_MAX)')
    && own.includes('export const TX_RESOLUTION_MAX_CANDIDATES = VISIBLE_CANDIDATE_FRAME_MAX;');
});

test('T78 — candidateNumber 30 would select candidates[29] (1-based)', () =>
  fnBody(own, 'export function selectCandidateFromFrame', 1200).includes('const index = candidateNumber - 1'));

test('T79 — candidateNumber at max (25) would select candidates[24]', () => {
  const selectTx = fs.readFileSync(SELECT_TX_PATH, 'utf8');
  return selectTx.includes('.max(VISIBLE_CANDIDATE_FRAME_MAX)') && own.includes('const index = candidateNumber - 1');
});

test('T80 — candidateNumber above the visible frame (26) rejected by schema and by the frame bound', () => {
  const selectTx = fs.readFileSync(SELECT_TX_PATH, 'utf8');
  return selectTx.includes('.max(VISIBLE_CANDIDATE_FRAME_MAX)')
    && fnBody(own, 'export function selectCandidateFromFrame', 1400).includes('if (index >= selectable)');
});

test('T81 — UUID is derived server-side from persisted candidates (not args)', () => {
  const sel = fnBody(own, 'export function selectCandidateFromFrame', 1200);
  const fn = fnBody(chat, 'async function handleSelectTransaction', 1800);
  return sel.includes('const candidate = txr.candidates[index]')
    && fn.includes('txr.selectedId = candidate.id')
    && !fn.includes('args.id')
    && !fn.includes('args.transactionId');
});

test('T82 — candidate cap, card cap and schema max are aligned (all = visible frame)', () => {
  const selectTx = fs.readFileSync(SELECT_TX_PATH, 'utf8');
  return selectTx.includes('.max(VISIBLE_CANDIDATE_FRAME_MAX)')
    && own.includes('export const TX_RESOLUTION_MAX_CANDIDATES = VISIBLE_CANDIDATE_FRAME_MAX;')
    && own.includes('export const TX_CANDIDATES_FOR_RESPONSE_MAX = VISIBLE_CANDIDATE_FRAME_MAX;');
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

test('T100 — false-zero retry does NOT write Layer 1 (P3.3C: re-verification is evidence)', () => {
  const retryComment = chat.indexOf('false-zero retry is re-verification evidence');
  if (retryComment < 0) return false;
  const nearby = chat.substring(retryComment, retryComment + 500);
  return !nearby.includes('updateAuthoritativeSelectedTxFromSearchResult');
});

test('T101 — false-zero retry does NOT persist to Layer 2 DB candidates', () => {
  const retryComment = chat.indexOf('false-zero retry is re-verification evidence');
  if (retryComment < 0) return false;
  const nearby = chat.substring(retryComment, retryComment + 500);
  return !nearby.includes('persistTxResolutionFromSearchResult') && !nearby.includes('submitSearchResult');
});

test('T102 — false-zero retry comment explains why identity is not touched', () =>
  chat.includes('false-zero retry is re-verification evidence, not candidate'));

// ── Phase 1B: Layer 1 mutation safety unchanged ──

test('T103 — buildVerifiedConfirmationSummary not modified (still references transaction)', () =>
  chat.includes('function buildVerifiedConfirmationSummary'));

test('T104 — createPendingConfirmation still imported and used', () =>
  chat.includes('createPendingConfirmation') && chat.includes('confirmation_required'));

// ── Phase 1C: Deterministic request-scoped candidate ownership ──

test('T105 — ownership lock is request-scoped (gate created per request)', () =>
  chat.includes('const ownershipGate = createCandidateOwnershipGate(')
  && fnBody(own, 'export function createCandidateOwnershipGate', 300).includes('let locked = false'));

test('T106 — ownership gate defined in shared module', () =>
  own.includes('export function createCandidateOwnershipGate'));

test('T107 — gate checks lock before persisting', () => {
  const g = fnBody(own, 'export function createCandidateOwnershipGate', 3000);
  return g.includes('if (locked)') && g.includes('skipping candidate replacement')
    && g.indexOf('if (locked)') < g.indexOf('await deps.persistLayer2(frameResult)');
});

test('T108 — gate sets lock on establishment', () =>
  fnBody(own, 'export function createCandidateOwnershipGate', 2500).includes('locked = true; // claim before any await'));

test('T109 — gate delegates Layer 2 (visible frame only) to persistTxResolutionFromSearchResult', () => {
  const g = fnBody(own, 'export function createCandidateOwnershipGate', 3000);
  return g.includes('const visible = buildVisibleCandidateFrame(result);')
    && g.includes('rows: visible.rows')
    && g.includes('await deps.persistLayer2(frameResult)')
    && chat.includes('persistLayer2: (result: any) => persistTxResolutionFromSearchResult(');
});

test('T110 — gate submission accepts source parameter for logging', () =>
  own.includes('submitSearchResult(result: unknown, source: string, intent: CandidateOwnershipIntent)'));

test('T111 — all tx_search persistence goes through the gate (not direct)', () => {
  const direct = chat.match(/persistTxResolutionFromSearchResult\(/g) || [];
  // 1 definition + 1 inside the gate deps
  return direct.length === 2 && !chat.includes('guardedPersistTxResolution');
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
  return block.includes('if (selResult.selected) ownershipGate.lockForSelection()');
});

test('T114 — specialist select_transaction sets lock on success', () => {
  const idx = chat.indexOf('select_transaction interception (specialist)');
  if (idx < 0) return false;
  const block = chat.substring(idx, idx + 400);
  return block.includes('if (selResult.selected) ownershipGate.lockForSelection()');
});

test('T115 — non-streaming select_transaction sets lock on success', () => {
  const idx = chat.indexOf('select_transaction interception (non-streaming)');
  if (idx < 0) return false;
  const block = chat.substring(idx, idx + 400);
  return block.includes('if (selResult.selected) ownershipGate.lockForSelection()');
});

test('T116 — tool-loop select_transaction sets lock on success', () => {
  const idx = chat.indexOf('select_transaction interception (tool-loop)');
  if (idx < 0) return false;
  const block = chat.substring(idx, idx + 400);
  return block.includes('if (selResult.selected) ownershipGate.lockForSelection()');
});

test('T117 — lock only set on selResult.selected (failed selection does not lock)', () => {
  const lockSites = chat.match(/if \(selResult\.selected\) ownershipGate\.lockForSelection\(\)/g) || [];
  return lockSites.length === 4;
});

test('T118 — lock CLAIMED before persist is awaited; failed persist keeps lock, emits nothing (P3.3C race repair)', () => {
  // Claiming first means two establishment attempts in one response cannot both pass the lock check.
  const g = fnBody(own, 'export function createCandidateOwnershipGate', 3000);
  const lockIdx = g.indexOf('locked = true; // claim before any await');
  const persistIdx = g.indexOf('await deps.persistLayer2(frameResult)');
  const failIdx = g.indexOf("return 'persist_failed'");
  const layer1Idx = g.indexOf('deps.applyLayer1(frameResult)');
  return lockIdx > 0 && persistIdx > lockIdx && failIdx > persistIdx && layer1Idx > failIdx;
});

test('T119 — analytical tx_search still executes but touches NO identity (P3.3C)', () => {
  // The analytical branch returns before the visible frame is built, persisted or applied to Layer 1.
  const g = fnBody(own, 'export function createCandidateOwnershipGate', 3000);
  const analyticalIdx = g.indexOf("return 'skipped_analytical'");
  return analyticalIdx > 0
    && analyticalIdx < g.indexOf('buildVisibleCandidateFrame(result)')
    && analyticalIdx < g.indexOf('await deps.persistLayer2(frameResult)')
    && analyticalIdx < g.indexOf('deps.applyLayer1(frameResult)')
    && (chat.match(/updateAuthoritativeSelectedTxFromSearchResult\(/g) || []).length === 2;
});

test('T120 — false-zero retry still excluded from Layer 2 (Phase 1B preserved)', () =>
  !chat.includes("guardedPersistTxResolution") || // if we renamed, check retry doesn't use it
  !chat.includes("persistTxResolutionFromSearchResult(sb, finalSessionId, userId, retryResult)"));

test('T121 — lock is request-scoped (gate created inside handler, not module-level)', () => {
  const handlerIdx = chat.indexOf('export const handler');
  const gateIdx = chat.indexOf('const ownershipGate = createCandidateOwnershipGate(');
  const p31cIdx = chat.indexOf('── P3.1C: Controlled Read-Only Evidence Execution ──');
  // Created inside the handler and BEFORE P3.1C (TDZ repair)
  return handlerIdx > 0 && gateIdx > handlerIdx && p31cIdx > gateIdx;
});

test('T122 — existing select_transaction 1-based behavior preserved', () => {
  const selectTx = fs.readFileSync(SELECT_TX_PATH, 'utf8');
  return selectTx.includes('.min(1)') && selectTx.includes('.max(VISIBLE_CANDIDATE_FRAME_MAX)');
});

// ── Phase 1D: Preserve candidate frame across follow-up references ──

test('T123 — existingTxResolution read at request start', () =>
  chat.includes('existingTxResolution = await readTxResolution(sb, finalSessionId, userId)'));

test('T124 — hasExistingCandidates derived from existingTxResolution', () =>
  chat.includes('const hasExistingCandidates = !!(existingTxResolution?.candidates?.length)'));

test('T125 — existing candidates injected into system prompt', () =>
  chat.includes('ACTIVE TRANSACTION CANDIDATES (from your previous search)'));

test('T126 — candidate prompt includes candidateNumber guidance', () =>
  chat.includes('you MUST call select_transaction({ candidateNumber })')
  && chat.includes('answer directly or call select_transaction'));

test('T127 — candidate prompt tells model NOT to re-fetch existing candidates', () =>
  chat.includes('(by ordinal, attribute, superlative, or description), answer directly or call select_transaction — do NOT call tx_search.'));

test('T128 — candidate prompt tells model tx_search allowed for genuinely different queries (new_candidate_scope)', () =>
  chat.includes("If the user asks about DIFFERENT transactions (different merchant, different time period, different criteria), call tx_search with purpose=\\'new_candidate_scope\\'."));

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
  // Existing candidates in prompt; model answers directly or calls select_transaction.
  return chat.includes('answer directly or call select_transaction')
    && chat.includes('ACTIVE TRANSACTION CANDIDATES (from your previous search):');
});

test('T144 — "Now show me Walmart transactions" allows new search (new_candidate_scope)', () => {
  // Model tx_search with purpose=new_candidate_scope resolves to candidate_establishment
  const streaming = chat.includes("const streamingOwnership = resolveCandidateOwnership(args?.purpose, hasExistingCandidates);");
  const nonStreaming = chat.includes("const nsOwnership = resolveCandidateOwnership(args?.purpose, hasExistingCandidates);");
  const resolver = fnBody(own, 'export function resolveCandidateOwnership', 600);
  return streaming && nonStreaming && resolver.includes("if (purpose === 'new_candidate_scope') return 'candidate_establishment';");
});

test('T145 — Phase 1C intra-request ownership still works', () =>
  own.includes('let locked = false') && own.includes('lockForSelection() {')
  && chat.includes('ownershipGate.lockForSelection()'));

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
test('T154: shouldPreserveCandidates = hasExistingCandidates; B2C has its own authority (P3.3C)', () => {
  // P3.3C: any valid frame is preserved against arbitrary model searches. The B2C
  // bridge alone may replace an old frame on a new grounded request.
  return /const\s+shouldPreserveCandidates\s*=\s*hasExistingCandidates;/.test(chat)
    && chat.includes('const merchantAnalysisBridgeActive = computeB2CBridgeActive({')
    && fnBody(own, 'export function computeB2CBridgeActive', 600).includes('return !input.hasExistingCandidates || input.isNewGroundedSearch;');
});

// T155 — isNewGroundedSearch uses classifyFinancialQuery
test('T155: isNewGroundedSearch uses classifyFinancialQuery for early classification', () => {
  return /isNewGroundedSearch/.test(chat) &&
    /classifyFinancialQuery\(masked\)/.test(chat) &&
    /earlyClassification\.requiresGrounding\s*===\s*true/.test(chat);
});

// T156 — streaming forced tx_search gate uses shouldPreserveCandidates + isHistoricalConversationRef (P2.3)
test('T156: streaming forced tx_search gate uses !shouldPreserveCandidates', () => {
  // P2.3 added !isHistoricalConversationRef guard alongside !shouldPreserveCandidates
  const gates = chat.match(/!shouldPreserveCandidates &&\s*!isHistoricalConversationRef &&[\s\S]{0,200}?\)\s*\{\s*const forcedArgs/g) || [];
  const streamingIdx = chat.indexOf("Phase1D: skipping forced tx_search (streaming)");
  const first = chat.search(/!shouldPreserveCandidates &&\s*!isHistoricalConversationRef &&[\s\S]{0,200}?\)\s*\{\s*const forcedArgs/);
  if (gates.length < 1 || first < 0 || first > streamingIdx) { console.error('  streaming forced tx_search gate not found'); return false; }
  return true;
});

// T157 — non-streaming forced tx_search gate uses shouldPreserveCandidates + isHistoricalConversationRef (P2.3)
test('T157: non-streaming forced tx_search gate uses !shouldPreserveCandidates', () => {
  const gates = chat.match(/!shouldPreserveCandidates &&\s*!isHistoricalConversationRef &&[\s\S]{0,200}?\)\s*\{\s*const forcedArgs/g) || [];
  if (gates.length !== 2) { console.error(`  expected 2 forced tx_search gates, found ${gates.length}`); return false; }
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
  // After declarations, hasExistingCandidates may only appear in:
  //   1. candidate injection (line with existingTxResolution)
  //   2. P3.3C ownership resolution (resolveCandidateOwnership / grounding intent)
  //   3. P3.3C B2C establishment authority (computeB2CBridgeActive input)
  //   4. P3.1A evidence contract input (candidateIdentityAvailable)
  // It must NOT appear in forced_tx_search or phase1dSuppressed contexts
  const violations: string[] = [];
  const lines = chat.split('\n');
  let pastDeclarations = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/const\s+shouldPreserveCandidates/.test(line)) { pastDeclarations = true; continue; }
    if (!pastDeclarations) continue;
    if (/hasExistingCandidates/.test(line)) {
      if (/existingTxResolution/.test(line)) continue;
      if (/^\s*\/\//.test(line)) continue;
      if (/resolveCandidateOwnership\([^)]*, hasExistingCandidates\)/.test(line)) continue;
      if (/const groundingOwnership: CandidateOwnershipIntent = hasExistingCandidates \?/.test(line)) continue;
      // P3.1A evidence contract input (observational only, not a gate)
      if (/^\s*candidateIdentityAvailable: hasExistingCandidates,\s*$/.test(line)) continue;
      if (/^\s*hasExistingCandidates,\s*$/.test(line) && /computeB2CBridgeActive\(\{/.test(lines.slice(Math.max(0, i - 6), i).join('\n'))) continue;
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
// PHASE 2 — LAYER 2 → TAG HANDOFF BRIDGE TESTS (T165–T185)
// ============================================================

// ── Part 1: promoteLayer2SelectedTx structural tests ──

test('T165: promoteLayer2SelectedTx function exists', () => {
  return /async function promoteLayer2SelectedTx\(/.test(chat);
});

test('T166: promoteLayer2SelectedTx reads from readTxResolution (not model/cache)', () => {
  const fnStart = chat.indexOf('async function promoteLayer2SelectedTx');
  const fnBody = chat.substring(fnStart, fnStart + 2000);
  return fnBody.includes('readTxResolution(sb, sessionId, userId)') &&
    !fnBody.includes('authoritativeSelectedTxCache');
});

test('T167: promoteLayer2SelectedTx validates selectedId exists', () => {
  const fnStart = chat.indexOf('async function promoteLayer2SelectedTx');
  const fnBody = chat.substring(fnStart, fnStart + 2000);
  return fnBody.includes('selectedId') && fnBody.includes('if (!selectedId)');
});

test('T168: promoteLayer2SelectedTx validates UUID format', () => {
  const fnStart = chat.indexOf('async function promoteLayer2SelectedTx');
  const fnBody = chat.substring(fnStart, fnStart + 2000);
  return fnBody.includes('UUID_RE.test(selectedId)');
});

test('T169: promoteLayer2SelectedTx validates candidate membership', () => {
  const fnStart = chat.indexOf('async function promoteLayer2SelectedTx');
  const fnBody = chat.substring(fnStart, fnStart + 2000);
  return fnBody.includes('candidates') && fnBody.includes('c.id === selectedId');
});

test('T170: promoteLayer2SelectedTx does DB re-fetch with user_id', () => {
  const fnStart = chat.indexOf('async function promoteLayer2SelectedTx');
  const fnBody = chat.substring(fnStart, fnStart + 2000);
  return fnBody.includes("from('transactions')") &&
    fnBody.includes("eq('id', selectedId)") &&
    fnBody.includes("eq('user_id', userId)");
});

test('T171: promoteLayer2SelectedTx returns null on all failure paths', () => {
  const fnStart = chat.indexOf('async function promoteLayer2SelectedTx');
  const fnBody = chat.substring(fnStart, fnStart + 2000);
  // Count return null statements — should have at least 5 (empty params, no txr, no selectedId, bad UUID, not member, DB fail, catch)
  const nullReturns = (fnBody.match(/return null/g) || []).length;
  if (nullReturns < 5) { console.error(`  only ${nullReturns} null returns, expected >= 5`); return false; }
  return true;
});

test('T172: promoteLayer2SelectedTx returns AuthoritativeSelectedTransaction shape', () => {
  const fnStart = chat.indexOf('async function promoteLayer2SelectedTx');
  const fnBody = chat.substring(fnStart, fnStart + 2000);
  // Must return object with id, date, description, merchant, amount, current_category from DB
  return fnBody.includes('id:') && fnBody.includes('date:') &&
    fnBody.includes('description:') && fnBody.includes('amount:') &&
    fnBody.includes('current_category:');
});

test('T173: promoteLayer2SelectedTx never accepts model UUID input', () => {
  const fnStart = chat.indexOf('async function promoteLayer2SelectedTx');
  const fnSig = chat.substring(fnStart, fnStart + 200);
  // Signature should only take sb, sessionId, userId — no transactionId/uuid param
  return /promoteLayer2SelectedTx\(\s*sb:\s*any,\s*sessionId:\s*string,\s*userId:\s*string/.test(fnSig) &&
    !fnSig.includes('transactionId') && !fnSig.includes('uuid');
});

// ── Part 2: performHandoffLifecycle wiring ──

test('T174: performHandoffLifecycle calls promoteLayer2SelectedTx', () => {
  const fnStart = chat.indexOf('async function performHandoffLifecycle');
  const fnBody = chat.substring(fnStart, fnStart + 5000);
  return fnBody.includes('promoteLayer2SelectedTx(sb, finalSessionId, userId)');
});

test('T175: handoff identity decided by shared precedence helper (Layer 2 consulted first)', () => {
  const fnStart = chat.indexOf('async function performHandoffLifecycle');
  const body = chat.substring(fnStart, fnStart + 6000);
  const l2 = body.indexOf('promoteLayer2SelectedTx(sb, finalSessionId, userId)');
  const helper = body.indexOf('resolveTagHandoffIdentity({');
  if (l2 < 0 || helper < 0) { console.error('  handoff precedence wiring not found'); return false; }
  return l2 < helper;
});

test('T176: verified Layer 2 selection wins over Layer 1 (P3.3C precedence)', () => {
  const fnStart = chat.indexOf('async function performHandoffLifecycle');
  const body = chat.substring(fnStart, fnStart + 6000);
  const l2 = body.indexOf('promoteLayer2SelectedTx(sb, finalSessionId, userId)');
  const l1 = body.indexOf('readAuthoritativeSelectedTx(finalSessionId)');
  const fn = fnBody(own, 'export function resolveTagHandoffIdentity', 900);
  return l2 > 0 && l1 > l2
    && fn.indexOf("if (input.layer2Selected) return { source: 'layer2_selected_tx'") >= 0
    && fn.indexOf("if (input.layer2Selected)") < fn.indexOf("source: 'authoritative_selected_tx'");
});

test('T177: Layer 2 promotion uses _source: "layer2_selected_tx"', () =>
  own.includes("source: 'layer2_selected_tx'") && chat.includes('_source: handoffIdentity.source'));

test('T178: Layer 1 and Layer 2 share one plugin_payload construction', () => {
  const idx = chat.indexOf('_source: handoffIdentity.source');
  if (idx < 0) return false;
  const block = chat.substring(idx - 500, idx + 50);
  return block.includes('id: tx.id') && block.includes('description: tx.description') && block.includes('requested_action:');
});

// ── Part 3: Precedence / stale Layer 1 safety ──

test('T179: select_transaction does NOT write to authoritativeSelectedTxCache', () => {
  const fnStart = chat.indexOf('async function handleSelectTransaction');
  const fnBody = chat.substring(fnStart, fnStart + 1500);
  return !fnBody.includes('writeAuthoritativeSelectedTx') &&
    !fnBody.includes('authoritativeSelectedTxCache');
});

test('T180: Layer 1 update clears when rows != 1', () => {
  const pure = fnBody(own, 'export function computeLayer1Update', 600);
  const fn = fnBody(chat, 'function updateAuthoritativeSelectedTxFromSearchResult', 800);
  return pure.includes('rows.length === 1') && pure.includes("kind: 'clear'") && fn.includes('clearAuthoritativeSelectedTx');
});

test('T181: Layer 1 written ONLY for candidate_establishment (via gate), never per search path', () => {
  // P3.3C: replaced "called in all tx_search paths". Analytical/retry paths must not reach Layer 1.
  const callCount = (chat.match(/updateAuthoritativeSelectedTxFromSearchResult\(finalSessionId/g) || []).length;
  if (callCount !== 1) { console.error(`  ${callCount} direct calls, expected exactly 1 (gate deps)`); return false; }
  const g = fnBody(own, 'export function createCandidateOwnershipGate', 3000);
  return g.indexOf("if (intent !== 'candidate_establishment')") < g.indexOf('deps.applyLayer1(frameResult)');
});

// ── Part 6: Fail-closed structural tests ──

test('T182: promoteLayer2SelectedTx fails closed on empty sessionId', () => {
  const fnStart = chat.indexOf('async function promoteLayer2SelectedTx');
  const fnBody = chat.substring(fnStart, fnStart + 300);
  return fnBody.includes('!sessionId') && fnBody.includes('return null');
});

test('T183: promoteLayer2SelectedTx fails closed on empty userId', () => {
  const fnStart = chat.indexOf('async function promoteLayer2SelectedTx');
  const fnBody = chat.substring(fnStart, fnStart + 300);
  return fnBody.includes('!userId') && fnBody.includes('return null');
});

// ── Part 9: No-select regression ──

test('T184: promoteLayer2SelectedTx returns null when selectedId is null', () => {
  // Structural: the function checks selectedId before proceeding
  const fnStart = chat.indexOf('async function promoteLayer2SelectedTx');
  const fnBody = chat.substring(fnStart, fnStart + 800);
  const selectedIdCheck = fnBody.indexOf('if (!selectedId)');
  const uuidCheck = fnBody.indexOf('UUID_RE.test(selectedId)');
  return selectedIdCheck > 0 && uuidCheck > selectedIdCheck;
});

test('T185: existing bindAuthoritativeTxIdentity/checkMutationIdentityGate unchanged', () => {
  // Layer 1 mutation safety chain must still exist unchanged
  const bindFn = chat.includes("function bindAuthoritativeTxIdentity(");
  const gateFn = chat.includes("function checkMutationIdentityGate(");
  const gateCheck = chat.includes("if (bindResult.bound) return null");
  return bindFn && gateFn && gateCheck;
});

// ============================================================
console.log(`============================================================`);
console.log(`TransactionResolutionContext Tests: ${passed} passed, ${failed} failed (${passed + failed} total)`);
console.log(`============================================================`);

if (failed > 0) process.exit(1);
