# User Tasks Table Migration Summary

## Problem
The terminal shows errors like:
```
Could not find the table 'public.user_tasks' in the schema cache
```

This indicates that the `user_tasks` table either doesn't exist in the database or Supabase's schema cache is stale.

## Code Usage Analysis

### Where `user_tasks` is Used

#### 1. **Insert Operations** (`netlify/functions/_shared/memory-extraction.ts:269-277`)
```typescript
await supabase
  .from('user_tasks')
  .insert({
    user_id: userId,                    // text
    description: task.description,      // text
    due_date: task.due || null,         // timestamptz | null
    status: 'pending',                  // text ('pending')
    created_from_session: sessionId,     // uuid | null
    created_at: new Date().toISOString() // timestamptz
  });
```

**Fields Used:**
- `user_id` (text) - Required
- `description` (text) - Required
- `due_date` (timestamptz) - Optional
- `status` (text) - Required, default 'pending'
- `created_from_session` (uuid) - Optional, references chat_sessions
- `created_at` (timestamptz) - Required

#### 2. **Select Operations** (`netlify/functions/_shared/memory-extraction.ts:373-388`)
```typescript
const { data, error } = await supabase
  .from('user_tasks')
  .select('description, due_date, status')
  .eq('user_id', userId)
  .in('status', ['pending', 'in_progress'])
  .order('due_date', { ascending: true })
  .limit(10);
```

**Fields Used:**
- `description` (text) - Selected
- `due_date` (timestamptz) - Selected, used for ordering
- `status` (text) - Selected, filtered for 'pending' or 'in_progress'
- `user_id` (text) - Used in WHERE clause

## Schema Design

### Table: `public.user_tasks`

| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| `id` | uuid | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique task identifier |
| `user_id` | text | NOT NULL | User who owns the task (matches auth.uid()::text) |
| `description` | text | NOT NULL | Task description extracted from conversation |
| `due_date` | timestamptz | NULL | Optional due date for the task |
| `status` | text | NOT NULL, DEFAULT 'pending', CHECK IN ('pending', 'in_progress', 'completed', 'cancelled') | Task status |
| `priority` | int | DEFAULT 3, CHECK BETWEEN 1 AND 5 | Priority level (1=highest, 5=lowest) |
| `created_from_session` | uuid | NULL, REFERENCES chat_sessions(id) ON DELETE SET NULL | Chat session where task was mentioned |
| `completed_at` | timestamptz | NULL | Timestamp when task was completed (auto-set) |
| `created_at` | timestamptz | NOT NULL, DEFAULT now() | Task creation timestamp |
| `updated_at` | timestamptz | NOT NULL, DEFAULT now() | Last update timestamp (auto-updated) |

### Indexes
1. `idx_user_tasks_user_status` - Partial index on (user_id, status) WHERE status IN ('pending', 'in_progress')
2. `idx_user_tasks_due_date` - Partial index on (user_id, due_date) WHERE status IN ('pending', 'in_progress') AND due_date IS NOT NULL
3. `idx_user_tasks_created` - Index on (user_id, created_at DESC)
4. `idx_user_tasks_user_id` - Index on user_id for general queries

### Row Level Security (RLS)
- **RLS Enabled**: Yes
- **Policies**:
  - `Users can view own tasks` - SELECT using (user_id = auth.uid()::text)
  - `Users can insert own tasks` - INSERT WITH CHECK (user_id = auth.uid()::text)
  - `Users can update own tasks` - UPDATE using/with check (user_id = auth.uid()::text)
  - `Users can delete own tasks` - DELETE using (user_id = auth.uid()::text)

### Triggers
1. `trigger_user_tasks_updated_at` - Auto-updates `updated_at` on UPDATE
2. `trigger_user_tasks_completed` - Auto-sets `completed_at` when status changes to 'completed'

## Migration File

**File**: `supabase/migrations/20251123_ensure_user_tasks_table_with_rls.sql`

**What it does:**
1. Creates `user_tasks` table if it doesn't exist (idempotent)
2. Creates all required indexes (idempotent)
3. Enables Row Level Security
4. Creates RLS policies for user isolation
5. Creates triggers for auto-timestamps
6. Grants appropriate permissions
7. Adds helpful comments

## Sample Queries

### Insert a new task (matches code usage)
```typescript
const { data, error } = await supabase
  .from("user_tasks")
  .insert({
    user_id: userId,
    description: "Review Q4 expenses before tax filing",
    due_date: "2025-12-15T00:00:00Z",
    status: "pending",
    created_from_session: sessionId,
    created_at: new Date().toISOString()
  });
```

### Get pending tasks (matches code usage)
```typescript
const { data, error } = await supabase
  .from("user_tasks")
  .select("description, due_date, status")
  .eq("user_id", userId)
  .in("status", ["pending", "in_progress"])
  .order("due_date", { ascending: true })
  .limit(10);
```

### Update task status
```typescript
const { data, error } = await supabase
  .from("user_tasks")
  .update({ 
    status: "completed",
    // completed_at will be auto-set by trigger
  })
  .eq("id", taskId)
  .eq("user_id", userId); // RLS ensures user can only update own tasks
```

## Verification

After running the migration, verify:

1. **Table exists**:
```sql
SELECT EXISTS (
  SELECT 1 FROM information_schema.tables 
  WHERE table_schema = 'public' AND table_name = 'user_tasks'
);
-- Should return: true
```

2. **RLS is enabled**:
```sql
SELECT rowsecurity FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'user_tasks';
-- Should return: true
```

3. **Policies exist**:
```sql
SELECT policyname FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'user_tasks';
-- Should return: 4 policies
```

4. **Test insert** (as authenticated user):
```sql
INSERT INTO public.user_tasks (user_id, description, status)
VALUES (auth.uid()::text, 'Test task', 'pending');
-- Should succeed
```

## Resolution

Once the migration `20251123_ensure_user_tasks_table_with_rls.sql` is applied:

✅ The error `Could not find the table 'public.user_tasks' in the schema cache` will be resolved because:
- The table will exist with all required columns
- Supabase's schema cache will refresh to include the new table
- All code queries will match the table structure

## Next Steps

1. **Apply the migration**:
   ```bash
   # If using Supabase CLI locally
   supabase migration up
   
   # Or apply directly in Supabase Dashboard SQL Editor
   ```

2. **Refresh schema cache** (if needed):
   - Supabase should auto-refresh, but you can force refresh in Dashboard
   - Or restart Supabase local instance if running locally

3. **Verify the fix**:
   - Run the code that was failing
   - Check that tasks can be inserted and queried
   - Verify RLS policies prevent cross-user access

## Notes

- The migration is **idempotent** - safe to run multiple times
- Uses `CREATE TABLE IF NOT EXISTS` to avoid errors if table already exists
- All indexes, triggers, and policies use `IF NOT EXISTS` or `DROP IF EXISTS` patterns
- RLS policies ensure users can only access their own tasks
- The `user_id` column is `text` type to match `auth.uid()::text` format used in the codebase












