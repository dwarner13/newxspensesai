-- Add email notification preferences to profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS email_notifications boolean DEFAULT true;

-- Add weekly goals table for quest system
CREATE TABLE IF NOT EXISTS weekly_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  goal_type text NOT NULL,
  goal_name text NOT NULL,
  target_value integer NOT NULL,
  current_progress integer DEFAULT 0,
  xp_reward integer DEFAULT 0,
  week_start date NOT NULL,
  week_end date NOT NULL,
  completed boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE weekly_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own weekly goals"
  ON weekly_goals FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own weekly goals"
  ON weekly_goals FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Add savings goals table
CREATE TABLE IF NOT EXISTS savings_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  goal_name text NOT NULL,
  category text NOT NULL,
  target_amount numeric NOT NULL,
  current_amount numeric DEFAULT 0,
  month_year text NOT NULL, -- Format: "2024-01"
  completed boolean DEFAULT false,
  xp_reward integer DEFAULT 25,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE savings_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own savings goals"
  ON savings_goals FOR ALL
  TO authenticated
  USING (auth.uid() = user_id);

-- Add referrals table
CREATE TABLE IF NOT EXISTS referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_email text NOT NULL,
  referred_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  referral_code text NOT NULL UNIQUE,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'expired')),
  xp_awarded boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own referrals"
  ON referrals FOR SELECT
  TO authenticated
  USING (auth.uid() = referrer_id);

CREATE POLICY "Users can insert their own referrals"
  ON referrals FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = referrer_id);

-- Function to generate weekly goals
CREATE OR REPLACE FUNCTION generate_weekly_goals(user_uuid uuid)
RETURNS void AS $$
DECLARE
  week_start date := date_trunc('week', CURRENT_DATE);
  week_end date := week_start + INTERVAL '6 days';
BEGIN
  -- Check if goals already exist for this week
  IF NOT EXISTS (
    SELECT 1 FROM weekly_goals 
    WHERE user_id = user_uuid 
    AND week_start = date_trunc('week', CURRENT_DATE)
  ) THEN
    -- Insert weekly goals
    INSERT INTO weekly_goals (user_id, goal_type, goal_name, target_value, xp_reward, week_start, week_end)
    VALUES 
      (user_uuid, 'receipts', 'Upload 5 receipts this week', 5, 50, week_start, week_end),
      (user_uuid, 'transactions', 'Categorize 10 transactions', 10, 30, week_start, week_end),
      (user_uuid, 'streak', 'Maintain a 3-day streak', 3, 40, week_start, week_end);
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to update weekly goal progress
CREATE OR REPLACE FUNCTION update_weekly_progress()
RETURNS TRIGGER AS $$
DECLARE
  current_week_start date := date_trunc('week', CURRENT_DATE);
  receipt_count integer;
  transaction_count integer;
  current_streak integer;
BEGIN
  -- Generate weekly goals if they don't exist
  PERFORM generate_weekly_goals(NEW.user_id);
  
  -- Update receipt goal progress
  IF TG_TABLE_NAME = 'receipts' AND NEW.processing_status = 'completed' THEN
    SELECT COUNT(*) INTO receipt_count
    FROM receipts 
    WHERE user_id = NEW.user_id 
    AND processing_status = 'completed'
    AND upload_date >= current_week_start;
    
    UPDATE weekly_goals 
    SET current_progress = receipt_count
    WHERE user_id = NEW.user_id 
    AND goal_type = 'receipts'
    AND week_start = current_week_start;
  END IF;
  
  -- Update transaction goal progress
  IF TG_TABLE_NAME = 'transactions' THEN
    SELECT COUNT(*) INTO transaction_count
    FROM transactions 
    WHERE user_id = NEW.user_id 
    AND created_at >= current_week_start;
    
    UPDATE weekly_goals 
    SET current_progress = transaction_count
    WHERE user_id = NEW.user_id 
    AND goal_type = 'transactions'
    AND week_start = current_week_start;
  END IF;
  
  -- Update streak goal progress
  IF TG_TABLE_NAME = 'profiles' AND NEW.streak IS DISTINCT FROM OLD.streak THEN
    UPDATE weekly_goals 
    SET current_progress = GREATEST(NEW.streak, current_progress)
    WHERE user_id = NEW.user_id 
    AND goal_type = 'streak'
    AND week_start = current_week_start;
  END IF;
  
  -- Check for completed goals and award XP
  UPDATE weekly_goals 
  SET completed = true
  WHERE user_id = NEW.user_id 
  AND week_start = current_week_start
  AND current_progress >= target_value 
  AND completed = false;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for weekly progress
CREATE OR REPLACE TRIGGER update_weekly_progress_receipts
  AFTER INSERT OR UPDATE ON receipts
  FOR EACH ROW
  EXECUTE FUNCTION update_weekly_progress();

CREATE OR REPLACE TRIGGER update_weekly_progress_transactions
  AFTER INSERT ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_weekly_progress();

CREATE OR REPLACE TRIGGER update_weekly_progress_profiles
  AFTER UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_weekly_progress();

-- Enhanced badge function with email notifications
CREATE OR REPLACE FUNCTION check_and_award_badges()
RETURNS TRIGGER AS $$
DECLARE
  receipt_count integer;
  transaction_count integer;
  current_streak integer;
  user_level integer;
  user_xp integer;
  badge_awarded boolean := false;
  new_badge_name text;
  badge_xp integer;
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

  -- Award badges and track for email notifications
  
  -- First receipt badge
  IF receipt_count = 1 THEN
    INSERT INTO badges (user_id, badge_key, name, description, xp_reward)
    VALUES (NEW.user_id, 'first_receipt', '🧾 First Receipt', 'Upload your first receipt', 10)
    ON CONFLICT (user_id, badge_key) DO NOTHING;
    
    IF FOUND THEN
      badge_awarded := true;
      new_badge_name := '🧾 First Receipt';
      badge_xp := 10;
    END IF;
  END IF;

  -- Receipt milestones
  IF receipt_count = 5 THEN
    INSERT INTO badges (user_id, badge_key, name, description, xp_reward)
    VALUES (NEW.user_id, 'receipt_explorer', '📸 Receipt Explorer', 'Upload 5 receipts', 25)
    ON CONFLICT (user_id, badge_key) DO NOTHING;
    
    IF FOUND THEN
      badge_awarded := true;
      new_badge_name := '📸 Receipt Explorer';
      badge_xp := 25;
    END IF;
  END IF;

  IF receipt_count = 10 THEN
    INSERT INTO badges (user_id, badge_key, name, description, xp_reward)
    VALUES (NEW.user_id, 'receipt_master', '🏆 Receipt Master', 'Upload 10 receipts', 50)
    ON CONFLICT (user_id, badge_key) DO NOTHING;
    
    IF FOUND THEN
      badge_awarded := true;
      new_badge_name := '🏆 Receipt Master';
      badge_xp := 50;
    END IF;
  END IF;

  -- Streak milestones
  IF current_streak = 7 THEN
    INSERT INTO badges (user_id, badge_key, name, description, xp_reward)
    VALUES (NEW.user_id, 'streak_7', '🔥 7-Day Streak', 'Upload for 7 consecutive days', 75)
    ON CONFLICT (user_id, badge_key) DO NOTHING;
    
    IF FOUND THEN
      badge_awarded := true;
      new_badge_name := '🔥 7-Day Streak';
      badge_xp := 75;
    END IF;
  END IF;

  -- Store email notification data if badge was awarded
  IF badge_awarded THEN
    INSERT INTO email_notifications_queue (
      user_id, 
      notification_type, 
      data
    ) VALUES (
      NEW.user_id,
      'badge_earned',
      json_build_object(
        'badge_name', new_badge_name,
        'xp_earned', badge_xp
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create email notifications queue table
CREATE TABLE IF NOT EXISTS email_notifications_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_type text NOT NULL,
  data jsonb NOT NULL,
  sent boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE email_notifications_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own email notifications"
  ON email_notifications_queue FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);