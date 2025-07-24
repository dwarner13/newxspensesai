/*
  # Fix add_user_xp function

  1. Changes
    - Drop existing add_user_xp function
    - Create a simpler version that properly updates user XP
    - Return JSON with previous and new values
*/

-- Drop the existing function
DROP FUNCTION IF EXISTS add_user_xp(uuid, integer);

-- Create a simpler version
CREATE OR REPLACE FUNCTION add_user_xp(user_uuid uuid, xp_amount integer)
RETURNS jsonb AS $$
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
  new_level := GREATEST(1, FLOOR(new_xp / 100) + 1);
  
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
  
  -- Return the result
  RETURN jsonb_build_object(
    'previous_xp', current_xp,
    'new_xp', new_xp,
    'previous_level', current_level,
    'new_level', new_level,
    'leveled_up', new_level > current_level
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;