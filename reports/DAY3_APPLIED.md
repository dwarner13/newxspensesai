# Day 3: Guardrails Unification - Applied Changes

**Date**: 2025-01-XX  
**Branch**: feature/day3-guardrails-unification  
**Base**: feature/day2-pii-unification

## OBJECTIVE

Consolidate guardrail logic into canonical `netlify/functions/_shared/guardrails.ts`, ensure uniform moderation across all endpoints, add Supabase logging, and add response headers.

## CHANGES SUMMARY

### 1. Enhanced Canonical Guardrails Module

**File**: `netlify/functions/_shared/guardrails.ts`

#### Additions:
- ✅ **Crypto import**: Added `crypto` for input hashing
- ✅ **Enhanced `applyGuardrails()`**:
  - Automatic Supabase logging (non-blocking)
  - SHA256 input hashing (first 24 chars for privacy)
  - Response headers (`X-Guardrails: active`, `X-PII-Mask: enabled`)
  - Stage tracking (`ingestion`, `chat`, `ocr`)
  - Logging toggle option (`log: boolean`)

- ✅ **Enhanced `logGuardrailEvent()`**:
  - Improved error handling with Supabase null checks
  - Better error messages

- ✅ **Enhanced `withGuardrails()` wrapper**:
  - Automatically adds guardrail headers to all responses
  - Ensures headers are present even on errors

#### New Options:
```typescript
export type GuardrailOptions = {
  preset?: GuardrailPreset
  pii?: boolean
  moderation?: boolean
  jailbreak?: boolean
  hallucination?: boolean
  strict?: boolean
  stage?: 'ingestion' | 'chat' | 'ocr'  // NEW
  log?: boolean                          // NEW
}
```

#### Enhanced Outcome:
```typescript
export type GuardrailOutcome = {
  ok: boolean
  redacted?: string
  reasons?: string[]
  signals?: GuardrailSignals
  headers?: Record<string, string>  // NEW
}
```

### 2. Unified Compatibility Adapter

**File**: `netlify/functions/_shared/guardrails_adapter.ts`

#### Changes:
- ✅ **Updated imports**: Now imports from `guardrails.ts` instead of `guardrails-production.ts`
- ✅ **Enhanced `getGuardrailConfig()`**:
  - Loads from `tenant_guardrail_settings` table
  - Falls back to strict preset if not found
  - Proper error handling

- ✅ **Updated `runGuardrails()`**:
  - Maps old API to new `applyGuardrails()` API
  - Properly converts stage formats
  - Includes logging and headers

### 3. Import Migration

#### Files Updated:
- ✅ `netlify/functions/chat.ts` - Already uses adapter, added headers to BASE_HEADERS
- ✅ `netlify/functions/guardrails-process.ts` - Updated to use adapter
- ✅ `netlify/functions/tools/email-search.ts` - Updated to use adapter
- ✅ `netlify/functions/_legacy/chat-complex.ts` - Updated to use adapter

#### Headers Added:
- ✅ `chat.ts` - Added `X-Guardrails: active` and `X-PII-Mask: enabled` to BASE_HEADERS
- ✅ `withGuardrails()` wrapper - Auto-adds headers to all wrapped handlers

### 4. Response Headers

All endpoints now return:
```
X-Guardrails: active
X-PII-Mask: enabled
```

**Implementation**:
- `applyGuardrails()` returns headers in outcome
- `withGuardrails()` wrapper adds headers to all responses
- `chat.ts` includes headers in BASE_HEADERS

### 5. Supabase Logging

**Table**: `guardrail_events`

**Fields Logged**:
- `user_id` - User ID
- `stage` - Where guardrails were applied (`ingestion`, `chat`, `ocr`)
- `preset` - Guardrail preset used
- `blocked` - Whether request was blocked
- `reasons` - Array of blocking/flagging reasons
- `pii_found` - Boolean
- `pii_types` - Array of detected PII types
- `moderation_flagged` - Boolean
- `jailbreak_detected` - Boolean
- `input_hash` - SHA256 hash (first 24 chars) of input
- `created_at` - Timestamp

**Privacy**:
- Never stores raw content
- Only stores hash (first 24 chars) for deduplication
- Logging is non-blocking (doesn't await)

## FILES CHANGED

### Modified:
- `netlify/functions/_shared/guardrails.ts` - Enhanced with logging and headers
- `netlify/functions/_shared/guardrails_adapter.ts` - Updated to use canonical module
- `netlify/functions/chat.ts` - Added headers to BASE_HEADERS
- `netlify/functions/guardrails-process.ts` - Updated import
- `netlify/functions/tools/email-search.ts` - Updated import
- `netlify/functions/_legacy/chat-complex.ts` - Updated import

### Created:
- `reports/DAY3_GUARDRAIL_MAP.md` - Code map
- `reports/DAY3_APPLIED.md` - This file
- `reports/DAY3_CHANGED_FILES.txt` - File list
- `reports/DAY3_SMOKE.log` - Smoke test results
- `reports/DAY3_VERIFY_PLAN.md` - Verification plan

## BACKWARD COMPATIBILITY

✅ **Maintained**: All existing APIs continue to work
- `withGuardrails()` wrapper still works
- Adapter maintains old `runGuardrails()` signature
- `getGuardrailConfig()` loads from DB

## RISKS

### Low Risk:
- ✅ Non-breaking changes (backward compatible)
- ✅ Logging is non-blocking (doesn't affect performance)
- ✅ Headers are additive (no breaking changes)

### Mitigation:
- ✅ All imports updated to use canonical module
- ✅ Adapter ensures backward compatibility
- ✅ Tests verify functionality

## VERIFICATION

See `reports/DAY3_VERIFY_PLAN.md` for verification steps.


