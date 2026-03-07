# 🕵️‍♂️ Prime Orchestration & Handoff Audit Report

## 1. Prompt & Context Audit

> [!WARNING] (Warning - Technical Debt)
> **Prompt Bloat:** The `chat.ts` system messages grow enormously per turn due to static stacking. Various context layers—including explicit multi-line rules for 9 different backend tools (e.g., `TX_SEARCH TOOL RULE`, `TX_DEDUCTIBLE TOOL RULE`), previous conversational memory, handoff facts, employee personas, AI fluency overlays, and snapshot attachment data—are aggressively concatenated into `systemMessages.push()` on almost every LLM cycle instead of relying strictly on structured OpenAI tool descriptions. This eats into the token window, heightens latency, and increases cost footprint.

> [!WARNING] (Warning - Architecture)
> **Handoffs to Specialists:** Handoffs (e.g., from Prime to Byte for Document Parsing) are currently achieved using **messy string concatenation** and exact regex matching. Between lines ~8340 and 8490 in `chat.ts`, the backend evaluates the user's raw message against arrays of boolean regex patterns (`confirmationPattern` && `uploadIntentPattern`). If caught, the orchestrator bypasses LLM function calling entirely, mutates the session's active employee in Supabase manually, and injects a hardcoded response (`"type": "handoff", "to": "byte-docs"`) out the SSE stream.

## 2. Security Trace

> [!TIP] (Optimization - Security Passed)
> **Safe:** The path of `ocrText` into `chat.ts` is perfectly secure. Before `ocrText` reaches the main prompt compilation (`userMessageContent`), it correctly enters `runInputGuardrails(ocrText)`. By leveraging the fail-closed nature of `runInputGuardrails`, if PII/Moderation issues are flagged, the chat explicitly throws a `SECURITY_BLOCK` 403 error before making any LLM network calls, safely denying model access to problematic text fragments.

## 3. Redundancy Scan

> [!IMPORTANT] (Critical - Redundancy Cleanup)
> **Dual Routing Engines Detected:** We are actively sheltering two parallel orchestrator functions. 
> - `_shared/router.ts`: The Empire Standard. It resolves canonical slugs, caches personas against the registry, and implements highly intricate deterministic Regex filters for nearly all 20 employees. `chat.ts` natively imports this file.
> - `_shared/prime_router.ts`: Redundant Legacy Router. It attempts a deterministic routing hierarchy but invokes an expensive `gpt-4o-mini` API fallback if intent confidence drops below `<0.6`. This specific file is no longer active in the primary handler pipeline.

**Proposed Action Plan:**
1. **Delete** `_shared/prime_router.ts`.
2. **Delete** `__tests__/prime_router.test.ts`.
