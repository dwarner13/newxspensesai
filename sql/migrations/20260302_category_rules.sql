-- category_rules table
--
-- User-defined auto-categorization rules applied in the tag pipeline AFTER vendor
-- memory but BEFORE AI. Priority order when matching: exact → starts_with → contains → regex.
--
-- Created: 2026-03-02

CREATE TABLE IF NOT EXISTS public.category_rules (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  match_type    TEXT        NOT NULL
                              CHECK (match_type IN ('exact', 'contains', 'starts_with', 'regex')),
  match_value   TEXT        NOT NULL,          -- stored UPPERCASE for case-insensitive matching
  category      TEXT        NOT NULL,
  is_active     BOOLEAN     NOT NULL DEFAULT true,
  times_applied INTEGER     NOT NULL DEFAULT 0, -- incremented each time the rule fires in pipeline
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- One rule per (user, type, value) — upsert uses this constraint
  CONSTRAINT uq_category_rules_user_type_value UNIQUE (user_id, match_type, match_value)
);

-- ── RLS ───────────────────────────────────────────────────────────────────────

ALTER TABLE public.category_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage their own rules" ON public.category_rules;
CREATE POLICY "Users manage their own rules"
  ON public.category_rules FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── Indexes ───────────────────────────────────────────────────────────────────

-- Fast lookup for the categorization pipeline (active rules for a user)
CREATE INDEX IF NOT EXISTS idx_category_rules_user_active
  ON public.category_rules (user_id)
  WHERE is_active = true;

-- Workspace panel count
CREATE INDEX IF NOT EXISTS idx_category_rules_user_id
  ON public.category_rules (user_id);
