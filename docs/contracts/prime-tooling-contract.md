# Prime Tooling Contract

Version: v2-draft (2026-02-16)
Owner: Prime Platform + Tool Owners
Status: Draft

## Purpose
Define the plugin/tool interface Prime uses for capability extensions without weakening stability or safety.

## Scope
This contract applies to all callable tools/plugins in Prime:
- capability declaration
- request/response schema
- timeout/retry/idempotency
- permissions and data access

## Tool Registration Requirements
Each tool must declare:
- `name` (stable slug)
- `description` (user-safe)
- `owner` (team/person)
- `inputSchema` and `outputSchema` (strict typed schema)
- `timeoutMs` and `maxRetries`
- `idempotent` (true/false)
- `requiredScopes` (permissions)
- `dataClassification` (`public`, `internal`, `sensitive`)

## Invocation Rules
- Prime may only call tools listed in employee-allowed tool registry.
- Inputs must validate against schema before invocation.
- Outputs must validate against schema before model consumption.
- Tool calls must include trace metadata: `requestId`, `sessionId`, `threadId`, `employeeSlug`.

## Error and Timeout Handling
- Timeouts return structured error payload, not thrown raw exceptions.
- Retries only for idempotent tools.
- After max retry, assistant returns constrained fallback answer.

## Security and Permissions
- Tool execution must enforce scope checks server-side.
- No tool may receive secrets outside its declared need.
- Sensitive outputs require redaction/masking before user-visible rendering.

## Cost and Performance Budget
- Define per-tool latency target (p95) and token overhead budget.
- Prime should prefer deterministic tools over repeated model reasoning when both satisfy intent.
- Tool fan-out must be bounded by configurable max parallel calls.

## Acceptance Criteria
- Invalid tool input is rejected with schema error before execution.
- Unauthorized tool call is denied with structured policy response.
- Timeout and retry behavior is deterministic and logged.
- All tool outputs include classification metadata.

## Implementation Checklist
- Add shared schema validator at tool boundary.
- Add permission middleware for `requiredScopes`.
- Add tool health metrics (success rate, p95 latency, timeout rate).
- Add contract test fixture per tool using valid and invalid payloads.
