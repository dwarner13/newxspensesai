# Day 16: Supercharged Intelligence Layer - Plan

**Branch**: `feature/day16-superbrain`  
**Date**: 2025-01-06  
**Status**: ✅ Complete

---

## Objectives

Give every employee access to the same "superbrain" tools via a shared ToolRouter:
- Parse → Normalize → Categorize + Confidence → Analyze Anomalies → Story + Therapist Tips

Add reflection/retry to harden JSON outputs (Tag) and analysis (Crystal).

Add a lightweight System Status panel in Prime UI (headers + counts + memory hits).

Keep headers unified using buildResponseHeaders() (already shipped).

Ship tests + reports.

---

## Implementation Plan

### 1. Shared Capability Map + Tool Router

**Files**:
- ✅ `netlify/functions/_shared/capabilities.ts` - Employee capability map
- ✅ `netlify/functions/_shared/tool_router.ts` - Tool routing with capability enforcement

**Capabilities Defined**:
- Prime: All superbrain tools (`bank_parse`, `vendor_normalize`, `categorize`, `anomaly_detect`, `story`, `therapist`)
- Byte: `bank_parse`, `vendor_normalize`
- Tag: `categorize`
- Crystal: `anomaly_detect`
- Goalie: `create_goal`, `update_goal`, `set_reminder`
- Blitz: `calculate_debt_payoff`, `optimize_payment_order`
- Ledger: `lookup_tax_deduction`, `calculate_tax`
- Automa: `create_rule`, `enable_automation`
- Chime: `create_bill`, `pay_bill`
- Serenity/Harmony: `therapist`
- Roundtable: `story`

### 2. Superbrain Modules

**Files Created**:
- ✅ `netlify/functions/_shared/vendor_normalize.ts` - Normalize merchant descriptions
- ✅ `netlify/functions/_shared/bank_parsers.ts` - Parse CSV bank statements + deduplication
- ✅ `netlify/functions/_shared/tx_pipeline.ts` - Auto-categorize with confidence + reflection
- ✅ `netlify/functions/_shared/anomaly_engine.ts` - Detect spikes, top vendors, category totals
- ✅ `netlify/functions/_shared/story_therapist.ts` - Generate stories and therapist tips

### 3. Prime Orchestration

**File Modified**:
- ✅ `netlify/functions/chat.ts` - Added CSV detection and orchestration pipeline

**Pipeline**:
1. Detect CSV content (looks for `Date,Description,Amount` header)
2. Run `bank_parse` → `categorize` → `anomaly_detect` → `story` + `therapist`
3. Merge results into response body
4. Set headers: `X-Row-Count`, `X-Unique-Rows`, `X-Analysis: present`, `X-Categorizer: tag`

### 4. System Status Panel (UI)

**Files**:
- ✅ `src/components/SystemStatus.tsx` - Dev-only status panel
- ✅ `src/pages/chat/PrimeChatSimple.tsx` - Integrates SystemStatus component

**Headers Displayed**:
- Employee, Memory-Hit/Count, OCR-Provider, RowCount/Unique, Analysis, StreamChunkCount, Guardrails, PII-Mask

### 5. Tests

**Files Created**:
- ✅ `netlify/functions/_shared/__tests__/superbrain.test.ts` - Tests for all superbrain modules
- ✅ `netlify/functions/_shared/__tests__/tool_router_caps.test.ts` - Capability enforcement tests

**Test Coverage**:
- `parseBank` → deduplication
- `normalizeVendor` → stable vendor + confidence
- `autoCategorize` → confidence in [0..1], Income detection
- `findAnomalies` → spikes/topVendors/totalsByCategory
- `makePrimeStory` / `makeTherapistTips` → non-empty strings
- Tool router → capability enforcement (allowed vs disallowed tools)

### 6. Reports

**Files Generated**:
- ✅ `reports/DAY16_PLAN.md` - This file
- ✅ `reports/DAY16_RESULTS.md` - Capability matrix + test results

---

## Key Features

### Capability-Based Access Control

Each employee has a defined capability set. ToolRouter enforces permissions before executing tools.

### Reflection/Retry (Simple)

`tx_pipeline.ts` includes a reflection check: if > 2 low-confidence results, flag `needsReview: true`. Full retry logic can be added later.

### Unified Headers

All tools set consistent headers via `buildResponseHeaders()`, including:
- `X-Row-Count`, `X-Unique-Rows` (from bank_parse)
- `X-Analysis: present` (from orchestration)
- `X-Categorizer: tag` (from categorization)

### CSV Orchestration

Prime automatically detects CSV bank statements and runs the full pipeline:
1. Parse → Normalize vendors
2. Categorize → Assign categories with confidence
3. Detect anomalies → Find spikes and top vendors
4. Generate story → Human-readable summary
5. Therapist tips → Financial wellness advice

---

## Acceptance Criteria

- ✅ All employees can invoke superbrain tools they're allowed to (via ToolRouter)
- ✅ Prime can orchestrate parse → normalize → categorize + confidence → anomalies → story + therapist
- ✅ HeaderStrip + SystemStatus show new counters (X-Row-Count, X-Unique-Rows, X-Analysis)
- ✅ Reflection path exists in tx_pipeline (simple for now; can upgrade later)
- ✅ Tests pass

---

## Quick Manual Test

1. Start dev:
   ```bash
   pnpm vite --port 5173
   pnpm --package=netlify-cli dlx netlify dev --port 8888
   ```

2. **Prime flow**: In Prime Chat, paste CSV:
   ```
   Date,Description,Amount
   2025-07-01,SAFEWAY #123 VANCOUVER,-52.13
   2025-07-02,SHELL CANADA 2004,-68.40
   2025-07-03,Payroll GFS,1600.00
   2025-07-03,NETFLIX.COM,-20.99
   2025-07-05,AMAZON Mktp CA,-42.50
   ```

   **Expected**: Categorized rows w/ confidence, anomalies, story + therapist tips.
   **Headers**: `X-Row-Count=5`, `X-Unique-Rows=5`, `X-Analysis=present`.

3. **Tag-only check**: In Tag Chat, send same rows as JSON → see strict categories + confidence.

4. **Crystal check**: Ask Crystal: "show spikes and top vendors for the last upload" → expect spikes[] and topVendors[].

---

## Notes

- Reflection/retry is simplified for now (flag `needsReview`). Full retry with LLM can be added in Day 17+.
- Tool stubs still return placeholder data; actual implementations needed for production.
- SystemStatus only shows in dev mode (`process.env.NODE_ENV !== 'production'`).







