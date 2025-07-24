/*
  # Fix Database Schema

  1. Tables
    - transactions
      - id (uuid, primary key)
      - created_at (timestamptz)
      - user_id (uuid, references auth.users)
      - date (date)
      - description (text)
      - amount (numeric)
      - type (text)
      - category (text)
      - subcategory (text)
      - file_name (text)
      - hash_id (text)
      - categorization_source (text)

    - categorization_rules
      - id (uuid, primary key)
      - created_at (timestamptz)
      - user_id (uuid, references auth.users)
      - keyword (text)
      - category (text)
      - subcategory (text)
      - match_count (integer)
      - last_matched (timestamptz)

    - memory
      - id (uuid, primary key)
      - user_id (uuid, references auth.users)
      - keyword (text)
      - category (text)
      - subcategory (text)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Drop existing tables
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS categorization_rules CASCADE;
DROP TABLE IF EXISTS memory CASCADE;

-- Create transactions table
CREATE TABLE transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  date date NOT NULL,
  description text NOT NULL,
  amount numeric NOT NULL,
  type text NOT NULL CHECK (type IN ('Credit', 'Debit')),
  category text NOT NULL DEFAULT 'Uncategorized',
  subcategory text,
  file_name text NOT NULL,
  hash_id text NOT NULL UNIQUE,
  categorization_source text CHECK (categorization_source IN ('manual', 'memory', 'ai', 'default'))
);

-- Create categorization_rules table
CREATE TABLE categorization_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  keyword text NOT NULL,
  category text NOT NULL,
  subcategory text,
  match_count integer DEFAULT 1,
  last_matched timestamptz DEFAULT now(),
  UNIQUE(user_id, keyword)
);

-- Create memory table
CREATE TABLE memory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  keyword text NOT NULL,
  category text NOT NULL,
  subcategory text,
  UNIQUE(user_id, keyword)
);

-- Enable Row Level Security
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE categorization_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE memory ENABLE ROW LEVEL SECURITY;

-- Policies for transactions
CREATE POLICY "Users can view their own transactions"
  ON transactions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own transactions"
  ON transactions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own transactions"
  ON transactions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own transactions"
  ON transactions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Policies for categorization_rules
CREATE POLICY "Users can view their own rules"
  ON categorization_rules FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own rules"
  ON categorization_rules FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own rules"
  ON categorization_rules FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own rules"
  ON categorization_rules FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Policies for memory
CREATE POLICY "Users can view their own memory"
  ON memory FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own memory"
  ON memory FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own memory"
  ON memory FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own memory"
  ON memory FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_date ON transactions(date);
CREATE INDEX idx_transactions_category ON transactions(category);
CREATE INDEX idx_transactions_hash_id ON transactions(hash_id);
CREATE INDEX idx_categorization_rules_user_id ON categorization_rules(user_id);
CREATE INDEX idx_categorization_rules_keyword ON categorization_rules(keyword);
CREATE INDEX idx_memory_user_keyword ON memory(user_id, keyword);