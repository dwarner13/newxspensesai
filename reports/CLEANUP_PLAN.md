# XspensesAI 7-Day Cleanup & Consolidation Plan

**Date**: 2025-01-XX  
**Status**: Execution Plan  
**Purpose**: Prioritized 7-day plan to consolidate duplicates, remove unused code, and standardize security

---

## Executive Summary

This plan addresses critical duplication issues identified in the audit: 3 chat endpoint implementations, 8+ OCR service implementations, 4+ PII masking utilities, and inconsistent guardrails usage. Over 7 days, we will consolidate chat endpoints to a single v3 production endpoint, unify PII masking around `pii-patterns.ts` as the single source of truth, reduce OCR services to 2 core implementations (Google Vision primary, Tesseract fallback), standardize guardrails middleware across all Netlify functions, migrate legacy component references, and safely delete 35+ unused files. Each day includes specific file paths, exact actions (merge/delete/refactor), risk assessments, effort estimates, dependencies, and success checks. The plan prioritizes high-impact consolidations first (Days 1-3), then standardizes security (Day 4), prepares for cleanup (Day 5), executes safe deletions (Day 6), and validates everything (Day 7).

---

## Day 1: Chat Endpoint Consolidation (HIGH PRIORITY)

**Objective**: Consolidate 3 chat endpoint implementations into single production v3 endpoint

**Risk**: High (touching core chat functionality)  
**Effort**: Medium (6-8 hours)  
**Dependencies**: None

### Tasks

1. **Audit Current Usage**
   - Search codebase for references to `chat.ts`, `chat-v3-production.ts`, `prime-chat.ts`
   - Document which frontend components call which endpoint
   - Files to check:
     - `src/hooks/useChat.ts`
     - `src/lib/chatEndpoint.ts`
     - `src/components/chat/*.tsx`
     - `src/pages/**/*.tsx`

2. **Compare Implementations**
   - Compare `netlify/functions/chat.ts` (v2) vs `chat-v3-production.ts` (v3)
   - Document feature differences
   - Identify unique features from `prime-chat.ts` to migrate

3. **Enhance v3 Production Endpoint**
   - Merge any unique features from `chat.ts` (v2) into `chat-v3-production.ts`
   - Merge any unique features from `prime-chat.ts` into `chat-v3-production.ts`
   - Ensure all features from v2 are present in v3
   - File: `netlify/functions/chat-v3-production.ts`

4. **Update Frontend References**
   - Update `src/hooks/useChat.ts` to use `/.netlify/functions/chat-v3-production`
   - Update `src/lib/chatEndpoint.ts` if needed
   - Update any direct endpoint references in components
   - Files to modify:
     - `src/hooks/useChat.ts`
     - `src/lib/chatEndpoint.ts`
     - Any components directly calling chat endpoints

5. **Rename v3 to Standard Name**
   - Rename `chat-v3-production.ts` → `chat.ts`
   - Update all imports/references
   - File: `netlify/functions/chat.ts` (new v3 version)

### Success Checks

- [ ] Single `chat.ts` endpoint exists
- [ ] All frontend components use new endpoint
- [ ] `chat.ts` (old v2) deleted
- [ ] `prime-chat.ts` deleted or merged
- [ ] TypeScript compiles without errors
- [ ] Chat functionality works in dev environment
- [ ] SSE streaming works correctly

### Rollback Plan

- Keep `chat-v3-production.ts` as backup until Day 7
- Git commit after each major step
- Tag commit before deletion step

---

## Day 2: PII Masking Unification (HIGH PRIORITY)

**Objective**: Consolidate 4+ PII masking implementations into single source of truth

**Risk**: High (security-critical code)  
**Effort**: Medium (6-8 hours)  
**Dependencies**: None

### Tasks

1. **Audit PII Implementations**
   - Compare all PII masking implementations:
     - `netlify/functions/_shared/pii.ts`
     - `netlify/functions/_shared/pii-patterns.ts`
     - `chat_runtime/redaction.ts`
     - `worker/src/redaction/patterns.ts`
     - `netlify/functions/_shared/guardrails.ts` (includes redactPII)
   - Document pattern differences
   - Identify most comprehensive pattern set

2. **Standardize on pii-patterns.ts**
   - Ensure `pii-patterns.ts` has all 40+ PII types
   - Verify it's the most comprehensive implementation
   - File: `netlify/functions/_shared/pii-patterns.ts`

3. **Refactor chat_runtime/redaction.ts**
   - Replace inline PII patterns with import from `pii-patterns.ts`
   - Use `maskPII()` wrapper from `pii.ts`
   - File: `chat_runtime/redaction.ts`
   - Change: `import { maskPII } from '../../netlify/functions/_shared/pii'`

4. **Refactor worker/src/redaction/patterns.ts**
   - Replace inline patterns with import from `pii-patterns.ts`
   - Use `maskPII()` wrapper
   - File: `worker/src/redaction/patterns.ts`
   - Change: Import shared PII utilities

5. **Refactor guardrails.ts**
   - Remove duplicate `redactPII()` function
   - Import and use `maskPII()` from `pii.ts`
   - File: `netlify/functions/_shared/guardrails.ts`
   - Change: `import { maskPII } from './pii'`

6. **Update All Imports**
   - Search for all files importing old PII utilities
   - Update to use `pii.ts` wrapper
   - Files to check:
     - `netlify/functions/chat.ts` (new v3)
     - `netlify/functions/ocr-receipt.ts`
     - Any other functions using PII masking

### Success Checks

- [ ] All files use `pii.ts` wrapper
- [ ] `pii-patterns.ts` is single source of truth
- [ ] No duplicate PII pattern definitions
- [ ] TypeScript compiles without errors
- [ ] PII detection works (test with sample credit card, SSN, email)
- [ ] Redaction logs to `guardrail_events` table

### Rollback Plan

- Keep original files until Day 7
- Git commit after each refactor
- Test PII detection after each change

---

## Day 3: OCR Service Consolidation (HIGH PRIORITY)

**Objective**: Reduce 8+ OCR implementations to 2 core services (Google Vision primary, Tesseract fallback)

**Risk**: High (touching OCR pipeline)  
**Effort**: Large (8-10 hours)  
**Dependencies**: None

### Tasks

1. **Audit OCR Implementations**
   - Document all OCR service files:
     - `src/server/ocr/ocrService.ts`
     - `src/server/ocr/ocrServiceEnhanced.ts`
     - `src/server/ocr/serverOCRService.ts`
     - `src/utils/ocrService.ts`
     - `src/utils/googleVisionService.ts`
     - `src/utils/smartOCRManager.ts`
     - `src/systems/EnhancedOCRSystem.ts`
     - `worker/src/ocr/index.ts`
     - `api/routes/ocr.js` (legacy)
   - Identify which are actually used
   - Document dependencies

2. **Keep Core Services**
   - **Keep**: `src/utils/googleVisionService.ts` (API wrapper)
   - **Keep**: `src/utils/smartOCRManager.ts` (engine selection)
   - **Keep**: `worker/src/ocr/index.ts` (worker implementation with Tesseract fallback)
   - These are the essential services

3. **Create Unified OCR Service**
   - Create new `src/utils/unifiedOCRService.ts`
   - Use `smartOCRManager.ts` for engine selection
   - Use `googleVisionService.ts` for primary OCR
   - Use `worker/src/ocr/index.ts` for Tesseract fallback
   - File: `src/utils/unifiedOCRService.ts` (NEW)

4. **Migrate Server OCR Services**
   - Update `src/server/ocr/serverOCRService.ts` to use `unifiedOCRService.ts`
   - Or consolidate into `unifiedOCRService.ts`
   - Remove `src/server/ocr/ocrService.ts` and `ocrServiceEnhanced.ts` if redundant

5. **Update Frontend OCR Calls**
   - Update `src/components/receipts/ReceiptScanner.tsx` to use unified service
   - Update `src/components/chat/PrimeUpload.tsx` if needed
   - Update any other components using OCR
   - Files: All components importing OCR services

6. **Update Netlify Functions**
   - Update `netlify/functions/ocr-receipt.ts` to use unified service
   - Update `netlify/functions/byte-ocr-parse.ts` if needed
   - Files: OCR-related Netlify functions

7. **Delete Legacy OCR**
   - Delete `api/routes/ocr.js` (Express route, legacy)
   - Delete redundant OCR service files after migration
   - Files to delete (after verification):
     - `src/server/ocr/ocrService.ts` (if redundant)
     - `src/server/ocr/ocrServiceEnhanced.ts` (if redundant)
     - `src/utils/ocrService.ts` (if redundant)
     - `src/systems/EnhancedOCRSystem.ts` (if redundant)
     - `api/routes/ocr.js` (legacy)

### Success Checks

- [ ] `unifiedOCRService.ts` exists and works
- [ ] All components use unified service
- [ ] Google Vision API calls work
- [ ] Tesseract fallback works
- [ ] OCR processing works end-to-end
- [ ] Redundant OCR files deleted
- [ ] TypeScript compiles without errors

### Rollback Plan

- Keep all original OCR files until Day 7
- Git commit after each migration step
- Test OCR with sample images after each change

---

## Day 4: Guardrails Standardization (MEDIUM PRIORITY)

**Objective**: Ensure all Netlify functions use shared guardrails middleware

**Risk**: Medium (security code, but well-tested)  
**Effort**: Medium (4-6 hours)  
**Dependencies**: Day 2 (PII masking unified)

### Tasks

1. **Audit Guardrails Implementations**
   - Compare all guardrails files:
     - `netlify/functions/_shared/guardrails.ts`
     - `netlify/functions/_shared/guardrails-production.ts`
     - `netlify/functions/_shared/guardrails-merged.ts`
   - Identify best production implementation
   - Document differences

2. **Choose Production Guardrails**
   - Select `guardrails-production.ts` as primary (or best implementation)
   - Rename to `guardrails.ts` (or keep as production and update imports)
   - File: `netlify/functions/_shared/guardrails.ts` (standardized)

3. **Audit Function Usage**
   - List all Netlify functions that should use guardrails:
     - `chat.ts` (new v3)
     - `ocr-receipt.ts`
     - `tag-categorize.ts` (user input)
     - Other user-facing functions
   - Document which functions currently use guardrails

4. **Add Guardrails to Missing Functions**
   - Add guardrails import to functions missing it
   - Apply guardrails to user input
   - Files to modify:
     - `netlify/functions/ocr-receipt.ts` (verify and add if missing)
     - `netlify/functions/tag-categorize.ts` (add if user input)
     - Any other user-facing functions

5. **Remove Duplicate Guardrails**
   - Delete `guardrails-merged.ts` if redundant
   - Update `chat.ts` to use standardized `guardrails.ts`
   - Files: All functions using guardrails

6. **Standardize Guardrails API**
   - Ensure consistent usage pattern:
     ```typescript
     import { applyGuardrails } from './_shared/guardrails';
     const result = await applyGuardrails(input, options, userId);
     if (!result.ok) return { statusCode: 400, body: result.reasons };
     const sanitizedInput = result.redacted || input;
     ```

### Success Checks

- [ ] Single `guardrails.ts` module exists
- [ ] All user-facing functions use guardrails
- [ ] PII detection works in all functions
- [ ] Moderation checks work
- [ ] Jailbreak detection works
- [ ] Events logged to `guardrail_events` table
- [ ] TypeScript compiles without errors

### Rollback Plan

- Keep original guardrails files until Day 7
- Git commit after each change
- Test guardrails after each function update

---

## Day 5: Legacy Component Migration & Cleanup Prep (MEDIUM PRIORITY)

**Objective**: Migrate legacy ByteDocumentChat references and prepare for safe deletions

**Risk**: Medium (frontend changes, but isolated)  
**Effort**: Medium (4-6 hours)  
**Dependencies**: None

### Tasks

1. **Migrate Legacy ByteDocumentChat References**
   - Update 7 files referencing `_legacy/ByteDocumentChat.tsx`:
     - `src/components/dashboard/ConnectedDashboard.tsx`
     - `src/pages/dashboard/SmartImportAIPage.tsx`
     - `src/components/chat/AIEmployeeTestInterface.tsx`
     - `src/pages/test/PrimeAITestPage.tsx`
     - `src/components/layout/MobileBottomNav.tsx`
     - (2 more files found in audit)
   - Change import from `_legacy/ByteDocumentChat` to `ByteDocumentChat`
   - Test each component after change
   - Files: All files importing `_legacy/ByteDocumentChat`

2. **Verify Active ByteDocumentChat**
   - Ensure `src/components/chat/ByteDocumentChat.tsx` works correctly
   - Test all features used by migrated components
   - File: `src/components/chat/ByteDocumentChat.tsx`

3. **Delete Backup Chat Components**
   - Delete `src/components/chat/ByteDocumentChat_backup.tsx`
   - Delete `src/components/chat/ByteDocumentChat_clean.tsx`
   - Files: Backup chat components

4. **Audit Notification Functions**
   - Compare `orchestrate-notifications.ts` vs `notifications-orchestrate.ts`
   - Determine if duplicate
   - Keep one, delete other if duplicate
   - Files: `netlify/functions/orchestrate-notifications.ts`, `notifications-orchestrate.ts`

5. **Move Test Functions**
   - Move `netlify/functions/test.ts` to test directory or delete
   - Move `netlify/functions/selftest.ts` to test directory or delete
   - Files: Test functions in production directory

6. **Prepare Safe Delete List**
   - Create list of files safe to delete:
     - `netlify/functions/_legacy/` directory (3 files)
     - `netlify/functions-backup/` directory (30+ files)
     - `src/archived/` directory (6 files)
     - Supabase mock functions (8+ functions)
   - Verify no references found (except ByteDocumentChat already migrated)

### Success Checks

- [ ] No references to `_legacy/ByteDocumentChat` found
- [ ] All components use active `ByteDocumentChat.tsx`
- [ ] Backup chat components deleted
- [ ] Test functions moved/deleted
- [ ] Safe delete list created
- [ ] TypeScript compiles without errors
- [ ] Frontend builds without errors

### Rollback Plan

- Keep legacy files until Day 6
- Git commit after migration step
- Test each component after migration

---

## Day 6: Safe Deletions (LOW PRIORITY)

**Objective**: Delete unused legacy directories and backup files

**Risk**: Low (unused code, but verify first)  
**Effort**: Small (2-4 hours)  
**Dependencies**: Day 5 (migration complete)

### Tasks

1. **Final Verification**
   - Run grep to verify no references:
     ```bash
     grep -r "_legacy" src/ netlify/functions/
     grep -r "functions-backup" src/ netlify/functions/
     grep -r "archived" src/
     ```
   - Verify ByteDocumentChat migration complete
   - Double-check safe delete list

2. **Delete Legacy Functions**
   - Delete `netlify/functions/_legacy/` directory
   - Files:
     - `chat-complex.ts`
     - `chat-sse.ts`
     - `chat-stream.ts`

3. **Delete Backup Functions**
   - Delete `netlify/functions-backup/` directory
   - Files: 30+ backup files (see SAFE_DELETE_LIST.txt)

4. **Delete Archived Components**
   - Delete `src/archived/` directory
   - Files:
     - `AIFinancialAssistantPage.tsx`
     - `FinancialAssistantPage.tsx`
     - `PersonalPodcastPage.tsx`
     - `SmartImportAIFeaturePage.tsx`
     - `spending-predictions.tsx`
     - `SpendingPredictionsFeaturePage.tsx`

5. **Delete Supabase Mock Functions**
   - Delete mock/development Supabase functions:
     - `supabase/functions/load-dashboard-fake/`
     - `supabase/functions/load-dashboard-mock/`
     - `supabase/functions/load-mock-receipts/`
     - `supabase/functions/load-mock-transactions/`
     - `supabase/functions/load-profile-mock/`
     - `supabase/functions/load-reports-mock/`
     - `supabase/functions/load-transactions-mock/`
     - `supabase/functions/mock-dashboard/`

6. **Delete Legacy API Routes**
   - Delete `api/routes/ocr.js` (legacy Express route)
   - File: `api/routes/ocr.js`

7. **Delete Redundant OCR Files**
   - Delete OCR files identified as redundant in Day 3
   - Files: See Day 3 task list

### Success Checks

- [ ] All deletions verified
- [ ] No broken imports
- [ ] TypeScript compiles without errors
- [ ] Frontend builds without errors
- [ ] Git history preserved (deletions in git)

### Rollback Plan

- All deletions in git (can restore)
- Git commit after each deletion batch
- Tag commit before major deletions

---

## Day 7: Final Validation & Testing (CRITICAL)

**Objective**: Comprehensive validation of all changes

**Risk**: Low (validation only)  
**Effort**: Medium (4-6 hours)  
**Dependencies**: Days 1-6 complete

### Tasks

1. **Linting & Type Checking**
   - Run `npm run lint` (or equivalent)
   - Run `npm run typecheck` (or TypeScript compiler)
   - Fix any errors
   - Commands:
     ```bash
     npm run lint
     npx tsc --noEmit
     ```

2. **Netlify Dev Smoke Tests**
   - Start `netlify dev`
   - Test chat endpoint:
     ```bash
     curl -X POST http://localhost:8888/.netlify/functions/chat \
       -H "Content-Type: application/json" \
       -d '{"userId":"test","message":"Hello"}'
     ```
   - Test OCR endpoint:
     ```bash
     curl -X POST http://localhost:8888/.netlify/functions/ocr-receipt \
       -F "file=@test-receipt.jpg"
     ```
   - Verify all endpoints respond

3. **Chat Functionality Test**
   - Open chat UI in browser
   - Send test message
   - Verify SSE streaming works
   - Verify response received
   - Verify messages saved to database

4. **OCR Functionality Test**
   - Upload test receipt image
   - Verify OCR processing works
   - Verify text extraction
   - Verify PII redaction (if PII in test image)
   - Verify results stored

5. **PII Redaction Spot Check**
   - Test PII detection with sample inputs:
     - Credit card: "4532-1234-5678-9010"
     - SSN: "123-45-6789"
     - Email: "test@example.com"
     - Phone: "+1-555-123-4567"
   - Verify redaction works
   - Verify events logged to `guardrail_events` table

6. **Guardrails Test**
   - Test moderation blocking (if possible)
   - Test jailbreak detection
   - Verify guardrails applied to all functions

7. **Integration Test**
   - Test complete flow: Upload receipt → OCR → Chat → Categorization
   - Verify end-to-end functionality
   - Check for any regressions

8. **Final Cleanup**
   - Delete any backup files created during consolidation
   - Remove temporary test files
   - Update documentation if needed

### Success Checks

- [ ] All linting passes
- [ ] TypeScript compiles without errors
- [ ] All Netlify functions respond
- [ ] Chat works end-to-end
- [ ] OCR works end-to-end
- [ ] PII redaction works
- [ ] Guardrails work
- [ ] No regressions found
- [ ] Documentation updated

### Rollback Plan

- Git tag final state
- All changes in git history
- Can rollback to any previous day if needed

---

## Post-Merge Validation

After merging all changes to production:

### Immediate Checks

1. **Production Deployment**
   - [ ] Deploy to Netlify
   - [ ] Verify all functions deployed
   - [ ] Check Netlify function logs

2. **Production Smoke Tests**
   - [ ] Test chat in production
   - [ ] Test OCR in production
   - [ ] Monitor error logs

3. **User Testing**
   - [ ] Test with real user account
   - [ ] Verify chat functionality
   - [ ] Verify OCR functionality
   - [ ] Check for any user-facing issues

### Monitoring

- Monitor error rates for 24 hours
- Monitor guardrail events
- Monitor OCR success rates
- Monitor chat response times

### Rollback Procedure

If issues found:
1. Revert to previous git tag
2. Redeploy previous version
3. Investigate issues
4. Fix and retry

---

## Summary Metrics

**Total Files Modified**: ~50+  
**Total Files Deleted**: ~40+  
**Total Lines Removed**: ~5000+ (estimated)  
**Consolidation Effort**: 7 days  
**Risk Reduction**: High (fewer code paths = fewer bugs)

---

**Plan Generated**: 2025-01-XX  
**Status**: Ready for Execution  
**Next Steps**: Begin Day 1 tasks


