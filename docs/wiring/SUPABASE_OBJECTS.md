# Supabase Objects Reference

**Purpose:** Complete reference of Supabase database objects (tables, views, triggers, functions) used across XspensesAI.

---

## Byte Runtime Audit (Step 4)

### Table: `public.employee_runtime_audit`

**Purpose:** Stores tool execution events and chat message metadata for runtime analysis.

**Columns:**
- `id` (uuid, primary key)
- `employee_slug` (text) - Employee identifier (e.g., 'byte-docs')
- `user_id` (uuid) - User who triggered the tool
- `tool_id` (text) - Tool identifier (e.g., 'get_recent_documents')
- `session_id` (uuid) - Chat session ID
- `message_id` (uuid) - Related chat message ID
- `execution_time_ms` (integer) - Tool execution time in milliseconds
- `status` (text) - 'success' | 'error'
- `error_message` (text, nullable) - Error details if status = 'error'
- `input_summary` (jsonb) - Sanitized tool input (no PII)
- `output_summary` (jsonb) - Sanitized tool output (no PII)
- `created_at` (timestamp) - Event timestamp

**Indexes:**
- `idx_employee_runtime_audit_employee_slug` on `employee_slug`
- `idx_employee_runtime_audit_created_at` on `created_at`
- `idx_employee_runtime_audit_tool_id` on `tool_id`

---

### View: `public.v_byte_docs_runtime_audit`

**Purpose:** Aggregated view of Byte's tool usage patterns for quick analysis.

**Definition:**
```sql
CREATE OR REPLACE VIEW public.v_byte_docs_runtime_audit AS
SELECT 
  tool_id,
  COUNT(*) as call_count,
  COUNT(DISTINCT user_id) as unique_users,
  COUNT(DISTINCT session_id) as unique_sessions,
  AVG(execution_time_ms) as avg_execution_time_ms,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY execution_time_ms) as median_execution_time_ms,
  COUNT(*) FILTER (WHERE status = 'success') as success_count,
  COUNT(*) FILTER (WHERE status = 'error') as error_count,
  MIN(created_at) as first_seen,
  MAX(created_at) as last_seen
FROM public.employee_runtime_audit
WHERE employee_slug = 'byte-docs'
GROUP BY tool_id;
```

**Usage:**
- Query tool usage statistics for Byte
- Identify frequently used tools
- Detect performance issues (high execution times)
- Monitor error rates

---

### Trigger: `audit_byte_document_tool_usage_on_chat_messages`

**Purpose:** Automatically logs tool usage when Byte calls document tools.

**Table:** `public.chat_messages`
**Event:** INSERT
**Condition:** `NEW.employee_slug = 'byte-docs' AND NEW.tool_calls IS NOT NULL`

**Function:** Calls `public.log_employee_runtime_audit()` for each tool call in `tool_calls` JSONB array.

**Logic:**
1. Extract `tool_calls` from inserted `chat_messages` row
2. For each tool call:
   - Extract `tool_id`, `input`, `output`
   - Call `log_employee_runtime_audit()` with sanitized data
   - Log execution time if available

**Note:** Trigger runs asynchronously (non-blocking) to avoid impacting chat performance.

---

### Function: `public.log_employee_runtime_audit`

**Purpose:** Helper function to manually log audit events.

**Signature:**
```sql
CREATE OR REPLACE FUNCTION public.log_employee_runtime_audit(
  p_employee_slug text,
  p_user_id uuid,
  p_tool_id text,
  p_session_id uuid,
  p_message_id uuid,
  p_execution_time_ms integer DEFAULT NULL,
  p_status text DEFAULT 'success',
  p_error_message text DEFAULT NULL,
  p_input_summary jsonb DEFAULT NULL,
  p_output_summary jsonb DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
```

**Returns:** UUID of inserted audit record

**Usage:**
- Called by trigger `audit_byte_document_tool_usage_on_chat_messages`
- Can be called directly for testing or manual logging
- Sanitizes input/output to remove PII before storage

**Example:**
```sql
SELECT public.log_employee_runtime_audit(
  'byte-docs',
  'user-uuid-here',
  'get_recent_documents',
  'session-uuid-here',
  'message-uuid-here',
  150, -- execution_time_ms
  'success',
  NULL, -- error_message
  '{"limit": 5}'::jsonb, -- input_summary
  '{"total": 3}'::jsonb -- output_summary
);
```

---

## Other Supabase Objects

*(Add other object sections here as needed)*





