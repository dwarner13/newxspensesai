/*
  # Add RLS policy for receipts table

  1. Changes
    - Enable RLS on receipts table
    - Add policy for users to view their own receipts
    - Add policy for users to manage their own receipts

  2. Security
    - Ensure users can only access their own receipts
    - Proper row-level security implementation
*/

-- Enable RLS on receipts table if not already enabled
ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;

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