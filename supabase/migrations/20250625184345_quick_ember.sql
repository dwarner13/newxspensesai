/*
  # Fix RLS policies for receipts table

  1. Changes
    - Enable RLS on receipts table if not already enabled
    - Check if policies exist before creating them
    - Create policies only if they don't exist

  2. Security
    - Ensure proper RLS is enabled
    - Avoid policy name conflicts
*/

-- Enable RLS on receipts table if not already enabled
ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;

-- Create policy for users to view their own receipts (if it doesn't exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'receipts' 
    AND policyname = 'Users can view their own receipts'
  ) THEN
    CREATE POLICY "Users can view their own receipts"
      ON receipts
      FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- Create policy for users to manage their own receipts (if it doesn't exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'receipts' 
    AND policyname = 'Users can manage their own receipts'
  ) THEN
    CREATE POLICY "Users can manage their own receipts"
      ON receipts
      FOR ALL
      TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;