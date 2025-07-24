/*
  # Update database schema to use UUID for user IDs

  1. Changes
    - Drop existing tables to recreate with correct UUID types
    - Create files table with UUID user_id
    - Create memory table with UUID user_id
    - Add appropriate indexes and constraints
    - Enable RLS and create policies

  2. Security
    - Enable RLS on all tables
    - Add policies for user data access
*/

-- Drop existing tables if they exist
DROP TABLE IF EXISTS files CASCADE;
DROP TABLE IF EXISTS memory CASCADE;

-- Create files table with correct UUID type
CREATE TABLE IF NOT EXISTS files (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id),
    file_name text NOT NULL,
    upload_date timestamptz DEFAULT now(),
    original_type text NOT NULL CHECK (original_type IN ('CSV', 'PDF'))
);

-- Create memory table with correct UUID type
CREATE TABLE IF NOT EXISTS memory (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id),
    keyword text NOT NULL,
    category text NOT NULL,
    subcategory text,
    CONSTRAINT memory_unique_user_keyword UNIQUE (user_id, keyword)
);

-- Enable RLS on new tables
ALTER TABLE files ENABLE ROW LEVEL SECURITY;
ALTER TABLE memory ENABLE ROW LEVEL SECURITY;

-- Create policies for files table
CREATE POLICY "Users can read their own files"
    ON files
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own files"
    ON files
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own files"
    ON files
    FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own files"
    ON files
    FOR DELETE
    USING (auth.uid() = user_id);

-- Create policies for memory table
CREATE POLICY "Users can read their own memory rules"
    ON memory
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own memory rules"
    ON memory
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own memory rules"
    ON memory
    FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own memory rules"
    ON memory
    FOR DELETE
    USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_files_user_id ON files(user_id);
CREATE INDEX IF NOT EXISTS idx_files_upload_date ON files(upload_date);
CREATE INDEX IF NOT EXISTS idx_memory_user_keyword ON memory(user_id, keyword);