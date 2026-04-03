-- Add source column to category_rules to track how rules were created
-- Values: 'tag_auto', 'user_chat', 'user_manual'
ALTER TABLE public.category_rules ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'tag_auto';
