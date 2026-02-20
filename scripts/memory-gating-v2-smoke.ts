import { shouldUseMemoryV2 } from '../netlify/functions/chat.ts';

type TestCase = {
  message: string;
  expectedNeed: boolean;
};

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

const cases: TestCase[] = [
  { message: 'how do I upload a bank statement', expectedNeed: false },
  { message: 'do you accept invoices', expectedNeed: false },
  { message: 'what did I spend last month', expectedNeed: true },
  { message: 'based on my statements, what subscriptions do I have', expectedNeed: true },
  { message: 'give me a plan to save money', expectedNeed: false },
  { message: 'give me a plan to save money based on my spending', expectedNeed: true },
];

function run(): void {
  for (const testCase of cases) {
    const decision = shouldUseMemoryV2({
      messageText: testCase.message,
      employeeSlug: 'prime-boss',
      primeDecision: { lane: 'model' },
      hasAttachments: false,
      pipelineSnapshotLoaded: false,
    });
    assert(
      decision.need === testCase.expectedNeed,
      `Expected "${testCase.message}" => ${testCase.expectedNeed}, got ${decision.need} (${decision.reason})`
    );
  }

  console.log('[memory-gating-v2-smoke] PASS');
}

try {
  run();
} catch (error) {
  console.error('[memory-gating-v2-smoke] FAIL', error);
  process.exitCode = 1;
}
