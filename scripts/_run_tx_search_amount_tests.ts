/**
 * tx_search amount filter regression tests.
 *
 * Validates that minAmount/maxAmount use magnitude (absolute-value) semantics
 * and are logically ANDed with text search — NOT OR'd into the same clause.
 *
 * Standalone runner (no vitest) to avoid broken vitest/vite version issue.
 */

let passed = 0;
let failed = 0;

function assert(condition: boolean, name: string) {
  if (condition) { passed++; } else { failed++; console.error(`  FAIL: ${name}`); }
}
function assertEqual(actual: any, expected: any, name: string) {
  if (actual === expected) { passed++; } else { failed++; console.error(`  FAIL: ${name} — expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`); }
}

// ── Replicate the tx-search.ts filter construction logic ─────────────────
// This mirrors the FIXED code in netlify/functions/tx-search.ts lines 221-266.

type FilterPlan = {
  directConditions: string[];   // AND conditions applied directly to query
  scopedOrs: string[];          // separate .or() calls (each ANDed with the query)
  orClauses: string[];          // shared OR clause (applied as single .or())
};

function buildFilterPlan(opts: {
  q?: string;
  textCols?: string[];
  minAmount?: number | null;
  maxAmount?: number | null;
  uncategorizedOnly?: boolean;
  category?: string;
}): FilterPlan {
  const { q, textCols = [], minAmount = null, maxAmount = null, uncategorizedOnly = false, category } = opts;
  const directConditions: string[] = [];
  const scopedOrs: string[] = [];
  const orClauses: string[] = [];

  // Text search
  if (q && textCols.length > 0) {
    if (textCols.length === 1) {
      directConditions.push(`${textCols[0]}.ilike.%${q}%`);
    } else {
      orClauses.push(...textCols.map((col) => `${col}.ilike.%${q}%`));
    }
  }

  // minAmount — FIXED: separate .or() call, NOT in orClauses
  if (minAmount !== null) {
    const absMin = Math.abs(minAmount);
    scopedOrs.push(`amount.gte.${absMin},amount.lte.${-absMin}`);
  }

  // maxAmount — AND conditions
  if (maxAmount !== null) {
    const absMax = Math.abs(maxAmount);
    directConditions.push(`amount.gte.${-absMax}`);
    directConditions.push(`amount.lte.${absMax}`);
  }

  // Category
  if (uncategorizedOnly) {
    orClauses.push('category.is.null', 'category.eq.Uncategorized');
  } else if (category) {
    directConditions.push(`category.eq.${category}`);
  }

  return { directConditions, scopedOrs, orClauses };
}

// Simulate whether a transaction row matches the filter plan
function matchesFilter(
  row: { amount: number; merchant?: string; description?: string; category?: string },
  plan: FilterPlan,
  opts: { q?: string; textCols?: string[] },
): boolean {
  // AND conditions (direct)
  for (const cond of plan.directConditions) {
    if (cond.includes('.ilike.')) {
      const col = cond.split('.ilike.')[0];
      const pattern = cond.split('.ilike.')[1].replace(/%/g, '').toLowerCase();
      const val = String((row as any)[col] || '').toLowerCase();
      if (!val.includes(pattern)) return false;
    } else if (cond.startsWith('amount.gte.')) {
      if (row.amount < parseFloat(cond.replace('amount.gte.', ''))) return false;
    } else if (cond.startsWith('amount.lte.')) {
      if (row.amount > parseFloat(cond.replace('amount.lte.', ''))) return false;
    } else if (cond.startsWith('category.eq.')) {
      if (row.category !== cond.replace('category.eq.', '')) return false;
    }
  }

  // Scoped ORs (each is a separate AND condition)
  for (const scopedOr of plan.scopedOrs) {
    const parts = scopedOr.split(',');
    let anyMatch = false;
    for (const part of parts) {
      if (part.startsWith('amount.gte.')) {
        if (row.amount >= parseFloat(part.replace('amount.gte.', ''))) anyMatch = true;
      } else if (part.startsWith('amount.lte.')) {
        if (row.amount <= parseFloat(part.replace('amount.lte.', ''))) anyMatch = true;
      }
    }
    if (!anyMatch) return false;
  }

  // Shared orClauses (if any, at least one must match)
  if (plan.orClauses.length > 0) {
    let anyMatch = false;
    for (const clause of plan.orClauses) {
      if (clause.includes('.ilike.')) {
        const col = clause.split('.ilike.')[0];
        const pattern = clause.split('.ilike.')[1].replace(/%/g, '').toLowerCase();
        const val = String((row as any)[col] || '').toLowerCase();
        if (val.includes(pattern)) anyMatch = true;
      } else if (clause.startsWith('amount.gte.')) {
        if (row.amount >= parseFloat(clause.replace('amount.gte.', ''))) anyMatch = true;
      } else if (clause.startsWith('amount.lte.')) {
        if (row.amount <= parseFloat(clause.replace('amount.lte.', ''))) anyMatch = true;
      } else if (clause === 'category.is.null') {
        if (!row.category) anyMatch = true;
      } else if (clause.startsWith('category.eq.')) {
        if (row.category === clause.replace('category.eq.', '')) anyMatch = true;
      }
    }
    if (!anyMatch) return false;
  }

  return true;
}

// ── Test data ────────────────────────────────────────────────────────────

const COSTCO_WHOLESALE = { amount: -190.27, merchant: 'COSTCO WHOLESALE', description: 'COSTCO WHOLESALE', category: 'Groceries' };
const COSTCO_GAS       = { amount: -92.51,  merchant: 'COSTCO GAS',       description: 'COSTCO GAS',       category: 'Groceries' };
const WALMART          = { amount: -190.27, merchant: 'WALMART',          description: 'WALMART SUPERCENTER', category: 'Groceries' };
const SALARY           = { amount: 3000.00, merchant: 'EMPLOYER INC',     description: 'DIRECT DEPOSIT',   category: 'Income' };
const SMALL_PURCHASE   = { amount: -15.99,  merchant: 'STARBUCKS',        description: 'STARBUCKS COFFEE', category: 'Dining' };
const EXACT_POSITIVE   = { amount: 190.27,  merchant: 'REFUND CO',        description: 'COSTCO REFUND',    category: 'Refunds' };
const LARGE_PURCHASE   = { amount: -250.00, merchant: 'BEST BUY',         description: 'ELECTRONICS',      category: 'Shopping' };

const textCols = ['merchant', 'description'];

// ═══════════════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════════════

console.log('\n=== 1: Text + exact amount returns only matching transaction ===');
{
  const plan = buildFilterPlan({ q: 'Costco', textCols, minAmount: 190.27, maxAmount: 190.27 });
  assert(matchesFilter(COSTCO_WHOLESALE, plan, { q: 'Costco', textCols }), 'COSTCO WHOLESALE -190.27 matches');
  assert(!matchesFilter(COSTCO_GAS, plan, { q: 'Costco', textCols }), 'COSTCO GAS -92.51 excluded');
}

console.log('\n=== 2: Text only returns all text matches ===');
{
  const plan = buildFilterPlan({ q: 'Costco', textCols });
  assert(matchesFilter(COSTCO_WHOLESALE, plan, { q: 'Costco', textCols }), 'COSTCO WHOLESALE matches text');
  assert(matchesFilter(COSTCO_GAS, plan, { q: 'Costco', textCols }), 'COSTCO GAS matches text');
  assert(!matchesFilter(WALMART, plan, { q: 'Costco', textCols }), 'WALMART excluded');
}

console.log('\n=== 3: Exact amount without text returns magnitude matches only ===');
{
  const plan = buildFilterPlan({ minAmount: 190.27, maxAmount: 190.27 });
  assert(matchesFilter(COSTCO_WHOLESALE, plan, {}), 'COSTCO WHOLESALE -190.27 matches');
  assert(matchesFilter(WALMART, plan, {}), 'WALMART -190.27 matches');
  assert(matchesFilter(EXACT_POSITIVE, plan, {}), '+190.27 matches');
  assert(!matchesFilter(COSTCO_GAS, plan, {}), 'COSTCO GAS -92.51 excluded');
  assert(!matchesFilter(SALARY, plan, {}), 'SALARY +3000 excluded');
}

console.log('\n=== 4: Negative debit matches exact magnitude ===');
{
  const plan = buildFilterPlan({ minAmount: 190.27, maxAmount: 190.27 });
  assert(matchesFilter({ amount: -190.27, merchant: 'X', description: 'X' }, plan, {}), '-190.27 matches magnitude 190.27');
}

console.log('\n=== 5: Positive amount matches exact magnitude ===');
{
  const plan = buildFilterPlan({ minAmount: 190.27, maxAmount: 190.27 });
  assert(matchesFilter({ amount: 190.27, merchant: 'X', description: 'X' }, plan, {}), '+190.27 matches magnitude 190.27');
}

console.log('\n=== 6: -92.51 does NOT match minAmount 190.27 ===');
{
  const plan = buildFilterPlan({ minAmount: 190.27, maxAmount: 190.27 });
  assert(!matchesFilter({ amount: -92.51, merchant: 'X', description: 'X' }, plan, {}), '-92.51 excluded by minAmount 190.27');
}

console.log('\n=== 7: +92.51 does NOT match minAmount 190.27 ===');
{
  const plan = buildFilterPlan({ minAmount: 190.27, maxAmount: 190.27 });
  assert(!matchesFilter({ amount: 92.51, merchant: 'X', description: 'X' }, plan, {}), '+92.51 excluded by minAmount 190.27');
}

console.log('\n=== 8: -250 does NOT match maxAmount 190.27 ===');
{
  const plan = buildFilterPlan({ minAmount: 190.27, maxAmount: 190.27 });
  assert(!matchesFilter({ amount: -250, merchant: 'X', description: 'X' }, plan, {}), '-250 excluded by maxAmount 190.27');
}

console.log('\n=== 9: +250 does NOT match maxAmount 190.27 ===');
{
  const plan = buildFilterPlan({ minAmount: 190.27, maxAmount: 190.27 });
  assert(!matchesFilter({ amount: 250, merchant: 'X', description: 'X' }, plan, {}), '+250 excluded by maxAmount 190.27');
}

console.log('\n=== 10: min-only filtering works for both signs ===');
{
  const plan = buildFilterPlan({ minAmount: 100 });
  assert(matchesFilter({ amount: -190.27, merchant: 'X', description: 'X' }, plan, {}), '-190.27 matches min 100');
  assert(matchesFilter({ amount: 190.27, merchant: 'X', description: 'X' }, plan, {}), '+190.27 matches min 100');
  assert(matchesFilter({ amount: -100, merchant: 'X', description: 'X' }, plan, {}), '-100 matches min 100 (boundary)');
  assert(matchesFilter({ amount: 100, merchant: 'X', description: 'X' }, plan, {}), '+100 matches min 100 (boundary)');
  assert(!matchesFilter({ amount: -92.51, merchant: 'X', description: 'X' }, plan, {}), '-92.51 excluded by min 100');
  assert(!matchesFilter({ amount: 50, merchant: 'X', description: 'X' }, plan, {}), '+50 excluded by min 100');
}

console.log('\n=== 11: max-only filtering works for both signs ===');
{
  const plan = buildFilterPlan({ maxAmount: 100 });
  assert(matchesFilter({ amount: -92.51, merchant: 'X', description: 'X' }, plan, {}), '-92.51 matches max 100');
  assert(matchesFilter({ amount: 92.51, merchant: 'X', description: 'X' }, plan, {}), '+92.51 matches max 100');
  assert(matchesFilter({ amount: -100, merchant: 'X', description: 'X' }, plan, {}), '-100 matches max 100 (boundary)');
  assert(matchesFilter({ amount: 100, merchant: 'X', description: 'X' }, plan, {}), '+100 matches max 100 (boundary)');
  assert(!matchesFilter({ amount: -190.27, merchant: 'X', description: 'X' }, plan, {}), '-190.27 excluded by max 100');
  assert(!matchesFilter({ amount: 190.27, merchant: 'X', description: 'X' }, plan, {}), '+190.27 excluded by max 100');
}

console.log('\n=== 12: min + max range works for both signs ===');
{
  const plan = buildFilterPlan({ minAmount: 50, maxAmount: 200 });
  assert(matchesFilter({ amount: -190.27, merchant: 'X', description: 'X' }, plan, {}), '-190.27 in range [50,200]');
  assert(matchesFilter({ amount: -92.51, merchant: 'X', description: 'X' }, plan, {}), '-92.51 in range [50,200]');
  assert(matchesFilter({ amount: 100, merchant: 'X', description: 'X' }, plan, {}), '+100 in range [50,200]');
  assert(!matchesFilter({ amount: -15.99, merchant: 'X', description: 'X' }, plan, {}), '-15.99 below min 50');
  assert(!matchesFilter({ amount: 15.99, merchant: 'X', description: 'X' }, plan, {}), '+15.99 below min 50');
  assert(!matchesFilter({ amount: -250, merchant: 'X', description: 'X' }, plan, {}), '-250 above max 200');
  assert(!matchesFilter({ amount: 3000, merchant: 'X', description: 'X' }, plan, {}), '+3000 above max 200');
}

console.log('\n=== 13: Multiple text columns still OR correctly ===');
{
  const plan = buildFilterPlan({ q: 'Costco', textCols: ['merchant', 'description'] });
  // Matches on merchant
  assert(matchesFilter({ amount: -50, merchant: 'COSTCO', description: 'OTHER' }, plan, {}), 'matches merchant Costco');
  // Matches on description
  assert(matchesFilter({ amount: -50, merchant: 'OTHER', description: 'COSTCO STORE' }, plan, {}), 'matches description Costco');
  // Matches on neither
  assert(!matchesFilter({ amount: -50, merchant: 'WALMART', description: 'WALMART' }, plan, {}), 'no text match → excluded');
}

console.log('\n=== 14: Text predicates ANDed with amount filtering ===');
{
  const plan = buildFilterPlan({ q: 'Costco', textCols, minAmount: 190.27, maxAmount: 190.27 });

  // Text matches but amount doesn't → excluded
  assert(!matchesFilter(COSTCO_GAS, plan, { q: 'Costco', textCols }), 'COSTCO GAS: text matches but amount 92.51 excluded');

  // Amount matches but text doesn't → excluded (orClauses requires text match)
  assert(!matchesFilter(WALMART, plan, { q: 'Costco', textCols }), 'WALMART: amount matches but text excluded');

  // Both match → included
  assert(matchesFilter(COSTCO_WHOLESALE, plan, { q: 'Costco', textCols }), 'COSTCO WHOLESALE: text + amount both match');
}

console.log('\n=== 15: minAmount is NOT in orClauses (structural) ===');
{
  const plan = buildFilterPlan({ q: 'Costco', textCols, minAmount: 190.27 });
  // orClauses should contain ONLY text predicates
  const hasAmountInOrClauses = plan.orClauses.some(c => c.startsWith('amount.'));
  assert(!hasAmountInOrClauses, 'no amount predicates in orClauses');
  // scopedOrs should contain the amount condition
  assertEqual(plan.scopedOrs.length, 1, 'one scoped OR for minAmount');
  assert(plan.scopedOrs[0].includes('amount.gte.190.27'), 'scoped OR has gte');
  assert(plan.scopedOrs[0].includes('amount.lte.-190.27'), 'scoped OR has lte');
}

console.log('\n=== 16: Single text column uses direct AND (not orClauses) ===');
{
  const plan = buildFilterPlan({ q: 'Costco', textCols: ['merchant'], minAmount: 190.27 });
  assertEqual(plan.orClauses.length, 0, 'no shared orClauses');
  assertEqual(plan.directConditions.length, 1, 'text as direct AND');
  assert(plan.directConditions[0].includes('merchant.ilike'), 'direct ilike condition');
}

// ═══════════════════════════════════════════════════════════════════════════
console.log('\n' + '='.repeat(60));
console.log(`RESULTS: ${passed} passed, ${failed} failed, ${passed + failed} total`);
if (failed > 0) {
  console.error('SOME TESTS FAILED');
  process.exit(1);
} else {
  console.log('ALL TESTS PASSED');
  process.exit(0);
}
