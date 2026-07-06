# Employee Slug Backend Audit
**Date:** 2025-01-20  
**Purpose:** Trace which AI employee actually runs when clicking hero buttons

---

## STEP 1: Employee Definitions

### Database Canonical Slugs (from `employee_profiles` table)

Based on migration `20250216_unify_employee_slugs.sql`:

| Canonical Slug | Title | Emoji | Model | Temperature | Max Tokens |
|----------------|-------|-------|-------|-------------|------------|
| `prime-boss` | Prime — CEO & Orchestrator | 👑 | gpt-4o | 0.7 | 3000 |
| `byte-docs` | Byte — Document Processing Specialist | 📄 | gpt-4o-mini | 0.5 | 2000 |
| `tag-ai` | Tag — Categorization Expert | 🏷️ | gpt-4o-mini | 0.3 | 2000 |
| `crystal-ai` | Crystal — Financial Insights Analyst | 🔮 | gpt-4o | 0.3 | 2000 |
| `goalie-goals` | Goalie — Goal Setting & Achievement Coach | 🎯 | gpt-4o-mini | 0.8 | 2000 |
| `finley-ai` | Finley — Wealth & Forecasting Specialist | 📈 | gpt-4o | 0.5 | 3000 |

**Note:** Database also has `goalie-ai` from earlier migration (`202511181146_add_goalie_employee.sql`), but unification migration sets `goalie-goals` as canonical.

### System Prompts Summary

| Slug | System Prompt Summary |
|------|----------------------|
| `prime-boss` | Strategic CEO orchestrator of 30+ AI employees. Routes questions to specialists or answers strategic/general questions. |
| `byte-docs` | Enthusiastic document processing specialist. Loves OCR, parsing, categorization. 99.7% accuracy focus. |
| `tag-ai` | Category + transaction intelligence. Auto-categorizes, learns from corrections, fixes mis-categorized expenses. |
| `crystal-ai` | Financial insights analyst. Clean summaries, income/expense breakdowns, pattern detection, trend insights. Short, numerical, precise. |
| `goalie-goals` | Goal setting & achievement coach. Motivational, tracks progress, celebrates milestones. SMART goals focus. |
| `finley-ai` | Wealth & forecasting specialist. Long-term predictions, debt payoff timelines, savings projections. Uses real data via tools. |

### Tools/Capabilities

| Slug | Tools Allowed |
|------|---------------|
| `prime-boss` | `request_employee_handoff` |
| `byte-docs` | `[]` (no tools) |
| `tag-ai` | `tag_update_transaction_category`, `tag_create_manual_transaction`, `request_employee_handoff` |
| `crystal-ai` | `crystal_summarize_income`, `crystal_summarize_expenses` |
| `goalie-goals` | `[]` (no tools in unification migration, but `goalie-ai` has goal tools) |
| `finley-ai` | `crystal_summarize_income`, `crystal_summarize_expenses`, `finley_debt_payoff_forecast`, `finley_savings_forecast` (from Phase 1 migration) |

---

## STEP 2: Slug Resolution Flow

### Frontend → Backend Flow

1. **Frontend sends:** `useUnifiedChatLauncher().openChat({ initialEmployeeSlug: 'finley-forecasts' })`
2. **chat.ts receives:** `employeeSlug` in request body
3. **chat.ts normalizeEmployeeSlug()** (lines 2020-2052):
   - `prime-boss` → returns as-is ✅
   - `byte-docs` → returns as-is ✅
   - `tag-ai` → returns as-is ✅
   - `crystal-analytics` → returns as-is (not in switch, so preserved) ✅
   - `finley-forecasts` → returns as-is (not in switch, so preserved) ⚠️
   - `goalie-goals` → returns as-is ✅
4. **router.ts routeToEmployee()** calls `resolveSlug(requestedEmployee)` (line 137)
5. **registry.ts resolveSlug()** (lines 131-229):
   - First checks if slug exists in `employee_profiles` table (canonical)
   - If not, checks `employee_slug_aliases` table via `resolve_employee_slug()` SQL function
   - Falls back to hardcoded alias map if database fails
6. **chat.ts** uses `finalEmployeeSlug` to load from `employee_profiles` table (line 544-548)

### Slug Resolution Results

| Frontend Slug | normalizeEmployeeSlug() | resolveSlug() Result | Database Lookup | **ACTUAL EMPLOYEE** |
|---------------|------------------------|----------------------|-----------------|---------------------|
| `prime-boss` | `prime-boss` | `prime-boss` | `prime-boss` | ✅ **PRIME** |
| `byte-docs` | `byte-docs` | `byte-docs` | `byte-docs` | ✅ **BYTE** |
| `tag-ai` | `tag-ai` | `tag-ai` | `tag-ai` | ✅ **TAG** |
| `crystal-analytics` | `crystal-analytics` | `crystal-ai` (via alias) | `crystal-ai` | ✅ **CRYSTAL** |
| `finley-forecasts` | `finley-forecasts` | ❌ `prime-boss` (fallback) | ❌ Not found | ❌ **BROKEN** |
| `goalie-goals` | `goalie-goals` | ✅ `goalie-goals` (if exists) OR ⚠️ `goalie-ai` (fallback) | `goalie-goals` or `goalie-ai` | ⚠️ **UNCERTAIN** |

---

## STEP 3: Critical Issues Found

### ❌ PROBLEM 1: `finley-forecasts` Not Resolved

**Issue:**
- Frontend sends: `finley-forecasts`
- Database aliases table: Only has `finley` → `finley-ai` (line 235)
- Registry fallback map: Only has `finley` → `finley-ai` (line 204)
- **`finley-forecasts` is NOT in any alias map**

**Resolution Path:**
1. `finley-forecasts` passes through `normalizeEmployeeSlug()` unchanged
2. `resolveSlug('finley-forecasts')` checks database:
   - Not a canonical slug (database has `finley-ai`, not `finley-forecasts`)
   - Not in `employee_slug_aliases` table
   - Falls back to hardcoded map → NOT FOUND
   - **Returns `'prime-boss'` (default fallback, line 228)**

**Result:** ❌ **Clicking "Chat with Finley" routes to PRIME, not Finley!**

**Verification:**
- `resolveSlug('finley-forecasts')` checks database:
  1. Is `finley-forecasts` a canonical slug? → NO (database has `finley-ai`)
  2. Is `finley-forecasts` in aliases table? → NO (only `finley` → `finley-ai` exists)
  3. Falls back to hardcoded map → NOT FOUND
  4. Returns `'prime-boss'` (line 228 default)

---

### ⚠️ POTENTIAL ISSUE: `goalie-goals` Resolution

**Issue:**
- Frontend sends: `goalie-goals`
- Database may have TWO entries:
  - `goalie-ai` (from `202511181146_add_goalie_employee.sql`, Nov 18) - has goal tools: `['goalie_create_goal', 'goalie_list_goals', 'goalie_update_goal_progress', 'goalie_summarize_goals', 'goalie_suggest_actions']`
  - `goalie-goals` (from `20250216_unify_employee_slugs.sql`, Feb 16) - NO tools: `[]`
- Registry fallback map: `goalie-goals` → `goalie-ai` (line 209) - only used if database check fails

**Resolution Path:**
1. `goalie-goals` passes through `normalizeEmployeeSlug()` unchanged
2. `resolveSlug('goalie-goals')` checks database (line 139):
   - **IF `goalie-goals` exists as canonical** → returns `goalie-goals` directly ✅
   - **IF NOT found**, checks aliases → might find `goalie-goals` → `goalie-goals` (circular)
   - **IF NOT found**, falls back to hardcoded map → `goalie-ai`
3. Database lookup uses resolved slug

**Result:** 
- **IF `goalie-goals` exists in database:** ✅ Uses `goalie-goals` profile (but has NO tools)
- **IF `goalie-goals` does NOT exist:** ⚠️ Falls back to `goalie-ai` (has tools)

**Verification Needed:**
- Check if `goalie-goals` actually exists in database (unification migration may have been overwritten)
- If both exist, determine which one is actually used
- If only `goalie-ai` exists, the fallback works but is inconsistent with frontend slug

---

### ✅ CORRECT: `crystal-analytics` → `crystal-ai`

**Resolution:**
- Frontend sends: `crystal-analytics`
- Database aliases: `crystal-analytics` → `crystal-ai` (line 230)
- Registry fallback: `crystal-analytics` → `crystal-ai` (line 201)
- Database lookup: `crystal-ai` ✅

**Result:** ✅ **Correctly routes to Crystal**

---

## STEP 4: Final Answers

### Are They Using Their OWN Employee Config?

| Button | Frontend Slug | Resolves To | Uses Own Config? | Status |
|--------|---------------|-------------|------------------|--------|
| "Chat with Prime" | `prime-boss` | `prime-boss` | ✅ **YES** | ✅ Correct |
| "Chat with Byte" | `byte-docs` | `byte-docs` | ✅ **YES** | ✅ Correct |
| "Chat with Tag" | `tag-ai` | `tag-ai` | ✅ **YES** | ✅ Correct |
| "Chat with Finley" | `finley-forecasts` | ❌ `prime-boss` (fallback) | ❌ **NO** | ❌ **BROKEN** |
| "Chat with Goalie" | `goalie-goals` | ✅ `goalie-goals` (if exists) OR ⚠️ `goalie-ai` (fallback) | ⚠️ **UNCERTAIN** | ⚠️ May use wrong profile |
| "Chat with Crystal" | `crystal-analytics` | ✅ `crystal-ai` | ✅ **YES** | ✅ Correct |

---

## STEP 5: Required Fixes

### 🔴 CRITICAL: Fix `finley-forecasts` Resolution

**Problem:** `finley-forecasts` is not in any alias map, so it falls back to `prime-boss`

**Fix Options:**
1. **Option A (Recommended):** Add `finley-forecasts` → `finley-ai` to database aliases
   - File: Create new migration or update existing
   - SQL: `INSERT INTO employee_slug_aliases (alias, canonical_slug) VALUES ('finley-forecasts', 'finley-ai') ON CONFLICT DO NOTHING;`
2. **Option B:** Update frontend to use `finley-ai` instead of `finley-forecasts`
   - Files: `src/components/workspace/employees/FinleyUnifiedCard.tsx`, `src/config/employeeDisplayConfig.ts`
   - Change: `initialEmployeeSlug: 'finley-forecasts'` → `'finley-ai'`

**Files to Fix:**
- `supabase/migrations/` (new migration file)
- OR `src/components/workspace/employees/FinleyUnifiedCard.tsx` (line 24)
- OR `src/config/employeeDisplayConfig.ts` (line 83)

---

### 🟡 MEDIUM: Fix `goalie-goals` → `goalie-ai` Inconsistency

**Problem:** Database has both `goalie-goals` and `goalie-ai`, registry maps to `goalie-ai`

**Fix Options:**
1. **Option A (Recommended):** Consolidate to `goalie-goals` as canonical
   - Update `goalie-ai` profile to `goalie-goals` (merge tools)
   - Add alias: `goalie-ai` → `goalie-goals`
   - Update registry fallback: `goalie-goals` → `goalie-goals` (no change needed)
2. **Option B:** Use `goalie-ai` as canonical everywhere
   - Update frontend: `goalie-goals` → `goalie-ai`
   - Update database: Remove `goalie-goals`, keep `goalie-ai`

**Files to Fix:**
- `supabase/migrations/` (consolidation migration)
- `src/employees/registry.ts` (line 209 - remove `goalie-goals` → `goalie-ai` mapping)
- OR `src/components/workspace/employees/GoalieUnifiedCard.tsx` (line 24)

---

## Summary Table

| Frontend Slug | Resolves To | Database Profile | System Prompt | Tools | Status |
|---------------|-------------|------------------|---------------|-------|--------|
| `prime-boss` | `prime-boss` | `prime-boss` | Prime CEO prompt | `request_employee_handoff` | ✅ Correct |
| `byte-docs` | `byte-docs` | `byte-docs` | Byte document prompt | `[]` | ✅ Correct |
| `tag-ai` | `tag-ai` | `tag-ai` | Tag categorization prompt | `tag_update_transaction_category`, etc. | ✅ Correct |
| `crystal-analytics` | `crystal-ai` | `crystal-ai` | Crystal insights prompt | `crystal_summarize_income`, etc. | ✅ Correct |
| `finley-forecasts` | ❌ `prime-boss` | ❌ Not found | ❌ Prime's prompt | ❌ Prime's tools | ❌ **BROKEN** |
| `goalie-goals` | ✅ `goalie-goals` (if exists) OR ⚠️ `goalie-ai` (fallback) | `goalie-goals` or `goalie-ai` | Goalie goal prompt | Depends on which profile exists | ⚠️ **UNCERTAIN** |

---

## Files Referenced

- `netlify/functions/chat.ts` - Main chat endpoint
- `netlify/functions/_shared/router.ts` - Employee routing logic
- `netlify/functions/_shared/employeeModelConfig.ts` - Model config loader
- `src/employees/registry.ts` - Employee registry with slug resolution
- `supabase/migrations/20250216_unify_employee_slugs.sql` - Employee unification migration
- `supabase/migrations/202511181146_add_goalie_employee.sql` - Goalie employee migration
- `supabase/migrations/20250220_add_finley_phase1.sql` - Finley Phase 1 migration

---

## Next Steps

1. **IMMEDIATE:** Add `finley-forecasts` → `finley-ai` alias to database
2. **MEDIUM:** Consolidate `goalie-goals` / `goalie-ai` to single canonical slug
3. **VERIFY:** Test each hero button to confirm correct employee loads

