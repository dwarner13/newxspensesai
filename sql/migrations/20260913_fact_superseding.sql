-- =============================================================================
-- Phase V1.1: Safe Fact Superseding
--
-- Adds canonical fact_key/fact_value columns and stated_at timestamp to
-- user_memory_facts. Creates upsert_memory_fact RPC with stated_at guard
-- so that out-of-order backlog processing cannot overwrite newer known values.
-- =============================================================================

-- 1. Add new columns (idempotent)
ALTER TABLE user_memory_facts
  ADD COLUMN IF NOT EXISTS fact_key text,
  ADD COLUMN IF NOT EXISTS fact_value text,
  ADD COLUMN IF NOT EXISTS stated_at timestamptz;

-- 2. Backfill existing rows from legacy "type:key=value" format
UPDATE user_memory_facts
SET
  fact_key   = split_part(split_part(fact, ':', 2), '=', 1),
  fact_value = substring(fact from position('=' in fact) + 1),
  stated_at  = COALESCE(stated_at, created_at)
WHERE fact LIKE '%:%=%'
  AND fact_key IS NULL;

-- 3. Partial unique index: one active row per (user_id, fact_key)
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_fact_key
  ON user_memory_facts (user_id, fact_key)
  WHERE fact_key IS NOT NULL;

-- 4. Upsert RPC with stated_at guard
--    - New key -> INSERT
--    - Same key, newer stated_at -> UPDATE (supersede)
--    - Same key, older stated_at -> NO-OP (backlog safety)
CREATE OR REPLACE FUNCTION upsert_memory_fact(
  p_user_id     uuid,
  p_fact_key    text,
  p_fact_value  text,
  p_fact        text,
  p_fact_hash   text,
  p_stated_at   timestamptz,
  p_source      text DEFAULT 'extractor:v1',
  p_confidence  numeric DEFAULT 80
) RETURNS void AS $$
BEGIN
  INSERT INTO user_memory_facts
    (user_id, fact_key, fact_value, fact, fact_hash, stated_at, source, confidence, created_at)
  VALUES
    (p_user_id, p_fact_key, p_fact_value, p_fact, p_fact_hash, p_stated_at, p_source, p_confidence, now())
  ON CONFLICT (user_id, fact_key) WHERE fact_key IS NOT NULL
  DO UPDATE SET
    fact_value = EXCLUDED.fact_value,
    fact       = EXCLUDED.fact,
    fact_hash  = EXCLUDED.fact_hash,
    stated_at  = EXCLUDED.stated_at,
    created_at = now(),
    source     = EXCLUDED.source,
    confidence = EXCLUDED.confidence
  WHERE EXCLUDED.stated_at > user_memory_facts.stated_at
     OR user_memory_facts.stated_at IS NULL;
END;
$$ LANGUAGE plpgsql;
