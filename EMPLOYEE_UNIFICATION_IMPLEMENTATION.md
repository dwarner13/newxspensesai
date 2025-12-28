> **NOTE: This document is now archived. For the latest system overview, see [XSPENSESAI_SYSTEM.md](../XSPENSESAI_SYSTEM.md).**

# Employee System Unification - Implementation Guide

**Date:** February 16, 2025  
**Status:** ✅ **READY FOR IMPLEMENTATION**

---

## 📋 Summary

This document provides the complete implementation plan for unifying the employee system. All files have been created and are ready for review and deployment.

---

## 🗂️ Files Created

### 1. Database Migration
**File:** `supabase/migrations/20250216_unify_employee_slugs.sql`
- Updates existing employees to canonical slugs
- Inserts/updates all 8 active employees with correct configs
- Creates `employee_slug_aliases` table for backward compatibility
- Creates `resolve_employee_slug()` function

### 2. Central Registry
**File:** `src/employees/registry.ts`
- Type-safe employee access
- Slug resolution with alias support
- Model config access
- In-memory caching (5-minute TTL)

### 3. Planning Document
**File:** `EMPLOYEE_UNIFICATION_PLAN.md`
- Complete analysis of current state
- Proposed unified schema
- Step-by-step implementation plan

---

## 🔧 Refactoring Diffs

### Router Refactor (`netlify/functions/_shared/router.ts`)

**Current:** Hardcoded `PERSONAS` object  
**Target:** Load from registry

```diff
--- a/netlify/functions/_shared/router.ts
+++ b/netlify/functions/_shared/router.ts
@@ -1,9 +1,12 @@
 type Msg = { role: 'system'|'user'|'assistant'; content: string }
 
-// Employee personas (optional flavor, added AFTER shared system)
-const PERSONAS: Record<string, string> = {
-  'prime-boss': `...`,
-  'crystal-analytics': `...`,
-  // ... etc
-}
+// Import registry for employee data
+import { getEmployeeSystemPrompt, resolveSlug } from '../../../src/employees/registry';
+
+// Cache for personas (loaded from database)
+let personaCache: Record<string, string> = {};
+
+async function getPersona(slug: string): Promise<string | null> {
+  const canonicalSlug = await resolveSlug(slug);
+  if (!personaCache[canonicalSlug]) {
+    const prompt = await getEmployeeSystemPrompt(canonicalSlug);
+    if (prompt) personaCache[canonicalSlug] = prompt;
+  }
+  return personaCache[canonicalSlug] || null;
+}
 
 export function routeToEmployee(params: {
@@ -92,7 +95,7 @@ export function routeToEmployee(params: {
   // Handle backward compatibility: crystal-analytics → crystal-ai
   let effectiveEmployee = requestedEmployee;
   if (requestedEmployee === 'crystal-analytics') {
-    effectiveEmployee = 'crystal-ai';
+    effectiveEmployee = await resolveSlug('crystal-analytics');
   }
   
-  if (effectiveEmployee && PERSONAS[effectiveEmployee]) {
+  const persona = await getPersona(effectiveEmployee);
+  if (effectiveEmployee && persona) {
     return {
       employee: effectiveEmployee,
       systemPreamble: sharedSystem || '',
-      employeePersona: PERSONAS[effectiveEmployee]
+      employeePersona: persona
     };
   }
```

**Note:** Router function needs to become `async` to support registry calls.

---

### Model Config Refactor (`netlify/functions/_shared/employeeModelConfig.ts`)

**Current:** Hardcoded `EMPLOYEE_MODEL_CONFIGS`  
**Target:** Load from registry

```diff
--- a/netlify/functions/_shared/employeeModelConfig.ts
+++ b/netlify/functions/_shared/employeeModelConfig.ts
@@ -1,5 +1,7 @@
+import { getEmployeeModelConfig } from '../../src/employees/registry';
+
 export interface EmployeeModelConfig {
   model: string;
   temperature: number;
   maxTokens: number;
 }
 
-const DEFAULT_MODEL = process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini';
-const DEFAULT_TEMPERATURE = 0.3;
-const DEFAULT_MAX_TOKENS = 2000;
-
-export const EMPLOYEE_MODEL_CONFIGS: Record<string, EmployeeModelConfig> = {
-  'prime-boss': {
-    model: DEFAULT_MODEL,
-    temperature: 0.7,
-    maxTokens: 3000,
-  },
-  // ... etc
-};
-
 export async function getEmployeeModelConfig(employeeSlug: string): Promise<EmployeeModelConfig> {
-  return EMPLOYEE_MODEL_CONFIGS[employeeSlug] || {
-    model: DEFAULT_MODEL,
-    temperature: DEFAULT_TEMPERATURE,
-    maxTokens: DEFAULT_MAX_TOKENS,
-  };
+  const canonicalSlug = await resolveSlug(employeeSlug);
+  return await getEmployeeModelConfig(canonicalSlug);
 }
```

**Note:** Function signature changes from sync to async.

---

## 🧪 Testing Instructions

### Step 1: Run Migration

```bash
# Apply migration
supabase migration up

# Verify employees
psql $DATABASE_URL -c "SELECT slug, title, model, temperature FROM employee_profiles WHERE is_active = true ORDER BY slug;"

# Verify aliases
psql $DATABASE_URL -c "SELECT * FROM employee_slug_aliases ORDER BY alias;"
```

**Expected Output:**
```
        slug        |              title               |    model    | temperature 
--------------------+----------------------------------+-------------+-------------
 blitz-debt         | Blitz — Debt Payoff Strategist   | gpt-4o-mini |        0.6
 byte-docs          | Byte — Document Processing...    | gpt-4o-mini |        0.5
 crystal-ai         | Crystal — Financial Insights...  | gpt-4o      |        0.3
 finley-ai          | Finley — Wealth & Forecasting... | gpt-4o      |        0.5
 goalie-goals       | Goalie — Goal Setting...         | gpt-4o-mini |        0.8
 ledger-tax         | Ledger — Tax & Accounting...     | gpt-4o      |        0.4
 prime-boss         | Prime — CEO & Orchestrator       | gpt-4o      |        0.7
 tag-ai             | Tag — Categorization Expert      | gpt-4o-mini |        0.3
```

### Step 2: Test Registry

```typescript
// Test file: scripts/test-registry.ts
import { resolveSlug, getEmployee, getAllEmployees } from '../src/employees/registry';

async function test() {
  // Test slug resolution
  console.log(await resolveSlug('crystal')); // Should return 'crystal-ai'
  console.log(await resolveSlug('crystal-analytics')); // Should return 'crystal-ai'
  console.log(await resolveSlug('tag-categorize')); // Should return 'tag-ai'
  
  // Test employee retrieval
  const crystal = await getEmployee('crystal-ai');
  console.log(crystal?.title); // Should print "Crystal — Financial Insights Analyst"
  
  // Test all employees
  const all = await getAllEmployees();
  console.log(`Loaded ${all.length} employees`);
}

test();
```

### Step 3: Test Router

```bash
# Start dev server
npm run netlify:dev

# Test routing
curl -X POST http://localhost:8888/.netlify/functions/chat \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user",
    "message": "How much did I spend this month?",
    "stream": false
  }' | jq '.headers["X-Employee"]'

# Should return: "crystal-ai"
```

### Step 4: Test Backward Compatibility

```bash
# Test old slugs still work
curl -X POST http://localhost:8888/.netlify/functions/chat \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user",
    "employeeSlug": "crystal-analytics",
    "message": "Test",
    "stream": false
  }' | jq '.headers["X-Employee"]'

# Should return: "crystal-ai" (resolved from alias)
```

---

## ✅ Verification Checklist

### Database
- [ ] All 8 employees exist in `employee_profiles`
- [ ] All slugs are canonical (no duplicates)
- [ ] Slug aliases table populated
- [ ] `resolve_employee_slug()` function works

### Registry
- [ ] Registry loads employees from database
- [ ] Slug resolution works (canonical + aliases)
- [ ] Model config matches database
- [ ] Cache works (5-minute TTL)

### Router
- [ ] Router uses registry (not hardcoded PERSONAS)
- [ ] Backward compatibility works (old slugs resolve)
- [ ] Crystal routes correctly
- [ ] Prime routes correctly

### Chat Endpoint
- [ ] Chat uses registry for employee lookup
- [ ] Model config comes from registry
- [ ] System prompts come from database
- [ ] Tool calling works with unified slugs

### Frontend
- [ ] Employee selector shows correct names
- [ ] Employee switching works
- [ ] No broken references to old slugs

---

## 🚨 Breaking Changes

### 1. Router Function Signature
**Before:** `routeToEmployee()` was synchronous  
**After:** `routeToEmployee()` is asynchronous

**Impact:** All callers must use `await`

**Files to Update:**
- `netlify/functions/chat.ts` (line ~200)

### 2. Model Config Function
**Before:** `getEmployeeModelConfig()` was synchronous  
**After:** `getEmployeeModelConfig()` is asynchronous

**Impact:** All callers must use `await`

**Files to Update:**
- `netlify/functions/chat.ts` (line ~350)

---

## 📝 Migration Order

1. **Run database migration** (`20250216_unify_employee_slugs.sql`)
2. **Deploy registry** (`src/employees/registry.ts`)
3. **Refactor router** (make async, use registry)
4. **Refactor model config** (make async, use registry)
5. **Update chat.ts** (await router/model config calls)
6. **Test thoroughly**
7. **Deploy**

---

## 🔍 Rollback Plan

If issues occur:

1. **Database:** Migration uses `ON CONFLICT DO UPDATE`, so re-running is safe
2. **Code:** Keep old router/model config files as backup
3. **Aliases:** Old slugs continue to work via alias table

---

## 📊 Success Metrics

- ✅ All employees load from database
- ✅ Zero hardcoded employee definitions in code
- ✅ All old slugs resolve correctly
- ✅ Router selects correct employees
- ✅ Model config matches database
- ✅ No broken tool calls

---

## 🎯 Next Steps

1. **Review** this implementation guide
2. **Approve** canonical slugs
3. **Run** database migration
4. **Deploy** registry
5. **Refactor** router and model config
6. **Test** thoroughly
7. **Deploy** to production

---

---

## ✅ IMPLEMENTATION COMPLETE

### What Changed

**Date:** February 16, 2025  
**Status:** ✅ **IMPLEMENTED**

#### Files Modified

1. **`src/employees/registry.ts`**
   - Fixed Supabase client initialization (works in both frontend/backend)
   - Added proper error handling and fallbacks
   - Registry now correctly loads from database with caching

2. **`netlify/functions/_shared/router.ts`**
   - Removed hardcoded `PERSONAS` object
   - Added `getPersona()` helper that uses registry
   - Made `routeToEmployee()` async
   - Updated to use canonical slugs (`tag-ai` instead of `tag-categorize`)
   - All personas now loaded from database via registry

3. **`netlify/functions/_shared/employeeModelConfig.ts`**
   - Removed hardcoded `EMPLOYEE_MODEL_CONFIGS` map
   - Made `getEmployeeModelConfig()` async
   - Now loads from registry/database
   - Includes fallback to defaults if registry fails

4. **`netlify/functions/chat.ts`**
   - Updated to `await routeToEmployee()` (now async)
   - Updated all `getEmployeeModelConfig()` calls to use `await`
   - No other behavior changes - routing logic preserved

#### Files Verified (No Changes Needed)

- **`supabase/migrations/20250216_unify_employee_slugs.sql`** ✅
  - Migration is correct and idempotent
  - Creates alias table and helper function
  - Updates all employees to canonical slugs

#### Known Issues / TODOs

- **Frontend components** still reference old slugs in some places (e.g., `src/components/Analytics/InsightsCard.tsx`, `src/lib/notify.ts`)
  - These are non-critical UI references
  - Will be resolved automatically via alias resolution
  - Can be cleaned up in a follow-up PR

- **Registry caching** uses 5-minute TTL
  - If employee profiles are updated in database, cache may be stale for up to 5 minutes
  - Can call `invalidateCache()` if immediate updates needed

---

## 🧪 How to Test

### Step 1: Run Database Migration

```bash
# Apply migration
supabase migration up

# Verify employees
psql $DATABASE_URL -c "SELECT slug, title, model, temperature FROM employee_profiles WHERE is_active = true ORDER BY slug;"

# Verify aliases
psql $DATABASE_URL -c "SELECT * FROM employee_slug_aliases ORDER BY alias;"
```

**Expected Output:**
- 8 employees with canonical slugs
- 12 aliases mapping old slugs to canonical slugs

### Step 2: Start Dev Server

```bash
npm run netlify:dev
```

### Step 3: Test Routing

```bash
# Test auto-routing to Crystal
curl -X POST http://localhost:8888/.netlify/functions/chat \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user",
    "message": "How much did I spend this month?",
    "stream": false
  }' | jq '.headers["X-Employee"]'

# Should return: "crystal-ai"
```

### Step 4: Test Backward Compatibility

```bash
# Test old slug still works
curl -X POST http://localhost:8888/.netlify/functions/chat \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user",
    "employeeSlug": "crystal-analytics",
    "message": "Test",
    "stream": false
  }' | jq '.headers["X-Employee"]'

# Should return: "crystal-ai" (resolved from alias)
```

### Step 5: Test Model Config

```bash
# Test that model config loads correctly
# Check server logs for: "[EmployeeModelConfig] Loaded config for crystal-ai"
# Should see correct model/temperature from database
```

---

## 📋 Exact Commands to Run (In Order)

1. **Run migration:**
   ```bash
   supabase migration up
   ```

2. **Verify database:**
   ```bash
   psql $DATABASE_URL -c "SELECT slug, title FROM employee_profiles WHERE is_active = true ORDER BY slug;"
   ```

3. **Start dev server:**
   ```bash
   npm run netlify:dev
   ```

4. **Test routing (in another terminal):**
   ```bash
   curl -X POST http://localhost:8888/.netlify/functions/chat \
     -H "Content-Type: application/json" \
     -d '{"userId":"test-user","message":"How much did I spend?","stream":false}' \
     | jq '.headers["X-Employee"]'
   ```

5. **Test backward compatibility:**
   ```bash
   curl -X POST http://localhost:8888/.netlify/functions/chat \
     -H "Content-Type: application/json" \
     -d '{"userId":"test-user","employeeSlug":"crystal-analytics","message":"Test","stream":false}' \
     | jq '.headers["X-Employee"]'
   ```

---

**Status:** ✅ **IMPLEMENTATION COMPLETE - READY FOR TESTING**

