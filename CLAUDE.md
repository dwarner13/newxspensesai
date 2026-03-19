# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

XspensesAI is an AI-powered personal finance platform built as a React SPA with a Netlify Functions serverless backend. The core concept is a team of AI "employees" (Prime, Byte, Tag, Crystal, Finley, etc.) each with distinct personas, that collaborate to help users manage finances through conversational AI, document processing, and automated categorization.

## Commands

### Development
```bash
npm run dev              # Vite dev server only (port 5174) — no function access
npm run dev:netlify      # Full-stack dev with Netlify Functions (port 8888) — use this
npm run functions:dev    # Watch/rebuild Netlify functions in isolation
```

### Build & Deploy
```bash
npm run build            # TypeScript check + Vite build → dist/
npm run functions:build  # Build Netlify functions separately
```

### Lint & Type Check
```bash
npm run lint             # ESLint — zero warnings policy (--max-warnings 0)
```

### Testing
```bash
npm run test             # Run all Vitest unit tests
npm run test:watch       # Watch mode
npm run test:ui          # Vitest UI dashboard

# Per-employee contract tests
npm run byte:test        # Byte document processing
npm run tag:test         # Tag categorization
npm run crystal:test     # Crystal analytics
npm run finley:test      # Finley financial planning
npm run pipe:contract    # Full pipeline integration
```

### AI Employee Sync
```bash
npm run sync:all         # Sync all employee personas to backend
npm run sync:prime       # Sync individual employees (prime/byte/tag/crystal)
```

### Verification
```bash
npm run verify:handoff   # Verify Byte→user handoff behavior
npm run verify:no-autosend  # Verify no auto-send regressions
npm run ocr:check        # Check OCR extraction quality
```

## Architecture

### Repository Layout

- **`src/`** — React 18 frontend (TypeScript, Vite, Tailwind CSS)
- **`netlify/functions/`** — Serverless backend (Node.js TypeScript, built with esbuild)
- **`netlify/functions/_shared/`** — Shared utilities for all functions (guardrails, memory, router, Supabase admin client)
- **`netlify/functions/_lib/`** — Higher-level library code for functions
- **`sql/migrations/`** — Timestamped SQL migrations for Supabase
- **`scripts/`** — Contract test runners and smoke tests (run via `tsx`)
- **`docs/`** — Persona definitions, implementation guides, architecture docs

### Multi-Agent System

Each AI employee has a defined persona (in `docs/`), model routing config (`netlify/functions/_shared/employeeModelConfig.ts`), and specialized tools. Employees:

| Employee | Role | Key Function |
|----------|------|-------------|
| **Prime** | CEO / Orchestrator | `prime-router.ts` — orchestrates import pipeline |
| **Byte** | Document Specialist | OCR, PDF parsing, receipt extraction |
| **Tag** | Categorizer | Transaction auto-categorization |
| **Crystal** | Analytics | Spending insights, predictions |
| **Finley** | Financial Planner | Debt payoff, savings goals |

All employee chat flows through a single endpoint: `/.netlify/functions/chat`.

### Chat Pipeline (per message)

1. **Guardrails** (`_shared/guardrails-unified.ts`) — PII masking (32+ detectors), content moderation, jailbreak detection
2. **Routing** (`_shared/router.ts`) — Select employee by slug, load persona + tools
3. **Memory** (`_shared/memory.ts`) — Retrieve relevant past context from Supabase
4. **Model Execution** — OpenAI API call (GPT-4o or GPT-4o-mini depending on employee config)
5. **Session Persistence** — Save to `chat_sessions` + `chat_messages` in Supabase

PII patterns are the single source of truth in `_shared/pii-patterns.ts` — never duplicate or inline PII logic.

### Smart Import Pipeline (document ingestion)

1. User uploads file → validated by `smart-import-init`
2. Byte extracts text via OCR (`ocr.ts` / Tesseract.js client-side, OpenAI vision fallback)
3. `ocr-job-status.ts` polls async job progress
4. `smart-import-sync.ts` normalizes extracted data
5. `normalize-transactions.ts` maps to transaction schema
6. `approve-import.ts` finalizes and upserts to database
7. Tag auto-categorizes each transaction

`prime-router.ts` orchestrates this full flow; treat it as the entry point for understanding the pipeline.

### Frontend Structure

- **`src/App.tsx`** — Root routing (React Router v6). Public routes, auth routes, dashboard routes, mobile routes.
- **`src/layouts/`** — `DashboardLayout` (3-column: sidebar + content + chat panel), `MobileRevolution`, `MarketingLayout`
- **`src/components/chat/`** — Unified chat UI components (`UnifiedAssistantChat`, `TypingMessage`, `ByteUploadPanel`)
- **`src/components/prime/`** — Prime slideout panel (`PrimeSlideoutShell`)
- **`src/hooks/`** — Custom hooks including `useSmartImport`, `usePostImportHandoff`, `useByteImportCompletion`
- **`src/lib/smartImport/`** — Client-side import pipeline orchestration
- **`src/lib/supabase/`** — Typed Supabase client wrappers

State management uses **Jotai** (atoms) as primary, with some **Zustand** stores. Data fetching uses **React Query v5**.

### Key Conventions

- **Path alias:** `@/` maps to `src/` — use it everywhere in frontend imports
- **Function output format:** CommonJS (esbuild `format = "cjs"`) — Netlify functions must use `require`-compatible patterns
- **Environment variables:** `VITE_*` prefix for frontend-only vars. Backend functions use `process.env` directly. OpenAI is never called from the frontend.
- **Legacy components:** `src/components/chat/_legacy/` contains deprecated components — do not modify or extend them
- **Zero-warning lint:** All PRs must pass `npm run lint` with no warnings
- **pnpm:** This project uses pnpm (not npm/yarn) for dependency management

### Database

**Supabase (PostgreSQL)** — key tables:
- `chat_sessions`, `chat_messages`, `chat_convo_summaries` — conversation storage
- `documents`, `imports`, `jobs` — document processing pipeline
- `transactions` — normalized financial data
- `activity_feed` — user activity timeline
- `employee_profiles` — employee metadata

Migrations go in `sql/migrations/` with timestamp prefix (e.g., `20260220_name.sql`). Run them manually in the Supabase dashboard or via their CLI.

### Deployment

- **Platform:** Netlify
- **Build command:** `pnpm install --frozen-lockfile && pnpm build`
- **Publish:** `dist/`
- **Functions:** `netlify/functions/` (bundled by esbuild at deploy time)
- **Local full-stack dev:** `npm run dev:netlify` (port 8888 proxies Vite on 5174)

## OCR Pipeline
- Primary OCR: Google Vision via /netlify/functions/
- Fallback OCR: Claude Vision API (claude-sonnet-4-20250514)
- Fallback triggers when confidence score is below 85%
- All extractions go to staging table first — never direct to transactions
- import_summaries table stores raw_ocr_text, confidence_score, file_name, status
- Byte announces all OCR completions to Prime chat thread
- Claude Vision must return clean JSON: ISO dates, clean merchant names, inferred categories
- Low confidence rows flagged with status = 'needs_review'
- Source column tracks whether Google Vision or Claude Vision was used

## Prime Summary Pipeline

### Key Files
- `netlify/functions/prime-summary.ts` — summary endpoint, called after import commits
- `netlify/functions/_shared/primeSummarizer.ts` — LLM prompt + deterministic formatter
- `netlify/functions/process-statement.ts` — PDF parse → staging insert → breakdown build
- `netlify/functions/commit-import.ts` — staging → transactions + persists StatementBreakdown

### LLM vs Deterministic Path
- `PRIME_SUMMARY_ALLOW_LLM=1` in `.env.local` → LLM path (Claude generates summary)
- Without that flag → deterministic formatter runs (template-based, no AI reasoning)
- The LLM path must be active for Prime to sound like an advisor, not a report

### StatementBreakdown Schema
Defined in `netlify/functions/_shared/` — version 1 schema:
- `statement_meta` — issuer, account_last4, period_start, period_end, statement_type
- `totals` — total_debits, total_credits, net, transaction_count
- `category_totals` — array of { category, total, count, percentage }
- `top_merchants` — array of { merchant, total, count }
- `flags` — duplicate_count, refund_count, needs_review_count, low_confidence_count
- `confidence` — overall, ocr_confidence, reconciled, recon_method
- Persisted to `imports.statement_breakdown_json` (JSONB column) after commit

### Known Issues (active as of March 2026)
1. Issuer detection returns null for Canadian Tire / Triangle — needs pattern list
2. Foreign currency transactions capturing USD amount instead of CAD amount
3. Payment/credit transactions being dropped from capture
4. import_summaries missing unique constraint on import_id — upsert fails
5. Issues section shows placeholder text "still syncing" — must be removed
6. ai_activity_events insert failing — employee_id column is NOT NULL

### Prime Prompt Rules — DO NOT CHANGE WITHOUT DISCUSSION
- Prime is an advisor, not a data formatter
- Prime's Read section must be flowing paragraphs, not bullets
- Never output "consider reviewing your budget" — specific numbers only
- Never output placeholder text in Issues section
- The analyst voice instructions live in PRIME_SUMMARIZER_SYSTEM_PROMPT

### Database Migrations Needed
Run this in Supabase SQL editor:
ALTER TABLE import_summaries
ADD CONSTRAINT import_summaries_import_id_key UNIQUE (import_id);

## Agent Handoff Structure
- Prime → Byte → Tag → Prime close (strict order, do not break)
- prime-router.ts orchestrates the pipeline
- Byte announces OCR completion to Prime chat thread via announceByteCompletionToPrime()
- Tag must complete categorization BEFORE prime-summary fires
- prime-summary is currently being called 3x per import — needs deduplication fix

## Current Active Branch
sidebar-safe-refactor
