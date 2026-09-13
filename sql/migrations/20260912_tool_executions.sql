-- Tool execution audit log
-- Records every tool invocation for monitoring, debugging, and usage analysis.
-- Written by service-role backend (logToolExecution in src/agent/tools/logToolExecution.ts).
-- Non-blocking: logging failures never prevent actual tool execution.
-- Sensitive tool arguments are redacted/summarized before insertion (generateInputSummary).

CREATE TABLE IF NOT EXISTS public.tool_executions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  employee_slug   text NOT NULL,
  tool_id         text NOT NULL,
  mode            text NOT NULL CHECK (mode IN ('explain-only', 'propose-confirm', 'auto-pilot')),
  autonomy_level  integer NOT NULL DEFAULT 1 CHECK (autonomy_level BETWEEN 0 AND 3),
  input_summary   text,           -- truncated/redacted summary of tool input (max ~500 chars)
  affected_count  integer,        -- number of records affected, if applicable
  status          text NOT NULL CHECK (status IN ('success', 'error', 'skipped', 'cancelled')),
  error_message   text,           -- error description when status='error'
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- RLS: service-role only (same pattern as tool_confirmation_requests)
ALTER TABLE public.tool_executions ENABLE ROW LEVEL SECURITY;

-- No permissive policies: only service-role (admin()) can write.
-- If a future authenticated-client read path is needed, add a restrictive policy then.

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_tool_exec_user_created
  ON public.tool_executions(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_tool_exec_tool_status
  ON public.tool_executions(tool_id, status);
