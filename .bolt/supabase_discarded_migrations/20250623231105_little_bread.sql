/*
  # Gamification System Setup

  1. New Tables
    - `badges` - Stores user achievement badges
    - `weekly_goals` - Tracks weekly user goals and progress
    - `xp_activities` - Logs XP earning activities (if not exists)
  
  2. Functions
    - `check_and_award_badges()` - Checks and awards badges based on user activity
    - `update_weekly_progress()` - Updates progress on weekly goals
    - `handle_transaction_xp()` - Awards XP for transactions
    - `handle_receipt_xp()` - Awards XP for receipt scanning
  
  3. Triggers
    - Various triggers to execute the above functions on relevant tables
*/

-- Create badges table if it doesn't exist
CREATE TABLE IF NOT EXISTS badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  badge_key TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  earned_at TIMESTAMPTZ DEFAULT now(),
  xp_reward INTEGER DEFAULT 0
);

-- Create unique constraint to prevent duplicate badges
CREATE UNIQUE INDEX IF NOT EXISTS badges_user_badge_unique ON badges(user_id, badge_key);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_badges_user_id ON badges(user_id);
CREATE INDEX IF NOT EXISTS idx_badges_earned_at ON badges(earned_at);

-- Enable RLS
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;

-- Create policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'badges' AND policyname = 'Users can view their own badges'
  ) THEN
    CREATE POLICY "Users can view their own badges"
      ON badges
      FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'badges' AND policyname = 'Users can insert their own badges'
  ) THEN
    CREATE POLICY "Users can insert their own badges"
      ON badges
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;
END
$$;

-- Create weekly goals table if it doesn't exist
CREATE TABLE IF NOT EXISTS weekly_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  goal_type TEXT NOT NULL,
  goal_name TEXT NOT NULL,
  target_value INTEGER NOT NULL,
  current_progress INTEGER DEFAULT 0,
  xp_reward INTEGER DEFAULT 0,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE weekly_goals ENABLE ROW LEVEL SECURITY;

-- Create policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'weekly_goals' AND policyname = 'Users can view their own weekly goals'
  ) THEN
    CREATE POLICY "Users can view their own weekly goals"
      ON weekly_goals
      FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'weekly_goals' AND policyname = 'Users can update their own weekly goals'
  ) THEN
    CREATE POLICY "Users can update their own weekly goals"
      ON weekly_goals
      FOR UPDATE
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END
$$;

-- Create xp_activities table if it doesn't exist
CREATE TABLE IF NOT EXISTS xp_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  activity_type TEXT NOT NULL,
  xp_earned INTEGER NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_xp_activities_user_id ON xp_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_xp_activities_created_at ON xp_activities(created_at);

-- Enable RLS
ALTER TABLE xp_activities ENABLE ROW LEVEL SECURITY;

-- Create policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'xp_activities' AND policyname = 'Users can view their own XP activities'
  ) THEN
    CREATE POLICY "Users can view their own XP activities"
      ON xp_activities
      FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'xp_activities' AND policyname = 'Users can insert their own XP activities'
  ) THEN
    CREATE POLICY "Users can insert their own XP activities"
      ON xp_activities
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;
END
$$;

-- Function to check and award badges
CREATE OR REPLACE FUNCTION check_and_award_badges()
RETURNS TRIGGER AS $$
DECLARE
  receipt_count INTEGER;
  transaction_count INTEGER;
  streak_days INTEGER;
  user_level INTEGER;
BEGIN
  -- Get user stats
  SELECT 
    (SELECT COUNT(*) FROM receipts WHERE user_id = NEW.id AND processing_status = 'completed'),
    (SELECT COUNT(*) FROM transactions WHERE user_id = NEW.id),
    NEW.streak,
    NEW.level
  INTO 
    receipt_count,
    transaction_count,
    streak_days,
    user_level;
  
  -- Check for receipt badges
  IF receipt_count = 1 THEN
    -- First receipt badge
    INSERT INTO badges (user_id, badge_key, name, description, xp_reward)
    VALUES (NEW.id, 'first_receipt', '🧾 First Receipt', 'Upload your first receipt', 10)
    ON CONFLICT (user_id, badge_key) DO NOTHING;
  END IF;
  
  IF receipt_count >= 5 THEN
    -- Receipt explorer badge
    INSERT INTO badges (user_id, badge_key, name, description, xp_reward)
    VALUES (NEW.id, 'receipt_explorer', '📸 Receipt Explorer', 'Upload 5 receipts', 25)
    ON CONFLICT (user_id, badge_key) DO NOTHING;
  END IF;
  
  IF receipt_count >= 10 THEN
    -- Receipt master badge
    INSERT INTO badges (user_id, badge_key, name, description, xp_reward)
    VALUES (NEW.id, 'receipt_master', '🏆 Receipt Master', 'Upload 10 receipts', 50)
    ON CONFLICT (user_id, badge_key) DO NOTHING;
  END IF;
  
  IF receipt_count >= 25 THEN
    -- Receipt legend badge
    INSERT INTO badges (user_id, badge_key, name, description, xp_reward)
    VALUES (NEW.id, 'receipt_legend', '👑 Receipt Legend', 'Upload 25 receipts', 100)
    ON CONFLICT (user_id, badge_key) DO NOTHING;
  END IF;
  
  -- Check for streak badges
  IF streak_days >= 3 THEN
    -- 3-day streak badge
    INSERT INTO badges (user_id, badge_key, name, description, xp_reward)
    VALUES (NEW.id, 'streak_3', '🔥 3-Day Streak', 'Upload for 3 consecutive days', 25)
    ON CONFLICT (user_id, badge_key) DO NOTHING;
  END IF;
  
  IF streak_days >= 7 THEN
    -- 7-day streak badge
    INSERT INTO badges (user_id, badge_key, name, description, xp_reward)
    VALUES (NEW.id, 'streak_7', '🔥 7-Day Streak', 'Upload for 7 consecutive days', 75)
    ON CONFLICT (user_id, badge_key) DO NOTHING;
  END IF;
  
  IF streak_days >= 30 THEN
    -- 30-day streak badge
    INSERT INTO badges (user_id, badge_key, name, description, xp_reward)
    VALUES (NEW.id, 'streak_30', '🔥 30-Day Streak', 'Upload for 30 consecutive days', 200)
    ON CONFLICT (user_id, badge_key) DO NOTHING;
  END IF;
  
  -- Check for level badges
  IF user_level >= 5 THEN
    -- Level 5 badge
    INSERT INTO badges (user_id, badge_key, name, description, xp_reward)
    VALUES (NEW.id, 'level_5', '🎯 Level 5 Achieved', 'Reach Level 5', 50)
    ON CONFLICT (user_id, badge_key) DO NOTHING;
  END IF;
  
  IF user_level >= 10 THEN
    -- Level 10 badge
    INSERT INTO badges (user_id, badge_key, name, description, xp_reward)
    VALUES (NEW.id, 'level_10', '⭐ Level 10 Master', 'Reach Level 10', 100)
    ON CONFLICT (user_id, badge_key) DO NOTHING;
  END IF;
  
  -- Check for transaction badges
  IF transaction_count >= 50 THEN
    -- Transaction tracker badge
    INSERT INTO badges (user_id, badge_key, name, description, xp_reward)
    VALUES (NEW.id, 'transaction_tracker', '📊 Transaction Tracker', 'Record 50 transactions', 75)
    ON CONFLICT (user_id, badge_key) DO NOTHING;
  END IF;
  
  IF transaction_count >= 100 THEN
    -- Financial guru badge
    INSERT INTO badges (user_id, badge_key, name, description, xp_reward)
    VALUES (NEW.id, 'financial_guru', '💰 Financial Guru', 'Record 100 transactions', 150)
    ON CONFLICT (user_id, badge_key) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update weekly progress
CREATE OR REPLACE FUNCTION update_weekly_progress()
RETURNS TRIGGER AS $$
DECLARE
  current_week_start DATE;
  current_week_end DATE;
  goal_id UUID;
BEGIN
  -- Calculate current week (Monday to Sunday)
  current_week_start := date_trunc('week', CURRENT_DATE)::DATE;
  current_week_end := (current_week_start + INTERVAL '6 days')::DATE;
  
  -- Check for receipt scanning goal
  IF TG_TABLE_NAME = 'receipts' AND NEW.processing_status = 'completed' THEN
    -- Find or create weekly receipt goal
    SELECT id INTO goal_id
    FROM weekly_goals
    WHERE user_id = NEW.user_id
      AND goal_type = 'receipt_scan'
      AND week_start = current_week_start
      AND week_end = current_week_end;
      
    IF goal_id IS NULL THEN
      -- Create new goal
      INSERT INTO weekly_goals (
        user_id, goal_type, goal_name, target_value, 
        current_progress, xp_reward, week_start, week_end
      )
      VALUES (
        NEW.user_id, 'receipt_scan', 'Scan Receipts', 5,
        1, 25, current_week_start, current_week_end
      );
    ELSE
      -- Update existing goal
      UPDATE weekly_goals
      SET current_progress = current_progress + 1,
          completed = (current_progress + 1 >= target_value)
      WHERE id = goal_id;
    END IF;
  END IF;
  
  -- Check for transaction upload goal
  IF TG_TABLE_NAME = 'transactions' AND TG_OP = 'INSERT' THEN
    -- Find or create weekly transaction goal
    SELECT id INTO goal_id
    FROM weekly_goals
    WHERE user_id = NEW.user_id
      AND goal_type = 'transaction_upload'
      AND week_start = current_week_start
      AND week_end = current_week_end;
      
    IF goal_id IS NULL THEN
      -- Create new goal
      INSERT INTO weekly_goals (
        user_id, goal_type, goal_name, target_value, 
        current_progress, xp_reward, week_start, week_end
      )
      VALUES (
        NEW.user_id, 'transaction_upload', 'Upload Transactions', 10,
        1, 30, current_week_start, current_week_end
      );
    ELSE
      -- Update existing goal
      UPDATE weekly_goals
      SET current_progress = current_progress + 1,
          completed = (current_progress + 1 >= target_value)
      WHERE id = goal_id;
    END IF;
  END IF;
  
  -- Check for profile activity goal (login, etc.)
  IF TG_TABLE_NAME = 'profiles' AND NEW.last_activity_date IS NOT NULL AND 
     (OLD.last_activity_date IS NULL OR NEW.last_activity_date > OLD.last_activity_date) THEN
    -- Find or create weekly activity goal
    SELECT id INTO goal_id
    FROM weekly_goals
    WHERE user_id = NEW.id
      AND goal_type = 'daily_activity'
      AND week_start = current_week_start
      AND week_end = current_week_end;
      
    IF goal_id IS NULL THEN
      -- Create new goal
      INSERT INTO weekly_goals (
        user_id, goal_type, goal_name, target_value, 
        current_progress, xp_reward, week_start, week_end
      )
      VALUES (
        NEW.id, 'daily_activity', 'Daily Activity', 5,
        1, 20, current_week_start, current_week_end
      );
    ELSE
      -- Update existing goal
      UPDATE weekly_goals
      SET current_progress = current_progress + 1,
          completed = (current_progress + 1 >= target_value)
      WHERE id = goal_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to handle transaction XP
CREATE OR REPLACE FUNCTION handle_transaction_xp()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to handle receipt XP
CREATE OR REPLACE FUNCTION handle_receipt_xp()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create or replace triggers for the functions
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