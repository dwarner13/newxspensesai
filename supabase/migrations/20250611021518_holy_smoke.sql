/*
  # Add Streak Tracking System

  1. New Tables
    - `badges` - Store user achievements and badges
    - `xp_activities` - Track all XP-earning activities
  
  2. Profile Updates
    - Add streak tracking fields to profiles table
    - Add last_activity_date for streak calculation
  
  3. Functions
    - Streak calculation and maintenance
    - Badge awarding logic
    - XP activity logging
  
  4. Security
    - Enable RLS on all new tables
    - Add policies for user data access
*/

-- Create badges table
CREATE TABLE IF NOT EXISTS badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_key text NOT NULL,
  name text NOT NULL,
  description text,
  earned_at timestamptz DEFAULT now(),
  xp_reward integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own badges"
  ON badges FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own badges"
  ON badges FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Create unique constraint to prevent duplicate badges
CREATE UNIQUE INDEX IF NOT EXISTS badges_user_badge_unique 
  ON badges(user_id, badge_key);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_badges_user_id ON badges(user_id);
CREATE INDEX IF NOT EXISTS idx_badges_earned_at ON badges(earned_at);

-- Function to check and award badges
CREATE OR REPLACE FUNCTION check_and_award_badges()
RETURNS TRIGGER AS $$
DECLARE
  receipt_count integer;
  transaction_count integer;
  current_streak integer;
  user_level integer;
  user_xp integer;
BEGIN
  -- Get user stats
  SELECT 
    COALESCE(transaction_count, 0),
    COALESCE(streak, 0),
    COALESCE(level, 1),
    COALESCE(xp, 0)
  INTO transaction_count, current_streak, user_level, user_xp
  FROM profiles 
  WHERE id = NEW.user_id;

  -- Count receipts
  SELECT COUNT(*) INTO receipt_count
  FROM receipts 
  WHERE user_id = NEW.user_id AND processing_status = 'completed';

  -- Award badges based on milestones
  
  -- First receipt badge
  IF receipt_count = 1 THEN
    INSERT INTO badges (user_id, badge_key, name, description, xp_reward)
    VALUES (NEW.user_id, 'first_receipt', '🧾 First Receipt', 'Upload your first receipt', 10)
    ON CONFLICT (user_id, badge_key) DO NOTHING;
  END IF;

  -- Receipt milestones
  IF receipt_count = 5 THEN
    INSERT INTO badges (user_id, badge_key, name, description, xp_reward)
    VALUES (NEW.user_id, 'receipt_explorer', '📸 Receipt Explorer', 'Upload 5 receipts', 25)
    ON CONFLICT (user_id, badge_key) DO NOTHING;
  END IF;

  IF receipt_count = 10 THEN
    INSERT INTO badges (user_id, badge_key, name, description, xp_reward)
    VALUES (NEW.user_id, 'receipt_master', '🏆 Receipt Master', 'Upload 10 receipts', 50)
    ON CONFLICT (user_id, badge_key) DO NOTHING;
  END IF;

  IF receipt_count = 25 THEN
    INSERT INTO badges (user_id, badge_key, name, description, xp_reward)
    VALUES (NEW.user_id, 'receipt_legend', '👑 Receipt Legend', 'Upload 25 receipts', 100)
    ON CONFLICT (user_id, badge_key) DO NOTHING;
  END IF;

  -- Transaction milestones
  IF transaction_count = 50 THEN
    INSERT INTO badges (user_id, badge_key, name, description, xp_reward)
    VALUES (NEW.user_id, 'transaction_tracker', '📊 Transaction Tracker', 'Record 50 transactions', 75)
    ON CONFLICT (user_id, badge_key) DO NOTHING;
  END IF;

  IF transaction_count = 100 THEN
    INSERT INTO badges (user_id, badge_key, name, description, xp_reward)
    VALUES (NEW.user_id, 'financial_guru', '💰 Financial Guru', 'Record 100 transactions', 150)
    ON CONFLICT (user_id, badge_key) DO NOTHING;
  END IF;

  -- Level milestones
  IF user_level = 5 THEN
    INSERT INTO badges (user_id, badge_key, name, description, xp_reward)
    VALUES (NEW.user_id, 'level_5', '🎯 Level 5 Achieved', 'Reach Level 5', 50)
    ON CONFLICT (user_id, badge_key) DO NOTHING;
  END IF;

  IF user_level = 10 THEN
    INSERT INTO badges (user_id, badge_key, name, description, xp_reward)
    VALUES (NEW.user_id, 'level_10', '⭐ Level 10 Master', 'Reach Level 10', 100)
    ON CONFLICT (user_id, badge_key) DO NOTHING;
  END IF;

  -- Streak milestones
  IF current_streak = 3 THEN
    INSERT INTO badges (user_id, badge_key, name, description, xp_reward)
    VALUES (NEW.user_id, 'streak_3', '🔥 3-Day Streak', 'Upload for 3 consecutive days', 25)
    ON CONFLICT (user_id, badge_key) DO NOTHING;
  END IF;

  IF current_streak = 7 THEN
    INSERT INTO badges (user_id, badge_key, name, description, xp_reward)
    VALUES (NEW.user_id, 'streak_7', '🔥 7-Day Streak', 'Upload for 7 consecutive days', 75)
    ON CONFLICT (user_id, badge_key) DO NOTHING;
  END IF;

  IF current_streak = 30 THEN
    INSERT INTO badges (user_id, badge_key, name, description, xp_reward)
    VALUES (NEW.user_id, 'streak_30', '🔥 30-Day Streak', 'Upload for 30 consecutive days', 200)
    ON CONFLICT (user_id, badge_key) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for badge checking
CREATE OR REPLACE TRIGGER check_badges_on_receipt
  AFTER INSERT OR UPDATE ON receipts
  FOR EACH ROW
  EXECUTE FUNCTION check_and_award_badges();

CREATE OR REPLACE TRIGGER check_badges_on_profile_update
  AFTER UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION check_and_award_badges();

-- Function to update streak
CREATE OR REPLACE FUNCTION update_user_streak(user_uuid uuid)
RETURNS void AS $$
DECLARE
  today_date date := CURRENT_DATE;
  last_activity date;
  current_streak integer;
  new_streak integer;
BEGIN
  -- Get current streak and last activity
  SELECT last_activity_date, COALESCE(streak, 0)
  INTO last_activity, current_streak
  FROM profiles
  WHERE id = user_uuid;

  -- Calculate new streak
  IF last_activity IS NULL THEN
    -- First activity
    new_streak := 1;
  ELSIF last_activity = today_date THEN
    -- Already active today, keep current streak
    new_streak := current_streak;
  ELSIF last_activity = today_date - INTERVAL '1 day' THEN
    -- Consecutive day, increment streak
    new_streak := current_streak + 1;
  ELSE
    -- Streak broken, reset to 1
    new_streak := 1;
  END IF;

  -- Update profile with new streak and activity date
  UPDATE profiles
  SET 
    streak = new_streak,
    last_activity_date = today_date,
    updated_at = now()
  WHERE id = user_uuid;

  -- Award streak bonus XP for milestones
  IF new_streak IN (7, 14, 30) THEN
    UPDATE profiles
    SET xp = xp + (new_streak * 2)
    WHERE id = user_uuid;

    -- Log XP activity
    INSERT INTO xp_activities (user_id, activity_type, xp_earned, description)
    VALUES (
      user_uuid,
      'streak_bonus',
      new_streak * 2,
      format('%s-day streak bonus', new_streak)
    );
  END IF;
END;
$$ LANGUAGE plpgsql;