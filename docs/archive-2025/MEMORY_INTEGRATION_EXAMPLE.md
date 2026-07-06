# 🧠 Memory System - Final Integration Example

**Simple, hash-based memory with LLM extraction**

---

## 🎯 Your Approach (Perfect!)

```typescript
// Fact Format: Simple strings with prefixes
"pref:export_format=CSV"
"fact:business_type=freelance consulting"
"correct:budget_limit=$3000"

// Deduplication: MD5 hash of lowercase
fact_hash = md5(lowercase(fact))

// Unique constraint: (user_id, fact_hash)
```

---

## 🔌 Integration into chat.ts

### Complete Example

```typescript
import { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";

// Memory orchestrator (combines extraction + retrieval)
import { runMemoryOrchestration } from "./_shared/memory-orchestrator";

// Other imports (rate limiting, session, guardrails, etc.)
import { assertWithinRateLimit } from "./_shared/rate-limit";
import { ensureSession } from "./_shared/session";
import { maskPII } from "./_shared/pii";
import { runGuardrails } from "./_shared/guardrails-production";
import { routeToEmployee } from "./_shared/router";

export const handler: Handler = async (event) => {
  // Parse request
  const body = JSON.parse(event.body || "{}");
  const { userId, message } = body;

  // Rate limiting
  await assertWithinRateLimit(userId, 20);

  // Session management
  const sessionId = await ensureSession(sb, userId, body.sessionId);

  // Security pipeline
  const { masked, found } = maskPII(message, 'last4');
  const gr = await runGuardrails(masked, userId, 'chat', config);
  if (!gr.ok) {
    // Return blocked message
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 🧠 MEMORY ORCHESTRATION
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  
  const { contextBlock } = await runMemoryOrchestration({
    userId,
    sessionId,
    redactedUserText: masked,
    maxFacts: 12,
    topK: 6
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 📝 BUILD SYSTEM PROMPT WITH MEMORY CONTEXT
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  
  const route = routeToEmployee(null, [{ role: 'user', content: masked }], []);
  
  const systemPreamble = `
You are Prime, the user's AI financial cofounder. 
You help with expenses, budgeting, and financial planning.
Be concise, accurate, and take secure actions only.

${contextBlock ? `\n### MEMORY CONTEXT\n${contextBlock}\n` : ''}
`.trim();

  // Build model messages
  const modelMessages = [
    { role: "system", content: systemPreamble },
    { role: "user", content: masked }
  ];

  // Call OpenAI and stream response
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: modelMessages,
    stream: true
  });

  // Stream response back to user
  // ... (your streaming logic)
};
```

---

## 📊 What Context Looks Like

### Input
```typescript
{
  userId: "user-123",
  message: "What's my export format?"
}
```

### Memory Retrieval
```
Facts in database:
- pref:export_format=CSV
- fact:business_type=freelance consulting
- pref:notification_frequency=weekly

Similar memories (RAG):
- "I prefer CSV format for all my exports" (95% match)
- "Can you export this in CSV?" (82% match)
```

### Context Block (Injected into System Prompt)
```
### MEMORY CONTEXT

## Known User Facts & Preferences
- pref:export_format=CSV
- fact:business_type=freelance consulting
- pref:notification_frequency=weekly

## Relevant Past Conversations
• I prefer CSV format for all my exports (95% match)
• Can you export this in CSV? (82% match)
```

### Assistant Response
```
"Your preferred export format is CSV. I'll make sure all exports use that format."
```

---

## 🧪 Testing Example

```bash
# Test 1: Establish facts
curl -X POST 'http://localhost:8888/.netlify/functions/chat' \
  -H 'Content-Type: application/json' \
  -d '{
    "userId": "test-001",
    "message": "I prefer CSV format and weekly notifications"
  }'

# Verify facts were extracted
psql $DATABASE_URL -c "SELECT fact FROM user_memory_facts WHERE user_id='test-001';"

# Expected output:
#  fact
#  ----------------------------------
#  pref:export_format=CSV
#  pref:notification_frequency=weekly

# Test 2: Use stored facts
curl -X POST '...' -d '{
  "userId": "test-001",
  "message": "What format should I use?"
}'

# Expected: Assistant mentions "CSV format" from memory
```

---

## 🔄 Memory Extraction Flow

```
User says: "I prefer CSV format for exports"
       ↓
  [PII Masking]
       ↓
  [Guardrails]
       ↓
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  runMemoryOrchestration()
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
       ↓
  Extract with LLM (JSON mode):
  {
    "preferences": [
      {
        "key": "export_format",
        "value": "CSV",
        "confidence": 0.95
      }
    ]
  }
       ↓
  Normalize:
  "pref:export_format=CSV"
       ↓
  Hash:
  fact_hash = md5("pref:export_format=csv")
       ↓
  Upsert:
  INSERT ... ON CONFLICT (user_id, fact_hash)
       ↓
  Generate embedding & store
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## 📝 Database Queries

### View All Facts for User
```sql
SELECT fact, created_at, source
FROM user_memory_facts
WHERE user_id = 'user-123'
ORDER BY created_at DESC;
```

### Search Facts
```sql
SELECT fact
FROM user_memory_facts
WHERE user_id = 'user-123'
AND fact ILIKE '%csv%';
```

### View Extraction Stats
```sql
SELECT 
  source,
  COUNT(*) as count
FROM user_memory_facts
WHERE user_id = 'user-123'
GROUP BY source;

-- Output:
-- source         | count
-- ---------------+-------
-- extractor:v1   | 12
-- manual         | 3
```

---

## 🎛️ Configuration Options

### Extraction in Background (Non-Blocking)

```typescript
const { contextBlock } = await runMemoryOrchestration({
  userId,
  sessionId,
  redactedUserText: masked,
  extractInBackground: true  // ← Don't wait for extraction
});
```

**Use this when:**
- ✅ Response speed is critical
- ✅ Extraction can happen async
- ✅ You don't need immediate memory updates

**Don't use when:**
- ❌ User asks "what do you know about me?"
- ❌ Testing/debugging extraction
- ❌ Need to verify extraction completed

### Just Retrieval (No Extraction)

```typescript
import { getMemoryContext } from "./_shared/memory-orchestrator";

const { contextBlock } = await getMemoryContext({
  userId,
  sessionId,
  userQuery: masked
});
```

**Use this when:**
- ✅ You want to control extraction separately
- ✅ Read-only operations
- ✅ Preview/testing

### Post-Response Extraction

```typescript
import { extractMemoriesPostResponse } from "./_shared/memory-orchestrator";

// After assistant responds
await extractMemoriesPostResponse({
  userId,
  sessionId,
  redactedUserText: masked,
  assistantResponse: assistantText.slice(0, 500)
});
```

**Use this when:**
- ✅ You want to include assistant context
- ✅ Extraction should consider the full exchange
- ✅ Better accuracy with more context

---

## 📊 Fact Format Examples

### Preferences
```
pref:export_format=CSV
pref:notification_frequency=weekly
pref:theme=dark
pref:currency=CAD
```

### Facts
```
fact:age=32
fact:business_type=freelance consulting
fact:home_city=Toronto
fact:savings_goal=$50k by Dec 2026
```

### Corrections
```
correct:business_name=Acme Corp
correct:budget_limit=$3000
```

---

## ✅ Integration Checklist

- [ ] Run migration: `20251016_memory_extraction.sql`
- [ ] Import memory orchestrator in chat.ts
- [ ] Add `runMemoryOrchestration()` after guardrails
- [ ] Inject `contextBlock` into system prompt
- [ ] Test fact extraction
- [ ] Test context retrieval
- [ ] Verify deduplication (insert same fact twice)
- [ ] Check vector similarity search
- [ ] Monitor extraction stats

---

## 🚀 You're Ready!

Your memory system is now:
- ✅ **Simple** (hash-based, string format)
- ✅ **Automatic** (LLM extracts facts)
- ✅ **Intelligent** (vector search for context)
- ✅ **Deduped** (MD5 hash prevents duplicates)
- ✅ **Production-ready** (non-blocking, error handling)

**Just call `runMemoryOrchestration()` and you're done!**













