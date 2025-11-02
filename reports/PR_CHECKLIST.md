# PR Checklist - 7-Day Cleanup & Consolidation

**PR Title**: Consolidate Duplicates & Remove Unused Code  
**Duration**: 7 days  
**Risk Level**: Medium-High

---

## Day 1 PR: Chat Endpoint Consolidation

- [ ] **Audit Complete**
  - [ ] Searched codebase for all chat endpoint references
  - [ ] Documented which components use which endpoint
  - [ ] Compared v2 vs v3 implementations

- [ ] **Code Changes**
  - [ ] Merged unique features from v2 into v3
  - [ ] Merged unique features from prime-chat into v3
  - [ ] Enhanced `chat-v3-production.ts` with all features
  - [ ] Updated `src/hooks/useChat.ts` to use v3 endpoint
  - [ ] Updated `src/lib/chatEndpoint.ts` if needed
  - [ ] Updated all component references

- [ ] **Cleanup**
  - [ ] Renamed `chat-v3-production.ts` → `chat.ts`
  - [ ] Deleted old `chat.ts` (v2)
  - [ ] Deleted `prime-chat.ts` (or merged)

- [ ] **Testing**
  - [ ] TypeScript compiles without errors
  - [ ] Chat works in dev environment
  - [ ] SSE streaming works
  - [ ] Messages save to database

- [ ] **Documentation**
  - [ ] Updated any endpoint documentation
  - [ ] Added migration notes if needed

---

## Day 2 PR: PII Masking Unification

- [ ] **Audit Complete**
  - [ ] Compared all PII implementations
  - [ ] Documented pattern differences
  - [ ] Verified `pii-patterns.ts` is most comprehensive

- [ ] **Code Changes**
  - [ ] Refactored `chat_runtime/redaction.ts` to use `pii.ts`
  - [ ] Refactored `worker/src/redaction/patterns.ts` to use `pii.ts`
  - [ ] Refactored `guardrails.ts` to use `pii.ts`
  - [ ] Updated all imports across codebase

- [ ] **Testing**
  - [ ] PII detection works (credit card, SSN, email, phone)
  - [ ] Redaction works correctly
  - [ ] Events logged to `guardrail_events` table
  - [ ] TypeScript compiles without errors

- [ ] **Verification**
  - [ ] No duplicate PII pattern definitions remain
  - [ ] All files use `pii.ts` wrapper
  - [ ] `pii-patterns.ts` is single source of truth

---

## Day 3 PR: OCR Service Consolidation

- [ ] **Audit Complete**
  - [ ] Documented all OCR implementations
  - [ ] Identified which are used
  - [ ] Documented dependencies

- [ ] **Code Changes**
  - [ ] Created `src/utils/unifiedOCRService.ts`
  - [ ] Migrated server OCR services to use unified service
  - [ ] Updated `src/components/receipts/ReceiptScanner.tsx`
  - [ ] Updated `src/components/chat/PrimeUpload.tsx`
  - [ ] Updated `netlify/functions/ocr-receipt.ts`
  - [ ] Updated `netlify/functions/byte-ocr-parse.ts`

- [ ] **Cleanup**
  - [ ] Deleted redundant OCR service files
  - [ ] Deleted `api/routes/ocr.js` (legacy)

- [ ] **Testing**
  - [ ] Google Vision API calls work
  - [ ] Tesseract fallback works
  - [ ] OCR processing works end-to-end
  - [ ] TypeScript compiles without errors

- [ ] **Verification**
  - [ ] `unifiedOCRService.ts` exists and works
  - [ ] All components use unified service
  - [ ] Redundant OCR files deleted

---

## Day 4 PR: Guardrails Standardization

- [ ] **Audit Complete**
  - [ ] Compared all guardrails implementations
  - [ ] Identified best production implementation
  - [ ] Documented function usage

- [ ] **Code Changes**
  - [ ] Standardized on single `guardrails.ts` module
  - [ ] Added guardrails to `ocr-receipt.ts` if missing
  - [ ] Added guardrails to `tag-categorize.ts` if needed
  - [ ] Updated all functions to use standardized guardrails
  - [ ] Removed duplicate guardrails files

- [ ] **Testing**
  - [ ] PII detection works in all functions
  - [ ] Moderation checks work
  - [ ] Jailbreak detection works
  - [ ] Events logged to `guardrail_events` table

- [ ] **Verification**
  - [ ] Single `guardrails.ts` module exists
  - [ ] All user-facing functions use guardrails
  - [ ] Consistent guardrails API usage

---

## Day 5 PR: Legacy Component Migration

- [ ] **Migration Complete**
  - [ ] Updated `src/components/dashboard/ConnectedDashboard.tsx`
  - [ ] Updated `src/pages/dashboard/SmartImportAIPage.tsx`
  - [ ] Updated `src/components/chat/AIEmployeeTestInterface.tsx`
  - [ ] Updated `src/pages/test/PrimeAITestPage.tsx`
  - [ ] Updated `src/components/layout/MobileBottomNav.tsx`
  - [ ] Updated all other files referencing `_legacy/ByteDocumentChat`

- [ ] **Cleanup**
  - [ ] Deleted `src/components/chat/ByteDocumentChat_backup.tsx`
  - [ ] Deleted `src/components/chat/ByteDocumentChat_clean.tsx`
  - [ ] Resolved `orchestrate-notifications.ts` vs `notifications-orchestrate.ts`
  - [ ] Moved/deleted test functions

- [ ] **Testing**
  - [ ] No references to `_legacy/ByteDocumentChat` found
  - [ ] All components use active `ByteDocumentChat.tsx`
  - [ ] TypeScript compiles without errors
  - [ ] Frontend builds without errors

- [ ] **Preparation**
  - [ ] Created safe delete list
  - [ ] Verified no references to files in delete list

---

## Day 6 PR: Safe Deletions

- [ ] **Verification**
  - [ ] Ran grep to verify no references
  - [ ] Confirmed ByteDocumentChat migration complete
  - [ ] Double-checked safe delete list

- [ ] **Deletions**
  - [ ] Deleted `netlify/functions/_legacy/` directory (3 files)
  - [ ] Deleted `netlify/functions-backup/` directory (30+ files)
  - [ ] Deleted `src/archived/` directory (6 files)
  - [ ] Deleted Supabase mock functions (8+ functions)
  - [ ] Deleted `api/routes/ocr.js` (legacy)
  - [ ] Deleted redundant OCR files

- [ ] **Testing**
  - [ ] No broken imports
  - [ ] TypeScript compiles without errors
  - [ ] Frontend builds without errors
  - [ ] All functions still work

- [ ] **Git**
  - [ ] All deletions committed
  - [ ] Git history preserved

---

## Day 7 PR: Final Validation

- [ ] **Linting & Type Checking**
  - [ ] `npm run lint` passes
  - [ ] `npx tsc --noEmit` passes
  - [ ] All errors fixed

- [ ] **Netlify Dev Smoke Tests**
  - [ ] Chat endpoint responds
  - [ ] OCR endpoint responds
  - [ ] All endpoints functional

- [ ] **Functionality Tests**
  - [ ] Chat works end-to-end
  - [ ] OCR works end-to-end
  - [ ] PII redaction works
  - [ ] Guardrails work
  - [ ] Integration test passes

- [ ] **Final Cleanup**
  - [ ] Deleted backup files
  - [ ] Removed temporary test files
  - [ ] Updated documentation

- [ ] **Pre-Merge Checklist**
  - [ ] All previous day PRs merged
  - [ ] No breaking changes
  - [ ] All tests pass
  - [ ] Documentation updated
  - [ ] Ready for production merge

---

## Post-Merge Checklist

- [ ] **Production Deployment**
  - [ ] Deployed to Netlify
  - [ ] All functions deployed successfully
  - [ ] Checked Netlify function logs

- [ ] **Production Smoke Tests**
  - [ ] Tested chat in production
  - [ ] Tested OCR in production
  - [ ] Monitored error logs

- [ ] **Monitoring**
  - [ ] Monitor error rates for 24 hours
  - [ ] Monitor guardrail events
  - [ ] Monitor OCR success rates
  - [ ] Monitor chat response times

- [ ] **Rollback Plan**
  - [ ] Git tag created
  - [ ] Rollback procedure documented
  - [ ] Team notified of changes

---

**PR Checklist Generated**: 2025-01-XX  
**Status**: Ready for Execution


