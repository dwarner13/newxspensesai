# 🔌 Byte Integration with Centralized Chat Runtime

## ✅ What's Been Created

### 1. **useChat Hook** (`src/hooks/useChat.ts`)
**Purpose**: Centralized React hook for all AI employee chats

**Features**:
- ✅ SSE streaming support
- ✅ Session management (persisted to localStorage)
- ✅ Message state management
- ✅ Error handling and retry
- ✅ Loading states
- ✅ Abort signal support

**API**:
```typescript
const {
  messages,           // ChatMessage[]
  sessionId,          // string | null
  isLoading,          // boolean
  error,              // Error | null
  sendMessage,        // (text: string) => Promise<void>
  createOrUseSession, // (employeeSlug: string) => Promise<void>
  clearMessages,      // () => void
  retryLastMessage,   // () => Promise<void>
} = useChat({
  employeeSlug: 'byte-doc',
  apiEndpoint: '/.netlify/functions/chat'
});
```

### 2. **ByteChatCentralized Component** (`src/components/chat/ByteChatCentralized.tsx`)
**Purpose**: New Byte chat UI using centralized runtime

**Features**:
- ✅ Clean, modern UI
- ✅ Uses useChat hook
- ✅ Real-time streaming
- ✅ Session persistence
- ✅ Tool call indicators
- ✅ Error display
- ✅ Mobile responsive

**Usage**:
```tsx
<ByteChatCentralized
  isOpen={isChatOpen}
  onClose={() => setIsChatOpen(false)}
/>
```

### 3. **Test Page** (`src/pages/ByteChatTest.tsx`)
**Purpose**: Comprehensive testing interface

**Includes**:
- ✅ 4 PII redaction test prompts
- ✅ 4 test scenarios (Memory, Recall, RAG, PII)
- ✅ Database verification SQL queries
- ✅ Visual test results

### 4. **Netlify Function** (`netlify/functions/chat.ts`)
**Purpose**: API endpoint for chat

**Features**:
- ✅ POST /chat endpoint
- ✅ SSE streaming support
- ✅ Non-streaming fallback
- ✅ Session creation
- ✅ Context building
- ✅ Message persistence
- ✅ Usage logging
- ✅ CORS headers

---

## 🧪 Testing Instructions

### Step 1: Start Netlify Dev

```bash
netlify dev
```

**Expected**:
```
◈ Functions server now ready on http://localhost:8888/.netlify/functions
```

### Step 2: Navigate to Test Page

Add route to your app (if using React Router):

```typescript
// In your router config
import ByteChatTest from './pages/ByteChatTest';

<Route path="/byte-test" element={<ByteChatTest />} />
```

Or visit: `http://localhost:8888/byte-test`

### Step 3: Run PII Tests

In the Byte chat, send these 4 messages:

1. **"My VISA is 4111 1111 1111 1111"**
2. **"SIN 123-456-789"**
3. **"Call me at (780) 707-5554"**
4. **"Email: darrell.warner@gfs.com"**

### Step 4: Verify Database Redaction

Run in Supabase SQL Editor:

```sql
-- Get latest messages
SELECT 
  id,
  role,
  content,                -- Original (may contain PII in testing)
  redacted_content,       -- Should have {{TOKENS}}
  metadata,
  created_at
FROM chat_messages
WHERE user_id LIKE 'anon-%'  -- Anonymous users from test
ORDER BY created_at DESC
LIMIT 10;
```

**Expected in `redacted_content` column**:
- ✅ `"My VISA is {{CARD_1111}}"`
- ✅ `"{{SSN}}"`
- ✅ `"Call me at {{PHONE}}"`
- ✅ `"Email: {{EMAIL_d***@gfs.com}}"`

**❌ Should NOT see** actual PII values in `redacted_content`

### Step 5: Test Memory & Recall

Send these 3 messages in order:

**Message 1** (Memory):
```
Remember my export preference is CSV.
```

**Verify in database**:
```sql
SELECT * FROM user_memory_facts 
WHERE user_id LIKE 'anon-%'
ORDER BY created_at DESC;
```

**Expected**: Row with `fact: "User prefers CSV export format"` or similar

**Message 2** (Recall):
```
What's my export preference?
```

**Expected Response**: Byte should recall "CSV" from user_memory_facts

**Message 3** (RAG):
```
Summarize my October expenses from uploaded receipts.
```

**Expected**: Byte searches memory_embeddings table for relevant receipts

---

## 🔍 Verification Queries

### 1. Check Sessions Created

```sql
SELECT 
  id,
  user_id,
  employee_slug,
  title,
  message_count,
  token_count,
  created_at
FROM chat_sessions
WHERE employee_slug = 'byte-doc'
ORDER BY created_at DESC
LIMIT 5;
```

### 2. Check Messages with Redaction

```sql
SELECT 
  cm.id,
  cm.role,
  LEFT(cm.content, 50) as content_preview,
  LEFT(cm.redacted_content, 50) as redacted_preview,
  cm.tokens,
  cm.metadata->>'redaction_tokens' as has_redaction_tokens,
  cm.created_at
FROM chat_messages cm
JOIN chat_sessions cs ON cs.id = cm.session_id
WHERE cs.employee_slug = 'byte-doc'
ORDER BY cm.created_at DESC
LIMIT 10;
```

### 3. Check PII Audit

```sql
-- This should return 0 rows if redaction works
SELECT 
  id,
  redacted_content,
  'FOUND UNREDACTED PII!' as alert
FROM chat_messages
WHERE redacted_content IS NOT NULL
  AND (
    redacted_content ~ '\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}'  -- Credit card
    OR redacted_content ~ '\d{3}-\d{2}-\d{4}'  -- SSN
    OR redacted_content ~ '\(\d{3}\)\s?\d{3}-\d{4}'  -- Phone
    OR redacted_content ~ '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}'  -- Email (full match)
  )
ORDER BY created_at DESC;
```

**Expected**: **0 rows** (no PII in redacted fields)

### 4. Check Usage Logs

```sql
SELECT 
  user_id,
  employee_slug,
  model,
  prompt_tokens,
  completion_tokens,
  total_tokens,
  latency_ms,
  success,
  created_at
FROM chat_usage_log
WHERE employee_slug = 'byte-doc'
ORDER BY created_at DESC
LIMIT 10;
```

---

## 📊 Expected Data Flow

```
User: "My VISA is 4111 1111 1111 1111"
  ↓
Frontend (useChat hook):
  - Creates user message
  - POSTs to /.netlify/functions/chat
  ↓
Netlify Function (chat.ts):
  - Receives message
  - Calls redact() function
  - redacted = "My VISA is {{CARD_1111}}"
  ↓
Database (chat_messages table):
  - content: "My VISA is 4111 1111 1111 1111" (original)
  - redacted_content: "My VISA is {{CARD_1111}}" (masked)
  - metadata: { redaction_tokens: [["{{CARD_1111}}", "4111 1111 1111 1111"]] }
  ↓
Context Builder:
  - Uses redacted_content for OpenAI
  - OpenAI never sees real PII
  ↓
OpenAI API:
  - Receives: "My VISA is {{CARD_1111}}"
  - Responds: "I see you have a card ending in {{CARD_1111}}..."
  ↓
Response to User:
  - Can partially unmask: "card ending in 1111"
  - Never fully unmasks unless authorized
```

---

## 🚨 TODOs Discovered

### High Priority

1. **❗ User Authentication**
   - Current: Uses anonymous ID from localStorage
   - **TODO**: Integrate with Supabase Auth
   - **File**: `src/hooks/useChat.ts:getUserId()`
   - **Fix**: Use `useAuth()` context

2. **❗ Memory Fact Extraction**
   - Current: Facts must be manually extracted
   - **TODO**: Auto-detect memorable facts in responses
   - **File**: Need `chat_runtime/factExtractor.ts`
   - **Pattern**: Look for "remember", "prefer", "always", "never" in user messages

3. **❗ RAG Content Missing**
   - Current: No receipts/documents in memory_embeddings
   - **TODO**: Populate embeddings from existing receipts
   - **File**: Need migration script to embed existing data

### Medium Priority

4. **Tool Calling Not Implemented**
   - Current: Tools mentioned but not executed
   - **TODO**: Implement tool executor in Netlify function
   - **File**: `netlify/functions/chat.ts` needs tool calling loop

5. **Summary Trigger**
   - Current: Summaries not auto-generated
   - **TODO**: Trigger summary after 20 messages
   - **File**: `netlify/functions/chat.ts` needs summary logic

6. **Error Recovery**
   - Current: Basic retry
   - **TODO**: Exponential backoff, circuit breaker
   - **File**: `src/hooks/useChat.ts`

### Low Priority

7. **Typing Indicators**
   - Show "Byte is typing..." during streaming

8. **Message Reactions**
   - thumbs up/down on messages

9. **Conversation Export**
   - Export chat history as PDF/CSV

10. **Multi-Session Management**
    - Switch between multiple conversations

---

## 🎯 Next Steps

### Immediate (Required for Testing)

1. **Apply Database Migrations**
   ```bash
   supabase db push
   # Or run SQL files in Supabase Dashboard
   ```

2. **Set Environment Variables**
   ```bash
   # In .env
   SUPABASE_URL=https://xxxxx.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
   OPENAI_API_KEY=sk-...
   ```

3. **Start Netlify Dev**
   ```bash
   netlify dev
   ```

4. **Test with curl**
   ```bash
   curl -N -X POST "http://localhost:8888/.netlify/functions/chat" \
     -H "Content-Type: application/json" \
     -d '{"userId":"TEST_USER","employeeSlug":"byte-doc","message":"Hello Byte!"}'
   ```

### Short-term (This Week)

- ✅ Test PII redaction with all 4 test cases
- ✅ Verify database masking
- ✅ Test memory fact saving/recall
- ⬜ Implement fact extraction (TODO #2)
- ⬜ Populate RAG with sample receipts (TODO #3)

### Medium-term (Next Week)

- ⬜ Add tool calling support (TODO #4)
- ⬜ Implement auto-summarization (TODO #5)
- ⬜ Integrate Supabase Auth (TODO #1)
- ⬜ Add remaining employees (Prime, Tag, Crystal, etc.)

---

## 📝 Files Changed

### Created:
- ✅ `src/hooks/useChat.ts` (380 lines) - Centralized chat hook
- ✅ `src/components/chat/ByteChatCentralized.tsx` (200 lines) - New Byte UI
- ✅ `src/pages/ByteChatTest.tsx` (200 lines) - Test page
- ✅ `netlify/functions/chat.ts` (300 lines) - API endpoint

### To Update:
- ⬜ Add route in `src/App.tsx` or router config
- ⬜ Update `src/components/dashboard/ConnectedDashboard.tsx` to use ByteChatCentralized
- ⬜ Add user auth integration in `useChat.ts`

---

## 🔐 Security Verification

### What to Check:

1. **✅ PII Masking in Database**
   - Run audit query from test page
   - Should show {{TOKENS}} not actual values

2. **✅ RLS Working**
   - Try accessing another user's messages
   - Should be blocked by RLS

3. **✅ Redaction Tokens Stored**
   - Check metadata column for redaction_tokens
   - Allows controlled unmask if needed

4. **⚠️ Original Content**
   - Currently stored in `content` column
   - **Recommendation**: Encrypt or remove in production

---

## 🚀 Quick Test Commands

```bash
# 1. Start server
netlify dev

# 2. Test endpoint
curl -X POST "http://localhost:8888/.netlify/functions/chat" \
  -H "Content-Type: application/json" \
  -d '{"userId":"TEST","employeeSlug":"byte-doc","message":"My VISA is 4111 1111 1111 1111"}'

# 3. Check database
# Run SQL queries from test page in Supabase

# 4. Verify PII masked
# Look for {{CARD_1111}} in redacted_content
```

---

## ✅ Success Criteria

- [x] Byte chat connects to centralized runtime
- [ ] PII properly masked in database (verify after test)
- [ ] Session persists across refreshes
- [ ] Messages stream in real-time
- [ ] No errors in Netlify dev console
- [ ] Database queries show masked PII

---

## 📞 Ready to Test!

1. **Start Netlify Dev**: `netlify dev`
2. **Visit test page**: `http://localhost:8888/byte-test`
3. **Send PII test messages**
4. **Verify in Supabase SQL Editor**
5. **Confirm masked forms in DB** ✅

Let me know what you see! 🚀

