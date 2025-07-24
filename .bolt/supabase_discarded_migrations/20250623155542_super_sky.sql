/*
  # Create savings goals table

  1. New Tables
    - `savings_goals` - Tracks user savings goals by month
  
  2. Security
    - Enable RLS on `savings_goals` table
    - Add policy for authenticated users to manage their own goals
*/

-- Create savings goals table
CREATE TABLE IF NOT EXISTS savings_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  goal_name TEXT NOT NULL,
  category TEXT NOT NULL,
  target_amount NUMERIC NOT NULL,
  current_amount NUMERIC DEFAULT 0,
  month_year TEXT NOT NULL,
  completed BOOLEAN DEFAULT false,
  xp_reward INTEGER DEFAULT 25,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE savings_goals ENABLE ROW LEVEL SECURITY;

-- Create policy
CREATE POLICY "Users can manage their own savings goals"
  ON savings_goals
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id);