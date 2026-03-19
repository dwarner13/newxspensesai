-- Add unique constraint on import_id so upsert({ onConflict: 'import_id' }) works.
-- Deduplicate existing rows first: keep only the newest row per import_id.
DELETE FROM import_summaries
WHERE id NOT IN (
  SELECT DISTINCT ON (import_id) id
  FROM import_summaries
  ORDER BY import_id, created_at DESC
);

ALTER TABLE import_summaries
  ADD CONSTRAINT import_summaries_import_id_key UNIQUE (import_id);
