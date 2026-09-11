/**
 * Financial Position V1.1a — Foundation Tests
 *
 * Tests provenance, period labeling, unknown-not-zero semantics,
 * and safe handling of missing/empty data.
 */
import type {
  FinancialPosition, FinancialSource, DataStatus,
  IncomeArea, SpendingArea, CashFlowArea, GoalsArea,
} from '../netlify/functions/_shared/financial-position';
import { buildFinancialPosition, formatPositionForPrompt } from '../netlify/functions/_shared/financial-position';

let passed = 0;
let failed = 0;

function assert(name: string, condition: boolean) {
  if (condition) { passed++; console.log('PASS:', name); }
  else { failed++; console.error('FAIL:', name); }
}

// ─── Mock Supabase client ─────────────────────────────────────────────────

function mockSupabase(opts: {
  transactions?: any[];
  txError?: any;
  goalsData?: any[] | null;
  goalsError?: boolean;
}) {
  const txs = opts.transactions || [];
  const goalsData = opts.goalsData;
  const goalsError = opts.goalsError || false;

  return {
    from: (table: string) => {
      if (table === 'transactions') {
        return {
          select: () => ({
            eq: () => {
              if (opts.txError) return Promise.resolve({ data: null, error: opts.txError });
              return Promise.resolve({ data: txs, error: null });
            },
          }),
        };
      }
      if (table === 'goals') {
        return {
          select: () => ({
            eq: (_col: string, _val: any) => ({
              eq: () => {
                if (goalsError) return Promise.reject(new Error('goals query failed'));
                return Promise.resolve({ data: goalsData, error: null });
              },
            }),
          }),
        };
      }
      return { select: () => ({ eq: () => Promise.resolve({ data: [], error: null }) }) };
    },
  } as any;
}

// ─── Test transactions ────────────────────────────────────────────────────

const sampleTxs = [
  { date: '2025-01-15', amount: -50, category: 'Food & Dining', type: 'expense' },
  { date: '2025-01-20', amount: -200, category: 'Transportation', type: 'expense' },
  { date: '2025-02-10', amount: 3000, category: 'Income', type: 'income' },
  { date: '2025-06-15', amount: -100, category: 'Groceries', type: 'expense' },
  { date: '2025-06-20', amount: -75, category: 'Transfers', type: 'expense' },  // non-spend
  { date: '2025-12-01', amount: 4000, category: 'Income', type: 'income' },
  { date: '2025-12-15', amount: -500, category: 'Debt Payments', type: 'expense' },  // non-spend
];

// ═══════════════════════════════════════════════════════════════════════════
// FP1. Income includes period dates
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n=== FP1: Income period dates ===\n');
{
  const sb = mockSupabase({ transactions: sampleTxs, goalsData: [] });
  const pos = await buildFinancialPosition({ supabase: sb, userId: 'test', currency: 'CAD' });
  assert('FP1a. income status = verified', pos.income.status === 'verified');
  assert('FP1b. periodTotal has periodStart', pos.income.periodTotal?.periodStart === '2025-01-15');
  assert('FP1c. periodTotal has periodEnd', pos.income.periodTotal?.periodEnd === '2025-12-15');
  assert('FP1d. periodTotal source = verified_db', pos.income.periodTotal?.source === 'verified_db');
  assert('FP1e. periodTotal amount = 7000', pos.income.periodTotal?.amount === 7000);
}

// ═══════════════════════════════════════════════════════════════════════════
// FP2. Spending includes period dates
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n=== FP2: Spending period dates ===\n');
{
  const sb = mockSupabase({ transactions: sampleTxs, goalsData: [] });
  const pos = await buildFinancialPosition({ supabase: sb, userId: 'test', currency: 'CAD' });
  assert('FP2a. spending status = verified', pos.spending.status === 'verified');
  assert('FP2b. periodTotal has periodStart', pos.spending.periodTotal?.periodStart === '2025-01-15');
  assert('FP2c. periodTotal has periodEnd', pos.spending.periodTotal?.periodEnd === '2025-12-15');
  // Spending excludes non-spend: Transfers ($75) and Debt Payments ($500)
  // Remaining: 50 + 200 + 100 = 350
  assert('FP2d. spending excludes non-spend', pos.spending.periodTotal?.amount === 350);
}

// ═══════════════════════════════════════════════════════════════════════════
// FP3. Unsupported savings => unavailable, never zero
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n=== FP3: Savings unavailable ===\n');
{
  const sb = mockSupabase({ transactions: sampleTxs, goalsData: [] });
  const pos = await buildFinancialPosition({ supabase: sb, userId: 'test', currency: 'CAD' });
  assert('FP3a. savings status = unavailable', pos.savings.status === 'unavailable');
  assert('FP3b. savings source = unavailable', pos.savings.source === 'unavailable');
  // Verify it is NOT zero
  assert('FP3c. savings is not verified_zero', pos.savings.status !== 'verified_zero');
}

// ═══════════════════════════════════════════════════════════════════════════
// FP4. Unsupported debt => unavailable, never zero
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n=== FP4: Debt unavailable ===\n');
{
  const sb = mockSupabase({ transactions: sampleTxs, goalsData: [] });
  const pos = await buildFinancialPosition({ supabase: sb, userId: 'test', currency: 'CAD' });
  assert('FP4a. debt status = unavailable', pos.debt.status === 'unavailable');
  assert('FP4b. debt source = unavailable', pos.debt.source === 'unavailable');
  assert('FP4c. debt is not verified_zero', pos.debt.status !== 'verified_zero');
}

// ═══════════════════════════════════════════════════════════════════════════
// FP5. Verified values carry verified_db provenance
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n=== FP5: Verified provenance ===\n');
{
  const sb = mockSupabase({ transactions: sampleTxs, goalsData: [] });
  const pos = await buildFinancialPosition({ supabase: sb, userId: 'test', currency: 'CAD' });
  assert('FP5a. income source = verified_db', pos.income.source === 'verified_db');
  assert('FP5b. spending source = verified_db', pos.spending.source === 'verified_db');
  assert('FP5c. income periodTotal source', pos.income.periodTotal?.source === 'verified_db');
}

// ═══════════════════════════════════════════════════════════════════════════
// FP6. Current-month values have correct month boundaries
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n=== FP6: Current-month boundaries ===\n');
{
  const sb = mockSupabase({ transactions: sampleTxs, goalsData: [] });
  const pos = await buildFinancialPosition({ supabase: sb, userId: 'test', currency: 'CAD' });
  const now = new Date();
  const expectedStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  assert('FP6a. monthlySpend has periodStart', pos.spending.monthlySpend?.periodStart === expectedStart);
  assert('FP6b. monthlyIncome has periodStart', pos.income.monthlyIncome?.periodStart === expectedStart);
}

// ═══════════════════════════════════════════════════════════════════════════
// FP7. Data coverage first/last transaction
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n=== FP7: Data coverage ===\n');
{
  const sb = mockSupabase({ transactions: sampleTxs, goalsData: [] });
  const pos = await buildFinancialPosition({ supabase: sb, userId: 'test', currency: 'CAD' });
  assert('FP7a. firstTransaction', pos.dataCoverage.firstTransaction === '2025-01-15');
  assert('FP7b. lastTransaction', pos.dataCoverage.lastTransaction === '2025-12-15');
  assert('FP7c. transactionCount = 7', pos.dataCoverage.transactionCount === 7);
  assert('FP7d. monthsCovered > 0', pos.dataCoverage.monthsCovered > 0);
}

// ═══════════════════════════════════════════════════════════════════════════
// FP8. Empty transaction history handled safely
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n=== FP8: Empty history ===\n');
{
  const sb = mockSupabase({ transactions: [], goalsData: [] });
  const pos = await buildFinancialPosition({ supabase: sb, userId: 'test', currency: 'CAD' });
  assert('FP8a. income unavailable', pos.income.status === 'unavailable');
  assert('FP8b. spending unavailable', pos.spending.status === 'unavailable');
  assert('FP8c. cashFlow unavailable', pos.cashFlow.status === 'unavailable');
  assert('FP8d. firstTransaction null', pos.dataCoverage.firstTransaction === null);
  assert('FP8e. transactionCount = 0', pos.dataCoverage.transactionCount === 0);
  assert('FP8f. monthsCovered = 0', pos.dataCoverage.monthsCovered === 0);
}

// ═══════════════════════════════════════════════════════════════════════════
// FP9. Missing areas correct
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n=== FP9: Missing areas ===\n');
{
  const sb = mockSupabase({ transactions: sampleTxs, goalsData: [] });
  const pos = await buildFinancialPosition({ supabase: sb, userId: 'test', currency: 'CAD' });
  assert('FP9a. savings listed as missing', pos.missingAreas.some(a => a.includes('savings')));
  assert('FP9b. debt listed as missing', pos.missingAreas.some(a => a.includes('debt')));
  assert('FP9c. timeline listed as missing', pos.missingAreas.some(a => a.includes('timeline')));
  assert('FP9d. income NOT listed as missing', !pos.missingAreas.some(a => a.includes('income')));
}

// ═══════════════════════════════════════════════════════════════════════════
// FP10. Goals empty authoritative result => verified_zero
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n=== FP10: Goals verified_zero ===\n');
{
  const sb = mockSupabase({ transactions: sampleTxs, goalsData: [] });
  const pos = await buildFinancialPosition({ supabase: sb, userId: 'test', currency: 'CAD' });
  assert('FP10a. goals status = verified_zero', pos.goals.status === 'verified_zero');
  assert('FP10b. goals source = verified_db', pos.goals.source === 'verified_db');
  assert('FP10c. activeCount = 0', pos.goals.activeCount === 0);
}

// ═══════════════════════════════════════════════════════════════════════════
// FP11. Goals query failure => unavailable, NOT verified_zero
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n=== FP11: Goals query failure ===\n');
{
  const sb = mockSupabase({ transactions: sampleTxs, goalsError: true });
  const pos = await buildFinancialPosition({ supabase: sb, userId: 'test', currency: 'CAD' });
  assert('FP11a. goals status = unavailable', pos.goals.status === 'unavailable');
  assert('FP11b. goals NOT verified_zero', pos.goals.status !== 'verified_zero');
}

// ═══════════════════════════════════════════════════════════════════════════
// FP12. Derived cash flow identifies its basis/source
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n=== FP12: Derived cash flow ===\n');
{
  const sb = mockSupabase({ transactions: sampleTxs, goalsData: [] });
  const pos = await buildFinancialPosition({ supabase: sb, userId: 'test', currency: 'CAD' });
  assert('FP12a. cashFlow status = estimated', pos.cashFlow.status === 'estimated');
  assert('FP12b. cashFlow source = derived', pos.cashFlow.source === 'derived');
  assert('FP12c. monthlyNet has basis', !!pos.cashFlow.monthlyNet?.basis);
  assert('FP12d. basis mentions income minus spending',
    pos.cashFlow.monthlyNet?.basis?.includes('income minus') === true);
}

// ═══════════════════════════════════════════════════════════════════════════
// FP13. Multi-period totals NOT automatically annualized
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n=== FP13: No automatic annualization ===\n');
{
  const sb = mockSupabase({ transactions: sampleTxs, goalsData: [] });
  const pos = await buildFinancialPosition({ supabase: sb, userId: 'test', currency: 'CAD' });
  // Period total is the raw sum, NOT annualized
  // Income: 3000 + 4000 = 7000 over 11 months — should remain 7000, NOT annualized
  assert('FP13a. income is raw total not annualized', pos.income.periodTotal?.amount === 7000);
  assert('FP13b. no annualization basis', pos.income.periodTotal?.basis === undefined);
  // Spending: 50 + 200 + 100 = 350 — raw, not annualized
  assert('FP13c. spending is raw total not annualized', pos.spending.periodTotal?.amount === 350);
}

// ═══════════════════════════════════════════════════════════════════════════
// FP14. Transaction query error => all tx-dependent areas unavailable
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n=== FP14: Transaction error ===\n');
{
  const sb = mockSupabase({ transactions: [], txError: { message: 'DB error' }, goalsData: [] });
  const pos = await buildFinancialPosition({ supabase: sb, userId: 'test', currency: 'CAD' });
  assert('FP14a. income unavailable on tx error', pos.income.status === 'unavailable');
  assert('FP14b. spending unavailable on tx error', pos.spending.status === 'unavailable');
  assert('FP14c. cashFlow unavailable on tx error', pos.cashFlow.status === 'unavailable');
}

// ═══════════════════════════════════════════════════════════════════════════
// FP15. Time horizon defaults to unavailable
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n=== FP15: Time horizon ===\n');
{
  const sb = mockSupabase({ transactions: sampleTxs, goalsData: [] });
  const pos = await buildFinancialPosition({ supabase: sb, userId: 'test', currency: 'CAD' });
  assert('FP15a. timeHorizon = unavailable', pos.timeHorizon.status === 'unavailable');
}

// ═══════════════════════════════════════════════════════════════════════════
// FP16. Compact prompt representation
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n=== FP16: Prompt format ===\n');
{
  const sb = mockSupabase({ transactions: sampleTxs, goalsData: [] });
  const pos = await buildFinancialPosition({ supabase: sb, userId: 'test', currency: 'CAD' });
  const text = formatPositionForPrompt(pos);
  assert('FP16a. starts with FINANCIAL POSITION', text.startsWith('FINANCIAL POSITION:'));
  assert('FP16b. contains period dates', text.includes('2025-01-15') && text.includes('2025-12-15'));
  assert('FP16c. savings shows unavailable', text.includes('unavailable'));
  assert('FP16d. debt shows unavailable', text.includes('Debt details: unavailable'));
  assert('FP16e. compact size < 1500 chars', text.length < 1500);
  assert('FP16f. missing areas listed', text.includes('Missing:'));
}

// ═══════════════════════════════════════════════════════════════════════════
// FP17. Goals with active goals => verified
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n=== FP17: Active goals ===\n');
{
  const sb = mockSupabase({
    transactions: sampleTxs,
    goalsData: [{ id: 'g1', status: 'active' }, { id: 'g2', status: 'active' }],
  });
  const pos = await buildFinancialPosition({ supabase: sb, userId: 'test', currency: 'CAD' });
  assert('FP17a. goals status = verified', pos.goals.status === 'verified');
  assert('FP17b. activeCount = 2', pos.goals.activeCount === 2);
}

console.log(`\n${'='.repeat(60)}`);
console.log(`FINANCIAL POSITION V1.1a: ${passed} passed, ${failed} failed`);
console.log(`${'='.repeat(60)}`);
if (failed > 0) process.exit(1);
