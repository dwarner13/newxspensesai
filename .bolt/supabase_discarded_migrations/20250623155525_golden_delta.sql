/*
  # Create categorization tables

  1. New Tables
    - `categorization_rules` - Stores rules for automatic transaction categorization
    - `memory` - Stores vendor-category associations for quick lookup
  
  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own data
*/

-- Create categorization rules table
CREATE TABLE IF NOT EXISTS categorization_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  keyword TEXT NOT NULL,
  category TEXT NOT NULL,
  subcategory TEXT,
  match_count INTEGER DEFAULT 1,
  last_matched TIMESTAMPTZ DEFAULT now()
);

-- Create unique constraint
CREATE UNIQUE INDEX IF NOT EXISTS categorization_rules_user_id_keyword_key ON categorization_rules(user_id, keyword);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_categorization_rules_user_id ON categorization_rules(user_id);
CREATE INDEX IF NOT EXISTS idx_categorization_rules_keyword ON categorization_rules(keyword);

-- Enable RLS
ALTER TABLE categorization_rules ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own rules"
  ON categorization_rules
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own rules"
  ON categorization_rules
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own rules"
  ON categorization_rules
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own rules"
  ON categorization_rules
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create memory table for quick categorization
CREATE TABLE IF NOT EXISTS memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  keyword TEXT NOT NULL,
  category TEXT NOT NULL,
  subcategory TEXT
);

-- Create unique constraint
CREATE UNIQUE INDEX IF NOT EXISTS memory_user_id_keyword_key ON memory(user_id, keyword);

-- Create index
CREATE INDEX IF NOT EXISTS idx_memory_user_keyword ON memory(user_id, keyword);

-- Enable RLS
ALTER TABLE memory ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own memory"
  ON memory
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own memory"
  ON memory
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own memory"
  ON memory
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own memory"
  ON memory
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);