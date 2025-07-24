/*
  # Add RLS policies to xp_activities table

  1. Security
    - Enable RLS on `xp_activities` table
    - Add policy for authenticated users to view their own XP activities
    - Add policy for authenticated users to insert their own XP activities
*/

-- Enable RLS on xp_activities table
ALTER TABLE public.xp_activities ENABLE ROW LEVEL SECURITY;

-- Create policy so users can only view their own XP
CREATE POLICY "Users can view their own XP activities"
ON public.xp_activities
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Allow users to insert their own XP activities
CREATE POLICY "Users can insert their own XP activities"
ON public.xp_activities
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);