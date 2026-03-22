-- Score history table for Xspense Score
-- Run in Supabase SQL editor

CREATE TABLE IF NOT EXISTS score_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  score INTEGER NOT NULL,
  pillar_scores JSONB,
  calculated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE score_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own score history" ON score_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own scores" ON score_history FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_score_history_user_date ON score_history (user_id, calculated_at DESC);
