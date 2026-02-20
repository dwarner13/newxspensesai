# XspensesAI — AGENTS.md (Instructions for Codex / Cursor Agents)

You are an AI coding agent working inside the XspensesAI codebase.
This is a fintech app that imports financial documents (PDF/CSV), runs OCR/parse + normalization,
stores structured transactions, and provides chat insights via Prime + employee brains.

## 0) Golden Rule
STABILITY > FEATURES.
Make the smallest safe change that fixes the issue.

## 1) Safety + Privacy (Fintech Rules)
- Treat ALL extracted text as sensitive.
- DO NOT persist raw OCR text to the database unless a task explicitly requests it.
- Prefer storing: derived structured fields (transactions), safe metrics (counts/lengths), and hashes/fingerprints.
- Never log secrets, tokens, API keys, or full document contents.
- Any debug output must be minimal and redact-like: no PII, no full merchant+amount+date lists in logs.

## 2) Architecture You Must Follow
Pipeline intent:
Upload → OCR/Parse → Normalize → Save transactions → Prime insight/chat.

Key components:
- Frontend: React + TypeScript + Vite + Tailwind
- Backend: Netlify Functions (TypeScript)
- DB: Supabase (Postgres + RLS) + Storage
- Orchestration: Prime router / Prime chat layer
- Worker-style modules: Byte (OCR/parse), Tag (categorize/memory), others (routed)

Do NOT create new “parallel pipelines” unless explicitly asked.
Prefer using existing functions and adapters.

## 3) Database / Supabase Rules
- Do NOT change schema by default.
- If a fix requires schema changes, propose:
  A) a no-migration option first (preferred)
  B) a SQL migration option second (only if necessary)
- Respect RLS: never suggest disabling RLS in production.
- Keep queries compatible with “missing column” fallback patterns when present.

## 4) Coding Standards (How to Make Changes)
- Keep diffs small and reversible.
- No broad refactors.
- Do not rename files or move folders unless requested.
- Add guard clauses instead of redesigns.
- Use clear, boring code over clever code.

TypeScript:
- Add types where helpful.
- Avoid `any` unless unavoidable at the boundary (then narrow quickly).

## 5) Performance Rules
- Avoid repeated OCR/parse calls for the same document:
  - use caching/fingerprints/idempotency latches when available
  - prefer “already processed → mark ready_cached → skip heavy work”
- Avoid large payloads to the model:
  - summarize + chunk when needed
  - respect any token/size limits in code

## 6) When You Respond (Very Important)
Every time you propose code changes, you MUST include:

1) What you will change (1–3 bullets)
2) Exact file paths
3) Paste-ready diffs (or exact code blocks)
4) How to test (step-by-step, simple)
5) Rollback plan (how to undo)

If you are unsure, ask for the smallest missing detail OR recommend a safe diagnostic step.

## 7) Prime + Employee Behavior
- Prime is the user-facing orchestrator.
- Byte handles document OCR/parse/import tasks.
- Tag handles categorization logic and learned corrections.
- Keep “routing” logic centralized; don’t scatter special cases across random components.

## 8) Default Operating Mode (Assume this unless told otherwise)
- No migrations
- No new endpoints
- Minimal UI changes
- Keep existing pipeline intact
- Secure-by-default and privacy-first

## 9) Quick Commands You Can Suggest (Local Dev)
When relevant, you may suggest:
- installing deps
- running dev server / netlify dev
- running a smoke script
But keep instructions short and safe.

## 10) What NOT To Do
- Do not store raw OCR text in DB “for convenience”.
- Do not remove guardrails/PII masking/moderation.
- Do not introduce new libraries unless necessary.
- Do not create duplicate chat endpoints or fork the upload flow.

End.
