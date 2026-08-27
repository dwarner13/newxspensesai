-- Server-enforced AI tool confirmation gate
-- Stores pending confirmations so that gated tools (requiresConfirm/mutates/costly)
-- cannot execute without explicit, authenticated, non-replayable user approval.
-- All access is through service-role backend (admin()); no user-facing RLS policies needed.

CREATE TABLE IF NOT EXISTS public.tool_confirmation_requests (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id    text NOT NULL,
  tool_name     text NOT NULL,
  args_hash     text NOT NULL,
  args_snapshot  jsonb NOT NULL,
  status        text NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'consumed', 'expired', 'cancelled')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  expires_at    timestamptz NOT NULL,
  consumed_at   timestamptz
);

ALTER TABLE public.tool_confirmation_requests ENABLE ROW LEVEL SECURITY;

-- No permissive policies: only service-role (admin()) can access.
-- If a future authenticated-client path is added, add a restrictive policy then.

CREATE INDEX IF NOT EXISTS idx_tcr_user_session
  ON public.tool_confirmation_requests(user_id, session_id);

CREATE INDEX IF NOT EXISTS idx_tcr_pending_expires
  ON public.tool_confirmation_requests(status, expires_at)
  WHERE status = 'pending';

-- Atomic consume-once RPC.
-- Returns the row on success (id, args_snapshot), NULL set on any mismatch.
-- The single UPDATE with all binding checks guarantees exactly-once execution
-- even under concurrent requests from separate Netlify function instances.
CREATE OR REPLACE FUNCTION public.consume_tool_confirmation(
  p_confirmation_id uuid,
  p_user_id         uuid,
  p_session_id      text,
  p_tool_name       text,
  p_args_hash       text
)
RETURNS TABLE(id uuid, args_snapshot jsonb)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  UPDATE public.tool_confirmation_requests AS tcr
  SET    status      = 'consumed',
         consumed_at = now()
  WHERE  tcr.id          = p_confirmation_id
    AND  tcr.user_id     = p_user_id
    AND  tcr.session_id  = p_session_id
    AND  tcr.tool_name   = p_tool_name
    AND  tcr.args_hash   = p_args_hash
    AND  tcr.status      = 'pending'
    AND  tcr.expires_at  > now()
  RETURNING tcr.id, tcr.args_snapshot;
END;
$$;

COMMENT ON TABLE public.tool_confirmation_requests IS
  'Server-enforced confirmation gate for AI tool execution. Bound to user+session+tool+args, expires, consumed exactly once.';

COMMENT ON FUNCTION public.consume_tool_confirmation IS
  'Atomically consume a pending tool confirmation. Returns row on success, empty set on any mismatch (wrong user, expired, already consumed, wrong args).';
