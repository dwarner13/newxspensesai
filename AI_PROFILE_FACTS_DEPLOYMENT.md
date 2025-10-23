# 🚀 AI PROFILE FACTS — DEPLOYMENT GUIDE

**Goal:** Deploy `ai_profile_facts` table to Supabase  
**Time:** 5-10 minutes  
**Difficulty:** Easy  
**Rollback:** Simple (single DROP TABLE)  

---

## 📋 QUICK START

### Option 1: Supabase Dashboard (Recommended)

1. Go to Supabase Console
2. Click "SQL Editor"
3. Click "New Query"
4. Paste the SQL from below
5. Click "Run"
6. Done! ✅

### Option 2: Supabase CLI

```bash
supabase db push
```

### Option 3: Direct PostgreSQL

```bash
psql -U postgres -d your_db < deployment.sql
```

---

## 📝 DEPLOYMENT SQL

Copy and run this entire script in Supabase SQL Editor:

```sql
-- ============================================================================
-- AI PROFILE FACTS TABLE — Entity extraction storage
-- ============================================================================

-- Create table
create table if not exists ai_profile_facts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  k text not null,
  v text not null,
  confidence numeric default 0.9,
  source text default 'prime/entity-extraction',
  updated_at timestamptz not null default now(),
  unique (user_id, k)
);

-- Create indexes for performance
create index if not exists idx_ai_profile_facts_user on ai_profile_facts (user_id);
create index if not exists idx_ai_profile_facts_k on ai_profile_facts (k);

-- Enable Row Level Security
alter table ai_profile_facts enable row level security;

-- Policy 1: SELECT - Users can read their own facts
do $$ begin
  create policy ai_profile_facts_select_self on ai_profile_facts
    for select using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

-- Policy 2: INSERT - Users can insert their own facts (via service role)
do $$ begin
  create policy ai_profile_facts_upsert_self on ai_profile_facts
    for insert with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

-- Policy 3: UPDATE - Users can update their own facts
do $$ begin
  create policy ai_profile_facts_update_self on ai_profile_facts
    for update using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

-- Verify creation
select 'ai_profile_facts table created successfully' as status;
```

---

## ✅ VERIFICATION

After deployment, verify everything works:

### Check Table Exists

```sql
SELECT EXISTS(
  SELECT 1 FROM information_schema.tables 
  WHERE table_name = 'ai_profile_facts'
) as table_exists;

-- Should return: true
```

### Check Indexes

```sql
SELECT indexname FROM pg_indexes 
WHERE tablename = 'ai_profile_facts';

-- Should return:
-- idx_ai_profile_facts_user
-- idx_ai_profile_facts_k
```

### Check RLS Policies

```sql
SELECT * FROM pg_policies 
WHERE tablename = 'ai_profile_facts';

-- Should return 3 policies:
-- ai_profile_facts_select_self
-- ai_profile_facts_upsert_self
-- ai_profile_facts_update_self
```

### Check Structure

```sql
\d ai_profile_facts;

-- Should show all columns with correct types
```

---

## 🧪 TEST DEPLOYMENT

### Test 1: Insert Test Data

```sql
-- Insert test fact
INSERT INTO ai_profile_facts (user_id, k, v, confidence, source) 
VALUES (
  '123e4567-e89b-12d3-a456-426614174000',
  'business_type',
  'bakery',
  0.95,
  'prime/entity-extraction'
);

-- Check insertion
SELECT * FROM ai_profile_facts 
WHERE k = 'business_type';

-- Should return 1 row with your test data
```

### Test 2: Test Upsert

```sql
-- Update existing fact (upsert pattern)
INSERT INTO ai_profile_facts (user_id, k, v, confidence, source) 
VALUES (
  '123e4567-e89b-12d3-a456-426614174000',
  'business_type',
  'artisan bakery',
  0.99,
  'prime/entity-extraction'
)
ON CONFLICT (user_id, k) DO UPDATE SET
  v = EXCLUDED.v,
  confidence = EXCLUDED.confidence,
  updated_at = now();

-- Check update
SELECT * FROM ai_profile_facts 
WHERE k = 'business_type';

-- Should show updated value and 0.99 confidence
```

### Test 3: Test RLS

```sql
-- Set JWT token to simulate user
SET jwt.claims.sub = '123e4567-e89b-12d3-a456-426614174000';

-- Query should return data (user's own)
SELECT * FROM ai_profile_facts;

-- Set JWT to different user
SET jwt.claims.sub = 'different-user-id';

-- Query should return nothing (RLS blocks it)
SELECT * FROM ai_profile_facts;
```

### Test 4: Cleanup Test Data

```sql
-- Delete test data
DELETE FROM ai_profile_facts 
WHERE k = 'business_type' 
AND v IN ('bakery', 'artisan bakery');
```

---

## 🔧 INTEGRATION WITH CODE

### Step 1: Add Helper Function (TypeScript)

```typescript
// lib/db-ai-facts.ts

import { SupabaseClient } from '@supabase/supabase-js';

interface AIProfileFact {
  k: string;
  v: string;
  confidence?: number;
  source?: string;
}

export async function storeAIFact(
  db: SupabaseClient,
  userId: string,
  fact: AIProfileFact
) {
  const { error } = await db
    .from('ai_profile_facts')
    .upsert({
      user_id: userId,
      k: fact.k,
      v: fact.v,
      confidence: fact.confidence ?? 0.9,
      source: fact.source ?? 'prime/entity-extraction'
    });

  if (error) {
    console.error('Failed to store AI fact:', error);
    throw error;
  }
}

export async function getUserFacts(
  db: SupabaseClient,
  userId: string,
  minConfidence: number = 0.85
) {
  const { data, error } = await db
    .from('ai_profile_facts')
    .select('k, v, confidence')
    .eq('user_id', userId)
    .gte('confidence', minConfidence)
    .order('k');

  if (error) {
    console.error('Failed to fetch user facts:', error);
    throw error;
  }

  return data ?? [];
}

export async function getUserFact(
  db: SupabaseClient,
  userId: string,
  key: string
) {
  const { data, error } = await db
    .from('ai_profile_facts')
    .select('k, v, confidence')
    .eq('user_id', userId)
    .eq('k', key)
    .maybeSingle();

  if (error) {
    console.error('Failed to fetch user fact:', error);
    throw error;
  }

  return data ?? null;
}
```

### Step 2: Use in Prime's Context

```typescript
// In chat-v3-production.ts

import { getUserFacts } from '@/lib/db-ai-facts';

async function buildPrimeContext(userId: string) {
  // Get stored facts about user
  const facts = await getUserFacts(db, userId, 0.85);
  
  const factContext = facts
    .map(f => `- ${f.k}: ${f.v} (confidence: ${f.confidence})`)
    .join('\n');

  return `## Known about user:\n${factContext}`;
}
```

### Step 3: Extract and Store Facts

```typescript
// In Prime's entity extraction

async function extractAndStoreFacts(
  userId: string,
  message: string,
  primeResponse: string
) {
  // Example: Extract from message using AI or regex
  const entities = extractEntities(message, primeResponse);

  for (const entity of entities) {
    await storeAIFact(db, userId, {
      k: entity.type,
      v: entity.value,
      confidence: entity.confidence,
      source: 'prime/entity-extraction'
    });
  }
}
```

---

## 🔄 MIGRATION PATH

### For Existing Databases

If you already have users, the migration is safe:

1. Table creates with no data loss to existing tables
2. RLS policies are created but don't affect other tables
3. Zero downtime deployment

### To Backfill Existing User Data

```sql
-- Example: Extract business type from user profiles
INSERT INTO ai_profile_facts (user_id, k, v, confidence, source)
SELECT 
  id as user_id,
  'business_type' as k,
  business_type as v,
  0.95 as confidence,
  'backfill/user_profile' as source
FROM users
WHERE business_type IS NOT NULL
ON CONFLICT (user_id, k) DO NOTHING;
```

---

## 📊 MONITORING

### Check Storage Usage

```sql
-- Size of table in MB
SELECT 
  pg_size_pretty(pg_total_relation_size('ai_profile_facts')) as table_size;

-- Row count
SELECT COUNT(*) as row_count FROM ai_profile_facts;

-- Average confidence
SELECT AVG(confidence) as avg_confidence FROM ai_profile_facts;
```

### Monitor Query Performance

```sql
-- Check if queries use indexes
EXPLAIN ANALYZE
SELECT * FROM ai_profile_facts 
WHERE user_id = '123e4567-e89b-12d3-a456-426614174000';

-- Should show "Index Scan" not "Seq Scan"
```

---

## 🔙 ROLLBACK

If you need to remove the table:

```sql
-- Drop the table
DROP TABLE IF EXISTS ai_profile_facts CASCADE;

-- Verify it's gone
SELECT EXISTS(
  SELECT 1 FROM information_schema.tables 
  WHERE table_name = 'ai_profile_facts'
) as table_exists;

-- Should return: false
```

---

## 🛡️ SECURITY CHECKLIST

- [ ] RLS enabled on table
- [ ] 3 policies created (select, insert, update)
- [ ] user_id foreign key references auth.users (optional but recommended)
- [ ] Confidence scores between 0-1
- [ ] Source field tracking extraction method
- [ ] No PII stored in fact values

**Optional: Add FK constraint**

```sql
ALTER TABLE ai_profile_facts
ADD CONSTRAINT fk_user_id FOREIGN KEY (user_id)
REFERENCES auth.users(id) ON DELETE CASCADE;
```

---

## 📚 RELATED TABLES

This table works with:

- `auth.users` — User data
- `user_memory_facts` — General memory facts
- `chat_messages` — Conversation history
- `employee_profiles` — AI employee configs

---

## 🎯 NEXT STEPS

1. ✅ Deploy table (this guide)
2. ✅ Add helper functions (above)
3. ✅ Integrate with Prime (above)
4. ✅ Test extraction (see test guide)
5. ✅ Monitor performance (see monitoring)

---

## 📞 TROUBLESHOOTING

### Problem: "relation 'ai_profile_facts' does not exist"

**Solution:** Re-run deployment SQL, check for errors

### Problem: "Permission denied" on INSERT

**Solution:** Check RLS policies, ensure service role has access

### Problem: Queries slow

**Solution:** Run ANALYZE to update statistics

```sql
ANALYZE ai_profile_facts;
```

### Problem: Duplicate key error

**Solution:** Use UPSERT pattern, not INSERT

```sql
-- Instead of INSERT, use:
INSERT ... ON CONFLICT (user_id, k) DO UPDATE SET ...
```

---

## ✅ DEPLOYMENT CHECKLIST

- [ ] SQL executed without errors
- [ ] Table exists and has correct schema
- [ ] Indexes created
- [ ] RLS enabled with 3 policies
- [ ] Test data inserted successfully
- [ ] Upsert tested
- [ ] RLS tested (users see only their data)
- [ ] Code integration ready
- [ ] Monitoring set up

---

**Status:** ✅ Ready to Deploy  
**Estimated Time:** 5-10 minutes  
**Risk Level:** Very Low (additive only)  

🚀 **Ready to deploy Prime's memory system!**





