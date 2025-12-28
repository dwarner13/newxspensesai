# 🔍 SMART IMPORT DATABASE VERIFICATION GUIDE

**Purpose:** Diagnostic queries to verify Smart Import AI schema, RLS policies, and data integrity  
**Status:** ✅ Ready for use  
**Environment:** Supabase SQL Editor  

---

## 📋 QUICK HEALTH CHECK

Run this query to get a complete overview:

```sql
-- ============================================================================
-- SMART IMPORT: COMPLETE SYSTEM HEALTH CHECK
-- ============================================================================

-- 1. TABLE EXISTENCE CHECK
SELECT 
  'tables' as check_type,
  table_name,
  'EXISTS' as status
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('imports', 'transactions_staging', 'transactions', 'handoffs', 'advice_messages')
ORDER BY table_name;

-- 2. ROW-LEVEL SECURITY STATUS
SELECT 
  'rls_status' as check_type,
  relname as table_name,
  CASE WHEN relrowsecurity THEN 'ENABLED ✅' ELSE 'DISABLED ⚠️' END as rls_status,
  relrowsecurity
FROM pg_class
WHERE relname IN ('imports', 'transactions_staging', 'transactions', 'handoffs', 'advice_messages')
ORDER BY relname;

-- 3. RLS POLICIES
SELECT 
  'policies' as check_type,
  tablename,
  policyname,
  cmd as operation,
  roles,
  qual as condition
FROM pg_policies
WHERE tablename IN ('imports', 'transactions_staging', 'transactions', 'handoffs', 'advice_messages')
ORDER BY tablename, policyname;

-- 4. ROW COUNTS
SELECT 
  'row_counts' as check_type,
  schemaname,
  tablename,
  n_live_tup as live_rows
FROM pg_stat_user_tables
WHERE schemaname = 'public'
  AND tablename IN ('imports', 'transactions_staging', 'transactions', 'handoffs', 'advice_messages')
ORDER BY tablename;
```

---

## 🔧 INDIVIDUAL DIAGNOSTIC QUERIES

### 1️⃣ TABLE EXISTENCE CHECK

**Purpose:** Verify all required tables exist  
**Expected Result:** 5 rows (one per table)

```sql
SELECT 
  table_name,
  'EXISTS ✅' as status
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'imports',
    'transactions_staging',
    'transactions',
    'handoffs',
    'advice_messages'
  )
ORDER BY table_name;
```

**Expected Output:**
```
table_name              | status
---                     | ---
advice_messages         | EXISTS ✅
handoffs                | EXISTS ✅
imports                 | EXISTS ✅
transactions            | EXISTS ✅
transactions_staging    | EXISTS ✅
```

---

### 2️⃣ ROW-LEVEL SECURITY (RLS) ENABLEMENT

**Purpose:** Verify RLS is enabled on all tables  
**Expected Result:** All `relrowsecurity` = `true`

```sql
SELECT 
  relname as table_name,
  CASE 
    WHEN relrowsecurity THEN '✅ ENABLED'
    ELSE '❌ DISABLED'
  END as rls_status,
  relrowsecurity
FROM pg_class
WHERE relname IN (
  'imports',
  'transactions_staging',
  'transactions',
  'handoffs',
  'advice_messages'
)
ORDER BY relname;
```

**Expected Output:**
```
table_name              | rls_status    | relrowsecurity
---                     | ---           | ---
advice_messages         | ✅ ENABLED    | true
handoffs                | ✅ ENABLED    | true
imports                 | ✅ ENABLED    | true
transactions            | ✅ ENABLED    | true
transactions_staging    | ✅ ENABLED    | true
```

---

### 3️⃣ RLS POLICIES VERIFICATION

**Purpose:** Verify all RLS policies are correctly configured  
**Expected Result:** Policies for SELECT, INSERT, UPDATE on each table

```sql
SELECT 
  tablename,
  policyname,
  cmd as operation,
  roles,
  CASE 
    WHEN qual IS NULL THEN '(no filter)'
    ELSE '(filtered)'
  END as condition_type
FROM pg_policies
WHERE tablename IN (
  'imports',
  'transactions_staging',
  'transactions',
  'handoffs',
  'advice_messages'
)
ORDER BY tablename, cmd, policyname;
```

**Expected Output:**
```
tablename               | policyname                | operation | roles              | condition_type
---                     | ---                       | ---       | ---                | ---
advice_messages         | advice_messages_*_own     | SELECT    | authenticated      | (filtered)
advice_messages         | advice_messages_*_own     | INSERT    | authenticated      | (filtered)
advice_messages         | advice_messages_*_own     | UPDATE    | authenticated      | (filtered)
handoffs                | handoffs_*_own            | SELECT    | authenticated      | (filtered)
handoffs                | handoffs_*_own            | INSERT    | service_role       | (no filter)
imports                 | imports_*_own             | SELECT    | authenticated      | (filtered)
imports                 | imports_*_own             | INSERT    | authenticated      | (filtered)
imports                 | imports_*_own             | UPDATE    | authenticated      | (filtered)
transactions            | transactions_*_own        | SELECT    | authenticated      | (filtered)
transactions_staging    | transactions_staging_*_own| SELECT    | authenticated      | (filtered)
```

---

### 4️⃣ COLUMN SCHEMA CHECK

**Purpose:** Verify all columns exist with correct types  
**Expected Result:** Column list matches specification

```sql
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN (
    'imports',
    'transactions_staging',
    'transactions',
    'handoffs',
    'advice_messages'
  )
ORDER BY table_name, ordinal_position;
```

---

### 5️⃣ INDEXES CHECK

**Purpose:** Verify performance indexes are created  
**Expected Result:** Indexes on user_id, import_id, hash, etc.

```sql
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN (
    'imports',
    'transactions_staging',
    'transactions',
    'handoffs',
    'advice_messages'
  )
ORDER BY tablename, indexname;
```

**Expected Indexes:**
```
Table: imports
  - idx_imports_user_id
  - idx_imports_status
  - imports_pkey (primary key)

Table: transactions_staging
  - idx_transactions_staging_import_id
  - idx_transactions_staging_hash
  - transactions_staging_pkey

Table: handoffs
  - idx_handoffs_user_id
  - idx_handoffs_status (if exists)
  - handoffs_pkey

Table: advice_messages
  - idx_advice_messages_user_id
  - idx_advice_messages_handoff_id (if exists)
  - advice_messages_pkey

Table: transactions
  - idx_transactions_idempotent (user_id, posted_at, amount, hash)
  - transactions_pkey
```

---

### 6️⃣ UNIQUE CONSTRAINTS CHECK

**Purpose:** Verify constraints preventing duplicates  
**Expected Result:** Unique constraints on import_id+hash, user_id+k, etc.

```sql
SELECT 
  constraint_name,
  table_name,
  column_name
FROM information_schema.constraint_column_usage
WHERE table_schema = 'public'
  AND table_name IN (
    'imports',
    'transactions_staging',
    'transactions',
    'handoffs',
    'advice_messages'
  )
ORDER BY table_name, constraint_name;
```

---

### 7️⃣ DATA VOLUME CHECK

**Purpose:** Check row counts in each table  
**Expected Result:** Varies by usage; helps identify issues

```sql
SELECT 
  schemaname,
  tablename,
  n_live_tup as live_rows,
  n_dead_tup as dead_rows,
  last_vacuum,
  last_autovacuum
FROM pg_stat_user_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'imports',
    'transactions_staging',
    'transactions',
    'handoffs',
    'advice_messages'
  )
ORDER BY tablename;
```

---

### 8️⃣ FOREIGN KEY CONSTRAINTS

**Purpose:** Verify referential integrity  
**Expected Result:** Foreign keys on user_id, import_id, etc.

```sql
SELECT 
  constraint_name,
  table_name,
  column_name,
  foreign_table_name,
  foreign_column_name
FROM information_schema.referential_constraints rc
JOIN information_schema.key_column_usage kcu 
  ON rc.constraint_name = kcu.constraint_name
WHERE kcu.table_schema = 'public'
  AND kcu.table_name IN (
    'imports',
    'transactions_staging',
    'transactions',
    'handoffs',
    'advice_messages'
  )
ORDER BY kcu.table_name, constraint_name;
```

**Expected Foreign Keys:**
```
imports.user_id → auth.users.id
transactions_staging.user_id → auth.users.id
transactions_staging.import_id → imports.id
handoffs.user_id → auth.users.id
advice_messages.user_id → auth.users.id
advice_messages.handoff_id → handoffs.id
```

---

## 🎯 STEP-BY-STEP VERIFICATION

### Step 1: Check If Tables Exist

```sql
SELECT COUNT(*) as table_count
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'imports',
    'transactions_staging',
    'transactions',
    'handoffs',
    'advice_messages'
  );
```

✅ **Expected:** `5`  
❌ **If less:** Run migration script first

---

### Step 2: Verify RLS is Enabled

```sql
SELECT COUNT(*) as rls_enabled_count
FROM pg_class
WHERE relname IN (
  'imports',
  'transactions_staging',
  'transactions',
  'handoffs',
  'advice_messages'
)
AND relrowsecurity = true;
```

✅ **Expected:** `5`  
❌ **If less:** Enable RLS manually:
```sql
ALTER TABLE public.imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions_staging ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.handoffs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.advice_messages ENABLE ROW LEVEL SECURITY;
```

---

### Step 3: Count RLS Policies

```sql
SELECT COUNT(*) as policy_count
FROM pg_policies
WHERE tablename IN (
  'imports',
  'transactions_staging',
  'transactions',
  'handoffs',
  'advice_messages'
);
```

✅ **Expected:** At least 10+ (varies by implementation)  
❌ **If 0:** Policies weren't created; check migration logs

---

### Step 4: Test RLS with User Context

```sql
-- As authenticated user (simulated)
SELECT id, user_id, status
FROM public.imports
WHERE user_id = auth.uid()
LIMIT 1;
```

✅ **Expected:** Rows match authenticated user only  
❌ **If error:** RLS is blocking; check policy conditions

---

### Step 5: Verify No Orphaned Rows

```sql
-- Check transactions_staging without valid imports
SELECT COUNT(*) as orphaned_staging
FROM public.transactions_staging ts
WHERE NOT EXISTS (
  SELECT 1 FROM public.imports i
  WHERE i.id = ts.import_id
);

-- Check handoffs without valid users
SELECT COUNT(*) as orphaned_handoffs
FROM public.handoffs h
WHERE NOT EXISTS (
  SELECT 1 FROM auth.users u
  WHERE u.id = h.user_id
);

-- Check advice_messages without valid handoffs
SELECT COUNT(*) as orphaned_advice
FROM public.advice_messages am
WHERE NOT EXISTS (
  SELECT 1 FROM public.handoffs h
  WHERE h.id = am.handoff_id
);
```

✅ **Expected:** All counts = `0`  
❌ **If > 0:** Data integrity issues; clean up orphaned rows

---

## 📊 COMPREHENSIVE TABLE SCHEMA

Run this to see full schema details:

```sql
-- IMPORTS TABLE
\d public.imports

-- TRANSACTIONS_STAGING TABLE
\d public.transactions_staging

-- HANDOFFS TABLE
\d public.handoffs

-- ADVICE_MESSAGES TABLE
\d public.advice_messages
```

---

## 🚨 TROUBLESHOOTING

### Issue: "No tables found"

**Solution:** Run migration:
```bash
npm run db:migrate -- 20251018_smart_import_schema.sql
```

---

### Issue: "RLS policies not blocking access"

**Verify policy conditions:**
```sql
SELECT policyname, qual
FROM pg_policies
WHERE tablename = 'imports'
AND cmd = 'SELECT';
```

Should contain: `auth.uid() = user_id`

---

### Issue: "Foreign key constraint violation"

**Check orphaned rows:**
```sql
DELETE FROM public.transactions_staging
WHERE import_id NOT IN (
  SELECT id FROM public.imports
);
```

---

### Issue: "Slow queries on large datasets"

**Check index usage:**
```sql
-- Missing indexes?
SELECT schemaname, tablename, indexname
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN (
    'imports',
    'transactions_staging',
    'handoffs',
    'advice_messages'
  );
```

---

## ✅ HEALTH CHECK SUMMARY

Create a dashboard query:

```sql
WITH table_check AS (
  SELECT 
    'imports' as table_name,
    CASE 
      WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='imports' AND table_schema='public')
      THEN 'EXISTS ✅'
      ELSE 'MISSING ❌'
    END as exists_check,
    CASE 
      WHEN EXISTS (SELECT 1 FROM pg_class WHERE relname='imports' AND relrowsecurity=true)
      THEN 'RLS ON ✅'
      ELSE 'RLS OFF ❌'
    END as rls_check,
    CASE 
      WHEN (SELECT COUNT(*) FROM pg_policies WHERE tablename='imports') > 0
      THEN 'POLICIES ✅'
      ELSE 'NO POLICIES ❌'
    END as policies_check
  UNION ALL
  SELECT 'transactions_staging', 
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='transactions_staging') THEN 'EXISTS ✅' ELSE 'MISSING ❌' END,
    CASE WHEN EXISTS (SELECT 1 FROM pg_class WHERE relname='transactions_staging' AND relrowsecurity=true) THEN 'RLS ON ✅' ELSE 'RLS OFF ❌' END,
    CASE WHEN (SELECT COUNT(*) FROM pg_policies WHERE tablename='transactions_staging') > 0 THEN 'POLICIES ✅' ELSE 'NO POLICIES ❌' END
  UNION ALL
  SELECT 'handoffs', 
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='handoffs') THEN 'EXISTS ✅' ELSE 'MISSING ❌' END,
    CASE WHEN EXISTS (SELECT 1 FROM pg_class WHERE relname='handoffs' AND relrowsecurity=true) THEN 'RLS ON ✅' ELSE 'RLS OFF ❌' END,
    CASE WHEN (SELECT COUNT(*) FROM pg_policies WHERE tablename='handoffs') > 0 THEN 'POLICIES ✅' ELSE 'NO POLICIES ❌' END
  UNION ALL
  SELECT 'advice_messages', 
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='advice_messages') THEN 'EXISTS ✅' ELSE 'MISSING ❌' END,
    CASE WHEN EXISTS (SELECT 1 FROM pg_class WHERE relname='advice_messages' AND relrowsecurity=true) THEN 'RLS ON ✅' ELSE 'RLS OFF ❌' END,
    CASE WHEN (SELECT COUNT(*) FROM pg_policies WHERE tablename='advice_messages') > 0 THEN 'POLICIES ✅' ELSE 'NO POLICIES ❌' END
)
SELECT * FROM table_check;
```

---

## 🎯 VERIFICATION CHECKLIST

- [ ] All 5 tables exist
- [ ] RLS enabled on all tables
- [ ] Policies present (10+)
- [ ] Indexes created for performance
- [ ] Foreign keys enforced
- [ ] No orphaned rows
- [ ] User isolation working (auth.uid() filtering)
- [ ] Row counts reasonable
- [ ] Last vacuum timestamps recent

---

## 🔗 RELATED GUIDES

- [`BYTE_OCR_TWO_STAGE_COMMIT.md`](./BYTE_OCR_TWO_STAGE_COMMIT.md) — Two-stage architecture
- [`XSPENSES_AUDIT_SMART_IMPORT.md`](./XSPENSES_AUDIT_SMART_IMPORT.md) — Full system audit
- [`LOCALHOST_TESTING_GUIDE.md`](./LOCALHOST_TESTING_GUIDE.md) — Testing procedures

---

**Last Updated:** October 18, 2025






