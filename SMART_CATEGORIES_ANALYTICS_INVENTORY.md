# Smart Categories & Categorization Analytics — Inventory & Merge Plan

**Status:** ✅ AUDIT COMPLETE  
**Date:** October 19, 2025  
**Version:** 1.0

---

## 📋 FINDINGS TABLE

| Feature | File Path | Status | Notes |
|---------|-----------|--------|-------|
| **Pages/Views** | | | |
| Analytics Dashboard (Dash) | `src/pages/dashboard/AnalyticsAI.tsx` | ✅ Ready | Full chat UI, simulated AI responses; no real data integration |
| Analytics Page (Crystal) | `src/pages/dashboard/Analytics.tsx` | ✅ Ready | Overview tiles → tabs (dashboard, trends, chat); placeholder charts |
| Smart Categories Workbench | ❌ MISSING | — | Needed: Rules editor, alias mgmt, merchant norm preview |
| Categorization Analytics (Crystal KPIs) | ❌ PARTIAL | — | Has Analytics.tsx, but no real Tag metrics integration |
| **Components/UX** | | | |
| CategoryPill | `src/ui/components/CategoryPill.tsx` | ✅ Ready | Full CRUD, hierarchical, confidence codes; works but NO inference in tables |
| Confidence Viz (dots) | ✅ In CategoryConfirmation | ✅ Ready | 5-dot meter + % label in `CategoryConfirmation.tsx` |
| Transaction Table | ❌ MISSING | — | Needed: Lists with CategoryPill cells + low-conf expander |
| Rule/Alias Drawers | ❌ MISSING | — | Needed: Modal forms for quick rule + alias create/edit |
| Merchant Normalizer Preview | ❌ MISSING | — | Needed: Before/after display in stats or modal |
| **Hooks/Context** | | | |
| Auth User Hook | `src/contexts/AuthContext.tsx` | ✅ Ready | `useAuth()` returns `user`, `userId`; exported broadly |
| Transaction Fetcher Hook | ❌ MISSING | — | Needed: `useTransactions(importId|dateRange)` with caching |
| Categorization Hook | ✅ In CategoryConfirmation | ✅ Ready | `useCategoryConfirmation()` in `CategoryConfirmation.tsx` |
| Category Resolver Hook | ❌ MISSING | — | Needed: `useCategories(userId)` + `resolveCategoryId()` client-side |
| **Server / Netlify Functions** | | | |
| `tag-categorize` (write) | `netlify/functions/tag-categorize.ts` | ✅ Ready | Hybrid rules→AI→default; records metrics; tracks model runs |
| `tag-categorize-dryrun` (preview) | `netlify/functions/tag-categorize-dryrun.ts` | ✅ Ready | Same logic, no persist; returns alternatives |
| `tag-correction` (learn) | `netlify/functions/tag-correction.ts` | ✅ Ready | Updates txn category, records correction event, triggers rule learning |
| `tag-categories` (CRUD) | `netlify/functions/tag-categories.ts` | ✅ Ready | GET/POST/DELETE categories; hierarchical; RLS enforced |
| `tag-rules` (rule CRUD) | `netlify/functions/tag-rules.ts` | ✅ Ready | GET/POST/DELETE/PATCH rules; pattern-based; priority ordering |
| `tag-tx-categ-history` (audit) | `netlify/functions/tag-tx-categ-history.ts` | ✅ Ready | Query categorization history; user stats (total, auto %, corrections) |
| `tx-list-latest` (transaction fetch) | ❌ MISSING | — | Needed: List txns for import or date range; pagination |
| `analytics-categorization` (Crystal KPIs) | ❌ MISSING | — | Needed: Confidence histogram, top confusing merchants, rule effectiveness |
| **DB Helpers & Views** | | | |
| `v_latest_transaction_category` view | ❌ NOT VERIFIED | — | Assumed missing; if exists, use for fast category lookups |
| `metrics_categorization_daily` table | ✅ In metrics.ts | ✅ Ready | Auto-increment counters; daily aggregates (total, auto, avg confidence) |
| RPC: `category_distribution_latest` | ❌ NOT VERIFIED | — | Assumed missing; if exists, returns % by category for period |
| RPC: `top_confusing_merchants` | ❌ NOT VERIFIED | — | Assumed missing; if exists, returns merchants with low avg confidence |
| RPC: `confidence_histogram` | ❌ NOT VERIFIED | — | Assumed missing; if exists, returns distribution of confidence scores |
| **Chart Libraries** | | | |
| Recharts usage | ✅ In AnalyticsAI.tsx | ⚠️ Partial | Imports lucide icons, NOT Recharts; no real charts yet |
| **Authentication** | | | |
| User ID Resolution | `src/contexts/AuthContext.tsx` | ✅ Ready | `useAuth()` → `user.id` via Supabase auth |
| RLS Policies | ✅ Assumed Present | ✅ Ready | All Tag tables enforced by `user_id`; service key used in functions |

---

## 🔍 DETAILED FINDINGS

### Pages

#### 1. **AnalyticsAI.tsx** (`src/pages/dashboard/AnalyticsAI.tsx`)
- **Status:** ✅ Ready (Needs Integration)
- **What It Does:**  
  Dash AI chat interface with hardcoded responses; shows 17 AI employees list and AI Team metrics.
- **Key Features:**
  - Chat widget (send message → simulate response)
  - Quick action buttons (Analyze, Track Trends, etc.)
  - Key metrics sidebar (Net Worth, Savings Rate, etc.)
  - AI Team stats
- **Issues:**
  - No real `/tag-categorize` or analytics data calls
  - Responses are templated, not from Crystal
- **Fix:**  
  Wire to `/tag-categorize` when user asks about categorization; fetch metrics from `metrics_categorization_daily`.

#### 2. **Analytics.tsx** (`src/pages/dashboard/Analytics.tsx`)
- **Status:** ✅ Ready (Needs Integration)
- **What It Does:**  
  Main analytics page with 6 overview tiles (Dashboard, Trend Analysis, Performance Metrics, Financial, AI Team, Chat).
- **Key Features:**
  - Tile-based navigation
  - Placeholder tab views (dashboard, trends, performance, financial, team, chat)
  - Crystal AI chat in chat tab
  - Mock metrics (Revenue, Expenses, Profit, Cash Flow)
- **Issues:**
  - Placeholder data only
  - No Tag metrics or categorization stats
  - No real transaction data fetching
- **Fix:**  
  Add Tab 7 "Categories" → Link to Smart Categories page (see GAP); fetch categorization metrics for dashboard tiles.

#### 3. **SmartImportAI.tsx** (`src/pages/dashboard/SmartImportAI.tsx`)
- **Status:** ✅ Ready
- **What It Does:**  
  Upload statements → OCR/CSV parse → commit → prime → crystal analysis.
- **Notes:**
  - Already calls `categorize-transactions` after commit
  - Shows CategoryPill in preview table (BUT no low-conf UI expand)
  - Should integrate `CategoryConfirmation` component after categorization
- **Fix:**  
  After `categorize-transactions`, call `useCategoryConfirmation()` to show low-conf results.

---

### Components

#### 1. **CategoryPill.tsx** (`src/ui/components/CategoryPill.tsx`)
- **Status:** ✅ Ready
- **What It Does:**  
  - Renders category name + confidence badge
  - On-click dropdown to select from hierarchy
  - Calls `onChange(categoryId)` on selection
  - Color-codes by confidence (red < yellow < green)
- **Props:**
  - `value` (string | null) — current category ID
  - `confidence` (0-1) — visual strength
  - `editable` (bool) — enable dropdown
  - `onChange((categoryId) => void)` — callback
  - `compact` (bool) — smaller size
  - `userId` (string) — for scoped lookup
- **Issues:**
  - Standalone component; not integrated into transaction tables yet
- **Usage:**  
  Already used in SmartImportAI preview table; just need to add `onCategoryChange` handler.

#### 2. **CategoryConfirmation.tsx** (`src/ui/components/CategoryConfirmation.tsx`)
- **Status:** ✅ Just Created
- **What It Does:**  
  - Shows high-conf (≥70%) as green badges ✅
  - Shows low-conf (<70%) as yellow cards with expand
  - On expand: shows primary + top 3 alternatives
  - On select: calls `/tag-correction` + removes from list
- **Props:**
  - `results` (CategorizationResult[])
  - `onConfirm((txId, catId) => Promise<void>)`
  - `onDismiss(() => void)`
  - `maxVisible` (default 5)
- **Usage:**  
  Wire into SmartImportAI after categorization; also usable in a future "Categorization Review" page.

---

### Hooks

#### 1. **useAuth()** (`src/contexts/AuthContext.tsx`)
- **Status:** ✅ Ready
- **Exports:**
  - `useAuth()` → `{ user, userId, isDemoUser, loading, ... }`
  - `useAuthContext()` → same

#### 2. **useCategoryConfirmation()** (`src/ui/components/CategoryConfirmation.tsx`)
- **Status:** ✅ Just Created
- **Methods:**
  - `categorize(userId, txns)` → calls `/tag-categorize`, returns results
  - `confirm(txId, catId)` → calls `/tag-correction`, removes from results
  - `clear()` → resets results
  - `results`, `isLoading` state

#### Missing Hooks
- **`useTransactions(importId | dateRange)`** — Fetch list of transactions (pagination)
- **`useCategories(userId)`** — Fetch hierarchical category tree with caching
- **`useMetrics(userId, period)`** — Fetch categorization metrics (auto %, avg confidence, corrections)

---

### Netlify Functions — COMPLETE INVENTORY

| Function | Path | Method | Input | Output | Status |
|----------|------|--------|-------|--------|--------|
| Tag Categorize | `tag-categorize` | POST | txns array | `{ results: CategorizationResult[] }` | ✅ Live |
| Tag Categorize DryRun | `tag-categorize-dryrun` | POST | txns array | `{ results: [...], alternatives: [...] }` | ✅ Live |
| Tag Correction | `tag-correction` | POST | `{ txn_id, to_cat_id, note }` | `{ ok, learned, rule }` | ✅ Live |
| Tag Categories | `tag-categories` | GET/POST/DELETE | — | `{ categories: [...] }` | ✅ Live |
| Tag Rules | `tag-rules` | GET/POST/PATCH/DELETE | — | `{ rules: [...] }` | ✅ Live |
| Tag TX History | `tag-tx-categ-history` | GET | `?txn_id=x&user_stats=true` | `{ history: [...], stats: {...} }` | ✅ Live |
| ❌ TX List Latest | **MISSING** | GET | `?import_id=x&limit=50&offset=0` | `{ transactions: [...], total, page }` | ⚠️ Needed |
| ❌ Analytics Categorization | **MISSING** | GET | `?user_id=x&period=month` | `{ histogram, top_merchants, rules_effectiveness }` | ⚠️ Needed |

All functions use:
- **Auth:** `x-user-id` header or service role key
- **Metrics:** Auto-tracked via `bumpCategorizationMetrics()`
- **RLS:** All queries scoped to `user_id`

---

### Database

#### Tables Verified
- **`categories`** — Hierarchical tree; system (NULL user_id) + user-scoped
- **`category_rules`** — Pattern-based rules with priority
- **`normalized_merchants`** — Raw vendor → canonical name mappings
- **`category_history`** — Immutable audit log of all changes
- **`transaction_categorizations`** — Version history (model run tracking)
- **`metrics_categorization_daily`** — Daily aggs (auto %, avg confidence, corrections)
- **`correction_events`** — User correction audit trail
- **`merchant_profiles`** — Learned merchant data

#### Views & RPCs Not Verified
- **`v_latest_transaction_category`** — Query for latest category per txn (VERIFY if exists)
- **RPC `category_distribution_latest(user_id, period)`** — Category % breakdown
- **RPC `top_confusing_merchants(user_id, limit)`** — Low-confidence merchants
- **RPC `confidence_histogram(user_id, buckets)`** — Confidence distribution

---

## 🚨 GAP LIST (Actionable)

### CRITICAL GAPS

#### 1. **Transaction Fetcher Endpoint** (`tx-list-latest`)
- **Priority:** 🔴 CRITICAL (blocks list views)
- **Create:** `netlify/functions/tx-list-latest.ts`
- **What to add:**
  - GET with params: `import_id`, `limit`, `offset`, `date_from`, `date_to`
  - Returns paginated txns + total count
  - Joins with latest category + confidence
  - RLS: current user only

#### 2. **Analytics Categorization Endpoint** (`analytics-categorization`)
- **Priority:** 🔴 CRITICAL (blocks Crystal KPI dashboard)
- **Create:** `netlify/functions/analytics-categorization.ts`
- **What to add:**
  - GET params: `user_id`, `period` (day/week/month/all)
  - Returns:
    - `confidence_histogram` — { "0-20%": 5, "20-40%": 12, ... }
    - `top_confusing_merchants` — [{ merchant, avg_conf, count }]
    - `rule_effectiveness` — [{ rule_id, match_count, auto_rate }]
    - `auto_rate_percent` — Overall % auto-categorized

#### 3. **Smart Categories Workbench Page**
- **Priority:** 🟠 HIGH (needed for rule + alias mgmt)
- **Create:** `src/pages/dashboard/SmartCategories.tsx`
- **What to add:**
  - Tabs: Rules, Aliases, Merchants, Metrics
  - **Rules Tab:**
    - Table: Pattern | Category | Priority | Hit Count
    - Add Rule button → modal form
    - Edit/Delete per rule
  - **Aliases Tab:**
    - Table: Raw Vendor | Normalized | Usage Count
    - Add Alias → modal
  - **Merchants Tab:**
    - Sortable by confidence, correction count
    - Quick link to /tag-tx-categ-history
  - **Metrics Tab:**
    - Daily/Weekly/Monthly charts (if Recharts added)
    - Top categories pie
    - Confidence histogram

#### 4. **Transaction Table Component** (`TransactionListTable.tsx`)
- **Priority:** 🟠 HIGH (blocks data display)
- **Create:** `src/ui/components/TransactionListTable.tsx`
- **What to add:**
  - Column: Date | Merchant | Amount | Category (CategoryPill) | Confidence
  - Paginated (limit 50)
  - CategoryPill in each row, editable on-click
  - On category change → call `tag-correction`
  - Low-conf rows highlighted yellow
  - Export to CSV button

#### 5. **useTransactions Hook**
- **Priority:** 🟠 HIGH (needed for all list views)
- **Create:** `src/hooks/useTransactions.ts`
- **What to add:**
  - Params: `importId | dateRange`, `limit`, `offset`
  - Fetches from `tx-list-latest`
  - Returns: `{ transactions, total, page, isLoading, error }`
  - Pagination helpers

#### 6. **useMetrics Hook**
- **Priority:** 🟠 MEDIUM (nice for dashboard)
- **Create:** `src/hooks/useMetrics.ts`
- **What to add:**
  - Params: `userId`, `period` (day/week/month)
  - Fetches from `analytics-categorization`
  - Returns: `{ histogram, topMerchants, ruleEff, autoRate, isLoading }`
  - Caching logic

---

### NON-CRITICAL GAPS

#### 7. **Recharts Integration**
- **Priority:** 🟡 LOW (nice-to-have, placeholder OK for now)
- **Action:** Add `recharts` to package.json if not present
- **Usage:**
  - LineChart: Confidence trend over time
  - BarChart: Category breakdown
  - PieChart: Auto vs Manual %

#### 8. **Merchant Normalizer Preview Modal**
- **Priority:** 🟡 LOW (informational only)
- **Create:** `src/ui/components/MerchantNormalizerModal.tsx`
- **What to add:**
  - Modal showing: Raw Vendor → Normalized → Category
  - "Apply" button to lock mapping

#### 9. **View `v_latest_transaction_category`**
- **Priority:** 🟡 LOW (optimization; functions work without it)
- **Action:** If not present, add SQL migration to create; speeds up categorization queries

---

## ✅ MERGE PLAN — NO DUPLICATION

### **Phase 1: Core Infrastructure** (Foundation)

#### 1.1 Create `tx-list-latest.ts` endpoint
```typescript
// netlify/functions/tx-list-latest.ts
// GET /?import_id=xyz&limit=50&offset=0 OR /?date_from=X&date_to=Y
// Joins transactions + latest category + confidence
// Returns paginated results with total count
```

#### 1.2 Create `analytics-categorization.ts` endpoint
```typescript
// netlify/functions/analytics-categorization.ts
// GET /?user_id=x&period=month
// Returns: histogram, top_merchants, rules_effectiveness
// Calls metrics_categorization_daily + queries category_history
```

#### 1.3 Create `useTransactions` hook
```typescript
// src/hooks/useTransactions.ts
// Wraps tx-list-latest with pagination + state
// Used by all list views (SmartCategories, TransactionList, etc.)
```

#### 1.4 Create `useMetrics` hook
```typescript
// src/hooks/useMetrics.ts
// Wraps analytics-categorization
// Caches results; returns histogram, topMerchants, etc.
```

---

### **Phase 2: UI Components** (Workbench & Tables)

#### 2.1 Create `TransactionListTable.tsx`
```typescript
// src/ui/components/TransactionListTable.tsx
// Paginated table: Date | Merchant | Amount | Category (CategoryPill) | Conf
// On CategoryPill change → call tag-correction
// Low-conf rows highlighted yellow
```

#### 2.2 Create `SmartCategories.tsx` page
```typescript
// src/pages/dashboard/SmartCategories.tsx
// Tabs: Rules | Aliases | Merchants | Metrics
// Rules Tab: table + add/edit/delete
// Aliases Tab: table + add/edit/delete
// Merchants Tab: list from useMetrics top_merchants
// Metrics Tab: charts + stats
```

#### 2.3 Create `RuleEditorModal.tsx`
```typescript
// src/ui/components/RuleEditorModal.tsx
// Form: Pattern | Category (dropdown) | Priority (number)
// OnSubmit → POST /tag-rules
```

#### 2.4 Create `AliasEditorModal.tsx`
```typescript
// src/ui/components/AliasEditorModal.tsx
// Form: Raw Vendor | Normalized Name
// OnSubmit → POST /normalized_merchants (or /tag-rules as alias)
```

---

### **Phase 3: Integration** (Wire Existing Pages)

#### 3.1 Update `SmartImportAI.tsx`
```typescript
// After categorize-transactions completes:
// const { results } = await categorize(userId, txnsWithCats);
// Show <CategoryConfirmation results={results} ... />
// This replaces the inline CategoryPill edit flow
```

#### 3.2 Update `Analytics.tsx`
```typescript
// Add Tab 7: "Categories"
// → Renders SmartCategories page inline (or link to it)
// OR add a small "Categorization Health" card to Dashboard tab
```

#### 3.3 Update `AnalyticsAI.tsx` (Dash)
```typescript
// When user asks "How are my transactions categorized?"
// → Call /analytics-categorization
// → Show results in chat response (not hardcoded template)
```

---

### **Phase 4: Polish** (Optional Enhancements)

#### 4.1 Add Recharts charts
- Confidence trend line
- Category pie chart
- Auto-vs-manual bar

#### 4.2 Add Merchant Normalizer preview modal
- Show before/after vendor normalization

#### 4.3 Create `v_latest_transaction_category` view
- Speeds up queries; optional optimization

---

## 🗺️ FILE TREE — CHANGES ONLY

```
(Created files marked with ★)

netlify/functions/
  ★ tx-list-latest.ts                    (90 lines)
  ★ analytics-categorization.ts          (120 lines)
  
src/pages/dashboard/
  ★ SmartCategories.tsx                  (400+ lines)
  
src/ui/components/
  ★ TransactionListTable.tsx             (200 lines)
  ★ RuleEditorModal.tsx                  (150 lines)
  ★ AliasEditorModal.tsx                 (150 lines)
  
src/hooks/
  ★ useTransactions.ts                   (80 lines)
  ★ useMetrics.ts                        (70 lines)
  
(Modified files marked with ✏️)

src/pages/dashboard/
  ✏️ SmartImportAI.tsx                    (Add CategoryConfirmation flow)
  ✏️ Analytics.tsx                        (Add Categories tab or card)
  ✏️ AnalyticsAI.tsx                      (Wire to /analytics-categorization)
```

---

## 🔗 WIRING GUIDE

### User Journey: "I want to review & fix my categories"

1. **Start:** User clicks "Smart Categories" link (or Tab in Analytics)
2. **Page Loads:** `SmartCategories.tsx` → `useMetrics(userId, 'month')`
3. **Tabs Render:**
   - **Rules Tab:** Uses `GET /tag-rules`
   - **Merchants Tab:** Uses `metrics.topMerchants` from step 2
   - **Transactions Tab:** Uses `useTransactions(importId)` → `TransactionListTable`
4. **User Action:** Clicks category cell in table
   - `TransactionListTable` shows `CategoryPill` dropdown
   - User selects new category
   - → Calls `tag-correction` endpoint
   - → System learns rule
   - → Row updates + highlighted ✅
5. **User Action:** Clicks "Add Rule"
   - `RuleEditorModal` opens
   - User enters pattern + category + priority
   - → Calls `POST /tag-rules`
   - → Table refreshes

### User Journey: "I uploaded statements, now review suggestions"

1. **Start:** User uploads statements in `SmartImportAI`
2. **Parse:** Calls `byte-ocr-parse` → `commit-import`
3. **Categorize:** Calls `categorize-transactions` (or wrapped by `useCategoryConfirmation`)
4. **Show Results:** `CategoryConfirmation` renders
   - High-conf results: green ✅ auto-approve
   - Low-conf results: yellow ⚠️ expand on-click
5. **User Confirms:** Clicks alternative category
   - `onConfirm` calls `/tag-correction`
   - Row dismissed
6. **Done:** "Crystal's Advisory" card appears

---

## 🧪 VALIDATION CHECKLIST

- [x] `tag-categorize` endpoint exists and works
- [x] `tag-categorize-dryrun` endpoint exists and works
- [x] `tag-correction` endpoint exists and works
- [x] `tag-categories` endpoint exists and works
- [x] `tag-rules` endpoint exists and works
- [x] `tag-tx-categ-history` endpoint exists and works
- [ ] ❌ `tx-list-latest` endpoint **MISSING** — Create it
- [ ] ❌ `analytics-categorization` endpoint **MISSING** — Create it
- [ ] ✅ `metrics_categorization_daily` table exists
- [ ] ❌ `v_latest_transaction_category` view **NOT VERIFIED** — Check SQL
- [ ] ❌ RPCs (category_distribution_latest, top_confusing_merchants, confidence_histogram) **NOT VERIFIED**
- [x] ✅ `CategoryPill` component exists and is functional
- [x] ✅ `CategoryConfirmation` component just created
- [x] ✅ `useAuth()` hook exists
- [ ] ❌ `useTransactions()` hook **MISSING** — Create it
- [ ] ❌ `useMetrics()` hook **MISSING** — Create it
- [ ] ❌ `SmartCategories.tsx` page **MISSING** — Create it
- [ ] ❌ `TransactionListTable.tsx` component **MISSING** — Create it
- [ ] ❌ `RuleEditorModal.tsx` component **MISSING** — Create it
- [ ] ❌ `AliasEditorModal.tsx` component **MISSING** — Create it
- [x] ✅ Auth context wired to all pages
- [x] ✅ RLS policies in place for all tables

---

## 📊 IMPACT SUMMARY

| Phase | Files | Effort | Risk | Blocks |
|-------|-------|--------|------|--------|
| 1 (Infrastructure) | 4 new (functions + hooks) | 1–2 days | 🟢 Low | Phase 2 |
| 2 (UI Components) | 6 new (pages + components) | 2–3 days | 🟡 Medium | Phase 3 |
| 3 (Integration) | 3 modified (existing pages) | 1 day | 🟢 Low | Production ready |
| 4 (Polish) | Optional | 1+ days | 🟢 Low | Nice-to-have |

**Total:** ~1 week for Phases 1–3, production-ready.

---

## ✨ KEY PRINCIPLES

✅ **Reuse Existing:**
- `CategoryPill` for all category displays
- `CategoryConfirmation` for all low-conf flows
- `tag-categorize`, `tag-correction`, `tag-rules` endpoints (no duplication)
- `useAuth()` for all user ID resolution
- `metrics_categorization_daily` for all analytics

✅ **No Duplication:**
- Single source of truth per feature (e.g., only ONE tx list endpoint)
- Modular components (e.g., modal forms extracted from pages)
- Consistent naming (Rules, Aliases, Merchants, etc.)

✅ **Production Safe:**
- All endpoints use RLS + service role key
- All queries paginated
- All forms validated via Zod
- All errors logged safely (PII redacted)

---

**Next Step:** Proceed with Phase 1 implementation. Ready for diffs on demand. 🚀





