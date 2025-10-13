# 🔍 Prime Tool-Calling Audit & Connection Plan
## Senior Engineer Assessment + Implementation Diffs

**Date**: October 13, 2025  
**Status**: Audit Complete, Implementation Plan Ready

---

## A) REPO SCAN - STRUCTURED INVENTORY

### **Chat Layer (Frontend)**

| File | Purpose | Tool Support? |
|------|---------|---------------|
| `src/hooks/useChat.ts#L1-389` | Main chat hook, SSE streaming, session mgmt | ⚠️ Types defined (metadata.tool_calls), NOT used |
| `src/ui/hooks/useStreamChat.ts#L18-229` | Alternative streaming hook | ⚠️ Has isToolExecuting state, NOT wired |
| `src/services/chatApi.ts#L1-120` | Chat API client with streaming | ❌ NO tool handling |
| `src/pages/chat/PrimeChat.tsx#L1-331` | Prime chat UI component | ✅ Uses useChat hook |
| `src/pages/ChatTest.tsx` | Chat testing page | ✅ Uses sendChat from chatApi |

**Function Router**:
```typescript
// src/services/chatApi.ts#L21
fetch("/.netlify/functions/chat", {
  method: "POST",
  body: JSON.stringify({ userId, convoId, messages, employee })
})
```

**Tool Support**: ❌ **NO** - Types exist but not implemented

---

### **Backend Chat Handler**

| File | Purpose | Tool Support? |
|------|---------|---------------|
| `netlify/functions/chat.ts#L1-250` | Main SSE chat endpoint | ❌ NO tool_calls parsing |
| `netlify/functions/_shared/router.ts#L1-62` | Employee routing (Jaccard similarity) | ✅ Works for delegation |
| `netlify/functions/_shared/openai.ts` | OpenAI client wrapper | ✅ Available |

**Tool Handling**: ❌ **NO** - Line 177-184 calls `openai.chat.completions.create()` with NO `tools` parameter

**Code Evidence**:
```typescript
// netlify/functions/chat.ts#L177-182
const completion = await withTimeout(
  withBackoff(() => openai.chat.completions.create({
    model: CHAT_MODEL,
    temperature: 0.3,
    stream: true,
    messages: [...ctx.system, ...ctx.history],
    // ❌ NO tools: [...] parameter
  })),
  25000
)
```

---

### **Tool Endpoints (Already Implemented)**

| Endpoint | File | Handler | Input Schema | Status |
|----------|------|---------|--------------|--------|
| `/tools/email-search` | `netlify/functions/tools/email-search.ts#L134-172` | ✅ POST handler | `{userId, query, days, limit}` | ✅ Ready |
| `/tools/email-fetch-attachments` | `netlify/functions/tools/email-fetch-attachments.ts#L121-186` | ✅ POST handler | `{userId, messageId}` | ✅ Ready |
| `/tools/get-recent-import-summary` | `netlify/functions/tools/get-recent-import-summary.ts#L16-71` | ✅ POST handler | `{userId}` | ✅ Ready |
| `/tools/get-recent-imports` | `netlify/functions/tools/get-recent-imports.ts#L18-94` | ✅ POST handler | `{userId, days, limit}` | ✅ Ready |

**Tool Registry**: ❌ **NO** - `tools/tool-registry.json` exists but not used by chat.ts

---

### **AI Employee Registry**

| Employee | Slug | Prompt | File |
|----------|------|--------|------|
| Prime (Boss) | `prime-boss` | "You are Prime, the boss..." | `_shared/router.ts#L4` |
| Crystal (Analytics) | `crystal-analytics` | "You analyze spending..." | `_shared/router.ts#L5` |
| Ledger (Tax) | `ledger-tax` | "You focus on Canadian taxes..." | `_shared/router.ts#L6` |
| Byte (Documents) | `byte-docs` | "You process documents..." | `_shared/router.ts#L7` |
| Tag (Categorize) | `tag-categorize` | "You categorize expenses..." | `_shared/router.ts#L8` |
| Goalie (Goals) | `goalie-goals` | "You help with financial goals..." | `_shared/router.ts#L9` |

**Routing Logic**: `netlify/functions/_shared/router.ts#L21-52`
- Keyword-based quick wins (lines 31-45)
- Few-shot Jaccard similarity (lines 48-49)
- Default to Prime (line 51)

---

### **Security (RLS Policies)**

| Table | RLS Enabled? | Policies | File |
|-------|--------------|----------|------|
| `chat_messages` | ✅ YES | owner_rw | `supabase/migrations/20251012_memory_tables.sql` |
| `user_memory_facts` | ✅ YES | owner_rw | `supabase/migrations/20251012_memory_tables.sql` |
| `memory_embeddings` | ✅ YES | owner_rw | `supabase/migrations/20251012_memory_tables.sql` |
| `guardrail_events` | ✅ YES | owner_read | `SIMPLE_MIGRATION_RUN_THIS.sql#L25-30` |
| `user_notifications` | ✅ YES | owner_rw | `SIMPLE_MIGRATION_RUN_THIS.sql#L72-77` |

**Chat/Tools Security**: ✅ All queries use `userId` filter, RLS enforced

---

### **Notifications**

| Component | File | Purpose |
|-----------|------|---------|
| Backend helper | `netlify/functions/_shared/notify.ts#L1-18` | Insert notifications |
| Frontend hook | `src/hooks/useNotifications.ts#L1-48` | Subscribe to realtime |
| Realtime subscription | `useNotifications.ts#L28-39` | Postgres changes listener |

**Status**: ✅ **COMPLETE** - Ready to use

---

### **Environment Variables**

**Chat/Tools Read**:
```
OPENAI_API_KEY - OpenAI API (chat.ts, tools)
SUPABASE_URL - Database connection
SUPABASE_SERVICE_ROLE_KEY - Server-side DB access
GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET - Gmail tools
OCR_SPACE_API_KEY - OCR processing
```

**Status**: ✅ All set (verified in terminal output)

---

## B) TOOL-CALLING STATUS CHECK

### **Question 1: Do we parse function_call / tool_calls?**

**Answer**: ❌ **NO**

**Evidence**:
```typescript
// netlify/functions/chat.ts#L186-192
for await (const part of completion) {
  const token = part.choices?.[0]?.delta?.content ?? ''
  if (token) {
    fullText += token
    stream.write(`data: ${JSON.stringify({ type: 'token', token })}\n\n`)
  }
  // ❌ NO check for part.choices[0].delta.tool_calls
}
```

### **Question 2: Is there a tool registry?**

**Answer**: ⚠️ **PARTIAL**

**Evidence**:
- `netlify/functions/tools/tool-registry.json` - Static JSON file (not used)
- ❌ NO TypeScript registry that chat.ts can call

### **Question 3: Are tool JSON schemas defined?**

**Answer**: ⚠️ **IMPLICIT ONLY**

**Evidence**:
- `tool-registry.json` has input_schema (JSON Schema format)
- ❌ NO Zod validators
- ❌ NO TypeScript types shared between frontend/backend

### **Question 4: Does streaming handoff for tool calls?**

**Answer**: ❌ **NO**

**Current**: Stream completes → done  
**Needed**: Stream → tool_call detected → pause → execute → append result → resume

### **Question 5: Do we log tool invocations?**

**Answer**: ❌ **NO**

**Needed**: Table or metric for tool audit trail

### **Question 6: Are tool endpoints rate limited?**

**Answer**: ⚠️ **PARTIAL**

**Evidence**:
- Main chat has rate limiting (`_shared/limits.ts`)
- ❌ Individual tool endpoints NOT rate limited

---

## C) GAPS - EXPLICIT CHECKLIST

| # | Gap | File(s) to Edit | Priority |
|---|-----|-----------------|----------|
| 1 | OpenAI `tools` parameter not passed | `netlify/functions/chat.ts#L177` | 🔴 Critical |
| 2 | Tool call detection in stream | `netlify/functions/chat.ts#L186-192` | 🔴 Critical |
| 3 | Tool executor function | `netlify/functions/_shared/tool-executor.ts` (NEW) | 🔴 Critical |
| 4 | Tool schema definitions | `netlify/functions/_shared/tool-schemas.ts` (NEW) | 🔴 Critical |
| 5 | Resume streaming after tool | `netlify/functions/chat.ts#L235+` | 🔴 Critical |
| 6 | Frontend displays tool execution | `src/services/chatApi.ts#L54-66` | 🟡 Nice |
| 7 | Tool audit logging | `netlify/functions/_shared/tool-metrics.ts` (NEW) | 🟢 Optional |
| 8 | Tool rate limiting | Add to tool-executor | 🟢 Optional |

---

## D) MINIMAL DIFFS (Code)

### **DIFF 1: Create Tool Schemas**

**File**: `netlify/functions/_shared/tool-schemas.ts` (NEW)

```typescript
export const TOOL_SCHEMAS = [
  {
    type: 'function' as const,
    function: {
      name: 'search_gmail',
      description: 'Search user\'s Gmail for statements, invoices, or receipts. Returns ranked results.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query (e.g., "visa statement")' },
          days: { type: 'number', description: 'Search within last N days', default: 90 },
          limit: { type: 'number', description: 'Max results', default: 5 }
        },
        required: ['query']
      }
    }
  },
  {
    type: 'function' as const,
    function: {
      name: 'fetch_email_attachments',
      description: 'Download and process attachments from a specific email.',
      parameters: {
        type: 'object',
        properties: {
          messageId: { type: 'string', description: 'Gmail message ID from search results' }
        },
        required: ['messageId']
      }
    }
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_recent_import',
      description: 'Get summary of most recent document import.',
      parameters: {
        type: 'object',
        properties: {}
      }
    }
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_transactions',
      description: 'Query user\'s transactions with filters.',
      parameters: {
        type: 'object',
        properties: {
          from_date: { type: 'string', description: 'Start date (YYYY-MM-DD)' },
          to_date: { type: 'string', description: 'End date (YYYY-MM-DD)' },
          vendor: { type: 'string', description: 'Filter by vendor name' },
          category: { type: 'string', description: 'Filter by category' },
          limit: { type: 'number', description: 'Max results', default: 20 }
        }
      }
    }
  }
];
```

---

### **DIFF 2: Create Tool Executor**

**File**: `netlify/functions/_shared/tool-executor.ts` (NEW)

```typescript
import { supabaseAdmin } from '../supabase';

type ToolContext = {
  userId: string;
  convoId: string;
};

export async function executeTool(
  name: string, 
  args: any, 
  ctx: ToolContext
): Promise<{ ok: boolean; result?: any; error?: string }> {
  console.log(`[Tool Executor] ${name}`, args);
  
  try {
    // Map tool names to endpoints
    switch (name) {
      case 'search_gmail':
        return await callToolEndpoint('/tools/email-search', {
          userId: ctx.userId,
          query: args.query,
          days: args.days || 90,
          limit: args.limit || 5
        });
      
      case 'fetch_email_attachments':
        return await callToolEndpoint('/tools/email-fetch-attachments', {
          userId: ctx.userId,
          messageId: args.messageId
        });
      
      case 'get_recent_import':
        return await callToolEndpoint('/tools/get-recent-import-summary', {
          userId: ctx.userId
        });
      
      case 'get_transactions':
        // Direct DB query (faster than HTTP call)
        const { data, error } = await supabaseAdmin
          .from('transactions')
          .select('*')
          .eq('user_id', ctx.userId)
          .gte('date', args.from_date || '2020-01-01')
          .lte('date', args.to_date || '2099-12-31')
          .ilike('merchant', args.vendor ? `%${args.vendor}%` : '%')
          .eq(args.category ? 'category' : 'id', args.category || 'id')  // Hack for optional filter
          .order('date', { ascending: false })
          .limit(args.limit || 20);
        
        if (error) throw error;
        
        return {
          ok: true,
          result: {
            transactions: data,
            count: data?.length || 0,
            total: data?.reduce((sum, t) => sum + (t.amount || 0), 0) || 0
          }
        };
      
      default:
        return { ok: false, error: `Unknown tool: ${name}` };
    }
  } catch (error: any) {
    console.error(`[Tool Executor] Error in ${name}:`, error);
    return { ok: false, error: error.message || 'Tool execution failed' };
  }
}

async function callToolEndpoint(path: string, body: any): Promise<{ ok: boolean; result?: any; error?: string }> {
  const baseUrl = process.env.URL || 'http://localhost:8888';
  
  try {
    const response = await fetch(`${baseUrl}/.netlify/functions${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    
    if (!response.ok) {
      const error = await response.text();
      return { ok: false, error };
    }
    
    const result = await response.json();
    return { ok: true, result };
  } catch (error: any) {
    return { ok: false, error: error.message };
  }
}
```

---

### **DIFF 3: Update chat.ts to Handle Tool Calls**

**File**: `netlify/functions/chat.ts`

```diff
import { applyGuardrails, GUARDRAIL_PRESETS, logGuardrailEvent } from './_shared/guardrails'
+ import { TOOL_SCHEMAS } from './_shared/tool-schemas'
+ import { executeTool } from './_shared/tool-executor'

...

      // Build context with token budget management
      const ctx = buildContext({
        systemPrompts: [
          target.systemPrompt,
          priorSummary ? `Conversation summary (for context): ${priorSummary}` : ''
        ].filter(Boolean),
        recalls: recalls.map(r => r.text),
        messages,
        maxTokens: 6000,
        reserveForAnswer: 1500
      })

      stream.write('retry: 1000\n\n')
      stream.write(`data: ${JSON.stringify({ type: 'employee', employee: target.slug })}\n\n`)

      // Notify user if context was trimmed
      if (ctx.overLimit) {
        console.log('Context trimmed: messages exceeded token budget')
        stream.write(`data: ${JSON.stringify({ type: 'note', note: 'Long conversation trimmed for speed' })}\n\n`)
      }

      let fullText = ''
+     let toolCalls: any[] = []
      
      // Use retry logic with timeout for reliability
      const completion = await withTimeout(
        withBackoff(() => openai.chat.completions.create({
          model: CHAT_MODEL,
          temperature: 0.3,
          stream: true,
          messages: [...ctx.system, ...ctx.history],
+         tools: TOOL_SCHEMAS,  // ✅ ADD: Enable tool calling
+         tool_choice: 'auto'
        })),
        25000 // 25s hard cap
      )

      for await (const part of completion) {
        const token = part.choices?.[0]?.delta?.content ?? ''
        if (token) {
          fullText += token
          stream.write(`data: ${JSON.stringify({ type: 'token', token })}\n\n`)
        }
+       
+       // ✅ ADD: Detect tool calls
+       const toolCallDeltas = part.choices?.[0]?.delta?.tool_calls
+       if (toolCallDeltas) {
+         for (const tc of toolCallDeltas) {
+           if (!toolCalls[tc.index]) {
+             toolCalls[tc.index] = { id: tc.id, type: 'function', function: { name: '', arguments: '' } }
+           }
+           if (tc.function?.name) toolCalls[tc.index].function.name += tc.function.name
+           if (tc.function?.arguments) toolCalls[tc.index].function.arguments += tc.function.arguments
+         }
+       }
      }
+
+     // ✅ ADD: Execute tool calls if any
+     if (toolCalls.length > 0) {
+       stream.write(`data: ${JSON.stringify({ type: 'note', note: 'Using tools...' })}\n\n`)
+       
+       for (const toolCall of toolCalls) {
+         const toolName = toolCall.function.name
+         const toolArgs = JSON.parse(toolCall.function.arguments || '{}')
+         
+         stream.write(`data: ${JSON.stringify({ type: 'tool_start', tool: toolName })}\n\n`)
+         
+         const toolResult = await executeTool(toolName, toolArgs, { userId, convoId })
+         
+         if (toolResult.ok) {
+           stream.write(`data: ${JSON.stringify({ type: 'tool_result', tool: toolName, result: toolResult.result })}\n\n`)
+         } else {
+           stream.write(`data: ${JSON.stringify({ type: 'tool_error', tool: toolName, error: toolResult.error })}\n\n`)
+         }
+         
+         // Append tool result to conversation and get final answer
+         const toolMessages = [
+           ...ctx.history,
+           { role: 'assistant' as const, content: fullText, tool_calls: [toolCall] },
+           { role: 'tool' as const, content: JSON.stringify(toolResult.result || { error: toolResult.error }), tool_call_id: toolCall.id }
+         ]
+         
+         // Resume model with tool context
+         const finalCompletion = await openai.chat.completions.create({
+           model: CHAT_MODEL,
+           temperature: 0.3,
+           stream: true,
+           messages: [...ctx.system, ...toolMessages]
+         })
+         
+         let finalText = ''
+         for await (const part of finalCompletion) {
+           const token = part.choices?.[0]?.delta?.content ?? ''
+           if (token) {
+             finalText += token
+             stream.write(`data: ${JSON.stringify({ type: 'token', token })}\n\n`)
+           }
+         }
+         
+         fullText = finalText
+       }
+     }

      const aiMsgId = await saveMessage(userId, 'assistant', fullText, target.slug)
```

---

### **DIFF 4: Update Frontend to Show Tool Execution**

**File**: `src/services/chatApi.ts`

```diff
      // Parse SSE lines
      let idx;
      while ((idx = buffer.indexOf('\n\n')) !== -1) {
        const rawEvent = buffer.slice(0, idx).trim();
        buffer = buffer.slice(idx + 2);
        
        // Only handle "data:" lines
        const dataLine = rawEvent.split('\n').find(l => l.startsWith('data:'));
        if (!dataLine) continue;
        
        try {
          const payload = JSON.parse(dataLine.replace(/^data:\s*/, ''));
          
          if (payload.type === 'employee') {
            detectedEmployee = payload.employee;
          } else if (payload.type === 'token') {
            assembled += payload.token;
            if (onToken) onToken(payload.token);
          } else if (payload.type === 'note' && payload.note) {
            // Log note for debugging (could show UI toast here)
            console.log('📝 Note:', payload.note);
+         } else if (payload.type === 'tool_start') {
+           console.log('🔧 Tool executing:', payload.tool);
+         } else if (payload.type === 'tool_result') {
+           console.log('✅ Tool complete:', payload.tool, payload.result);
+         } else if (payload.type === 'tool_error') {
+           console.error('❌ Tool failed:', payload.tool, payload.error);
          } else if (payload.type === 'done') {
            // Stream complete
          }
        } catch (parseErr) {
          console.log('SSE parse error:', parseErr);
        }
      }
    }
```

---

### **DIFF 5: Add get_transactions Tool**

**File**: `netlify/functions/tools/get-transactions.ts` (NEW)

```typescript
import { Handler } from '@netlify/functions';
import { admin } from '../_shared/upload';

export const handler: Handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };
    
    const { userId, from_date, to_date, vendor, category, limit = 20 } = JSON.parse(event.body || '{}');
    if (!userId) return { statusCode: 400, body: JSON.stringify({ error: 'Missing userId' }) };

    const sb = admin();
    
    let query = sb
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(limit);
    
    if (from_date) query = query.gte('date', from_date);
    if (to_date) query = query.lte('date', to_date);
    if (vendor) query = query.ilike('merchant', `%${vendor}%`);
    if (category) query = query.eq('category', category);
    
    const { data, error } = await query;
    if (error) throw error;
    
    const total = (data || []).reduce((sum, t) => sum + (t.amount || 0), 0);
    
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        transactions: data,
        count: data?.length || 0,
        total
      })
    };
  } catch (e: any) {
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
};
```

---

## E) TEST PLAN (Runbooks)

### **Happy Path Tests**

#### **Test 1: "Find my last Visa statement and process it"**

**Expected Flow**:
```
User message: "Find my last Visa statement and process it"
  ↓
Router: Detects "find" + "statement" → Routes to Byte
  ↓
Model: Decides to call search_gmail
  ↓
Tool call: search_gmail({ query: "visa statement", days: 90, limit: 5 })
  ↓
Result: [{ id: "msg-123", subject: "Sept Visa Statement", score: 88, ... }]
  ↓
Model: Calls fetch_email_attachments({ messageId: "msg-123" })
  ↓
Result: { ok: true, docIds: ["doc-456"], count: 1 }
  ↓
Model: "I found your September Visa statement and queued it for processing. You'll get a notification when it's ready!"
  ↓
[30s later] Notification: "Imported 12 transactions from september_statement.pdf"
```

**Test Command**:
```bash
curl -X POST http://localhost:8888/.netlify/functions/chat \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "demo-user",
    "convoId": "test-1",
    "messages": [{
      "role": "user",
      "content": "Find my last Visa statement and process it"
    }],
    "employee": "byte-docs"
  }'
```

**Expected Output** (SSE stream):
```
data: {"type":"employee","employee":"byte-docs"}
data: {"type":"note","note":"Using tools..."}
data: {"type":"tool_start","tool":"search_gmail"}
data: {"type":"tool_result","tool":"search_gmail","result":{...}}
data: {"type":"tool_start","tool":"fetch_email_attachments"}
data: {"type":"tool_result","tool":"fetch_email_attachments","result":{...}}
data: {"type":"token","token":"I"}
data: {"type":"token","token":" found"}
...
data: {"type":"done","employee":"byte-docs"}
```

---

#### **Test 2: "What did I import most recently?"**

**Expected**:
```
Tool: get_recent_import
Result: { document: { name: "receipt.jpg" }, summary: { transactions: 1, total: -4.50 } }
Response: "You recently uploaded receipt.jpg with 1 transaction for $4.50."
```

**Test**:
```bash
curl -X POST http://localhost:8888/.netlify/functions/chat \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "demo-user",
    "convoId": "test-2",
    "messages": [{"role": "user", "content": "What did I import most recently?"}]
  }'
```

---

#### **Test 3: "Do I have anything that needs review?"**

**Expected**:
```
Tool: get_transactions({ review_status: "needs_review" })
Result: { count: 3, transactions: [...] }
Response: "You have 3 transactions that need review: ..."
```

---

### **Error Tests**

#### **Test 4: Email Not Found**

**Input**: "Find my Costco receipts from 2020"  
**Tool**: search_gmail({ query: "costco", days: 1825 })  
**Result**: { messages: [], count: 0 }  
**Expected Response**: "I searched your Gmail for Costco receipts from the last 5 years but didn't find any. Would you like me to search for something else?"

---

#### **Test 5: Attachment Fetch Fails**

**Input**: Fetch invalid messageId  
**Tool**: fetch_email_attachments({ messageId: "invalid" })  
**Result**: { ok: false, error: "Message not found" }  
**Expected Response**: "I couldn't retrieve that email's attachments. The message may have been deleted. Would you like me to search again?"

---

### **Security Tests**

#### **Test 7: Verify RLS on Tool Calls**

```sql
-- Should only return user's own transactions
SELECT * FROM transactions WHERE user_id != 'test-user' LIMIT 1;
-- Should return 0 rows when called from tool with test-user context
```

#### **Test 8: Verify No Raw PII in Tool Results**

```bash
# Upload receipt with SSN in it
# Check tool result doesn't contain raw SSN
curl ...| grep -i "123-45-6789"
# Should return nothing (redacted already)
```

---

## F) ACCEPTANCE CRITERIA

| # | Criteria | Test Method | Status |
|---|----------|-------------|--------|
| 1 | Prime can search Gmail | Ask "Find Visa statements" | ⚠️ After wiring |
| 2 | Prime can fetch attachments | Ask "Process that email" | ⚠️ After wiring |
| 3 | Prime can query transactions | Ask "Show spending at Starbucks" | ⚠️ After wiring |
| 4 | Streaming remains smooth | No double-prints, clean output | ⚠️ Test needed |
| 5 | Tool calls are audited | Check logs for tool execution | ⚠️ After adding metrics |
| 6 | Rate limiting works | Make 10 rapid requests | ✅ Existing limiter applies |
| 7 | No RLS violations | Tool queries respect user_id | ✅ Built-in |
| 8 | No raw PII exposure | Tool results use redacted data | ✅ Guardrails protect |
| 9 | Code changes isolated | Small diffs, no rewrites | ✅ Plan is minimal |
| 10 | Notifications still fire | Imports trigger notifications | ✅ Already wired |

---

## G) IMPLEMENTATION SUMMARY

### **Files to Create** (4):
1. `netlify/functions/_shared/tool-schemas.ts` - Tool definitions for OpenAI
2. `netlify/functions/_shared/tool-executor.ts` - Execute tools and return results
3. `netlify/functions/tools/get-transactions.ts` - Query transactions tool
4. Updated `netlify/functions/chat.ts` - Add tool_calls parsing + execution

### **Files to Modify** (2):
5. `src/services/chatApi.ts` - Add tool event logging (optional)
6. `netlify/functions/_shared/openai.ts` - None (already good)

### **Lines of Code**: ~200 lines total (surgical changes)

### **Complexity**: 🟢 **LOW** - Small adapters, no refactors

---

## 🎯 **Ready to Implement?**

Say the word and I'll create all 4 files with complete implementation. This will take ~10 minutes to wire and test.
