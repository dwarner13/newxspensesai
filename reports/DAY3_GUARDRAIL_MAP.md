# Day 3: Guardrails Unification - Code Map

**Date**: 2025-01-XX  
**Branch**: feature/day3-guardrails-unification  
**Base**: feature/day2-pii-unification

## OBJECTIVE

Consolidate all guardrail logic into canonical `netlify/functions/_shared/guardrails.ts`, ensure uniform moderation across all endpoints, add Supabase logging, and add response headers.

## GUARDRAIL USAGE MAP

### Canonical Module
- **File**: `netlify/functions/_shared/guardrails.ts`
- **Exports**:
  - `applyGuardrails()` - Main guardrails function with unified API
  - `withGuardrails()` - Handler wrapper (adds headers automatically)
  - `logGuardrailEvent()` - Supabase logging function
  - `GUARDRAIL_PRESETS` - Preset configurations
  - Types: `GuardrailPreset`, `GuardrailOptions`, `GuardrailOutcome`, `GuardrailSignals`

### Compatibility Adapter
- **File**: `netlify/functions/_shared/guardrails_adapter.ts`
- **Purpose**: Bridges old `guardrails-production.ts` API to new unified API
- **Exports**:
  - `runGuardrails()` - Maps to `applyGuardrails()`
  - `runGuardrailsCompat()` - v3-compatible adapter
  - `getGuardrailConfig()` - Loads config from DB (`tenant_guardrail_settings`)

### Endpoints Using Guardrails

#### Direct Usage (canonical API)
1. **Tag Functions** (use `withGuardrails` wrapper):
   - `netlify/functions/tag-categorize.ts`
   - `netlify/functions/tag-categories.ts`
   - `netlify/functions/tag-rules.ts`
   - `netlify/functions/tag-correction.ts`
   - `netlify/functions/tag-categorize-dryrun.ts`
   - `netlify/functions/tag-tx-categ-history.ts`
   - `netlify/functions/tag-brain-update.ts`

#### Via Adapter (backward compatibility)
2. **Chat Endpoints**:
   - `netlify/functions/chat.ts` - Uses `runGuardrailsCompat()`
   - `netlify/functions/chat-v3-production.ts` - Uses `runGuardrailsCompat()`
   - `netlify/functions/_legacy/chat-complex.ts` - Uses `runGuardrails()`

3. **Ingestion Functions**:
   - `netlify/functions/guardrails-process.ts` - Uses `runGuardrails()` for OCR processing
   - `netlify/functions/tools/email-search.ts` - Uses `runGuardrails()` for email queries

### Legacy Files (Not Updated)
- `netlify/functions/_shared/guardrails-production.ts` - Kept for reference, not used
- `netlify/functions/_shared/guardrails-merged.ts` - Kept for reference, not used

## IMPORT MIGRATION

### Before (Multiple Sources)
```typescript
// Old imports (inconsistent)
import { runGuardrails } from './_shared/guardrails-production';
import { applyGuardrails } from './_shared/guardrails';
import { withGuardrails } from './_shared/guardrails';
```

### After (Unified)
```typescript
// New imports (canonical)
import { applyGuardrails, withGuardrails } from './_shared/guardrails';
import { runGuardrails, runGuardrailsCompat } from './_shared/guardrails_adapter';
```

## GUARDRAIL FEATURES

### 1. PII Detection & Masking
- **Always enabled** for compliance
- Uses canonical `maskPII()` from `pii.ts`
- Logs PII types found to `guardrail_events` table

### 2. Content Moderation
- **OpenAI omni-moderation-latest** model
- Checks: sexual/minors, hate/threatening, harassment/threatening, violence, self-harm
- **Strict preset**: Blocks on violation
- **Balanced preset**: Flags but continues

### 3. Jailbreak Detection
- **GPT-4o-mini** classifier
- Detects prompt injection attempts
- **Strict preset**: Blocks on detection
- **Balanced preset**: Flags but continues

### 4. Supabase Logging
- **Table**: `guardrail_events`
- **Fields**: user_id, stage, preset, blocked, reasons, pii_found, pii_types, moderation_flagged, jailbreak_detected, input_hash
- **Privacy**: Stores SHA256 hash (first 24 chars) only, never raw content

### 5. Response Headers
- **X-Guardrails**: `active` - Indicates guardrails are active
- **X-PII-Mask**: `enabled` - Indicates PII masking is enabled
- **Auto-added**: By `withGuardrails()` wrapper and `applyGuardrails()` outcome

## PRESETS

### Strict (Ingestion Default)
- PII: Full mask
- Moderation: Block on violation
- Jailbreak: Not relevant (disabled)
- Use case: Document ingestion, email sync

### Balanced (Chat Default)
- PII: Keep last 4 digits
- Moderation: Flag but continue
- Jailbreak: Block on detection
- Use case: User chat interactions

### Creative (Relaxed)
- PII: Always on (compliance)
- Moderation: Disabled
- Jailbreak: Disabled
- Use case: Creative writing, less restrictive

## RESPONSE HEADERS INTEGRATION

All endpoints now return:
```
X-Guardrails: active
X-PII-Mask: enabled
```

**Added to**:
- `chat.ts` - BASE_HEADERS
- `withGuardrails()` wrapper - All wrapped handlers
- `applyGuardrails()` - Outcome.headers











