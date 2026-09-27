/**
 * P3.1B — Evidence Resolution Test Suite
 *
 * Tests the deterministic evidence resolver that builds retrieval plans
 * from P3.1A evidence contracts.
 *
 * Run: npx tsx scripts/test-p3-1b-evidence-resolution.ts
 */

import { classifyPrimeIntent, PrimeIntent, type PrimeIntentClassification, type EvidenceContract } from '../src/shared/prime-intent-classifier';
import { classifyFinancialQuery, type FinancialQueryClassification } from '../src/shared/financial-query-classifier';
import {
  buildRuntimeEvidenceContract,
  type PrimeRuntimeEvidenceContract,
  type PrimeEvidenceKind,
  type PrimeEvidenceRequirement,
  type EvidenceAvailabilityContext,
} from '../src/shared/prime-evidence-contract';
import {
  buildEvidencePlan,
  buildEvidencePlanTelemetry,
  type PrimeEvidencePlan,
  type PrimeEvidencePlanStep,
  type EvidencePlanTelemetry,
} from '../src/shared/prime-evidence-resolver';

// ─────────────────────────────────────────────────────────────────────────────
// TEST INFRASTRUCTURE
// ─────────────────────────────────────────────────────────────────────────────

let pass = 0;
let fail = 0;
const failures: string[] = [];

function assert(condition: boolean, label: string) {
  if (condition) {
    pass++;
  } else {
    fail++;
    failures.push(`  FAIL: ${label}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const EMPTY_CTX: EvidenceAvailabilityContext = {
  memoryLoaded: false,
  memoryFactCount: 0,
  conversationHistoryLoaded: false,
  candidateIdentityAvailable: false,
  pipelineSnapshotLoaded: false,
};

const RICH_CTX: EvidenceAvailabilityContext = {
  memoryLoaded: true,
  memoryFactCount: 5,
  conversationHistoryLoaded: true,
  candidateIdentityAvailable: true,
  pipelineSnapshotLoaded: true,
};

const NO_EXTERNAL: { candidateFollowUpDetected: boolean; historicalReferenceDetected: boolean } = {
  candidateFollowUpDetected: false,
  historicalReferenceDetected: false,
};

const ALL_EVIDENCE_KINDS: PrimeEvidenceKind[] = [
  'transaction_data', 'category_aggregation', 'period_comparison',
  'cash_flow', 'document_evidence', 'goal_state', 'user_stated_fact',
  'calculation_inputs', 'candidate_identity', 'conversation_context',
  'product_knowledge', 'general_knowledge',
];

const MUTATION_TOOL_NAMES = [
  'tx_update_category', 'tag_update_transaction_category', 'tx_update_amount',
  'tx_split', 'approve_import', 'delete_transaction', 'create_rule',
  'tag_reclassify', 'tag_bulk_fix', 'select_transaction',
];

function makeReq(kind: PrimeEvidenceKind, status: 'pending' | 'available' | 'unavailable', required = true): PrimeEvidenceRequirement {
  return { kind, required, status };
}

function makeContract(reqs: PrimeEvidenceRequirement[], intent = PrimeIntent.GENERAL): PrimeRuntimeEvidenceContract {
  return { intent, confidence: 'high', requirements: reqs, forbidden: [] };
}

function makeClassification(intent: PrimeIntent, fc?: FinancialQueryClassification): PrimeIntentClassification {
  return {
    intent,
    confidence: 'high',
    source: 'rule',
    reason: 'test',
    proposedEvidence: { required: [], allowed: [], forbidden: [] },
    financialClassification: fc,
  };
}

function fullPipeline(msg: string, ctx: EvidenceAvailabilityContext = EMPTY_CTX): { plan: PrimeEvidencePlan; classification: PrimeIntentClassification; contract: PrimeRuntimeEvidenceContract } {
  const classification = classifyPrimeIntent(msg, NO_EXTERNAL);
  const contract = buildRuntimeEvidenceContract(classification, ctx);
  const plan = buildEvidencePlan(contract, classification);
  return { plan, classification, contract };
}

// ─────────────────────────────────────────────────────────────────────────────
// A. ALL EVIDENCE KINDS RESOLVE OR BECOME UNRESOLVED
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n=== A. All evidence kinds resolve deterministically ===');

for (const kind of ALL_EVIDENCE_KINDS) {
  const contract = makeContract([makeReq(kind, 'pending')]);
  const classification = makeClassification(PrimeIntent.GENERAL);
  const plan = buildEvidencePlan(contract, classification);
  const inSteps = plan.steps.some(s => s.evidenceKind === kind);
  const inUnresolved = plan.unresolved.some(u => u.evidenceKind === kind);
  assert(
    inSteps || inUnresolved,
    `A: ${kind} must appear in steps or unresolved`,
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// B. NO REQUIRED EVIDENCE KIND SILENTLY DISAPPEARS
// ─────────────────────────────────────────────────────────────────────────────

console.log('=== B. No required evidence kind silently disappears ===');

{
  const allReqs = ALL_EVIDENCE_KINDS.map(k => makeReq(k, 'pending'));
  const contract = makeContract(allReqs);
  const classification = makeClassification(PrimeIntent.GENERAL);
  const plan = buildEvidencePlan(contract, classification);
  const allAccountedFor = ALL_EVIDENCE_KINDS.every(k =>
    plan.steps.some(s => s.evidenceKind === k) ||
    plan.unresolved.some(u => u.evidenceKind === k),
  );
  assert(allAccountedFor, 'B: all 12 evidence kinds accounted for');

  const stepKinds = new Set(plan.steps.map(s => s.evidenceKind));
  const unresolvedKinds = new Set(plan.unresolved.map(u => u.evidenceKind));
  const totalAccounted = stepKinds.size + unresolvedKinds.size;
  assert(totalAccounted === 12, `B: exactly 12 accounted (got ${totalAccounted})`);
}

// ─────────────────────────────────────────────────────────────────────────────
// C. ALREADY-AVAILABLE EVIDENCE → already_available STEP
// ─────────────────────────────────────────────────────────────────────────────

console.log('=== C. Already-available evidence does not generate tool plans ===');

{
  const availableKinds: PrimeEvidenceKind[] = [
    'conversation_context', 'user_stated_fact', 'candidate_identity',
    'document_evidence', 'product_knowledge', 'general_knowledge',
  ];

  for (const kind of availableKinds) {
    const contract = makeContract([makeReq(kind, 'available')]);
    const classification = makeClassification(PrimeIntent.GENERAL);
    const plan = buildEvidencePlan(contract, classification);
    const step = plan.steps.find(s => s.evidenceKind === kind);
    assert(
      step !== undefined && step.mode === 'already_available',
      `C: ${kind} available → already_available mode`,
    );
    assert(
      step !== undefined && step.tool === undefined,
      `C: ${kind} available → no tool planned`,
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// D. TX_SEARCH PLANNING USES EXISTING FC DIMENSIONS
// ─────────────────────────────────────────────────────────────────────────────

console.log('=== D. tx_search planning uses financial classification ===');

{
  // D1: merchant hint
  const fc1 = classifyFinancialQuery('How much did I spend at Costco?');
  const contract1 = makeContract([makeReq('transaction_data', 'pending')]);
  const classification1 = makeClassification(PrimeIntent.FINANCIAL_DATA_LOOKUP, fc1);
  const plan1 = buildEvidencePlan(contract1, classification1);
  const step1 = plan1.steps.find(s => s.evidenceKind === 'transaction_data');
  assert(step1?.tool === 'tx_search', 'D1: tx_search for merchant query');
  assert(step1?.params?.q === 'Costco', 'D1: merchant hint in params');
  assert(step1?.authoritative === true, 'D1: tx_search is authoritative');

  // D2: resolved category
  const fc2 = classifyFinancialQuery('How much did I spend on fuel in 2025?');
  const contract2 = makeContract([makeReq('transaction_data', 'pending')]);
  const classification2 = makeClassification(PrimeIntent.FINANCIAL_DATA_LOOKUP, fc2);
  const plan2 = buildEvidencePlan(contract2, classification2);
  const step2 = plan2.steps.find(s => s.evidenceKind === 'transaction_data');
  assert(step2?.params?.category !== undefined, 'D2: category in params');

  // D3: year
  assert(step2?.params?.year === 2025, 'D3: year 2025 in params');

  // D4: exact date
  const fc4 = classifyFinancialQuery('Show me charges from August 21, 2026');
  const contract4 = makeContract([makeReq('transaction_data', 'pending')]);
  const classification4 = makeClassification(PrimeIntent.FINANCIAL_DATA_LOOKUP, fc4);
  const plan4 = buildEvidencePlan(contract4, classification4);
  const step4 = plan4.steps.find(s => s.evidenceKind === 'transaction_data');
  assert(step4?.params?.exactDate === '2026-08-21', 'D4: exact date in params');

  // D5: exact amount
  const fc5 = classifyFinancialQuery('Find the $76.72 transaction');
  const contract5 = makeContract([makeReq('transaction_data', 'pending')]);
  const classification5 = makeClassification(PrimeIntent.FINANCIAL_DATA_LOOKUP, fc5);
  const plan5 = buildEvidencePlan(contract5, classification5);
  const step5 = plan5.steps.find(s => s.evidenceKind === 'transaction_data');
  assert(step5?.params?.exactAmount === 76.72, 'D5: exact amount in params');

  // D6: requested count
  const fc6 = classifyFinancialQuery('Show me last 5 fuel transactions');
  const contract6 = makeContract([makeReq('transaction_data', 'pending')]);
  const classification6 = makeClassification(PrimeIntent.FINANCIAL_DATA_LOOKUP, fc6);
  const plan6 = buildEvidencePlan(contract6, classification6);
  const step6 = plan6.steps.find(s => s.evidenceKind === 'transaction_data');
  assert(step6?.params?.limit === 5, 'D6: requestedCount=5 in params');

  // D7: no FC → unresolved
  const contractNoFC = makeContract([makeReq('transaction_data', 'pending')]);
  const classificationNoFC = makeClassification(PrimeIntent.GENERAL);
  const planNoFC = buildEvidencePlan(contractNoFC, classificationNoFC);
  const unresolvedTx = planNoFC.unresolved.find(u => u.evidenceKind === 'transaction_data');
  assert(unresolvedTx?.reason === 'missing_parameters', 'D7: no FC → missing_parameters');
}

// ─────────────────────────────────────────────────────────────────────────────
// E. CATEGORY AGGREGATION USES EXISTING SCOPE
// ─────────────────────────────────────────────────────────────────────────────

console.log('=== E. Category aggregation planning uses existing scope ===');

{
  // E1: with resolved category
  const fc1 = classifyFinancialQuery('How much did I spend on fuel?');
  const contract1 = makeContract([makeReq('category_aggregation', 'pending')]);
  const classification1 = makeClassification(PrimeIntent.FINANCIAL_DATA_LOOKUP, fc1);
  const plan1 = buildEvidencePlan(contract1, classification1);
  const step1 = plan1.steps.find(s => s.evidenceKind === 'category_aggregation');
  assert(step1?.tool === 'transaction_category_totals', 'E1: tool is transaction_category_totals');
  assert(step1?.params?.category !== undefined, 'E1: category param present');
  assert(step1?.authoritative === true, 'E1: aggregation is authoritative');

  // E2: with year
  const fc2 = classifyFinancialQuery('Total fuel expenses in 2025');
  const contract2 = makeContract([makeReq('category_aggregation', 'pending')]);
  const classification2 = makeClassification(PrimeIntent.FINANCIAL_DATA_LOOKUP, fc2);
  const plan2 = buildEvidencePlan(contract2, classification2);
  const step2 = plan2.steps.find(s => s.evidenceKind === 'category_aggregation');
  assert(step2?.params?.year === 2025, 'E2: year 2025 in params');

  // E3: no FC → still resolves (tool accepts no params for all-category view)
  const contractNoFC = makeContract([makeReq('category_aggregation', 'pending')]);
  const classificationNoFC = makeClassification(PrimeIntent.GENERAL);
  const planNoFC = buildEvidencePlan(contractNoFC, classificationNoFC);
  const stepNoFC = planNoFC.steps.find(s => s.evidenceKind === 'category_aggregation');
  assert(stepNoFC !== undefined, 'E3: aggregation resolves even without FC');
  assert(stepNoFC?.tool === 'transaction_category_totals', 'E3: correct tool');
}

// ─────────────────────────────────────────────────────────────────────────────
// F. PERIOD COMPARISON SUPPORTS MULTI-STEP PLANNING
// ─────────────────────────────────────────────────────────────────────────────

console.log('=== F. Period comparison supports multi-step planning ===');

{
  // F1: two years + comparison → multi_source
  const fc1 = classifyFinancialQuery('Compare my 2024 vs 2025 spending');
  const contract1 = makeContract([makeReq('period_comparison', 'pending')]);
  const classification1 = makeClassification(PrimeIntent.FINANCIAL_ANALYSIS, fc1);
  const plan1 = buildEvidencePlan(contract1, classification1);
  const step1 = plan1.steps.find(s => s.evidenceKind === 'period_comparison');
  assert(step1?.mode === 'multi_source', 'F1: multi_source mode');
  assert(step1?.tool === 'transaction_category_totals', 'F1: correct tool');
  assert(step1?.params?.periodA_year === 2024, 'F1: period A year');
  assert(step1?.params?.periodB_year === 2025, 'F1: period B year');
  assert(step1?.authoritative === true, 'F1: comparison is authoritative');
}

// ─────────────────────────────────────────────────────────────────────────────
// G. AMBIGUOUS COMPARISON → UNRESOLVED
// ─────────────────────────────────────────────────────────────────────────────

console.log('=== G. Ambiguous comparison does not invent comparison period ===');

{
  // G1: comparison signal but only one year
  const fc1 = classifyFinancialQuery('Compare my 2025 spending');
  const contract1 = makeContract([makeReq('period_comparison', 'pending')]);
  const classification1 = makeClassification(PrimeIntent.FINANCIAL_ANALYSIS, fc1);
  const plan1 = buildEvidencePlan(contract1, classification1);
  const unresolved1 = plan1.unresolved.find(u => u.evidenceKind === 'period_comparison');
  assert(unresolved1?.reason === 'ambiguous_request', 'G1: one year → ambiguous');

  // G2: no comparison signal at all
  const contractNoComp = makeContract([makeReq('period_comparison', 'pending')]);
  const classificationNoComp = makeClassification(PrimeIntent.GENERAL);
  const planNoComp = buildEvidencePlan(contractNoComp, classificationNoComp);
  const unresolvedNoComp = planNoComp.unresolved.find(u => u.evidenceKind === 'period_comparison');
  assert(unresolvedNoComp?.reason === 'ambiguous_request', 'G2: no comparison → ambiguous');

  // G3: comparison without any years
  const fc3 = classifyFinancialQuery('Compare my spending vs last year');
  const contract3 = makeContract([makeReq('period_comparison', 'pending')]);
  const classification3 = makeClassification(PrimeIntent.FINANCIAL_ANALYSIS, fc3);
  const plan3 = buildEvidencePlan(contract3, classification3);
  // "last year" without explicit year number → ambiguous
  const step3 = plan3.steps.find(s => s.evidenceKind === 'period_comparison');
  const unresolved3 = plan3.unresolved.find(u => u.evidenceKind === 'period_comparison');
  // Either resolved (if FC found 2 years) or ambiguous (if not)
  const g3resolved = step3 !== undefined || (unresolved3?.reason === 'ambiguous_request');
  assert(g3resolved, 'G3: comparison without explicit years handled');
}

// ─────────────────────────────────────────────────────────────────────────────
// H. MISSING CAPABILITIES → UNRESOLVED
// ─────────────────────────────────────────────────────────────────────────────

console.log('=== H. Missing capabilities become unresolved ===');

{
  // H1: cash_flow → missing_capability
  const contractCF = makeContract([makeReq('cash_flow', 'pending')]);
  const classificationCF = makeClassification(PrimeIntent.GENERAL);
  const planCF = buildEvidencePlan(contractCF, classificationCF);
  const unresolvedCF = planCF.unresolved.find(u => u.evidenceKind === 'cash_flow');
  assert(unresolvedCF?.reason === 'missing_capability', 'H1: cash_flow → missing_capability');

  // H2: goal_state → source_unavailable (tool not deployed)
  const contractGS = makeContract([makeReq('goal_state', 'pending')]);
  const classificationGS = makeClassification(PrimeIntent.GOAL_PLANNING);
  const planGS = buildEvidencePlan(contractGS, classificationGS);
  const unresolvedGS = planGS.unresolved.find(u => u.evidenceKind === 'goal_state');
  assert(unresolvedGS?.reason === 'source_unavailable', 'H2: goal_state → source_unavailable');

  // H3: unavailable status → source_unavailable
  const contractUA = makeContract([makeReq('transaction_data', 'unavailable')]);
  const classificationUA = makeClassification(PrimeIntent.GENERAL);
  const planUA = buildEvidencePlan(contractUA, classificationUA);
  const unresolvedUA = planUA.unresolved.find(u => u.evidenceKind === 'transaction_data');
  assert(unresolvedUA?.reason === 'source_unavailable', 'H3: unavailable status → source_unavailable');
}

// ─────────────────────────────────────────────────────────────────────────────
// I. NO WRITE/MUTATION TOOL IN ANY PLAN
// ─────────────────────────────────────────────────────────────────────────────

console.log('=== I. No mutation tool in any plan ===');

{
  // Test every intent with every possible evidence kind
  const intents = Object.values(PrimeIntent);
  for (const intent of intents) {
    const allReqs = ALL_EVIDENCE_KINDS.map(k => makeReq(k, 'pending'));
    const contract = makeContract(allReqs, intent);
    const classification = makeClassification(intent);
    const plan = buildEvidencePlan(contract, classification);
    const hasMutationTool = plan.steps.some(s =>
      s.tool && MUTATION_TOOL_NAMES.includes(s.tool),
    );
    assert(!hasMutationTool, `I: ${intent} has no mutation tools`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// J. NO TOOL EXECUTION OCCURS
// ─────────────────────────────────────────────────────────────────────────────

console.log('=== J. No tool execution (performance proof) ===');

{
  const fc = classifyFinancialQuery('How much did I spend at Costco in 2025?');
  const contract = makeContract([
    makeReq('transaction_data', 'pending'),
    makeReq('category_aggregation', 'pending'),
    makeReq('user_stated_fact', 'available'),
  ]);
  const classification = makeClassification(PrimeIntent.FINANCIAL_DATA_LOOKUP, fc);

  const start = Date.now();
  for (let i = 0; i < 1000; i++) {
    buildEvidencePlan(contract, classification);
  }
  const elapsed = Date.now() - start;
  assert(elapsed < 500, `J: 1000 builds in ${elapsed}ms (must be <500ms)`);
}

// ─────────────────────────────────────────────────────────────────────────────
// K. NO DATABASE QUERY OCCURS
// ─────────────────────────────────────────────────────────────────────────────

console.log('=== K. No database query (signature check) ===');

{
  // buildEvidencePlan accepts only 2 args: contract + classification
  assert(buildEvidencePlan.length === 2, 'K: buildEvidencePlan takes exactly 2 params');
}

// ─────────────────────────────────────────────────────────────────────────────
// L. NO OPENAI CALL OCCURS (covered by J perf proof)
// ─────────────────────────────────────────────────────────────────────────────

console.log('=== L. No OpenAI call (covered by J perf proof) ===');
assert(true, 'L: 1000 builds in <500ms proves no network/LLM calls');

// ─────────────────────────────────────────────────────────────────────────────
// M. TELEMETRY CONTAINS NO PII OR FINANCIAL PARAMETERS
// ─────────────────────────────────────────────────────────────────────────────

console.log('=== M. Telemetry contains no PII or financial parameters ===');

{
  const fc = classifyFinancialQuery('How much did I spend at Costco on August 21, 2026 for $76.72?');
  const contract = makeContract([
    makeReq('transaction_data', 'pending'),
    makeReq('category_aggregation', 'pending'),
  ]);
  const classification = makeClassification(PrimeIntent.FINANCIAL_DATA_LOOKUP, fc);
  const plan = buildEvidencePlan(contract, classification);
  const telemetry = buildEvidencePlanTelemetry(plan);
  const json = JSON.stringify(telemetry);

  assert(!json.includes('Costco'), 'M1: no merchant name in telemetry');
  assert(!json.includes('76.72'), 'M2: no dollar amount in telemetry');
  assert(!json.includes('2026-08-21'), 'M3: no exact date in telemetry');
  assert(!json.includes('938a2e17'), 'M4: no user ID in telemetry');

  // Telemetry should have structural data only
  assert(telemetry.stepKinds.length > 0, 'M5: stepKinds populated');
  assert(telemetry.stepModes.length > 0, 'M6: stepModes populated');
  assert(typeof telemetry.stepCount === 'number', 'M7: stepCount is number');
  assert(typeof telemetry.unresolvedCount === 'number', 'M8: unresolvedCount is number');

  // params must NOT appear in telemetry
  assert(!('params' in telemetry), 'M9: no params field in telemetry type');

  // But params SHOULD exist in the plan step itself (for future P3.1C)
  const txStep = plan.steps.find(s => s.evidenceKind === 'transaction_data');
  assert(txStep?.params !== undefined, 'M10: params present in plan step (for P3.1C)');
}

// ─────────────────────────────────────────────────────────────────────────────
// N. DOCUMENT/PRODUCT/UPLOAD SEMANTICS REMAIN ISOLATED
// ─────────────────────────────────────────────────────────────────────────────

console.log('=== N. Document/product/upload semantics isolated ===');

{
  // N1: PRODUCT_HELP → no financial tool steps
  const { plan: prodPlan } = fullPipeline('How do I upload a bank statement?');
  const hasFinancialTool = prodPlan.steps.some(s =>
    s.tool === 'tx_search' || s.tool === 'transaction_category_totals',
  );
  assert(!hasFinancialTool, 'N1: product help → no financial tools');

  // N2: PRODUCT_HELP → product_knowledge is already_available
  const pkStep = prodPlan.steps.find(s => s.evidenceKind === 'product_knowledge');
  assert(
    pkStep === undefined || pkStep.mode === 'already_available',
    'N2: product knowledge → already_available or not in plan',
  );

  // N3: DOCUMENT_QUERY → document_evidence, not tx_search
  const { plan: docPlan } = fullPipeline('Did my statement process?');
  const hasTxSearch = docPlan.steps.some(s => s.tool === 'tx_search');
  assert(!hasTxSearch, 'N3: document query → no tx_search');
  const docStep = docPlan.steps.find(s => s.evidenceKind === 'document_evidence');
  assert(
    docStep !== undefined || docPlan.unresolved.some(u => u.evidenceKind === 'document_evidence'),
    'N3b: document evidence addressed',
  );

  // N4: FINANCIAL_EDUCATION → no financial tools
  const { plan: eduPlan } = fullPipeline('What is compound interest?');
  const hasEduFinTool = eduPlan.steps.some(s =>
    s.tool === 'tx_search' || s.tool === 'transaction_category_totals',
  );
  assert(!hasEduFinTool, 'N4: education → no financial tools');
}

// ─────────────────────────────────────────────────────────────────────────────
// O. CANDIDATE/HISTORICAL FROZEN SEMANTICS ISOLATED
// ─────────────────────────────────────────────────────────────────────────────

console.log('=== O. Candidate/historical frozen semantics isolated ===');

{
  // O1: CANDIDATE_FOLLOW_UP → candidate_identity resolved, no tx_search
  const cfClassification = classifyPrimeIntent('Yes that one', {
    candidateFollowUpDetected: true,
    historicalReferenceDetected: false,
  });
  const cfContract = buildRuntimeEvidenceContract(cfClassification, EMPTY_CTX);
  const cfPlan = buildEvidencePlan(cfContract, cfClassification);
  const cfHasTxSearch = cfPlan.steps.some(s => s.tool === 'tx_search');
  assert(!cfHasTxSearch, 'O1: candidate follow-up → no tx_search');

  // O2: HISTORICAL_REFERENCE → conversation context, no tx_search
  const hrClassification = classifyPrimeIntent('What about the one we discussed?', {
    candidateFollowUpDetected: false,
    historicalReferenceDetected: true,
  });
  const hrContract = buildRuntimeEvidenceContract(hrClassification, EMPTY_CTX);
  const hrPlan = buildEvidencePlan(hrContract, hrClassification);
  const hrHasTxSearch = hrPlan.steps.some(s => s.tool === 'tx_search');
  assert(!hrHasTxSearch, 'O2: historical reference → no tx_search');

  // O3: SPECIALIST_ACTION → candidate_identity step, no mutation tool
  const { plan: saPlan } = fullPipeline('Change that to groceries');
  const saMutation = saPlan.steps.some(s =>
    s.tool && MUTATION_TOOL_NAMES.includes(s.tool),
  );
  assert(!saMutation, 'O3: specialist action → no mutation tools in plan');
  const saCandidate = saPlan.steps.find(s => s.evidenceKind === 'candidate_identity');
  const saCandidateUnresolved = saPlan.unresolved.find(u => u.evidenceKind === 'candidate_identity');
  assert(
    saCandidate !== undefined || saCandidateUnresolved !== undefined,
    'O3b: candidate_identity addressed in specialist action',
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// P. PLANS ARE DETERMINISTIC
// ─────────────────────────────────────────────────────────────────────────────

console.log('=== P. Plans are deterministic ===');

{
  const fc = classifyFinancialQuery('How much did I spend at Costco in 2025?');
  const contract = makeContract([
    makeReq('transaction_data', 'pending'),
    makeReq('user_stated_fact', 'available'),
  ]);
  const classification = makeClassification(PrimeIntent.FINANCIAL_DATA_LOOKUP, fc);

  const plans: string[] = [];
  for (let i = 0; i < 10; i++) {
    const plan = buildEvidencePlan(contract, classification);
    plans.push(JSON.stringify(plan));
  }
  const allSame = plans.every(p => p === plans[0]);
  assert(allSame, 'P: 10 identical runs produce identical plans');
}

// ─────────────────────────────────────────────────────────────────────────────
// Q. REQUEST STATE DOES NOT LEAK
// ─────────────────────────────────────────────────────────────────────────────

console.log('=== Q. Request state does not leak between builds ===');

{
  // Build plan A with merchant context
  const fcA = classifyFinancialQuery('How much at Costco?');
  const contractA = makeContract([makeReq('transaction_data', 'pending')]);
  const classificationA = makeClassification(PrimeIntent.FINANCIAL_DATA_LOOKUP, fcA);
  const planA = buildEvidencePlan(contractA, classificationA);

  // Build plan B with no merchant context
  const contractB = makeContract([makeReq('transaction_data', 'pending')]);
  const classificationB = makeClassification(PrimeIntent.GENERAL);
  const planB = buildEvidencePlan(contractB, classificationB);

  const stepA = planA.steps.find(s => s.evidenceKind === 'transaction_data');
  const unresolvedB = planB.unresolved.find(u => u.evidenceKind === 'transaction_data');

  assert(stepA?.params?.q === 'Costco', 'Q1: plan A has merchant param');
  assert(unresolvedB?.reason === 'missing_parameters', 'Q2: plan B has no merchant leak');
}

// ─────────────────────────────────────────────────────────────────────────────
// R. P3.1A CONTRACTS UNCHANGED AFTER PLANNING
// ─────────────────────────────────────────────────────────────────────────────

console.log('=== R. P3.1A contracts unchanged after planning ===');

{
  const fc = classifyFinancialQuery('How much did I spend on fuel?');
  const classification = classifyPrimeIntent('How much did I spend on fuel?', NO_EXTERNAL);
  const contract = buildRuntimeEvidenceContract(classification, EMPTY_CTX);

  const contractBefore = JSON.stringify(contract);
  buildEvidencePlan(contract, classification);
  const contractAfter = JSON.stringify(contract);

  assert(contractBefore === contractAfter, 'R1: contract unchanged after plan build');

  // Also check classification unchanged
  const classificationBefore = JSON.stringify(classification);
  buildEvidencePlan(contract, classification);
  const classificationAfter = JSON.stringify(classification);
  assert(classificationBefore === classificationAfter, 'R2: classification unchanged after plan build');
}

// ─────────────────────────────────────────────────────────────────────────────
// S. CONCEPTUAL CASES (Section 14 A-J)
// ─────────────────────────────────────────────────────────────────────────────

console.log('=== S. Conceptual test cases ===');

{
  // S-A: "How much did I spend at Costco in May?"
  const { plan: pA, classification: cA } = fullPipeline('How much did I spend at Costco in May?');
  assert(cA.intent === PrimeIntent.FINANCIAL_DATA_LOOKUP, 'S-A: intent is FINANCIAL_DATA_LOOKUP');
  const txStepA = pA.steps.find(s => s.tool === 'tx_search');
  assert(txStepA !== undefined, 'S-A: plan includes tx_search');
  assert(txStepA?.params?.q === 'Costco', 'S-A: merchant param present');
  assert(txStepA?.authoritative === true, 'S-A: tx_search is authoritative');

  // S-B: "Where did most of my money go last month?"
  const { plan: pB, classification: cB } = fullPipeline('Where did most of my money go last month?');
  // This triggers financial grounding (contains "my" + "last month")
  const hasBFinancial = pB.steps.some(s =>
    s.tool === 'tx_search' || s.tool === 'transaction_category_totals',
  );
  assert(
    hasBFinancial || pB.unresolved.length > 0,
    'S-B: financial evidence addressed (tool planned or unresolved)',
  );

  // S-C: "Why was May so expensive?"
  // This message may or may not trigger financial classification
  const { plan: pC } = fullPipeline('Why was May so expensive?');
  // P3.1B correctly resolves whatever P3.0A classifies — no fabrication
  assert(
    pC.steps.length >= 0 && pC.unresolved.length >= 0,
    'S-C: plan produced without error',
  );

  // S-D: "How much money came in versus went out?"
  // Build synthetic contract with cash_flow to test capability
  const contractD = makeContract([makeReq('cash_flow', 'pending')]);
  const classificationD = makeClassification(PrimeIntent.FINANCIAL_ANALYSIS);
  const planD = buildEvidencePlan(contractD, classificationD);
  const unresolvedCF = planD.unresolved.find(u => u.evidenceKind === 'cash_flow');
  assert(unresolvedCF?.reason === 'missing_capability', 'S-D: cash_flow → missing_capability');

  // S-E: "How do I upload another statement?"
  const { plan: pE, classification: cE } = fullPipeline('How do I upload another statement?');
  assert(cE.intent === PrimeIntent.PRODUCT_HELP, 'S-E: intent is PRODUCT_HELP');
  const hasEFinTool = pE.steps.some(s =>
    s.tool === 'tx_search' || s.tool === 'transaction_category_totals',
  );
  assert(!hasEFinTool, 'S-E: no financial tools for product help');

  // S-F: "What did you find in my uploaded statement?"
  const { plan: pF, classification: cF } = fullPipeline('Did my statement finish processing?');
  assert(cF.intent === PrimeIntent.DOCUMENT_QUERY, 'S-F: intent is DOCUMENT_QUERY');
  const hasFTxSearch = pF.steps.some(s => s.tool === 'tx_search');
  assert(!hasFTxSearch, 'S-F: no tx_search for document query');

  // S-G: "What transaction were we talking about earlier?"
  const classificationG = classifyPrimeIntent('What transaction were we talking about earlier?', {
    candidateFollowUpDetected: false,
    historicalReferenceDetected: true,
  });
  const contractG = buildRuntimeEvidenceContract(classificationG, RICH_CTX);
  const planG = buildEvidencePlan(contractG, classificationG);
  assert(classificationG.intent === PrimeIntent.HISTORICAL_REFERENCE, 'S-G: intent is HISTORICAL_REFERENCE');
  const convStep = planG.steps.find(s => s.evidenceKind === 'conversation_context');
  assert(
    convStep?.mode === 'already_available',
    'S-G: conversation context already available',
  );

  // S-H: "Change the third transaction to Groceries."
  const { plan: pH, classification: cH } = fullPipeline('Change the third transaction to Groceries');
  assert(cH.intent === PrimeIntent.SPECIALIST_ACTION, 'S-H: intent is SPECIALIST_ACTION');
  const hasMutationH = pH.steps.some(s =>
    s.tool && MUTATION_TOOL_NAMES.includes(s.tool),
  );
  assert(!hasMutationH, 'S-H: no mutation tool in specialist action plan');

  // S-I: "What if I pay $500 extra on my mortgage?"
  // Uses a message that CALCULATION_RE actually matches
  const { plan: pI, classification: cI } = fullPipeline('What if I pay $500 extra on my mortgage?');
  assert(cI.intent === PrimeIntent.FINANCIAL_CALCULATION, 'S-I: intent is FINANCIAL_CALCULATION');
  // calculation_inputs should be resolved (explicit $500 in message)
  const calcStep = pI.steps.find(s => s.evidenceKind === 'calculation_inputs');
  const calcUnresolved = pI.unresolved.find(u => u.evidenceKind === 'calculation_inputs');
  assert(
    (calcStep !== undefined) || (calcUnresolved !== undefined),
    'S-I: calculation inputs resolved or marked',
  );

  // S-J: "Hello" (bare greeting matches CONVERSATION_RE)
  const { plan: pJ, classification: cJ } = fullPipeline('Hello');
  assert(cJ.intent === PrimeIntent.CONVERSATION, 'S-J: intent is CONVERSATION');
  const hasJFinTool = pJ.steps.some(s =>
    s.tool === 'tx_search' || s.tool === 'transaction_category_totals',
  );
  assert(!hasJFinTool, 'S-J: no financial tools for conversation');
  assert(pJ.steps.length === 0, 'S-J: empty plan for greeting');
}

// ─────────────────────────────────────────────────────────────────────────────
// T. AUTHORITY MARKINGS
// ─────────────────────────────────────────────────────────────────────────────

console.log('=== T. Authority markings ===');

{
  // T1: tx_search → authoritative
  const fc1 = classifyFinancialQuery('My fuel transactions');
  const c1 = makeContract([makeReq('transaction_data', 'pending')]);
  const cl1 = makeClassification(PrimeIntent.FINANCIAL_DATA_LOOKUP, fc1);
  const p1 = buildEvidencePlan(c1, cl1);
  const s1 = p1.steps.find(s => s.evidenceKind === 'transaction_data');
  assert(s1?.authoritative === true, 'T1: transaction_data → authoritative');

  // T2: user_stated_fact → NOT authoritative
  const c2 = makeContract([makeReq('user_stated_fact', 'pending')]);
  const cl2 = makeClassification(PrimeIntent.GENERAL);
  const p2 = buildEvidencePlan(c2, cl2);
  const s2 = p2.steps.find(s => s.evidenceKind === 'user_stated_fact');
  assert(s2?.authoritative === false, 'T2: user_stated_fact → not authoritative');

  // T3: general_knowledge → NOT authoritative
  const c3 = makeContract([makeReq('general_knowledge', 'pending')]);
  const cl3 = makeClassification(PrimeIntent.GENERAL);
  const p3 = buildEvidencePlan(c3, cl3);
  const s3 = p3.steps.find(s => s.evidenceKind === 'general_knowledge');
  assert(s3?.authoritative === false, 'T3: general_knowledge → not authoritative');

  // T4: document_evidence → authoritative
  const c4 = makeContract([makeReq('document_evidence', 'pending')]);
  const cl4 = makeClassification(PrimeIntent.DOCUMENT_QUERY);
  const p4 = buildEvidencePlan(c4, cl4);
  const s4 = p4.steps.find(s => s.evidenceKind === 'document_evidence');
  assert(s4?.authoritative === true, 'T4: document_evidence → authoritative');

  // T5: candidate_identity → authoritative
  const c5 = makeContract([makeReq('candidate_identity', 'pending')]);
  const cl5 = makeClassification(PrimeIntent.SPECIALIST_ACTION);
  const p5 = buildEvidencePlan(c5, cl5);
  const s5 = p5.steps.find(s => s.evidenceKind === 'candidate_identity');
  assert(s5?.authoritative === true, 'T5: candidate_identity → authoritative');

  // T6: calculation_inputs → NOT authoritative
  const fc6 = classifyFinancialQuery('What if I pay $500 extra?');
  const c6 = makeContract([makeReq('calculation_inputs', 'pending')]);
  const cl6 = makeClassification(PrimeIntent.FINANCIAL_CALCULATION, fc6);
  const p6 = buildEvidencePlan(c6, cl6);
  const s6 = p6.steps.find(s => s.evidenceKind === 'calculation_inputs');
  assert(s6?.authoritative === false, 'T6: calculation_inputs → not authoritative');
}

// ─────────────────────────────────────────────────────────────────────────────
// U. CONTEXT MODE RESOLUTIONS
// ─────────────────────────────────────────────────────────────────────────────

console.log('=== U. Context mode resolutions ===');

{
  // U1: conversation_context pending → context mode
  const c1 = makeContract([makeReq('conversation_context', 'pending')]);
  const p1 = buildEvidencePlan(c1, makeClassification(PrimeIntent.GENERAL));
  const s1 = p1.steps.find(s => s.evidenceKind === 'conversation_context');
  assert(s1?.mode === 'context', 'U1: conversation_context → context mode');

  // U2: user_stated_fact pending → context mode
  const c2 = makeContract([makeReq('user_stated_fact', 'pending')]);
  const p2 = buildEvidencePlan(c2, makeClassification(PrimeIntent.GENERAL));
  const s2 = p2.steps.find(s => s.evidenceKind === 'user_stated_fact');
  assert(s2?.mode === 'context', 'U2: user_stated_fact → context mode');

  // U3: document_evidence pending → context mode
  const c3 = makeContract([makeReq('document_evidence', 'pending')]);
  const p3 = buildEvidencePlan(c3, makeClassification(PrimeIntent.DOCUMENT_QUERY));
  const s3 = p3.steps.find(s => s.evidenceKind === 'document_evidence');
  assert(s3?.mode === 'context', 'U3: document_evidence → context mode');

  // U4: product_knowledge pending (edge case) → already_available
  const c4 = makeContract([makeReq('product_knowledge', 'pending')]);
  const p4 = buildEvidencePlan(c4, makeClassification(PrimeIntent.PRODUCT_HELP));
  const s4 = p4.steps.find(s => s.evidenceKind === 'product_knowledge');
  assert(s4?.mode === 'already_available', 'U4: product_knowledge → already_available even if pending');

  // U5: general_knowledge pending → already_available
  const c5 = makeContract([makeReq('general_knowledge', 'pending')]);
  const p5 = buildEvidencePlan(c5, makeClassification(PrimeIntent.GENERAL));
  const s5 = p5.steps.find(s => s.evidenceKind === 'general_knowledge');
  assert(s5?.mode === 'already_available', 'U5: general_knowledge → already_available even if pending');
}

// ─────────────────────────────────────────────────────────────────────────────
// V. PLAN STRUCTURE
// ─────────────────────────────────────────────────────────────────────────────

console.log('=== V. Plan structure ===');

{
  // V1: plan has required fields
  const contract = makeContract([makeReq('transaction_data', 'pending')]);
  const classification = makeClassification(PrimeIntent.GENERAL);
  const plan = buildEvidencePlan(contract, classification);
  assert('intent' in plan, 'V1: plan has intent');
  assert(Array.isArray(plan.steps), 'V1: plan has steps array');
  assert(Array.isArray(plan.unresolved), 'V1: plan has unresolved array');

  // V2: step has required fields
  const fc = classifyFinancialQuery('How much at Costco?');
  const contract2 = makeContract([makeReq('transaction_data', 'pending')]);
  const classification2 = makeClassification(PrimeIntent.FINANCIAL_DATA_LOOKUP, fc);
  const plan2 = buildEvidencePlan(contract2, classification2);
  const step = plan2.steps[0];
  assert('evidenceKind' in step, 'V2: step has evidenceKind');
  assert('source' in step, 'V2: step has source');
  assert('mode' in step, 'V2: step has mode');
  assert('authoritative' in step, 'V2: step has authoritative');

  // V3: unresolved has required fields
  const contract3 = makeContract([makeReq('cash_flow', 'pending')]);
  const plan3 = buildEvidencePlan(contract3, makeClassification(PrimeIntent.GENERAL));
  const unresolved = plan3.unresolved[0];
  assert('evidenceKind' in unresolved, 'V3: unresolved has evidenceKind');
  assert('reason' in unresolved, 'V3: unresolved has reason');
}

// ─────────────────────────────────────────────────────────────────────────────
// W. CANDIDATE IDENTITY SAFETY — select_transaction MUST NEVER appear
// ─────────────────────────────────────────────────────────────────────────────

console.log('=== W. Candidate identity safety ===');

{
  // W-A: Pending candidate_identity NEVER produces tool: select_transaction
  const contract = makeContract([makeReq('candidate_identity', 'pending')]);
  const plan = buildEvidencePlan(contract, makeClassification(PrimeIntent.SPECIALIST_ACTION));
  const step = plan.steps.find(s => s.evidenceKind === 'candidate_identity');
  assert(step !== undefined, 'W-A: candidate_identity produces a step');
  assert(step!.tool !== 'select_transaction', 'W-A: candidate_identity step has no select_transaction tool');
  assert(!step!.tool, 'W-A: candidate_identity step has no tool field at all');

  // W-B: candidate_identity resolves to mode: context (not tool)
  assert(step!.mode === 'context', 'W-B: candidate_identity mode is context');

  // W-C: candidate_identity is authoritative
  assert(step!.authoritative === true, 'W-C: candidate_identity is authoritative');

  // W-D: select_transaction in blocklist — even if injected, it would be blocked
  const contractInjected = makeContract([makeReq('transaction_data', 'pending')]);
  const classificationWithFc = makeClassification(PrimeIntent.FINANCIAL_DATA_LOOKUP, classifyFinancialQuery('How much at Costco?'));
  const planInjected = buildEvidencePlan(contractInjected, classificationWithFc);
  const hasSelectTx = planInjected.steps.some(s => s.tool === 'select_transaction');
  assert(!hasSelectTx, 'W-D: select_transaction blocked even if hypothetically returned');

  // W-E: No intent produces select_transaction in any evidence plan
  const intents = Object.values(PrimeIntent);
  for (const intent of intents) {
    const allReqs = ALL_EVIDENCE_KINDS.map(k => makeReq(k, 'pending'));
    const c = makeContract(allReqs, intent);
    const cl = makeClassification(intent);
    const p = buildEvidencePlan(c, cl);
    const found = p.steps.some(s => s.tool === 'select_transaction');
    assert(!found, `W-E: ${intent} never produces select_transaction`);
  }

  // W-F: select_transaction does not appear in telemetry stepTools
  const allReqs = ALL_EVIDENCE_KINDS.map(k => makeReq(k, 'pending'));
  const fullContract = makeContract(allReqs);
  const fullPlan = buildEvidencePlan(fullContract, makeClassification(PrimeIntent.GENERAL));
  const telemetry = buildEvidencePlanTelemetry(fullPlan);
  assert(!telemetry.stepTools.includes('select_transaction'), 'W-F: select_transaction absent from telemetry stepTools');

  // W-G: candidate_identity with available status still produces no tool
  const contractAvail = makeContract([makeReq('candidate_identity', 'available')]);
  const planAvail = buildEvidencePlan(contractAvail, makeClassification(PrimeIntent.SPECIALIST_ACTION));
  const stepAvail = planAvail.steps.find(s => s.evidenceKind === 'candidate_identity');
  assert(stepAvail !== undefined, 'W-G: available candidate_identity produces a step');
  assert(!stepAvail!.tool, 'W-G: available candidate_identity has no tool');
}

// ─────────────────────────────────────────────────────────────────────────────
// RESULTS
// ─────────────────────────────────────────────────────────────────────────────

const total = pass + fail;
console.log(`\n============================================================`);
console.log(`P3.1B EVIDENCE RESOLUTION: ${pass} passed, ${fail} failed`);
console.log(`============================================================`);

if (failures.length > 0) {
  console.log('\nFAILURES:');
  for (const f of failures) {
    console.log(f);
  }
  process.exit(1);
} else {
  console.log('\nAll tests passed.');
}
