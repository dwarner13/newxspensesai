# 🧠 Context Injection Testing Guide

**Purpose:** Verify that all employees receive proper contextual data ("brains") for smart conversations.

**Date:** 2025-01-XX  
**Status:** Testing Ready

---

## 📋 Testing Instructions

### Prerequisites

1. Open browser DevTools (F12)
2. Go to Console tab
3. Ensure you're logged in with a user that has:
   - Some transaction data (for Prime, Tag, Crystal)
   - At least one uploaded document (for Byte)
   - Profile metadata set up

---

## 🧪 Test Each Employee

### 1. Prime Chat (`prime-boss`)

**Steps:**
1. Open Prime Chat from dashboard
2. Send any message (e.g., "Hello")
3. Check console for logs

**Expected Console Logs:**
```
[Context Injection] 🧠 Employee Context Data
  employeeSlug: "prime-boss"
  hasPrimeContext: true
  primeContextKeys: ["displayName", "timezone", "currency", "currentStage", "financialSnapshot", "memorySummary"]
  expectedContext: "Full PrimeState (financial snapshot, memory summary, user profile)"

[Context Injection] 📤 Request Payload
  employeeSlug: "prime-boss"
  hasPrimeContext: true
  backendWillBuild: "PrimeState + Facts + History"
```

**What to Verify:**
- ✅ `hasPrimeContext: true`
- ✅ `primeContextKeys` includes `financialSnapshot` and `memorySummary`
- ✅ `financialSnapshot` shows transaction data
- ✅ `memorySummary` shows facts count

---

### 2. Byte Chat (`byte-docs`)

**Steps:**
1. Open Byte Chat (or navigate to Smart Import page)
2. Upload a document OR send a message about documents
3. Check console for logs

**Expected Console Logs:**
```
[Context Injection] 🧠 Employee Context Data
  employeeSlug: "byte-docs"
  hasPrimeContext: false
  hasDocumentIds: true (if uploading)
  expectedContext: "Document upload context (via documentIds)"

[Context Injection] 📤 Request Payload
  employeeSlug: "byte-docs"
  hasDocumentIds: true
  backendWillBuild: "Document context + Facts + History"
```

**What to Verify:**
- ✅ `hasPrimeContext: false` (Byte doesn't need PrimeState)
- ✅ `hasDocumentIds: true` when uploading documents
- ✅ Backend will build document context

---

### 3. Tag Chat (`tag-ai`)

**Steps:**
1. Open Tag Chat
2. Send a message about categorization (e.g., "Fix my categories")
3. Check console for logs

**Expected Console Logs:**
```
[Context Injection] 🧠 Employee Context Data
  employeeSlug: "tag-ai"
  hasPrimeContext: false
  expectedContext: "Categorization context (facts, recent transactions)"

[Context Injection] 📤 Request Payload
  employeeSlug: "tag-ai"
  backendWillBuild: "Categorization context + Facts + History + Recent transactions"
```

**What to Verify:**
- ✅ `hasPrimeContext: false` (Tag doesn't need PrimeState)
- ✅ Backend will build categorization context
- ✅ Should include recent transactions for categorization

---

### 4. Crystal Chat (`crystal-analytics`)

**Steps:**
1. Open Crystal Chat
2. Send a message about analytics (e.g., "Show my spending insights")
3. Check console for logs

**Expected Console Logs:**
```
[Context Injection] 🧠 Employee Context Data
  employeeSlug: "crystal-analytics"
  hasPrimeContext: false
  expectedContext: "Analytics + budgets context (spending data, budgets)"

[Context Injection] 📤 Request Payload
  employeeSlug: "crystal-analytics"
  backendWillBuild: "Analytics (90d spending) + Budgets + Facts + History"
```

**What to Verify:**
- ✅ `hasPrimeContext: false` (Crystal doesn't need PrimeState)
- ✅ Backend will build analytics context (90 days of spending)
- ✅ Backend will include budgets if available

---

## 🔍 What Each Employee Should Have

### Prime (`prime-boss`)
- ✅ **PrimeState Context:**
  - Display name
  - Financial snapshot (transactions, uncategorized count, top categories)
  - Memory summary (facts count, recent facts)
  - Current stage (novice/guided/power)
- ✅ **Backend Context:**
  - Facts (user preferences)
  - Conversation history
  - Full financial context

### Byte (`byte-docs`)
- ✅ **Document Context:**
  - Document IDs (when uploading)
  - Document metadata
- ✅ **Backend Context:**
  - Facts (user preferences)
  - Conversation history
  - Document processing context

### Tag (`tag-ai`)
- ✅ **Categorization Context:**
  - Recent transactions
  - Category rules
  - Uncategorized transactions
- ✅ **Backend Context:**
  - Facts (user preferences)
  - Conversation history
  - Transaction categorization data

### Crystal (`crystal-analytics`)
- ✅ **Analytics Context:**
  - Last 90 days of spending
  - Top merchants
  - Spending trends
  - Active budgets
- ✅ **Backend Context:**
  - Facts (user preferences)
  - Conversation history
  - Full analytics dataset

---

## 🐛 Troubleshooting

### Issue: No context logs appearing

**Possible Causes:**
1. Not in development mode (`import.meta.env.DEV` is false)
2. Console logs are filtered
3. Message not being sent

**Solution:**
- Check that you're running in dev mode
- Clear console filters
- Verify message is actually sending (check Network tab)

---

### Issue: `hasPrimeContext: false` for Prime

**Possible Causes:**
1. PrimeState not loaded
2. Employee slug mismatch

**Solution:**
- Check that PrimeState context is loaded
- Verify `employeeSlug === 'prime-boss'` in logs

---

### Issue: Backend not building expected context

**Possible Causes:**
1. Backend context builder not recognizing employee
2. Missing data in database

**Solution:**
- Check backend logs (if accessible)
- Verify database has required data
- Check backend context builder implementation

---

## ✅ Success Criteria

All employees should show:
- ✅ Correct `employeeSlug` in logs
- ✅ Appropriate context flags (`hasPrimeContext`, `hasDocumentIds`, etc.)
- ✅ Expected backend context building message
- ✅ No errors in console

---

## 📝 Test Results Template

```
Date: ___________
Tester: ___________

Prime Chat:
  [ ] Context logs appear
  [ ] hasPrimeContext: true
  [ ] Financial snapshot present
  [ ] Memory summary present

Byte Chat:
  [ ] Context logs appear
  [ ] hasPrimeContext: false
  [ ] Document IDs present (when uploading)

Tag Chat:
  [ ] Context logs appear
  [ ] hasPrimeContext: false
  [ ] Backend will build categorization context

Crystal Chat:
  [ ] Context logs appear
  [ ] hasPrimeContext: false
  [ ] Backend will build analytics context

Issues Found:
  - 

Notes:
  - 
```

---

## 🎯 Next Steps

After verifying context injection:

1. **Remove logging** (or keep for production debugging)
2. **Document findings** in audit report
3. **Fix any issues** found during testing
4. **Add backend logging** to verify full context is built server-side

---

**Last Updated:** 2025-01-XX





