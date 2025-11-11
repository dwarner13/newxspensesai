# Recon Gaps - Prioritized Fixlist

**Generated**: 2025-01-06

Prioritized list of gaps found during brain & guardrails recon, sorted by ROI (high to low).

---

## 🔴 Critical (Must Fix)

### 1. Missing `buildResponseHeaders` in `chat.ts`

**File**: `netlify/functions/chat.ts`  
**Lines**: 2341, 2478, 2580, 2793  
**Issue**: Function referenced but not defined/imported  
**Impact**: Headers may not be set for non-streaming responses  

**Fix**:
- Extract `buildResponseHeaders` from `ocr.ts:23` to `_shared/headers.ts`
- Import in both `chat.ts` and `ocr.ts`
- Add `streamChunkCount?: number` parameter

**Priority**: HIGH  
**Effort**: 30 min

---

### 2. Router Cases Missing for 13 Employees

**File**: `netlify/functions/_shared/prime_router.ts`  
**Issue**: Only 4 employees (Prime, Crystal, Tag, Byte) have router cases  
**Impact**: Remaining 13 employees only accessible via manual override  

**Missing Router Cases**:
- Goalie (goals, reminders)
- Automa (automation)
- Blitz (debt)
- Liberty (financial freedom)
- Chime (bills)
- Roundtable (podcast)
- Serenity (therapist)
- Harmony (wellness)
- Wave (spotify)
- Ledger (tax)
- Intelia (BI)
- Dash (analytics)
- Custodian (settings)

**Fix**:
- Add keyword detection patterns for each employee
- Add router cases in `prime_router.ts:136-189`
- Test routing confidence

**Priority**: HIGH  
**Effort**: 2-3 hours

---

## 🟡 High Priority (Should Fix Soon)

### 3. OCR Headers Not Forwarded in Byte Tool Calls

**File**: `netlify/functions/chat.ts:2170-2244`  
**Issue**: When Byte calls OCR via `ocr_file` tool, OCR response headers are lost  
**Impact**: Missing telemetry (X-OCR-Provider, X-Transactions-Saved, etc.) in final response  

**Fix**:
- Capture OCR response headers in tool call handler
- Merge OCR headers into final chat response headers
- Or forward headers from OCR endpoint via tool result metadata

**Priority**: HIGH  
**Effort**: 1 hour

---

### 4. Memory Integration Missing for 13 Employees

**File**: `netlify/functions/chat.ts`  
**Issue**: Only Prime, Crystal, Tag, Byte use memory (recall/embed/extract)  
**Impact**: Remaining employees can't leverage user memory/facts  

**Fix**:
- Memory pipeline already works for all employees (no employee-specific code needed)
- Ensure `memory.recall()` is called before employee selection (already done)
- Ensure `memory.extractFactsFromMessages()` and `memory.embedAndStore()` are called after all responses (already done)
- **Note**: Memory already works globally; no code changes needed, just verification

**Priority**: MEDIUM  
**Effort**: 30 min (testing/verification only)

---

### 5. Tools Missing for 14 Employees

**File**: `netlify/functions/chat.ts:2072-2098`  
**Issue**: Only Prime (delegate), Crystal (delegate), Byte (ocr_file) have tools  
**Impact**: Employees can't execute specialized actions  

**Recommended Tools**:
- **Goalie**: `create_goal`, `update_goal`, `set_reminder`
- **Ledger**: `lookup_tax_deduction`, `calculate_tax`, `fetch_tax_forms`
- **Automa**: `create_rule`, `enable_automation`, `test_rule`
- **Chime**: `create_bill`, `pay_bill`, `schedule_payment`
- **Blitz**: `calculate_debt_payoff`, `optimize_payment_order`

**Priority**: MEDIUM  
**Effort**: 4-6 hours (tool design + implementation)

---

### 6. `bank_ingest.ts` Missing All Headers

**File**: `netlify/functions/bank_ingest.ts` (if exists)  
**Issue**: Function likely missing `buildResponseHeaders()` calls  
**Impact**: Inconsistent telemetry  

**Fix**:
- Add `buildResponseHeaders()` calls to all response paths
- Use shared header builder (after fixing gap #1)

**Priority**: MEDIUM  
**Effort**: 30 min

---

## 🟢 Medium Priority (Nice to Have)

### 7. SSE Chunk Count Header May Not Be Set

**File**: `netlify/functions/chat.ts:2802`  
**Issue**: `streamChunkCount` tracked but may not be included in headers  
**Impact**: Missing telemetry for debugging streaming issues  

**Fix**:
- Verify `buildResponseHeaders()` signature includes `streamChunkCount`
- Ensure final chunk count is passed after streaming completes
- Or set header after stream ends (if possible with SSE)

**Priority**: LOW  
**Effort**: 30 min

---

### 8. Test Coverage Gaps

**Files**: `netlify/functions/_shared/__tests__/`  
**Missing Tests**:
- Crystal routing/behavior
- Tag categorization accuracy
- Employee-specific tool execution
- Header generation consistency

**Priority**: LOW  
**Effort**: 2-4 hours

---

### 9. Guardrail Presets Documentation

**File**: `netlify/functions/_shared/guardrails.ts`  
**Issue**: `balanced`, `strict`, `creative` presets exist but usage unclear  
**Impact**: Confusion about which preset to use when  

**Fix**:
- Document preset behaviors
- Add preset selection guidelines
- Document when to use each preset

**Priority**: LOW  
**Effort**: 1 hour

---

### 10. Vendor Normalization/Confidence Scoring

**File**: `netlify/functions/_shared/ocr_normalize.ts`  
**Issue**: Vendor matching exists but confidence scoring unclear  
**Impact**: Users don't know how confident categorizations are  

**Fix**:
- Add confidence scores to vendor matching
- Surface confidence in headers or response
- Use confidence for auto-correction prompts

**Priority**: LOW  
**Effort**: 1-2 hours

---

## Summary by Category

| Category | Count | Priority |
|----------|-------|----------|
| Missing Functions | 1 | 🔴 Critical |
| Router Gaps | 13 | 🔴 Critical |
| Header Gaps | 2 | 🟡 High |
| Memory Gaps | 0 (already works) | ✅ |
| Tool Gaps | 14 | 🟡 High |
| Test Gaps | 4+ | 🟢 Medium |
| Documentation Gaps | 2 | 🟢 Medium |

---

## Recommended Fix Order

1. **Fix `buildResponseHeaders` missing** (gap #1) - 30 min
2. **Add router cases for 13 employees** (gap #2) - 2-3 hours
3. **Forward OCR headers in Byte tool calls** (gap #3) - 1 hour
4. **Add tools for high-value employees** (gap #5) - 4-6 hours
5. **Fix `bank_ingest.ts` headers** (gap #6) - 30 min
6. **Verify/test memory integration** (gap #4) - 30 min
7. **Add missing tests** (gap #8) - 2-4 hours
8. **Document guardrail presets** (gap #9) - 1 hour

**Total Estimated Time**: 12-17 hours







