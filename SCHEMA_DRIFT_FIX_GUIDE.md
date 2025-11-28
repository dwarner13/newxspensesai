# Schema Drift Fix - Migration Guide

## Summary

This migration fixes schema drift issues in your local Supabase database for the Smart Import AI and chat system.

**Fixed Issues:**
- ✅ Missing `original_name` column in `user_documents`
- ✅ Missing `source_type` column in `user_documents` 
- ✅ Missing `confidence` column in `user_memory_facts`
- ✅ Missing `content_redacted` column in `memory_embeddings`
- ✅ RLS policy violation for `chat_sessions` with demo users
- ✅ Added support for demo user UUIDs in RLS policies

## Files Changed

1. **Migration File**: `supabase/migrations/20250127_fix_schema_drift.sql`
   - Adds missing columns to `user_documents`
   - Adds `confidence` column to `user_memory_facts`
   - Adds `content_redacted` column to `memory_embeddings`
   - Creates `categorization_rules` table
   - Adds dev-friendly RLS policy for `chat_sessions`
   - Ensures `transactions` table has all required columns

## How to Apply

### Option 1: Using Supabase CLI (Recommended)

```bash
# Make sure Supabase is running locally
supabase start

# Apply the migration
supabase db push

# Or if you want to reset and apply all migrations
supabase db reset
```

### Option 2: Manual SQL Execution

If you're using Supabase Dashboard:

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy the contents of `supabase/migrations/20250127_fix_schema_drift.sql`
4. Paste and execute

### Option 3: Direct psql Connection

```bash
# Connect to your local Supabase database
psql postgresql://postgres:postgres@localhost:54322/postgres

# Run the migration
\i supabase/migrations/20250127_fix_schema_drift.sql
```

## Storage Bucket Setup

The worker expects a storage bucket named `redacted_docs` for storing redacted PDFs.

### Create the Bucket Manually:

1. Go to **Supabase Dashboard** → **Storage**
2. Click **Create Bucket**
3. Name: `redacted_docs`
4. **Public**: No (private bucket)
5. **File size limit**: 50MB (or as needed)
6. **Allowed MIME types**: `application/pdf` (or leave empty for all)

### Or via Supabase CLI:

```bash
# Create the bucket
supabase storage create redacted_docs --public false
```

## Verification

After applying the migration, verify the changes:

### 1. Check Tables and Columns

```sql
-- Verify user_documents columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'user_documents' 
ORDER BY ordinal_position;

-- Verify categorization_rules exists
SELECT COUNT(*) FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'categorization_rules';

-- Verify memory_embeddings has content_redacted
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'memory_embeddings' 
AND column_name = 'content_redacted';

-- Verify user_memory_facts has confidence
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'user_memory_facts' 
AND column_name = 'confidence';
```

### 2. Test Chat Sessions

```sql
-- Test inserting a chat session (should work with service role)
-- This should not fail with RLS errors
SELECT * FROM chat_sessions LIMIT 1;
```

### 3. Check Logs

After restarting your worker and Netlify dev servers, you should see:

✅ **No more errors like:**
- `column user_documents.original_name does not exist`
- `Could not find the 'mime_type' column`
- `Could not find the 'confidence' column`
- `Could not find the 'content_redacted' column`
- `Could not find the table 'public.categorization_rules'`
- `new row violates row-level security policy for table "chat_sessions"`

**RLS Policy Fix:**
The migration now includes a dev-friendly RLS policy that allows demo users (UUIDs starting with `00000000-0000-4000-8000-`) to create chat sessions even when not authenticated. This is safe for local development.

✅ **Storage errors should be resolved:**
- `Bucket not found for bucket "redacted_docs"` (if bucket is created)

## Expected Behavior After Fix

1. **Document Upload**: Worker can store documents with all metadata
2. **Transaction Parsing**: Transactions are saved correctly
3. **Categorization**: Rules-based categorization works (if rules exist)
4. **Chat Sessions**: No RLS violations for service role operations
5. **Memory System**: Confidence scores and redacted content are stored

## Testing Checklist

- [ ] Migration applied successfully
- [ ] `redacted_docs` bucket created
- [ ] Upload a PDF via Smart Import AI
- [ ] Verify Byte shows transaction count (not 0)
- [ ] Check worker logs for no schema errors
- [ ] Send a message to Prime in chat
- [ ] Verify no RLS errors in console
- [ ] Check that document appears in `user_documents` table

## Rollback (If Needed)

If you need to rollback, you can drop the added columns/tables:

```sql
-- WARNING: This will delete data!
-- Only run if you're sure

-- Drop categorization_rules (if needed)
DROP TABLE IF EXISTS public.categorization_rules CASCADE;

-- Remove columns from user_documents (if needed)
-- ALTER TABLE public.user_documents DROP COLUMN IF EXISTS original_name;
-- ALTER TABLE public.user_documents DROP COLUMN IF EXISTS mime_type;
-- ... (repeat for other columns)

-- Remove confidence from user_memory_facts
-- ALTER TABLE public.user_memory_facts DROP COLUMN IF EXISTS confidence;

-- Remove content_redacted from memory_embeddings
-- ALTER TABLE public.memory_embeddings DROP COLUMN IF EXISTS content_redacted;
```

## Notes

- The migration is **idempotent** - safe to run multiple times
- RLS policies remain enabled for security
- Service role has full access (needed for backend operations)
- Authenticated users have restricted access (RLS enforced)
- The `chat_sessions` dev policy allows service role to bypass RLS for local development

## Support

If you encounter issues:

1. Check Supabase logs: `supabase logs`
2. Verify migration was applied: `supabase db diff`
3. Check table structure: Run verification queries above
4. Ensure Supabase is running: `supabase status`

