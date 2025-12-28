# Wiring Index

**Purpose:** Navigation and reference guide for backend wiring across XspensesAI employees and tools.

---

## Byte (byte-docs) — OCR/Document Retrieval

### Configuration

**Supabase Table:** `public.employee_profiles`
- **Columns:**
  - `system_prompt` (text) - Byte's instructions for using document tools
  - `tools_allowed` (text[]) - Array of tool IDs Byte can use

**Required Tools:**
- `get_recent_documents` - List most recent uploaded documents
- `get_document_by_id` - Fetch document record with OCR text and parse status
- `get_transactions_by_document` - Fetch extracted transactions linked to a document

### Step 4 Audit Objects

**Table:** `public.employee_runtime_audit`
- Stores tool execution events and chat message metadata for runtime analysis

**View:** `public.v_byte_docs_runtime_audit`
- Aggregated view of Byte's tool usage patterns
- Filters `employee_runtime_audit` for `employee_slug = 'byte-docs'`
- Includes tool call counts, success rates, and common patterns

**Trigger:** `audit_byte_document_tool_usage_on_chat_messages`
- Automatically logs tool usage when Byte calls document tools
- Fires on INSERT to `chat_messages` table when `employee_slug = 'byte-docs'`

**Function:** `public.log_employee_runtime_audit`
- Helper function to manually log audit events
- Used by trigger and can be called directly for testing

### Code Locations

**Tool Implementations:**

1. **`src/agent/tools/impl/get_recent_documents.ts`**
   - Lists last N documents for user (metadata only, no OCR text)
   - Returns: `{ documents: [...], total: number }`
   - RLS-safe: filters by `user_id`

2. **`src/agent/tools/impl/get_document_by_id.ts`**
   - Fetches specific document with OCR text (already redacted by guardrails)
   - Returns: `{ document: { id, original_name, ocr_text, status, ... } }`
   - RLS-safe: filters by `user_id`

3. **`src/agent/tools/impl/get_transactions_by_document.ts`**
   - Fetches transactions linked to a document via `document_id` or `import_id`
   - Returns: `{ transactions: [...], total: number, summary: {...} }`
   - RLS-safe: filters by `user_id`

**Chat Backend Entrypoint:**

- **`netlify/functions/chat.ts`**
  - Routes requests to Byte employee
  - Loads Byte's `tools_allowed` from `employee_profiles` table
  - Executes tools via `pickTools()` and `executeTool()`
  - Persists messages and tool calls to `chat_messages` table (used by audit trigger)

### Quick Debug

**Query Byte's Tool Usage:**
```sql
SELECT 
  tool_id,
  COUNT(*) as call_count,
  COUNT(DISTINCT user_id) as unique_users,
  AVG(execution_time_ms) as avg_execution_time
FROM public.v_byte_docs_runtime_audit
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY tool_id
ORDER BY call_count DESC;
```

**Detect Missing Tool Usage:**
```sql
-- Find Byte conversations where document tools should have been used but weren't
SELECT 
  cm.id,
  cm.content,
  cm.created_at,
  cm.employee_slug
FROM chat_messages cm
WHERE cm.employee_slug = 'byte-docs'
  AND cm.role = 'user'
  AND (
    cm.content ILIKE '%latest upload%'
    OR cm.content ILIKE '%recent document%'
    OR cm.content ILIKE '%my document%'
    OR cm.content ILIKE '%what''s in%'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM chat_messages cm2
    WHERE cm2.session_id = cm.session_id
      AND cm2.role = 'assistant'
      AND cm2.created_at > cm.created_at
      AND cm2.tool_calls IS NOT NULL
      AND (
        cm2.tool_calls::text ILIKE '%get_recent_documents%'
        OR cm2.tool_calls::text ILIKE '%get_document_by_id%'
      )
  )
ORDER BY cm.created_at DESC
LIMIT 20;
```

---

## Other Employees

*(Add other employee sections here as needed)*





