import process from 'node:process';

import { detectPrimeHelpFastLaneIntent } from '../netlify/functions/_shared/primeHelpFastLane.ts';

type TestCase = {
  message: string;
  expected: boolean;
};

const tests: TestCase[] = [
  { message: 'how do I upload a bank statement', expected: true },
  { message: 'do you accept invoices', expected: true },
  { message: 'what did I spend last month', expected: false },
  { message: 'based on my statement, what subscriptions do I have', expected: false },
];

let failed = 0;
for (const t of tests) {
  const actual = detectPrimeHelpFastLaneIntent(t.message).use;
  if (actual !== t.expected) {
    failed += 1;
    console.error(`[HELP FAST LANE TEST] FAIL "${t.message}" expected=${t.expected} actual=${actual}`);
  } else {
    console.log(`[HELP FAST LANE TEST] PASS "${t.message}" -> ${actual}`);
  }
}

if (failed > 0) {
  process.exitCode = 1;
}
