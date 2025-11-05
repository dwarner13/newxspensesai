# Day 6 Employee Routing - Plan

**Date**: 2025-01-XX  
**Branch**: `feature/day6-employee-routing`  
**Base**: `feature/day5-session-summaries`

---

## OBJECTIVE

Route each user turn to the right AI employee (Prime, Crystal, Tag, Byte) based on intent detection, with safe fallbacks and headers.

---

## IMPLEMENTATION PLAN

### 1. Router Module (`netlify/functions/_shared/prime_router.ts`)

**Exports**:
- `routeTurn({ text, convoMeta, userId })`
  - Returns: `{ employee: 'prime'|'crystal'|'tag'|'byte', reason: string, confidence: number }`
  - Uses deterministic rules first, then LLM fallback if confidence < 0.6
  - Masks PII before processing
  - Logs to `orchestration_events` (non-blocking)

- `detectIntent(text)`
  - Returns intent label: `chat|analytics|categorization|code|email|finance|seo|ocr|ingestion|unknown`
  - Deterministic keyword matching

**Routing Rules**:
- **Tag**: categorization, PII, transactions, receipts, tax, vendor, canonical
- **Crystal**: analytics, insights, metrics, trends, KPI, session summary, RankMath, GSC
- **Byte**: code, tools, ingestion, OCR, PDF, pipeline, error, stack trace, parse
- **Prime**: Default/general chat & orchestration

**Confidence Scoring**: 0-1; if low (< 0.6), use LLM fallback or default to Prime.

### 2. SQL Migration (`netlify/functions/_shared/sql/day6_orchestration_events.sql`)

- CREATE TABLE IF NOT EXISTS `orchestration_events`
- Columns: id, user_id, convo_id, employee, confidence, reason, created_at
- Index on (user_id, convo_id, created_at DESC)
- RLS policies (if needed)

### 3. Chat Integration (`netlify/functions/chat.ts`)

**After Context-Summary + Context-Memory, before model call**:
- Call `routeTurn({ text: masked, convoMeta: { sessionId }, userId })`
- Get `targetEmployee` from routing result
- Map employee to slug format:
  - `prime` → `prime-boss`
  - `crystal` → `crystal-analytics`
  - `tag` → `tag-categorizer`
  - `byte` → `byte-docs`

**Employee-Specific System Prompts**:
- **Prime**: General reasoning, access to memory/summaries
- **Crystal**: Analytic prompt with "explain + quantify + cite internal metrics"
- **Tag**: Categorization prompt, stricter PII awareness
- **Byte**: Code/tool/ingestion prompt, enable tool calls if present

**Headers** (all response paths):
- `X-Employee`: `<prime|crystal|tag|byte>`
- `X-Route-Confidence`: `<0.00-1.00>`

**Logging**: Log to `orchestration_events` (non-blocking try/catch)

### 4. Tests (`netlify/functions/_shared/__tests__/prime_router.test.ts`)

- "categorize receipts by vendor" → tag (conf ≥ 0.7)
- "why did July expenses spike" → crystal
- "OCR this PDF then parse" → byte
- "help me plan payments + chat" → prime
- Low-signal input → prime with conf < 0.6

---

## CONSTRAINTS

- ✅ Idempotent SQL migrations
- ✅ PII masking before LLM calls
- ✅ Non-blocking logging (try/catch wrappers)
- ✅ Fallback to Prime when confidence is low
- ✅ Client can override via `employeeSlug` parameter

---

## ACCEPTANCE CRITERIA

- ✅ `prime_router.ts` exports `routeTurn` and `detectIntent`
- ✅ `chat.ts` routes to correct employee based on intent
- ✅ Response includes `X-Employee` and `X-Route-Confidence` headers
- ✅ Router selects correct employee for demo phrases
- ✅ Fallback to Prime when confidence is low
- ✅ Tests file exists and runs
- ✅ No crash; memory, summaries, and guardrails unaffected

---

## FILES TO CREATE/MODIFY

**Create**:
- `netlify/functions/_shared/prime_router.ts`
- `netlify/functions/_shared/sql/day6_orchestration_events.sql`
- `netlify/functions/_shared/__tests__/prime_router.test.ts`
- `reports/DAY6_PLAN.md`
- `reports/DAY6_CHANGELOG.md`
- `reports/DAY6_VALIDATION.md`
- `reports/DAY6_RESULTS.md`

**Modify**:
- `netlify/functions/chat.ts` (wire routing + headers)

---

## VALIDATION STEPS

1. Run tests: `npm run test:unit netlify/functions/_shared/__tests__/prime_router.test.ts`
2. Start dev: `npx netlify dev`
3. Test routing: Send 4 prompts (one per employee)
4. Observe headers: `X-Employee` and `X-Route-Confidence`
5. Check database: `orchestration_events` table has routing logs

---

## NEXT STEPS

1. Implement router module
2. Wire into chat.ts
3. Add tests
4. Test locally
5. Commit and push

