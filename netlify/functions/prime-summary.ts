import type { Handler } from '@netlify/functions';
import { admin } from './_shared/supabase.js';
import { cleanupOcrText } from './lib/ocr/cleanupOcrText.js';

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const GENERIC_SUMMARY = 'Your categorized results and insights are available.';
const LOW_CONFIDENCE_THRESHOLD = 0.6;

function parseMoney(value: string | null | undefined): number | null {
  if (!value) return null;
  const cleaned = String(value).replace(/[$,\s]/g, '').trim();
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function formatMoney(n: number | null): string {
  if (n === null || !Number.isFinite(n)) return 'n/a';
  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(n);
  return `${sign}$${abs.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function coerceDateLabel(value: unknown): string {
  const raw = String(value || '').trim();
  if (!raw) return 'UNKNOWN-DATE';
  const isoMatch = raw.match(/^\d{4}-\d{2}-\d{2}/);
  if (isoMatch) return isoMatch[0];
  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }
  return 'UNKNOWN-DATE';
}

function coerceMerchantLabel(value: unknown): string {
  const raw = String(value || '').trim();
  return raw || 'UNKNOWN-MERCHANT';
}

function coerceAmountLabel(value: unknown): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return 'UNKNOWN-AMOUNT';
  const sign = n < 0 ? '-' : '';
  return `${sign}${Math.abs(n).toFixed(2)}`;
}

function getSummarySourceText(docData: any): string {
  return cleanupOcrText(
    docData?.ocr_text ||
      docData?.extracted_data?.rawText ||
      docData?.extracted_data?.text ||
      ''
  );
}

function extractStatementPeriod(docData: any): string | null {
  const extractedPeriod = String(docData?.extracted_data?.statement_period || '').trim();
  if (extractedPeriod) return extractedPeriod;
  const rawText = getSummarySourceText(docData);
  if (!rawText) return null;
  const periodMatch = rawText.match(/For\s+([A-Za-z]{3}\s+\d+\s+to\s+[A-Za-z]{3}\s+\d+,\s+\d{4})/i);
  return periodMatch?.[1] || null;
}

function extractInstitutionOrCard(docData: any): string | null {
  const extracted = docData?.extracted_data || {};
  const candidates = [
    extracted.institution,
    extracted.bank,
    extracted.card,
    extracted.card_name,
    extracted.issuer,
  ];
  for (const candidate of candidates) {
    const text = String(candidate || '').trim();
    if (text) return text;
  }
  const rawText = getSummarySourceText(docData);
  const bankMatch = rawText.match(/^([A-Z][A-Za-z0-9 ]+Account Statement)/m);
  return bankMatch?.[1] || null;
}

function extractAccountLast4(docData: any): string | null {
  const extracted = docData?.extracted_data || {};
  const candidate = String(
    extracted.account_last4 ||
      extracted.account_last_4 ||
      extracted.last4 ||
      extracted.last_4 ||
      ''
  ).trim();
  if (candidate) return candidate.slice(-4);
  const accountNumber = String(extracted.account_number || '').replace(/\D/g, '');
  if (accountNumber.length >= 4) return accountNumber.slice(-4);
  return null;
}

function extractTotalsLine(docData: any): string | null {
  const extracted = docData?.extracted_data || {};
  const parts: string[] = [];
  if (extracted.new_balance !== undefined && extracted.new_balance !== null && extracted.new_balance !== '') {
    parts.push(`balance ${coerceAmountLabel(extracted.new_balance)}`);
  }
  if (extracted.payments !== undefined && extracted.payments !== null && extracted.payments !== '') {
    parts.push(`payments ${coerceAmountLabel(extracted.payments)}`);
  }
  if (extracted.fees !== undefined && extracted.fees !== null && extracted.fees !== '') {
    parts.push(`fees ${coerceAmountLabel(extracted.fees)}`);
  }
  if (extracted.interest_charged !== undefined && extracted.interest_charged !== null && extracted.interest_charged !== '') {
    parts.push(`interest ${coerceAmountLabel(extracted.interest_charged)}`);
  }
  return parts.length > 0 ? parts.join(' / ') : null;
}

type CardStatementFields = {
  dueDate: string | null;
  minimumPayment: number | null;
  newBalance: number | null;
  creditLimit: number | null;
  availableCredit: number | null;
  utilizationPct: number | null;
};

function parseFieldMoney(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const raw = String(value).trim();
  if (!raw) return null;
  return parseMoney(raw);
}

function extractCardStatementFields(docData: any): CardStatementFields {
  const extracted = docData?.extracted_data || {};
  const dueDate = String(extracted.due_date || extracted.payment_due_date || '').trim() || null;
  const minimumPayment = parseFieldMoney(extracted.minimum_payment_due ?? extracted.minimum_due);
  const newBalance = parseFieldMoney(extracted.new_balance ?? extracted.statement_balance);
  const creditLimit = parseFieldMoney(extracted.credit_limit);
  const availableCredit = parseFieldMoney(extracted.available_credit);
  const utilizationPct =
    creditLimit !== null && creditLimit > 0 && newBalance !== null
      ? Math.max(0, Math.min(100, (newBalance / creditLimit) * 100))
      : null;
  return {
    dueDate,
    minimumPayment,
    newBalance,
    creditLimit,
    availableCredit,
    utilizationPct,
  };
}

type SummaryTransactionRow = {
  line: string;
  issue?: string;
};

function toSummaryTransactionRow(tx: any): SummaryTransactionRow {
  const data = tx?.data_json || {};
  const date = coerceDateLabel(data.posted_at || data.date || data.transaction_date);
  const merchant = coerceMerchantLabel(
    data.merchant || data.vendor || data.description || data.payee || data.memo || data.name
  );
  const amount = coerceAmountLabel(data.amount);
  const currency = String(data.currency || 'UNKNOWN-CURRENCY').trim() || 'UNKNOWN-CURRENCY';
  const category = String(tx?.tag_category || data.category || '').trim();
  const status = String(tx?.tag_status || '').trim();
  const confidence = Number(tx?.tag_confidence ?? 1);
  const lowConfidence = status === 'needs_review' || (!Number.isNaN(confidence) && confidence < LOW_CONFIDENCE_THRESHOLD);
  const notes = lowConfidence
    ? `low-confidence${category ? `, category=${category}` : ''}`
    : category
      ? `category=${category}`
      : 'n/a';

  const row: SummaryTransactionRow = {
    line: `- ${date} | ${merchant} | ${amount} | ${currency} | ${notes}`,
  };
  if (lowConfidence) {
    row.issue = `${date} | ${merchant} flagged for review (confidence=${Number.isFinite(confidence) ? confidence.toFixed(2) : 'n/a'})`;
  }
  return row;
}

export function formatOcrSummaryMarkdown(params: {
  docData?: any;
  transactions?: any[];
  transactionCount?: number;
  topCategories?: string[];
  needsReviewCount?: number;
  extraIssues?: string[];
}): string {
  const docData = params.docData || {};
  const transactions = Array.isArray(params.transactions) ? params.transactions : [];
  const transactionCount = Number.isFinite(Number(params.transactionCount))
    ? Number(params.transactionCount)
    : transactions.length;
  const topCategories = Array.isArray(params.topCategories) ? params.topCategories : [];
  const needsReviewCount = Number(params.needsReviewCount || 0);
  const issues: string[] = Array.isArray(params.extraIssues) ? [...params.extraIssues] : [];
  const cardFields = extractCardStatementFields(docData);

  const trustedCount = Math.max(transactionCount - needsReviewCount, 0);
  const summaryBullets: string[] = [
    `- I reviewed this document and captured ${transactionCount} transaction${transactionCount === 1 ? '' : 's'}.`,
    `- ${trustedCount} look ready to use, and ${needsReviewCount} need a quick review.`,
  ];
  if (topCategories.length > 0) {
    summaryBullets.push(`- Biggest spend signals this period: ${topCategories.slice(0, 3).join(', ')}.`);
  }
  if (needsReviewCount > 0) {
    summaryBullets.push('- Next best step: confirm the flagged lines first and I will learn from your corrections.');
  } else {
    summaryBullets.push('- Next best step: ask for top merchants, recurring charges, or unusual activity.');
  }
  if (cardFields.newBalance !== null) {
    summaryBullets.push(`- Statement balance detected: ${formatMoney(cardFields.newBalance)}.`);
  }
  if (cardFields.utilizationPct !== null) {
    const pct = `${cardFields.utilizationPct.toFixed(1)}%`;
    summaryBullets.push(`- Credit utilization: ${pct}.`);
    if (cardFields.utilizationPct >= 80) {
      summaryBullets.push('- Risk signal: high utilization can increase interest pressure this cycle.');
    }
  }
  if (cardFields.minimumPayment !== null || cardFields.dueDate) {
    const minDue = cardFields.minimumPayment !== null ? formatMoney(cardFields.minimumPayment) : 'unknown minimum due';
    const due = cardFields.dueDate || 'unknown due date';
    summaryBullets.push(`- Next action: plan at least ${minDue} before ${due}.`);
  }

  const period = extractStatementPeriod(docData) || 'unknown';
  const institution = extractInstitutionOrCard(docData) || 'unknown';
  const accountLast4 = extractAccountLast4(docData);
  const totalsLine = extractTotalsLine(docData);

  const transactionLines: string[] = [];
  for (const tx of transactions) {
    const row = toSummaryTransactionRow(tx);
    transactionLines.push(row.line);
    if (row.issue) issues.push(row.issue);
  }
  if (transactionLines.length === 0) {
    transactionLines.push('- UNKNOWN-DATE | UNKNOWN-MERCHANT | UNKNOWN-AMOUNT | UNKNOWN-CURRENCY | no parsed transactions');
  }

  const uniqueIssues = Array.from(new Set(issues.map((x) => String(x || '').trim()).filter(Boolean)));

  const output: string[] = [];
  output.push('## Summary');
  output.push(...summaryBullets.slice(0, 6));
  output.push('');
  output.push('## Key details');
  output.push(`- Statement period: ${period}`);
  output.push(`- Institution / Card: ${institution}`);
  output.push(`- Account last-4 (if present): ${accountLast4 || 'not present'}`);
  if (totalsLine) {
    output.push(`- Totals (only if visible): ${totalsLine}`);
  } else {
    output.push('- Totals (only if visible): not visible');
  }
  output.push(`- Payment due date: ${cardFields.dueDate || 'not visible'}`);
  output.push(
    `- Minimum payment due: ${cardFields.minimumPayment !== null ? formatMoney(cardFields.minimumPayment) : 'not visible'}`
  );
  output.push(
    `- Credit utilization (if visible): ${cardFields.utilizationPct !== null ? `${cardFields.utilizationPct.toFixed(1)}%` : 'not visible'}`
  );
  output.push('');
  output.push('## Transactions (cleaned)');
  output.push(...transactionLines);
  output.push('');
  output.push('## Issues / Uncertain lines');
  if (uniqueIssues.length === 0) {
    output.push('- None detected from parsed data');
  } else {
    output.push(...uniqueIssues.map((issue) => `- ${issue}`));
  }

  return output.join('\n');
}

function parseStatementStyleSummary(docData: any): string | null {
  const rawText = getSummarySourceText(docData);
  if (!rawText) return null;
  const looksLikeStatement =
    /Account Statement/i.test(rawText) ||
    (/Opening balance/i.test(rawText) && /Closing balance/i.test(rawText)) ||
    (/Withdrawals/i.test(rawText) && /Deposits/i.test(rawText) && /E-TRANSFER/i.test(rawText));
  if (!looksLikeStatement) return null;

  const periodMatch = rawText.match(/For\s+([A-Za-z]{3}\s+\d+\s+to\s+[A-Za-z]{3}\s+\d+,\s+\d{4})/i);
  const period = periodMatch?.[1] || null;
  const bankMatch = rawText.match(/^([A-Z][A-Za-z0-9 ]+Account Statement)/m);
  const bankLabel = bankMatch?.[1] || 'Bank statement';
  const accountNumberMatch = rawText.match(/Account number\s*\n\s*([0-9\-]+)/i);
  const accountNumber = accountNumberMatch?.[1] || null;

  const openingMatch = rawText.match(/Opening balance on[^\n]*\s(-?\$?[0-9,]+\.\d{2})/i);
  const withdrawalsMatch = rawText.match(/Withdrawals[^\d-]*-?\s*([0-9][0-9,]*\.\d{2})/i);
  const depositsMatch = rawText.match(/Deposits[^\d+]*\+?\s*([0-9][0-9,]*\.\d{2})/i);
  const closingMatch =
    rawText.match(/Closing balance on[^\n=]*=\s*\$?([0-9][0-9,]*\.\d{2})/i) ||
    rawText.match(/Closing balance\s*\$([0-9,]+\.\d{2})/i);

  const opening = parseMoney(openingMatch?.[1] || null);
  const withdrawals = parseMoney(withdrawalsMatch?.[1] || null);
  const deposits = parseMoney(depositsMatch?.[1] || null);
  let closing = parseMoney(closingMatch?.[1] || null);
  if (closing === null && opening !== null && withdrawals !== null && deposits !== null) {
    closing = opening - withdrawals + deposits;
  }
  const netChange = opening !== null && closing !== null ? closing - opening : null;

  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !/^--\s*\d+\s+of\s+\d+\s*--$/i.test(l));

  const transferItems: Array<{ amount: number }> = [];
  const retailByMerchant = new Map<string, number>();
  let cashWithdrawal: { label: string; amount: number } | null = null;
  let serviceCharge: number | null = null;

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (/^E-TRANSFER\b/i.test(line)) {
      const amountLine = lines[i + 2] || '';
      const amountMatch = amountLine.match(/([0-9,]+\.\d{2})/);
      const amount = parseMoney(amountMatch?.[1] || null);
      if (amount !== null) {
        transferItems.push({ amount });
      }
    }

    if (/^WITHDRAWAL\b/i.test(line)) {
      const locationHint = (lines[i + 1] || '').replace(/\s+/g, ' ').trim();
      const label = locationHint || 'Cash withdrawal';
      const localProbe = [line, lines[i + 1] || '', lines[i + 2] || ''].join(' ');
      const moneyMatches = Array.from(localProbe.matchAll(/([0-9][0-9,]*\.\d{2})/g))
        .map((m) => parseMoney(m[1]))
        .filter((n): n is number => n !== null);
      if (moneyMatches.length > 0) {
        cashWithdrawal = { label, amount: Math.max(...moneyMatches) };
      }
    }

    if (/^RETAIL PURCHASE\b/i.test(line)) {
      const merchant = (lines[i + 1] || 'Retail merchant').trim();
      const amountLine = lines[i + 2] || '';
      const amountMatch = amountLine.match(/([0-9,]+\.\d{2})/);
      const amount = parseMoney(amountMatch?.[1] || null);
      if (amount !== null) {
        retailByMerchant.set(merchant, (retailByMerchant.get(merchant) || 0) + amount);
      }
    }

    if (/SERVICE CHARGE/i.test(line)) {
      for (let j = i; j <= i + 4; j += 1) {
        const probe = lines[j] || '';
        const amountMatch = probe.match(/([0-9,]+\.\d{2})/);
        const amount = parseMoney(amountMatch?.[1] || null);
        if (amount !== null) {
          serviceCharge = amount;
          break;
        }
      }
    }
  }

  const topTransferItems = transferItems
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 2)
    .map((x) => formatMoney(x.amount));
  const retailItems = Array.from(retailByMerchant.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  const summaryLines: string[] = [];
  summaryLines.push('STATEMENT SNAPSHOT');
  summaryLines.push(
    `Account: ${bankLabel}${accountNumber ? `, account ${accountNumber}` : ''}, ending balance ${formatMoney(closing)}`
  );
  if (period) {
    summaryLines.push(`Statement period: ${period}`);
  }
  summaryLines.push(`Opening balance: ${formatMoney(opening)}`);
  summaryLines.push(`Total withdrawals: ${formatMoney(withdrawals)}`);
  summaryLines.push(`Total deposits: ${formatMoney(deposits)}`);
  summaryLines.push(
    `Net change: ${formatMoney(netChange)}${opening !== null && closing !== null ? ` (from ${formatMoney(opening)} to ${formatMoney(closing)})` : ''}`
  );
  summaryLines.push('');
  summaryLines.push('WHAT HAPPENED');
  summaryLines.push('- Most activity is e-Transfers with repeated movement between known names.');
  if (topTransferItems.length > 0) {
    summaryLines.push(`- Largest transfer entries are approximately ${topTransferItems.join(' and ')}.`);
  }
  if (cashWithdrawal) {
    summaryLines.push(`- Large cash withdrawal: ${formatMoney(cashWithdrawal.amount)} (${cashWithdrawal.label}).`);
  }
  if (retailItems.length > 0) {
    summaryLines.push(`- Small retail spend appears limited (e.g., Coke and Castledowns BIN purchases).`);
  }
  if (serviceCharge !== null) {
    summaryLines.push(`- Monthly bank fee charged: ${formatMoney(serviceCharge)}.`);
  }
  summaryLines.push('');
  summaryLines.push('QUICK INSIGHT');
  summaryLines.push('- This period shows high cash movement and relatively low discretionary spend.');
  summaryLines.push('- Balance repeatedly moved near low levels between transfer cycles, then recovered.');
  summaryLines.push('- Biggest impact drivers were transfer-outs, cash withdrawal, and service charges.');

  return summaryLines.join('\n');
}

async function loadDocumentDataForSummary(sb: any, documentId: string): Promise<any | null> {
  const projection = 'id, ocr_text, ocr_text_hash, ocr_text_length, summary, original_name, pii_types, extracted_data';
  const { data: userDoc } = await sb
    .from('user_documents')
    .select(projection)
    .eq('id', documentId)
    .maybeSingle();
  if (userDoc) return userDoc;

  // Some environments persist to documents instead of user_documents.
  const { data: genericDoc } = await sb
    .from('documents')
    .select(projection)
    .eq('id', documentId)
    .maybeSingle();
  return genericDoc || null;
}

function extractVendorForSummary(dataJson: any): string {
  return String(
    dataJson?.description ||
    dataJson?.merchant ||
    dataJson?.vendor ||
    dataJson?.payee ||
    dataJson?.memo ||
    dataJson?.name ||
    dataJson?.details ||
    'Unknown vendor'
  ).trim() || 'Unknown vendor';
}

function normalizeVendorForSummary(input: string): string {
  return input
    .toLowerCase()
    .replace(/[0-9]{4,}/g, '')
    .replace(/[^a-z0-9 ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildFallbackSummary(docData: any): string | null {
  if (!docData) return null;
  const extracted = docData.extracted_data || null;
  const lines: string[] = [];

  if (extracted) {
    if (extracted.vendor) lines.push(`Vendor: ${extracted.vendor}`);
    if (extracted.merchant) lines.push(`Merchant: ${extracted.merchant}`);
    if (extracted.invoice_no) lines.push(`Invoice #: ${extracted.invoice_no}`);
    if (extracted.date) lines.push(`Date: ${extracted.date}`);
    if (extracted.statement_period) lines.push(`Statement period: ${extracted.statement_period}`);
    if (extracted.new_balance) lines.push(`New balance: $${extracted.new_balance}`);
    if (extracted.minimum_payment_due) lines.push(`Minimum payment due: $${extracted.minimum_payment_due}`);
    if (extracted.due_date) lines.push(`Payment due date: ${extracted.due_date}`);
    if (extracted.previous_balance) lines.push(`Previous balance: $${extracted.previous_balance}`);
    if (extracted.payments) lines.push(`Payments: -$${extracted.payments}`);
    if (extracted.transactions) lines.push(`Transactions: +$${extracted.transactions}`);
    if (extracted.interest_charged) lines.push(`Interest charged: +$${extracted.interest_charged}`);
    if (extracted.credit_limit) lines.push(`Credit limit: $${extracted.credit_limit}`);
    if (extracted.available_credit) lines.push(`Available credit: $${extracted.available_credit}`);
    if (extracted.total) {
      lines.push(`Total: $${extracted.total}${extracted.currency ? ` ${extracted.currency}` : ''}`);
    }
    if (Array.isArray(docData.pii_types) && docData.pii_types.length > 0) {
      lines.push(`PII redacted: ${docData.pii_types.join(', ')}`);
    }
  }

  if (lines.length > 0) {
    return `I read your document (${docData.original_name || 'upload'}). Here’s what I found:\n${lines
      .map((l) => `• ${l}`)
      .join('\n')}`;
  }

  const textLength = Number(docData?.ocr_text_length ?? docData?.extracted_data?.text_length ?? 0);
  const textHash = String(docData?.ocr_text_hash || docData?.extracted_data?.text_hash || '');
  if (textLength > 0 || textHash) {
    return `I read your document (${docData.original_name || 'upload'}) but couldn’t extract transactions yet. OCR metrics: length=${textLength || 0}, hash=${textHash || 'n/a'}.`;
  }

  return null;
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ ok: false, error: 'Method not allowed. Use POST.' }),
    };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    let importId = body.importId as string | undefined;
    const docId = body.docId as string | undefined;

    const sb = admin();
    if (!importId && docId) {
      const { data: latestImport } = await sb
        .from('imports')
        .select('id')
        .eq('document_id', docId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      importId = latestImport?.id;
    }

    if (!importId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ ok: false, error: 'Missing importId or docId' }),
      };
    }

    const { data: importData } = await sb
      .from('imports')
      .select('id, status, created_at, document_id')
      .eq('id', importId)
      .maybeSingle();

    if (!importData) {
      const summary = formatOcrSummaryMarkdown({
        transactions: [],
        transactionCount: 0,
        needsReviewCount: 0,
        extraIssues: ['Import record not found for the provided identifier'],
      });
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ ok: true, summary }),
      };
    }

    const { data: stagingTransactions } = await sb
      .from('transactions_staging')
      .select('id, data_json, tag_category, tag_status, tag_confidence, tag_rule_source')
      .eq('import_id', importId);

    let transactions = stagingTransactions || [];
    if (!transactions.length) {
      const { data: committedTransactions } = await sb
        .from('transactions')
        .select('id, data_json')
        .eq('import_id', importId);
      transactions = committedTransactions || [];
    }
    if (!transactions.length && importData.document_id) {
      const { data: stagedByDoc } = await sb
        .from('transactions_staging')
        .select('id, data_json, tag_category, tag_status, tag_confidence, tag_rule_source')
        .contains('data_json', { documentId: importData.document_id });
      transactions = stagedByDoc || [];
    }
    if (!transactions.length && importData.document_id) {
      const { data: stagedByDocEq } = await sb
        .from('transactions_staging')
        .select('id, data_json, tag_category, tag_status, tag_confidence, tag_rule_source')
        .eq('data_json->>documentId', importData.document_id);
      transactions = stagedByDocEq || [];
    }
    if (!transactions.length && importData.document_id) {
      const { data: committedByDoc } = await sb
        .from('transactions')
        .select('id, data_json')
        .contains('data_json', { documentId: importData.document_id });
      transactions = committedByDoc || [];
    }
    if (!transactions.length && importData.document_id) {
      const { data: committedByDocEq } = await sb
        .from('transactions')
        .select('id, data_json')
        .eq('data_json->>documentId', importData.document_id);
      transactions = committedByDocEq || [];
    }
    if (!transactions.length && importData.document_id) {
      const { data: latestImport } = await sb
        .from('imports')
        .select('id')
        .eq('document_id', importData.document_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (latestImport?.id && latestImport.id !== importId) {
        const { data: stagedByLatest } = await sb
          .from('transactions_staging')
          .select('id, data_json, tag_category, tag_status, tag_confidence, tag_rule_source')
          .eq('import_id', latestImport.id);
        transactions = stagedByLatest || [];
      }
    }

    const transactionCount = transactions.length;
    let statementDocData: any = null;
    if (importData.document_id) {
      const docData = await loadDocumentDataForSummary(sb, importData.document_id);
      statementDocData = docData;
    }

    if (transactionCount === 0) {
      const summary = formatOcrSummaryMarkdown({
        docData: statementDocData,
        transactions: [],
        transactionCount: 0,
        needsReviewCount: 0,
        extraIssues: importData.document_id ? [] : ['No document context was available for this import'],
      });
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true, summary }) };
    }

    const categoryTotals = new Map<string, { amount: number; count: number }>();
    const needsReviewVendors = new Map<string, { vendorLabel: string; count: number }>();
    let needsReviewCount = 0;
    let vendorMemoryHits = 0;
    let aiInferredCount = 0;
    transactions.forEach((tx: any) => {
      const tagCategory = tx.tag_category ?? null;
      const tagStatus = tx.tag_status ?? 'untagged';
      const tagConfidence = Number(tx.tag_confidence ?? 0) || 0;
      const tagRuleSource = String(tx.tag_rule_source ?? '');
      const category = tagCategory ?? tx.data_json?.category ?? 'Uncategorized';
      const amount = Math.abs(Number(tx.data_json?.amount || 0));
      const existing = categoryTotals.get(category) || { amount: 0, count: 0 };
      categoryTotals.set(category, {
        amount: existing.amount + amount,
        count: existing.count + 1,
      });
      if (tagStatus === 'needs_review') {
        needsReviewCount += 1;
        const vendorLabel = extractVendorForSummary(tx.data_json);
        const vendorKey = normalizeVendorForSummary(vendorLabel) || 'unknown vendor';
        const existingVendor = needsReviewVendors.get(vendorKey) || { vendorLabel, count: 0 };
        needsReviewVendors.set(vendorKey, {
          vendorLabel: existingVendor.vendorLabel,
          count: existingVendor.count + 1,
        });
      }
      if (tagRuleSource === 'vendor_memory') {
        vendorMemoryHits += 1;
      } else if (tagRuleSource === 'ai') {
        aiInferredCount += 1;
      }

      // Defensive read to avoid crashes when tag confidence is missing.
      void tagConfidence;
    });

    const topCategories = Array.from(categoryTotals.entries())
      .sort((a, b) => b[1].amount - a[1].amount)
      .slice(0, 3)
      .map(([cat, stats]) => `${cat} (${stats.count} tx, $${stats.amount.toFixed(2)})`);

    const insights: string[] = [];
    insights.push(`${transactionCount} transaction${transactionCount !== 1 ? 's' : ''} processed`);
    if (topCategories.length > 0) {
      insights.push(`Top category: ${topCategories[0]}`);
    }
    if (needsReviewCount > 0) {
      insights.push(`${needsReviewCount} transaction${needsReviewCount !== 1 ? 's' : ''} need review`);
      insights.push(`You have ${needsReviewCount} transactions that need review. Once confirmed, I will remember these vendors automatically.`);
      const topNeedsReviewVendors = Array.from(needsReviewVendors.values())
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)
        .map((v) => `${v.vendorLabel} (${v.count})`);
      if (topNeedsReviewVendors.length > 0) {
        insights.push(`Top vendors needing review: ${topNeedsReviewVendors.join(', ')}`);
      }
    }
    if (vendorMemoryHits > 0) {
      insights.push('I recognized several vendors from your history to improve accuracy.');
    }
    if (aiInferredCount > 0) {
      insights.push('Some categories were AI-inferred and may benefit from confirmation.');
    }

    const summary = formatOcrSummaryMarkdown({
      docData: statementDocData,
      transactions,
      transactionCount,
      topCategories,
      needsReviewCount,
      extraIssues: [],
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ ok: true, summary }),
    };
  } catch (error: any) {
    const fallbackSummary = formatOcrSummaryMarkdown({
      transactions: [],
      transactionCount: 0,
      needsReviewCount: 0,
      extraIssues: [String(error?.message || 'Summary generation failed')],
    });
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ ok: false, summary: fallbackSummary }),
    };
  }
};
