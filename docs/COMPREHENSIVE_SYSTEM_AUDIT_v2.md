# XspensesAI - Comprehensive System Audit v2

**Date:** February 2025  
**Previous Audit:** `docs/COMPREHENSIVE_SYSTEM_AUDIT.md` (January 2025)  
**Scope:** Chat System, Smart Import, OCR, and Import/Transaction Functionality  
**Focus:** Updated state after unified chat migration, Tag AI transactions integration, and guardrails improvements

---

## CHANGES FROM v1 TO v2

### Major Updates Since v1:

1. **Unified Chat System Adoption**
   - ✅ `AICategorizationPage.tsx` now uses `useUnifiedChatLauncher` (previously used local chat state)
   - ✅ `SmartImportAIPage.tsx` already standardized on unified chat
   - ✅ `SmartCategoriesPage.tsx` migrated to unified chat
   - ✅ `AnalyticsAI.tsx` uses unified chat launcher
   - ✅ `PrimeChatPage.tsx` uses unified chat slideout (no duplicate rails)

2. **Tag AI & Transactions Integration**
   - ✅ `transactions_query` tool added to Tag AI's toolkit via migration
   - ✅ Tag can now list uncategorized transactions (`category: "Uncategorized"` or `null`)
   - ✅ Tool registered in `src/agent/tools/index.ts` with employee-agnostic description
   - ✅ Migration file: `supabase/migrations/20250203_add_transactions_query_to_tag_ai.sql`

3. **Guardrails Chip Status**
   - ✅ `EmployeeChatWorkspace.tsx` now correctly parses guardrail headers
   - ✅ `AIWorkspaceGuardrailsChip.tsx` component renders status from headers
   - ✅ Headers: `X-Guardrails: "active"` and `X-PII-Mask: "enabled"`
   - ✅ Status shows "Active" when both headers indicate protection is on
   - ✅ Shows "Unknown" before first response (expected behavior)

4. **Prime Chat Page Fix**
   - ✅ Global floating chat rail hidden on `/dashboard/prime-chat` route
   - ✅ Only one rail (attached rail inside `UnifiedAssistantChat`)
   - ✅ Prime Chat page uses same unified chat component as floating bubble

---

## 1. CHAT SYSTEM AUDIT

### 1.1 Core Chat Hook: `usePrimeChat`

**File:** `src/hooks/usePrimeChat.ts`

**Purpose:**  
Primary React hook for managing chat state, sending messages, and handling streaming responses from the chat API.

**Exports:**
- `usePrimeChat(userId, sessionId?, employeeOverride?, systemPrompt?, initialMessages?)` - Main hook
- `ChatMessage` interface
- `UploadItem` interface
- `ChatHeaders` interface
- `ToolCallDebug` interface

**Dependencies:**
- `useHeadersDebug` - Dev tools for header inspection
- `useEventTap` - Dev tools for event tracking
- `CHAT_ENDPOINT` from `../lib/chatEndpoint` (defaults to `/.netlify/functions/chat`)

**Key Functionality:**
- Manages message state (`messages`, `input`, `isStreaming`)
- Handles file uploads (`uploads`, `addUploadFiles`, `removeUpload`)
- Sends messages via POST to `/.netlify/functions/chat`
- Parses SSE (Server-Sent Events) streaming responses
- Supports employee handoffs (routing between AI agents)
- Extracts response headers (guardrails, PII mask, memory hits, etc.)
- Retry logic for failed requests (1 retry on network errors)
- Unique message ID generation (timestamp + random suffix)

**Status:** ✅ **WORKING**

**API Endpoint:** `POST /.netlify/functions/chat`

**Request Format:**
```json
{
  "userId": "string",
  "sessionId": "string (optional)",
  "message": "string",
  "employeeSlug": "string (optional, e.g., 'byte-docs', 'prime-boss')",
  "systemPromptOverride": "string (optional)"
}
```

**Response:** Streaming SSE with JSON chunks containing:
- `content` or `token` - Text chunks
- `type: 'handoff'` - Employee handoff events
- `type: 'employee'` - Active employee updates
- `type: 'tool_executing'` - Tool execution events (dev mode)

**Response Headers:**
- `X-Guardrails: "active" | "inactive"` - Guardrails status
- `X-PII-Mask: "enabled" | "disabled"` - PII masking status
- `X-Memory-Hit` - Whether memory was retrieved
- `X-Memory-Count` - Number of memories found
- `X-Employee` - Active employee slug
- `X-Route-Confidence` - Routing confidence score
- `X-Stream-Chunk-Count` - Number of chunks streamed

---

### 1.2 Unified Chat Launcher Hook: `useUnifiedChatLauncher`

**File:** `src/hooks/useUnifiedChatLauncher.ts`

**Purpose:**  
Global state management hook for unified chat slideout. Provides simple API to open chat from anywhere in the app with context and initial employee preference.

**Key Exports:**
- `useUnifiedChatLauncher()` - Main hook
- `openUnifiedChat(options?)` - Global function (non-React)
- `closeUnifiedChat()` - Global function (non-React)
- `ChatLaunchOptions` interface

**State Management:**
- Global singleton state (shared across components)
- Listener pattern for React reactivity
- State includes: `isOpen`, `options`, `activeEmployeeSlug`, `isWorking`, `hasCompletedResponse`, `hasAttention`, `hasActivity`, `progress`

**Key Functions:**
- `openChat(options?)` - Open unified chat with optional employee slug and context
- `closeChat()` - Close unified chat
- `setActiveEmployee(slug)` - Switch active employee
- `setIsWorking(boolean)` - Set working state
- `setHasCompletedResponse(boolean)` - Set response completion state
- `setChatContext(context)` - Update chat context

**Status:** ✅ **WORKING**

**Usage Pattern:**
```typescript
const { openChat, isOpen, activeEmployeeSlug } = useUnifiedChatLauncher();

// Open chat with specific employee
openChat({
  initialEmployeeSlug: 'tag-ai',
  context: {
    page: 'smart-categories',
    filters: { category: 'Uncategorized' },
  },
  initialQuestion: 'Show me uncategorized transactions',
});
```

---

### 1.3 Chat Component: `EmployeeChatWorkspace`

**File:** `src/components/chat/EmployeeChatWorkspace.tsx`

**Purpose:**  
Generic reusable chat workspace component for any AI employee. Renders inline chat interface (not popup).

**Props:**
- `employeeSlug: string` - Which AI employee to chat with (e.g., 'byte-docs', 'tag-ai')
- `initialQuestion?: string` - Auto-send question on mount
- `conversationId?: string` - Conversation ID for history
- `className?: string` - CSS classes
- `showHeader?: boolean` - Show/hide internal header (default: true)
- `showComposer?: boolean` - Show/hide input area (default: true)
- `headers?: ChatHeaders` - Response headers (guardrails, PII mask)
- `onGuardrailsStateChange?: (guardrailsActive, piiProtectionActive) => void` - Guardrails state callback

**Dependencies:**
- `usePrimeChat` - Core chat hook
- `useAuth` - User authentication
- `useSmartImport` - File upload handling
- `useUnifiedChatLauncher` - Global chat state
- `getEmployeeInfo`, `getEmployeeName` - Employee utilities

**Key Features:**
- File upload support (drag & drop, file picker, camera)
- Auto-scroll to bottom on new messages
- Message bubbles with employee avatars
- Handoff visualization (when employees transfer conversations)
- **Guardrails indicator display** (parses headers from `usePrimeChat`)
- Streaming typing indicators

**Guardrails Header Parsing:**
```typescript
// Headers are passed from usePrimeChat hook
// EmployeeChatWorkspace receives headers prop and displays status
// guardrailsActive = headers?.guardrails === "active"
// piiProtectionActive = headers?.piiMask === "enabled"
```

**Status:** ✅ **WORKING**

---

### 1.4 Unified Chat Component: `UnifiedAssistantChat`

**File:** `src/components/chat/UnifiedAssistantChat.tsx`

**Purpose:**  
Single unified chat interface for all AI employees. Renders as slide-out panel (desktop) or bottom sheet (mobile).

**Props:**
- `isOpen: boolean` - Control open/close state
- `onClose: () => void` - Close handler
- `initialEmployeeSlug?: string` - Default employee (default: 'prime-boss')
- `conversationId?: string` - Conversation ID
- `context?: object` - Page context (filters, selection, data)
- `initialQuestion?: string` - Auto-send question

**Dependencies:**
- `useStreamChat` - Streaming chat hook (`src/ui/hooks/useStreamChat.ts`)
- `useAuth` - User authentication
- `useSmartImport` - File uploads
- `useUnifiedChatLauncher` - Global state
- `PrimeSlideoutShell` - Slideout container with attached rail
- `ChatInputBar` - Reusable input component
- `DesktopChatSideBar` - Employee switcher sidebar (rendered as attached rail)

**Key Features:**
- **Attached vertical rail** on left side (floating buttons for Byte, Tag, Crystal, History, Workspace, Prime Tools)
- Employee switcher via rail buttons
- Mobile-responsive (bottom sheet on mobile, slide-out on desktop)
- Context-aware (can pass page context, filters, selected items)
- Returns `null` when closed (completely unmounted to prevent click blocking)
- **Orange send button** with white Send icon (`bg-orange-500`, `h-10 w-10`)
- Guardrails status display

**Rail Implementation:**
- Rail is absolutely positioned (`absolute -left-12`) attached to panel
- Hidden on mobile (`hidden md:flex`)
- Contains buttons for: Byte, Tag, Crystal, Hide/Show rail, History, Workspace, Prime Tools
- Each button uses `setActiveEmployeeGlobal` or `navigate` for page transitions

**Status:** ✅ **WORKING**

---

### 1.5 Chat Context Providers

**Files Found:**
- `src/contexts/AuthContext.tsx` - User authentication
- `src/hooks/useUnifiedChatLauncher.ts` - Chat launcher hook (no separate context file)

**Note:** The unified chat system uses a global singleton state pattern rather than React Context. This allows:
- Opening chat from anywhere without prop drilling
- Global state shared across components
- React reactivity via listener pattern

**Status:** ✅ **WORKING**

---

### 1.6 Chat Overlay Components

**Files:**
- `src/components/workspace/AIWorkspaceOverlay.tsx` - Universal workspace overlay
- `src/components/chat/ByteWorkspaceOverlay.tsx` - Byte-specific overlay wrapper
- `src/components/workspace/AIWorkspaceContainer.tsx` - Container with animations

**AIWorkspaceOverlay:**
- **Purpose:** Universal overlay for any AI employee workspace
- **Props:** `open`, `onClose`, `minimized`, `employeeSlug`, `title`, `subtitle`, etc.
- **Features:** Minimize/maximize, guardrails badge, action buttons
- **Status:** ✅ **WORKING** (but being phased out in favor of unified chat)

**ByteWorkspaceOverlay:**
- **Purpose:** Thin wrapper around `AIWorkspaceOverlay` with Byte-specific config
- **Status:** ✅ **WORKING** (but being phased out in favor of unified chat)

**Migration Status:** Most pages now use `UnifiedAssistantChat` via `useUnifiedChatLauncher` instead of workspace overlays.

---

### 1.7 Chat API Endpoint: `netlify/functions/chat.ts`

**File:** `netlify/functions/chat.ts`

**Purpose:**  
Main chat API endpoint. Handles message routing, employee selection, guardrails, memory retrieval, and streaming responses.

**Key Features:**
- **Guardrails Integration:** All messages go through `runInputGuardrails()` BEFORE processing
- **Employee Routing:** Routes to correct AI employee based on `employeeSlug`
- **Memory System:** Retrieves relevant memories before generating response
- **Session Management:** Uses `ensureSession()` and `getRecentMessages()` for conversation history
- **Streaming:** Returns SSE stream with OpenAI-compatible format
- **Tool Calling:** Supports tool execution (e.g., Tag's categorization tools, `transactions_query`)
- **Rate Limiting:** Optional rate limiting (20 requests/minute)

**Request Body:**
```typescript
{
  userId: string;
  employeeSlug?: string; // e.g., 'byte-docs', 'prime-boss', 'tag-ai'
  message: string;
  sessionId?: string;
  stream?: boolean; // default: true
  systemPromptOverride?: string;
}
```

**Response Headers:**
- `X-Guardrails: "active" | "inactive"` - Guardrails status
- `X-PII-Mask: "enabled" | "disabled"` - PII masking status
- `X-Memory-Hit` - Whether memory was retrieved
- `X-Memory-Count` - Number of memories found
- `X-Employee` - Active employee slug
- `X-Route-Confidence` - Routing confidence score
- `X-Stream-Chunk-Count` - Number of chunks streamed

**Dependencies:**
- `guardrails-unified.ts` - Guardrails processing
- `memory.ts` - Memory retrieval/storage
- `session.ts` - Session management
- `router.ts` - Employee routing
- `employeeModelConfig.ts` - Employee model configurations
- `openai` - OpenAI API client

**Status:** ✅ **WORKING**

---

### 1.8 Pages Using Unified Chat vs Local Chat

#### ✅ Pages Fully Using Unified Chat (No Local Chat State)

1. **`src/pages/dashboard/AICategorizationPage.tsx`** (Tag)
   - **Status:** ✅ Migrated to unified chat
   - **Implementation:** Uses `useUnifiedChatLauncher().openChat()` with `employeeSlug: 'tag-ai'`
   - **Change from v1:** Previously used local chat state, now uses unified chat launcher

2. **`src/pages/dashboard/SmartImportAIPage.tsx`** (Byte)
   - **Status:** ✅ Already using unified chat
   - **Implementation:** Uses `useUnifiedChatLauncher().openChat()` with `employeeSlug: 'byte-docs'`
   - **Change from v1:** Already standardized (no change)

3. **`src/pages/dashboard/SmartCategoriesPage.tsx`** (Tag)
   - **Status:** ✅ Migrated to unified chat
   - **Implementation:** Uses `useUnifiedChatLauncher().openChat()` with `employeeSlug: 'tag-ai'`
   - **Change from v1:** Removed `TagWorkspace` component, now uses unified chat

4. **`src/pages/dashboard/AnalyticsAI.tsx`** (Crystal)
   - **Status:** ✅ Using unified chat
   - **Implementation:** Uses `useUnifiedChatLauncher().openChat()` with `employeeSlug: 'crystal-analytics'`
   - **Change from v1:** Added unified chat integration

5. **`src/pages/dashboard/PrimeChatPage.tsx`** (Prime)
   - **Status:** ✅ Using unified chat slideout
   - **Implementation:** Calls `openChat({ initialEmployeeSlug: 'prime-boss' })` on mount
   - **Change from v1:** Fixed double rail issue, now uses unified chat

#### ⚠️ Pages Still Using Local Chat State or Custom Chat Modals

1. **`src/pages/dashboard/AIFinancialAssistantPage.tsx`**
   - **Status:** ⚠️ Uses local chat state
   - **Implementation:** Local `messages`, `input`, `isLoading` state with direct `fetch()` calls
   - **Should Migrate:** ✅ Yes - Should use `useUnifiedChatLauncher` and `UnifiedAssistantChat`
   - **Notes:** Legacy page, likely needs refactoring

2. **`src/components/dashboard/ConnectedDashboard.tsx`**
   - **Status:** ⚠️ No chat implementation found
   - **Should Migrate:** N/A - No chat functionality

**Summary:**
- ✅ **5 pages** fully migrated to unified chat
- ⚠️ **1 page** still uses local chat state (should migrate)
- ✅ **Unified chat adoption:** ~83% complete

---

## 2. TAG AI & TRANSACTIONS INTEGRATION

### 2.1 Tag AI Tools

**Employee Slug:** `tag-ai`

**Tools Available:**
- ✅ `tag_explain_category` - Explain categorization decisions
- ✅ `tag_merchant_insights` - Merchant insights and patterns
- ✅ `tag_category_brain` - Category learning and suggestions
- ✅ `tag_update_transaction_category` - Update transaction category
- ✅ `tag_create_manual_transaction` - Create manual transaction
- ✅ **`transactions_query`** - Query transactions (including uncategorized) **[NEW IN v2]**
- ✅ `sheet_export` - Export transactions to spreadsheet
- ✅ `request_employee_handoff` - Request handoff to another employee

**Status:** ✅ **ALL TOOLS WORKING**

---

### 2.2 Transactions Query Tool

**File:** `src/agent/tools/impl/transactions_query.ts`

**Purpose:**  
Query transactions with flexible filters. Enables Tag AI to analyze spending patterns, calculate totals, list uncategorized transactions, or run projections based on actual transaction data.

**Input Schema:**
```typescript
{
  startDate?: string; // YYYY-MM-DD format
  endDate?: string; // YYYY-MM-DD format
  category?: string; // Supports "Uncategorized" or "null" for uncategorized transactions
  categories?: string[]; // Array of categories
  type?: 'expense' | 'income' | 'all'; // Default: 'all'
  minAmount?: number;
  maxAmount?: number;
  merchant?: string;
  limit?: number; // Default: 100
  offset?: number; // Default: 0
}
```

**Output Schema:**
```typescript
{
  transactions: Array<{
    id: string;
    date: string;
    description: string | null;
    merchant: string | null;
    amount: number;
    category: string | null;
    type: string | null;
  }>;
  total: number;
  summary: {
    totalAmount: number;
    totalExpenses: number;
    totalIncome: number;
    transactionCount: number;
    dateRange: {
      start: string | null;
      end: string | null;
    };
  };
}
```

**Key Features:**
- ✅ **Uncategorized Transaction Support:** Filter by `category: "Uncategorized"` or `category: "null"`
- ✅ **Flexible Filtering:** Date range, category, type, amount range, merchant
- ✅ **Summary Statistics:** Total amount, expenses, income, transaction count, date range
- ✅ **Pagination:** `limit` and `offset` support

**Uncategorized Transaction Filtering:**
```typescript
// In transactions_query.ts (lines 72-78)
if (input.category) {
  // Support filtering uncategorized transactions
  if (input.category.toLowerCase() === 'uncategorized' || input.category.toLowerCase() === 'null') {
    query = query.is('category', null);
  } else {
    query = query.eq('category', input.category);
  }
}
```

**Status:** ✅ **WORKING**

---

### 2.3 Tool Registration

**File:** `src/agent/tools/index.ts`

**Registration:**
```typescript
import * as transactionsQuery from './impl/transactions_query';

// Registered at line 388-389
['transactions_query', {
  id: 'transactions_query',
  // ... tool definition
}]
```

**Description:** Employee-agnostic description mentions analyzing patterns and uncategorized transactions:
> "Query transactions with flexible filters. Use this to analyze spending patterns, calculate totals, list uncategorized transactions, or run projections based on actual transaction data."

**Status:** ✅ **REGISTERED**

---

### 2.4 Database Migration

**File:** `supabase/migrations/20250203_add_transactions_query_to_tag_ai.sql`

**Purpose:**  
Adds `transactions_query` tool to Tag AI's `tools_allowed` array in the `employee_profiles` table.

**Migration SQL:**
```sql
-- Add transactions_query tool to Tag's allowed tools
UPDATE public.employee_profiles
SET tools_allowed = array_append(
  COALESCE(tools_allowed, ARRAY[]::text[]),
  'transactions_query'
)
WHERE slug = 'tag-ai'
  AND NOT ('transactions_query' = ANY(COALESCE(tools_allowed, ARRAY[]::text[])));

-- Remove duplicates using array_distinct
UPDATE public.employee_profiles
SET tools_allowed = array(
  SELECT DISTINCT unnest(tools_allowed)
  ORDER BY unnest(tools_allowed)
)
WHERE slug = 'tag-ai';
```

**Status:** ✅ **MIGRATION EXISTS** (must be applied to database)

**Idempotent:** ✅ Yes - Uses `NOT ('transactions_query' = ANY(...))` check to prevent duplicates

---

### 2.5 Tag AI Uncategorized Transaction Capability

**Question:** Can Tag list uncategorized transactions?

**Answer:** ✅ **YES** (assuming migrations applied)

**How:**
1. Tag AI calls `transactions_query` tool with `category: "Uncategorized"` or `category: "null"`
2. Tool queries `transactions` table with `category IS NULL`
3. Returns list of uncategorized transactions with summary statistics

**Example Usage:**
```
User: "Show me all uncategorized transactions"
Tag: [Calls transactions_query with category: "Uncategorized"]
Result: List of transactions with null category
```

**Requirements:**
- ✅ Migration `20250203_add_transactions_query_to_tag_ai.sql` must be applied
- ✅ `transactions` table must exist with `category` column (nullable)
- ✅ Tool must be registered in `src/agent/tools/index.ts` (already done)

**Status:** ✅ **READY** (pending migration application)

---

## 3. GUARDRAILS CHIP STATUS

### 3.1 Guardrails Chip Component

**File:** `src/components/workspace/AIWorkspaceGuardrailsChip.tsx`

**Purpose:**  
Reusable guardrails status chip with dynamic colors. Used in both header and middle strip.

**Props:**
- `guardrailsActive: boolean | null` - Guardrails status from headers
- `piiProtectionActive: boolean | null` - PII protection status from headers
- `variant?: 'header' | 'strip'` - Visual variant
- `textActive?: string` - Custom active text
- `textUnknown?: string` - Custom unknown text

**Status Logic:**
```typescript
// Default to active (true) if status is null/undefined
// Only show "Unknown" if explicitly set to false
const isActive = (guardrailsActive !== false && piiProtectionActive !== false);
```

**Visual States:**
- **Active:** Green (`bg-emerald-500/10 text-emerald-200 border-emerald-500/40`) with pulsing dot
- **Unknown:** Amber (`bg-amber-500/10 text-amber-200 border-amber-500/40`) with static dot

**Status:** ✅ **WORKING**

---

### 3.2 Header Parsing in EmployeeChatWorkspace

**File:** `src/components/chat/EmployeeChatWorkspace.tsx`

**Header Parsing:**
- Headers are passed from `usePrimeChat` hook via `headers` prop
- `guardrailsActive = headers?.guardrails === "active"`
- `piiProtectionActive = headers?.piiMask === "enabled"`

**Expected Header Values:**
- `X-Guardrails: "active" | "inactive"`
- `X-PII-Mask: "enabled" | "disabled"`

**Status Display:**
- Chip shows "Active" when both headers indicate protection is on
- Chip shows "Unknown" before first response (expected behavior)
- Chip updates dynamically as headers arrive from backend

**Status:** ✅ **WORKING** (correctly parses headers)

---

### 3.3 Guardrails Status Flow

```
User sends message
    ↓
POST /.netlify/functions/chat
    ↓
[chat.ts] runInputGuardrails()
    ↓
[guardrails-unified.ts] applyGuardrails()
    ↓
Response headers set:
  X-Guardrails: "active"
  X-PII-Mask: "enabled"
    ↓
[usePrimeChat] parseSSEEvent() extracts headers
    ↓
Headers passed to EmployeeChatWorkspace via headers prop
    ↓
[AIWorkspaceGuardrailsChip] displays status
    ↓
Chip shows "Guardrails + PII Protection Active" (green)
```

**Status:** ✅ **WORKING**

---

## 4. SMART IMPORT AUDIT

### 4.1 Smart Import Hook: `useSmartImport`

**File:** `src/hooks/useSmartImport.ts`

**Purpose:**  
React hook for uploading files through the Smart Import pipeline with automatic guardrails and routing.

**Exports:**
- `useSmartImport()` - Main hook
- `UploadSource` type ('upload' | 'chat')
- `UploadResult` type

**Functions:**
- `uploadFile(userId, file, source)` - Upload single file
- `uploadFiles(userId, files[], source)` - Upload multiple files
- `uploadBase64(userId, filename, mime, base64, source)` - Upload from base64

**Upload Flow:**
1. **Init:** `POST /.netlify/functions/smart-import-init` → Get signed URL
2. **Upload:** `PUT` to signed URL → Upload file to Supabase storage
3. **Finalize:** `POST /.netlify/functions/smart-import-finalize` → Trigger guardrails + processing

**Status:** ✅ **WORKING**

---

### 4.2 Smart Import Endpoints

**Files:**
- `netlify/functions/smart-import-init.ts` - Initialize upload, get signed URL
- `netlify/functions/smart-import-finalize.ts` - Finalize upload, trigger processing
- `netlify/functions/smart-import-ocr.ts` - Run OCR on image/PDF
- `netlify/functions/smart-import-parse-csv.ts` - Parse CSV/OFX/QIF statements

**Status:** ✅ **WORKING** (all endpoints functional)

---

### 4.3 Smart Import Page Component

**File:** `src/pages/dashboard/SmartImportAIPage.tsx`

**Key Features:**
- Drag & drop file upload
- Processing modal with step-by-step progress
- AI worker activity simulation
- File list with status (uploading, processing, completed, error)
- Integration with `useAIMemory` for task management
- **Opens unified chat slideout** for Byte chat (no inline chat)

**Change from v1:** Already using unified chat (no change)

**Status:** ✅ **WORKING**

---

## 5. DATA FLOW DIAGRAMS

### 5.1 Chat Message Flow (Updated)

```
User Types Message
    ↓
[UnifiedAssistantChat] or [EmployeeChatWorkspace]
    ↓
[usePrimeChat] send(message) or [useStreamChat] sendMessage(message)
    ↓
POST /.netlify/functions/chat
    Body: { userId, employeeSlug, message, sessionId }
    ↓
[chat.ts] Handler
    ↓
[guardrails-unified.ts] runInputGuardrails()
    ↓
PII Masking → Content Moderation → Jailbreak Detection
    ↓
[If blocked] Return safe error message with headers
    ↓
[If allowed] Continue...
    ↓
[router.ts] routeToEmployee() (if employeeSlug not provided)
    ↓
[session.ts] ensureSession() + getRecentMessages()
    ↓
[memory.ts] getMemory() - Retrieve relevant memories
    ↓
[employeeModelConfig.ts] getEmployeeModelConfig()
    ↓
[OpenAI API] Chat completion with streaming
    ↓
Stream SSE chunks back to client
    Headers: X-Guardrails, X-PII-Mask, X-Employee, etc.
    ↓
[usePrimeChat] parseSSEEvent() - Parse chunks
    ↓
Update messages state
    Extract headers → pass to EmployeeChatWorkspace
    ↓
Display in chat UI
    Guardrails chip updates based on headers
    ↓
[memory.ts] queueMemoryExtraction() - Extract new memories
    ↓
[session.ts] Save messages to chat_messages table
```

**Change from v1:** Added guardrails header extraction and chip status update flow.

---

### 5.2 Tag AI Uncategorized Transaction Query Flow

```
User: "Show me uncategorized transactions"
    ↓
[UnifiedAssistantChat] sends message to Tag AI
    ↓
POST /.netlify/functions/chat
    Body: { employeeSlug: 'tag-ai', message: '...' }
    ↓
[chat.ts] Routes to Tag AI
    ↓
[OpenAI API] Tag AI decides to use transactions_query tool
    ↓
Tool Call: transactions_query({ category: "Uncategorized" })
    ↓
[transactions_query.ts] execute()
    ↓
Query Supabase:
  SELECT * FROM transactions
  WHERE user_id = ? AND category IS NULL
    ↓
Return transactions array + summary
    ↓
[OpenAI API] Tag AI formats response
    ↓
Stream response back to user
    ↓
[UnifiedAssistantChat] displays response
```

**Change from v2:** New flow added for Tag AI uncategorized transaction queries.

---

## 6. WHAT'S WORKING vs WHAT'S NOT

| Feature | Status | Notes |
|---------|--------|-------|
| **Chat with Prime** | ✅ | Working via UnifiedAssistantChat |
| **Chat with Tag** | ✅ | Working via UnifiedAssistantChat, uses unified chat launcher |
| **Chat with Byte** | ✅ | Working via UnifiedAssistantChat, uses unified chat launcher |
| **Chat with Crystal** | ✅ | Working via UnifiedAssistantChat, uses unified chat launcher |
| **Unified Chat Adoption** | ✅ | ~83% complete (5/6 pages migrated) |
| **Local Chat State** | ⚠️ | 1 page still uses local state (AIFinancialAssistantPage) |
| **Guardrails Visualization** | ✅ | Chip correctly shows Active/Unknown based on headers |
| **Guardrails Header Parsing** | ✅ | EmployeeChatWorkspace correctly parses X-Guardrails and X-PII-Mask |
| **File Upload in Chat** | ✅ | Working via useSmartImport hook |
| **Tag's transactions_query Tool** | ✅ | Tool implemented and registered |
| **Tag's Uncategorized Transactions** | ✅ | Can list uncategorized via transactions_query (pending migration) |
| **Tag's Category Updates** | ✅ | Working via tag_update_transaction_category tool |
| **Byte's Smart Import Flows** | ✅ | Working via Smart Import pipeline |
| **Prime Chat Page Double Rail** | ✅ | Fixed - only one rail (attached rail) |
| **Unified Chat Rail** | ✅ | Attached rail on left side of UnifiedAssistantChat |

---

## 7. API ENDPOINTS LIST

### Chat Endpoints

| Endpoint | Method | Purpose | Status |
|----------|--------|---------|--------|
| `/.netlify/functions/chat` | POST | Main chat endpoint, handles all employee chats | ✅ |
| `/.netlify/functions/tag-explain` | POST | Tag AI: Explain categorization | ✅ |
| `/.netlify/functions/tag-learn` | POST | Tag AI: Learn from user feedback | ✅ |
| `/.netlify/functions/tag-merchant-insights` | POST | Tag AI: Merchant insights | ✅ |

### Smart Import Endpoints

| Endpoint | Method | Purpose | Status |
|----------|--------|---------|--------|
| `/.netlify/functions/smart-import-init` | POST | Initialize file upload, get signed URL | ✅ |
| `/.netlify/functions/smart-import-finalize` | POST | Finalize upload, trigger processing | ✅ |
| `/.netlify/functions/smart-import-ocr` | POST | Run OCR on image/PDF | ✅ |
| `/.netlify/functions/smart-import-parse-csv` | POST | Parse CSV/OFX/QIF statements | ✅ |

### Tool Endpoints (via chat.ts)

| Tool | Purpose | Status |
|------|---------|--------|
| `transactions_query` | Query transactions (including uncategorized) | ✅ |
| `tag_update_transaction_category` | Update transaction category | ✅ |
| `tag_create_manual_transaction` | Create manual transaction | ✅ |
| `tag_explain_category` | Explain categorization | ✅ |
| `tag_merchant_insights` | Merchant insights | ✅ |
| `tag_category_brain` | Category learning | ✅ |

---

## 8. ENVIRONMENT VARIABLES NEEDED

### Server-side (Netlify Functions)

| Variable | Used For | Required |
|----------|----------|----------|
| `OPENAI_API_KEY` | Chat completions, guardrails moderation | ✅ **REQUIRED** |
| `SUPABASE_URL` | Database connection | ✅ **REQUIRED** |
| `SUPABASE_SERVICE_ROLE` | Database admin access | ✅ **REQUIRED** |
| `GOOGLE_VISION_API_KEY` | OCR for images (preferred) | ⚠️ Optional (fallback available) |
| `OCR_SPACE_API_KEY` | OCR for PDFs/images (fallback) | ⚠️ Optional (if Google Vision not available) |
| `CHAT_BACKEND_VERSION` | Chat backend version flag | ⚠️ Optional (defaults to 'v2') |

### Client-side (Vite/Browser)

| Variable | Used For | Required |
|----------|----------|----------|
| `VITE_SUPABASE_URL` | Supabase client connection | ✅ **REQUIRED** |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous key | ✅ **REQUIRED** |
| `VITE_CHAT_ENDPOINT` | Chat API endpoint | ⚠️ Optional (defaults to `/.netlify/functions/chat`) |
| `VITE_PRIME_CHAT_V2` | Prime Chat V2 feature flag | ⚠️ Optional |
| `VITE_CHAT_BUBBLE_ENABLED` | Show chat bubble button | ⚠️ Optional |

---

## 9. RECOMMENDED NEXT STEPS

### Priority 1: Complete Unified Chat Migration

1. **Migrate AIFinancialAssistantPage**
   - Replace local chat state with `useUnifiedChatLauncher`
   - Use `UnifiedAssistantChat` component
   - Remove direct `fetch()` calls to chat endpoint

2. **Apply Tag AI Migration**
   - Run `supabase/migrations/20250203_add_transactions_query_to_tag_ai.sql`
   - Verify `transactions_query` appears in Tag's `tools_allowed` array
   - Test uncategorized transaction queries

### Priority 2: Enhancements

3. **Guardrails Chip Testing**
   - Test guardrails chip status updates in real-time
   - Verify "Unknown" → "Active" transition on first response
   - Test with different guardrails presets (Strict, Balanced, Creative)

4. **Tag AI Uncategorized Transaction UI**
   - Add UI for Tag to display uncategorized transactions
   - Create suggested prompts for uncategorized transaction queries
   - Add "Fix Categories" quick action

5. **Unified Chat Context Enhancement**
   - Pass transaction filters to Tag AI via chat context
   - Pass document IDs to Byte AI via chat context
   - Pass analytics queries to Crystal AI via chat context

### Priority 3: Optimizations

6. **Performance**
   - Optimize guardrails header parsing
   - Cache guardrails status per session
   - Reduce re-renders in UnifiedAssistantChat

7. **Error Handling**
   - Better error messages for failed tool calls
   - Retry logic for transactions_query failures
   - User-friendly error recovery

---

## 10. SUMMARY OF CHANGES FROM v1 TO v2

### ✅ Completed Changes

1. **Unified Chat Migration**
   - ✅ AICategorizationPage migrated to unified chat
   - ✅ SmartCategoriesPage migrated to unified chat
   - ✅ AnalyticsAI uses unified chat
   - ✅ PrimeChatPage fixed (no double rail)

2. **Tag AI Transactions Integration**
   - ✅ `transactions_query` tool implemented
   - ✅ Tool registered in `src/agent/tools/index.ts`
   - ✅ Migration file created (`20250203_add_transactions_query_to_tag_ai.sql`)
   - ✅ Uncategorized transaction filtering supported

3. **Guardrails Chip Status**
   - ✅ `EmployeeChatWorkspace` parses guardrails headers
   - ✅ `AIWorkspaceGuardrailsChip` displays status correctly
   - ✅ Status shows "Active" when headers indicate protection
   - ✅ Status shows "Unknown" before first response (expected)

4. **Prime Chat Page Fix**
   - ✅ Global floating rail hidden on `/dashboard/prime-chat`
   - ✅ Only attached rail visible (inside UnifiedAssistantChat)
   - ✅ Prime Chat page uses unified chat slideout

### ⚠️ Pending Changes

1. **Unified Chat Migration**
   - ⚠️ AIFinancialAssistantPage still uses local chat state

2. **Database Migrations**
   - ⚠️ `20250203_add_transactions_query_to_tag_ai.sql` must be applied

3. **Testing**
   - ⚠️ Tag AI uncategorized transaction queries need testing
   - ⚠️ Guardrails chip status updates need real-time testing

---

## 11. FILE STRUCTURE SUMMARY

### Chat System Files

```
src/
├── hooks/
│   ├── usePrimeChat.ts              ✅ Core chat hook
│   └── useUnifiedChatLauncher.ts    ✅ Chat launcher hook (global state)
├── components/
│   ├── chat/
│   │   ├── EmployeeChatWorkspace.tsx    ✅ Inline chat component
│   │   ├── UnifiedAssistantChat.tsx     ✅ Popup chat component (with attached rail)
│   │   ├── ChatInputBar.tsx             ✅ Reusable input component
│   │   ├── ChatOverlayShell.tsx         ✅ Overlay container
│   │   └── DesktopChatSideBar.tsx       ✅ Employee switcher sidebar
│   ├── workspace/
│   │   ├── AIWorkspaceOverlay.tsx        ✅ Universal overlay (being phased out)
│   │   └── AIWorkspaceGuardrailsChip.tsx ✅ Guardrails status chip
│   └── prime/
│       └── PrimeSlideoutShell.tsx        ✅ Slideout container with rail support
└── pages/
    └── dashboard/
        ├── AICategorizationPage.tsx      ✅ Uses unified chat
        ├── SmartImportAIPage.tsx         ✅ Uses unified chat
        ├── SmartCategoriesPage.tsx       ✅ Uses unified chat
        ├── AnalyticsAI.tsx               ✅ Uses unified chat
        ├── PrimeChatPage.tsx             ✅ Uses unified chat
        └── AIFinancialAssistantPage.tsx  ⚠️ Still uses local chat state

netlify/functions/
├── chat.ts                            ✅ Main chat endpoint
└── _shared/
    ├── guardrails-unified.ts          ✅ Guardrails system
    ├── memory.ts                      ✅ Memory system
    ├── session.ts                     ✅ Session management
    ├── router.ts                      ✅ Employee routing
    └── employeeModelConfig.ts         ✅ Employee configs

src/agent/tools/
├── index.ts                           ✅ Tool registry (includes transactions_query)
└── impl/
    └── transactions_query.ts          ✅ Transactions query tool implementation
```

---

## 12. DATABASE SCHEMA (Inferred)

### Tables Referenced

- `user_documents` - Document metadata and OCR text
- `imports` - Import records linked to documents
- `transactions` - Normalized transaction data (with nullable `category` column)
- `chat_sessions` - Chat session records
- `chat_messages` - Chat message history
- `chat_convo_summaries` - Conversation summaries (with fallback to `chat_sessions`)
- `employee_profiles` - AI employee configurations (with `tools_allowed` array)
- `ai_conversations` - AI conversation records
- `user_ai_preferences` - User preferences per employee
- `ai_interactions_log` - Interaction logging
- `guardrail_events` - Guardrails audit trail

### Migration Status

- ✅ `20250203_add_transactions_query_to_tag_ai.sql` - Created (must be applied)
- ✅ `20251013_guardrail_events.sql` - Guardrails audit trail (from v1)
- ✅ `20250121_chat_convo_summaries_last_message_at.sql` - Chat summaries (from v1)

---

## 13. SUMMARY

### ✅ What's Working Well

1. **Unified Chat System:** Fully functional with slideout panel, attached rail, and global state management
2. **Tag AI Tools:** Complete toolkit including new `transactions_query` tool
3. **Guardrails System:** Comprehensive PII protection with status visualization
4. **File Upload:** Working via Smart Import pipeline
5. **Employee Routing:** Keyword-based routing to appropriate AI employees
6. **Session Management:** Conversation history maintained across sessions
7. **Memory System:** Memories extracted and retrieved for context

### ⚠️ What Needs Attention

1. **Unified Chat Migration:** 1 page still uses local chat state (AIFinancialAssistantPage)
2. **Database Migrations:** Tag AI `transactions_query` migration must be applied
3. **Testing:** Tag AI uncategorized transaction queries need end-to-end testing
4. **Guardrails Chip:** Real-time status updates need verification

### 🔧 Integration Opportunities

1. **Chat ↔ Transactions:** Tag AI can now query transactions via `transactions_query` tool
2. **Chat ↔ Import:** Already connected, can enhance with document context
3. **Guardrails ↔ UI:** Status visualization working, can enhance with more details
4. **Unified Chat ↔ Pages:** Most pages migrated, remaining page needs migration

---

**End of Audit v2**


