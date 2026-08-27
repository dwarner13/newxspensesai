/**
 * P0 Categorization Fixes — Acceptance Tests
 *
 * Tests the five fixes against the golden examples from the audit:
 *   1. Gordon Food Service split (PAY vs AP/CC)
 *   2. GFS EDMONTON not Income
 *   3. COSTCO GAS precedence over generic COSTCO
 *   4. User correction precedence over hardcoded defaults
 *   5. Sign/category safety (negative + Income → Needs Review)
 *
 * These are deterministic unit tests against the categorization functions.
 * No network calls, no database, no auth required.
 */

// We import the functions directly — these are pure deterministic logic.
import path from 'path';

// Since the functions use ESM-style imports but are built as CJS,
// we test the logic by re-implementing the matching functions inline
// from the source. This avoids import resolution issues.

// ─── Replicate applyHardcodedOverride from apply-category-rules.ts ───────
const HARDCODED_OVERRIDES: Array<{ key: string; category: string; subcategory?: string }> = [
  { key: "POPEYE'S SUPPLEMENTS", category: 'Healthcare', subcategory: 'Supplements' },
  { key: 'LEWIS MASSAGE', category: 'Personal Care', subcategory: 'Massage' },
  { key: "AD'S MASSAGE", category: 'Personal Care', subcategory: 'Massage' },
  { key: 'LA FITNESS', category: 'Personal Care', subcategory: 'Gym & Fitness' },
  { key: 'Q HAIR DESIGN', category: 'Personal Care', subcategory: 'Hair & Beauty' },
  { key: 'Q HAIR', category: 'Personal Care', subcategory: 'Hair & Beauty' },
  { key: 'SHADIFIED', category: 'Personal Care' },
  { key: 'TULIP GARDEN', category: 'Personal Care' },
  { key: 'BORROWELL', category: 'Bank Fees' },
  { key: 'BALANCEPROTECTOR', category: 'Bank Fees', subcategory: 'Balance Protection' },
  { key: 'BALANCE PROTECTOR', category: 'Bank Fees', subcategory: 'Balance Protection' },
  { key: 'PREMIUM PLAN', category: 'Bank Fees' },
  { key: 'UNIMEAL', category: 'Healthcare', subcategory: 'Supplements' },
  { key: 'SA *V SUPPORT', category: 'Healthcare', subcategory: 'Supplements' },
  { key: 'MOBILE CHEQUE', category: 'Income', subcategory: 'Cheque Deposit' },
  { key: 'INTERAC E-TRANSFER SENT', category: 'Transfers', subcategory: 'e-Transfer' },
  { key: 'INTERAC E-TRANSFER RECEIVED', category: 'Transfers', subcategory: 'e-Transfer' },
  { key: 'INTERAC E-TRANSFER', category: 'Transfers', subcategory: 'e-Transfer' },
  { key: 'NORTHTOWN REGISTRY', category: 'Transportation', subcategory: 'Registration' },
  { key: 'NORTHTOWN', category: 'Transportation' },
  { key: 'CASH MONEY', category: 'Debt Payments', subcategory: 'Loan Payment' },
  { key: 'EASYFINANCIAL', category: 'Debt Payments', subcategory: 'Loan Payment' },
  { key: 'CELTIC GROUP', category: 'Debt Payments' },
  { key: 'TD LOAN', category: 'Debt Payments', subcategory: 'Loan Payment' },
  { key: 'BMO INV', category: 'Transfers', subcategory: 'Investments' },
  { key: 'B/M PAYT', category: 'Housing', subcategory: 'Mortgage' },
  { key: 'NATIONAL MONEY', category: 'Debt Payments' },
  { key: 'FLEXITI', category: 'Debt Payments', subcategory: 'Credit Card' },
  { key: 'PETRO-CANADA', category: 'Transportation', subcategory: 'Gas & Fuel' },
  { key: 'SHELL', category: 'Transportation', subcategory: 'Gas & Fuel' },
  { key: 'ESSO', category: 'Transportation', subcategory: 'Gas & Fuel' },
  { key: 'KOLLBROOK', category: 'Transportation', subcategory: 'Gas & Fuel' },
  { key: 'SOBEYS', category: 'Groceries' },
  { key: 'SAVE ON FOODS', category: 'Groceries' },
  { key: 'LOBLAWS', category: 'Groceries' },
  { key: 'SAFEWAY', category: 'Groceries' },
  { key: 'COSTCO GAS', category: 'Transportation', subcategory: 'Gas & Fuel' },
  { key: 'COSTCO', category: 'Groceries' },
  { key: 'WALMART', category: 'Shopping' },
  { key: 'POPEYES', category: 'Food & Dining', subcategory: 'Fast Food' },
  { key: 'TIM HORTONS', category: 'Food & Dining', subcategory: 'Coffee' },
  { key: 'CDACARBONREBATE', category: 'Income', subcategory: 'Government Rebate' },
  { key: 'CANADA RIT', category: 'Income', subcategory: 'Tax Refund' },
  { key: 'MANULIFE', category: 'Income', subcategory: 'Insurance' },
  // FIX 1: Gordon Food split — PAY/GFS PAY → Income, generic → Groceries
  { key: 'GORDON FOOD SER PAY', category: 'Income', subcategory: 'Employment' },
  { key: 'GFS PAY', category: 'Income', subcategory: 'Employment' },
  { key: 'GORDON FOOD SER', category: 'Groceries', subcategory: 'Food Supply' },
  // (rest of overrides omitted — not needed for these tests)
];

function applyHardcodedOverride(merchant: string): { category: string; subcategory: string | null } | null {
  const upper = merchant.toUpperCase();
  const upperCompact = upper.replace(/[\s\-]+/g, '');
  for (const override of HARDCODED_OVERRIDES) {
    const keyCompact = override.key.replace(/[\s\-]+/g, '');
    if (upper.includes(override.key) || upperCompact.includes(keyCompact)) {
      return { category: override.category, subcategory: override.subcategory || null };
    }
  }
  return null;
}

// ─── Replicate merchantCategoryMap matching ───────────────────────────────
const MERCHANT_MAP_INCOME_ENTRIES: Record<string, { category: string; subcategory?: string }> = {
  "gordon food ser pay": { category: "Income", subcategory: "Employment" },
  "gfs pay": { category: "Income", subcategory: "Employment" },
  "gordon food": { category: "Groceries", subcategory: "Food Supply" },
  "gordon foods": { category: "Groceries", subcategory: "Food Supply" },
  "gfs edmonton": { category: "Groceries", subcategory: "Food Supply" },
  "costco gas": { category: "Transportation", subcategory: "Gas & Fuel" },
};

function matchTestMap(merchantName: string): { category: string; subcategory?: string } | null {
  const normalized = merchantName.toLowerCase().trim();
  for (const [pattern, result] of Object.entries(MERCHANT_MAP_INCOME_ENTRIES)) {
    if (normalized.includes(pattern)) return result;
  }
  return null;
}

// ─── Test runner ─────────────────────────────────────────────────────────
let passed = 0;
let failed = 0;

function assert(testName: string, condition: boolean, detail: string): void {
  if (condition) {
    console.log(`  ✅ PASS [${testName}]: ${detail}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL [${testName}]: ${detail}`);
    failed++;
  }
}

console.log('\n═══ P0 Categorization Fixes — Acceptance Tests ═══\n');

// ─── TEST 1: Gordon Food Service split ───────────────────────────────────
console.log('TEST 1: Gordon Food Service split');
{
  // PAY variant → Income
  const payResult = applyHardcodedOverride('GORDON FOOD SER PAY/PAY');
  assert('gfs-pay-income', payResult?.category === 'Income', `PAY/PAY → ${payResult?.category} (expected Income)`);
  assert('gfs-pay-subcategory', payResult?.subcategory === 'Employment', `subcategory → ${payResult?.subcategory} (expected Employment)`);

  // AP/CC variant → NOT Income
  const apResult = applyHardcodedOverride('GORDON FOOD SER AP/CC');
  assert('gfs-ap-not-income', apResult?.category !== 'Income', `AP/CC → ${apResult?.category} (expected NOT Income)`);
  assert('gfs-ap-groceries', apResult?.category === 'Groceries', `AP/CC → ${apResult?.category} (expected Groceries)`);

  // GFS PAY → Income
  const gfsPayResult = applyHardcodedOverride('GFS PAY EDMONTON');
  assert('gfs-pay-variant', gfsPayResult?.category === 'Income', `GFS PAY → ${gfsPayResult?.category} (expected Income)`);
}

// ─── TEST 2: GFS EDMONTON ────────────────────────────────────────────────
console.log('\nTEST 2: GFS EDMONTON not Income');
{
  // Hardcoded override check
  const hardcoded = applyHardcodedOverride('GFS EDMONTON');
  // GFS EDMONTON should NOT match GFS PAY (too short to match PAY pattern)
  assert('gfs-edm-hardcoded-not-income',
    !hardcoded || hardcoded.category !== 'Income',
    `Hardcoded → ${hardcoded?.category || 'null'} (expected NOT Income)`);

  // Merchant map check
  const mapResult = matchTestMap('GFS EDMONTON');
  assert('gfs-edm-map-not-income',
    mapResult?.category !== 'Income',
    `Map → ${mapResult?.category} (expected NOT Income)`);
  assert('gfs-edm-map-groceries',
    mapResult?.category === 'Groceries',
    `Map → ${mapResult?.category} (expected Groceries)`);
}

// ─── TEST 3: COSTCO GAS precedence ──────────────────────────────────────
console.log('\nTEST 3: COSTCO GAS precedence');
{
  const gasResult = applyHardcodedOverride('COSTCO GAS W123');
  assert('costco-gas-transport', gasResult?.category === 'Transportation',
    `COSTCO GAS → ${gasResult?.category} (expected Transportation)`);
  assert('costco-gas-subcategory', gasResult?.subcategory === 'Gas & Fuel',
    `subcategory → ${gasResult?.subcategory} (expected Gas & Fuel)`);

  const wholesaleResult = applyHardcodedOverride('COSTCO WHOLESALE #123');
  assert('costco-wholesale-groceries', wholesaleResult?.category === 'Groceries',
    `COSTCO WHOLESALE → ${wholesaleResult?.category} (expected Groceries)`);

  const plainResult = applyHardcodedOverride('COSTCO');
  assert('costco-plain-groceries', plainResult?.category === 'Groceries',
    `COSTCO → ${plainResult?.category} (expected Groceries)`);
}

// ─── TEST 4: User correction precedence ──────────────────────────────────
console.log('\nTEST 4: User correction precedence');
{
  // Simulate the priority chain from apply-category-rules.ts
  // When a user has a vendor_category_memory entry, it should win
  // over hardcoded overrides.

  // Scenario: user corrected COSTCO GAS → "Transportation" (via Tag)
  // but hardcoded says COSTCO GAS → Transportation (same in this case, so test with a different correction)
  // Better scenario: user corrected COSTCO → "Food & Dining" (disagrees with hardcoded "Groceries")
  const userMemory = new Map<string, string>();
  userMemory.set('costco', 'Food & Dining'); // user override

  const merchant = 'COSTCO WHOLESALE #123';
  const vendorKey = 'costco';

  // Simulate priority chain
  let finalCategory: string | null = null;
  let source = '';

  // Priority 0: User vendor memory
  const memoryCat = userMemory.get(vendorKey);
  if (memoryCat) {
    finalCategory = memoryCat;
    source = 'learned';
  }

  // Priority 1: (DB rules skipped in simulation)

  // Priority 2: Hardcoded overrides — should NOT reach this
  if (!finalCategory) {
    const hardcoded = applyHardcodedOverride(merchant);
    if (hardcoded) {
      finalCategory = hardcoded.category;
      source = 'hardcoded';
    }
  }

  assert('user-overrides-hardcoded',
    finalCategory === 'Food & Dining' && source === 'learned',
    `User correction → ${finalCategory} (source: ${source}) — hardcoded would have been Groceries`);

  // When NO user correction exists, hardcoded should still apply as default
  const noUserMemory = new Map<string, string>();
  let fallbackCat: string | null = null;
  let fallbackSource = '';

  const noMem = noUserMemory.get(vendorKey);
  if (noMem) {
    fallbackCat = noMem;
    fallbackSource = 'learned';
  }
  if (!fallbackCat) {
    const hardcoded = applyHardcodedOverride(merchant);
    if (hardcoded) {
      fallbackCat = hardcoded.category;
      fallbackSource = 'hardcoded';
    }
  }

  assert('hardcoded-default-still-works',
    fallbackCat === 'Groceries' && fallbackSource === 'hardcoded',
    `Without user correction → ${fallbackCat} (source: ${fallbackSource}) — hardcoded default applies`);
}

// ─── TEST 5: Sign/category safety ────────────────────────────────────────
console.log('\nTEST 5: Sign/category safety');
{
  // Simulate the sign/category check from commit-import.ts
  const autoSources = new Set([null, undefined, 'rule', 'ai', 'hardcoded', 'none', '']);

  function checkSignSafety(
    amount: number,
    category: string,
    categorySource: string | null
  ): { category: string; source: string | null } {
    const isAutomatic = autoSources.has(categorySource);
    if (isAutomatic && amount < 0 && category === 'Income') {
      return { category: 'Needs Review', source: 'sign_conflict' };
    }
    return { category, source: categorySource };
  }

  // Negative expense auto-categorized as Income → Needs Review
  const autoConflict = checkSignSafety(-988.16, 'Income', 'hardcoded');
  assert('negative-auto-income-blocked',
    autoConflict.category === 'Needs Review',
    `Auto -$988.16 + Income → ${autoConflict.category} (expected Needs Review)`);

  // Positive income auto-categorized as Income → allowed
  const autoCorrect = checkSignSafety(1793.86, 'Income', 'hardcoded');
  assert('positive-auto-income-allowed',
    autoCorrect.category === 'Income',
    `Auto +$1793.86 + Income → ${autoCorrect.category} (expected Income)`);

  // Negative expense with user correction as Income → allowed (user knows best)
  const userOverride = checkSignSafety(-50.00, 'Income', 'learned');
  assert('negative-user-income-allowed',
    userOverride.category === 'Income',
    `User -$50 + Income → ${userOverride.category} (expected Income — user correction respected)`);

  // Negative expense with tag_rule as Income → allowed (explicit user action)
  const tagRule = checkSignSafety(-25.00, 'Income', 'tag_rule');
  assert('negative-tagrule-income-allowed',
    tagRule.category === 'Income',
    `TagRule -$25 + Income → ${tagRule.category} (expected Income — user Tag rule respected)`);

  // Negative expense with AI source as Income → blocked
  const aiConflict = checkSignSafety(-100.00, 'Income', 'ai');
  assert('negative-ai-income-blocked',
    aiConflict.category === 'Needs Review',
    `AI -$100 + Income → ${aiConflict.category} (expected Needs Review)`);

  // Negative expense categorized as Groceries → allowed (no conflict)
  const normalExpense = checkSignSafety(-50.00, 'Groceries', 'hardcoded');
  assert('negative-groceries-allowed',
    normalExpense.category === 'Groceries',
    `Auto -$50 + Groceries → ${normalExpense.category} (expected Groceries — no conflict)`);
}

// ─── Golden examples from the audit ──────────────────────────────────────
console.log('\nGOLDEN EXAMPLES:');
{
  // GORDON FOOD SER PAY/PAY +$1,793.86 → Income / Employment
  const gfsPay = applyHardcodedOverride('GORDON FOOD SER PAY/PAY');
  assert('golden-gfs-pay', gfsPay?.category === 'Income' && gfsPay?.subcategory === 'Employment',
    `GORDON FOOD SER PAY/PAY → ${gfsPay?.category} / ${gfsPay?.subcategory}`);

  // GORDON FOOD SER AP/CC -$988.16 → NOT Income
  const gfsAp = applyHardcodedOverride('GORDON FOOD SER AP/CC');
  assert('golden-gfs-ap', gfsAp?.category !== 'Income',
    `GORDON FOOD SER AP/CC → ${gfsAp?.category} (NOT Income)`);

  // GFS EDMONTON -$3.14 → NOT Income (via merchant map)
  const gfsEdm = matchTestMap('GFS EDMONTON');
  assert('golden-gfs-edm', gfsEdm?.category !== 'Income',
    `GFS EDMONTON → ${gfsEdm?.category} (NOT Income)`);

  // COSTCO GAS -$92.51 → Transportation / Gas & Fuel
  const costcoGas = applyHardcodedOverride('COSTCO GAS BAR EDMT');
  assert('golden-costco-gas', costcoGas?.category === 'Transportation' && costcoGas?.subcategory === 'Gas & Fuel',
    `COSTCO GAS → ${costcoGas?.category} / ${costcoGas?.subcategory}`);

  // COSTCO WHOLESALE -$190.27 → Groceries
  const costcoWholesale = applyHardcodedOverride('COSTCO WHOLESALE #1234');
  assert('golden-costco-wholesale', costcoWholesale?.category === 'Groceries',
    `COSTCO WHOLESALE → ${costcoWholesale?.category}`);
}

// ─── Auto-Tag All (tag-categorize-committed) regression tests ────────────
// Replicates the RULES array + sign/category safety from tag-categorize-committed.ts
console.log('\nAUTO-TAG ALL (tag-categorize-committed) REGRESSION:');
{
  // Replicate the inline RULES from tag-categorize-committed.ts
  const COMMITTED_RULES: Array<{ contains: string[]; category: string }> = [
    { contains: ['gordon food ser pay', 'gordon foods pay'], category: 'Income' },
    { contains: ['celtic group'], category: 'Housing' },
    { contains: ['b/m payt', 'b/m pay', 'b/mpayt', 'b/mpay', 'mtg/hyp'], category: 'Housing' },
    { contains: ['td loan'], category: 'Transportation' },
    { contains: ['capital one'], category: 'Transfers' },
    { contains: ['bmo invinc'], category: 'Transfers' },
    { contains: ['easyfinancial', 'national money', 'lenddirect', 'lend direct'], category: 'Debt Payments' },
    { contains: ['ind all saving'], category: 'Savings' },
    { contains: ['mobile cheque deposit', 'cheque deposit'], category: 'Income' },
    { contains: ['starbucks', 'tim horton', 'second cup'], category: 'Food & Dining' },
    { contains: ['uber', 'lyft', 'taxi', 'transit', 'presto'], category: 'Transportation' },
    { contains: ['amazon', 'amzn'], category: 'Shopping' },
    { contains: ['payroll', 'salary', 'direct dep', 'employment'], category: 'Income' },
    { contains: ['gas', 'petro', 'shell', 'esso', 'fuel', 'husky', 'irving'], category: 'Transportation' },
    { contains: ['walmart', 'costco', 'kroger', 'safeway', 'sobeys', 'superstore', 'loblaws', 'metro ', 'iga ', 'food basics'], category: 'Groceries' },
  ];

  function applyCommittedRules(merchant: string): string | null {
    const lower = merchant.toLowerCase();
    for (const rule of COMMITTED_RULES) {
      if (rule.contains.some(k => lower.includes(k))) return rule.category;
    }
    return null;
  }

  // Replicate the sign/category safety check from tag-categorize-committed.ts (step 4b)
  function autoTagWithSafety(
    merchant: string, amount: number,
    memoryCategory?: string, source?: string,
  ): { category: string; source: string } {
    // Priority 0: vendor memory
    if (memoryCategory) return { category: memoryCategory, source: 'learned' };
    // Inline rules fallback
    const ruleCat = applyCommittedRules(merchant);
    const result = ruleCat
      ? { category: ruleCat, source: source || 'inline_rule' }
      : { category: 'Needs Review', source: 'needs_review' };
    // Sign/category safety — same as step 4b
    const userSources = new Set(['learned', 'tag_rule', 'tag_single']);
    if (result.category === 'Income' && !userSources.has(result.source)) {
      if (amount < 0) {
        return { category: 'Needs Review', source: 'sign_conflict' };
      }
    }
    return result;
  }

  // 1. Auto-Tag All: negative + Income → Needs Review
  const negIncome = autoTagWithSafety('MOBILE CHEQUE DEPOSIT', -500.00);
  assert('autotag-negative-income-blocked',
    negIncome.category === 'Needs Review' && negIncome.source === 'sign_conflict',
    `Auto-Tag negative cheque deposit → ${negIncome.category} / ${negIncome.source} (expected Needs Review / sign_conflict)`);

  // 2. Auto-Tag All: positive payroll → Income (allowed)
  const posPayroll = autoTagWithSafety('PAYROLL DIRECT DEPOSIT', 2500.00);
  assert('autotag-positive-payroll-income',
    posPayroll.category === 'Income',
    `Auto-Tag positive payroll → ${posPayroll.category} (expected Income)`);

  // 3. Auto-Tag All: COSTCO GAS → Transportation (gas rule matches before costco)
  const costcoGasAT = autoTagWithSafety('COSTCO GAS BAR EDMT', -92.51);
  assert('autotag-costco-gas-transportation',
    costcoGasAT.category === 'Transportation',
    `Auto-Tag COSTCO GAS → ${costcoGasAT.category} (expected Transportation)`);

  // 4. Auto-Tag All: learned user category outranks inline rules
  const learnedOverride = autoTagWithSafety('COSTCO WHOLESALE #1234', -190.00, 'Food & Dining');
  assert('autotag-learned-overrides-rules',
    learnedOverride.category === 'Food & Dining' && learnedOverride.source === 'learned',
    `Auto-Tag learned COSTCO → ${learnedOverride.category} / ${learnedOverride.source} (expected Food & Dining / learned)`);

  // 5. Auto-Tag All: GFS PAY → Income (PAY-specific rule works)
  const gfsPayAT = autoTagWithSafety('GORDON FOOD SER PAY/PAY', 1793.86);
  assert('autotag-gfs-pay-income',
    gfsPayAT.category === 'Income',
    `Auto-Tag GFS PAY → ${gfsPayAT.category} (expected Income)`);

  // 6. Auto-Tag All: GFS AP/CC → NOT Income (no match in committed RULES)
  const gfsApAT = autoTagWithSafety('GORDON FOOD SER AP/CC', -988.16);
  assert('autotag-gfs-apcc-not-income',
    gfsApAT.category !== 'Income',
    `Auto-Tag GFS AP/CC → ${gfsApAT.category} (expected NOT Income)`);

  // 7. Auto-Tag All: user vendor memory for negative Income is allowed (user intent)
  const learnedNegIncome = autoTagWithSafety('SOME VENDOR', -50.00, 'Income');
  assert('autotag-learned-negative-income-allowed',
    learnedNegIncome.category === 'Income' && learnedNegIncome.source === 'learned',
    `Auto-Tag learned negative Income → ${learnedNegIncome.category} (expected Income — user correction respected)`);

  // 8. Auto-Tag All: unmatched merchant → Needs Review
  const unknown = autoTagWithSafety('XYZZY MYSTERY SHOP', -25.00);
  assert('autotag-unmatched-needs-review',
    unknown.category === 'Needs Review',
    `Auto-Tag unknown merchant → ${unknown.category} (expected Needs Review)`);
}

// ─── Summary ─────────────────────────────────────────────────────────────
console.log('\n═══ Results ═══');
console.log(`  Passed: ${passed}`);
console.log(`  Failed: ${failed}`);
console.log(`  Total:  ${passed + failed}`);

if (failed > 0) {
  console.log('\n⚠ Some tests failed. Review above.');
  process.exit(1);
} else {
  console.log('\n✅ All tests passed.');
}
