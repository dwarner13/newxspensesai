# 🚀 Quick Reference Card
**AI Employee Centralization - Complete**

---

## 📍 Endpoints

### Chat
```
POST /.netlify/functions/chat
```
**Body**:
```json
{
  "userId": "user-123",
  "employeeSlug": "prime-boss",
  "message": "Your message here",
  "sessionId": "optional-session-id",
  "stream": true
}
```

### Embeddings
```
POST /.netlify/functions/embed
```
**Body**:
```json
{
  "userId": "user-123",
  "text": "Text to embed",
  "owner_scope": "global|receipt|goal",
  "source_type": "document|fact|message",
  "source_id": "optional-id"
}
```

---

## 👥 Canonical Employee Slugs

```typescript
const EMPLOYEES = {
  'prime-boss': 'CEO & Orchestrator',
  'byte-doc': 'Document Processing',
  'tag-ai': 'Categorization',
  'crystal-analytics': 'Predictions',
  'ledger-tax': 'Tax & Accounting',
  'goalie-coach': 'Goal Setting',
  'blitz-debt': 'Debt Management',
};
```

---

## 🎣 React Hook Usage

```tsx
import { useChat } from '@/hooks/useChat';

function MyChat() {
  const {
    messages,
    sessionId,
    isLoading,
    error,
    sendMessage,
    createOrUseSession,
  } = useChat({
    employeeSlug: 'prime-boss',  // Use canonical slug
    apiEndpoint: '/.netlify/functions/chat',
  });

  // Initialize session
  useEffect(() => {
    createOrUseSession('prime-boss');
  }, []);

  // Send message
  const handleSend = async (text: string) => {
    await sendMessage(text);
  };

  return (/* Your UI */);
}
```

---

## 🗄️ Database Tables

- `employee_profiles` - Employee definitions
- `tools_registry` - Available tools
- `chat_sessions` - User chat sessions
- `chat_messages` - Message history (with PII redaction)
- `chat_session_summaries` - Rolling summaries
- `user_memory_facts` - Long-term memory
- `memory_embeddings` - Vector search (RAG)
- `chat_usage_log` - Usage tracking
- `conversation_locks` - Concurrency control

---

## 🧪 Quick Tests

### Test 1: Memory
```bash
# Send
curl -X POST "http://localhost:8888/.netlify/functions/chat" \
  -H "Content-Type: application/json" \
  -d '{"userId":"test","employeeSlug":"prime-boss","message":"Remember my export preference is CSV"}'

# Then send
curl -X POST "http://localhost:8888/.netlify/functions/chat" \
  -H "Content-Type: application/json" \
  -d '{"userId":"test","employeeSlug":"prime-boss","message":"What is my export preference?"}'

# Expected: Response mentions "CSV"
```

### Test 2: PII Redaction
```bash
# Send sensitive data
curl -X POST "http://localhost:8888/.netlify/functions/chat" \
  -H "Content-Type: application/json" \
  -d '{"userId":"test","employeeSlug":"byte-doc","message":"My VISA is 4111 1111 1111 1111"}'

# Check database
SELECT redacted_content FROM chat_messages ORDER BY created_at DESC LIMIT 1;

# Expected: "My VISA is {{CARD_1111}}"
```

---

## 📊 Check Status

### Verify Endpoints
```bash
grep -r "'/api/chat'" src/
grep -r '"/api/agent"' src/
# Should return: 0 matches
```

### Verify Slugs
```bash
grep -r "employeeSlug.*['\"]prime['\"]" src/
grep -r "employeeSlug.*['\"]byte['\"]" src/
# Should return: 0 matches
```

---

## 📚 Documentation

1. [`ENDPOINT_AUDIT.md`](./ENDPOINT_AUDIT.md) - Endpoint changes
2. [`SLUG_AUDIT.md`](./SLUG_AUDIT.md) - Slug changes
3. [`DIFF_SUMMARY.md`](./DIFF_SUMMARY.md) - All diffs
4. [`PRIME_ENABLE_CHECKLIST.md`](./PRIME_ENABLE_CHECKLIST.md) - Prime delegation
5. [`CENTRALIZATION_COMPLETE.md`](./CENTRALIZATION_COMPLETE.md) - Full summary

---

## ✅ Checklist

- [x] All chats use `/.netlify/functions/chat`
- [x] All embeddings use `/.netlify/functions/embed`
- [x] Every chat uses `useChat` hook
- [x] All slugs normalized
- [x] No old endpoints remaining
- [x] No old slugs remaining
- [x] SSE streaming works
- [x] Diffs generated
- [x] Audits complete

---

**Status**: ✅ COMPLETE | **Next**: Deploy & Test 🚀

