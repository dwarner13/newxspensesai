# Prime Read Authority V1

**Status: PROVEN CHECKPOINT**

## 1. Purpose

Prime now has a canonical, deterministic foundation for reading verified financial data. All financial category resolution, tax section classification, subcategory bucketing, and date range computation flow through a single source of truth in `src/shared/`. This replaces 50+ duplicated financial calculations scattered across 8+ files with importable, testable, pure TypeScript modules.

## 2. What Is Working

### Canonical Financial Taxonomy (`src/shared/financial-taxonomy.ts`)
- 13 NON_SPEND categories, 17 NON_SPEND subcategories
- Strict and broad income classification (`isIncomeStrict`, `isIncomeBroad`)
- 29 canonical categories, organized subcategories
- ~80 natural-language category aliases (e.g., "fuel" → Transportation/Gas & Fuel)
- `resolveCategory()` and `resolveCategoryOrPassthrough()` resolvers
- `QueryResultStatus` type: `verified | verified_zero | unresolved_category | insufficient_scope | query_error`

### Canonical Tax Classification (`src/shared/financial-sections.ts`)
- 7 tax sections: Income → Vehicle → Home → Meals → Business → Personal → Other
- First-match-wins semantics (Income evaluated before Vehicle — critical for rebates)
- Bucket definitions for all sections (Vehicle, Meals, Home, Business, Personal)
- `classifyTransactions()` — deterministic first-match-wins classifier
- `groupIntoBuckets()` — subcategory/merchant keyword matching

### Timezone-Safe Financial Dates (`src/shared/financial-dates.ts`)
- `getLocalDateParts()` using `Intl.DateTimeFormat` (works in browser + Node.js)
- `getMonthRange()`, `getPreviousMonthRange()`, `getYearRange()`
- `getMonthBucketKey()` — respects timezone for YYYY-MM bucketing
- Solves the "Edmonton 11 PM problem" (UTC would report wrong month)

### Enhanced tx_search
- `subcategory` parameter added (input + output + backend query)
- Canonical resolver connected — natural-language terms auto-resolve to DB taxonomy
- `queryStatus` in response: `verified`, `verified_zero`, `unresolved_category`, `query_error`
- `resolvedCategory` in response — shows what the resolver mapped to
- Backward compatible — existing callers without subcategory still work

### Read-Only tax_summary Tool
- `src/agent/tools/impl/tax_summary.ts` — tool implementation
- `netlify/functions/tax-summary.ts` — backend endpoint
- Uses canonical `classifyTransactions` + `groupIntoBuckets` from foundation
- Returns section totals with bucket breakdowns, matching Tax Workspace exactly
- Read-only (input schema: `{ year }` only)

### Exact-Scope Tool Gating (`src/shared/tool-gate.ts`)
- `shouldRetainTools()` — determines if Prime keeps financial read tools
- Broader scope never satisfies narrower: Vehicle ≠ Gas & Fuel, Shopping ≠ Costco
- Year-aware: 2025 context does not answer 2024 questions
- Comparison-aware: single-year context does not satisfy year-over-year
- Merchant-aware: "at Costco" always retains tools
- Detail-aware: "which", "list", "show me" always retains tools
- Mutation-aware: "change", "recategorize" always retains tools

### Prime Grounding Contract
- Replaces old "DATA INSTRUCTIONS" with 6-rule grounding contract
- Rules: grounded answers, context-first, tool investigation with natural language, queryStatus handling, handoff, never fabricate
- Zero-result safety: "NEVER say 'you have no X' unless queryStatus is verified_zero"

### Preserved Invariants
- Authentication / user isolation preserved
- Specialist write authority preserved (Tag owns category mutations)
- HMAC confirmation preserved
- Financial Boundary Rule 8 preserved

## 3. Important Regression Proof

### 2025 Gas & Fuel Tax Summary: $6,472.65

The audit script (`scripts/audit-fuel-discrepancy.ts`) reported $8,622.49 for Gas/Fuel because it processed Vehicle before Income. The actual TaxWorkspacePage and canonical foundation process Income FIRST (first-match-wins).

A $2,149.84 transaction has `type="income"` and `subcategory="Gas & Fuel"`. Under first-match-wins, Income claims it before Vehicle ever evaluates it.

$8,622.49 − $2,149.84 = **$6,472.65** (matches UI, matches canonical foundation)

This is verified by deterministic test: `financial-foundation.test.ts` → "Fuel rebate regression".

## 4. Test Checkpoint

**127/127 tests passing**

| Suite | Tests | File |
|-------|-------|------|
| Phase 1 Foundation | 71 | `src/shared/__tests__/financial-foundation.test.ts` |
| Phase 1B Read Authority | 25 | `src/shared/__tests__/prime-read-authority.test.ts` |
| Phase 1B.1 Tool Gating | 31 | `src/shared/__tests__/tool-gate.test.ts` |

- TypeScript: clean (zero errors)
- Vite build: clean

## 5. Security Checkpoint

- Prime has broad READ authority only
- Prime does not receive unrestricted financial WRITE authority
- Tag retains category mutation ownership
- Confirmation/HMAC remains server-enforced
- No cross-user financial reads are permitted
- Financial Boundary Rule 8 remains active

## 6. What Is NOT Finished

- Phase 1C Conversational Prime not built
- Conversational active-year/topic state not complete
- Merchant conversational continuity not complete
- Upload → Byte → Prime return flow not fully proven
- Specialist return-to-Prime behavior not fully proven
- Crystal not migrated to Financial Read Authority
- Goalie not migrated
- Custodian not migrated
- Dashboard/Reports/other consumers not migrated
- Web research/internet authority not implemented

This checkpoint covers Prime's financial read foundation only. The entire AI Financial Team is NOT complete.

## 7. Recovery Instructions

**Git tag:** `prime-read-authority-v1`

If a later AI architecture change causes financial read regressions:

1. Compare against this tag/checkpoint before reverting anything
2. Run `npx vitest@2 run src/shared/__tests__/` to verify foundation tests
3. Check that `resolveCategory("fuel")` still returns `{ category: "Transportation", subcategory: "Gas & Fuel" }`
4. Check that first-match-wins Income→Vehicle ordering is preserved
5. Do not automatically revert unrelated database migrations or user data

## 8. Next Planned Phase

### Phase 1C — Conversational Prime

Goals:
- Active financial period tracking
- Active subject / category memory
- Active merchant context
- Comparison context (year-over-year, month-over-month)
- Intelligent clarification ("Which year?" when ambiguous)
- Fresh-data invalidation / re-query triggers
- Handoff context packets (Prime → specialist)
- Specialist → Prime return context preservation
