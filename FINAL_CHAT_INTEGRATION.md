# 🎯 Final Chat Integration - Complete Example

**Clean architecture with shared memory context + employee personas**

---

## 🏗️ Architecture

```
Memory Context (Shared)
       ↓
System Preamble (ALL employees use this)
       ↓
Employee Persona (Optional flavor)
       ↓
Conversation History
       ↓
User Message
```

---

## 📝 Complete chat.ts Implementation

```typescript
import type { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";

// Core dependencies
import { assertWithinRateLimit } from "./_shared/rate-limit";
import { ensureSession, getRecentMessages, saveChatMessage } from "./_shared/session";
import { maskPII } from "./_shared/pii";
import { runGuardrails } from "./_shared/guardrails-production";
import { runMemoryOrchestration } from "./_shared/memory-orchestrator";
import { routeToEmployee } from "./_shared/router";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;
const MODEL = process.env.OPENAI_CHAT_MODEL || "gpt-4o-mini";

function createSupabaseClient() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false }
  });
}

export const handler: Handler = async (event) => {
  const startTime = Date.now();
  
  try {
    // ========================================================================
    // 1. PARSE & VALIDATE REQUEST
    // ========================================================================
    if (event.httpMethod !== "POST") {
      return { statusCode: 405, body: "Method Not Allowed" };
    }

    const body = JSON.parse(event.body || "{}");
    const { userId, message, sessionId: requestedSessionId, mode } = body;

    if (!userId || !message) {
      return {
        statusCode: 400,
        body: JSON.stringify({ ok: false, error: "Missing userId or message" })
      };
    }

    // ========================================================================
    // 2. RATE LIMITING
    // ========================================================================
    try {
      await assertWithinRateLimit(userId, 20);
    } catch (rateLimitErr: any) {
      return {
        statusCode: 429,
        headers: { "Retry-After": String(rateLimitErr.retryAfter || 60) },
        body: JSON.stringify({
          ok: false,
          error: rateLimitErr.message
        })
      };
    }

    // ========================================================================
    // 3. SESSION MANAGEMENT
    // ========================================================================
    const sb = createSupabaseClient();
    const sessionId = await ensureSession(sb, userId, requestedSessionId);

    console.log(`[Chat] User: ${userId}, Session: ${sessionId}`);

    // ========================================================================
    // 4. SECURITY PIPELINE: PII → Guardrails → Moderation
    // ========================================================================
    const { masked, found } = maskPII(message, 'last4');

    const guardrailConfig = {
      preset: (mode || 'balanced') as 'strict' | 'balanced' | 'creative',
      jailbreakThreshold: 70,
      moderationBlock: true,
      piiEntities: [],
      ingestion: { pii: true, moderation: true },
      chat: { pii: true, moderation: true, jailbreak: true }
    };

    const gr = await runGuardrails(masked, userId, 'chat', guardrailConfig);

    if (!gr.ok) {
      const refusal = gr.block_message || "I'm sorry — I can't help with that request.";
      
      await saveChatMessage(sb, {
        sessionId,
        userId,
        role: "assistant",
        content: refusal,
        redactedContent: refusal
      });

      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ok: true,
          sessionId,
          employee: 'prime-boss',
          blocked: true,
          text: refusal
        })
      };
    }

    // ========================================================================
    // 5. MEMORY ORCHESTRATION (Your Clean Pattern)
    // ========================================================================
    const { contextBlock } = await runMemoryOrchestration({
      userId,
      sessionId,
      redactedUserText: masked,
      maxFacts: 12,
      topK: 6,
      extractInBackground: false  // Wait for extraction (or set to true for async)
    });

    // ========================================================================
    // 6. BUILD SHARED SYSTEM PREAMBLE (ALL Employees Use This)
    // ========================================================================
    const sharedSystem = `
You are an AI financial employee inside XspensesAI.
Use MEMORY CONTEXT if present. Follow guardrails. Be concise and correct.

IMPORTANT:
- Never reveal PII, credit cards, SSNs, or passwords
- Do not provide instructions for illegal activities
- Use context to personalize responses but prioritize privacy
- Be helpful, accurate, and actionable

${contextBlock?.trim() ? `\n### MEMORY CONTEXT\n${contextBlock}\n` : ''}
`.trim();

    // ========================================================================
    // 7. EMPLOYEE ROUTING (Returns systemPreamble + employeePersona)
    // ========================================================================
    const routing = routeToEmployee({
      userText: masked,
      sharedSystem,
      requestedEmployee: body.employeeSlug || null,
      mode: guardrailConfig.preset
    });

    const { employee, systemPreamble, employeePersona } = routing;

    console.log(`[Chat] Routed to: ${employee}`);

    // ========================================================================
    // 8. SAVE USER MESSAGE
    // ========================================================================
    const userMessageId = await saveChatMessage(sb, {
      sessionId,
      userId,
      role: "user",
      content: message,
      redactedContent: masked
    });

    // ========================================================================
    // 9. GET RECENT MESSAGES (Token Budget)
    // ========================================================================
    const recentMessages = await getRecentMessages(sb, sessionId, 4000);

    // ========================================================================
    // 10. BUILD MODEL MESSAGES (Your Clean Pattern)
    // ========================================================================
    const messages = [
      // Shared brain (with memory context)
      { role: 'system' as const, content: systemPreamble },
      
      // Employee persona (optional flavor)
      { role: 'system' as const, content: employeePersona },
      
      // Recent conversation history
      ...recentMessages.map((m: any) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content
      })),
      
      // Current user message
      { role: 'user' as const, content: masked }
    ];

    console.log(`[Chat] Context: ${recentMessages.length} history messages, ${contextBlock ? 'memory present' : 'no memory'}`);

    // ========================================================================
    // 11. STREAM RESPONSE
    // ========================================================================
    const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

    const stream = new ReadableStream({
      async start(controller) {
        let assistantRaw = "";
        let lastSentLen = 0;
        let tokenCount = 0;
        let firstTokenTime = 0;

        try {
          // Send metadata first
          const metadata = {
            ok: true,
            sessionId,
            messageUid: userMessageId,
            employee
          };

          controller.enqueue(
            new TextEncoder().encode(`data: ${JSON.stringify(metadata)}\n\n`)
          );

          // Start OpenAI streaming
          const completion = await openai.chat.completions.create({
            model: MODEL,
            messages,
            temperature: 0.3,
            stream: true
          });

          // Stream with on-the-fly PII masking
          for await (const chunk of completion) {
            if (tokenCount === 0) {
              firstTokenTime = Date.now();
            }
            tokenCount++;

            const token = chunk.choices?.[0]?.delta?.content || "";
            if (!token) continue;

            assistantRaw += token;

            // Mask accumulated text, send only delta
            const { masked: maskedSoFar } = maskPII(assistantRaw, 'last4');
            const delta = maskedSoFar.slice(lastSentLen);

            if (delta) {
              controller.enqueue(
                new TextEncoder().encode(`data: ${JSON.stringify({ delta })}\n\n`)
              );
              lastSentLen = maskedSoFar.length;
            }
          }

          // Final masking check
          const { masked: assistantRedacted } = maskPII(assistantRaw, 'last4');

          // Save assistant message
          await saveChatMessage(sb, {
            sessionId,
            userId,
            role: "assistant",
            content: assistantRaw,
            redactedContent: assistantRedacted,
            tokens: tokenCount
          });

          // Log usage
          const endTime = Date.now();
          const latencyMs = firstTokenTime > 0 ? firstTokenTime - startTime : 0;
          const durationMs = endTime - startTime;

          await sb.from("chat_usage_log").insert({
            user_id: userId,
            session_id: sessionId,
            employee_slug: employee,
            prompt_tokens: Math.ceil(JSON.stringify(messages).length / 4),
            completion_tokens: tokenCount,
            total_tokens: tokenCount + Math.ceil(JSON.stringify(messages).length / 4),
            model: MODEL,
            latency_ms: latencyMs,
            duration_ms: durationMs,
            success: true
          });

          console.log(`[Chat] Complete: ${tokenCount} tokens, ${latencyMs}ms TTFT, ${durationMs}ms total`);

          // Send done signal
          controller.enqueue(new TextEncoder().encode(`data: [DONE]\n\n`));
          controller.close();

        } catch (err: any) {
          console.error("[Chat] Stream error:", err?.message || err);

          const fallback = "Sorry — I ran into an issue generating a reply.";
          controller.enqueue(
            new TextEncoder().encode(`data: ${JSON.stringify({ delta: fallback })}\n\n`)
          );
          controller.enqueue(new TextEncoder().encode(`data: [DONE]\n\n`));
          controller.close();

          await saveChatMessage(sb, {
            sessionId,
            userId,
            role: "assistant",
            content: fallback,
            redactedContent: fallback
          });
        }
      }
    });

    return new Response(stream as any, {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "X-Chat-Backend": "v3"
      }
    }) as any;

  } catch (e: any) {
    console.error("[Chat] Fatal error:", e?.message || e);
    return {
      statusCode: 500,
      body: JSON.stringify({ ok: false, error: "Internal server error" })
    };
  }
};
```

---

## 🧪 Testing the Integration

### Test 1: Memory Extraction & Retrieval

```bash
# First message: Establish facts
curl -X POST 'http://localhost:8888/.netlify/functions/chat' \
  -H 'Content-Type: application/json' \
  -d '{
    "userId": "test-001",
    "message": "I prefer CSV format and I run a freelance consulting business in Toronto"
  }'

# Verify extraction
psql $DATABASE_URL -c "
SELECT fact FROM user_memory_facts 
WHERE user_id = 'test-001' 
ORDER BY created_at DESC;
"

# Expected output:
#  fact
#  --------------------------------------------
#  pref:export_format=CSV
#  fact:business_type=freelance consulting
#  fact:home_city=Toronto

# Second message: Use stored context
curl -X POST '...' -d '{
  "userId": "test-001",
  "sessionId": "<use-same-session>",
  "message": "What business expenses can I track?"
}'

# Expected: Assistant references Toronto, freelance consulting
```

### Test 2: Employee Routing with Shared Context

```bash
# Tax question → Ledger (with memory)
curl -X POST '...' -d '{
  "userId": "test-001",
  "message": "What can I write off?"
}'

# Check response metadata
# Expected:
# {
#   "ok": true,
#   "sessionId": "...",
#   "employee": "ledger-tax"  ← Routed correctly
# }

# Response should mention:
# - Toronto tax rules (from memory: fact:home_city=Toronto)
# - Freelance context (from memory: fact:business_type=freelance)
```

### Test 3: Multiple Employees, Same Memory

```bash
# Analytics question
curl -X POST '...' -d '{
  "userId": "test-001",
  "message": "Show my spending trends"
}'
# employee: "crystal-analytics"
# Should still have access to Toronto, CSV preferences, etc.

# Categorization question
curl -X POST '...' -d '{
  "userId": "test-001",
  "message": "Categorize this restaurant expense"
}'
# employee: "tag-categorize"
# Should still have access to business context
```

**Key Point**: ALL employees see the same memory context!

---

## 📊 What the Model Sees

### Messages Array

```javascript
[
  // System #1: Shared brain (with memory)
  {
    role: "system",
    content: `
      You are an AI financial employee inside XspensesAI.
      Use MEMORY CONTEXT if present...
      
      ### MEMORY CONTEXT
      
      ## Known User Facts & Preferences
      - pref:export_format=CSV
      - fact:business_type=freelance consulting
      - fact:home_city=Toronto
      
      ## Relevant Past Conversations
      • I prefer CSV format for all exports (95% match)
    `
  },
  
  // System #2: Employee persona (flavor)
  {
    role: "system",
    content: "You are Ledger, the tax specialist. You focus on Canadian taxes..."
  },
  
  // History
  { role: "user", content: "What can I track?" },
  { role: "assistant", content: "You can track..." },
  
  // Current turn
  { role: "user", content: "What about meals?" }
]
```

---

## 🎯 Benefits of This Architecture

### ✅ Memory is Universal
- ALL employees see the same context
- No need to duplicate memory logic per employee
- Consistent personalization across the app

### ✅ Clean Separation
- **Shared System**: Facts, rules, memory (constant)
- **Employee Persona**: Flavor, tone, specialty (variable)
- **Conversation**: History, current message

### ✅ Easy to Extend
```typescript
// Add new employee - just add persona
PERSONAS['savings-coach'] = 'You are Savings Coach, helping with...';

// Memory automatically works with new employee!
```

### ✅ Testing is Simple
```typescript
// Test memory without employees
const { contextBlock } = await runMemoryOrchestration({ ... });
expect(contextBlock).toContain('pref:export_format=CSV');

// Test routing without memory
const routing = routeToEmployee({ userText: 'tax question', sharedSystem: '' });
expect(routing.employee).toBe('ledger-tax');

// Test together
const routing = routeToEmployee({ userText: 'tax question', sharedSystem: contextBlock });
// Now employee gets both persona AND memory
```

---

## 🔧 Configuration Options

### Background Memory Extraction

```typescript
const { contextBlock } = await runMemoryOrchestration({
  userId,
  sessionId,
  redactedUserText: masked,
  extractInBackground: true  // ← Don't wait for extraction
});
```

**When to use**:
- ✅ Response speed critical
- ✅ Memory extraction can be async
- ❌ User asks "what do you remember about me?"

### Skip Employee Persona

```typescript
const messages = [
  { role: 'system', content: systemPreamble },
  // Skip employeePersona for more generic responses
  ...recentMessages,
  { role: 'user', content: masked }
];
```

**When to use**:
- ✅ Want more neutral tone
- ✅ Testing memory context only
- ✅ Token budget is tight

### Custom Shared System

```typescript
const customSharedSystem = `
You are XspensesAI financial assistant.
Current date: ${new Date().toLocaleDateString()}
Tax year: 2025

${contextBlock ? `\n${contextBlock}\n` : ''}
`.trim();

const routing = routeToEmployee({
  userText: masked,
  sharedSystem: customSharedSystem  // ← Use custom
});
```

---

## ✅ Integration Checklist

- [ ] Run migrations (`20251016_chat_v3_production.sql`, `20251016_memory_extraction.sql`)
- [ ] Update router.ts (use new signature)
- [ ] Add memory orchestration call
- [ ] Build shared system preamble
- [ ] Pass sharedSystem to router
- [ ] Build messages with both system prompts
- [ ] Test memory extraction
- [ ] Test context retrieval
- [ ] Test all employees with same memory
- [ ] Verify deduplication works
- [ ] Check vector similarity search
- [ ] Monitor extraction stats

---

## 🎉 Summary

Your architecture is **perfect** because:

1. **Memory is shared** → ALL employees benefit
2. **Clean separation** → Easy to understand and maintain
3. **Easy to extend** → Add employees without touching memory
4. **Testable** → Each component works independently
5. **Production-ready** → Error handling, logging, metrics

**Just 3 core steps**:
1. `runMemoryOrchestration()` → Get context
2. Build `sharedSystem` with context
3. Pass to `routeToEmployee()`

**That's it!** 🚀













