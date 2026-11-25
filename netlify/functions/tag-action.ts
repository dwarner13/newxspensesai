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
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { verifyAuth } from './_shared/verifyAuth.js';
import { safeLog } from './_shared/safeLog.js';
import {
  resolveEmployeeConversation,
  findLatestActionReceipt,
  claimConversationTurn,
  completeConversationTurn,
  parseActionReceipt,
  type ActionReceipt,
} from './_shared/conversation-platform.js';
import { resolveCategoryRequest, TAG_CATEGORIES } from './_shared/tagCategories.js';
import { TAG_SINGLE_ACTION, UUID_RE, loadOwnedTransaction, buildSingleProposal, catLabel } from './_shared/tagSingleTransaction.js';
import { TAG_PROPOSAL_ACTIONS, sameProposalSubject, executeActionProposal, type ProposalSubject } from './_shared/tagProposals.js';

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

// ── Shared cores for PREVIEW and COMMIT (used by the legacy and conversational paths) ─────────
// Same client type the shared conversation platform uses.
type TagSupabase = SupabaseClient;
type PreviewRow = { id: string; merchant_name: string | null; amount: number | null; posted_at: string | null; category: string | null };

/** Owner-scoped merchant match over the customer's recent transactions (read only). */
async function runPreview(
  supabase: TagSupabase, userId: string,
  opts: { normalized: string; matchType: string; importId?: string | null },
): Promise<PreviewRow[]> {
  let query = supabase
    .from('transactions')
    .select('id, merchant_name, amount, posted_at, category')
    .eq('user_id', userId)
    .order('posted_at', { ascending: false })
    .limit(500);
  if (opts.importId) query = query.eq('import_id', opts.importId);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  const rows = (data || []) as PreviewRow[];
  return rows.filter((tx) => {
    const haystack = (tx.merchant_name || '').toUpperCase();
    return opts.matchType === 'exact' ? haystack === opts.normalized : haystack.includes(opts.normalized);
  });
}

/**
 * Recategorize the given (owner-scoped) transactions and save the merchant rule + memory. The
 * returned count is what the database ACTUALLY updated, not what the request asked for.
 * Categorization behaviour is unchanged (category_source 'tag_chat', rule upsert, memory upsert).
 */
async function runCommit(
  supabase: TagSupabase, userId: string,
  opts: { ids: string[]; normalized: string; matchType: string; parsedTarget: { category: string; subcategory: string | null } },
): Promise<{ updatedCount: number; ruleSaved: boolean }> {
  const { data: updatedRows, error: txError } = await supabase
    .from('transactions')
    .update({
      category: opts.parsedTarget.category, subcategory: opts.parsedTarget.subcategory,
      category_source: 'tag_chat', updated_at: new Date().toISOString(),
    })
    .in('id', opts.ids)
    .eq('user_id', userId)
    .select('id');
  if (txError) throw new Error(txError.message);
  const updatedCount = Array.isArray(updatedRows) ? updatedRows.length : 0;

  const { error: crError } = await supabase.from('category_rules').upsert(
    {
      user_id: userId, match_type: opts.matchType, merchant_pattern: opts.normalized, match_value: opts.normalized,
      category: encodeRuleCategory(opts.parsedTarget.category, opts.parsedTarget.subcategory),
      is_active: true, updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,merchant_pattern' }
  );
  if (crError) console.error('[tag-action.commit] category_rules upsert failed');

  // vendor_category_memory only has: id, user_id, vendor_key, category, subcategory, created_at,
  // updated_at. Keep the upsert to what the schema actually supports and surface any error.
  const { error: vcmError } = await supabase.from('vendor_category_memory').upsert(
    {
      user_id: userId, vendor_key: opts.normalized.toLowerCase(),
      category: opts.parsedTarget.category, subcategory: opts.parsedTarget.subcategory,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,vendor_key' }
  );
  if (vcmError) console.error('[tag-action.commit] vendor_category_memory upsert failed');

  return { updatedCount, ruleSaved: !crError };
}

// ── T-H1b: conversational preview / confirmation / cancellation with SERVER receipts ─────────
// The browser sends `conversation: { sessionId?, clientMessageId, customerText, newConversation? }`.
// Tag's replies and receipts are composed here from verified results; browser text is never stored
// as Tag's words. A confirmation is honoured only for the proposal the server recorded as the
// immediately preceding Tag reply. Claim-first: the customer message is stored before anything runs,
// and a duplicate (retry / concurrent / partial failure) never runs the action again.
const TAG_ACTION = 'recategorize_by_merchant';
// T-LIVE-02: single-transaction proposal / ownership helpers live in _shared/tagSingleTransaction.ts
// (shared with tag-copilot's update_single_transaction tool).

interface ConversationFields {
  sessionId: string | null;
  clientMessageId: string | null;
  customerText: string;
  newConversation: boolean;
}

function parseConversationFields(raw: unknown): ConversationFields | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const customerText = typeof r.customerText === 'string' ? r.customerText.trim().slice(0, 4000) : '';
  if (!customerText) return null;
  return {
    sessionId: typeof r.sessionId === 'string' ? r.sessionId : null,
    clientMessageId: typeof r.clientMessageId === 'string' ? r.clientMessageId : null,
    customerText,
    newConversation: r.newConversation === true,
  };
}

const plural = (n: number) => (n === 1 ? '' : 's');
const money = (v: unknown) => `$${Math.abs(Number(v || 0)).toFixed(2)}`;

export function proposalText(matchValue: string, targetCategory: string, matches: PreviewRow[], closestTo?: string | null): string {
  const n = matches.length;
  const note = closestTo ? `There's no "${closestTo}" category — the closest is **${targetCategory}**.\n\n` : '';
  const sample = matches.slice(0, 3)
    .map((s) => `- ${s.merchant_name} - ${money(s.amount)} (currently: ${s.category || 'Uncategorized'})`)
    .join('\n');
  const extra = n > 3 ? `\n...and ${n - 3} more` : '';
  return `${note}I found **${n}** transaction${plural(n)} matching "${matchValue}". Here's a sample:\n\n${sample}${extra}\n\n`
    + `Move all ${n} to **${targetCategory}** and save a rule for future imports? Say yes to confirm.`;
}

type Subject = { matchValue: string; targetCategory: string; targetSubcategory: string | null; matchType: string };
const sameSubject = (a: ActionReceipt['subject'] | undefined, b: Subject) => !!a
  && a.matchValue === b.matchValue && a.targetCategory === b.targetCategory
  && (a.targetSubcategory ?? null) === b.targetSubcategory && a.matchType === b.matchType;

async function handleConversationalAction(
  supabase: TagSupabase,
  userId: string,
  intent: 'preview' | 'commit' | 'cancel_proposal' | 'preview_single' | 'commit_single' | 'commit_proposal',
  convo: ConversationFields,
  ctx: {
    subject: Subject | null; importId?: string | null; affectedIds?: unknown; parsedTarget?: { category: string; subcategory: string | null };
    /** T-LIVE-02 single-transaction request (transactionId is re-verified server-side). */
    single?: { transactionId: string; targetPhrase?: string; targetCategory?: string; targetSubcategory?: string | null };
    /** Merchant path: the requested category could not be resolved (Tag asks instead of proposing). */
    categoryIssue?: string | null;
    /** Merchant path: the customer's words when the category is only the closest match. */
    closestTo?: string | null;
    /** T-ACT-SAFE: confirmation of a rule / bulk move / rename proposal Tag made (client echo). */
    generic?: { action: string; subject: ProposalSubject };
  },
) {
  const isSingle = intent === 'preview_single' || intent === 'commit_single';
  const isGeneric = intent === 'commit_proposal';
  const actionName = isSingle ? TAG_SINGLE_ACTION : isGeneric && ctx.generic ? ctx.generic.action : TAG_ACTION;
  // 1. The customer's own Tag conversation.
  let sessionId: string | null = null;
  try {
    sessionId = (await resolveEmployeeConversation(supabase, {
      userId, employeeSlug: 'tag-ai', requestedSessionId: convo.sessionId, newConversation: convo.newConversation,
    })).sessionId;
  } catch {
    sessionId = null;
    console.warn('[tag-action] conversation could not be opened; this turn will not be saved');
  }

  // 2. The proposal the server recorded as Tag's immediately preceding reply (read before the claim).
  let pending: { receipt: ActionReceipt; replyTo: string | null } | null = null;
  if (sessionId && intent !== 'preview') {
    try {
      const latest = await findLatestActionReceipt(supabase, { sessionId, userId, lookback: 1 });
      if (latest && latest.receipt.state === 'proposed'
        && (latest.receipt.action === TAG_ACTION || latest.receipt.action === TAG_SINGLE_ACTION
          || TAG_PROPOSAL_ACTIONS.includes(latest.receipt.action))) pending = latest;
    } catch { pending = null; }
  }
  const proposalMatches = !pending ? false
    : isGeneric
      // The confirmation binds only to Tag's immediately preceding signed proposal with the SAME action
      // and EVERY subject field (scope fingerprint included) — a tampered or different echo matches nothing.
      ? !!ctx.generic && pending.receipt.action === ctx.generic.action
        && sameProposalSubject(pending.receipt.subject, ctx.generic.subject)
    : isSingle
      // A confirmation binds only to Tag's immediately preceding SINGLE proposal for this exact
      // transaction and category.
      ? pending.receipt.action === TAG_SINGLE_ACTION && !!ctx.single
        && pending.receipt.subject?.transactionId === ctx.single.transactionId
        && pending.receipt.subject?.targetCategory === (ctx.single.targetCategory ?? null)
        && (pending.receipt.subject?.targetSubcategory ?? null) === (ctx.single.targetSubcategory ?? null)
      : pending.receipt.action === TAG_ACTION && !!ctx.subject && sameSubject(pending.receipt.subject, ctx.subject);

  // 3. Claim-first: store the customer message (with its confirmed / cancelled intent) before acting.
  let claimed = false;
  if (sessionId) {
    const actionIntent = intent === 'commit' || intent === 'commit_single' || intent === 'commit_proposal'
      ? { action: actionName, state: 'confirmed', proposalRef: pending?.replyTo ?? null, matchesProposal: proposalMatches }
      : intent === 'cancel_proposal'
        ? { action: pending?.receipt.action ?? TAG_ACTION, state: 'cancelled', proposalRef: pending?.replyTo ?? null }
        : undefined;
    let claim: Awaited<ReturnType<typeof claimConversationTurn>> | null = null;
    try {
      claim = await claimConversationTurn(supabase, {
        sessionId, userId, employeeSlug: 'tag-ai', userText: convo.customerText, clientMessageId: convo.clientMessageId,
        ...(actionIntent ? { metadata: { actionIntent } } : {}),
      });
    } catch { claim = null; }
    if (claim?.status === 'duplicate') {
      // Already stored: report the STORED reply and outcome; never run the action again and never
      // say "done" when the outcome was not recorded.
      return ok({
        ok: true, intent, duplicate: true, executed: false,
        conversation: {
          sessionId,
          persisted: claim.reply !== null,
          reply: claim.reply ?? "I already received that message, but its outcome wasn't recorded. Nothing was run again — please check your transactions before trying again.",
          receipt: parseActionReceipt(claim.actionOutcome),
        },
      });
    }
    if (claim?.status === 'conflict') {
      // Unique conflict with nothing stored in this session: assume nothing, act on nothing.
      return ok({
        ok: false, intent, error: 'conflict', executed: false,
        conversation: {
          sessionId, persisted: false, conflict: true, receipt: null,
          reply: "I couldn't safely record that message, so I didn't change anything. Please send it again.",
        },
      });
    }
    claimed = claim?.status === 'claimed';
  }

  // 4. Run the action and compose Tag's reply + receipt from the VERIFIED outcome.
  const base = { v: 1 as const, employee: 'tag-ai' as const, action: actionName, ...(ctx.subject ? { subject: ctx.subject } : {}) };
  let receipt: ActionReceipt;
  let reply: string;
  let executed = false;
  let legacy: Record<string, unknown> = {};

  if (intent === 'preview_single' && ctx.single) {
    // T-LIVE-02: a proposal for ONE verified transaction. Nothing is changed here.
    const outcome = await buildSingleProposal(supabase, userId, ctx.single.transactionId, ctx.single.targetPhrase || '');
    reply = outcome.reply;
    if (outcome.state === 'proposed') {
      receipt = { ...base, subject: outcome.subject, state: 'proposed', result: { matchCount: 1 } };
      legacy = { ok: true, transactionId: outcome.subject.transactionId, targetCategory: outcome.subject.targetCategory, targetSubcategory: outcome.subject.targetSubcategory, matchCount: 1, resolution: outcome.resolution };
    } else {
      receipt = { ...base, state: 'failed', reason: outcome.reason };
      legacy = { ok: false, error: outcome.reason === 'preview_error' ? 'preview_failed' : outcome.reason, ...(outcome.candidates ? { candidates: outcome.candidates } : {}) };
    }
  } else if (intent === 'commit_proposal' && ctx.generic) {
    // T-ACT-SAFE: execute a rule / bulk move / rename the customer explicitly confirmed. The SIGNED
    // proposal's subject (not the client's echo) drives execution; the scope is re-read and a stale
    // scope changes nothing.
    if (!sessionId || !proposalMatches || !pending) {
      legacy = { ok: false, error: 'no_matching_proposal' };
      receipt = { ...base, state: 'failed', reason: 'no_matching_proposal', proposalRef: pending?.replyTo ?? null };
      reply = "There's no pending change matching that confirmation, so I haven't changed anything. Tell me what you'd like to change and I'll check it first.";
    } else {
      const signedSubject = pending.receipt.subject as ProposalSubject;
      const outcome = await executeActionProposal(supabase, userId, pending.receipt.action, signedSubject);
      executed = outcome.state === 'completed';
      reply = outcome.reply;
      legacy = { ok: executed, action: outcome.action, updatedCount: outcome.count, ...(executed ? {} : { error: outcome.reason }) };
      receipt = {
        ...base, subject: signedSubject, state: outcome.state, proposalRef: pending.replyTo ?? null,
        result: { affectedCount: outcome.count }, ...(outcome.reason ? { reason: outcome.reason } : {}),
      };
      if (outcome.log) {
        await logTagActivity(supabase, { user_id: userId, ...outcome.log, created_at: new Date().toISOString() });
      }
    }
  } else if (intent === 'commit_single' && ctx.single) {
    const subject = { transactionId: ctx.single.transactionId, targetCategory: ctx.single.targetCategory ?? null, targetSubcategory: ctx.single.targetSubcategory ?? null };
    if (!sessionId || !proposalMatches) {
      // Never act without a server-recorded, signed proposal for exactly this transaction and category.
      legacy = { ok: false, error: 'no_matching_proposal' };
      receipt = { ...base, subject, state: 'failed', reason: 'no_matching_proposal', proposalRef: pending?.replyTo ?? null };
      reply = "There's no pending change matching that confirmation, so I haven't changed anything. Tell me what you'd like to change and I'll check it first.";
    } else {
      try {
        const tx = await loadOwnedTransaction(supabase, userId, ctx.single.transactionId);
        if (!tx) {
          legacy = { ok: false, error: 'not_found' };
          receipt = { ...base, subject, state: 'failed', reason: 'not_found', proposalRef: pending?.replyTo ?? null, result: { affectedCount: 0 } };
          reply = "I can't find that transaction anymore, so nothing was changed.";
        } else {
          // Exactly one row, owner-scoped. No rule, no merchant memory, no other transaction.
          const { data: updated, error: upErr } = await supabase
            .from('transactions')
            .update({
              category: subject.targetCategory, subcategory: subject.targetSubcategory,
              category_source: 'tag_chat', updated_at: new Date().toISOString(),
            })
            .eq('id', tx.id)
            .eq('user_id', userId)
            .select('id');
          if (upErr) throw new Error('update_failed');
          const n = Array.isArray(updated) ? updated.length : 0;
          executed = n === 1;
          legacy = { ok: executed, transactionId: tx.id, targetCategory: subject.targetCategory, targetSubcategory: subject.targetSubcategory, updatedCount: n, ...(executed ? {} : { error: 'nothing_updated' }) };
          if (executed) {
            receipt = { ...base, subject, state: 'completed', proposalRef: pending?.replyTo ?? null, result: { affectedCount: 1 } };
            reply = `Done — this **${tx.merchant_name || ''}** transaction is now in **${catLabel(subject.targetCategory, subject.targetSubcategory)}**. No other transactions or rules were changed.`;
          } else {
            receipt = { ...base, subject, state: 'failed', reason: 'nothing_updated', proposalRef: pending?.replyTo ?? null, result: { affectedCount: 0 } };
            reply = "I couldn't update that transaction, so nothing was changed. Please try again.";
          }
        }
      } catch {
        legacy = { ok: false, error: 'commit_failed' };
        receipt = { ...base, subject, state: 'failed', reason: 'commit_error', proposalRef: pending?.replyTo ?? null };
        reply = "I couldn't make that change, so nothing was changed. Please try again.";
      }
    }
  } else if (intent === 'preview' && ctx.subject && ctx.categoryIssue) {
    // T-LIVE-02: never propose a silently substituted category (it used to become "Other").
    legacy = { ok: false, error: 'category_unresolved' };
    receipt = { ...base, state: 'failed', reason: 'category_unresolved' };
    reply = ctx.categoryIssue;
  } else if (intent === 'preview' && ctx.subject) {
    try {
      const matches = await runPreview(supabase, userId, { normalized: ctx.subject.matchValue, matchType: ctx.subject.matchType, importId: ctx.importId });
      legacy = {
        ok: true, matchValue: ctx.subject.matchValue, targetCategory: ctx.subject.targetCategory,
        targetSubcategory: ctx.subject.targetSubcategory, matchType: ctx.subject.matchType, matchCount: matches.length,
        samples: matches.slice(0, 5).map((tx) => ({ id: tx.id, merchant_name: tx.merchant_name, amount: tx.amount, posted_at: tx.posted_at, current_category: tx.category || 'Uncategorized' })),
        affectedIds: matches.map((tx) => tx.id),
      };
      if (matches.length > 0) {
        receipt = { ...base, state: 'proposed', result: { matchCount: matches.length } };
        reply = proposalText(ctx.subject.matchValue, ctx.subject.targetCategory, matches, ctx.closestTo ?? null);
      } else {
        receipt = { ...base, state: 'failed', reason: 'no_matches', result: { matchCount: 0 } };
        reply = `I searched your transactions but didn't find any matching "${ctx.subject.matchValue}". Want to try a different keyword, or tell me the merchant name you see in your list?`;
      }
    } catch {
      legacy = { ok: false, error: 'preview_failed' };
      receipt = { ...base, state: 'failed', reason: 'preview_error' };
      reply = 'Something went wrong checking your transactions, so nothing has changed. Try again?';
    }
  } else if (intent === 'commit' && ctx.subject && ctx.parsedTarget) {
    if (sessionId && !proposalMatches) {
      // Never act on a confirmation the server cannot tie to the proposal it just made.
      legacy = { ok: false, error: 'no_matching_proposal' };
      receipt = { ...base, state: 'failed', reason: 'no_matching_proposal', proposalRef: pending?.replyTo ?? null };
      reply = "There's no pending change matching that confirmation, so I haven't changed anything. Tell me what you'd like to move and I'll check it first.";
    } else {
      try {
        // Only transactions the server itself matches now (intersected with the previewed ids, if sent).
        const matches = await runPreview(supabase, userId, { normalized: ctx.subject.matchValue, matchType: ctx.subject.matchType, importId: ctx.importId });
        const requested = Array.isArray(ctx.affectedIds) ? new Set(ctx.affectedIds.map(String)) : null;
        const ids = matches.map((m) => m.id).filter((id) => !requested || requested.has(id));
        if (ids.length === 0) {
          legacy = { ok: false, error: 'nothing_to_update' };
          receipt = { ...base, state: 'failed', reason: 'nothing_to_update', proposalRef: pending?.replyTo ?? null, result: { affectedCount: 0 } };
          reply = `I couldn't find those "${ctx.subject.matchValue}" transactions anymore, so nothing was moved.`;
        } else {
          const r = await runCommit(supabase, userId, { ids, normalized: ctx.subject.matchValue, matchType: ctx.subject.matchType, parsedTarget: ctx.parsedTarget });
          executed = r.updatedCount > 0;
          legacy = { ok: executed, matchValue: ctx.subject.matchValue, targetCategory: ctx.subject.targetCategory, targetSubcategory: ctx.subject.targetSubcategory, matchType: ctx.subject.matchType, updatedCount: r.updatedCount, ...(executed ? {} : { error: 'nothing_updated' }) };
          if (executed) {
            receipt = { ...base, state: 'completed', proposalRef: pending?.replyTo ?? null, result: { affectedCount: r.updatedCount }, ...(r.ruleSaved ? {} : { reason: 'rule_not_saved' }) };
            reply = `Done. Moved ${r.updatedCount} transaction${plural(r.updatedCount)} to ${ctx.subject.targetCategory}`
              + (r.ruleSaved
                ? ` and saved a rule so future "${ctx.subject.matchValue}" transactions auto-categorize.`
                : `. I couldn't save the rule for future "${ctx.subject.matchValue}" transactions, so new imports won't be categorized automatically yet.`);
          } else {
            receipt = { ...base, state: 'failed', reason: 'nothing_updated', proposalRef: pending?.replyTo ?? null, result: { affectedCount: 0 } };
            reply = "I couldn't update those transactions, so nothing was moved. Please try again.";
          }
        }
      } catch {
        legacy = { ok: false, error: 'commit_failed' };
        receipt = { ...base, state: 'failed', reason: 'commit_error', proposalRef: pending?.replyTo ?? null };
        reply = "I couldn't make that change, so nothing was moved. Please try again.";
      }
    }
  } else {
    // cancel_proposal: nothing is executed.
    legacy = { ok: true };
    if (pending) {
      receipt = { v: 1, employee: 'tag-ai', action: pending.receipt.action, state: 'cancelled', subject: pending.receipt.subject, proposalRef: pending.replyTo };
      reply = "Okay, I won't change anything.";
    } else {
      receipt = { v: 1, employee: 'tag-ai', action: TAG_ACTION, state: 'cancelled', reason: 'no_pending_proposal' };
      reply = "There's nothing waiting for your confirmation, so nothing has changed.";
    }
  }

  // Prime HQ's authoritative-outcome fields (tool, success, count) on executed / attempted actions.
  if (receipt.state === 'completed' || ((intent === 'commit' || intent === 'commit_single' || intent === 'commit_proposal') && receipt.state === 'failed')) {
    receipt = { ...receipt, tool: actionName, success: receipt.state === 'completed', count: receipt.result?.affectedCount ?? 0 };
  }

  // 5. Store Tag's reply with the receipt. `persisted` is true only when claim AND reply were saved.
  let persisted = false;
  if (sessionId && claimed) {
    try {
      await completeConversationTurn(supabase, {
        sessionId, userId, employeeSlug: 'tag-ai', assistantText: reply, clientMessageId: convo.clientMessageId,
        assistantMetadata: { actionReceipt: receipt },
      });
      persisted = true;
    } catch {
      console.warn('[tag-action] conversation reply was not saved');
    }
  }

  safeLog('tag-action.conversation', { userId, intent, state: receipt.state, executed, persisted });
  return ok({ ...legacy, intent, executed, conversation: { sessionId, persisted, duplicate: false, reply, receipt } });
}

// Non-blocking audit log. Supabase query builders have NO .catch(): the old
// `insert(...).catch(() => {})` threw a TypeError after the transaction update had already
// succeeded, so fix_type / fix_type_bulk / bulk_normalize_subcategory returned 500 for completed
// changes and never wrote the log. A failed log write must never fail the customer's action.
async function logTagActivity(supabase: SupabaseClient, row: Record<string, unknown>): Promise<void> {
  try {
    const { error } = await supabase.from('tag_activity_log').insert(row);
    if (error) console.warn('[tag-action] activity log write failed');
  } catch {
    console.warn('[tag-action] activity log write failed');
  }
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS, body: '' };
  }
  if (event.httpMethod !== 'POST') return err('Method not allowed', 405);

  const auth = await verifyAuth(event);
  if (!auth.userId) return err('Unauthorized', 401);
  const userId = auth.userId;
  const supabase: SupabaseClient = createClient(
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

      await logTagActivity(supabase, {
        user_id: userId,
        action_type: 'type_fix',
        merchant_name: current?.merchant_name || null,
        transaction_id: transactionId,
        old_value: oldType,
        new_value: newType,
        note: `Type changed: ${oldType} → ${newType}${newType === 'income' ? ' (category set to Income)' : ''}`,
        created_at: new Date().toISOString(),
      });

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

      await logTagActivity(supabase, {
        user_id: userId, action_type: 'fix_type_bulk',
        merchant_name: matchValue || filterCategory || null,
        old_value: matchValue || filterCategory || 'mixed', new_value: newType,
        note: `Bulk type fix → ${newType}: ${affectedIds.length} transactions${filterCategory ? ` in category "${filterCategory}"` : ''}${matchValue ? ` matching "${matchValue}"` : ''}`,
        created_at: new Date().toISOString(),
      });

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

      await logTagActivity(supabase, {
        user_id: userId, action_type: 'bulk_normalize_subcategory', merchant_name: null,
        old_value: filterCategory || 'all categories',
        new_value: `${written} subcategories assigned`,
        note: `Bulk subcategory normalization: ${written} updated, ${skipped} skipped${filterCategory ? ` (scoped to "${filterCategory}")` : ''}`,
        created_at: new Date().toISOString(),
      });

      safeLog('tag-action.bulk_normalize_subcategory', { userId, filterCategory, written, skipped, overwrite });

      return ok({
        ok: true, intent: 'bulk_normalize_subcategory',
        filterCategory: filterCategory || 'all', normalized: written, skipped, breakdown, overwrite,
      });
    } catch (e: any) {
      return err(e.message, 500);
    }
  }

  // ── T-H1b: conversational turns (server-composed replies and receipts) ─────
  const conversation = body.conversation !== undefined ? parseConversationFields(body.conversation) : null;
  if (body.conversation !== undefined && !conversation) return err('conversation.customerText is required');
  if (intent === 'cancel_proposal') {
    if (!conversation) return err('cancel_proposal requires conversation');
    return handleConversationalAction(supabase, userId, 'cancel_proposal', conversation, { subject: null });
  }

  // ── T-ACT-SAFE: confirm a rule / bulk move / rename proposal (conversation required) ──
  if (intent === 'commit_proposal') {
    if (!conversation) return err('commit_proposal requires conversation');
    const action = typeof body.action === 'string' ? body.action : '';
    if (!TAG_PROPOSAL_ACTIONS.includes(action)) return err('Unknown proposal action');
    const raw = body.subject && typeof body.subject === 'object' && !Array.isArray(body.subject) ? body.subject as Record<string, unknown> : null;
    if (!raw) return err('Missing subject');
    const subject: ProposalSubject = {};
    for (const [k, v] of Object.entries(raw).slice(0, 20)) {
      if (typeof v === 'string' || typeof v === 'number' || v === null) subject[k] = typeof v === 'string' ? v.slice(0, 200) : v;
    }
    return handleConversationalAction(supabase, userId, 'commit_proposal', conversation, { subject: null, generic: { action, subject } });
  }

  // ── T-LIVE-02: single focused transaction (proposal → confirmation), conversation required ──
  if (intent === 'preview_single' || intent === 'commit_single') {
    if (!conversation) return err(`${intent} requires conversation`);
    const transactionId = typeof body.transactionId === 'string' ? body.transactionId.trim() : '';
    if (!UUID_RE.test(transactionId)) return err('Missing or invalid transactionId');
    if (intent === 'preview_single') {
      const targetPhrase = typeof body.targetPhrase === 'string' ? body.targetPhrase.trim().slice(0, 120) : '';
      if (!targetPhrase) return err('Missing targetPhrase');
      return handleConversationalAction(supabase, userId, 'preview_single', conversation, { subject: null, single: { transactionId, targetPhrase } });
    }
    const targetCategory = typeof body.targetCategory === 'string' ? body.targetCategory : '';
    if (!targetCategory) return err('Missing targetCategory');
    const targetSubcategory = typeof body.targetSubcategory === 'string' && body.targetSubcategory.trim() ? body.targetSubcategory.trim() : null;
    return handleConversationalAction(supabase, userId, 'commit_single', conversation, { subject: null, single: { transactionId, targetCategory, targetSubcategory } });
  }

  // ── Remaining intents require matchValue + targetCategory ─────────────────
  if (!matchValue || !targetCategory) return err('Missing matchValue or targetCategory');
  const parsedTargetRaw = parseCategoryInput(String(targetCategory));
  const parsedTarget = {
    category: normalizeCanonicalCategory(parsedTargetRaw.category),
    subcategory: parsedTargetRaw.subcategory,
  };

  const normalized = matchValue.trim().toUpperCase();

  if (conversation && (intent === 'preview' || intent === 'commit')) {
    // T-LIVE-02: resolve against the available categories; the same deterministic resolution is
    // applied to the preview and to the confirmation, so they bind to the same subject.
    const res = resolveCategoryRequest(String(targetCategory));
    const resolvedTarget = res.status === 'exact' || res.status === 'closest'
      ? { category: res.category as string, subcategory: res.subcategory }
      : parsedTarget;
    const categoryIssue = res.status === 'ambiguous'
      ? `"${res.requested}" could mean ${res.candidates.map(c => `**${c}**`).join(' or ')}. Which one should I use?`
      : res.status === 'unknown'
        ? `I don't have a "${res.requested}" category. Which of these fits best: ${TAG_CATEGORIES.filter(c => c !== 'Income' && c !== 'Transfers').join(', ')}?`
        : null;
    return handleConversationalAction(supabase, userId, intent, conversation, {
      subject: { matchValue: normalized, targetCategory: resolvedTarget.category, targetSubcategory: resolvedTarget.subcategory, matchType: String(matchType) },
      importId, affectedIds: body.affectedIds, parsedTarget: resolvedTarget,
      categoryIssue, closestTo: res.status === 'closest' ? res.requested : null,
    });
  }

  // ── PREVIEW ────────────────────────────────────────────────────────────────
  if (intent === 'preview') {
    try {
      const matching = await runPreview(supabase, userId, { normalized, matchType: String(matchType), importId });
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
      const r = await runCommit(supabase, userId, { ids: affectedIds.map(String), normalized, matchType: String(matchType), parsedTarget });

      safeLog('tag-action.commit', {
        userId, matchValue: normalized, targetCategory: parsedTarget.category,
        targetSubcategory: parsedTarget.subcategory, matchType, updatedCount: r.updatedCount,
      });

      // updatedCount is the number of rows the database actually updated (was: the request size).
      return ok({
        ok: true, intent: 'commit', matchValue: normalized,
        targetCategory: parsedTarget.category, targetSubcategory: parsedTarget.subcategory,
        matchType, updatedCount: r.updatedCount,
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
          ...(ruleAmountMin != null ? { amount_min: ruleAmountMin, min_amount: ruleAmountMin } : {}),
          ...(ruleAmountMax != null ? { amount_max: ruleAmountMax, max_amount: ruleAmountMax } : {}),
          is_active: true, updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,merchant_pattern' }
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
