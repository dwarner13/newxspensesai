/*
  # Fix add_user_xp function

  1. Changes
    - Drops existing add_user_xp function
    - Creates improved version that:
      - Updates user XP
      - Calculates new level based on XP
      - Logs XP activity
      - Returns previous and new values
  
  2. Security
    - Uses SECURITY DEFINER to ensure proper permissions
*/

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS add_user_xp(uuid, integer);

-- Create new improved function
CREATE OR REPLACE FUNCTION add_user_xp(user_uuid UUID, xp_amount INTEGER)
RETURNS JSON AS $$
DECLARE
  current_xp INTEGER;
  current_level INTEGER;
  new_level INTEGER;
  result JSON;
BEGIN
  -- Get current XP and level
  SELECT xp, level INTO current_xp, current_level
  FROM profiles
  WHERE id = user_uuid;
  
  -- Calculate new level (1 level per 100 XP)
  new_level := GREATEST(1, FLOOR((current_xp + xp_amount) / 100) + 1);
  
  -- Update profile with new XP and level
  UPDATE profiles
  SET 
    xp = xp + xp_amount,
    level = new_level,
    updated_at = NOW()
  WHERE id = user_uuid;
  
  -- Log XP activity
  INSERT INTO xp_activities (
    user_id,
    activity_type,
    xp_earned,
    description
  ) VALUES (
    user_uuid,
    'xp_update',
    xp_amount,
    'XP added via add_user_xp function'
  );
  
  -- Return result with previous and new values
  SELECT json_build_object(
    'previous_xp', current_xp,
    'new_xp', current_xp + xp_amount,
    'previous_level', current_level,
    'new_level', new_level,
    'xp_added', xp_amount
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION add_user_xp(UUID, INTEGER) TO authenticated;

-- Add comment to function
COMMENT ON FUNCTION add_user_xp(UUID, INTEGER) IS 'Adds XP to a user, updates their level, and logs the activity';