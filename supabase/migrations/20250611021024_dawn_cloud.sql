/*
  # Add XP and Gamification System

  1. Profile Updates
    - Add `xp` column for experience points
    - Add `level` column for user level
    - Add `streak` column for daily upload streak
    - Add `last_activity_date` for streak tracking

  2. XP Rules
    - Receipt scan: +10 XP
    - Transaction upload: +5 XP per transaction
    - Daily login: +2 XP
    - Weekly streak bonus: +25 XP

  3. Level System
    - Level = floor(sqrt(xp / 100)) + 1
    - Exponential growth for engaging progression
*/

-- Add XP and gamification columns to profiles
DO $$
BEGIN
  -- Add xp column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'xp'
  ) THEN
    ALTER TABLE profiles ADD COLUMN xp integer DEFAULT 0;
  END IF;

  -- Add level column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'level'
  ) THEN
    ALTER TABLE profiles ADD COLUMN level integer DEFAULT 1;
  END IF;

  -- Add streak column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'streak'
  ) THEN
    ALTER TABLE profiles ADD COLUMN streak integer DEFAULT 0;
  END IF;

  -- Add last_activity_date column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'last_activity_date'
  ) THEN
    ALTER TABLE profiles ADD COLUMN last_activity_date date;
  END IF;
END $$;

-- Function to calculate level from XP
CREATE OR REPLACE FUNCTION calculate_level(xp_amount integer)
RETURNS integer AS $$
BEGIN
  RETURN GREATEST(1, FLOOR(SQRT(xp_amount::float / 100)) + 1);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to add XP and update level
CREATE OR REPLACE FUNCTION add_xp(user_id uuid, xp_amount integer, activity_type text DEFAULT 'general')
RETURNS TABLE(new_xp integer, new_level integer, level_up boolean) AS $$
DECLARE
  current_xp integer;
  current_level integer;
  updated_xp integer;
  updated_level integer;
  is_level_up boolean := false;
  current_streak integer;
  last_activity date;
  today date := CURRENT_DATE;
BEGIN
  -- Get current XP, level, streak, and last activity
  SELECT xp, level, streak, last_activity_date 
  INTO current_xp, current_level, current_streak, last_activity
  FROM profiles 
  WHERE id = user_id;

  -- Calculate new XP and level
  updated_xp := COALESCE(current_xp, 0) + xp_amount;
  updated_level := calculate_level(updated_xp);
  is_level_up := updated_level > COALESCE(current_level, 1);

  -- Handle streak logic
  IF activity_type IN ('receipt_scan', 'transaction_upload', 'login') THEN
    IF last_activity IS NULL OR last_activity < today THEN
      -- First activity today
      IF last_activity = today - INTERVAL '1 day' THEN
        -- Consecutive day - increment streak
        current_streak := COALESCE(current_streak, 0) + 1;
        
        -- Weekly streak bonus
        IF current_streak % 7 = 0 THEN
          updated_xp := updated_xp + 25;
          updated_level := calculate_level(updated_xp);
        END IF;
      ELSE
        -- Streak broken or first time
        current_streak := 1;
      END IF;
      
      -- Update last activity date
      last_activity := today;
    END IF;
  END IF;

  -- Update profile
  UPDATE profiles 
  SET 
    xp = updated_xp,
    level = updated_level,
    streak = current_streak,
    last_activity_date = last_activity,
    updated_at = now()
  WHERE id = user_id;

  -- Return results
  RETURN QUERY SELECT updated_xp, updated_level, is_level_up;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to handle receipt XP rewards
CREATE OR REPLACE FUNCTION handle_receipt_xp()
RETURNS trigger AS $$
DECLARE
  xp_result record;
BEGIN
  -- Award 10 XP for successful receipt processing
  IF NEW.processing_status = 'completed' AND (OLD.processing_status IS NULL OR OLD.processing_status != 'completed') THEN
    SELECT * INTO xp_result FROM add_xp(NEW.user_id, 10, 'receipt_scan');
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to handle transaction XP rewards
CREATE OR REPLACE FUNCTION handle_transaction_xp()
RETURNS trigger AS $$
DECLARE
  xp_result record;
BEGIN
  -- Award 5 XP for each new transaction
  SELECT * INTO xp_result FROM add_xp(NEW.user_id, 5, 'transaction_upload');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers for XP rewards
DROP TRIGGER IF EXISTS receipt_xp_trigger ON receipts;
CREATE TRIGGER receipt_xp_trigger
  AFTER UPDATE ON receipts
  FOR EACH ROW EXECUTE FUNCTION handle_receipt_xp();

DROP TRIGGER IF EXISTS transaction_xp_trigger ON transactions;
CREATE TRIGGER transaction_xp_trigger
  AFTER INSERT ON transactions
  FOR EACH ROW EXECUTE FUNCTION handle_transaction_xp();

-- Create XP activity log table for tracking
CREATE TABLE IF NOT EXISTS xp_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type text NOT NULL,
  xp_earned integer NOT NULL,
  description text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on XP activities
ALTER TABLE xp_activities ENABLE ROW LEVEL SECURITY;

-- Create policy for XP activities
CREATE POLICY "Users can view their own XP activities"
  ON xp_activities
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX idx_xp_activities_user_id ON xp_activities(user_id);
CREATE INDEX idx_xp_activities_created_at ON xp_activities(created_at);

-- Function to log XP activities
CREATE OR REPLACE FUNCTION log_xp_activity(
  user_id uuid, 
  activity_type text, 
  xp_earned integer, 
  description text DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  INSERT INTO xp_activities (user_id, activity_type, xp_earned, description)
  VALUES (user_id, activity_type, xp_earned, description);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the add_xp function to log activities
CREATE OR REPLACE FUNCTION add_xp(user_id uuid, xp_amount integer, activity_type text DEFAULT 'general')
RETURNS TABLE(new_xp integer, new_level integer, level_up boolean) AS $$
DECLARE
  current_xp integer;
  current_level integer;
  updated_xp integer;
  updated_level integer;
  is_level_up boolean := false;
  current_streak integer;
  last_activity date;
  today date := CURRENT_DATE;
  activity_description text;
BEGIN
  -- Get current XP, level, streak, and last activity
  SELECT xp, level, streak, last_activity_date 
  INTO current_xp, current_level, current_streak, last_activity
  FROM profiles 
  WHERE id = user_id;

  -- Calculate new XP and level
  updated_xp := COALESCE(current_xp, 0) + xp_amount;
  updated_level := calculate_level(updated_xp);
  is_level_up := updated_level > COALESCE(current_level, 1);

  -- Set activity description
  CASE activity_type
    WHEN 'receipt_scan' THEN activity_description := 'Scanned receipt with OCR';
    WHEN 'transaction_upload' THEN activity_description := 'Uploaded transaction';
    WHEN 'login' THEN activity_description := 'Daily login bonus';
    ELSE activity_description := 'General activity';
  END CASE;

  -- Handle streak logic
  IF activity_type IN ('receipt_scan', 'transaction_upload', 'login') THEN
    IF last_activity IS NULL OR last_activity < today THEN
      -- First activity today
      IF last_activity = today - INTERVAL '1 day' THEN
        -- Consecutive day - increment streak
        current_streak := COALESCE(current_streak, 0) + 1;
        
        -- Weekly streak bonus
        IF current_streak % 7 = 0 THEN
          updated_xp := updated_xp + 25;
          updated_level := calculate_level(updated_xp);
          PERFORM log_xp_activity(user_id, 'streak_bonus', 25, 'Weekly streak bonus: ' || current_streak || ' days');
        END IF;
      ELSE
        -- Streak broken or first time
        current_streak := 1;
      END IF;
      
      -- Update last activity date
      last_activity := today;
    END IF;
  END IF;

  -- Update profile
  UPDATE profiles 
  SET 
    xp = updated_xp,
    level = updated_level,
    streak = current_streak,
    last_activity_date = last_activity,
    updated_at = now()
  WHERE id = user_id;

  -- Log the XP activity
  PERFORM log_xp_activity(user_id, activity_type, xp_amount, activity_description);

  -- Return results
  RETURN QUERY SELECT updated_xp, updated_level, is_level_up;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;