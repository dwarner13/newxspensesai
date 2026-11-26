/**
 * Single source of truth for Tag's category enumeration.
 *
 * Imported by both tag-copilot.ts (LLM tool schema) and tag-action.ts
 * (natural-language commit path). Divergence between the two paths
 * produces silent category drift in user data — keep these in sync.
 *
 * Drop here: netlify/functions/_shared/tagCategories.ts
 */

export const TAG_CATEGORIES = [
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
  'Recreation',
  'Transfers',
  'Bank Fees',
  'Business',
  'Personal Care',
  'Home & Garden',
  'Rent or Lease',
  'Debt Payments',
  'Savings',
  'Advertising',
  'Technology',
  'Other',
] as const;

export type TagCategory = typeof TAG_CATEGORIES[number];

/**
 * Free-text aliases. Keys are lowercased. Used by tag-action.ts to
 * normalize natural-language category input to the canonical list.
 * Add new aliases here when users consistently type a non-canonical name.
 */
export const TAG_CATEGORY_ALIASES: Record<string, TagCategory> = {
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

export function isCanonicalCategory(value: string): value is TagCategory {
  return (TAG_CATEGORIES as readonly string[]).includes(value);
}

/**
 * Normalize free-text category input → canonical category.
 * Returns 'Other' when nothing matches.
 */
export function normalizeCanonicalCategory(input: string): TagCategory {
  const key = String(input || '').trim().toLowerCase().replace(/\s+/g, ' ');
  if (!key) return 'Other';
  const direct = TAG_CATEGORIES.find((c) => c.toLowerCase() === key);
  if (direct) return direct;
  return TAG_CATEGORY_ALIASES[key] || 'Other';
}

// ─────────────────────────────────────────────────────────────────────────────
// T-LIVE-02: resolve a customer's category request WITHOUT silent substitution.
// normalizeCanonicalCategory() above falls back to 'Other' — fine for legacy bulk paths, wrong for a
// customer-confirmed change ("food and beverage" must never quietly become "Other").
// ─────────────────────────────────────────────────────────────────────────────

/** Words that point at a canonical category (customer vocabulary → category). */
const TAG_CATEGORY_HINT_WORDS: Record<string, TagCategory> = {
  food: 'Food & Dining', beverage: 'Food & Dining', beverages: 'Food & Dining', drink: 'Food & Dining', drinks: 'Food & Dining',
  restaurant: 'Food & Dining', restaurants: 'Food & Dining', catering: 'Food & Dining', meal: 'Food & Dining', meals: 'Food & Dining',
  coffee: 'Food & Dining', takeout: 'Food & Dining', eating: 'Food & Dining', lunch: 'Food & Dining', dinner: 'Food & Dining',
  grocery: 'Groceries', groceries: 'Groceries', supermarket: 'Groceries',
  gas: 'Transportation', fuel: 'Transportation', parking: 'Transportation', car: 'Transportation', transit: 'Transportation', taxi: 'Transportation',
  phone: 'Utilities', internet: 'Utilities', hydro: 'Utilities', electricity: 'Utilities',
  medical: 'Healthcare', pharmacy: 'Healthcare', dental: 'Healthcare',
  gym: 'Personal Care', massage: 'Personal Care', salon: 'Personal Care',
  clothing: 'Shopping', clothes: 'Shopping',
  flights: 'Travel', hotel: 'Travel', hotels: 'Travel',
  fee: 'Bank Fees', interest: 'Bank Fees',
  loan: 'Debt Payments', debt: 'Debt Payments',
};

const RESOLVE_STOPWORDS = new Set(['and', 'the', 'a', 'an', 'of', 'for', 'to', 'category', 'categories', 'expense', 'expenses', 'stuff']);

function categoryWords(s: string): string[] {
  return s.toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9 ]+/g, ' ').split(/\s+/)
    .filter(w => w && !RESOLVE_STOPWORDS.has(w));
}

export type CategoryResolution =
  /** The customer named a category (or a known alias) exactly. */
  | { status: 'exact'; category: TagCategory; subcategory: string | null; requested: string }
  /** Not a category name, but exactly one category is clearly meant: propose it AND say so. */
  | { status: 'closest'; category: TagCategory; subcategory: string | null; requested: string }
  /** Several categories fit, or none: ask; never propose. */
  | { status: 'ambiguous'; candidates: TagCategory[]; requested: string }
  | { status: 'unknown'; requested: string };

/**
 * Resolve free text ("food and beverage", "Food & Dining > Restaurants", "dining") to ONE canonical
 * category, or report that it can't. Never returns 'Other' unless the customer asked for Other.
 */
export function resolveCategoryRequest(raw: string): CategoryResolution {
  const requested = String(raw || '').trim().replace(/[.!?]+$/, '').trim();
  if (!requested) return { status: 'unknown', requested };
  let catPart = requested;
  let subcategory: string | null = null;
  for (const sep of ['>', '::', '/']) {
    const i = requested.indexOf(sep);
    if (i !== -1) {
      catPart = requested.slice(0, i).trim();
      subcategory = requested.slice(i + sep.length).trim() || null;
      break;
    }
  }
  const key = catPart.toLowerCase().replace(/\s+/g, ' ').replace(/^the /, '').replace(/ category$/, '');
  const keyAnd = key.replace(/&/g, 'and').replace(/\s+/g, ' ');
  const direct = TAG_CATEGORIES.find(c => {
    const ck = c.toLowerCase();
    return ck === key || ck.replace(/&/g, 'and') === keyAnd;
  });
  if (direct) return { status: 'exact', category: direct, subcategory, requested };
  const alias = TAG_CATEGORY_ALIASES[key] || TAG_CATEGORY_ALIASES[keyAnd];
  if (alias) return { status: 'exact', category: alias, subcategory, requested };

  // Closest: score each category by shared words + hint words.
  const words = categoryWords(catPart);
  if (words.length === 0) return { status: 'unknown', requested };
  const scores = new Map<TagCategory, number>();
  for (const c of TAG_CATEGORIES) {
    if (c === 'Other') continue;
    const cw = new Set(categoryWords(c));
    let score = 0;
    for (const w of words) {
      if (cw.has(w)) score += 2;
      else if (TAG_CATEGORY_HINT_WORDS[w] === c) score += 1;
    }
    if (score > 0) scores.set(c, score);
  }
  const ranked = [...scores.entries()].sort((a, b) => b[1] - a[1]);
  if (ranked.length === 0) return { status: 'unknown', requested };
  // Strict: only when every scoring word points at the SAME category. Two or more → ask.
  if (ranked.length > 1) {
    return { status: 'ambiguous', candidates: ranked.map(r => r[0]), requested };
  }
  return { status: 'closest', category: ranked[0][0], subcategory, requested };
}
