/*
  # Add User XP Table and Functions

  1. New Tables
    - `user_xp` - Stores user XP data, levels, streaks, and badges
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to users)
      - `xp_total` (integer)
      - `current_level` (integer)
      - `daily_streak` (integer)
      - `last_active` (date)
      - `badges` (jsonb)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. New Functions
    - `update_user_xp` - Updates user XP and handles level progression
    - `update_user_streak` - Updates user streak based on activity
    - `award_badge` - Awards a badge to a user

  3. Security
    - Enable RLS on `user_xp` table
    - Add policies for authenticated users
*/

-- Create user_xp table
CREATE TABLE IF NOT EXISTS user_xp (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  xp_total INTEGER NOT NULL DEFAULT 0,
  current_level INTEGER NOT NULL DEFAULT 1,
  daily_streak INTEGER NOT NULL DEFAULT 0,
  last_active DATE,
  badges JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create unique index on user_id
CREATE UNIQUE INDEX IF NOT EXISTS user_xp_user_id_idx ON user_xp(user_id);

-- Enable RLS
ALTER TABLE user_xp ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own XP data"
  ON user_xp
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own XP data"
  ON user_xp
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create update_user_xp function
CREATE OR REPLACE FUNCTION update_user_xp(
  user_uuid UUID,
  xp_amount INTEGER,
  activity_type TEXT DEFAULT 'general',
  activity_description TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  current_xp INTEGER;
  current_level INTEGER;
  new_level INTEGER;
  xp_record_exists BOOLEAN;
  result JSON;
BEGIN
  -- Check if user has an XP record
  SELECT EXISTS(
    SELECT 1 FROM user_xp WHERE user_id = user_uuid
  ) INTO xp_record_exists;
  
  -- If no record exists, create one
  IF NOT xp_record_exists THEN
    INSERT INTO user_xp (
      user_id,
      xp_total,
      current_level,
      daily_streak,
      last_active
    ) VALUES (
      user_uuid,
      0,
      1,
      1,
      CURRENT_DATE
    );
  END IF;
  
  -- Get current XP and level
  SELECT xp_total, current_level 
  INTO current_xp, current_level
  FROM user_xp
  WHERE user_id = user_uuid;
  
  -- Calculate new level (300 XP per level)
  new_level := GREATEST(1, FLOOR((current_xp + xp_amount) / 300) + 1);
  
  -- Update user_xp record
  UPDATE user_xp
  SET 
    xp_total = xp_total + xp_amount,
    current_level = new_level,
    updated_at = NOW()
  WHERE user_id = user_uuid;
  
  -- Also update the profiles table if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'profiles'
  ) THEN
    UPDATE profiles
    SET 
      xp = xp + xp_amount,
      level = new_level,
      updated_at = NOW()
    WHERE id = user_uuid;
  END IF;
  
  -- Log XP activity if xp_activities table exists
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'xp_activities'
  ) THEN
    INSERT INTO xp_activities (
      user_id,
      activity_type,
      xp_earned,
      description
    ) VALUES (
      user_uuid,
      activity_type,
      xp_amount,
      COALESCE(activity_description, 'XP added via update_user_xp function')
    );
  END IF;
  
  -- Return result with previous and new values
  SELECT json_build_object(
    'previous_xp', current_xp,
    'new_xp', current_xp + xp_amount,
    'previous_level', current_level,
    'new_level', new_level,
    'xp_added', xp_amount,
    'level_up', new_level > current_level
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create update_user_streak function
CREATE OR REPLACE FUNCTION update_user_streak(user_uuid UUID)
RETURNS JSON AS $$
DECLARE
  last_active_date DATE;
  current_streak INTEGER;
  new_streak INTEGER;
  streak_updated BOOLEAN := FALSE;
  xp_awarded INTEGER := 0;
  result JSON;
BEGIN
  -- Get current streak and last active date
  SELECT daily_streak, last_active
  INTO current_streak, last_active_date
  FROM user_xp
  WHERE user_id = user_uuid;
  
  -- If no record exists, create one
  IF last_active_date IS NULL THEN
    INSERT INTO user_xp (
      user_id,
      daily_streak,
      last_active
    ) VALUES (
      user_uuid,
      1,
      CURRENT_DATE
    )
    ON CONFLICT (user_id) DO UPDATE
    SET 
      daily_streak = 1,
      last_active = CURRENT_DATE;
    
    current_streak := 1;
    new_streak := 1;
    streak_updated := TRUE;
  ELSE
    -- Check if last active date was yesterday
    IF last_active_date = CURRENT_DATE - INTERVAL '1 day' THEN
      -- Increment streak
      new_streak := current_streak + 1;
      streak_updated := TRUE;
      
      -- Check for streak milestones and award XP
      IF new_streak = 3 THEN
        xp_awarded := 15;
      ELSIF new_streak = 7 THEN
        xp_awarded := 25;
      ELSIF new_streak = 14 THEN
        xp_awarded := 50;
      ELSIF new_streak = 30 THEN
        xp_awarded := 100;
      ELSIF new_streak = 60 THEN
        xp_awarded := 200;
      ELSE
        -- Award 2 XP per day for maintaining streak
        xp_awarded := 2;
      END IF;
    -- Check if last active date is today (no change)
    ELSIF last_active_date = CURRENT_DATE THEN
      new_streak := current_streak;
    -- Otherwise reset streak (more than 1 day gap)
    ELSE
      new_streak := 1;
      streak_updated := TRUE;
    END IF;
    
    -- Update user_xp record
    UPDATE user_xp
    SET 
      daily_streak = new_streak,
      last_active = CURRENT_DATE,
      updated_at = NOW()
    WHERE user_id = user_uuid;
    
    -- Also update the profiles table if it exists
    IF EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'profiles'
    ) THEN
      UPDATE profiles
      SET 
        streak = new_streak,
        last_activity_date = CURRENT_DATE,
        updated_at = NOW()
      WHERE id = user_uuid;
    END IF;
  END IF;
  
  -- Award XP if milestone reached
  IF xp_awarded > 0 THEN
    PERFORM update_user_xp(
      user_uuid, 
      xp_awarded, 
      'streak_bonus', 
      new_streak || '-day streak bonus'
    );
  END IF;
  
  -- Return result
  SELECT json_build_object(
    'previous_streak', current_streak,
    'new_streak', new_streak,
    'streak_updated', streak_updated,
    'xp_awarded', xp_awarded,
    'last_active', CURRENT_DATE
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create award_badge function
CREATE OR REPLACE FUNCTION award_badge(
  user_uuid UUID,
  badge_key TEXT,
  badge_name TEXT,
  badge_description TEXT,
  xp_reward INTEGER DEFAULT 0
)
RETURNS BOOLEAN AS $$
DECLARE
  user_badges JSONB;
  badge_exists BOOLEAN;
BEGIN
  -- Get current badges
  SELECT badges INTO user_badges
  FROM user_xp
  WHERE user_id = user_uuid;
  
  -- Check if badge already exists
  SELECT jsonb_path_exists(user_badges, ('$[*] ? (@.badge_key == "' || badge_key || '")')::jsonpath)
  INTO badge_exists;
  
  -- If badge doesn't exist, add it
  IF NOT badge_exists THEN
    -- Add badge to user_xp
    UPDATE user_xp
    SET badges = badges || jsonb_build_object(
      'badge_key', badge_key,
      'name', badge_name,
      'description', badge_description,
      'earned_at', CURRENT_TIMESTAMP,
      'xp_reward', xp_reward
    )
    WHERE user_id = user_uuid;
    
    -- Also add to badges table if it exists
    IF EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'badges'
    ) THEN
      INSERT INTO badges (
        user_id,
        badge_key,
        name,
        description,
        xp_reward
      ) VALUES (
        user_uuid,
        badge_key,
        badge_name,
        badge_description,
        xp_reward
      )
      ON CONFLICT (user_id, badge_key) DO NOTHING;
    END IF;
    
    -- Award XP for badge
    IF xp_reward > 0 THEN
      PERFORM update_user_xp(
        user_uuid, 
        xp_reward, 
        'badge_earned', 
        'Earned badge: ' || badge_name
      );
    END IF;
    
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION update_user_xp(UUID, INTEGER, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION update_user_streak(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION award_badge(UUID, TEXT, TEXT, TEXT, INTEGER) TO authenticated;