-- Add status and source columns to transactions_staging for process-statement.ts
ALTER TABLE transactions_staging
  ADD COLUMN IF NOT EXISTS status varchar(50) DEFAULT 'pending_review',
  ADD COLUMN IF NOT EXISTS source varchar(50);
