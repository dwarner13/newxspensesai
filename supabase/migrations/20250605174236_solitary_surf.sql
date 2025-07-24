/*
  # Add file_path column to files table

  1. Changes
    - Add file_path column to files table
    - Make file_path NOT NULL to ensure all files have a path
    - Add index on file_path for better query performance

  2. Security
    - No changes to RLS policies needed
*/

ALTER TABLE files
ADD COLUMN file_path text NOT NULL;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_files_file_path ON files(file_path);