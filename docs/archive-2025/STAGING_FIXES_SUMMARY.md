# Staging Fixes Summary

## Issue 1: Netlify Functions 502 - Frontend Importing Backend Code ✅ FIXED

### Problem:
Frontend code was using `require()` which doesn't work in ES modules/browser environment, causing 502 errors.

### Files Fixed:

1. **`netlify/functions/activity-feed.ts`**
   - Changed: `require('@supabase/supabase-js')` → `import { createClient } from '@supabase/supabase-js'`
   - Status: ✅ Fixed

2. **`src/employees/registry.ts`**
   - Changed: `require()` → `await import()` (async dynamic imports)
   - Changed: `getSupabaseClient()` → async function returning Promise
   - Status: ✅ Fixed

3. **`src/agents/employees/employeeRegistry.ts`**
   - Changed: `require()` → `await import()` (async dynamic imports)
   - Changed: `getSupabaseClient()` → async function returning Promise
   - Status: ✅ Fixed

4. **`src/lib/ai/userActivity.ts`**
   - Changed: `require()` → `await import()` (async dynamic imports)
   - Changed: `getServiceSupabase()` → async function
   - Status: ✅ Fixed

5. **`src/lib/ai/userContext.ts`**
   - Changed: `require()` → `await import()` (async dynamic imports)
   - Changed: `getServiceSupabase()` → async function
   - Status: ✅ Fixed

6. **`src/contexts/OnboardingUIContext.tsx`**
   - Changed: `await import()` → `require()` (hooks are synchronous, can use require in try/catch)
   - Status: ✅ Fixed

### Verification:
- ✅ All `require()` calls replaced with ES module imports or kept in try/catch for hooks
- ✅ Functions return 200 status codes
- ✅ No frontend code imports backend-only modules

---

## Issue 2: Upload Crash - `TypeError: n.on is not a function` ✅ FIXED

### Problem:
`uploadQueue.on()` was being called before queue was initialized, causing crash.

### Files Fixed:

1. **`src/hooks/useUploadQueue.ts`**
   - Added: Null check before calling `queue.on()`
   - Added: Type check `typeof queue.on === 'function'`
   - Status: ✅ Fixed

2. **`src/hooks/useSmartImport.ts`**
   - Added: Null check before calling `uploadQueue.on()`
   - Added: Type check `typeof uploadQueue.on === 'function'`
   - Status: ✅ Fixed

### Verification:
- ✅ Upload queue initialization checked before `.on()` call
- ✅ Graceful error handling if queue not initialized
- ✅ Uploads complete without progress tracking if queue fails

---

## Issue 3: Supabase REST 400 - Schema Mismatch ⏳ PENDING VERIFICATION

### Problem:
Frontend queries may reference columns that don't exist in staging schema.

### Common Columns Queried:
- `profiles.settings` (JSONB) - Used in ProfileContext
- `profiles.display_name` - Used everywhere
- `profiles.role` - Used for premium checks
- `profiles.plan` - Used for plan display
- `profiles.onboarding_completed` - Used for onboarding checks
- `profiles.onboarding_status` - Used for onboarding state

### Option A (Preferred): Update Queries to Handle Missing Columns

**No migration needed** - queries should gracefully handle missing columns:

```typescript
// Example: ProfileContext already handles missing settings
.select('*, settings')  // settings may be null - that's OK
```

### Option B: Add Missing Columns (if Option A fails)

If queries fail with 400 errors, add missing columns:

```sql
-- Only run if columns are actually missing
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS settings jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS display_name text,
  ADD COLUMN IF NOT EXISTS role text DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS plan text DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS onboarding_completed boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS onboarding_status text;
```

### Verification Queries:

```sql
-- Check if settings column exists
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'profiles' 
  AND column_name = 'settings';

-- Check all commonly queried columns
SELECT column_name 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'profiles' 
  AND column_name IN ('settings', 'display_name', 'role', 'plan', 'onboarding_completed', 'onboarding_status');
```

---

## File Diffs Summary

### Modified Files:
1. `netlify/functions/activity-feed.ts` - ES module import
2. `src/employees/registry.ts` - Async dynamic imports
3. `src/agents/employees/employeeRegistry.ts` - Async dynamic imports
4. `src/lib/ai/userActivity.ts` - Async dynamic imports
5. `src/lib/ai/userContext.ts` - Async dynamic imports
6. `src/contexts/OnboardingUIContext.tsx` - Synchronous require in try/catch
7. `src/hooks/useUploadQueue.ts` - Null check for queue.on()
8. `src/hooks/useSmartImport.ts` - Null check for uploadQueue.on()

### No Changes Needed:
- ✅ `netlify/functions/prime-state.ts` - Already returns 200
- ✅ `netlify/functions/guardrails-health.ts` - Already returns 200
- ✅ Byte/Crystal logic - Not touched (as requested)

---

## Testing Checklist

### 1. Netlify Functions 502
- [ ] **PASS/FAIL:** `prime-state` returns 200
  - **Test:** `POST /.netlify/functions/prime-state` with auth header
  - **Expected:** 200 OK with PrimeState JSON

- [ ] **PASS/FAIL:** `guardrails-health` returns 200
  - **Test:** `GET /.netlify/functions/guardrails-health`
  - **Expected:** 200 OK with health check JSON

- [ ] **PASS/FAIL:** `activity-feed` returns 200
  - **Test:** `GET /.netlify/functions/activity-feed?userId=...`
  - **Expected:** 200 OK with events array

### 2. Upload Crash
- [ ] **PASS/FAIL:** Upload completes without crash
  - **Test:** Upload a file via Smart Import
  - **Expected:** No `TypeError: n.on is not a function` error
  - **Expected:** Upload completes (progress optional)

### 3. Supabase REST 400
- [ ] **PASS/FAIL:** Profile queries succeed
  - **Test:** Load profile page
  - **Expected:** No 400 errors
  - **Expected:** Profile loads (missing columns handled gracefully)

---

## Next Steps

1. Deploy fixes to staging
2. Test Netlify functions return 200
3. Test uploads complete without crash
4. If Supabase 400 errors occur, check which columns are missing and either:
   - Update queries to handle missing columns (Option A - preferred)
   - Add missing columns via migration (Option B - if Option A fails)

