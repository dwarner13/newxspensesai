/*
  # Create email notifications queue table

  1. New Tables
    - `email_notifications_queue` - Queues email notifications for users
  
  2. Security
    - Enable RLS on `email_notifications_queue` table
    - Add policy for authenticated users to view their own notifications
*/

-- Create email notifications queue table
CREATE TABLE IF NOT EXISTS email_notifications_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  notification_type TEXT NOT NULL,
  data JSONB NOT NULL,
  sent BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE email_notifications_queue ENABLE ROW LEVEL SECURITY;

-- Create policy
CREATE POLICY "Users can view their own email notifications"
  ON email_notifications_queue
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);