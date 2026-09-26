/**
 * P3.0B — Prime Conversation Ownership Guard — Test Script
 *
 * Tests the ownership guard logic that prevents informational handoffs
 * from permanently transferring session ownership away from Prime for
 * PRODUCT_HELP and FINANCIAL_EDUCATION intents.
 *
 * Run: npx tsx scripts/test-p3-0b-ownership-guard.ts
 */

import { classifyPrimeIntent, PrimeIntent, type PrimeIntentClassification, type ClassifierContext } from '../src/shared/prime-intent-classifier';

// ─────────────────────────────────────────────────────────────────────────────
// GUARD LOGIC (mirrors chat.ts performHandoffLifecycle P3.0B gate)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Simulates the P3.0B ownership guard decision.
 *
 * @param isPrime       - Is the current employee Prime?
 * @param isTagTarget   - Is the handoff target tag-ai?
 * @param shadowIntent  - The shadow intent classification result
 * @returns true if the handoff should be BLOCKED
 */
function shouldBlockHandoff(
  isPrime: boolean,
  isTagTarget: boolean,
  shadowIntent: PrimeIntentClassification | null,
): boolean {
  if (
    isPrime &&
    !isTagTarget &&
    shadowIntent &&
    (shadowIntent.confidence === 'deterministic' || shadowIntent.confidence === 'high') &&
    (shadowIntent.intent === 'product_help' || shadowIntent.intent === 'financial_education')
  ) {
    return true;
  }
  return false;
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const NO_EXT: ClassifierContext = {
  candidateFollowUpDetected: false,
  historicalReferenceDetected: false,
};

interface TestCase {
  label: string;
  msg: string;
  isPrime: boolean;
  targetSlug: string;
  ctx?: ClassifierContext;
  expectBlocked: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// TEST CASES (20 required by spec)
// ─────────────────────────────────────────────────────────────────────────────

const tests: TestCase[] = [
  // ── BLOCKED: PRODUCT_HELP handoffs from Prime to non-Tag ──
  {
    label: '1. PRODUCT_HELP → custodian: BLOCKED',
    msg: 'How do I upload a statement?',
    isPrime: true,
    targetSlug: 'custodian',
    expectBlocked: true,
  },
  {
    label: '2. PRODUCT_HELP (file types) → custodian: BLOCKED',
    msg: 'What kind of files can I upload?',
    isPrime: true,
    targetSlug: 'custodian',
    expectBlocked: true,
  },
  {
    label: '3. PRODUCT_HELP (navigation) → custodian: BLOCKED',
    msg: 'Where do I put another bank statement?',
    isPrime: true,
    targetSlug: 'custodian',
    expectBlocked: true,
  },
  {
    label: '4. PRODUCT_HELP (PDF upload) → custodian: BLOCKED',
    msg: 'Can I upload a PDF here?',
    isPrime: true,
    targetSlug: 'custodian',
    expectBlocked: true,
  },

  // ── BLOCKED: FINANCIAL_EDUCATION handoffs from Prime to non-Tag ──
  {
    label: '5. FINANCIAL_EDUCATION → finley: BLOCKED',
    msg: 'What is compound interest?',
    isPrime: true,
    targetSlug: 'finley',
    expectBlocked: true,
  },
  {
    label: '6. FINANCIAL_EDUCATION (APR) → custodian: BLOCKED',
    msg: 'Explain APR to me.',
    isPrime: true,
    targetSlug: 'custodian',
    expectBlocked: true,
  },
  {
    label: '7. FINANCIAL_EDUCATION (RRSP) → crystal: BLOCKED',
    msg: "What's the difference between an RRSP and TFSA?",
    isPrime: true,
    targetSlug: 'crystal-analytics',
    expectBlocked: true,
  },
  {
    label: '8. FINANCIAL_EDUCATION (amortization) → finley: BLOCKED',
    msg: 'How does amortization work?',
    isPrime: true,
    targetSlug: 'finley',
    expectBlocked: true,
  },

  // ── ALLOWED: Tag handoffs are NEVER blocked by P3.0B ──
  {
    label: '9. PRODUCT_HELP → tag-ai: ALLOWED (Tag exempt)',
    msg: 'How do I upload a statement?',
    isPrime: true,
    targetSlug: 'tag-ai',
    expectBlocked: false,
  },
  {
    label: '10. FINANCIAL_EDUCATION → tag-ai: ALLOWED (Tag exempt)',
    msg: 'What is compound interest?',
    isPrime: true,
    targetSlug: 'tag-ai',
    expectBlocked: false,
  },

  // ── ALLOWED: Non-Prime employees are not guarded ──
  {
    label: '11. PRODUCT_HELP from byte-docs: ALLOWED (not Prime)',
    msg: 'How do I upload a statement?',
    isPrime: false,
    targetSlug: 'custodian',
    expectBlocked: false,
  },
  {
    label: '12. FINANCIAL_EDUCATION from crystal: ALLOWED (not Prime)',
    msg: 'What is compound interest?',
    isPrime: false,
    targetSlug: 'finley',
    expectBlocked: false,
  },

  // ── ALLOWED: Other intent lanes pass through freely ──
  {
    label: '13. FINANCIAL_DATA_LOOKUP → crystal: ALLOWED',
    msg: 'Show me my last 9 Costco transactions.',
    isPrime: true,
    targetSlug: 'crystal-analytics',
    expectBlocked: false,
  },
  {
    label: '14. SPECIALIST_ACTION → tag-ai: ALLOWED',
    msg: 'Change that to Gas & Fuel.',
    isPrime: true,
    targetSlug: 'tag-ai',
    expectBlocked: false,
  },
  {
    label: '15. CONVERSATION → custodian: ALLOWED',
    msg: 'Thanks.',
    isPrime: true,
    targetSlug: 'custodian',
    expectBlocked: false,
  },
  {
    label: '16. GENERAL → custodian: ALLOWED',
    msg: 'Tell me about this.',
    isPrime: true,
    targetSlug: 'custodian',
    expectBlocked: false,
  },
  {
    label: '17. FINANCIAL_ANALYSIS → crystal: ALLOWED',
    msg: 'Where am I wasting money?',
    isPrime: true,
    targetSlug: 'crystal-analytics',
    expectBlocked: false,
  },
  {
    label: '18. FINANCIAL_CALCULATION → finley: ALLOWED',
    msg: 'How much interest would I save if I paid another $200 a month?',
    isPrime: true,
    targetSlug: 'finley',
    expectBlocked: false,
  },
  {
    label: '19. DOCUMENT_QUERY → byte-docs: ALLOWED',
    msg: 'Did my bank statement upload?',
    isPrime: true,
    targetSlug: 'byte-docs',
    expectBlocked: false,
  },
  {
    label: '20. GOAL_PLANNING → goalie: ALLOWED',
    msg: 'How am I doing on my savings goal?',
    isPrime: true,
    targetSlug: 'goalie',
    expectBlocked: false,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// RUN
// ─────────────────────────────────────────────────────────────────────────────

let pass = 0;
let fail = 0;
const failures: string[] = [];

for (const t of tests) {
  const ctx = t.ctx ?? NO_EXT;
  const shadowIntent = classifyPrimeIntent(t.msg, ctx);
  const isTagTarget = t.targetSlug === 'tag-ai' || t.targetSlug === 'tag';
  const blocked = shouldBlockHandoff(t.isPrime, isTagTarget, shadowIntent);

  if (blocked === t.expectBlocked) {
    pass++;
  } else {
    fail++;
    failures.push(
      `  FAIL [${t.label}]: "${t.msg}" → blocked=${blocked} (expected ${t.expectBlocked}) | intent=${shadowIntent.intent}, confidence=${shadowIntent.confidence}`,
    );
  }
}

console.log(`\nP3.0B Ownership Guard — ${pass}/${pass + fail} tests passed\n`);

if (failures.length > 0) {
  console.log('FAILURES:');
  for (const f of failures) {
    console.log(f);
  }
  process.exit(1);
} else {
  console.log('All tests passed.');
}
