/*
  # Fix add_user_xp function

  1. Changes
    - Drop existing add_user_xp function
    - Recreate add_user_xp function with correct return type (void)
    - Ensure function updates user XP correctly
*/

-- Drop the existing function
DROP FUNCTION IF EXISTS add_user_xp(uuid, integer);

-- Recreate the function with correct return type
CREATE OR REPLACE FUNCTION add_user_xp(user_uuid uuid, xp_amount integer, activity_type text DEFAULT 'general', activity_description text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  current_xp integer;
  current_level integer;
  xp_for_next_level integer;
  new_level integer;
BEGIN
  -- Get current XP and level
  SELECT xp, level INTO current_xp, current_level
  FROM profiles
  WHERE id = user_uuid;
  
  -- Update XP
  UPDATE profiles
  SET xp = xp + xp_amount
  WHERE id = user_uuid;
  
  -- Calculate XP needed for next level (simple formula: level * 100)
  xp_for_next_level := current_level * 100;
  
  -- Check if user leveled up
  IF (current_xp + xp_amount) >= xp_for_next_level THEN
    -- Calculate new level
    new_level := current_level + 1;
    
    -- Update level
    UPDATE profiles
    SET level = new_level
    WHERE id = user_uuid;
  END IF;
  
  -- Log XP activity
  INSERT INTO xp_activities (
    user_id,
    activity_type,
    xp_earned,
    description
  ) VALUES (
    user_uuid,
    activity_type,
    xp_amount,
    COALESCE(activity_description, 'Earned ' || xp_amount || ' XP from ' || activity_type)
  );
END;
$$;