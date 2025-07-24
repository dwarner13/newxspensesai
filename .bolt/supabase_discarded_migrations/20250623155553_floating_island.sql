/*
  # Create helper functions for XP and gamification

  1. Functions
    - `add_user_xp` - Adds XP to a user and handles level progression
    - `increment` - Helper function for incrementing values
*/

-- Function to add XP to a user
CREATE OR REPLACE FUNCTION add_user_xp(user_uuid UUID, xp_amount INTEGER, activity_type TEXT DEFAULT 'general', activity_description TEXT DEFAULT NULL)
RETURNS VOID AS $$
DECLARE
  current_xp INTEGER;
  current_level INTEGER;
  xp_for_next_level INTEGER;
  new_level INTEGER;
BEGIN
  -- Get current XP and level
  SELECT xp, level INTO current_xp, current_level
  FROM profiles
  WHERE id = user_uuid;
  
  -- Calculate new XP
  current_xp := current_xp + xp_amount;
  
  -- Calculate XP needed for next level (100 XP per level with 10% increase)
  xp_for_next_level := (current_level * 100);
  
  -- Check if user leveled up
  new_level := 1 + FLOOR(current_xp / 100);
  
  -- Update profile
  UPDATE profiles
  SET 
    xp = current_xp,
    level = new_level,
    updated_at = now()
  WHERE id = user_uuid;
  
  -- Log XP activity
  INSERT INTO xp_activities (user_id, activity_type, xp_earned, description)
  VALUES (
    user_uuid,
    activity_type,
    xp_amount,
    COALESCE(activity_description, 'Earned ' || xp_amount || ' XP')
  );
  
  -- If leveled up, check for badges
  IF new_level > current_level THEN
    -- This will trigger the check_and_award_badges function via trigger
    NULL;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function for incrementing values
CREATE OR REPLACE FUNCTION increment(x INTEGER)
RETURNS INTEGER AS $$
BEGIN
  RETURN x + 1;
END;
$$ LANGUAGE plpgsql IMMUTABLE;