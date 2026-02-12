-- 001_create_notifications.sql
-- Notification system for XspensesAI employee-driven alerts
-- Path 2: Production-grade notifications with employee tagging, priority grouping, Prime orchestration

-- ============================================================================
-- 1) ENUM FOR PRIORITY
-- ============================================================================
DO $$ BEGIN
  CREATE TYPE notification_priority AS ENUM ('critical','action','info','success');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================================
-- 2) MAIN NOTIFICATIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      text NOT NULL,                               -- matches auth.users.id (text UUID)
  employee_slug text NOT NULL,                              -- 'byte-docs' | 'crystal-analytics' | 'tag-ai' | 'prime-boss' | 'ledger-tax' | 'goalie-agent'
  priority     notification_priority NOT NULL DEFAULT 'info',
  title        text NOT NULL,
  description  text,
  href         text,                                        -- deep link (/transactions?importId=xyz)
  payload      jsonb,                                       -- optional context for Prime orchestration
  read         boolean NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.notifications IS 'In-app notifications from AI employees (Byte, Crystal, Tag, Prime, etc) with priority grouping and Prime orchestration support';
COMMENT ON COLUMN public.notifications.employee_slug IS 'Which AI employee sent this notification';
COMMENT ON COLUMN public.notifications.priority IS 'Display priority: critical=red, action=yellow, info=blue, success=green';
COMMENT ON COLUMN public.notifications.href IS 'Optional deep-link for navigation on click';
COMMENT ON COLUMN public.notifications.payload IS 'Structured data for Prime to use when orchestrating batch actions';

-- ============================================================================
-- 3) INDEXES FOR PERFORMANCE
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_notifications_user_created
  ON public.notifications (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_unread
  ON public.notifications (user_id, read) WHERE read = false;

CREATE INDEX IF NOT EXISTS idx_notifications_employee_priority
  ON public.notifications (user_id, employee_slug, priority);

-- ============================================================================
-- 4) ROW LEVEL SECURITY
-- ============================================================================
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users select only their own notifications
CREATE POLICY notifications_select_own
  ON public.notifications
  FOR SELECT
  USING (user_id = (auth.uid())::text);

-- Users insert their own notifications (rare but possible for UI-triggered)
CREATE POLICY notifications_insert_own
  ON public.notifications
  FOR INSERT
  WITH CHECK (user_id = (auth.uid())::text);

-- Users update their own notifications (mark read)
CREATE POLICY notifications_update_own
  ON public.notifications
  FOR UPDATE
  USING (user_id = (auth.uid())::text)
  WITH CHECK (user_id = (auth.uid())::text);

-- ============================================================================
-- 5) HELPER FUNCTIONS
-- ============================================================================

-- Mark all unread notifications as read for a user
CREATE OR REPLACE FUNCTION public.mark_all_notifications_read(p_user_id text)
RETURNS int
LANGUAGE plpgsql
AS $$
DECLARE
  v_count int;
BEGIN
  UPDATE public.notifications
  SET read = true, updated_at = now()
  WHERE user_id = p_user_id AND read = false;
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END $$;

COMMENT ON FUNCTION public.mark_all_notifications_read(text) IS 'Marks all unread notifications as read and returns count of updated rows';

-- Mark single notification as read
CREATE OR REPLACE FUNCTION public.mark_notification_read(p_id uuid)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  v_affected int;
BEGIN
  UPDATE public.notifications
  SET read = true, updated_at = now()
  WHERE id = p_id;
  
  GET DIAGNOSTICS v_affected = ROW_COUNT;
  RETURN v_affected > 0;
END $$;

COMMENT ON FUNCTION public.mark_notification_read(uuid) IS 'Marks a single notification as read and returns true if found';

-- Get unread count for a user
CREATE OR REPLACE FUNCTION public.get_unread_notification_count(p_user_id text)
RETURNS int
LANGUAGE sql
STABLE
AS $$
  SELECT COUNT(*)::int
  FROM public.notifications
  WHERE user_id = p_user_id AND read = false;
$$;

COMMENT ON FUNCTION public.get_unread_notification_count(text) IS 'Returns count of unread notifications for a user';

-- ============================================================================
-- 6) OPTIONAL: AUDIT TABLE FOR NOTIFICATION ACTIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.notification_actions (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id uuid NOT NULL REFERENCES public.notifications(id) ON DELETE SET NULL,
  user_id        text NOT NULL,
  action_type    text NOT NULL, -- 'marked_read' | 'navigated' | 'shared' | 'orchestrated_to_prime'
  action_data    jsonb,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notification_actions_notif
  ON public.notification_actions(notification_id);

COMMENT ON TABLE public.notification_actions IS 'Audit trail for user interactions with notifications';






