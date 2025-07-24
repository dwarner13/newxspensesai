/*
  # Fix RLS policies for receipts table

  1. Changes
    - Drop existing policy if it exists
    - Create new policy for users to view their own receipts
    - Create new policy for users to manage their own receipts

  2. Security
    - Ensure proper RLS is enabled
    - Avoid policy name conflicts
*/

-- Enable RLS on receipts table if not already enabled
ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own receipts" ON receipts;
DROP POLICY IF EXISTS "Users can manage their own receipts" ON receipts;

-- Create policy for users to view their own receipts
CREATE POLICY "Users can view their own receipts"
  ON receipts
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Create policy for users to manage their own receipts
CREATE POLICY "Users can manage their own receipts"
  ON receipts
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);