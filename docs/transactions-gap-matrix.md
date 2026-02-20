# Transactions Gap Matrix

Scope: current transaction ingestion + Prime tooling readiness across cleaning, enrichment, dedupe, splitting, and metadata.

## Status legend
- `Implemented`: working in current flow
- `Partial`: present in some paths, not uniform
- `Missing`: not available as a consistent capability

## Matrix

| Capability | Status | Notes | Key files |
|---|---|---|---|
| Data cleaning / de-noising | Partial | Amount/text cleanup and parser normalization exist, but not one unified cleaning stage for every source. | `netlify/functions/tx-search.ts`, `netlify/functions/_shared/ocr_normalize.ts`, `netlify/functions/chat.ts` |
| Merchant normalization (pretty names) | Partial | `merchant_normalized` exists in worker outputs; no single canonical enrichment pass for all committed rows. | `netlify/functions/chat.ts`, `netlify/functions/_shared/ocr_normalize.ts` |
| Duplicate detection (double posting / multi-import) | Partial-Strong | Import/commit-level duplicate protections exist; not exposed as one explicit duplicate-validation service in chat path. | `netlify/functions/commit-import.ts`, `netlify/functions/_shared/upload.ts`, `src/lib/duplicateDetection.ts` |
| Transaction splitting (mixed baskets) | Missing/Partial | Line item extraction exists for some document types, but robust split-to-multiple categorized tx rows is not consistently applied. | `netlify/functions/_shared/ocr_parsers.ts`, `netlify/functions/_shared/ocr_normalize.ts` |
| Metadata attachment (logo + location) | Missing | No consistent merchant logo/GPS enrichment pipeline attached to transaction records used by Prime tools. | `src/systems/EnhancedOCRSystem.ts` (experimental), transaction paths in `netlify/functions/*` |
| Pre-processing phase | Partial | Multiple preprocess steps exist but are distributed. | `netlify/functions/_shared/ocr_normalize.ts`, `netlify/functions/smart-import-ocr.ts` |
| Validation phase (duplicate/fraud checks) | Partial | Duplicate checks exist; fraud/risk checks are limited and not centralized. | `netlify/functions/commit-import.ts` |
| Core AI categorization | Implemented (with caveats) | Category workflows and updates are working via tools; consistency depends on merchant learning path. | `netlify/functions/tx-update-category.ts`, `src/agent/tools/impl/tx_update_category.ts`, `netlify/functions/tag-learn.ts`, `netlify/functions/update-vendor-category.ts` |
| Post-processing insights & alerts | Partial | Prime/Crystal provide insight capabilities, but transaction enrichment quality still affects outputs. | `netlify/functions/chat.ts`, `src/agent/tools/impl/*` |

## High-impact next actions (smallest-safe first)

1. Add deterministic tool-required guardrails for transaction intents (already partially in place) and keep expanding assertion checks in tool follow-up paths.
2. Consolidate merchant normalization into one reusable helper used by `tx-search`, import commit, and category-learning paths.
3. Add transaction-level duplicate flags in response payloads (non-blocking) before introducing any auto-suppression behavior.
4. Add integration smoke checks in CI for `tx_search -> tx_get -> tx_update_category` and uncategorized/vendor-rule flows.

