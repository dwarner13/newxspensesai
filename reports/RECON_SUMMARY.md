# Brain & Guardrails Recon Summary

**Generated**: 2025-01-06  
**Scope**: Complete AI brain architecture scan (read-only)

---

## TL;DR

**Status**: 🟡 **Ready with gaps**

The AI brain is functional for 4 core employees (Prime, Crystal, Tag, Byte) with full memory, guardrails, and header telemetry. However, **13 additional employees have chat pages but no router cases**, and **critical header builder function is missing** from `chat.ts`.

**What Works**:
- ✅ Model: `gpt-4o-mini` with streaming SSE
- ✅ Memory: Vector embeddings, recall/embed/extract pipeline
- ✅ Guardrails: 3-layer (PII → moderation → jailbreak)
- ✅ Routing: Deterministic + LLM fallback for 4 employees
- ✅ OCR Pipeline: Multi-provider → parse → normalize → categorize → save
- ✅ Headers: 8 core + 6 OCR-specific headers (in `ocr.ts`)

**What's Missing**:
- 🔴 `buildResponseHeaders()` not defined in `chat.ts` (critical)
- 🔴 13 employees not in router (critical)
- 🟡 OCR headers not forwarded in Byte tool calls (high)
- 🟡 Tools missing for 14 employees (high)
- 🟢 Tests missing for routing/headers (medium)

---

## Top 5 Next Steps to Supercharge

### 1. Extract & Share Header Builder (🔴 Critical - 30 min)

**Issue**: `buildResponseHeaders()` defined in `ocr.ts` but missing in `chat.ts` (referenced but not found)

**Action**:
- Extract function to `_shared/headers.ts`
- Import in both `chat.ts` and `ocr.ts`
- Add `streamChunkCount?: number` parameter

**Impact**: Ensures consistent header generation across all endpoints

---

### 2. Add Router Cases for 13 Employees (🔴 Critical - 2-3 hours)

**Issue**: Only 4 employees (Prime, Crystal, Tag, Byte) have router cases in `prime_router.ts`

**Action**:
- Add keyword detection patterns for each employee
- Add router cases for: Goalie, Automa, Blitz, Liberty, Chime, Roundtable, Serenity, Harmony, Wave, Ledger, Intelia, Dash, Custodian
- Test routing confidence

**Impact**: Enables automatic routing to specialized employees

---

### 3. Forward OCR Headers in Byte Tool Calls (🟡 High - 1 hour)

**Issue**: When Byte calls OCR via `ocr_file` tool, OCR response headers are lost

**Action**:
- Capture OCR response headers in tool call handler (`chat.ts:2170-2244`)
- Merge OCR headers into final chat response headers

**Impact**: Provides complete telemetry for OCR operations

---

### 4. Add Tools for High-Value Employees (🟡 High - 4-6 hours)

**Issue**: Only 3 employees have tools (Prime: delegate, Crystal: delegate, Byte: ocr_file)

**Recommended Tools**:
- **Goalie**: `create_goal`, `update_goal`, `set_reminder`
- **Ledger**: `lookup_tax_deduction`, `calculate_tax`
- **Automa**: `create_rule`, `enable_automation`
- **Chime**: `create_bill`, `pay_bill`

**Impact**: Enables actionable AI interactions beyond chat

---

### 5. Verify Memory Integration for All Employees (🟡 Medium - 30 min)

**Issue**: Memory pipeline exists but may not be fully tested for all employees

**Action**:
- Verify `memory.recall()` works before employee selection (already done)
- Verify `memory.extractFactsFromMessages()` and `memory.embedAndStore()` work after all responses (already done)
- Test with each employee to confirm memory is recalled/stored

**Impact**: Ensures all employees leverage user memory/facts

**Note**: Memory already works globally (no employee-specific code needed); this is verification only.

---

## Architecture Highlights

### Models & Invocation
- **Model**: `gpt-4o-mini` (default, configurable via `OPENAI_CHAT_MODEL`)
- **Streaming**: SSE with real-time PII masking
- **Temperature**: `0.3`
- **Context Window**: `4000` tokens (reserve ~1500 for response)

### Router & Employees
- **Router**: Deterministic keyword detection + LLM fallback (`prime_router.ts`)
- **Routed Employees**: 4 (Prime, Crystal, Tag, Byte)
- **Chat Pages**: 17 (all employees have pages)
- **Router Gaps**: 13 employees need router cases

### Memory Fabric
- **Recall**: Vector similarity search (`memory.recall()`)
- **Embed**: OpenAI `text-embedding-3-large` (`memory.embedAndStore()`)
- **Extract**: LLM-based fact extraction (`memory.extractFactsFromMessages()`)
- **Headers**: `X-Memory-Hit`, `X-Memory-Count`

### Guardrails & PII
- **PII Patterns**: 20+ detectors across 5 categories (financial, government, contact, address, network)
- **Masking**: `last4` (default), `full`, `domain` (email)
- **SSE Masking**: Real-time PII redaction during streaming
- **Logging**: `guardrail_events` table with hash-based audit trail

### Headers Telemetry
- **Core Headers**: 8 (Guardrails, PII-Mask, Memory-Hit, Memory-Count, Session-Summary, Session-Summarized, Employee, Route-Confidence)
- **Streaming Headers**: 1 (Stream-Chunk-Count, optional)
- **OCR Headers**: 6 (OCR-Provider, OCR-Parse, Transactions-Saved, Categorizer, Vendor-Matched, XP-Awarded)

### OCR/Bank Pipelines
- **Providers**: OCRSpace, Google Vision, Local (stub)
- **Parsers**: Invoice, Receipt, Bank Statement (stub)
- **Normalization**: `toTransactions()` converts ParsedDoc → NormalizedTransaction[]
- **Categorization**: Rule-based + Tag fallback
- **Vendor Matching**: `matchVendor()` with aliases
- **Memory Learning**: `rememberCategory()` from corrections
- **XP Awarding**: `awardXP()` for OCR operations

---

## Reports Generated

1. **BRAIN_MAP.md** - Complete architecture overview
2. **BRAIN_MAP_MERMAID.md** - Flow diagrams (5 diagrams)
3. **GUARDRAILS_AUDIT.md** - PII patterns, masking, events, SSE
4. **HEADER_MATRIX.md** - Routes vs headers matrix
5. **EMPLOYEE_CAPABILITIES.json** - Per-employee capabilities
6. **RECON_GAPS.md** - Prioritized fixlist
7. **RECON_SUMMARY.md** - This document

---

## Next Phase: Supercharge All Employees

Once gaps #1-2 are fixed:
- All employees will be routable
- Headers will be consistent
- Memory will work for all
- Tools can be added incrementally

**Estimated Supercharge Timeline**: 12-17 hours (see RECON_GAPS.md for details)

















