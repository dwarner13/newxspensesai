/**
 * apply-category-rules
 *
 * Applies user-defined category_rules + vendor memory + hardcoded overrides
 * + merchant map to committed transactions. Can scope to a specific import_id.
 *
 * POST { import_id?: string, limit?: number }
 * Returns { ok, updated, total, skipped, duplicatesRemoved }
 *
 * IMPORTANT: This function ONLY updates category, category_source, subcategory,
 * subcategory_source, and updated_at. It NEVER changes type, amount, or
 * merchant_name - those fields are owned by the parser.
 */

import type { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import { verifyAuth } from './_shared/verifyAuth.js';
import { safeLog } from './_shared/safeLog.js';
import { normalizeMerchant } from './_shared/merchantUtils.js';
import { matchMerchantMap } from './_shared/merchantCategoryMap.js';
import { applyDefaultRules } from './_shared/tagDefaultRules.js';

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// ─── Hardcoded merchant overrides - these ALWAYS win ────────────────────────
// Match by checking if merchant_name.toUpperCase() includes the key.
// Order matters: more specific keys first (e.g. "POPEYE'S SUPPLEMENTS" before "POPEYES")
const HARDCODED_OVERRIDES: Array<{ key: string; category: string; subcategory?: string }> = [
  { key: "POPEYE'S SUPPLEMENTS", category: 'Healthcare', subcategory: 'Supplements' },
  { key: 'LEWIS MASSAGE', category: 'Personal Care', subcategory: 'Massage' },
  { key: "AD'S MASSAGE", category: 'Personal Care', subcategory: 'Massage' },
  { key: 'LA FITNESS', category: 'Personal Care', subcategory: 'Gym & Fitness' },
  { key: 'Q HAIR DESIGN', category: 'Personal Care', subcategory: 'Hair & Beauty' },
  { key: 'Q HAIR', category: 'Personal Care', subcategory: 'Hair & Beauty' },
  { key: 'SHADIFIED', category: 'Personal Care' },
  { key: 'TULIP GARDEN', category: 'Personal Care' },
  { key: 'BORROWELL', category: 'Bank Fees' },
  { key: 'BALANCEPROTECTOR', category: 'Bank Fees', subcategory: 'Balance Protection' },
  { key: 'BALANCE PROTECTOR', category: 'Bank Fees', subcategory: 'Balance Protection' },
  { key: 'PREMIUM PLAN', category: 'Bank Fees' },
  { key: 'UNIMEAL', category: 'Healthcare', subcategory: 'Supplements' },
  { key: 'SA *V SUPPORT', category: 'Healthcare', subcategory: 'Supplements' },
  { key: 'MOBILE CHEQUE', category: 'Income', subcategory: 'Cheque Deposit' },
  { key: 'INTERAC E-TRANSFER SENT', category: 'Transfers', subcategory: 'e-Transfer' },
  { key: 'INTERAC E-TRANSFER RECEIVED', category: 'Transfers', subcategory: 'e-Transfer' },
  { key: 'INTERAC E-TRANSFER', category: 'Transfers', subcategory: 'e-Transfer' },
  { key: 'NORTHTOWN REGISTRY', category: 'Transportation', subcategory: 'Registration' },
  { key: 'NORTHTOWN', category: 'Transportation' },
  { key: 'CASH MONEY', category: 'Debt Payments', subcategory: 'Loan Payment' },
  { key: 'EASYFINANCIAL', category: 'Debt Payments', subcategory: 'Loan Payment' },
  { key: 'CELTIC GROUP', category: 'Debt Payments' },
  { key: 'TD LOAN', category: 'Debt Payments', subcategory: 'Loan Payment' },
  { key: 'BMO INV', category: 'Transfers', subcategory: 'Investments' },
  { key: 'B/M PAYT', category: 'Housing', subcategory: 'Mortgage' },
  { key: 'NATIONAL MONEY', category: 'Debt Payments' },
  { key: 'FLEXITI', category: 'Debt Payments', subcategory: 'Credit Card' },
  { key: 'PETRO-CANADA', category: 'Transportation', subcategory: 'Gas & Fuel' },
  { key: 'SHELL', category: 'Transportation', subcategory: 'Gas & Fuel' },
  { key: 'ESSO', category: 'Transportation', subcategory: 'Gas & Fuel' },
  { key: 'KOLLBROOK', category: 'Transportation', subcategory: 'Gas & Fuel' },
  { key: 'SOBEYS', category: 'Groceries' },
  { key: 'SAVE ON FOODS', category: 'Groceries' },
  { key: 'LOBLAWS', category: 'Groceries' },
  { key: 'SAFEWAY', category: 'Groceries' },
  { key: 'COSTCO GAS', category: 'Transportation', subcategory: 'Gas & Fuel' },
  { key: 'COSTCO', category: 'Groceries' },
  { key: 'WALMART', category: 'Shopping' },
  { key: 'POPEYES', category: 'Food & Dining', subcategory: 'Fast Food' },
  { key: 'TIM HORTONS', category: 'Food & Dining', subcategory: 'Coffee' },
  { key: 'CDACARBONREBATE', category: 'Income', subcategory: 'Government Rebate' },
  { key: 'CANADA RIT', category: 'Income', subcategory: 'Tax Refund' },
  { key: 'MANULIFE', category: 'Income', subcategory: 'Insurance' },
  { key: 'GORDON FOOD SER PAY', category: 'Income', subcategory: 'Employment' },
  { key: 'GFS PAY', category: 'Income', subcategory: 'Employment' },
  { key: 'GORDON FOOD SER', category: 'Groceries', subcategory: 'Food Supply' },
  { key: 'RIVER CITY HYUNDAI', category: 'Transportation', subcategory: 'Auto Service' },
  { key: 'JIFFY LUBE', category: 'Transportation', subcategory: 'Auto Service' },
  { key: 'REVOLUTION MOTO', category: 'Transportation', subcategory: 'Auto Service' },
  { key: 'FLAME & BARREL', category: 'Food & Dining', subcategory: 'Restaurants' },
  { key: 'YANG MING BUFFET', category: 'Food & Dining', subcategory: 'Restaurants' },
  { key: 'LOCAL MEATS', category: 'Food & Dining', subcategory: 'Restaurants' },
  { key: 'BLACKJACKS ROADHOUSE', category: 'Food & Dining', subcategory: 'Restaurants' },
  { key: 'SUPPLEMENT KING', category: 'Healthcare', subcategory: 'Supplements' },
  { key: 'BEIJING HOUSE', category: 'Food & Dining', subcategory: 'Restaurants' },
  { key: 'CANYON GRILL', category: 'Food & Dining', subcategory: 'Restaurants' },
  { key: 'COBS BREAD', category: 'Food & Dining', subcategory: 'Bakery' },
  { key: 'ANEJO RESTAURANT', category: 'Food & Dining', subcategory: 'Restaurants' },
  { key: "O'MASSAGE", category: 'Personal Care', subcategory: 'Massage' },
  { key: 'NAILS SPOT', category: 'Personal Care', subcategory: 'Nail Care' },
  { key: 'XIAO PING', category: 'Personal Care', subcategory: 'Massage' },
  { key: "ALBERT'S FAMILY", category: 'Food & Dining', subcategory: 'Restaurants' },
  { key: "MITCH'S RESTAURANT", category: 'Food & Dining', subcategory: 'Restaurants' },
  { key: 'AUDREY', category: 'Food & Dining', subcategory: 'Restaurants' },
  { key: 'DREAMHOST', category: 'Subscriptions', subcategory: 'Software' },
  { key: 'CLAUDE.AI', category: 'Subscriptions', subcategory: 'Software' },
  { key: 'RAILWAY CA', category: 'Subscriptions', subcategory: 'Software' },
  { key: 'D AND T CATERING', category: 'Food & Dining', subcategory: 'Restaurants' },
  { key: "MAC'S CONVENIENCE", category: 'Food & Dining', subcategory: 'Convenience' },
  { key: 'LEDUC DINER', category: 'Food & Dining', subcategory: 'Restaurants' },
  { key: 'UFO PIZZA', category: 'Food & Dining', subcategory: 'Restaurants' },
  { key: '7-ELEVEN', category: 'Food & Dining', subcategory: 'Coffee & Drinks' },
  { key: '7 ELEVEN', category: 'Food & Dining', subcategory: 'Coffee & Drinks' },
  { key: "MAC'S CONVENIENCE", category: 'Food & Dining', subcategory: 'Coffee & Drinks' },
  { key: 'ROGERS', category: 'Utilities', subcategory: 'Phone & Internet' },
  { key: 'TELUS COMM', category: 'Utilities', subcategory: 'Phone & Internet' },
  { key: 'TELUS', category: 'Utilities', subcategory: 'Phone & Internet' },
  { key: 'RIVER CREE RESORT', category: 'Entertainment', subcategory: 'Gaming' },
  { key: 'RIVER CREE', category: 'Entertainment', subcategory: 'Gaming' },
  { key: 'BEAR HILLS CASINO', category: 'Entertainment', subcategory: 'Gaming' },
  { key: 'SPECSAVERS', category: 'Healthcare', subcategory: 'Vision' },
  { key: 'RIVERVIEW PH', category: 'Healthcare', subcategory: 'Pharmacy' },
  { key: 'SHOPPERS DRUG', category: 'Healthcare', subcategory: 'Pharmacy' },
  { key: 'LEWIS ESTATES', category: 'Entertainment', subcategory: 'Golf' },
  // Triangle / Canadian Tire card-specific
  { key: 'INTEREST CHARGES', category: 'Bank Fees', subcategory: 'Interest' },
  { key: 'CANADIAN TIRE BANK', category: 'Bank Fees', subcategory: 'Interest' },
  { key: 'CTFS.COM', category: 'Transfers', subcategory: 'Credit Card Payment' },
  { key: 'CTFS.COM/PAYMENTS', category: 'Transfers', subcategory: 'Credit Card Payment' },
  { key: 'CDN TIRE STORE', category: 'Shopping', subcategory: 'Home & Garden' },
  { key: 'CANADIAN TIRE STORE', category: 'Shopping', subcategory: 'Home & Garden' },
  { key: 'TRIANGLE CP COMPLETE', category: 'Transportation', subcategory: 'Car Wash' },
  // Subscriptions / SaaS
  { key: 'NETLIFY', category: 'Subscriptions', subcategory: 'Software' },
  { key: 'OPENAI', category: 'Subscriptions', subcategory: 'Software' },
  { key: 'CURSOR', category: 'Subscriptions', subcategory: 'Software' },
  { key: 'PADDLE.NET', category: 'Subscriptions', subcategory: 'Software' },
  { key: 'PADDLE NET', category: 'Subscriptions', subcategory: 'Software' },
  { key: 'NETFLIX', category: 'Subscriptions', subcategory: 'Streaming' },
  { key: 'SPOTIFY', category: 'Subscriptions', subcategory: 'Streaming' },
  { key: 'DISNEY', category: 'Subscriptions', subcategory: 'Streaming' },
  { key: 'CRAVE', category: 'Subscriptions', subcategory: 'Streaming' },
  { key: 'YOUTUBE PREMIUM', category: 'Subscriptions', subcategory: 'Streaming' },
  { key: 'APPLE.COM/BILL', category: 'Subscriptions', subcategory: 'Software' },
  { key: 'GOOGLE ONE', category: 'Subscriptions', subcategory: 'Software' },
  { key: 'MICROSOFT', category: 'Subscriptions', subcategory: 'Software' },
  // Credit card payments
  { key: 'MASTERCARD', category: 'Transfers', subcategory: 'Credit Card Payment' },
  { key: 'VISA PAYMENT', category: 'Transfers', subcategory: 'Credit Card Payment' },
  { key: 'CAPITAL ONE PAYMENT', category: 'Transfers', subcategory: 'Credit Card Payment' },
  { key: 'RBC PAYMENT', category: 'Transfers', subcategory: 'Credit Card Payment' },
  { key: 'PAYMENT', category: 'Transfers', subcategory: 'Credit Card Payment' },
  { key: 'PAYBACK WITH POINTS', category: 'Transfers', subcategory: 'Points Redemption' },
  { key: 'SS EDMONTON', category: 'Groceries' },
  { key: 'IMPERIAL PFS', category: 'Insurance', subcategory: 'Business Insurance' },
  { key: 'TD VISA', category: 'Transfers', subcategory: 'Credit Card Payment' },
  // Subscriptions
  { key: 'CANVA', category: 'Subscriptions', subcategory: 'Software' },
  { key: 'EVERLANCE', category: 'Subscriptions', subcategory: 'Software' },
  { key: 'PREM-PLAN', category: 'Subscriptions', subcategory: 'Software' },
  { key: 'PREM PATALARO', category: 'Subscriptions', subcategory: 'Software' },
  { key: 'APPLE.COM', category: 'Subscriptions', subcategory: 'Software' },
  // Bank Fees
  { key: 'CASH ADVANCE INTEREST', category: 'Bank Fees', subcategory: 'Interest' },
  { key: 'PURCHASE INTEREST', category: 'Bank Fees', subcategory: 'Interest' },
  { key: 'CASH SERVICE CHARGE', category: 'Bank Fees', subcategory: 'Cash Advance Fee' },
  { key: 'CASH - SERVICE CHARGE', category: 'Bank Fees', subcategory: 'Cash Advance Fee' },
  { key: 'CASH ADVANCE FEE', category: 'Bank Fees', subcategory: 'Cash Advance Fee' },
  { key: 'OVERLIMIT FEE', category: 'Bank Fees', subcategory: 'Overlimit Fee' },
  { key: 'FOREIGN TRANSACTION', category: 'Bank Fees', subcategory: 'Foreign Transaction Fee' },
  { key: 'CAPITAL ONE MEMBER FEE', category: 'Bank Fees', subcategory: 'Annual Fee' },
  // ATM
  { key: 'ATM CASH ADVANCE', category: 'Bank Fees', subcategory: 'Cash Advance Fee' },
  { key: 'ATM CASH ADV', category: 'Bank Fees', subcategory: 'Cash Advance Fee' },
  // Transportation
  { key: 'MYALBERTA FINE', category: 'Transportation', subcategory: 'Traffic Fine' },
  { key: 'AHS RAH PARKING', category: 'Transportation', subcategory: 'Parking' },
  // Healthcare
  { key: 'ROYAL ALEXANDRA HOSP', category: 'Healthcare', subcategory: 'Medical' },
  { key: 'SIMPLY HEALTH', category: 'Healthcare' },
  // Entertainment
  { key: 'LANDMARK WEB TICKETING', category: 'Entertainment', subcategory: 'Events' },
  // Business Expenses
  { key: 'MARK A CHANDRA', category: 'Business Expenses', subcategory: 'Professional Services' },
  { key: 'J DICK MCALLISTER', category: 'Business Expenses', subcategory: 'Professional Services' },
  // Personal Care
  { key: 'Q-NAILS', category: 'Personal Care', subcategory: 'Nail Care' },
];

function applyHardcodedOverride(merchant: string): { category: string; subcategory: string | null } | null {
  const upper = merchant.toUpperCase();
  // Also compare with spaces and hyphens stripped so fused OCR output like
  // "TIMHORTONS" still matches key "TIM HORTONS".
  const upperCompact = upper.replace(/[\s\-]+/g, '');
  for (const override of HARDCODED_OVERRIDES) {
    const keyCompact = override.key.replace(/[\s\-]+/g, '');
    if (upper.includes(override.key) || upperCompact.includes(keyCompact)) {
      return { category: override.category, subcategory: override.subcategory || null };
    }
  }
  return null;
}

// ─── Canonical category normalization ───────────────────────────────────────
const CANONICAL: Record<string, string> = {
  'food': 'Food & Dining', 'food & drink': 'Food & Dining', 'restaurants': 'Food & Dining',
  'dining': 'Food & Dining', 'groceries': 'Groceries', 'grocery': 'Groceries',
  'transport': 'Transportation', 'auto': 'Transportation', 'gas': 'Transportation',
  'home': 'Housing', 'rent': 'Housing', 'mortgage': 'Housing',
  'bills': 'Utilities', 'utility': 'Utilities', 'phone': 'Utilities',
  'health': 'Healthcare', 'medical': 'Healthcare', 'pharmacy': 'Healthcare',
  'education': 'Education', 'tuition': 'Education',
  'entertainment': 'Entertainment', 'fun': 'Entertainment',
  'clothing': 'Shopping', 'retail': 'Shopping',
  'bank fee': 'Bank Fees', 'bank fees': 'Bank Fees', 'service charge': 'Bank Fees',
  'transfer': 'Transfers', 'transfers': 'Transfers', 'e-transfer': 'Transfers',
  'saving': 'Savings', 'savings': 'Savings',
  'debt': 'Debt Payments', 'loan': 'Debt Payments',
  'insurance': 'Insurance',
  'subscription': 'Subscriptions', 'subscriptions': 'Subscriptions',
  'personal': 'Personal Care', 'personal care': 'Personal Care',
  'business': 'Business', 'office': 'Business',
  'income': 'Income', 'salary': 'Income', 'deposit': 'Income',
  'employment income': 'Income',
  'travel': 'Travel',
};

function normalizeCanonicalCategory(cat: string): string {
  if (!cat) return 'Needs Review';
  const lower = cat.toLowerCase().trim();
  return CANONICAL[lower] || cat.charAt(0).toUpperCase() + cat.slice(1);
}

function normalizeVendorKey(raw: string): string {
  return raw.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
}

// ─── Inline rules for common Canadian merchants ────────────────────────────
const RULES: Array<{ contains: string[]; category: string }> = [
  { contains: ['gordon food', 'gordon foods'], category: 'Income' },
  { contains: ['celtic group'], category: 'Debt Payments' },
  { contains: ['b/m payt', 'b/m pay'], category: 'Housing' },
  { contains: ['td loan'], category: 'Debt Payments' },
  { contains: ['capital one'], category: 'Transfers' },
  { contains: ['bmo invinc'], category: 'Transfers' },
  { contains: ['easyfinancial', 'national money', 'lenddirect'], category: 'Debt Payments' },
  { contains: ['ind all saving'], category: 'Savings' },
  { contains: ['mobile cheque deposit', 'cheque deposit'], category: 'Income' },
  { contains: ['starbucks', 'tim horton', 'second cup'], category: 'Food & Dining' },
  { contains: ['uber', 'lyft', 'taxi', 'transit', 'presto'], category: 'Transportation' },
  { contains: ['amazon', 'amzn'], category: 'Shopping' },
  { contains: ['insurance', 'assurance', 'allstate', 'intact'], category: 'Insurance' },
  { contains: ['telus', 'rogers', 'bell ', 'hydro', 'internet', 'fido', 'koodo'], category: 'Utilities' },
  { contains: ['netflix', 'spotify', 'disney', 'apple.com', 'youtube', 'crave'], category: 'Subscriptions' },
  { contains: ['walmart', 'costco', 'no frills', 'freshco', 'loblaws', 'metro ', 'food basics', 'sobeys', 'safeway'], category: 'Groceries' },
  { contains: ['shoppers drug', 'rexall', 'pharma', 'london drugs'], category: 'Healthcare' },
  { contains: ['7-eleven', 'circle k', 'shell ', 'petro', 'esso ', 'pioneer'], category: 'Transportation' },
  { contains: ['interac e-transfer', 'e-transfer'], category: 'Transfers' },
];

function applyInlineRules(merchant: string): string | null {
  const lower = merchant.toLowerCase();
  // Also strip spaces/hyphens so "TIMHORTON" matches "tim horton"
  const lowerCompact = lower.replace(/[\s\-]+/g, '');
  for (const rule of RULES) {
    if (rule.contains.some(k => lower.includes(k) || lowerCompact.includes(k.replace(/[\s\-]+/g, '')))) {
      return normalizeCanonicalCategory(rule.category);
    }
  }
  return null;
}

type DbRule = {
  match_type: string; match_value: string; category: string;
  subcategory?: string | null; min_amount?: number | null; max_amount?: number | null;
};

/**
 * Canonical merchant name normalizer. Strips special chars, store codes,
 * common legal suffixes. Used for both rule matching and merchant_name
 * write-back. UPPERCASE output.
 */
function normalizeMerchant(name: string): string {
  return String(name || '')
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    // Trailing store numbers (3-6 digits)
    .replace(/\s+\d{3,6}$/, '')
    // Common trailing suffixes
    .replace(/\s+(STORE|SHOP|LTD|INC|CORP|CO|LOCATION|BRANCH)$/i, '')
    // Trailing "#123" store numbers
    .replace(/\s+#\s*\d+$/, '')
    .trim();
}

/** First word of a normalized name that is >= 4 characters (skips "THE", "AND" etc). */
function firstSignificantWord(s: string): string {
  const STOP = new Set(['THE', 'AND', 'FOR', 'FROM', 'ON', 'OF']);
  for (const w of s.split(/\s+/)) {
    if (w.length >= 4 && !STOP.has(w)) return w;
  }
  return s.split(/\s+/)[0] || '';
}

/**
 * Fuzzy DB-rule matching.
 * - Normalizes both merchant and pattern.
 * - Exact: compare normalized strings.
 * - Contains: normalized substring OR first-N-words prefix OR
 *   first-significant-word membership.
 * - starts_with: normalized prefix.
 * - regex: raw regex on original merchant.
 * Scoring: when multiple rules match, prefer the most specific (longest
 * matched pattern wins).
 */
function applyDbRules(
  dbRules: DbRule[], merchant: string, amount?: number
): { category: string; subcategory: string | null; rulePattern?: string } | null {
  const lower = merchant.toLowerCase();
  const normMerchant = normalizeMerchant(merchant);

  type Candidate = { rule: DbRule; score: number };
  const candidates: Candidate[] = [];

  for (const amountPass of [true, false]) {
    for (const rule of dbRules) {
      const hasAmountThreshold = rule.min_amount != null || rule.max_amount != null;
      if (amountPass && !hasAmountThreshold) continue;
      if (!amountPass && hasAmountThreshold) continue;
      if (!rule.match_value) continue;

      const val = rule.match_value.toLowerCase();
      const normVal = normalizeMerchant(rule.match_value);
      if (!normVal) continue;

      const ruleWords = normVal.split(/\s+/).filter(Boolean);
      const merchantWords = normMerchant.split(/\s+/).filter(Boolean);
      const headMatch = merchantWords.slice(0, ruleWords.length).join(' ') === normVal;

      let matched = false;
      switch (rule.match_type) {
        case 'exact':
          matched = lower === val || normMerchant === normVal;
          break;
        case 'starts_with':
          matched = lower.startsWith(val) || normMerchant.startsWith(normVal);
          break;
        case 'contains':
          matched =
            lower.includes(val) ||
            normMerchant.includes(normVal) ||
            (ruleWords.length >= 2 && headMatch) ||
            // Fallback: any significant word of the rule appears in the
            // normalized merchant as a whole word.
            (() => {
              const sig = firstSignificantWord(normVal);
              if (sig.length < 5) return false;
              return new RegExp(`\\b${sig}\\b`).test(normMerchant);
            })();
          break;
        case 'regex':
          try { matched = new RegExp(rule.match_value, 'i').test(merchant); } catch { matched = false; }
          break;
      }
      if (!matched) continue;

      if (hasAmountThreshold && amount !== undefined) {
        const absAmt = Math.abs(amount);
        if (rule.min_amount != null && absAmt < rule.min_amount) continue;
        if (rule.max_amount != null && absAmt >= rule.max_amount) continue;
      } else if (hasAmountThreshold) { continue; }

      // Scoring: longer normalized pattern = more specific.
      // +5 bonus for exact, +3 for starts_with, +2 for head match.
      let score = normVal.length;
      if (rule.match_type === 'exact') score += 5;
      else if (rule.match_type === 'starts_with') score += 3;
      else if (rule.match_type === 'contains' && headMatch) score += 2;
      candidates.push({ rule, score });
    }
    if (candidates.length > 0) break; // amount-gated rules win over generic
  }

  if (candidates.length === 0) return null;
  candidates.sort((a, b) => b.score - a.score);
  const best = candidates[0].rule;
  return {
    category: normalizeCanonicalCategory(best.category),
    subcategory: best.subcategory || null,
    rulePattern: normalizeMerchant(best.match_value),
  };
}

// ─── Deduplication helper ──────────────────────────────────────────────────
// Groups by normalized merchant + amount + date. For groups with count > 1,
// keeps the record with the lowest id (first inserted), deletes the rest.
async function deduplicateImport(
  supabase: any, userId: string, importId: string
): Promise<number> {
  // DISABLED 2026-05-21: legacy dedup that ate same-day same-amount rows.
  // The staging_hash unique constraint now prevents accidental duplicates
  // at insert time, so this dedup was only deleting LEGITIMATE rows
  // (e.g., two $1.58 7-Eleven visits on the same day). No-op stub kept
  // so callers compile without changes.
  void supabase; void userId; void importId;
  return 0;
}
// ─── Handler ───────────────────────────────────────────────────────────────
export const handler: Handler = async (event) => {
  console.log('[apply-category-rules] function invoked', {
    method: event.httpMethod,
    hasBody: !!event.body,
  });
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ ok: false, error: 'Method not allowed' }) };
  }

  const auth = await verifyAuth(event);
  if (auth.error || !auth.userId) {
    return { statusCode: 401, headers, body: JSON.stringify({ ok: false, error: auth.error || 'Unauthorized' }) };
  }
  const userId = auth.userId;
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
      global: { headers: { Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}` } },
    }
  );

  const body = (() => {
    try { return JSON.parse(event.body || '{}') as Record<string, unknown>; }
    catch { return {}; }
  })();

  const importId = typeof body.import_id === 'string' ? body.import_id : null;
  const requestedLimit = Number(body.limit);
  const limit = Number.isFinite(requestedLimit) ? Math.max(1, Math.min(1000, Math.floor(requestedLimit))) : 500;

  // Diagnostic logging - visible in Netlify function logs
  const uidPrefix = String(userId).slice(0, 8) + '...';
  console.log('[apply-category-rules] CALLED', { uidPrefix, importId, limit, timestamp: new Date().toISOString() });
  safeLog('info', '[apply-category-rules] Starting', { uidPrefix, importId, limit });

  // ── Step 0: Deduplicate if scoped to an import ──
  let duplicatesRemoved = 0;
  if (importId) {
    duplicatesRemoved = await deduplicateImport(supabase, userId, importId);
  }

  // ── DIAGNOSTIC: Sample any transactions for this user ──
  // Helps determine if the user has ANY transactions visible to the service-role
  // client, regardless of category filter. If this returns 0, the issue is the
  // user_id or table reference. If it returns rows, the issue is the category filter.
  console.log('[apply-category-rules] DEBUG query', {
    userId,
    categoryFilter: ['Other', null, 'Uncategorized', 'Needs Review'],
    table: 'transactions',
  });
  try {
    // Unfiltered count: every transaction this user owns, regardless of category
    const { count: unfilteredCount, error: unfilteredErr } = await supabase
      .from('transactions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId);
    console.log('[apply-category-rules] DEBUG unfiltered count', {
      userId,
      unfilteredCount,
      error: unfilteredErr?.message,
      errorCode: (unfilteredErr as any)?.code,
    });

    const { data: debugData, error: debugError, count: debugCount } = await supabase
      .from('transactions')
      .select('id, merchant_name, category, category_source, import_id', { count: 'exact' })
      .eq('user_id', userId)
      .limit(5);
    console.log('[apply-category-rules] DEBUG sample', {
      error: debugError?.message,
      errorCode: (debugError as any)?.code,
      totalCount: debugCount,
      sampleSize: debugData?.length || 0,
      sample: debugData?.map((t: any) => ({
        id: t.id,
        category: t.category,
        category_source: t.category_source,
        import_id: t.import_id,
        merchant: t.merchant_name,
      })),
    });
  } catch (debugErr: any) {
    console.error('[apply-category-rules] DEBUG query threw', debugErr?.message);
  }

  // ── Step 1: Fetch transactions to process (with retry for commit timing race) ──
  // The frontend calls this after runSmartImportPipeline, but commit-import may
  // still be inserting rows. Retry in both modes:
  //   - importId mode: 5 attempts × 2s = 10s
  //   - cleanup mode:  3 attempts × 3s =  9s
  let txs: any[] = [];
  const maxAttempts = importId ? 5 : 3;
  const delayMs = importId ? 2000 : 3000;

  // JS-side filter - guarantees no .or() syntax issues block matching
  // Also re-process any transaction where category_source='ai' — smart-import-sync
  // auto-assigns AI categories that may be wrong; hardcoded overrides should always win.
  const NEEDS_CATEGORIZATION = new Set(['', 'other', 'uncategorized', 'needs review', 'business income']);
  const needsCategorization = (row: { category?: unknown; category_source?: unknown }): boolean => {
    if (row.category == null) return true;
    if (row.category_source === 'ai') return true; // always let rules override AI-assigned cats
    return NEEDS_CATEGORIZATION.has(String(row.category).trim().toLowerCase());
  };

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    let query = supabase
      .from('transactions')
      .select('id, merchant_name, merchant, amount, description, category, category_source')
      .eq('user_id', userId)
      .order('posted_at', { ascending: false })
      .limit(limit);

    if (importId) {
      query = query.eq('import_id', importId);
    }
    // No category filter - filter in JS below

    const { data: rows, error } = await query;

    if (error) {
      console.error('[apply-category-rules] FETCH ERROR', { uidPrefix, importId, error: error.message, code: (error as any).code, attempt });
      safeLog('error', '[apply-category-rules] Fetch error', { uidPrefix, error: error.message });
      return { statusCode: 500, headers, body: JSON.stringify({ ok: false, error: error.message }) };
    }

    const allRows = rows || [];
    txs = importId ? allRows : allRows.filter(r => needsCategorization(r));
    console.log('[apply-category-rules] FETCHED', { uidPrefix, importId, attempt, fetched: allRows.length, afterFilter: txs.length });

    if (txs.length > 0) break;

    if (attempt < maxAttempts) {
      console.log(`[apply-category-rules] No rows yet - waiting ${delayMs}ms before retry ${attempt + 1}/${maxAttempts}`);
      await new Promise(r => setTimeout(r, delayMs));
    }
  }

  // Fallback: if scoped to importId but found zero rows, drop the import_id
  // filter and run cleanup mode for the whole user (handles duplicate-hash case
  // where commit lands under a different import_id than the one we were given).
  if (txs.length === 0 && importId) {
    console.warn('[apply-category-rules] importId returned 0 rows - falling back to user-wide cleanup', { uidPrefix, importId });
    const { data: fallbackRows, error: fallbackErr } = await supabase
      .from('transactions')
      .select('id, merchant_name, merchant, amount, description, category, category_source')
      .eq('user_id', userId)
      .order('posted_at', { ascending: false })
      .limit(limit);
    if (fallbackErr) {
      console.error('[apply-category-rules] FALLBACK FETCH ERROR', { uidPrefix, error: fallbackErr.message });
    } else {
      const all = fallbackRows || [];
      txs = all.filter(r => needsCategorization(r));
      console.log('[apply-category-rules] FALLBACK FETCHED', { uidPrefix, fetched: all.length, afterFilter: txs.length });
    }
  }

  if (txs.length === 0) {
    console.warn('[apply-category-rules] ZERO ROWS after all retries - commit-import may have failed or importId mismatch', { uidPrefix, importId, attempts: maxAttempts });
    return { statusCode: 200, headers, body: JSON.stringify({ ok: true, updated: 0, total: 0, skipped: 0, duplicatesRemoved, reason: 'no_rows_after_retries', attempts: maxAttempts }) };
  }

  // ── Step 2: Build vendor keys for memory lookup ──
  const vendorKeys = txs.map(tx =>
    normalizeVendorKey(tx.merchant_name || tx.merchant || tx.description || '')
  );
  const uniqueKeys = [...new Set(vendorKeys.filter(Boolean))];

  // ── Step 3: Fetch vendor memory ──
  const memoryMap = new Map<string, string>();
  if (uniqueKeys.length > 0) {
    const { data: memoryRows } = await supabase
      .from('vendor_category_memory')
      .select('vendor_key, category')
      .eq('user_id', userId)
      .in('vendor_key', uniqueKeys);
    for (const row of memoryRows || []) {
      memoryMap.set(row.vendor_key, row.category);
    }
  }

  // ── Step 4: Fetch user-defined DB rules ──
  let dbRules: DbRule[] = [];
  try {
    const { data: ruleRows } = await supabase
      .from('category_rules')
      .select('match_type, match_value, category, subcategory, min_amount, max_amount')
      .eq('user_id', userId)
      .eq('is_active', true);
    const TYPE_PRIORITY: Record<string, number> = { exact: 0, starts_with: 1, contains: 2, regex: 3 };
    dbRules = ((ruleRows || []) as DbRule[]).sort(
      (a, b) => (TYPE_PRIORITY[a.match_type] ?? 9) - (TYPE_PRIORITY[b.match_type] ?? 9)
    );
  } catch { /* table may not exist yet */ }

  safeLog('info', '[apply-category-rules] Loaded', {
    userId, transactions: txs.length, vendorMemory: memoryMap.size, dbRules: dbRules.length,
  });

  // ── Step 5: Apply rules in priority order ──
  // Priority: user corrections -> hardcoded defaults -> merchant map -> default rules -> inline rules
  // User-specific rules (vendor memory, DB rules) always override hardcoded defaults
  // so that explicit user corrections are never silently overwritten.
  const updates: Array<{ id: string; category: string; subcategory?: string | null; source: string; normalizedMerchant?: string | null }> = [];
  let skipped = 0;

  for (let i = 0; i < txs.length; i++) {
    const tx = txs[i];
    const key = vendorKeys[i];
    const merchant = tx.merchant_name || tx.merchant || tx.description || '';
    const txAmount = Number(tx.amount || 0);
    const currentCat = tx.category || '';
    const needsWork = !currentCat || ['Other', 'Uncategorized', 'Needs Review'].includes(currentCat);

    // Priority 0: User vendor memory (learned corrections) — user intent wins
    const memoryCat = key ? memoryMap.get(key) : undefined;
    if (memoryCat) {
      updates.push({ id: tx.id, category: normalizeCanonicalCategory(memoryCat), source: 'learned' });
      continue;
    }

    // Priority 1: User DB rules (Tag-created rules) — user intent wins
    const dbRuleMatch = applyDbRules(dbRules, merchant, txAmount);
    if (dbRuleMatch) {
      updates.push({
        id: tx.id,
        category: normalizeCanonicalCategory(dbRuleMatch.category),
        subcategory: dbRuleMatch.subcategory,
        source: 'tag_rule',
        normalizedMerchant: dbRuleMatch.rulePattern || null,
      });
      continue;
    }

    // Priority 2: Hardcoded overrides — default for merchants with no user-specific rule
    const hardcoded = applyHardcodedOverride(merchant);
    if (hardcoded) {
      updates.push({ id: tx.id, category: hardcoded.category, subcategory: hardcoded.subcategory, source: 'hardcoded' });
      continue;
    }

    if (!needsWork && !importId) { skipped++; continue; }

    // Priority 3: Merchant map
    const mapMatch = matchMerchantMap(merchant);
    if (mapMatch) {
      updates.push({ id: tx.id, category: mapMatch.category, subcategory: mapMatch.subcategory ?? null, source: 'tag_rule' });
      continue;
    }

    // Priority 4: Global default rules (tagDefaultRules.ts)
    const defaultMatch = applyDefaultRules(merchant);
    if (defaultMatch) {
      updates.push({ id: tx.id, category: defaultMatch.category, subcategory: defaultMatch.subcategory ?? null, source: 'tag_rule' });
      continue;
    }

    // Priority 5: Inline rules (legacy, kept for backward compat)
    const ruleCat = applyInlineRules(merchant);
    if (ruleCat) {
      updates.push({ id: tx.id, category: ruleCat, source: 'tag_rule' });
      continue;
    }

    // No match - mark as Needs Review
    if (needsWork) {
      updates.push({ id: tx.id, category: 'Needs Review', source: 'needs_review' });
    } else {
      skipped++;
    }
  }

  // ── Step 5b: Sign/category safety — catch impossible automatic categorizations ──
  // A negative amount auto-categorized as Income is semantically impossible.
  // User corrections (source = 'learned' / 'tag_rule') are NOT overridden.
  const userSources = new Set(['learned', 'tag_rule', 'tag_single']);
  for (const u of updates) {
    if (u.category === 'Income' && !userSources.has(u.source)) {
      const tx = txs.find(t => t.id === u.id);
      const amt = Number(tx?.amount || 0);
      if (amt < 0) {
        safeLog('warn', `[apply-category-rules] Sign/category conflict: negative ${amt} as Income for tx ${u.id} — falling back to Needs Review`);
        u.category = 'Needs Review';
        u.subcategory = null;
        u.source = 'sign_conflict';
      }
    }
  }

  // ── Step 6: Batch update - ONLY category fields, never type/amount/merchant ──
  console.log('[apply-category-rules] PRE-UPDATE', { uidPrefix, importId, txsFetched: txs.length, updatesQueued: updates.length, skipped });

  let updated = 0;
  let updateErrors: string[] = [];
  if (updates.length > 0) {
    const results = await Promise.allSettled(
      updates.map(u => {
        const payload: Record<string, unknown> = {
          category: u.category,
          category_source: u.source,
          updated_at: new Date().toISOString(),
        };
        if (Object.prototype.hasOwnProperty.call(u, 'subcategory')) {
          payload.subcategory = u.subcategory ?? null;
          if (u.subcategory) payload.subcategory_source = u.source;
        }
        // Write back normalized merchant_name only when we matched a user
        // DB rule (source === 'tag_rule' + normalizedMerchant present).
        // This collapses "7-ELEVEN STORE 33535" -> "7 ELEVEN" so future
        // imports hit the same rule.
        if ((u as any).normalizedMerchant && u.source === 'tag_rule') {
          payload.merchant_name = (u as any).normalizedMerchant;
        }
        return supabase
          .from('transactions')
          .update(payload)
          .eq('id', u.id)
          .eq('user_id', userId);
      })
    );
    for (const r of results) {
      if (r.status === 'fulfilled' && !r.value.error) {
        updated++;
      } else if (r.status === 'fulfilled' && r.value.error) {
        updateErrors.push(r.value.error.message);
      } else if (r.status === 'rejected') {
        updateErrors.push(String(r.reason));
      }
    }
  }

  console.log('[apply-category-rules] DONE', { uidPrefix, importId, txsFetched: txs.length, updated, skipped, duplicatesRemoved, errorCount: updateErrors.length });
  safeLog('info', `[apply-category-rules] Done: ${updated}/${txs.length} updated, ${skipped} skipped, ${duplicatesRemoved} dupes removed`, { uidPrefix, importId });

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ ok: true, updated, total: txs.length, skipped, duplicatesRemoved }),
  };
};
