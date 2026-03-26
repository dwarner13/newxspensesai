-- Add file_hash column to user_documents for duplicate upload detection
-- SHA-256 hex string (64 chars)
ALTER TABLE user_documents
  ADD COLUMN IF NOT EXISTS file_hash text;

-- Index for fast duplicate lookups per user
CREATE INDEX IF NOT EXISTS idx_user_documents_file_hash
  ON user_documents (user_id, file_hash)
  WHERE file_hash IS NOT NULL;
