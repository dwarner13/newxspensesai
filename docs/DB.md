# Database Documentation

This document outlines the database schema, Row Level Security (RLS) policies, and testing strategies for XspensesAI.

---

## Table of Contents

1. [Overview](#overview)
2. [Row Level Security (RLS)](#row-level-security-rls)
3. [User-Scoped Tables](#user-scoped-tables)
4. [Service Role Bypass](#service-role-bypass)
5. [Testing RLS](#testing-rls)
6. [Migrations](#migrations)

---

## Overview

XspensesAI uses **Supabase** (PostgreSQL) as its primary database. All user-scoped data is protected by Row Level Security (RLS) policies to ensure users can only access their own data.

**Key Principles**:
- All user-scoped tables have RLS enabled
- Policies enforce `user_id = auth.uid()` for all operations
- Service role key bypasses RLS (used by serverless functions)
- Anonymous users cannot access any data

---

## Row Level Security (RLS)

### What is RLS?

Row Level Security (RLS) is a PostgreSQL feature that restricts access to rows in a table based on policies. Instead of relying on application-level checks, RLS enforces security at the database level.

### How It Works

1. **Enable RLS**: `ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;`
2. **Create Policies**: Define who can SELECT, INSERT, UPDATE, DELETE rows
3. **Policy Conditions**: Use `USING` (for SELECT/UPDATE/DELETE) and `WITH CHECK` (for INSERT/UPDATE)

### Example Policy

```sql
-- Users can only see their own transactions
CREATE POLICY transactions_select_own ON public.transactions
  FOR SELECT
  USING (user_id = auth.uid());
```

**Breaking Down the Policy**:
- `transactions_select_own`: Policy name
- `FOR SELECT`: Applies to SELECT queries
- `USING (user_id = auth.uid())`: Only return rows where `user_id` matches the authenticated user's ID

---

## User-Scoped Tables

The following tables have RLS enabled with `user_id = auth.uid()` policies:

### 1. `transactions`

**Column**: `user_id` (TEXT or UUID)

**Policies**:
- ✅ SELECT: Users can only see their own transactions
- ✅ INSERT: Users can only insert transactions for themselves
- ✅ UPDATE: Users can only update their own transactions
- ✅ DELETE: Users can only delete their own transactions

**Policy File**: `supabase/policies/day12_rls.sql`

### 2. `transaction_items`

**Column**: `transaction_id` (references `transactions.id`)

**Policies**:
- ✅ SELECT: Users can only see items for their own transactions (via EXISTS subquery)
- ✅ INSERT: Users can only insert items for their own transactions
- ✅ UPDATE: Users can only update items for their own transactions
- ✅ DELETE: Users can only delete items for their own transactions

**Note**: Policies check transaction ownership via subquery:
```sql
EXISTS (
  SELECT 1 FROM public.transactions t
  WHERE t.id = transaction_items.transaction_id
  AND t.user_id = auth.uid()
)
```

### 3. `vendor_aliases`

**Column**: `user_id` (TEXT or UUID)

**Policies**:
- ✅ SELECT: Users can only see their own vendor aliases
- ✅ INSERT: Users can only insert vendor aliases for themselves
- ✅ UPDATE: Users can only update their own vendor aliases
- ✅ DELETE: Users can only delete their own vendor aliases

### 4. `user_xp_ledger`

**Column**: `user_id` (TEXT or UUID)

**Policies**:
- ✅ SELECT: Users can only see their own XP ledger entries
- ✅ INSERT: Users can only insert XP entries for themselves
- ❌ UPDATE: No policy (users cannot update XP)
- ❌ DELETE: No policy (users cannot delete XP)

**Note**: XP is typically awarded by the system, so UPDATE/DELETE policies are intentionally omitted.

---

## Service Role Bypass

### What is Service Role?

The **service role key** (`SUPABASE_SERVICE_ROLE_KEY`) is a special key that bypasses all RLS policies. It's used by:
- Netlify Functions (serverless backend)
- Admin operations
- Batch processing
- Data migrations

### Why Use Service Role?

Serverless functions need to:
- Access data across users (for admin operations)
- Perform batch operations (e.g., categorizing transactions)
- Run migrations without RLS restrictions

### Security Best Practices

⚠️ **Never expose the service role key to the frontend!**

- ✅ Use service role key in Netlify Functions only
- ✅ Use anonymous key (`SUPABASE_ANON_KEY`) in frontend
- ✅ Store service role key in environment variables (`.env`, Netlify secrets)
- ❌ Never commit service role key to git
- ❌ Never use service role key in client-side code

### Example Usage

```typescript
// ✅ CORRECT: Serverless function uses service role
import { admin } from './_shared/supabase';

export const handler: Handler = async (event) => {
  const sb = admin(); // Uses SUPABASE_SERVICE_ROLE_KEY
  // This bypasses RLS - can access all data
  const allTransactions = await sb.from('transactions').select('*');
};

// ✅ CORRECT: Frontend uses anonymous key (with RLS)
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY! // Anonymous key
);
// RLS policies apply - users can only see their own data
const myTransactions = await supabase.from('transactions').select('*');
```

---

## Testing RLS

### Manual Testing (Supabase Dashboard)

1. **Create Test User**:
   ```sql
   -- In Supabase SQL Editor (as service role)
   INSERT INTO auth.users (id, email) VALUES 
   ('test-user-1', 'test1@example.com'),
   ('test-user-2', 'test2@example.com');
   ```

2. **Insert Test Data**:
   ```sql
   -- As service role (bypasses RLS)
   INSERT INTO public.transactions (id, user_id, merchant, amount, date)
   VALUES 
   ('tx-1', 'test-user-1', 'Store A', 10.00, '2025-01-01'),
   ('tx-2', 'test-user-2', 'Store B', 20.00, '2025-01-01');
   ```

3. **Test as User 1**:
   ```sql
   -- Switch to user context (in Supabase Dashboard → Authentication → Impersonate)
   -- Or use Supabase client with user token
   
   SELECT * FROM public.transactions;
   -- Should only return tx-1 (user_id = 'test-user-1')
   ```

4. **Test as User 2**:
   ```sql
   SELECT * FROM public.transactions;
   -- Should only return tx-2 (user_id = 'test-user-2')
   ```

### Automated Testing (Jest/Vitest)

```typescript
import { createClient } from '@supabase/supabase-js';

describe('RLS Policies', () => {
  it('should only return user 1 transactions for user 1', async () => {
    // Create client with user 1 token
    const user1Client = createClient(
      SUPABASE_URL,
      SUPABASE_ANON_KEY,
      {
        global: {
          headers: {
            Authorization: `Bearer ${user1Token}`
          }
        }
      }
    );

    const { data } = await user1Client
      .from('transactions')
      .select('*');

    // Should only contain user 1's transactions
    expect(data.every(tx => tx.user_id === 'test-user-1')).toBe(true);
  });

  it('should block user 1 from accessing user 2 transactions', async () => {
    const user1Client = createClient(/* ... */);

    // Try to access user 2's transaction directly
    const { data, error } = await user1Client
      .from('transactions')
      .select('*')
      .eq('id', 'tx-2'); // User 2's transaction

    // Should return empty (RLS blocks it)
    expect(data).toEqual([]);
    expect(error).toBeNull(); // RLS doesn't return error, just filters rows
  });
});
```

### Testing Service Role Bypass

```typescript
import { admin } from './_shared/supabase';

describe('Service Role Bypass', () => {
  it('should allow service role to access all data', async () => {
    const sb = admin(); // Uses service role key

    const { data } = await sb
      .from('transactions')
      .select('*');

    // Should return transactions from all users (RLS bypassed)
    expect(data.length).toBeGreaterThan(0);
  });
});
```

---

## Migrations

### Creating RLS Policies

RLS policies are defined in `supabase/policies/day12_rls.sql`.

**To Apply**:
1. Run the SQL file in Supabase SQL Editor (as service role)
2. Or use Supabase CLI: `supabase db push`

**Idempotency**:
- All policies use `DROP POLICY IF EXISTS` before `CREATE POLICY`
- Safe to run multiple times (won't create duplicates)

### Migration Checklist

When adding a new user-scoped table:

1. ✅ Create table with `user_id` column
2. ✅ Enable RLS: `ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;`
3. ✅ Create policies for SELECT, INSERT, UPDATE, DELETE
4. ✅ Test policies with multiple users
5. ✅ Document in this file

---

## Additional Resources

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL RLS Documentation](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [Supabase Service Role Key](https://supabase.com/docs/guides/auth/service-role-key)

---

## Questions?

If you have questions about RLS or database security, check:
1. This documentation
2. `supabase/policies/day12_rls.sql` (policy definitions)
3. Supabase Dashboard → Authentication → Policies
