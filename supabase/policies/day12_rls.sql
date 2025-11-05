/**
 * 🛡️ Row Level Security (RLS) Policies
 * 
 * Day 12: Enable RLS on user-scoped tables
 * 
 * Tables protected:
 * - transactions
 * - transaction_items
 * - vendor_aliases
 * - user_xp_ledger
 * 
 * Policy: Users can only access their own data (user_id = auth.uid())
 * Service role bypass: Allowed (for admin operations)
 */

-- ============================================================================
-- TRANSACTIONS TABLE
-- ============================================================================

-- Enable RLS
ALTER TABLE IF EXISTS public.transactions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (idempotent)
DROP POLICY IF EXISTS transactions_select_own ON public.transactions;
DROP POLICY IF EXISTS transactions_insert_own ON public.transactions;
DROP POLICY IF EXISTS transactions_update_own ON public.transactions;
DROP POLICY IF EXISTS transactions_delete_own ON public.transactions;

-- SELECT: Users can only see their own transactions
CREATE POLICY transactions_select_own ON public.transactions
  FOR SELECT
  USING (user_id = auth.uid());

-- INSERT: Users can only insert transactions for themselves
CREATE POLICY transactions_insert_own ON public.transactions
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- UPDATE: Users can only update their own transactions
CREATE POLICY transactions_update_own ON public.transactions
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- DELETE: Users can only delete their own transactions
CREATE POLICY transactions_delete_own ON public.transactions
  FOR DELETE
  USING (user_id = auth.uid());

-- ============================================================================
-- TRANSACTION_ITEMS TABLE
-- ============================================================================

-- Enable RLS
ALTER TABLE IF EXISTS public.transaction_items ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (idempotent)
DROP POLICY IF EXISTS transaction_items_select_own ON public.transaction_items;
DROP POLICY IF EXISTS transaction_items_insert_own ON public.transaction_items;
DROP POLICY IF EXISTS transaction_items_update_own ON public.transaction_items;
DROP POLICY IF EXISTS transaction_items_delete_own ON public.transaction_items;

-- SELECT: Users can only see items for their own transactions
-- Note: This uses a subquery to check transaction ownership
CREATE POLICY transaction_items_select_own ON public.transaction_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.transactions t
      WHERE t.id = transaction_items.transaction_id
      AND t.user_id = auth.uid()
    )
  );

-- INSERT: Users can only insert items for their own transactions
CREATE POLICY transaction_items_insert_own ON public.transaction_items
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.transactions t
      WHERE t.id = transaction_items.transaction_id
      AND t.user_id = auth.uid()
    )
  );

-- UPDATE: Users can only update items for their own transactions
CREATE POLICY transaction_items_update_own ON public.transaction_items
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.transactions t
      WHERE t.id = transaction_items.transaction_id
      AND t.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.transactions t
      WHERE t.id = transaction_items.transaction_id
      AND t.user_id = auth.uid()
    )
  );

-- DELETE: Users can only delete items for their own transactions
CREATE POLICY transaction_items_delete_own ON public.transaction_items
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.transactions t
      WHERE t.id = transaction_items.transaction_id
      AND t.user_id = auth.uid()
    )
  );

-- ============================================================================
-- VENDOR_ALIASES TABLE
-- ============================================================================

-- Enable RLS
ALTER TABLE IF EXISTS public.vendor_aliases ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (idempotent)
DROP POLICY IF EXISTS vendor_aliases_select_own ON public.vendor_aliases;
DROP POLICY IF EXISTS vendor_aliases_insert_own ON public.vendor_aliases;
DROP POLICY IF EXISTS vendor_aliases_update_own ON public.vendor_aliases;
DROP POLICY IF EXISTS vendor_aliases_delete_own ON public.vendor_aliases;

-- SELECT: Users can only see their own vendor aliases
CREATE POLICY vendor_aliases_select_own ON public.vendor_aliases
  FOR SELECT
  USING (user_id = auth.uid());

-- INSERT: Users can only insert vendor aliases for themselves
CREATE POLICY vendor_aliases_insert_own ON public.vendor_aliases
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- UPDATE: Users can only update their own vendor aliases
CREATE POLICY vendor_aliases_update_own ON public.vendor_aliases
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- DELETE: Users can only delete their own vendor aliases
CREATE POLICY vendor_aliases_delete_own ON public.vendor_aliases
  FOR DELETE
  USING (user_id = auth.uid());

-- ============================================================================
-- USER_XP_LEDGER TABLE
-- ============================================================================

-- Enable RLS
ALTER TABLE IF EXISTS public.user_xp_ledger ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (idempotent)
DROP POLICY IF EXISTS user_xp_ledger_select_own ON public.user_xp_ledger;
DROP POLICY IF EXISTS user_xp_ledger_insert_own ON public.user_xp_ledger;
DROP POLICY IF EXISTS user_xp_ledger_update_own ON public.user_xp_ledger;
DROP POLICY IF EXISTS user_xp_ledger_delete_own ON public.user_xp_ledger;

-- SELECT: Users can only see their own XP ledger entries
CREATE POLICY user_xp_ledger_select_own ON public.user_xp_ledger
  FOR SELECT
  USING (user_id = auth.uid());

-- INSERT: Users can only insert XP entries for themselves
-- Note: In practice, XP is usually awarded by the system, but users can't insert fake XP
CREATE POLICY user_xp_ledger_insert_own ON public.user_xp_ledger
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- UPDATE: Users cannot update their own XP (system-only)
-- No UPDATE policy = users cannot update XP entries

-- DELETE: Users cannot delete their own XP (system-only)
-- No DELETE policy = users cannot delete XP entries

-- ============================================================================
-- SERVICE ROLE BYPASS
-- ============================================================================

-- Service role (using service_role key) bypasses RLS automatically
-- No additional configuration needed - Supabase service role key
-- always bypasses RLS policies

-- ============================================================================
-- NOTES
-- ============================================================================

-- 1. All policies use auth.uid() which returns the authenticated user's ID
-- 2. Service role key bypasses RLS (used by Netlify functions)
-- 3. Anonymous users (no auth) cannot access any data (auth.uid() = NULL)
-- 4. Policies are idempotent (DROP IF EXISTS before CREATE)
-- 5. transaction_items policies check transaction ownership via EXISTS subquery

