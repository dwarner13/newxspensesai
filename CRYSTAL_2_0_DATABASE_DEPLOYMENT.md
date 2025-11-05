# 🗄️ CRYSTAL 2.0 — DATABASE DEPLOYMENT GUIDE

**Date:** October 18, 2025  
**Status:** ✅ Ready to Deploy  
**File:** `20251018_add_crystal_2_0_prompt.sql`

---

## 📋 OVERVIEW

This guide walks through deploying Crystal 2.0's complete 20-section system prompt into the Supabase `employee_profiles` table.

**What Gets Deployed:**
- ✅ Crystal's complete 20-section system prompt (~1000 lines)
- ✅ 13 core capabilities
- ✅ Delegation tools configuration
- ✅ Active status flag

---

## 🚀 DEPLOYMENT OPTIONS

### Option 1: Via Supabase Dashboard (Easiest)

**Steps:**
1. Go to Supabase Dashboard → SQL Editor
2. Create new query
3. Copy entire contents of `20251018_add_crystal_2_0_prompt.sql`
4. Click "Run" (▶️)
5. Verify results at bottom

**Expected Output:**
```
Rows returned: 1
id: [uuid]
slug: crystal-analytics
title: Crystal — Financial Intelligence (AI CFO)
is_active: true
prompt_length: ~50000
capability_count: 13
tools_count: 1
updated_at: [timestamp]
```

---

### Option 2: Via Supabase CLI

**Prerequisites:**
```bash
npm install -g supabase
supabase login
```

**Deploy:**
```bash
# Navigate to project root
cd C:\Users\user\Desktop\project-bolt-fixed

# Run migration
supabase db push 20251018_add_crystal_2_0_prompt.sql
```

**Verify:**
```bash
supabase db execute "SELECT slug, title FROM employee_profiles WHERE slug = 'crystal-analytics';"
```

---

### Option 3: Via PostgreSQL Client (psql)

**Prerequisites:**
- PostgreSQL installed
- Supabase connection string

**Deploy:**
```bash
psql "your-supabase-connection-string" < 20251018_add_crystal_2_0_prompt.sql
```

**Verify:**
```bash
psql "your-supabase-connection-string" -c "SELECT slug, title FROM employee_profiles WHERE slug = 'crystal-analytics';"
```

---

## 📊 SQL MIGRATION STRUCTURE

### Part 1: Safety Setup
```sql
create extension if not exists pgcrypto;
-- Creates uuid generation capability if needed

-- Creates table if it doesn't exist (idempotent)
do $$
  if not exists (
    select 1 from information_schema.tables
    where table_name='employee_profiles'
  ) then
    create table employee_profiles (...)
  end if;
end $$;
```

### Part 2: Crystal Profile Insertion
```sql
with prompt as (
  select $$FULL_20_SECTION_PROMPT$$::text as content
)
insert into employee_profiles (
  slug,
  title,
  system_prompt,
  capabilities,
  tools_allowed,
  is_active
)
-- Upserts (updates if exists)
on conflict (slug) do update
set
  title = excluded.title,
  system_prompt = excluded.system_prompt,
  capabilities = excluded.capabilities,
  tools_allowed = excluded.tools_allowed,
  is_active = true,
  updated_at = now();
```

### Part 3: Verification Queries
```sql
-- Query 1: Summary stats
select
  id,
  slug,
  title,
  is_active,
  char_length(system_prompt) as prompt_length,
  array_length(capabilities, 1) as capability_count
from employee_profiles
where slug = 'crystal-analytics';

-- Query 2: Prompt preview (first 500 chars)
select
  slug,
  substring(system_prompt, 1, 500) as prompt_preview
from employee_profiles
where slug = 'crystal-analytics';
```

---

## ✅ DEPLOYMENT CHECKLIST

### Pre-Deployment
- [ ] Have Supabase access (dashboard or CLI)
- [ ] Reviewed the SQL migration file
- [ ] Confirmed `employee_profiles` table exists (or will be created)
- [ ] Backed up existing data (optional but recommended)

### Deployment
- [ ] Execute the SQL migration
- [ ] Check for errors in output
- [ ] Run verification queries (see below)
- [ ] Confirm row was inserted/updated

### Post-Deployment
- [ ] Crystal profile appears in Supabase
- [ ] System prompt length: ~50,000 characters
- [ ] Capabilities count: 13
- [ ] Tools allowed: 1 (delegate)
- [ ] is_active: true
- [ ] Test Crystal in production function

---

## 🔍 VERIFICATION QUERIES

### 1. Check Crystal Profile Exists
```sql
select slug, title, is_active
from public.employee_profiles
where slug = 'crystal-analytics';
```

**Expected Result:**
```
slug              | title                                      | is_active
crystal-analytics | Crystal — Financial Intelligence (AI CFO) | true
```

### 2. Check Prompt Length
```sql
select
  slug,
  char_length(system_prompt) as prompt_length,
  'OK' as status
from public.employee_profiles
where slug = 'crystal-analytics'
  and char_length(system_prompt) > 40000; -- Should be ~50K
```

**Expected Result:**
```
slug              | prompt_length | status
crystal-analytics | ~50000        | OK
```

### 3. Check Capabilities
```sql
select
  slug,
  array_length(capabilities, 1) as capability_count,
  capabilities
from public.employee_profiles
where slug = 'crystal-analytics';
```

**Expected Result:**
```
slug              | capability_count | capabilities
crystal-analytics | 13               | {spending-intelligence,income-profitability,...}
```

### 4. Check Tools
```sql
select
  slug,
  tools_allowed
from public.employee_profiles
where slug = 'crystal-analytics';
```

**Expected Result:**
```
slug              | tools_allowed
crystal-analytics | {delegate}
```

### 5. View Prompt Preview
```sql
select
  slug,
  substring(system_prompt, 1, 1000) as preview
from public.employee_profiles
where slug = 'crystal-analytics';
```

**Expected:** Starts with "You are **Crystal**, the AI Financial Analyst..."

---

## 🧪 TESTING AFTER DEPLOYMENT

### Test 1: Verify Crystal is Loaded in Production
```bash
curl -i -X POST 'http://localhost:8888/.netlify/functions/chat-v3-production?nostream=1' \
  -H 'content-type: application/json' \
  -d '{"userId":"test","message":"Hi Crystal, I run a bakery","employeeSlug":"crystal-analytics"}'
```

**Expected:** Crystal responds with industry-aware analysis

### Test 2: Check Database Load Time
```bash
psql "your-connection-string" -c "time SELECT system_prompt FROM employee_profiles WHERE slug = 'crystal-analytics';"
```

**Expected:** < 100ms response time

---

## 🔧 TROUBLESHOOTING

### Issue 1: "Relation 'employee_profiles' does not exist"
**Solution:** The migration includes a CREATE TABLE guard. Run the full migration again — it will create the table.

### Issue 2: "Duplicate key value violates unique constraint"
**Solution:** This is normal on re-runs. The migration uses `ON CONFLICT ... DO UPDATE` to safely upsert. No action needed.

### Issue 3: "Permission denied for schema public"
**Solution:** Ensure your Supabase user has INSERT/UPDATE permissions on `employee_profiles` table. Contact your Supabase admin.

### Issue 4: Prompt looks truncated or malformed
**Solution:** Check character encoding. Supabase should handle UTF-8 by default. If needed, run:
```sql
alter table employee_profiles convert to character set utf8mb4;
```

---

## 📊 MIGRATION DETAILS

| Component | Details |
|-----------|---------|
| **File** | `20251018_add_crystal_2_0_prompt.sql` |
| **Prompt Size** | ~50,000 characters (~1000 lines) |
| **Capabilities** | 13 (spending, income, trend, cashflow, budgeting, forecasting, optimization, benchmarking, goal-alignment, decision-support, proactive-insights, industry-awareness, memory-integration) |
| **Tools** | 1 (delegate) |
| **Operation** | Upsert (insert or update) |
| **Conflict Handling** | ON CONFLICT (slug) DO UPDATE |
| **Safety** | Idempotent (safe to run multiple times) |

---

## 🎯 POST-DEPLOYMENT STEPS

### 1. Update Production Code
Ensure `netlify/functions/chat-v3-production.ts` is using the latest code with:
- ✅ CRYSTAL_PERSONA_V2 constant
- ✅ Context enrichment functions
- ✅ Analytics integration
- ✅ Delegation matrix

### 2. Monitor Performance
```sql
-- Check query performance
SELECT
  query,
  calls,
  mean_time,
  total_time
FROM pg_stat_statements
WHERE query LIKE '%employee_profiles%'
ORDER BY mean_time DESC;
```

### 3. Test Crystal in Production
```bash
# Test industry detection
curl -X POST 'https://your-domain.netlify.app/.netlify/functions/chat-v3-production?nostream=1' \
  -H 'content-type: application/json' \
  -d '{"userId":"test","message":"I run a bakery","employeeSlug":"crystal-analytics"}'
```

### 4. Log Deployment
```bash
# Create deployment log entry
echo "Crystal 2.0 deployed to database on $(date)" >> DEPLOYMENTS.log
```

---

## 🚀 ROLLBACK (If Needed)

### Option 1: Deactivate (Safest)
```sql
update public.employee_profiles
set is_active = false
where slug = 'crystal-analytics';
```

### Option 2: Delete Entry
```sql
delete from public.employee_profiles
where slug = 'crystal-analytics';
```

### Option 3: Restore from Backup
```bash
# Restore from Supabase backup
supabase db restore --backup-id <backup-id>
```

---

## 📝 NOTES

- **Idempotent:** The migration can be run multiple times safely (upsert logic)
- **Non-destructive:** Doesn't modify other employee profiles
- **Quick:** Should complete in <500ms
- **Verified:** Includes verification queries to confirm success

---

## 🎉 SUCCESS CRITERIA

✅ Migration runs without errors  
✅ Crystal profile appears in `employee_profiles`  
✅ System prompt is ~50,000 characters  
✅ 13 capabilities are assigned  
✅ `delegate` tool is enabled  
✅ `is_active` is true  
✅ Crystal responds in production  

---

## 📞 SUPPORT

**Issues?** Check:
1. Supabase connection string is correct
2. User has INSERT/UPDATE permissions
3. Table `employee_profiles` exists
4. No network/firewall blocks
5. Character encoding is UTF-8

---

**Status:** ✅ Ready to Deploy  
**Date:** October 18, 2025  
**Version:** 2.0 (Complete 20-Section Prompt)

🚀 **Ready to deploy Crystal 2.0 to the database!**






