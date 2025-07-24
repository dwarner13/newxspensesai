/*
  # Create files and exports tables

  1. New Tables
    - `files` - Stores uploaded file metadata
    - `exports` - Tracks export history
  
  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own data
*/

-- Create files table
CREATE TABLE IF NOT EXISTS files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  file_name TEXT NOT NULL,
  upload_date TIMESTAMPTZ DEFAULT now(),
  original_type TEXT NOT NULL CHECK (original_type IN ('CSV', 'PDF')),
  file_path TEXT NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_files_user_id ON files(user_id);
CREATE INDEX IF NOT EXISTS idx_files_upload_date ON files(upload_date);
CREATE INDEX IF NOT EXISTS idx_files_file_path ON files(file_path);

-- Enable RLS
ALTER TABLE files ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can read their own files"
  ON files
  FOR SELECT
  TO public
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own files"
  ON files
  FOR INSERT
  TO public
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own files"
  ON files
  FOR UPDATE
  TO public
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own files"
  ON files
  FOR DELETE
  TO public
  USING (auth.uid() = user_id);

-- Create exports table
CREATE TABLE IF NOT EXISTS exports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  export_type TEXT NOT NULL,
  file_url TEXT,
  export_date TIMESTAMP WITHOUT TIME ZONE DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_exports_user_id ON exports(user_id);
CREATE INDEX IF NOT EXISTS idx_exports_export_date ON exports(export_date);

-- Enable RLS
ALTER TABLE exports ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users manage their own exports"
  ON exports
  FOR ALL
  TO public
  USING (user_id = auth.uid());

-- Create additional policies for specific operations
CREATE POLICY "Users can view their own exports"
  ON exports
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own exports"
  ON exports
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own exports"
  ON exports
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own exports"
  ON exports
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);