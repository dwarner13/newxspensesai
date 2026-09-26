/**
 * Upload/Import Intent Semantic Fix — Test Script
 *
 * Validates that isUploadImportIntent() requires positive action signals
 * and does not trigger on document nouns alone.
 *
 * Run: npx tsx scripts/test-upload-import-intent.ts
 */

// ─────────────────────────────────────────────────────────────────────────────
// INLINE COPY OF isUploadImportIntent (matches chat.ts implementation)
// ─────────────────────────────────────────────────────────────────────────────

function isUploadImportIntent(message: string, hasAttachments: boolean): boolean {
  if (hasAttachments) return true;
  const text = String(message || '').trim().toLowerCase();
  if (!text) return false;

  // ── Informational / question / status frame — never action intent ──
  const isInformational =
    /\b(?:how|where|can i|do i|does|did|was|help|support|why|status)\b/.test(text) ||
    /\bwhat (?:file|format|type|kind|bank)\b/.test(text) ||
    /\b(?:finish(?:ed)?|fail(?:ed)?|ready|done|missing|error|broken)\b/.test(text);

  // ── Primary action verbs: upload / import / ingest ──
  // Strong upload signal — no document noun required.
  if (/\b(?:upload|import|ingest)(?:ing)?\b/.test(text) && !isInformational) {
    return true;
  }

  // ── Secondary action verbs: process / add / parse / ocr ──
  // Weaker signal — require a document noun for confidence.
  const hasDocNoun = /\b(?:statement|bank statement|receipt|document|file|pdf|csv)\b/.test(text);
  if (hasDocNoun && /\b(?:process|add|parse|ocr)\b/.test(text) && !isInformational) {
    return true;
  }

  // Document nouns alone (statement, receipt, file, etc.) do NOT establish
  // upload/import intent. They are references, not actions.
  return false;
}

// ─────────────────────────────────────────────────────────────────────────────
// INLINE COPY OF routePrime decision logic (for routing tests)
// ─────────────────────────────────────────────────────────────────────────────

function detectPrimeIntent(message: string) {
  const text = String(message || '').toLowerCase();
  const isUploadHowTo =
    /\b(upload|import)\b/.test(text) && /\b(how\s+(?:do|can|should|would|to|you)|where\s+(?:do|can|to)|guide\s+me|walk\s+me\s+through|show\s+me\s+how|tell\s+me\s+how)\b/.test(text);
  const isBreakdownReport =
    /\b(break\s*down|breakdown|report|cashflow|categories?|summary|statement)\b/.test(text);
  if (isUploadHowTo) return { label: 'upload_howto', isBreakdownReport, isUploadHowTo };
  if (isBreakdownReport) return { label: 'breakdown_report', isBreakdownReport, isUploadHowTo };
  return { label: 'general', isBreakdownReport, isUploadHowTo };
}

type RouteResult = { lane: 'worker_chain'; reason: string } | { lane: 'model'; reason?: string };

function routePrimeSimulated(message: string, hasAttachments: boolean): RouteResult {
  const primeIntent = detectPrimeIntent(message);
  if (primeIntent.isUploadHowTo && !hasAttachments) {
    return { lane: 'model', reason: 'upload_howto' };
  }
  if (isUploadImportIntent(message, hasAttachments)) {
    return { lane: 'worker_chain', reason: 'upload_import' };
  }
  return { lane: 'model', reason: 'general' };
}

// ─────────────────────────────────────────────────────────────────────────────
// TEST INFRASTRUCTURE
// ─────────────────────────────────────────────────────────────────────────────

interface TestCase {
  msg: string;
  hasAttachments?: boolean;
  expected: boolean;
  label?: string;
}

let pass = 0;
let fail = 0;
const failures: string[] = [];

function run(t: TestCase) {
  const result = isUploadImportIntent(t.msg, t.hasAttachments ?? false);
  if (result === t.expected) {
    pass++;
  } else {
    fail++;
    const tag = t.label ? ` [${t.label}]` : '';
    failures.push(`  FAIL${tag}: "${t.msg}" → got ${result} (expected ${t.expected})`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// A. DOCUMENT ANALYSIS → FALSE
// ─────────────────────────────────────────────────────────────────────────────

const analysisTests: TestCase[] = [
  { msg: 'Break down my May bank statement.', expected: false, label: 'break down statement' },
  { msg: 'Analyze my bank statement.', expected: false, label: 'analyze statement' },
  { msg: 'Summarize my statement.', expected: false, label: 'summarize statement' },
  { msg: 'What did I spend on my May statement?', expected: false, label: 'spending on statement' },
  { msg: 'What are the totals on my statement?', expected: false, label: 'totals on statement' },
  { msg: 'Show me my bank statement.', expected: false, label: 'show statement' },
  { msg: 'Review my bank statement.', expected: false, label: 'review statement' },
  { msg: "What's on my statement?", expected: false, label: "what's on statement" },
  { msg: 'Give me a breakdown of my statement.', expected: false, label: 'breakdown of statement' },
  { msg: 'List the transactions from my statement.', expected: false, label: 'list transactions' },
  { msg: 'Tell me about my statement.', expected: false, label: 'tell me about' },
  { msg: 'Explain my bank statement.', expected: false, label: 'explain statement' },
];

// ─────────────────────────────────────────────────────────────────────────────
// B. PRODUCT HELP → FALSE
// ─────────────────────────────────────────────────────────────────────────────

const productHelpTests: TestCase[] = [
  { msg: 'How do I upload a bank statement?', expected: false, label: 'how upload' },
  { msg: 'Where do I upload a statement?', expected: false, label: 'where upload' },
  { msg: 'Can I upload statements?', expected: false, label: 'can I upload' },
  { msg: 'Can Custodian help me upload a bank statement?', expected: false, label: 'custodian help upload' },
  { msg: 'Help me upload a statement.', expected: false, label: 'help upload' },
  { msg: 'How do I import a CSV?', expected: false, label: 'how import CSV' },
  { msg: 'Where can I import my file?', expected: false, label: 'where import' },
  { msg: 'Does XspensesAI support uploading?', expected: false, label: 'does support upload' },
  { msg: "Why won't my statement upload?", expected: false, label: 'why upload fail' },
  { msg: 'What file types can I upload?', expected: false, label: 'what file types' },
  { msg: 'What format should my bank statement be?', expected: false, label: 'what format' },
  { msg: 'How can I import my bank statement from RBC?', expected: false, label: 'how import specific bank' },
];

// ─────────────────────────────────────────────────────────────────────────────
// C. STATUS / DOCUMENT QUESTIONS → FALSE
// ─────────────────────────────────────────────────────────────────────────────

const statusTests: TestCase[] = [
  { msg: 'Did my statement process?', expected: false, label: 'did process' },
  { msg: 'Where is my statement?', expected: false, label: 'where is statement' },
  { msg: 'Is my statement ready?', expected: false, label: 'is ready' },
  { msg: 'Did my May statement finish importing?', expected: false, label: 'did finish importing' },
  { msg: 'Did my import finish?', expected: false, label: 'did import finish' },
  { msg: 'Did my upload finish?', expected: false, label: 'did upload finish' },
  { msg: 'Was my statement imported?', expected: false, label: 'was imported' },
  { msg: 'My upload failed.', expected: false, label: 'upload failed' },
  { msg: 'The import had an error.', expected: false, label: 'import error' },
  { msg: 'Is my import done?', expected: false, label: 'import done' },
  { msg: 'Something is missing from my import.', expected: false, label: 'missing from import' },
];

// ─────────────────────────────────────────────────────────────────────────────
// D. ACTUAL IMPORT ACTION → TRUE
// ─────────────────────────────────────────────────────────────────────────────

const actionTests: TestCase[] = [
  { msg: 'I want to upload another bank statement.', expected: true, label: 'want to upload' },
  { msg: 'Upload this bank statement.', expected: true, label: 'imperative upload' },
  { msg: "I'd like to import another statement.", expected: true, label: 'like to import' },
  { msg: 'Add this statement to my account.', expected: true, label: 'add statement' },
  { msg: 'Process this statement.', expected: true, label: 'process statement' },
  { msg: 'Import this file.', expected: true, label: 'import file' },
  { msg: 'I have another statement to upload.', expected: true, label: 'have to upload' },
  { msg: "Let's upload my May statement.", expected: true, label: "let's upload" },
  { msg: "I'm uploading a new statement.", expected: true, label: 'uploading new' },
  { msg: 'Upload my receipt.', expected: true, label: 'upload receipt' },
  { msg: 'Import my bank statement.', expected: true, label: 'import bank statement' },
  { msg: 'Ingest this document.', expected: true, label: 'ingest document' },
  { msg: 'Parse this receipt.', expected: true, label: 'parse receipt' },
  { msg: 'OCR this document.', expected: true, label: 'OCR document' },
  { msg: 'Add this receipt to my records.', expected: true, label: 'add receipt' },
];

// ─────────────────────────────────────────────────────────────────────────────
// E. GENERAL DOCUMENT REFERENCES → FALSE
// ─────────────────────────────────────────────────────────────────────────────

const generalRefTests: TestCase[] = [
  { msg: 'My statement is six pages.', expected: false, label: 'page count' },
  { msg: 'I downloaded my statement.', expected: false, label: 'downloaded' },
  { msg: 'My bank statement is from RBC.', expected: false, label: 'issuer mention' },
  { msg: 'I have statements from January through June.', expected: false, label: 'multiple statements' },
  { msg: 'The statement is a PDF.', expected: false, label: 'format mention' },
  { msg: 'The receipt was for $42.50.', expected: false, label: 'receipt amount' },
  { msg: 'That document has three pages.', expected: false, label: 'document pages' },
  { msg: 'My file is a CSV.', expected: false, label: 'file format' },
];

// ─────────────────────────────────────────────────────────────────────────────
// F. ATTACHMENT CASES
// ─────────────────────────────────────────────────────────────────────────────

const attachmentTests: TestCase[] = [
  { msg: 'Here is my statement.', hasAttachments: true, expected: true, label: 'attachment with statement' },
  { msg: 'Take a look at this.', hasAttachments: true, expected: true, label: 'attachment generic' },
  { msg: '', hasAttachments: true, expected: true, label: 'attachment no text' },
  { msg: 'What is this?', hasAttachments: true, expected: true, label: 'attachment question' },
  { msg: 'Break down this.', hasAttachments: true, expected: true, label: 'attachment analysis' },
];

// ─────────────────────────────────────────────────────────────────────────────
// G. ROUTING INTEGRATION — routePrime simulation
// ─────────────────────────────────────────────────────────────────────────────

interface RoutingTestCase {
  msg: string;
  hasAttachments?: boolean;
  expectedLane: 'worker_chain' | 'model';
  label: string;
}

let routePass = 0;
let routeFail = 0;
const routeFailures: string[] = [];

function runRouting(t: RoutingTestCase) {
  const result = routePrimeSimulated(t.msg, t.hasAttachments ?? false);
  if (result.lane === t.expectedLane) {
    routePass++;
  } else {
    routeFail++;
    routeFailures.push(`  FAIL [${t.label}]: "${t.msg}" → lane=${result.lane} (expected ${t.expectedLane})`);
  }
}

const routingTests: RoutingTestCase[] = [
  // Key regression: this was the live bug
  { msg: 'Break down my May bank statement.', expectedLane: 'model', label: 'breakdown → model' },
  // Product help that also triggered worker_chain
  { msg: 'Can Custodian help me upload a bank statement?', expectedLane: 'model', label: 'custodian help → model' },
  // Legitimate upload action
  { msg: 'I want to upload another bank statement.', expectedLane: 'worker_chain', label: 'upload action → worker_chain' },
  // Upload how-to (caught by detectPrimeIntent howto gate)
  { msg: 'How do I upload a bank statement?', expectedLane: 'model', label: 'upload howto → model' },
  // Bare statement mention
  { msg: 'Show me my bank statement.', expectedLane: 'model', label: 'show statement → model' },
  // Bare import action
  { msg: 'Import this file.', expectedLane: 'worker_chain', label: 'import file → worker_chain' },
  // Attachment overrides everything
  { msg: 'What is this?', hasAttachments: true, expectedLane: 'worker_chain', label: 'attachment → worker_chain' },
  // General financial question with "statement"
  { msg: 'What are the totals on my statement?', expectedLane: 'model', label: 'totals → model' },
  // Process action with document
  { msg: 'Process this statement.', expectedLane: 'worker_chain', label: 'process statement → worker_chain' },
];

// ─────────────────────────────────────────────────────────────────────────────
// H. EDGE CASES
// ─────────────────────────────────────────────────────────────────────────────

const edgeCases: TestCase[] = [
  // Past tense "uploaded" should NOT match (not an action request)
  { msg: 'I uploaded a statement yesterday.', expected: false, label: 'past tense uploaded' },
  // "imports" as noun should NOT match
  { msg: 'My imports are all from RBC.', expected: false, label: 'imports noun' },
  // Imperative with no document noun
  { msg: 'Upload.', expected: true, label: 'bare upload' },
  // Empty message
  { msg: '', expected: false, label: 'empty message' },
  // Just a document noun
  { msg: 'statement', expected: false, label: 'bare statement' },
  { msg: 'bank statement', expected: false, label: 'bare bank statement' },
  { msg: 'receipt', expected: false, label: 'bare receipt' },
  { msg: 'document', expected: false, label: 'bare document' },
  { msg: 'file', expected: false, label: 'bare file' },
  // "add" without document noun should NOT match (ambiguous)
  { msg: 'Add a budget category.', expected: false, label: 'add non-document' },
  // "process" without document noun should NOT match
  { msg: 'Process my request.', expected: false, label: 'process non-document' },
];

// ─────────────────────────────────────────────────────────────────────────────
// RUN
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n=== A. Document Analysis (expect FALSE) ===');
for (const t of analysisTests) run(t);

console.log('=== B. Product Help (expect FALSE) ===');
for (const t of productHelpTests) run(t);

console.log('=== C. Status / Document Questions (expect FALSE) ===');
for (const t of statusTests) run(t);

console.log('=== D. Actual Import Action (expect TRUE) ===');
for (const t of actionTests) run(t);

console.log('=== E. General Document References (expect FALSE) ===');
for (const t of generalRefTests) run(t);

console.log('=== F. Attachment Cases (expect TRUE) ===');
for (const t of attachmentTests) run(t);

console.log('=== G. Routing Integration ===');
for (const t of routingTests) runRouting(t);

console.log('=== H. Edge Cases ===');
for (const t of edgeCases) run(t);

const totalIntent = pass + fail;
const totalRoute = routePass + routeFail;
console.log(`\nUpload/Import Intent — ${pass}/${totalIntent} intent tests passed`);
console.log(`Upload/Import Routing — ${routePass}/${totalRoute} routing tests passed`);

const allFailures = [...failures, ...routeFailures];
if (allFailures.length > 0) {
  console.log('\nFAILURES:');
  for (const f of allFailures) {
    console.log(f);
  }
  process.exit(1);
} else {
  console.log('\nAll tests passed.');
}
