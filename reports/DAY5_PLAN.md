# Day 5 Session Summaries - Plan

**Date**: 2025-01-XX  
**Branch**: `feature/day5-session-summaries`  
**Base**: `feature/day4-memory-unification`

---

## OBJECTIVE

Add rolling conversation summaries with threshold-based generation and summary recall in context.

---

## IMPLEMENTATION PLAN

### 1. Session Summaries Module (`netlify/functions/_shared/session_summaries.ts`)

**Exports**:
- `shouldSummarize({turnCount, tokenEstimate, sinceLastSummaryMins})`
  - Default thresholds: turnCount >= 12 || tokenEstimate >= 4000 || sinceLastSummaryMins >= 30
  
- `estimateTokens(s: string)`
  - ~4 chars/token approximation

- `buildSummaryPrompt(transcriptChunk, recentFacts)`
  - Concise bullets: Key facts / Decisions / Open items
  - Neutral tone, no PII leakage

- `writeSummary({userId, convoId, text, model="gpt-4o-mini"})`
  - Upsert row in `chat_convo_summaries`
  - Mask PII before storing

- `getLatestSummary({userId, convoId, maxAgeDays=30})`
  - Returns most recent summary within maxAgeDays

### 2. SQL Migration (`netlify/functions/_shared/sql/day5_session_summaries.sql`)

- CREATE TABLE IF NOT EXISTS `chat_convo_summaries`
- Unique constraint on (user_id, convo_id)
- Index on (user_id, convo_id, created_at DESC)
- RLS policies

### 3. Chat Integration (`netlify/functions/chat.ts`)

**Before Model**:
- Call `sums.getLatestSummary({ userId, convoId: sessionId })`
- If exists, prepend "## Context-Summary (recent):\n<latest.text>"
- Track `summaryPresent = !!latest`

**After Model**:
- Build rolling transcript (last ~20 turns)
- Calculate `tokenEst = sums.estimateTokens(transcriptChunk)`
- Check `sums.shouldSummarize({turnCount, tokenEstimate: tokenEst, sinceLastSummaryMins})`
- If true: build prompt, call LLM, mask PII, write summary
- Track `summaryWritten = true|false`

**Headers** (all response paths):
- `X-Session-Summary`: `summaryPresent ? 'present' : 'absent'`
- `X-Session-Summarized`: `summaryWritten ? 'yes' : 'no'`

### 4. Tests (`netlify/functions/_shared/__tests__/session_summaries.test.ts`)

- Thresholds for `shouldSummarize`
- `estimateTokens` sanity checks
- `getLatestSummary` returns most recent (mock DB)
- Prompt smoke: includes "Key facts", "Decisions", "Open items"

---

## CONSTRAINTS

- ✅ Idempotent SQL migrations
- ✅ PII masking before storage
- ✅ Non-blocking summary generation (try/catch wrappers)
- ✅ Summary recall happens before model call
- ✅ Summary generation happens after assistant reply

---

## ACCEPTANCE CRITERIA

- ✅ `session_summaries.ts` exports all 5 functions
- ✅ `chat.ts` recalls summary before model (injects context)
- ✅ `chat.ts` generates summary after model (threshold-based)
- ✅ Response includes `X-Session-Summary` and `X-Session-Summarized` headers
- ✅ Tests file exists and runs
- ✅ No crash; memory and guardrails unaffected

---

## FILES TO CREATE/MODIFY

**Create**:
- `netlify/functions/_shared/session_summaries.ts`
- `netlify/functions/_shared/sql/day5_session_summaries.sql`
- `netlify/functions/_shared/__tests__/session_summaries.test.ts`
- `reports/DAY5_PLAN.md`
- `reports/DAY5_CHANGELOG.md`
- `reports/DAY5_VALIDATION.md`
- `reports/DAY5_RESULTS.md`

**Modify**:
- `netlify/functions/chat.ts` (wire summary recall + generation + headers)

---

## VALIDATION STEPS

1. Run tests: `pnpm test netlify/functions/_shared/__tests__/session_summaries.test.ts`
2. Start dev: `npx netlify dev`
3. Drive conversation: Send ≥12 turns or accumulate ~4k tokens
4. Observe headers: `X-Session-Summary` and `X-Session-Summarized`
5. Check database: `chat_convo_summaries` table has new rows

---

## NEXT STEPS

1. Implement session_summaries module
2. Wire into chat.ts
3. Add tests
4. Test locally
5. Commit and push



















