-- Drop existing tables if they exist
DROP TABLE IF EXISTS public.transactions CASCADE;
DROP TABLE IF EXISTS public.categorization_rules CASCADE;
DROP TABLE IF EXISTS public.files CASCADE;

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
  categorization_source text CHECK (categorization_source IN ('manual', 'memory', 'ai', 'default'))
);

-- Create categorization_rules table
CREATE TABLE public.categorization_rules (
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

-- Create files table
CREATE TABLE public.files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  upload_date timestamptz DEFAULT now(),
  original_type text NOT NULL CHECK (original_type IN ('CSV', 'PDF'))
);

-- Enable Row Level Security
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categorization_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;

-- Policies for transactions
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

-- Policies for categorization_rules
CREATE POLICY "Users can view their own categorization rules"
  ON public.categorization_rules FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own categorization rules"
  ON public.categorization_rules FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own categorization rules"
  ON public.categorization_rules FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own categorization rules"
  ON public.categorization_rules FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Policies for files
CREATE POLICY "Users can view their own files"
  ON public.files FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own files"
  ON public.files FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own files"
  ON public.files FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own files"
  ON public.files FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON public.transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON public.transactions(category);
CREATE INDEX IF NOT EXISTS idx_transactions_hash_id ON public.transactions(hash_id);
CREATE INDEX IF NOT EXISTS idx_categorization_rules_user_id ON public.categorization_rules(user_id);
CREATE INDEX IF NOT EXISTS idx_categorization_rules_keyword ON public.categorization_rules(keyword);
CREATE INDEX IF NOT EXISTS idx_files_user_id ON public.files(user_id);
CREATE INDEX IF NOT EXISTS idx_files_upload_date ON public.files(upload_date);