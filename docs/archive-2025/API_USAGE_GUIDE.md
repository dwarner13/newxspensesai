# 📡 Chat API - Usage Guide

## Endpoint

```
POST /.netlify/functions/chat
```

---

## 🔐 Authentication

Currently uses `userId` in request body. 

**For production**: Should validate with Supabase Auth JWT:

```javascript
// Get user from Supabase Auth
const { data: { user } } = await supabase.auth.getUser();

// Use user.id in request
const userId = user?.id || 'anonymous';
```

---

## 📨 Request Format

### Basic Request

```javascript
await fetch("/.netlify/functions/chat", {
  method: "POST",
  headers: { 
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    userId: "user-123",              // Required: Supabase auth UID
    employeeSlug: "byte-doc",        // Required: Which AI employee
    message: "Process this receipt",  // Required: User's message
    sessionId: null,                  // Optional: null = create new
    stream: true                      // Optional: true = SSE, false = JSON
  })
});
```

### With Existing Session

```javascript
// Continue an existing conversation
const response = await fetch("/.netlify/functions/chat", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    userId: "user-123",
    employeeSlug: "byte-doc",
    sessionId: "550e8400-e29b-41d4-a716-446655440000", // Existing session
    message: "What did we discuss last time?"
  })
});
```

---

## 📥 Response Formats

### Streaming Response (SSE)

**Default**: `stream: true`

**Response Type**: `text/event-stream`

```javascript
const response = await fetch("/.netlify/functions/chat", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    userId: "user-123",
    employeeSlug: "prime-boss",
    message: "Hello Prime!"
  })
});

// Read SSE stream
const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  const chunk = decoder.decode(value);
  const lines = chunk.split('\n');

  for (const line of lines) {
    if (line.startsWith('data: ')) {
      const data = JSON.parse(line.slice(6));
      
      switch (data.type) {
        case 'start':
          console.log('Session:', data.session_id);
          console.log('Employee:', data.employee);
          break;
        
        case 'text':
          console.log('Token:', data.content);
          // Append to message display
          break;
        
        case 'tool_call':
          console.log('Using tool:', data.tool.name);
          break;
        
        case 'done':
          console.log('Complete! Tokens:', data.total_tokens);
          break;
        
        case 'error':
          console.error('Error:', data.error);
          break;
      }
    }
  }
}
```

### Non-Streaming Response (JSON)

**Set**: `stream: false`

**Response Type**: `application/json`

```javascript
const response = await fetch("/.netlify/functions/chat", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    userId: "user-123",
    employeeSlug: "byte-doc",
    message: "Extract this receipt",
    stream: false  // Get complete response
  })
});

const data = await response.json();

/*
{
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "message_id": "660e8400-e29b-41d4-a716-446655440001",
  "content": "I've extracted the receipt data...",
  "employee": {
    "slug": "byte-doc",
    "title": "Byte - Document Processing Specialist",
    "emoji": "📄"
  },
  "tokens": {
    "prompt": 234,
    "completion": 156,
    "total": 390
  }
}
*/
```

---

## 🎭 **Available Employees**

### Core Team (Always Use These Slugs)

| Slug | Name | Use When |
|------|------|----------|
| `prime-boss` | Prime | General questions, need routing, complex tasks |
| `byte-doc` | Byte | Document processing, OCR, file extraction |
| `tag-ai` | Tag | Categorization, organization, pattern finding |
| `crystal-analytics` | Crystal | Spending analysis, predictions, trends |
| `ledger-tax` | Ledger | Tax questions, deductions, compliance |
| `goalie-goals` | Goalie | Goal setting, progress tracking, motivation |
| `blitz-debt` | Blitz | Debt payoff, elimination strategies |

### Usage Examples

```javascript
// Document processing
employeeSlug: "byte-doc"
message: "Extract data from receipt.jpg"

// Tax advice
employeeSlug: "ledger-tax"
message: "What can I deduct for my home office?"

// Spending insights
employeeSlug: "crystal-analytics"
message: "Analyze my October spending"

// General/routing
employeeSlug: "prime-boss"
message: "Help me understand my finances"
```

---

## 🔄 **Session Management**

### Creating a New Session

```javascript
// First message - omit sessionId
const response = await fetch("/.netlify/functions/chat", {
  method: "POST",
  body: JSON.stringify({
    userId: "user-123",
    employeeSlug: "byte-doc",
    message: "Hello!",
    sessionId: null  // Or omit this field
  })
});

// Parse response to get session_id
const reader = response.body.getReader();
// ... read first SSE event (type: 'start')
// data.session_id = "550e8400-..."

// Save for next messages
localStorage.setItem('byte_session_id', data.session_id);
```

### Continuing a Session

```javascript
// Subsequent messages - include sessionId
const sessionId = localStorage.getItem('byte_session_id');

await fetch("/.netlify/functions/chat", {
  method: "POST",
  body: JSON.stringify({
    userId: "user-123",
    employeeSlug: "byte-doc",
    sessionId: sessionId,  // Continue conversation
    message: "What was that amount again?"
  })
});
```

---

## 🧩 **Using the React Hook**

### Easiest Way: Use `useChat` Hook

```tsx
import { useChat } from '../hooks/useChat';

function MyChatComponent() {
  const {
    messages,        // ChatMessage[]
    sessionId,       // string | null
    isLoading,       // boolean
    error,           // Error | null
    sendMessage,     // (text: string) => Promise<void>
    createOrUseSession,  // (employeeSlug: string) => Promise<void>
  } = useChat({
    employeeSlug: 'byte-doc',
    apiEndpoint: '/.netlify/functions/chat'
  });

  return (
    <div>
      {/* Display messages */}
      {messages.map(msg => (
        <div key={msg.id}>
          <strong>{msg.role}:</strong> {msg.content}
        </div>
      ))}

      {/* Input */}
      <input 
        onKeyPress={(e) => {
          if (e.key === 'Enter') {
            sendMessage(e.target.value);
          }
        }}
      />

      {/* Loading state */}
      {isLoading && <p>Byte is thinking...</p>}
    </div>
  );
}
```

---

## 📊 **SSE Event Types**

### Event: `start`

```json
{
  "type": "start",
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "employee": {
    "slug": "byte-doc",
    "title": "Byte - Document Processing Specialist",
    "emoji": "📄"
  }
}
```

**Action**: Save `session_id` for future messages

---

### Event: `text`

```json
{
  "type": "text",
  "content": "Hello! I'm"
}
```

**Action**: Append `content` to current message

---

### Event: `tool_call`

```json
{
  "type": "tool_call",
  "tool": {
    "id": "call_abc123",
    "name": "ocr"
  }
}
```

**Action**: Show "Using OCR tool..." indicator

---

### Event: `tool_result`

```json
{
  "type": "tool_result",
  "tool_call_id": "call_abc123",
  "result": {
    "extracted_text": "...",
    "confidence": 0.95
  }
}
```

**Action**: Update tool status to "completed"

---

### Event: `done`

```json
{
  "type": "done",
  "total_tokens": 390,
  "message_id": "660e8400-..."
}
```

**Action**: Mark message as complete, stop loading indicator

---

### Event: `error`

```json
{
  "type": "error",
  "error": "OpenAI API error: 429 Rate limit exceeded"
}
```

**Action**: Display error to user, enable retry

---

## 🔒 **PII Handling**

### Automatic Redaction

The API automatically redacts PII before storage:

```javascript
// User sends
message: "My card is 4111 1111 1111 1111"

// Stored in database as
redacted_content: "My card is {{CARD_1111}}"

// OpenAI receives
"My card is {{CARD_1111}}"  // Never sees real PII
```

**Redacted patterns**:
- Credit cards → `{{CARD_1234}}`
- SSN/SIN → `{{SSN}}`
- Phone → `{{PHONE}}`
- Email → `{{EMAIL_d***@domain.com}}`

---

## ⚠️ **Error Handling**

### Common Errors

```javascript
try {
  const response = await fetch("/.netlify/functions/chat", {
    method: "POST",
    body: JSON.stringify({...})
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Request failed');
  }

  // Process response...

} catch (error) {
  if (error.message.includes('Employee not found')) {
    // Invalid employeeSlug
    console.error('Use: prime-boss, byte-doc, tag-ai, etc.');
  } else if (error.message.includes('Unauthorized')) {
    // Auth issue
    console.error('Check userId or login status');
  } else {
    // Generic error
    console.error('Chat error:', error);
  }
}
```

---

## 🧪 **Testing with curl**

### Streaming Test

```bash
curl -N -X POST "http://localhost:8888/.netlify/functions/chat" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "TEST_USER",
    "employeeSlug": "byte-doc",
    "message": "Hello Byte!",
    "stream": true
  }'
```

**Expected**:
```
data: {"type":"start","session_id":"...","employee":{...}}

data: {"type":"text","content":"Hello"}

data: {"type":"text","content":"!"}

...

data: {"type":"done","total_tokens":123}
```

### Non-Streaming Test

```bash
curl -X POST "http://localhost:8888/.netlify/functions/chat" \
  -H "Content-Type": "application/json" \
  -d '{
    "userId": "TEST_USER",
    "employeeSlug": "prime-boss",
    "message": "Who are you?",
    "stream": false
  }'
```

**Expected**:
```json
{
  "session_id": "...",
  "message_id": "...",
  "content": "I'm Prime, the CEO of XspensesAI...",
  "employee": {...},
  "tokens": {...}
}
```

---

## 📋 **Complete Example (React)**

```tsx
import { useState, useEffect } from 'react';

export default function ChatExample() {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [sessionId, setSessionId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  async function sendMessage() {
    if (!message.trim()) return;

    // Add user message to UI
    setMessages(prev => [...prev, {
      role: 'user',
      content: message
    }]);

    setMessage('');
    setIsLoading(true);

    // Call API
    const response = await fetch('/.netlify/functions/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: 'user-123',
        employeeSlug: 'byte-doc',
        sessionId: sessionId,
        message: message
      })
    });

    // Handle SSE stream
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let aiMessage = { role: 'assistant', content: '' };

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = JSON.parse(line.slice(6));

          if (data.type === 'start') {
            setSessionId(data.session_id);
          } else if (data.type === 'text') {
            aiMessage.content += data.content;
            setMessages(prev => [...prev.slice(0, -1), {...aiMessage}]);
          } else if (data.type === 'done') {
            setIsLoading(false);
          }
        }
      }
    }

    setMessages(prev => [...prev, aiMessage]);
  }

  return (
    <div>
      {/* Messages */}
      {messages.map((msg, i) => (
        <div key={i}>
          <strong>{msg.role}:</strong> {msg.content}
        </div>
      ))}

      {/* Input */}
      <input
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
        disabled={isLoading}
      />

      {isLoading && <p>Loading...</p>}
    </div>
  );
}
```

---

## 🎯 **Or Just Use the Hook!**

**Simpler approach**:

```tsx
import { useChat } from '../hooks/useChat';

export default function EasyChat() {
  const { messages, isLoading, sendMessage } = useChat({
    employeeSlug: 'byte-doc'
  });

  return (
    <div>
      {messages.map(msg => (
        <div key={msg.id}>{msg.content}</div>
      ))}
      
      <input 
        onKeyPress={(e) => {
          if (e.key === 'Enter' && !isLoading) {
            sendMessage(e.target.value);
            e.target.value = '';
          }
        }}
      />
    </div>
  );
}
```

**The hook handles all the complexity for you!**

---

## 📊 **Available Employees Quick Reference**

```javascript
const EMPLOYEES = {
  'prime-boss': 'CEO & Orchestrator - use for general questions',
  'byte-doc': 'Document processing & OCR',
  'tag-ai': 'Transaction categorization',
  'crystal-analytics': 'Spending analysis & predictions',
  'ledger-tax': 'Tax advice & deductions',
  'goalie-goals': 'Goal setting & tracking',
  'blitz-debt': 'Debt elimination strategies'
};

// Validate before sending
if (!EMPLOYEES[employeeSlug]) {
  throw new Error(`Invalid employee: ${employeeSlug}`);
}
```

---

## 🧪 **Testing Checklist**

- [ ] Test with valid employee slug
- [ ] Test with invalid employee slug (should get error)
- [ ] Test streaming (stream: true)
- [ ] Test non-streaming (stream: false)
- [ ] Test with PII (verify it's redacted in DB)
- [ ] Test session continuity (send 2 messages with same sessionId)
- [ ] Test error handling (invalid API key, etc.)

---

## 🔍 **Database Verification**

After sending messages, verify in Supabase:

```sql
-- Check session was created
SELECT * FROM chat_sessions 
WHERE employee_slug = 'byte-doc' 
ORDER BY created_at DESC LIMIT 1;

-- Check messages were saved
SELECT 
  role, 
  content, 
  redacted_content, 
  tokens 
FROM chat_messages 
WHERE session_id = '<your-session-id>'
ORDER BY created_at;

-- Check PII was redacted
SELECT redacted_content 
FROM chat_messages 
WHERE content LIKE '%4111%';
-- Should show {{CARD_1111}} not actual number
```

---

## ⚡ **Pro Tips**

1. **Always save sessionId** for conversation continuity
2. **Use prime-boss for complex tasks** - he'll delegate to specialists
3. **Check response.ok** before parsing
4. **Handle SSE properly** - buffer incomplete lines
5. **Use the React hook** instead of raw fetch (easier!)

---

## 🆘 **Troubleshooting**

### "Employee not found: byte"

❌ **Wrong**:
```javascript
employeeSlug: "byte"  // Old slug
```

✅ **Correct**:
```javascript
employeeSlug: "byte-doc"  // Database slug
```

### "RLS policy violation"

Check your `userId` format:

```javascript
// Should be TEXT not UUID
userId: user.id  // ✅ Correct (string)
userId: user.id.toString()  // ❌ Unnecessary
```

### "Function not found"

```bash
# Check Netlify is running
netlify dev

# Verify function exists
ls netlify/functions/chat.ts
```

### Stream hangs

```javascript
// Add timeout
const controller = new AbortController();
setTimeout(() => controller.abort(), 30000); // 30s timeout

fetch(url, {
  signal: controller.signal,
  ...
});
```

---

## 📚 **Related Documentation**

- **Usage Examples**: `src/pages/ByteChatTest.tsx` (full example)
- **Hook Implementation**: `src/hooks/useChat.ts` (source code)
- **Employee List**: `EMPLOYEES.json` (all employees)
- **Testing**: `CHAT_RUNTIME_TESTING_GUIDE.md`

---

**Ready to chat with your AI employees!** 🚀

