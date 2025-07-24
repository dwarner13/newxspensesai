/*
  # Add categorization rules table

  1. New Tables
    - `categorization_rules`
      - `id` (uuid, primary key)
      - `created_at` (timestamptz, default now())
      - `userID` (text, not null)
      - `keyword` (text, not null)
      - `category` (text, not null)
      - `subcategory` (text)
      - `matchCount` (integer, default 0)
      - `lastMatched` (timestamptz)

  2. Security
    - Enable RLS on `categorization_rules` table
    - Add policies for authenticated users to manage their rules
*/

CREATE TABLE IF NOT EXISTS categorization_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  userID text NOT NULL,
  keyword text NOT NULL,
  category text NOT NULL,
  subcategory text,
  matchCount integer DEFAULT 0,
  lastMatched timestamptz,
  UNIQUE(userID, keyword)
);

ALTER TABLE categorization_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own rules"
  ON categorization_rules
  FOR SELECT
  USING (auth.uid()::text = userID);

CREATE POLICY "Users can insert their own rules"
  ON categorization_rules
  FOR INSERT
  WITH CHECK (auth.uid()::text = userID);

CREATE POLICY "Users can update their own rules"
  ON categorization_rules
  FOR UPDATE
  USING (auth.uid()::text = userID);

CREATE POLICY "Users can delete their own rules"
  ON categorization_rules
  FOR DELETE
  USING (auth.uid()::text = userID);

-- Create index for improved query performance
CREATE INDEX IF NOT EXISTS categorization_rules_userID_keyword_idx ON categorization_rules (userID, keyword);