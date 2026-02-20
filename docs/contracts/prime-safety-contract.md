# Prime Safety Contract

Version: v2-draft (2026-02-16)
Owner: Prime Platform + Security
Status: Draft

## Purpose
Define mandatory safety controls (guardrails, PII handling, moderation, policy) that are always enforced regardless of employee or plugin.

## Scope
This contract applies to all user-visible and model-visible text paths:
- chat input
- upload-derived text
- tool outputs
- assistant final responses

## Safety Architecture
Safety is platform middleware, not optional plugin behavior.

Order of operations:
1. Input normalization and length limits.
2. PII detection and masking.
3. Content moderation.
4. Jailbreak and prompt-injection detection.
5. Policy decision (allow, mask, block).
6. Output safety pass before render/persist.

## Policy Decisions
- `allow`: continue with original or masked content.
- `mask`: replace sensitive spans and continue.
- `block`: return safe refusal text and do not forward unsafe content.

Blocked responses must:
- be user-safe and concise
- avoid exposing internal policy logic
- keep the chat usable for reformulated questions

## Guardrail Reliability Rules
- No single binary classifier output should hard-block without corroboration.
- Prefer confidence-based outputs plus lexical/heuristic indicators.
- Log decision metadata for audit and false-positive analysis.

## PII and Data Handling
- Mask sensitive entities before any external model/tool call when required.
- Never log raw sensitive input in audit tables.
- Persist hashes or redacted summaries for audit traceability.

## Cross-Path Requirement
- The same safety policy must be applied across Prime, all employees, and all tools.
- No bypass path may exist for "fast path" execution.

## Observability Requirements
Every safety decision emits:
- `requestId`, `userId`, `sessionId`, `threadId`
- `employeeSlug`, `sourcePath` (`chat`, `upload`, `tool`)
- `decision` (`allow`, `mask`, `block`)
- `reasons` and non-sensitive confidence metadata

## Acceptance Criteria
- Benign location and small-talk prompts do not trigger jailbreak block.
- Real prompt-injection attempts are blocked with correct reason codes.
- PII is masked consistently in model and tool boundaries.
- Audit events contain hashes/redacted metadata only.

## Implementation Checklist
- Centralize guardrail entry points in one shared module.
- Add false-positive regression suite for jailbreak detector.
- Add golden tests for benign prompts and known attacks.
- Add dashboard alert for sudden spikes in `jailbreak_detected`.
