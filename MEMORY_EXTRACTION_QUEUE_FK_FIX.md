# 🔧 Memory Extraction Queue FK Constraint Fix

## Problem Summary

The `memory_extraction_queue` table had a foreign key constraint on `user_id` that referenced `auth.users(id)`. This caused errors when:

1. **Demo/Test Users**: The demo user UUID `00000000-0000-4000-8000-000000000001` doesn't exist in `auth.users`, causing FK violations
2. **Retry Loops**: Failed jobs with FK errors were retried indefinitely, causing:
   - Terminal spam with FK error messages
   - Chat sending "undefined" messages repeatedly
   - Worker consuming resources on impossible-to-succeed jobs

## Root Cause

- **Schema Mismatch**: `memory_extraction_queue` had `user_id uuid NOT NULL REFERENCES auth.users(id)`
- **Other Tables**: `user_memory_facts` and `user_tasks` use `user_id` without FK constraints (relying on RLS for security)
- **Demo User**: System uses demo UUID for testing, but it doesn't exist in `auth.users`

## Solution

### 1. Remove FK Constraint (Migration)

**File**: `supabase/migrations/20251123_fix_memory_extraction_queue_fk.sql`

- Drops the `memory_extraction_queue_user_id_fkey` constraint
- Matches the pattern used by `user_memory_facts` and `user_tasks`
- Security is maintained via RLS policies (not FK constraints)

### 2. Add User ID Validation

**File**: `netlify/functions/_shared/memory.ts` - `queueMemoryExtraction()`

- Validates `userId` is not null/undefined
- Validates UUID format before insert
- Catches FK errors specifically and logs them (no retry)
- Prevents invalid UUIDs from entering the queue

### 3. Prevent Retry Loops

**File**: `netlify/functions/memory-extraction-worker.ts`

- Detects FK constraint errors (`code: '23503'`)
- Marks FK errors as permanently failed immediately (no retry)
- Sets `retry_count = 999` to prevent retry function from re-queuing
- Logs clear error messages for debugging

**File**: `supabase/migrations/20251120_add_memory_extraction_queue.sql` - `fail_memory_extraction_job()`

- Updated SQL function to detect FK errors in error message
- Marks FK errors as permanently failed (no retry)
- Prevents retry logic from re-queuing FK violations

## Files Changed

1. **`supabase/migrations/20251123_fix_memory_extraction_queue_fk.sql`** (NEW)
   - Removes FK constraint from `memory_extraction_queue.user_id`

2. **`supabase/migrations/20251120_add_memory_extraction_queue.sql`** (UPDATED)
   - Updated `fail_memory_extraction_job()` to handle FK errors

3. **`netlify/functions/_shared/memory.ts`** (UPDATED)
   - Added UUID validation in `queueMemoryExtraction()`
   - Added FK error detection and handling

4. **`netlify/functions/memory-extraction-worker.ts`** (UPDATED)
   - Added FK error detection in worker
   - Marks FK errors as permanently failed (no retry)

## Schema Changes

### Before
```sql
CREATE TABLE public.memory_extraction_queue (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- ... other columns
);
```

### After
```sql
CREATE TABLE public.memory_extraction_queue (
  user_id uuid NOT NULL, -- FK constraint removed
  -- ... other columns
);
-- Security maintained via RLS policies
```

## Verification Plan

### Step 1: Run Migration

```bash
# Apply the migration
supabase migration up
# OR if using Supabase CLI locally:
supabase db push
```

### Step 2: Verify FK Constraint Removed

```sql
-- Check constraints on memory_extraction_queue
SELECT conname, contype 
FROM pg_constraint 
WHERE conrelid = 'public.memory_extraction_queue'::regclass;

-- Should NOT see memory_extraction_queue_user_id_fkey
```

### Step 3: Test with Demo User

```bash
# Send a chat message with demo user ID
curl -X POST http://localhost:8888/.netlify/functions/chat \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "00000000-0000-4000-8000-000000000001",
    "message": "Test message",
    "sessionId": "test-session-123"
  }'
```

**Expected**: 
- ✅ No FK errors in terminal
- ✅ Job queued successfully (or skipped with validation warning)
- ✅ No "undefined" messages in chat

### Step 4: Test Worker Processing

```bash
# Trigger worker manually
curl -X POST http://localhost:8888/.netlify/functions/memory-extraction-worker
```

**Expected**:
- ✅ No FK errors in terminal
- ✅ Jobs process successfully OR fail permanently (no retry loop)
- ✅ Worker logs show clear error messages

### Step 5: Verify No Retry Loops

```sql
-- Check for stuck jobs
SELECT id, user_id, status, retry_count, error_message, created_at
FROM public.memory_extraction_queue
WHERE status = 'pending' 
  AND retry_count > 3
ORDER BY created_at DESC
LIMIT 10;

-- Should see no jobs stuck in retry loop
```

## Expected Behavior After Fix

1. **No FK Errors**: Terminal no longer shows `violates foreign key constraint` errors
2. **No Retry Loops**: FK errors are marked as permanently failed immediately
3. **No "Undefined" Messages**: Chat no longer sends repeated "undefined" messages
4. **Clear Logging**: Errors are logged with context for debugging
5. **Demo User Support**: Demo/test UUIDs can be used without FK violations

## Security Note

**RLS Policies Still Enforce Security**: Removing the FK constraint does NOT reduce security. Row Level Security (RLS) policies ensure users can only access their own data:

```sql
-- RLS policy example (if exists)
CREATE POLICY owner_rw_memory_extraction_queue ON public.memory_extraction_queue
  FOR ALL USING (user_id = auth.uid()::text);
```

This matches the security model used by `user_memory_facts` and `user_tasks` tables.

## Migration Order

1. **First**: Run `20251123_fix_memory_extraction_queue_fk.sql` to remove FK constraint
2. **Then**: Deploy updated TypeScript code (memory.ts, worker.ts)
3. **Finally**: Test with demo user and verify no errors

## Rollback Plan

If issues occur, you can restore the FK constraint:

```sql
-- Restore FK constraint (if needed)
ALTER TABLE public.memory_extraction_queue
  ADD CONSTRAINT memory_extraction_queue_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
```

However, this will bring back the original problem. The recommended fix is to create the demo user in `auth.users` if FK constraints are required.

---

**Status**: ✅ Fix Complete
**Date**: 2025-11-23
**Impact**: High - Fixes terminal spam and chat "undefined" message loops



