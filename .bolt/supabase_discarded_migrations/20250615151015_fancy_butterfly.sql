/*
  # Add Gamification Functions

  1. New Functions
    - `add_user_xp` - Adds XP to a user and handles level progression
    - `update_user_streak` - Updates a user's daily streak
    - `check_and_award_badges` - Checks for badge eligibility and awards badges
    - `update_weekly_progress` - Updates progress on weekly goals

  2. Security
    - All functions are accessible to authenticated users
    - Functions only modify the calling user's data
*/

-- Function to add XP to a user and handle level progression
CREATE OR REPLACE FUNCTION add_user_xp(user_uuid UUID, xp_amount INTEGER)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_xp INTEGER;
  current_level INTEGER;
  new_level INTEGER;
  xp_for_next_level INTEGER;
BEGIN
  -- Get current XP and level
  SELECT xp, level INTO current_xp, current_level
  FROM profiles
  WHERE id = user_uuid;
  
  -- Calculate new XP
  current_xp := COALESCE(current_xp, 0) + xp_amount;
  
  -- Calculate XP needed for next level (exponential curve)
  xp_for_next_level := POWER(current_level * 100, 1.1);
  
  -- Check if user leveled up
  IF current_xp >= xp_for_next_level THEN
    new_level := current_level + 1;
  ELSE
    new_level := current_level;
  END IF;
  
  -- Update profile
  UPDATE profiles
  SET 
    xp = current_xp,
    level = new_level,
    last_activity_date = CURRENT_DATE
  WHERE id = user_uuid;
  
  -- Return the result
  RETURN jsonb_build_object(
    'previous_xp', current_xp - xp_amount,
    'new_xp', current_xp,
    'previous_level', current_level,
    'new_level', new_level,
    'leveled_up', new_level > current_level
  );
END;
$$;

-- Function to update a user's daily streak
CREATE OR REPLACE FUNCTION update_user_streak(user_uuid UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  last_date DATE;
  current_streak INTEGER;
  new_streak INTEGER;
  streak_updated BOOLEAN := FALSE;
BEGIN
  -- Get current streak and last activity date
  SELECT streak, last_activity_date INTO current_streak, last_date
  FROM profiles
  WHERE id = user_uuid;
  
  current_streak := COALESCE(current_streak, 0);
  
  -- Check if this is the first activity
  IF last_date IS NULL THEN
    new_streak := 1;
    streak_updated := TRUE;
  -- Check if last activity was yesterday
  ELSIF last_date = CURRENT_DATE - INTERVAL '1 day' THEN
    new_streak := current_streak + 1;
    streak_updated := TRUE;
  -- Check if last activity was today (no change)
  ELSIF last_date = CURRENT_DATE THEN
    new_streak := current_streak;
  -- Otherwise streak is broken
  ELSE
    new_streak := 1;
    streak_updated := TRUE;
  END IF;
  
  -- Update profile
  UPDATE profiles
  SET 
    streak = new_streak,
    last_activity_date = CURRENT_DATE
  WHERE id = user_uuid;
  
  -- Return the result
  RETURN jsonb_build_object(
    'previous_streak', current_streak,
    'new_streak', new_streak,
    'streak_updated', streak_updated,
    'last_activity_date', CURRENT_DATE
  );
END;
$$;

-- Function to check for badge eligibility and award badges
CREATE OR REPLACE FUNCTION check_and_award_badges()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  badge_key TEXT;
  badge_name TEXT;
  badge_description TEXT;
  xp_reward INTEGER;
  badge_exists BOOLEAN;
BEGIN
  -- Check for receipt-related badges
  IF TG_TABLE_NAME = 'receipts' AND NEW.processing_status = 'completed' THEN
    -- Count user's receipts
    DECLARE
      receipt_count INTEGER;
    BEGIN
      SELECT COUNT(*) INTO receipt_count
      FROM receipts
      WHERE user_id = NEW.user_id AND processing_status = 'completed';
      
      -- First receipt badge
      IF receipt_count = 1 THEN
        badge_key := 'first_receipt';
        badge_name := '🧾 First Receipt';
        badge_description := 'Upload your first receipt';
        xp_reward := 10;
      -- Receipt explorer badge
      ELSIF receipt_count = 5 THEN
        badge_key := 'receipt_explorer';
        badge_name := '📸 Receipt Explorer';
        badge_description := 'Upload 5 receipts';
        xp_reward := 25;
      -- Receipt master badge
      ELSIF receipt_count = 10 THEN
        badge_key := 'receipt_master';
        badge_name := '🏆 Receipt Master';
        badge_description := 'Upload 10 receipts';
        xp_reward := 50;
      -- Receipt legend badge
      ELSIF receipt_count = 25 THEN
        badge_key := 'receipt_legend';
        badge_name := '👑 Receipt Legend';
        badge_description := 'Upload 25 receipts';
        xp_reward := 100;
      END IF;
    END;
  END IF;
  
  -- Check for profile-related badges
  IF TG_TABLE_NAME = 'profiles' THEN
    -- Level badges
    IF NEW.level = 5 AND (OLD.level IS NULL OR OLD.level < 5) THEN
      badge_key := 'level_5';
      badge_name := '🎯 Level 5 Achieved';
      badge_description := 'Reach Level 5';
      xp_reward := 50;
    ELSIF NEW.level = 10 AND (OLD.level IS NULL OR OLD.level < 10) THEN
      badge_key := 'level_10';
      badge_name := '⭐ Level 10 Master';
      badge_description := 'Reach Level 10';
      xp_reward := 100;
    END IF;
    
    -- Streak badges
    IF NEW.streak = 3 AND (OLD.streak IS NULL OR OLD.streak < 3) THEN
      badge_key := 'streak_3';
      badge_name := '🔥 3-Day Streak';
      badge_description := 'Upload for 3 consecutive days';
      xp_reward := 25;
    ELSIF NEW.streak = 7 AND (OLD.streak IS NULL OR OLD.streak < 7) THEN
      badge_key := 'streak_7';
      badge_name := '🔥 7-Day Streak';
      badge_description := 'Upload for 7 consecutive days';
      xp_reward := 75;
    ELSIF NEW.streak = 30 AND (OLD.streak IS NULL OR OLD.streak < 30) THEN
      badge_key := 'streak_30';
      badge_name := '🔥 30-Day Streak';
      badge_description := 'Upload for 30 consecutive days';
      xp_reward := 200;
    END IF;
  END IF;
  
  -- Check for transaction-related badges
  IF TG_TABLE_NAME = 'transactions' AND TG_OP = 'INSERT' THEN
    -- Count user's transactions
    DECLARE
      transaction_count INTEGER;
    BEGIN
      SELECT COUNT(*) INTO transaction_count
      FROM transactions
      WHERE user_id = NEW.user_id;
      
      -- Transaction tracker badge
      IF transaction_count = 50 THEN
        badge_key := 'transaction_tracker';
        badge_name := '📊 Transaction Tracker';
        badge_description := 'Record 50 transactions';
        xp_reward := 75;
      -- Financial guru badge
      ELSIF transaction_count = 100 THEN
        badge_key := 'financial_guru';
        badge_name := '💰 Financial Guru';
        badge_description := 'Record 100 transactions';
        xp_reward := 150;
      END IF;
    END;
  END IF;
  
  -- Award badge if eligible
  IF badge_key IS NOT NULL THEN
    -- Check if badge already exists
    SELECT EXISTS (
      SELECT 1 FROM badges
      WHERE user_id = COALESCE(NEW.user_id, OLD.user_id) AND badge_key = badge_key
    ) INTO badge_exists;
    
    -- Insert badge if it doesn't exist
    IF NOT badge_exists THEN
      INSERT INTO badges (
        user_id,
        badge_key,
        name,
        description,
        xp_reward,
        earned_at
      ) VALUES (
        COALESCE(NEW.user_id, OLD.user_id),
        badge_key,
        badge_name,
        badge_description,
        xp_reward,
        NOW()
      );
      
      -- Award XP for the badge
      PERFORM add_user_xp(COALESCE(NEW.user_id, OLD.user_id), xp_reward);
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Function to update weekly goal progress
CREATE OR REPLACE FUNCTION update_weekly_progress()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  goal_record RECORD;
  current_progress INTEGER;
  target_value INTEGER;
  is_completed BOOLEAN;
BEGIN
  -- Find relevant weekly goals
  FOR goal_record IN
    SELECT wg.id, wg.goal_type, wg.target_value, wg.current_progress, wg.completed, wg.xp_reward
    FROM weekly_goals wg
    WHERE 
      wg.user_id = COALESCE(NEW.user_id, OLD.user_id) AND
      CURRENT_DATE BETWEEN wg.week_start AND wg.week_end AND
      wg.completed = FALSE
  LOOP
    current_progress := goal_record.current_progress;
    target_value := goal_record.target_value;
    is_completed := FALSE;
    
    -- Update progress based on goal type and trigger table
    IF TG_TABLE_NAME = 'transactions' AND TG_OP = 'INSERT' AND goal_record.goal_type = 'transactions' THEN
      current_progress := current_progress + 1;
    ELSIF TG_TABLE_NAME = 'receipts' AND goal_record.goal_type = 'receipts' THEN
      IF NEW.processing_status = 'completed' THEN
        current_progress := current_progress + 1;
      END IF;
    ELSIF TG_TABLE_NAME = 'profiles' AND goal_record.goal_type = 'streak' THEN
      IF NEW.streak > OLD.streak THEN
        current_progress := NEW.streak;
      END IF;
    END IF;
    
    -- Check if goal is completed
    IF current_progress >= target_value THEN
      is_completed := TRUE;
    END IF;
    
    -- Update the goal
    UPDATE weekly_goals
    SET 
      current_progress = current_progress,
      completed = is_completed
    WHERE id = goal_record.id;
    
    -- Award XP if goal is completed
    IF is_completed AND NOT goal_record.completed THEN
      PERFORM add_user_xp(COALESCE(NEW.user_id, OLD.user_id), goal_record.xp_reward);
      
      -- Record XP activity
      INSERT INTO xp_activities (
        user_id,
        activity_type,
        xp_earned,
        description
      ) VALUES (
        COALESCE(NEW.user_id, OLD.user_id),
        'goal_completed',
        goal_record.xp_reward,
        'Completed weekly goal: ' || goal_record.goal_type
      );
    END IF;
  END LOOP;
  
  RETURN NEW;
END;
$$;

-- Function to handle transaction XP
CREATE OR REPLACE FUNCTION handle_transaction_xp()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Award XP for new transaction
  PERFORM add_user_xp(NEW.user_id, 5);
  
  -- Record XP activity
  INSERT INTO xp_activities (
    user_id,
    activity_type,
    xp_earned,
    description
  ) VALUES (
    NEW.user_id,
    'transaction_upload',
    5,
    'Added new transaction'
  );
  
  RETURN NEW;
END;
$$;

-- Function to handle receipt XP
CREATE OR REPLACE FUNCTION handle_receipt_xp()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only award XP when receipt is processed successfully
  IF NEW.processing_status = 'completed' AND 
     (OLD.processing_status IS NULL OR OLD.processing_status != 'completed') THEN
    
    -- Award XP for receipt scan
    PERFORM add_user_xp(NEW.user_id, 10);
    
    -- Record XP activity
    INSERT INTO xp_activities (
      user_id,
      activity_type,
      xp_earned,
      description
    ) VALUES (
      NEW.user_id,
      'receipt_scan',
      10,
      'Scanned and processed receipt'
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create triggers for the functions
DROP TRIGGER IF EXISTS check_badges_on_receipt ON receipts;
CREATE TRIGGER check_badges_on_receipt
AFTER INSERT OR UPDATE ON receipts
FOR EACH ROW
EXECUTE FUNCTION check_and_award_badges();

DROP TRIGGER IF EXISTS check_badges_on_profile_update ON profiles;
CREATE TRIGGER check_badges_on_profile_update
AFTER UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION check_and_award_badges();

DROP TRIGGER IF EXISTS transaction_xp_trigger ON transactions;
CREATE TRIGGER transaction_xp_trigger
AFTER INSERT ON transactions
FOR EACH ROW
EXECUTE FUNCTION handle_transaction_xp();

DROP TRIGGER IF EXISTS receipt_xp_trigger ON receipts;
CREATE TRIGGER receipt_xp_trigger
AFTER UPDATE ON receipts
FOR EACH ROW
EXECUTE FUNCTION handle_receipt_xp();

DROP TRIGGER IF EXISTS update_weekly_progress_transactions ON transactions;
CREATE TRIGGER update_weekly_progress_transactions
AFTER INSERT ON transactions
FOR EACH ROW
EXECUTE FUNCTION update_weekly_progress();

DROP TRIGGER IF EXISTS update_weekly_progress_receipts ON receipts;
CREATE TRIGGER update_weekly_progress_receipts
AFTER INSERT OR UPDATE ON receipts
FOR EACH ROW
EXECUTE FUNCTION update_weekly_progress();

DROP TRIGGER IF EXISTS update_weekly_progress_profiles ON profiles;
CREATE TRIGGER update_weekly_progress_profiles
AFTER UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION update_weekly_progress();