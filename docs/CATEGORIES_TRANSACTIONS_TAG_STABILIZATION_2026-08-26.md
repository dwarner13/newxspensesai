# Categories + Transactions + Tag Stabilization Checkpoint

**Date:** August 26, 2026
**Branch:** `sidebar-safe-refactor`
**HEAD:** `c629dcff`

## Known-Good Commits

| SHA | Description |
|-----|-------------|
| `c629dcff` | Sign/category safety added to Auto-Tag All path |
| `c8d7a8a3` | P0 categorization fixes — GFS split, Costco Gas, user correction priority, sign safety |
| `9d57dbd4` | Two-turn search so Tag composes conversational replies |
| `9f3189fd` | Secure transaction search tool for Tag Copilot |

---

## 1. System Architecture

### End-to-End Flow

```
Statement upload
  -> OCR (Google Vision, Claude Vision fallback)
  -> normalize-transactions.ts (schema mapping)
  -> transactions_staging (staging table)
  -> reconciliation gate (balance verification)
  -> commit-import.ts (staging -> transactions table)
  -> apply-category-rules.ts (categorization pass)
  -> user learning (vendor_category_memory, category_rules)
  -> Tag Copilot (conversational recategorization)
```

### Ownership Boundaries

| System | Owns | Does NOT Touch |
|--------|------|----------------|
| **OCR/Vision** | Text extraction, confidence scoring | Categories, amounts, reconciliation |
| **Normalizer** | Schema mapping, date parsing, amount parsing | Categories (may assign initial guess) |
| **Reconciliation** | Balance verification, integrity gate | Categories, merchant names |
| **commit-import.ts** | Move staging -> transactions, initial category (with sign safety) | OCR text, parsed amounts |
| **apply-category-rules.ts** | Category, subcategory, category_source on committed rows | Amount, type, merchant_name (parser-owned) |
| **tag-categorize-committed.ts** | Category on uncategorized committed rows (Auto-Tag All) | Already-categorized rows, amounts |
| **Tag Copilot** | User-directed category changes, rule creation, search | Amounts, OCR, reconciliation |
| **Frontend** | Display, local state, user interactions | Backend categorization logic |

---

## 2. Categorization Precedence

The following is the **actual implemented priority chain** in `apply-category-rules.ts` (lines 607-678), verified against source code at commit `c629dcff`.

```
Priority 0: vendor_category_memory     (source: 'learned')
Priority 1: category_rules DB          (source: 'tag_rule')
Priority 2: HARDCODED_OVERRIDES        (source: 'hardcoded')
Priority 3: merchantCategoryMap        (source: 'tag_rule')
Priority 4: tagDefaultRules            (source: 'tag_rule')
Priority 5: Inline rules (legacy)      (source: 'tag_rule')
Fallback:   Needs Review               (source: 'needs_review')
```

User-specific rules (Priority 0-1) always override system defaults (Priority 2+). A hardcoded default cannot silently overwrite a learned user correction.

### Auto-Tag All (tag-categorize-committed.ts)

Operates only on rows where `category IS NULL OR 'Uncategorized' OR 'Other'`. Priority:

```
1. vendor_category_memory    (source: 'learned')
2. category_rules DB         (source: 'tag_rule')
3. merchantCategoryMap       (source: 'merchant_map')
4. Inline RULES array        (source: 'inline_rule')
Fallback: Needs Review       (source: 'needs_review')
```

Does NOT have HARDCODED_OVERRIDES. Does NOT touch already-categorized rows.

---

## 3. User-Learning Behavior

### Tables

| Table | Purpose | Key | Scope |
|-------|---------|-----|-------|
| `vendor_category_memory` | Learned merchant-to-category mappings | `(user_id, vendor_key)` | Per-user |
| `category_rules` | User-defined categorization rules | `(user_id, match_type, match_value)` | Per-user |
| `tag_category_feedback` | Audit trail of category corrections | `(user_id, transaction_id)` | Per-user |

All three tables have RLS enabled. No cross-user data access is possible.

### Write Paths

| UI / Trigger | Writes `vendor_category_memory` | Writes `category_rules` | Writes `tag_category_feedback` |
|-------------|:---:|:---:|:---:|
| TransactionDetailPanel "Save & Learn" | NO | YES | NO |
| TransactionInsightDrawer quick-category | YES (via tag-learn) | NO | YES |
| TransactionInsightDrawer "Tag will remember" | YES (via tag-action) | YES (via tag-action) | NO |
| Tag Copilot `set_category_rule` | YES | YES | NO |
| Tag Action `commit` intent | YES | YES | NO |
| Tag Action `save_rule` intent | YES | YES | NO |
| tag-learn.ts (called by tx-update-category) | YES | NO | YES |

### Read Paths

| Consumer | Reads `vendor_category_memory` | Reads `category_rules` |
|----------|:---:|:---:|
| apply-category-rules.ts | YES (Priority 0) | YES (Priority 1) |
| tag-categorize-committed.ts | YES (Priority 1) | YES (Priority 2) |
| tag-categorize-batch.ts | YES | YES |
| tag-copilot.ts (context) | YES | YES |
| tag-background-sweep.ts | NO | YES |
| tag-inbox.ts | NO | YES |

### Known Difference Between Save & Learn Paths (P2)

`TransactionDetailPanel` writes `category_rules` but NOT `vendor_category_memory`.
`TransactionInsightDrawer` quick-category writes `vendor_category_memory` but NOT `category_rules`.

Both are sufficient to override hardcoded defaults. A stale-memory conflict requires the user to correct the same merchant via both panels at different times with different categories. Classified P2 because:

- The scenario is unlikely in normal usage
- Both tables are user-scoped (no cross-user risk)
- Tag-mediated paths (Copilot, tag-action) do dual writes and are consistent
- The fix is straightforward but should be tested with real user interaction

---

## 4. Golden Merchant Cases

These are the verified expected behaviors for merchants that historically caused categorization errors.

| Merchant String | Amount | Expected Category | Expected Subcategory | Rule Source |
|----------------|--------|-------------------|---------------------|-------------|
| GORDON FOOD SER PAY/PAY | +$1,793.86 | Income | Employment | HARDCODED_OVERRIDES line 78 |
| GORDON FOOD SER AP/CC | -$988.16 | Groceries | Food Supply | HARDCODED_OVERRIDES line 80 |
| GFS EDMONTON | -$3.14 | Groceries | Food Supply | merchantCategoryMap |
| GFS PAY | +$1,200.00 | Income | Employment | HARDCODED_OVERRIDES line 79 |
| COSTCO GAS BAR | -$92.51 | Transportation | Gas & Fuel | HARDCODED_OVERRIDES line 70 |
| COSTCO WHOLESALE | -$190.27 | Groceries | (none) | HARDCODED_OVERRIDES line 71 |
| COSTCO | -$150.00 | Groceries | (none) | HARDCODED_OVERRIDES line 71 |

**Key invariants:**
- `GORDON FOOD SER PAY` and `GFS PAY` precede generic `GORDON FOOD SER` in the HARDCODED_OVERRIDES array (first match wins)
- `COSTCO GAS` precedes generic `COSTCO` in the HARDCODED_OVERRIDES array
- `GFS EDMONTON` has no hardcoded override; falls through to merchantCategoryMap which maps to Groceries

---

## 5. Sign/Category Safety

Three automatic categorization paths protect against the impossible combination of negative amount + Income category. This prevents expense transactions from being silently misclassified as income.

| Path | File | Location | Added In |
|------|------|----------|----------|
| Import commit | `commit-import.ts` | Before return, checks `signedAmount < 0 && category === 'Income'` | `c8d7a8a3` |
| Post-commit rules | `apply-category-rules.ts` | Step 5b (lines 680-695) | `c8d7a8a3` |
| Auto-Tag All | `tag-categorize-committed.ts` | Step 4b (lines 307-320) | `c629dcff` |

### Behavior

- **Automatic** source + negative amount + Income -> route to **Needs Review** (source: `sign_conflict`)
- **Positive** amount + Income -> allowed (legitimate payroll, deposits)
- **User corrections** (source: `learned`, `tag_rule`, `tag_single`) are NEVER overridden by the safety check. User intent is respected even if the combination looks unusual.

### Source Classification

| Source | Treated As | Safety Check Applies? |
|--------|-----------|----------------------|
| `learned` | User correction | No (exempt) |
| `tag_rule` | User-created rule | No (exempt) |
| `tag_single` | User-directed via Tag | No (exempt) |
| `hardcoded` | System default | Yes |
| `inline_rule` | System default | Yes |
| `merchant_map` | System default | Yes |
| `ai` | AI-generated | Yes |
| `null` / `''` / `'none'` / `'rule'` | Automatic | Yes |

---

## 6. Tag Copilot Architecture

### Data Access

Tag Copilot (`tag-copilot.ts`) operates with two data modes:

**Aggregate context** (always available): Category totals, merchant summaries, and transaction counts are injected into the system prompt from the user's data. Tag can report "you have 47 Groceries transactions totaling $3,200" without searching.

**Individual transactions** (via `search_transactions` tool): Tag can retrieve specific transactions with full details including IDs.

### search_transactions Tool

- **READ-ONLY** — does not modify data
- **User-scoped** — enforced by `verifyAuth()` + `.eq('user_id', auth.userId)` on every query
- **Default limit:** 25 rows
- **Hard maximum:** 200 rows
- **Returns metadata:** `{ transactions, totalMatches, returnedCount }`
- **Allowlisted fields:** `id, merchant_name, amount, category, subcategory, posted_at, date, description, import_id`

### Two-Turn Read-Tool Flow

When Tag calls `search_transactions`:

1. Tool executes server-side, returns structured data
2. Results are fed back to Claude as a `tool_result` message (machine-readable, never user-facing)
3. Claude composes a conversational summary in a second API call
4. If the second call fails or times out (5s), a deterministic merchant-grouped fallback is used
5. **Raw rows, UUIDs, and ISO timestamps never appear in user-facing output**

### Transaction IDs

- IDs are returned by `search_transactions` and available to the model internally
- The model uses IDs for subsequent `update_single_transaction` calls
- IDs remain internal to the tool flow — they are not exposed in chat text
- The system prompt explicitly instructs Tag not to display raw database values

### Write Tools

| Tool | Purpose | Confirmation |
|------|---------|-------------|
| `update_single_transaction` | Change one transaction's category | Prompt-enforced |
| `set_category_rule` | Save permanent rule + apply to matching transactions | Prompt-enforced |
| `bulk_recategorize` | Move all transactions from one category to another | Prompt-enforced |
| `rename_merchant` | Fix mangled merchant names | Prompt-enforced |

All write tools set `category_source` to distinguish their changes:
- `update_single_transaction` -> `'tag_single'`
- `set_category_rule` -> `'tag_rule'`
- `bulk_recategorize` -> `'tag_bulk'`

---

## 7. Recategorization Behavior

### Single Transaction Change

**Flow:** User selects category in UI -> `POST tx-update-category` -> updates `transactions.category` directly in DB -> vendor learning fires (via `tag-learn`) -> toast confirmation

**Persistence:** Direct DB write. No ephemeral/optimistic layer. Survives page reload.

### Save & Learn

**Flow:** Category change triggers vendor learning which writes to `vendor_category_memory` (and optionally `category_rules`). Future categorization runs check vendor memory at Priority 0.

**Durability:** A learned correction survives:
- Page reload (direct DB write)
- Future statement imports (apply-category-rules checks vendor_memory first)
- Auto-Tag All runs (tag-categorize-committed checks vendor_memory first)
- Tag Copilot context rebuilds (reads vendor_memory for merchant context)

### Same-Merchant Propagation

When `tag-learn.ts` fires, it:
1. Writes to `vendor_category_memory` keyed by normalized vendor name
2. Retroactively applies to existing `needs_review` rows in staging
3. Future transactions with the same normalized vendor key receive the learned category at Priority 0

### Bulk Recategorization

- User-scoped: `.eq('user_id', auth.userId)` on every query
- Confirmation: prompt-enforced (model instructed to confirm before tool call)
- Does NOT create rules — only updates existing transactions
- Sets `category_source: 'tag_bulk'`

### UI Reflection

All UI surfaces read from the same `useTransactions()` hook:
- **TransactionsPageV2** — refetches on window focus, `transactions:refresh` event
- **CategoriesPageV2** — derives data via `useCategoriesData()` -> `useTransactions()`
- **DashboardHomeV2** — derives data via `useDashboardData()` -> `useTransactions()`
- **Supabase realtime subscription** — `postgres_changes` on `transactions` table, 450ms debounce

---

## 8. Acceptance Tests

### Categorization P0 Acceptance (`scripts/categorization-p0-acceptance.ts`)

**33/33 PASS** at commit `c629dcff`

| Section | Tests | Coverage |
|---------|-------|----------|
| Gordon Food Service split | 5 | PAY -> Income, AP/CC -> Groceries, GFS PAY variant |
| GFS EDMONTON not Income | 3 | Hardcoded null, merchant map Groceries |
| COSTCO GAS precedence | 4 | Gas -> Transportation, Wholesale -> Groceries, plain -> Groceries |
| User correction precedence | 2 | Learned overrides hardcoded, hardcoded works without learned |
| Sign/category safety | 6 | Negative auto Income blocked, positive allowed, user exempt, AI blocked |
| Golden examples | 5 | All 5 golden merchants verified |
| Auto-Tag All regression | 8 | Negative Income, positive payroll, COSTCO GAS, learned override, GFS PAY/AP, user memory, unmatched |

### Tag Search Acceptance (`scripts/tag-search-acceptance.ts`)

**12 tests** covering: category drilldown, merchant search, date range, ID validity, focused flow, write tools, user isolation, allowlisted fields, search metadata. Requires live auth token to run.

### Build Verification

- `npx tsc --noEmit --skipLibCheck` — clean (zero errors)
- `npx vite build` — succeeds in 22s
- `npm run lint` — zero warnings policy

---

## 9. Known Technical Debt

### P2-1: Dual Save & Learn Footprints

`TransactionDetailPanel` writes `category_rules` but not `vendor_category_memory`. `TransactionInsightDrawer` quick-category writes `vendor_category_memory` but not `category_rules`. A stale-memory conflict requires using both panels on the same merchant with different categories at different times. Low practical risk. Fix: add dual writes to both paths.

### P2-2: Prompt-Only Bulk Confirmation

Tag's `bulk_recategorize`, `set_category_rule`, and `rename_merchant` tools rely on LLM instruction-following for user confirmation. No server-side confirmation gate exists. A malfunctioning model could skip confirmation. Fix: two-step intent/confirm pattern.

### P2-3: Independent Rule Arrays

At least 7 independent copies of categorization rules exist across the codebase:

| File | Array | Entries | Synced? |
|------|-------|---------|---------|
| `apply-category-rules.ts` | `HARDCODED_OVERRIDES` | ~150 | Canonical |
| `tagDefaultRules.ts` | `TAG_DEFAULT_RULES` | ~99 | Shared module |
| `merchantCategoryMap.ts` | `MERCHANT_CATEGORY_MAP` | ~235 | Shared module |
| `tag-categorize-committed.ts` | `RULES` | ~35 | Independent copy |
| `tag-categorize-batch.ts` | `RULES` | ~15 | Independent copy |
| `_shared/categorize.ts` | `CATEGORY_RULES` | 9 | Independent copy |
| `ingest_statement_enhanced.ts` | local `rules` | 8 | Independent copy |

Changes to one array do not propagate to others. This is mitigated by:
- `vendor_category_memory` and `category_rules` (user corrections) take priority over all hardcoded arrays
- `tag-categorize-committed.ts` only operates on uncategorized rows
- The shared modules (`tagDefaultRules.ts`, `merchantCategoryMap.ts`) are imported where needed

Fix: consolidate into a single shared module. Not urgent because user corrections override all hardcoded rules.

### P2-4: Category Alias Duplication

`CATEGORY_ALIASES` / `normalizeCanonicalCategory()` is duplicated in `tag-categorize-committed.ts`, `tag-categorize-batch.ts`, and `tag-chat.ts`. Should be a shared module.

### P2-5: Second-Pass Reclassify in Auto-Tag All

`tag-categorize-committed.ts` has a second pass (lines 352-384) that reclassifies `category = 'Other'` rows using `matchMerchantMap`. This second pass does NOT go through the sign/category safety check. Low risk because no merchantCategoryMap entry maps a negative-typical merchant to Income.

---

## 10. DO NOT BREAK — Invariants

Future development MUST preserve the following invariants. Breaking any of these is a P0 regression.

### Transaction Integrity
- **Never change transaction amounts during categorization.** Category updates set `category`, `subcategory`, `category_source`, `subcategory_source`, and `updated_at`. They NEVER modify `amount`, `type`, or parser-owned fields.
- **Never weaken reconciliation to make imports pass.** The reconciliation gate exists to catch data integrity issues. If it fails, the import should fail — not bypass the gate.

### User Isolation
- **Never allow another user's rules, transactions, or memory to affect the authenticated user.** Every database query MUST include `.eq('user_id', auth.userId)`. The `user_id` MUST come from `verifyAuth()`, never from the request body or model output.

### Categorization Precedence
- **User-learned categorization must not silently lose to generic defaults.** `vendor_category_memory` (Priority 0) and `category_rules` (Priority 1) MUST be checked before `HARDCODED_OVERRIDES` (Priority 2) and below.
- **Automatic negative Income must be protected.** All three auto-categorization paths (`commit-import.ts`, `apply-category-rules.ts`, `tag-categorize-committed.ts`) must route automatic negative + Income to Needs Review.

### Tag Copilot
- **Transaction IDs remain available internally to Tag** for `update_single_transaction` and other write tools.
- **Internal IDs, raw ISO timestamps, and pipe-delimited database rows must not appear in normal Tag responses.** The two-turn `tool_result` pattern ensures Claude composes conversational summaries.
- **Committed transaction integrity must remain independent from AI presentation behavior.** Tag can display and discuss transactions, but its presentation layer must never modify the underlying data unless the user explicitly directs a change.

### Search Limits
- **Default search limit: 25 rows.** Prevents Tag from dumping hundreds of rows.
- **Hard maximum: 200 rows.** Enforced server-side in `txSearchCore.ts`.

---

## 11. Recovery Instructions

### For Future Developers and Claude Sessions

Before changing Categories, Transactions, categorization learning, or Tag Copilot, read this checkpoint first and compare current behavior against these invariants.

### If categorization is producing wrong results:

1. Check the priority chain in `apply-category-rules.ts` (lines 607-678). Has the ordering changed?
2. Check `vendor_category_memory` for the affected merchant: `SELECT * FROM vendor_category_memory WHERE vendor_key = '<normalized_key>' AND user_id = '<uid>'`. A stale learned entry at Priority 0 overrides everything.
3. Check `category_rules` for the affected merchant: `SELECT * FROM category_rules WHERE match_value ILIKE '%<merchant>%' AND user_id = '<uid>' AND is_active = true`.
4. Check `HARDCODED_OVERRIDES` array ordering — specific entries must precede generic ones (e.g., `COSTCO GAS` before `COSTCO`).
5. Run `npx tsx scripts/categorization-p0-acceptance.ts` to verify golden examples still pass.

### If Tag is showing raw data in chat:

1. Check that the two-turn `tool_result` pattern in `tag-copilot.ts` is intact (search for `toolResultContent`).
2. Verify the second Claude call has a timeout and deterministic fallback.
3. Verify `confirmationLine` is built from the model's reply or the fallback — never from raw query results.

### If user corrections are being overwritten:

1. Verify Priority 0 (`vendor_category_memory`) and Priority 1 (`category_rules`) are checked BEFORE Priority 2 (`HARDCODED_OVERRIDES`).
2. Check the `category_source` on the overwritten transaction. If it says `'hardcoded'`, the priority chain was bypassed.
3. Verify the correction was actually written to the learning tables (check both `vendor_category_memory` and `category_rules`).

### If negative transactions appear as Income:

1. Check the sign/category safety in all three paths:
   - `commit-import.ts` — search for `sign_conflict`
   - `apply-category-rules.ts` — search for `Step 5b`
   - `tag-categorize-committed.ts` — search for `Step 4b`
2. Check the `source` field. User sources (`learned`, `tag_rule`, `tag_single`) are exempt. If the source is `hardcoded`, `inline_rule`, `merchant_map`, or `ai`, the safety should have caught it.

### Relevant test commands:

```bash
npx tsx scripts/categorization-p0-acceptance.ts   # 33 deterministic tests
npx tsx scripts/tag-search-acceptance.ts           # 12 tests (requires auth)
npx tsc --noEmit --skipLibCheck                    # TypeScript check
npx vite build                                     # Production build
```

---

*This document is the canonical recovery/reference for the Categories + Transactions + Tag layer of XspensesAI as of August 26, 2026. It was generated from verified source code analysis, not from documentation or assumptions.*
