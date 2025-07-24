/*
  # Fix Receipts RLS Policies

  1. Changes
    - Enable RLS on receipts table if not already enabled
    - Create policies for users to view and manage their own receipts
    - Add checks to prevent errors if policies already exist
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