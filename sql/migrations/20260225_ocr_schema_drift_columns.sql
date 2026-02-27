-- Adds columns that the OCR pipeline assumes exist but may be missing from
-- older deployments.  All additions use IF NOT EXISTS and safe defaults so
-- this migration is idempotent and non-destructive.
--
-- Root causes addressed:
--   RC1  user_documents.ocr_text_length  – written by smart-import-ocr after
--          every successful run; missing column caused DB_WRITE_ERROR → 500.
--   RC3  ai_activity_events.announced_at – filtered on by primeByteAnnouncement
--          to enforce exactly-once delivery; missing column silently killed all
--          Prime import announcements.

-- ── user_documents ────────────────────────────────────────────────────────────

ALTER TABLE public.user_documents
  ADD COLUMN IF NOT EXISTS ocr_text_length integer;

-- Optional companion columns that the OCR layer also writes.
-- Add them here rather than in separate migrations to keep schema drift atomic.

ALTER TABLE public.user_documents
  ADD COLUMN IF NOT EXISTS ocr_text_hash  text;

ALTER TABLE public.user_documents
  ADD COLUMN IF NOT EXISTS ocr_text        text;          -- raw OCR output (set to NULL after redaction)

ALTER TABLE public.user_documents
  ADD COLUMN IF NOT EXISTS ocr_status      text;          -- processing | ready | ready_cached | failed

ALTER TABLE public.user_documents
  ADD COLUMN IF NOT EXISTS ocr_provider    text;          -- tesseract | google | openai

ALTER TABLE public.user_documents
  ADD COLUMN IF NOT EXISTS ocr_completed_at timestamptz;

ALTER TABLE public.user_documents
  ADD COLUMN IF NOT EXISTS ocr_engine      text;          -- alias written by some code paths

ALTER TABLE public.user_documents
  ADD COLUMN IF NOT EXISTS pages_detected  integer;

ALTER TABLE public.user_documents
  ADD COLUMN IF NOT EXISTS extraction_quality jsonb;

ALTER TABLE public.user_documents
  ADD COLUMN IF NOT EXISTS pii_types       text[];

ALTER TABLE public.user_documents
  ADD COLUMN IF NOT EXISTS extracted_data  jsonb;

ALTER TABLE public.user_documents
  ADD COLUMN IF NOT EXISTS normalized_json jsonb;

-- ── ai_activity_events ────────────────────────────────────────────────────────

ALTER TABLE public.ai_activity_events
  ADD COLUMN IF NOT EXISTS announced_at timestamptz;

-- Partial index: speeds up the IS NULL filter used in primeByteAnnouncement.
CREATE INDEX IF NOT EXISTS ai_activity_events_unannounced_idx
  ON public.ai_activity_events (user_id, event_type, created_at DESC)
  WHERE announced_at IS NULL;
