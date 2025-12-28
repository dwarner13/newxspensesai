# Chat → Employees Wiring Map

**Date:** 2025-01-XX  
**Purpose:** Complete architectural mapping of chat system, employee routing, tool execution, and data persistence

---

## A) Canonical Chat UI (Production)

### ✅ **PRIMARY: `src/components/chat/UnifiedAssistantChat.tsx`**

**Status:** ✅ **PRODUCTION** - Used in all dashboard pages

**Purpose:** Unified chat interface for all AI employees. Renders as slideout panel, overlay, or inline page.

**Key Code (lines 94-107):**
```typescript
export default function UnifiedAssistantChat({
  isOpen = false,
  onClose,
  initialEmployeeSlug = 'prime-boss',
  conversationId,
  context,
  initialQuestion,
  mode = 'slideout', // Default to slideout
  renderMode = mode === 'inline' ? 'page' : 'slideout',
  disableRuntime = renderMode === 'page',
}: UnifiedAssistantChatProps)
```

**Usage Locations:**
- `src/layouts/DashboardLayout.tsx` (line ~1129) - Main dashboard slideout
- `src/pages/dashboard/PrimeChatPage.tsx` - Prime Chat page (via `openChat()` launcher)
- `src/pages/dashboard/CustodianPage.tsx` - Custodian page (fullscreen mode)
- All employee pages use `useUnifiedChatLauncher()` hook which opens `UnifiedAssistantChat`

**Key Features:**
- History loading (lines 210-325)
- Greeting system (lines 1107-1288)
- Message display with Prime greeting card (lines 1779-1855)
- Auto-scroll to bottom (lines 720-730)
- Handoff detection (lines 1072-1091)

---

### ❌ **DEMO-ONLY: `src/ui/components/PrimeChatDrawer.tsx`**

**Status:** ❌ **DEMO ONLY** - Not used in production

**Evidence:**
- Line 44-49: Returns hardcoded demo response: `"This is a demo response from the Prime Agent Kernel. In production, this would connect to the AI backend..."`
- No actual API calls to `/.netlify/functions/chat`
- No SSE parsing
- No tool execution

**Usage:** Only referenced in `src/ui/pages/PrimeLabPage.tsx` (lab/testing page)

**Conclusion:** `UnifiedAssistantChat` is the **ONLY** production chat UI.

---

## B) Hook That Calls Backend & Parses SSE

### ✅ **PRIMARY: `src/hooks/usePrimeChat.ts`**

**Purpose:** Core chat engine hook. Calls `/.netlify/functions/chat`, parses SSE stream, handles tool calls, manages messages.

**Key Code - Endpoint (lines 186-202):**
```typescript
const endpoint = useMemo(() => {
  const defaultEndpoint = CHAT_ENDPOINT || '/.netlify/functions/chat';
  // Ensure endpoint is always a valid string
  if (typeof defaultEndpoint === 'string' && defaultEndpoint.trim()) {
    return defaultEndpoint.trim();
  }
  return '/.netlify/functions/chat';
}, []);
```

**Key Code - SSE Parsing (lines 245-350):**
```typescript
const parseSSEEvent = useCallback((event: string, aiText: string, aiId: string) => {
  const lines = event.split('\n');
  let currentEventType: string | null = null;
  
  for (const line of lines) {
    // Handle event type line (event: meta)
    if (line.startsWith('event: ')) {
      currentEventType = line.slice(7).trim();
      continue;
    }
    
    if (line.startsWith('data: ')) {
      const payload = line.slice(6).trim();
      const j = JSON.parse(payload);
      
      // Handle guardrails status from meta events
      if (currentEventType === 'meta' && j.guardrails && typeof j.guardrails === 'object') {
        setGuardrailsStatus(j.guardrails);
        continue;
      }
      
      // Handle employee handoff events
      if (j.type === 'handoff' && j.from && j.to) {
        setActiveEmployeeSlug(j.to);
        // Add system message
        return { aiText, hasContent };
      }
      
      // Handle employee header updates
      if (j.type === 'employee' && j.employee) {
        setActiveEmployeeSlug(j.employee);
      }
      
      // Handle token/content chunks
      const frag = j?.choices?.[0]?.delta?.content ?? j?.content ?? j?.token ?? '';
      if (frag) {
        aiText += frag;
        setMessages(prev => prev.map(m => m.id === aiId ? { ...m, content: String(aiText || '') } : m));
      }
    }
  }
}, []);
```

**Key Code - Request Building (lines 518-527):**
```typescript
const requestBody = {
  userId: safeUserId,
  sessionId: effectiveSessionId || sessionId,
  message: content,
  employeeSlug,
  ...(safeSystemPrompt ? { systemPromptOverride: safeSystemPrompt } : {}),
  ...(opts?.documentIds && opts.documentIds.length > 0 ? { documentIds: opts.documentIds } : {}),
  ...(primeContext ? { prime_context: primeContext } : {}), // PrimeState snapshot for Prime only
};
```

**Key Code - Fetch & Stream (lines 550-650):**
```typescript
const res = await fetch(endpoint, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${session.access_token}`,
  },
  body: JSON.stringify(requestBody),
});

// Parse SSE stream
const reader = res.body?.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  
  const chunk = decoder.decode(value);
  const events = chunk.split('\n\n');
  
  for (const event of events) {
    parseSSEEvent(event, aiText, aiId);
  }
}
```

**Guardrails Status Extraction:**
- Line 265-272: Parses `event: meta` with `guardrails` object
- Line 142-150: State: `guardrailsStatus` with `enabled`, `pii_masking`, `moderation`, `policy_version`, `checked_at`, `mode`

**Employee Slug Extraction:**
- Line 289-294: Parses `{ type: 'employee', employee: 'prime-boss' }`
- Line 275-286: Parses `{ type: 'handoff', from: 'prime-boss', to: 'byte-docs' }`
- Line 243: State: `activeEmployeeSlug` tracks current employee (updates on handoff)

---

### ✅ **WRAPPER: `src/hooks/useUnifiedChatEngine.ts`**

**Purpose:** Wraps `usePrimeChat` for consistent API across all chat UIs.

**Key Code (lines 137-152):**
```typescript
export function useUnifiedChatEngine(options: UnifiedChatEngineOptions = {}): UnifiedChatEngineReturn {
  const { userId } = useAuth();
  
  const employeeOverride = useMemo(() => {
    return mapEmployeeSlugToOverride(options.employeeSlug);
  }, [options.employeeSlug]);
  
  const primeChat = usePrimeChat(
    userId || 'temp-user',
    options.conversationId,
    employeeOverride,
    options.systemPromptOverride,
    options.initialMessages // Pass loaded history here
  );
  
  return {
    messages: primeChat.messages,
    sendMessage: (content, opts) => primeChat.send(content, { documentIds: opts?.documentIds }),
    isStreaming: primeChat.isStreaming,
    // ... other fields
  };
}
```

**Slug Mapping (lines 102-130):**
```typescript
function mapEmployeeSlugToOverride(employeeSlug?: string): EmployeeOverride | undefined {
  const slugMap: Record<string, EmployeeOverride> = {
    'prime-boss': 'prime',
    'byte-docs': 'byte',
    'tag-ai': 'tag',
    'crystal-analytics': 'crystal',
    'custodian-settings': 'custodian',
    'custodian': 'custodian',
    // ... all employees
  };
  return slugMap[employeeSlug] || 'prime';
}
```

---

## C) Backend Routing (`netlify/functions/chat.ts`)

### **Slug Normalization**

**Location:** `netlify/functions/chat.ts` lines 3051-3080

**Key Code:**
```typescript
function normalizeEmployeeSlug(slug: string | null | undefined): string | null {
  if (!slug) return null;
  
  // Known aliases (UI shortcuts)
  const aliasMap: Record<string, string> = {
    'prime': 'prime-boss',
    'byte': 'byte-docs',
    'tag': 'tag-ai',
    'crystal': 'crystal-analytics',
    // ... more aliases
  };
  
  const normalized = aliasMap[slug.toLowerCase()] || slug;
  return normalized;
}
```

**Router Integration (lines 908-944):**
```typescript
const requestedEmployeeSlug = employeeSlug 
  ? normalizeEmployeeSlug(employeeSlug) // Normalizes aliases
  : null; // null = auto-route

let routing = await routeToEmployee({
  userText: masked,
  requestedEmployee: requestedEmployeeSlug,
  mode: preset,
});

// Router's resolveSlug() handles full canonicalization
finalEmployeeSlug = routing.employee || requestedEmployeeSlug || 'prime-boss';
```

**Router File:** `netlify/functions/_shared/router.ts`
- Line 17: Calls `resolveSlug()` from `src/employees/registry.ts`
- Line 137: Uses `resolveSlug()` for canonicalization
- `resolveSlug()` queries `employee_profiles` table to get canonical slug

---

### **Tool Allowlist Per Employee**

**Location:** `netlify/functions/chat.ts` lines 958-1022

**Key Code:**
```typescript
// Load employee profile from database
const { data: employeeProfile } = await sb
  .from('employee_profiles')
  .select('tools_allowed, system_prompt')
  .eq('slug', finalEmployeeSlug)
  .maybeSingle();

if (employeeProfile?.tools_allowed && Array.isArray(employeeProfile.tools_allowed)) {
  employeeTools = employeeProfile.tools_allowed;
  toolModules = pickTools(employeeTools); // Maps tool IDs to executable modules
  console.log(`[Chat] Loaded ${employeeTools.length} tools for ${finalEmployeeSlug}:`, employeeTools);
}

// Special logging for Prime/Tag handoff tool
if (finalEmployeeSlug === 'prime-boss') {
  const hasHandoff = employeeTools.includes('request_employee_handoff');
  if (!hasHandoff) {
    console.error(`[Chat] ❌ CRITICAL: Prime is missing request_employee_handoff tool!`);
  }
}
```

**Tool Registry:** `src/agent/tools/index.ts`
- Line 683-690: `pickTools(ids: string[])` function
- Maps tool IDs from `tools_allowed` array to `ToolModule` objects
- Returns `Record<string, ToolModule>` for execution

**Tool Execution:** `netlify/functions/chat.ts` lines 1915-1920
```typescript
const result = await executeTool(toolModule, args, toolContext, {
  employeeSlug: finalEmployeeSlug,
  mode: 'propose-confirm',
  autonomyLevel: 1,
});
```

---

### **request_employee_handoff Tool Execution**

**Tool Definition:** `src/agent/tools/impl/request_employee_handoff.ts`

**Key Code (lines 35-59):**
```typescript
export async function execute(
  input: Input,
  ctx: { userId: string; sessionId?: string }
): Promise<Result<Output>> {
  const { target_slug, reason, summary_for_next_employee } = input;
  
  return Ok({
    ok: true,
    data: {
      requested_handoff: true,
      target_slug: target_slug.trim(),
      reason: reason?.trim(),
      summary_for_next_employee: summary_for_next_employee?.trim(),
    },
  });
}
```

**Backend Handoff Processing:** `netlify/functions/chat.ts` lines 1935-2065

**Key Code:**
```typescript
// Special handling for employee handoff (streaming)
if (toolName === 'request_employee_handoff' && result && typeof result === 'object' && 'data' in result) {
  const handoffData = (result as any).data;
  if (handoffData.requested_handoff === true && handoffData.target_slug) {
    const targetSlug = handoffData.target_slug;
    
    // 1. Store handoff context in database
    await sb.from('handoffs').insert({
      user_id: userId,
      session_id: finalSessionId,
      from_employee: originalEmployeeSlug,
      to_employee: targetSlug,
      reason: reason,
      context_summary: summary,
      key_facts: keyFacts,
    });
    
    // 2. Update session's employee_slug
    await sb.from('chat_sessions')
      .update({ employee_slug: targetSlug })
      .eq('id', finalSessionId);
    
    // 3. Insert system message
    await sb.from('chat_messages').insert({
      session_id: finalSessionId,
      user_id: userId,
      role: 'system',
      content: `Handoff: Conversation moved to ${targetSlug}. Context: ${summary}`,
    });
    
    // 4. Reload tools for new employee
    const { data: newEmployeeProfile } = await sb
      .from('employee_profiles')
      .select('tools_allowed')
      .eq('slug', targetSlug)
      .maybeSingle();
    
    employeeTools = newEmployeeProfile?.tools_allowed || [];
    toolModules = pickTools(employeeTools);
    
    // 5. Update finalEmployeeSlug for this request
    finalEmployeeSlug = targetSlug;
    
    // 6. Send handoff event in stream
    streamBuffer += `data: ${JSON.stringify({
      type: 'handoff',
      from: originalEmployeeSlug,
      to: targetSlug,
      reason,
      summary
    })}\n\n`;
  }
}
```

**Non-Streaming Handoff:** Lines 2588-2650 (similar logic for non-streaming responses)

---

### **SSE Streaming Format**

**Location:** `netlify/functions/chat.ts` lines 1786-1800

**Key Code:**
```typescript
// Send meta event at start
let streamBuffer = `event: meta\ndata: ${JSON.stringify({ status: 'starting' })}\n\n`;

// Send guardrails status as FIRST meta event
const guardrailsStatus = buildGuardrailsStatus('streaming');
streamBuffer += `event: meta\ndata: ${JSON.stringify({ guardrails: guardrailsStatus })}\n\n`;

// Send employee header
streamBuffer += `data: ${JSON.stringify({ type: 'employee', employee: finalEmployeeSlug })}\n\n`;

// Stream tokens
for await (const chunk of openaiStream) {
  if (delta?.content) {
    streamBuffer += `data: ${JSON.stringify({ type: 'text', content: delta.content })}\n\n`;
  }
  
  // Tool calls
  if (delta?.tool_calls) {
    streamBuffer += `data: ${JSON.stringify({
      type: 'tool_call',
      tool: { id, name, arguments }
    })}\n\n`;
  }
}

// Tool execution events
streamBuffer += `data: ${JSON.stringify({
  type: 'tool_executing',
  tool: toolName
})}\n\n`;

// Handoff events
streamBuffer += `data: ${JSON.stringify({
  type: 'handoff',
  from: originalEmployeeSlug,
  to: targetSlug,
  reason,
  summary
})}\n\n`;
```

**SSE Format:**
- `event: meta` → `data: { guardrails: {...} }` ✅ **SENT**
- `data: { type: 'employee', employee: 'prime-boss' }` ✅ **SENT**
- `data: { type: 'text', content: '...' }` ✅ **SENT**
- `data: { type: 'handoff', from: '...', to: '...' }` ✅ **SENT**

**Frontend Parsing:** `src/hooks/usePrimeChat.ts` lines 251-294
- ✅ Parses `event: meta` correctly
- ✅ Extracts `guardrails` object
- ✅ Handles `type: 'handoff'` events
- ✅ Handles `type: 'employee'` events

---

## D) Session/Conversation/Thread ID Management

### **Frontend Session ID**

**Location:** `src/hooks/usePrimeChat.ts` lines 80-120

**Key Code:**
```typescript
const [effectiveSessionId, setEffectiveSessionId] = useState<string | undefined>(() => {
  if (sessionId) return sessionId; // Use provided sessionId
  
  // Retrieve from localStorage
  if (safeUserId && employeeOverride) {
    const employeeSlugMap: Record<EmployeeOverride, string> = {
      prime: 'prime-boss',
      tag: 'tag-ai',
      // ... all employees
    };
    const employeeSlug = employeeSlugMap[employeeOverride] || 'prime-boss';
    const storageKey = `chat_session_${safeUserId}_${employeeSlug}`;
    const storedSessionId = localStorage.getItem(storageKey);
    if (storedSessionId) {
      return storedSessionId;
    }
  }
  
  return undefined; // Will be generated by backend
});

// Store sessionId after response
useEffect(() => {
  if (responseSessionId && safeUserId && employeeOverride) {
    const storageKey = `chat_session_${safeUserId}_${employeeSlug}`;
    localStorage.setItem(storageKey, responseSessionId);
  }
}, [responseSessionId, safeUserId, employeeOverride]);
```

**Pattern:** `chat_session_{userId}_{employeeSlug}` → One session per user+employee pair

---

### **Backend Session Management**

**Location:** `netlify/functions/_shared/session.ts`

**Key Code (lines 50-120):**
```typescript
export async function ensureSession(
  sb: SupabaseClient,
  userId: string,
  sessionId?: string,
  employeeSlug: string = 'prime-boss'
): Promise<{ sessionId: string; employee_slug: string }> {
  // If sessionId provided, verify it exists
  if (sessionId) {
    const { data } = await sb
      .from('chat_sessions')
      .select('id, employee_slug')
      .eq('id', sessionId)
      .eq('user_id', userId)
      .maybeSingle();
    
    if (data) {
      // Session exists - return it WITH its employee_slug (handles handoff)
      return { sessionId, employee_slug: data.employee_slug || employeeSlug };
    }
  }
  
  // Create new session
  const newSessionId = sessionId || crypto.randomUUID();
  const { data } = await sb
    .from('chat_sessions')
    .insert({
      id: newSessionId,
      user_id: userId,
      employee_slug: employeeSlug,
      title: 'New Chat',
      context: {},
      message_count: 0,
    })
    .select('id, employee_slug')
    .single();
  
  return { sessionId: data.id, employee_slug: data.employee_slug };
}
```

**Usage in Chat Handler:** `netlify/functions/chat.ts` lines 1071-1095
```typescript
const sessionResult = await ensureSession(sb, userId, sessionId, finalEmployeeSlug);
finalSessionId = sessionResult?.sessionId ?? normalizeSessionId(sessionId) ?? null;

// Use employee_slug from session if available (handles handoff)
if (sessionResult?.employee_slug) {
  sessionEmployeeSlug = sessionResult.employee_slug;
  if (sessionEmployeeSlug !== finalEmployeeSlug) {
    // Handoff occurred - update finalEmployeeSlug
    finalEmployeeSlug = sessionEmployeeSlug;
  }
}
```

---

### **Thread ID Management**

**Location:** `netlify/functions/_shared/ensureThread.ts`

**Key Code (lines 19-57):**
```typescript
export async function ensureThread(
  sb: SupabaseClient,
  userId: string,
  employeeKey: string // e.g., 'prime', 'tag', 'byte'
): Promise<string> {
  // Map employee slug to employee_key
  const employeeKeyMap: Record<string, string> = {
    'prime-boss': 'prime',
    'tag-ai': 'tag',
    'byte-docs': 'byte',
    // ... all employees
  };
  
  // Try to find existing thread
  const { data: existing } = await sb
    .from('chat_threads')
    .select('id')
    .eq('user_id', userId)
    .eq('employee_key', employeeKey)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  
  if (existing?.id) {
    return existing.id;
  }
  
  // Create new thread
  const { data: newThread } = await sb
    .from('chat_threads')
    .insert({
      user_id: userId,
      employee_key: employeeKey,
    })
    .select('id')
    .single();
  
  return newThread.id;
}
```

**Usage in Chat Handler:** `netlify/functions/chat.ts` lines 1027-1066
```typescript
// Map employee slug to employee_key
const employeeKeyMap: Record<string, string> = {
  'prime-boss': 'prime',
  'tag-ai': 'tag',
  // ... all employees
};
const employeeKey = employeeKeyMap[finalEmployeeSlug] || finalEmployeeSlug.split('-')[0] || 'prime';

// Ensure thread exists
threadId = await ensureThread(sb, userId, employeeKey);

// Backfill existing messages with thread_id
const backfilledCount = await backfillThreadId(sb, userId, employeeKey, threadId);
```

**Message Storage:** Lines 1648-1661
```typescript
const messageData: any = {
  session_id: finalSessionId,
  user_id: userId,
  role: 'user',
  content: masked,
  employee_key: employeeKey, // Add employee_key
};

if (threadId) {
  messageData.thread_id = threadId; // Use thread_id (primary)
}
```

**Message Loading:** Lines 1207-1244
```typescript
// Load by thread_id (preferred)
if (threadId) {
  const { data: threadMessages } = await sb
    .from('chat_messages')
    .select('id, role, content, created_at')
    .eq('thread_id', threadId)
    .order('created_at', { ascending: true })
    .limit(50);
  
  recentMessages = threadMessages || [];
}

// Fallback to session_id if thread_id didn't work
if (recentMessages.length === 0) {
  recentMessages = await getRecentMessages(sb, finalSessionId, 4000);
}
```

---

### **Frontend History Loading**

**Location:** `src/components/chat/UnifiedAssistantChat.tsx` lines 210-325

**Key Code:**
```typescript
const loadHistory = async () => {
  // Map employee slug to employee_key
  const employeeKeyMap: Record<string, string> = {
    'prime-boss': 'prime',
    'tag-ai': 'tag',
    // ... all employees
  };
  const employeeKey = employeeKeyMap[effectiveEmployeeSlug] || 'prime';
  
  // Get or create thread
  let threadId: string | null = null;
  const { data: threadData } = await supabase
    .from('chat_threads')
    .select('id')
    .eq('user_id', userId)
    .eq('employee_key', employeeKey)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  
  if (threadData?.id) {
    threadId = threadData.id;
  } else {
    // Create new thread
    const { data: newThread } = await supabase
      .from('chat_threads')
      .insert({ user_id: userId, employee_key: employeeKey })
      .select('id')
      .single();
    threadId = newThread?.id || null;
  }
  
  // Fetch messages (prefer thread_id, fallback to session_id)
  let query = supabase
    .from('chat_messages')
    .select('id, role, content, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
    .limit(50);
  
  if (threadId) {
    query = query.eq('thread_id', threadId);
  } else if (sessionId) {
    query = query.eq('session_id', sessionId);
  }
  
  const { data } = await query;
  
  if (data && data.length > 0) {
    const historyMessages: ChatMessage[] = data
      .filter(m => m.role !== 'system')
      .map(m => ({
        id: m.id,
        role: m.role as 'user' | 'assistant',
        content: m.content || '',
        createdAt: m.created_at,
      }));
    
    setLoadedHistoryMessages(historyMessages);
  }
};
```

**History Passed to Engine:** Line 339
```typescript
const engineResult = useUnifiedChatEngine({
  employeeSlug: effectiveEmployeeSlug,
  conversationId: conversationId,
  initialMessages: loadedHistoryMessages.length > 0 ? loadedHistoryMessages : undefined,
});
```

---

## E) Tool Registry / Picker

### **Tool Registry**

**Location:** `src/agent/tools/index.ts`

**Key Code - Tool Map (lines 77-680):**
```typescript
const toolModules: Map<string, ToolModule> = new Map([
  ['request_employee_handoff', {
    id: 'request_employee_handoff',
    description: 'Transfer conversation to another AI employee...',
    inputSchema: requestEmployeeHandoff.inputSchema,
    outputSchema: requestEmployeeHandoff.outputSchema,
    run: requestEmployeeHandoff.execute,
    meta: {
      timeout: 5000,
      rateLimit: { perMinute: 10 },
    },
  }],
  ['tag_update_transaction_category', {
    id: 'tag_update_transaction_category',
    // ... tool definition
  }],
  // ... all 50+ tools
]);
```

**Key Code - pickTools Function (lines 683-690):**
```typescript
export function pickTools(ids: string[]): Record<string, ToolModule> {
  const picked: Record<string, ToolModule> = {};
  for (const id of ids) {
    const tool = toolModules.get(id);
    if (tool) picked[id] = tool;
  }
  return picked;
}
```

**Tool Registration:** Line 25
```typescript
import * as requestEmployeeHandoff from './impl/request_employee_handoff';
```

**Tool Definition:** `src/agent/tools/impl/request_employee_handoff.ts`
- Line 4: `id = 'request_employee_handoff'`
- Line 6-10: Input schema: `{ target_slug: string, reason?: string, summary_for_next_employee?: string }`
- Line 12-20: Output schema: `{ ok: boolean, data: { requested_handoff: boolean, target_slug: string, ... } }`
- Line 35-59: Execute function returns `Ok({ requested_handoff: true, target_slug, ... })`

**Tool Execution:** `src/agent/tools/index.ts` lines 693-750
```typescript
export async function executeTool(
  tool: ToolModule,
  input: any,
  ctx: ToolContext,
  loggingOptions?: { employeeSlug?: string; mode?: string; autonomyLevel?: number }
): Promise<any> {
  // Validate input
  const validation = tool.inputSchema.safeParse(input);
  if (!validation.success) {
    return { error: 'Invalid input', details: validation.error.errors };
  }
  
  // Execute tool
  const result = await tool.run(validation.data, ctx);
  
  // Handle Result<T> type (Ok/Err)
  if (result && typeof result === 'object' && 'ok' in result) {
    if (result.ok === true) {
      return result.data; // Unwrap Ok result
    } else {
      return { error: result.error }; // Unwrap Err result
    }
  }
  
  return result;
}
```

**Backend Usage:** `netlify/functions/chat.ts` line 80
```typescript
import { toOpenAIToolDefs, pickTools, executeTool } from '../../src/agent/tools/index.js';
```

---

## F) Supabase Schema / Migrations

### **employee_profiles Table**

**Migration:** `supabase/migrations/000_centralized_chat_runtime.sql` lines 20-33

**Schema:**
```sql
CREATE TABLE IF NOT EXISTS employee_profiles (
  slug TEXT PRIMARY KEY,  -- e.g., 'prime-boss', 'byte-doc', 'tag-ai'
  title TEXT NOT NULL,
  emoji TEXT,
  system_prompt TEXT NOT NULL,  -- Full personality prompt
  capabilities TEXT[] NOT NULL DEFAULT '{}',
  tools_allowed TEXT[] NOT NULL DEFAULT '{}',  -- ['ocr', 'sheet_export', 'request_employee_handoff']
  model TEXT DEFAULT 'gpt-4o-mini',
  temperature NUMERIC DEFAULT 0.7,
  max_tokens INT DEFAULT 2000,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Seed Data:** `supabase/migrations/004_add_all_employees.sql`

**Example (Prime):**
```sql
INSERT INTO employee_profiles (
  slug, title, emoji, system_prompt, capabilities, tools_allowed, model, temperature, max_tokens, is_active
) VALUES (
  'prime-boss',
  'Prime - CEO & Orchestrator',
  '👑',
  'You are Prime, the strategic mastermind...',
  ARRAY['routing', 'coordination', 'strategy'],
  ARRAY['delegate', 'sheet_export', 'bank_match'],  -- ⚠️ MISSING 'request_employee_handoff'
  'gpt-4o',
  0.7,
  3000,
  true
);
```

**⚠️ MISMATCH:** Prime's `tools_allowed` in `004_add_all_employees.sql` is `['delegate', 'sheet_export', 'bank_match']` but should include `'request_employee_handoff'`. Later migrations (e.g., `20251120_fix_employee_tool_access.sql`) may have fixed this.

---

### **chat_sessions Table**

**Migration:** `supabase/migrations/000_centralized_chat_runtime.sql` lines 75-86

**Schema:**
```sql
CREATE TABLE IF NOT EXISTS chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,  -- TEXT not UUID (Supabase profiles.id is text)
  employee_slug TEXT NOT NULL REFERENCES employee_profiles(slug) ON DELETE RESTRICT,
  title TEXT,
  context JSONB DEFAULT '{}',
  message_count INT DEFAULT 0,
  token_count INT DEFAULT 0,
  last_message_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Key Fields:**
- `id` (UUID) - Session ID (reused across requests)
- `employee_slug` (TEXT) - **UPDATED ON HANDOFF** (line 2004 in chat.ts)
- `user_id` (TEXT) - User identifier

---

### **chat_messages Table**

**Migration:** `supabase/migrations/000_centralized_chat_runtime.sql` lines 107-117

**Schema:**
```sql
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  redacted_content TEXT,
  tokens INT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**⚠️ MISSING COLUMNS:** Schema doesn't show `thread_id` or `employee_key`, but code references them:
- `netlify/functions/chat.ts` line 1648: Sets `thread_id` and `employee_key`
- `netlify/functions/chat.ts` line 1212: Queries by `thread_id`
- `src/components/chat/UnifiedAssistantChat.tsx` line 283: Queries by `thread_id`

**Likely Migration:** `supabase/migrations/001_centralized_chat_rls.sql` or later migration adds:
- `thread_id UUID REFERENCES chat_threads(id)`
- `employee_key TEXT`

---

### **chat_threads Table**

**Migration:** Likely in `001_centralized_chat_rls.sql` or `000_centralized_chat_runtime.sql` (not shown in excerpt)

**Schema (inferred from code):**
```sql
CREATE TABLE IF NOT EXISTS chat_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  employee_key TEXT NOT NULL,  -- 'prime', 'tag', 'byte' (not slug)
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, employee_key)  -- One thread per user+employee
);
```

**Usage:**
- `netlify/functions/_shared/ensureThread.ts` - Creates/retrieves threads
- `netlify/functions/chat.ts` line 1051 - Ensures thread exists
- `src/components/chat/UnifiedAssistantChat.tsx` line 244 - Queries threads

---

### **handoffs Table**

**Migration:** Not found in migrations (may be created elsewhere or missing)

**Schema (inferred from code):**
```sql
CREATE TABLE IF NOT EXISTS handoffs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  session_id UUID NOT NULL REFERENCES chat_sessions(id),
  from_employee TEXT NOT NULL,
  to_employee TEXT NOT NULL,
  reason TEXT,
  context_summary TEXT,
  key_facts TEXT[],
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**Usage:** `netlify/functions/chat.ts` line 1982
```typescript
await sb.from('handoffs').insert({
  user_id: userId,
  session_id: finalSessionId,
  from_employee: originalEmployeeSlug,
  to_employee: targetSlug,
  reason: reason,
  context_summary: summary,
  key_facts: keyFacts,
});
```

**⚠️ MISSING:** Migration file not found. Table may not exist in database.

---

## 🔍 MISMATCHES & ISSUES

### **1. Employee Slug Mismatches**

**Issue:** Multiple slug formats used across codebase

**Locations:**
- Database: `'prime-boss'`, `'byte-doc'` (singular), `'tag-ai'`
- Frontend: `'prime-boss'`, `'byte-docs'` (plural), `'tag-ai'`
- Backend: `'prime-boss'`, `'byte-docs'`, `'tag-ai'`
- Employee Override: `'prime'`, `'byte'`, `'tag'` (short form)

**Example:**
- `004_add_all_employees.sql` line 38: `'byte-doc'` (singular)
- `usePrimeChat.ts` line 90: `'byte-docs'` (plural)
- `chat.ts` line 1031: `'byte-docs'` (plural)

**Impact:** Byte queries may fail if database has `'byte-doc'` but code expects `'byte-docs'`.

---

### **2. SSE Meta Event Parsing**

**Backend Sends:** `netlify/functions/chat.ts` lines 1787-1791
```typescript
streamBuffer += `event: meta\ndata: ${JSON.stringify({ status: 'starting' })}\n\n`;
streamBuffer += `event: meta\ndata: ${JSON.stringify({ guardrails: guardrailsStatus })}\n\n`;
```

**Frontend Parses:** `src/hooks/usePrimeChat.ts` lines 251-272
```typescript
if (line.startsWith('event: ')) {
  currentEventType = line.slice(7).trim(); // Sets currentEventType = 'meta'
  continue;
}

if (line.startsWith('data: ')) {
  const j = JSON.parse(payload);
  if (currentEventType === 'meta' && j.guardrails) {
    setGuardrailsStatus(j.guardrails); // ✅ CORRECT
  }
}
```

**Status:** ✅ **MATCHES** - Parsing is correct.

---

### **3. Session/Thread Mapping**

**Issue:** Dual ID system (session_id + thread_id) with inconsistent usage

**Session ID:**
- Frontend: `localStorage.getItem('chat_session_{userId}_{employeeSlug}')`
- Backend: `ensureSession()` creates/retrieves from `chat_sessions` table
- Messages: Stored with `session_id` (UUID)

**Thread ID:**
- Backend: `ensureThread()` creates/retrieves from `chat_threads` table
- Messages: Stored with `thread_id` (UUID) **IF AVAILABLE**
- Fallback: Uses `session_id` if `thread_id` is null

**Mapping:**
- `employee_key` (threads) vs `employee_slug` (sessions)
- `'prime-boss'` → `'prime'` (employee_key)
- One thread per user+employee_key
- Multiple sessions can share same thread

**Status:** ⚠️ **COMPLEX BUT WORKING** - Dual system for backward compatibility.

---

### **4. Handoff Persistence**

**Backend Updates:**
- ✅ Updates `chat_sessions.employee_slug` (line 2004)
- ✅ Inserts into `handoffs` table (line 1982)
- ✅ Inserts system message (line 2018)
- ✅ Sends SSE handoff event (line 2059)

**Frontend Updates:**
- ✅ Parses handoff event (line 275-286)
- ✅ Updates `activeEmployeeSlug` state (line 277)
- ✅ Adds system message to UI (line 279-284)

**Issue:** Frontend doesn't persist handoff to localStorage or reload employee tools.

**Status:** ⚠️ **PARTIAL** - Backend persists, frontend updates UI but doesn't reload employee config.

---

### **5. Tool Allowlist Mismatch**

**Database:** `employee_profiles.tools_allowed` array
- Prime: `['delegate', 'sheet_export', 'bank_match']` (from `004_add_all_employees.sql`)
- Should be: `['request_employee_handoff', 'sheet_export', 'bank_match']`

**Code Expects:** `netlify/functions/chat.ts` line 989
```typescript
const hasHandoff = employeeTools.includes('request_employee_handoff');
if (!hasHandoff) {
  console.error(`[Chat] ❌ CRITICAL: Prime is missing request_employee_handoff tool!`);
}
```

**Status:** ⚠️ **MISMATCH** - Database may be outdated. Check `20251120_fix_employee_tool_access.sql` migration.

---

## 📋 MINIMUM EDITS CHECKLIST

### **1. Prime Greeting Always Show**

**Current Issue:** Greeting only shows if `hasAssistantMessages === false` (line 1128)

**Fix Required:**
- `src/components/chat/UnifiedAssistantChat.tsx` line 1128
- Remove `hasAssistantMessages` check OR make it conditional on `isFirstTimeUser`
- For returning users: Skip greeting if history exists
- For new users: Always show greeting

**Code Change:**
```typescript
// Current (line 1128):
if (!isOpen || !chatReady || isLoadingHistory || hasAssistantMessages || ...) return;

// Fixed:
if (!isOpen || !chatReady || isLoadingHistory) return;
// Only skip greeting if returning user with history
if (!isFirstTimeUser && hasAssistantMessages) return;
```

---

### **2. Guardrails Status Always Show as Secured/Active**

**Current Issue:** Guardrails status only parsed from `event: meta`, may not always be sent

**Fix Required:**
- `netlify/functions/chat.ts` line 1791: Ensure `event: meta` with guardrails is ALWAYS sent
- `src/hooks/usePrimeChat.ts` line 142: Initialize `guardrailsStatus` with default "enabled" state
- `src/components/chat/UnifiedAssistantChat.tsx`: Display guardrails status in UI (if not already)

**Code Changes:**

**Backend (`netlify/functions/chat.ts`):**
```typescript
// Line 1791 - ALWAYS send guardrails status
const guardrailsStatus = buildGuardrailsStatus('streaming');
streamBuffer += `event: meta\ndata: ${JSON.stringify({ guardrails: guardrailsStatus })}\n\n`;
// Ensure this happens BEFORE any other events
```

**Frontend (`src/hooks/usePrimeChat.ts`):**
```typescript
// Line 142 - Initialize with default "enabled" state
const [guardrailsStatus, setGuardrailsStatus] = useState<GuardrailsStatus>({
  enabled: true,  // Default to enabled
  pii_masking: true,
  moderation: true,
  policy_version: '1.0',
  checked_at: new Date().toISOString(),
  mode: 'streaming',
});
```

---

### **3. Handoff Tool Causes Employee Switch and Persists**

**Current Issue:** Frontend updates UI but doesn't reload employee config or persist to localStorage

**Fix Required:**
- `src/hooks/usePrimeChat.ts` line 275-286: On handoff event, update localStorage session key
- `src/components/chat/UnifiedAssistantChat.tsx`: Reload employee config after handoff
- `src/hooks/useUnifiedChatEngine.ts`: Update `activeEmployeeSlug` and reload tools

**Code Changes:**

**Frontend (`src/hooks/usePrimeChat.ts`):**
```typescript
// Line 275-286 - After handoff event
if (j.type === 'handoff' && j.from && j.to) {
  setActiveEmployeeSlug(j.to);
  
  // Update localStorage session key
  if (safeUserId && employeeOverride) {
    const employeeSlugMap = { /* ... */ };
    const newEmployeeSlug = j.to;
    const newStorageKey = `chat_session_${safeUserId}_${newEmployeeSlug}`;
    // Keep same sessionId but update employee association
    if (effectiveSessionId) {
      localStorage.setItem(newStorageKey, effectiveSessionId);
    }
  }
  
  // Add system message
  setMessages(prev => [...prev, {
    id: `handoff-${Date.now()}`,
    role: 'system',
    content: `Transferred from ${j.from} to ${j.to}`,
  }]);
}
```

**Frontend (`src/components/chat/UnifiedAssistantChat.tsx`):**
```typescript
// After handoff, reload employee config
useEffect(() => {
  if (activeEmployeeSlug && activeEmployeeSlug !== currentEmployeeSlug) {
    // Update currentEmployeeSlug to trigger reload
    setCurrentEmployeeSlug(activeEmployeeSlug);
    // Reload history for new employee
    historyLoadedRef.current = null;
  }
}, [activeEmployeeSlug]);
```

---

### **4. Messages Saved in DB Always Render in UI**

**Current Issue:** History loading may fail silently or not merge correctly

**Fix Required:**
- `src/components/chat/UnifiedAssistantChat.tsx` line 299-315: Ensure history messages are properly formatted
- `src/hooks/usePrimeChat.ts` line 155-184: Ensure `initialMessages` merge correctly
- `src/hooks/useUnifiedChatEngine.ts`: Pass `initialMessages` correctly

**Code Changes:**

**Frontend (`src/components/chat/UnifiedAssistantChat.tsx`):**
```typescript
// Line 299-315 - Ensure history messages have all required fields
if (data && data.length > 0) {
  const historyMessages: ChatMessage[] = data
    .filter(m => m.role !== 'system') // Keep system messages for handoff context
    .map(m => ({
      id: m.id,
      role: m.role as 'user' | 'assistant',
      content: m.content || '',
      createdAt: m.created_at,
      timestamp: m.created_at ? new Date(m.created_at) : new Date(),
    }));
  
  setLoadedHistoryMessages(historyMessages);
  console.log(`[UnifiedAssistantChat] ✅ Loaded ${historyMessages.length} messages`);
} else {
  setLoadedHistoryMessages([]);
  console.log(`[UnifiedAssistantChat] ℹ️ No history found (new conversation)`);
}
```

**Frontend (`src/hooks/usePrimeChat.ts`):**
```typescript
// Line 155-184 - Ensure initialMessages merge correctly
useEffect(() => {
  if (initialMessages && initialMessages.length > 0) {
    setMessages(prev => {
      // If we have no messages, use initialMessages
      if (prev.length === 0) {
        return initialMessages.map(m => ({
          ...m,
          content: String(m.content || ''),
        }));
      }
      
      // Merge intelligently (avoid duplicates by ID)
      const existingIds = new Set(prev.map(m => m.id));
      const newMessages = initialMessages.filter(m => !existingIds.has(m.id));
      return [...prev, ...newMessages];
    });
  }
}, [initialMessages]);
```

**Backend (`netlify/functions/chat.ts`):**
```typescript
// Line 1207-1244 - Ensure messages are loaded correctly
// Prefer thread_id, fallback to session_id
if (threadId) {
  const { data: threadMessages } = await sb
    .from('chat_messages')
    .select('id, role, content, created_at, thread_id, session_id')
    .eq('thread_id', threadId)
    .order('created_at', { ascending: true })
    .limit(50);
  
  recentMessages = threadMessages || [];
} else if (finalSessionId) {
  recentMessages = await getRecentMessages(sb, finalSessionId, 50);
}
```

---

## 📊 SUMMARY

### **Canonical Chat UI:**
- ✅ `UnifiedAssistantChat.tsx` - **PRODUCTION**
- ❌ `PrimeChatDrawer.tsx` - **DEMO ONLY**

### **Hook:**
- ✅ `usePrimeChat.ts` - Calls `/.netlify/functions/chat`, parses SSE, handles guardrails/handoff
- ✅ `useUnifiedChatEngine.ts` - Wrapper for consistent API

### **Backend:**
- ✅ `netlify/functions/chat.ts` - Main handler
- ✅ Slug normalization via `normalizeEmployeeSlug()` + `resolveSlug()`
- ✅ Tool allowlist from `employee_profiles.tools_allowed`
- ✅ Handoff tool execution updates session + sends SSE event
- ✅ SSE format: `event: meta` ✅ **SENT**

### **IDs:**
- ✅ Session ID: `localStorage` → `chat_sessions` table
- ✅ Thread ID: `chat_threads` table (one per user+employee_key)
- ✅ Messages: Stored with both `session_id` and `thread_id`

### **Tools:**
- ✅ Registry: `src/agent/tools/index.ts` - `pickTools()` function
- ✅ Handoff tool: `src/agent/tools/impl/request_employee_handoff.ts`

### **Database:**
- ✅ `employee_profiles` - `tools_allowed`, `system_prompt`
- ✅ `chat_sessions` - `employee_slug` (updated on handoff)
- ✅ `chat_messages` - `thread_id`, `session_id`, `employee_key`
- ✅ `chat_threads` - `user_id`, `employee_key`
- ⚠️ `handoffs` - Table exists in code but migration not found

---

## 🎯 FINAL CHECKLIST

### **Minimum Edits Needed:**

1. **Prime Greeting Always Show**
   - [ ] Remove `hasAssistantMessages` check OR make conditional on `isFirstTimeUser`
   - [ ] File: `src/components/chat/UnifiedAssistantChat.tsx` line 1128

2. **Guardrails Status Always Show**
   - [ ] Initialize `guardrailsStatus` with default "enabled" state
   - [ ] File: `src/hooks/usePrimeChat.ts` line 142
   - [ ] Ensure backend ALWAYS sends `event: meta` with guardrails
   - [ ] File: `netlify/functions/chat.ts` line 1791

3. **Handoff Persists**
   - [ ] Update localStorage session key on handoff
   - [ ] File: `src/hooks/usePrimeChat.ts` line 275-286
   - [ ] Reload employee config after handoff
   - [ ] File: `src/components/chat/UnifiedAssistantChat.tsx`

4. **Messages Always Render**
   - [ ] Ensure history loading doesn't fail silently
   - [ ] File: `src/components/chat/UnifiedAssistantChat.tsx` line 299-315
   - [ ] Ensure `initialMessages` merge correctly
   - [ ] File: `src/hooks/usePrimeChat.ts` line 155-184
   - [ ] Verify backend returns messages with all required fields
   - [ ] File: `netlify/functions/chat.ts` line 1207-1244

---

**Report Complete** ✅





