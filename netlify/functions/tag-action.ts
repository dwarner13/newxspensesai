/**
 * tag-action - Natural language category change handler for Tag chat.
 *
 * Intents:
 *   preview                  -> find matching transactions, return count + samples (no writes)
 *   commit                   -> update transactions + create rule + write vendor memory
 *   save_rule                -> upsert a category rule + backfill existing transactions
 *   undo                     -> revert categories on specific IDs
 *   bulk_apply               -> apply multiple category groups (background sweep)
 *   fix_type                 -> flip income/expense on a single transaction
 *   fix_type_bulk            -> flip income/expense on many transactions by merchant or category
 *   bulk_normalize_subcategory -> sweep transactions and assign canonical subcategories by merchant keyword
 */

import type { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import { verifyAuth } from './_shared/verifyAuth.js';
import { safeLog } from './_shared/safeLog.js';

const CORS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
};

function ok(body: object, status = 200) {
  return { statusCode: status, headers: CORS, body: JSON.stringify(body) };
}
function err(message: string, status = 400) {
  return { statusCode: status, headers: CORS, body: JSON.stringify({ ok: false, error: message }) };
}

function parseCategoryInput(raw: string): { category: string; subcategory: string | null } {
  const value = String(raw || '').trim();
  if (!value) return { category: 'Other', subcategory: null };
  const separators = ['>', '::', '/'];
  for (const separator of separators) {
    const idx = value.indexOf(separator);
    if (idx !== -1) {
      const category = value.slice(0, idx).trim() || 'Other';
      const subcategory = value.slice(idx + separator.length).trim() || null;
      return { category, subcategory };
    }
  }
  return { category: value, subcategory: null };
}

function encodeRuleCategory(category: string, subcategory: string | null): string {
  const main = String(category || '').trim();
  const sub = String(subcategory || '').trim();
  return sub ? `${main}::${sub}` : main;
}

const CANONICAL_CATEGORIES = [
  'Income',
  'Groceries',
  'Food & Dining',
  'Transportation',
  'Housing',
  'Utilities',
  'Shopping',
  'Subscriptions',
  'Entertainment',
  'Healthcare',
  'Insurance',
  'Education',
  'Travel',
  'Transfers',
  'Bank Fees',
  'Business',
  'Personal Care',
  'Home & Garden',
  'Rent or Lease',
  'Debt Payments',
  'Advertising',
  'Technology',
  'Other',
  'Uncategorized',
] as const;

const CATEGORY_ALIASES: Record<string, string> = {
  dining: 'Food & Dining',
  'food and dining': 'Food & Dining',
  health: 'Healthcare',
  fees: 'Bank Fees',
  'cash & atm': 'Transfers',
  'health & fitness': 'Personal Care',
  vehicle: 'Transportation',
  automotive: 'Transportation',
  rent: 'Rent or Lease',
  mortgage: 'Rent or Lease',
  software: 'Subscriptions',
};

function normalizeCategoryKey(input: string): string {
  return String(input || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}
function normalizeCanonicalCategory(input: string): string {
  const key = normalizeCategoryKey(input);
  if (!key) return 'Other';
  const direct = CANONICAL_CATEGORIES.find((c) => normalizeCategoryKey(c) === key);
  if (direct) return direct;
  return CATEGORY_ALIASES[key] || 'Other';
}

/* ── Merchant keyword → canonical subcategory rules ──────────────────────────
   Used by bulk_normalize_subcategory to sweep transactions and fill in
   missing subcategory values without Tag needing to touch each one manually.
   Rules are checked in order — first match wins.                              */

interface SubcategoryRule {
  keyword: string;    // lowercase, matched against merchant (case-insensitive contains)
  category: string;   // expected DB category (used to scope rule to right section)
  subcategory: string;
}

const MERCHANT_SUBCATEGORY_RULES: SubcategoryRule[] = [
  // ── Transportation / Vehicle ─────────────────────────────────────────────
  { keyword: 'petro', category: 'Transportation', subcategory: 'Gas & Fuel' },
  { keyword: 'esso', category: 'Transportation', subcategory: 'Gas & Fuel' },
  { keyword: 'shell', category: 'Transportation', subcategory: 'Gas & Fuel' },
  { keyword: 'husky', category: 'Transportation', subcategory: 'Gas & Fuel' },
  { keyword: 'pioneer', category: 'Transportation', subcategory: 'Gas & Fuel' },
  { keyword: 'mobil', category: 'Transportation', subcategory: 'Gas & Fuel' },
  { keyword: 'ultramar', category: 'Transportation', subcategory: 'Gas & Fuel' },
  { keyword: 'co-op gas', category: 'Transportation', subcategory: 'Gas & Fuel' },
  { keyword: 'fuel', category: 'Transportation', subcategory: 'Gas & Fuel' },
  { keyword: 'impark', category: 'Transportation', subcategory: 'Parking' },
  { keyword: 'parkade', category: 'Transportation', subcategory: 'Parking' },
  { keyword: 'parking', category: 'Transportation', subcategory: 'Parking' },
  { keyword: 'honk', category: 'Transportation', subcategory: 'Parking' },
  { keyword: 'car wash', category: 'Transportation', subcategory: 'Car Wash' },
  { keyword: 'autowash', category: 'Transportation', subcategory: 'Car Wash' },
  { keyword: 'sparkle', category: 'Transportation', subcategory: 'Car Wash' },
  { keyword: 'mr lube', category: 'Transportation', subcategory: 'Vehicle Maintenance' },
  { keyword: 'jiffy lube', category: 'Transportation', subcategory: 'Vehicle Maintenance' },
  { keyword: 'midas', category: 'Transportation', subcategory: 'Vehicle Maintenance' },
  { keyword: 'oil change', category: 'Transportation', subcategory: 'Vehicle Maintenance' },
  { keyword: 'canadian tire auto', category: 'Transportation', subcategory: 'Vehicle Maintenance' },
  { keyword: 'napa auto', category: 'Transportation', subcategory: 'Vehicle Maintenance' },
  { keyword: 'northtown registry', category: 'Transportation', subcategory: 'Vehicle Registration' },
  { keyword: 'registry', category: 'Transportation', subcategory: 'Vehicle Registration' },
  { keyword: 'td loan', category: 'Transportation', subcategory: 'Car Loan' },
  { keyword: 'lns/pre', category: 'Transportation', subcategory: 'Car Loan' },

  // ── Food & Dining ────────────────────────────────────────────────────────
  { keyword: 'tim hortons', category: 'Food & Dining', subcategory: 'Coffee' },
  { keyword: 'starbucks', category: 'Food & Dining', subcategory: 'Coffee' },
  { keyword: 'booster juice', category: 'Food & Dining', subcategory: 'Coffee' },
  { keyword: 'second cup', category: 'Food & Dining', subcategory: 'Coffee' },
  { keyword: 'good earth', category: 'Food & Dining', subcategory: 'Coffee' },
  { keyword: 'dutch bros', category: 'Food & Dining', subcategory: 'Coffee' },
  { keyword: 'uber eats', category: 'Food & Dining', subcategory: 'Food Delivery' },
  { keyword: 'doordash', category: 'Food & Dining', subcategory: 'Food Delivery' },
  { keyword: 'skip the dishes', category: 'Food & Dining', subcategory: 'Food Delivery' },
  { keyword: 'fantuan', category: 'Food & Dining', subcategory: 'Food Delivery' },
  { keyword: 'mcdonalds', category: 'Food & Dining', subcategory: 'Fast Food' },
  { keyword: 'wendys', category: 'Food & Dining', subcategory: 'Fast Food' },
  { keyword: 'a&w', category: 'Food & Dining', subcategory: 'Fast Food' },
  { keyword: 'subway', category: 'Food & Dining', subcategory: 'Fast Food' },
  { keyword: 'kfc', category: 'Food & Dining', subcategory: 'Fast Food' },
  { keyword: 'popeyes', category: 'Food & Dining', subcategory: 'Fast Food' },
  { keyword: 'mr sub', category: 'Food & Dining', subcategory: 'Fast Food' },
  { keyword: 'five guys', category: 'Food & Dining', subcategory: 'Fast Food' },
  { keyword: 'chipotle', category: 'Food & Dining', subcategory: 'Fast Food' },
  { keyword: 'boston pizza', category: 'Food & Dining', subcategory: 'Restaurants' },
  { keyword: 'earls', category: 'Food & Dining', subcategory: 'Restaurants' },
  { keyword: 'cactus', category: 'Food & Dining', subcategory: 'Restaurants' },
  { keyword: 'moxies', category: 'Food & Dining', subcategory: 'Restaurants' },
  { keyword: 'original joe', category: 'Food & Dining', subcategory: 'Restaurants' },
  { keyword: 'joey', category: 'Food & Dining', subcategory: 'Restaurants' },
  { keyword: 'smittys', category: 'Food & Dining', subcategory: 'Restaurants' },
  { keyword: 'montanas', category: 'Food & Dining', subcategory: 'Restaurants' },
  { keyword: 'halong bay', category: 'Food & Dining', subcategory: 'Restaurants' },
  { keyword: 'sushi', category: 'Food & Dining', subcategory: 'Restaurants' },
  { keyword: 'thai', category: 'Food & Dining', subcategory: 'Restaurants' },
  { keyword: 'liquor', category: 'Food & Dining', subcategory: 'Alcohol' },
  { keyword: 'econo liquor', category: 'Food & Dining', subcategory: 'Alcohol' },
  { keyword: 'wine and beyond', category: 'Food & Dining', subcategory: 'Alcohol' },
  { keyword: 'alcanna', category: 'Food & Dining', subcategory: 'Alcohol' },
  { keyword: 'ls supplement', category: 'Food & Dining', subcategory: 'Supplements' },
  { keyword: 'popeye supplement', category: 'Food & Dining', subcategory: 'Supplements' },
  { keyword: 'gnc', category: 'Food & Dining', subcategory: 'Supplements' },

  // ── Groceries ────────────────────────────────────────────────────────────
  { keyword: 'sobeys', category: 'Groceries', subcategory: 'Grocery Store' },
  { keyword: 'safeway', category: 'Groceries', subcategory: 'Grocery Store' },
  { keyword: 'superstore', category: 'Groceries', subcategory: 'Grocery Store' },
  { keyword: 'walmart', category: 'Groceries', subcategory: 'Grocery Store' },
  { keyword: 'costco', category: 'Groceries', subcategory: 'Grocery Store' },
  { keyword: 'save on', category: 'Groceries', subcategory: 'Grocery Store' },
  { keyword: 'freshco', category: 'Groceries', subcategory: 'Grocery Store' },
  { keyword: 'no frills', category: 'Groceries', subcategory: 'Grocery Store' },
  { keyword: 'loblaws', category: 'Groceries', subcategory: 'Grocery Store' },
  { keyword: 'metro', category: 'Groceries', subcategory: 'Grocery Store' },
  { keyword: 't&t', category: 'Groceries', subcategory: 'Grocery Store' },

  // ── Subscriptions / Software ─────────────────────────────────────────────
  { keyword: 'openai', category: 'Subscriptions', subcategory: 'Software Subscriptions' },
  { keyword: 'anthropic', category: 'Subscriptions', subcategory: 'Software Subscriptions' },
  { keyword: 'cursor', category: 'Subscriptions', subcategory: 'Software Subscriptions' },
  { keyword: 'adobe', category: 'Subscriptions', subcategory: 'Software Subscriptions' },
  { keyword: 'microsoft', category: 'Subscriptions', subcategory: 'Software Subscriptions' },
  { keyword: 'canva', category: 'Subscriptions', subcategory: 'Software Subscriptions' },
  { keyword: 'zoom', category: 'Subscriptions', subcategory: 'Software Subscriptions' },
  { keyword: 'notion', category: 'Subscriptions', subcategory: 'Software Subscriptions' },
  { keyword: 'dropbox', category: 'Subscriptions', subcategory: 'Software Subscriptions' },
  { keyword: 'chatgpt', category: 'Subscriptions', subcategory: 'Software Subscriptions' },
  { keyword: 'github', category: 'Subscriptions', subcategory: 'Software Subscriptions' },
  { keyword: 'figma', category: 'Subscriptions', subcategory: 'Software Subscriptions' },
  { keyword: 'grammarly', category: 'Subscriptions', subcategory: 'Software Subscriptions' },
  { keyword: 'hubspot', category: 'Subscriptions', subcategory: 'Software Subscriptions' },
  { keyword: 'everlance', category: 'Subscriptions', subcategory: 'Software Subscriptions' },
  { keyword: 'ranked ai', category: 'Subscriptions', subcategory: 'Software Subscriptions' },
  { keyword: 'dreamhost', category: 'Subscriptions', subcategory: 'Advertising / Marketing' },
  { keyword: 'google ads', category: 'Subscriptions', subcategory: 'Advertising / Marketing' },
  { keyword: 'facebook ads', category: 'Subscriptions', subcategory: 'Advertising / Marketing' },
  { keyword: 'mailchimp', category: 'Subscriptions', subcategory: 'Advertising / Marketing' },

  // ── Entertainment ────────────────────────────────────────────────────────
  { keyword: 'netflix', category: 'Entertainment', subcategory: 'Streaming' },
  { keyword: 'spotify', category: 'Entertainment', subcategory: 'Streaming' },
  { keyword: 'youtube', category: 'Entertainment', subcategory: 'Streaming' },
  { keyword: 'cineplex', category: 'Entertainment', subcategory: 'Movies' },
  { keyword: 'landmark', category: 'Entertainment', subcategory: 'Movies' },

  // ── Bank Fees ─────────────────────────────────────────────────────────────
  { keyword: 'premium plan', category: 'Bank Fees', subcategory: 'Monthly Fee' },
  { keyword: 'handling chg', category: 'Bank Fees', subcategory: 'Service Charge' },
  { keyword: 'interest charge', category: 'Bank Fees', subcategory: 'Interest' },
  { keyword: 'service charge', category: 'Bank Fees', subcategory: 'Service Charge' },
  { keyword: 'nsf', category: 'Bank Fees', subcategory: 'NSF Fee' },
  { keyword: 'overdraft', category: 'Bank Fees', subcategory: 'Overdraft Fee' },

  // ── Utilities ─────────────────────────────────────────────────────────────
  { keyword: 'epcor', category: 'Utilities', subcategory: 'Electricity' },
  { keyword: 'enmax', category: 'Utilities', subcategory: 'Electricity' },
  { keyword: 'hydro', category: 'Utilities', subcategory: 'Electricity' },
  { keyword: 'atco', category: 'Utilities', subcategory: 'Natural Gas' },
  { keyword: 'direct energy', category: 'Utilities', subcategory: 'Natural Gas' },
  { keyword: 'fortis', category: 'Utilities', subcategory: 'Natural Gas' },
  { keyword: 'telus', category: 'Utilities', subcategory: 'Internet' },
  { keyword: 'shaw', category: 'Utilities', subcategory: 'Internet' },
  { keyword: 'rogers', category: 'Utilities', subcategory: 'Internet' },
  { keyword: 'bell', category: 'Utilities', subcategory: 'Internet' },
  { keyword: 'fido', category: 'Utilities', subcategory: 'Internet' },
  { keyword: 'koodo', category: 'Utilities', subcategory: 'Internet' },

  // ── Transfers ─────────────────────────────────────────────────────────────
  { keyword: 'interac etrnsfr', category: 'Transfers', subcategory: 'E-Transfer' },
  { keyword: 'e-transfer', category: 'Transfers', subcategory: 'E-Transfer' },
  { keyword: 'etransfer', category: 'Transfers', subcategory: 'E-Transfer' },

  // ── Personal Care ─────────────────────────────────────────────────────────
  { keyword: 'shadified', category: 'Personal Care', subcategory: 'Grooming' },
  { keyword: 'salon', category: 'Personal Care', subcategory: 'Grooming' },
  { keyword: 'barber', category: 'Personal Care', subcategory: 'Grooming' },
  { keyword: 'great clips', category: 'Personal Care', subcategory: 'Grooming' },
  { keyword: 'sport clips', category: 'Personal Care', subcategory: 'Grooming' },
  { keyword: 'chatters', category: 'Personal Care', subcategory: 'Grooming' },
  { keyword: 'massage', category: 'Personal Care', subcategory: 'Wellness' },
  { keyword: 'spa', category: 'Personal Care', subcategory: 'Wellness' },
  { keyword: 'ting ting', category: 'Personal Care', subcategory: 'Wellness' },
  { keyword: 'yo yo', category: 'Personal Care', subcategory: 'Wellness' },
  { keyword: 'tulip garden', category: 'Personal Care', subcategory: 'Wellness' },
  { keyword: 'songblossom', category: 'Personal Care', subcategory: 'Wellness' },
  { keyword: 'lewis massage', category: 'Personal Care', subcategory: 'Wellness' },

  // ── Debt Payments ─────────────────────────────────────────────────────────
  { keyword: 'easyfinancial', category: 'Debt Payments', subcategory: 'Loan Payment' },
  { keyword: 'cash money', category: 'Debt Payments', subcategory: 'Loan Payment' },
  { keyword: 'springfinancial', category: 'Debt Payments', subcategory: 'Loan Payment' },
  { keyword: 'national money', category: 'Debt Payments', subcategory: 'Loan Payment' },
  { keyword: 'borrowell', category: 'Debt Payments', subcategory: 'Loan Payment' },
  { keyword: 'flexiti', category: 'Debt Payments', subcategory: 'Credit Card Payment' },
  { keyword: 'capital one', category: 'Debt Payments', subcategory: 'Credit Card Payment' },

  // ── Shopping ──────────────────────────────────────────────────────────────
  { keyword: 'winners', category: 'Shopping', subcategory: 'Clothing & Home' },
  { keyword: 'marshalls', category: 'Shopping', subcategory: 'Clothing & Home' },
  { keyword: 'homesense', category: 'Shopping', subcategory: 'Home Goods' },
  { keyword: 'dollar tree', category: 'Shopping', subcategory: 'General Merchandise' },
  { keyword: 'shoppers drug mart', category: 'Shopping', subcategory: 'Pharmacy' },
  { keyword: 'amazon', category: 'Shopping', subcategory: 'Online Shopping' },
  { keyword: 'best buy', category: 'Shopping', subcategory: 'Electronics' },

  // ── Healthcare ────────────────────────────────────────────────────────────
  { keyword: 'rexall', category: 'Healthcare', subcategory: 'Pharmacy' },
  { keyword: 'london drugs', category: 'Healthcare', subcategory: 'Pharmacy' },
  { keyword: 'shoppers', category: 'Healthcare', subcategory: 'Pharmacy' },
  { keyword: 'dental', category: 'Healthcare', subcategory: 'Dental' },
  { keyword: 'dentist', category: 'Healthcare', subcategory: 'Dental' },
  { keyword: 'optometrist', category: 'Healthcare', subcategory: 'Vision' },
  { keyword: 'physio', category: 'Healthcare', subcategory: 'Physiotherapy' },
  { keyword: 'chiro', category: 'Healthcare', subcategory: 'Chiropractic' },
  { keyword: 'medicentre', category: 'Healthcare', subcategory: 'Medical' },
  { keyword: 'clinic', category: 'Healthcare', subcategory: 'Medical' },

  // ── Professional fees (Subscriptions / Business) ──────────────────────────
  { keyword: 'ncube', category: 'Subscriptions', subcategory: 'Professional Fees' },
  { keyword: '2nd site', category: 'Subscriptions', subcategory: 'Professional Fees' },
  { keyword: 'imperial pfs', category: 'Subscriptions', subcategory: 'Business Insurance' },

  // ── Income subcategories ──────────────────────────────────────────────────
  { keyword: 'rownmi', category: 'Income', subcategory: 'Business Revenue' },
  { keyword: 'payroll', category: 'Income', subcategory: 'Salary / Payroll' },
  { keyword: 'deposit', category: 'Income', subcategory: 'Deposit' },
  { keyword: 'etrnsfr rcvd', category: 'Income', subcategory: 'E-Transfer Received' },
];

/**
 * Resolve subcategory for a transaction using MERCHANT_SUBCATEGORY_RULES.
 * Optionally scoped to a specific category.
 * Returns null if no rule matches.
 */
function resolveSubcategory(
  merchantRaw: string,
  categoryRaw: string,
  scopeToCategory?: string,
): string | null {
  const merchant = (merchantRaw || '').toLowerCase();
  const category = (categoryRaw || '').toLowerCase();

  for (const rule of MERCHANT_SUBCATEGORY_RULES) {
    // If caller wants to scope by category, only apply rules for that category
    if (scopeToCategory && rule.category.toLowerCase() !== scopeToCategory.toLowerCase()) continue;
    if (merchant.includes(rule.keyword.toLowerCase())) {
      return rule.subcategory;
    }
  }
  return null;
}

// ── Intent classifier ──────────────────────────────────────────────────────
export function classifyTagIntent(message: string): {
  matchValue: string;
  targetCategory: string;
  matchType: 'contains' | 'exact';
} | null {
  const text = message.toLowerCase().trim();

  const actionVerbs = /\b(move|change|set|mark|categorize|recategorize|put|tag|assign|update)\b/i;
  if (!actionVerbs.test(text)) return null;

  const toPattern = /(?:move|change|set|mark|categorize|recategorize|put|tag|assign|update)\s+(?:all\s+)?["']?([^"']+?)["']?\s+(?:to|as)\s+["']?([^"'.,!?]+)["']?/i;
  const match = text.match(toPattern);
  if (!match) return null;

  const matchValue = match[1].trim();
  const targetCategory = match[2].trim();

  if (!matchValue || !targetCategory) return null;

  const isQuoted = /["']/.test(message.slice(message.toLowerCase().indexOf(matchValue) - 1, message.toLowerCase().indexOf(matchValue)));

  return {
    matchValue,
    targetCategory: targetCategory.charAt(0).toUpperCase() + targetCategory.slice(1),
    matchType: isQuoted ? 'exact' : 'contains',
  };
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS, body: '' };
  }
  if (event.httpMethod !== 'POST') return err('Method not allowed', 405);

  const auth = await verifyAuth(event);
  if (!auth.userId) return err('Unauthorized', 401);
  const userId = auth.userId;
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
      global: { headers: { Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}` } },
    }
  );

  const body = JSON.parse(event.body || '{}');
  const { intent, matchValue, targetCategory, matchType = 'contains', importId } = body;

  if (!intent) return err('Missing intent (preview | commit | save_rule | undo | bulk_apply | fix_type | fix_type_bulk | bulk_normalize_subcategory)');

  // ── BULK_APPLY ─────────────────────────────────────────────────────────────
  if (intent === 'bulk_apply') {
    const { groups } = body;
    if (!Array.isArray(groups)) return err('Missing groups array');
    let total = 0;
    for (const group of groups) {
      if (!Array.isArray(group.ids) || !group.category) continue;
      const updatePayload: Record<string, any> = { category: group.category, category_source: 'tag_rule', updated_at: new Date().toISOString() };
      if (group.subcategory) { updatePayload.subcategory = group.subcategory; updatePayload.subcategory_source = 'tag_rule'; }
      await supabase
        .from('transactions')
        .update(updatePayload)
        .in('id', group.ids)
        .eq('user_id', userId);
      total += group.ids.length;
    }
    return ok({ ok: true, intent: 'bulk_apply', applied: total });
  }

  // ── UNDO ────────────────────────────────────────────────────────────────────
  if (intent === 'undo') {
    const { affectedIds, previousCategory } = body;
    if (!Array.isArray(affectedIds) || !previousCategory) return err('Missing affectedIds or previousCategory');
    try {
      const { error } = await supabase
        .from('transactions')
        .update({ category: previousCategory, category_source: 'user_undo', updated_at: new Date().toISOString() })
        .in('id', affectedIds)
        .eq('user_id', userId);
      if (error) return err(error.message, 500);
      return ok({ ok: true, intent: 'undo', reverted: affectedIds.length });
    } catch (e: any) { return err(e.message, 500); }
  }

  // ── FIX_TYPE (single transaction) ─────────────────────────────────────────
  if (intent === 'fix_type') {
    const { transactionId, newType } = body;
    if (!transactionId) return err('Missing transactionId');
    if (!['income', 'expense'].includes(newType)) return err('newType must be "income" or "expense"');
    try {
      const { data: current } = await supabase
        .from('transactions')
        .select('type, merchant_name, amount, category')
        .eq('id', transactionId)
        .eq('user_id', userId)
        .single();

      const oldType = (current?.type || 'expense').toLowerCase();

      const updatePayload: Record<string, any> = {
        type: newType,
        updated_at: new Date().toISOString(),
      };
      if (newType === 'income') {
        updatePayload.category = 'Income';
        updatePayload.category_source = 'user_type_fix';
      }
      const { error } = await supabase
        .from('transactions')
        .update(updatePayload)
        .eq('id', transactionId)
        .eq('user_id', userId);
      if (error) return err(error.message, 500);

      await supabase.from('tag_activity_log').insert({
        user_id: userId,
        action_type: 'type_fix',
        merchant_name: current?.merchant_name || null,
        transaction_id: transactionId,
        old_value: oldType,
        new_value: newType,
        note: `Type changed: ${oldType} → ${newType}${newType === 'income' ? ' (category set to Income)' : ''}`,
        created_at: new Date().toISOString(),
      }).catch(() => {});

      safeLog('tag-action.fix_type', { userId, transactionId, oldType, newType });
      return ok({ ok: true, intent: 'fix_type', transactionId, oldType, newType });
    } catch (e: any) {
      return err(e.message, 500);
    }
  }

  // ── FIX_TYPE_BULK ──────────────────────────────────────────────────────────
  if (intent === 'fix_type_bulk') {
    const { newType, filterCategory, previewOnly = false } = body;
    if (!['income', 'expense'].includes(newType)) return err('newType must be "income" or "expense"');
    if (!matchValue && !filterCategory) return err('Provide matchValue (merchant keyword) or filterCategory');

    try {
      let query = supabase
        .from('transactions')
        .select('id, merchant, merchant_name, amount, date, type, category')
        .eq('user_id', userId)
        .neq('type', newType);

      if (filterCategory) {
        query = query.eq('category', filterCategory);
      }

      const { data, error } = await query;
      if (error) return err(error.message, 500);

      let rows = (data || []) as any[];

      if (matchValue) {
        const normalized = matchValue.trim().toUpperCase();
        rows = rows.filter((tx) => {
          const haystack = (tx.merchant || tx.merchant_name || '').toUpperCase();
          return matchType === 'exact' ? haystack === normalized : haystack.includes(normalized);
        });
      }

      const samples = rows.slice(0, 5).map((tx) => ({
        id: tx.id,
        merchant: tx.merchant || tx.merchant_name,
        amount: tx.amount,
        date: tx.date,
        current_type: tx.type,
        current_category: tx.category,
      }));

      if (previewOnly || rows.length === 0) {
        return ok({
          ok: true, intent: 'fix_type_bulk', previewOnly: true,
          matchCount: rows.length, newType, samples,
          affectedIds: rows.map((tx) => tx.id),
        });
      }

      const affectedIds = rows.map((tx) => tx.id);
      const updatePayload: Record<string, any> = {
        type: newType, category_source: 'user_type_fix', updated_at: new Date().toISOString(),
      };
      if (newType === 'income') { updatePayload.category = 'Income'; }

      const { error: updateErr } = await supabase
        .from('transactions')
        .update(updatePayload)
        .in('id', affectedIds)
        .eq('user_id', userId);
      if (updateErr) return err(updateErr.message, 500);

      await supabase.from('tag_activity_log').insert({
        user_id: userId, action_type: 'fix_type_bulk',
        merchant_name: matchValue || filterCategory || null,
        old_value: matchValue || filterCategory || 'mixed', new_value: newType,
        note: `Bulk type fix → ${newType}: ${affectedIds.length} transactions${filterCategory ? ` in category "${filterCategory}"` : ''}${matchValue ? ` matching "${matchValue}"` : ''}`,
        created_at: new Date().toISOString(),
      }).catch(() => {});

      safeLog('tag-action.fix_type_bulk', { userId, newType, matchValue, filterCategory, count: affectedIds.length });

      return ok({
        ok: true, intent: 'fix_type_bulk', newType,
        matchValue: matchValue || null, filterCategory: filterCategory || null,
        updatedCount: affectedIds.length, samples,
      });
    } catch (e: any) {
      return err(e.message, 500);
    }
  }

  // ── BULK_NORMALIZE_SUBCATEGORY ─────────────────────────────────────────────
  if (intent === 'bulk_normalize_subcategory') {
    const { filterCategory, overwrite = false, previewOnly = false, limit = 2000 } = body;

    try {
      let query = supabase
        .from('transactions')
        .select('id, merchant, merchant_name, category, subcategory')
        .eq('user_id', userId)
        .eq('type', 'expense')
        .limit(limit);

      if (filterCategory) { query = query.eq('category', filterCategory); }
      if (!overwrite) { query = query.or('subcategory.is.null,subcategory.eq.'); }

      const { data, error } = await query;
      if (error) return err(error.message, 500);

      const rows = (data || []) as any[];
      const updates: Array<{ id: string; subcategory: string; category: string }> = [];
      const breakdown: Record<string, number> = {};
      let skipped = 0;

      for (const tx of rows) {
        const merchant = tx.merchant || tx.merchant_name || '';
        const category = tx.category || '';
        const resolved = resolveSubcategory(merchant, category, filterCategory);
        if (resolved) {
          updates.push({ id: tx.id, subcategory: resolved, category });
          breakdown[resolved] = (breakdown[resolved] || 0) + 1;
        } else { skipped++; }
      }

      if (previewOnly || updates.length === 0) {
        return ok({
          ok: true, intent: 'bulk_normalize_subcategory', previewOnly: true,
          wouldNormalize: updates.length, wouldSkip: skipped, breakdown,
          filterCategory: filterCategory || 'all', overwrite,
        });
      }

      const CHUNK = 100;
      let written = 0;
      for (let i = 0; i < updates.length; i += CHUNK) {
        const chunk = updates.slice(i, i + CHUNK);
        const bySub = new Map<string, string[]>();
        for (const u of chunk) {
          if (!bySub.has(u.subcategory)) bySub.set(u.subcategory, []);
          bySub.get(u.subcategory)!.push(u.id);
        }
        for (const [sub, subIds] of bySub) {
          await supabase
            .from('transactions')
            .update({ subcategory: sub, subcategory_source: 'tag_bulk_normalize', updated_at: new Date().toISOString() })
            .in('id', subIds)
            .eq('user_id', userId);
          written += subIds.length;
        }
      }

      await supabase.from('tag_activity_log').insert({
        user_id: userId, action_type: 'bulk_normalize_subcategory', merchant_name: null,
        old_value: filterCategory || 'all categories',
        new_value: `${written} subcategories assigned`,
        note: `Bulk subcategory normalization: ${written} updated, ${skipped} skipped${filterCategory ? ` (scoped to "${filterCategory}")` : ''}`,
        created_at: new Date().toISOString(),
      }).catch(() => {});

      safeLog('tag-action.bulk_normalize_subcategory', { userId, filterCategory, written, skipped, overwrite });

      return ok({
        ok: true, intent: 'bulk_normalize_subcategory',
        filterCategory: filterCategory || 'all', normalized: written, skipped, breakdown, overwrite,
      });
    } catch (e: any) {
      return err(e.message, 500);
    }
  }

  // ── Remaining intents require matchValue + targetCategory ─────────────────
  if (!matchValue || !targetCategory) return err('Missing matchValue or targetCategory');
  const parsedTargetRaw = parseCategoryInput(String(targetCategory));
  const parsedTarget = {
    category: normalizeCanonicalCategory(parsedTargetRaw.category),
    subcategory: parsedTargetRaw.subcategory,
  };

  const normalized = matchValue.trim().toUpperCase();

  // ── PREVIEW ────────────────────────────────────────────────────────────────
  if (intent === 'preview') {
    try {
      let query = supabase
        .from('transactions')
        .select('id, merchant_name, amount, posted_at, category')
        .eq('user_id', userId)
        .order('posted_at', { ascending: false })
        .limit(500);

      if (importId) query = query.eq('import_id', importId);

      const { data, error } = await query;
      if (error) return err(error.message, 500);

      const rows = (data || []) as any[];
      const matching = rows.filter((tx) => {
        const haystack = (tx.merchant_name || '').toUpperCase();
        return matchType === 'exact' ? haystack === normalized : haystack.includes(normalized);
      });

      const samples = matching.slice(0, 5).map((tx) => ({
        id: tx.id, merchant_name: tx.merchant_name, amount: tx.amount,
        posted_at: tx.posted_at, current_category: tx.category || 'Uncategorized',
      }));

      return ok({
        ok: true, intent: 'preview', matchValue: normalized,
        targetCategory: parsedTarget.category, targetSubcategory: parsedTarget.subcategory,
        matchType, matchCount: matching.length, samples,
        affectedIds: matching.map((tx) => tx.id),
      });
    } catch (e: any) {
      return err(e.message, 500);
    }
  }

  // ── COMMIT ─────────────────────────────────────────────────────────────────
  if (intent === 'commit') {
    const { affectedIds } = body;
    if (!Array.isArray(affectedIds) || affectedIds.length === 0) {
      return err('Missing affectedIds for commit');
    }

    try {
      const { error: txError } = await supabase
        .from('transactions')
        .update({
          category: parsedTarget.category, subcategory: parsedTarget.subcategory,
          category_source: 'tag_chat', updated_at: new Date().toISOString(),
        })
        .in('id', affectedIds)
        .eq('user_id', userId);
      if (txError) return err(txError.message, 500);

      const { error: crError } = await supabase.from('category_rules').upsert(
        {
          user_id: userId, match_type: matchType, merchant_pattern: normalized, match_value: normalized,
          category: encodeRuleCategory(parsedTarget.category, parsedTarget.subcategory),
          is_active: true, updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,merchant_pattern,min_amount,max_amount' }
      );
      if (crError) {
        console.error('[tag-action.commit] category_rules upsert failed:', crError.message);
      }

      // vendor_category_memory only has: id, user_id, vendor_key, category,
      // subcategory, created_at, updated_at. Earlier versions wrote source /
      // confidence / times_confirmed which silently errored out. Keep the
      // upsert to what the schema actually supports and surface any error.
      const { error: vcmError } = await supabase.from('vendor_category_memory').upsert(
        {
          user_id: userId, vendor_key: normalized.toLowerCase(),
          category: parsedTarget.category, subcategory: parsedTarget.subcategory,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,vendor_key' }
      );
      if (vcmError) {
        console.error('[tag-action.commit] vendor_category_memory upsert failed:', vcmError.message);
      }

      safeLog('tag-action.commit', {
        userId, matchValue: normalized, targetCategory: parsedTarget.category,
        targetSubcategory: parsedTarget.subcategory, matchType, updatedCount: affectedIds.length,
      });

      return ok({
        ok: true, intent: 'commit', matchValue: normalized,
        targetCategory: parsedTarget.category, targetSubcategory: parsedTarget.subcategory,
        matchType, updatedCount: affectedIds.length,
      });
    } catch (e: any) {
      return err(e.message, 500);
    }
  }

  // ── SAVE_RULE ──────────────────────────────────────────────────────────────
  if (intent === 'save_rule') {
    try {
      const ruleSubcategory = body.targetSubcategory ?? body.subcategory ?? parsedTarget.subcategory ?? null;
      const ruleAmountMin = body.amount_min ?? null;
      const ruleAmountMax = body.amount_max ?? null;

      const { error: ruleErr } = await supabase.from('category_rules').upsert(
        {
          user_id: userId, match_type: matchType, merchant_pattern: normalized, match_value: normalized,
          category: parsedTarget.category, subcategory: ruleSubcategory,
          ...(ruleAmountMin != null ? { amount_min: ruleAmountMin } : {}),
          ...(ruleAmountMax != null ? { amount_max: ruleAmountMax } : {}),
          is_active: true, updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,merchant_pattern,min_amount,max_amount' }
      );
      if (ruleErr) {
        console.error('[tag-action] save_rule upsert failed', ruleErr.message);
        return err(`Could not save rule: ${ruleErr.message}`, 500);
      }

      let backfillCount = 0;
      try {
        const updatePayload: Record<string, unknown> = {
          category: parsedTarget.category, category_source: 'tag_rule',
          updated_at: new Date().toISOString(),
        };
        if (ruleSubcategory) {
          updatePayload.subcategory = ruleSubcategory;
          updatePayload.subcategory_source = 'tag_rule';
        }
        let bq = supabase.from('transactions').update(updatePayload).eq('user_id', userId);
        if (matchType === 'exact') { bq = bq.eq('merchant_name', normalized); }
        else { bq = bq.ilike('merchant_name', `%${normalized}%`); }
        if (ruleAmountMin != null) bq = bq.gte('amount', ruleAmountMin);
        if (ruleAmountMax != null) bq = bq.lt('amount', ruleAmountMax);
        const { count } = await bq.select('id', { count: 'exact', head: true });
        backfillCount = count || 0;
      } catch (bfErr: any) {
        console.warn('[tag-action] Backfill error (non-blocking):', bfErr?.message);
      }

      const { error: vcmError } = await supabase.from('vendor_category_memory').upsert(
        {
          user_id: userId, vendor_key: normalized.toLowerCase(),
          category: parsedTarget.category, subcategory: parsedTarget.subcategory,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,vendor_key' }
      );
      if (vcmError) {
        console.error('[tag-action.save_rule] vendor_category_memory upsert failed:', vcmError.message);
      }

      safeLog('tag-action.save_rule', { userId, matchValue: normalized, targetCategory: parsedTarget.category, matchType });

      return ok({ ok: true, intent: 'save_rule', rule: { merchant: normalized, category: parsedTarget.category }, backfill_count: backfillCount });
    } catch (e: any) {
      return err(e.message, 500);
    }
  }

  return err(`Unknown intent: ${intent}`);
};
