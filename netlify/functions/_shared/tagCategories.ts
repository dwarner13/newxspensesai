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
