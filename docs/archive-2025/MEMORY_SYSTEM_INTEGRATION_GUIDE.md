# 🧠 Advanced Memory System - Integration Guide

**Complete LLM-based Memory Extraction + RAG Retrieval**

---

## 📋 What Was Built

I've created a **complete memory pipeline** with automatic extraction and intelligent retrieval:

### 🆕 New Files

1. **`netlify/functions/_shared/memory-extraction.ts`** (400+ lines)
   - LLM-based extraction (facts, preferences, tasks, corrections)
   - Confidence scoring with threshold filtering
   - Key-value storage with upserts
   - Automatic embedding generation

2. **`netlify/functions/_shared/context-retrieval.ts`** (300+ lines)
   - Structured context retrieval
   - Vector similarity search (RAG)
   - Task integration
   - Helper functions for fact management

3. **`supabase/migrations/20251016_memory_extraction.sql`** (300+ lines)
   - Enhanced `user_memory_facts` with key-value storage
   - New `user_tasks` table
   - Vector similarity search RPC function
   - Triggers and helper functions

---

## 🔄 Complete Memory Pipeline

```
USER MESSAGE
     ↓
[1] PII Masking
     ↓
[2] Guardrails
     ↓
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  CONTEXT RETRIEVAL (Before LLM)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     ├─ Fetch long-term facts
     ├─ Vector similarity search
     └─ Get pending tasks
     ↓
[3] Build Enhanced System Prompt
     ↓
[4] Call OpenAI with Context
     ↓
[5] Stream Response
     ↓
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  MEMORY EXTRACTION (After response)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     ├─ Extract facts (LLM JSON mode)
     ├─ Extract preferences
     ├─ Extract tasks
     ├─ Extract corrections
     ├─ Filter by confidence (≥0.6)
     ├─ Upsert to database
     └─ Generate embeddings
```

---

## 🔌 Integration into chat-v3-production.ts

### Step 1: Add Imports

```typescript
import { extractAndSaveMemories } from "./_shared/memory-extraction";
import { retrieveContext, buildSystemPromptWithContext } from "./_shared/context-retrieval";
```

### Step 2: Retrieve Context (After Guardrails, Before LLM)

Replace this section in `chat-v3-production.ts`:

```typescript
// OLD CODE (lines ~160-180):
const facts = await fetchUserFacts(sb, userId);
const recall = await recallSimilarMemory(sb, userId, masked);
const memoryForRouter = recall.map(r => ({ text: r.fact }));
```

**With this**:

```typescript
// ========================================================================
// 7. CONTEXT RETRIEVAL (Enhanced Memory System)
// ========================================================================
const { context, facts, memories, tasks } = await retrieveContext({
  userId,
  sessionId,
  userQuery: masked,
  maxFacts: 12,          // Top 12 facts
  topK: 6,               // Top 6 similar memories
  similarityThreshold: 0.70  // 70% similarity minimum
});

console.log(`[Chat] Context: ${facts.length} facts, ${memories.length} memories, ${tasks.length} tasks`);

// For routing (convert to old format if needed)
const memoryForRouter = memories.map(m => ({ text: m.content_redacted }));
```

### Step 3: Use Enhanced System Prompt

Replace this section:

```typescript
// OLD CODE (lines ~195-225):
let systemPrompt = route.systemPrompt + 
  "\n\nIMPORTANT: Never reveal PII...";

const contextBlocks: string[] = [];
if (facts?.length) {
  contextBlocks.push("USER FACTS:\n" + facts.map((f: any) => `- ${f.fact}`).join("\n"));
}
// ... more context building
```

**With this**:

```typescript
// ========================================================================
// 8. BUILD ENHANCED SYSTEM PROMPT
// ========================================================================
let baseSystemPrompt = route.systemPrompt + 
  "\n\nIMPORTANT: Never reveal PII, credit cards, SSNs, or passwords. " +
  "Do not provide instructions for illegal activities. " +
  "Use context if helpful but prioritize user privacy and safety.";

// Add PII notice if detected
if (found.length > 0) {
  const piiTypesList = found.map(f => {
    if (f.type.includes('credit') || f.type.includes('card')) return 'payment card';
    if (f.type.includes('ssn') || f.type.includes('sin')) return 'social security number';
    if (f.type.includes('email')) return 'email address';
    if (f.type.includes('phone')) return 'phone number';
    return 'sensitive information';
  }).join(', ');

  baseSystemPrompt += `\n\nNOTE: The user's message contained ${piiTypesList}. ` +
    `I've redacted it for security. Gently acknowledge this if relevant.`;
}

// Build final system prompt with context
const systemPrompt = buildSystemPromptWithContext(baseSystemPrompt, context);
```

### Step 4: Simplified Model Messages

```typescript
// ========================================================================
// 9. BUILD MODEL MESSAGES (Simplified)
// ========================================================================
const modelMessages = [
  { role: "system" as const, content: systemPrompt },
  ...recentMessages.map((m: any) => ({
    role: m.role as 'user' | 'assistant',
    content: m.content
  })),
  { role: "user" as const, content: masked }  // Just the message, context in system
];
```

### Step 5: Extract Memories (After Response)

Add this after the response is complete (after line ~350):

```typescript
// ========================================================================
// 12. MEMORY EXTRACTION (After Response Complete)
// ========================================================================
// Extract and save memories in background (don't block response)
extractAndSaveMemories({
  userId,
  sessionId,
  redactedUserText: masked,
  assistantResponse: assistantRedacted.slice(0, 500) // Include context
}).then(result => {
  console.log(`[Chat] Extracted memories:`, result.extracted);
}).catch(err => {
  console.warn('[Chat] Memory extraction failed (non-fatal):', err);
});
```

---

## 📊 Database Schema

### Enhanced `user_memory_facts`

```sql
CREATE TABLE user_memory_facts (
  id uuid PRIMARY KEY,
  user_id text NOT NULL,
  key text,                    -- NEW: Structured key
  value text,                  -- NEW: Structured value
  fact text,                   -- OLD: Free-form fact (optional)
  confidence int,              -- 0-100
  fact_type text,              -- NEW: 'fact', 'preference', 'correction'
  source text,                 -- NEW: 'auto_extracted', 'manual'
  updated_at timestamptz,
  UNIQUE(user_id, key)         -- NEW: Unique constraint for upserts
);
```

**Example Data**:
```json
[
  { "key": "export_format", "value": "CSV", "confidence": 90, "fact_type": "preference" },
  { "key": "business_type", "value": "freelance consulting", "confidence": 85, "fact_type": "fact" },
  { "key": "pref:notification_frequency", "value": "weekly", "confidence": 80, "fact_type": "preference" }
]
```

### New `user_tasks` Table

```sql
CREATE TABLE user_tasks (
  id uuid PRIMARY KEY,
  user_id text NOT NULL,
  description text NOT NULL,
  due_date timestamptz,
  status text,  -- 'pending', 'in_progress', 'completed', 'cancelled'
  priority int, -- 1-5 (1=highest)
  created_from_session uuid,  -- Links to chat_sessions
  created_at timestamptz
);
```

**Example Data**:
```json
[
  {
    "description": "Review Q4 expenses before tax filing",
    "due_date": "2025-10-23T00:00:00Z",
    "priority": 1,
    "status": "pending"
  }
]
```

---

## 🧪 Testing the Memory System

### Test 1: Fact Extraction

```bash
curl -X POST 'http://localhost:8888/.netlify/functions/chat-v3-production' \
  -H 'Content-Type: application/json' \
  -d '{
    "userId": "test-memory-001",
    "message": "I prefer CSV format for exports and I like getting weekly summaries"
  }'
```

**Verify**:
```sql
SELECT key, value, confidence, fact_type 
FROM user_memory_facts 
WHERE user_id = 'test-memory-001';

-- Expected:
-- | key                          | value   | confidence | fact_type   |
-- |------------------------------|---------|------------|-------------|
-- | pref:export_format           | CSV     | 90         | preference  |
-- | pref:notification_frequency  | weekly  | 85         | preference  |
```

---

### Test 2: Task Extraction

```bash
curl -X POST '...' -d '{
  "userId": "test-memory-002",
  "message": "I need to review my Q4 expenses before filing taxes next week"
}'
```

**Verify**:
```sql
SELECT description, due_date, status 
FROM user_tasks 
WHERE user_id = 'test-memory-002';

-- Expected:
-- | description                           | due_date          | status  |
-- |---------------------------------------|-------------------|---------|
-- | Review Q4 expenses before tax filing  | 2025-10-23...     | pending |
```

---

### Test 3: Context Retrieval (Personalization)

```bash
# First, establish facts
curl -X POST '...' -d '{
  "userId": "test-memory-003",
  "message": "I run a freelance consulting business in Toronto"
}'

# Then, ask a follow-up (should use stored facts)
curl -X POST '...' -d '{
  "userId": "test-memory-003",
  "sessionId": "<use-same-session>",
  "message": "What business expenses can I deduct?"
}'
```

**Expected Response**:
- Assistant should reference "freelance consulting business" 
- May mention Toronto tax rules (if relevant)
- Personalized to their business type

**Verify Context Was Used**:
```sql
-- Check what facts were stored
SELECT key, value FROM user_memory_facts 
WHERE user_id = 'test-memory-003';

-- Check embeddings were created
SELECT chunk, created_at FROM memory_embeddings 
WHERE user_id = 'test-memory-003';
```

---

### Test 4: Correction Extraction

```bash
curl -X POST '...' -d '{
  "userId": "test-memory-004",
  "message": "Actually my business name is Acme Corp, not ABC Inc"
}'
```

**Verify**:
```sql
SELECT key, value, fact_type, updated_at 
FROM user_memory_facts 
WHERE user_id = 'test-memory-004' AND key = 'business_name';

-- Expected:
-- | key           | value      | fact_type   | updated_at       |
-- |---------------|------------|-------------|------------------|
-- | business_name | Acme Corp  | correction  | 2025-10-16...    |
```

---

### Test 5: Vector Similarity Search (RAG)

```bash
# Establish some conversation history
curl -X POST '...' -d '{
  "userId": "test-memory-005",
  "message": "I spent $500 on office supplies last month"
}'

curl -X POST '...' -d '{
  "userId": "test-memory-005",
  "message": "I bought a new laptop for $1200"
}'

# Now ask a semantically similar question
curl -X POST '...' -d '{
  "userId": "test-memory-005",
  "message": "How much have I spent on work equipment?"
}'
```

**Expected**:
- Assistant should recall the laptop purchase ($1200)
- May also mention office supplies ($500)
- Context block shows "Relevant Past Conversations" with similarity scores

**Verify Vector Search**:
```sql
-- Check embeddings exist
SELECT COUNT(*) FROM memory_embeddings 
WHERE user_id = 'test-memory-005';

-- Test similarity search manually
SELECT 
  chunk,
  1 - (embedding <=> '[0.1, 0.2, ...]'::vector) as similarity
FROM memory_embeddings
WHERE user_id = 'test-memory-005'
ORDER BY similarity DESC
LIMIT 5;
```

---

## 📈 Monitoring Queries

### Memory Extraction Stats

```sql
-- Facts extracted per user
SELECT 
  user_id,
  COUNT(*) as fact_count,
  AVG(confidence) as avg_confidence,
  MAX(updated_at) as last_update
FROM user_memory_facts
WHERE source = 'auto_extracted'
GROUP BY user_id
ORDER BY fact_count DESC;
```

### Most Common Fact Keys

```sql
SELECT 
  key,
  COUNT(*) as count,
  AVG(confidence) as avg_confidence
FROM user_memory_facts
WHERE key IS NOT NULL
GROUP BY key
ORDER BY count DESC
LIMIT 20;
```

### Task Completion Rate

```sql
SELECT 
  status,
  COUNT(*) as count,
  AVG(EXTRACT(EPOCH FROM (completed_at - created_at))/3600) as avg_hours_to_complete
FROM user_tasks
GROUP BY status;
```

### Embedding Coverage

```sql
-- Users with embeddings
SELECT 
  COUNT(DISTINCT user_id) as users_with_embeddings,
  COUNT(*) as total_embeddings,
  AVG(token_count) as avg_tokens
FROM memory_embeddings;
```

---

## 🎯 Memory Extraction Examples

### What Gets Extracted

#### ✅ Facts (High Confidence)
```
User: "I'm 32 years old and live in Toronto"
→ key: "age", value: "32", confidence: 1.0
→ key: "home_city", value: "Toronto", confidence: 1.0
```

#### ✅ Preferences
```
User: "I always use CSV format for my exports"
→ key: "pref:export_format", value: "CSV", confidence: 0.9
```

#### ✅ Tasks
```
User: "I need to file my taxes by April 30th"
→ description: "File taxes", due: "2026-04-30", confidence: 0.95
```

#### ✅ Corrections
```
User: "Actually my budget is $3000, not $2500"
→ key: "budget_limit", value: "$3000", confidence: 0.85
```

#### ❌ NOT Extracted (Too Vague/Temporary)
```
User: "I think maybe I should look into that"
→ confidence: 0.3 → DROPPED

User: "Today's weather is nice"
→ confidence: 0.1 → DROPPED (not durable)
```

---

## 🔧 Configuration Options

### Confidence Threshold

Adjust in `memory-extraction.ts`:
```typescript
const CONFIDENCE_THRESHOLD = 0.6;  // Raise to 0.7 for stricter
```

### Similarity Threshold

Adjust in `context-retrieval.ts`:
```typescript
similarityThreshold: 0.70  // Lower to 0.6 for more recall
```

### Max Context Items

```typescript
const { context, facts, memories, tasks } = await retrieveContext({
  maxFacts: 12,    // Increase to 20 for more facts
  topK: 6,         // Increase to 10 for more memories
});
```

---

## 🚀 Deployment Checklist

- [ ] Run migration: `20251016_memory_extraction.sql`
- [ ] Verify `pgvector` extension enabled
- [ ] Test fact extraction (Test 1)
- [ ] Test task extraction (Test 2)
- [ ] Test context retrieval (Test 3)
- [ ] Test corrections (Test 4)
- [ ] Test vector search (Test 5)
- [ ] Monitor extraction stats
- [ ] Check embedding coverage
- [ ] Verify no PII in stored memories

---

## 📚 API Reference

### `extractAndSaveMemories()`

```typescript
await extractAndSaveMemories({
  userId: string,
  sessionId: string,
  redactedUserText: string,
  assistantResponse?: string  // Optional context
});

// Returns:
{
  extracted: {
    facts: number,
    preferences: number,
    tasks: number,
    corrections: number
  },
  details: { ... }
}
```

### `retrieveContext()`

```typescript
const context = await retrieveContext({
  userId: string,
  sessionId: string,
  userQuery: string,
  maxFacts?: number,      // default: 12
  topK?: number,          // default: 6
  similarityThreshold?: number  // default: 0.70
});

// Returns:
{
  context: string,  // Formatted context block
  facts: Array<{ key, value, updated_at }>,
  memories: Array<{ content_redacted, similarity }>,
  tasks: Array<{ description, due_date }>
}
```

---

## ✅ Summary

You now have a **complete, production-ready memory system** with:

- ✅ **Automatic extraction** (LLM-based JSON extraction)
- ✅ **Structured storage** (key-value facts + tasks)
- ✅ **Vector search** (RAG with cosine similarity)
- ✅ **Context retrieval** (facts + memories + tasks)
- ✅ **Confidence filtering** (drops low-quality extractions)
- ✅ **Background processing** (non-blocking)

**Next**: Integrate into `chat-v3-production.ts` and test!













