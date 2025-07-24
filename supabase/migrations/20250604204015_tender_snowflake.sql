/*
  # Create proper transactions table schema

  1. New Tables
    - `transactions`
      - `id` (uuid, primary key)
      - `created_at` (timestamptz, default now())
      - `user_id` (uuid, references auth.users)
      - `date` (date, not null)
      - `description` (text, not null)
      - `amount` (numeric, not null)
      - `type` (text, not null, check Credit/Debit)
      - `category` (text, default 'Uncategorized')
      - `subcategory` (text, nullable)
      - `file_name` (text, not null)
      - `hash_id` (text, not null, unique)
      - `source` (text, check manual/memory/ai)

  2. Security
    - Enable RLS
    - Add policies for authenticated users
    - Create necessary indexes
*/

-- Drop existing table if it exists
DROP TABLE IF EXISTS public.transactions CASCADE;

-- Create transactions table
CREATE TABLE public.transactions (
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
  source text CHECK (source IN ('manual', 'memory', 'ai'))
);

-- Enable Row Level Security
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own transactions"
  ON public.transactions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own transactions"
  ON public.transactions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own transactions"
  ON public.transactions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own transactions"
  ON public.transactions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON public.transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON public.transactions(category);
CREATE INDEX IF NOT EXISTS idx_transactions_hash_id ON public.transactions(hash_id);