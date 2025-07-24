-- Drop the existing function first
DROP FUNCTION IF EXISTS update_user_streak(UUID);

-- Recreate the function with the correct implementation
CREATE FUNCTION update_user_streak(user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  current_streak INTEGER := 1;
  last_date DATE;
  today_date DATE := CURRENT_DATE;
BEGIN
  -- Get the user's last activity date
  SELECT last_activity_date INTO last_date FROM profiles WHERE id = user_id;

  -- Calculate new streak based on last activity
  IF last_date IS NULL THEN
    -- First activity ever
    new_streak := 1;
  ELSIF last_date = today_date THEN
    -- Already logged in today, keep current streak
    SELECT streak INTO current_streak FROM profiles WHERE id = user_id;
    new_streak := current_streak;
  ELSIF last_date = today_date - 1 THEN
    -- Consecutive day, increment streak
    SELECT streak INTO current_streak FROM profiles WHERE id = user_id;
    new_streak := current_streak + 1;
  ELSE
    -- Streak broken, reset to 1
    new_streak := 1;
  END IF;

  -- Update profile with new streak and activity date
  UPDATE profiles SET
    streak = new_streak,
    last_activity_date = today_date
  WHERE id = user_id;

  RETURN new_streak;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION update_user_streak(UUID) TO authenticated;

-- Add comment to function
COMMENT ON FUNCTION update_user_streak(UUID) IS 'Updates a user streak based on last activity date and returns the new streak count';