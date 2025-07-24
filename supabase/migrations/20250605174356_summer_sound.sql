/*
  # Set up storage bucket and policies for file uploads

  1. Changes
    - Create storage bucket for bank statements
    - Add RLS policies for secure file access
    - Ensure users can only access their own files

  2. Security
    - Enable RLS on storage.objects
    - Scope file access by user ID in path
*/

-- Create storage bucket if it doesn't exist
DO $$
BEGIN
  INSERT INTO storage.buckets (id, name, public)
  VALUES ('bank-statements', 'bank-statements', false)
  ON CONFLICT (id) DO NOTHING;
END $$;

-- Create storage policies
DO $$
BEGIN
  -- Users can read their own files
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND policyname = 'Users can read their own files'
  ) THEN
    CREATE POLICY "Users can read their own files"
    ON storage.objects FOR SELECT
    USING (
      bucket_id = 'bank-statements' 
      AND auth.uid()::text = (storage.foldername(name))[1]
    );
  END IF;

  -- Users can upload their own files
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND policyname = 'Users can upload their own files'
  ) THEN
    CREATE POLICY "Users can upload their own files"
    ON storage.objects FOR INSERT
    WITH CHECK (
      bucket_id = 'bank-statements' 
      AND auth.uid()::text = (storage.foldername(name))[1]
    );
  END IF;

  -- Users can update their own files
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND policyname = 'Users can update their own files'
  ) THEN
    CREATE POLICY "Users can update their own files"
    ON storage.objects FOR UPDATE
    USING (
      bucket_id = 'bank-statements' 
      AND auth.uid()::text = (storage.foldername(name))[1]
    );
  END IF;

  -- Users can delete their own files
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND policyname = 'Users can delete their own files'
  ) THEN
    CREATE POLICY "Users can delete their own files"
    ON storage.objects FOR DELETE
    USING (
      bucket_id = 'bank-statements' 
      AND auth.uid()::text = (storage.foldername(name))[1]
    );
  END IF;
END $$;