# Prime Runtime Contract

Version: v2-draft (2026-02-16)
Owner: Prime Platform
Status: Draft

## Purpose
Define deterministic runtime orchestration across API entry, routing, memory, tools, and response streaming.

## Scope
This contract covers server-side chat runtime:
- request lifecycle
- state machine transitions
- routing and handoff behavior
- failure and fallback behavior

## Canonical Lifecycle
1. Receive request and validate auth/session/thread.
2. Run core middleware (guardrails, masking, policy, rate checks).
3. Resolve employee target (routing or locked employee).
4. Load allowed toolset and context budget.
5. Execute model call and optional tool calls.
6. Run output safety checks.
7. Persist user and assistant messages.
8. Return response and emit telemetry.

## Runtime State Machine
Allowed states:
- `closed`
- `open_idle`
- `awaiting_response`
- `streaming`
- `blocked`
- `handoff_pending`

Allowed transitions:
- `open_idle` -> `awaiting_response` (user sends message)
- `awaiting_response` -> `streaming` (model accepted request)
- `streaming` -> `open_idle` (final token delivered)
- `awaiting_response` -> `blocked` (policy decision)
- `awaiting_response` -> `handoff_pending` (delegation requested)
- `handoff_pending` -> `awaiting_response` (handoff resolved)

Disallowed transitions:
- `closed` -> `streaming` without explicit open
- `open_idle` -> `blocked` without user message
- any transition that emits assistant text before middleware pass

## Routing and Handoff
- Employee lock (if set) wins over dynamic routing.
- Handoff requires explicit event with source employee and target employee.
- Failed handoff falls back to current employee with safe explanation.

## Persistence Rules
- User message is persisted once per client message id.
- Assistant message persists only after final safe output is available.
- Partial streams may be persisted as drafts if feature-enabled, but must be finalized or discarded.

## Failure Policy
- Middleware failure: fail safe for policy systems, fail open only when explicitly marked non-critical.
- Tool timeout: return partial answer + explicit limitation message.
- Model failure: return stable fallback copy and keep composer active.

## Acceptance Criteria
- No duplicate assistant writes for same request id.
- No response emitted before middleware pass.
- Handoff path includes structured event payload and trace id.
- Runtime recovers cleanly from tool timeout and model timeout.

## Implementation Checklist
- Enforce idempotency key (`client_message_id`) across retries.
- Ensure thread/session retrieval happens before routing.
- Add one integration test per state transition.
- Add one chaos test per failure type (tool timeout, model timeout, DB transient).
