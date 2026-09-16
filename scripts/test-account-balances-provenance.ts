/**
 * Account Balances Query — Provenance Regression Tests
 *
 * Validates the fact-integrity fix for account_balances_query:
 * - Case A: No accounts table → empty result with provenance: unavailable
 * - Case B: Accounts table exists, empty → same empty result
 * - Case C: Verified accounts returned with provenance: verified_db
 * - Case D: No synthetic "Estimated Balance" checking account ever appears
 * - Case E: FACT INTEGRITY rule present in primePolicy.ts
 */
import { readFileSync } from 'fs';

let passed = 0;
let failed = 0;

function assert(name: string, condition: boolean) {
  if (condition) { passed++; console.log('PASS:', name); }
  else { failed++; console.error('FAIL:', name); }
}

// ═══════════════════════════════════════════════════════════════════════════
// 1. Source code structure — account_balances_query.ts
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n=== 1: account_balances_query.ts structure ===\n');
const toolSrc = readFileSync('src/agent/tools/impl/account_balances_query.ts', 'utf8');

// Case A/B: When no verified accounts exist, return empty + unavailable
assert('ABQ1a. returns empty accounts array on error/empty',
  toolSrc.includes("accounts: []"));
assert('ABQ1b. returns totalBalance: null on error/empty',
  toolSrc.includes("totalBalance: null"));
assert('ABQ1c. returns hasVerifiedBalances: false on error/empty',
  toolSrc.includes("hasVerifiedBalances: false"));
assert('ABQ1d. returns provenance: unavailable on error/empty',
  toolSrc.includes("provenance: 'unavailable'"));

// Case D: No synthetic account
assert('ABQ1e. no Estimated Balance string',
  !toolSrc.includes('Estimated Balance'));
assert('ABQ1f. no estimatedBalance variable',
  !toolSrc.includes('estimatedBalance'));
assert('ABQ1g. no totalIncome calculation',
  !toolSrc.includes('totalIncome'));
assert('ABQ1h. no totalExpenses calculation',
  !toolSrc.includes('totalExpenses'));
assert('ABQ1i. no transactions table query',
  !toolSrc.includes("from('transactions')"));
assert('ABQ1j. no type=income filter',
  !toolSrc.includes("type === 'income'"));
assert('ABQ1k. no type=expense filter',
  !toolSrc.includes("type === 'expense'"));

// Case C: Verified accounts get provenance
assert('ABQ1l. verified accounts have source: verified_db',
  toolSrc.includes("source: 'verified_db'"));
assert('ABQ1m. verified path returns hasVerifiedBalances: true',
  toolSrc.includes("hasVerifiedBalances: true"));
assert('ABQ1n. verified path returns provenance: verified_db',
  toolSrc.includes("provenance: 'verified_db'"));

// Schema correctness
assert('ABQ1o. output schema has hasVerifiedBalances boolean',
  toolSrc.includes("hasVerifiedBalances: z.boolean()"));
assert('ABQ1p. output schema has provenance enum',
  toolSrc.includes("provenance: z.enum(['verified_db', 'unavailable'])"));
assert('ABQ1q. output schema totalBalance is nullable',
  toolSrc.includes("totalBalance: z.number().nullable()"));
assert('ABQ1r. output schema account source field exists',
  toolSrc.includes("source: z.enum(['verified_db'])"));

// No synthetic summary (removed)
assert('ABQ1s. no totalChecking aggregation',
  !toolSrc.includes('totalChecking'));
assert('ABQ1t. no totalSavings aggregation',
  !toolSrc.includes('totalSavings'));
assert('ABQ1u. no totalCredit aggregation',
  !toolSrc.includes('totalCredit'));
assert('ABQ1v. no totalInvestment aggregation',
  !toolSrc.includes('totalInvestment'));

// ═══════════════════════════════════════════════════════════════════════════
// 2. Tool registry — index.ts description
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n=== 2: Tool registry description ===\n');
const indexSrc = readFileSync('src/agent/tools/index.ts', 'utf8');

assert('ABQ2a. description mentions verified',
  indexSrc.includes("'Query verified account balances"));
assert('ABQ2b. description mentions hasVerifiedBalances',
  indexSrc.includes('hasVerifiedBalances: false'));
assert('ABQ2c. description mentions provenance: unavailable',
  indexSrc.includes('provenance: unavailable'));
assert('ABQ2d. description says never estimates',
  indexSrc.includes('Never estimates or synthesizes'));
assert('ABQ2e. old description removed (wealth calculations)',
  !indexSrc.includes('wealth calculations or net worth projections'));

// ═══════════════════════════════════════════════════════════════════════════
// 3. Case E — FACT INTEGRITY rule in primePolicy.ts
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n=== 3: FACT INTEGRITY provenance rule ===\n');
const policySrc = readFileSync('netlify/functions/_shared/primePolicy.ts', 'utf8');

assert('ABQ3a. provenance unavailable rule exists',
  policySrc.includes("provenance: \"unavailable\"") ||
  policySrc.includes("provenance: 'unavailable'") ||
  policySrc.includes('provenance: "unavailable"'));
assert('ABQ3b. hasVerifiedBalances: false rule exists',
  policySrc.includes('hasVerifiedBalances: false'));
assert('ABQ3c. rule says treat as absent',
  policySrc.includes('treat the data as absent'));
assert('ABQ3d. rule prohibits reporting $0',
  policySrc.includes('do not say "your balance is $0"') ||
  policySrc.includes("do not say") && policySrc.includes("balance is $0"));
assert('ABQ3e. rule says state unavailable naturally',
  policySrc.includes('verified account data is not available'));

// ═══════════════════════════════════════════════════════════════════════════
// 4. No leftover dangerous patterns
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n=== 4: No dangerous patterns remaining ===\n');

assert('ABQ4a. no .limit(1000) transaction grab',
  !toolSrc.includes('.limit(1000)'));
assert('ABQ4b. no Math.abs usage (sign manipulation)',
  !toolSrc.includes('Math.abs'));
assert('ABQ4c. no fallback comment',
  !toolSrc.includes('Fallback: Calculate approximate'));
assert('ABQ4d. no "calculate from transactions" comment',
  !toolSrc.includes('calculate from transactions'));

// ═══════════════════════════════════════════════════════════════════════════
console.log(`\n${'='.repeat(60)}`);
console.log(`ACCOUNT BALANCES PROVENANCE: ${passed} passed, ${failed} failed`);
console.log(`${'='.repeat(60)}`);
if (failed > 0) process.exit(1);
