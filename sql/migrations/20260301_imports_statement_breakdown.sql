-- Migration: Add statement_breakdown_json column to imports
-- and create import_summaries fallback table.
--
-- Root cause: persistStatementBreakdown() in commit-import.ts was silently
-- failing because this column never existed, causing PostgREST to return
-- {data: [], error: null} — no error, no written data.
--
-- Run in Supabase SQL editor or via Supabase CLI.

-- 1. Add statement_breakdown_json to imports (primary storage target)
ALTER TABLE public.imports
  ADD COLUMN IF NOT EXISTS statement_breakdown_json JSONB;

-- 2. Create import_summaries as the fallback table
--    (used when imports.statement_breakdown_json write matches 0 rows)
CREATE TABLE IF NOT EXISTS public.import_summaries (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  import_id     uuid        NOT NULL REFERENCES public.imports(id) ON DELETE CASCADE,
  user_id       uuid        NOT NULL,
  statement_breakdown_json JSONB,
  employee      text,
  version       integer     NOT NULL DEFAULT 1,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (import_id, user_id, version)
);

-- 3. RLS on import_summaries (mirrors imports policy)
ALTER TABLE public.import_summaries ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'import_summaries'
      AND policyname = 'import_summaries_owner'
  ) THEN
    CREATE POLICY "import_summaries_owner"
      ON public.import_summaries
      FOR ALL
      USING  (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- 4. Index for lookup by import_id
CREATE INDEX IF NOT EXISTS import_summaries_import_id_idx
  ON public.import_summaries (import_id);
