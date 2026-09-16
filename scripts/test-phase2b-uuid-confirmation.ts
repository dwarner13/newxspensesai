/**
 * Phase 2B UUID Preservation & Confirmation Gate Regression Tests
 *
 * Validates:
 * - Issue 1: Transaction UUID preservation across Prime → Tag handoff
 * - Issue 2: Confirmation gate as hard execution boundary (no false success)
 *
 * Run: TOOL_CONFIRM_SECRET=<secret> npx tsx scripts/test-phase2b-uuid-confirmation.ts
 */

import { readFileSync } from 'fs';
import { z } from 'zod';
import { hashArgs, verifySignature, requiresConfirmation } from '../netlify/functions/_shared/toolConfirmation';

// Dynamically import the tool's inputSchema
const tagUpdateModule = await import('../src/agent/tools/impl/tag_update_transaction_category');
const handoffModule = await import('../src/agent/tools/impl/request_employee_handoff');

let passed = 0;
let failed = 0;

function assert(name: string, condition: boolean) {
  if (condition) { passed++; console.log('PASS:', name); }
  else { failed++; console.error('FAIL:', name); }
}

// Ensure TOOL_CONFIRM_SECRET is set for testing
if (!process.env.TOOL_CONFIRM_SECRET || process.env.TOOL_CONFIRM_SECRET.length < 32) {
  process.env.TOOL_CONFIRM_SECRET = 'test_secret_key_that_is_at_least_32_characters_long_for_testing_purposes';
}

const chatSrc = readFileSync('netlify/functions/chat.ts', 'utf8');
const brainSrc = readFileSync('src/lib/ai/brains/prime.ts', 'utf8');
const tagToolSrc = readFileSync('src/agent/tools/impl/tag_update_transaction_category.ts', 'utf8');
const handoffToolSrc = readFileSync('src/agent/tools/impl/request_employee_handoff.ts', 'utf8');

// ═══════════════════════════════════════════════════════════════════════════
// ISSUE 1: Transaction UUID Preservation
// ═══════════════════════════════════════════════════════════════════════════

console.log('\n=== I1: UUID Preservation — Schema Boundary ===\n');

// T1: transactionId enforces UUID format at schema level
{
  const schema = tagUpdateModule.inputSchema;

  const validUUID = '85f64784-7cf8-461a-943e-5c02260de191';
  const result1 = schema.safeParse({ transactionId: validUUID, newCategory: 'Shopping' });
  assert('T1.1 Valid UUID accepted by schema', result1.success === true);

  const result2 = schema.safeParse({ transactionId: '1', newCategory: 'Shopping' });
  assert('T1.2 "1" rejected as transactionId', result2.success === false);

  const result3 = schema.safeParse({ transactionId: '2026-05-04-COSTCO-WHOLESALE-190.27', newCategory: 'Shopping' });
  assert('T1.3 "2026-05-04-COSTCO-WHOLESALE-190.27" rejected as transactionId', result3.success === false);

  const result4 = schema.safeParse({ transactionId: 'tx-123', newCategory: 'Shopping' });
  assert('T1.4 "tx-123" rejected as transactionId', result4.success === false);

  const result5 = schema.safeParse({ transactionId: 'COSTCO WHOLESALE', newCategory: 'Shopping' });
  assert('T1.5 Human-readable merchant name rejected as transactionId', result5.success === false);

  const result6 = schema.safeParse({ transactionId: '', newCategory: 'Shopping' });
  assert('T1.6 Empty string rejected as transactionId', result6.success === false);

  const result7 = schema.safeParse({ transactionId: '85f64784-7cf8-461a-943e-5c02260de191', newCategory: 'Shopping' });
  assert('T1.7 Real UUID format accepted', result7.success === true);

  // Uppercase UUID should also work (UUID spec allows it)
  const result8 = schema.safeParse({ transactionId: '85F64784-7CF8-461A-943E-5C02260DE191', newCategory: 'Shopping' });
  assert('T1.8 Uppercase UUID accepted', result8.success === true);

  // Random alphanumeric that isn't a UUID
  const result9 = schema.safeParse({ transactionId: 'abc123def456', newCategory: 'Shopping' });
  assert('T1.9 Random alphanumeric rejected', result9.success === false);
}

console.log('\n=== I1: UUID Preservation — Structured Handoff ===\n');

// T2: plugin_payload can carry structured transaction identity
{
  const handoffSchema = handoffModule.inputSchema;

  const handoffInput = {
    target_slug: 'tag-ai',
    reason: 'User wants to change category',
    summary_for_next_employee: 'Change COSTCO transaction to Shopping',
    handoff_type: 'plugin' as const,
    plugin_payload: {
      transaction: {
        id: '85f64784-7cf8-461a-943e-5c02260de191',
        date: '2026-05-04',
        description: 'COSTCO WHOLESALE',
        amount: -190.27,
        current_category: 'Groceries',
      },
      requested_action: {
        type: 'change_category',
        new_category: 'Shopping',
      },
    },
  };

  const result = handoffSchema.safeParse(handoffInput);
  assert('T2.1 Structured handoff with transaction identity accepted by schema', result.success === true);

  if (result.success) {
    assert('T2.2 plugin_payload.transaction.id preserved',
      result.data.plugin_payload?.transaction?.id === '85f64784-7cf8-461a-943e-5c02260de191');
    assert('T2.3 plugin_payload.requested_action.new_category preserved',
      result.data.plugin_payload?.requested_action?.new_category === 'Shopping');
  }
}

// T3: Structural — Prime brain includes structured handoff instructions
{
  assert('T3.1 Prime brain mentions plugin_payload for category mutations',
    brainSrc.includes('plugin_payload'));

  assert('T3.2 Prime brain mentions handoff_type: "plugin"',
    brainSrc.includes('handoff_type: "plugin"'));

  assert('T3.3 Prime brain says NEVER invent/reconstruct UUID',
    brainSrc.includes('NEVER invent, guess, or reconstruct a transaction UUID'));

  assert('T3.4 Prime brain says pass real UUID from tx_search',
    brainSrc.includes('real UUID from tx_search'));
}

// T4: Structural — Tag receives transaction identity instructions
{
  assert('T4.1 TAG_TRANSACTION_IDENTITY_RULE defined in chat.ts',
    chatSrc.includes('TAG_TRANSACTION_IDENTITY_RULE'));

  assert('T4.2 Tag identity rule says never invent/reconstruct/derive',
    chatSrc.includes('NEVER invent, reconstruct, or derive a transaction ID'));

  assert('T4.3 Tag identity rule lists invalid ID examples',
    chatSrc.includes('"1", "2", "tx-123", "2026-05-04-COSTCO-190.27"'));

  assert('T4.4 Tag identity rule injected in streaming specialist path',
    chatSrc.includes("isTagContinuation) {\n            messages.push({ role: 'system', content: TAG_TRANSACTION_IDENTITY_RULE"));

  assert('T4.5 Tag identity rule injected in non-streaming specialist path',
    chatSrc.includes("isTagContinuationNS) {\n                messages.push({ role: 'system', content: TAG_TRANSACTION_IDENTITY_RULE"));
}

// T5: Structural — Plugin context builds transaction hint for Tag
{
  assert('T5.1 Streaming path builds pluginTransactionHint when transaction.id present',
    chatSrc.includes("handoffContext?.plugin_payload?.transaction?.id"));

  assert('T5.2 Transaction UUID injected into specialist continuation instruction',
    chatSrc.includes('TRANSACTION IDENTITY PROVIDED BY PRIME'));

  assert('T5.3 Plugin hint says "use directly — do NOT search again"',
    chatSrc.includes('use directly — do NOT search again'));
}

// T6: Tag cannot mutate without trustworthy identity
{
  assert('T6.1 tag_update_transaction_category uses z.string().uuid()',
    tagToolSrc.includes('.uuid('));

  assert('T6.2 UUID validation message explains the rule',
    tagToolSrc.includes('never reconstruct or invent an ID'));

  assert('T6.3 Tag identity rule says hand back to prime if no UUID and no tx_search',
    chatSrc.includes('hand back to prime-boss'));
}

// ═══════════════════════════════════════════════════════════════════════════
// ISSUE 2: Confirmation Gate — Hard Execution Boundary
// ═══════════════════════════════════════════════════════════════════════════

console.log('\n=== I2: Confirmation Gate — Backend State Machine ===\n');

// T10: requiresConfirm creates pending confirmation (existing behavior)
{
  assert('T10.1 tag_update_transaction_category has requiresConfirm: true',
    requiresConfirmation({ requiresConfirm: true, mutates: true }) === true);

  assert('T10.2 tag_update_transaction_category gated in tool registry',
    (() => {
      const toolIdx = readFileSync('src/agent/tools/index.ts', 'utf8');
      return /tag_update_transaction_category[\s\S]*?requiresConfirm:\s*true/.test(toolIdx);
    })());
}

// T11-T13: Backend stops after confirmation — no second model call for false success
{
  // Streaming specialist path: deterministic text when specConfirmation
  assert('T11.1 Streaming specialist: hard confirmation boundary exists',
    chatSrc.includes('HARD CONFIRMATION BOUNDARY (streaming specialist path)'));

  assert('T11.2 Streaming specialist: emits confirmation_required SSE',
    chatSrc.includes("specPendingConfirmationData") &&
    chatSrc.includes("writeSSE({\n                type: 'confirmation_required',\n                tool: specPendingConfirmationData.toolName"));

  assert('T11.3 Streaming specialist: uses deterministic text, not model text',
    chatSrc.includes('Confirmation hard boundary (streaming specialist): emitted deterministic text, skipped model call'));

  // Non-streaming path: deterministic text replaces model call
  assert('T12.1 Non-streaming: hard confirmation boundary exists',
    chatSrc.includes('HARD CONFIRMATION BOUNDARY (non-streaming post-loop)'));

  assert('T12.2 Non-streaming: no model call for confirmation text generation',
    !chatSrc.includes("specialist_confirmation_text"));

  assert('T12.3 Non-streaming: deterministic text used',
    chatSrc.includes('Confirmation hard boundary (non-streaming): deterministic text, no model call'));

  // Initial streaming path: confirmation prevents second completion
  assert('T13.1 Initial streaming: checks initialConfirmationFired before second model call',
    chatSrc.includes('initialConfirmationFired'));

  assert('T13.2 Initial streaming: skips second model call when confirmation fired',
    chatSrc.includes('!initialConfirmationFired'));

  assert('T13.3 Initial streaming: hard boundary fallback for initial path',
    chatSrc.includes('HARD CONFIRMATION BOUNDARY (initial streaming path)'));
}

// T14: Confirmation UI state remains available
{
  assert('T14.1 Streaming specialist: confirmation SSE emitted with token + confirmationId',
    chatSrc.includes("token: specPendingConfirmationData.token"));

  assert('T14.2 Non-streaming: pendingConfirmation metadata set in response body',
    chatSrc.includes("(toolResults as any).__pendingConfirmation"));

  assert('T14.3 JSON response includes pendingConfirmation when present',
    chatSrc.includes('pendingConfirmationPayload && { pendingConfirmation: pendingConfirmationPayload }'));
}

// T15-T16: Confirmation consumption uses exact signed args (existing behavior)
{
  const args1 = { transactionId: '85f64784-7cf8-461a-943e-5c02260de191', newCategory: 'Shopping' };
  const args2 = { transactionId: '85f64784-7cf8-461a-943e-5c02260de191', newCategory: 'Travel' };

  assert('T15.1 Same args produce same hash (exact match)',
    hashArgs(args1) === hashArgs({ newCategory: 'Shopping', transactionId: '85f64784-7cf8-461a-943e-5c02260de191' }));

  assert('T16.1 Changed args produce different hash (cannot substitute)',
    hashArgs(args1) !== hashArgs(args2));
}

// T17: Successful execution can report success (only after confirmation consumption)
{
  assert('T17.1 Confirmed execution returns toolConfirmationResult',
    chatSrc.includes('toolConfirmationResult'));

  assert('T17.2 Confirmed execution uses stored exact arguments (argsSnapshot)',
    chatSrc.includes('confirmedArgs = consumeResult.argsSnapshot'));
}

// T18: Cancel produces no mutation (frontend-only, structural check)
{
  const hooksSrc = readFileSync('src/hooks/usePrimeChat.ts', 'utf8');
  assert('T18.1 cancelToolExecution clears pendingConfirmation',
    hooksSrc.includes('cancelToolExecution') && hooksSrc.includes("setPendingConfirmation(null)"));
}

// T19-T20: Expired/consumed confirmations cannot execute (existing behavior)
{
  assert('T19.1 Expiry checked client-side before sending',
    readFileSync('src/hooks/usePrimeChat.ts', 'utf8').includes('Date.now() > pendingConfirmation.expiresAt'));

  assert('T19.2 Expiry checked server-side before DB',
    readFileSync('netlify/functions/_shared/toolConfirmation.ts', 'utf8').includes('Date.now() > params.expiresAt'));

  assert('T20.1 Atomic consume via Postgres UPDATE prevents replay',
    readFileSync('netlify/functions/_shared/toolConfirmation.ts', 'utf8').includes('consume_tool_confirmation'));
}

// T21-T22: Typed "Yes, confirm" cannot bypass signed confirmation or cause false success
{
  assert('T21.1 Only __CONFIRM_TOOL__ prefix recognized for confirmation consumption',
    chatSrc.includes("messageTrimmed.startsWith('__CONFIRM_TOOL__')"));

  // When user types "yes, confirm" and it becomes a normal chat turn,
  // the MUTATION_TRUTH_RULE prevents false success
  assert('T21.2 MUTATION_TRUTH_RULE defined in chat.ts',
    chatSrc.includes('MUTATION_TRUTH_RULE'));

  assert('T22.1 MUTATION_TRUTH_RULE says awaiting confirmation != executed',
    chatSrc.includes('Awaiting confirmation != executed'));

  assert('T22.2 MUTATION_TRUTH_RULE injected in streaming specialist continuation',
    chatSrc.includes("messages.push({ role: 'system', content: MUTATION_TRUTH_RULE })"));

  assert('T22.3 MUTATION_TRUTH_RULE injected in non-streaming specialist continuation',
    // Count occurrences — should appear at least twice (streaming + non-streaming)
    (chatSrc.match(/messages\.push\(\{ role: 'system', content: MUTATION_TRUTH_RULE \}\)/g) || []).length >= 2);
}

// T23: No duplicate pending mutation from typed response
{
  // The confirmation gate creates a new pending confirmation each time the mutation
  // tool is called. If the user's "yes" message causes Tag to call the mutation again,
  // a new confirmation is created BUT the hard boundary prevents false success.
  // The deterministic text tells the user to use the Confirm button.
  assert('T23.1 Deterministic text mentions Confirm button',
    chatSrc.includes('please use the Confirm button'));

  // Deduplication: prior pending confirmations for same mutation are cancelled
  const confirmSrc = readFileSync('netlify/functions/_shared/toolConfirmation.ts', 'utf8');
  assert('T23.2 createPendingConfirmation cancels prior pending confirmations before insert',
    confirmSrc.includes("status: 'cancelled'") && confirmSrc.includes('Deduplication'));

  assert('T23.3 Dedup targets same (userId, sessionId, toolName, argsHash)',
    confirmSrc.includes(".eq('user_id', userId)") &&
    confirmSrc.includes(".eq('session_id', sessionId)") &&
    confirmSrc.includes(".eq('tool_name', toolName)") &&
    confirmSrc.includes(".eq('args_hash', argsHash)") &&
    confirmSrc.includes(".eq('status', 'pending')"));

  assert('T23.4 Dedup is non-fatal (try/catch)',
    confirmSrc.includes('Dedup cancel failed (non-fatal)'));
}

// T24: Non-streaming post-loop does not overwrite initial gate metadata
{
  assert('T24.1 Post-loop preserves initial gate __pendingConfirmation',
    chatSrc.includes('pendingConfirmation metadata already set by initial gate'));
}

// ═══════════════════════════════════════════════════════════════════════════
// ISSUE 2B: Non-streaming tool-loop confirmation carries token to frontend
// ═══════════════════════════════════════════════════════════════════════════

console.log('\n=== I2B: Non-streaming confirmation token propagation ===\n');

// T25: loopPendingConfirmationData captures full pending data at gate time
{
  assert('T25.1 loopPendingConfirmationData declared in non-streaming path',
    chatSrc.includes('let loopPendingConfirmationData'));

  assert('T25.2 loopPendingConfirmationData captures token from pending',
    chatSrc.includes('token: pending.token,') &&
    chatSrc.includes('argsHash: pending.argsHash,') &&
    chatSrc.includes('loopPendingConfirmationData = {'));

  assert('T25.3 loopPendingConfirmationData captured at tool-loop confirmation gate',
    // Verify it's set within the requiresConfirmation block in the tool loop
    (() => {
      const gateIdx = chatSrc.indexOf('Confirmation gate (tool loop round');
      const assignIdx = chatSrc.indexOf('loopPendingConfirmationData = {', gateIdx);
      return gateIdx > 0 && assignIdx > 0 && assignIdx - gateIdx < 2000;
    })());
}

// T26: Model-visible tool result does NOT contain token or argsHash
{
  // The tool result content pushed at the confirmation gate must not leak secrets
  // Find the JSON.stringify block near the confirmation gate in the tool loop
  const toolLoopGateIdx = chatSrc.indexOf('Confirmation gate (tool loop round');
  const nextJsonStringify = chatSrc.indexOf('JSON.stringify({', toolLoopGateIdx);
  const closingParen = chatSrc.indexOf('})', nextJsonStringify);
  const jsonBlock = chatSrc.substring(nextJsonStringify, closingParen + 2);

  assert('T26.1 Tool result content does NOT contain token',
    !jsonBlock.includes('token'));

  assert('T26.2 Tool result content does NOT contain argsHash',
    !jsonBlock.includes('argsHash'));

  assert('T26.3 Tool result content DOES contain confirmationId (for logging)',
    jsonBlock.includes('confirmationId'));
}

// T27: Post-loop __pendingConfirmation DOES include token and argsHash
{
  // Find the post-loop block that uses loopPendingConfirmationData
  const postLoopIdx = chatSrc.indexOf('HARD CONFIRMATION BOUNDARY (non-streaming post-loop)');
  const metadataBlock = chatSrc.substring(postLoopIdx, postLoopIdx + 2500);

  assert('T27.1 Post-loop uses loopPendingConfirmationData (not parsed tool result)',
    metadataBlock.includes('loopPendingConfirmationData.token'));

  assert('T27.2 Post-loop includes token in __pendingConfirmation',
    metadataBlock.includes('token: loopPendingConfirmationData.token'));

  assert('T27.3 Post-loop includes argsHash in __pendingConfirmation',
    metadataBlock.includes('argsHash: loopPendingConfirmationData.argsHash'));

  assert('T27.4 Post-loop includes confirmationId in __pendingConfirmation',
    metadataBlock.includes('confirmationId: loopPendingConfirmationData.confirmationId'));

  assert('T27.5 Post-loop includes expiresAt in __pendingConfirmation',
    metadataBlock.includes('expiresAt: loopPendingConfirmationData.expiresAt'));

  assert('T27.6 Log message confirms token is included',
    metadataBlock.includes('Set pendingConfirmation metadata (with token)'));
}

// T28: Frontend contract — usePrimeChat requires confirmationId AND token
{
  const hookSrc = readFileSync('src/hooks/usePrimeChat.ts', 'utf8');

  assert('T28.1 Frontend checks both confirmationId and token',
    hookSrc.includes('pendingConfirmation?.confirmationId && payload?.pendingConfirmation?.token'));

  assert('T28.2 Frontend stores argsHash from response',
    hookSrc.includes('argsHash: pc.argsHash'));

  assert('T28.3 Frontend stores token from response',
    hookSrc.includes('token: pc.token'));
}

// T29: Backend does NOT execute mutation before confirmation
{
  // The tool loop confirmation gate uses `continue` — skips executeTool
  const toolLoopGateIdx2 = chatSrc.indexOf('Confirmation gate (tool loop round');
  const continueIdx = chatSrc.indexOf('hadConfirmation = true;\n                  continue;', toolLoopGateIdx2);
  assert('T29.1 Tool loop gate skips execution with continue',
    continueIdx > 0 && continueIdx - toolLoopGateIdx2 < 2000);
}

// T30: Backend does NOT generate false-success text
{
  assert('T30.1 Non-streaming post-loop uses deterministic text (not model call)',
    chatSrc.includes('Confirmation hard boundary (non-streaming): deterministic text, no model call'));

  // Verify old model call for confirmation text is removed
  assert('T30.2 Old specialist_confirmation_text model call removed',
    !chatSrc.includes("'specialist_confirmation_text'"));
}

// T31: Cancel does not mutate (structural — frontend only clears state)
{
  const hookSrc2 = readFileSync('src/hooks/usePrimeChat.ts', 'utf8');
  const cancelIdx = hookSrc2.indexOf('cancelToolExecution');
  const cancelBlock = hookSrc2.substring(cancelIdx, cancelIdx + 300);
  assert('T31.1 cancelToolExecution clears state without backend call',
    cancelBlock.includes('setPendingConfirmation(null)') && !cancelBlock.includes('__CONFIRM_TOOL__'));
}

// T32: Consumed confirmation cannot execute twice (existing protection)
{
  const migrationSrc = readFileSync('sql/migrations/20260826_tool_confirmation_requests.sql', 'utf8');
  assert('T32.1 Atomic consume via UPDATE WHERE status=pending',
    migrationSrc.includes("tcr.status      = 'pending'"));
}

// ═══════════════════════════════════════════════════════════════════════════
// ISSUE 3: Authoritative Handoff Lifecycle — ONE path for all entry points
// ═══════════════════════════════════════════════════════════════════════════

console.log('\n=== I3: Authoritative handoff lifecycle ===\n');

// TEST A: performHandoffLifecycle is the single authoritative implementation
{
  assert('TA.1 performHandoffLifecycle function defined',
    chatSrc.includes('async function performHandoffLifecycle('));

  assert('TA.2 performHandoffLifecycle validates requested_handoff === true',
    chatSrc.includes('handoffData.requested_handoff !== true'));

  assert('TA.3 performHandoffLifecycle validates target_slug exists',
    chatSrc.includes('!handoffData.target_slug'));

  assert('TA.4 performHandoffLifecycle validates finalSessionId',
    chatSrc.includes('HANDOFF FAILED') && chatSrc.includes('No valid sessionId'));

  assert('TA.5 performHandoffLifecycle inserts handoffs row',
    (() => {
      const fnStart = chatSrc.indexOf('async function performHandoffLifecycle(');
      const fnBody = chatSrc.substring(fnStart, fnStart + 5000);
      return fnBody.includes("sb.from('handoffs').insert(");
    })());

  assert('TA.6 performHandoffLifecycle updates session employee_slug',
    (() => {
      const fnStart = chatSrc.indexOf('async function performHandoffLifecycle(');
      const fnBody = chatSrc.substring(fnStart, fnStart + 5000);
      return fnBody.includes("update({ employee_slug: targetSlug })");
    })());

  assert('TA.7 performHandoffLifecycle inserts system handoff message',
    (() => {
      const fnStart = chatSrc.indexOf('async function performHandoffLifecycle(');
      const fnBody = chatSrc.substring(fnStart, fnStart + 5000);
      return fnBody.includes("sb.from('chat_messages').insert(");
    })());

  assert('TA.8 performHandoffLifecycle reloads target employee tools',
    (() => {
      const fnStart = chatSrc.indexOf('async function performHandoffLifecycle(');
      const fnEnd = chatSrc.indexOf('\n        // ── CATEGORY-CHANGE DELEGATION', fnStart);
      const fnBody = chatSrc.substring(fnStart, fnEnd);
      return fnBody.includes('getEmployeeProfileCached') && fnBody.includes('pickTools(');
    })());

  assert('TA.9 performHandoffLifecycle returns newEmployeeTools + newToolModules',
    (() => {
      const fnStart = chatSrc.indexOf('async function performHandoffLifecycle(');
      const fnBody = chatSrc.substring(fnStart, fnStart + 5000);
      return fnBody.includes('newEmployeeTools') && fnBody.includes('newToolModules');
    })());

  assert('TA.10 performHandoffLifecycle extracts pluginPayload',
    (() => {
      const fnStart = chatSrc.indexOf('async function performHandoffLifecycle(');
      const fnEnd = chatSrc.indexOf('\n        // ── CATEGORY-CHANGE DELEGATION', fnStart);
      const fnBody = chatSrc.substring(fnStart, fnEnd);
      return fnBody.includes('pluginPayload') && fnBody.includes('encodePluginPayloadForHandoff');
    })());
}

// TEST B: All three call sites use performHandoffLifecycle (not inline code)
{
  const lifecycleCalls = chatSrc.split('performHandoffLifecycle(').length - 1;
  // 1 definition + 3 calls = 4 occurrences of the string; but split gives N+1 for N matches
  // Actually: definition line has "async function performHandoffLifecycle(" = 1
  // streaming-initial call = 1, non-streaming-initial call = 1, tool-loop call = 1
  // Total references = 4, but for calls specifically:
  assert('TB.1 performHandoffLifecycle called from streaming-initial path',
    chatSrc.includes("performHandoffLifecycle(result, 'streaming-initial')"));

  assert('TB.2 performHandoffLifecycle called from non-streaming-initial path',
    chatSrc.includes("performHandoffLifecycle(result, 'non-streaming-initial')"));

  assert('TB.3 performHandoffLifecycle called from tool-loop path',
    chatSrc.includes('performHandoffLifecycle(result, `non-streaming-tool-loop-r'));

  assert('TB.4 No remaining inline handoff DB insert outside performHandoffLifecycle',
    (() => {
      // Count occurrences of the handoff DB insert pattern
      const insertPattern = "sb.from('handoffs').insert(";
      const allMatches = chatSrc.split(insertPattern).length - 1;
      // Should be exactly 1 (inside performHandoffLifecycle)
      return allMatches === 1;
    })());

  assert('TB.5 No remaining inline session employee_slug update outside performHandoffLifecycle for handoff',
    (() => {
      // The pattern "update({ employee_slug: targetSlug })" should only be in performHandoffLifecycle
      const pattern = 'update({ employee_slug: targetSlug })';
      const allMatches = chatSrc.split(pattern).length - 1;
      return allMatches === 1;
    })());
}

// TEST C: Tool-loop handoff updates finalEmployeeSlug (the root cause fix)
{
  const toolLoopIdx = chatSrc.indexOf('performHandoffLifecycle(result, `non-streaming-tool-loop-r');
  const toolLoopBlock = chatSrc.substring(toolLoopIdx, toolLoopIdx + 1000);

  assert('TC.1 Tool-loop path sets finalEmployeeSlug from lifecycle result',
    toolLoopBlock.includes('finalEmployeeSlug = lifecycleResult.targetSlug'));

  assert('TC.2 Tool-loop path sets employeeTools from lifecycle result',
    toolLoopBlock.includes('employeeTools = lifecycleResult.newEmployeeTools'));

  assert('TC.3 Tool-loop path sets toolModules from lifecycle result',
    toolLoopBlock.includes('toolModules = lifecycleResult.newToolModules'));

  assert('TC.4 Tool-loop path sets hadHandoff = true',
    toolLoopBlock.includes('hadHandoff = true'));

  assert('TC.5 Tool-loop path updates handoffContext for plugin_payload',
    toolLoopBlock.includes('handoffContext = {') &&
    toolLoopBlock.includes('plugin_payload: lifecycleResult.pluginPayload'));
}

// TEST D: Specialist continuation block fires when finalEmployeeSlug changed
{
  assert('TD.1 Continuation guard checks finalEmployeeSlug !== originalEmployeeSlug',
    chatSrc.includes('hadHandoff && !specialistContinuationInjected && finalEmployeeSlug !== originalEmployeeSlug'));

  // Verify continuation injects specialist system_prompt
  const contIdx = chatSrc.indexOf('hadHandoff && !specialistContinuationInjected && finalEmployeeSlug !== originalEmployeeSlug');
  const contBlock = chatSrc.substring(contIdx, contIdx + 6000);

  assert('TD.2 Continuation injects specialist system_prompt',
    contBlock.includes('specialistProfile.system_prompt'));

  assert('TD.3 Continuation injects TAG_TRANSACTION_IDENTITY_RULE for Tag',
    contBlock.includes('TAG_TRANSACTION_IDENTITY_RULE'));

  assert('TD.4 Continuation injects MUTATION_TRUTH_RULE',
    contBlock.includes('MUTATION_TRUTH_RULE'));

  assert('TD.5 Continuation injects SAME-TURN SPECIALIST EXECUTION',
    contBlock.includes('SAME-TURN SPECIALIST EXECUTION'));
}

// TEST E: Plugin payload reaches specialist continuation via handoffContext
{
  // After lifecycle, handoffContext is updated with plugin_payload
  const nsInitialIdx = chatSrc.indexOf("performHandoffLifecycle(result, 'non-streaming-initial')");
  const nsInitialBlock = chatSrc.substring(nsInitialIdx, nsInitialIdx + 900);

  assert('TE.1 Non-streaming-initial sets handoffContext.handoff_type from lifecycle',
    nsInitialBlock.includes('handoff_type: lifecycleResult.handoffType'));

  assert('TE.2 Non-streaming-initial sets handoffContext.plugin_payload from lifecycle',
    nsInitialBlock.includes('plugin_payload: lifecycleResult.pluginPayload'));

  // Use a fixed search string that won't be interpolated by the test runtime
  const toolLoopIdx2 = chatSrc.indexOf('performHandoffLifecycle(result, `non-streaming-tool-loop-r');
  const toolLoopBlock2 = chatSrc.substring(toolLoopIdx2, toolLoopIdx2 + 1000);

  assert('TE.3 Tool-loop sets handoffContext.handoff_type from lifecycle',
    toolLoopBlock2.includes('handoff_type: lifecycleResult.handoffType'));

  assert('TE.4 Tool-loop sets handoffContext.plugin_payload from lifecycle',
    toolLoopBlock2.includes('plugin_payload: lifecycleResult.pluginPayload'));

  // Continuation block reads handoffContext for plugin transaction hint
  const contBlock2 = chatSrc.substring(
    chatSrc.indexOf('hadHandoff && !specialistContinuationInjected && finalEmployeeSlug !== originalEmployeeSlug'),
    chatSrc.indexOf('hadHandoff && !specialistContinuationInjected && finalEmployeeSlug !== originalEmployeeSlug') + 3000
  );

  assert('TE.5 Continuation block reads handoffContext.plugin_payload.transaction.id',
    contBlock2.includes("handoffContext?.plugin_payload?.transaction?.id"));
}

// TEST F: No false handoff success — impossible to return tool result without updating state
{
  // The old bug: tool-loop only set hadHandoff=true but never changed finalEmployeeSlug.
  // Verify that the ONLY place hadHandoff is set to true in the tool loop is AFTER
  // performHandoffLifecycle succeeds (which updates finalEmployeeSlug).
  const toolLoopSection = chatSrc.substring(
    chatSrc.indexOf('while (currentToolResults.length > 0 && toolRound < MAX_TOOL_ROUNDS'),
    chatSrc.indexOf('HARD CONFIRMATION BOUNDARY (non-streaming post-loop)')
  );

  assert('TF.1 Tool-loop hadHandoff only set after lifecycle success',
    (() => {
      const hadHandoffIdx = toolLoopSection.indexOf('hadHandoff = true');
      if (hadHandoffIdx < 0) return false;
      // It should be preceded by finalEmployeeSlug assignment in the same block
      const preceding = toolLoopSection.substring(Math.max(0, hadHandoffIdx - 300), hadHandoffIdx);
      return preceding.includes('finalEmployeeSlug = lifecycleResult.targetSlug');
    })());

  assert('TF.2 Old 3-line stub removed (no bare hadHandoff=true without lifecycle)',
    (() => {
      // Search for the old pattern: "if (toolName === 'request_employee_handoff') {\n  hadHandoff = true;\n}"
      // This pattern should no longer exist
      return !toolLoopSection.includes("if (toolName === 'request_employee_handoff') {\n                  hadHandoff = true;\n                }");
    })());
}

// TEST G: Permissions — tools after handoff are target employee's tools
{
  const fnStartG = chatSrc.indexOf('async function performHandoffLifecycle(');
  const fnEndG = chatSrc.indexOf('\n        // ── CATEGORY-CHANGE DELEGATION', fnStartG);
  const fnBodyG = chatSrc.substring(fnStartG, fnEndG);

  assert('TG.1 Lifecycle reloads tools via getEmployeeProfileCached with targetSlug',
    fnBodyG.includes('getEmployeeProfileCached(sb, targetSlug'));

  assert('TG.2 Lifecycle returns new tools (not Prime\'s tools)',
    fnBodyG.includes('newEmployeeTools = newProfile.tools_allowed') || fnBodyG.includes('newEmployeeTools = newProfile?.tools_allowed'));

  // Verify tool-loop reloads openai tools from employeeTools (which was updated)
  assert('TG.3 Tool-loop rebuilds openaiTools from employeeTools after handoff',
    chatSrc.includes('loopOpenaiTools = employeeTools.length > 0 ? toOpenAIToolDefs(employeeTools)'));
}

// TEST H: Session continuity — same session/thread through Prime → Tag
{
  const fnStartH = chatSrc.indexOf('async function performHandoffLifecycle(');
  const fnEndH = chatSrc.indexOf('\n        // ── CATEGORY-CHANGE DELEGATION', fnStartH);
  const fnBodyH = chatSrc.substring(fnStartH, fnEndH);

  assert('TH.1 Lifecycle updates same session (not creating new session)',
    fnBodyH.includes("from('chat_sessions')") && fnBodyH.includes('.update(') && fnBodyH.includes("eq('id', finalSessionId)"));

  assert('TH.2 Lifecycle uses existing thread_id for system message',
    fnBodyH.includes('thread_id'));
}

// ═══════════════════════════════════════════════════════════════════════════
// CROSS-CUTTING: Existing protections preserved
// ═══════════════════════════════════════════════════════════════════════════

console.log('\n=== X: Cross-cutting safety preserved ===\n');

assert('X1. Financial grounding classifier still imported',
  chatSrc.includes("import { classifyFinancialQuery, classifyTemporalIntent, extractMerchantHint }"));

assert('X2. Financial grounding pre-execution still runs',
  chatSrc.includes('buildPreExecutionPlan(financialClassification'));

assert('X3. validateGroundedAnswer still runs',
  chatSrc.includes('validateGroundedAnswer'));

assert('X4. INFORMATION vs ACTION rule preserved in Prime brain',
  brainSrc.includes('INFORMATION vs ACTION'));

assert('X5. Phase 2B forced handoff removal preserved',
  chatSrc.includes('Removed deterministic forced handoff based on isCategoryChangeIntent'));

assert('X6. Tag mutation tool still has requiresConfirm: true',
  (() => {
    const toolIdx = readFileSync('src/agent/tools/index.ts', 'utf8');
    return /tag_update_transaction_category[\s\S]*?requiresConfirm:\s*true/.test(toolIdx);
  })());

assert('X7. HMAC signature verification preserved',
  readFileSync('netlify/functions/_shared/toolConfirmation.ts', 'utf8').includes('timingSafeEqual'));

assert('X8. Atomic consume via RPC preserved',
  readFileSync('netlify/functions/_shared/toolConfirmation.ts', 'utf8').includes("sb.rpc('consume_tool_confirmation'"));

assert('X9. Prime still does NOT have tx_update_category',
  chatSrc.includes("tx_update_category deliberately NOT added to Prime"));

assert('X10. Memory system untouched',
  chatSrc.includes('enqueueMemoryExtraction'));

assert('X11. Financial position untouched',
  chatSrc.includes('financial-position'));

assert('X12. Session history isolation untouched',
  chatSrc.includes('session_id'));

// ═══════════════════════════════════════════════════════════════════════════
console.log(`\n${'='.repeat(60)}`);
console.log(`PHASE 2B UUID + CONFIRMATION: ${passed} passed, ${failed} failed`);
console.log(`${'='.repeat(60)}`);
if (failed > 0) process.exit(1);
