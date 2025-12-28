# AI Response Logging Guide - Verify Intelligence

**Date:** 2025-01-XX  
**Status:** ✅ Logging Added

---

## 🎯 Purpose

Added comprehensive debug logging to verify what data each employee actually receives and how intelligently they respond. This will help validate the context injection audit findings.

---

## 📍 Logging Locations

### Frontend Logging (`src/hooks/usePrimeChat.ts`)

**Before API Call:**
- Logs request payload sent to backend
- Shows Prime context, document IDs, system prompts
- Displays user message

**After Stream Completes:**
- Logs response headers
- Shows assistant response
- Checks if response references context data
- Verifies intelligence (has numbers, references context)

### Backend Logging (`netlify/functions/chat.ts`)

**Before Building Messages:**
- Logs model configuration
- Shows system messages summary
- Displays context summary (facts, history, memory)
- Shows expected vs actual context per employee

**Before OpenAI API Call:**
- Logs exact request to OpenAI
- Shows model, temperature, max tokens
- Displays message count and system message previews

**After OpenAI Response:**
- Logs response summary
- Shows response content
- Checks intelligence (has numbers, references context)
- Logs tool calls if any

---

## 🔍 How to Use

### 1. Open Browser Console

Open DevTools (F12) and go to the Console tab.

### 2. Test Each Employee

Ask each employee the test questions below and watch the console logs.

---

## 🧪 Test Questions

### Prime Test

**User Message:** `"How much did I spend on restaurants?"`

**Expected Logs:**
```
🤖 [AI Request] prime-boss
  📤 Request Payload: { hasPrimeContext: true, ... }
  👑 Prime Context: { financialSnapshot: { uncategorizedCount: 12, ... } }
  💬 User Message: "How much did I spend on restaurants?"

✅ [AI Response] prime-boss
  📥 Response Summary: { responseLength: 245, ... }
  💬 Assistant Response: "Based on your transactions, you spent $487 on restaurants..."
  🧠 Intelligence Check: { hasNumbers: true, referencesContextData: true, seemsIntelligent: true }
```

**Expected Response:** Should reference actual numbers from financial snapshot

---

### Byte Test

**User Message:** `"How many documents have I uploaded?"`

**Expected Logs:**
```
🤖 [AI Request] byte-docs
  📤 Request Payload: { hasDocumentIds: false, ... }
  💬 User Message: "How many documents have I uploaded?"

✅ [AI Response] byte-docs
  💬 Assistant Response: "I don't have access to your document count..."
  🧠 Intelligence Check: { hasNumbers: false, referencesContextData: false, seemsIntelligent: false }
```

**Expected Response:** May not know document count (no context injection)

---

### Tag Test

**User Message:** `"How many uncategorized transactions do I have?"`

**Expected Logs:**
```
🤖 [AI Request] tag-ai
  📤 Request Payload: { ... }
  💬 User Message: "How many uncategorized transactions do I have?"

✅ [AI Response] tag-ai
  💬 Assistant Response: "Let me check... [calls transactions_query tool]"
  🔧 Tool Calls: [{ name: 'transactions_query', args: {...} }]
  🧠 Intelligence Check: { toolCallsUsed: true }
```

**Expected Response:** Should use `transactions_query` tool to get count

---

### Crystal Test

**User Message:** `"What's my top spending category?"`

**Expected Logs:**
```
🤖 [AI Request] crystal-analytics
  📤 Request Payload: { ... }
  💬 User Message: "What's my top spending category?"

✅ [AI Response] crystal-analytics
  💬 Assistant Response: "Let me analyze your spending... [calls crystal_summarize_expenses tool]"
  🔧 Tool Calls: [{ name: 'crystal_summarize_expenses', args: {...} }]
  🧠 Intelligence Check: { toolCallsUsed: true }
```

**Expected Response:** Should use analytics tools to get category data

---

## 📊 What to Look For

### ✅ Good Signs

1. **Prime:**
   - `hasPrimeContext: true`
   - Response includes actual numbers
   - `seemsIntelligent: true`

2. **Tag/Crystal/Byte:**
   - Uses tools to query data
   - `toolCallsUsed: true`
   - Response references tool results

### ❌ Bad Signs

1. **Generic Responses:**
   - No numbers in response
   - `seemsIntelligent: false`
   - No tool calls

2. **Missing Context:**
   - `hasPrimeContext: false` (for Prime)
   - `hasDocumentIds: false` (for Byte)
   - No context data in system messages

---

## 🔍 Console Log Format

### Frontend Logs

```
🤖 [AI Request] {employeeSlug}
  📤 Request Payload: {...}
  👑 Prime Context: {...} (Prime only)
  📄 Document IDs: [...] (Byte only)
  💬 User Message: "..."
```

```
✅ [AI Response] {employeeSlug}
  📥 Response Headers: {...}
  💬 Assistant Response: "..."
  🧠 Intelligence Check: {
    hasNumbers: true/false,
    referencesContextData: true/false,
    seemsIntelligent: true/false
  }
```

### Backend Logs

```
🤖 [Backend AI Request] {employeeSlug}
  ⚙️ Model Config: { model, temperature, maxTokens }
  📋 System Messages: [...]
  📊 Context Summary: {...}
  🎯 Expected vs Actual Context: {...}
```

```
🚀 [OpenAI API Call] {employeeSlug}
  📤 Request to OpenAI: {...}
  📋 System Message 1: {...}
  💬 User Message: "..."
```

```
✅ [Backend AI Response] {employeeSlug}
  📥 Response Summary: {...}
  💬 Assistant Response: "..."
  🧠 Intelligence Check: {...}
  🔧 Tool Calls: [...] (if any)
```

---

## 🎯 Expected Results Based on Audit

### Prime
- ✅ Should have `prime_context` with financial snapshot
- ✅ Should respond with actual numbers
- ✅ Should reference uncategorized count, spending, categories

### Byte
- ⚠️ Only has document context if `documentIds` provided
- ⚠️ May not know document stats without tools
- ✅ Should use tools to query document data

### Tag
- ❌ No uncategorized count in context
- ✅ Should use `transactions_query` tool
- ✅ Should get count via tool call

### Crystal
- ❌ No analytics/budget data in context
- ✅ Should use `crystal_summarize_expenses` tool
- ✅ Should get analytics via tool call

---

## 🐛 Troubleshooting

### No Logs Appearing

1. **Check Dev Mode:**
   - Logs only appear in dev mode (`import.meta.env.DEV`)
   - Make sure you're running `npm run dev`

2. **Check Console Filter:**
   - Make sure console isn't filtering out logs
   - Check for errors that might stop execution

3. **Check Network:**
   - Verify backend is receiving requests
   - Check Network tab for API calls

### Logs Show Missing Context

1. **Prime Context Missing:**
   - Check `primeState` is loaded in frontend
   - Verify `usePrimeState()` hook is working

2. **Document Context Missing:**
   - Check `documentIds` are being passed
   - Verify document upload flow

3. **Memory Context Missing:**
   - Check backend memory queries
   - Verify user has facts in database

---

## 📝 Next Steps

After testing:

1. **Document Findings:**
   - Which employees have context?
   - Which employees rely on tools?
   - Are responses intelligent?

2. **Compare to Audit:**
   - Does actual behavior match audit findings?
   - Are there discrepancies?

3. **Plan Improvements:**
   - Add missing context for Tag, Crystal, Byte
   - Optimize tool usage
   - Improve response quality

---

**Last Updated:** 2025-01-XX





