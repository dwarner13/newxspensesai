# 💬 Prime Chat → Tag AI → Smart Categories Integration

## Overview

This guide shows the **complete conversation flow** where Prime Chat helps users categorize transactions and provides actionable deep-links to review categorization results:

```
User selects transactions + asks to categorize
    ↓
Prime Chat receives message (e.g., "/categorize")
    ↓
Chat calls /tag-categorize endpoint
    ↓
Tag AI returns results + confidence scores
    ↓
Chat filters low-confidence items
    ↓
Chat generates Smart Categories deep-link
    ↓
Chat shows results + clickable link to review dashboard
    ↓
User clicks link → Smart Categories opens with low items pre-filtered + first low-confidence tx focused
```

---

## Chat Integration Pattern

### Full Example: /categorize Command

```typescript
// netlify/functions/chat-v3-production.ts

import { createTagClient } from "@/ai/sdk/tagClient";

export async function handleUserMessage(
  message: string,
  context: ChatContext,
  userId: string
): Promise<ChatResponse> {
  const { text, intent } = parseIntent(message);

  // === TAG CATEGORIZE COMMAND ===
  if (intent === "categorize" || text?.startsWith("/categorize")) {
    // 1. Validate transaction selection
    if (!context.selectedTxns?.length) {
      return replyErr(
        "❌ No transactions selected. Choose items in the table first."
      );
    }

    console.log(`[Tag] Categorizing ${context.selectedTxns.length} transactions`);

    try {
      // 2. Call Tag AI SDK
      const tagClient = createTagClient(userId);
      const txIds = context.selectedTxns.map(t => t.id);
      const resp = await tagClient.categorize(txIds);

      if (!resp.ok) {
        return replyErr(`❌ Categorization failed: ${resp.error}`);
      }

      // 3. Analyze results
      const results = resp.results || [];
      const highConf = results.filter(r => r.confidence >= 0.6).length;
      const lowCount = results.filter(r => r.confidence < 0.6).length;
      const firstLowTx = results.find(r => r.confidence < 0.6)?.transaction_id;

      // 4. Generate deep-link to Smart Categories
      const deepLink = firstLowTx
        ? `/dashboard/smart-categories?filter=low&focusTx=${firstLowTx}`
        : `/dashboard/smart-categories?filter=low`;

      // 5. Build user-friendly response
      let responseMsg = `✅ Categorized ${results.length} transactions\n`;
      responseMsg += `  • High confidence: ${highConf}\n`;
      responseMsg += `  • Low confidence: ${lowCount}\n`;

      if (lowCount > 0) {
        responseMsg += `\n🔍 Items needing review:\n`;
        responseMsg += `[📊 Open Smart Categories](${deepLink})`;
        responseMsg += ` to review and correct.`;
      } else {
        responseMsg += `\n💡 All items are high-confidence!`;
      }

      // 6. Log success
      console.log(`[Tag] Success: ${highConf} high-conf, ${lowCount} low-conf`);

      return replyOk(responseMsg);
    } catch (err) {
      console.error("[Tag] Categorization error:", err);
      return replyErr("❌ Categorization failed. Try again or contact support.");
    }
  }

  // ... other commands ...
}
```

---

## Chat Response Formats

### High-Confidence Success

```
✅ Categorized 5 transactions
  • High confidence: 5
  • Low confidence: 0

💡 All items are high-confidence!
```

### With Low-Confidence Items

```
✅ Categorized 5 transactions
  • High confidence: 3
  • Low confidence: 2

🔍 Items needing review:
[📊 Open Smart Categories](/dashboard/smart-categories?filter=low&focusTx=tx-456)
to review and correct.
```

### Error Handling

```
❌ No transactions selected. Choose items in the table first.
❌ Categorization failed: Network error
❌ Categorization failed: Invalid transaction ID
```

---

## Complete Integration Example

### Chat Message Flow (Sequence Diagram)

```
User
  ↓
  "Hey Prime, categorize my transactions"
  ↓
ChatDock (UI)
  ├─ Parse message
  ├─ Extract selectedTxns from context
  ├─ Send to Prime Chat
  ↓
chat-v3-production.ts (Netlify function)
  ├─ parseIntent() → "categorize"
  ├─ Validate context.selectedTxns
  ├─ Call tagClient.categorize(txIds)
  ↓
/tag-categorize (Netlify function)
  ├─ Fetch transaction details
  ├─ Call AI model (OpenAI, Claude, etc.)
  ├─ Store results in DB
  ├─ Return results + confidence
  ↓
chat-v3-production.ts
  ├─ Filter results → low-conf items
  ├─ Find firstLowTx
  ├─ Generate deepLink
  ├─ Format user message with link
  ├─ Return replyOk(message)
  ↓
ChatDock (UI)
  ├─ Render message
  ├─ Parse markdown link
  ├─ Show clickable button/link
  ↓
User clicks [📊 Open Smart Categories]
  ↓
navigate(deepLink)
  ↓
SmartCategories page
  ├─ Parse URL params
  ├─ filter=low
  ├─ focusTx=tx-456
  ├─ Fetch transactions with filter
  ├─ Scroll to tx-456 + highlight
```

---

## Implementation Details

### 1. Chat Handler Structure

```typescript
// Simple template for all Tag commands
async function handleTagCommand(
  command: string,
  context: ChatContext,
  userId: string
): Promise<ChatResponse> {
  try {
    const tagClient = createTagClient(userId);

    if (command === "categorize") {
      // Validate
      if (!context.selectedTxns?.length) {
        return replyErr("No transactions selected");
      }

      // Execute
      const result = await tagClient.categorize(
        context.selectedTxns.map(t => t.id)
      );

      // Analyze
      const stats = analyzeResults(result.results || []);

      // Generate link
      const link = stats.lowCount > 0
        ? generateDeepLink(stats.firstLowTx, "low")
        : generateDeepLink(undefined, "all");

      // Format response
      const msg = formatCategorizeResponse(stats, link);

      return replyOk(msg);
    }

    // ... other commands (correct, why, rules) ...

  } catch (err) {
    return replyErr(`Error: ${err instanceof Error ? err.message : "Unknown"}`);
  }
}
```

### 2. Result Analysis Helper

```typescript
// src/lib/chat-helpers.ts

export interface ResultStats {
  total: number;
  highConf: number;
  lowConf: number;
  firstLowTx?: string;
  lowConfTxs: string[];
}

export function analyzeResults(
  results: Array<{
    transaction_id: string;
    confidence: number;
    category_id: string;
  }>
): ResultStats {
  const lowConf = results.filter(r => r.confidence < 0.6);

  return {
    total: results.length,
    highConf: results.length - lowConf.length,
    lowConf: lowConf.length,
    firstLowTx: lowConf[0]?.transaction_id,
    lowConfTxs: lowConf.map(r => r.transaction_id),
  };
}
```

### 3. Deep-Link Generator

```typescript
// src/lib/chat-helpers.ts

export function generateDeepLink(
  focusTx?: string,
  filter: string = "low"
): string {
  const params = new URLSearchParams();
  params.append("filter", filter);
  if (focusTx) {
    params.append("focusTx", focusTx);
  }
  return `/dashboard/smart-categories?${params.toString()}`;
}
```

### 4. Response Formatter

```typescript
// src/lib/chat-helpers.ts

export function formatCategorizeResponse(
  stats: ResultStats,
  deepLink: string
): string {
  let msg = `✅ Categorized ${stats.total} transactions\n`;
  msg += `  • High confidence: ${stats.highConf}\n`;
  msg += `  • Low confidence: ${stats.lowConf}\n`;

  if (stats.lowConf > 0) {
    msg += `\n🔍 ${stats.lowConf} item(s) need review\n`;
    msg += `[📊 Open Smart Categories](${deepLink}) to review and correct.\n`;
    msg += `\nYou can also:\n`;
    msg += `• Type \`/why ${stats.firstLowTx}\` to understand the categorization\n`;
    msg += `• Type \`/correct ${stats.firstLowTx} <category>\` to fix it`;
  } else {
    msg += `\n💡 All items are high-confidence! Great job.`;
  }

  return msg;
}
```

---

## All Tag AI Chat Commands

### /categorize – Auto-Categorize Selected Transactions

```typescript
if (intent === "categorize") {
  // ... categorize logic ...
  return replyOk(formatCategorizeResponse(stats, deepLink));
}
```

**Example Response:**
```
✅ Categorized 5 transactions
  • High confidence: 3
  • Low confidence: 2

🔍 2 item(s) need review
[📊 Open Smart Categories](/dashboard/smart-categories?filter=low&focusTx=tx-456)
to review and correct.

You can also:
• Type `/why tx-456` to understand the categorization
• Type `/correct tx-456 cat-coffee` to fix it
```

### /why – Explain Categorization

```typescript
if (intent === "why" || text?.startsWith("/why")) {
  const [, txId] = text.match(/\/why\s+(\S+)/) || [];
  if (!txId) return replyErr("Usage: /why <transactionId>");

  const result = await tagClient.why(txId);
  if (!result.ok) return replyErr("Could not explain this categorization");

  const { tx, latest, ai } = result.explanation || {};

  let msg = `📖 Why ${tx.merchant_name} ($${tx.amount.toFixed(2)}) was categorized:\n\n`;
  msg += `**Category:** ${latest.category_id}\n`;
  msg += `**Confidence:** ${Math.round(latest.confidence * 100)}%\n`;
  msg += `**Source:** ${latest.source}\n\n`;

  if (ai?.rationale) {
    msg += `🤔 **AI Reasoning:**\n"${ai.rationale}"\n\n`;
  }

  msg += `**You can:**\n`;
  msg += `• Type \`/correct ${txId} <category>\` to fix it\n`;
  msg += `• Type \`/rule ${tx.merchant_name} <category>\` to auto-tag future transactions`;

  return replyOk(msg);
}
```

### /correct – Manually Correct a Categorization

```typescript
if (intent === "correct" || text?.startsWith("/correct")) {
  const [, txId, catId] = text.match(/\/correct\s+(\S+)\s+(\S+)/) || [];
  if (!txId || !catId) {
    return replyErr("Usage: /correct <transactionId> <categoryId>");
  }

  const result = await tagClient.correct(txId, catId);
  if (!result.ok) return replyErr("Correction failed");

  let msg = `✅ Corrected!\n`;
  msg += `${txId} → ${catId}\n\n`;
  msg += `📚 AI is learning from this correction.`;

  return replyOk(msg);
}
```

### /rule – Create Automation Rule

```typescript
if (intent === "rule" || text?.startsWith("/rule")) {
  const [, merchant, catId] = text.match(/\/rule\s+(.+?)\s+(\S+)/) || [];
  if (!merchant || !catId) {
    return replyErr("Usage: /rule <merchant> <categoryId>");
  }

  const result = await tagClient.createRule(merchant, catId);
  if (!result.ok) return replyErr("Rule creation failed");

  let msg = `✅ Rule created!\n`;
  msg += `All future transactions from "${merchant}" → ${catId}\n\n`;
  msg += `🎯 Future matching transactions will auto-categorize.`;

  return replyOk(msg);
}
```

---

## Chat UI Integration

### ChatDock Component Updates

```tsx
// src/ui/chat/ChatDock.tsx

import { useNavigate } from "react-router-dom";
import { useTagClient } from "@/ai/sdk/tagClient";

export function ChatDock() {
  const navigate = useNavigate();
  const tagClient = useTagClient();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [context, setContext] = useState<ChatContext | null>(null);

  async function handleSendMessage(text: string) {
    if (!text.trim()) return;

    // Add user message
    setMessages(prev => [...prev, { role: "user", content: text }]);

    try {
      // Call chat endpoint
      const response = await fetch("/.netlify/functions/chat-v3-production", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": userId,
        },
        body: JSON.stringify({
          message: text,
          context,
          conversationId: convId,
        }),
      });

      const result = await response.json();

      // Add bot response
      setMessages(prev => [...prev, { role: "assistant", content: result.reply }]);

      // Parse markdown links for deep-link handling
      if (result.reply.includes("](/dashboard/smart-categories")) {
        // Link will be clickable in UI
      }
    } catch (err) {
      console.error("[Chat] Error:", err);
      setMessages(prev => [
        ...prev,
        { role: "assistant", content: "❌ Error processing message" },
      ]);
    }
  }

  return (
    <div className="space-y-4">
      {/* Messages */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {messages.map((msg, i) => (
          <ChatMessage key={i} role={msg.role} content={msg.content} />
        ))}
      </div>

      {/* Input */}
      <input
        type="text"
        placeholder="e.g., /categorize, /why tx-123, /correct ..."
        onKeyDown={e => {
          if (e.key === "Enter") {
            handleSendMessage(e.currentTarget.value);
            e.currentTarget.value = "";
          }
        }}
      />
    </div>
  );
}

// ChatMessage component with markdown link support
function ChatMessage({ role, content }: { role: string; content: string }) {
  return (
    <div
      className={`p-3 rounded-lg ${
        role === "user" ? "bg-blue-100" : "bg-gray-100"
      }`}
    >
      {/* Parse markdown links: [text](url) → clickable buttons */}
      {content.split(/(\[.*?\]\(.*?\))/).map((part, i) => {
        const match = part.match(/\[(.*?)\]\((.*?)\)/);
        if (match) {
          return (
            <a
              key={i}
              href={match[2]}
              className="text-blue-600 hover:underline font-medium"
            >
              {match[1]}
            </a>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </div>
  );
}
```

---

## Full Example Flow

### User Scenario

```
User: "Hey Prime, categorize my bank statement"
Prime: "I'll need transactions selected first. Are they in the table?"
User: [Selects 3 transactions in TransactionsTable]
User: "/categorize"

Chat:
[Calls /tag-categorize]
[Gets: tx1=0.95 (Coffee), tx2=0.55 (unclear), tx3=0.92 (Groceries)]
[Filters low: 1 item (tx2)]
[Generates deep-link: /dashboard/smart-categories?filter=low&focusTx=tx2]

Prime: "✅ Categorized 3 transactions
  • High confidence: 2
  • Low confidence: 1

🔍 1 item needs review
[📊 Open Smart Categories](/dashboard/smart-categories?filter=low&focusTx=tx2)
to review and correct.

You can also:
• Type `/why tx2` to understand the categorization
• Type `/correct tx2 cat-coffee` to fix it"

User: [Clicks "Open Smart Categories" link]
[SmartCategories page opens]
[URL: /dashboard/smart-categories?filter=low&focusTx=tx2]
[Dashboard filters to show only low-confidence items]
[Dashboard auto-scrolls to tx2 and highlights with blue ring]
[User sees: "Starbucks $5.75 → Predicted: Utilities (0.55%)" in queue]

User: [Clicks "Correct" button]
[Selects "Coffee" category]
[Correction sent]
[Item updates to: "Starbucks $5.75 → Coffee (manual, 100%)"]

Prime (notifications): "✅ Correction saved! AI is learning."
```

---

## Testing the Integration

### Manual Test Flow

```bash
# 1. Open chat panel in Transactions page
# 2. Select 3 transactions from table
# 3. Type "/categorize" in chat
#    ✓ Chat shows: "✅ Categorized 3 transactions"
#    ✓ Chat shows: "X item(s) need review"
#    ✓ Chat shows: [📊 Open Smart Categories](...) link
# 4. Click link
#    ✓ Navigate to Smart Categories
#    ✓ URL has filter=low&focusTx=tx-XXX
#    ✓ Low-confidence items shown
#    ✓ Specific transaction highlighted
# 5. Click "Correct" on low-confidence item
#    ✓ Category dropdown appears
#    ✓ Select "Coffee"
#    ✓ Item updates to "Coffee (manual)"
# 6. Chat notification: "✅ Correction saved"
# 7. Back in chat: Type "/why tx-XXX"
#    ✓ Shows why it was categorized
#    ✓ Shows [/correct ...] and [/rule ...] options
```

### Curl Testing

```bash
# Test chat endpoint directly
curl -X POST http://localhost:8888/.netlify/functions/chat-v3-production \
  -H "Content-Type: application/json" \
  -H "x-user-id: test-user" \
  -d '{
    "message": "/categorize",
    "context": {
      "selectedTxns": [
        {"id": "tx-1", "merchant": "Starbucks", "amount": 5.75},
        {"id": "tx-2", "merchant": "Whole Foods", "amount": 47.23},
        {"id": "tx-3", "merchant": "Shell", "amount": 42.00}
      ],
      "view": "transactions"
    }
  }'

# Expected response includes:
# {
#   "ok": true,
#   "reply": "✅ Categorized 3 transactions\n  • High confidence: 2\n  • Low confidence: 1\n\n🔍 1 item(s) need review\n[📊 Open Smart Categories](/dashboard/smart-categories?filter=low&focusTx=tx-2) to review and correct."
# }
```

---

## Benefits of This Integration

| Benefit | Why It Matters |
|---------|----------------|
| **Unified UX** | Chat + Dashboard work together seamlessly |
| **Deep-links** | One-click navigation to specific items |
| **Context Awareness** | Chat knows selected transactions + current view |
| **Actionable Results** | Users don't have to search; pre-filtered view |
| **Learning Loop** | Corrections feed back to AI training |
| **Mobile Friendly** | Works on small screens (notifications → links) |
| **Shareable** | Users can copy chat/link for collaboration |

---

## Summary

| Component | Purpose |
|-----------|---------|
| **Prime Chat** | Natural language interface for Tag AI |
| **Tag AI Endpoints** | Categorization logic + confidence scoring |
| **Smart Categories** | Visual review + correction interface |
| **Deep-links** | Frictionless navigation between systems |
| **SDK Client** | Unified API across all Tag commands |

**Result:** Users categorize, review, and correct transactions without leaving their workflow.

---

**Status:** ✅ Production-ready integration pattern  
**Complexity:** Medium (combines 3 systems)  
**User Impact:** Very High (seamless, conversational experience)




