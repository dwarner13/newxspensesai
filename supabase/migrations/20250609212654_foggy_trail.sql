/*
  # Add exports table for tracking user data exports

  1. New Tables
    - `exports`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `export_type` (text, not null)
      - `file_url` (text, nullable)
      - `export_date` (timestamptz, default now())

  2. Security
    - Enable RLS on exports table
    - Add policies for authenticated users to manage their own exports

  3. Indexes
    - Add index on user_id for better query performance
*/

-- Create exports table
CREATE TABLE IF NOT EXISTS exports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  export_type text NOT NULL,
  file_url text,
  export_date timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE exports ENABLE ROW LEVEL SECURITY;

-- Create policies for exports
CREATE POLICY "Users can view their own exports"
  ON exports FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own exports"
  ON exports FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own exports"
  ON exports FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own exports"
  ON exports FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_exports_user_id ON exports(user_id);
CREATE INDEX IF NOT EXISTS idx_exports_export_date ON exports(export_date);