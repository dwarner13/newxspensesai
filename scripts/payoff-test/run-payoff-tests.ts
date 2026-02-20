import process from 'node:process';

import {
  compareScenarios,
  computePayoffSchedule,
  normalizeFrequency,
  type PayoffInput,
} from '../../netlify/functions/_shared/financePayoff.ts';
import { resolveLoanFacts } from '../../netlify/functions/_shared/loanFacts.ts';

type TestCase = {
  name: string;
  run: () => void;
};

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

function assertNear(actual: number, expected: number, tolerance: number, message: string): void {
  const delta = Math.abs(actual - expected);
  if (delta > tolerance) {
    throw new Error(`${message} (actual=${actual}, expected=${expected}, tolerance=${tolerance})`);
  }
}

function baselineInput(): PayoffInput {
  return {
    principal: 20000,
    annualRate: 7.5,
    paymentAmount: 450,
    paymentFrequency: 'monthly',
  };
}

const tests: TestCase[] = [
  {
    name: 'frequency normalization maps expected labels',
    run: () => {
      assert(normalizeFrequency('weekly').paymentsPerYear === 52, 'weekly should map to 52');
      assert(normalizeFrequency('bi-weekly').paymentsPerYear === 26, 'biweekly should map to 26');
      assert(normalizeFrequency('semi monthly').paymentsPerYear === 24, 'semi monthly should map to 24');
      assert(normalizeFrequency('monthly').paymentsPerYear === 12, 'monthly should map to 12');
    },
  },
  {
    name: 'compute schedule pays down to zero',
    run: () => {
      const result = computePayoffSchedule(baselineInput());
      assert(result.endBalance <= 0.01, 'expected near-zero end balance');
      assert(result.payoffPeriods > 0, 'payoff periods should be positive');
      assert(result.totalInterest > 0, 'total interest should be positive');
      assert(result.warnings.length === 0, 'expected no warnings for healthy baseline');
    },
  },
  {
    name: 'negative amortization adds warning and safe output',
    run: () => {
      const result = computePayoffSchedule({
        principal: 50000,
        annualRate: 24,
        paymentAmount: 10,
        paymentFrequency: 'monthly',
      });
      assert(result.warnings.some((w) => /negative amortization/i.test(w)), 'expected negative amortization warning');
      assert(result.payoffDateISO === null, 'payoff date should be null when not paying down');
      assert(result.endBalance > 0, 'balance should remain positive');
    },
  },
  {
    name: 'extra payment scenario saves interest and time',
    run: () => {
      const base = baselineInput();
      const scenario = { ...base, extraPayment: 50 };
      const compared = compareScenarios(base, scenario);
      assert(compared.delta.interestSaved > 0, 'expected positive interest savings');
      assert(compared.delta.periodsSaved > 0, 'expected fewer periods');
      assert(compared.delta.timeSavedDays > 0, 'expected positive time savings');
    },
  },
  {
    name: 'weekly vs monthly uses different period math',
    run: () => {
      const monthly = computePayoffSchedule({
        principal: 10000,
        annualRate: 8,
        paymentAmount: 250,
        paymentFrequency: 'monthly',
      });
      const weekly = computePayoffSchedule({
        principal: 10000,
        annualRate: 8,
        paymentAmount: 62.5,
        paymentFrequency: 'weekly',
      });
      assert(monthly.payoffPeriods > 0 && weekly.payoffPeriods > 0, 'both schedules should compute');
      assert(monthly.payoffPeriods !== weekly.payoffPeriods, 'period counts should differ by frequency');
    },
  },
  {
    name: 'lump sum reduces payoff periods',
    run: () => {
      const base = computePayoffSchedule({
        principal: 25000,
        annualRate: 6.5,
        paymentAmount: 500,
        paymentFrequency: 'monthly',
      });
      const withLump = computePayoffSchedule({
        principal: 25000,
        annualRate: 6.5,
        paymentAmount: 500,
        paymentFrequency: 'monthly',
        lumpSum: 2000,
      });
      assert(withLump.payoffPeriods < base.payoffPeriods, 'lump sum should reduce periods');
    },
  },
  {
    name: 'loan facts follow-up reuses snapshot defaults',
    run: () => {
      const snapshotRaw = {
        finley_json: {
          payoff: {
            baseline_assumptions: {
              principal: 150000,
              annualRate: 5.2,
              paymentAmount: 1200,
              paymentFrequency: 'monthly',
            },
          },
        },
      };
      const resolved = resolveLoanFacts({}, 'What if I add extra $50/week?', snapshotRaw);
      assert(resolved.missing.length === 0, 'expected no missing fields from snapshot defaults');
      assertNear(Number(resolved.facts.principal || 0), 150000, 0.01, 'snapshot principal should be reused');
      assertNear(Number(resolved.facts.annualRate || 0), 5.2, 0.01, 'snapshot rate should be reused');
      assertNear(Number(resolved.facts.paymentAmount || 0), 1200, 0.01, 'snapshot payment should be reused');
      assert(String(resolved.facts.paymentFrequency || '') === 'monthly', 'snapshot frequency should be reused');
    },
  },
];

function runAll(contractMode: boolean): void {
  const failures: Array<{ name: string; error: string }> = [];
  for (const t of tests) {
    try {
      t.run();
      console.log(`[PAYOFF TEST] PASS ${t.name}`);
    } catch (error: any) {
      const msg = error?.message || String(error);
      failures.push({ name: t.name, error: msg });
      console.error(`[PAYOFF TEST] FAIL ${t.name}: ${msg}`);
    }
  }

  if (contractMode) {
    console.log(`[PAYOFF TEST][CONTRACT] total=${tests.length} pass=${tests.length - failures.length} fail=${failures.length}`);
    if (failures.length > 0) {
      for (const fail of failures) {
        console.error(`[PAYOFF TEST][CONTRACT] ${fail.name}: ${fail.error}`);
      }
    }
  }

  if (failures.length > 0) {
    process.exitCode = 1;
  }
}

const isContract = process.argv.includes('--contract');
runAll(isContract);
