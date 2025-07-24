-- Add Stripe-related columns to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS stripe_customer_id text,
ADD COLUMN IF NOT EXISTS subscription_id text,
ADD COLUMN IF NOT EXISTS subscription_status text,
ADD COLUMN IF NOT EXISTS current_period_end timestamptz;

-- Create index for Stripe customer lookups
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer_id 
ON profiles(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;

-- Create index for subscription status
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_status 
ON profiles(subscription_status) WHERE subscription_status IS NOT NULL;

-- Function to add XP to user
CREATE OR REPLACE FUNCTION add_user_xp(user_uuid uuid, xp_amount integer)
RETURNS void AS $$
DECLARE
  current_xp integer;
  current_level integer;
  new_xp integer;
  new_level integer;
BEGIN
  -- Get current XP and level
  SELECT xp, level INTO current_xp, current_level
  FROM profiles
  WHERE id = user_uuid;
  
  -- Calculate new XP
  new_xp := COALESCE(current_xp, 0) + xp_amount;
  
  -- Calculate new level (every 100 XP = 1 level)
  new_level := GREATEST(1, new_xp / 100);
  
  -- Update profile
  UPDATE profiles
  SET 
    xp = new_xp,
    level = new_level,
    updated_at = now()
  WHERE id = user_uuid;
  
  -- Log XP activity
  INSERT INTO xp_activities (user_id, activity_type, xp_earned, description)
  VALUES (
    user_uuid,
    'manual_award',
    xp_amount,
    format('Awarded %s XP', xp_amount)
  );
  
  -- Check for level up badge
  IF new_level > current_level THEN
    -- Award level up badge if it's a milestone
    IF new_level IN (5, 10, 15, 20, 25, 30) THEN
      INSERT INTO badges (user_id, badge_key, name, description, xp_reward)
      VALUES (
        user_uuid,
        format('level_%s', new_level),
        format('🎯 Level %s Achieved', new_level),
        format('Reach Level %s', new_level),
        new_level * 10
      )
      ON CONFLICT (user_id, badge_key) DO NOTHING;
    END IF;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to check user subscription status
CREATE OR REPLACE FUNCTION get_user_subscription_info(user_uuid uuid)
RETURNS TABLE (
  has_active_subscription boolean,
  subscription_type text,
  expires_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    CASE 
      WHEN p.subscription_status IN ('active', 'trialing') THEN true
      WHEN p.subscription_status = 'lifetime' THEN true
      WHEN p.role = 'admin' THEN true
      ELSE false
    END as has_active_subscription,
    COALESCE(p.subscription_status, p.role) as subscription_type,
    p.current_period_end as expires_at
  FROM profiles p
  WHERE p.id = user_uuid;
END;
$$ LANGUAGE plpgsql;