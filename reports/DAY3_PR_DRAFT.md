# Day 3: Guardrails Unification - PR Draft

## Title
Day 3: Guardrails Unification

## Description

This PR consolidates all guardrail logic into a single canonical module (`netlify/functions/_shared/guardrails.ts`), ensures uniform moderation across all endpoints, adds Supabase logging, and adds response headers.

## Changes

### Core Enhancements
- ✅ **Unified Guardrails Module**: Enhanced `guardrails.ts` with:
  - Automatic Supabase logging (non-blocking)
  - SHA256 input hashing for privacy
  - Response headers (`X-Guardrails: active`, `X-PII-Mask: enabled`)
  - Stage tracking (`ingestion`, `chat`, `ocr`)

- ✅ **Compatibility Adapter**: Updated `guardrails_adapter.ts` to:
  - Use canonical `guardrails.ts` module
  - Load config from `tenant_guardrail_settings` table
  - Maintain backward compatibility

- ✅ **Import Migration**: Updated all endpoints to use canonical module:
  - `chat.ts` - Added headers to BASE_HEADERS
  - `guardrails-process.ts` - Updated import
  - `tools/email-search.ts` - Updated import
  - `_legacy/chat-complex.ts` - Updated import

### Response Headers
All endpoints now return:
```
X-Guardrails: active
X-PII-Mask: enabled
```

### Supabase Logging
Events are logged to `guardrail_events` table with:
- User ID, stage, preset
- Blocked status, reasons
- PII detection flags
- Moderation/jailbreak flags
- Input hash (SHA256, first 24 chars) - never raw content

## Files Changed

- `netlify/functions/_shared/guardrails.ts` - Enhanced with logging and headers
- `netlify/functions/_shared/guardrails_adapter.ts` - Updated to use canonical module
- `netlify/functions/chat.ts` - Added headers to BASE_HEADERS
- `netlify/functions/guardrails-process.ts` - Updated import
- `netlify/functions/tools/email-search.ts` - Updated import
- `netlify/functions/_legacy/chat-complex.ts` - Updated import

## Reports

- `reports/DAY3_GUARDRAIL_MAP.md` - Code map and usage details
- `reports/DAY3_APPLIED.md` - Applied changes summary
- `reports/DAY3_CHANGED_FILES.txt` - File list
- `reports/DAY3_SMOKE.log` - Smoke test results
- `reports/DAY3_VERIFY_PLAN.md` - Verification plan

## Backward Compatibility

✅ All existing APIs continue to work
- `withGuardrails()` wrapper still works
- Adapter maintains old `runGuardrails()` signature
- `getGuardrailConfig()` loads from DB

## Testing

- ✅ TypeScript compiles without errors
- ✅ All imports resolved correctly
- ✅ Headers added to responses
- ✅ Logging implemented (non-blocking)

## Verification

See `reports/DAY3_VERIFY_PLAN.md` for detailed verification steps.

## Base Branch

`feature/day2-pii-unification`

## PR Link

https://github.com/dwarner13/newxspensesai/pull/new/feature/day3-guardrails-unification


