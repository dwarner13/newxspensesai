# Unused Items & Orphaned Code

**Date**: 2025-01-XX  
**Purpose**: Identify unused functions, components, and orphaned modules

---

## Summary

**Total Unused Files Identified**: 35+  
**Total Unused Functions**: 50+ (estimated)  
**Legacy Directories**: 2 (`_legacy`, `functions-backup`)  
**Orphaned Components**: 10+ frontend components

---

## Unused Netlify Functions

### Legacy Chat Functions (`netlify/functions/_legacy/`)

**Files:**
1. `chat-complex.ts`
   - **Status**: Legacy, not referenced in routes
   - **Purpose**: Complex chat implementation with full feature set
   - **Note**: Has handler export, could be deployed but likely unused
   - **Recommendation**: DELETE (active versions exist)

2. `chat-sse.ts`
   - **Status**: Legacy, not referenced in routes
   - **Purpose**: SSE chat implementation
   - **Recommendation**: DELETE

3. `chat-stream.ts`
   - **Status**: Legacy, not referenced in routes
   - **Purpose**: Streaming chat implementation
   - **Recommendation**: DELETE

**Evidence**: No route references found, but handlers exist (could be deployed separately)

---

### Backup Functions (`netlify/functions-backup/`)

**Status**: Backup directory, not deployed  
**Files**: 30+ backup files including:
- `chat.ts`, `chat-simple.ts`
- `ocr-ingest.ts`, `ocr-ingest-simple.ts`
- `guardrails.ts`
- `embed.ts`
- Various zip files

**Recommendation**: DELETE (backups should be in git history)

---

### Potentially Unused Functions

**Functions to Audit:**

1. `netlify/functions/orchestrate-notifications.ts`
   - **Issue**: May duplicate `notifications-orchestrate.ts`
   - **Status**: Needs verification

2. `netlify/functions/prime/segmentation.ts`
   - **Status**: Prime-specific segmentation
   - **Usage**: Needs verification

3. `netlify/functions/test.ts`
   - **Status**: Test function
   - **Recommendation**: Move to test directory or delete

4. `netlify/functions/selftest.ts`
   - **Status**: Self-test function
   - **Recommendation**: Move to test directory or delete

---

## Unused Frontend Components

### Archived Components (`src/archived/`)

**Files:**
- `AIFinancialAssistantPage.tsx`
- `FinancialAssistantPage.tsx`
- `PersonalPodcastPage.tsx`
- `SmartImportAIFeaturePage.tsx`
- `spending-predictions.tsx`
- `SpendingPredictionsFeaturePage.tsx`

**Status**: Archived, not in active routes  
**Recommendation**: DELETE or move to archive directory

---

### Legacy Chat Components

**Files:**
- `src/components/chat/_legacy/ByteDocumentChat.tsx`
   - **Status**: ⚠️ STILL IN USE (referenced in 7 files)
   - **Used By**: 
     - `src/components/dashboard/ConnectedDashboard.tsx`
     - `src/pages/dashboard/SmartImportAIPage.tsx`
     - `src/components/chat/AIEmployeeTestInterface.tsx`
     - `src/pages/test/PrimeAITestPage.tsx`
     - `src/components/layout/MobileBottomNav.tsx`
   - **Active**: `src/components/chat/ByteDocumentChat.tsx` also exists
   - **Recommendation**: MIGRATE references to active version, then DELETE

**Files:**
- `src/components/chat/ByteDocumentChat_backup.tsx`
- `src/components/chat/ByteDocumentChat_clean.tsx`
   - **Status**: Backup/clean versions
   - **Recommendation**: DELETE

---

### Unused Hooks

**Files:**
- `src/hooks/_legacy/` (if exists)
   - **Status**: Legacy hooks
   - **Recommendation**: DELETE after migration

---

## Unused Utilities

### Potentially Unused OCR Services

**Files:**
- `src/client/services/ocrService.ts`
   - **Status**: Client-side OCR
   - **Usage**: Needs verification (may be unused if server-side only)

- `src/client/pdf/ocrFallback.ts`
   - **Status**: PDF OCR fallback
   - **Usage**: Needs verification

---

## Unused Database Tables

### Potentially Unused Tables

**Note**: Requires database audit to verify

**Tables to Check:**
- `ai_conversations` (if migrated to `chat_sessions`)
- `conversations` (if migrated to `chat_sessions`)
- Old podcast tables (if podcast feature removed)

**Recommendation**: Run SQL queries to check for empty/unused tables

---

## Unused Imports/Dependencies

### Package.json Dependencies

**To Audit:**
- Check `package.json` for unused npm packages
- Use tools like `depcheck` or `npm-check-unused`

**Recommendation**: Run dependency audit script

---

## Unused API Routes

### Legacy Express Routes

**Files:**
- `api/routes/ocr.js`
   - **Status**: Legacy Express route
   - **Current**: Netlify Functions handle OCR
   - **Recommendation**: DELETE

---

## Unused Supabase Edge Functions

### Potentially Unused Functions

**To Verify:**
- `supabase/functions/load-dashboard-fake/`
- `supabase/functions/load-dashboard-mock/`
- `supabase/functions/load-mock-receipts/`
- `supabase/functions/load-mock-transactions/`
- `supabase/functions/load-profile-mock/`
- `supabase/functions/load-reports-mock/`
- `supabase/functions/load-transactions-mock/`
- `supabase/functions/mock-dashboard/`

**Status**: Mock/development functions  
**Recommendation**: DELETE or move to dev-only directory

---

## Orphaned Code Patterns

### Pattern 1: Backup Files

**Pattern**: Files with `_backup`, `_old`, `_legacy` suffixes  
**Count**: 10+ files  
**Recommendation**: Delete after verifying not needed

### Pattern 2: Test Files in Production

**Pattern**: Test files in production directories  
**Example**: `netlify/functions/test.ts`  
**Recommendation**: Move to test directory

### Pattern 3: Duplicate Implementations

**Pattern**: Multiple implementations of same functionality  
**Example**: Multiple OCR services, chat endpoints  
**Recommendation**: See DUPLICATE_MAP.md

---

## Cleanup Recommendations

### Immediate Actions

1. **Delete Legacy Directories**:
   - `netlify/functions/_legacy/` (3 files)
   - `netlify/functions-backup/` (30+ files)

2. **Delete Archived Components**:
   - `src/archived/` directory (6 files)
   - Backup chat components (3 files)

3. **Delete Mock Functions**:
   - Supabase mock functions (8+ functions)

### Medium-Term Actions

4. **Audit Unused Functions**:
   - Verify `orchestrate-notifications.ts` vs `notifications-orchestrate.ts`
   - Check `prime/segmentation.ts` usage
   - Move test functions to test directory

5. **Dependency Audit**:
   - Run `depcheck` to find unused npm packages
   - Remove unused dependencies

6. **Database Audit**:
   - Check for empty/unused tables
   - Archive old data if needed

---

## Verification Script

To verify unused functions, run:

```bash
# Find functions not imported anywhere
grep -r "import.*from.*functions/_legacy" src/ netlify/functions/

# Find unused components
grep -r "import.*from.*archived" src/

# Find unused Supabase functions
grep -r "supabase/functions/mock" src/
```

---

## Impact Assessment

**Code Reduction**: ~5000+ lines (estimated)  
**Maintenance Reduction**: High (fewer files to maintain)  
**Risk**: Low (unused code doesn't affect production)  
**Effort**: Low (1-2 days to delete)

---

**Report Generated**: 2025-01-XX  
**Next Steps**: Execute cleanup actions starting with legacy directories

