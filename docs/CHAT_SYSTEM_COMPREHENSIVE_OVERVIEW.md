# XspensesAI Chat System - Comprehensive Overview

**Date**: January 15, 2025  
**Status**: Production System  
**Purpose**: Complete documentation of chat architecture, implementation, and integration points

---

## Table of Contents

1. [Chat Architecture & Infrastructure](#1-chat-architecture--infrastructure)
2. [Prime's Routing System](#2-primes-routing-system)
3. [Chat Interface Components](#3-chat-interface-components)
4. [Message Flow & State Management](#4-message-flow--state-management)
5. [AI Integration](#5-ai-integration)
6. [Specialist-Specific Features](#6-specialist-specific-features)
7. [Chat History & Memory](#7-chat-history--memory)
8. [UI/UX Patterns](#8-uiux-patterns)
9. [Integration Points](#9-integration-points)
10. [Technical Implementation Details](#10-technical-implementation-details)

---

## 1. Chat Architecture & Infrastructure

### Overall Architecture

XspensesAI uses a **multi-agent conversational AI system** with Prime as the orchestrator/CEO and 30+ specialized AI employees. The architecture follows a **client-server pattern** with:

- **Frontend**: React components with hooks for state management
- **Backend**: Netlify Functions (serverless) + Supabase (PostgreSQL)
- **AI Service**: OpenAI API (GPT-4o-mini, GPT-4o, text-embedding-3-large)
- **Real-time**: Server-Sent Events (SSE) for streaming responses

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND LAYER                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ UnifiedChat  │  │ PrimeChat    │  │ ByteChat     │      │
│  │ Component    │  │ Component    │  │ Component    │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                 │                 │               │
│         └─────────────────┼─────────────────┘               │
│                           │                                   │
│                    ┌──────▼───────┐                          │
│                    │  useChat Hook │                          │
│                    │  usePrimeChat │                          │
│                    └──────┬───────┘                          │
└───────────────────────────┼──────────────────────────────────┘
                            │ POST /chat
                            │ SSE Stream
┌───────────────────────────▼──────────────────────────────────┐
│                    BACKEND LAYER                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  netlify/functions/chat.ts                             │   │
│  │  ├─ Guardrails (PII masking, moderation)             │   │
│  │  ├─ Session Management                                │   │
│  │  ├─ Memory Retrieval (RAG + Facts)                    │   │
│  │  ├─ Employee Routing                                  │   │
│  │  └─ OpenAI Streaming                                  │   │
│  └──────────────────────────────────────────────────────┘   │
│                           │                                   │
│         ┌─────────────────┼─────────────────┐               │
│         │                 │                 │               │
│  ┌──────▼──────┐  ┌──────▼──────┐  ┌──────▼──────┐        │
│  │  Supabase   │  │   OpenAI    │  │  Guardrails │        │
│  │  Database   │  │     API     │  │   Service   │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
└─────────────────────────────────────────────────────────────┘
```

### Database Tables

#### Core Chat Tables

**`chat_sessions`** - Conversation containers
```sql
CREATE TABLE chat_sessions (
  id UUID PRIMARY KEY,
  user_id TEXT NOT NULL,
  employee_slug TEXT NOT NULL,  -- 'prime-boss', 'byte-doc', 'tag-ai', etc.
  title TEXT,
  context JSONB DEFAULT '{}',
  message_count INT DEFAULT 0,
  token_count INT DEFAULT 0,
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

**`chat_messages`** - Individual messages (normalized)
```sql
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY,
  session_id UUID REFERENCES chat_sessions(id),
  user_id TEXT NOT NULL,
  role TEXT CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  redacted_content TEXT,  -- PII-safe version
  tokens INT,
  metadata JSONB DEFAULT '{}',  -- Tool calls, citations, feedback
  created_at TIMESTAMPTZ
);
```

**`employee_profiles`** - AI employee registry
```sql
CREATE TABLE employee_profiles (
  slug TEXT PRIMARY KEY,  -- 'prime-boss', 'byte-doc', 'tag-ai'
  title TEXT NOT NULL,
  emoji TEXT,
  system_prompt TEXT NOT NULL,  -- Personality prompt
  capabilities TEXT[],
  tools_allowed TEXT[],
  model TEXT DEFAULT 'gpt-4o-mini',
  temperature NUMERIC DEFAULT 0.7,
  max_tokens INT DEFAULT 2000,
  is_active BOOLEAN DEFAULT true
);
```

#### Memory Tables

**`user_memory_facts`** - Long-term user facts
```sql
CREATE TABLE user_memory_facts (
  id UUID PRIMARY KEY,
  user_id TEXT NOT NULL,
  scope TEXT NOT NULL,  -- 'global', 'prime-boss', 'byte-doc', etc.
  fact TEXT NOT NULL,
  confidence INT DEFAULT 80,
  source TEXT,
  is_pinned BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

**`memory_embeddings`** - Vector embeddings for RAG
```sql
CREATE TABLE memory_embeddings (
  id UUID PRIMARY KEY,
  user_id TEXT NOT NULL,
  owner_scope TEXT NOT NULL,  -- 'receipt', 'bank-statement', 'fact', etc.
  source_id TEXT,
  chunk TEXT NOT NULL,
  embedding vector(1536) NOT NULL,  -- OpenAI text-embedding-3-large
  metadata JSONB DEFAULT '{}',
  token_count INT,
  created_at TIMESTAMPTZ
);
```

**`chat_session_summaries`** - Rolling conversation summaries
```sql
CREATE TABLE chat_session_summaries (
  session_id UUID PRIMARY KEY REFERENCES chat_sessions(id),
  summary TEXT NOT NULL,
  key_facts TEXT[] DEFAULT '{}',
  last_summarized_message_id UUID,
  token_count INT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

#### Analytics Tables

**`chat_usage_log`** - Token usage and performance tracking
```sql
CREATE TABLE chat_usage_log (
  id UUID PRIMARY KEY,
  user_id TEXT NOT NULL,
  session_id UUID REFERENCES chat_sessions(id),
  employee_slug TEXT,
  prompt_tokens INT,
  completion_tokens INT,
  total_tokens INT,
  model TEXT NOT NULL,
  latency_ms INT,
  duration_ms INT,
  tools_used TEXT[],
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  created_at TIMESTAMPTZ
);
```

### Multi-Agent System Implementation

The system supports **30+ specialized AI employees**, each with:
- Unique personality (system prompt)
- Specific capabilities (document processing, categorization, analytics, etc.)
- Allowed tools (OCR, sheet export, bank matching, etc.)
- Model configuration (temperature, max tokens)

**Key Employees:**
- **Prime** (`prime-boss`) - CEO & Orchestrator
- **Byte** (`byte-doc`) - Document Processing Specialist
- **Tag** (`tag-ai`) - Categorization Expert
- **Crystal** (`crystal-ai`) - Analytics & Insights
- **Finley** (`finley-ai`) - Forecasting & Planning
- **Goalie** (`goalie-ai`) - Goal Tracking
- **Liberty** (`liberty-ai`) - Debt Freedom Coach
- **Blitz** (`blitz-ai`) - Rapid Actions & Alerts
- **Chime** (`chime-ai`) - Smart Notifications
- **Ledger** (`ledger-tax`) - Tax Specialist
- ... and 20+ more

---

## 2. Prime's Routing System

### Routing Logic

Prime uses **intelligent keyword-based routing** with pattern matching to determine which specialist should handle a query. The routing happens in `netlify/functions/_shared/router.ts`.

### Routing Flow

```typescript
// Simplified routing logic
export async function routeToEmployee(params: {
  userText: string;
  requestedEmployee?: string | null;
  conversationHistory?: Msg[];
  mode?: 'strict' | 'balanced' | 'creative';
}) {
  // 1. If specific employee requested, honor it (with smart overrides)
  if (requestedEmployee) {
    // Special case: Prime → Blitz for action requests
    if (isPrime && wantsActions) {
      return { employee: 'blitz-ai' };
    }
    return { employee: requestedEmployee };
  }

  // 2. Pattern matching for auto-routing
  const lower = userText.toLowerCase();
  
  // Crystal: Income/expense summaries
  if (/how much did i (make|spend)/i.test(lower)) {
    return { employee: 'crystal-ai' };
  }
  
  // Byte: Document processing
  if (/(receipt|invoice|upload|scan|document|ocr)/i.test(lower)) {
    return { employee: 'byte-doc' };
  }
  
  // Tag: Categorization
  if (/(categor|tag|classify|organize expense)/i.test(lower)) {
    return { employee: 'tag-ai' };
  }
  
  // Liberty: Debt & freedom
  if (/\b(debt|loan|mortgage|credit card|pay.*off|financial freedom)\b/i.test(lower)) {
    return { employee: 'liberty-ai' };
  }
  
  // Blitz: Action plans
  if (/(action plan|next steps|checklist|todo list)/i.test(lower)) {
    return { employee: 'blitz-ai' };
  }
  
  // Finley: Forecasting
  if (/(forecast|future|plan|timeline|how long|by december)/i.test(lower)) {
    return { employee: 'finley-ai' };
  }
  
  // Goalie: Goals
  if (/(goal|progress|milestone|save.*goal)/i.test(lower)) {
    return { employee: 'goalie-ai' };
  }
  
  // Chime: Reminders
  if (/(remind|alert|notification|nudge|due in|upcoming)/i.test(lower)) {
    return { employee: 'chime-ai' };
  }
  
  // Default: Prime
  return { employee: 'prime-boss' };
}
```

### Cross-Agent Collaboration

**Current State**: Limited cross-agent collaboration. Each employee works independently.

**Handoff Mechanism**: When Prime routes to a specialist, a handoff message is added:
```typescript
{
  role: 'system',
  content: 'Prime handed you off to Byte for document processing'
}
```

**Future Vision**: Multi-agent collaboration where:
- Prime delegates to multiple specialists simultaneously
- Specialists can query each other
- Results are aggregated by Prime

### Specialist Personalities

Each specialist has a unique **system prompt** stored in `employee_profiles.system_prompt`:

**Prime Example:**
```
You are Prime, the strategic mastermind and CEO of the XSpensesAI ecosystem.
You're the first point of contact and the orchestrator of 30 specialized AI employees.
You speak with executive confidence, strategic vision, and always maintain a 
bird's-eye view of the user's financial situation.
```

**Byte Example:**
```
You are Byte, the enthusiastic document processing specialist. You LOVE organizing 
data and turning chaotic documents into beautiful, structured information. Your 
specialty is OCR, document parsing, categorization, and data extraction.
```

**Tag Example:**
```
You are Tag, the meticulous categorization specialist who sees patterns everywhere.
You're passionate about organizing transactions, finding spending patterns, and 
creating perfect categorization rules.
```

---

## 3. Chat Interface Components

### Main Components

#### `UnifiedAssistantChat.tsx` (Primary Component)
**Location**: `src/components/chat/UnifiedAssistantChat.tsx`

**Purpose**: Single unified chat interface for all AI employees

**Features**:
- Employee switching
- File uploads
- Streaming responses (SSE)
- Message history
- Guardrails status display
- Mobile-responsive

**Props**:
```typescript
interface UnifiedAssistantChatProps {
  isOpen: boolean;
  onClose: () => void;
  initialEmployeeSlug?: string;  // 'prime-boss', 'byte-doc', etc.
  conversationId?: string;
  context?: {
    page?: string;
    filters?: any;
    selectionIds?: string[];
    data?: any;
  };
  initialQuestion?: string;
}
```

#### `PrimeChatInterface.tsx` (Legacy)
**Location**: `src/components/chat/_legacy/PrimeChatInterface.tsx`

**Status**: Legacy component, being phased out in favor of `UnifiedAssistantChat`

#### `ByteDocumentChat.tsx` (Legacy)
**Location**: `src/components/chat/_legacy/ByteDocumentChat.tsx`

**Status**: Legacy component, specialized for Byte document processing

### Component Structure

```
UnifiedAssistantChat
├── Header (Employee avatar, name, role)
├── Messages Container (scrollable)
│   ├── MessageBubble (user messages)
│   ├── MessageBubble (assistant messages)
│   └── TypingIndicator (when streaming)
├── File Upload Area (drag & drop)
└── Input Area
    ├── Textarea (message input)
    ├── File Upload Button
    └── Send Button
```

### UI Patterns

**Message Bubbles**:
- User messages: Right-aligned, blue background
- Assistant messages: Left-aligned, dark background
- System messages: Centered, subtle styling

**Typing Indicator**:
- Shows "Working..." when `isStreaming === true`
- Animated dots during response generation

**File Upload**:
- Drag & drop zone
- File preview thumbnails
- Upload progress indicator
- Integration with Smart Import pipeline

### Different Interfaces

**Desktop**: Slide-out panel from right (420px wide, full height)

**Mobile**: Full-screen modal overlay

**Embedded**: Can be embedded in any page with context

---

## 4. Message Flow & State Management

### Message Flow

```
1. User types message → Frontend
   ↓
2. usePrimeChat hook sends POST to /.netlify/functions/chat
   Body: { userId, employeeSlug, message, sessionId, stream: true }
   ↓
3. Backend (chat.ts):
   a. Guardrails check (PII masking, moderation)
   b. Session management (get/create session)
   c. Memory retrieval (facts + RAG)
   d. Employee routing (if not specified)
   e. Context building (system prompt + history + memory)
   f. OpenAI API call (streaming)
   ↓
4. SSE Stream → Frontend
   Events: 'text', 'tool_call', 'done', 'error'
   ↓
5. Frontend updates UI in real-time
   ↓
6. Backend saves messages to database
   ↓
7. Memory extraction (async, queued)
```

### API Endpoints

#### Main Chat Endpoint
**`POST /.netlify/functions/chat`**

**Request**:
```typescript
{
  userId: string;
  employeeSlug?: string;  // Optional, defaults to 'prime-boss'
  message: string;
  sessionId?: string;     // Optional, creates new if missing
  stream?: boolean;       // Default: true
  systemPromptOverride?: string;  // Custom context
}
```

**Response**: SSE Stream
```
event: text
data: {"content": "Hello", "chunk": true}

event: done
data: {"sessionId": "uuid", "messageId": "uuid", "tokens": {...}}
```

### State Management

**React Hooks**:
- `usePrimeChat` - Main chat hook with streaming
- `useChat` - Simple chat hook (non-streaming)
- `useChatSessions` - Session management
- `useChatHistory` - Load conversation history
- `useUnifiedChatLauncher` - Global chat launcher

**State Structure**:
```typescript
interface ChatState {
  messages: ChatMessage[];
  input: string;
  isStreaming: boolean;
  uploads: UploadItem[];
  activeEmployeeSlug: string;
  headers: ChatHeaders;  // Guardrails, memory hits, etc.
  toolCalls: ToolCallDebug[];
}
```

### Real-time Messaging

**Server-Sent Events (SSE)**:
- Streaming responses token-by-token
- No WebSocket overhead
- Automatic reconnection
- Browser-native support

**Implementation**:
```typescript
const eventSource = new EventSource('/.netlify/functions/chat', {
  method: 'POST',
  body: JSON.stringify({ userId, message, stream: true })
});

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.type === 'text') {
    appendToken(data.content);
  }
};
```

### Context Maintenance

**Session-Based Context**:
- Each `chat_sessions` record maintains conversation state
- `context` JSONB field stores session-specific data
- `last_message_at` tracks activity

**Memory Context**:
- **Recent Messages**: Last 10-20 messages loaded
- **Session Summary**: Rolling summary for older messages
- **User Facts**: Pinned facts always included
- **RAG Retrieval**: Semantic search for relevant memories

**Context Building** (`netlify/functions/_shared/memory.ts`):
```typescript
async function buildContext(params: {
  userId: string;
  employeeSlug: string;
  sessionId: string;
  userInput: string;
  topK?: number;
  tokenBudget?: number;
}) {
  // 1. Get employee profile
  const employee = await getEmployeeProfile(employeeSlug);
  
  // 2. Get recent messages (last 10)
  const recentMessages = await getRecentMessages(sessionId, 10);
  
  // 3. Get session summary (if exists)
  const summary = await getSessionSummary(sessionId);
  
  // 4. Get pinned facts
  const pinnedFacts = await getPinnedFacts(userId);
  
  // 5. RAG retrieval (semantic search)
  const ragResults = await recall({
    userId,
    query: userInput,
    k: 5
  });
  
  // 6. Assemble messages array
  return {
    messages: [
      { role: 'system', content: employee.system_prompt },
      ...(summary ? [{ role: 'system', content: `Previous conversation: ${summary.summary}` }] : []),
      ...(pinnedFacts.length > 0 ? [{ role: 'system', content: `User facts: ${pinnedFacts.map(f => f.fact).join(', ')}` }] : []),
      ...recentMessages.map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content: userInput }
    ],
    tokensUsed: estimateTokens(messages)
  };
}
```

---

## 5. AI Integration

### AI Service

**OpenAI API**:
- **Models**: GPT-4o-mini (default), GPT-4o (for complex tasks)
- **Embeddings**: text-embedding-3-large (1536 dimensions)
- **Streaming**: Enabled for all responses
- **Temperature**: Configurable per employee (0.3-0.9)

### Specialist Implementation

**30+ Different Personalities**:
Each specialist has a unique `system_prompt` stored in `employee_profiles`:

```sql
SELECT slug, title, emoji, system_prompt, model, temperature
FROM employee_profiles
WHERE is_active = true;
```

**Example System Prompts**:

**Prime**:
```
You are Prime, the strategic mastermind and CEO of the XSpensesAI ecosystem.
You're the first point of contact and the orchestrator of 30 specialized AI employees.
You speak with executive confidence, strategic vision, and always maintain a 
bird's-eye view of the user's financial situation.
```

**Byte**:
```
You are Byte, the enthusiastic document processing specialist. You LOVE organizing 
data and turning chaotic documents into beautiful, structured information. Your 
specialty is OCR, document parsing, categorization, and data extraction.
```

**Tag**:
```
You are Tag, the meticulous categorization specialist who sees patterns everywhere.
You're passionate about organizing transactions, finding spending patterns, and 
creating perfect categorization rules.
```

### Conversation Context

**Context Assembly** (in `chat.ts`):
```typescript
const messages = [
  // 1. System prompt (employee personality)
  { role: 'system', content: employee.system_prompt },
  
  // 2. Session summary (if exists)
  ...(summary ? [{ role: 'system', content: `Previous: ${summary.summary}` }] : []),
  
  // 3. Pinned facts (always included)
  ...(pinnedFacts.map(f => ({ role: 'system', content: `Fact: ${f.fact}` }))),
  
  // 4. RAG results (semantic search)
  ...(ragResults.map(r => ({ role: 'system', content: `Relevant: ${r.chunk}` }))),
  
  // 5. Recent messages (last 10)
  ...recentMessages.map(m => ({ role: m.role, content: m.content })),
  
  // 6. Current user input
  { role: 'user', content: maskedUserInput }
];
```

**Token Budget**: Default 6000 tokens, configurable per employee

---

## 6. Specialist-Specific Features

### Byte - OCR Integration

**Document Upload in Chat**:
```typescript
// UnifiedAssistantChat.tsx
const handleFileUpload = async (files: FileList) => {
  // 1. Upload file via Smart Import pipeline
  const { docId, importId } = await uploadFile(files[0]);
  
  // 2. Add upload context to message
  setUploadContext({ docId, importId });
  
  // 3. Send message with document context
  await send(`I just uploaded ${files[0].name}. Process it.`);
};
```

**Byte's OCR Tools**:
- `ocr` tool - Extract text from images/PDFs
- `sheet_export` tool - Export to Google Sheets
- `bank_match` tool - Match transactions to statements

**Integration Points**:
- `netlify/functions/smart-import-init` - Initialize import
- `netlify/functions/smart-import-ocr` - OCR processing
- `netlify/functions/byte-ocr-parse` - Parse OCR results
- `netlify/functions/normalize-transactions` - Normalize data

### Tag - Categorization

**Auto-Categorization**:
- Tag can categorize transactions automatically
- Uses pattern matching + user preferences
- Creates categorization rules for recurring patterns

**Tools**:
- `bank_match` - Match transactions to categories
- Access to `transactions` table for pattern analysis

### Crystal - Analytics

**Data Access**:
- Reads from `transactions` table
- Generates income/expense summaries
- Identifies spending patterns
- Top merchants, categories, trends

**Example Queries**:
```typescript
// Crystal can query transactions
const { data } = await supabase
  .from('transactions')
  .select('*')
  .eq('user_id', userId)
  .gte('posted_at', startDate)
  .lte('posted_at', endDate);
```

### Specialist Actions

**Tag Actions**:
- Auto-categorize transactions
- Create categorization rules
- Suggest category improvements

**Crystal Actions**:
- Generate spending reports
- Identify trends
- Predict future spending

**Goalie Actions**:
- Track goal progress
- Update goal milestones
- Suggest goal adjustments

**Blitz Actions**:
- Generate action plans
- Create checklists
- Prioritize tasks

---

## 7. Chat History & Memory

### History Persistence

**Unlimited History**:
- All messages stored in `chat_messages` table
- No automatic deletion
- Paginated loading (50 messages per page)

**Session Management**:
- Each user + employee combination has a session
- Sessions persist across browser sessions
- `sessionId` stored in localStorage

### Search Function

**Full-Text Search**:
```sql
-- Search messages (on redacted_content for safety)
SELECT * FROM chat_messages
WHERE session_id = $1
  AND to_tsvector('english', coalesce(redacted_content, content)) 
      @@ plainto_tsquery('english', $2)
ORDER BY created_at DESC;
```

**Frontend Search**:
- Search within current conversation
- Search across all conversations
- Filter by employee, date range

### Switching Between Specialists

**Employee Switching**:
- User can switch employees mid-conversation
- Each employee maintains separate session
- Context is employee-specific

**Shared Context** (Future):
- Prime can access context from other specialists
- Cross-employee memory sharing via `scope: 'global'`

### Context Sharing

**Current State**: Limited sharing
- Each employee has separate session
- Global facts (`scope: 'global'`) shared across all employees
- Employee-specific facts (`scope: 'prime-boss'`) only for that employee

**Future Vision**:
- Prime can query other specialists' sessions
- Cross-employee collaboration
- Shared memory pool

---

## 8. UI/UX Patterns

### Current Chat Interface

**Desktop**:
- Slide-out panel from right (420px wide)
- Fixed position, full height
- Dark theme (slate-900 background)
- Employee avatar + name in header

**Mobile**:
- Full-screen modal overlay
- Bottom sheet on smaller screens
- Touch-optimized input area

### Accessing Specialists

**Methods**:
1. **Employee Switcher Dropdown** - In chat header
2. **Direct Navigation** - `/dashboard/prime-chat`, `/dashboard/smart-import-ai`
3. **Prime Routing** - Prime automatically routes to specialists
4. **Quick Actions** - Suggested prompts in chat

**Employee Switcher**:
```typescript
<select onChange={(e) => setActiveEmployee(e.target.value)}>
  <option value="prime-boss">👑 Prime</option>
  <option value="byte-doc">📄 Byte</option>
  <option value="tag-ai">🏷️ Tag</option>
  <option value="crystal-ai">🔮 Crystal</option>
  {/* ... 30+ more */}
</select>
```

### Quick Actions / Suggested Prompts

**Example Prompts**:
- "Upload a receipt"
- "Categorize my transactions"
- "Show my spending summary"
- "Help me pay off debt"
- "Set a savings goal"

**Implementation**:
- Stored in `employee_profiles.capabilities`
- Displayed as chips below input
- Click to auto-fill message

### Specialist Joining Experience

**Handoff Flow**:
1. User asks Prime a question
2. Prime determines specialist needed
3. System message: "Prime handed you off to Byte"
4. Byte responds with context from Prime
5. Conversation continues with Byte

**Visual Indicators**:
- Handoff badge in message
- Employee avatar changes
- Smooth transition animation

---

## 9. Integration Points

### Dashboard Integration

**Chat Launcher**:
- Floating button (bottom-right)
- Desktop sidebar tab (right edge)
- Header button (mobile)

**Context Passing**:
```typescript
// From Transactions page
<UnifiedAssistantChat
  context={{
    page: 'transactions',
    filters: { dateRange: {...}, categories: [...] },
    selectionIds: ['tx-1', 'tx-2']
  }}
  initialQuestion="Help me review these transactions"
/>
```

### Specialist Actions

**Transaction Actions**:
- Tag can categorize transactions
- Crystal can generate reports
- Byte can process receipts

**Goal Actions**:
- Goalie can create/update goals
- Blitz can generate action plans

**Document Actions**:
- Byte can process uploads
- Tag can extract categories from receipts

### Links to Pages

**Deep Linking**:
- Chat can generate links to specific pages
- Example: "View your transactions" → `/dashboard/transactions`
- Example: "Review this document" → `/dashboard/smart-import-ai?doc=123`

**Implementation**:
```typescript
// In AI response
const response = `I found 5 transactions. [View them here](/dashboard/transactions?filter=recent)`;
```

### OCR/Transaction Workflow Integration

**Complete Flow**:
```
1. User uploads document in chat
   ↓
2. Byte processes via OCR pipeline
   ↓
3. Transactions extracted to transactions_staging
   ↓
4. User reviews in Transactions page
   ↓
5. User approves/rejects in chat or Transactions page
   ↓
6. Approved transactions → transactions table
```

**Chat → OCR Integration**:
```typescript
// UnifiedAssistantChat.tsx
const handleFileUpload = async (files: FileList) => {
  // Upload via Smart Import
  const { docId, importId } = await uploadFile(files[0]);
  
  // Trigger OCR processing
  await fetch('/.netlify/functions/byte-ocr-parse', {
    method: 'POST',
    body: JSON.stringify({ importId })
  });
  
  // Notify user in chat
  await send(`Processing ${files[0].name}...`);
};
```

---

## 10. Technical Implementation Details

### File Structure

```
src/
├── components/chat/
│   ├── UnifiedAssistantChat.tsx      # Main chat component
│   ├── DesktopChatSideBar.tsx         # Right-edge tab
│   ├── ChatHistorySidebar.tsx        # History panel
│   ├── PrimeSidebarChat.tsx           # Prime-specific chat
│   └── _legacy/                       # Legacy components
│       ├── PrimeChatInterface.tsx
│       └── ByteDocumentChat.tsx
│
├── hooks/
│   ├── usePrimeChat.ts                # Main chat hook (streaming)
│   ├── useChat.ts                     # Simple chat hook
│   ├── useChatSessions.ts             # Session management
│   ├── useChatHistory.ts              # History loading
│   └── useUnifiedChatLauncher.ts      # Global launcher
│
├── lib/
│   ├── chat-api.ts                    # API client
│   └── chatEndpoint.ts               # Endpoint configuration
│
└── contexts/
    └── PrimeChatContext.tsx           # Chat context (if used)

netlify/functions/
├── chat.ts                            # Main chat endpoint
└── _shared/
    ├── router.ts                      # Employee routing
    ├── memory.ts                      # Memory API
    ├── session.ts                     # Session management
    ├── guardrails-unified.ts          # Security layer
    └── employeeModelConfig.ts         # Model configs

chat_runtime/
├── types.ts                           # Type definitions
├── memory.ts                          # Memory manager (deprecated)
└── tools/                             # Tool implementations
    ├── ocr.ts
    ├── delegate.ts
    └── ...

supabase/migrations/
├── 000_centralized_chat_runtime.sql   # Core schema
└── 20251016_chat_v3_production.sql    # Production updates
```

### Key Functions

#### Frontend

**`usePrimeChat` Hook** (`src/hooks/usePrimeChat.ts`):
```typescript
export function usePrimeChat(
  userId: string,
  sessionId?: string,
  employeeOverride?: EmployeeOverride,
  systemPrompt?: string | null,
  initialMessages?: ChatMessage[]
) {
  // State management
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  
  // Send message with streaming
  const send = async (text: string) => {
    // POST to chat endpoint
    // Handle SSE stream
    // Update messages in real-time
  };
  
  return { messages, send, isStreaming, ... };
}
```

#### Backend

**`chat.ts` Handler** (`netlify/functions/chat.ts`):
```typescript
export const handler: Handler = async (event) => {
  // 1. Parse request
  const { userId, employeeSlug, message, sessionId } = JSON.parse(event.body);
  
  // 2. Guardrails (PII masking, moderation)
  const guardrailResult = await runInputGuardrails(maskedMessage);
  if (guardrailResult.blocked) {
    return sendBlockedResponse(guardrailResult);
  }
  
  // 3. Session management
  const session = await ensureSession(userId, sessionId, employeeSlug);
  
  // 4. Memory retrieval
  const memory = await getMemory({
    userId,
    employeeSlug,
    sessionId: session.id,
    userInput: message
  });
  
  // 5. Employee routing (if not specified)
  const routing = await routeToEmployee({
    userText: message,
    requestedEmployee: employeeSlug
  });
  
  // 6. Build context
  const context = await buildContext({
    userId,
    employeeSlug: routing.employee,
    sessionId: session.id,
    userInput: message,
    memory
  });
  
  // 7. OpenAI streaming
  const stream = await openai.chat.completions.create({
    model: employee.model,
    messages: context.messages,
    stream: true
  });
  
  // 8. Stream to client (SSE)
  return streamSSE(stream);
  
  // 9. Save messages (after streaming completes)
  await saveMessage(session.id, userMessage);
  await saveMessage(session.id, assistantMessage);
};
```

### State Management Approach

**React Hooks** (No Redux):
- `useState` for local component state
- `useContext` for global chat state (optional)
- Custom hooks for reusable logic

**Session Storage**:
- `sessionId` stored in localStorage
- Persists across page reloads
- Per user + employee combination

### Error Handling

**Error States**:
```typescript
interface ChatError {
  type: 'network' | 'rate_limit' | 'guardrail' | 'openai' | 'unknown';
  message: string;
  retryable: boolean;
  retryAfter?: number;
}
```

**Error Recovery**:
- Automatic retry for network errors
- Rate limit handling with backoff
- User-friendly error messages
- Fallback to non-streaming mode

### Rate Limiting

**Implementation** (`netlify/functions/_shared/rate-limit.ts`):
```typescript
// 20 requests per minute per user
await assertWithinRateLimit(userId, 20);
```

**Database Table**:
```sql
CREATE TABLE rate_limits (
  user_id TEXT PRIMARY KEY,
  window_start TIMESTAMPTZ NOT NULL,
  count INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### Loading States

**Indicators**:
- `isStreaming` - Shows typing indicator
- `isLoading` - Shows loading spinner
- `uploadingFile` - Shows upload progress

**Skeleton States**:
- Message list skeleton while loading history
- Input disabled while streaming

---

## Integration Guide: Transactions Page + Chat

### User Journey: Upload → OCR → Chat → Review → Approval

```
1. USER UPLOADS DOCUMENT
   ↓
   User drags file into chat OR clicks upload button
   ↓
   UnifiedAssistantChat.handleFileUpload()
   ↓
   uploadFile() → Smart Import pipeline
   ↓
   Returns: { docId, importId }

2. OCR PROCESSING
   ↓
   Backend: byte-ocr-parse function
   ↓
   Google Vision API extracts text
   ↓
   Normalize transactions → transactions_staging table
   ↓
   Calculate confidence scores
   ↓
   Check for duplicates

3. CHAT NOTIFICATION
   ↓
   Byte responds in chat: "I processed your document!"
   ↓
   Shows extracted transactions preview
   ↓
   Suggests: "Review these transactions?"

4. TRANSACTION REVIEW
   ↓
   User clicks "Review" → Navigate to Transactions page
   ↓
   Transactions page shows pending transactions
   ↓
   User can:
   - Approve high-confidence items
   - Review low-confidence items
   - Edit incorrect data
   - Reject duplicates

5. APPROVAL WORKFLOW
   ↓
   User approves transaction
   ↓
   Backend: Move from transactions_staging → transactions
   ↓
   Chat notification: "Transaction approved!"
   ↓
   Tag can auto-categorize
   ↓
   Crystal can update analytics
```

### Code Integration Points

**1. Chat → Transactions Page**:
```typescript
// In UnifiedAssistantChat.tsx
const handleTransactionReview = () => {
  navigate('/dashboard/transactions', {
    state: {
      pendingTransactions: true,
      importId: uploadContext?.importId
    }
  });
};
```

**2. Transactions Page → Chat**:
```typescript
// In TransactionsPage.tsx
const handleChatAboutTransaction = (tx: Transaction) => {
  openChat({
    initialEmployeeSlug: 'byte-doc',
    context: {
      page: 'transactions',
      selectionIds: [tx.id],
      data: tx
    },
    initialQuestion: `Help me review this transaction: ${tx.merchant_name}`
  });
};
```

**3. Byte Processing → Transactions**:
```typescript
// In chat.ts (backend)
if (employeeSlug === 'byte-doc' && uploadContext) {
  // Trigger OCR processing
  await processDocument(uploadContext.docId);
  
  // Notify user
  await sendMessage({
    content: `I processed ${docName}. Found ${count} transactions.`,
    actions: [
      { label: 'Review Transactions', action: 'navigate', url: '/dashboard/transactions' }
    ]
  });
}
```

---

## Summary

### Key Takeaways

1. **Unified Chat System**: Single `UnifiedAssistantChat` component handles all employees
2. **Prime Orchestration**: Prime routes queries to 30+ specialists intelligently
3. **Session-Based**: Each user + employee has persistent session
4. **Memory System**: RAG + facts + summaries for context
5. **Streaming Responses**: SSE for real-time token streaming
6. **Security**: Guardrails (PII masking, moderation) on all messages
7. **OCR Integration**: Byte processes documents → transactions_staging → transactions
8. **Cross-Page Integration**: Chat can navigate to pages, pages can open chat

### Integration Checklist

- ✅ Chat system fully functional
- ✅ OCR pipeline integrated
- ✅ Transactions page ready for review workflow
- ✅ Memory system operational
- ✅ Routing system working
- 🔄 Multi-agent collaboration (limited, improving)
- 🔄 Cross-page deep linking (partial)

### Next Steps for Transactions Integration

1. **Add Chat Actions to Transactions Page**:
   - "Chat about this transaction" button
   - "Ask Byte to process this document" button
   - "Get Tag's categorization suggestion" button

2. **Enhance Byte's OCR Responses**:
   - Show transaction preview in chat
   - Link to Transactions page for review
   - Auto-categorize high-confidence items

3. **Cross-Specialist Collaboration**:
   - Byte → Tag: "Categorize these transactions"
   - Tag → Crystal: "Analyze spending patterns"
   - Crystal → Goalie: "Update goal progress"

---

**Document Status**: ✅ Complete  
**Last Updated**: January 15, 2025  
**Maintained By**: System Architecture Team









