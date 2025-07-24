/*
  # Fix add_user_xp Function

  1. Changes
    - Drop existing add_user_xp function
    - Create new add_user_xp function with proper implementation
    - Add activity logging to track XP changes
    - Grant execute permission to authenticated users

  2. Security
    - Use SECURITY DEFINER to ensure proper permissions
*/

-- Drop the existing function first
DROP FUNCTION IF EXISTS add_user_xp(UUID, INTEGER);
DROP FUNCTION IF EXISTS add_user_xp(UUID, INTEGER, TEXT, TEXT);

-- Create the new function with activity tracking
CREATE OR REPLACE FUNCTION add_user_xp(
  user_uuid UUID, 
  xp_amount INTEGER, 
  activity_type TEXT DEFAULT 'general', 
  activity_description TEXT DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_xp INTEGER;
  current_level INTEGER;
  new_level INTEGER;
BEGIN
  -- Get current XP and level
  SELECT xp, level INTO new_xp, current_level 
  FROM profiles 
  WHERE id = user_uuid;
  
  -- Default to 0 if null
  new_xp := COALESCE(new_xp, 0);
  current_level := COALESCE(current_level, 1);
  
  -- Add XP
  new_xp := new_xp + xp_amount;
  
  -- Calculate new level (simple formula: level = floor(xp/100) + 1)
  new_level := FLOOR(new_xp / 100) + 1;
  
  -- Update profile with new XP and level if changed
  UPDATE profiles 
  SET 
    xp = new_xp,
    level = new_level,
    updated_at = NOW()
  WHERE id = user_uuid;
  
  -- Log XP activity if xp_activities table exists
  BEGIN
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
  EXCEPTION WHEN OTHERS THEN
    -- Silently continue if table doesn't exist or insert fails
    NULL;
  END;
  
  RETURN new_xp;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION add_user_xp(UUID, INTEGER, TEXT, TEXT) TO authenticated;

-- Add comment to function
COMMENT ON FUNCTION add_user_xp(UUID, INTEGER, TEXT, TEXT) IS 'Adds XP to a user profile, updates level if needed, logs activity, and returns the new total XP';