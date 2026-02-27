-- Add persistent backend approval marker for imports.
-- Used by approve-import + commit-import approval gate.

ALTER TABLE public.imports
ADD COLUMN IF NOT EXISTS approved_at timestamptz;
