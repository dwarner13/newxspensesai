/*
  # Create receipts table and related functions

  1. New Tables
    - `receipts` - Stores receipt image data and extracted information
  
  2. Security
    - Enable RLS on `receipts` table
    - Add policy for authenticated users to manage their own receipts
  
  3. Functions
    - `handle_receipt_xp` - Awards XP for receipt scanning
*/

-- Create receipts table
CREATE TABLE IF NOT EXISTS receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  image_url TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  upload_date TIMESTAMPTZ DEFAULT now(),
  processing_status TEXT DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
  extracted_data JSONB,
  transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_receipts_user_id ON receipts(user_id);
CREATE INDEX IF NOT EXISTS idx_receipts_upload_date ON receipts(upload_date);
CREATE INDEX IF NOT EXISTS idx_receipts_status ON receipts(processing_status);

-- Enable RLS
ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;

-- Create policy
CREATE POLICY "Users can manage their own receipts"
  ON receipts
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id);

-- Function to award XP for receipt scanning
CREATE OR REPLACE FUNCTION handle_receipt_xp()
RETURNS TRIGGER AS $$
BEGIN
  -- Only award XP when receipt is marked as completed
  IF NEW.processing_status = 'completed' AND 
     (OLD.processing_status IS NULL OR OLD.processing_status != 'completed') THEN
    
    -- Award 20 XP for successful receipt scan
    UPDATE profiles
    SET xp = xp + 20
    WHERE id = NEW.user_id;
    
    -- Log XP activity
    INSERT INTO xp_activities (user_id, activity_type, xp_earned, description)
    VALUES (
      NEW.user_id,
      'receipt_scan',
      20,
      'Successfully scanned receipt'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for XP
CREATE TRIGGER receipt_xp_trigger
AFTER UPDATE ON receipts
FOR EACH ROW
EXECUTE FUNCTION handle_receipt_xp();

-- Create trigger for badge checking
CREATE TRIGGER check_badges_on_receipt
AFTER INSERT OR UPDATE ON receipts
FOR EACH ROW
EXECUTE FUNCTION check_and_award_badges();