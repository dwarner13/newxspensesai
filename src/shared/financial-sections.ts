/**
 * CANONICAL TAX SECTION DEFINITIONS & CLASSIFICATION
 *
 * Single source of truth for:
 * - Tax section ordering (FIRST MATCH WINS)
 * - Section match functions
 * - Bucket definitions (subcategory grouping within sections)
 * - groupIntoBuckets() implementation
 * - classifyTransactions() — deterministic first-match-wins classifier
 *
 * RULES:
 * - Pure TypeScript only. No React, no Supabase, no Node-only APIs.
 * - Section ordering is CRITICAL: Income MUST be evaluated before Vehicle.
 * - All bucket keywords must match existing merchant/subcategory patterns.
 *
 * NON_SPEND DECISION (Step 6):
 * ─────────────────────────────
 * The canonical tax sections follow TaxWorkspacePage behavior: NO NON_SPEND
 * guard on section matchers. Rationale:
 *
 * 1. TaxWorkspacePage is the user-visible UI (source of truth for user expectation)
 * 2. generate-tax-report.ts matches this behavior (accountant-facing export)
 * 3. Tax reporting should include all money movement for transparency
 * 4. Non-spend filtering is appropriate for SPENDING TOTALS (monthlyExpenses,
 *    totalSpent) but NOT for tax section classification
 *
 * DIVERGENCE FROM usePrimeBriefingData.ts:
 * usePrimeBriefingData wraps each spend section in !isNonSpendTx() and adds
 * a dedicated "Transfers & Non-Spend" section. This was added to prevent
 * transfers from inflating spending totals in Prime's context.
 *
 * IMPACT: If usePrimeBriefingData migrates to these canonical sections, it
 * will need to apply NON_SPEND filtering at the AGGREGATION layer (when
 * computing totalSpent), not at the section CLAIMING layer. This preserves
 * tax section parity while keeping spending totals accurate.
 *
 * ⚠️ FLAG: Changing usePrimeBriefingData's section logic would change the
 * taxSummary numbers Prime sees. This is a Phase 1B migration concern —
 * do NOT change usePrimeBriefingData in Phase 1.
 *
 * INCOME DECISION (Step 7):
 * ─────────────────────────
 * Two canonical income definitions serve different purposes:
 *
 * 1. isIncomeStrict(tx) — Tax Section claiming: tx.type === "income"
 *    Used by: TAX_SECTIONS[0].matchFn, TaxWorkspacePage, generate-tax-report
 *    Rationale: Only the `type` field (set by commit-import) is reliable for
 *    claiming. Merchant-pattern heuristics would cause false claiming.
 *
 * 2. isIncomeBroad(tx) — Aggregation totals: type + category + merchant
 *    Used by: usePrimeBriefingData, useDashboardData, useStoryData, etc.
 *    Rationale: Some imported transactions lack `type` but have income semantics.
 *
 * IMPACT: Using isIncomeStrict for tax section claiming means transactions with
 * category="Income" but type≠"income" will NOT be claimed by the Income section.
 * They will fall through to other sections or "other". This matches current
 * TaxWorkspacePage production behavior.
 *
 * Transactions that would be classified differently:
 * - A transaction with category="Income", type=null → NOT claimed by Income
 *   section (falls to "other"). Under isIncomeBroad it WOULD be income.
 * - This is the CURRENT production behavior in TaxWorkspacePage.
 * - No user-facing totals change because we match existing behavior exactly.
 */

import type { ClassifiableTransaction } from './financial-taxonomy.js';
import { isIncomeStrict } from './financial-taxonomy.js';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface TaxSectionDef {
  id: string;
  title: string;
  matchFn: (tx: ClassifiableTransaction) => boolean;
}

export interface Bucket {
  label: string;
  keywords: string[];
}

export interface BucketResult {
  label: string;
  count: number;
  amount: number;
}

export interface SectionResult {
  id: string;
  title: string;
  transactions: ClassifiableTransaction[];
  total: number;
  count: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// TAX SECTIONS — CANONICAL ORDERING
// ─────────────────────────────────────────────────────────────────────────────
//
// CRITICAL: Income MUST be first. First-match-wins prevents double-counting.
//
// Regression fixture:
//   { type: "income", category: "Income", subcategory: "Gas & Fuel", amount: 2149.84 }
//   → Income section claims it. Vehicle/Gas Fuel MUST NOT claim it.
//   → 2025 Gas/Fuel total = $6,472.65 (not $8,622.49)

export const TAX_SECTIONS: readonly TaxSectionDef[] = [
  {
    id: 'income',
    title: 'Income',
    matchFn: (tx) => isIncomeStrict(tx),
  },
  {
    id: 'vehicle',
    title: 'Vehicle Expenses',
    matchFn: (tx) =>
      tx.category === 'Transportation' ||
      tx.category === 'Automotive' ||
      tx.subcategory === 'Vehicle Insurance' ||
      [
        'Gas & Fuel', 'Parking', 'Vehicle Maintenance', 'Vehicle Registration',
        'Car Loan', 'Car Wash',
      ].includes(tx.subcategory || ''),
  },
  {
    id: 'home',
    title: 'Home / Rent / Lease',
    matchFn: (tx) =>
      tx.category === 'Rent or Lease' ||
      tx.category === 'Utilities' ||
      tx.category === 'Housing' ||
      tx.category === 'Home / Rent / Lease' ||
      tx.subcategory === 'Mortgage / Rent' ||
      tx.subcategory === 'Condo Fees' ||
      tx.subcategory === 'Home Insurance',
  },
  {
    id: 'meals',
    title: 'Meals & Entertainment',
    matchFn: (tx) =>
      tx.category === 'Food & Dining' ||
      (tx.category === 'Entertainment' &&
        tx.subcategory !== 'Golf' &&
        tx.subcategory !== 'Gambling' &&
        tx.subcategory !== 'Events / Tickets'),
  },
  {
    id: 'business',
    title: 'Business Expenses',
    matchFn: (tx) =>
      tx.category === 'Subscriptions' ||
      tx.category === 'Bank Fees' ||
      tx.category === 'Advertising' ||
      tx.category === 'Technology' ||
      tx.category === 'Office Supplies' ||
      tx.category === 'Professional Services' ||
      tx.category === 'Business Expenses',
  },
  {
    id: 'personal',
    title: 'Personal',
    matchFn: (tx) =>
      tx.category === 'Personal Care' ||
      tx.category === 'Groceries' ||
      tx.category === 'Debt Payments' ||
      tx.category === 'Transfers' ||
      tx.category === 'Shopping' ||
      tx.category === 'Healthcare' ||
      tx.category === 'Needs Review' ||
      tx.category === 'Travel' ||
      tx.subcategory === 'Golf' ||
      tx.subcategory === 'Gambling' ||
      tx.subcategory === 'Events / Tickets' ||
      tx.subcategory === 'Investments' ||
      tx.subcategory === 'Online Shopping' ||
      tx.subcategory === 'Clothing' ||
      tx.subcategory === 'General Shopping' ||
      tx.subcategory === 'Hardware / Auto' ||
      tx.subcategory === 'Fitness' ||
      tx.subcategory === 'Supplements',
  },
  {
    id: 'other',
    title: 'Other / Uncategorized',
    matchFn: (tx) => (tx.type || '').toLowerCase() === 'expense',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// BUCKET DEFINITIONS
// ─────────────────────────────────────────────────────────────────────────────

export const VEHICLE_BUCKETS: readonly Bucket[] = [
  { label: 'Gas / Fuel', keywords: ['petro', 'esso', 'shell', 'gas', 'fuel', 'co-op', 'mobil', '7-eleven fuel', 'husky', 'gas & fuel', 'kollbrook', 'canco petroleum', 'circle k'] },
  { label: 'Car Payments', keywords: ['td loan', 'car payment', 'auto loan', 'lns/pre', 'car loan'] },
  { label: 'Registration', keywords: ['registry', 'registration', 'northtown registry'] },
  { label: 'Insurance', keywords: ['economical', 'peace hills', 'imperial pfs', 'vehicle insurance', 'auto insurance', 'car insurance'] },
  { label: 'Repairs / Maintenance', keywords: ['oil change', 'repair', 'tire', 'mechanic', 'midas', 'canadian tire auto', 'maintenance', 'auto service', 'vehicle maintenance', 'jiffy lube', 'revolution moto', 'river city hyundai'] },
  { label: 'Parking', keywords: ['parking', 'impark', 'parkade'] },
  { label: 'Car Wash', keywords: ['car wash', 'kenyon', 'triangle cp'] },
  { label: 'Car Rental', keywords: ['enterprise', 'avis', 'budget rent', 'hertz', 'national car', 'car rental'] },
  { label: 'Rideshare / Taxi', keywords: ['uber', 'lyft', 'taxi', 'rideshare'] },
  { label: 'Traffic Fines', keywords: ['myalberta fine', 'traffic fine', 'photo radar', 'parking fine'] },
];

export const MEALS_BUCKETS: readonly Bucket[] = [
  { label: 'Coffee', keywords: ['tim hortons', 'starbucks', 'booster juice', 'second cup', 'good earth', 'coffee', 'coffee & drinks'] },
  { label: 'Restaurants / Dining', keywords: ['pizza', 'restaurant', 'restaurants', 'pub', 'grill', 'diner', 'kitchen', 'smittys', 'wendys', 'mcdonalds', 'popeyes', 'mr sub', 'halong bay', 'sushi', 'thai', 'wok', 'buffet', 'a&w', 'subway', 'kfc', 'burger', 'boston pizza', 'earls', 'cactus', 'moxies', 'original joe', 'joey', 'montanas', 'restaurants / dining'] },
  { label: 'Fast Food / Takeout', keywords: ['uber eats', 'doordash', 'skip the dishes', 'instacart'] },
  { label: 'Groceries / Convenience', keywords: ['7-eleven', '7 eleven', "mac's", 'circle k'] },
  { label: 'Entertainment', keywords: ['movie', 'concert', 'sport', 'fitness', 'theatre', 'cinema', 'netflix', 'spotify'] },
  { label: 'Alcohol', keywords: ['liquor', 'econo liquor', 'beer', 'wine', 'alcanna', 'wine and beyond'] },
  { label: 'Supplements / Health Food', keywords: ['supplement', 'ls supplement', 'popeye supplement', 'gnc', 'nutrition'] },
];

export const HOME_BUCKETS: readonly Bucket[] = [
  { label: 'Mortgage / Rent', keywords: ['mortgage', 'b/m payt', 'rent', 'rnt payt'] },
  { label: 'Condo Fees', keywords: ['celtic', 'condo fee', 'strata', 'hoa'] },
  { label: 'Utilities - Electric', keywords: ['epcor', 'electricity', 'electric'] },
  { label: 'Utilities - Gas / Heat', keywords: ['atco', 'direct energy', 'enmax'] },
  { label: 'Utilities - Water', keywords: ['epcor water', 'water bill'] },
  { label: 'Internet', keywords: ['telus', 'shaw', 'internet'] },
  { label: 'Home Insurance', keywords: ['sandbox mutual', 'home insurance', 'property insurance', 'tenant insurance'] },
];

export const BUSINESS_BUCKETS: readonly Bucket[] = [
  { label: 'Advertising / Marketing', keywords: ['advertising', 'marketing', 'dreamhost', 'seo', 'amazon prime business', 'amazon', 'google ads', 'facebook'] },
  { label: 'Software / Subscriptions', keywords: ['software', 'subscriptions', 'cursor', 'openai', 'youtube', 'everlance', 'ranked ai', 'adobe', 'microsoft', 'canva', 'zoom', 'slack', 'notion', 'dropbox', 'chatgpt', '2nd site', 'stackblitz', 'dodopay', 'netlify', 'paddle.net', 'paddle.com', 'netflix', 'aiprm', 'envato', 'supabase', 'anthropic', 'github', 'vercel', 'cloudflare', 'figma', 'zapier', 'airtable', 'linear', 'fastmail', 'n8n'] },
  { label: 'Professional Fees', keywords: ['professional fees', 'professional services', 'accounting', 'ncube', '2nd site', 'legal', 'bookkeeping', 'consulting'] },
  { label: 'Bank Fees', keywords: ['bank fees', 'bank fee', 'premium plan', 'handling chg', 'interest charge', 'service charge', 'nsf', 'overdraft'] },
  { label: 'Business Insurance', keywords: ['imperial pfs', 'business insurance', 'liability'] },
  { label: 'Phone / Cell', keywords: ['phone / cell', 'rogers', 'fido', 'koodo', 'virgin mobile', 'bell', 'freedom mobile', 'public mobile', 'chatr', 'cell phone'] },
];

export const PERSONAL_BUCKETS: readonly Bucket[] = [
  { label: 'Dental', keywords: ['dental', 'chandra', 'mcallister', 'dentist', 'orthodon'] },
  { label: 'Pharmacy / Medical', keywords: ['pharmacy / medical', 'medical', 'healthcare', 'pharmacy', 'shoppers drug mart', 'rexall', 'clinic', 'doctor', 'beaumaris', 'callingwood', 'royal alexandra', 'specsavers', 'vitality health'] },
  { label: 'Groceries', keywords: ['groceries', 'sobeys', 'save on', 'saveonfoods', 'safeway', 'loblaws', 'walmart', 'wal-mart', 'wmt suprctr', "mac's", 'superstore', 'costco', 'no frills', 'freshco', 'dollarama', 'dollar tree', 'intercity packers', 'lm st albert'] },
  { label: 'Grooming / Salon', keywords: ['grooming / salon', 'grooming', 'salon', 'barber', 'hair', 'q-nails', 'nails spot', 'nails', 'cutbypat', 'ss edmonton', 'shadified', 'q hair'] },
  { label: 'Fitness', keywords: ['fitness', 'la fitness', 'simply health', 'yoga', 'gym'] },
  { label: 'Supplements', keywords: ['supplements', 'supplement', 'ls supplement', 'lssupplementworld', 'unimeal', 'v support unimeal', 'vsa_support', 'popeye', 'gnc', 'nutrition'] },
  { label: 'Wellness / Massage', keywords: ['wellness / massage', 'massage', 'ting ting', 'yo yo', 'lewis massage', 'tulip garden', 'songblossom', 'spa', 'wellness'] },
  { label: 'Cash / ATM', keywords: ['cash / atm', 'abm withdrawal', 'abmwithdrawal', 'other bank abm', 'atm withdrawal', 'rbc atm'] },
  { label: 'Travel & Leisure', keywords: ['travel & leisure', 'passport', 'holiday inn', 'hotel', 'balgonie', 'travel', 'sportsnet', 'rmi-sportsnet'] },
  { label: 'Transfers', keywords: ['transfers', 'payment', 'interac etrnsfr sent', 'e-transfer', 'etransfer', 'online transfer', 'payback with points'] },
  { label: 'Loan Payments', keywords: ['loan payments', 'lend direct', 'lenddirect', 'borrowell', 'easyfinancial', 'cash money', 'springfinancial', 'national money', 'nationalmoney', 'flexiti'] },
  { label: 'Credit Card Payments', keywords: ['credit card payments', 'ctfs', 'capital one', 'canadian tire bank', 'cc payment'] },
  { label: 'Investments', keywords: ['investments', 'investment', 'bmo inv', 'bmoinv', 'tfsa', 'rrsp', 'wealthsimple', 'questrade'] },
  { label: 'Shopping', keywords: ['general shopping', 'hardware / auto', 'online shopping', 'clothing', 'shopping', 'winners', 'marshalls', 'homesense', 'amazon', 'amzn', 'best buy', 'pandora', 'sport chek', 'american eagle', 'shoe company', 'mountain warehouse', 'urban kids', "mark's", 'rona', 'canadian tire', 'cdn tire', 'great computers'] },
  { label: 'Golf', keywords: ['golf', 'alberta beach golf', 'ls alberta beach', 'twin willows', 'glendale golf', 'golfzon', 'golf traders', 'golf town', 'golf avenue', 'golf av', 'sezzle*golf', 'canada golf card', 'lewis estates golf', 'montgomery glen', 'sanpiper golf', 'silver creek golf', 'leduc golf', 'leducgolfclub', 'lonespruce', 'longshotz', 'golf club'] },
  { label: 'Gambling', keywords: ['gambling', 'bingo', 'castledowns', 'west end bingo', 'river cree', 'bear hills', 'bearhills', 'casino'] },
  { label: 'Events / Tickets', keywords: ['events / tickets', 'landmark web', 'ticketmaster', 'eventbrite'] },
];

/** Maps each section id to its bucket list. */
export const SECTION_BUCKETS: Readonly<Record<string, readonly Bucket[]>> = {
  vehicle: VEHICLE_BUCKETS,
  meals: MEALS_BUCKETS,
  home: HOME_BUCKETS,
  business: BUSINESS_BUCKETS,
  personal: PERSONAL_BUCKETS,
};

// ─────────────────────────────────────────────────────────────────────────────
// CLASSIFICATION FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Classify transactions into tax sections using FIRST-MATCH-WINS.
 *
 * Each transaction is assigned to exactly one section. Once claimed,
 * it cannot be claimed by a subsequent section.
 *
 * This exactly reproduces TaxWorkspacePage.tsx sectionResults logic.
 */
export function classifyTransactions(
  transactions: ClassifiableTransaction[],
  sections: readonly TaxSectionDef[] = TAX_SECTIONS,
): Map<string, SectionResult> {
  const results = new Map<string, SectionResult>();
  const claimed = new Set<number>();

  for (const section of sections) {
    const matched: ClassifiableTransaction[] = [];
    transactions.forEach((tx, idx) => {
      if (claimed.has(idx)) return;
      if (section.matchFn(tx)) {
        matched.push(tx);
        claimed.add(idx);
      }
    });

    const total = matched.reduce((sum, tx) => sum + Math.abs(tx.amount ?? 0), 0);
    results.set(section.id, {
      id: section.id,
      title: section.title,
      transactions: matched,
      total,
      count: matched.length,
    });
  }

  return results;
}

/**
 * Group transactions into predefined subcategory buckets by matching
 * subcategory label/keyword first, then merchant name against keywords.
 * Unmatched transactions go to "Other".
 *
 * This exactly reproduces TaxWorkspacePage.tsx groupIntoBuckets() logic.
 */
export function groupIntoBuckets(
  txs: ClassifiableTransaction[],
  buckets: readonly Bucket[],
): BucketResult[] {
  const map = new Map<string, { count: number; total: number }>();
  for (const b of buckets) map.set(b.label, { count: 0, total: 0 });
  map.set('Other', { count: 0, total: 0 });

  for (const tx of txs) {
    const merch = (tx.merchant_name || tx.merchant || '').toLowerCase();
    const subcat = (tx.subcategory || '').toLowerCase();
    let matched = false;

    // 1) Subcategory exact match against bucket label or keywords
    if (subcat) {
      for (const b of buckets) {
        if (
          b.label.toLowerCase() === subcat ||
          b.keywords.some((kw) => subcat === kw.toLowerCase())
        ) {
          const entry = map.get(b.label)!;
          entry.count += 1;
          entry.total += Math.abs(tx.amount ?? 0);
          matched = true;
          break;
        }
      }
    }

    // 2) Merchant keyword contains match
    if (!matched) {
      for (const b of buckets) {
        if (b.keywords.some((kw) => merch.includes(kw.toLowerCase()))) {
          const entry = map.get(b.label)!;
          entry.count += 1;
          entry.total += Math.abs(tx.amount ?? 0);
          matched = true;
          break;
        }
      }
    }

    // 3) Unmatched → Other
    if (!matched) {
      const entry = map.get('Other')!;
      entry.count += 1;
      entry.total += Math.abs(tx.amount ?? 0);
    }
  }

  const rows: BucketResult[] = [];
  for (const b of buckets) {
    const entry = map.get(b.label)!;
    rows.push({ label: b.label, count: entry.count, amount: entry.total });
  }
  const other = map.get('Other')!;
  if (other.count > 0 || other.total > 0) {
    rows.push({ label: 'Other', count: other.count, amount: other.total });
  }
  return rows;
}
