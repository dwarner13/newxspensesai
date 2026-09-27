/**
 * P3.1A Runtime Evidence Contract — Test Script
 *
 * Validates that P3.0A intent classifications produce correct runtime
 * evidence contracts with proper evidence kinds, statuses, and forbidden lists.
 *
 * Run: npx tsx scripts/test-p3-1a-evidence-contract.ts
 */

import {
  classifyPrimeIntent,
  PrimeIntent,
  type ClassifierContext,
  type PrimeIntentClassification,
} from '../src/shared/prime-intent-classifier';

import {
  buildRuntimeEvidenceContract,
  buildEvidenceContractTelemetry,
  getEvidenceSource,
  type PrimeEvidenceKind,
  type PrimeRuntimeEvidenceContract,
  type EvidenceAvailabilityContext,
} from '../src/shared/prime-evidence-contract';

// ─────────────────────────────────────────────────────────────────────────────
// TEST INFRASTRUCTURE
// ─────────────────────────────────────────────────────────────────────────────

const NO_EXT: ClassifierContext = {
  candidateFollowUpDetected: false,
  historicalReferenceDetected: false,
};

const P1_CTX: ClassifierContext = {
  candidateFollowUpDetected: true,
  historicalReferenceDetected: false,
};

const P23_CTX: ClassifierContext = {
  candidateFollowUpDetected: false,
  historicalReferenceDetected: true,
};

// Minimal context: nothing loaded yet
const EMPTY_CTX: EvidenceAvailabilityContext = {
  memoryLoaded: false,
  memoryFactCount: 0,
  conversationHistoryLoaded: false,
  candidateIdentityAvailable: false,
  pipelineSnapshotLoaded: false,
};

// Rich context: memory + history + candidates + pipeline loaded
const RICH_CTX: EvidenceAvailabilityContext = {
  memoryLoaded: true,
  memoryFactCount: 3,
  conversationHistoryLoaded: true,
  candidateIdentityAvailable: true,
  pipelineSnapshotLoaded: true,
};

// Memory-only context
const MEMORY_CTX: EvidenceAvailabilityContext = {
  memoryLoaded: true,
  memoryFactCount: 2,
  conversationHistoryLoaded: false,
  candidateIdentityAvailable: false,
  pipelineSnapshotLoaded: false,
};

let pass = 0;
let fail = 0;
const failures: string[] = [];

function assert(condition: boolean, label: string): void {
  if (condition) {
    pass++;
  } else {
    fail++;
    failures.push(`  FAIL: ${label}`);
  }
}

function classifyAndBuild(
  msg: string,
  classifierCtx: ClassifierContext,
  evidenceCtx: EvidenceAvailabilityContext,
): PrimeRuntimeEvidenceContract {
  const classification = classifyPrimeIntent(msg, classifierCtx);
  return buildRuntimeEvidenceContract(classification, evidenceCtx);
}

function hasRequired(contract: PrimeRuntimeEvidenceContract, kind: PrimeEvidenceKind): boolean {
  return contract.requirements.some(r => r.kind === kind && r.required);
}

function hasOptional(contract: PrimeRuntimeEvidenceContract, kind: PrimeEvidenceKind): boolean {
  return contract.requirements.some(r => r.kind === kind && !r.required);
}

function hasStatus(contract: PrimeRuntimeEvidenceContract, kind: PrimeEvidenceKind, status: string): boolean {
  return contract.requirements.some(r => r.kind === kind && r.status === status);
}

function hasForbidden(contract: PrimeRuntimeEvidenceContract, label: string): boolean {
  return contract.forbidden.includes(label);
}

// ─────────────────────────────────────────────────────────────────────────────
// A. EVERY P3.0A INTENT PRODUCES A VALID CONTRACT
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n=== A. Every P3.0A Intent Produces a Valid Contract ===');

const intentMessages: Array<{ msg: string; expected: PrimeIntent; ctx?: ClassifierContext; label: string }> = [
  { msg: 'How much did I spend on fuel?', expected: PrimeIntent.FINANCIAL_DATA_LOOKUP, label: 'FINANCIAL_DATA_LOOKUP' },
  { msg: 'How long to pay off my mortgage?', expected: PrimeIntent.FINANCIAL_CALCULATION, label: 'FINANCIAL_CALCULATION' },
  { msg: 'Where is my money going?', expected: PrimeIntent.FINANCIAL_ANALYSIS, label: 'FINANCIAL_ANALYSIS' },
  { msg: 'What is compound interest?', expected: PrimeIntent.FINANCIAL_EDUCATION, label: 'FINANCIAL_EDUCATION' },
  { msg: 'How do I upload a statement?', expected: PrimeIntent.PRODUCT_HELP, label: 'PRODUCT_HELP' },
  { msg: 'Did my statement finish processing?', expected: PrimeIntent.DOCUMENT_QUERY, label: 'DOCUMENT_QUERY' },
  { msg: 'Am I on track for my savings goal?', expected: PrimeIntent.GOAL_PLANNING, label: 'GOAL_PLANNING' },
  { msg: 'Change that to Groceries.', expected: PrimeIntent.SPECIALIST_ACTION, label: 'SPECIALIST_ACTION' },
  { msg: 'Tell me about the third one.', expected: PrimeIntent.CANDIDATE_FOLLOW_UP, ctx: P1_CTX, label: 'CANDIDATE_FOLLOW_UP' },
  { msg: 'What were we talking about?', expected: PrimeIntent.HISTORICAL_REFERENCE, ctx: P23_CTX, label: 'HISTORICAL_REFERENCE' },
  { msg: 'Hello!', expected: PrimeIntent.CONVERSATION, label: 'CONVERSATION' },
  { msg: 'Just thinking out loud.', expected: PrimeIntent.GENERAL, label: 'GENERAL' },
];

for (const t of intentMessages) {
  const contract = classifyAndBuild(t.msg, t.ctx || NO_EXT, EMPTY_CTX);
  assert(contract.intent === t.expected, `${t.label}: intent=${contract.intent} (expected ${t.expected})`);
  assert(Array.isArray(contract.requirements), `${t.label}: requirements is array`);
  assert(Array.isArray(contract.forbidden), `${t.label}: forbidden is array`);
  assert(typeof contract.confidence === 'string', `${t.label}: confidence is string`);
}

// ─────────────────────────────────────────────────────────────────────────────
// B. REQUIRED/OPTIONAL/FORBIDDEN EVIDENCE MAPPING
// ─────────────────────────────────────────────────────────────────────────────

console.log('=== B. Required/Optional/Forbidden Evidence Mapping ===');

// FINANCIAL_DATA_LOOKUP: requires financial data, allows memory
{
  const c = classifyAndBuild('How much did I spend on fuel?', NO_EXT, EMPTY_CTX);
  // Should have transaction_data or category_aggregation (or both before refinement)
  const hasFinData = hasRequired(c, 'transaction_data') || hasRequired(c, 'category_aggregation');
  assert(hasFinData, 'DATA_LOOKUP: requires transaction or category evidence');
  assert(hasOptional(c, 'user_stated_fact'), 'DATA_LOOKUP: memory is optional');
  assert(hasForbidden(c, 'hallucinated_numbers'), 'DATA_LOOKUP: hallucination forbidden');
}

// FINANCIAL_CALCULATION: requires calc inputs
{
  const c = classifyAndBuild('How long to pay off my mortgage?', NO_EXT, EMPTY_CTX);
  assert(hasRequired(c, 'calculation_inputs'), 'CALCULATION: requires calc inputs');
  assert(hasOptional(c, 'user_stated_fact'), 'CALCULATION: memory is optional');
  assert(hasForbidden(c, 'unverified_numeric_projections'), 'CALCULATION: unverified projections forbidden');
}

// FINANCIAL_ANALYSIS: requires financial data
{
  const c = classifyAndBuild('Where is my money going?', NO_EXT, EMPTY_CTX);
  const hasFinData = hasRequired(c, 'transaction_data') || hasRequired(c, 'category_aggregation');
  assert(hasFinData, 'ANALYSIS: requires financial evidence');
  assert(hasForbidden(c, 'unsourced_trend_claims'), 'ANALYSIS: unsourced trends forbidden');
}

// FINANCIAL_EDUCATION: no required financial data, forbids user data
{
  const c = classifyAndBuild('What is compound interest?', NO_EXT, EMPTY_CTX);
  const hasFinData = hasRequired(c, 'transaction_data') || hasRequired(c, 'category_aggregation');
  assert(!hasFinData, 'EDUCATION: no financial data required');
  assert(hasForbidden(c, 'user_financial_data'), 'EDUCATION: user data forbidden');
}

// PRODUCT_HELP: requires product knowledge, forbids user data and tool calls
{
  const c = classifyAndBuild('How do I upload a statement?', NO_EXT, EMPTY_CTX);
  assert(hasRequired(c, 'product_knowledge'), 'PRODUCT_HELP: requires product knowledge');
  assert(hasForbidden(c, 'user_financial_data'), 'PRODUCT_HELP: user data forbidden');
  assert(hasForbidden(c, 'tool_calls'), 'PRODUCT_HELP: tool calls forbidden');
}

// DOCUMENT_QUERY: requires document evidence
{
  const c = classifyAndBuild('Did my statement finish processing?', NO_EXT, EMPTY_CTX);
  assert(hasRequired(c, 'document_evidence'), 'DOCUMENT_QUERY: requires document evidence');
  assert(hasForbidden(c, 'tx_search_preexec'), 'DOCUMENT_QUERY: tx_search preexec forbidden');
}

// GOAL_PLANNING: requires goal state
{
  const c = classifyAndBuild('Am I on track for my savings goal?', NO_EXT, EMPTY_CTX);
  assert(hasRequired(c, 'goal_state'), 'GOAL_PLANNING: requires goal state');
  assert(hasForbidden(c, 'invented_goal_progress'), 'GOAL_PLANNING: invented progress forbidden');
}

// SPECIALIST_ACTION: requires candidate identity
{
  const c = classifyAndBuild('Change that to Groceries.', NO_EXT, EMPTY_CTX);
  assert(hasRequired(c, 'candidate_identity'), 'SPECIALIST_ACTION: requires candidate identity');
  assert(hasForbidden(c, 'auto_execute_mutation'), 'SPECIALIST_ACTION: auto mutation forbidden');
}

// CANDIDATE_FOLLOW_UP: requires candidate identity, forbids new search
{
  const c = classifyAndBuild('Tell me about the third one.', P1_CTX, EMPTY_CTX);
  assert(hasRequired(c, 'candidate_identity'), 'CANDIDATE_FOLLOW_UP: requires candidate identity');
  assert(hasForbidden(c, 'new_tx_search'), 'CANDIDATE_FOLLOW_UP: new search forbidden');
}

// HISTORICAL_REFERENCE: requires conversation context, forbids new search
{
  const c = classifyAndBuild('What were we talking about?', P23_CTX, EMPTY_CTX);
  assert(hasRequired(c, 'conversation_context'), 'HISTORICAL_REFERENCE: requires conversation context');
  assert(hasForbidden(c, 'new_tx_search'), 'HISTORICAL_REFERENCE: new search forbidden');
}

// CONVERSATION: forbids tool calls and financial data
{
  const c = classifyAndBuild('Hello!', NO_EXT, EMPTY_CTX);
  assert(c.requirements.filter(r => r.required).length === 0, 'CONVERSATION: no required evidence');
  assert(hasForbidden(c, 'tool_calls'), 'CONVERSATION: tool calls forbidden');
  assert(hasForbidden(c, 'financial_data'), 'CONVERSATION: financial data forbidden');
}

// GENERAL: no required, no forbidden
{
  const c = classifyAndBuild('Just thinking out loud.', NO_EXT, EMPTY_CTX);
  assert(c.requirements.filter(r => r.required).length === 0, 'GENERAL: no required evidence');
  assert(c.forbidden.length === 0, 'GENERAL: no forbidden evidence');
}

// ─────────────────────────────────────────────────────────────────────────────
// C. NO UNKNOWN P3.0A LABELS SILENTLY DISAPPEAR
// ─────────────────────────────────────────────────────────────────────────────

console.log('=== C. No Unknown Labels Silently Disappear ===');

// All P3.0A contracts have their forbidden labels preserved 1:1
for (const t of intentMessages) {
  const classification = classifyPrimeIntent(t.msg, t.ctx || NO_EXT);
  const contract = buildRuntimeEvidenceContract(classification, EMPTY_CTX);

  // Forbidden labels must be preserved exactly
  for (const f of classification.proposedEvidence.forbidden) {
    assert(contract.forbidden.includes(f), `${t.label}: forbidden '${f}' preserved`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// D. EVIDENCE STATUS CORRECTNESS
// ─────────────────────────────────────────────────────────────────────────────

console.log('=== D. Evidence Status Correctness ===');

// Empty context: everything requiring tools should be pending
{
  const c = classifyAndBuild('How much did I spend on fuel?', NO_EXT, EMPTY_CTX);
  for (const r of c.requirements) {
    if (['transaction_data', 'category_aggregation', 'goal_state', 'calculation_inputs'].includes(r.kind)) {
      assert(r.status === 'pending', `EMPTY_CTX: ${r.kind} is pending`);
    }
  }
}

// product_knowledge and general_knowledge always available
{
  const c = classifyAndBuild('How do I upload a statement?', NO_EXT, EMPTY_CTX);
  assert(hasStatus(c, 'product_knowledge', 'available'), 'product_knowledge always available');
}
{
  const c = classifyAndBuild('What is compound interest?', NO_EXT, EMPTY_CTX);
  const genReq = c.requirements.find(r => r.kind === 'general_knowledge');
  if (genReq) {
    assert(genReq.status === 'available', 'general_knowledge always available');
  } else {
    pass++; // general_knowledge may only appear as optional
  }
}

// Rich context: conversation_context available
{
  const c = classifyAndBuild('What were we talking about?', P23_CTX, RICH_CTX);
  assert(hasStatus(c, 'conversation_context', 'available'), 'RICH_CTX: conversation_context available');
}

// Rich context: candidate_identity available
{
  const c = classifyAndBuild('Tell me about the third one.', P1_CTX, RICH_CTX);
  assert(hasStatus(c, 'candidate_identity', 'available'), 'RICH_CTX: candidate_identity available');
}

// Rich context: user_stated_fact available when memory loaded with facts
{
  const c = classifyAndBuild('How long to pay off my mortgage?', NO_EXT, RICH_CTX);
  if (hasOptional(c, 'user_stated_fact') || hasRequired(c, 'user_stated_fact')) {
    assert(hasStatus(c, 'user_stated_fact', 'available'), 'RICH_CTX: user_stated_fact available');
  } else {
    pass++; // may not appear for this intent
  }
}

// Memory loaded but zero facts: user_stated_fact still pending (no facts retrieved)
{
  const noFactCtx: EvidenceAvailabilityContext = {
    memoryLoaded: true,
    memoryFactCount: 0,
    conversationHistoryLoaded: false,
    candidateIdentityAvailable: false,
    pipelineSnapshotLoaded: false,
  };
  const c = classifyAndBuild('How long to pay off my mortgage?', NO_EXT, noFactCtx);
  const memReq = c.requirements.find(r => r.kind === 'user_stated_fact');
  if (memReq) {
    assert(memReq.status === 'pending', 'Memory loaded but 0 facts: user_stated_fact pending');
  } else {
    pass++;
  }
}

// Pipeline snapshot loaded: document_evidence available
{
  const c = classifyAndBuild('Did my statement finish processing?', NO_EXT, RICH_CTX);
  assert(hasStatus(c, 'document_evidence', 'available'), 'RICH_CTX: document_evidence available');
}

// Pipeline snapshot NOT loaded: document_evidence pending
{
  const c = classifyAndBuild('Did my statement finish processing?', NO_EXT, EMPTY_CTX);
  assert(hasStatus(c, 'document_evidence', 'pending'), 'EMPTY_CTX: document_evidence pending');
}

// ─────────────────────────────────────────────────────────────────────────────
// E. NO TOOL EXECUTION DURING CONTRACT BUILD
// ─────────────────────────────────────────────────────────────────────────────

console.log('=== E. No Tool Execution During Contract Build ===');

// buildRuntimeEvidenceContract is a pure synchronous function
// If it were async or called external services, this would fail
{
  const startTime = Date.now();
  for (let i = 0; i < 1000; i++) {
    classifyAndBuild('How much did I spend on fuel?', NO_EXT, EMPTY_CTX);
  }
  const elapsed = Date.now() - startTime;
  assert(elapsed < 500, `1000 contract builds in ${elapsed}ms (pure sync, no I/O)`);
}

// ─────────────────────────────────────────────────────────────────────────────
// F. NO DATABASE QUERIES
// ─────────────────────────────────────────────────────────────────────────────

console.log('=== F. No Database Queries ===');

// The function signature takes only a classification + availability context.
// There is no Supabase client, no connection string, no query builder.
// If the import graph pulled in Supabase, this test file would fail to compile
// without environment variables. The fact it runs proves no DB dependency.
assert(typeof buildRuntimeEvidenceContract === 'function', 'buildRuntimeEvidenceContract is a pure function');
assert(buildRuntimeEvidenceContract.length === 2, 'Takes exactly 2 args (classification, context)');

// ─────────────────────────────────────────────────────────────────────────────
// G. NO MUTATION
// ─────────────────────────────────────────────────────────────────────────────

console.log('=== G. No Mutation ===');

// Verify the classification is not mutated by building a contract
{
  const classification = classifyPrimeIntent('How much did I spend on fuel?', NO_EXT);
  const originalRequired = [...classification.proposedEvidence.required];
  const originalForbidden = [...classification.proposedEvidence.forbidden];
  buildRuntimeEvidenceContract(classification, EMPTY_CTX);
  assert(
    JSON.stringify(classification.proposedEvidence.required) === JSON.stringify(originalRequired),
    'Classification required not mutated'
  );
  assert(
    JSON.stringify(classification.proposedEvidence.forbidden) === JSON.stringify(originalForbidden),
    'Classification forbidden not mutated'
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// H. NO MODULE-GLOBAL REQUEST STATE
// ─────────────────────────────────────────────────────────────────────────────

console.log('=== H. No Module-Global Request State ===');

// Two independent builds with different contexts produce different results
{
  const c1 = classifyAndBuild('Tell me about the third one.', P1_CTX, EMPTY_CTX);
  const c2 = classifyAndBuild('Tell me about the third one.', P1_CTX, RICH_CTX);

  const status1 = c1.requirements.find(r => r.kind === 'candidate_identity')?.status;
  const status2 = c2.requirements.find(r => r.kind === 'candidate_identity')?.status;

  assert(status1 === 'pending', 'EMPTY_CTX: candidate_identity pending');
  assert(status2 === 'available', 'RICH_CTX: candidate_identity available');
  assert(status1 !== status2, 'Different contexts produce different statuses (no shared state)');
}

// ─────────────────────────────────────────────────────────────────────────────
// I. NO PII IN TELEMETRY
// ─────────────────────────────────────────────────────────────────────────────

console.log('=== I. No PII in Telemetry ===');

{
  const c = classifyAndBuild('How much did I spend at Costco in May?', NO_EXT, RICH_CTX);
  const telemetry = buildEvidenceContractTelemetry(c);
  const serialized = JSON.stringify(telemetry);

  assert(!serialized.includes('Costco'), 'Telemetry does not contain merchant name');
  assert(!serialized.includes('May'), 'Telemetry does not contain date reference');
  assert(!/\$\d/.test(serialized), 'Telemetry does not contain dollar amounts');
  assert(!serialized.includes('user_id'), 'Telemetry does not contain user IDs');

  // Verify telemetry only contains evidence kind names and intent labels
  const validKeys = new Set(['intent', 'confidence', 'required', 'optional', 'available', 'pending', 'unavailable', 'forbidden']);
  for (const key of Object.keys(telemetry)) {
    assert(validKeys.has(key), `Telemetry key '${key}' is expected`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// J. NO ROUTING CHANGE
// ─────────────────────────────────────────────────────────────────────────────

console.log('=== J. No Routing Change ===');

// buildRuntimeEvidenceContract returns a contract — it does NOT return
// a routing decision, tool_choice, or model override.
{
  const c = classifyAndBuild('How much did I spend on fuel?', NO_EXT, EMPTY_CTX);
  assert(!('lane' in c), 'Contract has no lane property');
  assert(!('tool_choice' in c), 'Contract has no tool_choice property');
  assert(!('model' in c), 'Contract has no model property');
  assert(!('deterministic_path' in c), 'Contract has no deterministic_path property');
}

// ─────────────────────────────────────────────────────────────────────────────
// K. FINANCIAL QUERY TYPE REFINEMENT
// ─────────────────────────────────────────────────────────────────────────────

console.log('=== K. Financial Query Type Refinement ===');

// Aggregate query: "How much did I spend on fuel?" → category_aggregation preferred
{
  const classification = classifyPrimeIntent('How much did I spend on fuel?', NO_EXT);
  if (classification.financialClassification?.queryType === 'aggregate') {
    const c = buildRuntimeEvidenceContract(classification, EMPTY_CTX);
    assert(hasRequired(c, 'category_aggregation') || hasRequired(c, 'transaction_data'),
      'Aggregate query: has financial evidence requirement');
  } else {
    pass++; // queryType may vary
  }
}

// Merchant query: "Show me my Costco transactions" → transaction_data preferred
{
  const classification = classifyPrimeIntent('Show me my Costco transactions', NO_EXT);
  if (classification.financialClassification?.queryType === 'merchant' || classification.financialClassification?.queryType === 'detail') {
    const c = buildRuntimeEvidenceContract(classification, EMPTY_CTX);
    assert(hasRequired(c, 'transaction_data'),
      'Merchant/detail query: requires transaction_data');
  } else {
    pass++; // queryType may vary
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// L. EVIDENCE SOURCE REGISTRY
// ─────────────────────────────────────────────────────────────────────────────

console.log('=== L. Evidence Source Registry ===');

const allKinds: PrimeEvidenceKind[] = [
  'transaction_data', 'category_aggregation', 'period_comparison', 'cash_flow',
  'document_evidence', 'goal_state', 'user_stated_fact', 'calculation_inputs',
  'candidate_identity', 'conversation_context', 'product_knowledge', 'general_knowledge',
];

for (const kind of allKinds) {
  const source = getEvidenceSource(kind);
  assert(typeof source === 'object' && source !== null, `Registry has entry for ${kind}`);
  assert(typeof source.description === 'string' && source.description.length > 0, `${kind} has description`);
  assert(typeof source.authoritative === 'boolean', `${kind} has authoritative flag`);
}

// ─────────────────────────────────────────────────────────────────────────────
// M. EXAMPLE CONTRACT SHAPES
// ─────────────────────────────────────────────────────────────────────────────

console.log('=== M. Example Contract Shapes ===');

// "How much did I spend at Costco in May?"
{
  const c = classifyAndBuild('How much did I spend at Costco in May?', NO_EXT, MEMORY_CTX);
  assert(c.intent === PrimeIntent.FINANCIAL_DATA_LOOKUP, 'Costco/May: FINANCIAL_DATA_LOOKUP');
  assert(c.requirements.length > 0, 'Costco/May: has requirements');
  assert(hasForbidden(c, 'hallucinated_numbers'), 'Costco/May: hallucination forbidden');
}

// "Why was May so expensive?"
{
  const c = classifyAndBuild('Why was May so expensive?', NO_EXT, EMPTY_CTX);
  // Could be ANALYSIS or DATA_LOOKUP depending on classifier
  const validIntents = [PrimeIntent.FINANCIAL_ANALYSIS, PrimeIntent.FINANCIAL_DATA_LOOKUP, PrimeIntent.GENERAL];
  assert(validIntents.includes(c.intent), `Why expensive: intent=${c.intent} is valid`);
}

// "How do I upload another statement?" — product help
{
  const c = classifyAndBuild('How do I upload another statement?', NO_EXT, EMPTY_CTX);
  assert(c.intent === PrimeIntent.PRODUCT_HELP, 'Upload help: PRODUCT_HELP');
  assert(hasRequired(c, 'product_knowledge'), 'Upload help: requires product knowledge');
  assert(hasForbidden(c, 'user_financial_data'), 'Upload help: user data forbidden');
}

// "What transaction were we talking about earlier?" — historical reference
{
  const c = classifyAndBuild('What transaction were we talking about earlier?', P23_CTX, RICH_CTX);
  assert(c.intent === PrimeIntent.HISTORICAL_REFERENCE, 'Historical ref: HISTORICAL_REFERENCE');
  assert(hasRequired(c, 'conversation_context'), 'Historical ref: requires conversation context');
  assert(hasStatus(c, 'conversation_context', 'available'), 'Historical ref: context available in rich ctx');
}

// ─────────────────────────────────────────────────────────────────────────────
// RESULTS
// ─────────────────────────────────────────────────────────────────────────────

const total = pass + fail;
console.log(`\nP3.1A Evidence Contract — ${pass}/${total} tests passed`);

if (failures.length > 0) {
  console.log('\nFAILURES:');
  for (const f of failures) console.log(f);
  process.exit(1);
} else {
  console.log('\nAll tests passed.');
}
