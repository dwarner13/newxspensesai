-- Add OCR metadata columns to import_summaries for process-statement.ts
ALTER TABLE import_summaries
  ADD COLUMN IF NOT EXISTS file_name        text,
  ADD COLUMN IF NOT EXISTS raw_ocr_text     text,
  ADD COLUMN IF NOT EXISTS confidence_score numeric(5,2),
  ADD COLUMN IF NOT EXISTS source           varchar(50),
  ADD COLUMN IF NOT EXISTS status           varchar(50) DEFAULT 'pending_review',
  ADD COLUMN IF NOT EXISTS period_start     date,
  ADD COLUMN IF NOT EXISTS period_end       date,
  ADD COLUMN IF NOT EXISTS opening_balance  numeric(12,2),
  ADD COLUMN IF NOT EXISTS closing_balance  numeric(12,2),
  ADD COLUMN IF NOT EXISTS transaction_count int,
  ADD COLUMN IF NOT EXISTS flagged_count    int DEFAULT 0;
