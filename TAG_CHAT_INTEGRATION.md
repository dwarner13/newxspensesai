# 🤖 Tag AI Chat Integration Guide

## Overview

Tag AI commands are integrated into **Prime Chat** (v3) via intent routing. Users can ask questions or use commands to categorize, correct, explain, and manage transactions directly from chat.

---

## Chat Commands & Intents

### 1. `/categorize` – Auto-Categorize Transactions

**Trigger:**
```
/categorize
categorize my transactions
```

**Intent:** `intent === "categorize"`

**Behavior:**
- Expects `selectedTxns` in chat context (transactions user has selected in UI)
- Calls `/.netlify/functions/tag-categorize` with transaction IDs
- Returns: category, confidence, reason, suggestions
- If confidence < 0.6 → Show in LowConfidenceQueue

**Response Example:**
```
✅ Categorized 3 transactions:
• Starbucks $5.75 → Coffee (95% confidence)
• Whole Foods $47.23 → Groceries (92% confidence)
• Shell Gas $42.00 → Fuel (88% confidence)

💡 All high confidence — no review needed.
```

---

### 2. `/categorize-dry` – Preview Suggestions

**Trigger:**
```
/categorize-dry
show me suggestions
preview categorization
```

**Intent:** `intent === "categorize-dry"`

**Behavior:**
- Same as `/categorize` but doesn't save results
- Calls `/.netlify/functions/tag-categorize-dryrun`
- Returns: category, confidence, reason, top 3 suggestions
- Lets user review before committing

**Response Example:**
```
📋 Preview (not saved):
• Starbucks $5.75
  → Suggested: Coffee (95%)
  → Alternatives: Food (3%), Utilities (2%)

Use /categorize to accept and save.
```

---

### 3. `/correct` – Manually Correct Category

**Trigger:**
```
/correct <transactionId> <categoryId>
/correct tx-123 cat-coffee
correct tx-456 to groceries
```

**Intent:** `intent === "correct"`

**Behavior:**
- User manually corrects a categorization
- Calls `/.netlify/functions/tag-correction`
- Sets source="manual", confidence=1
- Trains AI for future similar transactions
- Logs as correction event

**Response Example:**
```
✅ Corrected: Starbucks $5.75
  • From: Utilities (72%)
  • To: Coffee (manual)

📚 Saved for learning. Tag AI will improve!
```

---

### 4. `/why` – Explain Decision

**Trigger:**
```
/why <transactionId>
/why tx-123
why was this categorized as utilities?
```

**Intent:** `intent === "why"`

**Behavior:**
- Calls `/.netlify/functions/tag-why` endpoint
- Shows merchant, amount, date, current category
- Shows AI reasoning (confidence, rationale)
- Shows suggestion: correct, create rule, or accept

**Response Example:**
```
📖 Why Starbucks $5.75 was categorized:

Merchant: Starbucks
Amount: $5.75
Date: 2025-10-19

Current Category: Utilities (72%)
Source: AI (v1)

🤔 AI Reasoning:
"Matched on merchant name. Similar pattern to 8 past transactions.
Confidence 72% because amount varies ($2–$12)."

Top Alternatives:
1. Coffee (86% if tagged) — 8 instances
2. Food (5%) — rare
3. Travel (3%) — unlikely

💡 You can:
• /correct tx-123 cat-coffee — teach me
• /rule Starbucks → Coffee — always auto-tag
• Accept this — dismiss
```

---

## Chat Context & State

### Transaction Selection

When user selects transactions in the UI:
```tsx
// src/pages/transactions/TransactionsPage.tsx
const [selectedTxns, setSelectedTxns] = useState<TxRow[]>([]);

// Pass to chat context
<ChatDock
  context={{ selectedTxns, userId, view: "transactions" }}
/>
```

### Chat Context Object
```typescript
interface ChatContext {
  selectedTxns?: TxRow[];     // User-selected transactions
  userId: string;            // Current user
  view?: string;             // 'transactions', 'analytics', 'settings', etc.
  additionalContext?: Record<string, any>;
}
```

### Intent Routing in Prime Chat

```typescript
// netlify/functions/chat-v3-production.ts
export async function handleUserMessage(
  message: string,
  context: ChatContext,
  userId: string
): Promise<ChatResponse> {
  const { text, intent } = parseIntent(message);

  // === TAG AI COMMANDS ===
  if (intent === "categorize" || text?.startsWith("/categorize")) {
    if (!context.selectedTxns?.length) {
      return replyErr("No transactions selected. Choose items in the list first.");
    }
    
    const resp = await fetch(`${process.env.URL}/.netlify/functions/tag-categorize`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": userId,
      },
      body: JSON.stringify({
        transaction_ids: context.selectedTxns.map(t => t.id),
      }),
    }).then(r => r.json());

    if (!resp.ok) return replyErr("Categorization failed.");
    
    // Format results
    const results = resp.results.map(r => 
      `• ${r.tx_merchant} $${r.amount} → ${r.category} (${Math.round(r.confidence*100)}%)`
    ).join("\n");
    
    return replyOk(
      `✅ Categorized ${resp.results.length} transactions:\n${results}\n\n` +
      (resp.results.some(r => r.confidence < 0.6) 
        ? "💡 Some items need review (check Low-Confidence Queue)"
        : "💡 All high confidence — no review needed.")
    );
  }

  if (intent === "categorize-dry" || text?.startsWith("/categorize-dry")) {
    if (!context.selectedTxns?.length) {
      return replyErr("No transactions selected.");
    }
    
    const resp = await fetch(`${process.env.URL}/.netlify/functions/tag-categorize-dryrun`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-user-id": userId },
      body: JSON.stringify({ transaction_ids: context.selectedTxns.map(t => t.id) }),
    }).then(r => r.json());

    if (!resp.ok) return replyErr("Preview failed.");
    
    const results = resp.results.map(r => 
      `• ${r.tx_merchant} $${r.amount}\n` +
      `  → Suggested: ${r.category} (${Math.round(r.confidence*100)}%)\n` +
      `  → Alternatives: ${r.suggestions.slice(0, 2).map(s => `${s.label} (${Math.round(s.confidence*100)}%)`).join(", ")}`
    ).join("\n\n");
    
    return replyOk(
      `📋 Preview (not saved):\n${results}\n\nUse /categorize to accept and save.`
    );
  }

  if (intent === "correct" || text?.startsWith("/correct")) {
    const [, txId, catId] = text.match(/\/correct\s+(\S+)\s+(\S+)/) || [];
    if (!txId || !catId) {
      return replyErr("Usage: /correct <transactionId> <categoryId>");
    }

    const resp = await fetch(`${process.env.URL}/.netlify/functions/tag-correction`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-user-id": userId },
      body: JSON.stringify({ transaction_id: txId, to_category_id: catId }),
    }).then(r => r.json());

    if (!resp.ok) return replyErr("Correction failed.");
    
    return replyOk(
      `✅ Corrected: ${resp.merchant} $${resp.amount}\n` +
      `  • From: ${resp.old_category}\n` +
      `  • To: ${resp.category} (manual)\n\n` +
      `📚 Saved for learning. Tag AI will improve!`
    );
  }

  if (intent === "why" || text?.startsWith("/why")) {
    const [, txId] = text.match(/\/why\s+(\S+)/) || [];
    if (!txId) return replyErr("Usage: /why <transactionId>");

    const resp = await fetch(
      `${process.env.URL}/.netlify/functions/tag-why?transaction_id=${txId}`,
      { headers: { "x-user-id": userId } }
    ).then(r => r.json());

    if (!resp?.ok) return replyErr("Could not explain this one.");

    const { tx, latest, ai, suggestions } = resp.explanation;
    
    return replyOk(
      `📖 Why ${tx.merchant_name} $${tx.amount.toFixed(2)} was categorized:\n\n` +
      `Merchant: ${tx.merchant_name}\n` +
      `Amount: $${tx.amount.toFixed(2)}\n` +
      `Date: ${tx.posted_at?.slice(0,10) ?? "—"}\n\n` +
      `Current Category: ${latest.category_id ?? "Uncategorized"}\n` +
      `Source: ${latest.source} (v${latest.version})\n` +
      `Confidence: ${Math.round(latest.confidence*100)}%\n\n` +
      (latest.reason ? `Reason: ${latest.reason}\n\n` : "") +
      (ai?.rationale ? `🤔 AI Reasoning:\n"${ai.rationale}"\n\n` : "") +
      `💡 Suggestions:\n${suggestions.map((s, i) => `${i+1}. ${s}`).join("\n")}`
    );
  }

  // ... other intents ...
}
```

---

## UI Wiring: "AI Tag Chat" Button

### In Transactions Page

```tsx
// src/pages/transactions/TransactionsPage.tsx
import { LowConfidenceQueue } from '@/components/transactions/LowConfidenceQueue';
import { useLowConfidenceQueue } from '@/hooks/useLowConfidenceQueue';

export default function TransactionsPage() {
  const [selectedTxns, setSelectedTxns] = useState<TxRow[]>([]);
  const [chatOpen, setChatOpen] = useState(false);

  return (
    <div className="space-y-6">
      {/* Header with AI Tag Chat button */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Transactions</h1>
        <button
          onClick={() => {
            // Dispatch event to open chat
            window.dispatchEvent(new CustomEvent("open-tag-chat", {
              detail: { selectedTxns, view: "transactions" }
            }));
          }}
          className="rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 px-4 py-2 text-white hover:shadow-lg"
        >
          🤖 AI Tag Chat
        </button>
      </div>

      {/* Low-Confidence Queue */}
      <LowConfidenceQueue rows={rows} ... />

      {/* Transaction Table */}
      <TransactionListTable
        rows={rows}
        onSelectionChange={setSelectedTxns}
      />
    </div>
  );
}
```

### Chat Dock Listening

```tsx
// src/ui/chat/ChatDock.tsx
import { useEffect, useState } from 'react';

export default function ChatDock() {
  const [isOpen, setIsOpen] = useState(false);
  const [context, setContext] = useState<ChatContext | null>(null);

  useEffect(() => {
    const handler = (event: Event) => {
      const customEvent = event as CustomEvent;
      setContext(customEvent.detail);
      setIsOpen(true);
    };
    
    window.addEventListener("open-tag-chat", handler);
    return () => window.removeEventListener("open-tag-chat", handler);
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-24 right-4 w-96 h-96 bg-white rounded-xl shadow-xl flex flex-col">
      {/* Chat header */}
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="font-semibold">🏷️ Tag AI Chat</h2>
        <button onClick={() => setIsOpen(false)}>✕</button>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4">
        {context?.selectedTxns && (
          <div className="text-xs text-gray-600 mb-2">
            📌 {context.selectedTxns.length} transaction(s) selected
          </div>
        )}
        {/* Chat messages render here */}
      </div>

      {/* Input area */}
      <div className="p-4 border-t">
        <input
          type="text"
          placeholder="e.g., /categorize, /why tx-123, /correct ..."
          className="w-full px-3 py-2 border rounded-lg"
          onKeyDown={async (e) => {
            if (e.key === 'Enter') {
              const message = e.currentTarget.value;
              // Send to chat handler with context
              e.currentTarget.value = '';
            }
          }}
        />
        <div className="text-xs text-gray-500 mt-1">
          Try: /categorize, /why txId, /correct txId catId
        </div>
      </div>
    </div>
  );
}
```

---

## Command Examples

### User Flow 1: Categorize Selected Transactions

```
User: Selects 3 transactions in table
User: Clicks "🤖 AI Tag Chat" button
UI: Chat dock opens with "3 transaction(s) selected" banner
User: Types "/categorize"
Chat: Calls /tag-categorize with selected tx IDs
Response: Shows results with confidence levels
User: Can then /why any item or /correct if needed
```

### User Flow 2: Ask Why

```
User: Sees "Starbucks" categorized as "Utilities" (72%)
User: Types "/why tx-123"
Chat: Calls /tag-why endpoint
Response: Shows reasoning, alternatives, suggestions
User: Can /correct to Coffee, or accept
```

### User Flow 3: Batch Correct

```
User: Reviews LowConfidenceQueue
User: Selects 5 low-confidence items
User: Types "/categorize" in chat
Chat: Categorizes all 5
Response: Shows results
User: Reviews; if still wrong, types "/correct tx-456 cat-coffee"
Chat: Corrects that one item
Result: AI learns pattern
```

---

## Event Bus Pattern

Tag AI uses a **custom event** system for cross-component communication:

```typescript
// Emit: Open chat with context
window.dispatchEvent(new CustomEvent("open-tag-chat", {
  detail: {
    selectedTxns: [...],
    userId: "...",
    view: "transactions"
  }
}));

// Listen: Chat dock
window.addEventListener("open-tag-chat", (e: Event) => {
  const { selectedTxns, view } = (e as CustomEvent).detail;
  // Open chat, set context
});
```

---

## API Contract Summary

| Endpoint | Trigger | Input | Output |
|----------|---------|-------|--------|
| `/tag-categorize` | `/categorize` | tx IDs | categories + confidence |
| `/tag-categorize-dryrun` | `/categorize-dry` | tx IDs | suggestions (no save) |
| `/tag-correction` | `/correct txId catId` | tx ID + category | confirmation |
| `/tag-why` | `/why txId` | tx ID | explanation + rationale |

---

## Error Handling

```typescript
// No transactions selected
"❌ No transactions selected. Choose items in the list first."

// API error
"❌ Categorization failed. Try again or contact support."

// Invalid command syntax
"❌ Usage: /correct <transactionId> <categoryId>"

// TX not found
"❌ Transaction not found."
```

---

## Accessibility

```tsx
// Chat commands are keyboard-friendly
<input
  type="text"
  aria-label="Chat input for Tag AI commands"
  autoComplete="off"
/>

// Help text shows command syntax
<div className="text-xs text-gray-500">
  Try: /categorize, /why txId, /correct txId catId
</div>
```

---

## Performance Considerations

1. **Batch categorize** – Max 500 per request (enforced server-side)
2. **Streaming** – For multiple results, format as list for quick scanning
3. **Context passing** – Use CustomEvent detail to avoid prop drilling
4. **Chat debounce** – Prevent rapid-fire requests

---

## Testing

### Manual Test Plan

```
1. Open Transactions page
2. Select 3 transactions
3. Click "🤖 AI Tag Chat"
   ✓ Chat opens, shows "3 transaction(s) selected"
4. Type "/categorize"
   ✓ Results appear with confidence %
   ✓ Any < 60% items trigger LowConfidenceQueue update
5. Type "/why tx-123"
   ✓ Explanation with AI reasoning shown
6. Type "/correct tx-123 cat-coffee"
   ✓ Correction confirmed
   ✓ Item marked as "manual" in table
7. Type "/categorize-dry"
   ✓ Preview shown, not saved
8. Close chat → Open again with different selection
   ✓ Context updated correctly
```

### Curl Testing

```bash
# Test categorization through chat endpoint
curl -X POST http://localhost:8888/.netlify/functions/chat-v3-production \
  -H "Content-Type: application/json" \
  -H "x-user-id: test-user" \
  -d '{
    "message": "/categorize",
    "context": {
      "selectedTxns": [{"id": "tx-1"}, {"id": "tx-2"}],
      "view": "transactions"
    }
  }'

# Test why explanation
curl -X POST http://localhost:8888/.netlify/functions/chat-v3-production \
  -H "Content-Type: application/json" \
  -H "x-user-id: test-user" \
  -d '{
    "message": "/why tx-1",
    "context": { "view": "transactions" }
  }'
```

---

## Integration Checklist

- [ ] `open-tag-chat` event dispatcher added to Transactions page
- [ ] `ChatDock` listens for `open-tag-chat` event
- [ ] Chat intent routing updated in `chat-v3-production.ts`
- [ ] `/categorize` command calls `/tag-categorize` endpoint
- [ ] `/categorize-dry` command calls `/tag-categorize-dryrun`
- [ ] `/correct` command calls `/tag-correction`
- [ ] `/why` command calls `/tag-why`
- [ ] Selected transactions passed in chat context
- [ ] Error handling for missing selections
- [ ] Help text shows command syntax
- [ ] Manual testing passed
- [ ] Curl tests passed

---

**Status:** ✅ Ready for implementation  
**Complexity:** Low (event-driven, uses existing endpoints)  
**User Impact:** High (seamless AI categorization from chat)





