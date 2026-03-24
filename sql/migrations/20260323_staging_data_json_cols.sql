-- Documentation migration: columns that exist in production but weren't in original migrations.
-- These were added directly in Supabase dashboard during development.
-- Run this only if columns are missing (all use IF NOT EXISTS for safety).

-- transactions_staging: data_json holds all transaction data as JSONB
ALTER TABLE public.transactions_staging
  ADD COLUMN IF NOT EXISTS data_json jsonb,
  ADD COLUMN IF NOT EXISTS user_id uuid,
  ADD COLUMN IF NOT EXISTS parsed_at timestamptz DEFAULT now();

-- imports: extra columns used by various import paths
ALTER TABLE public.imports
  ADD COLUMN IF NOT EXISTS filename text,
  ADD COLUMN IF NOT EXISTS source text,
  ADD COLUMN IF NOT EXISTS via text;
