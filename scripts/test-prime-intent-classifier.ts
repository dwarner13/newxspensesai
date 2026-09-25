/**
 * P3.0A Shadow Intent Classifier — Test Script
 *
 * Run: npx tsx scripts/test-prime-intent-classifier.ts
 */

import { classifyPrimeIntent, PrimeIntent, type ClassifierContext } from '../src/shared/prime-intent-classifier';

const NO_EXT: ClassifierContext = {
  candidateFollowUpDetected: false,
  historicalReferenceDetected: false,
};

const P1_CTX: ClassifierContext = {
  candidateFollowUpDetected: true,
  historicalReferenceDetected: false,
};

const P23_CTX: ClassifierContext = {
  candidateFollowUpDetected: false,
  historicalReferenceDetected: true,
};

interface TestCase {
  msg: string;
  expected: PrimeIntent;
  ctx?: ClassifierContext;
  label?: string;
}

const tests: TestCase[] = [
  // ── P1 (frozen) ──
  { msg: 'Tell me about the third one.', expected: PrimeIntent.CANDIDATE_FOLLOW_UP, ctx: P1_CTX },
  { msg: 'Which one is number 4?', expected: PrimeIntent.CANDIDATE_FOLLOW_UP, ctx: P1_CTX },
  { msg: 'What about that transaction?', expected: PrimeIntent.CANDIDATE_FOLLOW_UP, ctx: P1_CTX },
  { msg: 'How much did I spend on gas?', expected: PrimeIntent.CANDIDATE_FOLLOW_UP, ctx: P1_CTX, label: 'P1 overrides financial query' },

  // ── P2.3 (frozen) ──
  { msg: 'Which transaction were we trying to change earlier?', expected: PrimeIntent.HISTORICAL_REFERENCE, ctx: P23_CTX },
  { msg: 'What did Tag do before?', expected: PrimeIntent.HISTORICAL_REFERENCE, ctx: P23_CTX },
  { msg: 'What were we talking about?', expected: PrimeIntent.HISTORICAL_REFERENCE, ctx: P23_CTX },
  { msg: 'Which one did I ask you to recategorize?', expected: PrimeIntent.HISTORICAL_REFERENCE, ctx: P23_CTX },

  // ── P1 > P2.3 precedence ──
  { msg: 'anything', expected: PrimeIntent.CANDIDATE_FOLLOW_UP, ctx: { candidateFollowUpDetected: true, historicalReferenceDetected: true }, label: 'P1 > P2.3' },

  // ── PRODUCT_HELP ──
  { msg: 'How do I upload a statement?', expected: PrimeIntent.PRODUCT_HELP },
  { msg: 'Where do I put another bank statement?', expected: PrimeIntent.PRODUCT_HELP },
  { msg: 'Can I upload a PDF here?', expected: PrimeIntent.PRODUCT_HELP },
  { msg: 'Where the hell do I upload this thing?', expected: PrimeIntent.PRODUCT_HELP },
  { msg: 'What kind of files can I upload?', expected: PrimeIntent.PRODUCT_HELP },
  { msg: 'What file types do you support?', expected: PrimeIntent.PRODUCT_HELP },
  { msg: 'How do I upload a bank statement?', expected: PrimeIntent.PRODUCT_HELP, label: 'PRODUCT_HELP not DOCUMENT_QUERY' },

  // ── FINANCIAL_EDUCATION ──
  { msg: 'What is compound interest?', expected: PrimeIntent.FINANCIAL_EDUCATION },
  { msg: 'Explain APR to me.', expected: PrimeIntent.FINANCIAL_EDUCATION },
  { msg: "What's the difference between an RRSP and TFSA?", expected: PrimeIntent.FINANCIAL_EDUCATION },
  { msg: 'How does amortization work?', expected: PrimeIntent.FINANCIAL_EDUCATION },
  { msg: 'What is a car loan?', expected: PrimeIntent.FINANCIAL_EDUCATION, label: 'EDUCATION not CALCULATION' },
  { msg: 'What category is gas?', expected: PrimeIntent.FINANCIAL_EDUCATION, label: 'taxonomy question' },

  // ── FINANCIAL_DATA_LOOKUP ──
  { msg: 'Show me my last 9 Costco transactions.', expected: PrimeIntent.FINANCIAL_DATA_LOOKUP },
  { msg: 'How much did I spend eating out last month?', expected: PrimeIntent.FINANCIAL_DATA_LOOKUP },
  { msg: 'What did I spend at Walmart?', expected: PrimeIntent.FINANCIAL_DATA_LOOKUP },
  { msg: 'Find those little 7-Eleven charges.', expected: PrimeIntent.FINANCIAL_DATA_LOOKUP },
  { msg: 'What did I spend on gas?', expected: PrimeIntent.FINANCIAL_DATA_LOOKUP },

  // ── FINANCIAL_CALCULATION ──
  { msg: 'How much interest would I save if I paid another $200 a month?', expected: PrimeIntent.FINANCIAL_CALCULATION },
  { msg: 'If I throw another hundred bucks a week at my truck, how much sooner is it gone?', expected: PrimeIntent.FINANCIAL_CALCULATION },
  { msg: 'What if I put five grand against the loan?', expected: PrimeIntent.FINANCIAL_CALCULATION },
  { msg: 'If I bump my payment to $500 biweekly what happens?', expected: PrimeIntent.FINANCIAL_CALCULATION },
  { msg: 'How long until this thing is paid off?', expected: PrimeIntent.FINANCIAL_CALCULATION },
  { msg: 'How much interest would I save paying $200 extra on my car loan?', expected: PrimeIntent.FINANCIAL_CALCULATION },
  { msg: 'Calculate my mortgage payoff if I add $300 per month', expected: PrimeIntent.FINANCIAL_CALCULATION },

  // ── FINANCIAL_ANALYSIS ──
  { msg: 'Where am I wasting money?', expected: PrimeIntent.FINANCIAL_ANALYSIS },
  { msg: 'Where the hell is all my money going lately?', expected: PrimeIntent.FINANCIAL_ANALYSIS },
  { msg: "What's killing me every month?", expected: PrimeIntent.FINANCIAL_ANALYSIS },
  { msg: 'Did my eating out get worse this summer?', expected: PrimeIntent.FINANCIAL_ANALYSIS },
  { msg: 'Why were my expenses so high last month?', expected: PrimeIntent.FINANCIAL_ANALYSIS },
  { msg: 'Compare my spending this month vs last month', expected: PrimeIntent.FINANCIAL_ANALYSIS },

  // ── DOCUMENT_QUERY ──
  { msg: 'Why did my statement only bring in 42 transactions?', expected: PrimeIntent.DOCUMENT_QUERY },
  { msg: 'Did that PDF finish processing?', expected: PrimeIntent.DOCUMENT_QUERY },
  { msg: 'Did Byte read my statement?', expected: PrimeIntent.DOCUMENT_QUERY },
  { msg: 'Why did my bank statement fail?', expected: PrimeIntent.DOCUMENT_QUERY },
  { msg: 'Is anything missing from that upload?', expected: PrimeIntent.DOCUMENT_QUERY },
  { msg: 'Did my bank statement upload?', expected: PrimeIntent.DOCUMENT_QUERY, label: 'DOCUMENT_QUERY not PRODUCT_HELP' },
  { msg: 'Why did my statement import only 42 transactions?', expected: PrimeIntent.DOCUMENT_QUERY, label: 'DOCUMENT_QUERY not DATA_LOOKUP' },

  // ── GOAL_PLANNING ──
  { msg: 'How am I doing on my savings goal?', expected: PrimeIntent.GOAL_PLANNING },
  { msg: 'Am I on track for the $20,000 goal?', expected: PrimeIntent.GOAL_PLANNING },
  { msg: 'I want to save $10,000 by next summer.', expected: PrimeIntent.GOAL_PLANNING },
  { msg: 'How long until I hit my goal?', expected: PrimeIntent.GOAL_PLANNING },

  // ── SPECIALIST_ACTION ──
  { msg: 'Change that to Gas & Fuel.', expected: PrimeIntent.SPECIALIST_ACTION },
  { msg: 'Move the third one to groceries.', expected: PrimeIntent.SPECIALIST_ACTION },
  { msg: 'Have Tag fix that category.', expected: PrimeIntent.SPECIALIST_ACTION },
  { msg: 'Recategorize that purchase.', expected: PrimeIntent.SPECIALIST_ACTION },

  // ── CONVERSATION ──
  { msg: 'Thanks.', expected: PrimeIntent.CONVERSATION },
  { msg: 'Good morning.', expected: PrimeIntent.CONVERSATION },
  { msg: 'Who are you?', expected: PrimeIntent.CONVERSATION },
  { msg: "That's perfect.", expected: PrimeIntent.CONVERSATION },
  { msg: 'Hi', expected: PrimeIntent.CONVERSATION },
  { msg: 'Ok', expected: PrimeIntent.CONVERSATION },
  { msg: 'Got it', expected: PrimeIntent.CONVERSATION },
  { msg: 'Awesome', expected: PrimeIntent.CONVERSATION },

  // ── AMBIGUOUS → GENERAL ──
  { msg: 'Tell me about this.', expected: PrimeIntent.GENERAL },
  { msg: 'What should I do?', expected: PrimeIntent.GENERAL },
  { msg: 'Can you help me with this?', expected: PrimeIntent.GENERAL },
  { msg: 'Is this bad?', expected: PrimeIntent.GENERAL },
  { msg: "What's going on?", expected: PrimeIntent.GENERAL },

  // ── CROSS-LANE COLLISIONS ──
  { msg: 'Why has my gas spending increased?', expected: PrimeIntent.FINANCIAL_ANALYSIS, label: 'ANALYSIS not DATA_LOOKUP' },
  { msg: 'Change this to Gas & Fuel.', expected: PrimeIntent.SPECIALIST_ACTION, label: 'ACTION not HISTORICAL' },
];

// ─── Run ───
let pass = 0;
let fail = 0;
const failures: string[] = [];

for (const t of tests) {
  const ctx = t.ctx ?? NO_EXT;
  const result = classifyPrimeIntent(t.msg, ctx);
  if (result.intent === t.expected) {
    pass++;
  } else {
    fail++;
    const label = t.label ? ` [${t.label}]` : '';
    failures.push(`  FAIL${label}: "${t.msg}" → got ${result.intent} (expected ${t.expected}) | reason: ${result.reason}`);
  }
}

console.log(`\nP3.0A Shadow Intent Classifier — ${pass}/${pass + fail} tests passed\n`);

if (failures.length > 0) {
  console.log('FAILURES:');
  for (const f of failures) {
    console.log(f);
  }
  process.exit(1);
} else {
  console.log('All tests passed.');
}
