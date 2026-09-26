/**
 * Statement Breakdown Intent Guard — Test Script
 *
 * Validates that isStatementBreakdownIntent() correctly distinguishes
 * between product-help/informational mentions of "bank statement" and
 * actual breakdown/analysis requests.
 *
 * Run: npx tsx scripts/test-statement-breakdown-intent.ts
 */

// ─────────────────────────────────────────────────────────────────────────────
// IMPORT THE DETECTOR (inline extraction — chat.ts is not importable directly)
// ─────────────────────────────────────────────────────────────────────────────

function mentionsStatementImportContext(message: string): boolean {
  const text = String(message || '').toLowerCase();
  return /\b(statement|import|upload|uploaded|this statement|that statement|latest statement|last upload|what i uploaded|which statement)\b/.test(text);
}

function isStatementBreakdownIntent(message: string): boolean {
  const text = String(message || '').toLowerCase();

  // ── Informational / product-help override ──
  const hasActionVerb = /\b(?:upload(?:ing)?|attach(?:ing)?|import(?:ing)?|delete|add(?:ing)?)\b/.test(text);
  if (hasActionVerb) {
    const hasHelpFrame = /\b(?:how|where|can i|help|does|do i|support|looking to|i have|what is|why|what (?:file|format|type|banks?))\b/.test(text);
    const isProcessTopic = /\b(?:upload|import|attach)\s+(?:process|button|interface|feature|option|workflow|step|procedure)\b/.test(text);
    if (hasHelpFrame || isProcessTopic) return false;
  }

  const explicitStatementContext = mentionsStatementImportContext(text)
    || /\b(uploaded|uploaded statement|what i uploaded|which statement|that upload|that statement|my statement|my document|the file|the document|the statement|this document|this statement|my import|the import)\b/.test(text);
  const breakdownAsks = /\b(break\s*down|breakdown|what'?s on|what is on|summar(?:y|ize)|summarise|what did you find|findings|show me|list|totals?|categories?|tell me|what'?s in|analyz[e|is]|analys[e|is]|review|overview|explain|describe|walk me|give me)\b/.test(text);
  const statementDetailAsks = /\b(due date|minimum payment|min payment|new balance|credit limit|available credit|account last[-\s]?4|last[-\s]?4|issuer|institution|card|visa|mastercard|credit card|statement type|statement period|period start|period end)\b/.test(text);
  const bareMonthRequest = /^\s*(this month|last month|january|jan|february|feb|march|mar|april|apr|may|june|jun|july|jul|august|aug|september|sep|sept|october|oct|november|nov|december|dec)\s*[.?!]?\s*$/i.test(text);
  return (explicitStatementContext && breakdownAsks) || statementDetailAsks || bareMonthRequest;
}

// ─────────────────────────────────────────────────────────────────────────────
// TEST INFRASTRUCTURE
// ─────────────────────────────────────────────────────────────────────────────

interface TestCase {
  msg: string;
  expected: boolean;
  label?: string;
}

let pass = 0;
let fail = 0;
const failures: string[] = [];

function run(t: TestCase) {
  const result = isStatementBreakdownIntent(t.msg);
  if (result === t.expected) {
    pass++;
  } else {
    fail++;
    const tag = t.label ? ` [${t.label}]` : '';
    failures.push(`  FAIL${tag}: "${t.msg}" → got ${result} (expected ${t.expected})`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// A. PRODUCT HELP / UPLOAD — must return FALSE
// ─────────────────────────────────────────────────────────────────────────────

const productHelpTests: TestCase[] = [
  { msg: 'How do I upload a bank statement?', expected: false, label: 'upload how-to' },
  { msg: 'Where do I upload my statement?', expected: false, label: 'upload where' },
  { msg: 'Can I upload a bank statement?', expected: false, label: 'upload capability' },
  { msg: 'What file type should my bank statement be?', expected: false, label: 'file type question' },
  { msg: 'Does XspensesAI support bank statements?', expected: false, label: 'support question' },
  { msg: 'Can I attach my statement here?', expected: false, label: 'attach question' },
  { msg: "Why won't my statement upload?", expected: false, label: 'upload troubleshoot' },
  { msg: 'How long does a statement take to process?', expected: false, label: 'processing time' },
  { msg: 'Where can I find my uploaded statements?', expected: false, label: 'find uploads' },
  { msg: 'Can I delete a statement?', expected: false, label: 'delete question' },
  { msg: 'What banks do you support?', expected: false, label: 'bank support' },
  { msg: 'I have another bank statement to upload.', expected: false, label: 'intent to upload' },
  { msg: 'Looking to add another statement.', expected: false, label: 'add intent' },
  { msg: 'Help me upload my statement.', expected: false, label: 'help upload' },
  { msg: 'What is a bank statement?', expected: false, label: 'definition question' },
  { msg: 'How do I upload a bank statement from RBC?', expected: false, label: 'specific bank upload' },
  { msg: 'Can I import a CSV bank statement?', expected: false, label: 'CSV import' },
  { msg: "Why didn't my statement import correctly?", expected: false, label: 'import failure' },
  { msg: 'How can I attach a statement to this chat?', expected: false, label: 'attach to chat' },
  { msg: 'Where do I find the upload button for statements?', expected: false, label: 'find upload button' },
];

// ─────────────────────────────────────────────────────────────────────────────
// B. ACTUAL BREAKDOWN — must return TRUE
// ─────────────────────────────────────────────────────────────────────────────

const breakdownTests: TestCase[] = [
  { msg: 'Break down my May bank statement.', expected: true, label: 'break down + month' },
  { msg: 'Analyze my May statement.', expected: true, label: 'analyze + month' },
  { msg: 'Give me a breakdown of my bank statement.', expected: true, label: 'breakdown of' },
  { msg: 'Summarize my May statement.', expected: true, label: 'summarize + month' },
  { msg: 'Show me a summary of my May bank statement.', expected: true, label: 'summary + month' },
  { msg: 'What are the totals on my May statement?', expected: true, label: 'totals + month' },
  { msg: 'Show me the category breakdown for my statement.', expected: true, label: 'category breakdown' },
  { msg: 'Analyze the spending on my statement.', expected: true, label: 'analyze spending' },
  { msg: 'Give me an overview of my May statement.', expected: true, label: 'overview + month' },
  { msg: "What's on my statement?", expected: true, label: "what's on" },
  { msg: "What's in this statement?", expected: true, label: "what's in" },
  { msg: 'Review my statement.', expected: true, label: 'review' },
  { msg: 'Walk me through my statement.', expected: true, label: 'walk me through' },
  { msg: 'Describe my statement.', expected: true, label: 'describe' },
  { msg: 'Tell me about my statement.', expected: true, label: 'tell me about' },
  { msg: 'What did you find in my upload?', expected: true, label: 'findings from upload' },
  { msg: 'Show me the categories on my statement.', expected: true, label: 'categories' },
  { msg: 'List the transactions from my statement.', expected: true, label: 'list transactions' },
];

// ─────────────────────────────────────────────────────────────────────────────
// C. GENERAL STATEMENT REFERENCES — must return FALSE
// ─────────────────────────────────────────────────────────────────────────────

const generalRefTests: TestCase[] = [
  { msg: 'I downloaded my statement.', expected: false, label: 'downloaded' },
  { msg: 'My bank statement is six pages.', expected: false, label: 'page count' },
  { msg: 'I have statements from January through June.', expected: false, label: 'multiple statements' },
  { msg: 'My statement came from RBC.', expected: false, label: 'issuer mention' },
  { msg: 'The statement is a PDF.', expected: false, label: 'format mention' },
];

// ─────────────────────────────────────────────────────────────────────────────
// D. STATEMENT METADATA FIELDS — should return TRUE
// ─────────────────────────────────────────────────────────────────────────────

const metadataTests: TestCase[] = [
  { msg: "What's the due date on my statement?", expected: true, label: 'due date' },
  { msg: "What's my minimum payment?", expected: true, label: 'minimum payment' },
  { msg: "What's my new balance?", expected: true, label: 'new balance' },
  { msg: "What's my credit limit?", expected: true, label: 'credit limit' },
  { msg: 'What is the statement period?', expected: true, label: 'statement period' },
  { msg: 'What was the issuer?', expected: true, label: 'issuer query' },
];

// ─────────────────────────────────────────────────────────────────────────────
// E. BARE MONTH REQUESTS — should return TRUE
// ─────────────────────────────────────────────────────────────────────────────

const bareMonthTests: TestCase[] = [
  { msg: 'May', expected: true, label: 'bare month' },
  { msg: 'this month', expected: true, label: 'this month' },
  { msg: 'last month', expected: true, label: 'last month' },
  { msg: 'February', expected: true, label: 'February' },
];

// ─────────────────────────────────────────────────────────────────────────────
// F. EDGE CASES
// ─────────────────────────────────────────────────────────────────────────────

const edgeCases: TestCase[] = [
  // "bank statement" alone (no analysis verb, no informational verb) — should be FALSE
  // because it's just a noun reference with no action intent
  { msg: 'bank statement', expected: false, label: 'bare "bank statement"' },
  // Breakdown with "bank statement" — should still work
  { msg: 'Break down my bank statement.', expected: true, label: 'break down bank statement' },
  { msg: 'Summarize my bank statement.', expected: true, label: 'summarize bank statement' },
  // "credit card" as metadata — should still trigger
  { msg: 'Is this a Visa or Mastercard?', expected: true, label: 'card type query' },
  { msg: "What's my available credit?", expected: true, label: 'available credit' },
  // Informational verbs + statement should NOT trigger when product-help
  { msg: 'Explain how to upload a statement.', expected: false, label: 'explain upload' },
  { msg: 'Tell me how to import my statement.', expected: false, label: 'tell me import' },
  { msg: 'Show me where to upload my statement.', expected: false, label: 'show me upload' },
  { msg: 'Describe the upload process for statements.', expected: false, label: 'describe upload process' },
  // Informational verbs + statement WITHOUT upload = legitimate breakdown
  { msg: 'Explain my statement.', expected: true, label: 'explain statement (no upload)' },
  { msg: 'Describe what is on my statement.', expected: true, label: 'describe statement data' },
];

// ─────────────────────────────────────────────────────────────────────────────
// RUN
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n=== A. Product Help / Upload (expect FALSE) ===');
for (const t of productHelpTests) run(t);

console.log('=== B. Actual Breakdown (expect TRUE) ===');
for (const t of breakdownTests) run(t);

console.log('=== C. General Statement References (expect FALSE) ===');
for (const t of generalRefTests) run(t);

console.log('=== D. Statement Metadata Fields (expect TRUE) ===');
for (const t of metadataTests) run(t);

console.log('=== E. Bare Month Requests (expect TRUE) ===');
for (const t of bareMonthTests) run(t);

console.log('=== F. Edge Cases ===');
for (const t of edgeCases) run(t);

console.log(`\nStatement Breakdown Intent Guard — ${pass}/${pass + fail} tests passed\n`);

if (failures.length > 0) {
  console.log('FAILURES:');
  for (const f of failures) {
    console.log(f);
  }
  process.exit(1);
} else {
  console.log('All tests passed.');
}
