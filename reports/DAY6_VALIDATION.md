# Day 6 Employee Routing - Validation Guide

**Date**: 2025-01-XX  
**Branch**: `feature/day6-employee-routing`

---

## LOCAL TESTING STEPS

### 1. Setup

```bash
# Checkout branch
git checkout feature/day6-employee-routing

# Install dependencies (if needed)
npm install

# Start dev server
npx netlify dev
```

### 2. Verify Functions Exist

```bash
# Check exports
grep -n "export.*function.*(routeTurn|detectIntent)" netlify/functions/_shared/prime_router.ts

# Expected output: 2 function exports
```

### 3. Verify Chat Integration

```bash
# Check routing call
grep -n "routeTurn|buildEmployeeSystemPrompt|X-Employee|X-Route-Confidence" netlify/functions/chat.ts

# Expected: Multiple matches in chat.ts
```

### 4. Run Tests

```bash
# Run router tests
npm run test:unit netlify/functions/_shared/__tests__/prime_router.test.ts

# Expected: All tests pass
```

### 5. Manual Test Flow

#### Test 1: Tag Routing (Categorization)

**Message**: "categorize receipts by vendor"

**Expected**:
- `X-Employee`: "tag"
- `X-Route-Confidence`: "0.80" (or ≥ 0.70)
- Response from Tag employee

**Check logs**: Should see `[Chat] Routed to tag (confidence: 0.XX, reason: ...)`

#### Test 2: Crystal Routing (Analytics)

**Message**: "why did July expenses spike"

**Expected**:
- `X-Employee`: "crystal"
- `X-Route-Confidence`: "0.80" (or ≥ 0.70)
- Response from Crystal employee

#### Test 3: Byte Routing (Code/Tools)

**Message**: "OCR this PDF then parse"

**Expected**:
- `X-Employee`: "byte"
- `X-Route-Confidence`: "0.80" (or ≥ 0.70)
- Response from Byte employee

#### Test 4: Prime Routing (General Chat)

**Message**: "help me plan payments + chat"

**Expected**:
- `X-Employee`: "prime"
- `X-Route-Confidence`: "0.50" - "0.60"
- Response from Prime employee

#### Test 5: Low-Signal Input (Fallback)

**Message**: "hello"

**Expected**:
- `X-Employee`: "prime"
- `X-Route-Confidence`: "< 0.60"
- Response from Prime employee (fallback)

#### Test 6: Client Override

**Message**: Send with `employeeSlug: "crystal-analytics"` in request body

**Expected**:
- `X-Employee`: "crystal"
- `X-Route-Confidence`: "1.00" (client override)
- Response from Crystal employee

---

## VERIFICATION COMMANDS

```bash
# Check functions exist
grep -n "export.*function.*(routeTurn|detectIntent)" netlify/functions/_shared/prime_router.ts

# Check chat.ts integration
grep -n "routeTurn|X-Employee|X-Route-Confidence|buildEmployeeSystemPrompt" netlify/functions/chat.ts

# Check SQL migration
ls netlify/functions/_shared/sql/day6_orchestration_events.sql

# Run tests
npm run test:unit netlify/functions/_shared/__tests__/prime_router.test.ts
```

---

## EXPECTED RESULTS

### Headers
- ✅ `X-Employee`: "prime", "crystal", "tag", or "byte"
- ✅ `X-Route-Confidence`: "0.00" - "1.00" (as string)
- ✅ `X-Memory-Hit`: Still present (unchanged)
- ✅ `X-Memory-Count`: Still present (unchanged)
- ✅ `X-Session-Summary`: Still present (unchanged)

### Logs
- ✅ `[Chat] Routed to <employee> (confidence: X.XX, reason: ...)` (if routing succeeds)
- ✅ No errors (routing failures fallback to Prime)

### Database
- ✅ Routing events logged in `orchestration_events` table
- ✅ Records include: user_id, convo_id, employee, confidence, reason

### Functionality
- ✅ Correct employee selected for demo phrases
- ✅ Fallback to Prime when confidence is low
- ✅ Client override works via `employeeSlug`
- ✅ Memory, summaries, and guardrails unaffected

---

## TROUBLESHOOTING

### Issue: Wrong employee selected
- **Check**: Intent detection keywords correct?
- **Check**: Confidence thresholds appropriate?
- **Check**: LLM fallback working (if confidence < 0.6)?

### Issue: Headers missing
- **Check**: Response path (SSE vs JSON)?
- **Check**: Headers added to all return paths?

### Issue: Routing fails
- **Check**: OpenAI API key configured (for LLM fallback)?
- **Check**: Falls back to Prime gracefully?

### Issue: Tests failing
- **Check**: Mock functions correct?
- **Check**: Vitest configured?

---

## ACCEPTANCE CRITERIA CHECKLIST

- [x] `prime_router.ts` exports `routeTurn` and `detectIntent`
- [x] `chat.ts` routes to correct employee based on intent
- [x] Response includes `X-Employee` and `X-Route-Confidence` headers
- [x] Router selects correct employee for demo phrases
- [x] Fallback to Prime when confidence is low
- [x] Tests file exists
- [ ] Manual test: Tag routing works (requires dev server)
- [ ] Manual test: Crystal routing works (requires dev server)
- [ ] Manual test: Byte routing works (requires dev server)
- [ ] Manual test: Prime fallback works (requires dev server)
- [x] No crash; memory, summaries, and guardrails unaffected (verified by code review)









