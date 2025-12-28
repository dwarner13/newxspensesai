# SQL Migrations to Run

**Date**: November 20, 2025  
**Status**: ⚠️ **REQUIRED** - Run these migrations for Phase 2.3 and Phase 3.2 to work

---

## Required Migrations

### 1. ✅ Phase 2.3: Memory Extraction Queue

**File**: `supabase/migrations/20251120_add_memory_extraction_queue.sql`

**What it does:**
- Creates `memory_extraction_queue` table
- Enables async memory extraction (non-blocking chat responses)
- Adds RPC functions for job processing

**Required for:**
- ✅ Async memory extraction
- ✅ Background worker processing
- ✅ Non-blocking chat responses

**How to run:**
```bash
# Option 1: Via Supabase CLI
supabase migration up

# Option 2: Via Supabase Dashboard
# Copy contents of 20251120_add_memory_extraction_queue.sql
# Paste into SQL Editor and run
```

---

### 2. ✅ Phase 3.2: Handoff Context Fields

**File**: `supabase/migrations/20251120_add_handoff_context_fields.sql`

**What it does:**
- Creates `handoffs` table (if it doesn't exist)
- Adds context fields: `context_summary`, `key_facts`, `recent_messages`, `user_intent`
- Adds indexes and RLS policies

**Required for:**
- ✅ Handoff context passing
- ✅ Receiving employee gets conversation context
- ✅ Seamless handoff transitions

**How to run:**
```bash
# Option 1: Via Supabase CLI
supabase migration up

# Option 2: Via Supabase Dashboard
# Copy contents of 20251120_add_handoff_context_fields.sql
# Paste into SQL Editor and run
```

---

## Migration Order

Run migrations in this order:
1. `20251120_add_memory_extraction_queue.sql` (Phase 2.3)
2. `20251120_add_handoff_context_fields.sql` (Phase 3.2)

---

## Verification

After running migrations, verify:

### 1. Memory Extraction Queue
```sql
-- Check table exists
SELECT * FROM information_schema.tables 
WHERE table_name = 'memory_extraction_queue';

-- Check RPC functions exist
SELECT routine_name FROM information_schema.routines 
WHERE routine_name LIKE 'claim_memory_extraction_job%';
```

### 2. Handoffs Table
```sql
-- Check table exists
SELECT * FROM information_schema.tables 
WHERE table_name = 'handoffs';

-- Check context fields exist
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'handoffs' 
AND column_name IN ('context_summary', 'key_facts', 'recent_messages', 'user_intent');
```

---

## What Happens If You Don't Run These?

### Without Memory Extraction Queue:
- ❌ Memory extraction will fail (table doesn't exist)
- ❌ Chat will still work, but memory won't be extracted
- ⚠️ Error: `relation "memory_extraction_queue" does not exist`

### Without Handoff Context Fields:
- ❌ Handoff context won't be stored
- ❌ Receiving employees won't get context
- ⚠️ Error: `column "context_summary" does not exist` (if handoffs table exists)
- ⚠️ Error: `relation "handoffs" does not exist` (if table doesn't exist)

---

## Quick Copy-Paste Commands

### Run Both Migrations (Supabase CLI):
```bash
cd /path/to/project-bolt-fixed
supabase migration up
```

### Run Individual Migrations (Supabase Dashboard):
1. Open Supabase Dashboard → SQL Editor
2. Copy contents of migration file
3. Paste and run

---

**Status**: ⚠️ **RUN THESE MIGRATIONS BEFORE TESTING**



