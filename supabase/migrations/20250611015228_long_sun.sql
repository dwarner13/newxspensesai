/*
  # Enhance profiles table with additional fields

  1. New Fields
    - `role` - User role/plan (free, premium, admin)
    - `last_login_at` - Track last login time
    - `transaction_count` - Cache transaction count for performance
    - `total_uploaded` - Track total amount uploaded
    - `account_created_at` - Account creation timestamp

  2. Functions
    - Update transaction count trigger
    - Calculate user statistics
*/

-- Add new columns to profiles table
DO $$
BEGIN
  -- Add role column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'role'
  ) THEN
    ALTER TABLE profiles ADD COLUMN role text DEFAULT 'free' CHECK (role IN ('free', 'premium', 'admin'));
  END IF;

  -- Add last_login_at column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'last_login_at'
  ) THEN
    ALTER TABLE profiles ADD COLUMN last_login_at timestamptz;
  END IF;

  -- Add transaction_count column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'transaction_count'
  ) THEN
    ALTER TABLE profiles ADD COLUMN transaction_count integer DEFAULT 0;
  END IF;

  -- Add total_uploaded column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'total_uploaded'
  ) THEN
    ALTER TABLE profiles ADD COLUMN total_uploaded numeric DEFAULT 0;
  END IF;

  -- Add account_created_at column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'account_created_at'
  ) THEN
    ALTER TABLE profiles ADD COLUMN account_created_at timestamptz DEFAULT now();
  END IF;
END $$;

-- Function to update profile stats when transactions change
CREATE OR REPLACE FUNCTION update_profile_stats()
RETURNS trigger AS $$
BEGIN
  -- Update transaction count and total for the user
  UPDATE profiles 
  SET 
    transaction_count = (
      SELECT COUNT(*) 
      FROM transactions 
      WHERE user_id = COALESCE(NEW.user_id, OLD.user_id)
    ),
    total_uploaded = (
      SELECT COALESCE(SUM(amount), 0)
      FROM transactions 
      WHERE user_id = COALESCE(NEW.user_id, OLD.user_id) AND type = 'Credit'
    ),
    updated_at = now()
  WHERE id = COALESCE(NEW.user_id, OLD.user_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers for transaction stats updates
DROP TRIGGER IF EXISTS update_profile_stats_on_insert ON transactions;
CREATE TRIGGER update_profile_stats_on_insert
  AFTER INSERT ON transactions
  FOR EACH ROW EXECUTE FUNCTION update_profile_stats();

DROP TRIGGER IF EXISTS update_profile_stats_on_update ON transactions;
CREATE TRIGGER update_profile_stats_on_update
  AFTER UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION update_profile_stats();

DROP TRIGGER IF EXISTS update_profile_stats_on_delete ON transactions;
CREATE TRIGGER update_profile_stats_on_delete
  AFTER DELETE ON transactions
  FOR EACH ROW EXECUTE FUNCTION update_profile_stats();

-- Function to update last login time
CREATE OR REPLACE FUNCTION update_last_login()
RETURNS trigger AS $$
BEGIN
  UPDATE profiles 
  SET last_login_at = now()
  WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the existing handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, account_created_at, last_login_at)
  VALUES (
    new.id, 
    COALESCE(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    now(),
    now()
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;