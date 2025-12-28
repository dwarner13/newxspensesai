# Context Injection Audit - What Data Each Employee Actually Receives

**Date:** 2025-01-XX  
**Status:** ✅ Complete Analysis

---

## 🎯 Executive Summary

**Key Finding:** Employees receive **generic context** (user facts, memory, history) but **NOT employee-specific data** (uncategorized transactions, analytics, budgets). Employee-specific data is accessed **on-demand via tools**, not pre-loaded into context.

**Context Architecture:**
1. **Global Context** (all employees): User facts, memory embeddings, conversation history
2. **Employee-Specific Context** (Prime only): Financial snapshot, memory summary
3. **Document Context** (Byte only, when documentIds provided): Document metadata + OCR text
4. **Tool-Based Access** (all employees): Data queried via tools when needed

---

## 📊 Context Flow Diagram

```
User sends message
    ↓
Frontend builds request
    ↓
    ├─→ Prime: Builds prime_context (financial snapshot)
    ├─→ Byte: Includes documentIds (if uploading)
    ├─→ Tag: Standard request (no special context)
    └─→ Crystal: Standard request (no special context)
    ↓
Backend receives request
    ↓
Builds context layers:
    1. Global AI Fluency Rule
    2. User Context (fluency, preferences, name)
    3. Prime Context (Prime only - financial snapshot)
    4. Prime Orchestration Rule (Prime only)
    5. Handoff Context (if switching employees)
    6. Employee System Prompt (from database)
    7. Memory Context (facts + RAG embeddings)
    8. Document Context (Byte only - if documentIds provided)
    9. Conversation History (last 50 messages)
    ↓
OpenAI API call with full context
```

---

## 👑 PRIME (prime-boss)

### ✅ Context Sources

**1. Frontend Context (`prime_context`)**
**Location:** `src/hooks/usePrimeChat.ts` (lines 434-474)

**Data Queried:**
- `primeState.userProfileSummary.displayName` → `displayName`
- `primeState.userProfileSummary.timezone` → `timezone`
- `primeState.userProfileSummary.currency` → `currency`
- `primeState.currentStage` → `currentStage`
- `primeState.financialSnapshot` → Full financial snapshot

**Financial Snapshot Structure:**
```typescript
{
  hasTransactions: boolean,
  uncategorizedCount: number,        // ← Dynamic!
  monthlySpend: number,              // ← Dynamic!
  topCategories: Array<{             // ← Dynamic!
    name: string,
    amount: number
  }>,
  hasDebt: boolean,                 // ← Dynamic!
  hasGoals: boolean                  // ← Dynamic!
}
```

**Memory Summary Structure:**
```typescript
{
  factsCount: number,                // ← Dynamic!
  lastUpdatedAt: string,
  recentFacts: string[]              // ← Dynamic! (top 3)
}
```

**2. Backend Context Building**
**Location:** `netlify/functions/chat.ts` (lines 1343-1394)

**What Gets Injected:**
```typescript
PRIME CONTEXT (User State Snapshot):
User: {displayName}
Timezone: {timezone}
Currency: {currency}
Stage: {currentStage}

Snapshot:
- hasTransactions: {true/false}
- uncategorizedCount: {number}        // ← ACTUALLY INJECTED
- monthlySpend: {amount}               // ← ACTUALLY INJECTED
- topCategories: {name (amount), ...} // ← ACTUALLY INJECTED
- hasDebt: {true/false}               // ← ACTUALLY INJECTED
- hasGoals: {true/false}               // ← ACTUALLY INJECTED

MemorySummary:
- factsCount: {number}                 // ← ACTUALLY INJECTED
- lastUpdatedAt: {timestamp}
- recentFacts: [{fact}, ...]           // ← ACTUALLY INJECTED
```

**3. Memory Context (All Employees)**
**Location:** `netlify/functions/chat.ts` (lines 1129-1140)

**Data Queried:**
- User facts (top 5-8 relevant facts)
- RAG embeddings (top 6 similar memories)
- Pending tasks (if includeTasks=true)

**4. Conversation History**
**Location:** `netlify/functions/chat.ts` (lines 1205-1248)

**Data Queried:**
- Last 50 messages from `chat_messages` table
- Filtered by `thread_id` or `session_id`

### ✅ Verification: Context Actually Passed to AI

**YES** - Prime receives:
- ✅ Financial snapshot (uncategorizedCount, monthlySpend, topCategories)
- ✅ Memory summary (factsCount, recentFacts)
- ✅ User facts (from memory system)
- ✅ RAG embeddings (semantic search results)
- ✅ Conversation history

**Code Evidence:**
```typescript
// netlify/functions/chat.ts:1383
systemMessages.push({ role: 'system', content: primeContextMessage });

// netlify/functions/chat.ts:1466-1473
const messages = [
  ...systemMessages,  // ← Includes Prime context
  ...recentMessages, // ← Includes history
  { role: 'user', content: userMessageContent },
];
```

---

## 📄 BYTE (byte-docs)

### ✅ Context Sources

**1. Document Context (When `documentIds` Provided)**
**Location:** `netlify/functions/chat.ts` (lines 353-450)

**Data Queried:**
```typescript
// Query: user_documents table
SELECT id, original_name, mime_type, ocr_text, status, created_at
FROM user_documents
WHERE id IN (documentIds) AND user_id = userId
```

**What Gets Injected:**
```typescript
Document: {original_name}
Type: {mime_type}
Status: {status}
Uploaded: {created_at}

OCR Text:
{ocr_text}  // ← Full OCR text if available

[Processing status if still processing]
```

**2. Memory Context (All Employees)**
- User facts (top 5-8)
- RAG embeddings (top 6)
- Pending tasks

**3. Conversation History**
- Last 50 messages

### ⚠️ Missing Context

**NOT Included:**
- ❌ Document processing stats (total uploads, success rate)
- ❌ User's document preferences
- ❌ Recent document processing patterns
- ❌ Transaction extraction history

**Why:** Byte relies on `documentIds` parameter to get document context. If no `documentIds` provided, Byte has no document context.

### ✅ Verification: Context Actually Passed to AI

**PARTIAL** - Byte receives:
- ✅ Document context (ONLY if `documentIds` provided)
- ✅ User facts
- ✅ RAG embeddings
- ✅ Conversation history
- ❌ Document stats (not queried)
- ❌ Processing patterns (not queried)

**Code Evidence:**
```typescript
// netlify/functions/chat.ts:1455-1456
if (documentIds && documentIds.length > 0) {
  attachmentContext = await buildAttachmentContext(sb, userId, documentIds);
}

// netlify/functions/chat.ts:1460-1462
if (attachmentContext) {
  userMessageContent = `${masked}${attachmentContext}`;  // ← Injected into user message
}
```

---

## 🏷️ TAG (tag-ai)

### ✅ Context Sources

**1. Memory Context (All Employees)**
- User facts (top 5-8)
- RAG embeddings (top 6)
- Pending tasks

**2. Conversation History**
- Last 50 messages

**3. Custom System Prompt (Category/Transaction Context)**
**Location:** `src/pages/dashboard/EmployeeChatPage.tsx` (lines 431, 349)

**When User Asks About Category:**
```typescript
`You are Tag, a friendly transaction categorization AI within **XspensesAI**. The user is asking about the "${cat.category}" category.`
```

**When User Asks About Transaction:**
```typescript
`You are Tag, a friendly and helpful transaction categorization AI within **XspensesAI**. The user is asking about a specific transaction.`
```

### ❌ Missing Context

**NOT Included:**
- ❌ Uncategorized transaction count
- ❌ Recent categorization patterns
- ❌ Category statistics
- ❌ Merchant insights
- ❌ Categorization accuracy metrics

**Why:** Tag relies on `transactions_query` tool to access transaction data on-demand. Context doesn't pre-load uncategorized count.

### ✅ Verification: Context Actually Passed to AI

**NO EMPLOYEE-SPECIFIC DATA** - Tag receives:
- ✅ User facts
- ✅ RAG embeddings
- ✅ Conversation history
- ✅ Category/transaction context (if custom systemPrompt provided)
- ❌ Uncategorized count (NOT in context)
- ❌ Category stats (NOT in context)

**Code Evidence:**
```typescript
// netlify/functions/chat.ts:1426-1431
if (customSystemPrompt) {
  systemMessages.push({ role: 'system', content: customSystemPrompt });
  // ← Custom prompt can include category context, but NOT uncategorized count
}

// NO code queries uncategorized transactions for Tag context
```

**Tool-Based Access:**
Tag uses `transactions_query` tool to get transaction data when needed:
```typescript
// Tag has access to transactions_query tool
// But data is NOT pre-loaded into context
```

---

## 🔮 CRYSTAL (crystal-analytics)

### ✅ Context Sources

**1. Memory Context (All Employees)**
- User facts (top 5-8)
- RAG embeddings (top 6)
- Pending tasks

**2. Conversation History**
- Last 50 messages

**3. Custom System Prompt (Category Context)**
**Location:** `src/pages/dashboard/EmployeeChatPage.tsx` (line 522)

**When User Asks About Category:**
```typescript
`You are Crystal, an AI financial analyst. The user is asking about the "${cat.category}" category.`
```

### ❌ Missing Context

**NOT Included:**
- ❌ Spending analytics (90-day trends, patterns)
- ❌ Budget data (budgets, budget status)
- ❌ Category totals
- ❌ Monthly summaries
- ❌ Forecast data

**Why:** Crystal relies on analytics tools (`crystal_summarize_expenses`, `analytics_forecast`, `transactions_query`) to access data on-demand. Context doesn't pre-load analytics.

### ✅ Verification: Context Actually Passed to AI

**NO EMPLOYEE-SPECIFIC DATA** - Crystal receives:
- ✅ User facts
- ✅ RAG embeddings
- ✅ Conversation history
- ✅ Category context (if custom systemPrompt provided)
- ❌ Spending analytics (NOT in context)
- ❌ Budget data (NOT in context)
- ❌ Forecast data (NOT in context)

**Code Evidence:**
```typescript
// NO code queries analytics data for Crystal context
// NO code queries budget data for Crystal context

// Crystal uses tools to access data:
// - crystal_summarize_expenses
// - analytics_forecast
// - transactions_query
// - transaction_category_totals
```

---

## 📊 Context Injection Summary Table

| Employee | Frontend Context | Backend Context | Memory Context | Employee-Specific Data | Tool Access |
|----------|-----------------|-----------------|----------------|----------------------|-------------|
| **Prime** | ✅ `prime_context` (financial snapshot) | ✅ Financial snapshot injected | ✅ Facts + RAG | ✅ Uncategorized count, top categories, memory summary | ✅ `request_employee_handoff` |
| **Byte** | ✅ `documentIds` (optional) | ✅ Document metadata + OCR text | ✅ Facts + RAG | ⚠️ Only if `documentIds` provided | ✅ `vision_ocr_light`, `ingest_statement_enhanced` |
| **Tag** | ❌ None | ❌ None | ✅ Facts + RAG | ❌ No uncategorized count | ✅ `transactions_query`, `tag_*` tools |
| **Crystal** | ❌ None | ❌ None | ✅ Facts + RAG | ❌ No analytics/budgets | ✅ `crystal_*`, `analytics_*`, `transactions_query` |
| **Ledger** | ❌ None | ❌ None | ✅ Facts + RAG | ❌ No tax data | ✅ `transactions_query`, `transaction_category_totals` |
| **Goalie** | ❌ None | ❌ None | ✅ Facts + RAG | ❌ No goal data | ✅ `goalie_*`, `transactions_query` |
| **Blitz** | ❌ None | ❌ None | ✅ Facts + RAG | ❌ No debt data | ✅ `transactions_query`, `goalie_*` |

---

## 🔍 Detailed Context Breakdown

### 1. Global Context (All Employees)

**Source:** `netlify/functions/chat.ts` (lines 1316-1341)

**Data Queried:**
```typescript
// 1. AI User Context
const ctx = await fetchAiUserContext(userId);
// Queries: profiles table
// Returns: ai_fluency_level, ai_fluency_score, currency, timezone, display_name

// 2. User Profile
const userProfile = await getUserProfile(sb, userId);
// Queries: profiles table
// Returns: preferredName, scope, primaryGoal, proactivityLevel, etc.
```

**What Gets Injected:**
```
SYSTEM RULE: AI FLUENCY ADAPTATION
[Global fluency rules]

XspensesAI User Context:
- user_id: {userId}
- display_name: {displayName}
- currency: {currency}
- timezone: {timezone}
- ai_fluency_level: {Explorer|Builder|Operator|Strategist|Architect}
- ai_fluency_score: {score} (internal only)

User Name Context (IMPORTANT):
- User display name: {preferredName}
- Address the user as "{firstName}" in greetings
- NEVER show their email address as their name
```

**Verification:** ✅ **PASSED** - All employees receive this context

---

### 2. Memory Context (All Employees)

**Source:** `netlify/functions/chat.ts` (lines 1129-1140)

**Data Queried:**
```typescript
const memory = await getMemory({
  userId,
  sessionId,
  query: masked,  // User's current message
  options: {
    maxFacts: 5-8,      // Top relevant facts
    topK: 6,            // Top 6 RAG embeddings
    minScore: 0.2,      // Minimum similarity
    includeTasks: true, // Include pending tasks
  }
});
```

**What Gets Injected:**
```
Relevant user context:

## Known User Facts & Preferences
- {fact 1}
- {fact 2}
- {fact 3}
...

## Pending Tasks
- {task 1} (due {date})
- {task 2}
...

## Relevant Past Conversations
• {memory snippet 1} (85% match)
• {memory snippet 2} (72% match)
...
```

**Verification:** ✅ **PASSED** - All employees receive memory context

---

### 3. Conversation History (All Employees)

**Source:** `netlify/functions/chat.ts` (lines 1205-1248)

**Data Queried:**
```typescript
// Query 1: By thread_id (preferred)
SELECT id, role, content, created_at
FROM chat_messages
WHERE thread_id = {threadId}
ORDER BY created_at ASC
LIMIT 50

// Query 2: Fallback by session_id
SELECT id, role, content, created_at
FROM chat_messages
WHERE session_id = {sessionId}
ORDER BY created_at ASC
LIMIT 50
```

**What Gets Injected:**
```typescript
// Added to messages array as user/assistant messages
[
  { role: 'user', content: 'Previous message 1' },
  { role: 'assistant', content: 'Previous response 1' },
  { role: 'user', content: 'Previous message 2' },
  ...
]
```

**Verification:** ✅ **PASSED** - All employees receive conversation history

---

### 4. Prime-Specific Context

**Source:** `src/hooks/usePrimeChat.ts` (lines 434-474) → `netlify/functions/chat.ts` (lines 1343-1394)

**Frontend Builds:**
```typescript
primeContext = {
  displayName: firstName || displayName,
  timezone: primeState.userProfileSummary?.timezone,
  currency: primeState.userProfileSummary?.currency,
  currentStage: primeState.currentStage,
  financialSnapshot: {
    hasTransactions: boolean,
    uncategorizedCount: number,        // ← FROM PrimeState
    monthlySpend: number,              // ← FROM PrimeState
    topCategories: Array<{...}>,       // ← FROM PrimeState
    hasDebt: boolean,                  // ← FROM PrimeState
    hasGoals: boolean                  // ← FROM PrimeState
  },
  memorySummary: {
    factsCount: number,                 // ← FROM PrimeState
    lastUpdatedAt: string,
    recentFacts: string[]              // ← FROM PrimeState
  }
};
```

**Backend Injects:**
```typescript
PRIME CONTEXT (User State Snapshot):
User: {displayName}
Timezone: {timezone}
Currency: {currency}
Stage: {currentStage}

Snapshot:
- hasTransactions: {true/false}
- uncategorizedCount: {number}        // ← ACTUALLY INJECTED
- monthlySpend: {amount}               // ← ACTUALLY INJECTED
- topCategories: {name (amount), ...} // ← ACTUALLY INJECTED
- hasDebt: {true/false}               // ← ACTUALLY INJECTED
- hasGoals: {true/false}               // ← ACTUALLY INJECTED

MemorySummary:
- factsCount: {number}                 // ← ACTUALLY INJECTED
- lastUpdatedAt: {timestamp}
- recentFacts: [{fact}, ...]           // ← ACTUALLY INJECTED
```

**Verification:** ✅ **PASSED** - Prime receives full financial snapshot

---

### 5. Byte-Specific Context (Document Context)

**Source:** `netlify/functions/chat.ts` (lines 353-450)

**Data Queried:**
```typescript
// ONLY if documentIds provided
SELECT id, original_name, mime_type, ocr_text, status, created_at
FROM user_documents
WHERE id IN (documentIds) AND user_id = userId
```

**What Gets Injected:**
```typescript
// Added to user message (not system message)
Document: {original_name}
Type: {mime_type}
Status: {status}
Uploaded: {created_at}

OCR Text:
{ocr_text}  // ← Full OCR text if available

[If processing: "This document is still being processed..."]
```

**Verification:** ⚠️ **PARTIAL** - Byte receives document context ONLY if `documentIds` provided

**Missing:**
- Document processing stats
- User's document preferences
- Recent processing patterns

---

### 6. Tag-Specific Context

**Source:** `src/pages/dashboard/EmployeeChatPage.tsx` (lines 431, 349)

**Custom System Prompt (Category Context):**
```typescript
// When user asks about category
`You are Tag, a friendly transaction categorization AI within **XspensesAI**. The user is asking about the "${cat.category}" category.`
```

**Verification:** ❌ **NO EMPLOYEE-SPECIFIC DATA** - Tag receives:
- ✅ Custom system prompt (category name)
- ❌ Uncategorized transaction count (NOT queried)
- ❌ Category statistics (NOT queried)
- ❌ Recent categorization patterns (NOT queried)

**Tool Access:**
Tag uses `transactions_query` tool to get data on-demand:
```typescript
// Tag has tools:
// - transactions_query (can query uncategorized transactions)
// - tag_update_transaction_category
// - tag_create_manual_transaction
// But data is NOT pre-loaded into context
```

---

### 7. Crystal-Specific Context

**Source:** `src/pages/dashboard/EmployeeChatPage.tsx` (line 522)

**Custom System Prompt (Category Context):**
```typescript
// When user asks about category
`You are Crystal, an AI financial analyst. The user is asking about the "${cat.category}" category.`
```

**Verification:** ❌ **NO EMPLOYEE-SPECIFIC DATA** - Crystal receives:
- ✅ Custom system prompt (category name)
- ❌ Spending analytics (NOT queried)
- ❌ Budget data (NOT queried)
- ❌ Forecast data (NOT queried)

**Tool Access:**
Crystal uses analytics tools to get data on-demand:
```typescript
// Crystal has tools:
// - crystal_summarize_expenses (queries spending data)
// - analytics_forecast (queries forecast data)
// - transactions_query (queries transactions)
// - transaction_category_totals (queries category totals)
// But data is NOT pre-loaded into context
```

---

## 🔧 How Context Is Actually Used

### Context Injection Flow

```
1. Frontend builds request
   ├─→ Prime: Adds prime_context
   ├─→ Byte: Adds documentIds (if uploading)
   └─→ Others: Standard request

2. Backend receives request
   ├─→ Queries user profile (fluency, preferences)
   ├─→ Queries memory (facts + RAG)
   ├─→ Queries conversation history
   ├─→ Builds Prime context (if Prime)
   ├─→ Builds document context (if Byte + documentIds)
   └─→ Builds system messages array

3. OpenAI API call
   ├─→ System messages (fluency, context, prompts)
   ├─→ Conversation history
   └─→ User message (+ document context if Byte)

4. AI responds
   ├─→ Can use tools to query more data
   └─→ Returns response with tool calls if needed
```

### Tool-Based Data Access

**Key Finding:** Employees don't receive employee-specific data in context. Instead, they use **tools** to query data on-demand.

**Example: Tag**
```typescript
// Tag does NOT receive uncategorized count in context
// Instead, Tag uses transactions_query tool:

User: "Show me uncategorized transactions"
Tag: [Calls transactions_query tool]
     [Tool queries database]
     [Returns uncategorized transactions]
Tag: "I found 12 uncategorized transactions..."
```

**Example: Crystal**
```typescript
// Crystal does NOT receive analytics in context
// Instead, Crystal uses analytics tools:

User: "Analyze my spending"
Crystal: [Calls crystal_summarize_expenses tool]
         [Tool queries spending data]
         [Returns analytics]
Crystal: "Your spending increased 23% MoM..."
```

---

## ✅ What's Working

1. **Prime Context** - ✅ Excellent
   - Receives full financial snapshot
   - Receives memory summary
   - Can make informed delegation decisions

2. **Memory System** - ✅ Excellent
   - All employees receive user facts
   - RAG embeddings provide semantic search
   - Contextual memory retrieval

3. **Document Context** - ✅ Good (when provided)
   - Byte receives document metadata + OCR text
   - Only works if `documentIds` provided

4. **Tool-Based Access** - ✅ Good
   - Employees can query data on-demand
   - Flexible, doesn't bloat context

---

## ❌ What's Missing

### 1. Tag: No Uncategorized Count in Context

**Current:** Tag receives no uncategorized transaction count  
**Impact:** Tag can't proactively mention uncategorized transactions  
**Fix:** Add uncategorized count to Tag's context

**Recommended Implementation:**
```typescript
// In netlify/functions/chat.ts
if (finalEmployeeSlug === 'tag-ai') {
  // Query uncategorized transactions
  const { data: uncategorized } = await sb
    .from('transactions')
    .select('id', { count: 'exact' })
    .eq('user_id', userId)
    .is('category', null)
    .limit(1);
  
  const uncategorizedCount = uncategorized?.length || 0;
  
  if (uncategorizedCount > 0) {
    const tagContext = `TAG CONTEXT:
- Uncategorized transactions: ${uncategorizedCount}
- These need categorization`;
    systemMessages.push({ role: 'system', content: tagContext });
  }
}
```

### 2. Crystal: No Analytics/Budget Data in Context

**Current:** Crystal receives no analytics or budget data  
**Impact:** Crystal can't proactively mention spending trends or budget status  
**Fix:** Add analytics summary to Crystal's context

**Recommended Implementation:**
```typescript
// In netlify/functions/chat.ts
if (finalEmployeeSlug === 'crystal-analytics') {
  // Query 90-day spending summary
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
  
  const { data: spending } = await sb
    .from('transactions')
    .select('amount, category, date')
    .eq('user_id', userId)
    .gte('date', ninetyDaysAgo.toISOString());
  
  // Calculate summary
  const totalSpend = spending?.reduce((sum, t) => sum + (t.amount || 0), 0) || 0;
  const avgMonthly = totalSpend / 3;
  
  const crystalContext = `CRYSTAL CONTEXT:
- 90-day spending: ${totalSpend}
- Average monthly: ${avgMonthly}
- Transaction count: ${spending?.length || 0}`;
  
  systemMessages.push({ role: 'system', content: crystalContext });
}
```

### 3. Byte: No Document Stats in Context

**Current:** Byte receives document context only if `documentIds` provided  
**Impact:** Byte can't proactively mention document processing stats  
**Fix:** Add document stats to Byte's context

**Recommended Implementation:**
```typescript
// In netlify/functions/chat.ts
if (finalEmployeeSlug === 'byte-docs') {
  // Query document stats
  const { data: docs } = await sb
    .from('user_documents')
    .select('status, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(10);
  
  const processedCount = docs?.filter(d => d.status === 'processed').length || 0;
  const pendingCount = docs?.filter(d => d.status === 'pending' || d.status === 'processing').length || 0;
  
  const byteContext = `BYTE CONTEXT:
- Recent documents processed: ${processedCount}
- Documents pending: ${pendingCount}
- Total documents: ${docs?.length || 0}`;
  
  systemMessages.push({ role: 'system', content: byteContext });
}
```

### 4. Ledger, Goalie, Blitz: No Context at All

**Current:** These employees receive no employee-specific context  
**Impact:** Can't provide accurate advice without user data  
**Fix:** Add context for each employee

---

## 📈 Context Injection Quality Score

| Employee | Context Quality | Score | Notes |
|----------|----------------|-------|-------|
| **Prime** | ⭐⭐⭐⭐⭐ | 5/5 | Full financial snapshot + memory summary |
| **Byte** | ⭐⭐⭐ | 3/5 | Document context only if `documentIds` provided |
| **Tag** | ⭐⭐ | 2/5 | No uncategorized count, relies on tools |
| **Crystal** | ⭐⭐ | 2/5 | No analytics/budgets, relies on tools |
| **Ledger** | ⭐ | 1/5 | No tax data, relies on tools |
| **Goalie** | ⭐ | 1/5 | No goal data, relies on tools |
| **Blitz** | ⭐ | 1/5 | No debt data, relies on tools |

---

## 🎯 Recommendations

### Priority 1: Add Context for Tag, Crystal, Byte

**Tag:**
- Query uncategorized transaction count
- Query recent categorization patterns
- Inject into system message

**Crystal:**
- Query 90-day spending summary
- Query budget status
- Inject into system message

**Byte:**
- Query document processing stats
- Query recent uploads
- Inject into system message

### Priority 2: Add Context for Ledger, Goalie, Blitz

**Ledger:**
- Query tax-relevant data (income, deductions)
- Query expense mode (business/personal)
- Inject into system message

**Goalie:**
- Query active goals
- Query goal progress
- Inject into system message

**Blitz:**
- Query debt balances
- Query payment history
- Inject into system message

### Priority 3: Optimize Context Building

**Current:** Context built on every request  
**Optimization:** Cache context for 5 minutes, invalidate on data updates

---

## 📊 Summary

**What Employees Actually Receive:**

| Context Type | Prime | Byte | Tag | Crystal | Others |
|--------------|-------|------|-----|---------|--------|
| **User Facts** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **RAG Embeddings** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Conversation History** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Financial Snapshot** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Uncategorized Count** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Analytics Data** | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Budget Data** | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Document Stats** | ❌ | ⚠️ | ❌ | ❌ | ❌ |
| **Tax Data** | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Goal Data** | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Debt Data** | ❌ | ❌ | ❌ | ❌ | ❌ |

**Key Finding:** Only Prime receives employee-specific data in context. All other employees rely on **tool-based data access** for employee-specific information.

---

**Last Updated:** 2025-01-XX





