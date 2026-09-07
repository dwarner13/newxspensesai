/**
 * Specific Transaction Lookup V1 — Regression Tests
 *
 * Tests exact amount extraction, exact date extraction, month-as-merchant fix,
 * user-data intent for transaction lookups, and pre-execution planning.
 */
import { classifyFinancialQuery } from '../src/shared/financial-query-classifier';
import { buildPreExecutionPlan } from '../src/shared/financial-grounding';

let passed = 0;
let failed = 0;

function assert(name: string, condition: boolean) {
  if (condition) { passed++; console.log('PASS:', name); }
  else { failed++; console.error('FAIL:', name); }
}

const contextYear = 2026;

// ═══════════════════════════════════════════════════════════════════════════
// A. "find my $76.72 transaction from August 21, 2025"
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n=== A: Exact amount + exact date, no merchant ===\n');
{
  const c = classifyFinancialQuery('find my $76.72 transaction from August 21, 2025');
  assert('A1. grounded', c.requiresGrounding === true);
  assert('A2. exactDate = 2025-08-21', c.exactDate === '2025-08-21');
  assert('A3. exactAmount = 76.72', c.exactAmount === 76.72);
  assert('A4. merchant is NOT August', c.merchantHint !== 'August');
  assert('A5. merchant is null/undefined', c.merchantHint === undefined);
  assert('A6. queryType = detail', c.queryType === 'detail');

  const plan = buildPreExecutionPlan(c, contextYear);
  assert('A7. pre-execute tx_search', plan.toolName === 'tx_search');
  assert('A8. startDate = 2025-08-21', plan.toolArgs?.startDate === '2025-08-21');
  assert('A9. endDate = 2025-08-21', plan.toolArgs?.endDate === '2025-08-21');
  assert('A10. minAmount = 76.72', plan.toolArgs?.minAmount === 76.72);
  assert('A11. maxAmount = 76.72', plan.toolArgs?.maxAmount === 76.72);
  assert('A12. no q=August', plan.toolArgs?.q === undefined);
  assert('A13. limit narrowed', plan.toolArgs?.limit <= 5);
}

// ═══════════════════════════════════════════════════════════════════════════
// B. "find the $60 purchase on January 23, 2025"
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n=== B: Amount + date, no "my" ===\n');
{
  const c = classifyFinancialQuery('find the $60 purchase on January 23, 2025');
  assert('B1. grounded', c.requiresGrounding === true);
  assert('B2. exactDate = 2025-01-23', c.exactDate === '2025-01-23');
  assert('B3. exactAmount = 60', c.exactAmount === 60);
  assert('B4. queryType = detail', c.queryType === 'detail');

  const plan = buildPreExecutionPlan(c, contextYear);
  assert('B5. tx_search', plan.toolName === 'tx_search');
  assert('B6. startDate = 2025-01-23', plan.toolArgs?.startDate === '2025-01-23');
  assert('B7. minAmount = 60', plan.toolArgs?.minAmount === 60);
}

// ═══════════════════════════════════════════════════════════════════════════
// C. "show me my Costco transaction from June 5, 2025"
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n=== C: Real merchant + exact date ===\n');
{
  const c = classifyFinancialQuery('show me my Costco transaction from June 5, 2025');
  assert('C1. grounded', c.requiresGrounding === true);
  assert('C2. merchant = Costco', c.merchantHint === 'Costco');
  assert('C3. merchant is NOT June', c.merchantHint !== 'June');
  assert('C4. exactDate = 2025-06-05', c.exactDate === '2025-06-05');
  assert('C5. queryType = merchant', c.queryType === 'merchant');

  const plan = buildPreExecutionPlan(c, contextYear);
  assert('C6. tx_search', plan.toolName === 'tx_search');
  assert('C7. q = Costco', plan.toolArgs?.q === 'Costco');
  assert('C8. startDate = 2025-06-05', plan.toolArgs?.startDate === '2025-06-05');
  assert('C9. endDate = 2025-06-05', plan.toolArgs?.endDate === '2025-06-05');
}

// ═══════════════════════════════════════════════════════════════════════════
// D. "find a Petro-Canada charge for $50 last month"
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n=== D: Merchant + amount + relative date ===\n');
{
  const c = classifyFinancialQuery('find a Petro-Canada charge for $50 last month');
  assert('D1. grounded', c.requiresGrounding === true);
  assert('D2. merchant = Petro-Canada', c.merchantHint === 'Petro-Canada');
  assert('D3. exactAmount = 50', c.exactAmount === 50);
  assert('D4. queryType = merchant', c.queryType === 'merchant');
  // No exact date (relative "last month" not resolved to YYYY-MM-DD)
  assert('D5. no exact date', c.exactDate === undefined);

  const plan = buildPreExecutionPlan(c, contextYear);
  assert('D6. tx_search', plan.toolName === 'tx_search');
  assert('D7. q = Petro-Canada', plan.toolArgs?.q === 'Petro-Canada');
  assert('D8. minAmount = 50', plan.toolArgs?.minAmount === 50);
  assert('D9. maxAmount = 50', plan.toolArgs?.maxAmount === 50);
}

// ═══════════════════════════════════════════════════════════════════════════
// E. "What is August?"
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n=== E: Education query must NOT trigger lookup ===\n');
{
  const c = classifyFinancialQuery('What is August?');
  assert('E1. NOT grounded', c.requiresGrounding === false);
  assert('E2. queryType = none', c.queryType === 'none');
  assert('E3. no merchant', c.merchantHint === undefined);
  assert('E4. no exact date', c.exactDate === undefined);
}

// ═══════════════════════════════════════════════════════════════════════════
// F. "How much did I spend on fuel in 2025?"
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n=== F: Existing aggregate grounding unchanged ===\n');
{
  const c = classifyFinancialQuery('How much did I spend on fuel in 2025?');
  assert('F1. grounded', c.requiresGrounding === true);
  assert('F2. queryType = aggregate', c.queryType === 'aggregate');
  assert('F3. resolvedCategory has Gas & Fuel', c.resolvedCategory?.subcategory === 'Gas & Fuel');
  assert('F4. years = [2025]', JSON.stringify(c.years) === '[2025]');
  assert('F5. no exact date', c.exactDate === undefined);
  assert('F6. no exact amount', c.exactAmount === undefined);

  const plan = buildPreExecutionPlan(c, contextYear);
  assert('F7. tax_summary', plan.toolName === 'tax_summary');
  assert('F8. year = 2025', plan.toolArgs?.year === 2025);
}

// ═══════════════════════════════════════════════════════════════════════════
// G. "What can you tell me about my fuel expense in 2025?"
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n=== G: Aggregate fuel unchanged ===\n');
{
  const c = classifyFinancialQuery('What can you tell me about my fuel expense in 2025?');
  assert('G1. grounded', c.requiresGrounding === true);
  assert('G2. queryType = aggregate', c.queryType === 'aggregate');
  assert('G3. resolvedCategory has Gas & Fuel', c.resolvedCategory?.subcategory === 'Gas & Fuel');

  const plan = buildPreExecutionPlan(c, contextYear);
  assert('G4. tax_summary', plan.toolName === 'tax_summary');
}

// ═══════════════════════════════════════════════════════════════════════════
// H. Invalid date: "find my $50 transaction from February 30, 2025"
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n=== H: Invalid date rejection ===\n');
{
  const c = classifyFinancialQuery('find my $50 transaction from February 30, 2025');
  assert('H1. no exact date (Feb 30 invalid)', c.exactDate === undefined);
  assert('H2. amount still extracted', c.exactAmount === 50);
  // Feb is still a month name → merchant should not be "February"
  assert('H3. merchant is NOT February', c.merchantHint !== 'February');
}

// ═══════════════════════════════════════════════════════════════════════════
// I. Additional month-as-merchant regression
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n=== I: Month names never become merchants ===\n');
{
  const months = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
  let allClean = true;
  for (const m of months) {
    const c = classifyFinancialQuery(`find my transaction from ${m} 15, 2025`);
    if (c.merchantHint === m) {
      console.error(`  FAIL: "${m}" extracted as merchant`);
      allClean = false;
    }
  }
  assert('I1. no month name becomes merchant', allClean);
}

// ═══════════════════════════════════════════════════════════════════════════
// J. Abbreviated month names
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n=== J: Abbreviated month dates ===\n');
{
  const c = classifyFinancialQuery('find my $100 transaction from Aug 15, 2025');
  assert('J1. exactDate = 2025-08-15', c.exactDate === '2025-08-15');
  assert('J2. exactAmount = 100', c.exactAmount === 100);
  assert('J3. merchant not Aug', c.merchantHint !== 'Aug');
}

// ═══════════════════════════════════════════════════════════════════════════
// K. Ordinal dates
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n=== K: Ordinal date format ===\n');
{
  const c = classifyFinancialQuery('find my transaction from March 3rd, 2025');
  assert('K1. exactDate = 2025-03-03', c.exactDate === '2025-03-03');
}

// ═══════════════════════════════════════════════════════════════════════════
// L. Year not treated as amount
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n=== L: Year not interpreted as amount ===\n');
{
  const c = classifyFinancialQuery('How much did I spend on fuel in 2025?');
  assert('L1. no amount (2025 is not $2025)', c.exactAmount === undefined);
}

// ═══════════════════════════════════════════════════════════════════════════
// M. Leap year validation
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n=== M: Leap year validation ===\n');
{
  const c1 = classifyFinancialQuery('find transaction from February 29, 2024');
  assert('M1. Feb 29 2024 valid (leap year)', c1.exactDate === '2024-02-29');
  const c2 = classifyFinancialQuery('find transaction from February 29, 2025');
  assert('M2. Feb 29 2025 invalid (not leap year)', c2.exactDate === undefined);
}

// ═══════════════════════════════════════════════════════════════════════════
// N. Full sentence from live bug
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n=== N: Exact live production query ===\n');
{
  const c = classifyFinancialQuery(
    'Prime, find my $76.72 transaction from August 21, 2025. Tell me the merchant, category and subcategory.'
  );
  assert('N1. grounded', c.requiresGrounding === true);
  assert('N2. exactDate = 2025-08-21', c.exactDate === '2025-08-21');
  assert('N3. exactAmount = 76.72', c.exactAmount === 76.72);
  assert('N4. merchant NOT August', c.merchantHint !== 'August');
  assert('N5. queryType = detail', c.queryType === 'detail');

  const plan = buildPreExecutionPlan(c, contextYear);
  assert('N6. tx_search', plan.toolName === 'tx_search');
  assert('N7. startDate = 2025-08-21', plan.toolArgs?.startDate === '2025-08-21');
  assert('N8. endDate = 2025-08-21', plan.toolArgs?.endDate === '2025-08-21');
  assert('N9. minAmount = 76.72', plan.toolArgs?.minAmount === 76.72);
  assert('N10. maxAmount = 76.72', plan.toolArgs?.maxAmount === 76.72);
  assert('N11. no q arg', plan.toolArgs?.q === undefined);
}

console.log(`\n============================================================`);
console.log(`SPECIFIC TX LOOKUP V1: ${passed} passed, ${failed} failed`);
console.log(`============================================================`);
if (failed > 0) process.exit(1);
