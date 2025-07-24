/*
  # Create profiles table and related functions

  1. New Tables
    - `profiles`
      - `id` (uuid, primary key, references auth.users)
      - `display_name` (text, nullable)
      - `avatar_url` (text, nullable)
      - `updated_at` (timestamptz, default now())
      - `role` (text, default 'free')
      - `xp` (integer, default 0)
      - `level` (integer, default 1)
      - `streak` (integer, default 0)
      - `last_activity_date` (date, nullable)
      - `transaction_count` (integer, default 0)
      - `total_uploaded` (numeric, default 0)
      - `account_created_at` (timestamptz, default now())
      - `last_login_at` (timestamptz, nullable)
      - `stripe_customer_id` (text, nullable)
      - `subscription_id` (text, nullable)
      - `subscription_status` (text, nullable)
      - `current_period_end` (timestamptz, nullable)
      - `email_notifications` (boolean, default true)

  2. New Tables
    - `xp_activities`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `activity_type` (text)
      - `xp_earned` (integer)
      - `description` (text, nullable)
      - `created_at` (timestamptz, default now())

    - `badges`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `badge_key` (text)
      - `name` (text)
      - `description` (text, nullable)
      - `earned_at` (timestamptz, default now())
      - `xp_reward` (integer, default 0)
      - `created_at` (timestamptz, default now())

  3. Security
    - Enable RLS on all tables
    - Add policies for user data access
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  avatar_url text,
  updated_at timestamptz DEFAULT now(),
  role text DEFAULT 'free' CHECK (role IN ('free', 'premium', 'admin')),
  xp integer DEFAULT 0,
  level integer DEFAULT 1,
  streak integer DEFAULT 0,
  last_activity_date date,
  transaction_count integer DEFAULT 0,
  total_uploaded numeric DEFAULT 0,
  account_created_at timestamptz DEFAULT now(),
  last_login_at timestamptz,
  stripe_customer_id text,
  subscription_id text,
  subscription_status text,
  current_period_end timestamptz,
  email_notifications boolean DEFAULT true
);

-- Create xp_activities table
CREATE TABLE IF NOT EXISTS xp_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type text NOT NULL,
  xp_earned integer NOT NULL,
  description text,
  created_at timestamptz DEFAULT now()
);

-- Create badges table
CREATE TABLE IF NOT EXISTS badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_key text NOT NULL,
  name text NOT NULL,
  description text,
  earned_at timestamptz DEFAULT now(),
  xp_reward integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, badge_key)
);

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE xp_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles
CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Create policies for xp_activities
CREATE POLICY "Users can view their own XP activities"
  ON xp_activities FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own XP activities"
  ON xp_activities FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Create policies for badges
CREATE POLICY "Users can view their own badges"
  ON badges FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own badges"
  ON badges FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Create function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (
    id, 
    display_name, 
    account_created_at, 
    last_login_at,
    xp,
    level,
    streak
  )
  VALUES (
    new.id, 
    COALESCE(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    now(),
    now(),
    0,
    1,
    0
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to call the function when a new user is created
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_streak ON profiles(streak);
CREATE INDEX IF NOT EXISTS idx_xp_activities_user_id ON xp_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_xp_activities_created_at ON xp_activities(created_at);
CREATE INDEX IF NOT EXISTS idx_badges_user_id ON badges(user_id);
CREATE INDEX IF NOT EXISTS idx_badges_badge_key ON badges(badge_key);