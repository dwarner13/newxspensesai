/*
  # Fix receipts policy conflict

  1. Changes
    - Drop existing policy "Users can view their own receipts" on receipts table
    - Recreate the policy with correct logic for select operations
  
  2. Security
    - Ensures proper row-level security for receipts table
    - Maintains user data isolation
*/

-- Drop the existing policy if it exists
DROP POLICY IF EXISTS "Users can view their own receipts" ON receipts;

-- Recreate the policy with correct logic
CREATE POLICY "Users can view their own receipts" ON receipts
  FOR SELECT
  USING (auth.uid() = user_id);