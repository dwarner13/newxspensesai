# 🎯 Current Chat System - Complete Overview

**Last Updated**: October 16, 2025

---

## 📁 File Structure

```
netlify/functions/
├── chat.ts                          # Main chat endpoint (315 lines)
└── _shared/
    ├── router.ts                    # Employee routing (66 lines)
    ├── guardrails-production.ts     # Security layer (447 lines)
    ├── memory.ts                    # Memory helpers (40 lines)
    ├── pii.ts                       # PII masking (185 lines)
    ├── summary.ts                   # Summarization (72 lines)
    └── guardrail-log.ts             # Logger (9 lines)
```

---

## 🏗️ Architecture Overview

### Request Flow

```
1. POST /.netlify/functions/chat
   ↓
2. Version Check (CHAT_BACKEND_VERSION=v2)
   ↓
3. Parse Request (userId, messages)
   ↓
4. 🛡️ SECURITY PIPELINE:
   ├── PII Masking (maskPII)
   ├── Guardrails (runGuardrails)
   └── Moderation (OpenAI API)
   ↓
5. Memory Retrieval (facts + RAG)
   ↓
6. Employee Routing (routeToEmployee)
   ↓
7. Build System Prompt + Context
   ↓
8. 🔄 Stream Response:
   ├── OpenAI Chat Completion (streaming)
   ├── On-the-fly PII Masking (per token)
   └── Send to client
   ↓
9. Database Persistence:
   ├── Save user message (masked)
   ├── Save assistant message (redacted)
   ├── Log PII events
   └── Save conversation summary
```

---

## 🔐 Security Features

### 1. PII Masking (`pii.ts`)

**Detectors** (priority order):
```typescript
Financial:
- ca_credit_card, us_credit_card, uk_credit_card
- ca_bank_account, us_bank_account, uk_bank_account

Government IDs:
- ca_sin (Social Insurance Number)
- us_ssn (Social Security Number)
- uk_nino (National Insurance Number)

Contact:
- email addresses
- phone numbers (NA & UK)
- health cards, passports, driver's licenses
```

**Masking Strategies**:
- `last4`: Keep last 4 digits (e.g., `████████9012`)
- `full`: Mask everything (e.g., `{{CARD_XXXX}}`)
- `domain`: Keep domain for emails (e.g., `███@example.com`)

**Example**:
```typescript
Input:  "My card is 4532-1234-5678-9012"
Output: "My card is ████████9012"
        + found: [{ type: 'ca_credit_card', match: '4532-1234-5678-9012', index: 11 }]
```

---

### 2. Guardrails (`guardrails-production.ts`)

**Three-Layer Defense**:

#### Layer 1: PII Detection (Local Regex - <10ms)
- Runs FIRST, before any API calls
- Masks credit cards, SSNs, emails, phones, etc.
- Redacted text used for all subsequent checks
- **Guarantee**: No raw PII ever reaches OpenAI or database

#### Layer 2: Content Moderation (OpenAI API - ~200ms)
- Checks for: sexual content, violence, hate speech, harassment
- Critical categories ALWAYS blocked:
  - `sexual/minors`
  - `hate/threatening`
  - `harassment/threatening`
- User-friendly block messages per category

#### Layer 3: Jailbreak Detection (GPT-4o-mini - ~500ms)
- Detects prompt injection, role-play, system overrides
- Binary verdict: "yes" or "no"
- Blocks if confidence > threshold (default: 75%)

**Order of Operations**:
```
1. Input validation (length check: 100k chars max)
2. PII masking (local regex)
3. Content moderation (on redacted text)
4. Jailbreak detection (on redacted text, chat only)
```

**Presets**:
```typescript
'strict':    All checks ON, full masking, block everything
'balanced':  All checks ON, last-4 masking, soften some blocks
'creative':  PII masking ON, moderation/jailbreak OFF (chat only)
```

**Audit Logging**:
- Stores HASHES only (first 256 chars, SHA-256, truncated to 24 chars)
- Never stores raw PII or content
- Logs: user_id, stage, type, action, confidence, metadata

---

### 3. Streaming Security (`chat.ts` lines 206-240)

**On-the-fly PII Masking**:
```typescript
for await (const chunk of completion) {
  assistantRaw += token;
  
  // Mask accumulated text, send only new delta
  const { masked: maskedSoFar } = maskPII(assistantRaw, 'last4');
  const delta = maskedSoFar.slice(lastSentLen);
  
  controller.enqueue(new TextEncoder().encode(delta));
}
```

**Why This Matters**:
- Even if LLM generates PII (e.g., hallucinates a credit card), it's masked BEFORE reaching client
- No raw PII ever leaves the server
- Client sees redacted tokens in real-time

---

## 🤖 Employee Routing (`router.ts`)

### Employees & System Prompts

```typescript
'prime-boss':         CEO, decides if can answer or delegate (2-3 sentences)
'crystal-analytics':  Spending patterns, charts, trends, actions (2-3 sentences)
'ledger-tax':         Canadian taxes/deductions/CRA (2-3 sentences)
'byte-docs':          Document processing, OCR, uploads (1-2 sentences)
'tag-categorize':     Expense categorization (1-2 sentences)
'goalie-goals':       Financial goals, encouraging (2-3 sentences)
```

### Routing Logic

**1. Keyword Matching** (fast path):
```typescript
// Gmail/Email queries → Byte
/(pull|get|find).*(statement|invoice|receipt|email)/i

// Tax queries → Ledger
/(tax|deduction|cra|gst|write-off)/i

// Analytics → Crystal
/(trend|report|analytics|chart|spending)/i

// Documents → Byte
/(receipt|invoice|upload|scan|document|ocr)/i

// Categorization → Tag
/(categor|tag|classify|organize expense)/i

// Goals → Goalie
/(goal|save|budget|target|retirement)/i
```

**2. Few-Shot Similarity** (fallback):
```typescript
Examples:
- "What can I write off for my side business?" → ledger-tax
- "Show my top categories last month" → crystal-analytics
- "Set up weekly check-ins" → prime-boss
- "Help me scan these receipts" → byte-docs

Algorithm: Jaccard similarity over words
Threshold: > 0.55
```

**3. Default** (catch-all):
```typescript
No match → prime-boss (CEO handles everything else)
```

---

## 💾 Memory System (`memory.ts`)

### Functions

**1. Fetch User Facts**:
```typescript
fetchUserFacts(sb, userId)
// Returns: [{ fact: "User prefers CSV exports" }, ...]
// Limit: 50 most recent facts
```

**2. Recall Similar Memory** (RAG):
```typescript
recallSimilarMemory(sb, userId, query)
// Uses vector search (embeddings)
// Returns: [{ fact: "...", score: 0.85 }, ...]
// Limit: Top 5 results
```

**3. Save Chat Message**:
```typescript
saveChatMessage(sb, { userId, role, content, employee })
// Saves to chat_messages table
// Stores: user_id, role, content (redacted), employee_key
```

**4. Save Conversation Summary**:
```typescript
saveConvoSummary(sb, userId, summary)
// Saves to chat_convo_summaries table
// Rolling summary of conversation (<150 words)
```

### Context Injection

```typescript
// Facts and memories are appended to user message:
USER MESSAGE:
"What did I say about exports?"

AUGMENTED MESSAGE:
"What did I say about exports?

---
USER FACTS:
- User prefers CSV exports
- User is in Canada
- User runs a side business

RECENT MEMORY:
- Discussed export format preferences (score 0.92)
- Mentioned side business tax deductions (score 0.78)"
```

---

## 🔄 Streaming Implementation

### Response Headers

```typescript
{
  "Content-Type": "text/plain; charset=utf-8",
  "Cache-Control": "no-cache",
  "Transfer-Encoding": "chunked",
  "X-Chat-Backend": "v2"  // Version beacon
}
```

### Stream Flow

```
1. Create ReadableStream
2. Start OpenAI streaming completion
3. For each token:
   a. Accumulate raw text
   b. Mask accumulated text
   c. Calculate delta since last send
   d. Enqueue delta to stream
4. On completion:
   a. Final PII check on full response
   b. Log if assistant leaked PII (should never happen)
   c. Save messages to database (redacted)
   d. Generate & save summary
5. Close stream
```

### Error Handling

```typescript
try {
  // ... streaming logic
} catch (err) {
  const fallback = "Sorry — I ran into an issue generating a reply.";
  controller.enqueue(new TextEncoder().encode(fallback));
  controller.close();
  
  // Save error message to database
  await saveChatMessage(sb, { 
    userId, 
    role: "assistant", 
    content: fallback, 
    employee: "Prime" 
  });
}
```

---

## 📊 Database Schema

### Tables Used

**chat_messages**:
```sql
- user_id (uuid)
- role (text: 'user' | 'assistant')
- content (text) -- REDACTED (PII masked)
- employee_key (text) -- Which employee handled this
- created_at (timestamp)
```

**chat_convo_summaries**:
```sql
- user_id (uuid)
- convo_id (text)
- summary (text) -- Rolling summary (<150 words)
- updated_at (timestamp)
```

**user_memory_facts**:
```sql
- user_id (uuid)
- fact (text)
- created_at (timestamp)
```

**guardrail_events**:
```sql
- user_id (uuid)
- stage (text) -- 'chat_input', 'chat_moderation', 'chat_output'
- rule_type (text) -- 'pii_detected', 'moderation', 'jailbreak'
- action (text) -- 'masked', 'blocked', 'flagged'
- severity (int) -- 1-3
- content_hash (text) -- SHA-256 hash (24 chars, NOT raw content)
- meta (jsonb) -- Categories, types, confidence
- created_at (timestamp)
```

---

## 🧪 Testing Examples

### Test 1: Basic Chat
```bash
curl -X POST 'http://localhost:8888/.netlify/functions/chat' \
  -H 'Content-Type: application/json' \
  -d '{
    "userId": "00000000-0000-4000-8000-000000000001",
    "messages": [{"role": "user", "content": "Hi"}]
  }'

Expected: Streaming response from Prime
```

### Test 2: PII Masking
```bash
curl -X POST 'http://localhost:8888/.netlify/functions/chat' \
  -H 'Content-Type: application/json' \
  -d '{
    "userId": "test-user",
    "messages": [{"role": "user", "content": "My card is 4532-1234-5678-9012"}]
  }'

Expected: 
- Response mentions protecting payment card
- Database stores: "My card is ████████9012"
- guardrail_events logs PII detection
```

### Test 3: Employee Routing
```bash
# Tax question → Ledger
curl ... -d '{"userId":"test","messages":[{"role":"user","content":"What can I write off?"}]}'

# Analytics → Crystal
curl ... -d '{"userId":"test","messages":[{"role":"user","content":"Show spending trends"}]}'

# Document → Byte
curl ... -d '{"userId":"test","messages":[{"role":"user","content":"Extract invoice data"}]}'
```

### Test 4: Guardrails Block
```bash
curl -X POST 'http://localhost:8888/.netlify/functions/chat' \
  -H 'Content-Type: application/json' \
  -d '{
    "userId": "test",
    "messages": [{"role": "user", "content": "How to hack a bank account?"}]
  }'

Expected:
- Response: "I can't help with hacking, illegal activities..."
- guardrail_events logs 'moderation' block
```

---

## 🎛️ Environment Variables

### Required (Backend - `.env`)

```env
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...
OPENAI_API_KEY=sk-proj-...
OPENAI_CHAT_MODEL=gpt-4o-mini
CHAT_BACKEND_VERSION=v2  # ⚠️ REQUIRED for v2 to run
```

### Required (Frontend - `.env.local`)

```env
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbG...
VITE_CHAT_BUBBLE_ENABLED=true  # ⚠️ REQUIRED to show chat button
VITE_CHAT_ENDPOINT=/.netlify/functions/chat
```

### Optional (Feature Flags)

```env
ENABLE_TOOL_CALLING=false
ENABLE_GMAIL_TOOLS=false
ENABLE_SMART_IMPORT=false
```

---

## 🚨 Known Issues & Limitations

### Current Limitations

1. **No Session Management**: Uses implicit session (all messages for user)
2. **No Message History Windowing**: Sends all messages to OpenAI (could hit token limit)
3. **No Rate Limiting**: No protection against spam/abuse
4. **No Typing Indicators**: Client doesn't know when AI is "thinking"
5. **No Message IDs**: Can't edit or delete specific messages
6. **Simple Summary**: Rolling summary is basic (just truncation)

### Potential Improvements

1. **Add Session Support**:
   ```typescript
   const { userId, messages, sessionId } = JSON.parse(event.body);
   // Use sessionId to isolate conversations
   ```

2. **Token Window Management**:
   ```typescript
   const recentMessages = messages.slice(-10); // Last 10 messages only
   // Or use tokenizer to count exact tokens
   ```

3. **Rate Limiting**:
   ```typescript
   const rateLimitKey = `chat:${userId}:${Math.floor(Date.now() / 60000)}`;
   // Check Redis/Upstash for request count
   ```

4. **Better Summaries**:
   ```typescript
   // Use actual LLM summarization instead of truncation
   const summary = await openai.chat.completions.create({
     model: 'gpt-4o-mini',
     messages: [{ 
       role: 'system', 
       content: 'Summarize this conversation in 2-3 sentences...' 
     }]
   });
   ```

---

## ✅ Production Readiness Checklist

- [x] PII masking (input & output)
- [x] Content moderation
- [x] Jailbreak detection
- [x] Audit logging (hashes only)
- [x] Employee routing
- [x] Memory/RAG integration
- [x] Streaming responses
- [x] Error handling
- [x] Version flag check
- [ ] Rate limiting
- [ ] Token window management
- [ ] Session management
- [ ] Message persistence (with IDs)
- [ ] Typing indicators
- [ ] Retry logic
- [ ] Circuit breaker (for OpenAI API failures)
- [ ] Metrics/observability
- [ ] Cost tracking

---

## 📚 Related Documentation

- `DEV_SERVER_SETUP.md` - How to run locally
- `ENV_SETUP_GUIDE.md` - Environment variable setup
- `SECURITY_TESTING_GUIDE.md` - Security test cases
- `QUICK_REFERENCE.md` - API endpoints & slugs

---

**Status**: ✅ Production-ready for MVP with known limitations
**Next Steps**: Add rate limiting, session management, and token windowing


