/**
 * Phase 1B.2 acceptance tests — runs without vitest dependency.
 * Uses a minimal test harness via tsx.
 */

import { classifyFinancialQuery } from '../src/shared/financial-query-classifier';
import {
  detectsFalseZero,
  isAnswerInContext,
  buildPreExecutionPlan,
  validateGroundedAnswer,
  buildEvidenceSystemMessage,
  type FinancialEvidence,
} from '../src/shared/financial-grounding';
import { type TaxSummaryContext } from '../src/shared/tool-gate';

let passed = 0;
let failed = 0;
const failures: string[] = [];

function assert(label: string, condition: boolean) {
  if (condition) {
    passed++;
  } else {
    failed++;
    failures.push(label);
    console.error(`  FAIL: ${label}`);
  }
}

function eq(label: string, actual: any, expected: any) {
  const pass = JSON.stringify(actual) === JSON.stringify(expected);
  if (!pass) {
    console.error(`  FAIL: ${label} — got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`);
  }
  assert(label, pass);
}

// ─── Fixtures ──────────────────────────────────────────────────────────────

const EMPTY: TaxSummaryContext[] = [];
const FULL: TaxSummaryContext[] = [
  {
    section: 'Vehicle Expenses', total: 22825.72, count: 189,
    topSubcategories: [
      { name: 'Gas / Fuel', amount: 6472.65, count: 123 },
      { name: 'Car Payments', amount: 4800, count: 12 },
      { name: 'Parking', amount: 1500, count: 45 },
    ],
  },
  {
    section: 'Meals & Entertainment', total: 8500, count: 250,
    topSubcategories: [
      { name: 'Restaurants / Dining', amount: 5200, count: 150 },
      { name: 'Coffee & Drinks', amount: 1800, count: 80 },
    ],
  },
  { section: 'Income', total: 137144.67, count: 126 },
];

// ─── A: Fuel aggregate, empty context ──────────────────────────────────────

console.log('\n=== A: Fuel aggregate with empty context ===');
{
  const c = classifyFinancialQuery('How much did I spend on fuel in 2025?');
  assert('A1: requires grounding', c.requiresGrounding === true);
  assert('A2: type = aggregate', c.queryType === 'aggregate');
  eq('A3: resolved', c.resolvedCategory, { category: 'Transportation', subcategory: 'Gas & Fuel', section: 'vehicle' });
  assert('A4: not in empty context', isAnswerInContext(c, EMPTY, 2025) === null);

  const plan = buildPreExecutionPlan(c, 2025);
  assert('A5: pre-execute', plan.shouldPreExecute === true);
  assert('A6: tax_summary', plan.toolName === 'tax_summary');
  assert('A7: year=2025', plan.toolArgs?.year === 2025);

  const ev: FinancialEvidence = { grounded: false };
  const v = validateGroundedAnswer('There were no recorded fuel expenses for 2025.', ev, c);
  assert('A8: false-zero rejected', v === 'false_zero_ungrounded');
}

// ─── B: Fuel open-ended ────────────────────────────────────────────────────

console.log('\n=== B: Fuel open-ended with empty context ===');
{
  const c = classifyFinancialQuery('What can you tell me about my fuel expense in 2025?');
  assert('B1: requires grounding', c.requiresGrounding === true);
  assert('B2: resolved subcategory', c.resolvedCategory?.subcategory === 'Gas & Fuel');
  const plan = buildPreExecutionPlan(c, 2025);
  assert('B3: pre-execute fires', plan.shouldPreExecute === true);
}

// ─── C: Restaurant aggregate ───────────────────────────────────────────────

console.log('\n=== C: Restaurant aggregate ===');
{
  const c = classifyFinancialQuery('How much did I spend at restaurants in 2025?');
  assert('C1: requires grounding', c.requiresGrounding === true);
  eq('C2: resolved', c.resolvedCategory, { category: 'Food & Dining', subcategory: 'Restaurants', section: 'meals' });
  const plan = buildPreExecutionPlan(c, 2025);
  assert('C3: tax_summary', plan.toolName === 'tax_summary');
}

// ─── D: Fuel detail / list ─────────────────────────────────────────────────

console.log('\n=== D: Fuel detail/list ===');
{
  const c = classifyFinancialQuery('Show me my fuel transactions in March 2025.');
  assert('D1: requires grounding', c.requiresGrounding === true);
  assert('D2: type = detail', c.queryType === 'detail');
  const plan = buildPreExecutionPlan(c, 2025);
  assert('D3: tx_search', plan.toolName === 'tx_search');
  assert('D4: category=Transportation', plan.toolArgs?.category === 'Transportation');
  assert('D5: subcategory=Gas & Fuel', plan.toolArgs?.subcategory === 'Gas & Fuel');
}

// ─── E: Merchant query (Costco) ───────────────────────────────────────────

console.log('\n=== E: Merchant query (Costco) ===');
{
  const c = classifyFinancialQuery('How much did I spend at Costco in 2025?');
  assert('E1: requires grounding', c.requiresGrounding === true);
  assert('E2: type = merchant', c.queryType === 'merchant');
  assert('E3: merchant hint', c.merchantHint === 'Costco');
  const plan = buildPreExecutionPlan(c, 2025);
  assert('E4: tx_search', plan.toolName === 'tx_search');
  assert('E5: q=Costco', plan.toolArgs?.q === 'Costco');
}

// ─── F: Unknown category ──────────────────────────────────────────────────

console.log('\n=== F: Unknown category (purple elephants) ===');
{
  const c = classifyFinancialQuery('How much did I spend on purple elephants in 2025?');
  assert('F1: requires grounding', c.requiresGrounding === true);
  assert('F2: no resolved category', c.resolvedCategory === undefined);
  const plan = buildPreExecutionPlan(c, 2025);
  assert('F3: pre-execute fires', plan.shouldPreExecute === true);
  assert('F4: tax_summary', plan.toolName === 'tax_summary');

  const ev: FinancialEvidence = { grounded: true, queryStatus: 'verified' };
  const v = validateGroundedAnswer('You had $0.00 in purple elephant expenses.', ev, c);
  assert('F5: false-zero rejected', v === 'false_zero_without_evidence');
}

// ─── G: Real zero category ────────────────────────────────────────────────

console.log('\n=== G: Verified zero permits truthful zero ===');
{
  const c = classifyFinancialQuery('How much did I spend on travel in 2025?');
  assert('G1: requires grounding', c.requiresGrounding === true);

  const evZero: FinancialEvidence = { grounded: true, toolName: 'tax_summary', queryStatus: 'verified_zero' };
  const v1 = validateGroundedAnswer('I found no travel transactions for 2025.', evZero, c);
  assert('G2: verified_zero permits zero', v1 === null);

  const evNone: FinancialEvidence = { grounded: false };
  const v2 = validateGroundedAnswer('I found no travel transactions for 2025.', evNone, c);
  assert('G3: ungrounded zero rejected', v2 === 'false_zero_ungrounded');
}

// ─── H: Context has exact answer ──────────────────────────────────────────

console.log('\n=== H: Context contains exact answer ===');
{
  const c = classifyFinancialQuery('How much did I spend on fuel in 2025?');
  const r = isAnswerInContext(c, FULL, 2025);
  assert('H1: found in context', r !== null);
  assert('H2: grounded=true', r?.grounded === true);
  assert('H3: fromContext=true', r?.fromContext === true);

  const c2024 = classifyFinancialQuery('How much did I spend on fuel in 2024?');
  const r2 = isAnswerInContext(c2024, FULL, 2025);
  assert('H4: not found for 2024', r2 === null);
}

// ─── I: General education ─────────────────────────────────────────────────

console.log('\n=== I: General education (no grounding) ===');
{
  assert('I1: tax deduction', classifyFinancialQuery('What is a tax deduction?').requiresGrounding === false);
  assert('I2: compound interest', classifyFinancialQuery('Explain compound interest').requiresGrounding === false);
  assert('I3: category meaning', classifyFinancialQuery('What does Gas & Fuel mean?').requiresGrounding === false);
  assert('I4: budgeting advice', classifyFinancialQuery('How should I think about budgeting?').requiresGrounding === false);
  assert('I5: "my fuel expense" IS data', classifyFinancialQuery('What is my fuel expense?').requiresGrounding === true);
}

// ─── J: Mutation regression ───────────────────────────────────────────────

console.log('\n=== J: Mutation intents ===');
{
  const c1 = classifyFinancialQuery('Change this transaction to Business Expenses');
  assert('J1: mutation detected', c1.scope.isMutation === true);
  const c2 = classifyFinancialQuery('Recategorize my Costco purchase to groceries');
  assert('J2: mutation requires grounding', c2.requiresGrounding === true);
}

// ─── K: Temporal / year extraction ────────────────────────────────────────

console.log('\n=== K: Temporal deterministic flow ===');
{
  const c1 = classifyFinancialQuery('fuel in 2025');
  eq('K1: extracts 2025', c1.years, [2025]);

  const c2 = classifyFinancialQuery('compare my fuel spending in 2024 and 2025');
  assert('K2: has 2024', c2.years.includes(2024));
  assert('K3: has 2025', c2.years.includes(2025));
  assert('K4: isComparison', c2.scope.isComparison === true);

  const c3 = classifyFinancialQuery('How much fuel in 2024?');
  const plan = buildPreExecutionPlan(c3, 2025);
  assert('K5: uses first year (2024)', plan.toolArgs?.year === 2024);
}

// ─── False-zero detector ──────────────────────────────────────────────────

console.log('\n=== False-zero detection ===');
{
  assert('FZ1: no recorded', detectsFalseZero('There were no recorded fuel expenses for 2025.'));
  assert('FZ2: $0.00', detectsFalseZero('You spent $0.00 on fuel.'));
  assert('FZ3: none found', detectsFalseZero('None found for that category.'));
  assert('FZ4: didn\'t find', detectsFalseZero("I didn't find any transactions matching fuel."));
  assert('FZ5: don\'t have', detectsFalseZero("You don't have any fuel expenses on record."));
  assert('FZ6: positive OK', !detectsFalseZero('You spent $6,472.65 on fuel in 2025.'));
  assert('FZ7: education OK', !detectsFalseZero('A tax deduction reduces your taxable income.'));
}

// ─── Aggregate safety (Step 8) ────────────────────────────────────────────

console.log('\n=== Aggregate safety: tx_search limit ===');
{
  const c = classifyFinancialQuery('How much did I spend on fuel in 2025?');
  const plan = buildPreExecutionPlan(c, 2025);
  assert('AS1: aggregate → tax_summary', plan.toolName === 'tax_summary');

  const d = classifyFinancialQuery('Show me my fuel transactions in March 2025');
  const dplan = buildPreExecutionPlan(d, 2025);
  assert('AS2: detail → tx_search', dplan.toolName === 'tx_search');

  const msgs = [
    'How much on fuel in 2025?',
    'What were my fuel expenses in 2025?',
    'Total fuel spending for 2025',
    'My fuel expense in 2025',
  ];
  let allTaxSummary = true;
  for (const m of msgs) {
    const mc = classifyFinancialQuery(m);
    const mp = buildPreExecutionPlan(mc, 2025);
    if (mp.toolName !== 'tax_summary') allTaxSummary = false;
  }
  assert('AS3: all aggregate → tax_summary', allTaxSummary);
}

// ─── Evidence system message ──────────────────────────────────────────────

console.log('\n=== Evidence system message ===');
{
  const c = classifyFinancialQuery('fuel in 2025');
  const toolResult = {
    sections: [{
      title: 'Vehicle Expenses', total: 22825.72, count: 189,
      buckets: [{ label: 'Gas / Fuel', total: 6472.65, count: 123 }],
    }],
  };
  const msg = buildEvidenceSystemMessage('tax_summary', toolResult, c);
  assert('ESM1: contains FINANCIAL EVIDENCE', msg.includes('FINANCIAL EVIDENCE'));
  assert('ESM2: contains 6472.65', msg.includes('6472.65'));
  assert('ESM3: contains Gas / Fuel', msg.includes('Gas / Fuel'));
  assert('ESM4: contains verified', msg.includes('queryStatus: verified'));
}

console.log('\n=== tx_search evidence rows ===');
{
  // A. Single row — all fields serialized
  const c = classifyFinancialQuery('find my $76.72 transaction from August 21, 2025');
  const txResult = {
    rows: [{
      id: 'bf3f238a-560c-4090-afe9-168ab783e368',
      date: '2025-08-21',
      merchant: 'PETRO-CANADA 36379 Debit Card Purchase, VITALITY HEALTH FOODS',
      merchant_normalized: 'PETRO-CANADA',
      amount: -76.72,
      category: 'Transportation',
      subcategory: 'Medical',
      type: 'Purchase',
      description: 'POS PURCHASE',
    }],
    totals: { count: 1, sum: -76.72, income: 0, spending: 76.72 },
    queryStatus: 'verified',
  };
  const msg = buildEvidenceSystemMessage('tx_search', txResult, c);
  assert('TXE1: contains date', msg.includes('2025-08-21'));
  assert('TXE2: contains merchant', msg.includes('PETRO-CANADA'));
  assert('TXE3: contains amount', msg.includes('76.72'));
  assert('TXE4: contains category', msg.includes('Transportation'));
  assert('TXE5: contains subcategory', msg.includes('Medical'));
  assert('TXE6: contains type', msg.includes('Purchase'));
  assert('TXE7: NOT just row count', !msg.match(/^[^[]*Rows: 1[^[]*$/s));

  // B. verified_zero — no fake rows
  const zeroResult = {
    rows: [],
    totals: { count: 0, sum: 0, income: 0, spending: 0 },
    queryStatus: 'verified_zero',
  };
  const zeroMsg = buildEvidenceSystemMessage('tx_search', zeroResult, c);
  assert('TXE8: verified_zero has no row details', !zeroMsg.includes('[1]'));
  assert('TXE9: verified_zero shows Rows: 0', zeroMsg.includes('Rows: 0'));

  // C. Multiple rows — bounded
  const multiRows = Array.from({ length: 15 }, (_, i) => ({
    id: `row-${i}`,
    date: '2025-08-21',
    merchant: `MERCHANT-${i}`,
    amount: 10 + i,
    category: 'Shopping',
    subcategory: 'General',
    type: 'Purchase',
  }));
  const multiResult = {
    rows: multiRows,
    totals: { count: 15, sum: 0, income: 0, spending: 255 },
    queryStatus: 'verified',
  };
  const multiMsg = buildEvidenceSystemMessage('tx_search', multiResult, c);
  assert('TXE10: shows first 10 rows', multiMsg.includes('[10]'));
  assert('TXE11: does NOT show row 11', !multiMsg.includes('[11]'));
  assert('TXE12: indicates more rows exist', multiMsg.includes('5 more rows'));

  // D. Missing fields remain missing
  const sparseResult = {
    rows: [{ id: 'sparse-1', amount: 50, date: '2025-01-01' }],
    totals: { count: 1, sum: 50, income: 0, spending: 50 },
    queryStatus: 'verified',
  };
  const sparseMsg = buildEvidenceSystemMessage('tx_search', sparseResult, c);
  assert('TXE13: sparse row has date', sparseMsg.includes('2025-01-01'));
  assert('TXE14: sparse row has amount', sparseMsg.includes('50.00'));
  assert('TXE15: sparse row has no fake category', !sparseMsg.includes('category:'));
}

console.log('\n=== Grounding contract temporal qualification ===');
{
  // Read the grounding contract from chat.ts source
  const { readFileSync } = await import('fs');
  const chatSrc = readFileSync('netlify/functions/chat.ts', 'utf8');

  // GCT1: Contract distinguishes historical vs future
  assert('GCT1: verified rule mentions historical factual', chatSrc.includes('historical factual questions'));

  // GCT2: Historical totals still confidently reportable
  assert('GCT2: historical questions get confident reporting', chatSrc.includes('report them confidently'));

  // GCT3: Future planning treated as baseline only
  assert('GCT3: future planning gets baseline treatment', chatSrc.includes('baseline reference only'));

  // GCT4: No silent inflation assumption
  assert('GCT4: inflation must be labeled hypothetical', chatSrc.includes('inflation or growth assumptions unless clearly labeled'));

  // GCT5: Existing exact-spend grounding still present
  assert('GCT5: grounded answers rule intact', chatSrc.includes('GROUNDED ANSWERS: Reference real numbers'));
  assert('GCT6: verified_zero rule intact', chatSrc.includes('queryStatus="verified_zero"'));
  assert('GCT7: never fabricate rule intact', chatSrc.includes('NEVER FABRICATE'));
}

// ─── Summary ──────────────────────────────────────────────────────────────

console.log(`\n${'='.repeat(60)}`);
console.log(`PHASE 1B.2 ACCEPTANCE TESTS: ${passed} passed, ${failed} failed`);
if (failures.length > 0) {
  console.log('Failures:');
  failures.forEach(f => console.log(`  - ${f}`));
}
console.log(`${'='.repeat(60)}`);
process.exit(failed > 0 ? 1 : 0);
