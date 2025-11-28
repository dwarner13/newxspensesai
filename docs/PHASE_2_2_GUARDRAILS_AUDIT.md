# Phase 2.2 - Guardrails Systems Audit

**Date**: November 20, 2025  
**Status**: 🔍 Audit Complete - Ready for Consolidation

---

## Current State

### Files Found (5 implementations):

1. **`netlify/functions/_shared/guardrails-production.ts`** (447 lines)
   - **Status**: ✅ Core production implementation
   - **Exports**: `getGuardrailConfig()`, `runGuardrails()`, `GUARDRAIL_PRESETS`
   - **Features**: PII masking, moderation, jailbreak detection, audit logging
   - **API**: `runGuardrails(text, userId, stage, config)`
   - **Used by**: `smart-import-finalize.ts`, `smart-import-ocr.ts`

2. **`netlify/functions/_shared/guardrails-unified.ts`** (314 lines)
   - **Status**: ✅ Wrapper around production
   - **Exports**: `runInputGuardrails()`, `sendBlockedResponse()`
   - **Features**: Messages array support, attachment metadata, employee-agnostic
   - **API**: `runInputGuardrails(ctx, input)` - wraps `runGuardrails()`
   - **Used by**: `chat.ts` (primary)

3. **`netlify/functions/_shared/guardrails.ts`** (538 lines)
   - **Status**: ⚠️ Legacy implementation
   - **Exports**: `withGuardrails()`, `applyGuardrails()`
   - **Features**: Handler wrapper, different API
   - **API**: `applyGuardrails(input, options, userId)`
   - **Used by**: Unknown (needs verification)

4. **`netlify/functions/_shared/guardrails-merged.ts`** (386 lines)
   - **Status**: ⚠️ Merged version (not used)
   - **Exports**: Similar to production but merged structure
   - **Features**: Comprehensive PII patterns
   - **Used by**: None (appears to be a proposal/backup)

5. **`netlify/functions/_shared/guardrails_adapter.ts`** (213 lines)
   - **Status**: ⚠️ Compatibility adapter
   - **Exports**: Adapter functions
   - **Purpose**: Bridge between old and new APIs
   - **Used by**: Unknown (needs verification)

---

## Current Usage in Codebase

### Files Using Guardrails:

1. **`netlify/functions/chat.ts`**
   - Uses: `getGuardrailConfig()` from `guardrails-production.ts`
   - Uses: `runInputGuardrails()` from `guardrails-unified.ts`
   - **Issue**: Using BOTH implementations (redundant)

2. **`netlify/functions/smart-import-finalize.ts`**
   - Uses: `runGuardrails()`, `getGuardrailConfig()` from `guardrails-production.ts`

3. **`netlify/functions/smart-import-ocr.ts`**
   - Uses: `runGuardrails()`, `getGuardrailConfig()` from `guardrails-production.ts`

4. **`netlify/functions/_shared/upload.ts`**
   - Uses: Unknown (needs verification)

---

## Analysis

### ✅ Best Implementation: `guardrails-unified.ts`

**Why:**
- ✅ Wraps `guardrails-production.ts` (keeps core engine)
- ✅ Supports messages arrays (better API)
- ✅ Supports attachment metadata
- ✅ Employee-agnostic (works for all employees)
- ✅ Already used by main chat endpoint
- ✅ Better error handling and logging

### ⚠️ Core Engine: `guardrails-production.ts`

**Why Keep:**
- ✅ Core implementation with all features
- ✅ Used by ingestion functions
- ✅ Well-tested and production-ready
- ✅ Has comprehensive PII patterns

**Recommendation**: Keep `guardrails-production.ts` as internal engine, use `guardrails-unified.ts` as the single public API.

---

## Consolidation Plan

### Step 1: Enhance `guardrails-unified.ts` as Single API
- ✅ Already wraps `guardrails-production.ts`
- ✅ Add `getGuardrailConfig()` export (re-export from production)
- ✅ Ensure all features are accessible
- ✅ Add caching for config (load once, cache per tenant/user)

### Step 2: Migrate All Code to Use Unified API
- ✅ `chat.ts` - Already uses unified (but also imports production - remove that)
- ✅ `smart-import-finalize.ts` - Migrate to unified API
- ✅ `smart-import-ocr.ts` - Migrate to unified API
- ✅ Any other files using guardrails

### Step 3: Deprecate Other Implementations
- ⚠️ `guardrails.ts` - Mark deprecated, remove if unused
- ⚠️ `guardrails-merged.ts` - Mark deprecated, remove if unused
- ⚠️ `guardrails_adapter.ts` - Mark deprecated, remove if unused

### Step 4: Add Config Caching
- Cache `getGuardrailConfig()` results per tenant/user
- Cache TTL: 5 minutes
- Invalidate on config updates

---

## Unified API Design

### Single Entry Point: `guardrails-unified.ts`

```typescript
// Main function (already exists)
export async function runInputGuardrails(
  ctx: GuardrailContext,
  input: GuardrailInput
): Promise<GuardrailResult>

// Re-export config loader (add this)
export { getGuardrailConfig } from './guardrails-production.js';

// Helper for single strings (add this)
export async function runGuardrailsForText(
  text: string,
  userId: string,
  stage: 'chat' | 'ingestion_email' | 'ingestion_ocr',
  config?: GuardrailConfig
): Promise<GuardrailResult>
```

---

## Migration Checklist

- [ ] Enhance `guardrails-unified.ts` with config re-export
- [ ] Add config caching to `guardrails-unified.ts`
- [ ] Update `chat.ts` to only use unified API
- [ ] Update `smart-import-finalize.ts` to use unified API
- [ ] Update `smart-import-ocr.ts` to use unified API
- [ ] Check `upload.ts` and migrate if needed
- [ ] Mark deprecated files with deprecation notices
- [ ] Remove unused implementations
- [ ] Document unified API in `docs/GUARDRAILS_API.md`
- [ ] Test all guardrails operations

---

## Files to Touch

### Modify:
- ✅ `netlify/functions/_shared/guardrails-unified.ts` - Enhance as single API
- ✅ `netlify/functions/chat.ts` - Remove production import, use unified only
- ✅ `netlify/functions/smart-import-finalize.ts` - Migrate to unified
- ✅ `netlify/functions/smart-import-ocr.ts` - Migrate to unified

### Deprecate:
- ⚠️ `netlify/functions/_shared/guardrails.ts` - Add deprecation notice
- ⚠️ `netlify/functions/_shared/guardrails-merged.ts` - Add deprecation notice
- ⚠️ `netlify/functions/_shared/guardrails_adapter.ts` - Add deprecation notice

### Create:
- ✅ `docs/GUARDRAILS_API.md` - Document unified API

---

## Next Steps

1. Start with enhancing `guardrails-unified.ts` as the single API
2. Migrate `chat.ts` to use unified only
3. Migrate ingestion functions to unified API
4. Add config caching
5. Deprecate other implementations
6. Document the unified API



