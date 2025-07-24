/*
  # Create XP Activities Table

  1. New Tables
    - `xp_activities`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `activity_type` (text)
      - `xp_earned` (integer)
      - `description` (text)
      - `created_at` (timestamp with time zone)
  2. Security
    - Enable RLS on `xp_activities` table
    - Add policy for authenticated users to view their own XP activities
*/

-- Enable UUID generation if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create xp_activities table
CREATE TABLE IF NOT EXISTS public.xp_activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  xp_earned INTEGER NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_xp_activities_user_id ON public.xp_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_xp_activities_created_at ON public.xp_activities(created_at);

-- Enable Row Level Security
ALTER TABLE public.xp_activities ENABLE ROW LEVEL SECURITY;

-- Create policy for users to view their own XP activities
CREATE POLICY "Users can view their own XP activities"
  ON public.xp_activities
  FOR SELECT
  TO authenticated
  USING (uid() = user_id);