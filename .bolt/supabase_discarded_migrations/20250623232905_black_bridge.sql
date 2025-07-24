/*
  # Fix RPC Functions and Policies

  1. New Functions
    - `update_user_streak`: Updates user streak based on last activity date
    - `add_user_xp`: Adds XP to user profile and returns new total

  2. Security
    - Enable RLS on profiles table
    - Add policy for users to view their own profile
    - Fix transaction policies
*/

-- Create update_user_streak function
CREATE OR REPLACE FUNCTION update_user_streak(user_uuid UUID)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  current_streak INTEGER := 1;
  last_date DATE;
BEGIN
  SELECT last_activity_date INTO last_date FROM profiles WHERE id = user_uuid;

  IF last_date = CURRENT_DATE - 1 THEN
    UPDATE profiles SET
      streak = streak + 1,
      last_activity_date = CURRENT_DATE
    WHERE id = user_uuid
    RETURNING streak INTO current_streak;
  ELSE
    UPDATE profiles SET
      streak = 1,
      last_activity_date = CURRENT_DATE
    WHERE id = user_uuid
    RETURNING streak INTO current_streak;
  END IF;

  RETURN current_streak;
END;
$$;

-- Create add_user_xp function
CREATE OR REPLACE FUNCTION add_user_xp(user_uuid UUID, xp_amount INTEGER, activity_type TEXT DEFAULT 'general', activity_description TEXT DEFAULT NULL)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  new_xp INTEGER;
  current_level INTEGER;
  new_level INTEGER;
BEGIN
  -- Get current XP and level
  SELECT xp, level INTO new_xp, current_level FROM profiles WHERE id = user_uuid;
  
  -- Add XP
  UPDATE profiles
  SET xp = xp + xp_amount
  WHERE id = user_uuid
  RETURNING xp INTO new_xp;
  
  -- Calculate new level (simple formula: level = floor(xp/100) + 1)
  new_level := FLOOR(new_xp / 100) + 1;
  
  -- Update level if changed
  IF new_level > current_level THEN
    UPDATE profiles SET level = new_level WHERE id = user_uuid;
  END IF;
  
  -- Log XP activity
  INSERT INTO xp_activities (
    user_id,
    activity_type,
    xp_earned,
    description
  ) VALUES (
    user_uuid,
    activity_type,
    xp_amount,
    COALESCE(activity_description, 'Earned ' || xp_amount || ' XP from ' || activity_type)
  );
  
  RETURN new_xp;
END;
$$;

-- Enable RLS on profiles table if not already enabled
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'profiles' 
    AND rowsecurity = true
  ) THEN
    ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Create policy for users to view their own profile
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'profiles' 
    AND policyname = 'Users can view their own profile'
  ) THEN
    CREATE POLICY "Users can view their own profile"
    ON profiles
    FOR SELECT
    USING (auth.uid() = id);
  END IF;
END $$;

-- Create policy for users to manage their own profile
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'profiles' 
    AND policyname = 'Users can manage their own profile'
  ) THEN
    CREATE POLICY "Users can manage their own profile"
    ON profiles
    FOR ALL
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);
  END IF;
END $$;

-- Enable RLS on transactions table if not already enabled
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'transactions' 
    AND rowsecurity = true
  ) THEN
    ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Create policies for transactions table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'transactions' 
    AND policyname = 'Users can view their own transactions'
  ) THEN
    CREATE POLICY "Users can view their own transactions"
    ON transactions
    FOR SELECT
    USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'transactions' 
    AND policyname = 'Users can insert their own transactions'
  ) THEN
    CREATE POLICY "Users can insert their own transactions"
    ON transactions
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'transactions' 
    AND policyname = 'Users can update their own transactions'
  ) THEN
    CREATE POLICY "Users can update their own transactions"
    ON transactions
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'transactions' 
    AND policyname = 'Users can delete their own transactions'
  ) THEN
    CREATE POLICY "Users can delete their own transactions"
    ON transactions
    FOR DELETE
    USING (auth.uid() = user_id);
  END IF;
END $$;