-- Prime user onboarding state
-- Tracks intro modal completion, step progress, and user preferences per user
-- Created: 2025-10-20
-- Purpose: Store Prime Boss first-sign-in intro state + preferences

CREATE TABLE IF NOT EXISTS public.prime_user_state (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         text NOT NULL UNIQUE,
  has_seen_intro  boolean NOT NULL DEFAULT false,
  intro_step      int NOT NULL DEFAULT 0,                     -- 0=welcome, 1=employees, 2=complete
  intro_completed_at timestamptz,
  preferences     jsonb NOT NULL DEFAULT '{"theme":"dark"}'::jsonb,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.prime_user_state IS 'Tracks Prime Boss intro state and user preferences';
COMMENT ON COLUMN public.prime_user_state.user_id IS 'Supabase auth.users.id (text UUID)';
COMMENT ON COLUMN public.prime_user_state.has_seen_intro IS 'Flag: true if user completed intro modal';
COMMENT ON COLUMN public.prime_user_state.intro_step IS 'Current intro step: 0=welcome, 1=team, 2=complete';
COMMENT ON COLUMN public.prime_user_state.preferences IS 'User preferences: {theme, notifications, etc}';

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.prime_user_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY prime_state_select_own
  ON public.prime_user_state FOR SELECT
  USING (user_id = (auth.uid())::text);

CREATE POLICY prime_state_update_own
  ON public.prime_user_state FOR UPDATE
  USING (user_id = (auth.uid())::text)
  WITH CHECK (user_id = (auth.uid())::text);

-- Service role can insert/update for onboarding
CREATE POLICY prime_state_service_all
  ON public.prime_user_state FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_prime_state_user_id
  ON public.prime_user_state (user_id);

CREATE INDEX IF NOT EXISTS idx_prime_state_has_seen_intro
  ON public.prime_user_state (has_seen_intro, created_at DESC);

-- ============================================================================
-- HELPER FUNCTION: Get or Create Prime State
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_or_create_prime_state(p_user_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_state jsonb;
BEGIN
  -- Try to select existing state
  SELECT jsonb_build_object(
    'has_seen_intro', has_seen_intro,
    'intro_step', intro_step,
    'preferences', preferences
  ) INTO v_state
  FROM public.prime_user_state
  WHERE user_id = p_user_id;

  -- If not found, create with defaults and return
  IF v_state IS NULL THEN
    INSERT INTO public.prime_user_state (user_id)
    VALUES (p_user_id)
    ON CONFLICT (user_id) DO NOTHING;

    SELECT jsonb_build_object(
      'has_seen_intro', false,
      'intro_step', 0,
      'preferences', '{"theme":"dark"}'::jsonb
    ) INTO v_state;
  END IF;

  RETURN v_state;
END $$;

COMMENT ON FUNCTION public.get_or_create_prime_state(text) IS 'Fetch or create prime_user_state with defaults; returns jsonb {has_seen_intro, intro_step, preferences}';

-- ============================================================================
-- HELPER FUNCTION: Mark Intro Complete
-- ============================================================================

CREATE OR REPLACE FUNCTION public.mark_prime_intro_complete(p_user_id text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_affected int;
BEGIN
  UPDATE public.prime_user_state
  SET has_seen_intro = true, intro_step = 2, intro_completed_at = now(), updated_at = now()
  WHERE user_id = p_user_id;

  GET DIAGNOSTICS v_affected = ROW_COUNT;
  RETURN v_affected > 0;
END $$;

COMMENT ON FUNCTION public.mark_prime_intro_complete(text) IS 'Mark intro as completed for user; returns true if updated';

-- ============================================================================
-- TRIGGER: Auto-update updated_at on changes
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_prime_state_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS prime_state_update_timestamp ON public.prime_user_state;

CREATE TRIGGER prime_state_update_timestamp
  BEFORE UPDATE ON public.prime_user_state
  FOR EACH ROW
  EXECUTE FUNCTION public.update_prime_state_timestamp();

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Verify table created
SELECT 'prime_user_state table created successfully' as status;

-- Verify RLS enabled
SELECT schemaname, tablename, rowsecurity FROM pg_tables 
WHERE tablename = 'prime_user_state' AND schemaname = 'public';





