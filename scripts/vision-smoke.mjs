/**
 * vision-smoke.mjs
 *
 * Smoke test: send bank statement PDFs to Claude Vision using the same prompt
 * and message shape as process-statement.ts, then compare extracted totals
 * against known ground truth.
 *
 * Usage:
 *   node scripts/vision-smoke.mjs path/to/statement1.pdf [path/to/statement2.pdf ...]
 *
 * Reads ANTHROPIC_API_KEY from .env.local (same var the repo already uses).
 * Writes raw JSON responses to scripts/vision-smoke-output/ for inspection.
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { basename } from 'path';

// ── Load env ────────────────────────────────────────────────────────────────
const envText = readFileSync('.env.local', 'utf8');
for (const line of envText.split('\n')) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim();
}
const API_KEY = process.env.ANTHROPIC_API_KEY;
if (!API_KEY) { console.error('ANTHROPIC_API_KEY not found in .env.local'); process.exit(1); }

// ── Ground truth ────────────────────────────────────────────────────────────
// Keyed by substring of filename (case-insensitive match).
const GROUND_TRUTH = [
  {
    match: /rbc/i,
    label: 'RBC Advantage Banking, Apr 24 – May 25 2026',
    debits: 709.11,
    credits: 707.00,
    txnCount: 9,
  },
  {
    match: /bmo/i,
    label: 'BMO Everyday Banking, period ending Jul 16 2026',
    debits: 14966.05,
    credits: 13526.02,
    txnCount: 148,
  },
];

// ── Prompt (verbatim from process-statement.ts) ─────────────────────────────
const CLAUDE_EXTRACTION_PROMPT = `You are reading a bank statement. Extract every transaction.
Return ONLY valid JSON with no extra text, no markdown, no backticks.
Format:
{
  "period": { "start": "YYYY-MM-DD", "end": "YYYY-MM-DD" },
  "accountSummary": { "openingBalance": number, "closingBalance": number },
  "institution": "Bank name if detected (e.g. BMO, TD, RBC)",
  "transactions": [
    {
      "date": "YYYY-MM-DD",
      "merchant": "clean readable name with spaces preserved, no terminal IDs",
      "amount": number,
      "type": "debit or credit",
      "category": "Food | Transport | Shopping | Entertainment | Health | Utilities | Income | Transfer | Other"
    }
  ],
  "statementSummary": {
    "totalDeducted": number,
    "totalAdded": number,
    "openingBalance": number,
    "closingBalance": number
  }
}
CRITICAL RULES:
- Bank statements have MULTIPLE number columns: Amounts Deducted, Amounts Added, and Balance.
- Use ONLY the Deducted or Added column for the transaction amount.
- NEVER use the Balance column. It is the running account balance, NOT the transaction amount.
- If a 7-Eleven purchase shows as $500+, you are reading the Balance column by mistake.
- Preserve spaces in merchant names: "SAVE ON FOODS" not "SAVEONFOODS", "CANADIAN TIRE" not "CANADIANTIRE".
- Debits/withdrawals/purchases = negative amounts. Deposits/credits/income = positive amounts.

RBC VISA / CREDIT CARD STATEMENT RULES:
- RBC Visa statements have only ONE "AMOUNT ($)" column. Positive amounts are charges (type: "debit", amount should be negative in output). Negative amounts (prefixed with -) are payments/credits (type: "credit", amount should be positive in output).
- Lines starting with "Foreign Currency - USD" are metadata describing the currency conversion for the transaction ABOVE them. Do NOT create a separate transaction for foreign currency lines. Always use the CANADIAN DOLLAR amount from the main transaction line, not the USD amount.
- Lines that are just long numeric strings (e.g. "74510204352610287899203") are internal reference numbers — skip them entirely, they are not transactions.
- IGNORE these sections completely — they are NOT transactions and contain NO transaction data: "CALCULATING YOUR BALANCE", "PAYMENTS & INTEREST RATES", "IMPORTANT INFORMATION", "AVION POINTS", "CONTACT US", "INTEREST RATE CHART", "Time to Pay", the payment stub/remittance slip at the bottom, and any text after "TOTAL ACCOUNT BALANCE".
- "BALANCEPROTECTOR PREMIUM" is a bank fee (category: Utilities), not a plan name.
- "OVERLIMIT FEE" and "CASH - SERVICE CHARGE" are bank fees (category: Utilities).
- "PAYMENT - THANK YOU / PAIEMENT - MERCI" is always a payment/credit. The statement shows it as a negative amount. Output it as type: "credit" with a positive amount.
- The statement period is shown as "STATEMENT FROM [date] TO [date]" — use those dates for the period field.
- For merchant names: strip the city/province suffix (e.g. "EDMONTON AB", "BRAMPTON ON") and any trailing reference numbers. Keep the core merchant name readable.

BANK CHEQUING / SAVINGS / CURRENT ACCOUNT STATEMENT RULES (all banks — BMO, TD, RBC, CIBC, Scotiabank, National Bank, Desjardins, Tangerine, Simplii, Canadian credit unions, and most US/UK retail banks):
- Three numeric columns appear in this order on every row: WITHDRAWALS / DEPOSITS / BALANCE. Headers vary by bank: BMO uses "Amounts deducted / Amounts added / Balance"; TD/RBC/Scotia use "Withdrawals / Deposits / Balance"; US banks often use "Debits / Credits / Balance". The third column is ALWAYS the running account balance — NOT the transaction amount. Use ONLY the first two columns for amounts.
- Every transaction row shows ONE amount (in either Withdrawals OR Deposits, never both) PLUS a Balance. If you see two non-zero numbers on the same row, the rightmost is the Balance — discard it. NEVER sum, average, or concatenate the amount and balance into a single value. If a 7-Eleven purchase shows up as $5,000+, you summed the columns by mistake.
- Descriptions for pre-authorized payments and direct deposits frequently WRAP onto two physical lines. The continuation line contains only suffix text ("MSP/DIV", "LNS/PRE", "MTG/HYP", "/CC", "/ASS", "/PRE") with NO numbers. Combine both lines into one description. NEVER read the amount column from a continuation line — the amount belongs to the row that has the date.
- Skip rows labeled "Opening balance", "Previous balance", "Closing totals", "Closing balance", "Ending balance" — they are not transactions, they are period boundaries.
- Withdrawals/Deducted column → type: "debit", output as negative. Deposits/Added column → type: "credit", output as positive.
- Strip these prefixes to get the merchant name (they are NOT merchants): "Debit Card Purchase,", "POS Purchase,", "Point of Sale,", "Pre-Authorized Payment,", "Pre-authorized Payment No Fee,", "Pre-authorized Debit,", "Direct Deposit,", "Payroll Deposit,", "Online Bill Payment,", "Bill Payment,".
- These descriptions ARE the merchant — keep as-is, no other name follows: "Mobile Cheque Deposit", "INTERAC e-Transfer Sent", "INTERAC e-Transfer Received", "Other Bank ABM Withdrawal", "ABM Withdrawal", "ABM Deposit", "Premium Plan Fee", "Service Charge", "Monthly Plan Fee", "Overdraft Fee", "NSF Fee".
- Strip trailing store/terminal IDs from merchants: "7-ELEVEN STORE 33535" → "7-ELEVEN", "SAVE ON FOODS #6620" → "SAVE ON FOODS", "PETRO-CANADA 77965" → "PETRO-CANADA", "WALMART STORE #3028" → "WALMART", "MCDONALD'S #40449" → "MCDONALD'S".
- The statement summary block on page 1 contains four numbers: Opening Balance, Total Withdrawn/Deducted, Total Deposited/Added, Closing Balance. Wording varies ("Total amounts deducted/added" at BMO, "Total withdrawals/deposits" at TD/RBC, "Total debits/credits" at US banks). Extract all four into the statementSummary output field — these are the bank's authoritative period totals.

If any field is unclear, use null. Never guess amounts or dates.`;

// ── Output directory ────────────────────────────────────────────────────────
const OUT_DIR = 'scripts/vision-smoke-output';
mkdirSync(OUT_DIR, { recursive: true });

// ── Main ────────────────────────────────────────────────────────────────────
const files = process.argv.slice(2);
if (files.length === 0) {
  console.error('Usage: node scripts/vision-smoke.mjs <statement.pdf> [...]');
  process.exit(1);
}

for (const filePath of files) {
  const name = basename(filePath);
  console.log(`\n${'='.repeat(70)}`);
  console.log(`FILE: ${name}`);
  console.log('='.repeat(70));

  const pdfBytes = readFileSync(filePath);
  const base64 = pdfBytes.toString('base64');

  console.log(`  Sending ${(pdfBytes.length / 1024).toFixed(0)} KB to Claude Vision (claude-sonnet-4-6)...`);

  const body = {
    model: 'claude-sonnet-4-6',
    max_tokens: 8192,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'document',
            source: {
              type: 'base64',
              media_type: 'application/pdf',
              data: base64,
            },
          },
          {
            type: 'text',
            text: CLAUDE_EXTRACTION_PROMPT,
          },
        ],
      },
    ],
  };

  let data;
  try {
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'pdfs-2024-09-25',
      },
      body: JSON.stringify(body),
    });
    if (!resp.ok) {
      const errText = await resp.text();
      console.error(`  API error ${resp.status}: ${errText.slice(0, 300)}`);
      continue;
    }
    data = await resp.json();
  } catch (err) {
    console.error(`  Fetch error: ${err.message}`);
    continue;
  }

  const rawJson = data?.content?.[0]?.text ?? '';
  const cleaned = rawJson.replace(/^```[\w]*\n?/m, '').replace(/```$/m, '').trim();

  // Write raw response for inspection
  const outFile = `${OUT_DIR}/${name.replace(/\.pdf$/i, '')}.json`;
  writeFileSync(outFile, cleaned, 'utf8');
  console.log(`  Raw JSON written to ${outFile}`);

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch (err) {
    console.error(`  JSON parse error: ${err.message}`);
    console.error(`  First 500 chars: ${cleaned.slice(0, 500)}`);
    continue;
  }

  const txns = parsed.transactions || [];
  const debits = txns.filter(t => t.type === 'debit');
  const credits = txns.filter(t => t.type === 'credit');
  const sumDebits = debits.reduce((s, t) => s + Math.abs(t.amount ?? 0), 0);
  const sumCredits = credits.reduce((s, t) => s + Math.abs(t.amount ?? 0), 0);

  console.log(`\n  Extracted: ${txns.length} transactions (${debits.length} debits, ${credits.length} credits)`);
  console.log(`  Sum of debits:  $${sumDebits.toFixed(2)}`);
  console.log(`  Sum of credits: $${sumCredits.toFixed(2)}`);

  if (parsed.statementSummary) {
    const ss = parsed.statementSummary;
    console.log(`  statementSummary.totalDeducted: ${ss.totalDeducted}`);
    console.log(`  statementSummary.totalAdded:    ${ss.totalAdded}`);
    console.log(`  statementSummary.openingBalance: ${ss.openingBalance}`);
    console.log(`  statementSummary.closingBalance:  ${ss.closingBalance}`);
  }

  // Match ground truth
  const truth = GROUND_TRUTH.find(g => g.match.test(name));
  if (truth) {
    const debitDelta = sumDebits - truth.debits;
    const creditDelta = sumCredits - truth.credits;
    const countDelta = txns.length - truth.txnCount;

    console.log(`\n  ── vs Ground Truth: ${truth.label} ──`);
    console.log(`  Txn count:  ${txns.length} extracted vs ${truth.txnCount} true  (delta: ${countDelta >= 0 ? '+' : ''}${countDelta})`);
    console.log(`  Debits:     $${sumDebits.toFixed(2)} extracted vs $${truth.debits.toFixed(2)} true  (delta: ${debitDelta >= 0 ? '+' : ''}$${debitDelta.toFixed(2)})`);
    console.log(`  Credits:    $${sumCredits.toFixed(2)} extracted vs $${truth.credits.toFixed(2)} true  (delta: ${creditDelta >= 0 ? '+' : ''}$${creditDelta.toFixed(2)})`);
  } else {
    console.log(`\n  No ground truth configured for "${name}". Add a GROUND_TRUTH entry with a matching regex.`);
  }
}

console.log(`\n${'='.repeat(70)}`);
console.log('Done.');
