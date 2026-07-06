# Crystal Analytics Deployment Checklist

## ✅ Step 1: Git Status - COMPLETE

**Status:** All files already committed and pushed
- ✅ Commit: `ca1c805` - "Add Crystal analytics: idempotent post-Byte consumer + Activity Feed output"
- ✅ Branch: `feature/day16-superbrain-phase2`
- ✅ Remote: Already pushed to `origin/feature/day16-superbrain-phase2`

**Files Committed:**
- ✅ `netlify/functions/_shared/crystalAnalytics.ts`
- ✅ `netlify/functions/_shared/crystalQueries.ts`
- ✅ `netlify/functions/smart-import-sync.ts`
- ✅ `netlify/functions/activity-feed.ts`
- ✅ `src/components/dashboard/ActivityFeed.tsx`
- ✅ `CRYSTAL_ANALYTICS_IMPLEMENTATION.md`

**Note:** Migration file `supabase/migrations/20251228_crystal_analytics_runs.sql` is in `.gitignore` (run manually in Supabase).

---

## 📋 Step 2: Supabase Migration

### Instructions:
1. Open Supabase Dashboard → SQL Editor
2. Copy contents of `supabase/migrations/20251228_crystal_analytics_runs.sql`
3. Paste and execute in SQL Editor
4. Check for errors (see troubleshooting below)

### Migration Dependencies:
The migration requires these existing tables/views:
- ✅ `public.ai_activity_events` (should exist)
- ✅ `public.imports` (should exist)
- ✅ `public.transactions` (should exist)
- ✅ `auth.users` (should exist)

### If Migration Fails:

**Error: relation "public.ai_activity_events" does not exist**
- **Fix:** Ensure `ai_activity_events` table exists. Check existing migrations.

**Error: relation "public.imports" does not exist**
- **Fix:** Ensure `imports` table exists. Check existing migrations.

**Error: relation "public.transactions" does not exist**
- **Fix:** Ensure `transactions` table exists. Check existing migrations.

**Error: duplicate key value violates unique constraint**
- **Fix:** Migration uses `IF NOT EXISTS` - safe to re-run. This error means objects already exist.

**Error: syntax error at "jsonb_array_elements_text"**
- **Fix:** Ensure PostgreSQL version >= 9.4 (should be fine on Supabase).

---

## ✅ Step 3: Verification Queries

### 3.1 Verify Table Exists
```sql
-- Check if crystal_analytics_runs table exists
SELECT 
  table_name,
  table_schema
FROM information_schema.tables
WHERE table_schema = 'public' 
  AND table_name = 'crystal_analytics_runs';
```
**Expected:** 1 row returned

### 3.2 Verify Table Structure
```sql
-- Check table columns
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'crystal_analytics_runs'
ORDER BY ordinal_position;
```
**Expected:** 8 columns:
- `id` (uuid)
- `user_id` (uuid)
- `import_run_id` (text)
- `status` (text)
- `summary` (text)
- `metrics` (jsonb)
- `flags` (jsonb)
- `created_at` (timestamptz)

### 3.3 Verify Unique Constraint
```sql
-- Check unique constraint exists
SELECT 
  conname AS constraint_name,
  contype AS constraint_type
FROM pg_constraint
WHERE conrelid = 'public.crystal_analytics_runs'::regclass
  AND contype = 'u';
```
**Expected:** 1 row with constraint name containing "user_import_unique"

### 3.4 Verify SAFE Views Exist
```sql
-- Check all three views exist
SELECT 
  table_name,
  table_type
FROM information_schema.tables
WHERE table_schema = 'public' 
  AND table_name IN (
    'v_crystal_input_byte_event',
    'v_crystal_input_import',
    'v_crystal_input_transactions'
  )
ORDER BY table_name;
```
**Expected:** 3 rows returned

### 3.5 Verify View Definitions
```sql
-- Check view definitions (should not expose raw OCR/PII)
SELECT 
  viewname,
  definition
FROM pg_views
WHERE schemaname = 'public' 
  AND viewname IN (
    'v_crystal_input_byte_event',
    'v_crystal_input_import',
    'v_crystal_input_transactions'
  );
```
**Expected:** 3 rows. Verify definitions don't include:
- ❌ `ocr_text` (raw OCR)
- ❌ `file_url` (raw file paths)
- ❌ `storage_path` (raw storage paths)
- ✅ Should only include safe columns (amounts, categories, metadata)

### 3.6 Verify RLS Policy
```sql
-- Check RLS is enabled and policy exists
SELECT 
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'crystal_analytics_runs';
```
**Expected:** 1 row with policy `crystal_analytics_runs_select_own`

### 3.7 Verify Partial Unique Index
```sql
-- Check partial unique index for crystal.analytics.completed events
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public' 
  AND indexname = 'ai_activity_events_crystal_completed_unique';
```
**Expected:** 1 row with index definition containing `WHERE event_type = 'crystal.analytics.completed'`

---

## 🧪 Step 4: End-to-End Test

### 4.1 Run One Import to VERIFIED
1. Upload a document via Smart Import
2. Wait for Byte completion (`byte.import.completed` event)
3. Wait for Custodian verification (`integrity_verified=true`)
4. Check logs for Crystal trigger call

### 4.2 Verify Exactly One Row Per (user_id, import_run_id)
```sql
-- After import completes, check Crystal run was created
SELECT 
  id,
  user_id,
  import_run_id,
  status,
  summary,
  metrics->>'total_transactions' AS total_txns,
  flags->>'uncategorized_count' AS uncategorized,
  created_at
FROM public.crystal_analytics_runs
WHERE user_id = '<your_user_id>'
ORDER BY created_at DESC
LIMIT 5;
```
**Expected:** 
- ✅ Exactly 1 row per `import_run_id`
- ✅ `status` = 'completed'
- ✅ `summary` is not empty
- ✅ `metrics` contains transaction data

### 4.3 Verify Idempotency (No Duplicates)
```sql
-- Check for duplicate runs (should be 0)
SELECT 
  user_id,
  import_run_id,
  COUNT(*) AS run_count
FROM public.crystal_analytics_runs
GROUP BY user_id, import_run_id
HAVING COUNT(*) > 1;
```
**Expected:** 0 rows (no duplicates)

### 4.4 Verify Crystal Event in Activity Feed
```sql
-- Check crystal.analytics.completed event exists
SELECT 
  id,
  user_id,
  employee_id,
  event_type,
  status,
  label,
  details->>'import_run_id' AS import_run_id,
  details->>'crystal_run_id' AS crystal_run_id,
  created_at
FROM public.ai_activity_events
WHERE event_type = 'crystal.analytics.completed'
  AND user_id = '<your_user_id>'
ORDER BY created_at DESC
LIMIT 5;
```
**Expected:**
- ✅ Exactly 1 event per `import_run_id`
- ✅ `employee_id` = 'crystal-analytics'
- ✅ `status` = 'completed'
- ✅ `label` = 'Crystal: Analytics ready'

### 4.5 Verify Activity Feed UI
1. Open Activity Feed in dashboard
2. **Expected:** See "Crystal: Analytics ready" event
3. **Expected:** Shows preview with metrics (totals, uncategorized, anomalies)
4. **Expected:** Only ONE Crystal event per import (no duplicates)

### 4.6 Verify No Duplicate Events
```sql
-- Check for duplicate crystal.analytics.completed events (should be 0)
SELECT 
  user_id,
  details->>'import_run_id' AS import_run_id,
  COUNT(*) AS event_count
FROM public.ai_activity_events
WHERE event_type = 'crystal.analytics.completed'
GROUP BY user_id, details->>'import_run_id'
HAVING COUNT(*) > 1;
```
**Expected:** 0 rows (no duplicates)

---

## 📊 Verification Checklist

### Pre-Deployment
- [ ] **PASS/FAIL:** Git files committed and pushed
  - **Query:** `git log -n 1 --oneline` (should show Crystal commit)
  - **Result:** ✅ PASS (commit ca1c805)

### Migration
- [ ] **PASS/FAIL:** Migration executed successfully
  - **Query:** Step 3.1 (table exists)
  - **Result:** ⏳ PENDING (run in Supabase)

- [ ] **PASS/FAIL:** Table structure correct
  - **Query:** Step 3.2 (8 columns)
  - **Result:** ⏳ PENDING

- [ ] **PASS/FAIL:** Unique constraint exists
  - **Query:** Step 3.3 (constraint exists)
  - **Result:** ⏳ PENDING

- [ ] **PASS/FAIL:** SAFE views exist
  - **Query:** Step 3.4 (3 views)
  - **Result:** ⏳ PENDING

- [ ] **PASS/FAIL:** Views don't expose PII
  - **Query:** Step 3.5 (view definitions)
  - **Result:** ⏳ PENDING

- [ ] **PASS/FAIL:** RLS policy enabled
  - **Query:** Step 3.6 (policy exists)
  - **Result:** ⏳ PENDING

- [ ] **PASS/FAIL:** Partial unique index exists
  - **Query:** Step 3.7 (index exists)
  - **Result:** ⏳ PENDING

### Post-Deployment Test
- [ ] **PASS/FAIL:** One import creates exactly one Crystal run
  - **Query:** Step 4.2 (1 row per import_run_id)
  - **Result:** ⏳ PENDING (run after import)

- [ ] **PASS/FAIL:** No duplicate runs (idempotency)
  - **Query:** Step 4.3 (0 duplicates)
  - **Result:** ⏳ PENDING

- [ ] **PASS/FAIL:** Crystal event appears in Activity Feed
  - **Query:** Step 4.4 (event exists)
  - **Result:** ⏳ PENDING

- [ ] **PASS/FAIL:** Activity Feed UI shows Crystal event
  - **Manual:** Step 4.5 (UI check)
  - **Result:** ⏳ PENDING

- [ ] **PASS/FAIL:** No duplicate events
  - **Query:** Step 4.6 (0 duplicates)
  - **Result:** ⏳ PENDING

---

## 🔍 Troubleshooting

### Issue: Migration fails with "relation does not exist"
**Solution:** Check if required tables exist:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('ai_activity_events', 'imports', 'transactions');
```

### Issue: Crystal run not created after import
**Check:**
1. Byte completion event exists: `SELECT * FROM ai_activity_events WHERE event_type = 'byte.import.completed' AND details->>'import_run_id' = '<id>';`
2. Custodian verified: `SELECT details->'integrity'->>'verified' FROM ai_activity_events WHERE event_type = 'byte.import.completed' AND details->>'import_run_id' = '<id>';`
3. Check Netlify function logs for Crystal trigger errors

### Issue: Duplicate Crystal runs
**Check:** Unique constraint is working:
```sql
-- Try to insert duplicate (should fail)
INSERT INTO crystal_analytics_runs (user_id, import_run_id, status, summary, metrics, flags)
VALUES ('<user_id>', '<existing_import_run_id>', 'completed', 'test', '{}', '{}');
-- Expected: Error 23505 (unique_violation)
```

---

## 📝 Notes

- Migration is idempotent (safe to re-run)
- All queries use SAFE views (no raw OCR/PII access)
- RLS policies enforce user isolation
- Unique constraints prevent duplicates at DB level
- Crystal runs silently (doesn't affect Custodian flow)

