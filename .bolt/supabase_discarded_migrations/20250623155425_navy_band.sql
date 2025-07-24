/*
  # Create transactions table and related functions

  1. New Tables
    - `transactions` - Stores financial transaction data
  
  2. Security
    - Enable RLS on `transactions` table
    - Add policies for authenticated users to manage their own transactions
  
  3. Functions
    - `update_profile_stats` - Updates profile statistics when transactions change
    - `handle_transaction_xp` - Awards XP for new transactions
*/

-- Create transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('Credit', 'Debit')),
  category TEXT NOT NULL DEFAULT 'Uncategorized',
  subcategory TEXT,
  file_name TEXT NOT NULL,
  hash_id TEXT NOT NULL UNIQUE,
  categorization_source TEXT CHECK (categorization_source IN ('manual', 'memory', 'ai', 'default')),
  receipt_url TEXT
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category);
CREATE INDEX IF NOT EXISTS idx_transactions_hash_id ON transactions(hash_id);
CREATE INDEX IF NOT EXISTS idx_transactions_receipt_url ON transactions(receipt_url) WHERE receipt_url IS NOT NULL;

-- Enable RLS
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own transactions"
  ON transactions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own transactions"
  ON transactions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own transactions"
  ON transactions
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own transactions"
  ON transactions
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Function to update profile stats
CREATE OR REPLACE FUNCTION update_profile_stats()
RETURNS TRIGGER AS $$
DECLARE
  transaction_count INTEGER;
  total_amount NUMERIC;
BEGIN
  -- Calculate new stats
  SELECT 
    COUNT(*),
    SUM(CASE WHEN type = 'Debit' THEN amount ELSE 0 END)
  INTO 
    transaction_count,
    total_amount
  FROM transactions
  WHERE user_id = COALESCE(NEW.user_id, OLD.user_id);
  
  -- Update profile
  UPDATE profiles
  SET 
    transaction_count = transaction_count,
    total_uploaded = COALESCE(total_amount, 0),
    updated_at = now()
  WHERE id = COALESCE(NEW.user_id, OLD.user_id);
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers
CREATE TRIGGER update_profile_stats_on_insert
AFTER INSERT ON transactions
FOR EACH ROW
EXECUTE FUNCTION update_profile_stats();

CREATE TRIGGER update_profile_stats_on_update
AFTER UPDATE ON transactions
FOR EACH ROW
EXECUTE FUNCTION update_profile_stats();

CREATE TRIGGER update_profile_stats_on_delete
AFTER DELETE ON transactions
FOR EACH ROW
EXECUTE FUNCTION update_profile_stats();

-- Function to award XP for transactions
CREATE OR REPLACE FUNCTION handle_transaction_xp()
RETURNS TRIGGER AS $$
BEGIN
  -- Award 5 XP for each new transaction
  UPDATE profiles
  SET xp = xp + 5
  WHERE id = NEW.user_id;
  
  -- Log XP activity
  INSERT INTO xp_activities (user_id, activity_type, xp_earned, description)
  VALUES (
    NEW.user_id,
    'transaction_upload',
    5,
    'Added transaction: ' || NEW.description
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for XP
CREATE TRIGGER transaction_xp_trigger
AFTER INSERT ON transactions
FOR EACH ROW
EXECUTE FUNCTION handle_transaction_xp();