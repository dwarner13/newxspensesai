# Tag AI Categorization System Guide

**Status:** ✅ Production Ready  
**Last Updated:** October 2025  
**Version:** 2.0

---

## Overview

A comprehensive, intelligent transaction categorization system with:

- ✅ **System + User Categories** — Defaults (Groceries, Utilities) + custom (Pet Supplies)
- ✅ **Hierarchical Organization** — Parent > Child (Food > Groceries)
- ✅ **Merchant Normalization** — "AMZN.COM/AMZONS3" → "Amazon"
- ✅ **Confidence Scoring** — 0-100% for AI-suggested categories
- ✅ **Rule-Based Categorization** — Pattern matching (ILIKE, regex)
- ✅ **Alias Mapping** — Multiple merchant names → single category
- ✅ **User Learning** — Corrections build better rules
- ✅ **Caching & Performance** — Sub-millisecond category lookups

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Transaction Received                          │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
        ┌────────────────────────────┐
        │  Extract Vendor Name       │
        │  (AMZN.COM/AMZONS3)        │
        └────────────┬───────────────┘
                     │
                     ▼
        ┌────────────────────────────┐
        │  1. Try Rules (ILIKE/regex)│ ← Fastest
        │  e.g., "AMZN%" → Shopping  │
        └────────────┬───────────────┘
                     │
              ┌──────▼──────┐
              │   Match?    │
              └──┬───────┬──┘
                 │       │
            Yes  │       │  No
                 ▼       ▼
            [Return]   2. Try Aliases
                     e.g., "AMZN" → Shopping
                     │
              ┌──────▼──────┐
              │   Match?    │
              └──┬───────┬──┘
                 │       │
            Yes  │       │  No
                 ▼       ▼
            [Return]   3. Normalize Merchant
                     Learn from history
                     │
              ┌──────▼──────┐
              │   Match?    │
              └──┬───────┬──┘
                 │       │
            Yes  │       │  No
                 ▼       ▼
            [Return]   4. AI Suggestion
                     Use Crystal/GPT
                     │
                     ▼
              [Return + Score]
```

---

## Core Types

### `Category` — Organizing Unit

```typescript
type Category = {
  id: UUID;
  user_id: UUID | null;    // null = system, UUID = user-specific
  name: string;            // "Groceries", "Pet Supplies"
  slug: string;            // "groceries", "pet-supplies" (URL-safe)
  parent_id: UUID | null;  // Hierarchical (Food > Groceries)
  icon?: string;           // 🛒, 🏥, etc.
  is_active: boolean;      // Soft-delete
  created_at: string;
  updated_at: string;
};
```

**Examples:**
```typescript
// System category
{
  id: "uuid-groceries",
  user_id: null,
  name: "Groceries",
  slug: "groceries",
  parent_id: null,
  icon: "🛒",
  is_active: true
}

// User category (child of Food)
{
  id: "uuid-pet-supplies",
  user_id: "user-123",
  name: "Pet Supplies",
  slug: "pet-supplies",
  parent_id: "uuid-food",
  icon: "🐾",
  is_active: true
}
```

### `CategoryRule` — Pattern-Based Mapping

```typescript
type CategoryRule = {
  id: UUID;
  user_id: UUID | null;
  merchant_pattern: string;   // "COSTCO%", "^AMAZON", etc.
  category_id: UUID;
  priority: number;           // 0-100 (lower = evaluate first)
  match_type: "ilike" | "regex";
  source: "user" | "ai" | "system";
  created_at: string;
};
```

**Examples:**
```typescript
// User rule (highest priority)
{
  merchant_pattern: "COSTCO%",
  category_id: "uuid-groceries",
  priority: 10,  // Evaluated first
  source: "user"
}

// System rule (lower priority)
{
  merchant_pattern: "^AMAZON",
  category_id: "uuid-shopping",
  priority: 100,  // Evaluated later
  source: "system"
}
```

### `CategorizationResult` — Output

```typescript
type CategorizationResult = {
  transaction_id: UUID;
  category_id: UUID | null;
  category_name?: string;
  confidence: number;  // 0-100
  reason: "rule_match" | "alias_match" | "ai_suggestion" | "default" | "none";
  matched_rule?: {
    pattern: string;
    priority: number;
    type: string;
  };
};
```

---

## Client-Side API (`src/lib/categories.ts`)

### Fetch Categories

```typescript
import { fetchCategoriesTree, fetchCategoryById, searchCategories } from '@/lib/categories';

// Get all system + user categories
const cats = await fetchCategoriesTree(userId);

// Get single category by ID
const cat = await fetchCategoryById("uuid-groceries");

// Search by name
const results = await searchCategories("groc", userId);
// Returns: [{ name: "Groceries", ... }]
```

### Find Category by Name/Slug

```typescript
import { findCategoryIdByNameOrSlug, findCategoryByAnyName } from '@/lib/categories';

// Find by exact name or slug
const id = await findCategoryIdByNameOrSlug("Groceries", userId);
// Returns: "uuid-groceries"

// Try multiple names (first match wins)
const id = await findCategoryByAnyName(
  ["groceries", "grocery", "food"],
  userId
);
// Returns: "uuid-groceries"
```

### Hierarchy & Paths

```typescript
import { fetchCategoryHierarchy, getCategoryPath } from '@/lib/categories';

// Get tree structure
const { roots, children } = await fetchCategoryHierarchy(userId);
// roots: [Food, Transport, ...]
// children["uuid-food"]: [Groceries, Dining Out, ...]

// Get full path to category
const path = await getCategoryPath("uuid-pet-supplies", userId);
// Returns: [Food, Pet Supplies]
// Display: "Food > Pet Supplies"
```

### Aliases & Normalization

```typescript
import { fetchCategoryAliases, fetchNormalizedMerchant } from '@/lib/categories';

// Get all aliases for a category
const aliases = await fetchCategoryAliases("uuid-shopping");
// Returns: ["AMZN", "AMAZON.COM", "AMAZON PRIME", ...]

// Get normalized merchant name
const norm = await fetchNormalizedMerchant("AMZN.COM/AMZONS3", userId);
// Returns: { vendor_raw, merchant_norm: "Amazon", category_id?, ... }
```

### Batch Operations

```typescript
import { fetchCategoriesByIds } from '@/lib/categories';

// Batch fetch categories
const map = await fetchCategoriesByIds([
  "uuid-groceries",
  "uuid-dining",
  "uuid-shopping"
]);
// Returns: Map { "uuid-groceries" => Category, ... }
```

---

## Server-Side API (`netlify/functions/_shared/categories.ts`)

### Resolve Category ID

```typescript
import { resolveCategoryId, getAllCategories } from './_shared/categories';

// Resolve name/slug to ID (with fallback)
const id = await resolveCategoryId(userId, "Groceries");
// Returns: "uuid-groceries"

// Resolve with custom fallback
const id = await resolveCategoryId(userId, "Unknown", "uncategorized");
// If "Unknown" not found, returns "uuid-uncategorized"
```

### Get/Create Categories

```typescript
import { getOrCreateCategory, getCategoryByName } from './_shared/categories';

// Get or create if doesn't exist
const cat = await getOrCreateCategory(userId, "Pet Supplies");
// If exists: returns existing
// If not: creates new user category

// Get by name
const cat = await getCategoryByName(userId, "Groceries");
// Searches user + system categories
```

### Batch Resolution

```typescript
import { resolveCategoryIdBatch, findBestMatchingCategory } from './_shared/categories';

// Resolve multiple at once
const map = await resolveCategoryIdBatch(userId, [
  "Groceries",
  "Dining Out",
  "Unknown"
]);
// Returns: Map {
//   "Groceries" => "uuid-groceries",
//   "Dining Out" => "uuid-dining",
//   "Unknown" => "uuid-uncategorized"
// }

// Find best match from possibilities
const id = await findBestMatchingCategory(userId, [
  "groceries",
  "grocery",
  "food"
]);
// Tries each in order, returns first match
```

### Caching

```typescript
import { clearCategoryCache } from './_shared/categories';

// Clear all cache
clearCategoryCache();

// Clear user's cache only
clearCategoryCache(userId);
```

**Cache TTL:** 5 minutes per entry  
**Performance:** Sub-millisecond lookups after cache hit

---

## UI Components

### CategoryPill — Inline Editor

```typescript
import { CategoryPill } from '@/ui/components/CategoryPill';

<CategoryPill
  value={categoryId}
  onChange={(id) => updateTransaction(id)}
  confidence={0.92}     // 0-1 or 0-100, will normalize
  editable={true}
  compact={false}       // true = table view, false = button
  userId={userId}
/>
```

**Features:**
- Confidence color coding: 🔴 <60% | 🟡 60-85% | 🟢 >85%
- Searchable dropdown
- Hierarchical display ("Food > Groceries")
- Keyboard support (Escape, Enter)
- Click-outside to close

**Compact mode** (for tables):
```
 🟢 Food > Groceries 92%
```

**Full mode** (standalone):
```
 🟢 ✓ Food > Groceries 92% ▼
 ┌─────────────────────────┐
 │ Search categories...    │
 ├─────────────────────────┤
 │ — Uncategorized —       │
 │ Food                    │
 │  └ Groceries       ✓    │
 │  └ Dining Out           │
 └─────────────────────────┘
```

---

## Integration Patterns

### Pattern 1: Auto-Categorize on Import

```typescript
// In byte-ocr-parse.ts or categorize-transactions.ts
import { resolveCategoryId } from './_shared/categories';

export const handler: Handler = async (event) => {
  const { transactions, userId } = /* parse */;

  for (const txn of transactions) {
    // 1) Try rules via database
    let categoryId = await dbCheckRules(txn.vendor_raw, userId);

    // 2) Fallback to default
    if (!categoryId) {
      categoryId = await resolveCategoryId(userId, txn.description);
    }

    // 3) If still none, use uncategorized
    if (!categoryId) {
      categoryId = await resolveCategoryId(userId, "", "uncategorized");
    }

    await updateTransaction(txn.id, { category_id: categoryId });
  }
};
```

### Pattern 2: User Correction → Learn

```typescript
// In category-correct.ts
import { resolveCategoryId, getOrCreateCategory } from './_shared/categories';

export const handler: Handler = async (event) => {
  const { transactionId, userId, newCategoryName } = /* parse */;

  // 1) Resolve category
  let categoryId = await resolveCategoryId(userId, newCategoryName);
  if (!categoryId) {
    // Create if new user category
    const cat = await getOrCreateCategory(userId, newCategoryName);
    categoryId = cat?.id;
  }

  // 2) Update transaction
  await updateTransaction(transactionId, { category_id: categoryId });

  // 3) Learn: add rule if vendor pattern not already matched
  const oldCat = await getTransactionCategory(transactionId);
  if (oldCat.id !== categoryId) {
    await createCategoryRule(userId, txn.vendor_raw, categoryId, "user");
  }

  // 4) Notify user
  await notify({
    userId,
    employee: "tag-ai",
    priority: "info",
    title: `Learned: "${txn.vendor_raw}" → "${newCategoryName}"`,
    payload: { ruleCreated: true },
  });
};
```

### Pattern 3: Category-Aware Reporting

```typescript
// Spending by category
import { fetchCategoriesTree, getAllCategories } from '@/lib/categories';

async function getSpendingByCategory(userId: string, monthStart: Date) {
  const categories = await fetchCategoriesTree(userId);
  const catMap = new Map(categories.map(c => [c.id, c]));

  const txns = await getTransactions(userId, monthStart);
  const spending: Record<string, number> = {};

  for (const txn of txns) {
    const catName = catMap.get(txn.category_id)?.name || "Uncategorized";
    spending[catName] = (spending[catName] || 0) + Math.abs(txn.amount);
  }

  return Object.entries(spending)
    .sort(([, a], [, b]) => b - a)
    .map(([name, total]) => ({ name, total }));
}
```

---

## Data Flow: Full Example

### Scenario: CSV Import with Auto-Categorization

```
1. User uploads CSV with "AMZN.COM" in vendor column

2. byte-ocr-parse.ts parses CSV:
   - Detects vendor: "AMZN.COM"

3. categorize-transactions.ts categorizes:
   - Checks rules: RULE "^AMAZON" → Shopping ✓
   - Sets: category_id = "uuid-shopping", confidence = 95%

4. SmartImportAI.tsx shows preview:
   <CategoryPill
     value="uuid-shopping"
     confidence={0.95}
     editable={true}
   />
   // Shows: 🟢 ✓ Shopping 95%

5. User clicks "Approve":
   - Commits to transactions table
   - Prime notified
   - Crystal analyzes spending

6. If user edits category to "Entertainment":
   - category-correct.ts learns new rule:
     Pattern: "AMZN.COM", Category: "Entertainment"
   - Logs for analytics
   - Future "AMZN.COM" → "Entertainment"
```

---

## Database Schema

### `categories` table

```sql
create table public.categories (
  id uuid primary key,
  user_id uuid references auth.users(id),  -- null = system
  name text not null,
  slug text not null unique,
  parent_id uuid references public.categories(id),
  icon text,
  is_active boolean default true,
  created_at timestamptz,
  updated_at timestamptz
);

-- Indices
create index on public.categories(user_id, is_active);
create index on public.categories(slug);
create index on public.categories(parent_id);
```

### `category_rules` table

```sql
create table public.category_rules (
  id uuid primary key,
  user_id uuid,                  -- null = system rule
  merchant_pattern text not null,
  category_id uuid not null references public.categories(id),
  priority int not null default 100,  -- lower = evaluate first
  match_type text not null,      -- 'ilike' or 'regex'
  source text,                   -- 'user', 'ai', 'system'
  confidence numeric(5,2),
  created_at timestamptz
);

create index on public.category_rules(user_id, priority);
```

### `category_aliases` table

```sql
create table public.category_aliases (
  id uuid primary key,
  user_id uuid,                  -- null = system
  category_id uuid not null references public.categories(id),
  alias text not null,           -- "AMZN", "AMAZON.COM", etc.
  confidence numeric(5,2),
  created_at timestamptz
);

create unique index on public.category_aliases(user_id, alias, category_id);
```

---

## Best Practices

1. **Use `resolveCategoryId()` for name→ID** — Handles fallbacks, caching
2. **Always provide fallback category** — "Uncategorized" is safe default
3. **Cache category lookups** — 5-min TTL automatically managed
4. **Log category changes** → `category_history` for auditing
5. **Use user + system categories** — System for defaults, user for custom
6. **Test category paths** — Ensure hierarchies display correctly
7. **Batch resolve when possible** — `resolveCategoryIdBatch()` is faster
8. **Display confidence in UI** — Users trust high-confidence suggestions
9. **Learn from corrections** — Update rules when users override
10. **Monitor rule coverage** — Alert if >20% "Uncategorized"

---

## Troubleshooting

### Issue: Category not found after creation

**Cause:** Cache miss  
**Fix:** Call `clearCategoryCache(userId)` or wait 5 minutes

### Issue: User categories not showing in dropdown

**Cause:** Missing `userId` parameter  
**Fix:** Pass `userId` to `fetchCategoriesTree(userId)`

### Issue: Hierarchy not displaying correctly

**Cause:** `parent_id` references deleted parent  
**Fix:** Verify parent exists and is active: `parent_id IS NULL OR parent_id IN (SELECT id FROM categories WHERE is_active)`

### Issue: Rules not matching

**Cause:** Pattern escaping or ILIKE vs regex mismatch  
**Fix:** Test pattern in SQL:
```sql
SELECT * FROM categories c
WHERE c.name ILIKE 'AMAZON%';  -- % is wildcard for ILIKE
```

---

## Future Enhancements

- [ ] Category aliases in UI (suggest "AMZN" → "Amazon" normalization)
- [ ] Bulk category reassignment (move all X → Y)
- [ ] Category templates (import standard categories per industry)
- [ ] Advanced rules (amount-based, time-based, combined patterns)
- [ ] Category merging (combine similar user categories)
- [ ] ML-based confidence calibration
- [ ] Export/import rules (share with team)

---

## Related Documentation

- [TAG_2_0_COMPLETE.md](./TAG_2_0_COMPLETE.md) — Tag AI system
- [NOTIFY_API_GUIDE.md](./NOTIFY_API_GUIDE.md) — Notifications from Tag
- [SMART_IMPORT_QUICK_START.md](./SMART_IMPORT_QUICK_START.md) — Import + categorization flow
- [src/types/tag.ts](./src/types/tag.ts) — All TypeScript types

---

**Questions?** See examples in `src/lib/categories.ts` or `netlify/functions/_shared/categories.ts`.





