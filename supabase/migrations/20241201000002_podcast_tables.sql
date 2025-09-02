-- Podcast Database Tables Migration
-- Add podcast_episodes and user_podcast_preferences tables

-- Create podcast_episodes table
CREATE TABLE IF NOT EXISTS podcast_episodes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    podcaster_id VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    script TEXT NOT NULL,
    audio_url TEXT,
    audio_duration INTEGER, -- Duration in seconds
    financial_data JSONB, -- Store the financial data used for this episode
    episode_number INTEGER NOT NULL,
    status VARCHAR(20) DEFAULT 'generated' CHECK (status IN ('generated', 'processing', 'completed', 'failed')),
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    listen_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_podcast_preferences table
CREATE TABLE IF NOT EXISTS user_podcast_preferences (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    preferred_podcasters JSONB DEFAULT '[]'::jsonb, -- Array of preferred podcaster IDs
    episode_frequency VARCHAR(20) DEFAULT 'weekly' CHECK (episode_frequency IN ('daily', 'weekly', 'monthly')),
    auto_generate BOOLEAN DEFAULT true,
    notification_enabled BOOLEAN DEFAULT true,
    voice_preferences JSONB DEFAULT '{}'::jsonb, -- Voice settings for each podcaster
    content_preferences JSONB DEFAULT '{}'::jsonb, -- Content type preferences
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_podcast_episodes_user_id ON podcast_episodes(user_id);
CREATE INDEX IF NOT EXISTS idx_podcast_episodes_podcaster_id ON podcast_episodes(podcaster_id);
CREATE INDEX IF NOT EXISTS idx_podcast_episodes_created_at ON podcast_episodes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_podcast_episodes_status ON podcast_episodes(status);
CREATE INDEX IF NOT EXISTS idx_user_podcast_preferences_user_id ON user_podcast_preferences(user_id);

-- Create updated_at trigger for podcast_episodes
CREATE OR REPLACE FUNCTION update_podcast_episodes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_podcast_episodes_updated_at
    BEFORE UPDATE ON podcast_episodes
    FOR EACH ROW
    EXECUTE FUNCTION update_podcast_episodes_updated_at();

-- Create updated_at trigger for user_podcast_preferences
CREATE OR REPLACE FUNCTION update_user_podcast_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_user_podcast_preferences_updated_at
    BEFORE UPDATE ON user_podcast_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_user_podcast_preferences_updated_at();

-- Insert default podcast preferences for existing users
INSERT INTO user_podcast_preferences (user_id, preferred_podcasters, episode_frequency, auto_generate, notification_enabled)
SELECT 
    id,
    '["spark", "wisdom", "serenity-podcast"]'::jsonb,
    'weekly',
    true,
    true
FROM users
WHERE id NOT IN (SELECT user_id FROM user_podcast_preferences);

-- Add RLS (Row Level Security) policies
ALTER TABLE podcast_episodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_podcast_preferences ENABLE ROW LEVEL SECURITY;

-- Policy for podcast_episodes: Users can only access their own episodes
CREATE POLICY "Users can view their own podcast episodes" ON podcast_episodes
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own podcast episodes" ON podcast_episodes
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own podcast episodes" ON podcast_episodes
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own podcast episodes" ON podcast_episodes
    FOR DELETE USING (auth.uid() = user_id);

-- Policy for user_podcast_preferences: Users can only access their own preferences
CREATE POLICY "Users can view their own podcast preferences" ON user_podcast_preferences
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own podcast preferences" ON user_podcast_preferences
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own podcast preferences" ON user_podcast_preferences
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own podcast preferences" ON user_podcast_preferences
    FOR DELETE USING (auth.uid() = user_id);

-- Add comments for documentation
COMMENT ON TABLE podcast_episodes IS 'Stores generated podcast episodes for each user with AI podcaster personalities';
COMMENT ON TABLE user_podcast_preferences IS 'Stores user preferences for podcast generation and personalization';

COMMENT ON COLUMN podcast_episodes.podcaster_id IS 'References the AI podcaster personality (e.g., spark, wisdom, serenity-podcast)';
COMMENT ON COLUMN podcast_episodes.financial_data IS 'JSON data containing the financial information used to generate this episode';
COMMENT ON COLUMN podcast_episodes.episode_number IS 'Sequential episode number for this user and podcaster combination';
COMMENT ON COLUMN podcast_episodes.audio_duration IS 'Duration of the generated audio in seconds';
COMMENT ON COLUMN user_podcast_preferences.preferred_podcasters IS 'Array of podcaster IDs that the user prefers';
COMMENT ON COLUMN user_podcast_preferences.voice_preferences IS 'Voice settings and preferences for each podcaster';
COMMENT ON COLUMN user_podcast_preferences.content_preferences IS 'Content type and style preferences for episodes';
