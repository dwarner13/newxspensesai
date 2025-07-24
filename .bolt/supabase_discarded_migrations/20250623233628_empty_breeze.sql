-- Drop the existing function first
DROP FUNCTION IF EXISTS add_user_xp(UUID, INTEGER);

-- Recreate the function with the correct return type
CREATE FUNCTION add_user_xp(user_id UUID, xp_amount INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  new_xp INTEGER;
BEGIN
  UPDATE profiles
  SET xp = xp + xp_amount
  WHERE id = user_id
  RETURNING xp INTO new_xp;

  RETURN new_xp;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION add_user_xp(UUID, INTEGER) TO authenticated;

-- Add comment to function
COMMENT ON FUNCTION add_user_xp(UUID, INTEGER) IS 'Adds XP to a user profile and returns the new total XP';