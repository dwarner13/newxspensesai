# Chat System Architecture Overview

**Last Updated:** December 2024  
**Purpose:** Master reference for understanding and extending the XspensesAI chat system

---

## Table of Contents

1. [High-Level Architecture](#high-level-architecture)
2. [Backend Chat Flow](#backend-chat-flow)
3. [Guardrails & PII Protection](#guardrails--pii-protection)
4. [Memory & Employee System](#memory--employee-system)
5. [Frontend Chat Surfaces](#frontend-chat-surfaces)
6. [Supabase Schema Summary](#supabase-schema-summary)
7. [Known Issues / TODOs](#known-issues--todos)
8. [How to Reuse for New Workspaces](#how-to-reuse-for-new-workspaces)
9. [Quick Reference Checklist](#quick-reference-checklist)

---

## High-Level Architecture

### System Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│ FRONTEND LAYER                                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────┐      ┌──────────────────┐              │
│  │ Global Popup Chat │      │ Workspace Chat   │              │
│  │ (UnifiedAssistant│      │ (AIWorkspaceOver │              │
│  │  Chat.tsx)       │      │  lay.tsx)        │              │
│  └────────┬─────────┘      └────────┬─────────┘              │
│           │                         │                          │
│           └──────────┬──────────────┘                          │
│                      │                                         │
│           ┌──────────▼──────────┐                              │
│           │  usePrimeChat Hook  │                              │
│           │  (usePrimeChat.ts)  │                              │
│           └──────────┬──────────┘                              │
│                      │                                         │
└──────────────────────┼─────────────────────────────────────────┘
                       │ HTTP POST
                       │ { userId, message, employeeSlug, sessionId }
                       │
┌──────────────────────▼─────────────────────────────────────────┐
│ BACKEND LAYER (Netlify Functions)                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  /.netlify/functions/chat                                │  │
│  │  (netlify/functions/chat.ts)                            │  │
│  │                                                           │  │
│  │  1. Rate Limiting (optional)                             │  │
│  │  2. Guardrails + PII Masking                             │  │
│  │     └─> guardrails-unified.ts                           │  │
│  │     └─> pii.ts (maskPII)                                 │  │
│  │  3. Employee Routing                                     │  │
│  │     └─> router.ts (routeToEmployee)                      │  │
│  │  4. Session Management                                   │  │
│  │     └─> session.ts (ensureSession, getRecentMessages)   │  │
│  │  5. Memory Retrieval                                     │  │
│  │     └─> memory.ts (getMemory)                           │  │
│  │  6. Load Employee Profile + Tools                        │  │
│  │     └─> employee_profiles table                         │  │
│  │  7. Build Model Messages                                 │  │
│  │  8. Call OpenAI (Streaming SSE)                         │  │
│  │  9. Handle Tool Calls (if any)                          │  │
│  │  10. Save Messages to DB                                │  │
│  │  11. Queue Memory Extraction (async)                    │  │
│  │                                                           │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
└──────────────────────┬─────────────────────────────────────────┘
                       │
                       │ SSE Stream (data: { type, token, ... })
                       │
┌──────────────────────▼─────────────────────────────────────────┐
│ SUPABASE DATABASE                                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  • chat_sessions (session management)                          │
│  • chat_messages (conversation history)                        │
│  • chat_session_summaries (conversation summaries)            │
│  • user_memory_facts (long-term memory)                        │
│  • memory_embeddings (vector search)                           │
│  • employee_profiles (employee configs)                        │
│  • guardrail_events (audit trail)                             │
│  • handoffs (employee handoff tracking)                        │
│  • rate_limits (rate limiting state)                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Key Components

- **Frontend:** React components (`UnifiedAssistantChat`, `AIWorkspaceOverlay`, `EmployeeChatWorkspace`) + hooks (`usePrimeChat`)
- **Backend:** Single Netlify Function (`chat.ts`) handling all chat logic
- **Guardrails:** Unified guardrails API (`guardrails-unified.ts`) with PII masking (`pii.ts`)
- **Memory:** Unified memory API (`memory.ts`) for facts, summaries, and RAG
- **Employee System:** Database-driven (`employee_profiles` table) + registry (`src/employees/registry.ts`)
- **Storage:** Supabase PostgreSQL with RLS policies

### Employee Routing

All employees (Prime, Byte, Tag, Crystal, etc.) share the same chat endpoint (`/.netlify/functions/chat`). The `employeeSlug` parameter determines:
- Which employee profile to load (system prompt, tools, model config)
- Which tools are available
- Which persona/routing logic applies

Prime can hand off to other employees via the `request_employee_handoff` tool.

---

## Backend Chat Flow

### Canonical Endpoint

**`POST /.netlify/functions/chat`** (`netlify/functions/chat.ts`)

### Request Lifecycle

#### 1. **Request Parsing & Validation**
- Parse JSON body: `{ userId, message, employeeSlug?, sessionId?, stream?, systemPromptOverride? }`
- Validate required fields (`userId`, `message`)
- Handle OPTIONS (CORS preflight)

**File:** `netlify/functions/chat.ts:122-137`

#### 2. **Rate Limiting** (Optional, fails open)
- Check `rate_limits` table for user's request count
- Default: 20 requests per minute
- Returns 429 if exceeded
- Fails open if module not available (non-blocking)

**File:** `netlify/functions/chat.ts:140-167`  
**Module:** `netlify/functions/_shared/rate-limit.ts` (optional)

#### 3. **Guardrails & PII Masking** (CRITICAL - runs FIRST)
- Load guardrail config from DB (`getGuardrailConfig`)
- Run unified guardrails (`runInputGuardrails`):
  - **PII Masking:** Detects and masks 40+ PII patterns (SSN, credit cards, emails, etc.)
  - **Content Moderation:** OpenAI moderation API
  - **Jailbreak Detection:** Pattern-based detection
- If blocked, return safe error response immediately
- Log to `guardrail_events` table

**Files:**
- `netlify/functions/chat.ts:188-248`
- `netlify/functions/_shared/guardrails-unified.ts`
- `netlify/functions/_shared/pii.ts`

**Key Point:** PII masking happens **BEFORE** any API calls or storage. Only masked text is sent to OpenAI.

#### 4. **Employee Routing**
- If `employeeSlug` provided, use it directly
- Otherwise, route based on message content (`routeToEmployee`)
- Returns: `{ employee, systemPreamble, employeePersona }`

**File:** `netlify/functions/_shared/router.ts`

#### 5. **Load Employee Profile & Tools**
- Query `employee_profiles` table for `finalEmployeeSlug`
- Load `system_prompt` (from DB) and `tools_allowed` array
- Map tools to executable modules (`pickTools`)

**File:** `netlify/functions/chat.ts:273-326`

#### 6. **Session Management**
- Ensure session exists (`ensureSession`)
  - If `sessionId` provided and valid → reuse
  - Otherwise → create new session in `chat_sessions`
- Load recent messages (`getRecentMessages`) with token budget (4000 tokens)

**File:** `netlify/functions/_shared/session.ts`

#### 7. **Memory Retrieval**
- Call unified memory API (`getMemory`)
- Retrieves:
  - Relevant facts from `user_memory_facts` (semantic search)
  - Task context (if any)
  - Session summaries (optional)
- Formats as context string for model

**File:** `netlify/functions/_shared/memory.ts`

#### 8. **Build Model Messages**
- System message = `handoff context` (if any) + `customSystemPrompt` OR `employeeSystemPrompt` (from DB) OR `routing prompts` + `memory context`
- User messages = recent messages (from DB) + current masked message
- Tool definitions = loaded from `employee_profiles.tools_allowed`

**File:** `netlify/functions/chat.ts:502-558`

#### 9. **Call OpenAI (Streaming)**
- Use employee-specific model config (`getEmployeeModelConfig`)
- Stream tokens via SSE (`data: { type: 'token', token: '...' }`)
- Collect tool calls if model requests them

**File:** `netlify/functions/chat.ts:589-669`

#### 10. **Handle Tool Calls** (if any)
- Execute tools via `executeTool`
- Special handling for `request_employee_handoff`:
  - Store handoff context in `handoffs` table
  - Update response headers with new `employee`
  - Send handoff event to frontend
- Add tool results to messages and re-call model if needed

**File:** `netlify/functions/chat.ts:671-900`

#### 11. **Save Messages to Database**
- Save user message (masked) to `chat_messages`
- Save assistant response to `chat_messages`
- Update `chat_sessions` (message_count, token_count, last_message_at)

**File:** `netlify/functions/chat.ts:575-587` (user), `900-950` (assistant)

#### 12. **Queue Memory Extraction** (Async, non-blocking)
- Queue job in `memory_extraction_queue` table
- Background worker (`memory-extraction-worker.ts`) processes later
- Extracts facts and stores in `user_memory_facts`

**File:** `netlify/functions/_shared/memory.ts:queueMemoryExtraction`

### Response Format

**Streaming (SSE):**
```
data: {"type":"employee","employee":"byte-docs"}

data: {"type":"token","token":"Hello"}

data: {"type":"token","token":" there"}

data: {"type":"done"}
```

**Non-streaming (JSON):**
```json
{
  "content": "Full response text",
  "employee": "byte-docs",
  "metadata": { ... }
}
```

---

## Guardrails & PII Protection

### Guardrail Layers (Execution Order)

1. **PII Detection & Masking** (`netlify/functions/_shared/pii.ts`)
   - 40+ PII patterns (SSN, credit cards, emails, phone numbers, addresses, etc.)
   - Masking strategies: `last4`, `full`, `domain`
   - Runs **FIRST** before any API calls
   - Returns masked text + detection metadata

2. **Content Moderation** (`netlify/functions/_shared/guardrails-production.ts`)
   - OpenAI moderation API
   - Categories: hate, harassment, self-harm, sexual, violence
   - Blocks unsafe content

3. **Jailbreak Detection** (`netlify/functions/_shared/guardrails-production.ts`)
   - Pattern-based detection
   - Detects prompt injection attempts

4. **Logging** (`guardrail_events` table)
   - All guardrail checks logged
   - Includes: PII types found, moderation flags, blocked status
   - Supports GDPR/CCPA compliance

### Guardrail Presets

- **`strict`:** Block immediately on violation (high security)
- **`balanced`:** Default (warn + redact PII)
- **`creative`:** Lighter filtering for ideation flows

Preset is loaded from `guardrail_configs` table per user.

### PII Masking Details

**File:** `netlify/functions/_shared/pii.ts`

**Patterns Detected:**
- Financial: Credit cards, bank accounts, routing numbers, IBAN
- Government: SSN, passport, driver's license, SIN, NINO
- Contact: Email, phone numbers
- Address: Street addresses, ZIP codes
- Network: IP addresses, MAC addresses

**Masking Strategy:**
- `last4`: Show last 4 digits (e.g., `****-****-****-1234`)
- `full`: Full redaction (e.g., `[REDACTED:credit_card]`)
- `domain`: For emails, show domain only (e.g., `***@example.com`)

**Priority Order:** Routing numbers → SSN → Credit cards → Bank accounts → Other patterns (prevents false positives)

### Guardrail Events Table

**Table:** `public.guardrail_events`

**Columns:**
- `id`, `user_id`, `stage` (`ingestion` | `chat` | `ocr`)
- `preset` (`strict` | `balanced` | `creative`)
- `blocked` (boolean)
- `pii_found`, `pii_types[]`
- `moderation_flagged`, `moderation_categories[]`
- `jailbreak_detected`, `jailbreak_confidence`
- `created_at`

**Migration:** `supabase/migrations/20251013_guardrail_events.sql`

---

## Memory & Employee System

### Employee Profiles

**Table:** `public.employee_profiles`

**Key Columns:**
- `slug` (PRIMARY KEY): `prime-boss`, `byte-docs`, `tag-ai`, etc.
- `system_prompt`: Full system prompt (includes org chart, handoff rules, persona)
- `tools_allowed`: Array of tool names (e.g., `['request_employee_handoff', 'tag_category_brain']`)
- `model`: OpenAI model (e.g., `gpt-4-turbo-preview`)
- `temperature`, `max_tokens`: Model config
- `is_active`: Boolean flag

**Registry:** `src/employees/registry.ts`
- `resolveSlug(slug)`: Resolves aliases to canonical slug
- `getEmployee(slug)`: Loads employee profile from DB
- `getEmployeeSystemPrompt(slug)`: Returns system prompt

### Employee Routing

**File:** `netlify/functions/_shared/router.ts`

**Function:** `routeToEmployee({ userText, requestedEmployee, mode })`

**Logic:**
- If `requestedEmployee` provided → use it
- Otherwise, analyze message content:
  - Few-shot examples for each employee
  - Pattern matching (e.g., "remind me" → `chime-ai`)
  - Returns `{ employee, systemPreamble, employeePersona }`

### Memory System

**Unified API:** `netlify/functions/_shared/memory.ts`

**Functions:**
- `getMemory({ userId, sessionId, query, options })`: Unified retrieval
  - Facts from `user_memory_facts` (semantic search)
  - Tasks (if any)
  - Session summaries (optional)
- `queueMemoryExtraction({ userId, sessionId, userMessage, assistantResponse })`: Queue async extraction
- `upsertFact({ userId, fact })`: Store fact with deduplication
- `recall({ userId, query, k, minScore })`: Semantic search (legacy, still supported)

**Tables:**
- `user_memory_facts`: Facts with `fact_hash` (SHA256) for deduplication
- `memory_embeddings`: Vector embeddings for semantic search (1536 dimensions)
- `memory_extraction_queue`: Async job queue for background extraction

**Memory Extraction Flow:**
1. Chat response saved → queue job in `memory_extraction_queue`
2. Background worker (`memory-extraction-worker.ts`) processes queue
3. Extracts facts from conversation
4. Stores facts + embeddings in `user_memory_facts` and `memory_embeddings`

### Conversation History

**Tables:**
- `chat_sessions`: Session metadata (id, user_id, employee_slug, title, context, message_count, token_count)
- `chat_messages`: Individual messages (id, session_id, role, content, redacted_content, tokens, metadata)
- `chat_session_summaries`: Session summaries (session_id, summary, key_facts[], token_count)

**Session Management:**
- Frontend generates stable `sessionId` (UUID) per user + employee
- Backend ensures session exists (`ensureSession`)
- Recent messages loaded with token budget (4000 tokens default)

### Employee Handoff

**Tool:** `request_employee_handoff` (`src/agent/tools/impl/request_employee_handoff.ts`)

**Flow:**
1. Prime (or other employee) calls tool with `target_slug`, `reason`, `summary_for_next_employee`
2. Backend stores handoff in `handoffs` table:
   - `from_employee`, `to_employee`, `session_id`
   - `reason`, `context_summary`, `key_facts[]`, `user_intent`
   - `status` (`initiated` → `completed`)
3. Frontend receives handoff event via SSE
4. Next message to target employee loads handoff context
5. System message includes handoff preamble

**Table:** `public.handoffs`

**File:** `netlify/functions/chat.ts:452-499` (handoff context loading), `754-850` (handoff execution)

---

## Frontend Chat Surfaces

### Global Popup Chat

**Component:** `src/components/chat/UnifiedAssistantChat.tsx`

**Features:**
- Floating slide-out panel (right side on desktop, bottom on mobile)
- Employee switcher (shows all employees)
- Message list with streaming support
- File upload support
- Guardrails status indicator
- Typing indicators

**Hook:** `usePrimeChat(userId, sessionId, employeeSlug, systemPrompt, initialMessages)`

**Props:**
- `isOpen`, `onClose`
- `initialEmployeeSlug` (default: `prime-boss`)
- `conversationId` (optional session ID)
- `context` (page context, filters, etc.)
- `initialQuestion` (auto-send on open)

**State Management:**
- Messages stored in `usePrimeChat` hook state
- Active employee tracked via `activeEmployeeSlug` from hook
- Streaming state: `isStreaming` from hook

**File Upload:**
- Uses `useSmartImport` hook
- Uploads via `/netlify/functions/smart-import` endpoint
- Attaches file context to chat

### Workspace Chat (Byte & Others)

**Component:** `src/components/workspace/AIWorkspaceOverlay.tsx`

**Architecture:**
- Universal overlay wrapper for any employee
- Composed of:
  - `AIWorkspaceContainer`: Backdrop + positioning
  - `AIWorkspaceHeader`: Title, avatar, Close/Minimize buttons
  - `EmployeeChatWorkspace`: Chat messages area
  - `AIWorkspaceGuardrailsChip`: Guardrails status strip
  - `AIWorkspaceInput`: Message composer

**Employee-Specific Wrappers:**
- `ByteWorkspaceOverlay.tsx`: Thin wrapper with Byte-specific config
- Similar wrappers can be created for Tag, Crystal, etc.

**Props:**
- `open`, `onClose`, `minimized`, `onMinimize`
- `employeeSlug`: `byte-docs`, `tag-ai`, etc.
- `title`, `subtitle`, `workspaceLabel`
- `avatarEmoji`, `avatarColorClass`
- `inputPlaceholder`, `sendButtonColorClass`
- `guardrailsText`: Custom guardrails status text
- `conversationId`, `initialQuestion`

**Example Usage:**
```tsx
<ByteWorkspaceOverlay
  open={isOpen}
  onClose={handleClose}
  minimized={isMinimized}
  onMinimize={handleMinimize}
/>
```

**File:** `src/components/chat/ByteWorkspaceOverlay.tsx`

### Employee Chat Workspace (Core Chat Component)

**Component:** `src/components/chat/EmployeeChatWorkspace.tsx`

**Purpose:** Reusable chat component used by both popup and workspace overlays

**Features:**
- Message rendering (`MessageBubble`)
- Streaming support (SSE parsing)
- Guardrails status tracking (via headers)
- File upload support
- Handoff detection (system messages)

**Props:**
- `employeeSlug`: Required
- `initialQuestion`: Auto-send on mount
- `conversationId`: Session ID
- `showHeader`: Show internal header (default: true)
- `showComposer`: Show input area (default: true)
- `onSendFunctionReady`: Callback to expose send function
- `onStreamingStateChange`: Callback for streaming state
- `onGuardrailsStateChange`: Callback for guardrails state

**Hook:** Uses `usePrimeChat` internally

### Chat Hook (`usePrimeChat`)

**File:** `src/hooks/usePrimeChat.ts`

**Purpose:** Core chat logic hook (used by all chat components)

**API:**
```typescript
const {
  messages,           // ChatMessage[]
  input,             // string
  setInput,          // (text: string) => void
  isStreaming,       // boolean
  send,              // (text?: string, opts?: SendOptions) => Promise<void>
  uploads,            // UploadItem[]
  addUploadFiles,     // (files: FileList) => void
  removeUpload,       // (id: string) => void
  activeEmployeeSlug, // string | undefined
  headers,            // ChatHeaders
} = usePrimeChat(
  userId,            // string
  sessionId?,        // string
  employeeOverride?, // EmployeeOverride
  systemPrompt?,     // string | null
  initialMessages?   // ChatMessage[]
);
```

**Streaming:**
- Parses SSE events from `/netlify/functions/chat`
- Updates messages in real-time as tokens arrive
- Handles tool calls, handoffs, errors

**Headers Parsed:**
- `X-Guardrails`: `active` | `inactive`
- `X-PII-Mask`: `enabled` | `disabled`
- `X-Memory-Hit-Count`: Number of memory facts
- `X-Employee`: Current employee slug
- `X-Route-Confidence`: Routing confidence score

### Scroll Behavior

**Popup Chat:**
- Body scroll locked when popup open (`document.body.style.overflow = 'hidden'`)
- Messages area has own scroll (`overflow-y-auto`)
- Reset on close

**Workspace Overlay:**
- Same scroll locking via `AIWorkspaceContainer`
- Messages area scrolls independently
- Backdrop prevents page interaction

**Files:**
- `src/components/chat/UnifiedAssistantChat.tsx:useEffect` (body scroll lock)
- `src/components/workspace/AIWorkspaceContainer.tsx:useEffect` (body scroll lock)

### Guardrails Status Display

**Component:** `src/components/workspace/AIWorkspaceGuardrailsChip.tsx`

**States:**
- **Active:** Green chip "🔒 Guardrails Active · PII protection on"
- **Unknown:** Gray chip "Guardrails Status Unknown"
- **Inactive:** Red chip (should not occur)

**Updates:**
- Parsed from response headers (`X-Guardrails`, `X-PII-Mask`)
- Updated via `onGuardrailsStateChange` callback from `EmployeeChatWorkspace`

---

## Supabase Schema Summary

### Chat Tables

#### `chat_sessions`
**Purpose:** Session metadata and grouping

**Columns:**
- `id` (uuid, PK)
- `user_id` (text)
- `employee_slug` (text, default: `prime-boss`)
- `title` (text)
- `context` (jsonb, default: `{}`)
- `message_count` (int, default: 0)
- `token_count` (int, default: 0)
- `last_message_at` (timestamptz)
- `created_at`, `updated_at`

**Indexes:**
- `idx_chat_sessions_user_updated` (user_id, updated_at DESC)
- `idx_chat_sessions_last_message` (last_message_at DESC)

**Migration:** `supabase/migrations/20251016_chat_v3_production.sql`

#### `chat_messages`
**Purpose:** Individual messages in conversations

**Columns:**
- `id` (uuid, PK)
- `session_id` (uuid, FK → `chat_sessions.id`)
- `user_id` (text)
- `role` (`user` | `assistant` | `system`)
- `content` (text) - **Masked version stored**
- `redacted_content` (text) - Same as content (for consistency)
- `tokens` (int)
- `metadata` (jsonb, default: `{}`)
- `created_at` (timestamptz)

**Indexes:**
- `idx_chat_messages_session_created` (session_id, created_at DESC)
- `idx_chat_messages_user` (user_id)
- `idx_chat_messages_content_search` (GIN full-text search on content)

**Triggers:**
- `trigger_update_session_on_message`: Updates `chat_sessions.message_count`, `token_count`, `last_message_at` on insert

**Migration:** `supabase/migrations/20251016_chat_v3_production.sql`

#### `chat_session_summaries`
**Purpose:** Conversation summaries for context compression

**Columns:**
- `session_id` (uuid, PK, FK → `chat_sessions.id`)
- `summary` (text)
- `key_facts` (text[])
- `last_summarized_message_id` (uuid)
- `token_count` (int)
- `created_at`, `updated_at`

**Migration:** `supabase/migrations/20251016_chat_v3_production.sql`

### Memory Tables

#### `user_memory_facts`
**Purpose:** Long-term user memory facts

**Columns:**
- `id` (uuid, PK)
- `user_id` (text)
- `fact` (text)
- `fact_hash` (text) - SHA256 hash for deduplication
- `source` (text) - `chat`, `upload`, etc.
- `convo_id` (uuid, FK → `chat_sessions.id`)
- `created_at`, `updated_at`

**Unique Constraint:** `(user_id, fact_hash)` - Prevents duplicate facts

**Migration:** Not found in migrations (may be created elsewhere)

#### `memory_embeddings`
**Purpose:** Vector embeddings for semantic search

**Columns:**
- `fact_id` (uuid, FK → `user_memory_facts.id`)
- `embedding` (vector(1536)) - OpenAI `text-embedding-3-large` dimensions
- `model` (text, default: `text-embedding-3-large`)
- `created_at`

**Migration:** Not found in migrations (may be created elsewhere)

#### `memory_extraction_queue`
**Purpose:** Async job queue for memory extraction

**Columns:**
- `id` (uuid, PK)
- `user_id` (text) - **No FK constraint** (supports anonymous users)
- `session_id` (uuid, FK → `chat_sessions.id`)
- `user_message` (text) - Already PII-masked
- `assistant_response` (text, nullable)
- `status` (`pending` | `processing` | `completed` | `failed`)
- `retry_count` (int, default: 0)
- `max_retries` (int, default: 3)
- `error_message` (text, nullable)
- `processed_at` (timestamptz, nullable)
- `created_at`, `updated_at`

**RPC Functions:**
- `claim_memory_extraction_job()`: Claims next pending job
- `complete_memory_extraction_job(job_id)`: Marks job as completed
- `fail_memory_extraction_job(job_id, error_msg, error_code)`: Marks job as failed (with retry logic)

**Migration:** `supabase/migrations/20251120_add_memory_extraction_queue.sql`  
**FK Fix:** `supabase/migrations/20251123_fix_memory_extraction_queue_fk.sql`

### Employee Tables

#### `employee_profiles`
**Purpose:** Employee definitions and configurations

**Columns:**
- `id` (uuid, PK)
- `slug` (text, UNIQUE) - `prime-boss`, `byte-docs`, `tag-ai`, etc.
- `title` (text) - Display name
- `emoji` (text, nullable) - Avatar emoji
- `system_prompt` (text) - Full system prompt
- `capabilities` (text[]) - Array of capability descriptions
- `tools_allowed` (text[]) - Array of tool names
- `model` (text) - OpenAI model name
- `temperature` (numeric) - Model temperature
- `max_tokens` (int) - Max tokens
- `is_active` (boolean) - Active flag
- `created_at`, `updated_at`

**Migration:** Not found in migrations (may be created elsewhere or via Supabase dashboard)

### Guardrails Tables

#### `guardrail_events`
**Purpose:** Audit trail for all guardrail checks

**Columns:**
- `id` (uuid, PK)
- `user_id` (uuid)
- `stage` (`ingestion` | `chat` | `ocr`)
- `preset` (`strict` | `balanced` | `creative`)
- `blocked` (boolean)
- `reasons` (text[])
- `pii_found` (boolean)
- `pii_types` (text[])
- `moderation_flagged` (boolean)
- `moderation_categories` (text[])
- `jailbreak_detected` (boolean)
- `jailbreak_confidence` (numeric)
- `hallucination_flagged` (boolean)
- `input_hash` (text) - For deduplication
- `created_at`

**Indexes:**
- `idx_guardrail_events_user_created` (user_id, created_at DESC)
- `idx_guardrail_events_stage_created` (stage, created_at DESC)
- `idx_guardrail_events_blocked` (blocked, created_at DESC) WHERE blocked = true
- `idx_guardrail_events_pii` (pii_found, created_at DESC) WHERE pii_found = true

**RLS:** Enabled (users can only see their own events)

**Migration:** `supabase/migrations/20251013_guardrail_events.sql`

#### `guardrail_configs`
**Purpose:** User-specific guardrail settings

**Columns:** (Not found in migrations, may be created elsewhere)
- `user_id` (uuid, PK)
- `preset` (`strict` | `balanced` | `creative`)
- `updated_at`

### Other Tables

#### `handoffs`
**Purpose:** Employee handoff tracking

**Columns:** (Not found in migrations, may be created elsewhere)
- `id` (uuid, PK)
- `user_id` (text)
- `session_id` (uuid, FK → `chat_sessions.id`)
- `from_employee` (text)
- `to_employee` (text)
- `reason` (text, nullable)
- `context_summary` (text, nullable)
- `key_facts` (text[], nullable)
- `user_intent` (text, nullable)
- `status` (`initiated` | `completed`)
- `created_at`, `updated_at`

#### `rate_limits`
**Purpose:** Rate limiting state per user

**Columns:**
- `user_id` (text, PK)
- `window_start` (timestamptz)
- `count` (int, default: 0)
- `created_at`, `updated_at`

**Indexes:**
- `idx_rate_limits_window` (window_start DESC)

**RLS:** Disabled (accessed with service role only)

**Migration:** `supabase/migrations/20251016_chat_v3_production.sql`

---

## Known Issues / TODOs

### 1. `[object Promise]` Messages

**Issue:** Chat bubbles sometimes render `[object Promise]` instead of text.

**Root Cause:** Promise objects being stored directly in message content instead of resolved strings.

**Fix Applied:**
- Added defensive checks in `usePrimeChat.ts` to ensure all message content is strings
- Added `String()` conversions at all message storage points
- Added Promise detection in `send()` function

**Files:**
- `src/hooks/usePrimeChat.ts:240-269`
- `src/components/chat/EmployeeChatWorkspace.tsx:67-68`

**Status:** ✅ Fixed

### 2. Duplicate `chatMessages` Declaration

**Issue:** TypeScript error: "The symbol 'chatMessages' has already been declared"

**Root Cause:** Multiple `const chatMessages = [...]` declarations in same scope.

**Fix Applied:**
- Renamed second declaration to `workerChatMessages` in `SmartImportAIPage.tsx`

**File:** `src/pages/dashboard/SmartImportAIPage.tsx:250`

**Status:** ✅ Fixed

### 3. Page Scroll vs Chat Scroll

**Issue:** When chat popup is open, scrolling affects the entire page instead of just the chat area.

**Root Cause:** Missing body scroll lock when popup is open.

**Fix Applied:**
- Added `document.body.style.overflow = 'hidden'` when popup is open
- Reset on close
- Messages area has own scroll (`overflow-y-auto`)

**Files:**
- `src/components/chat/UnifiedAssistantChat.tsx:useEffect`
- `src/components/workspace/AIWorkspaceContainer.tsx:useEffect`

**Status:** ✅ Fixed

### 4. Foreign Key Constraint on `memory_extraction_queue`

**Issue:** `insert or update on table "memory_extraction_queue" violates foreign key constraint "memory_extraction_queue_user_id_fkey"`

**Root Cause:** `user_id` column was UUID with FK to `users` table, but anonymous users don't exist in `users`.

**Fix Applied:**
- Removed FK constraint
- Changed `user_id` type to TEXT
- Added RLS policy instead
- Added UUID validation in `queueMemoryExtraction` function

**Files:**
- `supabase/migrations/20251123_fix_memory_extraction_queue_fk.sql`
- `netlify/functions/_shared/memory.ts:queueMemoryExtraction`

**Status:** ✅ Fixed

### 5. Inline Chat in Dashboard Pages

**Issue:** Chat UI rendered inline in dashboard pages (e.g., Smart Import AI middle column).

**Root Cause:** `ByteUnifiedCard` component included `EmployeeChatWorkspace` inline.

**Fix Applied:**
- Removed inline chat from `ByteUnifiedCard`
- Replaced with dashboard cards/stats
- Added CTA button to open workspace overlay

**File:** `src/components/smart-import/ByteUnifiedCard.tsx`

**Status:** ✅ Fixed

### 6. Missing `chat_rate_limits` Table

**Issue:** Error: "Could not find the table 'public.chat_rate_limits'"

**Status:** ⚠️ TODO - Migration not yet created. Rate limiting currently uses `rate_limits` table.

### 7. Missing `user_tasks` Table

**Issue:** Error: "Could not find the table 'public.user_tasks'"

**Fix Applied:**
- Created migration: `supabase/migrations/20251123_ensure_user_tasks_table_with_rls.sql`

**Status:** ✅ Fixed

---

## How to Reuse for New Workspaces

### Step-by-Step Guide

#### 1. **Create Employee Profile in Database**

Insert into `employee_profiles` table:

```sql
INSERT INTO employee_profiles (
  slug,
  title,
  emoji,
  system_prompt,
  capabilities,
  tools_allowed,
  model,
  temperature,
  max_tokens,
  is_active
) VALUES (
  'crystal-ai',
  'Crystal — Analytics AI',
  '📊',
  'You are Crystal, the analytics specialist...',
  ARRAY['analytics', 'insights', 'reporting'],
  ARRAY['request_employee_handoff'], -- Add tools as needed
  'gpt-4-turbo-preview',
  0.7,
  4000,
  true
);
```

#### 2. **Create Employee Theme Config**

Add to `src/config/employeeThemes.ts`:

```typescript
export const employeeThemes = {
  // ... existing themes
  crystal: {
    emoji: '📊',
    avatarBg: 'bg-purple-600',
    avatarShadow: 'shadow-purple-500/50',
    placeholder: 'Ask Crystal about your analytics...',
    sendGradient: 'from-purple-500 to-purple-600',
    sendShadow: 'shadow-purple-500/30',
    pill: 'bg-purple-500/10 border-purple-500/20 text-purple-300',
  },
};
```

#### 3. **Create Workspace Overlay Wrapper**

Create `src/components/chat/CrystalWorkspaceOverlay.tsx`:

```typescript
import React from 'react';
import { AIWorkspaceOverlay } from '../workspace';
import { getEmployeeTheme } from '../../config/employeeThemes';

interface CrystalWorkspaceOverlayProps {
  open: boolean;
  onClose: () => void;
  minimized?: boolean;
  onMinimize?: () => void;
}

export function CrystalWorkspaceOverlay({ 
  open, 
  onClose, 
  minimized = false, 
  onMinimize 
}: CrystalWorkspaceOverlayProps) {
  const theme = getEmployeeTheme('crystal');
  
  return (
    <AIWorkspaceOverlay
      open={open}
      onClose={onClose}
      minimized={minimized}
      employeeSlug="crystal-ai"
      title="Crystal — Analytics AI"
      subtitle="Analytics Specialist · Provides insights, reports, and data analysis."
      workspaceLabel="Analytics Workspace"
      avatarEmoji={theme.emoji}
      avatarColorClass={`${theme.avatarBg} shadow-lg ${theme.avatarShadow}`}
      avatarShadowColorClass={theme.avatarShadow}
      inputPlaceholder={theme.placeholder}
      sendButtonColorClass={`bg-gradient-to-br ${theme.sendGradient} ${theme.sendShadow}`}
      workspacePillColorClass={theme.pill}
      guardrailsText={{
        active: 'Guardrails Active · PII protection on',
        unknown: 'Guardrails Status Unknown',
      }}
      showMinimize={true}
      onMinimize={onMinimize || onClose}
    />
  );
}
```

#### 4. **Add to Employee Utils**

Update `src/utils/employeeUtils.ts`:

```typescript
const SLUG_TO_KEY: Record<string, string> = {
  // ... existing mappings
  'crystal-ai': 'crystal',
  'crystal-analytics': 'crystal',
};
```

#### 5. **Use in Dashboard Page**

```typescript
import { CrystalWorkspaceOverlay } from '../../components/chat/CrystalWorkspaceOverlay';

function AnalyticsPage() {
  const [isCrystalOpen, setIsCrystalOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  return (
    <>
      {/* Dashboard content */}
      
      <CrystalWorkspaceOverlay
        open={isCrystalOpen}
        onClose={() => setIsCrystalOpen(false)}
        minimized={isMinimized}
        onMinimize={() => {
          setIsCrystalOpen(false);
          setIsMinimized(true);
        }}
      />
    </>
  );
}
```

### Required Components

- ✅ `AIWorkspaceOverlay` (universal wrapper)
- ✅ `EmployeeChatWorkspace` (core chat component)
- ✅ `usePrimeChat` hook (chat logic)
- ✅ Backend endpoint (`/.netlify/functions/chat`) - **No changes needed**

### Required Props

- `employeeSlug`: Must match `employee_profiles.slug`
- `title`, `subtitle`: Display text
- `avatarEmoji`: Emoji for avatar
- Theme classes: From `employeeThemes` config

### Optional Enhancements

- **Custom Tools:** Add to `employee_profiles.tools_allowed`
- **Custom System Prompt:** Update `employee_profiles.system_prompt`
- **Custom Actions:** Add `actionIconsLeft` prop to overlay (e.g., file upload buttons)

---

## Quick Reference Checklist

### Frontend Setup (New Workspace)

- [ ] Create employee theme in `src/config/employeeThemes.ts`
- [ ] Create workspace overlay wrapper (e.g., `CrystalWorkspaceOverlay.tsx`)
- [ ] Add slug mapping to `src/utils/employeeUtils.ts`
- [ ] Import and use overlay in dashboard page
- [ ] Add state management (`isOpen`, `isMinimized`)

### Backend Setup (New Employee)

- [ ] Insert employee profile into `employee_profiles` table:
  - `slug` (e.g., `crystal-ai`)
  - `system_prompt` (full prompt with persona, org chart, handoff rules)
  - `tools_allowed` (array of tool names)
  - `model`, `temperature`, `max_tokens`
- [ ] Add routing examples to `netlify/functions/_shared/router.ts` (optional, for auto-routing)
- [ ] Test employee routing: Send message with `employeeSlug` parameter

### Testing Checklist

- [ ] Chat opens/closes correctly
- [ ] Messages send and receive
- [ ] Streaming works (tokens appear in real-time)
- [ ] Guardrails status shows correctly
- [ ] PII masking works (test with credit card, SSN, etc.)
- [ ] Employee handoff works (if Prime routes to new employee)
- [ ] Memory retrieval works (if employee uses memory)
- [ ] Tools execute correctly (if employee has tools)
- [ ] Scroll behavior correct (chat scrolls, page doesn't)
- [ ] Minimize button works (if implemented)

### Files to Modify

**Frontend:**
- `src/config/employeeThemes.ts` (add theme)
- `src/utils/employeeUtils.ts` (add slug mapping)
- `src/components/chat/[Employee]WorkspaceOverlay.tsx` (create wrapper)
- `src/pages/dashboard/[Page].tsx` (use overlay)

**Backend:**
- `supabase/migrations/[timestamp]_add_employee_[name].sql` (create employee profile)
- `netlify/functions/_shared/router.ts` (add routing examples, optional)

**No Changes Needed:**
- `netlify/functions/chat.ts` (handles all employees automatically)
- `src/hooks/usePrimeChat.ts` (works with any employee)
- `src/components/chat/EmployeeChatWorkspace.tsx` (universal component)
- `src/components/workspace/AIWorkspaceOverlay.tsx` (universal wrapper)

---

## Summary

The XspensesAI chat system is a unified, database-driven architecture where:

1. **All employees share the same backend endpoint** (`/.netlify/functions/chat`)
2. **Employee configuration is stored in the database** (`employee_profiles` table)
3. **Guardrails and PII protection are universal** (all employees protected)
4. **Memory system is shared** (facts accessible to all employees)
5. **Frontend components are reusable** (`AIWorkspaceOverlay`, `EmployeeChatWorkspace`)

To add a new workspace/employee:
- Create database record
- Create thin wrapper component
- Use in dashboard page

The system handles routing, memory, guardrails, and streaming automatically.










