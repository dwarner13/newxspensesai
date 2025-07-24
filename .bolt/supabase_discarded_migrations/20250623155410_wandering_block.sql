/*
  # Create profiles table and related functions

  1. New Tables
    - `profiles` - Stores user profile information including XP, level, and streak data
  
  2. Security
    - Enable RLS on `profiles` table
    - Add policy for authenticated users to manage their own profile
  
  3. Functions
    - `update_last_login` - Updates the last login timestamp
    - `handle_new_user` - Creates a profile for new users
    - `update_user_streak` - Updates user streak based on activity
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  updated_at TIMESTAMPTZ DEFAULT now(),
  role TEXT DEFAULT 'free' CHECK (role IN ('free', 'premium', 'admin')),
  last_login_at TIMESTAMPTZ,
  transaction_count INTEGER DEFAULT 0,
  total_uploaded NUMERIC DEFAULT 0,
  account_created_at TIMESTAMPTZ DEFAULT now(),
  xp INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  streak INTEGER DEFAULT 0,
  last_activity_date DATE,
  email_notifications BOOLEAN DEFAULT true,
  stripe_customer_id TEXT,
  subscription_id TEXT,
  subscription_status TEXT,
  current_period_end TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create policy for users to manage their own profile
CREATE POLICY "Users can manage their own profile"
  ON profiles
  FOR ALL
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Function to update last login
CREATE OR REPLACE FUNCTION update_last_login()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE profiles
  SET last_login_at = now()
  WHERE id = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update last login on session creation
CREATE OR REPLACE TRIGGER on_auth_login
AFTER INSERT ON auth.sessions
FOR EACH ROW
EXECUTE FUNCTION update_last_login();

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, display_name, avatar_url, role, xp, level, streak, last_activity_date)
  VALUES (
    NEW.id,
    SPLIT_PART(NEW.email, '@', 1),
    NULL,
    'free',
    0,
    1,
    0,
    CURRENT_DATE
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user creation
CREATE OR REPLACE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION handle_new_user();

-- Function to update user streak
CREATE OR REPLACE FUNCTION update_user_streak(user_uuid UUID)
RETURNS VOID AS $$
DECLARE
  last_date DATE;
  today DATE := CURRENT_DATE;
  new_streak INTEGER;
BEGIN
  -- Get the user's last activity date
  SELECT last_activity_date INTO last_date
  FROM profiles
  WHERE id = user_uuid;
  
  -- If no last activity date, set streak to 1
  IF last_date IS NULL THEN
    new_streak := 1;
  -- If last activity was yesterday, increment streak
  ELSIF last_date = (today - INTERVAL '1 day')::DATE THEN
    SELECT streak + 1 INTO new_streak
    FROM profiles
    WHERE id = user_uuid;
  -- If last activity was today, keep streak the same
  ELSIF last_date = today THEN
    SELECT streak INTO new_streak
    FROM profiles
    WHERE id = user_uuid;
  -- Otherwise, reset streak to 1
  ELSE
    new_streak := 1;
  END IF;
  
  -- Update the profile
  UPDATE profiles
  SET 
    streak = new_streak,
    last_activity_date = today
  WHERE id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;